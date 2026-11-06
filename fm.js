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
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
function payroll(t){ return Math.round(allPlayers(t).concat(K.ROSTERS[t].farm||[]).reduce((a,p)=>a+(p.sal||0),0)*10)/10; }

// ---------- names for rookies / call-ups ----------
const SUR=['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','류','홍','전','고','문','양','손'];
const SYL=['민','준','서','현','우','진','호','성','재','영','지','훈','동','태','승','하','도','윤','건','혁','수','찬','규','원','석','빈','율','온','결','형'];
function allNames(){ const s=new Set(); K.TEAM_IDS.forEach(t=>allPlayers(t).concat(K.ROSTERS[t].farm||[]).forEach(p=>s.add(p.n)));
  const d=state&&state.fm&&state.fm.draft; if(d) d.pool.concat(...Object.values(d.picks)).forEach(p=>s.add(p.n)); return s; }
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
  if(p.pot==null){ const h=hash(p.n+'p'), o=K.ovr(p);
    const room=p.age<=21? 8+h%18 : p.age<=24? 5+h%14 : p.age<=27? 2+h%9 : p.age<=30? h%4 : 0;
    p.pot=Math.max(o,Math.min(96,o+room)); }
}
// aging: snapshot a player, then undo any gain that carried him past his potential
const ATTRS={B:['con','pow','eye','spd','fld','arm'],P:['stu','ctl','mov','sta']};
function snap(p){ const o={_ovr:K.ovr(p)}; ATTRS[p.type].forEach(k=>o[k]=p[k]); return o; }
function capPot(p,before){
  if(!p.pot || K.ovr(p)<=Math.max(p.pot,before._ovr)) return;
  ATTRS[p.type].forEach(k=>{ if(p[k]>before[k]) p[k]=before[k]; });
}
function ensurePlayers(){ K.TEAM_IDS.forEach(t=>allPlayers(t).concat(K.ROSTERS[t].farm||[]).forEach(ensurePlayer)); }
function ensure(){
  if(!state) return;
  ensurePlayers();
  if(!state.user) state.user={name:'무명', team:USER, bg:'coach'}; // saves from before the setup screen
  if(!state.fm){
    state.fm={ inbox:[], nextId:1, autoRest:true, restNext:[], promises:[], lastMeeting:-99,
      lastWarn:-99, lastOffer:-99, lastTalk:{}, rt:{}, board:null, fin:null, fired:false, lastChance:false };
    seasonStart(true);
  }
  if(!state.fm.farmV){ K.TEAM_IDS.forEach(seedFarm); state.fm.farmV=1; }
  if(!state.fm.farmPayV){ const fin=state.fm.fin; if(fin) fin.budget=Math.round(fin.budget+farmOf(USER).reduce((a,p)=>a+(p.sal||0),0)*1.06); state.fm.farmPayV=1; }
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
    const why=doTrade(a.team,[a.want],[a.give]); if(why) return '❌ '+why;
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
  interview(m,a){ return interviewAnswer(a); },
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
function applyTheme(t){ document.documentElement.style.setProperty('--accent', TEAM_ACCENT[t]||'#ea0029'); document.documentElement.dataset.team=t; }
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
  seedFAs();
  send('단장','🔥',`${state.year} 스토브리그가 시작됐습니다`, `개막까지 준비할 시간이 있습니다.\n\n• FA 시장과 외국인 선수 후보는 구단 탭에서\n• 트레이드는 트레이드 탭에서\n• 팀 기본 전술은 라인업 탭에서\n• 전지훈련 방향을 정하면 스프링캠프 → 시범경기 ${SPRING_GAMES}경기 → 정규시즌 개막 순서로 진행됩니다.`, []);
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
  const f=farmOf(t);
  const off=entryCount(t)>=ENTRY_MAX? clearSpot(t,type) : null;
  let p=f.filter(x=>x.type===type&&!K.isInjured(x)&&!(t===USER&&downLeft(x)))
    .filter(x=>x!==off).sort((a,b)=>(pos? (b.role===pos)-(a.role===pos) : 0) || K.ovr(b)-K.ovr(a))[0];
  if(p) doPromote(t,p);
  else { p=makeRookie(type,pos); ensurePlayer(p); if(type==='B') K.ROSTERS[t].batters.push(p); else K.ROSTERS[t].pitchers.push(p); }
  if(t===USER){ const fl=futLine(p); send('2군 감독','🧢',`${p.n} 1군 콜업`,
    `부상자가 많아 2군에서 ${p.n}(${p.age}세, ${posFull(p.pos||p.role)}, OVR ${K.ovr(p)})을(를) 올렸습니다.${fl? '\n'+fl : ''}` +
    (off? `\n엔트리 ${ENTRY_MAX}명을 지키려고 부상 중인 ${off.n}을(를) 말소했습니다.` : ''), []); }
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
  const extra=isUser? {tacFam:execTable(), scoutKnow:knowTable()} : {};
  return K.restAdjust(team, Object.assign({}, cfg, extra, {rotation: state.cfgs[team].rotation, bullpen:(cfg.bullpen||[]).concat(extraRP)}), opts);
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
    tacticsAfterGame(res);
    financeGame(res.home===USER);
    checkPromises(res, ug);
    checkUnhappy(ug);
    checkFatigueWarning(ug);
    checkStreak();
    maybeTradeOffer(ug);
    coachReport(ug);
    maybeMedia(ug);
    checkForeignForm(ug);
    if(state.phase==='regular'){
      // a Futures hiccup must never undo the 1군 game that was just recorded
      try{ farmGame(); }catch(e){ console.error('Futures game skipped', e); }
      leagueCalendar();
      if(ug%TR_EVERY===0) trainingTick();
      if(ug%TR_REPORT===0) trainingReport();
      if(ug%24===0) farmReport();
    }
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
  const f=fm(), w=tradeWindow(); if(state.phase!=='regular' || !w.open) return;
  // offers pick up in the last two weeks before the deadline
  const rush=w.daysLeft!=null&&w.daysLeft<=14;
  if(ug-f.lastOffer<(rush?3:10) || Math.random()>(rush?0.3:0.08)) return;
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
// can both clubs still field a legal 1군 after the swap? Checked when the deal is offered and
// again when it runs, since a player may have been sent down or released in between.
function tradeCheck(team, fromUser, fromThem){
  const w=tradeWindow(); if(!w.open) return w.msg;
  if(!fromUser.length || !fromThem.length) return '양쪽 모두 선수를 한 명 이상 골라야 합니다.';
  const on=(t,n)=>allPlayers(t).find(x=>x.n===n);
  const gone=fromUser.filter(n=>!on(USER,n)).concat(fromThem.filter(n=>!on(team,n)));
  if(gone.length) return `${gone.join(', ')}은(는) 지금 1군에 없어 트레이드할 수 없습니다.`;
  const outP=fromUser.map(n=>on(USER,n)), inP=fromThem.map(n=>on(team,n));
  return entryProblem(USER,outP,inP,'우리 팀 ') || entryProblem(team,inP,outP,`${K.ROSTERS[team].name} `);
}
function doTrade(team, fromUser, fromThem){
  const why=tradeCheck(team, fromUser, fromThem); if(why) return why;
  function move(srcT,dstT,name){
    const r=K.ROSTERS[srcT]; let i=r.batters.findIndex(x=>x.n===name);
    if(i>=0){ const p=r.batters.splice(i,1)[0]; p.listed=false; p.bench=0; if(dstT===USER) p.newG=NEW_GAMES; K.ROSTERS[dstT].batters.push(p); return; }
    i=r.pitchers.findIndex(x=>x.n===name);
    if(i>=0){ const p=r.pitchers.splice(i,1)[0]; p.listed=false; if(dstT===USER) p.newG=NEW_GAMES; K.ROSTERS[dstT].pitchers.push(p); }
  }
  fromUser.forEach(n=>move(USER,team,n));
  fromThem.forEach(n=>move(team,USER,n));
  fm().promises=fm().promises.filter(pr=>!!findPlayer(USER,pr.n));
  [USER,team].forEach(t=>{ const d=K.defaultLineup(t); state.cfgs[t]={teamId:t,lineup:d.lineup.slice(),positions:d.positions.slice(),rotation:d.rotation.slice(),bullpen:d.bullpen.slice(),closer:d.closer}; });
  return '';
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
    p.sal=x.ask; p.yrs=x.yrs; p.mor=72; p.cond=100; p.inj=0; p.listed=false; p.bench=0; p.newG=NEW_GAMES;
    const where=joinClub(USER,p);
    f.fin.balance-=bonus; f.fin.exp+=bonus;
    send('단장','✍️',`FA ${p.n} 영입`, `${p.n}과(와) ${x.yrs}년 연봉 ${x.ask}억 원에 계약했습니다. 계약금 ${bonus}억 원.` +
      (where==='2군'? `\n1군 엔트리(${ENTRY_MAX}명)가 가득 차 2군에 등록했습니다.` : ''), []);
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
function foreignOf(t){ return allPlayers(t).concat(farmOf(t)).filter(p=>p.f); }
// `used` is shared across one batch of candidates so two of them never get the same name
function makeForeign(type, used){
  used=used||allNames(); let n=FX_NAMES.find(x=>!used.has(x)&&Math.random()<0.3)||FX_NAMES.find(x=>!used.has(x));
  for(let i=0;!n||used.has(n);i++) n='외국인'+R(10,99)+(i>50?i:'');
  used.add(n);
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
  if(!f.scout || f.scout.year!==state.year || ug-f.scout.ug>=20) { const used=allNames(); (f.fa||[]).forEach(x=>used.add(x.p.n));
    f.scout={year:state.year, ug, list:['P','P','B','B'].map(t=>makeForeign(t,used))}; }
  return f.scout.list;
}
function fxWindowOpen(){ return state.phase==='stove' || (state.phase==='regular' && userGamesPlayed()<108); }
function fxSwapsLeft(){ const f=fm(); return FX_SWAPS-((f.fxSwaps&&f.fxSwaps.year===state.year)?f.fxSwaps.n:0); }
function fxPick(i){
  const cand=scoutList()[i]; if(!cand) return;
  if(!fxWindowOpen()){ notify('외국인 선수 교체는 스토브리그와 정규시즌 108경기 전까지만 가능합니다.'); return; }
  if(state.phase==='regular' && fxSwapsLeft()<=0){ notify('이번 시즌 외국인 선수 교체 횟수(2회)를 모두 썼습니다.'); return; }
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
  if(allNames().has(cand.n)){ notify(`같은 이름의 선수(${cand.n})가 이미 리그에 있습니다. 다른 후보를 고르세요.`); return; }
  const r=K.ROSTERS[USER], onEntry=!!out && allPlayers(USER).indexOf(out)>=0;
  const room=entryCount(USER)-(onEntry?1:0)<ENTRY_MAX;
  const why=entryProblem(USER, onEntry?[out]:[], room?[cand]:[]); if(why){ notify(why); return; }
  if(out){ if(out.type==='B') r.batters=r.batters.filter(x=>x!==out); else r.pitchers=r.pitchers.filter(x=>x!==out); r.farm=farmOf(USER).filter(x=>x!==out); }
  cand.newG=NEW_GAMES; joinClub(USER,cand);
  f.scout.list.splice(i,1);
  f.fxSwaps={year:state.year, n:(f.fxSwaps&&f.fxSwaps.year===state.year?f.fxSwaps.n:0)+(out&&state.phase==='regular'?1:0)};
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
  openDraft();
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
  if(res.home===USER||res.away===USER) tacticsAfterGame(res);
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

// ---------- tactics (team defaults on the lineup tab, per-game on the preview) ----------
const TAC_NAMES={atk:'타격 성향', run:'주루', bunt:'희생번트', teamBat:'팀배팅', shift:'수비 시프트', bat:'배터리 볼배합', ibb:'고의4구', hook:'투수 교체'};
const TAC_HELP={
  atk:{normal:'상황에 맞게', aggr:'볼넷↓ 삼진↓ 장타↑ — 제구 좋은 투수 상대로', patient:'볼넷↑ 투구수↑ 삼진↑ — 선발을 일찍 끌어내린다'},
  run:{normal:'발 빠른 주자만 도루', aggr:'도루 시도↑ 병살↓, 성공률은 조금↓', hold:'도루를 거의 하지 않는다'},
  bunt:{normal:'7회 이후 1점 차 이내, 약한 타자만', often:'무사 1·2루에서 하위 타선은 번트', never:'강공만'},
  teamBat:{false:'타자에게 맡긴다', true:'무사 2루에서 진루타 우선 (장타↓ 진루↑)'},
  shift:{normal:'정상 위치', dp:'1루 주자 있을 때 병살↑, 안타 약간↑', infieldIn:'3루 주자 홈 차단, 안타는↑', deep:'2루타↓, 짧은 안타↑'},
  bat:{normal:'포수 리드에 맡긴다', attack:'볼넷↓ 투구수↓, 피홈런↑', nibble:'피홈런↓ 삼진↑, 볼넷·투구수↑'},
  ibb:{false:'거르지 않는다', true:'7회 이후 접전, 1루가 비면 강타자를 거른다'},
  hook:{normal:'투구수 기준 교체', quick:'선발을 일찍 내리고 불펜 가동 (5실점 → 4실점 기준)', long:'선발에게 더 길게 맡긴다'}
};
const TAC_OPTS={atk:['normal','aggr','patient'], run:['normal','aggr','hold'], bunt:['normal','often','never'], teamBat:[false,true],
  shift:['normal','dp','infieldIn','deep'], bat:['normal','attack','nibble'], ibb:[false,true], hook:['normal','quick','long']};
function tacName(k){ return TAC_NAMES[k]||k; }
function tacLabel(k,v){
  if(k==='teamBat') return String(v)==='true'?'진루타 우선':'자율';
  if(k==='ibb') return String(v)==='true'?'적극 활용':'안 함';
  return (K.TAC_LABELS[k]&&K.TAC_LABELS[k][v])||v;
}
// AI clubs play to their roster: fast teams run, light-hitting teams bunt, deep bullpens hook early
function aiTactics(t){
  const r=K.ROSTERS[t], bats=r.batters.slice().sort((a,b)=>K.ovr(b)-K.ovr(a)).slice(0,9);
  const avg=k=>bats.reduce((a,p)=>a+p[k],0)/Math.max(1,bats.length);
  const pen=r.pitchers.filter(p=>p.role!=='SP').map(K.ovr).sort((a,b)=>b-a).slice(0,4);
  const penAvg=pen.reduce((a,b)=>a+b,0)/Math.max(1,pen.length);
  return {atk:avg('eye')>=74?'patient':avg('pow')>=76?'aggr':'normal', run:avg('spd')>=74?'aggr':avg('spd')<=64?'hold':'normal',
    bunt:avg('pow')<=68?'often':'normal', teamBat:avg('con')>=74, shift:'normal', bat:'normal', ibb:true, hook:penAvg>=72?'quick':'normal'};
}
function curTac(scope){
  const c=state.cfgs[USER];
  if(scope==='match'){ if(!state.matchTac) state.matchTac=Object.assign({},K.DEFAULT_TAC,c.tac||{}); return state.matchTac; }
  if(!c.tac) c.tac=Object.assign({},K.DEFAULT_TAC); return c.tac;
}
// ---------- 작전 숙련도 · 선수 능력 · 선수 신뢰 · 상대 정보 ----------
// FM27's tactical effectiveness, for a baseball dugout. Every non-default plan has to be learned:
// each tactic value has a familiarity of 0..100 that grows with games played under it (spring
// games and the postseason count) and with a tactics camp, more slowly the more plans run at
// once, and fades slowly when unused. How well a plan is carried out in a game also depends on
// whether the roster suits it and whether the players buy in. The engine scales each plan's
// effect by that execution (core.js paMods); AI clubs execute at 1.
const TF_LEARN={atk:['aggr','patient'], run:['aggr'], teamBat:['true'], shift:['dp','infieldIn','deep'], bat:['attack','nibble']};
const TF_START={rookie:30, coach:45, legend:35}, TF_GAIN=1.2, TF_FORGET=0.25, TF_FLOOR=20, TF_CAMP=20, NEW_GAMES=20;
function tfState(){
  const f=fm(); if(f.tf) return f.tf;
  // a save from before familiarity existed: plans already in use start half-learned
  const start=TF_START[state.user&&state.user.bg]||35, inUse=new Set(activePlans().map(x=>x.k+':'+x.v)), played=userGamesPlayed()>0;
  f.tf={}; for(const k in TF_LEARN){ f.tf[k]={}; TF_LEARN[k].forEach(v=>f.tf[k][v]= played&&inUse.has(k+':'+v)? 70 : start); }
  return f.tf;
}
function activePlans(tac){ tac=tac||(state.cfgs[USER].tac||K.DEFAULT_TAC); return Object.keys(TF_LEARN).filter(k=>TF_LEARN[k].indexOf(String(tac[k]))>=0).map(k=>({k,v:String(tac[k])})); }
function famOf(k,v){ const t=TF_LEARN[k]&&TF_LEARN[k].indexOf(String(v))>=0? tfState()[k] : null; return t? Math.round(t[String(v)]) : 100; }
function learnRate(tac){ const c=activePlans(tac).length; return 1/(1+0.2*Math.max(0,c-1)); }
// does the roster suit the plan? 0..100 from the relevant ratings (55 -> 0, 90 -> 100)
function lineupBats(){ return state.cfgs[USER].lineup.map(n=>findPlayer(USER,n)).filter(Boolean); }
function rotArms(){ return state.cfgs[USER].rotation.map(n=>findPlayer(USER,n)).filter(Boolean); }
function avgOf(ps,f){ return ps.length? ps.reduce((a,p)=>a+f(p),0)/ps.length : 60; }
function fieldersAt(set){ const c=state.cfgs[USER], pos=c.positions||K.autoPositions(USER,c.lineup);
  return c.lineup.map((n,i)=>set.indexOf(pos[i])>=0? findPlayer(USER,n) : null).filter(Boolean); }
const FIT_RULE={
  'atk:aggr':['타선 컨택',()=>avgOf(lineupBats(),p=>p.con)], 'atk:patient':['타선 선구안',()=>avgOf(lineupBats(),p=>p.eye)],
  'run:aggr':['타선 주력',()=>avgOf(lineupBats(),p=>p.spd)], 'teamBat:true':['타선 컨택',()=>avgOf(lineupBats(),p=>p.con)],
  'shift:dp':['내야 수비',()=>avgOf(fieldersAt(['1B','2B','3B','SS']),p=>p.fld)], 'shift:infieldIn':['내야 수비',()=>avgOf(fieldersAt(['1B','2B','3B','SS']),p=>p.fld)],
  'shift:deep':['외야 수비·주력',()=>avgOf(fieldersAt(['LF','CF','RF']),p=>(p.fld+p.spd)/2)],
  'bat:attack':['선발 구위',()=>avgOf(rotArms(),p=>p.stu)], 'bat:nibble':['선발 제구·무브',()=>avgOf(rotArms(),p=>(p.ctl+p.mov)/2)]
};
function fitOf(k,v){ const r=FIT_RULE[k+':'+v]; return r? clampN(Math.round((r[1]()-55)*100/35),0,100) : 100; }
// do the players follow the manager? morale, the board's backing, and how many are new to the club
function buyIn(){
  const ps=lineupBats().concat(rotArms()); if(!ps.length) return 60;
  const conf=(fm().board&&fm().board.conf)||60, fresh=ps.filter(p=>(p.newG||0)>0).length;
  return clampN(Math.round(0.55*avgOf(ps,p=>K.mor(p))+0.3*conf+15*(1-fresh/ps.length)),0,100);
}
function buyInParts(){ const ps=lineupBats().concat(rotArms());
  return {mor:Math.round(avgOf(ps,p=>K.mor(p))), conf:(fm().board&&fm().board.conf)||60, fresh:ps.filter(p=>(p.newG||0)>0).length}; }
// execution in a game: familiarity first, then roster fit (50 = neutral) and buy-in (67 = neutral)
function execOf(k,v,b){ b=b==null?buyIn():b;
  return clampN((0.3+0.7*famOf(k,v)/100)*(0.9+0.2*fitOf(k,v)/100)*(0.9+0.15*b/100),0.2,1.05); }
function execTable(){ const b=buyIn(), t={}; for(const k in TF_LEARN){ t[k]={}; TF_LEARN[k].forEach(v=>t[k][v]=execOf(k,v,b)); } return t; }
// what the analysts know about a club: grows with every meeting this season, half carries over
function knowState(){ const f=fm();
  if(!f.know||f.know.year!==state.year){ const old=(f.know&&f.know.n)||{}, n={}; for(const t in old) n[t]=Math.floor(old[t]/2); f.know={year:state.year,n}; }
  return f.know; }
function knowOf(t){ return clampN(0.15+0.085*(knowState().n[t]||0),0,1); }
function knowTable(){ const o={}; K.TEAM_IDS.forEach(t=>{ if(t!==USER) o[t]=knowOf(t); }); return o; }
function tacticsAfterGame(res,meet){
  const opp=res.home===USER?res.away:res.home;
  if(meet!==false){ const k=knowState(); k.n[opp]=(k.n[opp]||0)+1; }
  const tf=tfState(), rate=learnRate()*(0.7+0.3*buyIn()/100), act=new Set(activePlans().map(x=>x.k+':'+x.v));
  for(const k in TF_LEARN) TF_LEARN[k].forEach(v=>{ const cur=tf[k][v];
    tf[k][v]= act.has(k+':'+v)? Math.min(100,cur+TF_GAIN*rate) : Math.max(TF_FLOOR,cur-TF_FORGET); });
  allPlayers(USER).forEach(p=>{ if(p.newG>0) p.newG--; });
}
function nextOpp(){ const pm=state.pendingGame!=null&&pendingMatch(); if(pm) return pm.home===USER?pm.away:pm.home;
  const g=state.schedule.find(g=>!g.played&&(g.home===USER||g.away===USER)); return g? (g.home===USER?g.away:g.home) : null; }
function gaugeBox(label,val,sub){ const v=val==null?null:Math.round(val), col=v==null?'var(--dim)':v>=75?'var(--good)':v>=50?'var(--accent)':v>=30?'var(--warn)':'var(--bad)';
  return `<div style="min-width:0"><div class="row" style="justify-content:space-between;gap:6px"><span class="muted" style="font-size:12px">${label}</span><b style="color:${col}">${v==null?'-':v}</b></div>
    <span class="bar" style="display:block;width:100%;margin:4px 0"><i style="width:${v==null?0:v}%;background:${col}"></i></span><div class="hint" style="font-size:11px">${sub}</div></div>`; }
// the four gauges and each running plan's numbers, on the lineup tab and the preview
function effectPanel(scope){
  const T=curTac(scope), plans=activePlans(T), b=buyIn(), bp=buyInParts(), opp=nextOpp();
  const fam=plans.length? plans.reduce((a,x)=>a+famOf(x.k,x.v),0)/plans.length : 100;
  const fit=plans.length? plans.reduce((a,x)=>a+fitOf(x.k,x.v),0)/plans.length : null;
  const lines=plans.map(x=>`• ${tacName(x.k)} <b>${esc(tacLabel(x.k,x.v==='true'?true:x.v))}</b> — 숙련 ${famOf(x.k,x.v)}% · 적합 ${fitOf(x.k,x.v)} (${FIT_RULE[x.k+':'+x.v][0]}) · 실행률 <b>${Math.round(execOf(x.k,x.v,b)*100)}%</b>`);
  return `<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line-strong)">
    <div style="font-weight:700;margin-bottom:6px">📊 작전 효과</div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
      ${gaugeBox('작전 이해',fam, plans.length? `복잡도 ${plans.length}/5 · 익히는 속도 ${Math.round(learnRate(T)*100)}%` : '기본 작전만 사용 — 익힐 것이 없습니다')}
      ${gaugeBox('선수 능력',fit, plans.length? '작전에 맞는 능력치 (50 = 보통)' : '특수 작전 없음')}
      ${gaugeBox('선수 신뢰',b, `사기 ${bp.mor} · 이사회 ${bp.conf}${bp.fresh?` · 새 얼굴 ${bp.fresh}명`:''}`)}
      ${gaugeBox('상대 정보',opp? knowOf(opp)*100 : null, opp? `${K.ROSTERS[opp].name} · 맞대결 ${knowState().n[opp]||0}경기` : '다음 상대 없음')}
    </div>
    ${lines.length? `<div class="hint" style="margin-top:8px;font-size:12px">${lines.join('<br>')}</div>` : ''}
    <div class="hint" style="margin-top:6px;font-size:11.5px">실행률 100% = 완전히 익힌 작전. 낮을수록 효과가 줄고 혼선이 생깁니다. 경기를 치를수록 숙련도가 오르고, 쓰지 않는 작전은 조금씩 잊습니다.</div></div>`;
}
// the analysts' report for the preview: deeper the more the club has been seen
function scoutReport(opp){
  const k=knowOf(opp), n=knowState().n[opp]||0, sp=findPlayer(opp,projectedSP(opp)), out=[];
  const gs=state.schedule.filter(g=>g.played&&((g.home===USER&&g.away===opp)||(g.away===USER&&g.home===opp)));
  const w=gs.filter(g=>(g.home===USER?g.hr>g.ar:g.ar>g.hr)).length, l=gs.filter(g=>(g.home===USER?g.hr<g.ar:g.ar<g.hr)).length;
  if(sp){ const s=state.season[opp].pit[sp.n], parts=[['구위',sp.stu],['제구',sp.ctl],['무브먼트',sp.mov]].sort((a,b)=>b[1]-a[1]);
    out.push(`선발 ${sp.n}: 강점 ${parts[0][0]}${k>=0.3?` · 약점 ${parts[2][0]}`:''}${s&&s.OUT? ` · ERA ${fmtEra(s.ER,s.OUT)}, 9이닝당 삼진 ${(s.SO*27/s.OUT).toFixed(1)}`:''}`);
    if(k>=0.3){ if(sp.ctl<=64) out.push('제구가 흔들리는 투수입니다 — "공 많이 보기"로 투구수를 늘리세요.');
      else if(sp.ctl>=76&&sp.stu<74) out.push('스트라이크를 넣는 투수입니다 — "초구부터 적극 타격"이 통합니다.'); } }
  out.push(...scoutTip(opp));
  if(k>=0.5){ const ops=x=>(x.H+x.BB+x.HBP)/Math.max(1,x.AB+x.BB+x.HBP)+(x.H+x._2B+2*x._3B+3*x.HR)/Math.max(1,x.AB);
    const hot=Object.entries(state.season[opp].bat).filter(([nm,x])=>x.PA>=30&&findPlayer(opp,nm)).sort((a,b)=>ops(b[1])-ops(a[1]))[0];
    if(hot) out.push(`경계 대상: ${hot[0]} (시즌 OPS ${ops(hot[1]).toFixed(3)})`); }
  if(k<0.3) out.push('맞대결이 쌓이면 약점과 경계 대상까지 분석합니다.');
  return `<div class="hint" style="margin-top:8px">🔎 <b>전력분석</b> — 상대 정보 ${Math.round(k*100)}%${gs.length?` · 올 시즌 상대 전적 ${w}승 ${l}패`:''}${n?'':' · 첫 맞대결'}<br>${out.map(esc).join('<br>')}</div>`;
}
function setTac(scope,k,v){
  if(v==='true') v=true; if(v==='false') v=false;
  curTac(scope)[k]=v;
  { const fam=famOf(k,v); if(fam<70) notify(`${tacName(k)} '${tacLabel(k,v)}' 숙련도 ${fam}% — 익숙해질 때까지 효과가 떨어집니다.`); }
  if(scope==='match'){ closeModal(); openPreview(); } else render();
}
// a coach's read on the opponent for the preview
function scoutTip(opp){
  const at=aiTactics(opp), r=K.ROSTERS[opp];
  const tips=[];
  if(at.run==='aggr') tips.push('상대는 발이 빠릅니다 — 정면 승부로 투구 템포를 빠르게, 병살 시프트는 효과가 떨어집니다.');
  if(at.atk==='aggr') tips.push('초구부터 휘두르는 팀입니다 — 유인구 위주로 가면 범타를 끌어낼 수 있습니다.');
  if(at.atk==='patient') tips.push('공을 많이 보는 팀입니다 — 정면 승부로 볼넷을 줄이세요.');
  const slug=r.batters.slice().sort((a,b)=>b.pow-a.pow)[0];
  if(slug && slug.pow>=85) tips.push(`${slug.n}의 장타력이 위협적입니다 — 접전 후반엔 고의4구도 고려하세요.`);
  return tips.length? tips : ['특별한 약점은 보이지 않습니다. 기본 전술로 가셔도 됩니다.'];
}
function tacticsCard(scope){
  ensure();
  if(scope==='match' && state.pendingGame==null) return '';
  const T=curTac(scope);
  const row=(k)=>`<div style="display:grid;grid-template-columns:96px minmax(0,1fr);gap:8px;align-items:center;padding:4px 0">
      <span class="muted" style="font-size:12.5px">${tacName(k)}</span>
      <div style="min-width:0"><select onchange="App.setTac('${scope}','${k}',this.value)">${TAC_OPTS[k].map(o=>`<option value="${o}" ${String(T[k])===String(o)?'selected':''}>${esc(tacLabel(k,o))}${famOf(k,o)<100?` (숙련 ${famOf(k,o)}%)`:''}</option>`).join('')}</select>
      <div class="hint" style="font-size:11.5px;margin-top:2px">${esc(TAC_HELP[k][String(T[k])]||'')}</div></div></div>`;
  let tip='';
  if(scope==='match'){ const pm=pendingMatch(); if(pm){ const opp=pm.home===USER?pm.away:pm.home; tip=scoutReport(opp); } }
  tip+=effectPanel(scope);
  return `<div class="card" style="margin-top:14px${scope==='match'?';background:var(--panel2)':''}"><h3>🎯 ${scope==='match'?'이번 경기 작전':'팀 기본 전술'} <span class="tag">${scope==='match'?'경기 중에도 🎯 작전 버튼으로 변경':'경기 프리뷰에서 경기별로 바꿀 수 있습니다'}</span></h3>
    <div class="grid cols2" style="gap:4px 18px">
      <div><div style="font-weight:700;margin:2px 0 4px">⚔️ 공격 · 주루</div>${['atk','run','bunt','teamBat'].map(row).join('')}</div>
      <div><div style="font-weight:700;margin:2px 0 4px">🛡 수비 · 배터리</div>${['shift','bat','ibb','hook'].map(row).join('')}</div>
    </div>${tip}</div>`;
}

// ---------- stove league -> spring camp -> exhibition games ----------
const SPRING_GAMES=10;
const CAMP={
  bat:{label:'타격 강화', d:'컨택·파워·선구안', keys:['con','pow','eye'], type:'B'},
  pit:{label:'투수 강화', d:'구위·제구·무브먼트', keys:['stu','ctl','mov'], type:'P'},
  def:{label:'수비·주루', d:'수비·송구·주력', keys:['fld','arm','spd'], type:'B'},
  fit:{label:'체력 훈련', d:'투수 체력, 시즌 초반 컨디션', keys:['sta'], type:'P'},
  bal:{label:'균형 훈련', d:'모든 능력 조금씩', keys:null},
  tac:{label:'작전 훈련', d:'지금 팀 기본 작전의 숙련도 +20 (능력치 성장 없음)', keys:[], type:'-'}
};
function stoveTasks(){
  const f=fm();
  const renew=f.inbox.filter(m=>!m.done && m.actions.some(a=>a.fn==='renew')).length;
  return [
    {done:!renew, t:'재계약 협상', d: renew? `미결 ${renew}건 (받은편지함)` : '완료', go:"App.tab('inbox')"},
    {done:false, opt:true, t:'FA 시장', d:`${(f.fa||[]).length}명 시장에 있음`, go:"App.tab('club')"},
    {done:false, opt:true, t:'외국인 선수', d:`${foreignOf(USER).length}/${FX_MAX}명 · 스토브리그엔 교체 횟수 차감 없음`, go:"App.tab('club')"},
    {done:false, opt:true, t:'트레이드', d:'다른 구단과 협상', go:"App.tab('trade')"},
    {done:!!(f.camp&&f.camp.year===state.year&&f.camp.focus), t:'전지훈련 방향', d: f.camp&&f.camp.year===state.year&&f.camp.focus? CAMP[f.camp.focus].label : '선택 필요', go:"FM.campPicker()"},
    {done:!!state.cfgs[USER].tac, opt:true, t:'팀 기본 전술', d: state.cfgs[USER].tac? '설정됨' : '라인업 탭', go:"App.tab('lineup')"}
  ];
}
function preseasonCard(){
  ensure();
  if(state.phase==='stove'){
    const tasks=stoveTasks();
    return `<div class="card" style="margin-bottom:14px;border-color:var(--accent)"><h3>🔥 ${state.year} 스토브리그 <span class="tag">개막 전 준비 → 스프링캠프 → 시범경기 ${SPRING_GAMES}경기 → 개막</span></h3>
      <div class="grid cols3" style="gap:8px">${tasks.map(x=>`<div onclick="${x.go}" style="cursor:pointer;padding:10px;border-radius:8px;background:var(--panel2);border:1px solid ${x.done?'rgba(54,194,117,.4)':'var(--line)'}">
        <div><b>${x.done?'✅':x.opt?'▫️':'⬜'} ${x.t}</b></div><div class="muted" style="font-size:12px;margin-top:3px">${esc(x.d)}</div></div>`).join('')}</div>
      <div class="hint" style="margin-top:8px">전지훈련 방향을 정하면 스프링캠프로 떠날 수 있습니다. 시범경기는 순위·기록에 들어가지 않고, 라인업과 작전을 시험하는 무대입니다.</div></div>`;
  }
  if(state.phase==='spring' && state.spring){
    const sp=state.spring, rows=sp.games.map((g,i)=>{ const opp=g.home===USER?g.away:g.home;
      const res=g.played? (()=>{ const us=g.home===USER?g.hr:g.ar, th=g.home===USER?g.ar:g.hr; return `<span class="${us>th?'win':us<th?'lose':'muted'}"><b>${us>th?'승':us<th?'패':'무'}</b> ${us}:${th}</span>`; })() : '<span class="muted">-</span>';
      return `<tr><td>${i+1}</td><td>${g.home===USER?'홈':'원정'}</td><td class="name">${teamDot(opp)} ${K.ROSTERS[opp].name}</td><td>${res}</td></tr>`; }).join('');
    const top=Object.entries(sp.stats.bat).filter(([n,s])=>s.AB>=8).sort((a,b)=>(b[1].H/b[1].AB)-(a[1].H/a[1].AB)).slice(0,3)
      .map(([n,s])=>`${n} ${fmtAvg(s.H/s.AB)}${s.HR?' '+s.HR+'홈런':''}`).join(' · ');
    const topP=Object.entries(sp.stats.pit).filter(([n,s])=>s.OUT>=9).sort((a,b)=>(a[1].ER/a[1].OUT)-(b[1].ER/b[1].OUT)).slice(0,3)
      .map(([n,s])=>`${n} ERA ${fmtEra(s.ER,s.OUT)}`).join(' · ');
    return `<div class="card" style="margin-bottom:14px;border-color:var(--accent)"><h3>🌸 ${state.year} 시범경기 <span class="tag">${sp.W}승 ${sp.L}패 ${sp.T}무 · 순위·기록 미반영</span></h3>
      <div class="grid cols2"><div style="max-height:260px;overflow:auto"><table><thead><tr><th>#</th><th>구분</th><th class="name">상대</th><th>결과</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div><div class="muted" style="font-weight:700">시범경기 타격 ↑</div><div style="margin:4px 0 10px">${top||'<span class="muted">아직 기록 없음</span>'}</div>
        <div class="muted" style="font-weight:700">시범경기 마운드 ↑</div><div style="margin:4px 0">${topP||'<span class="muted">아직 기록 없음</span>'}</div>
        <div class="hint" style="margin-top:10px">${sp.camp? '스프링캠프: '+esc(sp.camp) : ''}</div></div></div></div>`;
  }
  return '';
}
function preseasonControls(){
  if(state.phase==='stove'){
    const ready=!!(fm().camp&&fm().camp.year===state.year&&fm().camp.focus);
    return `<div class="row"><button class="btn" onclick="FM.campPicker()">🏕 전지훈련 방향 ${ready?'변경':'선택'}</button>
      <button class="btn primary" ${ready?'':'disabled'} onclick="FM.startSpring()">✈ 스프링캠프 출발 → 시범경기</button></div>`;
  }
  const sp=state.spring, left=sp? sp.games.filter(g=>!g.played).length : 0;
  return left? `<div class="row"><button class="btn primary" onclick="App.nextGame()">▶ 다음 시범경기 (프리뷰→중계)</button>
      <button class="btn" onclick="FM.springSimAll()">⏩ 남은 시범경기 시뮬레이션</button></div>`
    : `<div class="row"><button class="btn gold" onclick="FM.openSeason()">🎉 ${state.year} 정규시즌 개막!</button></div>`;
}
function campPicker(){
  const cur=fm().camp&&fm().camp.year===state.year? fm().camp.focus : null;
  modal(`<span class="closeX" onclick="App.closeModal()">×</span><h2>🏕 ${state.year} 스프링캠프 훈련 방향</h2>
    <div class="hint" style="margin-bottom:10px">젊은 선수일수록 훈련 효과가 큽니다. 캠프가 끝나면 수석코치가 성장한 선수를 보고합니다.</div>
    <div class="grid" style="gap:8px">${Object.entries(CAMP).map(([k,c])=>`<button class="btn ${cur===k?'primary':''}" onclick="FM.setCamp('${k}')" style="text-align:left"><b>${c.label}</b> <span class="muted">— ${c.d}</span></button>`).join('')}</div>`);
}
function setCamp(k){ fm().camp={year:state.year, focus:k}; closeModal(); render(); }
// camp: young players gain most in the chosen area
function applyCamp(){
  const f=fm(), c=CAMP[f.camp.focus], gains=[];
  if(f.camp.focus==='tac'){ const tf=tfState(), plans=activePlans();
    plans.forEach(x=>tf[x.k][x.v]=Math.min(100,tf[x.k][x.v]+TF_CAMP)); allPlayers(USER).forEach(p=>addMor(p,2));
    return `${c.label} — ${plans.length? plans.map(x=>`${tacName(x.k)} '${tacLabel(x.k,x.v==='true'?true:x.v)}' 숙련 ${famOf(x.k,x.v)}%`).join(', ') : '특수 작전이 없어 기본기 위주로 훈련했습니다'}`; }
  allPlayers(USER).forEach(p=>{
    const keys = c.keys? (c.type===p.type? c.keys : []) : (p.type==='B'? ['con','pow','eye','spd','fld','arm'] : ['stu','ctl','mov','sta']);
    if(!keys.length) return;
    const base = p.age<=24? 0.9 : p.age<=28? 0.55 : p.age<=32? 0.3 : 0.1; // chance of +1 per trained attribute
    let tot=0;
    // camp works within potential too: a gain that would carry him past it doesn't stick
    keys.forEach(k=>{ const g=Math.random()<base*(c.keys?1:0.5)? 1 : 0; if(!g||p[k]>=99) return;
      const was=K.ovr(p); p[k]++; if(K.ovr(p)>Math.max(p.pot||0,was)) p[k]--; else tot++; });
    if(f.camp.focus==='fit') p.cond=100;
    if(tot>=2) gains.push(`${p.n} (+${tot})`);
  });
  allPlayers(USER).forEach(p=>addMor(p,2));
  return `${c.label} — 성장: ${gains.slice(0,8).join(', ')||'눈에 띄는 변화 없음'}`;
}
function startSpring(){
  const f=fm();
  if(!(f.camp&&f.camp.year===state.year&&f.camp.focus)){ campPicker(); return; }
  const campTxt=applyCamp();
  const signed=aiSignFAs();
  send('수석코치','🏕',`${state.year} 스프링캠프 결과`, `${campTxt}\n\n시범경기 ${SPRING_GAMES}경기로 라인업과 작전을 점검합니다. 시범경기는 순위와 시즌 기록에 들어가지 않습니다.`+
    (signed.length? `\n\n스토브리그 동안 다른 구단의 FA 계약: ${signed.join(', ')}` : ''), []);
  const opps=K.TEAM_IDS.filter(t=>t!==USER).sort(()=>Math.random()-0.5);
  const games=[]; for(let i=0;i<SPRING_GAMES;i++){ const o=opps[i%opps.length]; games.push(i%2? {home:USER,away:o} : {home:o,away:USER}); }
  const gc={}; K.TEAM_IDS.forEach(t=>gc[t]=0);
  state.spring={games:games.map(g=>Object.assign(g,{played:false,hr:0,ar:0})), played:0, gc, W:0, L:0, T:0, stats:{bat:{},pit:{}}, camp:campTxt};
  state.phase='spring';
  closeModal(); render();
}
function springNext(){ const sp=state.spring; if(!sp) return null; const i=sp.games.findIndex(g=>!g.played); if(i<0) return null; const g=sp.games[i]; return {home:g.home, away:g.away, label:`시범경기 ${i+1}차전`, i}; }
function springPlayNext(){ if(!springNext()){ render(); return; } state.pendingGame='spring'; openPreview(); }
function springRecord(res){
  const sp=state.spring, n=springNext(); if(!n) return;
  const g=sp.games[n.i]; g.played=true; g.hr=res.homeRuns; g.ar=res.awayRuns; sp.played++;
  sp.gc[res.home]++; sp.gc[res.away]++;
  const us=res.home===USER?res.homeRuns:res.awayRuns, th=res.home===USER?res.awayRuns:res.homeRuns;
  if(us>th) sp.W++; else if(us<th) sp.L++; else sp.T++;
  const bx=res.box[USER];
  const add=(dst,src)=>{ for(const k in src) if(typeof src[k]==='number') dst[k]=(dst[k]||0)+src[k]; };
  for(const nm in bx.bat){ add(sp.stats.bat[nm]||(sp.stats.bat[nm]={}), bx.bat[nm]); }
  for(const nm in bx.pit){ add(sp.stats.pit[nm]||(sp.stats.pit[nm]={}), bx.pit[nm]); }
  tacticsAfterGame(res,false); // spring games drill the plans but teach little about opponents
  gameReport(res,'spring');
  if(!springNext()) send('수석코치','📋',`시범경기 종료 (${sp.W}승 ${sp.L}패 ${sp.T}무)`, '시범경기 일정을 모두 마쳤습니다. 대시보드에서 정규시즌 개막을 선언하세요.', []);
}
function springSimAll(){
  state.pendingGame=null; state.matchTac=null;
  let n; while((n=springNext())){ springRecord(K.simGame(buildCfg(n.home), buildCfg(n.away), {maxInnings:9})); }
  closeModal(); render();
}
function openSeason(){
  state.phase='regular';
  K.TEAM_IDS.forEach(t=>allPlayers(t).forEach(p=>{ p.cond=100; }));
  send('KBO','🎉',`${state.year} KBO 정규시즌 개막`, `${state.year} 시즌 144경기 대장정이 시작됩니다. ${K.ROSTERS[USER].name}의 개막전 상대는 ${(()=>{ const g=state.schedule.find(g=>g.home===USER||g.away===USER); return g? K.ROSTERS[g.home===USER?g.away:g.home].name : '-'; })()}입니다.`, []);
  render();
}
// a first career starts in the stove league with a few unsigned veterans on the market
function seedFAs(){
  const f=fm(); f.fa=f.fa||[];
  for(let i=0;i<8;i++){
    const p=makeRookie(i<5?'B':'P', i>=5?(i===7?'RP':'SP'):undefined);
    Object.assign(p,{age:R(29,36), rookie:false, mor:62});
    const bump=R(4,12); if(p.type==='B'){ ['con','pow','eye','fld'].forEach(k=>p[k]=Math.min(90,p[k]+bump)); } else { ['stu','ctl','mov'].forEach(k=>p[k]=Math.min(88,p[k]+bump-2)); }
    p.sal=salaryFor(p);
    addFA(p,'미계약');
  }
}

// ---------- after the game: report in the feed, sometimes an interview request ----------
function feedPush(item){ const f=fm(); f.feed=f.feed||[]; item.id=(f.feedId=(f.feedId||0)+1); f.feed.unshift(item); if(f.feed.length>160) f.feed.length=160; }
function pogOf(res,t){
  let best=null, bv=-1;
  const bx=res.box[t];
  for(const n in bx.bat){ const s=bx.bat[n]; if(s.PA>0){ const p=findPlayer(t,n); if(p){ const r=gameRating(p,s); if(r>bv){bv=r;best={n,r,line:`${s.AB}타수 ${s.H}안타${s.HR?' '+s.HR+'홈런':''}${s.RBI?' '+s.RBI+'타점':''}${s.SB?' '+s.SB+'도루':''}`};} } } }
  for(const n in bx.pit){ const s=bx.pit[n]; if(s.BF>0){ const p=findPlayer(t,n); if(p){ const r=gameRating(p,s); if(r>bv){bv=r;best={n,r,line:`${ipStr(s.OUT)}이닝 ${s.ER}실점 ${s.SO}탈삼진`};} } } }
  return best;
}
function gameReport(res,kind){
  ensure();
  if(res.home!==USER && res.away!==USER) return;
  const home=res.home===USER, opp=home?res.away:res.home, us=home?res.homeRuns:res.awayRuns, th=home?res.awayRuns:res.homeRuns;
  const won=us>th, tie=us===th;
  const pog=pogOf(res,USER), opPog=pogOf(res,opp), d=res.decisions;
  const sp=home?res.homeSP:res.awaySP, sps=res.box[USER].pit[sp];
  const hrs=[]; [USER,opp].forEach(t=>{ for(const n in res.box[t].bat){ const s=res.box[t].bat[n]; if(s.HR) hrs.push(`${n}(${t})${s.HR>1?' '+s.HR+'개':''}`); } });
  const line=t=>{ if(!res.line||!res.line[t]) return ''; const a=res.line[t].slice(); if(t===res.home&&a.length<res.line[res.away].length) a.push('X'); return a.join(' '); };
  const label=kind==='spring'?'시범경기':kind==='ps'?(state.postseason&&state.postseason.cur?state.postseason.cur.name:'포스트시즌'):`${userGamesPlayed()}번째 경기`;
  const head = tie? `${K.ROSTERS[opp].name}와 ${us}:${th} 무승부` : won? `${K.ROSTERS[opp].name} 꺾고 ${us}:${th} 승리` : `${K.ROSTERS[opp].name}에 ${us}:${th} 패배`;
  const story = res.walkoff? (home&&won? '9회 이후 끝내기로 경기를 끝냈습니다.' : '끝내기 패배를 당했습니다.')
    : th===0&&won? '마운드가 상대 타선을 완벽히 봉쇄한 완봉승입니다.'
    : us>=10? '타선이 폭발한 경기였습니다.'
    : (res.innings||9)>9? `${res.innings}회까지 가는 연장 혈투였습니다.`
    : Math.abs(us-th)===1? '한 점 차 접전이었습니다.' : '';
  const body=[
    `${label} · ${home?'홈':'원정'}`,
    story,
    `\n[스코어] ${res.away} ${line(res.away)} | ${res.awayRuns}`,
    `            ${res.home} ${line(res.home)} | ${res.homeRuns}`,
    d? `\n승 ${d.W} · 패 ${d.L}${d.SV?' · 세 '+d.SV:''}${d.HD.length?' · 홀드 '+d.HD.join(', '):''}` : '',
    pog? `\n⭐ 우리 팀 수훈: ${pog.n} — ${pog.line} (평점 ${pog.r.toFixed(1)})` : '',
    sps? `선발 ${sp}: ${ipStr(sps.OUT)}이닝 ${sps.H}피안타 ${sps.ER}자책 ${sps.SO}탈삼진 · ${sps.NP||0}구` : '',
    opPog? `상대 수훈: ${opPog.n} — ${opPog.line}` : '',
    hrs.length? `홈런: ${hrs.join(', ')}` : ''
  ].filter(Boolean).join('\n');
  feedPush({year:state.year, kind, ug:userGamesPlayed(), won, tie, title:`${tie?'⚖️':won?'🟢':'🔴'} ${head}`, body});
  if(kind!=='spring') maybeInterview(res, kind, {won, tie, us, th, pog, opp});
}
function maybeInterview(res, kind, x){
  const f=fm(), ug=userGamesPlayed();
  const big = res.walkoff || (x.won&&x.th===0) || x.us>=10 || (x.pog&&x.pog.r>=8.3) || kind==='ps';
  const rr=recentRecord(), slump=!x.won&&rr.l>=4;
  if(!(big||slump) || (kind!=='ps' && ug-(f.lastInterview||-99)<4)) return;
  if(kind!=='ps') f.lastInterview=ug;
  const q = slump? `연패가 길어지고 있습니다. 오늘 경기 어떻게 보셨습니까?`
    : x.won? `오늘 승리의 원동력은 무엇이라고 보십니까?${x.pog?` 특히 ${x.pog.n} 선수의 활약이 돋보였는데요.`:''}`
    : `아쉬운 패배입니다. 패인을 꼽으신다면?`;
  const acts = x.won
    ? [{label:x.pog?`"${x.pog.n}의 활약이 결정적이었다"`:'"선수들이 잘해줬다"', fn:'interview', arg:{kind:'star', n:x.pog&&x.pog.n}},
       {label:'"모두가 함께 만든 승리"', fn:'interview', arg:{kind:'team'}},
       {label:'"아직 보완할 점이 많다"', fn:'interview', arg:{kind:'humble'}}]
    : [{label:'"패배는 감독 책임"', fn:'interview', arg:{kind:'blame_me'}},
       {label:'"선수들을 믿는다, 반등할 것"', fn:'interview', arg:{kind:'back'}},
       {label:'"이런 경기력으론 안 된다"', fn:'interview', arg:{kind:'call_out'}}];
  acts.push({label:'인터뷰 사양', fn:'interview', arg:{kind:'decline'}});
  send('구단 홍보팀','🎙',`경기 후 인터뷰 요청 — ${x.won?'승리':'패배'} ${x.us}:${x.th} vs ${x.opp}`, `방송사 인터뷰 요청이 왔습니다.\n\n기자: "${q}"\n\n답변은 선수단 사기와 이사회·팬 여론에 영향을 줍니다.`, acts);
}
function interviewAnswer(a){
  const f=fm(), all=allPlayers(USER);
  switch(a.kind){
    case 'star': { const p=a.n&&findPlayer(USER,a.n); if(p) addMor(p,8); all.forEach(x=>{ if(x!==p) addMor(x,0.5); }); return `${a.n||'선수들'}이(가) 감독의 칭찬에 크게 고무되었습니다.`; }
    case 'team': all.forEach(x=>addMor(x,2.5)); return '선수단 전체가 하나 된 분위기입니다.';
    case 'humble': f.board.conf=clampN(f.board.conf+1,0,100); return '방심하지 않는 자세에 이사회가 좋은 인상을 받았습니다. (신뢰도 +1)';
    case 'blame_me': f.board.conf=clampN(f.board.conf+1,0,100); all.forEach(x=>addMor(x,1.5)); return '선수들은 감독이 방패가 되어준 것에 고마워합니다.';
    case 'back': all.forEach(x=>addMor(x,3)); return '감독의 신뢰에 선수들이 반등을 다짐합니다.';
    case 'call_out': all.forEach(x=>{ const k=pers(x).k; addMor(x,(k==='승부욕'||k==='리더형')?3:-3); }); return '공개 질책에 승부욕 강한 선수들은 이를 악물었지만 일부는 위축됐습니다.';
    default: f.board.conf=clampN(f.board.conf-1,0,100); return '인터뷰를 사양했습니다. 언론과 이사회 반응이 조금 차갑습니다. (신뢰도 -1)';
  }
}
let feedFilter='all';
function setFeedFilter(v){ feedFilter=v; render(); }
function renderFeed(){
  ensure();
  const f=fm(); let list=f.feed||[];
  if(feedFilter!=='all') list=list.filter(x=>x.kind===feedFilter);
  const ft=(id,l)=>`<button class="${feedFilter===id?'active':''}" onclick="FM.setFeedFilter('${id}')">${l}</button>`;
  return `<div class="card"><h3>📰 피드 <span class="tag">경기 리포트 · 최근 160건</span></h3>
    <div class="tabsm">${ft('all','전체')}${ft('regular','정규시즌')}${ft('ps','포스트시즌')}${ft('spring','시범경기')}</div>
    ${list.length? list.slice(0,60).map(x=>`<details style="border-bottom:1px solid var(--line);padding:8px 2px"${x===list[0]?' open':''}>
      <summary style="cursor:pointer"><b>${esc(x.title)}</b> <span class="muted" style="font-size:12px">· ${x.year} ${x.kind==='spring'?'시범경기':x.kind==='ps'?'포스트시즌':x.ug+'경기'}</span></summary>
      <div style="white-space:pre-wrap;line-height:1.65;margin-top:6px;font-size:13.5px;font-variant-numeric:tabular-nums">${esc(x.body)}</div></details>`).join('')
      : '<div class="muted">경기를 치르면 리포트가 쌓입니다.</div>'}</div>`;
}
function feedCard(){
  const list=(fm().feed||[]).slice(0,4);
  return `<div class="card" style="margin-top:14px"><h3>📰 최근 경기 리포트 <span class="tag"><a href="javascript:void(0)" onclick="App.tab('feed')" style="color:var(--dim)">피드 전체 보기</a></span></h3>
    ${list.length? list.map(x=>`<div style="border-bottom:1px solid var(--line);padding:6px 0;cursor:pointer" onclick="App.tab('feed')"><b>${esc(x.title)}</b><div class="muted" style="font-size:12px;margin-top:2px">${esc(x.body.split('\n').find(l=>l.startsWith('⭐'))||x.body.split('\n')[1]||'')}</div></div>`).join('') : '<div class="muted">아직 경기 리포트가 없습니다.</div>'}</div>`;
}

// ---------- player records: game logs, season archive, career ----------
function logGame(res){
  state.logs=state.logs||{};
  [res.home,res.away].forEach(t=>{
    const opp=t===res.home?res.away:res.home, home=t===res.home, n0=(state.season[t].W+state.season[t].L+state.season[t].T)+1;
    const push=(n,e)=>{ const k=t+'|'+n, a=state.logs[k]||(state.logs[k]=[]); a.push(e); if(a.length>10) a.shift(); };
    for(const n in res.box[t].bat){ const s=res.box[t].bat[n]; if(s.PA>0) push(n,{g:n0, opp, home, b:[s.PA,s.AB,s.H,s._2B,s._3B,s.HR,s.RBI,s.R,s.BB,s.SO,s.SB]}); }
    for(const n in res.box[t].pit){ const s=res.box[t].pit[n]; if(s.BF>0) push(n,{g:n0, opp, home, p:[s.OUT,s.H,s.ER,s.BB,s.SO,s.HR,s.NP||0,s.W?'W':s.L?'L':s.SV?'S':s.HD?'H':'',s.GS]}); }
  });
}
function archiveSeason(){
  state.hist=state.hist||{};
  K.TEAM_IDS.forEach(t=>{
    const s=state.season[t];
    for(const n in s.bat){ const x=s.bat[n]; if(x.PA>0) (state.hist[n]=state.hist[n]||[]).push({y:state.year, t, b:x}); }
    for(const n in s.pit){ const x=s.pit[n]; if(x.G>0) (state.hist[n]=state.hist[n]||[]).push({y:state.year, t, p:x}); }
  });
  state.logs={};
}
// league environment for rate stats (wOBA scale, FIP constant)
function leagueEnv(){
  let AB=0,H=0,D=0,T=0,HR=0,BB=0,HBP=0,SO=0,PA=0,ER=0,OUT=0,pHR=0,pBB=0,pSO=0,pHBP=0;
  K.TEAM_IDS.forEach(t=>{ const s=state.season[t];
    for(const n in s.bat){ const x=s.bat[n]; AB+=x.AB;H+=x.H;D+=x._2B;T+=x._3B;HR+=x.HR;BB+=x.BB;HBP+=x.HBP;SO+=x.SO;PA+=x.PA; }
    for(const n in s.pit){ const x=s.pit[n]; ER+=x.ER;OUT+=x.OUT;pHR+=x.HR;pBB+=x.BB;pSO+=x.SO; } });
  const woba=(AB+BB+HBP)? (0.69*BB+0.72*HBP+0.89*(H-D-T-HR)+1.27*D+1.62*T+2.1*HR)/(AB+BB+HBP) : 0.32;
  const era=OUT? ER*27/OUT : 4.5, fipRaw=OUT? (13*pHR+3*pBB-2*pSO)/(OUT/3) : 0;
  return {woba: woba||0.32, era, cFIP: era-fipRaw};
}
function batMetrics(s,env){
  const SF=s.SF||0, PA=s.AB+s.BB+s.HBP+SF+(s.SH||0), avg=s.AB?s.H/s.AB:0, obp=(s.AB+s.BB+s.HBP+SF)?(s.H+s.BB+s.HBP)/(s.AB+s.BB+s.HBP+SF):0;
  const tb=s.H+s._2B+2*s._3B+3*s.HR, slg=s.AB?tb/s.AB:0, single=s.H-s._2B-s._3B-s.HR;
  const woba=(s.AB+s.BB+s.HBP+SF)? (0.69*s.BB+0.72*s.HBP+0.89*single+1.27*s._2B+1.62*s._3B+2.1*s.HR)/(s.AB+s.BB+s.HBP+SF) : 0;
  const bip=s.AB-s.SO-s.HR+SF;
  return {avg,obp,slg,ops:obp+slg,iso:slg-avg,babip:bip>0?(s.H-s.HR)/bip:0,k:PA?s.SO/PA:0,bb:PA?s.BB/PA:0,woba,wrc:env&&env.woba?Math.round(woba/env.woba*100):null};
}
function pitMetrics(s,env){
  const ip=s.OUT/3, BF=s.BF||1;
  return {era:s.OUT?s.ER*27/s.OUT:0, whip:s.OUT?(s.H+s.BB)*3/s.OUT:0, k9:ip?s.SO*9/ip:0, bb9:ip?s.BB*9/ip:0, hr9:ip?s.HR*9/ip:0,
    kp:s.SO/BF, bbp:s.BB/BF, fip:ip&&env? (13*s.HR+3*s.BB-2*s.SO)/ip+env.cFIP : 0, babip:(BF-s.SO-s.BB-s.HR)>0?(s.H-s.HR)/(BF-s.SO-s.BB-s.HR):0,
    ipgs:s.GS?(s.OUT/3)/s.GS:0, npi:s.OUT&&s.NP?s.NP/(s.OUT/3):0};
}
const f3=x=>fmtAvg(x), pct=x=>(x*100).toFixed(1)+'%', f2=x=>x.toFixed(2);
function kpis(arr){ return `<div class="kpi">${arr.map(([v,l])=>`<div class="k"><div class="v" style="font-size:18px">${v}</div><div class="l">${l}</div></div>`).join('')}</div>`; }
function seasonPanel(team,p){
  const isB=p.type==='B', s=isB? state.season[team].bat[p.n] : state.season[team].pit[p.n], env=leagueEnv();
  if(!s || (isB? !s.PA : !s.G)) return '<div class="muted">이번 시즌 기록이 없습니다.</div>';
  if(isB){ const m=batMetrics(s,env);
    return kpis([[f3(m.avg),'타율'],[f3(m.obp),'출루율'],[f3(m.slg),'장타율'],[m.ops.toFixed(3),'OPS'],[m.wrc,'wRC+ (100=평균)']]) +
      `<div style="overflow-x:auto;margin-top:10px"><table><thead><tr><th>G</th><th>PA</th><th>AB</th><th>H</th><th>2B</th><th>3B</th><th>HR</th><th>타점</th><th>득점</th><th>BB</th><th>SO</th><th>도루</th><th>실패</th><th>희타</th><th>병살</th></tr></thead>
      <tbody><tr><td>${s.G}</td><td>${s.PA}</td><td>${s.AB}</td><td>${s.H}</td><td>${s._2B}</td><td>${s._3B}</td><td>${s.HR}</td><td>${s.RBI}</td><td>${s.R}</td><td>${s.BB}</td><td>${s.SO}</td><td>${s.SB||0}</td><td>${s.CS||0}</td><td>${s.SH||0}</td><td>${s.GDP||0}</td></tr></tbody></table></div>
      <div class="muted" style="font-weight:700;margin:12px 0 6px">세부 지표</div>`+
      kpis([[m.iso.toFixed(3),'순장타율 ISO'],[f3(m.babip),'BABIP'],[pct(m.k),'삼진율'],[pct(m.bb),'볼넷율'],[f3(m.woba),'wOBA']]); }
  const m=pitMetrics(s,env);
  return kpis([[f2(m.era),'평균자책'],[`${s.W}-${s.L}`,'승-패'],[`${s.SV}/${s.HD||0}`,'세이브/홀드'],[ipStr(s.OUT),'이닝'],[f2(m.whip),'WHIP']]) +
    `<div style="overflow-x:auto;margin-top:10px"><table><thead><tr><th>G</th><th>GS</th><th>타자</th><th>피안타</th><th>피홈런</th><th>볼넷</th><th>탈삼진</th><th>실점</th><th>자책</th><th>투구수</th></tr></thead>
    <tbody><tr><td>${s.G}</td><td>${s.GS}</td><td>${s.BF}</td><td>${s.H}</td><td>${s.HR}</td><td>${s.BB}</td><td>${s.SO}</td><td>${s.R}</td><td>${s.ER}</td><td>${s.NP||0}</td></tr></tbody></table></div>
    <div class="muted" style="font-weight:700;margin:12px 0 6px">세부 지표</div>`+
    kpis([[f2(m.fip),'FIP'],[f2(m.k9),'K/9'],[f2(m.bb9),'BB/9'],[pct(m.kp-m.bbp),'K-BB%'],[f3(m.babip),'피BABIP']]) +
    (s.GS? kpis([[m.ipgs.toFixed(1),'선발 평균 이닝'],[m.npi.toFixed(1),'이닝당 투구수']]) : '');
}
function careerPanel(team,p){
  const isB=p.type==='B', real=(window.KBO_CAREER&&window.KBO_CAREER[p.n]&&window.KBO_CAREER[p.n].t===p.type)? window.KBO_CAREER[p.n].y : [];
  const game=((state.hist||{})[p.n]||[]).filter(x=>isB? x.b : x.p);
  const cur=game.some(x=>x.y===state.year)? null : (isB? state.season[team].bat[p.n] : state.season[team].pit[p.n]);
  const rows=[], tot={};
  const addTot=o=>{ for(const k in o) if(typeof o[k]==='number') tot[k]=(tot[k]||0)+o[k]; };
  // real rows: B [y,team,G,PA,AB,R,H,2B,3B,HR,RBI,SB,CS,BB,HBP,SO], P [y,team,G,W,L,SV,HLD,OUT,H,HR,BB,HBP,SO,R,ER,TBF]
  real.forEach(r=>{ const o= isB? {G:r[2],PA:r[3],AB:r[4],R:r[5],H:r[6],_2B:r[7],_3B:r[8],HR:r[9],RBI:r[10],SB:r[11],CS:r[12],BB:r[13],HBP:r[14],SO:r[15]}
      : {G:r[2],W:r[3],L:r[4],SV:r[5],HD:r[6],OUT:r[7],H:r[8],HR:r[9],BB:r[10],HBP:r[11],SO:r[12],R:r[13],ER:r[14],BF:r[15]};
    rows.push({y:r[0], t:r[1], s:o, tag:''}); addTot(o); });
  game.forEach(x=>{ const o=isB?x.b:x.p; rows.push({y:x.y, t:x.t, s:o, tag:'🎮'}); addTot(o); });
  if(cur && (isB? cur.PA : cur.G)){ rows.push({y:state.year, t:team, s:cur, tag:'▶'}); addTot(cur); }
  if(!rows.length) return '<div class="muted">KBO 1군 기록이 없습니다.</div>';
  const bRow=(y,t,s,tag)=>{ const m=batMetrics(Object.assign({_2B:0,_3B:0,HBP:0,SO:0,SB:0},s)); return `<tr><td>${tag} ${y}</td><td>${t}</td><td>${s.G}</td><td>${s.PA||'-'}</td><td>${f3(m.avg)}</td><td>${s.H}</td><td>${s.HR}</td><td>${s.RBI}</td><td>${s.SB||0}</td><td>${f3(m.obp)}</td><td>${f3(m.slg)}</td><td><b>${m.ops.toFixed(3)}</b></td></tr>`; };
  const pRow=(y,t,s,tag)=>`<tr><td>${tag} ${y}</td><td>${t}</td><td>${s.G}</td><td>${s.W}</td><td>${s.L}</td><td>${s.SV}</td><td>${s.HD||0}</td><td>${ipStr(s.OUT)}</td><td><b>${fmtEra(s.ER,s.OUT)}</b></td><td>${s.SO}</td><td>${s.OUT?((s.H+s.BB)*3/s.OUT).toFixed(2):'-'}</td></tr>`;
  const head=isB? '<th>연도</th><th>팀</th><th>G</th><th>PA</th><th>타율</th><th>안타</th><th>HR</th><th>타점</th><th>도루</th><th>출루</th><th>장타</th><th>OPS</th>'
    : '<th>연도</th><th>팀</th><th>G</th><th>W</th><th>L</th><th>SV</th><th>HD</th><th>IP</th><th>ERA</th><th>SO</th><th>WHIP</th>';
  const body=rows.map(r=>isB? bRow(r.y,r.t,r.s,r.tag) : pRow(r.y,r.t,r.s,r.tag)).join('');
  const total= isB? bRow('통산','',tot,'') : pRow('통산','',tot,'');
  const ms=[];
  if(isB){ if(tot.H) ms.push(`통산 ${tot.H}안타`); if(tot.HR) ms.push(`${tot.HR}홈런`); const next=[100,200,300,400,500].find(x=>x>(tot.HR||0)); if(next&&tot.HR&&next-tot.HR<=15) ms.push(`${next}홈런까지 ${next-tot.HR}개`); const nh=[500,1000,1500,2000,2500].find(x=>x>(tot.H||0)); if(nh&&nh-tot.H<=60) ms.push(`${nh}안타까지 ${nh-tot.H}개`); }
  else { if(tot.W) ms.push(`통산 ${tot.W}승`); if(tot.SV) ms.push(`${tot.SV}세이브`); const nw=[50,100,150,200].find(x=>x>(tot.W||0)); if(nw&&tot.W&&nw-tot.W<=10) ms.push(`${nw}승까지 ${nw-tot.W}승`); }
  return `${ms.length?`<div class="hint" style="margin-bottom:8px">🏅 ${ms.join(' · ')}</div>`:''}
    <div style="overflow-x:auto;max-height:300px"><table><thead><tr>${head}</tr></thead><tbody>${body}<tr class="me rankrow" style="font-weight:700">${total.replace(/<tr>|<\/tr>/g,'')}</tr></tbody></table></div>
    <div class="hint" style="margin-top:6px">실제 KBO 기록(2025년까지, KBO 기록실) + 🎮 게임에서 치른 시즌 + ▶ 진행 중인 시즌</div>`;
}
function logPanel(team,p){
  const a=((state.logs||{})[team+'|'+p.n]||[]).slice().reverse();
  if(!a.length) return '<div class="muted">이번 시즌 최근 경기 기록이 없습니다.</div>';
  if(p.type==='B') return `<div style="overflow-x:auto"><table><thead><tr><th>경기</th><th>상대</th><th>타수</th><th>안타</th><th>2B</th><th>HR</th><th>타점</th><th>득점</th><th>BB</th><th>SO</th><th>도루</th></tr></thead><tbody>${
    a.map(e=>{ const b=e.b; return `<tr><td>${e.g}</td><td>${e.home?'vs':'@'} ${e.opp}</td><td>${b[1]}</td><td><b>${b[2]}</b></td><td>${b[3]}</td><td>${b[5]}</td><td>${b[6]}</td><td>${b[7]}</td><td>${b[8]}</td><td>${b[9]}</td><td>${b[10]}</td></tr>`; }).join('')}</tbody></table></div>`;
  return `<div style="overflow-x:auto"><table><thead><tr><th>경기</th><th>상대</th><th>결과</th><th>IP</th><th>피안타</th><th>자책</th><th>BB</th><th>SO</th><th>HR</th><th>투구수</th></tr></thead><tbody>${
    a.map(e=>{ const x=e.p; return `<tr><td>${e.g}${x[8]?' (선발)':''}</td><td>${e.home?'vs':'@'} ${e.opp}</td><td>${{W:'승',L:'패',S:'세',H:'홀'}[x[7]]||'-'}</td><td>${ipStr(x[0])}</td><td>${x[1]}</td><td><b>${x[2]}</b></td><td>${x[3]}</td><td>${x[4]}</td><td>${x[5]}</td><td>${x[6]}</td></tr>`; }).join('')}</tbody></table></div>`;
}
let profTab='overview', profKey=null;
function profileTab(k){ profTab=k; const [t,n]=profKey; closeModal(); showProfile(t,n); }

// ---------- season end / offseason ----------
function onSeasonEnd(){
  ensure();
  archiveSeason();
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
  // 2군 players are under contract too; minor-league deals (under 1억) roll over a year on their own
  K.TEAM_IDS.forEach(t=>allPlayers(t).concat(farmOf(t)).forEach(p=>{
    p.yrs=(p.yrs||1)-1;
    if(p.yrs>0) return;
    if(isFarm(t,p) && (p.sal||0)<1){ p.yrs=1; return; }
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
  toFA.forEach(([t,p])=>{ const r=K.ROSTERS[t]; r.batters=r.batters.filter(x=>x!==p); r.pitchers=r.pitchers.filter(x=>x!==p); r.farm=farmOf(t).filter(x=>x!==p); addFA(p,t); });
  if(f.fa.length) send('단장','🆓',`FA 시장 개장 (${f.fa.length}명)`,
    `다른 구단과 재계약하지 않은 선수들이 FA 시장에 나왔습니다.\n\n${f.fa.slice().sort((a,b)=>K.ovr(b.p)-K.ovr(a.p)).slice(0,6).map(x=>`• ${x.p.n} (${x.p.pos||x.p.role}, ${x.p.age}세, OVR ${K.ovr(x.p)}) 요구 ${x.yrs}년 ${x.ask}억`).join('\n')}\n\n구단 탭의 FA 시장에서 계약할 수 있습니다. 스토브리그가 끝나고 스프링캠프가 시작되면 남은 선수들은 다른 구단과 계약합니다.`, []);
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
  const dr=draftState(); if(dr&&!draftDone(dr)){ const before=dr.picks[USER].length; draftAuto(); f.draftAutoN=DRAFT_ROUNDS-before; } else f.draftAutoN=0;
  // unanswered contract talks: the player walks
  f.inbox.forEach(m=>{ if(!m.done && m.actions.some(a=>a.fn==='renew')){ m.done=true; m.read=true; m.result='기한 내 결정하지 않아 FA로 떠났습니다.'; const p=findPlayer(USER,m.actions[0].arg.n); if(p) p.leaving=true; } });
  const left=[], retired=[];
  K.TEAM_IDS.forEach(t=>{
    const r=K.ROSTERS[t];
    const out=p=>{ if(t===USER&&p.leaving){ left.push(p.n); addFA(p,USER); return true; }
      if(p.age>=39 && K.ovr(p)<72){ if(t===USER) retired.push(p.n); return true; } return false; };
    r.batters=r.batters.filter(p=>!out(p)); r.pitchers=r.pitchers.filter(p=>!out(p)); r.farm=farmOf(t).filter(p=>!out(p));
    allPlayers(t).forEach(p=>{ p.cond=100; p.inj=0; p.bench=0; p.expiring=false; p.mor=clampN(p.mor*0.6+62*0.4,5,99); });
    // draft: four rookies a club join the farm; the farm fills any hole in the 1군
    const fx=offseasonFarm(t);
    if(t===USER){ f.newRookies=fx.draft.map(p=>`${p.n} (${p.age}세, ${posFull(p.pos||p.role)}, OVR ${K.ovr(p)}, 잠재력 ${starText(p)})`);
      f.farmNews={up:fx.up.map(p=>p.n), retired:fx.retired, cut:fx.cut}; return; }
    // AI clubs send their least valuable players down so 1군 rosters don't grow every year
    const trim=(arr,max)=>{ while(arr.length>max){ let w=0; arr.forEach((p,i)=>{ if(playerValue(p)<playerValue(arr[w])) w=i; }); farmOf(t).push(arr.splice(w,1)[0]); } };
    trim(r.batters,14);
    if(r.pitchers.length>12){ const sp=r.pitchers.filter(p=>p.role==='SP'), rp=r.pitchers.filter(p=>p.role!=='SP'); trim(sp,Math.max(5,12-rp.length)); trim(rp,12-sp.length); r.pitchers=sp.concat(rp); }
  });
  f.offseasonNews={left, retired, signed:[]}; // AI clubs sign free agents when spring camp opens
  f.draft=null;
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
  send('단장','🔥',`${state.year} 스토브리그`, `새 시즌 준비 기간입니다. FA 시장·외국인 선수·트레이드를 정리하고, 전지훈련 방향을 정해 스프링캠프로 떠나세요.`, []);
  const n=f.offseasonNews||{left:[],retired:[]};
  const fn=f.farmNews||{up:[],retired:[],cut:[]};
  send('스카우트 팀장','🎓',`${state.year} 신인 입단`,
    `드래프트 지명 신인 ${(f.newRookies||[]).length}명이 2군에 합류했습니다.${f.draftAutoN? ` (스카우트 팀이 ${f.draftAutoN}명을 대신 지명)`:''}\n\n${(f.newRookies||[]).map(x=>'• '+x).join('\n')}` +
    (fn.up.length? `\n\n1군 인원을 채우려 2군에서 올린 선수: ${fn.up.join(', ')}`:'') + (fn.retired.length? `\n2군 은퇴: ${fn.retired.join(', ')}`:'') + (fn.cut.length? `\n2군 정리(방출): ${fn.cut.join(', ')}`:'') +
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
  const why=releaseBlock(p); if(why){ notify(why); return; }
  const cost=Math.round(p.sal*Math.max(1,p.yrs)*0.5*10)/10;
  ask(`${n}을(를) 방출합니다. 잔여 계약의 절반인 ${cost}억 원을 위약금으로 지급합니다.`, '방출', ()=>doRelease(p,n,cost));
}
// a 1군 release must leave a legal roster: the entry minimums, five starters, and enough healthy bodies
function releaseBlock(p){
  const r=K.ROSTERS[USER]; if(allPlayers(USER).indexOf(p)<0) return '';
  if(p.type==='B' && r.batters.filter(x=>!K.isInjured(x)).length<=10) return '타자가 부족해 방출할 수 없습니다 (건강한 타자 최소 10명).';
  if(p.type==='P' && r.pitchers.filter(x=>!K.isInjured(x)).length<=8) return '투수가 부족해 방출할 수 없습니다 (건강한 투수 최소 8명).';
  const why=entryProblem(USER,[p],[]); return why? why+' 2군 선수를 먼저 올리세요.' : '';
}
function doRelease(p,n,cost){
  const r=K.ROSTERS[USER];
  if(!findPlayer(USER,n)) return;
  const why=releaseBlock(p); if(why){ notify(why); closeModal(); return; }
  if(p.type==='B') r.batters=r.batters.filter(x=>x!==p); else r.pitchers=r.pitchers.filter(x=>x!==p);
  r.farm=farmOf(USER).filter(x=>x!==p);
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
  if(id==='inbox'){ const u=unread(); return u? ` <span class="count" aria-label="안 읽음 ${u}개">${u}</span>` : ''; }
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

// ---------- UI: dashboard (design pass 1: hero → decisions → reference panels) ----------
// Decisions the manager owes right now, most urgent first. Each: {ic, t, d, a, go}
function dashTasks(){
  ensure();
  const f=fm(), out=[], c=state.cfgs[USER];
  const camp=f.camp&&f.camp.year===state.year&&f.camp.focus;
  const dr=draftState(); if(dr&&!draftDone(dr)&&draftOnClock(dr)===USER) out.push({ic:'trophy', t:`신인 드래프트 ${Math.floor(dr.pick/dr.order.length)+1}라운드 — 우리 차례`, d:`스카우트 팀 · 지명 ${dr.picks[USER].length}/${DRAFT_ROUNDS}`, a:'지명하기', go:'FM.showDraft()'});
  const tw=tradeWindow(); if(state.phase==='regular'&&tw.open&&tw.daysLeft!=null&&tw.daysLeft<=14) out.push({ic:'trade', t:`트레이드 마감 D-${tw.daysLeft}`, d:`단장 · ${DEADLINE[0]}월 ${DEADLINE[1]}일까지 · 마감이 가까워 제안이 늘어납니다`, a:'트레이드', go:"App.tab('trade')"});
  if(state.phase==='stove' && !camp) out.push({ic:'camp', t:'스프링캠프 방향 선택', d:'수석코치 · '+Object.values(CAMP).map(x=>x.label).join(' / '), a:'훈련 선택', go:"FM.campPicker()"});
  // real decisions only: skip plain acknowledgements, and let press/interview requests lapse after 3 games
  const now=userGamesPlayed(), PRESS=['media','interview'];
  const open=f.inbox.filter(m=>!m.done&&m.actions.length&&!m.actions.every(a=>a.fn==='ok')
    &&!(m.actions.every(a=>PRESS.includes(a.fn))&&(m.year!==state.year||now-m.ug>3)));
  const rankOf=m=>m.actions.some(a=>PRESS.includes(a.fn))? 1 : 0;
  open.sort((a,b)=>rankOf(a)-rankOf(b)).forEach(m=>{
    const renew=m.actions.some(a=>a.fn==='renew'), trade=m.actions.some(a=>/Trade$/.test(a.fn));
    out.push({ic:renew?'contract':trade?'trade':'inbox', t:m.subject, d:`받은편지함 · ${m.from} · ${m.ug}경기차`, a:renew?'조건 검토':trade?'제안 검토':'검토', go:`App.tab('inbox');FM.openMsg(${m.id})`});
  });
  const inj=allPlayers(USER).filter(K.isInjured), used=c.lineup.concat(c.rotation);
  const injIn=inj.filter(p=>used.includes(p.n));
  if(injIn.length) out.push({ic:'injury', t:`부상 선수 ${injIn.length}명이 라인업·로테이션에 있음`, d:'의무팀 · '+injIn.map(p=>`${p.n} (회복 ${p.inj})`).join(', '), a:'라인업 확인', go:"App.tab('lineup')"});
  const tired=allPlayers(USER).filter(p=>!K.isInjured(p)&&K.cond(p)<60&&c.lineup.includes(p.n));
  if(tired.length && !f.autoRest) out.push({ic:'lineup', t:`지친 주전 ${tired.length}명`, d:'수석코치 · '+tired.map(p=>p.n).join(', ')+' · 휴식 권장', a:'라인업 확인', go:"App.tab('lineup')"});
  if(state.phase==='stove'){
    if(!c.tac) out.push({ic:'settings', t:'팀 기본 전술 정하기', d:'라인업 탭 · 공격·수비·배터리 기본값', a:'전술 설정', go:"App.tab('lineup')"});
    out.push({ic:'money', t:'FA·외국인 선수 시장 살펴보기', d:`FA ${(f.fa||[]).length}명 · 외국인 ${foreignOf(USER).length}/${FX_MAX}명 · 교체 횟수 차감 없음`, a:'구단 화면', go:"App.tab('club')"});
  }
  if(!out.length && inj.length) out.push({ic:'injury', t:`부상자 ${inj.length}명 회복 중`, d:'의무팀 · '+inj.map(p=>`${p.n} (${p.inj})`).join(', '), a:'선수단 보기', go:"App.tab('squad')"});
  return out;
}
function dashBrief(){
  ensure();
  const f=fm(), b=f.board, s=boardStatus(), pay=payroll(USER);
  const inj=allPlayers(USER).filter(K.isInjured), tired=allPlayers(USER).filter(p=>!K.isInjured(p)&&K.cond(p)<60), sad=allPlayers(USER).filter(p=>K.mor(p)<35);
  const tone=b.conf>=60?['good','안정']:b.conf>=35?['warn','주의']:['bad','위험'];
  const kind=x=>x.kind==='spring'?'시범경기':x.kind==='ps'?'포스트시즌':`${x.ug}경기`;
  const feed=(f.feed||[]).slice(0,2);
  return `<section class="panel"><div class="section-head"><h3>구단 브리핑</h3><span class="chip ${tone[0]}">이사회 ${tone[1]}</span></div>
    <div class="metric-grid">
      <div><small>이사회 신뢰</small><b>${b.conf}</b><small>${confLabel(b.conf)} · 목표 ${esc(b.expect.label)}</small></div>
      <div><small>연봉 / 예산</small><b>${pay}<span class="unit"> / ${f.fin.budget}억</span></b><small>잔고 ${f.fin.balance.toFixed(1)}억 · 현재 ${s.rank}위</small></div>
    </div>
    <div class="brief-line">${icon('squad')}<span>부상 <b>${inj.length}</b> · 피로 <b>${tired.length}</b> · 불만 <b>${sad.length}</b> <span class="muted">· 사기 ${moraleLabel(avgMorale(USER))}</span></span>
      <button class="btn btn-sm" ${meetingReady()?'':'disabled'} onclick="FM.teamMeeting()" title="${meetingReady()?'10경기에 한 번':`${10-(userGamesPlayed()-f.lastMeeting)}경기 후 가능`}">팀 미팅</button></div>
    ${feed.map(x=>`<article class="feed-item" onclick="App.tab('feed')"><time>${x.year} · ${kind(x)}</time><p>${esc(x.title)}</p></article>`).join('')
      || '<p class="muted" style="margin-top:14px;font-size:13px">경기를 치르면 경기 리포트가 여기에 쌓입니다.</p>'}
    ${feed.length?`<button class="btn btn-quiet btn-sm" style="margin-top:8px" onclick="App.tab('feed')">${icon('feed')}피드 전체 보기</button>`:''}
  </section>`;
}
function dashCards(){ return dashCards0() + feedCard(); }
function dashCards0(){
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
    ${open&&(left>0||state.phase==='stove')? `<div style="overflow-x:auto"><table><thead><tr><th class="name">후보</th><th>POS</th><th>나이</th><th>OVR</th><th>능력</th><th>연봉</th><th></th></tr></thead><tbody>
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
  if(!profKey||profKey[0]!==team||profKey[1]!==name) profTab='overview';
  profKey=[team,name];
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
    ? ((s&&s.AB>0)? `<div class="kpi"><div class="k"><div class="v">${fmtAvg(s.H/s.AB)}</div><div class="l">타율</div></div><div class="k"><div class="v">${s.HR}</div><div class="l">홈런</div></div><div class="k"><div class="v">${s.RBI}</div><div class="l">타점</div></div><div class="k"><div class="v">${fmtAvg((s.H+s.BB+s.HBP)/(s.AB+s.BB+s.HBP+(s.SF||0)))}</div><div class="l">출루율</div></div><div class="k"><div class="v">${s.G}</div><div class="l">경기</div></div></div>` : '<div class="muted">이번 시즌 출전 기록 없음</div>')
    : ((s&&s.G>0)? `<div class="kpi"><div class="k"><div class="v">${fmtEra(s.ER,s.OUT)}</div><div class="l">평균자책</div></div><div class="k"><div class="v">${s.W}-${s.L}</div><div class="l">승-패</div></div><div class="k"><div class="v">${s.SV}</div><div class="l">세이브</div></div><div class="k"><div class="v">${ipStr(s.OUT)}</div><div class="l">이닝</div></div><div class="k"><div class="v">${s.SO}</div><div class="l">탈삼진</div></div></div>` : '<div class="muted">이번 시즌 등판 기록 없음</div>');
  const form = rt&&rt.last.length? rt.last.map(r=>`<span class="pill" style="background:${rtColor(r)}33;color:${rtColor(r)};font-size:13px">${r.toFixed(1)}</span>`).join(' ') : '<span class="muted">기록 없음</span>';
  const c=Math.round(K.cond(p));
  const resting=mine&&fm().restNext.indexOf(name)>=0, farm=isFarm(team,p), tr=trOf(p), block=farm? promoteBlock(p) : '';
  const fl=futLine(p);
  const actions = mine&&farm? `<div class="row" style="margin-top:14px;gap:6px">
      <button class="btn primary" ${block?`disabled title="${esc(block)}"`:''} onclick="FM.promote('${q(name)}')">1군 등록</button>
      <button class="btn" onclick="FM.talk('${q(name)}','praise')">👏 칭찬하기</button>
      <button class="btn" onclick="App.closeModal();App.tab('train')">훈련 설정</button></div>
      ${block?`<div class="hint">${esc(block)}</div>`:''}`
    : mine? `<div class="row" style="margin-top:14px;gap:6px">
      <button class="btn" onclick="FM.talk('${q(name)}','praise')">👏 칭찬하기</button>
      <button class="btn" onclick="FM.talk('${q(name)}','scold')">😤 질책하기</button>
      <button class="btn" onclick="FM.toggleRest('${q(name)}')">${resting?'↩ 휴식 취소':'🛌 다음 경기 휴식'}</button>
      <button class="btn" onclick="FM.toggleList('${q(name)}')">${p.listed?'📋 트레이드 리스트 해제':'📋 트레이드 리스트 등록'}</button>
      <button class="btn" onclick="FM.demote('${q(name)}')">2군으로</button>
      <button class="btn" onclick="FM.releasePlayer('${q(name)}')">📤 방출</button></div>` : '';
  modal(`<span class="closeX" onclick="App.closeModal()">×</span>
    <div class="row" style="align-items:center;gap:16px;flex-wrap:wrap">
      <div style="width:64px;height:64px;border-radius:50%;background:conic-gradient(${ratColor(o)} ${o}%, var(--panel2) 0);display:flex;align-items:center;justify-content:center">
        <div style="width:52px;height:52px;border-radius:50%;background:var(--panel);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:${ratColor(o)}">${o}</div></div>
      <div style="flex:1;min-width:200px"><h2 style="margin:0">${esc(name)}${p.rookie?' <span class="pill pos">신인</span>':''}</h2>
        <div class="muted">${teamDot(team)} ${K.ROSTERS[team].name}${farm?' <span class="chip">2군</span>':''} · ${p.age}세 · ${posFull(p.pos||p.role)}</div>
        <div class="muted" style="font-size:12px;margin-top:2px">성격: <b style="color:var(--txt)">${pers(p).k}</b> — ${pers(p).d}</div></div>
    </div>
    <div class="kpi" style="margin:14px 0">
      <div class="k"><div class="v" style="font-size:18px">${K.isInjured(p)?`🩹 ${p.inj}경기`:c+'%'}</div><div class="l">${K.isInjured(p)?'부상 결장':'컨디션'}</div></div>
      <div class="k"><div class="v" style="font-size:18px">${moraleFace(K.mor(p))} ${moraleLabel(K.mor(p))}</div><div class="l">사기</div></div>
      <div class="k"><div class="v" style="font-size:18px">${p.sal}억 · ${p.expiring?'만료':p.yrs+'년'}</div><div class="l">연봉 · 계약</div></div>
      <div class="k"><div class="v" style="font-size:18px">${marketValue(p)}억</div><div class="l">시장 가치</div></div>
      <div class="k"><div class="v" style="font-size:18px">${avgRt}</div><div class="l">평균 평점</div></div>
      <div class="k"><div class="v" style="font-size:18px">${starHTML(p)}</div><div class="l">잠재력</div></div></div>
    ${mine? `<div class="hint" style="margin:-4px 0 12px">훈련: <b>${TR_FOCUS[p.type][tr.f].l}</b> · 강도 ${TR_INT[tr.i].l} · 성장 가능성 ${growLabel(growChance(team,p))[0]} · ${state.year} 성장 +${(p.grow||[]).filter(g=>g[0]===state.year).length}${fl? ' · '+fl : ''}</div>` : ''}
    <div class="tabsm" style="margin-bottom:12px">${[['overview','개요'],['season',state.year+' 시즌'],['career','통산 기록'],['log','최근 경기']].map(([k,l])=>`<button class="${profTab===k?'active':''}" onclick="FM.profileTab('${k}')">${l}</button>`).join('')}</div>
    ${profTab==='season'? seasonPanel(team,p) : profTab==='career'? careerPanel(team,p) : profTab==='log'? logPanel(team,p) : `
    <div class="grid" style="grid-template-columns:1fr auto;gap:14px;align-items:start" id="profgrid">
      <div>${attrs}<div class="hint">능력치 1~20 (FM 스케일) · 16+ 최상급, 11~15 준수, 6~10 평범, 5 이하 약점</div></div>
      <div style="text-align:center">${rad}</div></div>
    <style>@media(max-width:640px){#profgrid{grid-template-columns:1fr!important}}</style>
    <div class="muted" style="font-weight:700;margin:12px 0 6px">포지션 적합도</div><div class="row" style="gap:4px">${posStars(p)}</div>
    <div class="muted" style="font-weight:700;margin:14px 0 6px">최근 5경기 평점</div><div class="row" style="gap:4px">${form}</div>
    <div class="muted" style="font-weight:700;margin:14px 0 6px">${state.year} 시즌 성적</div>${statLine}`}
    ${actions}`);
}

// ---------- 리그 달력: 트레이드 마감 · 올스타 휴식기 · 신인 드래프트 ----------
// The schedule has no dates, so game days are laid on a calendar: opening day 3/28, six game
// days a week, and a four-day All-Star break from 7/10. That puts the 7/31 trade deadline
// around game 104 and the season's end in mid-September.
const SEASON_START=[3,28], ALLSTAR=[7,10], ALLSTAR_DAYS=4, DEADLINE=[7,31], DRAFT_ROUNDS=4, DRAFT_POOL=60;
function baseDate(day){ return new Date(state.year, SEASON_START[0]-1, SEASON_START[1]+Math.floor(day*7/6)); }
function allStarDate(){ return new Date(state.year, ALLSTAR[0]-1, ALLSTAR[1]); }
function calDate(day){ const d=baseDate(day); if(d>=allStarDate()) d.setDate(d.getDate()+ALLSTAR_DAYS); return d; }
function dateLabel(d){ return `${d.getMonth()+1}월 ${d.getDate()}일`; }
function nextUserGame(){ return state.schedule.find(g=>!g.played&&(g.home===USER||g.away===USER)); }
function today(){ const g=nextUserGame(), last=state.schedule[state.schedule.length-1]; return calDate(g? g.day : last? last.day : 0); }
function tradeWindow(){
  if(state.phase==='postseason') return {open:false, msg:'포스트시즌 중에는 트레이드할 수 없습니다.'};
  if(state.phase!=='regular') return {open:true, daysLeft:null};
  const left=Math.round((new Date(state.year, DEADLINE[0]-1, DEADLINE[1])-today())/864e5);
  return left>=0? {open:true, daysLeft:left} : {open:false, daysLeft:left, msg:`트레이드 마감일(${DEADLINE[0]}월 ${DEADLINE[1]}일)이 지났습니다. 시즌이 끝나면 다시 열립니다.`};
}
function tradeTag(){ const w=tradeWindow();
  return !w.open? '트레이드 마감' : w.daysLeft==null? '스토브리그 · 자유롭게 협상' : w.daysLeft<=14? `마감 D-${w.daysLeft} (${DEADLINE[0]}/${DEADLINE[1]})` : `마감 ${DEADLINE[0]}월 ${DEADLINE[1]}일`; }
// after each of the user's regular-season games: deadline notices and the All-Star break
function leagueCalendar(){
  if(state.phase!=='regular') return;
  const f=fm(); if(!f.cal||f.cal.year!==state.year) f.cal={year:state.year};
  const c=f.cal, w=tradeWindow();
  if(w.open && w.daysLeft!=null && w.daysLeft<=14 && !c.warn){ c.warn=1;
    send('단장','⏳',`트레이드 마감 D-${w.daysLeft}`, `${DEADLINE[0]}월 ${DEADLINE[1]}일이 트레이드 마감입니다. 마감이 다가오면 다른 구단의 제안이 늘어납니다.\n보강이 필요한 자리가 있다면 지금 움직이셔야 합니다. 마감 뒤에는 시즌이 끝날 때까지 트레이드할 수 없습니다.`, []); }
  if(!w.open && !c.closed){ c.closed=1;
    f.inbox.forEach(m=>{ if(!m.done&&m.actions.some(a=>a.fn==='acceptTrade')){ m.done=true; m.result='트레이드 마감으로 제안이 무효가 되었습니다.'; } });
    send('단장','🔒','트레이드 마감', `트레이드 시장이 닫혔습니다. 남은 시즌은 지금 선수단과 2군으로 치릅니다.`, []); }
  const g=nextUserGame();
  if(!c.allstar && g && baseDate(g.day)>=allStarDate()){ c.allstar=1; allStarBreak(); }
}
// the best bat at each position and the five best arms, league-wide, then four days of rest
function allStarBreak(){
  const ops=x=>(x.H+x.BB+x.HBP)/Math.max(1,x.AB+x.BB+x.HBP)+(x.H+x._2B+2*x._3B+3*x.HR)/Math.max(1,x.AB);
  const bats=[], arms=[];
  K.TEAM_IDS.forEach(t=>{ const s=state.season[t];
    for(const n in s.bat){ const p=findPlayer(t,n); if(p&&p.type==='B'&&s.bat[n].PA>=120) bats.push({t,p,v:ops(s.bat[n])}); }
    for(const n in s.pit){ const p=findPlayer(t,n), x=s.pit[n]; if(p&&p.type==='P'&&x.OUT>=150) arms.push({t,p,v:x.ER*27/x.OUT}); } });
  const pick=[];
  ['C','1B','2B','3B','SS','LF','CF','RF'].forEach(pos=>{ const b=bats.filter(x=>x.p.pos===pos&&pick.indexOf(x)<0).sort((a,b)=>b.v-a.v)[0]; if(b){ b.slot=pos; pick.push(b); } });
  const dh=bats.filter(x=>pick.indexOf(x)<0).sort((a,b)=>b.v-a.v)[0]; if(dh){ dh.slot='지명'; pick.push(dh); }
  const ace=arms.sort((a,b)=>a.v-b.v).slice(0,5);
  const all=pick.concat(ace), ours=all.filter(x=>x.t===USER);
  ours.forEach(x=>addMor(x.p,6));
  K.TEAM_IDS.forEach(t=>allPlayers(t).concat(farmOf(t)).forEach(p=>{ p.cond=Math.min(100,K.cond(p)+30); if(p.inj>0) p.inj=Math.max(0,p.inj-ALLSTAR_DAYS); }));
  send('KBO','⭐',`${state.year} 올스타 휴식기`,
    `팬 투표와 감독 추천으로 올스타가 확정됐습니다.\n\n` +
    pick.map(x=>`• ${x.slot} ${x.p.n} (${x.t}, OPS ${x.v.toFixed(3)})`).join('\n') + '\n' +
    ace.map(x=>`• 투수 ${x.p.n} (${x.t}, ERA ${x.v.toFixed(2)})`).join('\n') +
    `\n\n${ours.length? `우리 팀에서 ${ours.map(x=>x.p.n).join(', ')}이(가) 뽑혀 사기가 올랐습니다.` : '우리 팀에서는 올스타가 나오지 않았습니다.'}\n` +
    `${ALLSTAR_DAYS}일 휴식으로 모든 선수의 컨디션이 회복되고, 부상 선수는 회복이 ${ALLSTAR_DAYS}경기만큼 당겨집니다.`, []);
}

// rookie draft: opens when the regular season ends, picks in reverse standings for four rounds.
// Prospects show a scout's estimate of their potential (within ±4), not the real figure.
function draftState(){ const d=fm()&&fm().draft; return d&&d.year===state.year? d : null; }
function draftOnClock(d){ return d.order[d.pick%d.order.length]; }
function draftDone(d){ return d.pick>=d.order.length*DRAFT_ROUNDS; }
function estPot(p){ return clampN(p.pot+(hash(p.n+'scout')%9)-4, 50, 96); }
function makeProspect(used){
  const type=Math.random()<0.5?'P':'B', p=makeRookie(type, type==='P'&&Math.random()<0.45?'SP':undefined);
  while(used.has(p.n)) p.n=newName();
  used.add(p.n); p.pers=hash(p.n)%PERS.length;
  const college=Math.random()<0.35, tier=Math.random();
  const bump=tier>0.93? R(6,10) : tier>0.75? R(3,6) : tier>0.4? R(0,3) : R(-3,0);
  p.age=college? R(22,23) : R(18,19); p.college=college;
  (type==='B'?['con','pow','eye','spd','fld','arm']:['stu','ctl','mov']).forEach(k=>p[k]=clampN(p[k]+bump+(college?2:0),35,88));
  ensurePlayer(p); p.pot=Math.min(96,p.pot+Math.max(0,bump)); p.yrs=3; p.sal=bump>=6? 0.5 : 0.3;
  return p;
}
function openDraft(){
  if(draftState()) return;
  const order=standings().map(x=>x.t).reverse(), used=allNames(), pool=[];
  for(let i=0;i<DRAFT_POOL;i++) pool.push(makeProspect(used));
  const picks={}; order.forEach(t=>picks[t]=[]);
  fm().draft={year:state.year, order, pick:0, pool, picks, log:[]};
  send('KBO','🎓',`${state.year+1} KBO 신인 드래프트`,
    `정규시즌 순위의 역순으로 ${DRAFT_ROUNDS}라운드를 지명합니다. 우리 구단은 ${order.indexOf(USER)+1}번째로 지명합니다.\n` +
    `스카우트 평가(잠재력 별점)는 추정치라 실제와 조금 다를 수 있습니다. 지명한 선수는 다음 시즌 2군에 합류합니다.\n` +
    `다음 시즌을 시작할 때까지 지명을 마치지 않으면 스카우트 팀이 대신 지명합니다.`, [{label:'드래프트 회의장으로', fn:'openDraft'}]);
  draftRun();
}
function draftScore(p,t,d){ const mine=d.picks[t], nb=mine.filter(x=>x.type==='B').length, np=mine.length-nb;
  return estPot(p)*0.65+K.ovr(p)*0.35+(p.type==='B'? (nb>np?-3:2) : (np>nb?-3:2))+(t===USER?0:(hash(p.n+t)%7)*0.5); }
function draftTake(d,t,p){ d.pool.splice(d.pool.indexOf(p),1); d.picks[t].push(p);
  d.log.push({r:Math.floor(d.pick/d.order.length)+1, no:d.pick+1, t, n:p.n, type:p.type, pos:p.pos||p.role}); d.pick++; }
function draftBest(d,t){ return d.pool.slice().sort((a,b)=>draftScore(b,t,d)-draftScore(a,t,d))[0]; }
// AI clubs pick until it's the user's turn or the draft is over
function draftRun(){ const d=draftState(); if(!d) return; while(!draftDone(d) && draftOnClock(d)!==USER){ const t=draftOnClock(d); draftTake(d,t,draftBest(d,t)); } }
function draftPick(n){ const d=draftState(); if(!d||draftDone(d)||draftOnClock(d)!==USER) return;
  const p=d.pool.find(x=>x.n===n); if(!p) return; draftTake(d,USER,p); draftRun(); showDraft(); render(); }
function draftAuto(){ const d=draftState(); if(!d) return;
  while(!draftDone(d)){ if(draftOnClock(d)===USER) draftTake(d,USER,draftBest(d,USER)); else draftRun(); } }
let draftFilter='all', draftSort='pot';
function draftView(f,s){ if(f) draftFilter=f; if(s) draftSort=s; showDraft(); }
function showDraft(){
  const d=draftState(); if(!d){ notify('진행 중인 드래프트가 없습니다.'); return; }
  const done=draftDone(d), onClock=!done&&draftOnClock(d)===USER, rnd=Math.min(DRAFT_ROUNDS,Math.floor(d.pick/d.order.length)+1);
  const key=p=>draftSort==='ovr'? K.ovr(p) : estPot(p)*10+K.ovr(p)/10;
  const list=d.pool.filter(p=>draftFilter==='all'||p.type===draftFilter).sort((a,b)=>key(b)-key(a)).slice(0,30);
  const attrs=p=>p.type==='B'? `컨${attr20(p.con)} 파${attr20(p.pow)} 선${attr20(p.eye)} 주${attr20(p.spd)} 수${attr20(p.fld)}` : `구${attr20(p.stu)} 제${attr20(p.ctl)} 무${attr20(p.mov)} 체${attr20(p.sta)}`;
  const rows=list.map(p=>`<tr><td class="name"><b>${esc(p.n)}</b> <span class="muted">${p.age}세 · ${p.college?'대졸':'고졸'}</span></td>
    <td>${posFull(p.pos||p.role)}</td><td><b>${K.ovr(p)}</b></td><td>${starHTML({pot:estPot(p)})}</td><td style="font-size:12px;white-space:nowrap">${attrs(p)}</td>
    <td>${onClock? `<button class="btn btn-sm primary" onclick="FM.draftPick('${q(p.n)}')">지명</button>` : ''}</td></tr>`).join('');
  const recent=d.log.slice(-8).reverse().map(x=>`<div style="font-size:12px">${x.r}R ${x.no}번 · ${teamDot(x.t)} ${x.t} — ${esc(x.n)} <span class="muted">(${posFull(x.pos)})</span></div>`).join('')||'<div class="muted">아직 지명이 없습니다.</div>';
  const mine=d.picks[USER].map((p,i)=>`<div style="font-size:12px">${i+1}R · <b>${esc(p.n)}</b> <span class="muted">${posFull(p.pos||p.role)} · OVR ${K.ovr(p)}</span> ${starHTML({pot:estPot(p)})}</div>`).join('')||'<div class="muted">아직 없음</div>';
  const fb=(v,l)=>`<button class="btn btn-sm ${draftFilter===v?'primary':''}" onclick="FM.draftView('${v}')">${l}</button>`;
  const sb=(v,l)=>`<button class="btn btn-sm ${draftSort===v?'primary':''}" onclick="FM.draftView(null,'${v}')">${l}</button>`;
  modal(`<span class="closeX" onclick="App.closeModal()">×</span><h2>🎓 ${state.year+1} KBO 신인 드래프트</h2>
    <div class="muted">${done? '지명이 모두 끝났습니다.' : onClock? `<b style="color:var(--accent)">${rnd}라운드 · 우리 차례입니다</b>` : `${rnd}라운드 진행 중`} · 우리 지명 ${d.picks[USER].length}/${DRAFT_ROUNDS}</div>
    <div class="grid" style="grid-template-columns:minmax(0,1fr);gap:12px;margin-top:10px">
      ${done? '' : `<div class="row" style="gap:6px;flex-wrap:wrap">${fb('all','전체')}${fb('B','타자')}${fb('P','투수')}<span class="muted" style="margin:0 4px">|</span>${sb('pot','잠재력순')}${sb('ovr','현재 능력순')}
        <button class="btn btn-sm" style="margin-left:auto" onclick="FM.draftAuto();render();FM.showDraft()">남은 지명 스카우트에게 맡기기</button></div>
      <div style="overflow-x:auto;max-height:360px"><table class="stat-table"><thead><tr><th class="name">선수</th><th>포지션</th><th>OVR</th><th>잠재력(추정)</th><th>능력치</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`}
      <div class="grid cols2" style="gap:12px"><div><div class="muted" style="font-weight:700;margin-bottom:4px">우리 지명</div>${mine}</div>
        <div><div class="muted" style="font-weight:700;margin-bottom:4px">최근 지명</div>${recent}</div></div>
    </div>`);
}
ACTIONS.openDraft=()=>{ setTimeout(showDraft,0); return '드래프트 회의장으로 이동했습니다.'; };

// ---------- 2군 (퓨처스리그) ----------
// Each club keeps a farm squad in K.ROSTERS[t].farm, which the game engine never sees.
// The user's farm plays one Futures game for every 1군 game in the regular season, and
// every club calls players up from its farm when injuries thin out the 1군.
const ENTRY_MAX=28, MIN_1B=12, MIN_1P=11, DOWN_GAMES=10, FARM_CAP=30;
function farmOf(t){ const r=K.ROSTERS[t]; if(!r.farm) r.farm=[]; return r.farm; }
function isFarm(t,p){ return farmOf(t).indexOf(p)>=0; }
function entryCount(t){ const r=K.ROSTERS[t]; return r.batters.length+r.pitchers.length; }
// would the 1군 still be legal after outP leave and inP arrive? Only a change that makes a
// shortfall (or the overflow) worse is refused, so a club already short can still swap evenly.
function entryProblem(t, outP, inP, who){
  const before=allPlayers(t), after=before.filter(p=>outP.indexOf(p)<0).concat(inP);
  const cnt=ps=>({b:ps.filter(p=>p.type==='B').length, p:ps.filter(p=>p.type==='P').length, sp:ps.filter(p=>p.type==='P'&&p.role==='SP').length, n:ps.length});
  const a=cnt(after), b=cnt(before); who=who||'';
  if(a.b<MIN_1B && a.b<b.b) return `${who}1군 타자가 ${a.b}명으로 줄어듭니다 (최소 ${MIN_1B}명).`;
  if(a.p<MIN_1P && a.p<b.p) return `${who}1군 투수가 ${a.p}명으로 줄어듭니다 (최소 ${MIN_1P}명).`;
  if(a.sp<5 && a.sp<b.sp) return `${who}선발투수가 ${a.sp}명으로 줄어듭니다 (최소 5명).`;
  if(a.n>ENTRY_MAX && a.n>b.n) return `${who}1군 엔트리가 ${a.n}명이 됩니다 (최대 ${ENTRY_MAX}명). 먼저 다른 선수를 2군으로 내리세요.`;
  return '';
}
// a new signing joins the 1군 when there is room, otherwise the farm
function joinClub(t,p){
  const r=K.ROSTERS[t];
  if(entryCount(t)<ENTRY_MAX){ (p.type==='B'?r.batters:r.pitchers).push(p); return '1군'; }
  farmOf(t).push(p); return '2군';
}
// an injured player goes off the entry to make room for a call-up
function clearSpot(t,type){
  const r=K.ROSTERS[t], hurt=(type==='B'?r.batters:r.pitchers).filter(p=>K.isInjured(p))
    .concat((type==='B'?r.pitchers:r.batters).filter(p=>K.isInjured(p))).sort((a,b)=>b.inj-a.inj)[0];
  if(!hurt) return null;
  const arr=hurt.type==='B'?r.batters:r.pitchers; arr.splice(arr.indexOf(hurt),1); farmOf(t).push(hurt);
  if(t===USER){ hurt.downUg=userGamesAll(); hurt.downYear=state.year; }
  if(state.cfgs[t]) repairCfg(t);
  return hurt;
}
function farmFromRow(row){
  const [n,type,pos,age,sal,a,b,c,d,e,g]=row;
  return type==='B'? {n,type,pos,age,sal,con:a,pow:b,eye:c,spd:d,fld:e,arm:g} : {n,type,role:pos,age,sal,stu:a,ctl:b,mov:c,sta:d};
}
// top a farm squad up to a playable Futures roster with development players
function fillFarm(t){
  const f=farmOf(t), nb=()=>f.filter(p=>p.type==='B'), np=()=>f.filter(p=>p.type==='P');
  while(nb().filter(p=>p.pos==='C').length<2) f.push(makeRookie('B','C'));
  while(nb().length<12) f.push(makeRookie('B'));
  while(np().filter(p=>p.role==='SP').length<5) f.push(makeRookie('P','SP'));
  while(np().length<12) f.push(makeRookie('P','RP'));
  f.forEach(ensurePlayer);
}
function seedFarm(t){
  const used=allNames(), f=farmOf(t);
  ((window.KBO_FARM||{})[t]||[]).forEach(row=>{ if(used.has(row[0])) return; f.push(farmFromRow(row)); used.add(row[0]); });
  fillFarm(t);
}
// a Futures club needs nine healthy bats, five healthy arms and a healthy starter; the
// development squad fills any gap (the farm is trimmed back to size in the offseason)
function farmTopUp(t){
  const f=farmOf(t), ok=p=>!K.isInjured(p), add=(type,pos)=>{ const p=makeRookie(type,pos); ensurePlayer(p); f.push(p); };
  while(f.filter(p=>p.type==='B'&&ok(p)).length<9) add('B');
  while(f.filter(p=>p.type==='P'&&p.role==='SP'&&ok(p)).length<1) add('P','SP');
  while(f.filter(p=>p.type==='P'&&ok(p)).length<5) add('P','RP');
}
function futures(){ const f=fm(); if(!f.fut||f.fut.year!==state.year) f.fut={year:state.year,W:0,L:0,T:0,g:0,bat:{},pit:{},log:[]}; return f.fut; }
// one Futures game for the user's farm against another club's farm. The two squads are
// mounted as temporary rosters so the normal engine (lineups, fatigue, injuries) runs them.
function farmGame(){
  const fu=futures(), others=K.TEAM_IDS.filter(t=>t!==USER), opp=others[fu.g%others.length];
  const H='F_'+USER, A='F_'+opp, RS=K.ROSTERS;
  const mount=t=>({name:RS[t].name+' 2군', color:RS[t].color, batters:farmOf(t).filter(p=>p.type==='B'), pitchers:farmOf(t).filter(p=>p.type==='P')});
  // the clubs sitting out rest a day, so injured farmhands heal whether or not they play
  others.filter(t=>t!==opp).forEach(t=>{ const id='F_'+t; RS[id]=mount(t); try{ K.applyFatigue(id,null); } finally { delete RS[id]; } });
  [USER,opp].forEach(farmTopUp);
  RS[H]=mount(USER); RS[A]=mount(opp);
  try{
    const cfg=id=>{ const d=K.defaultLineup(id), healthy=n=>{ const p=RS[id].pitchers.find(x=>x.n===n); return p&&!K.isInjured(p); };
      const rot=d.rotation.filter(healthy), spare=RS[id].pitchers.filter(p=>!K.isInjured(p)).sort((a,b)=>K.cond(b)*b.sta-K.cond(a)*a.sta)[0];
      const spName=rot.length? rot[fu.g%rot.length] : spare.n;
      return K.restAdjust(id,{teamId:id, lineup:d.lineup, positions:d.positions, rotation:d.rotation, bullpen:d.bullpen.filter(n=>n!==spName), closer:d.closer===spName?d.bullpen.find(n=>n!==spName):d.closer, spName},{restBelow:65}); };
    const home=fu.g%2===0, res=K.simGame(home?cfg(H):cfg(A), home?cfg(A):cfg(H), {maxInnings:9});
    K.applyFatigue(H,res.box); K.applyFatigue(A,res.box);
    const bx=res.box[H], add=(dst,src)=>{ for(const k in src) if(typeof src[k]==='number') dst[k]=(dst[k]||0)+src[k]; };
    for(const n in bx.bat){ const s=fu.bat[n]||(fu.bat[n]={G:0}); add(s,bx.bat[n]); if(bx.bat[n].PA>0) s.G++; }
    for(const n in bx.pit){ add(fu.pit[n]||(fu.pit[n]={}), bx.pit[n]); }
    const us=home?res.homeRuns:res.awayRuns, th=home?res.awayRuns:res.homeRuns;
    if(us>th) fu.W++; else if(us<th) fu.L++; else fu.T++;
    fu.g++; fu.log.unshift({opp, us, th, home}); fu.log.length=Math.min(fu.log.length,10);
    return res;
  } finally { delete RS[H]; delete RS[A]; }
}
function futLine(p){
  const fu=fm()&&fm().fut&&fm().fut.year===state.year? fm().fut : null; if(!fu) return '';
  if(p.type==='B'){ const s=fu.bat[p.n]; if(!s||!s.AB) return ''; return `퓨처스 ${s.G}경기 타율 ${fmtAvg(s.H/s.AB)} ${s.HR}홈런 OPS ${opsOf(s).toFixed(3)}`; }
  const s=fu.pit[p.n]; if(!s||!s.OUT) return ''; return `퓨처스 ${s.G||0}경기 ${ipStr(s.OUT)}이닝 ERA ${fmtEra(s.ER,s.OUT)} ${s.SO}탈삼진`;
}
function opsOf(s){ const pa=s.AB+(s.BB||0)+(s.HBP||0)+(s.SF||0), tb=s.H+(s._2B||0)+2*(s._3B||0)+3*(s.HR||0);
  return (pa? (s.H+(s.BB||0)+(s.HBP||0))/pa : 0) + (s.AB? tb/s.AB : 0); }
// KBO rule: a player taken off the 1군 entry can't be re-registered for 10 days
function userGamesAll(){ const ps=state.postseason; return userGamesPlayed()+(ps&&ps.gc? ps.gc[USER]||0 : 0); }
function downLeft(p){ if(p.downYear!==state.year||p.downUg==null) return 0; return Math.max(0, DOWN_GAMES-(userGamesAll()-p.downUg)); }
function promoteBlock(p){
  if(K.isInjured(p)) return `부상 중인 선수는 1군에 등록할 수 없습니다 (회복 ${p.inj}경기).`;
  if(entryCount(USER)>=ENTRY_MAX) return `1군 엔트리가 가득 찼습니다 (${ENTRY_MAX}명). 먼저 다른 선수를 2군으로 내리세요.`;
  const left=downLeft(p); if(left) return `말소 후 ${DOWN_GAMES}경기가 지나야 다시 등록할 수 있습니다 (${left}경기 남음).`;
  return '';
}
function doPromote(t,p){
  const f=farmOf(t); f.splice(f.indexOf(p),1);
  const r=K.ROSTERS[t]; (p.type==='B'?r.batters:r.pitchers).push(p);
  p.bench=0; if(p.upMorY!==state.year){ addMor(p,8); p.upMorY=state.year; }
  if(p.type==='P' && p.role!=='SP'){ const c=state.cfgs[t]; if(c.bullpen.indexOf(p.n)<0) c.bullpen.push(p.n); }
}
function promote(n){
  const p=farmOf(USER).find(x=>x.n===n); if(!p) return;
  const why=promoteBlock(p); if(why){ notify(why); return; }
  doPromote(USER,p);
  notify(`${n} 1군 등록 (엔트리 ${entryCount(USER)}/${ENTRY_MAX})`);
  closeModal(); render();
}
function demote(n){
  const r=K.ROSTERS[USER], p=findPlayer(USER,n); if(!p||isFarm(USER,p)) return;
  const isB=p.type==='B', arr=isB?r.batters:r.pitchers;
  if(isB && arr.length<=MIN_1B){ notify(`1군 타자는 최소 ${MIN_1B}명이 필요합니다. 2군 선수를 먼저 올리세요.`); return; }
  if(!isB && arr.length<=MIN_1P){ notify(`1군 투수는 최소 ${MIN_1P}명이 필요합니다. 2군 선수를 먼저 올리세요.`); return; }
  if(!isB && p.role==='SP' && arr.filter(x=>x.role==='SP').length<=5){ notify('선발투수가 5명 아래로 줄어듭니다. 2군 선발을 먼저 올리세요.'); return; }
  arr.splice(arr.indexOf(p),1); farmOf(USER).push(p);
  const inSeason=state.phase==='regular'||state.phase==='postseason';
  if(inSeason){ p.downUg=userGamesAll(); p.downYear=state.year; }
  p.listed=false; p.bench=0; addMor(p, p.age>=30? -10 : -5);
  const f=fm(); f.restNext=f.restNext.filter(x=>x!==n); f.promises=f.promises.filter(pr=>pr.n!==n);
  repairCfg(USER);
  notify(`${n} 2군행${inSeason? ` · ${DOWN_GAMES}경기 뒤 재등록 가능`:''}`);
  closeModal(); render();
}
// after a player leaves the 1군: fill his lineup slot, rotation turn and bullpen role
function repairCfg(t){
  const c=state.cfgs[t], R0=K.ROSTERS[t], B=new Set(R0.batters.map(p=>p.n)), P=new Set(R0.pitchers.map(p=>p.n));
  for(let i=0;i<c.lineup.length;i++){
    if(B.has(c.lineup[i])) continue;
    const spot=(c.positions||[])[i], fit=b=>K.batValue(b)-(spot&&spot!=='DH'? K.posFit(b,spot)*1.6 : 0);
    const sub=R0.batters.filter(b=>c.lineup.indexOf(b.n)<0&&!K.isInjured(b)).sort((a,b)=>fit(b)-fit(a))[0];
    if(sub) c.lineup[i]=sub.n;
  }
  for(let i=0;i<c.rotation.length;i++){
    if(P.has(c.rotation[i])) continue;
    const sub=R0.pitchers.filter(p=>c.rotation.indexOf(p.n)<0&&p.n!==c.closer).sort((a,b)=>(b.role==='SP')-(a.role==='SP')||K.ovr(b)-K.ovr(a))[0];
    if(sub){ c.rotation[i]=sub.n; c.bullpen=c.bullpen.filter(n=>n!==sub.n); }
  }
  c.bullpen=c.bullpen.filter(n=>P.has(n));
  if(!P.has(c.closer)) c.closer=c.bullpen[0];
}
// monthly note from the Futures manager, with the hottest bat and arm ready to call up
function farmReport(){
  const fu=futures(), f=farmOf(USER);
  const bats=f.filter(p=>p.type==='B'&&fu.bat[p.n]&&fu.bat[p.n].PA>=30).sort((a,b)=>opsOf(fu.bat[b.n])-opsOf(fu.bat[a.n]));
  const arms=f.filter(p=>p.type==='P'&&fu.pit[p.n]&&fu.pit[p.n].OUT>=30).sort((a,b)=>fu.pit[a.n].ER/fu.pit[a.n].OUT-fu.pit[b.n].ER/fu.pit[b.n].OUT);
  const picks=[bats[0],arms[0]].filter(Boolean); if(!picks.length) return;
  send('2군 감독','🧢',`퓨처스 월간 보고 (${fu.W}승 ${fu.L}패 ${fu.T}무)`,
    `2군에서 눈에 띄는 선수를 보고드립니다.\n\n${picks.map(p=>`• ${p.n} (${p.age}세, ${posFull(p.pos||p.role)}, OVR ${K.ovr(p)}, 잠재력 ${starText(p)})\n  ${futLine(p)}`).join('\n')}\n\n1군 엔트리 ${entryCount(USER)}/${ENTRY_MAX}명.`,
    picks.map(p=>({label:`${p.n} 1군 등록`, fn:'promote', arg:{n:p.n}})).concat([{label:'2군에서 더 지켜본다', fn:'ok'}]));
}
ACTIONS.promote=(m,a)=>{ const p=farmOf(USER).find(x=>x.n===a.n); if(!p) return '이미 1군에 있거나 팀을 떠난 선수입니다.';
  const why=promoteBlock(p); if(why) return '❌ '+why; doPromote(USER,p); return `${a.n}을(를) 1군에 등록했습니다 (엔트리 ${entryCount(USER)}/${ENTRY_MAX}).`; };

// offseason: draftees join the farm, the 1군 is filled to minimum from the farm, old farmhands retire
function offseasonFarm(t){
  const f=farmOf(t), r=K.ROSTERS[t];
  const retired=[]; for(let i=f.length-1;i>=0;i--){ const p=f[i]; if(p.age>=37 || (p.age>=33&&K.ovr(p)<66)){ retired.push(p.n); f.splice(i,1); } }
  f.forEach(p=>{ p.cond=100; p.inj=0; p.bench=0; });
  // one at a time, so each draftee's name is checked against the ones drafted before him
  // the club's draft picks, or (saves from before the draft existed) four generated rookies
  const dr=draftState(), picked=dr&&dr.picks[t];
  const draft= picked&&picked.length? picked.map(p=>{ ensurePlayer(p); f.push(p); return p; })
    : [['B'],['B'],['P','SP'],['P']].map(([type,pos])=>{ const p=makeRookie(type,pos); ensurePlayer(p); f.push(p); return p; });
  const best=(type,role)=>f.filter(p=>p.type===type&&(!role||p.role===role)).sort((a,b)=>K.ovr(b)-K.ovr(a))[0];
  const up=[], lift=(type,role)=>{ const p=best(type,role)||makeRookie(type,role); if(f.indexOf(p)<0) f.push(p); doPromote(t,p); up.push(p); };
  while(r.batters.length<MIN_1B) lift('B');
  while(r.pitchers.filter(p=>p.role==='SP').length<5) lift('P','SP');
  while(r.pitchers.length<MIN_1P) lift('P');
  const cut=[]; while(f.length>FARM_CAP){ let w=0; f.forEach((p,i)=>{ if(playerValue(p)<playerValue(f[w])) w=i; }); cut.push(f.splice(w,1)[0].n); }
  fillFarm(t);
  return {draft:draft.filter(p=>f.indexOf(p)>=0), up, retired, cut};
}

// ---------- 육성 · 훈련 ----------
// Every 6 regular-season games each of the user's players (1군 and 2군) may gain a point in
// his training focus. The chance comes from age, room left below his potential, playing time
// and training load; heavy training wears players down and now and then hurts one.
const TR_EVERY=6, TR_REPORT=12;
const TR_FOCUS={
  B:{bal:{l:'균형',k:['con','pow','eye','spd','fld','arm']}, con:{l:'컨택',k:['con']}, pow:{l:'파워',k:['pow']}, eye:{l:'선구안',k:['eye']}, run:{l:'주루',k:['spd']}, def:{l:'수비·송구',k:['fld','arm']}},
  P:{bal:{l:'균형',k:['stu','ctl','mov','sta']}, stu:{l:'구위',k:['stu']}, ctl:{l:'제구',k:['ctl']}, mov:{l:'무브먼트',k:['mov']}, sta:{l:'체력',k:['sta']}}
};
const TR_INT={light:{l:'가볍게',g:0.7,c:4,inj:0}, normal:{l:'보통',g:1,c:0,inj:0}, hard:{l:'강하게',g:1.4,c:-6,inj:0.02}};
const ATTR_KO={con:'컨택',pow:'파워',eye:'선구안',spd:'주력',fld:'수비',arm:'송구',stu:'구위',ctl:'제구',mov:'무브먼트',sta:'체력'};
function trOf(p){ const t=p.tr||{}; return {f:TR_FOCUS[p.type][t.f]? t.f : 'bal', i:TR_INT[t.i]? t.i : 'normal'}; }
// scouts grade potential in half stars: OVR 59 = 1, 68 = 2, 77 = 3, 86 = 4, 95 = 5
function starsOf(p){ return clampN(Math.round(((p.pot||K.ovr(p))-50)/9*2)/2, 0.5, 5); }
function starText(p){ const s=starsOf(p); return '★'.repeat(Math.floor(s))+(s%1?'½':''); }
function starHTML(p){ const s=starsOf(p), full=Math.floor(s);
  return `<span class="stars" title="잠재력 ${s}/5 (스카우트 평가)">${'★'.repeat(full)}${s%1?'<span class="half">★</span>':''}<span class="off">${'★'.repeat(5-Math.ceil(s))}</span></span>`; }
function growChance(t,p){
  const o=K.ovr(p), gap=(p.pot||o)-o, I=TR_INT[trOf(p).i];
  const ageF=p.age<=21?0.28 : p.age<=24?0.22 : p.age<=27?0.14 : p.age<=30?0.07 : 0.03;
  const potF=gap<=0? 0 : Math.min(1.2, 0.35+gap/12);
  const play=isFarm(t,p)? 1.15 : (p.bench||0)>=5? 0.7 : 1;
  return clampN(ageF*potF*I.g*play, 0, 0.9);
}
function growLabel(c){ return c>=0.27?['높음','good'] : c>=0.13?['보통','team'] : c>=0.05?['낮음','warn'] : ['정체','bad']; }
function trainingTick(){
  const f=fm(); f.trLog=f.trLog||[];
  allPlayers(USER).concat(farmOf(USER)).forEach(p=>{
    if(K.isInjured(p)) return;
    const tr=trOf(p), I=TR_INT[tr.i], keys=TR_FOCUS[p.type][tr.f].k;
    // a focused plan puts every gain into its attributes and lands a little more often
    if(Math.random()<growChance(USER,p)*(tr.f==='bal'?1:1.15)){
      const room=keys.filter(k=>p[k]<99), k=room[Math.floor(Math.random()*room.length)], was=K.ovr(p);
      if(k){ p[k]++; }
      // potential is a ceiling: a point that would carry him past it doesn't stick
      if(k && K.ovr(p)>Math.max(p.pot||0,was)){ p[k]--; }
      else if(k){ (p.grow=p.grow||[]).push([state.year,k]); if(p.grow.length>40) p.grow.shift(); f.trLog.push({n:p.n, k, farm:isFarm(USER,p)}); }
    }
    p.cond=clampN(K.cond(p)+I.c,0,100);
    if(I.inj && Math.random()<I.inj){ p.inj=R(2,6); f.trLog.push({n:p.n, hurt:p.inj}); }
  });
}
function trainingReport(){
  const f=fm(), log=f.trLog||[]; f.trLog=[];
  if(!log.length) return;
  const by={}; log.filter(x=>x.k).forEach(x=>{ (by[x.n]=by[x.n]||{farm:x.farm,ks:[]}).ks.push(ATTR_KO[x.k]); });
  const hurt=log.filter(x=>x.hurt);
  const lines=Object.entries(by).map(([n,v])=>`• ${n}${v.farm?' (2군)':''}: ${v.ks.map(k=>k+' +1').join(', ')}`);
  send('육성 코치','📈',`훈련 리포트: ${Object.keys(by).length}명 성장${hurt.length?` · 훈련 중 부상 ${hurt.length}명`:''}`,
    `최근 ${TR_REPORT}경기 동안의 훈련 성과입니다.\n\n${lines.join('\n')||'눈에 띄는 성장 없음'}`+
    (hurt.length? `\n\n강도 높은 훈련 중 부상: ${hurt.map(x=>`${x.n} (${x.hurt}경기)`).join(', ')}` : '')+
    `\n\n훈련 탭에서 선수별 초점과 강도를 바꿀 수 있습니다.`, []);
}
function setTrain(n,key,v){ const p=findPlayer(USER,n); if(!p) return; p.tr=Object.assign(trOf(p),{[key]:v}); render(); }
function setTrainAll(key,v){
  allPlayers(USER).concat(farmOf(USER)).forEach(p=>{ p.tr=Object.assign(trOf(p),{[key]:key==='f'? autoFocus(p) : v}); });
  notify(key==='f'? '선수마다 가장 약한 영역으로 훈련 초점을 맞췄습니다.' : `전원 훈련 강도: ${TR_INT[v].l}`); render();
}
function autoFocus(p){
  const low=ks=>ks.slice().sort((a,b)=>p[a]-p[b])[0];
  if(p.type==='B'){ if(p.fld<55&&p.pos!=='DH') return 'def'; return {con:'con',pow:'pow',eye:'eye'}[low(['con','pow','eye'])]; }
  if(p.role==='SP'&&p.sta<62) return 'sta';
  return low(['stu','ctl','mov']);
}
let trFilter='all';
function setTrFilter(v){ trFilter=v; render(); }
function renderTraining(){
  ensure();
  const all=allPlayers(USER).map(p=>[p,false]).concat(farmOf(USER).map(p=>[p,true]))
    .filter(([p,farm])=>trFilter==='all'? true : trFilter==='1'? !farm : trFilter==='farm'? farm : p.type===trFilter)
    .map(([p,farm])=>({p,farm,c:growChance(USER,p)})).sort((a,b)=>b.c-a.c||b.p.pot-a.p.pot);
  const yr=p=>(p.grow||[]).filter(g=>g[0]===state.year).length;
  const opt=(o,cur)=>Object.entries(o).map(([k,v])=>`<option value="${k}" ${k===cur?'selected':''}>${v.l}</option>`).join('');
  const rows=all.map(({p,farm,c})=>{ const tr=trOf(p), [gl,gc]=growLabel(c), g=yr(p);
    return `<tr><td>${pname(USER,p.n)}${p.rookie?' <span class="pill pos">신인</span>':''}</td><td><span class="chip ${farm?'':'team'}">${farm?'2군':'1군'}</span></td>
      <td>${p.pos||p.role}</td><td>${p.age}</td><td><b>${K.ovr(p)}</b></td><td>${starHTML(p)}</td>
      <td><span class="chip ${gc}" title="${Math.round(c*100)}% / ${TR_EVERY}경기">${gl}</span></td>
      <td><select aria-label="${esc(p.n)} 훈련 초점" onchange="FM.setTrain('${q(p.n)}','f',this.value)">${opt(TR_FOCUS[p.type],tr.f)}</select></td>
      <td><select aria-label="${esc(p.n)} 훈련 강도" onchange="FM.setTrain('${q(p.n)}','i',this.value)">${opt(TR_INT,tr.i)}</select></td>
      <td>${g?`<b class="win">+${g}</b>`:'<span class="muted">-</span>'}</td></tr>`; }).join('');
  const recent=allPlayers(USER).concat(farmOf(USER)).flatMap(p=>(p.grow||[]).filter(g=>g[0]===state.year).map(g=>[p,g[1]]));
  const top=Object.values(recent.reduce((a,[p,k])=>{ (a[p.n]=a[p.n]||{p,n:0}).n++; return a; },{})).sort((a,b)=>b.n-a.n).slice(0,5);
  const filt=[['all','전체'],['1','1군'],['farm','2군'],['B','타자'],['P','투수']];
  return `<div class="panel">
    <div class="section-head"><div><p class="eyebrow">Player development</p><h2>육성 · 훈련</h2></div>
      <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn btn-sm" onclick="FM.setTrainAll('f')">약점 보완 자동 설정</button>
        <button class="btn btn-sm" onclick="FM.setTrainAll('i','light')">전원 가볍게</button><button class="btn btn-sm" onclick="FM.setTrainAll('i','normal')">전원 보통</button><button class="btn btn-sm" onclick="FM.setTrainAll('i','hard')">전원 강하게</button></div></div>
    <p class="hint" style="margin:10px 0 0">정규시즌 ${TR_EVERY}경기마다 훈련 효과가 반영되고, ${TR_REPORT}경기마다 육성 코치가 리포트를 보냅니다. 성장 가능성은 <b>나이</b>, <b>잠재력까지 남은 여유</b>, <b>출전 기회</b>(2군에서 매일 뛰면 ↑, 1군 벤치에 오래 있으면 ↓), <b>훈련 강도</b>로 정해집니다. 강하게 하면 빨리 크지만 컨디션이 떨어지고 가끔 다칩니다.</p>
    ${top.length? `<div class="brief-line" style="flex-wrap:wrap">${icon('morale-up')}<span>${state.year} 성장 TOP: ${top.map(x=>`<b>${esc(x.p.n)}</b> +${x.n}`).join(' · ')}</span></div>` : ''}
    <div class="tabsm" style="margin-top:14px">${filt.map(([k,l])=>`<button class="${trFilter===k?'active':''}" onclick="FM.setTrFilter('${k}')">${l}</button>`).join('')}</div>
    <div style="overflow-x:auto"><table class="stat-table"><thead><tr><th>선수</th><th>소속</th><th>POS</th><th>나이</th><th>OVR</th><th>잠재력</th><th>성장 가능성</th><th>훈련 초점</th><th>강도</th><th>${state.year} 성장</th></tr></thead><tbody>${rows}</tbody></table></div>
  </div>`;
}
// squad tab, 2군 view
function farmView(){
  ensure();
  const fu=futures(), f=farmOf(USER);
  const bs=f.filter(p=>p.type==='B').sort((a,b)=>K.ovr(b)-K.ovr(a)), ps=f.filter(p=>p.type==='P').sort((a,b)=>K.ovr(b)-K.ovr(a));
  const btn=p=>{ const why=promoteBlock(p); return `<button class="btn btn-sm" ${why?`disabled title="${esc(why)}"`:''} onclick="FM.promote('${q(p.n)}')">1군 등록</button>`; };
  const bRow=p=>{ const s=fu.bat[p.n]; return `<tr><td class="name">${pname(USER,p.n)}${p.rookie?' <span class="pill pos">신인</span>':''}</td><td><span class="pill pos">${p.pos}</span></td><td>${p.age}</td><td><b>${K.ovr(p)}</b></td><td>${starHTML(p)}</td>${statusCells(p)}
    ${s&&s.AB? `<td>${s.G}</td><td>${fmtAvg(s.H/s.AB)}</td><td>${s.HR}</td><td>${s.RBI}</td><td>${opsOf(s).toFixed(3)}</td>` : '<td colspan="5" class="muted">기록 없음</td>'}<td>${btn(p)}</td></tr>`; };
  const pRow=p=>{ const s=fu.pit[p.n]; return `<tr><td class="name">${pname(USER,p.n)}${p.rookie?' <span class="pill pos">신인</span>':''}</td><td><span class="pill pos">${p.role}</span></td><td>${p.age}</td><td><b>${K.ovr(p)}</b></td><td>${starHTML(p)}</td>${statusCells(p)}
    ${s&&s.OUT? `<td>${s.G||0}</td><td>${ipStr(s.OUT)}</td><td>${fmtEra(s.ER,s.OUT)}</td><td>${s.SO}</td><td>${s.BB}</td>` : '<td colspan="5" class="muted">기록 없음</td>'}<td>${btn(p)}</td></tr>`; };
  const last=fu.log.slice(0,5).map(g=>`<span class="chip ${g.us>g.th?'good':g.us<g.th?'bad':''}" title="${K.ROSTERS[g.opp].name} 2군">${g.us>g.th?'승':g.us<g.th?'패':'무'} ${g.us}:${g.th} ${g.opp}</span>`).join(' ');
  return `<div class="brief-line" style="flex-wrap:wrap;margin-top:0">${icon('calendar')}<span>퓨처스리그 <b>${fu.W}승 ${fu.L}패 ${fu.T}무</b> · 1군 엔트리 <b>${entryCount(USER)}/${ENTRY_MAX}</b> · 2군 ${f.length}명</span><span style="display:flex;gap:4px;flex-wrap:wrap">${last}</span></div>
    <p class="hint">2군은 1군 정규시즌 경기마다 퓨처스 경기를 한 번 치릅니다. 2군 선수는 매일 출전해 훈련 성장 가능성이 높습니다. 1군에서 내린 선수는 ${DOWN_GAMES}경기가 지나야 다시 올릴 수 있습니다.</p>
    <div style="overflow-x:auto"><table class="stat-table"><caption>2군 타자</caption><thead><tr><th>선수</th><th>POS</th><th>나이</th><th>OVR</th><th>잠재력</th><th>컨디션</th><th>사기</th><th>G</th><th>타율</th><th>HR</th><th>타점</th><th>OPS</th><th></th></tr></thead><tbody>${bs.map(bRow).join('')}</tbody></table></div>
    <div style="overflow-x:auto"><table class="stat-table"><caption>2군 투수</caption><thead><tr><th>선수</th><th>보직</th><th>나이</th><th>OVR</th><th>잠재력</th><th>컨디션</th><th>사기</th><th>G</th><th>IP</th><th>ERA</th><th>SO</th><th>BB</th><th></th></tr></thead><tbody>${ps.map(pRow).join('')}</tbody></table></div>`;
}

window.FM={ notify, ask, answer, esc, applyTheme, teamPitch, showSetup, setupPick, setupBg, setupName, setupStart, onCareerStart, ensure, prepareCfg, afterGame, previewNote, onSeasonEnd, maybeShowFired, offseasonMoves, onNewSeason, confirmNextSeason,
  tradeBudget, tradeCheck, doTrade, payroll, calDate, dateLabel, tradeWindow, tradeTag, draftState, draftDone, draftOnClock, openDraft, showDraft, draftPick, draftAuto, draftView, famOf, execOf, execTable, buyIn, knowOf, activePlans, tfState, snap, capPot, renderInbox, renderClub, dashCards, lineupCard, statusCells, statusInline, attrNum, tabBadge,
  showProfile, openMsg, markAllRead, setInboxFilter, act, teamMeeting, meeting, talk, toggleRest, toggleList, setAutoRest, releasePlayer,
  newCareer, lastChance, aiTactics, tacName, tacLabel, setTac, tacticsCard, preseasonCard, preseasonControls, campPicker, setCamp, startSpring,
  springNext, springPlayNext, springRecord, springSimAll, openSeason, SPRING_GAMES, gameReport, renderFeed, setFeedFilter, logGame, profileTab,
  onRegularSeasonEnd, icon, badge, farmOf, isFarm, entryCount, promote, demote, farmView, renderTraining, setTrain, setTrainAll, setTrFilter, farmGame, trainingTick, starHTML, futures, ENTRY_MAX, dashTasks, dashBrief, psSeriesMessage, psSeriesResult, afterPsGame, takeJob, signFA, fxPick, fxSign, attr20 };
})();
