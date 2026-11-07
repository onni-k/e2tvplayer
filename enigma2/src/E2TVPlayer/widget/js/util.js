/* SPDX-License-Identifier: GPL-3.0-or-later | Copyright (C) 2026 E2TVPlayer contributors */
/* Apufunktiot. Pelkkää ES5:tä - Orsay-WebKit ei tunne let/const/nuolifunktioita. */
var U = {
	$: function (id) { return document.getElementById(id); },

	esc: function (s) {
		if (s === null || s === undefined) { return ''; }
		return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	},

	pad: function (n) { return n < 10 ? '0' + n : '' + n; },

	WEEKDAYS: ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'],

	/* unix-sekunnit -> "ma 2.11.2026 20:00" */
	fmtDate: function (ts, withYear) {
		if (!ts) { return ''; }
		var d = new Date(ts * 1000);
		var s = U.WEEKDAYS[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '.';
		if (withYear) { s += d.getFullYear(); }
		return s + ' ' + U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
	},

	/* sekunnit -> "1:05:09" tai "5:09" */
	fmtTime: function (sec) {
		sec = Math.max(0, Math.floor(sec || 0));
		var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
		return (h > 0 ? h + ':' + U.pad(m) : m) + ':' + U.pad(s);
	},

	/* OpenWebifin "length"-kenttä ("53:40" tai "1:53:40") -> sekunnit */
	parseLength: function (str) {
		if (!str) { return 0; }
		var p = String(str).split(':'), sec = 0, i;
		for (i = 0; i < p.length; i++) {
			var n = parseInt(p[i], 10);
			if (isNaN(n)) { return 0; }
			sec = sec * 60 + n;
		}
		return sec;
	},

	fmtSize: function (bytes) {
		bytes = Number(bytes) || 0;
		if (bytes >= 1073741824) { return (bytes / 1073741824).toFixed(1).replace('.', ',') + ' Gt'; }
		if (bytes >= 1048576) { return Math.round(bytes / 1048576) + ' Mt'; }
		return Math.round(bytes / 1024) + ' kt';
	},

	show: function (id, on) { var e = U.$(id); if (e) { e.style.display = on ? 'block' : 'none'; } },

	_toastTimer: null,
	toast: function (msg, ms) {
		var t = U.$('toast');
		t.innerHTML = U.esc(msg);
		t.style.display = 'block';
		if (U._toastTimer) { clearTimeout(U._toastTimer); }
		U._toastTimer = setTimeout(function () { t.style.display = 'none'; }, ms || 3000);
	},

	busy: function (on, text) {
		U.$('busy-text').innerHTML = U.esc(text || 'Ladataan…');
		U.show('busy', on);
	},

	log: function (msg) {
		try { if (window.alert && window.curWidget) { alert('[E2] ' + msg); } } catch (e) { }
		try { if (window.console) { console.log('[E2] ' + msg); } } catch (e2) { }
	}
};

/* Pysyvä tallennus: localStorage jos toimii, muuten Orsayn FileSystem-API. */
var Store = {
	data: null,
	FILE: 'e2tallenteet.json'   /* sisäinen nimi ennallaan, jotta asetukset säilyvät */,

	_dir: function () {
		try { return (window.curWidget && curWidget.id) ? curWidget.id : 'E2Tallenteet'; } catch (e) { return 'E2Tallenteet'; }
	},

	load: function () {
		var raw = null;
		try { raw = window.localStorage ? localStorage.getItem('e2tallenteet') : null; } catch (e) { raw = null; }
		if (!raw) {
			try {
				var fs = new FileSystem();
				var f = fs.openCommonFile(Store._dir() + '/' + Store.FILE, 'r');
				if (f) { raw = f.readAll(); fs.closeCommonFile(f); }
			} catch (e2) { raw = null; }
		}
		try { Store.data = raw ? JSON.parse(raw) : {}; } catch (e3) { Store.data = {}; }
		if (!Store.data || typeof Store.data !== 'object') { Store.data = {}; }
		if (!Store.data.pos) { Store.data.pos = {}; }
	},

	save: function () {
		var raw = JSON.stringify(Store.data);
		var ok = false;
		try { if (window.localStorage) { localStorage.setItem('e2tallenteet', raw); ok = true; } } catch (e) { ok = false; }
		try {
			var fs = new FileSystem();
			var dir = Store._dir();
			if (!fs.isValidCommonPath(dir)) { fs.createCommonDir(dir); }
			var f = fs.openCommonFile(dir + '/' + Store.FILE, 'w');
			if (f) { f.writeAll(raw); fs.closeCommonFile(f); ok = true; }
		} catch (e2) { }
		return ok;
	},

	get: function (k, def) { if (!Store.data) { Store.load(); } return Store.data.hasOwnProperty(k) ? Store.data[k] : def; },
	set: function (k, v) { if (!Store.data) { Store.load(); } Store.data[k] = v; Store.save(); },

	/* Toistokohdat tallenteille, säilytetään max 150 viimeisintä */
	getPos: function (key) { if (!Store.data) { Store.load(); } var p = Store.data.pos[key]; return p ? p.s : 0; },
	setPos: function (key, sec) {
		if (!Store.data) { Store.load(); }
		if (sec > 0) { Store.data.pos[key] = { s: Math.floor(sec), t: new Date().getTime() }; }
		else { delete Store.data.pos[key]; }
		var keys = [], k;
		for (k in Store.data.pos) { if (Store.data.pos.hasOwnProperty(k)) { keys.push(k); } }
		if (keys.length > 150) {
			keys.sort(function (a, b) { return Store.data.pos[a].t - Store.data.pos[b].t; });
			while (keys.length > 150) { delete Store.data.pos[keys.shift()]; }
		}
		Store.save();
	}
};

/* Kuvaustekstin muotoilu. DVB:n laajennetut kentät tulevat OpenWebifistä usein suoraan
   tekstin perään ("...haasteet?actor: Rose Nieminenactor: Mikko Heino"). */
U.CAST_LABELS = {
	actor: 'Näyttelijät', actors: 'Näyttelijät', director: 'Ohjaaja', producer: 'Tuottaja',
	writer: 'Käsikirjoitus', scriptwriter: 'Käsikirjoitus', presenter: 'Juontaja', guest: 'Vieraat',
	commentator: 'Selostaja', narrator: 'Kertoja', composer: 'Musiikki', country: 'Maa', year: 'Vuosi'
};
U.descParts = function (text) {
	var s = String(text || '').replace(/\u008a/g, '\n').replace(/\r/g, '');
	var re = /(actors?|director|producer|scriptwriter|writer|presenter|guest|commentator|narrator|composer):\s*/gi;
	var main = s, cast = {}, order = [], m, last = null, lastEnd = 0, firstIdx = -1;
	while ((m = re.exec(s)) !== null) {
		if (firstIdx < 0) { firstIdx = m.index; }
		if (last) { U._addCast(cast, order, last, s.substring(lastEnd, m.index)); }
		last = m[1].toLowerCase();
		lastEnd = re.lastIndex;
	}
	if (last) {
		U._addCast(cast, order, last, s.substring(lastEnd));
		main = s.substring(0, firstIdx);
	}
	main = main.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '');
	var lines = [], i;
	for (i = 0; i < order.length; i++) { lines.push(U.CAST_LABELS[order[i]] + ': ' + cast[order[i]].join(', ')); }
	return { main: main, cast: lines };
};
U._addCast = function (cast, order, key, val) {
	val = String(val).replace(/^[\s,;.]+|[\s,;.]+$/g, '');
	if (key === 'actors') { key = 'actor'; }
	if (key === 'scriptwriter') { key = 'writer'; }
	if (!val) { return; }
	if (!cast[key]) { cast[key] = []; order.push(key); }
	if (cast[key].join('|').indexOf(val) < 0) { cast[key].push(val); }
};
U.descHtml = function (text) {
	var p = U.descParts(text);
	var h = U.esc(p.main);
	if (p.cast.length) { h += (h ? '\n\n' : '') + '<span class="cast">' + U.esc(p.cast.join('\n')) + '</span>'; }
	return h;
};

