# 0.8 이벤트 엔진 검토 보고서

브랜치: `codex/events-0.8`. 커밋하지 않음.

시작 HEAD는 `d95eb06`이었다. 로컬에는 `ui/fix-0.71` 참조가 없고, `codex/fix-0.71`이 현재 HEAD의 조상인 것은 확인했다. 기존 작업 브랜치의 후속 변경을 유지했다.

## 변경 파일

| 파일 | 변경 내용 |
| --- | --- |
| `fm/05c-events.js` | 씨앗 추첨, 문맥, 효과, 저장 가능한 선수 참조, 연쇄 예약, 약속, 기존 이벤트 어댑터 및 생명주기 연결 |
| `fm/00-core.js` | 옛 세이브 이벤트 상태 초기화 한 줄 |
| `fm/03-morale-gameflow.js` | 경기 뒤 이벤트 훅 한 줄 |
| `fm/05b-preseason2.js` | `offFill`에서 고정 주차 유지, 랜덤 슬롯을 엔진으로 연결 |
| `fm/09-calendar-farm-training.js` | `FM.evtPromises` 내보내기 |
| `fm.js` | `node tools/build_fm.js`로 재생성 |
| `tools/event_audit.js` | 5개 커리어 × 5시즌, 동일 저장본 재실행, 효과 한도·예약·쿨다운·다양성 검사 및 집계 |
| `tools/tests/event-fixtures.js` | 게임에 포함되지 않는 테스트 템플릿 6개 |
| `tools/tests/events.js` | 추첨·쿨다운·연쇄·약속·저장·재현성·시범경기·감사 실패 조건 검사 |
| `tools/test.js` | 이벤트 테스트 등록 |
| `qa/event-runtime.js` | 기존 QA 런타임을 이용하는 격리된 테스트 사본에 픽스처·관찰용 접근점 주입 |
| `qa/EVENTS_0.8_REPORT.md` | 이 보고서와 점검 출력 원문 |
| `qa/results/events/` | 명령별 출력 원문 (`test.txt`, `event_audit.txt`, `qa-all.txt`) |
| `qa/results/all/` | 전체 QA가 생성한 상세 결과 |

작업 중 다른 담당자가 추가한 `fm/05d-event-data.js`는 읽기만 했고, 빌드·감사에는 포함했다. `core.js`, HTML, `design/`, `fm/08-ui.js`는 수정하지 않았다. 별도 로스터 규정 작업이나 내보내기 테스트 추가, QA 사본 실행 체계 재구현은 하지 않았다.

## 동작과 연결

- `EVT_DATA`는 함수 호출 때 읽는다. 없으면 빈 목록으로 처리하고 기존 이벤트 어댑터를 사용한다. 같은 ID가 있으면 새 데이터가 우선한다.
- 기존 `offResolve`의 기록 메시지 흐름을 유지한다. 새 결정 메시지는 기존 받은편지함의 `due`/`def` 경로를 쓰며 기본 선택은 마지막 선택지다.
- 선수 객체는 선택지를 저장할 때 `{n,t}`로 바꾸며, 예약 도착 시 원래 키로 복원한다. 떠난 선수의 연쇄는 취소한다. `prev`에는 이전 ID·제목·선택지 문구·번호를 보존한다.
- 정규시즌에는 예약을 우선하고, 임의의 연속 10경기에 새 이벤트 결정이 1건을 넘지 않는다. 시범경기 무작위 추첨은 3경기마다 50%로 시도한다.
- 주 단위 예약은 스토브 → 캠프 → 시범경기 → 시즌 순서로 이어진다. 시범경기 주차는 3경기, 시즌 주차는 6경기 단위이며 대상 템플릿 단계보다 일찍 도착하지 않는다.
- 선발 출전은 기존 `prepareCfg`가 반환한 선발 타순과 경기 결과의 선발투수로 관찰한다. 경기 설정·결과 계산은 바꾸지 않는다.
- 약속 판정은 이벤트 상태에만 기록한다. 기존 FA 주전 보장용 `f.promises`는 별도로 유지한다.
- `FM.evtPromises()`는 `{who,label,kind,done,need,left}` 목록을 반환한다.

## 문맥 도우미 목록과 뜻

