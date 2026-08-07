/**
 * Runtime smoke test for every ported route.
 *
 * Serves the static export and drives it in a real browser: console/network
 * health, hydration, scroll reveals, and every interactive system ported from
 * the legacy JS. Complements verify-preservation.mjs, which only reads markup.
 *
 * Usage: node scripts/smoke.mjs   (run `next build` first)
 */

import { chromium } from 'playwright';
import { startServer } from './lib/serve.mjs';

const { server, base } = await startServer();

const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

/**
 * Noise this harness creates, not the page:
 *  - "Ignoring Event: localhost" is the Ahrefs tag declining to count local hits.
 *  - the 404s are the PHP endpoints the apport submits deliberately exercise,
 *    asserted directly and re-checked by URL at the end.
 */
const HARNESS_NOISE = /React DevTools|Fast Refresh|webpack|HMR|Ignoring Event: localhost/i;
const PHP_ENDPOINTS = /contact\.php|newsletter\.php|lead-gueliz\.php/;

const browser = await chromium.launch();

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844, isMobile: true, hasTouch: true };

/** Opens a route with console/network capture attached before first paint. */
async function open(path, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.isMobile, hasTouch: viewport.hasTouch });
  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => consoleErrors.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', (req) =>
    failedRequests.push(`${req.url()} — ${req.failure()?.errorText}`),
  );
  page.on('response', (res) => {
    if (res.status() >= 400) failedRequests.push(`${res.url()} — HTTP ${res.status()}`);
  });

  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200); // intro curtain is 1.65s
  return { page, consoleErrors, failedRequests };
}

/**
 * Scrolls the full page so every reveal fires, then lets the last batch land.
 *
 * `behavior: 'instant'` is essential: the site sets `scroll-behavior: smooth`
 * globally, so a plain `scrollTo` animates and the loop runs far ahead of where
 * the page actually is, skipping sections the observer never gets to report.
 */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.6;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    // Reveals run for 0.9s; give the last batch time before measuring.
    await new Promise((r) => setTimeout(r, 1400));
  });
}

/** The checks every route gets: load health, reveals, images, overflow. */
async function auditCommon(page, consoleErrors, label) {
  record(
    `${label}: loads without a page error`,
    !consoleErrors.some((e) => e.startsWith('[pageerror]')),
  );
  record(`${label}: intro curtain clears`, await page.locator('h1').first().isVisible());

  await scrollThrough(page);

  /**
   * Scripted scrolling jumps 60% of the viewport every 90ms, which can outrun
   * the IntersectionObserver and leave a section that was passed mid-frame
   * still hidden. A real user scrolling back would trigger it, so anything
   * still hidden gets exactly that: brought into view on its own, then
   * remeasured. A reveal that stays hidden after that is genuinely broken.
   */
  const invisibleReveals = await page.evaluate(async () => {
    const hidden = () =>
      [...document.querySelectorAll('[data-reveal]')].filter(
        (el) => Number.parseFloat(getComputedStyle(el).opacity) < 0.9,
      );
    for (const el of hidden()) {
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY - (window.innerHeight - rect.height) / 2;
      window.scrollTo({ top, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 200));
    }
    await new Promise((r) => setTimeout(r, 1200));
    return hidden().map((el) => el.className.slice(0, 60) || '(no class)');
  });
  record(
    `${label}: all scroll reveals completed`,
    invisibleReveals.length === 0,
    `${invisibleReveals.length} still hidden`,
  );

  const brokenImages = await page.evaluate(() =>
    [...document.querySelectorAll('img')]
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.getAttribute('src')),
  );
  record(`${label}: no broken images`, brokenImages.length === 0, brokenImages.join(', '));

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  record(`${label}: no horizontal overflow`, overflow <= 1, `${overflow}px`);
}

