(function () {
  var MOBILE_MAX = 768;

  function isMobile() {
    return window.innerWidth <= MOBILE_MAX;
  }

  function initEmaraGallery(root) {
    if (!root) return null;

    var mode = root.getAttribute('data-emara-gallery') || 'slides';
    var track = root.querySelector('.emara-gallery__track')
      || root.querySelector('.photo-ribbon-track')
      || root.querySelector('.seo-gallery__grid')
      || root.querySelector('.realisations-grid');
    if (!track) return null;

    var viewport = root.querySelector('.emara-gallery__viewport')
      || root.querySelector('.photo-ribbon-viewport')
      || root.querySelector('.seo-gallery__viewport')
      || track.parentElement;
    var slideSelector = mode === 'cards'
      ? '.property-card'
      : '.emara-gallery__slide:not([aria-hidden="true"])';
    var prev = root.querySelector('.emara-gallery__button--prev');
    var next = root.querySelector('.emara-gallery__button--next');
    var counter = root.querySelector('.emara-gallery__counter');
    var singleViewport = root.classList.contains('smap-emara-gallery') || root.classList.contains('emara-gallery--single');
    var useActiveClass = mode === 'cards' || mode === 'slides' || mode === 'slides-active' || singleViewport;
    var indexHost = viewport || root;

    var state = {
      index: 0,
      touchStartX: 0,
      touchStartY: 0,
      touchMode: ''
    };

    function getSlides() {
      return Array.prototype.slice.call(track.querySelectorAll(slideSelector));
    }

    function update(nextIndex) {
      var slides = getSlides();
      if (!slides.length) return;

      if (!isMobile() && !singleViewport) {
        indexHost.style.removeProperty('--emara-gallery-index');
        indexHost.style.removeProperty('--mobile-carousel-index');
        track.style.transform = '';
        slides.forEach(function (slide) {
          slide.classList.remove('is-active');
        });
        if (counter) counter.textContent = '';
        if (prev) prev.disabled = false;
        if (next) next.disabled = false;
        return;
      }

      state.index = Math.max(0, Math.min(nextIndex, slides.length - 1));

      if (useActiveClass) {
        slides.forEach(function (slide, slideIndex) {
          slide.classList.toggle('is-active', slideIndex === state.index);
        });
      } else {
        indexHost.style.setProperty('--emara-gallery-index', String(state.index));
      }

      if (counter) {
        counter.textContent = (state.index + 1) + ' / ' + slides.length;
      }
      if (prev) prev.disabled = state.index === 0;
      if (next) next.disabled = state.index >= slides.length - 1;
    }

    if (prev) {
      prev.addEventListener('click', function () {
        if (!isMobile() && !singleViewport) return;
        update(state.index - 1);
      });
    }
    if (next) {
      next.addEventListener('click', function () {
        if (!isMobile() && !singleViewport) return;
        update(state.index + 1);
      });
    }

    var swipeTarget = viewport || track;
    if (swipeTarget && swipeTarget.addEventListener) {
      swipeTarget.addEventListener('touchstart', function (event) {
        if (!isMobile()) return;
        var touch = event.touches && event.touches[0];
        if (!touch) return;
        state.touchStartX = touch.clientX;
        state.touchStartY = touch.clientY;
        state.touchMode = '';
      }, { passive: true });

      swipeTarget.addEventListener('touchmove', function (event) {
        if (!isMobile()) return;
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
        if (!isMobile() || state.touchMode !== 'horizontal') {
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

    function refresh() {
      update(state.index);
    }

    window.addEventListener('resize', refresh);
    update(0);

    return { root: root, refresh: refresh, update: update };
  }

  var galleries = Array.prototype.slice.call(
    document.querySelectorAll('[data-emara-gallery]')
  ).map(initEmaraGallery).filter(Boolean);

  window.EmaraGalleries = galleries;
})();
