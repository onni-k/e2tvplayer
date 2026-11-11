/* SPDX-License-Identifier: GPL-3.0-or-later | Copyright (C) 2026 E2TVPlayer contributors */
/* Views: recordings, channels, settings + a generic dialog. */

var Dialog = {
	isOpen: false,
	buttons: [],
	index: 0,
	onCancel: null,

	open: function (title, text, buttons, index, onCancel) {
		Dialog.buttons = buttons && buttons.length ? buttons : [{ label: 'OK' }];
		Dialog.index = index || 0;
		Dialog.onCancel = onCancel || null;
		U.$('dlg-title').innerHTML = U.esc(title);
		U.$('dlg-text').innerHTML = U.esc(text);
		Dialog.render();
		Dialog.isOpen = true;
		U.show('dialog', true);
	},

	alert: function (title, text, fn) { Dialog.open(title, text, [{ label: 'OK', fn: fn }], 0, fn); },

	close: function () { Dialog.isOpen = false; U.show('dialog', false); },

	render: function () {
		var html = [], i;
		for (i = 0; i < Dialog.buttons.length; i++) {
			html.push('<span class="btn' + (i === Dialog.index ? ' sel' : '') + '">' + U.esc(Dialog.buttons[i].label) + '</span>');
		}
		U.$('dlg-buttons').innerHTML = html.join('');
	},

	onKey: function (k) {
		var n = Dialog.buttons.length;
		if (k === tvKey.KEY_LEFT || k === tvKey.KEY_UP) { Dialog.index = (Dialog.index - 1 + n) % n; Dialog.render(); }
		else if (k === tvKey.KEY_RIGHT || k === tvKey.KEY_DOWN) { Dialog.index = (Dialog.index + 1) % n; Dialog.render(); }
		else if (k === tvKey.KEY_ENTER) {
			var b = Dialog.buttons[Dialog.index];
			Dialog.close();
			if (b && b.fn) { b.fn(); }
		} else if (k === tvKey.KEY_RETURN) {
			var c = Dialog.onCancel;
			Dialog.close();
			if (c) { c(); }
		}
		return true;
	}
};

var Views = {};

/* common list + details panel for recordings and channels */
var Browser = {
	list: null,
	init: function () { Browser.list = new ListView('list', 'scrollthumb', 10, Browser.renderRow); },
	renderRow: function (it, sel) {
		var cls = 'row' + (sel ? ' sel' : '') + (it.cls ? ' ' + it.cls : '');
		var h = '<div class="' + cls + '"><div class="ic">' + (it.icon || '') + '</div>' +
			'<div class="t">' + U.esc(it.title) + '</div>' +
			'<div class="s">' + U.esc(it.sub || '') + '</div>' +
			'<div class="r">' + U.esc(it.right || '') + '</div>' +
			'<div class="r2">' + U.esc(it.right2 || '') + '</div>';
		if (it.progress > 0) { h += '<div class="bar" style="width:' + Math.round(Math.min(1, it.progress) * 440) + 'px"></div>'; }
		return h + '</div>';
	},
	setItems: function (items, index, emptyText) {
		Browser.list.setItems(items, index);
		U.$('empty').innerHTML = U.esc(emptyText || T('Nothing to show'));
		U.show('empty', !items.length);
		Browser.details();
	},
	details: function () {
		var it = Browser.list.current();
		U.$('d-title').innerHTML = it ? U.esc(it.title) : '';
		U.$('d-meta').innerHTML = it && it.meta ? it.meta : '';
		U.$('d-desc').innerHTML = it ? (it.descHtml || U.esc(it.desc || '')) : '';
	},
	move: function (d) { if (Browser.list.move(d)) { Browser.details(); } },
	navKey: function (k) {
		switch (k) {
			case tvKey.KEY_UP: Browser.move(-1); return true;
			case tvKey.KEY_DOWN: Browser.move(1); return true;
			case tvKey.KEY_LEFT: case tvKey.KEY_CH_UP: Browser.move(-10); return true;
			case tvKey.KEY_RIGHT: case tvKey.KEY_CH_DOWN: Browser.move(10); return true;
		}
		return false;
	}
};

function footer(html) { U.$('footer').innerHTML = html; }
function crumb(text) { U.$('crumb').innerHTML = U.esc(text); }

