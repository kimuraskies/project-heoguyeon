/* Anonymous play tracking, so we can see how many people play, whether they come back and how
   far they get. Each browser gets a random device id; nothing personal (no name, e-mail or save
   contents) is sent. Rows go to the Supabase `events` table, which the public key can only insert
   into (supabase/usage.sql). Off in the claude.ai preview, on local test servers and file://.
   Events: open (game loaded, after any restore), career (new career started), play (progress while
   playing, at most one every 10 minutes), season (a season finished), screen (screen changed),
   action (a named step such as pick_club or quick_start), match (start / end / commit of a watched
   game), leave (page hidden or closed: last screen and seconds visible). Every row also carries a
   random per-load session id, the game version and a sequence number. */
(function () {
  const URL_ = 'https://tshwgeczwwslsoeygajz.supabase.co/rest/v1/events';
  const KEY = 'sb_publishable_5v5mTgm-G5IEotu5lojHRA_6fhQjxQ0';
  const DEV = 'kbo-device', PLAY_EVERY = 10 * 60 * 1000, VERSION = '2026.11.09', MAX_EVENTS = 400;
  const SID = Math.random().toString(36).slice(2, 10);
  let lastPlay = 0, seq = 0, curScreen = null, visibleSince = Date.now(), visibleSec = 0, lastLeave = 0;
  function enabled() {
    if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol || '')) return false;
    const h = location.hostname || '';
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(h) || /\.(localhost|test)$/.test(h)) return false;
    return !/claude\.ai|claudeusercontent|claude\.site/.test(location.host || '');
  }
  function device() {
    try {
      let d = localStorage.getItem(DEV);
      if (!d) { d = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)); localStorage.setItem(DEV, d); }
      return d;
    } catch (e) { return null; }
  }
  // where this career stands: club, season, phase, games the club has played this season
  function snapshot() {
    const s = typeof state !== 'undefined' && state ? state : null;
    if (!s) return {};
    const team = typeof USER !== 'undefined' ? USER : null;
    const gp = typeof teamGameCount !== 'undefined' && team ? teamGameCount[team] : null;
    return {team, year: s.year, phase: s.phase, gp: typeof gp === 'number' ? gp : null};
  }
  function send(kind, extra) {
    if (!enabled() || seq >= MAX_EVENTS) return;
    const d = device(); if (!d) return;
    seq++;
    try {
      fetch(URL_, {method: 'POST', keepalive: true,
        headers: {apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal'},
        body: JSON.stringify({device: d, kind, data: Object.assign(snapshot(), {sid: SID, v: VERSION, n: seq}, extra || {})})}).catch(() => {});
    } catch (e) {}
  }
  function play() {
    const now = Date.now();
    if (now - lastPlay < PLAY_EVERY) return;
    lastPlay = now; send('play');
  }
  function screen(name) { if (name === curScreen) return; curScreen = name; send('screen', {name}); }
  function action(name, extra) { send('action', Object.assign({name}, extra || {})); }
  function match(stage, extra) { send('match', Object.assign({stage}, extra || {})); }
  function leave() {
    const now = Date.now();
    visibleSec += Math.max(0, (now - visibleSince) / 1000); visibleSince = now;
    if (now - lastLeave < 60000) return;
    lastLeave = now;
    send('leave', {screen: curScreen, sec: Math.round(visibleSec)});
  }
  if (enabled() && typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leave(); else visibleSince = Date.now(); });
    addEventListener('pagehide', leave);
  }
  window.Track = {open: restored => send('open', {w: typeof innerWidth === 'number' ? innerWidth : null, restored: !!restored}), career: () => { lastPlay = Date.now(); send('career'); }, play, season: () => send('season'), screen, action, match, enabled};
})();
