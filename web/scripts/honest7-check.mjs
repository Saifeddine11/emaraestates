import { chromium } from 'playwright';
import { startServer } from './lib/serve.mjs';

/**
 * /honest-signature-7/ behaviour checks: SEO tags, the three ad-angle heroes
 * and their selection rules, the first mobile viewport (hook, Plaza line,
 * facts and CTA visible, CTA clear of the WhatsApp float), the CTA → drawer
 * flow, both form steps, the /contact.php payload contract, attribution,
 * the funnel events (ViewContent → CTA_Click → LeadFormStarted →
 * LeadQualificationCompleted → Lead, success-only), error handling and
 * isolation from the simulator funnel.
 */

const { server, base } = await startServer();
const browser = await chromium.launch();
const results = [];
const URL_PATH = '/honest-signature-7/';
const QUERY =
  '?utm_source=facebook&utm_medium=paid_social&utm_campaign=hs7-test&utm_content=creative-a&utm_term=term-5&campaign_id=cmp-1&adset_id=set-2&ad_id=ad-3&fbclid=click-4&landing_angle=payment';
const CTA = 'Voir les lots disponibles';
const H1 = {
  proof: '6 résidences déjà livrées. La 7e prend forme à Guéliz.',
  price: '2 500 €/m² au cœur de Guéliz.',
  payment: '30 % à la réservation.',
};

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const MOBILE = (width, height) => ({ width, height, isMobile: true, hasTouch: true });
const DESKTOP = { width: 1440, height: 900 };

async function open(viewport, query = QUERY, { context: existing } = {}) {
  const context =
    existing ??
    (await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
    }));
  if (!existing) {
    await context.addCookies([
      { name: '_fbc', value: 'fb.1.test-click', url: base },
      { name: '_fbp', value: 'fb.1.test-browser', url: base },
    ]);
    // Record pixel calls from the very first script, so ViewContent is caught.
    await context.addInitScript(() => {
      window.__fbqEvents = [];
      window.fbq = (...args) => window.__fbqEvents.push(args);
    });
    await context.route('**/*', (route) => {
      const host = new URL(route.request().url()).hostname;
      if (/facebook|snapchat|sc-static|ahrefs|country\.is|vertex-france/.test(host)) return route.abort();
      return route.continue();
    });
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/ERR_FAILED/.test(message.text())) errors.push(message.text());
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

const events = (page) => page.evaluate(() => window.__fbqEvents.map((args) => `${args[0]}:${args[1]}`));
const eventArgs = (page, name) => page.evaluate((n) => window.__fbqEvents.filter((a) => a[1] === n), name);
const h1Text = async (page) => (await page.locator('h1').innerText()).replace(/\s+/g, ' ').trim();
const drawer = (page) => page.locator('#hs7-lead-drawer');
const isDrawerOpen = (page) => page.evaluate(() => document.getElementById('hs7-lead-drawer').open);

async function openDrawer(page, selector = '#la-7e [data-cta="hero"]') {
  await page.locator(selector).click();
  await page.waitForFunction(() => document.getElementById('hs7-lead-drawer').open);
}

async function completeStep1(scope, type = 'Appartement 1 chambre', budget = '1,6 M – 2 M MAD') {
  await scope.locator('label', { hasText: new RegExp(`^${type}$`) }).click();
  await scope.locator('label', { hasText: budget }).click();
  await scope.getByRole('button', { name: 'Continuer' }).click();
  await scope.locator('input[name="nom_complet"]').waitFor();
}

async function fillStep2(scope) {
  await scope.locator('input[name="nom_complet"]').fill('Client Test');
  await scope.locator('input[type="tel"]').fill('612345678');
  await scope.locator('input[name="email"]').fill('client@example.com');
}

const intersects = (a, b) => a && b && a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

console.log('\nHONEST SIGNATURE 7 CHECK\n');

