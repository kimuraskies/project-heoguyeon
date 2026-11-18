// ---------- KBO FA (2026 rules): eligibility, grades, a week-by-week market, compensation, cap, waivers ----------
// Eligibility: 8 registered seasons (7 for college graduates), again 4 seasons after each FA contract.
// Grades by the last three salaries: A = team top 3 and league top 30, B = team top 10 and league top 60,
// C = the rest and anyone 35 or older at a first FA. Re-FA: the second FA is graded B, the third and later C
// (and C again for a player who was C at his first FA). Compensation from the signing club to the old club:
// A = 200% of last salary + one player outside a 20-man protected list, or 300%; B = 100% + one outside 25,
// or 200%; C = 150%. A club signs at most two outside FAs a winter. Competitive-balance cap (경쟁균형세):
// 143.97억 in 2026, +5% a year to 2028; going over costs 50% / 100% / 150% of the excess in a row.
// Waivers: a released player waits 7 days (7 games, or a stove week) for a claim from the clubs in reverse
// standings order; a claim takes over the contract, otherwise the old club pays what is left of it and the player
// becomes a free agent no club may sign that year (KBO 규약).
const FA_CAP_Y={2025:137.12,2026:143.97,2027:151.17,2028:158.73};
const FA_GR={A:{prot:20,pay:2,cash:3},B:{prot:25,pay:1,cash:2},C:{prot:0,pay:0,cash:1.5}};
const FA_OUT_MAX=2, FA_REPEAT=4, WAIVER_GAMES=7, FA_BONUS_SHARE=0.3;
const FA_GR_LABEL={A:'A등급',B:'B등급',C:'C등급'};
function capOf(y){ return FA_CAP_Y[y]||eok(158.73*Math.pow(1.05,Math.max(0,y-2028))); }
// registered seasons from the real record: a season counts with 150 PA or 70 G (hitters), 25 G or 60 IP (pitchers)
function svcFromCareer(p){ const c=window.KBO_CAREER&&window.KBO_CAREER[p.n]; if(!c||c.t!==p.type||!c.y||!c.y.length) return null;
  const by={}; c.y.forEach(r=>{ const y=by[r[0]]=by[r[0]]||{g:0,pa:0,out:0}; y.g+=r[2]; if(p.type==='B') y.pa+=r[3]; else y.out+=r[7]; });
  const ys=Object.keys(by).map(Number), svc=ys.filter(y=>p.type==='B'? by[y].pa>=150||by[y].g>=70 : by[y].g>=25||by[y].out>=180).length;
  return {svc, first:Math.min.apply(null,ys)}; }
function faInit(p){ if(p.svc!=null) return p;
  if(p.f){ p.svc=0; p.faAt=99; return p; }
  const c=svcFromCareer(p), svc=c? c.svc : 0, debut=c? p.age-(state.year-c.first) : (p.college? 22 : p.age), thr=debut>=22? 7 : 8;
  p.svc=svc; p.faAt= svc<thr? thr : thr+FA_REPEAT*Math.ceil((svc-thr)/FA_REPEAT); faGuessN(p,thr); return p; }
// FAs a player has already had: from his service time when the game first sees him
function faGuessN(p,thr){ if(p.faN!=null||p.f) return; thr=thr||8; const s=p.svc||0; p.faN= s>thr? 1+Math.floor((s-thr-1)/FA_REPEAT) : 0; }
function faInitAll(){ K.TEAM_IDS.forEach(t=>allPlayers(t).concat(farmOf(t)).forEach(faInit)); }
function faLeft(p){ faInit(p); return p.f? null : Math.max(0,p.faAt-p.svc); }
function faEligible(p){ faInit(p); return !p.f && p.svc>=p.faAt; }
// end of a season: a registered season for anyone with enough first-team time; salary history for grades
function faSeasonTick(){ K.TEAM_IDS.forEach(t=>{ const s=state.season[t];
  allPlayers(t).concat(farmOf(t)).forEach(p=>{ faInit(p);
    const b=s.bat[p.n], q=s.pit[p.n], ok= p.type==='B'? b&&(b.PA>=150||b.G>=70) : q&&(q.G>=25||q.OUT>=180);
    if(ok) p.svc++;
    p.salH=(p.salH||[]).concat(p.sal||0).slice(-3); }); }); }
function avgSal(p){ const h=(p.salH&&p.salH.length)? p.salH : [p.sal||0]; return h.reduce((a,b)=>a+b,0)/h.length; }
function faGradeMap(){ const all=[]; K.TEAM_IDS.forEach(t=>allPlayers(t).concat(farmOf(t)).forEach(p=>{ if(!p.f) all.push({t,p,s:avgSal(p)}); }));
  all.sort((a,b)=>b.s-a.s); const lg=new Map(), tm=new Map(), per={};
  all.forEach((x,i)=>{ lg.set(x.p,i+1); per[x.t]=(per[x.t]||0)+1; tm.set(x.p,per[x.t]); });
  return p=>{ faGuessN(p); const n=p.faN||0; if(n>=2||(n===1&&p.faG==='C')) return 'C'; if(n===1) return 'B'; if(p.age>=35) return 'C'; const l=lg.get(p)||999, k=tm.get(p)||999; return k<=3&&l<=30? 'A' : k<=10&&l<=60? 'B' : 'C'; }; }
function faWantYears(p){ return p.age<=29? 4 : p.age<=32? 3 : p.age<=34? 2 : 1; }
function faAskOf(p,grade){ const base=Math.max(renewSalary(p), salaryFor(p))*1.1; return Math.max(0.5, eok(base*(grade==='A'?1.5:grade==='B'?1.25:1))); }

