/* SPDX-License-Identifier: GPL-3.0-or-later | Copyright (C) 2026 E2TVPlayer contributors */
/* Sovelluksen käynnistys ja näppäinten jakelu. */
var widgetAPI = new Common.API.Widget();
var tvKey = new Common.API.TVKeyValue();
var pluginAPI = new Common.API.Plugin();

var App = {
	view: null,
	statusTimer: null,

	onLoad: function () {
		I18n.applyStatic();
		Store.load();
		Screen.apply();
		Api.init();
		Browser.init();
		Player.init();

		var anchor = U.$('anchor');
		anchor.onkeydown = App.keyDown;
		anchor.focus();

		try {
			/* Äänenvoimakkuus ja mykistys jätetään TV:n hoidettavaksi */
			pluginAPI.unregistKey(tvKey.KEY_VOL_UP);
			pluginAPI.unregistKey(tvKey.KEY_VOL_DOWN);
			pluginAPI.unregistKey(tvKey.KEY_MUTE);
		} catch (e) { }
		/* TOOLS avaa ääni/tekstitys-valikon (MENU jää TV:lle) */
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
				Dialog.alert(T('Boksin osoite puuttuu'), T('Syötä Enigma2-boksin IP-osoite.'));
			}
			return;
		}
		App.refreshStatus();
		App.statusTimer = setInterval(App.refreshStatus, 30000);
		App.go('movies');
	},

	/* Etsii lähiverkosta boksin, jossa E2TVPlayer on (Tizen: TV:n oma IP tiedetään) */
	discover: function () {
		U.busy(true, T('Etsitään boksia…'));
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
				U.toast(T('Boksi löytyi: ') + found[0]);
				use(found[0]);
			} else if (found.length > 1) {
				var b = [], i;
				for (i = 0; i < found.length && i < 4; i++) {
					(function (h) { b.push({ label: h, fn: function () { use(h); } }); })(found[i]);
				}
				Dialog.open(T('Valitse boksi'), T('Lähiverkosta löytyi useampi boksi.'), b, 0);
			} else {
				Dialog.alert(T('Boksia ei löytynyt'), T('Syötä Enigma2-boksin IP-osoite.'));
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
		App.view = name;
		Views[name].enter(from);
	},

	/* toTV: EXIT palaa TV-kuvaan, RETURN Smart Hubiin */
	exit: function (toTV) {
		Player.stop();
		try {
			if (toTV) { widgetAPI.sendExitEvent(); } else { widgetAPI.sendReturnEvent(); }
		} catch (e) { }
	},

	exitDialog: false,

	confirmExit: function (toTV) {
		App.exitDialog = true;
		Dialog.open(T('Lopetetaanko E2TVPlayer?'), '', [
			{ label: T('Kyllä'), fn: function () { App.exitDialog = false; App.exit(toTV); } },
			{ label: T('Ei'), fn: function () { App.exitDialog = false; } }
		], 0, function () { App.exitDialog = false; });
	},

	/* EXIT: toistosta takaisin listaan, listasta kysely. EXIT kyselyssä = lopeta. */
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
				handled = true;                       /* odotetaan vastausta */
			} else if (Dialog.isOpen) {
				handled = Dialog.onKey(k);
			} else if (Player.active || Player.tracksOpen()) {
				handled = Player.onKey(k);
			} else if (Player.isMenuKey(k)) {
				Player.showTracks();                  /* TOOLS listoissa: kieli ja kuvakaappaus */
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
			if (standby) { parts.push(T('Boksi valmiustilassa')); }
			else {
				if (s.currservice_station) { parts.push(U.esc(s.currservice_station)); }
				if (s.currservice_name) { parts.push(U.esc(s.currservice_name)); }
			}
			var rec = s.isRecording === true || s.isRecording === 'true';
			U.$('nowbar').innerHTML = (rec ? T('<span class="rec">● TALLENTAA</span> &nbsp; ') : '') +
				T('Boksi ') + U.esc(Api.host) + (parts.length ? ' &nbsp;·&nbsp; ' + parts.join(' — ') : '');
		}, function (err) {
			U.$('nowbar').innerHTML = T('<span class="rec">Ei yhteyttä boksiin</span> &nbsp; ') + U.esc(err);
		});
	}
};
