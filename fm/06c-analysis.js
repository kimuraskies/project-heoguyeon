// ---------- opponent plans (the scouting briefing) and the player analysis report ----------
// A plan is stored per opposing club: plans[opp] = {vs:{batter:{ap,zone}}, pit:{pitcher:{ap,look}}}.
const AP_L={attack:'정면',nibble:'유인',walk:'거르기'}, ZONE_L={'':'맡김',in:'몸쪽',out:'바깥쪽'}, PAP_L={'':'보통',first:'초구 공략',patient:'공 보기'}, LOOK_L={'':'맡김',fast:'빠른 공',break:'변화구'};
function planOf(opp){ const f=fm(); f.plans=f.plans||{}; return f.plans[opp]||(f.plans[opp]={vs:{},pit:{}}); }
function setPlan(opp,kind,n,key,v){ const p=planOf(opp), o=p[kind][n]||(p[kind][n]={}); if(v) o[key]=v; else delete o[key]; if(!Object.keys(o).length) delete p[kind][n]; refreshBrief(opp); saveNow(); }
function refreshBrief(opp){ const e=document.getElementById('briefCard'); if(e) e.outerHTML=briefingCard(opp); }
function recBat(p){ return {ap:p.eye<=62?'nibble':(p.eye>=74&&p.pow<=68)?'attack':'attack', zone:p.pow>=78?'out':p.con<=66?'in':''}; }
function recPit(p){ return {ap:p.ctl>=72?'first':p.ctl<=62?'patient':'', look:((70-p.stu)/500+0.002)>=((p.mov-70)/500)?'fast':'break'}; }
function batReason(p){ return p.eye<=62?`선구안이 약합니다(${toFM(p.eye)}). 유인구가 통합니다`:p.pow>=78?`장타력이 있습니다(${toFM(p.pow)}). 바깥쪽 승부를 권합니다`:p.con<=66?`컨택이 약합니다(${toFM(p.con)}). 몸쪽으로 붙이세요`:'약점이 뚜렷하지 않습니다'; }
function applyPlanRec(opp){ const r=K.ROSTERS[opp], c=state.cfgs[opp], p=planOf(opp);
  c.lineup.forEach(n=>{ const x=r.batters.find(b=>b.n===n); if(x) p.vs[n]=recBat(x); });
  r.pitchers.filter(x=>x.role==='SP').forEach(x=>{ p.pit[x.n]=recPit(x); });
  refreshBrief(opp); saveNow(); if(window.Track) Track.action('plan_rec'); }
const toFM=attr20;
const chipRow=(cur,labels,click)=>`<div class="bf-chips" role="group">${Object.keys(labels).map(k=>`<button type="button" aria-pressed="${String(cur||'')===k}" onclick="${click(k)}">${labels[k]}</button>`).join('')}</div>`;
function briefingCard(oppArg){
  ensure();
  let opp=oppArg, sp=null;
  const pm=pendingMatch(); if(pm){ opp=pm.home===USER?pm.away:pm.home; sp=projectedSP(opp); }
  if(!opp) return '';
  const r=K.ROSTERS[opp], c=state.cfgs[opp], plan=planOf(opp), know=Math.round(knowOf(opp)*100), qo=q(opp);
  const set=(kind,n,key,v)=>`FM.setPlan('${qo}','${kind}','${q(n)}','${key}','${v}')`;
  const rows=c.lineup.map((n,i)=>{ const p=r.batters.find(b=>b.n===n); if(!p) return ''; const h=K.handsOf(n), d=plan.vs[n]||{}, rc=recBat(p);
    return `<div class="bf-row"><div><b>${i+1}. ${esc(n)}</b><small>${h.b}타 · ${esc(p.pos)} · 추천 ${AP_L[rc.ap]}${rc.zone?' · '+ZONE_L[rc.zone]:''}</small><small>${batReason(p)}</small></div>
      ${chipRow(d.ap,{'':'맡김',attack:'정면',nibble:'유인',walk:'거르기'},k=>set('vs',n,'ap',k))}${chipRow(d.zone,ZONE_L,k=>set('vs',n,'zone',k))}</div>`; }).join('');
  const sps=sp?[r.pitchers.find(x=>x.n===sp)].filter(Boolean):[];
  const prow=sps.map(p=>{ const d=plan.pit[p.n]||{}, h=K.handsOf(p.n), rc=recPit(p);
    return `<div class="bf-row"><div><b>${esc(p.n)}</b><small>${h.t}투 · 구위 ${toFM(p.stu)} 제구 ${toFM(p.ctl)} 무브 ${toFM(p.mov)}</small><small>추천 ${PAP_L[rc.ap]} · ${LOOK_L[rc.look]}</small></div>
      ${chipRow(d.ap,PAP_L,k=>set('pit',p.n,'ap',k))}${chipRow(d.look,LOOK_L,k=>set('pit',p.n,'look',k))}</div>`; }).join('');
  const ana=staffOf(USER).ana;
  return `<section class="card bf" id="briefCard"><h3>전력분석 브리핑 <span class="tag">${esc(r.name)} · 분석도 ${know}%</span></h3>
    <p class="hint">${esc(ana.n)} 전력분석팀장: 지시는 ${esc(r.name)}를 다시 만날 때도 유지됩니다. 지시 효과는 분석도만큼만 반영되고, 설정하지 않아도 불이익은 없습니다.</p>
    <button type="button" class="btn primary" onclick="FM.applyPlanRec('${qo}')">코치 추천 모두 적용</button>
    <h4 class="st-group">상대 선발 공략 (타격·주루코치)</h4>${prow||'<div class="muted">상대 선발이 아직 정해지지 않았습니다.</div>'}
    <h4 class="st-group">상대 타선 대응 (배터리코치)</h4>${rows}</section>`;
}

