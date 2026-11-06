// ---------- inbox ----------
// msg: {id, ug, year, from, icon, subject, body, read, actions:[{label, fn, arg}], done, result}
// ---------- inbox: decisions with deadlines, reports, and work handed to the staff ----------
// The inbox clock counts the user's games of any kind (spring, regular, postseason); it stands
// still in the stove league, so nothing lapses there. A decision gets a deadline from its type and
// a default answer; when the deadline passes the default is applied and the message moves to
// 자동 처리됨. Delegation applies the staff's answer the moment the message arrives.
const TALK_FN=['promisePlay','compete','listMe','encourage','scold'], PRESS_FN=['interview','media','press'];
function clock(){ const f=fm(); return f.clock||0; }
function tickClock(){ const f=fm(); f.clock=(f.clock||0)+1; expireInbox(); }
function deleg(){ const f=fm(); f.deleg=f.deleg||{press:'self', talk:'self', trade:'self'}; return f.deleg; }
function fnsOf(m){ return m.actions.map(a=>a.fn); }
function isDecision(m){ return m.actions.length && !m.actions.every(a=>a.fn==='ok'); }
function msgType(m){ const fs=fnsOf(m);
  if(fs.some(x=>PRESS_FN.includes(x))) return 'press';
  if(fs.some(x=>TALK_FN.includes(x))) return 'talk';
  if(fs.includes('acceptTrade')) return 'trade';
  if(fs.includes('restNext')) return 'rest';
  if(fs.some(x=>x==='swapLineup'||x==='swapRotation')) return 'coach';
  return 'other'; }
// the answer that is applied when nobody decides: the cautious one
function safePress(m){
  const i=m.actions.findIndex(a=>{ if(a.fn==='interview') return a.arg.kind==='team'||a.arg.kind==='back';
    if(a.fn==='media') return a.arg.kind==='players';
    const fx=(a.arg&&a.arg.fx)||{}; return !fx.pledge&&!fx.rival&&!Object.values(fx).some(v=>typeof v==='number'&&v<0)&&!(fx.mor&&Object.values(fx.mor).some(v=>v<0)); });
  return i>=0? i : 0; }
function defaultOf(m){
  const t=msgType(m), fs=fnsOf(m);
  if(t==='press') return safePress(m);
  if(t==='talk') return fs.indexOf('compete')>=0? fs.indexOf('compete') : fs.indexOf('encourage');
  if(t==='trade') return fs.indexOf('declineTrade');
  if(t==='rest') return fs.indexOf('restNext');
  if(t==='coach'){ const i=fs.findIndex(x=>x==='ok'||x==='keepGoing'); return i; }
  return -1; }
