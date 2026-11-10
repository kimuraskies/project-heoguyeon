// ---------- offseason as weekly decisions (docs/offseason-redesign-plan.md) ----------
// Stove league (6 weeks, 3 in a first season), camp (4 weeks) and the exhibition games each put one
// decision in front of the manager. Events are plain data in the save: {id, who, icon, title, body,
// opts:[{l,d}], data}. EV[id].pick(i, data) applies a choice and returns the outcome text.
const POS_NEXT={SS:'2B','2B':'3B','3B':'1B',LF:'RF',RF:'CF',CF:'LF','1B':'LF',C:'1B'};
const CAMP_DEF={fit:3,skill:4,tac:2,rest:1};
const STOVE_FULL=['owner','renew','fa','trade','fa','coach'], STOVE_FIRST=['owner','fa','coach'];
const STOVE_RANDOM=['raise','rival','prospect','mentor','star','foreign'];
const CAMP_EVENTS=['newpitch','intensity','posswitch','form','feud','surprise','injury'];
function saveNow(){ try{ if(typeof autosave==='function') autosave(); }catch(e){} }
function bumpWithin(p,k,d){ let n=0; for(let i=0;i<d;i++){ const was=K.ovr(p); if(p[k]>=99) break; p[k]++; if(K.ovr(p)>Math.max(p.pot||0,was)){ p[k]--; break; } n++; } return n; }
const eok=x=>Math.round(x*10)/10;
function memo(k,who,txt,cb){ const f=fm(); f.memo=f.memo||[]; f.memo.push({y:state.year,k,who:who||null,txt,cb:cb||null}); if(f.memo.length>60) f.memo.shift(); }
function budgetRoom(){ const f=fm(); return eok(f.fin.budget*1.1-payroll(USER)); }

// ----- state -----
function offState(){ const f=fm();
  if(!f.off||f.off.year!==state.year){ const first=f.firstYear===state.year;
    f.off={year:state.year, stage:'stove', week:0, weeks:(first?STOVE_FIRST:STOVE_FULL).slice(), q:[], used:[], talked:[], mode:null, battles:null, mod:null};
    offFill(f.off); }
  return f.off; }
function campState(){ const f=fm(); if(!f.camp||f.camp.year!==state.year) f.camp={year:state.year,focus:null};
  const c=f.camp; c.week=c.week||0; c.log=c.log||[]; c.gain=c.gain||{}; c.notes=c.notes||[]; return c; }
function makeEvent(id,o){ const e=EV[id]&&EV[id].make(o); if(!e) return null; e.id=id;
  e.title=josa(e.title); e.body=josa(e.body); e.opts.forEach(x=>{ x.l=josa(x.l); x.d=josa(x.d); }); return e; }
function offFill(o){ o.q=[];
  if(o.stage==='stove'){ const e=makeEvent(o.weeks[o.week],o); if(e) o.q.push(e);
    if(o.week>0&&Math.random()<0.55){ const ids=STOVE_RANDOM.filter(id=>o.used.indexOf(id)<0).sort(()=>Math.random()-0.5);
      for(const id of ids){ const r=makeEvent(id,o); if(r){ o.used.push(id); o.q.push(r); break; } } } }
  else if(o.stage==='camp'){ const ids=CAMP_EVENTS.filter(id=>o.used.indexOf(id)<0).sort(()=>Math.random()-0.5);
    for(const id of ids){ const r=makeEvent(id,o); if(r){ o.used.push(id); o.q.push(r); break; } } }
  if(!o.q.length&&(o.stage==='stove'||o.stage==='camp')) offWeekEnd(o); }
// other clubs sign a few free agents every week
function offAiWeek(){ const f=fm(); (f.fa||[]).slice().sort((a,b)=>K.ovr(b.p)-K.ovr(a.p)).forEach(x=>{ if(K.ovr(x.p)>=64&&Math.random()<0.22) offAiSign(x); }); }
function offAiSign(x){ const f=fm(), p=x.p, t=K.TEAM_IDS.filter(t=>t!==USER).sort((a,b)=>teamStrength(a)-teamStrength(b))
    .find(t=>(p.type==='B'?K.ROSTERS[t].batters.length<15:K.ROSTERS[t].pitchers.length<13)&&!(p.f&&foreignOf(t).length>=FX_MAX));
  const i=f.fa.indexOf(x); if(i<0||!t) return null; f.fa.splice(i,1);
  p.sal=x.ask; p.yrs=x.yrs; ensurePlayer(p); (p.type==='B'?K.ROSTERS[t].batters:K.ROSTERS[t].pitchers).push(p); return t; }
function faSign(x,b){ const f=fm(), p=x.p; f.fa.splice(f.fa.indexOf(x),1);
  p.sal=b.sal; p.yrs=b.yrs; p.mor=72; p.cond=100; p.inj=0; p.listed=false; p.bench=0; p.newG=NEW_GAMES; ensurePlayer(p);
  const where=joinClub(USER,p), bonus=eok(b.sal*b.yrs*0.25); f.fin.balance-=bonus; f.fin.exp+=bonus;
  return `${p.n}와(과) ${b.yrs}년 연봉 ${b.sal}억에 계약했습니다. 계약금 ${bonus}억.${where==='2군'?' 1군 엔트리가 가득 차 2군에 등록했습니다.':''}`; }
function offWeekEnd(o){
  if(o.stage==='stove'){ offAiWeek(); o.week++; if(o.week>=o.weeks.length){ o.stage='dir'; o.q=[]; o.used=[]; return; } offFill(o); return; }
  if(o.stage==='camp'){ const c=campState(); campRunWeek(); if(c.week>=4){ o.stage='done'; o.q=[]; return; } offFill(o); } }
// applies a choice. Returns the outcome text.
function offResolve(i){ const o=offState(), e=o.q[0]; if(!e) return '';
  const opt=e.opts[i]||e.opts[0]; let res='';
  try{ res=EV[e.id].pick(e.opts.indexOf(opt),e.data,o)||''; }catch(err){ console.error('offseason event failed',e.id,err); res='처리하지 못했습니다.'; }
  res=josa(res);
  const m=send(e.who,e.icon,e.title,`${e.body}\n\n▶ ${opt.l}\n${res}`,[]); if(m) m.read=true;
  o.q.shift(); if(!o.q.length) offWeekEnd(o);
  return res; }

// ----- UI -----
function offHero(){ const o=offState(), n=o.weeks.length;
  if(o.stage==='stove') return {weeks:n, title:`스토브리그 ${o.week+1}/${n}주차`, cta:'이번 주 결정하기', hint:o.q[0]?`이번 주: ${o.q[0].title}`:'', auto:true};
  if(o.stage==='dir') return {weeks:n, title:'이제 캠프로 떠납니다.', cta:'캠프 방향 정하기', hint:'훈련 방향을 고르면 4주 캠프가 시작돼요.', auto:true};
  if(o.stage==='camp') return {weeks:n, title:`스프링캠프 ${campState().week+1}/4주차`, cta:'이번 주 결정하기', hint:o.q[0]?`이번 주: ${o.q[0].title}`:'', auto:true};
  return {weeks:n, title:'캠프를 마쳤습니다.', cta:'캠프 결산 보기', hint:'결산을 확인하고 시범경기로 넘어가세요.', auto:false}; }
