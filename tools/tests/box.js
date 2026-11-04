'use strict';
const {config,schedule,finish} = require('./helpers');
module.exports=({K,assert,test})=>{
  let results;
  test('720-game season: decisions, ER/R, charged runs and GS',()=>{
    results=[]; const counts={}; let ties=0,saves=0,holds=0;
    for(const [h,a] of schedule()) {
      const g=new K.InteractiveGame(config(h,counts[h]||0),config(a,counts[a]||0));
      counts[h]=(counts[h]||0)+1; counts[a]=(counts[a]||0)+1;
      const r=finish(g,assert); results.push(r);
      const all=[h,a].flatMap(t=>Object.entries(r.box[t].pit).map(([n,s])=>({t,n,...s})));
      const sum=key=>all.reduce((n,p)=>n+p[key],0);
      const context=`game ${results.length} ${h}-${a}`;
      assert.equal(sum('W'),r.winner?1:0,context+' W');
      assert.equal(sum('L'),r.winner?1:0,context+' L');
      if(!r.winner){ties++;assert.equal(sum('SV'),0,context+' tie SV');}
      for(const p of all) {
        assert.ok(p.ER<=p.R,context+' ER <= R');
        if(p.W) assert.equal(p.t,r.winner,context+' winning team');
        if(p.L) assert.notEqual(p.t,r.winner,context+' losing team');
        if(p.SV) {
          saves++; assert.equal(p.t,r.winner,context+' save team');
          assert.equal(p.n,g.pitcher[r.winner],context+' final pitcher');
          assert.equal(p.W,0,context+' save not win');
        }
        if(p.HD){holds++; assert.equal(p.W+p.L+p.SV,0,context+' exclusive hold');}
      }
      for(const [t,allowed] of [[h,r.awayRuns],[a,r.homeRuns]]) {
        const pitchers=Object.values(r.box[t].pit);
        assert.equal(pitchers.reduce((n,p)=>n+p.R,0),allowed,context+' charged runs');
        assert.equal(pitchers.reduce((n,p)=>n+p.GS,0),1,context+' GS');
      }
    }
    assert.ok(ties>0 && saves>0 && holds>0,'exercise ties, saves and holds');
    console.log(`  coverage: ${ties} ties, ${saves} saves, ${holds} holds`);
  });
  for(const [name,lo,hi,calc] of [
    ['AVG',.255,.280,s=>s.H/s.AB],['K%',.17,.22,s=>s.SO/s.PA],
    ['BB%',.08,.11,s=>s.BB/s.PA],['runs/team/game',4.4,5.4,s=>s.R/1440]
  ]) test('league realism: '+name,()=>{
    assert.equal(results.length,720);
    const s={H:0,AB:0,SO:0,BB:0,PA:0,R:0};
    for(const r of results) {
      s.R+=r.homeRuns+r.awayRuns;
      for(const t of [r.home,r.away]) for(const b of Object.values(r.box[t].bat))
        for(const k of ['H','AB','SO','BB','PA']) s[k]+=b[k];
    }
    const value=calc(s); console.log('  '+name+' = '+value.toFixed(4));
    assert.ok(value>=lo && value<=hi,`${name} ${value} outside [${lo}, ${hi}]`);
  });
  test('postseason: 300 games finish by inning 15',()=>{
    for(let i=0;i<300;i++){
      const h=K.TEAM_IDS[i%10],a=K.TEAM_IDS[(i+1+i%9)%10];
      const r=finish(new K.InteractiveGame(config(h,i),config(a,i),{maxInnings:15}),assert);
      assert.ok(r.innings<=15);
    }
    // Exercise the tied 15th-inning boundary directly with three real outs per half.
    const g=new K.InteractiveGame(config('KIA'),config('LG'),{maxInnings:15});
    g.inning=15;
    for(let i=0;i<6;i++){
      g.prepareAB(); g._pending.oc='K'; g._pending.kind=undefined; g.commitAB();
    }
    assert.ok(g.over); assert.equal(g.inning,15); assert.equal(g.winner,null);
  });
};
