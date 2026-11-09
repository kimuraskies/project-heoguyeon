/* User feedback: a form in the header settings menu. Feedback is anonymous (an optional nickname,
   no email) and goes to a Supabase table that only accepts inserts. Game context (version,
   screen, season, club, viewport size) is attached so reports can be reproduced. If sending fails
   (offline, or a host that blocks outside requests), the draft stays in this browser. */
(function () {
  // Supabase project (Project-KBOMANAGER). The publishable key is meant to ship in client code:
  // row-level security lets it insert feedback but never read it (supabase/feedback.sql).
  const CFG = {url: 'https://tshwgeczwwslsoeygajz.supabase.co', key: 'sb_publishable_5v5mTgm-G5IEotu5lojHRA_6fhQjxQ0'};
  const VERSION = '2026.11.06';
  const KINDS = [['bug', '🐞 버그'], ['idea', '💡 제안'], ['praise', '👏 칭찬'], ['etc', '💬 기타']];
  const DRAFT = 'kbo-feedback-draft', LAST = 'kbo-feedback-last';
  let form = {kind: 'idea', stars: 0, text: '', nick: ''}, sending = false;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const store = {get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} }};
  function context() {
    const s = typeof state !== 'undefined' && state ? state : null;
    return {version: VERSION, screen: typeof currentTab !== 'undefined' ? currentTab : null,
      year: s && s.year, phase: s && s.phase, team: typeof USER !== 'undefined' ? USER : null,
      viewport: innerWidth + 'x' + innerHeight, host: location.host};
  }
  function open() {
    if (window.Track) Track.action('feedback_open');
    try { const d = JSON.parse(store.get(DRAFT) || 'null'); if (d && d.text) form = Object.assign(form, d); } catch (e) {}
    render();
  }
  function render(msg) {
    const kinds = KINDS.map(([k, l]) => `<button type="button" class="${form.kind === k ? 'active' : ''}" onclick="Feedback.set('kind','${k}')">${l}</button>`).join('');
    const stars = [1, 2, 3, 4, 5].map(n => `<button type="button" class="fb-star${n <= form.stars ? ' on' : ''}" aria-label="${n}점" onclick="Feedback.set('stars',${n})">★</button>`).join('');
    const body = `<span class="closeX" onclick="App.closeModal()" role="button" tabindex="0" aria-label="닫기">×</span>
      <h2>💬 유저 피드백</h2>
      <div class="hint">버그, 아이디어, 하고 싶은 말을 남겨 주세요. 익명으로 전송되며 이메일 같은 개인정보는 받지 않습니다.</div>
      <form class="fb-form" onsubmit="event.preventDefault();Feedback.send()">
        <div class="fb-row"><span class="fb-l">종류</span><div class="tabsm" style="margin:0">${kinds}</div></div>
        <div class="fb-row"><span class="fb-l">만족도</span><div class="fb-stars">${stars}<small>${form.stars ? form.stars + ' / 5' : '선택 사항'}</small></div></div>
        <label class="fb-l" for="fb-text">내용</label>
        <textarea id="fb-text" maxlength="1000" rows="6" required placeholder="${form.kind === 'bug' ? '어떤 화면에서, 무엇을 했을 때, 어떻게 됐는지 적어 주시면 고치기 쉬워요.' : '자유롭게 적어 주세요.'}" oninput="Feedback.set('text',this.value,true)">${esc(form.text)}</textarea>
        <div class="fb-count"><span id="fb-n">${form.text.length}</span> / 1000</div>
        <label class="fb-l" for="fb-nick">닉네임 <small>(선택)</small></label>
        <input id="fb-nick" maxlength="20" value="${esc(form.nick)}" placeholder="비워 두면 익명" oninput="Feedback.set('nick',this.value,true)">
        <div class="hint" style="margin-top:8px">함께 전송: 게임 버전 ${VERSION}, 현재 화면, 시즌·구단, 화면 크기</div>
        ${msg ? `<div class="fb-msg ${msg.ok ? 'ok' : 'err'}" role="status">${msg.t}</div>` : ''}
        <div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px">
          <button type="button" class="btn" onclick="App.closeModal()">닫기</button>
          <button type="submit" class="btn primary" ${sending ? 'disabled' : ''}>${sending ? '보내는 중…' : '보내기'}</button></div>
      </form>`;
    const m = document.querySelector('.modal-bg .fb-form');
    if (m) m.closest('.modal').innerHTML = body; else modal(body);
    const ta = document.getElementById('fb-text'); if (ta && !msg) ta.focus();
  }
  function set(k, v, quiet) {
    form[k] = v; store.set(DRAFT, JSON.stringify(form));
    if (k === 'text') { const n = document.getElementById('fb-n'); if (n) n.textContent = v.length; }
    if (!quiet) render();
  }
  async function send() {
    const text = (form.text || '').trim();
    if (text.length < 5) return render({ok: false, t: '내용을 5자 이상 적어 주세요.'});
    const last = +store.get(LAST) || 0;
    if (Date.now() - last < 60000) return render({ok: false, t: '방금 보내셨어요. 1분 뒤에 다시 보낼 수 있어요.'});
    if (!CFG.url || !CFG.key) return render({ok: false, t: '피드백 서버가 아직 연결되지 않았어요. 작성한 내용은 이 브라우저에 저장해 둘게요.'});
    sending = true; render();
    try {
      const r = await fetch(CFG.url.replace(/\/$/, '') + '/rest/v1/feedback', {method: 'POST',
        headers: {'apikey': CFG.key, 'Content-Type': 'application/json', 'Prefer': 'return=minimal'},
        body: JSON.stringify({kind: form.kind, stars: form.stars || null, body: text, nickname: (form.nick || '').trim() || null, context: context()})});
      if (!r.ok) throw new Error('HTTP ' + r.status);
      store.set(LAST, String(Date.now())); store.del(DRAFT);
      if (window.Track) Track.action('feedback_sent');
      form = {kind: form.kind, stars: 0, text: '', nick: form.nick}; sending = false;
      render({ok: true, t: '고마워요! 피드백이 전달됐어요. 🙌'});
    } catch (e) {
      sending = false;
      render({ok: false, t: `보내지 못했어요 (${esc(e.message)}). 작성한 내용은 이 브라우저에 남겨 뒀어요. 공개 사이트 kbo-manager-2026.vercel.app 에서 다시 보내 주세요.`});
    }
  }
  window.Feedback = {open, set, send, config: CFG};
})();
