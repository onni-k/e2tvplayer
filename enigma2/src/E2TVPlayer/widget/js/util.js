/* SPDX-License-Identifier: GPL-3.0-or-later | Copyright (C) 2026 E2TVPlayer contributors */
/* Apufunktiot. Pelkkää ES5:tä - Orsay-WebKit ei tunne let/const/nuolifunktioita. */
/* Kielet: lähdekieli suomi, käännökset po/*.po-tiedostoista (tools/i18n.py tekee I18N_DATA-lohkon).
   Valinta 'auto' seuraa TV:n kieltä. Tämän pitää olla util.js:n alussa, koska vanhat
   Tizen-latausohjelmat lataavat vain kiinteän tiedostolistan. */
/* I18N-DATA-BEGIN (tools/i18n.py tekee tämän, älä muokkaa) */
var I18N_DATA = {
 "en": {
  "name": "English",
  "t": {
   "  (aiemmin)": "  (earlier)",
   "  (käynnistyy uudelleen)": "  (restarts)",
   "  (myöhemmin)": "  (later)",
   "  · A–Ö": "  · A–Z",
   "  · uusin ensin": "  · newest first",
   " (kuulovammaiset)": " (hard of hearing)",
   " (vain teksti-TV, ei vielä tuettu)": " (teletext only, not supported yet)",
   " (vain teksti-TV-tekstitys, ei vielä tuettu)": " (teletext subtitles only, not supported yet)",
   " + videokuva": " + video frame",
   " asti</span>": "</span>",
   " kpl)": ")",
   " px, skaala ": " px, scale ",
   " · jäljellä ": " · remaining ",
   " · kesto ": " · duration ",
   " – haetaan ": " – loading ",
   " — OK: yritä uudelleen, sininen: asetukset": " — OK: retry, blue: settings",
   ". Tallennetaanko silti?": ". Save anyway?",
   "960×540 (pienennetty)": "960×540 (reduced)",
   "</b> (TV ilmoittaa leveydeksi ": "</b> (TV reports a width of ",
   "<span class=\"cast\">Ei ohjelmatietoja</span>": "<span class=\"cast\">No programme information</span>",
   "<span class=\"fld-label\">portti</span>": "<span class=\"fld-label\">port</span>",
   "<span class=\"k k-blue\"></span>Asetukset": "<span class=\"k k-blue\"></span>Settings",
   "<span class=\"k k-green\"></span>Järjestys": "<span class=\"k k-green\"></span>Sort",
   "<span class=\"k k-ok\">OK</span> Tallenna &nbsp; <span class=\"k k-red\"></span> Palauta oletus &nbsp; <span class=\"k k-green\"></span> Näytön koko &nbsp; <span class=\"k k-ret\">RETURN</span> Peruuta": "<span class=\"k k-ok\">OK</span> Save &nbsp; <span class=\"k k-red\"></span> Reset &nbsp; <span class=\"k k-green\"></span> Screen size &nbsp; <span class=\"k k-ret\">RETURN</span> Cancel",
   "<span class=\"k k-ok\">OK</span>Katso": "<span class=\"k k-ok\">OK</span>Watch",
   "<span class=\"k k-ok\">OK</span>Toista": "<span class=\"k k-ok\">OK</span>Play",
   "<span class=\"k k-red\"></span>Poista": "<span class=\"k k-red\"></span>Delete",
   "<span class=\"k k-ret\">RETURN</span>Takaisin": "<span class=\"k k-ret\">RETURN</span>Back",
   "<span class=\"k k-ret\">RETURN</span>Ylös": "<span class=\"k k-ret\">RETURN</span>Up",
   "<span class=\"k k-yellow\"></span>Kanavat": "<span class=\"k k-yellow\"></span>Channels",
   "<span class=\"k k-yellow\"></span>Tallenteet": "<span class=\"k k-yellow\"></span>Recordings",
   "<span class=\"rec\">Ei yhteyttä boksiin</span> &nbsp; ": "<span class=\"rec\">No connection to the box</span> &nbsp; ",
   "<span class=\"rec\">● TALLENTAA</span> &nbsp; ": "<span class=\"rec\">● RECORDING</span> &nbsp; ",
   "<span style=\"color:#4fa3ff\">Katsottu ": "<span style=\"color:#4fa3ff\">Watched up to ",
   "Aikakatkaisu (": "Timeout (",
   "Ajoitus": "Timing",
   "Alusta": "From the start",
   "Asennettu boksista: ": "Installed from the box: ",
   "Asetukset": "Settings",
   "Boksi ": "Box ",
   "Boksi löytyi: ": "Box found: ",
   "Boksi valmiustilassa": "Box in standby",
   "Boksi: ": "Box: ",
   "Boksi: ei tietoa": "Box: no information",
   "Boksi: kanavalla ei nyt DVB-tekstityksiä": "Box: no DVB subtitles on this channel now",
   "Boksi: luetaan tallennetta…": "Box: reading the recording…",
   "Boksi: lähetys päättyi": "Box: broadcast ended",
   "Boksi: odotetaan lähetystä…": "Box: waiting for the broadcast…",
   "Boksi: purku keskeytyi": "Box: extraction interrupted",
   "Boksi: tallenteessa ei DVB-tekstityksiä": "Box: no DVB subtitles in the recording",
   "Boksi: tekstitykset puretaan lähetyksestä": "Box: subtitles extracted from the broadcast",
   "Boksi: tekstitykset purettu": "Box: subtitles extracted",
   "Boksi: tekstityksiä puretaan ": "Box: extracting subtitles ",
   "Boksia ei löytynyt": "Box not found",
   "Boksin osoite": "Box address",
   "Boksin osoite puuttuu": "Box address missing",
   "CH +/- tai ▲▼ kanava &nbsp; INFO ohjelmatiedot &nbsp; TOOLS ääni/tekstitys &nbsp; RETURN lopeta": "CH +/- or ▲▼ channel &nbsp; INFO programme info &nbsp; TOOLS audio/subtitles &nbsp; RETURN stop",
   "Ei": "No",
   "Ei kanavanippuja": "No bouquets",
   "Ei mitään näytettävää": "Nothing to show",
   "Ei yhteyttä": "No connection",
   "Etsitään boksia…": "Searching for the box…",
   "Haetaan kanavanippuja…": "Loading bouquets…",
   "Haetaan kanavia…": "Loading channels…",
   "Haetaan tallenteita…": "Loading recordings…",
   "Jatka kohdasta ": "Resume from ",
   "Jatketaanko?": "Resume?",
   "Juontaja": "Presenter",
   "Järjestys: nimen mukaan": "Sort: by name",
   "Järjestys: uusin ensin": "Sort: newest first",
   "Kanavanippu": "Bouquet",
   "Kanavat": "Channels",
   "Kanavat › ": "Channels › ",
   "Kansio": "Folder",
   "Kansiossa ei ole tallenteita": "No recordings in this folder",
   "Kertoja": "Narrator",
   "Kesto ": "Duration ",
   "Kieli": "Language",
   "Korjaa": "Fix",
   "Kuva tallennettu boksiin (": "Picture saved on the box (",
   "Kuvakaappaus": "Screenshot",
   "Kuvan tallennus epäonnistui": "Saving the picture failed",
   "Kyllä": "Yes",
   "Käsikirjoitus": "Writer",
   "LIVE": "LIVE",
   "LIVE ": "LIVE ",
   "Ladataan&hellip;": "Loading&hellip;",
   "Ladataan…": "Loading…",
   "Listanäkymää ei voi kuvata tässä TV:ssä (vain toistossa videokuva)": "The list view cannot be captured on this TV (video frame only during playback)",
   "Lopetetaanko E2TVPlayer?": "Quit E2TVPlayer?",
   "Lähetys katkesi": "Broadcast interrupted",
   "Lähiverkosta löytyi useampi boksi.": "More than one box was found on the network.",
   "Maa": "Country",
   "Musiikki": "Music",
   "Nipussa ei ole kanavia": "No channels in this bouquet",
   "Numeronäppäimet syöttävät, vasen/oikea vaihtaa kenttää, ylös/alas muuttaa arvoa.": "Number keys enter digits, left/right moves between fields, up/down changes the value.",
   "Nykyinen: <b>": "Current: <b>",
   "Näyttelijät": "Cast",
   "Näytön koko: ": "Screen size: ",
   "Näytön koko: <b>": "Screen size: <b>",
   "OK: ota kuva 10 s päästä": "OK: take a picture in 10 s",
   "Odota hetki - puskuroidaan": "Please wait - buffering",
   "Ohjaaja": "Director",
   "OpenWebif vaatii kirjautumisen - ota se pois päältä boksin asetuksista": "OpenWebif requires a login - turn it off in the box settings",
   "Peruuta": "Cancel",
   "Poista": "Delete",
   "Poistetaanko tallenne?": "Delete the recording?",
   "Poistetaan…": "Deleting…",
   "Poisto epäonnistui": "Delete failed",
   "Puskuroidaan ": "Buffering ",
   "Puskuroidaan…": "Buffering…",
   "Selostaja": "Commentator",
   "Seuraavaksi ": "Next ",
   "Sovellus ": "App ",
   "Syötä Enigma2-boksin IP-osoite.": "Enter the IP address of the Enigma2 box.",
   "TV ei ehkä tue tallenteen muotoa (esim. tekstitys- tai äänimuoto) tai yhteys katkesi.": "The TV may not support the recording's format (e.g. subtitle or audio format), or the connection was lost.",
   "TV ilmoittaa: ": "TV reports: ",
   "Tallenna": "Save",
   "Tallenne katsottu loppuun": "Recording watched to the end",
   "Tallenne poistettu": "Recording deleted",
   "Tallenteet": "Recordings",
   "Tarkista, että boksin striimaus (portti 8001) on käytössä ja viritin vapaana.": "Check that streaming (port 8001) is enabled on the box and a tuner is free.",
   "Tekstitykset eivät ole käytössä (suora toisto)": "Subtitles not available (direct playback)",
   "Tekstitys": "Subtitles",
   "Testataan ": "Testing ",
   "Tiedostoa ei löytynyt": "File not found",
   "Toisto ei käynnistynyt": "Playback did not start",
   "Toistovirhe": "Playback error",
   "Toistovirhe (koodi ": "Playback error (code ",
   "Tuntematon virhe": "Unknown error",
   "Tuottaja": "Producer",
   "Valitse boksi": "Choose a box",
   "Verkkoyhteys katkesi": "Network connection lost",
   "Vieraat": "Guests",
   "Virhe": "Error",
   "Virheellinen vastaus boksilta": "Invalid response from the box",
   "Vuosi": "Year",
   "Välitys ei toiminut – toistetaan suoraan (ei tekstityksiä)": "Relay failed – playing directly (no subtitles)",
   "Yhteys boksiin epäonnistui": "Connection to the box failed",
   "Yhteys epäonnistui: ": "Connection failed: ",
   "Yhteys toimii: ": "Connection works: ",
   "Yhteysvirhe ": "Connection error ",
   "Ylempi kansio": "Parent folder",
   "alkuperäinen": "original",
   "automaattinen": "automatic",
   "boksi ei vastaa": "box does not respond",
   "ei tarjolla": "not available",
   "ei tukea": "not supported",
   "englanti": "English",
   "espanja": "Spanish",
   "hollanti": "Dutch",
   "italia": "Italian",
   "kuvailutulkkaus": "audio description",
   "käytössä": "in use",
   "muu": "other",
   "norja": "Norwegian",
   "näkymä": "view",
   "odota…": "wait…",
   "oletus": "default",
   "pois": "off",
   "raita ": "track ",
   "ranska": "French",
   "ruotsi": "Swedish",
   "saame": "Sami",
   "saksa": "German",
   "su ma ti ke to pe la": "Sun Mon Tue Wed Thu Fri Sat",
   "suomi": "Finnish",
   "tanska": "Danish",
   "tekstitys": "subtitles",
   "tuntematon": "unknown",
   "valittu": "chosen",
   "venäjä": "Russian",
   "videokuva": "video frame",
   "virhe": "error",
   "viro": "Estonian",
   "Ääni": "Audio",
   "Ääni ja tekstitys": "Audio and subtitles",
   "ääni": "audio",
   "▲▼ rivi &nbsp; ◀▶ vaihda &nbsp; OK/RETURN sulje": "▲▼ row &nbsp; ◀▶ change &nbsp; OK/RETURN close",
   "◀▶ 15 s &nbsp; ▲▼ 5 min &nbsp; ◀◀▶▶ 1 min &nbsp; OK tauko &nbsp; INFO tiedot &nbsp; TOOLS ääni/tekstitys &nbsp; RETURN lopeta": "◀▶ 15 s &nbsp; ▲▼ 5 min &nbsp; ◀◀▶▶ 1 min &nbsp; OK pause &nbsp; INFO info &nbsp; TOOLS audio/subtitles &nbsp; RETURN stop",
   "❚❚ Tauko": "❚❚ Paused"
  }
 }
};
/* I18N-DATA-END */
/* Samsung Orsay: pluginAPI.GetLanguage() palauttaa TV:n valikkokielen numerona */
var ORSAY_LANGS = { 0: 'en', 1: 'fr', 5: 'de', 24: 'fi', 25: 'sv' };
var ISO3 = { fin: 'fi', swe: 'sv', sve: 'sv', eng: 'en', ger: 'de', deu: 'de', fre: 'fr', fra: 'fr' };
var I18n = {
	pending: false,
	_cur: null,
	langs: function () {
		var l = ['fi'], k;
		for (k in I18N_DATA) { if (I18N_DATA.hasOwnProperty(k) && k !== 'fi') { l.push(k); } }
		return l;
	},
	has: function (c) { return c === 'fi' || I18N_DATA.hasOwnProperty(c); },
	name: function (c) { return c === 'fi' ? 'suomi' : (I18N_DATA[c] ? I18N_DATA[c].name : c); },
	pref: function () {
		var v = 'auto';
		try { if (typeof Store !== 'undefined') { v = Store.get('lang', 'auto'); } } catch (e) { }
		return (v !== 'auto' && I18n.has(v)) ? v : 'auto';
	},
	/* Kielilähteet järjestyksessä; raw-arvot talteen lokia ja TOOLS-valikkoa varten */
	src: null,
	_call: function (id, fn) {
		try {
			var o = typeof id === 'string' ? document.getElementById(id) : id;
			if (o && typeof o[fn] !== 'undefined') {
				var v = o[fn]();
				if (v !== null && v !== undefined && String(v) !== '' && String(v) !== '-1') { return String(v); }
			}
		} catch (e) { }
		return null;
	},
	norm: function (raw) {
		if (raw === null || raw === undefined) { return ''; }
		var l = String(raw).toLowerCase();
		if (/^\d+$/.test(l)) { return ORSAY_LANGS[parseInt(l, 10)] || ''; }
		if (ISO3[l.substring(0, 3)]) { return ISO3[l.substring(0, 3)]; }
		return /^[a-z]{2}/.test(l) ? l.substring(0, 2) : '';
	},
	sources: function () {
		if (I18n.src) { return I18n.src; }
		var r = [], nav = null;
		r.push(['nnavi', I18n._call('pluginNNavi', 'GetLanguage')]);
		r.push(['tvmw', I18n._call('pluginTVMW', 'GetLanguage')]);
		r.push(['api', typeof pluginAPI !== 'undefined' ? I18n._call(pluginAPI, 'GetLanguage') : null]);
		try { nav = String(navigator.language || navigator.userLanguage || navigator.browserLanguage || '') || null; } catch (e) { }
		r.push(['nav', nav]);
		I18n.src = r;
		return r;
	},
	/* TV:n kieli kaksikirjaimisena, '' jos ei selviä. Orsay: NNavi/TVMW-lisäosa, muuten selaimen kieli */
	tvLang: function () {
		var r = I18n.sources();
		for (var i = 0; i < r.length; i++) {
			var l = I18n.norm(r[i][1]);
			if (l) { return l; }
		}
		return '';
	},
	/* "nnavi=24 nav=en-US -> fi" */
	diag: function () {
		var r = I18n.sources(), out = [];
		for (var i = 0; i < r.length; i++) { if (r[i][1] !== null) { out.push(r[i][0] + '=' + r[i][1]); } }
		return out.join(' ') + ' → ' + (I18n.tvLang() || '?') + ', ' + T('käytössä') + ' ' + I18n.name(I18n.cur()) +
			(I18n.pref() === 'auto' ? '' : ' (' + T('valittu') + ')');
	},
	sys: function () {
		var l = I18n.tvLang();
		if (!l) { return 'fi'; }
		if (I18n.has(l)) { return l; }
		return I18n.has('en') ? 'en' : 'fi';
	},
	cur: function () {
		if (I18n._cur === null) { var p = I18n.pref(); I18n._cur = p === 'auto' ? I18n.sys() : p; }
		return I18n._cur;
	},
	en: function () { return I18n.cur() !== 'fi'; },   /* "ei suomi": desimaalipiste ym. */
	label: function (v) {
		if (v === 'auto') { return T('automaattinen') + ' (' + I18n.name(I18n.sys()) + ')'; }
		return I18n.name(v);
	},
	cycle: function (d) {
		var o = ['auto'].concat(I18n.langs()), i = 0, cur = I18n.pref();
		for (var j = 0; j < o.length; j++) { if (o[j] === cur) { i = j; } }
		i = (i + (d < 0 ? -1 : 1) + o.length) % o.length;
		Store.set('lang', o[i]);
		I18n.pending = ((o[i] === 'auto' ? I18n.sys() : o[i]) !== I18n.cur());
	},
	/* kielen vaihto käynnistää sovelluksen uudelleen, mutta ei kesken toiston */
	applyIfIdle: function () {
		if (!I18n.pending) { return; }
		if (typeof Player !== 'undefined' && Player.active) { return; }
		try { window.location.reload(); } catch (e) { }
	},
	STATIC: [['.s-head', N('Boksin osoite')],
		['.s-help', N('Numeronäppäimet syöttävät, vasen/oikea vaihtaa kenttää, ylös/alas muuttaa arvoa.')],
		['.s-keys', N('<span class="k k-ok">OK</span> Tallenna &nbsp; <span class="k k-red"></span> Palauta oletus &nbsp; <span class="k k-green"></span> Näytön koko &nbsp; <span class="k k-ret">RETURN</span> Peruuta')],
		['.tr-head', N('Ääni ja tekstitys')], ['.tr-keys', N('▲▼ rivi &nbsp; ◀▶ vaihda &nbsp; OK/RETURN sulje')],
		['#busy-text', N('Ladataan&hellip;')]],
	applyStatic: function () {
		if (I18n.cur() === 'fi') { return; }
		try { document.documentElement.lang = I18n.cur(); } catch (e0) { }
		for (var i = 0; i < I18n.STATIC.length; i++) {
			var els = [];
			try { els = document.querySelectorAll(I18n.STATIC[i][0]); } catch (e) { }
			for (var j = 0; j < els.length; j++) { els[j].innerHTML = T(I18n.STATIC[i][1]); }
		}
	}
};
/* boksin tekstitysnimien liitteet (TL) */
var SUB_SUFFIXES = [N(' (kuulovammaiset)')];
/* N(): merkitsee tekstin käännettäväksi kääntämättä sitä vielä */
function N(s) { return s; }
function T(s) {
	var c = I18n.cur();
	if (c === 'fi') { return s; }
	var t = I18N_DATA[c] && I18N_DATA[c].t;
	return (t && t.hasOwnProperty(s)) ? t[s] : s;
}
/* Boksin suomenkielinen nimi (esim. "ruotsi (kuulovammaiset)") käännettynä */
function TL(s) {
	if (!s || T(s) !== s) { return T(s); }
	var m = /^(.*?)( \(.*\))$/.exec(s);
	return m ? T(m[1]) + T(m[2]) : s;
}

