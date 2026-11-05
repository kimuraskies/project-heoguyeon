'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {Runtime,sourceHashes,copy,json,attrs}=require('./runtime');
const {Audit,totals,futuresTotals}=require('./audit');
const opts={suite:'all',seed:20261105,seasons:6,growthSeeds:3};
for(let i=2;i<process.argv.length;i++){const a=process.argv[i];if(a==='--suite')opts.suite=process.argv[++i];else if(a==='--seed')opts.seed=+process.argv[++i];else if(a==='--seasons')opts.seasons=+process.argv[++i];else if(a==='--growth-seeds')opts.growthSeeds=+process.argv[++i];else throw new Error('Unknown option '+a);}
if(!['all','smoke','career','abuse','balance','growth','speed'].includes(opts.suite))throw new Error('Unknown suite');
const out=path.join(__dirname,'results',opts.suite);fs.mkdirSync(out,{recursive:true});
const start=performance.now(),hashes=sourceHashes(),audit=new Audit(out),runs=[],seasons=[],failures=[];
const report={options:opts,node:process.version,platform:process.platform,cpu:os.cpus()[0]?.model,startedUTC:new Date().toISOString(),sourceHashes:hashes,runs,seasons,failures};
function make(label,seed=opts.seed,extra={}){const h=new Runtime({seed,label,audit,...extra});runs.push(h);return h;}
function safe(label,f){try{return f();}catch(e){failures.push({label,error:e.stack});console.error('FAILED '+label+': '+e.message);}}
function capture(h,elapsed,intensity){const s=h.state;
  const row={run:h.label,seed:h.seed,year:s.year,user:h.user,phase:s.phase,intensity,elapsedSeconds:elapsed/1000,regular:totals(s.season),futures:futuresTotals(s.fm.fut),userRecord:copy(s.season[h.user]),roster:h.players().map(({t,bucket,p})=>({team:t,bucket,n:p.n,age:p.age,ovr:h.K.ovr(p),pot:p.pot,tr:p.tr,grow:copy(p.grow||[]),inj:p.inj,cond:p.cond,attributes:Object.fromEntries(attrs(p).map(k=>[k,p[k]]))}))};
  // Per-player season boxes are already available in save evidence; avoid duplication here.
  delete row.userRecord.bat;delete row.userRecord.pit;seasons.push(row);return row;
}
function saveRoundTrip(h,label){h.action('manual save '+label,()=>h.App.save());const before=h.saveObject();h.action('manual load '+label,()=>h.App.load());
  const after=h.saveObject();if(json(before)!==json(after))h.violation('SAVE_ROUNDTRIP',{label,beforeHash:require('node:crypto').createHash('sha256').update(json(before)).digest('hex'),afterHash:require('node:crypto').createHash('sha256').update(json(after)).digest('hex')});else audit.pass(h.label+' save '+label,{bytes:h.storage.get('kbo_manager_save').length*2});}
function finishRegular(h,daily=false,live=false){
  if(live)h.liveNext();
  if(daily){let guard=0;while(h.state.phase==='regular'&&guard++<146){h.action('advance one user game',()=>h.App.userGames(1));if(h.state.season[h.user].W+h.state.season[h.user].L+h.state.season[h.user].T===48)saveRoundTrip(h,'day48');}}
  else h.action('simulate remaining regular season',()=>{h.App.simRest();h.FM.answer();});
  if(h.state.phase!=='postseason')throw new Error('Regular season failed to complete');
}
function finishPS(h,live=false){if(live){let guard=0;while(h.state.phase==='postseason'&&guard++<60)h.liveNext(true);}else h.action('simulate postseason',()=>h.App.psAuto(true));
  if(h.state.phase!=='offseason'||!h.state.champion||h.state.postseason.rounds.length!==4)throw new Error('Postseason failed to complete');}
