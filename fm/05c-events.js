// ---------- seeded events (data is read lazily: 05d loads after this file) ----------
const evtLegacy=Object.assign({},EV);
function evtData(){ return typeof EVT_DATA==='undefined'? [] : EVT_DATA; }
function evtState(){
  const f=fm(); if(!f.evt) f.evt={seed:hash(USER+'|'+state.year+'|events'),seen:{},flags:{},pending:[],promises:[],log:[]};
  const e=f.evt;
  for(const k of ['seen','flags']) if(!e[k]) e[k]={};
  for(const k of ['pending','promises','log']) if(!Array.isArray(e[k])) e[k]=[];
  if(!Number.isFinite(e.seed)) e.seed=hash(USER+'|'+state.year+'|events');
  for(const pr of e.promises){ if(pr.last==null)pr.last=pr.from; if(pr.done==null)pr.done=0;
    if(pr.year==null)pr.year=state.year; if(pr.tradeFrom==null)pr.tradeFrom=(f.tradeLog||[]).length; }
  // Dispatch through the existing offResolve/offAuto flow, including restored cards.
  for(const t of evtTemplates()) if(!EV[t.id]||!EV[t.id]._evt){ const old=evtLegacy[t.id];
    EV[t.id]={_evt:true,make:old&&old.make,safe:999,pick(i,d,o){
      const card=o&&o.q[0]; return card&&card._evt?evtResolve(card,i):old?old.pick(i,d,o):'';
    }}; }
  return e;
}
function evtRng(){ const e=evtState(); e.seed=(e.seed+0x6D2B79F5)>>>0;
  let x=Math.imul(e.seed^e.seed>>>15,1|e.seed); x^=x+Math.imul(x^x>>>7,61|x);
  return ((x^x>>>14)>>>0)/4294967296; }
function evtStage(){ return state.phase==='regular'?'season':state.phase==='spring'?'spring':fm().off&&fm().off.stage==='camp'?'camp':'stove'; }
function evtRef(p){ if(!p) return null; for(const t of K.TEAM_IDS) if(allPlayers(t).concat(farmOf(t)).includes(p)) return {n:p.n,t}; return null; }
function evtPlayer(r){ return r&&K.ROSTERS[r.t]?allPlayers(r.t).concat(farmOf(r.t)).find(p=>p.n===r.n)||null:null; }
function evtPack(x){ if(x==null||typeof x!=='object') return x;
  const p=x.n&&x.type&&evtRef(x); if(p) return p;
  if(Array.isArray(x)) return x.map(evtPack);
  return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,evtPack(v)])); }
function evtLine(p,stats){ const s=stats&&stats[p.type==='P'?'pit':'bat'][p.n]||{}, ab=s.AB||0, out=s.OUT||0;
  return {PA:s.PA||0,AVG:ab?(s.H||0)/ab:0,OPS:(ab+(s.BB||0)+(s.HBP||0)+ (s.SF||0)?((s.H||0)+(s.BB||0)+(s.HBP||0))/(ab+(s.BB||0)+(s.HBP||0)+(s.SF||0)):0)+(ab?((s.H||0)+(s._2B||0)+2*(s._3B||0)+3*(s.HR||0))/ab:0),HR:s.HR||0,IP:out/3,ERA:out?(s.ER||0)*27/out:0,G:s.G||0}; }
