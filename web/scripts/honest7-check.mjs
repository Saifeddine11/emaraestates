/**
 * /honest-signature-7/ behaviour checks — the dedicated Meta Ads landing.
 *
 *   node scripts/honest7-check.mjs            Chromium
 *   BROWSER=webkit node scripts/honest7-check.mjs   WebKit (Safari's engine)
 *
 * Runs against the production export (`next build` first). /contact.php is
 * always stubbed: nothing is ever sent to Zapier from here.
 */

import { chromium, webkit } from 'playwright';
import { readFileSync } from 'node:fs';
import { startServer } from './lib/serve.mjs';

// The page’s switches (VALIDATION in the content file). A record that depends
// on one follows it, so the same script checks the page with a switch on or off.
const CONTENT = readFileSync(new URL('../src/lib/content/honest-signature-7.ts', import.meta.url), 'utf8');
const FLAGS = Object.fromEntries(['euroPrices', 'threeBedrooms', 'activityCounter', 'partialCapture'].map((name) => [name, new RegExp(`^  ${name}: true,`, 'm').test(CONTENT)]));
const MONEY = FLAGS.euroPrices
  ? { hero: '145\u00a0000\u00a0€', budget: '145 000 – 180 000 €', budgetButton: /145 000 – 180 000 €/, range: /€$/, currency: 'EUR', preset: /^180.000.€$/, start: ['43 500', '21 750', '36 250'], typed: '180000', typedShown: '180 000', typedRows: ['54 000', '27 000', '45 000'], below: '90000', unit: '€' }
  : { hero: '1,59', budget: '1,59 M – 2 M MAD', budgetButton: /1,59 M – 2 M/, range: /MAD$/, currency: 'MAD', preset: /^2.M$/, start: ['477 000', '238 500', '397 500'], typed: '2000000', typedShown: '2 000 000', typedRows: ['600 000', '300 000', '500 000'], below: '900000', unit: 'MAD' };
const ROOMS = FLAGS.threeBedrooms ? /^(1 chambre|2 chambres|3 chambres)$/ : /^(Studio|1 chambre|2 chambres)$/;

const engine = process.env.BROWSER === 'webkit' ? webkit : chromium;
const { server, base } = await startServer();
const browser = await engine.launch();
const results = [];
const path = '/honest-signature-7/';
const query =
  '?utm_source=facebook&utm_medium=paid_social&utm_campaign=hs7-test&utm_content=creative-a&utm_term=gueliz&campaign_id=cmp-1&adset_id=set-2&ad_id=ad-3&fbclid=click-4';

const WIDTHS = [360, 375, 390, 430, 768, 1024, 1280, 1440];
const FUNNEL_EVENTS = [
  'landing_view',
  'hero_primary_cta_click',
  'hero_show_apartment_click',
  'form_view',
  'form_started',
  'lead_submit_attempt',
  'lead_submit_success',
  'post_lead_intent_selected',
  'contact_channel_selected',
  'visit_booking_started',
  'show_apartment_view',
  'show_apartment_cta_click',
  'payment_simulator_started',
  'payment_simulator_completed',
  'availability_cta_click',
  'faq_opened',
  'phone_click',
  'whatsapp_click',
];

function record(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok) });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function open(viewport, { reducedMotion = 'no-preference', search = query, clock = false, snap = 'record', activity = null } = {}) {
  const mobile = viewport.width < 800;
  const context = await browser.newContext({ viewport, reducedMotion, isMobile: engine === chromium && mobile, hasTouch: mobile, locale: 'fr-FR' });
  await context.addCookies([
    { name: '_fbc', value: 'fb.1.test-click', url: base },
    { name: '_fbp', value: 'fb.1.test-browser', url: base },
  ]);
  await context.addInitScript((snapMode) => {
    window.__fbq = [];
    // `__metaDown` lets a test make Meta's pixel fail after the page has loaded.
    window.fbq = (...args) => {
      if (window.__metaDown) throw new Error('meta pixel down');
      window.__fbq.push(args);
    };
    // The real Snap base code does nothing on localhost; with this recorder in
    // place it runs its own init + PAGE_VIEW through it, exactly once.
    window.__snap = [];
    if (snapMode === 'record') window.snaptr = (...args) => window.__snap.push(args);
    if (snapMode === 'throw') {
      window.snaptr = (...args) => {
        window.__snap.push(args);
        if (args[0] === 'track' && args[1] !== 'PAGE_VIEW') throw new Error('snap pixel down');
      };
    }
    window.__beacons = [];
    navigator.sendBeacon = (url, body) => {
      body.text().then((text) => window.__beacons.push({ url: String(url), body: JSON.parse(text) }));
      return true;
    };
  }, snap);
  const page = await context.newPage();
  const phpCalls = [];
  page.on('request', (request) => /\.php$/.test(new URL(request.url()).pathname) && phpCalls.push(new URL(request.url()).pathname));
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => message.type() === 'error' && !/ERR_FAILED|Failed to load resource|access control checks/.test(message.text()) && errors.push(message.text()));
  const notFound = [];
  page.on('response', (response) => response.status() >= 400 && new URL(response.url()).origin === base && notFound.push(`${response.status()} ${new URL(response.url()).pathname}`));
  await page.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    if (/facebook|snapchat|sc-static|ahrefs|country\.is/.test(host)) return route.abort();
    return route.continue();
  });
  // /lead-draft.php does not exist on this static harness: answer like the real
  // endpoint and keep what the page sent (fetch requests only — beacons are stubbed above).
  const drafts = [];
  await page.route('**/lead-draft.php', (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    drafts.push(body);
    return body.action === 'sweep'
      ? route.fulfill({ status: 204, body: '' })
      : route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"captured":true}' });
  });
  // Without `activity` the harness answers "disabled" and the page shows no activity band.
  // With it, every poll gets `activity.status` / `activity.body` as they are at that moment.
  const activityRequests = [];
  if (activity) {
    await page.route('**/activity.php', (route) => {
      activityRequests.push(Date.now());
      const body = typeof activity.body === 'string' ? activity.body : JSON.stringify(activity.body);
      return route.fulfill({ status: activity.status ?? 200, contentType: 'application/json', body });
    });
  }
  if (clock) await page.clock.install();
  await page.goto(`${base}${path}${search}`, { waitUntil: 'networkidle' });
  return { context, page, errors, notFound, drafts, activityRequests, phpCalls };
}

/** Replaces /contact.php with a recorder answering `status`. */
/** A server answer for /activity.php: `requests` received on `day`. */
const requestsToday = (requests, day = '2026-10-04') => ({ ok: true, enabled: true, day, requests });

/** What the activity band of the first lead card shows right now (null when it is not rendered). */
function band(page) {
  return page.evaluate(() => {
    const node = document.querySelector('#dossier [data-activity]');
    if (!node) return null;
    const plus = node.querySelector('[data-plus-one]');
    const count = node.querySelector('[data-activity-count]');
    // The label, the count and its caption as displayed — without the travelling « +1 » or the screen-reader line.
    const text = [node.querySelector('p'), count, count.nextElementSibling].map((part) => part.innerText).join(' ');
    return {
      text: text.replace(/\s+/g, ' ').trim(),
      count: count.textContent.trim(),
      plus: plus ? plus.textContent.trim() : null,
      announced: node.querySelector('[aria-live]').textContent,
    };
  });
}

async function stubContact(page, status = 200) {
  await page.evaluate((code) => {
    window.__requests = [];
    const realFetch = window.fetch.bind(window);
    window.fetch = (url, init) => {
      if (!String(url).includes('/contact.php')) return realFetch(url, init);
      window.__requests.push(JSON.parse(init.body));
      const body = code === 200 ? { message: 'ok' } : { message: 'Erreur' };
      return Promise.resolve(new Response(JSON.stringify(body), { status: code, headers: { 'Content-Type': 'application/json' } }));
    };
  }, status);
}

const fbq = (page) => page.evaluate(() => window.__fbq.map((args) => `${args[0]}:${args[1]}`));
const snapCalls = (page) => page.evaluate(() => window.__snap.map((args) => `${args[0]}:${args[1]}`));
const SNAP_PIXEL_ID = '131b50b1-799c-4d5c-a2e5-343feb50333a';
const META_PIXEL_ID = '1049553054304565';
/** The event types Snap's pixel accepts and this page uses. */
const SNAP_EVENT_TYPES = ['PAGE_VIEW', 'VIEW_CONTENT', 'CUSTOM_EVENT_1', 'SIGN_UP'];
const count = (list, name) => list.filter((entry) => entry === name).length;
const settle = (page, ms = 700) => page.waitForTimeout(ms);

/** Answers the two one-tap questions (type, budget) so the contact step is on screen. */
async function toContact(page, prefix = 'hs7-hero') {
  const card = page.locator(prefix === 'hs7-hero' ? '#dossier' : '#disponibilites');
  await card.scrollIntoViewIfNeeded();
  if (await page.locator(`#${prefix}-name`).count()) return;
  const type = card.getByRole('button', { name: '2 chambres', exact: true });
  if (await type.count()) await type.click();
  await card.getByRole('button', { name: MONEY.budgetButton }).click();
  await page.locator(`#${prefix}-name`).waitFor();
}

async function fill(page, prefix, { email = 'client@example.com' } = {}) {
  await toContact(page, prefix);
  await page.fill(`#${prefix}-name`, 'Client Test');
  await page.fill(`#${prefix}-phone`, '612345678');
  if (email) await page.fill(`#${prefix}-email`, email);
}

console.log(`\nHONEST SIGNATURE 7 — PAID LANDING QA (${engine.name()})\n`);

