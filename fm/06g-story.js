// ---------- 0.82: the manager's own story (docs/immersion-plan-1122.md C3, B4) ----------
// "감독의 선수": players this manager drafted, called up, signed, traded for, or picked in an opening-day battle.
// Their milestones become news and land in the season recap. The opening-day picks get a check-in
// once the season has a sample (3 starts / 15 games), with a keep-or-reopen call.
// State: fm().mine = {n: {why, y, base:{W,HR,SV}}}, fm().opening = {y, picks:[...]}, fm().mineLog = [{y, n, t}]
function mineState(){ const f=fm(); f.mine=f.mine||{}; f.mineLog=f.mineLog||[]; return f.mine; }
const MINE_WHY={draft:'직접 지명', callup:'직접 콜업', fa:'직접 영입', trade:'트레이드 영입', battle:'개막 주전으로 선택', needs:'보강 과제로 기회'};
function seasonLineOf(n){ const s=state.season&&state.season[USER]; return {b:s&&s.bat[n]||null, p:s&&s.pit[n]||null}; }
function storyMark(n,why){ const m=mineState(), p=findPlayer(USER,n); if(!p) return;
  const L=seasonLineOf(n); m[n]={why, y:state.year, base:{y:state.year, W:(L.p&&L.p.W)||0, HR:(L.b&&L.b.HR)||0, SV:(L.p&&L.p.SV)||0, G:Math.max((L.b&&L.b.G)||0,(L.p&&L.p.G)||0)}, hit:{}}; }
function storyNote(n){ const x=mineState()[n]; return x? `감독의 선수 · ${x.y} ${MINE_WHY[x.why]||x.why}` : ''; }
// hooks on the manager's own moves (wrapping keeps the original functions untouched)
const storyPromote=promote; promote=function(n){ const was=farmOf(USER).some(p=>p.n===n); const out=storyPromote(n); if(was&&!farmOf(USER).some(p=>p.n===n)) storyMark(n,'callup'); return out; };
const storyDraftPick=draftPick; draftPick=function(n){ const d=draftState(), mine=d&&!draftDone(d)&&draftOnClock(d)===USER; const out=storyDraftPick(n); if(mine&&findPlayer(USER,n)) storyMark(n,'draft'); return out; };
const storyFaSign=faSignWith; faSignWith=function(x,t,b){ const n=x&&x.p&&x.p.n, out=storyFaSign(x,t,b); if(t===USER&&n&&findPlayer(USER,n)) storyMark(n,'fa'); return out; };
const storyTrade=executeClubTrade; executeClubTrade=function(a,b,aGive,bGive,kind){ const out=storyTrade(a,b,aGive,bGive,kind);
  if(a===USER) bGive.forEach(p=>storyMark(p.n,'trade')); if(b===USER) aGive.forEach(p=>storyMark(p.n,'trade')); return out; };
// opening-day job battle settled (fm/05b-preseason2.js battleApply)
function storyOpening(b,win,lose,auto){ const f=fm(); if(!f.opening||f.opening.y!==state.year) f.opening={y:state.year,picks:[]};
  f.opening.picks.push({k:b.k,label:b.label,win:win.n,lose:lose.n,wl:springLine(win.n).txt,ll:springLine(lose.n).txt,auto:!!auto,done:false});
  if(!auto){ storyMark(win.n,'battle'); addTrust(win,8,'개막 주전으로 선택'); addTrust(lose,-6,'개막 주전 경쟁에서 밀림'); } }