function evtContext(stage){
  const e=evtState(), f=fm(), cfg=state.cfgs[USER], games=userGamesPlayed();
  const all=()=>allPlayers(USER).concat(farmOf(USER));
  const inLineup=p=>!!p&&(p.type==='P'?cfg.rotation:cfg.lineup).includes(p.n);
  let streak=0; for(const g of state.schedule.filter(g=>g.played&&(g.home===USER||g.away===USER)).reverse()){
    const d=Math.sign(g.home===USER?g.hr-g.ar:g.ar-g.hr); if(!d||(streak&&Math.sign(streak)!==d)) break; streak+=d; }
  return Object.freeze({year:state.year,stage,rank:games?standings().findIndex(x=>x.t===USER)+1:(e.lastRank||f.board.strengthRank),games,streak,
    payroll:payroll(USER),budget:f.fin.budget,fans:fans(),conf:f.board.conf,mode:f.off&&f.off.mode||null,
    roster:()=>allPlayers(USER),farm:()=>farmOf(USER).slice(),all,find:fn=>all().filter(fn).sort((a,b)=>K.ovr(b)-K.ovr(a))[0]||null,
    ovr:p=>K.ovr(p),pot:p=>p.pot,age:p=>p.age,sal:p=>p.sal,yrs:p=>p.yrs,isFarm:p=>isFarm(USER,p),injured:p=>K.isInjured(p),inLineup,
    benchRate:p=>{ const recent=e.recent||[]; return games&&recent.length?1-recent.filter(g=>g.includes(p.n)).length/recent.length:1-Number(inLineup(p)); },
    seasonLine:p=>evtLine(p,state.season[USER]),springLine:p=>evtLine(p,state.spring&&state.spring.stats),
    lastChoice:id=>{ const x=e.log.slice().reverse().find(x=>x.id===id);return x?x.choice:null; },flag:k=>e.flags[k],
    promiseKept:key=>typeof e.flags['promise:'+key]==='boolean'?e.flags['promise:'+key]:null,rng:evtRng,josa});
}
function evtTemplates(){
  const data=evtData(), ids=new Set(data.map(t=>t.id));
  return data.concat(STOVE_RANDOM.concat(CAMP_EVENTS).filter(id=>!ids.has(id)).map(id=>({id,stage:STOVE_RANDOM.includes(id)?'stove':'camp',rarity:'common',cool:1,legacy:true})));
}
function evtEligible(t){ const ys=evtState().seen[t.id]||[], cool=Math.max(t.rarity==='rare'?4:0,t.cool==null?2:t.cool);
  return !ys.some(y=>state.year-y<cool||y===state.year); }
function evtBuild(t,stage,scheduled){
  let c=evtContext(stage), picked={}, card;
  if(scheduled){ for(const [k,r] of Object.entries(scheduled.ctx||{})){ picked[k]=evtPlayer(r); if(!picked[k]) return null; }
    c=Object.assign({},c,picked,{prev:scheduled.prev});
  }else{ picked=t.pick?t.pick(c):{}; if(!picked||Object.values(picked).some(x=>x==null)) return null; c=Object.assign({},c,picked); }
  if(t.when&&!t.when(c)) return null;
  if(t.legacy){ const off=Object.assign({talked:[],used:[]},fm().off); off.talked=off.talked.slice();
    card=evtLegacy[t.id].make(off); if(!card) return null;
    card.legacy=true; card.talked=off.talked;
  }else{ card=t.make(c); if(!card||!Array.isArray(card.opts)||!card.opts.length) throw new Error('event make: '+t.id); }
  if(!card.opts.length||card.opts.some(o=>!o.l||!o.d)) throw new Error('event options: '+t.id);
  const refs={}; for(const [k,p] of Object.entries(picked)){ const r=evtRef(p); if(r) refs[k]=r; }
  card=evtPack(card); card.id=t.id; card._evt=true; card.ctx=refs; card.stage=stage; card.year=state.year;
  if(scheduled) card.prev=scheduled.prev;
  card.title=josa(card.title); card.body=josa(card.body); card.opts.forEach(o=>{o.l=josa(o.l);o.d=josa(o.d);});
  return card;
}
function evtMark(card){ const e=evtState(); (e.seen[card.id]||(e.seen[card.id]=[])).push(state.year);
  if(card.talked&&fm().off) fm().off.talked=card.talked;
  return card; }
