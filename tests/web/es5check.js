// old TV browsers (Orsay 2014, Tizen 2015) understand only ES5
const fs = require('fs'), path = require('path'), acorn = require('acorn');
const dirs = ['../../enigma2/src/E2TVPlayer/widget/js', '../../enigma2/src/E2TVPlayer/tizen'];
let bad = 0;
for (const d of dirs) for (const f of fs.readdirSync(path.resolve(__dirname, d)).filter(f => f.endsWith('.js'))) {
  const p = path.resolve(__dirname, d, f);
  try { acorn.parse(fs.readFileSync(p, 'utf8'), { ecmaVersion: 5 }); console.log('ES5 ok   ' + f); }
  catch (e) { console.log('ES5 FAIL ' + f + ': ' + e.message); bad = 1; }
}
process.exit(bad);