// after each of our games: opening check-ins and milestones
function storyTick(){ if(state.phase!=='regular'&&state.phase!=='postseason') return; const f=fm(), ug=userGamesPlayed(); trustSweep(); boardCheckTick();
  if(f.opening&&f.opening.y===state.year) f.opening.picks.forEach((x,i)=>{ if(x.done) return; const L=seasonLineOf(x.win);
    const ready=x.k==='SP5'? L.p&&(L.p.GS||0)>=3 : L.b&&(L.b.G||0)>=15; if(!ready) return; x.done=true;
    const now=x.k==='SP5'? `선발 ${L.p.GS}경기 ${ipStr(L.p.OUT)}이닝 ERA ${fmtEra(L.p.ER,L.p.OUT)}` : `${L.b.G}경기 ${L.b.AB}타수 ${L.b.H}안타 ${L.b.HR}홈런 · 타율 ${fmtAvg(L.b.H/Math.max(1,L.b.AB))}`;
    const lose=findPlayer(USER,x.lose), lp=lose&&isFarm(USER,lose)? '2군에서 기회를 기다리고 있습니다.' : lose? '1군 벤치에서 기회를 기다리고 있습니다.' : '팀을 떠났습니다.';
    x.now=now;
    send('수석코치','🔁',`개막 때 고른 ${x.win}: 중간 점검`,josa(`개막 ${x.label} 경쟁에서 ${x.auto?'수석코치 추천으로 ':''}${x.win}을(를) 택했습니다. (시범경기 ${x.wl})\n지금까지 ${now}.\n\n경쟁했던 ${x.lose}은(는) ${lp}`),
      [{label:`${x.win}에게 계속 맡긴다`, fn:'openingKeep', arg:{i}}].concat(lose&&!isFarm(USER,lose)?[{label:`${x.lose}에게 다시 기회를 준다`, fn:'openingSwap', arg:{i}}]:[])); });
  const m=mineState();
  for(const n in m){ const x=m[n], p=findPlayer(USER,n); if(!p||isFarm(USER,p)) continue; const L=seasonLineOf(n), base=x.base&&x.base.y===state.year? x.base : {W:0,HR:0,SV:0,G:0};
    x.hit=x.hit||{}; const key=k=>state.year+':'+k, said=k=>x.hit[key(k)], say=(k,t)=>{ x.hit[key(k)]=1; storyNews(n,t); };
    const W=(L.p&&L.p.W)||0, HR=(L.b&&L.b.HR)||0, SV=(L.p&&L.p.SV)||0, G=Math.max((L.b&&L.b.G)||0,(L.p&&L.p.G)||0);
    if(['draft','callup','needs'].includes(x.why)&&G>base.G&&!said('app')) say('app',`${n}, 1군 무대에 서다`);
    if(W>base.W&&!x.hit.W1){ x.hit.W1=1; say('W1',`${n}, 감독과 함께한 첫 승`); }
    if(HR>base.HR&&!x.hit.HR1){ x.hit.HR1=1; say('HR1',`${n}, 감독과 함께한 첫 홈런`); }
    if(SV>base.SV&&!x.hit.SV1){ x.hit.SV1=1; say('SV1',`${n}, 감독과 함께한 첫 세이브`); }
    if(W>=10&&!said('W10')) say('W10',`${n}, 시즌 10승 달성`);
    if(HR>=20&&!said('HR20')) say('HR20',`${n}, 시즌 20홈런 고지`);
    if(SV>=20&&!said('SV20')) say('SV20',`${n}, 시즌 20세이브`); } }
function storyNews(n,title){ const x=mineState()[n], f=fm(), why=x? MINE_WHY[x.why]||'' : '';
  f.mineLog.push({y:state.year,n,t:title}); if(f.mineLog.length>80) f.mineLog.shift();
  const body=josa(`${x?x.y+'년 감독이 '+why+'한 ':''}${n}이(가) 이정표를 세웠습니다.`);
  feedPush({title, body, year:state.year, kind:'press', ug:userGamesPlayed()}); send('구단 홍보팀','🌱',title,body,[]); }
ACTIONS.openingKeep=(m,a)=>{ const x=fm().opening&&fm().opening.picks[a.i]; const p=x&&findPlayer(USER,x.win); if(p) addMor(p,4); return x? josa(`${x.win}에게 계속 맡깁니다. 선수가 감독의 믿음을 느낍니다.`) : '처리했습니다.'; };
ACTIONS.openingSwap=(m,a)=>{ const x=fm().opening&&fm().opening.picks[a.i], c=state.cfgs[USER]; if(!x) return '처리했습니다.';
  const W=findPlayer(USER,x.win), Lo=findPlayer(USER,x.lose); if(!W||!Lo||isFarm(USER,Lo)) return josa(`${x.lose}은(는) 지금 1군에 없습니다.`);
  if(x.k==='SP5'){ const i=c.rotation.indexOf(x.win); if(i<0) return '로테이션이 이미 바뀌었습니다.'; c.rotation[i]=x.lose; c.bullpen=(c.bullpen||[]).filter(n=>n!==x.lose); if(c.bullpen.indexOf(x.win)<0) c.bullpen.push(x.win); }
  else { const i=c.lineup.indexOf(x.win); if(i<0||c.lineup.indexOf(x.lose)>=0) return '라인업이 이미 바뀌었습니다.'; c.lineup[i]=x.lose; }
  addMor(Lo,8); addMor(W,-6); memo('reopen',x.lose,`${x.label} 경쟁 재개: ${x.lose}에게 기회`);
  return josa(`${x.lose}이(가) 다시 기회를 받습니다. ${x.win}은(는) 아쉬워합니다.`); };