/** Drives an apport simulator instance and asserts its failure path. */
async function auditApport(page, label, suffix) {
  await page.locator('#simulateur-apport').scrollIntoViewIfNeeded();
  await page.fill(`#apport-budget-${suffix}`, '2000000');
  await page.fill(`#apport-email-${suffix}`, 'test@example.com');
  await page.locator('#simulateur-apport form button[type="submit"]').click();
  await page.waitForTimeout(900);

  // The POST 404s here, and — matching js/apport-simulator.js exactly — a failed
  // submit shows the error and withholds the estimate rather than showing a
  // figure the server never confirmed.
  const error = await page
    .locator('#simulateur-apport [role="alert"]')
    .first()
    .innerText()
    .catch(() => '');
  record(`${label}: apport surfaces a submit error`, error.trim().length > 0, error.trim().slice(0, 60));
  record(
    `${label}: apport withholds the estimate when the submit fails`,
    ((await page.locator('[data-apport-result]').boundingBox())?.height ?? 0) < 5,
  );
}

/** Opens the mobile menu, checks it, and closes it both supported ways. */
async function auditMobileMenu(page, label) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.locator('#nav button[aria-label="Ouvrir le menu"]').click();
  await page.waitForTimeout(600);
  record(
    `${label}: mobile menu opens`,
    (await page.locator('#mobileMenu a').count()) > 3,
    `${await page.locator('#mobileMenu a').count()} links`,
  );

  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  record(`${label}: mobile menu closes on Escape`, (await page.locator('#mobileMenu').count()) === 0);

  await page.locator('#nav button[aria-label="Ouvrir le menu"]').click();
  await page.waitForTimeout(600);
  await page.locator('#mobileMenu button[aria-label="Fermer le menu"]').click();
  await page.waitForTimeout(700);
  record(`${label}: mobile menu closes on the ✕`, (await page.locator('#mobileMenu').count()) === 0);
}

/** Advances a SnapRow carousel by one and reads its counter. */
async function auditCarousel(page, label, ariaLabel, expected) {
  const carousel = page.locator(`[aria-label="${ariaLabel}"]`);
  await carousel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const counter = carousel.locator('[aria-live="polite"]');
  const before = (await counter.innerText()).replace(/\s+/g, '');
  await carousel.locator('button[aria-label="Image suivante"]').click();
  await page.waitForTimeout(800);
  const after = (await counter.innerText()).replace(/\s+/g, '');
  record(
    `${label}: carousel advances on mobile`,
    before === expected[0] && after === expected[1],
    `${before} -> ${after}`,
  );
}

const allConsoleErrors = [];
const allFailedRequests = [];

/* ═══════════════════════════════════════════════════════════════ homepage ══ */

console.log('\nRUNTIME SMOKE TEST\n');
console.log('  / (homepage)\n');

{
  const { page, consoleErrors, failedRequests } = await open('/', DESKTOP);
  allConsoleErrors.push(...consoleErrors);
  allFailedRequests.push(...failedRequests);

  await auditCommon(page, consoleErrors, 'home');

  /* FAQ accordion */
  const firstQ = page.locator('#faq button[aria-controls]').first();
  const secondQ = page.locator('#faq button[aria-controls]').nth(1);
  await firstQ.scrollIntoViewIfNeeded();
  await firstQ.click();
  await page.waitForTimeout(600);
  const firstPanel = page.locator(`#${await firstQ.getAttribute('aria-controls')}`);
  record('home: FAQ opens on click', (await firstPanel.boundingBox())?.height > 20);

  await secondQ.click();
  await page.waitForTimeout(600);
  const secondPanel = page.locator(`#${await secondQ.getAttribute('aria-controls')}`);
  record(
    'home: FAQ is single-open',
    (await firstPanel.boundingBox())?.height < 5 && (await secondPanel.boundingBox())?.height > 20,
  );

  await auditApport(page, 'home', 'home');

  /* phone country picker */
  await page.locator('#contact').scrollIntoViewIfNeeded();
  const trigger = page.locator('#contact button[aria-haspopup="listbox"]');
  const search = page.locator('#contact input[aria-label="Rechercher un pays"]');
  await trigger.click();
  await page.waitForTimeout(350);
  record('home: phone dropdown opens', await search.isVisible());

  await search.fill('maroc');
  await page.waitForTimeout(300);
  const options = page.locator('#contact [role="option"]');
  const count = await options.count();
  record('home: phone search filters', count > 0 && count < 8, `${count} matches`);

  await options.first().click();
  await page.waitForTimeout(300);
  record('home: phone selection applies', (await trigger.innerText()).includes('+212'));
  record(
    'home: hidden native select stays in sync',
    (await page.locator('#contact-phone-code').inputValue()) === 'MA',
  );

  await trigger.click();
  await page.waitForTimeout(250);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);
  record('home: Escape closes phone dropdown', (await trigger.getAttribute('aria-expanded')) === 'false');

  await page.close();
}

