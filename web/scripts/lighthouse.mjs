/**
 * Lighthouse baseline for the exported site.
 *
 * Runs against `scripts/lib/serve.mjs`, the same harness the smoke tests use.
 * That server ships no gzip and no cache headers — and neither does the
 * production `.htaccess`, so the transfer-size and caching audits reported
 * here are the ones real visitors get, not artefacts of the harness.
 *
 *   node scripts/lighthouse.mjs                 both form factors, all routes
 *   node scripts/lighthouse.mjs --mobile        mobile only
 *   node scripts/lighthouse.mjs --route=/contact --route=/
 *
 * Reports land in `web/lighthouse/` (gitignored). Run `next build` first.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';

import { ROUTES } from './lib/routes.mjs';
import { startServer } from './lib/serve.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = resolve(here, '../lighthouse');

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

/** Below these, a score is called out. They are targets, not build gates. */
const THRESHOLDS = {
  performance: 0.9,
  accessibility: 0.95,
  'best-practices': 0.95,
  seo: 1,
};

/**
 * Audits whose fix lives in Apache config rather than in the app. They are
 * still real wins, but grouping them keeps the app-side list honest.
 */
const SERVER_SIDE_AUDITS = new Set([
  'uses-text-compression',
  'uses-long-cache-ttl',
  'uses-http2',
  'redirects',
]);

const args = process.argv.slice(2);
const wantsDesktop = args.includes('--desktop');
const wantsMobile = args.includes('--mobile');
const formFactors =
  wantsDesktop === wantsMobile ? ['mobile', 'desktop'] : wantsDesktop ? ['desktop'] : ['mobile'];

const requested = args
  .filter((a) => a.startsWith('--route='))
  .map((a) => a.slice('--route='.length));
const routes = requested.length
  ? requested.map((url) => {
      const known = ROUTES.find((r) => r.url === url);
      if (!known) throw new Error(`unknown route: ${url} — see scripts/lib/routes.mjs`);
      return known;
    })
  : ROUTES;

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function colour(score) {
  if (score >= 0.9) return GREEN;
  if (score >= 0.5) return YELLOW;
  return RED;
}

function pct(score) {
  return score === null ? ' — ' : String(Math.round(score * 100)).padStart(3);
}

function slug(url) {
  return url === '/' ? 'home' : url.replace(/^\/|\/$/g, '').replace(/\//g, '-');
}

function ms(value) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}

function kb(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

async function main() {
  await rm(REPORT_DIR, { recursive: true, force: true });
  await mkdir(REPORT_DIR, { recursive: true });

  const { server, base } = await startServer({ port: 0 });
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless=new', '--disable-gpu', '--no-first-run'],
  });

  const rows = [];
  const opportunities = new Map();

  try {
    for (const formFactor of formFactors) {
      for (const route of routes) {
        const url = `${base}${route.url}`;
        process.stdout.write(`${DIM}  running  ${formFactor.padEnd(7)} ${route.url}${RESET}\n`);

        const run = await lighthouse(
          url,
          {
            port: chrome.port,
            output: ['html', 'json'],
            logLevel: 'error',
            onlyCategories: CATEGORIES,
          },
          formFactor === 'desktop' ? desktopConfig : undefined,
        );

        if (!run?.lhr) throw new Error(`lighthouse returned nothing for ${route.url}`);
        const { lhr, report } = run;
        const [html, json] = report;
        const stem = join(REPORT_DIR, `${slug(route.url)}.${formFactor}`);

        await writeFile(`${stem}.html`, html);
        await writeFile(`${stem}.json`, json);

        rows.push({
          route,
          formFactor,
          scores: Object.fromEntries(
            CATEGORIES.map((id) => [id, lhr.categories[id]?.score ?? null]),
          ),
          metrics: {
            lcp: lhr.audits['largest-contentful-paint']?.numericValue ?? 0,
            cls: lhr.audits['cumulative-layout-shift']?.numericValue ?? 0,
            tbt: lhr.audits['total-blocking-time']?.numericValue ?? 0,
            weight: lhr.audits['total-byte-weight']?.numericValue ?? 0,
          },
        });

        for (const audit of Object.values(lhr.audits)) {
          const saving = audit.details?.overallSavingsMs ?? 0;
          const bytes = audit.details?.overallSavingsBytes ?? 0;
          if (audit.score === 1 || audit.score === null) continue;
          if (saving < 50 && bytes < 20_000) continue;

          const entry = opportunities.get(audit.id) ?? {
            title: audit.title,
            serverSide: SERVER_SIDE_AUDITS.has(audit.id),
            ms: 0,
            bytes: 0,
            routes: new Set(),
          };
          entry.ms = Math.max(entry.ms, saving);
          entry.bytes = Math.max(entry.bytes, bytes);
          entry.routes.add(`${route.url} (${formFactor})`);
          opportunities.set(audit.id, entry);
        }
      }
    }
  } finally {
    await chrome.kill();
    server.close();
  }

  report(rows, opportunities);
}

