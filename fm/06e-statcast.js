
// ---------- 0.6 Statcast-style reports: what each pitch does, where each ball goes ----------
// Reads the flat season keys the engine adds (pC_* per pitch code, bb* per batter, zC_L_i zone cells for our
// club) and the spray points kept in fm().spray. Every chart is a hand-drawn SVG; nothing loads from outside.
const SC_CODES=['FF','SI','FC','SL','SW','CU','CH','FS','SP'];
const SC_NAME={FF:'직구',SI:'투심',FC:'커터',SL:'슬라이더',SW:'스위퍼',CU:'커브',CH:'체인지업',FS:'포크',SP:'스플리터'};
const SC_COL={FF:'#e5484d',SI:'#f5a524',FC:'#a1663a',SL:'#8e7cf0',SW:'#4cc3e6',CU:'#3b82f6',CH:'#30a46c',FS:'#2bb8a4',SP:'#d86bc4'};
const SPRAY_MAX=400;
const scPct=(a,b)=>b? (a*100/b).toFixed(1)+'%' : '-';
const scAvg=(a,b)=>b? fmtAvg(a/b) : '-';
// keep the last SPRAY_MAX balls in play of each of our hitters (the engine hands them over per game in bs.spr)
function sprayTake(team,box){
  if(team!==USER) { for(const n in box.bat) delete box.bat[n].spr; return; }
  const f=fm(); f.spray=f.spray||{};
  for(const n in box.bat){ const a=box.bat[n].spr; delete box.bat[n].spr; if(!a||!a.length) continue;
    const s=(f.spray[n]=f.spray[n]||[]); s.push(...a); if(s.length>SPRAY_MAX) s.splice(0,s.length-SPRAY_MAX); }
}
function scHas(s,isB){ if(!s) return false; return isB? (s.bbN||0)>0 : SC_CODES.some(c=>(s['p'+c+'_n']||0)>0); }

// ---- pitcher ----
function scPitchRows(s){ const tot=SC_CODES.reduce((a,c)=>a+(s['p'+c+'_n']||0),0);
  return SC_CODES.filter(c=>s['p'+c+'_n']).map(c=>{ const g=k=>s['p'+c+'_'+k]||0, n=g('n');
    return {c,n,use:n/tot,velo:g('v')/n,whiff:g('sw')?g('wh')/g('sw'):0,csw:(g('cs')+g('wh'))/n,zone:g('z')/n,ab:g('ab'),h:g('h'),tb:g('tb'),k:g('k'),gb:g('gb'),bip:g('bip'),nL:g('nL'),nR:g('nR'),sw:g('sw'),wh:g('wh')}; })
    .sort((a,b)=>b.n-a.n); }
