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

---

## 7. `/honest-signature-7/` — three steps, then optional qualification

> Since 2026-10-02 the form asks two one-tap questions before the contact
> details: **1** type of apartment (`propertyType`: `Appartement 1 chambre`,
> `Appartement 2 chambres`, `Appartement 3 chambres` since 2026-10-08 — the
> last one is new to the CRM, and `Studio` is no longer sent from this page;
> /residence-boutique-gueliz still sends `Studio`), **2** budget (`budget`, three
> ranges in euros since 2026-10-08 — `149 000 – 180 000 €`,
> `180 000 – 225 000 €`, `Plus de 225 000 €`: the dirham bounds 1,59 M / 2 M /
> 2,5 M at about 11 MAD for 1 €, rounded to 5 000 €), **3** name + phone + e-mail. Nothing is sent before step 3 is
> submitted; both answers travel with that request and in its `message`.
> `budget` and `propertyType` were existing keys — no backend change.
> `currency` follows the page (`VALIDATION.euroPrices`): `EUR` with the euro
> budget labels, `MAD` with the dirham ones — never one with the other.
> Since 2026-10-08 contact.php also forwards `form_session_id` (a UUID made by
> the browser): the lead and its `lead_stage: qualification` follow-up carry
> the same one, with the same e-mail, phone and `project_name`, so the Zap can
> update the contact it created instead of creating a second one.
> Since 2026-10-09 the optional questions after the lead are switched off
> (`VALIDATION.postLeadQuestions`): the page sends one request per lead and no
> `lead_stage: qualification` follow-up.
> One person is one Meta Lead: contact.php remembers each accepted lead of this
> form by hashed phone and hashed e-mail (Meta ledger, 30 days). A second lead
> from the same person is still forwarded to Zapier, but the answer carries
> `repeat_lead: true`, no server Lead is sent and the browser fires none. The
> browser also keeps a date (`emara_hs7_lead_sent`, 30 days) and shows the
> confirmation instead of the form after a reload.
> Since 2026-10-09 an **abandoned** form (a phone or an e-mail typed, then ten
> idle minutes without sending) is posted once to the same Zapier hook by the
> draft sweep, with the keys of a lead of this form (`form_type`, `form_id:
> contactForm`, name, phone, e-mail, `propertyType`, `budget`, UTM, `fbclid`,
> `form_session_id`) and two marks: `lead_stage: abandoned` and a `message`
> that starts with « FORMULAIRE ABANDONNÉ (non envoyé par le visiteur) ». It
> carries no `meta_event_id` and is never sent to Meta. A form still being
> filled is not sent. `LEAD_DRAFTS_CRM_DISABLED=1` turns this off;
> `LEAD_DRAFTS_WEBHOOK_URL` sends it to another hook.
> Since 2026-10-09 the form asks for the contact details only
> (`VALIDATION.formQuestions` off): one step, one request. `propertyType` and
> `budget` arrive empty and the `message` says « Type de bien : non précisé —
> Budget : non précisé ». With the switch on, the two questions come back as
> steps 2 and 3, after the contact details.
> Meta `LeadFormStepCompleted` fires once per step (`step` 1, 2, 3; the third
> only when the lead is accepted). What follows is unchanged.

The Meta Ads landing posts to the same `/contact.php` → Zapier Catch Hook as
this form. `form_type` (`honest_signature_7_request`), `source` (`Meta Ads`),
`leadSource`, `lead_origin`, `landing_name`, `project` and the UTM / `fbclid` /
`fbc` / `fbp` keys are unchanged.

### 7.1 Two requests per visitor, at most

| | When | `lead_stage` | Carries | Meta `Lead` |
| --- | --- | --- | --- | --- |
| 1 | on submit of name + phone + e-mail | `lead` | contact details, attribution, project metadata, `meta_event_id` | yes — browser Pixel + CAPI, same event ID, once |
| 2 | only if the visitor answers the optional questions (button, or a beacon if they leave) | `qualification` | the **same** contact details, plus `purchase_intent`, `contact_preference`, `visit_preference`, and a readable `message` starting with "Complément au dossier Honest Signature 7" | no — no `meta_event_id`, so no second conversion |

Request 2 never creates the lead: if it is lost, the lead from request 1 is
intact. Identical answers are never posted twice.

### 7.2 Six keys added to `contact.php` / `server.js` (additive)

`project_name`, `project_location`, `lead_source`, `lead_stage`,
`contact_preference`, `visit_preference`. Empty strings for every other form;
no existing key changes name, value or meaning. Before this change the browser
already sent the first three and `contact.php` silently dropped them (it
forwards a fixed list of keys).

`purchase_intent` values: `Résidence principale`, `Investissement`,
`Résidence secondaire` (unchanged) and `Je me renseigne` (new).

### 7.3 To confirm in the Zap before relying on request 2