/* ── Structure, copy, SEO ────────────────────────────────────────────────── */
{
  const { context, page, errors, notFound } = await open({ width: 1440, height: 900 });
  const state = await page.evaluate(() => ({
    title: document.title,
    canonical: document.querySelector('link[rel="canonical"]')?.href,
    robots: document.querySelector('meta[name="robots"]')?.content,
    viewport: document.querySelector('meta[name="viewport"]')?.content,
    h1: document.querySelector('h1')?.textContent.replace(/\s+/g, ' ').trim().toUpperCase(),
    h1Count: document.querySelectorAll('h1').length,
    sections: Array.from(document.querySelectorAll('main > section')).map((section) => section.getAttribute('aria-labelledby')),
    forms: document.querySelectorAll('main [data-lead-form]').length,
    navs: document.querySelectorAll('nav').length,
    headerLinks: Array.from(document.querySelectorAll('header a')).map((a) => a.getAttribute('href')),
    preloads: Array.from(document.querySelectorAll('link[rel="preload"][as="image"][imagesrcset]')).map((link) => `${link.media} → ${link.getAttribute('imagesrcset').split(' ')[0]}`),
    text: document.body.innerText,
    lazy: Array.from(document.querySelectorAll('main img')).filter((img) => img.loading !== 'lazy').length,
    unsized: Array.from(document.querySelectorAll('img')).filter((img) => !img.getAttribute('width') || !img.getAttribute('height')).length,
  }));
  record('SEO: title, canonical, indexable', /Honest Signature 7/.test(state.title) && state.canonical === 'https://emaraestates.com/honest-signature-7/' && /index/.test(state.robots || ''));
  record('Viewport: viewport-fit=cover (safe-area insets available)', /viewport-fit=cover/.test(state.viewport || ''), state.viewport);
  record('A11y: exactly one H1', state.h1Count === 1);
  record('Hero: headline', state.h1.replace(/ /g, '') === 'UNEDERNIÈREOPPORTUNITÉAUCŒURDEGUÉLIZ.', state.h1);
  record(
    'Flow: hero → proof → payment → form, then the rest',
    state.sections.join() === 'hero-title,track-title,payment-title,dossier-title,show-title,amenities-title,location-title,scarcity-title,faq-title,final-title',
    state.sections.join(),
  );
  record('Forms: the lead card twice (before the show apartments, and at the end)', state.forms === 2, String(state.forms));
  // The header carries the (scroll-revealed) form CTA, the phones' « Appeler » pill that leads to the form too,
  // and the phone number from lg — nothing that leaves the page.
  record('Header: no navigation, only the two form links and one phone link', state.navs === 0 && state.headerLinks.join() === '#dossier,#dossier,tel:+212670038899', state.headerLinks.join());
  record('Positioning: no “résidence boutique”', !/r[ée]sidence boutique/i.test(state.text));
  record('Copy: no luxury clichés, no guaranteed return', !/prestige absolu|incomparable|redefined|garanti/i.test(state.text));
  record('Copy: safe land claim only', /L’un des derniers terrains disponibles/.test(state.text) && !/le dernier terrain/i.test(state.text));
  record('Copy: no placeholder left', !/\[[^\]]{2,40}\]|lorem|TODO/i.test(state.text));
  record('Copy: accents — never “GUELIZ” / “DERNIERE”', !/GUELIZ|DERNIERE|OPPORTUNITE\b/.test(state.text));
  record('Copy: no fake urgency', !/plus que \d|derniers appartements|personnes regardent|\d+ réservés/i.test(state.text));
  const hero = page.locator('section[aria-labelledby="hero-title"]');
  const heroText = (await hero.innerText()).toLowerCase();
  record('Hero: price, Plaza, delivery, proof — no dirham figure when the page is in euros', [MONEY.hero, '1 minute', 'juin 2028', 'déjà livrées', 'en commercialisation'].every((word) => heroText.includes(word)) && (!FLAGS.euroPrices || !/\bmad\b/.test(heroText)));
  record('Hero: Honest 5–6 sold, kept apart from the delivered ones', heroText.includes('déjà vendues'), heroText.replace(/\s+/g, ' ').slice(-220));
  record('Copy: remaining stock is not shown anywhere on the page', !/appartements? restants?|restants? sur|sur 140|sur 150/i.test(state.text.replace(/\u00a0/g, ' ')));
  record('Hero: what is sold and how it is paid — typologies, minimum surface, 30 % then progressive', ['studios & appartements', 'dès 51 m²', '30 % à la réservation', 'solde progressif jusqu’à juin 2028'].every((word) => heroText.replace(/\u00a0/g, ' ').includes(word)), heroText.replace(/\s+/g, ' ').slice(0, 400));
  record('Copy: with no data, no counter of any kind — no "+1", no "aujourd’hui" figure, no "live" claim', !/en direct|vendus? aujourd|vendus? en 7 jours|\+1\b/i.test(state.text.replace(/\u00a0/g, ' ')));
  record('Hero: all 8 amenities', (await hero.locator('ul[aria-label="Services de la résidence"] li').count()) === 8);
  const ctaLabels = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href="#dossier"], a[href="#disponibilites"]')).map((link) => link.textContent.replace(/\s+/g, ' ').trim()),
  );
  // One exception: the header's « Appeler » pill on phones.
  const ctaOthers = ctaLabels.filter((label) => label !== 'Appeler');
  record('CTAs: every link to the form says « Demander les disponibilités », the header’s « Appeler » aside', ctaLabels.length - ctaOthers.length === 1 && ctaOthers.length >= 5 && ctaOthers.every((label) => label === 'Demander les disponibilités'), ctaLabels.join(' | '));
  // No load-in: the first screen is painted as it is, nothing waits for an animation.
  const heroStill = await hero.evaluate((node) => Array.from(node.querySelectorAll('h1 span, p, dl, a, li')).filter((el) => getComputedStyle(el).animationName !== 'none' || getComputedStyle(el).opacity !== '1').length);
  record('Hero: painted at once — headline, facts, CTAs and amenities have no load-in animation', heroStill === 0, `${heroStill} animated`);
  const orbit = await page.evaluate(() => {
    const rings = Array.from(document.querySelectorAll('a .hs7-orbit'));
    const light = getComputedStyle(document.querySelector('[data-hero-cta] .hs7-orbit > span'));
    return { rings: rings.length, onForms: rings.filter((ring) => ring.closest('[data-lead-form]')).length, name: light.animationName, loops: light.animationIterationCount, hidden: rings.every((ring) => ring.getAttribute('aria-hidden') === 'true') };
  });
  record('CTAs: a light turns around the border of each one (a transform, never a repaint), hidden from assistive tech', orbit.rings === 7 && orbit.onForms === 0 && orbit.name === 'hs7-orbit' && orbit.loops === 'infinite' && orbit.hidden, JSON.stringify(orbit));
  record('Hero: two CTAs', (await hero.getByRole('link', { name: /Demander les disponibilités/ }).count()) === 1 && (await hero.getByRole('link', { name: /Voir les appartements témoins/ }).count()) === 1);
  record('Amenities: all nine named on the page', ['piscine extérieure', 'piscine intérieure chauffée', 'spa', 'sauna', 'jacuzzi', 'salle de sport', 'cinéma extérieur', 'conciergerie', 'parking titré'].every((word) => state.text.toLowerCase().includes(word)));
  record('Track record: delivered ≠ sold (no “6 résidences”)', /4 RÉSIDENCES DÉJÀ LIVRÉES/.test(state.text) && !/6 résidences/i.test(state.text));
  record(
    'Performance: hero preloaded — mobile crop below lg, full render from lg',
    state.preloads.join(' | ') === '(max-width: 1023px) → /media/honest-7/facade-mobile-640.webp | (min-width: 1024px) → /media/honest-7/facade-jour-640.webp',
    state.preloads.join(' | '),
  );
  const heroImg = await hero.locator('img').first().evaluate((node) => ({ loading: node.loading, priority: node.getAttribute('fetchpriority'), ok: node.complete && node.naturalWidth > 0, file: node.currentSrc.split('/').pop() }));
  record('Performance: LCP image eager + high priority', heroImg.loading === 'eager' && heroImg.priority === 'high' && heroImg.ok && /^(facade-jour|honest006)/.test(heroImg.file), heroImg.file);
  record('Performance: every other image lazy', state.lazy === 1, `${state.lazy} eager`);
  record('CLS: every image has width and height', state.unsized === 0, `${state.unsized} unsized`);
  const events = await fbq(page);
  record('Tracking: landing_view + ViewContent, once each', count(events, 'trackCustom:landing_view') === 1 && count(events, 'track:ViewContent') === 1, events.join(', '));
  record('Tracking: no Lead on load', !events.includes('track:Lead'));
  const snapOnLoad = await snapCalls(page);
  const baseScripts = await page.evaluate(() => ({ meta: document.querySelectorAll('script#meta-pixel').length, snap: document.querySelectorAll('script#snap-pixel').length }));
  record('Meta Pixel: one base script, initialised once, PageView once', baseScripts.meta === 1 && count(events, `init:${META_PIXEL_ID}`) === 1 && events.filter((entry) => entry.startsWith('init:')).length === 1 && count(events, 'track:PageView') === 1, events.join(', '));
  record('Snap Pixel: one base script, initialised once with the configured ID, PAGE_VIEW once', baseScripts.snap === 1 && count(snapOnLoad, `init:${SNAP_PIXEL_ID}`) === 1 && snapOnLoad.filter((entry) => entry.startsWith('init:')).length === 1 && count(snapOnLoad, 'track:PAGE_VIEW') === 1, snapOnLoad.join(', '));
  record('Snap: VIEW_CONTENT once on the landing view, no lead conversion on load', count(snapOnLoad, 'track:VIEW_CONTENT') === 1 && !snapOnLoad.includes('track:SIGN_UP') && !snapOnLoad.includes('track:CUSTOM_EVENT_1'), snapOnLoad.join(', '));
  record('Platforms: Meta\'s ViewContent is not relayed to Snap, Snap\'s VIEW_CONTENT not to Meta', !snapOnLoad.some((entry) => /ViewContent|CUSTOM_EVENT$|landing_view/.test(entry)) && !events.some((entry) => /VIEW_CONTENT|PAGE_VIEW/.test(entry)));
  record('Network: no 4xx/5xx from the site', notFound.length === 0, notFound.join(' | '));
  record('Console: no runtime or hydration error', errors.length === 0, errors.join(' | '));
  await context.close();
}

