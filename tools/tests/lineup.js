'use strict';
const {config,positions}=require('./helpers');
module.exports=({K,assert,test})=>{
  test('defaultLineup: nine distinct roster batters and all positions',()=>{
    for(const t of K.TEAM_IDS){
      const d=K.defaultLineup(t);
      assert.equal(d.lineup.length,9); assert.equal(new Set(d.lineup).size,9);
      assert.deepEqual(d.positions.slice().sort(),positions);
      for(const n of d.lineup) assert.ok(K.getB(t,n));
    }
  });
  test('pinchHit: removed batters never return; positions survive substitutions',()=>{
    let events=0;
    for(let i=0;i<100;i++){
      const h=K.TEAM_IDS[i%10],a=K.TEAM_IDS[(i+1)%10];
      const g=new K.InteractiveGame(config(h,i),config(a,i));
      const removed={ [h]:new Set(),[a]:new Set() };
      let steps=0;
      while(!g.over && steps++<2000){
        const t=g.offId();
        if(g.bench(t).length && steps%7===1){
          const old=g.dueBatterName(),replacement=g.bench(t)[0].n;
          assert.equal(g.pinchHit(t,replacement),true);
          removed[t].add(old);
          assert.equal(g.pinchHit(t,old),false,'removed player cannot re-enter');
          assert.ok(!g.bench(t).some(b=>removed[t].has(b.n)));
        }
        const ev=g.step(); events++;
        assert.ok(!removed[ev.off].has(ev.batter),'removed batter batted again');
        for(const team of [h,a]){
          assert.deepEqual(g.pos[team].slice().sort(),positions);
          assert.equal(new Set(g.lineup[team]).size,9);
        }
      }
      assert.ok(g.over);
    }
    assert.ok(events>5000);
  });
};
