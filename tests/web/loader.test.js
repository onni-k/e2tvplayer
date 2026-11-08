// Loading of the Tizen app: the code from the box if it answers, otherwise the copy in the package.
const fs = require('fs'), path = require('path'), http = require('http'), { JSDOM, VirtualConsole } = require('jsdom');
const WGT = process.argv[2];
const WIDGET = path.resolve(__dirname, '../../enigma2/src/E2TVPlayer/widget');
let fail = 0; const check = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail = 1; };
function server(web) {
  const log = [];
  const s = http.createServer((req, res) => {
    log.push(req.url);
    res.setHeader('Access-Control-Allow-Origin', '*');   // jsdom enforces CORS; the Tizen app (access origin=*) does not need this
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
  // a copy of the package whose boxconfig.js points to the test server (a file:// page has no localStorage)
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'e2wgt-'));
  fs.cpSync(WGT, dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'js/boxconfig.js'), 'var BOX_DEFAULT_HOST = "127.0.0.1:' + srv.port + '"; var BOX_PLUGIN_VERSION = "package";');
  let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8').replace(/<script[^>]*\$WEBAPIS[^>]*><\/script>/, '');
  const vc = new VirtualConsole();
  const dom = new JSDOM(html, { url: 'file://' + path.join(dir, 'index.html'), runScripts: 'dangerously', resources: 'usable', virtualConsole: vc,
    beforeParse(w) {
      Object.defineProperty(w.navigator, 'language', { get: () => 'fi-FI' });
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
  check(r.remote.length === 7 && r.remote[6].startsWith('/e2tvplayer/web/js/main.js?v=9.9.999'), 'code loaded from the box (' + r.remote.length + ' files)');
  check(r.w.E2Loader.source === 'box' && r.w.BOX_PLUGIN_VERSION === '9.9.999', 'version from the box: ' + r.w.BOX_PLUGIN_VERSION);
  check(typeof r.w.App === 'object' && r.w.App.view !== null, 'app started (view ' + r.w.App.view + ')');
  check(/\btizen\b/.test(r.w.document.documentElement.className), 'Tizen theme in use');
  r = await run(false);
  check(r.remote.length === 0 && r.w.E2Loader.source === 'package' && typeof r.w.App === 'object', 'box without web support: the package code');
  process.exit(fail);
})();