/* ── Every width: overflow, headline fit, CTAs, sticky bar ──────────────── */
for (const width of WIDTHS) {
  const mobile = width < 1024;
  const { context, page, errors } = await open({ width, height: mobile ? 780 : 900 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  record(`${width}px: no horizontal overflow`, overflow <= 0, String(overflow));
  // The h1 lines are nowrap inside a clipping mask: a line wider than its mask would lose its last letters.
  const clipped = await page.evaluate(() => Array.from(document.querySelectorAll('h1 > span')).filter((mask) => mask.firstElementChild.scrollWidth > mask.clientWidth + 1).length);
  record(`${width}px: headline fits its column`, clipped === 0, `${clipped} clipped line(s)`);

  const heroFile = await page.locator('section[aria-labelledby="hero-title"] img').first().evaluate((node) => node.currentSrc.split('/').pop());
  record(`${width}px: hero serves the ${mobile ? '2:1 mobile crop' : 'full render'}`, mobile ? /^facade-mobile-/.test(heroFile) : /^(facade-jour-|honest006)/.test(heroFile), heroFile);

  const primary = page.locator('[data-hero-cta]');
  const box = await primary.boundingBox();
  if (mobile) record(`${width}px: primary CTA in the first screen`, box && box.y + box.height <= 780, box ? `bottom at ${Math.round(box.y + box.height)}px` : 'missing');

  await page.getByRole('link', { name: /Voir les appartements témoins/ }).click();
  await settle(page, 1800);
  const showTop = await page.locator('#appartements-temoins').evaluate((node) => node.getBoundingClientRect().top);
  record(`${width}px: secondary CTA reaches the show apartments`, showTop > -40 && showTop < 140, String(Math.round(showTop)));

  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page, 300);
  await primary.click();
  await settle(page, 1800); // the form now sits below the proof and the payment plan: a longer scroll
  // The CTA lands on the heading that introduces the form, with the card in view under (or beside) it.
  const arrival = await page.evaluate(() => {
    const intro = document.querySelector('[data-lead-intro="hero"]').getBoundingClientRect();
    const card = document.querySelector('#dossier').getBoundingClientRect();
    return { top: Math.min(intro.top, card.top), introAbove: intro.top <= card.top, cardTop: card.top, viewport: window.innerHeight, heading: document.querySelector('#dossier-title').textContent.replace(/\s+/g, ' ').trim() };
  });
  record(`${width}px: primary CTA reaches the first form`, arrival.top > -10 && arrival.top < 140, String(Math.round(arrival.top)));
  record(`${width}px: the form is announced — its heading is on screen above the first question`, arrival.introAbove && /recevez le dossier/i.test(arrival.heading) && arrival.cardTop < arrival.viewport * 0.6, JSON.stringify({ cardTop: Math.round(arrival.cardTop), heading: arrival.heading }));

  const headerPill = page.locator('header').getByRole('link', { name: 'Appeler', exact: true });
  if (mobile) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(page, 300);
    await headerPill.click();
    await settle(page, 1800);
    const pillTop = await page.evaluate(() => Math.min(document.querySelector('[data-lead-intro="hero"]').getBoundingClientRect().top, document.querySelector('#dossier').getBoundingClientRect().top));
    record(`${width}px: header « Appeler » reaches the first form`, pillTop > -10 && pillTop < 140, String(Math.round(pillTop)));
  } else {
    record(`${width}px: header shows the phone number, not « Appeler »`, !(await headerPill.isVisible()) && (await page.locator('header a[href^="tel:"]').isVisible()));
  }

  const sticky = page.locator('[data-sticky-cta]');
  if (mobile) {
    record(`${width}px: sticky CTA hidden while the form is on screen`, (await sticky.getAttribute('aria-hidden')) === 'true');
    await page.locator('#services').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 200));
    await settle(page, 500);
    const before = await page.evaluate(() => { window.scrollTo({ top: document.querySelector('#promoteur').offsetTop + 200, behavior: 'instant' }); return true; });
    await settle(page, 400);
    const beforeForm = (await sticky.getAttribute('aria-hidden')) === 'false';
    await page.locator('#services').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 200));
    await settle(page, 500);
    record(`${width}px: sticky CTA available while reading the proof and the payment plan, before the form`, before && beforeForm);
    record(`${width}px: sticky CTA shown past the form`, (await sticky.getAttribute('aria-hidden')) === 'false');
    const metrics = await sticky.evaluate((bar) => {
      const link = bar.querySelector('a').getBoundingClientRect();
      return { bottomGap: window.innerHeight - link.bottom, height: link.height, padding: getComputedStyle(bar).paddingBottom };
    });
    record(`${width}px: sticky CTA ≥ 12px above the bottom edge, 56px tall`, metrics.bottomGap >= 12 && metrics.height >= 56, JSON.stringify(metrics));
    await page.locator('#hs7-simulator-price').focus();
    await settle(page, 400);
    record(`${width}px: sticky CTA hidden while a field has focus (keyboard)`, (await sticky.getAttribute('aria-hidden')) === 'true');
    await page.locator('#hs7-simulator-price').blur();
    await page.locator('#questions').scrollIntoViewIfNeeded();
    await settle(page, 400);
    await sticky.locator('a').click();
    await settle(page, 1000);
    const finalTop = await page.evaluate(() => Math.min(document.querySelector('[data-lead-intro="final"]').getBoundingClientRect().top, document.querySelector('#disponibilites').getBoundingClientRect().top));
    record(`${width}px: sticky CTA goes to the nearest form`, finalTop > -10 && finalTop < 140, String(Math.round(finalTop)));
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await settle(page, 500);
    const clearance = await page.evaluate(() => {
      const last = Array.from(document.querySelectorAll('footer p')).pop().getBoundingClientRect();
      const bar = document.querySelector('[data-sticky-cta] a').getBoundingClientRect();
      return { shown: document.querySelector('[data-sticky-cta]').getAttribute('aria-hidden') === 'false', gap: bar.top - last.bottom };
    });
    // Either the closing form is still on screen (bar hidden) or the bar sits clear of the last line.
    record(`${width}px: at the very bottom, the sticky bar never covers the footer`, !clearance.shown || clearance.gap >= 8, clearance.shown ? `${Math.round(clearance.gap)}px between the last line and the bar` : 'bar hidden: the closing form is on screen');
  } else {
    record(`${width}px: no mobile sticky bar on desktop`, await sticky.evaluate((bar) => getComputedStyle(bar).display === 'none'));
    await page.locator('#services').scrollIntoViewIfNeeded();
    await settle(page, 500);
    record(`${width}px: header CTA appears past the form`, await page.locator('header').getByRole('link', { name: 'Demander les disponibilités' }).isVisible());
  }
  record(`${width}px: no console error`, errors.length === 0, errors.join(' | '));
  await context.close();
}

/* ── Gallery, simulator, FAQ, contact links ─────────────────────────────── */
{
  const { context, page } = await open({ width: 390, height: 780 });
  await page.locator('#appartements-temoins').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 420));
  await settle(page, 500);
  const track = page.locator('#appartements-temoins ul[tabindex="0"]');
  const before = await track.evaluate((node) => node.scrollLeft);
  await track.evaluate((node) => node.scrollTo({ left: node.clientWidth, behavior: 'instant' }));
  await settle(page, 500);
  const counter = await page.locator('#appartements-temoins p[aria-live]').innerText();
  record('Gallery: swipes, counter follows (no dots)', (await track.evaluate((node) => node.scrollLeft)) > before && /^0[2-5] \/ 05$/.test(counter.replace(/\s+/g, ' ')), counter);
  record('Gallery: 5 real interiors, each attributed to a delivered residence', (await page.locator('#appartements-temoins figure').count()) === 5 && (await page.locator('#appartements-temoins figcaption').filter({ hasText: /Honest [1-4] · livrée/i }).count()) === 5);

  const price = page.locator('#hs7-simulator-price');
  await price.scrollIntoViewIfNeeded();
  const rows = () => page.locator('#echeancier ol li').evaluateAll((items) => items.map((item) => item.innerText.replace(/\s+/g, ' ').trim()));
  const initial = await rows();
  record(`Simulator: starting price → ${MONEY.start.join(' / ')}`, MONEY.start.every((amount) => initial.join(' ').replace(/ /g, ' ').includes(amount)), initial.join(' | '));
  await price.fill(MONEY.typed);
  await settle(page, 1200);
  const updated = (await rows()).join(' ').replace(/ /g, ' ');
  record(`Simulator: ${MONEY.typedShown} → ${MONEY.typedRows.join(' / ')}, every amount in ${MONEY.unit}`, MONEY.typedRows.every((amount) => new RegExp(`${amount} ?${MONEY.unit}`).test(updated)) && (!FLAGS.euroPrices || !/MAD/.test(updated)), updated);
  record('Simulator: input shows thousands separators', (await price.inputValue()).replace(/ /g, ' ') === MONEY.typedShown);
  await price.fill(MONEY.below);
  await settle(page, 300);
  record('Simulator: below the starting price → explained, no amounts', await page.getByText('Le projet démarre à').isVisible());
  await price.blur();
  record('Simulator: not called a “mensualité”', !/mensualit/i.test(await page.locator('#echeancier').innerText()));
  // The price is shown in euros; the price in dirhams stays on the page wherever the euro figure is explained.
  const faqText = (await page.locator('#questions').evaluate((node) => node.textContent)).replace(/\s+/g, ' ');
  const planText = (await page.locator('#echeancier').innerText()).replace(/\s+/g, ' ');
  if (FLAGS.euroPrices) {
    record('Price: euros given as indicative, next to the price in dirhams (FAQ, simulator note)', /prix de 145 000 € \?/.test(faqText) && /1 590 000 MAD, soit environ 145 000 € au taux de change actuel/.test(faqText) && /Le prix de départ est de 1 590 000 MAD/.test(planText), planText.slice(-220));
  } else {
    record('Price: in dirhams everywhere — no euro figure in the FAQ or the simulator', /prix de 1,59 M MAD \?/.test(faqText) && /prix de départ du projet : 1 590 000 MAD\. Le prix de chaque/.test(faqText) && !/€/.test(faqText) && !/€/.test(planText), planText.slice(-160));
  }

  await page.locator('#questions summary').nth(4).click();
  await settle(page, 300);
  record('FAQ: 7 questions, answer opens', (await page.locator('#questions details').count()) === 7 && (await page.locator('#questions details[open] p').isVisible()));

  await page.evaluate(() => document.addEventListener('click', (event) => event.target.closest('a[href^="tel:"], a[href*="wa.me"]') && event.preventDefault()));
  await page.locator('footer a[href^="tel:"]').click();
  await page.locator('footer a[href*="wa.me"]').click();
  const events = await fbq(page);
  record('Tracking: simulator started + completed once', count(events, 'trackCustom:payment_simulator_started') === 1 && count(events, 'trackCustom:payment_simulator_completed') === 1);
  record('Tracking: show_apartment_view, faq_opened, phone_click, whatsapp_click', ['show_apartment_view', 'faq_opened', 'phone_click', 'whatsapp_click'].every((name) => events.includes(`trackCustom:${name}`)), events.filter((entry) => entry.startsWith('trackCustom')).join(', '));
  await context.close();
}

