/* Original neutral ticket-roundel; no club marks or proprietary lettering. */
(function (root) {
  'use strict';
  const teams = {
    KIA: '#ea0029', LG: '#c30452', '한화': '#fc4e00', SSG: '#ce0e2d',
    '삼성': '#074ca1', NC: '#315288', KT: '#000000', '롯데': '#041e42',
    '두산': '#1a1748', '키움': '#570514'
  };
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function teamBadge(teamId, color, size) {
    const label = Object.hasOwn(teams, teamId) ? teamId : 'TEAM';
    const fill = /^#[\da-f]{6}$/i.test(color || '') ? color : teams[label] || '#334155';
    const width = Number.isFinite(Number(size)) ? Math.max(24, Math.min(512, Number(size))) : 64;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${width}" viewBox="0 0 80 80" role="img" aria-label="${escape(label)} 구단 배지"><rect x="3" y="3" width="74" height="74" rx="25" fill="#111e30" stroke="#8294ac" stroke-width="1.5"/><path d="M18 13h44" stroke="${fill}" stroke-width="7" stroke-linecap="round"/><path d="M19 63h42" stroke="#8294ac" stroke-width="1"/><text x="40" y="47" text-anchor="middle" fill="#f5f8fc" font-family="system-ui,sans-serif" font-size="21" font-weight="750" letter-spacing="-.5">${escape(label)}</text></svg>`;
  }
  root.teamBadge = teamBadge;
  root.BADGE_TEAMS = Object.freeze(teams);
  if (typeof module !== 'undefined') module.exports = {teamBadge, teams};
})(typeof window === 'undefined' ? globalThis : window);
