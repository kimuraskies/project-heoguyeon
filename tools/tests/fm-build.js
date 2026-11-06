'use strict';
// fm.js is generated from fm/*.js (tools/build_fm.js). Fail if someone edited one without the other.
const fs = require('fs'), path = require('path');
module.exports = ({assert, test}) => {
  test('fm.js matches its parts in fm/', () => {
    const {build} = require('../build_fm.js');
    const cur = fs.readFileSync(path.join(__dirname, '..', '..', 'fm.js'), 'utf8').replace(/\r\n/g, '\n');
    assert.ok(cur === build(), 'fm.js is stale: run node tools/build_fm.js');
  });
};
