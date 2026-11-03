// Pull a season's regular-season records from the KBO official record room into data/kbo<season>.json.
// usage: node tools/fetch_kbo.js [season=2026]
// The record pages are ASP.NET WebForms: filters and paging are postbacks that carry the page's hidden fields.
const fs = require('fs');
const path = require('path');

const SEASON = process.argv[2] || '2026';
const ORIGIN = 'https://www.koreabaseball.com';
const TEAMS = ['KT', 'SS', 'HT', 'LG', 'OB', 'SK', 'LT', 'NC', 'HH', 'WO'];
const P = 'ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$';
const PAGES = {
  hit: '/Record/Player/HitterBasic/BasicOld.aspx',
  pit: '/Record/Player/PitcherBasic/BasicOld.aspx',
  def: '/Record/Player/Defense/Basic.aspx',
  run: '/Record/Player/Runner/Basic.aspx',
};

let cookie = '';
async function req(url, body) {
  const r = await fetch(url, {
    method: body ? 'POST' : 'GET',
    body,
    headers: { cookie, 'user-agent': 'Mozilla/5.0 (fan sim data refresh)', ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}) },
  });
  const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
  if (sc.length) cookie = sc.map(c => c.split(';')[0]).join('; ');
  return { html: await r.text(), url: r.url };
}

const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
const text = s => decode(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

function formFields(html) {
  const f = new URLSearchParams();
  for (const m of html.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const name = m[0].match(/name="([^"]*)"/), val = m[0].match(/value="([^"]*)"/);
    if (name) f.set(decode(name[1]), val ? decode(val[1]) : '');
  }
  for (const m of html.matchAll(/<select[^>]*name="([^"]*)"[^>]*>([\s\S]*?)<\/select>/g)) {
    const sel = m[2].match(/<option[^>]*selected[^>]*value="([^"]*)"/) || m[2].match(/<option[^>]*value="([^"]*)"[^>]*selected/) || m[2].match(/<option[^>]*value="([^"]*)"/);
    f.set(decode(m[1]), sel ? decode(sel[1]) : '');
  }
  return f;
}

function parseTable(html) {
  const t = html.match(/<table[^>]*class="tData[^"]*"[^>]*>([\s\S]*?)<\/table>/);
  if (!t) return { head: [], rows: [] };
  const head = [...(t[1].match(/<thead>([\s\S]*?)<\/thead>/) || ['', ''])[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(m => text(m[1]));
  const body = (t[1].match(/<tbody>([\s\S]*?)<\/tbody>/) || ['', ''])[1];
  const rows = [];
  for (const tr of body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => text(m[1]));
    const id = (tr[1].match(/playerId=(\d+)/) || [])[1] || null;
    if (cells.length > 2) rows.push({ id, cells });
  }
  return { head, rows };
}

async function teamTable(pagePath, team) {
  let { html, url } = await req(ORIGIN + pagePath);
  async function post(target, over) {
    const f = formFields(html);
    for (const k in over) f.set(k, over[k]);
    f.set('__EVENTTARGET', target); f.set('__EVENTARGUMENT', '');
    const action = decode((html.match(/<form[^>]*action="([^"]*)"/) || [])[1] || url);
    ({ html, url } = await req(new URL(action, url).href, f.toString()));
  }
  const base = { [P + 'ddlSeason$ddlSeason']: SEASON, [P + 'ddlSeries$ddlSeries']: '0' };
  await post(P + 'ddlSeason$ddlSeason', base);
  await post(P + 'ddlSeries$ddlSeries', base);
  await post(P + 'ddlTeam$ddlTeam', { ...base, [P + 'ddlTeam$ddlTeam']: team });
  let head = [], rows = [];
  for (let pg = 1; pg < 20; pg++) {
    if (pg > 1) {
      // page links look like href="javascript:__doPostBack(&#39;target&#39;,&#39;&#39;)"
      const a = [...decode(html).matchAll(/<a[^>]*href="javascript:__doPostBack\('([^']+)'[^"]*"[^>]*>\s*(\d+)\s*<\/a>/g)].find(m => m[2] === String(pg));
      if (!a) break;
      await post(a[1], {});
    }
    const t = parseTable(html);
    head = t.head; rows = rows.concat(t.rows);
  }
  return { head, rows };
}

// Profile box on a player's page: birth date, position group, throws/bats, salary
function parseInfo(html) {
  const t = text(html);
  const birth = t.match(/생년월일:\s*(\d{4})년\s*(\d{2})월\s*(\d{2})일/);
  const pos = t.match(/포지션:\s*([^\s(]+)\(([^)]*)\)/);
  const sal = t.match(/연봉:\s*([\d,]+)\s*(만원|달러)/);
  return {
    birth: birth ? `${birth[1]}-${birth[2]}-${birth[3]}` : null,
    posGroup: pos ? pos[1] : null,
    hand: pos ? pos[2] : null,
    salary: sal ? { amount: +sal[1].replace(/,/g, ''), unit: sal[2] } : null,
  };
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } }));
}

(async () => {
  const out = { season: +SEASON, source: 'KBO 공식 기록실 정규시즌 (koreabaseball.com)', fetched: new Date().toISOString(), tables: {}, info: {} };
  for (const [key, pagePath] of Object.entries(PAGES)) {
    out.tables[key] = {};
    for (const t of TEAMS) {
      const r = await teamTable(pagePath, t);
      out.tables[key][t] = r.rows;
      out.tables[key + 'Head'] = r.head;
      process.stdout.write(`${key} ${t} ${r.rows.length}\n`);
    }
  }
  const ids = new Map();
  for (const t of TEAMS) {
    out.tables.hit[t].forEach(r => r.id && ids.set(r.id, 'Hitter'));
    out.tables.pit[t].forEach(r => r.id && ids.set(r.id, 'Pitcher'));
  }
  // profiles rarely change within a season: keep the ones already downloaded
  const file = path.join(__dirname, '..', 'data', `kbo${SEASON}.json`);
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).info || {} : {};
  for (const [id, v] of Object.entries(prev)) if (ids.has(id) && !v.error) { out.info[id] = v; ids.delete(id); }
  const list = [...ids];
  await pool(list, 4, async ([id, kind], k) => {
    try { out.info[id] = parseInfo((await req(`${ORIGIN}/Record/Player/${kind}Detail/Basic.aspx?playerId=${id}`)).html); }
    catch (e) { out.info[id] = { error: String(e) }; }
    if (k % 100 === 0) process.stdout.write(`info ${k}/${list.length}\n`);
  });
  fs.writeFileSync(file, JSON.stringify(out));
  console.log(`saved ${file} (${Object.keys(out.info).length} players, ${list.length} newly fetched)`);
})();
