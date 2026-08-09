/**
 * Serves the production export the way Apache will.
 *
 * Unlike `next dev`, this shows exactly what deploys: prerendered HTML, no
 * dev overlay, no hot-reload client. Run `npm run build` first.
 */

import { startServer } from './lib/serve.mjs';

const port = Number(process.env.PORT ?? 4320);
const { base } = await startServer({ port, log: true });

console.log(`\n  Emara Estates — production export`);
console.log(`  ${base.replace('127.0.0.1', 'localhost')}\n`);
console.log(`  Serving web/out, falling back to the repo root for /img and /css.`);
console.log(`  Most PHP endpoints return 404 here; recruitment uses the Node handler at /api/recruitment/apply.\n`);
console.log(`  Ctrl+C to stop.\n`);
