/* Anonymous play tracking, so we can see how many people play, whether they come back and how
   far they get. Each browser gets a random device id; nothing personal (no name, e-mail or save
   contents) is sent. Rows go to the Supabase `events` table, which the public key can only insert
   into (supabase/usage.sql). Off in the claude.ai preview, on local test servers and file://.
   Events: open (game loaded), career (new career started), play (progress while playing, at most
   one every 10 minutes), season (a season finished). */
(function () {
  const URL_ = 'https://tshwgeczwwslsoeygajz.supabase.co/rest/v1/events';
  const KEY = 'sb_publishable_5v5mTgm-G5IEotu5lojHRA_6fhQjxQ0';
  const DEV = 'kbo-device', PLAY_EVERY = 10 * 60 * 1000;
  let lastPlay = 0;
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
    if (!enabled()) return;
    const d = device(); if (!d) return;
    try {
      fetch(URL_, {method: 'POST', keepalive: true,
        headers: {apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal'},
        body: JSON.stringify({device: d, kind, data: Object.assign(snapshot(), extra || {})})}).catch(() => {});
    } catch (e) {}
  }
  function play() {
    const now = Date.now();
    if (now - lastPlay < PLAY_EVERY) return;
    lastPlay = now; send('play');
  }
  window.Track = {open: () => send('open', {w: typeof innerWidth === 'number' ? innerWidth : null}), career: () => { lastPlay = Date.now(); send('career'); }, play, season: () => send('season'), enabled};
})();
