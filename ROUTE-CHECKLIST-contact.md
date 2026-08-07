# Route preservation checklist — `/contact`

Contract for porting the contact page. Every row is asserted automatically by
`web/scripts/verify-preservation.mjs` (route table in
`web/scripts/lib/routes.mjs`) unless marked **manual**.

---

## 0. Source of truth

Two candidate files, one live — the same trap as `/residences-honest-678/`:

| File | Status |
| --- | --- |
| `contact.html` | **Live.** 378 lines, edited 12 Jun 16:26. `.htaccess` maps `^contact$ → contact.html`. |
| `contact/index.html` | **Stale orphan.** 338 lines, edited 12 Jun 16:02, different `<title>` (`Contact Emara Estates \| Immobilier de prestige à Marrakech`). `/contact/` 301s to `/contact`. |

Port `contact.html`. Do not resurrect the orphan's title.

## 1. Route + trailing slash

| Item | Value |
| --- | --- |
| Canonical URL | `https://emaraestates.com/contact` (**no** trailing slash) |
| `.htaccess` | `^contact$ → contact.html`; `/contact/` → 301 → `/contact`; `/contact.html` → 301 → `/contact` |
| `sitemap.xml` | `https://emaraestates.com/contact`, priority 0.7 |
| Export path | `out/contact.html` (`trailingSlash: false`) — already the shape Apache expects, no deploy repositioning needed |

This route is the **opposite** of `/residences-honest-678/`: unslashed is
canonical. `.htaccess` line 15 also excludes `contact.php` from the rewrite so
the form endpoint keeps working — do not let the new route shadow it.

## 2. Metadata

