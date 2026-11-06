'use strict';
// Feature checks use the real live-game entry points. --preview also emits
// static snapshots of relayHTML at phone/desktop widths into ignored results/.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {Runtime, ROOT, HTML} = require('./runtime');
const rt = new Runtime({observe:false}).start('KIA');
rt.eval("FM.setCamp('bal');FM.startSpring();App.nextGame();App.startMatch();Match.pause();");
const read = code => rt.eval(code);
const render = () => read("relayHTML(Match.game,Match.feed,Match)");
assert.match(render(), /pv-scene/);
assert.match(render(), /첫 투구 대기/);
let beats = 0;
while (beats++ < 1000 && !read('Match.ab?.committed && Match.ab.shown>=5')) read('Match.stepOne()');
assert.ok(beats < 1000, 'A completed real plate appearance with at least five pitches');
const completed = render();
assert.match(completed, /class="pv-pitchinfo"/, 'Pitch info sits under the scene');
assert.match(completed, /class="pv-log"/, 'The play-by-play log sits inside the comment box');
assert.match(completed, /sbd-linebox/, 'The linescore heads the right column');
assert.match(completed, /pv-marker-latest/);
assert.ok(!/NaN|undefined/.test(completed));
const original = read('JSON.stringify(Match.game)');
for (let i = 0; i < 25; i++) render();
assert.equal(read('JSON.stringify(Match.game)'),original,'Rendering cannot mutate simulation state');

read(`globalThis.pvFixture={
  game:{h:'KIA',a:'LG',score:{KIA:3,LG:2},inning:7,half:'bottom',outs:1},
  pitches:[{x:.33,y:.30,res:'S',velo:148,type:'직구'},{x:.67,y:.70,res:'B',velo:132,type:'슬라이더'}],
  opts:{offId:'KIA',defId:'LG',batName:'테스트',pitName:'투수',side:'우',pitSide:'우',batColor:'#e10a25',pitColor:'#333333',parkColor:'#e10a25',colors:PITCHCOLOR,labels:PITCHLABEL,count:{b:1,s:1}}
};`);
const fixture = () => read('PitchView.scene(pvFixture.game,pvFixture.pitches,pvFixture.opts)');
const first = fixture(), rerender = fixture();
assert.match(first, /pv-flight/);
assert.ok(!rerender.includes('pv-flight'), 'Pause/commentary rerenders must not replay a pitch');
assert.match(first, /M325\.1,343\.0L634\.9,343\.0L641\.3,627\.0L318\.7,627\.0Z/);
assert.match(first, /cx="325\.1" cy="343\.0"/, 'Upper-left zone pitch meets the projected zone');
assert.match(first, /cx="641\.3" cy="627\.0"/, 'Lower-right zone pitch meets the projected zone');
assert.match(first, /class="pv-zone-cell" data-cell="3-3"/, 'Inclusive bottom/right zone edge highlights the final cell');
assert.ok(first.indexOf('class="pv-batter"') < first.indexOf('class="pv-tracks"') &&
  first.indexOf('class="pv-tracks"') < first.indexOf('class="pv-markers"'), 'All tracks and numbers paint above the hitter');
