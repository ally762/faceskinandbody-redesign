/* Static site generator for the Face Skin & Body Bar redesign.
   Reads the original page content (content/*.json) and renders every page
   with the new design — the copy, headings, titles, meta descriptions and URLs
   are kept exactly as on the live site to preserve SEO.
   Run:  node _source/build.mjs   (from the project root) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(SRC, '..');
const C = f => JSON.parse(fs.readFileSync(path.join(SRC, 'content', f + '.json'), 'utf8'));
const SITE = 'https://www.faceskinandbody.ca';
const VER = Date.now().toString(36);
const BOOK = 'https://faceskin.zenoti.com/webstoreNew/services';
const GIFT = 'https://faceskin.zenoti.com/webstoreNew/giftcards/47b033c8-bf43-4cac-9722-8f901dde6590';
const site = C('_site');
const imap = JSON.parse(fs.readFileSync(path.join(SRC, 'imagemap.json'), 'utf8'));
const imeta = JSON.parse(fs.readFileSync(path.join(SRC, 'imagemeta.json'), 'utf8'));
const norm = u => (u || '').replace(/^https?:/, '').replace(/\?.*$/, '').replace(/\/$/, '');
const IMG = {}; for (const [k, v] of Object.entries(imap)) IMG[norm(k)] = v;

const contentFiles = fs.readdirSync(path.join(SRC, 'content')).filter(f => f.endsWith('.json') && !f.startsWith('_')).map(f => f.slice(0, -5));
const slugOf = f => f === 'index' ? '' : f.replace(/__/g, '/');
const PAGES = new Set(contentFiles.map(slugOf));
PAGES.delete('home');
const REDIRECTS = {
  home: '', 'fine-lines-and-aging': 'fine-lines-wrinkles-treatment', peels: 'chemical-peels', 'advanced-treatments': 'medical-aesthetics',
  services: 'facials', 'facial-treatments': 'facials', 'cosmetic-treatments': 'medical-aesthetics', neuromodulator: 'neuromodulators',
  'injectable-and-fillers': 'injectables', 'shop-skincare': 'shop-alumiermd', 'about-us': 'our-story', cart: 'shop-alumiermd',
};

const CONCERNS = {
  1: ['Dry / Dehydrated', 'dry-dehydrated'], 2: ['Fine Lines & Aging', 'fine-lines-wrinkles-treatment'], 3: ['Acne', 'acne'],
  4: ['Dull', 'dull-skin'], 5: ['Sensitive / Rosacea', 'sensitive-rosacea'], 6: ['Hyperpigmentation / Sun Damage', 'hyperpigmentation-sun-damage'],
};
const CONCERN_KEYS = new Set(['drydehydrated', 'finelinesaging', 'acne', 'dull', 'sensitiverosacea', 'hyperpigmentationsundamage']);
const isConcernLabel = b => (b.t === 'p' || b.t === 'h') && CONCERN_KEYS.has(String(b.text || b.html || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '').toLowerCase().replace(/[^a-z]/g, ''));
const iconNum = src => { const m = (src || '').match(/face-skin-conditions-black(\d)/i); return m ? +m[1] : 0; };

const TREATMENT_LINKS = [
  [/lower face ?lift/i, 'non-surgical-face-lifts'], [/radiofrequency micro|rf micro|morpheus/i, 'rf-microneedling'],
  [/microneedling/i, 'microneedling'], [/anti-aging facial/i, 'anti-aging-facials'], [/brightening facial/i, 'brightening-facials'],
  [/purifying|acne facial/i, 'acne-facials'], [/men.s facial/i, 'mens-facials'], [/back facial/i, 'back-facials'],
  [/forma\) facial|hydrating facial|soothing facial|hyperpigmentation facial|facial/i, 'facials'],
  [/medical grade skincare/i, 'shop-alumiermd'], [/skin tightening|radiofrequency|forma/i, 'rf-skin-tightening'],
  [/peel|resurfacer|mangobrite/i, 'chemical-peels'], [/neurotoxin|dysport/i, 'neuromodulators'], [/filler/i, 'dermal-fillers'],
  [/ipl|lumecca/i, 'ipl'], [/dermaplaning/i, 'dermaplaning'],
];
const treatmentLink = t => (TREATMENT_LINKS.find(([re]) => re.test(t)) || [])[1];

/* ---------------- helpers ---------------- */
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const fixNbsp = s => String(s || '').replace(/&nbsp;/g, ' ');
const weirdCaps = t => /[a-z][A-Z]|^[a-z]|\b[A-Z]{2}[a-z]|\b[a-z]+ [A-Z][a-z]+ [a-z]/.test(t) || /[a-z] [A-Z]{2,}/.test(t);
const arrow = '<svg class="arr" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5"/></svg>';
const chev = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';

let P = './'; // relative prefix of the page being rendered
let CUR = '';
const pageUrl = slug => slug ? `${P}${slug}/` : P;

function link(href) {
  if (!href) return '#';
  href = href.trim().replace(/^https?:\/\/(www\.)?faceskinandbody\.ca/i, '') || '/';
  if (/^mailto:tel/i.test(href)) return 'tel:14034545607';
  if (/^mailto:/i.test(href)) return href.replace(/\?$/, '');
  if (/^(https?:|tel:)/i.test(href)) return href;
  if (href.startsWith('#')) return href;
  if (href.startsWith('/s/')) return SITE + href;
  if (href.startsWith('/')) {
    let [p, hash] = href.split('#');
    p = p.replace(/^\/|\/$/g, '');
    if (p in REDIRECTS) p = REDIRECTS[p];
    if (p === '' || PAGES.has(p)) return pageUrl(p) + (hash ? '#' + hash : '');
    return SITE + href;
  }
  return href;
}
const isExternal = h => /^https?:/i.test(h) && !h.includes('faceskinandbody.ca');
const rel = h => isExternal(h) ? ' target="_blank" rel="noopener"' : '';
const rewrite = html => fixNbsp(html).replace(/href="([^"]*)"/g, (m, h) => `href="${link(h)}"${rel(link(h))}`);

