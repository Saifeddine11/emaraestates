(function () {
  'use strict';

  var MOBILE_MAX = 768;

  function isMobile() {
    return window.innerWidth <= MOBILE_MAX;
  }

  function controlsAreVisible(root) {
    var controls = root.querySelector(
      '.emara-gallery__controls, .photo-ribbon-carousel-ui, .project-gallery-carousel-ui, .seo-gallery-carousel-ui, .realisations-carousel-ui, .showflats-carousel__controls'
    );
    if (!controls) return false;
    return window.getComputedStyle(controls).display !== 'none';
  }

  function shouldRunCarousel(root) {
    return isMobile()
      || root.classList.contains('smap-emara-gallery')
      || root.classList.contains('emara-gallery--single')
      || root.classList.contains('emara-gallery--showflats')
      || controlsAreVisible(root);
  }

  function usesTrackTransform(root, mode) {
    return mode === 'slides' && (
      root.classList.contains('emara-gallery--ribbon')
      || root.classList.contains('project-gallery-ribbon')
      || root.classList.contains('emara-gallery--showflats')
    );
  }

  function initEmaraGallery(root) {
    if (!root || root.__emaraGalleryBound) return null;
    root.__emaraGalleryBound = true;

    var mode = root.getAttribute('data-emara-gallery') || 'slides';
    var track = root.querySelector('.emara-gallery__track')
      || root.querySelector('.photo-ribbon-track')
      || root.querySelector('.seo-gallery__grid')
      || root.querySelector('.showflats-carousel__track')
      || root.querySelector('.realisations-grid');
    if (!track) return null;

    var viewport = root.querySelector('.emara-gallery__viewport')
      || root.querySelector('.photo-ribbon-viewport')
      || root.querySelector('.seo-gallery__viewport')
      || root.querySelector('.showflats-carousel__viewport')
      || track.parentElement;

    var prev = root.querySelector('.emara-gallery__button--prev')
      || root.querySelector('.photo-ribbon-carousel-btn--prev')
      || root.querySelector('.project-gallery-carousel-btn--prev')
      || root.querySelector('.seo-gallery-carousel-btn--prev')
      || root.querySelector('.showflats-carousel__button--prev')
      || root.querySelector('.realisations-carousel-btn--prev');

    var next = root.querySelector('.emara-gallery__button--next')
      || root.querySelector('.photo-ribbon-carousel-btn--next')
      || root.querySelector('.project-gallery-carousel-btn--next')
      || root.querySelector('.seo-gallery-carousel-btn--next')
      || root.querySelector('.showflats-carousel__button--next')
      || root.querySelector('.realisations-carousel-btn--next');

    var counter = root.querySelector('.emara-gallery__counter');
    var useTransform = usesTrackTransform(root, mode);
    var useActiveClass = mode === 'cards'
      || mode === 'slides-active'
      || root.classList.contains('smap-emara-gallery')
      || (mode === 'slides' && !useTransform);
    var indexHost = viewport || root;

    var state = {
      index: 0,
      touchStartX: 0,
      touchStartY: 0,
      touchMode: ''
    };

    function getSlides() {
      var selector = mode === 'cards'
        ? ':scope > .property-card'
        : '.emara-gallery__slide:not([aria-hidden="true"])';
      return Array.prototype.slice.call(track.querySelectorAll(selector)).filter(function (slide) {
        return slide.getAttribute('aria-hidden') !== 'true';
      });
    }

    function setIndexVars(index) {
      var value = String(index);
      indexHost.style.setProperty('--emara-gallery-index', value);
      indexHost.style.setProperty('--mobile-carousel-index', value);
      track.style.setProperty('--emara-gallery-index', value);
      track.style.setProperty('--mobile-carousel-index', value);
      root.style.setProperty('--emara-gallery-index', value);
      root.style.setProperty('--mobile-carousel-index', value);
    }

    function clearIndexVars() {
      indexHost.style.removeProperty('--emara-gallery-index');
      indexHost.style.removeProperty('--mobile-carousel-index');
      track.style.removeProperty('--emara-gallery-index');
      track.style.removeProperty('--mobile-carousel-index');
      track.style.removeProperty('transform');
      root.style.removeProperty('--emara-gallery-index');
      root.style.removeProperty('--mobile-carousel-index');
    }

    function applyTransform() {
      setIndexVars(state.index);
      if (root.classList.contains('emara-gallery--showflats')) {
        updateShowflatsStep(root, track, getSlides());
      }
    }

    function updateShowflatsStep(root, track, slides) {
      if (!slides.length) return;
      var viewport = root.querySelector('.showflats-carousel__viewport') || track.parentElement;

      if (isMobile() && viewport) {
        var viewportWidth = viewport.clientWidth;
        if (viewportWidth > 0) {
          track.style.setProperty('--showflats-step', viewportWidth + 'px');
          track.style.setProperty('--showflats-slide-width', viewportWidth + 'px');
          root.style.setProperty('--showflats-slide-width', viewportWidth + 'px');
          return;
        }
      }

      track.style.removeProperty('--showflats-slide-width');
      root.style.removeProperty('--showflats-slide-width');

      var slide = slides[Math.min(state.index, slides.length - 1)];
      var gap = parseFloat(window.getComputedStyle(track).columnGap || window.getComputedStyle(track).gap) || 18;
      var slideWidth = slide.getBoundingClientRect().width;
      if (slideWidth > 0) {
        track.style.setProperty('--showflats-step', (slideWidth + gap) + 'px');
      }
    }

    function resetDesktopState(slides) {
      clearIndexVars();
      slides.forEach(function (slide) {
        slide.classList.remove('is-active');
      });
      if (counter) counter.textContent = '';
      if (prev) prev.disabled = false;
      if (next) next.disabled = false;
    }

    function update(nextIndex) {
      var slides = getSlides();
      if (!slides.length) return;

      if (!shouldRunCarousel(root)) {
        resetDesktopState(slides);
        return;
      }

      state.index = Math.max(0, Math.min(nextIndex, slides.length - 1));

      if (useTransform) {
        applyTransform();
        slides.forEach(function (slide, slideIndex) {
          slide.classList.toggle('is-active', slideIndex === state.index);
        });
      } else if (useActiveClass) {
        clearIndexVars();
        slides.forEach(function (slide, slideIndex) {
          slide.classList.toggle('is-active', slideIndex === state.index);
        });
      } else {
        setIndexVars(state.index);
      }

      if (counter) {
        counter.textContent = (state.index + 1) + ' / ' + slides.length;
      }
      if (prev) prev.disabled = state.index === 0;
      if (next) next.disabled = state.index >= slides.length - 1;
    }

    function goNext() {
      if (!shouldRunCarousel(root)) return;
      update(state.index + 1);
    }

    function goPrev() {
      if (!shouldRunCarousel(root)) return;
      update(state.index - 1);
    }

    if (prev) {
      prev.addEventListener('click', function (event) {
        event.preventDefault();
        goPrev();
      });
    }

    if (next) {
      next.addEventListener('click', function (event) {
        event.preventDefault();
        goNext();
      });
    }

    var swipeTarget = viewport || track;
    if (swipeTarget && swipeTarget.addEventListener) {
      swipeTarget.addEventListener('touchstart', function (event) {
        if (!shouldRunCarousel(root)) return;
        var touch = event.touches && event.touches[0];
        if (!touch) return;
        state.touchStartX = touch.clientX;
        state.touchStartY = touch.clientY;
        state.touchMode = '';
      }, { passive: true });

      swipeTarget.addEventListener('touchmove', function (event) {
        if (!shouldRunCarousel(root)) return;
        var touch = event.touches && event.touches[0];
        if (!touch) return;
        var deltaX = touch.clientX - state.touchStartX;
        var deltaY = touch.clientY - state.touchStartY;
        if (!state.touchMode && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 8) {
          state.touchMode = Math.abs(deltaX) > Math.abs(deltaY) * 1.25 ? 'horizontal' : 'vertical';
        }
        if (state.touchMode === 'horizontal') event.preventDefault();
      }, { passive: false });

      swipeTarget.addEventListener('touchend', function (event) {
        if (!shouldRunCarousel(root) || state.touchMode !== 'horizontal') {
          state.touchMode = '';
          return;
        }
        var touch = event.changedTouches && event.changedTouches[0];
        if (!touch) return;
        var deltaX = touch.clientX - state.touchStartX;
        if (Math.abs(deltaX) > 44) {
          update(state.index + (deltaX < 0 ? 1 : -1));
        }
        state.touchMode = '';
      }, { passive: true });
    }

    var resizeTimer;
    function refresh() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        update(state.index);
      }, 80);
    }

    window.addEventListener('resize', refresh);
    if (typeof ResizeObserver !== 'undefined') {
      var resizeObserver = new ResizeObserver(refresh);
      resizeObserver.observe(track);
      if (viewport && viewport !== track) resizeObserver.observe(viewport);
    }

    update(0);

    return { root: root, refresh: refresh, update: update };
  }

  function bootEmaraGalleries() {
    var galleries = Array.prototype.slice.call(
      document.querySelectorAll('[data-emara-gallery]')
    ).map(initEmaraGallery).filter(Boolean);
    window.EmaraGalleries = galleries;
    return galleries;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootEmaraGalleries);
  } else {
    bootEmaraGalleries();
  }
})();
