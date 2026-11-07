/* SPDX-License-Identifier: GPL-3.0-or-later | Copyright (C) 2026 E2TVPlayer contributors */
/* Apufunktiot. Pelkkää ES5:tä - Orsay-WebKit ei tunne let/const/nuolifunktioita. */
/* Kieli: 'auto' (TV:n kieli), 'fi' tai 'en'. Lähdekielenä suomi; T() palauttaa
   englanninkielisen version, kun englanti on valittu. Tämän pitää olla util.js:n alussa,
   koska vanhat Tizen-latausohjelmat lataavat vain kiinteän tiedostolistan. */
var I18N_EN = {
	"Aikakatkaisu (": "Timeout (",
	"Virheellinen vastaus boksilta": "Invalid response from the box",
	"OpenWebif vaatii kirjautumisen - ota se pois päältä boksin asetuksista": "OpenWebif requires a login - turn it off in the box settings",
	"Yhteysvirhe ": "Connection error ",
	"Yhteys epäonnistui: ": "Connection failed: ",
	"Boksin osoite puuttuu": "Box address missing",
	"Syötä Enigma2-boksin IP-osoite.": "Enter the IP address of the Enigma2 box.",
	"Etsitään boksia…": "Searching for the box…",
	"Boksi löytyi: ": "Box found: ",
	"Valitse boksi": "Choose a box",
	"Lähiverkosta löytyi useampi boksi.": "More than one box was found on the network.",
	"Boksia ei löytynyt": "Box not found",
	"Lopetetaanko E2TVPlayer?": "Quit E2TVPlayer?",
	"Kyllä": "Yes",
	"Ei": "No",
	"Boksi valmiustilassa": "Box in standby",
	"<span class=\"rec\">● TALLENTAA</span> &nbsp; ": "<span class=\"rec\">● RECORDING</span> &nbsp; ",
	"Boksi ": "Box ",
	"<span class=\"rec\">Ei yhteyttä boksiin</span> &nbsp; ": "<span class=\"rec\">No connection to the box</span> &nbsp; ",
	"Puskuroidaan…": "Buffering…",
	"Toisto ei käynnistynyt": "Playback did not start",
	"Välitys ei toiminut – toistetaan suoraan (ei tekstityksiä)": "Relay failed – playing directly (no subtitles)",
	"Tarkista, että boksin striimaus (portti 8001) on käytössä ja viritin vapaana.": "Check that streaming (port 8001) is enabled on the box and a tuner is free.",
	"TV ei ehkä tue tallenteen muotoa (esim. tekstitys- tai äänimuoto) tai yhteys katkesi.": "The TV may not support the recording's format (e.g. subtitle or audio format), or the connection was lost.",
	"Toistovirhe": "Playback error",
	"❚❚ Tauko": "❚❚ Paused",
	"Odota hetki - puskuroidaan": "Please wait - buffering",
	"LIVE": "LIVE",
	"LIVE ": "LIVE ",
	"CH +/- tai ▲▼ kanava &nbsp; INFO ohjelmatiedot &nbsp; TOOLS ääni/tekstitys &nbsp; RETURN lopeta": "CH +/- or ▲▼ channel &nbsp; INFO programme info &nbsp; TOOLS audio/subtitles &nbsp; RETURN stop",
	"◀▶ 15 s &nbsp; ▲▼ 5 min &nbsp; ◀◀▶▶ 1 min &nbsp; OK tauko &nbsp; INFO tiedot &nbsp; TOOLS ääni/tekstitys &nbsp; RETURN lopeta": "◀▶ 15 s &nbsp; ▲▼ 5 min &nbsp; ◀◀▶▶ 1 min &nbsp; OK pause &nbsp; INFO info &nbsp; TOOLS audio/subtitles &nbsp; RETURN stop",
	"Puskuroidaan ": "Buffering ",
	"Tallenne katsottu loppuun": "Recording watched to the end",
	"Lähetys katkesi": "Broadcast interrupted",
	"Yhteys boksiin epäonnistui": "Connection to the box failed",
	"Verkkoyhteys katkesi": "Network connection lost",
	"Tiedostoa ei löytynyt": "File not found",
	"Toistovirhe (koodi ": "Playback error (code ",
	" · jäljellä ": " · remaining ",
	"Seuraavaksi ": "Next ",
	"<span class=\"cast\">Ei ohjelmatietoja</span>": "<span class=\"cast\">No programme information</span>",
	"ääni": "audio",
	"tekstitys": "subtitles",
	"TV ilmoittaa: ": "TV reports: ",
	"Boksi: luetaan tallennetta…": "Box: reading the recording…",
	"Boksi: tekstityksiä puretaan ": "Box: extracting subtitles ",
	"Boksi: tekstitykset purettu": "Box: subtitles extracted",
	" kpl)": ")",
	"Boksi: tallenteessa ei DVB-tekstityksiä": "Box: no DVB subtitles in the recording",
	" (vain teksti-TV-tekstitys, ei vielä tuettu)": " (teletext subtitles only, not supported yet)",
	"Boksi: ": "Box: ",
	"virhe": "error",
	"Boksi: purku keskeytyi": "Box: extraction interrupted",
	"Boksi: ei tietoa": "Box: no information",
	"Boksi: odotetaan lähetystä…": "Box: waiting for the broadcast…",
	"Boksi: tekstitykset puretaan lähetyksestä": "Box: subtitles extracted from the broadcast",
	"Boksi: kanavalla ei nyt DVB-tekstityksiä": "Box: no DVB subtitles on this channel now",
	" (vain teksti-TV, ei vielä tuettu)": " (teletext only, not supported yet)",
	"Boksi: lähetys päättyi": "Box: broadcast ended",
	"Tekstitykset eivät ole käytössä (suora toisto)": "Subtitles not available (direct playback)",
	"Ääni": "Audio",
	"Tekstitys": "Subtitles",
	"Ajoitus": "Timing",
	"  (aiemmin)": "  (earlier)",
	"  (myöhemmin)": "  (later)",
	"Kieli": "Language",
	"  (käynnistyy uudelleen)": "  (restarts)",
	"Kuvakaappaus": "Screenshot",
	"odota…": "wait…",
	"OK: ota kuva 10 s päästä": "OK: take a picture in 10 s",
	"Listanäkymää ei voi kuvata tässä TV:ssä (vain toistossa videokuva)": "The list view cannot be captured on this TV (video frame only during playback)",
	"näkymä": "view",
	"Kuva tallennettu boksiin (": "Picture saved on the box (",
	" + videokuva": " + video frame",
	"videokuva": "video frame",
	"Kuvan tallennus epäonnistui": "Saving the picture failed",
	"pois": "off",
	"oletus": "default",
	"ei tarjolla": "not available",
	"ei tukea": "not supported",
	"raita ": "track ",
	" – haetaan ": " – loading ",
	"boksi ei vastaa": "box does not respond",
	"Ladataan…": "Loading…",
	"Näyttelijät": "Cast",
	"Ohjaaja": "Director",
	"Tuottaja": "Producer",
	"Käsikirjoitus": "Writer",
	"Juontaja": "Presenter",
	"Vieraat": "Guests",
	"Selostaja": "Commentator",
	"Kertoja": "Narrator",
	"Musiikki": "Music",
	"Maa": "Country",
	"Vuosi": "Year",
	"suomi": "Finnish",
	"ruotsi": "Swedish",
	"englanti": "English",
	"hollanti": "Dutch",
	"saksa": "German",
	"ranska": "French",
	"espanja": "Spanish",
	"italia": "Italian",
	"venäjä": "Russian",
	"tanska": "Danish",
	"norja": "Norwegian",
	"viro": "Estonian",
	"saame": "Sami",
	"alkuperäinen": "original",
	"muu": "other",
	"tuntematon": "unknown",
	"kuvailutulkkaus": "audio description",
	"automaattinen": "automatic",
	"960×540 (pienennetty)": "960×540 (reduced)",
	"Ei mitään näytettävää": "Nothing to show",
	"<span class=\"k k-ok\">OK</span>Toista": "<span class=\"k k-ok\">OK</span>Play",
	"<span class=\"k k-red\"></span>Poista": "<span class=\"k k-red\"></span>Delete",
	"<span class=\"k k-green\"></span>Järjestys": "<span class=\"k k-green\"></span>Sort",
	"<span class=\"k k-yellow\"></span>Kanavat": "<span class=\"k k-yellow\"></span>Channels",
	"<span class=\"k k-blue\"></span>Asetukset": "<span class=\"k k-blue\"></span>Settings",
	"<span class=\"k k-ret\">RETURN</span>Ylös": "<span class=\"k k-ret\">RETURN</span>Up",
	"Haetaan tallenteita…": "Loading recordings…",
	" — OK: yritä uudelleen, sininen: asetukset": " — OK: retry, blue: settings",
	"Ylempi kansio": "Parent folder",
	"Kansio": "Folder",
	"Kesto ": "Duration ",
	"<span style=\"color:#4fa3ff\">Katsottu ": "<span style=\"color:#4fa3ff\">Watched up to ",
	" asti</span>": "</span>",
	"Tallenteet": "Recordings",
	"  · A–Ö": "  · A–Z",
	"  · uusin ensin": "  · newest first",
	"Kansiossa ei ole tallenteita": "No recordings in this folder",
	" · kesto ": " · duration ",
	"Jatketaanko?": "Resume?",
	"Jatka kohdasta ": "Resume from ",
	"Alusta": "From the start",
	"Poistetaanko tallenne?": "Delete the recording?",
	"Peruuta": "Cancel",
	"Poista": "Delete",
	"Poistetaan…": "Deleting…",
	"Tallenne poistettu": "Recording deleted",
	"Poisto epäonnistui": "Delete failed",
	"Tuntematon virhe": "Unknown error",
	"Järjestys: nimen mukaan": "Sort: by name",
	"Järjestys: uusin ensin": "Sort: newest first",
	"<span class=\"k k-ok\">OK</span>Katso": "<span class=\"k k-ok\">OK</span>Watch",
	"<span class=\"k k-yellow\"></span>Tallenteet": "<span class=\"k k-yellow\"></span>Recordings",
	"<span class=\"k k-ret\">RETURN</span>Takaisin": "<span class=\"k k-ret\">RETURN</span>Back",
	"Haetaan kanavanippuja…": "Loading bouquets…",
	"Kanavat": "Channels",
	"Kanavanippu": "Bouquet",
	"Ei kanavanippuja": "No bouquets",
	"Haetaan kanavia…": "Loading channels…",
	"Virhe": "Error",
	"Kanavat › ": "Channels › ",
	"Nipussa ei ole kanavia": "No channels in this bouquet",
	"Asetukset": "Settings",
	"Nykyinen: <b>": "Current: <b>",
	"Asennettu boksista: ": "Installed from the box: ",
	"Näytön koko: <b>": "Screen size: <b>",
	"</b> (TV ilmoittaa leveydeksi ": "</b> (TV reports a width of ",
	" px, skaala ": " px, scale ",
	"Sovellus ": "App ",
	"Testataan ": "Testing ",
	"Yhteys toimii: ": "Connection works: ",
	"Ei yhteyttä": "No connection",
	". Tallennetaanko silti?": ". Save anyway?",
	"Tallenna": "Save",
	"Korjaa": "Fix",
	"Näytön koko: ": "Screen size: ",
	"<span class=\"fld-label\">portti</span>": "<span class=\"fld-label\">port</span>",
	"Boksin osoite": "Box address",
	"Numeronäppäimet syöttävät, vasen/oikea vaihtaa kenttää, ylös/alas muuttaa arvoa.": "Number keys enter digits, left/right moves between fields, up/down changes the value.",
	"<span class=\"k k-ok\">OK</span> Tallenna &nbsp; <span class=\"k k-red\"></span> Palauta oletus &nbsp; <span class=\"k k-green\"></span> Näytön koko &nbsp; <span class=\"k k-ret\">RETURN</span> Peruuta": "<span class=\"k k-ok\">OK</span> Save &nbsp; <span class=\"k k-red\"></span> Reset &nbsp; <span class=\"k k-green\"></span> Screen size &nbsp; <span class=\"k k-ret\">RETURN</span> Cancel",
	"Ääni ja tekstitys": "Audio and subtitles",
	"▲▼ rivi &nbsp; ◀▶ vaihda &nbsp; OK/RETURN sulje": "▲▼ row &nbsp; ◀▶ change &nbsp; OK/RETURN close",
	"Ladataan&hellip;": "Loading&hellip;"
};
var I18n = {
	pending: false,
	_en: null,
	pref: function () {
		var v = 'auto';
		try { if (typeof Store !== 'undefined') { v = Store.get('lang', 'auto'); } } catch (e) { }
		return (v === 'fi' || v === 'en') ? v : 'auto';
	},
	sys: function () {
		var l = '';
		try { l = String(navigator.language || navigator.userLanguage || navigator.browserLanguage || ''); } catch (e) { }
		l = l.toLowerCase();
		if (!l) { return 'fi'; }
		return (l.indexOf('fi') === 0 || l.indexOf('fin') === 0) ? 'fi' : 'en';
	},
	en: function () {
		if (I18n._en === null) { var p = I18n.pref(); I18n._en = (p === 'auto' ? I18n.sys() : p) === 'en'; }
		return I18n._en;
	},
	label: function (v) {
		if (v === 'fi') { return 'suomi'; }
		if (v === 'en') { return 'English'; }
		return T('automaattinen') + ' (' + (I18n.sys() === 'en' ? 'English' : 'suomi') + ')';
	},
	cycle: function (d) {
		var o = ['auto', 'fi', 'en'], i = 0, cur = Store.get('lang', 'auto');
		for (var j = 0; j < o.length; j++) { if (o[j] === cur) { i = j; } }
		i = (i + (d < 0 ? -1 : 1) + o.length) % o.length;
		Store.set('lang', o[i]);
		var p = o[i] === 'auto' ? I18n.sys() : o[i];
		I18n.pending = ((p === 'en') !== I18n.en());
	},
	/* kielen vaihto käynnistää sovelluksen uudelleen, mutta ei kesken toiston */
	applyIfIdle: function () {
		if (!I18n.pending) { return; }
		if (typeof Player !== 'undefined' && Player.active) { return; }
		try { window.location.reload(); } catch (e) { }
	},
	STATIC: [['.s-head', 'Boksin osoite'],
		['.s-help', 'Numeronäppäimet syöttävät, vasen/oikea vaihtaa kenttää, ylös/alas muuttaa arvoa.'],
		['.s-keys', '<span class="k k-ok">OK</span> Tallenna &nbsp; <span class="k k-red"></span> Palauta oletus &nbsp; <span class="k k-green"></span> Näytön koko &nbsp; <span class="k k-ret">RETURN</span> Peruuta'],
		['.tr-head', 'Ääni ja tekstitys'], ['.tr-keys', '▲▼ rivi &nbsp; ◀▶ vaihda &nbsp; OK/RETURN sulje'],
		['#busy-text', 'Ladataan&hellip;']],
	applyStatic: function () {
		if (!I18n.en()) { return; }
		try { document.documentElement.lang = 'en'; } catch (e0) { }
		for (var i = 0; i < I18n.STATIC.length; i++) {
			var els = [];
			try { els = document.querySelectorAll(I18n.STATIC[i][0]); } catch (e) { }
			for (var j = 0; j < els.length; j++) { els[j].innerHTML = T(I18n.STATIC[i][1]); }
		}
	}
};
function T(s) {
	if (!I18n.en()) { return s; }
	return I18N_EN.hasOwnProperty(s) ? I18N_EN[s] : s;
}

var U = {
	$: function (id) { return document.getElementById(id); },

	esc: function (s) {
		if (s === null || s === undefined) { return ''; }
		return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	},

	pad: function (n) { return n < 10 ? '0' + n : '' + n; },

	WEEKDAYS: ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'],
	WEEKDAYS_EN: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

	/* unix-sekunnit -> "ma 2.11.2026 20:00" */
	fmtDate: function (ts, withYear) {
		if (!ts) { return ''; }
		var d = new Date(ts * 1000);
		var s = (I18n.en() ? U.WEEKDAYS_EN : U.WEEKDAYS)[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '.';
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
		U.$('busy-text').innerHTML = U.esc(text || T('Ladataan…'));
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
	for (i = 0; i < order.length; i++) { lines.push(T(U.CAST_LABELS[order[i]]) + ': ' + cast[order[i]].join(', ')); }
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
		if (code.length !== 3) { return T('raita ') + v; }
	} else {
		code = String(v).replace(/^\s+|\s+$/g, '');
	}
	var key = code.toLowerCase();
	return U.LANGS[key] ? T(U.LANGS[key]) + ' (' + key + ')' : code;
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
		if (m === '960') { return T('960×540 (pienennetty)'); }
		return T('automaattinen');
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
