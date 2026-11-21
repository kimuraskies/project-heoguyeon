**부분적으로. 야구다움 8/10 · KBO다움 6.5/10 · FM다움 6.5/10.**

이 게임에서 가장 FM다운 순간은 시범경기를 잘 던진 곽도규와 베테랑 양현종 중 개막 5선발을 정할 때였습니다. 양현종을 택하자 로테이션에 이름이 남고, 곽도규의 사기가 떨어지고, 그 결정을 문제 삼는 기사가 나왔습니다. 한 번의 선택에 전력·사람·평판이 함께 걸립니다. **이런 장면은 이미 있습니다. 다만 첫 경기까지 만나기 어렵고, 다음 시즌까지 기억해 주는 장면도 드뭅니다.**

야구의 기본 숫자는 설득력이 있습니다. KIA로 난수 시드를 바꿔 정규시즌 5회, 총 3,600경기를 자동 진행한 합산 타율은 **.266**, 평균자책점은 **4.64**였습니다. 실제 2026 KBO는 **.268, 4.66**이었습니다. 점수를 깎은 주된 이유는 경기 결과의 분포보다, 감독이 보는 일정·중계·후속 평가 사이의 어긋남입니다. [KBO 역대 구단성적](https://www.koreabaseball.com/Record/History/Team/Record.aspx)

## 이미 FM처럼 작동하는 것

| 장면 | 감독의 선택에 걸린 것 |
|---|---|
| **시범경기에서 주전을 정한다** | KIA 실행에서 곽도규는 10이닝 4자책, 양현종은 5⅓이닝 4자책이었습니다. 캠프 인터뷰가 실제 시범경기 기용을 바꾸고, 개막 때 성적이 더 좋은 후보를 밀어내면 추가 사기 하락과 기사가 발생합니다. 감독에게 기록과 다른 판단을 내릴 자유와 대가가 모두 있습니다. [05b-preseason2.js:175](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/05b-preseason2.js:175>) · [05b-preseason2.js:198](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/05b-preseason2.js:198>) |
| **오늘 불펜을 쓰면 내일 쓸 팔이 달라진다** | 직접 교체 모드에서는 투수코치가 이유와 몸을 푸는 후보를 알려 주고 중계가 멈춥니다. 감독이 한 타자 더 맡길 수 있고, 실제 상대한 타자 수만큼 투수의 컨디션이 소모됩니다. [KBO매니저.html:567](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/KBO매니저.html:567>) · [core.js:665](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/core.js:665>) |
| **전력분석이 다음 맞대결의 작전이 된다** | 상대 투수의 구종 리포트에서 노림수를 정하고, 타자의 타구 분포를 보고 승부 코스를 정할 수 있습니다. 상대별 지시가 저장되고, 엔진은 해당 선수의 능력과 우리 팀의 상대 분석도에 따라 타석 확률을 바꿉니다. [06e-statcast.js:95](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/06e-statcast.js:95>) · [core.js:423](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/core.js:423>) |
| **선수가 감독의 말을 기억한다** | 벤치에 밀린 베테랑에게 ‘40경기 중 20경기 선발’을 약속하면 실제 선발 명단으로 이행을 셉니다. 어겼을 때 다시 약속하거나 팀 사정을 설명하거나 트레이드를 알아보는 후속 선택이 열립니다. [05d-event-data.js:20](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/05d-event-data.js:20>) · [05c-events.js:136](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/05c-events.js:136>) |
| **FA 한 명을 사면 내 선수 한 명을 잃을 수 있다** | A·B등급 영입은 각각 20인·25인 보호명단 결정으로 이어집니다. 명단 밖 선수와 현금 보상 사이의 판단이 실제 선수 이동과 잔고에 반영됩니다. KBO라는 배경이 감독의 겨울 계획을 바꾸는 대목입니다. [04b-fa.js:13](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/04b-fa.js:13>) · [04b-fa.js:197](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/04b-fa.js:197>) |

## 몰입을 깨는 순간 8개

1. **첫 선수를 시험해 보기까지 결재가 많습니다.** KIA 첫해에 리더 3인을 추천안 한 번으로 승인해도, 직접 준비 경로에서는 첫 시범경기 전에 스토브 선택 6건, 캠프 방향 1건, 캠프 선택 4건으로 **11번** 결정했습니다. 결과 화면의 ‘다음 결정’은 별도입니다. 한편 ‘추천 준비로 개막전까지’는 시범 9경기를 전부 처리합니다. 짧게 접속해서 *내가 고른 한 선수만 첫 시범경기에서 보고 싶은* 사람에게 맞는 경로가 비어 있습니다. 제공하신 약 35% 이탈은 라이브 0.73의 관측값이므로, 0.8에서는 이 가설을 다시 측정해야 합니다. [05b-preseason2.js:98](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/05b-preseason2.js:98>) · [05-tactics-preseason.js:278](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/05-tactics-preseason.js:278>)

2. **휴대폰에서 공들인 6이닝이 사라질 수 있습니다.** 빠른 시작으로 들어간 개막전에서 KIA가 **7회초 4–1**로 앞설 때 자동 저장 상태를 새 런타임에서 열었습니다. 같은 경기가 **1회초 0–0**부터 시작됐습니다. 마지막 아웃 직후에는 결과를 안전하게 저장하지만, 경기 도중의 점수·교체·주자는 이어지지 않습니다. 짧은 세션에서 직접 지휘를 망설이게 할 이유입니다. [KBO매니저.html:616](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/KBO매니저.html:616>) · [KBO매니저.html:1768](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/KBO매니저.html:1768>)

3. **144경기를 채워도 KBO의 한 주처럼 흐르지 않습니다.** 게임의 KIA는 키움과 홈 3연전으로 개막하고 월요일에 24경기를 치렀습니다. 실제 2026 KIA 개막은 문학 SSG 원정 2연전입니다. 더 눈에 띄는 건 우천 카드입니다. 이틀 연속 취소돼 에이스를 당겨 쓴다고 안내하지만, 그 선택이 실제로 바꾸는 값은 컨디션 −8뿐입니다. 선발 로테이션을 짜는 감독에게는 이 차이가 큽니다. [KBO매니저.html:364](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/KBO매니저.html:364>) · [09-calendar-farm-training.js:6](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/09-calendar-farm-training.js:6>) · [05d-event-data.js:413](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/05d-event-data.js:413>) · [KBO 2026 일정](https://www.koreabaseball.com/MediaNews/Notice/View.aspx?bdSe=11794)

4. **연장 불펜과 한국시리즈 원정 계획에 옛 규정이 적용됩니다.** 게임은 정규시즌을 12회까지 진행하고 한국시리즈 5차전을 정규시즌 우승팀 홈에 둡니다. 실제 기준은 정규시즌 11회, 한국시리즈 2–3–2 편성으로 5차전은 플레이오프 승리팀 홈입니다. 마지막 투수를 언제 쓸지, 어느 경기까지 원정으로 버틸지가 달라집니다. [core.js:872](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/core.js:872>) · [KBO매니저.html:1034](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/KBO매니저.html:1034>) · [KBO 연장 규정 개정](https://www.koreabaseball.com/MediaNews/Notice/View.aspx?bdSe=11353) · [2026 포스트시즌 편성](https://www.koreabaseball.com/MediaNews/Notice/View.aspx?bdSe=12183)

5. **중계와 기록원이 다른 타구를 봅니다.** 직접 중계로 진행한 KIA 5번째 경기 6회초, 김도영의 홈런은 중계상 **우측 담장**, 기록상 **왼쪽 −21.5도**였습니다. 홈런 멘트가 좌·중·우를 따로 추첨하고 스프레이 차트는 엔진의 타구 각도를 쓰기 때문입니다. 팬이 한 번만 발견해도 다음 전력분석 리포트까지 의심할 만합니다. [KBO매니저.html:828](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/KBO매니저.html:828>) · [06e-statcast.js:69](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/06e-statcast.js:69>)

6. **구단마다 다른 사람과 장소의 감각이 약합니다.** 리더 선임 결과는 나성범·전상현·김선빈의 실명 뒤에 역할별 고정 대사를 직접 인용으로 붙였습니다. 오너가 정한 실존 인물 발언 제약과도 충돌합니다. 홈구장 역시 재정 계산에서 열 구단 모두 같은 관중 상한 **20,500명**을 씁니다. 구단 선택의 차이를 느끼려면 홈경기 흥행과 선수단 반응부터 각 팀 사정이 보여야 합니다. [05b-preseason2.js:279](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/05b-preseason2.js:279>) · [02-career-board.js:199](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/02-career-board.js:199>)

7. **한국 야구다운 소재가 다음 해 선수 운용까지 가지 못합니다.** 별도 실행에서 박민에게 ‘내년 상무 지원’을 권했습니다. 2027년 스토브에도 박민은 KIA 1군에 있었고 ‘상무 예정’ 표시가 남았습니다. 해당 선택의 구현은 사기 −2와 이름 저장에서 끝납니다. 합격이든 불합격이든 결과를 받고 그 자리를 어떻게 채울지 고민하는 순간이 빠집니다. [05d-event-data.js:138](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/05d-event-data.js:138>)

8. **트레이드 복기가 내 판단을 잘못 채점합니다.** 40경기 후 양 팀이 받은 선수의 WAR로 거래를 재평가하는 발상은 좋습니다. 그런데 계산에는 전 소속팀에서 이미 올린 시즌 WAR도 들어갑니다. 전반기에 잘한 선수를 데려와 후반기에 부진해도 영입 성공처럼 읽힐 수 있습니다. 감독 커리어에서 특히 아픈 숫자 오류입니다. [06f-trades.js:56](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/06f-trades.js:56>) · [06f-trades.js:65](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/06f-trades.js:65>)

## FM과 비교해 비어 있는 핵심 루프

| FM이 사람을 붙잡는 이유 | 0.8에서 대응하는 경험 | 연결이 약해지는 지점 |
|---|---|---|
| **선수와의 관계** | 출전 약속을 지키거나 깨면 같은 선수가 다시 찾아옵니다. | 일반 면담은 최근 평점과 성격에 따라 사기를 한 번 가감합니다. 지난겨울의 신뢰가 이번 재계약이나 보직 갈등에서 다시 드러나는 장면이 적습니다. [07-records-offseason.js:244](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/07-records-offseason.js:244>) |
| **스카우팅의 불확실성** | 다음 상대에 대한 지식은 맞대결을 거치며 쌓이고, 신인 잠재력은 추정 별점으로 봅니다. | 신인의 추정 오차는 이름으로 정한 ±4로 고정되고 현재 종합능력은 바로 공개됩니다. 누구를 한 번 더 보러 갈지 고민해 판단을 좁히는 과정이 약합니다. [09-calendar-farm-training.js:60](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/09-calendar-farm-training.js:60>) · [09-calendar-farm-training.js:100](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/09-calendar-farm-training.js:100>) |
| **언론·이사회 압박** | 공개한 순위 공약은 시즌 말에 평가받고, 이사회 신뢰가 떨어지면 경질과 타 구단 제의까지 이어집니다. | 정기 평가는 목표 순위와의 격차·적자가 중심입니다. “성적은 버텼지만 약속한 세대교체는 했나”처럼 운영 방식까지 묻는 중간 평가가 약합니다. [02-career-board.js:182](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/02-career-board.js:182>) · [07-records-offseason.js:103](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/07-records-offseason.js:103>) |
| **장기 성장 서사** | 퓨처스 출전, 훈련, 콜업, 1군 연도별 성적이 있습니다. | 시즌 회고의 감독 결정은 그해 메모 앞의 3건입니다. 직접 지명하고 콜업한 선수가 첫 승을 거둬도 그 일이 내 커리어의 대표 장면으로 선택될 가능성은 낮습니다. [07-records-offseason.js:11](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/07-records-offseason.js:11>) · [06d-news-awards.js:33](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/fm/06d-news-awards.js:33>) |
| **경기 중 가설 검증** | 상대 분석, 선수 신뢰, 작전 숙련이 효과를 바꾸는 구조는 FM과 닮았습니다. | 일반 타석은 결과를 먼저 정한 뒤 투구열을 생성합니다. 첫 공이 나온 뒤의 사인은 다음 타석에 걸립니다. 볼카운트를 보고 지금 주자를 보낼지 판단하는 감독과 화면의 개입 시점이 어긋납니다. [core.js:1211](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/core.js:1211>) · [KBO매니저.html:632](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/KBO매니저.html:632>) · [FM27 전술 효과 설명](https://www.footballmanager.com/the-dugout/tactical-effectiveness-understanding-fm27s-key-new-feature) |

## 우선순위 Top 5

1. **첫 화면에서 선수 한 명을 골라 첫 시범경기로 보낸다 · M**  
   기본 버튼을 ‘수석코치와 준비하고 시범 1차전’으로 둡니다. 기존 주간 진행으로 준비를 처리하되, 오늘 선발로 시험할 야수 한 명을 고르게 하고 프리뷰에 그 이름을 보여 줍니다. **2분 이내 첫 경기 시작**을 설계 목표로 삼고, 버전·경로별 첫 직접 경기 시작률과 완료율을 함께 봅니다. 현재 추적 버전 문자열도 `0.73`이라 배포 시 구분이 필요합니다. 손댈 파일은 `fm/05b-preseason2.js`, `fm/05-tactics-preseason.js`, `KBO매니저.html`, `design/track.js`입니다. [track.js:13](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/design/track.js:13>) · [usage.sql:90](<C:/Users/kimurasky/Documents/Codex/kbo-review/snap-1122/supabase/usage.sql:90>)

2. **0.8 배포 전에 중계와 선수 발언의 신뢰를 바로잡는다 · M**  
   홈런 방향과 타구 묘사는 이미 생성한 타구 각도·종류를 읽게 합니다. 실명 선수에게 붙인 직접화법은 ‘주장이 훈련 강도 조정을 건의했다’처럼 행동을 전하는 문장으로 바꿉니다. 새 음성·로고·외부 에셋 없이 한 경기 안에서 체감할 수 있는 수정입니다. 손댈 파일은 `KBO매니저.html`, `fm/05b-preseason2.js`, `fm/05d-event-data.js`, `fm/01-inbox.js`, `fm/03-morale-gameflow.js`입니다.

3. **개막 때 내가 고른 선수 한 명을 다음 겨울까지 따라간다 · M**  
   첫 대상으로 5선발 경쟁을 권합니다. 선택 당시 두 후보의 시범 성적을 남기고, 선택한 투수의 정규시즌 3번째 선발 뒤에 이닝·실점과 다음 등판 결정을 한 장으로 보여 줍니다. 같은 기록을 시즌 회고와 재계약 화면에 다시 씁니다. 트레이드 복기에도 거래 시점 이후의 성적만 적용합니다. **다음 접속과 두 번째 시즌에 돌아와 확인할 구체적인 이유**가 생깁니다. 손댈 파일은 `fm/05b-preseason2.js`, `fm/06d-news-awards.js`, `fm/06f-trades.js`, `fm/07-records-offseason.js`입니다.

4. **2026 달력과 승부 규정을 실황·자동 진행에서 함께 쓴다 · M**  
   첫해 개막 대진·휴식일·올스타 휴식기를 로컬 일정으로 두고, 정규시즌 연장 11회와 한국시리즈 2–3–2를 공통 규정으로 묶습니다. 우천 카드의 ‘선발 당겨쓰기’는 실제 다음 선발이 바뀔 때 표시합니다. 추가 조작 없이 KBO 팬이 아는 리듬으로 로테이션을 짤 수 있습니다. 손댈 파일은 `KBO매니저.html`, `core.js`, `fm/09-calendar-farm-training.js`, `fm/05d-event-data.js`입니다.

5. **공수 교대 때 중계를 저장하고 한 손으로 이어간다 · L**  
   마지막 공수 교대의 점수·타순·사용 투수·교체 이력·박스 기록·난수 상태를 로컬에 보관합니다. 복귀 첫 화면에는 ‘7회초 4–1, 이어하기’ 버튼 하나를 둡니다. 직접 지휘에 쓴 시간을 보존하는 효과가 큽니다. 경기 결과의 중복 반영까지 검증해야 해서 난이도는 L입니다. 손댈 파일은 `core.js`, `KBO매니저.html`, `fm/08-ui.js`, `qa/runtime.js`입니다.

검증은 제공된 0.8 사본에서 파일 쓰기 없이 진행했습니다. 한 커리어는 포스트시즌을 거쳐 2027년 스토브까지 확인했습니다. 선택 횟수와 경기 상태는 메모리 실행 관측값이며, 실제 휴대폰 터치 시간과 0.8 전환율은 별도 측정 대상입니다. 사본에 `.git`이 없어 브랜치·커밋 표기는 제공값을 기준으로 삼았습니다.