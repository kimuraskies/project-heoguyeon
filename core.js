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
var FOREIGN = ["카스트로","데일","네일","올러","시라카와","오스틴","톨허스트","웰스","카라스코","페라자","왕옌청","화이트","에르난데스","에레디아","타케다","베니지아노","아빌라","디아즈","후라도","오러클린","페덱","블레인","토다","테일러","라일리","힐리어드","사우어","로건","스기모토","보쉴리","대니엘","레이예스","로드리게스","비슬리","이이무라","카메론","세베리노","잭로그","벤자민","타카다","데이비슨","히우라","알칸타라","유토"]; // paid in dollars = foreign-player quota
var HANDS = {"천성호":"우좌","강현우":"우우","윤준혁":"우우","손호영":"우우","이주형":"우좌","박지훈":"우우","오명진":"우좌","박주홍":"좌좌","김지찬":"우좌","황성빈":"우좌","홍종표":"우좌","박민":"우우","최인호":"우좌","박정현":"우우","전의산":"우좌","최지훈":"우좌","류효승":"우우","김한별":"우우","한재환":"우우","박시원":"우우","권동진":"우좌","유준규":"우좌","이영빈":"우좌","안재석":"우좌","김휘집":"우우","이창용":"우우","김현준":"좌좌","손성빈":"우우","나승엽":"우좌","장규현":"우좌","조형우":"우우","고명준":"우우","김주원":"우양","오장한":"우좌","오태양":"우우","안현민":"우우","최원영":"우우","문정빈":"우우","이주헌":"우우","박수종":"우우","박찬혁":"우우","이재현":"우우","김영웅":"우좌","김동혁":"좌좌","김세민":"우우","조세진":"우우","한태양":"우우","윤동희":"우우","김도영":"우우","한승연":"우우","박상준":"좌좌","윤도현":"우우","허인서":"우우","유민":"우우","권광민":"좌좌","임근우":"우우","류현인":"우좌","손민석":"우좌","오스틴":"우우","윤준호":"우우","박성빈":"우우","김건희":"우우","김동헌":"우우","김재상":"우좌","류승민":"좌좌","김민석":"우좌","문현빈":"우좌","에레디아":"좌우","김정민":"좌좌","김민준":"우우","손용준":"우우","김현종":"우우","임종성":"우우","박채울":"우우","원성준":"우좌","송지후":"우우","디아즈":"좌좌","레이예스":"우양","이호준":"우좌","페라자":"우양","황영묵":"우좌","정준재":"우좌","데이비슨":"우우","박준순":"우우","염승원":"우좌","양현종":"좌좌","권혁빈":"우우","어준서":"우좌","여동욱":"우우","전태현":"우좌","김상준":"우좌","심재훈":"우우","함수호":"좌좌","김동현":"우좌","박건우":"우우","박찬형":"우좌","박재엽":"우우","박재현":"우좌","한지윤":"우우","최윤석":"우우","홍대인":"우좌","정현창":"우좌","이강민":"우우","힐리어드":"좌좌","세베리노":"우양","카메론":"우우","박한결":"우좌","히우라":"우우","브룩스":"좌좌","김지석":"우좌","최재영":"우우","아데를린":"우우","카스트로":"우좌","데일":"우우","김민규":"우우","오재원":"우좌","오시후":"좌좌","안재연":"우좌","마드리스":"우좌","김요셉":"우좌","신재인":"우우","고준휘":"좌좌","블레인":"우우","오태곤":"우우","유강남":"우우","고종욱":"우좌","김헌곤":"우우","류지혁":"우좌","박세혁":"우좌","김재현":"우우","구자욱":"우좌","박해민":"우좌","하주석":"우좌","박승욱":"우좌","김민식":"우좌","최항":"우좌","한유섬":"우좌","박민우":"우좌","노진혁":"우좌","김성욱":"우우","나성범":"좌좌","강승호":"우우","장승현":"우우","김인태":"좌좌","이우성":"우우","한승택":"우우","권희동":"우우","김민혁":"우좌","심우준":"우우","안중열":"우우","한석현":"좌좌","장준원":"우우","양석환":"우우","배정대":"우우","임지열":"우우","임병욱":"우좌","박계범":"우우","오윤석":"우우","박찬호":"우우","김태진":"우좌","김태훈":"우우","신민재":"우좌","전병우":"우우","황대인":"우우","김호령":"우우","이도윤":"우좌","김웅빈":"우좌","홍창기":"우좌","김기연":"우우","조수행":"우좌","홍성호":"우좌","주효상":"우좌","이성규":"우우","최원준":"우좌","김규성":"우좌","이진영":"우우","신범수":"우좌","김태연":"우우","장진혁":"우좌","안상현":"우우","도태훈":"우좌","이유찬":"우우","김성윤":"좌좌","박정우":"좌좌","이정훈":"우좌","이정범":"좌좌","박성한":"우좌","천재환":"우우","강백호":"우좌","조대현":"우우","이재원":"우우","송찬의":"우우","문성주":"좌좌","전민재":"우우","추재현":"좌좌","이호연":"우좌","장두성":"우좌","한동희":"우우","한준수":"우좌","이원석":"우우","정은원":"우좌","최준우":"우좌","오영수":"우좌","김형준":"우우","구본혁":"우우","문보경":"우좌","김대한":"우우","주성원":"우우","양우현":"우좌","이해승":"우우","박승규":"우우","김도환":"우우","신윤후":"우우","고승민":"우좌","오선우":"좌좌","변우혁":"우우","노시환":"우우","채현우":"우우","최정원":"우좌","서호철":"우우","최형우":"우좌","강민호":"우우","최정":"우우","양의지":"우우","최주환":"우좌","김현수":"우좌","손아섭":"우좌","김민성":"우우","김태군":"우우","이형종":"우우","서건창":"우좌","김재환":"우좌","최재훈":"우우","전준우":"우우","장성우":"우우","김선빈":"우우","오선진":"우우","오지환":"우좌","채은성":"우우","정수빈":"좌좌","허경민":"우우","박동원":"우우","김상수":"우우","이지영":"우우","안치홍":"우우","소형준":"우우","이강준":"우우","유영찬":"우좌","김윤식":"좌좌","플렉센":"우우","이승민":"좌좌","최준용":"우우","홍민기":"좌좌","장재혁":"우우","최용준":"우우","정해영":"우우","강재민":"우우","한승주":"우우","박시후":"좌좌","오원석":"좌좌","김태경":"우우","한차현":"우우","김영현":"우우","송승기":"좌좌","김진수":"우우","김동주":"우우","최승용":"좌좌","김성진":"우좌","이승현":"우우","이재희":"우좌","김진욱":"좌좌","우강훈":"우우","이의리":"좌좌","이준기":"우우","배동현":"우좌","김건우":"좌좌","장지훈":"우우","조병현":"우우","이용준":"우우","한재승":"우우","벤자민":"좌좌","박영현":"우우","조원태":"좌좌","윤태호":"우우","이병헌":"좌좌","최지강":"우좌","윤석원":"좌좌","이민석":"우우","최지민":"좌좌","황동하":"우우","문동주":"우우","박준영03":"우우","전영준":"우우","김도현":"우우","이기순":"좌좌","임지민":"우우","이준혁":"우우","김정운":"우우","김동규":"우우","최준호":"우우","박윤성":"우우","후라도":"우우","김기준":"우우","이진하":"우우","곽도규":"좌좌","박재규":"우우","김서현":"우우","이로운":"우우","신영우":"우우","목지훈":"우우","김택연":"우우","김윤하":"우우","전준표":"우우","김연주":"우우","박준우":"우우","정현수":"좌좌","성영탁":"우우","네일":"우우","원종혁":"우우","김도빈":"우우","황준서":"좌좌","조동욱":"좌좌","시라카와":"우우","최우석":"우우","손주환":"우우","원종해":"우우","김준원":"우우","톨허스트":"우우","치리노스":"우우","김영우":"우우","양재훈":"우우","김한중":"우우","잭로그":"좌좌","홍민규":"우좌","최민석":"우우","이준우":"우우","정현우":"좌좌","로젠버그":"좌좌","웰스":"좌좌","김서준":"우좌","정세영":"좌좌","임진묵":"우우","박정훈":"좌좌","김백산":"우우","배찬승":"좌좌","이영재":"좌좌","김태균":"우우","김태형":"우우","올러":"우우","정우주":"우우","권민규":"좌좌","화이트":"우우","라일리":"우우","로건":"좌우","대니엘":"우우","스기모토":"우우","사우어":"우우","보쉴리":"우우","카라스코":"우우","리오스":"우우","양우진":"우우","케네디":"좌좌","타카다":"좌좌","최주형":"좌좌","타무라":"우좌","서준오":"우우","최현우":"우우","박준현":"우우","와일스":"우우","박지성":"우우","정다훈":"우우","유토":"우좌","보스":"우우","미야지":"우우","페덱":"우우","장찬희":"우우","오러클린":"좌좌","사토시":"우우","이이무라":"우우","비슬리":"우우","로드리게스":"우우","박정민":"우좌","김한결":"우우","쿄야마":"우우","이준서":"우우","지현":"우우","박준영02":"우우","에르난데스":"우우","왕옌청":"좌좌","쿠싱":"우우","강건우":"좌좌","짐머맨":"좌좌","긴지로":"좌좌","아빌라":"우우","신상연":"우우","타케다":"우우","베니지아노":"좌좌","해치":"우우","토다":"우우","버하겐":"우우","클레빈저":"우우","테일러":"우우","최요한":"좌좌","이재학":"우우","이태양":"우좌","임찬규":"우우","이우찬":"좌좌","홍건희":"우우","한승혁":"우좌","서진용":"우우","김원중":"우좌","임기영":"우우","문승원":"우우","이형범":"우우","배재준":"우우","함덕주":"좌좌","조상우":"우우","이재익":"좌좌","박진형":"우우","구승민":"우우","김종수":"우우","장현식":"우우","임정호":"좌좌","고영표":"우우","박세웅":"우우","하영민":"우우","김유영":"좌좌","이건욱":"우우","배재환":"우우","김민수":"우우","주권":"우우","김재윤":"우우","백승현":"우우","이상규":"우우","최원태":"우우","배제성":"우좌","김강현":"우좌","이민우":"우우","박정수":"우좌","주현상":"우우","김범수":"좌좌","구창모":"좌좌","류진욱":"우우","김선기":"우우","박세진":"좌좌","이영하":"우우","전상현":"우우","정동윤":"우좌","최성영":"좌좌","이정현":"우우","오석주":"우우","고우석":"우우","손주영":"좌좌","박치국":"우우","김재웅":"좌좌","문용익":"우우","최지광":"우우","나균안":"우우","윤성빈":"우우","박상원":"우우","김성민":"좌좌","김진호":"우우","최이준":"우우","김민":"우우","한두솔":"좌좌","성동현":"우우","곽빈":"우우","정철원":"우우","박신지":"우우","현도훈":"우좌","안우진":"우우","양창섭":"우우","이승헌":"우우","하준영":"좌좌","김정우":"우우","최민준":"우우","김영규":"좌좌","신민혁":"우우","김시훈":"우우","손동현":"우우","알칸타라":"우우","전용주":"좌좌","이상동":"우우","이정용":"우우","이상영":"좌좌","이교훈":"좌좌","윤산흠":"우우","조영건":"우우","원태인":"우우","장유호":"우우","백승건":"좌좌","송명기":"우좌","전사민":"우우","박지한":"좌좌","우규민":"우우","노경은":"우우","김진성":"우우","원종현":"우우","김건국":"우우","류현진":"좌우","이용찬":"우우","김강률":"우우","백정현":"좌좌"}; // throws + bats from the KBO profile

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

