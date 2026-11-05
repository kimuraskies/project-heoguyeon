'use strict';
const fs=require('node:fs'), path=require('node:path');
const {attrs,copy,json}=require('./runtime');
const sum=(rows,key)=>rows.reduce((a,x)=>a+(x[key]||0),0);
function totals(season){
  const b={},p={};let games=0;
  for(const s of Object.values(season)){games+=s.W+s.L+s.T;for(const x of Object.values(s.bat))for(const k in x)b[k]=(b[k]||0)+x[k];for(const x of Object.values(s.pit))for(const k in x)p[k]=(p[k]||0)+x[k];}
  return {games,bat:b,pit:p,...rates(b,p,games)};
}
function rates(b,p,games){return {AVG:b.H/b.AB,OBP:(b.H+b.BB+b.HBP)/(b.AB+b.BB+b.HBP+b.SF),SLG:(b.H+b._2B+2*b._3B+3*b.HR)/b.AB,ERA:27*p.ER/p.OUT,HR_G:b.HR/games,SB_G:b.SB/games,R_G:b.R/games,K_PA:b.SO/b.PA,BB_PA:b.BB/b.PA};}
function futuresTotals(f){return f?totals({farm:{...f,T:f.T,bat:f.bat,pit:f.pit}}):null;}
function inventory(h){const m=new Map();for(const {t,bucket,p} of h.players()){const loc=t+'/'+bucket;if(!m.has(p.n))m.set(p.n,[]);m.get(p.n).push({loc,t,bucket,n:p.n,age:p.age,ovr:h.K.ovr(p),pot:p.pot,type:p.type,inj:p.inj,downUg:p.downUg,downYear:p.downYear,attributes:attrs(p).map(k=>p[k])});}
  for(const {p} of h.state.fm.fa||[]){if(!m.has(p.n))m.set(p.n,[]);m.get(p.n).push({loc:'FA',bucket:'FA',n:p.n,age:p.age,ovr:h.K.ovr(p)});}return m;}

