'use strict';
// node tools/statcast_audit.js [seasons=3] [--fit] [--seed N] [--save-size]
// --fit prints empirical mean outcome weights for every EV x LA bucket. It never
// edits core.js. Fit seed 20261106; independent default validation seed 20261116.
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
require('../core.js');
const K=globalThis.KBO, {config,schedule}=require('./tests/helpers');
const args=process.argv.slice(2), fit=args.includes('--fit'), years=+(args.find((a,i)=>/^\d+$/.test(a)&&args[i-1]!=='--seed')||3);
const seedAt=args.indexOf('--seed'), seed=seedAt<0?(fit?20261106:20261116):+args[seedAt+1];
Math.random=K.statRNG(seed);
const totals={}, buckets=Array.from({length:6},()=>Array.from({length:6},()=>({n:0,w:0}))), pitches={};
const add=(o,k,n=1)=>o[k]=(o[k]||0)+n;
const weights={'1B':.88,BUNT1B:.88,'2B':1.24,'3B':1.56,HR:2.01};
const bucket=(v,edges)=>edges.filter(e=>v>=e).length;
let games=0;
for(let year=0;year<years;year++){
  const counts={};
  for(const [h,a] of schedule()){
    const g=new K.InteractiveGame(config(h,counts[h]||0),config(a,counts[a]||0));
    counts[h]=(counts[h]||0)+1; counts[a]=(counts[a]||0)+1;
    let guard=0;
    while(!g.over&&guard++<2000){
      const e=g.step(); if(!e) continue;
      for(const p of e.pitches){
        if(!p.code) continue;
        const s=pitches[p.code]||(pitches[p.code]={n:0,sw:0,wh:0,cs:0,z:0,v:0});
        add(s,'n'); add(s,'v',p.velo); add(s,'sw',+['SW','F','IP'].includes(p.res));
        add(s,'wh',+(p.res==='SW')); add(s,'cs',+(p.res==='S')); add(s,'z',+K.inPitchZone(p));
      }
      if(e.bb){
        const b=e.bb, bat=K.getB(e.off,e.batter); let side=K.handsOf(bat.n).b;
        if(side==='양') side=K.handsOf(e.pitcher).t==='좌'?'우':'좌';
        add(totals,'N'); add(totals,b.t); add(totals,K.bbDirection(b,side)); add(totals,'EV',b.ev); add(totals,'Hard',+(b.ev>=153));
        add(totals,'xw',K.xwOBA(b)); add(totals,'w',weights[e.oc]||0);
        const cell=buckets[bucket(b.ev,K.XW_EV)][bucket(b.la,K.XW_LA)]; cell.n++; cell.w+=weights[e.oc]||0;
        assert.ok(b.ang>=-45&&b.ang<=45&&Number.isFinite(b.ev));
        if(e.oc==='HR') assert.ok(['FB','LD'].includes(b.t)&&b.dist>K.statFence(b.ang),'HR clears fence');
        if(e.oc==='GIDP') assert.equal(b.t,'GB');
        if(e.oc==='SF') assert.ok(b.t==='FB'&&b.dist>=70&&b.dist<=100);
      }
    }
    assert.ok(g.over); games++;
  }
}
const p=Object.values(pitches).reduce((a,s)=>{for(const k in s)add(a,k,s[k]);return a;},{});
// Type percentages exclude bunts; quality/direction include every batted ball.
const n=totals.N-(totals.BU||0), pct=(v,d)=>100*v/d;
const measured={GB:pct(totals.GB,n),LD:pct(totals.LD,n),FB_PU:pct(totals.FB+totals.PU,n),PU:pct(totals.PU,n),
  Pull:pct(totals.Pull,totals.N),Center:pct(totals.Cent,totals.N),Oppo:pct(totals.Oppo,totals.N),EV:totals.EV/totals.N,
  Hard:pct(totals.Hard,totals.N),Zone:pct(p.z,p.n),Whiff:pct(p.wh,p.sw),CSW:pct(p.cs+p.wh,p.n)};
