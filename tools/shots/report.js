// Headless Edge at phone size: start a KIA career on the local server, play 40 games, capture three screens.
// usage: node tools/shots/report.js <outdir>   (needs the local server on :8765: preview kbo-game)
const {spawn}=require('child_process'), fs=require('fs'), path=require('path'), os=require('os');
const OUT=process.argv[2];
// skip this release's popup: read its ids from design/info.js
const INFO=fs.readFileSync(path.join(__dirname,'..','..','design','info.js'),'utf8'), PLAN_ID=INFO.match(/PLAN_ID = '([^']+)'/)[1], NOTICE_ID=INFO.match(/{id: '([^']+)'/)[1]; fs.mkdirSync(OUT,{recursive:true});
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
const PORT=9333, prof=fs.mkdtempSync(path.join(os.tmpdir(),'edge-shot-'));
const edge=spawn(EDGE,['--headless=new','--remote-debugging-port='+PORT,'--user-data-dir='+prof,'--no-first-run','--hide-scrollbars','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let list; for(let i=0;i<40;i++){ try{ list=await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if(list.length) break; }catch(e){} await sleep(250); }
  const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r);
  let id=0; const wait={}; ws.onmessage=m=>{ const d=JSON.parse(m.data); if(d.id&&wait[d.id]){ wait[d.id](d); delete wait[d.id]; } };
  const cmd=(method,params={})=>new Promise(r=>{ const i=++id; wait[i]=r; ws.send(JSON.stringify({id:i,method,params})); });
  const js=async(expr)=>{ const r=await cmd('Runtime.evaluate',{expression:`(async()=>{${expr}})()`,awaitPromise:true,returnByValue:true}); if(r.result&&r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0,400)); return r.result&&r.result.result&&r.result.result.value; };
  const shot=async(name)=>{ await sleep(600); const r=await cmd('Page.captureScreenshot',{format:'png'}); fs.writeFileSync(path.join(OUT,name),Buffer.from(r.result.data,'base64')); console.log('saved',name); };
  await cmd('Page.enable'); await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await cmd('Page.navigate',{url:'http://localhost:8765/'}); await sleep(2500);
  await js(`localStorage.clear(); localStorage.setItem('kbo-gate', JSON.stringify({token:'local-test', id:null})); localStorage.setItem('kbo-upcoming',${JSON.stringify(PLAN_ID)}); localStorage.setItem('kbo-notice-seen',${JSON.stringify(NOTICE_ID)}); localStorage.setItem('kbo-track-off','1');`);
  await cmd('Page.reload'); await sleep(2500);
  await js(`const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='접속하기'); if(b) b.click(); await new Promise(r=>setTimeout(r,1000)); FM.setupPick('KIA'); FM.setupStart(); await new Promise(r=>setTimeout(r,1200)); try{FM.guideSkip()}catch(e){} App.closeModal&&App.closeModal(); FM.quickStart(); await new Promise(r=>setTimeout(r,2500));`);
  for(const n of [20,40]) await js(`App.userGames(20); for(let i=0;i<90;i++){ await new Promise(r=>setTimeout(r,800)); const g=state.season[USER]; if(g.W+g.L+g.T>=${n}) break; const ok=[...document.querySelectorAll('.modal-bg button')].find(x=>/확인|진행|계속/.test(x.textContent)); if(ok) ok.click(); }`);
  // 1. dashboard
  await js(`while(document.querySelector('.modal-bg')) App.closeModal(); App.tab('dash'); await new Promise(r=>setTimeout(r,500)); window.scrollTo(0,0);`);
  await shot('1-dashboard.png');
  // 2. pitcher profile: analysis tab, the pitch report
  await js(`const sp=state.season[USER].pit, best=Object.entries(sp).sort((a,b)=>b[1].OUT-a[1].OUT)[0][0]; FM.showProfile(USER,best); await new Promise(r=>setTimeout(r,400)); const btn=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='분석'); btn&&btn.click(); await new Promise(r=>setTimeout(r,600)); const an=document.querySelector('.an'); an&&an.scrollIntoView({block:'start'});`);
  await shot('2-pitcher-analysis-top.png');
  await js(`const h=document.querySelector('.sc-kpis'); h&&h.previousElementSibling.scrollIntoView({block:'start'});`);
  await shot('3-pitcher-pitch-report.png');
  await js(`const h=document.querySelector('.sc-heats'); h&&h.scrollIntoView({block:'center'});`);
  await shot('4-pitcher-heatmaps.png');
  // hitter: spray chart
  await js(`App.closeModal(); const b=Object.entries(state.season[USER].bat).sort((a,b)=>b[1].PA-a[1].PA)[0][0]; FM.showProfile(USER,b); await new Promise(r=>setTimeout(r,400)); const btn=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='분석'); btn&&btn.click(); await new Promise(r=>setTimeout(r,600)); const k=document.querySelector('.sc-kpis'); k&&k.previousElementSibling.scrollIntoView({block:'start'});`);
  await shot('5-hitter-batted-ball.png');
  await js(`const s=document.querySelector('.sc-spray'); s&&s.scrollIntoView({block:'center'});`);
  await shot('6-hitter-spray.png');
  // 3. live match
  await js(`App.closeModal(); App.tab('dash'); await new Promise(r=>setTimeout(r,300)); App.nextGame(); await new Promise(r=>setTimeout(r,1200)); const go=[...document.querySelectorAll('button')].find(x=>/경기 시작/.test(x.textContent)); if(go) go.click(); await new Promise(r=>setTimeout(r,1500)); for(let i=0;i<7;i++){ const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='한 타자'); if(!b) break; b.click(); await new Promise(r=>setTimeout(r,2500)); } const p=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='멈춤'); if(p) p.click(); window.scrollTo(0,0);`);
  await shot('7-live-match.png');
  console.log(await js(`return JSON.stringify({live:!!document.getElementById('relay'), tab:typeof currentTab!=='undefined'?currentTab:null, buttons:[...document.querySelectorAll('button')].map(x=>x.textContent.trim()).filter(Boolean).slice(0,25)})`));
  ws.close(); edge.kill();
})().catch(e=>{ console.error(e); edge.kill(); process.exit(1); });