function scMixBar(rows){
  let x=0; const segs=rows.map(r=>{ const w=r.use*100, seg=`<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="14" fill="${SC_COL[r.c]}"><title>${SC_NAME[r.c]} ${scPct(r.n,r.n/r.use)}</title></rect>`; x+=w; return seg; }).join('');
  return `<svg class="sc-mix" viewBox="0 0 100 14" preserveAspectRatio="none" role="img" aria-label="구종 구성">${segs}</svg>
    <div class="sc-legend">${rows.map(r=>`<span><i style="background:${SC_COL[r.c]}"></i>${SC_NAME[r.c]} ${(r.use*100).toFixed(0)}%</span>`).join('')}</div>`;
}
// average break of each pitch from the arsenal (pitcher's view: + = arm side, + = rise)
function scMovement(p,rows){
  // the engine stores catcher's-view cm (right-handers' arm side is negative); draw arm side to the right for both hands
  const lefty=K.handsOf&&K.handsOf(p.n).t==='좌';
  const ars=((K.arsenal? K.arsenal(p) : [])||[]).map(x=>Object.assign({},x,{hb:lefty? x.hb : -x.hb})); const pts=rows.map(r=>({r,a:ars.find(x=>x.code===r.c)})).filter(x=>x.a&&x.a.hb!=null);
  if(!pts.length) return '';
  const S=60, X=v=>(100+v*90/S).toFixed(1), Y=v=>(100-v*90/S).toFixed(1);
  const grid=[-40,-20,0,20,40].map(v=>`<line x1="${X(v)}" y1="10" x2="${X(v)}" y2="190" class="sc-grid${v?'':' z'}"/><line x1="10" y1="${Y(v)}" x2="190" y2="${Y(v)}" class="sc-grid${v?'':' z'}"/>`).join('');
  return `<figure class="sc-fig"><figcaption>무브먼트 <small>평균 · cm · 오른쪽 = 팔 쪽, 위 = 덜 떨어짐</small></figcaption>
    <svg viewBox="0 0 200 200" role="img" aria-label="구종별 무브먼트">${grid}
    ${pts.map(({r,a})=>`<circle cx="${X(a.hb)}" cy="${Y(a.vb)}" r="${(4+r.use*14).toFixed(1)}" fill="${SC_COL[r.c]}" fill-opacity=".85"><title>${SC_NAME[r.c]} 수평 ${a.hb.toFixed(0)} · 수직 ${a.vb.toFixed(0)}</title></circle><text x="${X(a.hb)}" y="${(+Y(a.vb)-9-r.use*14).toFixed(1)}" class="sc-lab">${SC_NAME[r.c]}</text>`).join('')}</svg></figure>`;
}
// where a pitch goes, catcher's view, 5x5 cells; the middle 3x3 is the zone
function scHeat(s,c,h){ const v=[]; let max=0; for(let i=0;i<25;i++){ const n=s['z'+c+'_'+h+'_'+i]||0; v.push(n); if(n>max) max=n; }
  if(!max) return '';
  const cells=v.map((n,i)=>{ const a=n/max; return `<rect x="${(i%5)*20}" y="${Math.floor(i/5)*20}" width="20" height="20" fill="${SC_COL[c]}" fill-opacity="${(0.06+a*0.86).toFixed(2)}"><title>${n}구</title></rect>`; }).join('');
  return `<figure class="sc-heat"><figcaption>${SC_NAME[c]} · ${h==='L'?'좌타':'우타'} <small>${v.reduce((a,b)=>a+b,0)}구</small></figcaption>
    <svg viewBox="-2 -2 104 104" role="img" aria-label="${SC_NAME[c]} ${h==='L'?'좌타자':'우타자'} 상대 로케이션">${cells}<rect x="20" y="20" width="60" height="60" class="sc-zone"/></svg></figure>`;
}
function pitchReport(team,p,s){
  if(!scHas(s,false)) return '';
  const rows=scPitchRows(s), top=rows.slice(0,3).map(r=>r.c);
  const heats=team===USER? top.flatMap(c=>['L','R'].map(h=>scHeat(s,c,h))).filter(Boolean).join('') : '';
  const sw=rows.reduce((a,r)=>a+r.sw,0), wh=rows.reduce((a,r)=>a+r.wh,0), N=rows.reduce((a,r)=>a+r.n,0);
  const fast=rows.find(r=>r.c==='FF'||r.c==='SI');
  return `<h4 class="st-group">투구 리포트</h4>
    <div class="sc-kpis"><div><small>직구 평균</small><b>${fast? fast.velo.toFixed(1):'-'}</b><em>km/h</em></div><div><small>헛스윙률</small><b>${scPct(wh,sw)}</b></div><div><small>CSW</small><b>${scPct(rows.reduce((a,r)=>a+r.csw*r.n,0),N)}</b></div><div><small>존 투구율</small><b>${scPct(rows.reduce((a,r)=>a+r.zone*r.n,0),N)}</b></div></div>
    ${scMixBar(rows)}
    <div class="sc-table"><table><thead><tr><th class="name">구종</th><th>비율</th><th>구속</th><th>헛스윙</th><th>피안타율/피장타율</th><th>땅볼</th><th>좌/우타</th></tr></thead><tbody>
    ${rows.map(r=>`<tr><td class="name"><i class="sc-dot" style="background:${SC_COL[r.c]}"></i>${SC_NAME[r.c]}</td><td>${(r.use*100).toFixed(0)}%</td><td>${r.velo.toFixed(1)}</td><td>${scPct(r.wh,r.sw)}</td><td>${scAvg(r.h,r.ab)} / ${scAvg(r.tb,r.ab)}</td><td>${scPct(r.gb,r.bip)}</td><td>${r.nL} / ${r.nR}</td></tr>`).join('')}</tbody></table></div>
    <div class="sc-figs">${scMovement(p,rows)}</div>
    ${heats?`<div class="sc-heats">${heats}</div><p class="hint">포수 시점이에요. 가운데 사각형이 스트라이크존이고, 색이 진할수록 많이 던진 곳이에요.</p>`:''}`;
}

