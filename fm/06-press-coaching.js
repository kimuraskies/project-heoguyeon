// ---------- after the game: report in the feed, sometimes an interview request ----------
function feedPush(item){ const f=fm(); f.feed=f.feed||[]; item.id=(f.feedId=(f.feedId||0)+1); f.feed.unshift(item); if(f.feed.length>160) f.feed.length=160; }
function pogOf(res,t){
  let best=null, bv=-1;
  const bx=res.box[t];
  for(const n in bx.bat){ const s=bx.bat[n]; if(s.PA>0){ const p=findPlayer(t,n); if(p){ const r=gameRating(p,s); if(r>bv){bv=r;best={n,r,line:`${s.AB}타수 ${s.H}안타${s.HR?' '+s.HR+'홈런':''}${s.RBI?' '+s.RBI+'타점':''}${s.SB?' '+s.SB+'도루':''}`};} } } }
  for(const n in bx.pit){ const s=bx.pit[n]; if(s.BF>0){ const p=findPlayer(t,n); if(p){ const r=gameRating(p,s); if(r>bv){bv=r;best={n,r,line:`${ipStr(s.OUT)}이닝 ${s.ER}실점 ${s.SO}탈삼진`};} } } }
  return best;
}
function gameReport(res,kind){
  ensure();
  if(res.home!==USER && res.away!==USER) return;
  tickClock();
  const home=res.home===USER, opp=home?res.away:res.home, us=home?res.homeRuns:res.awayRuns, th=home?res.awayRuns:res.homeRuns;
  const won=us>th, tie=us===th;
  const pog=pogOf(res,USER), opPog=pogOf(res,opp), d=res.decisions;
  const sp=home?res.homeSP:res.awaySP, sps=res.box[USER].pit[sp];
  const hrs=[]; [USER,opp].forEach(t=>{ for(const n in res.box[t].bat){ const s=res.box[t].bat[n]; if(s.HR) hrs.push(`${n}(${t})${s.HR>1?' '+s.HR+'개':''}`); } });
  const line=t=>{ if(!res.line||!res.line[t]) return ''; const a=res.line[t].slice(); if(t===res.home&&a.length<res.line[res.away].length) a.push('X'); return a.join(' '); };
  const label=kind==='spring'?'시범경기':kind==='ps'?(state.postseason&&state.postseason.cur?state.postseason.cur.name:'포스트시즌'):`${userGamesPlayed()}번째 경기`;
  const head = tie? `${K.ROSTERS[opp].name}와 ${us}:${th} 무승부` : won? `${K.ROSTERS[opp].name} 꺾고 ${us}:${th} 승리` : `${K.ROSTERS[opp].name}에 ${us}:${th} 패배`;
  const story = res.walkoff? (home&&won? '9회 이후 끝내기로 경기를 끝냈습니다.' : '끝내기 패배를 당했습니다.')
    : th===0&&won? '마운드가 상대 타선을 완벽히 봉쇄한 완봉승입니다.'
    : us>=10? '타선이 폭발한 경기였습니다.'
    : (res.innings||9)>9? `${res.innings}회까지 가는 연장 혈투였습니다.`
    : Math.abs(us-th)===1? '한 점 차 접전이었습니다.' : '';
  const body=[
    `${label} · ${home?'홈':'원정'}`,
    story,
    `\n[스코어] ${res.away} ${line(res.away)} | ${res.awayRuns}`,
    `            ${res.home} ${line(res.home)} | ${res.homeRuns}`,
    d? `\n승 ${d.W} · 패 ${d.L}${d.SV?' · 세 '+d.SV:''}${d.HD.length?' · 홀드 '+d.HD.join(', '):''}` : '',
    pog? `\n⭐ 우리 팀 수훈: ${pog.n} — ${pog.line} (평점 ${pog.r.toFixed(1)})` : '',
    sps? `선발 ${sp}: ${ipStr(sps.OUT)}이닝 ${sps.H}피안타 ${sps.ER}자책 ${sps.SO}탈삼진 · ${sps.NP||0}구` : '',
    opPog? `상대 수훈: ${opPog.n} — ${opPog.line}` : '',
    hrs.length? `홈런: ${hrs.join(', ')}` : ''
  ].filter(Boolean).join('\n');
  feedPush({year:state.year, kind, ug:userGamesPlayed(), won, tie, title:`${tie?'⚖️':won?'🟢':'🔴'} ${head}`, body});
  if(kind!=='spring'){ rivalResult(opp, won, tie); maybeInterview(res, kind, {won, tie, us, th, pog, opp, res}); }
}
// the page after a watched game. next: the button to whatever comes after, built by the caller
function resultHTML(res,kind,info,next){
  ensure();
  const home=res.home===USER, opp=home?res.away:res.home, us=home?res.homeRuns:res.awayRuns, th=home?res.awayRuns:res.homeRuns;
  const won=us>th, tie=us===th, pog=pogOf(res,USER), d=res.decisions;
  const sp=home?res.homeSP:res.awaySP, sps=res.box[USER].pit[sp];
  const hrs=[]; [USER,opp].forEach(t=>{ for(const n in res.box[t].bat){ const s=res.box[t].bat[n]; if(s.HR) hrs.push(`${n}${s.HR>1?' '+s.HR+'개':''}`); } });
  const label=kind==='spring'?'시범경기':kind==='ps'?'포스트시즌':`${userGamesPlayed()}번째 경기`;
  const inn=Math.max(res.line[res.away].length,res.line[res.home].length), head=[]; for(let i=1;i<=inn;i++) head.push(`<th>${i}</th>`);
  const row=t=>{ const a=res.line[t].slice(); while(a.length<inn) a.push('X');
    return `<tr class="${t===USER?'selected':''}"><th>${esc(t)}</th>${a.map(x=>`<td>${x}</td>`).join('')}<td class="result-r">${t===res.home?res.homeRuns:res.awayRuns}</td></tr>`; };
  const facts=[
    d? `<li><span>승패</span><b>승 ${esc(d.W)} · 패 ${esc(d.L)}${d.SV?' · 세 '+esc(d.SV):''}</b></li>` : '',
    pog? `<li><span>수훈 선수</span><b>${esc(pog.n)}</b><em>${esc(pog.line)} · 평점 ${pog.r.toFixed(1)}</em></li>` : '',
    sps? `<li><span>선발</span><b>${esc(sp)}</b><em>${ipStr(sps.OUT)}이닝 ${sps.ER}자책 ${sps.SO}탈삼진</em></li>` : '',
    hrs.length? `<li><span>홈런</span><b>${esc(hrs.join(', '))}</b></li>` : ''
  ].join('');
  return `<div class="mp-wrap result-wrap">
    <p class="eyebrow">${esc(label)} · ${home?'홈':'원정'} · 경기 결과</p>
    <h1 class="result-title ${tie?'':won?'win':'loss'}">${tie?'무승부':won?'승리':'패배'}</h1>
    <p class="result-score"><b>${esc(K.ROSTERS[USER].name)}</b> <strong>${us} : ${th}</strong> <b>${esc(K.ROSTERS[opp].name)}</b></p>
    <div class="result-line"><table class="stat-table"><thead><tr><th></th>${head.join('')}<th class="result-r">R</th></tr></thead><tbody>${row(res.away)}${row(res.home)}</tbody></table></div>
    <ul class="result-facts">${facts}</ul>
    <section class="result-next"><div><small>다음 할 일</small><b>${esc(info.title)}</b><p class="muted">${info.sub||''}</p></div>
      <div class="result-btns"><button class="btn" onclick="Match.closeResult()">대시보드로</button>${next}</div></section>
  </div>`;
}
function maybeInterview(res, kind, x){
  const f=fm(), ug=userGamesPlayed();
  const big = res.walkoff || (x.won&&x.th===0) || x.us>=10 || (x.pog&&x.pog.r>=8.3) || kind==='ps';
  const rr=recentRecord(), slump=!x.won&&rr.l>=4;
  if(!(big||slump) || (kind!=='ps' && ug-(f.lastInterview||-99)<4)) return;
  if(kind!=='ps') f.lastInterview=ug;
  const r=x.res||{}, on=K.ROSTERS[x.opp]?K.ROSTERS[x.opp].name:x.opp;
  const q = slump? pick([`연패가 길어지고 있습니다. 오늘 경기 어떻게 보셨습니까?`, `${rr.l}패째입니다. 분위기 반전 카드가 있습니까?`])
    : kind==='ps'&&x.won? `포스트시즌 귀중한 승리입니다. 다음 경기 각오는?`
    : kind==='ps'? `포스트시즌에서 일격을 맞았습니다. 반격의 열쇠는?`
    : x.won&&r.walkoff? `극적인 끝내기 승리입니다! 마지막 순간 덕아웃 분위기는 어땠나요?`
    : x.won&&x.th===0? `${on} 타선을 완벽히 봉쇄했습니다. 마운드 운영을 평가해 주시죠.`
    : x.won&&x.us>=10? `타선이 ${x.us}점을 뽑았습니다. 타격감이 절정인데요?`
    : x.won&&(r.innings||9)>9? `${r.innings}회 연장 혈투 끝의 승리입니다. 소감은?`
    : x.won? `오늘 승리의 원동력은 무엇이라고 보십니까?${x.pog?` 특히 ${x.pog.n} 선수의 활약이 돋보였는데요.`:''}`
    : r.walkoff? `끝내기로 경기를 내줬습니다. 마지막 승부처를 돌아본다면?`
    : `아쉬운 패배입니다. 패인을 꼽으신다면?`;
  const acts = x.won
    ? [{label:x.pog?`"${x.pog.n}의 활약이 결정적이었다"`:'"선수들이 잘해줬다"', fn:'interview', arg:{kind:'star', n:x.pog&&x.pog.n}},
       {label:'"모두가 함께 만든 승리"', fn:'interview', arg:{kind:'team'}},
       {label:'"아직 보완할 점이 많다"', fn:'interview', arg:{kind:'humble'}},
       {label:`"팬들의 응원이 만든 승리다"`, fn:'interview', arg:{kind:'fans'}}]
    : [{label:'"패배는 감독 책임"', fn:'interview', arg:{kind:'blame_me'}},
       {label:'"선수들을 믿는다, 반등할 것"', fn:'interview', arg:{kind:'back'}},
       {label:'"이런 경기력으론 안 된다"', fn:'interview', arg:{kind:'call_out'}},
       {label:`"${on}이(가) 잘했다, 인정한다"`, fn:'interview', arg:{kind:'credit'}}];
  acts.push({label:'인터뷰 사양', fn:'interview', arg:{kind:'decline'}});
  send('구단 홍보팀','🎙',`경기 후 인터뷰 요청 — ${x.won?'승리':'패배'} ${x.us}:${x.th} vs ${x.opp}`, `방송사 인터뷰 요청이 왔습니다.\n\n기자: "${q}"\n\n답변은 선수단 사기와 이사회·팬 여론에 영향을 줍니다.`, acts);
}
function interviewAnswer(a){
  const f=fm(), all=allPlayers(USER);
  const fx={star:1, team:1, humble:0, fans:4, blame_me:1, back:1, call_out:-2, credit:1}[a.kind];
  addFans(fx==null? -1 : fx);
  switch(a.kind){
    case 'fans': all.forEach(x=>addMor(x,1)); return '팬들이 감독의 말에 크게 호응했습니다. (팬 여론 +4)';
    case 'credit': f.board.conf=clampN(f.board.conf+1,0,100); return '상대를 인정하는 품격 있는 답변이라는 평가입니다. (신뢰도 +1)';
    case 'star': { const p=a.n&&findPlayer(USER,a.n); if(p) addMor(p,8); all.forEach(x=>{ if(x!==p) addMor(x,0.5); }); return `${a.n||'선수들'}이(가) 감독의 칭찬에 크게 고무되었습니다.`; }
    case 'team': all.forEach(x=>addMor(x,2.5)); return '선수단 전체가 하나 된 분위기입니다.';
    case 'humble': f.board.conf=clampN(f.board.conf+1,0,100); return '방심하지 않는 자세에 이사회가 좋은 인상을 받았습니다. (신뢰도 +1)';
    case 'blame_me': f.board.conf=clampN(f.board.conf+1,0,100); all.forEach(x=>addMor(x,1.5)); return '선수들은 감독이 방패가 되어준 것에 고마워합니다.';
    case 'back': all.forEach(x=>addMor(x,3)); return '감독의 신뢰에 선수들이 반등을 다짐합니다.';
    case 'call_out': all.forEach(x=>{ const k=pers(x).k; addMor(x,(k==='승부욕'||k==='리더형')?3:-3); }); return '공개 질책에 승부욕 강한 선수들은 이를 악물었지만 일부는 위축됐습니다.';
    default: f.board.conf=clampN(f.board.conf-1,0,100); return '인터뷰를 사양했습니다. 언론과 이사회 반응이 조금 차갑습니다. (신뢰도 -1)';
  }
}
// ---------- 인터뷰 · 언론 ----------
// Every press moment is an inbox question with 3~4 answers. An answer's fx moves morale (whole
// squad or a group or one player), board confidence, fan support, and can leave a pledge (the
// season's predicted finish, reviewed at season end) or a declared rival (results vs them move
// the fans). Answered questions are quoted in the feed under 언론.
const CITY={KIA:'광주','삼성':'대구',LG:'서울','두산':'서울','키움':'서울',SSG:'인천',KT:'수원','한화':'대전','롯데':'부산',NC:'창원'};
function fans(){ const f=fm(); if(f.fans==null) f.fans=50; return f.fans; }
function addFans(d){ const f=fm(); f.fans=clampN(Math.round((fans()+d)*10)/10,0,100); }
function fansLabel(v){ return v>=80?'열광':v>=62?'뜨거움':v>=40?'보통':v>=22?'싸늘함':'등 돌림'; }
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
function pressSend(from, icon, subject, q, opts, note){
  send(from, icon, subject, `기자: "${q}"\n\n${note||'답변은 선수단 사기, 이사회 인상, 팬 여론에 영향을 줍니다.'}`,
    opts.map(o=>({label:o.label, fn:'press', arg:{fx:o.fx||{}, say:o.say||'', q, from}})));
}
function pressApply(m,a){
  const f=fm(), fx=a.fx||{}, all=allPlayers(USER), out=[];
  const grp={all, bat:all.filter(p=>p.type==='B'), pit:all.filter(p=>p.type==='P'), young:all.filter(p=>p.age<=25),
    vet:all.filter(p=>p.age>=32), fast:all.filter(p=>p.type==='B'&&p.spd>=68), farm:farmOf(USER)};
  if(fx.mor) for(const g in fx.mor){ (grp[g]||[]).forEach(p=>addMor(p,fx.mor[g])); out.push(`${{all:'선수단',bat:'타자들',pit:'투수진',young:'젊은 선수들',vet:'베테랑',fast:'발 빠른 선수들',farm:'2군 선수들'}[g]} 사기 ${fx.mor[g]>0?'+':''}${fx.mor[g]}`); }
  if(fx.star){ const p=findPlayer(USER,fx.star.n)||farmOf(USER).find(x=>x.n===fx.star.n); if(p){ addMor(p,fx.star.d); out.push(`${fx.star.n} 사기 ${fx.star.d>0?'+':''}${fx.star.d}`); } }
  if(fx.conf){ f.board.conf=clampN(f.board.conf+fx.conf,0,100); out.push(`이사회 신뢰도 ${fx.conf>0?'+':''}${fx.conf}`); }
  if(fx.fans){ addFans(fx.fans); out.push(`팬 여론 ${fx.fans>0?'+':''}${fx.fans}`); }
  if(fx.pledge){ f.pledge={year:state.year, rank:fx.pledge, label:fx.pledge===1?'정규시즌 1위':fx.pledge+'위 이내'}; out.push(`공약: ${f.pledge.label} (시즌 종료 후 평가)`); }
  if(fx.rival){ f.rival={year:state.year, t:fx.rival, w:0, l:0}; out.push(`${K.ROSTERS[fx.rival].name}을(를) 라이벌로 지목 — 맞대결 결과가 팬 여론을 움직입니다`); }
  if(fx.know){ const k=knowState(); k.n[fx.know]=(k.n[fx.know]||0)+2; out.push(`${K.ROSTERS[fx.know].name} 분석도 상승`); }
  const said=(m.actions.find(x=>x.arg===a)||{}).label||'';
  feedPush({year:state.year, kind:'press', ug:userGamesPlayed(), title:`🎙 ${m.subject}`,
    body:`${a.from||m.from}\n\n기자: "${a.q||''}"\n${state.user.name} 감독: ${said}${a.say?'\n\n'+a.say:''}`});
  return (a.say? a.say+' ' : '') + (out.length? `(${out.join(' · ')})` : '');
}
// 1) 취임 기자회견: career start and every new club
function pressInaug(){
  const club=K.ROSTERS[USER].name;
  pressSend('구단 홍보팀','🎙',`취임 기자회견 ② — 어떤 야구를 하실 겁니까?`, `${club}에서 보여주고 싶은 야구는 어떤 모습입니까?`, [
    {label:'"뛰는 야구, 공격적인 야구를 하겠다"', fx:{mor:{fast:5}, fans:3}, say:'팬들이 화끈한 야구를 기대합니다.'},
    {label:'"지키는 야구, 마운드가 중심이다"', fx:{mor:{pit:4}}, say:'투수진이 감독의 신뢰를 반깁니다.'},
    {label:'"데이터와 육성으로 강팀을 만들겠다"', fx:{mor:{young:4, farm:5}, conf:1}, say:'젊은 선수들과 2군이 기회를 기대합니다.'}]);
  pressSend('구단 홍보팀','🎙',`취임 기자회견 ① — ${club} 감독으로서 첫 목표`, `${state.user.name} 감독님, 취임을 축하드립니다. 첫 시즌 목표를 말씀해 주시죠.`, [
    {label:'"우승에 도전하겠다"', fx:{fans:8, conf:1, pledge:1}, say:'과감한 출사표에 팬들이 들썩입니다. 다만 결과로 증명해야 합니다.'},
    {label:'"가을야구가 첫 번째 목표다"', fx:{fans:4, pledge:5}, say:'현실적인 목표라는 평가입니다.'},
    {label:'"성적보다 팀의 체질을 바꾸겠다"', fx:{fans:-3, mor:{young:5}}, say:'리빌딩 선언에 일부 팬들은 아쉬워합니다.'}],
    '첫 인상이 중요합니다. 시즌 목표를 공약하면 시즌이 끝난 뒤 평가받습니다.');
}
// 2) 개막 미디어데이: when the regular season opens
function pressMediaDay(){
  const st=K.TEAM_IDS.filter(t=>t!==USER).sort((a,b)=>teamStrength(b)-teamStrength(a));
  const stars=allPlayers(USER).slice().sort((a,b)=>K.ovr(b)-K.ovr(a)).slice(0,3);
  const yr=state.year;
  pressSend('KBO 미디어데이','🎤',`${yr} 미디어데이 ③ — 꼭 잡고 싶은 팀`, `9개 구단 중 반드시 이기고 싶은 팀을 꼽는다면?`,
    st.slice(0,3).map(t=>({label:`"${K.ROSTERS[t].name}만큼은 꼭 잡겠다"`, fx:{rival:t, fans:2}, say:`${K.ROSTERS[t].name} 감독도 웃으며 응수했습니다.`}))
      .concat([{label:'"모든 팀이 어렵다, 한 경기씩 하겠다"', fx:{conf:1}, say:'무난한 답변이었습니다.'}]),
    '라이벌을 지목하면 맞대결 승패가 팬 여론을 크게 움직입니다.');
  pressSend('KBO 미디어데이','🎤',`${yr} 미디어데이 ② — 올 시즌 키 플레이어`, `올 시즌 ${K.ROSTERS[USER].name}의 키 플레이어를 한 명 꼽아 주시죠.`,
    stars.map(p=>({label:`"${p.n}이 해줘야 한다"`, fx:{star:{n:p.n,d:8}, fans:1}, say:`${p.n}이(가) 책임감을 느끼고 있습니다.`}))
      .concat([{label:'"특정 선수보다 팀 전체다"', fx:{mor:{all:2}}, say:'선수단이 고르게 고무되었습니다.'}]));
  pressSend('KBO 미디어데이','🎤',`${yr} 미디어데이 ① — 예상 순위`, `${yr} 시즌 개막을 앞두고 각 팀 감독님께 묻습니다. 올 시즌 몇 위를 예상하십니까?`, [
    {label:'"우리가 우승 후보다"', fx:{fans:6, pledge:1, mor:{all:2}}, say:'자신감 넘치는 출사표가 화제가 됐습니다.'},
    {label:'"가을야구는 반드시 간다"', fx:{fans:3, pledge:5}, say:'팬들이 기대를 걸고 있습니다.'},
    {label:'"말을 아끼고 결과로 보여주겠다"', fx:{conf:1}, say:'신중한 답변이었습니다.'}],
    '여기서 말한 순위는 시즌 종료 후 이사회와 팬이 다시 꺼내 봅니다.');
}
// 3) 경기 전 · 5) 구단 자체 · 6) 지역 매체 — spread over the season
function maybePress(ug){
  const f=fm(); if(state.phase!=='regular') return;
  if(ug>=3 && ug-(f.lastPre||-99)>=13 && Math.random()<0.35){ f.lastPre=ug; pressPregame(); return; }
  if(ug>=8 && ug-(f.lastOwn||-99)>=22 && Math.random()<0.3){ f.lastOwn=ug; pressClubChannel(); return; }
  if(ug>=12 && ug-(f.lastLocal||-99)>=26 && Math.random()<0.3){ f.lastLocal=ug; pressLocal(); }
}
function pressPregame(){
  const g=nextUserGame(); if(!g) return;
  const opp=g.home===USER?g.away:g.home, on=K.ROSTERS[opp].name;
  const sp= typeof projectedSP==='function'? projectedSP(USER) : null;
  const theirs= typeof projectedSP==='function'? projectedSP(opp) : null;
  const q = sp&&Math.random()<0.5
    ? [`다음 경기 선발 ${sp} 선수에게 기대하는 점은?`, [
        {label:`"${sp}에게 긴 이닝을 맡기겠다"`, fx:{star:{n:sp,d:6}}, say:`${sp}이(가) 의욕을 보입니다.`},
        {label:'"부담 없이 자기 공만 던지면 된다"', fx:{star:{n:sp,d:3}, mor:{pit:1}}, say:'투수진 분위기가 편안합니다.'},
        {label:'"불펜까지 총력전으로 간다"', fx:{mor:{pit:2}, fans:1}, say:'불펜 투수들이 각오를 다집니다.'}]]
    : [`${on}${theirs?` 선발 ${theirs}`:''} 공략법이 있습니까?`, [
        {label:'"초구부터 적극적으로 치겠다"', fx:{mor:{bat:2}, fans:1}, say:'타자들이 공격적으로 나설 준비를 합니다.'},
        {label:'"끈질기게 투구수를 늘리겠다"', fx:{know:opp}, say:'전력분석팀이 상대 투수 자료를 더 준비합니다.'},
        {label:`"${on}은(는) 좋은 팀이다, 존중한다"`, fx:{conf:1}, say:'점잖은 답변이었습니다.'},
        {label:'"전략은 비밀이다"', fx:{}, say:'기자들이 아쉬워했습니다.'}]];
  pressSend('방송사 기자','🎙',`경기 전 인터뷰 — ${g.home===USER?'vs':'@'} ${on}`, q[0], q[1], '경기 전 덕아웃 인터뷰입니다. 3경기 안에 답하지 않으면 넘어갑니다.');
}
function pressClubChannel(){
  const all=allPlayers(USER), club=K.ROSTERS[USER].name;
  const mood=all.slice().sort((a,b)=>(pers(b).k==='리더형')-(pers(a).k==='리더형')||K.mor(b)-K.mor(a)).slice(0,3);
  const young=all.filter(p=>p.age<=24).sort((a,b)=>K.ovr(b)-K.ovr(a)).slice(0,3);
  const bank=[
    [`(${club} 공식 채널) 팬분들께 한마디 부탁드립니다!`, [
      {label:'"직관 와주시는 팬들 덕분에 버틴다"', fx:{fans:4}, say:'영상 댓글이 감사 인사로 가득합니다.'},
      {label:'"더 좋은 경기로 보답하겠다"', fx:{fans:2, mor:{all:1}}, say:'담백한 답변에 응원이 이어집니다.'},
      {label:'"홈 응원 문화는 우리가 최고다"', fx:{fans:3}, say:'팬들이 자부심을 느낍니다.'}]],
    [`(${club} 공식 채널) 덕아웃 분위기 메이커는 누구인가요?`,
      mood.map(p=>({label:`"단연 ${p.n}이다"`, fx:{star:{n:p.n,d:5}, fans:1}, say:`${p.n} 영상 조회수가 폭발했습니다.`}))],
    [`(${club} 공식 채널) 감독님만의 경기 전 루틴이 있다면?`, [
      {label:'"이기는 날엔 같은 넥타이를 맨다"', fx:{fans:2}, say:'팬들이 넥타이 색을 추리하기 시작했습니다.'},
      {label:'"전력분석 자료를 세 번 읽는다"', fx:{fans:1, conf:1}, say:'성실한 모습이 좋은 인상을 줬습니다.'},
      {label:'"선수들과 캐치볼을 한다"', fx:{fans:2, mor:{all:1}}, say:'선수들이 웃음을 터뜨렸습니다.'}]]];
  if(young.length) bank.push([`(${club} 공식 채널) 요즘 눈여겨보는 젊은 선수는?`,
    young.map(p=>({label:`"${p.n}, 앞으로 더 클 선수다"`, fx:{star:{n:p.n,d:7}, mor:{young:1}}, say:`${p.n}이(가) 영상을 보고 감독실에 인사를 왔습니다.`}))]);
  const [q,opts]=pick(bank);
  pressSend('구단 미디어팀','📹',`구단 공식 채널 인터뷰`, q, opts, '구단 유튜브·SNS에 올라가는 인터뷰입니다. 주로 팬 여론에 영향을 줍니다.');
}
function pressLocal(){
  const city=CITY[USER]||'연고지', club=K.ROSTERS[USER].name, farm=farmOf(USER).slice().sort((a,b)=>(b.pot||0)-(a.pot||0)).slice(0,2);
  const st=standings(), rank=st.findIndex(x=>x.t===USER)+1;
  const bank=[
    [`${city} 팬들의 기대가 큽니다. 2군 유망주들에게도 기회가 갈까요?`, [
      {label:'"2군에서 잘하면 언제든 부른다"', fx:{mor:{farm:6}, fans:2}, say:'퓨처스 선수들이 기사를 돌려 봤다고 합니다.'},
      {label:'"지금은 성적이 우선이다"', fx:{conf:1, fans:-1}, say:'현실적인 답변이라는 평가입니다.'}].concat(farm.map(p=>(
      {label:`"${p.n}을(를) 지켜보고 있다"`, fx:{star:{n:p.n,d:8}, fans:1}, say:`${p.n}의 이름이 지역 신문 1면에 실렸습니다.`})))],
    [`현재 ${rank}위입니다. ${city} 시민들에게 한마디 해 주시죠.`, rank<=5? [
      {label:'"지금 순위에 만족하지 않는다"', fx:{mor:{all:1}, conf:1}, say:'방심하지 않는 자세가 좋게 비쳤습니다.'},
      {label:'"올가을 야구장에서 만나자"', fx:{fans:4}, say:'지역 커뮤니티가 들썩입니다.'}] : [
      {label:'"반드시 반등하겠다, 믿어 달라"', fx:{fans:2, mor:{all:1}}, say:'팬들이 조금 더 기다려 주기로 합니다.'},
      {label:'"부진은 전적으로 내 책임이다"', fx:{conf:1, fans:1}, say:'책임지는 모습에 여론이 누그러졌습니다.'},
      {label:'"선수들도 더 분발해야 한다"', fx:{mor:{all:-2}, fans:-1}, say:'선수단 분위기가 조금 무거워졌습니다.'}]],
    [`${city} 리틀야구 꿈나무들에게 해 주고 싶은 말은?`, [
      {label:'"야구는 즐겁게 하는 게 먼저다"', fx:{fans:3}, say:'지역 야구계에서 호평이 이어졌습니다.'},
      {label:'"언젠가 이 구장에서 만나자"', fx:{fans:3, mor:{young:1}}, say:'기사에 꿈나무들의 사진이 함께 실렸습니다.'}]]];
  const [q,opts]=pick(bank);
  pressSend(`${city} 지역 매체`,'📰',`지역 매체 인터뷰 — ${city}의 ${club}`, q, opts, '연고지 신문·방송 인터뷰입니다. 팬 여론과 유망주 사기에 영향을 줍니다.');
}
// season end: the pledge from the inaugural press conference or media day
function pledgeReview(){
  const f=fm(), p=f.pledge; if(!p||p.year!==state.year) return;
  const rank=standings().findIndex(x=>x.t===USER)+1, met=rank<=p.rank;
  const dc= met? (p.rank===1?6:3) : (p.rank===1?-4:-3), df= met? (p.rank===1?12:6) : (p.rank===1?-10:-6);
  f.board.conf=clampN(f.board.conf+dc,0,100); addFans(df);
  send('스포츠 기자','📰',`공약 점검: "${p.label}" — ${met?'지켰다':'못 지켰다'}`,
    `${state.user.name} 감독은 시즌 전 "${p.label}"을(를) 공언했습니다. 최종 순위는 ${rank}위입니다.\n\n` +
    (met? '말한 대로 해냈다는 평가입니다.' : '말이 앞섰다는 비판이 나옵니다.') + `\n이사회 신뢰도 ${dc>0?'+':''}${dc} · 팬 여론 ${df>0?'+':''}${df}`, []);
  f.pledge=null;
}
function rivalResult(opp, won, tie){
  const f=fm(), r=f.rival; if(!r||r.year!==state.year||r.t!==opp||tie) return;
  if(won){ r.w++; addFans(1.5); } else { r.l++; addFans(-1.5); }
}
// ---------- 코칭스태프 ----------
// Six 1군 posts. Each coach has a 1~20 quality (a game value, not a judgment of the real person).
// 수석 speeds up tactical familiarity; 투수·배터리 drive pitcher growth; 타격·수비·주루 drive
// batter growth. Staff are hired from a pool of free-agent coaches; replacing a coach pays out
// half his salary plus the new coach's first-year salary (the standing staff is in the operating budget).
// COACH_REAL: names confirmed in public reports for the 2026 season (role as reported; check the
// club's official announcement before relying on it). Every other post starts with a fictional
// coach marked 가상, until the club's official list is filled in here.
const COACH_ROLES=[['head','수석코치'],['pit','투수코치'],['bat','타격코치'],['fld','수비코치'],['run','주루코치'],['bat2','배터리코치']];
const COACH_REAL={
  'LG':{bat:'송지만', fld:'김일경'},          // 2026.7.27 보직 개편 (OSEN)
  '두산':{bat:'이진영'},                      // 2025.11 1·2군 타격 총괄 선임
  '키움':{bat:'이용규'}                       // 2026.5.21 1군 타격 코치 이동
};
const CO_FAM=['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','류','홍'];
const CO_GIV=['도윤','서준','현우','지훈','건우','우진','민재','태윤','성민','재원','동하','상훈','영재','기현','승호','정민','태호','준혁','진우','경수'];
function coachName(used){ for(let i=0;i<400;i++){ const n=pick(CO_FAM)+pick(CO_GIV); if(!used.has(n)){ used.add(n); return n; } } return '코치'+R(100,999); }
function coachQ(seed,lo,hi){ return lo + hash(seed)%(hi-lo+1); }
function coachSal(q){ return Math.round((0.6+Math.max(0,q-8)*0.22)*10)/10; }
function makeCoach(role, used, real, team){
  const n= real || coachName(used);
  const q= real? coachQ(n+role,11,15) : R(7,17);
  return {n, role, q, sal:coachSal(q), real:!!real, team:team||null};
}
function staffOf(t){
  const f=fm(); f.staff=f.staff||{};
  if(!f.staff[t]){ const used=new Set(), s={};
    for(const o in f.staff) for(const r in f.staff[o]) used.add(f.staff[o][r].n); // names stay unique league-wide
    for(const o in COACH_REAL) for(const r in COACH_REAL[o]) used.add(COACH_REAL[o][r]);
    COACH_ROLES.forEach(([r])=>{ s[r]=makeCoach(r, used, (COACH_REAL[t]||{})[r], t); });
    f.staff[t]=s; }
  return f.staff[t];
}
function coachPool(){
  const f=fm();
  if(!f.coachPool||f.coachPool.year!==state.year){ const used=new Set();
    K.TEAM_IDS.forEach(t=>{ const s=staffOf(t); for(const r in s) used.add(s[r].n); });
    const list=[]; COACH_ROLES.forEach(([r])=>{ for(let i=0;i<4;i++) list.push(makeCoach(r,used)); });
    f.coachPool={year:state.year, list}; }
  return f.coachPool.list;
}
function coachQOf(role){ const c=staffOf(USER)[role]; return c? c.q : 10; }
function coachMult(q){ return 1+(q-12)*0.04; }   // q 7 -> 0.80, 12 -> 1.00, 17 -> 1.20
function coachGrow(p, farm){
  const m = p.type==='P'? coachMult(coachQOf('pit'))*0.75+coachMult(coachQOf('bat2'))*0.25
    : coachMult(coachQOf('bat'))*0.6+coachMult(coachQOf('fld'))*0.25+coachMult(coachQOf('run'))*0.15;
  return farm? 1+(m-1)*0.5 : m;  // the 1군 staff only partly reach the farm
}
function coachLearn(){ return 1+(coachQOf('head')-12)*0.03; }
function coachStars(q){ const n=Math.max(1,Math.min(5,Math.round(q/4))); return '★'.repeat(n)+'☆'.repeat(5-n); }
function staffPayroll(t){ const s=staffOf(t); return Math.round(Object.values(s).reduce((a,c)=>a+c.sal,0)*10)/10; }
function staffCard(){
  const s=staffOf(USER), roleL=Object.fromEntries(COACH_ROLES);
  const fx={head:'전술 숙련 속도', pit:'투수 성장', bat:'타자 성장(타격)', fld:'타자 성장(수비)', run:'타자 성장(주루)', bat2:'투수 성장(배터리)'};
  const rows=COACH_ROLES.map(([r])=>{ const c=s[r];
    return `<tr><td>${roleL[r]}</td><td class="name"><b>${esc(c.n)}</b> ${c.real?'<span class="pill pos" title="2026 시즌 공개 보도 기준">실존</span>':'<span class="pill" style="background:var(--panel2);color:var(--dim)">가상</span>'}</td>
      <td title="${c.q}/20">${coachStars(c.q)}</td><td>${fx[r]} ${(()=>{ const v=Math.round((r==='head'?coachLearn()-1:coachMult(c.q)-1)*100); return (v>=0?'+':'')+v+'%'; })()}</td>
      <td>${c.sal}억</td><td><button class="btn" style="font-size:12px" onclick="FM.coachPicker('${r}')">교체</button></td></tr>`; }).join('');
  return `<div class="card" style="margin-top:14px"><h3>🧢 코칭스태프 <span class="tag">연봉 합계 ${staffPayroll(USER)}억</span></h3>
    <div style="overflow-x:auto"><table><thead><tr><th>보직</th><th class="name">코치</th><th>능력</th><th>효과</th><th>연봉</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="hint" style="margin-top:8px">실존: 2026 시즌 공개 보도로 확인된 코치(보직은 보도 기준). 가상: 구단 공식 명단을 아직 넣지 않은 자리입니다. 코치 능력치는 게임용 수치입니다.</div></div>`;
}
function coachPicker(role){
  const cur=staffOf(USER)[role], roleL=Object.fromEntries(COACH_ROLES)[role];
  const cands=coachPool().filter(c=>c.role===role);
  const pay=Math.round(cur.sal*0.5*10)/10;
  modal(`<span class="closeX" onclick="App.closeModal()">×</span><h2>🧢 ${roleL} 교체</h2>
    <div class="muted">현재: <b>${esc(cur.n)}</b> ${coachStars(cur.q)} · 연봉 ${cur.sal}억 — 교체 시 위약금 ${pay}억 + 새 코치 첫해 연봉 지급</div>
    <table style="margin-top:12px"><thead><tr><th class="name">후보 (FA 코치)</th><th>능력</th><th>연봉</th><th></th></tr></thead><tbody>
    ${cands.map((c,i)=>`<tr><td class="name">${esc(c.n)} <span class="pill" style="background:var(--panel2);color:var(--dim)">가상</span></td><td title="${c.q}/20">${coachStars(c.q)}</td><td>${c.sal}억</td>
      <td><button class="btn primary" style="font-size:12px" onclick="FM.hireCoach('${role}','${q(c.n)}')">영입</button></td></tr>`).join('')||'<tr><td colspan="4" class="muted">이번 시즌 남은 후보가 없습니다.</td></tr>'}
    </tbody></table><div class="hint" style="margin-top:8px">후보 명단은 매 시즌 새로 꾸려집니다.</div>`);
}
function hireCoach(role, n){
  const f=fm(), pool=coachPool(), i=pool.findIndex(c=>c.role===role&&c.n===n); if(i<0) return;
  const s=staffOf(USER), old=s[role], c=pool[i], cost=Math.round((old.sal*0.5+c.sal)*10)/10;
  if(f.fin.balance-cost < -10){ notify(`잔고가 부족합니다. 필요 금액 ${cost}억 (잔고 ${f.fin.balance.toFixed(1)}억)`); return; }
  f.fin.balance=Math.round((f.fin.balance-cost)*10)/10; f.fin.exp=(f.fin.exp||0)+cost;
  pool.splice(i,1); c.team=USER; s[role]=c;
  if(!old.real) pool.push(Object.assign({},old,{team:null}));
  send('단장','🧢',`${Object.fromEntries(COACH_ROLES)[role]} 교체: ${old.n} → ${c.n}`, `${c.n} 코치가 ${Object.fromEntries(COACH_ROLES)[role]}로 합류했습니다.\n지출: ${cost}억 원 (위약금 ${Math.round(old.sal*0.5*10)/10}억 + 첫해 연봉 ${c.sal}억)`, []);
  closeModal(); render();
}
let feedFilter='all';
function setFeedFilter(v){ feedFilter=v; render(); }
function renderFeed(){
  ensure();
  const f=fm(); let list=f.feed||[];
  if(feedFilter!=='all') list=list.filter(x=>x.kind===feedFilter);
  const ft=(id,l)=>`<button class="${feedFilter===id?'active':''}" onclick="FM.setFeedFilter('${id}')">${l}</button>`;
  return `<div class="card"><h3>📰 피드 <span class="tag">경기 리포트 · 최근 160건</span></h3>
    <div class="tabsm">${ft('all','전체')}${ft('regular','정규시즌')}${ft('ps','포스트시즌')}${ft('spring','시범경기')}${ft('press','언론')}</div>
    ${list.length? list.slice(0,60).map(x=>`<details style="border-bottom:1px solid var(--line);padding:8px 2px"${x===list[0]?' open':''}>
      <summary style="cursor:pointer"><b>${esc(x.title)}</b> <span class="muted" style="font-size:12px">· ${x.year} ${x.kind==='spring'?'시범경기':x.kind==='ps'?'포스트시즌':x.kind==='press'?'언론 · '+x.ug+'경기':x.ug+'경기'}</span></summary>
      <div style="white-space:pre-wrap;line-height:1.65;margin-top:6px;font-size:13.5px;font-variant-numeric:tabular-nums">${esc(x.body)}</div></details>`).join('')
      : '<div class="muted">경기를 치르면 리포트가 쌓입니다.</div>'}</div>`;
}
function feedCard(){
  const list=(fm().feed||[]).slice(0,4);
  return `<div class="card" style="margin-top:14px"><h3>📰 최근 경기 리포트 <span class="tag"><a href="javascript:void(0)" onclick="App.tab('feed')" style="color:var(--dim)">피드 전체 보기</a></span></h3>
    ${list.length? list.map(x=>`<div style="border-bottom:1px solid var(--line);padding:6px 0;cursor:pointer" onclick="App.tab('feed')"><b>${esc(x.title)}</b><div class="muted" style="font-size:12px;margin-top:2px">${esc(x.body.split('\n').find(l=>l.startsWith('⭐'))||x.body.split('\n')[1]||'')}</div></div>`).join('') : '<div class="muted">아직 경기 리포트가 없습니다.</div>'}</div>`;
}