/* ------------------------------------------------------------------ */
Views.movies = {
	root: null,
	dir: null,
	data: null,
	error: null,
	remember: {},   /* directory -> selected row */

	enter: function () {
		U.show('browser', true);
		U.show('settings', false);
		footer(T('<span class="k k-ok">OK</span>Play') +
			T('<span class="k k-red"></span>Delete') +
			T('<span class="k k-green"></span>Sort') +
			T('<span class="k k-yellow"></span>Channels') +
			T('<span class="k k-blue"></span>Settings') +
			T('<span class="k k-ret">RETURN</span>Up'));
		if (!Views.movies.data && !Views.movies.error) { Views.movies.load(null); }
		else { Views.movies.render(Browser.list.index); }
	},

	reset: function () { Views.movies.root = null; Views.movies.dir = null; Views.movies.data = null; Views.movies.error = null; Views.movies.remember = {}; },

	load: function (dir, selectPath) {
		U.busy(true, T('Loading recordings…'));
		Api.movies(dir, function (data) {
			U.busy(false);
			var d = data.directory || dir || '/media/hdd/movie/';
			if (d.charAt(d.length - 1) !== '/') { d += '/'; }
			if (!Views.movies.root) { Views.movies.root = d; }
			Views.movies.dir = d;
			Views.movies.data = data;
			Views.movies.error = null;
			Views.movies.render(null, selectPath);
		}, function (err) {
			U.busy(false);
			Views.movies.error = err;
			Views.movies.data = null;
			crumb('');
			Browser.setItems([], 0, err + T(' — OK: retry, blue: settings'));
		});
	},

	sortMode: function () { return Store.get('sort', 'date'); },

	buildItems: function () {
		var M = Views.movies, data = M.data, items = [], i;
		if (!data) { return items; }
		if (M.dir !== M.root) {
			items.push({ type: 'up', icon: '↰', cls: 'dir', title: '..', sub: T('Parent folder') });
		}
		var dirs = (data.bookmarks || []).slice(0);
		dirs.sort(function (a, b) { return String(a).toLowerCase() < String(b).toLowerCase() ? -1 : 1; });
		for (i = 0; i < dirs.length; i++) {
			var name = String(dirs[i]).replace(/\/$/, '');
			if (!name || name === '.Trash' || name === 'trashcan' || name.charAt(0) === '.') { continue; }
			items.push({ type: 'dir', icon: '▸', cls: 'dir', title: name, sub: T('Folder'), path: M.dir + name + '/' });
		}
		var movies = (data.movies || []).slice(0);
		if (M.sortMode() === 'name') {
			movies.sort(function (a, b) {
				var x = (a.eventname || a.filename_stripped || '').toLowerCase(), y = (b.eventname || b.filename_stripped || '').toLowerCase();
				return x < y ? -1 : (x > y ? 1 : (b.recordingtime || 0) - (a.recordingtime || 0));
			});
		} else {
			movies.sort(function (a, b) { return (b.recordingtime || 0) - (a.recordingtime || 0); });
		}
		for (i = 0; i < movies.length; i++) { items.push(M.movieItem(movies[i])); }
		return items;
	},

	movieItem: function (m) {
		var len = U.parseLength(m.length);
		var key = m.filename || m.fullname || m.serviceref;
		var pos = Store.getPos(key);
		var title = m.eventname || m.filename_stripped || m.filename;
		var meta = [];
		if (m.servicename) { meta.push(U.esc(m.servicename)); }
		if (m.recordingtime) { meta.push(U.esc(U.fmtDate(m.recordingtime, true))); }
		meta.push(T('Duration ') + (len ? U.esc(U.fmtTime(len)) : '?') + ' &nbsp; ' + U.esc(m.filesize_readable || U.fmtSize(m.filesize)));
		if (pos > 0) { meta.push(T('<span style="color:#4fa3ff">Watched up to ') + U.esc(U.fmtTime(pos)) + T('</span>')); }
		var desc = m.description || '';
		if (m.descriptionExtended && m.descriptionExtended !== desc) { desc += (desc ? '\n\n' : '') + m.descriptionExtended; }
		return {
			type: 'movie', icon: pos > 0 ? '◐' : '●', movie: m, key: key, length: len, pos: pos,
			title: title,
			sub: (m.servicename ? m.servicename + ' · ' : '') + U.fmtDate(m.recordingtime),
			right: len ? U.fmtTime(len) : '',
			right2: m.filesize_readable || U.fmtSize(m.filesize),
			progress: len && pos ? pos / len : 0,
			meta: meta.join('<br/>'),
			desc: desc,
			descHtml: U.descHtml(desc)
		};
	},

	render: function (index, selectPath) {
		var M = Views.movies;
		if (!M.data) { return; }
		var items = M.buildItems(), i;
		if (index === null || index === undefined) {
			index = M.remember[M.dir] || 0;
			if (selectPath) {
				for (i = 0; i < items.length; i++) { if (items[i].path === selectPath) { index = i; break; } }
			}
		}
		var rel = M.dir.indexOf(M.root) === 0 ? M.dir.substring(M.root.length) : M.dir;
		crumb(T('Recordings') + (rel ? ' › ' + rel.replace(/\/$/, '').split('/').join(' › ') : '') +
			'  (' + (M.data.movies || []).length + ')' + (M.sortMode() === 'name' ? T('  · A–Z') : T('  · newest first')));
		Browser.setItems(items, index, T('No recordings in this folder'));
	},

	open: function (path, selectPath) {
		Views.movies.remember[Views.movies.dir] = Browser.list.index;
		Views.movies.load(path, selectPath);
	},

	up: function () {
		var M = Views.movies;
		var parent = M.dir.replace(/[^\/]+\/$/, '');
		M.open(parent, M.dir);
	},

	play: function (it) {
		var start = function (sec) {
			Player.onStopped = function () { Views.movies.render(Browser.list.index); };
			Player.play({
				title: it.title,
				sub: it.movie.servicename ? it.movie.servicename + ' · ' + U.fmtDate(it.movie.recordingtime, true) : '',
				url: Api.fileUrl(it.movie.filename),
				file: it.movie.filename,
				key: it.key,
				length: it.length,
				live: false,
				infoMeta: (it.movie.servicename ? it.movie.servicename + ' · ' : '') + U.fmtDate(it.movie.recordingtime, true) +
					(it.length ? T(' · duration ') + U.fmtTime(it.length) : ''),
				desc: it.desc
			}, sec);
		};
		var pos = Store.getPos(it.key);
		if (pos > 30) {
			Dialog.open(T('Resume?'), it.title, [
				{ label: T('Resume from ') + U.fmtTime(pos), fn: function () { start(Math.max(0, pos - 5)); } },
				{ label: T('From the start'), fn: function () { start(0); } }
			], 0);
		} else {
			start(0);
		}
	},

	remove: function (it) {
		Dialog.open(T('Delete the recording?'), it.title + ' (' + U.fmtDate(it.movie.recordingtime, true) + ')', [
			{ label: T('Cancel') },
			{
				label: T('Delete'), fn: function () {
					U.busy(true, T('Deleting…'));
					Api.deleteMovie(it.movie.serviceref, function (res) {
						U.busy(false);
						if (res && (res.result === true || res.result === 'True' || res.result === 'true')) {
							var list = Views.movies.data.movies || [], i;
							for (i = 0; i < list.length; i++) { if (list[i] === it.movie) { list.splice(i, 1); break; } }
							Store.setPos(it.key, 0);
							Views.movies.render(Math.min(Browser.list.index, Browser.list.items.length - 2));
							U.toast(T('Recording deleted'));
						} else {
							Dialog.alert(T('Delete failed'), (res && res.message) || T('Unknown error'));
						}
					}, function (err) { U.busy(false); Dialog.alert(T('Delete failed'), err); });
				}
			}
		], 0);
	},

	onKey: function (k) {
		var M = Views.movies, it = Browser.list.current();
		if (Browser.navKey(k)) { return true; }
		switch (k) {
			case tvKey.KEY_ENTER:
			case tvKey.KEY_PLAY:
				if (M.error || !M.data) { M.reset(); M.load(null); return true; }
				if (!it) { return true; }
				if (it.type === 'up') { M.up(); }
				else if (it.type === 'dir') { M.open(it.path); }
				else if (it.type === 'movie') { M.play(it); }
				return true;
			case tvKey.KEY_RED:
				if (it && it.type === 'movie') { M.remove(it); }
				return true;
			case tvKey.KEY_GREEN:
				Store.set('sort', M.sortMode() === 'date' ? 'name' : 'date');
				M.render(0);
				U.toast(M.sortMode() === 'name' ? T('Sort: by name') : T('Sort: newest first'), 1500);
				return true;
			case tvKey.KEY_YELLOW: App.go('channels'); return true;
			case tvKey.KEY_BLUE: App.go('settings'); return true;
			case tvKey.KEY_RETURN:
				if (M.data && M.dir !== M.root) { M.up(); return true; }
				return false; /* at the root RETURN leaves the app */
		}
		return false;
	}
};