class Audit {
  constructor(out){this.out=out;fs.mkdirSync(path.join(out,'evidence'),{recursive:true});this.fd=fs.openSync(path.join(out,'violations.jsonl'),'w');this.summary={};this.previous=new WeakMap();this.totalChecks=0;this.ledger=[];this.passes={};}
  violation(h,code,detail){const item={...h.context(),at:h.lastCheckpoint,code,detail};fs.writeSync(this.fd,json(item)+'\n');
    const s=this.summary[code]||(this.summary[code]={occurrences:0,runs:{},first:item});s.occurrences++;s.runs[h.label]=(s.runs[h.label]||0)+1;
    if(s.occurrences===1&&h.state){fs.writeFileSync(path.join(this.out,'evidence',code+'.json'),json({context:item,actions:h.actions,snapshot:h.saveObject()}));}}
  pass(name,detail){this.passes[name]=detail??true;}
  stats(h,box,label){const bad=[];for(const type of ['bat','pit'])for(const [name,s] of Object.entries(box[type]||{})){
    const req=type==='bat'?['G','PA','AB','H','_2B','_3B','HR','BB','HBP','SO','R','RBI','SB','CS','SH','SF']:['G','GS','W','L','SV','HD','OUT','H','R','ER','BB','SO','HR','BF','NP'];
    for(const k of req)if(!Number.isFinite(s[k])||s[k]<0||!Number.isInteger(s[k]))bad.push({name,k,value:s[k]??'undefined'});
    if(type==='bat'&&(s.H>s.AB||s.H<s._2B+s._3B+s.HR||s.PA!==s.AB+s.BB+s.HBP+s.SH+s.SF))bad.push({name,identity:s});
    if(type==='pit'&&s.ER>s.R)bad.push({name,ER:s.ER,R:s.R});
  }if(bad.length)h.violation('INVALID_STATS',{label,bad});}
  config(h,c){const r=h.K.ROSTERS[c.teamId],bad=[];if(!r){h.violation('INVALID_GAME_CONFIG',{c});return;}
    if(c.lineup.length!==9||new Set(c.lineup).size!==9)bad.push('lineup length/duplicates');
    for(const n of c.lineup){const p=r.batters.find(p=>p.n===n);if(!p||h.K.isInjured(p))bad.push({lineup:n,inj:p?.inj,missing:!p});}
    const sp=r.pitchers.find(p=>p.n===c.spName);if(!sp||h.K.isInjured(sp))bad.push({starter:c.spName,inj:sp?.inj,missing:!sp});
    if(!c.positions||c.positions.length!==9||new Set(c.positions).size!==9)bad.push('positions');
    for(const n of c.bullpen||[])if(!r.pitchers.some(p=>p.n===n)||n===c.spName)bad.push({bullpen:n});
    if(bad.length)h.violation('INVALID_GAME_CONFIG',{team:c.teamId,bad,config:c});
  }
  box(h,r,kind){for(const t of [r.home,r.away])this.stats(h,r.box[t],kind+' '+t);
    for(const [t,o,score] of [[r.home,r.away,r.homeRuns],[r.away,r.home,r.awayRuns]]){
      const bats=Object.values(r.box[t].bat),arms=Object.values(r.box[o].pit);
      if(sum(bats,'R')!==score||sum(arms,'R')!==score||sum(bats,'H')!==sum(arms,'H')||sum(bats,'HR')!==sum(arms,'HR'))h.violation('BOX_CONSERVATION',{kind,t,score,batR:sum(bats,'R'),pitR:sum(arms,'R'),box:r.box});
    }if(!Number.isFinite(r.homeRuns)||!Number.isFinite(r.awayRuns)||r.innings>(kind==='postseason'?15:kind==='regular'?12:9))h.violation('GAME_COMPLETION',{kind,r});
  }
  check(h,label){this.totalChecks++;const s=h.state,inv=inventory(h),old=this.previous.get(h),max=[],min=[],sp=[],cfg=[],ratings=[],potential=[],duplicates=[];
    for(const [n,loc] of inv){if(loc.length>1)duplicates.push({n,locations:loc.map(x=>x.loc)});}
    if(duplicates.length)h.violation('DUPLICATE_PLAYER',duplicates);
    for(const t of h.K.TEAM_IDS){const r=h.K.ROSTERS[t],c=s.cfgs[t],num=r.batters.length+r.pitchers.length,ns=r.pitchers.filter(p=>p.role==='SP').length;
      if(num>28)max.push({team:t,count:num,batters:r.batters.length,pitchers:r.pitchers.length});
      // Offseason FA/retirement departures are deliberately repaired at nextSeason.
      if(s.phase!=='offseason'){
        if(r.batters.length<12||r.pitchers.length<11)min.push({team:t,batters:r.batters.length,pitchers:r.pitchers.length});
        if(ns<5)sp.push({team:t,starters:ns});
        const b=new Set(r.batters.map(p=>p.n)),p=new Set(r.pitchers.map(p=>p.n)),problems=[];
        if(c.lineup.length!==9||new Set(c.lineup).size!==9||c.lineup.some(n=>!b.has(n)))problems.push('lineup');
        if(!c.positions||c.positions.length!==9||new Set(c.positions).size!==9)problems.push('positions');
        if(c.rotation.length!==5||new Set(c.rotation).size!==5||c.rotation.some(n=>!p.has(n)))problems.push('rotation');
        if(!p.has(c.closer)||c.rotation.includes(c.closer))problems.push('closer');
        if(!c.bullpen.length||new Set(c.bullpen).size!==c.bullpen.length||c.bullpen.some(n=>!p.has(n)||c.rotation.includes(n)))problems.push('bullpen');
        if(problems.length)cfg.push({team:t,problems,config:copy(c)});
      }
      this.stats(h,s.season[t],'season '+t);
    }
    for(const {t,bucket,p} of h.players()){
      for(const k of attrs(p)){const low=k==='sta'?35:40;if(!Number.isFinite(p[k])||p[k]<low||p[k]>99)ratings.push({team:t,n:p.n,k,value:p[k]??'undefined'});}
      for(const k of ['cond','mor','inj','age','pot'])if(!Number.isFinite(p[k])||p[k]<0||(['cond','mor','pot'].includes(k)&&p[k]>100))ratings.push({team:t,n:p.n,k,value:p[k]??'undefined'});
      if(h.K.ovr(p)>p.pot)potential.push({team:t,n:p.n,bucket,ovr:h.K.ovr(p),pot:p.pot,age:p.age});
    }
    for(const [code,rows] of [['ENTRY_OVER_28',max],['ENTRY_BELOW_MIN',min],['FEWER_THAN_5_SP',sp],['INVALID_SAVED_CONFIG',cfg],['RATING_RANGE',ratings],['POTENTIAL_EXCEEDED',potential]])if(rows.length)h.violation(code,rows);
    const games={};for(const t of h.K.TEAM_IDS)games[t]={g:0,home:0,RF:0,RA:0};const pair=new Map();
    for(const g of s.schedule){pair.set([g.home,g.away].sort().join('|'),(pair.get([g.home,g.away].sort().join('|'))||0)+1);if(g.played){games[g.home].g++;games[g.away].g++;games[g.home].home++;games[g.home].RF+=g.hr;games[g.home].RA+=g.ar;games[g.away].RF+=g.ar;games[g.away].RA+=g.hr;}}
    const stand=[];for(const t of h.K.TEAM_IDS){const v=s.season[t],g=games[t];if(v.W+v.L+v.T!==g.g||h.readCounts()[t]!==g.g||v.RF!==g.RF||v.RA!==g.RA)stand.push({t,expected:g,actual:{W:v.W,L:v.L,T:v.T,RF:v.RF,RA:v.RA,gc:h.readCounts()[t]}});}
    if(stand.length)h.violation('STANDINGS_SCHEDULE_MISMATCH',stand);
    if(s.schedule.length!==720||[...pair.values()].some(n=>n!==16))h.violation('INVALID_SCHEDULE',{length:s.schedule.length,pairs:[...pair]});
    if(['postseason','offseason'].includes(s.phase)&&Object.values(games).some(g=>g.g!==144||g.home!==72))h.violation('INCOMPLETE_REGULAR_SEASON',games);
    const fu=s.fm.fut;if(fu&&fu.year===s.year){this.stats(h,fu,'futures');if(fu.W+fu.L+fu.T!==fu.g)h.violation('FUTURES_STANDINGS',{W:fu.W,L:fu.L,T:fu.T,g:fu.g});
      if(['regular','postseason','offseason'].includes(s.phase)&&fu.g+(h.expectedFuturesOffset||0)!==games[h.user].g)h.violation('FUTURES_MISSING_GAMES',{expected:games[h.user].g-(h.expectedFuturesOffset||0),actual:fu.g,farm:h.K.ROSTERS[h.user].farm.map(p=>({n:p.n,type:p.type,inj:p.inj,cond:p.cond}))});}
    if(Object.keys(h.K.ROSTERS).some(t=>t.startsWith('F_')))h.violation('TEMP_ROSTER_LEAK',Object.keys(h.K.ROSTERS));
    if(old){for(const [n,loc] of old.inv)if(!inv.has(n)){
        let reason=null;const p=loc[0];
        if(p.loc==='FA'&&old.phase==='stove'&&s.phase==='spring')reason='documented unsigned FA departure';
        if(s.year>old.year){if(p.bucket==='farm')reason='offseason farm retirement/cap trim';else if(p.age+1>=39)reason='offseason veteran retirement';}
        if(h.expectedDepartures?.has(n))reason=h.expectedDepartures.get(n);
        if(h.fixtures.length&&label.startsWith('FIXTURE:'))reason='explicit fixture';
        this.ledger.push({...h.context(),n,from:p.loc,reason});if(!reason)h.violation('PLAYER_LOST',{n,previous:loc,label});
      }
      const breaches=[];for(const [n,loc] of inv){const now=loc[0],prev=old.inv.get(n)?.[0];if(!prev||!now.attributes||!prev.attributes)continue;
        if(now.bucket!=='farm'&&prev.bucket==='farm'&&now.t===h.user&&now.downYear===s.year&&games[h.user].g-now.downUg<10)breaches.push({n,from:prev.loc,to:now.loc,elapsed:games[h.user].g-now.downUg});}
      if(breaches.length)h.violation('REREGISTRATION_UNDER_10',breaches);
    }
    this.previous.set(h,{inv,year:s.year,phase:s.phase});
  }
  close(){fs.closeSync(this.fd);fs.writeFileSync(path.join(this.out,'invariants.json'),json({totalChecks:this.totalChecks,violations:this.summary,passes:this.passes}));fs.writeFileSync(path.join(this.out,'departures.json'),json(this.ledger));}
}
module.exports={Audit,totals,futuresTotals,rates,sum,inventory};