// ---- season end: the KBO publishes the eligible list, players decide whether to file ----
function faDeclare(cands){ const f=fm(), g=faGradeMap(), filed=[], stayed=[];
  cands.forEach(([t,p])=>{ const grade=g(p), ovr=K.ovr(p), r=K.ROSTERS[t];
    const go= ovr>=72? 0.95 : ovr>=66? 0.8 : ovr>=60? 0.5 : 0.2;
    if(Math.random()<go){
      r.batters=r.batters.filter(x=>x!==p); r.pitchers=r.pitchers.filter(x=>x!==p); r.farm=farmOf(t).filter(x=>x!==p);
      f.fa.push({p, from:t, kind:'fa', grade, prevSal:p.sal||0, ask:faAskOf(p,grade), yrs:faWantYears(p), bids:{}});
      p.expiring=false; filed.push({t,p,grade}); }
    else { p.yrs=1; p.sal=renewSalary(p); stayed.push({t,p}); } });
  const cnt=k=>filed.filter(x=>x.grade===k).length;
  if(filed.length) feedPush({year:state.year, kind:'fa', title:`🆓 ${state.year+1} FA 승인 선수 ${filed.length}명 공시`,
    body:`A등급 ${cnt('A')}명 · B등급 ${cnt('B')}명 · C등급 ${cnt('C')}명. 스토브리그 첫 주부터 모든 구단과 협상할 수 있습니다.\n\n`+
      filed.slice().sort((a,b)=>K.ovr(b.p)-K.ovr(a.p)).slice(0,8).map(x=>`• ${x.p.n} (${x.t} · ${FA_GR_LABEL[x.grade]} · ${x.p.age}세 · OVR ${K.ovr(x.p)})`).join('\n')});
  const mine=filed.filter(x=>x.t===USER), kept=stayed.filter(x=>x.t===USER);
  if(mine.length||kept.length) send('단장','🆓',`FA 자격 선수 ${mine.length+kept.length}명 — 권리 행사 결과`,
    (mine.length? `FA를 신청한 선수:\n${mine.map(x=>`• ${x.p.n} (${FA_GR_LABEL[x.grade]}, OVR ${K.ovr(x.p)}, 직전 연봉 ${x.p.sal}억)`).join('\n')}\n\n이 선수들은 다른 구단과도 협상합니다. 잡으려면 구단 → 스카우트 탭 FA 시장에서 우리도 제안을 넣어야 합니다. 다른 구단으로 가면 등급에 따라 보상을 받습니다.` : '')+
    (kept.length? `${mine.length?'\n\n':''}FA를 신청하지 않고 1년 재계약한 선수: ${kept.map(x=>x.p.n).join(', ')}` : ''),
    mine.length? [{label:'FA 시장 보기', fn:'openClub'}] : []);
  faAiBids();   // the first bids are on the table the day the market opens
}

// ---- the market ----
function faOutCount(t){ const f=fm(), o=f.faOut; return o&&o.year===state.year? (o[t]||0) : 0; }
function faOutAdd(t){ const f=fm(); if(!f.faOut||f.faOut.year!==state.year) f.faOut={year:state.year}; f.faOut[t]=(f.faOut[t]||0)+1; }
function capPay(t){ return eok(allPlayers(t).concat(farmOf(t)).filter(p=>!p.f).map(p=>(p.sal||0)+(p.bonusY||0)).sort((a,b)=>b-a).slice(0,40).reduce((a,b)=>a+b,0)); }
// how much a player lifts a club at his spot (OVR over the incumbent)
function faGain(t,p){ const r=K.ROSTERS[t], o=K.ovr(p);
  if(p.type==='B'){ const same=r.batters.filter(x=>x.pos===p.pos).map(K.ovr).sort((a,b)=>b-a); return o-(same[0]||55); }
  if(p.role==='SP'){ const sp=r.pitchers.filter(x=>x.role==='SP').map(K.ovr).sort((a,b)=>b-a); return o-(sp[4]||55); }
  const rp=r.pitchers.filter(x=>x.role!=='SP').map(K.ovr).sort((a,b)=>b-a); return o-(rp[3]||55); }
function faCanBid(t,x){ if(x.blockY!=null&&x.blockY>=state.year) return false; if(t===x.from) return true; if(x.p.f&&!fxRoom(t,x.p)) return false; return x.kind!=='fa'||faOutCount(t)<FA_OUT_MAX; }
// other clubs bid: the three that gain most, within a loose budget; old clubs try to keep their own
function faAiBids(){ const f=fm();
  (f.fa||[]).forEach(x=>{ const p=x.p, ovr=K.ovr(p);
    K.TEAM_IDS.forEach(t=>{ const b=x.bids[t]; if(t!==USER&&b) b.aav=eok(b.aav*1.03); });
    const teams=K.TEAM_IDS.filter(t=>t!==USER&&!x.bids[t]&&faCanBid(t,x)).map(t=>({t,g:faGain(t,p)}))
      .filter(o=>o.t===x.from? ovr>=62 : (o.g>=(x.grade==='A'?4:2)||ovr>=76))
      .filter(o=>payroll(o.t)+x.ask<=clubTradeBudget(o.t)*1.25)
      .sort((a,b)=>b.g-a.g).slice(0,3);
    teams.forEach(o=>{ if(Math.random()<0.35) return;
      const k=clampN(0.9+Math.random()*0.12+0.015*o.g+(o.t===x.from?0.02:0),0.85,1.3);
      x.bids[o.t]={aav:eok(x.ask*k), yrs:clampN(x.yrs+(Math.random()<0.3?(Math.random()<0.5?-1:1):0),1,4)}; }); }); }
