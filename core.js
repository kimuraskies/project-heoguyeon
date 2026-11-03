/* ===== KBO MANAGER - CORE (DOM-free) ===== */
(function(global){
"use strict";

// Player factory: batter [n,pos,age,con,pow,eye,spd,fld,arm,sal]
// sal: real salary in 억 원 (optional; fm.js estimates one from OVR when missing)
function B(n,pos,age,con,pow,eye,spd,fld,arm,sal){var o={n,pos,age,con,pow,eye,spd,fld,arm,type:"B"}; if(sal!=null)o.sal=sal; return o;}
// pitcher [n,role,age,stu,ctl,mov,sta,sal]
function P(n,role,age,stu,ctl,mov,sta,sal){var o={n,role,age,stu,ctl,mov,sta,type:"P"}; if(sal!=null)o.sal=sal; return o;}

var ROSTERS = {
// 2026 KBO 정규시즌 기록 기반 (tools/build_roster.js 로 생성 · 직접 수정은 data/overrides.json)
"KIA": {name:"KIA 타이거즈", color:"#ea0029", batters:[
 B("김도영","3B",23,70,99,80,79,81,78,2.5),
 B("나성범","RF",37,71,86,71,44,65,76,8),
 B("김호령","CF",34,58,69,63,91,80,78,2.5),
 B("박재현","LF",20,65,76,61,94,66,67,0.5),
 B("김선빈","2B",37,87,58,77,51,72,65,6),
 B("카스트로","1B",33,83,83,61,48,65,53,9.8),
 B("한준수","C",27,81,67,80,46,69,67,1),
 B("김태군","C",37,82,70,64,50,72,69,6),
 B("하주석","SS",32,67,67,62,59,76,73,2),
 B("김규성","SS",29,64,60,69,85,78,78,0.9),
 B("박민","SS",25,66,66,67,87,71,69,0.6),
 B("박정우","RF",28,69,62,74,80,67,74,0.6),
 B("박상준","1B",25,66,71,76,55,60,54,0.3),
 B("데일","SS",26,78,65,70,68,68,71,1),
], pitchers:[
 P("네일","SP",33,72,79,73,81,22.4),
 P("올러","SP",32,81,71,74,82,9.8),
 P("양현종","SP",38,62,68,71,65,8),
 P("황동하","SP",24,65,69,67,74,0.8),
 P("시라카와","SP",25,69,65,71,66,0.6),
 P("성영탁","CL",22,66,74,71,45,1.2),
 P("김태형","RP",20,61,70,69,84,0.6),
 P("이의리","RP",24,76,55,69,51,1.3),
 P("조상우","RP",32,64,70,72,42,4),
 P("정해영","RP",25,70,73,69,43,3),
 P("전상현","RP",30,73,77,72,47,3.1),
 P("한재승","RP",25,62,67,71,44,0.8),
]},
"LG": {name:"LG 트윈스", color:"#c30452", batters:[
 B("오스틴","1B",33,77,93,77,68,68,61,15.4),
 B("박해민","CF",36,72,61,69,96,86,75,8),
 B("홍창기","RF",33,70,57,82,64,73,76,5.2),
 B("신민재","2B",30,71,57,71,86,78,65,3.8),
 B("오지환","SS",36,65,74,70,76,78,76,14),
 B("송찬의","LF",27,70,77,66,59,60,64,0.6),
 B("문보경","3B",26,77,70,80,43,77,74,4.8),
 B("박동원","C",36,65,75,77,65,74,66,5),
 B("구본혁","3B",29,76,58,68,76,70,73,2.3),
 B("문정빈","1B",23,61,86,70,66,68,54,0.4),
 B("천성호","3B",29,70,63,64,84,66,70,0.9),
 B("문성주","LF",29,77,62,69,73,66,61,2.8),
 B("이주헌","C",23,58,71,60,64,68,72,0.6),
 B("이재원","RF",27,55,83,67,71,63,77,0.7),
], pitchers:[
 P("임찬규","SP",34,60,78,72,74,2),
 P("톨허스트","SP",27,67,78,71,72,11.2),
 P("웰스","SP",29,71,74,70,68,2.8),
 P("송승기","SP",24,66,74,67,63,1.4),
 P("카라스코","SP",39,71,78,73,73,5),
 P("손주영","CL",28,74,63,72,49,2.9),
 P("김진수","RP",28,61,71,70,47,0.4),
 P("박시원","RP",20,69,72,72,52,0.3),
 P("이정용","RP",30,53,70,70,52,2.7),
 P("장현식","RP",31,66,73,70,51,15),
 P("우강훈","RP",24,71,70,70,39,0.4),
 P("김진성","RP",41,65,71,69,42,4.5),
]},
"한화": {name:"한화 이글스", color:"#fc4e00", batters:[
 B("문현빈","LF",22,75,71,72,81,57,63,2.3),
 B("노시환","3B",26,64,85,69,70,77,77,10),
 B("강백호","DH",27,74,90,70,48,40,50,9),
 B("페라자","RF",28,69,76,84,81,66,78,9.8),
 B("허인서","C",23,69,80,67,46,73,80,0.4),
 B("김태연","1B",29,71,72,69,67,72,62,1.3),
 B("심우준","SS",31,67,66,68,92,79,76,4),
 B("이도윤","2B",30,74,60,62,73,75,64,1.2),
 B("최인호","CF",26,83,70,70,48,75,67,0.6),
 B("이원석","CF",27,66,62,67,91,73,73,0.7),
 B("채은성","1B",36,75,73,68,61,60,51,4),
 B("오재원","CF",19,70,61,71,88,72,71,0.3),
 B("황영묵","2B",27,67,64,75,85,69,64,1),
 B("최재훈","C",37,73,63,70,61,68,77,4),
], pitchers:[
 P("왕옌청","SP",25,65,69,70,69,1.4),
 P("화이트","SP",27,65,77,72,76,11.2),
 P("류현진","SP",39,72,81,72,70,21),
 P("에르난데스","SP",27,63,71,70,63,9.1),
 P("박준영02","SP",24,65,68,67,62,0.3),
 P("이민우","CL",33,57,72,71,45,0.6),
 P("박준영03","RP",23,71,64,68,52,0.3),
 P("황준서","RP",21,74,62,68,52,0.8),
 P("이상규","RP",30,65,71,71,49,0.4),
 P("조동욱","RP",22,75,71,69,39,0.9),
 P("박상원","RP",32,76,72,71,43,2.6),
 P("정우주","RP",20,75,62,68,47,0.7),
]},
"SSG": {name:"SSG 랜더스", color:"#ce0e2d", batters:[
 B("박성한","SS",28,83,61,81,61,80,74,4.2),
 B("최지훈","CF",29,66,69,67,93,75,72,3.7),
 B("정준재","2B",23,69,58,71,93,83,70,1.3),
 B("김재환","DH",38,59,82,80,62,40,50,5),
 B("에레디아","LF",35,73,76,63,74,64,63,11.2),
 B("조형우","C",24,79,69,66,45,67,77,1.3),
 B("전의산","1B",26,61,77,70,53,68,55,0.5),
 B("최정","3B",39,68,89,75,72,74,77,22),
 B("오태곤","1B",35,58,74,66,89,60,59,5),
 B("안상현","3B",29,57,65,70,91,65,71,0.7),
 B("고명준","3B",24,72,81,67,63,67,68,1.6),
 B("한유섬","RF",37,69,66,76,60,68,77,9),
 B("김성욱","RF",33,68,71,74,77,71,77,1),
 B("이지영","C",40,74,65,66,79,71,71,2),
], pitchers:[
 P("김건우","SP",24,69,65,66,65,0.7),
 P("최민준","SP",27,64,67,69,66,1.3),
 P("타케다","SP",33,64,70,67,67,2.8),
 P("김민준","SP",20,71,69,73,70,0.3),
 P("베니지아노","SP",29,68,71,66,68,10.5),
 P("조병현","CL",24,87,66,72,45,2.5),
 P("아빌라","RP",29,81,73,75,86,5.3),
 P("이로운","RP",22,74,69,70,51,2),
 P("김민","RP",27,80,67,73,43,2.1),
 P("문승원","RP",37,59,67,72,47,8),
 P("전영준","RP",24,80,65,67,43,0.7),
 P("노경은","RP",42,66,70,67,44,4),
]},
"삼성": {name:"삼성 라이온즈", color:"#074ca1", batters:[
 B("디아즈","1B",30,82,80,75,44,71,64,18.2),
 B("최형우","DH",43,79,74,75,45,40,50,4),
 B("류지혁","2B",32,69,62,72,94,66,61,7),
 B("김지찬","CF",25,78,57,74,90,75,74,2.3),
 B("구자욱","LF",33,79,73,78,75,54,65,5),
 B("김성윤","RF",27,75,64,72,90,69,80,2),
 B("전병우","3B",34,63,73,72,70,71,74,0.9),
 B("박승규","RF",26,69,75,80,86,70,75,0.8),
 B("강민호","C",41,71,77,71,57,73,68,3),
 B("이재현","SS",23,75,85,73,54,74,73,2.9),
 B("김영웅","3B",23,63,70,66,58,74,77,2.2),
 B("김도환","C",26,68,70,70,60,68,76,0.5),
 B("김헌곤","LF",38,71,68,67,81,65,65,1),
 B("양우현","SS",26,61,65,71,82,80,78,0.4),
], pitchers:[
 P("원태인","SP",26,68,78,72,78,10),
 P("후라도","SP",30,62,79,71,84,18.2),
 P("최원태","SP",29,75,72,69,69,16),
 P("양창섭","SP",27,66,72,69,76,0.9),
 P("오러클린","SP",26,75,68,71,66,0.7),
 P("김재윤","CL",36,79,70,72,46,8),
 P("페덱","RP",30,82,79,72,86,6.6),
 P("장찬희","RP",19,65,71,68,52,0.3),
 P("이승민","RP",26,73,67,73,44,1.1),
 P("임기영","RP",33,64,77,69,50,3),
 P("이승현","RP",24,72,70,69,52,1.2),
 P("배찬승","RP",20,71,59,71,39,0.9),
]},
"NC": {name:"NC 다이노스", color:"#315288", batters:[
 B("김주원","SS",24,70,74,68,94,78,76,3.5),
 B("박민우","2B",33,73,64,74,96,76,62,8),
 B("박건우","RF",36,71,78,73,83,66,77,6),
 B("이우성","LF",32,75,66,63,73,65,63,1.6),
 B("김형준","C",27,63,79,69,46,71,79,2),
 B("김휘집","3B",24,68,78,70,80,75,75,2.4),
 B("천재환","CF",32,67,70,64,90,67,67,1),
 B("권희동","LF",36,75,67,79,58,65,62,2.5),
 B("블레인","1B",29,67,76,69,63,63,59,3.9),
 B("최정원","CF",26,64,60,65,96,75,74,0.9),
 B("안중열","C",31,69,68,72,64,71,71,0.6),
 B("서호철","3B",30,65,66,72,74,70,72,1.5),
 B("김한별","3B",25,65,62,71,78,75,73,0.5),
 B("신재인","1B",19,65,69,75,83,61,61,0.3),
], pitchers:[
 P("구창모","SP",29,69,75,69,79,9),
 P("토다","SP",26,65,73,67,70,1.4),
 P("테일러","SP",31,67,70,72,71,5.9),
 P("라일리","SP",30,90,75,69,83,8.4),
 P("신민혁","SP",27,58,71,70,63,1.9),
 P("전사민","CL",27,64,64,72,43,1.3),
 P("배재환","RP",31,72,70,70,40,1.2),
 P("임지민","RP",23,82,62,69,45,0.3),
 P("김태경","RP",25,69,66,69,52,0.4),
 P("김진호","RP",28,66,51,71,39,1.3),
 P("손주환","RP",24,73,65,70,40,0.8),
 P("송명기","RP",26,71,69,66,51,1.2),
]},
"KT": {name:"KT 위즈", color:"#000000", batters:[
 B("최원준","RF",29,77,64,74,92,69,76,6),
 B("힐리어드","LF",32,61,95,72,80,61,67,9.8),
 B("김현수","1B",38,86,69,70,45,72,61,8),
 B("김상수","2B",36,80,58,74,62,79,72,4),
 B("김민혁","LF",31,78,59,65,56,55,61,2.9),
 B("안현민","RF",23,70,75,82,69,61,75,1.8),
 B("허경민","3B",36,88,63,67,54,67,68,7),
 B("한승택","C",32,70,62,67,52,77,75,1.5),
 B("장성우","DH",36,67,79,85,56,40,50,3),
 B("권동진","SS",28,59,65,71,78,80,74,0.7),
 B("류현인","2B",26,75,62,66,72,70,64,0.3),
 B("오윤석","1B",34,69,62,67,67,63,60,1.4),
 B("장준원","SS",31,68,76,75,57,81,78,0.7),
 B("조대현","C",27,72,68,70,67,75,71,0.6),
], pitchers:[
 P("고영표","SP",35,82,83,70,82,26),
 P("소형준","SP",25,70,79,72,80,3.3),
 P("사우어","SP",27,63,69,72,79,10.5),
 P("오원석","SP",25,73,74,69,78,2.3),
 P("로건","SP",29,72,75,69,72,1.8),
 P("박영현","CL",23,79,69,71,49,3),
 P("배제성","RP",30,70,66,72,74,2),
 P("스기모토","RP",26,72,72,69,46,1),
 P("손동현","RP",25,72,69,70,44,1.5),
 P("보쉴리","RP",33,72,76,72,80,8.4),
 P("대니엘","RP",29,87,72,72,74,5.7),
 P("주권","RP",31,56,71,71,48,1.5),
]},
"롯데": {name:"롯데 자이언츠", color:"#041e42", batters:[
 B("레이예스","LF",32,91,72,66,49,55,63,11.2),
 B("전민재","SS",27,66,66,64,87,82,75,1.1),
 B("황성빈","CF",29,70,57,63,97,67,67,1.1),
 B("고승민","2B",26,76,74,67,52,72,65,1.9),
 B("한동희","3B",27,78,86,67,49,67,68,1.6),
 B("나승엽","1B",24,81,67,75,52,61,57,1),
 B("손성빈","C",24,78,68,65,47,66,76,0.6),
 B("윤동희","RF",23,67,66,71,53,71,76,1.8),
 B("장두성","CF",27,65,60,63,95,78,67,0.8),
 B("전준우","LF",40,76,65,65,60,59,65,7),
 B("노진혁","1B",37,71,69,70,53,59,62,6),
 B("한태양","2B",23,61,62,75,89,76,66,0.7),
 B("손호영","3B",32,64,69,67,82,72,74,1),
 B("유강남","C",34,67,70,62,65,69,70,7),
], pitchers:[
 P("로드리게스","SP",28,84,73,67,75,9.1),
 P("박세웅","SP",31,69,73,70,73,21),
 P("비슬리","SP",31,79,75,69,72,9.1),
 P("나균안","SP",28,70,75,67,80,1.8),
 P("김진욱","SP",24,70,72,70,77,0.7),
 P("최준용","CL",25,76,68,71,46,1.4),
 P("박정민","RP",23,82,61,72,45,0.3),
 P("김원중","RP",33,67,70,72,41,8),
 P("이민석","RP",23,64,65,71,52,0.8),
 P("현도훈","RP",33,65,66,72,46,0.3),
 P("이이무라","RP",28,69,77,70,48,0.6),
 P("정철원","RP",27,66,68,70,40,1.8),
]},
"두산": {name:"두산 베어스", color:"#1a1748", batters:[
 B("박찬호","SS",31,71,61,69,95,74,72,8),
 B("양의지","C",39,81,80,73,47,71,70,42),
 B("정수빈","CF",36,68,64,71,92,77,70,6),
 B("김민석","LF",22,80,62,72,56,60,66,0.8),
 B("안재석","3B",24,73,70,63,75,73,70,0.7),
 B("박준순","2B",20,70,77,64,76,68,60,0.7),
 B("카메론","RF",29,69,72,70,87,57,72,7),
 B("박지훈","3B",26,70,62,69,84,65,68,0.5),
 B("강승호","1B",32,62,74,67,83,59,61,3),
 B("조수행","LF",33,71,60,71,95,66,69,2),
 B("윤준호","C",26,64,69,64,66,71,69,0.3),
 B("양석환","1B",35,64,73,67,59,59,56,3),
 B("세베리노","1B",27,71,76,75,57,54,56,1.1),
 B("손아섭","DH",38,74,63,70,54,40,50,1),
], pitchers:[
 P("잭로그","SP",30,70,80,68,76,9.8),
 P("곽빈","SP",27,91,77,73,83,3.1),
 P("최민석","SP",20,72,72,73,71,0.6),
 P("최승용","SP",25,63,72,68,64,1.6),
 P("벤자민","SP",33,82,75,74,77,0.7),
 P("이영하","CL",29,89,66,73,49,6),
 P("김정우","RP",27,71,66,74,46,0.4),
 P("김택연","RP",21,88,65,70,47,2.2),
 P("타카다","RP",24,72,68,72,51,0.8),
 P("박치국","RP",28,70,75,70,42,1.9),
 P("이용찬","RP",37,74,76,66,44,1),
 P("이병헌","RP",23,67,70,69,39,0.9),
]},
"키움": {name:"키움 히어로즈", color:"#570514", batters:[
 B("데이비슨","1B",35,72,86,63,49,57,56,13.7),
 B("안치홍","2B",36,82,68,73,43,71,64,2),
 B("서건창","2B",37,80,61,72,74,72,63,1.2),
 B("김건희","C",22,72,68,66,44,68,79,0.6),
 B("박찬혁","RF",23,68,75,71,50,71,74,0.4),
 B("권혁빈","SS",21,70,59,62,51,76,73,0.3),
 B("김웅빈","3B",30,69,72,72,55,66,66,0.4),
 B("추재현","CF",27,77,65,68,50,76,67,0.6),
 B("히우라","LF",30,61,78,70,68,69,58,5.6),
 B("최주환","1B",38,79,64,76,51,58,57,3),
 B("임병욱","CF",31,56,76,63,75,79,67,0.6),
 B("이형종","LF",37,60,71,73,71,68,60,6),
 B("여동욱","3B",21,56,71,75,63,64,66,0.3),
 B("김동헌","C",22,69,68,67,66,70,70,0.4),
], pitchers:[
 P("알칸타라","SP",34,74,83,69,84,9.8),
 P("하영민","SP",31,70,73,71,78,2.1),
 P("안우진","SP",27,84,72,71,66,4.8),
 P("박준현","SP",19,73,55,72,64,0.3),
 P("배동현","SP",28,66,76,68,85,0.3),
 P("유토","CL",27,77,72,68,41,1.4),
 P("전준표","RP",21,57,61,72,82,0.4),
 P("박정훈","RP",20,65,64,72,51,0.3),
 P("원종현","RP",39,64,73,71,43,5),
 P("박지성","RP",19,62,67,69,50,0.3),
 P("조영건","RP",27,66,74,69,43,0.7),
 P("김성진","RP",29,62,72,69,50,0.6),
]},
};
var LEAGUE = {"K":0.1948,"BB":0.0938,"HBP":0.0148,"HR":0.0241,"BIP":0.3122,"X2":0.1897,"X3":0.017}; // 2026 league rates the sim reproduces at all-70 ratings

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

// ---- condition / morale (FM-style player state) ----
// cond: 0..100 physical freshness, mor: 0..100 morale (60 = neutral), inj: games left on the injured list.
// Missing fields (old saves, fresh rosters) read as fully fit and neutral.
function cond(p){ return p.cond==null?100:p.cond; }
function mor(p){ return p.mor==null?60:p.mor; }
function isInjured(p){ return (p.inj||0)>0; }
// rating points gained/lost from morale (about -3..+3)
function moraleMod(p){ return (mor(p)-60)*0.08; }
// batter rating points lost to tiredness (0 when cond >= 85, -5 at cond 60)
function batTiredMod(p){ var c=cond(p); return c<85?(c-85)*0.2:0; }
// extra pitcher fatigue carried in from earlier games (0 at cond 100, ~7.5 at cond 50)
function pitCarryFatigue(p){ return (100-cond(p))*0.15; }

// ---- plate appearance simulation ----
// engine calibration on top of LEAGUE (rate offsets; tuned with enginecheck, not data)
var CAL = {K:0.017, BB:-0.005, HR:-0.0022, BIP:0};
// returns one of: K,BB,HBP,HR,1B,2B,3B,OUT
function simPA(bat, pit, fatigue){
  var fpen = Math.max(-3, (fatigue||0) + pitCarryFatigue(pit) - moraleMod(pit)); // reduces pitcher
  var stu = pit.stu - fpen, ctl = pit.ctl - fpen, mov = pit.mov - fpen*0.6;
  var bm = batTiredMod(bat) + moraleMod(bat);
  var con = bat.con + bm, pow = bat.pow + bm, eye = bat.eye + bm;
  // LEAGUE holds the real league rates; CAL offsets the in-game fatigue that keeps pitchers below their ratings,
  // so whole-season sims land on the real league numbers (tools/enginecheck.js --fatigue)
  var pK  = clamp(LEAGUE.K + CAL.K + 0.0048*(stu - con), 0.03, 0.42);
  var pBB = clamp(LEAGUE.BB + CAL.BB + 0.0040*(eye - ctl), 0.02, 0.21);
  var pHBP= LEAGUE.HBP;
  var pHR = clamp(LEAGUE.HR + CAL.HR + 0.0014*(pow-70) - 0.0011*(mov-70), 0.004, 0.10);
  var rest = 1 - pK - pBB - pHBP - pHR;
  if(rest<0.05) rest=0.05;
  var babip = clamp(LEAGUE.BIP + CAL.BIP + 0.0024*(con-70) + 0.0016*(bat.spd-70) - 0.0019*(mov-70), 0.230, 0.400);
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
    var dShare = clamp(LEAGUE.X2 + 0.004*(pow-70), 0.12, 0.34);
    var tShare = clamp(LEAGUE.X3 + 0.0018*(bat.spd-70), 0.004, 0.05);
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
      // 1st -> 3rd only if 3rd is empty (don't overwrite a runner held at 3rd)
      if(b[0]){ if(!b[2] && rnd()<0.25){b[2]=b[0];} else {b[1]=b[0];} }
      b[0]=batter; break;
    case "2B":
      if(b[2]){score(b[2]); b[2]=null;}
      if(b[1]){score(b[1]); b[1]=null;}
      if(b[0]){ if(rnd()<0.48){score(b[0]);} else {b[2]=b[0];} b[0]=null; }
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

// Relievers below this condition are skipped while a fresher arm is available.
var TIRED_RP = 55;
// Next reliever from bullpen[idx..]: the first unused, healthy, rested arm, else the first unused one.
// Returns {name, idx} (idx = where the next search starts) or null.
function nextReliever(teamId, bullpen, idx, used){
  var fallback=null;
  for(var i=idx;i<bullpen.length;i++){
    var n=bullpen[i]; if(used.indexOf(n)>=0) continue;
    var p=getP(teamId,n); if(!p||isInjured(p)) continue;
    if(cond(p)>=TIRED_RP) return {name:n, idx:i+1};
    if(!fallback) fallback={name:n, idx:i+1};
  }
  return fallback;
}
function closerReady(teamId, name, used){
  var p=name&&getP(teamId,name);
  return !!p && used.indexOf(name)<0 && !isInjured(p) && cond(p)>=TIRED_RP;
}

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
    if(tired||blownUp){
      var next = nextReliever(def.id, def.cfg.bullpen, def.bullpenIdx, def.pitchersUsed);
      if(next){
        def.bullpenIdx=next.idx;
        def.pitcherName=next.name; def.pitcherBF=0; def.pitcherRuns=0; def.pitchersUsed.push(next.name);
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
      if(lead>=1 && lead<=3 && closerReady(def.id, def.cfg.closer, def.pitchersUsed)){
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
      if(state.inning>=(opts.maxInnings||12)) break; // ties allowed (12-inning limit; postseason passes 15)
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

// ============ BETWEEN-GAME WEAR, RECOVERY, INJURIES ============
// Call once per team per game played, with that game's box score.
// Players who sat out recover; players who played wear down; tired players risk injury.
// Returns the injuries that happened: [{n, type:'B'|'P', games}].
function applyFatigue(teamId, box){
  var r=ROSTERS[teamId], b=box&&box[teamId], hurt=[];
  function maybeInjure(p){
    var chance = 0.002 + Math.max(0, 60-cond(p))*0.0004;
    if(rnd()<chance){
      var roll=rnd(), games = roll<0.6? 2+Math.floor(rnd()*6) : roll<0.9? 8+Math.floor(rnd()*12) : 20+Math.floor(rnd()*25);
      p.inj=games; hurt.push({n:p.n, type:p.type, games:games});
    }
  }
  r.batters.forEach(function(p){
    if(isInjured(p)){ p.inj--; p.cond=Math.min(100,cond(p)+8); return; }
    var s=b&&b.bat[p.n];
    if(s&&s.PA>0){ p.cond=clamp(cond(p)-(p.pos==="C"?2:1),0,100); maybeInjure(p); }
    else p.cond=Math.min(100,cond(p)+8);
  });
  r.pitchers.forEach(function(p){
    if(isInjured(p)){ p.inj--; p.cond=Math.min(100,cond(p)+20); return; }
    var s=b&&b.pit[p.n];
    if(s&&s.BF>0){ p.cond=clamp(cond(p)-s.BF*(p.role==="SP"?3.2:3.5),0,100); maybeInjure(p); }
    else p.cond=Math.min(100,cond(p)+(p.role==="SP"?20:15));
  });
  return hurt;
}

// Lineup positions that can cover each other when a starter sits.
var POS_GROUP={"C":"C","1B":"IF","2B":"IF","3B":"IF","SS":"IF","LF":"OF","CF":"OF","RF":"OF","DH":"DH"};
// Return a copy of cfg with injured players (and, when restBelow is set, tired batters and
// starters) swapped for the best available alternatives. `forceRest` names players to sit.
function restAdjust(teamId, cfg, opts){
  opts=opts||{};
  var restBelow=opts.restBelow||0, forceRest=opts.forceRest||[], out={}, k;
  for(k in cfg) out[k]=cfg[k];
  var lineup=cfg.lineup.slice(), r=ROSTERS[teamId];
  function unavailable(p){ return !p || isInjured(p) || forceRest.indexOf(p.n)>=0 || (restBelow && cond(p)<restBelow); }
  lineup.forEach(function(n,i){
    var p=getB(teamId,n);
    if(!unavailable(p)) return;
    var grp=p?POS_GROUP[p.pos]:null, best=null, bestScore=-1e9;
    r.batters.forEach(function(c){
      if(lineup.indexOf(c.n)>=0 || isInjured(c) || forceRest.indexOf(c.n)>=0) return;
      var score=ovr(c) + (POS_GROUP[c.pos]===grp?12:0) + (grp==="C"&&c.pos!=="C"?-30:0) - (cond(c)<restBelow+10?8:0);
      if(score>bestScore){bestScore=score;best=c;}
    });
    // nobody fresh on the bench: an injured starter must still sit, a tired one plays on
    if(best) lineup[i]=best.n;
  });
  out.lineup=lineup;
  if(cfg.spName){
    var sp=getP(teamId,cfg.spName);
    if(!sp || isInjured(sp) || cond(sp)<50){
      var pool=(cfg.rotation||[]).concat(r.pitchers.filter(function(p){return p.role!=="CL";}).map(function(p){return p.n;}));
      var alt=pool.map(function(n){return getP(teamId,n);}).filter(function(p){return p && !isInjured(p) && cond(p)>=70;})
        .sort(function(a,b){ return (b.role==="SP")-(a.role==="SP") || cond(b)-cond(a) || ovr(b)-ovr(a); })[0];
      if(alt) out.spName=alt.n;
    }
  }
  var healthy=function(n){ var p=getP(teamId,n); return p && !isInjured(p) && n!==out.spName; };
  out.bullpen=(cfg.bullpen||[]).filter(healthy);
  // injured relievers off the bullpen list; add healthy spare starters at the back as long men
  r.pitchers.forEach(function(p){ if(p.role==="SP" && healthy(p.n) && out.bullpen.indexOf(p.n)<0 && (cfg.rotation||[]).indexOf(p.n)<0) out.bullpen.push(p.n); });
  if(out.closer && !healthy(out.closer)) out.closer=out.bullpen[0];
  return out;
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
IP.bench=function(t){var lu=this.lineup[t];return ROSTERS[t].batters.filter(function(b){return lu.indexOf(b.n)<0 && !isInjured(b);});};
IP.availPitchers=function(t){var used=this.pUsed[t];return ROSTERS[t].pitchers.filter(function(p){return used.indexOf(p.n)<0 && !isInjured(p);});};
IP.subPitcher=function(t,name){ if(this.pUsed[t].indexOf(name)>=0)return false; var p=getP(t,name); if(!p)return false; this.pitcher[t]=name; this.pUsed[t].push(name); this.pBF[t]=0; this.pRuns[t]=0; this.ptot[t]=0; this.pstr[t]=0; this.pball[t]=0; return true;};
IP.pinchHit=function(t,name){ var lu=this.lineup[t]; if(lu.indexOf(name)>=0)return false; var p=getB(t,name); if(!p)return false; lu[this.order[t]%lu.length]=name; return true;};
IP._autoManage=function(){
  var def=this.defId(); var p=getP(def,this.pitcher[def]);
  if(this.inning>=9){ var lead=this.score[def]-this.score[this.offId()]; var cl=this.cfg[def].closer;
    if(lead>=1&&lead<=3&&closerReady(def,cl,this.pUsed[def])){ this.subPitcher(def,cl); return; } }
  var isSP=p.role==='SP'; var lim=isSP?(20+Math.round(p.sta*0.18)):6;
  if(this.pBF[def]>=lim||this.pRuns[def]>=5){
    var next=nextReliever(def,this.cfg[def].bullpen,this.bpIdx[def],this.pUsed[def]);
    if(next){ this.bpIdx[def]=next.idx; this.subPitcher(def,next.name); }
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
  getB:getB, getP:getP, InteractiveGame:InteractiveGame,
  cond:cond, mor:mor, isInjured:isInjured, applyFatigue:applyFatigue, restAdjust:restAdjust
};

})(typeof window!=="undefined"?window:globalThis);