/* ── The lead: validation, one request, Lead after success only ─────────── */
{
  const { context, page } = await open({ width: 390, height: 780 });
  await stubContact(page);
  await page.locator('#dossier').scrollIntoViewIfNeeded();
  const card = page.locator('#dossier');
  // Step 1 — the easy question first: nothing to type.
  const cardText = async () => (await card.innerText()).replace(/ /g, ' ');
  record('Form step 1: asks the type of apartment, three one-tap answers, no field to fill', /Quel type d’appartement recherchez-vous \?/.test(await cardText()) && (await card.getByRole('button', { name: ROOMS }).count()) === 3 && (await card.locator('input:not([name="company_website"]):visible').count()) === 0, (await cardText()).slice(0, 120));
  // « Continuer » is at full strength from the start (cream on the green glass); pressed with no answer, it stays on the question and says why.
  const continueButton = card.getByRole('button', { name: 'Continuer', exact: true });
  const continueColour = await continueButton.evaluate((node) => getComputedStyle(node).backgroundColor);
  await continueButton.click();
  const continueStep1 = continueColour === 'rgb(245, 240, 232)' && /Étape 1 sur 3/i.test(await card.innerText()) && (await card.getByRole('alert').filter({ hasText: 'Choisissez une réponse pour continuer.' }).count()) === 1;
  const look = await card.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      // Glass: a translucent pane that blurs what is behind it — Emara's green, on a stage no larger than the card and its track line.
      alpha: Number(style.backgroundColor.match(/[\d.]+(?=\)$)/)?.[0] ?? 1),
      blur: /blur\(/.test(style.backdropFilter || style.webkitBackdropFilter || ''),
      behind: getComputedStyle(node.closest('[data-glass-stage]')).backgroundColor,
      page: getComputedStyle(node.closest('section')).backgroundColor,
      stageOnlyCard: Boolean(node.closest('[data-glass-stage]').querySelector('[data-track-line]')) && !node.closest('[data-glass-stage]').querySelector('[data-lead-intro], #dossier-title, ol'),
      progress: Boolean(node.querySelector('[data-progress]')),
      radios: node.querySelectorAll('button[aria-pressed] [aria-hidden="true"].rounded-full').length,
    };
  });
  record('Form step 1: looks like a form — a pane of frosted glass over Emara green, progress bar, a radio mark per answer, « Continuer » in cream, asking for an answer when pressed too early', continueStep1 && look.alpha < 0.3 && look.blur && look.behind === 'rgb(45, 58, 45)' && look.progress && look.radios === 3, JSON.stringify(look));
  record('First form: green only behind the card and its track line — the heading and the dossier list sit on the light page', look.stageOnlyCard && look.page === 'rgb(250, 248, 244)', JSON.stringify({ page: look.page, stageOnlyCard: look.stageOnlyCard }));
  record('Form step 1: nothing tracked as started or sent yet', !(await fbq(page)).includes('trackCustom:LeadFormStarted') && (await page.evaluate(() => window.__requests.length)) === 0);
  await card.getByRole('button', { name: '1 chambre', exact: true }).click();
  record('Form step 2: one tap moves on to the budget, three ranges in the page’s currency', /Quel budget prévoyez-vous \?/.test(await cardText()) && /Étape 2 sur 3/i.test(await cardText()) && (await card.getByRole('button', { name: MONEY.range }).count()) === 3 && (!FLAGS.euroPrices || !/MAD/.test(await cardText())));
  await card.getByRole('button', { name: /Type d’appartement/ }).click();
  record('Form: back to step 1 keeps the answer', (await card.getByRole('button', { name: '1 chambre', exact: true }).getAttribute('aria-pressed')) === 'true');
  const eventsBeforeContinue = (await fbq(page)).length;
  await card.getByRole('button', { name: 'Continuer', exact: true }).click();
  record('Form: « Continuer » after going back → step 2, no new answer tracked', /Étape 2 sur 3/i.test(await cardText()) && (await fbq(page)).slice(eventsBeforeContinue).every((entry) => !/property_type_selected|LeadFormStepCompleted/.test(entry)));
  await card.getByRole('button', { name: /Type d’appartement/ }).click();
  await card.getByRole('button', { name: '2 chambres', exact: true }).click();
  await card.getByRole('button', { name: MONEY.budgetButton }).click();
  await page.locator('#hs7-hero-name').waitFor();
  record('Form step 3: contact details last — three fields, the two answers recalled', (await card.locator('input:not([name="company_website"]):visible').count()) === 3 && /2 chambres/.test(await cardText()) && (await cardText()).includes(MONEY.budget) && /Étape 3 sur 3/i.test(await cardText()));
  record('Form: says what is received and what happens next', /Un conseiller vous transmet les disponibilités et les prix lot par lot/.test(await cardText()) && /uniquement à vous recontacter au sujet de Honest Signature 7/.test(await cardText()));
  record('Form: the closing card is on the same step, with the same answers', /Étape 3 sur 3/i.test((await page.locator('#disponibilites').innerText())) && /2 chambres/.test(await page.locator('#disponibilites').innerText()));
  let stepEvents = await fbq(page);
  record('Tracking: form started once; type and budget steps reported once each, even after going back', count(stepEvents, 'trackCustom:form_started') === 1 && count(stepEvents, 'trackCustom:LeadFormStarted') === 1 && count(stepEvents, 'trackCustom:LeadFormStepCompleted') === 2 && stepEvents.includes('trackCustom:property_type_selected') && stepEvents.includes('trackCustom:budget_selected'), stepEvents.filter((entry) => /Step|selected|started/.test(entry)).join(', '));
  record('Tracking: answering the two questions is not a conversion', !stepEvents.includes('track:Lead') && !(await snapCalls(page)).includes('track:SIGN_UP'));

  await card.locator('button[type="submit"]').click();
  record('Validation: name, phone and e-mail explained', (await card.getByText('Indiquez votre nom complet.').isVisible()) && (await card.getByText('Vérifiez votre numéro de téléphone.').isVisible()) && (await card.getByText('Indiquez votre e-mail.').isVisible()));
  record('Validation: nothing sent', (await page.evaluate(() => window.__requests.length)) === 0);
  record('Validation: focus on the first invalid field', await page.evaluate(() => document.activeElement?.id === 'hs7-hero-name'));

  await fill(page, 'hs7-hero', { email: 'pas-un-email' });
  await card.locator('button[type="submit"]').click();
  record('Validation: malformed e-mail refused', await card.getByText('Vérifiez votre adresse e-mail.').isVisible());
  record('Shared state: the closing form holds the same details', (await page.locator('#hs7-final-name').inputValue()) === 'Client Test');

  await page.fill('#hs7-hero-email', 'client@example.com');
  record('Tracking: no Lead before the server answers', !(await fbq(page)).includes('track:Lead'));
  let snapNow = await snapCalls(page);
  record('Snap: form started → CUSTOM_EVENT_1 once, still no SIGN_UP (failed validations included)', count(snapNow, 'track:CUSTOM_EVENT_1') === 1 && !snapNow.includes('track:SIGN_UP'), snapNow.join(', '));
  // Two clicks in the same tick: the in-flight lock must let only one through. (A real
  // double click would land its second click on whatever the next panel puts there.)
  await card.locator('button[type="submit"]').evaluate((button) => {
    button.click();
    button.click();
  });
  await card.getByText('Demande envoyée.').waitFor();
  let requests = await page.evaluate(() => window.__requests);
  record('Lead first: sent on submit, exactly one request (double click)', requests.length === 1, String(requests.length));
  const lead = requests[0] || {};
  const expected = {
    form_type: 'honest_signature_7_request',
    nom_complet: 'Client Test',
    first_name: 'Client',
    last_name: 'Test',
    email: 'client@example.com',
    source: 'Meta Ads',
    leadSource: 'Landing Honest Signature 7',
    lead_origin: 'Meta Landing Page',
    landing_name: '6 residences livrees',
    project: 'Honest Signature 7',
    projectName: 'Honest Signature 7',
    project_name: 'Honest Signature 7',
    project_location: 'Gueliz',
    lead_source: 'dedicated_ads_landing',
    lead_stage: 'lead',
    utm_source: 'facebook',
    utm_medium: 'paid_social',
    utm_campaign: 'hs7-test',
    utm_content: 'creative-a',
    utm_term: 'gueliz',
    utmSource: 'facebook',
    campaignId: 'cmp-1',
    adsetId: 'set-2',
    adId: 'ad-3',
    fbclid: 'click-4',
    fbc: 'fb.1.test-click',
    fbp: 'fb.1.test-browser',
    adPlatform: 'Meta',
    purchase_intent: '',
    company_website: '',
    propertyType: 'Appartement 2 chambres',
    budget: MONEY.budget,
    // The currency always matches the budget label: never a euro budget with a dirham currency.
    currency: MONEY.currency,
  };
  const wrong = Object.entries(expected).filter(([key, value]) => lead[key] !== value).map(([key]) => `${key}=${JSON.stringify(lead[key])}`);
  record('Payload: the message names the type and the budget', /Type de bien : Appartement 2 chambres/.test(lead.message || '') && (lead.message || '').includes(`Budget : ${MONEY.budget}`), lead.message);
  record('Payload: CRM contract, project metadata, UTM + fbclid', wrong.length === 0, wrong.join(', '));
  record('Payload: phone block', lead.phoneNumber === '612345678' && lead.phoneFull === `${lead.phoneCode}612345678` && lead.telephone === lead.phoneFull && Boolean(lead.phoneCountryCode));
  record('Payload: Meta event ID for CAPI deduplication', /^lead_[A-Za-z0-9-]{8,64}$/.test(lead.meta_event_id || ''), lead.meta_event_id);
  let events = await fbq(page);
  record('Tracking: Lead once, after success, with the same event ID', count(events, 'track:Lead') === 1 && (await page.evaluate((id) => window.__fbq.some((args) => args[1] === 'Lead' && args[3]?.eventID === id), lead.meta_event_id)));
  snapNow = await snapCalls(page);
  record('Snap: exactly one SIGN_UP, after the backend accepted the lead (two clicks)', count(snapNow, 'track:SIGN_UP') === 1, snapNow.join(', '));
  const signUp = await page.evaluate(() => window.__snap.find((args) => args[1] === 'SIGN_UP')?.[2] || {});
  record('Snap: SIGN_UP carries its deduplication ID and no personal data', signUp.client_dedup_id === lead.meta_event_id && !/Client Test|612345678|client@example\.com/.test(await page.evaluate(() => JSON.stringify(window.__snap))), JSON.stringify(signUp));
  record('Snap: only event types from Snap\'s list — no "BuyerLead", no unnumbered "CUSTOM_EVENT"', snapNow.filter((entry) => entry.startsWith('track:')).every((entry) => SNAP_EVENT_TYPES.includes(entry.slice(6))), snapNow.join(', '));
  record('Meta: no Snap event name reaches Meta', !(await fbq(page)).some((entry) => /SIGN_UP|VIEW_CONTENT|CUSTOM_EVENT|PAGE_VIEW/.test(entry)));
  record('Tracking: form_view, form_started, attempt, success — once each', ['form_started', 'lead_submit_attempt', 'lead_submit_success'].every((name) => count(events, `trackCustom:${name}`) === 1) && events.includes('trackCustom:form_view'));
  record('After the lead: the closing form shows the same confirmation', await page.locator('#disponibilites').getByText('Demande envoyée.').count() === 1);
  record('After the lead: sticky CTA retired', (await page.locator('[data-sticky-cta]').getAttribute('aria-hidden')) === 'true');

  /* ── Qualification, after the lead exists ── */
  await card.getByText('Investir', { exact: true }).click();
  record('Qualification: investors are told about the rental-potential analysis', await card.getByText('Votre dossier inclura l’analyse du potentiel locatif.').isVisible());
  await card.getByText('WhatsApp', { exact: true }).click();
  await card.getByRole('button', { name: /Visiter un appartement témoin/ }).click();
  await card.locator('fieldset', { hasText: 'Jour souhaité' }).locator('label').nth(1).click();
  await card.getByText('Après-midi', { exact: true }).click();
  record('Qualification: answering sends nothing by itself', (await page.evaluate(() => window.__requests.length)) === 1);

  // Leaving now: the answers go out with a beacon; the lead was already saved.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await settle(page, 400);
  const beacons = (await page.evaluate(() => window.__beacons)).filter((beacon) => beacon.url.includes('contact.php'));
  record('Leaving mid-qualification: answers sent by beacon, once', beacons.length === 1 && beacons[0].body.lead_stage === 'qualification' && beacons[0].body.purchase_intent === 'Investissement', String(beacons.length));
  await page.evaluate(() => Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }));

  await card.getByRole('button', { name: /Terminer/ }).click();
  await card.getByText('C’est noté.').waitFor();
  requests = await page.evaluate(() => window.__requests);
  record('Qualification: same answers are not posted twice', requests.length === 1, String(requests.length));
  const update = beacons[0]?.body || {};
  record('Qualification: tied to the lead by one form session ID', /^[A-Za-z0-9-]{16,64}$/.test(lead.form_session_id || '') && update.form_session_id === lead.form_session_id, `${lead.form_session_id} / ${update.form_session_id}`);
  record(
    'Qualification payload: same contact, flagged, no second Meta Lead',
    update.form_type === 'honest_signature_7_request' && update.email === 'client@example.com' && update.phoneFull === lead.phoneFull && update.contact_preference === 'WhatsApp' && /après-midi/.test(update.visit_preference || '') && !('meta_event_id' in update) && /Complément au dossier/.test(update.message || ''),
    JSON.stringify({ stage: update.lead_stage, intent: update.purchase_intent, channel: update.contact_preference, visit: update.visit_preference, eventId: update.meta_event_id }),
  );
  events = await fbq(page);
  record('Tracking: still exactly one Lead', count(events, 'track:Lead') === 1);
  record('Snap: still exactly one SIGN_UP after the qualification step', count(await snapCalls(page), 'track:SIGN_UP') === 1);
  record('Tracking: intent, channel, visit events', ['post_lead_intent_selected', 'contact_channel_selected', 'visit_booking_started'].every((name) => count(events, `trackCustom:${name}`) === 1));
  record('Done: confirmation names the channel and the visit', /sur WhatsApp/.test(await card.innerText()) && /après-midi/.test(await card.innerText()));
  await context.close();
}

