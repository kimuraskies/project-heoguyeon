'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
require(path.join(__dirname, '..', 'core.js'));
const K = globalThis.KBO;
let passed = 0, failed = 0, skipped = 0;
const start = performance.now();
function seed(value) {
  let state = value >>> 0;
  Math.random = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let x = Math.imul(state ^ state >>> 15, 1 | state);
    x ^= x + Math.imul(x ^ x >>> 7, 61 | x);
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
}
function test(name, fn) {
  seed(20261105);
  try { fn(); passed++; console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + '\n' + error.stack); }
}
test.skip = (name, reason) => { skipped++; console.log('SKIP ' + name + ': ' + reason); };
const random = Math.random;
try {
  for (const file of ['box', 'lineup', 'tactics', 'career', 'farm', 'regress']) {
    require('./tests/' + file)({ K, assert, test, seed });
  }
} finally { Math.random = random; }
console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped (${((performance.now()-start)/1000).toFixed(2)}s)`);
process.exitCode = failed ? 1 : 0;
