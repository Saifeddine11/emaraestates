/**
 * Assembles `web/deploy/` — an exact image of what should be uploaded.
 *
 * This script **never touches production**. It only reads `web/out/` and writes
 * `web/deploy/`, both local. Nothing is uploaded, no remote file is deleted,
 * and `.htaccess` is not read or written.
 *
 * Why a generated folder rather than a documented rsync incantation: the
 * exclusions are load-bearing (uploading the per-route RSC directories 301s
 * three indexed URLs into 404s) and re-typing `--exclude` flags at 1am is how
 * that gets lost. Here the upload becomes one rsync of a directory you can read
 * first.
 *
 *   node scripts/deploy-layout.mjs
 *
 * Exits non-zero if `out/` contains anything the manifest does not classify, so
 * a future Next.js version cannot quietly add or drop a file.
 */

import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ASSET_DIRS,
  ASSET_FILES,
  EXCLUDED_EXACT,
  EXCLUDED_PATTERNS,
  FLAT_PAGES,
  LEGACY_KEEP,
  SLASHED_PAGES,
  VIDEO_MEDIA_ASSETS,
} from './lib/deploy-manifest.mjs';

const WEB = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(WEB, 'out');
const DEPLOY = join(WEB, 'deploy');

const included = [];
const excluded = [];
const unclassified = [];

/* ── classify every entry at the root of out/ ─────────────────────────────── */

let entries;
try {
  entries = await readdir(OUT, { withFileTypes: true });
} catch {
  console.error('\n  out/ not found. Run `npm run build` first.\n');
  process.exit(1);
}

const willInclude = new Set([...FLAT_PAGES, ...ASSET_DIRS, ...ASSET_FILES, ...SLASHED_PAGES.map((p) => p.from)]);

for (const entry of entries) {
  const name = entry.name;
  const isDir = entry.isDirectory();

  if (willInclude.has(name)) continue;

  if (name in EXCLUDED_EXACT) {
    excluded.push({ name, why: EXCLUDED_EXACT[name] });
    continue;
  }
  const pattern = EXCLUDED_PATTERNS.find((p) => p.test(name, isDir));
  if (pattern) {
    excluded.push({ name, why: pattern.why });
    continue;
  }
  unclassified.push({ name, isDir });
}

if (unclassified.length) {
  console.error('\n  Unclassified entries in out/ — refusing to build a partial deploy image.\n');
  for (const { name, isDir } of unclassified) {
    console.error(`    ${isDir ? 'dir ' : 'file'}  ${name}`);
  }
  console.error(
    '\n  Add each to scripts/lib/deploy-manifest.mjs, either to the included\n' +
      '  lists or to EXCLUDED_EXACT / EXCLUDED_PATTERNS with a reason.\n',
  );
  process.exit(1);
}

/* ── build the image ──────────────────────────────────────────────────────── */

await rm(DEPLOY, { recursive: true, force: true });
await mkdir(DEPLOY, { recursive: true });

async function copyFile(from, to) {
  const src = join(OUT, from);
  const dest = join(DEPLOY, to);
  await mkdir(dirname(dest), { recursive: true });
  await cp(src, dest);
  const { size } = await stat(dest);
  included.push({ path: to, size, note: from === to ? '' : `moved from ${from}` });
}

for (const page of FLAT_PAGES) await copyFile(page, page);

// The canonically-slashed route becomes a real directory index, which is what
// DirectoryIndex serves and what the existing 301s already point at.
for (const { from, to } of SLASHED_PAGES) await copyFile(from, to);

for (const file of ASSET_FILES) await copyFile(file, file);

for (const dir of ASSET_DIRS) {
  await cp(join(OUT, dir), join(DEPLOY, dir), { recursive: true });
  let bytes = 0;
  let count = 0;
  const walk = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else {
        bytes += (await stat(p)).size;
        count++;
      }
    }
  };
  await walk(join(DEPLOY, dir));
  included.push({ path: `${dir}/`, size: bytes, note: `${count} files` });
}

