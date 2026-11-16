// Headless Edge at phone size: KIA career to the trade deadline, one user trade, then the trade screens.
// usage: node tools/shots/trade.js <outdir>   (needs the local server on :8765: preview kbo-game)
const {spawn}=require('child_process'), fs=require('fs'), path=require('path'), os=require('os');
const OUT=process.argv[2];
// skip this release's popup: read its ids from design/info.js
const INFO=fs.readFileSync(path.join(__dirname,'..','..','design','info.js'),'utf8'), PLAN_ID=INFO.match(/PLAN_ID = '([^']+)'/)[1], NOTICE_ID=INFO.match(/{id: '([^']+)'/)[1]; fs.mkdirSync(OUT,{recursive:true});
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
const PORT=9334, prof=fs.mkdtempSync(path.join(os.tmpdir(),'edge-shot-'));
const edge=spawn(EDGE,['--headless=new','--remote-debugging-port='+PORT,'--user-data-dir='+prof,'--no-first-run','--hide-scrollbars','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let list; for(let i=0;i<40;i++){ try{ list=await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if(list.length) break; }catch(e){} await sleep(250); }
  const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r);
  let id=0; const wait={}; ws.onmessage=m=>{ const d=JSON.parse(m.data); if(d.id&&wait[d.id]){ wait[d.id](d); delete wait[d.id]; } };
  const cmd=(method,params={})=>new Promise(r=>{ const i=++id; wait[i]=r; ws.send(JSON.stringify({id:i,method,params})); });
  const js=async(expr)=>{ const r=await cmd('Runtime.evaluate',{expression:`(async()=>{${expr}})()`,awaitPromise:true,returnByValue:true}); if(r.result&&r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0,600)); return r.result&&r.result.result&&r.result.result.value; };
  const shot=async(name)=>{ await sleep(600); const r=await cmd('Page.captureScreenshot',{format:'png'}); fs.writeFileSync(path.join(OUT,name),Buffer.from(r.result.data,'base64')); console.log('saved',name); };
  await cmd('Page.enable'); await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await cmd('Page.navigate',{url:'http://localhost:8765/'}); await sleep(2500);
  await js(`localStorage.clear(); localStorage.setItem('kbo-gate', JSON.stringify({token:'local-test', id:null})); localStorage.setItem('kbo-upcoming',${JSON.stringify(PLAN_ID)}); localStorage.setItem('kbo-notice-seen',${JSON.stringify(NOTICE_ID)}); localStorage.setItem('kbo-track-off','1');`);
  await cmd('Page.reload'); await sleep(2500);
  await js(`const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='접속하기'); if(b) b.click(); await new Promise(r=>setTimeout(r,1000)); FM.setupPick('KIA'); FM.setupStart(); await new Promise(r=>setTimeout(r,1200)); try{FM.guideSkip()}catch(e){} App.closeModal&&App.closeModal(); FM.quickStart(); await new Promise(r=>setTimeout(r,2500));`);
  for(const n of [20,40,60,80,100]) await js(`App.userGames(20); for(let i=0;i<150;i++){ await new Promise(r=>setTimeout(r,700)); const g=state.season[USER]; if(g.W+g.L+g.T>=${n}) break; const ok=[...document.querySelectorAll('.modal-bg button')].find(x=>/확인|진행|계속/.test(x.textContent)); if(ok) ok.click(); }`);
  console.log(await js(`while(document.querySelector('.modal-bg')) App.closeModal(); let done='none';
    outer: for(const t of K.TEAM_IDS.filter(x=>x!==USER)) for(const a of K.ROSTERS[USER].batters) for(const b of K.ROSTERS[t].batters){
      if(a.age<29||K.ovr(b)<K.ovr(a)-2) continue; const v=FM.tradeVerdict(t,[a],[b]); if(v.ok){ const why=FM.doTrade(t,[a.n],[b.n]); done=why||(a.n+' -> '+t+' for '+b.n); break outer; } }
    FM.tradeReact(); const log=state.fm.tradeLog||[]; return JSON.stringify({done, total:log.length, ai:log.filter(x=>x.kind==='ai').length, phase:state.phase, played:state.season[USER].W+state.season[USER].L});`));
  await js(`App.tab('trade'); await new Promise(r=>setTimeout(r,600)); window.scrollTo(0,0);`);
  await shot('t1-trade-tab.png');
  // pick a proposal so the verdict and its reason show
  await js(`const sel=document.querySelector('.trade-side input[type=checkbox], .trade-side button'); if(sel) sel.click(); await new Promise(r=>setTimeout(r,400)); const d=document.querySelector('.deal-result'); d&&d.scrollIntoView({block:'center'});`);
  await shot('t2-verdict.png');
  await js(`const c=document.querySelector('.th-card'); c&&c.scrollIntoView({block:'start'});`);
  await shot('t3-trade-history.png');
  await js(`const d=[...document.querySelectorAll('.th-fans')][0]; if(d){ d.open=true; d.closest('.th-row').scrollIntoView({block:'start'}); }`);
  await shot('t4-fan-posts.png');
  console.log(await js(`const f=(state.fm.feed||[]).filter(x=>/트레이드 평가/.test(x.title)).slice(0,3).map(x=>x.title+' || '+x.body); return JSON.stringify(f);`));
  ws.close(); edge.kill();
})().catch(e=>{ console.error(e); edge.kill(); process.exit(1); });
