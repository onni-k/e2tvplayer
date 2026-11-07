/* SPDX-License-Identifier: GPL-3.0-or-later | Copyright (C) 2026 E2TVPlayer contributors */
/* Tizen-sovitin: tarjoaa vanhan Samsung (Orsay) -alustan rajapinnat Tizenin päälle, jotta sama
   sovelluskoodi toimii molemmissa. Soitin = webapis.avplay, näppäimet = tizen.tvinputdevice.
   ES5, koska vanhimmat Tizen-TV:t (2015) käyttävät vanhaa WebKitiä. */
(function () {
	var IS_TIZEN = typeof tizen !== 'undefined';

	function app() { try { return tizen.application.getCurrentApplication(); } catch (e) { return null; } }
	function exitApp() { var a = app(); if (a) { try { a.exit(); } catch (e) { } } }

	/* ---- Common.API (Widget, TVKeyValue, Plugin) ---- */
	var KEYS = {
		KEY_RETURN: 10009, KEY_EXIT: 10182, KEY_ENTER: 13,
		KEY_LEFT: 37, KEY_UP: 38, KEY_RIGHT: 39, KEY_DOWN: 40,
		KEY_RED: 403, KEY_GREEN: 404, KEY_YELLOW: 405, KEY_BLUE: 406,
		KEY_PLAY: 415, KEY_PAUSE: 19, KEY_STOP: 413, KEY_FF: 417, KEY_RW: 412, KEY_PLAYPAUSE: 10252,
		KEY_INFO: 457, KEY_TOOLS: 10135, KEY_CH_UP: 427, KEY_CH_DOWN: 428,
		KEY_VOL_UP: 447, KEY_VOL_DOWN: 448, KEY_MUTE: 449
	};
	var i;
	for (i = 0; i <= 9; i++) { KEYS['KEY_' + i] = 48 + i; }

	var REGISTER = ['MediaPlay', 'MediaPause', 'MediaStop', 'MediaFastForward', 'MediaRewind', 'MediaPlayPause',
		'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue', 'ChannelUp', 'ChannelDown', 'Info', 'Tools', 'Exit',
		'0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

	function registerKeys() {
		if (!IS_TIZEN) { return; }
		var k;
		for (k = 0; k < REGISTER.length; k++) {
			try { tizen.tvinputdevice.registerKey(REGISTER[k]); } catch (e) { /* osa näppäimistä ei ole kaikissa malleissa */ }
		}
	}

	window.Common = { API: {
		Widget: function () {
			this.sendReadyEvent = function () { registerKeys(); };
			this.blockNavigation = function (ev) { try { if (ev && ev.preventDefault) { ev.preventDefault(); } } catch (e) { } };
			this.sendReturnEvent = function () { exitApp(); };
			this.sendExitEvent = function () { exitApp(); };
		},
		TVKeyValue: function () { var n; for (n in KEYS) { if (KEYS.hasOwnProperty(n)) { this[n] = KEYS[n]; } } },
		Plugin: function () {
			function saver(on) {
				try {
					webapis.appcommon.setScreenSaver(on ? webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_ON :
						webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF);
				} catch (e) { }
			}
			this.registKey = function () { };
			this.unregistKey = function () { };
			this.setOnScreenSaver = function () { saver(true); };
			this.setOffScreenSaver = function () { saver(false); };
		}
	} };

	/* ---- Orsay-soitinlisäosan rajapinta AVPlayn päälle ---- */
	function AV() { return webapis.avplay; }

	function fire(el, name) {
		var cb = el[name], args = Array.prototype.slice.call(arguments, 2);
		if (!cb) { return; }
		if (typeof cb === 'string') {
			var parts = cb.split('.'), obj = window, j;
			for (j = 0; j < parts.length - 1; j++) { obj = obj ? obj[parts[j]] : null; }
			var f = obj ? obj[parts[parts.length - 1]] : null;
			if (typeof f === 'function') { f.apply(obj, args); }
		} else if (typeof cb === 'function') {
			cb.apply(null, args);
		}
	}

	var TYPE = { 1: 'AUDIO', 5: 'TEXT' };

	function tracksOf(type) {
		var out = [], all, j;
		try { all = AV().getTotalTrackInfo() || []; } catch (e) { return out; }
		for (j = 0; j < all.length; j++) { if (all[j].type === TYPE[type]) { out.push(all[j]); } }
		return out;
	}

	function trackLang(t) {
		var info = {};
		try { info = typeof t.extra_info === 'string' ? JSON.parse(t.extra_info) : (t.extra_info || {}); } catch (e) { info = {}; }
		var l = info.language || info.track_lang || info.lang || '';
		if (!l && typeof t.extra_info === 'string') {
			var m = /lang(?:uage)?["']?\s*[:=]\s*["']?([A-Za-z]{2,3})/.exec(t.extra_info);
			if (m) { l = m[1]; }
		}
		return l;
	}

	function makePlayer(el) {
		var state = { url: null, rect: [0, 0, 1920, 1080] };

		function listener() {
			return {
				onbufferingstart: function () { fire(el, 'OnBufferingStart'); },
				onbufferingprogress: function (p) { fire(el, 'OnBufferingProgress', p); },
				onbufferingcomplete: function () { fire(el, 'OnBufferingComplete'); },
				oncurrentplaytime: function (ms) { fire(el, 'OnCurrentPlayTime', ms); },
				onstreamcompleted: function () { fire(el, 'OnRenderingComplete'); },
				onerror: function (e) {
					var s = String(e || '');
					if (/NETWORK|CONNECTION/i.test(s)) { fire(el, 'OnConnectionFailed'); }
					else if (/NOT_FOUND|INVALID_URI/i.test(s)) { fire(el, 'OnStreamNotFound'); }
					else { fire(el, 'OnRenderError', s); }
				},
				onsubtitlechange: function (duration, text) { fire(el, 'OnSubtitle', text); },
				onevent: function () { }
			};
		}

		el.SetDisplayArea = function (x, y, w, h) {
			/* Orsayn koordinaatisto on 960x540, AVPlayn 1920x1080 */
			state.rect = [x * 2, y * 2, w * 2, h * 2];
			try { AV().setDisplayRect(state.rect[0], state.rect[1], state.rect[2], state.rect[3]); } catch (e) { }
			return true;
		};
		el.InitPlayer = function (url) {
			try { AV().stop(); } catch (e0) { }
			try { AV().close(); } catch (e1) { }
			try {
				AV().open(url);
				AV().setListener(listener());
				AV().setDisplayRect(state.rect[0], state.rect[1], state.rect[2], state.rect[3]);
				try { AV().setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX'); } catch (e2) { }
				state.url = url;
				return true;
			} catch (e) {
				return false;
			}
		};
		el.StartPlayback = function (sec) {
			try {
				AV().prepareAsync(function () {
					var go = function () {
						try { AV().play(); } catch (e) { fire(el, 'OnRenderError', String(e)); return; }
						fire(el, 'OnStreamInfoReady');
					};
					if (sec > 0) {
						try { AV().seekTo(Math.floor(sec * 1000), go, go); } catch (e) { go(); }
					} else {
						go();
					}
				}, function (e) {
					fire(el, 'OnConnectionFailed', String(e));
				});
				return true;
			} catch (e) {
				return false;
			}
		};
		el.Play = function (url) { return el.InitPlayer(url) && el.StartPlayback(0); };
		el.Stop = function () {
			try { AV().stop(); } catch (e0) { }
			try { AV().close(); } catch (e1) { }
			state.url = null;
			return true;
		};
		el.Pause = function () { try { AV().pause(); } catch (e) { } return true; };
		el.Resume = function () { try { AV().play(); } catch (e) { } return true; };
		el.JumpForward = function (sec) { try { AV().jumpForward(Math.floor(sec * 1000)); } catch (e) { } return true; };
		el.JumpBackward = function (sec) { try { AV().jumpBackward(Math.floor(sec * 1000)); } catch (e) { } return true; };
		el.GetDuration = function () { try { return AV().getDuration(); } catch (e) { return 0; } };

		/* ääni- ja tekstitysraidat: tyyppi 1 = ääni, 5 = tekstitys (Orsayn numerointi) */
		el.GetTotalNumOfStreamID = function (type) { return tracksOf(type).length; };
		el.GetStreamLanguageInfo = function (type, idx) { var t = tracksOf(type)[idx]; return t ? trackLang(t) : ''; };
		el.SetStreamID = function (type, idx) {
			try {
				if (type === 5 && idx < 0) { AV().setSilentSubtitle(true); return true; }
				var t = tracksOf(type)[idx];
				if (!t) { return false; }
				if (type === 5) { try { AV().setSilentSubtitle(false); } catch (e0) { } }
				AV().setSelectTrack(TYPE[type], t.index);
				return true;
			} catch (e) {
				return false;
			}
		};
		el.Execute = function (name) {
			var f = el[name];
			return typeof f === 'function' ? f.apply(el, Array.prototype.slice.call(arguments, 1)) : null;
		};
	}

	function setup() {
		var p = document.getElementById('pluginPlayer');
		if (p) { makePlayer(p); }
		var tv = document.getElementById('pluginTVMW');
		if (tv) { tv.SetMediaSource = function () { }; }
	}

	/* Tizen: sovellus piiloon/takaisin -> toisto tauolle */
	if (IS_TIZEN) {
		document.addEventListener('visibilitychange', function () {
			try {
				if (document.hidden && window.Player && Player.active) { Player.stop(); }
			} catch (e) { }
		});
	}

	if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', setup); } else { setup(); }
	try { document.documentElement.className += ' tizen'; } catch (e) { }
	window.E2_TIZEN = true;
})();
