# -*- coding: utf-8 -*-
#
# DVB-tekstitysten (ETSI EN 300 743) purku Enigma2-tallenteesta.
#
# Samsungin 2014-TV:n soitin ei näytä TS-tallenteen DVB-tekstityksiä HTTP-toistossa,
# joten boksi purkaa ne itse: jokainen tekstitysruutu tallennetaan PNG-kuvaksi ja
# näyttöajat JSON-listaksi. TV-sovellus piirtää kuvat videon päälle oikeaan aikaan.
#
# Tulokset tallennetaan tallennekansion alle piilokansioon .e2tvplayer/<tallenne>/,
# joten purku tehdään vain kerran tallennetta kohden.

from __future__ import absolute_import, print_function

import json
import os
import re
import shutil
import struct
import threading
import time
import zlib

PKT = 188
CHUNK = PKT * 8192          # ~1.5 Mt kerrallaan
PTS_WRAP = 1 << 33
CACHE_DIR = ".e2tvplayer"
OLD_CACHE_DIRS = (".e2samsungtv",)
CACHE_VERSION = 2


def log(msg):
	print("[E2TVPlayer] subs: %s" % msg)


def u16(b, i):
	return (b[i] << 8) | b[i + 1]


# ---------------------------------------------------------------- PNG

def png_rgba(width, height, rows):
	"""rows: lista bytes-olioita, kukin width*4 tavua RGBA."""
	raw = b"".join(b"\x00" + r for r in rows)

	def chunk(tag, data):
		c = struct.pack(">I", len(data)) + tag + data
		return c + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)

	return (b"\x89PNG\r\n\x1a\n" +
		chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)) +
		chunk(b"IDAT", zlib.compress(raw, 6)) +
		chunk(b"IEND", b""))


# ---------------------------------------------------------------- värit

def ycrcb_to_rgba(y, cr, cb, t):
	if y == 0:
		return b"\x00\x00\x00\x00"       # Y=0 tarkoittaa täysin läpinäkyvää
	r = y + 1.402 * (cr - 128)
	g = y - 0.34414 * (cb - 128) - 0.71414 * (cr - 128)
	b = y + 1.772 * (cb - 128)
	clamp = lambda v: 0 if v < 0 else (255 if v > 255 else int(v))
	return bytes((clamp(r), clamp(g), clamp(b), 255 - t))


def default_clut(depth):
	"""Standardin oletusvärit (EN 300 743 kohta 10), jos lähetys ei määrittele CLUTia."""
	if depth == 1:   # 2-bit
		return [b"\x00\x00\x00\x00", b"\xff\xff\xff\xff", b"\x00\x00\x00\xff", b"\x7f\x7f\x7f\xff"]
	n = 16 if depth == 2 else 256
	out = []
	for i in range(n):
		if i == 0:
			out.append(b"\x00\x00\x00\x00")
			continue
		if depth == 2:
			v = 255 if i < 8 else 127
			out.append(bytes(((i & 1) and v or 0, (i & 2) and v or 0, (i & 4) and v or 0, 255)))
		else:
			if i < 8:
				out.append(bytes(((i & 1) and 255 or 0, (i & 2) and 255 or 0, (i & 4) and 255 or 0, 63)))
			else:
				base = 127 if (i & 0x88) == 0x80 else (85 if (i & 0x88) == 0x08 else 43)
				r = ((i & 0x01) and 85 or 0) + ((i & 0x10) and 170 or 0)
				g = ((i & 0x02) and 85 or 0) + ((i & 0x20) and 170 or 0)
				b = ((i & 0x04) and 85 or 0) + ((i & 0x40) and 170 or 0)
				out.append(bytes((min(255, r), min(255, g), min(255, b), 255 if base else 255)))
	return out


class Clut(object):
	def __init__(self):
		self.tables = {1: default_clut(1), 2: default_clut(2), 3: default_clut(3)}

	def set(self, eid, flags, rgba):
		if flags & 0x80 and eid < 4:
			self.tables[1][eid] = rgba
		if flags & 0x40 and eid < 16:
			self.tables[2][eid] = rgba
		if flags & 0x20:
			self.tables[3][eid] = rgba


# ---------------------------------------------------------------- pikselidata

