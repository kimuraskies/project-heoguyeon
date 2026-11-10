// ---------- four-week camp, match sharpness, weekly stove league with FA bidding (docs/preseason-phases-plan.md) ----------
const CAMP_DEF={fit:3,skill:4,tac:2,rest:1}, CAMP_L={fit:'체력',skill:'기술',tac:'전술',rest:'휴식'};
const CAMP_TASK={newpitch:{l:'신무기',d:'무브먼트 +2~4, 30% 실패',t:'P'},form:{l:'타격폼 수정',d:'컨택·파워 +2, 실패 시 -1',t:'B'},body:{l:'몸 만들기',d:'그 시즌 부상 -30%, 30세 이상',t:'A'},pos:{l:'포지션 전환',d:'인접 포지션 적합도 상승',t:'B'}};
const POS_NEXT={SS:'2B','2B':'3B','3B':'1B',LF:'RF',RF:'CF',CF:'LF','1B':'LF',C:'1B'};
function campState(){ const f=fm(); if(!f.camp||f.camp.year!==state.year) f.camp={year:state.year,focus:null};
  const c=f.camp; if(!c.plan) c.plan=[0,1,2,3].map(()=>Object.assign({},CAMP_DEF)); c.tasks=c.tasks||{}; c.week=c.week||0; c.log=c.log||[]; return c; }
function campPoint(w,k,d){ const c=campState(), p=c.plan[w], sum=Object.values(p).reduce((a,b)=>a+b,0);
  if(w<c.week) return; if(p[k]+d<0||sum+d>10){ if(sum+d>10) notify('한 주 훈련 포인트는 10점까지입니다.'); return; } p[k]+=d; campPicker(); }