The Zap cannot be inspected from the repo. Two things decide what it does with
a `qualification` hook:

- **HubSpot step type.** "Create or update contact" (matched on e-mail) updates
  the existing contact. A plain "Create contact" errors on the duplicate
  e-mail: the lead is unaffected, the answers then reach the team only through
  the notification e-mail `contact.php` sends for every accepted request.
- **Any non-HubSpot step** (sheet row, Slack / WhatsApp alert) runs twice for a
  visitor who answers. Add a filter on `lead_stage` if that is unwanted.

E-mail stays required on this form for the same reason (HubSpot matches on
it); see `VALIDATION.emailRequired` in `web/src/lib/content/honest-signature-7.ts`.

### 7.4 Test evidence

`npm run honest7-check` (Chromium) and `BROWSER=webkit npm run honest7-check`
— 163 assertions each, `/contact.php` stubbed. A real run through `contact.php`
against a local stand-in webhook returned 200 twice and delivered both hooks
with the keys above.

---

## 8. Lead drafts — partial / abandoned form capture (`/honest-signature-7/`)

A visitor who types a valid phone number or e-mail and leaves without sending
the form is kept as a **draft**, so the team can still call back. Drafts are an
internal note: they never reach Zapier, HubSpot or Meta, and the submitted lead
from `contact.php` remains the only CRM lead.

```
form field (blur / 1 s pause) ─► POST /lead-draft.php ─► private store (one record per form_session_id)
                                                        ├─► e-mail "Nouveau prospect en cours"   (once, if still open after 45 s)
                                                        └─► e-mail "Lead abandonné"              (once, after 10 min idle)
submit ─► POST /contact.php ─► Zapier (unchanged) ─► draft marked `submitted` ─► no draft e-mail
```

### 8.1 What is stored

One JSON record per `form_session_id`, in `<parent of public_html>/emara-lead-drafts`
(outside the web root; `LEAD_DRAFTS_DIR` overrides). There is no database in
this project: the store follows the Meta ledger — atomic writes under an
exclusive lock.

