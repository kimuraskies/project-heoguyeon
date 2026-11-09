// ---------- coaching staff: profiles, tactics by coach, advice and satisfaction (docs/coaching-staff-plan.md) ----------
// A coach keeps his overall q; five attributes, a style and a specialty hang off it. Older saves
// get them on first read (coachInit), derived from the name so they never change between loads.
const COACH_ATTR=[['lead','지도력'],['tac','전술'],['ana','분석'],['mot','동기부여'],['man','관리']];
const ROLE_MAIN={head:'tac',pit:'lead',pen:'man',bat:'lead',fld:'lead',run:'tac',bat2:'ana',cond:'man',ana:'ana',fut:'lead'};
const COACH_STYLES=['육성형','성적형','데이터형','올드스쿨'];
const COACH_SPEC={head:['전술 통합','선수단 관리'],pit:['구위 향상','제구 교정','변화구'],pen:['연투 관리','마무리 육성'],bat:['컨택','장타력','선구안'],
  fld:['내야 수비','외야 수비','포지션 전환'],run:['도루','작전 주루'],bat2:['도루 저지','볼배합'],cond:['부상 예방','재활'],ana:['상대 분석','데이터'],fut:['유망주 육성','콜업 판단']};
const STAFF_GROUPS=[['1군',['head','pit','pen','bat','fld','run','bat2']],['지원',['cond','ana']],['2군',['fut']]];
// which coach answers for which team tactic
const TAC_COACH={atk:'bat',dir:'bat',teamBat:'bat',bunt:'bat',run:'run',adv:'run',shift:'fld',bat:'bat2',pick:'bat2',ibb:'bat2',hook:'pit'};
function coachInit(c){
  if(c.style) return c;
  const h=x=>hash(c.n+c.role+x), a={};
  COACH_ATTR.forEach(([k])=>{ a[k]=clampN(c.q+h(k)%7-3,1,20); });
  a[ROLE_MAIN[c.role]||'lead']=c.q;
  const sp=COACH_SPEC[c.role]||['전반'];
  c.a=c.a||a; c.style=COACH_STYLES[h('style')%4]; c.spec=c.spec||sp[h('spec')%sp.length]; c.age=c.age||45+h('age')%18;
  c.yrs=c.yrs||1+h('yrs')%3; c.sat=c.sat==null?60:c.sat; c.okN=c.okN||0; c.noN=c.noN||0;
  return c;
}
function coachA(role,key,t){ const c=staffOf(t||USER)[role]; return c? coachInit(c).a[key] : 10; }
const BG_STYLE={mlb:'데이터형',coach:'성적형',legend:'올드스쿨',rookie:'육성형',kbo:'성적형'};
const STYLE_CLASH={'데이터형':'올드스쿨','올드스쿨':'데이터형','육성형':'성적형','성적형':'육성형'};
// how well a coach suits this manager: +1 same outlook, -1 opposed, 0 otherwise
function coachFit(c){ const b=BG_STYLE[state.user&&state.user.bg]; if(!b) return 0; coachInit(c); return c.style===b?1:c.style===STYLE_CLASH[b]?-1:0; }
// the coach in charge scales how well his tactics are carried out: 0.9 at 1, 1.1 at 20
function coachTacMult(t,k){ const r=TAC_COACH[k]; return r? 0.9+0.2*(coachA(r,'tac',t)-1)/19 : 1; }
function aiExecTable(t){ const o={}; for(const k in TF_LEARN){ o[k]={}; TF_LEARN[k].forEach(v=>o[k][v]=clampN(coachTacMult(t,k),0.2,1.05)); } return o; }
function aiKnowTable(t){ const base=clampN(0.25+(coachA('ana','ana',t)-10)*0.015,0,1), o={}; K.TEAM_IDS.forEach(x=>{ if(x!==t) o[x]=base; }); return o; }
// wear between games: the conditioning coach cuts injuries, the bullpen coach speeds relievers back
function coachWear(t){ return {inj:1-(coachA('cond','man',t)-10.5)*0.015, pen:(coachA('pen','man',t)-10.5)*0.2}; }
function coachEdge(t){ return {run:(coachA('run','tac',t)-10.5)*0.002, arm:(coachA('bat2','tac',t)-10.5)*0.002, bat:(coachA('bat','tac',t)-10.5)*0.002}; }