function evtDraw(stage){ const pool=[];
  for(const t of evtTemplates()) if(t.stage===stage&&!t.chain&&evtEligible(t)){ const card=evtBuild(t,stage); if(card) pool.push({card,w:({common:6,uncommon:3,rare:1})[t.rarity]||6}); }
  let n=evtRng()*pool.reduce((s,x)=>s+x.w,0); for(const x of pool){ n-=x.w;if(n<0) return evtMark(x.card); } return null;
}
function evtWeek(stage){ return stage==='camp'?campState().week:stage==='spring'?Math.floor((state.spring&&state.spring.played||0)/3):stage==='season'?Math.floor(userGamesPlayed()/6):(fm().off&&fm().off.week||0); }
function evtWeekDue(stage,after,target){
  const stages=['stove','camp','spring','season'], spans=[fm().off?fm().off.weeks.length:6,4,Math.ceil(SPRING_GAMES/3),24];
  let i=stages.indexOf(stage), week=evtWeek(stage)+after, year=state.year;
  while(week>=spans[i]){week-=spans[i];i++;if(i===stages.length){i=0;year++;}}
  // A chain's declared stage is the earliest stage in which its story can arrive.
  const targetIndex=stages.indexOf(target);if(targetIndex>i){i=targetIndex;week=0;}
  return {at:{week,stage:stages[i]},year};
}
function evtPending(stage){ const e=evtState(), templates=evtTemplates();
  for(let i=0;i<e.pending.length;i++){ const p=e.pending[i], at=p.at;
    if(at.games!=null?stage!=='season'||(p.dueYear||p.year||state.year)>state.year||userGamesPlayed()<at.games:at.stage!==stage||evtWeek(stage)<at.week||(p.dueYear||p.year||state.year)>state.year) continue;
    e.pending.splice(i--,1); const t=templates.find(t=>t.id===p.id); if(!t) throw new Error('event then target: '+p.id);
    if(!evtEligible(t)) continue;
    const card=evtBuild(t,stage,p); if(card) return evtMark(card);
  } return null;
}
function evtOff(o){ evtState(); return evtPending(o.stage)||evtDraw(o.stage); }
function evtApply(fx){ const out=[];
  for(const x of fx||[]){ const [k,a,b,d]=x, p=['mor','cond','inj','stat','list','sal'].includes(k)?evtPlayer(a):null;
    if(k==='chance'){ out.push(...evtApply(evtRng()<a?b:d)); continue; }
    if(['mor','cond','inj','stat','list','sal'].includes(k)&&!p) continue;
    if(k==='mor') addMor(p,b);
    else if(k==='cond') p.cond=clampN(K.cond(p)+b,0,100);
    else if(k==='fans') addFans(a);
    else if(k==='conf') fm().board.conf=clampN(fm().board.conf+a,0,100);
    else if(k==='money') fm().fin.balance=eok(fm().fin.balance+a);
    else if(k==='flag') evtState().flags[a]=b;
    else if(k==='inj') p.inj=b;
    else if(k==='stat'){ if(d>=0) bumpWithin(p,b,d); else p[b]+=d; }
    else if(k==='list') p.listed=true;
    else if(k==='sal') p.sal=Math.max(0,eok(p.sal+b));
    else throw new Error('unknown event fx: '+k);
    out.push(k==='flag'?a+' 설정':k==='list'?p.n+' 트레이드 리스트 등록':(p?p.n+' ':'')+({mor:'사기',cond:'컨디션',fans:'팬 여론',conf:'이사회 신뢰',money:'잔고',inj:'부상 기간',stat:b,sal:'연봉'}[k])+' '+(k==='stat'?d:p?b:a));
  } return out;
}
function evtResolve(card,i){
  if(card.resolved) return card.result||'';
  const e=evtState(), opt=card.opts[i]||card.opts[card.opts.length-1]; i=card.opts.indexOf(opt);
  const summary=card.legacy?evtLegacy[card.id].pick(i,card.data,fm().off):evtApply(opt.fx).join(' · ');
  if(opt.promise){ const pr=opt.promise, who=pr.who, key=card.id+'|'+who.n;
    delete e.flags['promise:'+key]; e.promises=e.promises.filter(p=>p.key!==key);
    e.promises.push({key,kind:pr.kind,who,n:pr.n||0,within:pr.within||0,from:userGamesPlayed(),label:pr.label||opt.d,by:card.id,year:state.year,done:0,last:userGamesPlayed(),tradeFrom:(fm().tradeLog||[]).length,opening:pr.kind==='notrade'&&['stove','camp'].includes(card.stage)});
  }
  if(opt.then){ const t=opt.then, target=evtTemplates().find(x=>x.id===t.id); if(!target) throw new Error('event then target: '+t.id);
    let at,dueYear=state.year;
    if(t.afterGames!=null){ let games=userGamesPlayed()+t.afterGames; if(games>144){games-=144;dueYear++;} at={games}; }
    else{ const due=evtWeekDue(card.stage,t.afterWeeks||0,target.stage);at=due.at;dueYear=due.year; }
    e.pending.push({id:t.id,at,ctx:card.ctx,prev:{id:card.id,title:card.title,choice:opt.l,i},year:state.year,dueYear});
  }
  e.log.push({id:card.id,year:state.year,title:card.title,choice:i});
  card.resolved=true;card.result=josa(opt.res||summary||'현재 방침을 유지합니다.'); return card.result;
}
ACTIONS.evtChoice=(m,a)=>evtResolve(m.event,a.i);
function evtInbox(card){ if(!card) return;
  const m=send(card.who,card.icon,card.title,card.body,card.opts.map((o,i)=>({label:o.l,fn:'evtChoice',arg:{i}})));
  m.event=card; m.prev=card.prev; m.due=clock()+3; m.def=card.opts.length-1;
}
function evtTraded(pr){ return (fm().tradeLog||[]).slice(pr.tradeFrom||0).some(x=>
  x.a===pr.who.t&&(x.aGive||[]).some(p=>p.n===pr.who.n)||x.b===pr.who.t&&(x.bGive||[]).some(p=>p.n===pr.who.n)); }
