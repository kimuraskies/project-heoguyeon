'use strict';
const {config,finish}=require('./helpers');
// Every sign, called as often as the situation allows, must leave a box score that still adds up.
module.exports=({K,assert,test})=>{
  const names=Object.keys(K.SIGNS);
  test('signs: an impossible sign is refused and leaves nothing behind',()=>{
    const g=new K.InteractiveGame(config('KIA'),config('LG'));
    assert.equal(g.orderCmd('LG','steal'),false);
    assert.equal(g.cmd.LG,null);
    assert.equal(g.signOK('LG','ibb'),true);
  });
  test('signs: a manual steal is not replaced by an automatic bunt',()=>{
    const g=new K.InteractiveGame(config('KIA'),config('LG')), off=g.offId();
    g.bases[0]={n:g.lineup[off][8],p:g.pitcher[g.defId()]};
    assert.equal(g.orderCmd(off,'steal'),true);
    const p=g.prepareAB();
    assert.equal(p.kind,'steal');
  });
  test('signs: squeeze with a runner on third scores or fails cleanly',()=>{
    let scored=0;
    for(let i=0;i<200;i++){ const g=new K.InteractiveGame(config('KIA',i),config('LG',i)), off=g.offId(), def=g.defId();
      g.bases[2]={n:g.lineup[off][8],p:g.pitcher[def]}; assert.equal(g.orderCmd(off,'sq'),true);
      g.prepareAB(); g.commitAB(); scored+=g.score[off]; assert.ok(g.outs===1,'one out'); assert.equal(g.bases[2],null); }
    assert.ok(scored>100&&scored<195,'suicide squeeze works most of the time: '+scored);
  });
  test('signs: every sign, forced at random for 400 games, keeps the box score valid',()=>{
    const tries={};
    for(let n=0;n<400;n++){ const a=config('KIA',n), b=config('LG',n), g=new K.InteractiveGame(a,b); let guard=0;
      while(!g.over&&guard++<3000){ for(const t of [g.offId(),g.defId()]){ const side=t===g.offId()?'o':'d', opts=names.filter(s=>K.SIGNS[s].side===side&&g.signOK(t,s));
          if(opts.length&&Math.random()<0.5){ const s=opts[Math.floor(Math.random()*opts.length)]; g.orderCmd(t,s); tries[s]=(tries[s]||0)+1; } }
        g.step(); assert.ok(g.outs>=0&&g.outs<=3); }
      assert.ok(g.over,'game finishes');
      const r=g.result();
      for(const [t,o,score] of [[r.home,r.away,r.homeRuns],[r.away,r.home,r.awayRuns]]){
        const bats=Object.values(r.box[t].bat), arms=Object.values(r.box[o].pit), sum=(l,k)=>l.reduce((x,s)=>x+(s[k]||0),0);
        assert.equal(sum(bats,'R'),score,'runs'); assert.equal(sum(arms,'R'),score,'runs allowed');
        for(const s of bats){ assert.equal(s.PA,s.AB+s.BB+s.HBP+(s.SH||0)+(s.SF||0),'PA identity'); assert.ok(s.H<=s.AB); }
      } }
    for(const s of names) assert.ok(tries[s]>0,'exercised '+s);
  });
};