function campTask(n,v){ const c=campState(); if(v) { if(!c.tasks[n]&&Object.keys(c.tasks).length>=5){ notify('개인 과제는 5명까지입니다.'); campPicker(); return; } c.tasks[n]=v; } else delete c.tasks[n]; campPicker(); }
function campPicker(){
  const c=campState(), cur=c.focus, ready=!!cur;
  const week=(p,w)=>`<div class="cp-week${w<c.week?' done':w===c.week?' now':''}"><b>${w+1}주</b>${Object.keys(CAMP_L).map(k=>`<div class="cp-pt"><span>${CAMP_L[k]}</span><button type="button" ${w<c.week?'disabled':''} aria-label="${CAMP_L[k]} 감소" onclick="FM.campPoint(${w},'${k}',-1)">−</button><b>${p[k]}</b><button type="button" ${w<c.week?'disabled':''} aria-label="${CAMP_L[k]} 증가" onclick="FM.campPoint(${w},'${k}',1)">＋</button></div>`).join('')}
    <small>${Object.values(p).reduce((a,b)=>a+b,0)}/10${p.fit+p.skill>=8?' · <span class="warn">부상 위험 높음</span>':''}</small></div>`;
  const cand=allPlayers(USER).slice().sort((a,b)=>K.ovr(b)-K.ovr(a)).slice(0,18);
  const opt=p=>Object.entries(CAMP_TASK).filter(([k,x])=>x.t==='A'? p.age>=30 : x.t===p.type && (k!=='pos'||POS_NEXT[p.pos]));
  modal(`<span class="closeX" onclick="App.closeModal()" role="button" tabindex="0" aria-label="닫기">×</span><h2>${state.year} 스프링캠프 · ${Math.min(4,c.week+1)}/4주</h2>
    <div class="hint" style="margin-bottom:8px">기술 포인트가 아래 훈련 방향에 쓰입니다. 체력+기술이 높을수록 부상 위험이 커지고, 휴식은 위험을 줄입니다.</div>
    <div class="grid" style="gap:6px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">${Object.entries(CAMP).map(([k,x])=>`<button class="btn ${cur===k?'primary':''}" onclick="FM.setCamp('${k}')" style="text-align:left"><b>${x.label}</b><br><span class="muted" style="font-size:11.5px">${x.d}</span></button>`).join('')}</div>
    <h4 class="st-group">주간 배분</h4><div class="cp-grid">${c.plan.map(week).join('')}</div>
    <details style="margin-top:10px"><summary>개인 과제 (최대 5명, ${Object.keys(c.tasks).length}명 지정)</summary><div style="max-height:220px;overflow:auto;margin-top:6px">${cand.map(p=>{ const o=opt(p); return o.length?`<div class="cp-task"><span>${esc(p.n)} <small class="muted">${p.age}세 · ${p.pos||p.role}</small></span><select aria-label="${esc(p.n)} 개인 과제" onchange="FM.campTask('${q(p.n)}',this.value)"><option value="">없음</option>${o.map(([k,x])=>`<option value="${k}" ${c.tasks[p.n]===k?'selected':''}>${x.l} · ${x.d}</option>`).join('')}</select></div>`:''; }).join('')}</div></details>
    <div class="row" style="gap:8px;margin-top:12px"><button class="btn primary" ${ready?'':'disabled'} onclick="FM.campAdvance()">${c.week>=3?'4주차 진행하고 시범경기로':(c.week+1)+'주차 진행'}</button><button class="btn" ${ready?'':'disabled'} onclick="FM.startSpring()">남은 캠프 한 번에 진행</button></div>
    ${ready?'':'<div class="hint" style="margin-top:6px">훈련 방향을 먼저 고르세요.</div>'}${c.log.length?`<div class="hint" style="margin-top:8px">${c.log.map(esc).join('<br>')}</div>`:''}`);
}
function setCamp(k){ const c=campState(); c.focus=k; if(window.Track) Track.action('camp'); if(typeof document!=='undefined'&&document.querySelector&&document.querySelector('.modal')) campPicker(); else render(); }
function campRunWeek(){
  const c=campState(), w=c.week; if(w>=4) return '';
  const pl=c.plan[w], fc=CAMP[c.focus||'bal'], gains=[], hurt=[];
  const wear=coachWear(USER);
  allPlayers(USER).forEach(p=>{
    const keys=fc.keys? (fc.type===p.type? fc.keys : []) : (p.type==='B'? ['con','pow','eye','spd','fld','arm'] : ['stu','ctl','mov','sta']);
    const base=p.age<=24? 0.9 : p.age<=28? 0.55 : p.age<=32? 0.3 : 0.1, chance=base/4*(pl.skill/4)*(fc.keys?1:0.5)*coachGrow(p);
    const hurtNow=K.isInjured(p);
    let tot=0; if(!hurtNow) keys.forEach(k=>{ if(Math.random()>=chance||p[k]>=99) return; const was=K.ovr(p); p[k]++; if(K.ovr(p)>Math.max(p.pot||0,was)) p[k]--; else tot++; });
    if(p.type==='P'&&Math.random()<0.02*pl.fit*(p.age<=30?1:0.5)&&p.sta<99){ const was=K.ovr(p); p.sta++; if(K.ovr(p)>Math.max(p.pot||0,was)) p.sta--; }
    if(tot) gains.push(`${p.n} +${tot}`);
    const inj=0.004*Math.max(0,pl.fit+pl.skill-5)*(p.age>=30?1.5:1)*(1-pl.rest*0.25)*wear.inj;
    if(!hurtNow&&Math.random()<inj){ p.inj=R(1,10); hurt.push(`${p.n}(${p.inj}경기)`); }
    addMor(p,pl.rest*0.5);
  });
  const tf=tfState(); activePlans().forEach(x=>{ tf[x.k][x.v]=Math.min(100,tf[x.k][x.v]+pl.tac*1.5+(c.focus==='tac'?TF_CAMP/4:0)); });
  c.fitSum=(c.fitSum||0)+pl.fit; c.week=w+1;
  const line=`${w+1}주차 · 성장 ${gains.slice(0,5).join(', ')||'없음'}${hurt.length?' · 부상 '+hurt.join(', '):''}`;
  c.log.push(line);
  if(c.week===4) campFinishTasks(c);
  return line;
}
// a camp gain never carries a player past his potential
function bumpWithin(p,k,d){ let n=0; for(let i=0;i<d;i++){ const was=K.ovr(p); if(p[k]>=99) break; p[k]++; if(K.ovr(p)>Math.max(p.pot||0,was)){ p[k]--; break; } n++; } return n; }
function campFinishTasks(c){ const out=[];
  Object.entries(c.tasks).forEach(([n,k])=>{ const p=findPlayer(USER,n); if(!p) return;
    if(k==='newpitch'){ if(Math.random()<0.7){ const d=bumpWithin(p,'mov',R(2,4)); out.push(d?`${n} 신무기 성공(무브 +${d})`:`${n} 신무기 성공(이미 한계치)`); } else out.push(`${n} 신무기 실패`); }
    else if(k==='form'){ const key=Math.random()<0.5?'con':'pow'; if(Math.random()<0.65){ const d=bumpWithin(p,key,2); out.push(`${n} 타격폼 안착(+${d})`); } else { p[key]-=1; out.push(`${n} 타격폼 혼란(-1)`); } }
    else if(k==='body'){ p.tough=state.year; out.push(`${n} 몸 만들기 완료`); }
    else if(k==='pos'){ p.alt=POS_NEXT[p.pos]; out.push(`${n} ${p.alt} 수비 습득`); }
  });
  if(out.length) c.log.push('개인 과제 · '+out.join(', '));
}
function campAdvance(){ const c=campState(); if(!c.focus){ return; }
  const line=campRunWeek(); const coach=staffOf(USER).head.n;
  send(`${coach} 수석코치`,'🏕',`스프링캠프 ${c.week}주차 보고`,line,[]);
  if(c.week>=4){ closeModal(); startSpring(); saveNow(); return; } saveNow(); campPicker(); }
