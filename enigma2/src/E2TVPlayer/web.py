# -*- coding: utf-8 -*-
#
# E2TVPlayer - jakaa Samsung Smart TV (Orsay, 2011-2014 / H-sarja) -sovelluksen
# OpenWebifin kautta, jotta TV:n developer-tilan "User App Sync" voi asentaa sen.
#
# TV hakee aina osoitteen http://<IP>/widgetlist.xml (portti 80) ja sen jälkeen
# siinä mainitun zip-tiedoston. Molemmat lisätään OpenWebifin juureen
# addExternalChild-rajapinnan kautta.

from __future__ import absolute_import, print_function

import io
import json
import os
import re
import time
import zipfile

try:
	from twisted.web import resource
except ImportError:  # pragma: no cover - vain testausta varten
	resource = None

VERSION = "0.1.008"
APP_ID = "E2Tallenteet"   # TV:n sisäinen tunnus pidetään ennallaan: päivitys korvaa vanhan sovelluksen
APP_TITLE = "E2TVPlayer"
MOUNT = "e2tvplayer"
OLD_MOUNT = "e2samsungtv"   # vanhat Samsung-asennukset käyttävät tätä, kunnes ne synkataan uudelleen
ZIP_NAME = "%s.zip" % APP_ID

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
WIDGET_DIR = os.path.join(PLUGIN_DIR, "widget")

_registered = False
_zip_cache = {}


def log(msg):
	print("[E2TVPlayer] %s" % msg)


def _to_str(value):
	if value is None:
		return ""
	if isinstance(value, bytes):
		return value.decode("utf-8", "ignore")
	return str(value)


def request_host(request):
	"""Palauttaa osoitteen, jolla TV otti yhteyttä boksiin (esim. 192.168.1.10)."""
	host = _to_str(request.getHeader(b"host")).strip()
	if not host:
		try:
			host = _to_str(request.getHost().host)
		except Exception:
			host = ""
	# OpenWebif ja TV-synkka käyttävät porttia 80, joten :80 voidaan jättää pois
	if host.endswith(":80"):
		host = host[:-3]
	return host


def _widget_files():
	files = []
	for root, dirs, names in os.walk(WIDGET_DIR):
		dirs.sort()
		for name in sorted(names):
			if name.startswith(".") or name.endswith((".pyc", ".pyo")):
				continue
			full = os.path.join(root, name)
			files.append((full, os.path.relpath(full, WIDGET_DIR).replace(os.sep, "/")))
	return files


def _widget_mtime():
	newest = 0
	for full, rel in _widget_files():
		try:
			newest = max(newest, os.path.getmtime(full))
		except OSError:
			pass
	return newest


def box_config_js(host):
	host = host.replace("\\", "").replace('"', "")
	return (
		"/* Luotu automaattisesti boksissa (E2TVPlayer %s) */\n"
		"var BOX_DEFAULT_HOST = \"%s\";\n"
		"var BOX_PLUGIN_VERSION = \"%s\";\n"
		"var BOX_BUILD_TIME = %d;\n" % (VERSION, host, VERSION, int(time.time()))
	)


def build_zip(host):
	"""Rakentaa sovelluszipin muistiin. Boksin osoite kirjoitetaan js/boxconfig.js:ään,
	joten TV:llä ei tarvitse syöttää IP:tä uudelleen."""
	key = (host, _widget_mtime())
	cached = _zip_cache.get(host)
	if cached and cached[0] == key:
		return cached[1]
	buf = io.BytesIO()
	zf = zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED)
	try:
		for full, rel in _widget_files():
			if rel == "js/boxconfig.js":
				continue
			zf.write(full, rel)
		zf.writestr("js/boxconfig.js", box_config_js(host))
	finally:
		zf.close()
	data = buf.getvalue()
	_zip_cache.clear()
	_zip_cache[host] = (key, data)
	return data


TIZEN_DIR = os.path.join(PLUGIN_DIR, "tizen")
_wgt_cache = {}


def tizen_version():
	"""Tizen hyväksyy vain numeroversion x.y.z: 0.1.007 -> 0.1.7"""
	parts = [str(int(p)) if p.isdigit() else "0" for p in VERSION.split(".")[:3]]
	while len(parts) < 3:
		parts.append("0")
	return ".".join(parts)


