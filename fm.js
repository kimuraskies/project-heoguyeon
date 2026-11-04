/* ===== KBO MANAGER - FM LAYER =====
   Football Manager-style systems on top of the engine: inbox, morale & player talks,
   condition/rest management, FM-style player profile, board expectations, finances, contracts.
   Loaded before the game script; every function reads the game's globals (state, USER, K, ...)
   at call time, so it only runs once the game has booted. All persistent data lives in
   state.fm and on the roster player objects, so the existing save/autosave covers it. */
(function(){
"use strict";

// ---------- small helpers ----------
const clampN=(x,a,b)=>x<a?a:(x>b?b:x);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const q=s=>String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
function hash(s){ let h=7; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return h; }
function allPlayers(t){ return K.ROSTERS[t].batters.concat(K.ROSTERS[t].pitchers); }
function userGamesPlayed(){ return state.schedule.filter(g=>g.played&&(g.home===USER||g.away===USER)).length; }
function median(a){ const s=a.slice().sort((x,y)=>x-y); return s.length? s[Math.floor(s.length/2)] : 0; }

// In-page replacements for alert()/confirm(), which embedded viewers block.
function notify(msg, ms){
  let box=document.getElementById('toasts');
  if(!box){ box=document.createElement('div'); box.id='toasts';
    box.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:80;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;'+
      'padding:0 max(16px, env(safe-area-inset-right, 0px)) calc(16px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px))';
    document.body.appendChild(box); }
  const t=document.createElement('div');
  t.setAttribute('role','status');
  t.style.cssText='pointer-events:auto;cursor:pointer;max-width:520px;width:100%;background:var(--panel2);color:var(--txt);border:1px solid var(--line);border-left:4px solid var(--accent2);border-radius:10px;padding:10px 14px;white-space:pre-wrap;line-height:1.5;box-shadow:0 6px 24px rgba(0,0,0,.45)';
  t.textContent=msg; t.onclick=()=>t.remove();
  box.appendChild(t);
  setTimeout(()=>t.remove(), ms || Math.min(9000, 2800+String(msg).length*40));
}
let pendingAsk=null;
function ask(msg, yesLabel, onYes){
  pendingAsk=onYes;
  modal(`<h2 style="font-size:18px">확인</h2><div style="white-space:pre-wrap;line-height:1.6;margin:8px 0 16px">${esc(msg)}</div>
    <div class="row" style="gap:8px;justify-content:flex-end"><button class="btn" onclick="App.closeModal()">취소</button>
    <button class="btn primary" onclick="FM.answer()">${esc(yesLabel)}</button></div>`);
}
function answer(){ const f=pendingAsk; pendingAsk=null; closeModal(); if(f) f(); }

// 40..99 rating -> FM 1..20 attribute
function attr20(v){ return clampN(Math.round((v-35)/3.2),1,20); }
function attrColor(a){ return a>=16?'#36c275':a>=11?'#d6e2c4':a>=6?'#e0b44c':'#e0556a'; }

// ---------- personality (fixed per player, drives how strongly morale moves) ----------
const PERS=[
  {k:'프로페셔널', m:0.6, d:'기복 없이 꾸준하다. 칭찬에도 질책에도 크게 흔들리지 않는다.'},
  {k:'승부욕',     m:1.2, d:'지는 것을 못 견딘다. 질책을 자극으로 받아들인다.'},
  {k:'리더형',     m:0.8, d:'더그아웃 분위기를 잡는다. 팀 미팅의 메시지를 잘 전파한다.'},
  {k:'예민함',     m:1.5, d:'감정 기복이 크다. 격려가 잘 통하지만 질책에 쉽게 상처받는다.'},
  {k:'낙천적',     m:0.9, d:'금방 털고 일어난다. 부진해도 사기가 잘 떨어지지 않는다.'},
  {k:'평범',       m:1.0, d:'무난한 성격.'}
];
function pers(p){ return PERS[p.pers==null?0:p.pers]; }

// ---------- salary / value ----------
// rough KBO-scale salary in 억원 from OVR and age
function salaryFor(p){
  const o=K.ovr(p), base=Math.pow(Math.max(0,o-58),1.9)/30;
  const ageF = p.age<=23?0.45 : p.age<=26?0.75 : p.age<=33?1 : p.age<=36?0.85 : 0.65;
  return Math.max(0.3, Math.round(base*ageF*10)/10);
}
function marketValue(p){ // 억원, what a club would pay in a trade-ish sense
  const o=K.ovr(p), ageAdj = p.age<=25?1.6 : p.age<=28?1.3 : p.age<=31?1 : p.age<=34?0.6 : 0.3;
  return Math.max(0.5, Math.round(Math.pow(Math.max(0,o-55),2)/12*ageAdj));
}
function payroll(t){ return Math.round(allPlayers(t).reduce((a,p)=>a+(p.sal||0),0)*10)/10; }

// ---------- names for rookies / call-ups ----------
const SUR=['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','류','홍','전','고','문','양','손'];
const SYL=['민','준','서','현','우','진','호','성','재','영','지','훈','동','태','승','하','도','윤','건','혁','수','찬','규','원','석','빈','율','온','결','형'];
function allNames(){ const s=new Set(); K.TEAM_IDS.forEach(t=>allPlayers(t).forEach(p=>s.add(p.n))); return s; }
function newName(){
  const used=allNames();
  for(let i=0;i<500;i++){
    const n=SUR[Math.floor(Math.random()*SUR.length)]+SYL[Math.floor(Math.random()*SYL.length)]+SYL[Math.floor(Math.random()*SYL.length)];
    if(!used.has(n)) return n;
  }
  return '신인'+Date.now()%10000;
}
const R=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const BAT_POS=['C','1B','2B','3B','SS','LF','CF','RF'];
function makeRookie(type, pos){
  const age=R(19,21), base={age, mor:70, cond:100, inj:0, yrs:3, sal:0.3, rookie:true};
  let p;
  if(type==='B'){
    pos=pos||BAT_POS[R(0,BAT_POS.length-1)];
    p=Object.assign({n:newName(),pos,con:R(52,66),pow:R(48,68),eye:R(50,64),spd:R(50,82),fld:R(52,76),arm:R(55,76),type:'B'},base);
  } else {
    const role=pos||(Math.random()<0.4?'SP':'RP');
    p=Object.assign({n:newName(),role,stu:R(60,76),ctl:R(52,68),mov:R(56,70),sta:role==='SP'?R(66,76):R(40,48),type:'P'},base);
  }
  p.pers=hash(p.n)%PERS.length;
  return p;
}

// ---------- state ----------
function fm(){ return state.fm; }
function ensurePlayer(p){
  if(p.pers==null) p.pers=hash(p.n)%PERS.length;
  if(p.cond==null) p.cond=100;
  if(p.mor==null) p.mor=62;
  if(p.inj==null) p.inj=0;
  if(p.sal==null) p.sal=salaryFor(p);
  // remaining years: veterans on short deals; others spread 1..4 (1 year ~15%) so few expire at once
  if(p.yrs==null){ const h=hash(p.n+'y')%20; p.yrs = p.age>=35? 1+hash(p.n)%2 : h<3?1 : h<9?2 : h<15?3 : 4; }
  if(p.bench==null) p.bench=0;
}
function ensurePlayers(){ K.TEAM_IDS.forEach(t=>allPlayers(t).forEach(ensurePlayer)); }
function ensure(){
  if(!state) return;
  ensurePlayers();
  if(!state.user) state.user={name:'무명', team:USER, bg:'coach'}; // saves from before the setup screen
  if(!state.fm){
    state.fm={ inbox:[], nextId:1, autoRest:true, restNext:[], promises:[], lastMeeting:-99,
      lastWarn:-99, lastOffer:-99, lastTalk:{}, rt:{}, board:null, fin:null, fired:false, lastChance:false };
    seasonStart(true);
  }
}

// ---------- inbox ----------
// msg: {id, ug, year, from, icon, subject, body, read, actions:[{label, fn, arg}], done, result}
function send(from, icon, subject, body, actions){
  const f=fm();
  const m={id:f.nextId++, ug:userGamesPlayed(), year:state.year, from, icon, subject, body, read:false, actions:actions||[], done:false};
  f.inbox.unshift(m);
  if(f.inbox.length>200) f.inbox.length=200;
  return m;
}
function unread(){ return fm()? fm().inbox.filter(m=>!m.read).length : 0; }
function pending(){ return fm()? fm().inbox.filter(m=>!m.done && m.actions.length).length : 0; }

// Action handlers referenced by name from messages (functions aren't saved, names are).
const ACTIONS={
  promisePlay(m,a){ const p=findPlayer(USER,a.n); if(!p) return '이미 팀을 떠난 선수입니다.';
    p.mor=clampN(p.mor+18,5,99); fm().promises.push({n:a.n, from:userGamesPlayed(), until:userGamesPlayed()+7, need:4});
    return `${a.n}에게 앞으로 7경기 중 4경기 이상 출전을 약속했습니다. 약속을 지키지 못하면 크게 실망할 겁니다.`; },
  compete(m,a){ const p=findPlayer(USER,a.n); if(!p) return '이미 팀을 떠난 선수입니다.';
    const k=pers(p).k; const d = (k==='프로페셔널'||k==='승부욕')? 6 : -8; p.mor=clampN(p.mor+d,5,99);
    return d>0? `${a.n}: "알겠습니다. 실력으로 증명하겠습니다." (사기 상승)` : `${a.n}은(는) 실망한 채 돌아갔습니다. (사기 하락)`; },
  listMe(m,a){ const p=findPlayer(USER,a.n); if(!p) return '이미 팀을 떠난 선수입니다.';
    p.listed=true; p.mor=clampN(p.mor+8,5,99); return `${a.n}을(를) 트레이드 리스트에 올렸습니다. 다른 구단의 제안이 들어올 수 있습니다.`; },
  encourage(m,a){ const p=findPlayer(USER,a.n); if(!p) return '이미 팀을 떠난 선수입니다.';
    const d=pers(p).k==='예민함'?15:10; p.mor=clampN(p.mor+d,5,99); return `${a.n}이(가) 고마워합니다. (사기 +${d})`; },
  scold(m,a){ const p=findPlayer(USER,a.n); if(!p) return '이미 팀을 떠난 선수입니다.';
    const d=pers(p).k==='승부욕'?8:-10; p.mor=clampN(p.mor+d,5,99);
    return d>0? `${a.n}이(가) 이를 악물었습니다. (사기 +8)` : `${a.n}이(가) 상처받았습니다. (사기 ${d})`; },
  restNext(m,a){ a.names.forEach(n=>{ if(fm().restNext.indexOf(n)<0) fm().restNext.push(n); });
    return `다음 경기에서 ${a.names.join(', ')} 선수에게 휴식을 줍니다.`; },
  keepGoing(){ return '현재 라인업을 유지합니다.'; },
  acceptTrade(m,a){
    const theirs=findPlayer(a.team,a.give), mine=findPlayer(USER,a.want);
    if(!theirs||!mine) return '선수 구성이 바뀌어 제안이 무효가 되었습니다.';
    const b=tradeBudget([a.want],a.team,[a.give]); if(!b.ok) return '❌ '+b.msg;
    doTrade(a.team,[a.want],[a.give]);
    return `트레이드 성사! ${a.want} ↔ ${a.give} (${K.ROSTERS[a.team].name}). 라인업이 자동 재구성되었습니다.`; },
  declineTrade(){ return '제안을 거절했습니다.'; },
  renew(m,a){ const p=findPlayer(USER,a.n); if(!p) return '이미 팀을 떠난 선수입니다.';
    const newPay=payroll(USER)-(p.sal||0)+a.sal;
    if(newPay>fm().fin.budget*1.15) return `❌ 예산 초과입니다. 재계약 시 연봉 총액 ${newPay.toFixed(1)}억 > 한도 ${(fm().fin.budget*1.15).toFixed(1)}억`;
    p.sal=a.sal; p.yrs=a.years; p.expiring=false; p.mor=clampN(p.mor+6,5,99);
    return `${a.n}와(과) ${a.years}년 연봉 ${a.sal}억 원에 재계약했습니다.`; },
  release(m,a){ const p=findPlayer(USER,a.n); if(!p) return '이미 팀을 떠난 선수입니다.';
    p.leaving=true; return `${a.n}은(는) 시즌 종료 후 팀을 떠납니다.`; },
  swapLineup(m,a){ const c=state.cfgs[USER], i=c.lineup.indexOf(a.out), inP=findPlayer(USER,a.in);
    if(i<0||!inP||c.lineup.indexOf(a.in)>=0) return '라인업이 이미 바뀌어 적용할 수 없습니다.';
    c.lineup[i]=a.in; return `${a.in}이(가) ${a.out} 대신 ${(c.positions||[])[i]||''} 자리에 들어갑니다.`; },
  swapRotation(m,a){ const c=state.cfgs[USER], i=c.rotation.indexOf(a.out);
    if(i<0||!findPlayer(USER,a.in)) return '로테이션이 이미 바뀌어 적용할 수 없습니다.';
    c.rotation[i]=a.in; c.bullpen=c.bullpen.filter(n=>n!==a.in); if(c.bullpen.indexOf(a.out)<0) c.bullpen.push(a.out);
    return `${a.in}이(가) 선발 로테이션에 들어가고 ${a.out}은(는) 불펜으로 갑니다.`; },
  media(m,a){ const f=fm();
    if(a.kind==='players'){ allPlayers(USER).forEach(p=>addMor(p,3)); return '선수들이 감독의 신뢰에 고무되었습니다. (선수단 사기 상승)'; }
    if(a.kind==='me'){ f.board.conf=clampN(f.board.conf+2,0,100); allPlayers(USER).forEach(p=>addMor(p,1)); return '책임지는 모습에 이사회와 선수단 모두 좋게 봤습니다. (이사회 신뢰도 +2)'; }
    allPlayers(USER).forEach(p=>{ const k=pers(p).k; addMor(p, (k==='승부욕'||k==='리더형')?3:-3); });
    f.board.conf=clampN(f.board.conf+1,0,100); return '승부욕 강한 선수들은 자극을 받았지만, 일부는 서운해합니다.'; },
  openClub(){ setTimeout(()=>App.tab('club'),0); return '구단 탭에서 외국인 선수 후보를 확인합니다.'; },
  ok(){ return '확인했습니다.'; }
};
function act(id, i){
  const m=fm().inbox.find(x=>x.id===id); if(!m||m.done) return;
  const a=m.actions[i]; const res=ACTIONS[a.fn](m,a.arg||{});
  if(String(res).startsWith('❌')){ notify(res.replace(/^❌ /,'')); return; } // stays open
  m.done=true; m.result=res; m.read=true; render();
}

// ---------- manager & club identity ----------
const MGR_BG={
  rookie:{label:'신인 감독', d:'코치 경험 없이 바로 지휘봉을 잡았다.', fx:'이사회 신뢰도 50에서 시작', conf:50, mor:0},
  coach: {label:'코치 출신', d:'오랜 코치 경력으로 구단의 신뢰를 받는다.', fx:'이사회 신뢰도 60에서 시작', conf:60, mor:3},
  legend:{label:'레전드 출신', d:'선수 시절의 명성 덕분에 선수단이 잘 따른다.', fx:'신뢰도 55 · 선수단 사기 +10', conf:55, mor:10}
};
// readable accent per club (brand colors that are too dark on the dark UI are lifted)
const TEAM_ACCENT={KIA:'#ea0029',LG:'#c30452','한화':'#fc4e00',SSG:'#ce0e2d','삼성':'#1d6fe0',NC:'#3f6fd1',KT:'#e4002b','롯데':'#d00f31','두산':'#4a5fd6','키움':'#b0123f'};
function applyTheme(t){ document.documentElement.style.setProperty('--accent', TEAM_ACCENT[t]||'#ea0029'); }
// one-line scouting summary: the best hitter and top two starters
function teamPitch(t){
  const r=K.ROSTERS[t];
  const bat=r.batters.slice().sort((a,b)=>K.ovr(b)-K.ovr(a))[0];
  const sp=r.pitchers.filter(p=>p.role==='SP').sort((a,b)=>K.ovr(b)-K.ovr(a)).slice(0,2);
  return `${bat?bat.n+'을(를) 중심으로 한 타선과 ':''}${sp.map(p=>p.n).join('·')} 원투펀치로 가을야구에 도전!`;
}

// ---------- new career: manager profile + club selection ----------
let setup={name:'', bg:'coach', team:null};
function showSetup(){
  ensurePlayers();
  document.getElementById('tabs').hidden=true;
  document.getElementById('teaminfo').innerHTML='<span class="muted">새 커리어</span>';
  renderSetup();
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
  const t=setup.team, ready=!!t;
  document.getElementById('view').innerHTML=`
  <style>
    .setup-team{display:flex;flex-direction:column;gap:6px;text-align:left;background:var(--panel2);color:var(--txt);border:1px solid var(--line);border-top:4px solid var(--tc);border-radius:10px;padding:12px;cursor:pointer;font:inherit;min-width:0}
    .setup-team:hover,.setup-team:focus-visible{border-color:var(--tc);outline:none}
    .setup-team.sel{border-color:var(--tc);background:color-mix(in srgb, var(--tc) 14%, var(--panel2))}
    .setup-bg{display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid var(--line);border-radius:10px;cursor:pointer;background:var(--panel2)}
    .setup-bg.sel{border-color:var(--accent2)}
    .setup-bg input{margin-top:3px}
  </style>
  <div class="card" style="margin-top:12px">
    <h3 style="font-size:18px">⚾ 새 커리어 시작 <span class="tag">${state&&state.year||2026} 시즌</span></h3>
    <div class="hint">감독 프로필을 정하고 지휘할 구단을 고르세요. 구단마다 전력과 이사회 기대치가 다릅니다.</div>
  </div>
  <div class="grid cols2" style="margin-top:14px;align-items:start">
    <div class="card"><h3>👔 감독 프로필</h3>
      <label for="mgrname" class="muted" style="font-size:12px">감독 이름</label>
      <input id="mgrname" maxlength="12" placeholder="예: 김하늘" value="${esc(setup.name)}" oninput="FM.setupName(this.value)" style="width:100%;margin:4px 0 14px;font-size:15px;padding:8px 10px">
      <div class="muted" style="font-size:12px;margin-bottom:6px">경력</div>
      <div class="grid" style="gap:8px">${Object.keys(MGR_BG).map(bgOpt).join('')}</div>
    </div>
    <div class="card"><h3>🏟 선택한 구단</h3>
      ${ready? `<div class="row" style="gap:10px"><span class="teamdot" style="width:22px;height:22px;background:${K.ROSTERS[t].color};box-shadow:0 0 0 2px ${TEAM_ACCENT[t]}"></span><b style="font-size:18px">${K.ROSTERS[t].name}</b></div>
        <div class="muted" style="margin-top:8px">전력 평가 ${ranks[t]}위 · 이사회 목표: <b style="color:var(--txt)">${expectationFor(ranks[t]).label}</b></div>
        <div class="hint" style="margin-top:6px">${teamPitch(t)}</div>`
      : '<div class="muted">아래에서 구단을 선택하세요.</div>'}
      <button class="btn primary" style="margin-top:14px;width:100%;padding:12px;font-size:15px${ready?`;background:${TEAM_ACCENT[t]};border-color:${TEAM_ACCENT[t]}`:''}" ${ready?'':'disabled'} onclick="FM.setupStart()">✍ 감독 취임하기</button>
    </div>
  </div>
  <div class="card" style="margin-top:14px"><h3>구단 선택 <span class="tag">전력 순위는 시즌 전 평가</span></h3>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px">${K.TEAM_IDS.slice().sort((a,b)=>ranks[a]-ranks[b]).map(card).join('')}</div>
  </div>`;
}
function setupPick(t){ setup.team=t; applyTheme(t); renderSetup(); }
function setupBg(k){ setup.bg=k; renderSetup(); }
function setupName(v){ setup.name=v; } // no re-render, so typing keeps focus
function setupStart(){
  if(!setup.team) return;
  const name=(setup.name||'').trim().slice(0,12) || '무명';
  document.getElementById('tabs').hidden=false;
  beginCareer({name, team:setup.team, bg:setup.bg});
}
// called by the game once state exists for the new career
function onCareerStart(){
  ensure();
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
  send('구단 이사회','🏛',`${state.year} 시즌 목표: ${ex.label}`,
    `감독님, ${state.year} 시즌을 앞두고 이사회의 기대치를 전달드립니다.\n\n` +
    `• 전력 평가: 리그 ${sr}위권\n• 시즌 목표: ${ex.label}\n• 연봉 예산: ${f.fin.budget}억 원 (현재 연봉 총액 ${pay}억 원)\n\n` +
    `12경기마다 진행 상황을 평가합니다. 목표를 크게 밑돌면 감독 거취를 재검토할 수 있습니다.`, [{label:'확인', fn:'ok'}]);
  // sent after the target memo so it sits on top of the inbox
  if(first) send('구단주','🤝',`${state.user.name} 감독님, ${K.ROSTERS[USER].name}에 오신 것을 환영합니다`,
    `${state.user.name} 감독님의 취임을 진심으로 환영합니다.\n감독님의 경력(${bg.label})을 믿고 팀을 맡깁니다.\n\n` +
    `받은편지함으로 이사회, 코칭스태프, 선수, 다른 구단의 연락이 옵니다. 결정이 필요한 메시지에는 직접 답해 주세요.`, []);
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
    const att=clampN(Math.round(10500 + me.pct*14000 + (teamMor-60)*90 + Math.random()*1500),6000,20500);
    f.attTotal+=att; f.homeGames++; rev+=att*1.6/10000; // avg ticket 1.6만 원
  }
  const exp = payroll(USER)/144 + 1.0; // salaries + operations
  f.rev+=rev; f.exp+=exp; f.balance+=rev-exp;
}

// ---------- morale ----------
function avgMorale(t){ const a=allPlayers(t); return a.reduce((x,p)=>x+K.mor(p),0)/a.length; }
function moraleLabel(m){ return m>=85?'최고':m>=70?'좋음':m>=50?'보통':m>=30?'나쁨':'최악'; }
function moraleFace(m){ return m>=85?'😄':m>=70?'🙂':m>=50?'😐':m>=30?'🙁':'😠'; }
function addMor(p,d){ p.mor=clampN(K.mor(p)+d*pers(p).m,5,99); }
function moraleAfterGame(t,res){
  const won=res.winner===t, lost=res.winner&&res.winner!==t, bx=res.box[t];
  const sp = t===res.home? res.homeSP : res.awaySP;
  const med=median(K.ROSTERS[t].batters.map(K.ovr));
  allPlayers(t).forEach(p=>{
    let d = won?1.2 : lost?-1.2 : 0;
    if(p.type==='B'){
      const s=bx.bat[p.n];
      if(s&&s.PA>0){ p.bench=0; if(s.H>=2||s.HR>=1) d+=2.5; else if(s.AB>=4&&s.H===0) d-=1.5; }
      else if(!K.isInjured(p)){ p.bench=(p.bench||0)+1; if(K.ovr(p)>=med) d-=0.5; }
    } else {
      const s=bx.pit[p.n];
      if(s&&s.BF>0){
        if(p.n===sp){ if(s.ER<=2&&s.OUT>=15) d+=3; else if(s.ER>=5) d-=3; }
        else { if(s.ER>=2) d-=2; else if(s.OUT>=3&&s.ER===0) d+=1; }
      }
    }
    addMor(p,d);
    p.mor=clampN(p.mor+(60-p.mor)*0.03,5,99); // drift back toward neutral
  });
}

// ---------- FM match ratings (6.0 = average) ----------
function gameRating(p,s){
  if(p.type==='B') return clampN(6.0 + 0.6*s.H + 0.7*s.HR + 0.25*(s.BB+s.HBP) + 0.2*s.RBI + 0.15*s.R - 0.25*s.SO - (s.AB>=4&&s.H===0?0.4:0),3,10);
  return clampN(6.0 + s.OUT*0.12 - s.ER*0.6 + s.SO*0.08 - s.BB*0.1 - s.H*0.05,3,10);
}
function recordRatings(t,res){
  const f=fm(), bx=res.box[t];
  const add=(n,r)=>{ const x=f.rt[t+'|'+n]||(f.rt[t+'|'+n]={last:[],sum:0,cnt:0}); x.last.push(Math.round(r*10)/10); if(x.last.length>5)x.last.shift(); x.sum+=r; x.cnt++; };
  for(const n in bx.bat){ const s=bx.bat[n]; if(s.PA>0){ const p=findPlayer(t,n); if(p) add(n,gameRating(p,s)); } }
  for(const n in bx.pit){ const s=bx.pit[n]; if(s.BF>0){ const p=findPlayer(t,n); if(p) add(n,gameRating(p,s)); } }
}
function ratingsOf(t,n){ return fm().rt[t+'|'+n]; }
function rtColor(r){ return r>=7.5?'#36c275':r>=6.8?'#9fd26b':r>=6.2?'#d6e2c4':r>=5.6?'#e0b44c':'#e0556a'; }

// ---------- lineup preparation (rest, injuries, call-ups) ----------
function callUp(t,type,pos){
  const p=makeRookie(type,pos);
  if(type==='B') K.ROSTERS[t].batters.push(p); else K.ROSTERS[t].pitchers.push(p);
  if(t===USER) send('2군 감독','🧢',`${p.n} 1군 콜업`,
    `부상자가 많아 2군에서 ${p.n}(${p.age}세, ${posFull(p.pos||p.role)})을(를) 올렸습니다.`, []);
  return p;
}
function prepareCfg(team, cfg){
  ensure();
  const r=K.ROSTERS[team], f=fm();
  // keep enough healthy bodies to field a team
  while(r.batters.filter(p=>!K.isInjured(p)).length<10) callUp(team,'B');
  while(r.pitchers.filter(p=>!K.isInjured(p)).length<8) callUp(team,'P','RP');
  const isUser=team===USER;
  const opts={ restBelow: (!isUser||f.autoRest)? 70 : 0, forceRest: isUser? f.restNext : [] };
  // relievers who joined after the bullpen was set (rookies, call-ups, trades) go to the back of it
  const extraRP=r.pitchers.filter(p=>p.role!=='SP' && p.n!==cfg.closer && (cfg.bullpen||[]).indexOf(p.n)<0).map(p=>p.n);
  return K.restAdjust(team, Object.assign({}, cfg, {rotation: state.cfgs[team].rotation, bullpen:(cfg.bullpen||[]).concat(extraRP)}), opts);
}
// what prepareCfg will change for the user's next game, for the preview screen
function previewNote(){
  if(state.pendingGame==null) return '';
  const c=state.cfgs[USER], base=buildCfg(USER);
  const plain=Object.assign({},c,{spName:projectedSP(USER)});
  const outB=plain.lineup.filter(n=>base.lineup.indexOf(n)<0), inB=base.lineup.filter(n=>plain.lineup.indexOf(n)<0);
  const lines=[];
  outB.forEach((n,i)=>{ const p=findPlayer(USER,n); lines.push(`${n} → ${inB[i]||'-'} (${p&&K.isInjured(p)?'부상':'휴식'})`); });
  if(base.spName!==plain.spName) lines.push(`선발 ${plain.spName} → ${base.spName} (${K.isInjured(findPlayer(USER,plain.spName))?'부상':'피로'})`);
  if(!lines.length) return '';
  return `<div class="card" style="background:var(--panel2);margin-top:10px;border-color:var(--warn)"><b>🩺 코칭스태프 조정</b><div class="hint">${lines.map(esc).join('<br>')}</div></div>`;
}

// ---------- after every game (both teams) ----------
function afterGame(res){
  ensure();
  const f=fm();
  [res.home,res.away].forEach(t=>{
    const wasInj = t===USER? allPlayers(t).filter(p=>K.isInjured(p)).map(p=>p.n) : [];
    const hurt=K.applyFatigue(t,res.box);
    moraleAfterGame(t,res);
    recordRatings(t,res);
    if(t!==USER) return;
    hurt.forEach(h=>send('의무 트레이너','🩹',`${h.n} 부상`,
      `${h.n} 선수가 경기 중 부상을 입었습니다.\n예상 결장 기간: 약 ${h.games}경기\n\n부상 중에는 출전할 수 없으며, 라인업에서 자동으로 제외됩니다.`, []));
    wasInj.forEach(n=>{ const p=findPlayer(USER,n); if(p&&!K.isInjured(p)) send('의무 트레이너','✅',`${n} 부상 복귀`,`${n} 선수가 부상에서 회복해 출전 가능합니다. 컨디션 ${Math.round(p.cond)}%`, []); });
  });
  const ug=userGamesPlayed();
  if(res.home===USER||res.away===USER){
    f.restNext=[]; // one-game rests are used up by the user's game, not by other teams' games
    financeGame(res.home===USER);
    checkPromises(res, ug);
    checkUnhappy(ug);
    checkFatigueWarning(ug);
    checkStreak();
    maybeTradeOffer(ug);
    coachReport(ug);
    maybeMedia(ug);
    checkForeignForm(ug);
    if(ug-f.board.lastReview>=12 && state.phase==='regular'){ f.board.lastReview=ug; boardReview(); }
  }
}
function checkPromises(res, ug){
  const f=fm();
  f.promises.forEach(pr=>{
    const s=res.box[USER]&&res.box[USER].bat[pr.n]; if(s&&s.PA>0) pr.played=(pr.played||0)+1;
  });
  f.promises=f.promises.filter(pr=>{
    if(ug<pr.until) return true;
    const p=findPlayer(USER,pr.n); if(!p) return false;
    if((pr.played||0)>=pr.need){ addMor(p,5); send(pr.n,'🗣','약속을 지켜주셔서 감사합니다',`${pr.n}: "기회를 주셔서 감사합니다. 보답하겠습니다."`,[]); }
    else { p.mor=clampN(p.mor-25,5,99); allPlayers(USER).forEach(x=>{ if(x!==p) x.mor=clampN(x.mor-3,5,99); });
      send(pr.n,'💢','약속이 지켜지지 않았습니다',`${pr.n}: "출전 기회를 약속하셨잖아요. 실망입니다." (${pr.played||0}/${pr.need}경기 출전)\n\n선수단 전체의 신뢰가 흔들렸습니다.`,[]); }
    return false;
  });
}
function checkUnhappy(ug){
  const f=fm();
  allPlayers(USER).forEach(p=>{
    if(K.mor(p)>=32 || K.isInjured(p)) return;
    if(ug-(f.lastTalk[p.n]||-99)<15) return;
    if(f.inbox.some(m=>!m.done&&m.actions.some(a=>a.arg&&a.arg.n===p.n))) return;
    f.lastTalk[p.n]=ug;
    if(p.type==='B' && (p.bench||0)>=6){
      send(p.n,'🗣',`${p.n}이(가) 출전 시간에 불만을 표합니다`,
        `${p.n}: "감독님, 최근 ${p.bench}경기 연속 벤치에 있었습니다. 저도 뛸 수 있습니다. 기회를 주십시오."\n\n성격: ${pers(p).k} — ${pers(p).d}`,
        [{label:'주전 기회를 약속한다', fn:'promisePlay', arg:{n:p.n}},
         {label:'경쟁에서 이겨야 한다', fn:'compete', arg:{n:p.n}},
         {label:'트레이드 요청을 받아들인다', fn:'listMe', arg:{n:p.n}}]);
    } else {
      send(p.n,'🗣',`${p.n}의 사기가 바닥입니다`,
        `${p.n} 선수가 최근 부진과 팀 분위기 때문에 많이 위축되어 있습니다. 면담하시겠습니까?\n\n성격: ${pers(p).k} — ${pers(p).d}`,
        [{label:'믿고 있다고 격려한다', fn:'encourage', arg:{n:p.n}},
         {label:'분발하라고 질책한다', fn:'scold', arg:{n:p.n}}]);
    }
  });
}
function checkFatigueWarning(ug){
  const f=fm(); if(f.autoRest || ug-f.lastWarn<5) return;
  const tired=state.cfgs[USER].lineup.map(n=>findPlayer(USER,n)).filter(p=>p&&!K.isInjured(p)&&K.cond(p)<62);
  if(!tired.length) return;
  f.lastWarn=ug;
  send('수석코치','📋','주전 선수들이 지쳐 있습니다',
    `감독님, ${tired.map(p=>`${p.n}(컨디션 ${Math.round(p.cond)}%)`).join(', ')} 선수가 많이 지쳐 있습니다.\n지친 상태로 뛰면 타격이 떨어지고 부상 위험도 커집니다.`,
    [{label:'다음 경기 휴식을 준다', fn:'restNext', arg:{names:tired.map(p=>p.n)}},
     {label:'그대로 간다', fn:'keepGoing'}]);
}
function checkStreak(){
  const gs=state.schedule.filter(g=>g.played&&(g.home===USER||g.away===USER));
  let w=0,l=0; for(let i=gs.length-1;i>=0;i--){ const g=gs[i], us=g.home===USER?g.hr:g.ar, th=g.home===USER?g.ar:g.hr;
    if(us>th){ if(l)break; w++; } else if(us<th){ if(w)break; l++; } else break; }
  const club=K.ROSTERS[USER].name;
  if(w===5||w===10) send('스포츠 뉴스','📰',`${USER}, ${w}연승 질주!`,`${club}가 ${w}연승을 달렸습니다. 더그아웃 분위기가 최고조입니다.`,[]);
  if(l===5||l===10) send('스포츠 뉴스','📰',`${USER}, ${l}연패 수렁`,`${club}가 ${l}연패에 빠졌습니다. 팬들의 시선이 ${state.user.name} 감독에게 쏠리고 있습니다. 팀 미팅을 고려해 보세요.`,[]);
}
function maybeTradeOffer(ug){
  const f=fm(); if(state.phase!=='regular' || ug-f.lastOffer<10 || Math.random()>0.08) return;
  const mine=allPlayers(USER).filter(p=>!K.isInjured(p));
  const listed=mine.filter(p=>p.listed);
  const pool=listed.length? listed : mine.slice().sort((a,b)=>playerValue(b)-playerValue(a)).slice(0,14);
  const want=pool[Math.floor(Math.random()*pool.length)]; if(!want) return;
  const teams=K.TEAM_IDS.filter(t=>t!==USER); const team=teams[Math.floor(Math.random()*teams.length)];
  const v=playerValue(want);
  const give=allPlayers(team).filter(p=>!K.isInjured(p) && p.type===want.type && playerValue(p)>=v-4 && playerValue(p)<=v+1)
    .sort((a,b)=>playerValue(b)-playerValue(a))[0];
  if(!give) return;
  f.lastOffer=ug;
  send(`${K.ROSTERS[team].name} 단장`,'🤝',`트레이드 제안: ${want.n} ↔ ${give.n}`,
    `${K.ROSTERS[team].name}가 ${want.n} 영입을 원합니다.\n\n` +
    `• 보낼 선수: ${want.n} (${want.pos||want.role}, ${want.age}세, OVR ${K.ovr(want)}, 연봉 ${want.sal}억)\n` +
    `• 받을 선수: ${give.n} (${give.pos||give.role}, ${give.age}세, OVR ${K.ovr(give)}, 연봉 ${give.sal}억)\n\n` +
    `선수 프로필은 스쿼드 탭에서 확인할 수 있습니다.`,
    [{label:'제안 수락', fn:'acceptTrade', arg:{team, want:want.n, give:give.n}}, {label:'거절', fn:'declineTrade'}]);
}

// ---------- trades (shared by the trade tab and inbox offers) ----------
function tradeBudget(outNames, team, inNames){
  ensure();
  const out=outNames.reduce((a,n)=>{ const p=findPlayer(USER,n); return a+(p?p.sal:0); },0);
  const inn=inNames.reduce((a,n)=>{ const p=findPlayer(team,n); return a+(p?p.sal:0); },0);
  const after=payroll(USER)-out+inn, limit=fm().fin.budget*1.1;
  return {ok: after<=limit || inn<=out, after:Math.round(after*10)/10, limit:Math.round(limit*10)/10,
    msg:`연봉 총액이 예산 한도를 넘습니다 (${after.toFixed(1)}억 > ${limit.toFixed(1)}억). 이사회가 승인하지 않습니다.`};
}
function doTrade(team, fromUser, fromThem){
  function move(srcT,dstT,name){
    const r=K.ROSTERS[srcT]; let i=r.batters.findIndex(x=>x.n===name);
    if(i>=0){ const p=r.batters.splice(i,1)[0]; p.listed=false; p.bench=0; K.ROSTERS[dstT].batters.push(p); return; }
    i=r.pitchers.findIndex(x=>x.n===name);
    if(i>=0){ const p=r.pitchers.splice(i,1)[0]; p.listed=false; K.ROSTERS[dstT].pitchers.push(p); }
  }
  fromUser.forEach(n=>move(USER,team,n));
  fromThem.forEach(n=>move(team,USER,n));
  fm().promises=fm().promises.filter(pr=>!!findPlayer(USER,pr.n));
  [USER,team].forEach(t=>{ const d=K.defaultLineup(t); state.cfgs[t]={teamId:t,lineup:d.lineup.slice(),positions:d.positions.slice(),rotation:d.rotation.slice(),bullpen:d.bullpen.slice(),closer:d.closer}; });
}

// ---------- coach report: what is costing games, and two things to change ----------
function leagueLines(){
  const out={};
  K.TEAM_IDS.forEach(t=>{
    const s=state.season[t]; let AB=0,H=0,BB=0,HBP=0,TB=0,ER=0,OUT=0,spER=0,spOUT=0,rpER=0,rpOUT=0;
    for(const n in s.bat){ const x=s.bat[n]; AB+=x.AB; H+=x.H; BB+=x.BB; HBP+=x.HBP; TB+=x.H+x._2B+2*x._3B+3*x.HR; }
    for(const n in s.pit){ const x=s.pit[n], p=findPlayer(t,n), sp=p&&p.role==='SP'; ER+=x.ER; OUT+=x.OUT; if(sp){spER+=x.ER;spOUT+=x.OUT;} else {rpER+=x.ER;rpOUT+=x.OUT;} }
    const gp=s.W+s.L+s.T||1;
    out[t]={rpg:s.RF/gp, rapg:s.RA/gp, obp:(H+BB+HBP)/Math.max(1,AB+BB+HBP), slg:TB/Math.max(1,AB),
      spEra:spOUT?spER*27/spOUT:0, rpEra:rpOUT?rpER*27/rpOUT:0, def:K.teamDefense(t,state.cfgs[t].lineup,state.cfgs[t].positions||K.autoPositions(t,state.cfgs[t].lineup))};
  });
  return out;
}
function rankIn(lines,key,asc){ const arr=K.TEAM_IDS.slice().sort((a,b)=>asc? lines[a][key]-lines[b][key] : lines[b][key]-lines[a][key]); return arr.indexOf(USER)+1; }
function coachReport(ug){
  const f=fm(); if(ug<10 || ug-(f.lastReport||0)<10 || state.phase!=='regular') return;
  f.lastReport=ug;
  const L=leagueLines(), me=L[USER], avg=k=>K.TEAM_IDS.reduce((a,t)=>a+L[t][k],0)/K.TEAM_IDS.length;
  const c=state.cfgs[USER], s=state.season[USER];
  const pos=c.positions||K.autoPositions(USER,c.lineup);
  const lines=[
    `• 득점 ${me.rpg.toFixed(2)}점/경기 (리그 ${rankIn(L,'rpg')}위, 평균 ${avg('rpg').toFixed(2)})`,
    `• 실점 ${me.rapg.toFixed(2)}점/경기 (리그 ${rankIn(L,'rapg',true)}위, 평균 ${avg('rapg').toFixed(2)})`,
    `• 출루율 ${fmtAvg(me.obp)} (${rankIn(L,'obp')}위) · 장타율 ${fmtAvg(me.slg)} (${rankIn(L,'slg')}위)`,
    `• 선발 평균자책 ${me.spEra.toFixed(2)} (${rankIn(L,'spEra',true)}위) · 불펜 ${me.rpEra.toFixed(2)} (${rankIn(L,'rpEra',true)}위)`,
    `• 팀 수비력 ${me.def.toFixed(1)} (${rankIn(L,'def')}위, 평균 70)`];
  const acts=[], notes=[];
  // weakest regular by OPS, and a fresher bat on the bench who can play his position
  const ops=n=>{ const x=s.bat[n]; if(!x||x.PA<25) return null; return (x.H+x.BB+x.HBP)/Math.max(1,x.AB+x.BB+x.HBP) + (x.H+x._2B+2*x._3B+3*x.HR)/Math.max(1,x.AB); };
  const regs=c.lineup.map((n,i)=>({n,i,o:ops(n)})).filter(x=>x.o!=null).sort((a,b)=>a.o-b.o);
  const weak=regs[0];
  if(weak && weak.o<0.68){
    const spot=pos[weak.i];
    const alt=K.ROSTERS[USER].batters.filter(b=>c.lineup.indexOf(b.n)<0 && !K.isInjured(b) && K.posFit(b,spot)<10)
      .sort((a,b)=>K.batValue(b)-K.batValue(a))[0];
    if(alt && K.batValue(alt)>=K.batValue(findPlayer(USER,weak.n))-3){
      notes.push(`${weak.n}의 OPS가 ${weak.o.toFixed(3)}로 주전 중 가장 낮습니다. ${alt.n}(${alt.pos})에게 ${spot} 자리를 맡겨 보시죠.`);
      acts.push({label:`${weak.n} → ${alt.n} (${spot}) 교체`, fn:'swapLineup', arg:{out:weak.n, in:alt.n}});
    }
  }
  // the rotation's worst ERA, against a spare starter or a long man
  const rot=c.rotation.map(n=>({n,x:state.season[USER].pit[n]})).filter(r=>r.x&&r.x.OUT>=45).map(r=>({n:r.n,era:r.x.ER*27/r.x.OUT}));
  rot.sort((a,b)=>b.era-a.era);
  if(rot[0] && rot[0].era>avg('spEra')+1.2){
    const alt=K.ROSTERS[USER].pitchers.filter(p=>c.rotation.indexOf(p.n)<0 && p.n!==c.closer && !K.isInjured(p) && p.sta>=60)
      .sort((a,b)=>K.ovr(b)-K.ovr(a))[0];
    if(alt){
      notes.push(`선발 ${rot[0].n}의 평균자책이 ${rot[0].era.toFixed(2)}입니다. ${alt.n}(체력 ${attr20(alt.sta)})을 로테이션에 넣는 방안을 건의합니다.`);
      acts.push({label:`로테이션: ${rot[0].n} → ${alt.n}`, fn:'swapRotation', arg:{out:rot[0].n, in:alt.n}});
    }
  }
  const tiredPen=K.ROSTERS[USER].pitchers.filter(p=>p.role!=='SP'&&!K.isInjured(p)&&K.cond(p)<55).map(p=>p.n);
  if(tiredPen.length>=3) notes.push(`불펜 ${tiredPen.join(', ')}이(가) 지쳐 있습니다. 선발이 길게 던질 수 있게 체력 좋은 선발을 우선 기용하세요.`);
  const issues=K.positionIssues(USER,c.lineup,pos);
  if(issues.length) notes.push(`수비 배치 문제: ${issues.join(', ')}`);
  if(!notes.length) notes.push('지금 구성이 잘 돌아가고 있습니다. 컨디션 관리만 신경 써 주십시오.');
  acts.push({label:'지금대로 간다', fn:'ok'});
  send('수석코치','📋',`수석코치 보고 (${ug}경기)`, `감독님, 최근까지의 팀 지표입니다.\n\n${lines.join('\n')}\n\n제안:\n${notes.map(x=>'• '+x).join('\n')}`, acts);
}

// ---------- media: a question after a streak ----------
function maybeMedia(ug){
  const f=fm(); if(ug-(f.lastMedia||-99)<15 || Math.random()>0.2) return;
  const rr=recentRecord(); if(rr.w+rr.l<5) return;
  f.lastMedia=ug;
  const hot=rr.w>=4, cold=rr.l>=4;
  const q = hot? `최근 5경기 ${rr.w}승입니다. 상승세의 비결은 무엇입니까?` : cold? `최근 5경기 ${rr.l}패입니다. 감독님 거취에 대한 이야기도 나옵니다.` : `시즌 ${ug}경기를 치렀습니다. 지금 팀을 평가하신다면?`;
  send('스포츠 기자','🎤','기자회견 질문', `기자: "${q}"\n\n답변에 따라 선수단 사기와 이사회 인상이 달라집니다.`,
    [{label:'"선수들이 잘해주고 있다"', fn:'media', arg:{kind:'players'}},
     {label:'"책임은 감독인 내게 있다"', fn:'media', arg:{kind:'me'}},
     {label:'"더 잘해야 한다, 분발을 요구한다"', fn:'media', arg:{kind:'demand'}}]);
}

// ---------- contracts ----------
// re-signing price starts from what the player earns now, nudged toward what his play is worth
function renewSalary(p){
  const cur=p.sal||salaryFor(p), fair=salaryFor(p);
  const w = p.age>=35? 0.5 : 0.65;
  return Math.max(0.3, Math.round((cur*w + fair*(1-w))*10)/10);
}

// ---------- free agents ----------
// f.fa: [{p, ask, yrs, from}] — players without a club this offseason
function faAsk(p){ return Math.max(0.5, Math.round(Math.max(renewSalary(p), salaryFor(p))*1.1*10)/10); }
function faYears(p){ return p.age>=34? 1 : p.age>=30? 2 : 3; }
function addFA(p, from){ const f=fm(); f.fa=f.fa||[]; delete p.leaving; p.expiring=false; f.fa.push({p, ask:faAsk(p), yrs:faYears(p), from}); }
function signFA(i){
  const f=fm(), x=(f.fa||[])[i]; if(!x) return;
  if(x.p.f && foreignOf(USER).length>=FX_MAX){ notify('외국인 선수 정원(4명)이 찼습니다.'); return; }
  const limit=f.fin.budget*1.1, after=payroll(USER)+x.ask, bonus=Math.round(x.ask*x.yrs*0.25*10)/10;
  if(after>limit){ notify(`연봉 총액이 한도를 넘습니다 (${after.toFixed(1)}억 > ${limit.toFixed(1)}억). 다른 선수를 정리하거나 예산 범위의 선수를 찾으세요.`); return; }
  const p=x.p;
  ask(`${p.n}(${p.age}세, ${posFull(p.pos||p.role)}, OVR ${K.ovr(p)})과 ${x.yrs}년 연봉 ${x.ask}억 원에 계약합니다.\n계약금 ${bonus}억 원은 구단 잔고에서 나갑니다.`, 'FA 계약', ()=>{
    f.fa.splice(f.fa.indexOf(x),1);
    p.sal=x.ask; p.yrs=x.yrs; p.mor=72; p.cond=100; p.inj=0; p.listed=false; p.bench=0;
    if(p.type==='B') K.ROSTERS[USER].batters.push(p); else K.ROSTERS[USER].pitchers.push(p);
    f.fin.balance-=bonus; f.fin.exp+=bonus;
    send('단장','✍️',`FA ${p.n} 영입`, `${p.n}과(와) ${x.yrs}년 연봉 ${x.ask}억 원에 계약했습니다. 계약금 ${bonus}억 원.`, []);
    render();
  });
}
// offseason end: AI clubs pick up the free agents worth signing, the rest leave the league
function aiSignFAs(){
  const f=fm(), list=(f.fa||[]).slice().sort((a,b)=>K.ovr(b.p)-K.ovr(a.p)), gone=[];
  list.forEach(x=>{
    const p=x.p, teams=K.TEAM_IDS.filter(t=>t!==USER).sort((a,b)=>teamStrength(a)-teamStrength(b));
    const t=teams.find(t=>(p.type==='B'?K.ROSTERS[t].batters.length<15:K.ROSTERS[t].pitchers.length<13)) ;
    if(t && K.ovr(p)>=64 && Math.random()<0.8){ p.sal=x.ask; p.yrs=x.yrs; (p.type==='B'?K.ROSTERS[t].batters:K.ROSTERS[t].pitchers).push(p); gone.push(`${p.n} → ${t}`); }
  });
  f.fa=[];
  return gone;
}

// ---------- foreign players (quota 4 incl. Asian quota, two replacements a season) ----------
const FX_NAMES=['로페즈','마르테','브리토','오도넬','헤이워드','카펜터','레예스','몬테로','갈비스','스탠튼','라미레스','클라크','파울러','밀러','앤더슨','톰슨','로저스','하퍼','크루즈','벨트레','마차도','가르시아','소토','베탄코트','플로레스','에반스','콜','브룩스','그레이','토레스'];
const FX_MAX=4, FX_SWAPS=2;
function foreignOf(t){ return allPlayers(t).filter(p=>p.f); }
function makeForeign(type){
  const used=allNames(); let n=FX_NAMES.find(x=>!used.has(x)&&Math.random()<0.3)||FX_NAMES.find(x=>!used.has(x))||('외국인'+R(10,99));
  const age=R(25,32);
  let p;
  if(type==='B'){ const pos=['1B','LF','RF','3B','CF','SS','2B'][R(0,6)];
    p={n, pos, age, con:R(66,84), pow:R(70,92), eye:R(60,80), spd:R(48,80), fld:R(58,80), arm:R(60,82), type:'B'}; }
  else { p={n, role:'SP', age, stu:R(70,86), ctl:R(64,82), mov:R(66,80), sta:R(72,88), type:'P'}; }
  Object.assign(p,{f:1, yrs:1, mor:70, cond:100, inj:0, bench:0, pers:hash(n)%PERS.length});
  p.sal=clampN(Math.round((4+Math.max(0,K.ovr(p)-70)*0.7+Math.random()*3)*10)/10, 5, 18);
  return p;
}
function scoutList(){
  const f=fm(), ug=userGamesPlayed();
  if(!f.scout || f.scout.year!==state.year || ug-f.scout.ug>=20) f.scout={year:state.year, ug, list:[makeForeign('P'),makeForeign('P'),makeForeign('B'),makeForeign('B')]};
  return f.scout.list;
}
function fxWindowOpen(){ return state.phase==='regular' && userGamesPlayed()<108; }
function fxSwapsLeft(){ const f=fm(); return FX_SWAPS-((f.fxSwaps&&f.fxSwaps.year===state.year)?f.fxSwaps.n:0); }
function fxPick(i){
  const cand=scoutList()[i]; if(!cand) return;
  if(!fxWindowOpen()){ notify('외국인 선수 교체는 정규시즌 108경기 전까지만 가능합니다.'); return; }
  if(fxSwapsLeft()<=0){ notify('이번 시즌 외국인 선수 교체 횟수(2회)를 모두 썼습니다.'); return; }
  const mine=foreignOf(USER);
  const btn=p=>`<button class="btn" onclick="FM.fxSign(${i},'${q(p.n)}')">${esc(p.n)} 방출 <span class="muted">(${p.pos||p.role}·OVR ${K.ovr(p)}·잔여 위약금 ${Math.round(p.sal*0.5*10)/10}억)</span></button>`;
  modal(`<span class="closeX" onclick="App.closeModal()">×</span><h2>🌏 ${esc(cand.n)} 영입</h2>
    <div class="muted">${posFull(cand.pos||cand.role)} · ${cand.age}세 · OVR ${K.ovr(cand)} · 연봉 ${cand.sal}억 (계약금 ${Math.round(cand.sal*0.2*10)/10}억)</div>
    <div class="hint" style="margin:10px 0">외국인 선수는 최대 ${FX_MAX}명입니다. 누구를 내보낼까요?</div>
    <div class="grid" style="gap:8px">${mine.map(btn).join('')}
    ${mine.length<FX_MAX?`<button class="btn primary" onclick="FM.fxSign(${i},'')">방출 없이 영입 (${mine.length}/${FX_MAX}명)</button>`:''}</div>`);
}
function fxSign(i,outName){
  const f=fm(), cand=scoutList()[i]; if(!cand) return;
  const out=outName? findPlayer(USER,outName) : null;
  const limit=f.fin.budget*1.1, after=payroll(USER)-(out?out.sal:0)+cand.sal;
  if(after>limit){ notify(`연봉 총액이 한도를 넘습니다 (${after.toFixed(1)}억 > ${limit.toFixed(1)}억).`); return; }
  if(!out && foreignOf(USER).length>=FX_MAX){ notify('외국인 선수 정원이 찼습니다.'); return; }
  const fee=Math.round((cand.sal*0.2 + (out?out.sal*0.5:0))*10)/10;
  const r=K.ROSTERS[USER];
  if(out){ if(out.type==='B') r.batters=r.batters.filter(x=>x!==out); else r.pitchers=r.pitchers.filter(x=>x!==out); }
  if(cand.type==='B') r.batters.push(cand); else r.pitchers.push(cand);
  f.scout.list.splice(i,1);
  f.fxSwaps={year:state.year, n:(f.fxSwaps&&f.fxSwaps.year===state.year?f.fxSwaps.n:0)+(out?1:0)};
  f.fin.balance-=fee; f.fin.exp+=fee;
  f.promises=f.promises.filter(pr=>!!findPlayer(USER,pr.n));
  const d=K.defaultLineup(USER); const c=state.cfgs[USER];
  if(out && (c.lineup.indexOf(out.n)>=0||c.rotation.indexOf(out.n)>=0||c.bullpen.indexOf(out.n)>=0||c.closer===out.n)) state.cfgs[USER]={teamId:USER,lineup:d.lineup.slice(),positions:d.positions.slice(),rotation:d.rotation.slice(),bullpen:d.bullpen.slice(),closer:d.closer};
  send('단장','🌏',`외국인 선수 ${cand.n} 영입`, `${cand.n}(${posFull(cand.pos||cand.role)}, OVR ${K.ovr(cand)})과 연봉 ${cand.sal}억 원에 계약했습니다.${out?`\n${out.n}은(는) 방출되었습니다.`:''}\n비용 ${fee}억 원(계약금${out?'·위약금':''})이 지출되었습니다.${out&&c.lineup.indexOf(out.n)>=0?'\n라인업이 자동 재구성되었습니다.':''}`, []);
  closeModal(); render();
}
// a foreign player who isn't working out: the scouts flag it
function checkForeignForm(ug){
  const f=fm(); if(!fxWindowOpen() || ug<25 || ug-(f.lastFxNote||-99)<25 || fxSwapsLeft()<=0) return;
  const bad=foreignOf(USER).map(p=>({p, rt:ratingsOf(USER,p.n)})).filter(x=>x.rt&&x.rt.cnt>=10&&x.rt.sum/x.rt.cnt<6.15).sort((a,b)=>a.rt.sum/a.rt.cnt-b.rt.sum/b.rt.cnt)[0];
  if(!bad) return;
  f.lastFxNote=ug;
  send('스카우트 팀장','🌏',`${bad.p.n} 교체를 검토할 시점입니다`,
    `${bad.p.n}의 평균 평점이 ${(bad.rt.sum/bad.rt.cnt).toFixed(2)}에 그치고 있습니다. 스카우트 팀이 대체 후보 ${scoutList().length}명을 추렸습니다.\n\n구단 탭의 '외국인 선수 시장'에서 후보를 확인하세요. (교체 가능 ${fxSwapsLeft()}회, 108경기 전까지)`,
    [{label:'구단 탭에서 후보 보기', fn:'openClub'}, {label:'더 지켜본다', fn:'ok'}]);
}

// ---------- postseason hooks ----------
function onRegularSeasonEnd(){
  ensure();
  const st=standings(), rank=st.findIndex(x=>x.t===USER)+1, seeds=state.postseason.seeds;
  send('KBO','🏆',`${state.year} 포스트시즌 대진 확정`,
    `정규시즌 최종 순위: ${seeds.map((t,i)=>`${i+1}. ${K.ROSTERS[t].name}`).join(' · ')}\n\n` +
    (seeds.includes(USER)? `${K.ROSTERS[USER].name}는 ${rank}위로 가을야구에 나갑니다. 경기마다 라인업·선발을 정하고 실시간 중계로 지휘하세요.`
      : `${K.ROSTERS[USER].name}는 ${rank}위로 시즌을 마쳤습니다. 포스트시즌은 대시보드에서 시뮬레이션으로 진행됩니다.`), []);
  showPS();
}
function psSeriesMessage(c){
  const opp=c.hi===USER?c.lo:c.hi;
  send('수석코치','📋',`${c.name}: ${K.ROSTERS[opp].name}전`,
    `${c.name} 상대는 ${K.ROSTERS[opp].name}입니다 (${c.bestOf===3?'우리 '+(c.hi===USER?'1승 어드밴티지':'2승 필요'):c.need+'선승제'}).\n` +
    `포스트시즌은 연장 15회까지 갑니다. 선발 로테이션 순서를 점검하고, 지친 선수가 없는지 확인하세요.`, []);
}
function psSeriesResult(name, r){
  const won=r.winner===USER;
  allPlayers(USER).forEach(p=>addMor(p, won?4:-3));
  send('스포츠 뉴스','📰', won? `${USER}, ${name} 통과!` : `${USER}, ${name}에서 탈락`,
    won? `${K.ROSTERS[USER].name}가 ${name}에서 ${K.ROSTERS[r.loser].name}를 꺾었습니다.` : `${K.ROSTERS[USER].name}의 가을이 ${name}에서 끝났습니다.`, []);
}
// postseason games don't count in the season stats, but players still tire and get hurt
function afterPsGame(res){
  ensure();
  [res.home,res.away].forEach(t=>{
    const hurt=K.applyFatigue(t,res.box);
    moraleAfterGame(t,res);
    if(t===USER) hurt.forEach(h=>send('의무 트레이너','🩹',`${h.n} 부상`, `${h.n} 선수가 포스트시즌 경기 중 부상을 입었습니다. 예상 결장 약 ${h.games}경기.`, []));
  });
}

// ---------- after being fired: other clubs that want the manager ----------
function jobOffers(){
  const st=standings().map(x=>x.t).filter(t=>t!==USER);
  const bottom=st.slice(-5); const out=[];
  while(out.length<2 && bottom.length){ out.push(bottom.splice(Math.floor(Math.random()*bottom.length),1)[0]); }
  return out;
}
function takeJob(t){
  const f=fm(), old=USER;
  // the old club's open contract talks end; that club re-signs its own players
  f.inbox.forEach(m=>{ if(!m.done && m.actions.some(a=>a.fn==='renew')){ m.done=true; m.read=true; m.result='구단을 떠나 협상이 종료되었습니다.'; } });
  allPlayers(old).forEach(p=>{ if(p.expiring||p.leaving){ p.expiring=false; delete p.leaving; p.yrs=2; p.sal=renewSalary(p); } });
  USER=t; state.user.team=t; applyTheme(t);
  f.fired=false; f.lastChance=false; f.board.conf=50; f.restNext=[]; f.promises=[]; f.offers=null;
  send(`${K.ROSTERS[t].name} 구단주`,'🤝',`${state.user.name} 감독님, ${K.ROSTERS[t].name}에 오신 것을 환영합니다`,
    `${K.ROSTERS[old].name}에서의 경험을 살려 우리 팀을 일으켜 주십시오.\n이사회 목표는 다음 시즌 시작 때 전달됩니다.`, []);
  closeModal(); currentTab='dash'; render();
}

// ---------- season end / offseason ----------
function onSeasonEnd(){
  ensure();
  const f=fm(), s=boardStatus(), b=f.board;
  const champ=state.champion===USER;
  let d = s.met? 15 : -(5+s.gap*3);
  if(champ) d+=25;
  b.conf=clampN(b.conf+d,0,100);
  send('구단 이사회','🏛',`${state.year} 시즌 최종 평가: ${s.met?'목표 달성':'목표 미달'}`,
    `최종 ${s.rank}위 · 승률 ${fmtAvg(s.pct)} (목표: ${b.expect.label})${champ?'\n🏆 한국시리즈 우승!':''}\n` +
    `재정: 잔고 ${f.fin.balance.toFixed(1)}억 원 · 시즌 수입 ${f.fin.rev.toFixed(1)}억 / 지출 ${f.fin.exp.toFixed(1)}억\n\n이사회 신뢰도: ${b.conf} (${d>=0?'+':''}${d})`, []);
  if(b.conf<15 && !s.met){ f.fired=true; }
  // contracts: one year off everyone's deal; the user negotiates expiring ones
  const toFA=[];
  f.fa=[];
  K.TEAM_IDS.forEach(t=>allPlayers(t).forEach(p=>{
    p.yrs=(p.yrs||1)-1;
    if(p.yrs>0) return;
    if(t!==USER){ // AI clubs re-sign most players; some veterans and imports test the market
      if((p.age>=28&&p.age<=34&&Math.random()<0.3) || (p.f&&Math.random()<0.25)){ toFA.push([t,p]); return; }
      p.yrs=2; p.sal=renewSalary(p); return; }
    p.expiring=true;
    const ask=Math.round(renewSalary(p)*(K.mor(p)<40?1.2:K.mor(p)>75?0.95:1.03)*10)/10;
    const acts=[{label:`1년 ${ask}억 재계약`, fn:'renew', arg:{n:p.n, years:1, sal:ask}}];
    if(p.age<=33) acts.push({label:`3년 ${Math.round(ask*1.1*10)/10}억 재계약`, fn:'renew', arg:{n:p.n, years:3, sal:Math.round(ask*1.1*10)/10}});
    acts.push({label:'재계약하지 않는다', fn:'release', arg:{n:p.n}});
    send(`${p.n} 에이전트`,'📝',`${p.n} 계약 만료 — 재계약 협상`,
      `${p.n}(${p.age}세, ${posFull(p.pos||p.role)}, OVR ${K.ovr(p)})의 계약이 만료됩니다.\n현재 연봉 ${p.sal}억 원 · 요구 연봉 ${ask}억 원 · 사기 ${moraleLabel(K.mor(p))}\n\n` +
      `다음 시즌 시작 전까지 결정하지 않으면 FA로 팀을 떠납니다.`, acts);
  }));
  toFA.forEach(([t,p])=>{ const r=K.ROSTERS[t]; r.batters=r.batters.filter(x=>x!==p); r.pitchers=r.pitchers.filter(x=>x!==p); addFA(p,t); });
  if(f.fa.length) send('단장','🆓',`FA 시장 개장 (${f.fa.length}명)`,
    `다른 구단과 재계약하지 않은 선수들이 FA 시장에 나왔습니다.\n\n${f.fa.slice().sort((a,b)=>K.ovr(b.p)-K.ovr(a.p)).slice(0,6).map(x=>`• ${x.p.n} (${x.p.pos||x.p.role}, ${x.p.age}세, OVR ${K.ovr(x.p)}) 요구 ${x.yrs}년 ${x.ask}억`).join('\n')}\n\n구단 탭의 FA 시장에서 계약할 수 있습니다. 다음 시즌이 시작되면 남은 선수들은 다른 구단과 계약합니다.`, []);
}
function maybeShowFired(){
  const f=fm(); if(!f||!f.fired) return;
  modal(`<h2>📰 감독 경질</h2>
    <p>구단 이사회가 성적 부진을 이유로 감독 교체를 결정했습니다. (이사회 신뢰도 ${f.board.conf})</p>
    ${(f.offers=f.offers||jobOffers()).length? `<div class="hint" style="margin-top:10px">다른 구단에서 감독 제의가 왔습니다.</div>
    <div class="grid" style="gap:8px;margin-top:8px">${f.offers.map(t=>`<button class="btn" onclick="App.takeJob('${t}')">${teamDot(t)} ${K.ROSTERS[t].name} 감독직 수락 <span class="muted">(정규시즌 ${standings().findIndex(x=>x.t===t)+1}위)</span></button>`).join('')}</div>` : ''}
    <div class="row" style="gap:8px;margin-top:12px">
      <button class="btn primary" onclick="FM.newCareer()">🔄 새 게임 시작</button>
      ${f.lastChance?'':'<button class="btn" onclick="FM.lastChance()">🙏 구단주에게 마지막 기회를 요청한다</button>'}
    </div>`);
}
function newCareer(){ try{ localStorage.removeItem('kbo_manager_autosave'); }catch(e){} location.reload(); }
function lastChance(){ const f=fm(); f.fired=false; f.lastChance=true; f.board.conf=30; closeModal();
  send('구단주','🏛','마지막 기회','구단주가 한 시즌의 기회를 더 주기로 했습니다. 이번에는 결과로 보여주셔야 합니다.',[]); render(); }

// before the new season's lineups are rebuilt: departures, retirements, rookies, a fresh body
function offseasonMoves(){
  ensure();
  const f=fm();
  // unanswered contract talks: the player walks
  f.inbox.forEach(m=>{ if(!m.done && m.actions.some(a=>a.fn==='renew')){ m.done=true; m.read=true; m.result='기한 내 결정하지 않아 FA로 떠났습니다.'; const p=findPlayer(USER,m.actions[0].arg.n); if(p) p.leaving=true; } });
  const left=[], retired=[];
  K.TEAM_IDS.forEach(t=>{
    const r=K.ROSTERS[t];
    const out=p=>{ if(t===USER&&p.leaving){ left.push(p.n); addFA(p,USER); return true; }
      if(p.age>=39 && K.ovr(p)<72){ if(t===USER) retired.push(p.n); return true; } return false; };
    r.batters=r.batters.filter(p=>!out(p)); r.pitchers=r.pitchers.filter(p=>!out(p));
    allPlayers(t).forEach(p=>{ p.cond=100; p.inj=0; p.bench=0; p.expiring=false; p.mor=clampN(p.mor*0.6+62*0.4,5,99); });
    // draft: one batter and one pitcher each, then fill to a playable roster
    const rookies=[makeRookie('B'), makeRookie('P')];
    r.batters.push(rookies[0]); r.pitchers.push(rookies[1]);
    while(r.batters.length<12){ const p=makeRookie('B'); r.batters.push(p); rookies.push(p); }
    while(r.pitchers.filter(p=>p.role==='SP').length<5){ const p=makeRookie('P','SP'); r.pitchers.push(p); rookies.push(p); }
    while(r.pitchers.length<10){ const p=makeRookie('P','RP'); r.pitchers.push(p); rookies.push(p); }
    if(t===USER){ f.newRookies=rookies.map(p=>`${p.n} (${p.age}세, ${posFull(p.pos||p.role)}, OVR ${K.ovr(p)})`); return; }
    // AI clubs cut their least valuable players so rosters don't grow every year
    const trim=(arr,max)=>{ while(arr.length>max){ let w=0; arr.forEach((p,i)=>{ if(playerValue(p)<playerValue(arr[w])) w=i; }); arr.splice(w,1); } };
    trim(r.batters,14);
    if(r.pitchers.length>12){ const sp=r.pitchers.filter(p=>p.role==='SP'), rp=r.pitchers.filter(p=>p.role!=='SP'); trim(sp,Math.max(5,12-rp.length)); trim(rp,12-sp.length); r.pitchers=sp.concat(rp); }
  });
  const signed=aiSignFAs();
  f.offseasonNews={left, retired, signed};
}
// "next season" button: warn about contract talks that will end with the player leaving
function confirmNextSeason(go){
  ensure();
  const open=fm().inbox.filter(m=>!m.done && m.actions.some(a=>a.fn==='renew'));
  if(!open.length){ go(); return; }
  ask(`재계약 협상 ${open.length}건이 남아 있습니다 (${open.map(m=>m.actions[0].arg.n).join(', ')}).\n지금 다음 시즌을 시작하면 이 선수들은 FA로 떠납니다.`, '다음 시즌 시작', go);
}
function onNewSeason(){
  const f=fm(); seasonStart(false);
  const n=f.offseasonNews||{left:[],retired:[]};
  send('스카우트 팀장','🎓',`${state.year} 신인 입단`,
    `새 시즌 신인이 합류했습니다.\n\n${(f.newRookies||[]).map(x=>'• '+x).join('\n')}` +
    (n.left.length? `\n\nFA로 떠난 선수: ${n.left.join(', ')}`:'') + (n.retired.length? `\n은퇴한 선수: ${n.retired.join(', ')}`:'') +
    (n.signed&&n.signed.length? `\n다른 구단의 FA 계약: ${n.signed.join(', ')}`:''), []);
}

// ---------- team meeting ----------
function recentRecord(){
  const gs=state.schedule.filter(g=>g.played&&(g.home===USER||g.away===USER)).slice(-5);
  return gs.reduce((a,g)=>{ const us=g.home===USER?g.hr:g.ar, th=g.home===USER?g.ar:g.hr; if(us>th)a.w++; else if(us<th)a.l++; return a; },{w:0,l:0});
}
function meetingReady(){ return userGamesPlayed()-fm().lastMeeting>=10; }
function teamMeeting(){
  if(!meetingReady()){ notify('팀 미팅은 10경기에 한 번만 열 수 있습니다.'); return; }
  const rr=recentRecord();
  modal(`<span class="closeX" onclick="App.closeModal()">×</span><h2>📣 팀 미팅</h2>
    <div class="muted">최근 5경기 ${rr.w}승 ${rr.l}패 · 선수단 평균 사기 ${moraleLabel(avgMorale(USER))}</div>
    <div class="hint" style="margin:10px 0">선수단에게 어떤 메시지를 전하시겠습니까? 성격에 따라 반응이 다릅니다.</div>
    <div class="grid" style="gap:8px">
      <button class="btn" onclick="FM.meeting('praise')">👏 칭찬과 격려 — "잘하고 있다, 이대로 가자"</button>
      <button class="btn" onclick="FM.meeting('demand')">🔥 분발 촉구 — "이 정도로는 안 된다"</button>
      <button class="btn" onclick="FM.meeting('calm')">🧘 평정심 유지 — "한 경기씩 집중하자"</button>
    </div>`);
}
function meeting(kind){
  const f=fm(), rr=recentRecord(), good=rr.w>=3;
  let pos=0,neg=0;
  allPlayers(USER).forEach(p=>{
    const k=pers(p).k; let d;
    if(kind==='praise') d = good? 4 : 2;
    else if(kind==='demand') d = good? -3 : (k==='승부욕'||k==='리더형')? 6 : k==='예민함'? -4 : 3;
    else d = k==='예민함'? 4 : 2;
    p.mor=clampN(K.mor(p)+d,5,99); if(d>0)pos++; else neg++;
  });
  f.lastMeeting=userGamesPlayed();
  closeModal();
  send('수석코치','📋','팀 미팅 결과',
    `선수 ${pos}명이 긍정적으로 반응했고, ${neg}명은 불만을 보였습니다.\n` +
    (kind==='demand'&&good? '좋은 흐름에서의 질책에 선수들이 의아해했습니다.' : kind==='praise'&&!good? '부진 중의 칭찬이라 효과가 크지 않았습니다.' : '메시지가 잘 전달되었습니다.'), []);
  render();
}

// ---------- individual talk / actions from the profile ----------
function talk(n, kind){
  const p=findPlayer(USER,n); if(!p) return;
  const f=fm(), ug=userGamesPlayed(), key='talk|'+n;
  if(ug-(f.lastTalk[key]||-99)<10){ notify('같은 선수와의 면담은 10경기에 한 번만 할 수 있습니다.'); return; }
  f.lastTalk[key]=ug;
  const rt=ratingsOf(USER,n), form=rt&&rt.last.length? rt.last.reduce((a,b)=>a+b,0)/rt.last.length : 6.3;
  const k=pers(p).k; let d, msg;
  if(kind==='praise'){ d = form>=6.6? 6 : 2; if(k==='예민함') d+=3; msg = form>=6.6? '칭찬에 고무되었습니다.' : '최근 부진을 알기에 칭찬이 조금 어색했습니다.'; }
  else { d = form<6.0? (k==='승부욕'?7:k==='예민함'?-9:2) : -6; msg = d>0? '질책을 받아들이고 각오를 다졌습니다.' : '부당하다고 느끼고 있습니다.'; }
  p.mor=clampN(K.mor(p)+d,5,99);
  send(n,'🗣',`${n}과(와)의 면담`,`${n}이(가) ${msg} (사기 ${d>=0?'+':''}${d})`,[]);
  closeModal(); showProfile(USER,n); render();
}
function toggleRest(n){ const f=fm(), i=f.restNext.indexOf(n); if(i>=0)f.restNext.splice(i,1); else f.restNext.push(n); closeModal(); showProfile(USER,n); render(); }
function toggleList(n){ const p=findPlayer(USER,n); if(!p) return; p.listed=!p.listed; closeModal(); showProfile(USER,n); render(); }
function setAutoRest(v){ fm().autoRest=!!v; render(); }
// release a player: he leaves now, the club pays half of what's left on his deal
function releasePlayer(n){
  const p=findPlayer(USER,n); if(!p) return;
  const r=K.ROSTERS[USER];
  if(p.type==='B' && r.batters.filter(x=>!K.isInjured(x)).length<=10){ notify('타자가 부족해 방출할 수 없습니다 (최소 10명).'); return; }
  if(p.type==='P' && r.pitchers.filter(x=>!K.isInjured(x)).length<=8){ notify('투수가 부족해 방출할 수 없습니다 (최소 8명).'); return; }
  const cost=Math.round(p.sal*Math.max(1,p.yrs)*0.5*10)/10;
  ask(`${n}을(를) 방출합니다. 잔여 계약의 절반인 ${cost}억 원을 위약금으로 지급합니다.`, '방출', ()=>doRelease(p,n,cost));
}
function doRelease(p,n,cost){
  const r=K.ROSTERS[USER];
  if(p.type==='B') r.batters=r.batters.filter(x=>x!==p); else r.pitchers=r.pitchers.filter(x=>x!==p);
  const f=fm(); f.fin.balance-=cost; f.fin.exp+=cost;
  f.promises=f.promises.filter(pr=>pr.n!==n); f.restNext=f.restNext.filter(x=>x!==n);
  const c=state.cfgs[USER];
  if(c.lineup.indexOf(n)>=0||c.rotation.indexOf(n)>=0||c.bullpen.indexOf(n)>=0||c.closer===n){
    const d=K.defaultLineup(USER); state.cfgs[USER]={teamId:USER,lineup:d.lineup.slice(),positions:d.positions.slice(),rotation:d.rotation.slice(),bullpen:d.bullpen.slice(),closer:d.closer};
  }
  send('단장','📤',`${n} 방출`,`${n}을(를) 방출했습니다. 위약금 ${cost}억 원이 지급되었습니다.${c.lineup.indexOf(n)>=0?'\n라인업이 자동 재구성되었습니다.':''}`,[]);
  closeModal(); render();
}

// ---------- UI: shared bits ----------
function condBar(p){
  const c=Math.round(K.cond(p)), col=c>=85?'var(--good)':c>=70?'#9fd26b':c>=55?'var(--warn)':'var(--bad)';
  return `<span title="컨디션 ${c}%" style="display:inline-flex;align-items:center;gap:4px"><span class="bar" style="width:36px"><i style="width:${c}%;background:${col}"></i></span><span style="font-size:11px;color:${col}">${c}</span></span>`;
}
function statusCells(p){
  return `<td>${K.isInjured(p)?`<span class="pill" style="background:rgba(224,85,106,.2);color:var(--bad)" title="부상 ${p.inj}경기">🩹${p.inj}</span>`:condBar(p)}</td>`+
    `<td title="사기: ${moraleLabel(K.mor(p))}">${moraleFace(K.mor(p))}</td>`;
}
function statusInline(p){
  if(K.isInjured(p)) return `<span class="pill" style="background:rgba(224,85,106,.2);color:var(--bad)">🩹부상 ${p.inj}</span>`;
  return `${condBar(p)} ${moraleFace(K.mor(p))}${fm()&&fm().restNext.indexOf(p.n)>=0?' <span class="pill pos">휴식예정</span>':''}`;
}
function attrNum(v){ const a=attr20(v); return `<b style="color:${attrColor(a)}">${a}</b>`; }
function tabBadge(id){
  if(id==='inbox'){ const u=unread(); return u? ` <span class="pill" style="background:var(--accent2);color:#222">${u}</span>` : ''; }
  return '';
}

// ---------- UI: inbox ----------
let selMsg=null, inboxFilter='all';
function openMsg(id){ selMsg=id; const m=fm().inbox.find(x=>x.id===id); if(m) m.read=true; render(); }
function markAllRead(){ fm().inbox.forEach(m=>m.read=true); render(); }
function setInboxFilter(f){ inboxFilter=f; render(); }
function renderInbox(){
  ensure();
  const f=fm();
  let list=f.inbox;
  if(inboxFilter==='unread') list=list.filter(m=>!m.read);
  if(inboxFilter==='action') list=list.filter(m=>!m.done&&m.actions.length);
  if(selMsg==null && list.length) selMsg=list[0].id;
  const sel=f.inbox.find(m=>m.id===selMsg);
  if(sel&&!sel.read) sel.read=true;
  const items=list.map(m=>`<div onclick="FM.openMsg(${m.id})" style="padding:9px 10px;border-bottom:1px solid var(--line);cursor:pointer;${m.id===selMsg?'background:var(--panel2);':''}${m.read?'':'font-weight:700;'}">
      <div class="row" style="gap:6px;flex-wrap:nowrap"><span>${m.icon}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.subject)}</span>
      ${!m.done&&m.actions.length?'<span class="pill" style="background:rgba(240,160,32,.2);color:var(--warn)">결정</span>':''}</div>
      <div class="muted" style="font-size:11px;margin-top:2px">${esc(m.from)} · ${m.year} · ${m.ug}경기차</div></div>`).join('') || '<div class="muted" style="padding:12px">메시지가 없습니다.</div>';
  const detail = sel? `<div class="muted" style="font-size:12px">${sel.icon} ${esc(sel.from)} · ${sel.year} 시즌 ${sel.ug}경기차</div>
      <h3 style="margin:6px 0 12px;font-size:17px">${esc(sel.subject)}</h3>
      <div style="white-space:pre-wrap;line-height:1.7">${esc(sel.body)}</div>
      ${sel.actions.length? (sel.done? `<div class="deal-result deal-ok" style="margin-top:14px">${esc(sel.result||'처리됨')}</div>`
        : `<div class="row" style="margin-top:16px;gap:8px">${sel.actions.map((a,i)=>`<button class="btn ${i===0?'primary':''}" onclick="FM.act(${sel.id},${i})">${esc(a.label)}</button>`).join('')}</div>`) : ''}`
    : '<div class="muted">메시지를 선택하세요.</div>';
  const ft=(id,l)=>`<button class="${inboxFilter===id?'active':''}" onclick="FM.setInboxFilter('${id}')">${l}</button>`;
  return `<div class="grid" style="grid-template-columns:minmax(260px,360px) 1fr;gap:14px" id="inboxgrid">
    <div class="card" style="padding:10px"><h3>📥 받은편지함 <span class="tag"><a href="javascript:void(0)" onclick="FM.markAllRead()" style="color:var(--dim)">모두 읽음</a></span></h3>
      <div class="tabsm">${ft('all','전체')}${ft('unread','안 읽음 '+unread())}${ft('action','결정 필요 '+pending())}</div>
      <div style="max-height:620px;overflow:auto">${items}</div></div>
    <div class="card">${detail}</div></div>
    <style>@media(max-width:820px){#inboxgrid{grid-template-columns:1fr!important}}</style>`;
}

// ---------- UI: dashboard cards ----------
function dashCards(){
  ensure();
  const f=fm(), b=f.board, s=boardStatus();
  const latest=f.inbox.filter(m=>!m.read||(!m.done&&m.actions.length)).slice(0,4);
  const inj=allPlayers(USER).filter(K.isInjured), tired=allPlayers(USER).filter(p=>!K.isInjured(p)&&K.cond(p)<60), sad=allPlayers(USER).filter(p=>K.mor(p)<35);
  const confCol=b.conf>=60?'var(--good)':b.conf>=35?'var(--warn)':'var(--bad)';
  return `<div class="grid cols3" style="margin-top:14px">
    <div class="card"><h3>📥 받은편지함 <span class="tag">${unread()}개 안 읽음</span></h3>
      ${latest.length? latest.map(m=>`<div class="row" style="justify-content:space-between;border-bottom:1px solid var(--line);padding:6px 0;cursor:pointer;flex-wrap:nowrap" onclick="App.tab('inbox');FM.openMsg(${m.id})">
        <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.icon} ${esc(m.subject)}</span>${!m.done&&m.actions.length?'<span class="pill" style="background:rgba(240,160,32,.2);color:var(--warn)">결정</span>':''}</div>`).join('') : '<div class="muted">새 메시지가 없습니다.</div>'}
      <button class="btn" style="margin-top:10px" onclick="App.tab('inbox')">받은편지함 열기</button></div>
    <div class="card"><h3>🏛 이사회 <span class="tag">${esc(b.expect.label)}</span></h3>
      <div class="row" style="justify-content:space-between"><span>신뢰도</span><b style="color:${confCol}">${b.conf} · ${confLabel(b.conf)}</b></div>
      <div class="progress"><i style="width:${b.conf}%;background:${confCol}"></i></div>
      <div class="muted" style="margin-top:8px">현재 ${s.rank}위 · ${s.met?'✅ 목표 달성 페이스':'⚠️ 목표 미달 페이스'}</div>
      <div class="muted" style="margin-top:4px">잔고 ${f.fin.balance.toFixed(1)}억 · 연봉 ${payroll(USER)}/${f.fin.budget}억</div></div>
    <div class="card"><h3>🩺 선수단 상태 <span class="tag">사기 ${moraleFace(avgMorale(USER))} ${moraleLabel(avgMorale(USER))}</span></h3>
      <div>🩹 부상 ${inj.length}명${inj.length?': '+inj.map(p=>`${p.n}(${p.inj})`).join(', '):''}</div>
      <div style="margin-top:4px">🥵 피로 ${tired.length}명${tired.length?': '+tired.map(p=>p.n).join(', '):''}</div>
      <div style="margin-top:4px">😠 불만 ${sad.length}명${sad.length?': '+sad.map(p=>p.n).join(', '):''}</div>
      <div class="row" style="margin-top:10px"><button class="btn" ${meetingReady()?'':'disabled'} onclick="FM.teamMeeting()">📣 팀 미팅</button>
        <span class="hint">${meetingReady()?'10경기에 한 번':`${10-(userGamesPlayed()-f.lastMeeting)}경기 후 가능`}</span></div></div>
  </div>`;
}

