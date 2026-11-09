// ---------- player records: game logs, season archive, career ----------
function logGame(res){
  state.logs=state.logs||{};
  [res.home,res.away].forEach(t=>{
    const opp=t===res.home?res.away:res.home, home=t===res.home, n0=(state.season[t].W+state.season[t].L+state.season[t].T)+1;
    const push=(n,e)=>{ const k=t+'|'+n, a=state.logs[k]||(state.logs[k]=[]); a.push(e); if(a.length>(t===USER?30:10)) a.shift(); };
    for(const n in res.box[t].bat){ const s=res.box[t].bat[n]; if(s.PA>0) push(n,{g:n0, opp, home, b:[s.PA,s.AB,s.H,s._2B,s._3B,s.HR,s.RBI,s.R,s.BB,s.SO,s.SB]}); }
    for(const n in res.box[t].pit){ const s=res.box[t].pit[n]; if(s.BF>0) push(n,{g:n0, opp, home, p:[s.OUT,s.H,s.ER,s.BB,s.SO,s.HR,s.NP||0,s.W?'W':s.L?'L':s.SV?'S':s.HD?'H':'',s.GS]}); }
  });
}
function archiveSeason(){
  state.hist=state.hist||{};
  K.TEAM_IDS.forEach(t=>{
    const s=state.season[t];
    for(const n in s.bat){ const x=s.bat[n]; if(x.PA>0) (state.hist[n]=state.hist[n]||[]).push({y:state.year, t, b:x}); }
    for(const n in s.pit){ const x=s.pit[n]; if(x.G>0) (state.hist[n]=state.hist[n]||[]).push({y:state.year, t, p:x}); }
  });
  state.logs={};
}
// league environment for rate stats (wOBA scale, FIP constant)
function leagueEnv(){
  let AB=0,H=0,D=0,T=0,HR=0,BB=0,HBP=0,SO=0,PA=0,ER=0,OUT=0,pHR=0,pBB=0,pSO=0,pHBP=0;
  K.TEAM_IDS.forEach(t=>{ const s=state.season[t];
    for(const n in s.bat){ const x=s.bat[n]; AB+=x.AB;H+=x.H;D+=x._2B;T+=x._3B;HR+=x.HR;BB+=x.BB;HBP+=x.HBP;SO+=x.SO;PA+=x.PA; }
    for(const n in s.pit){ const x=s.pit[n]; ER+=x.ER;OUT+=x.OUT;pHR+=x.HR;pBB+=x.BB;pSO+=x.SO; } });
  const woba=(AB+BB+HBP)? (0.69*BB+0.72*HBP+0.89*(H-D-T-HR)+1.27*D+1.62*T+2.1*HR)/(AB+BB+HBP) : 0.32;
  const era=OUT? ER*27/OUT : 4.5, fipRaw=OUT? (13*pHR+3*pBB-2*pSO)/(OUT/3) : 0;
  return {woba: woba||0.32, era, cFIP: era-fipRaw};
}
function batMetrics(s,env){
  const SF=s.SF||0, PA=s.AB+s.BB+s.HBP+SF+(s.SH||0), avg=s.AB?s.H/s.AB:0, obp=(s.AB+s.BB+s.HBP+SF)?(s.H+s.BB+s.HBP)/(s.AB+s.BB+s.HBP+SF):0;
  const tb=s.H+s._2B+2*s._3B+3*s.HR, slg=s.AB?tb/s.AB:0, single=s.H-s._2B-s._3B-s.HR;
  const woba=(s.AB+s.BB+s.HBP+SF)? (0.69*s.BB+0.72*s.HBP+0.89*single+1.27*s._2B+1.62*s._3B+2.1*s.HR)/(s.AB+s.BB+s.HBP+SF) : 0;
  const bip=s.AB-s.SO-s.HR+SF;
  return {avg,obp,slg,ops:obp+slg,iso:slg-avg,babip:bip>0?(s.H-s.HR)/bip:0,k:PA?s.SO/PA:0,bb:PA?s.BB/PA:0,woba,wrc:env&&env.woba?Math.round(woba/env.woba*100):null};
}
function pitMetrics(s,env){
  const ip=s.OUT/3, BF=s.BF||1;
  return {era:s.OUT?s.ER*27/s.OUT:0, whip:s.OUT?(s.H+s.BB)*3/s.OUT:0, k9:ip?s.SO*9/ip:0, bb9:ip?s.BB*9/ip:0, hr9:ip?s.HR*9/ip:0,
    kp:s.SO/BF, bbp:s.BB/BF, fip:ip&&env? (13*s.HR+3*s.BB-2*s.SO)/ip+env.cFIP : 0, babip:(BF-s.SO-s.BB-s.HR)>0?(s.H-s.HR)/(BF-s.SO-s.BB-s.HR):0,
    ipgs:s.GS?(s.OUT/3)/s.GS:0, npi:s.OUT&&s.NP?s.NP/(s.OUT/3):0};
}
const f3=x=>fmtAvg(x), pct=x=>(x*100).toFixed(1)+'%', f2=x=>x.toFixed(2);
function kpis(arr){ return `<div class="kpi">${arr.map(([v,l])=>`<div class="k"><div class="v" style="font-size:18px">${v}</div><div class="l">${l}</div></div>`).join('')}</div>`; }
function seasonPanel(team,p){
  const isB=p.type==='B', s=isB? state.season[team].bat[p.n] : state.season[team].pit[p.n], env=leagueEnv();
  if(!s || (isB? !s.PA : !s.G)) return '<div class="muted">이번 시즌 기록이 없습니다.</div>';
  if(isB){ const m=batMetrics(s,env);
    return kpis([[f3(m.avg),'타율'],[f3(m.obp),'출루율'],[f3(m.slg),'장타율'],[m.ops.toFixed(3),'OPS'],[m.wrc,'wRC+ (100=평균)']]) +
      `<div style="overflow-x:auto;margin-top:10px"><table><thead><tr><th>G</th><th>PA</th><th>AB</th><th>H</th><th>2B</th><th>3B</th><th>HR</th><th>타점</th><th>득점</th><th>BB</th><th>SO</th><th>도루</th><th>실패</th><th>희타</th><th>병살</th></tr></thead>
      <tbody><tr><td>${s.G}</td><td>${s.PA}</td><td>${s.AB}</td><td>${s.H}</td><td>${s._2B}</td><td>${s._3B}</td><td>${s.HR}</td><td>${s.RBI}</td><td>${s.R}</td><td>${s.BB}</td><td>${s.SO}</td><td>${s.SB||0}</td><td>${s.CS||0}</td><td>${s.SH||0}</td><td>${s.GDP||0}</td></tr></tbody></table></div>
      <div class="muted" style="font-weight:700;margin:12px 0 6px">세부 지표</div>`+
      kpis([[m.iso.toFixed(3),'순장타율 ISO'],[f3(m.babip),'BABIP'],[pct(m.k),'삼진율'],[pct(m.bb),'볼넷율'],[f3(m.woba),'wOBA']]); }
  const m=pitMetrics(s,env);
  return kpis([[f2(m.era),'평균자책'],[`${s.W}-${s.L}`,'승-패'],[`${s.SV}/${s.HD||0}`,'세이브/홀드'],[ipStr(s.OUT),'이닝'],[f2(m.whip),'WHIP']]) +
    `<div style="overflow-x:auto;margin-top:10px"><table><thead><tr><th>G</th><th>GS</th><th>타자</th><th>피안타</th><th>피홈런</th><th>볼넷</th><th>탈삼진</th><th>실점</th><th>자책</th><th>투구수</th></tr></thead>
    <tbody><tr><td>${s.G}</td><td>${s.GS}</td><td>${s.BF}</td><td>${s.H}</td><td>${s.HR}</td><td>${s.BB}</td><td>${s.SO}</td><td>${s.R}</td><td>${s.ER}</td><td>${s.NP||0}</td></tr></tbody></table></div>
    <div class="muted" style="font-weight:700;margin:12px 0 6px">세부 지표</div>`+
    kpis([[f2(m.fip),'FIP'],[f2(m.k9),'K/9'],[f2(m.bb9),'BB/9'],[pct(m.kp-m.bbp),'K-BB%'],[f3(m.babip),'피BABIP']]) +
    (s.GS? kpis([[m.ipgs.toFixed(1),'선발 평균 이닝'],[m.npi.toFixed(1),'이닝당 투구수']]) : '');
}
function careerPanel(team,p){
  const isB=p.type==='B', real=(window.KBO_CAREER&&window.KBO_CAREER[p.n]&&window.KBO_CAREER[p.n].t===p.type)? window.KBO_CAREER[p.n].y : [];
  const game=((state.hist||{})[p.n]||[]).filter(x=>isB? x.b : x.p);
  const cur=game.some(x=>x.y===state.year)? null : (isB? state.season[team].bat[p.n] : state.season[team].pit[p.n]);
  const rows=[], tot={};
  const addTot=o=>{ for(const k in o) if(typeof o[k]==='number') tot[k]=(tot[k]||0)+o[k]; };
  // real rows: B [y,team,G,PA,AB,R,H,2B,3B,HR,RBI,SB,CS,BB,HBP,SO], P [y,team,G,W,L,SV,HLD,OUT,H,HR,BB,HBP,SO,R,ER,TBF]
  real.forEach(r=>{ const o= isB? {G:r[2],PA:r[3],AB:r[4],R:r[5],H:r[6],_2B:r[7],_3B:r[8],HR:r[9],RBI:r[10],SB:r[11],CS:r[12],BB:r[13],HBP:r[14],SO:r[15]}
      : {G:r[2],W:r[3],L:r[4],SV:r[5],HD:r[6],OUT:r[7],H:r[8],HR:r[9],BB:r[10],HBP:r[11],SO:r[12],R:r[13],ER:r[14],BF:r[15]};
    rows.push({y:r[0], t:r[1], s:o, tag:''}); addTot(o); });
  game.forEach(x=>{ const o=isB?x.b:x.p; rows.push({y:x.y, t:x.t, s:o, tag:'🎮'}); addTot(o); });
  if(cur && (isB? cur.PA : cur.G)){ rows.push({y:state.year, t:team, s:cur, tag:'▶'}); addTot(cur); }
  if(!rows.length) return '<div class="muted">KBO 1군 기록이 없습니다.</div>';
  const bRow=(y,t,s,tag)=>{ const m=batMetrics(Object.assign({_2B:0,_3B:0,HBP:0,SO:0,SB:0},s)); return `<tr><td>${tag} ${y}</td><td>${t}</td><td>${s.G}</td><td>${s.PA||'-'}</td><td>${f3(m.avg)}</td><td>${s.H}</td><td>${s.HR}</td><td>${s.RBI}</td><td>${s.SB||0}</td><td>${f3(m.obp)}</td><td>${f3(m.slg)}</td><td><b>${m.ops.toFixed(3)}</b></td></tr>`; };
  const pRow=(y,t,s,tag)=>`<tr><td>${tag} ${y}</td><td>${t}</td><td>${s.G}</td><td>${s.W}</td><td>${s.L}</td><td>${s.SV}</td><td>${s.HD||0}</td><td>${ipStr(s.OUT)}</td><td><b>${fmtEra(s.ER,s.OUT)}</b></td><td>${s.SO}</td><td>${s.OUT?((s.H+s.BB)*3/s.OUT).toFixed(2):'-'}</td></tr>`;
  const head=isB? '<th>연도</th><th>팀</th><th>G</th><th>PA</th><th>타율</th><th>안타</th><th>HR</th><th>타점</th><th>도루</th><th>출루</th><th>장타</th><th>OPS</th>'
    : '<th>연도</th><th>팀</th><th>G</th><th>W</th><th>L</th><th>SV</th><th>HD</th><th>IP</th><th>ERA</th><th>SO</th><th>WHIP</th>';
  const body=rows.map(r=>isB? bRow(r.y,r.t,r.s,r.tag) : pRow(r.y,r.t,r.s,r.tag)).join('');
  const total= isB? bRow('통산','',tot,'') : pRow('통산','',tot,'');
  const ms=[];
  if(isB){ if(tot.H) ms.push(`통산 ${tot.H}안타`); if(tot.HR) ms.push(`${tot.HR}홈런`); const next=[100,200,300,400,500].find(x=>x>(tot.HR||0)); if(next&&tot.HR&&next-tot.HR<=15) ms.push(`${next}홈런까지 ${next-tot.HR}개`); const nh=[500,1000,1500,2000,2500].find(x=>x>(tot.H||0)); if(nh&&nh-tot.H<=60) ms.push(`${nh}안타까지 ${nh-tot.H}개`); }
  else { if(tot.W) ms.push(`통산 ${tot.W}승`); if(tot.SV) ms.push(`${tot.SV}세이브`); const nw=[50,100,150,200].find(x=>x>(tot.W||0)); if(nw&&tot.W&&nw-tot.W<=10) ms.push(`${nw}승까지 ${nw-tot.W}승`); }
  return `${ms.length?`<div class="hint" style="margin-bottom:8px">🏅 ${ms.join(' · ')}</div>`:''}
    <div style="overflow-x:auto;max-height:300px"><table><thead><tr>${head}</tr></thead><tbody>${body}<tr class="me rankrow" style="font-weight:700">${total.replace(/<tr>|<\/tr>/g,'')}</tr></tbody></table></div>
    <div class="hint" style="margin-top:6px">실제 KBO 기록(2025년까지, KBO 기록실) + 🎮 게임에서 치른 시즌 + ▶ 진행 중인 시즌</div>`;
}
function logPanel(team,p){
  const a=((state.logs||{})[team+'|'+p.n]||[]).slice().reverse();
  if(!a.length) return '<div class="muted">이번 시즌 최근 경기 기록이 없습니다.</div>';
  if(p.type==='B') return `<div style="overflow-x:auto"><table><thead><tr><th>경기</th><th>상대</th><th>타수</th><th>안타</th><th>2B</th><th>HR</th><th>타점</th><th>득점</th><th>BB</th><th>SO</th><th>도루</th></tr></thead><tbody>${
    a.map(e=>{ const b=e.b; return `<tr><td>${e.g}</td><td>${e.home?'vs':'@'} ${e.opp}</td><td>${b[1]}</td><td><b>${b[2]}</b></td><td>${b[3]}</td><td>${b[5]}</td><td>${b[6]}</td><td>${b[7]}</td><td>${b[8]}</td><td>${b[9]}</td><td>${b[10]}</td></tr>`; }).join('')}</tbody></table></div>`;
  return `<div style="overflow-x:auto"><table><thead><tr><th>경기</th><th>상대</th><th>결과</th><th>IP</th><th>피안타</th><th>자책</th><th>BB</th><th>SO</th><th>HR</th><th>투구수</th></tr></thead><tbody>${
    a.map(e=>{ const x=e.p; return `<tr><td>${e.g}${x[8]?' (선발)':''}</td><td>${e.home?'vs':'@'} ${e.opp}</td><td>${{W:'승',L:'패',S:'세',H:'홀'}[x[7]]||'-'}</td><td>${ipStr(x[0])}</td><td>${x[1]}</td><td><b>${x[2]}</b></td><td>${x[3]}</td><td>${x[4]}</td><td>${x[5]}</td><td>${x[6]}</td></tr>`; }).join('')}</tbody></table></div>`;
}
let profTab='overview', profKey=null;
function profileTab(k){ profTab=k; const [t,n]=profKey; closeModal(); showProfile(t,n); }

