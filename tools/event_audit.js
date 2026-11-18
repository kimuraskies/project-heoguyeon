'use strict';
const assert=require('node:assert/strict');
const {eventRuntime}=require('../qa/event-runtime');
const fixtures=require('./tests/event-fixtures');
const LIMIT={mor:15,fans:5,conf:5,money:10,stat:3};
const KNOWN=new Set(['mor','cond','fans','conf','money','flag','inj','stat','list','sal','chance']);
const STATS=new Set(['pow','con','eye','spd','fld','arm','stu','ctl','mov','sta']);
// Sum all effects in one choice, including the worst reachable branch of nested chances.
function fxBounds(fx){
  assert(Array.isArray(fx),'fx must be an array');const totals={};
  const add=(key,lo,hi)=>{const v=totals[key]||(totals[key]=[0,0]);v[0]+=lo;v[1]+=hi;};
  for(const x of fx){assert(Array.isArray(x)&&KNOWN.has(x[0]),'unknown fx '+JSON.stringify(x));const [k,a,b,d]=x;
    if(k==='chance'){assert(Number.isFinite(a)&&a>=0&&a<=1,'chance probability');const yes=fxBounds(b),no=fxBounds(d);
      for(const key of new Set(Object.keys(yes).concat(Object.keys(no)))){const u=yes[key]||[0,0],v=no[key]||[0,0];add(key,Math.min(u[0],v[0]),Math.max(u[1],v[1]));}continue;}
    if(k==='stat')assert(STATS.has(b),'unknown stat '+b);
    if(['mor','cond','inj','stat','list','sal'].includes(k))assert(a&&a.n&&a.t,'missing player reference');
    const delta=k==='stat'?d:['mor','cond','inj','sal'].includes(k)?b:a;
    if(!['flag','list'].includes(k))assert(Number.isFinite(delta),'non-numeric fx '+k);
    if(LIMIT[k]){const key=k+(['mor','stat'].includes(k)?'|'+a.t+'|'+a.n+(k==='stat'?'|'+b:''):'');add(key,delta,delta);}
  }
  return totals;
}
function validateCard(card,templates){
  assert(card&&Array.isArray(card.opts)&&card.opts.length,'make failed or empty choices');
  for(const opt of card.opts){assert(typeof opt.l==='string'&&opt.l&&typeof opt.d==='string'&&opt.d,'choice l/d missing');
    if(opt.then)assert(templates.some(t=>t.id===opt.then.id),'missing then id '+opt.then.id);
    for(const [key,[lo,hi]] of Object.entries(fxBounds(opt.fx||[]))){const limit=LIMIT[key.split('|')[0]];assert(lo>=-limit&&hi<=limit,'fx limit '+key+': '+lo+'..'+hi);}
  }
}
function auditDataset(name,factory){
  const env=eventRuntime(factory),counts={},rows=[];let kept=0,broken=0;
  try{
    for(let career=0;career<5;career++){
      const seed=20261118+career,h=new env.Runtime({seed,label:name+'-'+(career+1),observe:false}).start();
      // Both passes begin from the identical serialized save and game RNG state.
      h.App.save();const storage=new Map(h.storage),rng=h.rng;
      const run=rt=>{
        const E=rt.ctx.__events,templates=E.templates(),sequence=[],seen=new Map(),outcomes=[];let logAt=0,previousFlags={};
        rt.ctx.__eventAudit=(t,card)=>{if(card)validateCard(card,templates);};
        const check=()=>{
          const e=E.state();
          for(const [id,years] of Object.entries(e.seen)){const t=templates.find(t=>t.id===id);assert(t,'unregistered event '+id);
            assert.equal(new Set(years).size,years.length,'duplicate event in season '+id);
            const cool=Math.max(t.rarity==='rare'?4:0,t.cool==null?2:t.cool);
            for(let i=1;i<years.length;i++)assert(years[i]-years[i-1]>=cool,'cooldown '+id);
            seen.set(id,years.length);
          }
          for(const p of e.pending){assert(templates.some(t=>t.id===p.id),'pending target '+p.id);assert(rt.state.year-(p.year||rt.state.year)<=1,'pending older than one season');}
          for(const m of rt.state.fm.inbox)if(m.event)validateCard(m.event,templates);
          for(const card of rt.state.fm.off?.q||[])if(card._evt)validateCard(card,templates);
          sequence.push(...e.log.slice(logAt).map(x=>[x.year,x.id,x.choice]));logAt=e.log.length;
          const flags=Object.fromEntries(Object.entries(e.flags).filter(([key])=>key.startsWith('promise:')));
          for(const [key,value] of Object.entries(flags))if(!Object.hasOwn(previousFlags,key)||previousFlags[key]!==value)outcomes.push(value);
          previousFlags=flags;
        };
        rt.observers.push(check);
        const afterGame=rt.FM.afterGame;
        rt.FM.afterGame=res=>{const out=afterGame(res);if(res.home===rt.user||res.away===rt.user){
          for(const m of rt.state.fm.inbox.slice())if(!m.done&&m.event)rt.FM.act(m.id,career%2?m.actions.length-1:0);
          check();
        }return out;};
        for(let y=0;y<5;y++){
          rt.spring();
          // Runtime's existing real-game automatic progression; decisions use a fixed policy.
          rt.action('event audit regular season',()=>{rt.App.simRest();rt.FM.answer();});
          assert.equal(rt.state.phase,'postseason','regular season incomplete');rt.action('event audit postseason',()=>rt.App.psAuto(true));check();
          if(y<4)rt.nextSeason();
        }
        assert(!rt.warnings.some(w=>w.includes('offseason event failed')),'offseason handler error');
        return {sequence,seen:Object.fromEntries(seen),kept:outcomes.filter(Boolean).length,broken:outcomes.filter(v=>v===false).length,data:E.data().length};
      };
      const first=run(h),replay=new env.Runtime({seed,label:name+'-replay',storage:new Map(storage),observe:false});replay.rng=rng;
      const second=run(replay);assert.deepEqual(second.sequence,first.sequence,'same save/choices must reproduce event sequence');assert.deepEqual(second.seen,first.seen,'same save must reproduce appearances');
      const distinct=Object.keys(first.seen).length,total=Object.values(first.seen).reduce((a,b)=>a+b,0);
      if(first.data>=50)assert(distinct>=30,'fewer than 30 distinct events in five seasons');
      rows.push({career:career+1,total,distinct});for(const [id,n] of Object.entries(first.seen))counts[id]=(counts[id]||0)+n;
      kept+=first.kept;broken+=first.broken;
      console.log(name+' career '+(career+1)+': appearances='+total+', distinct='+distinct+', replay=PASS');
      if(career===0&&first.data<50)console.log(name+': 다양성 검사 건너뜀 (EVT_DATA '+first.data+'종, 50종 미만)');
    }
    console.log(name+' id | appearances');for(const id of Object.keys(counts).sort())console.log(id+' | '+counts[id]);
    console.log(name+' promises: kept='+kept+', broken='+broken);
    console.log(name+': PASS (5 careers x 5 seasons, plus save replay)');
    return {rows,counts,kept,broken};
  }finally{env.cleanup();}
}
if(require.main===module){try{
  auditDataset('fixtures',fixtures);
  // Always exercise the shipped engine, including its legacy fallback when data is absent.
  auditDataset('EVT_DATA',null);
  console.log('event audit: PASS');
}catch(error){console.error('event audit: FAIL\n'+error.stack);process.exitCode=1;}}
module.exports={fxBounds,validateCard,auditDataset};
