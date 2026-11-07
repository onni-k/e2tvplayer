# -*- coding: utf-8 -*-
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 E2TVPlayer contributors
from __future__ import absolute_import

from Components.ActionMap import ActionMap
from Components.Label import Label
from Components.ScrollLabel import ScrollLabel
from Plugins.Plugin import PluginDescriptor
from Screens.Screen import Screen
from enigma import getDesktop

from . import info, web


def info_text():
	"""Sama sisältö kuin selaimella osoitteessa http://boksi/e2tvplayer"""
	ip = info.box_ip()
	body = info.page_html(ip, web.VERSION, web.APP_TITLE, web.MOUNT, web.ZIP_NAME, bool(web.apk_path()), web.is_registered())
	return info.html_to_text(body, ip)


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
		self["hint"] = Label(info.L("OK / EXIT = sulje    ylös/alas = vieritä", "OK / EXIT = close    up/down = scroll"))
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
			description=info.L("Tallenteet ja live-TV Samsung- ja Google TV -televisioille", "Recordings and live TV for Samsung and Google TV televisions"),
			where=PluginDescriptor.WHERE_PLUGINMENU,
			icon="plugin.png",
			fnc=main,
		),
	]
