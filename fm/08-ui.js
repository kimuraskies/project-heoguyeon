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
  if(id==='inbox'){ const u=fm()? inboxCounts().decide : 0; return u? ` <span class="count" aria-label="결정 필요 ${u}개">${u}</span>` : ''; }
  return '';
}

// ---------- UI: inbox ----------
let selMsg=null, inboxFilter='all';
function openMsg(id){ selMsg=id; const m=fm().inbox.find(x=>x.id===id); if(m){ m.read=true; if(!inboxLists()[inboxFilter].includes(m)) inboxFilter='all'; } render(); }
function markAllRead(){ fm().inbox.forEach(m=>m.read=true); render(); }
function setInboxFilter(f){ inboxFilter=f; selMsg=null; render(); }
function dueLeft(m){ return m.due==null? null : m.due-clock(); }
function dueTag(m){ const d=dueLeft(m); if(d==null||m.done) return '';
  if(state.phase==='stove') return '<span class="pill" style="background:var(--panel2);color:var(--dim)">시즌 중 기한</span>';
  return `<span class="pill" style="${d<=1?'background:rgba(224,85,106,.22);color:var(--bad)':'background:rgba(240,160,32,.2);color:var(--warn)'}">${d<=0?'오늘 마감':'D-'+d}</span>`; }
function pendingDecisions(){ return fm().inbox.filter(m=>!m.done&&isDecision(m)).sort((x,y)=>(x.due==null?1e9:x.due)-(y.due==null?1e9:y.due)); }
function inboxCounts(){ const L=fm().inbox; return {decide:pendingDecisions().length, unread:L.filter(m=>!m.read).length}; }
// 전체 keeps unanswered decisions on top so they can't get lost under news
function inboxLists(){ const f=fm(), open=pendingDecisions(); return {all:open.concat(f.inbox.filter(m=>open.indexOf(m)<0)), unread:f.inbox.filter(m=>!m.read||m.id===selMsg)}; }
// the main progress buttons stop at an unanswered decision and open it instead
function gate(){ if(!fm()) return false; const open=pendingDecisions(); if(!open.length) return false;
  if(typeof Match!=='undefined'&&Match.closeResult) try{ Match.closeResult(); }catch(e){}
  closeModal(); selMsg=open[0].id; inboxFilter='all'; open[0].read=true;
  if(typeof App!=='undefined') App.tab('inbox'); else render();
  notify(`결정이 필요한 메시지가 ${open.length}건 있습니다. 먼저 답해 주세요.`); return true; }
