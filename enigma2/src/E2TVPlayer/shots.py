# -*- coding: utf-8 -*-
#
# Kuvakaappaukset TV-sovelluksista. Sovellus lähettää oman näkymänsä kuvana (Google TV:llä
# myös videokuvan); web-TV:issä (Tizen/Orsay) videokuva on laitteistotasolla, jota sovellus ei
# näe, joten boksi lisää videokuvan saman kohdan tallenteesta ffmpegillä, jos se on asennettu.

from __future__ import absolute_import, print_function

import base64
import json
import os
import re
import subprocess
import threading
import time

NAME_RE = re.compile(r"^[0-9]{8}-[0-9]{6}(_[a-z0-9]+){1,3}\.(png|jpg|json)$")


def log(msg):
	print("[E2TVPlayer] shots: %s" % msg)


def shots_dir():
	for base in ("/media/hdd", "/media/usb", "/media/mmc"):
		if os.path.isdir(base) and os.access(base, os.W_OK) and (os.path.ismount(base) or os.path.isdir(os.path.join(base, "movie"))):
			d = os.path.join(base, "e2tvplayer", "kuvakaappaukset")
			break
	else:
		d = "/tmp/e2tvplayer-kuvakaappaukset"
	if not os.path.isdir(d):
		os.makedirs(d)
	return d


def find_ffmpeg():
	for p in ("/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/bin/ffmpeg"):
		if os.access(p, os.X_OK):
			return p
	return None


def decode_body(data, content_type):
	"""Kuva joko sellaisenaan (image/png, image/jpeg) tai data-URL:na (vanhat TV-selaimet)."""
	if not data:
		return None, None
	if content_type.startswith("image/"):
		return data, "jpg" if "jpeg" in content_type else "png"
	text = data.decode("ascii", "ignore").strip()
	m = re.match(r"^data:image/(png|jpeg);base64,(.*)$", text, re.S)
	if m:
		return base64.b64decode(m.group(2)), "jpg" if m.group(1) == "jpeg" else "png"
	return None, None


def save(platform, image, ext, file_path=None, pos=0.0, sref=None, live_port=8001, with_video=True, title=""):
	"""Tallentaa kuvan ja käynnistää videokuvan yhdistämisen taustalla. Palauttaa tiedot."""
	d = shots_dir()
	platform = re.sub(r"[^a-z0-9]", "", (platform or "tv").lower())[:12] or "tv"
	stamp = time.strftime("%Y%m%d-%H%M%S")
	base = "%s_%s" % (stamp, platform)
	n = 1
	while os.path.exists(os.path.join(d, base + ".json")):
		n += 1
		base = "%s_%s_%d" % (stamp, platform, n)
	meta = {"name": base, "platform": platform, "time": stamp, "file": file_path or "", "pos": round(pos or 0, 2),
		"sref": sref or "", "title": title or "", "ui": None, "video": None, "error": ""}
	if image:
		meta["ui"] = base + "_nakyma." + (ext or "png")
		with open(os.path.join(d, meta["ui"]), "wb") as f:
			f.write(image)
	ff = find_ffmpeg()
	src = None
	if not with_video:
		pass   # sovellus kaappasi videokuvan itse (Google TV)
	elif file_path and os.path.isfile(file_path):
		src = file_path
	elif sref and re.match(r"^[0-9A-Fa-f:]+$", sref):
		src = "http://127.0.0.1:%d/%s" % (live_port, sref)
	meta["ffmpeg"] = bool(ff)
	if not ff and with_video:
		meta["error"] = "ffmpeg puuttuu boksista (opkg install ffmpeg), videokuvaa ei lisätty" if src else ""
	_write_meta(d, meta)
	if ff and src:
		t = threading.Thread(target=_compose, args=(ff, d, meta, src))
		t.daemon = True
		t.start()
	log("saved %s (%s)" % (base, "ui" if image else "no ui"))
	return meta


def _write_meta(d, meta):
	with open(os.path.join(d, meta["name"] + ".json"), "w") as f:
		json.dump(meta, f)


def _compose(ff, d, meta, src):
	out = meta["name"] + ".jpg"
	cmd = [ff, "-hide_banner", "-loglevel", "error", "-y"]
	if not src.startswith("http"):
		cmd += ["-ss", "%.2f" % max(0.0, meta["pos"])]
	cmd += ["-i", src]
	if meta["ui"]:
		cmd += ["-i", os.path.join(d, meta["ui"]), "-filter_complex",
			"[0:v]yadif=0:-1:1,scale=1920:1080,setsar=1[v];[1:v]scale=1920:1080[u];[v][u]overlay=0:0[o]", "-map", "[o]"]
	else:
		cmd += ["-vf", "yadif=0:-1:1,scale=1920:1080,setsar=1"]
	cmd += ["-frames:v", "1", "-q:v", "3", os.path.join(d, out)]
	try:
		p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
		deadline = time.time() + 45
		while p.poll() is None and time.time() < deadline:
			time.sleep(0.2)
		if p.poll() is None:
			p.kill()
			meta["error"] = "ffmpeg ei valmistunut ajassa"
		elif p.returncode != 0:
			meta["error"] = "ffmpeg: " + p.stderr.read().decode("utf-8", "ignore").strip()[-300:]
		elif os.path.isfile(os.path.join(d, out)):
			meta["video"] = out
	except Exception as e:
		meta["error"] = "ffmpeg: %s" % e
	_write_meta(d, meta)
	log("compose %s: %s" % (meta["name"], meta["video"] or meta["error"]))


def listing():
	d = shots_dir()
	items = []
	for n in sorted(os.listdir(d), reverse=True):
		if n.endswith(".json"):
			try:
				with open(os.path.join(d, n)) as f:
					items.append(json.load(f))
			except Exception:
				pass
	return d, items


def path_of(name):
	if not NAME_RE.match(name or ""):
		return None
	p = os.path.join(shots_dir(), name)
	return p if os.path.isfile(p) else None