const DUE={press:3, talk:3, trade:3, rest:1, coach:4};
function stamp(m){
  m.at=clock(); m.phase=state.phase;
  if(!isDecision(m)) return;
  const t=msgType(m), d=defaultOf(m);
  if(DUE[t]!=null && d>=0){ m.due=m.at+DUE[t]; m.def=d; }
}
function resolveAuto(m, i, why){
  if(m.done) return;
  const a=m.actions[i]; let res=a? ACTIONS[a.fn](m,a.arg||{}) : '';
  if(String(res).startsWith('❌')){ const k=m.actions.findIndex(x=>/^decline|keepGoing|ok$/.test(x.fn)); res = k>=0&&k!==i? ACTIONS[m.actions[k].fn](m,m.actions[k].arg||{}) : '처리하지 못하고 넘어갔습니다.'; }
  m.done=true; m.read=true; m.auto=why; m.result=`🤖 ${why}: ${a?a.label:''} — ${res}`;
}
function expireInbox(){
  const now=clock();
  fm().inbox.forEach(m=>{ if(!m.done&&m.due!=null&&now>=m.due) resolveAuto(m, m.def, '기한이 지나 기본 선택으로 처리'); });
}
// staff handle the message on arrival when the manager has handed that work over
function delegate(m){
  const d=deleg(), t=msgType(m);
  if(m.from==='KBO 미디어데이'||/^취임 기자회견/.test(m.subject)) return; // big events stay with the manager
  if(t==='press' && d.press!=='self'){
    if(d.press==='safe') return resolveAuto(m, safePress(m), '홍보팀이 무난하게 답변');
    const k=m.actions.findIndex(a=>a.fn==='interview'&&a.arg.kind==='decline');
    if(k>=0) return resolveAuto(m, k, '홍보팀이 인터뷰를 사양');
    addFans(-1); m.done=true; m.read=true; m.auto='홍보팀이 인터뷰를 사양'; m.result='🤖 홍보팀이 인터뷰를 사양했습니다. (팬 여론 -1)'; return;
  }
  if(t==='talk' && d.talk==='coach'){
    const n=(m.actions[0].arg||{}).n, p=n&&findPlayer(USER,n), k=p&&pers(p).k, fs=fnsOf(m);
    const i = fs.includes('compete')? fs.indexOf('compete') : (k==='승부욕'? fs.indexOf('scold') : fs.indexOf('encourage'));
    return resolveAuto(m, i, '수석코치가 면담');
  }
  if(t==='trade' && d.trade==='rejectBad'){
    const a=m.actions.find(x=>x.fn==='acceptTrade').arg, give=findPlayer(a.team,a.give), want=findPlayer(USER,a.want);
    if(give&&want&&K.ovr(give)<K.ovr(want)-4) return resolveAuto(m, fnsOf(m).indexOf('declineTrade'), '단장이 불리한 제안을 거절');
  }
}
function setDeleg(k,v){ deleg()[k]=v; render(); if(document.querySelector('.modal-bg')){ closeModal(); delegPicker(); } }
function delegPicker(){
  const d=deleg(), f=fm();
  const row=(k,title,who,opts)=>`<div style="padding:10px 0;border-bottom:1px solid var(--line)"><b>${title}</b> <span class="muted" style="font-size:12px">· ${who}</span>
    <div class="tabsm" style="margin:6px 0 0">${opts.map(([v,l])=>`<button class="${d[k]===v?'active':''}" onclick="FM.setDeleg('${k}','${v}')">${l}</button>`).join('')}</div></div>`;
  modal(`<span class="closeX" onclick="App.closeModal()">×</span><h2>⚙ 업무 분담</h2>
    <div class="hint">맡긴 업무는 메시지가 오는 즉시 담당자가 처리하고 "자동 처리됨"에 기록합니다. 직접 하는 업무도 기한이 지나면 무난한 기본 선택으로 처리됩니다.</div>
    <div style="padding:10px 0;border-bottom:1px solid var(--line)"><b>휴식 관리</b> <span class="muted" style="font-size:12px">· 수석코치</span>
      <div class="tabsm" style="margin:6px 0 0"><button class="${f.autoRest?'':'active'}" onclick="FM.setAutoRest(false);App.closeModal();FM.delegPicker()">직접</button><button class="${f.autoRest?'active':''}" onclick="FM.setAutoRest(true);App.closeModal();FM.delegPicker()">맡기기</button></div></div>
    ${row('press','경기 전후·구단·지역 인터뷰','홍보팀',[['self','직접'],['safe','무난하게 답변'],['decline','모두 사양']])}
    ${row('talk','선수 면담 요청','수석코치',[['self','직접'],['coach','맡기기']])}
    ${row('trade','다른 구단의 트레이드 제안','단장',[['self','직접'],['rejectBad','불리한 제안은 자동 거절']])}
    <div class="hint" style="margin-top:10px">취임 기자회견·미디어데이 같은 큰 행사와 재계약·2군 콜업 추천은 항상 감독이 직접 결정합니다.</div>`);
}
// same sender, same game day, plain reports: one message
function mergeReport(m){
  if(isDecision(m) || !["regular","postseason","spring"].includes(state.phase)) return null;
  const f=fm(), o=f.inbox.find(x=>x!==m&&!isDecision(x)&&!x.read&&x.from===m.from&&x.icon===m.icon&&x.at===m.at&&x.year===m.year);
  if(!o) return null;
  o.parts=(o.parts||[o.subject]); o.parts.push(m.subject);
  o.subject=`${o.parts[0]} 외 ${o.parts.length-1}건`;
  o.body=o.body+'\n\n────────\n\n'+m.subject+'\n'+m.body;
  return o;
}
function send(from, icon, subject, body, actions){
  const f=fm();
  const m={id:f.nextId++, ug:userGamesPlayed(), year:state.year, from, icon, subject, body, read:false, actions:actions||[], done:false};
  stamp(m);
  const merged=mergeReport(m); if(merged) return merged;
  f.inbox.unshift(m);
  if(f.inbox.length>200) f.inbox.length=200;
  delegate(m);
  return m;
}
function unread(){ return fm()? fm().inbox.filter(m=>!m.read).length : 0; }
function pending(){ return fm()? fm().inbox.filter(m=>!m.done && m.actions.length).length : 0; }