| 이름 | 뜻 |
| --- | --- |
| `year` | 현재 연도 |
| `stage` | `stove`, `camp`, `spring`, `season` 단계 |
| `rank` | 현재 정규시즌 순위, 시즌 전에는 보존한 전년 최종 순위. 이전 시즌이 없는 새 커리어는 초기 전력 순위 |
| `games` | 우리 팀이 치른 정규시즌 경기 수 |
| `streak` | 연승은 양수, 연패는 음수. 무승부에서 끊김 |
| `payroll` | 1·2군 계약을 합한 연봉 총액 |
| `budget` | 구단 연봉 예산 |
| `fans` | 팬 여론 |
| `conf` | 이사회 신뢰 |
| `mode` | 구단주 방향: `win`, `keep`, `rebuild`, 미선택 `null` |
| `roster()` | 우리 팀 1군 선수 목록 |
| `farm()` | 우리 팀 2군 선수 목록 |
| `all()` | 우리 팀 1·2군 선수 목록 |
| `find(fn)` | 조건을 만족하는 선수 중 OVR이 가장 높은 선수, 없으면 `null` |
| `ovr(p)` | 현재 종합 능력 |
| `pot(p)` | 잠재력 상한 |
| `age(p)` | 나이 |
| `sal(p)` | 연봉(억) |
| `yrs(p)` | 남은 계약 연수 |
| `isFarm(p)` | 2군 소속 여부 |
| `injured(p)` | 부상 여부 |
| `inLineup(p)` | 선발 타순 또는 선발 로테이션 포함 여부 |
| `benchRate(p)` | 최근 최대 20경기의 비선발 비율. 시즌 전에는 `1-주전여부` |
| `seasonLine(p)` | 시즌 기록 `{PA,AVG,OPS,HR,IP,ERA,G}`. 기록이 없으면 0 |
| `springLine(p)` | 같은 형식의 시범경기 기록 |
| `lastChoice(id)` | 마지막 선택지의 0부터 시작하는 번호, 기록이 없으면 `null` |
| `flag(k)` | 이벤트 플래그 값 |
| `promiseKept(key)` | 약속 이행 `true`, 위반 `false`, 미판정 `null` |
| `rng()` | 저장된 이벤트 씨앗으로 생성한 0 이상 1 미만 난수 |
| `josa(s)` | 기존 한글 조사 표기 정리 |

추가 문맥 도우미는 없다. 예약 이벤트에는 약속된 `c.prev={id,title,choice,i}`가 함께 제공된다. 선수 조회 도우미는 읽기 전용으로 사용하며 변경은 선택지의 `fx`로 표현한다.

## 점검 결과

- 테스트: 53 통과, 0 실패, 0 건너뜀.
- 이벤트 감사: 픽스처와 실제 데이터 각각 5개 커리어 × 5시즌, 동일 저장본 재실행 전부 통과. 실제 데이터 63종 등록; 커리어별 서로 다른 이벤트 47·40·45·44·46종(기존 어댑터 포함).
- 약속: 픽스처 이행 16 / 위반 1, 실제 데이터 이행 7 / 위반 28. 약속 위반 집계는 게임 내 판정이며 감사 실패가 아니다.
- 전체 QA: 61시즌, 위반 0건, 실패 0건. 정규시즌 47,892경기, 시범경기 468경기, 포스트시즌 950경기, 2군 9,588경기.
- 생성 파일 일치 검사 및 공백 오류 검사 통과.

## 점검 출력 원문

```text
$ node tools/build_fm.js
fm.js built from 22 parts, 421433 chars
$ node tools/build_fm.js --check
fm.js is up to date
```

