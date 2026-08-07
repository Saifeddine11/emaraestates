/**
 * The single source of truth for what ships to production.
 *
 * Every entry at the root of `out/` must be classified here as either included
 * or excluded, each with a reason. `deploy-layout.mjs` refuses to build if it
 * meets something unclassified, so a future Next.js version that starts
 * emitting a new file cannot silently be dropped from the upload — or silently
 * added to it.
 *
 * The exclusions are not cosmetic. Uploading the per-route directories breaks
 * three indexed URLs: they contain only RSC payloads and no `index.html`, the
 * `!-d` guard on the last `.htaccess` rewrite then fails, and `DirectorySlash`
 * 301s to a URL that 404s. Measured, not assumed — see DEPLOY-MAPPING.md.
 */

/** Flat `<route>.html` files, resolved by the extensionless fallback rewrite. */
export const FLAT_PAGES = [
  'index.html',
  'contact.html',
  'immobilier-luxe-marrakech.html',
  'appartement-neuf-gueliz-marrakech.html',
  'investissement-immobilier-marrakech.html',
  'offre-gueliz.html',
];

/**
 * Routes whose canonical URL carries a trailing slash are served as a real
 * directory index. `trailingSlash: false` emits them flat, so they get moved.
 */
export const SLASHED_PAGES = [
  { from: 'residences-honest-678.html', to: 'residences-honest-678/index.html' },
];

/** Build output uploaded verbatim. */
export const ASSET_DIRS = ['_next'];

/** Individual files uploaded verbatim. */
export const ASSET_FILES = [
  // Referenced by every built page as <link rel="icon" href="/favicon.ico?…">.
  // New to the document root; it does not replace the existing PNG icons,
  // which the same pages still reference.
  'favicon.ico',
];

/**
 * Everything else in `out/`, with the reason it stays behind. Matched by exact
 * name first, then by pattern.
 */
export const EXCLUDED_EXACT = {
  img: 'byte-identical duplicate of the live /img (45 MB); production already serves it',
  '404.html':
    'the 404 page is not ported — uploading this would replace the designed legacy one',
  '_not-found.html': 'Next artifact; would publish a stray /_not-found URL',
  '_not-found': 'Next artifact directory (RSC payloads only)',
};

export const EXCLUDED_PATTERNS = [
  {
    test: (name, isDir) => isDir && FLAT_PAGES.includes(`${name}.html`),
    why: 'per-route RSC payload directory — breaks the extensionless rewrite and 301s to a 404',
  },
  {
    test: (name, isDir) =>
      isDir && SLASHED_PAGES.some((p) => p.from === `${name}.html`),
    why: 'per-route RSC payload directory — the real page is placed here as index.html instead',
  },
  {
    test: (name) => name.endsWith('.txt'),
    why: 'RSC segment payload; the site navigates with plain anchors so nothing fetches it',
  },
  {
    test: (name) => name.startsWith('__next.'),
    why: 'RSC segment payload',
  },
];

/**
 * Legacy files that live in the production document root and are **not**
 * produced by the build. Listed so `deploy-check.mjs` can stage a realistic
 * document root, and so the upload instructions can name what must survive.
 *
 * `./contact/` is deliberately absent: it exists in the repo but not in
 * production, and staging it turns /contact into a redirect loop.
 */
export const LEGACY_KEEP = {
  pages: ['404.html', 'branding.html', 'formulaire.html', 'smap-immo-paris-2026.html'],
  /** Superseded by the export but 301'd away, so harmless and left alone. */
  stalePages: ['residences-honest-678.html'],
  php: ['contact.php', 'lead-gueliz.php', 'newsletter.php'],
  config: ['.htaccess', 'sitemap.xml', 'robots.txt'],
  icons: ['favicon.png', 'favicon-48x48.png', 'apple-touch-icon.png'],
  /** Still used by the four unported pages, so they cannot be pruned yet. */
  dirs: ['css', 'js', 'img'],
  /** Legacy directory that IS the canonical location for its route. */
  legacyRouteDirs: ['residences-honest-678'],
};

/** Routes to probe, with the behaviour each must show. */
export const EXPECTED_ROUTES = [
  { url: '/', status: 200, canonical: 'https://emaraestates.com/', indexed: true },
  { url: '/index.html', status: 301, to: '/' },
  { url: '/contact', status: 200, canonical: 'https://emaraestates.com/contact', indexed: true },
  { url: '/contact/', status: 301, to: '/contact' },
  { url: '/contact.html', status: 301, to: '/contact' },
  {
    url: '/residences-honest-678/',
    status: 200,
    canonical: 'https://emaraestates.com/residences-honest-678/',
    indexed: true,
  },
  { url: '/residences-honest-678', status: 301, to: '/residences-honest-678/' },
  { url: '/residences-honest-678.html', status: 301, to: '/residences-honest-678/' },
  {
    url: '/immobilier-luxe-marrakech',
    status: 200,
    canonical: 'https://emaraestates.com/immobilier-luxe-marrakech',
    indexed: true,
  },
  { url: '/immobilier-luxe-marrakech.html', status: 301, to: '/immobilier-luxe-marrakech' },
  {
    url: '/appartement-neuf-gueliz-marrakech',
    status: 200,
    canonical: 'https://emaraestates.com/appartement-neuf-gueliz-marrakech',
    indexed: true,
  },
  {
    url: '/investissement-immobilier-marrakech',
    status: 200,
    canonical: 'https://emaraestates.com/investissement-immobilier-marrakech',
    indexed: true,
  },
  /**
   * The one intentional change in this deploy: 404 in production today, because
   * the ads page was never published. `noindex, nofollow` and absent from the
   * sitemap, so it carries no SEO risk — but it must not gain a canonical.
   */
  {
    url: '/offre-gueliz',
    status: 200,
    canonical: null,
    robots: 'noindex, nofollow',
    newRoute: true,
  },
  { url: '/offre-gueliz.html', status: 301, to: '/offre-gueliz' },
  // Unported legacy pages must keep working untouched.
  { url: '/formulaire', status: 200, legacy: true },
  { url: '/smap-immo-paris-2026', status: 200, legacy: true },
  { url: '/branding', status: 200, legacy: true },
  // Endpoints and assets.
  { url: '/contact.php', status: 200, legacy: true },
  { url: '/lead-gueliz.php', status: 200, legacy: true },
  { url: '/newsletter.php', status: 200, legacy: true },
  { url: '/sitemap.xml', status: 200, legacy: true },
  { url: '/robots.txt', status: 200, legacy: true },
  { url: '/img/logo.webp', status: 200, legacy: true },
  { url: '/css/style.css', status: 200, legacy: true },
  { url: '/js/phone-input-country.js', status: 200, legacy: true },
  { url: '/does-not-exist-' + 'probe', status: 404 },
];

/** Routes rendered in a browser during the runtime pass. */
export const BROWSER_ROUTES = [
  '/',
  '/contact',
  '/residences-honest-678/',
  '/immobilier-luxe-marrakech',
  '/appartement-neuf-gueliz-marrakech',
  '/investissement-immobilier-marrakech',
  '/offre-gueliz',
];
