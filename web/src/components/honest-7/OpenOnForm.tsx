import { FORM_ID } from '@/components/honest-7/shared';

/**
 * The page opens on the first lead card, not on the hero (the client's order,
 * 2026-10-09). An inline script placed right after that section, so the page
 * is scrolled while its HTML is being read: before the first paint wherever
 * the browser allows it, and never waiting for React.
 *
 * Where the card stands alone under its heading (below lg) it lands on the
 * card itself: its fields and its button then all fit the first screen of a
 * phone, which they do not under the heading. From lg the heading sits beside
 * the card and the page lands on the row they share — exactly where a CTA
 * leads (`scrollToNearestForm` in LandingActions), with the same space kept
 * above. At once instead of smoothly, and the card takes focus the same way.
 *
 * Until the page has loaded the position is held, because what is above can
 * still change height (fonts); the first touch, click, wheel or key ends that:
 * from then on the page is the visitor's.
 *
 * Two arrivals are left alone: an address with an `#anchor`, and a return
 * through the history, where the browser puts the visitor back where they were.
 */
const SCRIPT = `(function () {
  var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  if (location.hash || (nav && nav.type === 'back_forward')) return;
  var card = document.getElementById(${JSON.stringify(FORM_ID)});
  if (!card) return;
  var intro = document.querySelector('[data-lead-intro="' + card.getAttribute('data-lead-form') + '"]');
  var held = true;
  function land() {
    if (!held) return;
    var target = intro && intro.getBoundingClientRect().bottom > card.getBoundingClientRect().top ? intro : card;
    var top = target.getBoundingClientRect().top + window.scrollY - (window.matchMedia('(min-width: 1024px)').matches ? 96 : 14);
    try { window.scrollTo({ top: top, behavior: 'instant' }); } catch (e) { window.scrollTo(0, top); }
  }
  // A reload would otherwise be put back where the page was scrolled before it.
  // Given back on the first interaction, so leaving and coming back still works.
  try { history.scrollRestoration = 'manual'; } catch (e) {}
  function release() {
    held = false;
    try { history.scrollRestoration = 'auto'; } catch (e) {}
  }
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (type) {
    window.addEventListener(type, release, { capture: true, once: true, passive: true });
  });
  land();
  card.focus({ preventScroll: true });
  document.addEventListener('DOMContentLoaded', land);
  window.addEventListener('load', function () {
    land();
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
      land();
      held = false;
    });
  });
})();`;

export function OpenOnForm() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
