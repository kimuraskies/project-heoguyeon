// ---------- trades (shared by the trade tab and inbox offers) ----------
// Values are discounted contract surplus in 억원, not additive OVR points.
const WAR_PRICE=3.3, TRADE_SPOT_COST=2, TRADE_MARGIN=0.05;
function teamMode(team){
  const s=state.season&&state.season[team];
  if(state.phase==='regular' && s && s.W+s.L+s.T>=20){
    const rank=standings().findIndex(x=>x.t===team)+1;
    return rank<=4?'contend':rank>=7?'rebuild':'middle';
  }
  const ex=team===USER&&fm().board?fm().board.expect:expectationFor(strengthRank(team));
  return ex.kind==='pct'?'rebuild':ex.target<=4?'contend':'middle';
}
function tradeContext(team){
  const d=K.defaultLineup(team), ps=allPlayers(team), byName=n=>ps.find(p=>p.n===n);
  const weak=names=>names.map(byName).filter(Boolean).sort((a,b)=>K.ovr(a)-K.ovr(b))[0];
  const bat=weak(d.lineup), sp=weak(d.rotation), rp=weak(d.bullpen.concat(d.closer||[]));
  const spots=[bat&&{pos:d.positions[d.lineup.indexOf(bat.n)],p:bat},sp&&{role:'SP',p:sp},rp&&{role:'RP',p:rp}].filter(Boolean);
  return {mode:teamMode(team),spots,ps};
}
function tradeNeed(p,c){
  let best=0;
  for(const s of c.spots){
    const fit=s.pos?p.type==='B'&&K.posFit(p,s.pos)<10:p.type==='P'&&(p.role==='SP')===(s.role==='SP');
    if(!fit || c.ps.includes(p)) continue;
    // A ready reserve reduces urgency; evaluate both the default starter and depth.
    const depth=c.ps.filter(x=>x!==s.p&&!K.isInjured(x)&&(s.pos?x.type==='B'&&K.posFit(x,s.pos)<10:x.type==='P'&&(x.role==='SP')===(s.role==='SP')));
    const baseline=Math.max(K.ovr(s.p),depth.length?Math.min(K.ovr(s.p)+2,Math.max(...depth.map(K.ovr))-3):55);
    best=Math.max(best,Math.min(8,Math.max(0,K.ovr(p)-baseline)*0.7));
  }
  return best*(c.mode==='contend'?1.3:c.mode==='rebuild'?0.7:1);
}
function projectedWAR(p,ovr){
  const base=3*Math.pow(Math.max(0,ovr-58)/20,1.9);
  return Math.max(0,p.type==='P'?base*(p.role==='SP'?1:0.38):base+posValue(p)/20+((p.fld||65)-65)*0.015);
}
function tradeValue(p,team,context){
  const c=context||tradeContext(team), mode=c.mode, o=K.ovr(p), pot=Math.max(o,p.pot||o), age=p.age||27;
  const years=Math.max(1,Math.floor(p.yrs||1)), salary=p.sal==null?salaryFor(p):p.sal;
  let surplus=0, rating=o; const war=[];
  for(let i=0;i<=years;i++){
    if(i){ const a=age+i; if(a<=27) rating+=Math.min(2.5,Math.max(0,pot-rating)/(28-a));
      else if(a>30) rating-=a<=33?1.2:2; }
    const w=projectedWAR(p,rating); war.push(w);
    const control=i===years?0.5:1, weight=mode==='contend'?(i===0?1.3:0.8):1;
    const youth=mode==='rebuild'&&age+i<=27?1.2:1;
    surplus+=(w*WAR_PRICE*youth-salary*(mode==='rebuild'?1.3:1))*control*weight/Math.pow(1.1,i);
  }
  const prospect=age<=24?(pot-o)*(25-age)/6*(mode==='rebuild'?1.5:mode==='contend'?0.8:1):0;
  const need=tradeNeed(p,c);
  return {v:surplus+prospect+need,war,parts:{surplus,prospect,need,mode}};
}
function packageValue(list,team,context){
  const c=context||tradeContext(team), values=list.map(p=>tradeValue(p,team,c).v).sort((a,b)=>b-a);
  // Never discount liabilities: adding a bad contract must cost its full value.
  return values.reduce((v,x,i)=>v+x*(x<0?1:i===0?1:i===1?0.55:0.25),0)-Math.max(0,list.length-1)*TRADE_SPOT_COST;
}
function clubTradeBudget(team){
  if(team===USER) return fm().fin.budget;
  const f=fm(); if(!f.tradeBudgets||f.tradeBudgets.y!==state.year) f.tradeBudgets={y:state.year,clubs:{}};
  if(f.tradeBudgets.clubs[team]==null) f.tradeBudgets.clubs[team]=Math.round(payroll(team)*1.06+4);
  return f.tradeBudgets.clubs[team];
}
function clubCanTrade(team,give,get){
  const sum=ps=>ps.reduce((v,p)=>v+(p.sal||0),0);
  return payroll(team)-sum(give)+sum(get)<=clubTradeBudget(team)*1.2+1e-8;
}
function tradeVerdict(team,give,get){
  const c=tradeContext(team), have=packageValue(give.filter(Boolean),team,c), value=packageValue(get.filter(Boolean),team,c);
  const stars=c.ps.slice().sort((a,b)=>K.ovr(b)-K.ovr(a)).slice(0,3);
  const protectedStar=c.mode==='contend'&&tradeWindow().open&&get.some(p=>stars.includes(p));
  const margin=protectedStar?0.4:TRADE_MARGIN;
  // Signed surplus: an overpay must improve the seller's return even below zero.
  const need=value+Math.abs(value)*margin;
  let reason='서로 필요한 전력을 보강할 수 있는 제안입니다.';
  const invalid=!give.length||!get.length||give.some(p=>!p)||get.some(p=>!p)||team===USER||new Set(give).size!==give.length||new Set(get).size!==get.length;
  const legal=invalid?'양쪽에서 서로 다른 선수를 선택해 주세요.':tradeCheck(team,give.map(p=>p.n),get.map(p=>p.n));
  const budget=invalid?null:tradeBudget(give.map(p=>p.n),team,get.map(p=>p.n));
  const ok=!legal&&budget.ok&&clubCanTrade(team,get,give)&&have>=need;
  if(legal) reason=legal;
  else if(!budget.ok) reason='우리 구단의 연봉 예산을 초과하는 제안입니다.';
  else if(!clubCanTrade(team,get,give)) reason='상대 구단의 연봉 예산을 초과하는 제안입니다.';
  else if(have<need) reason=protectedStar?'우승 경쟁의 핵심 선수라 더 큰 보상이 필요합니다.':c.spots.some(s=>s.role==='SP')&&!give.some(p=>p.type==='P'&&p.role==='SP')?'선발 보강도 고려할 만큼 충분한 대가가 필요합니다.':'받을 선수들의 계약 가치가 부족합니다.';
  return {ok,need,have,margin,reason};
}
function tradeLog(){ const f=fm(); if(!Array.isArray(f.tradeLog)) f.tradeLog=[]; return f.tradeLog; }
function tradeDay(){
  if(state.phase==='stove') return fm().off?fm().off.week:0;
  const played=state.schedule.filter(g=>g.played&&(g.home===USER||g.away===USER));
  return played.length?played[played.length-1].day:0;
}
function tradeSnapshot(p){ return {n:p.n,type:p.type,...(p.type==='B'?{pos:p.pos}:{role:p.role}),age:p.age,ovr:K.ovr(p),pot:p.pot||K.ovr(p),sal:p.sal||0,yrs:p.yrs==null?1:p.yrs}; }
function executeClubTrade(a,b,aGive,bGive,kind){
  const log=tradeLog(), ca=tradeContext(a), cb=tradeContext(b);
  const entry={id:log.reduce((n,x)=>Math.max(n,Number(x.id)||0),0)+1,y:state.year,day:tradeDay(),phase:state.phase,a,b,
    aGive:aGive.map(tradeSnapshot),bGive:bGive.map(tradeSnapshot),
    vA:packageValue(bGive,a,ca)-packageValue(aGive,a,ca),vB:packageValue(aGive,b,cb)-packageValue(bGive,b,cb),kind};
  function move(src,dst,players){ players.forEach(p=>{ const key=p.type==='B'?'batters':'pitchers', r=K.ROSTERS[src][key]; r.splice(r.indexOf(p),1);
    p.listed=false; p.bench=0; if(dst===USER) p.newG=NEW_GAMES; K.ROSTERS[dst][key].push(p); }); }
  move(a,b,aGive); move(b,a,bGive);
  if(a===USER||b===USER) fm().promises=fm().promises.filter(pr=>!!findPlayer(USER,pr.n));
  [a,b].forEach(t=>{ const d=K.defaultLineup(t); state.cfgs[t]=Object.assign({},state.cfgs[t],{teamId:t,lineup:d.lineup.slice(),positions:d.positions.slice(),rotation:d.rotation.slice(),bullpen:d.bullpen.slice(),closer:d.closer}); });
  log.push(entry); return entry;
}
function aiTradeTick(){
  if(!['regular','stove'].includes(state.phase)||!tradeWindow().open) return null;
  const f=fm(), day=tradeDay(), key=state.year+'|'+state.phase+'|'+day;
  if(f.lastAiTradeTick===key) return null;
  f.lastAiTradeTick=key;
  const past=tradeLog().filter(x=>x.y===state.year&&x.kind==='ai');
  if(past.length>=10) return null;
  const rush=state.phase==='regular'&&tradeWindow().daysLeft<=14;
  if(Math.random()>(state.phase==='stove'?0.2:rush?0.2:0.065)) return null;
  const teams=K.TEAM_IDS.filter(t=>t!==USER), contexts=Object.fromEntries(teams.map(t=>[t,tradeContext(t)]));
  const moved=new Set(past.flatMap(x=>x.aGive.concat(x.bGive).map(p=>p.n))), deals=[];
  for(const buyer of teams.filter(t=>contexts[t].mode==='contend')){
    const bc=contexts[buyer], prospects=bc.ps.filter(p=>p.age<=27&&!p.f&&!K.isInjured(p)&&!moved.has(p.n));
    for(const seller of teams.filter(t=>contexts[t].mode==='rebuild')){
      const sc=contexts[seller];
      for(const vet of sc.ps.filter(p=>!p.f&&!K.isInjured(p)&&!moved.has(p.n)&&tradeNeed(p,bc)>0)){
        for(const young of prospects){
          if(young.type!==vet.type||(young.type==='P'&&(young.role==='SP')!==(vet.role==='SP'))) continue;
          const gainB=packageValue([vet],buyer,bc)-packageValue([young],buyer,bc), gainS=packageValue([young],seller,sc)-packageValue([vet],seller,sc);
          if(gainB<=0.1||gainS<=0.1||!clubCanTrade(buyer,[young],[vet])||!clubCanTrade(seller,[vet],[young])) continue;
          if(tradeCheck(seller,[young.n],[vet.n],buyer)) continue;
          // A contender also protects its own three best players when buying.
          const top=bc.ps.slice().sort((a,b)=>K.ovr(b)-K.ovr(a)).slice(0,3);
          if(top.includes(young)&&gainB<Math.abs(packageValue([young],buyer,bc))*0.4) continue;
          deals.push({buyer,seller,young,vet,score:Math.min(gainB,gainS)});
        }
      }
    }
  }
  deals.sort((a,b)=>b.score-a.score); const d=deals[Math.floor(Math.random()*Math.min(5,deals.length))];
  return d?executeClubTrade(d.buyer,d.seller,[d.young],[d.vet],'ai'):null;
}
function findTradeOffer(team){
  const c=tradeContext(team), mine=allPlayers(USER).filter(p=>!K.isInjured(p)&&(c.mode==='rebuild'?p.age<=24&&(p.pot||0)>K.ovr(p):tradeNeed(p,c)>0));
  mine.sort((a,b)=>Number(!!b.listed)-Number(!!a.listed));
  for(const want of mine){
    const v=tradeValue(want,team,c).v;
    const gives=c.ps.filter(p=>!K.isInjured(p)&&p.type===want.type&&(p.type==='B'||(p.role==='SP')===(want.role==='SP')))
      .map(p=>({p,v:tradeValue(p,team,c).v})).filter(x=>v-x.v>=0&&v-x.v<=Math.max(2,Math.abs(v)*0.2)).sort((a,b)=>b.v-a.v);
    for(const {p:give} of gives) if(tradeVerdict(team,[want],[give]).ok) return {team,want,give};
  }
  return null;
}
function tradeBudget(outNames, team, inNames){
  ensure();
  const out=outNames.reduce((a,n)=>{ const p=findPlayer(USER,n); return a+(p?p.sal:0); },0);
  const inn=inNames.reduce((a,n)=>{ const p=findPlayer(team,n); return a+(p?p.sal:0); },0);
  const after=payroll(USER)-out+inn, limit=fm().fin.budget*1.1;
  return {ok: after<=limit || inn<=out, after:Math.round(after*10)/10, limit:Math.round(limit*10)/10,
    msg:`연봉 총액이 예산 한도를 넘습니다 (${after.toFixed(1)}억 > ${limit.toFixed(1)}억). 이사회가 승인하지 않습니다.`};
}
// can both clubs still field a legal 1군 after the swap? Checked when the deal is offered and
// again when it runs, since a player may have been sent down or released in between.
function tradeCheck(team, fromUser, fromThem, source=USER){
  const w=tradeWindow(); if(!w.open) return w.msg;
  if(!fromUser.length || !fromThem.length) return '양쪽 모두 선수를 한 명 이상 골라야 합니다.';
  const on=(t,n)=>allPlayers(t).find(x=>x.n===n);
  const gone=fromUser.filter(n=>!on(source,n)).concat(fromThem.filter(n=>!on(team,n)));
  if(gone.length) return `${gone.join(', ')}은(는) 지금 1군에 없어 트레이드할 수 없습니다.`;
  const outP=fromUser.map(n=>on(source,n)), inP=fromThem.map(n=>on(team,n));
  return entryProblem(source,outP,inP,'우리 팀 ') || entryProblem(team,inP,outP,`${K.ROSTERS[team].name} `);
}
function doTrade(team, fromUser, fromThem, kind='user'){
  const why=tradeCheck(team, fromUser, fromThem); if(why) return why;
  const give=fromUser.map(n=>findPlayer(USER,n)), get=fromThem.map(n=>findPlayer(team,n));
  const verdict=tradeVerdict(team,give,get); if(!verdict.ok) return verdict.reason;
  executeClubTrade(USER,team,give,get,kind==='offer'?'offer':'user');
  return '';
}