var U = {
	$: function (id) { return document.getElementById(id); },

	esc: function (s) {
		if (s === null || s === undefined) { return ''; }
		return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	},

	pad: function (n) { return n < 10 ? '0' + n : '' + n; },


	/* unix-sekunnit -> "ma 2.11.2026 20:00" */
	fmtDate: function (ts, withYear) {
		if (!ts) { return ''; }
		var d = new Date(ts * 1000);
		var s = T('su ma ti ke to pe la').split(' ')[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '.';
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
	actor: N('Näyttelijät'), actors: N('Näyttelijät'), director: N('Ohjaaja'), producer: N('Tuottaja'),
	writer: N('Käsikirjoitus'), scriptwriter: N('Käsikirjoitus'), presenter: N('Juontaja'), guest: N('Vieraat'),
	commentator: N('Selostaja'), narrator: N('Kertoja'), composer: N('Musiikki'), country: N('Maa'), year: N('Vuosi')
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
	fin: N('suomi'), swe: N('ruotsi'), sve: N('ruotsi'), eng: N('englanti'), dut: N('hollanti'), nld: N('hollanti'),
	ger: N('saksa'), deu: N('saksa'), fre: N('ranska'), fra: N('ranska'), spa: N('espanja'), ita: N('italia'),
	rus: N('venäjä'), dan: N('tanska'), nor: N('norja'), est: N('viro'), sme: N('saame'), smi: N('saame'),
	qaa: N('alkuperäinen'), mis: N('muu'), und: N('tuntematon'), nar: N('kuvailutulkkaus'), qad: N('kuvailutulkkaus')
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