// ---- hitter ----
const SPRAY_RES={'1B':'안타','2B':'2루타','3B':'3루타','HR':'홈런'};
function sprayChart(name){
  const pts=((fm().spray||{})[name]||[]).map(x=>{ const [ang,dist,t,res]=String(x).split(','); return {ang:+ang,dist:+dist,t,res}; }).filter(x=>isFinite(x.ang)&&isFinite(x.dist));
  if(!pts.length) return '';
  const R=130, P=(ang,d)=>{ const a=ang*Math.PI/180; return [(150+Math.sin(a)*d*130/R).toFixed(1),(150-Math.cos(a)*d*130/R).toFixed(1)]; };
  const fence=[-45,-30,-15,0,15,30,45].map(a=>P(a,98+(24*(1-Math.abs(a)/45)))); // a generic park: 98 m lines, 122 m center
  const inf=[P(-45,27.4),P(0,38.8),P(45,27.4)];
  const dots=pts.map(x=>{ const [cx,cy]=P(x.ang,x.dist), hit=SPRAY_RES[x.res];
    return `<circle class="sp-pt ${hit?'hit':'out'} t-${x.t}" data-t="${x.t}" cx="${cx}" cy="${cy}" r="${x.res==='HR'?3.6:2.6}"><title>${hit||'아웃'} · ${({GB:'땅볼',LD:'라인드라이브',FB:'뜬공',PU:'팝업',BU:'번트'})[x.t]||''} · ${Math.round(x.dist)}m</title></circle>`; }).join('');
  const btn=(v,l)=>`<button type="button" onclick="const w=this.closest('.sc-spray');w.dataset.f='${v}';w.querySelectorAll('.sc-filter button').forEach(b=>b.classList.toggle('active',b===this))" class="${v==='all'?'active':''}">${l}</button>`;
  return `<figure class="sc-spray" data-f="all"><figcaption>스프레이 차트 <small>최근 ${pts.length}타구 · 빨강 안타, 회색 아웃</small></figcaption>
    <div class="tabsm sc-filter">${btn('all','전체')}${btn('GB','땅볼')}${btn('LD','라인드라이브')}${btn('FB','뜬공')}</div>
    <svg viewBox="48 18 204 138" role="img" aria-label="${esc(name)} 스프레이 차트">
      <path d="M150 150 L${fence[0]} ${fence.map(p=>'L'+p.join(' ')).join(' ')} Z" class="sp-field"/>
      <path d="M150 150 L${inf.map(p=>p.join(' ')).join(' L')} Z" class="sp-inf"/>${dots}</svg></figure>`;
}
function batReport(team,p,s){
  if(!scHas(s,true)) return '';
  const N=s.bbN, g=k=>s[k]||0, dir=g('bbPull')+g('bbCent')+g('bbOppo');
  const xw=N? g('xw')/N : 0;
  return `<h4 class="st-group">타구 리포트</h4>
    <div class="sc-kpis"><div><small>평균 타구 속도</small><b>${(g('bbEV')/N).toFixed(1)}</b><em>km/h</em></div><div><small>강한 타구</small><b>${scPct(g('bbHard'),N)}</b></div><div><small>배럴</small><b>${scPct(g('bbBrl'),N)}</b></div><div><small>인플레이 xwOBA</small><b>${fmtAvg(xw)}</b></div></div>
    <div class="sc-split"><div><small>타구 유형</small>${[['bbGB','땅볼'],['bbLD','라인드라이브'],['bbFB','뜬공'],['bbPU','팝업']].map(([k,l])=>`<span>${l} <b>${scPct(g(k),N)}</b></span>`).join('')}</div>
      <div><small>방향</small>${[['bbPull','당겨친 타구'],['bbCent','가운데'],['bbOppo','밀어친 타구']].map(([k,l])=>`<span>${l} <b>${scPct(g(k),dir)}</b></span>`).join('')}</div></div>
    ${team===USER? sprayChart(p.n) : ''}`;
}
