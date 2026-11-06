/* Stadium-style LED scoreboard for the live game page. Original design: club colors and
   system monospace numerals only, no logos or sponsors. Reads the live game, the box score
   and the season stats; draws nothing it does not know (rpm is an estimate and says so). */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const avg3 = (h, ab) => ab > 0 ? (h / ab).toFixed(3).replace(/^0/, '') : '.---';
  const OC = {'1B':'안타','2B':'2루타','3B':'3루타',HR:'홈런',BUNT1B:'번트안타',K:'삼진',BB:'볼넷',IBB:'고의4구',HBP:'사구',
    GIDP:'병살',SF:'희플',SAC:'희번',FC:'야선',E:'실책',OUT:'범타'};
  const HIT = {'1B':1,'2B':1,'3B':1,HR:1,BUNT1B:1};
  // estimated spin by pitch family, nudged by the pitcher's stuff (구위)
  function rpm(type, stu) {
    const t = String(type || '');
    const base = /커브/.test(t) ? 2550 : /슬라이더|스위퍼/.test(t) ? 2400 : /커터/.test(t) ? 2300 : /투심|싱커/.test(t) ? 2150
      : /체인지업|서클/.test(t) ? 1750 : /포크|스플리/.test(t) ? 1300 : 2250;
    return Math.round((base + ((stu || 70) - 70) * 9) / 5) * 5;
  }
  function ops(s) {
    if (!s || !s.PA) return '.---';
    const obpD = s.AB + s.BB + s.HBP + (s.SF || 0), obp = obpD ? (s.H + s.BB + s.HBP) / obpD : 0;
    const slg = s.AB ? (s.H + s._2B + 2 * s._3B + 3 * s.HR) / s.AB : 0;
    return (obp + slg).toFixed(3).replace(/^0/, '');
  }
  const ipStr = o => Math.floor(o / 3) + (o % 3 ? ' ' + (o % 3) + '/3' : '');
  // positions on the small diamond (viewBox 0 0 200 150)
  const SPOT = {CF:[100,18],LF:[34,40],RF:[166,40],SS:[66,70],'2B':[134,70],'3B':[30,104],'1B':[170,104],P:[100,92],C:[100,138]};

  function board(game, M, ctx) {
    const {offId, defId, batName, pitName, slot, shown, cnt, ptot, pstr, pball} = ctx;
    const S = state, view = M.boardView || 'bat';
    const club = t => K.ROSTERS[t];
    const feed = (M.feed || []).filter(e => e && e.oc);
    // 1) batting order of the team at bat
    const lu = game.lineup[offId], pos = game.pos[offId];
    const order = lu.map((n, i) => { const s = S.season[offId].bat[n];
      return `<tr class="${i === slot - 1 ? 'on' : ''}"><td>${i + 1}</td><td>${esc(pos[i] || '')}</td><td class="nm">${esc(n)}</td><td>${s ? avg3(s.H, s.AB) : '.---'}</td></tr>`; }).join('');
    const orderBlk = `<div class="sbd-blk sbd-order" data-v="order"><div class="sbd-h" style="--c:${club(offId).color}">${esc(club(offId).name)} 타순</div>
      <table><tbody>${order}<tr class="pit"><td>P</td><td></td><td class="nm">${esc(pitName)}</td><td>${ptot}구</td></tr></tbody></table></div>`;
    // 2) current batter card + today's plate appearances
    const bs = S.season[offId].bat[batName], today = feed.filter(e => e.batter === batName && e.off === offId).reverse();
    const stat = (l, v) => `<div><span>${l}</span><b>${v}</b></div>`;
    const batBlk = `<div class="sbd-blk sbd-bat" data-v="bat"><div class="sbd-h" style="--c:${club(offId).color}">타자</div>
      <div class="sbd-who"><span class="sbd-no">No.${typeof jno === 'function' ? jno(batName) : ''}</span><b>${esc(batName)}</b><small>${slot}번 · ${esc(pos[slot - 1] || '')}</small></div>
      <div class="sbd-stats">${stat('경기', bs ? bs.G : 0)}${stat('타율', bs ? avg3(bs.H, bs.AB) : '.---')}${stat('홈런', bs ? bs.HR : 0)}${stat('타점', bs ? bs.RBI : 0)}${stat('OPS', ops(bs))}${stat('도루', bs ? bs.SB : 0)}</div>
      <div class="sbd-today"><span>오늘</span>${today.length ? today.map(e => `<i class="${HIT[e.oc] ? 'hit' : e.oc === 'BB' || e.oc === 'HBP' || e.oc === 'IBB' ? 'walk' : ''}">${OC[e.oc] || e.oc}</i>`).join('') : '<em>첫 타석</em>'}</div></div>`;
    // 3) pitcher: last pitch, counts today, season line; BSO lamps
    const p = K.getP(defId, pitName) || {}, last = shown[shown.length - 1], box = game.box[defId].pit[pitName] || {}, ps = S.season[defId].pit[pitName];
    const era = ps && ps.OUT ? (ps.ER * 27 / ps.OUT).toFixed(2) : '-.--', whip = ps && ps.OUT ? ((ps.H + ps.BB) * 3 / ps.OUT).toFixed(2) : '-.--';
    const lamp = (n, max, cls) => Array.from({length: max}, (_, i) => `<i class="${i < n ? cls : ''}"></i>`).join('');
    const pitBlk = `<div class="sbd-blk sbd-pit" data-v="bat"><div class="sbd-h" style="--c:${club(defId).color}">투수 · ${esc(pitName)}</div>
      <div class="sbd-last">${last ? `<div><span>구종</span><b>${esc(last.type || '-')}</b></div><div><span>구속 km/h</span><b>${last.velo || '-'}</b></div><div><span>회전수 <em>(추정)</em></span><b>${last.velo ? rpm(last.type, p.stu) : '-'}</b></div>`
        : '<div class="sbd-wait">투구 대기</div>'}</div>
      <div class="sbd-tbsk"><div><span>T</span><b>${ptot}</b></div><div><span>B</span><b>${pball}</b></div><div><span>S</span><b>${pstr}</b></div><div><span>K</span><b>${box.SO || 0}</b></div></div>
      <div class="sbd-pline">오늘 ${ipStr(box.OUT || 0)}이닝 · 시즌 ERA ${era} · WHIP ${whip}</div>
      <div class="sbd-bso"><div><span>B</span>${lamp(cnt.b, 3, 'g')}</div><div><span>S</span>${lamp(cnt.s, 2, 'y')}</div><div><span>O</span>${lamp(game.outs, 2, 'r')}</div></div></div>`;
    // 4) defense alignment + next batters
    const dl = game.lineup[defId], dp = game.pos[defId], at = {P: pitName};
    dl.forEach((n, i) => { if (dp[i] && dp[i] !== 'DH') at[dp[i]] = n; });
    const names = Object.keys(SPOT).map(k => at[k] ? `<text x="${SPOT[k][0]}" y="${SPOT[k][1]}">${esc(at[k])}</text><text class="ps" x="${SPOT[k][0]}" y="${SPOT[k][1] - 11}">${k}</text>` : '').join('');
    const next = [1, 2, 3].map(k => lu[(slot - 1 + k) % lu.length]);
    const defBlk = `<div class="sbd-blk sbd-def" data-v="def"><div class="sbd-h" style="--c:${club(defId).color}">${esc(club(defId).name)} 수비</div>
      <svg viewBox="0 0 200 150" aria-label="수비 배치"><path d="M100 128L150 84L100 46L50 84Z" fill="none" stroke="currentColor" stroke-opacity=".35"/>
        <path d="M100 128L10 40M100 128L190 40" stroke="currentColor" stroke-opacity=".2"/>${names}</svg>
      <div class="sbd-next"><span>다음 타순</span>${next.map((n, i) => `<b>${(slot + i) % lu.length + 1}. ${esc(n)}</b>`).join('')}</div></div>`;
    // 5) linescore with R H E B
    const h = game.h, a = game.a, n = Math.max(9, game.line[a].length, game.line[h].length);
    const errs = t => feed.filter(e => e.oc === 'E' && e.def === t).length;
    const walks = t => Object.values(game.box[t].bat).reduce((s, b) => s + (b.BB || 0) + (b.HBP || 0), 0);
    const cells = t => Array.from({length: n}, (_, i) => { const v = game.line[t][i]; return `<td>${v == null ? (t === h && i === n - 1 && game.over && game.score[h] > game.score[a] ? 'X' : '') : v}</td>`; }).join('');
    const row = t => `<tr><th style="--c:${club(t).color}">${esc(t)}</th>${cells(t)}<td class="r">${game.score[t]}</td><td>${game.hits[t]}</td><td>${errs(t)}</td><td>${walks(t)}</td></tr>`;
    const scoreBlk = `<div class="sbd-blk sbd-line" data-v="score"><table><thead><tr><th></th>${Array.from({length: n}, (_, i) => `<th class="${i + 1 === game.inning ? 'cur' : ''}">${i + 1}</th>`).join('')}<th>R</th><th>H</th><th>E</th><th>B</th></tr></thead>
      <tbody>${row(a)}${row(h)}</tbody></table></div>`;
    const tab = (v, l) => `<button class="${view === v ? 'on' : ''}" onclick="Match.boardView='${v}';Match.renderLive()">${l}</button>`;
    return `<section class="sbd" data-view="${view}" aria-label="전광판">
      <div class="sbd-top"><b>${esc(a)} ${game.score[a]}</b><span>:</span><b>${game.score[h]} ${esc(h)}</b><em>${game.inning}회${game.half === 'top' ? '초' : '말'}</em>
        <div class="sbd-tabs">${tab('order', '타순')}${tab('bat', '타자·투수')}${tab('def', '수비')}${tab('score', '스코어')}</div></div>
      <div class="sbd-grid">${orderBlk}${batBlk}${pitBlk}${defBlk}${scoreBlk}</div></section>`;
  }
  window.Scoreboard = {board, rpm};
})();
