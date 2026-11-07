# -*- coding: utf-8 -*-
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 E2TVPlayer contributors
"""Boksin ohjesivu. Sama sisältö näytetään selaimessa (http://boksi/e2tvplayer) ja
lisäosavalikosta avatussa ruudussa: sivu tehdään HTML:nä ja ruutua varten se muutetaan
tekstiksi. Kieli seuraa Enigma2:n järjestelmäkieltä (suomi tai englanti)."""
from __future__ import absolute_import

import io
import os
import re
import socket

try:
	from html.parser import HTMLParser
	from html import unescape as _unescape
except ImportError:  # Python 2
	from HTMLParser import HTMLParser
	_unescape = HTMLParser().unescape


_PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
_cache = {}


def _po_dirs():
	# asennettuna: <lisäosa>/locale/*.po; kehitysympäristössä repon po/-kansio
	return [os.path.join(_PLUGIN_DIR, "locale"), os.path.join(_PLUGIN_DIR, "..", "..", "..", "po")]


def parse_po(path):
	"""Pieni .po-lukija: palauttaa ({msgid: msgstr}, otsaketiedot)."""
	tr, cur, key = {}, {}, None

	def unq(x):
		x = x.strip()[1:-1]
		return re.sub(r'\\(.)', lambda m: {"n": "\n", "t": "\t"}.get(m.group(1), m.group(1)), x)

	def done():
		if "msgid" in cur and cur.get("msgstr") and not cur.get("fuzzy"):
			tr[cur["msgid"]] = cur["msgstr"]

	with io.open(path, encoding="utf-8") as f:
		for line in f:
			line = line.strip()
			if not line:
				continue
			if line.startswith("#,") and "fuzzy" in line:
				done()
				cur, key = {"fuzzy": True}, None
			elif line.startswith("#"):
				continue
			elif line.startswith("msgid "):
				if "msgid" in cur:
					done()
					cur = {}
				key = "msgid"
				cur[key] = unq(line[6:])
			elif line.startswith("msgstr "):
				key = "msgstr"
				cur[key] = unq(line[7:])
			elif line.startswith('"') and key:
				cur[key] += unq(line)
	done()
	head = {}
	for hl in tr.pop("", "").split("\n"):
		if ":" in hl:
			k, v = hl.split(":", 1)
			head[k.strip()] = v.strip()
	return tr, head


def lang():
	"""Enigma2:n järjestelmäkieli kaksikirjaimisena (fi, en, sv, ...)."""
	try:
		from Components.Language import language
		return (language.getLanguage() or "fi")[:2].lower()
	except Exception:
		return "fi"


def table(code):
	"""Käännökset kielelle code; suomi (lähdekieli) = None."""
	if code == "fi":
		return None
	if code not in _cache:
		_cache[code] = None
		for d in _po_dirs():
			p = os.path.join(d, code + ".po")
			if os.path.exists(p):
				try:
					_cache[code] = parse_po(p)[0]
				except Exception:
					pass
				break
	if _cache[code] is None and code != "en":
		return table("en")   # kieltä ei ole käännetty: englanti
	return _cache[code]


def T(s):
	t = table(lang())
	return t.get(s, s) if t else s


def box_ip():
	try:
		from Components.Network import iNetwork
		for iface in iNetwork.getConfiguredAdapters():
			ip = iNetwork.getAdapterAttribute(iface, "ip")
			if ip and ip != [0, 0, 0, 0]:
				return ".".join(str(x) for x in ip)
	except Exception:
		pass
	try:
		s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
		s.connect(("10.255.255.255", 1))  # ei lähetä mitään, valitsee vain reitin
		ip = s.getsockname()[0]
		s.close()
		return ip
	except Exception:
		return "?"


def _owif(name, default=None):
	try:
		from Components.config import config
		return getattr(config.OpenWebif, name).value
	except Exception:
		return default