// season recap pieces
function storyRecap(){ const f=fm(); return {opening:(f.opening&&f.opening.y===state.year? f.opening.picks : []).map(x=>({label:x.label,win:x.win,lose:x.lose,wl:x.wl,now:x.now||null})),
  mine:(f.mineLog||[]).filter(x=>x.y===state.year).map(x=>x.t).slice(-6)}; }
// ----- 상무 (A7): "내년 상무 지원" becomes a real two-season absence -----
// The stove event leaves flags.military = name. Next stove league the result arrives: accepted players leave the
// roster for two seasons (kept in fm().away with their contract frozen, growing a little), then come back to the 2군.
function militaryTick(){ const f=fm(), e=typeof evtState==='function'? evtState() : null; f.mil=f.mil||{}; f.away=f.away||{};
  if(e&&e.flags.military){ const n=e.flags.military; delete e.flags.military; if(!f.mil[n]) f.mil[n]={applied:state.year-1,status:'applied'}; }
  for(const n in f.mil){ const m=f.mil[n];
    if(m.status==='applied'&&state.year>m.applied){ const p=findPlayer(USER,n);
      if(!p){ m.status='gone'; continue; }
      if(Math.random()<0.7&&militaryLeave(p)){ m.status='serving'; m.back=state.year+2;
        send('구단 운영팀','🪖',`${n} 상무 합격`,josa(`${n}이(가) 상무에 합격했습니다. ${state.year}~${state.year+1}시즌 동안 국군체육부대에서 뛰고 ${state.year+2}시즌에 돌아옵니다.\n빈자리를 어떻게 채울지 정해야 합니다.`),[]);
        feedPush({title:`${n}, 상무 합격`, body:josa(`${n}이(가) 상무에 입대합니다. 두 시즌 뒤 돌아옵니다.`), year:state.year, kind:'press', ug:0}); }
      else { m.status='failed'; addMor(p,-4); send('구단 운영팀','🪖',`${n} 상무 불합격`,josa(`${n}이(가) 상무 서류 전형에서 떨어졌습니다. 올해도 팀에 남습니다. 본인은 다소 실망했습니다.`),[]); } }
    else if(m.status==='serving'&&state.year>=m.back){ const a=f.away[n]; delete f.away[n]; m.status='back';
      if(a&&a.p){ const p=a.p; farmOf(USER).push(p); p.bench=0; addMor(p,6);
        send('구단 운영팀','🎖',`${n} 전역 복귀`,josa(`${n}이(가) 전역하고 돌아왔습니다. 퓨처스에서 몸을 만든 뒤 1군 콜업을 기다립니다. (OVR ${K.ovr(p)})`),[]);
        feedPush({title:`${n}, 전역 후 복귀`, body:josa(`${n}이(가) 두 시즌의 군 복무를 마치고 팀에 합류했습니다.`), year:state.year, kind:'press', ug:0}); } } } }
function militaryLeave(p){ const r=K.ROSTERS[USER], farm=farmOf(USER);
  if(farm.includes(p)) farm.splice(farm.indexOf(p),1);
  else { const arr=p.type==='B'? r.batters : r.pitchers;
    if(p.type==='B'&&arr.length<=MIN_1B||p.type!=='B'&&arr.length<=MIN_1P||p.type!=='B'&&p.role==='SP'&&arr.filter(x=>x.role==='SP').length<=5) return false;
    arr.splice(arr.indexOf(p),1); }
  const keys=p.type==='B'? ['con','pow','eye','fld'] : ['stu','ctl','mov','sta']; bumpWithin(p,keys[Math.floor(Math.random()*keys.length)],2);
  depart(p,'상무 입대'); fm().away[p.n]={p, back:state.year+2}; if(state.cfgs[USER]) repairCfg(USER); return true; }

// ----- 감독 신뢰 (B1): each player remembers how this manager treated him -----
// p.trust 0..100 (50 = neutral), p.tlog = last five reasons. Used in renewals, FA retention and benching complaints.
function trustOf(p){ return p&&p.trust!=null? p.trust : 50; }
function addTrust(p,d,why){ if(!p||!d) return; p.trust=clampN(Math.round(trustOf(p)+d),0,100);
  p.tlog=(p.tlog||[]); p.tlog.push([state.year,why,d]); if(p.tlog.length>5) p.tlog.shift(); }