```text
$ node tools/test.js
  coverage: 10 ties, 381 saves, 490 holds
PASS 720-game season: decisions, ER/R, charged runs and GS
  AVG = 0.2572
PASS league realism: AVG
  K% = 0.2086
PASS league realism: K%
  BB% = 0.0848
PASS league realism: BB%
  runs/team/game = 4.4250
PASS league realism: runs/team/game
PASS postseason: 300 games finish by inning 15
PASS defaultLineup: nine distinct roster batters and all positions
PASS pinchHit: removed batters never return; positions survive substitutions
PASS tactics baseline: 400 seeded games
  SH: default 20, often 534
PASS tactics bunt:often increases SH
  NP: default 109679, nibble 118808
PASS tactics bat:nibble increases NP
  attempts: default 647, aggr 1147
PASS tactics run:aggr increases attempts
PASS orderCmd('ibb'): next PA is IBB and credits the walk
PASS orderCmd('bunt'): SAC/FC/BUNT1B across 200 eligible situations
PASS career.js: browser script loads and every documented row has 16 fields
PASS farm.js: every club has a real 2군 squad with a rotation and nobody from the 1군
PASS familiarity: no data means a fully drilled plan
PASS familiarity: an unlearned running game steals less often and less well
PASS signs: an impossible sign is refused and leaves nothing behind
PASS signs: a manual steal is not replaced by an automatic bunt
PASS signs: squeeze with a runner on third scores or fails cleanly
PASS signs: every sign, forced at random for 400 games, keeps the box score valid
PASS manual pitching changes: coach advises, starter stays until the 130-pitch limit, simulated games unchanged
PASS pinch hit after the at-bat is prepared: the new batter bats and gets the PA
PASS pitching change after the at-bat is prepared: the new pitcher gets the batter
PASS two outs, error, home run: both runs unearned
PASS sacrifice fly is recorded and kept out of at-bats
PASS intentional walk throws no pitches
PASS Statcast: arsenal is deterministic, rating-sensitive, mirrored, and includes learned pitches
PASS Statcast: real arsenals cover listed pitchers, stay legal, and fix known errors
PASS Statcast: sequence codes, counts and lengths survive decoration changes without outcome RNG calls
PASS Statcast: contact geometry agrees with hits, outs, sacrifices, double plays and bunts
PASS Statcast: pitch weights react to count and terminal contact/strikeout
PASS Statcast: inclusive zone edges map to the inner 3x3 of the 5x5 grid
PASS Statcast: changing decoration seed/draw count preserves results, pitching changes and main RNG
PASS Statcast: real mergeNum sums all numeric keys across games; grids/sprays stay user-only
PASS potential: the game rule matches the review-sheet rule, stays in [OVR, 95], and rewards youth, trend and draft round
PASS trade values: control, age, potential, salary, position and pitcher workload
PASS packages: concentration, order independence and full bad-contract liability
PASS verdict: margin, protected stars, invalid rosters, stale proposals and actual execution
PASS AI trades: same-day idempotence, positive gains, legal rosters, user untouched, closed window
PASS events: migration preserves old FA promises and save-safe state
PASS events: seeded draws, cooldown, rare minimum and data precedence
PASS events: chain restores actor and previous choice; departed actors cancel
PASS events: starts counts starts, fails at deadline, pitcher starts and notrade opening
PASS events: active/callup progress, inbox last-option expiry, effects and replay
PASS events: regular delivery ceiling, no duplicate hook, stale pending cleanup
PASS events: spring cadence, weighted draw and weekly chain priority
PASS events: audit rejects cumulative, nested-branch and unknown effects
PASS fm.js matches its parts in fm/
PASS new career: all 10 clubs obey foreign, Asia and active roster limits
PASS HTML and design FM references exist in fm.js window.FM exports
PASS QA snapshot runs unchanged after original game sources are edited

53 passed, 0 failed, 0 skipped (24.21s)
```

