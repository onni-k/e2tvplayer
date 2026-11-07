/* SPDX-License-Identifier: GPL-3.0-or-later | Copyright (C) 2026 E2TVPlayer contributors */
/* OpenWebif JSON-rajapinta. Orsay-sovellus saa tehdä XHR-kutsuja mihin tahansa osoitteeseen. */
var Api = {
	host: '',

	init: function () {
		var def = (typeof BOX_DEFAULT_HOST !== 'undefined') ? BOX_DEFAULT_HOST : '';
		Api.host = Store.get('host', '') || def;
	},

	defaultHost: function () { return (typeof BOX_DEFAULT_HOST !== 'undefined') ? BOX_DEFAULT_HOST : ''; },

	hostname: function () { return Api.host.split(':')[0]; },
	base: function () { return 'http://' + Api.host; },

	get: function (path, params, ok, fail, timeoutMs) {
		var url = Api.base() + path, q = [], k;
		if (params) {
			for (k in params) {
				if (params.hasOwnProperty(k) && params[k] !== undefined && params[k] !== null) {
					q.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
				}
			}
		}
		if (q.length) { url += (url.indexOf('?') < 0 ? '?' : '&') + q.join('&'); }
		var xhr = new XMLHttpRequest();
		var done = false;
		var timer = setTimeout(function () {
			if (done) { return; }
			done = true;
			try { xhr.abort(); } catch (e) { }
			if (fail) { fail('Aikakatkaisu (' + Api.host + ')'); }
		}, timeoutMs || 15000);
		xhr.onreadystatechange = function () {
			if (xhr.readyState !== 4 || done) { return; }
			done = true;
			clearTimeout(timer);
			if (xhr.status === 200) {
				var data = null;
				try { data = JSON.parse(xhr.responseText); } catch (e) {
					if (fail) { fail('Virheellinen vastaus boksilta'); }
					return;
				}
				if (ok) { ok(data); }
			} else if (xhr.status === 401) {
				if (fail) { fail('OpenWebif vaatii kirjautumisen - ota se pois päältä boksin asetuksista'); }
			} else {
				if (fail) { fail('Yhteysvirhe ' + (xhr.status || '') + ' (' + Api.host + ')'); }
			}
		};
		try {
			xhr.open('GET', url, true);
			xhr.send(null);
		} catch (e) {
			done = true;
			clearTimeout(timer);
			if (fail) { fail('Yhteys epäonnistui: ' + e); }
		}
	},

	canDiscover: function () {
		try { return typeof webapis !== 'undefined' && !!webapis.network && !!webapis.network.getIp(); } catch (e) { return false; }
	},

	/* Kysyy /e2tvplayer/info jokaiselta lähiverkon osoitteelta (x.y.z.1-254) */
	discover: function (done) {
		var ip = '';
		try { ip = webapis.network.getIp(); } catch (e) { ip = ''; }
		var m = /^(\d+\.\d+\.\d+)\.\d+$/.exec(ip || '');
		if (!m) { done([]); return; }
		var prefix = m[1], left = 254, found = [], n;
		var finish = function () {
			left--;
			if (left === 0) {
				found.sort(function (a, b) { return Number(a.split('.')[3]) - Number(b.split('.')[3]); });
				done(found);
			}
		};
		for (n = 1; n <= 254; n++) {
			(function (h) {
				var x = new XMLHttpRequest(), fin = false;
				var end = function () { if (!fin) { fin = true; finish(); } };
				var t = setTimeout(function () { try { x.abort(); } catch (e) { } end(); }, 2500);
				x.onreadystatechange = function () {
					if (x.readyState !== 4 || fin) { return; }
					clearTimeout(t);
					try { if (x.status === 200 && JSON.parse(x.responseText).app === 'E2TVPlayer') { found.push(h); } } catch (e) { }
					end();
				};
				try { x.open('GET', 'http://' + h + '/e2tvplayer/info', true); x.send(null); } catch (e) { clearTimeout(t); end(); }
			})(prefix + '.' + n);
		}
	},

	status: function (ok, fail) { Api.get('/api/statusinfo', null, ok, fail, 8000); },

	movies: function (dir, ok, fail) { Api.get('/api/movielist', dir ? { dirname: dir } : null, ok, fail, 30000); },

	deleteMovie: function (sref, ok, fail) { Api.get('/api/moviedelete', { sRef: sref }, ok, fail); },

	bouquets: function (ok, fail) { Api.get('/api/getservices', null, ok, fail); },

	services: function (bref, ok, fail) { Api.get('/api/getservices', { sRef: bref }, ok, fail); },

	epgNow: function (bref, ok, fail) { Api.get('/api/epgnow', { bRef: bref }, ok, fail, 20000); },

	epgNext: function (bref, ok, fail) { Api.get('/api/epgnext', { bRef: bref }, ok, fail, 20000); },

	/* Boksin purkamat DVB-tekstitykset (E2TVPlayer) */
	subs: function (file, key, from, ok, fail) {
		Api.get('/e2tvplayer/subs', { file: file, track: key || null, from: key ? (from || 0) : null }, ok, fail, 20000);
	},

	subImgUrl: function (file, key, n) {
		return Api.base() + '/e2tvplayer/subimg?file=' + encodeURIComponent(file) + '&track=' + encodeURIComponent(key) + '&n=' + n;
	},

	/* Live-kanava boksin välityksellä: boksi purkaa tekstitykset samasta virrasta */
	liveUrl: function (id, sref) {
		return Api.base() + '/e2tvplayer/live?id=' + encodeURIComponent(id) + '&sref=' + encodeURIComponent(sref);
	},

	liveSubs: function (id, key, from, ok, fail) {
		Api.get('/e2tvplayer/livesubs', { id: id, track: key || null, from: key ? (from || 0) : null }, ok, fail, 8000);
	},

	liveImgUrl: function (id, key, n) {
		return Api.base() + '/e2tvplayer/liveimg?id=' + encodeURIComponent(id) + '&track=' + encodeURIComponent(key) + '&n=' + n;
	},

	/* Tallenteen URL - OpenWebifin /file tukee Range-pyyntöjä, joten kelaus toimii */
	fileUrl: function (path) { return Api.base() + '/file?file=' + encodeURIComponent(path); },

	/* Live-kanava Enigma2:n striimipalvelimelta (portti 8001) */
	streamUrl: function (sref) { return 'http://' + Api.hostname() + ':8001/' + sref; }
};