// ---------- season end / offseason ----------
function onSeasonEnd(){
  ensure();
  archiveSeason();
  const f=fm(), s=boardStatus(), b=f.board;
  const champ=state.champion===USER;
  let d = s.met? 15 : -(5+s.gap*3);
  if(champ) d+=25;
  b.conf=clampN(b.conf+d,0,100);
  pledgeReview();
  coachSeasonEnd();
  awardsAfterSeason();
  send('구단 이사회','🏛',`${state.year} 시즌 최종 평가: ${s.met?'목표 달성':'목표 미달'}`,
    `최종 ${s.rank}위 · 승률 ${fmtAvg(s.pct)} (목표: ${b.expect.label})${champ?'\n🏆 한국시리즈 우승!':''}\n` +
    `재정: 잔고 ${f.fin.balance.toFixed(1)}억 원 · 시즌 수입 ${f.fin.rev.toFixed(1)}억 / 지출 ${f.fin.exp.toFixed(1)}억\n\n이사회 신뢰도: ${b.conf} (${d>=0?'+':''}${d})`, []);
  if(b.conf<15 && !s.met){ f.fired=true; }
  // contracts: one year off everyone's deal; the user negotiates expiring ones
  const toFA=[];
  f.fa=[];
  // 2군 players are under contract too; minor-league deals (under 1억) roll over a year on their own
  K.TEAM_IDS.forEach(t=>allPlayers(t).concat(farmOf(t)).forEach(p=>{
    p.yrs=(p.yrs||1)-1;
    if(p.yrs>0) return;
    if(isFarm(t,p) && (p.sal||0)<1){ p.yrs=1; return; }
    if(t!==USER){ // AI clubs re-sign most players; some veterans and imports test the market
      if((p.age>=28&&p.age<=34&&Math.random()<0.3) || (p.f&&Math.random()<0.25)){ toFA.push([t,p]); return; }
      p.yrs=2; p.sal=renewSalary(p); return; }
    p.expiring=true;
    const ask=Math.round(renewSalary(p)*(K.mor(p)<40?1.2:K.mor(p)>75?0.95:1.03)*10)/10;
    const acts=[{label:`1년 ${ask}억 재계약`, fn:'renew', arg:{n:p.n, years:1, sal:ask}}];
    if(p.age<=33) acts.push({label:`3년 ${Math.round(ask*1.1*10)/10}억 재계약`, fn:'renew', arg:{n:p.n, years:3, sal:Math.round(ask*1.1*10)/10}});
    acts.push({label:'재계약하지 않는다', fn:'release', arg:{n:p.n}});
    send(`${p.n} 에이전트`,'📝',`${p.n} 계약 만료 — 재계약 협상`,
      `${p.n}(${p.age}세, ${posFull(p.pos||p.role)}, OVR ${K.ovr(p)})의 계약이 만료됩니다.\n현재 연봉 ${p.sal}억 원 · 요구 연봉 ${ask}억 원 · 사기 ${moraleLabel(K.mor(p))}\n\n` +
      `다음 시즌 시작 전까지 결정하지 않으면 FA로 팀을 떠납니다.`, acts);
  }));
  toFA.forEach(([t,p])=>{ const r=K.ROSTERS[t]; r.batters=r.batters.filter(x=>x!==p); r.pitchers=r.pitchers.filter(x=>x!==p); r.farm=farmOf(t).filter(x=>x!==p); addFA(p,t); });
  if(f.fa.length) send('단장','🆓',`FA 시장 개장 (${f.fa.length}명)`,
    `다른 구단과 재계약하지 않은 선수들이 FA 시장에 나왔습니다.\n\n${f.fa.slice().sort((a,b)=>K.ovr(b.p)-K.ovr(a.p)).slice(0,6).map(x=>`• ${x.p.n} (${x.p.pos||x.p.role}, ${x.p.age}세, OVR ${K.ovr(x.p)}) 요구 ${x.yrs}년 ${x.ask}억`).join('\n')}\n\n구단 탭의 FA 시장에서 계약할 수 있습니다. 스토브리그가 끝나고 스프링캠프가 시작되면 남은 선수들은 다른 구단과 계약합니다.`, []);
}
function maybeShowFired(){
  const f=fm(); if(!f||!f.fired) return;
  modal(`<h2>📰 감독 경질</h2>
    <p>구단 이사회가 성적 부진을 이유로 감독 교체를 결정했습니다. (이사회 신뢰도 ${f.board.conf})</p>
    ${(f.offers=f.offers||jobOffers()).length? `<div class="hint" style="margin-top:10px">다른 구단에서 감독 제의가 왔습니다.</div>
    <div class="grid" style="gap:8px;margin-top:8px">${f.offers.map(t=>`<button class="btn" onclick="App.takeJob('${t}')">${teamDot(t)} ${K.ROSTERS[t].name} 감독직 수락 <span class="muted">(정규시즌 ${standings().findIndex(x=>x.t===t)+1}위)</span></button>`).join('')}</div>` : ''}
    <div class="row" style="gap:8px;margin-top:12px">
      <button class="btn primary" onclick="FM.newCareer()">🔄 새 게임 시작</button>
      ${f.lastChance?'':'<button class="btn" onclick="FM.lastChance()">🙏 구단주에게 마지막 기회를 요청한다</button>'}
    </div>`);
}
function newCareer(){ try{ localStorage.removeItem('kbo_manager_autosave'); }catch(e){} location.reload(); }
function lastChance(){ const f=fm(); f.fired=false; f.lastChance=true; f.board.conf=30; closeModal();
  send('구단주','🏛','마지막 기회','구단주가 한 시즌의 기회를 더 주기로 했습니다. 이번에는 결과로 보여주셔야 합니다.',[]); render(); }