function resolveImg(src) {
  let n = IMG[norm(src)];
  if (!n && src && !src.includes('/')) n = Object.values(IMG).find(v => v.toLowerCase() === src.toLowerCase() + '.webp');
  return n;
}
function imgSrc(src) { const n = resolveImg(src); return n ? `${P}assets/img/${n}` : (src.startsWith('//') ? 'https:' + src : src); }
function imgTag(src, alt = '', cls = '', eager = false, sizes = '') {
  const n = resolveImg(src); const [w, h] = (n && imeta[n]) || [];
  return `<img src="${imgSrc(src)}" alt="${esc(alt)}"${w ? ` width="${w}" height="${h}"` : ''}${cls ? ` class="${cls}"` : ''} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}
function btn(text, href, variant = '') {
  const h = link(href);
  return `<a class="btn ${variant}" href="${esc(h)}"${rel(h)}><span>${esc(text)}</span>${arrow}</a>`;
}
const isBook = h => /zenoti|tel:/i.test(h || '');

function concernChips(nums) {
  const uniq = [...new Set(nums)].filter(Boolean);
  if (!uniq.length) return '';
  return `<ul class="concerns" aria-label="Skin concerns treated">${uniq.map(n => `<li><a class="concern" href="${pageUrl(CONCERNS[n][1])}" style="text-decoration:none">${imgTag(`face-skin-conditions-black${n}`, '')}${esc(CONCERNS[n][0])}</a></li>`).join('')}</ul>`;
}
// local lookup for icons by name
for (let i = 1; i <= 6; i++) { const k = Object.keys(IMG).find(k => k.toLowerCase().includes(`face-skin-conditions-black${i}.`)); if (k) IMG[`face-skin-conditions-black${i}`] = IMG[k]; }
for (const nm of ['face-logo-wordmark6', 'face-logo-stacked2', 'face-logo-print-monogram1']) { const k = Object.keys(IMG).find(k => k.toLowerCase().includes(nm)); if (k) IMG[nm] = IMG[k]; }

/* ---------------- block rendering ---------------- */
function heading(b, extra = '') {
  const cls = [extra, b.l >= 3 && weirdCaps(b.text) ? 'caps' : ''].filter(Boolean).join(' ');
  if (b.l === 4 && /\$|mins?\b|minutes|complimentary|per unit/i.test(b.text) && !/membership/i.test(b.text)) return `<h4 class="price-tag">${rewrite(b.html)}</h4>`;
  return `<h${b.l}${cls ? ` class="${cls}"` : ''}>${rewrite(b.html)}</h${b.l}>`;
}
function para(b) {
  const h = rewrite(b.html);
  if (/^\s*(<strong>)?\s*pairs well with/i.test(strip(b.html))) return `<p class="pairs">${h}</p>`;
  return `<p>${h}</p>`;
}
function list(b) { return `<${b.ordered ? 'ol' : 'ul'} class="check">${b.items.map(i => `<li>${rewrite(i)}</li>`).join('')}</${b.ordered ? 'ol' : 'ul'}>`; }
function table(b) { return `<div class="table-wrap"><table>${b.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>`; }

function flow(blocks, opts = {}) {
  // renders a sequence of blocks; groups runs of H3+P into feature cards
  const out = []; let i = 0; const icons = [];
  const btns = [];
  const hasIcons = blocks.some(b => b.t === 'img' && iconNum(b.src));
  while (i < blocks.length) {
    const b = blocks[i];
    if (hasIcons && isConcernLabel(b)) { i++; continue; }
    // feature run detection: >=3 consecutive (h3 + 1..2 p)
    if (b.t === 'h' && b.l === 3 && !opts.noFeatures) {
      const run = []; let j = i;
      while (j < blocks.length && blocks[j].t === 'h' && blocks[j].l === 3) {
        const item = [blocks[j]]; j++;
        while (j < blocks.length && blocks[j].t === 'p' && item.length < 3) { item.push(blocks[j]); j++; }
        if (item.length < 2) { j -= item.length; break; }
        run.push(item);
      }
      if (run.length >= 3 && run.every(it => it.slice(1).reduce((a, p) => a + strip(p.html).length, 0) < 650)) {
        out.push(`<div class="features" data-stagger>${run.map((it, k) => `<article class="feature"><span class="feature__num">${String(k + 1).padStart(2, '0')}</span>${heading(it[0])}${it.slice(1).map(para).join('')}</article>`).join('')}</div>`);
        i = j; continue;
      }
    }
    if (b.t === 'h') out.push(heading(b));
    else if (b.t === 'p') {
      if (/^★/.test(strip(b.html))) { i++; continue; }
      // run of short membership-price lines → price list
      if (/^(Smart Skin|The Accelerated|Accelerated)/i.test(strip(b.html)) && /\$/.test(b.html)) {
        const run = []; while (i < blocks.length && blocks[i].t === 'p' && /\$/.test(blocks[i].html) && /^(Smart Skin|The Accelerated|Accelerated)/i.test(strip(blocks[i].html))) run.push(blocks[i++]);
        out.push(`<div class="price-list">${run.map(r => { const t = strip(r.html); const m = t.match(/^(.*?)[\s|\-–]+(\$[\d.,]+.*)$/); return m ? `<p><span>${esc(m[1])}</span><strong>${esc(m[2])}</strong></p>` : `<p>${rewrite(r.html)}</p>`; }).join('')}</div>`);
        continue;
      }
      out.push(para(b));
    }
    else if (b.t === 'list') out.push(list(b));
    else if (b.t === 'table') out.push(table(b));
    else if (b.t === 'quote') out.push(`<blockquote class="pairs">${rewrite(b.html)}</blockquote>`);
    else if (b.t === 'btn') btns.push(b);
    else if (b.t === 'img') {
      if (iconNum(b.src)) icons.push(iconNum(b.src));
      else if (b.src) out.push(`<figure class="media-frame reveal-img" style="margin:30px 0">${imgTag(b.src, b.alt)}</figure>`);
    }
    else if (b.t === 'code' || b.t === 'other') out.push(flow(b.blocks, opts));
    i++;
  }
  const chips = opts.noChips ? '' : concernChips(icons);
  const btnHtml = btns.length ? `<div class="btn-row">${btns.map((b, k) => btn(b.text, b.href, k ? 'btn--ghost' : (opts.dark ? 'btn--light' : ''))).join('')}</div>` : '';
  return chips + out.join('\n') + btnHtml;
}

/* ---------------- section classifiers ---------------- */
const H = (s, l) => s.blocks.filter(b => b.t === 'h' && (!l || b.l === l));
const bigImgs = s => s.blocks.filter(b => b.t === 'img' && b.src && !iconNum(b.src) && !/logo|monogram/i.test(b.src));
const textLen = s => s.blocks.filter(b => b.t === 'p' || b.t === 'list').length;
const isNewsletter = s => s.blocks.length && s.blocks.every(b => b.t === 'newsletter');
const isTesti = s => s.blocks.some(b => b.t === 'p' && /^★/.test(strip(b.html)));
const isLegend = s => s.blocks.some(b => b.t === 'h' && /skin concern legend/i.test(b.text));
const isPathway = s => H(s).filter(b => /^(prevention|maintenance|reversal)$/i.test(b.text.trim())).length >= 2;
const isHeadOnly = s => s.blocks.length > 0 && s.blocks.length <= 3 && s.blocks.every(b => b.t === 'h') && !s.bg;
const isCTA = s => {
  const h2 = H(s, 2); const btns = s.blocks.filter(b => b.t === 'btn');
  if (!btns.length || s.blocks.some(b => b.t === 'list' || b.t === 'table')) return false;
  if (s.bg) return true;
  return h2.length === 1 && /book|ready|invest|today/i.test(h2[0].text) && textLen(s) <= 4 && H(s, 3).length === 0;
};
const isDualCTA = s => H(s, 2).length === 2 && s.blocks.filter(b => b.t === 'btn').length === 2 && textLen(s) === 0 && bigImgs(s).length >= 1;
const isServiceItem = s => {
  const b = s.blocks; if (!b.length || b[0].t !== 'h' || b[0].l !== 2) return false;
  if (bigImgs(s).length) return false;
  const hasIcons = b.some(x => x.t === 'img' && iconNum(x.src));
  const hasPrice = b[1] && b[1].t === 'h' && b[1].l === 4;
  return (hasPrice || hasIcons) && b.some(x => x.t === 'btn') && textLen(s) >= 1;
};
const isAddons = s => { const h2 = H(s, 2); return h2.length >= 3 && s.blocks.filter(b => b.t === 'h' && b.l === 4 && /\$/.test(b.text)).length >= 3; };
const isPlan = s => s.blocks[0]?.t === 'h' && s.blocks[0].l === 3 && s.blocks.some(b => b.t === 'p' && /\/\s*month/i.test(strip(b.html)));
const isGallery = s => bigImgs(s).length >= 3 && textLen(s) <= 2 && !s.blocks.some(b => b.t === 'btn' && b.href && !isBook(b.href));
const isProducts = s => { const imgs = bigImgs(s); const btns = s.blocks.filter(b => b.t === 'btn' && /alumiermd/i.test(b.href || '')); return imgs.length >= 3 && btns.length >= 3; };
const isTeamMember = s => s.blocks[0] && ((s.blocks[0].t === 'h' && s.blocks[0].l === 4) || (s.blocks[0].t === 'img' && s.blocks[1]?.t === 'h' && s.blocks[1].l === 4)) && bigImgs(s).length === 1 && H(s).length === 1 && textLen(s) >= 1 && textLen(s) <= 3;

/* ---------------- section renderers ---------------- */
let toneFlip = 0;
const nextTone = () => (toneFlip++ % 2 ? 'tone-cream' : '');
const wrap = (inner, cls = '', id = '') => `<section class="section ${cls}"${id ? ` id="${id}"` : ''}><div class="container">${inner}</div></section>`;
const headHtml = (blocks, center = false, dark = false) => blocks && blocks.length ? `<div class="sec-head reveal${center ? ' center' : ''}">${blocks.map(b => b.t === 'h' ? heading(b) : b.t === 'p' ? para(b) : '').join('')}</div>` : '';

function renderCTA(s, pendingHead) {
  const img = s.bg?.src || bigImgs(s)[0]?.src || 'face-skin-body-bar-calgary-injectables-laser-facial-1';
  const blocks = s.blocks.filter(b => !(b.t === 'img'));
  const h2 = blocks.find(b => b.t === 'h');
  const rest = blocks.filter(b => b !== h2 && b.t !== 'btn');
  const btns = blocks.filter(b => b.t === 'btn');
  return `<section class="cta"><div class="cta__bg" data-parallax>${imgTag(IMG[norm(img)] ? img : 'face-skin-body-bar-calgary-injectables-laser-facial-1', '')}</div><div class="container reveal">
    <span class="eyebrow" style="color:var(--sand)">Face Skin &amp; Body Bar · Calgary</span>
    ${h2 ? heading(h2) : ''}${rest.map(b => b.t === 'p' ? para(b) : b.t === 'h' ? heading(b) : '').join('')}
    <div class="btn-row">${btns.map((b, i) => btn(b.text, b.href, i ? 'btn--outline-light' : 'btn--light')).join('')}</div></div></section>`;
}
function renderDualCTA(s) {
  const parts = []; let cur = null;
  for (const b of s.blocks) { if (b.t === 'img' && !iconNum(b.src)) { cur = { img: b }; parts.push(cur); } else if (cur) { if (b.t === 'h') cur.h = b; if (b.t === 'btn') cur.btn = b; } }
  return wrap(`<div class="split" style="gap:18px;align-items:stretch">${parts.map((p, i) => `<a class="svc reveal" style="aspect-ratio:16/11;--d:${i * .1}s" href="${esc(link(p.btn?.href))}"${rel(link(p.btn?.href))}>${imgTag(p.img.src, p.img.alt)}<div class="svc__body">${p.h ? `<h2 style="color:var(--ivory);font-size:clamp(1.8rem,3vw,2.6rem);margin:0 0 14px">${esc(p.h.text)}</h2>` : ''}<span class="btn btn--light btn--sm">${esc(p.btn?.text || '')}${arrow}</span></div></a>`).join('')}</div>`, 'section--tight');
}
function renderTesti(s, head) {
  const quotes = []; const bl = s.blocks; let cur = null;
  for (const b of bl) {
    if (b.t !== 'p') continue; const t = strip(b.html);
    if (/^★/.test(t)) { cur = { stars: t, text: '', cite: '' }; quotes.push(cur); }
    else if (cur && !cur.text) cur.text = b.html;
    else if (cur && /^[-–—]/.test(t)) cur.cite = t.replace(/^[-–—]\s*/, '');
    else if (cur) cur.text += '<br><br>' + b.html;
  }
  const h = head && head.length ? head : [{ t: 'h', l: 2, text: 'Testimonials', html: 'Testimonials' }];
  return wrap(`${headHtml(h, true, true)}<div class="testi" data-stagger>${quotes.map(q => `<figure class="quote-card"><span class="quote-mark" aria-hidden="true">“</span><div class="stars" aria-label="5 stars">${esc(q.stars)}</div><blockquote>${rewrite(q.text)}</blockquote><figcaption><cite>${esc(q.cite)}</cite></figcaption></figure>`).join('')}</div>`, 'tone-dark');
}
function renderLegend(s) {
  const bl = s.blocks; const items = [];
  const titleIdx = bl.findIndex(b => b.t === 'h' && /legend/i.test(b.text));
  const before = bl.slice(0, titleIdx);
  for (let i = titleIdx + 1; i < bl.length; i++) {
    if (bl[i].t === 'img' && iconNum(bl[i].src)) { const lab = bl[i + 1]?.t === 'h' ? bl[i + 1] : null; items.push({ n: iconNum(bl[i].src), lab }); if (lab) i++; }
  }
  return `${before.length ? wrap(`<div class="sec-head reveal center body-flow">${flow(before).replace('class="btn-row"', 'class="btn-row" style="justify-content:center"')}</div>`, 'section--tight') : ''}
  <section class="section section--tight tone-cream"><div class="container"><div class="legend-title reveal"><div><span class="eyebrow">Find your concern</span>${heading(bl[titleIdx])}</div></div>
  <div class="legend" data-stagger>${items.map(it => `<a class="legend__item" href="${pageUrl(CONCERNS[it.n][1])}">${imgTag(`face-skin-conditions-black${it.n}`, CONCERNS[it.n][0])}${it.lab ? heading(it.lab) : `<h4>${esc(CONCERNS[it.n][0])}</h4>`}</a>`).join('')}</div></div></section>`;
}
function pathwayHtml(blocks) {
  const phases = []; let cur = null; const pre = [];
  for (const b of blocks) {
    if (b.t === 'h' && /^(prevention|maintenance|reversal)$/i.test(b.text.trim())) { cur = { h: b, items: [] }; phases.push(cur); }
    else if (cur && b.t === 'h' && b.l === 3) cur.items.push(b);
    else if (!cur) pre.push(b);
  }
  return { pre, html: `<div class="pathway" data-stagger>${phases.map(ph => `<div class="phase"><div class="phase__head">${heading(ph.h)}</div><ul>${ph.items.map(it => { const orig = (it.html.match(/href="([^"]+)"/) || [])[1]; const l = orig ? link(orig) : (treatmentLink(it.text) ? pageUrl(treatmentLink(it.text)) : ''); const inner = `<h3>${esc(it.text)}</h3>`; return `<li>${l ? `<a href="${esc(l)}"${rel(l)}>${inner}</a>` : `<span>${inner}</span>`}</li>`; }).join('')}</ul></div>`).join('')}</div>` };
}
function renderPathway(s, head) {
  const { pre, html } = pathwayHtml(s.blocks);
  const h = [...(head || []), ...pre.filter(b => b.t === 'h' || b.t === 'p')];
  return wrap(`${headHtml(h, true)}${html}`, 'tone-cream');
}
function renderMenu(items, head) {
  return wrap(`${headHtml(head)}<div class="menu-list">${items.map((s, k) => {
    const b = s.blocks; const h2 = b[0];
    let i = 1; const meta = []; while (b[i] && b[i].t === 'h' && b[i].l === 4) meta.push(b[i++]);
    const icons = b.filter(x => x.t === 'img' && iconNum(x.src)).map(x => iconNum(x.src));
    const body = b.slice(i).filter(x => !(x.t === 'img' && iconNum(x.src)));
    const priceLines = [];
    // membership pricing lines directly after the main price (chemical peels)
    while (meta.length > 1 && /membership|smart skin|accelerated/i.test(meta[1].text)) priceLines.push(meta.splice(1, 1)[0]);
    return `<article class="menu-card reveal" id="${esc(h2.text.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}"><div class="menu-card__head"><span class="menu-card__idx">${String(k + 1).padStart(2, '0')} —</span>${heading(h2)}${meta.map(m => heading(m)).join('')}${priceLines.length ? `<div class="price-list">${priceLines.map(p => /membership pricing/i.test(p.text) ? `<p><strong>${esc(p.text)}</strong></p>` : `<p><span>${esc(p.text.split('|')[0])}</span><strong>${esc(p.text.split('|')[1] || '')}</strong></p>`).join('')}</div>` : ''}${concernChips(icons)}</div>
      <div class="menu-card__body body-flow">${flow(body, { noChips: true })}</div></article>`;
  }).join('')}</div>`, nextTone());
}
function renderAddons(s, head) {
  const items = []; let cur = null; const pre = [];
  for (const b of s.blocks) { if (b.t === 'h' && b.l === 2) { cur = { h: b, rest: [] }; items.push(cur); } else if (cur) cur.rest.push(b); else pre.push(b); }
  return wrap(`${headHtml([...(head || []), ...pre])}<div class="addons" data-stagger>${items.map(it => `<article class="addon">${heading(it.h)}${it.rest.map(b => b.t === 'h' ? `<h4>${esc(b.text)}</h4>` : b.t === 'p' ? para(b) : '').join('')}</article>`).join('')}</div>`, 'tone-cream');
}
function renderPlans(items, head) {
  return wrap(`${headHtml(head, true)}<div class="plans" data-stagger>${items.map(s => {
    const b = s.blocks; const price = b.find(x => x.t === 'p' && /\/\s*month/i.test(strip(x.html)));
    return `<article class="plan"><div class="plan__tier">Skin Investment Club</div>${heading(b[0])}<div class="plan__price">${esc(strip(price.html))}</div>${b.slice(1).filter(x => x !== price).map(x => x.t === 'p' ? para(x) : x.t === 'list' ? list(x) : '').join('')}</article>`;
  }).join('')}</div>`, 'tone-cream');
}
function renderGallery(s, head) {
  const imgs = bigImgs(s); const text = s.blocks.filter(b => b.t === 'h' || b.t === 'p');
  const isBA = /before|after/i.test(text.map(t => strip(t.html || t.text)).join(' ')) || /before|after|b-a|ipl|filler/i.test(imgs.map(i => i.src).join(' '));
  return wrap(`${headHtml([...(head || []), ...text], true)}<div class="gallery${isBA ? ' gallery--contain' : ''}" data-stagger>${imgs.map(im => `<button type="button" data-full="${imgSrc(im.src)}" aria-label="Enlarge image">${imgTag(im.src, im.alt || strip(text[0]?.html || text[0]?.text || ''))}</button>`).join('')}</div>${s.blocks.some(b => b.t === 'btn') ? `<div class="btn-row" style="justify-content:center">${s.blocks.filter(b => b.t === 'btn').map(b => btn(b.text, b.href)).join('')}</div>` : ''}`, nextTone());
}
function renderProducts(sections) {
  const items = [];
  for (const s of sections) { let im = null; for (const b of s.blocks) { if (b.t === 'img') im = b; if (b.t === 'btn' && im) { items.push({ im, b }); im = null; } } }
  return wrap(`<div class="products" data-stagger>${items.map(({ im, b }) => `<a class="product" href="${esc(link(b.href))}" target="_blank" rel="noopener"><div class="product__img">${imgTag(im.src, im.alt || b.text)}</div><div class="product__name"><span>${esc(b.text)}</span><span aria-hidden="true">↗</span></div></a>`).join('')}</div>`, 'tone-cream');
}
let splitFlip = 0;
function renderGeneric(s, head) {
  const imgs = bigImgs(s);
  const dark = false;
  const tone = nextTone();
  let blocks = s.blocks.filter(b => b.t !== 'newsletter');
  // financing image link
  if (imgs.length === 1 && imgs[0].link && textLen(s) === 0) {
    const im = imgs[0];
    return wrap(`<div class="finance reveal"><div><span class="eyebrow">Financing</span><h3 style="margin:0">Medicard</h3></div><a href="${esc(link(im.link))}" target="_blank" rel="noopener">${imgTag(im.src, im.alt || 'Medicard financing')}</a>${btn('Apply Now', im.link, 'btn--ghost')}</div>`, 'section--tight');
  }
  if (imgs.length === 1 && (textLen(s) >= 1 || H(s).length >= 1)) {
    const im = imgs[0];
    const text = blocks.filter(b => b !== im);
    const rev = splitFlip++ % 2 ? ' split--rev' : '';
    return wrap(`${headHtml(head)}<div class="split${rev}${textLen(s) > 6 ? ' split--top' : ''}"><div class="split__media"><figure class="media-frame media-frame--tall reveal-img" style="margin:0;${textLen(s) > 6 ? `position:sticky;top:calc(var(--header-h) + 30px)` : ''}">${imgTag(im.src, im.alt || strip(text.find(b => b.t === 'h')?.text || ''))}</figure></div><div class="body-flow reveal">${flow(text)}</div></div>`, tone);
  }
  if (imgs.length >= 2) {
    const text = blocks.filter(b => !imgs.includes(b));
    return wrap(`${headHtml(head)}<div class="narrow body-flow reveal" style="margin:0 auto">${flow(text)}</div><div class="gallery gallery--contain" style="margin-top:50px" data-stagger>${imgs.map(im => `<button type="button" data-full="${imgSrc(im.src)}" aria-label="Enlarge image">${imgTag(im.src, im.alt)}</button>`).join('')}</div>`, tone);
  }
  // no images
  const first = blocks[0];
  if (first && first.t === 'h' && first.l === 2 && blocks.length > 2 && !head?.length) {
    const headBlocks = [first]; let i = 1;
    return wrap(`<div class="two-col"><div class="two-col__head reveal">${headBlocks.map(heading).join('')}</div><div class="body-flow reveal">${flow(blocks.slice(i))}</div></div>`, tone);
  }
  return wrap(`${headHtml(head)}<div class="narrow body-flow reveal"${head?.length ? '' : ''}>${flow(blocks)}</div>`, tone);
}

function renderSections(sections, opts = {}) {
  const out = []; let pending = null;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (isNewsletter(s)) continue;
    if (isHeadOnly(s) && i < sections.length - 1 && !isNewsletter(sections[i + 1])) { pending = [...(pending || []), ...s.blocks]; continue; }
    const head = pending; pending = null;
    if (isLegend(s)) { out.push(renderLegend(s)); continue; }
    if (isTesti(s)) { out.push(renderTesti(s, head)); continue; }
    if (isDualCTA(s)) { out.push(renderDualCTA(s)); continue; }
    if (isCTA(s)) { if (head) out.push(wrap(headHtml(head, true), 'section--tight')); out.push(renderCTA(s)); continue; }
    if (isPathway(s)) { out.push(renderPathway(s, head)); continue; }
    if (isAddons(s)) { out.push(renderAddons(s, head)); continue; }
    if (isProducts(s)) { const group = [s]; while (sections[i + 1] && isProducts(sections[i + 1])) group.push(sections[++i]); out.push(renderProducts(group)); continue; }
    if (isPlan(s)) { const group = [s]; while (sections[i + 1] && isPlan(sections[i + 1])) group.push(sections[++i]); out.push(renderPlans(group, head)); continue; }
    if (isServiceItem(s)) { const group = [s]; while (sections[i + 1] && isServiceItem(sections[i + 1])) group.push(sections[++i]); out.push(renderMenu(group, head)); continue; }
    if (isGallery(s)) { out.push(renderGallery(s, head)); continue; }
    out.push(renderGeneric(s, head));
  }
  if (pending) out.push(wrap(headHtml(pending, true), 'section--tight'));
  return out.join('\n');
}

/* ---------------- navigation data ---------------- */
const NAV = site.nav.filter(n => !/^\+1/.test(n.text)).map(n => ({ ...n, text: n.text.replace(/â„¢/g, '™').replace(/â€™/g, '’') }));
function navParent(slug) {
  for (const n of NAV) { if (n.children?.some(c => c.href === '/' + slug)) return n; if (n.href === '/' + slug) return null; }
  if (/^journal\//.test(slug)) return { text: 'Journal', href: '/journal' };
  return null;
}
const NAV_IMG = {
  'Medical Aesthetics': 'face-skin-body-bar-calgary-injectables-laser-treatments-5', Facials: 'face-skin-body-bar-calgary-injectables-laser-facial-24',
  Conditions: 'face-skin-body-bar-calgary-injectables-laser-facial-9', Neuromodulators: 'face-skin-body-bar-calgary-injectables-laser-treatments-1',
  'Dermal Fillers': 'dermal-fillers-calgary', 'Skincare Products': 'shop-essentials', 'About Us': 'face-skin-body-bar-calgary-injectables-laser-facial-1',
};
const findImg = key => { const k = Object.keys(IMG).find(k => k.toLowerCase().includes('/' + key.toLowerCase() + '.') || k.toLowerCase().endsWith('/' + key.toLowerCase())); return k || key; };
const descOf = href => { const slug = (href || '').replace(/^\//, ''); const f = contentFiles.find(x => slugOf(x) === slug); return f ? C(f).description : ''; };

function headerHtml() {
  const items = NAV.map((n, i) => {
    if (!n.children) return `<div class="nav__item"><a class="nav__link" href="${link(n.href)}">${esc(n.text)}</a></div>`;
    const kids = n.children.filter((c, k, a) => !(n.text === 'Skincare Products' && k > 0 && a.findIndex(x => x.text === c.text) !== k));
    const first = kids.find(c => c.href?.startsWith('/'));
    const shopCats = n.text === 'Skincare Products';
    return `<div class="nav__item" data-mega><button class="nav__link" aria-expanded="false" aria-controls="mega-${i}">${esc(n.text)}${chev}</button>
      <div class="mega" id="mega-${i}"><div class="mega__inner"><div class="mega__intro"><span class="eyebrow">Face Skin &amp; Body Bar</span><h3>${esc(n.text)}</h3><p>${esc(descOf(first?.href))}</p>${first ? `<a class="link-arrow" href="${link(first.href)}">Explore</a>` : ''}</div>
      <div class="mega__links">${(shopCats ? kids.slice(0, 10) : kids).map(c => `<a href="${esc(link(c.href))}"${rel(link(c.href))}>${esc(c.text.replace(/â„¢/g, '™').replace(/â€™/g, '’'))}</a>`).join('')}</div>
      <div class="mega__img">${imgTag(findImg(NAV_IMG[n.text] || ''), '')}</div></div></div></div>`;
  }).join('');
  const mobile = NAV.map(n => n.children ? `<div class="mm__group"><button class="mm__toggle" aria-expanded="false">${esc(n.text)}<span>+</span></button><div class="mm__panel"><div>${n.children.filter((c, k, a) => a.findIndex(x => x.text === c.text) === k).map(c => `<a href="${esc(link(c.href))}"${rel(link(c.href))}>${esc(c.text.replace(/â„¢/g, '™').replace(/â€™/g, '’'))}</a>`).join('')}</div></div></div>` : `<div class="mm__group"><a class="mm__single" href="${link(n.href)}">${esc(n.text)}</a></div>`).join('');
  const ann = (site.announce || '').replace(/â€¢/g, '•');
  const annParts = ann.split('•').map(s => s.trim()).filter(Boolean);
  const annHtml = annParts.map(a => `<span>${esc(a)}</span>`).join('');
  return `<a class="skip" href="#main">Skip to content</a>
<div class="announce" role="note" aria-label="${esc(ann)}"><div class="announce__track" aria-hidden="true">${annHtml}${annHtml}${annHtml}${annHtml}</div></div>
<header class="header"><div class="container header__inner">
  <a class="logo" href="${P}" aria-label="Face Skin &amp; Body Bar — Home">${imgTag('face-logo-wordmark6', 'Face Skin & Body Bar', '', true).replace(/ width="\d+" height="\d+"/, ' width="120" height="47"')}</a>
  <nav class="nav" aria-label="Main">${items}</nav>
  <div class="header__actions"><a class="header__phone" href="tel:403-454-5607">+1 (403) 454-5607</a>${btn('Book Now / Gift Cards', BOOK, 'btn--sm btn--book-gift')}</div>
  <button class="burger" aria-label="Menu" aria-expanded="false" aria-controls="mobile-menu"><span></span><span></span></button>
</div></header>
<div class="mobile-menu" id="mobile-menu">${mobile}<div class="mm__foot">${btn('Book Now', BOOK)}${btn('Gift Cards', GIFT, 'btn--ghost')}<a class="link-arrow" href="tel:403-454-5607">+1 (403) 454-5607</a></div></div>`;
}

const ICON = {
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3c-2.8 0-4 1.7-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6 1-.6z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.3 2.3 1.7 3.8 4 4v3.2c-1.5.1-2.8-.4-4-1.2v6.3c0 4-3.4 6.2-6.6 5.5-3.7-.8-5-5.2-2.7-8 1.2-1.4 3.1-2.1 5-1.8v3.3c-1.4-.4-2.9.3-3.1 1.8-.2 1.3.8 2.5 2.1 2.5 1.4 0 2.2-1 2.2-2.4V3h3.1z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 11-.01 5 2.5 2.5 0 01.01-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9V21H9z"/></svg>',
};
function footerHtml() {
  const f = site.footer;
  const hoursP = f.find(b => b.t === 'p' && /Monday/.test(b.html));
  const hours = strip(hoursP.html.replace(/<br>/g, '\n').replace(/<\/?strong>/g, '|')).split(/(?=\|?(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))/).filter(x => /day/.test(x));
  const hoursHtml = hoursP.html.split(/<br>/).map(l => { const t = strip(l).replace(/:\s*(?=\d)/, ': '); const m = t.match(/^(\w+):\s*(.*)$/); return m ? `<p><strong>${m[1]}</strong><span>${esc(m[2])}</span></p>` : ''; }).join('');
  const linksAfter = title => { const i = f.findIndex(b => b.t === 'h' && b.text.toLowerCase() === title.toLowerCase()); const out = []; for (let k = i + 1; k < f.length; k++) { const b = f[k]; if (b.t === 'h' && !/href/.test(b.html)) break; if (b.t === 'img') break; if (b.t === 'h') out.push(b); } return out; };
  const li = arr => arr.map(b => `<li>${rewrite(b.html.replace(/>([^<]+)</, (m, t) => '>' + t.toLowerCase().replace(/(^|\s|\/|&amp;\s)(\w)/g, (x, a, c) => a + c.toUpperCase()) + '<'))}</li>`).join('');
  const more = f.filter(b => b.t === 'p' && /href="\/(join|journal|terms|cancellation|privacy)/.test(b.html)).map(b => `<li>${rewrite(b.html.replace(/>([^<]+)</, (m, t) => '>' + t.trim().toLowerCase().replace(/(^|\s)(\w)/g, (x, a, c) => a + c.toUpperCase()) + '<'))}</li>`).join('');
  const copy = f.find(b => b.t === 'p' && /©/.test(b.html));
  return `<section class="newsletter" aria-labelledby="nl-title"><div class="container newsletter__inner"><div class="reveal"><span class="eyebrow">Stay in the glow</span><h2 id="nl-title">Sign Up for Our Newsletter</h2></div>
  <div class="reveal"><form class="nl-form" novalidate><label class="skip" for="nl-email">Email Address</label><input id="nl-email" type="email" name="email" placeholder="Email Address" autocomplete="email" required>${btn('Sign Up', '#')}</form><p class="nl-msg" role="status"></p></div></div></section>
<footer class="footer"><div class="container">
  <div class="footer__top">
    <div class="footer__brand">${imgTag('face-logo-stacked2', 'Face Skin & Body Bar')}<h4>Location</h4><p>#126 – 620 10th Ave SW<br>Calgary, AB<br>T2R 1C3</p><p><a href="tel:14034545607">+1 (403) 454-5607</a><br><a href="mailto:reception@faceskinandbody.ca">Email Us Here</a></p>
      <div class="social"><a href="https://www.instagram.com/faceskinandbody/" target="_blank" rel="noopener" aria-label="Instagram">${ICON.instagram}</a><a href="https://m.facebook.com/faceskinandbody" target="_blank" rel="noopener" aria-label="Facebook">${ICON.facebook}</a><a href="https://www.tiktok.com/@faceskinandbody" target="_blank" rel="noopener" aria-label="TikTok">${ICON.tiktok}</a><a href="https://www.linkedin.com/company/face-skin-body-bar" target="_blank" rel="noopener" aria-label="LinkedIn">${ICON.linkedin}</a></div></div>
    <div><h4>Treatments</h4><ul>${li(linksAfter('Treatments'))}</ul></div>
    <div><h4>Skin Concerns</h4><ul>${li(linksAfter('Skin Concerns'))}</ul></div>
    <div><h4>Shop AlumierMD</h4><ul>${li(linksAfter('Shop AlumierMD'))}</ul></div>
    <div><h4>Hours</h4><div class="footer__hours">${hoursHtml}</div><h4 style="margin-top:30px">More Details</h4><ul>${more}</ul></div>
  </div>
  <svg class="footer__mega" viewBox="0 0 1000 150" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><text x="500" y="118" text-anchor="middle" textLength="990" lengthAdjust="spacingAndGlyphs">face skin &amp; body</text></svg>
  <div class="footer__bottom"><span>${strip(copy.html).replace(/\|\s*Web design by.*$/, '').replace(/Â/g, '')}</span><span><a href="${link('/terms-conditions')}">Terms &amp; Conditions</a> · <a href="${link('/privacy-policy')}">Privacy Policy</a> · <a href="${link('/cancellation-policy')}">Cancellation Policy</a></span></div>
</div></footer>
<a class="btn fab" href="${BOOK}" target="_blank" rel="noopener"><span>Book Now</span>${arrow}</a>
<div class="lightbox" role="dialog" aria-modal="true" aria-label="Image viewer"><button class="lb-close" aria-label="Close">✕</button><button class="lb-prev" aria-label="Previous">←</button><img alt=""><button class="lb-next" aria-label="Next">→</button></div>`;
}

/* ---------------- document shell ---------------- */
function layout(page, body, { slug, three = false, crumbs = [] } = {}) {
  const cine = body.includes('data-cine');
  const canonical = SITE + (slug ? '/' + slug : '');
  const og = page.ogImage ? page.ogImage.replace(/^http:/, 'https:') : '';
  const ld = (page.ldjson || []).map(j => `<script type="application/ld+json">${j.replace(/<\/script/gi, '<\\/script')}</script>`).join('\n');
  const bc = crumbs.length ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ name: 'Home', url: SITE }, ...crumbs].map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })) })}</script>` : '';
  return `<!doctype html>
<html lang="en-CA" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:site_name" content="Face Skin &amp; Body Bar">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="${page.post ? 'article' : 'website'}">
${og ? `<meta property="og:image" content="${esc(og)}">\n<meta name="twitter:image" content="${esc(og)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.title)}">
<meta name="twitter:description" content="${esc(page.description)}">
<meta name="theme-color" content="#f8f4ee">
<link rel="icon" href="${P}assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300;1,9..144,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
${cine ? `<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"}}</script>` : ''}
<link rel="stylesheet" href="${P}assets/css/style.css?v=${VER}">
${ld}
${bc}
</head>
<body${cine ? ' class="has-cine"' : ''}>
${headerHtml()}
<main id="main">
${body}
</main>
${footerHtml()}
<script src="${P}assets/js/main.js?v=${VER}" defer></script>
${cine ? `<script type="module" src="${P}assets/js/hero.js?v=${VER}"></script>` : ''}
</body>
</html>
`;
}

function crumbsHtml(slug, title) {
  const parent = navParent(slug);
  const items = [`<a href="${P}">Home</a>`];
  const ld = [];
  if (parent) { const ph = parent.children ? parent.children.find(c => c.href?.startsWith('/'))?.href : parent.href; if (ph && ph !== '/' + slug) { items.push(`<a href="${link(ph)}">${esc(parent.text)}</a>`); ld.push({ name: parent.text, url: SITE + ph }); } else if (parent.text) items.push(`<span>${esc(parent.text)}</span>`); }
  items.push(`<span aria-current="page">${esc(title)}</span>`);
  ld.push({ name: title, url: SITE + '/' + slug });
  return { html: `<nav class="crumbs" aria-label="Breadcrumb">${items.join('<span aria-hidden="true">/</span>')}</nav>`, ld };
}

/* ---------------- page hero ---------------- */
function extractHero(page) {
  const secs = page.sections.map(s => ({ ...s, blocks: [...s.blocks] }));
  let hIdx = secs.findIndex((s, i) => i < 3 && s.blocks.some(b => b.t === 'h' && b.l === 1));
  let heroImg = null, icon = null; const hero = { h1: null, sub: null, paras: [], btns: [] };
  if (hIdx < 0) hIdx = 0;
  for (let i = 0; i <= hIdx; i++) {
    const s = secs[i];
    if (!heroImg) { const im = bigImgs(s)[0] || (s.bg && i < hIdx ? s.bg : null); if (im) { heroImg = im; s.blocks = s.blocks.filter(b => b !== im); } }
  }
  const s = secs[hIdx];
  const bl = s.blocks; let k = bl.findIndex(b => b.t === 'h' && b.l === 1);
  // blocks before the h1 (icons etc.)
  bl.slice(0, Math.max(k, 0)).forEach(b => { if (b.t === 'img' && iconNum(b.src)) icon = iconNum(b.src); });
  if (k >= 0) {
    hero.h1 = bl[k]; k++;
    if (bl[k] && bl[k].t === 'h' && bl[k].l === 2 && !(bl[k + 1] && bl[k + 1].t === 'h' && bl[k + 1].l === 3)) hero.sub = bl[k++];
    while (bl[k] && (bl[k].t === 'p' || bl[k].t === 'btn')) { (bl[k].t === 'p' ? hero.paras : hero.btns).push(bl[k]); k++; }
    s.blocks = bl.slice(k);
  }
  // trailing concern icons + their labels → move into the hero as chips
  const remaining = s.blocks;
  if (remaining.length && remaining.every(b => (b.t === 'img' && iconNum(b.src)) || isConcernLabel(b))) {
    hero.icons = remaining.filter(b => b.t === 'img').map(b => iconNum(b.src));
    s.blocks = [];
  }
  const rest = secs.filter((x, i) => i > hIdx || (i === hIdx && x.blocks.length));
  // drop leading image-only sections already consumed
  return { hero, heroImg, icon, rest: rest.filter(x => x.blocks.length || x.bg) };
}
function pageHero(page, slug, { hero, heroImg, icon }, opts = {}) {
  const title = hero.h1 ? strip(hero.h1.text) : page.title.split('—')[0].trim();
  const parentName = navParent(slug)?.text;
  const crumbs = crumbsHtml(slug, (NAV.flatMap(n => n.children || [n]).find(c => c.href === '/' + slug)?.text || title).replace(/â„¢/g, '™').replace(/â€™/g, '’'));
  const img = heroImg?.src || 'face-skin-body-bar-calgary-injectables-laser-facial-1';
  const btns = hero.btns.length ? hero.btns : [{ text: 'Book Now', href: BOOK }];
  const chips = icon || hero.icons ? concernChips([icon, ...(hero.icons || [])]) : '';
  let html = cineHero({
    img: resolveImg(img) ? img : 'face-skin-body-bar-calgary-injectables-laser-facial-1', alt: heroImg?.alt || title,
    crumbs: crumbs.html, eyebrow: `${parentName || 'Face Skin & Body Bar'} · Calgary`,
    h1: hero.h1 ? rewrite(hero.h1.html) : esc(title), sub: hero.sub ? `<h2 class="cine__sub reveal">${rewrite(hero.sub.html)}</h2>` : '',
    btns: btns.map((b, i) => btn(b.text, b.href, i ? 'btn--outline-light' : 'btn--light')).join('') + (hero.btns.length < 2 && !opts.noCall ? `<a class="btn btn--outline-light" href="tel:403-454-5607"><span>+1 (403) 454-5607</span>${arrow}</a>` : ''),
  });
  if (hero.paras.length || chips) {
    html += `<section class="intro"><div class="container"><div class="intro__grid">
      <div class="intro__aside reveal"><span class="eyebrow">Overview</span>${chips ? `<p class="intro__label">Skin concerns</p>${chips}` : ''}</div>
      <div class="intro__body reveal">${hero.paras.map((p, i) => i === 0 ? `<p class="intro__lead">${rewrite(p.html)}</p>` : para(p)).join('')}</div>
    </div></div></section>`;
  }
  return { html, crumbsLd: crumbs.ld };
}
function cineHero({ img, alt, crumbs = '', eyebrow = '', h1, sub = '', btns = '', small = false }) {
  return `<section class="cine cine--page${small ? ' cine--small' : ''}" data-cine>
  <div class="cine__fallback">${imgTag(img, alt, 'is-first', true)}</div>
  <canvas class="cine__canvas" aria-hidden="true"></canvas>
  <div class="cine__shade" aria-hidden="true"></div>
  <div class="container cine__content">${crumbs}<span class="eyebrow eyebrow--light reveal">${esc(eyebrow)}</span>
    <h1 class="cine__title reveal">${h1}</h1>${sub}
    ${btns ? `<div class="btn-row reveal">${btns}</div>` : ''}</div>
</section>`;
}

/* ---------------- page types ---------------- */
function writePage(slug, html) {
  const file = slug ? path.join(OUT, slug, 'index.html') : path.join(OUT, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}
const setDepth = slug => { P = slug ? '../'.repeat(slug.split('/').length) : './'; CUR = slug; toneFlip = 0; splitFlip = 0; };

function buildGeneric(f) {
  const page = C(f); const slug = slugOf(f); setDepth(slug);
  const ex = extractHero(page);
  const { html: heroHtml, crumbsLd } = pageHero(page, slug, ex);
  const body = heroHtml + renderSections(ex.rest);
  writePage(slug, layout(page, body, { slug, three: true, crumbs: crumbsLd }));
}

const LEGAL = ['terms-conditions', 'privacy-policy', 'cancellation-policy', 'join-the-team'];
function buildLegal(f) {
  const page = C(f); const slug = slugOf(f); setDepth(slug);
  const all = page.sections.flatMap(s => s.blocks).filter(b => b.t !== 'newsletter');
  const h1 = all.find(b => b.t === 'h' && b.l === 1);
  const title = h1 ? h1.text : page.title.split('—')[0].trim();
  const crumbs = crumbsHtml(slug, title);
  const rest = all.filter(b => b !== h1 && !(b.t === 'img' && !b.link));
  const body = `<section class="phero" style="padding-bottom:40px"><div class="container narrow">${crumbs.html}<span class="eyebrow">Face Skin &amp; Body Bar</span><h1 class="reveal">${esc(title)}</h1></div></section>
  <section class="section" style="padding-top:20px"><div class="container narrow"><div class="prose body-flow" style="--x:0">${flow(rest, { noFeatures: true })}</div></div></section>`;
  writePage(slug, layout(page, body.replace('class="prose body-flow"', 'class="body-flow"'), { slug, crumbs: crumbs.ld }));
}

function buildContact() {
  const f = 'contact-us'; const page = C(f); const slug = f; setDepth(slug);
  const bl = page.sections.flatMap(s => s.blocks);
  const img = bl.find(b => b.t === 'img');
  const crumbs = crumbsHtml(slug, 'Contact Us');
  const groups = []; let cur = null;
  for (const b of bl) { if (b.t === 'h' && b.l === 4) { cur = { h: b, items: [] }; groups.push(cur); } else if (cur && b.t === 'p') cur.items.push(b); }
  const book = bl.find(b => b.t === 'btn');
  const parking = groups.find(g => /parking/i.test(g.h.text));
  const info = groups.filter(g => g !== parking);
  const body = cineHero({ img: img.src, alt: img.alt, crumbs: crumbs.html, eyebrow: 'Calgary · Beltline', h1: 'Contact',
      sub: `<p class="cine__sub reveal">${rewrite(info[0].items[0].html)}</p>`,
      btns: btn(book.text, book.href, 'btn--light') + `<a class="btn btn--outline-light" href="tel:403-454-5607"><span>(403) 454-5607</span>${arrow}</a>` }) + `
  <section class="intro"><div class="container"><div class="intro__grid"><div class="intro__aside reveal"><span class="eyebrow">Location</span></div><div class="intro__body reveal">${info[0].items.slice(1).map(p => `<p class="intro__lead">${rewrite(p.html)}</p>`).join('')}</div></div></div></section>
  <section class="section" style="padding-top:0"><div class="container"><div class="info-grid" data-stagger>${info.map(g => `<div class="info">${heading(g.h)}${g.items.map(p => /Monday/.test(p.html) ? `<div class="footer__hours" style="color:var(--text)">${p.html.split('<br>').map(l => { const m = strip(l).match(/^(\w+):\s*(.*)$/); return m ? `<p style="max-width:none;border-bottom:1px solid var(--line);padding:6px 0"><strong>${m[1]}</strong><span>${esc(m[2])}</span></p>` : ''; }).join('')}</div>` : para(p)).join('')}</div>`).join('')}</div></div></section>
  <section class="section tone-cream"><div class="container"><div class="split"><div class="reveal">${parking ? `<span class="eyebrow">Getting here</span><h2>${esc(parking.h.text)}</h2>${parking.items.map(para).join('')}` : ''}</div>
    <div class="map reveal"><iframe title="Map to Face Skin & Body Bar" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent('620 10th Ave SW #126, Calgary, AB T2R 1C3')}&output=embed"></iframe></div></div></div></section>`;
  writePage(slug, layout(page, body, { slug, three: true, crumbs: crumbs.ld }));
}