// ---------- coach report: what is costing games, and two things to change ----------
function leagueLines(){
  const out={};
  K.TEAM_IDS.forEach(t=>{
    const s=state.season[t]; let AB=0,H=0,BB=0,HBP=0,TB=0,ER=0,OUT=0,spER=0,spOUT=0,rpER=0,rpOUT=0;
    for(const n in s.bat){ const x=s.bat[n]; AB+=x.AB; H+=x.H; BB+=x.BB; HBP+=x.HBP; TB+=x.H+x._2B+2*x._3B+3*x.HR; }
    for(const n in s.pit){ const x=s.pit[n], p=findPlayer(t,n), sp=p&&p.role==='SP'; ER+=x.ER; OUT+=x.OUT; if(sp){spER+=x.ER;spOUT+=x.OUT;} else {rpER+=x.ER;rpOUT+=x.OUT;} }
    const gp=s.W+s.L+s.T||1;
    out[t]={rpg:s.RF/gp, rapg:s.RA/gp, obp:(H+BB+HBP)/Math.max(1,AB+BB+HBP), slg:TB/Math.max(1,AB),
      spEra:spOUT?spER*27/spOUT:0, rpEra:rpOUT?rpER*27/rpOUT:0, def:K.teamDefense(t,state.cfgs[t].lineup,state.cfgs[t].positions||K.autoPositions(t,state.cfgs[t].lineup))};
  });
  return out;
}
function rankIn(lines,key,asc){ const arr=K.TEAM_IDS.slice().sort((a,b)=>asc? lines[a][key]-lines[b][key] : lines[b][key]-lines[a][key]); return arr.indexOf(USER)+1; }
function coachReport(ug){
  const f=fm(); if(ug<10 || ug-(f.lastReport||0)<10 || state.phase!=='regular') return;
  f.lastReport=ug;
  const L=leagueLines(), me=L[USER], avg=k=>K.TEAM_IDS.reduce((a,t)=>a+L[t][k],0)/K.TEAM_IDS.length;
  const c=state.cfgs[USER], s=state.season[USER];
  const pos=c.positions||K.autoPositions(USER,c.lineup);
  const lines=[
    `• 득점 ${me.rpg.toFixed(2)}점/경기 (리그 ${rankIn(L,'rpg')}위, 평균 ${avg('rpg').toFixed(2)})`,
    `• 실점 ${me.rapg.toFixed(2)}점/경기 (리그 ${rankIn(L,'rapg',true)}위, 평균 ${avg('rapg').toFixed(2)})`,
    `• 출루율 ${fmtAvg(me.obp)} (${rankIn(L,'obp')}위) · 장타율 ${fmtAvg(me.slg)} (${rankIn(L,'slg')}위)`,
    `• 선발 평균자책 ${me.spEra.toFixed(2)} (${rankIn(L,'spEra',true)}위) · 불펜 ${me.rpEra.toFixed(2)} (${rankIn(L,'rpEra',true)}위)`,
    `• 팀 수비력 ${me.def.toFixed(1)} (${rankIn(L,'def')}위, 평균 70)`];
  const acts=[], notes=[];
  // weakest regular by OPS, and a fresher bat on the bench who can play his position
  const ops=n=>{ const x=s.bat[n]; if(!x||x.PA<25) return null; return (x.H+x.BB+x.HBP)/Math.max(1,x.AB+x.BB+x.HBP) + (x.H+x._2B+2*x._3B+3*x.HR)/Math.max(1,x.AB); };
  const regs=c.lineup.map((n,i)=>({n,i,o:ops(n)})).filter(x=>x.o!=null).sort((a,b)=>a.o-b.o);
  const weak=regs[0];
  if(weak && weak.o<0.68){
    const spot=pos[weak.i];
    const alt=K.ROSTERS[USER].batters.filter(b=>c.lineup.indexOf(b.n)<0 && !K.isInjured(b) && K.posFit(b,spot)<10)
      .sort((a,b)=>K.batValue(b)-K.batValue(a))[0];
    if(alt && K.batValue(alt)>=K.batValue(findPlayer(USER,weak.n))-3){
      notes.push(`${weak.n}의 OPS가 ${weak.o.toFixed(3)}로 주전 중 가장 낮습니다. ${alt.n}(${alt.pos})에게 ${spot} 자리를 맡겨 보시죠.`);
      acts.push({label:`${weak.n} → ${alt.n} (${spot}) 교체`, fn:'swapLineup', arg:{out:weak.n, in:alt.n}});
    }
  }
  // the rotation's worst ERA, against a spare starter or a long man
  const rot=c.rotation.map(n=>({n,x:state.season[USER].pit[n]})).filter(r=>r.x&&r.x.OUT>=45).map(r=>({n:r.n,era:r.x.ER*27/r.x.OUT}));
  rot.sort((a,b)=>b.era-a.era);
  if(rot[0] && rot[0].era>avg('spEra')+1.2){
    const alt=K.ROSTERS[USER].pitchers.filter(p=>c.rotation.indexOf(p.n)<0 && p.n!==c.closer && !K.isInjured(p) && p.sta>=60)
      .sort((a,b)=>K.ovr(b)-K.ovr(a))[0];
    if(alt){
      notes.push(`선발 ${rot[0].n}의 평균자책이 ${rot[0].era.toFixed(2)}입니다. ${alt.n}(체력 ${attr20(alt.sta)})을 로테이션에 넣는 방안을 건의합니다.`);
      acts.push({label:`로테이션: ${rot[0].n} → ${alt.n}`, fn:'swapRotation', arg:{out:rot[0].n, in:alt.n}});
    }
  }
  const tiredPen=K.ROSTERS[USER].pitchers.filter(p=>p.role!=='SP'&&!K.isInjured(p)&&K.cond(p)<55).map(p=>p.n);
  if(tiredPen.length>=3) notes.push(`불펜 ${tiredPen.join(', ')}이(가) 지쳐 있습니다. 선발이 길게 던질 수 있게 체력 좋은 선발을 우선 기용하세요.`);
  const issues=K.positionIssues(USER,c.lineup,pos);
  if(issues.length) notes.push(`수비 배치 문제: ${issues.join(', ')}`);
  if(!notes.length) notes.push('지금 구성이 잘 돌아가고 있습니다. 컨디션 관리만 신경 써 주십시오.');
  acts.push({label:'지금대로 간다', fn:'ok'});
  send('수석코치','📋',`수석코치 보고 (${ug}경기)`, `감독님, 최근까지의 팀 지표입니다.\n\n${lines.join('\n')}\n\n제안:\n${notes.map(x=>'• '+x).join('\n')}`, acts);
}

