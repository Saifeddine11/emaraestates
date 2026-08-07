# Route preservation checklist — `/offre-gueliz`

Audited before porting. This is a **paid-ads lead funnel**, not a content page:
it is deliberately `noindex, nofollow`, absent from `sitemap.xml`, and its only
job is to put leads into HubSpot and Zapier. Preservation priority here is the
**lead contract**, not search.

The form is a **separate funnel from `/contact`**. Different endpoint, different
field names, different CRM sinks. See §6 for why merging them would be silent
data loss.

---

## 1. Source files and routing

| Concern | Value |
| --- | --- |
| Page | `offre-gueliz.html` (276 lines) |
| Styles | `css/style.css` + `css/offre-gueliz.css` |
| Config | `js/offre-gueliz-config.js` — **single source of all editable content** |
| Behaviour | `js/offre-gueliz.js` (562 lines) — builds the form from the config |
| Phone module | `js/phone-input-country.js` (shared with the rest of the site) |
| Endpoint | `lead-gueliz.php` (316 lines), mirrored by `handleGuelizLead()` in `server.js` |

No orphan or duplicate source file. No `.htaccess` rule names this route.

**Live routing** — served by the generic extensionless fallback at the end of
`.htaccess`:

```
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{DOCUMENT_ROOT}/$1.html -f
RewriteRule ^(.+?)/?$ $1.html [L]
```

- `/offre-gueliz` → `offre-gueliz.html`, 200
- `/offre-gueliz.html` → 301 to `/offre-gueliz` (the global `.html` stripper)
- `/offre-gueliz/` → also 200, same pre-existing trailing-slash duplicate as the
  SEO landing pages. Harmless here because the page is `noindex`. Not "fixed".

## 2. Head — what exists and what does **not**

| Tag | Value |
| --- | --- |
| `<title>` | `Appartements neufs à Guéliz \| Prix & disponibilités — Emara Estates` |
| `meta description` | `Résidence contemporaine au cœur de Guéliz, Marrakech. Apport dès 39 000 €, livraison juin 2028. Recevez les prix et disponibilités.` |
| `meta robots` | **`noindex, nofollow`** |
| `meta theme-color` | `#F5F0E8` |
| `<html lang>` | `fr` |

**Absent — must stay absent:**

- no `<link rel="canonical">`
- no Open Graph tags
- no Twitter tags
- no JSON-LD

Next.js must not invent any of these. In particular the root layout must not
leak a default canonical or OG block onto this route, and `robots` must resolve
to `noindex, nofollow` rather than the site default. This is the single easiest
way to accidentally make an ads page indexable, so it gets its own assertion.

## 3. Chrome — this page does not use the site chrome

It has none of: the site nav, the mobile menu, the intro curtain/preloader, the
WhatsApp floating button, or the full site footer. Reusing `SiteChrome` here
would add navigation and links that the page deliberately does not have.

| Element | Detail |
| --- | --- |
| `header.og-header` | logo linking `/` (`aria-label="Emara Estates — accueil"`), + CTA button |
| Header CTA | `data-scroll-to-form`, two labels: `Recevoir les disponibilités` (full) / `Disponibilités` (short) |
| `footer.og-footer` | logo, `© 2026 Emara Estates. Tous droits réservés.`, nav `aria-label="Liens légers"` → `/` (`Accueil`), `/contact` (`Contact`) |
| Sticky mobile CTA | `data-sticky-cta`, `aria-hidden="true"`, button `tabindex="-1"`, text `Recevoir les disponibilités` |

## 4. Sections and heading order

Static HTML headings, in order:

1. `h1#og-features-title` — `Une adresse d’exception au cœur de Guéliz`
2. `h2#og-loc-title` — `Au cœur de Guéliz, le quartier le plus recherché de Marrakech`
3. `h2#og-amenities-title` — `Des prestations pensées pour votre bien-être`
4. `h2#og-form-title` — `Recevez les prix et disponibilités`
5. `h3[data-success-title]` — **empty in the static file**, filled by JS on success

At runtime the form script inserts three more `h3.og-step__question`, one per
step, between 4 and 5. See §8 for how the port handles this.

| # | Section | Notes |
| --- | --- | --- |
| 1 | `.og-section` — Caractéristiques | LCP image, 6 feature chips, CTA `Recevoir les prix et disponibilités` |
| 2 | `.og-section--tint` — Localisation | 4 benefits + click-to-load map |
| 3 | `.og-section` — Commodités | 7 amenities, `2 piscines, dont 1 chauffée` is `wide` |
| 4 | `.og-form-section#og-form` | progressive 3-step form + success panel |

