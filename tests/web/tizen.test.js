const fs=require('fs'), {JSDOM}=require('jsdom');
const W=process.argv[2];
let html=fs.readFileSync(W+'/index.html','utf8').replace(/<script[^>]*><\/script>/g,'');
const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost/',pretendToBeVisual:true});
const w=dom.window; Object.defineProperty(w,'innerWidth',{value:1920}); Object.defineProperty(w,'innerHeight',{value:1080});
const calls=[]; let L=null; let exited=false; const reg=[];
// --- Tizen- ja webapis-mockit ---
w.tizen={application:{getCurrentApplication:()=>({exit:()=>{exited=true;}})},tvinputdevice:{registerKey:k=>{ if(k==='Exit') throw new Error('not supported'); reg.push(k);} }};
const tracks=[{index:0,type:'VIDEO',extra_info:'{}'},{index:1,type:'AUDIO',extra_info:'{"language":"fin","fourCC":"EAC3"}'},{index:2,type:'AUDIO',extra_info:'{"language":"swe"}'}];
w.webapis={network:{getIp:()=>'192.168.68.104'},appcommon:{AppCommonScreenSaverState:{SCREEN_SAVER_ON:1,SCREEN_SAVER_OFF:0},setScreenSaver:s=>calls.push('saver '+s)},
 avplay:{open:u=>calls.push('open '+u),close:()=>calls.push('close'),stop:()=>calls.push('stop'),setListener:l=>{L=l;},setDisplayRect:(...a)=>calls.push('rect '+a.join(',')),
  setDisplayMethod:m=>calls.push(m),prepareAsync:(ok)=>setTimeout(ok,10),seekTo:(ms,ok)=>{calls.push('seek '+ms);setTimeout(ok,5)},play:()=>calls.push('play'),pause:()=>calls.push('pause'),
  jumpForward:ms=>calls.push('jf '+ms),jumpBackward:ms=>calls.push('jb '+ms),getDuration:()=>1800000,getTotalTrackInfo:()=>tracks,setSelectTrack:(t,i)=>calls.push('track '+t+' '+i),setSilentSubtitle:b=>calls.push('silent '+b)}};
// OpenWebif + boksin haku
const now=Math.floor(Date.now()/1000); const urls=[];
const R={'/e2tvplayer/info':h=>h==='192.168.68.103'?{app:'E2TVPlayer'}:null,
 '/api/statusinfo':()=>({currservice_station:'Yle TV1'}),
 '/api/movielist':()=>({directory:'/media/hdd/movie/',bookmarks:[],movies:[{filename:'/media/hdd/movie/a.ts',eventname:'Elokuva',servicename:'Yle TV2',recordingtime:now-100,length:'30:00',filesize:1e9,serviceref:'1:0:0:0:0:0:0:0:0:0:/media/hdd/movie/a.ts'}]}),
 '/e2tvplayer/subs':()=>({status:'done',progress:1,tracks:[{key:'512_1',lang:'fin',label:'suomi'}],cues:[{s:2,e:5,x:100,y:450,w:500,h:60,n:0}],dw:720,dh:576})};