function faRank(t){ const r=K.TEAM_IDS.slice().sort((a,b)=>teamStrength(b)-teamStrength(a)); return r.indexOf(t)+1; }
function faScore(x,t,b){ if(!b) return 0;
  let s=(b.aav*b.yrs+(x.kind==='fa'?0:0))/(x.ask*x.yrs);
  s+= b.yrs>x.yrs? 0.03*(b.yrs-x.yrs) : -0.06*(x.yrs-b.yrs);
  if(t===x.from) s+=0.06;
  if(faRank(t)<=3) s+=0.04;
  if(b.promise) s+=0.06;
  return s; }
// a player signs once the best offer clears his bar; the bar drops as the winter goes on
function faDecide(x,week,final){ const offers=Object.keys(x.bids).filter(t=>faCanBid(t,x)).map(t=>({t,b:x.bids[t],s:faScore(x,t,x.bids[t])*(0.97+Math.random()*0.06)}))
    .sort((a,b)=>b.s-a.s); const top=offers[0]; if(!top) return null;
  const bar= final? 0.8 : Math.max(0.86, 1.02-0.035*week);
  return top.s>=bar? top : null; }
function faStatus(x){ const n=Object.keys(x.bids).filter(t=>t!==USER).length, mine=x.bids[USER];
  return {n, mine, lead: mine && Object.keys(x.bids).every(t=>faScore(x,USER,mine)>=faScore(x,t,x.bids[t]))}; }
// signs x with club t on bid b; returns the news line
function faSignWith(x,t,b){ const f=fm(), p=x.p, i=f.fa.indexOf(x); if(i<0) return ''; f.fa.splice(i,1);
  const isFA=x.kind==='fa', total=eok(b.aav*b.yrs);
  if(isFA){ p.sal=eok(b.aav*(1-FA_BONUS_SHARE)); p.bonusY=eok(b.aav*FA_BONUS_SHARE); p.faAt=(p.svc||0)+FA_REPEAT; p.faN=(p.faN||0)+1; p.faG=x.grade||'C'; p.faY=state.year; }
  else { p.sal=b.aav; p.bonusY=0; }
  p.yrs=b.yrs; p.mor=b.promise?78:72; p.cond=100; p.inj=0; p.listed=false; p.bench=0; p.newG=NEW_GAMES; p.expiring=false; ensurePlayer(p);
  const where=joinClub(t,p);
  if(t===USER){ const bonus=isFA? eok(total*FA_BONUS_SHARE) : 0; f.fin.balance-=bonus; f.fin.exp+=bonus;
    if(b.promise){ const ug=userGamesPlayed(); f.promises.push({n:p.n,from:ug,until:ug+40,need:28}); }
    f.fans=clampN((f.fans||50)+(K.ovr(p)>=75?3:1),0,100); }
  if(x.from===USER&&t!==USER&&isFA) f.fans=clampN((f.fans||50)-(K.ovr(p)>=75?3:1),0,100);
  const moved=x.from&&K.ROSTERS[x.from]&&x.from!==t;
  if(moved&&isFA) faOutAdd(t);
  const head= isFA? `${p.n}, ${K.ROSTERS[t].name}와(과) ${b.yrs}년 총액 ${total}억 FA 계약` : `${p.n}, ${K.ROSTERS[t].name}와(과) ${b.yrs}년 연봉 ${b.aav}억 계약`;
  const stay= x.from===t? '원소속 구단에 남았습니다.' : moved? `${x.from}에서 ${K.ROSTERS[t].name}로 옮깁니다.` : '';
  const big= total>=80? ' 이번 겨울 최대 규모 계약 중 하나입니다.' : '';
  const fan= t===USER? `\n팬 반응: ${K.ovr(p)>=75? '"드디어 큰손이 움직였다!"는 반응이 쏟아집니다.' : '"알짜 보강"이라는 평가가 많습니다.'}` : x.from===USER&&isFA? `\n팬 반응: "${p.n}을(를) 왜 못 잡았나"는 아쉬움이 큽니다.` : '';
  feedPush({year:state.year, kind:'fa', title:`✍️ ${head}`, body:josa(`${posFull(p.pos||p.role)} · ${p.age}세 · OVR ${K.ovr(p)}${x.grade?` · ${FA_GR_LABEL[x.grade]}`:''}\n${isFA?`계약금 ${eok(total*FA_BONUS_SHARE)}억 · 연봉 ${p.sal}억`:''} ${stay}${big}${fan}`)});
  if(moved&&isFA) faCompensate(x,t);
  if(t===USER) send('단장','✍️',`FA ${p.n} 영입`, `${p.n}와(과) ${b.yrs}년 총액 ${total}억 원에 계약했습니다.${isFA?` 계약금 ${eok(total*FA_BONUS_SHARE)}억 원은 구단 잔고에서 나갔고, 연봉은 ${p.sal}억 원입니다.`:''}${where==='2군'?'\n1군 엔트리가 가득 차 2군에 등록했습니다.':''}`, []);
  else if(x.bids[USER]) send('단장','📉',`${p.n} 영입 실패`, `${p.n}은(는) ${K.ROSTERS[t].name}의 제안(${b.yrs}년 총액 ${total}억)을 택했습니다.`, []);
  return head; }
// one week of the winter market: bids, then decisions
function faWeek(week,final){ const f=fm(); if(!(f.fa||[]).length) return [];
  faAiBids(); const out=[];
  (f.fa||[]).slice().sort((a,b)=>K.ovr(b.p)-K.ovr(a.p)).forEach(x=>{ if(f.fa.indexOf(x)<0) return; const d=faDecide(x,week,final); if(d) out.push(faSignWith(x,d.t,d.b)); });
  compAuto(); return out; }
