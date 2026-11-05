# -*- coding: utf-8 -*-
#
# Live-lähetysten tekstitykset.
#
# TV hakee live-kanavan osoitteesta /e2tvplayer/live?id=..&sref=.. . Boksi hakee saman
# kanavan omalta striimipalvelimeltaan (127.0.0.1:8001), välittää tavut sellaisenaan TV:lle
# ja purkaa samalla tekstitykset samasta virrasta. Koska purku tapahtuu täsmälleen siitä
# virrasta, jonka TV saa, aikaleimat ovat samassa ajassa kuin TV:n toistokohta – samoin
# kuin tallenteissa.

from __future__ import absolute_import, print_function

import time

from . import subs
from .subs import PKT, PTS_WRAP, DvbSubDecoder, find_sync, parse_pmt, parse_pts, payload_of, track_label, u16

MAX_CUES = 400
MAX_SESSIONS = 4
STREAM_PORT = 8001


def log(msg):
	print("[E2TVPlayer] live: %s" % msg)


class LiveSession(object):
	"""Tekstitysten purku jatkuvasta TS-virrasta."""

	def __init__(self, sid, sref):
		self.id = sid
		self.sref = sref
		self.created = time.time()
		self.last_used = time.time()
		self.gen = 0
		self.reset()

	def reset(self):
		self.gen += 1
		self.status = "connecting"
		self.error = ""
		self.rest = b""
		self.aligned = False
		self.programs = {}
		self.pmt_pids = set()
		self.service_id = None
		self.pmt = None
		self.video_pid = None
		self.base_pts = None
		self.tracks = []
		self.teletext = 0
		self.audio = []
		self.decoders = {}       # pid -> [DvbSubDecoder]
		self.dec_list = []
		self.bufs = {}           # PSI-osiot
		self.pes = {}            # tekstitys-PES:t
		self.pending = []        # tekstitysjoukot ennen kuin videon aikaleima tiedetään
		self.cues = {}           # avain -> lista
		self.images = {}         # (avain, n) -> png
		self.counter = {}
		self.open_cue = {}
		self.last_key = {}
		self.dw, self.dh = 720, 576
		self.bytes = 0
		try:
			parts = self.sref.split(":")
			self.service_id = int(parts[3], 16) if len(parts) > 3 else None
		except ValueError:
			self.service_id = None

	# --- tavuvirta ---
	def feed(self, data):
		self.bytes += len(data)
		buf = self.rest + data if self.rest else data
		start = 0
		if not self.aligned or (buf and buf[0] != 0x47):
			o = find_sync(buf)
			if o < 0:
				self.rest = buf[-PKT * 3:]
				return
			start = o
			self.aligned = True
		npk = (len(buf) - start) // PKT
		end = start + npk * PKT
		self.rest = buf[end:]
		view = buf[start:end]
		syncs = view[0::PKT]
		if syncs.count(b"\x47") != npk:
			good = len(syncs) - len(syncs.lstrip(b"\x47"))
			self.rest = view[good * PKT:] + self.rest
			self.aligned = False
			view = view[:good * PKT]
			npk = good
		if not npk:
			return
		b1 = view[1::PKT]
		b2 = view[2::PKT]
		k0 = 0
		while k0 < npk:
			wanted = self.wanted()
			hits = []
			for pid in wanted:
				hi, lo = pid >> 8, bytes((pid & 0xff,))
				k = b2.find(lo, k0)
				while k >= 0:
					if (b1[k] & 0x1f) == hi:
						hits.append(k)
					k = b2.find(lo, k + 1)
			hits.sort()
			k0 = npk
			for k in hits:
				pkt = view[k * PKT:(k + 1) * PKT]
				self.packet(((pkt[1] & 0x1f) << 8) | pkt[2], pkt)
				if self.wanted() != wanted:
					# PAT/PMT tai videon aikaleima luettiin juuri: käydään palan loppu läpi uusilla PID:eillä
					k0 = k + 1
					break

	def wanted(self):
		w = {0} | self.pmt_pids | set(self.decoders.keys())
		if self.base_pts is None and self.video_pid is not None:
			w.add(self.video_pid)
		return w

	def packet(self, pid, pkt):
		pl = payload_of(pkt)
		if pl is None:
			return
		pusi = pkt[1] & 0x40
		if pid in self.decoders:
			self.sub_packet(pid, pusi, pl)
			return
		if pid == self.video_pid and self.base_pts is None:
			if pusi and pl[:3] == b"\x00\x00\x01" and len(pl) > 13 and pl[7] & 0x80:
				self.base_pts = parse_pts(pl, 9)
				self.status = "running"
				for (pts, key, img, timeout) in self.pending:
					self.sink(key, pts, img, timeout)
				self.pending = []
			if pid not in self.pmt_pids and pid != 0:
				return
		self.psi_packet(pid, pusi, pl)

	def psi_packet(self, pid, pusi, pl):
		if pusi:
			if pl[0] >= len(pl) - 1:
				return
			self.bufs[pid] = bytearray(pl[1 + pl[0]:])
		elif pid in self.bufs:
			self.bufs[pid] += pl
		else:
			return
		sec = self.bufs[pid]
		if len(sec) < 3:
			return
		slen = ((sec[1] & 0x0f) << 8) | sec[2]
		if len(sec) < 3 + slen:
			return
		sec = bytes(sec[:3 + slen])
		del self.bufs[pid]
		if pid == 0 and sec[0] == 0x00:
			progs = {}
			j = 8
			while j + 4 <= 3 + slen - 4:
				prog = u16(sec, j)
				if prog:
					progs[prog] = ((sec[j + 2] & 0x1f) << 8) | sec[j + 3]
				j += 4
			self.programs = progs
			if self.service_id in progs:
				self.pmt_pids = {progs[self.service_id]}
			else:
				self.pmt_pids = set(progs.values())
		elif sec[0] == 0x02 and slen > 13 and pid in self.pmt_pids:
			prog = u16(sec, 3)
			if self.service_id is not None and prog != self.service_id and len(self.pmt_pids) > 1:
				return
			if sec == self.pmt:
				return
			self.setup(sec)

	def setup(self, pmt):
		info = {"video_pid": None, "tracks": [], "teletext": []}
		parse_pmt(pmt, info)
		new_keys = [t["key"] for t in info["tracks"]]
		if self.pmt is not None and new_keys == [t["key"] for t in self.tracks]:
			self.pmt = pmt
			return   # sama raitajoukko, versio vain vaihtui
		self.pmt = pmt
		self.pmt_pids = {self.pmt_pids_for(pmt)} if len(self.pmt_pids) > 1 else self.pmt_pids
		self.video_pid = info["video_pid"]
		self.teletext = len(info["teletext"])
		self.audio = [{"lang": a["lang"], "codec": a["codec"]} for a in info.get("audio", [])]
		self.tracks = [{"key": t["key"], "lang": t["lang"], "label": track_label(t)} for t in info["tracks"]]
		self.decoders = {}
		self.dec_list = []
		for t in info["tracks"]:
			key = t["key"]
			self.cues.setdefault(key, [])
			self.counter.setdefault(key, 0)
			dec = DvbSubDecoder(t["page"], t["anc"], self.make_sink(key))
			self.dec_list.append(dec)
			self.decoders.setdefault(t["pid"], []).append(dec)
		if self.status == "connecting":
			self.status = "running" if self.base_pts is not None else "waiting"
		if not self.tracks:
			self.status = "none"
		log("%s: %d subtitle track(s) %s" % (self.sref, len(self.tracks), ",".join(t["label"] for t in self.tracks)))

	def pmt_pids_for(self, pmt):
		prog = u16(pmt, 3)
		return self.programs.get(prog, list(self.pmt_pids)[0])

	def sub_packet(self, pid, pusi, pl):
		if pusi:
			if self.pes.get(pid):
				self.emit(pid, self.pes[pid])
			self.pes[pid] = bytearray(pl)
		elif self.pes.get(pid) is not None:
			self.pes[pid] += pl
		else:
			return
		b = self.pes[pid]
		if len(b) >= 6:
			ln = (b[4] << 8) | b[5]
			if ln and len(b) >= ln + 6:
				self.emit(pid, b[:ln + 6])
				self.pes[pid] = None

	def emit(self, pid, buf):
		if len(buf) < 9 or buf[:3] != b"\x00\x00\x01" or buf[3] != 0xBD:
			return
		hl = buf[8]
		pts = parse_pts(buf, 9) if buf[7] & 0x80 else None
		payload = bytes(buf[9 + hl:])
		for dec in self.decoders.get(pid, []):
			dec.feed(pts, payload)

	# --- tekstitysruudut ---
	def make_sink(self, key):
		def sink(pts, img, timeout):
			if self.base_pts is None:
				if len(self.pending) < 20:
					self.pending.append((pts, key, img, timeout))
				return
			self.sink(key, pts, img, timeout)
		return sink

	def sink(self, key, pts, img, timeout):
		t = ((pts - self.base_pts) % PTS_WRAP) / 90000.0
		if t > 12 * 3600:
			t = 0.0   # tekstitys hieman ennen ensimmäistä videokuvaa
		prev = self.open_cue.get(key)
		if img is not None and prev is not None and self.last_key.get(key) == img[5]:
			return
		if prev is not None:
			prev["e"] = round(min(t, prev["e"]), 2)
			self.open_cue[key] = None
		if img is None:
			self.last_key[key] = None
			return
		x, y, w, h, png, ik = img
		n = self.counter[key]
		self.counter[key] = n + 1
		cue = {"s": round(t, 2), "e": round(t + (timeout or 8), 2), "x": x, "y": y, "w": w, "h": h, "n": n}
		lst = self.cues[key]
		lst.append(cue)
		self.images[(key, n)] = png
		if len(lst) > MAX_CUES:
			old = lst.pop(0)
			self.images.pop((key, old["n"]), None)
		if self.dec_list:
			self.dw, self.dh = self.dec_list[0].dw, self.dec_list[0].dh
		self.open_cue[key] = cue
		self.last_key[key] = ik

	# --- rajapinta ---
	def snapshot(self, key=None, start=0):
		self.last_used = time.time()
		out = {"status": self.status, "error": self.error, "gen": self.gen, "tracks": list(self.tracks),
			"teletext": self.teletext, "audio": list(self.audio), "dw": self.dw, "dh": self.dh, "live": True}
		if key is not None:
			out["cues"] = [c for c in self.cues.get(key, []) if c["n"] >= start]
		return out


