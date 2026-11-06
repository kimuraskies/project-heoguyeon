// fm.js is generated: the FM layer lives in fm/*.js, one file per topic, joined in name order.
// The parts share one closure (fm/00-core.js opens it, the last part closes it and exports
// window.FM), so splitting the source changed no behavior. Edit fm/*.js, then run:
//   node tools/build_fm.js           write fm.js
//   node tools/build_fm.js --check   exit 1 if fm.js is stale (tools/test.js runs this check)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), dir = path.join(root, 'fm');
function build() {
  return fs.readdirSync(dir).filter(n => n.endsWith('.js')).sort()
    .map(n => fs.readFileSync(path.join(dir, n), 'utf8').replace(/\r\n/g, '\n')).join('');
}
if (require.main === module) {
  const out = build(), target = path.join(root, 'fm.js');
  if (process.argv.includes('--check')) {
    const cur = fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n');
    if (cur !== out) { console.error('fm.js is stale: run node tools/build_fm.js'); process.exit(1); }
    console.log('fm.js is up to date');
  } else { fs.writeFileSync(target, out); console.log('fm.js built from', fs.readdirSync(dir).filter(n => n.endsWith('.js')).length, 'parts,', out.length, 'chars'); }
}
module.exports = {build};