// ---------- media: a question after a streak ----------
function maybeMedia(ug){
  const f=fm(); if(ug-(f.lastMedia||-99)<15 || Math.random()>0.2) return;
  const rr=recentRecord(); if(rr.w+rr.l<5) return;
  f.lastMedia=ug;
  const hot=rr.w>=4, cold=rr.l>=4;
  const q = hot? `최근 5경기 ${rr.w}승입니다. 상승세의 비결은 무엇입니까?` : cold? `최근 5경기 ${rr.l}패입니다. 감독님 거취에 대한 이야기도 나옵니다.` : `시즌 ${ug}경기를 치렀습니다. 지금 팀을 평가하신다면?`;
  send('스포츠 기자','🎤','기자회견 질문', `기자: "${q}"\n\n답변에 따라 선수단 사기와 이사회 인상이 달라집니다.`,
    [{label:'"선수들이 잘해주고 있다"', fn:'media', arg:{kind:'players'}},
     {label:'"책임은 감독인 내게 있다"', fn:'media', arg:{kind:'me'}},
     {label:'"더 잘해야 한다, 분발을 요구한다"', fn:'media', arg:{kind:'demand'}}]);
}

// ---------- contracts ----------
// re-signing price starts from what the player earns now, nudged toward what his play is worth
function renewSalary(p){
  const cur=p.sal||salaryFor(p), fair=salaryFor(p);
  const w = p.age>=35? 0.5 : 0.65;
  return Math.max(0.3, Math.round((cur*w + fair*(1-w))*10)/10);
}