/* ── Desktop: SEO, hero, images, chrome, content ────────────────────────── */
{
  const { context, page, errors } = await open(DESKTOP, '');
  const seo = await page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content,
    canonical: [...document.querySelectorAll('link[rel="canonical"]')].map((l) => l.href),
    ogUrl: document.querySelector('meta[property="og:url"]')?.content,
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
    robots: document.querySelector('meta[name="robots"]')?.content,
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
    preloads: [...document.querySelectorAll('link[rel="preload"][as="image"]')].map((l) => l.getAttribute('imagesrcset') || l.href),
    h1Count: document.querySelectorAll('h1').length,
  }));
  record('seo: title', seo.title === 'Honest Signature 7 à Guéliz, Marrakech | Emara Estates', seo.title);
  record('seo: description mentions price & delivery', /1 390 000 MAD/.test(seo.description) && /juin 2028/.test(seo.description));
  record('seo: single slashed canonical', seo.canonical.length === 1 && seo.canonical[0] === 'https://emaraestates.com/honest-signature-7/', seo.canonical.join(', '));
  record('seo: og:url', seo.ogUrl === 'https://emaraestates.com/honest-signature-7/');
  record('seo: og:image', seo.ogImage === 'https://emaraestates.com/img/og-honest-signature-7.jpg', seo.ogImage);
  record('seo: indexable', /index/.test(seo.robots || '') && !/noindex/.test(seo.robots || ''), seo.robots);
  record('seo: WebPage + Breadcrumb JSON-LD', seo.jsonLd.some((s) => s.includes('honest-signature-7/') && s.includes('BreadcrumbList')));
  const heroPreloads = seo.preloads.filter((p) => /facade|honest006/.test(p));
  record('perf: exactly one hero image preloaded, with srcset', heroPreloads.length === 1 && heroPreloads[0].includes('facade-jour-640.webp'), seo.preloads.join(' | '));
  record('perf: no video on the page', (await page.locator('main video').count()) === 0);
  record('a11y: exactly one h1', seo.h1Count === 1);

  record('hero: default (no angle) = proof headline', (await h1Text(page)) === H1.proof, await h1Text(page));
  record('hero: eyebrow names the project', await page.getByText('Honest Signature 7 · Guéliz', { exact: true }).first().isVisible());
  record('hero: Plaza line', await page.locator('#la-7e').getByText('À 1 minute à pied du Plaza.').isVisible());
  record('hero: proof facts', (await page.locator('#la-7e ul:visible li').allInnerTexts()).join('|') === 'Dès 51 m²|Dès 1,39 M MAD|Livraison juin 2028');
  const heroCta = page.locator('#la-7e [data-cta="hero"]');
  record('hero: primary CTA', (await heroCta.innerText()).trim().toLowerCase() === CTA.toLowerCase() && (await heroCta.getAttribute('href')) === '#dossier');
  record('hero: CTA microcopy', await page.locator('#la-7e').getByText('Plans · prix · disponibilités actuelles').isVisible());
  record('hero: "7e" highlighted in Emara green', await page.locator('#la-7e h1 .text-olive').isVisible());
  record('hero: no intro curtain', (await page.locator('.z-9999.bg-forest').count()) === 0);
  record('chrome: site header + footer kept', (await page.locator('nav#nav').count()) === 1 && (await page.locator('footer').count()) >= 1);

  const heroImg = await page.locator('#la-7e img').evaluate((img) => ({
    eager: img.loading === 'eager',
    priority: img.getAttribute('fetchpriority'),
    current: img.currentSrc,
    complete: img.complete && img.naturalWidth > 0,
  }));
  record('hero: image eager + high priority + loaded', heroImg.eager && heroImg.priority === 'high' && heroImg.complete, heroImg.current);
  const lazy = await page.$$eval('main img', (imgs) => imgs.slice(1).every((img) => img.loading === 'lazy'));
  record('perf: every image below the hero is lazy', lazy);
  const alts = await page.$$eval('main img', (imgs) => imgs.filter((img) => !img.alt).length);
  record('a11y: every content image has alt text', alts === 0, `${alts} missing`);

  const order = await page.$$eval('main > section, main > dialog', (nodes) => nodes.map((n) => n.id || n.getAttribute('aria-label') || n.tagName));
  const expectedOrder = ['la-7e', 'Honest Signature 7 en bref', 'disponibilites', 'realisations', 'projet', 'paiement', 'localisation', 'art-de-vivre', 'appartements', 'dossier'];
  record('structure: section order', expectedOrder.every((id, i) => order[i] === id), order.join(' → '));

  const trust = await page.locator('section[aria-label="Honest Signature 7 en bref"] li').allInnerTexts();
  record('trust bar: 4 verified items', trust.join('|') === '6 résidences déjà livrées|1 min du Plaza|51–140 m²|30 % à la réservation', trust.join('|'));

  const availability = page.locator('#disponibilites');
  record('availability: title + supporting line', (await availability.getByRole('heading', { name: 'Disponibilités actuelles' }).isVisible()) && (await availability.getByText('La disponibilité évolue au rythme des réservations.').isVisible()));
  const rows = await availability.locator('li').allInnerTexts();
  record('availability: Studios / 1 chambre / 2 chambres rows', rows.map((r) => r.split('\n')[0].trim()).join('|') === 'Studios|1 chambre|2 chambres', rows.join(' | ').replace(/\s+/g, ' '));
  record('availability: no invented lot counts', !/\b\d+\s*(lots?|restants?|disponibles?)\b/i.test(await availability.innerText()));
  record('availability: grid CTA', await availability.locator('[data-cta="availability_grid"]', { hasText: 'Recevoir la grille actualisée' }).isVisible());

  // Scroll everything into view so lazy images load, then check them.
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(600);
  const sources = await page.$$eval('main img', (imgs) =>
    [...new Set(imgs.flatMap((img) => [img.src, ...img.srcset.split(',').map((part) => part.trim().split(' ')[0]).filter(Boolean)]))],
  );
  const missing = [];
  for (const source of sources) {
    const response = await page.request.get(new URL(source, base).href);
    if (!response.ok()) missing.push(source);
  }
  record(`images: all ${sources.length} sources and variants served`, missing.length === 0, missing.join(', '));

  record('proof: headline', (await page.locator('#proof-title').innerText()).replace(/\s+/g, ' ').trim() === H1.proof);
  record('proof: only the 4 verified residences pictured', (await page.locator('#realisations figure').count()) === 4);
  record('proof: caption says which ones are pictured', await page.getByText('Photographies réelles des résidences Honest 1 à 4.').isVisible());
  record('project: MAD price + price per m²', (await page.locator('#projet').innerText()).replace(/\s/g, ' ').includes('1 390 000 MAD') && (await page.locator('#projet').innerText()).includes('27 000 DH / m²'));
  record('project: surfaces + delivery', (await page.locator('#projet dd').allInnerTexts()).join('|') === '51–140 m²|Juin 2028');
  const plan = (await page.locator('#paiement ol').innerText()).replace(/\s+/g, ' ');
  record('payment: 30 / 15 × 3 / 25', /30 % À la réservation/.test(plan) && /15 % Tous les 6 mois × 3/.test(plan) && /25 % À la remise des clés/.test(plan), plan);
  record('payment: delivery + CTA', (await page.locator('#paiement').innerText()).includes('juin 2028') && (await page.locator('#paiement [data-cta="payment"]').count()) === 1);
  const location = await page.locator('#localisation').innerText();
  record('location: Plaza + the 3 verified context lines only', location.includes('minute à pied') && ['Carré Eden à proximité', 'Cafés & restaurants', 'Boutiques & services'].every((l) => location.includes(l)) && (await page.locator('#localisation li').count()) === 3);
  record('amenities: all 7 listed, no carousel', (await page.locator('#art-de-vivre ul[aria-label] li').count()) === 7 && (await page.locator('#art-de-vivre [aria-roledescription="carousel"], #art-de-vivre button').count()) === 0);
  record('apartments: gallery + CTA after it', (await page.getByRole('heading', { name: 'Découvrez les appartements.' }).isVisible()) && (await page.locator('#appartements [data-cta="apartments"]').count()) === 1);
  record('content: no "crédit"/"financement"/countdown wording', !/crédit|financement|garanti|rendement|plus que \d|compte à rebours/i.test(await page.locator('main').innerText()));
  record('content: 3D tour opens in a new tab', (await page.locator('#appartements a[href*="vertex-france.com"]').getAttribute('target')) === '_blank');

  const vc = await eventArgs(page, 'ViewContent');
  record('tracking: ViewContent fired once (standard)', vc.length === 1 && vc[0][0] === 'track');
  record(
    'tracking: ViewContent parameters',
    vc[0]?.[2]?.project === 'Honest Signature 7' && vc[0]?.[2]?.landing_angle === 'proof' && vc[0]?.[2]?.content_name === 'Honest Signature 7 - 6 residences' && !('utm_campaign' in vc[0][2]),
    JSON.stringify(vc[0]?.[2]),
  );
  const all = await events(page);
  record('tracking: pixel initialised once, dataset 1049553054304565', all.filter((e) => e.startsWith('init:')).length === 1 && all.includes('init:1049553054304565'));
  record('tracking: exactly one PageView on load', all.filter((e) => e === 'track:PageView').length === 1);
  const storageKeys = await page.evaluate(() => Object.keys(sessionStorage));
  record('isolation: simulator storage untouched', !storageKeys.includes('emara_simulator_attribution') && storageKeys.includes('emara_hs7_landing_attribution'), storageKeys.join(', '));
  await page.evaluate(() => {
    const link = document.querySelector('a[href^="https://wa.me"]');
    link?.addEventListener('click', (event) => event.preventDefault(), { once: true });
    link?.click();
  });
  const contact = await eventArgs(page, 'Contact');
  record('tracking: WhatsApp click → Contact with project + angle', contact.length === 1 && contact[0][2].landing_angle === 'proof');

  /* CTA → drawer (desktop: centred modal). */
  const ctaCount = await page.locator('main [data-cta]').count();
  record('cta: every section CTA opens the drawer (≥ 8 entry points)', ctaCount >= 8, String(ctaCount));
  await page.evaluate(() => window.scrollTo(0, 0));
  await openDrawer(page);
  const box = await drawer(page).boundingBox();
  record('drawer: desktop = centred modal', box && Math.abs(box.x + box.width / 2 - 720) < 4 && box.width <= 560 && box.y > 0 && box.y + box.height < 900, JSON.stringify(box));
  record('drawer: step 1 question visible', await drawer(page).getByText('Quels appartements vous intéressent ?').isVisible());
  const cta = await eventArgs(page, 'CTA_Click');
  record('tracking: CTA_Click (custom) with location + angle', cta.length === 1 && cta[0][0] === 'trackCustom' && cta[0][2].cta_location === 'hero' && cta[0][2].landing_angle === 'proof' && cta[0][2].project === 'Honest Signature 7', JSON.stringify(cta[0]?.[2]));
  record('tracking: opening the drawer is not LeadFormStarted', !(await events(page)).includes('trackCustom:LeadFormStarted'));
  record('drawer: page scroll locked', (await page.evaluate(() => document.documentElement.style.overflow)) === 'hidden');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  record('drawer: Escape closes it and unlocks scroll', !(await isDrawerOpen(page)) && (await page.evaluate(() => document.documentElement.style.overflow)) === '');
  await openDrawer(page);
  await page.mouse.click(40, 450);
  await page.waitForTimeout(200);
  record('drawer: backdrop click closes it', !(await isDrawerOpen(page)));
  await openDrawer(page, '#disponibilites [data-cta="availability_studio"]');
  record('availability: row pre-selects the type in the drawer', await drawer(page).locator('input[value="Studio"]').isChecked());
  record('tracking: row click → CTA_Click with property_type', (await eventArgs(page, 'CTA_Click')).at(-1)[2].property_type === 'Studio');
  record('tracking: pre-selection is not LeadFormStarted', !(await events(page)).includes('trackCustom:LeadFormStarted'));
  await drawer(page).getByRole('button', { name: 'Fermer' }).click();

  record('console: no page errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

/* ── Landing angle selection ────────────────────────────────────────────── */
for (const [query, angle] of [
  ['?landing_angle=price', 'price'],
  ['?landing_angle=payment', 'payment'],
  ['?landing_angle=proof', 'proof'],
  ['', 'proof'],
  ['?landing_angle=unknown', 'proof'],
  ['?utm_content=hs7_prix_static', 'price'],
  ['?utm_content=paiement-30', 'payment'],
  ['?utm_content=prix-paiement', 'proof'],
  ['?landing_angle=price&utm_content=paiement', 'price'],
]) {
  const { context, page, errors } = await open(MOBILE(390, 844), query);
  const text = await h1Text(page);
  const visibleVariants = await page.$$eval('#la-7e [data-hs7-variant]', (nodes) =>
    [...new Set(nodes.filter((n) => getComputedStyle(n).display !== 'none').map((n) => n.dataset.hs7Variant))],
  );
  const vc = (await eventArgs(page, 'ViewContent'))[0]?.[2];
  record(`angle ${query || '(none)'} → ${angle}: headline`, text === H1[angle], text);
  record(`angle ${query || '(none)'} → ${angle}: one variant shown, events agree`, visibleVariants.every((v) => v.split(' ').includes(angle)) && vc?.landing_angle === angle && (await page.locator('#la-7e').getAttribute('data-angle')) === angle, `${visibleVariants.join(',')} / ${vc?.landing_angle}`);
  if (angle === 'price') {
    record(`angle ${query} → price: facts`, (await page.locator('#la-7e ul:visible li').allInnerTexts()).join('|') === 'Dès 51 m²|30 % à la réservation|Livraison juin 2028');
  }
  if (angle === 'payment') {
    const hero = await page.locator('#la-7e').innerText();
    record(`angle ${query} → payment: secondary line + facts`, hero.includes('Le reste réparti jusqu’à la remise des clés.') && (await page.locator('#la-7e ul:visible li').allInnerTexts()).join('|') === '15 % tous les 6 mois × 3|25 % à la remise des clés|Livraison juin 2028');
  }
  record(`angle ${query || '(none)'}: no hydration or page errors`, errors.length === 0, errors.join(' | '));
  await context.close();
}
{
  // The angle survives an in-session reload without the parameter.
  const { context, page } = await open(MOBILE(390, 844), '?landing_angle=price&utm_campaign=c1');
  await page.goto(`${base}${URL_PATH}`);
  record('angle: kept for the session after the URL loses it', (await h1Text(page)) === H1.price);
  await context.close();
}

/* ── Mobile first viewport, overflow, sticky CTA ───────────────────────── */
for (const [width, height] of [
  [375, 812],
  [390, 844],
  [430, 932],
]) {
  for (const angle of ['proof', 'price', 'payment']) {
    const { context, page } = await open(MOBILE(width, height), `?landing_angle=${angle}`);
    const wa = await page.locator('a[aria-label="Contacter sur WhatsApp"]').boundingBox();
    const box = async (locator) => locator.boundingBox();
    const inView = (b) => b && b.y >= 0 && b.y + b.height <= height && b.x >= 0 && b.x + b.width <= width;
    const cta = await box(page.locator('#la-7e [data-cta="hero"]'));
    const h1 = await box(page.locator('h1'));
    const plaza = await box(page.locator('#la-7e').getByText('À 1 minute à pied du Plaza.'));
    const facts = await box(page.locator('#la-7e ul:visible'));
    const eyebrow = await box(page.locator('#la-7e p').first());
    const all = [cta, h1, plaza, facts, eyebrow].every(inView);
    record(`${width}×${height} ${angle}: project, hook, Plaza, facts, CTA all in the first viewport`, all, `cta bottom ${Math.round(cta.y + cta.height)} / ${height}`);
    record(`${width}×${height} ${angle}: hero CTA clear of WhatsApp float`, !intersects(cta, wa) && cta.y + cta.height < height - 96, `cta ${Math.round(cta.y + cta.height)}, wa top ${Math.round(wa.y)}`);
    if (angle === 'proof') {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      record(`${width}px: no horizontal overflow`, overflow <= 0, String(overflow));
      const smallText = await page.$$eval('main p, main li, main dd, main a, main button, main label', (nodes) =>
        nodes.filter((n) => n.offsetParent && parseFloat(getComputedStyle(n).fontSize) < 13).length,
      );
      record(`${width}px: no text under 13px`, smallText === 0, String(smallText));
      const heroImage = await box(page.locator('#la-7e img'));
      record(`${width}px: building visible in the first viewport (≥ 220px tall)`, heroImage && heroImage.height >= 220, String(Math.round(heroImage?.height)));

      const sticky = page.locator('[data-sticky-cta]');
      record(`${width}px: sticky hidden on the hero`, (await sticky.getAttribute('aria-hidden')) === 'true');
      await page.evaluate(() => document.getElementById('localisation').scrollIntoView({ behavior: 'instant' }));
      await page.waitForTimeout(400);
      record(`${width}px: sticky shown mid-page`, (await sticky.getAttribute('aria-hidden')) === 'false');
      const stickyBox = await sticky.boundingBox();
      record(`${width}px: sticky CTA clear of WhatsApp float`, !intersects(stickyBox, wa), JSON.stringify({ sticky: stickyBox, wa }));
      record(`${width}px: sticky label on one line`, (await sticky.locator('a').evaluate((a) => a.getBoundingClientRect().height)) <= 60);
      await page.evaluate(() => document.querySelector('[data-cta="payment"]').scrollIntoView({ block: 'end', behavior: 'instant' }));
      await page.waitForTimeout(400);
      record(`${width}px: sticky steps aside for an in-page CTA`, (await sticky.getAttribute('aria-hidden')) === 'true');
      await page.evaluate(() => document.getElementById('dossier').scrollIntoView({ behavior: 'instant' }));
      await page.waitForTimeout(400);
      record(`${width}px: sticky hidden at the form`, (await sticky.getAttribute('aria-hidden')) === 'true');

      await page.evaluate(() => window.scrollTo(0, 0));
      await openDrawer(page);
      await page.waitForTimeout(500);
      const sheet = await drawer(page).boundingBox();
      record(`${width}px: drawer is a bottom sheet`, sheet && Math.abs(sheet.y + sheet.height - height) < 2 && Math.round(sheet.width) === width, JSON.stringify(sheet));
      const cont = await box(drawer(page).getByRole('button', { name: 'Continuer' }));
      record(`${width}px: step 1 fits — Continuer visible without scrolling`, inView(cont), JSON.stringify(cont));
      record(`${width}px: drawer above the WhatsApp float (top layer)`, await page.evaluate(() => {
        const wa = document.querySelector('a[aria-label="Contacter sur WhatsApp"]').getBoundingClientRect();
        const hit = document.elementFromPoint(wa.x + wa.width / 2, wa.y + wa.height / 2);
        return Boolean(hit?.closest('#hs7-lead-drawer'));
      }));
    }
    await context.close();
  }
}

/* ── Drawer form: validation, payload, success-only Lead ───────────────── */
{
  const { context, page } = await open(MOBILE(390, 844));
  await openDrawer(page);
  const sheet = drawer(page);
  await sheet.getByRole('button', { name: 'Continuer' }).click();
  record('form: step 1 requires both answers', (await sheet.getByText('Choisissez un type d’appartement.').isVisible()) && (await sheet.getByText('Choisissez une fourchette de budget.').isVisible()));
  const started = await eventArgs(page, 'LeadFormStarted');
  record('tracking: LeadFormStarted on first real interaction, with angle + UTMs', started.length === 1 && started[0][2].landing_angle === 'payment' && started[0][2].utm_campaign === 'hs7-test' && started[0][2].utm_content === 'creative-a', JSON.stringify(started[0]?.[2]));
  record('form: step 1 options', (await sheet.locator('input[name="property_type"]').evaluateAll((i) => i.map((x) => x.value))).join('|') === 'Studio|Appartement 1 chambre|Appartement 2 chambres');
  record('form: budget options', (await sheet.locator('input[name="budget_range"]').evaluateAll((i) => i.map((x) => x.value))).join('|') === '1,39 M – 1,6 M MAD|1,6 M – 2 M MAD|2 M – 2,5 M MAD|Plus de 2,5 M MAD');

  await completeStep1(sheet);
  record('form: step 2 headline', await sheet.getByText('Où devons-nous vous envoyer les disponibilités ?').isVisible());
  record('form: step 2 shows the step-1 summary', (await sheet.innerText()).includes('Appartement 1 chambre') && (await sheet.innerText()).includes('1,6 M – 2 M MAD'));
  record('form: step 2 fields = Nom complet, Téléphone / WhatsApp, E-mail', (await sheet.locator('label').allInnerTexts()).filter((l) => /nom|t[ée]l[ée]phone|e-mail/i.test(l)).map((l) => l.trim().toLowerCase()).join('|') === 'nom complet|téléphone / whatsapp|e-mail');
  const qualified = await eventArgs(page, 'LeadQualificationCompleted');
  record('tracking: LeadQualificationCompleted once, with type + budget', qualified.length === 1 && qualified[0][0] === 'trackCustom' && qualified[0][2].property_type === 'Appartement 1 chambre' && qualified[0][2].budget_range === '1,6 M – 2 M MAD' && qualified[0][2].landing_angle === 'payment', JSON.stringify(qualified[0]?.[2]));
  await sheet.getByRole('button', { name: 'Modifier' }).click();
  await sheet.getByRole('button', { name: 'Continuer' }).click();
  record('tracking: LeadQualificationCompleted not repeated after "Modifier"', (await eventArgs(page, 'LeadQualificationCompleted')).length === 1);
  record('tracking: no Lead before submit', !(await events(page)).includes('track:Lead'));

  await stubContact(page, { delay: 400 });
  await sheet.getByRole('button', { name: 'Recevoir les plans & disponibilités' }).click();
  record('form: step 2 validates locally (nothing sent)', (await page.evaluate(() => window.__requests.length)) === 0 && (await sheet.getByText('Indiquez votre nom complet.').isVisible()));
  await sheet.locator('input[name="email"]').fill('pas-un-email');
  await sheet.getByRole('button', { name: 'Recevoir les plans & disponibilités' }).click();
  record('form: invalid e-mail rejected', await sheet.getByText('Indiquez une adresse e-mail valide.').isVisible());

  await fillStep2(sheet);
  // contact.php silently drops submissions faster than 3 s.
  await page.waitForTimeout(3100);
  const submit = sheet.locator('button[type="submit"]');
  await submit.click();
  await submit.click({ force: true }).catch(() => {});
  await sheet.getByText('Votre demande a bien été envoyée.').waitFor();
  const requests = await page.evaluate(() => window.__requests);
  record('form: exactly one request on double click', requests.length === 1, String(requests.length));
  const body = requests[0].body;
  const expected = {
    form_type: 'honest_signature_7_request',
    nom_complet: 'Client Test',
    full_name: 'Client Test',
    first_name: 'Client',
    last_name: 'Test',
    email: 'client@example.com',
    property_type: 'Appartement 1 chambre',
    propertyType: 'Appartement 1 chambre',
    budget: '1,6 M – 2 M MAD',
    budget_range: '1,6 M – 2 M MAD',
    project: 'Honest Signature 7',
    projectName: 'Honest Signature 7',
    lead_origin: 'Meta Landing Page',
    landing_angle: 'payment',
    landing_name: '30 pourcent reservation',
    source: 'Meta Ads',
    leadSource: 'Landing Honest Signature 7',
    currency: 'MAD',
    utm_source: 'facebook',
    utm_medium: 'paid_social',
    utm_campaign: 'hs7-test',
    utm_content: 'creative-a',
    utm_term: 'term-5',
    utmSource: 'facebook',
    utmMedium: 'paid_social',
    utmCampaign: 'hs7-test',
    utmContent: 'creative-a',
    utmTerm: 'term-5',
    campaign: 'hs7-test',
    campaign_id: 'cmp-1',
    adset_id: 'set-2',
    ad_id: 'ad-3',
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
  record('payload: contract fields (existing + new keys)', mismatched.length === 0, mismatched.join(', '));
  record('payload: phone / telephone / phoneFull agree', body.telephone.endsWith('612345678') && body.phone === body.telephone && body.phoneFull === body.telephone && body.phoneCode === body.telephone.slice(0, body.phoneCode.length));
  record('payload: type + budget in message', body.message === 'Demande : plans, prix & disponibilités — Type : Appartement 1 chambre — Budget : 1,6 M – 2 M MAD', body.message);
  record('payload: budget fits contact.php (30 chars)', body.budget.length <= 30);
  record('payload: elapsed_ms ≥ 3000', body.elapsed_ms >= 3000, String(body.elapsed_ms));
  record('payload: landing URL keeps the UTMs', body.landingPageUrl.includes('utm_campaign=hs7-test'));
  record('payload: landing_page is the current URL', body.landing_page.includes('/honest-signature-7/') && body.landing_page.includes('fbclid=click-4') && body.landing_page.includes('landing_angle=payment'), body.landing_page);
  record('payload: meta_event_id has the server-accepted format', /^lead_[A-Za-z0-9-]{8,64}$/.test(body.meta_event_id), body.meta_event_id);
  const leads = await eventArgs(page, 'Lead');
  record('tracking: Lead exactly once after success (standard)', leads.length === 1 && leads[0][0] === 'track');
  record('tracking: browser Lead eventID === meta_event_id sent to contact.php', leads[0]?.[3]?.eventID === body.meta_event_id, `${leads[0]?.[3]?.eventID} / ${body.meta_event_id}`);
  record('tracking: Lead parameters', leads[0]?.[2]?.landing_angle === 'payment' && leads[0][2].project === 'Honest Signature 7' && leads[0][2].property_type === 'Appartement 1 chambre' && leads[0][2].utm_campaign === 'hs7-test', JSON.stringify(leads[0]?.[2]));
  const after = await events(page);
  record('tracking: LeadFormStepCompleted is no longer fired', !after.some((e) => e.includes('LeadFormStepCompleted')));
  record('isolation: SimulatorReveal never fires', !after.some((e) => e.includes('SimulatorReveal')));
  record('tracking: no CRM-stage events from the browser', !after.some((e) => /initial_lead|qualifiedlead/i.test(e)));
  record('tracking: funnel stages each fired once', ['LeadFormStarted', 'LeadQualificationCompleted', 'Lead'].every((n) => after.filter((e) => e.endsWith(`:${n}`)).length === 1));
  await sheet.getByRole('button', { name: 'Revenir à la page' }).click();
  record('form: success closes back to the page, inline form shows success too', !(await isDrawerOpen(page)) && (await page.locator('#dossier').getByText('Votre demande a bien été envoyée.').count()) === 1);
  await context.close();
}

/* ── Server error keeps the visitor on step 2, no Lead; retry reuses the ID ── */
{
  const { context, page } = await open(DESKTOP);
  await openDrawer(page, '#paiement [data-cta="payment"]');
  const sheet = drawer(page);
  await completeStep1(sheet, 'Studio', '1,39 M – 1,6 M MAD');
  await fillStep2(sheet);
  await stubContact(page, { status: 500, body: { message: 'La demande n’a pas été envoyée vers Zapier.' } });
  await page.waitForTimeout(3100);
  await sheet.locator('button[type="submit"]').click();
  await sheet.getByText('Une erreur est survenue. Veuillez réessayer.').waitFor();
  record('zapier failure: error shown, no success state', (await sheet.getByText('Votre demande a bien été envoyée.').count()) === 0);
  record('zapier failure: no Lead', !(await events(page)).includes('track:Lead'));
  record('zapier failure: data kept, button re-enabled', (await sheet.locator('input[name="email"]').inputValue()) === 'client@example.com' && !(await sheet.locator('button[type="submit"]').isDisabled()));
  const firstId = await page.evaluate(() => window.__requests[0].body.meta_event_id);
  await stubContact(page, { status: 200, body: 'not json' });
  await page.evaluate(() => {
    const original = window.fetch;
    window.fetch = (url, init) => (String(url).includes('/contact.php') ? Promise.resolve(new Response('<html>', { status: 200 })) : original(url, init));
  });
  await sheet.locator('button[type="submit"]').click();
  await page.waitForTimeout(300);
  record('invalid response body: error, no Lead', (await sheet.getByText('Une erreur est survenue. Veuillez réessayer.').isVisible()) && !(await events(page)).includes('track:Lead'));
  await stubContact(page);
  await sheet.locator('button[type="submit"]').click();
  await sheet.getByText('Votre demande a bien été envoyée.').waitFor();
  const retry = await page.evaluate(() => window.__requests[0].body);
  record('zapier retry: succeeds with the same data and the same meta_event_id', retry.email === 'client@example.com' && retry.meta_event_id === firstId && retry.property_type === 'Studio');
  const leads = await eventArgs(page, 'Lead');
  record('zapier retry: Lead fires once, with that same eventID', leads.length === 1 && leads[0][3]?.eventID === firstId);
  await context.close();
}

/* ── Inline fallback form (no drawer) + honeypot ───────────────────────── */
{
  const { context, page } = await open(MOBILE(390, 844), '?utm_source=facebook&landing_angle=proof');
  const inline = page.locator('#dossier');
  await inline.scrollIntoViewIfNeeded();
  await completeStep1(inline, 'Appartement 2 chambres', 'Plus de 2,5 M MAD');
  await fillStep2(inline);
  await stubContact(page);
  await page.waitForTimeout(3100);
  await inline.locator('button[type="submit"]').click();
  await inline.getByText('Votre demande a bien été envoyée.').waitFor();
  const body = await page.evaluate(() => window.__requests[0].body);
  record('inline form: submits the same contract without the drawer', body.property_type === 'Appartement 2 chambres' && body.budget_range === 'Plus de 2,5 M MAD' && body.landing_angle === 'proof' && body.landing_name === '6 residences livrees');
  record('inline form: Lead fired once', (await eventArgs(page, 'Lead')).length === 1);
  await context.close();
}
{
  const { context, page } = await open(DESKTOP);
  const inline = page.locator('#dossier');
  await completeStep1(inline);
  await fillStep2(inline);
  await inline.locator('input[name="company_website"]').evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, 'spam');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await stubContact(page);
  await page.waitForTimeout(3100);
  await inline.locator('button[type="submit"]').click();
  await inline.getByText('Votre demande a bien été envoyée.').waitFor();
  record('honeypot: silent success, no Lead event', !(await events(page)).includes('track:Lead'));
  await context.close();
}

/* ── No JS: the proof hero and the anchor fallback still work ──────────── */
{
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${base}${URL_PATH}?landing_angle=price`);
  record('no-JS: proof hero shown (script cannot run)', (await h1Text(page)) === H1.proof);
  record('no-JS: CTA is a real #dossier link to the inline form', (await page.locator('#la-7e [data-cta="hero"]').getAttribute('href')) === '#dossier' && (await page.locator('#dossier form').count()) >= 1);
  await context.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n  ${results.length - failed.length}/${results.length} passed\n`);
process.exit(failed.length ? 1 : 0);