// ---------- UI: lineup tab card (rest policy) ----------
function lineupCard(){
  ensure();
  const f=fm();
  return `<div class="card" style="margin-top:14px"><h3>🩺 휴식 관리 <span class="tag">FM 스타일</span></h3>
    <label class="row" style="gap:8px;cursor:pointer"><input type="checkbox" ${f.autoRest?'checked':''} onchange="FM.setAutoRest(this.checked)">
      코칭스태프에게 휴식 관리 맡기기 (컨디션 70% 미만 선수 자동 휴식, 부상자 자동 제외)</label>
    <div class="hint" style="margin-top:6px">끄면 지친 선수도 그대로 출전합니다. 대신 수석코치가 받은편지함으로 경고를 보냅니다. 부상자는 항상 제외됩니다.
      선수 프로필에서 "다음 경기 휴식"을 직접 지정할 수도 있습니다.${f.restNext.length?`<br>다음 경기 휴식 예정: <b>${f.restNext.join(', ')}</b>`:''}</div></div>`;
}

// ---------- UI: club tab (board, finances, contracts) ----------
function renderClub(){
  ensure();
  const f=fm(), b=f.board, s=boardStatus(), pay=payroll(USER);
  const confCol=b.conf>=60?'var(--good)':b.conf>=35?'var(--warn)':'var(--bad)';
  const avgAtt=f.fin.homeGames? Math.round(f.fin.attTotal/f.fin.homeGames) : 0;
  const rows=allPlayers(USER).slice().sort((a,b)=>b.sal-a.sal).map(p=>`<tr${p.expiring?' style="background:rgba(240,160,32,.1)"':''}>
    <td class="name">${pname(USER,p.n)}${p.listed?' <span class="pill pos">트레이드 리스트</span>':''}${p.rookie?' <span class="pill pos">신인</span>':''}</td>
    <td><span class="pill pos">${p.pos||p.role}</span></td><td>${p.age}</td><td><span class="ovr ${ovrClass(K.ovr(p))}">${K.ovr(p)}</span></td>
    <td><b>${p.sal}</b>억</td><td>${p.expiring?'<b style="color:var(--warn)">만료</b>':p.yrs+'년'}</td><td>${marketValue(p)}억</td><td>${moraleFace(K.mor(p))}</td></tr>`).join('');
  return `<div class="grid cols2">
    <div class="card"><h3>🏛 이사회 <span class="tag">${state.year} 시즌</span></h3>
      <div class="kpi">
        <div class="k"><div class="v" style="color:${confCol}">${b.conf}</div><div class="l">이사회 신뢰도 · ${confLabel(b.conf)}</div></div>
        <div class="k"><div class="v">${s.rank}위</div><div class="l">현재 순위 (전력 평가 ${b.strengthRank}위)</div></div></div>
      <div style="margin-top:12px">시즌 목표: <b>${esc(b.expect.label)}</b> ${s.met?'<span class="win">✅ 달성 중</span>':'<span style="color:var(--bad)">⚠️ 미달</span>'}</div>
      <div class="progress"><i style="width:${b.conf}%;background:${confCol}"></i></div>
      <div class="hint" style="margin-top:8px">12경기마다 이사회 평가가 받은편지함으로 옵니다. 시즌 종료 시 신뢰도가 15 미만이면 경질됩니다.</div>
      <div class="row" style="margin-top:10px"><button class="btn" ${meetingReady()?'':'disabled'} onclick="FM.teamMeeting()">📣 팀 미팅</button></div></div>
    <div class="card"><h3>💰 재정</h3>
      <div class="kpi">
        <div class="k"><div class="v" style="color:${f.fin.balance>=0?'var(--good)':'var(--bad)'}">${f.fin.balance.toFixed(1)}억</div><div class="l">구단 잔고</div></div>
        <div class="k"><div class="v">${avgAtt? avgAtt.toLocaleString():'-'}</div><div class="l">평균 관중 (홈 ${f.fin.homeGames}경기)</div></div></div>
      <div style="margin-top:12px">연봉 총액 <b>${pay}억</b> / 예산 ${f.fin.budget}억 <span class="muted">(트레이드 한도 ${(f.fin.budget*1.1).toFixed(1)}억)</span></div>
      <div class="progress"><i style="width:${Math.min(100,pay/f.fin.budget/1.1*100)}%;background:${pay>f.fin.budget?'var(--warn)':'var(--good)'}"></i></div>
      <div class="muted" style="margin-top:8px">이번 시즌 수입 ${f.fin.rev.toFixed(1)}억 · 지출 ${f.fin.exp.toFixed(1)}억</div>
      <div class="hint" style="margin-top:6px">홈 관중 수입은 승률과 선수단 사기에 따라 달라집니다.</div></div>
  </div>
  ${marketCards()}
  <div class="card" style="margin-top:14px"><h3>📝 계약 현황 <span class="tag">연봉순 · 만료 선수는 시즌 종료 후 협상</span></h3>
    <table><thead><tr><th class="name">선수</th><th>POS</th><th>나이</th><th>OVR</th><th>연봉</th><th>잔여</th><th>시장가치</th><th>사기</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function marketCards(){
  const f=fm(), out=[];
  const pRow=(p,extra,btn)=>`<tr><td class="name">${esc(p.n)}${p.f?' <span class="pill pos">외국인</span>':''}</td><td><span class="pill pos">${p.pos||p.role}</span></td><td>${p.age}</td>
    <td><span class="ovr ${ovrClass(K.ovr(p))}">${K.ovr(p)}</span></td><td>${p.type==='B'?`컨${attrNum(p.con)} 파${attrNum(p.pow)} 선${attrNum(p.eye)} 수${attrNum(p.fld)}`:`구${attrNum(p.stu)} 제${attrNum(p.ctl)} 무${attrNum(p.mov)} 체${attrNum(p.sta)}`}</td><td>${extra}</td><td>${btn}</td></tr>`;
  if((f.fa||[]).length){
    const list=f.fa.map((x,i)=>({x,i})).sort((a,b)=>K.ovr(b.x.p)-K.ovr(a.x.p));
    out.push(`<div class="card" style="margin-top:14px"><h3>🆓 FA 시장 <span class="tag">다음 시즌 시작 전까지 · 계약금 = 연봉×연수×25%</span></h3>
      <div style="overflow-x:auto"><table><thead><tr><th class="name">선수</th><th>POS</th><th>나이</th><th>OVR</th><th>능력</th><th>요구 조건</th><th></th></tr></thead><tbody>
      ${list.map(({x,i})=>pRow(x.p, `${x.yrs}년 ${x.ask}억 <span class="muted">(전 ${esc(x.from)})</span>`, `<button class="btn" onclick="FM.signFA(${i})">계약</button>`)).join('')}</tbody></table></div></div>`);
  }
  const mine=foreignOf(USER), open=fxWindowOpen(), left=fxSwapsLeft();
  out.push(`<div class="card" style="margin-top:14px"><h3>🌏 외국인 선수 <span class="tag">${mine.length}/${FX_MAX}명${mine.length>FX_MAX?' (실제 기록의 대체 선수 포함 · 영입 시 1명 방출)':''} · 교체 ${Math.max(0,left)}회 남음 · 108경기 전까지</span></h3>
    <div class="muted" style="margin-bottom:8px">현재: ${mine.map(p=>`${esc(p.n)}(${p.pos||p.role}·${K.ovr(p)}·${p.sal}억)`).join(', ')||'없음'}</div>
    ${open&&left>0? `<div style="overflow-x:auto"><table><thead><tr><th class="name">후보</th><th>POS</th><th>나이</th><th>OVR</th><th>능력</th><th>연봉</th><th></th></tr></thead><tbody>
      ${scoutList().map((p,i)=>pRow(p, `${p.sal}억`, `<button class="btn" onclick="FM.fxPick(${i})">영입</button>`)).join('')}</tbody></table></div>
      <div class="hint" style="margin-top:6px">스카우트 후보는 20경기마다 바뀝니다. 영입 시 연봉의 20% 계약금, 방출 선수는 연봉 절반을 위약금으로 냅니다.</div>`
    : `<div class="hint">${!open?'지금은 외국인 선수를 교체할 수 없습니다 (정규시즌 108경기 전까지).':'이번 시즌 교체 횟수를 모두 썼습니다.'}</div>`}</div>`);
  return out.join('');
}

// ---------- UI: FM-style player profile ----------
function radar(vals, labels, color){
  const n=vals.length, cx=90, cy=90, R=66;
  const pt=(i,r)=>{ const a=-Math.PI/2+i*2*Math.PI/n; return [cx+Math.cos(a)*r, cy+Math.sin(a)*r]; };
  const ring=f=>vals.map((_,i)=>pt(i,R*f).join(',')).join(' ');
  const poly=vals.map((v,i)=>pt(i,R*v/20).join(',')).join(' ');
  const lbl=labels.map((l,i)=>{ const [x,y]=pt(i,R+14); return `<text x="${x}" y="${y}" fill="var(--dim)" font-size="10" text-anchor="middle" dominant-baseline="middle">${l}</text>`; }).join('');
  return `<svg viewBox="0 0 180 180" width="180" height="180" style="max-width:100%">
    ${[0.25,0.5,0.75,1].map(f=>`<polygon points="${ring(f)}" fill="none" stroke="var(--line)"/>`).join('')}
    <polygon points="${poly}" fill="${color}" fill-opacity=".28" stroke="${color}" stroke-width="2"/>${lbl}</svg>`;
}
function posStars(p){
  if(p.type!=='B') return `<span class="pill pos">${posFull(p.role)} ★★★</span>`;
  return ['C','1B','2B','3B','SS','LF','CF','RF','DH'].map(x=>{
    const fit=K.posFit(p,x), s = x===p.pos?3 : x==='DH'?2 : fit<=6?2 : 1;
    return `<span class="pill" style="background:${s===3?'rgba(54,194,117,.25)':s===2?'rgba(127,208,255,.15)':'var(--panel2)'};color:${s===3?'var(--good)':s===2?'#7fd0ff':'var(--dim)'}">${x} ${'★'.repeat(s)}</span>`;
  }).join(' ');
}
function attrRow(label,v){ const a=attr20(v); return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 10px;background:var(--panel2);border-radius:6px;margin-bottom:5px"><span>${label}</span><b style="color:${attrColor(a)};font-size:16px">${a}</b></div>`; }
function showProfile(team,name){
  ensure();
  team = team && K.ROSTERS[team] && findPlayer(team,name) ? team : findTeamOf(name);
  if(!team) return;
  const p=findPlayer(team,name); if(!p) return;
  const o=K.ovr(p), isB=p.type==='B', mine=team===USER;
  const s = isB ? state.season[team].bat[name] : state.season[team].pit[name];
  const rt=ratingsOf(team,name);
  const avgRt = rt&&rt.cnt? (rt.sum/rt.cnt).toFixed(2) : '-';
  const attrs = isB
    ? `<div class="grid cols2" style="gap:14px"><div><div class="muted" style="font-weight:700;margin-bottom:6px">타격</div>${attrRow('컨택',p.con)}${attrRow('파워',p.pow)}${attrRow('선구안',p.eye)}</div>
       <div><div class="muted" style="font-weight:700;margin-bottom:6px">주루 · 수비</div>${attrRow('주력',p.spd)}${attrRow('수비',p.fld)}${attrRow('송구',p.arm)}</div></div>`
    : `<div class="grid cols2" style="gap:14px"><div><div class="muted" style="font-weight:700;margin-bottom:6px">구질</div>${attrRow('구위',p.stu)}${attrRow('무브먼트',p.mov)}</div>
       <div><div class="muted" style="font-weight:700;margin-bottom:6px">제구 · 체력</div>${attrRow('제구',p.ctl)}${attrRow('체력',p.sta)}</div></div>`;
  const rad = isB ? radar([p.con,p.pow,p.eye,p.spd,p.fld,p.arm].map(attr20),['컨택','파워','선구','주력','수비','송구'],ratColor(o))
                  : radar([p.stu,p.mov,p.ctl,p.sta].map(attr20),['구위','무브','제구','체력'],ratColor(o));
  const statLine = isB
    ? ((s&&s.AB>0)? `<div class="kpi"><div class="k"><div class="v">${fmtAvg(s.H/s.AB)}</div><div class="l">타율</div></div><div class="k"><div class="v">${s.HR}</div><div class="l">홈런</div></div><div class="k"><div class="v">${s.RBI}</div><div class="l">타점</div></div><div class="k"><div class="v">${fmtAvg((s.H+s.BB+s.HBP)/(s.AB+s.BB+s.HBP))}</div><div class="l">출루율</div></div><div class="k"><div class="v">${s.G}</div><div class="l">경기</div></div></div>` : '<div class="muted">이번 시즌 출전 기록 없음</div>')
    : ((s&&s.G>0)? `<div class="kpi"><div class="k"><div class="v">${fmtEra(s.ER,s.OUT)}</div><div class="l">평균자책</div></div><div class="k"><div class="v">${s.W}-${s.L}</div><div class="l">승-패</div></div><div class="k"><div class="v">${s.SV}</div><div class="l">세이브</div></div><div class="k"><div class="v">${ipStr(s.OUT)}</div><div class="l">이닝</div></div><div class="k"><div class="v">${s.SO}</div><div class="l">탈삼진</div></div></div>` : '<div class="muted">이번 시즌 등판 기록 없음</div>');
  const form = rt&&rt.last.length? rt.last.map(r=>`<span class="pill" style="background:${rtColor(r)}33;color:${rtColor(r)};font-size:13px">${r.toFixed(1)}</span>`).join(' ') : '<span class="muted">기록 없음</span>';
  const c=Math.round(K.cond(p));
  const resting=mine&&fm().restNext.indexOf(name)>=0;
  const actions = mine? `<div class="row" style="margin-top:14px;gap:6px">
      <button class="btn" onclick="FM.talk('${q(name)}','praise')">👏 칭찬하기</button>
      <button class="btn" onclick="FM.talk('${q(name)}','scold')">😤 질책하기</button>
      <button class="btn" onclick="FM.toggleRest('${q(name)}')">${resting?'↩ 휴식 취소':'🛌 다음 경기 휴식'}</button>
      <button class="btn" onclick="FM.toggleList('${q(name)}')">${p.listed?'📋 트레이드 리스트 해제':'📋 트레이드 리스트 등록'}</button>
      <button class="btn" onclick="FM.releasePlayer('${q(name)}')">📤 방출</button></div>` : '';
  modal(`<span class="closeX" onclick="App.closeModal()">×</span>
    <div class="row" style="align-items:center;gap:16px;flex-wrap:wrap">
      <div style="width:64px;height:64px;border-radius:50%;background:conic-gradient(${ratColor(o)} ${o}%, var(--panel2) 0);display:flex;align-items:center;justify-content:center">
        <div style="width:52px;height:52px;border-radius:50%;background:var(--panel);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:${ratColor(o)}">${o}</div></div>
      <div style="flex:1;min-width:200px"><h2 style="margin:0">${esc(name)}${p.rookie?' <span class="pill pos">신인</span>':''}</h2>
        <div class="muted">${teamDot(team)} ${K.ROSTERS[team].name} · ${p.age}세 · ${posFull(p.pos||p.role)}</div>
        <div class="muted" style="font-size:12px;margin-top:2px">성격: <b style="color:var(--txt)">${pers(p).k}</b> — ${pers(p).d}</div></div>
    </div>
    <div class="kpi" style="margin:14px 0">
      <div class="k"><div class="v" style="font-size:18px">${K.isInjured(p)?`🩹 ${p.inj}경기`:c+'%'}</div><div class="l">${K.isInjured(p)?'부상 결장':'컨디션'}</div></div>
      <div class="k"><div class="v" style="font-size:18px">${moraleFace(K.mor(p))} ${moraleLabel(K.mor(p))}</div><div class="l">사기</div></div>
      <div class="k"><div class="v" style="font-size:18px">${p.sal}억 · ${p.expiring?'만료':p.yrs+'년'}</div><div class="l">연봉 · 계약</div></div>
      <div class="k"><div class="v" style="font-size:18px">${marketValue(p)}억</div><div class="l">시장 가치</div></div>
      <div class="k"><div class="v" style="font-size:18px">${avgRt}</div><div class="l">평균 평점</div></div></div>
    <div class="grid" style="grid-template-columns:1fr auto;gap:14px;align-items:start" id="profgrid">
      <div>${attrs}<div class="hint">능력치 1~20 (FM 스케일) · 16+ 최상급, 11~15 준수, 6~10 평범, 5 이하 약점</div></div>
      <div style="text-align:center">${rad}</div></div>
    <style>@media(max-width:640px){#profgrid{grid-template-columns:1fr!important}}</style>
    <div class="muted" style="font-weight:700;margin:12px 0 6px">포지션 적합도</div><div class="row" style="gap:4px">${posStars(p)}</div>
    <div class="muted" style="font-weight:700;margin:14px 0 6px">최근 5경기 평점</div><div class="row" style="gap:4px">${form}</div>
    <div class="muted" style="font-weight:700;margin:14px 0 6px">${state.year} 시즌 성적</div>${statLine}
    ${actions}`);
}

window.FM={ notify, ask, answer, esc, applyTheme, teamPitch, showSetup, setupPick, setupBg, setupName, setupStart, onCareerStart, ensure, prepareCfg, afterGame, previewNote, onSeasonEnd, maybeShowFired, offseasonMoves, onNewSeason, confirmNextSeason,
  tradeBudget, doTrade, payroll, renderInbox, renderClub, dashCards, lineupCard, statusCells, statusInline, attrNum, tabBadge,
  showProfile, openMsg, markAllRead, setInboxFilter, act, teamMeeting, meeting, talk, toggleRest, toggleList, setAutoRest, releasePlayer,
  newCareer, lastChance, onRegularSeasonEnd, psSeriesMessage, psSeriesResult, afterPsGame, takeJob, signFA, fxPick, fxSign, attr20 };
})();