/* ── Qualification saved with the button; skipped; server failure ───────── */
{
  const { context, page } = await open({ width: 1280, height: 900 });
  await stubContact(page);
  const card = page.locator('#disponibilites');
  await card.scrollIntoViewIfNeeded();
  await fill(page, 'hs7-final');
  await card.locator('button[type="submit"]').click();
  await card.getByText('Demande envoyée.').waitFor();
  await card.getByText('Y habiter', { exact: true }).click();
  await card.getByText('Appel', { exact: true }).click();
  await card.getByRole('button', { name: /Terminer/ }).click();
  await card.getByText('C’est noté.').waitFor();
  const requests = await page.evaluate(() => window.__requests);
  record('Closing form: lead, then one qualification request', requests.length === 2 && requests[0].lead_stage === 'lead' && requests[1].lead_stage === 'qualification' && requests[1].purchase_intent === 'Résidence principale' && requests[1].contact_preference === 'Appel');
  record('Tracking: qualification saved, one Lead', (await fbq(page)).includes('trackCustom:post_lead_qualification_saved') && count(await fbq(page), 'track:Lead') === 1);
  await context.close();
}
{
  const { context, page } = await open({ width: 390, height: 780 });
  await stubContact(page);
  const card = page.locator('#dossier');
  await card.scrollIntoViewIfNeeded();
  await fill(page, 'hs7-hero');
  await card.locator('button[type="submit"]').click();
  await card.getByText('Demande envoyée.').waitFor();
  await card.getByRole('button', { name: /Terminer/ }).click();
  await card.getByText('C’est noté.').waitFor();
  record('Qualification skipped: no second request, lead kept', (await page.evaluate(() => window.__requests.length)) === 1);
  await context.close();
}
{
  const { context, page } = await open({ width: 390, height: 780 });
  await stubContact(page, 500);
  const card = page.locator('#dossier');
  await card.scrollIntoViewIfNeeded();
  await fill(page, 'hs7-hero');
  await card.locator('button[type="submit"]').click();
  await card.getByText('L’envoi n’a pas abouti.').waitFor();
  const events = await fbq(page);
  record('Server error: message + WhatsApp fallback, details kept', (await card.getByRole('link', { name: /WhatsApp/ }).isVisible()) && (await page.locator('#hs7-hero-name').inputValue()) === 'Client Test');
  record('Server error: lead_submit_error, no Lead', events.includes('trackCustom:lead_submit_error') && !events.includes('track:Lead'));
  record('Server error: no Snap SIGN_UP either', !(await snapCalls(page)).includes('track:SIGN_UP'));
  await stubContact(page, 200);
  await card.locator('button[type="submit"]').click();
  await card.getByText('Demande envoyée.').waitFor();
  record('Server error: retry succeeds — one Meta Lead, one Snap SIGN_UP', count(await fbq(page), 'track:Lead') === 1 && count(await snapCalls(page), 'track:SIGN_UP') === 1);
  await context.close();
}

/* ── Honeypot, reduced motion, no UTM ───────────────────────────────────── */
{
  const { context, page } = await open({ width: 390, height: 780 });
  await stubContact(page);
  const card = page.locator('#dossier');
  await card.scrollIntoViewIfNeeded();
  await fill(page, 'hs7-hero');
  await card.locator('input[name="company_website"]').evaluate((input) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'https://spam.example');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await card.locator('button[type="submit"]').click();
  await card.getByText('C’est noté.').waitFor();
  record('Honeypot: no conversion tracked on Meta or Snap', !(await fbq(page)).includes('track:Lead') && !(await snapCalls(page)).includes('track:SIGN_UP'));
  await context.close();
}
/* ── The first question hops to be noticed: three times, on screen, until answered ─ */
{
  const { context, page } = await open({ width: 390, height: 780 });
  const hopping = () =>
    page.evaluate(() =>
      ['#dossier', '#disponibilites'].map((card) => {
        const line = document.querySelector(`${card} [data-question-hop]`);
        return line ? `${getComputedStyle(line).animationName} × ${getComputedStyle(line).animationIterationCount}` : 'still';
      }).join(' | '),
    );
  record('Question hop: nothing moves while the form is off screen', (await hopping()) === 'still | still', await hopping());
  const card = page.locator('#dossier');
  await card.locator('h2').scrollIntoViewIfNeeded();
  await settle(page, 300);
  record('Question hop: on screen, the first question hops three times — only in that card', (await hopping()) === 'hs7-bounce × 3 | still', await hopping());
  const lift = await card.locator('h2').evaluate(async (heading) => {
    const line = heading.querySelector('span');
    let highest = 0;
    const until = performance.now() + 1700;
    while (performance.now() < until) {
      highest = Math.max(highest, heading.getBoundingClientRect().top - line.getBoundingClientRect().top);
      await new Promise((frame) => requestAnimationFrame(frame));
    }
    return { highest: Math.round(highest), headingMoved: getComputedStyle(heading).transform !== 'none' };
  });
  record('Question hop: the line lifts 6–10px, the heading itself stays put', lift.highest >= 6 && lift.highest <= 10 && !lift.headingMoved, JSON.stringify(lift));
  await card.getByRole('button', { name: '2 chambres', exact: true }).click();
  await card.getByRole('button', { name: /Type d’appartement/ }).click();
  await settle(page, 300);
  record('Question hop: once answered, the question no longer moves', (await card.locator('h2').isVisible()) && (await hopping()) === 'still | still', await hopping());
  await context.close();
}
{
  const { context, page } = await open({ width: 390, height: 780 }, { reducedMotion: 'reduce' });
  const state = await page.evaluate(() => ({
    scroll: getComputedStyle(document.documentElement).scrollBehavior,
    headline: getComputedStyle(document.querySelector('#hero-title .hs7-draw')).animationDuration,
    orbit: getComputedStyle(document.querySelector('[data-hero-cta] .hs7-orbit')).display,
  }));
  record('Reduced motion: no smooth scroll, animations collapsed', state.scroll === 'auto' && Number.parseFloat(state.headline) < 0.001, JSON.stringify(state));
  record('Reduced motion: the CTA border does not turn', state.orbit === 'none', state.orbit);
  const reveals = page.locator('#services [data-reveal]');
  for (let i = 0; i < (await reveals.count()); i += 1) {
    await reveals.nth(i).scrollIntoViewIfNeeded();
    await settle(page, 120);
  }
  const hidden = await page.evaluate(() => Array.from(document.querySelectorAll('#services [data-reveal]')).filter((node) => Number(getComputedStyle(node).opacity) < 1).length);
  record('Reduced motion: revealed content is fully visible', hidden === 0, `${hidden} still hidden`);
  await page.locator('#dossier h2').scrollIntoViewIfNeeded();
  await settle(page, 300);
  const stillQuestion = await page.evaluate(() => getComputedStyle(document.querySelector('#dossier h2 span')).animationName);
  record('Reduced motion: the first question does not hop', stillQuestion === 'none', stillQuestion);
  await page.evaluate(() => window.scrollTo(0, 0));
  const play = page.getByRole('button', { name: 'Lancer le diaporama' });
  await play.waitFor({ timeout: 8000 });
  await settle(page, 3400);
  const still = await page.locator('[data-hero-carousel]').getAttribute('data-slide');
  record('Reduced motion: the hero slideshow does not start by itself', still === '0', `slide ${still}`);
  await play.click();
  await page.waitForFunction(() => document.querySelector('[data-hero-carousel]').dataset.slide !== '0', null, { timeout: 6000 });
  record('Reduced motion: it can still be started by hand', true);
  await context.close();
}