// before the new season's lineups are rebuilt: departures, retirements, rookies, a fresh body
function offseasonMoves(){
  ensure();
  const f=fm();
  const dr=draftState(); if(dr&&!draftDone(dr)){ const before=dr.picks[USER].length; draftAuto(); f.draftAutoN=DRAFT_ROUNDS-before; } else f.draftAutoN=0;
  // unanswered contract talks: the player walks
  f.inbox.forEach(m=>{ if(!m.done && m.actions.some(a=>a.fn==='renew')){ m.done=true; m.read=true; m.result='기한 내 결정하지 않아 FA로 떠났습니다.'; const p=findPlayer(USER,m.actions[0].arg.n); if(p) p.leaving=true; } });
  const left=[], retired=[];
  K.TEAM_IDS.forEach(t=>{
    const r=K.ROSTERS[t];
    const out=p=>{ if(t===USER&&p.leaving){ left.push(p.n); addFA(p,USER); return true; }
      if(p.age>=39 && K.ovr(p)<72){ if(t===USER) retired.push(p.n); return true; } return false; };
    r.batters=r.batters.filter(p=>!out(p)); r.pitchers=r.pitchers.filter(p=>!out(p)); r.farm=farmOf(t).filter(p=>!out(p));
    allPlayers(t).forEach(p=>{ p.cond=100; p.inj=0; p.bench=0; p.expiring=false; p.mor=clampN(p.mor*0.6+62*0.4,5,99); });
    // draft: four rookies a club join the farm; the farm fills any hole in the 1군
    const fx=offseasonFarm(t);
    if(t===USER){ f.newRookies=fx.draft.map(p=>`${p.n} (${p.age}세, ${posFull(p.pos||p.role)}, OVR ${K.ovr(p)}, 잠재력 ${starText(p)})`);
      f.farmNews={up:fx.up.map(p=>p.n), retired:fx.retired, cut:fx.cut}; return; }
    // AI clubs send their least valuable players down so 1군 rosters don't grow every year
    const trim=(arr,max)=>{ while(arr.length>max){ let w=0; arr.forEach((p,i)=>{ if(playerValue(p)<playerValue(arr[w])) w=i; }); farmOf(t).push(arr.splice(w,1)[0]); } };
    trim(r.batters,14);
    if(r.pitchers.length>12){ const sp=r.pitchers.filter(p=>p.role==='SP'), rp=r.pitchers.filter(p=>p.role!=='SP'); trim(sp,Math.max(5,12-rp.length)); trim(rp,12-sp.length); r.pitchers=sp.concat(rp); }
  });
  f.offseasonNews={left, retired, signed:[]}; // AI clubs sign free agents when spring camp opens
  f.draft=null;
}
// "next season" button: warn about contract talks that will end with the player leaving
function confirmNextSeason(go){
  ensure();
  const open=fm().inbox.filter(m=>!m.done && m.actions.some(a=>a.fn==='renew'));
  if(!open.length){ go(); return; }
  ask(`재계약 협상 ${open.length}건이 남아 있습니다 (${open.map(m=>m.actions[0].arg.n).join(', ')}).\n지금 다음 시즌을 시작하면 이 선수들은 FA로 떠납니다.`, '다음 시즌 시작', go);
}
function onNewSeason(){
  const f=fm(); seasonStart(false);
  send('단장','🔥',`${state.year} 스토브리그`, `새 시즌 준비 기간입니다. FA 시장·외국인 선수·트레이드를 정리하고, 전지훈련 방향을 정해 스프링캠프로 떠나세요.`, []);
  const n=f.offseasonNews||{left:[],retired:[]};
  const fn=f.farmNews||{up:[],retired:[],cut:[]};
  send('스카우트 팀장','🎓',`${state.year} 신인 입단`,
    `드래프트 지명 신인 ${(f.newRookies||[]).length}명이 2군에 합류했습니다.${f.draftAutoN? ` (스카우트 팀이 ${f.draftAutoN}명을 대신 지명)`:''}\n\n${(f.newRookies||[]).map(x=>'• '+x).join('\n')}` +
    (fn.up.length? `\n\n1군 인원을 채우려 2군에서 올린 선수: ${fn.up.join(', ')}`:'') + (fn.retired.length? `\n2군 은퇴: ${fn.retired.join(', ')}`:'') + (fn.cut.length? `\n2군 정리(방출): ${fn.cut.join(', ')}`:'') +
    (n.left.length? `\n\nFA로 떠난 선수: ${n.left.join(', ')}`:'') + (n.retired.length? `\n은퇴한 선수: ${n.retired.join(', ')}`:'') +
    (n.signed&&n.signed.length? `\n다른 구단의 FA 계약: ${n.signed.join(', ')}`:''), []);
}