// opening day: whoever is left takes a one-year deal from his old club or leaves the league
function faLeftovers(){ const f=fm(), out=[];
  faWeek(9,true);
  (f.fa||[]).slice().forEach(x=>{ const p=x.p, t=x.from&&K.ROSTERS[x.from]&&x.from!==USER? x.from : null;
    if(t&&K.ovr(p)>=60&&!(p.f&&!fxRoom(t,p))){ out.push(faSignWith(x,t,{aav:eok(x.ask*0.75),yrs:1})); } });
  f.fa=(f.fa||[]).filter(x=>x.blockY!=null); compAuto(true); return out; }

// ---- the user's offer ----
function faOffer(i){ faDraft=null; faOfferModal(i); }
function faOfferModal(i){ const f=fm(), x=(f.fa||[])[i]; if(!x) return; const p=x.p, g=x.grade&&FA_GR[x.grade], mine=x.bids[USER];
  const yrs=faDraft&&faDraft.i===i? faDraft.y : mine?mine.yrs:x.yrs, lv=[0.9,1,1.1,1.2,1.35];
  const comp= x.kind!=='fa'||!x.from||x.from===USER||!K.ROSTERS[x.from]? '보상 없음 (원소속 구단과 재계약하거나 자유계약 선수)'
    : g.prot? `원소속 ${x.from}에 직전 연봉 ${Math.round(g.pay*100)}% (${eok(x.prevSal*g.pay)}억) + 보호선수 ${g.prot}인 외 1명, 또는 ${Math.round(g.cash*100)}% (${eok(x.prevSal*g.cash)}억)`
    : `원소속 ${x.from}에 직전 연봉 150% (${eok(x.prevSal*1.5)}억), 보상선수 없음`;
  const out= x.kind==='fa'&&x.from!==USER? `외부 FA 영입 ${faOutCount(USER)}/${FA_OUT_MAX}명` : '';
  const row=k=>{ const aav=eok(x.ask*k), tot=eok(aav*yrs);
    return `<button class="btn fa-opt" onclick="FM.faBid(${i},${aav},${yrs})"><b>${yrs}년 총액 ${tot}억</b><small>${x.kind==='fa'?`계약금 ${eok(tot*FA_BONUS_SHARE)}억 · 연봉 ${eok(aav*(1-FA_BONUS_SHARE))}억`:`연봉 ${aav}억`} · 요구의 ${Math.round(k*100)}%</small></button>`; };
  modal(`<span class="closeX" onclick="App.closeModal()">×</span><h2>✍️ ${esc(p.n)} 제안 ${x.grade?`<span class="pill pos">${FA_GR_LABEL[x.grade]}</span>`:''}</h2>
    <div class="muted">${posFull(p.pos||p.role)} · ${p.age}세 · OVR ${K.ovr(p)} · 원소속 ${x.from||'-'} · 직전 연봉 ${x.prevSal||p.sal}억</div>
    <div class="hint" style="margin:10px 0">요구 조건: ${x.yrs}년 연평균 ${x.ask}억 · 관심 구단 ${faStatus(x).n}곳${out?` · ${out}`:''}<br>보상: ${comp}<br>경쟁균형세 상한 ${capOf(state.year)}억 · 우리 팀 ${capPay(USER)}억</div>
    <div class="sq-sort" style="margin:0 0 10px"><span class="muted">계약 기간</span>${[1,2,3,4].map(y=>`<button class="chip${y===yrs?' on':''}" onclick="FM.faSetYears(${i},${y})">${y}년</button>`).join('')}</div>
    <div class="fa-opts">${lv.map(row).join('')}</div>
    ${mine?`<button class="btn btn-quiet" style="margin-top:8px" onclick="FM.faWithdraw(${i})">제안 철회</button>`:''}
    <p class="hint" style="margin-top:10px">${state.phase==='stove'?'제안은 이번 주가 끝날 때 선수가 다른 구단 제안과 비교해 결정합니다. 돈 외에도 계약 기간, 원소속 구단 애착, 우승 가능성을 봅니다.':'시즌 중에는 선수가 바로 답합니다.'}</p>`); }
// the years chosen in the open offer dialog (before an offer is placed)
let faDraft=null;
function faSetYears(i,y){ faDraft={i,y}; faOfferModal(i); }
function faBid(i,aav,yrs){ const f=fm(), x=(f.fa||[])[i]; if(!x) return; const p=x.p;
  if(x.blockY!=null&&x.blockY>=state.year){ notify(`웨이버에서 풀린 선수는 ${x.blockY}년에는 계약할 수 없습니다.`); return; }
  if(p.f&&!fxRoom(USER,p)){ notify(`${fxLabel(p)} 선수 정원(${fxCap(p)}명)이 찼습니다.`); return; }
  if(x.kind==='fa'&&x.from!==USER&&faOutCount(USER)>=FA_OUT_MAX){ notify(`외부 FA는 한 해 ${FA_OUT_MAX}명까지 영입할 수 있습니다.`); return; }
  const sal=x.kind==='fa'? eok(aav*(1-FA_BONUS_SHARE)) : aav, limit=f.fin.budget*1.1, after=payroll(USER)+sal;
  if(after>limit){ notify(`연봉 총액이 한도를 넘습니다 (${after.toFixed(1)}억 > ${limit.toFixed(1)}억).`); return; }
  x.bids[USER]={aav,yrs}; faDraft=null;
  const capAfter=eok(capPay(USER)+aav), capWarn= capAfter>capOf(state.year)? `\n⚠️ 계약하면 경쟁균형세 상한(${capOf(state.year)}억)을 넘습니다 (${capAfter}억). 시즌이 끝나면 초과분의 50%를 냅니다.` : '';
  closeModal();
  if(state.phase!=='stove'){ const d=faDecide(x,9,true); if(d&&d.t===USER){ faSignWith(x,USER,x.bids[USER]); } else { delete x.bids[USER]; notify(`${p.n}이(가) 제안을 거절했습니다.`); } render(); return; }
  notify(`${p.n}에게 ${yrs}년 총액 ${eok(aav*yrs)}억을 제안했습니다. 이번 주가 끝나면 답이 옵니다.${capWarn}`); render(); }
