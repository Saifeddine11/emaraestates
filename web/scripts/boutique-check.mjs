import { chromium } from 'playwright';
import { startServer } from './lib/serve.mjs';

/**
 * /residence-boutique-gueliz behaviour checks: ads-page SEO (noindex, no
 * canonical), hero hook + form above the fold at every QA width, no
 * horizontal overflow, the two-step form over one shared state, the
 * /contact.php payload contract, UTM persistence, success-only Lead, error +
 * retry, the mobile sticky CTA, CRO events, keyboard use and reduced motion.
 */

const { server, base } = await startServer();
const browser = await chromium.launch();
const results = [];
const URL_PATH = '/residence-boutique-gueliz';
const QUERY =
  '?utm_source=facebook&utm_medium=paid_social&utm_campaign=rb-test&utm_content=creative-a&utm_term=gueliz&campaign_id=cmp-1&adset_id=set-2&ad_id=ad-3&fbclid=click-4';

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function open(viewport, { reducedMotion = 'no-preference', query = QUERY } = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    reducedMotion,
  });
  await context.addCookies([
    { name: '_fbc', value: 'fb.1.test-click', url: base },
    { name: '_fbp', value: 'fb.1.test-browser', url: base },
  ]);
  await context.addInitScript(() => {
    window.__fbqEvents = [];
    window.fbq = (...args) => window.__fbqEvents.push(args);
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/ERR_FAILED/.test(message.text())) errors.push(message.text());
  });
  await page.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    if (/facebook|snapchat|sc-static|ahrefs|country\.is/.test(host)) return route.abort();
    return route.continue();
  });
  await page.goto(`${base}${URL_PATH}${query}`, { waitUntil: 'networkidle' });
  return { context, page, errors };
}

async function stubContact(page, { status = 200, body = { message: 'ok' }, delay = 0 } = {}) {
  await page.evaluate(
    ({ status, body, delay }) => {
      window.__requests = [];
      window.fetch = (url, init) => {
        if (String(url).includes('/contact.php')) {
          window.__requests.push({ url: String(url), body: JSON.parse(init.body) });
          return new Promise((resolve) =>
            setTimeout(
              () => resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })),
              delay,
            ),
          );
        }
        return Promise.resolve(new Response('', { status: 204 }));
      };
    },
    { status, body, delay },
  );
}

const fbq = (page) => page.evaluate(() => window.__fbqEvents.map((args) => `${args[0]}:${args[1]}`));
const layer = (page) => page.evaluate(() => (window.dataLayer || []).map((entry) => entry.event));
const card = (page, placement) => page.locator(`[data-lead-form="${placement}"]`);

async function completeStep1(page, placement = 'hero') {
  const form = card(page, placement);
  await form.getByText('Appartement 1 chambre', { exact: true }).click();
  await form.locator('label', { has: page.locator('input[value="1,6 M – 2 M MAD"]') }).click();
  await form.getByRole('button', { name: 'Voir mes options' }).click();
  await page.waitForSelector(`#rb-${placement}-name`);
}

async function fillStep2(page, placement = 'hero') {
  await page.fill(`#rb-${placement}-name`, 'Client Test Boutique');
  await page.fill(`#rb-${placement}-phone`, '612345678');
  await page.fill(`#rb-${placement}-email`, 'client@example.com');
}

console.log('\nRÉSIDENCE BOUTIQUE CHECK\n');