function evtPromiseTick(starters,opening){ const e=evtState(), games=userGamesPlayed();
  e.promises=e.promises.filter(pr=>{
    const p=evtPlayer(pr.who), active=!!p&&!isFarm(pr.who.t,p), elapsed=games-pr.from; let verdict=null;
    if(evtTraded(pr)) verdict=false;
    else if(pr.kind!=='notrade'&&!p) verdict=false;
    else if(pr.opening){ if(opening) verdict=true; }
    else if(!opening&&games>pr.last){
      pr.last=games;
      if(pr.kind==='starts') pr.done+=(starters||[]).includes(pr.who.n)?1:0;
      if(pr.kind==='active'){ if(!active) verdict=false; else pr.done++; }
      if(pr.kind==='callup') pr.done=active?pr.done+1:0;
      if(pr.kind==='notrade') pr.done++;
      if(['starts','callup'].includes(pr.kind)&&pr.done>=pr.n) verdict=true;
      if(verdict==null&&elapsed>=pr.within) verdict=pr.kind==='active'||pr.kind==='notrade';
    }
    if(verdict==null) return true; e.flags['promise:'+pr.key]=verdict; return false;
  });
}
function evtPromises(){ return evtState().promises.map(pr=>({who:pr.who.n,label:pr.label,kind:pr.kind,done:pr.done||0,
  need:['starts','callup'].includes(pr.kind)?pr.n:pr.within,left:Math.max(0,pr.within-(userGamesPlayed()-pr.from))})); }
