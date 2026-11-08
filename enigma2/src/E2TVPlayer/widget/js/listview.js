/* SPDX-License-Identifier: GPL-3.0-or-later | Copyright (C) 2026 E2TVPlayer contributors */
/* A simple virtual list: only the visible rows are drawn. */
function ListView(listId, thumbId, rows, renderRow) {
	this.el = U.$(listId);
	this.thumb = U.$(thumbId);
	this.rows = rows;
	this.renderRow = renderRow;
	this.items = [];
	this.index = 0;
	this.top = 0;
}

ListView.prototype.setItems = function (items, index) {
	this.items = items || [];
	this.index = Math.max(0, Math.min(index || 0, this.items.length - 1));
	this.top = Math.max(0, this.index - Math.floor(this.rows / 2));
	this.clampTop();
	this.render();
};

ListView.prototype.current = function () { return this.items.length ? this.items[this.index] : null; };

ListView.prototype.clampTop = function () {
	if (this.index < this.top) { this.top = this.index; }
	if (this.index >= this.top + this.rows) { this.top = this.index - this.rows + 1; }
	this.top = Math.max(0, Math.min(this.top, Math.max(0, this.items.length - this.rows)));
};

ListView.prototype.move = function (delta) {
	var n = this.items.length;
	if (!n) { return false; }
	var old = this.index;
	var next = this.index + delta;
	if (Math.abs(delta) === 1) {
		next = (next + n) % n;                     /* a single step wraps around */
	} else {
		next = Math.max(0, Math.min(n - 1, next)); /* a page at a time stops at the end */
	}
	this.index = next;
	this.clampTop();
	this.render();
	return old !== next;
};

ListView.prototype.render = function () {
	var html = [], i, end = Math.min(this.items.length, this.top + this.rows);
	for (i = this.top; i < end; i++) {
		html.push(this.renderRow(this.items[i], i === this.index, i));
	}
	this.el.innerHTML = html.join('');
	var n = this.items.length;
	if (this.thumb) {
		if (n <= this.rows) {
			this.thumb.style.display = 'none';
		} else {
			var trackH = this.thumb.parentNode.offsetHeight || 520;
			var h = Math.max(30, Math.round(trackH * this.rows / n));
			var t = Math.round((trackH - h) * this.top / (n - this.rows));
			this.thumb.style.display = 'block';
			this.thumb.style.height = h + 'px';
			this.thumb.style.top = t + 'px';
		}
	}
};
