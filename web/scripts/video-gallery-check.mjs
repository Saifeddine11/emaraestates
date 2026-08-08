/**
 * Behaviour check for the `#videos` gallery.
 *
 * Exercises the fan carousel and the player against the real export: covers
 * load, the fan does not overflow, the front card opens, every close path
 * unmounts the iframe, and the page under it stays locked. Run after a build:
 * `node scripts/video-gallery-check.mjs`.
 */

import { chromium } from 'playwright';
import { startServer } from './lib/serve.mjs';

const { server, base } = await startServer();
const browser = await chromium.launch();

let passes = 0;
const failures = [];

const check = (label, actual, expected) => {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passes++;
    console.log(`    PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(
      `    FAIL  ${label}\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
};

/** Network failures from the third-party player are the sandbox, not the page. */
const isPageError = (text) => !/matterport|vertex-france|youtube|vimeo|ERR_/i.test(text);

/**
 * Clicks a card the way a person would. A card behind the front one has its
 * middle covered by the card in front, so the centre-click Playwright defaults
 * to would land on the wrong element — `fraction` aims at the sliver that is
 * actually exposed.
 */
async function clickCard(page, locator, fraction = 0.5) {
  const box = await locator.boundingBox();
  await page.mouse.click(box.x + box.width * fraction, box.y + box.height * 0.5);
}

async function openSection(page) {
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  // The intro curtain covers the viewport for ~2.4s and would swallow clicks.
  await page.waitForSelector('div[aria-hidden="true"].fixed.z-9999', {
    state: 'detached',
    timeout: 15000,
  });
  const section = page.locator('#videos');
  await section.scrollIntoViewIfNeeded();
  // Covers are lazy and the band sits below the hero — give the visible cards
  // a moment to decode before asserting bitmaps.
  await page.waitForTimeout(1800);
  return section;
}

async function run(label, viewport, isMobile) {
  console.log(`\n  ${label}\n`);
  const context = await browser.newContext({
    viewport,
    isMobile,
    hasTouch: isMobile,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && isPageError(m.text())) consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  const badImages = [];
  page.on('response', (r) => {
    const path = new URL(r.url()).pathname;
    if (path.startsWith('/img/') && r.status() >= 400) badImages.push(`${path} → ${r.status()}`);
  });

  let section = await openSection(page);

  check('section is present and visible', await section.isVisible(), true);

  /* covers. The controls live in the group too, so the cards are scoped to the
     fan itself rather than to every labelled control in the carousel. */
  const cards = section.locator('[aria-roledescription="carrousel"] > div:nth-child(1) > :is(a, button)');
  check('eight cards rendered', await cards.count(), 8);

  check('no cover 404s', badImages, []);

  /* Cards parked outside the fan are legitimately still unloaded — that is what
     lazy loading is for — so only the ones actually on screen are asserted. */
  const brokenVisible = await section.locator('img').evaluateAll((imgs) =>
    imgs
      .filter((i) => {
        const card = i.closest('a[aria-label], button[aria-label]');
        return card && Number(getComputedStyle(card).opacity) > 0.05;
      })
      .filter((i) => !i.complete || i.naturalWidth === 0)
      .map((i) => i.getAttribute('src')),
  );
  check('no broken covers on screen', brokenVisible, []);

  check(
    'covers are lazy-loaded',
    await section.locator('img').evaluateAll((imgs) => imgs.every((i) => i.loading === 'lazy')),
    true,
  );

  /* layout */
  check(
    'no horizontal overflow',
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 0,
    ),
    true,
  );

  /* Positions are read back rather than hard-coded, so these keep holding as
     cards go live and the fan's opening card moves. */
  const counter = async () => (await section.locator('p').filter({ hasText: '/ 08' }).first().innerText()).trim();
  const at = (position) => section.locator(`[aria-label*="(${position} sur 8)"]`);
  const front = async () => Number((await counter()).split('/')[0].trim());
  const wrap = (position) => ((position - 1 + 8) % 8) + 1;

  const opening = await front();
  check(
    'the fan opens on a card you can act on',
    /bientôt disponible/.test(await at(opening).getAttribute('aria-label')),
    false,
  );
  const waiting = await cards.evaluateAll((els) =>
    els
      .map((el) => el.getAttribute('aria-label') ?? '')
      .filter((label) => /bientôt disponible/.test(label)),
  );
  check('every card has something to open', waiting, []);

  /* nothing heavy is fetched before a click */
  check(
    'no media is mounted before a click',
    await page.locator('#videos video, #videos iframe').count(),
    0,
  );

  /* a card behind the front one comes forward instead of opening */
  const behind = wrap(opening + 1);
  await clickCard(page, at(behind), 0.88);
  await page.waitForTimeout(1000);
  check(
    'clicking a back card does not open the player',
    await page.locator('[role="dialog"]').count(),
    0,
  );
  check('clicking a back card brings it forward', await front(), behind);

  /* arrows */
  await section.getByLabel('Vidéo suivante').click();
  await page.waitForTimeout(800);
  check('next arrow advances the fan', await front(), wrap(behind + 1));
  await section.getByLabel('Vidéo précédente').click();
  await page.waitForTimeout(800);
  check('previous arrow rewinds the fan', await front(), behind);

  /* Cards marked `open: 'newTab'` are real anchors. Found by behaviour rather
     than by title, so retitling a card never breaks this. */
  const tour = section.locator('a[aria-label]');
  check('the new-tab card is an anchor, not a button', await tour.count(), 1);
  check('the new-tab card opens in a new tab', await tour.getAttribute('target'), '_blank');
  check('the new-tab card is safe', await tour.getAttribute('rel'), 'noopener noreferrer');

  /* keyboard: focusing a card brings it forward */
  const neighbour = wrap(behind + 1);
  await at(neighbour).focus();
  await page.waitForTimeout(800);
  check('focusing a card brings it forward', await front(), neighbour);

  /* --- the player --- */
  const dialog = page.locator('[role="dialog"][aria-modal="true"]');
  /** The page also carries the location map, so never count iframes globally. */
  const playerMedia = page.locator('[role="dialog"] video, [role="dialog"] iframe');
  const playerVideo = page.locator('[role="dialog"] video');

  /**
   * One click, not two. A fresh load already has the first playable card in
   * front, so a second click would land inside the player that the first one
   * opened — and focus entering a cross-origin frame is exactly the state in
   * which the parent document stops seeing key presses.
   */
  const openPlayer = async () => {
    await clickCard(page, section.locator('[aria-label^="Lire la vidéo"]').first());
    await page.waitForTimeout(700);
  };

  section = await openSection(page);
  const hasModalCard = (await section.locator('[aria-label^="Lire la vidéo"]').count()) > 0;

  if (!hasModalCard) {
    console.log('    SKIP  player — no card currently opens in the player (none has a video URL)');
  } else {
    await openPlayer();

    check('player opens on the front card', await dialog.count(), 1);
    check('media is mounted', await playerMedia.count(), 1);
    check(
      'a self-hosted file plays natively rather than in a frame',
      await playerVideo.count(),
      1,
    );
    check(
      'the player opens on the cover the card was showing',
      (await playerVideo.getAttribute('poster'))?.includes('/videos/covers/'),
      true,
    );

    /* the file actually decodes — a 404 or bad path would leave readyState 0 */
    await page.waitForTimeout(2500);
    check(
      'the video loads and reports a duration',
      await playerVideo.evaluate((v) => v.readyState >= 2 && v.duration > 1),
      true,
    );

    check(
      'body scroll is locked',
      await page.evaluate(() => getComputedStyle(document.body).overflow),
      'hidden',
    );

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    check('Escape closes the player', await dialog.count(), 0);
    check('media is unmounted on close', await playerMedia.count(), 0);
    check(
      'body scroll is restored',
      await page.evaluate(() => getComputedStyle(document.body).overflow !== 'hidden'),
      true,
    );
    check(
      'focus returns to the card that opened it',
      (
        await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')
      ).startsWith('Lire la vidéo'),
      true,
    );

    await openPlayer();
    check('player reopens', await dialog.count(), 1);
    // Top-left corner of the viewport: unambiguously the backdrop, well clear
    // of the centred dialog.
    await page.mouse.click(5, 5);
    await page.waitForTimeout(500);
    check('backdrop click closes the player', await dialog.count(), 0);
    check('backdrop close unmounts the media', await playerMedia.count(), 0);

    await openPlayer();
    await dialog.getByLabel('Fermer la vidéo').click();
    await page.waitForTimeout(500);
    check('close button closes the player', await dialog.count(), 0);
    check('close button unmounts the media', await playerMedia.count(), 0);
  }

  check('no console errors', consoleErrors, []);

  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await section.screenshot({ path: `.shots/video-gallery-${isMobile ? 'mobile' : 'desktop'}.png` });

  await context.close();
}

console.log('\n──────────────────────────────────────────────────────────');
console.log('VIDEO GALLERY CHECK');
console.log('──────────────────────────────────────────────────────────');

await run('desktop — 1440x900', { width: 1440, height: 900 }, false);
await run('mobile — 390x844', { width: 390, height: 844 }, true);

await browser.close();
server.close();

console.log('\n──────────────────────────────────────────────────────────');
if (failures.length) {
  console.log(`${failures.length} failure(s):\n  ${failures.join('\n  ')}\n`);
  process.exit(1);
}
console.log(`All ${passes} checks passed.\n`);
