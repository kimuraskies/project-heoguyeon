/* Options, notices and the information pages: what this project is, what it records, where the
   data comes from, and how saves work. Opened from the header's 설정 dropdown. */
(function () {
  const TRACK_OFF = 'kbo-track-off', SEEN = 'kbo-notice-seen', ASKED = 'kbo-ask-feedback', ASK_ID = '2026-11-12', PLAN = 'kbo-upcoming', PLAN_ID = '2026-11-22-0.82', THANKS = 'kbo-thanks', THANKS_ID = '2026-11-26-420';
  const S084 = ["스토브리그 첫 화면의 큰 버튼이 지금 처리할 일을 바로 보여줘요(기자회견 답하기, 이번 주 결정하기 등). 수석코치에게 맡기기와 추천 준비로 개막전까지는 그 아래 버튼으로 남겼어요.","정규시즌 빠른 진행이 시리즈 단위로 바뀌었어요: [3연전 빠르게]는 지금 시리즈만 결과로 넘기고, 중간이면 [남은 N경기 빠르게]로 바뀌어요. 5경기·20경기 버튼은 없앴어요.","우천 취소가 나오면 그 경기는 나중 날짜로 밀리고, 빠른 진행은 그 시리즈가 끝나는 곳에서 멈춰요."];
  const S083 = ["투수 보직 변경: 투수 프로필의 보직 숙련도 아래 [선발] [중계] [마무리] 버튼으로 바로 바꿀 수 있어요. 바꾸면 그 보직으로 기용되고, 새 보직 숙련도는 훈련으로 올라가요. 1군 선발은 5명 아래로 줄일 수 없어요.","로테이션 표에서 선발마다 올해 성적(선발 경기, 승패, ERA)을 볼 수 있어요."];
  const S082 = ["수석코치와 준비: 첫 시즌에는 시즌 방향·캠프 방향·시험할 선수 세 가지만 정하면 나머지는 수석코치가 맡고 바로 시범경기 1차전으로 가요. 직접 하나하나 정하는 길도 그대로 있어요.","결정과 결정 사이의 결과 화면을 없앴어요. 방금 내린 결정은 다음 카드 위에 한 줄로 보여요.","경기 중 앱을 닫아도 이어서 할 수 있어요. 공수 교대 때마다 저장되고, 다시 열면 \"7회초 4:1 · 이어하기\"가 나와요.","볼카운트마다 사인을 낼 수 있어요. 도루·히트앤런 같은 작전이 다음 타석이 아니라 그 타석에 바로 걸려요.","KBO 달력: 월요일은 쉬고, 화~목·금~일 3연전으로 돌아가요. 올스타 휴식기가 있고, 비로 취소된 경기는 뒤로 미뤄져요. 다음 선발을 다시 고를 수 있어요.","중계의 타구 방향이 실제 타구 각도와 같아졌어요. 좌중간 2루타면 기록에도 좌중간이에요.","감독과의 관계: 선수마다 감독을 얼마나 믿는지 기억해요. 약속을 지키고 어긴 일, 주전 선택, 면담, 말소가 쌓이고 재계약 금액과 FA 잔류, 불만 면담에 영향을 줘요. 선수 프로필에서 볼 수 있어요.","감독의 선수: 직접 지명·콜업·영입한 선수와 개막 주전으로 고른 선수의 첫 승, 첫 홈런, 10승 같은 이정표가 소식으로 와요. 개막 때 고른 선수는 시즌 초 중간 점검 보고가 오고, 계속 맡길지 다시 경쟁시킬지 정해요.","이사회 중간 평가: 40경기, 80경기에 단장 미팅에서 정한 방향(우승·균형·리빌딩)대로 운영하는지 평가해요.","스카우팅: 다른 팀 선수의 능력치는 범위로 보여요. 맞대결과 전력분석팀, 주 1회 스카우트 파견으로 범위가 좁아져요. 드래프트 후보도 파견하면 잠재력 추정이 정확해져요.","실제 홈구장: 10개 구단 홈구장 이름과 좌석 수가 반영돼 관중과 입장 수입이 구장마다 달라요.","상무: 상무 지원을 권한 선수는 다음 스토브리그에 합격 여부가 나오고, 합격하면 두 시즌 동안 팀을 떠났다가 돌아와요.","트레이드 다시 보기가 이적 후 성적만으로 평가해요.","실명 선수와 코치에게 따옴표 대사를 붙이지 않아요. 무엇을 했는지로 전해요."];
  const S08 = ["개막 전 흐름을 새로 짰어요. 스토브리그 3주: 1주차 단장 미팅과 코치진 정비, 2주차 리더 선임, 3주차 보강 과제(가장 약한 자리를 FA·2군·기존 선수 중 누구로 채울지). 2주차부터는 이벤트도 함께 와요.","주장·투수조장·야수조장: 수석코치 추천안을 한 장으로 보여 줘요. 그대로 승인하거나 이름을 눌러 바꿀 수 있고, 매 시즌 스토브리그 2주차에 다시 정해요. 뽑힌 선수 이름 옆에 C·투·야 표시가 붙어요.","스프링캠프 4주: 1주차는 훈련 방향, 2주차는 주장의 건의, 4주차는 기자 인터뷰예요. 인터뷰에서 시범경기에서 확인할 경쟁 자리와 기용 방침을 밝혀요. 시범경기는 9경기로 늘었어요.","수석코치 안내에 실제 중계 화면(작전 · 투수 교체 · 야수 교체)을 넣었어요. 첫 경기 전에 무엇을 지시할 수 있는지 미리 볼 수 있어요.","이벤트가 60종 넘게 생겼어요. 스토브리그·스프링캠프·시범경기·정규시즌마다 순위, 연봉, 선수 나이, 계약 기간, 시범경기 성적, 이전 선택에 따라 다른 장면이 열려요.","선수와의 약속: 베테랑에게 출전을, 유망주에게 콜업을, 간판에게 트레이드 불가를 약속할 수 있어요. 대시보드 \"약속\" 카드에 남은 경기와 진행이 보이고, 기한이 지나면 지켰는지에 따라 다음 장면이 이어져요.","이어지는 이벤트에는 \"지난 선택\"이 함께 보여요. 몇 주, 몇십 경기 뒤에 그때의 결정이 돌아와요.","팀 전술 → 투수 교체 타이밍에 \"직접 교체(중계)\"가 생겼어요. 중계를 보는 동안에는 투수코치가 교체를 권하고 멈출 뿐, 바꾸는 건 감독이 직접 해요. 130구를 넘기거나 다치면 코치가 바꿔요.","FA 규정: 두 번째 FA는 B등급, 세 번째부터는 C등급 보상이에요. 웨이버에서 아무도 데려가지 않은 선수는 그해 어느 구단과도 계약할 수 없어요."];
  const S073 = ["휴대폰·태블릿·PC 모두 같은 5개 메뉴를 써요: 감독실 · 편지함 · 선수단 · 리그 · 구단. 메뉴를 누르면 화면 위쪽에 세부 탭이 나와요.","선수단: 로스터 · 라인업 · 팀 전술 · 훈련장. 로스터는 표 맨 위 항목명(OVR, 나이, 홈런, ERA 등 모든 칸)을 누르면 정렬되고, 한 번 더 누르면 순서가 뒤집혀요. 1군 보유 외국인 선수 칸은 표 아래로 옮겼어요.","라인업: 마무리 투수 아래에 불펜 투수 목록이 생겼어요. 경기에서 올리는 순서대로, 컨디션과 \"등판 가능 · 휴식 필요 · 부상\" 상태를 보여 줘요.","리그: 순위 → 일정·경기 → 기록실 순서로 바꿨어요.","구단을 네 방으로 나눴어요. 이사회실(이사회 · 재정 · 팬덤), 단장실(트레이드 · 계약 현황), 코칭스태프, 스카우트(FA 시장 · 외국인 선수)."];
  const S072 = ["FA 제도가 실제 KBO처럼 돌아가요. 1군 등록 8시즌(대졸 7시즌)을 채우면 FA 자격이 생기고, 계약이 끝나면 4시즌 뒤에 다시 자격이 생겨요. 한국시리즈가 끝나면 자격 선수가 공시되고, 선수가 권리 행사 여부를 정해요.","FA 등급(최근 3시즌 연봉 기준): A등급은 팀 내 3위·리그 30위 안, B등급은 팀 내 10위·리그 60위 안, 나머지와 35세 이상은 C등급이에요.","스토브리그 주마다 여러 구단이 경쟁 제안을 넣고, 선수는 금액·계약 기간·원소속 구단 애착·우승 가능성을 따져 골라요. 구단 → 스카우트 탭 FA 시장에서 계약 기간과 금액을 정해 제안해요. 계약금은 총액의 30%를 바로 지급해요.","보상: A등급은 직전 연봉 200%와 보호선수 20인 외 1명(또는 300%), B등급은 100%와 25인 외 1명(또는 200%), C등급은 150%. 우리가 영입하면 보호선수 명단을 직접 짜고, 우리 선수를 뺏기면 보상선수를 직접 골라요.","외부 FA는 구단마다 한 겨울에 2명까지 영입할 수 있어요. 경쟁균형세 상한(2026년 143.97억, 2027년 151.17억)을 넘으면 시즌이 끝난 뒤 초과분의 50%를 내요.","방출은 웨이버 공시로 바뀌었어요. 7경기(스토브리그는 1주) 동안 다른 구단이 클레임하면 잔여 계약이 넘어가고, 없으면 잔여 연봉을 내고 자유계약 선수가 돼요.","외국인 선수: 6주 이상 다친 선수는 보류하고 부상 대체 선수를 쓸 수 있어요(교체 횟수 차감 없음). 다른 구단도 부진한 외국인 선수를 바꿔요. 새 외국인 연봉은 100만 달러, 아시아쿼터는 20만 달러가 상한이에요.","외국인 선수 배치를 2026 시즌 종료 기준으로 맞췄어요. KIA는 시라카와가 1군 아시아쿼터, 데일은 2군이에요. SSG(아빌라·해치), KT(로건·대니엘), 두산(세베리노)도 마지막에 영입한 선수가 1군이고, 떠난 선수는 2군에 있어요. 새 커리어부터 적용돼요.","계약이 끝난 선수와 협상을 미루면 이제 떠나지 않고 요구 조건대로 재계약해요(보류선수).","태블릿과 PC: 왼쪽 메뉴를 감독실·편지함·선수·리그·구단 5개로 묶고, 화면 위에 탭을 뒀어요. 태블릿도 PC와 같은 배치예요.","라인업 탭에 야구장 그림이 생겼어요. 포지션을 누르면 그 자리에 설 선수를 고를 수 있어요.","선수단을 OVR·잠재력·나이·포지션 순으로 정렬할 수 있어요. 잠재력 별점 열도 생겼어요.","구단 화면의 외국인 선수 수(4/3)를 1군 기준으로 고쳤어요."];
  const SOON = ["투수 구종이 실제와 같아졌어요. 1군 투수 120명 중 104명은 실제 구종과 구사율을 반영했어요(양현종은 직구·체인지업·슬라이더·커브). 미국 무대를 거친 외국인 투수는 투구 추적 기록, 국내 투수는 중계·보도 기준이에요. 자료가 없는 투수는 프로필에 '추정'으로 표시돼요. 기존 세이브에서 이번 시즌에 이미 쌓인 구종별 기록은 그대로 남고, 앞으로의 투구부터 새 구종으로 기록돼요.","트레이드 가치가 현실적으로 바뀌었어요. 남은 계약 동안의 기대 활약에서 연봉을 뺀 값에 유망주 가치, 포지션 필요, 구단 상황(우승 경쟁·리빌딩)을 더해 따져요. 그저 그런 선수 여럿을 묶어도 스타 한 명이 되지 않아요.","상대가 트레이드를 거절하면 이유를 한 줄로 알려 줘요.","다른 구단끼리도 트레이드를 해요. 트레이드 탭 아래 '리그 트레이드 이력'에서 모두 볼 수 있어요.","트레이드마다 가상 매체 KBO DAILY의 평가 등급(A 확실한 이득 ~ F 손해)과 기사가 붙어요. 우리 구단 트레이드에는 팬 게시판 반응이 달리고 팬 열기와 이사회 신뢰에도 반영돼요. 40경기 뒤에는 '다시 보는 트레이드' 기사가 나와요.","잠재력을 나이, 2024~26 실제 성장 흐름, 드래프트 라운드로 다시 정했어요. 기존 세이브도 한 번 다시 계산돼요.","SSG 1군에 외국인 선수가 4명이던 문제를 고쳤어요.","상대 선수 프로필의 분석 탭에서 다음 맞대결 지시를 바로 정할 수 있어요. 투수는 구종 구성을 보고 우리 타자의 노림수를, 타자는 타구 방향을 보고 승부 코스를 골라요."];
  const S06 = ["세이버 리포트: 선수 프로필 → 분석 탭에서 투수는 구종 구성, 구종별 구속·헛스윙률·피안타율, 무브먼트, 좌우 타자별 로케이션 히트맵을 볼 수 있어요.","타자는 평균 타구 속도, 강한 타구·배럴 비율, xwOBA, 땅볼·뜬공·라인드라이브 비율, 당겨친·밀어친 타구 비율, 스프레이 차트를 볼 수 있어요.","투수마다 자기 구종 구성이 생겼어요. 볼카운트와 타자에 따라 구종을 고르고, 중계에서 공마다 구속과 구종이 나와요.","모든 타구에 유형·방향·거리·타구 속도가 붙어요. 경기 결과의 확률은 그대로라 기존 커리어도 이어서 하시면 돼요. 리포트는 업데이트 뒤 치른 경기부터 쌓여요."];
  const S05 = ["휴대폰 화면을 새로 짰어요. 자주 쓰는 다섯 메뉴가 화면 아래에 고정되고, 나머지는 '더보기'에 모았어요. 태블릿에서는 왼쪽 세로 메뉴로 바뀌어요.","위쪽 막대에 지금 시즌 단계와 다음 행동 버튼이 항상 보여요.","받은편지함: 메시지를 열면 바로 본문으로 내려가고, 답한 뒤 '다음 결정'으로 이어져요. 오늘 마감인 결정만 진행을 멈춰요.","라인업과 선수단이 휴대폰에서 표 대신 한 줄 목록으로 보여요.","개막 전 감독실에 개막까지 남은 단계가 보여요.","중계 버튼이 커지고 이모지 대신 아이콘으로 바뀌었어요. 경기가 끝나면 결과가 깔끔하게 정리돼요.","작은 탭에서 고른 항목이 채워진 색과 체크로 표시돼요."];
  const PREV = ["실제 2026 신인 드래프트: 10개 구단이 지명한 신인 선수가 가상 신인 대신 2군에 합류했어요. 새 커리어부터 적용돼요.","스토브리그가 주 단위 결정으로 바뀌었어요. 구단주 방침, FA 협상, 트레이드 주간, 코치 평가, 스프링캠프 이벤트와 주전 경쟁이 생겼어요.","야수 포지션 훈련, 받은편지함과 설정 화면 개선, 투수 구종과 보직 정리","버그 수정: 시즌 중 합류한 선발 투수(예: 삼성 페덱)가 불펜으로 나오던 문제, 2군 선수가 1루수로 몰리던 문제, 스프링캠프에 외국인 선수를 영입할 수 없던 문제"];
  const NEXT = ["예전 오프시즌 이벤트 13종도 새 형식으로 옮겨, 이어지는 장면과 약속을 더 늘려요.","처음 오신 분이 첫 경기까지 더 쉽게 갈 수 있게 시작 흐름을 다듬어요."];
  const NEXT06 = ["트레이드 현실화: 계약과 연봉, 구단 상황까지 따지는 트레이드 가치, 다른 구단끼리의 트레이드, 리그 트레이드 이력","트레이드마다 언론 평가와 팬 반응, 몇 달 뒤 재평가 기사","선수 능력치와 잠재력 정리, 실제 구종 반영"];
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  // read before the gate or the game writes anything: a save or an earlier entry means this visitor has been here before
  const RETURNING = !!(get('kbo_manager_autosave') || get('kbo_manager_save') || get('kbo-gate'));
  const set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
  // newest first. id is the date; the header dot shows until the newest one has been opened
  const NOTICES = [
    {id: '2026-11-27 · 0.84', t: '0.84 업데이트 · 지금 할 일 버튼, 시리즈 단위 빠른 진행', b: S084},
    {id: '2026-11-26 · 0.83', t: '0.83 업데이트 · 투수 보직 변경, 로테이션 성적', b: S083},
    {id: '2026-11-22 · 0.82', t: '0.82 업데이트 · 수석코치와 준비, 이어하기, KBO 달력, 감독과의 관계', b: S082},
    {id: '2026-11-19 · 0.8', t: '0.8 업데이트 · 개막 전 흐름, 이벤트와 선수와의 약속', b: S08},
    {id: '2026-11-18 · 0.73', t: '0.73 업데이트 · 메뉴 정리와 불펜 목록', b: S073},
    {id: '2026-11-17 · 0.72', t: '0.72 업데이트 · FA 제도, 메뉴와 라인업 화면', b: S072},
    {id: '2026-11-17 · 0.71', t: '0.71 업데이트 · 실제 구종, 트레이드와 잠재력', b: SOON.concat(NEXT.map(x => '다음 준비 중 · ' + x))},
    {id: '2026-11-17 · 0.6', t: '0.6 업데이트 · 세이버 리포트', b: S06.concat(NEXT06.map(x => '다음 준비 중 · ' + x))},
    {id: '2026-11-17', t: '0.5.1 개선', b: ['라인업 탭 위쪽에 타순·수비와 투수·로테이션 전환 버튼이 생겼어요. 선발과 불펜은 여기서 바로 바꿀 수 있어요.', '휴대폰 감독실의 경기 카드에 이번 경기 버튼이 다시 생겼어요.', '선수단의 2군 버튼을 2군 보내기로 바꾸고, OVR·컨디션·사기 표시에 이름을 붙였어요.', '라인업 능력치를 줄임말 대신 컨택·파워처럼 풀어 썼어요.', '처음 시작할 때 코치 안내가 설명하는 버튼만 밝게 보여요.', '휴대폰에서 카드 제목이 중간에 끊기던 문제를 고쳤어요.']},
    {id: '2026-11-16', t: '0.5 업데이트 · 휴대폰·태블릿 화면', b: S05},
    {id: '2026-11-14', t: '0.4 업데이트', b: PREV},
    {id: '2026-11-10', t: '0.3 업데이트', b: ['작전 야구: 번트·스퀴즈·히트앤런·도루·견제·피치아웃 사인을 경기 중에 낼 수 있어요.', '코칭스태프 10자리: 2026 개막 등록 코치와 보직 변경, 코치 건의', '경기 전 전력분석 브리핑, 선수 분석(WAR·상황별 기록·코치 진단)', '스프링캠프 4주, 스토브리그 FA 입찰, 뉴스, 연말 시상식', '정규시즌 일정이 3연전·2연전 방식으로 바뀌었어요.']},
    {id: '2026-11-09', t: '세이브는 이 브라우저에만 저장돼요', b: ['브라우저 데이터를 지우거나 기기를 바꾸면 커리어가 사라져요.', '설정 → 세이브 관리에서 세이브 파일을 받아 두면 다른 기기에서도 불러올 수 있어요.']},
    {id: '2026-11-07', t: '비영리 팬 프로젝트 안내', b: ['KBO 매니저는 한국 프로야구를 좋아하는 팬이 만든 비영리 프로젝트예요. KBO와 10개 구단의 공식 게임이 아니에요.', '광고와 결제가 없고, 수익을 내지 않아요.']}
  ];
  const PAGES = {
    about: ['프로젝트 소개', `<p><b>KBO 매니저는 한국 프로야구 팬이 만든 비영리 팬 프로젝트예요.</b> 한국야구위원회(KBO)와 10개 구단, 선수협회의 공식 게임이 아니고, 어떤 제휴나 후원 관계도 없어요.</p>
      <p>광고와 결제가 없고 수익을 내지 않아요. 구단 로고와 엠블럼은 쓰지 않았고, 화면의 배지와 그림은 직접 만들었어요.</p>
      <p>이 프로젝트의 꿈은 한국 프로야구에도 오래 사랑받는 정식 매니지먼트 게임이 생기는 거예요. KBO와 구단 관계자분의 의견, 정식 협업 제안을 기다려요. 권리와 관련해 수정이나 삭제가 필요한 내용도 알려 주시면 바로 반영할게요.</p>
      <p><button class="btn" onclick="App.closeModal();Feedback.open()">의견·제안 보내기</button></p>`],
    privacy: ['이용 기록과 개인정보', `<p>더 나은 게임을 만들려고 <b>익명 이용 기록</b>을 모아요.</p>
      <ul><li>모으는 것: 브라우저마다 무작위로 만든 기기 번호, 접속 시각, 본 화면 이름, 진행 상황(구단, 시즌, 경기 수), 누른 주요 버튼, 화면 너비</li>
      <li>모으지 않는 것: 이름, 이메일, 연락처, 세이브 내용, 감독 사진</li>
      <li>쓰는 곳: 몇 명이 어디까지 플레이하고 어디서 그만두는지 보는 데만 써요. 다른 곳에 넘기지 않아요.</li>
      <li>피드백 창에 쓴 글은 적은 내용 그대로 저장돼요. 개인정보는 적지 말아 주세요.</li></ul>
      <p>아래에서 <b>이용 기록 수집</b>을 끄면 그 뒤로는 기록을 보내지 않아요.</p>`],
    data: ['데이터와 라이선스', `<p>선수 기록은 KBO 공식 기록실(koreabaseball.com)의 2026 정규시즌 공개 기록을 바탕으로 했어요. 능력치는 그 기록을 게임 엔진에 맞게 환산한 근사값이고, 실제 선수의 기량 평가가 아니에요.</p>
      <p>코칭스태프는 2026 개막 시점 KBO 등록 현황 기준이에요. 코치 능력치는 현역 시절 기록과 나이로 추정한 게임용 수치예요. 보직은 게임에서 임의로 나눈 것이라 실제와 다를 수 있어요.</p>
      <p>경기 결과, 기사, 인터뷰, 트레이드는 모두 게임이 만든 가상의 내용이에요.</p>`],
    howto: ['게임 방법', `<ul><li><b>오른쪽 위 버튼</b>이 언제나 다음 할 일이에요. 모르겠으면 이것만 눌러도 시즌이 진행돼요. 받은편지함에 결정할 메시지가 있으면 그 메시지부터 열어 줘요.</li>
      <li>스토브리그 → 스프링캠프 4주 → 시범경기 → 정규시즌 144경기 → 포스트시즌 순서예요.</li>
      <li>경기는 직접 보거나(중계) 건너뛸 수 있어요. 중계에서는 투수·야수 교체와 작전 사인을 낼 수 있어요.</li>
      <li>세이브는 자동이에요. 다만 이 브라우저에만 저장되니 가끔 세이브 파일을 받아 두세요.</li></ul>`]
  };
  const X = '<button type="button" class="closeX" onclick="App.closeModal()" aria-label="닫기">×</button>';
  // one dialog at a time: the game's modal() stacks
  function show(html) { App.closeModal(); modal(html); }
  function trackOn() { return get(TRACK_OFF) !== '1'; }
  function setTrack(on) { set(TRACK_OFF, on ? null : '1'); page('privacy'); }
  const trackRow = () => `<div class="opt-row"><div><b>이용 기록 수집</b><small>익명 기록만 모아요. 끄면 보내지 않아요.</small></div><button class="btn${trackOn() ? ' primary' : ''}" role="switch" aria-checked="${trackOn()}" onclick="Info.setTrack(${!trackOn()})">${trackOn() ? '켜짐' : '꺼짐'}</button></div>`;
  function unseen() { return get(SEEN) !== NOTICES[0].id; }
  function dot() { document.querySelectorAll('.notice-dot').forEach(d => { d.hidden = !unseen(); }); }
  function notices() {
    set(SEEN, NOTICES[0].id); dot();
    show(`${X}<h2>공지사항</h2>${NOTICES.map(n => `<section class="info-note"><small>${n.id}</small><h3>${n.t}</h3><ul>${n.b.map(x => `<li>${x}</li>`).join('')}</ul></section>`).join('')}`);
  }
  function page(k) { const p = PAGES[k]; if (!p) return; show(`${X}<h2>${p[0]}</h2><div class="info-page">${p[1]}</div>${k === 'privacy' ? trackRow() : ''}<div class="row" style="margin-top:12px"><button class="btn" onclick="App.closeModal()">닫기</button></div>`); }
  // the header's 설정 button opens a dropdown, not a dialog
  function items() {
    const inGame = typeof state !== 'undefined' && state && typeof USER !== 'undefined' && USER;
    let g = null; try { g = JSON.parse(localStorage.getItem('kbo-gate') || 'null'); } catch (e) {}
    const it = (l, fn, extra) => `<button type="button" role="menuitem" onclick="Info.closeMenu();${fn}">${l}${extra || ''}</button>`;
    return [inGame ? it('새 게임', 'App.confirmNew()') : '', it('세이브 관리', 'App.saves()'), it('게임 방법', "Info.page('howto')"),
      inGame ? it('업무 분담', 'FM.delegPicker()') : '', it('공지사항', 'Info.notices()', `<i class="notice-dot"${unseen() ? '' : ' hidden'}></i>`), it('의견 보내기', 'Feedback.open()'),
      '<hr>', `<div class="set-links">${it('프로젝트 소개', "Info.page('about')")}${it('이용 기록과 개인정보', "Info.page('privacy')")}${it('데이터와 라이선스', "Info.page('data')")}</div>`,
      g && g.token && window.Gate && Gate.required() ? '<hr>' + it('로그아웃', 'Gate.logout()') : ''].join('');
  }
  function onDoc(e) { const m = document.getElementById('setMenu'); if (m && !m.contains(e.target) && !e.target.closest('#setBtn')) closeMenu(); }
  function onKey(e) { if (e.key === 'Escape') { closeMenu(); const b = document.getElementById('setBtn'); if (b) b.focus(); } }
  function closeMenu() { const m = document.getElementById('setMenu'); if (m) m.remove(); const b = document.getElementById('setBtn'); if (b) b.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onDoc, true); document.removeEventListener('keydown', onKey); }
  function menu() {
    const b = document.getElementById('setBtn');
    if (!b || !b.offsetParent) return options();
    if (document.getElementById('setMenu')) return closeMenu();
    App.closeModal();
    const m = document.createElement('div'); m.id = 'setMenu'; m.className = 'set-menu'; m.setAttribute('role', 'menu'); m.setAttribute('aria-label', '설정');
    m.innerHTML = items(); b.parentElement.appendChild(m); b.setAttribute('aria-expanded', 'true');
    setTimeout(() => { document.addEventListener('click', onDoc, true); document.addEventListener('keydown', onKey); const f = m.querySelector('button'); if (f) f.focus(); }, 0);
  }
  function options() {
    const row = (t, d, btn) => `<div class="opt-row"><div><b>${t}</b><small>${d}</small></div>${btn}</div>`;
    const inGame = typeof state !== 'undefined' && state && typeof USER !== 'undefined' && USER;
    let gate = null; try { gate = JSON.parse(localStorage.getItem('kbo-gate') || 'null'); } catch (e) {}
    show(`${X}<h2>설정</h2>
      ${inGame ? row('새 게임', '지금 커리어를 끝내고 처음부터 시작해요.', `<button class="btn" onclick="App.closeModal();App.confirmNew()">시작</button>`) : ''}
      ${row('세이브 관리', '세이브는 이 브라우저에만 저장돼요. 브라우저 데이터를 지우면 사라지니 파일로 받아 두세요.', `<button class="btn" onclick="App.saves()">열기</button>`)}
      ${row('게임 방법', '진행 순서와 기본 조작', `<button class="btn" onclick="Info.page('howto')">보기</button>`)}
      ${inGame ? row('업무 분담', '코치에게 맡길 일을 정해요.', `<button class="btn" onclick="FM.delegPicker()">열기</button>`) : ''}
      ${row('공지사항', '업데이트 내역과 안내', `<button class="btn" onclick="Info.notices()">보기</button>`)}
      ${row('의견 보내기', '버그, 아이디어, 제휴 제안', `<button class="btn" onclick="App.closeModal();Feedback.open()">열기</button>`)}
      ${gate && gate.token && window.Gate && Gate.required() ? row('로그아웃', '이 기기의 입장 기록을 지워요. 다시 들어오려면 초대코드가 필요해요.', `<button class="btn" onclick="Gate.logout()">로그아웃</button>`) : ''}
      <h4 class="st-group">정보</h4>
      <div class="opt-links"><button class="btn" onclick="Info.page('about')">프로젝트 소개</button><button class="btn" onclick="Info.page('privacy')">이용 기록과 개인정보</button><button class="btn" onclick="Info.page('data')">데이터와 라이선스</button></div>
      <p class="hint" style="margin-top:12px">KBO 매니저는 비영리 팬 프로젝트이며 KBO와 구단의 공식 게임이 아니에요.</p>`);
  }
  // once per visitor per release: what this update brought, with the feedback button (returning players who already
  // got the feedback request still see this once)
  function askFeedback(tries) {
    if (get(PLAN) === PLAN_ID) { thanks(0); return; }
    if (document.querySelector('.modal-bg') || document.body.classList.contains('gate-on')) { if ((tries || 0) < 20) setTimeout(() => askFeedback((tries || 0) + 1), 1500); return; }
    set(PLAN, PLAN_ID); set(ASKED, ASK_ID); set(SEEN, NOTICES[0].id); dot();
    if (!RETURNING) return; // first visit: the coach's guide comes first, the notes stay in 공지사항
    if (window.Track) Track.action('plan_show');
    const li = a => a.map(x => `<li>${x}</li>`).join('');
    show(`${X}<h2>0.82 업데이트: 진짜 감독처럼</h2>
      <div class="info-page"><p>${RETURNING ? '다시 찾아 주셔서 고마워요! ' : ''}남겨 주신 의견을 반영했어요.</p>
      <h3>이번에 바뀐 점</h3><ul>${li(S082)}</ul>
      <h3>함께 들어간 0.8 · 개막 전 흐름과 이벤트</h3><ul>${li(S08)}</ul>
      <h3>그다음 준비 중</h3><ul>${li(NEXT)}</ul>
      <p class="hint">새 버전을 플레이해 보신 느낌이나 불편한 점도 들려 주세요.</p></div>
      <div class="row" style="margin-top:14px;gap:8px;flex-wrap:wrap"><button class="btn primary" onclick="Info.askClose()">확인</button><button class="btn" onclick="Info.askOpen()">의견 보내기</button></div>`);
  }
  function askOpen() { if (window.Track) Track.action('askfb_open'); App.closeModal(); Feedback.open('plan-popup'); }
  function askClose() { if (window.Track) Track.action('askfb_close'); App.closeModal(); setTimeout(() => thanks(0), 250); }
  // once per visitor: a thank-you to the managers who keep playing, with the community milestone.
  // it waits behind the gate and any open dialog (the update notes), so nothing is covered up
  function thanks(tries) {
    if (get(THANKS) === THANKS_ID) return;
    if (document.querySelector('.modal-bg') || document.body.classList.contains('gate-on')) { if ((tries || 0) < 40) setTimeout(() => thanks((tries || 0) + 1), 1500); return; }
    set(THANKS, THANKS_ID);
    if (!RETURNING) return; // first visit: the coach's guide comes first
    if (window.Track) Track.action('thanks_show');
    show(`${X}<h2>감사합니다, 감독님 🎉</h2>
      <div class="info-page"><p>계속해서 KBO 매니저를 이용해 주셔서 진심으로 감사합니다.</p>
      <p>감독님들의 꾸준한 시즌 완주와 응원 덕분에 벌써 <b>420명이 넘는 감독님</b>이 함께하고 있습니다.</p>
      <p>앞으로도 더 재미있는 구단 운영과 업데이트로 보답하겠습니다.</p>
      <p class="hint">불편한 점이나 바라는 점은 언제든 들려주세요. 다음 업데이트에 반영할게요.</p></div>
      <div class="row" style="margin-top:14px;gap:8px;flex-wrap:wrap"><button class="btn primary" onclick="Info.thanksClose()">확인</button><button class="btn" onclick="Info.thanksOpen()">의견 보내기</button></div>`);
  }
  function thanksOpen() { if (window.Track) Track.action('thanks_fb'); App.closeModal(); Feedback.open('thanks-popup'); }
  function thanksClose() { if (window.Track) Track.action('thanks_close'); App.closeModal(); }
  window.Info = {notices, options, menu, closeMenu, page, setTrack, trackOn, dot, askFeedback, askOpen, askClose, thanks, thanksOpen, thanksClose};
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('DOMContentLoaded', dot);
})();