/* ── Hero slideshow ─────────────────────────────────────────────────────── */
{
  const { context, page, errors } = await open({ width: 390, height: 780 });
  const html = await (await page.request.get(page.url())).text();
  const start = html.indexOf('data-hero-carousel');
  const served = html.slice(start, html.indexOf('</figure>', start));
  record('Slideshow: only the façade is in the page HTML (nothing competes with the LCP image)', start > 0 && (served.match(/<img/g) || []).length === 1, `${(served.match(/<img/g) || []).length} img`);

  const changes = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const node = document.querySelector('[data-hero-carousel]');
        const seen = [];
        const done = () => {
          observer.disconnect();
          resolve(seen);
        };
        const observer = new MutationObserver(() => {
          const active = node.querySelectorAll('img')[Number(node.dataset.slide)];
          seen.push({ slide: Number(node.dataset.slide), at: performance.now(), loaded: Boolean(active && active.complete && active.naturalWidth > 0) });
          if (seen.length === 7) done();
        });
        observer.observe(node, { attributes: true, attributeFilter: ['data-slide'] });
        setTimeout(done, 16000);
      }),
  );
  const gaps = changes.slice(1).map((change, index) => Math.round(change.at - changes[index].at));
  record('Slideshow: starts by itself after load and changes photo every 1.5 s', changes.length === 7 && gaps.every((gap) => gap > 1300 && gap < 1800), gaps.join(' / '));
  record('Slideshow: goes through the 6 photos in order and loops back to the façade', changes.map((change) => change.slide).join('') === '1234501', changes.map((change) => change.slide).join(''));
  record('Slideshow: a photo is only shown once its file has arrived', changes.every((change) => change.loaded));
  const slides = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-hero-carousel] img')).map((img) => ({ file: img.currentSrc.split('/').pop(), alt: img.alt, lazy: img.loading === 'lazy', sized: Boolean(img.getAttribute('width') && img.getAttribute('height')) })),
  );
  record('Slideshow: Honest 7 visuals only, each described, lazy and sized', slides.length === 6 && slides.slice(1).every((slide) => /Honest Signature 7/.test(slide.alt) && slide.lazy && slide.sized), slides.map((slide) => slide.file).join(', '));
  record('Slideshow: phones get the small files', slides.slice(1).every((slide) => /-(640|1080)\.webp$/.test(slide.file)), slides.map((slide) => slide.file).join(', '));

  await page.getByRole('button', { name: 'Mettre le diaporama en pause' }).click();
  const paused = await page.locator('[data-hero-carousel]').getAttribute('data-slide');
  await settle(page, 3400);
  record('Slideshow: the pause button stops it', (await page.locator('[data-hero-carousel]').getAttribute('data-slide')) === paused && (await page.getByRole('button', { name: 'Lancer le diaporama' }).count()) === 1);
  const labels = await page.evaluate(() => {
    const figure = document.querySelector('[data-hero-carousel]').closest('figure');
    const hit = (node) => {
      const box = node.getBoundingClientRect();
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return node === top || node.contains(top);
    };
    return [figure.querySelector('figcaption'), figure.querySelector(':scope > p')].every(hit);
  });
  record('Slideshow: the Plaza and delivery labels stay above the photos', labels);
  record('Slideshow: no layout overflow, no console error', (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0 && errors.length === 0, errors.join(' | '));
  await context.close();
}
{
  const { context, page } = await open({ width: 390, height: 780 }, { search: '' });
  await stubContact(page);
  const card = page.locator('#dossier');
  await card.scrollIntoViewIfNeeded();
  await fill(page, 'hs7-hero');
  await card.locator('button[type="submit"]').click();
  await card.getByText('Demande envoyée.').waitFor();
  const lead = (await page.evaluate(() => window.__requests))[0];
  record('No UTM: lead still sent, project metadata attached', lead.project_name === 'Honest Signature 7' && lead.utm_source === '' && lead.lead_source === 'dedicated_ads_landing');
  await context.close();
}

/* ── Activity band: requests received today, "+1" only for a request that arrived during the visit ─ */
if (FLAGS.activityCounter) {
  // No data (the harness answers "disabled"): no band, and the quiet track-record line under the card.
  const { context, page } = await open({ width: 390, height: 780 });
  await settle(page, 1200);
  const none = await page.evaluate(() => {
    const card = document.querySelector('#dossier');
    // The card sits in a wrapper with the lights it blurs: the line is in the same section, after it.
    const line = card.closest('section').querySelector('[data-track-line]');
    return {
      bands: document.querySelectorAll('[data-activity]').length,
      line: line?.innerText.replace(/\s+/g, ' ').trim(),
      lineBelowCard: (line?.getBoundingClientRect().top ?? 0) >= card.getBoundingClientRect().bottom,
    };
  });
  record('Activity: with no data there is no band — never a zero, never a placeholder figure', none.bands === 0);
  record('Track record: a quiet line under the card', none.line === 'Honest 1 à 4 livrées · Honest 5 et 6 vendues' && none.lineBelowCard, none.line);
  await context.close();
}
if (FLAGS.activityCounter) {
  const { context, page } = await open({ width: 390, height: 780 }, { activity: { body: requestsToday(0) } });
  await settle(page, 1500);
  record('Activity: nothing received yet today → no band rather than « 0 »', (await band(page)) === null);
  await context.close();
}
for (const width of FLAGS.activityCounter ? [360, 390, 430, 1440] : []) {
  const { context, page, errors } = await open({ width, height: 800 }, { activity: { body: requestsToday(10) } });
  await page.locator('#dossier [data-activity]').waitFor({ timeout: 5000 });
  await settle(page, 700);
  const shown = await page.evaluate(() => {
    const card = document.querySelector('#dossier');
    const node = card.querySelector('[data-activity]');
    const box = node.getBoundingClientRect();
    const count = node.querySelector('[data-activity-count]');
    const dot = node.querySelector('p span');
    const rest = Array.from(node.querySelectorAll('span')).find((span) => /demandes/i.test(span.textContent));
    return {
      text: node.innerText.replace(/\s+/g, ' ').trim(),
      height: Math.round(box.height),
      aboveQuestion: box.bottom <= card.querySelector('h2, h3').getBoundingClientRect().top && box.top >= card.getBoundingClientRect().top - 1,
      countSize: Number.parseFloat(getComputedStyle(count).fontSize),
      restSize: Number.parseFloat(getComputedStyle(rest).fontSize),
      dotAnimation: getComputedStyle(dot).animationName,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      bands: document.querySelectorAll('[data-activity]').length,
      plus: document.querySelectorAll('[data-plus-one]').length,
    };
  });
  record(`${width}px activity: « Activité aujourd’hui · 10 demandes reçues aujourd’hui »`, /^activité aujourd’hui 10 demandes reçues aujourd’hui$/i.test(shown.text), shown.text);
  record(`${width}px activity: at the top of the card, right above the question, in both lead cards`, shown.aboveQuestion && shown.bands === 2);
  record(`${width}px activity: the number dominates; the dot only pulses in opacity`, shown.countSize >= 3 * shown.restSize && shown.dotAnimation === 'hs7-live-dot', JSON.stringify(shown));
  record(`${width}px activity: compact (${shown.height}px), no overflow`, shown.height <= 110 && shown.overflow <= 0, `${shown.height}px, overflow ${shown.overflow}`);
  record(`${width}px activity: nothing animated on arrival, no console error`, shown.plus === 0 && errors.length === 0, errors.join(' | '));
  await context.close();
}
if (FLAGS.activityCounter) {
  const activity = { body: requestsToday(10) };
  const { context, page, errors, activityRequests } = await open({ width: 390, height: 780 }, { activity, clock: true });
  const beforeClock = activityRequests.length;
  // The page's clock is ours, but it also keeps ticking in real time, so the moment of the next
  // poll cannot be computed here. `toNextPoll` moves forward in small steps and stops as soon as
  // the page has asked the server: the animation that follows then plays in real time, without
  // the page's own timers having been pushed ahead of it.
  const toNextPoll = async () => {
    const before = activityRequests.length;
    for (let step = 0; step < 400 && activityRequests.length === before; step += 1) await page.clock.runFor(100);
  };
  await page.clock.runFor(1000);
  await page.locator('#dossier [data-activity]').waitFor({ timeout: 5000 });
  record('Activity: first request only after the page has loaded', beforeClock === 0 && activityRequests.length === 1, `${beforeClock} before, ${activityRequests.length} after`);
  await page.locator('#dossier').scrollIntoViewIfNeeded();

  // Time passes and no request arrives: nothing moves.
  await page.clock.runFor(95_000);
  await settle(page, 300);
  const idle = await band(page);
  record('Activity: polled every 30 s; with no new request, the count never moves by itself', activityRequests.length === 4 && idle.count === '10' && idle.plus === null, `${activityRequests.length} requests, ${JSON.stringify(idle)}`);

  // Another visitor's request is accepted by the backend.
  activity.body = requestsToday(11);
  await toNextPoll();
  await page.locator('#dossier [data-plus-one]').waitFor({ state: 'attached', timeout: 5000 });
  const during = await band(page);
  record('Activity: a new request → « +1 » next to the count, the old count still on screen', during.plus === '+1' && during.count === '10', JSON.stringify(during));
  const move = await page.locator('#dossier [data-plus-one]').evaluate((node) => ({ name: getComputedStyle(node).animationName, seconds: Number.parseFloat(getComputedStyle(node).animationDuration) }));
  record('Activity: « +1 » rises and fades in about 1.2 s', move.name === 'hs7-plus-one' && move.seconds >= 1.1 && move.seconds <= 1.3, JSON.stringify(move));
  await page.locator('#dossier [data-plus-one]').waitFor({ state: 'detached', timeout: 5000 });
  const after = await band(page);
  record('Activity: then the count updates, 10 → 11, and it is announced', after.count === '11' && after.plus === null && /^activité aujourd’hui 11 demandes reçues aujourd’hui$/i.test(after.text) && after.announced === 'Nouvelle demande reçue : 11 aujourd’hui.', JSON.stringify(after));
  record('Activity: the closing card shows the same count', (await page.locator('#disponibilites [data-activity-count]').innerText()) === '11');

  // Two requests between two polls.
  activity.body = requestsToday(13);
  await toNextPoll();
  await page.locator('#dossier [data-plus-one]').waitFor({ state: 'attached', timeout: 5000 });
  record('Activity: two requests between two checks → « +2 »', (await band(page)).plus === '+2');
  await page.locator('#dossier [data-plus-one]').waitFor({ state: 'detached', timeout: 5000 });
  record('Activity: … then 13', (await band(page)).count === '13');

  // The endpoint fails, answers nonsense, or is switched off: what is shown stays.
  for (const [label, change] of [
    ['a server error', { status: 500, body: 'boom' }],
    ['an impossible answer', { status: 200, body: { ok: true, enabled: true, day: '2026-10-04', requests: -5 } }],
    ['"disabled"', { status: 200, body: { ok: true, enabled: false } }],
  ]) {
    Object.assign(activity, change);
    await toNextPoll();
    await settle(page, 300);
    const kept = await band(page);
    record(`Activity: ${label} leaves the count on screen`, kept?.count === '13' && kept.plus === null, JSON.stringify(kept));
  }

  // Midnight: the server starts a new day at zero. No animation, and no « 0 » left on screen.
  Object.assign(activity, { status: 200, body: requestsToday(0, '2026-10-05') });
  await toNextPoll();
  await settle(page, 400);
  record('Activity: a new day restarts from the real data — the band leaves rather than show « 0 »', (await band(page)) === null);
  activity.body = requestsToday(1, '2026-10-05');
  await toNextPoll();
  await page.locator('#dossier [data-plus-one]').waitFor({ state: 'attached', timeout: 5000 });
  await page.locator('#dossier [data-plus-one]').waitFor({ state: 'detached', timeout: 5000 });
  const firstOfDay = await band(page);
  record('Activity: the first request of the new day → « 1 demande reçue aujourd’hui » (singular)', firstOfDay.count === '1' && /^activité aujourd’hui 1 demande reçue aujourd’hui$/i.test(firstOfDay.text), JSON.stringify(firstOfDay));

  // The tab is hidden: no request until it is visible again.
  const hiddenFrom = activityRequests.length;
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(95_000);
  const whileHidden = activityRequests.length - hiddenFrom;
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await settle(page, 300);
  record('Activity: no polling while the tab is hidden, one request on return', whileHidden === 0 && activityRequests.length - hiddenFrom === 1, `${whileHidden} while hidden`);
  record('Activity: no console error', errors.length === 0, errors.join(' | '));
  await context.close();
}
if (FLAGS.activityCounter) {
  // Reduced motion: no travelling label to wait for — the count simply changes.
  const activity = { body: requestsToday(10) };
  const { context, page } = await open({ width: 390, height: 780 }, { activity, clock: true, reducedMotion: 'reduce' });
  await page.clock.runFor(1000);
  await page.locator('#dossier [data-activity]').waitFor({ timeout: 5000 });
  activity.body = requestsToday(11);
  await page.clock.runFor(30_000);
  await page.waitForFunction(() => document.querySelector('#dossier [data-activity-count]').textContent.trim() === '11', null, { timeout: 5000 });
  record('Reduced motion: a new request updates the count at once', (await band(page)).plus === null);
  await context.close();
}
if (FLAGS.activityCounter) {
  // The band is there for the three questions only: once the request is sent, it has done its job.
  const { context, page } = await open({ width: 390, height: 780 }, { activity: { body: requestsToday(10) } });
  await stubContact(page);
  await page.locator('#dossier [data-activity]').waitFor({ timeout: 5000 });
  await fill(page, 'hs7-hero');
  record('Activity: still above the contact fields at step 3', (await band(page))?.count === '10');
  await page.locator('#dossier button[type="submit"]').click();
  await page.locator('#dossier').getByText('Demande envoyée.').waitFor();
  record('Activity: gone once the request is sent', (await page.locator('[data-activity]').count()) === 0);
  await context.close();
}

