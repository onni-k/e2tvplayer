# -*- coding: utf-8 -*-
from __future__ import absolute_import

import socket

from Components.ActionMap import ActionMap
from Components.config import config
from Components.Label import Label
from Components.ScrollLabel import ScrollLabel
from Plugins.Plugin import PluginDescriptor
from Screens.Screen import Screen
from enigma import getDesktop

from . import web


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
		return getattr(config.OpenWebif, name).value
	except Exception:
		return default


def info_text():
	ip = box_ip()
	lines = []
	lines.append("Boksin IP-osoite:  %s" % ip)
	lines.append("")
	if web.is_registered():
		lines.append("Tila: valmis - TV voi hakea sovelluksen osoitteesta")
		lines.append("      http://%s/widgetlist.xml" % ip)
	else:
		lines.append("Tila: ei vielä rekisteröity OpenWebifiin.")
		lines.append("      Käynnistä GUI uudelleen (OpenWebif lukee lisäosat käynnistyessään).")
	warnings = []
	if _owif("enabled", True) is False:
		warnings.append("OpenWebif on pois päältä - kytke se päälle.")
	port = _owif("port", 80)
	if port not in (80, None):
		warnings.append("OpenWebifin portti on %s. TV-synkka toimii vain portissa 80." % port)
	if _owif("auth", False):
		warnings.append("OpenWebifin kirjautuminen on päällä. TV ei osaa kirjautua -")
		warnings.append("ota kirjautuminen pois (ainakin lähiverkosta).")
	if warnings:
		lines.append("")
		lines.append("HUOM:")
		lines.extend("  " + w for w in warnings)
	lines.append("")
	lines.append("Asennus Samsung UE40H6275 (2014 H-sarja):")
	lines.append(" 1. TV: Valikko > Smart Hub > Samsung-tili > Kirjaudu.")
	lines.append("    Tunnus: develop   (salasana tyhjä tai 000000)")
	lines.append(" 2. Paina Smart Hub. Pidä OK pohjassa jonkin sovelluksen päällä.")
	lines.append(" 3. Valitse IP Setting ja anna: %s" % ip)
	lines.append(" 4. Pidä OK taas pohjassa > Start User App Sync.")
	lines.append(" 5. Sovellus '%s' ilmestyy Omiin sovelluksiin." % web.APP_TITLE)
	lines.append("")
	lines.append("Päivitys: tee kohta 4 uudelleen ja käynnistä TV sen jälkeen uudelleen.")
	lines.append("")
	lines.append("Tekstitykset: boksi purkaa tallenteen DVB-tekstitykset ensimmäisellä")
	lines.append("toistokerralla kansioon .e2tvplayer tallenteen viereen.")
	lines.append("Sovelluksen versio: %s" % web.VERSION)
	return "\n".join(lines)


class E2TVPlayerInfo(Screen):
	if getDesktop(0).size().width() >= 1920:
		skin = """
		<screen name="E2TVPlayerInfo" position="center,center" size="1500,900" title="E2TVPlayer">
			<widget name="text" position="30,20" size="1440,800" font="Regular;30" />
			<widget name="hint" position="30,840" size="1440,45" font="Regular;28" foregroundColor="#00aaaaaa" />
		</screen>"""
	else:
		skin = """
		<screen name="E2TVPlayerInfo" position="center,center" size="1000,600" title="E2TVPlayer">
			<widget name="text" position="20,15" size="960,530" font="Regular;20" />
			<widget name="hint" position="20,560" size="960,30" font="Regular;18" foregroundColor="#00aaaaaa" />
		</screen>"""

	def __init__(self, session):
		Screen.__init__(self, session)
		self.setTitle("E2TVPlayer %s" % web.VERSION)
		self["text"] = ScrollLabel(info_text())
		self["hint"] = Label("OK / EXIT = sulje    ylös/alas = vieritä")
		self["actions"] = ActionMap(["OkCancelActions", "DirectionActions"], {
			"ok": self.close,
			"cancel": self.close,
			"up": self["text"].pageUp,
			"down": self["text"].pageDown,
			"left": self["text"].pageUp,
			"right": self["text"].pageDown,
		}, -1)


def main(session, **kwargs):
	web.register()
	session.open(E2TVPlayerInfo)


def sessionstart(reason, **kwargs):
	if reason == 0:
		web.register()


def Plugins(**kwargs):
	return [
		PluginDescriptor(where=PluginDescriptor.WHERE_SESSIONSTART, fnc=sessionstart),
		PluginDescriptor(
			name="E2TVPlayer",
			description="Tallenteet ja live-TV Samsung- ja Google TV -televisioille",
			where=PluginDescriptor.WHERE_PLUGINMENU,
			icon="plugin.png",
			fnc=main,
		),
	]