// ---------- free agents ----------
// f.fa: [{p, ask, yrs, from}] — players without a club this offseason
function faAsk(p){ return Math.max(0.5, Math.round(Math.max(renewSalary(p), salaryFor(p))*1.1*10)/10); }
function faYears(p){ return p.age>=34? 1 : p.age>=30? 2 : 3; }
function addFA(p, from){ const f=fm(); f.fa=f.fa||[]; delete p.leaving; p.expiring=false; f.fa.push({p, ask:faAsk(p), yrs:faYears(p), from, kind:'free', prevSal:p.sal||0, bids:{}}); }
function signFA(i){
  const f=fm(), x=(f.fa||[])[i]; if(!x) return;
  if(x.p.f && !fxRoom(USER,x.p)){ notify(`${fxLabel(x.p)} 선수 정원(${fxCap(x.p)}명)이 찼습니다.`); return; }
  const limit=f.fin.budget*1.1, after=payroll(USER)+x.ask, bonus=Math.round(x.ask*x.yrs*0.25*10)/10;
  if(after>limit){ notify(`연봉 총액이 한도를 넘습니다 (${after.toFixed(1)}억 > ${limit.toFixed(1)}억). 다른 선수를 정리하거나 예산 범위의 선수를 찾으세요.`); return; }
  const p=x.p;
  ask(`${p.n}(${p.age}세, ${posFull(p.pos||p.role)}, OVR ${K.ovr(p)})과 ${x.yrs}년 연봉 ${x.ask}억 원에 계약합니다.\n계약금 ${bonus}억 원은 구단 잔고에서 나갑니다.`, 'FA 계약', ()=>{
    f.fa.splice(f.fa.indexOf(x),1);
    p.sal=x.ask; p.yrs=x.yrs; p.mor=72; p.cond=100; p.inj=0; p.listed=false; p.bench=0; p.newG=NEW_GAMES;
    const where=joinClub(USER,p);
    f.fin.balance-=bonus; f.fin.exp+=bonus;
    send('단장','✍️',`FA ${p.n} 영입`, `${p.n}과(와) ${x.yrs}년 연봉 ${x.ask}억 원에 계약했습니다. 계약금 ${bonus}억 원.` +
      (where==='2군'? `\n1군 엔트리(${ENTRY_MAX}명)가 가득 차 2군에 등록했습니다.` : ''), []);
    render();
  });
}
// spring camp opens: the market's last round, then leftovers take a one-year deal or leave (fm/04b-fa.js)
function aiSignFAs(){ return faLeftovers(); }

