# Route preservation checklist — `/residences-honest-678/`

Contract for porting the Honest Signature 7 project page. Every row is asserted
automatically by `web/scripts/verify-preservation.mjs` (route table in
`web/scripts/lib/routes.mjs`) unless marked **manual**.

---

## 0. Source of truth

There are **two** candidate files in the repo and only one is live:

| File | Status |
| --- | --- |
| `residences-honest-678/index.html` | **Live.** 911 lines, edited 12 Jun. This is what Apache serves and what Google indexed. |
| `residences-honest-678.html` | **Stale orphan.** 726 lines, edited 22 May, different `<title>` (`Honest Signature 7 à Guéliz Marrakech \| Appartements neufs haut standing`). `.htaccess` 301s it to the directory version. |

Port the directory version. Do not resurrect the orphan's title.

## 1. Route + trailing slash

| Item | Value |
| --- | --- |
| Canonical URL | `https://emaraestates.com/residences-honest-678/` (**with** trailing slash) |
| `.htaccess` | `/residences-honest-678.html` → 301 → `/residences-honest-678/`; `/residences-honest-678` → 301 → `/residences-honest-678/` |
| `sitemap.xml` | `https://emaraestates.com/residences-honest-678/` |
| Export path | `out/residences-honest-678.html` (`trailingSlash: false`), repositioned to `residences-honest-678/index.html` by the deploy step |

The build already emits an `out/residences-honest-678/` directory holding Next's
RSC segment payloads, so the deploy step only has to move the HTML file into it
— there is no directory to create and nothing to overwrite.

The trailing slash is asymmetric with `/contact` (no slash). Both must be kept exactly.

## 2. Metadata

| Tag | Value |
| --- | --- |
| `<title>` | `Honest Signature 7 Guéliz \| Prix, plans & visite témoin` |
| `description` | `Découvrez Honest Signature 7 à Guéliz : studios, appartements, duplex et commerces. Recevez les prix, plans, disponibilités et planifiez une visite témoin.` |
| `robots` | `index, follow` |
| `canonical` | `https://emaraestates.com/residences-honest-678/` |
| `og:type` | `article` (**not** `website` — differs from the homepage) |
| `og:locale` / `og:site_name` | `fr_MA` / `Emara Estates` |
| `og:url` | `https://emaraestates.com/residences-honest-678/` |
| `og:title` / `og:description` | same as `<title>` / `description` |
| `og:image` (+ `secure_url`, `type`, `width`, `height`) | `https://emaraestates.com/img/og-honest-signature-7.jpg`, `image/jpeg`, `1200`, `630` |
| `twitter:card` | `summary_large_image` |
| `twitter:title` / `description` / `image` | mirror the OG values |
| `<html lang>` | `fr` |

`canonical` and `og:url` must be emitted by hand — the Next metadata API strips the trailing slash.

## 3. JSON-LD (single `@graph`, 5 nodes)

1. `WebSite` — `@id` `https://emaraestates.com/#website`
2. `["Organization","LocalBusiness","RealEstateAgent"]` — `@id` `…/#organization`, `telephone +212670038899`
3. `WebPage` — `@id` `…/residences-honest-678/#webpage`, `about` → `#project`, `breadcrumb` → `#breadcrumb`
4. `ApartmentComplex` — `@id` `…/residences-honest-678/#project`, `AggregateOffer` `lowPrice 1050000` MAD, `InStock`
5. `BreadcrumbList` — `@id` `…/residences-honest-678/#breadcrumb`, 2 items: Accueil → `/`, Honest Signature 7 → `/residences-honest-678/`

## 4. Heading order (1× h1, 10× h2, 11× h3 — exact sequence)

| # | Tag | Text |
| --- | --- | --- |
| 1 | h1 | Honest Signature 7 à Guéliz Marrakech |
| 2 | h2 | Guéliz hyper-centre, Marrakech |
| 3 | h2 | Visitez Honest Signature 7 en 3D |
| 4 | h2 | Un projet pensé pour le rythme premium de Guéliz |
| 5 | h2 | Un confort pensé comme une expérience |
| 6–11 | h3 | Piscines au rez-de-chaussée · Spa résidentiel · Jacuzzi · Salle de sport · Vestiaires séparés hommes / femmes · Parking titré & box privatifs |
| 12 | h2 | Visitez l'appartement témoin Honest Signature 7 |
| 13 | h2 | Un aperçu du style, des ambiances et des détails |
| 14 | h2 | Des typologies adaptées à plusieurs projets |
| 15–18 | h3 | Compact et premium · Confort quotidien · Volumes signature · Visibilité & flux |
| 19 | h2 | Simulez votre apport pour Honest Signature 7 |
| 20 | h3 | Votre estimation d'apport |
| 21 | h2 | Pourquoi Guéliz ? |
| 22 | h2 | Recevoir les plans, prix et disponibilités |

Heading 20 sits inside the simulator result panel, which ships `hidden` in the
legacy markup. It must stay **mounted** (collapsed + `inert`), matching the
homepage simulator fix.

Note the curly apostrophe in #12 (`l’appartement`) and the straight one in #20
(`d'apport`). Both are preserved as-authored.

## 5. Sections in order