function buildStory() {
  const f = 'our-story'; const page = C(f); const slug = f; setDepth(slug);
  const ex = extractHero(page);
  const { html: heroHtml, crumbsLd } = pageHero(page, slug, ex);
  const secs = ex.rest.filter(s => !isNewsletter(s));
  // founders section: H2 Meet the Team + H4s
  const fIdx = secs.findIndex(s => s.blocks.some(b => b.t === 'h' && /meet the team/i.test(b.text)));
  let founders = '';
  if (fIdx >= 0) {
    const s = secs[fIdx]; const im = bigImgs(s)[0];
    const groups = []; let cur = null;
    for (const b of s.blocks) { if (b.t === 'h' && b.l === 4) { cur = { h: b, ps: [] }; groups.push(cur); } else if (cur && b.t === 'p') cur.ps.push(b); }
    founders = wrap(`<div class="split"><div class="split__media"><figure class="media-frame media-frame--tall reveal-img" style="margin:0">${imgTag(im.src, im.alt || 'Face Skin & Body Bar founders')}</figure><div class="media-badge" aria-hidden="true"><svg viewBox="0 0 100 100"><defs><path id="c2" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0"/></defs><text><textPath textLength="236" lengthAdjust="spacing" href="#c2">Meet the Team · Face Skin &amp; Body ·</textPath></text></svg>${imgTag('face-logo-print-monogram1', '')}</div></div>
      <div class="reveal"><span class="eyebrow">Our Founders</span>${heading(H(s, 2)[0])}${groups.map(g => `<div style="margin-top:34px">${heading(g.h)}${g.ps.map(para).join('')}</div>`).join('')}</div></div>`, 'tone-cream');
  }
  const members = secs.filter((s, i) => i !== fIdx && isTeamMember(s));
  const team = members.length ? wrap(`<div class="sec-head center reveal"><span class="eyebrow">Our Experts</span></div><div class="team" data-stagger>${members.map(s => {
    const im = bigImgs(s)[0]; const h = H(s, 4)[0]; const ps = s.blocks.filter(b => b.t === 'p');
    return `<article class="member"><div class="member__img">${imgTag(im.src, im.alt || strip(h.text))}</div><div class="member__body">${heading(h)}${para(ps[0])}${ps.length > 1 ? `<div class="member__more"><div>${ps.slice(1).map(para).join('')}</div></div><button class="member__toggle link-arrow" aria-expanded="false">Read more</button>` : ''}</div></article>`;
  }).join('')}</div>`) : '';
  const others = secs.filter((s, i) => i !== fIdx && !members.includes(s));
  const body = heroHtml + founders + team + renderSections(others);
  writePage(slug, layout(page, body, { slug, three: true, crumbs: crumbsLd }));
}

