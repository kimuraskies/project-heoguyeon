/* Invite gate: log in with ID/PW, or sign up with ID/PW and the invite code, before the game
   starts. Accounts live in the Supabase project behind supabase/gate.sql: passwords are bcrypt-
   hashed in the database, sign-ups need an active invite code, and 10 wrong passwords lock an ID
   for 10 minutes. The browser keeps only a session token (30 days). Saves stay in this browser.
   The claude.ai preview can't reach outside servers, so the gate is off there. */
(function () {
  const API = 'https://tshwgeczwwslsoeygajz.supabase.co/rest/v1/rpc/';
  const KEY = 'sb_publishable_5v5mTgm-G5IEotu5lojHRA_6fhQjxQ0';
  const STORE = 'kbo-gate';
  let mode = 'login', busy = false, done = null;
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
  // run cb once the visitor is signed in; a stored session is re-checked, and an unreachable server
  // lets a known session through so the game still opens offline
  async function ensure(cb) {
    done = cb;
    const s = load();
    if (s && s.token) {
      try { const r = await rpc('gate_check', {p_token: s.token}); if (r && r.ok) return finish(s); save(null); }
      catch (e) { return finish(s); }
    }
    render();
  }
  function finish(s) {
    document.body.classList.remove('gate-on');
    const el = document.getElementById('gate'); if (el) el.remove();
    const who = document.getElementById('gate-who'); if (who) { who.textContent = s && s.id ? `로그아웃 (${s.id})` : '로그아웃'; who.closest('button').hidden = false; }
    const cb = done; done = null; if (cb) cb();
  }
  function render(msg) {
    let el = document.getElementById('gate');
    if (!el) { el = document.createElement('div'); el.id = 'gate'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'gate-title'); document.body.appendChild(el); }
    document.body.classList.add('gate-on');
    const tab = (m, l) => `<button type="button" class="${mode === m ? 'on' : ''}" onclick="Gate.mode('${m}')">${l}</button>`;
    el.innerHTML = `<div class="gate-card">
      <div class="gate-brand"><span class="gate-ball" aria-hidden="true">⚾</span><div><small>2026 / CLUB MANAGEMENT</small><h1 id="gate-title">KBO 매니저</h1></div></div>
      <p class="gate-lead">초대받은 감독만 입장할 수 있어요.</p>
      <div class="gate-tabs" role="tablist">${tab('login', '로그인')}${tab('join', '초대코드로 가입')}</div>
      <form onsubmit="event.preventDefault();Gate.submit(this)" autocomplete="on">
        <label>아이디<input name="id" autocomplete="username" required maxlength="16" placeholder="영문 소문자·숫자·_ 4~16자" autocapitalize="none" spellcheck="false"></label>
        <label>비밀번호<input name="pw" type="password" autocomplete="${mode === 'join' ? 'new-password' : 'current-password'}" required minlength="6" maxlength="72" placeholder="6자 이상"></label>
        ${mode === 'join' ? `<label>비밀번호 확인<input name="pw2" type="password" autocomplete="new-password" required minlength="6" maxlength="72"></label>
        <label>초대코드<input name="code" required maxlength="20" placeholder="받은 초대코드" autocapitalize="characters" spellcheck="false"></label>` : ''}
        ${msg ? `<div class="gate-msg" role="alert">${esc(msg)}</div>` : ''}
        <button class="gate-go" type="submit" ${busy ? 'disabled' : ''}>${busy ? '확인 중…' : mode === 'join' ? '가입하고 시작하기' : '로그인'}</button>
      </form>
      <p class="gate-note">${mode === 'join' ? '비밀번호는 암호화해서 저장돼요. 이메일 같은 개인정보는 받지 않아요.' : '아직 계정이 없다면 초대코드로 가입하세요.'}</p>
    </div>`;
    const f = el.querySelector('input[name=id]'); if (f && !msg) f.focus();
  }
  async function submit(form) {
    if (busy) return;
    const v = Object.fromEntries(new FormData(form).entries()), id = String(v.id || '').trim().toLowerCase();
    if (!/^[a-z0-9_]{4,16}$/.test(id)) return render('아이디는 영문 소문자·숫자·밑줄(_) 4~16자로 정해 주세요.');
    if (String(v.pw || '').length < 6) return render('비밀번호는 6자 이상이에요.');
    if (mode === 'join' && v.pw !== v.pw2) return render('비밀번호 확인이 일치하지 않아요.');
    if (mode === 'join' && !String(v.code || '').trim()) return render('초대코드를 입력해 주세요.');
    busy = true; render();
    try {
      const r = mode === 'join' ? await rpc('gate_register', {p_id: id, p_pw: v.pw, p_code: v.code})
                                : await rpc('gate_login', {p_id: id, p_pw: v.pw});
      busy = false;
      if (!r || !r.ok) return render(r && r.err || '다시 시도해 주세요.');
      const s = {token: r.token, id: r.id}; save(s); finish(s);
    } catch (e) { busy = false; render('서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.'); }
  }
  async function logout() {
    const s = load(); save(null);
    if (s && s.token) { try { await rpc('gate_logout', {p_token: s.token}); } catch (e) {} }
    location.reload();
  }
  window.Gate = {required, ensure, submit, logout, mode(m) { mode = m; render(); }};
})();
