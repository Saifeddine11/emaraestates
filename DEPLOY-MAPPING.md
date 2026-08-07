# Deployment mapping & `.htaccess` compatibility — for review

**Nothing has been deployed and `.htaccess` has not been touched.** This is the
proposal you asked for before any deployment file changes.

Everything below was **measured, not reasoned about**. Apache 2.4.66 was run
locally against the real `.htaccess` with three candidate document roots, and
every route was probed for status code and redirect chain. Production was also
probed directly to establish ground truth.

---

## 0. Headline: two findings that change the plan

### Finding 1 — a plain upload of `out/` breaks four indexed URLs

The export emits **both** `contact.html` *and* a `contact/` directory, for every
route. Those directories contain only RSC segment payloads (`__next.*.txt`) and
**no `index.html`**.

The last rule in `.htaccess` is guarded by `!-d`:

```apache
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{DOCUMENT_ROOT}/$1.html -f
RewriteRule ^(.+?)/?$ $1.html [L]
```

When a directory of that name exists, the condition fails, the rewrite never
runs, and `mod_dir`'s `DirectorySlash` issues a 301 to the trailing-slash URL —
which has no index file. Measured result:

| URL | Baseline (today) | Naive `out/` upload |
| --- | --- | --- |
| `/immobilier-luxe-marrakech` | **200** | **301 → 404** |
| `/appartement-neuf-gueliz-marrakech` | **200** | **301 → 404** |
| `/investissement-immobilier-marrakech` | **200** | **301 → 404** |
| `/offre-gueliz` | 404 (not deployed yet) | **301 → 404** |
| `/contact` | **200** | **301 loop** (`/contact` ⇄ `/contact/`) |

Three of those are in `sitemap.xml`. This is the single biggest risk in the
phase, and it is invisible until it is live.

### Finding 2 — the repo's `contact/` directory is **not** in production

Probing the live site:

```
https://emaraestates.com/contact   → 200, no redirect
```

If a `contact/` directory existed in the production document root, `/contact`
would be a redirect loop — which is exactly what my first harness run produced,
because I had staged the repo's `./contact/` folder. It is a local leftover.

**It must never be uploaded.** The same applies to `./residences-honest-678/`,
except that one *is* in production and *is* the canonical location.

Also measured on production: **`/offre-gueliz` currently returns 404.** It is a
new route, not a migration of an indexed one. Since it is `noindex, nofollow`
and absent from the sitemap, publishing it carries no SEO risk — but it is the
one intentional behaviour change in this deploy, so it should be a conscious
decision rather than a side effect.

---

## 1. Deployment mapping

Measured against local Apache with the real `.htaccess`. "Proposed" is identical
to today's behaviour in every row except the intentional `/offre-gueliz` one.

| URL | Production file after deploy | Status | Canonical | vs today |
| --- | --- | --- | --- | --- |
| `/` | `index.html` (DirectoryIndex) | 200 | `https://emaraestates.com/` | same |
| `/index.html` | — | 301 → `/` | — | same |
| `/contact` | `contact.html` (via `RewriteRule ^contact$`) | 200 | `…/contact` | same |
| `/contact/` | — | 301 → `/contact` | — | same |
| `/contact.html` | — | 301 → `/contact` | — | same |
| `/residences-honest-678/` | `residences-honest-678/index.html` | 200 | `…/residences-honest-678/` | same |
| `/residences-honest-678` | — | 301 → `/residences-honest-678/` | — | same |
| `/residences-honest-678.html` | — | 301 → `/residences-honest-678/` | — | same |
| `/immobilier-luxe-marrakech` | `immobilier-luxe-marrakech.html` (fallback) | 200 | `…/immobilier-luxe-marrakech` | same |
| `/appartement-neuf-gueliz-marrakech` | flat `.html` (fallback) | 200 | matching | same |
| `/investissement-immobilier-marrakech` | flat `.html` (fallback) | 200 | matching | same |
| `/offre-gueliz` | `offre-gueliz.html` (fallback) | **200** | **none** (by design), `noindex, nofollow` | **404 → 200** |
| `/formulaire` | `formulaire.html` (legacy, untouched) | 200 | legacy | same |
| `/smap-immo-paris-2026` | legacy, untouched | 200 | legacy | same |
| `/branding` | legacy, untouched | 200 | legacy | same |
| `/404.html`, unknown URLs | legacy `404.html` | 200 / 404 | — | same |
| `/contact.php`, `/lead-gueliz.php`, `/newsletter.php` | untouched | 200 | — | same |
| `/sitemap.xml`, `/robots.txt` | untouched | 200 | — | same |
| `/img/**`, `/css/**`, `/js/**` | untouched | 200 | — | same |