def warnings(registered=True):
	w = []
	if not registered:
		w.append(T("Lisäosa ei ole vielä rekisteröity OpenWebifiin. Käynnistä GUI uudelleen "
			"(OpenWebif lukee lisäosat käynnistyessään)."))
	if _owif("enabled", True) is False:
		w.append(T("OpenWebif on pois päältä - kytke se päälle."))
	port = _owif("port", 80)
	if port not in (80, None):
		w.append(T("OpenWebifin portti on %s. Vanhan Samsungin sovellussynkka toimii vain portissa 80.") % port)
	if _owif("auth", False):
		w.append(T("OpenWebifin kirjautuminen on päällä. TV-sovellukset eivät osaa kirjautua - "
			"ota kirjautuminen pois (ainakin lähiverkosta)."))
	return w


def _subs_dir():
	try:
		from .subs import cache_root
		return cache_root()
	except Exception:
		return "/media/hdd/e2tvplayer/tekstitykset"


def page_html(host, version, title, mount, zip_name, has_apk, registered=True):
	"""Ohjesivun runko (<body>-sisältö)."""
	from . import shots
	h = {"t": title, "v": version, "h": host, "m": mount, "z": zip_name}
	out = ["<h1>%(t)s %(v)s</h1>" % h]
	out.append("<p>%s <b>%s</b></p>" % (T("Boksin osoite:"), host))
	w = warnings(registered)
	if w:
		out.append("<h2>%s</h2><ul>%s</ul>" % (T("Huom"), "".join("<li>%s</li>" % x for x in w)))

	out.append("<h2>Google TV / Android TV</h2>")
	if has_apk:
		out.append(T("<ol><li>Asenna televisioon Google Playsta sovellus <b>Downloader</b> (AFTVnews).</li>"
			"<li>Salli asetuksista Downloaderille <i>tuntemattomien sovellusten asennus</i>.</li>"
			"<li>Kirjoita Downloaderiin osoite <b>%(h)s/%(m)s</b> ja valitse alta linkki.</li></ol>") % h)
		out.append(("<p style='font-size:1.4em'><a href='/%(m)s/E2TVPlayer.apk'>&#11015; " +
			T("Lataa") + " E2TVPlayer.apk</a></p>") % h)
	else:
		out.append("<p><i>%s</i></p>" % T("Google TV -sovellus ei ole mukana tässä paketissa."))

	out.append("<h2>Samsung Tizen (2015&ndash;)</h2>")
	out.append(T("<ol><li>Laita TV developer-tilaan: Apps &rarr; paina 1, 2, 3, 4, 5 &rarr; Developer mode <b>On</b> ja "
		"Host PC IP = tietokoneesi tai puhelimesi IP. Käynnistä TV uudelleen.</li>"
		"<li>Lataa paketti: <a href='/%(m)s/E2TVPlayer.wgt'><b>E2TVPlayer.wgt</b></a></li>"
		"<li>Asenna se <a href='https://github.com/Jellyfin2Samsung/Samsung-Jellyfin-Installer'>"
		"Samsung Jellyfin Installerilla</a> (valitse oma .wgt). Ohjelma hoitaa Samsungin varmenteen.</li></ol>"
		"<p>Päivitykset tulevat boksin lisäosan mukana: käynnistä sovellus uudelleen.</p>") % h)

	out.append("<h2>Samsung Smart TV (2011&ndash;2014)</h2>")
	out.append(T("<p>TV hakee sovelluksen osoitteesta <a href='/widgetlist.xml'>http://%(h)s/widgetlist.xml</a>.</p>"
		"<ol><li>TV: Valikko &rarr; Smart Hub &rarr; Samsung-tili &rarr; Kirjaudu. Tunnus <b>develop</b> "
		"(salasana tyhjä tai 000000).</li>"
		"<li>Smart Hub &rarr; pidä OK pohjassa jonkin sovelluksen päällä &rarr; <b>IP Setting</b> &rarr; <b>%(h)s</b></li>"
		"<li>Pidä OK uudelleen pohjassa &rarr; <b>Start User App Sync</b>.</li>"
		"<li>Sovellus <b>%(t)s</b> ilmestyy Omiin sovelluksiin.</li></ol>"
		"<p>Päivitys: tee kohta 3 uudelleen ja käynnistä TV sen jälkeen uudelleen. "
		"<a href='/%(m)s/%(z)s'>Lataa zip</a></p>") % h)

	out.append("<h2>%s</h2>" % T("Kuvakaappaukset"))
	out.append("<p>%s<br><code>%s</code><br><a href='/%s/kuvat'>%s</a></p>" % (
		T("TV-sovelluksen TOOLS-valikosta otetut kuvat tallentuvat kansioon"),
		shots.shots_dir(), mount, T("Näytä kuvat")))
	try:
		if not shots.find_ffmpeg():
			out.append("<p><i>%s</i></p>" % T("Videokuva Samsung-kuviin: opkg install ffmpeg"))
	except Exception:
		pass

	out.append("<h2>%s</h2>" % T("Tekstitykset"))
	out.append("<p>%s</p>" % T("Boksi purkaa tallenteen DVB-tekstitykset ensimmäisellä toistokerralla kansioon %s. "
		"Live-kanavilla tekstitykset puretaan lähetyksestä.") % _subs_dir())
	out.append("<p><small>%s</small></p>" % T("Sovelluksen kieli valitaan TV:llä TOOLS-valikosta (oletuksena TV:n kieli)."))
	return "".join(out)


