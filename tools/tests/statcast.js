'use strict';
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const {config,schedule,finish}=require('./helpers');
module.exports=({K,assert,test,seed})=>{
  const codes=K.PITCH_TYPES.map(t=>t.code);
  test('Statcast: arsenal is deterministic, rating-sensitive, mirrored, and includes learned pitches',()=>{
    const pit={...K.getP('KIA',config('KIA').spName),hand:'우'}, expected=K.arsenal(pit), original=Math.random;
    try{
      Math.random=()=>{throw new Error('arsenal must not consume the outcome RNG');};
      assert.deepEqual(K.arsenal({...pit}),expected);
      assert.deepEqual(K.repertoire(pit),expected);
      const learned=K.arsenal({...pit,np:K.PITCH_TYPES.map(t=>t.k)});
      assert.equal(learned.length,9); assert.equal(new Set(learned.map(t=>t.code)).size,9);
      for(const a of [expected,learned]){
        assert.ok(Math.abs(a.reduce((n,p)=>n+p.use,0)-1)<1e-12);
        assert.ok(a[0].use>=.35&&a[0].use<=.55);
        for(const p of a) for(const k of ['use','velo','hb','vb','whiff','zone']) assert.ok(Number.isFinite(p[k]));
      }
      K.arsenal({...pit,hand:'좌'}).forEach((t,i)=>{assert.equal(t.hb,-expected[i].hb);assert.equal(t.vb,expected[i].vb);});
      assert.ok(K.arsenal({...pit,stu:pit.stu+10})[0].velo>expected[0].velo);
      assert.ok(K.arsenal({...pit,ctl:pit.ctl+10})[0].zone>expected[0].zone);
    }finally{Math.random=original;}
  });

  test('Statcast: sequence codes, counts and lengths survive decoration changes without outcome RNG calls',()=>{
    const pit=K.getP('KIA',config('KIA').spName),bat=K.getB('LG',config('LG').lineup[0]), original=Math.random;
    try{
      Math.random=()=>{throw new Error('pitch layer consumed outcome RNG');};
      const guarded=K.genPitchSeq(bat,pit,'K',0,()=>.34,K.statRNG(5));
      assert.equal(guarded.length,10);assert.ok(['S','SW'].includes(guarded.at(-1).res),'ten-pitch guard still ends with strike three');
      for(const oc of ['BB','K','HBP','1B','2B','3B','HR','OUT'])for(let i=0;i<150;i++){
        const a=K.genPitchSeq(bat,pit,oc,.7,K.statRNG(i),K.statRNG(i+10));
        const b=K.genPitchSeq(bat,pit,oc,.7,K.statRNG(i),K.statRNG(i+10000));
        assert.equal(a.length,b.length); assert.ok(a.length>=1&&a.length<=11);
        let balls=0,strikes=0;
        for(const [j,p] of a.entries()){
          assert.ok(codes.includes(p.code)); assert.ok(['B','S','SW','F','IP','HBP'].includes(p.res));
          assert.ok(p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&p.velo>0);
          if(p.res==='B')balls++;else if(p.res==='S'||p.res==='SW'||(p.res==='F'&&strikes<2))strikes++;
          if(j<a.length-1){assert.ok(balls<4);assert.ok(strikes<3);}
        }
        if(oc==='K'){assert.equal(strikes,3);assert.ok(['S','SW'].includes(a.at(-1).res));}
        else if(oc==='BB'){assert.equal(balls,4);assert.equal(a.at(-1).res,'B');}
        else assert.equal(a.at(-1).res,oc==='HBP'?'HBP':'IP');
      }
    }finally{Math.random=original;}
  });

  test('Statcast: contact geometry agrees with hits, outs, sacrifices, double plays and bunts',()=>{
    const pit=K.getP('KIA',config('KIA').spName),bat=K.getB('LG',config('LG').lineup[0]),random=K.statRNG(42);
    for(const oc of ['1B','2B','3B','HR','OUT','SF','GIDP','E','FC','BUNT1B','SAC','SQOK','SQFAIL','SQHOLD','BOUT'])for(let i=0;i<1000;i++){
      const bunt=['BUNT1B','SAC','SQOK','SQFAIL','SQHOLD','BOUT'].includes(oc), b=K.battedBall(bat,pit,oc,bunt,random);
      assert.ok(b.ang>=-45&&b.ang<=45&&b.dist>=0&&b.ev>0);
      if(oc==='HR'){assert.ok(['FB','LD'].includes(b.t));assert.ok(b.dist>K.statFence(b.ang));}
      else assert.ok(b.dist<K.statFence(b.ang));
      if(bunt)assert.equal(b.t,'BU');
      if(oc==='GIDP')assert.equal(b.t,'GB');
      if(oc==='2B'||oc==='3B')assert.ok(Math.abs(b.ang)>=18,'extra-base hit goes to a gap or line');
      if(oc==='SF')assert.ok(b.t==='FB'&&b.dist>=70&&b.dist<=100);
    }
  });

  test('Statcast: pitch weights react to count and terminal contact/strikeout',()=>{
    const pit={...K.getP('KIA',config('KIA').spName),np:K.PITCH_TYPES.map(t=>t.k)};
    function sample(b,s,res){const random=K.statRNG(2468);let fast=0,whiff=0;for(let i=0;i<10000;i++){const p=K.pickType(pit,random,b,s,res);fast+=+['FF','SI','FC'].includes(p.code);whiff+=p.whiff;}return {fast,whiff};}
    assert.ok(sample(3,0).fast>sample(0,2).fast);
    assert.ok(sample(1,2,'K').whiff>sample(1,2,'IP').whiff);
  });

  test('Statcast: inclusive zone edges map to the inner 3x3 of the 5x5 grid',()=>{
    const g=new K.InteractiveGame({...config('KIA'),splits:true},config('LG')), p=g.prepareAB();
    p.pitches=[[.33,.30],[.67,.70],[.1,.1],[.9,.9]].map(([x,y])=>({code:'FF',res:'F',velo:145,x,y}));
    const ps={};g._statPitches(p,ps);
    for(const i of [6,18,0,24])assert.equal((ps['zFF_L_'+i]||0)+(ps['zFF_R_'+i]||0),1);
    assert.equal(ps.pFF_z,2);
  });

  test('Statcast: changing decoration seed/draw count preserves results, pitching changes and main RNG',()=>{
    const isStat=k=>/^(p(?:FF|SI|SL|CU|CH|FS|FC|SW|SP)_|z(?:FF|SI|SL|CU|CH|FS|FC|SW|SP)_|bb)/.test(k)||k==='spr'||k==='xw';
    function run(decorate){
      seed(20261116);const results=[];
      for(let i=0;i<30;i++){
        const g=new K.InteractiveGame({...config('KIA',i),splits:true},config('LG',i),{statcastSeed:decorate?i+1:9000+i});
        if(decorate){const random=g._statRandom;g._statRandom=()=>{random();random();return random();};}
        results.push(finish(g,assert));
      }
      return {games:JSON.parse(JSON.stringify(results,(k,v)=>isStat(k)?undefined:v)),nextRandom:Math.random()};
    }
    assert.deepEqual(run(false),run(true));
  });

  test('Statcast: real mergeNum sums all numeric keys across games; grids/sprays stay user-only',()=>{
    const root=path.join(__dirname,'..','..'), html=fs.readFileSync(path.join(root,fs.readdirSync(root).find(n=>n.endsWith('.html'))),'utf8');
    const source=html.match(/function mergeNum\(t,s\)\{[^\n]+/)[0], merge=vm.runInNewContext('('+source+')');
    const season={}, expected={}, observed={pitches:0,bip:0,ev:0,sw:0,wh:0,cs:0,z:0,ab:0,h:0,tb:0,k:0,gb:0}, add=(o,k,n)=>o[k]=(o[k]||0)+n;
    for(const [i,[h,a]] of schedule().slice(0,80).entries()){
      const g=new K.InteractiveGame({...config(h,i),splits:h==='KIA'}, {...config(a,i),splits:a==='KIA'});
      while(!g.over){const e=g.step();if(!e)continue;
        const contact=['1B','2B','3B','HR','OUT','SF','GIDP','E','FC','BUNT1B','SAC','SQOK','SQFAIL','SQHOLD','BOUT'].includes(e.oc);
        assert.equal(!!e.bb,contact,'contact annotation for '+e.oc);
        for(const p of e.pitches)if(p.code){observed.pitches++;observed.sw+=+['SW','F','IP'].includes(p.res);observed.wh+=+(p.res==='SW');observed.cs+=+(p.res==='S');observed.z+=+K.inPitchZone(p);}
        if(e.bb){observed.bip++;observed.ev+=e.bb.ev;observed.gb+=+(e.bb.t==='GB');}
      }
      for(const t of [h,a])for(const role of ['bat','pit'])for(const [name,s] of Object.entries(g.box[t][role])){
        const id=t+'|'+role+'|'+name, dest=season[id]||(season[id]={}); merge(dest,s);
        assert.ok(!('spr' in dest));
        for(const [k,v] of Object.entries(s))if(typeof v==='number'){assert.ok(Number.isFinite(v));add(expected,k,v);}
        if(t!=='KIA'){assert.ok(!s.spr);assert.ok(!Object.keys(s).some(k=>/^z[A-Z]{2}_/.test(k)));}
        if(role==='bat'){
          assert.equal((s.bbN||0),['GB','LD','FB','PU','BU'].reduce((n,k)=>n+(s['bb'+k]||0),0));
          if(t==='KIA')assert.equal(s.spr?.length||0,s.bbN||0);
          observed.ab+=s.AB;observed.h+=s.H;observed.tb+=s.H+s._2B+2*s._3B+3*s.HR;observed.k+=s.SO;
        }else{
          assert.equal(codes.reduce((n,c)=>n+(s['p'+c+'_n']||0),0),s.NP);
          for(const c of codes){const k='p'+c+'_';assert.equal(s[k+'n']||0,(s[k+'nL']||0)+(s[k+'nR']||0));}
          if(t==='KIA')assert.equal(Object.entries(s).filter(([k])=>/^z[A-Z]{2}_/.test(k)).reduce((n,[,v])=>n+v,0),s.NP);
        }
      }
    }
    const actual={};for(const s of Object.values(season))for(const [k,v] of Object.entries(s))add(actual,k,v);
    for(const [k,v] of Object.entries(expected))assert.ok(Math.abs(actual[k]-v)<1e-7,k+' merges additively');
    const sum=s=>codes.reduce((n,c)=>n+(actual['p'+c+'_'+s]||0),0);
    assert.equal(sum('n'),observed.pitches);assert.equal(sum('bip'),observed.bip);assert.equal(actual.bbN,observed.bip);
    assert.ok(Math.abs(actual.bbEV-observed.ev)<1e-6);
    for(const k of ['sw','wh','cs','z','ab','h','tb','k','gb'])assert.equal(sum(k),observed[k],k+' agrees with event/box totals');
  });
};
