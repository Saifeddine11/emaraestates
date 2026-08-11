/**
 * Proves the deploy image routes correctly under real Apache with the real
 * `.htaccess`, then drives every route in a browser.
 *
 * Two modes:
 *
 *   node scripts/deploy-check.mjs
 *       Stages a document root from the legacy production files plus
 *       `web/deploy/`, runs a local Apache against the repo's own `.htaccess`,
 *       and checks routing + runtime. Nothing leaves the machine.
 *
 *   node scripts/deploy-check.mjs --base=https://staging.example.com
 *       Skips Apache and runs the same checks against a live origin. Use after
 *       uploading to staging, or against production to confirm a deploy.
 *
 * This script never writes to the repo, never uploads, and never touches
 * `.htaccess` — it only reads it.
 *
 * Limitation worth knowing: the local Apache has no PHP module, so `.php` URLs
 * are checked for reachability (not shadowed by the export, not caught by a
 * redirect rule) rather than for execution. The `--base` mode against a real
 * host checks them properly.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  BROWSER_ROUTES,
  EXPECTED_ROUTES,
  LEGACY_KEEP,
  VIDEO_MEDIA_ASSETS,
} from './lib/deploy-manifest.mjs';

const WEB = fileURLToPath(new URL('..', import.meta.url));
const REPO = join(WEB, '..');
const DEPLOY = join(WEB, 'deploy');

const remoteBase = process.argv.find((a) => a.startsWith('--base='))?.slice('--base='.length);

const results = [];
const record = (name, ok, detail = '') => results.push({ name, ok, detail });

/* ── local Apache harness ─────────────────────────────────────────────────── */

function findHttpd() {
  for (const bin of ['/usr/sbin/httpd', '/usr/sbin/apache2', 'httpd', 'apache2']) {
    const probe = spawnSync(bin, ['-v'], { encoding: 'utf8' });
    if (probe.status === 0) return bin;
  }
  return null;
}

async function findModules() {
  for (const dir of ['/usr/libexec/apache2', '/usr/lib/apache2/modules']) {
    if (await stat(dir).catch(() => null)) return dir;
  }
  return null;
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
    s.on('error', reject);
  });
}

/**
 * Builds a document root that mirrors production: the legacy files that are
 * actually deployed, plus the generated deploy image on top.
 *
 * The repo's `./contact/` directory is deliberately not staged. It is not in
 * production — verified, `/contact` returns 200 there with no redirect — and
 * staging it turns `/contact` into a `/contact` ⇄ `/contact/` redirect loop.
 */
/**
 * Copies a tree, preferring an APFS clone so the 45 MB image directory costs
 * neither time nor disk. Falls back to a real copy on other filesystems.
 */
async function cloneTree(src, dest) {
  for (const flags of [['-Rc'], ['-Rl'], ['-R']]) {
    const result = spawnSync('cp', [...flags, src, dest], { encoding: 'utf8' });
    if (result.status === 0) return;
  }
  await cp(src, dest, { recursive: true });
}

async function stageDocroot(root) {
  const copy = async (name) => {
    const src = join(REPO, name);
    if (await stat(src).catch(() => null)) {
      await cp(src, join(root, name), { recursive: true });
    }
  };
  for (const group of ['pages', 'stalePages', 'php', 'config', 'icons']) {
    for (const file of LEGACY_KEEP[group]) await copy(file);
  }
  // css/ and js/ are still used by the unported pages, and img/ has to be
  // physically inside the root: Apache drops privileges to a user that cannot
  // traverse a macOS home directory, so aliasing out to the repo returns 403.
  for (const dir of LEGACY_KEEP.dirs.filter((d) => d !== 'img')) await copy(dir);
  await cloneTree(join(REPO, 'img'), join(root, 'img'));
  for (const dir of LEGACY_KEEP.legacyRouteDirs) await copy(dir);

  // The deploy image, merged on top exactly as the upload would.
  for (const entry of await readdir(DEPLOY, { withFileTypes: true })) {
    if (entry.name === 'DEPLOY-MANIFEST.md') continue;
    await cp(join(DEPLOY, entry.name), join(root, entry.name), { recursive: true });
  }
}

