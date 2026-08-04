/* ============================================================
   LEGRAND — Main site JS
   ============================================================ */
(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // ---------------- Theme ----------------
  const theme = {
    init() {
      const saved = localStorage.getItem('legrand-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const mode = saved || (prefersDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', mode);
      this.syncIcons(mode);
    },
    toggle() {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('legrand-theme', next);
      this.syncIcons(next);
    },
    syncIcons(mode) {
      $$('.theme-icon-sun').forEach((el) => (el.style.display = mode === 'dark' ? 'block' : 'none'));
      $$('.theme-icon-moon').forEach((el) => (el.style.display = mode === 'dark' ? 'none' : 'block'));
    },
  };
  theme.init();

  // ---------------- Preloader ----------------
  window.addEventListener('load', () => {
    const pre = $('.preloader');
    if (pre) setTimeout(() => pre.classList.add('hidden'), 500);
  });
  // Safety: hide preloader after 4s no matter what
  setTimeout(() => {
    const pre = $('.preloader');
    if (pre) pre.classList.add('hidden');
  }, 4000);

  // ---------------- Nav ----------------
  const nav = $('.nav');
  const updateNav = () => {
    if (!nav) return;
    const onDark = window.scrollY > 40;
    nav.classList.toggle('scrolled', onDark);
    // On non-hero pages the nav should always be solid
    if (nav.dataset.alwaysSolid === 'true') nav.classList.add('on-dark');
  };
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  // Mobile menu
  const burger = $('.burger');
  const mobileMenu = $('.mobile-menu');
  const mobileClose = $('.mobile-close');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => mobileMenu.classList.add('open'));
    if (mobileClose) mobileClose.addEventListener('click', () => mobileMenu.classList.remove('open'));
    $$('.mobile-menu a').forEach((a) => a.addEventListener('click', () => mobileMenu.classList.remove('open')));
  }

  // ---------------- Reveal on scroll ----------------
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('visible'));
  }

  // ---------------- Counters ----------------
  const counters = $$('[data-count]');
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          const target = Number(el.dataset.count);
          const suffix = el.dataset.suffix || '';
          const dur = 1600;
          const start = performance.now();
          const tick = (now) => {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased).toLocaleString() + suffix;
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          cio.unobserve(el);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach((c) => cio.observe(c));
  } else {
    counters.forEach((c) => (c.textContent = Number(c.dataset.count).toLocaleString() + (c.dataset.suffix || '')));
  }

  // ---------------- Testimonials ----------------
  const testi = (() => {
    const track = $('.testi-track');
    if (!track) return;
    const slides = $$('.testi-slide', track);
    const dotsWrap = $('.testi-dots');
    let idx = 0;
    let timer;

    const dots = slides.map((_, i) => {
      const b = document.createElement('button');
      b.setAttribute('aria-label', `Testimonial ${i + 1}`);
      if (i === 0) b.classList.add('active');
      b.addEventListener('click', () => go(i));
      dotsWrap?.appendChild(b);
      return b;
    });

    function go(i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach((s, j) => (s.style.transform = `translateX(${(j - idx) * 100}%)`));
      dots.forEach((d, j) => d.classList.toggle('active', j === idx));
    }

    $('.testi-prev')?.addEventListener('click', () => { go(idx - 1); restart(); });
    $('.testi-next')?.addEventListener('click', () => { go(idx + 1); restart(); });

    function restart() {
      clearInterval(timer);
      timer = setInterval(() => go(idx + 1), 6000);
    }
    restart();
    return { go, restart };
  })();

  // ---------------- Favorites (localStorage) ----------------
  const FAV_KEY = 'legrand-favorites';
  window.LeGrandFavs = {
    get() {
      try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch { return []; }
    },
    save(list) { localStorage.setItem(FAV_KEY, JSON.stringify(list)); },
    toggle(id) {
      let list = this.get();
      const has = list.includes(id);
      list = has ? list.filter((x) => x !== id) : [...list, id];
      this.save(list);
      this.updateBadge();
      return !has;
    },
    has(id) { return this.get().includes(id); },
    updateBadge() {
      const badge = $('.fav-badge');
      if (!badge) return;
      const n = this.get().length;
      badge.textContent = n;
      badge.classList.toggle('show', n > 0);
    },
  };

  // Heart buttons (delegated — works for dynamically re-rendered cards)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.fav-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const id = btn.dataset.id;
    const added = window.LeGrandFavs.toggle(id);
    btn.classList.toggle('active', added);
    showToast(added ? 'Saved to your favorites ♥' : 'Removed from favorites');
  });

  // Initialize hearts + badge
  $$('.fav-btn').forEach((btn) => btn.classList.toggle('active', window.LeGrandFavs.has(btn.dataset.id)));
  window.LeGrandFavs.updateBadge();

  // ---------------- Toasts ----------------
  function showToast(msg) {
    let stack = $('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg><span></span>';
    t.querySelector('span').textContent = msg;
    stack.appendChild(t);
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 400);
    }, 2800);
  }
  window.LeGrandToast = showToast;

  // ---------------- Back to top ----------------
  const toTop = $('.to-top');
  if (toTop) {
    window.addEventListener('scroll', () => toTop.classList.toggle('show', window.scrollY > 600), { passive: true });
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ---------------- Lightbox ----------------
  const lightbox = (() => {
    const wrap = $('.lightbox');
    if (!wrap) return;
    const img = $('.lightbox img', wrap);
    const counter = $('.lb-counter', wrap);
    let images = [];
    let idx = 0;

    function render() {
      img.src = images[idx];
      counter.textContent = `${idx + 1} / ${images.length}`;
    }
    function open(list, start) {
      images = list;
      idx = start;
      render();
      wrap.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      wrap.classList.remove('open');
      document.body.style.overflow = '';
    }
    function step(d) {
      idx = (idx + d + images.length) % images.length;
      render();
    }

    $('.lb-close', wrap).addEventListener('click', close);
    $('.lb-prev', wrap).addEventListener('click', () => step(-1));
    $('.lb-next', wrap).addEventListener('click', () => step(1));
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
    document.addEventListener('keydown', (e) => {
      if (!wrap.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });

    return { open };
  })();

  // Gallery triggers
  document.addEventListener('click', (e) => {
    const item = e.target.closest('[data-gallery]');
    if (!item || !lightbox) return;
    const images = JSON.parse(item.dataset.gallery);
    const start = Number(item.dataset.start || 0);
    lightbox.open(images, start);
  });

  // ---------------- Share ----------------
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-share]');
    if (!btn) return;
    const data = { title: btn.dataset.title || document.title, url: btn.dataset.url || location.href };
    if (navigator.share) {
      navigator.share(data).catch(() => {});
    } else {
      navigator.clipboard.writeText(data.url).then(() => showToast('Link copied to clipboard ✓'));
    }
  });

  // ---------------- Footer year ----------------
  $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

  // ---------------- Theme toggle buttons ----------------
  $$('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => theme.toggle()));
})();