Section 1 copy: label `Caractéristiques du projet`, text `Une résidence
contemporaine qui allie emplacement premium, confort absolu et prestations haut
de gamme.`

Feature chips: `Appartements neufs à Guéliz`, `À 1 min du Plaza`, `Apport dès
39 000 €`, `Livraison juin 2028`, `Du studio au 3 chambres`, `39 à 140 m²`.

Location benefits: `Hyper-centre de Guéliz`, `À proximité des commerces,
restaurants et services`, `Accès rapide aux axes principaux`, `À 1 minute du
Plaza`.

Amenities: `Jacuzzi`, `Sauna`, `Spa`, `2 piscines, dont 1 chauffée`, `Salle de
sport`, `Cinéma plein air`, `Parkings titrés`.

## 5. Images, map and CTAs

| Asset | Alt |
| --- | --- |
| `img/honest-signature-7/honest-signature-7-gueliz-marrakech-facade-01.webp` (1600×1067, `fetchpriority=high`, **not** lazy) | `Façade des appartements neufs Honest Signature 7 à Guéliz, Marrakech` |
| `/img/logo.webp` in header (1250×625, `fetchpriority=high`) | `Emara Estates` |
| `/img/logo.webp` in footer (1250×625, lazy) | `Emara Estates` |

Map is **click-to-load** — a `button[data-map-trigger]` with
`aria-label="Afficher la carte de la résidence à Guéliz"` and label `Voir la
carte — Guéliz, Marrakech`. Only on click does the iframe mount, using
`config.location.mapEmbedSrc` with `title` = `Carte de la résidence à Guéliz,
Marrakech`. Keep it lazy: eager-loading the iframe would regress mobile
performance on a paid-traffic page.

Conversion paths — there are only three, and **none of them is a prefilled
site-wide WhatsApp float**:

| CTA | Destination |
| --- | --- |
| Header / hero / sticky buttons | scroll to `#og-form` (no navigation) |
| Success panel WhatsApp | `https://wa.me/212670038899?text=` + encoded config message |
| Footer | `/` and `/contact` |

Success WhatsApp message (from `config.brand.whatsappMessage`, encoded at runtime):

> Bonjour, je vous contacte au sujet des appartements neufs à Guéliz proposés par Emara Estates et j’aimerais recevoir les prix et disponibilités. Merci.

## 6. The lead form — frozen contract

### 6.1 Element attributes

`<form id="og-lead-form" novalidate>` — **no `action`, no `method` attribute.**
Submission is `fetch`, so the endpoint lives in the config, not the markup.
Reproducing an `action="lead-gueliz.php"` would be a change, not a preservation.

| Field | `name` | `id` | Type | Notes |
| --- | --- | --- | --- | --- |
| Project type | `projectType` | `projectType-0..2` | radio | options below |
| Apartment type | `apartmentType` | `apartmentType-0..2` | radio | |
| Timeframe | `timeframe` | `timeframe-0..2` | radio | |
| Full name | `fullName` | `og-fullname` | text | `autocomplete="name"`, placeholder `Prénom et nom`, `aria-describedby="og-fullname-error"` |
| Country code | `phoneCode` | `og-phone-code` | select | `data-phone-code`, `aria-label="Indicatif pays"`, `autocomplete="tel-country-code"` |
| Phone number | `phoneNumber` | `og-phone` | tel | `data-phone-number`, `maxlength=20`, `inputmode=tel`, `autocomplete="tel-national"`, `aria-describedby="og-phone-error"` |
| Honeypot | `company_website` | — | text | `tabindex=-1`, `aria-hidden=true`, offscreen |

Hidden inputs written by the phone module — all four must exist with these
exact `name`s and `data-*` hooks:

| `name` | data hook | initial value |
| --- | --- | --- |
| `telephone` | `data-phone-legacy` | `''` |
| `phoneFull` | `data-phone-full` | `''` |
| `phoneCountry` | `data-phone-country` | `France` |
| `phoneCountryCode` | `data-phone-country-code` | `FR` |

Error nodes: `#og-fullname-error` (`data-error-for="fullName"`) and
`#og-phone-error` (`data-error-for="telephone"`). Note the phone error key is
**`telephone`**, not `phone` — that asymmetry is load-bearing for
`setFieldError`.