function faWithdraw(i){ const x=(fm().fa||[])[i]; if(x) delete x.bids[USER]; closeModal(); render(); }
function faCard(){ const f=fm(), list=(f.fa||[]).map((x,i)=>({x,i})).sort((a,b)=>K.ovr(b.x.p)-K.ovr(a.x.p));
  const cap=capOf(state.year), pay=capPay(USER), o=f.off&&f.off.year===state.year&&f.off.stage==='stove'? f.off : null;
  const head=`<h3>🆓 FA 시장 <span class="tag">${o?`스토브리그 ${o.week+1}/${o.weeks.length}주차 · `:''}외부 FA 영입 ${faOutCount(USER)}/${FA_OUT_MAX} · 경쟁균형세 ${pay}/${cap}억</span></h3>`;
  const gauge=`<div class="progress" style="margin:4px 0 10px"><i style="width:${Math.min(100,pay/cap*100)}%;background:${pay>cap?'var(--bad)':pay>cap*0.9?'var(--warn)':'var(--good)'}"></i></div>`;
  if(!list.length) return `<div class="card" style="margin-top:14px">${head}${gauge}<div class="hint">지금 시장에 나온 선수가 없습니다. FA 공시는 한국시리즈가 끝난 뒤에 나옵니다.</div></div>`;
  const rows=list.map(({x,i})=>{ const p=x.p, st=faStatus(x);
    const mine= st.mine? `<span class="chip ${st.lead?'good':'warn'}">${st.lead?'우리 제안 선두':'경쟁 제안 우위'}</span>` : '';
    return `<tr><td class="name"><a href="javascript:void(0)" onclick="FM.faOffer(${i})">${esc(p.n)}</a>${x.grade?` <span class="pill pos">${x.grade}</span>`:p.f?` <span class="pill pos">${fxLabel(p)}</span>`:''}</td><td><span class="pill pos">${p.pos||p.role}</span></td><td>${p.age}</td>
      <td><span class="ovr ${ovrClass(K.ovr(p))}">${K.ovr(p)}</span></td><td>${x.from||'-'}</td><td>${x.yrs}년 ${eok(x.ask*x.yrs)}억</td><td>${st.n}곳 ${mine}</td>
      <td>${x.blockY!=null&&x.blockY>=state.year? `<span class="muted" title="웨이버 공시 후 클레임이 없던 선수는 그해 계약할 수 없습니다">${x.blockY+1}년부터</span>` : `<button class="btn btn-sm" onclick="FM.faOffer(${i})">${st.mine?'제안 수정':'제안'}</button>`}</td></tr>`; }).join('');
  return `<div class="card" style="margin-top:14px">${head}${gauge}
    <div class="sq-table" style="display:block"><table><thead><tr><th class="name">선수</th><th>POS</th><th>나이</th><th>OVR</th><th>원소속</th><th>요구</th><th>관심 구단</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="hint" style="margin-top:8px">등급 보상: A = 직전 연봉 200% + 보호선수 20인 외 1명 (또는 300%) · B = 100% + 25인 외 1명 (또는 200%) · C = 150%. 재자격 FA는 두 번째 B등급, 세 번째부터 C등급. 계약금은 총액의 ${Math.round(FA_BONUS_SHARE*100)}%를 바로 지급합니다.</p></div>`; }

// ---- compensation ----
// who a club may lose: no foreigners, no FA signed this winter, no rookie of this year's draft
function compPool(t){ return allPlayers(t).concat(farmOf(t)).filter(p=>!p.f&&p.faY!==state.year&&!(p.rookie&&(p.dy===state.year||p.dy===state.year+1||p.newRookie))); }
function compProtectAuto(t,n){ return compPool(t).sort((a,b)=>tradeValue(b,t).v-tradeValue(a,t).v).slice(0,n).map(p=>p.n); }
function compBestUnprotected(t,prot,forT){ return compPool(t).filter(p=>prot.indexOf(p.n)<0).sort((a,b)=>tradeValue(b,forT).v-tradeValue(a,forT).v)[0]||null; }
// keep the 1군 legal after a player leaves: refill from the farm
function fillMinimum(t){ const r=K.ROSTERS[t], best=f=>farmOf(t).filter(f).filter(p=>!K.isInjured(p)&&!(p.f&&!fxEntryRoom(t,p))).sort((a,b)=>K.ovr(b)-K.ovr(a))[0];
  let guard=0;
  while(guard++<30){ const sp=r.pitchers.filter(p=>p.role==='SP').length;
    const need= r.batters.length<MIN_1B? best(p=>p.type==='B') : r.pitchers.length<MIN_1P? best(p=>p.type==='P') : sp<5? best(p=>p.type==='P'&&p.role==='SP') : null;
    if(!need) break; doPromote(t,need); }
  if(state.cfgs&&state.cfgs[t]) repairCfg(t); }
function compMove(p,from,to){ const r=K.ROSTERS[from]; r.batters=r.batters.filter(x=>x!==p); r.pitchers=r.pitchers.filter(x=>x!==p); r.farm=farmOf(from).filter(x=>x!==p);
  p.listed=false; p.bench=0; joinClub(to,p); fillMinimum(from); }