// ---------- foreign players: 3 foreign + 1 Asia quota on the 1군, two replacements a season ----------
const FX_NAMES=['로페즈','마르테','브리토','오도넬','헤이워드','카펜터','레예스','몬테로','갈비스','스탠튼','라미레스','클라크','파울러','밀러','앤더슨','톰슨','로저스','하퍼','크루즈','벨트레','마차도','가르시아','소토','베탄코트','플로레스','에반스','콜','브룩스','그레이','토레스'];
const FX_MAX=4, FX_F=3, FX_AQ=1, FX_SWAPS=2;
const AQ_NAMES=['나카무라','야마다','사토','후지타','린','천','장','오카다','모리','쿡','왓슨','하라'];
// a foreigner out on a long injury with a temporary replacement (p.fxHold) doesn't count against the quota
function foreignOf(t){ return allPlayers(t).concat(farmOf(t)).filter(p=>p.f&&!p.fxHold); }
function fxKind(p){ return p.aq? 'aq' : 'f'; }
function fxLabel(p){ return p.aq? '아시아쿼터' : '외국인'; }
function fxCap(p){ return p.aq? FX_AQ : FX_F; }
// how many of each kind a club holds (whole club) or has on the 1군
function fxCount(t,onEntry){ const L=onEntry? allPlayers(t).filter(p=>p.f&&!p.fxHold) : foreignOf(t); return {f:L.filter(p=>!p.aq).length, aq:L.filter(p=>p.aq).length}; }
// signing: room in that kind once `out` (if any) leaves. Real records can leave a club over the cap
// (mid-season replacements); those extras sit in the 2군 and block new signings of that kind.
// " · 2군 2명" when released or extra foreigners sit in the 2군 (they still count against new signings)
function fxFarmNote(){ const n=farmOf(USER).filter(p=>p.f).length; return n? ` · 2군 보유 ${n}명` : ''; }
function fxRoom(t,p,out){ const c=fxCount(t), k=fxKind(p); return c[k]-(out&&fxKind(out)===k?1:0) < fxCap(p); }
function fxEntryRoom(t,p){ const c=fxCount(t,true); return c[fxKind(p)] < fxCap(p); }
// Initial 2026 clubs with replacement foreigners. FX_2026_OUT: players a club released or replaced
// during 2026 (news reports, 2026-06~08). They stay in the club's 2군 so the season's records still show,
// and the replacement holds the 1군 slot: KIA 데일→시라카와 (Asia quota), SSG 베니지아노→아빌라,
// KT 보쉴리→로건 and 사우어→대니엘, 두산 카메론→세베리노.
const FX_2026_OUT={KIA:['데일'], SSG:['베니지아노'], KT:['보쉴리','사우어'], 두산:['카메론']};
// fallback order for any other excess: fewest 2026 appearances goes down first
const FX_2026_GAMES={시라카와:18,네일:31,올러:30,카스트로:99,
  해치:8,아빌라:14,베니지아노:16,에레디아:115,
  대니엘:10,보쉴리:11,로건:17,사우어:18,힐리어드:142,
  세베리노:46,카메론:75,벤자민:24,잭로그:31};
