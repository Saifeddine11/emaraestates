import { chromium } from 'playwright';
import { startServer } from './lib/serve.mjs';

/**
 * /appartements-temoins/ behaviour checks: gallery filters, lightbox, mobile
 * swipe, sticky CTA, both form steps, payload contract, attribution, the
 * success-only Lead event, duplicate protection and SEO tags.
 */

const { server, base } = await startServer();
const browser = await chromium.launch();
const results = [];
const QUERY =
  '?utm_source=facebook&utm_medium=paid_social&utm_campaign=temoins-test&campaign_id=cmp-1&adset_id=set-2&ad_id=ad-3&fbclid=click-4';

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function open(viewport, options = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    reducedMotion: options.reducedMotion,
  });
  await context.addCookies([
    { name: '_fbc', value: 'fb.1.test-click', url: base },
    { name: '_fbp', value: 'fb.1.test-browser', url: base },
  ]);
  const page = await context.newPage();
  await page.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    if (/facebook|snapchat|sc-static|ahrefs|country\.is/.test(host)) return route.abort();
    return route.continue();
  });
  await page.goto(`${base}/appartements-temoins/${QUERY}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2300);
  await page.evaluate(() => {
    window.dataLayer = [];
    window.__fbqEvents = [];
    window.fbq = (...args) => window.__fbqEvents.push(args);
  });
  return { context, page };
}

/** Stub /contact.php. `delay` lets a double click land mid-request. */
async function stubContact(page, { status = 200, body = { message: 'ok' }, delay = 0 } = {}) {
  await page.evaluate(
    ({ status, body, delay }) => {
      window.__requests = [];
      window.fetch = (url, init) => {
        if (String(url).includes('/contact.php')) {
          window.__requests.push({ url: String(url), body: JSON.parse(init.body) });
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve(
                  new Response(JSON.stringify(body), {
                    status,
                    headers: { 'Content-Type': 'application/json' },
                  }),
                ),
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

async function fillStep1(page) {
  await page.fill('#visit-full-name', 'Client Test');
  await page.fill('#visit-email', 'client@example.com');
  await page.fill('#visit-phone', '612345678');
}

const visibleCards = (page) => page.locator('[data-showroom]');

console.log('\nSHOWROOM CHECK\n');

/* ── Desktop: SEO, chrome, gallery, lightbox ─────────────────────────────── */
{
  const { context, page } = await open({ width: 1440, height: 900 });

  const seo = await page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content,
    canonical: [...document.querySelectorAll('link[rel="canonical"]')].map((l) => l.href),
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
    ogUrl: document.querySelector('meta[property="og:url"]')?.content,
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
  }));
  record('seo: title', seo.title === 'Appartements témoins à Marrakech | Honest Signature | Emara Estates', seo.title);
  record('seo: meta description', seo.description?.startsWith('Visitez les appartements témoins Honest Signature à Guéliz'));
  record(
    'seo: single slashed canonical',
    seo.canonical.length === 1 && seo.canonical[0] === 'https://emaraestates.com/appartements-temoins/',
    seo.canonical.join(', '),
  );
  record('seo: og:image', seo.ogImage === 'https://emaraestates.com/og-appartements-temoins.jpg', seo.ogImage);
  record('seo: og:url', seo.ogUrl === 'https://emaraestates.com/appartements-temoins/');
  record(
    'seo: WebPage + Breadcrumb JSON-LD',
    seo.jsonLd.some((s) => s.includes('"WebPage"') && s.includes('appartements-temoins/') && s.includes('BreadcrumbList')),
  );
  const og = await page.request.get(`${base}/og-appartements-temoins.jpg`);
  record('seo: og image is served', og.ok() && og.headers()['content-type']?.includes('jpeg'), String(og.status()));

  record('hero: headline', (await page.locator('h1').innerText()).trim() === 'Visitez les appartements témoins Honest à Marrakech');
  record('hero: Guéliz · Marrakech label', await page.getByText('Guéliz · Marrakech', { exact: true }).isVisible());
  record(
    'hero: both CTAs',
    (await page.locator('#visite-temoins a', { hasText: 'Planifier une visite' }).count()) === 1 &&
      (await page.locator('#visite-temoins a', { hasText: 'Recevoir les disponibilités' }).count()) === 1,
  );

  record('gallery: 8 delivered showroom cards by default', (await visibleCards(page).count()) === 8);
  record(
    'gallery: every card says "Résidence livrée"',
    (await page.locator('[data-showroom]', { hasText: 'Résidence livrée' }).count()) === 8,
  );
  record(
    'gallery: no Honest Signature 7 image among delivered showrooms',
    (await page.locator('[data-showroom] img[src*="honest-7"]').count()) === 0,
  );
  record(
    'gallery: card images lazy-load',
    await page.locator('[data-showroom] img').evaluateAll((imgs) => imgs.every((i) => i.loading === 'lazy')),
  );

  await page.locator('#galerie-temoins').scrollIntoViewIfNeeded();
  for (const residence of ['Honest 1', 'Honest 2', 'Honest 3', 'Honest 4']) {
    await page.getByRole('button', { name: residence, exact: true }).click();
    await page.waitForTimeout(500);
    const shown = await visibleCards(page).evaluateAll((els) => els.map((e) => e.dataset.showroom));
    record(
      `filter: ${residence} shows only its showrooms`,
      shown.length === 2 && shown.every((r) => r === residence),
      shown.join(', '),
    );
  }
  record(
    'filter: active chip is announced (aria-pressed)',
    (await page.getByRole('button', { name: 'Honest 4', exact: true }).getAttribute('aria-pressed')) === 'true',
  );
  await page.getByRole('button', { name: 'Tous', exact: true }).click();
  await page.waitForTimeout(500);
  record('filter: Tous restores all 8', (await visibleCards(page).count()) === 8);

  await page.getByRole('button', { name: 'Honest 3', exact: true }).click();
  await page.waitForTimeout(500);
  await page.locator('[data-showroom]').first().getByRole('button', { name: 'Voir l’appartement témoin' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });
  const firstSrc = await dialog.locator('img').first().getAttribute('src');
  const counter1 = await dialog.innerText();
  record('lightbox: opens on the chosen showroom', /honest-3/.test(firstSrc ?? ''), firstSrc ?? '');
  record('lightbox: scoped to the active filter', counter1.includes('01 / 02'), counter1.replace(/\s+/g, ' ').slice(0, 80));
  const natural = await dialog.locator('img').first().evaluate((img) => ({ w: img.naturalWidth, fit: getComputedStyle(img).objectFit }));
  record('lightbox: full-resolution, undistorted image', natural.w >= 1600 && natural.fit !== 'fill', JSON.stringify(natural));
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  record('lightbox: arrow key navigates', (await dialog.innerText()).includes('02 / 02'));
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  record('lightbox: Escape closes', true);

  const showroomChrome = await page.evaluate(() => ({
    nav: document.querySelector('#nav')?.textContent?.replace(/\s+/g, ' ').trim(),
    footer: [...document.querySelectorAll('footer')].at(-1)?.textContent?.replace(/\s+/g, ' ').trim(),
  }));
  const home = await context.newPage();
  await home.goto(`${base}/`, { waitUntil: 'load' });
  await home.waitForTimeout(300);
  const homeChrome = await home.evaluate(() => ({
    nav: document.querySelector('#nav')?.textContent?.replace(/\s+/g, ' ').trim(),
    footer: [...document.querySelectorAll('footer')].at(-1)?.textContent?.replace(/\s+/g, ' ').trim(),
  }));
  record('chrome: header identical to homepage', Boolean(showroomChrome.nav) && showroomChrome.nav === homeChrome.nav);
  record('chrome: footer identical to homepage', Boolean(showroomChrome.footer) && showroomChrome.footer === homeChrome.footer);
  await context.close();
}

/* ── Desktop: two-step form, payload, tracking, duplicates ───────────────── */
{
  const { context, page } = await open({ width: 1440, height: 900 });
  await stubContact(page, { delay: 400 });

  await page.locator('#visite-temoins a', { hasText: 'Recevoir les disponibilités' }).click();
  // Long smooth scroll (~4 500px): wait until it settles.
  await page.waitForTimeout(2000);
  const formTop = await page.evaluate(() => document.getElementById('demande-visite').getBoundingClientRect().top);
  record('cta: secondary CTA scrolls to the form', formTop >= 0 && formTop < 110, `${Math.round(formTop)}px`);
  record(
    'cta: secondary CTA preselects "Recevoir les plans et disponibilités"',
    await page.locator('input[name="visit_type"][value="Recevoir les plans et disponibilités"]').isChecked(),
  );

  await page.getByRole('button', { name: 'Continuer' }).click();
  record('step 1: name error', await page.locator('#visit-full-name-error').isVisible());
  record('step 1: email error', await page.locator('#visit-email-error').isVisible());
  record('step 1: phone error', await page.locator('#visit-phone-error').isVisible());
  await fillStep1(page);
  await page.fill('#visit-email', 'client@exemple');
  await page.getByRole('button', { name: 'Continuer' }).click();
  record(
    'step 1: invalid email blocks step 2',
    (await page.locator('#visit-email-error').innerText()).includes('valide') &&
      (await page.locator('input[name="contact_method"]').count()) === 0,
  );
  await page.fill('#visit-email', 'client@example.com');
  await page.locator('label', { hasText: 'Les deux' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.locator('input[name="contact_method"]').first().waitFor({ state: 'visible' });
  record('step 1: nothing is sent before the final button', (await page.evaluate(() => window.__requests.length)) === 0);
  record(
    'step 2: contact method, timing and collapsed précision',
    (await page.locator('input[name="contact_method"]').count()) === 3 &&
      (await page.locator('input[name="timing"]').count()) === 4 &&
      !(await page.locator('#visit-message').isVisible()),
  );
  record('step 2: final button label', await page.getByRole('button', { name: 'Demander ma visite' }).isVisible());

  await page.getByRole('button', { name: /Modifier mes coordonnées/ }).click();
  record('step 2: back keeps step-1 values', (await page.inputValue('#visit-full-name')) === 'Client Test');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.locator('input[name="contact_method"]').first().waitFor({ state: 'visible' });

  await page.locator('label', { hasText: 'Téléphone' }).click();
  await page.locator('label', { hasText: 'Cette semaine' }).click();
  await page.getByRole('button', { name: /Ajouter une précision/ }).click();
  await page.fill('#visit-message', 'Plutôt un samedi matin.');
  await page.getByRole('button', { name: 'Demander ma visite' }).dblclick();
  await page.getByText('Votre demande a bien été envoyée').waitFor({ state: 'visible' });

  const requests = await page.evaluate(() => window.__requests);
  const p = requests[0]?.body ?? {};
  record('submit: double click sends exactly one request', requests.length === 1, `${requests.length} request(s)`);
  record('submit: destination is /contact.php', requests[0]?.url === '/contact.php', requests[0]?.url ?? 'none');
  record(
    'submit: existing contact field contract',
    p.nom_complet === 'Client Test' &&
      p.email === 'client@example.com' &&
      p.telephone?.startsWith('+') &&
      p.phoneFull === p.telephone &&
      typeof p.phoneCode === 'string' &&
      typeof p.phoneCountry === 'string' &&
      typeof p.phoneCountryCode === 'string' &&
      p.phoneNumber === '612345678' &&
      p.company_website === '' &&
      p.elapsed_ms > 3000 &&
      p.form_type === 'appartements_temoins_request',
    JSON.stringify({ tel: p.telephone, elapsed: p.elapsed_ms }),
  );
  record(
    'submit: choices travel in message',
    p.message ===
      'Demande : Les deux — Contact préféré : Téléphone — Délai : Cette semaine — Précision : Plutôt un samedi matin.',
    p.message,
  );
  record(
    'submit: UTM and Meta attribution',
    p.utmSource === 'facebook' &&
      p.utmCampaign === 'temoins-test' &&
      p.campaignId === 'cmp-1' &&
      p.adsetId === 'set-2' &&
      p.adId === 'ad-3' &&
      p.fbclid === 'click-4' &&
      p.fbc === 'fb.1.test-click' &&
      p.fbp === 'fb.1.test-browser' &&
      p.adPlatform === 'Meta' &&
      p.leadSource === 'Appartements témoins' &&
      p.landingPageUrl.includes('/appartements-temoins/'),
  );
  record('submit: no personal data in the URL', !page.url().includes('client') && !page.url().includes('Client'));
  record(
    'tracking: Lead once, only after success',
    await page.evaluate(
      () =>
        window.dataLayer.filter((e) => e.event === 'Lead').length === 1 &&
        window.__fbqEvents.filter((a) => a[0] === 'track' && a[1] === 'Lead').length === 1,
    ),
  );
  await context.close();
}

/* ── Failure path ─────────────────────────────────────────────────────────── */
{
  const { context, page } = await open({ width: 1280, height: 800 });
  await stubContact(page, { status: 500, body: { message: 'Échec confirmé' } });
  await page.locator('#demande-visite').scrollIntoViewIfNeeded();
  await fillStep1(page);
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Demander ma visite' }).click();
  await page.getByText('Échec confirmé').waitFor({ state: 'visible' });
  record('failure: success state stays hidden', (await page.getByText('Votre demande a bien été envoyée').count()) === 0);
  record(
    'failure: no Lead event',
    await page.evaluate(() => !window.dataLayer.some((e) => e.event === 'Lead') && window.__fbqEvents.length === 0),
  );
  await context.close();
}

/* ── Mobile: swipe, filters row, sticky CTA, layout ──────────────────────── */
{
  const { context, page } = await open({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const heroCtaTop = await page.evaluate(
    () => [...document.querySelectorAll('#visite-temoins a')].find((a) => a.textContent.includes('Planifier')).getBoundingClientRect().bottom,
  );
  record('mobile: main CTA visible on arrival', heroCtaTop < 844, `${Math.round(heroCtaTop)}px`);
  record(
    'mobile: sticky CTA hidden while hero is on screen',
    await page.locator('[data-sticky-cta]').evaluate((el) => getComputedStyle(el).opacity === '0'),
  );

  await page.locator('#galerie-temoins').scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  record(
    'mobile: sticky CTA appears after the hero',
    await page.locator('[data-sticky-cta]').evaluate((el) => getComputedStyle(el).opacity === '1'),
  );
  const filterRow = await page.locator('[aria-label="Filtrer par résidence"]').evaluate((el) => ({
    scrollable: el.scrollWidth > el.clientWidth,
    overflow: getComputedStyle(el).overflowX,
  }));
  record('mobile: filter chips scroll horizontally', filterRow.scrollable && filterRow.overflow === 'auto', JSON.stringify(filterRow));

  const track = page.locator('ul[aria-label="Appartements témoins"]');
  const box = await track.boundingBox();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.synthesizeScrollGesture', {
    x: Math.round(box.x + box.width * 0.7),
    y: Math.round(box.y + 120),
    xDistance: -260,
    yDistance: 0,
    gestureSourceType: 'touch',
    speed: 900,
  });
  await page.waitForTimeout(900);
  const swipe = await track.evaluate((el) => {
    const cards = [...el.querySelectorAll('[data-showroom]')];
    const trackLeft = el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).scrollPaddingLeft || '0');
    return {
      scrollLeft: Math.round(el.scrollLeft),
      snapped: cards.some((c) => Math.abs(c.getBoundingClientRect().left - trackLeft) < 3),
    };
  });
  record('mobile: gallery swipes horizontally', swipe.scrollLeft > 100, `scrollLeft=${swipe.scrollLeft}`);
  record('mobile: swipe snaps to a card', swipe.snapped);

  await page.getByRole('button', { name: 'Honest 2', exact: true }).click();
  await page.waitForTimeout(700);
  record('mobile: filtering resets the row to its start', (await track.evaluate((el) => el.scrollLeft)) < 2);

  await page.locator('#demande-visite').scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  record(
    'mobile: sticky CTA hides over the form',
    await page.locator('[data-sticky-cta]').evaluate((el) => getComputedStyle(el).opacity === '0'),
  );
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  record('mobile: no horizontal page overflow', overflow <= 1, `${overflow}px`);
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('main input, main select, main textarea, main button, main a')]
      .filter((el) => el.getAttribute('aria-hidden') !== 'true' && el.type !== 'hidden' && !el.closest('[aria-hidden="true"]'))
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => (el.type === 'radio' ? el.closest('label') ?? el : el))
      .filter((el) => el.getBoundingClientRect().height < 44)
      .map((el) => `${el.id || el.tagName}:${el.textContent.trim().slice(0, 20)}:${Math.round(el.getBoundingClientRect().height)}`),
  );
  record('mobile: tap targets ≥ 44px', small.length === 0, small.join(' | '));
  await context.close();
}

/* ── Reduced motion: content must be visible ─────────────────────────────── */
{
  const { context, page } = await open({ width: 1280, height: 800 }, { reducedMotion: 'reduce' });
  const hidden = [];
  for (const id of ['#gallery-title', '#benefits-title', '#steps-title', '#hs7-title']) {
    await page.locator(id).scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const opacity = await page.locator(id).evaluate((el) => {
      let o = 1;
      for (let e = el; e && e !== document.body; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
      return o;
    });
    if (opacity < 1) hidden.push(`${id}:${opacity}`);
  }
  record('reduced motion: every section is visible', hidden.length === 0, hidden.join(', '));
  await context.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n  ${results.length - failed.length}/${results.length} checks passed.\n`);
if (failed.length) process.exit(1);
