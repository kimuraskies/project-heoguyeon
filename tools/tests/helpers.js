'use strict';
const K = globalThis.KBO;
function config(t, game = 0, tac) {
  const d = K.defaultLineup(t);
  return { teamId: t, ...d, spName: d.rotation[game % d.rotation.length], tac };
}
function schedule() {
  const ids = K.TEAM_IDS.slice(), rounds = [];
  for (let r=0; r<ids.length-1; r++) {
    const pairs=[];
    for(let i=0;i<ids.length/2;i++) pairs.push([ids[i],ids[ids.length-1-i]]);
    rounds.push(pairs); ids.splice(1,0,ids.pop());
  }
  const games=[];
  for(let c=0;c<16;c++) for(const pairs of rounds) for(const p of pairs)
    games.push(c%2 ? [p[1],p[0]] : p.slice());
  return games;
}
function finish(g, assert) {
  let steps=0;
  while(!g.over && steps++<2000) g.step();
  assert.ok(g.over, 'game must terminate within 2000 events');
  return g.result();
}
const positions = ['C','1B','2B','3B','SS','LF','CF','RF','DH'].sort();
module.exports={config,schedule,finish,positions};