/* ── Desktop: head, hero, images, chrome ─────────────────────────────────── */
{
  const { context, page, errors } = await open({ width: 1440, height: 900 });
  const head = await page.evaluate(() => ({
    title: document.title,
    robots: document.querySelector('meta[name="robots"]')?.content,
    canonical: document.querySelectorAll('link[rel="canonical"]').length,
    preload: document.querySelector('link[rel="preload"][as="image"][imagesrcset]')?.getAttribute('imagesrcset'),
    h1: document.querySelectorAll('h1').length,
  }));
  record('seo: ads page is noindex, nofollow', head.robots === 'noindex, nofollow', head.robots);
  record('seo: no canonical', head.canonical === 0);
  record('seo: title carries the positioning', /1re résidence boutique à Guéliz hyper-centre/.test(head.title), head.title);
  record('a11y: exactly one h1', head.h1 === 1);
  record('perf: hero visual preloaded with srcset', Boolean(head.preload?.includes('facade-jour-640.webp')), head.preload);

  // Visible, non-decorative text only (innerText breaks around the flex rule).
  const h1 = await page.locator('h1').evaluate((heading) => {
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    let text = '';
    while (walker.nextNode()) {
      const parent = walker.currentNode.parentElement;
      if (parent.closest('[aria-hidden="true"]') || !parent.checkVisibility()) continue;
      text += walker.currentNode.textContent;
    }
    return text.replace(/\s+/g, ' ').trim();
  });
  record('hero: headline', h1.toLowerCase().replace(/\s/g, '') === 'la1rerésidenceboutiqueàguélizhyper-centre.', h1);
  const hero = page.locator('section[aria-labelledby="hero-title"]');
  const heroText = (await hero.innerText()).replace(/\s+/g, ' ');
  for (const fact of ['Piscines. Spa. Jacuzzi. Salle de sport. Sauna. Cinéma extérieur.', 'Pas dans un hôtel. Chez vous.', 'À 1 min à pied du Plaza', '1 390 000']) {
    record(`hero: shows "${fact}"`, heroText.toLowerCase().includes(fact.toLowerCase()));
  }
  record('chrome: no site navigation or mega-footer', (await page.locator('nav#nav').count()) === 0 && (await page.locator('footer a').count()) <= 3);
  record('chrome: header CTA', await page.locator('header a[href="#disponibilites"]').isVisible());
  record('chrome: no intro curtain', (await page.locator('.z-9999.bg-forest').count()) === 0);

  const lcp = await page.locator('section[aria-labelledby="hero-title"] img').first().evaluate((img) => ({
    eager: img.loading === 'eager',
    priority: img.getAttribute('fetchpriority'),
    loaded: img.complete && img.naturalWidth > 0,
  }));
  record('hero: first visual eager, high priority, loaded', lcp.eager && lcp.priority === 'high' && lcp.loaded);
  const eager = await page.$$eval('main img', (imgs) => imgs.filter((img) => img.loading !== 'lazy').length);
  record('perf: only the first hero visual is eager', eager === 1, String(eager));
  const noAlt = await page.$$eval('main img:not([alt])', (imgs) => imgs.length);
  record('a11y: every image has an alt attribute', noAlt === 0);

  record('tracking: ViewContent once, this creative', (await page.evaluate(() => window.__fbqEvents.filter((a) => a[1] === 'ViewContent').map((a) => a[2].content_name))).join() === 'Honest Signature 7 - Residence boutique');
  record('tracking: landing_view in dataLayer + Meta custom', (await layer(page)).includes('landing_view') && (await fbq(page)).includes('trackCustom:landing_view'));
  const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('emara_hs7_landing_attribution') || '{}'));
  record('utm: all five UTMs + fbclid stored on arrival', stored.utm_source === 'facebook' && stored.utm_medium === 'paid_social' && stored.utm_campaign === 'rb-test' && stored.utm_content === 'creative-a' && stored.utm_term === 'gueliz' && stored.fbclid === 'click-4');

  // Hero rotation: a second slide mounts after load and takes over.
  await page.waitForTimeout(6500);
  const label = await hero.locator('[aria-live="polite"]').first().innerText();
  record('hero: slideshow advances (01 → 02)', /02/.test(label), label.replace(/\s+/g, ' '));

  // Scroll through for section views, lazy images and reveals.
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(900);
  const events = await layer(page);
  record('tracking: amenities_section_view', events.includes('amenities_section_view'));
  record('tracking: payment_section_view', events.includes('payment_section_view'));
  const sources = await page.$$eval('main img', (imgs) => [
    ...new Set(imgs.flatMap((img) => [img.src, ...img.srcset.split(',').map((part) => part.trim().split(' ')[0]).filter(Boolean)])),
  ]);
  const missing = [];
  for (const source of sources) if (!(await page.request.get(new URL(source, base).href)).ok()) missing.push(source);
  record(`images: all ${sources.length} sources served`, missing.length === 0, missing.join(', '));
  const hidden = await page.$$eval('main h2', (nodes) =>
    nodes.filter((node) => [...node.querySelectorAll('[data-reveal]')].some((el) => getComputedStyle(el).transform !== 'none' && el.getBoundingClientRect().top > el.parentElement.getBoundingClientRect().bottom - 2)).length,
  );
  record('motion: every section heading revealed after scrolling', hidden === 0, `${hidden} hidden`);
  record('content: payment timeline has 5 milestones', (await page.locator('#paiement ol > li').count()) === 5);
  const plan = (await page.locator('#paiement ol').innerText()).replace(/\s+/g, ' ');
  record('content: 30 / 15 / 15 / 15 / 25', /30\s?% À la réservation.*15\s?% 6 mois.*15\s?% 12 mois.*15\s?% 18 mois.*25\s?% À la remise des clés/.test(plan), plan);
  record('content: no fake scarcity or countdown', !/(il reste|plus que \d|\d+ personnes|compte à rebours|dernières? unités?)/i.test(await page.locator('main').innerText()));
  record('content: delivered residences use real photos only', (await page.locator('#realisations li').count()) === 5);

  // A deep CTA scrolls to the nearest form (the closing one), not back up.
  await page.evaluate(() => document.getElementById('choix').scrollIntoView({ behavior: 'instant' }));
  await page.locator('#choix a[href="#disponibilites"]').click();
  await page.waitForTimeout(1400);
  const finalTop = await card(page, 'final').evaluate((el) => el.getBoundingClientRect().top);
  record('cta: deep CTA scrolls to the nearest (closing) form', Math.abs(finalTop) < 200, String(Math.round(finalTop)));
  record('tracking: availability_cta_click with location', await page.evaluate(() => window.dataLayer.some((e) => e.event === 'availability_cta_click' && e.location === 'fomo')));
  record('console: no errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

/* ── Every QA width: fold, overflow, text size ───────────────────────────── */
for (const [width, height] of [[1440, 900], [1280, 800], [1024, 768], [390, 844], [375, 667], [360, 740]]) {
  const mobile = width < 700;
  const { context, page } = await open({ width, height, isMobile: mobile, hasTouch: mobile });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  record(`${width}px: no horizontal overflow`, overflow <= 0, String(overflow));
  const box = await card(page, 'hero').boundingBox();
  const limit = mobile ? height * 1.5 : height;
  record(`${width}px: hero form starts within ${mobile ? '1.5 screens' : 'the first screen'}`, box.y < limit, `${Math.round(box.y)} / ${limit}`);
  if (!mobile) {
    const cta = await card(page, 'hero').getByRole('button', { name: 'Voir mes options' }).boundingBox();
    record(`${width}px: hero form CTA visible without scrolling`, cta.y + cta.height <= height, `${Math.round(cta.y + cta.height)} / ${height}`);
  }
  const price = await page.getByText('À partir de', { exact: true }).filter({ visible: true }).first().boundingBox();
  record(`${width}px: price above the form`, price && price.y < Math.max(box.y, height), price ? String(Math.round(price.y)) : 'missing');
  if (mobile) {
    const small = await page.$$eval('main p, main li, main a, main button, main label, main legend', (nodes) =>
      nodes.filter((n) => n.offsetParent && n.innerText.trim() && parseFloat(getComputedStyle(n).fontSize) < 12.5).map((n) => n.innerText.slice(0, 20)),
    );
    record(`${width}px: no text under 12.5px`, small.length === 0, small.join(' | '));
    const sticky = page.locator('[data-sticky-cta]');
    record(`${width}px: sticky hidden on the hero`, (await sticky.getAttribute('aria-hidden')) === 'true');
    await page.evaluate(() => document.getElementById('paiement').scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(450);
    record(`${width}px: sticky shown mid-page`, (await sticky.getAttribute('aria-hidden')) === 'false');
    const pad = await sticky.evaluate((el) => getComputedStyle(el).paddingBottom);
    record(`${width}px: sticky respects the safe area`, parseFloat(pad) >= 14, pad);
    await page.evaluate(() => document.querySelector('[data-lead-form="final"]').scrollIntoView({ behavior: 'instant', block: 'center' }));
    await page.waitForTimeout(450);
    record(`${width}px: sticky hidden while a form is visible`, (await sticky.getAttribute('aria-hidden')) === 'true');
  }
  await context.close();
}

/* ── Form: validation, shared state, payload, success-only Lead ─────────── */
{
  const { context, page } = await open({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const hero = card(page, 'hero');
  await hero.getByRole('button', { name: 'Voir mes options' }).click();
  record('form: step 1 requires both answers', (await hero.getByText('Choisissez un type de bien.').isVisible()) && (await hero.getByText('Choisissez une fourchette de budget.').isVisible()));
  await hero.getByText('Studio', { exact: true }).click();
  const radio = hero.locator('input[type="radio"][value="Studio"]');
  record('form: selection is a checked radio', await radio.isChecked());
  record('form: selection mirrored in the closing form', await card(page, 'final').locator('input[type="radio"][value="Studio"]').isChecked());
  const events = await layer(page);
  record('tracking: form_started + property_type_selected', events.includes('form_started') && events.includes('property_type_selected'));
  record('tracking: LeadFormStarted kept (Meta)', (await fbq(page)).includes('trackCustom:LeadFormStarted'));

  await completeStep1(page);
  await page.waitForTimeout(600); // focus follows the 380 ms step transition
  record('form: step 2 focuses the name field', await page.evaluate(() => document.activeElement?.id === 'rb-hero-name'));
  record('tracking: budget_selected + form_step_2 + LeadFormStepCompleted', (await layer(page)).includes('budget_selected') && (await layer(page)).includes('form_step_2') && (await fbq(page)).includes('trackCustom:LeadFormStepCompleted'));
  record('form: summary shows both answers', /Appartement 1 chambre.*1,6 M – 2 M MAD/.test((await hero.innerText()).replace(/\s+/g, ' ')));
  record('tracking: no Lead before submit', !(await fbq(page)).includes('track:Lead'));

  await stubContact(page, { delay: 400 });
  await hero.getByRole('button', { name: 'Voir les prix et disponibilités' }).click();
  record('form: step 2 validates locally (nothing sent)', (await page.evaluate(() => window.__requests.length)) === 0);
  record('form: first invalid field focused', await page.evaluate(() => document.activeElement?.id === 'rb-hero-name'));

  await fillStep2(page);
  await page.waitForTimeout(3100); // contact.php silently drops submissions under 3 s.
  const submit = hero.locator('button[type="submit"]');
  await submit.click();
  await submit.click({ force: true }).catch(() => {});
  await hero.getByText('C’est noté.').waitFor();
  const requests = await page.evaluate(() => window.__requests);
  record('form: exactly one request on double click', requests.length === 1, String(requests.length));
  const body = requests[0].body;
  const expected = {
    form_type: 'honest_signature_7_request',
    nom_complet: 'Client Test Boutique',
    first_name: 'Client',
    last_name: 'Test Boutique',
    email: 'client@example.com',
    budget: '1,6 M – 2 M MAD',
    propertyType: 'Appartement 1 chambre',
    purchase_intent: '',
    project: 'Honest Signature 7',
    projectName: 'Honest Signature 7',
    lead_origin: 'Meta Landing Page',
    landing_name: 'Residence boutique Gueliz',
    source: 'Meta Ads',
    leadSource: 'Landing Honest Signature 7',
    currency: 'MAD',
    utm_source: 'facebook',
    utm_medium: 'paid_social',
    utm_campaign: 'rb-test',
    utm_content: 'creative-a',
    utm_term: 'gueliz',
    utmSource: 'facebook',
    utmMedium: 'paid_social',
    utmCampaign: 'rb-test',
    utmContent: 'creative-a',
    utmTerm: 'gueliz',
    campaign: 'rb-test',
    campaignId: 'cmp-1',
    adsetId: 'set-2',
    adId: 'ad-3',
    fbclid: 'click-4',
    fbc: 'fb.1.test-click',
    fbp: 'fb.1.test-browser',
    adPlatform: 'Meta',
    company_website: '',
  };
  const mismatched = Object.entries(expected).filter(([key, value]) => body[key] !== value).map(([key]) => `${key}=${body[key]}`);
  record('payload: contract fields', mismatched.length === 0, mismatched.join(', '));
  record('payload: phone split', body.telephone.endsWith('612345678') && body.phoneFull === body.telephone && body.phoneNumber === '612345678');
  record('payload: type + budget in message', body.message === 'Demande : plans, prix & disponibilités — Type de bien : Appartement 1 chambre — Budget : 1,6 M – 2 M MAD', body.message);
  record('payload: budget fits contact.php (30 chars)', body.budget.length <= 30);
  record('payload: Meta event ID for CAPI dedupe', /^lead_[A-Za-z0-9-]{8,64}$/.test(body.meta_event_id));
  record('payload: landing URL keeps the UTMs', body.landingPageUrl.includes('utm_campaign=rb-test') && body.landing_page.includes('fbclid=click-4'));
  const leads = await page.evaluate(() => window.__fbqEvents.filter((a) => a[1] === 'Lead'));
  record('tracking: Lead exactly once, after success, with eventID', leads.length === 1 && leads[0][0] === 'track' && leads[0][3]?.eventID === body.meta_event_id);
  record('tracking: lead_submit_attempt + lead_submit_success', (await layer(page)).includes('lead_submit_attempt') && (await layer(page)).includes('lead_submit_success'));
  record('form: success mirrored in the closing form', await card(page, 'final').getByText('C’est noté.').isVisible().catch(() => false) || (await card(page, 'final').innerText()).includes('C’est noté.'));
  await page.evaluate(() => window.scrollTo(0, document.getElementById('paiement').offsetTop));
  await page.waitForTimeout(450);
  record('sticky: gone after a successful lead', (await page.locator('[data-sticky-cta]').getAttribute('aria-hidden')) === 'true');
  await context.close();
}

/* ── Form: server error keeps the visitor on step 2, no Lead, retry works ─ */
{
  const { context, page } = await open({ width: 1440, height: 900 });
  await page.evaluate(() => document.querySelector('[data-lead-form="final"]').scrollIntoView({ behavior: 'instant' }));
  await completeStep1(page, 'final');
  await fillStep2(page, 'final');
  await stubContact(page, { status: 500, body: { message: 'Erreur serveur.' } });
  await page.waitForTimeout(3100);
  const final = card(page, 'final');
  await final.locator('button[type="submit"]').click();
  await final.getByText('L’envoi n’a pas abouti.', { exact: false }).waitFor();
  record('error: message + WhatsApp fallback shown', await final.locator('[role="alert"] a[href^="https://wa.me"]').isVisible());
  record('error: no Lead, lead_submit_error logged', !(await fbq(page)).includes('track:Lead') && (await layer(page)).includes('lead_submit_error'));
  record('error: data kept for retry', (await page.inputValue('#rb-final-email')) === 'client@example.com');
  await stubContact(page);
  await final.locator('button[type="submit"]').click();
  await final.getByText('C’est noté.').waitFor();
  const retried = await page.evaluate(() => window.__requests[0].body);
  record('error: retry succeeds with the same data, placement final', retried.email === 'client@example.com');
  record('tracking: Lead fires after the successful retry', (await fbq(page)).filter((e) => e === 'track:Lead').length === 1);
  await context.close();
}

/* ── UTMs survive navigation without them ────────────────────────────────── */
{
  const { context, page } = await open({ width: 1440, height: 900 });
  await page.goto(`${base}${URL_PATH}`, { waitUntil: 'networkidle' });
  await completeStep1(page);
  await fillStep2(page);
  await stubContact(page);
  await page.waitForTimeout(3100);
  await card(page, 'hero').locator('button[type="submit"]').click();
  await card(page, 'hero').getByText('C’est noté.').waitFor();
  const body = await page.evaluate(() => window.__requests[0].body);
  record('utm: first-touch UTMs kept after a reload without them', body.utm_campaign === 'rb-test' && body.fbclid === 'click-4');
  await context.close();
}

/* ── Keyboard + reduced motion ───────────────────────────────────────────── */
{
  const { context, page, errors } = await open({ width: 1440, height: 900 }, { reducedMotion: 'reduce' });
  await page.locator('#rb-hero-type input').first().focus();
  await page.keyboard.press('ArrowDown');
  record('keyboard: arrow keys move through the type radios', await page.locator('#rb-hero-type input[value="Appartement 1 chambre"]').isChecked());
  await page.locator('#rb-hero-budget input').first().focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#rb-hero-name');
  record('keyboard: Enter submits step 1', await page.locator('#rb-hero-name').isVisible());
  await page.waitForTimeout(6500);
  const label = await page.locator('section[aria-labelledby="hero-title"] [aria-live="polite"]').first().innerText();
  record('reduced motion: no slideshow autoplay', /01/.test(label), label.replace(/\s+/g, ' '));
  await page.evaluate(() => document.getElementById('paiement').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(500);
  const opacity = await page.locator('#paiement ol > li').last().evaluate((el) => getComputedStyle(el).opacity);
  record('reduced motion: timeline content visible', opacity === '1', opacity);
  record('console: no errors (reduced motion)', errors.length === 0, errors.join(' | '));
  await context.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n  ${results.length - failed.length}/${results.length} passed\n`);
process.exit(failed.length ? 1 : 0);
