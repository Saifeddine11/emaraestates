# Emara Estates — Migration Preservation Checklist

Baseline audit of the live static site, captured before any modernization work.
Every item here is a **contract**: the rebuilt site must satisfy it or the migration is a regression.

Audit date: 2026-08-05 · Baseline commit: `ea7babf`

Sections 5.3 and 6 describe the homepage. Each additional route gets its own
per-route checklist as it is ported:

- `/` — this document
- `/residences-honest-678/` — [ROUTE-CHECKLIST-residences-honest-678.md](ROUTE-CHECKLIST-residences-honest-678.md)
- `/contact` — [ROUTE-CHECKLIST-contact.md](ROUTE-CHECKLIST-contact.md)
- `/immobilier-luxe-marrakech`, `/appartement-neuf-gueliz-marrakech`,
  `/investissement-immobilier-marrakech` —
  [ROUTE-CHECKLIST-seo-landing-pages.md](ROUTE-CHECKLIST-seo-landing-pages.md)
- `/offre-gueliz` — [ROUTE-CHECKLIST-offre-gueliz.md](ROUTE-CHECKLIST-offre-gueliz.md)

Two forms feed live CRM flows, through **separate** funnels that must not be
merged. The contact form has its own frozen contract in
[FORM-CRM-CONTRACT.md](FORM-CRM-CONTRACT.md); the Guéliz ads lead form posts to
a different endpoint with different field names and reaches HubSpot, and is
specified in §6 of its route checklist. Both are proven by `npm run form-parity`.

`/offre-gueliz` is deliberately `noindex, nofollow` and absent from the sitemap.
It also sits outside the `(site)` route group, so it inherits none of the site
chrome or analytics — the legacy page has its own header and footer and no nav,
mobile menu, intro curtain or WhatsApp float.

---

## 1. Route contract

### 1.1 Indexed routes (in `sitemap.xml`, must never 404)

| URL | Serves today | Priority | Notes |
| --- | --- | --- | --- |
| `/` | `index.html` | 1.0 | Homepage, 1505 lines |
| `/residences-honest-678/` | `residences-honest-678/index.html` | 0.9 | **Trailing slash is canonical** |
| `/immobilier-luxe-marrakech` | `immobilier-luxe-marrakech.html` | 0.85 | No trailing slash |
| `/appartement-neuf-gueliz-marrakech` | `appartement-neuf-gueliz-marrakech.html` | 0.85 | No trailing slash |
| `/investissement-immobilier-marrakech` | `investissement-immobilier-marrakech.html` | 0.8 | No trailing slash |
| `/contact` | `contact.html` | 0.7 | **No trailing slash** — `/contact/` 301s here |

### 1.2 Live routes NOT in the sitemap (must still resolve)

| URL | Serves today | Robots | Notes |
| --- | --- | --- | --- |
| `/formulaire` | `formulaire.html` | `noindex, follow` | Long-form lead capture |
| `/offre-gueliz` | `offre-gueliz.html` | `noindex, nofollow` | Paid-ads landing page |
| `/smap-immo-paris-2026` | `smap-immo-paris-2026.html` | `index, follow` | **Indexable but absent from sitemap** — may already be indexed, must not 404 |
| `/404.html` | `404.html` | `noindex, follow` | Error document |

### 1.3 Trailing-slash asymmetry — migration hazard

The site deliberately mixes conventions:

- `/residences-honest-678/` **with** slash (`/residences-honest-678` → 301 → slashed)
- `/contact` **without** slash (`/contact/` → 301 → unslashed)

Next.js `trailingSlash` is a single global boolean and **cannot express both**. Whichever value is
chosen, the opposite case must be handled by explicit redirects (`next.config` `redirects()`, or the
existing `.htaccess` if the site stays on Apache). Getting this wrong silently breaks two indexed URLs.

### 1.4 301 redirect map (must be reproduced exactly)

