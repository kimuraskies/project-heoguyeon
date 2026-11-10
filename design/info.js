/* Options, notices and the information pages: what this project is, what it records, where the
   data comes from, and how saves work. Opened from the header (공지, 설정 → 옵션 · 정보). */
(function () {
  const TRACK_OFF = 'kbo-track-off', SEEN = 'kbo-notice-seen';
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
  // newest first. id is the date; the header dot shows until the newest one has been opened
  const NOTICES = [
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
      <p>옵션에서 <b>이용 기록 수집</b>을 끄면 그 뒤로는 기록을 보내지 않아요.</p>`],
    data: ['데이터와 라이선스', `<p>선수 기록은 KBO 공식 기록실(koreabaseball.com)의 2026 정규시즌 공개 기록을 바탕으로 했어요. 능력치는 그 기록을 게임 엔진에 맞게 환산한 근사값이고, 실제 선수의 기량 평가가 아니에요.</p>
      <p>코칭스태프는 2026 개막 시점 KBO 등록 현황 기준이에요. 코치 능력치는 현역 시절 기록과 나이로 추정한 게임용 수치예요. 보직은 게임에서 임의로 나눈 것이라 실제와 다를 수 있어요.</p>
      <p>경기 결과, 기사, 인터뷰, 트레이드는 모두 게임이 만든 가상의 내용이에요.</p>`],
    howto: ['게임 방법', `<ul><li><b>오른쪽 위 버튼</b>이 언제나 다음 할 일이에요. 모르겠으면 이것만 눌러도 시즌이 진행돼요.</li>
      <li>스토브리그 → 스프링캠프 4주 → 시범경기 → 정규시즌 144경기 → 포스트시즌 순서예요.</li>
      <li>경기는 직접 보거나(중계) 건너뛸 수 있어요. 중계에서는 투수·야수 교체와 작전 사인을 낼 수 있어요.</li>
      <li>받은편지함의 결정은 미뤄도 돼요. 기한이 지나면 기본값으로 처리돼요.</li>
      <li>세이브는 자동이에요. 다만 이 브라우저에만 저장되니 가끔 세이브 파일을 받아 두세요.</li></ul>`]
  };
  const X = '<button type="button" class="closeX" onclick="App.closeModal()" aria-label="닫기">×</button>';
  // one dialog at a time: the game's modal() stacks
  function show(html) { App.closeModal(); modal(html); }
  function trackOn() { return get(TRACK_OFF) !== '1'; }
  function setTrack(on) { set(TRACK_OFF, on ? null : '1'); options(); }
  function unseen() { return get(SEEN) !== NOTICES[0].id; }
  function dot() { const d = document.getElementById('notice-dot'); if (d) d.hidden = !unseen(); }
  function notices() {
    set(SEEN, NOTICES[0].id); dot();
    show(`${X}<h2>공지사항</h2>${NOTICES.map(n => `<section class="info-note"><small>${n.id}</small><h3>${n.t}</h3><ul>${n.b.map(x => `<li>${x}</li>`).join('')}</ul></section>`).join('')}`);
  }
  function page(k) { const p = PAGES[k]; if (!p) return; show(`${X}<h2>${p[0]}</h2><div class="info-page">${p[1]}</div><div class="row" style="margin-top:12px"><button class="btn" onclick="Info.options()">옵션으로</button></div>`); }
  function options() {
    const row = (t, d, btn) => `<div class="opt-row"><div><b>${t}</b><small>${d}</small></div>${btn}</div>`;
    const inGame = typeof state !== 'undefined' && state && typeof USER !== 'undefined' && USER;
    show(`${X}<h2>옵션 · 정보</h2>
      ${row('이용 기록 수집', '익명 기록만 모아요. 끄면 보내지 않아요.', `<button class="btn${trackOn() ? ' primary' : ''}" role="switch" aria-checked="${trackOn()}" onclick="Info.setTrack(${!trackOn()})">${trackOn() ? '켜짐' : '꺼짐'}</button>`)}
      ${row('세이브 관리', '세이브는 이 브라우저에만 저장돼요. 브라우저 데이터를 지우면 사라지니 파일로 받아 두세요.', `<button class="btn" onclick="App.saves()">열기</button>`)}
      ${inGame ? row('업무 분담', '코치에게 맡길 일을 정해요.', `<button class="btn" onclick="FM.delegPicker()">열기</button>`) : ''}
      ${row('게임 방법', '진행 순서와 기본 조작', `<button class="btn" onclick="Info.page('howto')">보기</button>`)}
      ${row('공지사항', '업데이트 내역과 안내', `<button class="btn" onclick="Info.notices()">보기</button>`)}
      ${row('의견 보내기', '버그, 아이디어, 제휴 제안', `<button class="btn" onclick="App.closeModal();Feedback.open()">열기</button>`)}
      <h4 class="st-group">정보</h4>
      <div class="opt-links"><button class="btn" onclick="Info.page('about')">프로젝트 소개</button><button class="btn" onclick="Info.page('privacy')">이용 기록과 개인정보</button><button class="btn" onclick="Info.page('data')">데이터와 라이선스</button></div>
      <p class="hint" style="margin-top:12px">KBO 매니저는 비영리 팬 프로젝트이며 KBO와 구단의 공식 게임이 아니에요.</p>`);
  }
  window.Info = {notices, options, page, setTrack, trackOn, dot};
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('DOMContentLoaded', dot);
})();