function dedupePosts() { const j = C('journal'); const seen = new Set(); return j.posts.filter(p => p.title.length < 160 && p.href && !seen.has(p.href) && seen.add(p.href)); }
function fmtDate(d) { try { return new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return d; } }
function postCard(p, feature = false) {
  return `<a class="post-card${feature ? ' post-card--feature' : ''}" href="${link(p.href)}"><div class="post-card__img">${p.img ? imgTag(p.img, p.title) : ''}</div><div><time datetime="${esc(p.date)}">${fmtDate(p.date)}</time><h3>${esc(p.title)}</h3>${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ''}<span class="link-arrow">Read article</span></div></a>`;
}
function buildJournal() {
  const page = C('journal'); const slug = 'journal'; setDepth(slug);
  const posts = dedupePosts();
  const crumbs = crumbsHtml(slug, 'Journal');
  const body = `${cineHero({ img: findImg('face-skin-body-bar-calgary-injectables-laser-facial-7'), alt: 'Skincare Journal', crumbs: crumbs.html, eyebrow: 'Skincare Journal', h1: 'Journal', small: true })}
  <section class="section"><div class="container"><div class="posts">${postCard(posts[0], true)}${posts.slice(1).map(p => postCard(p)).join('')}</div></div></section>`;
  writePage(slug, layout(page, body, { slug, crumbs: crumbs.ld }));
}
function buildPost(f) {
  const page = C(f); const slug = slugOf(f); setDepth(slug);
  const posts = dedupePosts(); const me = posts.find(p => p.href === '/' + slug) || {};
  const crumbs = crumbsHtml(slug, page.post.title);
  const blocks = page.sections.flatMap(s => s.blocks);
  const related = posts.filter(p => p.href !== '/' + slug).slice(0, 3);
  const body = `<article>${cineHero({ img: me.img || 'face-skin-body-bar-calgary-injectables-laser-facial-1', alt: page.post.title, crumbs: crumbs.html, eyebrow: 'Journal', h1: esc(page.post.title), small: true,
      sub: `<div class="post-meta cine__meta reveal"><time datetime="${esc(page.post.datetime || me.date)}">${fmtDate(page.post.datetime || me.date)}</time>${page.post.author ? `<span>${esc(page.post.author)}</span>` : ''}</div>` })}
  <section class="section" style="padding-top:40px"><div class="container narrow"><div class="prose body-flow">${flow(blocks, { noFeatures: true }).replace(/<figure class="media-frame reveal-img" style="margin:30px 0">/g, '<figure>')}</div>
  <div class="btn-row">${btn('Book Now', BOOK)}<a class="btn btn--ghost" href="${link('/journal')}"><span>All Articles</span>${arrow}</a></div></div></section></article>
  <section class="section tone-cream"><div class="container"><div class="sec-head reveal"><span class="eyebrow">Keep reading</span><h2>More from the Journal</h2></div><div class="posts" data-stagger>${related.map(p => postCard(p)).join('')}</div></div></section>`;
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: page.post.title, datePublished: page.post.datetime || me.date, author: { '@type': 'Person', name: (page.post.author || '').replace(/^Written by\s*/i, '') || 'Face Skin & Body Bar' }, publisher: { '@type': 'Organization', name: 'Face Skin & Body Bar' }, mainEntityOfPage: SITE + '/' + slug, description: page.description });
  page.ldjson = [...(page.ldjson || []), ld];
  writePage(slug, layout(page, body, { slug, crumbs: crumbs.ld }));
}