function compPay(payer,payee,amt){ const f=fm(); if(payer===USER){ f.fin.balance-=amt; f.fin.exp+=amt; } if(payee===USER){ f.fin.balance+=amt; f.fin.rev+=amt; } }
function faCompensate(x,t){ const f=fm(), from=x.from, g=FA_GR[x.grade]||FA_GR.C, prev=x.prevSal||0, n=x.p.n;
  if(!g.prot){ const amt=eok(prev*g.cash); compPay(t,from,amt);
    feedPush({year:state.year, kind:'fa', title:`💰 ${n} 이적 보상: ${from}에 ${amt}억`, body:`C등급이라 보상선수 없이 직전 연봉의 150%를 지급합니다.`});
    if(from===USER||t===USER) send('단장','💰',`${n} 이적 보상금 ${amt}억`, from===USER? `${K.ROSTERS[t].name}에서 보상금 ${amt}억 원이 들어왔습니다.` : `${K.ROSTERS[from].name}에 보상금 ${amt}억 원을 지급했습니다.`, []);
    return; }
  f.comps=f.comps||[]; const c={from, to:t, n, grade:x.grade, prev, year:state.year, done:false};
  f.comps.push(c);
  if(t===USER) send('단장','🛡',`보호선수 명단 제출 — ${n} 보상`, `${n}(${FA_GR_LABEL[x.grade]})을 영입해 ${K.ROSTERS[from].name}에 보상해야 합니다.\n보호선수 ${g.prot}명을 정하면 ${from}이 명단 밖에서 1명을 고르거나 연봉 ${Math.round(g.cash*100)}%를 받습니다. 이번 주가 끝나면 단장이 정한 명단으로 제출됩니다.`, [{label:'보호선수 명단 정하기', fn:'compProtect', arg:{n}}]);
  else if(from===USER) send('단장','🎯',`보상선수 지명 — ${n}`, `${n}이(가) ${K.ROSTERS[t].name}로 떠났습니다. ${t}의 보호선수 ${g.prot}인 명단 밖에서 1명과 연봉 ${Math.round(g.pay*100)}%를 받거나, 연봉 ${Math.round(g.cash*100)}% (${eok(prev*g.cash)}억)만 받을 수 있습니다. 이번 주가 끝나면 스카우트 팀이 가장 좋은 선수를 지명합니다.`, [{label:'보상선수 고르기', fn:'compPick', arg:{n}}]);
  else compResolve(c); }
// resolve a pending compensation: prot = the signing club's protected names, pick = a name or null for cash
function compResolve(c,prot,pick){ if(c.done) return; c.done=true; const g=FA_GR[c.grade];
  prot=prot||c.prot||compProtectAuto(c.to,g.prot);
  let p=null;
  if(pick===undefined){ const best=compBestUnprotected(c.to,prot,c.from); p= best&&K.ovr(best)>=62? best : null; }
  else if(pick) p=compPool(c.to).find(x=>x.n===pick&&prot.indexOf(x.n)<0)||null;
  const amt=eok(c.prev*(p?g.pay:g.cash)); compPay(c.to,c.from,amt);
  if(p) compMove(p,c.to,c.from);
  const txt= p? `${c.from}은(는) ${c.n}의 보상선수로 ${p.n}(${posFull(p.pos||p.role)}, ${p.age}세, OVR ${K.ovr(p)})과 보상금 ${amt}억을 받았습니다.` : `${c.from}은(는) 보상선수 대신 보상금 ${amt}억을 택했습니다.`;
  feedPush({year:state.year, kind:'fa', title:`🎯 ${c.n} 보상${p?`선수 ${p.n}`:'금'} — ${c.from}`, body:txt});
  if(c.from===USER||c.to===USER) send('단장','🎯',`${c.n} 보상 결과`, txt, []);
  return txt; }
function compAuto(all){ (fm().comps||[]).forEach(c=>{ if(!c.done&&(all||c.ticks>=1)) compResolve(c); else if(!c.done) c.ticks=(c.ticks||0)+1; }); }
function compFind(n){ return (fm().comps||[]).find(c=>!c.done&&c.n===n); }
function compProtectModal(n){ const c=compFind(n); if(!c){ notify('이미 처리된 보상입니다.'); return; } const g=FA_GR[c.grade];
  c.prot=c.prot||compProtectAuto(USER,g.prot); const pool=compPool(USER).sort((a,b)=>K.ovr(b)-K.ovr(a));
  modal(`<span class="closeX" onclick="App.closeModal()">×</span><h2>🛡 보호선수 ${c.prot.length}/${g.prot}</h2>
    <p class="hint">${c.n} 영입 보상입니다. 체크한 선수는 ${c.from}이 데려갈 수 없습니다. 외국인, 올해 FA 영입 선수, 신인은 자동으로 빠집니다.</p>
    <div class="fld-opts">${pool.map(p=>{ const on=c.prot.indexOf(p.n)>=0; return `<button class="fld-opt${on?' on':''}" onclick="FM.compToggle('${q(n)}','${q(p.n)}')"><span><b>${on?'🛡 ':''}${esc(p.n)}</b> <small class="muted">${p.pos||p.role} · ${p.age}세${isFarm(USER,p)?' · 2군':''}</small></span><span class="fld-opt-r">OVR ${K.ovr(p)}</span></button>`; }).join('')}</div>
    <button class="btn primary" style="margin-top:10px;width:100%" onclick="FM.compSubmit('${q(n)}')">이 명단으로 제출</button>`); }
function compToggle(n,pn){ const c=compFind(n); if(!c) return; const g=FA_GR[c.grade], i=c.prot.indexOf(pn);
  if(i>=0) c.prot.splice(i,1); else if(c.prot.length<g.prot) c.prot.push(pn); else { notify(`보호선수는 ${g.prot}명까지입니다. 먼저 한 명을 빼세요.`); return; }
  compProtectModal(n); }
