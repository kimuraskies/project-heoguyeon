// ---------- manager & club identity ----------
const MGR_BG={
  rookie:{label:'신인 감독', d:'코치 경험 없이 바로 지휘봉을 잡았다.', fx:'이사회 신뢰도 50에서 시작', conf:50, mor:0},
  coach: {label:'코치 출신', d:'오랜 코치 경력으로 구단의 신뢰를 받는다.', fx:'이사회 신뢰도 60에서 시작', conf:60, mor:3},
  legend:{label:'레전드 출신', d:'선수 시절의 명성 덕분에 선수단이 잘 따른다.', fx:'신뢰도 55 · 선수단 사기 +10', conf:55, mor:10},
  kbo:   {label:'KBO 전문가', d:'해설·분석가로 KBO 10개 구단을 오래 지켜봤다.', fx:'신뢰도 50 · 상대 팀 분석도 +20%p로 시작', conf:50, mor:0, know:0.2},
  mlb:   {label:'MLB 전문가', d:'메이저리그 구단 스카우트·코치로 일했다.', fx:'신뢰도 50 · 외국인 후보 6명 · 후보 능력 +3', conf:50, mor:0, fx6:true}
};
function mgrBg(){ return MGR_BG[state.user&&state.user.bg]||MGR_BG.coach; }
// manager portrait: the uploaded photo, or the initial on a club-colored disc
function mgrAvatar(size, user){
  const u=user||state.user||{}, z=size||40;
  if(u.photo) return `<img class="mgr-av" src="${u.photo}" alt="${esc(u.name||'감독')} 사진" style="width:${z}px;height:${z}px">`;
  const ch=esc(((u.name||'').trim()||'감')[0]);
  return `<span class="mgr-av" aria-hidden="true" style="width:${z}px;height:${z}px;font-size:${Math.round(z*0.45)}px">${ch}</span>`;
}
// shrink an uploaded image to a 160px square JPEG so the save stays small
function readPhoto(file, done){
  if(!file||!/^image\//.test(file.type)){ notify('이미지 파일을 골라 주세요.'); return; }
  const fr=new FileReader();
  fr.onload=()=>{ const img=new Image(); img.onload=()=>{
      const z=160, c=document.createElement('canvas'); c.width=c.height=z; const g=c.getContext('2d');
      const m=Math.min(img.width,img.height); g.drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,z,z);
      done(c.toDataURL('image/jpeg',0.82)); };
    img.onerror=()=>notify('이미지를 읽지 못했습니다.'); img.src=fr.result; };
  fr.readAsDataURL(file);
}
// readable accent per club (brand colors that are too dark on the dark UI are lifted)
const TEAM_ACCENT={KIA:'#ea0029',LG:'#c30452','한화':'#fc4e00',SSG:'#ce0e2d','삼성':'#1d6fe0',NC:'#3f6fd1',KT:'#e4002b','롯데':'#d00f31','두산':'#4a5fd6','키움':'#b0123f'};
// the club seeds the Material 3 palette through data-team (design/material.css); --accent follows its primary role
function applyTheme(t){ const st=document.documentElement.style; if(st&&st.removeProperty) st.removeProperty('--accent'); document.documentElement.dataset.team=t; }
// design-system helpers: inline SVG sprite icon and the original round club badge
function icon(id, cls){ return `<svg class="icon${cls?' '+cls:''}" aria-hidden="true"><use href="#i-${id}"/></svg>`; }
function badge(t, size){ return typeof teamBadge==='function'? teamBadge(t, K.ROSTERS[t]&&K.ROSTERS[t].color, size||48) : ''; }
// one-line scouting summary: the best hitter and top two starters
function teamPitch(t){
  const r=K.ROSTERS[t];
  const bat=r.batters.slice().sort((a,b)=>K.ovr(b)-K.ovr(a))[0];
  const sp=r.pitchers.filter(p=>p.role==='SP').sort((a,b)=>K.ovr(b)-K.ovr(a)).slice(0,2);
  return `${bat?bat.n+'을(를) 중심으로 한 타선과 ':''}${sp.map(p=>p.n).join('·')} 원투펀치로 가을야구에 도전!`;
}