class Bits(object):
	__slots__ = ("d", "i", "b", "end")

	def __init__(self, data, start, end):
		self.d = data
		self.i = start
		self.b = 0
		self.end = end

	def get(self, n):
		v = 0
		d = self.d
		for _ in range(n):
			if self.i >= self.end:
				raise EOFError()
			v = (v << 1) | ((d[self.i] >> (7 - self.b)) & 1)
			self.b += 1
			if self.b == 8:
				self.b = 0
				self.i += 1
		return v

	def align(self):
		if self.b:
			self.b = 0
			self.i += 1


def decode_2bit(bits, put):
	while True:
		c = bits.get(2)
		if c:
			put(1, c)
			continue
		if bits.get(1):
			run = bits.get(3) + 3
			put(run, bits.get(2))
			continue
		if bits.get(1):
			put(1, 0)
			continue
		sw = bits.get(2)
		if sw == 0:
			break
		elif sw == 1:
			put(2, 0)
		elif sw == 2:
			run = bits.get(4) + 12
			put(run, bits.get(2))
		else:
			run = bits.get(8) + 29
			put(run, bits.get(2))
	bits.align()


def decode_4bit(bits, put):
	while True:
		c = bits.get(4)
		if c:
			put(1, c)
			continue
		if not bits.get(1):
			n = bits.get(3)
			if n == 0:
				break
			put(n + 2, 0)
			continue
		if not bits.get(1):
			run = bits.get(2) + 4
			put(run, bits.get(4))
			continue
		sw = bits.get(2)
		if sw == 0:
			put(1, 0)
		elif sw == 1:
			put(2, 0)
		elif sw == 2:
			run = bits.get(4) + 9
			put(run, bits.get(4))
		else:
			run = bits.get(8) + 25
			put(run, bits.get(4))
	bits.align()


def decode_8bit(bits, put):
	while True:
		c = bits.get(8)
		if c:
			put(1, c)
			continue
		if not bits.get(1):
			n = bits.get(7)
			if n == 0:
				break
			put(n, 0)
		else:
			run = bits.get(7)
			put(run, bits.get(8))
	bits.align()


class Region(object):
	def __init__(self, w, h, depth, clut_id, bg):
		self.w = w
		self.h = h
		self.depth = depth if depth in (1, 2, 3) else 2
		self.clut_id = clut_id
		self.bg = bg
		self.pix = bytearray([bg]) * (w * h)
		self.objects = []   # (object_id, x, y)

	def fill(self):
		self.pix[:] = bytearray([self.bg]) * (self.w * self.h)


def draw_field(region, data, start, end, x0, y0):
	"""Piirtää objektin yhden kentän (parittomat/parilliset rivit) alueeseen."""
	depth = region.depth
	w, h, pix = region.w, region.h, region.pix
	map24 = [0, 7, 8, 15]
	map28 = [0, 0x77, 0x88, 0xff]
	map48 = [i * 0x11 for i in range(16)]
	state = {"x": x0, "y": y0}

	def put_factory(mapper):
		def put(run, code):
			code = mapper(code)
			x, y = state["x"], state["y"]
			if 0 <= y < h and x < w and run > 0:
				a = max(x, 0)
				b = min(x + run, w)
				if b > a:
					o = y * w
					pix[o + a:o + b] = bytes((code,)) * (b - a)
			state["x"] = x + run
		return put

	i = start
	while i < end:
		dtype = data[i]
		i += 1
		if dtype in (0x10, 0x11, 0x12):
			if dtype == 0x10:
				if depth == 1:
					mapper = lambda c: c
				elif depth == 2:
					mapper = lambda c: map24[c]
				else:
					mapper = lambda c: map28[c]
				fn = decode_2bit
			elif dtype == 0x11:
				if depth == 2:
					mapper = lambda c: c
				elif depth == 3:
					mapper = lambda c: map48[c]
				else:
					mapper = lambda c: c >> 2
				fn = decode_4bit
			else:
				if depth == 3:
					mapper = lambda c: c
				elif depth == 2:
					mapper = lambda c: c >> 4
				else:
					mapper = lambda c: c >> 6
				fn = decode_8bit
			bits = Bits(data, i, end)
			try:
				fn(bits, put_factory(mapper))
			except EOFError:
				return
			i = bits.i
		elif dtype == 0x20:
			if i + 2 > end:
				return
			v = u16(data, i)
			map24 = [(v >> 12) & 15, (v >> 8) & 15, (v >> 4) & 15, v & 15]
			i += 2
		elif dtype == 0x21:
			if i + 4 > end:
				return
			map28 = [data[i], data[i + 1], data[i + 2], data[i + 3]]
			i += 4
		elif dtype == 0x22:
			if i + 8 > end:
				return
			map48 = []
			for k in range(8):
				map48.append(data[i + k] >> 4)
				map48.append(data[i + k] & 15)
			map48 = [c * 0x11 if c < 16 else c for c in map48]
			i += 8
		elif dtype == 0xF0:
			state["x"] = x0
			state["y"] += 2
		else:
			return   # tuntematon: lopetetaan tämä kenttä


