# Route preservation checklist — the three SEO landing pages

Covers `/immobilier-luxe-marrakech`, `/appartement-neuf-gueliz-marrakech` and
`/investissement-immobilier-marrakech`. They share chrome, routing shape and
section grammar, so one document holds the common contract with per-route
tables where they diverge.

Enforced by `web/scripts/verify-preservation.mjs` via the route table in
`web/scripts/lib/routes.mjs` unless marked **manual**.

---

## 0. Source of truth — no orphans this time

Unlike `/contact` and `/residences-honest-678/`, each of these exists as exactly
one file with no stale sibling directory:

| Route | File | Size |
| --- | --- | --- |
| `/immobilier-luxe-marrakech` | `immobilier-luxe-marrakech.html` | 20 KB |
| `/appartement-neuf-gueliz-marrakech` | `appartement-neuf-gueliz-marrakech.html` | 28 KB |
| `/investissement-immobilier-marrakech` | `investissement-immobilier-marrakech.html` | 23 KB |

## 1. Routing

None of the three has a dedicated `.htaccess` rule. They are served by the
generic extensionless fallback at the end of the rewrite block:

```apache
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{DOCUMENT_ROOT}/$1.html -f
RewriteRule ^(.+?)/?$ $1.html [L]
```

Consequences to respect:

- Canonical is **unslashed** for all three, matching `trailingSlash: false`.
  Export lands on `out/<slug>.html`, exactly what the fallback expects.
- `/<slug>.html` 301s to `/<slug>` (the "Autres .html publics" rule).
- The fallback's `/?$` means `/<slug>/` **also serves 200 without redirecting**.
  That duplicate is pre-existing on the live site and is absorbed by the
  canonical tag. Do not "fix" it during the port — changing it is a redirect
  change, which is out of scope.
- All three are in `sitemap.xml` unslashed.

## 2. Metadata — per route

Shared: `robots: index, follow`; `og:type: website`; `og:locale: fr_MA`;
`og:site_name: Emara Estates`; `twitter:card: summary_large_image`;
`og:image` (+ secure_url/type/width/height) =
`https://emaraestates.com/img/og-honest-signature-7.jpg`, `image/jpeg`, 1200×630;
`<html lang="fr">`. `og:url` and canonical are the unslashed route URL.

| Route | `<title>` |
| --- | --- |
| luxe | Immobilier luxe Marrakech \| Appartements neufs haut standing |
| gueliz | Appartement neuf Guéliz Marrakech \| Prix & disponibilités |
| investissement | Investir à Marrakech \| Appartements neufs à Guéliz |

Descriptions are long-tail and keyword-bearing — copy verbatim from each file,
do not paraphrase.

## 3. JSON-LD — 4 nodes each, identical shape

`WebSite` (`#website`) · `["Organization","LocalBusiness","RealEstateAgent"]`
(`#organization`, short form) · **`WebPage`** (`/<slug>#webpage`) ·
`BreadcrumbList` (`/<slug>#breadcrumb`, 2 items: Accueil → `/`, page → itself).

> **Do not add `FAQPage` schema.** All three render a FAQ accordion, and none of
> them — nor the homepage — marks it up as `FAQPage`. Adding it would be a new
> structured-data claim rather than a preservation, and it changes how the
> result can appear in search. Node 3 is `WebPage`, not `ContactPage`.

## 4. Heading order

Exact order per route, all `<br>` line breaks preserved.

**`/immobilier-luxe-marrakech`** — 1× h1, 6× h2, 1× h3:

1. h1 Immobilier luxe à Marrakech
2. h2 L'immobilier premium à Marrakech, avec une approche sélective
3. h2 Pourquoi choisir Emara Estates ?
4. h2 Programmes immobiliers sélectionnés
5. h3 Honest Signature 7 à Guéliz
6. h2 Un focus naturel sur Guéliz
7. h2 Vous cherchez un bien premium à Marrakech ?
8. h2 `Immobilier luxe<br>à Marrakech` *(FAQ section title)*

**`/appartement-neuf-gueliz-marrakech`** — 1× h1, 10× h2, 3× h3:

1. h1 Appartement neuf à Guéliz Marrakech
2. h2 Honest Signature 7 en images
3. h3 Un programme neuf à Guéliz
4. h3 Des espaces pensés pour plusieurs usages
5. h3 Plans, prix et disponibilités
6. h2 Pourquoi acheter à Guéliz ?
7. h2 Pourquoi acheter un appartement neuf à Guéliz ?
8. h2 Des appartements neufs pour plusieurs objectifs
9. h2 Un programme neuf au cœur de Guéliz
10. h2 Honest Signature 7, un programme neuf au cœur de Guéliz
11. h2 Découvrir l'appartement témoin Honest Signature 7
12. h2 Un accompagnement avant l'achat
13. h2 Recevoir les informations sur les appartements neufs à Guéliz
14. h2 `Appartement neuf<br>à Guéliz` *(FAQ section title)*

