'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname,'../..');
module.exports = ({assert,test}) => {
  test('HTML and design FM references exist in fm.js window.FM exports', () => {
    // Evaluate just the FM bundle: later design scripts must not mask missing exports.
    const context = {window:{}};
    vm.runInNewContext(fs.readFileSync(path.join(root,'fm.js'),'utf8'),context,{filename:'fm.js'});
    const exports = context.window.FM;
    const files = fs.readdirSync(root).filter(n=>n.endsWith('.html'))
      .concat(fs.readdirSync(path.join(root,'design')).filter(n=>n.endsWith('.js')).map(n=>'design/'+n));
    assert.ok(files.some(n=>n.endsWith('.html')),'No HTML found to check');
    const missing = new Map();
    for (const file of files) {
      for (const match of fs.readFileSync(path.join(root,file),'utf8').matchAll(/\bFM\s*\.\s*([A-Za-z_$][\w$]*)/g)) {
        const name = match[1];
        if (!Object.hasOwn(exports,name)) {
          if (!missing.has(name)) missing.set(name,new Set());
          missing.get(name).add(file);
        }
      }
    }
    assert.equal(missing.size,0,'Missing FM exports:\n'+[...missing].sort().map(([name,files])=>`${name}: ${[...files].join(', ')}`).join('\n'));
  });
};