const X_BTN='<button type="button" class="closeX" onclick="App.closeModal()" aria-label="닫기">×</button>';
function offOpen(){ const o=offState();
  if(o.stage==='dir'){ campPicker(); return; }
  if(o.stage==='done'){ campSummary(); return; }
  const e=o.q[0]; if(!e){ render(); return; }
  const where=o.stage==='stove'?`스토브리그 ${o.week+1}/${o.weeks.length}주차`:`스프링캠프 ${campState().week+1}/4주차`;
  closeModal();
  modal(`${X_BTN}<p class="eyebrow">${where}${o.q.length>1?` · 결정 ${o.q.length}건`:''}</p><h2>${esc(e.title)}</h2>
    <p class="ev-who">${e.icon} ${esc(e.who)}</p><p class="ev-body">${esc(e.body).replace(/\n/g,'<br>')}</p>
    <div class="ev-opts">${e.opts.map((x,i)=>`<button type="button" class="ev-opt" onclick="FM.offChoose(${i})"><b>${esc(x.l)}</b><small>${esc(x.d)}</small></button>`).join('')}</div>
    <div class="row" style="margin-top:10px"><button class="btn btn-quiet" onclick="FM.offAuto()">단장에게 맡기기</button></div>`); }
function offShowResult(title,label,res){ const o=offState(); closeModal();
  const next=o.stage==='dir'?'캠프 방향 정하기':o.stage==='done'?'캠프 결산 보기':'다음 결정';
  modal(`${X_BTN}<h2>${esc(title)}</h2><p class="ev-who">▶ ${esc(label)}</p><p class="ev-body">${esc(res).replace(/\n/g,'<br>')}</p>
    <div class="row" style="gap:8px;margin-top:12px"><button class="btn primary" onclick="FM.offOpen()">${next}</button><button class="btn" onclick="App.closeModal()">대시보드로</button></div>`); }
function offChoose(i){ const o=offState(), e=o.q[0]; if(!e) return; const label=(e.opts[i]||e.opts[0]).l, title=e.title;
  const res=offResolve(i); saveNow(); render(); offShowResult(title,label,res); if(window.Track) Track.action('off_choice',{id:e.id,i}); }
// the general manager (or the head coach in camp) takes the safe choice. all = run to the end of camp.
function offAuto(all,rnd){ const o=offState(); let n=0, last=null;
  while(n++<60){
    if(o.stage==='stove'||o.stage==='camp'){ const e=o.q[0]; if(!e){ offWeekEnd(o); continue; }
      const i=rnd? Math.floor(Math.random()*e.opts.length) : Math.min(e.opts.length-1, EV[e.id].safe==null?0:EV[e.id].safe);
      last={title:e.title,label:e.opts[i].l}; last.res=offResolve(i); }
    else if(o.stage==='dir'){ if(!all&&n>1) break; setCampCore(campState().focus||'bal'); }
    else break;
    if(!all) break; }
  saveNow(); if(all) return;
  render(); if(last) offShowResult(last.title,'단장에게 맡김: '+last.label,last.res); else offOpen(); }

// ----- camp -----
function setCampCore(k){ const c=campState(), o=offState(); c.focus=k; if(o.stage==='dir'){ o.stage='camp'; o.used=[]; offFill(o); } }
function setCamp(k){ const o=offState(), wasDir=o.stage==='dir'; setCampCore(k); if(window.Track) Track.action('camp'); saveNow();
  if(wasDir&&typeof document!=='undefined'&&document.querySelector&&document.querySelector('.modal')){ render(); offOpen(); } else render(); }
function campPicker(){ const c=campState(); closeModal();
  modal(`${X_BTN}<p class="eyebrow">스프링캠프</p><h2>${state.year} 캠프 훈련 방향</h2>
    <p class="ev-body">4주 동안 팀이 집중할 방향을 고르세요. 젊은 선수일수록 훈련 효과가 큽니다. 캠프 중에는 매주 결정할 일이 하나씩 생깁니다.</p>
    <div class="ev-opts">${Object.entries(CAMP).map(([k,x])=>`<button type="button" class="ev-opt${c.focus===k?' sel':''}" onclick="FM.setCamp('${k}')"><b>${x.label}</b><small>${x.d}</small></button>`).join('')}</div>`); }
function campRunWeek(){
  const c=campState(), w=c.week; if(w>=4) return '';
  const o=fm().off, mod=(o&&o.mod)||{}, pl=CAMP_DEF, fc=CAMP[c.focus||'bal'], gains=[], hurt=[];
  const wear=coachWear(USER);
  allPlayers(USER).forEach(p=>{
    const keys=fc.keys? (fc.type===p.type? fc.keys : []) : (p.type==='B'? ['con','pow','eye','spd','fld','arm'] : ['stu','ctl','mov','sta']);
    const base=p.age<=24? 0.9 : p.age<=28? 0.55 : p.age<=32? 0.3 : 0.1;
    const chance=base/4*(fc.keys?1:0.5)*coachGrow(p)*(mod.grow||1);
    const hurtNow=K.isInjured(p); let tot=0;
    if(!hurtNow) keys.forEach(k=>{ if(Math.random()>=chance) return; if(bumpWithin(p,k,1)){ tot++; const g=c.gain[p.n]||(c.gain[p.n]={}); g[k]=(g[k]||0)+1; } });
    if(p.type==='P'&&!hurtNow&&Math.random()<0.02*pl.fit*(p.age<=30?1:0.5)) bumpWithin(p,'sta',1);
    if(tot) gains.push(`${p.n} +${tot}`);
    const inj=0.004*Math.max(0,pl.fit+pl.skill-5)*(p.age>=30?1.5:1)*(1-pl.rest*0.25)*wear.inj*(mod.inj||1);
    if(!hurtNow&&Math.random()<inj){ p.inj=R(1,8); hurt.push(`${p.n}(${p.inj}경기)`); }
    addMor(p,pl.rest*0.5);
  });
  const tf=tfState(); activePlans().forEach(x=>{ tf[x.k][x.v]=Math.min(100,tf[x.k][x.v]+pl.tac*1.5+(c.focus==='tac'?TF_CAMP/4:0)); });
  if(o) o.mod=null; c.week=w+1;
  const line=`${w+1}주차 · 성장 ${gains.slice(0,5).join(', ')||'없음'}${hurt.length?' · 부상 '+hurt.join(', '):''}`;
  c.log.push(line); return line;
}
// runs whatever camp weeks are left and returns the summary for the head coach's report
function applyCamp(){ const c=campState(), f=fm(); if(!c.focus) c.focus='bal'; while(c.week<4) campRunWeek();
  if(f.off&&f.off.year===state.year){ f.off.stage='done'; f.off.q=[]; }
  return `${CAMP[c.focus].label} · ${campStars().map(x=>x.n+' '+x.txt).join(', ')||'눈에 띄는 변화 없음'}`; }
const ATTR_L={con:'컨택',pow:'파워',eye:'선구안',spd:'주력',fld:'수비',arm:'송구',stu:'구위',ctl:'제구',mov:'무브먼트',sta:'체력'};
function campStars(){ const c=campState(); return Object.entries(c.gain).map(([n,g])=>({n,tot:Object.values(g).reduce((a,b)=>a+b,0),txt:Object.entries(g).map(([k,v])=>`${ATTR_L[k]||k} +${v}`).join(' ')}))
    .filter(x=>x.tot>0).sort((a,b)=>b.tot-a.tot).slice(0,3); }
