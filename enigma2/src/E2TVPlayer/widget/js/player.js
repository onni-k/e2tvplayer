/* SPDX-License-Identifier: GPL-3.0-or-later | Copyright (C) 2026 E2TVPlayer contributors */
/* Playback with the Orsay SAMSUNG-INFOLINK-PLAYER plugin (2011-2014 TVs; emulated on Tizen).
   Callbacks are given as strings, so they must be global. */
var Player = {
	plugin: null,
	item: null,          /* { title, sub, url, key, length, live, sref } */
	active: false,
	paused: false,
	buffering: false,
	pos: 0,              /* in seconds */
	dur: 0,
	startSec: 0,
	offset: null,        /* offset of the TS stream timestamps, see onTime */
	lastSaved: 0,
	osdTimer: null,
	onStopped: null,

	init: function () {
		Player.plugin = U.$('pluginPlayer');
		var p = Player.plugin;
		if (!p) { return; }
		try {
			p.OnCurrentPlayTime = 'Player.onTime';
			p.OnStreamInfoReady = 'Player.onInfo';
			p.OnBufferingStart = 'Player.onBufStart';
			p.OnBufferingProgress = 'Player.onBufProgress';
			p.OnBufferingComplete = 'Player.onBufDone';
			p.OnRenderingComplete = 'Player.onEnd';
			p.OnConnectionFailed = 'Player.onConnFailed';
			p.OnNetworkDisconnected = 'Player.onNetLost';
			p.OnStreamNotFound = 'Player.onNotFound';
			p.OnRenderError = 'Player.onRenderError';
			p.OnSubtitle = 'Player.onSubtitle';
		} catch (e) { U.log('player init: ' + e); }
	},

	play: function (item, startSec) {
		var p = Player.plugin;
		Player.item = item;
		Player.active = true;
		Player.paused = false;
		Player.buffering = true;
		Player.startSec = startSec || 0;
		Player.pos = Player.startSec;
		Player.dur = item.length || 0;
		Player.offset = null;
		Player.lastSaved = Player.pos;
		Player.posAt = new Date().getTime();
		Player.resetPanels();
		Subs.start(item);
		if (!Player.ticker) { Player.ticker = setInterval(Player.tick, 250); }
		document.body.className = 'playing';
		Player.showOsd(true);
		Player.setState(T('Buffering…'));
		try { U.$('pluginTVMW').SetMediaSource(); } catch (e0) { }
		try { pluginAPI.setOffScreenSaver(); } catch (e1) { }
		var ok = false;
		try {
			p.Stop();
			/* the Player plugin always uses 960x540 coordinates */
			p.SetDisplayArea(0, 0, 960, 540);
			if (p.InitPlayer(item.url)) {
				ok = p.StartPlayback(Player.startSec);
			}
			if (!ok) {
				ok = p.Play(item.url);
				if (ok && Player.startSec > 5) {
					var s = Player.startSec;
					setTimeout(function () { try { p.JumpForward(s); } catch (e) { } }, 3000);
				}
			}
		} catch (e2) {
			U.log('play failed: ' + e2);
			ok = false;
		}
		if (!ok) {
			Player.fail(T('Playback did not start'));
		}
	},

	stop: function () {
		if (!Player.active) { return; }
		Player.savePos(true);
		Player.active = false;
		try { Player.plugin.Stop(); } catch (e) { }
		try { pluginAPI.setOnScreenSaver(); } catch (e1) { }
		if (Player.osdTimer) { clearTimeout(Player.osdTimer); Player.osdTimer = null; }
		U.show('osd', false);
		Player.resetPanels();
		Subs.stop();
		if (Player.ticker) { clearInterval(Player.ticker); Player.ticker = null; }
		document.body.className = '';
		if (Player.onStopped) { Player.onStopped(Player.item); }
		if (I18n.pending) { setTimeout(function () { I18n.applyIfIdle(); }, 50); }
	},

	fail: function (msg) {
		var it = Player.item;
		/* live through the box relay failed: try once directly from the stream server */
		if (it && it.live && it.liveId && it.directUrl && !it.retried && Player.pos < 1) {
			Player.active = false;
			Views.channels.useProxy = false;
			U.toast(T('Relay failed – playing directly (no subtitles)'), 4000);
			it.retried = true;
			it.url = it.directUrl;
			it.liveId = null;
			Player.play(it, 0);
			return;
		}
		Player.stop();
		var hint = it && it.live ?
			T('Check that streaming (port 8001) is enabled on the box and a tuner is free.') :
			T('The TV may not support the recording\'s format (e.g. subtitle or audio format), or the connection was lost.');
		Dialog.alert(T('Playback error'), msg + '. ' + hint);
	},

	togglePause: function () {
		if (!Player.active || Player.item.live) { Player.showOsd(); return; }
		try {
			if (Player.paused) { Player.plugin.Resume(); Player.paused = false; Player.setState(''); }
			else { Player.plugin.Pause(); Player.paused = true; Player.setState(T('❚❚ Paused')); Player.savePos(true); }
		} catch (e) { }
		Player.showOsd(Player.paused);
	},

	jump: function (sec) {
		if (!Player.active || Player.item.live) { return; }
		if (Player.buffering) { U.toast(T('Please wait - buffering')); return; }
		var target = Player.pos + sec;
		if (Player.dur > 0) { target = Math.min(target, Player.dur - 5); }
		target = Math.max(0, target);
		var d = Math.round(target - Player.pos);
		if (!d) { return; }
		try {
			if (Player.paused) { Player.plugin.Resume(); Player.paused = false; }
			if (d > 0) { Player.plugin.JumpForward(d); } else { Player.plugin.JumpBackward(-d); }
			Player.pos = target;
			Player.posAt = new Date().getTime();
			Subs.hide();
			Player.setState(d > 0 ? '▶▶ +' + U.fmtTime(d) : '◀◀ -' + U.fmtTime(-d));
			Player.updateOsd();
		} catch (e) { }
		Player.showOsd();
	},

	savePos: function (force) {
		var it = Player.item;
		if (!it || it.live || !it.key) { return; }
		if (!force && Math.abs(Player.pos - Player.lastSaved) < 30) { return; }
		Player.lastSaved = Player.pos;
		var nearEnd = Player.dur > 0 && Player.pos > Player.dur - 90;
		Store.setPos(it.key, (nearEnd || Player.pos < 30) ? 0 : Player.pos);
	},

	/* Estimated playback position for subtitles: the plugin reports the time only now and
	   then, so the time in between is taken from the clock. */
	posAt: 0,
	ticker: null,
	estimate: function () {
		if (!Player.active || Player.paused || Player.buffering) { return Player.pos; }
		return Player.pos + Math.min(2, Math.max(0, (new Date().getTime() - Player.posAt) / 1000));
	},
	tick: function () {
		if (!Player.active || !Player.item) { return; }
		Subs.update(Player.estimate());
	},

	/* --- OSD --- */
	setState: function (s) { U.$('osd-state').innerHTML = U.esc(s); },

	updateOsd: function () {
		var it = Player.item;
		if (!it) { return; }
		U.$('osd-title').innerHTML = U.esc(it.title);
		U.$('osd-sub').innerHTML = U.esc(it.sub || '');
		if (it.live) {
			var ev = (Views.channels.now || {})[it.sref], b = ev ? Number(ev.begin_timestamp) : 0, d = ev ? Number(ev.duration_sec) : 0;
			var now = new Date().getTime() / 1000;
			U.$('osd-time').innerHTML = b && d ? T('LIVE ') + Player.hm(b) + '–' + Player.hm(b + d) : T('LIVE');
			U.$('osd-fill').style.width = b && d ? Math.max(0, Math.min(100, 100 * (now - b) / d)).toFixed(1) + '%' : '100%';
			if (ev && ev.title) { U.$('osd-sub').innerHTML = U.esc(ev.title); }
			U.$('osd-keys').innerHTML = T('CH +/- or ▲▼ channel &nbsp; INFO programme info &nbsp; TOOLS audio/subtitles &nbsp; RETURN stop');
		} else {
			var pct = Player.dur > 0 ? Math.min(100, 100 * Player.pos / Player.dur) : 0;
			U.$('osd-fill').style.width = pct.toFixed(1) + '%';
			U.$('osd-time').innerHTML = U.fmtTime(Player.pos) + (Player.dur ? ' / ' + U.fmtTime(Player.dur) : '');
			U.$('osd-keys').innerHTML = T('◀▶ 15 s &nbsp; ▲▼ 5 min &nbsp; ◀◀▶▶ 1 min &nbsp; OK pause &nbsp; INFO info &nbsp; TOOLS audio/subtitles &nbsp; RETURN stop');
		}
	},

	showOsd: function (sticky) {
		Player.updateOsd();
		U.show('osd', true);
		if (Player.osdTimer) { clearTimeout(Player.osdTimer); Player.osdTimer = null; }
		if (!sticky && !Player.paused) {
			Player.osdTimer = setTimeout(function () {
				if (!Player.paused && !Player.buffering && !Player.infoOpen()) { U.show('osd', false); }
			}, 5000);
		}
	},

	/* --- plugin callbacks --- */
	onTime: function (ms) {
		var t = Number(ms) / 1000;
		if (isNaN(t)) { return; }
		/* Some TS streams report the time from the PTS. If the first value is far from
		   the expected one, the difference is stored and subtracted from then on. */
		if (Player.offset === null) {
			Player.offset = Math.abs(t - Player.startSec) > 600 ? t - Player.startSec : 0;
		}
		t -= Player.offset;
		if (t < 0) { t = 0; }
		Player.pos = t;
		Player.posAt = new Date().getTime();
		if (Player.buffering) { Player.buffering = false; Player.setState(''); }
		Player.tick();
		if (U.$('osd').style.display === 'block') { Player.updateOsd(); }
		Player.savePos(false);
	},

	onInfo: function () {
		try {
			Player.plugin.SetDisplayArea(0, 0, 960, 540);
			var d = Number(Player.plugin.GetDuration()) / 1000;
			var listed = Player.item ? (Player.item.length || 0) : 0;
			if (d > 0 && (!listed || (d > listed * 0.5 && d < listed * 2))) { Player.dur = d; }
		} catch (e) { }
		Player.readStreams();
		Player.updateOsd();
	},

	onBufStart: function () { Player.buffering = true; Player.setState(T('Buffering…')); Player.showOsd(true); },
	onBufProgress: function (pct) { if (Player.buffering) { Player.setState(T('Buffering ') + (pct || 0) + ' %'); } },
	onBufDone: function () { Player.buffering = false; Player.setState(Player.paused ? T('❚❚ Paused') : ''); Player.showOsd(); },
	onEnd: function () {
		if (Player.item && !Player.item.live) {
			Store.setPos(Player.item.key, 0);
			Player.item.key = null;      /* so that stop() does not save the end position */
			Player.stop();
			U.toast(T('Recording watched to the end'));
		} else {
			Player.fail(T('Broadcast interrupted'));
		}
	},
	onConnFailed: function () { Player.fail(T('Connection to the box failed')); },
	onNetLost: function () { Player.fail(T('Network connection lost')); },
	onNotFound: function () { Player.fail(T('File not found')); },
	onRenderError: function (code) { Player.fail(T('Playback error (code ') + code + ')'); },

	/* --- INFO panel: programme info and progress --- */
	infoOpen: function () { return U.$('info').style.display === 'block'; },

	showInfo: function () {
		Player.renderInfo();
		U.show('info', true);
		Player.showOsd(true);
	},

	hideInfo: function () {
		U.show('info', false);
		Player.showOsd();
	},

	renderInfo: function () {
		var it = Player.item;
		if (!it) { return; }
		var title = it.title, meta = it.infoMeta || '', desc = it.desc || '', next = '';
		if (it.live) {
			var C = Views.channels;
			var ev = (C.now || {})[it.sref], nx = (C.next || {})[it.sref];
			meta = it.title;
			if (ev && ev.title) {
				var b = Number(ev.begin_timestamp) || 0, d = Number(ev.duration_sec) || 0;
				title = ev.title;
				if (b && d) {
					var now = new Date().getTime() / 1000;
					meta += ' · ' + Player.hm(b) + '–' + Player.hm(b + d) +
						T(' · remaining ') + Math.max(0, Math.round((b + d - now) / 60)) + ' min';
					U.$('osd-fill').style.width = Math.max(0, Math.min(100, 100 * (now - b) / d)).toFixed(1) + '%';
				}
				desc = ev.longdesc || ev.shortdesc || '';
				if (ev.shortdesc && ev.longdesc && ev.longdesc.indexOf(ev.shortdesc) < 0) { desc = ev.shortdesc + '\n' + ev.longdesc; }
			}
			if (nx && nx.title) {
				next = T('Next ') + (nx.begin_timestamp ? Player.hm(Number(nx.begin_timestamp)) + ' ' : '') + nx.title;
			}
		}
		U.$('i-title').innerHTML = U.esc(title);
		U.$('i-meta').innerHTML = U.esc(meta);
		U.$('i-desc').innerHTML = U.descHtml(desc) || T('<span class="cast">No programme information</span>');
		U.$('i-next').innerHTML = U.esc(next);
	},

	hm: function (ts) { var d = new Date(ts * 1000); return U.pad(d.getHours()) + ':' + U.pad(d.getMinutes()); },

	/* --- audio and subtitle tracks (Orsay Player: type 1 = audio, 5 = subtitles) --- */
	AUDIO: 1,
	SUBTITLE: 5,
	audio: [],
	subs: [],
	audioSel: 0,
	subSel: -1,
	trackRow: 0,
	diag: '',

	call: function (name, a, b) {
		var p = Player.plugin, r = null;
		try {
			if (b !== undefined) { r = p[name](a, b); }
			else if (a !== undefined) { r = p[name](a); }
			else { r = p[name](); }
			return r;
		} catch (e) { }
		try {
			if (b !== undefined) { r = p.Execute(name, a, b); }
			else if (a !== undefined) { r = p.Execute(name, a); }
			else { r = p.Execute(name); }
			return r;
		} catch (e2) { }
		return null;
	},

	readStreams: function () {
		var types = [Player.AUDIO, Player.SUBTITLE], t, i, n, list, raw, diag = [];
		for (t = 0; t < types.length; t++) {
			raw = Player.call('GetTotalNumOfStreamID', types[t]);
			n = parseInt(raw, 10);
			if (isNaN(n) || n < 0) { n = 0; }
			diag.push((types[t] === 1 ? T('audio') : T('subtitles')) + '=' + (raw === null ? T('not supported') : raw));
			list = [];
			for (i = 0; i < n && i < 16; i++) {
				var lang = U.langName(Player.call('GetStreamLanguageInfo', types[t], i));
				/* the TV does not always know the language of a TS audio track: the box knows it from the PMT */
				var ba = types[t] === Player.AUDIO && Subs.audio && Subs.audio.length === n ? Subs.audio[i] : null;
				if (ba) {
					if (!lang || lang.indexOf(T('track ')) === 0) { lang = ba.lang ? U.langName(ba.lang) : ''; }
					if (ba.codec) { lang = (lang || (T('track ') + (i + 1))) + ' · ' + ba.codec; }
				}
				list.push({ index: i, label: lang || (T('track ') + (i + 1)) });
			}
			if (types[t] === Player.AUDIO) { Player.audio = list; } else { Player.subs = list; }
		}
		Player.diag = T('TV reports: ') + diag.join(', ');
		if (Player.audioSel >= Player.audio.length) { Player.audioSel = 0; }
		if (Player.subSel >= Player.subs.length) { Player.subSel = -1; }
		if (U.$('tracks').style.display === 'block') { Player.renderTracks(); }
	},

	tracksOpen: function () { return U.$('tracks').style.display === 'block'; },

	showTracks: function () {
		if (Player.active) { Player.readStreams(); }
		Player.trackRow = 0;
		Player.renderTracks();
		U.show('tracks', true);
	},

	/* Subtitle choices: off + the tracks extracted by the box + the TV's own tracks (if any) */
	subOptions: function () {
		var opts = [{ kind: 'off', label: T('off') }], i;
		for (i = 0; i < Subs.tracks.length; i++) {
			opts.push({ kind: 'box', key: Subs.tracks[i].key, label: Subs.label(Subs.tracks[i]) });
		}
		for (i = 0; i < Player.subs.length; i++) {
			opts.push({ kind: 'tv', index: Player.subs[i].index, label: 'TV: ' + Player.subs[i].label });
		}
		return opts;
	},

	subCurrent: function (opts) {
		var i;
		for (i = 0; i < opts.length; i++) {
			if (opts[i].kind === 'box' && opts[i].key === Subs.key) { return i; }
			if (opts[i].kind === 'tv' && !Subs.key && Player.subSel >= 0 && opts[i].index === Player.subs[Player.subSel].index) { return i; }
		}
		return 0;
	},

	/* Menu rows: during playback audio, subtitles, (timing), language, screenshot; in the lists language and screenshot */
	rowIds: function () {
		if (!Player.active) { return ['lang', 'shot']; }
		return Subs.key ? ['audio', 'sub', 'timing', 'lang', 'shot'] : ['audio', 'sub', 'lang', 'shot'];
	},
	trackRows: function () { return Player.rowIds().length; },
	rowId: function () { return Player.rowIds()[Player.trackRow] || ''; },
	shotRow: function () { return Player.trackRows() - 1; },

	boxStatus: function () {
		if (Subs.liveId || (Player.item && Player.item.live)) { return Player.liveStatus(); }
		switch (Subs.status) {
			case 'starting': return T('Box: reading the recording…');
			case 'running': return T('Box: extracting subtitles ') + Math.round(Subs.progress * 100) + ' %';
			case 'done': return T('Box: subtitles extracted') + (Subs.key ? ' (' + Subs.cues.length + T(')') : '');
			case 'none': return T('Box: no DVB subtitles in the recording') + (Subs.teletext ? T(' (teletext subtitles only, not supported yet)') : '');
			case 'error': return T('Box: ') + (Subs.error || T('error'));
			case 'stopped': return T('Box: extraction interrupted');
		}
		return T('Box: no information');
	},

	liveStatus: function () {
		if (Subs.liveId) {
			switch (Subs.status) {
				case 'connecting': case 'waiting': case 'unknown': case '': return T('Box: waiting for the broadcast…');
				case 'running': return T('Box: subtitles extracted from the broadcast') + (Subs.key ? ' (' + Subs.cues.length + T(')') : '');
				case 'none': return T('Box: no DVB subtitles on this channel now') + (Subs.teletext ? T(' (teletext only, not supported yet)') : '');
				case 'closed': return T('Box: broadcast ended');
				case 'error': return T('Box: ') + (Subs.error || T('error'));
			}
		}
		return T('Subtitles not available (direct playback)');
	},

	renderTracks: function () {
		var rows = [], a = Player.audio;
		var opts = Player.subOptions(), cur = Player.subCurrent(opts);
		if (Player.trackRow >= Player.trackRows()) { Player.trackRow = 0; }
		var aval = a.length ? a[Player.audioSel].label + (a.length > 1 ? '  (' + (Player.audioSel + 1) + '/' + a.length + ')' : '') : T('default');
		var sval = opts.length > 1 ? opts[cur].label : T('not available');
		var row = function (i, label, val, arrows) {
			return '<div class="tr-row' + (Player.trackRow === i ? ' sel' : '') + '"><span class="lbl">' + label + '</span><span class="val">' +
				(arrows ? '◀ ' : '') + U.esc(val) + (arrows ? ' ▶' : '') + '</span></div>';
		};
		var ids = Player.rowIds(), r;
		for (r = 0; r < ids.length; r++) {
			if (ids[r] === 'audio') { rows.push(row(r, T('Audio'), aval, a.length > 1)); }
			else if (ids[r] === 'sub') { rows.push(row(r, T('Subtitles'), sval, opts.length > 1)); }
			else if (ids[r] === 'timing') {
				var off = Subs.offset();
				rows.push(row(r, T('Timing'), (off > 0 ? '+' : '') + I18n.num(off, 1) + ' s' +
					(off === 0 ? '' : (off > 0 ? T('  (earlier)') : T('  (later)'))), true));
			}
			else if (ids[r] === 'lang') { rows.push(row(r, T('Language'), I18n.label(I18n.pref()) + (I18n.pending ? T('  (restarts)') : ''), true)); }
			else if (ids[r] === 'shot') { rows.push(row(r, T('Screenshot'), Shot.busy ? T('wait…') : T('OK: take a picture in 10 s'), false)); }
		}
		U.$('tr-rows').innerHTML = rows.join('');
		U.$('tr-diag').innerHTML = (Player.active ? U.esc(Player.boxStatus()) + '<br/>' + U.esc(Player.diag) + '<br/>' : '') +
			U.esc(T('Language') + ': ' + I18n.diag() + (I18n.more ? ' | ' + I18n.moreText() : ''));
	},

	changeTrack: function (d) {
		var id = Player.rowId();
		if (id === 'shot') { return; }
		if (id === 'lang') {
			I18n.cycle(d);
			Player.renderTracks();
			return;
		}
		if (id === 'audio') {
			var n = Player.audio.length;
			if (n < 2) { return; }
			Player.audioSel = (Player.audioSel + d + n) % n;
			Player.call('SetStreamID', Player.AUDIO, Player.audio[Player.audioSel].index);
		} else if (id === 'sub') {
			var opts = Player.subOptions(), m = opts.length;
			if (m < 2) { return; }
			var next = opts[(Player.subCurrent(opts) + d + m) % m];
			/* first everything off, then the chosen one on */
			if (Subs.key) { Subs.select(null); }
			if (Player.subSel >= 0) { Player.call('SetStreamID', Player.SUBTITLE, -1); Player.subSel = -1; U.show('subs', false); }
			if (next.kind === 'box') {
				Subs.select(next.key);
			} else if (next.kind === 'tv') {
				var i;
				for (i = 0; i < Player.subs.length; i++) { if (Player.subs[i].index === next.index) { Player.subSel = i; } }
				Player.call('SetStreamID', Player.SUBTITLE, next.index);
			} else {
				Store.set('subPref', '');
			}
			Player.tick();
		} else {
			Subs.setOffset(d * 0.5);
			Player.tick();
		}
		Player.renderTracks();
	},

	/* if the TV gives the subtitle as text, draw it ourselves */
	subTimer: null,
	onSubtitle: function (text) {
		if (Player.subSel < 0 || !text) { return; }
		var t = String(text).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
		U.$('subs').innerHTML = U.esc(t).replace(/\n/g, '<br/>');
		U.show('subs', true);
		if (Player.subTimer) { clearTimeout(Player.subTimer); }
		Player.subTimer = setTimeout(function () { U.show('subs', false); }, 5000);
	},

	resetPanels: function () {
		Subs.hide();
		U.show('info', false);
		U.show('tracks', false);
		U.show('subs', false);
		Player.audio = []; Player.subs = []; Player.audioSel = 0; Player.subSel = -1; Player.diag = '';
	},

	/* --- keys during playback --- */
	isMenuKey: function (k) {
		return tvKey.KEY_TOOLS !== undefined && k === tvKey.KEY_TOOLS;   /* MENU always opens the TV's own settings */
	},

	onKey: function (k) {
		var it = Player.item;
		if (Player.tracksOpen()) {
			if (k === tvKey.KEY_UP || k === tvKey.KEY_DOWN) {
				var rc = Player.trackRows();
				Player.trackRow = (Player.trackRow + (k === tvKey.KEY_UP ? rc - 1 : 1)) % rc;
				Player.renderTracks();
			}
			else if (k === tvKey.KEY_LEFT) { Player.changeTrack(-1); }
			else if (k === tvKey.KEY_ENTER && Player.rowId() === 'shot') { U.show('tracks', false); Shot.start(); }
			else if (k === tvKey.KEY_ENTER && Player.rowId() === 'lang') { U.show('tracks', false); I18n.applyIfIdle(); }
			else if (k === tvKey.KEY_RIGHT || k === tvKey.KEY_ENTER) { if (k === tvKey.KEY_ENTER) { U.show('tracks', false); } else { Player.changeTrack(1); } }
			else if (k === tvKey.KEY_RETURN || Player.isMenuKey(k)) { U.show('tracks', false); }
			else if (k === tvKey.KEY_STOP) { U.show('tracks', false); Player.stop(); }
			return true;
		}
		if (Player.isMenuKey(k)) { Player.showTracks(); return true; }
		if (k === tvKey.KEY_INFO) { if (Player.infoOpen()) { Player.hideInfo(); } else { Player.showInfo(); } return true; }
		if (Player.infoOpen() && k === tvKey.KEY_RETURN) { Player.hideInfo(); return true; }
		if (k === tvKey.KEY_RETURN || k === tvKey.KEY_STOP) { Player.stop(); return true; }
		if (it && it.live) {
			if (k === tvKey.KEY_CH_UP || k === tvKey.KEY_UP) { Views.channels.zap(-1); return true; }
			if (k === tvKey.KEY_CH_DOWN || k === tvKey.KEY_DOWN) { Views.channels.zap(1); return true; }
			if (k === tvKey.KEY_ENTER) { Player.showInfo(); return true; }
			return false;
		}
		switch (k) {
			case tvKey.KEY_ENTER:
			case tvKey.KEY_PAUSE:
			case tvKey.KEY_PLAYPAUSE:
			case tvKey.KEY_PLAY:
				if (k === tvKey.KEY_PLAY && !Player.paused) { Player.showOsd(); } else { Player.togglePause(); }
				return true;
			case tvKey.KEY_LEFT: Player.jump(-15); return true;
			case tvKey.KEY_RIGHT: Player.jump(15); return true;
			case tvKey.KEY_UP: Player.jump(300); return true;
			case tvKey.KEY_DOWN: Player.jump(-300); return true;
			case tvKey.KEY_FF: Player.jump(60); return true;
			case tvKey.KEY_RW: Player.jump(-60); return true;
		}
		return false;
	}
};
/* Screenshot: after 10 s the app view is captured and sent to the box. The app cannot see the
   video (a hardware plane of the TV), so the box adds it from the recording with ffmpeg if installed. */
