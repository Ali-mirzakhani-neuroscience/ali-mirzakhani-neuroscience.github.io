/* ==========================================================================
   ALI MIRZAKHANI — site behavior (vanilla JS, no dependencies)
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
     Theme (dark / light) — persisted in localStorage
     --------------------------------------------------------------------- */
  function initTheme() {
    var root = document.documentElement;
    var stored = localStorage.getItem('am-theme');
    if (stored) root.setAttribute('data-theme', stored);

    var toggle = document.querySelector('[data-theme-toggle]');
    if (!toggle) return;
    toggle.addEventListener('click', function () {
      var current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      var next = current === 'light' ? 'dark' : 'light';
      if (next === 'dark') {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', 'light');
      }
      localStorage.setItem('am-theme', next);
    });
  }

  /* ---------------------------------------------------------------------
     Full-screen navigation overlay
     --------------------------------------------------------------------- */
  function initNav() {
    var body = document.body;
    var btn = document.querySelector('[data-menu-btn]');
    if (!btn) return;
    var overlay = document.querySelector('[data-nav-overlay]');

    function setOpen(open) {
      body.setAttribute('data-nav-open', open ? 'true' : 'false');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (overlay) overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
    }

    btn.addEventListener('click', function () {
      var isOpen = body.getAttribute('data-nav-open') === 'true';
      setOpen(!isOpen);
    });

    document.querySelectorAll('.nav-list a').forEach(function (link) {
      link.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });

    // mark current page active
    var path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-list a').forEach(function (link) {
      var href = link.getAttribute('href');
      if (href === path || (path === '' && href === 'index.html')) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  /* ---------------------------------------------------------------------
     Local clock in nav aside — edit TIMEZONE to your own
     --------------------------------------------------------------------- */
  function initClock() {
    var el = document.querySelector('[data-clock]');
    if (!el) return;
    var TIMEZONE = el.getAttribute('data-tz') || 'Asia/Tehran';
    function tick() {
      try {
        var fmt = new Intl.DateTimeFormat('en-GB', {
          timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit'
        });
        el.textContent = fmt.format(new Date());
      } catch (e) {
        el.textContent = '—';
      }
    }
    tick();
    setInterval(tick, 30000);
  }

  /* ---------------------------------------------------------------------
     Scroll-triggered reveals + trace-divider draw-in
     --------------------------------------------------------------------- */
  function initReveal() {
    var targets = document.querySelectorAll('.reveal, .trace-divider');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      targets.forEach(function (t) {
        t.classList.add('is-visible');
        t.classList.add('in-view');
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function (t) { io.observe(t); });

    // stagger index for children of .reveal-stagger
    document.querySelectorAll('.reveal-stagger').forEach(function (parent) {
      Array.prototype.forEach.call(parent.children, function (child, i) {
        child.style.setProperty('--i', i);
      });
    });
  }

  /* ---------------------------------------------------------------------
     Hero waveform — an ambient, gently animated signal trace
     --------------------------------------------------------------------- */
  function initHeroCanvas() {
    var canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w, h, t = 0;

    function resize() {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize);
    resize();

    var styles = getComputedStyle(document.documentElement);
    function color(v, fallback) { return (styles.getPropertyValue(v) || fallback).trim(); }

    function drawTrace(offset, amp, speed, hue, lineWidth, seed) {
      ctx.beginPath();
      var points = 140;
      for (var i = 0; i <= points; i++) {
        var x = (i / points) * w;
        var n = Math.sin(i * 0.18 + t * speed + seed) * amp
              + Math.sin(i * 0.05 + t * speed * 0.6 + seed) * amp * 0.6
              + (Math.sin(i * 0.9 + t * speed * 2 + seed) * amp * 0.15 * Math.max(0, Math.sin(i * 0.1 + t * 0.3)));
        var y = h * offset + n;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = hue;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    var copper = color('--c-copper', '#D9924C');
    var blue = color('--c-trace-blue', '#5B93A6');

    function frame() {
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 0.55;
      drawTrace(0.62, h * 0.05, 0.012, blue, 1, 12);
      ctx.globalAlpha = 0.9;
      drawTrace(0.42, h * 0.09, 0.017, copper, 1.4, 0);
      t += 1;
      if (!reduceMotion) requestAnimationFrame(frame);
    }
    frame();
  }

  /* ---------------------------------------------------------------------
     Generic filter control — used on projects.html and publications.html
     data-filter-group wraps buttons with data-filter="value"
     data-filter-target items carry data-cats="a,b,c"
     --------------------------------------------------------------------- */
  function initFilters() {
    document.querySelectorAll('[data-filter-group]').forEach(function (group) {
      var targetsSelector = group.getAttribute('data-filter-group');
      var items = document.querySelectorAll(targetsSelector);
      var buttons = group.querySelectorAll('[data-filter]');
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          buttons.forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          var val = btn.getAttribute('data-filter');
          items.forEach(function (item) {
            var cats = (item.getAttribute('data-cats') || '').split(',');
            var show = val === 'all' || cats.indexOf(val) !== -1;
            item.classList.toggle('hidden', !show);
          });
        });
      });
    });
  }

  /* ---------------------------------------------------------------------
     Back to top
     --------------------------------------------------------------------- */
  function initBackToTop() {
    var btn = document.querySelector('[data-back-to-top]');
    if (!btn) return;
    window.addEventListener('scroll', function () {
      btn.classList.toggle('visible', window.scrollY > 700);
    }, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------------------------------------------------------------------
     Copy-to-clipboard (email / bibtex etc.)
     --------------------------------------------------------------------- */
  function initCopyButtons() {
    document.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        var original = btn.textContent;
        navigator.clipboard && navigator.clipboard.writeText(text).then(function () {
          btn.textContent = 'COPIED';
          setTimeout(function () { btn.textContent = original; }, 1600);
        });
      });
    });
  }

  /* ---------------------------------------------------------------------
     Contact form — static-site friendly.
     Replace the `action` attribute on the <form> with your Formspree (or
     similar) endpoint to receive submissions; until then this falls back
     to opening the visitor's email client with a pre-filled message.
     --------------------------------------------------------------------- */
  function initContactForm() {
    var form = document.querySelector('[data-contact-form]');
    if (!form) return;
    var status = form.querySelector('[data-form-status]');
    var hasRealAction = form.getAttribute('action') && form.getAttribute('action').indexOf('your-form-id') === -1;

    if (hasRealAction) return; // let it submit normally to Formspree/Netlify

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.querySelector('#name').value.trim();
      var email = form.querySelector('#email').value.trim();
      var message = form.querySelector('#message').value.trim();
      if (!name || !email || !message) {
        status.textContent = 'Please fill in every field before sending.';
        status.classList.remove('ok');
        return;
      }
      var subject = encodeURIComponent('Website inquiry from ' + name);
      var body = encodeURIComponent(message + '\n\n— ' + name + ' (' + email + ')');
      window.location.href = 'mailto:hello@example.com?subject=' + subject + '&body=' + body;
      status.textContent = 'Opening your email client…';
      status.classList.add('ok');
    });
  }

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initNav();
    initClock();
    initReveal();
    initHeroCanvas();
    initFilters();
    initBackToTop();
    initCopyButtons();
    initContactForm();
  });
})();
