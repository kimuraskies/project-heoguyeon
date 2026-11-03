// Turn a season's raw KBO records (data/kbo<season>.json, from fetch_kbo.js) into game ratings.
// usage: node tools/build_roster.js [season=2026]
//   writes data/players<season>.csv (every rated player, for review) and rewrites the ROSTERS block in core.js.
//   data/overrides.json is applied last: { "<playerId or name>": { "con":80, "team":"KIA", "pos":"SS", "drop":true, ... } }
//
// Ratings come from inverting the engine's plate-appearance model (core.js simPA), so a player's real
// K%, BB%, HR% and BABIP come back out of the sim against a league-average (all-70) opponent:
//   pK  = LEAGUE.K  + .0048*(stu-con)     pBB = LEAGUE.BB + .0040*(eye-ctl)
//   pHR = LEAGUE.HR + .0014*(pow-70) - .0011*(mov-70)
//   BABIP = LEAGUE.BIP + .0024*(con-70) + .0016*(spd-70) - .0019*(mov-70)
// LEAGUE (the season's real league rates) is written into core.js next to the rosters, so 70 is always
// exactly league average. Small samples are pulled toward the league rate before inverting.
const fs = require('fs');
const path = require('path');

const SEASON = +(process.argv[2] || 2026);
const ROOT = path.join(__dirname, '..');
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', `kbo${SEASON}.json`), 'utf8'));
const OVR_FILE = path.join(ROOT, 'data', 'overrides.json');
const overrides = fs.existsSync(OVR_FILE) ? JSON.parse(fs.readFileSync(OVR_FILE, 'utf8')) : {};

// KBO site team code -> game team key, display name, color
const TEAMS = {
  HT: ['KIA', 'KIA 타이거즈', '#ea0029'], LG: ['LG', 'LG 트윈스', '#c30452'], HH: ['한화', '한화 이글스', '#fc4e00'],
  SK: ['SSG', 'SSG 랜더스', '#ce0e2d'], SS: ['삼성', '삼성 라이온즈', '#074ca1'], NC: ['NC', 'NC 다이노스', '#315288'],
  KT: ['KT', 'KT 위즈', '#000000'], LT: ['롯데', '롯데 자이언츠', '#041e42'], OB: ['두산', '두산 베어스', '#1a1748'],
  WO: ['키움', '키움 히어로즈', '#570514'],
};
const ROSTER = { batters: 14, SP: 5, RP: 6 }; // + 1 closer
const USD_KRW = 1400;

