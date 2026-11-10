// ---------- league news hub, year-end awards and the season recap ----------
function powerRank(){ return K.TEAM_IDS.map(t=>{ const s=state.season[t], g=s.W+s.L+s.T||1; return {t,w:s.W,l:s.L,pct:s.W/Math.max(1,s.W+s.L),rd:(s.RF-s.RA)/g}; }).sort((a,b)=>(b.pct+b.rd*0.03)-(a.pct+a.rd*0.03)); }
function weekMVP(){ let best=null; const env=leagueEnv(); for(const k in state.logs||{}){ const [t,n]=k.split('|'), a=state.logs[k].slice(-6); if(!a.length||!a[0].b) continue;
    let PA=0,AB=0,H=0,TB=0,BB=0,HR=0; a.forEach(e=>{ const b=e.b; PA+=b[0];AB+=b[1];H+=b[2];TB+=b[2]+b[3]+2*b[4]+3*b[5];BB+=b[8];HR+=b[5]; });
    if(PA<18) continue; const ops=(H+BB)/PA+(AB?TB/AB:0); if(!best||ops>best.ops) best={t,n,ops,H,HR,AB}; }
  return best; }
function newsHub(){
  ensure(); const f=fm(), list=f.feed||[], lead=list[0], pr=powerRank(), mvp=weekMVP(), played=state.season[USER].W+state.season[USER].L+state.season[USER].T;
  if(!played&&!lead) return '';
  const fa=(f.fa||[]).length, rumor=state.phase==='stove'&&fa? `FA 시장에 ${fa}명이 남아 있습니다.` : (f.inbox||[]).find(m=>/트레이드/.test(m.subject||''))? '트레이드 시장이 움직이고 있습니다.' : '';
  return `<section class="news-hub"><article class="news-lead"><p class="eyebrow">KBO DAILY · ${state.year}</p><h2>${esc(lead?lead.title:state.year+' 시즌 개막을 앞두고')}</h2><p>${esc(lead?lead.body.split('\n').slice(0,2).join(' '):'각 구단이 마지막 점검에 들어갔습니다.')}</p>${rumor?`<p class="hint">${esc(rumor)}</p>`:''}</article>
    <aside class="news-side">${mvp?`<div><small>주간 MVP</small><b>${esc(mvp.n)}</b><span>${esc(mvp.t)} · 최근 6경기 ${mvp.H}/${mvp.AB}, ${mvp.HR}홈런, OPS ${mvp.ops.toFixed(3)}</span></div>`:''}
    ${played?`<div><small>파워 랭킹</small><ol>${pr.slice(0,5).map(x=>`<li${x.t===USER?' class="me"':''}>${esc(x.t)} <span>${x.w}-${x.l}</span></li>`).join('')}</ol></div>`:''}</aside></section>`;
}
function winnerBy(arr,score){ return arr.slice().sort((a,b)=>score(b)-score(a))[0]||null; }
function seasonAwards(){
  const env=leagueEnv(), B=[], P=[]; K.TEAM_IDS.forEach(t=>{ const s=state.season[t];
    for(const n in s.bat){ const x=s.bat[n], p=findPlayer(t,n); if(x.PA>0&&p) B.push({t,n,p,x,m:batMetrics(x,env),war:batWAR(t,p,x,env)}); }
    for(const n in s.pit){ const x=s.pit[n], p=findPlayer(t,n); if(x.OUT>0&&p) P.push({t,n,p,x,m:pitMetrics(x,env),war:pitWAR(x,env)}); } });
  const qB=B.filter(a=>a.x.PA>=446), qP=P.filter(a=>a.x.OUT>=432), all=B.concat(P);
  const line=(l,a,v)=>a?{l,n:a.n,t:a.t,v}:null;
  const top=(arr,k,l,fmt)=>{ const a=winnerBy(arr,x=>x.x[k]||0); return a&&a.x[k]?line(l,a,fmt?fmt(a):a.x[k]):null; };
  // a rookie has almost no first-team record before this year (real rows: PA index 3, outs index 7)
  const fresh=a=>{ if(((state.hist||{})[a.n]||[]).some(h=>h.y<state.year)) return false; const c=window.KBO_CAREER&&window.KBO_CAREER[a.n]; if(!c) return true;
    return c.t==='B'? c.y.reduce((s,r)=>s+r[3],0)<60 : c.y.reduce((s,r)=>s+r[7],0)<90; };
  const mvp=winnerBy(all,a=>a.war), roy=winnerBy(all.filter(a=>a.p.age<=25&&fresh(a)),a=>a.war);
  const avgK=winnerBy(qB,a=>a.m.avg), eraK=winnerBy(qP,a=>-a.m.era);
  const titles=[avgK&&line('타율',avgK,fmtAvg(avgK.m.avg)),top(B,'HR','홈런'),top(B,'RBI','타점'),top(B,'SB','도루'),top(P,'W','다승'),eraK&&line('평균자책',eraK,f2(eraK.m.era)),top(P,'SO','탈삼진'),top(P,'SV','세이브'),top(P,'HD','홀드')].filter(Boolean);
  const pos=['C','1B','2B','3B','SS','LF','CF','RF','DH'], gg=pos.map(k=>{ const a=winnerBy(B.filter(x=>x.p.pos===k&&x.x.PA>=200),x=>x.war); return a?{pos:k,n:a.n,t:a.t,war:a.war}:null; }).filter(Boolean);
  const best=winnerBy(P.filter(x=>x.p.role==='SP'&&x.x.OUT>=300),x=>x.war); if(best) gg.unshift({pos:'P',n:best.n,t:best.t,war:best.war});
  return {year:state.year,mvp:mvp&&{n:mvp.n,t:mvp.t,war:mvp.war},roy:roy&&{n:roy.n,t:roy.t,war:roy.war},titles,gg};
}
function seasonRecap(){ const f=fm(), s=state.season[USER], rank=standings().findIndex(x=>x.t===USER)+1, env=leagueEnv();
  const bats=K.ROSTERS[USER].batters.filter(p=>s.bat[p.n]&&s.bat[p.n].PA>=100).map(p=>({n:p.n,war:batWAR(USER,p,s.bat[p.n],env)})).sort((a,b)=>b.war-a.war);
  const grown=allPlayers(USER).map(p=>({n:p.n,g:(p.grow||[]).filter(g=>g[0]===state.year).length})).filter(x=>x.g>0).sort((a,b)=>b.g-a.g).slice(0,3);
  return {rank,W:s.W,L:s.L,T:s.T,conf:f.board.conf,champ:state.champion===USER,best:bats[0]||null,grown}; }