function compSubmit(n){ const c=compFind(n); if(!c) return; closeModal(); const txt=compResolve(c,c.prot); markDone(n,'compProtect',txt); render(); }
function compPickModal(n){ const c=compFind(n); if(!c){ notify('이미 처리된 보상입니다.'); return; } const g=FA_GR[c.grade], prot=compProtectAuto(c.to,g.prot);
  const pool=compPool(c.to).filter(p=>prot.indexOf(p.n)<0).sort((a,b)=>K.ovr(b)-K.ovr(a)).slice(0,25);
  modal(`<span class="closeX" onclick="App.closeModal()">×</span><h2>🎯 ${esc(c.to)} 보호선수 외 명단</h2>
    <p class="hint">${c.n} 보상입니다. 1명을 고르면 직전 연봉 ${Math.round(g.pay*100)}% (${eok(c.prev*g.pay)}억)도 함께 받습니다.</p>
    <button class="btn" style="width:100%;margin-bottom:8px" onclick="FM.compTake('${q(n)}','')">선수 없이 보상금 ${eok(c.prev*g.cash)}억 받기</button>
    <div class="fld-opts">${pool.map(p=>`<button class="fld-opt" onclick="FM.compTake('${q(n)}','${q(p.n)}')"><span><b>${esc(p.n)}</b> <small class="muted">${p.pos||p.role} · ${p.age}세 · 잠재력 ${starText(p)}</small></span><span class="fld-opt-r">OVR ${K.ovr(p)}</span></button>`).join('')}</div>`); }
function compTake(n,pn){ const c=compFind(n); if(!c) return; closeModal(); const txt=compResolve(c,compProtectAuto(c.to,FA_GR[c.grade].prot),pn||null); markDone(n,'compPick',txt); render(); }
function markDone(n,fn,txt){ fm().inbox.forEach(m=>{ if(!m.done&&m.actions.some(a=>a.fn===fn&&a.arg&&a.arg.n===n)){ m.done=true; m.read=true; m.result=txt; } }); }

// ---- competitive-balance tax, user club only, charged after the season ----
function capTax(){ const f=fm(), cap=capOf(state.year), pay=capPay(USER);
  if(pay<=cap){ f.capOver=0; return; }
  f.capOver=(f.capOver||0)+1; const rate=f.capOver>=3?1.5:f.capOver===2?1:0.5, tax=eok((pay-cap)*rate);
  f.fin.balance-=tax; f.fin.exp+=tax;
  send('구단 재무팀','🧾',`경쟁균형세 ${tax}억 납부`, `${state.year} 시즌 연봉 총액(상위 40명, 외국인 제외) ${pay}억 원이 상한 ${cap}억 원을 넘었습니다.\n${f.capOver}회 연속 초과라 초과분의 ${Math.round(rate*100)}%를 냅니다.`, []); }

// players who leave the league (unclaimed imports, ended short-term deals): kept so the history stays explainable
function depart(p,why){ const f=fm(); f.departed=(f.departed||[]).concat({n:p.n,year:state.year,why}).slice(-300); }
// ---- waivers ----
function waiverRelease(t,p){ const f=fm(), r=K.ROSTERS[t];
  r.batters=r.batters.filter(x=>x!==p); r.pitchers=r.pitchers.filter(x=>x!==p); r.farm=farmOf(t).filter(x=>x!==p);
  f.waivers=f.waivers||[]; f.waivers.push({p, from:t, ug:userGamesAll(), phase:state.phase, wk:f.off&&f.off.year===state.year?f.off.week:0});
  if(t!==USER) fillMinimum(t); }
function waiverRemaining(p){ const reg=state.phase==='regular', frac= reg? Math.max(0,(144-userGamesPlayed())/144) : state.phase==='postseason'? 0 : 1;
  return eok((p.sal||0)*(frac+Math.max(0,(p.yrs||1)-1))); }
function waiverClaimer(w){ const order=standings().slice().reverse().map(x=>x.t).filter(t=>t!==w.from&&t!==USER), p=w.p;
  return order.find(t=>{ if(p.f&&!fxRoom(t,p)) return false; if(payroll(t)+(p.sal||0)>clubTradeBudget(t)*1.2) return false;
    return faGain(t,p)>=3 && K.ovr(p)>=60; })||null; }
function waiverTick(force){ const f=fm(); if(!(f.waivers||[]).length) return;
  const ug=userGamesAll(), wk=f.off&&f.off.year===state.year?f.off.week:0;
  f.waivers=f.waivers.filter(w=>{
    const due= force || (w.phase==='regular'||w.phase==='postseason'? ug-w.ug>=WAIVER_GAMES : state.phase!=='stove'||wk>w.wk);
    if(!due) return true;
    const t=waiverClaimer(w), p=w.p;
    if(t){ ensurePlayer(p); joinClub(t,p); if(state.cfgs[t]) repairCfg(t);
      feedPush({year:state.year, kind:'waiver', title:`📋 웨이버 클레임: ${p.n} → ${K.ROSTERS[t].name}`, body:`${w.from}에서 웨이버 공시된 ${p.n}(${posFull(p.pos||p.role)}, OVR ${K.ovr(p)})을(를) ${K.ROSTERS[t].name}이(가) 데려갑니다. 잔여 계약도 함께 넘어갑니다.`});
      if(w.from===USER) send('단장','📋',`${p.n} 웨이버 클레임`, `${K.ROSTERS[t].name}이(가) ${p.n}을(를) 데려갔습니다. 잔여 연봉 부담이 없습니다.`, []);
      return false; }
    const owe= w.from===USER? waiverRemaining(p) : 0;
    if(w.from===USER){ f.fin.balance-=owe; f.fin.exp+=owe; }
    if(p.f){ depart(p,'waiver unclaimed import'); if(w.from===USER) send('단장','📋',`${p.n} 웨이버 기간 종료`, `아무 구단도 ${p.n}을(를) 데려가지 않았습니다. 잔여 연봉 ${owe}억 원을 지급했고, 선수는 리그를 떠납니다.`, []); return false; }
    f.fa=f.fa||[]; f.fa.push({p, from:null, kind:'free', prevSal:p.sal||0, ask:eok(Math.max(0.3,salaryFor(p)*0.8)), yrs:1, bids:{}, blockY:state.year});
    if(w.from===USER) send('단장','📋',`${p.n} 자유계약 공시`, `웨이버 기간에 클레임이 없어 ${p.n}은(는) 자유계약 선수가 됐습니다. 잔여 연봉 ${owe}억 원을 지급했습니다. 규약에 따라 올해는 어느 구단과도 계약할 수 없습니다.`, []);
    return false; }); }

