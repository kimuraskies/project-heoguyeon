'use strict';
// Regression checks for the bugs in the Codex QA report on 8bd3e57.
const {config}=require('./helpers');
module.exports=({K,assert,test})=>{
  // play one prepared plate appearance with a forced outcome
  function force(g,oc){ const p=g.prepareAB(); p.oc=oc; p.kind=undefined; return g.commitAB(); }

  test('pinch hit after the at-bat is prepared: the new batter bats and gets the PA',()=>{
    const g=new K.InteractiveGame(config('KIA'),config('LG'));
    const p=g.prepareAB(), old=p.batName, sub=g.bench('LG')[0].n;
    assert.equal(g.pinchHit('LG',sub),true);
    const ev=g.step();
    assert.equal(ev.batter,sub);
    assert.equal(g.box.LG.bat[sub].PA,1);
    assert.ok(!g.box.LG.bat[old]);
  });
  test('pitching change after the at-bat is prepared: the new pitcher gets the batter',()=>{
    const g=new K.InteractiveGame(config('KIA'),config('LG'));
    g.prepareAB();
    const rp=g.availPitchers('KIA')[0].n, sp=g.pitcher.KIA;
    assert.equal(g.subPitcher('KIA',rp),true);
    force(g,'K');
    assert.equal(g.box.KIA.pit[rp].BF,1); assert.equal(g.box.KIA.pit[rp].OUT,1);
    assert.equal(g.box.KIA.pit[sp].BF,0);
  });
  test('two outs, error, home run: both runs unearned',()=>{
    const g=new K.InteractiveGame(config('KIA'),config('LG'));
    force(g,'K'); force(g,'K'); force(g,'E'); force(g,'HR');
    const s=g.box.KIA.pit[g.pitcher.KIA];
    assert.equal(s.R,2); assert.equal(s.ER,0);
  });
  test('sacrifice fly is recorded and kept out of at-bats',()=>{
    const g=new K.InteractiveGame(config('KIA'),config('LG'));
    g.bases[2]={n:g.lineup.LG[8],p:g.pitcher.KIA};
    let ev; for(let i=0;i<200;i++){ const h=g.half, b=g.bases.slice(), o=g.outs; ev=force(g,'OUT'); if(ev.oc==='SF') break;
      g.half=h; g.outs=o; g.bases=b; } // retry the same situation until the fly scores the runner
    assert.equal(ev.oc,'SF');
    const s=g.box.LG.bat[ev.batter];
    assert.equal(s.SF,1); assert.equal(s.AB,0); assert.equal(s.RBI,1);
  });
  test('intentional walk throws no pitches',()=>{
    const g=new K.InteractiveGame(config('KIA'),config('LG'));
    g.orderCmd('KIA','ibb'); g.step();
    assert.equal(g.box.KIA.pit[g.pitcher.KIA].NP,0);
    assert.equal(g.ptot.KIA,0);
  });
};
