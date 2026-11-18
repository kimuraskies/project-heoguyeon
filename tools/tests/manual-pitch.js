'use strict';
const {config} = require('./helpers');
// 직접 교체: while the manager watches, the coach only advises; the starter stays in until 130 pitches or an injury
module.exports=({K,assert,test,seed})=>{
  test('manual pitching changes: coach advises, starter stays until the 130-pitch limit, simulated games unchanged',()=>{
    seed(7); let advised=0, maxP=0, overForce=0, kept=0; const N=30;
    for(let i=0;i<N;i++){ const g=new K.InteractiveGame(config('KIA',i),config('LG',i),{maxInnings:12}); g.setTac('KIA','hook','manual'); g.live={KIA:true};
      let n=0, lastP=g.pitcher.KIA, peak=0;
      while(!g.over&&n++<4000){ g.step(); if(g.advice&&g.advice.KIA&&g.advice.KIA.fresh){ advised++; g.advice.KIA.fresh=false; }
        if(g.pitcher.KIA!==lastP){ if(peak>K.MANUAL_FORCE+12) overForce++; lastP=g.pitcher.KIA; peak=0; } peak=Math.max(peak,g.ptot.KIA); maxP=Math.max(maxP,g.ptot.KIA); }
      if(g.pUsed.KIA[0]===g.sp.KIA && g.box.KIA.pit[g.sp.KIA].OUT>=21) kept++; }
    assert.ok(advised>=N, 'the pitching coach should advise at least once a game: '+advised);
    assert.equal(overForce,0,'no pitcher may stay far past the forced-change limit');
    assert.ok(kept>=N*0.5, 'starters should usually go deep when nobody pulls them: '+kept);
    // without live viewing (simulated games, or 끝까지) manual behaves like the normal hook
    seed(7); const g=new K.InteractiveGame(config('KIA',0),config('LG',0),{maxInnings:12}); g.setTac('KIA','hook','manual'); let n=0; while(!g.over&&n++<4000) g.step();
    assert.ok(g.pUsed.KIA.length>=2, 'a simulated game still uses the bullpen');
  });
};