def page_doc(body, title):
	return ("<!DOCTYPE html><html lang='%s'><head><meta charset='utf-8'>"
		"<meta name='viewport' content='width=device-width'><title>%s</title></head>"
		"<body style='font-family:sans-serif;max-width:40em;margin:2em auto;padding:0 1em'>%s</body></html>"
		) % (lang(), title, body)


class _Text(HTMLParser):
	"""HTML -> teksti Enigma2:n ScrollLabelia varten."""

	def __init__(self):
		HTMLParser.__init__(self)
		self.out = []
		self.line = ""
		self.lists = []
		self.href = None
		self.atext = ""

	def _flush(self):
		t = re.sub(r"[ \t]+", " ", self.line).strip()
		if t:
			self.out.append(t)
		self.line = ""

	def _blank(self):
		self._flush()
		if self.out and self.out[-1] != "":
			self.out.append("")

	def handle_starttag(self, tag, attrs):
		a = dict(attrs)
		if tag in ("h1", "h2", "p", "ol", "ul"):
			self._blank()
		if tag in ("ol", "ul"):
			self.lists.append([tag, 0])
		elif tag == "li":
			self._flush()
			kind = self.lists[-1] if self.lists else ["ul", 0]
			kind[1] += 1
			self.line = (" %d. " % kind[1]) if kind[0] == "ol" else " - "
		elif tag == "br":
			self._flush()
		elif tag == "a":
			self.href = a.get("href")
			self.atext = ""

	def handle_endtag(self, tag):
		if tag in ("ol", "ul") and self.lists:
			self.lists.pop()
		if tag == "a" and self.href:
			href = self.href
			if href.startswith("/"):
				href = "http://%s%s" % (self.host, href)
			if href not in self.atext:
				self.line += " (%s)" % href
			self.href = None
		if tag in ("h1", "h2"):
			self._flush()
			self.out.append("")
		elif tag in ("p", "li", "ol", "ul"):
			self._flush()

	def handle_data(self, data):
		data = data.replace("\n", " ")
		self.line += data
		if self.href:
			self.atext += data

	def handle_entityref(self, name):   # Python 2 / convert_charrefs=False
		self.handle_data(_unescape("&%s;" % name))

	def handle_charref(self, name):
		self.handle_data(_unescape("&#%s;" % name))


def html_to_text(html, host):
	p = _Text()
	p.host = host
	p.feed(html)
	p.close()
	p._flush()
	while p.out and p.out[-1] == "":
		p.out.pop()
	return "\n".join(p.out)