const num = s => { if (s == null || s === '-' || s === '') return 0; const m = String(s).match(/^(\d+)(?:\s+(\d)\/3)?$/); return m ? +m[1] + (m[2] ? m[2] / 3 : 0) : +s || 0; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const regress = (count, n, lg, k) => (count + lg * k) / (n + k);
const col = (head, name) => head.indexOf(name);

// ---- collect per-player totals across team stints; the player belongs to the team he played most for ----
function collect(tableKey, headKey, fields, weightField) {
  const head = raw.tables[headKey], by = {};
  for (const code of Object.keys(TEAMS)) {
    for (const r of raw.tables[tableKey][code] || []) {
      if (!r.id) continue;
      const p = by[r.id] || (by[r.id] = { id: r.id, n: r.cells[1], stints: {} });
      const s = {};
      for (const f of fields) s[f] = num(r.cells[col(head, f)]);
      p.stints[code] = s;
    }
  }
  for (const p of Object.values(by)) {
    p.tot = {};
    for (const f of fields) p.tot[f] = Object.values(p.stints).reduce((a, s) => a + s[f], 0);
    p.code = Object.entries(p.stints).sort((a, b) => b[1][weightField] - a[1][weightField])[0][0];
  }
  return by;
}
const HIT = collect('hit', 'hitHead', ['G', 'PA', 'AB', 'H', '2B', '3B', 'HR', 'SB', 'CS', 'BB', 'HBP', 'SO'], 'PA');
const PIT = collect('pit', 'pitHead', ['G', 'SV', 'HLD', 'TBF', 'IP', 'H', 'HR', 'BB', 'HBP', 'SO'], 'IP');

// defense rows: one per player per position
const DEF = {};
{
  const head = raw.tables.defHead;
  for (const code of Object.keys(TEAMS)) for (const r of raw.tables.def[code] || []) {
    if (!r.id) continue;
    const g = k => num(r.cells[col(head, k)]);
    (DEF[r.id] = DEF[r.id] || []).push({ pos: r.cells[col(head, 'POS')], G: g('G'), GS: g('GS'), inn: g('IP'), E: g('E'), PO: g('PO'), A: g('A'), PB: g('PB'), SB: g('SB'), CS: g('CS') });
  }
}
const POS = { 포수: 'C', '1루수': '1B', '2루수': '2B', '3루수': '3B', 유격수: 'SS', 좌익수: 'LF', 중견수: 'CF', 우익수: 'RF' };

// ---- league rates ----
function lgRate(by, num_, den) { let a = 0, b = 0; for (const p of Object.values(by)) { a += num_(p.tot); b += den(p.tot); } return a / b; }
// "rest" of the plate appearances in the engine's sense: everything but K, BB, HBP, HR (sacrifices included)
const bBIP = t => t.PA - t.SO - t.BB - t.HBP - t.HR;
const pBIP = t => t.TBF - t.BB - t.HBP - t.SO - t.HR;
const LB = {
  K: lgRate(HIT, t => t.SO, t => t.PA), BB: lgRate(HIT, t => t.BB, t => t.PA), HR: lgRate(HIT, t => t.HR, t => t.PA),
  BABIP: lgRate(HIT, t => t.H - t.HR, bBIP),
};
const LP = {
  K: lgRate(PIT, t => t.SO, t => t.TBF), BB: lgRate(PIT, t => t.BB, t => t.TBF), HR: lgRate(PIT, t => t.HR, t => t.TBF),
  BABIP: lgRate(PIT, t => t.H - t.HR, pBIP),
};
const r4 = x => Math.round(x * 10000) / 10000;
const LEAGUE = {
  K: r4(LB.K), BB: r4(LB.BB), HBP: r4(lgRate(HIT, t => t.HBP, t => t.PA)), HR: r4(LB.HR), BIP: r4(LB.BABIP),
  X2: r4(lgRate(HIT, t => t['2B'], t => t.H - t.HR)), X3: r4(lgRate(HIT, t => t['3B'], t => t.H - t.HR)),
};

// ---- hitters ----
function pct(arr, x) { if (!arr.length) return 0.5; let lo = 0; for (const v of arr) if (v < x) lo++; return lo / arr.length; }
const regulars = Object.values(HIT).filter(p => p.tot.PA >= 100);
const sbRate = t => (t.SB + t.CS) / Math.max(1, t.H - t['2B'] - t['3B'] - t.HR + t.BB + t.HBP);
const SB_LG = regulars.reduce((a, p) => a + sbRate(p.tot), 0) / regulars.length;
const spdScore = t => regress((t.SB + t.CS), Math.max(1, t.H - t['2B'] - t['3B'] - t.HR + t.BB + t.HBP), SB_LG, 40) + 0.6 * regress(t['3B'], Math.max(1, t.H), 0.015, 60);
const SPD_DIST = regulars.map(p => spdScore(p.tot)).sort((a, b) => a - b);

// fielding: compare range (PO+A per 9 inn) and errors with others at the same position
const POS_STATS = {};
for (const rows of Object.values(DEF)) for (const d of rows) {
  const k = POS[d.pos]; if (!k || d.inn < 150) continue;
  const s = POS_STATS[k] || (POS_STATS[k] = { rf: [], ep: [], ar: [], cs: [] });
  s.rf.push((d.PO + d.A) / d.inn * 9); s.ep.push(d.E / Math.max(1, d.PO + d.A + d.E)); s.ar.push(d.A / d.inn * 9);
  if (k === 'C' && d.SB + d.CS > 10) s.cs.push(d.CS / (d.SB + d.CS));
}
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))) || 1; };
const z = (k, key, x, inn) => { const s = POS_STATS[k]; if (!s || !s[key].length) return 0; return (x - mean(s[key])) / sd(s[key]) * (inn / (inn + 300)); };
const FLD_BASE = { C: 72, '1B': 62, '2B': 72, '3B': 70, SS: 76, LF: 64, CF: 76, RF: 68, DH: 40 };
const ARM_BASE = { C: 72, '1B': 58, '2B': 64, '3B': 72, SS: 74, LF: 64, CF: 70, RF: 76, DH: 50 };