// ---------- team meeting ----------
function recentRecord(){
  const gs=state.schedule.filter(g=>g.played&&(g.home===USER||g.away===USER)).slice(-5);
  return gs.reduce((a,g)=>{ const us=g.home===USER?g.hr:g.ar, th=g.home===USER?g.ar:g.hr; if(us>th)a.w++; else if(us<th)a.l++; return a; },{w:0,l:0});
}
function meetingReady(){ return userGamesPlayed()-fm().lastMeeting>=10; }
function teamMeeting(){
  if(!meetingReady()){ notify('팀 미팅은 10경기에 한 번만 열 수 있습니다.'); return; }
  const rr=recentRecord();
  modal(`<span class="closeX" onclick="App.closeModal()">×</span><h2>📣 팀 미팅</h2>
    <div class="muted">최근 5경기 ${rr.w}승 ${rr.l}패 · 선수단 평균 사기 ${moraleLabel(avgMorale(USER))}</div>
    <div class="hint" style="margin:10px 0">선수단에게 어떤 메시지를 전하시겠습니까? 성격에 따라 반응이 다릅니다.</div>
    <div class="grid" style="gap:8px">
      <button class="btn" onclick="FM.meeting('praise')">👏 칭찬과 격려 — "잘하고 있다, 이대로 가자"</button>
      <button class="btn" onclick="FM.meeting('demand')">🔥 분발 촉구 — "이 정도로는 안 된다"</button>
      <button class="btn" onclick="FM.meeting('calm')">🧘 평정심 유지 — "한 경기씩 집중하자"</button>
    </div>`);
}
function meeting(kind){
  const f=fm(), rr=recentRecord(), good=rr.w>=3;
  let pos=0,neg=0;
  allPlayers(USER).forEach(p=>{
    const k=pers(p).k; let d;
    if(kind==='praise') d = good? 4 : 2;
    else if(kind==='demand') d = good? -3 : (k==='승부욕'||k==='리더형')? 6 : k==='예민함'? -4 : 3;
    else d = k==='예민함'? 4 : 2;
    p.mor=clampN(K.mor(p)+d,5,99); if(d>0)pos++; else neg++;
  });
  f.lastMeeting=userGamesPlayed();
  closeModal();
  send('수석코치','📋','팀 미팅 결과',
    `선수 ${pos}명이 긍정적으로 반응했고, ${neg}명은 불만을 보였습니다.\n` +
    (kind==='demand'&&good? '좋은 흐름에서의 질책에 선수들이 의아해했습니다.' : kind==='praise'&&!good? '부진 중의 칭찬이라 효과가 크지 않았습니다.' : '메시지가 잘 전달되었습니다.'), []);
  render();
}

