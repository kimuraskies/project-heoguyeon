'use strict';
const fs=require('fs'), path=require('path');
const {Runtime} = require('../../qa/runtime');
// 0.82 immersion fixes (docs/immersion-plan-1122.md)
module.exports = ({assert,test}) => {
  test('play-by-play: hit and home-run directions follow the batted-ball angle', () => {
    const h=new Runtime({observe:false}).start('KIA');
    const out=h.eval(`(()=>{ const zone={L:'좌측',LC:'좌중간',C:'가운데',RC:'우중간',R:'우측'}, res={hr:0,bad:0,noBB:0};
      for(let i=0;i<40;i++){ const g=new K.InteractiveGame(buildCfg('KIA'),buildCfg('LG'),{maxInnings:9}); let n=0;
        while(!g.over&&n++<3000){ const ev=g.step(); if(!ev||ev.oc!=='HR') continue; res.hr++; if(!ev.bb){ res.noBB++; continue; }
          const t=Comm.result(g,{flavor:'any'},ev).t, want=zone[bbZone(ev.bb)]; if(t.indexOf(want+' 담장')<0) res.bad++; } }
      return res; })()`);
    assert.ok(out.hr>10,'enough home runs to check: '+out.hr);
    assert.equal(out.noBB,0,'every home run carries its batted ball');
    assert.equal(out.bad,0,'home-run call matches the angle');
  });
  test('no quoted lines put in the mouths of named players or coaches', () => {
    const dir=path.join(__dirname,'..','..','fm'), bad=[];
    for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js'))){ const s=fs.readFileSync(path.join(dir,f),'utf8');
      s.split('\n').forEach((l,i)=>{ if(/\$\{[\w.]*\.n\}: \\?"|\$\{n\}: "|수석코치: "/.test(l)) bad.push(f+':'+(i+1)); }); }
    assert.deepEqual(bad,[],'quoted lines found');
  });
  test('trade revisit: logged trades keep season WAR at the moment of the trade, revisits say 이적 후', () => {
    const h=new Runtime({observe:false}).start('KIA'); h.FM.quickStart(); for(let k=0;k<20&&h.state.phase==='regular';k++){ h.App.simRest(); h.FM.answer(); }
    const log=(h.state.fm.tradeLog||[]).filter(e=>e.phase==='regular');
    assert.ok(log.length>0,'some in-season trades happened');
    for(const e of log) for(const s of e.aGive.concat(e.bGive)) assert.ok(Number.isFinite(s.war0),'war0 on '+s.n);
    const rev=(h.state.fm.feed||[]).filter(x=>/다시 보는 트레이드/.test(x.title));
    for(const x of rev) assert.ok(x.body.includes('이적 후'),'revisit counts only after the trade');
  });
};