Other data hooks driving behaviour: `data-steps`, `data-progress`,
`data-progress-label`, `data-progress-pct`, `data-progress-bar`,
`data-form-error`, `data-fields`, `data-back`, `data-next`, `data-submit`,
`data-success`, `data-success-title`, `data-success-text`, `data-success-wa`,
`data-success-wa-label`, `data-scroll-to-form`, `data-sticky-cta`, `data-map`,
`data-map-trigger`.

Option values, verbatim (these reach HubSpot as-is):

- `projectType`: `Résidence principale`, `Résidence secondaire`, `Investissement locatif`
- `apartmentType`: `1 chambre`, `2 chambres`, `3 chambres`
- `timeframe`: `Dans les 3 mois`, `Dans les 6 mois`, `Dans les 12 mois`

### 6.2 Request

`POST` to `/lead-gueliz.php` (`config.form.endpoint`), `credentials:
'same-origin'`, headers exactly `Accept: application/json` and `Content-Type:
application/json`, body `JSON.stringify(payload)`.

### 6.3 Payload — 25 keys, exact names

`fullName`, `phone`, `phoneCountry`, `phoneCountryCode`, `projectType`,
`apartmentType`, `timeframe`, `leadSource`, `adPlatform`, `campaign`, `adset`,
`ad`, `landingPageUrl`, `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`,
`utmTerm`, `campaignId`, `adsetId`, `adId`, `referrer`, `submissionDate`,
`company_website`, `elapsed_ms`.

Notes:

- `phone` is the **full international number** (`phoneFull`), not `phoneNumber`.
- `phoneNumber` and `phoneCode` are form inputs but are **not** payload keys.
- `leadSource` is the fixed string `Ads Landing Page` from the config. The server
  overrides it with the same constant, so it is belt-and-braces, but it is still
  sent.
- `campaign` falls back: `utm_campaign || campaign_id`.
- `landingPageUrl` falls back to `window.location.href`.
- `submissionDate` is `new Date().toISOString()`; `elapsed_ms` is time since the
  first option was selected. Both are inherently per-run.

### 6.4 Why this must not be merged with `/contact`

`lead-gueliz.php` maps **client payload keys straight onto HubSpot internal
property names**:

| payload key | HubSpot property |
| --- | --- |
| `fullName` | `full_name` |
| `phone` | `phone` |
| `projectType` | `project_type` |
| `apartmentType` | `apartment_type` |
| `timeframe` | `acquisition_timeframe` |
| `leadSource` | `lead_source` |
| `adPlatform` | `advertising_platform` |
| `campaign` | `campaign` |
| `adset` | `ad_set` |
| `ad` | `advertisement` |
| `landingPageUrl` | `landing_page_url` |
| `utmSource` / `utmMedium` / `utmCampaign` / `utmContent` / `utmTerm` | same, snake_case |
| `referrer` | `referrer` |
| `submissionDate` | `submission_date` |

Renaming one client key silently drops one HubSpot property — the record still
saves, so nothing looks broken. Sinks are tried in order **hubspotForm →
hubspotCrm → webhook**, the webhook falling back to
`https://hooks.zapier.com/hooks/catch/27111467/ujcbawh/`.

`/contact` posts different keys (`nom_complet`, `telephone`, `budget`, …) to a
different endpoint with **no HubSpot involvement**. The two funnels share only
the phone module and the honeypot name. `ContactForm` is therefore **not**
reused here.

### 6.5 Behaviour

| Behaviour | Contract |
| --- | --- |
| Steps | 3; step 1 auto-advances the "next" enable on select; contact fields reveal on last step select |
| Progress | `Étape N sur 3` + `NN%`, bar width = pct |
| Back / Next / Submit | `Retour` / `Continuer` / `Recevoir les disponibilités` |
| Submitting | button disabled, label `Envoi…` |
| Validation | name ≥ 2 chars; phone digits between 8 and 15 inclusive |
| Error messages | name: `Merci d’indiquer votre nom complet.` phone: `Merci d’indiquer un numéro de téléphone valide.` network: `Votre demande n’a pas pu être envoyée. Réessayez ou contactez-nous sur WhatsApp.` |
| Server error | uses `data.message` from the JSON response when present, else the network string |
| Honeypot filled | **short-circuits to the success panel without any network call** |
| Double submit | guarded by `state.submitting` |
| Success | form hidden, success panel `is-visible`, title/text/WhatsApp filled from config, scrolled into view |
| Redirect | **none** — the page never navigates |

### 6.6 Tracking (must keep firing)