# ---------------------------------------------------------------- dekooderi

class DvbSubDecoder(object):
	"""Purkaa yhden tekstityssivun (composition page + ancillary page) näyttöjoukot."""

	def __init__(self, page_id, anc_id, sink):
		self.page_id = page_id
		self.anc_id = anc_id
		self.sink = sink        # sink(pts, page_image_or_None, timeout)
		self.reset(True)
		self.dw, self.dh = 720, 576
		self.cur_pts = None
		self.timeout = 0
		self.in_set = False

	def reset(self, cluts=False):
		self.regions = {}
		self.page_regions = []
		if cluts or not hasattr(self, "cluts"):
			self.cluts = {}

	def clut(self, cid):
		c = self.cluts.get(cid)
		if c is None:
			c = self.cluts[cid] = Clut()
		return c

	def feed(self, pts, data):
		if len(data) < 3 or data[0] != 0x20:
			return
		i = 2
		n = len(data)
		while i + 6 <= n and data[i] == 0x0F:
			stype = data[i + 1]
			pid = u16(data, i + 2)
			slen = u16(data, i + 4)
			s = i + 6
			e = min(s + slen, n)
			i = s + slen
			if pid != self.page_id and pid != self.anc_id:
				continue
			try:
				if stype == 0x10:
					self.pcs(pts, data, s, e)
				elif stype == 0x11:
					self.rcs(data, s, e)
				elif stype == 0x12:
					self.cds(data, s, e)
				elif stype == 0x13:
					self.ods(data, s, e)
				elif stype == 0x14:
					self.dds(data, s, e)
				elif stype == 0x80:
					self.end_of_set()
			except (IndexError, EOFError) as ex:
				log("bad segment 0x%02x: %s" % (stype, ex))

	def pcs(self, pts, d, s, e):
		if pts is None:
			return
		if self.in_set:
			self.end_of_set()   # edellinen joukko jäi ilman END-segmenttiä
		self.cur_pts = pts
		self.timeout = d[s]
		state = (d[s + 1] >> 2) & 3
		if state == 2:
			self.reset(True)
		elif state == 1:
			self.reset(False)
		self.page_regions = []
		j = s + 2
		while j + 6 <= e:
			self.page_regions.append((d[j], u16(d, j + 2), u16(d, j + 4)))
			j += 6
		self.in_set = True

	def rcs(self, d, s, e):
		rid = d[s]
		fill = (d[s + 1] >> 3) & 1
		w = u16(d, s + 2)
		h = u16(d, s + 4)
		depth = (d[s + 6] >> 2) & 7
		clut_id = d[s + 7]
		bg = {1: (d[s + 9] >> 2) & 3, 2: (d[s + 9] >> 4) & 15, 3: d[s + 8]}.get(depth, 0)
		r = self.regions.get(rid)
		if r is None or r.w != w or r.h != h or r.depth != depth:
			r = self.regions[rid] = Region(w, h, depth, clut_id, bg)
		else:
			r.clut_id = clut_id
			r.bg = bg
			if fill:
				r.fill()
		r.objects = []
		j = s + 10
		while j + 6 <= e:
			oid = u16(d, j)
			otype = (d[j + 2] >> 6) & 3
			ox = ((d[j + 2] & 0x0f) << 8) | d[j + 3]
			oy = ((d[j + 4] & 0x0f) << 8) | d[j + 5]
			r.objects.append((oid, ox, oy))
			j += 8 if otype in (1, 2) else 6

	def cds(self, d, s, e):
		c = self.clut(d[s])
		j = s + 2
		while j + 4 <= e:
			eid = d[j]
			flags = d[j + 1]
			if flags & 1:
				if j + 6 > e:
					break
				y, cr, cb, t = d[j + 2], d[j + 3], d[j + 4], d[j + 5]
				j += 6
			else:
				v = u16(d, j + 2)
				y = (v >> 10) << 2
				cr = ((v >> 6) & 15) << 4
				cb = ((v >> 2) & 15) << 4
				t = (0, 0x55, 0xaa, 0xff)[v & 3]
				j += 4
			c.set(eid, flags, ycrcb_to_rgba(y, cr, cb, t))

	def ods(self, d, s, e):
		oid = u16(d, s)
		coding = (d[s + 2] >> 2) & 3
		if coding != 0:
			return   # merkkijono-objektit ovat harvinaisia, ohitetaan
		top_len = u16(d, s + 3)
		bot_len = u16(d, s + 5)
		ts = s + 7
		te = min(ts + top_len, e)
		bs, be = (te, min(te + bot_len, e)) if bot_len else (ts, te)
		for r in self.regions.values():
			for (o, ox, oy) in r.objects:
				if o == oid:
					draw_field(r, d, ts, te, ox, oy)
					draw_field(r, d, bs, be, ox, oy + 1)

	def dds(self, d, s, e):
		if e - s >= 5:
			self.dw = u16(d, s + 1) + 1
			self.dh = u16(d, s + 3) + 1

	def end_of_set(self):
		if not self.in_set:
			return
		self.in_set = False
		self.sink(self.cur_pts, self.render(), self.timeout)

	def render(self):
		"""Palauttaa (x, y, w, h, png_bytes, avain) tai None, jos sivu on tyhjä."""
		parts = []
		for (rid, rx, ry) in self.page_regions:
			r = self.regions.get(rid)
			if r is None or not r.w or not r.h:
				continue
			pal = self.clut(r.clut_id).tables[r.depth]
			opaque = bytes(bytearray((0 if pal[c][3] == 0 else 1) for c in range(len(pal))) + bytearray(256 - len(pal)))
			top = bottom = None
			left, right = r.w, -1
			for y in range(r.h):
				row = bytes(r.pix[y * r.w:(y + 1) * r.w]).translate(opaque)
				l = row.find(b"\x01")
				if l < 0:
					continue
				rr = row.rfind(b"\x01")
				if top is None:
					top = y
				bottom = y
				left = min(left, l)
				right = max(right, rr)
			if top is None:
				continue
			parts.append((r, pal, rx, ry, left, top, right, bottom))
		if not parts:
			return None
		x0 = min(p[2] + p[4] for p in parts)
		y0 = min(p[3] + p[5] for p in parts)
		x1 = max(p[2] + p[6] for p in parts) + 1
		y1 = max(p[3] + p[7] for p in parts) + 1
		W, H = x1 - x0, y1 - y0
		canvas = [bytearray(W * 4) for _ in range(H)]
		for (r, pal, rx, ry, l, t, rgt, b) in parts:
			for y in range(t, b + 1):
				src = r.pix[y * r.w + l:y * r.w + rgt + 1]
				line = canvas[ry + y - y0]
				ox = (rx + l - x0) * 4
				line[ox:ox + len(src) * 4] = b"".join(pal[c] if c < len(pal) else b"\x00\x00\x00\x00" for c in src)
		rows = [bytes(r) for r in canvas]
		key = zlib.crc32(b"".join(rows)) ^ (x0 << 16) ^ y0
		return (x0, y0, W, H, png_rgba(W, H, rows), key)