`id`, `form_session_id` (unique), `project_name`, `name`, `phone`, `email`,
`budget`, `intent`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`,
`utm_term`, `fbclid`, `page_url`, `current_step`, `fields_completed`, `status`
(`in_progress` / `submitted` / `abandoned`), `created_at`, `last_activity_at`,
`submitted_at`, `abandoned_at`, `partial_notification_sent_at`,
`abandonment_notification_sent_at`.

Only what the visitor typed plus the campaign attribution the lead already
carries. No IP address, no user agent. `budget` and `intent` exist in the model
but this form does not ask them before submit, so they stay empty.

Retention: 90 days after the last activity; 7 days once submitted (the CRM
then holds the lead). Constants at the top of `lead-private/lead-drafts.php`.

### 8.2 Rules

- A draft is created only once a phone number or an e-mail passes validation
  (re-checked server-side). Opening the form, or typing a name only, stores nothing.
- Updates are an upsert on `form_session_id`. A newer valid value replaces the
  stored one; an empty or half-typed value never erases a captured one.
- `contact.php` closes the draft only after Zapier accepted the lead. If Zapier
  is down the lead is refused as before and the draft stays open — the team is
  still told ten minutes later.
- Each e-mail is claimed under the lock before it is sent: at most one of each
  kind per form session, including under concurrent requests. A failed delivery
  is retried by later sweeps, three sends at most.
- `form_session_id` is read by `contact.php` and **not** forwarded to Zapier.

### 8.3 When the abandonment check runs

There is no scheduler in this project, so the sweep runs:

1. from **cron** — recommended, every 5 minutes (Hostinger hPanel → Cron jobs):
   `php /home/<user>/domains/emaraestates.com/public_html/lead-draft.php sweep`
2. as a fallback, after any draft request and after a data-free ping each
   landing page view sends — so without cron the e-mail leaves at the next
   visitor rather than at the tenth minute.

### 8.4 Limits

POST only, same-origin (`Origin`/`Referer` must match the host), body ≤ 4 KB,
honeypot and minimum typing time, 120 requests and 20 new drafts per IP per
hour (its own allowance — never contact.php's), 300 new drafts and 40
notification e-mails per hour overall. No key or secret is exposed to the browser.

### 8.5 Switches

| Where | Effect |
| --- | --- |
| `VALIDATION.partialCapture = false` (`web/src/lib/content/honest-signature-7.ts`) | the page sends no draft request |
| `LEAD_DRAFTS_DISABLED=1` (`.env`) | the endpoint stores and sends nothing |
| `LEAD_DRAFTS_PARTIAL_EMAIL=0` (`.env`) | abandonment e-mail only |

The two `.env` keys are not passed through by the deploy workflow yet; add them
to its key list if they are to be set in production.

### 8.6 To validate before production

- **Privacy notice.** The form says « Vos coordonnées servent uniquement à vous
  recontacter au sujet de Honest Signature 7 » and the footer cites law 09-08.
  Neither says that details are recorded as they are typed, before the form is
  sent. Whether that needs wording — and which — is for Emara and its counsel.
- Retention periods above.
- After the first deploy: `contact.php?debug=<key>` reports `lead_drafts`
  (`store_writable`, `store_outside_web_root`) as booleans.

### 8.7 Test evidence

`npm run lead-drafts-check` — 106 assertions: the seven scenarios (A–G),
validation, limits, retention, eight concurrent processes, and real HTTP
requests against `lead-draft.php` + `contact.php` with a local Zapier stand-in.
`npm run honest7-check` — 196 assertions in Chromium and WebKit, 33 of them on
draft behaviour in the browser.

---

## 9. Ad pixels on `/honest-signature-7/` — Meta and Snapchat, separately

Both base pixels are installed once, for the whole site, in the root layout
(`MetaPixel.tsx`, `SnapPixel.tsx`): init + page view. This page adds no init.
What each platform receives per funnel moment lives in one file,
`web/src/components/honest-7/pixels.ts`.

| Moment | Meta | Snapchat |
| --- | --- | --- |
| Page loads | `PageView` (base) | `PAGE_VIEW` (base) |
| Landing viewed | `ViewContent` | `VIEW_CONTENT` |
| First interaction with the form | `LeadFormStarted` | `CUSTOM_EVENT_1` |
| Backend accepted the lead | `Lead` (event ID shared with CAPI), `LeadFormStepCompleted` | `SIGN_UP` (`client_dedup_id` = same ID) |
| Phone / WhatsApp link clicked | `Contact` | — |

Meta also keeps the page's funnel custom events (`landing_view`,
`form_started`, `lead_submit_success`…); they are never sent to Snap.

Snap's pixel accepts a closed list of event types plus `CUSTOM_EVENT_1`–`5`.
The other forms of the site still send `BuyerLead`, `RecruitmentApplication`
and an unnumbered `CUSTOM_EVENT`, which are not on that list
(`web/src/lib/snap-pixel.ts`, `web/src/lib/gueliz-attribution.ts`).

Attribution: `ScCid` (Snap's click ID) is captured on arrival like `fbclid`,
first touch, and travels with the lead as `sc_click_id` — a seventh additive
key in `contact.php` / `server.js`. `adPlatform` is `Snapchat` for that traffic.
`source` (`Meta Ads`) and `lead_origin` (`Meta Landing Page`) are fixed values
of this page and are **not** changed by the visitor's origin.

## 10. Today's activity on `/honest-signature-7/` (`activity.php`)

The band at the top of each lead card — « Activité aujourd’hui · N demandes
reçues aujourd’hui » — shows how many requests were received today for the
project. It replaces any stock figure: remaining inventory is not shown
anywhere on the page.

**Source of the number.** `contact.php`, at the point where a lead is accepted
(Zapier answered 2xx): it calls `activityCountLead()` once. A request counts
when it is the landing page's lead (`form_type: honest_signature_7_request`,
`lead_stage: lead`) with a name and a phone number. Not counted: the optional
follow-up (`lead_stage: qualification`), every other form, a filled honeypot,
a form sent too fast, a request Zapier refused. The same person — same phone
or same e-mail — counts once per day.

Why requests and not reservations: the backend has no reservation or deal
data (HubSpot is only written to, contacts only), so a reservation count
could only be typed in by hand. Requests are counted where they arrive.

| Request | Who | Effect |
| --- | --- | --- |
| `GET /activity.php` | the page, every 30 s (after `load`, paused in a hidden tab) | `{"ok":true,"enabled":true,"day":"2026-10-04","requests":7}` |
| any other method | — | 405; nothing can be written through this URL |

The day runs midnight to midnight, Africa/Casablanca; the count restarts at 0.
While it is 0, or with no answer, the band is not rendered. « +1 » plays only
when a later answer reports more requests, for the same day, than the answer
that visitor already had; then the count changes. Never on page load, never on
a timer.

Store: `<parent of public_html>/emara-activity/activity.json` (override
`ACTIVITY_DIR`) — the day, its count, and salted hashes of the phone numbers
and e-mail addresses already counted, renewed with a new salt each day. No
name, number or address is written. A count with no recorded request behind it
reads as 0. `ACTIVITY_DISABLED=1` stops the counting and hides the band.
Counting can never affect a lead: it runs after the lead is accepted and never
throws.

Test evidence: `npm run activity-check` (counting rules, day boundary,
deduplication, tampering, concurrency, the real path through `contact.php`
with a local Zapier stub); `scripts/honest7-check.mjs` (band, nothing on load,
« +1 » on a new request, day change, failures).