// ---------- individual talk / actions from the profile ----------
function talk(n, kind){
  const p=findPlayer(USER,n); if(!p) return;
  const f=fm(), ug=userGamesPlayed(), key='talk|'+n;
  if(ug-(f.lastTalk[key]||-99)<10){ notify('같은 선수와의 면담은 10경기에 한 번만 할 수 있습니다.'); return; }
  f.lastTalk[key]=ug;
  const rt=ratingsOf(USER,n), form=rt&&rt.last.length? rt.last.reduce((a,b)=>a+b,0)/rt.last.length : 6.3;
  const k=pers(p).k; let d, msg;
  if(kind==='praise'){ d = form>=6.6? 6 : 2; if(k==='예민함') d+=3; msg = form>=6.6? '칭찬에 고무되었습니다.' : '최근 부진을 알기에 칭찬이 조금 어색했습니다.'; }
  else { d = form<6.0? (k==='승부욕'?7:k==='예민함'?-9:2) : -6; msg = d>0? '질책을 받아들이고 각오를 다졌습니다.' : '부당하다고 느끼고 있습니다.'; }
  p.mor=clampN(K.mor(p)+d,5,99);
  send(n,'🗣',`${n}과(와)의 면담`,`${n}이(가) ${msg} (사기 ${d>=0?'+':''}${d})`,[]);
  closeModal(); showProfile(USER,n); render();
}
function toggleRest(n){ const f=fm(), i=f.restNext.indexOf(n); if(i>=0)f.restNext.splice(i,1); else f.restNext.push(n); closeModal(); showProfile(USER,n); render(); }
function toggleList(n){ const p=findPlayer(USER,n); if(!p) return; p.listed=!p.listed; closeModal(); showProfile(USER,n); render(); }
function setAutoRest(v){ fm().autoRest=!!v; render(); }
// release a player: he leaves now, the club pays half of what's left on his deal
function releasePlayer(n){
  const p=findPlayer(USER,n); if(!p) return;
  const why=releaseBlock(p); if(why){ notify(why); return; }
  const cost=Math.round(p.sal*Math.max(1,p.yrs)*0.5*10)/10;
  ask(`${n}을(를) 방출합니다. 잔여 계약의 절반인 ${cost}억 원을 위약금으로 지급합니다.`, '방출', ()=>doRelease(p,n,cost));
}
// a 1군 release must leave a legal roster: the entry minimums, five starters, and enough healthy bodies
function releaseBlock(p){
  const r=K.ROSTERS[USER]; if(allPlayers(USER).indexOf(p)<0) return '';
  if(p.type==='B' && r.batters.filter(x=>!K.isInjured(x)).length<=10) return '타자가 부족해 방출할 수 없습니다 (건강한 타자 최소 10명).';
  if(p.type==='P' && r.pitchers.filter(x=>!K.isInjured(x)).length<=8) return '투수가 부족해 방출할 수 없습니다 (건강한 투수 최소 8명).';
  const why=entryProblem(USER,[p],[]); return why? why+' 2군 선수를 먼저 올리세요.' : '';
}
function doRelease(p,n,cost){
  const r=K.ROSTERS[USER];
  if(!findPlayer(USER,n)) return;
  const why=releaseBlock(p); if(why){ notify(why); closeModal(); return; }
  if(p.type==='B') r.batters=r.batters.filter(x=>x!==p); else r.pitchers=r.pitchers.filter(x=>x!==p);
  r.farm=farmOf(USER).filter(x=>x!==p);
  const f=fm(); f.fin.balance-=cost; f.fin.exp+=cost;
  f.promises=f.promises.filter(pr=>pr.n!==n); f.restNext=f.restNext.filter(x=>x!==n);
  const c=state.cfgs[USER];
  if(c.lineup.indexOf(n)>=0||c.rotation.indexOf(n)>=0||c.bullpen.indexOf(n)>=0||c.closer===n){
    const d=K.defaultLineup(USER); state.cfgs[USER]={teamId:USER,lineup:d.lineup.slice(),positions:d.positions.slice(),rotation:d.rotation.slice(),bullpen:d.bullpen.slice(),closer:d.closer};
  }
  send('단장','📤',`${n} 방출`,`${n}을(를) 방출했습니다. 위약금 ${cost}억 원이 지급되었습니다.${c.lineup.indexOf(n)>=0?'\n라인업이 자동 재구성되었습니다.':''}`,[]);
  closeModal(); render();
}

