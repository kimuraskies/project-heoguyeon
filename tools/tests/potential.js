'use strict';
// potentialOf() in fm/00-core.js and the pure copy in tools/tests/potential-rule.js must agree
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const {potentialRule}=require('./potential-rule.js');
module.exports=({K,assert,test})=>{
  test('potential: the game rule matches the review-sheet rule, stays in [OVR, 95], and rewards youth, trend and draft round',()=>{
    const src=fs.readFileSync(path.join(__dirname,'../../fm/00-core.js'),'utf8').replace(/\r\n/g,'\n');
    const pick=re=>{ const m=src.match(re); assert.ok(m,'missing '+re); return m[0]; };
    const code=[pick(/function hash\(s\)\{[^\n]*\}/), pick(/const POT_ROOM=\[[^\]]*\];/), pick(/function potentialOf\(p\)\{[\s\S]*?parts:\{age:base,trend,draft,spread\}\}; \}/)].join('\n');
    const ctx={K:{ovr:p=>p.o}, state:{year:2026}, TREND_2026:{A:3,B:-4}, out:null};
    vm.runInNewContext(code+'\nthis.f=potentialOf;',ctx);
    const names=['A','B','김도영','문동주','최정','x1','x2'];
    for(const n of names) for(const age of [18,20,21,23,24,25,27,29,30,31,35]) for(const o of [40,60,75,90,95]) for(const r of [null,1,2,3]){
      const p={n,age,o,dr:r?{r}:null,dy:r?2026:null};
      const got=ctx.f(p).pot, want=potentialRule({name:n,age,ovr:o,trend:age<=30?(ctx.TREND_2026[n]||0):0,round:r}).pot;
      assert.equal(got,want,`${n} ${age}세 OVR ${o} ${r||'-'}R`);
      assert.ok(got>=o && got<=Math.max(o,95));
    }
    const P=(age,trend,round)=>potentialRule({name:'x',age,ovr:60,trend,round}).pot;
    assert.ok(P(20,0,null)>P(26,0,null)&&P(26,0,null)>P(31,0,null),'younger players have more room');
    assert.ok(P(23,3,null)>P(23,-3,null),'a rising trend adds room');
    assert.ok(P(19,0,1)>P(19,0,3),'a first-round pick has more room than a third');
  });
};