{
  const { page, consoleErrors, failedRequests } = await open('/', MOBILE);
  allConsoleErrors.push(...consoleErrors);
  allFailedRequests.push(...failedRequests);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  record('home mobile: no horizontal overflow', overflow <= 1, `${overflow}px`);

  await auditMobileMenu(page, 'home mobile');
  await page.close();
}

/* ═════════════════════════════════════════ /residences-honest-678/ ══ */

console.log('\n  /residences-honest-678/ (Honest Signature 7)\n');

{
  const { page, consoleErrors, failedRequests } = await open('/residences-honest-678/', DESKTOP);
  allConsoleErrors.push(...consoleErrors);
  allFailedRequests.push(...failedRequests);

  await auditCommon(page, consoleErrors, 'honest');

  /* the WhatsApp links on this route are bare — no prefilled ?text= */
  const waHrefs = await page.evaluate(() =>
    [...document.querySelectorAll('a[href*="wa.me"]')].map((a) => a.getAttribute('href')),
  );
  record(
    'honest: WhatsApp links carry no prefilled message',
    waHrefs.length === 2 && waHrefs.every((h) => h === 'https://wa.me/212670038899'),
    waHrefs.join(' | '),
  );

  /* featured slider opens the lightbox and navigates */
  await page.locator('#apercu').scrollIntoViewIfNeeded();
  await page.locator('#apercu button[aria-label^="Agrandir la photo"]').first().click();
  await page.waitForTimeout(600);
  const dialog = page.locator('[role="dialog"][aria-label="Galerie photo du projet"]');
  record('honest: slider opens the lightbox', await dialog.isVisible());

  // The slider autoplays, so which frame the lightbox opens on is timing
  // dependent. Assert that it advances by one of six, not which one.
  const counterText = async () =>
    (await dialog.locator('div', { hasText: /^\d+ \/ \d+$/ }).first().innerText()).replace(/\s+/g, '');
  const lbBefore = await counterText();
  await dialog.locator('button[aria-label="Photo suivante"]').click();
  await page.waitForTimeout(500);
  const lbAfter = await counterText();
  const nextOf = (value) => `${String((Number(value.split('/')[0]) % 6) + 1).padStart(2, '0')}/06`;
  record('honest: lightbox navigates', lbAfter === nextOf(lbBefore), `${lbBefore} -> ${lbAfter}`);

  // Waiting for the node to detach rather than a fixed delay: the close is
  // gated on an exit animation whose duration the harness should not encode.
  await page.keyboard.press('Escape');
  const closed = await dialog
    .first()
    .waitFor({ state: 'detached', timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  record('honest: Escape closes the lightbox', closed && (await dialog.count()) === 0);

  /* Gallery cards open the lightbox too. The desktop track is a running
     marquee, so Playwright's stability check never settles on a card. Hovering
     pauses it, which is exactly the interaction a real user performs — done
     with raw mouse moves so the hover itself needs no stable target. */
  await page.locator('#galerie').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const region = await page.locator('[aria-label="Galerie du projet Honest Signature 7"]').boundingBox();
  await page.mouse.move(region.x + region.width / 2, region.y + region.height / 2);
  await page.waitForTimeout(600); // let the marquee settle into its paused state

  // Measure only once paused, and pick a card that is actually on screen —
  // the looping track leaves the leading cards translated off to the left.
  const target = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('#galerie button[aria-label^="Agrandir la photo"]')];
    const box = buttons
      .map((el) => el.getBoundingClientRect())
      .find((r) => r.left > 8 && r.right < window.innerWidth - 8);
    return box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : null;
  });
  await page.mouse.click(target.x, target.y);
  await page.waitForTimeout(600);
  record('honest: gallery opens the lightbox', await dialog.isVisible());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  /* in-page anchors resolve to a real target */
  for (const id of ['galerie', 'prestations', 'typologies', 'contact-projet']) {
    const found = await page.locator(`#${id}`).count();
    record(`honest: #${id} exists`, found === 1);
  }

  await auditApport(page, 'honest', 'honest');
  await page.close();
}