# ---------------------------------------------------------------- TS / PSI

def find_sync(data, start=0):
	n = len(data)
	for o in range(start, min(n, start + PKT * 4)):
		if data[o] == 0x47 and o + 2 * PKT < n and data[o + PKT] == 0x47 and data[o + 2 * PKT] == 0x47:
			return o
	return -1


def parse_pts(b, i):
	return (((b[i] >> 1) & 7) << 30) | (b[i + 1] << 22) | ((b[i + 2] >> 1) << 15) | (b[i + 3] << 7) | (b[i + 4] >> 1)


def payload_of(pkt):
	afc = (pkt[3] >> 4) & 3
	if not afc & 1:
		return None
	o = 4
	if afc & 2:
		o += 1 + pkt[4]
	if o >= PKT:
		return None
	return pkt[o:]


SUB_TYPES = {0x10: "", 0x11: "4:3", 0x12: "16:9", 0x13: "2.21:1", 0x14: "HD",
	0x20: "kuulovammaiset", 0x21: "kuulovammaiset", 0x22: "kuulovammaiset", 0x23: "kuulovammaiset", 0x24: "kuulovammaiset"}


def meta_service_id(path):
	"""Enigma2 kirjoittaa tallenteen viereen .ts.meta-tiedoston, jonka ensimmäinen rivi on
	palveluviite (esim. 1:0:19:FA0:4:2D:FFFF0000:0:0:0:). Neljäs kenttä on ohjelman numero."""
	try:
		with open(path + ".meta", "rb") as f:
			line = f.readline().decode("latin-1", "ignore").strip()
		parts = line.split(":")
		if len(parts) > 3:
			return int(parts[3], 16)
	except Exception:
		pass
	return None


