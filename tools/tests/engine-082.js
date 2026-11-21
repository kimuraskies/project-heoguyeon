'use strict';
const {Runtime,copy}=require('../../qa/runtime');
const {config,schedule}=require('./helpers');

module.exports=({K,assert,test,seed})=>{
  test('100 watched games: every half restores identically, the box replays and the result posts once',()=>{
    const h=new Runtime({observe:false}).start();
    h.FM.quickStart();
    for(let i=0;i<100;i++){
      do {h.App.nextGame();} while(h.state.pendingGame==null);
      h.App.startMatch();
      const m=h.ctx.Match, control=h.K.InteractiveGame.restore(m.game.serialize());
      while(!m.game.over){
        const half=m.game.half;
        m.game.step(); control.step();
        if(half!==m.game.half){
          const snapshot=m.game.serialize();
          m.game=h.K.InteractiveGame.restore(JSON.parse(JSON.stringify(snapshot)));
          assert.deepEqual(m.game.serialize(),snapshot);
        }
      }
      const result=m.game.result();
      assert.deepEqual(result,control.result());
      for(const [team,opp,runs] of [[result.home,result.away,result.homeRuns],[result.away,result.home,result.awayRuns]]){
        const sum=rows=>Object.values(rows).reduce((n,s)=>n+s.R,0);
        assert.equal(sum(result.box[team].bat),runs);
        assert.equal(sum(result.box[opp].pit),runs);
      }
      m.end();
      const finished=h.state.finishedGame;
      m.finalize(); h.ctx.recordFinished(finished); m.finalize();
      const s=h.state.season[h.user];
      assert.equal(s.W+s.L+s.T,i+1);
      assert.equal(h.state.liveMatch,null);
    }
    h.App.simRest(); h.FM.answer();
    assert.equal(h.state.phase,'postseason');
    assert.equal(h.state.schedule.filter(g=>g.played).length,720);
  });

  test('a steal called at 1-1 preserves the pitches, batter, count and pitch totals',()=>{
    let g,p;
    for(let i=0;i<300;i++){
      g=new K.InteractiveGame({...config('KIA',i),autoSign:false},{...config('LG',i),autoSign:false});
      g.bases[0]={n:g.lineup.LG[8],p:g.pitcher.KIA};
      p=g.prepareAB();
      if(p.pitches.length>2&&p.pitches.slice(0,2).filter(x=>x.res==='B').length===1)break;
    }
    const prefix=p.pitches.slice(0,2), batter=g.dueBatterName();
    assert.equal(g.reviseSign('LG','hitrun',2).hr,'hitrun');
    const steal=g.reviseSign('LG','steal',2);
    assert.deepEqual(steal.pitches.slice(0,2),prefix);
    assert.equal(steal.kind,'steal');
    const ev=g.commitAB();
    assert.ok(['SB','CS'].includes(ev.oc));
    assert.equal(g.tlog.LG.steal[0],1);
    assert.equal(g.tlog.LG.hitrun,undefined);
    assert.equal(g.dueBatterName(),batter);
    const next=g.prepareAB();
    assert.deepEqual(next.pitches.slice(0,3),ev.pitches);
    const held=ev.oc==='SB';
    if(held)assert.equal(g.reviseSign('KIA','ibb',3).kind,'ibb');
    const total=held?3:next.pitches.length;
    g.commitAB();
    assert.equal(g.ptot.KIA,total);
    assert.equal(g.ptot.KIA,g.box.KIA.pit[g.pitcher.KIA].NP);
    assert.equal(g.order.LG,1);
  });

  test('broadcast panel accepts a 1-1 steal on the next delivery',()=>{
    const h=new Runtime({observe:false}).start();
    h.FM.quickStart();
    for(let games=0;games<8;games++){
      do {h.App.nextGame();} while(h.state.pendingGame==null);
      h.App.startMatch();
      const m=h.ctx.Match;
      while(!m.game.over){
        m.stepOne();
        const ab=m.ab;
        if(!ab||ab.committed||m.game.offId()!==h.user||!m.game.signOK(h.user,'steal')||!m.canSign())continue;
        const prefix=ab.pitches.slice(0,ab.shown), count=h.ctx.countOf(prefix);
        if(count.b!==1||count.s!==1)continue;
        m.togglePanel('tac');
        m.order('steal');
        assert.deepEqual(m.ab.pitches.slice(0,m.ab.shown),prefix);
        m.stepPA();
        assert.equal(m.ab.ev.batter,ab.batName);
        assert.ok(['SB','CS'].includes(m.ab.ev.oc));
        return;
      }
      m.finalize();
    }
    assert.fail('did not reach an eligible 1-1 count');
  });

  test('calendar: civil dates, series, All-Star break, balanced opponents and legacy saves',()=>{
    const h=new Runtime({observe:false}).start();
    for(let y=2026;y<2054;y++){
      h.state.year=y;
      const games=h.ctx.buildSchedule(y), counts=new Map(), teamDays=new Set();
      const pause=h.ctx.allStarStart(y), opener=h.FM.calDate(0);
      assert.equal(opener.getMonth(),2); assert.equal(opener.getDay(),6);
      assert.ok(opener.getDate()>=25); assert.equal(games.length,720);
      for(const g of games){
        const date=h.FM.calDate(g.day), dow=date.getDay();
        assert.notEqual(dow,1);
        assert.ok(date<pause||(date-pause)/864e5>=4);
        if(g.serLen===3&&g.ser===1)assert.ok(dow===2||dow===5);
        for(const t of [g.home,g.away]){
          const key=t+'/'+g.day; assert.ok(!teamDays.has(key)); teamDays.add(key);
        }
        const k=g.home+'/'+g.away; counts.set(k,(counts.get(k)||0)+1);
      }
      assert.equal(counts.size,90);
      for(const n of counts.values())assert.equal(n,8);
    }
    const old=h.saveObject();
    old.state.schedV=2; old.state.schedule[0].played=true;
    const scheduleBefore=copy(old.state.schedule);
    h.ctx.applySave(old);
    assert.deepEqual(copy(h.state.schedule),scheduleBefore);
    assert.equal(h.state.schedV,2);
  });

  test('rainout moves one fixture, preserves the rotation until chosen, and survives reload',()=>{
    const h=new Runtime({observe:false}).start(); h.spring();
    const idx=h.state.schedule.findIndex(g=>g.home===h.user||g.away===h.user);
    const g=h.state.schedule[idx], old=g.day, rotation=h.state.cfgs[h.user].rotation.slice();
    h.eval('const savedWeatherRandom=Math.random; Math.random=()=>0');
    try{h.App.userGames(1);}finally{h.eval('Math.random=savedWeatherRandom');}
    assert.equal(h.context().userGames,0);
    assert.equal(h.state.schedule.length,720);
    assert.equal(g.originalDay,old);
    assert.ok(g.day>old);
    assert.equal(h.state.rainout.sp,rotation[0]);
    assert.equal(h.App.advanceRainoutRotation(),rotation[1]);
    assert.equal(h.App.advanceRainoutRotation(),false);
    const reload=new Runtime({storage:h.storage,observe:false});
    assert.equal(reload.ctx.projectedSP(h.user),rotation[1]);
    assert.deepEqual(copy(reload.state.rainout),copy(h.state.rainout));
  });

  test('automatic league distribution stays within 2% of 09176bc over 12 seeded schedules',()=>{
    seed(20261122);
    const expected=[.26030351515466227,.08924280928728197,.20736109506757539,1.6775462962962964,.7147095349799917];
    const measured=sample(K,config,()=>Array(12).fill(schedule()).flat());
    console.log('  AVG, BB/PA, K/PA, SB attempts/game, SB success:',measured.map(x=>x.toFixed(5)).join(', '));
    measured.forEach((x,i)=>assert.ok(Math.abs(x/expected[i]-1)<=.02,'metric '+i+' = '+x));
  });
};

function sample(K, config, schedule) {
  const totals={H:0,AB:0,BB:0,SO:0,PA:0,SB:0,CS:0};
  const games=schedule();
  for(let i=0;i<games.length;i++){
    const [h,a]=games[i], home=config(h,i),away=config(a,i);
    let result;
    if(i%2) result=K.simGame(home,away);
    else { const g=new K.InteractiveGame(home,away); while(!g.over)g.step(); result=g.result(); }
    for(const t of [h,a]) for(const batter of Object.values(result.box[t].bat))
      for(const k of Object.keys(totals)) totals[k]+=batter[k]||0;
  }
  const {H,AB,BB,SO,PA,SB,CS}=totals;
  return [H/AB,BB/PA,SO/PA,(SB+CS)/games.length,SB/(SB+CS)];
}