function evtAfterGame(res){ if(state.phase!=='regular'||(res.home!==USER&&res.away!==USER)) return;
  const e=evtState(), g=userGamesPlayed(); if(e.gameYear===state.year&&e.game===g) return;
  e.gameYear=state.year;e.game=g;
  const starters=(e.prepared||[]).concat(res.home===USER?res.homeSP:res.awaySP).filter(Boolean);
  (e.recent||(e.recent=[])).push(starters);if(e.recent.length>20)e.recent.shift();
  e.lastRank=standings().findIndex(x=>x.t===USER)+1;evtPromiseTick(starters,false);
  if(g-(e.lastDelivery==null?-10:e.lastDelivery)<10) return;
  const card=evtPending('season')||(g%10===0&&evtRng()<0.6?evtDraw('season'):null);
  if(card){evtInbox(card);e.lastDelivery=g;}
}
// Keep lifecycle integration in the engine-owned file; original inputs/returns are untouched.
const evtPrepareCfg=prepareCfg;
prepareCfg=function(team,cfg){ const out=evtPrepareCfg(team,cfg);if(team===USER)evtState().prepared=out.lineup.slice();return out; };
const evtSpringRecord=springRecord;
springRecord=function(res){ const before=state.spring&&state.spring.played, out=evtSpringRecord(res);
  if(state.spring&&state.spring.played>before)evtInbox(evtPending('spring')||(state.spring.played%3===0&&evtRng()<0.5?evtDraw('spring'):null));return out; };
const evtOpenSeason=openSeason;
openSeason=function(){evtPromiseTick([],true);return evtOpenSeason();};
const evtRegularSeasonEnd=onRegularSeasonEnd;
onRegularSeasonEnd=function(){evtState().lastRank=standings().findIndex(x=>x.t===USER)+1;return evtRegularSeasonEnd();};
const evtSeasonStart=seasonStart;
seasonStart=function(first){const out=evtSeasonStart(first), e=evtState();
  e.pending=e.pending.filter(p=>state.year-(p.year==null?state.year:p.year)<=1);
  e.recent=[];e.lastDelivery=null;e.game=null;
  for(const pr of e.promises){ if(pr.year<state.year){pr.from-=144;pr.last=0;pr.year=state.year;} }
  return out;};

// Legacy compatibility: stochastic methods use the event seed.
evtLegacy.raise=Object.assign({},evtLegacy.raise,{pick(i,d){ const p=findPlayer(USER,d.n); if(!p) return '선수가 이미 팀을 떠났습니다.';
      if(i===0){ p.sal=eok(p.sal+d.up); addMor(p,12); memo('raise',d.n,`${d.n}의 연봉 인상 요구 수용`); return `${d.n}의 연봉이 ${p.sal}억이 됐습니다. 선수는 구단의 대우에 만족합니다.`; }
      if(i===1){ addMor(p,-4); return `${d.n}은(는) 아쉬워하면서도 받아들였습니다.`; }
      addMor(p,-14); if(evtRng()<0.3){ p.listed=true; return `${d.n}이(가) 크게 실망했고, 트레이드를 요청했습니다.`; } return `${d.n}이(가) 크게 실망했습니다.`; }});
evtLegacy.rival=Object.assign({},evtLegacy.rival,{pick(i,d){ const f=fm(), x=(f.fa||[]).find(x=>x.p.n===d.n); if(!x) return '이미 계약이 끝났습니다.';
      const lose=()=>{ const t=offAiSign(x); return `${d.n}은(는) ${t?K.ROSTERS[t].name:'다른 구단'} 유니폼을 입었습니다.`; };
      if(i===2) return lose(); const sal=i===0? eok(x.ask*1.2) : x.ask;
      if(payroll(USER)+sal>f.fin.budget*1.1) return '연봉 총액 한도를 넘어 제안을 넣지 못했습니다. '+lose();
      if(i===1&&evtRng()<0.5) return lose(); memo('fa',d.n,`경쟁 끝에 FA ${d.n} 영입`); return faSign(x,{sal,yrs:x.yrs}); }});