function hitterRatings(p) {
  const t = p.tot;
  const K = regress(t.SO, t.PA, LB.K, 60), BB = regress(t.BB, t.PA, LB.BB, 120), HR = regress(t.HR, t.PA, LB.HR, 170);
  const BABIP = regress(t.H - t.HR, bBIP(t), LB.BABIP, 820);
  const spd = clamp(Math.round(43 + 54 * pct(SPD_DIST, spdScore(t))), 30, 97); // regulars' median = 70
  // contact = strikeout avoidance (60%) blended with hits on balls in play beyond what speed explains (40%)
  const con = 70 + 0.6 * (LB.K - K) / 0.0048 + 0.4 * ((BABIP - LB.BABIP) - 0.0016 * (spd - 70)) / 0.0024;
  const eye = 70 + (BB - LB.BB) / 0.004;
  const pow = 70 + (HR - LB.HR) / 0.0014;
  // position: most innings in the field; little fielding for a regular -> DH
  const rows = (DEF[p.id] || []).filter(d => POS[d.pos]).sort((a, b) => b.inn - a.inn);
  const totInn = rows.reduce((a, d) => a + d.inn, 0);
  const main = rows[0];
  let pos = main ? POS[main.pos] : 'DH';
  if (!main || totInn < t.G * 2.5) pos = 'DH';
  let fld = FLD_BASE[pos], arm = ARM_BASE[pos];
  if (pos !== 'DH' && main) {
    const inn = main.inn, rf = (main.PO + main.A) / Math.max(1, inn) * 9, ep = main.E / Math.max(1, main.PO + main.A + main.E);
    if (pos === 'C') {
      fld += -5 * z('C', 'ep', ep, inn) - (main.PB / Math.max(1, inn) * 9 > 0.06 ? 3 : 0);
      const att = main.SB + main.CS;
      arm += att > 10 ? 9 * ((main.CS / att) - mean(POS_STATS.C.cs)) / sd(POS_STATS.C.cs) * (att / (att + 40)) : 0;
    } else {
      fld += 6 * z(pos, 'rf', rf, inn) - 5 * z(pos, 'ep', ep, inn);
      arm += 6 * z(pos, 'ar', main.A / Math.max(1, inn) * 9, inn);
    }
  }
  return { con, pow, eye, spd, fld, arm, pos };
}

// ---- pitchers ----
const starts = id => (DEF[id] || []).filter(d => d.pos === '투수').reduce((a, d) => a + d.GS, 0);
const SP_DIST = [], RP_DIST = [];
for (const p of Object.values(PIT)) {
  const gs = starts(p.id); p.gs = gs;
  if (gs >= 8) SP_DIST.push(p.tot.IP / gs); else if (p.tot.G >= 15) RP_DIST.push(p.tot.IP / p.tot.G);
}
SP_DIST.sort((a, b) => a - b); RP_DIST.sort((a, b) => a - b);

function pitcherRatings(p) {
  const t = p.tot;
  const K = regress(t.SO, t.TBF, LP.K, 70), BB = regress(t.BB, t.TBF, LP.BB, 170), HR = regress(t.HR, t.TBF, LP.HR, 600);
  const BABIP = regress(t.H - t.HR, Math.max(0, pBIP(t)), LP.BABIP, 1500);
  const stu = 70 + (K - LP.K) / 0.0048;
  const ctl = 70 - (BB - LP.BB) / 0.004;
  // movement = home-run suppression (60%) blended with hits allowed on balls in play (40%)
  const mov = 70 + 0.6 * (LP.HR - HR) / 0.0011 + 0.4 * (LP.BABIP - BABIP) / 0.0019;
  const isSP = p.gs >= Math.max(5, t.G * 0.5);
  const sta = isSP ? 62 + 26 * pct(SP_DIST, t.IP / Math.max(1, p.gs)) : 38 + 14 * pct(RP_DIST, t.IP / Math.max(1, t.G));
  return { stu, ctl, mov, sta, isSP };
}

