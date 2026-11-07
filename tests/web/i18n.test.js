// SPDX-License-Identifier: GPL-3.0-or-later
// Kielivalinta: automaattinen seuraa TV:n kieltä, valinta tallentuu ja vaihtaa tekstit.
const fs = require('fs'), { JSDOM } = require('jsdom');
const W = __dirname + '/../../enigma2/src/E2TVPlayer/widget/';
let fails = 0;
function ok(c, m) { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
function load(lang, stored) {
  const dom = new JSDOM(fs.readFileSync(W + 'index.html', 'utf8').replace(/<script[^>]*><\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
  const w = dom.window;
  Object.defineProperty(w.navigator, 'language', { get: () => lang });
  if (stored) w.localStorage.setItem('e2tallenteet', JSON.stringify({ lang: stored }));
  w.eval(fs.readFileSync(W + 'js/util.js', 'utf8'));
  return w;
}
let w = load('fi-FI');
ok(w.eval("T('Tallenteet')") === 'Tallenteet', 'auto + suomi-TV -> suomi');
ok(w.eval("U.langName('swe')") === 'ruotsi (swe)', 'kielinimet suomeksi');
w = load('en-GB');
ok(w.eval("T('Tallenteet')") === 'Recordings', 'auto + englanti-TV -> englanti');
ok(w.eval("U.langName('swe')") === 'Swedish (swe)', 'kielinimet englanniksi');
ok(w.eval("U.fmtDate(1762500000)").indexOf('Fri') === 0 || /^[A-Z][a-z]{2} /.test(w.eval("U.fmtDate(1762500000)")), 'viikonpäivä englanniksi');
w.eval('I18n.applyStatic()');
ok(w.document.querySelector('.tr-head').innerHTML === 'Audio and subtitles', 'kiinteät tekstit käännetty');
ok(w.eval("I18n.label('auto')") === 'automatic (English)', 'auto-nimike');
w.eval("I18n.cycle(1)");   // auto -> fi
ok(w.eval("Store.get('lang')") === 'fi' && w.eval('I18n.pending') === true, 'vaihto suomeen tallentuu, uudelleenkäynnistys odottaa');
w.eval("I18n.cycle(1)");   // fi -> en
ok(w.eval('I18n.pending') === false, 'takaisin englantiin: ei uudelleenkäynnistystä');
ok(w.eval("Store.get('lang')") === 'en', 'valinta en');
console.log(fails ? fails + ' virhettä' : 'kaikki ok'); process.exit(fails ? 1 : 0);