```text
$ node tools/event_audit.js
fixtures career 1: appearances=48, distinct=17, replay=PASS
fixtures: 다양성 검사 건너뜀 (EVT_DATA 6종, 50종 미만)
fixtures career 2: appearances=48, distinct=17, replay=PASS
fixtures career 3: appearances=47, distinct=15, replay=PASS
fixtures career 4: appearances=48, distinct=16, replay=PASS
fixtures career 5: appearances=48, distinct=18, replay=PASS
fixtures id | appearances
feud | 17
foreign | 20
form | 18
injury | 15
intensity | 21
mentor | 19
newpitch | 17
posswitch | 8
raise | 18
rival | 16
star | 16
surprise | 1
test-camp | 3
test-check | 4
test-notrade | 12
test-season | 15
test-season-rare | 10
test-starts | 9
fixtures promises: kept=16, broken=1
fixtures: PASS (5 careers x 5 seasons, plus save replay)
EVT_DATA career 1: appearances=82, distinct=47, replay=PASS
EVT_DATA career 2: appearances=80, distinct=40, replay=PASS
EVT_DATA career 3: appearances=77, distinct=45, replay=PASS
EVT_DATA career 4: appearances=77, distinct=44, replay=PASS
EVT_DATA career 5: appearances=83, distinct=46, replay=PASS
EVT_DATA id | appearances
allstar-vote | 11
callup-buzz | 22
camp-arm-care | 10
camp-bullpen-to-rotation | 2
camp-catcher-work | 4
camp-homesick | 10
camp-injury-care | 4
camp-media-day | 6
camp-mentor | 5
camp-rain | 13
camp-rookie-shine | 3
camp-splitter | 3
camp-video-room | 2
camp-weight | 1
captain-vote | 8
charity-event | 8
closer-blown | 8
coach-poach | 3
deadline-push | 8
extension-talk | 2
fan-meeting | 6
feud | 8
foreign | 13
foreign-struggle | 5
form | 11
injury | 4
intensity | 4
mentor | 7
milestone | 5
military-plan | 7
newpitch | 6
notrade | 2
owner-budget-cut | 1
posswitch | 3
prospect-callup | 6
prospect-callup-check | 3
rain-rotation | 25
raise | 10
record-chase | 11
rival | 5
second-draft | 8
slump-hitter | 6
spring-ace-velo | 1
spring-last-spot | 2
spring-rookie-hot | 1
spring-rotation-test | 1
spring-scare | 14
spring-sellout | 6
spring-slump | 6
spring-surprise | 1
spring-surprise-check | 1
stadium-upgrade | 2
star | 11
summer-heat | 8
surprise | 1
trade-request | 15
trade-request-check | 9
winning-streak | 11
winter-abroad | 5
young-star-extension | 9
youth-clinic | 6
EVT_DATA promises: kept=7, broken=28
EVT_DATA: PASS (5 careers x 5 seasons, plus save replay)
event audit: PASS
```