/* ---------------- home ---------------- */
function buildHome() {
  const page = C('index'); setDepth('');
  const S = page.sections;
  const s0 = S[0].blocks; const heroImg = s0.find(b => b.t === 'img'); const h1 = s0.find(b => b.t === 'h' && b.l === 1); const heroBtns = s0.filter(b => b.t === 'btn');
  const words = strip(h1.text).split(' ');
  // split H1 into animated lines of ~4 words
  const emWords = new Set(['open-concept', 'facial', 'bar,']);
  const h1Html = words.map((w, i) => `<span class="line"><span style="animation-delay:${.12 + i * .045}s">${emWords.has(w) ? `<em>${esc(w)}</em>` : esc(w)}</span></span>`).join(' ');

  // services cards
  const s1 = S[1].blocks; const svcTitle = s1.find(b => b.t === 'h');
  const cards = []; let im = null;
  for (const b of s1) { if (b.t === 'img' && !/monogram|logo/i.test(b.src)) im = b; if (b.t === 'btn' && im) { cards.push({ im, b }); im = null; } }

  // condition explorer from sections 3..8
  const explorerTitle = S[2].blocks.find(b => b.t === 'h');
  const conds = S.slice(3, 9).map(s => {
    const name = s.blocks[0];
    const icon = s.blocks.find(b => b.t === 'img' && iconNum(b.src));
    const idxPath = s.blocks.findIndex(b => b.t === 'h' && /^prevention$/i.test(b.text.trim()));
    const desc = s.blocks.slice(1, idxPath).filter(b => b.t === 'p');
    const { html } = pathwayHtml(s.blocks.slice(idxPath));
    return { name, icon: iconNum(icon?.src), desc, html };
  });
  const s9 = S[9].blocks; const maImg = s9.find(b => b.t === 'img'); const maBtn = s9.find(b => b.t === 'btn');
  const posts = dedupePosts().slice(0, 3);
  const footerHours = site.footer.find(b => b.t === 'p' && /Monday/.test(b.html));
  const findSrc = name => Object.keys(IMG).find(k => IMG[k] === name + '.webp') || name;
  const slides = [
    { src: heroImg.src, alt: heroImg.alt || strip(h1.text), label: cards[0]?.b.text || 'Facials' },
    { src: findSrc('face-skin-body-bar-calgary-injectables-laser-facial-7'), alt: 'Medical grade serum dropper', label: cards[1]?.b.text || 'Chemical Peels' },
    { src: findSrc('face-skin-body-bar-calgary-injectables-laser-treatments-2'), alt: 'Injectables treatment at Face Skin & Body Bar', label: cards[2]?.b.text || 'Injectables' },
    { src: findSrc('face-skin-body-bar-calgary-injectables-laser-treatments-13'), alt: 'Clients of Face Skin & Body Bar', label: cards[3]?.b.text || 'Medical Aesthetics' },
  ];
  const tickerItems = NAV.flatMap(n => n.children || []).filter(c => c.href?.startsWith('/') && c.href !== '/shop-alumiermd').slice(0, 16);

  const body = `
<section class="cine cine--home" data-cine data-interval="6500" aria-label="Introduction">
  <div class="cine__fallback">${slides.map((s, i) => imgTag(s.src, s.alt, i ? '' : 'is-first', i === 0)).join('')}</div>
  <canvas class="cine__canvas" aria-hidden="true"></canvas>
  <div class="cine__shade" aria-hidden="true"></div>
  <div class="container cine__content">
    <span class="eyebrow eyebrow--light reveal">Medical Spa &amp; Skin Care Clinic · Calgary</span>
    <h1 class="cine__title">${h1Html}</h1>
    <div class="btn-row reveal" style="--d:.6s">${heroBtns.map((b, i) => btn(b.text, b.href, i ? 'btn--outline-light' : 'btn--light')).join('')}</div>
  </div>
  <div class="container cine__bar reveal" style="--d:.9s">
    <div class="cine__count"><span data-cine-count>01</span> / ${String(slides.length).padStart(2, '0')}</div>
    <div class="cine__dots">${slides.map((s, i) => `<button type="button" data-cine-go class="${i ? '' : 'is-active'}" aria-label="Show slide ${i + 1}: ${esc(s.label)}"><span class="cine__dot-bar"></span><span class="cine__dot-label">${esc(s.label)}</span></button>`).join('')}</div>
    <a class="cine__loc" href="${link('/contact-us')}">#126 – 620 10th Ave SW · Calgary</a>
  </div>
</section>

<div class="ticker" aria-label="Treatments"><div class="ticker__track">${[...tickerItems, ...tickerItems].map((c, i) => `<a href="${link(c.href)}"${i >= tickerItems.length ? ' tabindex="-1" aria-hidden="true"' : ''}>${esc(c.text.replace(/â„¢/g, '™').replace(/â€™/g, '’'))}</a>`).join('')}</div></div>

<section class="section"><div class="container">
  <div class="sec-head" style="display:flex;justify-content:space-between;align-items:end;gap:30px;max-width:none;flex-wrap:wrap"><div class="reveal"><span class="eyebrow">What we do</span><h2 style="margin:0">${rewrite(svcTitle.html.replace(/<br>/g, ' '))}</h2></div>${imgTag('face-logo-print-monogram1', '', 'reveal" style="width:46px')}</div>
  <div class="svc-grid" data-stagger>${cards.map((c, i) => `<a class="svc" href="${link(c.b.href)}">${imgTag(c.im.src, c.im.alt || c.b.text)}<div class="svc__body"><div class="svc__num">0${i + 1}</div><div class="svc__title"><span>${esc(c.b.text)}</span><i>→</i></div></div></a>`).join('')}</div>
</div></section>

<section class="section tone-dark" id="conditions"><div class="container" data-tabs>
  <div class="sec-head reveal"><span class="eyebrow">Skin concerns</span>${heading(explorerTitle)}</div>
  <div class="explorer__tabs reveal" role="tablist" aria-label="Skin concerns">${conds.map((c, i) => `<button class="explorer__tab" role="tab" id="tab-${i}" aria-controls="panel-${i}" aria-selected="${i === 0}" tabindex="${i ? -1 : 0}">${imgTag(`face-skin-conditions-black${c.icon}`, '')}${esc(strip(c.name.text))}</button>`).join('')}</div>
  ${conds.map((c, i) => `<div class="explorer__panel${i === 0 ? ' is-active' : ''}" role="tabpanel" id="panel-${i}" aria-labelledby="tab-${i}">
    <div>${imgTag(`face-skin-conditions-black${c.icon}`, CONCERNS[c.icon][0], 'explorer__icon')}${heading(c.name)}${c.desc.map(para).join('')}<div class="btn-row">${btn('Learn more', '/' + CONCERNS[c.icon][1], 'btn--light')}</div></div>
    <div>${c.html}</div></div>`).join('')}
</div></section>

<section class="section"><div class="container"><div class="split">
  <div class="split__media"><figure class="media-frame media-frame--tall reveal-img" style="margin:0">${imgTag(maImg.src, maImg.alt || 'Medical aesthetics at Face Skin & Body Bar')}</figure></div>
  <div class="reveal"><span class="eyebrow">Medical Aesthetics</span><h2>${esc(maBtn.text)}</h2><p class="lead">${esc(descOf('/medical-aesthetics'))}</p>
    <div class="btn-row">${btn(maBtn.text, maBtn.href)}${btn('Injectables', '/injectables', 'btn--ghost')}</div></div>
</div></div></section>

<section class="section tone-cream"><div class="container"><div class="split split--rev">
  <div class="split__media"><div class="map reveal" style="aspect-ratio:4/3.4"><iframe title="Map to Face Skin & Body Bar" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent('620 10th Ave SW #126, Calgary, AB T2R 1C3')}&output=embed"></iframe></div></div>
  <div class="reveal"><span class="eyebrow">Visit us</span><h2>Location</h2><p class="lead">#126 – 620 10th Ave SW<br>Calgary, AB T2R 1C3</p>
    <div class="footer__hours" style="max-width:420px;margin:26px 0">${footerHours.html.split('<br>').map(l => { const m = strip(l).match(/^(\w+):\s*(.*)$/); return m ? `<p style="max-width:none;border-bottom:1px solid var(--line);padding:9px 0"><strong>${m[1]}</strong><span>${esc(m[2])}</span></p>` : ''; }).join('')}</div>
    <div class="btn-row">${btn('Book Now', BOOK)}${btn('Contact Us', '/contact-us', 'btn--ghost')}</div></div>
</div></div></section>

<section class="section"><div class="container"><div class="sec-head" style="display:flex;justify-content:space-between;align-items:end;gap:30px;max-width:none;flex-wrap:wrap"><div class="reveal"><span class="eyebrow">Skincare Journal</span><h2 style="margin:0">Journal</h2></div><a class="link-arrow reveal" href="${link('/journal')}">All articles</a></div>
  <div class="posts" data-stagger>${posts.map(p => postCard(p)).join('')}</div></div></section>

<section class="cta"><div class="cta__bg" data-parallax>${imgTag(findImg('face-skin-and-body-building'), '')}</div><div class="container reveal"><span class="eyebrow" style="color:var(--sand)">Face Skin &amp; Body Bar · Calgary</span><h2>Book with us today</h2><div class="btn-row">${btn('Book Now', BOOK, 'btn--light')}${btn('Gift Cards', GIFT, 'btn--outline-light')}</div></div></section>`;
  writePage('', layout(page, body, { slug: '', three: true }));
}