def read_psi(path, limit=32 * 1024 * 1024):
	"""Lukee PAT/PMT:n ja ensimmäisen videon PTS:n tallenteen alusta.

	Enigma2 tallentaa kanavanipun alkuperäisen PAT-taulun, jossa ovat kaikki nipun
	ohjelmat, mutta vain tallennetun kanavan PMT:n. Siksi PMT etsitään kaikista
	PAT:n luettelemista PID:eistä, ja .meta-tiedoston ohjelmanumero ratkaisee, jos
	tallenteessa on useampi PMT."""
	info = {"offset": 0, "video_pid": None, "base_pts": None, "tracks": [], "teletext": [], "service_id": None}
	sid = meta_service_id(path)
	with open(path, "rb") as f:
		data = f.read(limit)
	off = find_sync(data)
	if off < 0:
		raise ValueError("ei TS-tiedosto")
	info["offset"] = off
	programs = {}        # ohjelmanumero -> PMT-PID (PAT:sta)
	bufs = {}            # PID -> keskeneräinen PSI-osio
	pmts = {}            # ohjelmanumero -> PMT-osio
	seen = set()
	pmt = None
	i = off
	n = len(data)
	while i + PKT <= n:
		pkt = data[i:i + PKT]
		i += PKT
		if pkt[0] != 0x47:
			o = find_sync(data, i - PKT + 1)
			if o < 0:
				break
			i = o
			continue
		pid = ((pkt[1] & 0x1f) << 8) | pkt[2]
		pusi = pkt[1] & 0x40
		pl = payload_of(pkt)
		if pl is None:
			continue
		seen.add(pid)
		if pmt is not None:
			if pid == info["video_pid"] and pusi and pl[:3] == b"\x00\x00\x01" and len(pl) > 13 and pl[7] & 0x80:
				info["base_pts"] = parse_pts(pl, 9)
				break
			continue
		# PSI: PAT (PID 0) ja mahdolliset PMT:t. Muut PID:t ohitetaan, kunnes PAT on luettu.
		if pid != 0 and (not programs or pid not in programs.values()):
			continue
		if pusi:
			if pl[0] >= len(pl) - 1:
				continue
			bufs[pid] = bytearray(pl[1 + pl[0]:])
		elif pid in bufs:
			bufs[pid] += pl
		else:
			continue
		sec = bufs[pid]
		if len(sec) < 3:
			continue
		slen = ((sec[1] & 0x0f) << 8) | sec[2]
		if len(sec) < 3 + slen:
			continue
		sec = bytes(sec[:3 + slen])
		del bufs[pid]
		if sec[0] == 0x00 and pid == 0 and not programs:
			j = 8
			while j + 4 <= 3 + slen - 4:
				prog = u16(sec, j)
				if prog != 0:
					programs[prog] = ((sec[j + 2] & 0x1f) << 8) | sec[j + 3]
				j += 4
		elif sec[0] == 0x02 and slen > 13:
			prog = u16(sec, 3)
			pmts[prog] = sec
			if sid is None or prog == sid:
				pmt = sec
				info["service_id"] = prog
				parse_pmt(pmt, info)
				if info["video_pid"] is None:
					break
	if pmt is None and pmts:
		# .meta puuttui tai ohjelmanumero ei täsmännyt: otetaan se PMT, jonka PID:itä tiedostossa on eniten
		def score(item):
			tmp = {"video_pid": None, "tracks": [], "teletext": []}
			try:
				parse_pmt(item[1], tmp)
			except Exception:
				return -1
			return 1 if tmp["video_pid"] in seen else 0
		prog, pmt = max(pmts.items(), key=score)
		info["service_id"] = prog
		parse_pmt(pmt, info)
		if info["video_pid"] is not None:
			info["base_pts"] = first_pts(data, off, info["video_pid"])
	if pmt is None:
		raise ValueError("PMT puuttuu (PAT: %s, ohjelma %s)" % (
			", ".join("%d->%d" % kv for kv in sorted(programs.items())) or "ei löytynyt", sid))
	return info


def first_pts(data, off, vpid):
	i = off
	while i + PKT <= len(data):
		pkt = data[i:i + PKT]
		i += PKT
		if pkt[0] != 0x47 or not pkt[1] & 0x40:
			continue
		if (((pkt[1] & 0x1f) << 8) | pkt[2]) != vpid:
			continue
		pl = payload_of(pkt)
		if pl and pl[:3] == b"\x00\x00\x01" and len(pl) > 13 and pl[7] & 0x80:
			return parse_pts(pl, 9)
	return None


