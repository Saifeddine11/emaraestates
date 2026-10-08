/**
 * Serves the production export the way Apache will.
 *
 * Unlike `next dev`, this shows exactly what deploys: prerendered HTML, no
 * dev overlay, no hot-reload client. Run `npm run build` first.
 *
 * When `php` is installed, /activity.php runs for real behind a local
 * `php -S`, reading its own store in the system temp directory. No other PHP
 * endpoint is run: contact.php — the only thing that feeds that store — would
 * reach Zapier, so the local count stays at whatever that store holds.
 */

import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT, startServer } from './lib/serve.mjs';

const port = Number(process.env.PORT ?? 4320);

let activityPhp = null;
if (spawnSync('php', ['-v']).status === 0) {
  const phpPort = port + 1;
  const store = process.env.ACTIVITY_DIR || join(tmpdir(), 'emara-activity-preview');
  mkdirSync(store, { recursive: true });
  const php = spawn('php', ['-S', `127.0.0.1:${phpPort}`, '-t', REPO_ROOT], {
    cwd: REPO_ROOT,
    env: { ...process.env, ACTIVITY_DIR: store },
    stdio: 'ignore',
  });
  process.on('exit', () => php.kill());
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(0));
  activityPhp = `http://127.0.0.1:${phpPort}`;
  await new Promise((resolve) => setTimeout(resolve, 400));
}

const { base } = await startServer({ port, log: true, activityPhp });

console.log(`\n  Emara Estates — production export`);
console.log(`  ${base.replace('127.0.0.1', 'localhost')}\n`);
console.log(`  Serving web/out, falling back to the repo root for /img and /css.`);
console.log(`  Most PHP endpoints return 404 here; recruitment uses the Node handler at /api/recruitment/apply.`);
console.log(activityPhp ? `  /activity.php runs on real PHP with a local store (contact.php does not run here).` : `  php not found: /activity.php answers "disabled" and the page shows no activity band.`);
console.log(`\n  Ctrl+C to stop.\n`);
