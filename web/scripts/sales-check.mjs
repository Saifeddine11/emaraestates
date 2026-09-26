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

  record('no direct price field', (await page.locator('#sales-budget').count()) === 0);
  record('no euro option (dirhams only)', (await page.getByRole('button', { name: 'EUR', exact: true }).count()) === 0);
  const pressed = (name) => page.getByRole('button', { name: new RegExp(`^${name}`) }).getAttribute('aria-pressed');
  record('type: Appartement selected by default', (await pressed('Appartement')) === 'true');
  record('type: Appartement fills 27 000 MAD/m²', (await page.inputValue('#sales-price-m2')) === '27 000', await page.inputValue('#sales-price-m2'));

  await page.locator('#sales-surface').pressSequentially('72.5');
  record('surface accepts decimals (dot → comma)', (await page.inputValue('#sales-surface')) === '72,5', await page.inputValue('#sales-surface'));
  const apt = await page.locator('[data-apartment-price]').evaluate((el) => Number(el.dataset.apartmentPrice));
  record('Appartement: 72,5 m² × 27 000 = 1 957 500 MAD', apt === 1957500, String(apt));
  const aptTotal = await page.locator('[data-total]').evaluate((el) => Number(el.dataset.total));
  record('total = apartment + 50 000 MAD parking', aptTotal === 2007500, String(aptTotal));
  const aptPlan = await values(page);
  record(
    'public simulator schedule applied to the total',
    JSON.stringify(aptPlan) === JSON.stringify([602250, 301125, 301125, 301125, 501875]),
    aptPlan.join(' + '),
  );
  record('payments add exactly to the total', sum(aptPlan) === 2007500);
  record('amounts shown in MAD', (await page.locator('[data-payment-value]').first().innerText()).includes('MAD'));
  const shown = await page.locator('[data-payment-value] dd').first().textContent();
  record(
    'amounts: a visible space every 3 digits',
    shown === '602\u00a0250\u00a0MAD' && !(await page.locator('main').innerText()).includes('\u202f'),
    JSON.stringify(shown),
  );
  const labels = await page.locator('[data-payment-value] dt').allInnerTexts();
  record(
    'labels: 15 % every six months',
    ['6 mois après la réservation', '12 mois après la réservation', '18 mois après la réservation'].every((l) =>
      labels.some((x) => x.startsWith(l)),
    ),
    labels.join(' | '),
  );

  await page.getByRole('button', { name: /^Duplex/ }).click();
  record('type: Duplex selected', (await pressed('Duplex')) === 'true' && (await pressed('Appartement')) === 'false');
  record('type: Duplex fills 23 000 MAD/m²', (await page.inputValue('#sales-price-m2')) === '23 000', await page.inputValue('#sales-price-m2'));
  const dup = await page.locator('[data-apartment-price]').evaluate((el) => Number(el.dataset.apartmentPrice));
  record('Duplex: 72,5 m² × 23 000 = 1 667 500 MAD', dup === 1667500, String(dup));
  record('surface kept when switching type', (await page.inputValue('#sales-surface')) === '72,5');

  await page.fill('#sales-price-m2', '24500');
  record('price per m² stays editable and grouped', (await page.inputValue('#sales-price-m2')) === '24 500', await page.inputValue('#sales-price-m2'));
  const edited = await page.locator('[data-apartment-price]').evaluate((el) => Number(el.dataset.apartmentPrice));
  record('edited price per m² is used', edited === 1776250, String(edited));

  record('no launch-price shortcut (direct prices removed)', (await page.getByRole('button', { name: /Prix d’appel/ }).count()) === 0);
  record('no copy button any more', (await page.getByRole('button', { name: /Copier/ }).count()) === 0);

  // Longest case for the page count: large surface and price, long amounts.
  await page.getByRole('button', { name: /^Appartement/ }).click();
  await page.fill('#sales-surface', '1234,56');
  await page.fill('#sales-price-m2', '123456');
  await page.fill('#sales-client', 'Client Test');
  await page.evaluate(() => {
    window.__printed = [];
    window.print = () => window.__printed.push(document.title);
  });
  await page.getByRole('button', { name: 'Imprimer en PDF' }).click();
  const printed = await page.evaluate(() => window.__printed);
  record('print: button opens the print dialog', printed.length === 1);
  record('print: PDF file name', printed[0] === 'Plan de paiement Honest Signature 7 - Client Test', printed[0]);

  await page.emulateMedia({ media: 'print' });
  const sheet = page.locator('#payment-plan-print');
  const sheetText = await sheet.innerText();
  record('print: only the payment plan is printed', (await sheet.isVisible()) && !(await page.locator('#nav').isVisible()) && !(await page.locator('footer').first().isVisible()));
  record('print: Emara logo', await sheet.locator('img[src="/logo-emara-forest.png"]').evaluate((img) => img.complete && img.naturalWidth > 0));
  record(
    'print: project, title, client, parking, schedule',
    /HONEST SIGNATURE 7/i.test(sheetText) &&
      sheetText.includes('Plan de paiement') &&
      sheetText.includes('Établi pour Client Test') &&
      sheetText.includes('Place de parking (obligatoire)') &&
      sheetText.includes('Superficie') &&
      /1\s?234,56\s?m²/.test(sheetText) &&
      sheetText.includes('Prix au m²') &&
      sheetText.includes('Type de bien') &&
      sheetText.includes('Appartement') &&
      !sheetText.includes('€') &&
      sheetText.includes('18 mois après la réservation') &&
      sheetText.includes('non contractuel'),
  );
  const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true });
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  record('print: fits on one A4 page', pages === 1, `${pages} page(s)`);
  await page.emulateMedia({ media: 'screen' });

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
  await page.locator('#sales-surface').fill('85');
  await page.locator('#sales-price-m2').fill('2600');
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
  // Type choice + surface + price per m² sit above the plan by design: one scroll reaches the last payment.
  record('mobile: full schedule within ~1.8 screens', lastTop < 844 * 1.8, `${Math.round(lastTop)}px`);
  await context.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n  ${results.length - failed.length}/${results.length} checks passed.\n`);
if (failed.length) process.exit(1);
