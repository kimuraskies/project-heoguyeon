// ---------- trades (shared by the trade tab and inbox offers) ----------
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
function tradeCheck(team, fromUser, fromThem){
  const w=tradeWindow(); if(!w.open) return w.msg;
  if(!fromUser.length || !fromThem.length) return '양쪽 모두 선수를 한 명 이상 골라야 합니다.';
  const on=(t,n)=>allPlayers(t).find(x=>x.n===n);
  const gone=fromUser.filter(n=>!on(USER,n)).concat(fromThem.filter(n=>!on(team,n)));
  if(gone.length) return `${gone.join(', ')}은(는) 지금 1군에 없어 트레이드할 수 없습니다.`;
  const outP=fromUser.map(n=>on(USER,n)), inP=fromThem.map(n=>on(team,n));
  return entryProblem(USER,outP,inP,'우리 팀 ') || entryProblem(team,inP,outP,`${K.ROSTERS[team].name} `);
}
function doTrade(team, fromUser, fromThem){
  const why=tradeCheck(team, fromUser, fromThem); if(why) return why;
  function move(srcT,dstT,name){
    const r=K.ROSTERS[srcT]; let i=r.batters.findIndex(x=>x.n===name);
    if(i>=0){ const p=r.batters.splice(i,1)[0]; p.listed=false; p.bench=0; if(dstT===USER) p.newG=NEW_GAMES; K.ROSTERS[dstT].batters.push(p); return; }
    i=r.pitchers.findIndex(x=>x.n===name);
    if(i>=0){ const p=r.pitchers.splice(i,1)[0]; p.listed=false; if(dstT===USER) p.newG=NEW_GAMES; K.ROSTERS[dstT].pitchers.push(p); }
  }
  fromUser.forEach(n=>move(USER,team,n));
  fromThem.forEach(n=>move(team,USER,n));
  fm().promises=fm().promises.filter(pr=>!!findPlayer(USER,pr.n));
  [USER,team].forEach(t=>{ const d=K.defaultLineup(t); state.cfgs[t]={teamId:t,lineup:d.lineup.slice(),positions:d.positions.slice(),rotation:d.rotation.slice(),bullpen:d.bullpen.slice(),closer:d.closer}; });
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
function addFA(p, from){ const f=fm(); f.fa=f.fa||[]; delete p.leaving; p.expiring=false; f.fa.push({p, ask:faAsk(p), yrs:faYears(p), from}); }
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
// offseason end: AI clubs pick up the free agents worth signing, the rest leave the league
function aiSignFAs(){
  const f=fm(), list=(f.fa||[]).slice().sort((a,b)=>K.ovr(b.p)-K.ovr(a.p)), gone=[];
  list.forEach(x=>{
    const p=x.p, teams=K.TEAM_IDS.filter(t=>t!==USER).sort((a,b)=>teamStrength(a)-teamStrength(b));
    const t=teams.find(t=>(p.type==='B'?K.ROSTERS[t].batters.length<15:K.ROSTERS[t].pitchers.length<13)) ;
    if(t && K.ovr(p)>=64 && Math.random()<0.8){ p.sal=x.ask; p.yrs=x.yrs; (p.type==='B'?K.ROSTERS[t].batters:K.ROSTERS[t].pitchers).push(p); gone.push(`${p.n} → ${t}`); }
  });
  f.fa=[];
  return gone;
}

// ---------- foreign players: 3 foreign + 1 Asia quota on the 1군, two replacements a season ----------
const FX_NAMES=['로페즈','마르테','브리토','오도넬','헤이워드','카펜터','레예스','몬테로','갈비스','스탠튼','라미레스','클라크','파울러','밀러','앤더슨','톰슨','로저스','하퍼','크루즈','벨트레','마차도','가르시아','소토','베탄코트','플로레스','에반스','콜','브룩스','그레이','토레스'];
const FX_MAX=4, FX_F=3, FX_AQ=1, FX_SWAPS=2;
const AQ_NAMES=['나카무라','야마다','사토','후지타','린','천','장','오카다','모리','쿡','왓슨','하라'];
function foreignOf(t){ return allPlayers(t).concat(farmOf(t)).filter(p=>p.f); }
function fxKind(p){ return p.aq? 'aq' : 'f'; }
function fxLabel(p){ return p.aq? '아시아쿼터' : '외국인'; }
function fxCap(p){ return p.aq? FX_AQ : FX_F; }
// how many of each kind a club holds (whole club) or has on the 1군
function fxCount(t,onEntry){ const L=onEntry? allPlayers(t).filter(p=>p.f) : foreignOf(t); return {f:L.filter(p=>!p.aq).length, aq:L.filter(p=>p.aq).length}; }
// signing: room in that kind once `out` (if any) leaves. Real records can leave a club over the cap
// (mid-season replacements); those extras sit in the 2군 and block new signings of that kind.
function fxRoom(t,p,out){ const c=fxCount(t), k=fxKind(p); return c[k]-(out&&fxKind(out)===k?1:0) < fxCap(p); }
function fxEntryRoom(t,p){ const c=fxCount(t,true); return c[fxKind(p)] < fxCap(p); }
// keep the 1군 within 3 + 1: the weakest extras go down to the 2군
function fxQuotaFix(t){ const r=K.ROSTERS[t], moved=[];
  ['f','aq'].forEach(k=>{ const cap=k==='aq'?FX_AQ:FX_F, on=allPlayers(t).filter(p=>p.f&&fxKind(p)===k).sort((a,b)=>K.ovr(b)-K.ovr(a));
    on.slice(cap).forEach(p=>{ if(entryProblem(t,[p],[])) return; const arr=p.type==='B'?r.batters:r.pitchers; arr.splice(arr.indexOf(p),1); farmOf(t).push(p); moved.push(p.n); }); });
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
  p.sal=aq? clampN(Math.round((1.5+Math.random()*1.4)*10)/10, 1, 3) : clampN(Math.round((4+Math.max(0,K.ovr(p)-70)*0.7+Math.random()*3)*10)/10, 5, 18);   // Asia quota pay is capped low
  return p;
}
function scoutList(){
  const f=fm(), ug=userGamesPlayed();
  if(!f.scout || f.scout.year!==state.year || ug-f.scout.ug>=20) { const used=allNames(); (f.fa||[]).forEach(x=>used.add(x.p.n));
    f.scout={year:state.year, ug, list:(mgrBg().fx6?['P','P','P','B','B','B']:['P','P','B','B']).map(t=>makeForeign(t,used,mgrBg().fx6?3:0)).concat([makeForeign(Math.random()<0.6?'P':'B',used,mgrBg().fx6?3:0,true)])}; }
  return f.scout.list;
}
function fxWindowOpen(){ return state.phase==='stove' || (state.phase==='regular' && userGamesPlayed()<108); }
function fxSwapsLeft(){ const f=fm(); return FX_SWAPS-((f.fxSwaps&&f.fxSwaps.year===state.year)?f.fxSwaps.n:0); }
function fxPick(i){
  const cand=scoutList()[i]; if(!cand) return;
  if(!fxWindowOpen()){ notify('외국인 선수 교체는 스토브리그와 정규시즌 108경기 전까지만 가능합니다.'); return; }
  if(state.phase==='regular' && fxSwapsLeft()<=0){ notify('이번 시즌 외국인 선수 교체 횟수(2회)를 모두 썼습니다.'); return; }
  const mine=foreignOf(USER).filter(p=>fxKind(p)===fxKind(cand)), room=fxRoom(USER,cand);
  const btn=p=>`<button class="btn" onclick="FM.fxSign(${i},'${q(p.n)}')">${esc(p.n)} 방출 <span class="muted">(${p.pos||p.role}·OVR ${K.ovr(p)}·잔여 위약금 ${Math.round(p.sal*0.5*10)/10}억)</span></button>`;
  modal(`<span class="closeX" onclick="App.closeModal()">×</span><h2>🌏 ${esc(cand.n)} 영입 <span class="pill pos">${fxLabel(cand)}</span></h2>
    <div class="muted">${posFull(cand.pos||cand.role)} · ${cand.age}세 · OVR ${K.ovr(cand)} · 연봉 ${cand.sal}억 (계약금 ${Math.round(cand.sal*0.2*10)/10}억)</div>
    <div class="hint" style="margin:10px 0">외국인은 ${FX_F}명, 아시아쿼터는 ${FX_AQ}명까지 둘 수 있습니다. ${room?'자리가 있어 그대로 영입할 수 있습니다.':`${fxLabel(cand)} 자리가 찼습니다. 누구를 내보낼까요?`}</div>
    <div class="grid" style="gap:8px">${room?`<button class="btn primary" onclick="FM.fxSign(${i},'')">방출 없이 영입</button>`:''}${mine.map(btn).join('')}</div>`);
}
function fxSign(i,outName){
  const f=fm(), cand=scoutList()[i]; if(!cand) return;
  const out=outName? findPlayer(USER,outName) : null;
  const limit=f.fin.budget*1.1, after=payroll(USER)-(out?out.sal:0)+cand.sal;
  if(after>limit){ notify(`연봉 총액이 한도를 넘습니다 (${after.toFixed(1)}억 > ${limit.toFixed(1)}억).`); return; }
  if(!fxRoom(USER,cand,out)){ notify(`${fxLabel(cand)} 자리가 찼습니다. 같은 구분의 선수를 내보내야 합니다.`); return; }
  const fee=Math.round((cand.sal*0.2 + (out?out.sal*0.5:0))*10)/10;
  if(allNames().has(cand.n)){ notify(`같은 이름의 선수(${cand.n})가 이미 리그에 있습니다. 다른 후보를 고르세요.`); return; }
  const r=K.ROSTERS[USER], onEntry=!!out && allPlayers(USER).indexOf(out)>=0;
  const room=entryCount(USER)-(onEntry?1:0)<ENTRY_MAX;
  const why=entryProblem(USER, onEntry?[out]:[], room?[cand]:[]); if(why){ notify(why); return; }
  if(out){ if(out.type==='B') r.batters=r.batters.filter(x=>x!==out); else r.pitchers=r.pitchers.filter(x=>x!==out); r.farm=farmOf(USER).filter(x=>x!==out); }
  cand.newG=NEW_GAMES; joinClub(USER,cand);
  f.scout.list.splice(i,1);
  f.fxSwaps={year:state.year, n:(f.fxSwaps&&f.fxSwaps.year===state.year?f.fxSwaps.n:0)+(out&&state.phase==='regular'?1:0)};
  f.fin.balance-=fee; f.fin.exp+=fee;
  f.promises=f.promises.filter(pr=>!!findPlayer(USER,pr.n));
  const d=K.defaultLineup(USER); const c=state.cfgs[USER];
  if(out && (c.lineup.indexOf(out.n)>=0||c.rotation.indexOf(out.n)>=0||c.bullpen.indexOf(out.n)>=0||c.closer===out.n)) state.cfgs[USER]={teamId:USER,lineup:d.lineup.slice(),positions:d.positions.slice(),rotation:d.rotation.slice(),bullpen:d.bullpen.slice(),closer:d.closer};
  send('단장','🌏',`외국인 선수 ${cand.n} 영입`, `${cand.n}(${posFull(cand.pos||cand.role)}, OVR ${K.ovr(cand)})과 연봉 ${cand.sal}억 원에 계약했습니다.${out?`\n${out.n}은(는) 방출되었습니다.`:''}\n비용 ${fee}억 원(계약금${out?'·위약금':''})이 지출되었습니다.${out&&c.lineup.indexOf(out.n)>=0?'\n라인업이 자동 재구성되었습니다.':''}`, []);
  closeModal(); render();
}
// a foreign player who isn't working out: the scouts flag it
function checkForeignForm(ug){
  const f=fm(); if(!fxWindowOpen() || ug<25 || ug-(f.lastFxNote||-99)<25 || fxSwapsLeft()<=0) return;
  const bad=foreignOf(USER).map(p=>({p, rt:ratingsOf(USER,p.n)})).filter(x=>x.rt&&x.rt.cnt>=10&&x.rt.sum/x.rt.cnt<6.15).sort((a,b)=>a.rt.sum/a.rt.cnt-b.rt.sum/b.rt.cnt)[0];
  if(!bad) return;
  f.lastFxNote=ug;
  send('스카우트 팀장','🌏',`${bad.p.n} 교체를 검토할 시점입니다`,
    `${bad.p.n}의 평균 평점이 ${(bad.rt.sum/bad.rt.cnt).toFixed(2)}에 그치고 있습니다. 스카우트 팀이 대체 후보 ${scoutList().length}명을 추렸습니다.\n\n구단 탭의 '외국인 선수 시장'에서 후보를 확인하세요. (교체 가능 ${fxSwapsLeft()}회, 108경기 전까지)`,
    [{label:'구단 탭에서 후보 보기', fn:'openClub'}, {label:'더 지켜본다', fn:'ok'}]);
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

