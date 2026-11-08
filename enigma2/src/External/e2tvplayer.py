# -*- coding: utf-8 -*-
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 E2TVPlayer contributors
# OpenWebif loads this file at start-up from
# Plugins/Extensions/WebInterface/WebChilds/External/ and adds the
# registered pages to its root. This way /widgetlist.xml is always there,
# whatever order the plugins start in.
try:
	from Plugins.Extensions.E2TVPlayer.web import register
	register()
except Exception as e:
	print("[E2TVPlayer] external hook failed: %s" % e)
