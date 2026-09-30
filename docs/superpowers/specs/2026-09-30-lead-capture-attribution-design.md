# Lead Capture and Attribution Design

Date: 30 September 2026
Status: Approved in brainstorming; pending written-spec review

## 1. Goal

Give every Ocha visitor a next step that matches how ready they are, and make sure every lead reaching GoHighLevel (GHL) or WhatsApp carries its source.

Today the only exit is "book now": a calendar or button that opens WhatsApp. Visitors who are still researching (most organic traffic, which lands on cost articles) have no way to stay in touch, so they leave. The two existing lead-magnet guides have no internal links. WhatsApp messages carry no source, and several WhatsApp buttons are not tracked.

This is sub-project 1 of the lead conversion and nurturing initiative:

| # | Sub-project | Output |
|---|---|---|
| 0 | Reconcile repository | Merge `codex/indonesia-patient-lead-drafts` into `main` so `main` matches production |
| 1 | On-site capture and attribution | This spec |
| 2 | GHL handover and email nurture | Field, tag and workflow specification plus Bahasa Indonesia email sequences for the colleague who builds GHL |
| 3 | Content loop | Weekly article briefs must name an offer |

Sub-project 0 ships in the same pull request as sub-project 1.

## 2. Confirmed constraints

- GHL handles all leads. A colleague builds GHL; the website's only touch point with GHL is GHL forms.
- Nurture uses email only. WhatsApp remains the channel for ready-to-book leads.
- Ocha is free for patients, coordinates introductions only, and must not imply diagnosis, treatment, guaranteed availability or guaranteed prices.
- The existing analytics privacy rule stands: analytics payloads may contain only allowlisted, non-personal parameters.
- Bahasa Indonesia is the site language. Doctor data is read from Supabase at build time; this work needs no Supabase writes or schema changes.
- All external access (GitHub, Supabase, Netlify) goes through Composio. Delivery is a pull request into `main`; merging deploys through Netlify.

## 3. Offer ladder

| Visitor state | Offer key | Offer | GHL form |
|---|---|---|---|
| Researching | `guide-budget` | Budget-planning checklist (PDF and Excel template) | Existing `8mc2c64K6YCTnOH75aTZ` |
| Researching | `guide-second-opinion` | Second-opinion guide and checklist | Existing `ExtHZ1c0bo6WxhQmBrSS` |
| Comparing doctors | `shortlist` | Emailed shortlist of 2–3 partner doctors with next steps | New; colleague creates |
| Near decision | `estimate` | Written cost estimate requested from a partner hospital | New; colleague creates |
| Ready | — | Existing calendar and WhatsApp booking, now tagged with source | — |

Estimate copy must state that the estimate is non-binding and that the hospital sets the final cost after the doctor's examination.

## 4. Approach

Hybrid capture (approach C). A short on-site step collects intent only, with no personal data: specialty and Malaysian city, for the shortlist and estimate offers. The visitor then opens a pop-up that loads the GHL form only on demand. The form URL carries intent and attribution as hidden-field query parameters. GHL keeps ownership of the form and the contact data. The site stays fast because no GHL script loads before the click.

Rejected alternatives:

- **GHL iframes embedded in every page**: GHL script and a 600 px iframe on every page slow the site, look off-brand and are awkward on mobile.
- **Native forms posting to the GHL API**: this needs an API token or webhook, which breaks the rule that forms are the only touch point.

## 5. Components

### 5.1 New

- **`src/lib/offers.js`**: offer registry (key, label, headline, pitch, bullets, button text, optional note, `needsIntent`, GHL `formId`, optional `guideSlug`). It also holds:
  - `offerForArticle({ offer, slug, category })`: frontmatter `offer` wins; otherwise `second-opinion` slugs → `guide-second-opinion`, `biaya-*` slugs → `estimate`, cost or budget categories → `guide-budget`, and everything else → `shortlist`.
  - `cityFromLocation(location)`: maps full hospital addresses to Kuala Lumpur, Penang, Kuching, Johor or Melaka (Selangor and Petaling Jaya map to Kuala Lumpur).
  - `intentOptions(doctors)`: specialty labels, with the "Dokter Spesialis" prefix removed, ordered by doctor count; and cities present in the data, in registry order.
