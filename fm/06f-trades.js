
// ---------- 0.7 trade history and reactions ----------
// Reads fm().tradeLog (written by the trade model in fm/04-market.js: {id,y,day,phase,a,b,aGive,bGive,vA,vB,kind}).
// Each new entry gets a press grade per club, a few fan-board posts for the user's club, a news item, and a
// second look about 40 games later. The outlet and every fan handle are made up for the game.
const TR_OUTLET='KBO DAILY', TR_REVISIT=40;
function tradeLogList(){ const f=fm(); return f.tradeLog||(f.tradeLog=[]); }
// grade from what a club got minus what it gave, by its own valuation, in 억원
function tradeGrade(v){ return v>=15?'A':v>=5?'B':v>-5?'C':v>-15?'D':'F'; }
const TR_GRADE_L={A:'확실한 이득',B:'남는 장사',C:'균형',D:'아쉬운 거래',F:'손해'};
const trNames=list=>(list||[]).map(s=>s.n).join(', ')||'-';
const trBest=list=>(list||[]).slice().sort((a,b)=>b.ovr-a.ovr)[0]||null;
// a departed player the fans will miss: good, or long with the club (a farm product or a veteran)
const trBeloved=s=>s&&(s.ovr>=78||(s.age>=31&&s.ovr>=72));
const trProspect=s=>s&&s.age<=23&&(s.pot||0)>=80;
function trSeed(e,k){ return hash(e.id+'|'+k); }
function trPick(e,k,arr){ return arr[trSeed(e,k)%arr.length]; }
function trHandle(e,i,team){ const a=['직관','외야석','응원단장','9회말','불펜','더그아웃','홈플레이트','삼진왕','도루왕','희생번트'];
  const b=['러','지기','덕후','파','맨','장인','요정','기사','도사','러버']; const h=Math.imul(trSeed(e,'h'+i)^0x9e3779b9,2654435761)>>>0; return `${a[h%a.length]}${b[(h>>>4)%b.length]}${(h>>>8)%90+10}`; }

function tradePress(e){
  const gA=tradeGrade(e.vA), gB=tradeGrade(e.vB), A=K.ROSTERS[e.a].name, B=K.ROSTERS[e.b].name;
  const inA=trBest(e.bGive), inB=trBest(e.aGive);
  const head = gA===gB? `${A}·${B} 트레이드, 서로 원하는 것을 얻었다`
    : (e.vA>e.vB? `${A}, ${inA?inA.n:'트레이드'} 영입으로 웃었다` : `${B}, ${inB?inB.n:'트레이드'} 품고 웃었다`);
  const line=(t,got,gave,g)=>`${K.ROSTERS[t].name} ${g} (${TR_GRADE_L[g]}): ${trNames(got)}을(를) 받고 ${trNames(gave)}을(를) 내줬다.`;
  const why=[];
  if(e.bGive.some(trProspect)||e.aGive.some(trProspect)) why.push('유망주가 오간 만큼 몇 년 뒤에 다시 평가해야 할 거래다.');
  if(e.bGive.concat(e.aGive).some(s=>(s.yrs||0)<=1&&s.ovr>=75)) why.push('계약이 1년 남은 선수가 포함돼 당장의 성적이 더 중요한 거래다.');
  if(!why.length) why.push(trPick(e,'w',['당장의 전력과 미래 사이에서 각자 계산이 분명했다.','구단 상황을 보면 양쪽 모두 이해가 가는 선택이다.','시즌 후반 순위 싸움에 바로 영향을 줄 거래다.']));
  return {title:`[트레이드 평가] ${head}`, body:josa(`${line(e.a,e.bGive,e.aGive,gA)}\n${line(e.b,e.aGive,e.bGive,gB)}\n\n${why.join(' ')}`), gA, gB};
}
// fan-board posts for the user's club: tone from the grade, the players who left, and the standings
function tradeFans(e){
  const mine=e.a===USER? {got:e.bGive,gave:e.aGive,v:e.vA} : {got:e.aGive,gave:e.bGive,v:e.vB};
  const g=tradeGrade(mine.v), gone=trBest(mine.gave), come=trBest(mine.got), lost=(mine.gave||[]).find(trBeloved), kid=(mine.gave||[]).find(trProspect);
  const rank=standings().findIndex(x=>x.t===USER)+1, out=[];
  if(g==='A'||g==='B') out.push(trPick(e,'p1',[`${come?come.n:'새 식구'} 오는 거 실화냐 단장 일 잘하네`,`이건 무조건 이득이지 ${come?come.n:''} 환영합니다`,`오랜만에 속 시원한 트레이드`]));
  if(g==='D'||g==='F') out.push(trPick(e,'n1',[`${gone?gone.n:'그 선수'}을(를) 이 정도에 보낸다고..? 납득이 안 됨`,`단장님 계산기 고장났나요`,`이건 좀 아니지 않나…`]));
  if(g==='C') out.push(trPick(e,'c1',['서로 필요한 거 바꾼 느낌? 지켜보자','반반이네 결과는 시즌 끝나봐야 알 듯','나쁘진 않은데 설레지도 않음']));
  if(lost) out.push(trPick(e,'l',[`${lost.n} 유니폼 아직 집에 있는데… 고마웠다`,`${lost.n} 떠나는 건 너무 슬프다`,`${lost.n} 없는 라인업 상상이 안 됨`]));
  if(kid) out.push(trPick(e,'k',[`${kid.n} 키워서 쓰는 거 아니었어?`,`${kid.n} 3년 뒤에 우리 상대로 홈런 치면 어떡함`]));
  if(rank&&rank<=3&&(g==='A'||g==='B')) out.push('이 정도면 올해 진짜 해볼 만하다');
  if(rank>=8&&(mine.got||[]).some(s=>s.age>=31)) out.push('하위권에서 베테랑 데려오는 게 맞나… 리빌딩은 언제');
  return {g, posts: out.slice(0,4).map((t,i)=>({u:trHandle(e,i,USER), t:josa(t)}))};
}
// new trades get their press, fans and news once; trades 40 games old get a second look
function tradeReact(){
  if(!state||!state.fm) return; const f=fm(), ug=userGamesPlayed();
  tradeLogList().forEach(e=>{
    if(!e.rx){ const pr=tradePress(e); e.rx={gA:pr.gA, gB:pr.gB, ug};
      feedPush({year:state.year, kind:'press', ug, title:pr.title, body:pr.body});
      if(e.a===USER||e.b===USER){ const fa=tradeFans(e); e.rx.fans=fa.posts;
        addFans({A:2,B:1,C:0,D:-2,F:-4}[fa.g]+((e.a===USER?e.aGive:e.bGive).some(trBeloved)?-2:0));
        if(f.board) f.board.conf=clampN(f.board.conf+{A:2,B:1,C:0,D:-1,F:-3}[fa.g],0,100); } }
    else if(!e.rx.re && e.rx.ug!=null && ug-e.rx.ug>=TR_REVISIT && e.y===state.year){ e.rx.re=true;
      const war=list=>list.reduce((a,s)=>{ const t=K.TEAM_IDS.find(x=>findPlayer(x,s.n)); return a+(t? trWarSince(t,s.n) : 0); },0);
      const wA=war(e.bGive), wB=war(e.aGive), A=K.ROSTERS[e.a].name, B=K.ROSTERS[e.b].name;
      const lead=Math.abs(wA-wB)<0.3? '아직은 무승부' : wA>wB? `지금까지는 ${A}의 승리` : `지금까지는 ${B}의 승리`;
      feedPush({year:state.year, kind:'press', ug, title:`[다시 보는 트레이드] ${A}·${B}, ${lead}`,
        body:josa(`${TR_REVISIT}경기가 지났다. ${A}이(가) 받은 ${trNames(e.bGive)}은(는) WAR ${wA.toFixed(1)}, ${B}이(가) 받은 ${trNames(e.aGive)}은(는) WAR ${wB.toFixed(1)}을(를) 기록 중이다.`)}); }
  });
}
// season WAR so far for a player (the trade log holds names; season stats are per club, so sum both)
function trWarSince(t,n){ const env=leagueEnv(), p=findPlayer(t,n); if(!p) return 0; let w=0;
  K.TEAM_IDS.forEach(x=>{ const s=state.season[x]; const b=s.bat[n], q=s.pit[n]; if(b&&b.PA) w+=batWAR(x,p,b,env); if(q&&q.OUT) w+=pitWAR(q,env); }); return w; }