// advice arrives in the inbox; taking it pleases the coach, ignoring it costs goodwill
function coachMood(role,d,ok){ const c=staffOf(USER)[role]; if(!c) return; coachInit(c); c.sat=clampN(c.sat+d,0,100); if(ok) c.okN++; else c.noN++; }
ACTIONS.coachYes=(m,a)=>{ coachMood(a.role,4,true); const f=fm();
  if(a.rest) a.rest.forEach(n=>{ if(f.restNext.indexOf(n)<0) f.restNext.push(n); });
  if(a.mor) allPlayers(USER).forEach(p=>{ p.mor=clampN(p.mor+a.mor,5,99); });
  return a.done||'건의를 받아들였습니다.'; };
ACTIONS.coachNo=(m,a)=>{ coachMood(a.role,-5,false); return '건의를 보류했습니다.'; };
function coachSay(role,icon,subject,body,yes,done,extra){
  const c=staffOf(USER)[role]; if(!c) return;
  send(`${c.n} ${Object.fromEntries(COACH_ROLES)[role]}`,icon,subject,body,[
    {label:yes,fn:'coachYes',arg:Object.assign({role,done},extra||{})},{label:'보류',fn:'coachNo',arg:{role}}]);
}
function styleLine(role){ const c=staffOf(USER)[role]; if(!c) return ''; coachInit(c);
  return {'육성형':'어린 선수들에게 기회가 될 겁니다.','성적형':'지금 순위를 생각해야 합니다.','데이터형':'숫자가 그렇게 말하고 있습니다.','올드스쿨':'선수는 몸으로 말합니다.'}[c.style]; }
