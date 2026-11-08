/* SPDX-License-Identifier: GPL-3.0-or-later | Copyright (C) 2026 E2TVPlayer contributors */
/* Loads the app code from the box, so the Tizen app needs to be installed only once:
   updating the box plugin also updates the TV app. If the box does not answer (or its
   code does not load), the copy in the package is used. */
var E2Loader = {
	FILES: ['js/util.js', 'js/api.js', 'js/listview.js', 'js/player.js', 'js/subs.js', 'js/views.js', 'js/main.js'],
	source: 'package',

	host: function () {
		var h = '';
		try { h = (JSON.parse(localStorage.getItem('e2tallenteet') || '{}') || {}).host || ''; } catch (e) { h = ''; }
		return h || (typeof BOX_DEFAULT_HOST !== 'undefined' ? BOX_DEFAULT_HOST : '');
	},

	start: function () {
		if (/[?&]local=1/.test(location.search)) { E2Loader.load('', ''); return; }
		var h = E2Loader.host();
		if (!h) { E2Loader.load('', ''); return; }
		var x = new XMLHttpRequest(), done = false;
		var local = function () { if (!done) { done = true; E2Loader.load('', ''); } };
		var t = setTimeout(function () { try { x.abort(); } catch (e) { } local(); }, 3000);
		x.onreadystatechange = function () {
			if (x.readyState !== 4 || done) { return; }
			clearTimeout(t);
			var info = null;
			try { info = JSON.parse(x.responseText); } catch (e) { info = null; }
			if (x.status === 200 && info && info.app === 'E2TVPlayer' && info.web) {
				done = true;
				if (info.files && info.files.length) { E2Loader.FILES = info.files; }   /* new file list from the box */
				E2Loader.load('http://' + h + '/e2tvplayer/web/', info.version || '');
			} else {
				local();
			}
		};
		try { x.open('GET', 'http://' + h + '/e2tvplayer/info', true); x.send(null); } catch (e) { clearTimeout(t); local(); }
	},

	load: function (base, ver) {
		var q = ver ? '?v=' + encodeURIComponent(ver) : '';
		var head = document.getElementsByTagName('head')[0];
		if (base) {
			E2Loader.source = 'box';
			if (ver) { window.BOX_PLUGIN_VERSION = ver; }
			var css = document.createElement('link');
			css.rel = 'stylesheet';
			css.type = 'text/css';
			css.href = base + 'css/style.css' + q;
			head.appendChild(css);
		}
		var i = 0;
		var next = function () {
			if (i >= E2Loader.FILES.length) {
				try { App.onLoad(); } catch (e) { if (base) { location.replace('index.html?local=1'); } }
				return;
			}
			var s = document.createElement('script');
			s.type = 'text/javascript';
			s.src = base + E2Loader.FILES[i] + q;
			s.onload = function () { i++; next(); };
			s.onerror = function () {
				/* the box code did not load: start with the copy in the package */
				if (base) { location.replace('index.html?local=1'); }
			};
			head.appendChild(s);
		};
		next();
	}
};
