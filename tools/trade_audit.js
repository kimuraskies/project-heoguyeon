'use strict';
// Real browser game entry points, deterministic proposals and five complete careers years.
const assert=require('node:assert/strict');
const {Runtime}=require('../qa/runtime');
const seed=+(process.argv[2]||20261116);
const active=(h,t)=>h.K.ROSTERS[t].batters.concat(h.K.ROSTERS[t].pitchers);
const h=new Runtime({seed,observe:false}).start();
const random=h.K.statRNG(seed+77), pick=a=>a[Math.floor(random()*a.length)];
const mine=active(h,h.user), teams=h.K.TEAM_IDS.filter(t=>t!==h.user), fair=[], exploits=[];
for(const t of teams){
  const theirs=active(h,t), top=theirs.slice().sort((a,b)=>h.K.ovr(b)-h.K.ovr(a)).slice(0,3);
  for(const star of top){
    if(h.FM.tradeValue(star,t).v<=15) continue;
    const weak=mine.filter(p=>h.K.ovr(p)<=h.K.ovr(star)-12&&(p.pot||h.K.ovr(p))<=h.K.ovr(star));
    if(weak.length>=3) exploits.push({t,star,weak});
  }
  for(const a of mine) for(const b of theirs){
    if(a.type!==b.type||(a.type==='P'&&(a.role==='SP')!==(b.role==='SP'))) continue;
    if(h.FM.teamMode(t)==='contend'&&top.includes(b)) continue; // protected stars require a premium, not an even swap
    const va=h.FM.packageValue([a],t), vb=h.FM.packageValue([b],t);
    if(va>2&&vb>2&&va/vb>=0.8&&va/vb<=1.2&&!h.FM.tradeCheck(t,[a.n],[b.n])) fair.push({t,a,b});
  }
}
assert(exploits.length&&fair.length,'proposal pools must be populated');
let exploitAccepted=0, exploitEconomic=0, fairAccepted=0;
for(let i=0;i<1000;i++){
  const {t,star,weak}=pick(exploits), pool=weak.slice(), give=[];
  while(give.length<3) give.push(pool.splice(Math.floor(random()*pool.length),1)[0]);
  const v=h.FM.tradeVerdict(t,give,[star]); exploitAccepted+=+v.ok; exploitEconomic+=+(v.have>=v.need);
  const x=pick(fair); fairAccepted+=+h.FM.tradeVerdict(x.t,[x.a],[x.b]).ok;
}
const contracts=h.K.TEAM_IDS.flatMap(t=>active(h,t).concat(h.K.ROSTERS[t].farm||[]).map(p=>({team:t,n:p.n,ovr:h.K.ovr(p),sal:p.sal,yrs:p.yrs,v:h.FM.tradeValue(p,t).v}))).sort((a,b)=>b.v-a.v);
const range=ps=>({min:Math.min(...ps.map(p=>p.v)),max:Math.max(...ps.map(p=>p.v))});
console.log(JSON.stringify({seed,proposalsPerClass:1000,pools:{exploit:exploits.length,fair:fair.length},exploitAccepted,exploitEconomic,fairAccepted,best20:range(contracts.slice(0,20)),worst20:range(contracts.slice(-20))},null,2));
console.log('Best 20 contracts:',JSON.stringify(contracts.slice(0,20)));
console.log('Worst 20 contracts:',JSON.stringify(contracts.slice(-20)));
assert.equal(exploitAccepted,0,'three weak for one star');
assert.equal(exploitEconomic,0,'exploit must fail on value even without roster limits');
assert(fairAccepted>=300&&fairAccepted<=700,'fair swaps must accept 30-70%');

const sim=new Runtime({seed,observe:false}).start(), seasons=[];
let seen=0, checked=0, maxBudgetRatio=0;
const check=()=>{
  for(const x of sim.FM.tradeLog().slice(seen)){
    if(x.kind==='ai'){
      assert(x.a!==sim.user&&x.b!==sim.user,'AI must never trade the user');
      assert(x.vA>0&&x.vB>0,'both clubs must improve');
    }
    for(const t of [x.a,x.b]){
      const r=sim.K.ROSTERS[t], ps=active(sim,t);
      assert(ps.length<=28&&r.batters.length>=12&&r.pitchers.length>=11&&r.pitchers.filter(p=>p.role==='SP').length>=5,'legal post-trade entry');
      const ratio=sim.FM.payroll(t)/sim.FM.clubTradeBudget(t); maxBudgetRatio=Math.max(maxBudgetRatio,ratio);
      assert(ratio<=1.2+1e-8,'trade budget ceiling');
      assert.equal(new Set(ps.map(p=>p.n)).size,ps.length,'no duplicate players');
    }
    checked++;
  }
  seen=sim.FM.tradeLog().length;
};
// Observe every actual tick and completed offseason choice, not just season-end rosters.
const after=sim.FM.afterGame; sim.FM.afterGame=r=>{const v=after(r);check();return v;};
const choose=sim.FM.offChoose; sim.FM.offChoose=i=>{const v=choose(i);check();return v;};
const finishStove=()=>{let guard=0;while(sim.FM.offHero().auto&&sim.state.fm.off.stage==='stove'&&guard++<40){sim.FM.offOpen();const o=sim.state.fm.off,e=o.q[0];if(e)sim.FM.offChoose(e.opts.length-1);else break;check();}};
for(let y=0;y<5;y++){
  finishStove(); sim.spring(); check();
  sim.App.simRest();sim.FM.answer();check();
  const n=sim.FM.tradeLog().filter(x=>x.y===sim.state.year&&x.kind==='ai').length;
  seasons.push({year:sim.state.year,trades:n}); console.log('Season',sim.state.year,'AI trades',n);
  assert(n>=4&&n<=10,'4-10 AI trades per season');
  sim.App.psAuto(true);if(y<4)sim.nextSeason();
}
console.log(JSON.stringify({seasons,checkedTrades:checked,maxBudgetRatio,illegalRosters:0,budgetViolations:0,userClubAiTrades:0},null,2));
