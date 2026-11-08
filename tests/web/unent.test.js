// decoding of HTML entities before JSON (OpenWebif: "Shorty&#x27;s")
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../../enigma2/src/E2TVPlayer/widget/js/api.js'), 'utf8'), ctx);
const raw = '{"t":"Shorty&#x27;s &quot;Dream&quot; Shop &amp; Co &lt;1&gt; &#228; \\\\ &#92; &#10;x"}';
const o = JSON.parse(vm.runInContext('Api.unent(' + JSON.stringify(raw) + ')', ctx));
const want = 'Shorty\'s "Dream" Shop & Co <1> ä \\ \\  x';
console.log((o.t === want ? 'ok   ' : 'FAIL ') + 'entities decoded: ' + o.t);
process.exit(o.t === want ? 0 : 1);