async function startApache() {
  const httpd = findHttpd();
  const modules = await findModules();
  if (!httpd || !modules) {
    console.error(
      '\n  No local Apache found. Install one, or run against a live origin:\n' +
        '    node scripts/deploy-check.mjs --base=https://staging.example.com\n',
    );
    process.exit(1);
  }

  const dir = await mkdtemp(join(tmpdir(), 'emara-deploy-'));
  const root = join(dir, 'docroot');
  await mkdir(root, { recursive: true });
  await stageDocroot(root);

  const port = await freePort();
  // Only LoadModule when the .so exists. On modern Ubuntu Apache, several
  // modules (e.g. unixd) are built-in and `LoadModule` fails the start.
  const mod = (name, file) => {
    const so = join(modules, file);
    return existsSync(so) ? `LoadModule ${name} "${so}"` : `# ${name} built-in or absent (${file})`;
  };
  const mimeCandidates = [
    '/etc/apache2/mime.types',
    '/etc/mime.types',
    '/private/etc/apache2/mime.types',
    '/etc/httpd/conf/mime.types',
  ];
  const typesConfig = mimeCandidates.find((p) => existsSync(p));
  const conf = `
ServerName localhost
Listen ${port}
PidFile "${dir}/httpd.pid"
ErrorLog "${dir}/error.log"
CustomLog "${dir}/access.log" common

${mod('mpm_event_module', 'mod_mpm_event.so')}
${mod('authz_core_module', 'mod_authz_core.so')}
${mod('authz_host_module', 'mod_authz_host.so')}
# The repo .htaccess still uses the 2.2-era "Deny from all" next to
# "Require all denied", which needs mod_access_compat or every URL 500s.
${mod('access_compat_module', 'mod_access_compat.so')}
${mod('unixd_module', 'mod_unixd.so')}
${mod('log_config_module', 'mod_log_config.so')}
${mod('mime_module', 'mod_mime.so')}
${mod('dir_module', 'mod_dir.so')}
${mod('alias_module', 'mod_alias.so')}
${mod('rewrite_module', 'mod_rewrite.so')}
${mod('filter_module', 'mod_filter.so')}
${mod('headers_module', 'mod_headers.so')}

${typesConfig ? `TypesConfig ${typesConfig}` : '# TypesConfig not found — using Apache defaults'}
DocumentRoot "${root}"

<Directory "${root}">
  AllowOverride All
  Options -Indexes +FollowSymLinks
  Require all granted
</Directory>
`;
  const confPath = join(dir, 'httpd.conf');
  await writeFile(confPath, conf);

  const start = spawnSync(httpd, ['-f', confPath, '-k', 'start'], { encoding: 'utf8' });
  if (start.status !== 0) {
    console.error(`\n  Apache failed to start:\n${start.stderr || start.stdout}\n`);
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 1200));
  return {
    base: `http://localhost:${port}`,
    stop: () => {
      spawnSync(httpd, ['-f', confPath, '-k', 'stop'], { encoding: 'utf8' });
    },
    dir,
  };
}

/* ── deploy image media (homepage video carousel) ─────────────────────────── */

async function checkDeployVideoMedia() {
  console.log('\n  Homepage video carousel media in web/deploy\n');
  for (const asset of VIDEO_MEDIA_ASSETS) {
    const relative = asset.replace(/^\//, '');
    const exists = Boolean(await stat(join(DEPLOY, relative)).catch(() => null));
    record(`deploy ${asset}`, exists, exists ? 'present' : 'missing from web/deploy');
    console.log(`  ${exists ? 'PASS' : 'FAIL'}  ${asset}`);
  }
}

/* ── routing ──────────────────────────────────────────────────────────────── */

/** Follows redirects by hand so the whole chain is visible, not just the end. */
async function chase(base, url, max = 6) {
  const chain = [];
  let current = url;
  for (let i = 0; i <= max; i++) {
    const response = await fetch(base + current, { redirect: 'manual' });
    chain.push({ url: current, status: response.status });
    if (response.status < 300 || response.status >= 400) {
      return { chain, final: current, status: response.status, body: response };
    }
    const location = response.headers.get('location');
    if (!location) return { chain, final: current, status: response.status, body: response };
    const next = new URL(location, base + current);
    current = next.pathname + next.search;
    if (chain.some((hop) => hop.url === current)) {
      return { chain, final: current, status: response.status, loop: true };
    }
  }
  return { chain, final: current, status: 0, tooManyHops: true };
}

async function checkRouting(base) {
  console.log('\n  Routing\n');
  for (const route of EXPECTED_ROUTES) {
    // Large mp4s: HEAD only — we need reachability, not the bytes.
    if (route.videoMedia) {
      const response = await fetch(base + route.url, { method: 'HEAD', redirect: 'manual' });
      const ok = response.status === route.status;
      const detail = `${response.status}${ok ? '' : `  expected ${route.status}`}`;
      record(route.url, ok, detail);
      console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${route.url.padEnd(38)} ${detail}`);
      continue;
    }

    const { chain, final, status, loop, tooManyHops } = await chase(base, route.url);
    const first = chain[0].status;
    const hops = chain.length - 1;
    const arrow = hops ? ` → ${final}` : '';

    if (loop || tooManyHops) {
      record(`${route.url}`, false, `redirect loop: ${chain.map((h) => h.url).join(' → ')}`);
      console.log(`  FAIL  ${route.url.padEnd(38)} redirect loop`);
      continue;
    }

    let ok;
    let detail = `${first}${arrow}${hops ? ` (${status})` : ''}`;
    if (route.status === 301) {
      ok = first === 301 && final === route.to && status === 200;
      if (!ok) detail += `  expected 301 → ${route.to} (200)`;
    } else {
      // A 200 route must be reached directly. A silent 301 here is exactly the
      // DirectorySlash failure this whole phase exists to prevent.
      ok = first === route.status && hops === 0;
      if (!ok) detail += `  expected ${route.status} with no redirect`;
    }
    record(route.url, ok, detail);
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${route.url.padEnd(38)} ${detail}`);
  }
}

/* ── head tags ────────────────────────────────────────────────────────────── */

async function checkHead(base) {
  console.log('\n  Canonical & robots\n');
  for (const route of EXPECTED_ROUTES.filter((r) => r.canonical !== undefined)) {
    const html = await fetch(base + route.url).then((r) => r.text());
    const canonical = html.match(/rel="canonical"\s+href="([^"]*)"/)?.[1] ?? null;
    const robots = html.match(/name="robots"\s+content="([^"]*)"/)?.[1] ?? null;
    const isNext = html.includes('_next/static');

    const canonicalOk = canonical === route.canonical;
    record(`${route.url} canonical`, canonicalOk, `${canonical ?? 'none'}`);
    console.log(
      `  ${canonicalOk ? 'PASS' : 'FAIL'}  ${route.url.padEnd(38)} canonical=${canonical ?? 'none'}`,
    );

    if (route.robots) {
      const robotsOk = robots === route.robots;
      record(`${route.url} robots`, robotsOk, `${robots}`);
      console.log(`  ${robotsOk ? 'PASS' : 'FAIL'}  ${route.url.padEnd(38)} robots=${robots}`);
    } else if (route.indexed) {
      const notBlocked = !robots || !/noindex/.test(robots);
      record(`${route.url} is indexable`, notBlocked, `${robots ?? 'default'}`);
      console.log(
        `  ${notBlocked ? 'PASS' : 'FAIL'}  ${route.url.padEnd(38)} robots=${robots ?? 'default'}`,
      );
    }

    record(`${route.url} serves the new build`, isNext);
    if (!isNext) console.log(`  FAIL  ${route.url.padEnd(38)} not the Next build`);
  }
}