| Tag | Value |
| --- | --- |
| `<title>` | `Contact Emara Estates \| Recevoir prix, plans & disponibilités` |
| `description` | `Contactez Emara Estates pour recevoir les prix, plans et disponibilités des appartements neufs à Guéliz Marrakech, ou planifier une visite.` |
| `robots` | `index, follow` |
| `canonical` | `https://emaraestates.com/contact` |
| `og:type` | `website` (differs from the project page's `article`) |
| `og:locale` / `og:site_name` | `fr_MA` / `Emara Estates` |
| `og:url` | `https://emaraestates.com/contact` |
| `og:title` / `og:description` | same as `<title>` / `description` |
| `og:image` (+ `secure_url`, `type`, `width`, `height`) | `https://emaraestates.com/img/og-honest-signature-7.jpg`, `image/jpeg`, `1200`, `630` |
| `twitter:card` | `summary_large_image` |
| `twitter:title` / `description` / `image` | mirror the OG values |
| `<html lang>` | `fr` |

Also preserve `<link rel="preload" as="image" href="img/hero-optimized.webp" fetchpriority="high">`.

## 3. JSON-LD (single `@graph`, 4 nodes)

1. `WebSite` — `@id` `https://emaraestates.com/#website`
2. `["Organization","LocalBusiness","RealEstateAgent"]` — `@id` `…/#organization`, `telephone +212670038899`, short form (no `description`/`areaServed`/`knowsAbout`)
3. `ContactPage` — `@id` `…/contact#webpage`, `about` → `#organization`, `breadcrumb` → `#breadcrumb`
4. `BreadcrumbList` — `@id` `…/contact#breadcrumb`, 2 items: Accueil → `/`, Contact → `/contact`

Node 3 is `ContactPage`, not `WebPage`. That type is the schema signal for this route.

## 4. Heading order (1× h1, 2× h2, no h3)

| # | Tag | Text |
| --- | --- | --- |
| 1 | h1 | Parlons de votre projet à Marrakech |
| 2 | h2 | Recevoir les informations |
| 3 | h2 | Un point de contact au coeur de Marrakech |

Note `coeur`, not `cœur`. Preserve as authored.

## 5. Sections in order

| # | Section | Notes |
| --- | --- | --- |
| — | Preloader, mobile menu, nav | shared chrome |
| 1 | `.contact-hero` | full-bleed photo + veil; two columns |
| 1a | `.contact-page-copy` | label, h1, intro, social row, quick-contact row |
| 1b | `.contact-panel` | `aria-labelledby="contact-form-title"`, eyebrow, h2, 2 paragraphs, the form |
| 2 | `.contact-office` | label, h2, 3 detail blocks, office map iframe |
| — | Footer, WhatsApp float | shared chrome |

No lightbox, no sliders, no galleries, no FAQ, no apport simulator on this route.

## 6. Conversion paths — every destination

**Quick-contact row (3 items, each a link):**

| Label | Value | `href` |
| --- | --- | --- |
| Téléphone | +212 6 700 388 99 | `tel:+212670038899` |
| WhatsApp | Réponse rapide | `https://wa.me/212670038899?text=…` (see below) |
| Email | contact@emaraestates.com | `mailto:contact@emaraestates.com` |

> **Trap:** this page's WhatsApp prefill is the **"Échange général"** variant —
> *"Bonjour, je souhaite échanger avec Emara Estates au sujet d'un projet
> immobilier à Marrakech. Merci"* — used by **both** the quick-contact item and
> the floating button. That is a third distinct float variant after the
> homepage's generic prefill and the project page's bare link. It must be added
> to `WHATSAPP_FLOAT_BY_ROUTE`.

**Social row (3 icon links, `aria-label`ed, decorative `alt=""` images):**
Instagram, TikTok, Snapchat — same destinations as the footer.
Icons: `/img/iconsocailmedia/{instagram,tik-tok,snapchat}.png`, 20×20.

**All other links** are shared chrome: `/`, `/contact`, `/residences-honest-678/`,
`/#faq`, `/#services`, `/#nos-réalisations`, `/#appartement-temoin-honest`,
`/immobilier-luxe-marrakech`, `/appartement-neuf-gueliz-marrakech`,
`/investissement-immobilier-marrakech`.

## 7. Form — `#contactForm` → `POST /contact.php`

The markup is **byte-identical to the homepage form** apart from indentation, so
the same component serves both. Field ids are *not* suffixed per page (unlike
the apport simulator) because the two never render together.

| Field | `id` | `name` | Attributes |
| --- | --- | --- | --- |
| honeypot | `company-website` | `company_website` | `tabindex="-1"`, wrapped in `.form-trap[aria-hidden]`, **has a visible-in-DOM label "Site web"** |
| name | `contact-name` | `nom_complet` | `maxlength=80`, `autocomplete="name"`, `aria-label="Nom complet"` |
| email | `contact-email` | `email` | `type=email`, `maxlength=120`, `autocomplete="email"` |
| phone code | `contact-phone-code` | `phoneCode` | `autocomplete="tel-country-code"`, `aria-label="Indicatif pays"`, **`+33` selected by default** |
| phone number | `contact-phone` | `phoneNumber` | `type=tel`, `inputmode="tel"`, `maxlength=20`, `autocomplete="tel-national"` |
| budget | `budget-select` | `budget` | `aria-label="Budget"`, `autocomplete="off"` |
| message | `contact-message` | `message` | `maxlength=1200`, `aria-label="Décrivez votre projet"` |
| submit | — | — | `Envoyer la demande` |
| feedback | `form-feedback` | — | `role="status"`, `aria-live="polite"` |

**Hidden fields (wire contract — HubSpot/Zapier consume these):**
`telephone` (legacy duplicate of `phoneFull`), `phoneFull`, `phoneCountry`
(default `France`), `phoneCountryCode` (default `FR`).

**Budget option values (validated server-side, exact strings):**
`""` (label `Budget`), `1M - 1.5M MAD`, `2M - 3M MAD`, `+3M MAD`.

**Phone select options (10, in this order):** Maroc +212, France +33 *(selected)*,
Belgique +32, Suisse +41, Espagne +34, Pays-Bas +31, Royaume-Uni +44,
Allemagne +49, Italie +39, Etats-Unis / Canada +1.

**Anti-spam to preserve:** honeypot silently accepts, `elapsed_ms` timer (server
rejects sub-3s submissions), server-side rate limit.

**Accessibility note:** the legacy visible labels are letter-by-letter animated
spans marked `aria-hidden="true"`, with the accessible name carried by each
input's `aria-label`. The port uses real `<label for>` elements instead — a
strict improvement, and the visible text is unchanged.

## 8. Images and alt text

| Image | Alt |
| --- | --- |
| `img/hero-optimized.webp` (1280×855, `fetchpriority="high"`) | Marrakech et immobilier haut standing accompagné par Emara Estates |
| logo (nav + footer) | Emara Estates |
| preloader logo | Emara *(documented exception — decorative)* |
| 3 social icons | `alt=""` (decorative; the link carries the `aria-label`) |

## 9. Visible copy to preserve verbatim

Hero: label `Contact`; h1; intro paragraph; `Suivez-nous`; the three
quick-contact label/value pairs.

Panel: eyebrow `Demande privée`; h2 `Recevoir les informations`; two
paragraphs — *"Un conseiller vous recontacte avec les disponibilités, plans et
prochaines visites possibles."* and *"Contactez Emara Estates pour recevoir les
plans, prix et disponibilités des appartements neufs à Guéliz Marrakech, ou pour
organiser une visite du programme Honest Signature 7."*

Office: label `Notre bureau`; h2; three blocks — **Adresse** / *2ème etage,
Business center Paul, Rue Mouatamid Ibn Abaad, Marrakech 40000*, **Horaires** /
*Lun - Sam : 9h - 19h*, **Accompagnement** / *Visite, sélection de lots,
réservation et suivi administratif.*

Map iframe `title="Carte du bureau Emara Estates à Marrakech"`.

## 10. Recorded exceptions (carried from earlier routes — no new ones expected)

| Exception | Reason |
| --- | --- |
| Mobile menu markup mounts on open | All 11 destinations remain in the prerendered header |
| Preloader logo `alt=""` | Decorative and `aria-hidden` |
| Skip link `#main-content` | Added for accessibility; new anchor, breaks nothing |

The lightbox exceptions do **not** apply here — this page has no gallery, so
they must not be copied into this route's exception list.

The legacy preloader on this page is 900ms/1500ms rather than the 2000ms/2800ms
used elsewhere; the port keeps the agreed global 1.65s curtain.