function runCareer(h,count,{daily=false,live=false,intensity=null,track=false}={}){
  h.start('KIA');const cohort=h.players().filter(x=>x.t===h.user&&x.p.age<=24&&x.p.pot-h.K.ovr(x.p)>=5).map(x=>({n:x.p.n,type:x.p.type,initialTeam:x.t,initialBucket:x.bucket,initialAge:x.p.age,initialOVR:h.K.ovr(x.p),initialPot:x.p.pot,trainingPoints:0,injuryCheckpoints:0}));
  let prev=new Map(),lastUg=-1,lastYear=0;
  if(track)h.observers.push(rt=>{const ug=rt.context().userGames;if(rt.state.phase!=='regular'||(lastUg===ug&&lastYear===rt.state.year))return;lastUg=ug;lastYear=rt.state.year;
    for(const c of cohort){const e=rt.players().find(x=>x.p.n===c.n);if(!e)continue;const p=e.p,g=p.grow||[],sig=json(g),before=prev.get(c.n);
      if(before&&sig!==before.sig){let common=0;for(let i=0;i<=before.g.length;i++){const tail=before.g.slice(i);if(json(tail)===json(g.slice(0,tail.length))){common=tail.length;break;}}c.trainingPoints+=g.length-common;}
      else if(!before)c.trainingPoints+=g.length;
      prev.set(c.n,{sig,g:copy(g)});if(p.inj)c.injuryCheckpoints++;
    }});
  report.cohorts=report.cohorts||[];
  for(let y=0;y<count;y++){
    const t=performance.now();if(intensity)h.action('all training '+intensity,()=>h.FM.setTrainAll('i',intensity));
    if(track)for(const {t:team,p} of h.players())if(team===h.user&&cohort.some(c=>c.n===p.n))h.action('focused plan '+p.n,()=>h.FM.setTrain(p.n,'f',p.type==='B'?'con':'stu'));
    h.spring({live:live&&y===0});finishRegular(h,daily,live&&y===0);
    const row=capture(h,performance.now()-t,intensity);finishPS(h,live&&y===0);
    row.champion=h.state.champion;row.psGames=h.state.postseason.rounds.reduce((n,r)=>n+r.r.games.length,0);row.complete=true;
    if(track){const list=h.players();report.cohorts.push({run:h.label,seed:h.seed,intensity,year:h.state.year,user:h.user,players:cohort.map(c=>{const e=list.find(x=>x.p.n===c.n);return {...c,currentTeam:e?.t,bucket:e?.bucket,age:e?.p.age,ovr:e?h.K.ovr(e.p):null,pot:e?.p.pot,focusValue:e?.p[c.type==='B'?'con':'stu']};})});}
    console.log(h.label+' '+row.year+': '+row.regular.games/2+' regular, '+row.futures?.games+' futures, '+row.psGames+' PS, '+row.elapsedSeconds.toFixed(2)+'s');
    if(y<count-1)h.nextSeason();
  }
  return h;
}

try{
  if(['all','smoke','career'].includes(opts.suite))safe('career',()=>runCareer(make('career'),opts.suite==='smoke'?1:opts.seasons,{daily:true,live:true}));
  if(['all','abuse'].includes(opts.suite))require('./cases')({make,safe,audit,report,saveRoundTrip,finishRegular,finishPS,out});
  if(['all','balance'].includes(opts.suite))for(const [i,team] of ['KIA','LG','한화','SSG','삼성','NC','KT','롯데','두산','키움'].entries())safe('balance '+team,()=>{const h=make('balance-'+team,opts.seed+100+i).start(team);const t=performance.now();h.spring();finishRegular(h);capture(h,performance.now()-t,'normal');finishPS(h);seasons.at(-1).complete=true;});
  if(['all','growth'].includes(opts.suite))for(let i=0;i<opts.growthSeeds;i++)for(const intensity of ['light','normal','hard'])safe('growth '+i+' '+intensity,()=>runCareer(make('growth-'+i+'-'+intensity,opts.seed+1000+i),5,{intensity,track:true}));
  if(['all','speed'].includes(opts.suite)){
    report.speed=[];for(let i=0;i<3;i++)safe('speed '+i,()=>{const h=make('speed-'+i,opts.seed+2000+i,{audit:null}).start();h.spring();const t=performance.now();finishRegular(h);report.speed.push({seconds:(performance.now()-t)/1000,counts:copy(h.counts)});});
  }
}finally{
  report.elapsedSeconds=(performance.now()-start)/1000;report.runs=runs.map(h=>({label:h.label,seed:h.seed,counts:h.counts,checks:h.checks,year:h.state?.year,phase:h.state?.phase,fixtures:h.fixtures,maxStorageBytes:h.maxStorageBytes,warnings:h.warnings}));
  report.totalGames=report.runs.reduce((tot,r)=>{for(const k in r.counts)tot[k]=(tot[k]||0)+r.counts[k];return tot;},{});
  report.sourceFilesUnchanged=json(hashes)===json(sourceHashes());audit.close();fs.writeFileSync(path.join(out,'summary.json'),json(report));
  console.log(json({elapsedSeconds:report.elapsedSeconds,games:report.totalGames,seasons:seasons.filter(s=>s.complete).length,violations:Object.fromEntries(Object.entries(audit.summary).map(([k,v])=>[k,v.occurrences])),failures:failures.length,sourceFilesUnchanged:report.sourceFilesUnchanged,out}));
}
process.exitCode=failures.length?2:Object.keys(audit.summary).length?1:0;