| # | Section | `id` |
| --- | --- | --- |
| — | Preloader, mobile menu, nav | `preloader`, `mobileMenu`, `nav` |
| 1 | Project hero | — |
| 2 | Project summary / featured card + slider | `apercu` |
| 3 | Virtual tour 3D | `visite-3d` |
| 4 | Project overview (copy + visual) | — |
| 5 | Amenities (6 cards) | `prestations` |
| 6 | Show apartment | `show-apartment-title` (labelledby) |
| 7 | Gallery ribbon | `galerie` |
| 8 | Typologies (4 cards) | `typologies` |
| 9 | Apport simulator | `simulateur-apport` |
| 10 | Location + map iframe | `localisation` |
| 11 | CTA band | `contact-projet` |
| — | Footer, WhatsApp float, lightbox | `projectLightbox` |

## 6. CTAs and link destinations (23 unique `href`s)

**In-page anchors:** `#contact-projet` (×2), `#galerie`, `#prestations`, `#typologies`

**Internal:** `/`, `/contact` (×3), `/residences-honest-678/` (×6), `/#faq`,
`/#services`, `/#nos-réalisations`, `/#appartement-temoin-honest`,
`/appartement-neuf-gueliz-marrakech` (×2), `/investissement-immobilier-marrakech` (×2),
`/immobilier-luxe-marrakech`

**External:** `https://wa.me/212670038899` (×2 — CTA band + float),
Vertex 3D tour, Instagram, TikTok, Snapchat

> **Trap:** the WhatsApp links on this page are **bare** (`https://wa.me/212670038899`).
> The homepage uses a `?text=`-prefilled variant. The shared float must not leak
> the homepage's prefill onto this route.

## 7. Forms

One form: the apport simulator. No contact form on this page — all contact CTAs link to `/contact`.

| Field | `id` | `name` | Notes |
| --- | --- | --- | --- |
| honeypot | — | `company_website` | `tabindex="-1"`, `aria-hidden`, no label |
| budget | `apport-budget-honest` | `budget` | `inputmode="numeric"`, placeholder `Ex : 1 300 000` |
| currency | — | `currency` | `MAD` (selected) / `EUR`, `aria-label="Devise"` |
| typologie | `apport-typologie-honest` | `typologie` | optional; `""`/Studio/Appartement/Duplex/Commerce/Je ne sais pas encore |
| email | `apport-email-honest` | `email` | placeholder `Ex : contact@exemple.com` |

Field `id`s carry the `-honest` suffix — they differ from the homepage simulator and must not be unified.
Result CTAs: `/contact` ("Recevoir les prix exacts") and `/residences-honest-678/` ("Voir Honest Signature 7").

## 8. Images and alt text

| Image | Alt |
| --- | --- |
| `honest006.webp` (slider + gallery) | Façade contemporaine d'Honest Signature 7 à Guéliz Marrakech |
| `honest002.webp` | Sauna et jacuzzi de la résidence Honest Signature 7 à Marrakech |
| `honest003.webp` | Rooftop avec salon cinéma et vue sur Marrakech depuis Honest Signature 7 |
| `honest004.webp` | Piscine intérieure de la résidence Honest Signature 7 à Guéliz |
| `honest005.webp` **in slider** | Salle de sport équipée dans **la résidence** Honest Signature 7 à Marrakech |
| `honest005.webp` **in gallery** | Salle de sport équipée dans Honest Signature 7 à Marrakech |
| `honest007.webp` (slider + gallery) | Perspective de façade d'Honest Signature 7 à Guéliz |
| `honest007.webp` (overview visual) | Perspective extérieure d'Honest Signature 7 à Guéliz Marrakech |
| `honest-signature-7-gueliz-marrakech-interieur-01.webp` | Appartement témoin Honest Signature 7 à Guéliz Marrakech |
| logo (nav + footer) | Emara Estates |
| virtual-tour card, gallery duplicates | `alt=""` + `aria-hidden` (decorative) |

> **Trap:** the two `honest005.webp` alts differ by the words "la résidence".
> That is not a typo to clean up — both strings must survive verbatim.

Also preserve the slider `data-lightbox-title` captions (6 strings) and the
`<link rel="preload" as="image" href="/img/honest007.webp" fetchpriority="high">`.

## 9. Interactive elements

| Element | Behaviour |
| --- | --- |
| Property slider (`#apercu`) | 6 images, autoplay `data-slider-delay="3800"`, lazy `data-src`, click → lightbox |
| Lightbox | prev/next/close, keyboard, counter `01 / 01`, caption from `data-lightbox-title` |
| Gallery ribbon (`#galerie`) | 6 slides + 6 `aria-hidden` duplicates for the marquee; prev/next buttons, counter `1 / 6`, `aria-live="polite"` |
| Apport simulator | validation, MAD/EUR, 30% rate, result panel, honeypot |
| Nav dropdowns, mobile menu, preloader, smooth anchor scroll | shared chrome, already ported |
| Google Maps iframe (`#localisation`) | `title="Carte de Guéliz hyper-centre Marrakech"`, `loading="lazy"` |

## 10. Recorded exceptions (carried from the homepage)

| Exception | Reason |
| --- | --- |
| Mobile menu markup mounts on open | All 11 destinations remain in the prerendered header |
| Lightbox mounts on open (`01 / 01`, generic alt) | Not indexable content; lightbox reuses each photo's real alt |
| Preloader logo `alt=""` | Decorative and `aria-hidden` |
| Skip link `#main-content` | Added for accessibility; new anchor, breaks nothing |