function trustLabel(v){ return v>=75?'깊은 신뢰':v>=60?'좋음':v>=40?'보통':v>=25?'서운함':'불신'; }
function trustCard(p){ if(!p||!state.fm) return ''; const v=trustOf(p), L=(p.tlog||[]).slice().reverse();
  return `<div class="card" style="margin-top:12px"><h3>🤝 감독과의 관계 <span class="tag">${trustLabel(v)} · ${v}</span></h3>
    <div class="progress" style="margin:4px 0 8px"><i style="width:${v}%;background:${v>=60?'var(--good)':v>=40?'var(--warn)':'var(--bad)'}"></i></div>
    ${L.length? `<ul class="ev-notes">${L.map(([y,w,d])=>`<li>${y} · ${esc(w)} <span class="muted">(${d>0?'+':''}${d})</span></li>`).join('')}</ul>` : '<p class="muted">아직 특별한 일이 없었어요.</p>'}</div>`; }
// promise verdicts from the event engine land in flags as promise:<id>|<name>
function trustSweep(){ const e=typeof evtState==='function'? evtState() : null, f=fm(); if(!e) return; f.trustSeen=f.trustSeen||{};
  for(const k in e.flags){ if(k.indexOf('promise:')!==0||f.trustSeen[k]===e.flags[k]) continue; f.trustSeen[k]=e.flags[k];
    const p=findPlayer(USER,k.split('|').pop()); if(p) addTrust(p,e.flags[k]?12:-15,e.flags[k]?'약속을 지킴':'약속을 어김'); }
  allPlayers(USER).forEach(p=>{ if(p.listed&&!p.listedT){ p.listedT=1; addTrust(p,-10,'트레이드 리스트 등록'); } if(!p.listed&&p.listedT) p.listedT=0; }); }
const trustDemote=demote; demote=function(n){ const p=findPlayer(USER,n), was=p&&!isFarm(USER,p); const out=trustDemote(n); if(was&&isFarm(USER,p)) addTrust(p,-6,'2군 말소'); return out; };
const trustPromote=promote; promote=function(n){ const p=farmOf(USER).find(x=>x.n===n); const out=trustPromote(n); if(p&&!isFarm(USER,p)) addTrust(p,5,'1군 콜업'); return out; };

// ----- 이사회 중간 평가 (B3): after 40 and 80 games the board checks the way the club is run, not just the rank -----
function boardCheckTick(){ const f=fm(), o=f.off&&f.off.year===state.year? f.off : null, ug=userGamesPlayed(); if(state.phase!=='regular'||!o||!o.mode) return;
  f.bchk=f.bchk||{}; const k=ug>=80?'80':ug>=40?'40':null; if(!k||f.bchk[state.year+':'+k]) return; f.bchk[state.year+':'+k]=1;
  const s=state.season[USER], rank=standings().findIndex(x=>x.t===USER)+1, b=f.board, goal=b.expect&&b.expect.rank||5;
  let ok, why;
  if(o.mode==='rebuild'){ let young=0, all=0; allPlayers(USER).forEach(p=>{ const x=s.bat[p.n], q=s.pit[p.n]; const w=(x&&x.PA||0)+(q&&q.OUT||0); all+=w; if(p.age<=25) young+=w; });
    const pct=all? Math.round(young/all*100) : 0; ok=pct>=25; why=`리빌딩을 약속했습니다. 25세 이하 선수의 출전 비중 ${pct}% (기준 25%).`; }
  else if(o.mode==='win'){ ok=rank<=goal; why=`우승 도전을 선언했습니다. 현재 ${rank}위 (목표 ${goal}위 이내).`; }
  else { ok=f.fin.balance>=0&&fans()>=45; why=`균형 운영을 약속했습니다. 잔고 ${f.fin.balance.toFixed(1)}억 · 팬 여론 ${Math.round(fans())}.`; }
  b.conf=clampN(b.conf+(ok?3:-4),0,100);
  send('이사회','🏛',`${k}경기 중간 평가: ${ok?'계획대로':'우려'}`, `${why}\n\n${ok?'이사회는 운영 방향에 만족합니다. (신뢰 +3)':'이사회는 약속과 다른 운영을 우려합니다. (신뢰 -4)'}`,
    [{label:'운영 방향을 설명한다', fn:'boardExplain', arg:{ok}},{label:'계획을 균형 운영으로 바꾼다', fn:'boardShift', arg:{}},{label:'예산 증액을 요청한다', fn:'boardBudget', arg:{}}]); }