**`/investissement-immobilier-marrakech`** — 1× h1, 8× h2:

1. h1 Investissement immobilier à Marrakech
2. h2 Pourquoi Marrakech attire les investisseurs ?
3. h2 Visualiser l'opportunité avant de décider
4. h2 L'intérêt d'un appartement neuf
5. h2 Guéliz, un secteur stratégique
6. h2 Comment Emara Estates accompagne les investisseurs
7. h2 Une opportunité à étudier à Guéliz
8. h2 Un investissement doit rester étudié
9. h2 Étudier un projet d'investissement à Marrakech
10. h2 `Investissement<br>immobilier` *(FAQ section title)*

Note `cœur` with the ligature on the gueliz page, against `coeur` without it on
`/contact`. Both are authored as-is; preserve each as written.

## 5. Anchors

Each page exposes `#services` and `#faq`, plus its own FAQ answer ids:

| Route | FAQ answer ids |
| --- | --- |
| luxe | `faq-luxe-1`, `faq-luxe-2`, `faq-luxe-3` |
| gueliz | `faq-gueliz-1`, `faq-gueliz-2`, `faq-gueliz-3` |
| investissement | `faq-invest-1`, `faq-invest-2` |

The gueliz page additionally has `show-apartment-teaser-title`.

**FAQ answers must stay mounted.** The legacy accordion animates height and
keeps `.faq-answer > .faq-answer-inner` in the DOM at all times, so the answer
text is indexable whether the item is open or closed. The port must not
conditionally render answers. Each question is a `<button aria-expanded>` with
`aria-controls` pointing at a `role="region"` panel.

## 6. Conversion paths

**WhatsApp: all three use the bare, prefill-free link**
`https://wa.me/212670038899` — the same variant as `/residences-honest-678/`,
not the homepage's prefilled one and not `/contact`'s "Échange général". Three
new entries needed in `WHATSAPP_FLOAT_BY_ROUTE`, all mapping to `WHATSAPP.bare`.

**Internal links — identical set on all three:**
`/`, `/contact`, `/residences-honest-678/`, `/immobilier-luxe-marrakech`,
`/appartement-neuf-gueliz-marrakech`, `/investissement-immobilier-marrakech`,
`/#services`, `/#faq`, `/#nos-réalisations`, `/#appartement-temoin-honest`.

Each page links to the other two — that internal linking mesh is deliberate SEO
structure and must survive intact.

**No forms on any of the three.** No `/contact.php` interaction, no CRM
surface, no phone picker, no apport simulator. Conversion happens through the
WhatsApp link and links to `/contact`.

## 7. Images and alt text

Every alt is a keyword-bearing sentence and must be copied verbatim. Counts:
luxe 3 content images, gueliz 9, investissement 5 (plus shared logo `Emara
Estates` and preloader `Emara`).

The gueliz page carries the largest image set, including a gallery under
"Honest Signature 7 en images" and an appartement-témoin teaser.

## 8. Expected exceptions

Only the two that already apply site-wide:

| Exception | Reason |
| --- | --- |
| Mobile menu markup mounts on open | all destinations remain in the prerendered header |
| Preloader logo `alt=""` | decorative and `aria-hidden` |
| Skip link `#main-content` | accessibility addition; new anchor, breaks nothing |

**Resolved:** the gueliz gallery is *not* a lightbox. `js/emara-gallery.js`
binds prev/next and touch swipe only, and the figures contain no anchor. The
port therefore reuses the plain `SnapRow` carousel and no lightbox exception is
claimed on any of these three routes.

## 9. Verification — all green

`npm run check` — build, `verify-preservation.mjs` (160 checks over six routes),
`smoke.mjs` (126 checks, desktop + mobile), `form-parity.mjs` (payloads
identical). Confirmed per route:

- [x] FAQ answers present in the static HTML while collapsed — asserted in
      `smoke.mjs`, which reads each answer id out of the DOM and requires real
      text, so a future refactor to unmount-on-close fails the suite
- [x] `<br>` line breaks in the FAQ section titles render as authored
- [x] no `FAQPage` schema was introduced — `landingJsonLd` emits `WebPage` only
- [x] the cross-links between the three pages all resolve
- [x] WhatsApp float carries the bare link, not a prefilled one
- [x] `id="services"` present on each page — and on gueliz, on the *second*
      services block only, as in the source

### Findings caught during the port

Two regressions the verifier caught before they shipped, both worth recording
because neither is visible on screen:

1. `meta description` on the gueliz and invest pages was transcribed from a
   truncated console dump and diverged in its final clause. These pages exist to
   rank; a rewritten description is exactly the silent SEO loss this migration
   is meant to avoid. Fixed against the source strings.
2. `id="services"` was dropped from the luxe and invest pages when the id was
   made opt-in for gueliz (which has two services blocks and must not emit a
   duplicate id). The anchor is unreferenced today, but it was in the indexed
   markup, so it stays.