| From | To |
| --- | --- |
| `/index.html` | `/` |
| `/contact/` | `/contact` |
| `/contact.html` | `/contact` |
| `/formulaire/` | `/formulaire` |
| `/formulaire.html` | `/formulaire` |
| `/residences-honest-678` | `/residences-honest-678/` |
| `/residences-honest-678.html` | `/residences-honest-678/` |
| `/immobilier-luxe-marrakech.html` | `/immobilier-luxe-marrakech` |
| `/appartement-neuf-gueliz-marrakech.html` | `/appartement-neuf-gueliz-marrakech` |
| `/investissement-immobilier-marrakech.html` | `/investissement-immobilier-marrakech` |
| any other `/*.html` (except `/404.html`) | `/*` |
| `www.emaraestates.com/*` | `https://emaraestates.com/*` |
| `http://*` | `https://*` |

Defined in two places today, both of which must stay in sync: `.htaccess` (lines 26–48) and
`server.js` `CANONICAL_REDIRECTS` (line 925).

### 1.5 Orphan source files (exist on disk, never served at their own URL)

- `contact/index.html` — superseded by `contact.html`; `/contact/` 301s away
- `residences-honest-678.html` — superseded by `residences-honest-678/index.html`

Do **not** port these as separate routes; doing so creates duplicate indexed content.

Both orphans carry a **different `<title>`** from the file that is actually
served, so porting the wrong one is a silent SEO regression rather than an
obvious break. `web/scripts/lib/routes.mjs` pins the correct `legacy` file per
route, and the verifier diffs against that.

### 1.6 Unlinked files reachable via the `.html` fallback rule

`branding.html` (1.9 MB), `email.html`, `email2.html` are servable at `/branding`, `/email`, `/email2`
but have zero inbound links. `email*.html` are untracked email templates, not web pages.
Decision needed: exclude from the app, or keep as static passthrough.

---

## 2. Anchor contract

Verified 2026-08-05: **every anchor on every page currently resolves.** Zero broken anchors is the baseline.

### 2.1 Cross-page anchors into the homepage (linked from nav/footer sitewide)

| Anchor | Target element |
| --- | --- |
| `/#biens` | `<section class="Estates" id="biens">` |
| `/#nos-réalisations` | `<section class="realisations…" id="nos-réalisations">` — **non-ASCII id, preserve byte-for-byte** |
| `/#appartement-temoin-honest` | sr-only `<span>` inside the réalisations section |
| `/#services` | `<section class="services" id="services">` |
| `/#faq` | `<section class="faq" id="faq">` |

`#nos-réalisations` and `#appartement-temoin-honest` are distinct targets used by different links
(footer vs. main nav). Both must survive; do not collapse them.

### 2.2 Same-page anchors

| Page | Anchors |
| --- | --- |
| `/residences-honest-678/` | `#apercu`, `#typologies`, `#prestations`, `#galerie`, `#localisation`, `#contact-projet` |
| `/smap-immo-paris-2026` | `#evenement`, `#inscription` |
| `/offre-gueliz` | `#og-form` (reached via `[data-scroll-to-form]`, not an href) |
| `/` | `#visite-3d`, `#simulateur-apport`, `#localisation`, `#appartements-temoins`, `#newsletter`, `#about`, `#contact`, `#main-content` |

### 2.3 Homepage element ids referenced by JS (not navigation, but load-bearing)

`preloader`, `mobileMenu`, `nav`, `mapTitle`, `mapDivider`, `showflats-title`,
`apport-simulator-title-home`, `apport-budget-home`, `apport-typologie-home`, `apport-email-home`,
`contactForm`, `contact-name`, `contact-email`, `contact-phone`, `contact-phone-code`,
`contact-message`, `budget-select`, `company-website`, `form-feedback`,
`newsletterForm`, `newsletter-email`, `newsletter-website`, `newsletter-message`,
`projectLightbox`, `lightboxImage`, `lightboxClose`, `lightboxPrev`, `lightboxNext`,
`lightboxMeta`, `lightboxTitle`, `faq-home-1` … `faq-home-9`, `honest-1` … `honest-4`