ACTIONS.openAwards=()=>{ setTimeout(showAwards,0); return '시상식장으로 이동했습니다.'; };
function awardsAfterSeason(){ const f=fm(); try{ f.awards=f.awards||{}; f.awards[state.year]={a:seasonAwards(),r:seasonRecap()};
    const a=f.awards[state.year].a; send('KBO','🏆',`${state.year} 연말 시상식`,`MVP ${a.mvp?a.mvp.n+' ('+a.mvp.t+')':'-'} · 신인왕 ${a.roy?a.roy.n+' ('+a.roy.t+')':'-'}`,[{label:'시상식 보기',fn:'openAwards',arg:{}}]); }catch(e){ console.error('awards skipped',e); } }
function showAwards(y){ const f=fm(), yr=y||state.year, d=(f.awards||{})[yr]||(f.awards||{})[yr-1]; if(!d) return; const a=d.a, r=d.r;
  modal(`<span class="closeX" onclick="App.closeModal()" role="button" tabindex="0" aria-label="닫기">×</span><h2>${a.year} 연말 시상식</h2>
    <div class="aw-hero"><div><small>MVP</small><b>${a.mvp?esc(a.mvp.n):'-'}</b><span>${a.mvp?esc(a.mvp.t)+' · WAR '+a.mvp.war.toFixed(1):''}</span></div><div><small>신인왕</small><b>${a.roy?esc(a.roy.n):'-'}</b><span>${a.roy?esc(a.roy.t)+' · WAR '+a.roy.war.toFixed(1):'해당자 없음'}</span></div></div>
    <h4 class="st-group">타이틀</h4><div class="aw-list">${a.titles.map(x=>`<div><small>${x.l}</small><b>${esc(x.n)}</b><span>${esc(x.t)} · ${x.v}</span></div>`).join('')}</div>
    <h4 class="st-group">골든글러브</h4><div class="aw-list">${a.gg.map(x=>`<div><small>${x.pos}</small><b>${esc(x.n)}</b><span>${esc(x.t)}</span></div>`).join('')}</div>
    <h4 class="st-group">${esc(K.ROSTERS[USER].name)} 시즌 리캡</h4><p>${r.champ?'🏆 통합 우승 · ':''}정규시즌 ${r.rank}위 · ${r.W}승 ${r.L}패 ${r.T}무 · 이사회 신뢰 ${r.conf}</p>
    ${r.best?`<p class="muted">팀 WAR 1위 ${esc(r.best.n)} (${r.best.war.toFixed(1)})</p>`:''}${r.grown.length?`<p class="muted">올해 가장 많이 성장: ${r.grown.map(x=>esc(x.n)+' +'+x.g).join(', ')}</p>`:''}`); }