- **`src/lib/attribution.js`**:
  - `captureAttribution()`, run on every page, keeps a first touch and a last touch in `localStorage` under `ocha_attr_v1` (Section 7).
  - `offerFields(offerKey, { specialty, city, sourcePage })` returns the hidden-field values.
  - `buildOfferFormUrl(offerKey, fields)` returns the GHL form URL with non-empty fields as query parameters, or an empty string when the offer has no form ID.
  - `buildWhatsAppUrl(message, ref)` returns the single canonical `https://wa.me/<number>?text=` link, with a final line `(ref: <ref>)`.
  - `whatsappRef(path)` turns a page path into a short reference.
- **`src/components/LeadOffer.jsx`** (React island): the card with its `inline`, `sidebar` and `banner` variants, the intent step (two selects, both with an "I don't know yet" option), and the pop-up. The pop-up renders through a portal to `<body>`, closes on Escape or a backdrop click, moves focus to the close button, locks page scroll, and loads the iframe only when opened.
- **`src/components/OfferCard.astro`**: server wrapper. It resolves intent options from published doctors, using one cached Supabase fetch per build, and mounts `LeadOffer` with `client:visible`. In production builds it renders nothing when the offer has no form ID.
- **`src/components/SiteScripts.astro`**: included in both layouts. It runs `captureAttribution()` and sends `click_whatsapp_concierge` with `cta_placement` for every link marked `data-wa-placement`.
- **`src/pages/terima-kasih.astro`**: the page GHL redirects to after a submission, with `?offer=<key>`. It is `noindex,follow`, shows copy for that offer, sends `generate_lead`, and offers a WhatsApp shortcut with `ref: terima-kasih/<offer>`.

### 5.2 Changed

- **`src/lib/doctors.js`**: add `getPublishedDoctorsCached()`, one promise per build.
- **`src/lib/analytics.js`**: allow the events `view_offer`, `open_offer_form` and `generate_lead`, and the parameter `offer`.
- **`src/lib/blog-schema.js`**: optional `offer` (enum of offer keys) and optional `offerSpecialty` (string).
- **Blog articles**: set `offer` and `offerSpecialty` on the existing articles (the cost articles use `estimate` with their specialty).
- **`src/pages/blog/[...slug].astro`**: add an inline card after the article body and before the FAQ. The desktop-only sidebar gets the sidebar card plus a secondary "Sudah siap? Pilih jadwal dokter" link. The existing bottom directory call to action stays.
- **`src/pages/doctors.astro`**: shortlist banner below the directory.
- **`src/pages/dokter/[slug].astro`**: shortlist banner before "Cara meminta janji melalui Ocha", pre-filled with the page's specialty and city.
- **`src/pages/doctor/[id].astro`**: estimate card after the booking widget and before the testimonials, pre-filled with the doctor's specialty and city.
- **`src/pages/index.astro`**: budget-guide card between Testimonials and FAQ.
- **`src/pages/guide/[...slug].astro`**: replace the always-on iframe with the same on-demand pop-up.
- **WhatsApp links**: all of them go through `buildWhatsAppUrl` with a reference and `data-wa-placement` (navbar and mobile menu in both layouts, hero, bottom call to action, directory cards, booking widget with `ref: doctor/<id>`, thank-you page, MM2H page). The `api.whatsapp.com` and bare `wa.me/60125525544` formats are removed.
- **`src/pages/privacy.astro`**: a short paragraph on first-party attribution storage and on processing form data in GHL for follow-up email.

### 5.3 Unchanged

Booking calendar behaviour, Supabase schema and data, SEO indexability rules, sitemap filtering logic, and the MM2H page's content.

## 6. Placement rules

| Page | Offer | Placement | Pre-filled |
|---|---|---|---|
| Homepage | `guide-budget` | Between Testimonials and FAQ | — |
| Articles | Per `offerForArticle` | After body; desktop sidebar | `offerSpecialty` |
| `/doctors/` | `shortlist` | Banner below directory | — |
| Specialty and city pages | `shortlist` | Banner before process section | Specialty and city |
| Doctor profiles | `estimate` | After booking widget | Specialty and city |
| `/guide/*` | Its own guide | Replaces always-on iframe | — |

- Each page has one offer. On doctor pages the calendar and WhatsApp stay above the offer.
- The sidebar card shows only on desktop, so mobile does not show the offer twice.
- `/guide/*` stays `noindex,follow`.

## 7. Data and privacy

### 7.1 Attribution storage