var Shot = {
	busy: false,
	timer: null,
	DELAY: 10,

	platform: function () { return window.E2_TIZEN ? 'tizen' : 'orsay'; },

	start: function () {
		if (Shot.busy) { return; }
		Shot.busy = true;
		var left = Shot.DELAY;
		var tick = function () {
			/* the countdown continues in the list views too: capture whatever is on the screen then */
			if (left > 0) {
				Shot.badge('📷 ' + left);
				left--;
				Shot.timer = setTimeout(tick, 1000);
			} else {
				Shot.badge('');
				setTimeout(Shot.capture, 150);   /* let the marker disappear from the screen first */
			}
		};
		tick();
	},

	badge: function (t) {
		var b = U.$('shotbadge');
		if (!b) {
			b = document.createElement('div');
			b.id = 'shotbadge';
			b.style.cssText = 'position:absolute;right:24px;top:20px;padding:6px 12px;border-radius:6px;background:rgba(0,0,0,0.6);color:#fff;font-size:20px;display:none;';
			document.body.appendChild(b);
		}
		b.innerHTML = U.esc(t);
		b.style.display = t ? 'block' : 'none';
	},

	meta: function () {
		var it = Player.active ? (Player.item || {}) : {};
		var q = { platform: Shot.platform(), pos: Player.active ? Math.round(Player.estimate() * 100) / 100 : 0 };
		if (it.file) { q.file = it.file; }
		if (it.live && it.sref) { q.sref = it.sref; }
		return q;
	},

	capture: function () {
		var meta = Shot.meta();
		var send = function (dataUrl) { Shot.upload(meta, dataUrl); };
		if (!window.Promise || !document.createElement('canvas').getContext) {
			if (!meta.file && !meta.sref) {
				Shot.busy = false;
				U.toast(T('The list view cannot be captured on this TV (video frame only during playback)'), 4000);
				return;
			}
			send(null);   /* old browser: the box saves only the video frame */
			return;
		}
		Shot.loadLib(function (ok) {
			if (!ok || !window.html2canvas) { send(null); return; }
			/* html2canvas does not understand CSS zoom: capture the 1280x720 layout at 1.5x */
			var body = document.body, zoom = body.style.zoom;
			body.style.zoom = '';
			var done = function (url) { body.style.zoom = zoom; send(url); };
			try {
				window.html2canvas(body, { useCORS: true, backgroundColor: null, logging: false,
					width: 1280, height: 720, windowWidth: 1280, windowHeight: 720, scale: 1.5 })
					.then(function (canvas) {
						var url = null;
						try { url = canvas.toDataURL('image/png'); } catch (e) { url = null; }
						done(url);
					}, function () { done(null); });
			} catch (e) {
				done(null);
			}
		});
	},

	loadLib: function (cb) {
		if (window.html2canvas) { cb(true); return; }
		var s = document.createElement('script');
		s.src = Api.base() + '/e2tvplayer/web/lib/html2canvas.min.js';
		s.onload = function () { cb(true); };
		s.onerror = function () { cb(false); };
		document.getElementsByTagName('head')[0].appendChild(s);
	},

	upload: function (meta, dataUrl) {
		var q = [], k;
		for (k in meta) { if (meta.hasOwnProperty(k)) { q.push(encodeURIComponent(k) + '=' + encodeURIComponent(meta[k])); } }
		var x = new XMLHttpRequest();
		x.onreadystatechange = function () {
			if (x.readyState !== 4) { return; }
			Shot.busy = false;
			var r = null;
			try { r = JSON.parse(x.responseText); } catch (e) { r = null; }
			if (x.status === 200 && r && r.name) {
				var what = r.ui ? T('view') : T('video frame');
				U.toast(T('Picture saved on the box (') + what + (r.ffmpeg && (meta.file || meta.sref) ? T(' + video frame') : '') + '): ' + r.name, 4000);
			} else {
				U.toast(T('Saving the picture failed'), 3000);
			}
		};
		try {
			x.open('POST', Api.base() + '/e2tvplayer/screenshot?' + q.join('&'), true);
			try { x.setRequestHeader('Content-Type', 'text/plain'); } catch (eh) { }
			x.send(dataUrl || '');
		} catch (e) {
			Shot.busy = false;
			U.toast(T('Saving the picture failed'), 3000);
		}
	}
};