// the trade tab's history card: newest first, this season and last
let trHistFilter='all';
function setTradeHist(v){ trHistFilter=v; render(); }
function tradeHistoryCard(){
  tradeReact();
  let list=tradeLogList().slice().reverse(); if(trHistFilter==='mine') list=list.filter(e=>e.a===USER||e.b===USER);
  const ft=(id,l)=>`<button class="${trHistFilter===id?'active':''}" onclick="FM.setTradeHist('${id}')">${l}</button>`;
  const side=(t,got,g)=>`<div class="th-side"><b>${esc(K.ROSTERS[t].name)}</b>${g?`<span class="th-g g-${g}">${g}</span>`:''}<small>받음</small><span>${(got||[]).map(s=>`${esc(s.n)} <em>${esc(s.pos||s.role||'')} · ${s.age}세 · OVR ${s.ovr}</em>`).join('<br>')||'-'}</span></div>`;
  const rows=list.slice(0,30).map(e=>{ const rx=e.rx||{};
    return `<li class="th-row"><div class="th-when">${e.y} · ${e.phase==='stove'?'스토브리그':e.phase==='regular'?'시즌 중':esc(e.phase||'')}${e.kind==='ai'?'':' · <b>우리 구단</b>'}</div>
      <div class="th-sides">${side(e.a,e.bGive,rx.gA)}${side(e.b,e.aGive,rx.gB)}</div>
      ${rx.fans&&rx.fans.length?`<details class="th-fans"><summary>팬 게시판 반응 ${rx.fans.length}</summary>${rx.fans.map(x=>`<p><small>${esc(x.u)}</small>${esc(x.t)}</p>`).join('')}</details>`:''}</li>`; }).join('');
  return `<div class="card th-card"><h3>리그 트레이드 이력 <span class="tag">${TR_OUTLET} 평가 · A 확실한 이득 ~ F 손해</span></h3>
    <div class="tabsm">${ft('all','리그 전체')}${ft('mine','우리 구단')}</div>
    ${rows?`<ol class="th-list">${rows}</ol>`:'<p class="muted">아직 성사된 트레이드가 없어요. 마감이 다가오면 구단들이 움직이기 시작해요.</p>'}</div>`;
}