evtLegacy.prospect=Object.assign({},evtLegacy.prospect,{make(){ const young=allPlayers(USER).filter(p=>p.age<=23&&(p.pot||0)>=K.ovr(p)+4).sort((a,b)=>(b.pot||0)-(a.pot||0))[0]; if(!young) return null;
      const t=K.TEAM_IDS.filter(t=>t!==USER).sort(()=>evtRng()-0.5)[0], vet=allPlayers(t).filter(p=>p.type===young.type&&(p.type==='B'||(p.role==='SP')===(young.role==='SP'))&&p.age>=28&&K.ovr(p)>=K.ovr(young)+3&&K.ovr(p)<=K.ovr(young)+8).sort(byOvr)[0]; if(!vet||!tradeVerdict(t,[young],[vet]).ok) return null;
      return {who:`${K.ROSTERS[t].name} 단장`,icon:'🌱',title:`유망주 ${young.n}을(를) 달라는 제안`,body:`${K.ROSTERS[t].name}에서 ${young.n}(${young.age}세, OVR ${K.ovr(young)}, 잠재력 ${young.pot})을(를) 원합니다.\n대가: ${vet.n}(${vet.age}세, OVR ${K.ovr(vet)})\n\n올해 전력은 올라가지만 미래를 내주는 거래입니다.`,
        opts:[{l:'받아들인다',d:`지금 전력 +${K.ovr(vet)-K.ovr(young)} · 유망주를 잃는다`},{l:'거절한다',d:`${young.n}의 사기 상승`}],data:{t,want:young.n,give:vet.n}}; }});
evtLegacy.foreign=Object.assign({},evtLegacy.foreign,{pick(i,d){ const p=findPlayer(USER,d.n); if(!p) return '';
      if(i===0){ p.sal=eok(p.sal+d.up); addMor(p,8); return `${d.n}와(과) 연봉 ${p.sal}억에 합의했습니다.`; }
      if(evtRng()<0.5){ p.sal=eok(p.sal*0.95); return `${d.n} 측이 물러섰습니다. 연봉 ${p.sal}억.`; } addMor(p,-12); return `협상이 감정싸움이 됐습니다. ${d.n}의 사기가 크게 떨어졌습니다.`; }});
evtLegacy.newpitch=Object.assign({},evtLegacy.newpitch,{pick(i,d){ const p=findPlayer(USER,d.n), c=campState(); if(!p) return '';
      if(i===1){ const g=bumpWithin(p,'ctl',1); c.notes.push(`${d.n}: 기존 구종을 다듬었습니다`); return g? `${d.n}의 제구가 좋아졌습니다.` : `${d.n}은(는) 지금 폼을 유지했습니다.`; }
      if(evtRng()<0.6){ const g=bumpWithin(p,'mov',3), G=c.gain[p.n]||(c.gain[p.n]={}); G.mov=(G.mov||0)+g; c.notes.push(`${d.n}: 새 구종 장착`); memo('camp',d.n,`캠프에서 ${d.n}에게 새 구종을 가르침`,'newpitch'); return `${d.n}의 새 구종이 불펜 피칭에서 타자들을 속입니다. 무브먼트 +${g}.`; }
      p.ctl=Math.max(25,p.ctl-2); c.notes.push(`${d.n}: 새 구종이 손에 익지 않았습니다`); return `${d.n}의 새 구종이 좀처럼 손에 익지 않습니다. 제구 -2.`; }});