// ---- defense ----
// The eight fielding spots and how much each one matters to run prevention.
var POS_LIST=["C","1B","2B","3B","SS","LF","CF","RF"];
var POS_W={"C":1.0,"1B":0.5,"2B":1.1,"3B":0.9,"SS":1.3,"LF":0.7,"CF":1.2,"RF":0.8};
// Lineup positions that can cover each other when a starter sits.
var POS_GROUP={"C":"C","1B":"IF","2B":"IF","3B":"IF","SS":"IF","LF":"OF","CF":"OF","RF":"OF","DH":"DH"};
// rating points a fielder loses away from his own position (0 = natural spot)
function posFit(p,pos){
  if(pos==="DH"||!p||p.pos===pos) return 0;
  if(pos==="C") return 30;            // nobody catches without being a catcher
  if(p.pos==="DH") return 18;
  if(pos==="1B") return p.pos==="C"?8:4;
  if(p.pos==="C") return 16;
  var key=p.pos+">"+pos;
  if(POS_GROUP[p.pos]==="IF" && POS_GROUP[pos]==="IF") return ({"2B>SS":5,"SS>2B":3,"3B>SS":7,"SS>3B":4,"2B>3B":6,"3B>2B":6,"1B>3B":10,"1B>2B":12,"1B>SS":16}[key])||8;
  if(POS_GROUP[p.pos]==="OF" && POS_GROUP[pos]==="OF") return pos==="CF"? 8 : 3;
  if(POS_GROUP[p.pos]==="IF") return p.pos==="1B"? 12 : 9; // infielder sent to the outfield
  return 16;                          // outfielder on the infield dirt
}
function fieldVal(p,pos){ return p.fld*0.65 + p.arm*0.35 - posFit(p,pos); }
// team fielding quality (70 = league average) from who stands where; an empty spot counts as a 40
function teamDefense(teamId, lineup, positions){
  var tot=0, w=0;
  POS_LIST.forEach(function(pos){
    var i=positions? positions.indexOf(pos) : -1, p=i>=0? getB(teamId,lineup[i]) : null;
    tot += POS_W[pos]*(p? fieldVal(p,pos) : 40); w += POS_W[pos];
  });
  return tot/w;
}
// give every lineup slot a position: natural spots first, then the best fit for what's left, extra bat = DH
function autoPositions(teamId, lineup){
  var pos=lineup.map(function(){return null;}), free=POS_LIST.slice();
  lineup.forEach(function(n,i){ var p=getB(teamId,n); if(p && free.indexOf(p.pos)>=0){ pos[i]=p.pos; free.splice(free.indexOf(p.pos),1); } });
  free.slice().sort(function(a,b){return POS_W[b]-POS_W[a];}).forEach(function(spot){
    var best=-1, bv=-1e9;
    lineup.forEach(function(n,i){ if(pos[i]) return; var p=getB(teamId,n); var v=p? fieldVal(p,spot) : 0; if(v>bv){bv=v;best=i;} });
    if(best>=0){ pos[best]=spot; free.splice(free.indexOf(spot),1); }
  });
  return pos.map(function(x){ return x||"DH"; });
}
// problems with a lineup's defensive setup, for the lineup screen
function positionIssues(teamId, lineup, positions){
  var out=[], seen={};
  (positions||[]).forEach(function(pos,i){ if(seen[pos]) out.push(pos+" 중복"); seen[pos]=1; });
  POS_LIST.forEach(function(pos){ if(!seen[pos]) out.push(pos+" 비어 있음"); });
  (positions||[]).forEach(function(pos,i){ var p=getB(teamId,lineup[i]); if(p && posFit(p,pos)>=15) out.push(p.n+" "+pos+" 수비 어색"); });
  return out;
}

