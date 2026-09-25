import { chromium } from 'playwright';
import { startServer } from './lib/serve.mjs';

const { server, base } = await startServer();
const browser = await chromium.launch();
const results = [];

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
    if (/facebook|snapchat|sc-static|ahrefs/.test(host)) return route.abort();
    return route.continue();
  });
  await page.goto(
    `${base}/simulateur/?utm_source=facebook&utm_medium=paid_social&utm_campaign=hs7-test&campaign_id=cmp-1&adset_id=set-2&ad_id=ad-3&fbclid=click-4`,
    { waitUntil: 'domcontentloaded' },
  );
  await page.waitForTimeout(2300);
  return { context, page };
}

async function reveal(page, budget, currency) {
  await page.selectOption('select[name="currency"]', currency);
  await page.fill('#simulator-budget', String(budget));
  await page.selectOption('#simulator-property-type', 'Appartement 2 chambres');
  await page.fill('#simulator-email', 'client@example.com');
  await page.locator('button[type="submit"]', { hasText: 'Voir mon apport estimé' }).click();
  await page.locator('[data-payment-value]').first().waitFor({ state: 'visible' });
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value), 0);
}

console.log('\nSIMULATOR CHECK\n');

{
  const { context, page } = await open({ width: 1440, height: 900 });
  record('desktop: shared header renders', (await page.locator('#nav').count()) === 1);
  record('desktop: shared footer renders', (await page.locator('footer').count()) === 1);
  const desktopFieldTop = await page.evaluate(() =>
    document.getElementById('simulator-budget')?.getBoundingClientRect().top ?? 9999,
  );
  record('desktop: budget field is immediately visible', desktopFieldTop < 900, `${Math.round(desktopFieldTop)}px`);
  record(
    'desktop: result starts as a blurred placeholder',
    (await page.locator('#resultat-simulation').innerText()).includes('Complétez votre budget'),
  );
  record(
    'desktop: no clear payment amount exists before reveal',
    (await page.locator('[data-payment-value]').count()) === 0,
  );

  await page.evaluate(() => {
    window.dataLayer = [];
    window.__fbqEvents = [];
    window.fbq = (...args) => window.__fbqEvents.push(args);
  });
  await page.selectOption('select[name="currency"]', 'EUR');
  await page.fill('#simulator-budget', '');
  await page.locator('#simulator-budget').pressSequentially('1900000');
  record(
    'budget input: typed digits are grouped by thousands',
    (await page.inputValue('#simulator-budget')) === '1 900 000',
    await page.inputValue('#simulator-budget'),
  );
  await page.fill('#simulator-budget', '180001');
  record(
    'budget input: pasted digits are grouped by thousands',
    (await page.inputValue('#simulator-budget')) === '180 001',
    await page.inputValue('#simulator-budget'),
  );
  await page.selectOption('#simulator-property-type', 'Appartement 2 chambres');
  await page.fill('#simulator-email', 'client@example.com');
  const revealButton = page.locator('button[type="submit"]', { hasText: 'Voir mon apport estimé' });
  await revealButton.scrollIntoViewIfNeeded();
  const beforeRevealY = await page.evaluate(() => window.scrollY);
  await revealButton.click();
  await page.locator('[data-payment-value]').first().waitFor({ state: 'visible' });
  const afterRevealY = await page.evaluate(() => window.scrollY);
  const euroValues = await page.locator('[data-payment-value]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-payment-value')),
  );
  record('EUR: five schedule payments render', euroValues.length === 5, euroValues.join(' + '));
  record('EUR: payments add exactly to the budget', sum(euroValues) === 180001, String(sum(euroValues)));
  record('desktop: reveal does not jump the page', Math.abs(afterRevealY - beforeRevealY) < 4, `${beforeRevealY} → ${afterRevealY}`);
  record(
    'tracking: reveal is a distinct event',
    await page.evaluate(() => window.dataLayer.some((entry) => entry.event === 'SimulatorReveal')),
  );
  record(
    'tracking: viewing the simulation does not fire Lead',
    await page.evaluate(
      () =>
        !window.dataLayer.some((entry) => entry.event === 'Lead') &&
        !window.__fbqEvents.some((args) => args[1] === 'Lead'),
    ),
  );

  const step2 = page.locator('#demande-simulateur');
  record(
    'step 2: conversion heading is shown',
    (await step2.innerText()).includes('Recevez les plans, prix et appartements disponibles selon votre budget.'),
  );
  record('step 2: précision field starts collapsed', !(await page.locator('#simulator-message').isVisible()));
  record(
    'step 2: first intention is preselected',
    await page.locator('input[name="intention"][value="Recevoir les plans et prix"]').isChecked(),
  );
  record(
    'step 2: final button label',
    (await step2.locator('button[type="submit"]').innerText()).trim() === 'Recevoir mes disponibilités',
  );
  record(
    'step 2: budget, currency and type are not asked again',
    (await step2.locator('[name="budget"], [name="currency"], [name="property_type"], [name="email"]').count()) === 0,
  );

  await step2.locator('button[type="submit"]').click();
  record('step 2 errors: name error appears', await page.locator('#simulator-full-name-error').isVisible());
  record('step 2 errors: phone error appears', await page.locator('#simulator-phone-error').isVisible());

  const carouselCounter = page.locator('[aria-label="Photos du projet Honest Signature 7"] [aria-live="polite"]');
  const beforeCarousel = await carouselCounter.innerText();
  const nextButton = page.locator('button[aria-label="Photo suivante"]');
  await nextButton.focus();
  await page.keyboard.press('Enter');
  const afterCarousel = await carouselCounter.innerText();
  record('carousel: keyboard control advances the image', beforeCarousel !== afterCarousel, `${beforeCarousel} → ${afterCarousel}`);

  record('carry-over: email is requested only once', (await page.locator('input[type="email"]').count()) === 1);
  record(
    'carry-over: final form shows the simulator email',
    (await page.locator('#demande-simulateur').innerText()).includes('client@example.com'),
  );

  await page.evaluate(() => {
    window.__leadRequests = [];
    window.fetch = (url, init) => {
      if (String(url).includes('/contact.php')) {
        window.__leadRequests.push({ url: String(url), body: JSON.parse(init.body) });
        // Slow response so a double click lands while the first request is in flight.
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve(
                new Response(JSON.stringify({ message: 'ok' }), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                }),
              ),
            400,
          ),
        );
      }
      return Promise.resolve(new Response('', { status: 204 }));
    };
  });
  await page.fill('#simulator-full-name', 'Client Test');
  await page.fill('#simulator-phone', '612345678');
  await page.locator('label', { hasText: 'Organiser une visite' }).click();
  await page.getByRole('button', { name: /Ajouter une précision/ }).click();
  await page.fill('#simulator-message', 'Je souhaite recevoir les plans.');
  await page.locator('#demande-simulateur button[type="submit"]').dblclick();
  await page.getByText('Votre demande a bien été envoyée').waitFor({ state: 'visible' });

  const requests = await page.evaluate(() => window.__leadRequests);
  const payload = requests[0]?.body ?? {};
  record('submission: double click sends exactly one request', requests.length === 1, `${requests.length} request(s)`);
  record(
    'submission: intention and précision travel in message',
    payload.message === 'Intention : Organiser une visite — Précision : Je souhaite recevoir les plans.',
    payload.message,
  );
  record(
    'submission: existing contract fields are intact',
    payload.form_type === 'simulateur_request' &&
      payload.nom_complet === 'Client Test' &&
      payload.phoneFull === payload.telephone &&
      payload.telephone.startsWith('+') &&
      payload.company_website === '' &&
      payload.elapsed_ms > 0 &&
      payload.reservationAmount === 54000 &&
      payload.installmentAmount === 27000 &&
      payload.handoverAmount === 45001,
    JSON.stringify({ tel: payload.telephone, r: payload.reservationAmount, i: payload.installmentAmount, h: payload.handoverAmount }),
  );
  record('submission: destination is /contact.php', requests[0]?.url === '/contact.php', requests[0]?.url ?? 'none');
  record(
    'submission: simulator values are carried forward',
    payload.email === 'client@example.com' &&
      payload.budgetValue === 180001 &&
      payload.currency === 'EUR' &&
      payload.propertyType === 'Appartement 2 chambres',
  );
  record(
    'submission: UTM and Meta identifiers are preserved',
    payload.utmCampaign === 'hs7-test' &&
      payload.fbclid === 'click-4' &&
      payload.fbc === 'fb.1.test-click' &&
      payload.fbp === 'fb.1.test-browser' &&
      payload.campaignId === 'cmp-1' &&
      payload.adsetId === 'set-2' &&
      payload.adId === 'ad-3',
  );
  record(
    'submission: no personal data is added to the URL',
    !page.url().includes('client%40') && !page.url().includes('180001') && !page.url().includes('Client'),
    page.url(),
  );
  record(
    'tracking: Lead fires only after confirmed success',
    await page.evaluate(() => window.dataLayer.filter((entry) => entry.event === 'Lead').length === 1),
  );
  record(
    'tracking: Meta standard Lead fired exactly once',
    await page.evaluate(
      () => window.__fbqEvents.filter((args) => args[0] === 'track' && args[1] === 'Lead').length === 1,
    ),
  );

  const simulatorChrome = await page.evaluate(() => ({
    nav: document.querySelector('#nav')?.textContent?.replace(/\s+/g, ' ').trim(),
    footer: [...document.querySelectorAll('footer')].at(-1)?.textContent?.replace(/\s+/g, ' ').trim(),
  }));
  const home = await context.newPage();
  await home.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await home.waitForLoadState('load');
  await home.waitForTimeout(300);
  const homeChrome = await home.evaluate(() => ({
    nav: document.querySelector('#nav')?.textContent?.replace(/\s+/g, ' ').trim(),
    footer: [...document.querySelectorAll('footer')].at(-1)?.textContent?.replace(/\s+/g, ' ').trim(),
  }));
  record('shared chrome: header copy is unchanged', simulatorChrome.nav === homeChrome.nav);
  record(
    'shared chrome: footer copy is unchanged',
    simulatorChrome.footer === homeChrome.footer,
    `${simulatorChrome.footer?.length ?? 0} / ${homeChrome.footer?.length ?? 0} chars`,
  );
  await context.close();
}