// swap a 1군 player for a 2군 player of the same type when the entry rules allow it
function fxSwap(t,down,up){ const r=K.ROSTERS[t], fa=farmOf(t);
  if(down.type!==up.type||entryProblem(t,[down],[up])) return false;
  const arr=down.type==='B'?r.batters:r.pitchers;
  arr.splice(arr.indexOf(down),1,up); fa.splice(fa.indexOf(up),1,down); return true; }
// a domestic 2군 player who can take p's 1군 place (same type, healthy, keeps the entry legal)
function fxDomesticUp(t,p){ return farmOf(t).filter(x=>!x.f&&x.type===p.type&&!K.isInjured(x)&&
  (p.role!=='SP'||x.role==='SP')&&(p.pos!=='C'||x.pos==='C')).sort((a,b)=>K.ovr(b)-K.ovr(a)).find(x=>!entryProblem(t,[p],[x])); }
// a domestic 1군 player who can make room for foreigner q (same type, weakest first, never the last catcher)
function fxDomesticDown(t,q){ return allPlayers(t).filter(x=>!x.f&&x.type===q.type&&x.pos!=='C')
  .sort((a,b)=>K.ovr(a)-K.ovr(b)).find(x=>!entryProblem(t,[x],[q])); }
// Keep the 1군 within 3 + 1, with each club's latest signings on it: released players go down,
// their replacements come up, then any other excess goes down (paired with a domestic call-up
// so the minimum pitcher/starter rules cannot veto it). No ratings or simulation inputs change.
function fxQuotaFix(t){ const moved=[], out=FX_2026_OUT[t]||[];
  allPlayers(t).filter(p=>p.f&&out.indexOf(p.n)>=0).forEach(p=>{ const up=fxDomesticUp(t,p); if(up&&fxSwap(t,p,up)) moved.push(p.n); });
  farmOf(t).filter(p=>p.f&&out.indexOf(p.n)<0&&!K.isInjured(p)).forEach(q=>{
    if(!fxEntryRoom(t,q)) return;
    const dn=fxDomesticDown(t,q); if(dn&&fxSwap(t,dn,q)) moved.push(q.n);
  });
  ['f','aq'].forEach(k=>{ const cap=k==='aq'?FX_AQ:FX_F, on=allPlayers(t).filter(p=>p.f&&fxKind(p)===k);
    while(on.length>cap){
      const nb=on.filter(p=>p.type==='B').length, type=nb>on.length-nb?'B':'P';
      const p=on.filter(p=>p.type===type).sort((a,b)=>(FX_2026_GAMES[a.n]??Infinity)-(FX_2026_GAMES[b.n]??Infinity)||K.ovr(a)-K.ovr(b))[0];
      const up=fxDomesticUp(t,p);
      if(!up||!fxSwap(t,p,up)) break;   // no legal swap: leave it; tools/tests/roster-rules.js fails on any club over the quota
      on.splice(on.indexOf(p),1); moved.push(p.n);
    }
  });
  if(moved.length&&state.cfgs&&state.cfgs[t]) repairCfg(t);
  return moved; }
