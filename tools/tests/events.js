'use strict';
const {eventRuntime}=require('../../qa/event-runtime');
const fixtures=require('./event-fixtures');
module.exports=({assert,test})=>{
  const env=eventRuntime(fixtures),start=()=>{const h=new env.Runtime({observe:false}).start();h.E=h.ctx.__events;return h;};
  const card=(h,id,stage)=>h.E.build(h.E.templates().find(t=>t.id===id),stage||'stove');
  const advance=(h,g,starters=[])=>{h.state.schedule.forEach(x=>x.played=false);h.state.schedule.filter(x=>x.home===h.user||x.away===h.user).slice(0,g).forEach(x=>x.played=true);h.E.promiseTick(starters,false);};
  try{
    test('events: migration preserves old FA promises and save-safe state',()=>{
      const h=start();h.state.fm.promises=[{n:'old',need:4}];delete h.state.fm.evt;h.FM.ensure();
      assert.equal(h.state.fm.promises[0].n,'old');for(const k of ['seed','seen','flags','pending','promises','log'])assert(k in h.state.fm.evt);
      const e=card(h,'test-starts');assert.deepEqual(Object.keys(e.opts[0].promise.who).sort(),['n','t']);
      h.E.resolve(e,0);assert.equal(h.state.fm.evt.pending[0].ctx.vet.n,e.ctx.vet.n);
      h.App.save();const before=JSON.stringify(h.state.fm.evt);h.App.load();assert.equal(JSON.stringify(h.state.fm.evt),before);
    });
    test('events: seeded draws, cooldown, rare minimum and data precedence',()=>{
      const h=start(),e=h.E.state();h.E.data().splice(0,6,...fixtures());
      h.E.data().push({id:'raise',stage:'stove',rarity:'common',make:()=>({title:'override',body:'test',opts:[{l:'ok',d:'ok'}]})});
      assert.equal(h.E.templates().filter(t=>t.id==='raise').length,1);
      const d=card(h,'test-starts');h.E.mark(d);assert(!h.E.eligible(h.E.templates()[0]));h.state.year++;assert(!h.E.eligible(h.E.templates()[0]));h.state.year++;assert(h.E.eligible(h.E.templates()[0]));
      const rare=h.E.templates().find(t=>t.id==='test-camp');rare.cool=1;e.seen[rare.id]=[h.state.year-3];assert(!h.E.eligible(rare));
      const saved=JSON.stringify(e);const run=()=>Array.from({length:8},()=>h.E.draw('camp')?.id||null);
      const a=run();h.state.fm.evt=JSON.parse(saved);assert.deepEqual(run(),a);
      const bad={id:'null',stage:'stove',pick:()=>({p:null}),make:()=>{throw Error('must not run');}};assert.equal(h.E.build(bad,'stove'),null);
      assert.equal(h.E.draw('spring'),null);assert(!a.includes('test-check'));
    });
    test('events: chain restores actor and previous choice; departed actors cancel',()=>{
      const h=start(),e=card(h,'test-starts');h.E.mark(e);h.E.resolve(e,0);advance(h,4);
      const next=h.E.pending('season');assert.equal(next.id,'test-check');assert.equal(next.prev.choice,'약속');assert.equal(next.prev.i,0);h.E.resolve(next,0);assert.equal(h.E.state().flags.checked,true);
      h.E.state().seen={};const again=card(h,'test-starts');h.E.resolve(again,0);const r=h.K.ROSTERS[h.user];r.batters=r.batters.filter(p=>p.n!==again.ctx.vet.n);r.farm=r.farm.filter(p=>p.n!==again.ctx.vet.n);advance(h,8);assert.equal(h.E.pending('season'),null);assert.equal(h.E.state().pending.length,0);
    });
    test('events: starts counts starts, fails at deadline, pitcher starts and notrade opening',()=>{
      const h=start(),e=card(h,'test-starts');h.E.resolve(e,0);advance(h,1,[e.ctx.vet.n]);advance(h,1,[e.ctx.vet.n]);assert.equal(h.FM.evtPromises()[0].done,1);advance(h,2,[e.ctx.vet.n]);assert.equal(h.E.state().flags['promise:test-starts|'+e.ctx.vet.n],true);
      const failed=card(h,'test-starts');h.E.resolve(failed,0);for(let g=3;g<=6;g++)advance(h,g,[]);assert.equal(h.E.state().flags['promise:test-starts|'+failed.ctx.vet.n],false);
      const pit=card(h,'test-season-rare','season');h.E.resolve(pit,0);advance(h,7,[pit.ctx.vet.n]);advance(h,8,[pit.ctx.vet.n]);assert.equal(h.E.state().flags['promise:test-season-rare|'+pit.ctx.vet.n],true);
      const nt=card(h,'test-notrade');h.E.resolve(nt,0);h.FM.openSeason();assert.equal(h.E.state().flags['promise:test-notrade|'+nt.ctx.vet.n],true);
      const traded=card(h,'test-notrade');h.E.resolve(traded,0);h.state.fm.tradeLog.push({a:h.user,b:'LG',aGive:[{n:traded.ctx.vet.n}],bGive:[]});h.E.promiseTick([],true);assert.equal(h.E.state().flags['promise:test-notrade|'+traded.ctx.vet.n],false);
    });
    test('events: active/callup progress, inbox last-option expiry, effects and replay',()=>{
      const h=start(),p=h.K.ROSTERS[h.user].batters[0],ref=h.E.pack(p);
      const make=(kind)=>({id:'extra-'+kind,stage:'season',year:h.state.year,ctx:{},opts:[{l:'yes',d:'test',promise:{kind,who:ref,n:2,within:3}}]});
      h.E.resolve(make('active'),0);advance(h,1);assert.equal(h.FM.evtPromises()[0].done,1);
      h.K.ROSTERS[h.user].batters=h.K.ROSTERS[h.user].batters.filter(x=>x!==p);h.K.ROSTERS[h.user].farm.push(p);advance(h,2);assert.equal(h.E.state().flags['promise:extra-active|'+p.n],false);
      h.E.resolve(make('callup'),0);h.K.ROSTERS[h.user].farm=h.K.ROSTERS[h.user].farm.filter(x=>x!==p);h.K.ROSTERS[h.user].batters.push(p);advance(h,3);advance(h,4);assert.equal(h.E.state().flags['promise:extra-callup|'+p.n],true);
      const e=card(h,'test-season','season'); // ensure the when condition is true
      assert.equal(e,null);advance(h,10);const inbox=card(h,'test-season','season');h.E.inbox(inbox);const m=h.state.fm.inbox[0];assert.equal(m.def,1);h.state.fm.clock=m.due;
      h.state.fm.camp={year:h.state.year,focus:'bal'};h.FM.startSpring();h.FM.springSimAll();assert.equal(m.done,true);assert.equal(inbox.resolved,true);assert.equal(h.E.state().log.find(x=>x.id==='test-season').choice,1);
      const before={seed:h.E.state().seed,fans:h.FM.fans(),conf:h.state.fm.board.conf};const fx=[['chance',.5,[['fans',2]],[['conf',-2]]]];const a=h.E.apply(fx);h.E.state().seed=before.seed;h.state.fm.fans=before.fans;h.state.fm.board.conf=before.conf;assert.equal(JSON.stringify(h.E.apply(fx)),JSON.stringify(a));
      const v=p.pow;h.E.apply([['stat',ref,'pow',-2]]);assert.equal(p.pow,v-2);assert.throws(()=>h.E.apply([['unknown',1]]));
    });
    test('events: regular delivery ceiling, no duplicate hook, stale pending cleanup',()=>{
      const h=start();h.spring();for(let i=0;i<35;i++)h.App.userGames(1);
      const messages=h.state.fm.inbox.filter(m=>m.event&&m.event.stage==='season').sort((a,b)=>a.ug-b.ug);for(let i=1;i<messages.length;i++)assert(messages[i].ug-messages[i-1].ug>=10);
      assert(h.E.state().recent.length<=20);const before=JSON.stringify(h.E.state());h.E.after({home:h.user,away:'LG'});assert.equal(JSON.stringify(h.E.state()),before);
      h.E.state().pending.push({id:'test-check',year:h.state.year-2,at:{games:900},ctx:{}});h.App.simRest();h.FM.answer();h.App.psAuto(true);h.nextSeason();assert(!h.E.state().pending.some(p=>p.year<h.state.year-1));
    });
    test('events: spring cadence, weighted draw and weekly chain priority',()=>{
      const h=start(),data=h.E.data();data.splice(0,data.length,...['common','uncommon','rare'].map((rarity,i)=>({id:'spring-'+i,stage:'spring',rarity,make:()=>({who:'test',title:'spring',body:'test',opts:[{l:'keep',d:'keep'}]})})));
      const counts=[0,0,0];for(let i=0;i<1000;i++){h.E.state().seen={};counts[+h.E.draw('spring').id.slice(-1)]++;}
      assert(counts[0]>500&&counts[0]<700);assert(counts[1]>220&&counts[1]<380);assert(counts[2]>50&&counts[2]<150);
      h.E.state().seen={};h.FM.offAuto(true);h.FM.startSpring();h.FM.springSimAll();
      const delivered=h.state.fm.inbox.filter(m=>m.event?.stage==='spring');assert(delivered.length>0);for(const m of delivered)assert.equal(m.at%3,0);
      data.push({id:'week-check',stage:'camp',chain:true,make:c=>({title:'week',body:c.prev.choice,opts:[{l:'keep',d:'keep'}]})});
      h.state.fm.off.stage='stove';h.state.fm.off.week=h.state.fm.off.weeks.length-1;
      h.E.resolve({id:'weekly',stage:'stove',ctx:{},title:'before',opts:[{l:'wait',d:'wait',then:{id:'week-check',afterWeeks:2}}]},0);
      assert.equal(h.E.state().pending[0].at.stage,'camp');assert.equal(h.E.state().pending[0].at.week,1);
      h.state.fm.off.stage='camp';h.state.fm.camp.week=1;assert.equal(h.E.off(h.state.fm.off).id,'week-check');
      data.push({id:'spring-chain',stage:'spring',chain:true,make:c=>({title:'chain',body:c.prev.choice,opts:[{l:'keep',d:'keep'}]})});
      h.E.resolve({id:'camp-chain',stage:'camp',ctx:{},title:'camp',opts:[{l:'wait',d:'wait',then:{id:'spring-chain',afterWeeks:4}}]},0);
      const pending=h.E.state().pending[0];assert.equal(pending.at.stage,'spring');assert.equal(pending.at.week,1);assert.equal(pending.dueYear,h.state.year);
      assert.equal(h.E.pending('spring').id,'spring-chain');
    });
    test('events: audit rejects cumulative, nested-branch and unknown effects',()=>{
      const {validateCard}=require('../event_audit'),p={n:'test',t:'KIA'},check=fx=>validateCard({opts:[{l:'ok',d:'ok',fx}]},[]);
      assert.throws(()=>check([['fans',3],['fans',3]]));assert.throws(()=>check([['mor',p,10],['chance',.5,[['mor',p,6]],[]]]));
      assert.throws(()=>check([['stat',p,'invalid',1]]));assert.throws(()=>check([['alien',2]]));
      assert.throws(()=>validateCard({opts:[{l:'ok',d:'ok',then:{id:'missing'}}]},[]));assert.throws(()=>validateCard({opts:[]},[]));
      check([['chance',.5,[['stat',p,'pow',3]],[['stat',p,'pow',-3]]]]);
    });
  }finally{env.cleanup();}
};