function saveNow(){ try{ if(typeof autosave==='function') autosave(); }catch(e){} }
// runs whatever camp weeks are left and returns the summary for the head coach's report
function applyCamp(){ const c=campState(); if(!c.focus) c.focus='bal'; while(c.week<4) campRunWeek();
  allPlayers(USER).forEach(p=>{ p.sharp=clampN(40+Math.min(10,Math.round((c.fitSum||12)/4*2)),0,100); });
  return `${CAMP[c.focus].label} · ${c.log.slice(-5).join(' / ')}`; }
// match sharpness rises through the exhibition games
function sharpAfterSpring(res){ const bx=res.box[USER]; if(!bx) return;
  allPlayers(USER).forEach(p=>{ if(p.inj>0) p.inj--; });   // camp knocks heal through the exhibition games
  for(const n in bx.bat){ const p=findPlayer(USER,n), s=bx.bat[n]; if(p) { p.sharp=clampN((p.sharp==null?40:p.sharp)+4*s.PA,0,100); p.sprPA=(p.sprPA||0)+s.PA; } }
  for(const n in bx.pit){ const p=findPlayer(USER,n), s=bx.pit[n]; if(!p||!s.BF) continue; const ip=s.OUT/3, gain=p.role==='SP'? 5*ip : 8;
    p.sharp=clampN((p.sharp==null?40:p.sharp)+gain,0,100); p.sprIP=(p.sprIP||0)+ip; } }
function sharpOnOpen(){ allPlayers(USER).forEach(p=>{ if((p.sprPA||0)>40||(p.sprIP||0)>15) p.cond=Math.max(0,K.cond(p)-10); delete p.sprPA; delete p.sprIP; }); }
const USE_L={much:'많이',normal:'보통',low:'적게',none:'안 씀'};
function springUseOf(p){ const f=fm(), u=(f.springUse||{})[p.n]; if(u) return u; return p.age>=35?'low':(K.ovr(p)<62?'much':'normal'); }
function setSpringUse(n,v){ const f=fm(); f.springUse=f.springUse||{}; f.springUse[n]=v; saveNow(); render(); }
// never rests so many that an injured starter has no one to replace him
// rests the players marked 안 씀 (and 적게 every other game), but always leaves eleven healthy batters
function springRest(){ const sp=state.spring; if(!sp) return []; const odd=sp.played%2===1, ps=allPlayers(USER);
  let room=Math.max(0,ps.filter(p=>p.type==='B'&&!K.isInjured(p)).length-11);
  return ps.filter(p=>{ const u=springUseOf(p); return !K.isInjured(p)&&(u==='none'||(u==='low'&&odd)); }).filter(p=>p.type!=='B'||room-->0).map(p=>p.n); }
function springUseCard(){ const ps=allPlayers(USER).slice().sort((a,b)=>K.ovr(b)-K.ovr(a)).slice(0,20);
  return `<div class="card" style="margin-bottom:14px"><h3>시범경기 출전 계획 <span class="tag">경기 감각은 개막 후 18경기까지 ±3% 영향</span></h3><div class="cp-use">${ps.map(p=>`<div><span>${esc(p.n)} <small class="muted">감각 ${Math.round(p.sharp==null?40:p.sharp)}</small></span><select aria-label="${esc(p.n)} 출전량" onchange="FM.setSpringUse('${q(p.n)}',this.value)">${Object.entries(USE_L).map(([k,l])=>`<option value="${k}" ${springUseOf(p)===k?'selected':''}>${l}</option>`).join('')}</select></div>`).join('')}</div></div>`; }