// ---- profile info ----
function age(id) { const b = raw.info[id] && raw.info[id].birth; return b ? SEASON - +b.slice(0, 4) : 27; }
function salary(id) {
  const s = raw.info[id] && raw.info[id].salary; if (!s) return null;
  const eok = s.unit === '달러' ? s.amount * USD_KRW / 1e8 : s.amount / 1e4;
  return Math.round(eok * 10) / 10;
}
const ov = p => ({ ...(overrides[p.n] || {}), ...(overrides[p.id] || {}) });
const R = x => clamp(Math.round(x), 25, 99);

// ---- build rosters ----
const teams = {};
for (const code of Object.keys(TEAMS)) teams[code] = { batters: [], pitchers: [] };
const csv = [['id', 'team', 'name', 'type', 'pos/role', 'age', 'sal', 'PA/TBF', 'con/stu', 'pow/ctl', 'eye/mov', 'spd/sta', 'fld', 'arm', 'ovr', 'rostered'].join(',')];

const hitters = Object.values(HIT).filter(p => p.tot.PA >= 10 && !(PIT[p.id] && PIT[p.id].tot.TBF > p.tot.PA)).map(p => {
  const r = hitterRatings(p), o = ov(p);
  const b = { id: p.id, n: p.n, pos: o.pos || r.pos, age: o.age || age(p.id), con: R(r.con), pow: R(r.pow), eye: R(r.eye), spd: R(r.spd), fld: R(r.fld), arm: R(r.arm), sal: salary(p.id), PA: p.tot.PA, code: p.code };
  for (const k of ['con', 'pow', 'eye', 'spd', 'fld', 'arm', 'sal']) if (o[k] != null) b[k] = o[k];
  if (o.team) b.code = Object.keys(TEAMS).find(c => TEAMS[c][0] === o.team) || b.code;
  b.drop = !!o.drop;
  return b;
});
const pitchers = Object.values(PIT).filter(p => p.tot.TBF >= 15).map(p => {
  const r = pitcherRatings(p), o = ov(p);
  const q = { id: p.id, n: p.n, role: r.isSP ? 'SP' : 'RP', age: o.age || age(p.id), stu: R(r.stu), ctl: R(r.ctl), mov: R(r.mov), sta: R(r.sta), sal: salary(p.id), TBF: p.tot.TBF, IP: p.tot.IP, G: p.tot.G, SV: p.tot.SV, HLD: p.tot.HLD, gs: p.gs, code: p.code };
  for (const k of ['stu', 'ctl', 'mov', 'sta', 'sal', 'role']) if (o[k] != null) q[k] = o[k];
  if (o.team) q.code = Object.keys(TEAMS).find(c => TEAMS[c][0] === o.team) || q.code;
  q.drop = !!o.drop;
  return q;
});

const ovrB = p => Math.round(p.con * 0.28 + p.pow * 0.24 + p.eye * 0.16 + p.spd * 0.12 + p.fld * 0.12 + p.arm * 0.08);
const ovrP = p => { const w = p.role === 'SP' ? [0.34, 0.26, 0.24, 0.16] : [0.40, 0.26, 0.28, 0.06]; return Math.round(p.stu * w[0] + p.ctl * w[1] + p.mov * w[2] + p.sta * w[3]); };

