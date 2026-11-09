// SPDX-License-Identifier: GPL-3.0-or-later
// Language choice: 'auto' follows the TV language, a chosen language is stored and changes the texts.
const fs = require('fs'), { JSDOM } = require('jsdom');
const W = __dirname + '/../../enigma2/src/E2TVPlayer/widget/';
let fails = 0;
function ok(c, m) { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
function load(lang, stored, orsay, nnavi, tvmw) {
  const dom = new JSDOM(fs.readFileSync(W + 'index.html', 'utf8').replace(/<script[^>]*><\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
  const w = dom.window;
  Object.defineProperty(w.navigator, 'language', { get: () => lang });
  if (nnavi !== undefined) { w.document.getElementById('pluginNNavi').GetLanguage = () => nnavi; }
  if (tvmw !== undefined) { w.document.getElementById('pluginTVMW').GetLanguage = () => tvmw; }
  if (orsay !== undefined) w.pluginAPI = { GetLanguage: () => orsay };
  if (stored) w.localStorage.setItem('e2tallenteet', JSON.stringify({ lang: stored }));
  w.eval(fs.readFileSync(W + 'js/util.js', 'utf8'));
  return w;
}

// browser language (Tizen)
let w = load('en-GB');
ok(w.eval("T('Recordings')") === 'Recordings', 'auto + English TV -> English (source language)');
ok(w.eval("U.langName('swe')") === 'Swedish (swe)', 'language names in English');
ok(/^[A-Z][a-z]{2} /.test(w.eval("U.fmtDate(1762500000)")), 'weekday in English: ' + w.eval("U.fmtDate(1762500000)"));
w = load('fi-FI');
ok(w.eval("T('Recordings')") === 'Tallenteet', 'auto + Finnish TV -> Finnish');
ok(w.eval("U.langName('swe')") === 'ruotsi (swe)', 'language names in Finnish');
w.eval('I18n.applyStatic()');
ok(w.document.querySelector('.tr-head').innerHTML === 'Ääni ja tekstitys', 'static texts of index.html translated');
ok(w.eval("I18n.label('auto')") === 'automaattinen (suomi)', 'auto label: ' + w.eval("I18n.label('auto')"));
w = load('sv-SE');
ok(w.eval("T('Recordings')") === 'Inspelningar', 'auto + Swedish TV -> Swedish');
ok(w.eval("TL('Finnish (hard of hearing)')") === 'finska (hörselskadade)', 'subtitle name from the box translated: ' + w.eval("TL('Finnish (hard of hearing)')"));
w = load('de-DE');
ok(w.eval("I18n.sys()") === 'en' && w.eval("T('Recordings')") === 'Recordings', 'untranslated TV language -> English');
ok(w.eval("I18n.langs().join(',')") === 'en,fi,sv', 'languages from the po files: ' + w.eval("I18n.langs().join(',')"));

// cycling and restart
w = load('en-US');
w.eval("I18n.cycle(1)");   // auto -> en
ok(w.eval("Store.get('lang')") === 'en' && w.eval('I18n.pending') === false, 'auto -> English: same language, no restart');
w.eval("I18n.cycle(1)");   // en -> fi
ok(w.eval("Store.get('lang')") === 'fi' && w.eval('I18n.pending') === true, 'English -> Finnish is stored, restart pending');
w = load('en-US', 'sv');
ok(w.eval("T('Settings')") === 'Inställningar', 'stored choice wins over the TV language');

// Samsung Orsay: plugin language codes (the browser language is not reliable there)
w = load('en-US', null, 24);
ok(w.eval("I18n.sys()") === 'fi', 'pluginAPI 24 -> Finnish (older table)');
w = load('fi-FI', null, 0);
ok(w.eval("I18n.sys()") === 'en', 'pluginAPI 0 -> English');
w = load('fi-FI', null, 5);
ok(w.eval("I18n.sys()") === 'en', 'pluginAPI 5 (German, no translation) -> English');
w = load('en-US', null, undefined, 6);
ok(w.eval("I18n.sys()") === 'fi', 'NNavi 6 -> Finnish');
w = load('en-US', null, undefined, 1);
ok(w.eval("I18n.sys()") === 'sv', 'NNavi 1 -> Swedish');
w = load('en-US', null, 0, 6);
ok(/^nnavi=6 api=0 nav=en-US \(-widget,tvmw\) → fi \[nnavi\]/.test(w.eval("I18n.diag()")), 'NNavi wins, diagnostics: ' + w.eval("I18n.diag()"));
ok(/widget=noobj/.test(w.eval("I18n.diag(true)")) && /tvmw=undef/.test(w.eval("I18n.diag(true)")), 'the log lists every source: ' + w.eval("I18n.diag(true)"));
w = load('c', null, undefined, -1, 17);
ok(w.eval("I18n.sys()") === 'fi' && /\[tvmw\]/.test(w.eval("I18n.diag()")), 'UE40H6275: only TVMW 17 (country) -> Finnish: ' + w.eval("I18n.diag()"));
w = load('en-US', null, undefined, 1, 17);
ok(w.eval("I18n.sys()") === 'sv', 'a real language source wins over TVMW 17');
w = load('en-US', null, undefined, undefined, 17);
ok(w.eval("I18n.sys()") === 'en', 'browser language wins over TVMW 17');
w = load('fi-FI', null, 'fin');
ok(w.eval("I18n.sys()") === 'fi', 'string code fin -> Finnish');

// the delayed extra probe (Orsay) and its crash guard
w = load('en-US', null, undefined, 6);
let more = null; w.I18n.probeMore(r => { more = r; });
setTimeout(() => {
  ok(more && /nnavi2=undef nnavimenu=undef/.test(w.eval('I18n.moreText()')) && w.eval("Store.get('langProbe')") === 0, 'extra probe: ' + w.eval('I18n.moreText()'));
  const w2 = load('en-US', null, undefined, 6); w2.eval("Store.set('langProbe', 1)");
  let m2 = null; w2.I18n.probeMore(r => { m2 = r; });
  ok(m2 && /skipped/.test(w2.eval('I18n.moreText()')), 'probe skipped after an unfinished one');
  const w3 = load('en-US');
  let m3 = 'x'; w3.eval("window.tizen = {}"); w3.I18n.probeMore(r => { m3 = r; });
  ok(m3 === null, 'no extra probe on Tizen');
  console.log(fails ? fails + ' failures' : 'all ok'); process.exit(fails ? 1 : 0);
}, 800);
