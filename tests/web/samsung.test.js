const fs=require('fs'), {JSDOM}=require('jsdom');
const W=require('path').resolve(__dirname,'../../enigma2/src/E2TVPlayer/widget')+'/';
let html=fs.readFileSync(W+'index.html','utf8').replace(/<script[^>]*><\/script>/g,'');
const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost/'});
const w=dom.window; Object.defineProperty(w.navigator,'language',{get:()=>process.env.E2LANG||'fi-FI'}); const log=[];
w.console.log=(...a)=>log.push(a.join(' '));
// Orsay-API:t
w.eval(`var Common={API:{Widget:function(){this.sendReadyEvent=function(){};this.blockNavigation=function(){};this.sendReturnEvent=function(){window.__exited='return';};this.sendExitEvent=function(){window.__exited='exit';};},
 TVKeyValue:function(){var k={KEY_RETURN:88,KEY_EXIT:45,KEY_ENTER:29443,KEY_UP:29460,KEY_DOWN:29461,KEY_LEFT:4,KEY_RIGHT:5,KEY_PLAY:71,KEY_PAUSE:74,KEY_STOP:70,KEY_FF:72,KEY_RW:69,KEY_RED:108,KEY_GREEN:20,KEY_YELLOW:21,KEY_BLUE:22,KEY_INFO:31,KEY_CH_UP:68,KEY_CH_DOWN:65,KEY_VOL_UP:7,KEY_VOL_DOWN:11,KEY_MUTE:27,KEY_TOOLS:75,KEY_MENU:262};var d=[17,101,98,6,8,9,10,12,13,14];for(var i=0;i<10;i++)k['KEY_'+i]=d[i];for(var n in k)this[n]=k[n];},
 Plugin:function(){this.unregistKey=function(){};this.setOnScreenSaver=function(){};this.setOffScreenSaver=function(){};this.registKey=function(){};}}};`);
const calls=[];
const P=w.document.getElementById('pluginPlayer');
['Stop','Pause','Resume','SetDisplayArea'].forEach(m=>P[m]=(...a)=>calls.push(m+' '+a.join(',')));
P.InitPlayer=(u)=>{calls.push('Init '+u);return true}; P.StartPlayback=(s)=>{calls.push('Start '+s);return true};
P.JumpForward=s=>calls.push('JF '+s); P.JumpBackward=s=>calls.push('JB '+s); P.GetDuration=()=>3600000; P.Play=()=>true;
P.GetTotalNumOfStreamID=t=>t===1?2:(t===5?1:0); P.GetStreamLanguageInfo=(t,i)=>t===1?[0x66696e,0x716161][i]:'fin'; P.SetStreamID=(t,i)=>calls.push('SID '+t+','+i);
w.document.getElementById('pluginTVMW').SetMediaSource=()=>{};
// OpenWebif-mock
const now=Math.floor(Date.now()/1000);
const R={
 '/api/statusinfo':{currservice_station:'Yle TV1',currservice_name:'Uutiset',isRecording:'true',inStandby:'false'},
 '/api/movielist':q=>q.dirname&&q.dirname.indexOf('Sarjat')>0?{directory:'/media/hdd/movie/Sarjat/',bookmarks:[],movies:[{filename:'/media/hdd/movie/Sarjat/a.ts',eventname:'Sarja jakso 1',servicename:'MTV3',recordingtime:now-9000,length:'45:00',filesize:2e9,serviceref:'1:0:0:0:0:0:0:0:0:0:/media/hdd/movie/Sarjat/a.ts'}]}:
   {directory:'/media/hdd/movie/',bookmarks:['Sarjat','.Trash'],movies:[
    {filename:'/media/hdd/movie/x y.ts',eventname:'Elokuva <b>',description:'Lyhyt',descriptionExtended:'Pitkä kuvaus. Miten Laura pärjää?actor: Rose Nieminenactor: Mikko Heinodirector: X Y',servicename:'Yle TV2',recordingtime:now-3600,length:'1:40:00',filesize:5e9,filesize_readable:'4,7 GB',serviceref:'1:0:0:0:0:0:0:0:0:0:/media/hdd/movie/x y.ts'},
    {filename:'/media/hdd/movie/b.ts',eventname:'Aamu-tv',servicename:'MTV3',recordingtime:now-90000,length:'',filesize:1e8,serviceref:'1:0:0:0:0:0:0:0:0:0:/media/hdd/movie/b.ts'}]},
 '/api/epgnext':{events:[{sref:'1:0:19:11:1:20F6:EEEE0000:0:0:0:',title:'Sää',begin_timestamp:now+1200,duration_sec:300}]},
 '/api/moviedelete':{result:true,message:'ok'},
 '/api/getservices':q=>q.sRef?{services:[{servicereference:'1:64:1:0:0:0:0:0:0:0:',servicename:'--- HD ---'},{servicereference:'1:0:19:11:1:20F6:EEEE0000:0:0:0:',servicename:'Yle TV1'},{servicereference:'1:0:19:12:1:20F6:EEEE0000:0:0:0:',servicename:'Yle TV2'}]}:{services:[{servicereference:'1:7:1:0:0:0:0:0:0:0:FROM BOUQUET "userbouquet.fav.tv"',servicename:'Suosikit'},{servicereference:'b2',servicename:'Kaikki'}]},
 '/api/epgnow':{events:[{sref:'1:0:19:11:1:20F6:EEEE0000:0:0:0:',title:'Uutiset',begin_timestamp:now-600,duration_sec:1800,shortdesc:'Päivän uutiset'}]}
};
const urls=[];
w.XMLHttpRequest=function(){this.readyState=0;};
w.XMLHttpRequest.prototype.open=function(m,u){this.u=u;urls.push(u)};
w.XMLHttpRequest.prototype.abort=function(){};
w.XMLHttpRequest.prototype.send=function(){const x=this;const url=new URL(x.u);const q=Object.fromEntries(url.searchParams);let r=R[url.pathname];if(typeof r=='function')r=r(q);
 x.readyState=4;x.status=r?200:404;x.responseText=JSON.stringify(r||{});x.onreadystatechange();};
