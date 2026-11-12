const fs=require('fs'), {JSDOM}=require('jsdom');
const W=require('path').resolve(__dirname,'../../enigma2/src/E2TVPlayer/widget')+'/';
let html=fs.readFileSync(W+'index.html','utf8').replace(/<script[^>]*><\/script>/g,'');
const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost/'});
const w=dom.window; Object.defineProperty(w.navigator,'language',{get:()=>process.env.E2LANG||'en-US'}); const log=[];
w.console.log=(...a)=>log.push(a.join(' '));
// Orsay APIs
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
let timers=[];
const now=Math.floor(Date.now()/1000);
const R={
 '/api/statusinfo':{currservice_station:'Yle TV1',currservice_name:'News',isRecording:'true',inStandby:'false'},
 '/api/movielist':q=>q.dirname&&q.dirname.indexOf('Series')>0?{directory:'/media/hdd/movie/Series/',bookmarks:[],movies:[{filename:'/media/hdd/movie/Series/a.ts',eventname:'Series episode 1',servicename:'MTV3',recordingtime:now-9000,length:'45:00',filesize:2e9,serviceref:'1:0:0:0:0:0:0:0:0:0:/media/hdd/movie/Series/a.ts'}]}:
   {directory:'/media/hdd/movie/',bookmarks:['Series','.Trash'],movies:[
    {filename:'/media/hdd/movie/x y.ts',eventname:'Movie <b>',description:'Short',descriptionExtended:'Long description. How will Laura do?actor: Rose Nieminenactor: Mikko Heinodirector: X Y',servicename:'Yle TV2',recordingtime:now-3600,length:'1:40:00',filesize:5e9,filesize_readable:'4,7 GB',serviceref:'1:0:0:0:0:0:0:0:0:0:/media/hdd/movie/x y.ts'},
    {filename:'/media/hdd/movie/b.ts',eventname:'Morning TV',servicename:'MTV3',recordingtime:now-90000,length:'',filesize:1e8,serviceref:'1:0:0:0:0:0:0:0:0:0:/media/hdd/movie/b.ts'}]},
 '/api/epgnext':{events:[{sref:'1:0:19:11:1:20F6:EEEE0000:0:0:0:',title:'Weather',begin_timestamp:now+1200,duration_sec:300}]},
 '/api/moviedelete':{result:true,message:'ok'},
 '/api/getservices':q=>q.sRef?{services:[{servicereference:'1:64:1:0:0:0:0:0:0:0:',servicename:'--- HD ---'},{servicereference:'1:0:19:11:1:20F6:EEEE0000:0:0:0:',servicename:'Yle TV1'},{servicereference:'1:0:19:12:1:20F6:EEEE0000:0:0:0:',servicename:'Yle TV2'}]}:{services:[{servicereference:'1:7:1:0:0:0:0:0:0:0:FROM BOUQUET "userbouquet.fav.tv"',servicename:'Suosikit'},{servicereference:'b2',servicename:'Kaikki'}]},
 '/api/epgservice':q=>q.sRef.indexOf(':11:')>0?{events:[{id:101,title:'News',begin_timestamp:now-600,duration_sec:1800,shortdesc:'Daily news',longdesc:'The news of the day.'},{id:102,title:'Weather',begin_timestamp:now+1200,duration_sec:600,shortdesc:'',longdesc:'Rain.'},{id:103,title:'Late film',begin_timestamp:now+1800,duration_sec:5400,longdesc:'A film.'}]}:{events:[{id:201,title:'Sports',begin_timestamp:now-1200,duration_sec:7200,longdesc:'Football.'}]},
 '/api/timerlist':()=>({timers:timers.slice()}),
 '/api/timeraddbyeventid':q=>{timers.push({serviceref:q.sRef,begin:now+1200-120,end:now+1800+300,eit:Number(q.eventid),name:'Weather'});return {result:true,message:'Timer added'};},
 '/api/timerdelete':q=>{timers=timers.filter(t=>String(t.begin)!==q.begin);return {result:true,message:'Timer deleted'};},
 '/api/epgnow':{events:[{sref:'1:0:19:11:1:20F6:EEEE0000:0:0:0:',title:'News',begin_timestamp:now-600,duration_sec:1800,shortdesc:'Daily news'}]}
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
{const h=urls.find(u=>u.includes('/e2tvplayer/log?'));check(h&&decodeURIComponent(h).includes('start platform=orsay')&&decodeURIComponent(h).includes('nav=en-US'),'start-up entry in the box log: '+(h?decodeURIComponent(h).slice(0,120):'-'));}
check($('list').querySelectorAll('.row').length===3,'root: folder + 2 recordings (.Trash hidden)');
check(txt('nowbar').includes('RECORDING'),'status bar: '+txt('nowbar'));
check(txt('crumb').includes('(2)'),'path: '+txt('crumb'));
key(K.KEY_DOWN); check(txt('d-title')==='Movie <b>','details + escaped title');
check(txt('d-desc').includes('Long description'),'description');
key(K.KEY_UP); key(K.KEY_ENTER); check(txt('crumb').includes('Series'),'into the folder: '+txt('crumb'));
check($('list').querySelectorAll('.row').length===2,'up row + episode');
key(K.KEY_RETURN); check(!w.__exited && txt('crumb').startsWith('Recordings ('),'RETURN = up');
check(w.Browser.list.current().type==='dir','selection back on the folder');
key(K.KEY_DOWN); key(K.KEY_ENTER); check(w.Player.active,'playback started');
check(calls.some(c=>c==='Init http://192.168.1.10/file?file=%2Fmedia%2Fhdd%2Fmovie%2Fx%20y.ts'),'URL encoded');
w.Player.onBufDone(); w.Player.onInfo(); w.Player.onTime(600000);
key(K.KEY_RIGHT); check(calls.includes('JF 15'),'skip forward 15 s');
key(K.KEY_DOWN); check(calls.includes('JB 300'),'skip back 5 min');
w.Player.onTime(1200000); key(K.KEY_ENTER); check(w.Player.paused,'pause');
key(K.KEY_RETURN); check(!w.Player.active && w.document.body.className==='','stop');
check(w.Store.getPos('/media/hdd/movie/x y.ts')===1200,'position saved: '+w.Store.getPos('/media/hdd/movie/x y.ts'));
check($('list').querySelector('.sel .bar'),'progress bar shown');
key(K.KEY_ENTER); check(w.Dialog.isOpen && txt('dlg-buttons').includes('20:00'),'resume dialog: '+txt('dlg-buttons'));
key(K.KEY_ENTER); check(calls.includes('Start 1195'),'resumed from the position');
key(K.KEY_STOP);
// PTS offset
w.Player.play({title:'t',url:'u',key:'k2',length:100},0); w.Player.onTime(36000000); check(w.Player.pos===0,'PTS offset corrected'); w.Player.onTime(36010000); check(w.Player.pos===10,'time runs'); key(K.KEY_RETURN);
// delete
key(K.KEY_DOWN); const before=$('list').querySelectorAll('.row').length;
key(K.KEY_RED); key(K.KEY_RIGHT); key(K.KEY_ENTER);
check($('list').querySelectorAll('.row').length===before-1 && urls.some(u=>u.includes('moviedelete')),'delete');
key(K.KEY_GREEN); check(txt('crumb').includes('A–Z'),'sort order changed');
// channels
key(K.KEY_YELLOW); check(txt('crumb')==='Channels' && $('list').querySelectorAll('.row').length===2,'bouquet list');
key(K.KEY_ENTER); check($('list').querySelectorAll('.row').length===2,'marker filtered out');
check(txt('list').includes('News'),'EPG now: '+txt('list'));
key(K.KEY_ENTER); check(calls.some(c=>/^Init http:\/\/192\.168\.1\.10\/e2tvplayer\/live\?id=tv\d+&sref=1%3A0%3A19%3A11%3A1%3A20F6%3AEEEE0000%3A0%3A0%3A0%3A$/.test(c)),'live stream');
key(K.KEY_CH_DOWN); check(calls.some(c=>c.includes('sref=1%3A0%3A19%3A12')),'channel change');
key(K.KEY_RETURN); key(K.KEY_RETURN); check(txt('crumb')==='Channels','back to bouquets'); key(K.KEY_RETURN);
check(txt('crumb').startsWith('Recordings'),'back to recordings');
// programme guide: yellow cycles recordings -> channels -> guide -> recordings
// TOOLS in the lists: language and the audio/subtitle preferences
key(K.KEY_TOOLS);
check(txt('tr-rows').includes('Audio◀ automatic ▶') && txt('tr-rows').includes('1st choice◀ original ▶') && txt('tr-rows').includes('2nd choice◀ English ▶'),'TOOLS in the list: audio preferences: '+txt('tr-rows'));
key(K.KEY_DOWN); key(K.KEY_RIGHT);
check(txt('tr-rows').includes('Audio◀ as last time ▶') && !txt('tr-rows').includes('original'),'audio: as last time hides the choices');
key(K.KEY_LEFT); key(K.KEY_DOWN); key(K.KEY_DOWN); key(K.KEY_DOWN); key(K.KEY_DOWN); key(K.KEY_RIGHT);
check(w.Store.get('p_sub1')==='fi','subtitles 1st choice changed: '+w.Store.get('p_sub1'));
w.Store.set('p_sub1',''); key(K.KEY_RETURN);
key(K.KEY_YELLOW); key(K.KEY_YELLOW);
check(w.App.view==='epg' && $('epg').style.display==='block' && $('browser').style.display==='none','guide opened with the yellow key');
check(txt('crumb')==='Programme guide › Suosikit' && $('epg-grid').querySelectorAll('.epg-ch').length===2,'guide: bouquet and channels: '+txt('crumb'));
check(urls.some(u=>u.includes('/api/epgservice?sRef=1%3A0%3A19%3A11')),'guide: channel events loaded');
check(txt('epg-i-title')==='News' && $('epg-grid').querySelector('.epg-ev.sel.now'),'guide: the running programme selected: '+txt('epg-i-title')+' / '+$('epg-grid').innerHTML.slice(0,400));
check($('epg-grid').querySelector('.epg-nowline'),'guide: now line');
key(K.KEY_RIGHT); check(txt('epg-i-title')==='Weather','guide: right = next programme: '+txt('epg-i-title'));
key(K.KEY_RED); check(calls.concat(urls).some(u=>u.includes('/api/timeraddbyeventid')&&u.includes('eventid=102')),'guide: red adds a timer for the event');
check($('epg-grid').querySelector('.epg-ev.sel.rec') && txt('epg-i-meta').includes('Timer set'),'guide: timer marked: '+txt('epg-i-meta'));
key(K.KEY_RED); check(calls.concat(urls).some(u=>u.includes('/api/timerdelete')) && !$('epg-grid').querySelector('.epg-ev.rec'),'guide: red again deletes the timer');
key(K.KEY_ENTER); check(w.Dialog.isOpen && txt('dlg-title')==='Weather','guide: OK on a coming programme shows its info');
key(K.KEY_RETURN); key(K.KEY_LEFT); check(txt('epg-i-title')==='News','guide: left = previous');
key(K.KEY_DOWN); check(txt('epg-i-title')==='Sports' && txt('epg-i-meta').startsWith('Yle TV2'),'guide: down = next channel');
key(K.KEY_FF); check(w.Views.epg.t0>=w.Views.epg.floor30(now)+7200,'guide: FF = +2 h');
key(K.KEY_RW); key(K.KEY_RW); check(w.Views.epg.t0===w.Views.epg.floor30(now),'guide: RW stops at now');
w.Views.channels.now={}; w.Views.channels.next={}; w.Views.channels.bouquet=null;  // as if the bouquet was never opened in the channel list
key(K.KEY_UP); key(K.KEY_ENTER); check(w.Player.active && calls.some(c=>c.includes('live?')&&c.includes('sref=1%3A0%3A19%3A11')),'guide: OK on the running programme plays the channel');
key(K.KEY_INFO); check(txt('i-title')==='News' && txt('i-meta').includes('remaining'),'guide -> live: INFO shows the running programme: '+txt('i-title'));
key(K.KEY_INFO);
key(K.KEY_RETURN); check(!w.Player.active && w.App.view==='epg' && $('epg').style.display==='block','guide: back to the guide after playback');
key(K.KEY_YELLOW); check(w.App.view==='movies' && $('epg').style.display==='none' && $('browser').style.display==='block','guide: yellow -> recordings');
// settings
key(K.KEY_BLUE); check($('settings').style.display==='block','settings');
key(K.KEY_1);key(K.KEY_0);key(K.KEY_0); key(K.KEY_RIGHT);key(K.KEY_RIGHT);key(K.KEY_RIGHT);
key(K.KEY_8);key(K.KEY_0);key(K.KEY_8);key(K.KEY_0);
check(w.Views.settings.value()==='100.168.1.10:8080','IP editor: '+w.Views.settings.value());
key(K.KEY_RED); check(w.Views.settings.value()==='192.168.1.10','reset to default');
key(K.KEY_ENTER); check(txt('crumb').startsWith('Recordings'),'save + return');
key(K.KEY_RETURN); check(!w.__exited && w.Dialog.isOpen && txt('dlg-title').includes('Quit'),'RETURN at the root asks');
key(K.KEY_RIGHT); key(K.KEY_ENTER); check(!w.__exited && !w.Dialog.isOpen,'No = continue');
// EXIT from playback -> list, from the list -> dialog, EXIT in the dialog -> quit to TV
w.Views.movies.render(w.Browser.list.items.findIndex(i=>i.type==='movie')); key(K.KEY_ENTER); if(w.Dialog.isOpen) key(K.KEY_ENTER); check(w.Player.active,'playback for the EXIT test');
key(K.KEY_EXIT); check(!w.Player.active && !w.Dialog.isOpen && !w.__exited,'EXIT from playback returns to the list');
key(K.KEY_EXIT); check(w.Dialog.isOpen && !w.__exited,'EXIT in the list asks');
key(K.KEY_RETURN); check(!w.Dialog.isOpen && !w.__exited,'RETURN cancels the dialog');
key(K.KEY_EXIT); key(K.KEY_ENTER); check(w.__exited==='exit','Yes quits to TV');
w.__exited=false; key(K.KEY_EXIT); key(K.KEY_EXIT); check(w.__exited==='exit','EXIT twice quits');
w.__exited=false; key(K.KEY_RETURN); key(K.KEY_ENTER); check(w.__exited==='return','RETURN+Yes returns to the Smart Hub');

// --- 0.1.001 ---
check(w.document.body.style.zoom==='0.8','auto scaling 1024 px -> 0.8 ('+w.document.body.style.zoom+')');
w.Views.movies.render(w.Browser.list.items.findIndex(i=>i.title==='Movie <b>'));
const dd=$('d-desc').textContent; check(dd.includes('Cast: Rose Nieminen, Mikko Heino') && dd.includes('Director: X Y') && !dd.includes('actor'),'cast formatted: '+JSON.stringify(dd));
key(K.KEY_ENTER); if(w.Dialog.isOpen) key(K.KEY_ENTER); w.Player.onInfo(); w.Player.onBufDone();
key(K.KEY_INFO); check($('info').style.display==='block' && txt('i-desc').includes('Cast'),'INFO panel: '+txt('i-meta'));
key(K.KEY_RETURN); check(w.Player.active && $('info').style.display==='none','RETURN closes INFO, playback continues');
key(K.KEY_TOOLS); check($('tracks').style.display==='block','TOOLS opens the track menu');
check(calls.includes('SID 1,1') && txt('tr-rows').includes('original (qaa)') && txt('tr-diag').includes('audio=2'),'audio preference: original picked automatically: '+txt('tr-rows')+' | '+txt('tr-diag'));
key(K.KEY_RIGHT);check(calls.includes('SID 1,0') && txt('tr-rows').includes('Finnish (fin)'),'audio track changed by hand');
key(K.KEY_DOWN); key(K.KEY_RIGHT); check(calls.includes('SID 5,0'),'subtitles on');
w.Player.onSubtitle('Hello<br>world'); check($('subs').style.display==='block' && $('subs').innerHTML.includes('<br>'),'text subtitle drawn');
key(K.KEY_RIGHT); check(calls.includes('SID 5,-1') && $('subs').style.display==='none','subtitles off');
key(K.KEY_RETURN); check($('tracks').style.display==='none' && w.Player.active,'menu closed');
key(K.KEY_MENU); check($('tracks').style.display==='none','MENU stays with the TV');
key(K.KEY_RETURN); check(!w.Player.active,'playback stopped');
// live info
key(K.KEY_YELLOW); if(txt('crumb')==='Channels') key(K.KEY_ENTER); key(K.KEY_UP); key(K.KEY_DOWN);
while(w.Browser.list.current().s.servicename!=='Yle TV1') key(K.KEY_DOWN);
key(K.KEY_ENTER); key(K.KEY_INFO);
check(txt('i-title')==='News' && txt('i-next').includes('Next') && txt('osd-time').startsWith('LIVE '),'live INFO: '+txt('i-meta')+' / '+txt('i-next'));
key(K.KEY_RETURN); key(K.KEY_RETURN); key(K.KEY_RETURN); key(K.KEY_RETURN);
// settings: screen size
key(K.KEY_BLUE); key(K.KEY_GREEN); check(w.Screen.mode()==='1280' && w.document.body.style.zoom==='','1280 mode'); key(K.KEY_GREEN);
check(w.document.body.style.zoom==='0.75' && txt('s-info').includes('960'),'960 mode: '+txt('s-info'));
key(K.KEY_GREEN); key(K.KEY_RETURN);
const errs=log.filter(l=>/error|failed/i.test(l)); check(!errs.length,'no error log '+errs.join('|'));

process.exit(process.exitCode||0);
