// Usage: node tools/enginecheck.js <path-to-core.js> [seasons] [--fatigue]
// Mirrors the in-game selfTest: full 144-game seasons with default lineups.
// --fatigue also applies between-game wear, AI resting (cond < 70) and injuries, like the game does.
const path = require('path');
require(path.resolve(process.argv[2]));
const K = globalThis.KBO;
const seasons = parseInt(process.argv[3] || '20', 10);
const fatigue = process.argv.includes('--fatigue');
const snapshot = JSON.stringify(K.ROSTERS);

let AB=0,H=0,HR=0,BB=0,SO=0,PA=0,ER=0,OUT=0,RUN=0,games=0,injuries=0,injGames=0,condSum=0,condN=0,spSubs=0;
for (let s=0; s<seasons; s++) {
  const fresh = JSON.parse(snapshot); for (const t in fresh) K.ROSTERS[t] = fresh[t];
  const cfg={}, gc={};
  K.TEAM_IDS.forEach(t=>{ const d=K.defaultLineup(t); cfg[t]={teamId:t,lineup:d.lineup,bullpen:d.bullpen,closer:d.closer,rotation:d.rotation}; gc[t]=0; });
  const ids=K.TEAM_IDS.slice(), n=ids.length, rounds=[];
  for (let r=0;r<n-1;r++){ const pairs=[]; for(let i=0;i<n/2;i++) pairs.push([ids[i],ids[n-1-i]]); rounds.push(pairs); ids.splice(1,0,ids.pop()); }
  const build = t => {
    let c = Object.assign({}, cfg[t], {spName: cfg[t].rotation[gc[t]++%5]});
    if (fatigue) { const a = K.restAdjust(t, c, {restBelow:70}); if (a.spName !== c.spName) spSubs++; c = a; }
    return c;
  };
  for (let c=0;c<16;c++) rounds.forEach(pairs=>pairs.forEach(p=>{
    const home=c%2?p[1]:p[0], away=c%2?p[0]:p[1];
    const res=K.simGame(build(home),build(away),{}); games++;
    [home,away].forEach(t=>{
      for(const k in res.box[t].bat){const x=res.box[t].bat[k];AB+=x.AB;H+=x.H;HR+=x.HR;BB+=x.BB;SO+=x.SO;PA+=x.PA;}
      for(const k in res.box[t].pit){const x=res.box[t].pit[k];ER+=x.ER;OUT+=x.OUT;}
      if (fatigue) {
        const hurt = K.applyFatigue(t, res.box); injuries += hurt.length; hurt.forEach(h=>injGames+=h.games);
        K.ROSTERS[t].batters.concat(K.ROSTERS[t].pitchers).forEach(pl=>{ condSum+=K.cond(pl); condN++; });
      }
    });
    RUN+=res.homeRuns+res.awayRuns;
  }));
}
const out={games, AVG:(H/AB).toFixed(3), ERA:(ER*9/(OUT/3)).toFixed(2),
  RperTeamG:(RUN/games/2).toFixed(2), HRperG:(HR/games).toFixed(2),
  Kpct:(SO/PA*100).toFixed(1), BBpct:(BB/PA*100).toFixed(1)};
if (fatigue) Object.assign(out, { injPerTeamSeason:(injuries/seasons/10).toFixed(1), avgInjGames:(injGames/Math.max(1,injuries)).toFixed(1),
  avgCond:(condSum/condN).toFixed(1), spSkipsPerTeamSeason:(spSubs/seasons/10).toFixed(1) });
console.log(JSON.stringify(out));