function campSummary(){ const c=campState(), stars=campStars(); closeModal();
  modal(`${X_BTN}<p class="eyebrow">스프링캠프 결산</p><h2>${CAMP[c.focus||'bal'].label} 캠프를 마쳤습니다</h2>
    <h4 class="st-group">가장 달라진 선수</h4>${stars.length? `<div class="aw-list">${stars.map(x=>`<div><b>${esc(x.n)}</b><span>${x.txt}</span></div>`).join('')}</div>` : '<p class="muted">눈에 띄게 성장한 선수는 없었습니다.</p>'}
    ${c.notes.length?`<h4 class="st-group">캠프에서 있었던 일</h4><ul class="ev-notes">${c.notes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
    <div class="row" style="margin-top:14px"><button class="btn primary" onclick="FM.startSpring()">시범경기로</button></div>`); }
function springHeal(){ allPlayers(USER).forEach(p=>{ if(p.inj>0) p.inj--; }); }   // camp knocks heal through the exhibition games
function springRest(){ return []; }

// ----- starting-job battles through the exhibition games -----
function offBattles(){ const o=offState(), c=state.cfgs[USER], r=K.ROSTERS[USER], out=[];
  const fit=p=>p&&!K.isInjured(p);
  const a5=findPlayer(USER,c.rotation[4]), b5=r.pitchers.filter(p=>fit(p)&&p.role==='SP'&&c.rotation.indexOf(p.n)<0&&p.n!==c.closer&&a5&&K.ovr(p)>=K.ovr(a5)-4).sort((x,y)=>K.ovr(y)-K.ovr(x))[0];
  if(fit(a5)&&b5) out.push({k:'SP5',label:'5선발',a:a5.n,b:b5.n});
  const pos=c.positions||K.autoPositions(USER,c.lineup), cand=[];
  c.lineup.forEach((n,i)=>{ const s=findPlayer(USER,n); if(!fit(s)||pos[i]==='DH') return;
    const b=r.batters.filter(p=>fit(p)&&c.lineup.indexOf(p.n)<0&&(p.pos===pos[i]||p.alt===pos[i])&&K.ovr(p)>=K.ovr(s)-3).sort((x,y)=>K.ovr(y)-K.ovr(x))[0];
    if(b) cand.push({k:'POS',slot:i,label:`주전 ${pos[i]}`,a:n,b:b.n,gap:K.ovr(s)-K.ovr(b)}); });
  const seen={}; cand.sort((x,y)=>x.gap-y.gap).forEach(x=>{ if(out.length<3&&!seen[x.b]){ seen[x.b]=1; delete x.gap; out.push(x); } });
  o.battles=out.map(x=>Object.assign(x,{pick:null})); }
// who plays today: the two candidates take turns
function springBattleCfg(cfg){ const o=fm().off, sp=state.spring; if(!o||!o.battles||!sp) return cfg; const i=sp.played, ok=n=>{ const p=findPlayer(USER,n); return p&&!K.isInjured(p); };
  let out=cfg;
  o.battles.forEach(b=>{ if(!ok(b.a)||!ok(b.b)) return;
    if(b.k==='POS'&&i%2===1&&out.lineup[b.slot]===b.a&&out.lineup.indexOf(b.b)<0){ const lu=out.lineup.slice(); lu[b.slot]=b.b; out=Object.assign({},out,{lineup:lu}); }
    if(b.k==='SP5'&&i%3===1) out=Object.assign({},out,{spName:Math.floor(i/3)%2? b.b : b.a}); });
  return out; }
function springLine(n){ const sp=state.spring, p=findPlayer(USER,n); if(!sp||!p) return {txt:'기록 없음',v:0};
  if(p.type==='B'){ const s=sp.stats.bat[n]; if(!s||!s.AB) return {txt:'기록 없음',v:0}; const ops=(s.H+s.BB)/Math.max(1,s.AB+s.BB)+(s.H+s._2B+2*s._3B+3*s.HR)/s.AB;
    return {txt:`${s.AB}타수 ${s.H}안타 ${s.HR}홈런 · OPS ${ops.toFixed(3)}`,v:ops}; }
  const s=sp.stats.pit[n]; if(!s||!s.OUT) return {txt:'기록 없음',v:0}; const era=s.ER*27/s.OUT;
  return {txt:`${ipStr(s.OUT)}이닝 ${s.ER}자책 ${s.SO}탈삼진 · ERA ${era.toFixed(2)}`,v:10-era}; }
function offHasBattles(){ const o=fm()&&fm().off; return !!(o&&o.year===state.year&&o.battles&&o.battles.some(b=>!b.done)); }
function offPick(i,w){ const o=offState(); if(o.battles&&o.battles[i]){ o.battles[i].pick=w; offRoster(); } }
function offRoster(){ const o=offState(); if(!offHasBattles()){ openSeason(); return; } closeModal();
  const row=(b,i)=>{ const A=findPlayer(USER,b.a), B=findPlayer(USER,b.b); if(!A||!B) return '';
    const btn=(p,w)=>`<button type="button" class="ev-opt${b.pick===w?' sel':''}" onclick="FM.offPick(${i},'${w}')"><b>${esc(p.n)} <span class="muted">OVR ${K.ovr(p)} · ${p.age}세</span></b><small>${springLine(p.n).txt}</small></button>`;
    return `<h4 class="st-group">${b.label}</h4><div class="ev-opts two">${btn(A,'a')}${btn(B,'b')}</div>`; };
  const ready=o.battles.every(b=>b.pick||!findPlayer(USER,b.a)||!findPlayer(USER,b.b));
  modal(`${X_BTN}<p class="eyebrow">개막 엔트리 확정</p><h2>주전 경쟁, 누구에게 맡길까요?</h2>
    <p class="ev-body">시범경기 성적을 보고 자리마다 한 명을 고르세요. 성적이 더 좋은 선수를 밀어내면 그 선수의 사기가 크게 떨어지고 기사가 납니다.</p>
    ${o.battles.map(row).join('')}
    <div class="row" style="gap:8px;margin-top:14px"><button class="btn primary" ${ready?'':'disabled'} onclick="FM.offConfirm()">확정하고 개막</button><button class="btn" onclick="FM.offConfirm(true)">수석코치에게 맡기기</button></div>`); }
function battleApply(auto){ const o=fm().off; if(!o||o.year!==state.year||!o.battles) return; const c=state.cfgs[USER];
  o.battles.forEach(b=>{ if(b.done) return; b.done=true; const A=findPlayer(USER,b.a), B=findPlayer(USER,b.b); if(!A||!B) return;
    const sa=springLine(b.a).v, sb=springLine(b.b).v, better=sb>sa?'b':'a';
    if(auto||!b.pick) b.pick=(sa||sb)? better : 'a';
    const win=b.pick==='a'?A:B, lose=b.pick==='a'?B:A;
    if(K.isInjured(win)){ return; }
    if(b.k==='POS'&&b.pick==='b'){ const i=c.lineup.indexOf(b.a); if(i>=0&&c.lineup.indexOf(b.b)<0) c.lineup[i]=b.b; }
    if(b.k==='SP5'&&b.pick==='b'){ const i=c.rotation.indexOf(b.a); if(i>=0&&c.rotation.indexOf(b.b)<0&&b.b!==c.closer){ c.rotation[i]=b.b; c.bullpen=(c.bullpen||[]).filter(n=>n!==b.b); if(c.bullpen.indexOf(b.a)<0) c.bullpen.push(b.a); } }
    addMor(win,5); addMor(lose,-6);
    if(!auto&&b.pick!==better&&(sa||sb)){ addMor(lose,-5);
      feedPush({title:`${b.label} 경쟁, 시범경기 성적과 다른 선택`, body:josa(`${lose.n}은(는) 시범경기에서 더 좋은 성적을 냈지만 개막 ${b.label} 자리는 ${win.n}에게 돌아갔습니다.\n현장에서는 감독의 선택을 두고 말이 나옵니다.`), year:state.year, kind:'press', ug:0}); }
    memo('battle',win.n,`개막 ${b.label}: ${win.n} 선택 (${lose.n} 탈락)`); }); }
function offConfirm(auto){ battleApply(!!auto); closeModal(); openSeason(); }

// ----- results that come back during the season -----
function offCallbacks(){ const f=fm(), s=state.season[USER]; if(!f.memo||state.phase!=='regular') return;
  f.memo.forEach(m=>{ if(m.y!==state.year||!m.cb||m.back) return; const b=s.bat[m.who], p=s.pit[m.who]; let t=null;
    if(m.cb==='newpitch'&&p&&(p.W>=8||p.SV>=15)) t=[`${m.who}, 캠프에서 익힌 그 공으로`,`스프링캠프에서 새 구종을 익힌 ${m.who}이(가) 시즌 ${p.W>=8?p.W+'승':p.SV+'세이브'}째를 올렸습니다. 캠프에서의 결정이 열매를 맺고 있습니다.`];
    if(m.cb==='form'&&b&&b.HR>=10) t=[`${m.who}, 바꾼 타격폼으로 ${b.HR}홈런`,`캠프에서 타격폼을 고친 ${m.who}이(가) 벌써 ${b.HR}홈런을 쳤습니다.`];
    if(m.cb==='surprise'&&b&&b.H>=40) t=[`${m.who}, 개막 엔트리 약속에 답하다`,`캠프에서 깜짝 활약으로 엔트리에 든 ${m.who}이(가) 시즌 ${b.H}안타를 기록 중입니다.`];
    if(m.cb==='posswitch'&&b&&b.PA>=150) t=[`${m.who}, 새 포지션에 자리 잡다`,`캠프에서 새 포지션을 익힌 ${m.who}이(가) 팀의 라인업 운용 폭을 넓혀 주고 있습니다.`];
    if(t){ m.back=1; feedPush({title:t[0], body:josa(t[1]), year:state.year, kind:'press', ug:userGamesPlayed()}); send('구단 홍보팀','📰',t[0],t[1]+`\n\n(${m.txt})`,[]); } }); }
function offGrow(p){ const o=fm().off; if(!o||o.year!==state.year) return 1; return (o.mode==='rebuild'&&p.age<=25?1.05:1)*(o.mentor&&p.age<=25?1.02:1); }
function offBoardAdj(met){ const o=fm().off; if(!o||o.year!==state.year) return 0; return o.mode==='win'&&!met? -8 : o.mode==='rebuild'&&!met? 6 : 0; }

// ----- events -----
const byOvr=(a,b)=>K.ovr(b)-K.ovr(a);
function faTalk(o){ const f=fm(), room=budgetRoom(); const x=(f.fa||[]).filter(x=>o.talked.indexOf(x.p.n)<0&&!(x.p.f&&foreignOf(USER).length>=FX_MAX)).sort((a,b)=>K.ovr(b.p)-K.ovr(a.p)).find(x=>x.ask<=room+2)||null;
  if(!x) return null; o.talked.push(x.p.n); const p=x.p, want=p.type==='B'? ['money','start','term'][hash(p.n)%3] : ['money','term','term'][hash(p.n)%3];
  const wl={money:'가장 좋은 대우를 원합니다',start:'주전 자리를 보장받고 싶어 합니다',term:'긴 계약 기간을 원합니다'}[want];
  const alt=want==='money'? {l:`연봉을 올려 확실히 잡는다 (${x.yrs}년 ${eok(x.ask*1.12)}억)`,d:'수락 가능성 높음 · 예산 부담'} : want==='start'? {l:`주전 보장을 약속한다 (${x.yrs}년 ${eok(x.ask*0.9)}억)`,d:'연봉 10% 절감 · 약속을 어기면 선수단 신뢰 하락'} : {l:`계약 기간을 늘려 준다 (${x.yrs+1}년 ${eok(x.ask*0.95)}억)`,d:'연봉 5% 절감 · 나이 들수록 부담'};
  return {who:'단장',icon:'✍️',title:`FA 면담: ${p.n}`,body:`${p.n} (${p.age}세, ${posFull(p.pos||p.role)}, OVR ${K.ovr(p)})\n요구 조건: ${x.yrs}년 연봉 ${x.ask}억 · 예산 여유 ${room}억\n\n에이전트에 따르면 ${p.n}은(는) ${wl}. 다른 구단도 접촉 중이라 이번 주 안에 답을 줘야 합니다.`,
    opts:[{l:`요구 조건을 받아들인다 (${x.yrs}년 ${x.ask}억)`,d:'무난한 제안 · 경쟁 구단에 밀릴 수 있음'},alt,{l:'영입하지 않는다',d:'예산을 아낀다 · 다른 구단으로 갈 수 있음'}],data:{n:p.n,want}}; }
function faPick(i,d){ const f=fm(), x=(f.fa||[]).find(x=>x.p.n===d.n); if(!x) return '이미 다른 구단과 계약했습니다.';
  if(i===2){ const t=offAiSign(x); return t? `${d.n}은(는) ${K.ROSTERS[t].name}와(과) 계약했습니다.` : `${d.n}은(는) 시장에 남았습니다.`; }
  const alt=i===1, sal=alt? (d.want==='money'?eok(x.ask*1.12):d.want==='start'?eok(x.ask*0.9):eok(x.ask*0.95)) : x.ask, yrs=alt&&d.want==='term'? x.yrs+1 : x.yrs;
  if(payroll(USER)+sal>f.fin.budget*1.1) return '연봉 총액 한도를 넘어 제안을 넣지 못했습니다.';
  if(Math.random()>(alt?0.93:d.want==='money'?0.55:0.72)){ const t=offAiSign(x); return `${d.n}은(는) 고민 끝에 ${t?K.ROSTERS[t].name:'다른 구단'}을(를) 택했습니다. 조건이 마음에 차지 않았던 것 같습니다.`; }
  const txt=faSign(x,{sal,yrs});
  if(alt&&d.want==='start'){ const ug=userGamesPlayed(); f.promises.push({n:d.n,from:ug,until:ug+40,need:28}); memo('fa',d.n,`FA ${d.n} 영입 (주전 보장 약속)`); return txt+'\n개막 후 40경기 중 28경기 이상 출전을 약속했습니다.'; }
  memo('fa',d.n,`FA ${d.n} 영입 (${yrs}년 ${sal}억)`); return txt; }
const tierOf=r=>r<=2?0:r<=4?1:r<=6?2:3, TIER_RANK=[1,3,5,8];
const EV={
  owner:{safe:1, make(){ const f=fm(); return {who:'구단주',icon:'🏛',title:`${state.year} 시즌 방향`,body:`구단주가 올 시즌의 방향을 묻습니다.\n현재 이사회 목표: ${f.board.expect.label} · 예산 ${eok(f.fin.budget)}억`,
      opts:[{l:'우승에 도전한다',d:'예산 +15% · 목표 한 단계 상향 · 실패하면 신뢰 크게 하락'},{l:'균형을 유지한다',d:'예산과 목표 그대로'},{l:'리빌딩한다',d:'예산 -10% · 목표 한 단계 하향 · 25세 이하 성장 +5%'}],data:{}}; },
    pick(i,d,o){ const f=fm(), b=f.board, t=tierOf(b.strengthRank||5); o.mode=['win','keep','rebuild'][i];
      if(i===1) return '올해도 지금 기조를 이어 갑니다.';
      f.fin.budget=eok(f.fin.budget*(i===0?1.15:0.9)); b.expect=expectationFor(TIER_RANK[clampN(t+(i===0?-1:1),0,3)]);
      memo('owner',null,i===0?'시즌 전 우승 도전을 선언':'시즌 전 리빌딩을 선택');
      return i===0? `구단주가 지갑을 열었습니다. 예산 ${eok(f.fin.budget)}억, 새 목표는 ${b.expect.label}입니다.` : `올해는 미래를 봅니다. 예산 ${eok(f.fin.budget)}억, 새 목표는 ${b.expect.label}입니다.`; }},
  renew:{safe:0, make(){ const f=fm(), ms=f.inbox.filter(m=>!m.done&&m.actions.some(a=>a.fn==='renew')); if(!ms.length) return null;
      const names=ms.map(m=>m.actions[0].arg.n), tot=eok(ms.reduce((a,m)=>a+m.actions[0].arg.sal,0));
      return {who:'단장',icon:'📝',title:'재계약 마감',body:`계약이 끝난 선수 ${ms.length}명: ${names.join(', ')}\n전원을 1년 재계약하면 연봉 합계 ${tot}억 · 예산 여유 ${budgetRoom()}억\n\n이번 주가 지나면 남은 선수는 FA로 나갑니다.`,
        opts:[{l:'핵심만 잡는다',d:'OVR 상위 절반만 재계약 · 나머지는 FA로'},{l:'전원 재계약을 시도한다',d:'예산이 닿는 데까지 · 한도를 넘으면 실패'},{l:'직접 협상한다',d:'받은편지함에서 한 명씩 결정'}],data:{}}; },
    pick(i){ const f=fm(), ms=f.inbox.filter(m=>!m.done&&m.actions.some(a=>a.fn==='renew')).sort((a,b)=>{ const pa=findPlayer(USER,a.actions[0].arg.n), pb=findPlayer(USER,b.actions[0].arg.n); return (pb?K.ovr(pb):0)-(pa?K.ovr(pa):0); });
      if(i===2) return '받은편지함에서 선수별로 결정하세요. 다음 시즌 전까지 답하지 않으면 FA로 나갑니다.';
      const keep=i===0? Math.ceil(ms.length/2) : ms.length, out=[];
      ms.forEach((m,k)=>{ const a=k<keep? m.actions[0] : m.actions[m.actions.length-1]; const res=ACTIONS[a.fn](m,a.arg||{}); if(String(res).startsWith('❌')&&k<keep){ out.push(`${a.arg.n}: 예산 초과로 실패`); return; } m.done=true; m.read=true; m.result=josa(res); out.push(`${a.arg.n}: ${a.fn==='renew'?'재계약':'결별'}`); });
      return out.join('\n'); }},
  fa:{safe:2, make(o){ return faTalk(o); }, pick(i,d){ return faPick(i,d); }},
  trade:{safe:9, make(){ const mine=allPlayers(USER).filter(p=>!K.isInjured(p)).sort(byOvr).slice(0,14), offers=[], teams=K.TEAM_IDS.filter(t=>t!==USER).sort(()=>Math.random()-0.5);
      for(const t of teams){ if(offers.length>=2) break; const want=mine[Math.floor(Math.random()*mine.length)]; if(!want||offers.some(x=>x.want===want.n)) continue;
        const give=allPlayers(t).filter(p=>!K.isInjured(p)&&p.type===want.type&&(p.type==='B'||(p.role==='SP')===(want.role==='SP'))&&K.ovr(p)>=K.ovr(want)-3&&K.ovr(p)<=K.ovr(want)+2).sort((a,b)=>a.age-b.age)[0];
        if(give) offers.push({team:t,want:want.n,give:give.n,txt:`${want.n}(${want.age}세·${K.ovr(want)}) ↔ ${give.n}(${give.age}세·${K.ovr(give)})`}); }
      if(!offers.length) return null;
      return {who:'단장',icon:'🤝',title:'트레이드 주간',body:`다른 구단에서 제안이 들어왔습니다. 하나만 받을 수 있습니다.\n\n${offers.map(x=>`• ${K.ROSTERS[x.team].name}: ${x.txt}`).join('\n')}`,
        opts:offers.map(x=>({l:`${K.ROSTERS[x.team].name}의 제안을 받는다`,d:x.txt})).concat([{l:'모두 거절한다',d:'지금 전력을 유지'}]),data:{offers}}; },
    pick(i,d){ const x=d.offers[i]; if(!x) return '제안을 모두 거절했습니다.';
      if(!findPlayer(USER,x.want)||!findPlayer(x.team,x.give)) return '선수 구성이 바뀌어 제안이 무효가 됐습니다.';
      const b=tradeBudget([x.want],x.team,[x.give]); if(!b.ok) return b.msg; const why=doTrade(x.team,[x.want],[x.give]); if(why) return why;
      memo('trade',x.give,`트레이드: ${x.want} ↔ ${x.give}`); return `트레이드 성사: ${x.txt}. 라인업을 다시 짰습니다.`; }},
  coach:{safe:2, make(){ const s=staffOf(USER); let worst=null; COACH_ROLES.forEach(([r,l])=>{ const c=coachInit(s[r]), v=c.a[ROLE_MAIN[r]]; if(!worst||v<worst.v) worst={r,l,v,n:c.n}; });
      return {who:'단장',icon:'🧢',title:'코치진 정비',body:`캠프 전에 코치진을 점검할 시간입니다.\n가장 약한 자리: ${worst.l} ${worst.n} (핵심 능력 ${worst.v})`,
        opts:[{l:'보직을 다시 나눈다',d:'코치들을 가장 잘 맞는 자리로 옮긴다'},{l:`${worst.l} 후보를 면접한다`,d:'결정 뒤 구단 탭에서 영입 · 위약금과 연봉 발생'},{l:'지금 체제를 신임한다',d:'코치 전원 만족도 +4'}],data:{r:worst.r}}; },
    pick(i,d){ const s=staffOf(USER);
      if(i===2){ COACH_ROLES.forEach(([r])=>{ const c=coachInit(s[r]); c.sat=clampN(c.sat+4,0,100); }); return '코치진이 감독의 신임에 고마워합니다.'; }
      if(i===1) return `구단 탭의 코칭스태프에서 ${Object.fromEntries(COACH_ROLES)[d.r]} 카드의 교체 버튼을 누르면 후보를 면접할 수 있습니다.`;
      let moves=0; for(let k=0;k<6;k++){ let best=null; COACH_ROLES.forEach(([ra])=>COACH_ROLES.forEach(([rb])=>{ if(ra>=rb) return; const A=coachInit(s[ra]), B=coachInit(s[rb]);
          const gain=A.a[ROLE_MAIN[rb]]+B.a[ROLE_MAIN[ra]]-A.a[ROLE_MAIN[ra]]-B.a[ROLE_MAIN[rb]]; if(gain>1&&(!best||gain>best.gain)) best={ra,rb,gain}; }));
        if(!best) break; const A=s[best.ra], B=s[best.rb]; s[best.rb]=A; s[best.ra]=B; coachSetRole(A,best.rb); coachSetRole(B,best.ra); moves++; }
      return moves? `코치 ${moves*2}명의 보직을 바꿨습니다. 구단 탭에서 확인하세요.` : '지금 배치가 이미 가장 낫습니다.'; }},
  raise:{safe:1, make(){ const p=allPlayers(USER).filter(p=>!p.f&&(p.yrs||1)>=1).sort(byOvr)[0]; if(!p) return null; const up=eok((p.sal||1)*0.15);
      return {who:`${p.n} 에이전트`,icon:'💰',title:`${p.n}, 연봉 인상 요구`,body:`팀의 간판 ${p.n}(OVR ${K.ovr(p)}, 연봉 ${p.sal}억)이(가) 계약 중인데도 연봉을 올려 달라고 합니다.\n요구: +${up}억 · 예산 여유 ${budgetRoom()}억`,
        opts:[{l:'요구를 들어준다',d:`연봉 +${up}억 · 사기 크게 상승`},{l:'시즌 뒤에 다시 얘기하자고 한다',d:'사기 조금 하락'},{l:'거절한다',d:'사기 크게 하락 · 트레이드를 요구할 수 있음'}],data:{n:p.n,up}}; },
    pick(i,d){ const p=findPlayer(USER,d.n); if(!p) return '선수가 이미 팀을 떠났습니다.';
      if(i===0){ p.sal=eok(p.sal+d.up); addMor(p,12); memo('raise',d.n,`${d.n}의 연봉 인상 요구 수용`); return `${d.n}의 연봉이 ${p.sal}억이 됐습니다. 선수는 구단의 대우에 만족합니다.`; }
      if(i===1){ addMor(p,-4); return `${d.n}은(는) 아쉬워하면서도 받아들였습니다.`; }
      addMor(p,-14); if(Math.random()<0.3){ p.listed=true; return `${d.n}이(가) 크게 실망했고, 트레이드를 요청했습니다.`; } return `${d.n}이(가) 크게 실망했습니다.`; }},
  rival:{safe:2, make(o){ const e=faTalk(o); if(!e) return null; const f=fm(), x=f.fa.find(x=>x.p.n===e.data.n);
      return {who:'단장',icon:'📣',title:`${e.data.n} 영입 경쟁`,body:`우리가 눈여겨보던 ${e.data.n}(OVR ${K.ovr(x.p)})에게 라이벌 구단이 먼저 제안을 넣었습니다.\n요구 조건: ${x.yrs}년 ${x.ask}억 · 예산 여유 ${budgetRoom()}억`,
        opts:[{l:`웃돈을 얹어 가로챈다 (${x.yrs}년 ${eok(x.ask*1.2)}억)`,d:'확실히 잡는다 · 예산 부담 큼'},{l:`같은 조건으로 맞불을 놓는다 (${x.yrs}년 ${x.ask}억)`,d:'절반의 확률'},{l:'포기한다',d:'라이벌의 전력이 강해진다'}],data:{n:e.data.n}}; },
    pick(i,d){ const f=fm(), x=(f.fa||[]).find(x=>x.p.n===d.n); if(!x) return '이미 계약이 끝났습니다.';
      const lose=()=>{ const t=offAiSign(x); return `${d.n}은(는) ${t?K.ROSTERS[t].name:'다른 구단'} 유니폼을 입었습니다.`; };
      if(i===2) return lose(); const sal=i===0? eok(x.ask*1.2) : x.ask;
      if(payroll(USER)+sal>f.fin.budget*1.1) return '연봉 총액 한도를 넘어 제안을 넣지 못했습니다. '+lose();
      if(i===1&&Math.random()<0.5) return lose(); memo('fa',d.n,`경쟁 끝에 FA ${d.n} 영입`); return faSign(x,{sal,yrs:x.yrs}); }},
  prospect:{safe:1, make(){ const young=allPlayers(USER).filter(p=>p.age<=23&&(p.pot||0)>=K.ovr(p)+4).sort((a,b)=>(b.pot||0)-(a.pot||0))[0]; if(!young) return null;
      const t=K.TEAM_IDS.filter(t=>t!==USER).sort(()=>Math.random()-0.5)[0], vet=allPlayers(t).filter(p=>p.type===young.type&&(p.type==='B'||(p.role==='SP')===(young.role==='SP'))&&p.age>=28&&K.ovr(p)>=K.ovr(young)+3&&K.ovr(p)<=K.ovr(young)+8).sort(byOvr)[0]; if(!vet) return null;
      return {who:`${K.ROSTERS[t].name} 단장`,icon:'🌱',title:`유망주 ${young.n}을(를) 달라는 제안`,body:`${K.ROSTERS[t].name}에서 ${young.n}(${young.age}세, OVR ${K.ovr(young)}, 잠재력 ${young.pot})을(를) 원합니다.\n대가: ${vet.n}(${vet.age}세, OVR ${K.ovr(vet)})\n\n올해 전력은 올라가지만 미래를 내주는 거래입니다.`,
        opts:[{l:'받아들인다',d:`지금 전력 +${K.ovr(vet)-K.ovr(young)} · 유망주를 잃는다`},{l:'거절한다',d:`${young.n}의 사기 상승`}],data:{t,want:young.n,give:vet.n}}; },
    pick(i,d){ const y=findPlayer(USER,d.want); if(i===1){ if(y) addMor(y,6); memo('prospect',d.want,`유망주 ${d.want}을(를) 지킴`); return `${d.want}은(는) 구단이 자신을 믿는다는 걸 알았습니다.`; }
      if(!y||!findPlayer(d.t,d.give)) return '선수 구성이 바뀌어 제안이 무효가 됐습니다.';
      const b=tradeBudget([d.want],d.t,[d.give]); if(!b.ok) return b.msg; const why=doTrade(d.t,[d.want],[d.give]); if(why) return why;
      memo('trade',d.give,`유망주 ${d.want}을(를) 보내고 ${d.give} 영입`); return `${d.give}이(가) 합류했습니다. ${d.want}은(는) 새 팀으로 떠났습니다.`; }},
  mentor:{safe:2, make(){ const p=allPlayers(USER).filter(p=>p.age>=35).sort(byOvr)[0]; if(!p) return null;
      return {who:p.n,icon:'🧓',title:`베테랑 ${p.n}의 고민`,body:`${p.n}(${p.age}세)이(가) 찾아왔습니다.\n"감독님, 올해가 마지막일지도 모르겠습니다. 팀에서 제가 뭘 하면 좋겠습니까?"`,
        opts:[{l:'주전으로 믿는다고 말한다',d:`${p.n} 사기 크게 상승`},{l:'후배들의 멘토 역할을 부탁한다',d:'25세 이하 성장 +2% · 본인 출전 욕심은 줄어든다'},{l:'본인 판단에 맡긴다',d:'변화 없음'}],data:{n:p.n}}; },
    pick(i,d,o){ const p=findPlayer(USER,d.n); if(!p) return '';
      if(i===0){ addMor(p,10); return `${d.n}: "마지막까지 뛰겠습니다."`; }
      if(i===1){ o.mentor=d.n; addMor(p,3); memo('mentor',d.n,`${d.n}에게 멘토 역할을 맡김`); return `${d.n}이(가) 캠프 내내 젊은 선수들 곁을 지킵니다.`; }
      return `${d.n}은(는) 고개를 끄덕이고 돌아갔습니다.`; }},
  star:{safe:1, make(){ const p=allPlayers(USER).filter(p=>!p.f).sort(byOvr)[0]; if(!p) return null;
      return {who:'스포츠 기자',icon:'📰',title:`${p.n} 이적설`,body:`"${p.n}, 다른 구단과 접촉" 기사가 났습니다. 팬 커뮤니티가 술렁입니다.`,
        opts:[{l:'절대 보내지 않는다고 못 박는다',d:'팬 여론 +3 · 선수 사기 상승'},{l:'대응하지 않는다',d:'팬 여론 -2'},{l:'좋은 제안이면 검토한다고 밝힌다',d:'팬 여론 -5 · 트레이드 리스트에 오른다'}],data:{n:p.n}}; },
    pick(i,d){ const p=findPlayer(USER,d.n); if(!p) return '';
      if(i===0){ addFans(3); addMor(p,6); memo('star',d.n,`${d.n} 잔류를 공개 선언`); return `팬들이 환호합니다. ${d.n}도 팀에 남고 싶다는 뜻을 밝혔습니다.`; }
      if(i===1){ addFans(-2); return '며칠 뒤 소문은 잦아들었습니다.'; }
      addFans(-5); p.listed=true; addMor(p,-6); return `${d.n}을(를) 트레이드 리스트에 올렸습니다. 팬들의 반발이 큽니다.`; }},
  foreign:{safe:0, make(){ const p=foreignOf(USER).sort((a,b)=>K.ovr(a)-K.ovr(b))[0]; if(!p) return null; const up=eok((p.sal||5)*0.1);
      return {who:`${p.n} 에이전트`,icon:'🌏',title:`${p.n} 재계약 줄다리기`,body:`외국인 선수 ${p.n}(OVR ${K.ovr(p)}, 연봉 ${p.sal}억) 측이 조건을 올려 달라고 합니다. 요구: +${up}억`,
        opts:[{l:'요구를 받아들인다',d:`연봉 +${up}억 · 사기 상승`},{l:'버틴다',d:'절반은 연봉 5% 절감, 절반은 사기 크게 하락'}],data:{n:p.n,up}}; },
    pick(i,d){ const p=findPlayer(USER,d.n); if(!p) return '';
      if(i===0){ p.sal=eok(p.sal+d.up); addMor(p,8); return `${d.n}와(과) 연봉 ${p.sal}억에 합의했습니다.`; }
      if(Math.random()<0.5){ p.sal=eok(p.sal*0.95); return `${d.n} 측이 물러섰습니다. 연봉 ${p.sal}억.`; } addMor(p,-12); return `협상이 감정싸움이 됐습니다. ${d.n}의 사기가 크게 떨어졌습니다.`; }},
  // --- camp ---
  newpitch:{safe:1, make(){ const p=K.ROSTERS[USER].pitchers.filter(p=>p.age<=26&&!K.isInjured(p)).sort((a,b)=>(b.pot||0)-(a.pot||0))[0]; if(!p) return null;
      const co=staffOf(USER).pit; return {who:`${co.n} 투수코치`,icon:'⚾',title:`${p.n}에게 새 구종을`,body:`${co.n} 코치가 ${p.n}(${p.age}세, 무브먼트 ${attr20(p.mov)})에게 새 구종을 가르치자고 합니다.\n잘되면 한 단계 올라서지만, 손에 익지 않으면 제구가 흔들립니다.`,
        opts:[{l:'새 구종을 가르친다',d:'60%: 무브먼트 +3 · 40%: 제구 -2'},{l:'지금 구종을 다듬는다',d:'제구 +1 (확실)'}],data:{n:p.n}}; },
    pick(i,d){ const p=findPlayer(USER,d.n), c=campState(); if(!p) return '';
      if(i===1){ const g=bumpWithin(p,'ctl',1); c.notes.push(`${d.n}: 기존 구종을 다듬었습니다`); return g? `${d.n}의 제구가 좋아졌습니다.` : `${d.n}은(는) 지금 폼을 유지했습니다.`; }
      if(Math.random()<0.6){ const g=bumpWithin(p,'mov',3), G=c.gain[p.n]||(c.gain[p.n]={}); G.mov=(G.mov||0)+g; c.notes.push(`${d.n}: 새 구종 장착`); memo('camp',d.n,`캠프에서 ${d.n}에게 새 구종을 가르침`,'newpitch'); return `${d.n}의 새 구종이 불펜 피칭에서 타자들을 속입니다. 무브먼트 +${g}.`; }
      p.ctl=Math.max(25,p.ctl-2); c.notes.push(`${d.n}: 새 구종이 손에 익지 않았습니다`); return `${d.n}의 새 구종이 좀처럼 손에 익지 않습니다. 제구 -2.`; }},
  intensity:{safe:1, make(){ const vets=allPlayers(USER).filter(p=>p.age>=32); if(vets.length<2) return null; const v=vets.sort(byOvr)[0];
      return {who:v.n,icon:'🥵',title:'베테랑들의 훈련 강도 불만',body:`${v.n}을(를) 비롯한 베테랑들이 훈련량이 너무 많다고 합니다. 젊은 선수들은 지금 강도를 반깁니다.`,
        opts:[{l:'강행한다',d:'이번 주 성장 +30% · 부상 위험 2배 · 베테랑 사기 하락'},{l:'베테랑만 조절해 준다',d:'베테랑 사기 상승 · 성장 그대로'},{l:'전체 훈련량을 줄인다',d:'전원 사기 상승 · 이번 주 성장 -40% · 부상 위험 절반'}],data:{}}; },
    pick(i,d,o){ const all=allPlayers(USER), vets=all.filter(p=>p.age>=32);
      if(i===0){ o.mod={grow:1.3,inj:2}; vets.forEach(p=>addMor(p,-5)); return '훈련장에 긴장감이 돕니다. 베테랑들의 표정은 어둡습니다.'; }
      if(i===1){ vets.forEach(p=>addMor(p,4)); return '베테랑들이 고마워합니다.'; }
      o.mod={grow:0.6,inj:0.5}; all.forEach(p=>addMor(p,3)); return '선수단 분위기가 밝아졌습니다. 훈련 성과는 조금 줄 것 같습니다.'; }},
  posswitch:{safe:1, make(){ const c=state.cfgs[USER], p=K.ROSTERS[USER].batters.filter(p=>c.lineup.indexOf(p.n)<0&&POS_NEXT[p.pos]&&!p.alt&&p.age<=29&&!K.isInjured(p)).sort(byOvr)[0]; if(!p) return null;
      const co=staffOf(USER).fld; return {who:`${co.n} 수비코치`,icon:'🧤',title:`${p.n}의 포지션 전환`,body:`${co.n} 코치가 백업 ${p.n}(${p.pos})에게 ${POS_NEXT[p.pos]} 수비를 가르치자고 합니다. 쓸 수 있는 자리가 하나 늘어납니다.`,
        opts:[{l:'시킨다',d:`${POS_NEXT[p.pos]} 수비 가능 · 적응하는 동안 수비 -1`},{l:'지금 포지션에 집중시킨다',d:'수비 +1 (50%)'}],data:{n:p.n}}; },
    pick(i,d){ const p=findPlayer(USER,d.n), c=campState(); if(!p) return '';
      if(i===0){ p.alt=POS_NEXT[p.pos]; p.fld=Math.max(25,p.fld-1); c.notes.push(`${d.n}: ${p.alt} 수비 습득`); memo('camp',d.n,`캠프에서 ${d.n}에게 ${p.alt} 수비를 가르침`,'posswitch'); return `${d.n}이(가) ${p.alt} 수비를 익혔습니다.`; }
      const g=Math.random()<0.5? bumpWithin(p,'fld',1) : 0; return g? `${d.n}의 수비가 한결 안정됐습니다.` : `${d.n}은(는) 지금 자리에서 훈련을 이어 갔습니다.`; }},
  form:{safe:1, make(){ const c=state.cfgs[USER], p=c.lineup.map(n=>findPlayer(USER,n)).filter(p=>p&&p.age<=30&&!K.isInjured(p)).sort((a,b)=>a.pow-b.pow)[0]; if(!p) return null;
      const co=staffOf(USER).bat; return {who:`${co.n} 타격코치`,icon:'🏏',title:`${p.n}의 타격폼 수정`,body:`${co.n} 코치가 ${p.n}(파워 ${attr20(p.pow)})의 타격폼을 고쳐 장타를 늘리자고 합니다. 선수 본인은 반신반의합니다.`,
        opts:[{l:'맡긴다',d:'60%: 파워 +2 · 40%: 컨택 -1, 사기 하락'},{l:'지금 폼을 유지한다',d:'변화 없음 · 사기 조금 상승'}],data:{n:p.n}}; },
    pick(i,d){ const p=findPlayer(USER,d.n), c=campState(); if(!p) return '';
      if(i===1){ addMor(p,2); return `${d.n}은(는) 익숙한 폼으로 시즌을 준비합니다.`; }
      if(Math.random()<0.6){ const g=bumpWithin(p,'pow',2), G=c.gain[p.n]||(c.gain[p.n]={}); G.pow=(G.pow||0)+g; c.notes.push(`${d.n}: 타격폼 수정 성공`); memo('camp',d.n,`캠프에서 ${d.n}의 타격폼을 수정`,'form'); return `${d.n}의 타구가 달라졌습니다. 파워 +${g}.`; }
      p.con=Math.max(25,p.con-1); addMor(p,-5); c.notes.push(`${d.n}: 타격폼 수정 실패`); return `${d.n}이(가) 새 폼에 적응하지 못하고 있습니다. 컨택 -1.`; }},
  feud:{safe:0, make(){ const c=state.cfgs[USER], pos=c.positions||K.autoPositions(USER,c.lineup), ci=pos.indexOf('C'), cat=ci>=0?findPlayer(USER,c.lineup[ci]):null, ace=findPlayer(USER,c.rotation[0]); if(!cat||!ace) return null;
      const co=staffOf(USER).bat2; return {who:`${co.n} 배터리코치`,icon:'⚡',title:`${ace.n}와(과) ${cat.n}의 불화`,body:`에이스 ${ace.n}이(가) 포수 ${cat.n}의 리드에 불만을 드러냈습니다. 불펜 피칭 뒤 언성이 높아졌습니다.`,
        opts:[{l:'둘을 불러 중재한다',d:'절반은 화해(둘 다 사기 상승), 절반은 더 어색해진다'},{l:'에이스 편을 든다',d:`${ace.n} 사기 상승 · ${cat.n} 사기 하락`},{l:'알아서 풀게 둔다',d:`${ace.n} 사기 하락`}],data:{a:ace.n,c:cat.n}}; },
    pick(i,d){ const a=findPlayer(USER,d.a), c=findPlayer(USER,d.c); if(!a||!c) return '';
      if(i===0){ if(Math.random()<0.5){ addMor(a,6); addMor(c,6); return '둘이 오래 이야기를 나눴고, 다음 날 불펜에서 웃음소리가 났습니다.'; } addMor(a,-3); addMor(c,-3); return '자리는 어색하게 끝났습니다.'; }
      if(i===1){ addMor(a,8); addMor(c,-9); return `${d.a}은(는) 만족했지만 ${d.c}의 표정이 굳었습니다.`; }
      addMor(a,-6); return `${d.a}은(는) 감독이 나서 주지 않아 서운해합니다.`; }},
  surprise:{safe:1, make(){ const c=state.cfgs[USER], p=K.ROSTERS[USER].batters.filter(p=>p.age<=24&&c.lineup.indexOf(p.n)<0&&!K.isInjured(p)).sort((a,b)=>(b.pot||0)-(a.pot||0))[0]; if(!p) return null;
      return {who:'수석코치',icon:'✨',title:`유망주 ${p.n}의 깜짝 활약`,body:`${p.n}(${p.age}세, OVR ${K.ovr(p)})이(가) 청백전에서 연일 장타를 터뜨립니다. 선수단이 술렁입니다.`,
        opts:[{l:'개막 엔트리에서 기회를 주겠다고 약속한다',d:'사기 크게 상승 · 개막 후 30경기 중 12경기 출전 약속'},{l:'아직 이르다고 말한다',d:'사기 조금 하락 · 기본기 훈련으로 능력 +1'}],data:{n:p.n}}; },
    pick(i,d){ const p=findPlayer(USER,d.n), c=campState(), f=fm(); if(!p) return '';
      if(i===0){ addMor(p,10); const ug=userGamesPlayed(); f.promises.push({n:d.n,from:ug,until:ug+30,need:12}); c.notes.push(`${d.n}: 개막 엔트리 약속`); memo('camp',d.n,`캠프에서 ${d.n}에게 개막 기회를 약속`,'surprise'); return `${d.n}의 눈빛이 달라졌습니다. 약속은 지켜야 합니다.`; }
      addMor(p,-4); const k=['con','eye','fld'][hash(d.n)%3], g=bumpWithin(p,k,1); return g? `${d.n}은(는) 아쉬워했지만 훈련에 매달렸습니다. ${ATTR_L[k]} +1.` : `${d.n}은(는) 아쉬워했습니다.`; }},
  injury:{safe:0, make(){ const c=state.cfgs[USER], pool=c.lineup.concat(c.rotation).map(n=>findPlayer(USER,n)).filter(p=>p&&!K.isInjured(p)), p=pool[Math.floor(Math.random()*pool.length)]; if(!p) return null;
      const co=staffOf(USER).cond; return {who:`${co.n} 컨디셔닝코치`,icon:'🩺',title:`${p.n}의 부상 조짐`,body:`${p.n}이(가) 훈련 중 불편함을 호소했습니다. 큰 문제는 아닐 수도 있습니다.`,
        opts:[{l:'정밀 검사를 받게 한다',d:'6경기 결장 · 올 시즌 부상 위험 -30%'},{l:'테이핑하고 훈련을 이어 간다',d:'70%: 문제없음 · 30%: 20경기 결장'}],data:{n:p.n}}; },
    pick(i,d){ const p=findPlayer(USER,d.n), c=campState(); if(!p) return '';
      if(i===0){ p.inj=6; p.tough=state.year; c.notes.push(`${d.n}: 정밀 검사 뒤 관리`); return `${d.n}은(는) 가벼운 염좌였습니다. 시범경기는 쉬고 개막에 맞춥니다.`; }
      if(Math.random()<0.3){ p.inj=20; c.notes.push(`${d.n}: 부상 악화`); return `${d.n}의 상태가 나빠졌습니다. 20경기 결장입니다.`; } return `${d.n}은(는) 다행히 괜찮았습니다.`; }}
};
