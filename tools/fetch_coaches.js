// Pull each club's registered coaches and their playing records from the KBO official site into data/coaches2026.json.
// usage: node tools/fetch_coaches.js. Waits between requests.
const fs = require('fs'), path = require('path');
const ORIGIN = 'https://www.koreabaseball.com';
const TEAMS = {SS: '삼성', KT: 'KT', HT: 'KIA', LG: 'LG', OB: '두산', SK: 'SSG', LT: '롯데', NC: 'NC', HH: '한화', WO: '키움'};
const P = 'ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$';
let cookie = '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function req(url, body) {
  await sleep(250);
  const r = await fetch(url, {method: body ? 'POST' : 'GET', body, headers: {cookie, 'user-agent': 'Mozilla/5.0 (fan sim data refresh)', ...(body ? {'content-type': 'application/x-www-form-urlencoded'} : {})}});
  const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : []; if (sc.length) cookie = sc.map(c => c.split(';')[0]).join('; ');
  return await r.text();
}
const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
const text = s => decode(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
function hidden(html) { const f = new URLSearchParams(); for (const m of html.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) { const n = m[0].match(/name="([^"]*)"/), v = m[0].match(/value="([^"]*)"/); if (n) f.set(decode(n[1]), v ? decode(v[1]) : ''); } return f; }
function tables(html) { const out = []; for (const t of html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g)) { const head = [...((t[1].match(/<thead>([\s\S]*?)<\/thead>/) || ['', ''])[1]).matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(m => text(m[1]));
    const rows = [...((t[1].match(/<tbody>([\s\S]*?)<\/tbody>/) || ['', ''])[1]).matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(tr => ({cells: [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(m => text(m[1])), link: (tr[1].match(/href="([^"]*playerId=\d+[^"]*)"/) || [])[1]}));
    const foot = [...((t[1].match(/<tfoot>([\s\S]*?)<\/tfoot>/) || ['', ''])[1]).matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(m => text(m[1])); out.push({head, rows, foot}); } return out; }
async function register(team, onDate) {
  let html = await req(ORIGIN + '/Player/Register.aspx');
  const m = html.match(/function fnSearchChange[\s\S]*?__doPostBack\('([^']*)'/) || html.match(/__doPostBack\('([^']*btn[^']*)'/);
  const f = hidden(html); f.set(P + 'hfSearchTeam', team); if (onDate) f.set(P + 'hfSearchDate', onDate); f.set('__EVENTTARGET', m ? m[1].replace(/\$/g, '$') : P + 'btnCalendarSelect'); f.set('__EVENTARGUMENT', '');
  html = await req(ORIGIN + '/Player/Register.aspx', f.toString());
  const date = (html.match(/hfSearchDate"[^>]*value="(\d+)"/) || [])[1];
  const coaches = [];
  for (const t of tables(html)) if (t.head[1] === '코치' || t.head[1] === '감독') for (const r of t.rows) if (r.cells.length >= 5) coaches.push({no: r.cells[0], n: r.cells[1], hand: r.cells[2], birth: r.cells[3], mgr: t.head[1] === '감독'});
  return {date, coaches};
}
const num = v => { const x = parseFloat(String(v).replace(/,/g, '')); return isNaN(x) ? 0 : x; };
async function career(n, birth) {
  const first = await req(ORIGIN + '/Player/Search.aspx'), sf = hidden(first);
  sf.set(P + 'txtSearchPlayerName', n); sf.set(P + 'btnSearch', '검색'); sf.set('__EVENTTARGET', ''); sf.set('__EVENTARGUMENT', '');
  const html = await req(ORIGIN + '/Player/Search.aspx', sf.toString());
  const row = html.split('<tr').find(x => x.includes(birth) && /playerId=\d+/.test(x));
  if (!row) return null;
  const link = decode(row.match(/href=["']?([^"'\s>]*playerId=\d+[^"'\s>]*)/)[1]);
  const pos = (text(row).match(/투수|포수|내야수|외야수/) || [''])[0];
  const doc = await req(new URL(link, ORIGIN).href);
  const isP = /Pitcher/.test(link) || pos === '투수', totals = {};
  const tb = doc.match(/<table[^>]*class="tData01[^>]*>([\s\S]*?)<\/table>/);
  if (tb) { const trs = [...tb[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(m => [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(c => text(c[1])));
    const head = trs[0], sum = trs.find(r => r[0] === '통산'), years = trs.filter(r => /^\d{4}$/.test(r[0])).length;
    if (sum) head.slice(2).forEach((h, i) => { totals[h] = num(sum[i + 1]); }); totals.years = years; }
  return {pos, isP, totals, link};
}
(async () => {
  const out = {source: 'KBO 구단별 선수 등록 현황 및 기록실', fetched: new Date().toISOString(), teams: {}};
  for (const code of Object.keys(TEAMS)) {
    // the staff as registered when the 2026 season opened: the first date with anyone registered
    let date, coaches = [];
    for (const d of ['20260328', '20260329', '20260331', '20260401', '20260403']) { ({date, coaches} = await register(code, d)); if (coaches.length) break; }
    for (const c of coaches) { try { c.rec = await career(c.n, c.birth); } catch (e) { c.rec = null; c.err = String(e); } }
    out.teams[TEAMS[code]] = {date, coaches};
    console.log(TEAMS[code], date, coaches.length, 'coaches,', coaches.filter(c => c.rec && Object.keys(c.rec.totals).length).length, 'with records');
  }
  // on a club's page but not on the KBO first-team register: matched by name, position and birth year
  out.extra = {};
  for (const [n, year, pos] of [['김수경', '1979', '투수'], ['오윤', '1981', '외야수'], ['김태균', '1971', '내야수']]) {
    const first = await req(ORIGIN + '/Player/Search.aspx'), sf = hidden(first);
    sf.set(P + 'txtSearchPlayerName', n); sf.set(P + 'btnSearch', '검색');
    const html = await req(ORIGIN + '/Player/Search.aspx', sf.toString());
    const birth = (html.split('<tr').filter(x => x.includes(pos) && /playerId=\d+/.test(x)).map(x => (text(x).match(/\d{4}-\d{2}-\d{2}/) || [''])[0]).find(b => b.startsWith(year)));
    out.extra[n] = {n, birth, rec: birth ? await career(n, birth) : null}; console.log('extra', n, birth);
  }
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'coaches2026.json'), JSON.stringify(out, null, 1));
})();
