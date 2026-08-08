/* ============================================
   RIZNEFY MAIN.JS
   Shared vanilla JS utilities — no dependencies.
   Safe for Blogger. Include once per page, at end of body.
   ============================================ */

(function () {
  'use strict';

  /* ----------------------------------------
     1. SCROLL REVEAL OBSERVER
     Applies to any element with class .reveal
     Adds .is-visible when 15% in viewport.
     Also handles .metric-panel chart draw-in.
     ---------------------------------------- */
  function initScrollReveal() {
    var targets = document.querySelectorAll('.reveal, .metric-panel');
    if (!targets.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ----------------------------------------
     1c. COUNT-UP ANIMATION FOR METRICS
     Any element with [data-count-to] animates from 0
     up to that value when it scrolls into view. Reads
     data-count-decimals / data-count-prefix /
     data-count-suffix so it handles every format the
     site actually uses (98%, $78, 4.2x, 4.2x MER, etc.)
     rather than assuming plain integers.
     ---------------------------------------- */
  function animateCountValue(el, target, decimals, prefix, suffix, duration) {
    var startTimestamp = null;
    function step(timestamp) {
      if (!startTimestamp) startTimestamp = timestamp;
      var progress = Math.min((timestamp - startTimestamp) / duration, 1);
      var current = progress * target;
      el.textContent = prefix + current.toFixed(decimals) + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = prefix + target.toFixed(decimals) + suffix;
      }
    }
    window.requestAnimationFrame(step);
  }

  function initCountUp() {
    var targets = document.querySelectorAll('[data-count-to]');
    if (!targets.length) return;

    var triggered = new WeakSet();

    function triggerCount(el) {
      if (triggered.has(el)) return;
      triggered.add(el);
      var target = parseFloat(el.dataset.countTo);
      var decimals = parseInt(el.dataset.countDecimals || '0', 10);
      var prefix = el.dataset.countPrefix || '';
      var suffix = el.dataset.countSuffix || '';
      if (!isNaN(target)) {
        animateCountValue(el, target, decimals, prefix, suffix, 1400);
      }
    }

    // Lower threshold (any part visible) + small negative rootMargin so
    // the animation fires as soon as the value is reasonably on-screen,
    // rather than requiring 40% of a small inline span's box to be
    // visible before it triggers.
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          triggerCount(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.01, rootMargin: '0px 0px -10% 0px' }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });

    // Fallback for contexts where IntersectionObserver's callback can be
    // unreliable (e.g. pages opened via a content:// URI rather than a
    // normal http(s)/file origin): re-check element positions on scroll
    // and resize, and once immediately on load, using getBoundingClientRect.
    function manualCheck() {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      targets.forEach(function (el) {
        if (triggered.has(el)) return;
        var rect = el.getBoundingClientRect();
        if (rect.top < vh && rect.bottom > 0) {
          triggerCount(el);
        }
      });
    }

    window.addEventListener('scroll', manualCheck, { passive: true });
    window.addEventListener('resize', manualCheck);
    manualCheck();
  }

  /* ----------------------------------------
     1b. HERO TITLE WORD-BY-WORD REVEAL
     Splits each [data-word-reveal] line into
     per-word spans (preserving the real space
     between words as a text node, not a hidden
     character that can collapse), then fades/rises
     each word in with a staggered delay. Runs
     immediately on load since the hero is always
     above the fold - a rAF pair lets the browser
     paint the initial hidden state first so the
     reveal is visible rather than instant.
     ---------------------------------------- */
  function initHeroTitleReveal() {
    var lines = document.querySelectorAll('[data-word-reveal]');
    if (!lines.length) return;

    var wordIndex = 0;
    var STAGGER_MS = 70;
    var wordEls = [];

    lines.forEach(function (line) {
      var text = line.textContent;
      var words = text.split(' ');
      line.textContent = '';

      words.forEach(function (word, i) {
        var span = document.createElement('span');
        span.className = 'hero__word';
        span.textContent = word;
        span.style.setProperty('--word-delay', (wordIndex * STAGGER_MS) + 'ms');
        wordIndex++;
        line.appendChild(span);
        wordEls.push(span);

        if (i < words.length - 1) {
          line.appendChild(document.createTextNode(' '));
        }
      });
    });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        wordEls.forEach(function (span) {
          span.classList.add('is-visible');
        });
      });
    });
  }

  /* ----------------------------------------
     2. SCROLL-DRIVEN UI STATE
     Combines sticky-nav border state and floating
     action button visibility into a single scroll
     listener instead of two separate ones — fewer
     listeners firing per scroll frame means less
     work per frame, which matters most on lower-end
     devices where extra scroll handlers add up to a
     laggy feel.

     FAB visibility is depth-based (65% of total
     scrollable height) rather than a fixed pixel
     offset, so short and long pages both reveal the
     WhatsApp/Book-a-Call buttons at the same relative
     point in the page instead of a fixed-pixel value
     that shows them almost immediately on long pages
     like the homepage.
     ---------------------------------------- */
  function initScrollState() {
    var nav = document.querySelector('.nav');
    var whatsapp = document.querySelector('.fab-whatsapp');
    var bookCall = document.querySelector('.fab-book-call');
    if (!nav && !whatsapp && !bookCall) return;

    function onScroll() {
      var y = window.scrollY;

      if (nav) {
        nav.classList.toggle('is-scrolled', y > 24);
      }

      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var scrollFraction = docHeight > 0 ? (y / docHeight) : 0;

      var showFabs = scrollFraction > 0.65;
      if (whatsapp) whatsapp.classList.toggle('is-visible', showFabs);
      if (bookCall) bookCall.classList.toggle('is-visible', showFabs);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  /* ----------------------------------------
     3. MOBILE MENU TOGGLE
     Toggles .is-open on .mobile-menu and
     .nav__toggle. Closes on link click or Escape.
     ---------------------------------------- */
  function initMobileMenu() {
    var toggle = document.querySelector('.nav__toggle');
    var menu = document.querySelector('.mobile-menu');
    var closeBtn = document.querySelector('.mobile-menu__close');
    if (!toggle || !menu) return;

    // Locking body scroll can shift layout by the scrollbar's width,
    // producing a visible "jump" the instant the menu opens. Compensate
    // by padding the body with the scrollbar's width while locked.
    function lockScroll() {
      var scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = scrollBarWidth + 'px';
      }
    }

    function unlockScroll() {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    function openMenu() {
      menu.classList.add('is-open');
      toggle.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('menu-open');
      lockScroll();
      // Move focus into the menu (to its close button, the first
      // logical stop for a keyboard user) — standard expected
      // behavior for an overlay/dialog pattern.
      if (closeBtn) closeBtn.focus();
    }

    function closeMenu() {
      menu.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
      unlockScroll();
      // Return focus to the toggle button that opened the menu.
      toggle.focus();
    }

    toggle.addEventListener('click', function () {
      if (menu.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeMenu);
    }

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        closeMenu();
      }
    });

    // Focus trap: while the menu is open, Tab/Shift+Tab should cycle
    // only through the menu's own focusable elements (links, close
    // button) rather than escaping into content hidden behind it.
    // Without this, keyboard users can tab focus onto page content
    // that's visually covered by the open menu overlay.
    function getFocusable() {
      return Array.prototype.slice.call(
        menu.querySelectorAll('a[href], button:not([disabled])')
      ).filter(function (el) {
        return el.offsetParent !== null;
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !menu.classList.contains('is-open')) return;
      var focusable = getFocusable();
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  /* ----------------------------------------
     4. FAQ ACCORDION
     Toggles .is-open on .faq-item when its
     .faq-item__question is clicked. Only one
     item stays open at a time - opening a new
     one closes whichever was previously open,
     so the page doesn't turn into a wall of
     expanded text.
     ---------------------------------------- */
  function initFaqAccordion() {
    var items = document.querySelectorAll('.faq-item');
    if (!items.length) return;

    items.forEach(function (item) {
      var question = item.querySelector('.faq-item__question');
      if (!question) return;

      question.addEventListener('click', function () {
        var isOpen = item.classList.contains('is-open');

        items.forEach(function (other) {
          other.classList.remove('is-open');
          var otherQuestion = other.querySelector('.faq-item__question');
          if (otherQuestion) otherQuestion.setAttribute('aria-expanded', 'false');
        });

        if (!isOpen) {
          item.classList.add('is-open');
          question.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  /* ----------------------------------------
     5. INIT ON DOM READY
     ---------------------------------------- */
  function init() {
    initScrollReveal();
    initHeroTitleReveal();
    initCountUp();
    initScrollState();
    initMobileMenu();
    initFaqAccordion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