```text
$ node qa/run.js --suite all
career 2026: 720 regular, 144 futures, 15 PS, 8.59s
career 2027: 720 regular, 144 futures, 15 PS, 12.70s
career 2028: 720 regular, 144 futures, 18 PS, 11.46s
career 2029: 720 regular, 144 futures, 14 PS, 10.88s
career 2030: 720 regular, 144 futures, 17 PS, 10.61s
career 2031: 720 regular, 144 futures, 16 PS, 11.60s
CASE spam-and-ten-games: {"name":"김도영","morale":{"before":65,"after":9.799999999999997},"blockedAt":[0,1,2,3,4,5,6,7,8,9],"promotedAt":10}
CASE injured-demotion: {"n":"황진호","injAfter3":0,"downUg":0}
CASE automatic-callup-cap: {"before":28,"after":28}
CASE automatic-callup-ten-game-guard: {"n":"김도영","stillFarm":true,"entry":28}
CASE release-bypasses-SP-and-minimums: {"pitchers":12,"SP":5}
CASE legal-trade-zero-pitchers-crash: {"uiEnabled":false,"counts":{"B":14,"P":12},"error":null}
CASE stale-trade-selection-free-player: {"outgoing":"김도영","incoming":"김진성","kept":true,"received":false}
CASE FA-bypasses-entry-cap: {"signed":["권진현","조지원"],"entry":28,"payroll":127.8,"budget":136}
CASE farm-contract-payroll: {"n":"나성범","salary":8,"payrollBefore":124.3,"payrollAfter":124.3,"yrsBefore":1,"yrsAfter":0}
CASE empty-farm: {"userGames":12,"futures":12,"temporaryRosterKeys":[]}
CASE futures-injury-deadlock: {"elapsed":12,"futures":12,"stuck":[{"n":"한승연","inj":0},{"n":"주효상","inj":0},{"n":"황대인","inj":0},{"n":"박종혁","inj":0},{"n":"한준희","inj":0},{"n":"이도훈","inj":0}]}
CASE opponent-farm-fatigue: {"opp":"LG","unchanged":false}
CASE potential-training-and-aging: {"training":{"n":"정현창","ticks":241,"initial":{"con":70,"pow":70,"eye":70,"spd":70,"fld":70,"arm":70},"learned":{"con":70,"pow":70,"eye":70,"spd":70,"fld":70,"arm":70},"pot":70},"aging":{"cohort":231,"exceeded":[]}}
CASE full-save-and-legacy: {"roundTripFutures":24,"legacyActive":265,"legacyFarm":298,"legacyNextUserGame":25}
CASE postseason-save-corruption: {"beforeMax":0,"afterMax":0,"roundFinished":false,"wins":null}
CASE render-tabs-and-refresh: {"tabs":11,"restoredGames":12}
CASE repeatability: {"sameState":true,"seed":20261105}
growth-0-light 2026: 720 regular, 144 futures, 15 PS, 6.70s
growth-0-light 2027: 720 regular, 144 futures, 15 PS, 8.64s
growth-0-light 2028: 720 regular, 144 futures, 15 PS, 8.00s
growth-0-light 2029: 720 regular, 144 futures, 13 PS, 7.63s
growth-0-light 2030: 720 regular, 144 futures, 14 PS, 7.92s
growth-0-normal 2026: 720 regular, 144 futures, 15 PS, 6.25s
growth-0-normal 2027: 720 regular, 144 futures, 14 PS, 8.39s
growth-0-normal 2028: 720 regular, 144 futures, 13 PS, 6.83s
growth-0-normal 2029: 720 regular, 144 futures, 13 PS, 8.54s
growth-0-normal 2030: 720 regular, 144 futures, 14 PS, 6.77s
growth-0-hard 2026: 720 regular, 144 futures, 17 PS, 5.93s
growth-0-hard 2027: 720 regular, 144 futures, 14 PS, 8.24s
growth-0-hard 2028: 720 regular, 144 futures, 16 PS, 8.39s
growth-0-hard 2029: 720 regular, 144 futures, 13 PS, 6.86s
growth-0-hard 2030: 720 regular, 144 futures, 14 PS, 8.17s
growth-1-light 2026: 720 regular, 144 futures, 15 PS, 5.53s
growth-1-light 2027: 720 regular, 144 futures, 18 PS, 9.23s
growth-1-light 2028: 720 regular, 144 futures, 15 PS, 7.81s
growth-1-light 2029: 720 regular, 144 futures, 15 PS, 9.01s
growth-1-light 2030: 720 regular, 144 futures, 15 PS, 7.43s
growth-1-normal 2026: 720 regular, 144 futures, 13 PS, 5.70s
growth-1-normal 2027: 720 regular, 144 futures, 17 PS, 7.66s
growth-1-normal 2028: 720 regular, 144 futures, 17 PS, 7.47s
growth-1-normal 2029: 720 regular, 144 futures, 18 PS, 7.96s
growth-1-normal 2030: 720 regular, 144 futures, 16 PS, 7.36s
growth-1-hard 2026: 720 regular, 144 futures, 16 PS, 6.63s
growth-1-hard 2027: 720 regular, 144 futures, 15 PS, 9.31s
growth-1-hard 2028: 720 regular, 144 futures, 18 PS, 8.06s
growth-1-hard 2029: 720 regular, 144 futures, 17 PS, 7.88s
growth-1-hard 2030: 720 regular, 144 futures, 15 PS, 9.51s
growth-2-light 2026: 720 regular, 144 futures, 17 PS, 7.21s
growth-2-light 2027: 720 regular, 144 futures, 14 PS, 9.29s
growth-2-light 2028: 720 regular, 144 futures, 16 PS, 7.84s
growth-2-light 2029: 720 regular, 144 futures, 12 PS, 9.31s
growth-2-light 2030: 720 regular, 144 futures, 17 PS, 7.71s
growth-2-normal 2026: 720 regular, 144 futures, 16 PS, 6.23s
growth-2-normal 2027: 720 regular, 144 futures, 15 PS, 9.29s
growth-2-normal 2028: 720 regular, 144 futures, 16 PS, 8.11s
growth-2-normal 2029: 720 regular, 144 futures, 14 PS, 6.80s
growth-2-normal 2030: 720 regular, 144 futures, 13 PS, 8.79s
growth-2-hard 2026: 720 regular, 144 futures, 16 PS, 6.36s
growth-2-hard 2027: 720 regular, 144 futures, 16 PS, 8.58s
growth-2-hard 2028: 720 regular, 144 futures, 14 PS, 7.64s
growth-2-hard 2029: 720 regular, 144 futures, 17 PS, 7.46s
growth-2-hard 2030: 720 regular, 144 futures, 14 PS, 8.17s
{"elapsedSeconds":555.0510688,"games":{"regular":47892,"spring":468,"postseason":950,"futures":9588},"seasons":61,"violations":{},"failures":0,"sourceFilesUnchanged":true,"out":"C:\\Users\\kimurasky\\Documents\\Codex\\kbo-work\\qa\\results\\all"}
```

## 제안

추가 기능 제안 없음.