// ----- analysis -----
function posValue(p){ return ({C:9,SS:7,'2B':2.5,'3B':2.5,CF:2.5,LF:-7,RF:-7,'1B':-12,DH:-17})[p.pos]||0; }
// a simple value estimate: runs above average at the plate, position and glove, plus replacement level
function batWAR(team,p,s,env){ const m=batMetrics(s,env), PA=s.PA, g=s.G||0;
  const off=(m.woba-env.woba)/1.2*PA, pos=posValue(p)*PA/600, fld=(p.fld-70)*0.15*g/144, rep=PA/600*20;
  return (off+pos+fld+rep)/10; }
function pitWAR(s,env){ const ip=s.OUT/3, m=pitMetrics(s,env); return ((env.era+1-m.fip)*ip/9)/10; }
function leaguePool(type){ const out=[], g=Math.max(1,(state.season[USER].W+state.season[USER].L+state.season[USER].T));
  K.TEAM_IDS.forEach(t=>{ const o=state.season[t][type==='B'?'bat':'pit']; for(const n in o){ const s=o[n]; if(type==='B'? s.PA>=g*1.5 : s.OUT>=g*1.5) out.push({t,n,s}); } });
  return out; }
function pctRank(arr,v,lowGood){ if(!arr.length) return 50; const b=arr.filter(x=>lowGood? x>v : x<v).length; return Math.round(b*100/arr.length); }
function trendOf(team,p){ const a=(state.logs||{})[team+'|'+p.n]||[]; const out=[], W=5;
  if(p.type==='B'){ for(let i=W-1;i<a.length;i++){ let t={PA:0,AB:0,H:0,TB:0,BB:0}; a.slice(i-W+1,i+1).forEach(e=>{ const b=e.b; t.PA+=b[0];t.AB+=b[1];t.H+=b[2];t.TB+=b[2]+b[3]+2*b[4]+3*b[5];t.BB+=b[8]; }); out.push(t.PA? (t.H+t.BB)/t.PA+(t.AB?t.TB/t.AB:0) : 0); } return {v:out,l:'최근 5경기 이동 OPS',fmt:x=>x.toFixed(3),base:0.72}; }
  for(let i=W-1;i<a.length;i++){ let O=0,E=0; a.slice(i-W+1,i+1).forEach(e=>{ O+=e.p[0]; E+=e.p[2]; }); out.push(O? E*27/O : 0); } return {v:out,l:'최근 5경기 이동 ERA',fmt:x=>x.toFixed(2),base:4.3}; }
