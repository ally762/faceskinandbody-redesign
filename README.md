# Face Skin & Body Bar — Website Redesign

A premium redesign of [faceskinandbody.ca](https://www.faceskinandbody.ca), built with plain HTML, CSS, JavaScript and Three.js.
No framework, no build step needed to host it — it is a static site that runs on GitHub Pages.

## What is kept from the live site (SEO-safe)
- **All copy** — every heading, paragraph, list, price and testimonial is the original text (verified by `_source/coverage.mjs`).
- **Same URLs** — `/microneedling`, `/facials`, `/journal/...` etc. Old internal links (`/peels`, `/advanced-treatments`, `/home`, …) redirect to the right page.
- **Same `<title>` and meta descriptions**, same heading levels (one H1 per page), the original JSON-LD schema, plus canonical URLs pointing to faceskinandbody.ca, BreadcrumbList schema, BlogPosting schema, `sitemap.xml` and `robots.txt`.

## What is new
- Premium design system (Cormorant Garamond + Manrope, ivory / sand / espresso palette taken from the brand's droplet monogram).
- Cinematic full-screen heroes (Three.js / WebGL): clinic-photo slideshow with a soft liquid "serum" transition, slow Ken-Burns drift and a gentle ripple that follows the cursor (`assets/js/hero.js`).
- Mega-menu navigation, full-screen mobile menu, interactive skin-concern explorer, treatment menu cards with concern chips, membership plan cards, team cards, before & after lightbox, testimonial cards, map, newsletter, sticky "Book Now".
- Images converted to WebP (64 MB → 14 MB), lazy-loaded, with width/height to avoid layout shift.

## Project structure
```
index.html, <page>/index.html   generated pages (51 + redirects)
assets/css/style.css            design system
assets/js/main.js               interactions
assets/js/hero.js               Three.js cinematic hero
assets/img/                     optimized images
_source/content/*.json          original page content (extracted from the live site)
_source/build.mjs               generator — re-run after changing content or templates
_source/check.mjs               QA: titles, descriptions, H1s, broken links
_source/coverage.mjs            QA: every original sentence is present
```

## Rebuild (only if you edit content or templates)
```
node _source/build.mjs
node _source/check.mjs
node _source/coverage.mjs
```

## Preview locally
```
python -m http.server 5500
```
then open http://localhost:5500

## Publish on GitHub Pages
1. Create a new repository on github.com (e.g. `faceskinandbody-redesign`).
2. Upload everything in this folder (drag-and-drop on "Add file → Upload files", or `git push`).
3. Repository **Settings → Pages → Source: Deploy from a branch → `main` / root** → Save.
4. After a minute the demo is live at `https://<username>.github.io/<repo>/`.

All paths are relative, so it works on the GitHub sub-path and later on the real domain.

## Notes
- Booking, gift card and AlumierMD shop links point to the clinic's existing Zenoti / AlumierMD stores.
- The newsletter form is front-end only — connect it to the clinic's email provider (Mailchimp, Klaviyo, …) before going live.