Canonical tags were read out of the actually-served bytes, including the
trailing slash on `/residences-honest-678/` and the deliberate absence of one on
`/offre-gueliz`.

**One route needs repositioning.** `trailingSlash: false` emits
`out/residences-honest-678.html`, but the canonical URL is slashed and
production serves it as a directory. The deploy step must place that file at
`residences-honest-678/index.html`. Every other route maps one-to-one.

---

## 2. `.htaccess` compatibility

### Proposed change: none

I could not find a single rule that needs to change. Measured, the proposed
layout reproduces today's routing exactly. The existing file already does what
the export needs, provided the export is laid out to match it:

| Rule | Still needed | Why |
| --- | --- | --- |
| `DirectoryIndex index.html` | yes | serves `/` and `/residences-honest-678/` |
| `ErrorDocument 404 /404.html` | yes | 404 page is not ported; legacy file stays |
| `Options -MultiViews` | yes | prevents `/contact` matching `contact.php` |
| `.env` deny | yes | `lead-gueliz.php` reads `.env` for HubSpot keys |
| `^(?:api/contact|contact\.php)$` passthrough | yes | keeps the endpoint out of SEO redirects |
| non-www + HTTPS canonical host | yes | unrelated to the export |
| the four explicit 301s | yes | still the canonical behaviour |
| generic `.html` → extensionless 301 | yes | now also covers the new flat files |
| `^contact$` / `^formulaire$` rewrites | yes | `/contact` depends on it |
| extensionless fallback (`!-f !-d`) | yes | serves the three landing pages + `/offre-gueliz` |

Two notes rather than changes:

1. The file mixes `Require all denied` with the 2.2-era `Deny from all`. That
   needs `mod_access_compat` loaded — my harness returned 500 on every URL until
   I loaded it. Production is fine (the live site works), so this is only a
   caveat for anyone rebuilding the environment.
2. `lead-gueliz.php` is **not** in the `^(?:api/contact|contact\.php)$`
   passthrough. It does not need to be: it is a real file, so `!-f` stops the
   fallback, and the `.html` 301 rule only matches `.html`. Verified 200.

### Optional, deferrable

`_next/static/**` filenames are content-hashed and immutable, so a
`Cache-Control: immutable` block would help repeat visits. It is a performance
change with zero routing effect — better folded into the Lighthouse phase than
bundled with a routing-sensitive deploy.

---

## 3. Upload structure

### Upload

| Source | Destination | Size |
| --- | --- | --- |
| `web/out/index.html` | `/index.html` | |
| `web/out/contact.html` | `/contact.html` | |
| `web/out/immobilier-luxe-marrakech.html` | same name at root | |
| `web/out/appartement-neuf-gueliz-marrakech.html` | same name at root | |
| `web/out/investissement-immobilier-marrakech.html` | same name at root | |
| `web/out/offre-gueliz.html` | `/offre-gueliz.html` | |
| `web/out/residences-honest-678.html` | **`/residences-honest-678/index.html`** | 744 KB total |
| `web/out/_next/` | `/_next/` | 1.5 MB |
| `web/out/favicon.ico` | `/favicon.ico` | 26 KB |

Total ≈ **2.3 MB**. `favicon.ico` is new to the document root — the built pages
reference it (`<link rel="icon" href="/favicon.ico?…">`), so it is required, and
it does not replace the existing PNG icons, which are still referenced too.

### Do not upload

| Item | Size | Why |
| --- | --- | --- |
| `web/out/img/` | **45 MB** | duplicate of the live `/img`; see §4 |
| `web/out/*/` route directories | small | **breaks four routes** — see Finding 1 |
| `web/out/*.txt`, `web/out/__next.*` | small | RSC payloads; nothing fetches them |
| `web/out/404.html` | | would replace the designed legacy 404 page |
| `web/out/_not-found.html`, `_not-found/` | | Next artifact; would publish a stray `/_not-found` |
| repo `./contact/` | | not in production; would cause a redirect loop |

### Do not touch (legacy files that must survive)