// ---------- new career: manager profile + club selection ----------
let setup={name:'', bg:'coach', team:null, photo:null, more:false};
function showSetup(){
  ensurePlayers();
  document.getElementById('tabs').hidden=true;
  document.getElementById('teaminfo').innerHTML='<span class="muted">새 커리어</span>';
  { const ns=document.getElementById('nextStep'); if(ns) ns.innerHTML=''; }
  renderSetup();
  if(window.Track) Track.screen('setup');
}
function renderSetup(){
  const ranks={}; K.TEAM_IDS.slice().sort((a,b)=>teamStrength(b)-teamStrength(a)).forEach((t,i)=>ranks[t]=i+1);
  const card=t=>{
    const r=K.ROSTERS[t], sel=setup.team===t, ex=expectationFor(ranks[t]);
    const stars=r.batters.concat(r.pitchers).sort((a,b)=>K.ovr(b)-K.ovr(a)).slice(0,3);
    return `<button class="setup-team${sel?' sel':''}" style="--tc:${TEAM_ACCENT[t]}" onclick="FM.setupPick('${q(t)}')" aria-pressed="${sel}">
      <span class="row" style="gap:8px;flex-wrap:nowrap"><span class="teamdot" style="background:${r.color};box-shadow:0 0 0 2px ${TEAM_ACCENT[t]}"></span><b style="font-size:15px">${r.name}</b></span>
      <span class="muted" style="font-size:12px">전력 ${ranks[t]}위 · 연봉 ${payroll(t)}억</span>
      <span style="font-size:12px">핵심: ${stars.map(p=>`${p.n} <span class="muted">${K.ovr(p)}</span>`).join(', ')}</span>
      <span class="pill" style="background:var(--panel);color:var(--dim);align-self:flex-start">이사회 목표: ${ex.label}</span></button>`;
  };
  const bgOpt=k=>{ const b=MGR_BG[k], sel=setup.bg===k;
    return `<label class="setup-bg${sel?' sel':''}"><input type="radio" name="mgrbg" id="mgrbg-${k}" value="${k}" ${sel?'checked':''} onchange="FM.setupBg('${k}')">
      <span><b>${b.label}</b><br><span class="muted" style="font-size:12px">${b.d}</span><br><span style="font-size:12px;color:var(--accent2)">${b.fx}</span></span></label>`; };
  const t=setup.team, ready=!!t, me={name:setup.name, photo:setup.photo};
  document.getElementById('view').innerHTML=`
  <style>
    .setup-team{display:flex;flex-direction:column;gap:6px;text-align:left;background:var(--panel2);color:var(--txt);border:1px solid var(--line);border-top:4px solid var(--tc);border-radius:10px;padding:12px;cursor:pointer;font:inherit;min-width:0}
    .setup-team:hover,.setup-team:focus-visible{border-color:var(--tc);outline:none}
    .setup-team.sel{border-color:var(--tc);background:color-mix(in srgb, var(--tc) 14%, var(--panel2))}
    .setup-bg{display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid var(--line);border-radius:10px;cursor:pointer;background:var(--panel2)}
    .setup-bg.sel{border-color:var(--accent2)}
    .setup-bg input{margin-top:3px}
    .setup-prof{display:flex;flex-direction:column;gap:18px}
    .setup-prof-card>h3{text-align:center;justify-content:center}
    .setup-bgs{display:grid;gap:8px;grid-template-columns:repeat(4,minmax(0,1fr))}
    .setup-photo{display:flex;flex-direction:column;align-items:center;gap:8px}
    .setup-foot{position:sticky;bottom:0;z-index:5;margin-top:14px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding:12px 16px;padding-bottom:calc(12px + env(safe-area-inset-bottom,0px))}
    .setup-foot .sum{flex:1 1 240px;min-width:0;display:flex;gap:12px;align-items:center}
    @media (max-width:900px){ .setup-bgs{grid-template-columns:repeat(2,minmax(0,1fr))} }
    @media (max-width:480px){ .setup-bgs{grid-template-columns:minmax(0,1fr)} }
  </style>
  <div class="card" style="margin-top:12px">
    <h3 style="font-size:18px">⚾ 새 커리어 시작 <span class="tag">${state&&state.year||2026} 시즌</span></h3>
    <div class="hint">지휘할 구단만 고르면 바로 시작할 수 있어요. 구단마다 전력과 이사회 기대치가 다릅니다.</div>
  </div>
  <div class="card" style="margin-top:14px"><h3>구단 선택 <span class="tag">전력 순위는 시즌 전 평가</span></h3>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px">${K.TEAM_IDS.slice().sort((a,b)=>ranks[a]-ranks[b]).map(card).join('')}</div>
  </div>
  <details class="card setup-more" style="margin-top:14px" ${setup.more?'open':''} ontoggle="FM.setupMore(this.open)">
    <summary><b>감독 프로필</b> <span class="muted">이름 · 사진 · 경력 (선택, 나중에 안 정해도 돼요)</span></summary>
    <div class="setup-prof" style="margin-top:14px">
      <div class="setup-photo">${mgrAvatar(104,me)}
        <label class="btn" for="mgrphoto" style="font-size:12px;cursor:pointer">📷 사진 ${setup.photo?'바꾸기':'올리기'}</label>
        <input id="mgrphoto" type="file" accept="image/*" hidden onchange="FM.setupPhoto(this.files[0])">
        ${setup.photo?'<button class="btn" style="font-size:12px" onclick="FM.setupPhoto(null)">사진 지우기</button>':'<span class="muted" style="font-size:11px">선택 사항</span>'}
      </div>
      <div style="min-width:0">
        <label for="mgrname" class="muted" style="font-size:12px">감독 이름</label>
        <input id="mgrname" maxlength="12" placeholder="예: 김하늘" value="${esc(setup.name)}" oninput="FM.setupName(this.value)" style="width:100%;margin:4px 0 14px;font-size:15px;padding:8px 10px">
        <div class="muted" style="font-size:12px;margin-bottom:6px">경력</div>
        <div class="setup-bgs">${Object.keys(MGR_BG).map(bgOpt).join('')}</div>
      </div>
    </div>
  </details>
  <div class="card setup-foot">
    <div class="sum">${mgrAvatar(44,me)}<div style="min-width:0">
      <b id="setup-sum-name">${esc((setup.name||'').trim()||'무명')} 감독</b> <span class="muted">· ${MGR_BG[setup.bg].label}</span><br>
      ${ready? `<span class="muted" style="font-size:13px"><span class="teamdot" style="background:${K.ROSTERS[t].color}"></span> ${K.ROSTERS[t].name} · 전력 ${ranks[t]}위 · 목표 ${expectationFor(ranks[t]).label}</span>`
        : '<span class="muted" style="font-size:13px">위에서 구단을 선택하세요.</span>'}</div></div>
    <button class="btn primary" style="padding:12px 22px;font-size:15px" ${ready?'':'disabled'} onclick="FM.setupStart()">✍ 감독 취임하기</button>
  </div>`;
}
function setupMore(open){ setup.more=!!open; }
function setupPick(t){ setup.team=t; applyTheme(t); renderSetup(); if(window.Track) Track.action('pick_club'); }
function setupBg(k){ setup.bg=k; renderSetup(); }
function setupName(v){ setup.name=v; const el=document.getElementById('setup-sum-name'); if(el) el.textContent=((v||'').trim()||'무명')+' 감독'; } // no re-render, so typing keeps focus
function setupPhoto(file){ if(!file){ setup.photo=null; renderSetup(); return; } readPhoto(file, url=>{ setup.photo=url; renderSetup(); }); }
function setupStart(){
  if(!setup.team) return;
  const name=(setup.name||'').trim().slice(0,12) || '무명';
  document.getElementById('tabs').hidden=false;
  beginCareer({name, team:setup.team, bg:setup.bg, photo:setup.photo||null});
}
// called by the game once state exists for the new career
function onCareerStart(){
  ensure();
  { const f0=fm(); f0.firstYear=state.year; f0.guide={step:0, done:false}; }
  seedFAs();
  send('단장','🔥',`${state.year} 스토브리그가 시작됐습니다`, `개막까지 준비할 시간이 있습니다.\n\n• FA 시장과 외국인 선수 후보는 구단 탭에서\n• 트레이드는 트레이드 탭에서\n• 타순·로테이션은 라인업 탭, 팀 기본 전술은 팀 전술 탭에서\n• 전지훈련 방향을 정하면 스프링캠프 → 시범경기 ${SPRING_GAMES}경기 → 정규시즌 개막 순서로 진행됩니다.`, []);
  const bonus=(MGR_BG[state.user.bg]||MGR_BG.coach).mor;
  if(bonus) allPlayers(USER).forEach(p=>{ p.mor=clampN(K.mor(p)+bonus,5,99); });
}

