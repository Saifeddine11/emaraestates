import type { NextConfig } from 'next';

/**
 * Static export. The build output is deployed into the existing Apache document
 * root, so the emitted file layout must match what `.htaccess` already expects:
 * flat `<route>.html` files at the root, resolved by the extensionless rewrite.
 *
 * `trailingSlash` stays false so the export emits `contact.html` rather than
 * `contact/index.html`. The one route that is canonically slashed
 * (/residences-honest-678/) is repositioned by `scripts/deploy-layout.mjs`.
 */
const nextConfig: NextConfig = {
  // The repo root also has a package-lock.json (the legacy static site), so
  // pin the workspace root to this app to keep module resolution predictable.
  turbopack: { root: __dirname },
  output: 'export',
  trailingSlash: false,
  // Required for `output: 'export'` — there is no Node image optimizer on the
  // Apache host. Sources are already hand-optimized WebP; next/image is still
  // used for its intrinsic-size CLS guard and lazy loading.
  images: { unoptimized: true },
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
};

export default nextConfig;