---

## 3. Backend / form contract

Three endpoints, each mirrored in **both** PHP and `server.js`. Field names are wire contracts —
downstream HubSpot, Zapier and SMTP mappings depend on them.

| Endpoint | Aliases | Handler | Used by |
| --- | --- | --- | --- |
| `/contact.php` | `/api/contact` | `contact.php` (809 ln) / `server.js` | Contact form, apport simulator |
| `/newsletter.php` | `/api/newsletter` | `newsletter.php` (227 ln) | Homepage newsletter |
| `/lead-gueliz.php` | `/api/lead-gueliz` | `lead-gueliz.php` (316 ln) | `/offre-gueliz` ads funnel |

### 3.1 Contact payload (JSON POST)

`nom_complet`, `email`, `telephone`, `phoneFull`, `phoneCode`, `phoneCountry`, `phoneCountryCode`,
`phoneNumber`, `budget`, `message`, `jour_visite`, `source`, `company_website` (honeypot), `elapsed_ms`

### 3.2 Apport simulator payload (JSON POST → `/contact.php`)

`form_type: "apport_simulator"`, `email`, `budget_value`, `currency`, `typologie`,
`apport_mad`, `apport_eur`, `source_page`, `company_website`

### 3.3 Newsletter payload

`email`, `website` (honeypot), `page_url`

### 3.4 Guéliz lead payload — **different field names, do not merge with contact**

`fullName` (not `nom_complet`), `phone`, `phoneCountry`, `phoneCountryCode`, `projectType`,
`apartmentType`, `timeframe`, `leadSource: "Ads Landing Page"`, `adPlatform`, `campaign`, `adset`,
`ad`, `landingPageUrl`, `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm`,
`campaignId`, `adsetId`, `adId`, `referrer`, `submissionDate`, `company_website`, `elapsed_ms`

### 3.5 Select option values (exact strings — validated server-side)

- **Budget:** `1M - 1.5M MAD`, `2M - 3M MAD`, `+3M MAD` (server allow-list in `server.js` line 33)
- **Currency:** `MAD` (default), `EUR`
- **Typologie:** `Studio`, `Appartement`, `Duplex`, `Commerce`, `Je ne sais pas encore`
- **Phone code:** `+212`, `+33` (**default selected**), `+32`, `+41`, `+34`, `+31`, `+44`, `+49`, `+39`, `+1`

### 3.6 Anti-spam behavior to preserve

- Honeypot fields (`company_website` / `website`) must stay present and hidden
- `data-form-start` timestamp → `elapsed_ms`; server rejects submissions faster than 3000 ms
- Rate limit: 20 requests / hour / IP
- Blocked-terms filter for SEO-spam submissions (`server.js` line 34)

---

## 4. Conversion path contract

### 4.1 WhatsApp — number `+212670038899`, four distinct prefilled messages

| Context | Prefill (decoded) |
| --- | --- |
| Generic float / homepage CTA | "Bonjour, je vous contacte au sujet des projets immobiliers proposés par Emara Estates et j'aimerais obtenir plus d'informations. Merci" |
| Échange général | "Bonjour, je souhaite échanger avec Emara Estates au sujet d'un projet immobilier à Marrakech. Merci" |
| Disponibilités Guéliz | "Bonjour, je souhaite recevoir les disponibilités des appartements à Guéliz. Merci" |
| SMAP Paris 2026 | "Bonjour, je souhaite réserver un rendez-vous avec Emara Estates au SMAP Immo Paris 2026." |

Each must keep its own encoded `?text=` parameter — they are not interchangeable.

There is also a **fifth, prefill-free variant**: `/residences-honest-678/` uses a
bare `https://wa.me/212670038899` for both its CTA band and its floating button.