evtLegacy.posswitch=Object.assign({},evtLegacy.posswitch,{pick(i,d){ const p=findPlayer(USER,d.n), c=campState(); if(!p) return '';
      if(i===0){ p.alt=POS_NEXT[p.pos]; p.fld=Math.max(25,p.fld-1); c.notes.push(`${d.n}: ${p.alt} 수비 습득`); memo('camp',d.n,`캠프에서 ${d.n}에게 ${p.alt} 수비를 가르침`,'posswitch'); return `${d.n}이(가) ${p.alt} 수비를 익혔습니다.`; }
      const g=evtRng()<0.5? bumpWithin(p,'fld',1) : 0; return g? `${d.n}의 수비가 한결 안정됐습니다.` : `${d.n}은(는) 지금 자리에서 훈련을 이어 갔습니다.`; }});
evtLegacy.form=Object.assign({},evtLegacy.form,{pick(i,d){ const p=findPlayer(USER,d.n), c=campState(); if(!p) return '';
      if(i===1){ addMor(p,2); return `${d.n}은(는) 익숙한 폼으로 시즌을 준비합니다.`; }
      if(evtRng()<0.6){ const g=bumpWithin(p,'pow',2), G=c.gain[p.n]||(c.gain[p.n]={}); G.pow=(G.pow||0)+g; c.notes.push(`${d.n}: 타격폼 수정 성공`); memo('camp',d.n,`캠프에서 ${d.n}의 타격폼을 수정`,'form'); return `${d.n}의 타구가 달라졌습니다. 파워 +${g}.`; }
      p.con=Math.max(25,p.con-1); addMor(p,-5); c.notes.push(`${d.n}: 타격폼 수정 실패`); return `${d.n}이(가) 새 폼에 적응하지 못하고 있습니다. 컨택 -1.`; }});
evtLegacy.feud=Object.assign({},evtLegacy.feud,{pick(i,d){ const a=findPlayer(USER,d.a), c=findPlayer(USER,d.c); if(!a||!c) return '';
      if(i===0){ if(evtRng()<0.5){ addMor(a,6); addMor(c,6); return '둘이 오래 이야기를 나눴고, 다음 날 불펜에서 웃음소리가 났습니다.'; } addMor(a,-3); addMor(c,-3); return '자리는 어색하게 끝났습니다.'; }
      if(i===1){ addMor(a,8); addMor(c,-9); return `${d.a}은(는) 만족했지만 ${d.c}의 표정이 굳었습니다.`; }
      addMor(a,-6); return `${d.a}은(는) 감독이 나서 주지 않아 서운해합니다.`; }});
evtLegacy.injury=Object.assign({},evtLegacy.injury,{make(){ const c=state.cfgs[USER], pool=c.lineup.concat(c.rotation).map(n=>findPlayer(USER,n)).filter(p=>p&&!K.isInjured(p)), p=pool[Math.floor(evtRng()*pool.length)]; if(!p) return null;
      const co=staffOf(USER).cond; return {who:`${co.n} 컨디셔닝코치`,icon:'🩺',title:`${p.n}의 부상 조짐`,body:`${p.n}이(가) 훈련 중 불편함을 호소했습니다. 큰 문제는 아닐 수도 있습니다.`,
        opts:[{l:'정밀 검사를 받게 한다',d:'6경기 결장 · 올 시즌 부상 위험 -30%'},{l:'테이핑하고 훈련을 이어 간다',d:'70%: 문제없음 · 30%: 20경기 결장'}],data:{n:p.n}}; }});
evtLegacy.injury=Object.assign({},evtLegacy.injury,{pick(i,d){ const p=findPlayer(USER,d.n), c=campState(); if(!p) return '';
      if(i===0){ p.inj=6; p.tough=state.year; c.notes.push(`${d.n}: 정밀 검사 뒤 관리`); return `${d.n}은(는) 가벼운 염좌였습니다. 시범경기는 쉬고 개막에 맞춥니다.`; }
      if(evtRng()<0.3){ p.inj=20; c.notes.push(`${d.n}: 부상 악화`); return `${d.n}의 상태가 나빠졌습니다. 20경기 결장입니다.`; } return `${d.n}은(는) 다행히 괜찮았습니다.`; }});
