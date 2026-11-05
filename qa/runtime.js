'use strict';
// No game source is transformed. This adapter supplies only browser services and
// observers around real entry points. It is not a browser layout/accessibility test.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readdirSync(ROOT).find(n => n.endsWith('.html'));
const attrs = p => p.type === 'B' ? ['con','pow','eye','spd','fld','arm'] : ['stu','ctl','mov','sta'];
const copy = x => structuredClone(x);
const json = x => JSON.stringify(x, (_, v) => typeof v === 'number' && !Number.isFinite(v) ? String(v) : v);

function dom(html) {
  const ids = new Map(), nodes = new Set();
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {};
      this.style = {setProperty(k,v) { this[k] = v; }}; this.hidden = false;
      this.textContent = ''; this.className = ''; this._html = '';
      this.classList = {add(){},remove(){},toggle(){}};
      if (tag === 'template') this.content = {firstChild: null};
    }
    set id(v) { this._id = v; ids.set(v, this); }
    get id() { return this._id; }
    set innerHTML(v) {
      this._html = String(v);
      if (this.content) {
        const e = new Element((v.match(/^<(\w+)/) || [,'div'])[1]);
        const tag = (v.match(/^<[^>]*>/) || [''])[0];
        const id = tag.match(/\bid="([^"]+)"/), cls = tag.match(/\bclass="([^"]+)"/);
        if (id) e.id = id[1]; if (cls) e.className = cls[1];
        e._html = v; this.content.firstChild = e;
      }
    }
    get innerHTML() { return this._html; }
    appendChild(e) { if (!e) throw new Error('DOM stub: null appendChild'); e.parentNode = this; this.children.push(e); nodes.add(e); return e; }
    remove() { nodes.delete(this); if (ids.get(this.id) === this) ids.delete(this.id); if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(x => x !== this); }
    setAttribute(k,v) { this[k] = v; }
    addEventListener() {}
    focus() {}
  }
  const body = new Element('body');
  for (const m of html.slice(0, html.indexOf('<script')).matchAll(/\bid="([^"]+)"/g)) { const e = new Element(); e.id = m[1]; body.appendChild(e); }
  return {body, documentElement:new Element('html'), createElement:t=>new Element(t),
    getElementById:id=>ids.get(id)||null,
    querySelectorAll:selector=> {
      if (selector === '.modal-bg:not(#relay)') return [...nodes].filter(n=>n.className.split(' ').includes('modal-bg') && n.id !== 'relay');
      throw new Error('Unsupported DOM selector: '+selector);
    }, addEventListener(){}, nodes};
}

