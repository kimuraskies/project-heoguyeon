'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
module.exports=({K,assert,test})=>{
  test('farm.js: every club has a real 2군 squad with a rotation and nobody from the 1군',()=>{
    const context={window:{}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../farm.js'),'utf8'),context);
    const farm=context.window.KBO_FARM;
    assert.deepEqual(Object.keys(farm).sort(),K.TEAM_IDS.slice().sort());
    const first=new Set(K.TEAM_IDS.flatMap(t=>K.ROSTERS[t].batters.concat(K.ROSTERS[t].pitchers).map(p=>p.n)));
    for(const [t,rows] of Object.entries(farm)){
      assert.ok(rows.filter(r=>r[1]==='P'&&r[2]==='SP').length>=5,t+' needs five farm starters');
      for(const r of rows){
        assert.ok(!first.has(r[0]),r[0]+' is already on a 1군 roster');
        assert.equal(r.length,r[1]==='B'?11:9,r[0]);
        assert.notEqual(r[2],'DH',r[0]+' needs a fielding position');
        for(const v of r.slice(5)) assert.ok(v>=35&&v<=99,r[0]);
      }
    }
  });
};
