'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {copy,json,attrs,Runtime}=require('./runtime');
module.exports=function({make,safe,audit,report,saveRoundTrip,finishRegular,finishPS,out}){
  const results=report.cases=[];
  function test(name,fn){safe(name,()=>{const h=make('case-'+name).start();const observed=fn(h);results.push({name,...h.context(),observed});console.log('CASE '+name+': '+json(observed));});}
  const play=(h,n)=>{for(let i=0;i<n;i++)h.action('play one day',()=>h.App.userGames(1));};
  const active=(h,n)=>h.K.ROSTERS[h.user].batters.concat(h.K.ROSTERS[h.user].pitchers).some(p=>p.n===n);
  const witness=(h,name,data)=>fs.writeFileSync(path.join(out,'evidence',name+'.json'),json({context:h.context(),actions:h.actions,data,snapshot:h.saveObject()}));
  test('spam-and-ten-games',h=>{
    const r=h.K.ROSTERS[h.user],p=r.batters[0],before=p.mor;
    for(let i=0;i<20;i++){h.action('stove demote '+p.n,()=>h.FM.demote(p.n));h.action('stove promote '+p.n,()=>h.FM.promote(p.n));}
    const after=p.mor;if(after>before)h.violation('STOVE_MORALE_SPAM',{n:p.n,loops:20,before,after});
    const sp=r.pitchers.find(p=>p.role==='SP');h.action('demote fifth SP guard',()=>h.FM.demote(sp.n));assert(active(h,sp.n));
    h.spring();h.action('regular demote '+p.n,()=>h.FM.demote(p.n));assert(!active(h,p.n));
    for(let i=0;i<10;i++){h.action('blocked promote at elapsed '+i,()=>h.FM.promote(p.n));assert(!active(h,p.n),'must block days 0..9');play(h,1);}
    h.action('promote at elapsed 10',()=>h.FM.promote(p.n));assert(active(h,p.n));
    audit.pass('manual 5-SP guard and exact 10-game boundary');saveRoundTrip(h,'registration fields');
    return {name:p.n,morale:{before,after},blockedAt:[0,1,2,3,4,5,6,7,8,9],promotedAt:10};
  });
  test('injured-demotion',h=>{
    h.spring();const p=h.K.ROSTERS[h.user].batters.at(-1);h.fixture('injured active batter inj=3',()=>{p.inj=3;});
    h.action('demote injured '+p.n,()=>h.FM.demote(p.n));assert(h.FM.isFarm(h.user,p));play(h,3);assert.equal(p.inj,0);h.action('early injured-player re-registration',()=>h.FM.promote(p.n));assert(!active(h,p.n));
    audit.pass('injured demotion retains player, recovers, retains registration lock');return {n:p.n,injAfter3:p.inj,downUg:p.downUg};
  });
  test('automatic-callup-cap',h=>{
    h.spring();const r=h.K.ROSTERS[h.user];for(const p of r.farm.filter(p=>p.type==='B').slice(0,2))h.action('fill to 28 '+p.n,()=>h.FM.promote(p.n));
    h.fixture('seven registered batters injured for 8 games at entry 28',()=>r.batters.slice(0,7).forEach(p=>{p.inj=8;}));
    const before=h.FM.entryCount(h.user);play(h,1);const after=h.FM.entryCount(h.user);witness(h,'callup-cap',{before,after});return {before,after};
  });
  test('automatic-callup-ten-game-guard',h=>{
    h.spring();const r=h.K.ROSTERS[h.user],p=r.batters[0];h.action('demote recently registered star',()=>h.FM.demote(p.n));
    h.fixture('force automatic batter callups',()=>r.batters.slice(0,7).forEach(x=>{x.inj=12;}));play(h,1);
    assert(h.FM.isFarm(h.user,p));audit.pass('automatic callup respects recently demoted player');return {n:p.n,stillFarm:true,entry:h.FM.entryCount(h.user)};
  });
  test('release-bypasses-SP-and-minimums',h=>{
    const r=h.K.ROSTERS[h.user],names=r.pitchers.filter(p=>p.role==='SP').slice(0,4).map(p=>p.n);h.expectedDepartures=new Map();
    for(const n of names){h.expectedDepartures.set(n,'confirmed release');h.action('request release '+n,()=>h.FM.releasePlayer(n));h.action('confirm release '+n,()=>h.FM.answer());}
    const counts={pitchers:h.K.ROSTERS[h.user].pitchers.length,SP:h.K.ROSTERS[h.user].pitchers.filter(p=>p.role==='SP').length};witness(h,'release-SP',counts);return counts;
  });
  test('legal-trade-zero-pitchers-crash',h=>{
    const r=h.K.ROSTERS[h.user],mine=r.pitchers.map(p=>p.n),other='LG',incoming=h.K.ROSTERS[other].batters.at(-1).n;
    h.action('trade tab',()=>h.App.tab('trade'));h.action('choose LG',()=>h.App.tradeTeam(other));
    for(const n of mine)h.action('select outgoing '+n,()=>h.App.toggleOut(n));h.action('select incoming '+incoming,()=>h.App.toggleIn(incoming));
    const enabled=h.document.getElementById('view').innerHTML.includes('상대가 받아들일 만한 제안');if(enabled)h.violation('ILLEGAL_TRADE_APPROVED',{outgoing:mine,incoming});
    h.action('execute approved trade',()=>h.App.execTrade());const counts={B:h.K.ROSTERS[h.user].batters.length,P:h.K.ROSTERS[h.user].pitchers.length};let error=null;
    try{h.spring();play(h,1);}catch(e){error=e.message;}
    if(error)h.violation('LEGAL_TRADE_GAME_CRASH',{outgoing:mine,incoming,counts,error,uiEnabled:enabled});
    witness(h,'legal-trade-crash',{counts,error});return {uiEnabled:enabled,counts,error};
  });
  test('stale-trade-selection-free-player',h=>{
    const outgoing=h.K.ROSTERS[h.user].batters[0],other='LG';const incoming=h.K.ROSTERS[other].pitchers.at(-1);
    h.action('open trade',()=>h.App.tab('trade'));h.action('pick LG',()=>h.App.tradeTeam(other));h.action('select outgoing star',()=>h.App.toggleOut(outgoing.n));h.action('select incoming',()=>h.App.toggleIn(incoming.n));
    h.action('switch to squad',()=>h.App.tab('squad'));h.action('demote selected trade chip',()=>h.FM.demote(outgoing.n));h.action('return to trade',()=>h.App.tab('trade'));
    const enabled=h.document.getElementById('view').innerHTML.includes('상대가 받아들일 만한 제안');if(enabled)h.violation('STALE_TRADE_APPROVED',{outgoing:outgoing.n,incoming:incoming.n});h.action('execute stale trade',()=>h.App.execTrade());
    const kept=h.FM.isFarm(h.user,outgoing),received=active(h,incoming.n);if(kept&&received)h.violation('FREE_PLAYER_STALE_TRADE',{outgoing:outgoing.n,incoming:incoming.n,uiEnabled:enabled,kept,received});return {outgoing:outgoing.n,incoming:incoming.n,kept,received};
  });
  test('FA-bypasses-entry-cap',h=>{
    const signed=[];for(let attempt=0;attempt<5&&h.state.fm.fa.length;attempt++){
      const i=h.state.fm.fa.reduce((best,x,j)=>x.ask<h.state.fm.fa[best].ask?j:best,0),n=h.state.fm.fa[i].p.n;
      h.action('offer FA '+n,()=>h.FM.signFA(i));h.action('confirm FA '+n,()=>h.FM.answer());if(active(h,n))signed.push(n);else break;}
    return {signed,entry:h.FM.entryCount(h.user),payroll:h.FM.payroll(h.user),budget:h.state.fm.fin.budget};
  });
  test('farm-contract-payroll',h=>{
    const r=h.K.ROSTERS[h.user],p=r.batters.find(p=>p.n==='나성범'),before=h.FM.payroll(h.user),salary=p.sal,yrs=p.yrs;
    h.action('demote contracted veteran',()=>h.FM.demote(p.n));const after=h.FM.payroll(h.user);
    if(Math.abs(before-after-salary)<0.01)h.violation('FARM_SALARY_OMITTED',{n:p.n,salary,before,after,contractYears:yrs});
    h.spring();finishRegular(h);finishPS(h);const afterYrs=p.yrs;if(afterYrs===yrs)h.violation('FARM_CONTRACT_DOES_NOT_EXPIRE',{n:p.n,before:yrs,after:afterYrs});
    return {n:p.n,salary,payrollBefore:before,payrollAfter:after,yrsBefore:yrs,yrsAfter:afterYrs};
  });
  test('empty-farm',h=>{
    h.spring();h.fixture('empty user farm (old-save/editor boundary)',()=>{h.K.ROSTERS[h.user].farm=[];});play(h,12);return {userGames:h.context().userGames,futures:h.state.fm.fut.g,temporaryRosterKeys:Object.keys(h.K.ROSTERS).filter(n=>n.startsWith('F_'))};
  });
  test('futures-injury-deadlock',h=>{
    h.spring();const bats=h.K.ROSTERS[h.user].farm.filter(p=>p.type==='B');
    h.fixture('farm has 8 healthy batters, others inj=2',()=>bats.slice(8).forEach(p=>{p.inj=2;}));const names=bats.slice(8).map(p=>p.n);play(h,12);
    const stuck=bats.filter(p=>names.includes(p.n)).map(p=>({n:p.n,inj:p.inj}));if(stuck.every(p=>p.inj===2))h.violation('FUTURES_RECOVERY_DEADLOCK',{elapsed:12,futures:h.state.fm.fut.g,stuck});return {elapsed:12,futures:h.state.fm.fut.g,stuck};
  });
  test('opponent-farm-fatigue',h=>{
    h.spring();const opp=h.K.TEAM_IDS.find(t=>t!==h.user),ps=h.K.ROSTERS[opp].farm,initial=ps.map(p=>({n:p.n,cond:p.cond,inj:p.inj}));play(h,1);
    const same=json(initial)===json(ps.map(p=>({n:p.n,cond:p.cond,inj:p.inj})));if(same)h.violation('FUTURES_OPPONENT_NO_FATIGUE',{opp,players:initial.length,unchanged:true});return {opp,unchanged:same};
  });
  test('potential-training-and-aging',h=>{
    const p=h.K.ROSTERS[h.user].farm.find(p=>p.age<=21),n=p.n;
    h.fixture('prospect exactly at pot, all trainable attributes 70',()=>{attrs(p).forEach(k=>p[k]=70);p.pot=h.K.ovr(p);p.age=20;});
    h.action('focused normal training',()=>{h.FM.setTrain(n,'f',p.type==='B'?'con':'stu');h.FM.setTrain(n,'i','normal');});
    const initial=Object.fromEntries(attrs(p).map(k=>[k,p[k]]));let ticks=0;while(!(p.grow||[]).length&&ticks++<240)h.action('isolated real training tick '+ticks,()=>h.FM.trainingTick());
    const learned=Object.fromEntries(attrs(p).map(k=>[k,p[k]]));if(json(initial)!==json(learned))h.violation('TRAINING_AT_POT',{n,initial,learned,pot:p.pot,ticks,ovr:h.K.ovr(p)});
    // A separate capped youth cohort makes rounding/aging overshoot observable without
    // conflating it with the training experiment. ageRosters is the exact App helper.
    const young=h.players().filter(x=>x.p.age<=24).map(x=>x.p);h.fixture('youths all attributes=70 and pot=70',()=>young.forEach(x=>{attrs(x).forEach(k=>x[k]=70);x.pot=70;}));
    h.action('isolated real ageRosters helper',()=>h.eval('ageRosters()'));const exceeded=young.filter(x=>h.K.ovr(x)>70).map(x=>({n:x.n,ovr:h.K.ovr(x),pot:x.pot,age:x.age}));
    if(exceeded.length)h.violation('AGING_AT_POT',{cohort:young.length,exceeded});return {training:{n,ticks,initial,learned,pot:p.pot},aging:{cohort:young.length,exceeded}};
  });
  test('full-save-and-legacy',h=>{
    h.spring();h.action('hard training all',()=>h.FM.setTrainAll('i','hard'));play(h,24);saveRoundTrip(h,'farm pot tr grow fut');
    const original=JSON.parse(h.storage.get('kbo_manager_save'));const expected=copy(original.state.fm.fut);assert(expected.g===24);
    const before=Object.values(original.rosters).reduce((n,r)=>n+r.batters.length+r.pitchers.length,0);
    for(const r of Object.values(original.rosters)){delete r.farm;for(const p of r.batters.concat(r.pitchers)){delete p.pot;delete p.tr;delete p.grow;}}
    delete original.state.fm.farmV;delete original.state.fm.fut;delete original.state.fm.trLog;original.v=1;
    const fresh=make('legacy-reload');fresh.expectedFuturesOffset=24;fresh.storage.set('kbo_manager_save',JSON.stringify(original));fresh.action('load true legacy save',()=>fresh.App.load());
    assert.equal(fresh.players().filter(x=>x.bucket!=='farm').length,before);assert(fresh.K.TEAM_IDS.every(t=>fresh.K.ROSTERS[t].farm.length>=24));assert(fresh.players().every(x=>Number.isFinite(x.p.pot)));
    fresh.action('render legacy training defaults',()=>fresh.App.tab('train'));play(fresh,1);audit.pass('legacy without farm/pot/tr/grow migrates and plays');
    // Legacy saves have no historic Futures boxes: the new counter starts from zero.
    return {roundTripFutures:expected.g,legacyActive:before,legacyFarm:fresh.players().filter(x=>x.bucket==='farm').length,legacyNextUserGame:fresh.context().userGames};
  });
  test('postseason-save-corruption',h=>{
    h.spring();finishRegular(h);
    while(h.state.postseason.stage===0)h.liveNext(true);
    const before=copy(h.state.postseason.cur);saveRoundTrip(h,'JPO beginning');const loaded=copy(h.state.postseason.cur);
    h.liveNext(true);const finished=h.state.postseason.rounds.find(r=>r.name===before.name);
    if(finished&&Math.max(finished.r.wHi,finished.r.wLo)<3)h.violation('POSTSEASON_PREMATURE_SERIES',{before,loaded,finished});
    witness(h,'postseason-save',{before,loaded,finished});return {beforeMax:before.maxGames,afterMax:loaded.maxGames,roundFinished:!!finished,wins:finished?[finished.r.wHi,finished.r.wLo]:null,games:finished?.r.games.length};
  });
  test('render-tabs-and-refresh',h=>{
    h.spring();play(h,12);const tabs=['dash','inbox','feed','squad','lineup','train','sched','stand','leaders','trade','club'];for(const t of tabs)h.action('render '+t,()=>h.App.tab(t));
    for(const mode of ['bat','pit','farm'])h.action('squad '+mode,()=>h.App.squadView(mode));const p=h.K.ROSTERS[h.user].farm[0];h.action('farm player profile',()=>h.App.player(h.user,p.n));
    const stored=new Map(h.storage),fresh=make('autosave-boot',h.seed,{storage:stored});assert.equal(fresh.context().userGames,12);assert.equal(fresh.user,h.user);
    audit.pass('all tabs, farm profile, autosave boot');return {tabs:tabs.length,restoredGames:fresh.context().userGames};
  });
  test('repeatability',h=>{
    h.spring();play(h,3);const other=make('repeatability-second',h.seed).start();other.spring();play(other,3);
    assert.equal(json(h.saveObject()),json(other.saveObject()));audit.pass('seed and frozen Date reproduce whole state');return {sameState:true,seed:h.seed};
  });
};