// ----- weekly stove league -----
const STOVE_WEEKS=12;
function stoveState(){ const f=fm(); if(!f.stove||f.stove.year!==state.year) f.stove={year:state.year,week:1,log:[]}; return f.stove; }
function faScore(x,b){ const str=teamStrength(b.team), max=Math.max.apply(null,K.TEAM_IDS.map(teamStrength))||1;
  const r=K.ROSTERS[b.team], same=(x.p.type==='B'?r.batters.filter(p=>p.pos===x.p.pos):r.pitchers.filter(p=>p.role===x.p.role)).map(K.ovr).sort((a,c)=>c-a)[0]||50;
  return 0.6*(b.sal/x.ask)+0.2*(b.yrs/3)+0.1*(str/max)+0.1*(K.ovr(x.p)>=same?1:0.4); }
function faSign(x,b){ const f=fm(), p=x.p; f.fa.splice(f.fa.indexOf(x),1);
  p.sal=b.sal; p.yrs=b.yrs; p.mor=72; p.cond=100; p.inj=0; p.listed=false; p.bench=0;
  if(b.team===USER){ p.newG=NEW_GAMES; const where=joinClub(USER,p), bonus=Math.round(b.sal*b.yrs*0.25*10)/10; f.fin.balance-=bonus; f.fin.exp+=bonus;
    send('단장','✍️',`FA ${p.n} 영입 성공`,`${p.n}이(가) 우리 제안을 수락했습니다. ${b.yrs}년 연봉 ${b.sal}억, 계약금 ${bonus}억.${where==='2군'?' 1군 엔트리가 가득 차 2군에 등록했습니다.':''}`,[]); }
  else { (p.type==='B'?K.ROSTERS[b.team].batters:K.ROSTERS[b.team].pitchers).push(p); }
}
function stoveStep(){
  const f=fm(), st=stoveState(), w=st.week, news=[]; if(w>STOVE_WEEKS) return;
  (f.fa||[]).slice().forEach(x=>{ x.bids=x.bids||[]; const ov=K.ovr(x.p);
    if(w>=10&&!x.cut){ x.ask=Math.max(0.5,Math.round(x.ask*7)/10); x.cut=true; }
    if(w>=2) K.TEAM_IDS.forEach(t=>{ if(t===USER||x.bids.some(b=>b.team===t)) return; const r=K.ROSTERS[t], room=(x.p.type==='B'?r.batters.length<16:r.pitchers.length<14);
      if(!room||x.p.f&&foreignOf(t).length>=FX_MAX) return;
      const bestSame=(x.p.type==='B'?r.batters.filter(p=>p.pos===x.p.pos):r.pitchers.filter(p=>p.role===x.p.role)).map(K.ovr).sort((a,b)=>b-a)[0]||50;
      const need=ov>bestSame?1:ov>bestSame-6?0.45:0.12, money=payroll(t)<190?1:0.3, pull=clampN((ov-58)/25,0.1,1);
      if(Math.random()<0.22*need*money*pull){ const mine=x.bids.find(b=>b.team===USER), sal=Math.round(x.ask*(0.95+Math.random()*0.2)*10)/10;
        x.bids.push({team:t,sal,yrs:x.yrs}); if(mine&&sal>mine.sal){ const room=w<STOVE_WEEKS; if(room) x.decide=Math.max(x.decide||0,w+1);
          send('단장','📣',`${x.p.n} 경쟁 입찰`,`다른 구단이 ${x.p.n}에게 우리보다 높은 조건을 제시한 것으로 보입니다. `+(room?'선수는 다음 주에 결정합니다. 그 전에 구단 탭 FA 목록에서 다시 제안할 수 있습니다.':'스토브리그 마지막 주라 다시 제안할 시간이 없습니다.'),[]); } } });
    if(x.bids.length&&x.decide==null) x.decide=Math.min(STOVE_WEEKS,w+(ov>=75?R(2,3):R(1,2)));
    // a bid that can't be honored any more (budget, foreign quota) drops out before the player decides
    x.bids=x.bids.filter(b=>{ const fx=x.p.f&&foreignOf(b.team).length>=FX_MAX, money=b.team===USER&&payroll(USER)+b.sal>f.fin.budget*1.1;
      if((fx||money)&&b.team===USER) send('단장','⚠️',`${x.p.n} 제안 철회`,fx?'외국인 선수 정원(4명)이 차서 제안을 거둬들였습니다.':'연봉 총액 한도를 넘어 제안을 거둬들였습니다.',[]);
      return !(fx||money); });
    if(x.bids.length&&(w>=x.decide||w>=STOVE_WEEKS)){ const best=x.bids.slice().sort((a,b)=>faScore(x,b)-faScore(x,a))[0], mine=x.bids.find(b=>b.team===USER);
      faSign(x,best); news.push(`${x.p.n} → ${best.team===USER?K.ROSTERS[USER].name:best.team}`);
      if(mine&&best.team!==USER) send('단장','📉',`${x.p.n} 영입 실패`,`${x.p.n}은(는) ${K.ROSTERS[best.team].name}을(를) 택했습니다.`,[]); }
  });
  if(Math.random()<0.25){ try{ maybeTradeOffer(userGamesPlayed()); }catch(e){} }
  const ev={1:'재계약 협상을 마무리하세요.',2:'FA 시장이 열렸습니다.',4:'외국인 선수 계약이 본격화됩니다.',10:'남은 FA 몸값이 30% 내려갔습니다.',12:'이번 주가 지나면 스프링캠프로 떠납니다.'}[w];
  const line=`${w}주차${ev?' · '+ev:''}${news.length?' · 계약: '+news.join(', '):''}`; st.log.push(line);
  st.week=w+1;
  if(ev||news.length) send('단장','🗓',`스토브리그 ${w}주차 보고`,line,[]);
}
function stoveNext(){ stoveStep(); saveNow(); render(); if(window.Track) Track.action('stove_week'); }
function stoveSkip(){ const st=stoveState(); while(st.week<=STOVE_WEEKS) stoveStep(); saveNow(); render(); }
function faBid(i){ const f=fm(), x=(f.fa||[])[i]; if(!x) return; const p=x.p, base=x.ask, mine=(x.bids||[]).find(b=>b.team===USER), others=(x.bids||[]).filter(b=>b.team!==USER);
  const top=others.length?Math.max.apply(null,others.map(b=>b.sal)):0, ops=[1,1.1,1.25].map(m=>Math.round(base*m*10)/10);
  modal(`<span class="closeX" onclick="App.closeModal()" role="button" tabindex="0" aria-label="닫기">×</span><h2>${esc(p.n)} 입찰</h2>
    <p class="muted">${p.age}세 · ${posFull(p.pos||p.role)} · OVR ${K.ovr(p)} · 요구 ${x.yrs}년 ${x.ask}억</p>
    <p>입찰 구단 ${others.length}곳${top?` · 최고 제안 약 ${Math.round(top)}억대`:''}${mine?` · 우리 제안 ${mine.yrs}년 ${mine.sal}억`:''}</p>
    <div class="grid" style="gap:8px">${ops.map(s=>`<button class="btn" onclick="FM.faBidSend(${i},${s},${x.yrs})">${x.yrs}년 연봉 ${s}억 제안</button>`).join('')}${x.yrs<4?`<button class="btn" onclick="FM.faBidSend(${i},${ops[0]},${x.yrs+1})">${x.yrs+1}년 연봉 ${ops[0]}억 제안</button>`:''}</div>
    <div class="hint" style="margin-top:8px">선수는 연봉 60%, 계약 기간 20%, 우승 전력 10%, 출전 기회 10%로 판단합니다. 몇 주 안에 결정합니다.</div>`); }
function faBidSend(i,sal,yrs){ const f=fm(), x=f.fa[i]; if(!x) return; if(x.p.f&&foreignOf(USER).length>=FX_MAX){ notify('외국인 선수 정원(4명)이 찼습니다.'); return; }
  if(payroll(USER)+sal>f.fin.budget*1.1){ notify('연봉 총액 한도를 넘는 제안입니다.'); return; }
  if(stoveState().week>STOVE_WEEKS){ notify('스토브리그 입찰 기간이 끝났습니다.'); return; }
  x.bids=(x.bids||[]).filter(b=>b.team!==USER); x.bids.push({team:USER,sal,yrs}); if(x.decide==null) x.decide=Math.min(STOVE_WEEKS,stoveState().week+R(1,2)); saveNow(); closeModal(); notify(`${x.p.n}에게 ${yrs}년 ${sal}억을 제안했습니다.`); render(); }