function report(rows, opportunities) {
  const width = Math.max(...rows.map((r) => r.route.url.length), 6);

  for (const formFactor of formFactors) {
    const scoped = rows.filter((r) => r.formFactor === formFactor);
    if (!scoped.length) continue;

    console.log(`\n${'─'.repeat(width + 58)}`);
    console.log(`  ${formFactor.toUpperCase()}`);
    console.log('─'.repeat(width + 58));
    console.log(
      `  ${'route'.padEnd(width)}  perf  a11y   bp   seo` +
        `      LCP     CLS     TBT   weight`,
    );

    for (const row of scoped) {
      const cells = CATEGORIES.map((id) => {
        const score = row.scores[id];
        const flag = score !== null && score < THRESHOLDS[id] ? '' : '';
        return `${colour(score ?? 0)}${pct(score)}${RESET}${flag}`;
      }).join('  ');

      console.log(
        `  ${row.route.url.padEnd(width)}  ${cells}   ` +
          `${ms(row.metrics.lcp).padStart(6)}  ` +
          `${row.metrics.cls.toFixed(3).padStart(6)}  ` +
          `${ms(row.metrics.tbt).padStart(6)}  ` +
          `${kb(row.metrics.weight).padStart(7)}`,
      );
    }
  }

  const below = rows.flatMap((row) =>
    CATEGORIES.filter((id) => row.scores[id] !== null && row.scores[id] < THRESHOLDS[id]).map(
      (id) => `${row.route.url} (${row.formFactor}) — ${id} ${Math.round(row.scores[id] * 100)}`,
    ),
  );

  console.log(`\n${'─'.repeat(width + 58)}`);
  if (below.length) {
    console.log(`  ${YELLOW}${below.length} score(s) below target${RESET}`);
    for (const line of below) console.log(`    ${line}`);
  } else {
    console.log(`  ${GREEN}every category is at or above target${RESET}`);
  }

  const sorted = [...opportunities.entries()].sort((a, b) => b[1].ms - a[1].ms || b[1].bytes - a[1].bytes);
  const appSide = sorted.filter(([, o]) => !o.serverSide);
  const serverSide = sorted.filter(([, o]) => o.serverSide);

  const printGroup = (label, list) => {
    if (!list.length) return;
    console.log(`\n  ${label}`);
    for (const [id, o] of list) {
      const gain = [o.ms >= 50 ? ms(o.ms) : null, o.bytes >= 20_000 ? kb(o.bytes) : null]
        .filter(Boolean)
        .join(', ');
      console.log(`    ${o.title}`);
      console.log(`      ${DIM}${id} · up to ${gain} · ${o.routes.size} run(s)${RESET}`);
    }
  };

  printGroup('App-side opportunities', appSide);
  printGroup('Server-side opportunities (Apache / .htaccess, needs approval)', serverSide);

  console.log(`\n  Reports: web/lighthouse/\n`);
}

await main();
