// Usage: node tools/fetch_career.js [lastYear=2025]
// Year-by-year KBO career records (through lastYear) for every rostered player, from each player's
// "통산기록" page on koreabaseball.com. Writes data/career.json and the game's career.js.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const ORIGIN = 'https://www.koreabaseball.com';
const LAST = parseInt(process.argv[2] || '2025', 10);

const csv = fs.readFileSync(path.join(ROOT, 'data', 'players2026.csv'), 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/);
const head = csv.shift().split(',');
const col = k => head.indexOf(k);
const players = csv.map(l => l.split(',')).filter(r => r[col('rostered')] === '1')
  .map(r => ({ id: r[col('id')], n: r[col('name')], type: r[col('type')] }));

const strip = h => h.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
function parse(html) {
  const t = html.match(/<table[\s\S]*?<\/table>/); if (!t) return [];
  const thead = (t[0].match(/<thead[\s\S]*?<\/thead>/) || t)[0]; // the totals row also uses <th>
  const heads = [...thead.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(m => strip(m[1]));
  const rows = [...t[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(m => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(x => strip(x[1])))
    .filter(r => r.length === heads.length && /^\d{4}$/.test(r[0]));
  return rows.map(r => Object.fromEntries(heads.map((h, i) => [h, r[i]])));
}
// "5 2/3" innings -> outs
const outs = ip => { const m = String(ip).match(/^(\d+)(?:\s+(\d)\/3)?$/); return m ? +m[1] * 3 + (+m[2] || 0) : 0; };
const num = v => (v === '' || v === '-' ? 0 : +v);

// the page opens on the player's latest series (often the Korean Series); post back for the regular season
const field = (h, n) => { const m = h.match(new RegExp('id="' + n + '" value="([^"]*)"')); return m ? m[1] : ''; };
async function get(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (kbo-manager data tool)' } });
      if (!r.ok) throw new Error(r.status);
      const html = await r.text();
      const sel = html.match(/<select name="([^"]*ddlSeries)"[\s\S]*?<\/select>/);
      if (!sel || /<option selected="selected" value="0"/.test(sel[0])) return html;
      const cookie = (r.headers.getSetCookie ? r.headers.getSetCookie() : []).map(c => c.split(';')[0]).join('; ');
      const body = new URLSearchParams({ __EVENTTARGET: sel[1], __EVENTARGUMENT: '', __VIEWSTATE: field(html, '__VIEWSTATE'),
        __VIEWSTATEGENERATOR: field(html, '__VIEWSTATEGENERATOR'), __EVENTVALIDATION: field(html, '__EVENTVALIDATION'), [sel[1]]: '0' });
      const r2 = await fetch(url, { method: 'POST', body, headers: { 'User-Agent': 'Mozilla/5.0 (kbo-manager data tool)', 'content-type': 'application/x-www-form-urlencoded', cookie } });
      if (r2.ok) return await r2.text();
    } catch (e) {}
    await new Promise(r => setTimeout(r, 800 * (i + 1)));
  }
  return '';
}

(async () => {
  const out = {}; let done = 0;
  const queue = players.slice();
  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      const kind = p.type === 'B' ? 'Hitter' : 'Pitcher';
      const rows = parse(await get(`${ORIGIN}/Record/Player/${kind}Detail/Total.aspx?playerId=${p.id}`)).filter(r => +r['연도'] <= LAST);
      // compact per-year arrays, same fields the game keeps
      out[p.n] = p.type === 'B'
        ? { t: 'B', y: rows.map(r => [+r['연도'], r['팀명'], num(r.G), num(r.PA), num(r.AB), num(r.R), num(r.H), num(r['2B']), num(r['3B']), num(r.HR), num(r.RBI), num(r.SB), num(r.CS), num(r.BB), num(r.HBP), num(r.SO)]) }
        : { t: 'P', y: rows.map(r => [+r['연도'], r['팀명'], num(r.G), num(r.W), num(r.L), num(r.SV), num(r.HLD), outs(r.IP), num(r.H), num(r.HR), num(r.BB), num(r.HBP), num(r.SO), num(r.R), num(r.ER), num(r.TBF)]) };
      if (++done % 25 === 0) console.log(`${done}/${players.length}`);
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  fs.writeFileSync(path.join(ROOT, 'data', 'career.json'), JSON.stringify(out));
  const js = `/* KBO 통산 기록 (${LAST}년까지, koreabaseball.com) — tools/fetch_career.js 로 생성\n` +
    `   타자 y: [연도,팀,G,PA,AB,R,H,2B,3B,HR,RBI,SB,CS,BB,HBP,SO]\n   투수 y: [연도,팀,G,W,L,SV,HLD,OUT,H,HR,BB,HBP,SO,R,ER,TBF] */\n` +
    `window.KBO_CAREER=${JSON.stringify(out)};\n`;
  fs.writeFileSync(path.join(ROOT, 'career.js'), js);
  const withRows = Object.values(out).filter(x => x.y.length).length;
  console.log(`saved ${Object.keys(out).length} players (${withRows} with KBO history through ${LAST})`);
})();
