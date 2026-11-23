// QA: checks that every original paragraph / heading / list item appears on the rebuilt page.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const SRC = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(SRC, '..');
const norm = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").toLowerCase().replace(/[^a-z0-9$]+/g, '');
let miss = 0;
for (const f of fs.readdirSync(path.join(SRC, 'content'))) {
  if (f.startsWith('_') || f === 'home.json' || f === 'journal.json') continue;
  const c = JSON.parse(fs.readFileSync(path.join(SRC, 'content', f), 'utf8'));
  const slug = f === 'index.json' ? '' : f.slice(0, -5).replace(/__/g, '/');
  const page = norm(fs.readFileSync(path.join(OUT, slug, 'index.html'), 'utf8'));
  const texts = [];
  const walk = bs => bs.forEach(b => {
    if (b.t === 'p' || b.t === 'quote') texts.push(b.html); else if (b.t === 'h') texts.push(b.text); else if (b.t === 'list') texts.push(...b.items);
    else if (b.t === 'btn') texts.push(b.text); else if (b.blocks) walk(b.blocks);
  });
  const secs = f === 'index.json' ? c.sections.filter((s, i) => i !== 10) : c.sections; // section 10 = hidden legacy duplicate
  secs.forEach(s => walk(s.blocks));
  const missing = texts.filter(t => norm(t).length > 2 && !page.includes(norm(t)));
  if (missing.length) { miss += missing.length; console.log(`✗ ${slug || '/'}: ${missing.length}/${texts.length}`); missing.slice(0, 6).forEach(m => console.log('   - ' + String(m).replace(/<[^>]+>/g, '').slice(0, 90))); }
}
console.log('missing total', miss);