The floating button is therefore **not uniform across the site**. It is rendered
once by the root layout, so its href resolves per route through
`WHATSAPP_FLOAT_BY_ROUTE` in `lib/site.ts`:

| Route | Float prefill |
| --- | --- |
| `/` | Generic |
| `/residences-honest-678/` | none (bare link) |
| `/contact` | Échange général |

`/contact` uses the "Échange général" text for both its quick-contact tile and
its float. Adding a page without adding its entry silently gives that page the
homepage's prefilled message.

### 4.2 Other contact channels

- `tel:+212670038899`
- `mailto:contact@emaraestates.com`
- Instagram `instagram.com/emara.estates`, TikTok `@emara.estates`, Snapchat `snapchat.com/t/kQce8jwo`

### 4.3 External destinations

- 3D tour (Vertex): `https://www.vertex-france.com/PACKAGE/HONEST_SIGNATURE/HonestPrestige2/navigation/menu/index.html?nocom#model`
- Matterport showflat: `https://my.matterport.com/show/?m=QYfDKCkKrvs`
- `https://www.honestsignature.com`
- Google Maps iframe embed in footer

---

## 5. SEO contract

### 5.1 Per-page metadata — preserve verbatim

Titles, descriptions, canonicals, robots, OG and Twitter tags for all 10 routes. Homepage reference:

- **Title:** `Appartements neufs à Guéliz | Apport dès 39 000 € | Emara Estates`
- **Description:** `Devenez propriétaire d'un appartement neuf à Guéliz avec un apport dès 39 000 €. Découvrez les programmes Emara Estates, prix, plans et accompagnement à Marrakech.`
- **Canonical:** `https://emaraestates.com/`
- **OG image:** `https://emaraestates.com/img/og-honest-signature-7.jpg` (1200×630, `image/jpeg`)
- **Locale:** `fr_MA`, `<html lang="fr">`

### 5.2 Structured data

The Organization node is **not** identical across pages — the project page ships
a shorter one without `description`, `areaServed` or `knowsAbout`. Transcribe
each page's graph from its own source rather than sharing one constant.

Homepage `@graph` with three nodes, all `@id` values must be preserved:

- `https://emaraestates.com/#website` — `WebSite`
- `https://emaraestates.com/#organization` — `["Organization", "LocalBusiness", "RealEstateAgent"]`, incl. `telephone`, `PostalAddress`, `areaServed`, `knowsAbout`
- `https://emaraestates.com/#webpage` — `WebPage`

Other pages carry their own JSON-LD blocks (see per-page audit) — none may be dropped.

### 5.3 Heading hierarchy — homepage (one h1, twelve h2, one h3)

Card titles (`.property-title`, `.service-title`, `.about-value-title`) and the FAQ questions are
**not** headings in the source. Promoting them during the rebuild would change the hierarchy.

| # | Level | Text |
| --- | --- | --- |
| 1 | h1 | Apport dès 39 000 €, devenez propriétaire d'un appartement neuf à Guéliz |
| 2 | h2 | Honest Signature 7 à Guéliz Marrakech |
| 3 | h2 | Visitez Honest Signature 7 en 3D |
| 4 | h2 | Simulez votre apport pour Honest Signature 7 |
| 5 | h3 | Votre estimation d'apport |
| 6 | h2 | Le Guéliz qu'on rêvait d'habiter |
| 7 | h2 | Devenez propriétaire à 1 minute à pied du Plaza |
| 8 | h2 | 4 résidences livrées et une opportunité limitée |
| 9 | h2 | Appartements témoins |
| 10 | h2 | Recevez les nouveaux projets Emara Estates |
| 11 | h2 | Votre appartement en hyper-centre de Guéliz |
| 12 | h2 | Votre partenaire immobilier à Guéliz |
| 13 | h2 | De la visite à la remise des clés |
| 14 | h2 | Tout ce que vous devez savoir |

The `<br>` and `<em>` breaks inside headings are part of the visual design — preserve the markup shape,
not just the text.

### 5.4 Infrastructure

