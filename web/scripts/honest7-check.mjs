import { chromium } from 'playwright';
import { startServer } from './lib/serve.mjs';

const { server, base } = await startServer();
const browser = await chromium.launch();
const results = [];
const path = '/honest-signature-7/';
const query = '?utm_source=facebook&utm_medium=paid_social&utm_campaign=hs7-test&utm_content=creative-a&utm_term=gueliz&campaign_id=cmp-1&adset_id=set-2&ad_id=ad-3&fbclid=click-4';

function record(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function open(viewport, reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport, reducedMotion, isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
  await context.addCookies([{ name: '_fbc', value: 'fb.1.test-click', url: base }, { name: '_fbp', value: 'fb.1.test-browser', url: base }]);
  await context.addInitScript(() => { window.__fbqEvents = []; window.fbq = (...args) => window.__fbqEvents.push(args); });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => message.type() === 'error' && !/ERR_FAILED/.test(message.text()) && errors.push(message.text()));
  await page.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    if (/facebook|snapchat|sc-static|ahrefs|country\.is/.test(host)) return route.abort();
    return route.continue();
  });
  await page.goto(`${base}${path}${query}`, { waitUntil: 'networkidle' });
  return { context, page, errors };
}

async function stubContact(page, response = { status: 200, body: { message: 'ok' } }) {
  await page.evaluate(({ status, body }) => {
    window.__requests = [];
    window.fetch = (url, init) => {
      if (String(url).includes('/contact.php')) {
        window.__requests.push({ url: String(url), body: JSON.parse(init.body) });
        return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
      }
      return Promise.resolve(new Response('', { status: 204 }));
    };
  }, response);
}

const events = (page) => page.evaluate(() => window.__fbqEvents.map((args) => `${args[0]}:${args[1]}`));

async function fillForm(page, prefix = 'hs7-hero') {
  await page.fill(`#${prefix}-name`, 'Client Test');
  await page.fill(`#${prefix}-email`, 'client@example.com');
  await page.fill(`#${prefix}-phone`, '612345678');
  await page.locator(`label:has(#${prefix}-budget-1)`).click();
}

console.log('\nHONEST SIGNATURE 7 — PAID LANDING QA\n');