- Key: `ocha_attr_v1`. Value: `{ first, last }`. Each touch holds `landing_page` (path), `referrer` (external hostname only), and any of `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` and `utm_term`.
- `first` is written once. `last` is replaced only when the current visit has UTM parameters or an external referrer.
- `currentAttribution()` returns the first touch's `landing_page` and `referrer`, and each UTM value from `last`, falling back to `first`.
- Storage read and write are wrapped in `try`/`catch`. If storage is blocked, attribution uses the current page only and the page keeps working.
- No names, contact details, symptoms or free text are stored.

### 7.2 Hidden fields sent to GHL

`offer`, `specialty`, `city`, `source_page`, `landing_page`, `referrer`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`. Each value is cut to 120 characters. Empty values are left out of the URL.

### 7.3 GHL checklist for the colleague

1. Create two forms. **Shortlist** asks for full name, email, WhatsApp number and consent. **Estimate** asks for the same fields plus an optional "Tindakan / kebutuhan" text field.
2. Add the eleven hidden fields in 7.2 to all four forms, with query keys exactly as listed.
3. Add a required, unticked consent checkbox: "Saya setuju menerima email dari Ocha Healthcare dan dapat berhenti kapan saja." This supports consent under Indonesia's Personal Data Protection Law (UU 27/2022).
4. On submit, redirect to `https://ocha.health/terima-kasih/?offer=<key>`, using the matching key per form.
5. Send the two new form IDs to be added to `offers.js`.
6. Tags and workflows per `offer` are defined in sub-project 2.

### 7.4 Analytics

- New events: `view_offer` (card mounted in view), `open_offer_form` (pop-up opened) and `generate_lead` (thank-you page).
- New parameter: `offer`. `specialty` and `location` are normalised with `normalizeDimension`.
- Free text, names and contact details go only to GHL, never to GA4, GTM or Clarity.
- `generate_lead` is marked as a GA4 key event in GTM (done manually by whoever owns GTM).

## 8. Error handling

| Case | Behaviour |
|---|---|
| Offer has no form ID | Production: card not rendered. Development: pop-up shows a labelled placeholder form. |
| Development preview | Real GHL forms do not auto-load; a "Muat formulir asli" button loads them, so previews do not create real contacts. The hidden-field debug panel appears in development only. |
| GHL iframe slow or failing | Spinner, then after 8 seconds a fallback: "Formulir belum termuat — lanjut via WhatsApp" linking to WhatsApp with the page reference. |
| Missing or unknown `?offer=` on the thank-you page | Generic copy; `generate_lead` sends `offer=unknown`. |
| Supabase fetch fails at build | Build fails (existing rule). |
| Unknown `offer` in frontmatter | Build fails (schema enum). |
| JavaScript disabled | Card HTML renders server-side and the offer button does nothing; WhatsApp links still work as plain links. |

## 9. Testing

Automated tests, using the existing `node --test` style:

- `tests/offers.test.mjs`: `offerForArticle` defaults and overrides; `cityFromLocation` on real address shapes (Kuala Lumpur, Petaling Jaya, Penang, Perai, Kuching, multi-address strings, unknown); `intentOptions` ordering and de-duplication.
- `tests/attribution.test.mjs`: first-touch and last-touch rules; blocked-storage fallback; 120-character clip; empty-value omission; form URL for known and missing form IDs; WhatsApp URL format and reference line.
- `tests/analytics.test.mjs`: new events and the `offer` parameter are accepted; unlisted parameters are still dropped.
- `tests/lead-offers-build.test.mjs` (checks built HTML): cost articles contain the estimate card; `/terima-kasih/` is `noindex` and absent from the sitemap; no `api.whatsapp.com` or bare `wa.me/60125525544` links remain; every `wa.me` link has a `ref` line.
- The existing test suite, SEO audit and sitemap filter pass.

Browser checks before the pull request, on desktop and mobile: an article, the directory, a doctor profile, a specialty page, a guide and the thank-you page. Check that the pop-up works from the keyboard (Escape closes it, focus moves correctly), that there is no layout shift, and that the mobile Lighthouse performance score on an article page is within 5 points of the live site's score or higher.

## 10. Delivery

- One pull request into `main` through Composio (HMS Nisa GitHub account) containing sub-project 0 (the content-drafts merge) and this sub-project.
- Shortlist and estimate cards stay hidden in production until the colleague supplies form IDs. A small follow-up pull request then turns them on.
- The prototype branch `prototype/lead-capture-preview` is reference only and is never pushed.

## 11. Out of scope

Hero trust-line fix, an offer on the blog index, an MM2H lead form, GHL workflows and email copy (sub-project 2), content-brief changes (sub-project 3), and any paid acquisition.