ACTIONS.boardExplain=(m,a)=>{ const b=fm().board; if(a.ok){ b.conf=clampN(b.conf+1,0,100); return '이사회가 감독의 설명에 고개를 끄덕였습니다. (신뢰 +1)'; } return '이사회는 결과로 보여 달라고 했습니다.'; };
ACTIONS.boardShift=()=>{ const o=fm().off; if(o) o.mode='keep'; const b=fm().board; b.conf=clampN(b.conf-1,0,100); return '올 시즌 운영 방향을 균형으로 바꿨습니다. 다음 평가부터 이 기준을 씁니다. (신뢰 -1)'; };
ACTIONS.boardBudget=()=>{ const f=fm(), b=f.board; if(b.conf>=60){ f.fin.budget=eok(f.fin.budget*1.05); return `이사회가 예산을 늘렸습니다. 예산 ${eok(f.fin.budget)}억.`; } b.conf=clampN(b.conf-3,0,100); return '이사회가 요청을 거절했습니다. 지금은 신뢰가 부족합니다. (신뢰 -3)'; };

// ----- 스카우팅 (B2): other clubs' players are seen through a report with a margin of error -----
// knowledge 0..1: own players 1; others start at 0.4, rise with games against their club, the analyst, and scout visits.
function scoutState(){ const f=fm(); f.scout=f.scout||{}; return f.scout; }
function scoutK(team,p){ if(!p) return 1; if(team===USER) return 1; const f=fm(), vs=(state.schedule||[]).filter(g=>g.played&&((g.home===USER&&g.away===team)||(g.away===USER&&g.home===team))).length;
  const ana=typeof coachQOf==='function'? (coachQOf('ana')-10)*0.02 : 0; return clampN(0.4+Math.min(0.3,vs*0.02)+ana+(scoutState()[p.n]||0)*0.25,0,1); }
function scoutSlot(){ const o=fm().off; return state.phase==='stove'&&o? 's'+state.year+':'+o.week : state.phase+state.year+':'+Math.floor(userGamesPlayed()/6); }
function scoutCanSend(){ return fm().scoutSlot!==scoutSlot(); }
function scoutSend(team,n){ if(!scoutCanSend()){ notify('이번 주 스카우트는 이미 나갔어요. 다음 주(6경기 뒤)에 다시 보낼 수 있어요.'); return; }
  const s=scoutState(); s[n]=(s[n]||0)+1; fm().scoutSlot=scoutSlot(); if(window.Track) Track.action('scout_send');
  notify(josa(`스카우트가 ${n}을(를) 보고 왔어요. 보고서가 더 정확해졌어요.`)); if(team) showProfile(team,n); else if(typeof draftState==='function'&&draftState()) showDraft(); else render(); }