{
  const { context, page, errors } = await open({ width: 1440, height: 900 });
  const state = await page.evaluate(() => ({
    title: document.title,
    canonical: document.querySelector('link[rel="canonical"]')?.href,
    h1: document.querySelector('h1')?.innerText.replace(/\s+/g, ' ').trim(),
    h1Count: document.querySelectorAll('h1').length,
    mainSections: document.querySelectorAll('main > section').length,
    forms: document.querySelectorAll('main form').length,
    corporateNav: document.querySelectorAll('nav#nav').length,
    preload: document.querySelector('link[rel="preload"][as="image"][imagesrcset]')?.getAttribute('imagesrcset'),
    text: document.body.innerText,
  }));
  record('SEO: title and canonical', /Honest Signature 7/.test(state.title) && state.canonical === 'https://emaraestates.com/honest-signature-7/');
  record('A11y: exactly one H1', state.h1Count === 1);
  record('Hero: exact editorial headline', state.h1 === 'GUÉLIZ. MAIS COMME VOUS NE L’AVEZ JAMAIS VÉCU.', state.h1);
  record('Positioning: forbidden phrase absent', !/résidence boutique|première résidence boutique/i.test(state.text));
  record('Paid traffic: corporate navigation absent', state.corporateNav === 0);
  record('Flow: ten conversion sections present', state.mainSections >= 8, String(state.mainSections));
  record('Forms: same compact workflow repeated twice', state.forms === 2, String(state.forms));
  record('Form: no multi-step/property-type copy', !/étape 1 sur 2|type de projet|continuer/i.test(state.text));
  record('Amenities: all eight visible', ['piscines', 'spa', 'jacuzzi', 'salle de sport', 'sauna', 'cinéma extérieur', 'conciergerie', 'parking titré'].every((word) => state.text.toLowerCase().includes(word)));
  const hero = page.locator('section[aria-labelledby="hero-title"]');
  record('Hero: exactly two primary actions', await hero.getByRole('button', { name: /Voir les prix & disponibilités/ }).count() === 1 && await hero.getByRole('button', { name: /Visiter les appartements témoins/ }).count() === 1);
  record('Performance: main hero srcset preloaded', Boolean(state.preload?.includes('facade-jour-640.webp')));
  const img = await page.locator('section[aria-labelledby="hero-title"] img').first().evaluate((node) => ({ loading: node.loading, fetch: node.getAttribute('fetchpriority'), complete: node.complete && node.naturalWidth > 0 }));
  record('Performance: LCP image eager/high priority', img.loading === 'eager' && img.fetch === 'high' && img.complete);
  const fb = await events(page);
  record('Tracking: ViewContent and landing_view', fb.includes('track:ViewContent') && fb.includes('trackCustom:landing_view'), fb.join(', '));
  record('Console: no runtime/hydration errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

for (const width of [375, 390, 430]) {
  const { context, page } = await open({ width, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  record(`${width}px: no horizontal overflow`, overflow <= 0, String(overflow));
  const hero = page.locator('section[aria-labelledby="hero-title"]');
  const priceAction = hero.getByRole('button', { name: /Voir les prix & disponibilités/ });
  const showAction = hero.getByRole('button', { name: /Visiter les appartements témoins/ });
  record(`${width}px: two hero actions visible`, await priceAction.isVisible() && await showAction.isVisible());
  await priceAction.click();
  await page.waitForTimeout(700);
  const top = await page.locator('#prix-disponibilites').evaluate((node) => node.getBoundingClientRect().top);
  record(`${width}px: price CTA reaches first form`, top < 220, String(Math.round(top)));
  await page.locator('#appartements-temoins').scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const rail = page.locator('#appartements-temoins [role="region"]').first();
  const track = rail.locator('ul').first();
  const before = await track.evaluate((node) => node.scrollLeft);
  await track.focus();
  await track.press('ArrowRight');
  await page.waitForTimeout(500);
  const after = await track.evaluate((node) => node.scrollLeft);
  record(`${width}px: gallery supports keyboard/swipe rail`, after > before, `${Math.round(before)} → ${Math.round(after)}`);
  await page.locator('#paiement').scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  const sticky = page.locator('[data-sticky-availability]');
  record(`${width}px: sticky CTA appears after first form`, await sticky.getAttribute('aria-hidden') === 'false');
  await page.locator('#demande-finale').scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  record(`${width}px: sticky CTA hides while form visible`, await sticky.getAttribute('aria-hidden') === 'true');
  await context.close();
}

{
  const { context, page } = await open({ width: 390, height: 844 });
  await page.locator('#prix-disponibilites').scrollIntoViewIfNeeded();
  await page.locator('#prix-disponibilites button[type="submit"]').click();
  record('Validation: all compact fields required', await page.getByText('Indiquez votre nom complet.').isVisible() && await page.getByText('Choisissez votre budget.').isVisible());
  record('Tracking: form_started fires', (await events(page)).includes('trackCustom:form_started'));

  await stubContact(page);
  await fillForm(page);
  const before = await events(page);
  record('Tracking: no Lead before server success', !before.includes('track:Lead'));
  await page.locator('#prix-disponibilites button[type="submit"]').click();
  await page.getByText('Votre demande a bien été envoyée.').waitFor();
  const requests = await page.evaluate(() => window.__requests);
  const body = requests[0]?.body || {};
  record('Submit: exactly one CRM request', requests.length === 1, String(requests.length));
  const expected = { form_type: 'honest_signature_7_request', nom_complet: 'Client Test', email: 'client@example.com', budget: '1,6 M – 2 M MAD', project: 'Honest Signature 7', lead_origin: 'Meta Landing Page', source: 'Meta Ads', utm_source: 'facebook', utm_medium: 'paid_social', utm_campaign: 'hs7-test', utm_content: 'creative-a', utm_term: 'gueliz', fbclid: 'click-4' };
  const missing = Object.entries(expected).filter(([key, value]) => body[key] !== value).map(([key]) => key);
  record('Payload: CRM + UTM/fbclid contract preserved', missing.length === 0, missing.join(', '));
  record('Payload: international phone fields preserved', body.telephone?.endsWith('612345678') && body.phoneCode && body.phoneCountryCode);
  const after = await events(page);
  record('Tracking: Lead only once after success', after.filter((event) => event === 'track:Lead').length === 1);
  record('Tracking: required funnel success event', after.includes('trackCustom:lead_submit_success'));
  await context.close();
}

{
  const { context, page } = await open({ width: 390, height: 844 }, 'reduce');
  const value = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches && getComputedStyle(document.documentElement).scrollBehavior === 'auto');
  record('Reduced motion: preference respected', value);
  await context.close();
}

await browser.close();
server.close();
const failed = results.filter((result) => !result.ok);
console.log(`\n  ${results.length - failed.length}/${results.length} passed\n`);
process.exit(failed.length ? 1 : 0);