/* Kielikoodit: Player voi palauttaa merkkijonon tai kolme ASCII-tavua lukuna. */
U.LANGS = {
	fin: 'suomi', swe: 'ruotsi', sve: 'ruotsi', eng: 'englanti', dut: 'hollanti', nld: 'hollanti',
	ger: 'saksa', deu: 'saksa', fre: 'ranska', fra: 'ranska', spa: 'espanja', ita: 'italia',
	rus: 'venäjä', dan: 'tanska', nor: 'norja', est: 'viro', sme: 'saame', smi: 'saame',
	qaa: 'alkuperäinen', mis: 'muu', und: 'tuntematon', nar: 'kuvailutulkkaus', qad: 'kuvailutulkkaus'
};
U.langName = function (v) {
	var code = '';
	if (v === null || v === undefined || v === '') { return ''; }
	if (typeof v === 'number' || /^\d+$/.test(String(v))) {
		var n = Number(v);
		if (n > 0) {
			code = String.fromCharCode((n >> 16) & 255, (n >> 8) & 255, n & 255).replace(/[^a-zA-Z]/g, '');
			if (code.length !== 3) {   /* toinen tavujärjestys */
				code = String.fromCharCode(n & 255, (n >> 8) & 255, (n >> 16) & 255).replace(/[^a-zA-Z]/g, '');
			}
		}
		if (code.length !== 3) { return 'raita ' + v; }
	} else {
		code = String(v).replace(/^\s+|\s+$/g, '');
	}
	var key = code.toLowerCase();
	return U.LANGS[key] ? U.LANGS[key] + ' (' + key + ')' : code;
};

/* Näytön koko. Osa TV:istä näyttää sovelluksen 960x540-tilassa, vaikka config.xml
   pyytää 1280x720 - silloin sisältö kutistetaan zoomilla. */
var Screen = {
	MODES: ['auto', '1280', '960'],
	detected: 0,
	scale: 1,

	detect: function () {
		var w = 0;
		try { w = window.innerWidth || 0; } catch (e) { }
		if (!w) { try { w = document.documentElement.clientWidth || 0; } catch (e2) { } }
		if (!w) { try { w = screen.width || 0; } catch (e3) { } }
		Screen.detected = w;
		return w;
	},

	mode: function () { return Store.get('screen', 'auto'); },

	label: function (m) {
		m = m || Screen.mode();
		if (m === '1280') { return '1280×720'; }
		if (m === '960') { return '960×540 (pienennetty)'; }
		return 'automaattinen';
	},

	apply: function () {
		document.body.style.zoom = '';
		var m = Screen.mode(), w = Screen.detect(), s = 1;
		if (m === '960') { s = 0.75; }
		else if (m === 'auto' && w > 0 && Math.abs(w - 1280) > 40) { s = w / 1280; }   /* Orsay 960 -> 0.75, Tizen 1920 -> 1.5 */
		Screen.scale = s;
		document.body.style.zoom = s === 1 ? '' : String(s);
	},

	cycle: function () {
		var i = 0, m = Screen.mode();
		while (i < Screen.MODES.length && Screen.MODES[i] !== m) { i++; }
		Store.set('screen', Screen.MODES[(i + 1) % Screen.MODES.length]);
		Screen.apply();
	}
};