w.eval(`var BOX_DEFAULT_HOST="192.168.1.10";var BOX_PLUGIN_VERSION="test";`);
for(const f of ['util','api','listview','player','subs','views','main']) w.eval(fs.readFileSync(W+'js/'+f+'.js','utf8'));
w.App.onLoad();
const $=id=>w.document.getElementById(id);
const key=c=>w.App.keyDown({keyCode:c});
const K=w.tvKey; const txt=id=>$(id).textContent.replace(/\s+/g,' ').trim();
const check=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
{const h=urls.find(u=>u.includes('/e2tvplayer/log?'));check(h&&decodeURIComponent(h).includes('start platform=orsay')&&decodeURIComponent(h).includes('lang=nav=fi-FI'),'käynnistysmerkintä boksin lokiin: '+(h?decodeURIComponent(h).slice(0,120):'-'));}
check($('list').querySelectorAll('.row').length===3,'juuri: kansio + 2 tallennetta (.Trash piilossa)');
check(txt('nowbar').includes('TALLENTAA'),'tilarivi: '+txt('nowbar'));
check(txt('crumb').includes('(2)'),'polku: '+txt('crumb'));
key(K.KEY_DOWN); check(txt('d-title')==='Elokuva <b>','tiedot + escapattu otsikko');
check(txt('d-desc').includes('Pitkä kuvaus'),'kuvaus');
key(K.KEY_UP); key(K.KEY_ENTER); check(txt('crumb').includes('Sarjat'),'kansioon: '+txt('crumb'));
check($('list').querySelectorAll('.row').length===2,'ylös-rivi + jakso');
key(K.KEY_RETURN); check(!w.__exited && txt('crumb').startsWith('Tallenteet ('),'RETURN = ylös');
check(w.Browser.list.current().type==='dir','valinta palasi kansioon');
key(K.KEY_DOWN); key(K.KEY_ENTER); check(w.Player.active,'toisto alkoi');
check(calls.some(c=>c==='Init http://192.168.1.10/file?file=%2Fmedia%2Fhdd%2Fmovie%2Fx%20y.ts'),'URL koodattu');
w.Player.onBufDone(); w.Player.onInfo(); w.Player.onTime(600000);
key(K.KEY_RIGHT); check(calls.includes('JF 15'),'kelaus eteen 15 s');
key(K.KEY_DOWN); check(calls.includes('JB 300'),'kelaus taakse 5 min');
w.Player.onTime(1200000); key(K.KEY_ENTER); check(w.Player.paused,'tauko');
key(K.KEY_RETURN); check(!w.Player.active && w.document.body.className==='','lopetus');
check(w.Store.getPos('/media/hdd/movie/x y.ts')===1200,'kohta tallessa: '+w.Store.getPos('/media/hdd/movie/x y.ts'));
check($('list').querySelector('.sel .bar'),'edistymispalkki näkyy');
key(K.KEY_ENTER); check(w.Dialog.isOpen && txt('dlg-buttons').includes('20:00'),'jatka-dialogi: '+txt('dlg-buttons'));
key(K.KEY_ENTER); check(calls.includes('Start 1195'),'jatkettiin kohdasta');
key(K.KEY_STOP);
// PTS-siirtymä
w.Player.play({title:'t',url:'u',key:'k2',length:100},0); w.Player.onTime(36000000); check(w.Player.pos===0,'PTS-siirtymä korjattu'); w.Player.onTime(36010000); check(w.Player.pos===10,'aika juoksee'); key(K.KEY_RETURN);
// poisto
key(K.KEY_DOWN); const before=$('list').querySelectorAll('.row').length;
key(K.KEY_RED); key(K.KEY_RIGHT); key(K.KEY_ENTER);
check($('list').querySelectorAll('.row').length===before-1 && urls.some(u=>u.includes('moviedelete')),'poisto');
key(K.KEY_GREEN); check(txt('crumb').includes('A–Ö'),'järjestys vaihtui');
// kanavat
key(K.KEY_YELLOW); check(txt('crumb')==='Kanavat' && $('list').querySelectorAll('.row').length===2,'nippulista');
key(K.KEY_ENTER); check($('list').querySelectorAll('.row').length===2,'välimerkki suodatettu');
check(txt('list').includes('Uutiset'),'EPG nyt: '+txt('list'));
key(K.KEY_ENTER); check(calls.some(c=>/^Init http:\/\/192\.168\.1\.10\/e2tvplayer\/live\?id=tv\d+&sref=1%3A0%3A19%3A11%3A1%3A20F6%3AEEEE0000%3A0%3A0%3A0%3A$/.test(c)),'live-striimi');
key(K.KEY_CH_DOWN); check(calls.some(c=>c.includes('sref=1%3A0%3A19%3A12')),'kanavanvaihto');
key(K.KEY_RETURN); key(K.KEY_RETURN); check(txt('crumb')==='Kanavat','takaisin nippuihin'); key(K.KEY_RETURN);
check(txt('crumb').startsWith('Tallenteet'),'takaisin tallenteisiin');
// asetukset
key(K.KEY_BLUE); check($('settings').style.display==='block','asetukset');
key(K.KEY_1);key(K.KEY_0);key(K.KEY_0); key(K.KEY_RIGHT);key(K.KEY_RIGHT);key(K.KEY_RIGHT);
key(K.KEY_8);key(K.KEY_0);key(K.KEY_8);key(K.KEY_0);
check(w.Views.settings.value()==='100.168.1.10:8080','IP-editori: '+w.Views.settings.value());
key(K.KEY_RED); check(w.Views.settings.value()==='192.168.1.10','palauta oletus');
key(K.KEY_ENTER); check(txt('crumb').startsWith('Tallenteet'),'tallennus + paluu');
key(K.KEY_RETURN); check(!w.__exited && w.Dialog.isOpen && txt('dlg-title').includes('Lopetetaanko'),'juuressa RETURN kysyy');
key(K.KEY_RIGHT); key(K.KEY_ENTER); check(!w.__exited && !w.Dialog.isOpen,'Ei = jatketaan');
// EXIT toistosta -> lista, listasta -> kysely, EXIT kyselyssä -> lopetus TV:hen
w.Views.movies.render(w.Browser.list.items.findIndex(i=>i.type==='movie')); key(K.KEY_ENTER); if(w.Dialog.isOpen) key(K.KEY_ENTER); check(w.Player.active,'toisto EXIT-testiin');
key(K.KEY_EXIT); check(!w.Player.active && !w.Dialog.isOpen && !w.__exited,'EXIT toistosta palaa listaan');
key(K.KEY_EXIT); check(w.Dialog.isOpen && !w.__exited,'EXIT listassa kysyy');
key(K.KEY_RETURN); check(!w.Dialog.isOpen && !w.__exited,'RETURN peruu kyselyn');
key(K.KEY_EXIT); key(K.KEY_ENTER); check(w.__exited==='exit','Kyllä lopettaa TV-kuvaan');
w.__exited=false; key(K.KEY_EXIT); key(K.KEY_EXIT); check(w.__exited==='exit','EXIT kahdesti lopettaa');
w.__exited=false; key(K.KEY_RETURN); key(K.KEY_ENTER); check(w.__exited==='return','RETURN+Kyllä palaa Smart Hubiin');