// a range that always holds the true value; the same player shows the same range until the report improves
function scoutRange(v,k,seed,lo,hi){ const w=Math.round((1-k)*(hi-lo)*0.3); if(w<=0) return null; const off=hash(seed)%(w+1); return [Math.max(lo,v-off),Math.min(hi,v-off+w)]; }
function attrRowK(label,v,k,seed){ const a=attr20(v), r=scoutRange(a,k,seed+label,1,20); if(!r) return attrRow(label,v);
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 10px;background:var(--panel2);border-radius:6px;margin-bottom:5px"><span>${label}</span><b style="color:var(--dim);font-size:15px">${r[0]}~${r[1]}</b></div>`; }
// OVR range at most ~6 wide
function ovrSeen(team,p){ const o=K.ovr(p), r=scoutRange(o,scoutK(team,p),p.n+'ovr',50,70); return r? `${r[0]}~${r[1]}` : String(o); }
function scoutNote(team,p){ if(team===USER) return ''; const k=Math.round(scoutK(team,p)*100);
  return `<div class="hint" style="margin:6px 0 10px">스카우트 보고서 정확도 ${k}% · 맞대결과 전력분석팀, 스카우트 파견으로 범위가 좁아져요. 계약하면 정확한 값이 보여요.
    ${k<100?` <button type="button" class="btn btn-sm" ${scoutCanSend()?'':'disabled'} onclick="FM.scoutSend('${team}','${String(p.n).replace(/'/g,"\'")}')">🔭 스카우트 파견${scoutCanSend()?'':' (이번 주 완료)'}</button>`:''}</div>`; }

// ----- 우천 취소 (A3): our game is rained out, the pitching coach asks about the rotation -----
function rainoutCard(){ const r=state.rainout; if(!r||r.asked||state.phase!=='regular') return; r.asked=true;
  const opp=r.home===USER? r.away : r.home, co=(staffOf(USER).pit||{}).n;
  send(co?co+' 투수코치':'투수코치','☔',`${r.date} ${K.ROSTERS[opp].name}전 우천 취소`,
    josa(`${r.date} ${K.ROSTERS[opp].name}전이 비로 취소돼 ${r.makeupDate}로 밀렸어요.
예정 선발은 ${r.sp}이에요. 하루 쉬고 그대로 나갈지, 로테이션을 한 칸 당길지 정해 주세요.`),
    [{label:'예정 선발 그대로 간다', fn:'rainKeep', arg:{}},{label:'로테이션을 한 칸 당긴다', fn:'rainPull', arg:{}}]); }
ACTIONS.rainKeep=()=>{ const r=state.rainout, p=r&&findPlayer(USER,r.sp); if(p) p.cond=clampN(K.cond(p)+4,0,100); return josa(`${r?r.sp:'예정 선발'}이(가) 하루 더 쉬고 그대로 나갑니다.`); };
ACTIONS.rainPull=()=>{ const n=window.App&&window.App.advanceRainoutRotation? window.App.advanceRainoutRotation() : false;
  return n? josa(`로테이션을 한 칸 당겼습니다. 다음 경기 선발은 ${n}이에요.`) : '지금은 로테이션을 바꿀 수 없습니다.'; };

// ----- 보직 변경 (feedback 11/15): the manager moves a pitcher between 선발 · 중계 · 마무리 -----
// The label and the depth chart change now; the skill for the new job grows through role training (p.rt), since
// core.js roleSkill reads p.skillRole (the role he was built for) until training completes the new job.
function setRole(n,j){ const p=findPlayer(USER,n), c=state.cfgs[USER], r=K.ROSTERS[USER]; if(!p||p.type==='B'||!JOB_L[j]||p.role===j) return;
  if(p.role==='SP'&&j!=='SP'&&!isFarm(USER,p)&&r.pitchers.filter(x=>x.role==='SP').length<=5){ notify('1군 선발이 5명 아래로 줄어요. 다른 투수를 먼저 선발로 바꾸세요.'); return; }
  const was=p.role; p.skillRole=p.skillRole||was; p.role=j;
  if(K.roleSkill(p,j)<100){ p.rt=j; } else if(p.rt===j) p.rt=null;
  const best=(ok)=>r.pitchers.filter(x=>x!==p&&!K.isInjured(x)&&ok(x)).sort((a,b)=>K.ovr(b)-K.ovr(a))[0];
  if(c.rotation.includes(n)&&j!=='SP'){ const sub=best(x=>x.role==='SP'&&!c.rotation.includes(x.n)); if(sub) c.rotation[c.rotation.indexOf(n)]=sub.n; }
  if(j==='CL'){ const old=findPlayer(USER,c.closer); if(old&&old!==p){ old.skillRole=old.skillRole||old.role; old.role='RP'; if((c.bullpen||[]).indexOf(old.n)<0) (c.bullpen=c.bullpen||[]).push(old.n); } c.closer=n; c.bullpen=(c.bullpen||[]).filter(x=>x!==n); }
  else if(c.closer===n){ const nc=best(x=>x.role!=='SP'); if(nc){ c.closer=nc.n; c.bullpen=(c.bullpen||[]).filter(x=>x!==nc.n); } }
  if(j==='RP'&&(c.bullpen||[]).indexOf(n)<0) (c.bullpen=c.bullpen||[]).push(n);
  if(j==='SP') c.bullpen=(c.bullpen||[]).filter(x=>x!==n);
  const down=was==='SP'||(was==='CL'&&j==='RP'), up=j==='SP'||j==='CL';
  if(down&&!up){ addMor(p,-4); addTrust(p,-3,JOB_L[was]+'에서 '+JOB_L[j]+'(으)로 전환'); }
  else if(up){ addMor(p,4); addTrust(p,3,JOB_L[j]+' 기회'); }
  if(typeof repairCfg==='function') repairCfg(USER); saveNow();
  notify(josa(`${n}을(를) ${JOB_L[j]}(으)로 바꿨어요.${K.roleSkill(p,j)<100?` 새 보직 숙련 ${Math.round(K.roleSkill(p,j))}% · 훈련으로 올라가요.`:''}${j==='SP'&&!c.rotation.includes(n)?' 로테이션에 넣으려면 라인업 탭에서 선발 칸을 바꾸세요.':''}`));
  showProfile(USER,n); }
