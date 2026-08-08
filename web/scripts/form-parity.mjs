/**
 * Proves the ported contact form sends the CRM byte-identical data.
 *
 * The form feeds contact.php → Zapier, so a renamed key or a dropped field is a
 * silent lead-data loss that no visual check would catch. Rather than trusting
 * a reading of both implementations, this drives the real legacy page and the
 * real export through the same script, stubs `fetch` in each, and diffs the two
 * captured request bodies.
 *
 * Run: node scripts/form-parity.mjs
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer } from './lib/serve.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

/** Serves the untouched legacy site straight from the repo root. */
function startLegacyServer() {
  const server = createServer(async (req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const file = join(REPO_ROOT, normalize(url).replace(/^(\.\.[/\\])+/, ''));
    try {
      if (!(await stat(file)).isFile()) throw new Error('not a file');
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () =>
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` }),
    );
  });
}

const VALUES = {
  name: 'Client Test',
  email: 'client@example.com',
  phone: '612345678',
  budget: '2M - 3M MAD',
  message: 'Je souhaite recevoir les plans et les disponibilités.',
};

/**
 * Honeypot and spam-window behaviour, which never reach the payload diff:
 * a filled trap must not produce a request at all, and a submission faster than
 * the server's 3s floor must still report a sub-3000 `elapsed_ms` so the server
 * silently drops it on both sides.
 */
async function captureAntiSpam(browser, url) {
  // Two separate loads: a successful fast submit opens the modal, whose
  // backdrop would swallow the second click.
  const open = async () => {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      locale: 'fr-FR',
      timezoneId: 'Europe/Paris',
    });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('#contactForm', { state: 'attached' });
    await page.evaluate(() => {
      window.__captured = null;
      window.fetch = (input, init) => {
        window.__captured = { url: String(input), body: JSON.parse(init.body) };
        return Promise.resolve(
          new Response(JSON.stringify({ message: 'ok' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      };
    });
    return page;
  };

  // Submit immediately, well inside the server's 3s spam window.
  const fastPage = await open();
  await fastPage.fill('#contact-name', VALUES.name);
  await fastPage.fill('#contact-email', VALUES.email);
  await fastPage.click('#contactForm button[type="submit"], #contactForm .btn-submit');
  await fastPage.waitForTimeout(600);
  const fast = await fastPage.evaluate(() => window.__captured?.body?.elapsed_ms ?? null);
  await fastPage.close();

  // Filling the trap must short-circuit before any request leaves the page.
  const trapPage = await open();
  await trapPage.evaluate(() => {
    const trap = document.querySelector('#company-website');
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    ).set;
    setter.call(trap, 'https://spam.example');
    trap.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await trapPage.fill('#contact-name', VALUES.name);
  await trapPage.click('#contactForm button[type="submit"], #contactForm .btn-submit');
  await trapPage.waitForTimeout(600);
  const trapped = await trapPage.evaluate(() => ({
    request: window.__captured,
    feedback: document.querySelector('#form-feedback')?.textContent?.trim() ?? '',
  }));
  await trapPage.close();

  return { fast, trapped };
}

/** Reads the success modal's visible text and destinations. */
async function captureModal(page) {
  return page.evaluate(() => {
    const modal = document.querySelector(
      '#form-success-modal, [role="dialog"][aria-modal="true"]',
    );
    if (!modal) return null;
    return {
      text: (modal.textContent ?? '').replace(/\s+/g, ' ').trim(),
      links: [...modal.querySelectorAll('a')].map((a) => a.getAttribute('href')),
    };
  });
}

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

/** Fills and submits one contact form, returning the request the page made. */
async function capture(browser, url, viewport = DESKTOP) {
  const page = await browser.newPage({
    viewport,
    ...(viewport === MOBILE ? { isMobile: true, hasTouch: true } : {}),
    // Pinned so the country auto-detection resolves identically on both sides.
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('#contactForm', { state: 'attached' });

  await page.evaluate(() => {
    window.__captured = null;
    window.fetch = (input, init) => {
      window.__captured = {
        url: String(input),
        method: init?.method,
        headers: init?.headers,
        credentials: init?.credentials,
        body: JSON.parse(init.body),
      };
      return Promise.resolve(
        new Response(JSON.stringify({ message: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    };
  });

  // The server silently drops anything submitted under 3s as bot traffic, so a
  // realistic dwell time is part of the contract being tested.
  await page.waitForTimeout(3200);

  // Pin the dial code so payload parity is about field contracts, not
  // IP/locale auto-detect (ported may resolve MA via IP while legacy stays FR).
  await page.selectOption('#contact-phone-code', 'FR');

  await page.fill('#contact-name', VALUES.name);
  await page.fill('#contact-email', VALUES.email);
  await page.fill('#contact-phone', VALUES.phone);
  await page.selectOption('#budget-select', VALUES.budget);
  await page.fill('#contact-message', VALUES.message);
  await page.click('#contactForm button[type="submit"], #contactForm .btn-submit');
  await page.waitForTimeout(900);

  const captured = await page.evaluate(() => {
    if (!window.__captured) return null;
    return {
      ...window.__captured,
      // The legacy form passes `form.action` (an absolute URL) while the port
      // passes a root-relative path. Resolve both so the comparison is about
      // where the request lands, not how the string was spelled.
      resolvedUrl: new URL(window.__captured.url, location.href).pathname,
      // `source` is `window.location.href` on both sides; the two harness
      // servers necessarily differ, so compare the rule, not the value.
      sourceIsOwnHref: window.__captured.body.source === location.href,
    };
  });
  const reset = await page.evaluate(() => ({
    name: document.querySelector('#contact-name')?.value,
  }));
  const modal = await captureModal(page);
  await page.close();
  return { captured, reset, modal, errors };
}

/* ── /offre-gueliz — a separate lead funnel ──────────────────────────────── */

/**
 * `/offre-gueliz` posts to `lead-gueliz.php`, which maps its payload keys
 * straight onto HubSpot internal property names. A renamed key drops a CRM
 * property while the request still returns 200, so nothing looks broken. These
 * captures exist to make that impossible to ship unnoticed.
 *
 * Both sides are driven by the *same* selectors — the legacy page builds them
 * from `offre-gueliz-config.js`, the port renders them from React — so the
 * script only runs at all if the ids and data hooks survived the port.
 */

/** Ad parameters, so attribution capture and platform derivation are exercised. */
const GUELIZ_QUERY =
  '?utm_source=facebook&utm_medium=cpc&utm_campaign=gueliz_launch' +
  '&utm_content=carousel_a&utm_term=appartement+neuf' +
  '&campaign_id=CID123&adset_id=ASID456&ad_id=ADID789';

const GUELIZ_VALUES = {
  projectType: 'Résidence secondaire',
  apartmentType: '2 chambres',
  timeframe: 'Dans les 6 mois',
  fullName: 'Client Test',
  phone: '612345678',
};

/** Stubs fetch and records the single request the page makes. */
async function stubFetch(page, response = { success: true, message: 'ok' }, status = 200) {
  await page.evaluate(
    ({ response, status }) => {
      window.__captured = null;
      window.fetch = (input, init) => {
        window.__captured = {
          url: String(input),
          method: init?.method,
          headers: init?.headers,
          credentials: init?.credentials,
          body: JSON.parse(init.body),
        };
        return Promise.resolve(
          new Response(JSON.stringify(response), {
            status,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      };
    },
    { response, status },
  );
}

/** Walks the three steps and fills the contact fields. */
async function fillGueliz(page, { honeypot = false } = {}) {
  const steps = [
    ['projectType', GUELIZ_VALUES.projectType],
    ['apartmentType', GUELIZ_VALUES.apartmentType],
    ['timeframe', GUELIZ_VALUES.timeframe],
  ];

  for (const [key, value] of steps) {
    const id = await page.evaluate(
      ({ key, value }) => {
        const input = [...document.querySelectorAll(`input[name="${key}"]`)].find(
          (el) => el.value === value,
        );
        return input?.id ?? null;
      },
      { key, value },
    );
    if (!id) throw new Error(`no option "${value}" for step "${key}"`);
    await page.click(`label[for="${id}"]`);
    await page.waitForTimeout(250);
    const next = page.locator(`[data-step] [data-next]:visible`).first();
    if (await next.count()) {
      await next.click();
      await page.waitForTimeout(350);
    }
  }

  await page.waitForSelector('#og-fullname', { state: 'visible' });
  // Same as contact: pin FR so IP auto-detect cannot diverge from legacy.
  await page.selectOption('#og-phone-code', 'FR');
  await page.fill('#og-fullname', GUELIZ_VALUES.fullName);
  await page.fill('#og-phone', GUELIZ_VALUES.phone);
  if (honeypot) {
    await page.evaluate(() => {
      const trap = document.querySelector('[name="company_website"]');
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      // Native setter + input event so React's controlled state also updates.
      setter.call(trap, 'https://spam.example');
      trap.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  await page.waitForTimeout(200);
}

/**
 * Reads the form's structural contract out of the live DOM: every field name,
 * id and lead-flow data hook. Compared legacy vs port so a rename cannot slip
 * through even if the payload happened to still look right.
 */
async function guelizDom(page) {
  return page.evaluate(() => {
    const form = document.querySelector('#og-lead-form');
    const controls = [...form.querySelectorAll('input, select, textarea')].map((el) => ({
      name: el.getAttribute('name'),
      id: el.id || null,
      type: el.getAttribute('type') || el.tagName.toLowerCase(),
    }));
    const hooks = [...document.querySelectorAll('*')]
      .flatMap((el) => [...el.attributes].map((attr) => attr.name))
      .filter((name) => name.startsWith('data-') && !name.startsWith('data-reveal'))
      .filter((name, index, all) => all.indexOf(name) === index)
      .sort();
    return {
      formId: form.id,
      // Neither version sets action/method: submission is fetch-driven.
      action: form.getAttribute('action'),
      method: form.getAttribute('method'),
      novalidate: form.hasAttribute('novalidate'),
      names: controls.map((c) => c.name).filter(Boolean).sort(),
      hiddenNames: controls
        .filter((c) => c.type === 'hidden')
        .map((c) => c.name)
        .sort(),
      ids: controls.map((c) => c.id).filter(Boolean).sort(),
      hooks,
      errorTargets: [...document.querySelectorAll('[data-error-for]')]
        .map((el) => el.getAttribute('data-error-for'))
        .sort(),
    };
  });
}

/** Fills and submits one Guéliz lead form, returning what the page sent. */
async function captureGueliz(browser, url, viewport = DESKTOP, options = {}) {
  const page = await browser.newPage({
    viewport,
    ...(viewport === MOBILE ? { isMobile: true, hasTouch: true } : {}),
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  });
  const errors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));

  await page.goto(url + GUELIZ_QUERY, { waitUntil: 'networkidle' });
  await page.waitForSelector('#og-lead-form [data-step]', { state: 'attached' });

  await stubFetch(page, options.response, options.status);
  await fillGueliz(page, options);

  const dom = await guelizDom(page);

  await page.click('[data-submit]');
  await page.waitForTimeout(900);

  const captured = await page.evaluate(() => {
    if (!window.__captured) return null;
    const body = window.__captured.body;
    return {
      ...window.__captured,
      resolvedUrl: new URL(window.__captured.url, location.href).pathname,
      // Both sides report their own URL; the harness origins necessarily
      // differ, so assert the rule rather than the literal value.
      landingIsOwnHref: body.landingPageUrl === location.href.split('#')[0],
    };
  });

  const ui = await page.evaluate(() => {
    const success = document.querySelector('[data-success]');
    const error = document.querySelector('[data-form-error]');
    return {
      successVisible: success ? success.getBoundingClientRect().height > 0 : false,
      successTitle: document.querySelector('[data-success-title]')?.textContent?.trim() ?? '',
      successWa: document.querySelector('[data-success-wa]')?.getAttribute('href') ?? '',
      successWaLabel:
        document.querySelector('[data-success-wa-label]')?.textContent?.trim() ?? '',
      errorText: error?.textContent?.trim() ?? '',
      formVisible: (document.querySelector('#og-lead-form')?.getBoundingClientRect().height ?? 0) > 0,
    };
  });

  await page.close();
  return { captured, dom, ui, errors, consoleErrors };
}

const legacy = await startLegacyServer();
const { server: builtServer, base: builtBase } = await startServer();
const browser = await chromium.launch();

const a = await capture(browser, `${legacy.base}/contact.html`);
const b = await capture(browser, `${builtBase}/contact`);
const mobile = await capture(browser, `${builtBase}/contact`, MOBILE);
const spamA = await captureAntiSpam(browser, `${legacy.base}/contact.html`);
const spamB = await captureAntiSpam(browser, `${builtBase}/contact`);

const legacyOgUrl = `${legacy.base}/offre-gueliz.html`;
const builtOgUrl = `${builtBase}/offre-gueliz`;
const ga = await captureGueliz(browser, legacyOgUrl);
const gb = await captureGueliz(browser, builtOgUrl);
const gMobile = await captureGueliz(browser, builtOgUrl, MOBILE);
const gTrapA = await captureGueliz(browser, legacyOgUrl, DESKTOP, { honeypot: true });
const gTrapB = await captureGueliz(browser, builtOgUrl, DESKTOP, { honeypot: true });
const gErrA = await captureGueliz(browser, legacyOgUrl, DESKTOP, {
  status: 422,
  response: { success: false, message: 'Merci d’indiquer votre nom et un numéro de téléphone valide.' },
});
const gErrB = await captureGueliz(browser, builtOgUrl, DESKTOP, {
  status: 422,
  response: { success: false, message: 'Merci d’indiquer votre nom et un numéro de téléphone valide.' },
});

await browser.close();
legacy.server.close();
builtServer.close();

/* ── report ─────────────────────────────────────────────────────────────── */

const fail = [];
const pass = [];
const check = (name, ok, detail = '') => (ok ? pass : fail).push({ name, detail });

if (!a.captured) throw new Error('legacy form never submitted — harness is wrong, not the port');
if (!b.captured) throw new Error('ported form never submitted');

check(
  'endpoint',
  a.captured.resolvedUrl === b.captured.resolvedUrl,
  `${a.captured.resolvedUrl} vs ${b.captured.resolvedUrl}`,
);
check('method', a.captured.method === b.captured.method, `${a.captured.method} vs ${b.captured.method}`);
check(
  'credentials mode',
  a.captured.credentials === b.captured.credentials,
  `${a.captured.credentials} vs ${b.captured.credentials}`,
);
check(
  'Content-Type header',
  JSON.stringify(a.captured.headers) === JSON.stringify(b.captured.headers),
  `${JSON.stringify(a.captured.headers)} vs ${JSON.stringify(b.captured.headers)}`,
);

const keysA = Object.keys(a.captured.body);
const keysB = Object.keys(b.captured.body);
check(
  'payload keys (exact set and order)',
  JSON.stringify(keysA) === JSON.stringify(keysB),
  `legacy: ${keysA.join(',')}\n      ported: ${keysB.join(',')}`,
);

for (const key of new Set([...keysA, ...keysB])) {
  const av = a.captured.body[key];
  const bv = b.captured.body[key];
  if (key === 'source') {
    // Both must report their own page URL. In production that is the same
    // https://emaraestates.com/contact for legacy and port alike; here the two
    // harness servers sit on different ports, so assert the rule instead.
    check(
      'source is the page URL (both)',
      a.captured.sourceIsOwnHref && b.captured.sourceIsOwnHref,
      `${av} | ${bv}`,
    );
    continue;
  }
  if (key === 'elapsed_ms') {
    check(`${key} (both numeric, ≥3000)`, typeof av === 'number' && typeof bv === 'number' && bv >= 3000, `${av} vs ${bv}`);
    continue;
  }
  // Both backends coerce null/'' to '' before use, so treat them as equal.
  const norm = (v) => (v === null || v === undefined ? '' : v);
  check(`${key}`, norm(av) === norm(bv), `legacy ${JSON.stringify(av)} vs ported ${JSON.stringify(bv)}`);
}

/* mobile submission must produce the same lead as desktop */
check('mobile submit reaches the endpoint', mobile.captured?.resolvedUrl === '/contact.php');
if (mobile.captured) {
  const strip = (body) => {
    const { elapsed_ms, source, ...rest } = body;
    void elapsed_ms;
    void source;
    return rest;
  };
  check(
    'mobile payload matches desktop (ignoring timer and page URL)',
    JSON.stringify(strip(mobile.captured.body)) === JSON.stringify(strip(b.captured.body)),
    JSON.stringify(strip(mobile.captured.body)).slice(0, 140),
  );
}
check('no console errors (ported, mobile)', mobile.errors.length === 0, mobile.errors.join('; '));

check('legacy resets the form on success', a.reset.name === '');
check('ported resets the form on success', b.reset.name === '');

/* anti-spam parity */
/**
 * `elapsed_ms` must measure dwell time from page load, because the server drops
 * anything under 3s as bot traffic. Asserted relatively: a submit with no dwell
 * has to report less than one that waited 3.2s. An absolute `< 3000` bound was
 * measuring the harness's own startup cost, not the page's timer, and failed
 * once the run grew longer.
 */
check(
  'elapsed_ms measures dwell time, not a constant (both sides)',
  spamA.fast !== null &&
    spamB.fast !== null &&
    spamA.fast > 0 &&
    spamB.fast > 0 &&
    spamA.fast < a.captured.body.elapsed_ms &&
    spamB.fast < b.captured.body.elapsed_ms,
  `fast legacy ${spamA.fast} < dwell ${a.captured.body.elapsed_ms}; fast ported ${spamB.fast} < dwell ${b.captured.body.elapsed_ms}`,
);
check('legacy honeypot sends no request', spamA.trapped.request === null);
check('ported honeypot sends no request', spamB.trapped.request === null);
check(
  'honeypot shows the same silent-accept message',
  spamA.trapped.feedback === spamB.trapped.feedback && spamA.trapped.feedback !== '',
  `legacy "${spamA.trapped.feedback}" vs ported "${spamB.trapped.feedback}"`,
);

/* success modal parity */
check('legacy opens a success modal', Boolean(a.modal));
check('ported opens a success modal', Boolean(b.modal));
if (a.modal && b.modal) {
  // Whitespace-stripped, like the main copy verifier: the legacy modal is built
  // from a joined string array and carries padding between blocks that JSX does
  // not emit. The words and their order are what matter.
  const words = (text) => text.replace(/\s+/g, '');
  check(
    'success modal copy',
    words(a.modal.text) === words(b.modal.text),
    `\n      legacy: ${a.modal.text}\n      ported: ${b.modal.text}`,
  );
  check(
    'success modal destinations',
    JSON.stringify(a.modal.links) === JSON.stringify(b.modal.links),
    `\n      legacy: ${JSON.stringify(a.modal.links)}\n      ported: ${JSON.stringify(b.modal.links)}`,
  );
}
check('no console errors (legacy)', a.errors.length === 0, a.errors.join('; '));
check('no console errors (ported)', b.errors.length === 0, b.errors.join('; '));

/* ── /offre-gueliz lead parity ───────────────────────────────────────────── */

const g = (name, ok, detail = '') => check(`gueliz: ${name}`, ok, detail);

if (!ga.captured) throw new Error('legacy gueliz form never submitted — harness is wrong, not the port');
if (!gb.captured) throw new Error('ported gueliz form never submitted');

/* the wire contract */
g(
  'endpoint is /lead-gueliz.php on both',
  ga.captured.resolvedUrl === gb.captured.resolvedUrl &&
    gb.captured.resolvedUrl === '/lead-gueliz.php',
  `${ga.captured.resolvedUrl} vs ${gb.captured.resolvedUrl}`,
);
g('method', ga.captured.method === gb.captured.method && gb.captured.method === 'POST');
g(
  'headers',
  JSON.stringify(ga.captured.headers) === JSON.stringify(gb.captured.headers),
  JSON.stringify(gb.captured.headers),
);
g(
  'credentials',
  ga.captured.credentials === gb.captured.credentials && gb.captured.credentials === 'same-origin',
);
g(
  'endpoint is NOT the contact endpoint',
  gb.captured.resolvedUrl !== b.captured.resolvedUrl,
  `${gb.captured.resolvedUrl} vs contact ${b.captured.resolvedUrl}`,
);

/* payload keys — the CRM mapping lives on these exact names */
const gKeysA = Object.keys(ga.captured.body);
const gKeysB = Object.keys(gb.captured.body);
g(
  'payload key set is identical',
  JSON.stringify([...gKeysA].sort()) === JSON.stringify([...gKeysB].sort()),
  `only legacy: ${gKeysA.filter((k) => !gKeysB.includes(k))} | only ported: ${gKeysB.filter((k) => !gKeysA.includes(k))}`,
);
g('payload key order is identical', JSON.stringify(gKeysA) === JSON.stringify(gKeysB));
g('payload has all 25 keys', gKeysB.length === 25, `${gKeysB.length} keys`);

/**
 * Every key HubSpot reads, by name. Spelled out rather than derived so that
 * deleting one from the component makes this list fail loudly.
 */
const HUBSPOT_MAPPED = [
  'fullName',
  'phone',
  'projectType',
  'apartmentType',
  'timeframe',
  'leadSource',
  'adPlatform',
  'campaign',
  'adset',
  'ad',
  'landingPageUrl',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'utmContent',
  'utmTerm',
  'referrer',
  'submissionDate',
];
const missingMapped = HUBSPOT_MAPPED.filter((k) => !(k in gb.captured.body));
g('every HubSpot-mapped key is present', missingMapped.length === 0, missingMapped.join(', '));

/* values — everything except the two inherently per-run fields */
const gStrip = (body) => {
  const { submissionDate, elapsed_ms, landingPageUrl, referrer, ...rest } = body;
  void submissionDate;
  void elapsed_ms;
  void landingPageUrl;
  void referrer;
  return rest;
};
g(
  'payload values identical (excluding timestamp, timer and harness URLs)',
  JSON.stringify(gStrip(ga.captured.body)) === JSON.stringify(gStrip(gb.captured.body)),
  `\n      legacy: ${JSON.stringify(gStrip(ga.captured.body))}\n      ported: ${JSON.stringify(gStrip(gb.captured.body))}`,
);
g('landingPageUrl reports the page it was sent from', ga.captured.landingIsOwnHref && gb.captured.landingIsOwnHref);
g(
  'submissionDate is an ISO timestamp on both',
  [ga, gb].every((r) => !Number.isNaN(Date.parse(r.captured.body.submissionDate))),
  `${gb.captured.body.submissionDate}`,
);
g(
  'elapsed_ms is a number on both',
  [ga, gb].every((r) => typeof r.captured.body.elapsed_ms === 'number'),
);

/* the answers themselves reach the CRM verbatim */
g(
  'step answers travel verbatim',
  gb.captured.body.projectType === GUELIZ_VALUES.projectType &&
    gb.captured.body.apartmentType === GUELIZ_VALUES.apartmentType &&
    gb.captured.body.timeframe === GUELIZ_VALUES.timeframe,
  `${gb.captured.body.projectType} / ${gb.captured.body.apartmentType} / ${gb.captured.body.timeframe}`,
);
g(
  'leadSource is the campaign constant',
  ga.captured.body.leadSource === 'Ads Landing Page' &&
    gb.captured.body.leadSource === 'Ads Landing Page',
);

/* phone: `phone` is the full international number, not the national one */
g(
  'phone is the full international number',
  gb.captured.body.phone === `${gb.captured.body.phone.startsWith('+') ? '+' : ''}${gb.captured.body.phone.replace('+', '')}` &&
    gb.captured.body.phone.endsWith(GUELIZ_VALUES.phone) &&
    gb.captured.body.phone.startsWith('+'),
  gb.captured.body.phone,
);
g(
  'phone fields match legacy exactly',
  ga.captured.body.phone === gb.captured.body.phone &&
    ga.captured.body.phoneCountry === gb.captured.body.phoneCountry &&
    ga.captured.body.phoneCountryCode === gb.captured.body.phoneCountryCode,
  `legacy ${ga.captured.body.phone}/${ga.captured.body.phoneCountry}/${ga.captured.body.phoneCountryCode} vs ported ${gb.captured.body.phone}/${gb.captured.body.phoneCountry}/${gb.captured.body.phoneCountryCode}`,
);
g(
  'phoneNumber and phoneCode stay out of the payload',
  !('phoneNumber' in gb.captured.body) && !('phoneCode' in gb.captured.body),
);

/* attribution: UTM capture and platform derivation */
g(
  'utm parameters land on the right keys',
  gb.captured.body.utmSource === 'facebook' &&
    gb.captured.body.utmMedium === 'cpc' &&
    gb.captured.body.utmCampaign === 'gueliz_launch' &&
    gb.captured.body.utmContent === 'carousel_a' &&
    gb.captured.body.utmTerm === 'appartement neuf',
  JSON.stringify({
    s: gb.captured.body.utmSource,
    m: gb.captured.body.utmMedium,
    c: gb.captured.body.utmCampaign,
  }),
);
g(
  'ad ids land on the right keys',
  gb.captured.body.campaignId === 'CID123' &&
    gb.captured.body.adsetId === 'ASID456' &&
    gb.captured.body.adId === 'ADID789' &&
    gb.captured.body.adset === 'ASID456' &&
    gb.captured.body.ad === 'ADID789',
);
g(
  'adPlatform is derived from utm_source',
  ga.captured.body.adPlatform === 'Meta' && gb.captured.body.adPlatform === 'Meta',
  `legacy ${ga.captured.body.adPlatform} vs ported ${gb.captured.body.adPlatform}`,
);
g(
  'campaign falls back to utm_campaign',
  ga.captured.body.campaign === gb.captured.body.campaign &&
    gb.captured.body.campaign === 'gueliz_launch',
);

/* the form's structural contract, read off both live DOMs */
g('form id', ga.dom.formId === gb.dom.formId && gb.dom.formId === 'og-lead-form');
g(
  'no action/method attributes (fetch-driven on both)',
  ga.dom.action === null &&
    gb.dom.action === null &&
    ga.dom.method === null &&
    gb.dom.method === null,
);
g('novalidate preserved', ga.dom.novalidate && gb.dom.novalidate);
g(
  'field names identical',
  JSON.stringify(ga.dom.names) === JSON.stringify(gb.dom.names),
  `\n      legacy: ${ga.dom.names.join(',')}\n      ported: ${gb.dom.names.join(',')}`,
);
g(
  'hidden field names identical',
  JSON.stringify(ga.dom.hiddenNames) === JSON.stringify(gb.dom.hiddenNames),
  `legacy [${ga.dom.hiddenNames}] vs ported [${gb.dom.hiddenNames}]`,
);
g(
  'field ids identical',
  JSON.stringify(ga.dom.ids) === JSON.stringify(gb.dom.ids),
  `\n      legacy: ${ga.dom.ids.join(',')}\n      ported: ${gb.dom.ids.join(',')}`,
);
g(
  'error targets identical (note: phone error keys on "telephone")',
  JSON.stringify(ga.dom.errorTargets) === JSON.stringify(gb.dom.errorTargets),
  `legacy [${ga.dom.errorTargets}] vs ported [${gb.dom.errorTargets}]`,
);
/**
 * Private DOM plumbing of `js/phone-input-country.js` — the markup its custom
 * dropdown generated plus its own init guards. Verified with a repo-wide search
 * that nothing outside that module reads them: the two hooks the *page* script
 * actually uses, `data-phone-code` and `data-phone-number`, are asserted above
 * along with every other field. The React component renders its own dropdown,
 * so these have no consumer left.
 */
const WIDGET_INTERNAL_HOOKS = [
  'data-country',
  'data-phone-button',
  'data-phone-country-touched',
  'data-phone-dropdown',
  'data-phone-input-bound',
  'data-phone-options',
  'data-phone-options-ready',
  'data-phone-search',
  'data-phone-selected-code',
  'data-phone-selected-flag',
  'data-phone-selected-name',
  'data-selected-code',
];
const missingHooks = ga.dom.hooks
  .filter((h) => !gb.dom.hooks.includes(h))
  .filter((h) => !WIDGET_INTERNAL_HOOKS.includes(h));
g('every lead-flow data-* hook still exists', missingHooks.length === 0, missingHooks.join(', '));
g(
  'the phone hooks the page script reads are present',
  ['data-phone-code', 'data-phone-number', 'data-phone-full', 'data-phone-legacy', 'data-phone-country', 'data-phone-country-code'].every(
    (h) => gb.dom.hooks.includes(h),
  ),
);

/* honeypot: silent accept, no network call */
g('legacy honeypot sends no request', gTrapA.captured === null);
g('ported honeypot sends no request', gTrapB.captured === null);
g(
  'honeypot still shows the success panel',
  gTrapA.ui.successVisible && gTrapB.ui.successVisible,
  `legacy ${gTrapA.ui.successVisible} vs ported ${gTrapB.ui.successVisible}`,
);

/* success state */
g(
  'success title identical',
  ga.ui.successTitle === gb.ui.successTitle && gb.ui.successTitle !== '',
  `legacy "${ga.ui.successTitle}" vs ported "${gb.ui.successTitle}"`,
);
g(
  'success WhatsApp destination identical',
  ga.ui.successWa === gb.ui.successWa && gb.ui.successWa.startsWith('https://wa.me/212670038899?text='),
  `\n      legacy: ${ga.ui.successWa}\n      ported: ${gb.ui.successWa}`,
);
g(
  'success WhatsApp label identical',
  ga.ui.successWaLabel === gb.ui.successWaLabel && gb.ui.successWaLabel !== '',
  `"${gb.ui.successWaLabel}"`,
);
g('form is hidden after success on both', !ga.ui.formVisible && !gb.ui.formVisible);

/* server error surfaces the server's own message */
g(
  'server error message is surfaced verbatim',
  gErrA.ui.errorText === gErrB.ui.errorText && gErrB.ui.errorText !== '',
  `legacy "${gErrA.ui.errorText}" vs ported "${gErrB.ui.errorText}"`,
);
g(
  'form stays visible after a server error',
  gErrA.ui.formVisible && gErrB.ui.formVisible && !gErrB.ui.successVisible,
);

/* mobile */
g('mobile submits the same lead', Boolean(gMobile.captured));
if (gMobile.captured) {
  g(
    'mobile payload matches desktop',
    JSON.stringify(gStrip(gMobile.captured.body)) === JSON.stringify(gStrip(gb.captured.body)),
    JSON.stringify(gStrip(gMobile.captured.body)).slice(0, 140),
  );
}

/* console health */
for (const [label, run] of [
  ['legacy', ga],
  ['ported', gb],
  ['ported mobile', gMobile],
]) {
  g(`no page errors (${label})`, run.errors.length === 0, run.errors.join('; '));
  g(`no console errors (${label})`, run.consoleErrors.length === 0, run.consoleErrors.join('; '));
}

console.log('\n  Contact form parity — legacy vs ported\n');
for (const { name, detail } of pass) console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
for (const { name, detail } of fail) console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);

console.log('\n  legacy payload:', JSON.stringify(a.captured.body, null, 2).replace(/\n/g, '\n  '));
console.log('\n  ported payload:', JSON.stringify(b.captured.body, null, 2).replace(/\n/g, '\n  '));

console.log(fail.length ? `\n${fail.length} difference(s).\n` : '\nPayloads are identical.\n');
process.exit(fail.length ? 1 : 0);
