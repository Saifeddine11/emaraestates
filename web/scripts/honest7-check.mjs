import { chromium } from 'playwright';
import { startServer } from './lib/serve.mjs';

/**
 * /honest-signature-7/ behaviour checks: SEO tags, hero continuity with the
 * ad, no intro curtain, responsive images, CTAs, mobile sticky bar, both form
 * steps, the /contact.php payload contract, attribution, success-only Lead,
 * funnel events, error handling and horizontal overflow at phone widths.
 */

const { server, base } = await startServer();
const browser = await chromium.launch();
const results = [];
const URL_PATH = '/honest-signature-7/';
const QUERY =
  '?utm_source=facebook&utm_medium=paid_social&utm_campaign=hs7-test&campaign_id=cmp-1&adset_id=set-2&ad_id=ad-3&fbclid=click-4';

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function open(viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
  });
  await context.addCookies([
    { name: '_fbc', value: 'fb.1.test-click', url: base },
    { name: '_fbp', value: 'fb.1.test-browser', url: base },
  ]);
  // Record pixel calls from the very first script, so ViewContent is caught.
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
    if (/facebook|snapchat|sc-static|ahrefs|country\.is|vertex-france/.test(host)) return route.abort();
    return route.continue();
  });
  await page.goto(`${base}${URL_PATH}${QUERY}`, { waitUntil: 'networkidle' });
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

const events = (page) => page.evaluate(() => window.__fbqEvents.map((args) => `${args[0]}:${args[1]}`));

