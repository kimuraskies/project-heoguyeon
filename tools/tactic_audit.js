// How often each sign is tried and how often it works over a season of AI-run games, plus league rates.
// Usage: node tools/tactic_audit.js [seasons]. Fails if a league rate leaves its range.
require('../core.js');
const K = globalThis.KBO;
const helpers = require('./tests/helpers');
const n = +process.argv[2] || 3, log = {}, s = {H: 0, AB: 0, SO: 0, BB: 0, PA: 0, R: 0, SB: 0, CS: 0, SH: 0}; let games = 0;
for (let y = 0; y < n; y++) {
  const counts = {};
  for (const [h, a] of helpers.schedule()) {
    const g = new K.InteractiveGame(helpers.config(h, counts[h] || 0), helpers.config(a, counts[a] || 0));
    counts[h] = (counts[h] || 0) + 1; counts[a] = (counts[a] || 0) + 1;
    let guard = 0; while (!g.over && guard++ < 2000) g.step();
    games++;
    for (const t of [h, a]) {
      for (const k in g.tlog[t]) { log[k] = log[k] || [0, 0]; log[k][0] += g.tlog[t][k][0]; log[k][1] += g.tlog[t][k][1]; }
      for (const b of Object.values(g.box[t].bat)) for (const k in s) s[k] += b[k] || 0;
    }
  }
}
console.log('sign             tries/game  success');
for (const k of Object.keys(log).sort()) console.log(k.padEnd(16), (log[k][0] / games).toFixed(3).padStart(9), (100 * log[k][1] / log[k][0]).toFixed(1).padStart(7) + '%');
const R = {AVG: s.H / s.AB, K: s.SO / s.PA, BB: s.BB / s.PA, R_TG: s.R / (2 * games), SB_TG: s.SB / (2 * games), SB_PCT: s.SB / (s.SB + s.CS), SH_G: s.SH / games};
console.log(Object.entries(R).map(([k, v]) => k + ' ' + v.toFixed(3)).join('  '));
const RANGE = {AVG: [.255, .285], K: [.17, .22], BB: [.08, .11], R_TG: [4.3, 5.5], SB_TG: [.5, .75], SB_PCT: [.62, .82]};
const bad = Object.entries(RANGE).filter(([k, [a, b]]) => R[k] < a || R[k] > b).map(([k]) => k);
if (bad.length) { console.error('OUT OF RANGE: ' + bad.join(', ')); process.exit(1); }
console.log('all league rates in range');
