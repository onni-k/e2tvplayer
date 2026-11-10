// SPDX-License-Identifier: GPL-3.0-or-later
// The Orsay language test apps built by the box run and report every probe.
const { execFileSync } = require('child_process'), { JSDOM } = require('jsdom');
let fails = 0;
function ok(c, m) { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
const py = `
import sys, types, io, zipfile, json
sys.path.insert(0, '${__dirname}/../../enigma2/src')
for m in ['Components', 'Components.Language']: sys.modules[m] = types.ModuleType(m)
from E2TVPlayer import web, langtest
out = {}
for v in langtest.VARIANTS:
    z = zipfile.ZipFile(io.BytesIO(langtest.build_zip(v, '127.0.0.1:1', web.VERSION, web.WIDGET_DIR)))
    out[v] = {n: z.read(n).decode('utf-8') for n in ('index.html', 'main.js', 'config.xml')}
print(json.dumps(out))`;
const apps = JSON.parse(execFileSync('python3', ['-c', py]).toString());
for (const v of Object.keys(apps)) {
  const a = apps[v];
  ok(a['config.xml'].includes('<cpname>E2LangTest' + v + '</cpname>'), v + ': own app id');
  const dom = new JSDOM(a['index.html'].replace(/<script[^>]*><\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
  const w = dom.window, sent = [];
  w.XMLHttpRequest = function () { this.open = (m, u) => sent.push(decodeURIComponent(u)); this.send = () => {}; };
  if (v === 'A') w.document.getElementById('pluginObjectTVMW').GetLanguage = () => 17;
  w.eval(a['main.js']);
  w.LT.onLoad();
  ok(sent.length === 1 && sent[0].includes('langtest-' + v + ' onload'), v + ': results sent to the box log: ' + (sent[0] || '').slice(0, 160));
  if (v === 'A') ok(/pluginObjectTVMW: GetLanguage=17/.test(sent[0]), 'A: TVMW value reported');
  if (v === 'B') ok(/SEF TV: open=undef/.test(sent[0]), 'B: SEF modules reported');
  ok(w.document.getElementById('out').textContent.includes('--- onload'), v + ': results on the screen');
}
console.log(fails ? fails + ' failures' : 'all ok'); process.exit(fails ? 1 : 0);