const targets={GB:[43,47],LD:[19,23],FB_PU:[30,36],PU:[7,11],Pull:[38,44],Center:[32,38],Oppo:[22,28],EV:[137,142],Hard:[30,40],Zone:[45,50],Whiff:[21,26],CSW:[27,31]};
console.log(`${years} seasons / ${games} games / ${totals.N} batted balls / ${p.n} pitches; seed ${seed}`);
for(const [k,v] of Object.entries(measured))console.log(`${k.padEnd(9)} ${v.toFixed(3)}  [${targets[k]}]`);
console.log('code    n      velo    whiff/swing    zone');
for(const [c,s] of Object.entries(pitches))console.log(c,s.n,(s.v/s.n).toFixed(2),pct(s.wh,s.sw).toFixed(2),pct(s.z,s.n).toFixed(2));
console.log(`BIP observed wOBA ${(totals.w/totals.N).toFixed(4)}; expected ${(totals.xw/totals.N).toFixed(4)}`);
if(!fit)assert.ok(Math.abs(totals.w-totals.xw)/totals.N<.015,'Held-out BIP xwOBA calibration error must stay below .015');
const report={seed,years,games,totals,measured,targets,pitches,buckets};
if(fit){
  // Empty cells fall back to the empirical LA-column mean (never an invented value).
  const cols=K.XW_TABLE[0].map((_,j)=>buckets.reduce((a,r)=>({n:a.n+r[j].n,w:a.w+r[j].w}),{n:0,w:0}));
  report.table=buckets.map(r=>r.map((c,j)=>+(c.n?c.w/c.n:cols[j].w/cols[j].n).toFixed(5)));
  console.log('XW_TABLE = '+JSON.stringify(report.table));
  console.log('Bucket counts = '+JSON.stringify(buckets.map(r=>r.map(c=>c.n))));
}
if(args.includes('--save-size')){
  const {Runtime}=require('../qa/runtime'), rt=new Runtime({seed,observe:false}).start('KIA'), sprays={};
  rt.spring();
  // Model the planned UI extraction: collect only user spray strings, last 400
  // per batter, before numeric merge. No app/save implementation is changed here.
  const sim=rt.K.simGame;
  rt.K.simGame=(...a)=>{const r=sim(...a);for(const [name,b] of Object.entries(r.box.KIA?.bat||{}))if(b.spr){sprays[name]=(sprays[name]||[]).concat(b.spr).slice(-400);}return r;};
  rt.App.simRest(); rt.FM.answer(); rt.App.save();
  const saved=JSON.parse(rt.storage.get('kbo_manager_save'));
  const isStat=k=>/^p(FF|SI|SL|CU|CH|FS|FC|SW|SP)_/.test(k)||/^z(FF|SI|SL|CU|CH|FS|FC|SW|SP)_[LR]_\d+$/.test(k)||/^bb(GB|LD|FB|PU|BU|Pull|Cent|Oppo|N|EV|Hard|Brl)$/.test(k)||k==='xw'||k==='spr';
  const json=JSON.stringify(saved), base=JSON.stringify(saved,(k,v)=>isStat(k)?undefined:v);
  const size=s=>({utf8:Buffer.byteLength(s,'utf8'),utf16:s.length*2});
  const bounded=JSON.stringify({...saved,statcastSpray:sprays});
  report.save={baseline:size(base),aggregates:size(json),withBoundedSprays:size(bounded),sprayPoints:Object.values(sprays).reduce((s,a)=>s+a.length,0)};
  report.save.growth={utf8:size(json).utf8-size(base).utf8,utf16:size(json).utf16-size(base).utf16};
  report.save.boundedGrowth={utf8:size(bounded).utf8-size(base).utf8,utf16:size(bounded).utf16-size(base).utf16};
  console.log('Full-season save bytes (user + league): '+JSON.stringify(report.save));
  assert.ok(size(bounded).utf16-size(base).utf16<900000,'Statcast full-season growth must stay below 900 KB UTF-16 including capped sprays');
}
const dir=path.join(__dirname,'..','qa','results');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,fit?'statcast-fit.json':'statcast-audit.json'),JSON.stringify(report,null,2));
const failed=Object.keys(targets).filter(k=>measured[k]<targets[k][0]||measured[k]>targets[k][1]);
if(failed.length){console.error('OUT OF RANGE: '+failed.join(', '));process.exitCode=1;}else console.log('All Statcast targets in range');