def tizen_index():
	"""Tizenin index.html tehdään Orsay-version pohjalta, jotta ne pysyvät samoina."""
	with open(os.path.join(WIDGET_DIR, "index.html"), "rb") as f:
		html = f.read().decode("utf-8")
	out = []
	inserted = False
	for line in html.split("\n"):
		if "$MANAGER_WIDGET" in line:
			if not inserted:
				out.append('\t<script type="text/javascript" src="$WEBAPIS/webapis/webapis.js"></script>')
				out.append('\t<script type="text/javascript" src="js/tizen-shim.js"></script>')
				inserted = True
			continue
		# sovelluksen koodi ladataan loader.js:llä (boksista tai paketista), ei suoraan
		if '<script type="text/javascript" src="js/' in line and "boxconfig.js" not in line:
			if "loader" not in "".join(out[-3:]):
				out.append('\t<script type="text/javascript" src="js/loader.js"></script>')
			continue
		line = line.replace('onload="App.onLoad();"', 'onload="E2Loader.start();"')
		if "clsid:SAMSUNG-INFOLINK-PLAYER" in line:
			out.append('\t<object id="av-player" type="application/avplayer" style="position:absolute;left:0;top:0;width:1280px;height:720px;"></object>')
			out.append('\t<div id="pluginPlayer" style="display:none"></div>')
			continue
		if "clsid:SAMSUNG-INFOLINK-TVMW" in line:
			out.append('\t<div id="pluginTVMW" style="display:none"></div>')
			continue
		if "clsid:SAMSUNG-INFOLINK-" in line:
			continue
		out.append(line)
	return "\n".join(out)


def build_wgt(host):
	"""Tizen-sovelluspaketti (allekirjoittamaton .wgt). Boksin osoite mukana kuten Orsay-zipissä.
	Allekirjoitus ja asennus tehdään esim. Samsung Jellyfin Installerilla (custom .wgt)."""
	key = (host, _widget_mtime(), os.path.getmtime(TIZEN_DIR))
	cached = _wgt_cache.get(host)
	if cached and cached[0] == key:
		return cached[1]
	buf = io.BytesIO()
	zf = zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED)
	try:
		with open(os.path.join(TIZEN_DIR, "config.xml"), "rb") as f:
			zf.writestr("config.xml", f.read().decode("utf-8").replace("@VERSION@", tizen_version()))
		zf.write(os.path.join(TIZEN_DIR, "icon.png"), "icon.png")
		zf.write(os.path.join(TIZEN_DIR, "tizen-shim.js"), "js/tizen-shim.js")
		zf.write(os.path.join(TIZEN_DIR, "loader.js"), "js/loader.js")
		zf.writestr("index.html", tizen_index())
		for full, rel in _widget_files():
			if rel.startswith("js/") or rel.startswith("css/"):
				if rel == "js/boxconfig.js":
					continue
				zf.write(full, rel)
		zf.writestr("js/boxconfig.js", box_config_js(host))
	finally:
		zf.close()
	data = buf.getvalue()
	_wgt_cache.clear()
	_wgt_cache[host] = (key, data)
	return data


def apk_path():
	p = os.path.join(PLUGIN_DIR, "android", "E2TVPlayer.apk")
	return p if os.path.isfile(p) else None


def apk_version():
	try:
		with open(os.path.join(PLUGIN_DIR, "android", "version.txt")) as f:
			return f.read().strip()
	except Exception:
		return None


def widgetlist_xml(host, size):
	return (
		'<?xml version="1.0" encoding="UTF-8"?>\n'
		'<rsp stat="ok">\n'
		'\t<list>\n'
		'\t\t<widget id="%(id)s">\n'
		'\t\t\t<title>%(title)s</title>\n'
		'\t\t\t<compression size="%(size)d" type="zip"/>\n'
		'\t\t\t<description>Enigma2-tallenteet ja kanavat OpenWebifin kautta</description>\n'
		'\t\t\t<download>http://%(host)s/%(mount)s/%(zip)s</download>\n'
		'\t\t</widget>\n'
		'\t</list>\n'
		'</rsp>\n'
	) % {"id": APP_ID, "title": APP_TITLE, "size": size, "host": host, "mount": MOUNT, "zip": ZIP_NAME}


