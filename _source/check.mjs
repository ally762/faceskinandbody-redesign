// QA: verifies every built page keeps the original SEO title/description, has one H1,
// and that all local links / images resolve.  Run: node _source/check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const SRC = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(SRC, '..');
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
let problems = 0, pages = 0;
for (const f of fs.readdirSync(path.join(SRC, 'content'))) {
  if (f.startsWith('_') || f === 'home.json') continue;
  const c = JSON.parse(fs.readFileSync(path.join(SRC, 'content', f), 'utf8'));
  const slug = f === 'index.json' ? '' : f.slice(0, -5).replace(/__/g, '/');
  const file = path.join(OUT, slug, 'index.html');
  const html = fs.readFileSync(file, 'utf8'); pages++;
  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
  const desc = decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  const err = [];
  if (title !== c.title) err.push(`title mismatch: "${title}" vs "${c.title}"`);
  if (desc !== c.description) err.push('description mismatch');
  if (h1 !== 1) err.push(`h1 count ${h1}`);
  for (const [, ref] of html.matchAll(/(?:href|src)="([^"#:?]+?)(?:[#?][^"]*)?"/g)) {
    if (/^(https?|mailto|tel)/.test(ref) || ref.startsWith('//')) continue;
    let p = path.resolve(path.dirname(file), decodeURIComponent(ref));
    if (ref.endsWith('/') || fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
    if (!fs.existsSync(p)) err.push('missing ' + ref);
  }
  if (err.length) { problems += err.length; console.log('✗', slug || '/', '\n   ' + [...new Set(err)].join('\n   ')); }
}
console.log(`${pages} pages checked, ${problems} problems`);