w.XMLHttpRequest=function(){}; w.XMLHttpRequest.prototype.open=function(m,u){this.u=u;urls.push(u)}; w.XMLHttpRequest.prototype.abort=function(){}; w.XMLHttpRequest.prototype.setRequestHeader=function(){};
w.XMLHttpRequest.prototype.send=function(){const x=this,url=new URL(x.u);const f=R[url.pathname];const r=f?f(url.hostname):null;setTimeout(()=>{x.readyState=4;x.status=r?200:0;x.responseText=JSON.stringify(r||{});x.onreadystatechange&&x.onreadystatechange();},r?5:30);};
for(const f of ['tizen-shim','boxconfig','util','api','listview','player','subs','views','main']) w.eval(fs.readFileSync(W+'/js/'+f+'.js','utf8'));
w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
const $=id=>w.document.getElementById(id), key=c=>w.App.keyDown({keyCode:c,preventDefault(){}}), txt=id=>$(id).textContent.replace(/\s+/g,' ').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); let fail=0; const check=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m); if(!c) fail=1;};
(async()=>{
  w.App.onLoad(); await sleep(400);
  check(w.document.body.style.zoom==='1.5','skaalaus 1920 -> zoom '+w.document.body.style.zoom);
  check(reg.includes('ColorF0Red') && reg.includes('MediaPlayPause') && reg.includes('Tools'),'näppäimet rekisteröity ('+reg.length+')');
  check(w.Api.host==='192.168.68.103' && txt('list').includes('Elokuva'),'boksi löytyi lähiverkosta: '+w.Api.host);
  check(urls.filter(u=>u.includes('/e2tvplayer/info')).length===254,'haettiin koko /24-verkko');
  key(13); await sleep(100);
  check(calls.includes('open http://192.168.68.103/file?file=%2Fmedia%2Fhdd%2Fmovie%2Fa.ts') && calls.includes('play') && calls.includes('rect 0,0,1920,1080'),'AVPlay avasi tallenteen täysruutuun');
  check(calls.includes('saver 0'),'näytönsäästäjä pois toiston ajaksi');
  L.onbufferingcomplete(); L.oncurrentplaytime(3000); await sleep(300);
  check($('sublayer').style.display==='block' || w.Subs.tracks.length===1,'boksin tekstitysraidat haettu');
  key(39); check(calls.includes('jf 15000'),'oikea nuoli = +15 s (ms)');
  key(40); check(calls.some(c=>/^jb \d+/.test(c)),'alas = taaksepäin (alkuun asti)');
  key(10252); check(calls.includes('pause') && w.Player.paused,'Play/Pause-nappi pysäyttää');
  key(10252); check(!w.Player.paused,'ja jatkaa');
  key(10135); check($('tracks').style.display==='block' && txt('tr-rows').includes('suomi (fin)'),'TOOLS: '+txt('tr-rows'));
  key(39); check(calls.includes('track AUDIO 2'),'ääniraita vaihtui (AVPlay-indeksi 2)');
  // kuvakaappaus: TOOLS -> viimeinen rivi -> OK, 10 s viive (kello kiihdytetään)
  w.html2canvas = (el, o) => Promise.resolve({ toDataURL: () => 'data:image/png;base64,QUJD', o });
  w.Shot.DELAY = 1;
  if ($('tracks').style.display!=='block') key(10135); key(38); check(txt('tr-rows').includes('Kuvakaappaus'),'valikossa kuvakaappausrivi');
  const posts = []; const origSend = w.XMLHttpRequest.prototype.send;
  w.XMLHttpRequest.prototype.send = function (b) { if (this.u.includes('/e2tvplayer/screenshot')) { posts.push([this.u, b]); const x=this; setTimeout(()=>{x.readyState=4;x.status=200;x.responseText=JSON.stringify({name:'20261106-200000_tizen',ui:'a.png',ffmpeg:true});x.onreadystatechange();},5); return; } return origSend.call(this, b); };
  key(13); check($('tracks').style.display==='none','OK sulkee valikon ja käynnistää ajastimen');
  await sleep(1600);
  check(posts.length===1 && /platform=tizen/.test(posts[0][0]) && /file=%2Fmedia/.test(posts[0][0]) && posts[0][1].startsWith('data:image/png'),'kuva lähetettiin boksiin: '+(posts[0]||[''])[0].split('?')[1]);
  check(w.document.body.style.zoom==='1.5','zoom palautettiin kuvan jälkeen');
  check(txt('toast').includes('tallennettu boksiin'),'ilmoitus: '+txt('toast'));
  // laskuri käyntiin ja heti takaisin listaan: kuva otetaan listanäkymästä
  key(10135); key(38); key(13);
  key(10009); check(!w.Player.active && calls.includes('close'),'RETURN lopettaa toiston, AVPlay suljettu');
  await sleep(1600);
  check(posts.length===2 && !/file=/.test(posts[1][0]) && /pos=0/.test(posts[1][0]) && posts[1][1].startsWith('data:image/png'),'listanäkymän kuva lähetettiin: '+(posts[1]||[''])[0].split('?')[1]);
  check(calls.includes('saver 1'),'näytönsäästäjä takaisin');
  key(10009); check(w.Dialog.isOpen,'RETURN listassa kysyy'); key(13); check(exited,'Kyllä sulkee sovelluksen');
  process.exit(fail);
})();
