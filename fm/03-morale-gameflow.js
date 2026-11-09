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
function userPlan(){ const pm=state.pendingGame!=null? pendingMatch() : null; if(!pm) return null; return planOf(pm.home===USER?pm.away:pm.home); }
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
  const extra=Object.assign({edge:coachEdge(team)}, isUser? {tacFam:execTable(), scoutKnow:knowTable(), splits:true, plan:userPlan()} : {tacFam:aiExecTable(team), scoutKnow:aiKnowTable(team)});
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
    const hurt=K.applyFatigue(t,res.box,coachWear(t));
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
    coachDesk(ug);
    maybeMedia(ug);
    maybePress(ug);
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