// `used` is shared across one batch of candidates so two of them never get the same name
function makeForeign(type, used, boost, aq){
  used=used||allNames(); const NM=aq?AQ_NAMES:FX_NAMES; let n=NM.find(x=>!used.has(x)&&Math.random()<0.3)||NM.find(x=>!used.has(x));
  for(let i=0;!n||used.has(n);i++) n='외국인'+R(10,99)+(i>50?i:'');
  used.add(n);
  const age=R(25,32);
  let p;
  if(type==='B'){ const pos=['1B','LF','RF','3B','CF','SS','2B'][R(0,6)];
    p={n, pos, age, con:R(66,84), pow:R(70,92), eye:R(60,80), spd:R(48,80), fld:R(58,80), arm:R(60,82), type:'B'}; }
  else { p={n, role:'SP', age, stu:R(70,86), ctl:R(64,82), mov:R(66,80), sta:R(72,88), type:'P'}; }
  if(boost) ['con','pow','eye','fld','stu','ctl','mov'].forEach(k=>{ if(p[k]) p[k]=Math.min(99,p[k]+boost); });
  if(aq){ ['con','pow','eye','fld','stu','ctl','mov'].forEach(k=>{ if(p[k]) p[k]=Math.max(40,p[k]-5); }); if(type==='P'&&Math.random()<0.5) p.role='RP'; }
  Object.assign(p,{f:1, aq:aq?1:0, yrs:1, mor:70, cond:100, inj:0, bench:0, pers:hash(n)%PERS.length});
  // first-year caps: 100만 달러 (about 14억) for a foreign player, 20만 달러 (about 2.9억) for the Asia quota
  p.sal=aq? clampN(Math.round((1.5+Math.random()*1.4)*10)/10, 1, 2.9) : clampN(Math.round((4+Math.max(0,K.ovr(p)-70)*0.7+Math.random()*3)*10)/10, 5, 14);
  return p;
}
function scoutList(){
  const f=fm(), ug=userGamesPlayed();
  if(!f.scout || f.scout.year!==state.year || ug-f.scout.ug>=20) { const used=allNames(); (f.fa||[]).forEach(x=>used.add(x.p.n));
    f.scout={year:state.year, ug, list:(mgrBg().fx6?['P','P','P','B','B','B']:['P','P','B','B']).map(t=>makeForeign(t,used,mgrBg().fx6?3:0)).concat([makeForeign(Math.random()<0.6?'P':'B',used,mgrBg().fx6?3:0,true)])}; }
  return f.scout.list;
}
// open all winter: stove league, the off-season and spring camp (a slot freed in the stove league can be filled at camp), then the first 108 games
function fxWindowOpen(){ return state.phase==='stove' || state.phase==='offseason' || state.phase==='spring' || (state.phase==='regular' && userGamesPlayed()<108); }
function fxSwapsLeft(){ const f=fm(); return FX_SWAPS-((f.fxSwaps&&f.fxSwaps.year===state.year)?f.fxSwaps.n:0); }
function fxPick(i){
  const cand=scoutList()[i]; if(!cand) return;
  if(!fxWindowOpen()){ notify('외국인 선수 영입은 비시즌(스토브리그·스프링캠프)과 정규시즌 108경기 전까지만 가능합니다.'); return; }
  if(state.phase==='regular' && fxSwapsLeft()<=0){ notify('이번 시즌 외국인 선수 교체 횟수(2회)를 모두 썼습니다.'); return; }
  const mine=foreignOf(USER).filter(p=>fxKind(p)===fxKind(cand)), room=fxRoom(USER,cand);
  const btn=p=>`<button class="btn" onclick="FM.fxSign(${i},'${q(p.n)}')">${esc(p.n)} 웨이버 공시 <span class="muted">(${p.pos||p.role}·OVR ${K.ovr(p)}·클레임 없으면 잔여 연봉 ${waiverRemaining(p)}억)</span></button>`;
  const hurt=foreignOf(USER).filter(p=>fxKind(p)===fxKind(cand)&&p.inj>=30&&!p.tempFor);
  const tmp=p=>`<button class="btn tonal" onclick="FM.fxSign(${i},'${q(p.n)}',1)">${esc(p.n)} 부상 대체로 영입 <span class="muted">(${p.n} 보류 · 교체 횟수 차감 없음 · 회복 ${p.inj}경기)</span></button>`;
  modal(`<span class="closeX" onclick="App.closeModal()">×</span><h2>🌏 ${esc(cand.n)} 영입 <span class="pill pos">${fxLabel(cand)}</span></h2>
    <div class="muted">${posFull(cand.pos||cand.role)} · ${cand.age}세 · OVR ${K.ovr(cand)} · 연봉 ${cand.sal}억 (계약금 ${Math.round(cand.sal*0.2*10)/10}억)</div>
    <div class="hint" style="margin:10px 0">외국인은 ${FX_F}명, 아시아쿼터는 ${FX_AQ}명까지 둘 수 있습니다. ${room?'자리가 있어 그대로 영입할 수 있습니다.':`${fxLabel(cand)} 자리가 찼습니다. 누구를 내보낼까요?`}</div>
    <div class="grid" style="gap:8px">${room?`<button class="btn primary" onclick="FM.fxSign(${i},'')">방출 없이 영입</button>`:''}${hurt.map(tmp).join('')}${mine.map(btn).join('')}</div>
    <p class="hint" style="margin-top:8px">부상 대체: 6주 이상 다친 선수는 보류한 채 단기 대체 선수를 쓸 수 있습니다. 원래 선수가 돌아오면 둘 중 한 명을 고릅니다.</p>`);
}
function fxSign(i,outName,tempFlag){
  const f=fm(), cand=scoutList()[i]; if(!cand) return;
  const out=outName? findPlayer(USER,outName) : null;
  const limit=f.fin.budget*1.1, after=payroll(USER)-(out?out.sal:0)+cand.sal;
  if(after>limit){ notify(`연봉 총액이 한도를 넘습니다 (${after.toFixed(1)}억 > ${limit.toFixed(1)}억).`); return; }
  if(!fxRoom(USER,cand,out)){ notify(`${fxLabel(cand)} 자리가 찼습니다. 같은 구분의 선수를 내보내야 합니다.`); return; }
  const temp=!!(tempFlag&&out&&out.inj>=30), fee=Math.round(cand.sal*0.2*10)/10;
  if(allNames().has(cand.n)){ notify(`같은 이름의 선수(${cand.n})가 이미 리그에 있습니다. 다른 후보를 고르세요.`); return; }
  const r=K.ROSTERS[USER], onEntry=!!out && allPlayers(USER).indexOf(out)>=0;
  const room=entryCount(USER)-(onEntry?1:0)<ENTRY_MAX;
  const why=entryProblem(USER, onEntry?[out]:[], room?[cand]:[]); if(why){ notify(why); return; }
  if(out&&temp){ if(onEntry){ if(out.type==='B') r.batters=r.batters.filter(x=>x!==out); else r.pitchers=r.pitchers.filter(x=>x!==out); farmOf(USER).push(out); } out.fxHold=true; cand.tempFor=out.n; }
  else if(out) waiverRelease(USER,out);
  cand.newG=NEW_GAMES; joinClub(USER,cand);
  f.scout.list.splice(i,1);
  f.fxSwaps={year:state.year, n:(f.fxSwaps&&f.fxSwaps.year===state.year?f.fxSwaps.n:0)+(out&&!temp&&state.phase==='regular'?1:0)};
  f.fin.balance-=fee; f.fin.exp+=fee;
  f.promises=f.promises.filter(pr=>!!findPlayer(USER,pr.n));
  const d=K.defaultLineup(USER); const c=state.cfgs[USER];
  if(out && (c.lineup.indexOf(out.n)>=0||c.rotation.indexOf(out.n)>=0||c.bullpen.indexOf(out.n)>=0||c.closer===out.n)) state.cfgs[USER]={teamId:USER,lineup:d.lineup.slice(),positions:d.positions.slice(),rotation:d.rotation.slice(),bullpen:d.bullpen.slice(),closer:d.closer};
  send('단장','🌏',`외국인 선수 ${cand.n} 영입`, `${cand.n}(${posFull(cand.pos||cand.role)}, OVR ${K.ovr(cand)})과 연봉 ${cand.sal}억 원에 계약했습니다.${temp?`\n${out.n}이(가) 회복할 때까지 쓰는 부상 대체 계약입니다. 교체 횟수는 차감되지 않습니다.`:out?`\n${out.n}은(는) 웨이버 공시되었습니다.`:''}\n계약금 ${fee}억 원이 지출되었습니다.${out&&c.lineup.indexOf(out.n)>=0?'\n라인업이 자동 재구성되었습니다.':''}`, []);
  closeModal(); render();
}
// a foreign player who isn't working out: the scouts flag it
function checkForeignForm(ug){
  const f=fm(); if(!fxWindowOpen() || ug<25 || ug-(f.lastFxNote||-99)<25 || fxSwapsLeft()<=0) return;
  const bad=foreignOf(USER).map(p=>({p, rt:ratingsOf(USER,p.n)})).filter(x=>x.rt&&x.rt.cnt>=10&&x.rt.sum/x.rt.cnt<6.15).sort((a,b)=>a.rt.sum/a.rt.cnt-b.rt.sum/b.rt.cnt)[0];
  if(!bad) return;
  f.lastFxNote=ug;
  send('스카우트 팀장','🌏',`${bad.p.n} 교체를 검토할 시점입니다`,
    `${bad.p.n}의 평균 평점이 ${(bad.rt.sum/bad.rt.cnt).toFixed(2)}에 그치고 있습니다. 스카우트 팀이 대체 후보 ${scoutList().length}명을 추렸습니다.\n\n스카우트 탭의 외국인 선수 목록에서 후보를 확인하세요. (교체 가능 ${fxSwapsLeft()}회, 108경기 전까지)`,
    [{label:'스카우트 탭에서 후보 보기', fn:'openClub'}, {label:'더 지켜본다', fn:'ok'}]);
}

