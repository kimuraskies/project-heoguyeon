'use strict';
const {Runtime}=require('../../qa/runtime');
module.exports=({assert,test})=>{
  const start=()=>new Runtime({observe:false,seed:20261116}).start();
  const ps=(h,t)=>h.K.ROSTERS[t].batters.concat(h.K.ROSTERS[t].pitchers);
  test('trade values: control, age, potential, salary, position and pitcher workload',()=>{
    const h=start(),t=h.user,p={...ps(h,t)[0],age:27,yrs:1,sal:1,pot:90};
    const v=x=>h.FM.tradeValue(x,t);
    assert.equal(v(p).war.length,2);assert(v({...p,yrs:4}).v>v(p).v);
    assert(v({...p,sal:100}).v<0);assert(v({...p,sal:2}).v<v(p).v);
    assert(v({...p,age:21,pot:99,yrs:4}).v>v({...p,age:21,pot:h.K.ovr(p),yrs:4}).v);
    assert(v({...p,age:35,yrs:4}).war[3]<v({...p,age:35,yrs:4}).war[0]);
    const sp={n:'test',type:'P',role:'SP',age:27,stu:78,ctl:78,mov:78,sta:78,yrs:1,sal:1};
    assert(v(sp).war[0]>2*v({...sp,role:'RP'}).war[0]);
    assert(v({...p,pos:'C'}).war[0]>v({...p,pos:'1B'}).war[0]);
  });
  test('packages: concentration, order independence and full bad-contract liability',()=>{
    const h=start(),t=h.user,p=ps(h,t)[0],list=[{...p,n:'A',sal:0},{...p,n:'B',sal:1},{...p,n:'C',sal:2}];
    const values=list.map(p=>h.FM.tradeValue(p,t).v).sort((a,b)=>b-a);
    const value=h.FM.packageValue(list,t);
    assert(Math.abs(value-(values[0]+values[1]*.55+values[2]*.25-4))<1e-8);
    assert.equal(value,h.FM.packageValue(list.slice().reverse(),t));
    const bad={...p,n:'bad',sal:100};assert(h.FM.packageValue([p,bad],t)<=h.FM.packageValue([p],t)+h.FM.tradeValue(bad,t).v-2);
  });
  test('verdict: margin, protected stars, invalid rosters, stale proposals and actual execution',()=>{
    const h=start(),t=h.K.TEAM_IDS.find(t=>h.FM.teamMode(t)==='contend'&&t!==h.user),mine=ps(h,h.user),theirs=ps(h,t);
    const star=theirs.slice().sort((a,b)=>h.K.ovr(b)-h.K.ovr(a))[0];
    assert.equal(h.FM.tradeVerdict(t,[mine[0]],[star]).margin,.4);
    assert.equal(h.FM.tradeVerdict(t,[],[star]).ok,false);
    assert.equal(h.FM.tradeVerdict(t,[mine[0],mine[0]],[star]).ok,false);
    assert.equal(h.FM.tradeVerdict(t,mine.filter(p=>p.type==='P'),[star]).ok,false);
    const target=theirs.find(p=>p.type==='B'&&p!==star),give=mine.find(p=>p.type==='B');
    target.sal=100; // A costly contract can be traded, but cannot bypass the user's budget.
    assert.equal(h.FM.tradeVerdict(t,[give],[target]).ok,false);target.sal=0.3;
    let deal=null;for(const team of h.K.TEAM_IDS.filter(t=>t!==h.user))for(const a of mine)for(const b of ps(h,team))if(!deal&&h.FM.tradeVerdict(team,[a],[b]).ok)deal={team,a,b};
    assert(deal);const {team,a,b}=deal,ca=h.FM.packageValue([b],h.user)-h.FM.packageValue([a],h.user),cb=h.FM.packageValue([a],team)-h.FM.packageValue([b],team);
    assert.equal(h.FM.doTrade(team,[a.n],[b.n],'offer'),'');
    const log=h.FM.tradeLog()[0];assert.equal(log.kind,'offer');assert.equal(log.a,h.user);assert.equal(log.b,team);
    assert.equal(log.vA,ca);assert.equal(log.vB,cb);assert.equal(log.aGive[0].n,a.n);
    for(const k of ['id','y','day','phase','a','b','aGive','bGive','vA','vB','kind'])assert(k in log);
    for(const p of log.aGive.concat(log.bGive))for(const k of ['n','type','age','ovr','pot','sal','yrs',p.type==='B'?'pos':'role'])assert(k in p);
    const age=log.aGive[0].age;a.age++;assert.equal(log.aGive[0].age,age);
    assert(h.FM.doTrade(team,[a.n],[b.n]));assert.equal(h.FM.tradeLog().length,1);
    delete h.state.fm.tradeLog;h.FM.ensure();assert.equal(h.FM.tradeLog().length,0);
  });
  test('AI trades: same-day idempotence, positive gains, legal rosters, user untouched, closed window',()=>{
    const h=start();h.spring();let count=0;
    // Force only the scheduler coin; real club valuations and roster checks still choose deals.
    h.eval('Math.random=()=>0');
    for(let i=0;i<80;i++){
      const before=JSON.stringify(h.K.ROSTERS[h.user]);delete h.state.fm.lastAiTradeTick;
      const entry=h.FM.aiTradeTick();assert.equal(JSON.stringify(h.K.ROSTERS[h.user]),before);
      if(entry){count++;assert(entry.a!==h.user&&entry.b!==h.user);assert(entry.vA>0&&entry.vB>0);
        for(const t of [entry.a,entry.b]){assert(h.FM.entryCount(t)<=28);assert(h.FM.payroll(t)<=h.FM.clubTradeBudget(t)*1.2);}}
      const n=h.FM.tradeLog().length;h.FM.aiTradeTick();assert.equal(h.FM.tradeLog().length,n);
    }
    assert(count>0);h.state.phase='postseason';delete h.state.fm.lastAiTradeTick;assert.equal(h.FM.aiTradeTick(),null);
  });
};