`404.html`, `formulaire.html`, `smap-immo-paris-2026.html`, `branding.html`,
`residences-honest-678.html` (stale but 301'd), `contact.php`,
`lead-gueliz.php`, `newsletter.php`, `.env`, `sitemap.xml`, `robots.txt`,
`css/`, `js/`, `img/`, `favicon*.png`, `apple-touch-icon.png`.

`css/` and `js/` in particular are still used by the four unported pages, so
they cannot be pruned yet.

### The generated image

Rather than retyping exclusion flags, `npm run deploy:layout` assembles
`web/deploy/` — an exact image of what should be uploaded. It reads `out/` and
writes `deploy/`, both local; it uploads nothing and does not read or write
`.htaccess`.

Every entry at the root of `out/` must be classified in
`web/scripts/lib/deploy-manifest.mjs` as either included or excluded with a
reason. The script exits non-zero on anything unclassified, so a future Next.js
version that emits a new file cannot be silently dropped from the upload — or
silently added to it. It then self-checks the result: no `.txt`/`__next.*`
payload may have leaked in, no `img/` may be present, and every directory other
than `_next/` must contain an `index.html` (a directory without one is exactly
what makes `DirectorySlash` 301 into a 404).

The image is 43 files, **2.5 MB**:

```
index.html
contact.html
immobilier-luxe-marrakech.html
appartement-neuf-gueliz-marrakech.html
investissement-immobilier-marrakech.html
offre-gueliz.html
residences-honest-678/index.html      ← moved from residences-honest-678.html
favicon.ico
_next/static/<buildId>/…              ← 3 manifests
_next/static/chunks/…                 ← 20 js + 1 css
_next/static/media/…                  ← 13 woff2 + 1 ico
DEPLOY-MANIFEST.md                    ← review artifact, not uploaded
```

`favicon.ico` is new to the document root — the built pages reference it
(`<link rel="icon" href="/favicon.ico?…">`), so it is required, and it does not
replace the existing PNG icons, which are still referenced too.

### Upload

```bash
# 1. Everything except _next, merged into the document root.
#    No --delete: the root holds the PHP endpoints, 45 MB of images and four
#    unported pages, none of which exist in the image.
rsync -av --checksum --exclude '_next' --exclude 'DEPLOY-MANIFEST.md' \
  web/deploy/ USER@HOST:/path/to/docroot/

# 2. Build assets. --delete is safe *only* here: /_next is owned entirely by
#    the build. Never add it to step 1.
rsync -av --delete web/deploy/_next/ USER@HOST:/path/to/docroot/_next/
```

The `--delete` placement is the sharpest edge in this phase: on `/_next/` it
prunes stale chunks, on the document root it would delete `formulaire.html`,
the PHP endpoints and the image library.

One caveat on step 2: the build ID directory changes every build, so `--delete`
removes the chunks that any page currently open in a visitor's browser is still
referencing. The pages are static and navigate with plain anchors, so a stale
tab degrades to unstyled-but-readable rather than breaking, but on a first
deploy it is worth dropping `--delete` and pruning `_next/` on the following
one instead.

### Verifying before upload

`npm run deploy:check` stages a document root from the legacy production files
plus `web/deploy/`, runs a real Apache against the repo's own `.htaccess`, and
checks routing, canonicals, robots and browser runtime. `npm run deploy` chains
build → layout → check.

The same script runs against a live origin, which is how to confirm the deploy
after uploading to staging or production:

```bash
node scripts/deploy-check.mjs --base=https://emaraestates.com
```

---

## 4. `/img` duplication

`web/public/img` is a symlink to the repo's `img/`, so `next build` copies all
45 MB into `out/`. Production already serves `/img` at the document root, and
the copy is byte-identical with identical paths.

**Recommendation: exclude `out/img/` and change nothing about the images.**

No path changes, no moves, no deletions — so legacy image URLs, indexed images,
OG images, gallery images and CSS background images are all untouched by
construction.

Verified rather than assumed: with `out/img` excluded and only the legacy `/img`
present, every image referenced by the new pages resolves 200 —

| Page | Images | Broken |
| --- | --- | --- |
| `/` | 54 | 0 |
| `/residences-honest-678/` | 9 | 0 |
| `/immobilier-luxe-marrakech` | 6 | 0 |
| `/offre-gueliz` | 2 | 0 |

The symlink stays: it is what lets `next/image` read intrinsic dimensions at
build time, which is what prevents layout shift. Only the *output* copy is
excluded.

---

## 5. PHP endpoints

Confirmed present, unmodified, and not shadowed by any exported file:

| File | Role | After deploy |
| --- | --- | --- |
| `contact.php` | `/contact` form → webhook | 200, untouched |
| `lead-gueliz.php` | `/offre-gueliz` → HubSpot Forms → HubSpot CRM → Zapier | 200, untouched |
| `newsletter.php` | footer newsletter | 200, untouched |
| `.env` | HubSpot/webhook credentials read by both | still denied by `<FilesMatch "^\.env">` |
| `server.js` | Node mirror of the PHP handlers, dev only | not deployed |

The export contains no `.php` file, so there is no possibility of overwriting
one. `Options -MultiViews` is what stops `/contact` from resolving to
`contact.php`; it is still in place.

---

## 6. Risks

| # | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| 1 | Uploading route directories → 301 → 404 on three indexed pages | **critical** | excluded by the manifest; `deploy:check` fails on it (verified by injection) |
| 2 | `rsync --delete` at the document root wipes legacy pages, PHP and images | **critical** | still the one manual step nothing can guard — `--delete` belongs only on `/_next/` |
| 3 | Uploading repo `./contact/` → `/contact` redirect loop | **high** | never enters the image; `deploy:check` detects loops |
| 4 | `out/404.html` replacing the designed 404 page | medium | excluded by the manifest |
| 5 | `residences-honest-678.html` not repositioned → indexed URL serves the old page | medium | the move is done by `deploy:layout`, not by hand |
| 6 | Stale `/_next` chunks break a tab open across the deploy | low | drop `--delete` on the first upload; prune next time |
| 7 | `/offre-gueliz` goes 404 → 200 | low, intentional | `noindex, nofollow`, absent from sitemap — confirm you want it live |
| 8 | Legacy flat `residences-honest-678.html` keeps serving stale content if `.htaccess` is ever lost | low | pre-existing; not introduced here |
| 9 | Local Apache has no PHP module, so endpoints are checked for reachability only | low | run `deploy:check --base=…` against the live host, and submit both forms once |

Rollback: the only overwritten legacy files are the six ported HTML pages. Keep
a copy of the current document root before uploading and rollback is a file
restore — the `.htaccess`, PHP endpoints and images are never modified.

---

## 7. Production validation checklist

Most of this is automated. `npm run deploy:check` runs the routing, canonical,
robots and runtime sections below against a local Apache serving the real
`.htaccess`; `node scripts/deploy-check.mjs --base=https://emaraestates.com`
runs the same 61 checks against the live origin after upload. The expectations
live in `web/scripts/lib/deploy-manifest.mjs`, so this list and the test cannot
drift apart.

Only the form submissions and the hand-driven interactions at the end are
manual.

**Local result, current image: 61/61 passed.** The guard was verified by
injecting one route directory into the image, which reproduced the production
failure exactly — `/immobilier-luxe-marrakech` became `301 →
/immobilier-luxe-marrakech/ (404)` serving the legacy 404 page as `noindex`.

### Routing — expected status and redirect chain

```
/                                     200
/index.html                           301 → /
/contact                              200            (no redirect — watch for a loop)
/contact/                             301 → /contact
/contact.html                         301 → /contact
/residences-honest-678/               200
/residences-honest-678                301 → /residences-honest-678/
/residences-honest-678.html           301 → /residences-honest-678/
/immobilier-luxe-marrakech            200            (must NOT 301 to a slash)
/appartement-neuf-gueliz-marrakech    200            (must NOT 301 to a slash)
/investissement-immobilier-marrakech  200            (must NOT 301 to a slash)
/offre-gueliz                         200
/formulaire                           200
/smap-immo-paris-2026                 200
/branding                             200
/sitemap.xml                          200
/robots.txt                           200
/contact.php                          200
/lead-gueliz.php                      200
/newsletter.php                       200
/does-not-exist                       404 → legacy 404 page
```

Any `301 → 404`, or any hop count above 1, means the route directories were
uploaded.

### Content and SEO

- [ ] each page serves the **new** build (`_next/static` present in the source)
- [ ] canonical on all six indexed pages matches §1, including the trailing slash
- [ ] `/offre-gueliz` has **no** canonical and reports `noindex, nofollow`
- [ ] no other page reports `noindex`
- [ ] JSON-LD present on the six indexed pages, absent on `/offre-gueliz`
- [ ] `sitemap.xml` still lists exactly six URLs, `/offre-gueliz` absent
- [ ] `robots.txt` unchanged
- [ ] legacy 404 page still the designed one

### Runtime — desktop and mobile

- [ ] no console errors, no failed requests
- [ ] `_next` CSS and JS all 200
- [ ] no broken images on any route
- [ ] no horizontal overflow
- [ ] nav, mobile menu, footer links
- [ ] lightbox on `/` and `/residences-honest-678/`; mobile carousels
- [ ] FAQ accordions
- [ ] all WhatsApp links, including the per-route variants
- [ ] `/offre-gueliz`: click-to-load map, sticky CTA, three scroll-to-form CTAs

### Forms — against the live endpoints

- [ ] `/contact` submits and reaches the CRM with the legacy field names
- [ ] `/offre-gueliz` completes all three steps and reaches HubSpot with all 25 keys
- [ ] newsletter submits
- [ ] a real lead lands in HubSpot **and** Zapier with the mapped properties populated

### After deploy

- [ ] Search Console: re-inspect the six indexed URLs, confirm "URL is on Google"
- [ ] Search Console: no new coverage errors after 48h
- [ ] confirm `/offre-gueliz` is **not** picked up for indexing

Steps 1–3 of the routing block and the runtime block are already automated
against real Apache. If you approve the mapping I will land that harness as
`web/scripts/deploy-check.mjs` so the same evidence can be produced against
staging or production on demand, rather than by hand.