/* ------------------------------------------------------------------ */
Views.channels = {
	mode: 'bouquets',
	bouquets: null,
	bouquet: null,
	services: null,
	bIndex: 0,
	epgTimer: null,

	enter: function () {
		U.show('browser', true);
		U.show('settings', false);
		footer(T('<span class="k k-ok">OK</span>Watch') +
			T('<span class="k k-yellow"></span>Guide') +
			T('<span class="k k-blue"></span>Settings') +
			T('<span class="k k-ret">RETURN</span>Back'));
		var C = Views.channels;
		if (C.mode === 'services' && C.services) { C.renderServices(Browser.list.index); }
		else if (C.bouquets) { C.renderBouquets(); }
		else { C.loadBouquets(); }
	},

	leave: function () { if (Views.channels.epgTimer) { clearInterval(Views.channels.epgTimer); Views.channels.epgTimer = null; } },

	loadBouquets: function () {
		var C = Views.channels;
		U.busy(true, T('Loading bouquets…'));
		Api.bouquets(function (data) {
			U.busy(false);
			C.bouquets = data.services || [];
			if (C.bouquets.length === 1) { C.openBouquet(C.bouquets[0]); }
			else { C.renderBouquets(); }
		}, function (err) {
			U.busy(false);
			crumb(T('Channels'));
			Browser.setItems([], 0, err);
		});
	},

	renderBouquets: function () {
		var C = Views.channels, items = [], i;
		C.mode = 'bouquets';
		C.leave();
		for (i = 0; i < C.bouquets.length; i++) {
			items.push({ type: 'bouquet', icon: '▸', cls: 'dir', title: C.bouquets[i].servicename, sub: T('Bouquet'), b: C.bouquets[i] });
		}
		crumb(T('Channels'));
		Browser.setItems(items, C.bIndex, T('No bouquets'));
	},

	openBouquet: function (b) {
		var C = Views.channels;
		C.bIndex = C.bouquets.length > 1 ? Browser.list.index : 0;
		C.bouquet = b;
		U.busy(true, T('Loading channels…'));
		Api.services(b.servicereference, function (data) {
			U.busy(false);
			var list = data.services || [], out = [], i;
			for (i = 0; i < list.length; i++) {
				var s = list[i], ref = s.servicereference || '';
				if (ref.indexOf('1:64:') === 0 || ref.indexOf('1:320:') === 0 || !ref) { continue; } /* markers */
				out.push(s);
			}
			C.services = out;
			C.now = {};
			C.mode = 'services';
			C.renderServices(0);
			C.loadEpg();
			C.leave();
			C.epgTimer = setInterval(C.loadEpg, 120000);
		}, function (err) { U.busy(false); Dialog.alert(T('Error'), err); });
	},

	loadEpg: function () {
		var C = Views.channels;
		if (!C.bouquet) { return; }
		Api.epgNow(C.bouquet.servicereference, function (data) {
			var ev = data.events || [], i;
			C.now = {};
			for (i = 0; i < ev.length; i++) { if (ev[i].sref) { C.now[ev[i].sref] = ev[i]; } }
			if (C.mode === 'services' && App.view === 'channels' && !Player.active) { C.renderServices(Browser.list.index); }
		}, function () { });
		Api.epgNext(C.bouquet.servicereference, function (data) {
			var ev = data.events || [], i;
			C.next = {};
			for (i = 0; i < ev.length; i++) { if (ev[i].sref) { C.next[ev[i].sref] = ev[i]; } }
		}, function () { });
	},

	serviceItem: function (s, n) {
		var ev = (Views.channels.now || {})[s.servicereference];
		var it = { type: 'service', icon: '' + n, s: s, title: s.servicename, sub: '', desc: '', meta: '' };
		if (ev && ev.title) {
			var now = new Date().getTime() / 1000, b = Number(ev.begin_timestamp) || 0, d = Number(ev.duration_sec) || 0;
			it.sub = ev.title;
			if (b && d) {
				it.right = U.pad(new Date(b * 1000).getHours()) + ':' + U.pad(new Date(b * 1000).getMinutes()) + '–' +
					U.pad(new Date((b + d) * 1000).getHours()) + ':' + U.pad(new Date((b + d) * 1000).getMinutes());
				it.progress = Math.max(0, Math.min(1, (now - b) / d));
			}
			it.meta = U.esc(ev.title) + (it.right ? '<br/>' + U.esc(it.right) : '');
			it.desc = ev.shortdesc || ev.longdesc || '';
			it.descHtml = U.descHtml(it.desc);
		}
		return it;
	},

	renderServices: function (index) {
		var C = Views.channels, items = [], i;
		for (i = 0; i < C.services.length; i++) { items.push(C.serviceItem(C.services[i], i + 1)); }
		crumb(T('Channels › ') + (C.bouquet ? C.bouquet.servicename : ''));
		Browser.setItems(items, index, T('No channels in this bouquet'));
	},

	useProxy: true,      /* live through the box relay (subtitles); off if the relay does not work */

	play: function (it) {
		var ev = (Views.channels.now || {})[it.s.servicereference];
		var id = 'tv' + new Date().getTime();
		Player.onStopped = function () { Views.channels.renderServices(Browser.list.index); };
		Player.play({
			title: it.s.servicename,
			sub: ev && ev.title ? ev.title : '',
			url: Views.channels.useProxy ? Api.liveUrl(id, it.s.servicereference) : Api.streamUrl(it.s.servicereference),
			directUrl: Api.streamUrl(it.s.servicereference),
			liveId: Views.channels.useProxy ? id : null,
			sref: it.s.servicereference,
			live: true,
			length: 0
		}, 0);
	},

	/* channel change during playback */
	zap: function (d) {
		var C = Views.channels;
		if (C.mode !== 'services' || !C.services || !C.services.length) { return; }
		Browser.list.move(d);
		var it = Browser.list.current();
		if (it) { Player.active = false; C.play(it); }
	},

	onKey: function (k) {
		var C = Views.channels, it = Browser.list.current();
		if (Browser.navKey(k)) { return true; }
		switch (k) {
			case tvKey.KEY_ENTER:
			case tvKey.KEY_PLAY:
				if (!it) { if (!C.bouquets) { C.loadBouquets(); } return true; }
				if (it.type === 'bouquet') { C.openBouquet(it.b); }
				else if (it.type === 'service') { C.play(it); }
				return true;
			case tvKey.KEY_YELLOW: App.go('epg'); return true;
			case tvKey.KEY_BLUE: App.go('settings'); return true;
			case tvKey.KEY_RETURN:
				if (C.mode === 'services' && C.bouquets && C.bouquets.length > 1) { C.renderBouquets(); }
				else { App.go('movies'); }
				return true;
		}
		return false;
	}
};

