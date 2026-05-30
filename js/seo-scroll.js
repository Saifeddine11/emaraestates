/**
 * EMARA ESTATES — Animations scroll pages SEO
 * Fade-up, image reveal, sans dépendance externe.
 * Respecte prefers-reduced-motion.
 */
(function () {
  'use strict';

  var body = document.body;
  var isSeoPage = body.classList.contains('seo-page');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canAnimate = !reduceMotion && 'IntersectionObserver' in window;

  var REVEAL_SELECTOR = [
    '.reveal',
    '.reveal-left',
    '.reveal-right',
    '.reveal-scale',
    '.reveal-up',
    '.reveal-on-scroll',
    '.image-reveal',
    '.sticky-collage__item'
  ].join(', ');

  function markVisible(el) {
    el.classList.add('visible', 'is-visible');
  }

  function showAll() {
    document.querySelectorAll(REVEAL_SELECTOR).forEach(markVisible);
  }

  if (!canAnimate) {
    showAll();
    return;
  }

  if (isSeoPage) {
    if (!body.classList.contains('scroll-anim-ready')) {
      body.classList.add('scroll-anim-ready');
    }
  }

  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      markVisible(entry.target);
      revealObs.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });

  document.querySelectorAll(REVEAL_SELECTOR).forEach(function (el) {
    revealObs.observe(el);
  });

  /* Parallax léger — desktop uniquement, images dédiées */
  if (isSeoPage && window.matchMedia('(min-width: 1024px)').matches) {
    var parallaxItems = document.querySelectorAll('.parallax-visual');
    if (parallaxItems.length) {
      var ticking = false;

      function updateParallax() {
        parallaxItems.forEach(function (wrap) {
          var rect = wrap.getBoundingClientRect();
          if (rect.top > window.innerHeight || rect.bottom < 0) return;
          var progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
          var offset = (progress - 0.5) * 14;
          wrap.style.setProperty('--parallax-y', offset.toFixed(1) + 'px');
        });
        ticking = false;
      }

      window.addEventListener('scroll', function () {
        if (!ticking) {
          window.requestAnimationFrame(updateParallax);
          ticking = true;
        }
      }, { passive: true });

      updateParallax();
    }
  }
})();
