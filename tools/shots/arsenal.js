// Headless Edge at phone size: pitcher profiles showing the real pitch mix (and an estimate).
// usage: node tools/shots/arsenal.js <outdir>   (needs the local server on :8765: preview kbo-game)
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
  // pitcher profiles: real mix by description (양현종), tracked (페덱), and an estimate (김진수)
  const open=async(team,n)=>js(`while(document.querySelector('.modal-bg')) App.closeModal();
    FM.showProfile('${team}','${n}'); await new Promise(r=>setTimeout(r,600));
    const h=[...document.querySelectorAll('.muted')].find(x=>x.textContent.trim()==='보유 구종'); if(!h) return 'no pitch list for ${n}';
    h.scrollIntoView({block:'start'}); document.querySelectorAll('.toast').forEach(t=>t.remove()); return '${n} '+JSON.stringify(K.arsenal(K.getP('${team}','${n}')).map(t=>t.k+Math.round(t.use*100)));`);
  console.log(await open('KIA','양현종')); await shot('a1-yang.png');
  console.log(await open('삼성','페덱')); await shot('a2-paddack.png');
  console.log(await open('LG','김진수')); await shot('a3-estimate.png');
  ws.close(); edge.kill();
})().catch(e=>{ console.error(e); edge.kill(); process.exit(1); });