{
  const { context, page } = await open({ width: 1280, height: 800 });
  await page.evaluate(() => {
    window.dataLayer = [];
    window.__partial = [];
    // Never resolves: the estimate must appear without waiting on the server.
    window.fetch = (url, init) => {
      if (String(url).includes('/contact.php')) {
        window.__partial.push({ url: String(url), keepalive: init.keepalive, body: JSON.parse(init.body) });
      }
      return new Promise(() => {});
    };
  });
  const revealBtn = page.locator('button[type="submit"]', { hasText: 'Voir mon apport estimé' });
  await reveal(page, 150000, 'EUR');
  let partial = await page.evaluate(() => window.__partial);
  const lead = partial[0]?.body ?? {};
  record('partial lead: reveal shows the result without waiting for the server', true);
  record('partial lead: one request sent on reveal', partial.length === 1, `${partial.length} request(s)`);
  record(
    'partial lead: existing apport_simulator contract to /contact.php',
    partial[0]?.url === '/contact.php' &&
      lead.form_type === 'apport_simulator' &&
      lead.email === 'client@example.com' &&
      lead.budget_value === 150000 &&
      lead.currency === 'EUR' &&
      lead.typologie === 'Appartement 2 chambres' &&
      lead.apport_eur === 45000 &&
      lead.apport_mad === 450000 &&
      lead.company_website === '' &&
      lead.source_page.includes('utm_campaign=hs7-test'),
    JSON.stringify(lead),
  );
  record('partial lead: survives the visitor leaving (keepalive)', partial[0]?.keepalive === true);
  await revealBtn.click();
  partial = await page.evaluate(() => window.__partial);
  record('partial lead: same inputs are not re-sent', partial.length === 1, `${partial.length} request(s)`);
  for (const value of ['160000', '170000', '190000']) {
    await page.fill('#simulator-budget', value);
    await revealBtn.click();
  }
  partial = await page.evaluate(() => window.__partial);
  record('partial lead: capped at 3 per visit', partial.length === 3, `${partial.length} request(s)`);
  record(
    'partial lead: no Lead conversion fires',
    await page.evaluate(() => !window.dataLayer.some((entry) => entry.event === 'Lead')),
  );
  await context.close();
}

