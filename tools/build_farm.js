// Build farm.js: each club's 2군 (Futures League) squad from the real 2026 players
// who appeared in KBO games but are not on the 1군 roster in core.js (rostered=0 in
// data/players2026.csv). Up to 14 hitters and 14 pitchers per club, most-used first.
// Futures clubs need starters: young relievers (26 or under) with the most stamina fill the rotation, so a
// veteran bullpen arm sent down stays in the bullpen.
// Hitters get their position from build_roster.js (fielding record, else the profile position group). Run: node tools/build_farm.js
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const csv = fs.readFileSync(path.join(root, 'data', 'players2026.csv'), 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/);
const head = csv[0].split(',');
const rows = csv.slice(1).map(l => { const c = l.split(','); const o = {}; head.forEach((h, i) => o[h] = c[i]); return o; });
const core = fs.readFileSync(path.join(root, 'core.js'), 'utf8');
const foreign = new Set(JSON.parse(core.match(/var FOREIGN = (\[[^\]]*\])/)[1]));
// the game keys players by name, so a namesake of a 1군 player or of another farmhand is left out
const taken = new Set([...core.matchAll(/\b[BP]\("([^"]+)"/g)].map(m => m[1]));
const MAX = { B: 14, P: 14 }, SP = 5;
const farm = {};
const teams = [...new Set(rows.map(r => r.team))];
for (const t of teams) {
  const pool = rows.filter(r => r.team === t && r.rostered === '0' && !foreign.has(r.name) && !taken.has(r.name));
  const take = type => pool.filter(r => r.type === type).sort((a, b) => b['PA/TBF'] - a['PA/TBF']).slice(0, MAX[type]);
  // hitters with no fielding record (DH in the data) get a corner spot and a fringe glove
  const bat = take('B').map(r => r['pos/role'] === 'DH' ? Object.assign({}, r, { 'pos/role': +r['spd/sta'] >= 80 ? 'LF' : '1B', fld: Math.max(+r.fld, 58), arm: Math.max(+r.arm, 58) }) : r).map(r => [r.name, 'B', r['pos/role'], +r.age, +r.sal, +r['con/stu'], +r['pow/ctl'], +r['eye/mov'], +r['spd/sta'], +r.fld, +r.arm]);
  const pit = take('P').map(r => [r.name, 'P', r['pos/role'] === 'SP' ? 'SP' : 'RP', +r.age, +r.sal, +r['con/stu'], +r['pow/ctl'], +r['eye/mov'], +r['spd/sta']]);
  const sp = pit.filter(p => p[2] === 'SP');
  pit.filter(p => p[2] !== 'SP').sort((a, b) => (a[3] > 26) - (b[3] > 26) || b[8] - a[8]).slice(0, Math.max(0, SP - sp.length)).forEach(p => { p[2] = 'SP'; p[8] = Math.max(p[8], 62); });
  farm[t] = bat.concat(pit);
  farm[t].forEach(r => taken.add(r[0]));
}
const body = Object.entries(farm).map(([t, list]) => `${JSON.stringify(t)}:[\n${list.map(r => ' ' + JSON.stringify(r)).join(',\n')}\n]`).join(',\n');
fs.writeFileSync(path.join(root, 'farm.js'),
  `// 2026 2군(퓨처스리그) 선수단 · tools/build_farm.js 로 생성 (data/players2026.csv 의 1군 미등록 선수)\n` +
  `// row: [이름, 'B', 포지션, 나이, 연봉, 컨택, 파워, 선구, 주력, 수비, 송구] | [이름, 'P', 보직, 나이, 연봉, 구위, 제구, 무브, 체력]\n` +
  `window.KBO_FARM={\n${body}\n};\n`);
console.log(Object.entries(farm).map(([t, l]) => `${t} ${l.filter(r => r[1] === 'B').length}B/${l.filter(r => r[1] === 'P').length}P`).join(' · '));