// ---------- postseason hooks ----------
function onRegularSeasonEnd(){
  ensure();
  const st=standings(), rank=st.findIndex(x=>x.t===USER)+1, seeds=state.postseason.seeds;
  send('KBO','🏆',`${state.year} 포스트시즌 대진 확정`,
    `정규시즌 최종 순위: ${seeds.map((t,i)=>`${i+1}. ${K.ROSTERS[t].name}`).join(' · ')}\n\n` +
    (seeds.includes(USER)? `${K.ROSTERS[USER].name}는 ${rank}위로 가을야구에 나갑니다. 경기마다 라인업·선발을 정하고 실시간 중계로 지휘하세요.`
      : `${K.ROSTERS[USER].name}는 ${rank}위로 시즌을 마쳤습니다. 포스트시즌은 대시보드에서 시뮬레이션으로 진행됩니다.`), []);
  openDraft();
  showPS();
}
function psSeriesMessage(c){
  const opp=c.hi===USER?c.lo:c.hi;
  send('수석코치','📋',`${c.name}: ${K.ROSTERS[opp].name}전`,
    `${c.name} 상대는 ${K.ROSTERS[opp].name}입니다 (${c.bestOf===3?'우리 '+(c.hi===USER?'1승 어드밴티지':'2승 필요'):c.need+'선승제'}).\n` +
    `포스트시즌은 연장 15회까지 갑니다. 선발 로테이션 순서를 점검하고, 지친 선수가 없는지 확인하세요.`, []);
}
function psSeriesResult(name, r){
  const won=r.winner===USER;
  allPlayers(USER).forEach(p=>addMor(p, won?4:-3));
  send('스포츠 뉴스','📰', won? `${USER}, ${name} 통과!` : `${USER}, ${name}에서 탈락`,
    won? `${K.ROSTERS[USER].name}가 ${name}에서 ${K.ROSTERS[r.loser].name}를 꺾었습니다.` : `${K.ROSTERS[USER].name}의 가을이 ${name}에서 끝났습니다.`, []);
}
// postseason games don't count in the season stats, but players still tire and get hurt
function afterPsGame(res){
  ensure();
  [res.home,res.away].forEach(t=>{
    const hurt=K.applyFatigue(t,res.box);
    moraleAfterGame(t,res);
    if(t===USER) hurt.forEach(h=>send('의무 트레이너','🩹',`${h.n} 부상`, `${h.n} 선수가 포스트시즌 경기 중 부상을 입었습니다. 예상 결장 약 ${h.games}경기.`, []));
  });
  if(res.home===USER||res.away===USER) tacticsAfterGame(res);
}

// ---------- after being fired: other clubs that want the manager ----------
function jobOffers(){
  const st=standings().map(x=>x.t).filter(t=>t!==USER);
  const bottom=st.slice(-5); const out=[];
  while(out.length<2 && bottom.length){ out.push(bottom.splice(Math.floor(Math.random()*bottom.length),1)[0]); }
  return out;
}
function takeJob(t){
  const f=fm(), old=USER;
  // the old club's open contract talks end; that club re-signs its own players
  f.inbox.forEach(m=>{ if(!m.done && m.actions.some(a=>a.fn==='renew')){ m.done=true; m.read=true; m.result='구단을 떠나 협상이 종료되었습니다.'; } });
  allPlayers(old).forEach(p=>{ if(p.expiring||p.leaving){ p.expiring=false; delete p.leaving; p.yrs=2; p.sal=renewSalary(p); } });
  USER=t; state.user.team=t; applyTheme(t);
  f.fired=false; f.lastChance=false; f.board.conf=50; f.restNext=[]; f.promises=[]; f.offers=null;
  send(`${K.ROSTERS[t].name} 구단주`,'🤝',`${state.user.name} 감독님, ${K.ROSTERS[t].name}에 오신 것을 환영합니다`,
    `${K.ROSTERS[old].name}에서의 경험을 살려 우리 팀을 일으켜 주십시오.\n이사회 목표는 다음 시즌 시작 때 전달됩니다.`, []);
  pressInaug();
  closeModal(); currentTab='dash'; render();
}