/* ── Partial lead capture: saved before submit, silently, once per change ─ */
if (FLAGS.partialCapture) {
  const { context, page, drafts, errors } = await open({ width: 390, height: 780 });
  await stubContact(page);
  const card = page.locator('#dossier');
  await card.scrollIntoViewIfNeeded();
  const saves = () => drafts.filter((draft) => draft.action !== 'sweep');

  // D — answers the two questions, types a name, then an incomplete number.
  await toContact(page);
  await page.fill('#hs7-hero-name', 'Yasmine El Idrissi');
  await page.locator('#hs7-hero-phone').pressSequentially('61234', { delay: 30 });
  await page.locator('#hs7-hero-email').focus();
  await settle(page, 1300);
  let events = await fbq(page);
  record('Draft D: no valid phone or e-mail yet → nothing leaves the browser', saves().length === 0, String(saves().length));
  record('Draft D: the form start is still tracked', events.includes('trackCustom:form_started') && events.includes('trackCustom:LeadFormStarted'));

  // A — completes the number, character by character, and does nothing else.
  await page.locator('#hs7-hero-phone').focus();
  await page.locator('#hs7-hero-phone').pressSequentially('5678', { delay: 80 });
  await settle(page, 400);
  record('Draft: not sent while the visitor is still typing', saves().length === 0, String(saves().length));
  await settle(page, 1000);
  record('Draft A: valid phone → saved once, with no blur, Continue or Submit', saves().length === 1, String(saves().length));
  const first = saves()[0] || {};
  record('Draft: form_session_id, project, the fields typed, the step', /^[A-Za-z0-9-]{16,64}$/.test(first.form_session_id || '') && first.project_name === 'Honest Signature 7' && first.name === 'Yasmine El Idrissi' && /^\+\d+612345678$/.test(first.phone || '') && first.email === '' && first.current_step === 'coordonnees' && first.property_type === 'Appartement 2 chambres' && first.budget === MONEY.budget, JSON.stringify(first));
  record('Draft: campaign attribution and landing URL', first.utm_source === 'facebook' && first.utm_medium === 'paid_social' && first.utm_campaign === 'hs7-test' && first.utm_content === 'creative-a' && first.utm_term === 'gueliz' && first.fbclid === 'click-4' && first.page_url.includes('/honest-signature-7/'));
  const allowed = ['form_session_id', 'project_name', 'name', 'phone', 'email', 'property_type', 'budget', 'current_step', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'page_url', 'company_website', 'elapsed_ms'];
  record('Draft: nothing else is collected', Object.keys(first).every((key) => allowed.includes(key)), Object.keys(first).filter((key) => !allowed.includes(key)).join());
  record('Draft: invisible — the form is unchanged', (await card.locator('button[type="submit"]').isVisible()) && !(await card.getByText(/enregistr|sauvegard/i).count()) && (await page.locator('#hs7-hero-phone').inputValue()) === '612345678');
  events = await fbq(page);
  record('Draft: no Meta Lead, no Snap SIGN_UP, no contact.php request', !events.includes('track:Lead') && !(await snapCalls(page)).includes('track:SIGN_UP') && (await page.evaluate(() => window.__requests.length)) === 0);
  record('Draft: partial_lead_captured once, without phone or e-mail', count(events, 'trackCustom:partial_lead_captured') === 1 && !/612345678|@/.test(await page.evaluate(() => JSON.stringify(window.__fbq.filter((args) => args[1] === 'partial_lead_captured')))));

  // Unchanged: a blur sends nothing.
  await page.locator('#hs7-hero-name').focus();
  await page.locator('#hs7-hero-email').focus();
  await settle(page, 1300);
  record('Draft: blur with nothing changed → no request', saves().length === 1, String(saves().length));

  // C — edits the number several times in a row.
  for (const last of ['1', '2', '3']) {
    await page.fill('#hs7-hero-phone', `61234567${last}`);
    await settle(page, 250);
  }
  await settle(page, 1200);
  record('Draft C: three quick edits → one more request, same session, latest number', saves().length === 2 && saves()[1].form_session_id === first.form_session_id && saves()[1].phone.endsWith('612345673'), `${saves().length} requests`);

  // The e-mail, saved when the field loses focus.
  await page.fill('#hs7-hero-email', 'yasmine@exam');
  await page.locator('#hs7-hero-name').focus();
  await settle(page, 300);
  record('Draft: an e-mail still being typed is not sent as an e-mail', saves().length === 2 || saves()[saves().length - 1].email === '');
  await page.fill('#hs7-hero-email', 'yasmine@example.com');
  await page.locator('#hs7-hero-name').focus();
  await settle(page, 300);
  const beforeSubmit = saves().length;
  record('Draft: saved on blur, without waiting for the debounce', saves()[beforeSubmit - 1].email === 'yasmine@example.com' && saves()[beforeSubmit - 1].form_session_id === first.form_session_id);
  record('Draft: far fewer requests than keystrokes', beforeSubmit <= 4, `${beforeSubmit} requests`);

  // B — submits.
  await card.locator('button[type="submit"]').click();
  await card.getByText('Demande envoyée.').waitFor();
  await settle(page, 1500);
  const lead = (await page.evaluate(() => window.__requests))[0] || {};
  record('Draft B: the lead carries the same form_session_id', lead.form_session_id === first.form_session_id, lead.form_session_id);
  record('Draft B: no draft request after the submission', saves().length === beforeSubmit, `${saves().length} vs ${beforeSubmit}`);
  events = await fbq(page);
  record('Meta: Lead once, only after the confirmed submission', count(events, 'track:Lead') === 1);
  const steps = await page.evaluate(() => window.__fbq.filter((args) => args[1] === 'LeadFormStepCompleted').map((args) => `${args[2].step}:${args[2].step_key}`));
  record('Meta: LeadFormStarted once; LeadFormStepCompleted once per step, the third only after the accepted lead', count(events, 'trackCustom:LeadFormStarted') === 1 && steps.join() === '1:type_de_bien,2:budget,3:coordonnees', steps.join());
  record('Meta: no phone number or e-mail in any Pixel call', !/612345673|612345678|yasmine@/.test(await page.evaluate(() => JSON.stringify(window.__fbq))));
  await card.getByText('Investir', { exact: true }).click();
  await card.getByRole('button', { name: /Terminer/ }).click();
  await card.getByText('C’est noté.').waitFor();
  const requests = await page.evaluate(() => window.__requests);
  record('Draft: the qualification request keeps the session, still no new draft', requests[1].form_session_id === first.form_session_id && saves().length === beforeSubmit);
  record('Draft: no console error', errors.length === 0, errors.join(' | '));
  await context.close();
}

/* ── Leaving, coming back, a second browser ─────────────────────────────── */
if (FLAGS.partialCapture) {
  const { context, page, drafts } = await open({ width: 390, height: 780 });
  const saves = () => drafts.filter((draft) => draft.action !== 'sweep');
  await toContact(page);
  await page.locator('#hs7-hero-phone').pressSequentially('612345678', { delay: 20 });
  // Leaves at once: no blur, no pause.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await settle(page, 300);
  const beacons = (await page.evaluate(() => window.__beacons)).filter((beacon) => beacon.url.includes('lead-draft.php') && beacon.body.action !== 'sweep');
  record('Draft A: leaves right after typing → saved with a beacon on the way out', beacons.length === 1 && beacons[0].body.phone.endsWith('612345678') && saves().length === 0, `${beacons.length} beacons, ${saves().length} fetches`);
  const sessionA = beacons[0]?.body.form_session_id;

  // E — same tab, back and reloaded: the session is the same one.
  await page.evaluate(() => Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }));
  await page.reload({ waitUntil: 'networkidle' });
  await toContact(page);
  await page.fill('#hs7-hero-phone', '612345678');
  await page.locator('#hs7-hero-name').focus();
  await settle(page, 300);
  record('Draft E: comes back in the same tab → same form_session_id', saves().length === 1 && saves()[0].form_session_id === sessionA, `${saves()[0]?.form_session_id} vs ${sessionA}`);

  // G — another browser session.
  const other = await open({ width: 390, height: 780 });
  await toContact(other.page);
  await other.page.fill('#hs7-hero-phone', '612345678');
  await other.page.locator('#hs7-hero-name').focus();
  await settle(other.page, 300);
  const sessionB = other.drafts.filter((draft) => draft.action !== 'sweep')[0]?.form_session_id;
  record('Draft G: a second browser session gets its own form_session_id', Boolean(sessionB) && sessionB !== sessionA, `${sessionA} / ${sessionB}`);
  await other.context.close();
  await context.close();
}

/* ── Timers: still-active signal, grace-period resend, sweep ping ───────── */
if (FLAGS.partialCapture) {
  const { context, page, drafts } = await open({ width: 390, height: 780 }, { clock: true });
  const saves = () => drafts.filter((draft) => draft.action !== 'sweep');
  await page.locator('#dossier').scrollIntoViewIfNeeded();
  await page.clock.runFor(9000);
  await settle(page, 300); // the recorder reads the beacon's body asynchronously
  const pings = (await page.evaluate(() => window.__beacons)).filter((beacon) => beacon.url.includes('lead-draft.php') && beacon.body.action === 'sweep');
  record('Sweep ping: once per page view, with no data at all', pings.length === 1 && Object.keys(pings[0].body).join() === 'action');
  await toContact(page);
  await page.fill('#hs7-hero-phone', '612345678');
  await page.clock.runFor(1100);
  await settle(page, 200);
  record('Clock: saved after the 1 s debounce', saves().length === 1);
  await page.clock.runFor(30000);
  await page.locator('#hs7-hero-name').focus();
  await page.locator('#hs7-hero-phone').focus();
  await settle(page, 200);
  record('Clock: 30 s later, unchanged → still one request', saves().length === 1, String(saves().length));
  await page.clock.runFor(18000);
  await settle(page, 200);
  record('Clock: still on the form after the grace period → one "still here" resend', saves().length === 2 && saves()[1].form_session_id === saves()[0].form_session_id, String(saves().length));
  await page.clock.runFor(61000);
  await page.locator('#hs7-hero-name').focus();
  await settle(page, 200);
  record('Draft E: active again a minute later, nothing changed → last activity refreshed', saves().length === 3, String(saves().length));
  await context.close();
}

