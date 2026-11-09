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
  const staff= t===USER? coachGrow(p, isFarm(t,p)) : 1;
  return clampN(ageF*potF*I.g*play*staff, 0, 0.9);
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

window.FM={ canQuickStart, quickBtn, quickStart, resultHTML, setupMore, guideRender, guideNext, guideSkip, noteReturn, dismissReturn, returnCard, notify, ask, answer, esc, applyTheme, teamPitch, fans, fansLabel, delegPicker, setDeleg, inboxCounts, staffCard, coachPicker, hireCoach, staffOf, showSetup, setupPick, setupBg, setupName, setupPhoto, setupStart, mgrAvatar, readPhoto, mgrBg, onCareerStart, ensure, prepareCfg, afterGame, previewNote, onSeasonEnd, maybeShowFired, offseasonMoves, onNewSeason, confirmNextSeason,
  tradeBudget, tradeCheck, doTrade, payroll, calDate, dateLabel, tradeWindow, tradeTag, draftState, draftDone, draftOnClock, openDraft, showDraft, draftPick, draftAuto, draftView, famOf, execOf, execTable, buyIn, knowOf, activePlans, tfState, snap, capPot, renderInbox, renderClub, dashCards, lineupCard, statusCells, statusInline, attrNum, tabBadge,
  showProfile, closeProfile, refreshProfile, renderTacticsTab, openMsg, markAllRead, setInboxFilter, act, teamMeeting, meeting, talk, toggleRest, toggleList, setAutoRest, releasePlayer,
  newCareer, lastChance, aiTactics, tacName, tacLabel, setTac, tacticsCard, preseasonCard, preseasonControls, campPicker, setCamp, startSpring,
  springNext, springPlayNext, springRecord, springSimAll, openSeason, SPRING_GAMES, gameReport, renderFeed, setFeedFilter, logGame, profileTab,
  onRegularSeasonEnd, icon, badge, farmOf, isFarm, entryCount, promote, demote, farmView, renderTraining, setTrain, setTrainAll, setTrFilter, farmGame, trainingTick, starHTML, futures, ENTRY_MAX, dashTasks, dashBrief, psSeriesMessage, psSeriesResult, afterPsGame, takeJob, signFA, fxPick, fxSign, attr20 };
})();
