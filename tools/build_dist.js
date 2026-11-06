// Build a static site in dist/: the game page as index.html plus every script and stylesheet it
// loads. No bundler and no network: the same folder can be served by any static host or wrapped
// later in a desktop/mobile client.  Usage: node tools/build_dist.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'dist');
const page = fs.readdirSync(root).find(n => n.endsWith('.html'));
const html = fs.readFileSync(path.join(root, page), 'utf8');
fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(path.join(out, 'design'), {recursive: true});
fs.writeFileSync(path.join(out, 'index.html'), html);
// copy exactly what the page references (src= and href= to local files)
const refs = [...html.matchAll(/(?:src|href)="([^"#:]+\.(?:js|css))"/g)].map(m => m[1]);
// images the stylesheets point at (url(...) relative to the css file)
for (const css of refs.filter(r => r.endsWith('.css'))) {
  const dir = path.dirname(css), text = fs.readFileSync(path.join(root, css), 'utf8');
  for (const m of text.matchAll(/url\(['"]?([^)'"]+\.(?:webp|png|jpe?g|svg))['"]?\)/g)) if (!/^(data:|https?:)/.test(m[1])) refs.push(path.posix.join(dir, m[1]));
}
for (const r of new Set(refs)) {
  fs.mkdirSync(path.dirname(path.join(out, r)), {recursive: true});
  fs.copyFileSync(path.join(root, r), path.join(out, r));
}
const size = d => fs.readdirSync(d, {withFileTypes: true}).reduce((s, e) => s + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`dist/: index.html + ${new Set(refs).size} files, ${(size(out) / 1024).toFixed(0)} KB`);
