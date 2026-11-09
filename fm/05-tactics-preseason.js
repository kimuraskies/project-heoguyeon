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
const TF_START={rookie:30, coach:45, legend:35, kbo:35, mlb:35}, TF_GAIN=1.2, TF_FORGET=0.25, TF_FLOOR=20, TF_CAMP=20, NEW_GAMES=20;
function tfState(){
  const f=fm(); if(f.tf) return f.tf;
  // a save from before familiarity existed: plans already in use start half-learned
  const start=TF_START[state.user&&state.user.bg]||35, inUse=new Set(activePlans().map(x=>x.k+':'+x.v)), played=userGamesPlayed()>0;
  f.tf={}; for(const k in TF_LEARN){ f.tf[k]={}; TF_LEARN[k].forEach(v=>f.tf[k][v]= played&&inUse.has(k+':'+v)? 70 : start); }
  return f.tf;
}
function activePlans(tac){ tac=tac||(state.cfgs[USER].tac||K.DEFAULT_TAC); return Object.keys(TF_LEARN).filter(k=>TF_LEARN[k].indexOf(String(tac[k]))>=0).map(k=>({k,v:String(tac[k])})); }
function famOf(k,v){ const t=TF_LEARN[k]&&TF_LEARN[k].indexOf(String(v))>=0? tfState()[k] : null; return t? Math.round(t[String(v)]) : 100; }
function learnRate(tac){ const c=activePlans(tac).length; return coachLearn()/(1+0.2*Math.max(0,c-1)); }
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
function knowOf(t){ return clampN(0.15+(mgrBg().know||0)+0.085*(knowState().n[t]||0),0,1); }
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
    {done:!!state.cfgs[USER].tac, opt:true, t:'팀 기본 전술', d: state.cfgs[USER].tac? '설정됨' : '팀 전술 탭', go:"App.tab('tactics')"}
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
function setCamp(k){ fm().camp={year:state.year, focus:k}; closeModal(); render(); if(window.Track) Track.action('camp'); }
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
  if(window.Track) Track.action('spring_go');
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
  if(window.Track) Track.action('spring_sim');
  state.pendingGame=null; state.matchTac=null;
  let n; while((n=springNext())){ springRecord(K.simGame(buildCfg(n.home), buildCfg(n.away), {maxInnings:9})); }
  closeModal(); render();
}
// a first-season shortcut: balanced camp, exhibition games simulated, straight to the opening-day preview
function canQuickStart(){
  const f=fm();
  if(state.phase!=='stove'&&!(state.phase==='spring'&&springNext())) return false;
  return f.firstYear!=null? f.firstYear===state.year : state.year===2026;
}
function quickBtn(){ return `<button class="btn gold" onclick="FM.quickStart()">${icon('play')}추천 준비로 개막전까지</button>`; }
function quickStart(){
  const f=fm();
  if(window.Track) Track.action('quick_start');
  if(state.phase==='stove'){
    if(!(f.camp&&f.camp.year===state.year&&f.camp.focus)) f.camp={year:state.year, focus:'bal'};
    startSpring();
  }
  if(state.phase!=='spring') return;
  springSimAll();
  const sp=state.spring;
  openSeason();
  notify(`${CAMP[f.camp.focus].label}를 마치고 시범경기는 ${sp.W}승 ${sp.L}패 ${sp.T}무로 끝냈어요. 개막전을 준비하세요.`);
  window.App.nextGame();
}
function openSeason(){
  if(window.Track) Track.action('open_season');
  state.phase='regular';
  if(state.fm) pressMediaDay();
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

