'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

// Include the game scripts, HTML, assets/data, FM parts and the QA runner itself.
// Results stay in the working tree and are never copied or included in hashes.
function sourceFiles(root) {
  const names = fs.readdirSync(root).filter(n => /\.(?:js|html)$/.test(n) && fs.statSync(path.join(root,n)).isFile());
  function walk(dir) {
    if (!fs.existsSync(path.join(root,dir))) return;
    for (const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true})) {
      const name = dir+'/'+entry.name;
      if (name === 'qa/results') continue;
      if (entry.isDirectory()) walk(name);
      else if (entry.isFile()) names.push(name);
    }
  }
  for (const dir of ['design','data','fm','qa']) walk(dir);
  return names.sort();
}
function sourceHashes(root) {
  return Object.fromEntries(sourceFiles(root).map(n => [n,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,n))).digest('hex')]));
}
function createSnapshot(sourceRoot) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'kbo-qa-'));
  const cleanup = () => fs.rmSync(root,{recursive:true,force:true});
  try {
    const before = sourceHashes(sourceRoot);
    for (const name of Object.keys(before)) {
      const target = path.join(root,name);
      fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.copyFileSync(path.join(sourceRoot,name),target);
    }
    // Refuse a mixed snapshot if sources changed while the copy was being made.
    if (JSON.stringify(before)!==JSON.stringify(sourceHashes(root)) ||
        JSON.stringify(before)!==JSON.stringify(sourceHashes(sourceRoot))) {
      throw new Error('QA sources changed while creating the snapshot; rerun the suite');
    }
    return {root,cleanup};
  } catch (error) { cleanup(); throw error; }
}
module.exports = {createSnapshot,sourceFiles,sourceHashes};
