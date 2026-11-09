// old TV browsers (Orsay 2014, Tizen 2015) understand only ES5
const fs = require('fs'), path = require('path'), acorn = require('acorn');
const dirs = ['../../enigma2/src/E2TVPlayer/widget/js', '../../enigma2/src/E2TVPlayer/tizen'];
let bad = 0;
for (const d of dirs) for (const f of fs.readdirSync(path.resolve(__dirname, d)).filter(f => f.endsWith('.js'))) {
  const p = path.resolve(__dirname, d, f);
  try { acorn.parse(fs.readFileSync(p, 'utf8'), { ecmaVersion: 5 }); console.log('ES5 ok   ' + f); }
  catch (e) { console.log('ES5 FAIL ' + f + ': ' + e.message); bad = 1; }
}
// The Orsay installer silently drops an app (it disappears after User App Sync) whose files
// mention plugins a user app may not use. Only these may appear anywhere in the widget.
const ALLOWED = ['PLAYER', 'TVMW', 'NNAVI'];
const wdir = path.resolve(__dirname, '../../enigma2/src/E2TVPlayer/widget');
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(js|html|xml|css)$/.test(f)) continue;
    const m = fs.readFileSync(p, 'utf8').match(/SAMSUNG-INFOLINK-[A-Z]+/g) || [];
    const badp = m.map(x => x.replace('SAMSUNG-INFOLINK-', '')).filter(x => ALLOWED.indexOf(x) < 0);
    if (badp.length) { console.log('PLUGIN FAIL ' + path.relative(wdir, p) + ': ' + badp.join(', ')); bad = 1; }
  }
})(wdir);
if (!bad) console.log('plugins ok (' + ALLOWED.join(', ') + ')');
process.exit(bad);