function coachDesk(ug){
  if(state.phase!=='regular'||!ug) return;
  const f=fm(), s=state.season[USER];
  if(ug%14===3){ const tired=state.cfgs[USER].rotation.map(n=>findPlayer(USER,n)).filter(p=>p&&K.cond(p)<70).map(p=>p.n);
    if(tired.length) coachSay('pit','⚾','선발 로테이션 피로 보고',`${tired.join(', ')} 선수의 피로가 쌓였습니다. 다음 경기는 휴식을 건의합니다. ${styleLine('pit')}`,'휴식 부여','휴식을 지시했습니다.',{rest:tired.slice(0,1)}); }
  if(ug%14===7){ const low=state.cfgs[USER].lineup.map(n=>({n,b:s.bat[n]})).filter(x=>x.b&&x.b.AB>=40).sort((a,b)=>a.b.H/a.b.AB-b.b.H/b.b.AB)[0];
    if(low&&low.b.H/low.b.AB<0.235) coachSay('bat','🏏',`${low.n} 슬럼프 처방`,`시즌 타율 ${fmtAvg(low.b.H/low.b.AB)}입니다. 하루 쉬면서 타격폼을 점검하길 건의합니다. ${styleLine('bat')}`,'하루 휴식','휴식과 특타를 지시했습니다.',{rest:[low.n]}); }
  if(ug%14===11){ const risk=allPlayers(USER).filter(p=>!K.isInjured(p)&&K.cond(p)<50).map(p=>p.n).slice(0,3);
    if(risk.length) coachSay('cond','🩺','부상 위험 선수 보고',`${risk.join(', ')} 선수는 지금 부상 위험이 높습니다.`,'휴식 권고 수용','위험 선수에게 휴식을 줍니다.',{rest:risk}); }
  const g=(f.recent||[]); if((f.lossRun||0)>=3&&f.lossRun%3===0) coachSay('head','🧭','연패 분위기 보고',`${f.lossRun}연패로 더그아웃이 가라앉았습니다. 팀 미팅을 건의합니다.`,'팀 미팅 소집','미팅으로 분위기를 다잡았습니다.',{mor:1+Math.round(coachA('head','mot')/8)});
}
// contracts and goodwill are settled when the season ends
function coachSeasonEnd(){
  const s=staffOf(USER), lines=[];
  allPlayers(USER).forEach(p=>{ delete p.tough; });
  COACH_ROLES.forEach(([r,label])=>{ const c=coachInit(s[r]); c.yrs--;
    const quit=c.sat<30&&c.noN>c.okN, retire=c.age>=66, expired=c.yrs<=0&&c.sat<45;
    if(quit||retire||expired){ const used=new Set(); K.TEAM_IDS.forEach(t=>Object.values(staffOf(t)).forEach(x=>used.add(x.n)));
      const n=coachInit(makeCoach(r,used,null,USER)); s[r]=n;
      lines.push(`${label} ${c.n}: ${quit?'건의가 받아들여지지 않아 사의를 표명했습니다':retire?'은퇴합니다':'계약이 끝나 팀을 떠납니다'} → 후임 ${n.n}`); return; }
    if(c.yrs<=0){ c.yrs=2; lines.push(`${label} ${c.n}: 2년 재계약`); }
    c.age++; c.okN=0; c.noN=0; c.sat=clampN(c.sat*0.5+30,0,100);
  });
  if(lines.length) send('단장','🧢',`${state.year} 코칭스태프 변동`,lines.join('\n'),[]);
}
const bar=(v,max)=>`<div class="st-bar" role="img" aria-label="${v}/${max}"><i style="width:${Math.round(v*100/max)}%"></i></div>`;
function staffBoard(){
  const s=staffOf(USER), roleL=Object.fromEntries(COACH_ROLES);
  const card=r=>{ const c=coachInit(s[r]), fit=coachFit(c);
    return `<article class="st-card"><header><span class="st-av">${esc(c.n[0])}</span><div><b>${esc(c.n)}</b><small>${roleL[r]} · ${c.age}세 · ${c.real?(c.guess?'실존 · 보직 추정':'실존'):'가상'}</small>${c.bio?`<small>${esc(c.bio)}</small>`:''}</div></header>
      <div class="st-tags"><span class="chip">${c.style}</span><span class="chip">${c.spec}</span>${fit>0?'<span class="chip good">궁합 좋음</span>':fit<0?'<span class="chip warn">궁합 나쁨</span>':''}</div>
      <div class="st-attr">${COACH_ATTR.map(([k,l])=>`<span>${l}</span>${bar(c.a[k],20)}<b>${c.a[k]}</b>`).join('')}</div>
      <footer><small>만족도 ${Math.round(c.sat)} · 계약 ${c.yrs}년 · ${c.sal}억</small><button class="btn" onclick="FM.coachPicker('${r}')">교체</button></footer></article>`; };
  return `<div class="card" style="margin-top:14px"><h3>코칭스태프 <span class="tag">연봉 합계 ${staffPayroll(USER)}억</span></h3>
    ${STAFF_GROUPS.map(([g,rs])=>`<h4 class="st-group">${g}</h4><div class="st-grid">${rs.map(card).join('')}</div>`).join('')}
    <div class="hint" style="margin-top:8px">구단 공식 코칭스태프와 KBO 등록 현황 기준입니다. 능력치는 현역 기록과 나이로 추정한 게임용 수치입니다. 담당 코치의 전술 능력이 그 분야 작전의 수행도에 ±10% 영향을 줍니다. 건의를 계속 보류하면 만족도가 떨어져 시즌 후 떠날 수 있습니다.</div></div>`;
}