// ---------- board & finances ----------
function teamStrength(t){
  const r=K.ROSTERS[t];
  const bats=r.batters.map(K.ovr).sort((a,b)=>b-a).slice(0,9);
  const sps=r.pitchers.filter(p=>p.role==='SP').map(K.ovr).sort((a,b)=>b-a).slice(0,5);
  const rps=r.pitchers.filter(p=>p.role!=='SP').map(K.ovr).sort((a,b)=>b-a).slice(0,4);
  const avg=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);
  return avg(bats)*0.5+avg(sps)*0.35+avg(rps)*0.15;
}
function strengthRank(t){ return K.TEAM_IDS.slice().sort((a,b)=>teamStrength(b)-teamStrength(a)).indexOf(t)+1; }
function expectationFor(rank){
  if(rank<=2) return {kind:'rank', target:2, label:'정규시즌 2위 이내'};
  if(rank<=4) return {kind:'rank', target:4, label:'정규시즌 4위 이내'};
  if(rank<=6) return {kind:'rank', target:5, label:'가을야구 진출 (5위 이내)'};
  return {kind:'pct', target:0.45, label:'승률 .450 이상'};
}
function boardStatus(){
  const b=fm().board, st=standings(), rank=st.findIndex(x=>x.t===USER)+1, me=st.find(x=>x.t===USER);
  if(b.expect.kind==='rank') return {met:rank<=b.expect.target, gap:Math.max(0,rank-b.expect.target), rank, pct:me.pct};
  return {met:me.pct>=b.expect.target, gap:me.pct>=b.expect.target?0:Math.ceil((b.expect.target-me.pct)*20), rank, pct:me.pct};
}
function confLabel(c){ return c>=80?'매우 만족':c>=60?'만족':c>=40?'보통':c>=20?'불만':'경질 위기'; }
function seasonStart(first){
  const f=fm(), sr=strengthRank(USER), ex=expectationFor(sr);
  const pay=payroll(USER), bg=MGR_BG[state.user.bg]||MGR_BG.coach;
  f.board={expect:ex, conf: first? bg.conf : clampN(Math.round((f.board?f.board.conf:60)*0.5+30),20,90), lastReview:0, strengthRank:sr};
  const balance = f.fin? f.fin.balance : 30;
  f.fin={balance, budget:Math.round(pay*1.06+4), rev:0, exp:0, attTotal:0, homeGames:0};
  f.rt={}; f.promises=[]; f.restNext=[]; f.lastMeeting=-99; f.lastWarn=-99; f.lastOffer=-99; f.lastTalk={};
  f.lastReport=0; f.lastMedia=-99; f.lastInterview=-99; f.lastFxNote=-99;
  send('구단 이사회','🏛',`${state.year} 시즌 목표: ${ex.label}`,
    `감독님, ${state.year} 시즌을 앞두고 이사회의 기대치를 전달드립니다.\n\n` +
    `• 전력 평가: 리그 ${sr}위권\n• 시즌 목표: ${ex.label}\n• 연봉 예산: ${f.fin.budget}억 원 (현재 연봉 총액 ${pay}억 원)\n\n` +
    `12경기마다 진행 상황을 평가합니다. 목표를 크게 밑돌면 감독 거취를 재검토할 수 있습니다.`, [{label:'확인', fn:'ok'}]);
  // sent after the target memo so it sits on top of the inbox
  if(first) send('구단주','🤝',`${state.user.name} 감독님, ${K.ROSTERS[USER].name}에 오신 것을 환영합니다`,
    `${state.user.name} 감독님의 취임을 진심으로 환영합니다.\n감독님의 경력(${bg.label})을 믿고 팀을 맡깁니다.\n\n` +
    `받은편지함으로 이사회, 코칭스태프, 선수, 다른 구단의 연락이 옵니다. 결정이 필요한 메시지에는 직접 답해 주세요.`, []);
  if(first) pressInaug();
}
function boardReview(){
  const f=fm(), s=boardStatus(), b=f.board;
  // narrow misses cost little; being far off the target is what endangers the job
  let d = s.met? 3 : -(1+s.gap);
  if(f.fin.balance<0) d-=2;
  b.conf=clampN(b.conf+d,0,100);
  send('구단 이사회','🏛',`이사회 정기 평가: ${s.met?'목표 달성 중':'목표 미달'} · 신뢰도 ${b.conf} (${confLabel(b.conf)})`,
    `현재 ${s.rank}위 · 승률 ${fmtAvg(s.pct)} (목표: ${b.expect.label})\n` +
    `재정: 잔고 ${f.fin.balance.toFixed(1)}억 원\n\n` +
    (s.met? '이사회는 현재 성적에 만족하고 있습니다.' : '이사회는 목표에 미치지 못하는 성적을 우려하고 있습니다.') +
    `\n\n이사회 신뢰도: ${b.conf} (${d>=0?'+':''}${d})`, []);
}
function financeGame(home){
  const f=fm().fin, me=standings().find(x=>x.t===USER);
  const teamMor=avgMorale(USER);
  let rev=0.25; // media/sponsorship per game
  if(home){
    const att=clampN(Math.round(10500 + me.pct*14000 + (teamMor-60)*90 + (fans()-50)*55 + Math.random()*1500),6000,20500);
    f.attTotal+=att; f.homeGames++; rev+=att*1.6/10000; // avg ticket 1.6만 원
  }
  const exp = payroll(USER)/144 + 1.0; // salaries + operations
  f.rev+=rev; f.exp+=exp; f.balance+=rev-exp;
}