/* ── A failing draft endpoint must never be visible ─────────────────────── */
if (FLAGS.partialCapture) {
  const { context, page, errors } = await open({ width: 390, height: 780 });
  await page.route('**/lead-draft.php', (route) => route.fulfill({ status: 500, body: 'boom' }));
  await stubContact(page);
  const card = page.locator('#dossier');
  await card.scrollIntoViewIfNeeded();
  await fill(page, 'hs7-hero');
  await page.locator('#hs7-hero-name').focus();
  await settle(page, 1300);
  record('Draft F: endpoint down → form unchanged, no message', (await card.locator('button[type="submit"]').isEnabled()) && !(await card.locator('[role="alert"]').innerText()).trim());
  await page.route('**/lead-draft.php', (route) => route.abort());
  await page.fill('#hs7-hero-name', 'Client Test Deux');
  await settle(page, 1300);
  await card.locator('button[type="submit"]').click();
  await card.getByText('Demande envoyée.').waitFor();
  const events = await fbq(page);
  record('Draft F: network failure → the lead still goes through, Lead fires once', count(events, 'track:Lead') === 1 && !events.includes('trackCustom:partial_lead_captured'));
  record('Draft F: no uncaught error', errors.length === 0, errors.join(' | '));
  await context.close();
}

/* ── Switched off: no counter, nothing saved before submit ──────────────── */
if (!FLAGS.activityCounter || !FLAGS.partialCapture) {
  const { context, page, drafts, phpCalls } = await open({ width: 390, height: 780 });
  await stubContact(page);
  await fill(page, 'hs7-hero');
  await settle(page, 2500);
  const beacons = await page.evaluate(() => window.__beacons.map((beacon) => beacon.url));
  const events = await fbq(page);
  if (!FLAGS.activityCounter) record('Activity counter off: no band, no request to /activity.php', (await page.locator('[data-activity]').count()) === 0 && !phpCalls.includes('/activity.php'), phpCalls.join(', '));
  if (!FLAGS.partialCapture) record('Draft capture off: nothing leaves the browser before submit', drafts.length === 0 && !beacons.some((url) => url.includes('lead-draft')) && !phpCalls.includes('/lead-draft.php') && !events.includes('trackCustom:partial_lead_captured'), `${drafts.length} drafts, ${phpCalls.join(', ')}`);
  await context.close();
}

/* ── Meta and Snapchat are independent ──────────────────────────────────── */
{
  // Snap's pixel throws on every event: Meta, the lead request and the form must not notice.
  const { context, page, errors } = await open({ width: 390, height: 780 }, { snap: 'throw' });
  await stubContact(page);
  const card = page.locator('#dossier');
  await card.scrollIntoViewIfNeeded();
  await fill(page, 'hs7-hero');
  await card.locator('button[type="submit"]').click();
  await card.getByText('Demande envoyée.').waitFor();
  const events = await fbq(page);
  record('Snap pixel failing: lead still sent, form still succeeds', (await page.evaluate(() => window.__requests.length)) === 1);
  record('Snap pixel failing: Meta unaffected — ViewContent, LeadFormStarted, one Lead', count(events, 'track:ViewContent') === 1 && count(events, 'trackCustom:LeadFormStarted') === 1 && count(events, 'track:Lead') === 1, events.join(', '));
  record('Snap pixel failing: nothing thrown into the page', errors.length === 0, errors.join(' | '));
  await context.close();
}
{
  // Meta's pixel throws on every event after load: Snap and the form must not notice.
  const { context, page, errors } = await open({ width: 390, height: 780 });
  await page.evaluate(() => (window.__metaDown = true));
  await stubContact(page);
  const card = page.locator('#dossier');
  await card.scrollIntoViewIfNeeded();
  await fill(page, 'hs7-hero');
  await card.locator('button[type="submit"]').click();
  await card.getByText('Demande envoyée.').waitFor();
  const calls = await snapCalls(page);
  record('Meta pixel failing: lead still sent, form still succeeds', (await page.evaluate(() => window.__requests.length)) === 1);
  record('Meta pixel failing: Snap unaffected — CUSTOM_EVENT_1 once, SIGN_UP once', count(calls, 'track:CUSTOM_EVENT_1') === 1 && count(calls, 'track:SIGN_UP') === 1, calls.join(', '));
  record('Meta pixel failing: nothing thrown into the page', errors.length === 0, errors.join(' | '));
  await context.close();
}
{
  // Snap's pixel absent altogether (blocked, or localhost).
  const { context, page, errors } = await open({ width: 390, height: 780 }, { snap: 'absent' });
  await stubContact(page);
  const card = page.locator('#dossier');
  await card.scrollIntoViewIfNeeded();
  await fill(page, 'hs7-hero');
  await card.locator('button[type="submit"]').click();
  await card.getByText('Demande envoyée.').waitFor();
  record('Snap pixel absent: one Meta Lead, no error', count(await fbq(page), 'track:Lead') === 1 && errors.length === 0, errors.join(' | '));
  await context.close();
}

/* ── Attribution: whatever arrived in the URL, Meta or Snapchat ─────────── */
{
  const search = '?utm_source=snapchat&utm_medium=paid_social&utm_campaign=snap-hs7&utm_content=story-a&utm_term=marrakech&ScCid=snap-click-9';
  const { context, page } = await open({ width: 390, height: 780 }, { search });
  await stubContact(page);
  const card = page.locator('#dossier');
  await card.scrollIntoViewIfNeeded();
  await fill(page, 'hs7-hero');
  await card.locator('button[type="submit"]').click();
  await card.getByText('Demande envoyée.').waitFor();
  const lead = (await page.evaluate(() => window.__requests))[0];
  record('Snap traffic: UTMs kept as they arrived', lead.utm_source === 'snapchat' && lead.utm_medium === 'paid_social' && lead.utm_campaign === 'snap-hs7' && lead.utm_content === 'story-a' && lead.utm_term === 'marrakech' && lead.utmSource === 'snapchat');
  record('Snap traffic: click ID (ScCid) sent with the lead, platform = Snapchat, no fbclid invented', lead.sc_click_id === 'snap-click-9' && lead.adPlatform === 'Snapchat' && lead.fbclid === '', JSON.stringify({ sc: lead.sc_click_id, platform: lead.adPlatform, fbclid: lead.fbclid }));
  record('Snap traffic: both platforms still get their own conversion', count(await fbq(page), 'track:Lead') === 1 && count(await snapCalls(page), 'track:SIGN_UP') === 1);
  // Same tab, later arrival from a Meta ad: the first touch is not overwritten.
  await page.goto(`${base}${path}?utm_source=facebook&utm_campaign=meta-later&fbclid=later-click`, { waitUntil: 'networkidle' });
  const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('emara_hs7_landing_attribution')));
  record('First touch kept: a later Meta click does not overwrite the Snap UTMs', stored.utm_source === 'snapchat' && stored.utm_campaign === 'snap-hs7' && stored.ad_platform === 'Snapchat' && stored.sc_click_id === 'snap-click-9', JSON.stringify(stored));
  await context.close();
}
{
  const { context, page } = await open({ width: 390, height: 780 });
  const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('emara_hs7_landing_attribution')));
  record('Meta traffic: unchanged — platform Meta, fbclid kept, no Snap click ID', stored.ad_platform === 'Meta' && stored.fbclid === 'click-4' && !stored.sc_click_id);
  await page.goto(`${base}${path}?utm_source=snapchat&utm_campaign=snap-later&sccid=later`, { waitUntil: 'networkidle' });
  const after = await page.evaluate(() => JSON.parse(sessionStorage.getItem('emara_hs7_landing_attribution')));
  record('First touch kept: a later Snap click does not overwrite the Meta UTMs', after.utm_source === 'facebook' && after.utm_campaign === 'hs7-test' && after.ad_platform === 'Meta');
  await context.close();
}

/* ── Scroll reveals: nothing may stay hidden once it has been scrolled past ─ */
for (const width of [390, 1280]) {
  const { context, page } = await open({ width, height: width < 800 ? 700 : 860 });
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 220) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(60);
  }
  await settle(page, 1200);
  const hidden = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-reveal]')).filter((node) => {
      // Blocks that are not rendered at this width (display: none) cannot be "left hidden".
      if (!node.getClientRects().length) return false;
      const style = getComputedStyle(node);
      const matrix = new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform);
      return Number(style.opacity) < 0.99 || Math.abs(matrix.m42) > 1;
    }).length,
  );
  record(`${width}px: every heading and block is revealed after scrolling the page`, hidden === 0, `${hidden} hidden`);
  await context.close();
}

/* ── Every required event name was seen at least once across the run ────── */
{
  const { context, page } = await open({ width: 390, height: 780 });
  await stubContact(page);
  await page.evaluate(() => document.addEventListener('click', (event) => event.target.closest('a[href^="tel:"], a[href*="wa.me"]') && event.preventDefault()));
  await page.locator('[data-hero-cta]').click();
  await settle(page, 600);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('link', { name: /Voir les appartements témoins/ }).click();
  await settle(page, 900);
  await page.locator('#appartements-temoins').getByRole('link', { name: /Demander les disponibilités/ }).click();
  await settle(page, 900);
  await page.locator('#hs7-simulator-price').scrollIntoViewIfNeeded();
  await page.locator('#echeancier').getByRole('button', { name: MONEY.preset }).click();
  await settle(page, 1100);
  await page.locator('#choix').getByRole('link', { name: /Demander les disponibilités/ }).click();
  await settle(page, 900);
  await page.locator('#questions summary').first().click();
  await page.locator('footer a[href^="tel:"]').click();
  await page.locator('footer a[href*="wa.me"]').click();
  const card = page.locator('#disponibilites');
  await fill(page, 'hs7-final');
  await card.locator('button[type="submit"]').click();
  await card.getByText('Demande envoyée.').waitFor();
  await card.getByText('Pied-à-terre', { exact: true }).click();
  await card.getByText('Appel', { exact: true }).click();
  await card.getByRole('button', { name: /Visiter un appartement témoin/ }).click();
  const events = await fbq(page);
  const missing = FUNNEL_EVENTS.filter((name) => !events.includes(`trackCustom:${name}`));
  record('Tracking: all 18 funnel events fire in a full visit', missing.length === 0, missing.join(', '));
  const dataLayer = await page.evaluate(() => (window.dataLayer || []).map((entry) => entry.event));
  record('Tracking: mirrored to dataLayer', FUNNEL_EVENTS.every((name) => dataLayer.includes(name)));
  await context.close();
}

await browser.close();
server.close();
const failed = results.filter((result) => !result.ok);
console.log(`\n  ${results.length - failed.length}/${results.length} passed\n`);
process.exit(failed.length ? 1 : 0);