- `robots.txt`: `Allow: /` + sitemap reference — unchanged
- `sitemap.xml`: same 6 URLs, same priorities
- Analytics: Ahrefs `analytics.js`, `data-key="Tyd763kKZT871KqrdS45Sg"`
- Favicons: `/favicon-48x48.png`, `/favicon.png`, `/apple-touch-icon.png`

---

## 6. Section contract — homepage, in order

Section order is frozen. Nesting matters: several blocks live *inside* a parent section.

1. Preloader (`#preloader`) — logo + "Estates", fades at 2 s
2. Mobile menu (`#mobileMenu`)
3. Nav (`#nav`) — logo, 2 dropdowns, FAQ, Contact CTA, burger
4. `<main id="main-content">`
5. Hero — animated word-by-word h1, 2 CTAs, scroll dot
6. **`#biens`** — Honest Signature 7 featured card + `.estates-track` band
   - 6a. `#visite-3d` — 3D tour promo
   - 6b. `#simulateur-apport` — apport calculator
   - 6c. Photo ribbon — "Le Guéliz qu'on rêvait d'habiter"
7. Map intro (`#mapTitle`, `#mapDivider`)
8. `#localisation` — map visual
9. **`#nos-réalisations`** — Honest 1–4 sold cards carousel
   - 9a. `#appartements-temoins` — 9-slide showflat gallery + Matterport CTA
   - 9b. Honest 5 limited-availability card
10. `#newsletter`
11. CTA section — "Votre appartement en hyper-centre de Guéliz"
12. `#about` — founder portrait, values, SEO cross-links
13. Parallax quote divider
14. `#services` — 4 numbered cards
15. `#faq` — 9 accordion items + trust stats
16. `#contact` — details + form
17. Footer — 5 columns + Maps iframe
18. WhatsApp float
19. Lightbox modal (`#projectLightbox`)

Note: a stats bar exists as an HTML comment (lines 199–206) and is **not rendered**. It stays unrendered.

---

## 7. Design system to port

### 7.1 Color tokens (`:root` in `css/style.css`)

| Token | Value | Role |
| --- | --- | --- |
| `--vf` | `#2D3A2D` | Vert forêt — headings, dark sections |
| `--vo` | `#7A8B68` | Vert olive — body text, labels |
| `--mr` | `#9B7040` | Marron or — accent, CTAs |
| `--bg` | `#C8BBA8` | Beige gris — muted text on dark |
| `--cr` | `#F5F0E8` | Crème — page background |
| `--ow` | `#FAF8F4` | Blanc cassé — section backgrounds |
| `--bk` | `#1A1A1A` | Noir — body text |
| `--white` | `#fff` | — |

Non-token accents: hero price `#D2B178`, WhatsApp green `#25D366`.

### 7.2 Typography

- **Cormorant Garamond** (300/400/500 + italics) — all headings
- **Jost** (200/300/400/500) — body, UI, forms, buttons

### 7.2b Form field metrics — not cosmetic

`.contact-form input/select/textarea`: **16px** text, `18px 20px` padding, 64px
min-height, 10px radius. The 16px is load-bearing: iOS zooms the viewport when a
focused control renders below it, so anything smaller makes every mobile form
harder to fill. The port briefly shipped 15px and the mobile smoke check caught
it; all three form components now share these metrics.

### 7.3 Motion signatures — reproduce exactly in Framer Motion

- Primary reveal: `cubic-bezier(0.23, 1, 0.32, 1)`, 0.85–0.9 s
- Guéliz / step transitions: `cubic-bezier(0.22, 1, 0.36, 1)`, 0.8 s
- Hero word stagger: 48 ms per word
- Nav / buttons: 0.3–0.5 s ease

### 7.4 Keyframes in use

