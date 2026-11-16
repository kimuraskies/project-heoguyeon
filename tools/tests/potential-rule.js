'use strict';
// The potential rule, as a pure function. fm/00-core.js potentialOf() must give the same numbers
// (tools/tests/potential.js checks it); tools/build_potential.js uses this one for the review sheet.
//   room by age: <=20 16, 21 14, 22 12, 23 10, 24 8, 25 6, 26 4, 27 3, 28 2, 29 1, 30+ 0
//   + growth trend (2026 against 2024-25, -4..+4) while he is 30 or younger
//   + draft round for this year's rookies: 1R +6, 2R +4, 3R +2
//   + a small fixed per-player spread (-1..+1) for 24 and under, so a class is not all one number
//   potential = OVR + room, never below OVR, at most 95
const ROOM = [16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 14, 12, 10, 8, 6, 4, 3, 2, 1];
function hash(s){ let h=7; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return h; } // as fm/00-core.js
function potentialRule({name = '', age, ovr, trend = 0, round = null}) {
  const base = age < ROOM.length ? ROOM[age] : 0;
  const tr = age <= 30 ? trend : 0;
  const dr = round === 1 ? 6 : round === 2 ? 4 : round === 3 ? 2 : 0;
  const spread = age <= 24 ? hash(name + 'p') % 3 - 1 : 0;
  const room = Math.max(0, base + tr + dr + spread);
  return {pot: Math.min(95, Math.max(ovr, ovr + room)), parts: {age: base, trend: tr, draft: dr, spread}};
}
module.exports = {potentialRule};