class Runtime {
  constructor({seed=20261105, label='run', audit=null, storage=null, quota=Infinity, observe=true}={}) {
    this.seed=seed>>>0; this.rng=this.seed; this.label=label; this.audit=audit;
    this.actions=[]; this.checks=0; this.observers=[]; this.warnings=[]; this.fixtures=[];
    this.counts={regular:0,spring:0,postseason:0,futures:0}; this.serial=0;
    const math=Object.create(Math);
    math.random=()=>{ this.rng=(this.rng+0x6D2B79F5)>>>0; let x=Math.imul(this.rng ^ this.rng>>>15,1|this.rng); x^=x+Math.imul(x^x>>>7,61|x); return ((x^x>>>14)>>>0)/4294967296; };
    const values=storage || new Map(); this.storage=values; this.maxStorageBytes=0;
    const localStorage={getItem:k=>values.has(k)?values.get(k):null, removeItem:k=>values.delete(k), clear:()=>values.clear(),
      setItem:(k,v)=>{ v=String(v); let size=2*(k.length+v.length); for(const [a,b] of values) if(a!==k) size+=2*(a.length+b.length);
        if(size>quota) { const e=new Error('localStorage quota exceeded'); e.name='QuotaExceededError'; throw e; }
        this.maxStorageBytes=Math.max(this.maxStorageBytes,size); values.set(k,v);
      }};
    const html=fs.readFileSync(path.join(ROOT,HTML),'utf8'), document=dom(html), timers=new Map(); let timer=0;
    const clockBase=Date.UTC(2026,10,5);
    class FixedDate extends Date { constructor(...a){ super(...(a.length?a:[clockBase])); } static now(){return clockBase;} }
    const ctx={Math:math,Date:FixedDate,document,localStorage,
      setTimeout:(f,ms)=>{timers.set(++timer,{f,ms});return timer;},clearTimeout:id=>timers.delete(id),
      console:{log(){},warn:(...a)=>this.warnings.push(a.map(String).join(' ')),error:(...a)=>this.warnings.push(a.map(String).join(' '))},
      location:{reload:()=>{this.reloadRequested=true;}},performance};
    ctx.window=ctx; this.ctx=vm.createContext(ctx); this.document=document; this.timers=timers;
    for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      const src=m[1].match(/\bsrc="([^"]+)"/);
      if(src) vm.runInContext(fs.readFileSync(path.join(ROOT,src[1]),'utf8'),this.ctx,{filename:src[1]});
      else vm.runInContext(m[2],this.ctx,{filename:HTML,lineOffset:html.slice(0,m.index).split('\n').length-1});
    }
    this.K=this.ctx.KBO; this.FM=this.ctx.FM; this.App=this.ctx.App;
    this.readState=vm.runInContext('()=>state',this.ctx); this.readUser=vm.runInContext('()=>USER',this.ctx);
    this.readCounts=vm.runInContext('()=>teamGameCount',this.ctx);
    if(observe) this.installObservers();
    if(this.state) this.checkpoint('boot restored save');
  }
  get state(){return this.readState();} get user(){return this.readUser();}
  eval(code){return vm.runInContext(code,this.ctx,{filename:'qa/observation-or-fixture',timeout:30000});}
  players(){return this.K.TEAM_IDS.flatMap(t=>['batters','pitchers','farm'].flatMap(bucket=>(this.K.ROSTERS[t][bucket]||[]).map(p=>({t,bucket,p}))));}
  context(){const s=this.state; return {run:this.label,seed:this.seed,rng:this.rng,checkpoint:this.serial,year:s?.year,phase:s?.phase,day:this.lastDay??null,gameIdx:s?.gameIdx,user:this.user,userGames:s?.schedule.filter(g=>g.played&&(g.home===this.user||g.away===this.user)).length,action:this.actions.at(-1),fixtures:this.fixtures};}
  violation(code,detail){this.audit?.violation(this,code,detail);}
  checkpoint(label){this.serial++; this.checks++; this.lastCheckpoint=label; if(this.state) { this.audit?.check(this,label); for(const f of this.observers) f(this,label); } this.expireToasts();}
  expireToasts(){for(const [id,t] of this.timers) if(t.ms>=2800){t.f();this.timers.delete(id);}}
  action(label,fn){this.actions.push(label); if(this.actions.length>30)this.actions.shift();
    try{const out=fn();this.checkpoint(label);return out;}catch(e){this.violation('EXCEPTION',{label,error:e.stack});throw e;}}
  fixture(label,fn){this.fixtures.push(label);return this.action('FIXTURE: '+label,fn);}
  start(team='KIA'){this.action('setup '+team,()=>{this.FM.setupPick(team);this.FM.setupName('QA 감독');this.FM.setupBg('coach');this.FM.setupStart();});return this;}
  installObservers(){
    const orig=this.K.simGame;
    this.K.simGame=(h,a,o)=>{this.audit?.config(this,h);this.audit?.config(this,a);const r=orig(h,a,o); const k=h.teamId.startsWith('F_')?'futures':this.state.phase;
      this.counts[k]=(this.counts[k]||0)+1; this.audit?.box(this,r,k); return r;};
    // Global script function bindings are observed, never replaced with alternate game logic.
    this.ctx.__qaAfterGame=(idx)=>{this.lastDay=this.state.schedule[idx].day;this.checkpoint('regular game '+idx);};
    this.ctx.__qaAfterPS=()=>this.checkpoint('postseason game');
    this.eval('const __qaPlayGame=playGame; playGame=function(i,d){const r=__qaPlayGame(i,d); if(r)__qaAfterGame(i);return r;}; const __qaPS=psRecord; psRecord=function(r){const x=__qaPS(r);__qaAfterPS();return x;};');
    const sr=this.FM.springRecord; this.FM.springRecord=r=>{const out=sr(r);this.checkpoint('spring game');return out;};
    // springSimAll uses a private springRecord: simGame pre-call observes the previous
    // recorded game. The final record is checked when the public action returns.
    const sim=this.K.simGame; this.K.simGame=(h,a,o)=>{if(this.state.phase==='spring'&&this.state.spring.played)this.checkpoint('previous spring game');return sim(h,a,o);};
    const finalize=this.ctx.Match.finalize;
    this.ctx.Match.finalize=()=>{const r=this.ctx.Match.game.result(), kind=this.ctx.Match.spring?'spring':this.ctx.Match.ps?'postseason':'regular';
      this.counts[kind]++;this.audit?.box(this,r,kind);const out=finalize.call(this.ctx.Match);this.checkpoint('live finalize');return out;};
  }
  spring({live=false}={}){
    this.action('set camp bal',()=>this.FM.setCamp('bal'));
    this.action('start spring',()=>this.FM.startSpring());
    if(live)this.liveNext();
    this.action('finish spring',()=>this.FM.springSimAll());
    this.action('open regular season',()=>this.FM.openSeason());
  }
  liveNext(ps=false){this.action(ps?'next playoff preview':'next game preview',()=>ps?this.App.psNext():this.App.nextGame());
    if(this.state.pendingGame==null)return;
    this.action('start live match',()=>this.App.startMatch());
    this.action('finish live match',()=>this.ctx.Match.toEnd());
    this.action('commit live match result',()=>this.ctx.Match.finalize());
  }
  renew(){for(const m of this.state.fm.inbox.slice()) {const i=m.actions.findIndex(a=>a.fn==='renew');if(!m.done&&i>=0)this.action('renew '+m.actions[i].arg.n,()=>this.FM.act(m.id,i));}}
  nextSeason(){this.renew(); if(this.state.fm.fired) {
      if(!this.state.fm.lastChance)this.action('request last chance',()=>this.FM.lastChance());
      else {const t=this.state.fm.offers?.[0];if(t)this.action('take offered job '+t,()=>this.App.takeJob(t));}
    }
    const y=this.state.year;this.action('next season',()=>this.App.nextSeason());if(this.state.year===y)this.action('confirm unresolved contracts',()=>this.FM.answer());
    if(this.state.year!==y+1)throw new Error('Next season did not advance');
  }
  saveObject(){return {state:copy(this.state),rosters:copy(this.K.ROSTERS),teamGameCount:copy(this.readCounts())};}
}
function sourceHashes(){const names=[HTML,'core.js','fm.js','farm.js','career.js','design/badges.js'];return Object.fromEntries(names.map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,n))).digest('hex') ]));}
module.exports={Runtime,ROOT,HTML,attrs,copy,json,sourceHashes};
