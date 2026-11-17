'use strict';
const {Runtime} = require('../../qa/runtime');
module.exports = ({assert,test}) => {
  test('new career: all 10 clubs obey foreign, Asia and active roster limits', () => {
    const h = new Runtime({observe:false}).start('SSG');
    assert.equal(h.K.TEAM_IDS.length,10);
    for (const t of h.K.TEAM_IDS) {
      const r = h.K.ROSTERS[t], active = r.batters.concat(r.pitchers);
      const foreign = active.filter(p=>p.f&&!p.aq), asia = active.filter(p=>p.aq);
      assert.ok(foreign.length<=3,`${t}: foreign ${foreign.map(p=>p.n).join(', ')}`);
      assert.ok(asia.length<=1,`${t}: Asia quota ${asia.map(p=>p.n).join(', ')}`);
      assert.ok(active.length<=h.FM.ENTRY_MAX,`${t}: active ${active.length}/${h.FM.ENTRY_MAX}`);
      assert.ok(r.batters.length>=12,`${t}: fewer than 12 batters`);
      assert.ok(r.pitchers.length>=11,`${t}: fewer than 11 pitchers`);
      assert.ok(r.pitchers.filter(p=>p.role==='SP').length>=5,`${t}: fewer than 5 starters`);
      const names = active.concat(r.farm).map(p=>p.n);
      assert.equal(new Set(names).size,names.length,`${t}: duplicate active/farm player`);
      const cfg = h.state.cfgs[t];
      for (const n of cfg.rotation) assert.ok(r.pitchers.some(p=>p.n===n),`${t}: stale rotation ${n}`);
      for (const n of cfg.lineup) assert.ok(r.batters.some(p=>p.n===n),`${t}: stale lineup ${n}`);
    }
    // each club's latest 2026 signings hold the 1군 slots; the players they replaced start in the 2군
    const on = t => h.K.ROSTERS[t].batters.concat(h.K.ROSTERS[t].pitchers).map(p=>p.n);
    const farm = t => h.K.ROSTERS[t].farm.map(p=>p.n);
    const want = {KIA:[['카스트로','네일','올러','시라카와'],['데일']], SSG:[['에레디아','해치','아빌라','타케다'],['베니지아노']],
      KT:[['힐리어드','로건','대니엘','스기모토'],['보쉴리','사우어']], 두산:[['세베리노','벤자민','잭로그','타카다'],['카메론']]};
    for (const [t,[up,down]] of Object.entries(want)) {
      for (const n of up) assert.ok(on(t).includes(n),`${t}: ${n} should be on the 1군`);
      for (const n of down) assert.ok(farm(t).includes(n),`${t}: ${n} should start in the 2군`);
    }
    assert.ok(h.K.ROSTERS.KIA.farm.concat(h.K.ROSTERS.KIA.pitchers).find(p=>p.n==='시라카와').aq,'KIA: 시라카와 is the Asia quota');

  });
};
