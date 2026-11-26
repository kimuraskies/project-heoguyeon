'use strict';
const fs=require('fs'), path=require('path');
const {Runtime} = require('../../qa/runtime');
// 0.82 immersion fixes (docs/immersion-plan-1122.md)
module.exports = ({assert,test}) => {
  test('play-by-play: hit and home-run directions follow the batted-ball angle', () => {
    const h=new Runtime({observe:false}).start('KIA');
    const out=h.eval(`(()=>{ const zone={L:'좌측',LC:'좌중간',C:'가운데',RC:'우중간',R:'우측'}, res={hr:0,bad:0,noBB:0};
      for(let i=0;i<40;i++){ const g=new K.InteractiveGame(buildCfg('KIA'),buildCfg('LG'),{maxInnings:9}); let n=0;
        while(!g.over&&n++<3000){ const ev=g.step(); if(!ev||ev.oc!=='HR') continue; res.hr++; if(!ev.bb){ res.noBB++; continue; }
          const t=Comm.result(g,{flavor:'any'},ev).t, want=zone[bbZone(ev.bb)]; if(t.indexOf(want+' 담장')<0) res.bad++; } }
      return res; })()`);
    assert.ok(out.hr>10,'enough home runs to check: '+out.hr);
    assert.equal(out.noBB,0,'every home run carries its batted ball');
    assert.equal(out.bad,0,'home-run call matches the angle');
  });
  test('no quoted lines put in the mouths of named players or coaches', () => {
    const dir=path.join(__dirname,'..','..','fm'), bad=[];
    for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js'))){ const s=fs.readFileSync(path.join(dir,f),'utf8');
      s.split('\n').forEach((l,i)=>{ if(/\$\{[\w.]*\.n\}: \\?"|\$\{n\}: "|수석코치: "/.test(l)) bad.push(f+':'+(i+1)); }); }
    assert.deepEqual(bad,[],'quoted lines found');
  });
  test('trade revisit: logged trades keep season WAR at the moment of the trade, revisits say 이적 후', () => {
    const h=new Runtime({observe:false}).start('KIA'); h.FM.quickStart(); for(let k=0;k<20&&h.state.phase==='regular';k++){ h.App.simRest(); h.FM.answer(); }
    const log=(h.state.fm.tradeLog||[]).filter(e=>e.phase==='regular');
    assert.ok(log.length>0,'some in-season trades happened');
    for(const e of log) for(const s of e.aGive.concat(e.bGive)) assert.ok(Number.isFinite(s.war0),'war0 on '+s.n);
    const rev=(h.state.fm.feed||[]).filter(x=>/다시 보는 트레이드/.test(x.title));
    for(const x of rev) assert.ok(x.body.includes('이적 후'),'revisit counts only after the trade');
  });
  test('story: opening picks get a check-in, the manager’s own players are marked and make news', () => {
    const h=new Runtime({observe:false}).start('KIA'); h.FM.offAuto(true); h.FM.setCamp('bal'); h.FM.offAuto(true); h.FM.startSpring(); h.FM.springSimAll();
    const o=h.state.fm.off; if(h.FM.offHasBattles()){ o.battles.forEach((b,i)=>h.FM.offPick(i,'b')); h.FM.offConfirm(); } else h.FM.openSeason();
    const used=new Set(h.state.cfgs.KIA.lineup.concat((o.battles||[]).flatMap(b=>[b.a,b.b])));
    const bench=h.K.ROSTERS.KIA.batters.find(p=>!used.has(p.n)); if(bench) h.FM.demote(bench.n); let farm=null;
    for(const p of h.K.ROSTERS.KIA.farm.filter(p=>!p.f&&!h.K.isInjured(p)).slice(0,8)){ h.FM.promote(p.n); if(!h.K.ROSTERS.KIA.farm.includes(p)){ farm=p; break; } }
    for(let k=0;k<20&&h.state.phase==='regular';k++){ h.App.simRest(); h.FM.answer(); }
    const mine=h.state.fm.mine||{}; assert.ok(Object.keys(mine).length>0,'some players are marked as the manager’s');
    if(farm) assert.equal((mine[farm.n]||{}).why,'callup');
    const picks=(h.state.fm.opening||{}).picks||[]; for(const x of picks) assert.ok(x.done,'opening pick '+x.win+' got its check-in');
    if(picks.length) assert.ok(h.state.fm.inbox.some(m=>/개막 때 고른/.test(m.subject)),'check-in message sent');
    assert.ok((h.state.fm.mineLog||[]).length>0,'milestone news for the manager’s players');
    for(const x of picks){ const p=h.state.fm&&[...h.K.ROSTERS.KIA.batters,...h.K.ROSTERS.KIA.pitchers,...h.K.ROSTERS.KIA.farm].find(q=>q.n===x.win); if(p) assert.ok((p.tlog||[]).some(t=>t[1]==='개막 주전으로 선택'),'trust remembers the opening pick'); }
    assert.ok(h.state.fm.inbox.some(m=>/40경기 중간 평가/.test(m.subject))&&h.state.fm.inbox.some(m=>/80경기 중간 평가/.test(m.subject)),'board check-ins at 40 and 80 games');
  });
  test('상무: an accepted player leaves for two seasons and comes back to the 2군; parks differ', () => {
    const h=new Runtime({observe:false}).start('KIA'); let served=0, failed=0;
    for(let k=0;k<6;k++){ const p=h.K.ROSTERS.KIA.farm.filter(p=>!p.f)[k]; if(!p) break; h.state.fm.evt.flags.military=p.n; h.FM.militaryTick();
      const m=h.state.fm.mil[p.n]; if(m.status==='failed'){ failed++; continue; }
      assert.equal(m.status,'serving'); served++;
      assert.ok(!h.K.ROSTERS.KIA.farm.some(x=>x.n===p.n)&&!h.K.ROSTERS.KIA.batters.some(x=>x.n===p.n)&&!h.K.ROSTERS.KIA.pitchers.some(x=>x.n===p.n),'away from the roster');
      h.state.year+=2; h.FM.militaryTick(); h.state.year-=2;
      assert.equal(m.status,'back'); assert.ok(h.K.ROSTERS.KIA.farm.some(x=>x.n===p.n),'back in the 2군'); }
    assert.ok(served>0,'someone was accepted in six tries');
    assert.notEqual(h.FM.parkOf('KIA').cap,h.FM.parkOf('키움').cap);
  });
  test('scouting: other clubs show ranges, one scout trip a week narrows them', () => {
    const h=new Runtime({observe:false}).start('KIA'), p=h.K.ROSTERS.LG.batters[0];
    h.FM.scoutSend('LG',p.n); assert.equal(h.state.fm.scout[p.n],1);
    h.FM.scoutSend('LG',p.n); assert.equal(h.state.fm.scout[p.n],1,'only one trip per week');
  });
  test('보직 변경: label and depth chart change now, skill for the new job only through training; at least five starters stay', () => {
    const h=new Runtime({observe:false}).start('KIA'), K=h.K, c=h.state.cfgs.KIA, r=K.ROSTERS.KIA;
    const rp=r.pitchers.find(p=>p.role==='RP'&&p.n!==c.closer), before=K.roleSkill(rp,'SP');
    h.FM.setRole(rp.n,'SP'); assert.equal(rp.role,'SP'); assert.equal(K.roleSkill(rp,'SP'),before,'no instant starter skill'); assert.equal(rp.rt,'SP','training toward the new job');
    assert.ok(!c.bullpen.includes(rp.n));
    const sp=r.pitchers.find(p=>p.role==='SP'&&c.rotation.includes(p.n)&&p!==rp); h.FM.setRole(sp.n,'RP');
    assert.equal(sp.role,'RP'); assert.ok(!c.rotation.includes(sp.n),'left the rotation'); assert.equal(c.rotation.length,5);
    const sps=()=>r.pitchers.filter(p=>p.role==='SP'); while(sps().length>5) sps()[0].role='RP';
    const last=sps()[0]; h.FM.setRole(last.n,'RP'); assert.equal(last.role,'SP','blocked below five starters');
    const oldCl=c.closer, nw=r.pitchers.find(p=>p.role==='RP'&&p.n!==oldCl); h.FM.setRole(nw.n,'CL');
    assert.equal(c.closer,nw.n); assert.equal(r.pitchers.find(p=>p.n===oldCl).role,'RP');
  });
};
