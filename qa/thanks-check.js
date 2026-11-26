// Checks the thank-you popup's own rules without a browser: one show per visitor, nothing on a
// first visit, and it waits behind the update-notes popup instead of covering it.
// usage: node qa/thanks-check.js   (loads design/info.js into a stub page; no game engine needed)
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'design', 'info.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) { pass++; console.log('ok   ' + name); } else { fail++; console.log('FAIL ' + name + (extra ? ' · ' + extra : '')); } };

function page(store) {
  const shown = [];
  const doc = {
    body: { classList: { contains: () => false, add() {}, remove() {} } },
    querySelector: () => null, querySelectorAll: () => [],
    getElementById: () => null, addEventListener() {},
    createElement: () => ({ setAttribute() {}, remove() {}, appendChild() {}, innerHTML: '', offsetParent: null }),
  };
  const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const ctx = {
    document: doc, localStorage: ls, console,
    modal: html => shown.push(html),
    App: { closeModal() {} }, Feedback: { open() {} }, Track: { action() {} },
    setTimeout: () => 0, state: null, USER: null,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: 'design/info.js' });
  return { Info: ctx.Info, shown, store };
}

// 1. a returning visitor (this device has entered before) sees it once
let p = page({ 'kbo-gate': JSON.stringify({ token: 't' }) });
p.Info.thanks(0);
ok('returning visitor: popup shown', p.shown.length === 1, 'modal calls ' + p.shown.length);
ok('popup carries the message', !!p.shown[0] && p.shown[0].includes('420명이 넘는 감독님') && p.shown[0].includes('진심으로 감사합니다'));
ok('popup has 확인 and 의견 보내기', !!p.shown[0] && p.shown[0].includes('Info.thanksClose()') && p.shown[0].includes('Info.thanksOpen()'));
ok('visitor key written', p.store['kbo-thanks'] === '2026-11-26-420', String(p.store['kbo-thanks']));
p.Info.thanks(0);
ok('second call in the same visit: nothing', p.shown.length === 1, 'modal calls ' + p.shown.length);

// 2. a fresh visitor (no save, no gate entry) never sees it on that first load, and the visit is
// only marked as handled by the caller's first-visit rule: the coach's guide comes first
p = page({});
p.Info.askFeedback(0);
ok('first visit: no popup', p.shown.length === 0, 'modal calls ' + p.shown.length);
ok('first visit: thank-you key left unwritten', !p.store['kbo-thanks'], String(p.store['kbo-thanks']));
// same visitor comes back on the entered device: now it shows
p.store['kbo-gate'] = JSON.stringify({ token: 't' });
p = page(p.store);
p.Info.askFeedback(0);
ok('second visit after entering: thank-you shows', p.shown.length === 1 && p.shown[0].includes('감사합니다, 감독님'), 'modal calls ' + p.shown.length);

// 3. a returning visitor who still owes the 0.82 update notes: no popup now (it would cover them)
p = page({ 'kbo-gate': JSON.stringify({ token: 't' }) });
p.Info.askFeedback(0);
ok('update-notes popup shown first', p.shown.length === 1 && p.shown[0].includes('0.82 업데이트'), 'modal calls ' + p.shown.length);
ok('thank-you waits behind it', !p.store['kbo-thanks'], String(p.store['kbo-thanks']));
p.store['kbo-upcoming'] = '2026-11-22-0.82';       // those notes have been read by the next visit
p.Info.askFeedback(0);
ok('later visit: thank-you shows', p.shown.length === 2 && p.shown[1].includes('감사합니다, 감독님'), 'modal calls ' + p.shown.length);

console.log('');
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