// Action handlers referenced by name from messages (functions aren't saved, names are).
const ACTIONS={
  promisePlay(m,a){ const p=findPlayer(USER,a.n); if(!p) return '이미 팀을 떠난 선수입니다.';
    p.mor=clampN(p.mor+18,5,99); fm().promises.push({n:a.n, from:userGamesPlayed(), until:userGamesPlayed()+7, need:4});
    return `${a.n}에게 앞으로 7경기 중 4경기 이상 출전을 약속했습니다. 약속을 지키지 못하면 크게 실망할 겁니다.`; },
  compete(m,a){ const p=findPlayer(USER,a.n); if(!p) return '이미 팀을 떠난 선수입니다.';
    const k=pers(p).k; const d = (k==='프로페셔널'||k==='승부욕')? 6 : -8; p.mor=clampN(p.mor+d,5,99);
    return d>0? `${a.n}: "알겠습니다. 실력으로 증명하겠습니다." (사기 상승)` : `${a.n}은(는) 실망한 채 돌아갔습니다. (사기 하락)`; },
  listMe(m,a){ const p=findPlayer(USER,a.n); if(!p) return '이미 팀을 떠난 선수입니다.';
    p.listed=true; p.mor=clampN(p.mor+8,5,99); return `${a.n}을(를) 트레이드 리스트에 올렸습니다. 다른 구단의 제안이 들어올 수 있습니다.`; },
  encourage(m,a){ const p=findPlayer(USER,a.n); if(!p) return '이미 팀을 떠난 선수입니다.';
    const d=pers(p).k==='예민함'?15:10; p.mor=clampN(p.mor+d,5,99); return `${a.n}이(가) 고마워합니다. (사기 +${d})`; },
  scold(m,a){ const p=findPlayer(USER,a.n); if(!p) return '이미 팀을 떠난 선수입니다.';
    const d=pers(p).k==='승부욕'?8:-10; p.mor=clampN(p.mor+d,5,99);
    return d>0? `${a.n}이(가) 이를 악물었습니다. (사기 +8)` : `${a.n}이(가) 상처받았습니다. (사기 ${d})`; },
  restNext(m,a){ a.names.forEach(n=>{ if(fm().restNext.indexOf(n)<0) fm().restNext.push(n); });
    return `다음 경기에서 ${a.names.join(', ')} 선수에게 휴식을 줍니다.`; },
  keepGoing(){ return '현재 라인업을 유지합니다.'; },
  acceptTrade(m,a){
    const theirs=findPlayer(a.team,a.give), mine=findPlayer(USER,a.want);
    if(!theirs||!mine) return '선수 구성이 바뀌어 제안이 무효가 되었습니다.';
    const b=tradeBudget([a.want],a.team,[a.give]); if(!b.ok) return '❌ '+b.msg;
    const why=doTrade(a.team,[a.want],[a.give]); if(why) return '❌ '+why;
    return `트레이드 성사! ${a.want} ↔ ${a.give} (${K.ROSTERS[a.team].name}). 라인업이 자동 재구성되었습니다.`; },
  declineTrade(){ return '제안을 거절했습니다.'; },
  renew(m,a){ const p=findPlayer(USER,a.n); if(!p) return '이미 팀을 떠난 선수입니다.';
    const newPay=payroll(USER)-(p.sal||0)+a.sal;
    if(newPay>fm().fin.budget*1.15) return `❌ 예산 초과입니다. 재계약 시 연봉 총액 ${newPay.toFixed(1)}억 > 한도 ${(fm().fin.budget*1.15).toFixed(1)}억`;
    p.sal=a.sal; p.yrs=a.years; p.expiring=false; p.mor=clampN(p.mor+6,5,99);
    return `${a.n}와(과) ${a.years}년 연봉 ${a.sal}억 원에 재계약했습니다.`; },
  release(m,a){ const p=findPlayer(USER,a.n); if(!p) return '이미 팀을 떠난 선수입니다.';
    p.leaving=true; return `${a.n}은(는) 시즌 종료 후 팀을 떠납니다.`; },
  swapLineup(m,a){ const c=state.cfgs[USER], i=c.lineup.indexOf(a.out), inP=findPlayer(USER,a.in);
    if(i<0||!inP||c.lineup.indexOf(a.in)>=0) return '라인업이 이미 바뀌어 적용할 수 없습니다.';
    c.lineup[i]=a.in; return `${a.in}이(가) ${a.out} 대신 ${(c.positions||[])[i]||''} 자리에 들어갑니다.`; },
  swapRotation(m,a){ const c=state.cfgs[USER], i=c.rotation.indexOf(a.out);
    if(i<0||!findPlayer(USER,a.in)) return '로테이션이 이미 바뀌어 적용할 수 없습니다.';
    c.rotation[i]=a.in; c.bullpen=c.bullpen.filter(n=>n!==a.in); if(c.bullpen.indexOf(a.out)<0) c.bullpen.push(a.out);
    return `${a.in}이(가) 선발 로테이션에 들어가고 ${a.out}은(는) 불펜으로 갑니다.`; },
  media(m,a){ const f=fm();
    if(a.kind==='players'){ allPlayers(USER).forEach(p=>addMor(p,3)); return '선수들이 감독의 신뢰에 고무되었습니다. (선수단 사기 상승)'; }
    if(a.kind==='me'){ f.board.conf=clampN(f.board.conf+2,0,100); allPlayers(USER).forEach(p=>addMor(p,1)); return '책임지는 모습에 이사회와 선수단 모두 좋게 봤습니다. (이사회 신뢰도 +2)'; }
    allPlayers(USER).forEach(p=>{ const k=pers(p).k; addMor(p, (k==='승부욕'||k==='리더형')?3:-3); });
    f.board.conf=clampN(f.board.conf+1,0,100); return '승부욕 강한 선수들은 자극을 받았지만, 일부는 서운해합니다.'; },
  interview(m,a){ return interviewAnswer(a); },
  press(m,a){ return pressApply(m,a); },
  openClub(){ setTimeout(()=>App.tab('club'),0); return '구단 탭에서 외국인 선수 후보를 확인합니다.'; },
  ok(){ return '확인했습니다.'; }
};
function act(id, i){
  const m=fm().inbox.find(x=>x.id===id); if(!m||m.done) return;
  const a=m.actions[i]; const res=ACTIONS[a.fn](m,a.arg||{});
  if(String(res).startsWith('❌')){ notify(res.replace(/^❌ /,'')); return; } // stays open
  m.done=true; m.result=res; m.read=true; render();
}

