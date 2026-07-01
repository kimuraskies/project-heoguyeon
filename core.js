/* ===== KBO MANAGER - CORE (DOM-free) ===== */
(function(global){
"use strict";

// Player factory: batter [n,pos,age,con,pow,eye,spd,fld,arm]
function B(n,pos,age,con,pow,eye,spd,fld,arm){return {n,pos,age,con,pow,eye,spd,fld,arm,type:"B"};}
// pitcher [n,role,age,stu,ctl,mov,sta]
function P(n,role,age,stu,ctl,mov,sta){return {n,role,age,stu,ctl,mov,sta,type:"P"};}

var ROSTERS = {
"KIA": {name:"KIA 타이거즈", color:"#ea0029", batters:[
 B("김도영","3B",22,84,86,76,88,78,82),
 B("최형우","DH",42,82,82,82,40,40,55),
 B("나성범","RF",36,80,82,72,62,72,80),
 B("소크라테스","CF",33,82,74,66,80,82,78),
 B("박찬호","SS",30,76,56,66,86,84,80),
 B("김선빈","2B",36,82,52,74,60,76,70),
 B("한준수","C",26,72,70,64,45,74,78),
 B("변우혁","1B",25,66,78,64,55,70,72),
 B("최원준","LF",28,76,60,70,80,78,74),
 B("김호령","CF",33,70,56,64,80,90,78),
 B("고종욱","DH",37,80,64,70,62,62,62),
 B("오선우","1B",29,66,80,66,55,62,66),
 B("김태군","C",36,68,58,62,40,76,76),
 B("윤도현","2B",22,64,62,60,72,70,72),
], pitchers:[
 P("네일","SP",31,82,80,80,82),
 P("양현종","SP",38,74,80,74,84),
 P("이의리","SP",24,80,68,74,74),
 P("윤영철","SP",22,70,78,70,76),
 P("김도현","SP",25,74,70,72,72),
 P("정해영","CL",24,82,76,80,42),
 P("조상우","RP",31,82,72,78,46),
 P("전상현","RP",29,76,74,74,44),
 P("최지민","RP",22,76,72,74,46),
 P("곽도규","RP",21,76,68,74,44),
 P("이준영","RP",33,70,74,70,44),
]},
"LG": {name:"LG 트윈스", color:"#c30452", batters:[
 B("오스틴","1B",32,82,88,78,60,74,72),
 B("홍창기","RF",32,82,58,92,66,80,74),
 B("문보경","3B",25,80,78,74,62,74,76),
 B("김현수","DH",38,82,72,80,50,60,66),
 B("박해민","CF",36,74,56,72,92,92,74),
 B("신민재","2B",30,78,50,72,88,80,72),
 B("박동원","C",35,70,80,62,45,80,84),
 B("오지환","SS",36,72,74,72,62,80,82),
 B("문성주","LF",32,80,58,76,70,74,66),
 B("구본혁","SS",29,68,52,66,70,78,74),
 B("이재원","C",37,66,56,60,42,74,72),
 B("이주헌","LF",24,66,60,62,66,68,68),
], pitchers:[
 P("톨허스트","SP",30,78,76,76,80),
 P("치리노스","SP",31,76,78,74,80),
 P("임찬규","SP",33,72,78,72,80),
 P("손주영","SP",27,76,74,74,78),
 P("송승기","SP",26,70,72,70,74),
 P("유영찬","CL",28,82,76,80,44),
 P("함덕주","RP",30,76,72,76,44),
 P("백승현","RP",29,74,70,74,44),
 P("김진성","RP",40,74,76,74,44),
 P("이정용","RP",28,76,72,74,46),
]},
"한화": {name:"한화 이글스", color:"#fc4e00", batters:[
 B("노시환","3B",25,76,86,74,58,74,80),
 B("강백호","DH",26,84,82,74,58,66,70),
 B("채은성","1B",35,78,80,70,52,66,70),
 B("플로리얼","CF",27,74,78,66,84,82,80),
 B("문현빈","2B",21,78,62,70,74,72,72),
 B("안치홍","2B",35,80,66,74,55,74,74),
 B("최재훈","C",36,70,54,72,42,80,78),
 B("황영묵","SS",25,74,56,68,72,72,70),
 B("김태연","LF",28,74,64,68,60,68,68),
 B("이도윤","SS",24,64,52,60,72,80,80),
 B("정은원","2B",25,72,54,74,72,76,72),
 B("이원석","3B",38,70,62,66,52,70,72),
], pitchers:[
 P("폰세","SP",29,88,78,82,84),
 P("류현진","SP",39,76,86,78,82),
 P("문동주","SP",23,84,70,78,78),
 P("와이스","SP",29,80,74,76,80),
 P("엄상백","SP",30,72,74,72,76),
 P("주현상","CL",28,80,78,78,44),
 P("김서현","RP",22,84,66,78,46),
 P("박상원","RP",32,74,72,74,44),
 P("한승혁","RP",33,74,68,72,44),
 P("김범수","RP",30,74,70,74,44),
]},
"SSG": {name:"SSG 랜더스", color:"#ce0e2d", batters:[
 B("최정","3B",39,78,88,78,48,72,80),
 B("에레디아","LF",34,84,80,70,58,70,74),
 B("박성한","SS",27,82,58,78,72,82,82),
 B("한유섬","RF",36,72,80,72,50,68,78),
 B("기예르모","1B",29,76,82,66,55,68,70),
 B("최지훈","CF",28,78,58,70,84,86,76),
 B("하재훈","DH",35,70,70,66,58,60,70),
 B("김성현","2B",38,70,52,66,58,76,74),
 B("이지영","C",39,72,48,66,42,78,74),
 B("오태곤","SS",34,70,66,62,70,72,74),
 B("박성한2","2B",24,68,54,64,66,74,74),
 B("최상민","CF",24,64,46,60,82,78,70),
], pitchers:[
 P("앤더슨","SP",31,78,78,76,82),
 P("화이트","SP",30,78,74,76,80),
 P("김광현","SP",38,76,78,76,82),
 P("송영진","SP",23,72,70,72,74),
 P("오원석","SP",24,72,72,72,74),
 P("조병현","CL",23,80,72,76,48),
 P("노경은","RP",41,72,76,74,46),
 P("문승원","RP",36,74,74,74,50),
 P("이로운","RP",22,74,70,72,44),
 P("김민","RP",27,72,70,72,44),
]},
"삼성": {name:"삼성 라이온즈", color:"#074ca1", batters:[
 B("구자욱","LF",33,84,80,78,70,78,76),
 B("디아즈","1B",30,80,88,70,55,72,72),
 B("김영웅","3B",22,72,82,66,66,72,78),
 B("이재현","SS",23,74,68,70,68,80,80),
 B("강민호","C",41,74,72,70,40,76,76),
 B("김지찬","CF",24,80,46,72,92,84,70),
 B("류지혁","2B",31,76,56,72,66,76,74),
 B("박병호","DH",39,70,80,70,45,62,68),
 B("김성윤","RF",26,72,50,66,84,82,70),
 B("김헌곤","LF",37,72,60,64,55,68,70),
 B("이성규","LF",32,68,72,62,64,68,70),
 B("김재상","2B",22,62,54,58,70,72,72),
], pitchers:[
 P("후라도","SP",30,80,78,78,84),
 P("원태인","SP",26,78,80,76,82),
 P("레예스","SP",29,78,74,76,80),
 P("이승현","SP",24,72,72,72,74),
 P("최원태","SP",28,72,74,72,78),
 P("김재윤","CL",35,80,74,78,44),
 P("임창민","RP",40,74,74,74,44),
 P("이승현좌","RP",23,74,72,74,46),
 P("김태훈","RP",35,72,72,72,44),
 P("이호성","RP",24,72,70,72,44),
]},
"NC": {name:"NC 다이노스", color:"#315288", batters:[
 B("이우성","1B",31,84,66,70,62,68,70),
 B("박민우","2B",33,84,54,78,82,80,74),
 B("데이비슨","3B",34,74,88,72,48,68,74),
 B("김주원","SS",23,74,72,70,76,84,84),
 B("권희동","LF",35,76,70,74,58,70,72),
 B("박건우","RF",36,80,70,72,64,74,74),
 B("김형준","C",26,70,72,64,55,80,84),
 B("서호철","2B",28,74,58,66,66,74,72),
 B("천성호","3B",27,72,50,66,70,74,72),
 B("한석현","CF",26,70,58,64,74,74,70),
 B("최정원","SS",26,68,48,64,74,76,72),
 B("김휘집","SS",23,68,64,62,66,74,78),
], pitchers:[
 P("라일리","SP",30,80,76,78,82),
 P("하트","SP",30,78,76,76,80),
 P("신민혁","SP",26,72,76,72,78),
 P("김시훈","SP",26,74,72,74,74),
 P("배재환","SP",30,70,70,70,74),
 P("류진욱","CL",29,80,74,78,44),
 P("김영규","RP",25,74,74,74,48),
 P("이용찬","RP",37,74,74,74,46),
 P("임정호","RP",35,72,74,72,44),
 P("목지훈","RP",24,72,70,72,46),
]},
"KT": {name:"KT 위즈", color:"#000000", batters:[
 B("안현민","LF",24,82,80,70,70,76,76),
 B("로하스","RF",36,80,84,74,58,70,78),
 B("힐리어드","CF",31,74,86,68,72,76,78),
 B("장성우","C",36,74,72,68,42,78,78),
 B("황재균","3B",39,74,70,70,55,72,78),
 B("문상철","1B",34,74,76,68,52,68,70),
 B("배정대","CF",31,74,64,66,74,82,74),
 B("김상수","SS",36,74,54,70,64,76,76),
 B("오윤석","2B",33,72,56,68,62,72,70),
 B("권동진","3B",23,66,58,60,68,72,74),
 B("강현우","C",23,64,60,58,48,72,76),
 B("장진혁","LF",32,70,58,64,72,74,72),
], pitchers:[
 P("쿠에바스","SP",35,78,76,76,82),
 P("헤이수스","SP",29,80,74,76,80),
 P("고영표","SP",34,74,84,76,82),
 P("소형준","SP",24,78,76,76,78),
 P("오원석K","SP",24,74,72,72,76),
 P("박영현","CL",22,84,76,80,46),
 P("손동현","RP",25,76,72,74,46),
 P("우규민","RP",40,70,76,72,44),
 P("김민수","RP",32,72,72,72,44),
 P("주권","RP",34,70,74,70,44),
]},
"롯데": {name:"롯데 자이언츠", color:"#041e42", batters:[
 B("레이예스","RF",31,86,82,70,58,70,78),
 B("윤동희","CF",22,78,66,68,70,76,76),
 B("전준우","DH",40,78,70,70,50,58,68),
 B("고승민","2B",25,78,68,70,68,74,74),
 B("손호영","SS",31,76,74,66,64,72,76),
 B("나승엽","1B",23,76,70,74,58,68,70),
 B("황성빈","LF",28,76,52,66,88,80,70),
 B("유강남","C",33,70,66,66,44,76,76),
 B("정훈","1B",38,72,60,70,52,66,68),
 B("김민석","CF",22,72,58,64,76,74,72),
 B("정보근","C",27,66,54,60,44,74,74),
 B("박승욱","SS",33,70,56,66,70,76,76),
], pitchers:[
 P("박세웅","SP",30,78,78,76,82),
 P("반즈","SP",30,78,74,76,80),
 P("벨라스케즈","SP",33,78,72,76,78),
 P("나균안","SP",27,74,72,74,76),
 P("김진욱","SP",23,74,68,72,72),
 P("김원중","CL",32,82,76,80,44),
 P("구승민","RP",35,74,74,74,44),
 P("최준용","RP",24,78,70,76,46),
 P("정현수","RP",24,72,70,72,44),
 P("김상수롯","RP",37,72,72,72,44),
]},
"두산": {name:"두산 베어스", color:"#1a1748", batters:[
 B("양의지","C",39,82,74,78,44,80,80),
 B("김재환","DH",37,76,80,72,48,58,68),
 B("정수빈","CF",35,78,52,72,82,86,72),
 B("케이브","RF",34,76,74,72,60,70,72),
 B("양석환","1B",34,74,80,66,52,70,72),
 B("강승호","2B",31,74,70,64,64,74,74),
 B("조수행","LF",32,70,44,66,90,80,68),
 B("박준영","3B",27,68,64,62,66,74,78),
 B("김재호","SS",40,68,48,64,52,78,78),
 B("안재석","SS",23,66,58,62,70,74,76),
 B("김기연","C",27,66,56,60,44,74,74),
 B("전다민","CF",24,64,48,60,80,78,70),
], pitchers:[
 P("콜어빈","SP",31,76,78,74,82),
 P("곽빈","SP",26,80,72,76,80),
 P("발라조빅","SP",26,80,72,76,78),
 P("최원준두","SP",31,72,74,72,78),
 P("최승용","SP",24,72,72,72,74),
 P("김택연","CL",20,84,76,80,46),
 P("정철원","RP",26,76,72,74,46),
 P("이병헌","RP",23,74,70,74,46),
 P("홍건희","RP",33,74,72,74,44),
 P("김강률","RP",37,74,72,74,44),
]},
"키움": {name:"키움 히어로즈", color:"#570514", batters:[
 B("송성문","3B",29,82,74,74,64,76,78),
 B("도슨","CF",30,76,74,70,72,78,76),
 B("최주환","1B",37,74,66,70,50,70,70),
 B("이주형","RF",24,74,66,68,70,72,72),
 B("이형종","LF",36,74,66,68,56,66,70),
 B("김동헌","C",25,70,62,62,48,76,80),
 B("오선진","SS",36,68,50,62,56,74,74),
 B("변상권","LF",27,72,62,66,62,68,70),
 B("송지후","SS",21,64,56,60,68,70,72),
 B("어준서","2B",20,62,54,58,70,70,72),
 B("이재상","SS",20,62,52,58,66,72,76),
 B("주성원","CF",22,62,50,58,76,74,70),
], pitchers:[
 P("알칸타라","SP",32,78,74,76,80),
 P("하영민","SP",30,74,76,74,78),
 P("정현우","SP",19,78,70,74,74),
 P("김선기","SP",29,70,72,70,74),
 P("조영건","SP",27,70,72,70,72),
 P("주승우","CL",26,78,72,76,46),
 P("김재웅","RP",27,74,72,74,44),
 P("양현","RP",36,70,72,70,44),
 P("오석주","RP",27,72,70,72,44),
 P("윤석원","RP",24,70,70,70,44),
]},
};

var TEAM_IDS = Object.keys(ROSTERS);

// ---- utility ----
function clamp(x,a,b){return x<a?a:(x>b?b:x);}
function rnd(){return Math.random();}

// overall rating
function ovr(p){
  if(p.type==="B"){
    return Math.round((p.con*0.28+p.pow*0.24+p.eye*0.16+p.spd*0.12+p.fld*0.12+p.arm*0.08));
  } else {
    var w = p.role==="SP"?{stu:0.34,ctl:0.26,mov:0.24,sta:0.16}:{stu:0.40,ctl:0.26,mov:0.28,sta:0.06};
    return Math.round(p.stu*w.stu+p.ctl*w.ctl+p.mov*w.mov+p.sta*w.sta);
  }
}

// ---- plate appearance simulation ----
// returns one of: K,BB,HBP,HR,1B,2B,3B,OUT
function simPA(bat, pit, fatigue){
  var fpen = fatigue||0; // 0..~25 reduces pitcher
  var stu = pit.stu - fpen, ctl = pit.ctl - fpen, mov = pit.mov - fpen*0.6;
  var pK  = clamp(0.18 + 0.0048*(stu - bat.con), 0.03, 0.42);
  var pBB = clamp(0.086 + 0.0040*(bat.eye - ctl), 0.02, 0.21);
  var pHBP= 0.011;
  var pHR = clamp(0.030 + 0.0014*(bat.pow-70) - 0.0011*(mov-70), 0.004, 0.10);
  var rest = 1 - pK - pBB - pHBP - pHR;
  if(rest<0.05) rest=0.05;
  var babip = clamp(0.307 + 0.0024*(bat.con-70) + 0.0016*(bat.spd-70) - 0.0019*(mov-70), 0.230, 0.385);
  var pHit = rest*babip;
  var pOut = rest*(1-babip);
  var r = rnd();
  if(r < pK) return "K";
  r -= pK;
  if(r < pBB) return "BB";
  r -= pBB;
  if(r < pHBP) return "HBP";
  r -= pHBP;
  if(r < pHR) return "HR";
  r -= pHR;
  if(r < pHit){
    // distribute hit type
    var dShare = clamp(0.20 + 0.004*(bat.pow-70), 0.12, 0.34);
    var tShare = clamp(0.012 + 0.0018*(bat.spd-70), 0.004, 0.05);
    var rr = rnd();
    if(rr < tShare) return "3B";
    if(rr < tShare + dShare) return "2B";
    return "1B";
  }
  return "OUT";
}

// advance runners; bases array indices 0=1st,1=2nd,2=3rd hold batter objects or null
// returns {runs, scorers:[runnerObj,...]} (scorers used to credit runs)
function applyOutcome(state, outcome, batter){
  var b = state.bases, scorers=[];
  function score(r){ if(r){scorers.push(r);} }
  switch(outcome){
    case "BB": case "HBP":
      if(b[0]){ if(b[1]){ if(b[2]){score(b[2]);} b[2]=b[1]; } b[1]=b[0]; }
      b[0]=batter; break;
    case "1B":
      if(b[2]){score(b[2]); b[2]=null;}
      if(b[1]){ if(rnd()<0.58){score(b[1]);} else {b[2]=b[1];} b[1]=null;}
      if(b[0]){ if(rnd()<0.25){b[2]=b[0];} else {b[1]=b[0];} }
      b[0]=batter; break;
    case "2B":
      if(b[2]){score(b[2]); b[2]=null;}
      if(b[1]){score(b[1]); b[1]=null;}
      if(b[0]){ if(rnd()<0.48){score(b[0]);} else {b[2]=b[0];} }
      b[1]=batter; break;
    case "3B":
      if(b[2]){score(b[2]);b[2]=null;}
      if(b[1]){score(b[1]);b[1]=null;}
      if(b[0]){score(b[0]);b[0]=null;}
      b[2]=batter; break;
    case "HR":
      if(b[2])score(b[2]); if(b[1])score(b[1]); if(b[0])score(b[0]);
      score(batter);
      b[0]=b[1]=b[2]=null; break;
  }
  return {runs:scorers.length, scorers:scorers};
}

// blank stat lines
function newBatStat(){return {G:0,PA:0,AB:0,H:0,_2B:0,_3B:0,HR:0,BB:0,HBP:0,SO:0,RBI:0,R:0,SB:0};}
function newPitStat(){return {G:0,GS:0,W:0,L:0,SV:0,HD:0,OUT:0,H:0,R:0,ER:0,BB:0,SO:0,HR:0,BF:0};}

// choose a lineup for AI team: best 9 batters by ovr filling positions + best pitchers
function defaultLineup(teamId){
  var r = ROSTERS[teamId];
  var bs = r.batters.slice().sort(function(a,b){return ovr(b)-ovr(a);});
  // need positions C,1B,2B,3B,SS, 3 OF, DH. fill greedily by best available preferring native pos
  var need = {"C":1,"1B":1,"2B":1,"3B":1,"SS":1,"OF":3,"DH":1};
  var posMap = {"C":"C","1B":"1B","2B":"2B","3B":"3B","SS":"SS","LF":"OF","CF":"OF","RF":"OF","DH":"DH"};
  var lineup=[], used={};
  // first pass native
  bs.forEach(function(p){
    var slot = posMap[p.pos]||"DH";
    if(need[slot]>0){ need[slot]--; lineup.push(p.n); used[p.n]=1; }
  });
  // fill remaining slots with best leftover into DH/OF
  bs.forEach(function(p){
    if(used[p.n]) return;
    for(var k in need){ if(need[k]>0){ need[k]--; lineup.push(p.n); used[p.n]=1; break; } }
  });
  lineup = lineup.slice(0,9);
  // order by a simple heuristic: speed/eye top, power middle
  var objs = lineup.map(function(n){return r.batters.find(function(x){return x.n===n;});});
  objs.sort(function(a,b){ return (b.eye+b.con*0.5)-(a.eye+a.con*0.5);}); // leadoff types first
  // rough lineup: put best power in 3,4,5
  objs.sort(function(a,b){return ovr(b)-ovr(a);});
  var order=[];
  // 3,4,5 best power
  var byPow = objs.slice().sort(function(a,b){return b.pow-a.pow;});
  var heart=[byPow[0],byPow[1],byPow[2]];
  var rest = objs.filter(function(p){return heart.indexOf(p)<0;});
  var byOnbase = rest.slice().sort(function(a,b){return (b.eye+b.spd)-(a.eye+a.spd);});
  order[0]=byOnbase[0]; order[1]=byOnbase[1];
  order[2]=heart[0]; order[3]=heart[1]; order[4]=heart[2];
  var left = rest.filter(function(p){return p!==byOnbase[0]&&p!==byOnbase[1];});
  left.sort(function(a,b){return ovr(b)-ovr(a);});
  order[5]=left[0];order[6]=left[1];order[7]=left[2];order[8]=left[3];
  var names = order.filter(Boolean).map(function(p){return p.n;});
  // rotation: SP sorted by ovr
  var sp = r.pitchers.filter(function(p){return p.role==="SP";}).sort(function(a,b){return ovr(b)-ovr(a);}).map(function(p){return p.n;}).slice(0,5);
  var cl = r.pitchers.filter(function(p){return p.role==="CL";}).map(function(p){return p.n;});
  var rp = r.pitchers.filter(function(p){return p.role==="RP";}).sort(function(a,b){return ovr(b)-ovr(a);}).map(function(p){return p.n;});
  return {lineup:names, rotation:sp, closer:cl[0]||rp[0], bullpen:rp};
}

function getP(teamId,name){return ROSTERS[teamId].pitchers.find(function(p){return p.n===name;});}
function getB(teamId,name){return ROSTERS[teamId].batters.find(function(p){return p.n===name;});}

// Simulate a full game. cfgA/cfgB = {teamId, lineup[], spName, bullpen[], closer}
// statsStore optional: {teamId:{bat:{name:stat}, pit:{name:stat}}}
function simGame(cfgH, cfgA, opts){
  opts=opts||{};
  var log = opts.log? [] : null;
  function teamState(cfg){
    return {
      id:cfg.teamId, cfg:cfg, runs:0, hits:0, order:0,
      pitcherName:cfg.spName, pitcherBF:0, pitcherRuns:0, pitchersUsed:[cfg.spName],
      bullpenIdx:0, pitcherERtrack:{}
    };
  }
  var H=teamState(cfgH), A=teamState(cfgA);
  var box = {}; box[H.id]={bat:{},pit:{}}; box[A.id]={bat:{},pit:{}};
  function ensureBat(tid,n){var b=box[tid].bat; if(!b[n])b[n]=newBatStat(); return b[n];}
  function ensurePit(tid,n){var b=box[tid].pit; if(!b[n])b[n]=newPitStat(); return b[n];}

  function currentPitcher(def, off){
    // def is fielding team (pitching), off batting. Decide reliever changes.
    var inning = state.inning, bottom = state.bottom;
    var p = getP(def.id, def.pitcherName);
    return p;
  }

  function maybeChangePitcher(def, inning){
    var p = getP(def.id, def.pitcherName);
    var isSP = p.role==="SP";
    var fatigueLimit = isSP ? (20 + Math.round(p.sta*0.18)) : 6; // batters faced
    var tired = def.pitcherBF >= fatigueLimit;
    var blownUp = def.pitcherRuns>=5;
    // closer logic handled separately in 9th
    if((tired||blownUp) && def.bullpenIdx < def.cfg.bullpen.length){
      // pick next bullpen arm not used
      var next=null;
      while(def.bullpenIdx < def.cfg.bullpen.length){
        var cand = def.cfg.bullpen[def.bullpenIdx++];
        if(def.pitchersUsed.indexOf(cand)<0){next=cand;break;}
      }
      if(next){
        def.pitcherName=next; def.pitcherBF=0; def.pitcherRuns=0; def.pitchersUsed.push(next);
      }
    }
  }

  var state={inning:1,bottom:false,bases:[null,null,null],outs:0};
  var maxInn=9;

  function creditRuns(res,off,def,bs,ps,bat){
    if(!res.runs) return;
    off.runs+=res.runs; bs.RBI+=res.runs; ps.R+=res.runs; ps.ER+=res.runs; def.pitcherRuns+=res.runs;
    res.scorers.forEach(function(runner){ ensureBat(off.id,runner.n).R++; });
    if(log) log.push(off.id+" "+bat.n+" "+res.runs+"타점");
  }

  function half(off, def, walkoffCheck){
    state.bases=[null,null,null]; state.outs=0;
    var inning=state.inning;
    // closer in save situation, inning 9+, defense leading by 1-3
    if(inning>=9){
      var lead = def.runs - off.runs;
      if(lead>=1 && lead<=3 && def.cfg.closer && def.pitchersUsed.indexOf(def.cfg.closer)<0){
        def.pitcherName=def.cfg.closer; def.pitcherBF=0; def.pitcherRuns=0; def.pitchersUsed.push(def.cfg.closer);
      }
    }
    while(state.outs<3){
      maybeChangePitcher(def, inning);
      var pit = getP(def.id, def.pitcherName);
      var batName = off.cfg.lineup[off.order % off.cfg.lineup.length];
      var bat = getB(off.id, batName);
      off.order++;
      var fatigue = Math.max(0, (def.pitcherBF - (pit.role==="SP"?18:4)) * 0.7);
      var oc = simPA(bat, pit, fatigue);
      def.pitcherBF++;
      var bs=ensureBat(off.id,batName), ps=ensurePit(def.id,def.pitcherName);
      bs.PA++; ps.BF++;
      // GIDP
      if(oc==="OUT" && state.bases[0] && state.outs<2 && rnd()<0.12){
        state.bases[0]=null; state.outs+=2; ps.OUT+=2; bs.AB++;
        continue;
      }
      if(oc==="K"){ bs.AB++; bs.SO++; ps.SO++; state.outs++; ps.OUT++; }
      else if(oc==="OUT"){
        // sac fly: runner on 3rd, <2 outs
        if(state.bases[2] && state.outs<2 && rnd()<0.30){
          var runner=state.bases[2]; state.bases[2]=null;
          off.runs++; bs.RBI++; ps.R++; ps.ER++; def.pitcherRuns++;
          ensureBat(off.id,runner.n).R++;
          state.outs++; ps.OUT++;
        } else {
          bs.AB++; state.outs++; ps.OUT++;
        }
      }
      else if(oc==="BB"){ bs.BB++; ps.BB++; creditRuns(applyOutcome(state,"BB",bat),off,def,bs,ps,bat); }
      else if(oc==="HBP"){ bs.HBP++; creditRuns(applyOutcome(state,"HBP",bat),off,def,bs,ps,bat); }
      else if(oc==="1B"){ bs.AB++; bs.H++; ps.H++; off.hits++; creditRuns(applyOutcome(state,"1B",bat),off,def,bs,ps,bat); }
      else if(oc==="2B"){ bs.AB++; bs.H++; bs._2B++; ps.H++; off.hits++; creditRuns(applyOutcome(state,"2B",bat),off,def,bs,ps,bat); }
      else if(oc==="3B"){ bs.AB++; bs.H++; bs._3B++; ps.H++; off.hits++; creditRuns(applyOutcome(state,"3B",bat),off,def,bs,ps,bat); }
      else if(oc==="HR"){ bs.AB++; bs.H++; bs.HR++; ps.HR++; ps.H++; off.hits++; creditRuns(applyOutcome(state,"HR",bat),off,def,bs,ps,bat); }
      // walk-off
      if(walkoffCheck && state.inning>=maxInn && off.runs>def.runs){ return; }
    }
  }

  // play innings
  while(true){
    state.bottom=false;
    half(A,H,false); // away bats (top), home pitches
    state.bottom=true;
    if(!(state.inning>=maxInn && H.runs>A.runs)){ // home skips bottom if already winning after top of 9th+
      half(H,A,true);
    }
    if(state.inning>=maxInn){
      if(H.runs!==A.runs) break;
      if(state.inning>=12) break; // ties allowed (12-inning limit)
    }
    state.inning++;
    if(state.inning>15) break;
  }

  var result = {
    home:H.id, away:A.id, homeRuns:H.runs, awayRuns:A.runs,
    homeHits:H.hits, awayHits:A.hits, box:box, log:log,
    winner: H.runs>A.runs? H.id : (A.runs>H.runs? A.id : null),
    homePitchers:H.pitchersUsed, awayPitchers:A.pitchersUsed,
    homeSP:cfgH.spName, awaySP:cfgA.spName
  };
  return result;
}

// ============ PITCH-BY-PITCH GENERATION ============
var PITCH_TYPES=[
  {k:'직구',base:147,sp:5},{k:'투심',base:144,sp:4},
  {k:'슬라이더',base:135,sp:5},{k:'커브',base:121,sp:5},
  {k:'체인지업',base:130,sp:4},{k:'포크',base:132,sp:4}
];
function repertoire(pit){
  var seed=0; for(var i=0;i<pit.n.length;i++) seed+=pit.n.charCodeAt(i);
  var pool=[PITCH_TYPES[1],PITCH_TYPES[2],PITCH_TYPES[3],PITCH_TYPES[4],PITCH_TYPES[5]];
  return [PITCH_TYPES[0], pool[seed%pool.length], pool[(seed+2)%pool.length]];
}
function pickType(pit){ var r=repertoire(pit); return rnd()<0.5? r[0] : r[1+Math.floor(rnd()*(r.length-1))]; }
function pitchVelo(pit,t){ return Math.round(t.base + (pit.stu-70)*0.32 + (rnd()*2-1)*t.sp); }
function locFor(res){
  function inZone(){ return {x:0.5+(rnd()*2-1)*0.17, y:0.5+(rnd()*2-1)*0.19}; }
  function edge(){ var a=rnd()*Math.PI*2, rad=0.24+rnd()*0.13; return {x:0.5+Math.cos(a)*rad, y:0.5+Math.sin(a)*rad}; }
  if(res==='B') return edge();
  if(res==='HBP') return {x:0.5+(rnd()<0.5?-1:1)*(0.33+rnd()*0.08), y:0.5+(rnd()*2-1)*0.28};
  if(res==='F'||res==='SW') return rnd()<0.5?inZone():edge();
  return inZone();
}
function genPitchSeq(bat,pit,oc){
  var seq=[],balls=0,strikes=0;
  function push(res){ var t=pickType(pit); var loc=locFor(res); seq.push({type:t.k,velo:pitchVelo(pit,t),res:res,x:loc.x,y:loc.y}); }
  if(oc==='BB'){ var ts=Math.floor(rnd()*3); while(balls<4){ if(strikes<ts&&rnd()<0.4){push('S');strikes++;} else {push('B');balls++;} } }
  else if(oc==='K'){ var tb=Math.floor(rnd()*3),g=0; while(strikes<3&&g<10){ g++; if(balls<tb&&rnd()<0.45){push('B');balls++;} else { if(strikes===2&&rnd()<0.35){push('F');} else {push(rnd()<0.5?'SW':'S');strikes++;} } } }
  else if(oc==='HBP'){ var n=Math.floor(rnd()*2); for(var i=0;i<n;i++){ if(rnd()<0.5){push('B');balls++;}else{push('S');strikes++;} if(balls>=3||strikes>=2)break; } push('HBP'); }
  else { var tb2=Math.floor(rnd()*3),ts2=Math.floor(rnd()*3),g2=0; while((balls<tb2||strikes<ts2)&&g2<8){ g2++; if(balls<tb2&&(strikes>=ts2||rnd()<0.5)){push('B');balls++;} else { if(strikes===2&&rnd()<0.3){push('F');} else {push('S');strikes++;} } } push('IP'); }
  return seq;
}

// ============ INTERACTIVE (live, step-by-step) GAME ============
function InteractiveGame(cfgH, cfgA){
  this.h=cfgH.teamId; this.a=cfgA.teamId;
  this.cfg={}; this.cfg[this.h]=cfgH; this.cfg[this.a]=cfgA;
  this.inning=1; this.half='top'; this.outs=0; this.bases=[null,null,null];
  this.score={}; this.score[this.h]=0; this.score[this.a]=0;
  this.hits={}; this.hits[this.h]=0; this.hits[this.a]=0;
  this.line={}; this.line[this.h]=[]; this.line[this.a]=[];
  this.order={}; this.order[this.h]=0; this.order[this.a]=0;
  this.lineup={}; this.lineup[this.h]=cfgH.lineup.slice(); this.lineup[this.a]=cfgA.lineup.slice();
  this.pitcher={}; this.pitcher[this.h]=cfgH.spName; this.pitcher[this.a]=cfgA.spName;
  this.pUsed={}; this.pUsed[this.h]=[cfgH.spName]; this.pUsed[this.a]=[cfgA.spName];
  this.pBF={}; this.pBF[this.h]=0; this.pBF[this.a]=0;
  this.pRuns={}; this.pRuns[this.h]=0; this.pRuns[this.a]=0;
  this.ptot={}; this.ptot[this.h]=0; this.ptot[this.a]=0;
  this.pstr={}; this.pstr[this.h]=0; this.pstr[this.a]=0;
  this.pball={}; this.pball[this.h]=0; this.pball[this.a]=0;
  this.bpIdx={}; this.bpIdx[this.h]=0; this.bpIdx[this.a]=0;
  this.box={}; this.box[this.h]={bat:{},pit:{}}; this.box[this.a]={bat:{},pit:{}};
  this.sp={}; this.sp[this.h]=cfgH.spName; this.sp[this.a]=cfgA.spName;
  this.runsThisHalf=0; this.over=false; this.winner=undefined;
  this._ensurePit(this.h,cfgH.spName).GS=1;
  this._ensurePit(this.a,cfgA.spName).GS=1;
}
var IP=InteractiveGame.prototype;
IP._ensureBat=function(t,n){var b=this.box[t].bat; if(!b[n])b[n]=newBatStat(); return b[n];};
IP._ensurePit=function(t,n){var p=this.box[t].pit; if(!p[n])p[n]=newPitStat(); return p[n];};
IP.offId=function(){return this.half==='top'?this.a:this.h;};
IP.defId=function(){return this.half==='top'?this.h:this.a;};
IP.dueBatterName=function(){var o=this.offId();return this.lineup[o][this.order[o]%this.lineup[o].length];};
IP.dueBatter=function(){return getB(this.offId(), this.dueBatterName());};
IP.curPitcher=function(){return getP(this.defId(), this.pitcher[this.defId()]);};
IP.bench=function(t){var lu=this.lineup[t];return ROSTERS[t].batters.filter(function(b){return lu.indexOf(b.n)<0;});};
IP.availPitchers=function(t){var used=this.pUsed[t];return ROSTERS[t].pitchers.filter(function(p){return used.indexOf(p.n)<0;});};
IP.subPitcher=function(t,name){ if(this.pUsed[t].indexOf(name)>=0)return false; var p=getP(t,name); if(!p)return false; this.pitcher[t]=name; this.pUsed[t].push(name); this.pBF[t]=0; this.pRuns[t]=0; this.ptot[t]=0; this.pstr[t]=0; this.pball[t]=0; return true;};
IP.pinchHit=function(t,name){ var lu=this.lineup[t]; if(lu.indexOf(name)>=0)return false; var p=getB(t,name); if(!p)return false; lu[this.order[t]%lu.length]=name; return true;};
IP._autoManage=function(){
  var def=this.defId(); var p=getP(def,this.pitcher[def]);
  if(this.inning>=9){ var lead=this.score[def]-this.score[this.offId()]; var cl=this.cfg[def].closer;
    if(lead>=1&&lead<=3&&cl&&this.pUsed[def].indexOf(cl)<0){ this.subPitcher(def,cl); return; } }
  var isSP=p.role==='SP'; var lim=isSP?(20+Math.round(p.sta*0.18)):6;
  if(this.pBF[def]>=lim||this.pRuns[def]>=5){
    var bp=this.cfg[def].bullpen;
    while(this.bpIdx[def]<bp.length){ var cand=bp[this.bpIdx[def]++]; if(this.pUsed[def].indexOf(cand)<0){ this.subPitcher(def,cand); break; } }
  }
};
IP._endHalf=function(){
  var off=this.offId();
  this.line[off].push(this.runsThisHalf); this.runsThisHalf=0;
  this.bases=[null,null,null]; this.outs=0;
  if(this.half==='top'){
    if(this.inning>=9 && this.score[this.h]>this.score[this.a]){ this.over=true; this.winner=this.h; return; }
    this.half='bottom';
  } else {
    if(this.inning>=9 && this.score[this.h]!==this.score[this.a]){ this.over=true; this.winner=this.score[this.h]>this.score[this.a]?this.h:this.a; return; }
    if(this.inning>=12){ this.over=true; this.winner=this.score[this.h]>this.score[this.a]?this.h:(this.score[this.a]>this.score[this.h]?this.a:null); return; }
    this.inning++; this.half='top';
  }
};
IP.prepareAB=function(){
  if(this.over) return null;
  this._autoManage();
  var off=this.offId(), def=this.defId();
  var pit=getP(def,this.pitcher[def]);
  var batName=this.dueBatterName(), bat=getB(off,batName);
  var fatigue=Math.max(0,(this.pBF[def]-(pit.role==='SP'?18:4))*0.7);
  var oc=simPA(bat,pit,fatigue);
  var pitches=genPitchSeq(bat,pit,oc);
  var slot=(this.order[off]%this.lineup[off].length)+1;
  this._pending={off:off,def:def,batName:batName,bat:bat,pitName:this.pitcher[def],oc:oc,pitches:pitches,slot:slot};
  return this._pending;
};
IP.commitAB=function(){
  var p=this._pending; if(!p) return null; this._pending=null;
  var self=this, off=p.off, def=p.def, oc=p.oc, bat=p.bat, batName=p.batName;
  this.order[off]++;
  this.pBF[def]++;
  var strk=0,bll=0; p.pitches.forEach(function(x){ if(x.res==='B'||x.res==='HBP')bll++; else strk++; });
  this.ptot[def]+=p.pitches.length; this.pstr[def]+=strk; this.pball[def]+=bll;
  var bs=this._ensureBat(off,batName), ps=this._ensurePit(def,p.pitName);
  bs.PA++; ps.BF++;
  var ev={inning:this.inning,half:this.half,batter:batName,pitcher:p.pitName,off:off,def:def,oc:oc,runs:0,desc:'',pitches:p.pitches};
  function credit(res){ if(!res.runs)return; self.score[off]+=res.runs; self.runsThisHalf+=res.runs; bs.RBI+=res.runs; ps.R+=res.runs; ps.ER+=res.runs; self.pRuns[def]+=res.runs; res.scorers.forEach(function(r){self._ensureBat(off,r.n).R++;}); ev.runs=res.runs; }
  var rbiTxt=function(){return ev.runs?' ('+ev.runs+'타점)':'';};
  if(oc==='OUT'&&this.bases[0]&&this.outs<2&&rnd()<0.12){ this.bases[0]=null; this.outs+=2; ps.OUT+=2; bs.AB++; ev.oc='GIDP'; ev.desc='병살타'; }
  else if(oc==='K'){ bs.AB++; bs.SO++; ps.SO++; this.outs++; ps.OUT++; ev.desc='삼진 아웃'; }
  else if(oc==='OUT'){
    if(this.bases[2]&&this.outs<2&&rnd()<0.30){ var runner=this.bases[2]; this.bases[2]=null; this.score[off]++; this.runsThisHalf++; bs.RBI++; ps.R++; ps.ER++; this.pRuns[def]++; this._ensureBat(off,runner.n).R++; this.outs++; ps.OUT++; ev.oc='SF'; ev.runs=1; ev.desc='희생플라이 (1타점)'; }
    else { bs.AB++; this.outs++; ps.OUT++; ev.desc='범타 아웃'; }
  }
  else if(oc==='BB'){ bs.BB++; ps.BB++; credit(applyOutcome(this,'BB',bat)); ev.desc='볼넷'+rbiTxt(); }
  else if(oc==='HBP'){ bs.HBP++; credit(applyOutcome(this,'HBP',bat)); ev.desc='몸에 맞는 공'+rbiTxt(); }
  else if(oc==='1B'){ bs.AB++; bs.H++; ps.H++; this.hits[off]++; credit(applyOutcome(this,'1B',bat)); ev.desc='안타'+rbiTxt(); }
  else if(oc==='2B'){ bs.AB++; bs.H++; bs._2B++; ps.H++; this.hits[off]++; credit(applyOutcome(this,'2B',bat)); ev.desc='2루타'+rbiTxt(); }
  else if(oc==='3B'){ bs.AB++; bs.H++; bs._3B++; ps.H++; this.hits[off]++; credit(applyOutcome(this,'3B',bat)); ev.desc='3루타'+rbiTxt(); }
  else if(oc==='HR'){ bs.AB++; bs.H++; bs.HR++; ps.HR++; ps.H++; this.hits[off]++; credit(applyOutcome(this,'HR',bat)); ev.desc=(ev.runs>1?ev.runs+'점 ':'')+'홈런!'; }
  // walk-off or half end
  if(this.half==='bottom'&&this.inning>=9&&this.score[this.h]>this.score[this.a]){
    this.line[this.h].push(this.runsThisHalf); this.runsThisHalf=0; this.over=true; this.winner=this.h; ev.walkoff=true;
  } else if(this.outs>=3){ this._endHalf(); }
  ev.score={}; ev.score[this.h]=this.score[this.h]; ev.score[this.a]=this.score[this.a];
  return ev;
};
IP.step=function(){ if(this.over)return null; this.prepareAB(); return this.commitAB(); };
IP.result=function(){
  return {home:this.h,away:this.a,homeRuns:this.score[this.h],awayRuns:this.score[this.a],
    homeHits:this.hits[this.h],awayHits:this.hits[this.a],box:this.box,
    winner:this.score[this.h]>this.score[this.a]?this.h:(this.score[this.a]>this.score[this.h]?this.a:null),
    homeSP:this.sp[this.h],awaySP:this.sp[this.a],
    homePitchers:this.pUsed[this.h],awayPitchers:this.pUsed[this.a]};
};

global.KBO = {
  ROSTERS:ROSTERS, TEAM_IDS:TEAM_IDS, ovr:ovr, simPA:simPA, simGame:simGame,
  defaultLineup:defaultLineup, newBatStat:newBatStat, newPitStat:newPitStat,
  getB:getB, getP:getP, InteractiveGame:InteractiveGame
};

})(typeof window!=="undefined"?window:globalThis);