async function completeStep1(page) {
  await page.getByText('Investir', { exact: true }).click();
  await page.getByText('1,6 M – 2 M MAD', { exact: true }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.waitForSelector('#hs7-first-name');
}

async function fillStep2(page) {
  await page.fill('#hs7-first-name', 'Client');
  await page.fill('#hs7-last-name', 'Test');
  await page.fill('#hs7-phone', '612345678');
  await page.fill('#hs7-email', 'client@example.com');
}

console.log('\nHONEST SIGNATURE 7 CHECK\n');

/* ── Desktop: SEO, hero, images, chrome ─────────────────────────────────── */
{
  const { context, page, errors } = await open({ width: 1440, height: 900 });
  const seo = await page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content,
    canonical: [...document.querySelectorAll('link[rel="canonical"]')].map((l) => l.href),
    ogUrl: document.querySelector('meta[property="og:url"]')?.content,
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
    robots: document.querySelector('meta[name="robots"]')?.content,
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
    preload: document.querySelector('link[rel="preload"][as="image"][imagesrcset]')?.getAttribute('imagesrcset'),
    h1Count: document.querySelectorAll('h1').length,
  }));
  record('seo: title', seo.title === 'Honest Signature 7 à Guéliz, Marrakech | Emara Estates', seo.title);
  record('seo: description mentions price & delivery', /1 390 000 MAD/.test(seo.description) && /juin 2028/.test(seo.description));
  record('seo: single slashed canonical', seo.canonical.length === 1 && seo.canonical[0] === 'https://emaraestates.com/honest-signature-7/', seo.canonical.join(', '));
  record('seo: og:url', seo.ogUrl === 'https://emaraestates.com/honest-signature-7/');
  record('seo: og:image', seo.ogImage === 'https://emaraestates.com/img/og-honest-signature-7.jpg', seo.ogImage);
  record('seo: indexable', /index/.test(seo.robots || '') && !/noindex/.test(seo.robots || ''), seo.robots);
  record('seo: WebPage + Breadcrumb JSON-LD', seo.jsonLd.some((s) => s.includes('honest-signature-7/') && s.includes('BreadcrumbList')));
  record('perf: hero image preloaded with srcset', Boolean(seo.preload?.includes('facade-jour-640.webp')), seo.preload);
  record('a11y: exactly one h1', seo.h1Count === 1);

  const h1 = (await page.locator('h1').innerText()).replace(/\s+/g, ' ').trim();
  record('hero: ad headline', h1 === '6 résidences livrées. La 7e prend forme à Guéliz.', h1);
  record('hero: proof strip', await page.getByText('Guéliz · dès 51 m² · dès 1,39 M MAD · livraison juin 2028').isVisible());
  record('hero: Plaza line', await page.getByText('Découvrez Honest Signature 7, à 1 minute à pied du Plaza.').isVisible());
  record('hero: primary CTA', (await page.locator('#la-7e a[href="#dossier"]', { hasText: 'Recevoir le dossier' }).count()) === 1);
  record('hero: no intro curtain', (await page.locator('.z-9999.bg-forest').count()) === 0);
  record('chrome: site header + footer kept', (await page.locator('nav#nav').count()) === 1 && (await page.locator('footer').count()) >= 1);

  const heroImg = await page.locator('#la-7e img').evaluate((img) => ({
    eager: img.loading === 'eager',
    priority: img.getAttribute('fetchpriority'),
    current: img.currentSrc,
    complete: img.complete && img.naturalWidth > 0,
  }));
  record('hero: image eager + high priority + loaded', heroImg.eager && heroImg.priority === 'high' && heroImg.complete, heroImg.current);

  const lazy = await page.$$eval('main img', (imgs) => imgs.slice(1).every((img) => img.loading === 'lazy' && img.alt !== undefined));
  record('perf: every image below the hero is lazy', lazy);
  const alts = await page.$$eval('main img', (imgs) => imgs.filter((img) => !img.alt).length);
  record('a11y: every content image has alt text', alts === 0, `${alts} missing`);

  // Scroll everything into view so lazy images load, then check them.
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(800);
  // Off-screen rail slides stay lazy on purpose; check every source is served.
  const sources = await page.$$eval('main img', (imgs) =>
    [...new Set(imgs.flatMap((img) => [img.src, ...img.srcset.split(',').map((part) => part.trim().split(' ')[0]).filter(Boolean)]))],
  );
  const missing = [];
  for (const source of sources) {
    const response = await page.request.get(new URL(source, base).href);
    if (!response.ok()) missing.push(source);
  }
  record(`images: all ${sources.length} sources and variants served`, missing.length === 0, missing.join(', '));
  const decoded = await page.$$eval('#la-7e img, #localisation img, #projet img', (imgs) => imgs.every((img) => img.complete && img.naturalWidth > 0));
  record('images: hero, reveal and map decoded', decoded);
  for (const asset of ['/media/honest-7/facade-jour-640.webp', '/media/honest-7/facade-nuit-1600.webp', '/img/honest006.webp']) {
    const response = await page.request.get(`${base}${asset}`);
    record(`images: ${asset} served`, response.ok());
  }

  record('content: proof title', await page.getByRole('heading', { name: /Avant la 7e, il y en a eu 6\./ }).isVisible());
  record('content: 4 delivered residences, real names', (await page.locator('#realisations figure').count()) === 4);
  record('content: project facts', (await page.locator('#projet dd').allInnerTexts()).join('|').replace(/ /g, ' ') === '51–140 m²|À partir de 1 390 000 MAD|27 000 DH / m²|Juin 2028');
  record('content: 1 minute à pied du Plaza', (await page.locator('#localisation').innerText()).includes('minute à pied'));
  record('content: all 7 amenities listed', (await page.locator('#art-de-vivre ul').last().locator('li').count()) === 7);
  const plan = (await page.locator('#paiement ol').innerText()).replace(/\s+/g, ' ');
  record('content: payment plan untouched', /30 % À la réservation/.test(plan) && /15 % Tous les 6 mois × 3/.test(plan) && /25 % À la remise des clés/.test(plan), plan);
  record('content: no "crédit"/"financement" wording', !/crédit|financement|garanti|rendement/i.test(await page.locator('main').innerText()));
  record('content: 3D tour links to the live tour', (await page.locator('#appartements a[href*="vertex-france.com"]').getAttribute('target')) === '_blank');

  const vc = await events(page);
  record('tracking: ViewContent fired once (standard)', vc.filter((e) => e === 'track:ViewContent').length === 1, vc.join(', '));
  const vcParams = await page.evaluate(() => window.__fbqEvents.find((a) => a[1] === 'ViewContent')?.[2]);
  record(
    'tracking: ViewContent parameters',
    vcParams?.content_name === 'Honest Signature 7 - 6 residences' && vcParams?.content_category === 'Real Estate' && vcParams?.page_type === 'meta_landing_page' && vcParams?.project === 'Honest Signature 7',
    JSON.stringify(vcParams),
  );
  record('tracking: pixel initialised once, dataset 1049553054304565', vc.filter((e) => e.startsWith('init:')).length === 1 && vc.includes('init:1049553054304565'));
  record('tracking: exactly one PageView on load', vc.filter((e) => e === 'track:PageView').length === 1);
  const storageKeys = await page.evaluate(() => Object.keys(sessionStorage));
  record('isolation: simulator storage untouched', !storageKeys.includes('emara_simulator_attribution') && storageKeys.includes('emara_hs7_landing_attribution'), storageKeys.join(', '));
  await page.evaluate(() => {
    const link = document.querySelector('a[href^="https://wa.me"]');
    link?.addEventListener('click', (event) => event.preventDefault(), { once: true });
    link?.click();
  });
  record('tracking: WhatsApp click → Contact (standard)', (await events(page)).includes('track:Contact'));

  const primaryCtas = await page.locator('main a[href="#dossier"]', { hasText: 'Recevoir le dossier' }).count();
  record('cta: primary repeated ≥ 5 times', primaryCtas >= 5, String(primaryCtas));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('#paiement a[href="#dossier"]').click();
  await page.waitForFunction(() => {
    const top = document.getElementById('dossier').getBoundingClientRect().top;
    return Math.abs(top) < 120;
  }, null, { timeout: 5000 }).catch(() => {});
  const formTop = await page.locator('#dossier').evaluate((el) => el.getBoundingClientRect().top);
  record('cta: scrolls to the form', Math.abs(formTop) < 120, String(Math.round(formTop)));

  record('console: no page errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

/* ── Mobile widths: fold, overflow, sticky CTA ──────────────────────────── */
for (const width of [375, 390, 430]) {
  const { context, page } = await open({ width, height: width === 375 ? 667 : 844, isMobile: true, hasTouch: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  record(`${width}px: no horizontal overflow`, overflow <= 0, String(overflow));
  const cta = await page.locator('#la-7e a[href="#dossier"]').boundingBox();
  const vh = page.viewportSize().height;
  record(`${width}px: hero CTA inside first viewport`, cta && cta.y + cta.height <= vh, cta ? `bottom ${Math.round(cta.y + cta.height)} / ${vh}` : 'missing');
  const smallText = await page.$$eval('main p, main li, main dd, main a, main button, main label', (nodes) =>
    nodes.filter((n) => n.offsetParent && parseFloat(getComputedStyle(n).fontSize) < 13).length,
  );
  record(`${width}px: no text under 13px`, smallText === 0, String(smallText));

  const sticky = page.locator('[data-sticky-cta]');
  record(`${width}px: sticky hidden on the hero`, (await sticky.getAttribute('aria-hidden')) === 'true');
  await page.evaluate(() => document.getElementById('paiement').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(400);
  record(`${width}px: sticky shown mid-page`, (await sticky.getAttribute('aria-hidden')) === 'false');
  await page.evaluate(() => document.getElementById('dossier').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(400);
  record(`${width}px: sticky hidden at the form`, (await sticky.getAttribute('aria-hidden')) === 'true');
  await context.close();
}

/* ── Form: validation, payload, success-only Lead ──────────────────────── */
{
  const { context, page } = await open({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.evaluate(() => document.getElementById('dossier').scrollIntoView({ behavior: 'instant' }));
  await page.getByRole('button', { name: 'Continuer' }).click();
  record('form: step 1 requires both answers', (await page.getByText('Choisissez le type de projet qui vous correspond.').isVisible()) && (await page.getByText('Choisissez une fourchette de budget.').isVisible()));
  record('tracking: LeadFormStarted fired', (await events(page)).includes('trackCustom:LeadFormStarted'));

  await completeStep1(page);
  record('form: step 2 shows the step-1 summary', (await page.locator('#dossier').innerText()).includes('Investir'));
  record('tracking: step 1 → LeadFormStepCompleted', (await events(page)).includes('trackCustom:LeadFormStepCompleted'));
  record('tracking: no Lead before submit', !(await events(page)).includes('track:Lead'));

  await stubContact(page, { delay: 400 });
  await page.getByRole('button', { name: 'Recevoir les plans, prix & disponibilités' }).click();
  record('form: step 2 validates locally (nothing sent)', (await page.evaluate(() => window.__requests.length)) === 0);

  await fillStep2(page);
  // contact.php silently drops submissions faster than 3 s.
  await page.waitForTimeout(3100);
  const submit = page.locator('#dossier button[type="submit"]');
  await submit.click();
  await submit.click({ force: true }).catch(() => {});
  await page.getByText('Votre demande a bien été envoyée.').waitFor();
  const requests = await page.evaluate(() => window.__requests);
  record('form: exactly one request on double click', requests.length === 1, String(requests.length));
  const body = requests[0].body;
  const expected = {
    form_type: 'honest_signature_7_request',
    nom_complet: 'Client Test',
    email: 'client@example.com',
    budget: '1,6 M – 2 M MAD',
    first_name: 'Client',
    last_name: 'Test',
    purchase_intent: 'Investissement',
    project: 'Honest Signature 7',
    lead_origin: 'Meta Landing Page',
    landing_name: '6 residences livrees',
    source: 'Meta Ads',
    utm_source: 'facebook',
    utm_medium: 'paid_social',
    utm_campaign: 'hs7-test',
    utm_content: '',
    utm_term: '',
    projectName: 'Honest Signature 7',
    leadSource: 'Landing Honest Signature 7',
    currency: 'MAD',
    utmSource: 'facebook',
    utmCampaign: 'hs7-test',
    campaign: 'hs7-test',
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
  record('payload: phone split', body.telephone.endsWith('612345678') && body.phoneCode === body.telephone.slice(0, body.phoneCode.length));
  record('payload: purpose + budget in message', body.message === 'Demande : plans, prix & disponibilités — Projet : Investissement — Budget : 1,6 M – 2 M MAD', body.message);
  record('payload: budget fits contact.php (30 chars)', body.budget.length <= 30);
  record('payload: elapsed_ms ≥ 3000', body.elapsed_ms >= 3000, String(body.elapsed_ms));
  record('payload: landing URL keeps the UTMs', body.landingPageUrl.includes('utm_campaign=hs7-test'));
  record('payload: landing_page is the current URL', body.landing_page.includes('/honest-signature-7/') && body.landing_page.includes('fbclid=click-4'), body.landing_page);
  const after = await events(page);
  record('isolation: SimulatorReveal never fires', !after.some((e) => e.includes('SimulatorReveal')));
  record('tracking: no CRM-stage events from the browser', !after.some((e) => /initial_lead|qualifiedlead/i.test(e)));
  record('tracking: Lead exactly once after success', after.filter((e) => e === 'track:Lead').length === 1, after.join(', '));
  await context.close();
}

/* ── Form: server error keeps the visitor on step 2, no Lead ────────────── */
{
  const { context, page } = await open({ width: 1440, height: 900 });
  await page.locator('#prix a[href="#dossier"]').click();
  await completeStep1(page);
  await fillStep2(page);
  await stubContact(page, { status: 500, body: { message: 'Erreur serveur.' } });
  await page.waitForTimeout(3100);
  await page.locator('#dossier button[type="submit"]').click();
  await page.getByText('Une erreur est survenue. Veuillez réessayer.').waitFor();
  record('form: error message shown, no success state', (await page.getByText('Votre demande a bien été envoyée.').count()) === 0);
  record('tracking: no Lead on server error', !(await events(page)).includes('track:Lead'));
  record('form: entered data kept for retry', (await page.inputValue('#hs7-email')) === 'client@example.com' && !(await page.locator('#dossier button[type="submit"]').isDisabled()));
  await stubContact(page);
  await page.locator('#dossier button[type="submit"]').click();
  await page.getByText('Votre demande a bien été envoyée.').waitFor();
  record('form: retry succeeds with the same data', (await page.evaluate(() => window.__requests[0].body.email)) === 'client@example.com');
  record('tracking: Lead fires after the successful retry', (await events(page)).includes('track:Lead'));
  await context.close();
}

/* ── "Organiser une visite" pre-ticks the visit box ─────────────────────── */
{
  const { context, page } = await open({ width: 1440, height: 900 });
  await page.locator('#realisations a', { hasText: 'Organiser une visite' }).click();
  await completeStep1(page);
  const box = page.getByLabel('Je souhaite aussi organiser une visite');
  record('visit: checkbox appears pre-ticked', await box.isChecked());
  await fillStep2(page);
  await stubContact(page);
  await page.waitForTimeout(3100);
  await page.locator('#dossier button[type="submit"]').click();
  await page.getByText('Votre demande a bien été envoyée.').waitFor();
  const message = await page.evaluate(() => window.__requests[0].body.message);
  record('visit: request carried in message', message.endsWith('Souhaite aussi organiser une visite'), message);
  await context.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n  ${results.length - failed.length}/${results.length} passed\n`);
process.exit(failed.length ? 1 : 0);