/* Homepage carousel media — selectively lift img/videos out of excluded img/. */
{
  const videosSrc = join(OUT, 'img', 'videos');
  const videosDest = join(DEPLOY, 'img', 'videos');
  if (!(await stat(videosSrc).catch(() => null))) {
    console.error('\n  out/img/videos missing. Ensure public/img/videos exists, then rebuild.\n');
    process.exit(1);
  }
  await mkdir(join(DEPLOY, 'img'), { recursive: true });
  await cp(videosSrc, videosDest, { recursive: true });
  let bytes = 0;
  let count = 0;
  const walkVideos = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walkVideos(p);
      else {
        bytes += (await stat(p)).size;
        count++;
      }
    }
  };
  await walkVideos(videosDest);
  included.push({
    path: 'img/videos/',
    size: bytes,
    note: `${count} homepage carousel covers + mp4s`,
  });

  for (const asset of VIDEO_MEDIA_ASSETS) {
    const relative = asset.replace(/^\//, '');
    if (!(await stat(join(DEPLOY, relative)).catch(() => null))) {
      console.error(`\n  Missing carousel media in deploy image: ${asset}\n`);
      process.exit(1);
    }
  }
}

/* ── self-check: the image must not be able to break Apache routing ───────── */

const problems = [];
const deployEntries = await readdir(DEPLOY, { withFileTypes: true });

for (const entry of deployEntries) {
  if (!entry.isDirectory()) continue;
  if (ASSET_DIRS.includes(entry.name)) continue;
  // Asset trees (not routes): _next above, and img/videos for the carousel.
  if (entry.name === 'img') continue;
  // Any other directory must carry an index.html, or DirectorySlash will 301
  // requests for the extensionless URL into a directory with nothing to serve.
  const hasIndex = await stat(join(DEPLOY, entry.name, 'index.html')).catch(() => null);
  if (!hasIndex) {
    problems.push(`directory ${entry.name}/ has no index.html — would 301 to a 404`);
  }
  if (FLAT_PAGES.includes(`${entry.name}.html`)) {
    problems.push(`${entry.name}/ collides with the flat ${entry.name}.html`);
  }
}

const strays = [];
const walkAll = async (dir) => {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walkAll(p);
    else if (e.name.endsWith('.txt') || e.name.startsWith('__next.')) {
      strays.push(relative(DEPLOY, p));
    }
  }
};
await walkAll(DEPLOY);
if (strays.length) problems.push(`RSC payloads leaked into the image: ${strays.slice(0, 5).join(', ')}`);

// Only img/videos may ship; a full img/ tree would duplicate live production.
const deployImg = join(DEPLOY, 'img');
if (await stat(deployImg).catch(() => null)) {
  const imgChildren = await readdir(deployImg);
  const unexpected = imgChildren.filter((name) => name !== 'videos');
  if (unexpected.length) {
    problems.push(
      `img/ leaked unexpected entries into the image (${unexpected.join(', ')}) — only img/videos is allowed`,
    );
  }
}

/* ── manifest for review ──────────────────────────────────────────────────── */

const total = included.reduce((sum, f) => sum + f.size, 0);
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

const manifest = [
  '# web/deploy — generated upload image',
  '',
  'Generated by `npm run deploy:layout`. Do not edit by hand; re-run instead.',
  '',
  'Upload the **contents** of this folder into the production document root,',
  'merging with what is already there. Never mirror-delete at the document root.',
  '',
  '## Included',
  '',
  '| Path | Size | Note |',
  '| --- | --- | --- |',
  ...included.map((f) => `| \`${f.path}\` | ${kb(f.size)} | ${f.note} |`),
  '',
  `Total: **${kb(total)}**`,
  '',
  '## Excluded from out/',
  '',
  '| Entry | Reason |',
  '| --- | --- |',
  ...excluded.map((e) => `| \`${e.name}\` | ${e.why} |`),
  '',
  '## Must survive in production (never uploaded, never deleted)',
  '',
  ...Object.entries(LEGACY_KEEP).map(
    ([group, items]) => `- **${group}**: ${items.map((i) => `\`${i}\``).join(', ')}`,
  ),
  '',
].join('\n');

await writeFile(join(DEPLOY, 'DEPLOY-MANIFEST.md'), manifest);

/* ── report ───────────────────────────────────────────────────────────────── */

console.log('\n  Deploy image → web/deploy\n');
for (const f of included) {
  console.log(`  +  ${f.path.padEnd(42)} ${kb(f.size).padStart(9)}  ${f.note}`);
}
console.log('');
for (const e of excluded) console.log(`  -  ${e.name.padEnd(42)} ${e.why}`);
console.log(`\n  Total upload: ${kb(total)}`);

if (problems.length) {
  console.log('\n  PROBLEMS\n');
  for (const p of problems) console.log(`    ${p}`);
  console.log('');
  process.exit(1);
}

console.log(
  '\n  Self-check passed: no RSC payloads, img/videos included, no bulk img, no indexless directory.',
);
console.log('  Nothing has been uploaded. Review web/deploy/, then run `npm run deploy:check`.\n');
