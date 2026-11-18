'use strict';
// Event tests use an isolated source copy, injecting test data and observation access.
// The regular QA Runtime and repository game sources are never patched at runtime.
const fs=require('node:fs'),path=require('node:path');
const {createSnapshot}=require('./snapshot');
function eventRuntime(factory){
  const snapshot=createSnapshot(path.resolve(__dirname,'..'));
  const dir=path.join(snapshot.root,'fm');
  let source=fs.readdirSync(dir).filter(n=>n.endsWith('.js')&&(!factory||n!=='05d-event-data.js')).sort().map(n=>fs.readFileSync(path.join(dir,n),'utf8')).join('');
  const at=source.lastIndexOf('})();');
  source=source.slice(0,at)+(factory?'const EVT_DATA=('+factory.toString()+')();\n':'')+`
window.__events={state:evtState,context:evtContext,draw:evtDraw,build:evtBuild,resolve:evtResolve,pending:evtPending,
  apply:evtApply,pack:evtPack,mark:evtMark,templates:evtTemplates,data:evtData,after:evtAfterGame,promiseTick:evtPromiseTick,
  inbox:evtInbox,rng:evtRng,off:evtOff,week:evtWeek,eligible:evtEligible};
const qaEventBuild=evtBuild;
evtBuild=function(t,stage,pending){const card=qaEventBuild(t,stage,pending);if(window.__eventAudit)window.__eventAudit(t,card);return card;};
`+source.slice(at);
  fs.writeFileSync(path.join(snapshot.root,'fm.js'),source);
  const {Runtime}=require(path.join(snapshot.root,'qa','runtime'));
  return {Runtime,cleanup:snapshot.cleanup};
}
module.exports={eventRuntime};
