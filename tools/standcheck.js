// Usage: node tools/standcheck.js <core.js> [seasons]  -> average wins per club over full 144-game seasons (with fatigue/resting)
const path = require('path');
require(path.resolve(process.argv[2]));
const K = globalThis.KBO, seasons = +(process.argv[3] || 20), snap = JSON.stringify(K.ROSTERS);
const W = {}; K.TEAM_IDS.forEach(t => W[t] = 0);
for (let s = 0; s < seasons; s++) {
  const fresh = JSON.parse(snap); for (const t in fresh) K.ROSTERS[t] = fresh[t];
  const cfg = {}, gc = {};
  K.TEAM_IDS.forEach(t => { const d = K.defaultLineup(t); cfg[t] = { teamId: t, lineup: d.lineup, bullpen: d.bullpen, closer: d.closer, rotation: d.rotation }; gc[t] = 0; });
  const ids = K.TEAM_IDS.slice(), n = ids.length, rounds = [];
  for (let r = 0; r < n - 1; r++) { const pairs = []; for (let i = 0; i < n / 2; i++) pairs.push([ids[i], ids[n - 1 - i]]); rounds.push(pairs); ids.splice(1, 0, ids.pop()); }
  const build = t => K.restAdjust(t, Object.assign({}, cfg[t], { spName: cfg[t].rotation[gc[t]++ % 5] }), { restBelow: 70 });
  for (let c = 0; c < 16; c++) rounds.forEach(pairs => pairs.forEach(p => {
    const home = c % 2 ? p[1] : p[0], away = c % 2 ? p[0] : p[1];
    const res = K.simGame(build(home), build(away), {});
    if (res.homeRuns > res.awayRuns) W[home]++; else if (res.awayRuns > res.homeRuns) W[away]++;
    [home, away].forEach(t => K.applyFatigue(t, res.box));
  }));
}
const ovr = t => { const r = K.ROSTERS[t]; const a = r.batters.concat(r.pitchers).map(K.ovr); return (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1); };
Object.entries(W).sort((a, b) => b[1] - a[1]).forEach(([t, w], i) => console.log(`${i + 1}. ${t.padEnd(4)} ${(w / seasons).toFixed(1)}승  (평균 OVR ${ovr(t)})`));