_sessions = {}


def session(sid, sref=None, create=False):
	s = _sessions.get(sid)
	if s is None and create and sref:
		now = time.time()
		for k, v in list(_sessions.items()):
			if now - v.last_used > 600:
				del _sessions[k]
		while len(_sessions) >= MAX_SESSIONS:
			oldest = min(_sessions.values(), key=lambda v: v.last_used)
			del _sessions[oldest.id]
		s = _sessions[sid] = LiveSession(sid, sref)
	return s


# ---------------------------------------------------------------- välitys (Twisted)

def stream(request, sid, sref, port=STREAM_PORT):
	"""Välittää kanavan TV:lle ja purkaa tekstitykset. Palauttaa NOT_DONE_YET."""
	from twisted.internet import reactor, protocol
	from twisted.web.client import Agent
	from twisted.web.server import NOT_DONE_YET

	try:
		from urllib.parse import quote
	except ImportError:  # pragma: no cover
		from urllib import quote

	s = session(sid, sref, create=True)
	if s.sref != sref:
		s.sref = sref
	s.reset()
	gen = s.gen
	state = {"done": False, "relay": None}

	# Vanha ffmpeg TV:ssä ei välttämättä osaa chunked-siirtoa, joten vastataan HTTP/1.0:lla
	# ilman pituutta; yhteyden sulkeutuminen päättää virran.
	request.clientproto = b"HTTP/1.0"
	request.setHeader(b"Content-Type", b"video/mp2t")
	request.setHeader(b"Cache-Control", b"no-cache")
	request.setHeader(b"Connection", b"close")

	class Relay(protocol.Protocol):
		def connectionMade(self):
			state["relay"] = self
			try:
				request.registerProducer(self.transport, True)
			except Exception as e:
				log("registerProducer: %s" % e)

		def dataReceived(self, data):
			if state["done"]:
				return
			request.write(data)
			if s.gen == gen:
				try:
					s.feed(data)
				except Exception as e:
					s.status = "error"
					s.error = "purkuvirhe: %s" % e
					s.decoders = {}
					log("decode error: %s" % e)

		def connectionLost(self, reason):
			finish()

	def finish(*args):
		if state["done"]:
			return
		state["done"] = True
		if s.gen == gen and s.status not in ("error",):
			s.status = "closed"
		try:
			request.unregisterProducer()
		except Exception:
			pass
		try:
			request.finish()
		except Exception:
			pass

	def client_gone(_):
		state["done"] = True
		r = state["relay"]
		if r is not None:
			try:
				r.transport.stopProducing()
			except Exception:
				pass
		log("%s: TV closed the stream (%d MB relayed)" % (sref, s.bytes // 1048576))

	request.notifyFinish().addBoth(client_gone)

	url = ("http://127.0.0.1:%d/%s" % (port, quote(sref, safe=":/"))).encode("ascii")
	d = Agent(reactor).request(b"GET", url)

	def got(response):
		if state["done"]:
			response.deliverBody(protocol.Protocol())
			return
		if response.code != 200:
			s.status = "error"
			s.error = "striimipalvelin vastasi %d" % response.code
			request.setResponseCode(502)
			finish()
			return
		response.deliverBody(Relay())

	def failed(err):
		s.status = "error"
		s.error = "striimipalvelin ei vastaa (%s)" % err.getErrorMessage()
		log(s.error)
		if not state["done"]:
			try:
				request.setResponseCode(502)
			except Exception:
				pass
			finish()

	d.addCallbacks(got, failed)
	log("relaying %s for TV session %s" % (sref, sid))
	return NOT_DONE_YET
