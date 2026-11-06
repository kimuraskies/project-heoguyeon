'use strict';
const {config}=require('./helpers');
// Tactical familiarity: a dugout passes {tactic:{value:execution}} as cfg.tacFam and the
// engine scales that plan's effect; scouting knowledge arrives as cfg.scoutKnow.
module.exports=({K,assert,test})=>{
  const games=(N,mk)=>{ let SB=0,CS=0,R=0;
    for(let g=0;g<N;g++){ const a=mk(g), b=config('LG',g), res=K.simGame(a,b,{});
      R+=res.homeRuns; for(const n in res.box.KIA.bat){ SB+=res.box.KIA.bat[n].SB||0; CS+=res.box.KIA.bat[n].CS||0; } }
    return {SB,CS,R,pct:SB/Math.max(1,SB+CS)}; };
  test('familiarity: no data means a fully drilled plan', ()=>{
    const g=new K.InteractiveGame(config('KIA',0,{run:'aggr'}), config('LG',0), {});
    assert.equal(g.ex('KIA','run'), 1);
    const h=new K.InteractiveGame(Object.assign(config('KIA',0,{run:'aggr'}),{tacFam:{run:{aggr:0.4}}}), config('LG',0), {});
    assert.equal(h.ex('KIA','run'), 0.4);
    assert.equal(h.ex('KIA','atk'), 1, 'tactics without data stay at 1');
  });
  test('familiarity: an unlearned running game steals less often and less well', ()=>{
    const snap=JSON.stringify(K.ROSTERS);
    const raw=games(500,g=>config('KIA',g,{run:'aggr'}));
    K.ROSTERS=Object.assign(K.ROSTERS, JSON.parse(snap));
    const green=games(500,g=>Object.assign(config('KIA',g,{run:'aggr'}),{tacFam:{run:{aggr:0.3}}}));
    assert.ok(green.SB<raw.SB, `steals ${green.SB} vs ${raw.SB}`);
    assert.ok(green.pct<raw.pct, `success ${green.pct.toFixed(3)} vs ${raw.pct.toFixed(3)}`);
  });
};
