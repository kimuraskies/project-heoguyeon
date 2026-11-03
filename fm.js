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
function userGamesPlayed(){ return state.schedule.slice(0,state.gameIdx).filter(g=>g.home===USER||g.away===USER).length; }
function median(a){ const s=a.slice().sort((x,y)=>x-y); return s.length? s[Math.floor(s.length/2)] : 0; }

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
function ensure(){
  if(!state) return;
  K.TEAM_IDS.forEach(t=>allPlayers(t).forEach(ensurePlayer));
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
  ok(){ return '확인했습니다.'; }
};
function act(id, i){
  const m=fm().inbox.find(x=>x.id===id); if(!m||m.done) return;
  const a=m.actions[i]; const res=ACTIONS[a.fn](m,a.arg||{});
  if(String(res).startsWith('❌')){ alert(res.replace(/^❌ /,'')); return; } // stays open
  m.done=true; m.result=res; m.read=true; render();
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
  const pay=payroll(USER);
  f.board={expect:ex, conf: first? 60 : clampN(Math.round((f.board?f.board.conf:60)*0.5+30),20,90), lastReview:0, strengthRank:sr};
  const balance = f.fin? f.fin.balance : 30;
  f.fin={balance, budget:Math.round(pay*1.06+4), rev:0, exp:0, attTotal:0, homeGames:0};
  f.rt={}; f.promises=[]; f.restNext=[]; f.lastMeeting=-99; f.lastWarn=-99; f.lastOffer=-99; f.lastTalk={};
  send('구단 이사회','🏛',`${state.year} 시즌 목표: ${ex.label}`,
    `감독님, ${state.year} 시즌을 앞두고 이사회의 기대치를 전달드립니다.\n\n` +
    `• 전력 평가: 리그 ${sr}위권\n• 시즌 목표: ${ex.label}\n• 연봉 예산: ${f.fin.budget}억 원 (현재 연봉 총액 ${pay}억 원)\n\n` +
    `12경기마다 진행 상황을 평가합니다. 목표를 크게 밑돌면 감독 거취를 재검토할 수 있습니다.`, [{label:'확인', fn:'ok'}]);
}
function boardReview(){
  const f=fm(), s=boardStatus(), b=f.board;
  // narrow misses cost little; being far off the target is what endangers the job
  let d = s.met? 3 : -(1+s.gap);
  if(f.fin.balance<0) d-=2;
  b.conf=clampN(b.conf+d,0,100);
  send('구단 이사회','🏛',`이사회 정기 평가: ${confLabel(b.conf)}`,
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
  if(w===5||w===10) send('스포츠 뉴스','📰',`KIA, ${w}연승 질주!`,`KIA 타이거즈가 ${w}연승을 달렸습니다. 더그아웃 분위기가 최고조입니다.`,[]);
  if(l===5||l===10) send('스포츠 뉴스','📰',`KIA, ${l}연패 수렁`,`KIA 타이거즈가 ${l}연패에 빠졌습니다. 팬들의 시선이 감독에게 쏠리고 있습니다. 팀 미팅을 고려해 보세요.`,[]);
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
  [USER,team].forEach(t=>{ const d=K.defaultLineup(t); state.cfgs[t]={teamId:t,lineup:d.lineup.slice(),rotation:d.rotation.slice(),bullpen:d.bullpen.slice(),closer:d.closer}; });
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
  K.TEAM_IDS.forEach(t=>allPlayers(t).forEach(p=>{
    p.yrs=(p.yrs||1)-1;
    if(p.yrs>0) return;
    if(t!==USER){ p.yrs=2; p.sal=salaryFor(p); return; } // AI re-signs its players
    p.expiring=true;
    const ask=Math.round(salaryFor(p)*(K.mor(p)<40?1.25:K.mor(p)>75?0.95:1.05)*10)/10;
    const acts=[{label:`1년 ${ask}억 재계약`, fn:'renew', arg:{n:p.n, years:1, sal:ask}}];
    if(p.age<=33) acts.push({label:`3년 ${Math.round(ask*1.1*10)/10}억 재계약`, fn:'renew', arg:{n:p.n, years:3, sal:Math.round(ask*1.1*10)/10}});
    acts.push({label:'재계약하지 않는다', fn:'release', arg:{n:p.n}});
    send(`${p.n} 에이전트`,'📝',`${p.n} 계약 만료 — 재계약 협상`,
      `${p.n}(${p.age}세, ${posFull(p.pos||p.role)}, OVR ${K.ovr(p)})의 계약이 만료됩니다.\n현재 연봉 ${p.sal}억 원 · 요구 연봉 ${ask}억 원 · 사기 ${moraleLabel(K.mor(p))}\n\n` +
      `다음 시즌 시작 전까지 결정하지 않으면 FA로 팀을 떠납니다.`, acts);
  }));
}
function maybeShowFired(){
  const f=fm(); if(!f||!f.fired) return;
  modal(`<h2>📰 감독 경질</h2>
    <p>구단 이사회가 성적 부진을 이유로 감독 교체를 결정했습니다. (이사회 신뢰도 ${f.board.conf})</p>
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
    const out=p=>{ if(t===USER&&p.leaving){ left.push(p.n); return true; }
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
  f.offseasonNews={left, retired};
}
// "next season" button: warn about contract talks that will end with the player leaving
function confirmNextSeason(){
  ensure();
  const open=fm().inbox.filter(m=>!m.done && m.actions.some(a=>a.fn==='renew'));
  if(!open.length) return true;
  return confirm(`재계약 협상 ${open.length}건이 남아 있습니다 (${open.map(m=>m.actions[0].arg.n).join(', ')}).\n지금 다음 시즌을 시작하면 이 선수들은 FA로 떠납니다. 계속할까요?`);
}
function onNewSeason(){
  const f=fm(); seasonStart(false);
  const n=f.offseasonNews||{left:[],retired:[]};
  send('스카우트 팀장','🎓',`${state.year} 신인 입단`,
    `새 시즌 신인이 합류했습니다.\n\n${(f.newRookies||[]).map(x=>'• '+x).join('\n')}` +
    (n.left.length? `\n\nFA로 떠난 선수: ${n.left.join(', ')}`:'') + (n.retired.length? `\n은퇴한 선수: ${n.retired.join(', ')}`:''), []);
}

// ---------- team meeting ----------
function recentRecord(){
  const gs=state.schedule.filter(g=>g.played&&(g.home===USER||g.away===USER)).slice(-5);
  return gs.reduce((a,g)=>{ const us=g.home===USER?g.hr:g.ar, th=g.home===USER?g.ar:g.hr; if(us>th)a.w++; else if(us<th)a.l++; return a; },{w:0,l:0});
}
function meetingReady(){ return userGamesPlayed()-fm().lastMeeting>=10; }
function teamMeeting(){
  if(!meetingReady()){ alert('팀 미팅은 10경기에 한 번만 열 수 있습니다.'); return; }
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
  if(ug-(f.lastTalk[key]||-99)<10){ alert('같은 선수와의 면담은 10경기에 한 번만 할 수 있습니다.'); return; }
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
  if(p.type==='B' && r.batters.filter(x=>!K.isInjured(x)).length<=10){ alert('타자가 부족해 방출할 수 없습니다 (최소 10명).'); return; }
  if(p.type==='P' && r.pitchers.filter(x=>!K.isInjured(x)).length<=8){ alert('투수가 부족해 방출할 수 없습니다 (최소 8명).'); return; }
  const cost=Math.round(p.sal*Math.max(1,p.yrs)*0.5*10)/10;
  if(!confirm(`${n}을(를) 방출합니다. 잔여 계약의 절반인 ${cost}억 원을 위약금으로 지급합니다. 계속할까요?`)) return;
  if(p.type==='B') r.batters=r.batters.filter(x=>x!==p); else r.pitchers=r.pitchers.filter(x=>x!==p);
  const f=fm(); f.fin.balance-=cost; f.fin.exp+=cost;
  f.promises=f.promises.filter(pr=>pr.n!==n); f.restNext=f.restNext.filter(x=>x!==n);
  const c=state.cfgs[USER];
  if(c.lineup.indexOf(n)>=0||c.rotation.indexOf(n)>=0||c.bullpen.indexOf(n)>=0||c.closer===n){
    const d=K.defaultLineup(USER); state.cfgs[USER]={teamId:USER,lineup:d.lineup.slice(),rotation:d.rotation.slice(),bullpen:d.bullpen.slice(),closer:d.closer};
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
  <div class="card" style="margin-top:14px"><h3>📝 계약 현황 <span class="tag">연봉순 · 만료 선수는 시즌 종료 후 협상</span></h3>
    <table><thead><tr><th class="name">선수</th><th>POS</th><th>나이</th><th>OVR</th><th>연봉</th><th>잔여</th><th>시장가치</th><th>사기</th></tr></thead><tbody>${rows}</tbody></table></div>`;
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
  const g=x=>({"C":"C","1B":"IF","2B":"IF","3B":"IF","SS":"IF","LF":"OF","CF":"OF","RF":"OF","DH":"DH"})[x];
  return ['C','1B','2B','3B','SS','LF','CF','RF','DH'].map(x=>{
    const s = x===p.pos?3 : x==='DH'?2 : (g(x)===g(p.pos)&&x!=='C')?2 : 1;
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

window.FM={ ensure, prepareCfg, afterGame, previewNote, onSeasonEnd, maybeShowFired, offseasonMoves, onNewSeason, confirmNextSeason,
  tradeBudget, doTrade, payroll, renderInbox, renderClub, dashCards, lineupCard, statusCells, statusInline, attrNum, tabBadge,
  showProfile, openMsg, markAllRead, setInboxFilter, act, teamMeeting, meeting, talk, toggleRest, toggleList, setAutoRest, releasePlayer,
  newCareer, lastChance };
})();
