'use strict';
const {Runtime} = require('../../qa/runtime');
// 개막 전 흐름: 스토브리그 3주 (단장 미팅·코치진 → 리더 선임 → 보강 과제), 캠프 4주 (방향 → 주장 건의 → 이벤트 → 인터뷰),
// 시범경기 9경기, 개막 엔트리 확정
module.exports = ({assert,test}) => {
  const ids = h => h.state.fm.off.q.map(e=>e.id);
  // resolves the stove/camp queue with the first option, recording what each week asked
  const play = (h, stage, out) => { const o=h.state.fm.off; let n=0;
    while(o.stage===stage && n++<40){ const w=stage==='camp'? h.state.fm.camp.week : o.week; (out[w]=out[w]||[]).push(...ids(h)); const k=o.q.length; for(let i=0;i<k;i++) h.FM.offChoose(0); } };
  test('preseason: 3 stove weeks with 2+ decisions, leaders card, camp captain and interview, 9 spring games', () => {
    const h = new Runtime({observe:false}).start('KIA'), o=h.state.fm.off;
    assert.equal(o.weeks.length,3,'three stove weeks');
    const stove={}; play(h,'stove',stove);
    assert.deepEqual(stove[0].slice(0,2),['owner','coach'],'week 1: GM meeting and coaching staff');
    assert.equal(stove[1][0],'leaders','week 2 opens with the leaders card');
    const L=h.FM.leaders(); assert.ok(L.captain&&L.pitchCap&&L.fieldCap,'all three leaders named: '+JSON.stringify(L));
    assert.notEqual(L.pitchCap,L.captain); assert.notEqual(L.fieldCap,L.captain);
    assert.ok(h.FM.leaderTag(L.captain).includes('주장'));
    assert.ok(stove[0].length>=2,'week 1 asks at least two things');
    assert.equal(o.stage,'dir');
    h.FM.setCamp('bal'); assert.equal(o.stage,'camp'); assert.equal(h.state.fm.camp.week,1,'the direction is camp week 1');
    const camp={}; play(h,'camp',camp);
    assert.equal(h.state.fm.camp.week,4); assert.equal(o.stage,'done');
    assert.ok(camp[3]&&camp[3][0]==='interview','camp week 4 is the press interview: '+JSON.stringify(camp));
    assert.ok(Array.isArray(o.battles)&&o.battles.length<=3,'job battles named at the interview');
    h.FM.startSpring(); const sp=h.state.spring; assert.equal(sp.games.length,9);
    h.FM.springSimAll(); assert.equal(sp.played,9);
    if(h.FM.offHasBattles()){ h.FM.offRoster(); h.FM.offConfirm(true); } else h.FM.openSeason();
    assert.equal(h.state.phase,'regular');
  });
  test('preseason: quick start names the leaders and plays all 9 spring games', () => {
    const h = new Runtime({observe:false}).start('LG');
    h.FM.quickStart(); assert.equal(h.state.phase,'regular'); assert.ok(h.FM.leaders().captain);
    assert.equal(h.state.spring.played,9);
  });
};