def parse_pmt(p, info):
	slen = ((p[1] & 0x0f) << 8) | p[2]
	end = 3 + slen - 4
	pil = ((p[10] & 0x0f) << 8) | p[11]
	j = 12 + pil
	while j + 5 <= end:
		st = p[j]
		epid = ((p[j + 1] & 0x1f) << 8) | p[j + 2]
		eil = ((p[j + 3] & 0x0f) << 8) | p[j + 4]
		d = j + 5
		de = min(d + eil, end)
		j = de
		if st in (0x01, 0x02, 0x1b, 0x24, 0x10) and info["video_pid"] is None:
			info["video_pid"] = epid
		codec = AUDIO_TYPES.get(st)
		lang = ""
		while d + 2 <= de:
			tag, ln = p[d], p[d + 1]
			body = p[d + 2:d + 2 + ln]
			d += 2 + ln
			if tag == 0x0a and ln >= 3:
				lang = body[0:3].decode("latin-1", "ignore")
				if ln >= 4 and body[3] == 3 and codec:
					codec += " (kuvailutulkkaus)"
			elif st == 0x06 and tag in AUDIO_DESC:
				codec = AUDIO_DESC[tag]
			if tag == 0x59:
				for k in range(0, len(body) - 7, 8):
					lang = body[k:k + 3].decode("latin-1", "ignore")
					stype = body[k + 3]
					info["tracks"].append({
						"pid": epid, "page": u16(body, k + 4), "anc": u16(body, k + 6),
						"lang": lang, "subtype": stype, "kind": "dvb",
						"key": "%d_%d" % (epid, u16(body, k + 4)),
					})
			elif tag == 0x56:
				for k in range(0, len(body) - 4, 5):
					ttype = body[k + 3] >> 3
					if ttype in (2, 5):
						info["teletext"].append({"pid": epid, "lang": body[k:k + 3].decode("latin-1", "ignore"),
							"page": "%d%02x" % ((body[k + 3] & 7) or 8, body[k + 4])})
		if codec:
			# ääniraidat PMT-järjestyksessä: TV-soittimet numeroivat ne samoin
			info.setdefault("audio", []).append({"pid": epid, "lang": lang, "codec": codec})


AUDIO_TYPES = {0x03: "MPEG", 0x04: "MPEG", 0x0f: "AAC", 0x11: "AAC", 0x81: "Dolby Digital", 0x87: "Dolby Digital+"}
AUDIO_DESC = {0x6a: "Dolby Digital", 0x7a: "Dolby Digital+", 0x7c: "AAC", 0x7b: "DTS"}


# ---------------------------------------------------------------- purkutyö

LANG_FI = {"fin": "suomi", "swe": "ruotsi", "sve": "ruotsi", "eng": "englanti", "dut": "hollanti", "nld": "hollanti",
	"ger": "saksa", "deu": "saksa", "fre": "ranska", "fra": "ranska", "nor": "norja", "dan": "tanska",
	"sme": "saame", "smi": "saame", "rus": "venäjä", "est": "viro", "qaa": "alkuperäinen"}


def track_label(t):
	name = LANG_FI.get(t["lang"].lower(), t["lang"] or "tuntematon")
	extra = SUB_TYPES.get(t.get("subtype"), "")
	if extra == "kuulovammaiset":
		name += " (kuulovammaiset)"
	return name


def cache_dir_for(path):
	base = os.path.splitext(os.path.basename(path))[0]
	return os.path.join(os.path.dirname(path), CACHE_DIR, base)