/* ------------------------------------------------------------------ */
Views.settings = {
	fields: [],
	index: 0,
	fresh: true,
	back: 'movies',

	enter: function (from) {
		var S = Views.settings;
		S.back = from && from !== 'settings' ? from : 'movies';
		U.show('browser', false);
		U.show('settings', true);
		crumb(T('Settings'));
		footer('');
		S.parse(Api.host);
		S.index = 0;
		S.fresh = true;
		S.render();
	},

	parse: function (host) {
		var hp = String(host || '').split(':'), ip = hp[0].split('.'), i;
		Views.settings.fields = [];
		for (i = 0; i < 4; i++) { Views.settings.fields.push(ip[i] && !isNaN(parseInt(ip[i], 10)) ? String(parseInt(ip[i], 10)) : '0'); }
		Views.settings.fields.push(hp[1] ? String(parseInt(hp[1], 10) || 80) : '80');
	},

	value: function () {
		var f = Views.settings.fields;
		var host = f[0] + '.' + f[1] + '.' + f[2] + '.' + f[3];
		return f[4] && f[4] !== '80' ? host + ':' + f[4] : host;
	},

	render: function () {
		var S = Views.settings, html = [], i;
		for (i = 0; i < 5; i++) {
			if (i === 4) { html.push('<span class="dot">:</span>'); }
			html.push('<span class="fld' + (i === S.index ? ' sel' : '') + '">' + U.esc(S.fields[i]) + '</span>');
			if (i < 3) { html.push('<span class="dot">.</span>'); }
		}
		html.push(T('<span class="fld-label">port</span>'));
		U.$('s-fields').innerHTML = html.join('');
		var def = Api.defaultHost();
		U.$('s-info').innerHTML = T('Current: <b>') + U.esc(Api.host || '-') + '</b><br/>' +
			T('Installed from the box: ') + U.esc(def || '-') + '<br/>' +
			T('Screen size: <b>') + U.esc(Screen.label()) + T('</b> (TV reports a width of ') + (Screen.detected || '?') + T(' px, scale ') + Screen.scale.toFixed(2) + ')<br/>' +
			T('App ') + U.esc(typeof BOX_PLUGIN_VERSION !== 'undefined' ? BOX_PLUGIN_VERSION : '?');
	},

	digit: function (d) {
		var S = Views.settings, max = S.index === 4 ? 5 : 3;
		var cur = S.fresh ? '' : S.fields[S.index];
		if (cur === '0') { cur = ''; }
		if (cur.length >= max) { cur = ''; }
		cur += d;
		if (S.index < 4 && parseInt(cur, 10) > 255) { cur = '' + d; }
		S.fields[S.index] = cur;
		S.fresh = false;
		if (S.index < 3 && (cur.length === 3 || parseInt(cur + '0', 10) > 255)) { S.index++; S.fresh = true; }
		S.render();
	},

	step: function (d) {
		var S = Views.settings, max = S.index === 4 ? 65535 : 255;
		var v = (parseInt(S.fields[S.index], 10) || 0) + d;
		if (v < 0) { v = max; }
		if (v > max) { v = 0; }
		S.fields[S.index] = String(v);
		S.fresh = true;
		S.render();
	},

	save: function () {
		var S = Views.settings, host = S.value();
		U.busy(true, T('Testing ') + host + '…');
		var old = Api.host;
		Api.host = host;
		Api.status(function () {
			U.busy(false);
			Store.set('host', host === Api.defaultHost() ? '' : host);
			U.toast(T('Connection works: ') + host);
			Views.movies.reset();
			Views.channels.bouquets = null; Views.channels.services = null; Views.channels.mode = 'bouquets';
			App.refreshStatus();
			App.go('movies');
		}, function (err) {
			U.busy(false);
			Dialog.open(T('No connection'), err + T('. Save anyway?'), [
				{ label: T('Save'), fn: function () { Store.set('host', host); Views.movies.reset(); App.go('movies'); } },
				{ label: T('Fix'), fn: function () { Api.host = old; } }
			], 1, function () { Api.host = old; });
		});
	},

	onKey: function (k) {
		var S = Views.settings, i;
		for (i = 0; i <= 9; i++) {
			if (k === tvKey['KEY_' + i]) { S.digit(String(i)); return true; }
		}
		switch (k) {
			case tvKey.KEY_LEFT: S.index = (S.index + 4) % 5; S.fresh = true; S.render(); return true;
			case tvKey.KEY_RIGHT: S.index = (S.index + 1) % 5; S.fresh = true; S.render(); return true;
			case tvKey.KEY_UP: S.step(1); return true;
			case tvKey.KEY_DOWN: S.step(-1); return true;
			case tvKey.KEY_ENTER: S.save(); return true;
			case tvKey.KEY_RED: S.parse(Api.defaultHost()); S.fresh = true; S.render(); return true;
			case tvKey.KEY_GREEN: Screen.cycle(); S.render(); U.toast(T('Screen size: ') + Screen.label(), 2000); return true;
			case tvKey.KEY_RETURN: App.go(S.back); return true;
		}
		return false;
	}
};