// --- 0.1.001 ---
check(w.document.body.style.zoom==='0.8','auto-skaalaus 1024 px -> 0.8 ('+w.document.body.style.zoom+')');
w.Views.movies.render(w.Browser.list.items.findIndex(i=>i.title==='Elokuva <b>'));
const dd=$('d-desc').textContent; check(dd.includes('Näyttelijät: Rose Nieminen, Mikko Heino') && dd.includes('Ohjaaja: X Y') && !dd.includes('actor'),'näyttelijät muotoiltu: '+JSON.stringify(dd));
key(K.KEY_ENTER); if(w.Dialog.isOpen) key(K.KEY_ENTER); w.Player.onInfo(); w.Player.onBufDone();
key(K.KEY_INFO); check($('info').style.display==='block' && txt('i-desc').includes('Näyttelijät'),'INFO-paneeli: '+txt('i-meta'));
key(K.KEY_RETURN); check(w.Player.active && $('info').style.display==='none','RETURN sulkee INFOn, toisto jatkuu');
key(K.KEY_TOOLS); check($('tracks').style.display==='block','TOOLS avaa raitavalikon');
check(txt('tr-rows').includes('suomi (fin)') && txt('tr-diag').includes('ääni=2'),'raidat: '+txt('tr-rows')+' | '+txt('tr-diag'));
key(K.KEY_RIGHT);check(calls.includes('SID 1,1') && txt('tr-rows').includes('alkuperäinen'),'ääniraita vaihtui');
key(K.KEY_DOWN); key(K.KEY_RIGHT); check(calls.includes('SID 5,0'),'tekstitys päälle');
w.Player.onSubtitle('Hei<br>maailma'); check($('subs').style.display==='block' && $('subs').innerHTML.includes('<br>'),'tekstiteksti piirretään');
key(K.KEY_RIGHT); check(calls.includes('SID 5,-1') && $('subs').style.display==='none','tekstitys pois');
key(K.KEY_RETURN); check($('tracks').style.display==='none' && w.Player.active,'valikko suljettu');
key(K.KEY_MENU); check($('tracks').style.display==='none','MENU jää TV:lle');
key(K.KEY_RETURN); check(!w.Player.active,'toisto lopetettu');
// live-info
key(K.KEY_YELLOW); if(txt('crumb')==='Kanavat') key(K.KEY_ENTER); key(K.KEY_UP); key(K.KEY_DOWN);
while(w.Browser.list.current().s.servicename!=='Yle TV1') key(K.KEY_DOWN);
key(K.KEY_ENTER); key(K.KEY_INFO);
check(txt('i-title')==='Uutiset' && txt('i-next').includes('Seuraavaksi') && txt('osd-time').startsWith('LIVE '),'live INFO: '+txt('i-meta')+' / '+txt('i-next'));
key(K.KEY_RETURN); key(K.KEY_RETURN); key(K.KEY_RETURN); key(K.KEY_RETURN);
// asetukset: näytön koko
key(K.KEY_BLUE); key(K.KEY_GREEN); check(w.Screen.mode()==='1280' && w.document.body.style.zoom==='','1280-tila'); key(K.KEY_GREEN);
check(w.document.body.style.zoom==='0.75' && txt('s-info').includes('960'),'960-tila: '+txt('s-info'));
key(K.KEY_GREEN); key(K.KEY_RETURN);
const errs=log.filter(l=>/error|failed/i.test(l)); check(!errs.length,'ei virhelokia '+errs.join('|'));

process.exit(process.exitCode||0);
