'use strict';
const fs = require('node:fs'), path = require('node:path');
const {createSnapshot,sourceHashes} = require('../../qa/snapshot');
module.exports = ({assert,test}) => {
  test('QA snapshot runs unchanged after original game sources are edited', () => {
    // Use an isolated working-tree fixture; never mutate the developer's files.
    const original = createSnapshot(path.resolve(__dirname,'../..'));
    let snapshot;
    try {
      snapshot = createSnapshot(original.root);
      const before = sourceHashes(snapshot.root);
      assert.ok(Object.hasOwn(before,'data/kbo2026.json'));
      assert.ok(Object.hasOwn(before,'qa/cases.js'));
      assert.ok(Object.keys(before).some(n=>n.startsWith('design/')));
      const html = Object.keys(before).find(n=>n.endsWith('.html'));
      for (const file of ['core.js','fm.js','design/badges.js',html]) {
        fs.writeFileSync(path.join(original.root,file),'throw new Error("changed original source");');
      }
      const {Runtime} = require(path.join(snapshot.root,'qa/runtime.js'));
      const h = new Runtime({observe:false}).start('SSG');
      assert.equal(h.user,'SSG');
      assert.ok(h.FM.fxCount('SSG',true).f<=3);
      assert.deepEqual(sourceHashes(snapshot.root),before);
      assert.notDeepEqual(sourceHashes(original.root),before);
      // A mutation of the copy itself must still be detected, not hidden.
      fs.appendFileSync(path.join(snapshot.root,'core.js'),'\n// changed snapshot\n');
      assert.notDeepEqual(sourceHashes(snapshot.root),before);
    } finally { if (snapshot) snapshot.cleanup(); original.cleanup(); }
  });
};