function sparkSVG(tr){ const v=tr.v; if(v.length<3) return '<div class="muted">5경기를 넘게 뛰면 흐름이 나타납니다.</div>';
  const W=520,H=120,l=38,r=10,t=8,b=18, all=v.concat([tr.base]), lo=Math.min(...all), hi=Math.max(...all), pad=(hi-lo)*0.12||0.05, a=lo-pad, z=hi+pad;
  const x=i=>l+i*(W-l-r)/(v.length-1), y=u=>t+(z-u)*(H-t-b)/(z-a), pts=v.map((u,i)=>x(i).toFixed(1)+','+y(u).toFixed(1)).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="an-spark" role="img" aria-label="${tr.l} 마지막 값 ${tr.fmt(v[v.length-1])}">
    <line x1="${l}" x2="${W-r}" y1="${y(tr.base)}" y2="${y(tr.base)}" stroke="var(--dim)" stroke-dasharray="3 4"/>
    <text x="${l-5}" y="${y(z-pad)+4}" text-anchor="end" font-size="11" fill="var(--dim)">${tr.fmt(z-pad)}</text><text x="${l-5}" y="${y(a+pad)+4}" text-anchor="end" font-size="11" fill="var(--dim)">${tr.fmt(a+pad)}</text>
    <polygon points="${l},${H-b} ${pts} ${x(v.length-1)},${H-b}" fill="var(--team-ink)" opacity=".12"/><polyline points="${pts}" fill="none" stroke="var(--team-ink)" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${x(v.length-1)}" cy="${y(v[v.length-1])}" r="4" fill="var(--team-ink)"/></svg><div class="hint">${tr.l} · 점선 리그 평균 수준 · 최근 값 ${tr.fmt(v[v.length-1])}</div>`; }
function splitRows(s,defs){ return defs.map(([k,l])=>{ const PA=s[k+'_PA']||0; if(!PA) return `<tr><td>${l}</td><td colspan="4" class="muted">자료 없음</td></tr>`;
    const AB=s[k+'_AB']||0,H=s[k+'_H']||0,TB=s[k+'_TB']||0,BB=s[k+'_BB']||0, ops=(H+BB)/PA+(AB?TB/AB:0);
    return `<tr><td>${l}</td><td>${PA}</td><td>${AB?fmtAvg(H/AB):'-'}</td><td>${ops.toFixed(3)}</td><td>${s[k+'_SO']||0}</td></tr>`; }).join(''); }
function diagnose(team,p,s,env){ const out=[], mine=team===USER, act=(l,fn)=>mine?{l,fn}:null, n=q(p.n);
  if(p.type==='B'){ const m=batMetrics(s,env); if(s.PA<40) return out;
    if(m.babip>=0.360) out.push(['타격코치',`BABIP ${fmtAvg(m.babip)}로 평소보다 타구 운이 따르는 구간일 수 있습니다.`,act('컨택 훈련 지정',`FM.setTrain('${n}','f','con')`)]);
    if(m.babip<=0.255) out.push(['타격코치',`BABIP ${fmtAvg(m.babip)}로 타구 운이 따르지 않고 있습니다. 기용을 유지해도 됩니다.`,null]);
    if(m.k>=0.26) out.push(['타격코치',`삼진율 ${pct(m.k)}로 높습니다. 컨택 훈련을 건의합니다.`,act('컨택 훈련 지정',`FM.setTrain('${n}','f','con')`)]);
    if(m.bb<=0.05) out.push(['전력분석팀장',`볼넷율 ${pct(m.bb)}입니다. 선구안 훈련이 도움이 됩니다.`,act('선구안 훈련 지정',`FM.setTrain('${n}','f','eye')`)]);
    if((s.LC_PA||0)>=12){ const o=((s.LC_H||0)+(s.LC_BB||0))/s.LC_PA+((s.LC_AB)?(s.LC_TB||0)/s.LC_AB:0); if(o<0.55) out.push(['수석코치',`7회 이후 접전 OPS ${o.toFixed(3)}로 부진합니다.`,act('다음 경기 휴식',`FM.restOne('${n}')`)]); }
    const lo=(s.vL_PA||0)>=20&&(s.vR_PA||0)>=20? [(s.vL_H+s.vL_BB)/s.vL_PA,(s.vR_H+s.vR_BB)/s.vR_PA] : null;
    if(lo&&Math.abs(lo[0]-lo[1])>=0.09) out.push(['전력분석팀장',`${lo[0]>lo[1]?'좌투':'우투'} 상대 출루가 눈에 띄게 좋습니다. 상대 선발에 맞춰 타순을 바꿔 볼 만합니다.`,act('라인업으로',`App.closeModal();App.tab('lineup')`)]);
    if(out.some(x=>x[2]&&/restOne/.test(x[2].fn))) out.forEach(x=>{ x[1]=x[1].replace(' 기용을 유지해도 됩니다.',''); });
  } else { const m=pitMetrics(s,env); if(s.OUT<45) return out;
    if(m.era-m.fip>=0.8) out.push(['투수코치',`ERA ${f2(m.era)}가 FIP ${f2(m.fip)}보다 높습니다. 내용은 결과보다 낫습니다.`,null]);
    if(m.fip-m.era>=0.8) out.push(['투수코치',`ERA ${f2(m.era)}가 FIP ${f2(m.fip)}보다 낮습니다. 결과가 내용보다 좋은 구간입니다.`,null]);
    if(m.bbp>=0.11) out.push(['투수코치',`볼넷 비율 ${pct(m.bbp)}입니다. 제구 훈련을 건의합니다.`,act('제구 훈련 지정',`FM.setTrain('${n}','f','ctl')`)]);
    if(m.kp-m.bbp<=0.05) out.push(['배터리코치',`K-BB% ${pct(m.kp-m.bbp)}로 낮습니다. 구위 훈련이 필요합니다.`,act('구위 훈련 지정',`FM.setTrain('${n}','f','stu')`)]);
  }
  return out;
}
function restOne(n){ const f=fm(); if(f.restNext.indexOf(n)<0) f.restNext.push(n); notify(`${n} 선수는 다음 경기에서 쉽니다.`); }
function analysisPanel(team,p){
  const isB=p.type==='B', s=isB? state.season[team].bat[p.n] : state.season[team].pit[p.n], env=leagueEnv();
  if(!s||(isB? !s.PA : !s.G)) return '<div class="muted">이번 시즌 기록이 쌓이면 분석이 나타납니다.</div>';
  const pool=leaguePool(p.type); let items, war;
  if(isB){ const m=batMetrics(s,env), M=pool.map(x=>batMetrics(x.s,env)); war=batWAR(team,p,s,env);
    items=[['wRC+',m.wrc,pctRank(M.map(x=>x.wrc),m.wrc)],['wOBA',f3(m.woba),pctRank(M.map(x=>x.woba),m.woba)],['ISO',m.iso.toFixed(3),pctRank(M.map(x=>x.iso),m.iso)],['BABIP',f3(m.babip),pctRank(M.map(x=>x.babip),m.babip)],['볼넷율',pct(m.bb),pctRank(M.map(x=>x.bb),m.bb)],['삼진 회피',pct(m.k),pctRank(M.map(x=>x.k),m.k,true)]];
  } else { const m=pitMetrics(s,env), M=pool.map(x=>pitMetrics(x.s,env)); war=pitWAR(s,env);
    items=[['FIP',f2(m.fip),pctRank(M.map(x=>x.fip),m.fip,true)],['ERA',f2(m.era),pctRank(M.map(x=>x.era),m.era,true)],['WHIP',f2(m.whip),pctRank(M.map(x=>x.whip),m.whip,true)],['K-BB%',pct(m.kp-m.bbp),pctRank(M.map(x=>x.kp-x.bbp),m.kp-m.bbp)],['K/9',f2(m.k9),pctRank(M.map(x=>x.k9),m.k9)],['피홈런/9',f2(m.hr9),pctRank(M.map(x=>x.hr9),m.hr9,true)]]; }
  const defs=isB?[['vL','좌투 상대'],['vR','우투 상대'],['RP','득점권'],['LC','7회 이후 접전']]:[['bL','좌타 상대'],['bR','우타 상대']];
  const dx=diagnose(team,p,s,env);
  return `<div class="an"><div class="an-head"><b>WAR ${war.toFixed(1)}</b><span class="muted">근사치 · 리그 비교 대상 ${pool.length}명</span></div>
    <div class="an-grid"><div>${items.map(([l,v,r])=>`<div class="an-pct"><span>${l}</span><b>${v}</b><div class="st-bar" role="img" aria-label="${l} 리그 백분위 ${r}"><i style="width:${r}%"></i></div><em>${r}</em></div>`).join('')}</div>
    <div>${sparkSVG(trendOf(team,p))}</div></div>
    ${team===USER?`<div style="overflow-x:auto;margin-top:12px"><table><thead><tr><th>상황</th><th>타석</th><th>타율</th><th>OPS</th><th>삼진</th></tr></thead><tbody>${splitRows(s,defs)}</tbody></table></div>`:''}
    <h4 class="st-group">코치 진단</h4>${dx.length? dx.map(([c,t,a])=>`<div class="an-dx"><div><small>${c}</small><p>${t}</p></div>${a?`<button class="btn" onclick="${a.fn}">${a.l}</button>`:''}</div>`).join('') : '<div class="muted">아직 표본이 적거나 눈에 띄는 점이 없습니다.</div>'}</div>`;
}
let saberSort={B:'war',P:'war'};
function setSaberSort(t,k){ saberSort[t]=k; render(); }
function saberTeam(){
  ensure(); const env=leagueEnv(), s=state.season[USER];
  const bats=K.ROSTERS[USER].batters.filter(p=>s.bat[p.n]&&s.bat[p.n].PA>=10).map(p=>{ const x=s.bat[p.n], m=batMetrics(x,env); return {p,n:p.n,pa:x.PA,wrc:m.wrc,woba:m.woba,iso:m.iso,k:m.k,bb:m.bb,war:batWAR(USER,p,x,env)}; });
  const arms=K.ROSTERS[USER].pitchers.filter(p=>s.pit[p.n]&&s.pit[p.n].OUT>=3).map(p=>{ const x=s.pit[p.n], m=pitMetrics(x,env); return {p,n:p.n,ip:x.OUT/3,out:x.OUT,fip:m.fip,kb:m.kp-m.bbp,whip:m.whip,era:m.era,war:pitWAR(x,env)}; });
  if(!bats.length&&!arms.length) return '';
  const lowGood={fip:1,era:1,whip:1,k:1};
  const srt=(a,k)=>a.slice().sort((x,y)=>lowGood[k]? x[k]-y[k] : y[k]-x[k]);
  const th=(t,k,l)=>`<th><button type="button" class="an-sort${saberSort[t]===k?' on':''}" onclick="FM.setSaberSort('${t}','${k}')">${l}</button></th>`;
  const nm=x=>`<td class="name"><button type="button" class="an-link" onclick="FM.showProfile('${USER}','${q(x.n)}')">${esc(x.n)}</button></td>`;
  return `<div class="card" style="margin-bottom:14px"><h3>팀 세이버 리포트 <span class="tag">표 머리글을 누르면 정렬 · WAR은 근사치</span></h3>
    <div style="overflow-x:auto"><table><thead><tr><th class="name">타자</th>${th('B','pa','타석')}${th('B','wrc','wRC+')}${th('B','woba','wOBA')}${th('B','iso','ISO')}${th('B','bb','BB%')}${th('B','k','K%')}${th('B','war','WAR')}</tr></thead><tbody>
    ${srt(bats,saberSort.B).map(x=>`<tr>${nm(x)}<td>${x.pa}</td><td>${x.wrc}</td><td>${f3(x.woba)}</td><td>${x.iso.toFixed(3)}</td><td>${pct(x.bb)}</td><td>${pct(x.k)}</td><td><b>${x.war.toFixed(1)}</b></td></tr>`).join('')}</tbody></table></div>
    <div style="overflow-x:auto;margin-top:12px"><table><thead><tr><th class="name">투수</th>${th('P','out','이닝')}${th('P','era','ERA')}${th('P','fip','FIP')}${th('P','whip','WHIP')}${th('P','kb','K-BB%')}${th('P','war','WAR')}</tr></thead><tbody>
    ${srt(arms,saberSort.P).map(x=>`<tr>${nm(x)}<td>${ipStr(x.out)}</td><td>${f2(x.era)}</td><td>${f2(x.fip)}</td><td>${f2(x.whip)}</td><td>${pct(x.kb)}</td><td><b>${x.war.toFixed(1)}</b></td></tr>`).join('')}</tbody></table></div></div>`;
}