{
  const { context, page } = await open({ width: 1280, height: 800 });
  await page.locator('button[type="submit"]', { hasText: 'Voir mon apport estimé' }).click();
  record('validation: budget error appears', await page.locator('#simulator-budget-error').isVisible());
  record('validation: email error appears', await page.locator('#simulator-email-error').isVisible());
  await page.fill('#simulator-budget', '150000');
  await page.fill('#simulator-email', 'client@exemple');
  await page.locator('button[type="submit"]', { hasText: 'Voir mon apport estimé' }).click();
  record(
    'validation: invalid email keeps result blurred',
    (await page.locator('#simulator-email-error').innerText()).includes('valide') &&
      (await page.locator('[data-payment-value]').count()) === 0,
  );
  await context.close();
}

{
  const { context, page } = await open({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const mobileFieldTop = await page.evaluate(() =>
    document.getElementById('simulator-budget')?.getBoundingClientRect().top ?? 9999,
  );
  record('mobile: budget field is visible on arrival', mobileFieldTop < 844, `${Math.round(mobileFieldTop)}px`);
  await reveal(page, 1900001, 'MAD');
  const madValues = await page.locator('[data-payment-value]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-payment-value')),
  );
  await page.waitForTimeout(900);
  const resultTop = await page.evaluate(() =>
    document.getElementById('resultat-simulation')?.getBoundingClientRect().top ?? 9999,
  );
  record('MAD: payments add exactly to the budget', sum(madValues) === 1900001, String(sum(madValues)));
  record('mobile: reveal scrolls to the result', resultTop >= 0 && resultTop < 150, `${Math.round(resultTop)}px`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  record('mobile: no horizontal overflow', overflow <= 1, `${overflow}px`);
  const smallControls = await page.evaluate(() =>
    [...document.querySelectorAll('main input, main select, main textarea, main button')]
      .filter((element) => element.getAttribute('aria-hidden') !== 'true' && element.type !== 'hidden')
      // Collapsed controls (the optional précision) are not tappable until opened.
      .filter((element) => element.getClientRects().length > 0)
      // A radio's tap target is its wrapping label, not the 16px dot.
      .map((element) => (element.type === 'radio' ? element.closest('label') ?? element : element))
      .filter((element) => element.getBoundingClientRect().height < 44)
      .map((element) => `${element.id || element.tagName}:${Math.round(element.getBoundingClientRect().height)}`),
  );
  record('mobile: form controls meet 44px target size', smallControls.length === 0, smallControls.join(', '));
  await context.close();
}

{
  const { context, page } = await open(
    { width: 1024, height: 768 },
    { reducedMotion: 'reduce' },
  );
  const counter = page.locator('[aria-label="Photos du projet Honest Signature 7"] [aria-live="polite"]');
  const before = await counter.innerText();
  await page.waitForTimeout(5200);
  const after = await counter.innerText();
  record('reduced motion: carousel autoplay is disabled', before === after, `${before} → ${after}`);
  await context.close();
}

{
  const { context, page } = await open({ width: 1280, height: 800 });
  await reveal(page, 200000, 'EUR');
  await page.evaluate(() => {
    window.dataLayer = [];
    window.fetch = (url) => {
      if (String(url).includes('/contact.php')) {
        return Promise.resolve(new Response(JSON.stringify({ message: 'Échec confirmé' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }));
      }
      return Promise.resolve(new Response('', { status: 204 }));
    };
  });
  await page.fill('#simulator-full-name', 'Client Test');
  await page.fill('#simulator-phone', '612345678');
  await page.locator('#demande-simulateur button[type="submit"]').click();
  await page.getByText('Échec confirmé').waitFor({ state: 'visible' });
  record(
    'failure: success state stays hidden',
    (await page.getByText('Votre demande a bien été envoyée').count()) === 0,
  );
  record(
    'failure: Lead event is not emitted',
    await page.evaluate(() => !window.dataLayer.some((entry) => entry.event === 'Lead')),
  );
  await context.close();
}

await browser.close();
server.close();

const failed = results.filter((result) => !result.ok);
console.log(`\n  ${results.length - failed.length}/${results.length} checks passed.\n`);
if (failed.length) process.exit(1);