Attribution captured from the URL into `sessionStorage` under
`emara_gueliz_attribution`, persisted across the session:
`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`,
`campaign_id`, `adset_id`, `ad_id`, plus derived `landing_page_url`, `referrer`
and `ad_platform`.

`ad_platform` is derived from `utm_source`: `Meta` (facebook/meta/instagram/fb/ig),
`TikTok` (tiktok/tt), `Snapchat` (snap), `Google` (google/adwords/gads), else the
raw source.

Events, fired **only if the corresponding pixel exists** (`dataLayer`, `fbq`,
`ttq`, `snaptr`, `gtag`), wrapped in try/catch so tracking can never break the
funnel:

| Event | When |
| --- | --- |
| `LeadFormStarted` | first option selected |
| `LeadFormStepCompleted` | each step advance, and once more before submit |
| `Lead` | after server confirms; `fbq` sends it as a standard event, `snaptr` as `SIGN_UP` |

## 7. Caught during the port

Four real differences the checks surfaced, all now fixed:

1. **`data-phone-code` / `data-phone-number` were missing.** The React phone
   component never carried them. `offre-gueliz.js` uses `[data-phone-number]` to
   focus the field on a validation error, so this was a live behaviour hook, not
   decoration.
2. **The sticky CTA was permanently `aria-hidden="true"` / `tabindex="-1"`.** The
   legacy `show()` toggles both to `false` / `0` when the bar appears, so the
   port was hiding a visible control from keyboard and screen-reader users.
3. **A `scroll-mt-20` offset was added to `#og-form`.** The legacy handler is a
   bare `scrollIntoView({ block: 'start' })` with no offset. Removed — visual
   adjustments are deferred.
4. **The sticky CTA thresholds were invented** (`scrollY > 60vh`) instead of the
   legacy `scrollY > 400` with the form counting as visible at 85% of viewport
   height. Now copied exactly.

Two harness problems were also fixed rather than worked around: the contact
suite's `elapsed_ms < 3000` assertion was measuring the harness's own startup
cost and began failing once the run grew longer (now asserted relatively), and
the `honest: Escape closes the lightbox` check raced a fixed 500ms delay against
an exit animation (now waits for detachment).

## 8. Verification plan

- lint, type check
- `verify-preservation.mjs` with `/offre-gueliz` added to the route table
- `smoke.mjs` desktop + mobile: broken images, links, console, overflow, map
  click-to-load, sticky CTA, scroll-to-form
- **`form-parity.mjs` extended with a dedicated Guéliz section** proving endpoint,
  method, headers, credentials, all 25 payload keys and values, honeypot
  short-circuit, phone fields, validation, success/error, and mobile submit
- assert `noindex, nofollow` survives the build
- assert no canonical / OG / Twitter / JSON-LD is introduced

## 9. Exceptions

**None.** This route is registered in `web/scripts/lib/routes.mjs` with empty
exception lists, and all 183 static checks pass across the seven ported routes.

That took one deliberate decision. `js/offre-gueliz.js` builds every step, field
and button at runtime, so the legacy file ships an empty `<div data-steps>`, an
empty progress label and an unfilled success panel whose WhatsApp link is
`href="#"`. Prerendering the form in React was tried first and would have been
defensible — no layout shift, works without JS — but it put step copy and three
`h3.og-step__question` headings into the export that the legacy file does not
have, which cost three failures and would have needed exceptions for headings,
copy and link destinations.

The port therefore builds the form on mount, exactly as the legacy does, and the
static diff stays meaningful instead of being waived. Prerendering is a real
improvement and remains available — as a deliberate, separate decision, not as a
side effect of the migration.

Behaviour is covered where it actually lives: the Guéliz section of
`form-parity.mjs` drives both the real legacy page and the port through the same
selectors and diffs the resulting requests and DOMs.

### One documented narrowing

`form-parity.mjs` compares every `data-*` hook on both pages, minus eleven that
belong to the internals of `js/phone-input-country.js`: `data-country`,
`data-phone-button`, `data-phone-dropdown`, `data-phone-input-bound`,
`data-phone-options`, `data-phone-options-ready`, `data-phone-search`,
`data-phone-selected-code`, `data-phone-selected-flag`,
`data-phone-selected-name`, `data-selected-code`.

These are the markup that module's custom dropdown generated plus its own init
guards. A repo-wide search confirmed nothing outside that module reads them, and
the React component renders its own dropdown, so they have no consumer left. The
two hooks the *page* script does read — `data-phone-code` and
`data-phone-number` — were missing from the port at first; the check caught it
and they were added back to `PhoneCountryInput`.