function coachInterview(role,n){ const c=coachPool().find(x=>x.role===role&&x.n===n); if(!c) return; coachInit(c); closeModal();
  modal(`<span class="closeX" onclick="App.closeModal()" role="button" tabindex="0" aria-label="닫기">×</span><h2>${esc(n)} 면접</h2><p class="muted">우리 팀에서 가장 중요하게 볼 것을 물었습니다. 답에 따라 연봉 요구가 달라집니다.</p>
    <div class="grid" style="gap:8px;margin-top:8px">${COACH_STYLES.map(s=>`<button class="btn" onclick="FM.coachAnswer('${role}','${q(n)}','${s}')">${{'육성형':'어린 선수를 키워 주십시오','성적형':'올해 성적이 먼저입니다','데이터형':'데이터로 설득해 주십시오','올드스쿨':'기본기와 규율이 우선입니다'}[s]}</button>`).join('')}</div>`); }
function coachAnswer(role,n,st){ const c=coachPool().find(x=>x.role===role&&x.n===n); if(!c) return; coachInit(c); closeModal();
  if(!c.iv){ c.iv=1; c.sal=Math.round(c.sal*(c.style===st?0.9:STYLE_CLASH[c.style]===st?1.1:1)*10)/10; }
  modal(`<span class="closeX" onclick="App.closeModal()" role="button" tabindex="0" aria-label="닫기">×</span><h2>${esc(n)} 면접 결과</h2><p>${c.style===st?'철학이 잘 맞습니다. 연봉을 낮춰 합류하겠다고 합니다.':STYLE_CLASH[c.style]===st?'생각이 다릅니다. 더 많은 연봉을 원합니다.':'무난한 대화였습니다.'}</p>
    <p class="muted">성향 ${c.style} · 전문 ${c.spec} · 요구 연봉 ${c.sal}억</p><div class="st-attr" style="max-width:320px">${COACH_ATTR.map(([k,l])=>`<span>${l}</span>${bar(c.a[k],20)}<b>${c.a[k]}</b>`).join('')}</div>
    <div class="row" style="gap:8px;margin-top:12px"><button class="btn primary" onclick="FM.hireCoach('${role}','${q(n)}')">영입</button><button class="btn" onclick="FM.coachPicker('${role}')">다른 후보 보기</button></div>`); }
function coachRange(c){ const ana=coachA('ana','ana'), w=Math.max(1,Math.round((20-ana)/5)), off=hash(c.n+'r')%(w+1); return c.iv? `${c.q}` : `${clampN(c.q-off,1,20)}~${clampN(c.q-off+w,1,20)}`; }
function wpChart(wp){ if(!wp||wp.length<4) return ''; const W=560,H=110,x=i=>6+i*(W-12)/(wp.length-1),y=v=>6+(1-v)*(H-12), pts=wp.map((v,i)=>x(i).toFixed(1)+','+y(v).toFixed(1)).join(' ');
  return `<figure class="result-wp"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="승리 확률 흐름, 마지막 ${Math.round(wp[wp.length-1]*100)}%"><line x1="0" x2="${W}" y1="${y(0.5)}" y2="${y(0.5)}" stroke="var(--dim)" stroke-dasharray="3 4"/><polyline points="${pts}" fill="none" stroke="var(--team-ink)" stroke-width="2" stroke-linejoin="round"/></svg><figcaption class="hint">우리 팀 승리 확률 흐름 (점선 50%)</figcaption></figure>`; }
function coachWord(res,kind){ const c=staffOf(USER).head; coachInit(c); const us=res.home===USER?res.homeRuns:res.awayRuns, th=res.home===USER?res.awayRuns:res.homeRuns;
  const w=us>th, tb={'육성형':w?'어린 선수들이 잘 버텼습니다.':'오늘의 경험이 자산이 될 겁니다.','성적형':w?'이런 경기를 계속 잡아야 합니다.':'다음 경기는 반드시 잡아야 합니다.','데이터형':w?'준비한 대로 숫자가 나왔습니다.':'내용을 분석해 다음 경기에 반영하겠습니다.','올드스쿨':w?'선수들 투지가 좋았습니다.':'기본부터 다시 하겠습니다.'};
  return `<p class="hint">${esc(c.n)} 수석코치: "${tb[c.style]}"</p>`; }
