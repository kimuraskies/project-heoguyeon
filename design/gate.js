/* Invite gate. For now visitors enter with the invite code alone (gate_enter); the ID/PW
   sign-up and login (gate_register / gate_login) stay on the server for later. Before that, the game
   started Accounts live in the Supabase project behind supabase/gate.sql: passwords are bcrypt-
   hashed in the database, sign-ups need an active invite code, and 10 wrong passwords lock an ID
   for 10 minutes. The browser keeps the session token for good. Saves stay in this browser.
   The claude.ai preview can't reach outside servers, so the gate is off there. */
(function () {
  const API = 'https://tshwgeczwwslsoeygajz.supabase.co/rest/v1/rpc/';
  const KEY = 'sb_publishable_5v5mTgm-G5IEotu5lojHRA_6fhQjxQ0';
  const STORE = 'kbo-gate';
  let busy = false, done = null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } };
  const save = v => { try { v ? localStorage.setItem(STORE, JSON.stringify(v)) : localStorage.removeItem(STORE); } catch (e) {} };
  function required() {
    if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol || '')) return false;
    return !/claude\.ai|claudeusercontent|claude\.site/.test(location.host || '');
  }
  async function rpc(fn, body) {
    const r = await fetch(API + fn, {method: 'POST', headers: {apikey: KEY, 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  // run cb once the visitor has entered
  async function ensure(cb) {
    done = cb;
    const s = load();
    // once this device has entered, the gate never asks again (no server round trip); only
    // 설정 → 로그아웃 or cleared browser data brings it back
    // a device that has entered before still sees the title, with one button instead of the code box
    render(null, s && s.token ? s : null);
  }
  function enter() { const s = load(); if (s && s.token) finish(s); else render(); }
  function finish(s) {
    document.body.classList.remove('gate-on');
    const el = document.getElementById('gate'); if (el) el.remove();
    const who = document.getElementById('gate-who'); if (who) { who.textContent = s && s.id ? `로그아웃 (${s.id})` : '로그아웃'; who.closest('button').hidden = false; }
    const cb = done; done = null; if (cb) cb();
  }
  function render(msg, back) {
    let el = document.getElementById('gate');
    if (!el) { el = document.createElement('div'); el.id = 'gate'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'KBO 매니저 입장'); document.body.appendChild(el); }
    document.body.classList.add('gate-on');
    if (window.Track) Track.screen('gate');
    if (back) { el.innerHTML = `<div class="gate-panel gate-back"><button class="gate-go gate-enter" type="button" onclick="Gate.enter()">접속하기</button>
        <p class="gate-note">이 기기는 이미 초대코드를 확인했어요.<br><small>비영리 팬 프로젝트예요. KBO와 구단의 공식 게임이 아니에요.</small></p></div>`; const b = el.querySelector('.gate-enter'); if (b) b.focus(); return; }
    el.innerHTML = `<form class="gate-panel" onsubmit="event.preventDefault();Gate.submit(this)">
        <label for="gate-code">초대코드</label>
        <div class="gate-row"><input id="gate-code" name="code" required maxlength="20" placeholder="초대코드 입력" autocapitalize="characters" autocomplete="off" spellcheck="false">
          <button class="gate-go" type="submit" ${busy ? 'disabled' : ''}>${busy ? '확인 중…' : '입장하기'}</button></div>
        ${msg ? `<div class="gate-msg" role="alert">${esc(msg)}</div>` : '<p class="gate-note">초대받은 감독만 입장할 수 있어요.<br><small>비영리 팬 프로젝트예요. KBO와 구단의 공식 게임이 아니에요.<br>더 나은 게임을 위해 익명 이용 기록(접속, 화면 이동, 진행 상황)을 모아요. 입장 후 설정 → 옵션에서 끌 수 있어요.</small></p>'}
      </form>`;
    const f = el.querySelector('#gate-code'); if (f && !msg) f.focus();
  }
  async function submit(form) {
    if (busy) return;
    const code = String(new FormData(form).get('code') || '').trim();
    if (!code) return render('초대코드를 입력해 주세요.');
    busy = true; render();
    try {
      const r = await rpc('gate_enter', {p_code: code});
      busy = false;
      if (!r || !r.ok) return render(r && r.err || '다시 시도해 주세요.');
      const s = {token: r.token, id: r.id || null}; save(s); finish(s);
    } catch (e) { busy = false; render('서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.'); }
  }
  async function logout() {
    const s = load(); save(null);
    if (s && s.token) { try { await rpc('gate_logout', {p_token: s.token}); } catch (e) {} }
    location.reload();
  }
  window.Gate = {required, ensure, submit, logout, enter};
})();