class Job(threading.Thread):
	def __init__(self, path):
		threading.Thread.__init__(self)
		self.daemon = True
		self.path = path
		self.cache = cache_dir_for(path)
		self.lock = threading.Lock()
		self.stop_flag = False
		self.status = "starting"
		self.error = ""
		self.progress = 0.0
		self.tracks = []
		self.teletext = []
		self.audio = []
		self.cues = {}          # avain -> lista
		self.dw, self.dh = 720, 576
		self.last_used = time.time()
		self.finished_at = 0

	# --- välimuisti ---
	def stat_key(self):
		st = os.stat(self.path)
		return [int(st.st_size), int(st.st_mtime), CACHE_VERSION]

	def load_cache(self):
		try:
			with open(os.path.join(self.cache, "index.json")) as f:
				idx = json.load(f)
			if idx.get("stat") != self.stat_key() or idx.get("status") != "done":
				return False
			self.tracks = idx.get("tracks", [])
			self.teletext = idx.get("teletext", [])
			self.audio = idx.get("audio", [])
			self.cues = idx.get("cues", {})
			self.dw, self.dh = idx.get("dw", 720), idx.get("dh", 576)
			self.status = "done"
			self.progress = 1.0
			return True
		except Exception:
			return False

	def save_index(self, status):
		try:
			with self.lock:
				idx = {"stat": self.stat_key(), "status": status, "tracks": self.tracks, "teletext": self.teletext, "audio": self.audio,
					"cues": self.cues, "dw": self.dw, "dh": self.dh}
			tmp = os.path.join(self.cache, "index.json.tmp")
			with open(tmp, "w") as f:
				json.dump(idx, f)
			os.rename(tmp, os.path.join(self.cache, "index.json"))
		except Exception as e:
			log("index save failed: %s" % e)

	def cleanup_orphans(self):
		"""Poistaa välimuistista tallenteet, joita ei enää ole."""
		for old in OLD_CACHE_DIRS:   # aiempien versioiden välimuisti pois
			shutil.rmtree(os.path.join(os.path.dirname(self.path), old), ignore_errors=True)
		root = os.path.join(os.path.dirname(self.path), CACHE_DIR)
		try:
			names = os.listdir(root)
		except OSError:
			return
		movies = set(os.path.splitext(n)[0] for n in os.listdir(os.path.dirname(self.path)) if n.endswith(".ts"))
		for n in names:
			if n not in movies:
				shutil.rmtree(os.path.join(root, n), ignore_errors=True)

	# --- itse purku ---
	def run(self):
		try:
			if self.load_cache():
				return
			self.cleanup_orphans()
			info = read_psi(self.path)
			with self.lock:
				self.teletext = info["teletext"]
				self.audio = [{"lang": a["lang"], "codec": a["codec"]} for a in info.get("audio", [])]
				self.tracks = [{"key": t["key"], "lang": t["lang"], "label": track_label(t)} for t in info["tracks"]]
				for t in self.tracks:
					self.cues[t["key"]] = []
			if not info["tracks"]:
				self.status = "none"
				self.progress = 1.0
				return
			if info["base_pts"] is None:
				raise ValueError("videon aikaleimaa ei löytynyt")
			if os.path.isdir(self.cache):
				shutil.rmtree(self.cache, ignore_errors=True)
			os.makedirs(self.cache)
			self.status = "running"
			self.extract(info)
			if self.stop_flag:
				self.status = "stopped"
				return
			self.status = "done"
			self.progress = 1.0
			self.save_index("done")
			log("%s: %s" % (os.path.basename(self.path), ", ".join("%s=%d" % (k, len(v)) for k, v in self.cues.items())))
		except Exception as e:
			self.status = "error"
			self.error = str(e)
			self.finished_at = time.time()
			log("extract failed for %s: %s" % (self.path, e))

	def extract(self, info):
		base = info["base_pts"]
		decoders = {}     # pid -> [decoder]
		open_cue = {}     # avain -> viimeisin avoin vihje
		last_key = {}

		def make_sink(key):
			def sink(pts, img, timeout):
				t = ((pts - base) % PTS_WRAP) / 90000.0
				if t > 6 * 3600:
					return   # aikaleima ennen tallenteen alkua
				prev = open_cue.get(key)
				if img is not None and prev is not None and last_key.get(key) == img[5]:
					return   # sama kuva edelleen näkyvissä
				if prev is not None:
					prev["e"] = round(min(t, prev["e"]), 2)
					open_cue[key] = None
				if img is None:
					last_key[key] = None
					return
				x, y, w, h, png, ik = img
				with self.lock:
					n = len(self.cues[key])
				fname = "%s_%d.png" % (key, n)
				with open(os.path.join(self.cache, fname), "wb") as f:
					f.write(png)
				cue = {"s": round(t, 2), "e": round(t + (timeout or 8), 2), "x": x, "y": y, "w": w, "h": h, "n": n}
				with self.lock:
					self.cues[key].append(cue)
					self.dw, self.dh = dec_ref[0].dw, dec_ref[0].dh
				open_cue[key] = cue
				last_key[key] = ik
			return sink

		dec_ref = []
		for t in info["tracks"]:
			dec = DvbSubDecoder(t["page"], t["anc"], make_sink(t["key"]))
			dec_ref.append(dec)
			decoders.setdefault(t["pid"], []).append(dec)

		pes_buf = {}
		pes_pts = {}

		def emit(pid, buf):
			if len(buf) < 9 or buf[:3] != b"\x00\x00\x01" or buf[3] != 0xBD:
				return
			hl = buf[8]
			pts = parse_pts(buf, 9) if buf[7] & 0x80 else None
			payload = bytes(buf[9 + hl:])
			for dec in decoders[pid]:
				dec.feed(pts, payload)

		def packet(pid, pkt):
			pl = payload_of(pkt)
			if pl is None:
				return
			if pkt[1] & 0x40:
				if pes_buf.get(pid):
					emit(pid, pes_buf[pid])
				pes_buf[pid] = bytearray(pl)
			elif pes_buf.get(pid) is not None:
				pes_buf[pid] += pl
			else:
				return
			b = pes_buf[pid]
			if len(b) >= 6:
				ln = (b[4] << 8) | b[5]
				if ln and len(b) >= ln + 6:
					emit(pid, b[:ln + 6])
					pes_buf[pid] = None

		pids = sorted(decoders.keys())
		size = os.path.getsize(self.path)
		with open(self.path, "rb") as f:
			pos = info["offset"]
			f.seek(pos)
			last_save = time.time()
			while not self.stop_flag:
				chunk = f.read(CHUNK)
				if len(chunk) < PKT:
					break
				npk = len(chunk) // PKT
				syncs = chunk[0:npk * PKT:PKT]
				good = npk
				if syncs.count(b"\x47") != npk:
					good = len(syncs) - len(syncs.lstrip(b"\x47"))
				view = chunk[:good * PKT]
				b1 = view[1::PKT]
				b2 = view[2::PKT]
				for pid in pids:
					hi, lo = pid >> 8, pid & 0xff
					k = b2.find(bytes((lo,)))
					while k >= 0:
						if (b1[k] & 0x1f) == hi:
							packet(pid, view[k * PKT:(k + 1) * PKT])
						k = b2.find(bytes((lo,)), k + 1)
				if good < npk:
					# tahdistus katosi: etsitään seuraava kohta, jossa paketit alkavat
					o = find_sync(chunk, good * PKT + 1)
					pos += (o if o >= 0 else len(chunk))
				else:
					pos += npk * PKT
				f.seek(pos)
				self.progress = min(0.999, float(pos) / max(1, size))
				time.sleep(0.002)   # annetaan Enigma2:n käyttöliittymälle vuoroja
				if time.time() - last_save > 20:
					self.save_index("running")
					last_save = time.time()
		for pid, b in pes_buf.items():
			if b:
				emit(pid, b)
		for d in dec_ref:
			d.end_of_set()

	# --- rajapinta ---
	def snapshot(self, key=None, start=0):
		self.last_used = time.time()
		with self.lock:
			out = {"status": self.status, "progress": round(self.progress, 3), "error": self.error,
				"tracks": list(self.tracks), "teletext": len(self.teletext), "audio": list(self.audio), "dw": self.dw, "dh": self.dh}
			if key is not None:
				cues = self.cues.get(key, [])
				out["cues"] = cues[start:]
				out["total"] = len(cues)
		return out


_jobs = {}
_jobs_lock = threading.Lock()
SAFE = re.compile(r"^\d+_\d+$")


def job_for(path, start=True):
	with _jobs_lock:
		job = _jobs.get(path)
		if job is not None and start:
			if job.status == "stopped":
				job = None
			elif job.status == "error" and time.time() - job.finished_at > 600:
				job = None   # uusi yritys 10 min kuluttua (esim. tallennus oli vielä kesken)
		if job is None:
			if not start:
				return None
			# vain yksi purku kerrallaan: pysäytetään muut keskeneräiset
			for p, j in list(_jobs.items()):
				if j.status in ("starting", "running"):
					j.stop_flag = True
				if time.time() - j.last_used > 3600 and j.status not in ("starting", "running"):
					del _jobs[p]
			job = Job(path)
			_jobs[path] = job
			job.start()
		return job


def valid_recording(path):
	return bool(path) and path.endswith(".ts") and os.path.isfile(path)


def image_path(path, key, n):
	if not SAFE.match(key or "") or not str(n).isdigit():
		return None
	p = os.path.join(cache_dir_for(path), "%s_%d.png" % (key, int(n)))
	return p if os.path.isfile(p) else None
