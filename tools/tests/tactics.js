'use strict';
const {config,finish}=require('./helpers');
module.exports=({K,assert,test,seed})=>{
  function sample(tac){
    seed(810240);
    const totals={SH:0,NP:0,attempts:0};
    for(let i=0;i<400;i++){
      const h=K.TEAM_IDS[i%10],a=K.TEAM_IDS[(i+1+i%9)%10];
      const r=finish(new K.InteractiveGame(config(h,i,tac),config(a,i,tac)),assert);
      for(const t of [h,a]){
        for(const b of Object.values(r.box[t].bat)){totals.SH+=b.SH||0;totals.attempts+=b.SB+b.CS;}
        for(const p of Object.values(r.box[t].pit)) totals.NP+=p.NP;
      }
    }
    return totals;
  }
  let baseline;
  test('tactics baseline: 400 seeded games',()=>{baseline=sample({});});
  for(const [key,value,metric] of [['bunt','often','SH'],['bat','nibble','NP'],['run','aggr','attempts']]){
    test(`tactics ${key}:${value} increases ${metric}`,()=>{
      const changed=sample({[key]:value});
      console.log(`  ${metric}: default ${baseline[metric]}, ${value} ${changed[metric]}`);
      assert.ok(changed[metric]>baseline[metric]*1.03,'expected >3% increase');
    });
  }
  test("orderCmd('ibb'): next PA is IBB and credits the walk",()=>{
    const g=new K.InteractiveGame(config('KIA'),config('LG'));
    const n=g.dueBatterName();
    g.orderCmd(g.defId(),'ibb');
    assert.equal(g.step().oc,'IBB');
    assert.equal(g.box.LG.bat[n].IBB,1);
    assert.equal(g.box.LG.bat[n].BB,1);
    assert.equal(g.cmd.KIA,null);
  });
  test("orderCmd('bunt'): SAC/FC/BUNT1B across 200 eligible situations",()=>{
    const seen=new Set();
    for(let i=0;i<200;i++){
      const g=new K.InteractiveGame(config('KIA'),config('LG'));
      g.bases[0]={n:g.lineup.LG[8],p:g.pitcher.KIA};
      g.outs=i%2;
      g.orderCmd('LG','bunt');
      const ev=g.step(); seen.add(ev.oc);
      assert.ok(['SAC','FC','BUNT1B'].includes(ev.oc));
      assert.equal(g.cmd.LG,null);
      if(ev.oc==='SAC') assert.equal(g.box.LG.bat[ev.batter].SH,1);
    }
    assert.deepEqual([...seen].sort(),['BUNT1B','FC','SAC']);
  });
};