`preFade`, `preLineIn`, `preOut`, `heroFloat` (25 s Ken Burns), `heroReveal`, `heroLineIn`,
`heroWordAppear`, `heroUnderlineGrow`, `scrollBounce`, `photoRibbonScroll`, `propertySliderZoom`,
`mapSlideUp`, `mapFadeIn`, `ctaOutlineDraw`, `ctaSwipeDraw`, `waFloat`, `ogStepIn`

### 7.5 Breakpoint ladder

`480` → `640` → `720` → **`768`/`769` (primary split)** → `900` → `1023`/`1024`

### 7.6 Reduced motion

`prefers-reduced-motion` is already honored in four places (style.css ×2, offre-gueliz.css,
seo-scroll.js). Coverage must not regress.

---

## 8. Interactive behavior to reimplement

| Behavior | Current home | Notes |
| --- | --- | --- |
| Property slider + lightbox | ~500 ln inline in `index.html` | Autoplay, lazy slides, touch swipe, keyboard nav, focus trap |
| Gallery carousels | `emara-gallery.js` | 3 modes: `slides`, `slides-active`, `cards` |
| Phone country picker | `phone-input-country.js` | 40 countries, geo-detect via `Intl` + `navigator.languages` |
| Contact form + success modal | `contact-form.js` | Modal exposes social links |
| Apport simulator | `apport-simulator.js` | 30 % apport, EUR↔MAD at 1:10 |
| Newsletter | `newsletter.js` | — |
| Guéliz progressive form | `offre-gueliz.js` | 3 radio steps, UTM capture in `sessionStorage`, pixel tracking |
| Nav + mobile menu | `nav.js` | `.scrolled` at `scrollY > 80` |
| SEO page reveals + parallax | `seo-scroll.js` | Desktop ≥1024px only |
| FAQ accordion | inline `toggleFaq()` | Single-open |

Globals invoked from inline `onclick` attributes — must be replaced by React handlers, and every
call site updated: `toggleMobileMenu()`, `closeMobileMenu()`, `toggleFaq(this)`.

`js/main.js` is **dead code** — loaded by no page. Its logic lives inline in `index.html`.

### 8.1 Third-party tracking detected at runtime (must keep firing)

`dataLayer` (GTM), `fbq` (Meta), `ttq` (TikTok), `snaptr` (Snapchat), `gtag` (Google).
Events: `LeadFormStarted`, `LeadFormStepCompleted`, `Lead`.

---

## 9. Pre-launch verification

### 9.0 Automated checks

Two scripts in `web/scripts/` enforce parts of this document. `npm run check`
builds the export and runs both, over every route listed in
`web/scripts/lib/routes.mjs`. Porting a page means adding it to that table —
which is also where its documented exceptions live, each with a written reason.

Get the `legacy` path right when adding a route. Some routes have a stale
sibling file on disk that `.htaccess` redirects away from (see section 1.5);
comparing against the wrong one would bless content nobody serves.

**`verify-preservation.mjs`** diffs each exported page against its legacy HTML:
title, description, canonical, robots, Open Graph and Twitter tags, `<html lang>`,
every JSON-LD node *and its field values*, every anchor target, every link
destination, the heading hierarchy in order, every image `alt`, and the full
visible copy.

Anchor targets are resolved per route: `#faq` must exist on the current page,
`/#faq` must exist on the exported homepage. A cross-page link into a route that
is not ported yet is reported as a warning rather than silently skipped.

Copy is compared with whitespace stripped, because the two builds space inline
elements differently for reasons that never reach the screen. Deviations are
allowed only through the route's exception lists; anything else fails.

Exceptions are scoped to the feature that earns them. The lightbox exceptions
live in their own list rather than the shared one, so a page with no gallery —
`/contact` is the first — cannot quietly inherit an excuse it never needs.

**`smoke.mjs`** serves the export and drives every route in Chromium at 1440×900
and 390×844: console and network health, scroll reveals settling, broken images,
horizontal overflow, and each page's interactive systems — the FAQ accordion,
the apport simulator's failure path, the phone country picker, the lightbox
(open from slider and from gallery, navigate, Escape), the mobile carousels, and
the mobile menu.