// ---- tactics ----
// atk: 타격 성향, run: 주루, bunt: 희생번트, teamBat: 팀배팅(진루타), shift: 수비 시프트, bat: 배터리 볼배합, ibb: 고의4구, hook: 투수 교체 타이밍
var DEFAULT_TAC={atk:"normal", run:"normal", bunt:"normal", teamBat:false, shift:"normal", bat:"normal", ibb:false, hook:"normal"};
var TAC_LABELS={
  atk:{normal:"보통", aggr:"초구부터 적극 타격", patient:"공 많이 보기"},
  run:{normal:"보통", aggr:"적극 주루·도루", hold:"주루 자제"},
  bunt:{normal:"접전 후반만", often:"적극 희생번트", never:"번트 없음"},
  shift:{normal:"정상 수비", dp:"병살 시프트", infieldIn:"전진 수비", deep:"외야 깊게"},
  bat:{normal:"보통", attack:"정면 승부", nibble:"유인구 위주"},
  hook:{normal:"보통", quick:"빠른 교체", long:"길게 맡김"}
};
function tacOf(cfg){ var t={}, k; for(k in DEFAULT_TAC) t[k]=DEFAULT_TAC[k]; if(cfg&&cfg.tac) for(k in cfg.tac) if(cfg.tac[k]!=null) t[k]=cfg.tac[k]; return t; }
// throws and bats by name; generated players (draft picks, new imports) get a stable made-up side
function handsOf(n){
  var h=(typeof HANDS!=='undefined')&&HANDS[n]; if(h) return {t:h[0],b:h[1]};
  var s=0,i; for(i=0;i<n.length;i++) s+=n.charCodeAt(i);
  var m=s%10; return {t:(s*2)%10<3?'좌':'우', b:m<3?'좌':m<4?'양':'우'};
}
// same-side matchups favor the pitcher a little, opposite-side the hitter
function platoon(m,batName,pitName){
  var b=handsOf(batName).b, t=handsOf(pitName).t; if(b==='양') b=t==='좌'?'우':'좌';
  if(b===t){ m.K+=0.006; m.HR-=0.0015; } else { m.K-=0.003; m.HR+=0.0008; }
  return m;
}
// rate shifts for one plate appearance from both dugouts' settings and the base/out state
// exO/exD(k) give how well each dugout executes its setting for tactic k: 1 = fully drilled
// (AI clubs, or no data), lower = a plan the players haven't learned yet. An unlearned plan
// delivers only part of its upside and adds some confusion of its own.
function ONE(){ return 1; }
function paMods(offTac, defTac, bases, outs, exO, exD){
  exO=exO||ONE; exD=exD||ONE;
  var m={K:0,BB:0,HR:0,BIP:0,X2:0}, e;
  if(offTac.atk==="aggr"){ e=exO("atk"); m.BB-=0.015*e; m.K-=0.008*e; m.HR+=0.002*e; m.BIP-=0.004*e; m.K+=0.010*(1-e); }
  else if(offTac.atk==="patient"){ e=exO("atk"); m.BB+=0.015*e; m.K+=0.012*e; m.HR-=0.001*e; m.K+=0.006*(1-e); }
  if(offTac.teamBat && bases[1] && !bases[2] && outs===0){ e=exO("teamBat"); m.K-=0.02*e; m.HR-=0.006; m.BIP-=0.006; }
  if(defTac.bat==="attack"){ e=exD("bat"); m.BB-=0.012*e; m.K-=0.004*e; m.HR+=0.003; m.BIP+=0.004; m.HR+=0.003*(1-e); }
  else if(defTac.bat==="nibble"){ e=exD("bat"); m.BB+=0.014; m.K+=0.008*e; m.HR-=0.003*e; m.BIP-=0.004*e; m.BB+=0.008*(1-e); }
  if(defTac.shift==="infieldIn" && bases[2] && outs<2) m.BIP+=0.03;
  else if(defTac.shift==="dp" && bases[0] && outs<2) m.BIP+=0.008;
  else if(defTac.shift==="deep"){ e=exD("shift"); m.X2-=0.05*e; m.BIP+=0.012; }
  return m;
}
// what the scouting staff know about the other dugout (0..1): hitters read the pitchers a
// little better, pitchers attack the hitters' holes a little better
function scoutMods(m, offKnow, defKnow){
  if(offKnow){ m.K-=0.006*offKnow; m.BB+=0.003*offKnow; }
  if(defKnow){ m.K+=0.006*defKnow; m.BB-=0.003*defKnow; }
  return m;
}

// ---- plate appearance simulation ----
// engine calibration on top of LEAGUE (rate offsets; tuned with enginecheck, not data)
var CAL = {K:0.017, BB:-0.005, HR:-0.0022, BIP:0};
// returns one of: K,BB,HBP,HR,1B,2B,3B,OUT. def = fielding team's defense (70 = average)
function simPA(bat, pit, fatigue, def, mods){
  mods=mods||{K:0,BB:0,HR:0,BIP:0,X2:0};
  var fpen = Math.max(-3, (fatigue||0) + pitCarryFatigue(pit) - moraleMod(pit)); // reduces pitcher
  var stu = pit.stu - fpen, ctl = pit.ctl - fpen, mov = pit.mov - fpen*0.6;
  var bm = batTiredMod(bat) + moraleMod(bat);
  var con = bat.con + bm, pow = bat.pow + bm, eye = bat.eye + bm;
  var d = (def==null?70:def) - 70;
  // LEAGUE holds the real league rates; CAL offsets the in-game fatigue that keeps pitchers below their ratings,
  // so whole-season sims land on the real league numbers (tools/enginecheck.js --fatigue)
  var pK  = clamp(LEAGUE.K + CAL.K + 0.0048*(stu - con) + mods.K, 0.03, 0.42);
  var pBB = clamp(LEAGUE.BB + CAL.BB + 0.0040*(eye - ctl) + mods.BB, 0.02, 0.21);
  var pHBP= LEAGUE.HBP;
  var pHR = clamp(LEAGUE.HR + CAL.HR + 0.0014*(pow-70) - 0.0011*(mov-70) + mods.HR, 0.004, 0.10);
  var rest = 1 - pK - pBB - pHBP - pHR;
  if(rest<0.05) rest=0.05;
  // fielders turn balls in play into outs: about 2 points of BABIP per point of team defense
  var babip = clamp(LEAGUE.BIP + CAL.BIP + 0.0024*(con-70) + 0.0016*(bat.spd-70) - 0.0019*(mov-70) - 0.0020*d + mods.BIP, 0.220, 0.400);
  var pHit = rest*babip;
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
    // good outfield arms and range hold extra-base hits to singles
    var dShare = clamp(LEAGUE.X2 + 0.004*(pow-70) - 0.002*d + mods.X2, 0.08, 0.34);
    var tShare = clamp(LEAGUE.X3 + 0.0018*(bat.spd-70), 0.004, 0.05);
    var rr = rnd();
    if(rr < tShare) return "3B";
    if(rr < tShare + dShare) return "2B";
    return "1B";
  }
  return "OUT";
}