// ---- foreign players: injury replacements and AI clubs changing a struggling import ----
function fxTempCheck(){ const f=fm(); allPlayers(USER).concat(farmOf(USER)).filter(p=>p.fxHold&&!K.isInjured(p)&&!p.fxAsked).forEach(o=>{
  const t=allPlayers(USER).concat(farmOf(USER)).find(x=>x.tempFor===o.n); o.fxAsked=true; if(!t){ o.fxHold=false; return; }
  send('스카우트 팀장','🌏',`${o.n} 부상 회복 — 대체 선수 ${t.n} 거취`, `${o.n}이(가) 부상에서 돌아왔습니다. 부상 대체로 데려온 ${t.n}을(를) 어떻게 할까요?\n정식 계약으로 남기면 ${o.n}은(는) 웨이버 공시되고 교체 횟수 1회가 차감됩니다.`,
    [{label:`${t.n} 계약 종료, ${o.n} 복귀`, fn:'tempEnd', arg:{n:t.n,o:o.n}},{label:`${t.n} 정식 계약 (${o.n} 웨이버)`, fn:'tempKeep', arg:{n:t.n,o:o.n}}]); }); }
function tempEnd(tn,on){ const t=findPlayer(USER,tn), o=findPlayer(USER,on); if(!t||!o) return '선수 구성이 바뀌어 적용할 수 없습니다.';
  const r=K.ROSTERS[USER]; r.batters=r.batters.filter(x=>x!==t); r.pitchers=r.pitchers.filter(x=>x!==t); r.farm=farmOf(USER).filter(x=>x!==t);
  o.fxHold=false; delete o.fxAsked; depart(t,'temporary import contract ended'); fillMinimum(USER); return `${tn}과(와)의 단기 계약이 끝났습니다. ${on}은(는) 2군에서 컨디션을 올린 뒤 1군에 등록할 수 있습니다.`; }
function tempKeep(tn,on){ const t=findPlayer(USER,tn), o=findPlayer(USER,on); if(!t||!o) return '선수 구성이 바뀌어 적용할 수 없습니다.';
  if(fxSwapsLeft()<=0) return '이번 시즌 교체 횟수가 남아 있지 않습니다.';
  const f=fm(); f.fxSwaps={year:state.year, n:(f.fxSwaps&&f.fxSwaps.year===state.year?f.fxSwaps.n:0)+1};
  delete t.tempFor; o.fxHold=false; waiverRelease(USER,o); fillMinimum(USER);
  return `${tn}과(와) 정식 계약했습니다. ${on}은(는) 웨이버 공시됐습니다.`; }
function aiForeignTick(){ const f=fm(), ug=userGamesPlayed(); if(state.phase!=='regular'||ug<30||ug>=108||ug-(f.aiFxAt||0)<15) return; f.aiFxAt=ug;
  const used=allNames();
  K.TEAM_IDS.filter(t=>t!==USER).forEach(t=>{ const s=state.season[t], sw=f.aiFxSw&&f.aiFxSw.year===state.year? f.aiFxSw : (f.aiFxSw={year:state.year});
    if((sw[t]||0)>=FX_SWAPS) return;
    const bad=allPlayers(t).filter(p=>p.f).find(p=>{ if(p.type==='B'){ const b=s.bat[p.n]; if(!b||b.PA<120) return false; const m=batMetrics(b); return m.obp+m.slg<0.66; }
      const q=s.pit[p.n]; return q&&q.OUT>=120&&q.ER*27/q.OUT>5.8; });
    if(!bad||Math.random()<0.5) return;
    const nw=makeForeign(bad.type, used, 0, bad.aq); if(bad.type==='P'&&bad.role==='SP') nw.role='SP';
    faInit(nw); waiverRelease(t,bad); joinClub(t,nw); fillMinimum(t); sw[t]=(sw[t]||0)+1;
    feedPush({year:state.year, kind:'foreign', title:`🌏 ${K.ROSTERS[t].name}, ${bad.n} 웨이버 공시 → ${nw.n} 영입`, body:`${bad.n}이(가) 부진 끝에 팀을 떠나고 새 ${fxLabel(nw)} ${nw.n}(${posFull(nw.pos||nw.role)}, OVR ${K.ovr(nw)})이(가) 합류합니다. 올 시즌 ${sw[t]}번째 교체입니다.`}); }); }
// every user game: waivers, injury replacements, AI imports
function marketDaily(){ waiverTick(); fxTempCheck(); aiForeignTick(); }

Object.assign(ACTIONS,{
  compProtect(m,a){ setTimeout(()=>compProtectModal(a.n),0); return null; },
  compPick(m,a){ setTimeout(()=>compPickModal(a.n),0); return null; },
  tempEnd(m,a){ return tempEnd(a.n,a.o); },
  tempKeep(m,a){ return tempKeep(a.n,a.o); },
});
