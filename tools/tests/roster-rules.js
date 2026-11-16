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
    const ssg = h.K.ROSTERS.SSG;
    assert.ok(ssg.farm.some(p=>p.n==='해치'&&p.f&&!p.aq),'SSG: Hatch must start in Futures');
    for (const n of ['에레디아','아빌라','베니지아노','타케다']) {
      assert.ok(ssg.batters.concat(ssg.pitchers).some(p=>p.n===n),`SSG: retain ${n}`);
    }
  });
};
