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
  if(!auto) storyMark(win.n,'battle'); }
// after each of our games: opening check-ins and milestones
function storyTick(){ if(state.phase!=='regular'&&state.phase!=='postseason') return; const f=fm(), ug=userGamesPlayed();
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
  fm().away[p.n]={p, back:state.year+2}; if(state.cfgs[USER]) repairCfg(USER); return true; }
