/* Face Skin & Body Bar — interactions */
(() => {
  const d = document, root = d.documentElement;
  root.classList.remove('no-js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header: shadow + hide on scroll down */
  const header = d.querySelector('.header');
  const fab = d.querySelector('.fab');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    header && header.classList.toggle('is-scrolled', y > (d.body.classList.contains('has-cine') ? 80 : 10));
    if (header && !d.body.classList.contains('menu-open') && !d.querySelector('.nav__item.is-open')) {
      header.classList.toggle('is-hidden', y > 400 && y > lastY);
    }
    fab && fab.classList.toggle('is-visible', y > 700);
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  // hide the floating Book button while the footer is on screen
  const foot = d.querySelector('.footer');
  if (fab && foot) new IntersectionObserver(([e]) => fab.classList.toggle('is-hidden-footer', e.isIntersecting)).observe(foot);

  /* Mega menu */
  const items = d.querySelectorAll('.nav__item[data-mega]');
  const closeAll = except => items.forEach(i => { if (i !== except) { i.classList.remove('is-open'); i.querySelector('.nav__link').setAttribute('aria-expanded', 'false'); } });
  items.forEach(item => {
    const btn = item.querySelector('.nav__link');
    let timer;
    const open = () => { clearTimeout(timer); closeAll(item); item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); };
    const close = () => { timer = setTimeout(() => { item.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }, 160); };
    item.addEventListener('mouseenter', open); item.addEventListener('mouseleave', close);
    btn.addEventListener('click', () => item.classList.contains('is-open') ? (item.classList.remove('is-open'), btn.setAttribute('aria-expanded', 'false')) : open());
  });
  d.addEventListener('keydown', e => { if (e.key === 'Escape') { closeAll(); d.body.classList.remove('menu-open'); closeLb(); } });
  d.addEventListener('click', e => { if (!e.target.closest('.nav__item')) closeAll(); });

  /* Mobile menu */
  const burger = d.querySelector('.burger');
  burger && burger.addEventListener('click', () => {
    const open = d.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', open);
    header.classList.remove('is-hidden');
  });
  d.querySelectorAll('.mm__toggle').forEach(t => t.addEventListener('click', () => {
    const g = t.closest('.mm__group'); const o = g.classList.toggle('is-open'); t.setAttribute('aria-expanded', o);
  }));

  /* Reveal on scroll */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  d.querySelectorAll('.reveal, .reveal-img').forEach(el => io.observe(el));
  // stagger children
  d.querySelectorAll('[data-stagger]').forEach(p => [...p.children].forEach((c, i) => { c.classList.add('reveal'); c.style.setProperty('--d', (i % 6) * .08 + 's'); io.observe(c); }));

  /* Concern explorer tabs */
  d.querySelectorAll('[data-tabs]').forEach(wrap => {
    const tabs = wrap.querySelectorAll('[role="tab"]');
    const select = tab => {
      tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; d.getElementById(t.getAttribute('aria-controls')).classList.toggle('is-active', on); });
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (k) { const n = tabs[(i + k + tabs.length) % tabs.length]; n.focus(); select(n); }
      });
    });
  });

  /* Lightbox */
  const lb = d.querySelector('.lightbox');
  let group = [], idx = 0;
  const show = () => { const img = lb.querySelector('img'); img.src = group[idx].dataset.full; img.alt = group[idx].querySelector('img').alt; };
  function closeLb() { lb && lb.classList.remove('is-open'); }
  d.querySelectorAll('.gallery button').forEach(b => b.addEventListener('click', () => {
    group = [...b.closest('.gallery').querySelectorAll('button')]; idx = group.indexOf(b); show(); lb.classList.add('is-open'); lb.querySelector('.lb-close').focus();
  }));
  if (lb) {
    lb.querySelector('.lb-close').addEventListener('click', closeLb);
    lb.querySelector('.lb-prev').addEventListener('click', () => { idx = (idx - 1 + group.length) % group.length; show(); });
    lb.querySelector('.lb-next').addEventListener('click', () => { idx = (idx + 1) % group.length; show(); });
    lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  }

  /* Team bio toggles */
  d.querySelectorAll('.member__toggle').forEach(b => b.addEventListener('click', () => {
    const m = b.closest('.member'); const o = m.classList.toggle('is-open'); b.setAttribute('aria-expanded', o); b.textContent = o ? 'Read less' : 'Read more';
  }));

  /* Newsletter (front-end only — connect to your email provider) */
  d.querySelectorAll('.nl-form').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const msg = f.parentElement.querySelector('.nl-msg');
    const email = f.querySelector('input').value.trim();
    msg.textContent = /.+@.+\..+/.test(email) ? 'Thank you for signing up!' : 'Please enter a valid email address.';
    if (/.+@.+\..+/.test(email)) f.reset();
  }));

  /* Parallax for CTA backgrounds */
  if (!reduce) {
    const pars = [...d.querySelectorAll('[data-parallax]')];
    const tick = () => {
      pars.forEach(el => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        el.style.transform = `translate3d(0, ${p * -60}px, 0)`;
      });
      requestAnimationFrame(tick);
    };
    pars.length && tick();
  }

  /* Magnetic buttons (desktop) */
  if (!reduce && matchMedia('(hover: hover)').matches) {
    d.querySelectorAll('.btn').forEach(b => {
      b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .12}px, ${(e.clientY - r.top - r.height / 2) * .2}px)`; });
      b.addEventListener('mouseleave', () => { b.style.transform = ''; });
    });
  }
})();
