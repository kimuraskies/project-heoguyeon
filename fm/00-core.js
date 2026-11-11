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
// picks the right particle after a Korean word: 김도영을(를) -> 김도영을, 페라자을(를) -> 페라자를
function josa(s){ return String(s==null?'':s).replace(/([가-힣])(을\(를\)|이\(가\)|은\(는\)|와\(과\)|과\(와\))/g,(m,c,j)=>{ const tail=(c.charCodeAt(0)-0xAC00)%28>0, p={'을(를)':['을','를'],'이(가)':['이','가'],'은(는)':['은','는'],'와(과)':['과','와'],'과(와)':['과','와']}[j]; return c+(tail?p[0]:p[1]); }); }
function notify(msg, ms){ msg=josa(msg);
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
  if(state.fm.fans==null) state.fm.fans=50;
  if(!state.fm.farmV){ K.TEAM_IDS.forEach(seedFarm); state.fm.farmV=1; }
  if(!state.fm.aqV){ K.TEAM_IDS.forEach(t=>allPlayers(t).concat(farmOf(t)).forEach(p=>{ if(p.f&&K.ASIA_Q.indexOf(p.n)>=0) p.aq=1; })); state.fm.aqV=1; }   // saves from before the Asia quota
  if(!state.fm.farmPayV){ const fin=state.fm.fin; if(fin) fin.budget=Math.round(fin.budget+farmOf(USER).reduce((a,p)=>a+(p.sal||0),0)*1.06); state.fm.farmPayV=1; }
}