/* ── runtime ──────────────────────────────────────────────────────────────── */

async function checkRuntime(base) {
  console.log('\n  Runtime (desktop + mobile)\n');
  const browser = await chromium.launch();
  for (const route of BROWSER_ROUTES) {
    for (const [name, viewport, extra] of [
      ['desktop', { width: 1440, height: 900 }, {}],
      ['mobile', { width: 390, height: 844 }, { isMobile: true, hasTouch: true }],
    ]) {
      const page = await browser.newPage({ viewport, ...extra });
      const failed = [];
      const errors = [];
      page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`));
      page.on('response', (r) => {
        if (r.status() >= 400) failed.push(`${r.status()} ${r.url().replace(base, '')}`);
      });
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(String(e)));

      await page.goto(base + route, { waitUntil: 'networkidle' });
      // Scroll so lazy images and reveals actually fire.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight * 0.8) {
          window.scrollTo({ top: y, behavior: 'instant' });
          await new Promise((r) => setTimeout(r, 60));
        }
      });
      await page.waitForTimeout(600);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      const brokenImages = await page.evaluate(() =>
        [...document.querySelectorAll('img')]
          .filter((i) => i.complete && i.naturalWidth === 0)
          .map((i) => i.getAttribute('src')),
      );
      const assets = await page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .filter((r) => r.name.includes('/_next/'))
          .length,
      );

      const ok =
        failed.length === 0 && errors.length === 0 && overflow <= 1 && brokenImages.length === 0;
      const detail = [
        failed.length ? `failed: ${failed.slice(0, 3).join(' | ')}` : '',
        errors.length ? `console: ${errors.slice(0, 2).join(' | ')}` : '',
        overflow > 1 ? `overflow ${overflow}px` : '',
        brokenImages.length ? `broken images: ${brokenImages.slice(0, 3).join(' | ')}` : '',
      ]
        .filter(Boolean)
        .join('; ');

      record(`${route} (${name})`, ok, detail);
      console.log(
        `  ${ok ? 'PASS' : 'FAIL'}  ${`${route} (${name})`.padEnd(46)} ${assets} _next assets${detail ? `  ${detail}` : ''}`,
      );
      await page.close();
    }
  }
  await browser.close();
}

/* ── run ──────────────────────────────────────────────────────────────────── */

if (!(await stat(DEPLOY).catch(() => null)) && !remoteBase) {
  console.error('\n  web/deploy not found. Run `npm run deploy:layout` first.\n');
  process.exit(1);
}

let apache = null;
let base = remoteBase;

if (remoteBase) {
  console.log(`\n  Checking live origin: ${remoteBase}`);
  console.log('  (routing comes from that host, not from the local .htaccess)');
} else {
  apache = await startApache();
  base = apache.base;
  console.log(`\n  Local Apache on ${base}`);
  console.log('  document root = legacy production files + web/deploy');
}

try {
  if (!remoteBase) await checkDeployVideoMedia();
  await checkRouting(base);
  await checkHead(base);
  await checkRuntime(base);
} finally {
  apache?.stop();
  if (apache) await rm(apache.dir, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok);
console.log('\n  ' + '─'.repeat(72));
if (failed.length) {
  console.log(`\n  ${failed.length} of ${results.length} checks failed:\n`);
  for (const f of failed) console.log(`    ${f.name} — ${f.detail}`);
  console.log('');
  process.exit(1);
}
console.log(`\n  All ${results.length} deploy checks passed. Nothing was uploaded.\n`);