/* ------------------------------------------------------------------ */
/* Programme guide: channels as rows, time from left to right (2.5 h at a time).
   The events of each visible channel are loaded lazily with /api/epgservice.
   The DOM is created here, because the Tizen index.html comes from the installed package. */
Views.epg = {
	ROWS: 8,
	ROW_H: 46,
	CHAN_W: 210,
	WIDTH: 1184,
	SPAN: 9000,          /* seconds shown at a time */
	bouquet: null,
	services: null,
	ev: {},              /* sref -> {list: [...], time: loaded at} */
	loading: {},
	queue: [],
	active: 0,
	row: 0,
	top: 0,
	t0: 0,
	selTime: 0,
	timer: null,
	timers: [],          /* [{sref, begin, end, eit}] from the box */

	now: function () { return Math.floor(new Date().getTime() / 1000); },
	floor30: function (t) { return t - (t % 1800); },
	ppm: function () { var E = Views.epg; return (E.WIDTH - E.CHAN_W) / (E.SPAN / 60); },

	build: function () {
		if (U.$('epg')) { return; }
		var d = document.createElement('div');
		d.id = 'epg';
		d.innerHTML = '<div id="epg-head"></div><div id="epg-grid"></div><div id="epg-info"><div id="epg-i-title"></div>' +
			'<div id="epg-i-meta"></div><div id="epg-i-desc"></div></div>';
		U.$('app').insertBefore(d, U.$('footer'));
	},

	enter: function () {
		var E = Views.epg;
		E.build();
		U.show('browser', false);
		U.show('settings', false);
		U.show('epg', true);
		footer(T('<span class="k k-ok">OK</span>Watch / info') +
			T('<span class="k k-red"></span>Timer') +
			T('<span class="k k-yellow"></span>Recordings') +
			T('<span class="k k-blue"></span>Settings') +
			T('<span class="k k-ret">RETURN</span>Channels') +
			' &nbsp; ' + T('◀◀▶▶ ±2 h'));
		var now = E.now();
		if (!E.t0 || E.t0 + E.SPAN < now) { E.t0 = E.floor30(now); E.selTime = now; }
		E.pickBouquet();
		E.loadTimers();
		if (E.timer) { clearInterval(E.timer); }
		E.timer = setInterval(function () { if (App.view === 'epg' && !Player.active) { E.render(); } }, 60000);
	},

	leave: function () {
		var E = Views.epg;
		if (E.timer) { clearInterval(E.timer); E.timer = null; }
		U.show('epg', false);
	},

	/* the bouquet open in the channel list, otherwise the one used last, otherwise the first */
	pickBouquet: function () {
		var E = Views.epg, C = Views.channels;
		if (C.bouquet && C.services && (!E.bouquet || E.bouquet.servicereference !== C.bouquet.servicereference)) {
			E.setServices(C.bouquet, C.services);
			return;
		}
		if (E.services) { E.render(); return; }
		U.busy(true, T('Loading the guide…'));
		Api.bouquets(function (data) {
			var list = data.services || [], want = Store.get('epgBouquet', ''), b = list[0], i;
			for (i = 0; i < list.length; i++) { if (list[i].servicereference === want) { b = list[i]; } }
			if (!b) { U.busy(false); E.render(); return; }
			Api.services(b.servicereference, function (sd) {
				U.busy(false);
				var l = sd.services || [], out = [];
				for (i = 0; i < l.length; i++) {
					var ref = l[i].servicereference || '';
					if (!ref || ref.indexOf('1:64:') === 0 || ref.indexOf('1:320:') === 0) { continue; }
					out.push(l[i]);
				}
				E.setServices(b, out);
			}, function (err) { U.busy(false); Dialog.alert(T('Error'), err); });
		}, function (err) { U.busy(false); Dialog.alert(T('Error'), err); });
	},

	setServices: function (b, services) {
		var E = Views.epg;
		E.bouquet = b;
		E.services = services;
		E.row = 0;
		E.top = 0;
		Store.set('epgBouquet', b.servicereference);
		E.render();
	},

	events: function (sref) {
		var E = Views.epg, c = E.ev[sref];
		if (c && E.now() - c.time < 1800) { return c.list; }
		if (!E.loading[sref]) { E.loading[sref] = true; E.queue.push(sref); }
		return c ? c.list : null;   /* render() starts the requests when it is done */
	},

	/* at most two requests at a time, the rows on the screen first */
	pump: function () {
		var E = Views.epg;
		while (E.active < 2 && E.queue.length) {
			var sref = E.queue.shift();
			E.active++;
			(function (s) {
				Api.epgService(s, function (data) {
					var ev = data.events || [], list = [], i;
					for (i = 0; i < ev.length; i++) {
						var b = Number(ev[i].begin_timestamp) || 0, d = Number(ev[i].duration_sec) || 0;
						if (b && d && ev[i].title) {
							list.push({ b: b, e: b + d, id: ev[i].id, title: ev[i].title, sub: ev[i].shortdesc || '', desc: ev[i].longdesc || '' });
						}
					}
					list.sort(function (x, y) { return x.b - y.b; });
					E.ev[s] = { list: list, time: E.now() };
					E.done(s);
				}, function () { E.ev[s] = { list: [], time: E.now() - 1500 }; E.done(s); });
			})(sref);
		}
	},

	done: function (s) {
		var E = Views.epg;
		E.loading[s] = false;
		E.active--;
		E.pump();
		if (App.view === 'epg' && !Player.active) { E.render(); }
	},

	/* the event of a row at time t, or the next one after it */
	eventAt: function (list, t) {
		if (!list) { return -1; }
		for (var i = 0; i < list.length; i++) { if (list[i].e > t) { return i; } }
		return -1;
	},

	hm: function (t) { var d = new Date(t * 1000); return U.pad(d.getHours()) + ':' + U.pad(d.getMinutes()); },

	render: function () {
		var E = Views.epg;
		if (!U.$('epg')) { return; }
		if (!E.services || !E.services.length) {
			crumb(T('Programme guide'));
			U.$('epg-head').innerHTML = '';
			U.$('epg-grid').innerHTML = '<div class="epg-empty">' + U.esc(T('No channels in this bouquet')) + '</div>';
			return;
		}
		crumb(T('Programme guide') + ' › ' + (E.bouquet ? E.bouquet.servicename : ''));
		var ppm = E.ppm(), t0 = E.t0, t1 = t0 + E.SPAN, now = E.now(), h = [], g = [], i, r;
		for (var t = t0; t < t1; t += 1800) {
			h.push('<div class="epg-tick" style="left:' + Math.round(E.CHAN_W + (t - t0) / 60 * ppm) + 'px">' + E.hm(t) + '</div>');
		}
		if (E.floor30(t0) !== E.floor30(now)) { h.push('<div class="epg-day">' + U.esc(U.fmtDate(t0).split(' ')[0]) + '</div>'); }
		U.$('epg-head').innerHTML = h.join('');
		var sel = null;
		for (r = 0; r < E.ROWS && E.top + r < E.services.length; r++) {
			var idx = E.top + r, s = E.services[idx], list = E.events(s.servicereference), y = r * E.ROW_H;
			var cur = idx === E.row ? E.eventAt(list, E.selTime) : -2;
			g.push('<div class="epg-ch' + (idx === E.row ? ' sel' : '') + '" style="top:' + y + 'px">' +
				'<span class="n">' + (idx + 1) + '</span>' + U.esc(s.servicename) + '</div>');
			if (!list) {
				g.push('<div class="epg-ev wait" style="top:' + y + 'px;left:' + E.CHAN_W + 'px;width:' + (E.WIDTH - E.CHAN_W - 2) + 'px">…</div>');
				continue;
			}
			var any = false;
			for (i = 0; i < list.length; i++) {
				var ev = list[i];
				if (ev.e <= t0 || ev.b >= t1) { continue; }
				any = true;
				var x = E.CHAN_W + (Math.max(ev.b, t0) - t0) / 60 * ppm, w = (Math.min(ev.e, t1) - Math.max(ev.b, t0)) / 60 * ppm - 2;
				var rec = E.timerOf(s.servicereference, ev);
				var cls = 'epg-ev' + (i === cur ? ' sel' : '') + (ev.b <= now && now < ev.e ? ' now' : '') + (rec ? ' rec' : '');
				if (i === cur) { sel = ev; }
				g.push('<div class="' + cls + '" style="top:' + y + 'px;left:' + Math.round(x) + 'px;width:' + Math.max(2, Math.round(w)) + 'px">' +
					(w > 24 ? (rec ? '<span class="dot">●</span> ' : '') + U.esc(ev.title) : '') + '</div>');
			}
			if (cur >= 0 && !sel) { sel = list[cur]; }
			if (!any) {
				g.push('<div class="epg-ev none' + (idx === E.row ? ' sel' : '') + '" style="top:' + y + 'px;left:' + E.CHAN_W + 'px;width:' + (E.WIDTH - E.CHAN_W - 2) + 'px">' +
					U.esc(T('No programme information')) + '</div>');
			}
		}
		if (now >= t0 && now < t1) {
			g.push('<div class="epg-nowline" style="left:' + Math.round(E.CHAN_W + (now - t0) / 60 * ppm) + 'px;height:' + (r * E.ROW_H) + 'px"></div>');
		}
		U.$('epg-grid').innerHTML = g.join('');
		E.sel = sel;
		var s0 = E.services[E.row];
		if (sel) {
			U.$('epg-i-title').innerHTML = U.esc(sel.title);
			U.$('epg-i-meta').innerHTML = (E.timerOf(s0.servicereference, sel) ? '<span class="rec">● ' + U.esc(T('Timer set')) + '</span> &nbsp; ' : '') +
				U.esc(s0.servicename + ' · ' + U.fmtDate(sel.b).split(' ')[0] + ' ' + E.hm(sel.b) + '–' + E.hm(sel.e) +
				' · ' + Math.round((sel.e - sel.b) / 60) + ' min');
			U.$('epg-i-desc').innerHTML = U.esc(sel.sub && sel.desc && sel.desc.indexOf(sel.sub) < 0 ? sel.sub + ' – ' + sel.desc : (sel.desc || sel.sub));
		} else {
			U.$('epg-i-title').innerHTML = U.esc(s0.servicename);
			U.$('epg-i-meta').innerHTML = '';
			U.$('epg-i-desc').innerHTML = '';
		}
		/* preload the rows just below the screen */
		for (i = E.top + E.ROWS; i < Math.min(E.services.length, E.top + E.ROWS + 4); i++) { E.events(E.services[i].servicereference); }
		E.pump();
	},

	setRow: function (r) {
		var E = Views.epg, n = E.services ? E.services.length : 0;
		if (!n) { return; }
		E.row = Math.max(0, Math.min(n - 1, r));
		if (E.row < E.top) { E.top = E.row; }
		if (E.row >= E.top + E.ROWS) { E.top = E.row - E.ROWS + 1; }
		E.render();
	},

	/* keeps the selected time on the screen */
	follow: function () {
		var E = Views.epg, min = E.floor30(E.now());
		if (E.selTime < E.t0) { E.t0 = Math.max(min, E.floor30(E.selTime)); }
		if (E.selTime >= E.t0 + E.SPAN - 900) { E.t0 = E.floor30(E.selTime) - 1800; }
		if (E.t0 < min) { E.t0 = min; }
	},

	step: function (d) {
		var E = Views.epg, list = E.ev[(E.services[E.row] || {}).servicereference];
		list = list ? list.list : null;
		var i = E.eventAt(list, E.selTime);
		if (i < 0 || !list.length) { E.selTime = Math.max(E.now(), E.selTime + d * 1800); }
		else if (d > 0) { if (i + 1 < list.length) { E.selTime = list[i + 1].b; } else { return; } }
		else {
			if (list[i].b > E.selTime && i > 0) { i--; }
			if (i > 0 && list[i].b <= E.selTime) { E.selTime = Math.max(E.now(), list[i - 1].b); }
			else { return; }
		}
		E.follow();
		E.render();
	},

	shift: function (sec) {
		var E = Views.epg, min = E.floor30(E.now());
		var t = Math.max(min, E.t0 + sec);
		E.selTime = Math.max(E.now(), E.selTime + (t - E.t0));
		E.t0 = t;
		E.render();
	},

	watch: function () {
		var E = Views.epg, C = Views.channels, s = E.services[E.row];
		if (!s) { return; }
		/* the channel list follows the guide, so CH +/- works during playback */
		C.bouquet = E.bouquet;
		C.services = E.services;
		C.mode = 'services';
		/* now/next for the INFO panel: what the guide already knows at once, the box's view right after */
		var now = E.now(), i, k;
		C.now = {};
		C.next = {};
		for (i = 0; i < E.services.length; i++) {
			var ref = E.services[i].servicereference, c = E.ev[ref], l = c ? c.list : [];
			for (k = 0; k < l.length; k++) {
				if (l[k].b <= now && now < l[k].e) {
					C.now[ref] = { sref: ref, title: l[k].title, begin_timestamp: l[k].b, duration_sec: l[k].e - l[k].b, shortdesc: l[k].sub, longdesc: l[k].desc };
					if (l[k + 1]) { C.next[ref] = { sref: ref, title: l[k + 1].title, begin_timestamp: l[k + 1].b }; }
				}
			}
		}
		C.loadEpg();
		if (C.epgTimer) { clearInterval(C.epgTimer); }
		C.epgTimer = setInterval(C.loadEpg, 120000);
		C.renderServices(E.row);
		C.play(Browser.list.current());
		Player.onStopped = function () { if (App.view === 'epg') { E.row = Browser.list.index; E.setRow(E.row); } };
	},

	info: function () {
		var E = Views.epg, ev = E.sel, s = E.services && E.services[E.row];
		if (!s) { return; }
		if (!ev) { E.watch(); return; }
		var now = E.now(), rec = E.timerOf(s.servicereference, ev);
		Dialog.open(ev.title, U.esc(E.hm(ev.b) + '–' + E.hm(ev.e) + ' · ' + s.servicename) +
			(rec ? ' &nbsp; <span class="rec">● ' + U.esc(T('Timer set')) + '</span>' : '') + '<br/><br/>' +
			U.esc(ev.sub && ev.desc && ev.desc.indexOf(ev.sub) < 0 ? ev.sub + ' – ' + ev.desc : (ev.desc || ev.sub)),
			[{ label: T('Watch channel'), fn: function () { E.watch(); } },
				{ label: rec ? T('Delete timer') : T('Record'), fn: function () { E.toggleTimer(); } },
				{ label: T('Close'), fn: function () { } }],
			ev.b <= now ? 0 : 1);
	},

	/* ---- timers ---- */
	refKey: function (r) { return String(r || '').split(':').slice(0, 10).join(':').toUpperCase(); },

	loadTimers: function () {
		var E = Views.epg;
		Api.timerList(function (data) {
			var t = data.timers || [], out = [], i;
			for (i = 0; i < t.length; i++) {
				out.push({ sref: t[i].serviceref, begin: Number(t[i].begin) || 0, end: Number(t[i].end) || 0, eit: t[i].eit });
			}
			E.timers = out;
			if (App.view === 'epg' && !Player.active) { E.render(); }
		}, function () { });
	},

	/* the timer that records this programme: the same event id, or a timer covering most of it */
	timerOf: function (sref, ev) {
		var E = Views.epg, key = E.refKey(sref), i, t;
		for (i = 0; i < E.timers.length; i++) {
			t = E.timers[i];
			if (E.refKey(t.sref) !== key) { continue; }
			if (ev.id !== undefined && t.eit !== undefined && String(t.eit) === String(ev.id)) { return t; }
			if (Math.min(t.end, ev.e) - Math.max(t.begin, ev.b) > (ev.e - ev.b) / 2) { return t; }
		}
		return null;
	},

	toggleTimer: function () {
		var E = Views.epg, ev = E.sel, s = E.services && E.services[E.row];
		if (!ev || !s) { return; }
		var t = E.timerOf(s.servicereference, ev);
		var done = function (data) {
			if (data && data.result === false) { Dialog.alert(T('Timer'), U.esc(data.message || T('Unknown error'))); }
			else { U.toast(t ? T('Timer deleted') : T('Timer added') + ': ' + ev.title, 2500); }
			E.loadTimers();
		};
		var fail = function (err) { Dialog.alert(T('Timer'), U.esc(err)); };
		if (t) { Api.timerDelete(t.sref, t.begin, t.end, done, fail); }
		else if (ev.e <= E.now()) { return; }
		else if (ev.id === undefined || ev.id === null) { Dialog.alert(T('Timer'), U.esc(T('This programme cannot be recorded (no event id).'))); }
		else { Api.timerAdd(s.servicereference, ev.id, done, fail); }
	},

	onKey: function (k) {
		var E = Views.epg, ev = E.sel, now = E.now();
		switch (k) {
			case tvKey.KEY_UP: E.setRow(E.row - 1); return true;
			case tvKey.KEY_DOWN: E.setRow(E.row + 1); return true;
			case tvKey.KEY_CH_UP: E.setRow(E.row - E.ROWS); return true;
			case tvKey.KEY_CH_DOWN: E.setRow(E.row + E.ROWS); return true;
			case tvKey.KEY_LEFT: E.step(-1); return true;
			case tvKey.KEY_RIGHT: E.step(1); return true;
			case tvKey.KEY_RW: E.shift(-7200); return true;
			case tvKey.KEY_FF: E.shift(7200); return true;
			case tvKey.KEY_ENTER:
			case tvKey.KEY_PLAY:
				if (!ev || (ev.b <= now && now < ev.e)) { E.watch(); } else { E.info(); }
				return true;
			case tvKey.KEY_INFO: E.info(); return true;
			case tvKey.KEY_RED:
			case tvKey.KEY_REC: E.toggleTimer(); return true;
			case tvKey.KEY_YELLOW: App.go('movies'); return true;
			case tvKey.KEY_BLUE: App.go('settings'); return true;
			case tvKey.KEY_RETURN: App.go('channels'); return true;
		}
		return false;
	}
};
