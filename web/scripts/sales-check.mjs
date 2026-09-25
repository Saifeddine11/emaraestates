import { chromium } from 'playwright';
import { startServer } from './lib/serve.mjs';

/** /simulateur-equipe: internal calculator — same math, no email, nothing sent. */

const { server, base } = await startServer();
const browser = await chromium.launch();
const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function open(viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  const posts = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && new URL(req.url()).origin === base) posts.push(req.url());
  });
  await page.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    if (/facebook|snapchat|sc-static|ahrefs|country\.is/.test(host)) return route.abort();
    return route.continue();
  });
  await page.goto(`${base}/simulateur-equipe`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2300);
  await page.evaluate(() => {
    window.dataLayer = [];
    window.__fbqEvents = [];
    window.fbq = (...args) => window.__fbqEvents.push(args);
  });
  return { context, page, posts };
}

const values = (page) =>
  page.locator('[data-payment-value]').evaluateAll((nodes) => nodes.map((n) => Number(n.dataset.paymentValue)));
const sum = (list) => list.reduce((a, b) => a + b, 0);

console.log('\nSALES CALCULATOR CHECK\n');

{
  const { context, page, posts } = await open({ width: 1440, height: 900 });
  const robots = await page.evaluate(() => document.querySelector('meta[name="robots"]')?.content);
  record('seo: noindex, nofollow', robots === 'noindex, nofollow', robots);
  record('no email field', (await page.locator('input[type="email"]').count()) === 0);
  record('shared header and footer render', (await page.locator('#nav').count()) === 1 && (await page.locator('footer').count()) >= 1);
  record('empty state shows no amounts', (await page.locator('[data-payment-value]').count()) === 0);

  await page.locator('#sales-budget').pressSequentially('180001');
  record('budget input groups digits', (await page.inputValue('#sales-budget')) === '180 001', await page.inputValue('#sales-budget'));
  const eur = await values(page);
  record(
    'EUR: same schedule as the public simulator',
    JSON.stringify(eur) === JSON.stringify([54000, 27000, 27000, 27000, 45001]),
    eur.join(' + '),
  );
  record('EUR: payments add exactly to the budget', sum(eur) === 180001);

  await page.getByRole('button', { name: 'MAD', exact: true }).click();
  await page.fill('#sales-budget', '1900001');
  const mad = await values(page);
  record('MAD: payments add exactly to the budget', sum(mad) === 1900001, mad.join(' + '));
  record('MAD: amounts shown in MAD', (await page.locator('[data-payment-value]').first().innerText()).includes('MAD'));

  await page.getByRole('button', { name: /Prix d’appel/ }).click();
  record(
    'preset: launch price fills 129 000 € in EUR',
    (await page.inputValue('#sales-budget')) === '129 000' &&
      (await page.getByRole('button', { name: 'EUR', exact: true }).getAttribute('aria-pressed')) === 'true',
  );
  record('preset: schedule total is 129 000', sum(await values(page)) === 129000);

  await page.getByRole('button', { name: /Copier l’échéancier/ }).click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  record(
    'copy: WhatsApp-ready summary',
    clip.startsWith('Honest Signature 7 — échéancier indicatif pour un budget de 129') &&
      clip.includes('• À la réservation (30 %) : 38') &&
      clip.includes('• À la remise des clés (25 %)') &&
      clip.includes('non contractuelle'),
    clip.split('\n')[1],
  );
  record('copy: button confirms', await page.getByRole('button', { name: /Copié/ }).isVisible());

  await page.waitForTimeout(400);
  record('privacy: nothing is POSTed', posts.length === 0, posts.join(', '));
  record(
    'tracking: no Lead or custom events',
    await page.evaluate(() => window.dataLayer.length === 0 && window.__fbqEvents.length === 0),
  );
  await context.close();
}

{
  const { context, page } = await open({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.locator('#sales-budget').fill('250000');
  const lastTop = await page.locator('[data-payment-value]').last().evaluate((el) => el.getBoundingClientRect().top);
  record('mobile: result shows without a submit button', (await page.locator('[data-payment-value]').count()) === 5);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  record('mobile: no horizontal overflow', overflow <= 1, `${overflow}px`);
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('main input, main button')]
      .filter((el) => el.getBoundingClientRect().height < 44)
      .map((el) => `${el.id || el.textContent.trim()}:${Math.round(el.getBoundingClientRect().height)}`),
  );
  record('mobile: tap targets ≥ 44px', small.length === 0, small.join(', '));
  record(
    'mobile: no client WhatsApp float over the amounts',
    (await page.locator('a[aria-label="Contacter sur WhatsApp"]').count()) === 0,
  );
  record('mobile: full schedule within ~1.5 screens', lastTop < 844 * 1.5, `${Math.round(lastTop)}px`);
  await context.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n  ${results.length - failed.length}/${results.length} checks passed.\n`);
if (failed.length) process.exit(1);