for (const code of Object.keys(TEAMS)) {
  // batters: most plate appearances, but always two catchers
  const pool = hitters.filter(b => b.code === code && !b.drop).sort((a, b) => b.PA - a.PA);
  const pick = pool.filter(b => b.pos === 'C').slice(0, 2);
  for (const b of pool) if (pick.length < ROSTER.batters && !pick.includes(b)) pick.push(b);
  teams[code].batters = pick.sort((a, b) => b.PA - a.PA);
  // pitchers: 5 starters by starts, the closer by saves, then relievers by innings
  const pp = pitchers.filter(p => p.code === code && !p.drop);
  const sp = pp.filter(p => p.role === 'SP').sort((a, b) => b.gs - a.gs || b.IP - a.IP).slice(0, ROSTER.SP);
  for (const p of pp.filter(p => p.role !== 'SP').sort((a, b) => b.gs - a.gs)) if (sp.length < ROSTER.SP) { p.role = 'SP'; sp.push(p); }
  const rest = pp.filter(p => !sp.includes(p));
  const cl = rest.slice().sort((a, b) => b.SV - a.SV || b.HLD - a.HLD)[0];
  if (cl) cl.role = 'CL';
  const rp = rest.filter(p => p !== cl).sort((a, b) => b.IP - a.IP).slice(0, ROSTER.RP);
  rp.forEach(p => { p.role = 'RP'; });
  teams[code].pitchers = [...sp, ...(cl ? [cl] : []), ...rp];
  // same name twice on one club: add the birth year so lookups by name stay unique
  const all = [...teams[code].batters, ...teams[code].pitchers], seen = {};
  for (const p of all) seen[p.n] = (seen[p.n] || 0) + 1;
  for (const p of all) if (seen[p.n] > 1) { const b = raw.info[p.id] && raw.info[p.id].birth; p.n += b ? b.slice(2, 4) : p.id.slice(-2); }
}

const rostered = new Set();
for (const t of Object.values(teams)) for (const p of [...t.batters, ...t.pitchers]) rostered.add(p.id);
for (const b of hitters) csv.push([b.id, TEAMS[b.code][0], b.n, 'B', b.pos, b.age, b.sal ?? '', b.PA, b.con, b.pow, b.eye, b.spd, b.fld, b.arm, ovrB(b), rostered.has(b.id) ? 1 : 0].join(','));
for (const p of pitchers) csv.push([p.id, TEAMS[p.code][0], p.n, 'P', p.role, p.age, p.sal ?? '', p.TBF, p.stu, p.ctl, p.mov, p.sta, '', '', ovrP(p), rostered.has(p.id) ? 1 : 0].join(','));
fs.writeFileSync(path.join(ROOT, 'data', `players${SEASON}.csv`), '﻿' + csv.join('\n') + '\n');

// ---- write the ROSTERS block into core.js ----
const q = s => JSON.stringify(s);
const salArg = s => (s == null ? '' : `,${s}`);
let block = `var ROSTERS = {\n// ${SEASON} KBO 정규시즌 기록 기반 (tools/build_roster.js 로 생성 · 직접 수정은 data/overrides.json)\n`;
for (const [code, [key, name, color]] of Object.entries(TEAMS)) {
  block += `${q(key)}: {name:${q(name)}, color:${q(color)}, batters:[\n`;
  for (const b of teams[code].batters) block += ` B(${q(b.n)},${q(b.pos)},${b.age},${b.con},${b.pow},${b.eye},${b.spd},${b.fld},${b.arm}${salArg(b.sal)}),\n`;
  block += `], pitchers:[\n`;
  for (const p of teams[code].pitchers) block += ` P(${q(p.n)},${q(p.role)},${p.age},${p.stu},${p.ctl},${p.mov},${p.sta}${salArg(p.sal)}),\n`;
  block += `]},\n`;
}
block += `};\n`;
block += `var LEAGUE = ${JSON.stringify(LEAGUE)}; // ${SEASON} league rates the sim reproduces at all-70 ratings\n`;
const coreFile = path.join(ROOT, 'core.js');
let core = fs.readFileSync(coreFile, 'utf8');
const EOL = core.includes('\r\n') ? '\r\n' : '\n';
const re = /var ROSTERS = \{[\s\S]*?\r?\n\};\r?\n(?:var LEAGUE = .*\r?\n)?/;
if (!re.test(core)) { console.error('ROSTERS block not found in core.js'); process.exit(1); }
core = core.replace(re, () => block.replace(/\n/g, EOL));
fs.writeFileSync(coreFile, core);

const fmt = o => Object.entries(o).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join(' · ');
console.log(`league (hitters): ${fmt(LB)}`);
console.log(`league (pitchers): ${fmt(LP)}`);
console.log(`LEAGUE ${JSON.stringify(LEAGUE)}`);
console.log(`rated ${hitters.length} hitters, ${pitchers.length} pitchers; rostered ${rostered.size}`);
