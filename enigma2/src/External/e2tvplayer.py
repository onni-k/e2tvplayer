# -*- coding: utf-8 -*-
# OpenWebif lataa tämän tiedoston käynnistyessään hakemistosta
# Plugins/Extensions/WebInterface/WebChilds/External/ ja liittää
# rekisteröidyt sivut juureen. Näin /widgetlist.xml on varmasti mukana
# riippumatta siitä, missä järjestyksessä lisäosat käynnistyvät.
try:
	from Plugins.Extensions.E2TVPlayer.web import register
	register()
except Exception as e:
	print("[E2TVPlayer] external hook failed: %s" % e)
