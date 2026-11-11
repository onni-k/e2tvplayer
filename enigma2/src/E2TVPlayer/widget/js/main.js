/* SPDX-License-Identifier: GPL-3.0-or-later | Copyright (C) 2026 E2TVPlayer contributors */
/* App start-up and key dispatching. */
var widgetAPI = new Common.API.Widget();
var tvKey = new Common.API.TVKeyValue();
var pluginAPI = new Common.API.Plugin();

var App = {
	view: null,
	statusTimer: null,

	/* Start-up entry in the box log (http://box/e2tvplayer/logs): device, version and language */
	deviceInfo: function () {
		var d = [], v;
		function add(k, val) { if (val !== null && val !== undefined && String(val) !== '') { d.push(k + '=' + val); } }
		var tizenApp = document.documentElement.className.indexOf('tizen') >= 0;
		add('platform', tizenApp ? 'tizen' : 'orsay');
		add('app', typeof BOX_PLUGIN_VERSION !== 'undefined' ? BOX_PLUGIN_VERSION : null);
		try { add('widget', window.curWidget && curWidget.id); } catch (e0) { }
		try {
			if (typeof webapis !== 'undefined' && webapis.productinfo) {
				try { add('model', webapis.productinfo.getRealModel()); } catch (e1) { }
				try { add('modelcode', webapis.productinfo.getModel()); } catch (e2) { }
				try { add('firmware', webapis.productinfo.getFirmware()); } catch (e3) { }
			}
		} catch (e4) { }
		try {
			if (typeof tizen !== 'undefined' && tizen.systeminfo) {
				add('tizen', tizen.systeminfo.getCapability('http://tizen.org/feature/platform.version'));
			}
		} catch (e5) { }
		add('firmware', I18n._call('pluginNNavi', 'GetFirmware'));
		add('modelcode', I18n._call('pluginNNavi', 'GetModelCode'));
		add('product', I18n._call('pluginTVMW', 'GetProductCode'));
		try { add('screen', screen.width + 'x' + screen.height + ' win=' + window.innerWidth + 'x' + window.innerHeight); } catch (e6) { }
		add('lang', I18n.diag(true));
		add('pref', I18n.pref());
		try { add('ua', navigator.userAgent); } catch (e7) { }
		return d.join(' | ');
	},

	hello: function () {
		if (!Api.host) { return; }
		try {
			var x = new XMLHttpRequest();
			x.onreadystatechange = function () { };
			x.open('GET', Api.base() + '/e2tvplayer/log?m=' + encodeURIComponent('start ' + App.deviceInfo()), true);
			x.send(null);
		} catch (e) { }
		/* Orsay: the extra language probe a few seconds later, as its own log line */
		setTimeout(function () {
			I18n.probeMore(function (r) {
				if (!r) { return; }
				try {
					var y = new XMLHttpRequest();
					y.onreadystatechange = function () { };
					y.open('GET', Api.base() + '/e2tvplayer/log?m=' + encodeURIComponent('langprobe ' + I18n.moreText()), true);
					y.send(null);
				} catch (e2) { }
			});
		}, 3000);
	},

	onLoad: function () {
		I18n.applyStatic();
		Store.load();
		Screen.apply();
		Api.init();
		App.hello();
		Browser.init();
		Player.init();

		var anchor = U.$('anchor');
		anchor.onkeydown = App.keyDown;
		anchor.focus();

		try {
			/* volume and mute are left to the TV */
			pluginAPI.unregistKey(tvKey.KEY_VOL_UP);
			pluginAPI.unregistKey(tvKey.KEY_VOL_DOWN);
			pluginAPI.unregistKey(tvKey.KEY_MUTE);
		} catch (e) { }
		/* TOOLS opens the audio/subtitle menu (MENU stays with the TV) */
		try { if (tvKey.KEY_TOOLS !== undefined) { pluginAPI.registKey(tvKey.KEY_TOOLS); } } catch (eT) { }
		try { pluginAPI.setOnScreenSaver(); } catch (e2) { }
		try { widgetAPI.sendReadyEvent(); } catch (e3) { }

		App.tickClock();
		setInterval(App.tickClock, 10000);

		if (!Api.host) {
			App.go('settings');
			if (Api.canDiscover()) {
				App.discover();
			} else {
				Dialog.alert(T('Box address missing'), T('Enter the IP address of the Enigma2 box.'));
			}
			return;
		}
		App.refreshStatus();
		App.statusTimer = setInterval(App.refreshStatus, 30000);
		App.go('movies');
	},

	/* Searches the local network for a box with E2TVPlayer (Tizen: the TV's own IP is known) */
	discover: function () {
		U.busy(true, T('Searching for the box…'));
		Api.discover(function (found) {
			U.busy(false);
			var use = function (h) {
				Api.host = h;
				Store.set('host', h);
				Views.movies.reset();
				App.refreshStatus();
				if (!App.statusTimer) { App.statusTimer = setInterval(App.refreshStatus, 30000); }
				App.go('movies');
			};
			if (found.length === 1) {
				U.toast(T('Box found: ') + found[0]);
				use(found[0]);
			} else if (found.length > 1) {
				var b = [], i;
				for (i = 0; i < found.length && i < 4; i++) {
					(function (h) { b.push({ label: h, fn: function () { use(h); } }); })(found[i]);
				}
				Dialog.open(T('Choose a box'), T('More than one box was found on the network.'), b, 0);
			} else {
				Dialog.alert(T('Box not found'), T('Enter the IP address of the Enigma2 box.'));
			}
		});
	},

	onUnload: function () {
		try { Player.stop(); } catch (e) { }
		try { pluginAPI.setOnScreenSaver(); } catch (e2) { }
	},

	go: function (name) {
		var from = App.view;
		if (from === 'channels' && name !== 'channels') { Views.channels.leave(); }
		if (from === 'epg' && name !== 'epg') { Views.epg.leave(); }
		App.view = name;
		Views[name].enter(from);
	},

	/* toTV: EXIT returns to TV, RETURN to the Smart Hub */
	exit: function (toTV) {
		Player.stop();
		try {
			if (toTV) { widgetAPI.sendExitEvent(); } else { widgetAPI.sendReturnEvent(); }
		} catch (e) { }
	},

	exitDialog: false,

	confirmExit: function (toTV) {
		App.exitDialog = true;
		Dialog.open(T('Quit E2TVPlayer?'), '', [
			{ label: T('Yes'), fn: function () { App.exitDialog = false; App.exit(toTV); } },
			{ label: T('No'), fn: function () { App.exitDialog = false; } }
		], 0, function () { App.exitDialog = false; });
	},

	/* EXIT: from playback back to the list, in the list a dialog. EXIT in the dialog = quit. */
	onExitKey: function () {
		if (Dialog.isOpen) {
			if (App.exitDialog) { Dialog.close(); App.exitDialog = false; App.exit(true); }
			else { Dialog.onKey(tvKey.KEY_RETURN); }
		} else if (Player.active) {
			Player.stop();
		} else {
			App.confirmExit(true);
		}
	},

	keyDown: function (e) {
		var ev = e || window.event;
		var k = ev.keyCode;
		var handled = false;
		if (k === tvKey.KEY_EXIT) {
			try { widgetAPI.blockNavigation(ev); } catch (eb) { }
			try { if (ev.preventDefault) { ev.preventDefault(); } } catch (ep) { }
			try { App.onExitKey(); } catch (ee) { U.log('exit error: ' + ee); App.exit(true); }
			return false;
		}
		try {
			if (U.$('busy').style.display === 'block') {
				handled = true;                       /* wait for the answer */
			} else if (Dialog.isOpen) {
				handled = Dialog.onKey(k);
			} else if (Player.active || Player.tracksOpen()) {
				handled = Player.onKey(k);
			} else if (Player.isMenuKey(k)) {
				Player.showTracks();                  /* TOOLS in the lists: language and screenshot */
				handled = true;
			} else {
				handled = Views[App.view].onKey(k);
			}
		} catch (err) {
			U.log('key error: ' + err);
			handled = true;
		}
		if (k === tvKey.KEY_RETURN) {
			if (handled) {
				try { widgetAPI.blockNavigation(ev); } catch (e1) { }
			} else {
				try { widgetAPI.blockNavigation(ev); } catch (e2) { }
				App.confirmExit(false);
			}
		}
	},

	tickClock: function () {
		var d = new Date();
		U.$('clock').innerHTML = U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
	},

	refreshStatus: function () {
		if (Player.active) { return; }
		Api.status(function (s) {
			var parts = [];
			var standby = s.inStandby === true || s.inStandby === 'true';
			if (standby) { parts.push(T('Box in standby')); }
			else {
				if (s.currservice_station) { parts.push(U.esc(s.currservice_station)); }
				if (s.currservice_name) { parts.push(U.esc(s.currservice_name)); }
			}
			var rec = s.isRecording === true || s.isRecording === 'true';
			U.$('nowbar').innerHTML = (rec ? T('<span class="rec">● RECORDING</span> &nbsp; ') : '') +
				T('Box ') + U.esc(Api.host) + (parts.length ? ' &nbsp;·&nbsp; ' + parts.join(' — ') : '');
		}, function (err) {
			U.$('nowbar').innerHTML = T('<span class="rec">No connection to the box</span> &nbsp; ') + U.esc(err);
		});
	}
};