/* ---------------- extras ---------------- */
function buildRedirects() {
  for (const [from, to] of Object.entries(REDIRECTS)) {
    if (PAGES.has(from)) continue;
    setDepth(from);
    const target = to ? `${P}${to}/` : P;
    writePage(from, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Redirecting…</title><link rel="canonical" href="${SITE}/${to}"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${target}"></head><body><a href="${target}">Continue</a></body></html>`);
  }
}
function build404() {
  setDepth('');
  const page = { title: 'Page Not Found — Face Skin & Body Bar', description: '', ldjson: [] };
  // 404 must use absolute-ish paths: GitHub Pages serves it at any depth, so use a <base> computed at runtime
  let html = layout(page, `<section class="phero"><div class="container narrow center"><span class="eyebrow">404</span><h1>Page not found</h1><div class="btn-row" style="justify-content:center">${btn('Back to Home', '/')}${btn('Book Now', BOOK, 'btn--ghost')}</div></div></section>`, { slug: '404' });
  html = html.replace('<meta charset="utf-8">', `<meta charset="utf-8"><script>(function(){var p=location.pathname.split('/');var base=location.hostname.endsWith('github.io')?'/'+p[1]+'/':'/';document.write('<base href="'+base+'">');})();</script>`);
  fs.writeFileSync(path.join(OUT, '404.html'), html);
}
function buildSitemap() {
  const urls = ['', ...[...PAGES].filter(Boolean)].map(s => `<url><loc>${SITE}${s ? '/' + s : ''}</loc></url>`).join('\n');
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
  fs.writeFileSync(path.join(OUT, 'assets', 'img', 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1a1815"/><path d="M32 12 C24 23 18 30 18 39 a14 14 0 0 0 28 0 C46 30 40 23 32 12z" fill="none" stroke="#dfd9cb" stroke-width="4"/></svg>`);
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
}

/* ---------------- run ---------------- */
let count = 0;
buildHome(); count++;
for (const f of contentFiles) {
  if (f === 'index' || f === 'home') continue;
  if (f === 'journal') buildJournal();
  else if (f.startsWith('journal__')) buildPost(f);
  else if (LEGAL.includes(f)) buildLegal(f);
  else if (f === 'contact-us') buildContact();
  else if (f === 'our-story') buildStory();
  else buildGeneric(f);
  count++;
}
buildRedirects(); build404(); buildSitemap();
console.log(`Built ${count} pages →`, OUT);

