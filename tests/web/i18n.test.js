// SPDX-License-Identifier: GPL-3.0-or-later
// Kielivalinta: automaattinen seuraa TV:n kieltä, valinta tallentuu ja vaihtaa tekstit.
const fs = require('fs'), { JSDOM } = require('jsdom');
const W = __dirname + '/../../enigma2/src/E2TVPlayer/widget/';
let fails = 0;
function ok(c, m) { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
function load(lang, stored, orsay, nnavi) {
  const dom = new JSDOM(fs.readFileSync(W + 'index.html', 'utf8').replace(/<script[^>]*><\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
  const w = dom.window;
  Object.defineProperty(w.navigator, 'language', { get: () => lang });
  if (nnavi !== undefined) { w.document.getElementById('pluginNNavi').GetLanguage = () => nnavi; }
  if (orsay !== undefined) w.pluginAPI = { GetLanguage: () => orsay };
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
// Samsung Orsay: pluginAPI.GetLanguage() numerokoodeina (24 = suomi, 0 = englanti), selaimen kieli ei ratkaise
w = load('en-US', null, 24);
ok(w.eval("T('Tallenteet')") === 'Tallenteet', 'Orsay koodi 24 -> suomi');
w = load('fi-FI', null, 0);
ok(w.eval("T('Tallenteet')") === 'Recordings', 'Orsay koodi 0 -> englanti');
w = load('fi-FI', null, 5);
ok(w.eval("I18n.sys()") === 'en', 'Orsay koodi 5 (saksa, ei käännöstä) -> englanti');
w = load('fi-FI', null, 'fin');
ok(w.eval("I18n.sys()") === 'fi', 'Orsay merkkijono fin -> suomi');
w = load('de-DE');
ok(w.eval("I18n.sys()") === 'en', 'kääntämätön TV:n kieli -> englanti');
ok(w.eval("TL('ruotsi (kuulovammaiset)')") === 'Swedish (hard of hearing)', 'boksin tekstitysnimi käännetään');
ok(w.eval("I18n.langs().join(',')") === 'fi,en', 'kielilista po-tiedostoista');
// NNavi-lisäosa ensin (vanhan Samsungin ensisijainen kielilähde)
w = load('en-US', null, 0, 24);
ok(w.eval("I18n.sys()") === 'fi', 'NNavi 24 voittaa pluginAPI:n ja selaimen');
ok(/nnavi=24 api=0 nav=en-US → fi/.test(w.eval("I18n.diag()")), 'diagnostiikka: ' + w.eval("I18n.diag()"));
w = load('fi-FI', null, undefined, -1);
ok(w.eval("I18n.sys()") === 'fi' && w.eval("I18n.diag()").indexOf('nnavi') < 0, 'NNavi -1 ohitetaan');
console.log(fails ? fails + ' virhettä' : 'kaikki ok'); process.exit(fails ? 1 : 0);