const images = s => [...s.matchAll(/<image[^>]*href="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(images(first),images(rerender),'Static SVG art is cached across renders');
read("pvFixture.opts.side='좌';pvFixture.opts.batName='<테스트>&';");
const left = fixture();
assert.match(left, /data-side="좌"/);
assert.match(left, /&lt;테스트&gt;&amp;/);
assert.match(decodeURIComponent(images(left)[1]), /translate\(960 0\) scale\(-1 1\)/);
assert.ok(!/https?:\/\//.test(decodeURIComponent(images(left)[0]).replace('http://www.w3.org/2000/svg','')));
assert.equal(read("PitchView.result({committed:false,oc:'HR'},pvFixture.pitches[0],PITCHLABEL)"),'스트라이크','Uncommitted outcomes stay hidden');
// Each landing cell uses the same projection; a new ball outside the zone clears it.
for (let row=0;row<3;row++) for (let col=0;col<3;col++) {
  read(`pvFixture.pitches=[{res:'S',x:${.33+(col+.5)*.34/3},y:${.3+(row+.5)*.4/3}}];`);
  assert.ok(fixture().includes(`data-cell="${row+1}-${col+1}"`));
}
read("pvFixture.pitches=[{res:'S',x:.5,y:.5},{res:'B',x:.68,y:.5}];");
assert.ok(!fixture().includes('pv-zone-cell'), 'Only the newest pitch can highlight a zone cell');
read("pvFixture.pitches=[{res:'B',x:0,y:0},{res:'B',x:1,y:1}];");
for (const m of fixture().matchAll(/class="pv-marker-disc" cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)) {
  const [x,y,r]=m.slice(1).map(Number);
  assert.ok(x-r>=0 && x+r<=960 && y-r>=0 && y+r<=760, 'Even extreme balls keep their complete numbered marker in the frame');
}
read("pvFixture.pitches=[{res:'IBB',type:'고의4구',velo:0,x:.5,y:.5}];");
assert.ok(!fixture().includes('data-pitch="'),'Intentional walks have no plotted pitch');
assert.ok(!fixture().includes('pv-zone-cell'),'Intentional walks have no highlighted cell');
const walk = read('pitchList(pvFixture.pitches)');
assert.match(walk,/고의4구/);
assert.match(walk,/종료/);
assert.match(walk,/0구 · 최신순/);
const foul = read("pitchList([{res:'S',velo:145,type:'직구'},{res:'F',velo:143,type:'직구'},{res:'F',velo:138,type:'슬라이더'},{res:'B',velo:130,type:'체인지업'}])");
assert.match(foul,/1 − 2/,'Two-strike fouls do not increase the strike count');
const started = performance.now();
for(let i=0;i<200;i++)fixture();
console.log('Pitch view checks passed; cached render average '+((performance.now()-started)/200).toFixed(3)+' ms');

if(process.argv.includes('--preview')){
  const out = path.join(__dirname,'results','pitchview');fs.mkdirSync(out,{recursive:true});
  const source = fs.readFileSync(path.join(ROOT,HTML),'utf8');
  const head = source.slice(source.indexOf('<head>')+6,source.indexOf('</head>'));
  const snapshot = body => '<!doctype html><html lang="ko" data-team="KIA"><head><base href="../../../">'+head+'</head><body><div id="relay" class="matchpage"><div class="mp-wrap">'+body.replace(/\s+on\w+="[^"]*"/g,'').replace(/<(button|select)\b/g,'<$1 disabled')+'</div></div></body></html>';
  fs.writeFileSync(path.join(out,'desktop.html'),snapshot(completed));
  read("globalThis.pvOldName=Match.ab.batName;Match.ab.batName=K.ROSTERS[Match.ab.off].batters.find(p=>batSide(p.n,Match.ab.pitName)==='우').n;");
  fs.writeFileSync(path.join(out,'phone-right.html'),snapshot(render()));
  // Same actual live page with a left-handed batter selected only for the visual fixture.
  read("Match.ab.batName=K.ROSTERS[Match.ab.off].batters.find(p=>batSide(p.n,Match.ab.pitName)==='좌').n;");
  fs.writeFileSync(path.join(out,'phone.html'),snapshot(render()));
  read('Match.ab.batName=pvOldName;');
  fs.writeFileSync(path.join(out,'review.html'),`<!doctype html><html><meta charset="utf-8"><title>Pitch view · local visual review</title><style>body{margin:0;background:#090f17;color:#c6d3df;font:14px system-ui}header{padding:12px 20px}main{display:flex;gap:20px;padding:0 20px;align-items:start}iframe{border:1px solid #3c4758;height:1100px;display:block}h3{font-size:12px;font-weight:500}</style><header>Original pitch-view art · real relayHTML snapshots · static review, controls are inactive</header><main><section><h3>375px / right-handed (screen left)</h3><iframe title="375 pixel right-handed phone" src="phone-right.html" width="375"></iframe><h3>375px / left-handed (screen right)</h3><iframe title="375 pixel left-handed phone" src="phone.html" width="375"></iframe></section><section><h3>1280px / actual plate appearance</h3><iframe title="1280 pixel desktop" src="desktop.html" width="1280"></iframe></section></main></html>`);
  console.log('Preview: /qa/results/pitchview/review.html');
}