**`form-parity.mjs`** is the strongest of the three, because these forms feed
paying lead flows where a renamed key is silent data loss. It serves the
untouched legacy site from the repo root *and* the export, drives both through
the same script with `fetch` stubbed, and diffs the captured request bodies:
endpoint, method, headers, credentials, the payload key set **and order**, every
value, the honeypot short-circuit, the sub-3s spam window, and the success modal.
See [FORM-CRM-CONTRACT.md](FORM-CRM-CONTRACT.md). Reading two implementations
and concluding they match is not evidence; this is.

It covers **two independent funnels**, and they must stay independent:

| | `/contact` | `/offre-gueliz` |
| --- | --- | --- |
| Endpoint | `/contact.php` | `/lead-gueliz.php` |
| Field names | `nom_complet`, `telephone`, `budget`, … | `fullName`, `phone`, `projectType`, … |
| Sinks | webhook | HubSpot Forms → HubSpot CRM → Zapier webhook |
| Payload | 14 keys | 25 keys |

`lead-gueliz.php` maps its payload keys straight onto HubSpot **internal
property names**, so renaming one key drops one CRM property while the request
still returns 200 — nothing looks broken. The Guéliz section therefore also
asserts the 18 HubSpot-mapped keys by name, that `phoneNumber`/`phoneCode` stay
*out* of the payload, that UTM capture and the `utm_source` → `adPlatform`
derivation still work, and that the endpoint is **not** the contact one. It
additionally reads the field names, ids, hidden fields and lead-flow `data-*`
hooks out of both live DOMs and diffs those, which is how two missing phone
hooks were caught. `ContactForm` is not reused there.

`elapsed_ms` is asserted **relatively** — a no-dwell submit must report less than
a 3.2s-dwell one. The previous absolute `< 3000` bound was measuring the
harness's own startup cost and started failing once the suite grew.

For `/contact`, `smoke.mjs` also fills and submits the form against a stubbed
`fetch` and asserts the captured request: the `/contact.php` endpoint, the legacy
field names, and that the four phone fields agree with one another. The dialling
country itself is **not** asserted as a fixed value — it is detected from
`navigator.languages` then the timezone, exactly as `js/phone-input-country.js`
did, so it varies with the browser. The mobile pass additionally checks that no
form control renders below 16px (iOS zooms the viewport on focus otherwise) and
that every visible control clears a 44px tap target.

The harness scrolls with `behavior: 'instant'`. The site sets
`scroll-behavior: smooth` globally, so a plain `scrollTo` animates and the
script runs ahead of where the page actually is, skipping sections and
producing flaky reveal failures.

Both must stay green. When a check legitimately needs to change, update the
exception list and its reason rather than loosening the assertion.

### 9.1 Manual checks

- [ ] All 10 routes return 200
- [ ] All 12 redirect rules return 301 to the exact target
- [ ] Trailing-slash asymmetry holds (`/contact` unslashed, `/residences-honest-678/` slashed)
- [ ] All 5 homepage anchors + all same-page anchors resolve
- [ ] `#nos-réalisations` resolves with its accented character intact
- [ ] Title, description, canonical, robots byte-identical per route
- [ ] JSON-LD `@id` values unchanged; no schema block dropped
- [ ] `sitemap.xml` and `robots.txt` served unchanged
- [ ] All 4 WhatsApp prefill variants intact
- [ ] All 3 form endpoints accept the original payload shapes
- [ ] Honeypot, `elapsed_ms` timing gate, rate limit still enforced
- [ ] Section order and heading hierarchy match section 6 and 5.3
- [ ] Ahrefs analytics script present
- [ ] No console errors on any route
- [ ] Lighthouse: performance not below current baseline; CLS ≈ 0
- [ ] `prefers-reduced-motion` honored on every animated surface
- [ ] Keyboard navigation through nav, FAQ, lightbox, and all forms
