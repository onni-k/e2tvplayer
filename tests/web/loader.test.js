// Tizen-sovelluksen lataus: koodi boksista, jos boksi vastaa; muuten paketin oma kopio.
const fs = require('fs'), path = require('path'), http = require('http'), { JSDOM, VirtualConsole } = require('jsdom');
const WGT = process.argv[2];
const WIDGET = path.resolve(__dirname, '../../enigma2/src/E2TVPlayer/widget');
let fail = 0; const check = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail = 1; };
function server(web) {
  const log = [];
  const s = http.createServer((req, res) => {
    log.push(req.url);
    res.setHeader('Access-Control-Allow-Origin', '*');   // jsdom noudattaa CORSia; Tizen-sovellus (access origin=*) ei tarvitse
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/e2tvplayer/info') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ app: 'E2TVPlayer', version: '9.9.999', web })); }
    const m = /^\/e2tvplayer\/web\/(js|css)\/([\w.-]+)$/.exec(u.pathname);
    if (m && web) { res.setHeader('Content-Type', m[1] === 'js' ? 'application/javascript' : 'text/css'); return res.end(fs.readFileSync(path.join(WIDGET, m[1], m[2]))); }
    res.statusCode = 404; res.end('{}');
  });
  return new Promise(r => s.listen(0, '127.0.0.1', () => r({ s, log, port: s.address().port })));
}
async function run(web) {
  const srv = await server(web);
  // kopio paketista, jonka boxconfig.js osoittaa testipalvelimeen (file://-sivulla ei ole localStoragea)
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'e2wgt-'));
  fs.cpSync(WGT, dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'js/boxconfig.js'), 'var BOX_DEFAULT_HOST = "127.0.0.1:' + srv.port + '"; var BOX_PLUGIN_VERSION = "paketti";');
  let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8').replace(/<script[^>]*\$WEBAPIS[^>]*><\/script>/, '');
  const vc = new VirtualConsole();
  const dom = new JSDOM(html, { url: 'file://' + path.join(dir, 'index.html'), runScripts: 'dangerously', resources: 'usable', virtualConsole: vc,
    beforeParse(w) {
      w.tizen = { application: { getCurrentApplication: () => ({ exit() {} }) }, tvinputdevice: { registerKey() {} } };
      w.webapis = { avplay: {}, appcommon: { AppCommonScreenSaverState: {}, setScreenSaver() {} } };
    } });
  const w = dom.window;
  await new Promise(r => setTimeout(r, 2500));
  const remote = srv.log.filter(u => u.startsWith('/e2tvplayer/web/js/'));
  srv.s.close();
  return { w, remote, log: srv.log };
}
(async () => {
  let r = await run(true);
  check(r.remote.length === 7 && r.remote[6].startsWith('/e2tvplayer/web/js/main.js?v=9.9.999'), 'koodi ladattiin boksista (' + r.remote.length + ' tiedostoa)');
  check(r.w.E2Loader.source === 'boksi' && r.w.BOX_PLUGIN_VERSION === '9.9.999', 'versio boksista: ' + r.w.BOX_PLUGIN_VERSION);
  check(typeof r.w.App === 'object' && r.w.App.view !== null, 'sovellus käynnistyi (näkymä ' + r.w.App.view + ')');
  check(/\btizen\b/.test(r.w.document.documentElement.className), 'Tizen-teema käytössä');
  r = await run(false);
  check(r.remote.length === 0 && r.w.E2Loader.source === 'paketti' && typeof r.w.App === 'object', 'boksi ilman web-tukea: paketin oma koodi');
  process.exit(fail);
})();