if resource is not None:

	class WidgetListResource(resource.Resource):
		isLeaf = True

		def render_GET(self, request):
			host = request_host(request)
			try:
				data = build_zip(host)
			except Exception as e:
				log("zip build failed: %s" % e)
				request.setResponseCode(500)
				return b"zip build failed"
			log("widgetlist.xml requested (host %s, zip %d bytes)" % (host, len(data)))
			request.setHeader(b"Content-Type", b"text/xml; charset=utf-8")
			request.setHeader(b"Cache-Control", b"no-cache")
			return widgetlist_xml(host, len(data)).encode("utf-8")

	class AppFolderResource(resource.Resource):
		"""/e2tvplayer/E2TVPlayer.zip ja /e2tvplayer/ (lyhyt ohjesivu)."""
		isLeaf = True

		def render_GET(self, request):
			path = [_to_str(p) for p in request.postpath if p]
			host = request_host(request)
			if path and path[0] in ("subs", "subimg"):
				return self.render_subs(request, path[0])
			if path and path[0] in ("live", "livesubs", "liveimg"):
				return self.render_live(request, path[0])
			if path and path[-1].lower().endswith(".zip"):
				data = build_zip(host)
				log("app zip downloaded (%d bytes)" % len(data))
				request.setHeader(b"Content-Type", b"application/zip")
				request.setHeader(b"Content-Length", str(len(data)).encode("ascii"))
				request.setHeader(b"Cache-Control", b"no-cache")
				return data
			if path and path[-1].lower().endswith(".wgt"):
				data = build_wgt(host)
				log("Tizen app downloaded (%d bytes)" % len(data))
				request.setHeader(b"Content-Type", b"application/widget")
				request.setHeader(b"Content-Disposition", b'attachment; filename="E2TVPlayer.wgt"')
				request.setHeader(b"Content-Length", str(len(data)).encode("ascii"))
				return data
			if path and path[-1].lower().endswith(".apk"):
				apk = apk_path()
				if not apk:
					request.setResponseCode(404)
					request.setHeader(b"Content-Type", b"text/plain; charset=utf-8")
					return u"Google TV -sovellusta ei ole tässä paketissa.".encode("utf-8")
				with open(apk, "rb") as f:
					data = f.read()
				log("Google TV app downloaded (%d bytes)" % len(data))
				request.setHeader(b"Content-Type", b"application/vnd.android.package-archive")
				request.setHeader(b"Content-Disposition", b'attachment; filename="E2TVPlayer.apk"')
				request.setHeader(b"Content-Length", str(len(data)).encode("ascii"))
				return data
			if len(path) == 3 and path[0] == "web" and path[1] in ("js", "css") and re.match(r"^[A-Za-z0-9_.-]+\.(js|css)$", path[2]):
				# Tizen-sovellus lataa koodinsa täältä: päivittyy boksin lisäosan mukana
				p = os.path.join(WIDGET_DIR, path[1], path[2])
				if path[2] == "boxconfig.js" or not os.path.isfile(p):
					request.setResponseCode(404)
					return b""
				with open(p, "rb") as f:
					data = f.read()
				request.setHeader(b"Content-Type", b"text/css; charset=utf-8" if path[1] == "css" else b"application/javascript; charset=utf-8")
				request.setHeader(b"Cache-Control", b"no-cache")
				return data
			if path and path[0] == "info":
				# Google TV -sovellus etsii boksin lähiverkosta tällä osoitteella
				request.setHeader(b"Content-Type", b"application/json; charset=utf-8")
				request.setHeader(b"Access-Control-Allow-Origin", b"*")
				return json.dumps({"app": "E2TVPlayer", "version": VERSION, "apk": bool(apk_path()), "web": True,
					"apkVersion": apk_version()}).encode("utf-8")
			request.setHeader(b"Content-Type", b"text/html; charset=utf-8")
			apk_html = (
				"<h2>Google TV / Android TV</h2>"
				"<ol><li>Asenna televisioon Google Playsta sovellus <b>Downloader</b> (AFTVnews).</li>"
				"<li>Salli asetuksista Downloaderille <i>tuntemattomien sovellusten asennus</i>.</li>"
				"<li>Kirjoita Downloaderiin osoite <b>%(h)s/%(m)s</b> ja valitse alta linkki.</li></ol>"
				"<p style='font-size:1.4em'><a href='/%(m)s/E2TVPlayer.apk'>&#11015; Lataa E2TVPlayer.apk</a></p>"
			) if apk_path() else "<p><i>Google TV -sovellus ei ole mukana tässä paketissa.</i></p>"
			html = (
				"<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width'>"
				"<title>%(t)s</title></head>"
				"<body style='font-family:sans-serif;max-width:40em;margin:2em auto;padding:0 1em'>"
				"<h1>%(t)s %(v)s</h1>" + apk_html +
				"<h2>Samsung Tizen (2015&ndash;)</h2>"
				"<ol><li>Laita TV developer-tilaan: Apps &rarr; paina 1, 2, 3, 4, 5 &rarr; Developer mode <b>On</b> ja "
				"Host PC IP = tietokoneesi IP. Käynnistä TV uudelleen.</li>"
				"<li>Lataa paketti: <a href='/%(m)s/E2TVPlayer.wgt'><b>E2TVPlayer.wgt</b></a></li>"
				"<li>Asenna se tietokoneelta <a href='https://github.com/Jellyfin2Samsung/Samsung-Jellyfin-Installer'>"
				"Samsung Jellyfin Installerilla</a> (valitse oma .wgt). Ohjelma hoitaa Samsungin varmenteen.</li></ol>"
				"<h2>Samsung Smart TV (2011&ndash;2014)</h2>"
				"<p>TV hakee sovelluksen osoitteesta "
				"<a href='/widgetlist.xml'>http://%(h)s/widgetlist.xml</a>.</p>"
				"<ol><li>Kirjaudu TV:llä Samsung-tilille käyttäjänä <b>develop</b>.</li>"
				"<li>Smart Hub &rarr; pidä OK pohjassa jonkin sovelluksen päällä &rarr; <b>IP Setting</b> &rarr; <b>%(h)s</b></li>"
				"<li>Pidä OK uudelleen pohjassa &rarr; <b>Start User App Sync</b>.</li></ol>"
				"<p><a href='/%(m)s/%(z)s'>Lataa zip</a></p></body></html>"
			) % {"t": APP_TITLE, "v": VERSION, "h": host, "m": MOUNT, "z": ZIP_NAME}
			return html.encode("utf-8")

		def render_live(self, request, what):
			"""/e2tvplayer/live?id=..&sref=..  (TS-virta TV:lle)
			/e2tvplayer/livesubs?id=..[&track=..&from=N]  ja  /e2tvplayer/liveimg?id=..&track=..&n=N"""
			from . import live

			def arg(name, default=""):
				v = request.args.get(name.encode("ascii")) or request.args.get(name)
				return _to_str(v[0]) if v else default

			sid = arg("id")
			if not re.match(r"^[A-Za-z0-9_-]{1,40}$", sid):
				request.setResponseCode(400)
				return b"bad id"
			if what == "live":
				sref = arg("sref")
				if not re.match(r"^[0-9A-Fa-f:]{10,120}$", sref):   # vain tavalliset DVB-palveluviitteet
					request.setResponseCode(400)
					return b"bad sref"
				return live.stream(request, sid, sref)
			request.setHeader(b"Cache-Control", b"no-cache")
			s = live.session(sid)
			if what == "liveimg":
				try:
					png = s.images.get((arg("track"), int(arg("n", "-1")))) if s else None
				except ValueError:
					png = None
				if not png:
					request.setResponseCode(404)
					return b""
				request.setHeader(b"Content-Type", b"image/png")
				return png
			request.setHeader(b"Content-Type", b"application/json; charset=utf-8")
			if s is None:
				return json.dumps({"status": "unknown", "tracks": [], "live": True}).encode("utf-8")
			try:
				start = int(arg("from", "0"))
			except ValueError:
				start = 0
			return json.dumps(s.snapshot(arg("track") or None, start)).encode("utf-8")

		def render_subs(self, request, what):
			"""/e2tvplayer/subs?file=..[&track=..&from=N]  ja  /e2tvplayer/subimg?file=..&track=..&n=N"""
			from . import subs

			def arg(name, default=""):
				v = request.args.get(name.encode("ascii")) or request.args.get(name)
				return _to_str(v[0]) if v else default

			request.setHeader(b"Cache-Control", b"no-cache")
			path = arg("file")
			if not subs.valid_recording(path):
				request.setResponseCode(404)
				request.setHeader(b"Content-Type", b"application/json")
				return b'{"status":"error","error":"tallennetta ei loydy"}'
			if what == "subimg":
				p = subs.image_path(path, arg("track"), arg("n"))
				if not p:
					request.setResponseCode(404)
					return b""
				with open(p, "rb") as f:
					data = f.read()
				request.setHeader(b"Content-Type", b"image/png")
				request.setHeader(b"Cache-Control", b"max-age=86400")
				return data
			job = subs.job_for(path, start=True)
			track = arg("track") or None
			try:
				start = int(arg("from", "0"))
			except ValueError:
				start = 0
			request.setHeader(b"Content-Type", b"application/json; charset=utf-8")
			return json.dumps(job.snapshot(track, start)).encode("utf-8")


def register():
	"""Rekisteröi sivut OpenWebifiin. Kutsutaan sekä OpenWebifin External-latauksesta
	että pluginin sessionstartista; vain ensimmäinen kutsu tekee jotain."""
	global _registered
	if _registered:
		return True
	if resource is None:
		return False
	try:
		from Plugins.Extensions.WebInterface.WebChilds.Toplevel import addExternalChild
	except ImportError:
		log("OpenWebif hook not available yet")
		return False
	try:
		addExternalChild(("widgetlist.xml", WidgetListResource(), "Samsung TV app sync", VERSION))
		addExternalChild((MOUNT, AppFolderResource(), "%s (Samsung / Google TV)" % APP_TITLE, VERSION))
		addExternalChild((OLD_MOUNT, AppFolderResource(), "%s (vanha osoite)" % APP_TITLE, VERSION))
	except Exception as e:
		log("addExternalChild failed: %s" % e)
		return False
	_registered = True
	log("registered /widgetlist.xml and /%s/" % MOUNT)
	return True


def is_registered():
	return _registered
