// Pull pitch mixes for KBO pitchers who threw in MLB or AAA (Statcast-tracked), from the public MLB Stats API.
// usage: node tools/fetch_arsenal_mlb.js > data/arsenal-mlb.json
// Each entry: kbo name -> {mlbId, season, level, pitches:[[code, share, mph]]}. Latest season with >= 250 tracked pitches wins.
const IDS = {
  '잭로그':656657, '벤자민':605138, '대니엘':669721, '보쉴리':676961, '사우어':669422, '로건':671106,
  '카라스코':471911, '후라도':642558, '베니지아노':685107, '해치':641672,
  '로드리게스':660730, '비슬리':676886, '라일리':663929, '테일러':668954, '류현진':547943,
  '플렉센':623167, '치리노스':630023, '로젠버그':670046, '클레빈저':605182, '버하겐':572403, '와일스':621079,
  '페덱':663978, '화이트':669391, '에르난데스':665859
};
const get = u => fetch(u).then(r => r.json());
(async () => {
  const out = {};
  for (const [name, id] of Object.entries(IDS)) {
    let best = null;
    for (let y = 2025; y >= 2019 && !best; y--) for (const sp of [1, 11]) {
      const j = await get(`https://statsapi.mlb.com/api/v1/people/${id}/stats?stats=pitchArsenal&group=pitching&season=${y}&sportId=${sp}`);
      const sp_ = ((j.stats || [])[0] || {}).splits || [];
      const tot = sp_.length ? sp_[0].stat.totalPitches : 0;
      if (tot >= 250) { best = {mlbId: id, season: y, level: sp === 1 ? 'MLB' : 'AAA', total: tot,
        pitches: sp_.map(s => [s.stat.type.code, Math.round(s.stat.percentage * 1000) / 1000, Math.round(s.stat.averageSpeed * 1.609)]).sort((a, b) => b[1] - a[1])}; break; }
    }
    out[name] = best;
  }
  console.log(JSON.stringify(out, null, 1));
})();
