/** Captures reference screenshots of the export into web/.shots/. */

import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer } from './lib/serve.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../.shots');
mkdirSync(outDir, { recursive: true });

const { server, base } = await startServer();

/** Sections worth a framed shot, per route. */
const PAGES = [
  {
    slug: 'home',
    path: '/',
    sections: [
      ['projects', '#biens'],
      ['realisations', '#nos-réalisations, [id="nos-réalisations"]'],
      ['about', '#about'],
      ['faq', '#faq'],
      ['contact', '#contact'],
    ],
  },
  {
    slug: 'honest',
    path: '/residences-honest-678/',
    sections: [
      ['summary', '#apercu'],
      ['amenities', '#prestations'],
      ['gallery', '#galerie'],
      ['typologies', '#typologies'],
      ['simulator', '#simulateur-apport'],
      ['location', '#localisation'],
      ['cta', '#contact-projet'],
    ],
  },
  {
    slug: 'contact',
    path: '/contact',
    sections: [['form', '#contactForm']],
  },
  {
    slug: 'luxe',
    path: '/immobilier-luxe-marrakech',
    sections: [
      ['services', '#services'],
      ['programs', '[aria-label="Programmes immobiliers sélectionnés"]'],
      ['faq', '#faq'],
    ],
  },
  {
    slug: 'gueliz',
    path: '/appartement-neuf-gueliz-marrakech',
    sections: [
      ['images', '[aria-label="Honest Signature 7 en images"]'],
      ['gallery', '[aria-label="Galerie Honest Signature 7 à Guéliz"]'],
      ['services', '#services'],
      ['faq', '#faq'],
    ],
  },
  {
    slug: 'invest',
    path: '/investissement-immobilier-marrakech',
    sections: [
      ['analysis', '[aria-label="Visualiser l\'opportunité avant de décider"]'],
      ['services', '#services'],
      ['faq', '#faq'],
    ],
  },
  {
    slug: 'offre-gueliz',
    path: '/offre-gueliz',
    sections: [
      ['location', '[aria-labelledby="og-loc-title"]'],
      ['amenities', '[aria-labelledby="og-amenities-title"]'],
      ['form', '#og-form'],
    ],
  },
];

const browser = await chromium.launch();

for (const { slug, path, sections } of PAGES) {
  for (const [name, viewport] of [
    ['desktop', { width: 1440, height: 900 }],
    ['mobile', { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });

    // Hero first, on a pristine scroll position: the header is translucent
    // until the page scrolls, and that first-load state is worth capturing.
    await page.waitForTimeout(2600);
    await page.screenshot({ path: join(outDir, `${slug}-${name}-hero.png`) });

    // Then walk the page so every reveal has fired before the section shots.
    // `instant` because the site sets `scroll-behavior: smooth` globally.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.5;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 110));
      }
    });

    for (const [label, selector] of sections) {
      const el = page.locator(selector).first();
      if (!(await el.count())) continue;
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1100);
      await page.screenshot({ path: join(outDir, `${slug}-${name}-${label}.png`) });
    }
    await page.close();
  }
}

await browser.close();
server.close();
console.log(`screenshots written to ${outDir}`);
