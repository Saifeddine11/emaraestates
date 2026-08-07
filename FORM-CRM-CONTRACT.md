# Contact form — CRM integration contract

Audit of `#contactForm` as it exists on the live site, and proof that the ported
form is wire-identical. This form feeds a paying lead flow; treat every row as
frozen unless the change is deliberate and re-verified.

Verified by `web/scripts/form-parity.mjs` (`npm run form-parity`), which drives
the **real legacy page** and the **real export** through the same script, stubs
`fetch` in both, and diffs the captured request bodies. It is part of
`npm run check`.

---

## 1. Where the leads actually go

```
browser  →  POST /contact.php  →  Zapier webhook  →  CRM
                              ↘  lead email (PHP mail, SMTP fallback)
```

| Item | Value |
| --- | --- |
| Endpoint | `/contact.php` (`form.action`) |
| Method | `POST`, JSON body |
| Headers | `Accept: application/json`, `Content-Type: application/json` |
| Credentials | `same-origin` |
| Webhook | `CONTACT_WEBHOOK_URL` in `.env`, falling back to `https://hooks.zapier.com/hooks/catch/27111467/ujcbawh/` |
| Email | `CONTACT_TO`, default `contact@emaraestates.com` |
| Node equivalent | `server.js` handles `POST /api/contact` and `/contact.php` identically |

**HubSpot is not part of this form.** The only HubSpot code in the repo is
`submitGuelizToHubspotForm` / `submitGuelizToHubspotCrm` in `server.js`, which
belong to the **`/offre-gueliz` lead flow** (`lead-gueliz.php`), a separate form
ported later. `js/main.js:138` contains a commented-out HubSpot example — dead
code. `contact.html` loads exactly three scripts: `nav.js`,
`phone-input-country.js`, `contact-form.js`. No GTM, no analytics, no
third-party form embed.

### 1.1 Zapier receives (assembled server-side, not by the browser)

`nom_complet`, `email`, `telephone`, `phoneFull`, `phoneCode`, `phoneCountry`,
`phoneCountryCode`, `phoneNumber`, `budget`, `message`, `company_website`,
`elapsed_ms`, `source`, plus server-added `form_id: "contactForm"`,
`submitted_at`, `ip`, `user_agent`, `page_url`.

`form_id` is hardcoded in `contact.php` — the browser never sends it, so no
client change can affect it.

---

## 2. Request payload — 14 keys, exact order

| # | Key | Source | Notes |
| --- | --- | --- | --- |
| 1 | `nom_complet` | `#contact-name` | max 80 |
| 2 | `email` | `#contact-email` | max 120 |
| 3 | `telephone` | hidden `data-phone-legacy` | legacy duplicate of `phoneFull` |
| 4 | `phoneFull` | hidden `data-phone-full` | `phoneCode` + `phoneNumber` |
| 5 | `phoneCode` | `#contact-phone-code` | e.g. `+33` |
| 6 | `phoneCountry` | hidden `data-phone-country` | **server re-derives this; the sent value is ignored** |
| 7 | `phoneCountryCode` | hidden `data-phone-country-code` | ISO-2 |
| 8 | `phoneNumber` | `#contact-phone` | local part |
| 9 | `budget` | `#budget-select` | max 30 |
| 10 | `message` | `#contact-message` | max 1200 |
| 11 | `jour_visite` | *absent on this page* | **never read by `contact.php`**; `server.js` runs it through `String(v \|\| '')` |
| 12 | `source` | `window.location.href` | max 120 |
| 13 | `company_website` | honeypot | max 120 |
| 14 | `elapsed_ms` | client timer | integer |

### 2.1 Server recomputes the phone block

`normalizePhonePayload()` in `contact.php` ignores the client's `phoneCountry`
and rebuilds `telephone` and `phoneFull` as `phoneCode + phoneNumber` from its
own 39-country table. Client-side phone formatting therefore cannot corrupt the
CRM record — but it is preserved identically anyway.

### 2.2 The one representational difference, and why it is a no-op

Legacy sends `jour_visite: null` (the field does not exist on this page, so
`FormData.get()` returns `null`); the port sends `""`. Proven equivalent:

- `contact.php` never references `jour_visite` at all.
- `server.js` does `sanitize(input.jour_visite, 80)` → `String(null \|\| '')` → `""`.

Both backends collapse the two to the same value before anything reads it.

---

## 3. Form elements — ids, names, attributes