{
  const { page, consoleErrors, failedRequests } = await open('/residences-honest-678/', MOBILE);
  allConsoleErrors.push(...consoleErrors);
  allFailedRequests.push(...failedRequests);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  record('honest mobile: no horizontal overflow', overflow <= 1, `${overflow}px`);

  await auditCarousel(page, 'honest mobile', 'Galerie du projet Honest Signature 7', ['1/6', '2/6']);
  await auditMobileMenu(page, 'honest mobile');
  await page.close();
}

/* ═══════════════════════════════════════════════════════════════ /contact ══ */

console.log('\n  /contact\n');

const ECHANGE_WA =
  'https://wa.me/212670038899?text=Bonjour%2C%20je%20souhaite%20%C3%A9changer%20avec%20Emara%20Estates%20au%20sujet%20d%27un%20projet%20immobilier%20%C3%A0%20Marrakech.%20Merci';

{
  const { page, consoleErrors, failedRequests } = await open('/contact', DESKTOP);
  allConsoleErrors.push(...consoleErrors);
  allFailedRequests.push(...failedRequests);

  await auditCommon(page, consoleErrors, 'contact');

  /* conversion paths: the three quick links and the float */
  for (const [name, href] of [
    ['tel', 'tel:+212670038899'],
    ['mailto', 'mailto:contact@emaraestates.com'],
    ['whatsapp', ECHANGE_WA],
  ]) {
    record(`contact: ${name} quick link present`, (await page.locator(`a[href="${href}"]`).count()) > 0);
  }
  record(
    'contact: float carries the échange prefill',
    (await page.locator('a[aria-label="Contacter sur WhatsApp"]').getAttribute('href')) ===
      ECHANGE_WA,
  );

  /**
   * Every control must have an accessible name. The legacy page carried these
   * on `aria-label` because its visible labels were aria-hidden animated
   * spans; the port uses real <label for>, so this asserts the outcome rather
   * than the mechanism.
   */
  const unlabelled = await page.evaluate(() =>
    [...document.querySelectorAll('#contactForm input, #contactForm select, #contactForm textarea')]
      .filter((el) => el.type !== 'hidden' && el.id !== 'company-website')
      .filter((el) => {
        const byLabel = el.labels?.length > 0;
        const byAria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
        return !byLabel && !byAria;
      })
      .map((el) => el.id || el.name),
  );
  record('contact: every field has an accessible name', unlabelled.length === 0, unlabelled.join(', '));

  /* the wire contract the PHP handler and downstream automations read */
  const names = await page.evaluate(() =>
    [...document.querySelectorAll('#contactForm [name]')].map((el) => el.name),
  );
  for (const required of ['nom_complet', 'email', 'budget', 'message', 'company_website']) {
    record(`contact: field "${required}" present`, names.includes(required));
  }

  const budgets = await page.locator('#budget-select option').allTextContents();
  record(
    'contact: budget options unchanged',
    budgets.join('|') === 'Budget|1M - 1.5M MAD|2M - 3M MAD|+3M MAD',
    budgets.join('|'),
  );

  /**
   * Fill and submit for real. The static preview serves no PHP, so fetch is
   * stubbed to capture the request the component would have made — that
   * payload is the contract contact.php and the downstream automations read.
   */
  await page.evaluate(() => {
    window.__seen = null;
    const real = window.fetch;
    window.__restoreFetch = () => {
      window.fetch = real;
    };
    window.fetch = (url, init) => {
      window.__seen = { url, body: JSON.parse(init.body) };
      return Promise.resolve(
        new Response(JSON.stringify({ message: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    };
  });

  await page.fill('#contact-name', 'Client Test');
  await page.fill('#contact-email', 'client@example.com');
  await page.fill('#contact-phone', '612345678');
  await page.selectOption('#budget-select', '2M - 3M MAD');
  await page.fill('#contact-message', 'Je souhaite recevoir les plans.');
  await page.click('#contactForm button[type="submit"]');
  await page.waitForTimeout(700);

  const sent = await page.evaluate(() => window.__seen);
  record('contact: submit posts to /contact.php', sent?.url === '/contact.php', String(sent?.url));
  record(
    'contact: payload keeps the legacy field names',
    sent?.body?.nom_complet === 'Client Test' &&
      sent?.body?.email === 'client@example.com' &&
      sent?.body?.budget === '2M - 3M MAD' &&
      sent?.body?.message === 'Je souhaite recevoir les plans.' &&
      typeof sent?.body?.elapsed_ms === 'number' &&
      sent?.body?.source?.endsWith('/contact'),
    JSON.stringify(sent?.body ?? {}).slice(0, 160),
  );
  /**
   * The dialling country is detected from navigator.languages then the
   * timezone, exactly as js/phone-input-country.js did, so it depends on the
   * browser and cannot be a fixed expectation. What must hold is that the four
   * phone fields agree with each other — that is what the CRM reads.
   */
  record(
    'contact: phone fields are internally consistent',
    sent?.body?.telephone === sent?.body?.phoneFull &&
      sent?.body?.phoneFull === `${sent?.body?.phoneCode}${sent?.body?.phoneNumber}` &&
      /^\+\d+$/.test(sent?.body?.phoneCode ?? '') &&
      /^[A-Z]{2}$/.test(sent?.body?.phoneCountryCode ?? ''),
    `${sent?.body?.phoneCountryCode} ${sent?.body?.phoneFull}`,
  );
  record(
    'contact: success modal opens and form resets',
    (await page.locator('#contact-name').inputValue()) === '',
  );

  await page.evaluate(() => window.__restoreFetch());
  await page.close();
}

{
  const { page, consoleErrors, failedRequests } = await open('/contact', MOBILE);
  allConsoleErrors.push(...consoleErrors);
  allFailedRequests.push(...failedRequests);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  record('contact mobile: no horizontal overflow', overflow <= 1, `${overflow}px`);

  /**
   * iOS zooms the viewport when a focused control renders below 16px, which
   * makes a mobile form miserable to fill. Assert the inputs clear that bar.
   */
  const tooSmall = await page.evaluate(() =>
    [...document.querySelectorAll('#contactForm input, #contactForm select, #contactForm textarea')]
      .filter((el) => el.type !== 'hidden' && el.id !== 'company-website')
      .filter((el) => Number.parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => `${el.id}:${getComputedStyle(el).fontSize}`),
  );
  record('contact mobile: no input triggers iOS zoom', tooSmall.length === 0, tooSmall.join(', '));

  const shortTargets = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        '#contactForm input, #contactForm select, #contactForm textarea, #contactForm button',
      ),
    ]
      // The honeypot and the mirrored native <select> behind the custom picker
      // are both offscreen by design; neither is something a thumb can hit.
      .filter(
        (el) =>
          el.type !== 'hidden' &&
          el.id !== 'company-website' &&
          el.getAttribute('aria-hidden') !== 'true',
      )
      .filter((el) => el.getBoundingClientRect().height < 44)
      .map((el) => `${el.id || el.tagName}:${Math.round(el.getBoundingClientRect().height)}`),
  );
  record('contact mobile: tap targets ≥ 44px', shortTargets.length === 0, shortTargets.join(', '));

  await auditMobileMenu(page, 'contact mobile');
  await page.close();
}

/* ══════════════════════════════════════════════════ SEO landing pages ══ */

/**
 * The three landing pages exist for search, so the runtime bar is that every
 * indexed string is reachable without JavaScript having to reveal it: FAQ
 * answers stay in the DOM, anchors resolve, and the bare WhatsApp link is
 * unchanged. They carry no forms, which is asserted rather than assumed.
 */
const LANDING_PAGES = [
  {
    path: '/immobilier-luxe-marrakech',
    label: 'luxe',
    h1: 'Immobilier luxe à Marrakech',
    faqIds: ['faq-luxe-1', 'faq-luxe-2', 'faq-luxe-3'],
  },
  {
    path: '/appartement-neuf-gueliz-marrakech',
    label: 'gueliz',
    h1: 'Appartement neuf à Guéliz Marrakech',
    faqIds: ['faq-gueliz-1', 'faq-gueliz-2', 'faq-gueliz-3'],
    carousel: { ariaLabel: 'Galerie Honest Signature 7 à Guéliz', counter: ['1/4', '2/4'] },
  },
  {
    path: '/investissement-immobilier-marrakech',
    label: 'invest',
    h1: 'Investissement immobilier à Marrakech',
    faqIds: ['faq-invest-1', 'faq-invest-2'],
  },
];

for (const landing of LANDING_PAGES) {
  const { page, consoleErrors } = await open(landing.path, DESKTOP);
  const label = landing.label;

  record(
    `${label}: h1 is the indexed one`,
    (await page.locator('h1').innerText()).trim() === landing.h1,
  );

  record(
    `${label}: #services anchor target exists`,
    (await page.locator('#services').count()) === 1,
  );

  // Every FAQ answer must be in the DOM while collapsed. Unmounting them would
  // strip indexed copy from a page whose entire job is to rank.
  const answers = await page.evaluate(
    (ids) =>
      ids.map((id) => {
        const el = document.getElementById(id);
        return { id, present: Boolean(el), text: el?.textContent?.trim().length ?? 0 };
      }),
    landing.faqIds,
  );
  record(
    `${label}: all FAQ answers stay mounted while collapsed`,
    answers.every((a) => a.present && a.text > 40),
    answers.map((a) => `${a.id}:${a.text}`).join(' '),
  );

  // …and the accordion still opens.
  await page.locator(`#${landing.faqIds[0]}`).scrollIntoViewIfNeeded();
  await page.locator(`button[aria-controls="${landing.faqIds[0]}"]`).click();
  await page.waitForTimeout(700);
  record(
    `${label}: FAQ accordion opens`,
    ((await page.locator(`#${landing.faqIds[0]}`).boundingBox())?.height ?? 0) > 20,
  );

  const wa = await page
    .locator('a[href^="https://wa.me"]')
    .first()
    .getAttribute('href');
  record(
    `${label}: WhatsApp float keeps the bare link`,
    wa === 'https://wa.me/212670038899',
    wa ?? '(none)',
  );

  record(`${label}: page has no form`, (await page.locator('form').count()) === 0);

  await auditCommon(page, consoleErrors, label);
  await page.close();
}

for (const landing of LANDING_PAGES) {
  const { page, consoleErrors } = await open(landing.path, MOBILE);
  const label = `${landing.label} mobile`;
  await auditCommon(page, consoleErrors, label);
  if (landing.carousel) {
    await auditCarousel(page, label, landing.carousel.ariaLabel, landing.carousel.counter);
  }
  await auditMobileMenu(page, label);
  await page.close();
}

/* ══════════════════════════════════════════════════════════ /offre-gueliz ══ */

/**
 * The ads landing page. Its lead contract is proved in `form-parity.mjs`; what
 * matters here is that the page itself behaves — stays un-indexable, ships none
 * of the site chrome, and its two lazy pieces (map, sticky CTA) still work.
 */
{
  const { page, consoleErrors } = await open('/offre-gueliz', DESKTOP);
  const label = 'offre-gueliz';

  record(
    `${label}: stays noindex, nofollow`,
    (await page.locator('meta[name="robots"]').getAttribute('content')) === 'noindex, nofollow',
  );
  record(
    `${label}: no canonical, OG, Twitter or JSON-LD is introduced`,
    (await page.locator('link[rel="canonical"]').count()) === 0 &&
      (await page.locator('meta[property^="og:"]').count()) === 0 &&
      (await page.locator('meta[name^="twitter:"]').count()) === 0 &&
      (await page.locator('script[type="application/ld+json"]').count()) === 0,
  );
  record(
    `${label}: ships none of the site chrome`,
    (await page.locator('.site-nav, #mobile-menu, [data-intro-curtain]').count()) === 0 &&
      (await page.locator('a[href^="https://wa.me"]').count()) === 0,
  );
  record(
    `${label}: h1 is the project headline`,
    (await page.locator('h1').innerText()) === 'Une adresse d’exception au cœur de Guéliz',
  );

  // The map must stay unloaded until asked for — it is the heaviest asset here.
  record(
    `${label}: map iframe is not loaded on arrival`,
    (await page.locator('[data-map] iframe').count()) === 0,
  );
  await page.locator('[data-map-trigger]').scrollIntoViewIfNeeded();
  await page.locator('[data-map-trigger]').click();
  await page.waitForTimeout(600);
  const mapSrc = await page.locator('[data-map] iframe').getAttribute('src');
  record(
    `${label}: map loads on click with the legacy embed`,
    (mapSrc ?? '').startsWith('https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d875.84'),
    mapSrc ? 'embed present' : '(no iframe)',
  );
  record(
    `${label}: map iframe keeps its title`,
    (await page.locator('[data-map] iframe').getAttribute('title')) ===
      'Carte de la résidence à Guéliz, Marrakech',
  );

  // Every CTA on the page scrolls to the form; none of them navigates.
  const ctaCount = await page.locator('[data-scroll-to-form]').count();
  record(`${label}: three scroll-to-form CTAs`, ctaCount === 3, `${ctaCount}`);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.locator('header [data-scroll-to-form]').click();
  await page.waitForTimeout(900);
  /**
   * The legacy handler is a bare `scrollIntoView({ block: 'start' })` with no
   * offset, and `#og-form` is the last section, so how close it lands to the
   * top depends on how much page is left below it. The contract is that the
   * CTA brings the form into view, which is what gets asserted.
   */
  const scrolled = await page.evaluate(() => {
    const rect = document.querySelector('#og-form').getBoundingClientRect();
    return { top: rect.top, inView: rect.top < window.innerHeight * 0.5 && rect.bottom > 0, y: window.scrollY };
  });
  record(
    `${label}: header CTA scrolls the form into view`,
    scrolled.inView && scrolled.y > 0,
    `top ${Math.round(scrolled.top)}px, scrollY ${Math.round(scrolled.y)}`,
  );
  record(`${label}: still on the same URL`, new URL(page.url()).pathname === '/offre-gueliz');

  record(
    `${label}: footer keeps both links`,
    (await page.locator('footer a[href="/"]').count()) === 1 &&
      (await page.locator('footer a[href="/contact"]').count()) === 1,
  );

  await auditCommon(page, consoleErrors, label);
  await page.close();
}

{
  const { page, consoleErrors } = await open('/offre-gueliz', MOBILE);
  const label = 'offre-gueliz mobile';

  // Sticky CTA is hidden at the top, appears once the visitor scrolls, and is
  // kept out of the tab order because it duplicates the header CTA.
  const stickyHidden = await page.evaluate(() => {
    const el = document.querySelector('[data-sticky-cta]');
    return el.getBoundingClientRect().top >= window.innerHeight - 1;
  });
  record(`${label}: sticky CTA hidden at the top`, stickyHidden);
  await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 1.5, behavior: 'instant' }));
  await page.waitForTimeout(700);
  const stickyShown = await page.evaluate(() => {
    const el = document.querySelector('[data-sticky-cta]');
    return el.getBoundingClientRect().top < window.innerHeight - 10;
  });
  record(`${label}: sticky CTA appears after scrolling`, stickyShown);
  record(
    `${label}: sticky CTA is exposed once shown`,
    (await page.locator('[data-sticky-cta]').getAttribute('aria-hidden')) === 'false' &&
      (await page.locator('[data-sticky-cta] button').getAttribute('tabindex')) === '0',
  );
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(500);
  record(
    `${label}: sticky CTA leaves the tab order again at the top`,
    (await page.locator('[data-sticky-cta]').getAttribute('aria-hidden')) === 'true' &&
      (await page.locator('[data-sticky-cta] button').getAttribute('tabindex')) === '-1',
  );

  // The form fields must not trigger iOS auto-zoom.
  await page.locator('label[for="projectType-0"]').click();
  await page.locator('[data-next]').first().click();
  await page.waitForTimeout(400);
  await page.locator('label[for="apartmentType-0"]').click();
  await page.locator('[data-step]:not([hidden]) [data-next]').click();
  await page.waitForTimeout(400);
  await page.locator('label[for="timeframe-0"]').click();
  await page.waitForTimeout(400);
  const smallFields = await page.evaluate(() =>
    [...document.querySelectorAll('#og-lead-form input:not([type="hidden"]):not([type="radio"])')]
      .filter((el) => el.getAttribute('aria-hidden') !== 'true')
      .filter((el) => Number.parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => `${el.id}:${getComputedStyle(el).fontSize}`),
  );
  record(`${label}: no input triggers iOS zoom`, smallFields.length === 0, smallFields.join(', '));

  const smallTaps = await page.evaluate(() =>
    [...document.querySelectorAll('#og-lead-form button, #og-lead-form label.cursor-pointer')]
      .filter((el) => el.getAttribute('aria-hidden') !== 'true')
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.height > 0 && r.height < 44;
      })
      .map((el) => `${el.textContent.trim().slice(0, 18)}:${Math.round(el.getBoundingClientRect().height)}`),
  );
  record(`${label}: tap targets ≥ 44px`, smallTaps.length === 0, smallTaps.join(', '));

  await auditCommon(page, consoleErrors, label);
  await page.close();
}

/* ═══════════════════════════════════════════════════════════════ reporting ══ */

console.log('');

const only404s = allConsoleErrors.filter((e) => /Failed to load resource.*404/.test(e));
const realErrors = allConsoleErrors.filter(
  (e) => !HARNESS_NOISE.test(e) && !/Failed to load resource.*404/.test(e),
);
record('console is clean', realErrors.length === 0, realErrors.slice(0, 5).join(' | '));

const realFailures = allFailedRequests.filter((r) => !PHP_ENDPOINTS.test(r));
record(
  'the only 404s are the PHP endpoints',
  realFailures.length === 0,
  `${only404s.length} 404(s), all form endpoints${realFailures.length ? `; also ${realFailures.slice(0, 3).join(' | ')}` : ''}`,
);

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${failed.length ? `${failed.length} failed` : `All ${results.length} checks passed`}.\n`);
process.exit(failed.length ? 1 : 0);