// advance runners; bases array indices 0=1st,1=2nd,2=3rd hold runner objects {n, p (pitcher charged), ue (reached on error)} or null
// returns {runs, scorers:[runner,...]}
function applyOutcome(state, outcome, batter){
  var b = state.bases, scorers=[];
  function score(r){ if(r){scorers.push(r);} }
  switch(outcome){
    case "BB": case "HBP":
      if(b[0]){ if(b[1]){ if(b[2]){score(b[2]);} b[2]=b[1]; } b[1]=b[0]; }
      b[0]=batter; break;
    case "E": // reached on an error: everyone moves up one base
      if(b[2]){score(b[2]); b[2]=null;}
      if(b[1]){b[2]=b[1]; b[1]=null;}
      if(b[0]){b[1]=b[0];}
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
function newBatStat(){return {G:0,PA:0,AB:0,H:0,_2B:0,_3B:0,HR:0,BB:0,HBP:0,SO:0,RBI:0,R:0,SB:0,CS:0,SH:0,IBB:0,GDP:0,SF:0};}
function newPitStat(){return {G:0,GS:0,W:0,L:0,SV:0,HD:0,OUT:0,H:0,R:0,ER:0,BB:0,SO:0,HR:0,BF:0,NP:0};}

// ---- lineup building ----
// what a hitter brings at the plate, and how often he gets on base
function batValue(p){ return p.con*0.36 + p.pow*0.34 + p.eye*0.2 + p.spd*0.1; }
function obpValue(p){ return p.eye*0.55 + p.con*0.45; }
// batting order from nine hitters: on-base at the top, best bats 2-4, the rest by quality
function battingOrder(objs){
  var left=objs.slice(), order=[];
  function take(cmp){ left.sort(cmp); return left.shift(); }
  order[0]=take(function(a,b){ return (obpValue(b)+b.spd*0.15)-(obpValue(a)+a.spd*0.15); });
  order[1]=take(function(a,b){ return (batValue(b)+obpValue(b)*0.5)-(batValue(a)+obpValue(a)*0.5); });
  order[2]=take(function(a,b){ return batValue(b)-batValue(a); });
  order[3]=take(function(a,b){ return (b.pow*0.6+batValue(b)*0.4)-(a.pow*0.6+batValue(a)*0.4); });
  left.sort(function(a,b){ return batValue(b)-batValue(a); });
  return order.concat(left);
}
// choose a lineup: fill the eight fielding spots (scarce ones first) weighing bat and glove, best spare bat at DH
function defaultLineup(teamId){
  var r = ROSTERS[teamId];
  var pool = r.batters.filter(function(p){ return !isInjured(p); });
  if(pool.length<9) pool = r.batters.slice();
  var used={}, pick={};
  ["C","SS","CF","2B","3B","RF","LF","1B"].forEach(function(pos){
    var best=null, bv=-1e9;
    pool.forEach(function(p){
      if(used[p.n]) return;
      var v = batValue(p) + 0.45*POS_W[pos]*(fieldVal(p,pos)-70) - posFit(p,pos)*1.6;
      if(v>bv){bv=v;best=p;}
    });
    if(best){ used[best.n]=1; pick[best.n]=pos; }
  });
  // swap fielders between spots while that improves the defense (keeps the same nine bats)
  var names0=Object.keys(pick), better=true, guard=0;
  while(better && guard++<20){ better=false;
    for(var i=0;i<names0.length;i++) for(var j=i+1;j<names0.length;j++){
      var x=getB(teamId,names0[i]), y=getB(teamId,names0[j]), px=pick[x.n], py=pick[y.n];
      var now=POS_W[px]*fieldVal(x,px)+POS_W[py]*fieldVal(y,py), sw=POS_W[py]*fieldVal(x,py)+POS_W[px]*fieldVal(y,px);
      if(sw>now+0.5){ pick[x.n]=py; pick[y.n]=px; better=true; }
    } }
  var dh=pool.filter(function(p){return !used[p.n];}).sort(function(a,b){return batValue(b)-batValue(a);})[0];
  if(dh){ used[dh.n]=1; pick[dh.n]="DH"; }
  var order=battingOrder(pool.filter(function(p){return used[p.n];}));
  var names=order.map(function(p){return p.n;});
  var positions=order.map(function(p){return pick[p.n];});
  // rotation: SP sorted by ovr
  var sp = r.pitchers.filter(function(p){return p.role==="SP";}).sort(function(a,b){return ovr(b)-ovr(a);}).map(function(p){return p.n;}).slice(0,5);
  var cl = r.pitchers.filter(function(p){return p.role==="CL";}).map(function(p){return p.n;});
  var rp = r.pitchers.filter(function(p){return p.role==="RP";}).sort(function(a,b){return ovr(b)-ovr(a);}).map(function(p){return p.n;});
  return {lineup:names, positions:positions, rotation:sp, closer:cl[0]||rp[0], bullpen:rp};
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
// how many pitches a starter throws before the manager goes to the pen
function pitchLimit(p,hook){ return clamp(Math.round(88 + (p.sta-70)*0.9 + (hook==="quick"?-12:hook==="long"?10:0)), 60, 120); }

// Simulate a full game without the play-by-play. cfg = {teamId, lineup[], positions[], spName, bullpen[], closer}
// opts.maxInnings: 12 in the regular season (ties allowed), 15 in the postseason.
function simGame(cfgH, cfgA, opts){
  var g=new InteractiveGame(cfgH, cfgA, opts), n=0;
  while(!g.over && n<2000){ g.step(); n++; }
  return g.result();
}

// ============ BETWEEN-GAME WEAR, RECOVERY, INJURIES ============
// Call once per team per game played, with that game's box score.
// Players who sat out recover; players who played wear down; tired players risk injury.
// Returns the injuries that happened: [{n, type:'B'|'P', games}].
function applyFatigue(teamId, box, wear){
  var r=ROSTERS[teamId], b=box&&box[teamId], hurt=[], injM=(wear&&wear.inj)||1, penUp=(wear&&wear.pen)||0;
  function maybeInjure(p){
    var chance = (0.002 + Math.max(0, 60-cond(p))*0.0004)*injM;
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
    else p.cond=Math.min(100,cond(p)+(p.role==="SP"?20:15+penUp));
  });
  return hurt;
}

// Return a copy of cfg with injured players (and, when restBelow is set, tired batters and
// starters) swapped for the best available alternatives. `forceRest` names players to sit.
// A substitute takes over the benched player's position.
function restAdjust(teamId, cfg, opts){
  opts=opts||{};
  var restBelow=opts.restBelow||0, forceRest=opts.forceRest||[], out={}, k;
  for(k in cfg) out[k]=cfg[k];
  var lineup=cfg.lineup.slice(), r=ROSTERS[teamId];
  var positions=(cfg.positions&&cfg.positions.length===lineup.length)? cfg.positions.slice() : autoPositions(teamId, lineup);
  function unavailable(p){ return !p || isInjured(p) || forceRest.indexOf(p.n)>=0 || (restBelow && cond(p)<restBelow); }
  lineup.forEach(function(n,i){
    var p=getB(teamId,n);
    if(!unavailable(p)) return;
    var spot=positions[i], best=null, bestScore=-1e9;
    r.batters.forEach(function(c){
      if(lineup.indexOf(c.n)>=0 || isInjured(c) || forceRest.indexOf(c.n)>=0) return;
      var score=batValue(c) - posFit(c,spot)*1.2 + (spot==="DH"?0:0.3*(fieldVal(c,spot)-70)) - (cond(c)<restBelow+10?8:0);
      if(score>bestScore){bestScore=score;best=c;}
    });
    // nobody fresh on the bench: an injured starter must still sit, a tired one plays on
    if(best) lineup[i]=best.n;
  });
  out.lineup=lineup; out.positions=positions;
  if(cfg.spName){
    var sp=getP(teamId,cfg.spName);
    if(!sp || isInjured(sp) || cond(sp)<50){
      var pool=(cfg.rotation||[]).concat(r.pitchers.filter(function(p){return p.role!=="CL";}).map(function(p){return p.n;}));
      var order=function(a,b){ return (b.role==="SP")-(a.role==="SP") || cond(b)-cond(a) || ovr(b)-ovr(a); };
      var healthyArms=pool.map(function(n){return getP(teamId,n);}).filter(function(p){return p && !isInjured(p);});
      // prefer a fresh arm; a tired starter keeps the ball, but an injured one always gives it up
      var alt=healthyArms.filter(function(p){return cond(p)>=70;}).sort(order)[0] ||
        ((!sp || isInjured(sp))? healthyArms.sort(order)[0] : null);
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
function makePitch(pit,res){ var t=pickType(pit), loc=locFor(res); return {type:t.k,velo:pitchVelo(pit,t),res:res,x:loc.x,y:loc.y}; }
function genPitchSeq(bat,pit,oc,extra){
  var seq=[],balls=0,strikes=0;
  function push(res){ seq.push(makePitch(pit,res)); }
  if(oc==='BB'){ var ts=Math.floor(rnd()*3); while(balls<4){ if(strikes<ts&&rnd()<0.4){push('S');strikes++;} else {push('B');balls++;} } }
  else if(oc==='K'){ var tb=Math.floor(rnd()*3),g=0; while(strikes<3&&g<10){ g++; if(balls<tb&&rnd()<0.45){push('B');balls++;} else { if(strikes===2&&rnd()<0.35){push('F');} else {push(rnd()<0.5?'SW':'S');strikes++;} } } }
  else if(oc==='HBP'){ var n=Math.floor(rnd()*2); for(var i=0;i<n;i++){ if(rnd()<0.5){push('B');balls++;}else{push('S');strikes++;} if(balls>=3||strikes>=2)break; } push('HBP'); }
  else { var tb2=Math.floor(rnd()*3),ts2=Math.floor(rnd()*3),g2=0; while((balls<tb2||strikes<ts2)&&g2<8){ g2++; if(balls<tb2&&(strikes>=ts2||rnd()<0.5)){push('B');balls++;} else { if(strikes===2&&rnd()<0.3){push('F');} else {push('S');strikes++;} } } push('IP'); }
  if(extra && rnd()<extra && seq.length>=2){
    var s2=0; for(var i=0;i<seq.length-1;i++){ var r=seq[i].res; if(r==='S'||r==='SW'||(r==='F'&&s2<2)) s2++; }
    if(s2>=2) seq.splice(seq.length-1,0,makePitch(pit,'F'));
  }
  return seq;
}

// ============ THE GAME (live step-by-step; simGame runs the same engine without pauses) ============
function InteractiveGame(cfgH, cfgA, opts){
  opts=opts||{};
  var self=this;
  this.h=cfgH.teamId; this.a=cfgA.teamId;
  this.maxInn=opts.maxInnings||12;
  this.cfg={}; this.cfg[this.h]=cfgH; this.cfg[this.a]=cfgA;
  this.inning=1; this.half='top'; this.outs=0; this.bases=[null,null,null];
  function both(f){ var o={}; o[self.h]=f(cfgH,self.h); o[self.a]=f(cfgA,self.a); return o; }
  this.score=both(function(){return 0;}); this.hits=both(function(){return 0;});
  this.line=both(function(){return [];}); this.order=both(function(){return 0;});
  this.lineup=both(function(c){return c.lineup.slice();});
  this.pos=both(function(c,t){ return (c.positions&&c.positions.length===c.lineup.length)? c.positions.slice() : autoPositions(t,c.lineup); });
  this.removed=both(function(){return [];}); // batters taken out of the game (pinch-hit for) can't come back
  this.tac=both(function(c){return tacOf(c);});  // live tactics, changeable mid-game
  this.fam=both(function(c){return c.tacFam||null;}); // {tactic:{value:execution 0..1}}; null = fully drilled
  this.know={}; this.know[this.h]=(cfgH.scoutKnow&&cfgH.scoutKnow[this.a])||0; this.know[this.a]=(cfgA.scoutKnow&&cfgA.scoutKnow[this.h])||0;
  this.cmd=both(function(){return null;});        // one-off order for the next plate appearance: 'bunt' | 'steal' | 'ibb'
  this.pitcher=both(function(c){return c.spName;}); this.pUsed=both(function(c){return [c.spName];});
  this.pBF=both(function(){return 0;}); this.pRuns=both(function(){return 0;});
  this.ptot=both(function(){return 0;}); this.pstr=both(function(){return 0;}); this.pball=both(function(){return 0;});
  this.pOuts=both(function(){return 0;}); this.pInn=both(function(){return 1;});
  this.bpIdx=both(function(){return 0;});
  this.box=both(function(){return {bat:{},pit:{}};});
  this.sp=both(function(c){return c.spName;});
  this.entryLead=both(function(){return {};}); // score margin when each pitcher came in
  this.blown={};      // "team|pitcher" -> let the lead get away
  this.goAhead=null;  // last time a team took the lead: {team, winP, loseP}
  this.runsThisHalf=0; this.over=false; this.winner=undefined; this.decisions=null;
  [this.h,this.a].forEach(function(t){ var s=self._ensurePit(t,self.sp[t]); s.GS=1; s.G=1; self.entryLead[t][self.sp[t]]=0; });
}
var IP=InteractiveGame.prototype;
IP._ensureBat=function(t,n){var b=this.box[t].bat; if(!b[n])b[n]=newBatStat(); return b[n];};
IP._ensurePit=function(t,n){var p=this.box[t].pit; if(!p[n]){ p[n]=newPitStat(); p[n].G=1; } return p[n];};
IP.offId=function(){return this.half==='top'?this.a:this.h;};
IP.defId=function(){return this.half==='top'?this.h:this.a;};
IP.opp=function(t){return t===this.h?this.a:this.h;};
IP.dueBatterName=function(){var o=this.offId();return this.lineup[o][this.order[o]%this.lineup[o].length];};
IP.dueBatter=function(){return getB(this.offId(), this.dueBatterName());};
IP.curPitcher=function(){return getP(this.defId(), this.pitcher[this.defId()]);};
IP.defense=function(t){ return teamDefense(t, this.lineup[t], this.pos[t]); };
IP.setTac=function(t,k,v){ this.tac[t][k]=v; };
// how well team t executes its current setting for tactic k (1 = fully drilled)
IP.ex=function(t,k){ var f=this.fam[t]; if(!f||!f[k]) return 1; var v=f[k][String(this.tac[t][k])]; return v==null? 1 : v; };
IP.orderCmd=function(t,c){ this.cmd[t]=c; };
IP.edge=function(t,k){ var e=this.cfg[t].edge; return (e&&e[k])||0; };
IP.catcher=function(t){ var i=this.pos[t].indexOf('C'); return i>=0? getB(t,this.lineup[t][i]) : null; };
IP.bench=function(t){var lu=this.lineup[t], gone=this.removed[t];return ROSTERS[t].batters.filter(function(b){return lu.indexOf(b.n)<0 && gone.indexOf(b.n)<0 && !isInjured(b);});};
IP.availPitchers=function(t){var used=this.pUsed[t];return ROSTERS[t].pitchers.filter(function(p){return used.indexOf(p.n)<0 && !isInjured(p);});};
IP.cancelPending=function(){ this._pending=null; };
IP.subPitcher=function(t,name){ if(this.pUsed[t].indexOf(name)>=0)return false; var p=getP(t,name); if(!p)return false;
  this._pending=null;
  this.pitcher[t]=name; this.pUsed[t].push(name); this.pBF[t]=0; this.pRuns[t]=0; this.ptot[t]=0; this.pstr[t]=0; this.pball[t]=0;
  this.pOuts[t]=0; this.pInn[t]=this.inning; this.entryLead[t][name]=this.score[t]-this.score[this.opp(t)]; this._ensurePit(t,name); return true;};
IP.pinchHit=function(t,name){ var lu=this.lineup[t]; if(lu.indexOf(name)>=0||this.removed[t].indexOf(name)>=0)return false; var p=getB(t,name); if(!p)return false;
  this._pending=null;
  var i=this.order[t]%lu.length; this.removed[t].push(lu[i]); lu[i]=name; return true;}; // the pinch hitter takes over the position too
// one out recorded by the pitcher on the mound
IP._out=function(def,n){ n=n||1; this.outs+=n; this._ensurePit(def,this.pitcher[def]).OUT+=n; this.pOuts[def]+=n; };
// bookkeeping for one run: charged to the pitcher who let that runner on, unearned if he reached on an error
IP._run=function(off,def,runner,unearned){
  var before=this.score[off]-this.score[def];
  this.score[off]++; this.runsThisHalf++; this.pRuns[def]++;
  var rp=(runner&&runner.p&&this.box[def].pit[runner.p])? runner.p : this.pitcher[def];
  var ghost = this.outs + (this.errOuts||0) >= 3; // the inning would already be over without the error(s)
  var ps=this._ensurePit(def,rp); ps.R++; if(!unearned && !ghost && !(runner&&runner.ue)) ps.ER++;
  if(runner&&runner.n) this._ensureBat(off,runner.n).R++;
  if(before===0) this.goAhead={team:off, winP:this.pitcher[off], loseP:rp};
  if(before===-1) this.blown[def+'|'+this.pitcher[def]]=true;
};
IP._autoManage=function(){
  var def=this.defId(), off=this.offId(); var p=getP(def,this.pitcher[def]);
  var lead=this.score[def]-this.score[off], cfg=this.cfg[def];
  // closer for the save: 9th inning or later, ahead by 1-3
  if(this.inning>=9 && lead>=1 && lead<=3 && this.pitcher[def]!==cfg.closer && closerReady(def,cfg.closer,this.pUsed[def])){ this.subPitcher(def,cfg.closer); return; }
  var isSP=p.role==='SP' && this.pitcher[def]===this.sp[def];
  var change=false;
  if(isSP){
    var hk=this.tac[def].hook, runCap=hk==="quick"?4:hk==="long"?6:5;
    change = this.ptot[def]>=pitchLimit(p,hk) || this.pRuns[def]>=runCap || this.pBF[def]>=20+Math.round(p.sta*0.15)+(hk==="long"?3:hk==="quick"?-3:0);
  } else {
    // a reliever gets about an inning: swap him at the start of a new inning once he has his three outs
    var newInning = this.outs===0 && !this.bases[0] && !this.bases[1] && !this.bases[2] && this.inning>this.pInn[def];
    change = (newInning && this.pOuts[def]>=3 && this.pitcher[def]!==cfg.closer) || this.pBF[def]>=8 || this.ptot[def]>=35 || this.pRuns[def]>=3;
    if(this.pitcher[def]===cfg.closer && this.inning>=9 && lead>=1 && this.pRuns[def]<2 && this.ptot[def]<35) change=false; // let the closer finish
  }
  if(change){
    var next=nextReliever(def,cfg.bullpen,this.bpIdx[def],this.pUsed[def]);
    if(next){ this.bpIdx[def]=next.idx; this.subPitcher(def,next.name); }
  }
};
IP._endHalf=function(){
  var off=this.offId();
  this.line[off].push(this.runsThisHalf); this.runsThisHalf=0;
  this.bases=[null,null,null]; this.outs=0; this.errOuts=0;
  if(this.half==='top'){
    if(this.inning>=9 && this.score[this.h]>this.score[this.a]){ this._finish(this.h); return; }
    this.half='bottom';
  } else {
    if(this.inning>=9 && this.score[this.h]!==this.score[this.a]){ this._finish(this.score[this.h]>this.score[this.a]?this.h:this.a); return; }
    if(this.inning>=this.maxInn){ this._finish(null); return; }
    this.inning++; this.half='top';
  }
};
IP._finish=function(winner){ this.over=true; this.winner=winner; this._decide(); };
// win / loss / save / hold under the scoring rules
IP._decide=function(){
  var w=this.winner; if(!w || !this.goAhead) return;
  var l=this.opp(w), self=this, box=this.box, ga=this.goAhead, sp=this.sp[w];
  var winP=ga.winP;
  // a starter needs five innings for the win; otherwise it goes to the reliever who did the most
  if(winP===sp && box[w].pit[sp].OUT<15){
    var best=null, bv=-1e9;
    this.pUsed[w].forEach(function(n){ if(n===sp) return; var s=box[w].pit[n]; var v=s.OUT-3*s.ER; if(v>bv){bv=v;best=n;} });
    if(best) winP=best;
  }
  box[w].pit[winP].W=1;
  this._ensurePit(l,ga.loseP).L=1;
  var dec={W:winP, L:ga.loseP, SV:null, HD:[]};
  var last=this.pitcher[w];
  var saveOk=function(n){ var e=self.entryLead[w][n], s=box[w].pit[n];
    return n!==sp && e>=1 && !self.blown[w+'|'+n] && s.OUT>=1 && (e<=3 || s.OUT>=9); };
  if(last!==winP && saveOk(last)){ box[w].pit[last].SV=1; dec.SV=last; }
  // holds: relievers who came in to protect a 1-3 run lead, got outs and handed it on
  [w,l].forEach(function(t){
    var lastT=self.pitcher[t];
    self.pUsed[t].forEach(function(n){
      if(n===self.sp[t] || n===lastT || (t===w&&n===winP) || (t===l&&n===ga.loseP)) return;
      var e=self.entryLead[t][n], s=box[t].pit[n];
      if(e>=1 && e<=3 && s.OUT>=1 && !self.blown[t+'|'+n]){ s.HD=1; if(t===w) dec.HD.push(n); }
    });
  });
  this.decisions=dec;
};
// a stolen-base try instead of a pitch to the batter: fast runner on first, second open
IP._stealTry=function(off,def,forced){
  var r=this.bases[0]; if(!r || this.bases[1]) return null;
  var p=getB(off,r.n); if(!p) return null;
  if(!forced){
    if(this.outs>=2 && rnd()<0.5) return null;
    var diff=this.score[off]-this.score[def];
    if(this.inning>=7 && Math.abs(diff)>=4) return null;
    var run=this.tac[off].run;
    var tryP = clamp((p.spd-60)*0.011, 0.01, 0.24) * (run==="aggr"?1+0.8*this.ex(off,"run"):run==="hold"?0.25:1);
    if(rnd()>=tryP) return null;
  }
  var c=this.catcher(def), arm=c? c.arm-posFit(c,'C')*0.5 : 60;
  var ok = rnd() < clamp(0.66 + (p.spd-75)*0.009 - (arm-70)*0.007 - (this.tac[off].run==="aggr"?0.04+0.06*(1-this.ex(off,"run")):0) + this.edge(off,'run') - this.edge(def,'arm'), 0.4, 0.93);
  return {runner:r.n, oc: ok?'SB':'CS'};
};
// sacrifice bunt: runner on first or second, nobody out (one out on the dugout's sign), weak bat or a tight late game
IP._buntCall=function(off,def,bat,slot){
  var b=this.bases, forced=this.cmd[off]==='bunt';
  if(!(b[0]||b[1]) || this.outs>=2 || (!forced && this.outs>0)) return false;
  if(forced) return true;
  var mode=this.tac[off].bunt; if(mode==="never") return false;
  var diff=this.score[off]-this.score[def], close=diff<=1&&diff>=-2;
  if(mode==="often") return close && (batValue(bat)<72 || slot>=7) && rnd()<0.6;
  return this.inning>=7 && diff<=0 && diff>=-1 && batValue(bat)<68 && rnd()<0.7;
};
// intentional walk: first base open, runner in scoring position, a dangerous hitter late in a close game
IP._ibbCall=function(off,def,bat){
  var b=this.bases;
  if(this.cmd[def]==='ibb') return true;
  if(!this.tac[def].ibb || b[0] || !(b[1]||b[2])) return false;
  var diff=this.score[def]-this.score[off];
  return this.inning>=7 && Math.abs(diff)<=2 && batValue(bat)>=78;
};
IP.prepareAB=function(){
  if(this.over) return null;
  this._autoManage();
  var off=this.offId(), def=this.defId();
  var pit=getP(def,this.pitcher[def]);
  var batName=this.dueBatterName(), bat=getB(off,batName);
  var slot=(this.order[off]%this.lineup[off].length)+1;
  if(this._ibbCall(off,def,bat)){
    this.cmd[def]=null;
    this._pending={kind:'ibb',off:off,def:def,batName:batName,bat:bat,pitName:this.pitcher[def],oc:'IBB',pitches:[{type:'고의4구',velo:0,res:'IBB',x:0.5,y:0.5}],slot:slot};
    return this._pending;
  }
  if(this._buntCall(off,def,bat,slot)){
    this.cmd[off]=null;
    var r=rnd(), boc = r < clamp(0.74+(bat.con-70)*0.004,0.55,0.9) ? 'SAC' : r < 0.95 ? 'FC' : 'BUNT1B';
    var bp=[]; if(rnd()<0.35) bp.push(makePitch(pit,rnd()<0.5?'B':'F')); bp.push(makePitch(pit,'IP'));
    this._pending={kind:'bunt',off:off,def:def,batName:batName,bat:bat,pitName:this.pitcher[def],oc:boc,pitches:bp,slot:slot};
    return this._pending;
  }
  var forcedSteal=this.cmd[off]==='steal'; if(forcedSteal) this.cmd[off]=null;
  var st=this._stealTry(off,def,forcedSteal);
  if(st){
    this._pending={kind:'steal',off:off,def:def,batName:batName,bat:bat,pitName:this.pitcher[def],oc:st.oc,runner:st.runner,
      pitches:[makePitch(pit, rnd()<0.6?'B':'S')],slot:slot};
    return this._pending;
  }
  var fatigue=Math.max(0,(this.pBF[def]-(pit.role==='SP'?18:4))*0.7);
  var oc=simPA(bat,pit,fatigue,this.defense(def),platoon(scoutMods(paMods(this.tac[off],this.tac[def],this.bases,this.outs,this.ex.bind(this,off),this.ex.bind(this,def)),this.know[off],this.know[def]),batName,this.pitcher[def]));
  var pitches=genPitchSeq(bat,pit,oc,(this.tac[off].atk==="patient"?0.35:0)+(this.tac[def].bat==="nibble"?0.35:0));
  this._pending={off:off,def:def,batName:batName,bat:bat,pitName:this.pitcher[def],oc:oc,pitches:pitches,slot:slot};
  return this._pending;
};
IP.commitAB=function(){
  var p=this._pending; if(!p) return null; this._pending=null;
  var self=this, off=p.off, def=p.def, oc=p.oc, bat=p.bat, batName=p.batName;
  var strk=0,bll=0; p.pitches.forEach(function(x){ if(x.res==='B'||x.res==='HBP')bll++; else strk++; });
  var thrown = p.kind==='ibb'? 0 : p.pitches.length; if(p.kind==='ibb'){ strk=0; bll=0; }
  this.ptot[def]+=thrown; this.pstr[def]+=strk; this.pball[def]+=bll;
  var ps=this._ensurePit(def,p.pitName); ps.NP+=thrown;
  var ev={inning:this.inning,half:this.half,batter:batName,pitcher:p.pitName,off:off,def:def,oc:oc,runs:0,desc:'',pitches:p.pitches};
  if(p.kind==='steal'){
    var rs=this._ensureBat(off,p.runner); ev.runner=p.runner; ev.steal=true;
    if(oc==='SB'){ rs.SB++; this.bases[1]=this.bases[0]; this.bases[0]=null; ev.desc=p.runner+' 2루 도루 성공'; }
    else { rs.CS++; this.bases[0]=null; this._out(def); ev.desc=p.runner+' 도루 실패'; }
    if(this.outs>=3) this._endHalf();
    ev.score={}; ev.score[this.h]=this.score[this.h]; ev.score[this.a]=this.score[this.a];
    return ev;
  }
  this.order[off]++;
  this.pBF[def]++;
  var bs=this._ensureBat(off,batName);
  bs.PA++; ps.BF++;
  var me={n:batName, p:p.pitName};
  if(p.kind==='ibb'){
    bs.BB++; ps.BB++; bs.IBB=(bs.IBB||0)+1;
    var resI=applyOutcome(this,'BB',me); if(resI.runs){ bs.RBI+=resI.runs; resI.scorers.forEach(function(r){ self._run(off,def,r,false); }); ev.runs=resI.runs; }
    ev.desc='고의4구';
  } else if(p.kind==='bunt'){
    var b=this.bases;
    if(oc==='SAC'){ // batter out, everyone moves up
      bs.SH=(bs.SH||0)+1; this._out(def);
      var sc=[]; if(b[2]&&b[1]&&b[0]){ sc.push(b[2]); b[2]=null; }
      if(b[1]&&!b[2]){ b[2]=b[1]; b[1]=null; } if(b[0]&&!b[1]){ b[1]=b[0]; b[0]=null; }
      if(this.outs<3) sc.forEach(function(r){ bs.RBI++; self._run(off,def,r,false); ev.runs++; });
      ev.desc='희생번트';
    } else if(oc==='FC'){ // lead runner forced, batter safe at first
      bs.AB++; this._out(def);
      if(b[1]&&b[0]){ b[1]=b[0]; } else if(b[1]){ b[1]=null; }
      b[0]=me; ev.desc='번트 실패 (선행 주자 아웃)';
    } else { // bunt single
      bs.AB++; bs.H++; ps.H++; this.hits[off]++;
      var resB=applyOutcome(this,'BB',me); if(resB.runs){ bs.RBI+=resB.runs; resB.scorers.forEach(function(r){ self._run(off,def,r,false); }); ev.runs=resB.runs; }
      ev.desc='번트 안타';
    }
  }
  if(p.kind==='ibb'||p.kind==='bunt'){
    if(this.half==='bottom'&&this.inning>=9&&this.score[this.h]>this.score[this.a]){ this.line[this.h].push(this.runsThisHalf); this.runsThisHalf=0; ev.walkoff=true; this.walkoff=true; this._finish(this.h); }
    else if(this.outs>=3) this._endHalf();
    ev.score={}; ev.score[this.h]=this.score[this.h]; ev.score[this.a]=this.score[this.a];
    return ev;
  }
  function credit(res,rbi,unearned){ if(!res.runs)return; if(rbi) bs.RBI+=res.runs; res.scorers.forEach(function(r){ self._run(off,def,r,unearned); }); ev.runs=res.runs; }
  var rbiTxt=function(){return ev.runs?' ('+ev.runs+'타점)':'';};
  var dfn=this.defense(def);
  if(oc==='OUT'){
    var dp=clamp(0.12 + (dfn-70)*0.002 - (bat.spd-70)*0.002 + (this.tac[def].shift==="dp"?0.05*this.ex(def,"shift"):0) - (this.tac[off].run==="aggr"?0.02*this.ex(off,"run"):0), 0.04, 0.26);
    var err=clamp(0.03 - (dfn-70)*0.0009, 0.012, 0.05);
    if(rnd()<err){ oc='E'; ev.oc='E'; }
    else if(this.bases[0]&&this.outs<2&&rnd()<dp){ this.bases[0]=null; this._out(def,2); bs.AB++; ev.oc='GIDP'; ev.desc='병살타'; bs.GDP++; oc='DONE'; }
  }
  if(oc==='DONE'){}
  else if(oc==='K'){ bs.AB++; bs.SO++; ps.SO++; this._out(def); ev.desc='삼진 아웃'; }
  else if(oc==='E'){ bs.AB++; me.ue=true; this.errOuts=(this.errOuts||0)+1; credit(applyOutcome(this,'E',me),false,true); ev.desc='실책 출루'+(ev.runs?' ('+ev.runs+'점)':''); }
  else if(oc==='OUT'){
    if(this.bases[2]&&this.outs<2&&rnd()<(this.tac[def].shift==="infieldIn"?0.14+0.16*(1-this.ex(def,"shift")):0.30)){ var runner=this.bases[2]; this.bases[2]=null; bs.RBI++; bs.SF++; this._out(def); this._run(off,def,runner,false); ev.oc='SF'; ev.runs=1; ev.desc='희생플라이 (1타점)'; }
    else {
      bs.AB++; this._out(def); ev.desc='범타 아웃';
      // productive out: a runner on second moves up to third
      if(this.outs<3 && this.bases[1] && !this.bases[2] && rnd()<(this.tac[off].teamBat?0.35+0.35*this.ex(off,"teamBat"):0.35)){ this.bases[2]=this.bases[1]; this.bases[1]=null; ev.adv=true; }
    }
  }
  else if(oc==='BB'){ bs.BB++; ps.BB++; credit(applyOutcome(this,'BB',me),true); ev.desc='볼넷'+rbiTxt(); }
  else if(oc==='HBP'){ bs.HBP++; credit(applyOutcome(this,'HBP',me),true); ev.desc='몸에 맞는 공'+rbiTxt(); }
  else if(oc==='1B'){ bs.AB++; bs.H++; ps.H++; this.hits[off]++; credit(applyOutcome(this,'1B',me),true); ev.desc='안타'+rbiTxt(); }
  else if(oc==='2B'){ bs.AB++; bs.H++; bs._2B++; ps.H++; this.hits[off]++; credit(applyOutcome(this,'2B',me),true); ev.desc='2루타'+rbiTxt(); }
  else if(oc==='3B'){ bs.AB++; bs.H++; bs._3B++; ps.H++; this.hits[off]++; credit(applyOutcome(this,'3B',me),true); ev.desc='3루타'+rbiTxt(); }
  else if(oc==='HR'){ bs.AB++; bs.H++; bs.HR++; ps.HR++; ps.H++; this.hits[off]++; credit(applyOutcome(this,'HR',me),true); ev.desc=(ev.runs>1?ev.runs+'점 ':'')+'홈런!'; }
  // walk-off or half end
  if(this.half==='bottom'&&this.inning>=9&&this.score[this.h]>this.score[this.a]){
    this.line[this.h].push(this.runsThisHalf); this.runsThisHalf=0; ev.walkoff=true; this.walkoff=true; this._finish(this.h);
  } else if(this.outs>=3){ this._endHalf(); }
  ev.score={}; ev.score[this.h]=this.score[this.h]; ev.score[this.a]=this.score[this.a];
  return ev;
};
IP.step=function(){ if(this.over)return null; this.prepareAB(); return this.commitAB(); };
IP.result=function(){
  return {home:this.h,away:this.a,homeRuns:this.score[this.h],awayRuns:this.score[this.a],
    homeHits:this.hits[this.h],awayHits:this.hits[this.a],box:this.box,
    winner:this.score[this.h]>this.score[this.a]?this.h:(this.score[this.a]>this.score[this.h]?this.a:null),
    homeSP:this.sp[this.h],awaySP:this.sp[this.a],decisions:this.decisions,
    homePitchers:this.pUsed[this.h],awayPitchers:this.pUsed[this.a],
    line:this.line, innings:this.inning, walkoff:!!this.walkoff, lineup:this.lineup, positions:this.pos};
};

// foreign-player flag for the quota (FOREIGN comes from the roster build; signings set p.f themselves)
TEAM_IDS.forEach(function(t){ ROSTERS[t].batters.concat(ROSTERS[t].pitchers).forEach(function(p){ if(FOREIGN.indexOf(p.n)>=0) p.f=1; }); });

global.KBO = {
  ROSTERS:ROSTERS, TEAM_IDS:TEAM_IDS, LEAGUE:LEAGUE, ovr:ovr, simPA:simPA, simGame:simGame,
  defaultLineup:defaultLineup, battingOrder:battingOrder, batValue:batValue, obpValue:obpValue,
  newBatStat:newBatStat, newPitStat:newPitStat,
  getB:getB, getP:getP, InteractiveGame:InteractiveGame,
  cond:cond, mor:mor, isInjured:isInjured, applyFatigue:applyFatigue, restAdjust:restAdjust,
  DEFAULT_TAC:DEFAULT_TAC, TAC_LABELS:TAC_LABELS, tacOf:tacOf, handsOf:handsOf,
  POS_LIST:POS_LIST, posFit:posFit, fieldVal:fieldVal, teamDefense:teamDefense, autoPositions:autoPositions, positionIssues:positionIssues
};

})(typeof window!=="undefined"?window:globalThis);
