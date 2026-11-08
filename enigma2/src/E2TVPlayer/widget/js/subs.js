/* SPDX-License-Identifier: GPL-3.0-or-later | Copyright (C) 2026 E2TVPlayer contributors */
/* DVB subtitles. The box renders them into images (E2TVPlayer subs.py / live.py),
   and this module shows the right image over the video according to the playback position. */
var Subs = {
	file: null,
	tracks: [],          /* [{key, lang, label}] from the box */
	status: '',
	progress: 0,
	error: '',
	teletext: 0,
	dw: 720,
	dh: 576,
	key: null,           /* the chosen track */
	cues: [],
	pollTimer: null,
	shown: -1,
	gen: 0,              /* keeps old responses from mixing into a new playback */
	liveId: null,        /* live session on the box */
	liveGen: 0,
	audio: [],          /* the box's audio track info: [{lang, codec}] in PMT order */

	start: function (item) {
		Subs.stop();
		Subs.gen++;
		Subs.file = item && item.file ? item.file : null;
		Subs.liveId = item && item.liveId ? item.liveId : null;
		if (!Subs.file && !Subs.liveId) { return; }
		Subs.poll();
	},

	stop: function () {
		if (Subs.pollTimer) { clearTimeout(Subs.pollTimer); Subs.pollTimer = null; }
		Subs.file = null;
		Subs.liveId = null;
		Subs.liveGen = 0;
		Subs.audio = [];
		Subs.tracks = [];
		Subs.status = '';
		Subs.progress = 0;
		Subs.error = '';
		Subs.key = null;
		Subs.cues = [];
		Subs.hide();
	},

	offset: function () { return Number(Store.get('subOffset', 0)) || 0; },

	setOffset: function (d) {
		var v = Math.round((Subs.offset() + d) * 10) / 10;
		if (v > 30) { v = 30; }
		if (v < -30) { v = -30; }
		Store.set('subOffset', v);
		Subs.shown = -1;
	},

	running: function () {
		if (Subs.liveId) { return false; }
		return Subs.status === 'starting' || Subs.status === 'running';
	},

	imgUrl: function (n) {
		return Subs.liveId ? Api.liveImgUrl(Subs.liveId, Subs.key, n) : Api.subImgUrl(Subs.file, Subs.key, n);
	},

	/* live: the box also resends the latest cue, because its end time becomes known only later */
	pollLive: function () {
		var gen = Subs.gen, id = Subs.liveId, key = Subs.key;
		if (Subs.pollTimer) { clearTimeout(Subs.pollTimer); Subs.pollTimer = null; }
		var last = Subs.cues.length ? Subs.cues[Subs.cues.length - 1].n : 0;
		Api.liveSubs(id, key, last, function (r) {
			if (gen !== Subs.gen || id !== Subs.liveId) { return; }
			Subs.status = r.status || '';
			Subs.error = r.error || '';
			Subs.teletext = r.teletext || 0;
			if (r.audio) { Subs.audio = r.audio; if (Player.tracksOpen && Player.tracksOpen()) { Player.readStreams(); } }
			Subs.dw = r.dw || 720;
			Subs.dh = r.dh || 576;
			if (r.gen && r.gen !== Subs.liveGen) { Subs.liveGen = r.gen; Subs.cues = []; Subs.hide(); }
			var hadTracks = Subs.tracks.length > 0;
			Subs.tracks = r.tracks || [];
			if (key && key === Subs.key && r.cues) { Subs.merge(r.cues); }
			if (!hadTracks && Subs.tracks.length && !Subs.key) { Subs.autoSelect(); }
			if (Player.tracksOpen && Player.tracksOpen()) { Player.renderTracks(); }
			if (Subs.status !== 'closed' && Subs.status !== 'none' && Subs.status !== 'error') {
				Subs.pollTimer = setTimeout(Subs.poll, (Subs.key || !Subs.tracks.length) ? 1000 : 3000);
			}
		}, function () {
			if (gen !== Subs.gen) { return; }
			Subs.pollTimer = setTimeout(Subs.poll, 5000);
		});
	},

	merge: function (list) {
		var i, j, c;
		for (i = 0; i < list.length; i++) {
			c = list[i];
			for (j = Subs.cues.length - 1; j >= 0 && Subs.cues[j].n > c.n; j--) { }
			if (j >= 0 && Subs.cues[j].n === c.n) { Subs.cues[j] = c; }
			else { Subs.cues.splice(j + 1, 0, c); }
		}
		if (Subs.cues.length > 400) { Subs.cues.splice(0, Subs.cues.length - 400); Subs.shown = -1; }
	},

	poll: function () {
		if (Subs.liveId) { Subs.pollLive(); return; }
		var gen = Subs.gen, file = Subs.file;
		if (!file) { return; }
		if (Subs.pollTimer) { clearTimeout(Subs.pollTimer); Subs.pollTimer = null; }
		var key = Subs.key, from = Subs.cues.length;
		Api.subs(file, key, from, function (r) {
			if (gen !== Subs.gen || file !== Subs.file) { return; }
			Subs.status = r.status || '';
			Subs.progress = Number(r.progress) || 0;
			Subs.error = r.error || '';
			Subs.teletext = r.teletext || 0;
			if (r.audio) { Subs.audio = r.audio; if (Player.tracksOpen && Player.tracksOpen()) { Player.readStreams(); } }
			Subs.dw = r.dw || 720;
			Subs.dh = r.dh || 576;
			var hadTracks = Subs.tracks.length > 0;
			Subs.tracks = r.tracks || [];
			if (key && key === Subs.key && r.cues && Subs.cues.length === from) {
				var i;
				for (i = 0; i < r.cues.length; i++) { Subs.cues.push(r.cues[i]); }
			}
			if (!hadTracks && Subs.tracks.length && !Subs.key) { Subs.autoSelect(); }
			if (Player.tracksOpen && Player.tracksOpen()) { Player.renderTracks(); }
			/* keep polling while the extraction is in progress */
			if (Subs.running() || (Subs.key && Subs.key !== key)) {
				Subs.pollTimer = setTimeout(Subs.poll, Subs.status === 'starting' ? 1500 : (Subs.key ? 4000 : 6000));
			}
		}, function () {
			if (gen !== Subs.gen) { return; }
			Subs.status = 'error';
			Subs.error = T('box does not respond');
			Subs.pollTimer = setTimeout(Subs.poll, 15000);
		});
	},

	/* chooses the same subtitles as last time automatically */
	autoSelect: function () {
		var pref = Store.get('subPref', ''), i;
		if (!pref) { return; }
		for (i = 0; i < Subs.tracks.length; i++) {
			if (Subs.tracks[i].label === pref) { Subs.select(Subs.tracks[i].key, true); return; }
		}
		for (i = 0; i < Subs.tracks.length; i++) {
			if (pref.indexOf(Subs.tracks[i].label.split(' ')[0]) === 0) { Subs.select(Subs.tracks[i].key, true); return; }
		}
	},

	select: function (key, auto) {
		Subs.key = key || null;
		Subs.cues = [];
		Subs.hide();
		if (!auto) {
			var label = '', i;
			for (i = 0; i < Subs.tracks.length; i++) { if (Subs.tracks[i].key === key) { label = Subs.tracks[i].label; } }
			Store.set('subPref', label);
		}
		if (Subs.key) { Subs.poll(); }
	},

	label: function (t) {
		var s = TL(t.label);
		if (Subs.running()) { s += T(' – loading ') + Math.round(Subs.progress * 100) + ' %'; }
		return s;
	},

	/* finds the cue shown at time t (the list is in time order) */
	find: function (t) {
		var c = Subs.cues, lo = 0, hi = c.length - 1, mid, found = -1;
		while (lo <= hi) {
			mid = (lo + hi) >> 1;
			if (c[mid].s <= t) { found = mid; lo = mid + 1; } else { hi = mid - 1; }
		}
		if (found >= 0 && t < c[found].e) { return found; }
		return -1;
	},

	update: function (pos) {
		if (!Subs.key || !Subs.cues.length) { if (Subs.shown !== -1) { Subs.hide(); } return; }
		var idx = Subs.find(pos + Subs.offset());
		if (idx === Subs.shown) { return; }
		if (idx < 0) { Subs.hide(); return; }
		var c = Subs.cues[idx];
		var sx = 1280 / Subs.dw, sy = 720 / Subs.dh;
		var img = U.$('subimg');
		img.src = Subs.imgUrl(c.n);
		img.style.left = Math.round(c.x * sx) + 'px';
		img.style.top = Math.round(c.y * sy) + 'px';
		img.style.width = Math.round(c.w * sx) + 'px';
		img.style.height = Math.round(c.h * sy) + 'px';
		U.show('sublayer', true);
		Subs.shown = idx;
		/* preload the next image */
		if (idx + 1 < Subs.cues.length) {
			try { (new Image()).src = Subs.imgUrl(Subs.cues[idx + 1].n); } catch (e) { }
		}
	},

	hide: function () {
		Subs.shown = -1;
		U.show('sublayer', false);
	}
};