| Element | `id` | `name` | Key attributes |
| --- | --- | --- | --- |
| form | `contactForm` | — | `action="/contact.php"`, `method="post"`, `novalidate`, `data-form-start` |
| honeypot | `company-website` | `company_website` | `tabindex="-1"`, in `.form-trap[aria-hidden]` |
| name | `contact-name` | `nom_complet` | `maxlength=80`, `autocomplete="name"` |
| email | `contact-email` | `email` | `type=email`, `maxlength=120`, `autocomplete="email"` |
| phone code | `contact-phone-code` | `phoneCode` | `autocomplete="tel-country-code"`, `data-phone-code` |
| phone number | `contact-phone` | `phoneNumber` | `type=tel`, `inputmode="tel"`, `maxlength=20`, `data-phone-number` |
| budget | `budget-select` | `budget` | `autocomplete="off"` |
| message | `contact-message` | `message` | `maxlength=1200` |
| submit | — | — | `.btn-submit`, text `Envoyer la demande` |
| feedback | `form-feedback` | — | `role="status"`, `aria-live="polite"` |

**Hidden inputs:** `telephone` (`data-phone-legacy`), `phoneFull`
(`data-phone-full`), `phoneCountry` (`data-phone-country`, default `France`),
`phoneCountryCode` (`data-phone-country-code`, default `FR`).

All ids, names and hidden fields are preserved unchanged. Ids are **not**
unified or suffixed across pages — the homepage form uses the same ids because
the two never render together.

### 3.1 `data-*` attributes — status

`data-form-start`, `data-error-for`, `data-phone-code`, `data-phone-number`,
`data-phone-legacy`, `data-phone-full`, `data-phone-country`,
`data-phone-country-code`, `data-phone-country-field`, `data-phone-button`,
`data-contact-form-bound`.

A repo-wide search shows **every** consumer of these is one of the three legacy
scripts the port replaces (`contact-form.js`, `phone-input-country.js`,
`offre-gueliz.js`). Nothing server-side, no tag manager, no third party reads
them; they are internal wiring for the imperative implementation. The React
components hold the same state directly, so the attributes are not re-emitted.

> If a GTM trigger or session-recording selector is ever pointed at one of
> these, say so and they will be added back — they are inert markup, cheap to
> restore.

---

## 4. Behaviour contract

| Behaviour | Legacy | Ported |
| --- | --- | --- |
| Submit | `preventDefault`, JSON POST | identical |
| Redirect | none — stays on page | identical |
| Button while sending | disabled, text `Envoi...` | identical |
| Success | clear feedback, `form.reset()`, restart timer, open modal **if the form had lead content** | identical |
| Success modal | title, body, 4 social links, `Fermer`, `Retour au site` → `/` | identical copy and destinations |
| Honeypot filled | show success message, **send nothing** | identical |
| Sub-3s submit | still sent; server silently drops it | identical |
| Network/parse failure | generic message in `#form-feedback` | identical |
| Client-side validation | **none** (`novalidate`, no JS checks) | identical |

### 4.1 Two deliberate notes

**Per-field error rendering.** The port can display `payload.errors` next to a
field. This is currently **unreachable**: `validatePayload()` in `contact.php`
ends with `return [$payload, []]` and `server.js` with `errors: {}`, so the
contact form never receives field errors — only the apport simulator does. The
displayed behaviour is therefore identical today; the branch would only activate
if server-side validation is added later.

**Local-preview hint.** `contact-form.js` swaps in a "Tu es sur Live Server…"
message when a request fails on `localhost`. The port shows its normal error
instead. This affects local development only and never runs in production.

---

## 5. Contact channels on the page

| Channel | Destination |
| --- | --- |
| Phone | `tel:+212670038899`, displayed `+212 6 700 388 99` |
| Email | `mailto:contact@emaraestates.com` |
| WhatsApp (quick tile **and** float) | `https://wa.me/212670038899?text=…` — the **"Échange général"** prefill |
| Instagram / TikTok / Snapchat | as in `SOCIAL` in `lib/site.ts` |

The WhatsApp prefill on this route differs from the homepage's and from
`/residences-honest-678/`'s bare link; it is resolved per route via
`WHATSAPP_FLOAT_BY_ROUTE`.

---

## 6. Test evidence

`npm run form-parity` — 31 assertions, all passing:

- endpoint, method, credentials mode, request headers
- payload key set **and order**
- every value, field by field
- `source` equals the page URL on both sides
- honeypot sends no request and shows the same message
- sub-3s submit reports `elapsed_ms < 3000` on both
- success modal copy and destinations
- form resets after success
- no console errors on either page
