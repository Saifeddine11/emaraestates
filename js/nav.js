'use strict';

var nav = document.getElementById('nav');
var navScrollTicking = false;

function updateNavState() {
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 80);
  navScrollTicking = false;
}

if (nav) {
  window.addEventListener('scroll', function () {
    if (navScrollTicking) return;
    navScrollTicking = true;
    requestAnimationFrame(updateNavState);
  }, { passive: true });
  updateNavState();
}

function setMobileMenuOpen(isOpen) {
  var menu = document.getElementById('mobileMenu');
  var burger = document.querySelector('.nav-burger');
  if (!menu) return;
  menu.classList.toggle('open', isOpen);
  document.body.classList.toggle('mobile-menu-open', isOpen);
  if (burger) {
    burger.classList.toggle('is-open', isOpen);
    burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    burger.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
  }
}

function toggleMobileMenu() {
  var menu = document.getElementById('mobileMenu');
  setMobileMenuOpen(!(menu && menu.classList.contains('open')));
}

function closeMobileMenu() {
  setMobileMenuOpen(false);
}
