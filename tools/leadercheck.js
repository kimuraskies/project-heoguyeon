// Usage: node tools/leadercheck.js <path-to-core.js> [seasons]
// Season leaders and usage after full 144-game seasons (with fatigue/resting like the game),
// to check the box-score rules: wins, saves, holds, strikeouts, innings, steals.
const path = require('path');
require(path.resolve(process.argv[2]));
const K = globalThis.KBO;
const seasons = parseInt(process.argv[3] || '3', 10);
const snapshot = JSON.stringify(K.ROSTERS);
const lead = {W:[],SV:[],HD:[],SO:[],IP:[],SB:[],HR:[],GS:[]};
let SB=0, CS=0, games=0, starts=0, spOuts=0, E=0;
for (let s=0; s<seasons; s++) {
  const fresh = JSON.parse(snapshot); for (const t in fresh) K.ROSTERS[t] = fresh[t];
  const cfg={}, gc={}, bat={}, pit={};
  K.TEAM_IDS.forEach(t=>{ cfg[t]=Object.assign({teamId:t}, K.defaultLineup(t)); gc[t]=0; });
  const ids=K.TEAM_IDS.slice(), n=ids.length, rounds=[];
  for (let r=0;r<n-1;r++){ const pairs=[]; for(let i=0;i<n/2;i++) pairs.push([ids[i],ids[n-1-i]]); rounds.push(pairs); ids.splice(1,0,ids.pop()); }
  const build = t => K.restAdjust(t, Object.assign({}, cfg[t], {spName: cfg[t].rotation[gc[t]++%5]}), {restBelow:70});
  for (let c=0;c<16;c++) rounds.forEach(pairs=>pairs.forEach(p=>{
    const home=c%2?p[1]:p[0], away=c%2?p[0]:p[1];
    const res=K.simGame(build(home),build(away),{}); games++;
    [home,away].forEach(t=>{
      for(const k in res.box[t].bat){ const x=res.box[t].bat[k], y=bat[t+'|'+k]||(bat[t+'|'+k]={SB:0,HR:0}); y.SB+=x.SB; y.HR+=x.HR; SB+=x.SB; CS+=x.CS; }
      for(const k in res.box[t].pit){ const x=res.box[t].pit[k], y=pit[t+'|'+k]||(pit[t+'|'+k]={W:0,SV:0,HD:0,SO:0,IP:0,GS:0});
        y.W+=x.W; y.SV+=x.SV; y.HD+=x.HD; y.SO+=x.SO; y.IP+=x.OUT/3; y.GS+=x.GS; if(x.GS){starts++; spOuts+=x.OUT;} E+=x.R-x.ER; }
      K.applyFatigue(t, res.box);
    });
  }));
  for (const k in lead) { const src = (k==='SB'||k==='HR')? bat : pit; const top=Object.entries(src).sort((a,b)=>b[1][k]-a[1][k])[0]; lead[k].push(top[0]+' '+Math.round(top[1][k])); }
}
console.log(JSON.stringify(lead, null, 1));
console.log(JSON.stringify({SBperTeamG:(SB/games/2).toFixed(2), SBpct:(SB/Math.max(1,SB+CS)*100).toFixed(0), spIPperStart:(spOuts/starts/3).toFixed(2), unearnedPerTeamG:(E/games/2).toFixed(2)}));