function gateCta(html){ return (html||'').replace(/onclick="/,'onclick="if(FM.gate())return;'); }
function renderInbox(){
  ensure();
  const f=fm(), c=inboxCounts(), lists=inboxLists();
  if(!lists[inboxFilter]) inboxFilter='all';
  const list=lists[inboxFilter];
  if((selMsg==null||!list.some(m=>m.id===selMsg)) && list.length) selMsg=list[0].id;
  const sel=list.find(m=>m.id===selMsg);
  if(sel&&!sel.read) sel.read=true;
  const empty={unread:'읽지 않은 메시지가 없습니다. 👍', all:'메시지가 없습니다.'}[inboxFilter];
  const items=list.map(m=>`<div onclick="FM.openMsg(${m.id})" style="padding:9px 10px;border-bottom:1px solid var(--line);cursor:pointer;${m.id===selMsg?'background:var(--panel2);':''}${m.read?'':'font-weight:700;'}">
      <div class="row" style="gap:6px;flex-wrap:nowrap"><span>${m.icon}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.subject)}</span>
      ${!m.done&&isDecision(m)? (dueTag(m)||'<span class="pill" style="background:rgba(240,160,32,.2);color:var(--warn)">결정</span>') : m.auto? '<span class="pill" style="background:var(--panel2);color:var(--dim)">🤖 자동</span>' : ''}</div>
      <div class="muted" style="font-size:11px;margin-top:2px">${esc(m.from)} · ${m.year} · ${m.ug}경기차</div></div>`).join('') || `<div class="muted" style="padding:12px">${empty}</div>`;
  const defLine = sel&&!sel.done&&sel.due!=null&&sel.actions[sel.def]? `<div class="hint" style="margin-top:10px">⏳ ${state.phase==='stove'?'시즌이 시작되면 ':''}${Math.max(0,dueLeft(sel))}경기 안에 결정하지 않으면 "${esc(sel.actions[sel.def].label)}"(으)로 처리됩니다.</div>` : '';
  const detail = sel? `<div class="muted" style="font-size:12px">${sel.icon} ${esc(sel.from)} · ${sel.year} 시즌 ${sel.ug}경기차</div>
      <h3 style="margin:6px 0 12px;font-size:17px">${esc(sel.subject)}</h3>
      <div style="white-space:pre-wrap;line-height:1.7">${esc(sel.body)}</div>
      ${sel.actions.length? (sel.done? `<div class="deal-result deal-ok" style="margin-top:14px">${esc(sel.result||'처리됨')}</div>`
        : `<div class="row" style="margin-top:16px;gap:8px">${sel.actions.map((a,i)=>`<button class="btn ${i===0?'primary':''}" onclick="FM.act(${sel.id},${i})">${esc(a.label)}</button>`).join('')}</div>${defLine}`) : ''}`
    : '<div class="muted">메시지를 선택하세요.</div>';
  const ft=(id,l,n)=>`<button class="${inboxFilter===id?'active':''}" onclick="FM.setInboxFilter('${id}')">${l}${n?` <b>${n}</b>`:''}</button>`;
  return `<div class="grid" style="grid-template-columns:minmax(260px,380px) 1fr;gap:14px" id="inboxgrid">
    <div class="card" style="padding:10px"><h3>📥 받은편지함 <span class="tag"><a href="javascript:void(0)" onclick="FM.delegPicker()" style="color:var(--dim)">⚙ 업무 분담</a> · <a href="javascript:void(0)" onclick="FM.markAllRead()" style="color:var(--dim)">모두 읽음</a></span></h3>
      <div class="tabsm">${ft('all','전체',c.decide)}${ft('unread','읽지 않은 메시지',c.unread)}</div>
      <div style="max-height:620px;overflow:auto">${items}</div></div>
    <div class="card">${detail}</div></div>
    <style>@media(max-width:820px){#inboxgrid{grid-template-columns:1fr!important}}</style>`;
}

// ---------- first-career guide: the head coach explains five things, once ----------
const GUIDE=[
  {sel:'#nextStep', t:'취임을 축하드립니다, 감독님. 오른쪽 위 버튼이 언제나 <b>다음 할 일</b>입니다. 모르겠으면 이것만 눌러도 시즌이 굴러갑니다.'},
  {sel:'#tabs button[onclick*="inbox"]', t:'구단 소식과 결정할 일은 <b>받은편지함</b>에 모입니다. 급하지 않아요. 기한이 지나면 제가 기본값으로 처리합니다.'},
  {sel:'#tabs button[onclick*="lineup"]', t:'타순과 로테이션은 제가 <b>이미 짜 뒀습니다</b>. 바꾸고 싶을 때만 라인업 탭을 보세요.'},
  {sel:'.hero-more .gold', dash:true, skip:()=>!canQuickStart(), t:'준비 과정이 번거로우면 <b>추천 준비로 개막전까지</b>를 누르세요. 캠프와 시범경기를 제가 맡고 바로 개막전으로 모시겠습니다.'},
  {relay:true, t:'경기가 시작됐습니다. 위쪽 버튼으로 <b>재생·정지·끝까지</b>를, 대타·투수 교체·작전은 그 옆 메뉴에서 지시하세요. 바쁘면 끝까지를 눌러도 됩니다.'}
];
function guideRender(){
  if(typeof document.querySelector!=='function'||!document.body||!state||!state.fm) return;
  const old=document.getElementById('coachTip'); if(old) old.remove();
  document.querySelectorAll('.guide-hl').forEach(x=>x.classList.remove('guide-hl'));
  document.body.classList.remove('guide-relay');
  const g=state.fm.guide; if(!g||g.done) return;
  while(GUIDE[g.step]&&GUIDE[g.step].skip&&GUIDE[g.step].skip()) g.step++;
  const s=GUIDE[g.step]; if(!s){ g.done=true; return; }
  const relay=document.getElementById('relay'), cover=document.getElementById('prematch')||document.getElementById('result');
  if(s.relay? !relay||cover : relay||cover) return;
  if(s.dash&&currentTab!=='dash') return;
  if(!s.relay){ const t=document.querySelector(s.sel); if(t) t.classList.add('guide-hl'); } else document.body.classList.add('guide-relay');
  const name=(staffOf(USER).head||{}).n||'수석코치', last=g.step>=GUIDE.length-1;
  const tip=document.createElement('aside'); tip.id='coachTip'; tip.className='coach-tip'+(s.relay?' on-relay':''); tip.setAttribute('role','status');
  tip.innerHTML=`<small>${esc(name)} 수석코치 · ${g.step+1}/${GUIDE.length}</small><p>${s.t}</p>
    <div><button type="button" class="btn btn-quiet btn-sm" onclick="FM.guideSkip()">건너뛰기</button><button type="button" class="btn primary btn-sm" onclick="FM.guideNext()">${last?'알겠어요':'다음'}</button></div>`;
  document.body.appendChild(tip);
}
function guideNext(){ const g=fm().guide; if(!g) return; g.step++; if(g.step>=GUIDE.length) g.done=true; if(window.Track) Track.action('guide_'+g.step); guideRender(); }
function guideSkip(){ const g=fm().guide; if(!g) return; g.done=true; if(window.Track) Track.action('guide_skip'); guideRender(); }

// ---------- welcome back: what happened last, what to do next, that the career is safe ----------
let returnInfo=null;
function noteReturn(savedAt, finished){ if(finished || Date.now()-(savedAt||0)>30*60000) returnInfo={savedAt, finished}; }
function dismissReturn(){ returnInfo=null; const el=document.getElementById('returnCard'); if(el) el.remove(); }
function returnCard(){
  if(!returnInfo) return '';
  const f=fm(), last=(f.feed||[])[0], next=heroInfo(standings().findIndex(x=>x.t===USER)+1);
  const when=returnInfo.savedAt? new Date(returnInfo.savedAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
  return `<section class="return-card" id="returnCard"><div><b>${returnInfo.finished?'끝난 경기까지 저장해 뒀어요.':'다시 오셨군요, 감독님.'}</b>
    <p>${last?`지난 경기: ${esc(last.title.replace(/^\S+\s/,''))}`:'아직 치른 경기가 없어요.'}${next&&next.title?` · 다음: ${esc(next.title)}`:''}${when?` · ${when} 자동 저장`:''}</p></div>
    <button type="button" class="closeX" style="position:static" onclick="FM.dismissReturn()" aria-label="닫기">×</button></section>`;
}

// ---------- UI: dashboard (design pass 1: hero → decisions → reference panels) ----------
// Decisions the manager owes right now, most urgent first. Each: {ic, t, d, a, go}
function dashTasks(){
  ensure();
  const f=fm(), out=[], c=state.cfgs[USER];
  const camp=f.camp&&f.camp.year===state.year&&f.camp.focus;
  const dr=draftState(); if(dr&&!draftDone(dr)&&draftOnClock(dr)===USER) out.push({req:true, ic:'trophy', t:`신인 드래프트 ${Math.floor(dr.pick/dr.order.length)+1}라운드 — 우리 차례`, d:`스카우트 팀 · 지명 ${dr.picks[USER].length}/${DRAFT_ROUNDS}`, a:'지명하기', go:'FM.showDraft()'});
  const tw=tradeWindow(); if(state.phase==='regular'&&tw.open&&tw.daysLeft!=null&&tw.daysLeft<=14) out.push({ic:'trade', t:`트레이드 마감 D-${tw.daysLeft}`, d:`단장 · ${DEADLINE[0]}월 ${DEADLINE[1]}일까지 · 마감이 가까워 제안이 늘어납니다`, a:'트레이드', go:"App.tab('trade')"});
  if(state.phase==='stove'){ const oh=offHero(); out.push({req:true, ic:'camp', t:oh.title, d:oh.hint||'이번 주의 결정을 내리세요', a:oh.cta, go:"FM.offOpen()"}); }
  // real decisions only (plain acknowledgements are reports), soonest deadline first, press last
  const open=f.inbox.filter(m=>!m.done&&isDecision(m));
  const rankOf=m=>(msgType(m)==='press'?1000:0)+(m.due==null?500:dueLeft(m));
  open.sort((a,b)=>rankOf(a)-rankOf(b)).forEach(m=>{
    const renew=m.actions.some(a=>a.fn==='renew'), trade=m.actions.some(a=>/Trade$/.test(a.fn));
    out.push({ic:renew?'contract':trade?'trade':'inbox', t:m.subject, d:`받은편지함 · ${m.from}${m.due!=null&&state.phase!=='stove'?` · ${dueLeft(m)<=0?'오늘 마감':'D-'+dueLeft(m)} (기본: ${m.actions[m.def].label})`:''}`, a:renew?'조건 검토':trade?'제안 검토':'검토', go:`App.tab('inbox');FM.openMsg(${m.id})`});
  });
  const inj=allPlayers(USER).filter(K.isInjured), used=c.lineup.concat(c.rotation);
  const injIn=inj.filter(p=>used.includes(p.n));
  if(injIn.length) out.push({ic:'injury', t:`부상 선수 ${injIn.length}명이 라인업·로테이션에 있음`, d:'의무팀 · '+injIn.map(p=>`${p.n} (회복 ${p.inj})`).join(', '), a:'라인업 확인', go:"App.tab('lineup')"});
  const tired=allPlayers(USER).filter(p=>!K.isInjured(p)&&K.cond(p)<60&&c.lineup.includes(p.n));
  if(tired.length && !f.autoRest) out.push({ic:'lineup', t:`지친 주전 ${tired.length}명`, d:'수석코치 · '+tired.map(p=>p.n).join(', ')+' · 휴식 권장', a:'라인업 확인', go:"App.tab('lineup')"});
  if(state.phase==='stove'){
    if(!c.tac) out.push({ic:'settings', t:'팀 기본 전술 정하기', d:'팀 전술 탭 · 공격·수비·배터리 기본값', a:'전술 설정', go:"App.tab('tactics')"});
    out.push({ic:'money', t:'FA·외국인 선수 시장 살펴보기', d:`FA ${(f.fa||[]).length}명 · 외국인 ${fxCount(USER).f}/${FX_F} · 아시아쿼터 ${fxCount(USER).aq}/${FX_AQ} · 교체 횟수 차감 없음`, a:'구단 화면', go:"App.tab('club')"});
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
// 팀 전술 tab: the team plan, how well the squad knows it, and the opponent file
function renderTacticsTab(){
  ensure();
  const pm = state.pendingGame!=null && typeof pendingMatch==='function' ? pendingMatch() : null;
  const banner = pm? `<div class="card" style="margin-bottom:14px"><div class="row" style="justify-content:space-between;gap:8px">
      <div><b>⚾ 경기 대기 중</b> — 경기별 전술은 경기 전 "라인업·전략" 화면에서 따로 바꿀 수 있습니다.</div>
      <button class="btn primary" onclick="App.startMatch()">경기 준비 화면</button></div></div>` : '';
  return banner + `<div class="hint" style="margin-bottom:10px">여기서 정한 전술이 매 경기의 기본값입니다. 같은 전술을 오래 쓸수록 선수단 숙련도가 올라 효과가 커집니다.</div>`
    + tacticsCard('team');
}
// rest management lives in 업무 분담 (수석코치); the lineup tab no longer repeats it
function lineupCard(){ return ''; }

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
        <div class="k"><div class="v">${s.rank}위</div><div class="l">현재 순위 (전력 평가 ${b.strengthRank}위)</div></div>
        <div class="k"><div class="v">${Math.round(fans())}</div><div class="l">팬 여론 · ${fansLabel(fans())}</div></div></div>
      ${f.pledge&&f.pledge.year===state.year?`<div class="hint" style="margin-top:8px">🎤 공약: <b>${esc(f.pledge.label)}</b> — 시즌 종료 후 평가</div>`:''}
      ${f.rival&&f.rival.year===state.year?`<div class="hint">⚔ 라이벌 ${K.ROSTERS[f.rival.t].name}: ${f.rival.w}승 ${f.rival.l}패</div>`:''}
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
  const pRow=(p,extra,btn)=>`<tr><td class="name">${esc(p.n)}${p.f?` <span class="pill pos">${fxLabel(p)}</span>`:''}</td><td><span class="pill pos">${p.pos||p.role}</span></td><td>${p.age}</td>
    <td><span class="ovr ${ovrClass(K.ovr(p))}">${K.ovr(p)}</span></td><td>${p.type==='B'?`컨${attrNum(p.con)} 파${attrNum(p.pow)} 선${attrNum(p.eye)} 수${attrNum(p.fld)}`:`구${attrNum(p.stu)} 제${attrNum(p.ctl)} 무${attrNum(p.mov)} 체${attrNum(p.sta)}`}</td><td>${extra}</td><td>${btn}</td></tr>`;
  if((f.fa||[]).length){
    const list=f.fa.map((x,i)=>({x,i})).sort((a,b)=>K.ovr(b.x.p)-K.ovr(a.x.p));
    out.push(`<div class="card" style="margin-top:14px"><h3>🆓 FA 시장 <span class="tag">다음 시즌 시작 전까지 · 계약금 = 연봉×연수×25%</span></h3>
      <div style="overflow-x:auto"><table><thead><tr><th class="name">선수</th><th>POS</th><th>나이</th><th>OVR</th><th>능력</th><th>요구 조건</th><th></th></tr></thead><tbody>
      ${list.map(({x,i})=>pRow(x.p, `${x.yrs}년 ${x.ask}억 <span class="muted">(전 ${esc(x.from)})</span>`, `<button class="btn" onclick="FM.signFA(${i})">계약</button>`)).join('')}</tbody></table></div></div>`);
  }
  const mine=foreignOf(USER), open=fxWindowOpen(), left=fxSwapsLeft();
  out.push(`<div class="card" style="margin-top:14px"><h3>🌏 외국인 선수 <span class="tag">외국인 ${fxCount(USER).f}/${FX_F} · 아시아쿼터 ${fxCount(USER).aq}/${FX_AQ} · 교체 ${Math.max(0,left)}회 남음 · 108경기 전까지</span></h3>
    <div class="muted" style="margin-bottom:8px">현재: ${mine.map(p=>`${esc(p.n)}(${p.aq?'아시아쿼터 · ':''}${p.pos||p.role}·${K.ovr(p)}·${p.sal}억${isFarm(USER,p)?' · 2군':''})`).join(', ')||'없음'}</div>
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
// pitcher profile: 보직 숙련도 bars, then the pitches he throws (and the one he's learning)
function pitcherJobs(p){
  const bars=['SP','RP','CL'].map(j=>{ const v=K.roleSkill(p,j); return `<div class="job-row"><span>${JOB_L[j]}${j===p.role?' <small>주 보직</small>':''}${p.rt===j?' <small>훈련 중</small>':''}</span><div class="pt-bar"><i style="width:${v}%"></i></div><b>${v}%</b></div>`; }).join('');
  const pit=K.repertoire(p).map(t=>`<span class="pill pos">${t.k}${(p.np||[]).indexOf(t.k)>=0?' · 새로 익힘':''}</span>`).join(' ');
  return `<div class="job-list">${bars}</div><div class="muted" style="font-weight:700;margin:14px 0 6px">보유 구종</div><div class="row" style="gap:4px;flex-wrap:wrap">${pit}${p.pq&&p.pq.k?` <span class="pill" style="background:var(--panel2);color:var(--dim)">연마 중: ${p.pq.k} ${p.pq.pct||0}%</span>`:''}</div>`; }
function posStars(p){
  if(p.type!=='B') return pitcherJobs(p);
  return ['C','1B','2B','3B','SS','LF','CF','RF','DH'].map(x=>{
    const fit=K.posFit(p,x), s = x===p.pos?3 : x==='DH'?2 : fit<=6?2 : 1;
    return `<span class="pill" style="background:${s===3?'rgba(54,194,117,.25)':s===2?'rgba(127,208,255,.15)':'var(--panel2)'};color:${s===3?'var(--good)':s===2?'#7fd0ff':'var(--dim)'}">${x} ${'★'.repeat(s)}</span>`;
  }).join(' ');
}
function attrRow(label,v){ const a=attr20(v); return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 10px;background:var(--panel2);border-radius:6px;margin-bottom:5px"><span>${label}</span><b style="color:${attrColor(a)};font-size:16px">${a}</b></div>`; }
// the profile is its own full-screen page over the current tab (dialogs still open above it)
function profilePage(team, name, html){
  if(typeof closeModal==='function') closeModal();
  let o=document.getElementById('profpage'); const key=team+'|'+name;
  if(!o){ o=document.createElement('div'); o.id='profpage'; o.className='matchpage profpage';
    o.setAttribute('role','dialog'); o.setAttribute('aria-modal','true'); o.setAttribute('aria-label','선수 프로필'); document.body.appendChild(o); }
  const keep=o.dataset.key===key, sc=o.scrollTop; o.dataset.key=key;
  o.innerHTML=`<div class="mp-wrap"><div class="mp-bar">
      <button class="btn" onclick="FM.closeProfile()" aria-label="이전 화면으로">← 돌아가기</button>
      <h2>선수 프로필</h2><small>${teamDot(team)} ${K.ROSTERS[team].name}</small></div>
    <div class="card prof-body">${html}</div><div style="height:calc(24px + env(safe-area-inset-bottom,0px))"></div></div>`;
  o.scrollTop= keep? sc : 0;
}
function closeProfile(){ const o=document.getElementById('profpage'); if(o&&o.remove) o.remove(); }
// keep an open profile in step with the game after any change (promotion, trade, release)
function refreshProfile(){
  const o=document.getElementById('profpage'); if(!o||!o.dataset||!o.dataset.key||!profKey) return;
  const t=findTeamOf(profKey[1]); if(!t){ closeProfile(); return; }
  showProfile(t,profKey[1]);
}
if(typeof document!=='undefined'&&document.addEventListener) document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && !document.querySelector('.modal-bg') && document.getElementById('profpage')) closeProfile(); });
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
      <button class="btn" onclick="FM.closeProfile();App.tab('train')">훈련 설정</button></div>
      ${block?`<div class="hint">${esc(block)}</div>`:''}`
    : mine? `<div class="row" style="margin-top:14px;gap:6px">
      <button class="btn" onclick="FM.talk('${q(name)}','praise')">👏 칭찬하기</button>
      <button class="btn" onclick="FM.talk('${q(name)}','scold')">😤 질책하기</button>
      <button class="btn" onclick="FM.toggleRest('${q(name)}')">${resting?'↩ 휴식 취소':'🛌 다음 경기 휴식'}</button>
      <button class="btn" onclick="FM.toggleList('${q(name)}')">${p.listed?'📋 트레이드 리스트 해제':'📋 트레이드 리스트 등록'}</button>
      <button class="btn" onclick="FM.demote('${q(name)}')">2군으로</button>
      <button class="btn" onclick="FM.releasePlayer('${q(name)}')">📤 방출</button></div>` : '';
  profilePage(team, name, `
    <div class="row" style="align-items:center;gap:16px;flex-wrap:wrap">
      <div style="width:64px;height:64px;border-radius:50%;background:conic-gradient(${ratColor(o)} ${o}%, var(--panel2) 0);display:flex;align-items:center;justify-content:center">
        <div style="width:52px;height:52px;border-radius:50%;background:var(--panel);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:${ratColor(o)}">${o}</div></div>
      <div style="flex:1;min-width:200px"><h2 style="margin:0">${esc(name)}${p.rookie?' <span class="pill pos">신인</span>':''}</h2>
        <div class="muted">${teamDot(team)} ${K.ROSTERS[team].name}${farm?' <span class="chip">2군</span>':''} · ${p.age}세 · ${posFull(p.pos||p.role)}</div>${p.dr?`<div class="muted" style="font-size:12px;margin-top:2px">${p.dy} 신인 드래프트 ${p.dr.r}라운드 · ${esc(p.dr.school)}${p.dr.team!==team?` · ${esc(p.dr.team)} 지명`:''}</div>`:''}
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
    <div class="tabsm" style="margin-bottom:12px">${[['overview','개요'],['season',state.year+' 시즌'],['analysis','분석'],['career','통산 기록'],['log','최근 경기']].map(([k,l])=>`<button class="${profTab===k?'active':''}" onclick="FM.profileTab('${k}')">${l}</button>`).join('')}</div>
    ${profTab==='season'? seasonPanel(team,p) : profTab==='analysis'? analysisPanel(team,p) : profTab==='career'? careerPanel(team,p) : profTab==='log'? logPanel(team,p) : `
    <div class="grid" style="grid-template-columns:1fr auto;gap:14px;align-items:start" id="profgrid">
      <div>${attrs}<div class="hint">능력치 1~20 (FM 스케일) · 16+ 최상급, 11~15 준수, 6~10 평범, 5 이하 약점</div></div>
      <div style="text-align:center">${rad}</div></div>
    <style>@media(max-width:640px){#profgrid{grid-template-columns:1fr!important}}</style>
    <div class="muted" style="font-weight:700;margin:12px 0 6px">${p.type==='P'?'보직 숙련도':'포지션 적합도'}</div>${p.type==='P'? posStars(p) : `<div class="row" style="gap:4px">${posStars(p)}</div>`}
    <div class="muted" style="font-weight:700;margin:14px 0 6px">최근 5경기 평점</div><div class="row" style="gap:4px">${form}</div>
    <div class="muted" style="font-weight:700;margin:14px 0 6px">${state.year} 시즌 성적</div>${statLine}`}
    ${actions}`);
}

