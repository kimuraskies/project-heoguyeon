'use strict';
// Read-only calculations from the repository's official KBO snapshot plus the
// official team tables inspected on 2026-11-05. No network is needed to rerun.
const fs=require('node:fs'),path=require('node:path');
const raw=require('../data/kbo2026.json');
const {rates}=require('./audit');
function collect(kind){const head=raw.tables[kind+'Head'],out={};for(const rows of Object.values(raw.tables[kind]))for(const row of rows){if(!row.id)continue;for(let i=3;i<head.length;i++){const v=row.cells[i],m=v.match(/^(\d+)\s+(\d)\/3$/);const n=m?+m[1]+(+m[2])/3:Number(v);if(Number.isFinite(n))out[head[i]]=(out[head[i]]||0)+n;}}return out;}
const b=collect('hit'),p=collect('pit');
// SF is not in BasicOld.aspx. TeamStats.aspx provides these 10 team counts.
const SF=[44,55,40,38,41,44,52,45,48,30].reduce((a,b)=>a+b,0);
const regular={source:'data/kbo2026.json',fetched:raw.fetched,teamGames:1440,bat:{...b,_2B:b['2B'],_3B:b['3B'],SF,R:p.R},pit:{...p,OUT:Math.round(p.IP*3)}};
Object.assign(regular,rates(regular.bat,regular.pit,regular.teamGames));
// Futures official table: G, AB, H, 2B, 3B, HR, SB, BB, HBP, displayed OBP.
// Keep only fields used in the audit; values are factual records, not prose.
const futBat=[
  [94,3211,933,178,13,69,73,420,64,.378],
  [102,3483,990,163,23,86,117,462,73,.376],
  [96,3263,917,139,23,67,76,494,91,.385],
  [101,3455,965,180,24,76,120,485,75,.376],
  [104,3439,954,170,22,60,86,392,49,.356],
  [102,3459,942,175,27,51,121,453,95,.368],
  [103,3431,930,179,26,65,76,356,69,.348],
  [102,3420,915,181,23,49,89,482,96,.368],
  [99,3328,877,127,23,54,81,448,64,.359],
  [101,3319,838,144,12,41,91,387,47,.336],
  [98,3215,805,150,11,58,90,422,75,.347],
  [96,3115,761,132,16,35,81,431,63,.344]
];
// Pitching OUT and ER. Fractions are converted to integer outs before summing.
const futPit=[[844*3,357],[897*3+1,397],[842*3+2,396],[889*3+1,432],[898*3,465],[860*3+1,449],[826*3,453],[843*3+1,490],[887*3+1,524],[872*3+1,531],[883*3+2,547],[879*3+1,563]];
const fb={},keys=['G','AB','H','_2B','_3B','HR','SB','BB','HBP'];for(const row of futBat)keys.forEach((k,i)=>fb[k]=(fb[k]||0)+row[i]);
const fp={OUT:futPit.reduce((n,r)=>n+r[0],0),ER:futPit.reduce((n,r)=>n+r[1],0)};
// The published Futures table omits SF. Reconstruct OBP's denominator from each
// rounded club OBP; explicitly report this as an approximation, not exact OBP.
const obpDen=futBat.reduce((n,r)=>n+(r[2]+r[7]+r[8])/r[9],0);
const futures={teams:12,teamGames:fb.G,bat:fb,pit:fp,...rates({...fb,SF:0},fp,fb.G),OBP:(fb.H+fb.BB+fb.HBP)/obpDen,OBP_approximate:true};
delete futures.R_G;delete futures.K_PA;delete futures.BB_PA;
const refs={accessed:'2026-11-05',regular,futures,urls:{regular:'https://eng.koreabaseball.com/Stats/TeamStats.aspx',regularRaw:'https://www.koreabaseball.com/Record/Player/HitterBasic/BasicOld.aspx',regularPitcher:'https://www.koreabaseball.com/Record/Player/PitcherBasic/BasicOld.aspx',futuresBat:'https://www.koreabaseball.com/Futures/Team/Hitter.aspx',futuresPit:'https://www.koreabaseball.com/Futures/Team/Pitcher.aspx'},notes:['All per-game rates use team-games (one team appearance), not matches.','Regular season source is explicitly 2026; Futures uses official default table at access time (1198 team-games), not an asserted complete 144-game season.','Futures OBP is reconstructed from rounded team OBP, because the public table omits SF.','Future real roster contains Sangmu and Ulsan; game has 10 affiliated clubs.']};
if(require.main===module){fs.writeFileSync(path.join(__dirname,'results','references.json'),JSON.stringify(refs,null,2));console.log(JSON.stringify({regular:{AVG:regular.AVG,OBP:regular.OBP,SLG:regular.SLG,ERA:regular.ERA,HR_G:regular.HR_G,SB_G:regular.SB_G},futures},null,2));}
module.exports=refs;
