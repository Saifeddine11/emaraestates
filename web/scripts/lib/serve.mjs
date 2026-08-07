/**
 * Static server that mimics production hosting for the exported site.
 *
 * Apache serves the Next export alongside the repo's existing `/img`, `/css`
 * and PHP endpoints, so this resolves the export first and falls back to the
 * repo root. PHP is answered with a 404 rather than the file's source, so
 * client code takes its real network-failure path instead of parsing a script
 * as JSON.
 */

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const EXPORT_DIR = resolve(here, '../../out');
export const REPO_ROOT = resolve(here, '../../..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/\/+$/, '') || '/index.html';
  const candidates = [
    join(EXPORT_DIR, clean),
    join(EXPORT_DIR, `${clean}.html`),
    join(EXPORT_DIR, clean, 'index.html'),
    join(REPO_ROOT, clean),
  ];
  return candidates.find((p) => existsSync(p) && statSync(p).isFile());
}

/** Starts the server on `port` (0 picks a free one) and resolves its base URL. */
export async function startServer({ port = 0, log = false } = {}) {
  if (!existsSync(EXPORT_DIR)) {
    throw new Error('out/ is missing — run `next build` first.');
  }

  const server = createServer((req, res) => {
    if (/\.php($|\?)/.test(req.url)) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('no php runtime here — this endpoint only exists in production');
      if (log) console.log(`  404  ${req.url}  (php, expected)`);
      return;
    }

    const file = resolveFile(req.url);
    if (!file) {
      const notFound = join(EXPORT_DIR, '404.html');
      const has404 = existsSync(notFound);
      res.writeHead(404, { 'content-type': has404 ? MIME['.html'] : 'text/plain' });
      if (has404) createReadStream(notFound).pipe(res);
      else res.end('not found');
      if (log) console.log(`  404  ${req.url}`);
      return;
    }

    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
    if (log) console.log(`  200  ${req.url}`);
  });

  await new Promise((r) => server.listen(port, r));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}
