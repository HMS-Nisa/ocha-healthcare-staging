# Lead Capture and Attribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add intent-matched lead offers (guides, doctor shortlist, cost estimate) that open on-demand GHL forms carrying intent and attribution, give every WhatsApp link a source reference, and record conversions on a thank-you page.

**Architecture:** Two pure libraries (`src/lib/offers.js` for the offer registry and intent helpers, `src/lib/attribution.js` for first/last-touch storage and URL builders) feed one React island (`LeadOffer.jsx`) mounted through a server wrapper (`OfferCard.astro`). A site-wide script captures attribution and tracks tagged WhatsApp links. GHL owns forms and data; the site only builds form URLs with hidden-field query parameters.

**Tech Stack:** Astro 5 (static), React 19 islands, Tailwind 3, lucide-react, `node --test`, Supabase REST (read-only at build), GHL form widget (`https://link.healthmetrics.com/widget/form/<id>`).

**Spec:** `docs/superpowers/specs/2026-09-30-lead-capture-attribution-design.md`

## Global Constraints

- Website only. No GHL configuration, tags, workflows or email copy.
- Site copy is Bahasa Indonesia. Code identifiers are English.
- Analytics payloads contain only allowlisted parameters: `page_type`, `specialty`, `location`, `cta_placement`, `offer`. Never names, contact details, symptoms, free text or message bodies.
- No GHL script or iframe loads before the visitor clicks an offer button.
- Attribution storage key: `ocha_attr_v1`. Stored values: `landing_page`, `referrer` (external hostname only), `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`.
- Hidden-field keys, exactly: `offer`, `specialty`, `city`, `source_page`, `landing_page`, `referrer`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`. Values clipped to 120 characters; empty values omitted from URLs.
- WhatsApp: one canonical form `https://wa.me/60125525544?text=<encoded message>` whose decoded text ends with `\n\n(ref: <ref>)`. `api.whatsapp.com` and bare `wa.me/60125525544` links are removed.
- Offer keys: `shortlist`, `estimate`, `guide-budget`, `guide-second-opinion`. Existing form IDs: `guide-budget` → `8mc2c64K6YCTnOH75aTZ`, `guide-second-opinion` → `ExtHZ1c0bo6WxhQmBrSS`. `shortlist` and `estimate` have `formId: null` until the colleague supplies IDs.
- Production builds do not render an offer whose `formId` is `null`. Development shows a labelled placeholder.
- Development never auto-loads a real GHL form; a "Muat formulir asli" button loads it.
- Estimate copy must say: "Estimasi tidak mengikat. Biaya akhir ditentukan rumah sakit setelah pemeriksaan dokter."
- Consent line shown in placeholders: "Saya setuju menerima email dari Ocha Healthcare dan dapat berhenti kapan saja."
- Thank-you page: `/terima-kasih/`, `noindex,follow`, excluded from sitemap.
- All external access (GitHub push, pull request) goes through Composio account `github_levers-cnida` (HMS Nisa). Never merge or deploy.
- Local builds read `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the gitignored `.env`. Never commit `.env` or `.claude/`.

## Starting state

- Branch `feat/lead-capture-attribution`, based on `abd61ff` (tip of `origin/codex/indonesia-patient-lead-drafts`, which fast-forwards `main`). It already contains the spec commits.
- `npm test` passes (54 tests).
- Prototype branch `prototype/lead-capture-preview` is reference only. Do not merge or push it.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/offers.js` (new) | Offer registry and pure helpers: article/guide mapping, city parsing, intent options, availability |
| `src/lib/attribution.js` (new) | Attribution storage, hidden-field values, GHL form URL, WhatsApp URL and ref |
| `src/lib/analytics.js` (modify) | Allowlist new events and `offer` parameter |
| `src/lib/doctors.js` (modify) | Cached doctor fetch per build |
| `src/lib/blog-schema.js` (modify) | Optional `offer` and `offerSpecialty` frontmatter |
| `scripts/seo-audit.mjs` (modify) | Fail build on non-canonical WhatsApp links and indexable thank-you page |
| `src/components/SiteScripts.astro` (new) | Site-wide attribution capture and WhatsApp click tracking |
| `src/components/LeadOffer.jsx` (new) | Offer card variants, intent step, pop-up with on-demand GHL iframe |
| `src/components/OfferCard.astro` (new) | Server wrapper: availability check, intent options, island mount |
| `src/pages/terima-kasih.astro` (new) | Post-submit confirmation and `generate_lead` |
| Layouts, Hero, CTA, Directory, BookingWidget, doctor page, guide page, MM2H page (modify) | Canonical WhatsApp links |
| Blog page, directory, specialty page, doctor page, homepage, guide page (modify) | Offer placements |
| `src/pages/privacy.astro` (modify) | Disclosure of attribution storage and GHL form processing |
| `tests/offers.test.mjs`, `tests/attribution.test.mjs`, `tests/whatsapp-links.test.mjs`, `tests/lead-offer-placements.test.mjs` (new) | Tests |

---

### Task 1: Offer registry

**Files:**
- Create: `src/lib/offers.js`
- Test: `tests/offers.test.mjs`

**Interfaces:**
- Produces:
  - `GHL_FORM_BASE: string`
  - `OFFERS: Record<string, Offer>` where `Offer = { key, label, headline, pitch, bullets: string[], cta, note?, needsIntent: boolean, formId: string|null, guideSlug? }`
  - `OFFER_KEYS: string[]`
  - `getOffer(key: string): Offer|null`
  - `offerForArticle({ offer?, slug?, category? }): string`
  - `offerKeyForGuide(slug: string): string` (empty string when none)
  - `isOfferAvailable(offer: Offer|null, { dev?: boolean }): boolean`
  - `cityFromLocation(location: string): string`
  - `intentOptions(doctors: {specialty, location}[]): { specialties: string[], cities: string[] }`

- [ ] **Step 1: Write the failing test**

Create `tests/offers.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  OFFERS,
  OFFER_KEYS,
  getOffer,
  offerForArticle,
  offerKeyForGuide,
  isOfferAvailable,
  cityFromLocation,
  intentOptions,
} from '../src/lib/offers.js';

test('registry exposes the four approved offers', () => {
  assert.deepEqual(OFFER_KEYS, ['shortlist', 'estimate', 'guide-budget', 'guide-second-opinion']);
  assert.equal(getOffer('estimate').needsIntent, true);
  assert.equal(getOffer('guide-budget').needsIntent, false);
  assert.equal(getOffer('unknown'), null);
  assert.match(getOffer('estimate').note, /Estimasi tidak mengikat\. Biaya akhir ditentukan rumah sakit setelah pemeriksaan dokter\./);
});

test('guide form IDs match the lead magnet frontmatter', async () => {
  for (const offer of Object.values(OFFERS).filter((item) => item.guideSlug)) {
    const source = await readFile(new URL(`../src/content/magnets/${offer.guideSlug}.md`, import.meta.url), 'utf8');
    assert.equal(source.match(/formId:\s*"([^"]+)"/)?.[1], offer.formId, offer.key);
  }
});

test('article offer uses frontmatter first, then topic defaults', () => {
  assert.equal(offerForArticle({ offer: 'guide-budget', slug: 'biaya-x' }), 'guide-budget');
  assert.equal(offerForArticle({ offer: 'bogus', slug: 'panduan-second-opinion' }), 'guide-second-opinion');
  assert.equal(offerForArticle({ slug: 'biaya-pasang-ring-jantung-di-malaysia' }), 'estimate');
  assert.equal(offerForArticle({ slug: 'tips', category: 'Biaya & Anggaran' }), 'guide-budget');
  assert.equal(offerForArticle({ slug: 'cara-meminta-slot' }), 'shortlist');
  assert.equal(offerForArticle(), 'shortlist');
});

test('guide slugs map to their offer key', () => {
  assert.equal(offerKeyForGuide('panduan-second-opinion'), 'guide-second-opinion');
  assert.equal(offerKeyForGuide('checklist-perencanaan-anggaran-berobat-ke-malaysia'), 'guide-budget');
  assert.equal(offerKeyForGuide('missing'), '');
});

test('offers without a form ID are available only in development', () => {
  assert.equal(isOfferAvailable(getOffer('shortlist'), { dev: false }), false);
  assert.equal(isOfferAvailable(getOffer('shortlist'), { dev: true }), true);
  assert.equal(isOfferAvailable(getOffer('guide-budget'), { dev: false }), true);
  assert.equal(isOfferAvailable(null, { dev: true }), false);
});

test('cities are parsed from real hospital address shapes', () => {
  assert.equal(cityFromLocation('Level 11, No. 11, Jalan Teknologi, Taman Sains Selangor 1, PJU 5, Kota Damansara, 47810 Petaling Jaya, Kuala Lumpur'), 'Kuala Lumpur');
  assert.equal(cityFromLocation('282 & 286 Jalan Ampang, KL, Kuala Lumpur'), 'Kuala Lumpur');
  assert.equal(cityFromLocation('3106, Lebuh Tenggiri 2 Seberang Jaya, 13700 Perai, Pulau Pinang, Malaysia, Penang'), 'Penang');
  assert.equal(cityFromLocation('82, Jalan Tengah, Penang\n570, Jalan Perda Utama, Bandar Perda, Penang'), 'Penang');
  assert.equal(cityFromLocation('Terletak di Jalan Stutong, Kuching'), 'Kuching');
  assert.equal(cityFromLocation('Singapore'), '');
  assert.equal(cityFromLocation(), '');
});

test('intent options rank specialties by doctor count and keep registry city order', () => {
  const doctors = [
    { specialty: 'Dokter Spesialis Jantung', location: '82, Jalan Tengah, Penang' },
    { specialty: 'Dokter Spesialis Ortopedi (tulang)', location: 'Bukit Lanjan, 60000 Kuala Lumpur' },
    { specialty: 'Dokter Spesialis Ortopedi (tulang)', location: 'Bukit Lanjan, 60000 Kuala Lumpur' },
    { specialty: 'Dokter Spesialis Jantung', location: 'Bukit Lanjan, 60000 Kuala Lumpur' },
    { specialty: 'Dokter Spesialis Ortopedi (tulang)', location: '82, Jalan Tengah, Penang' },
    { specialty: 'Dokter Spesialis Onkologi', location: 'Singapore' },
    { specialty: '', location: '' },
  ];
  assert.deepEqual(intentOptions(doctors), {
    specialties: ['Ortopedi (tulang)', 'Jantung', 'Onkologi'],
    cities: ['Kuala Lumpur', 'Penang'],
  });
  assert.deepEqual(intentOptions(), { specialties: [], cities: [] });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/offers.test.mjs`
Expected: FAIL with `Cannot find module '.../src/lib/offers.js'`

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/offers.js`:

```js
// Offer registry: one place for every lead offer shown on the site.
// formId is the GHL form ID. null means the GHL form has not been built yet.

export const GHL_FORM_BASE = 'https://link.healthmetrics.com/widget/form/';

export const OFFERS = {
  shortlist: {
    key: 'shortlist',
    label: 'Daftar Dokter Pilihan',
    headline: 'Dapatkan daftar 2–3 dokter spesialis yang sesuai',
    pitch: 'Pilih spesialisasi dan kota. Tim Ocha mengirim daftar dokter mitra beserta langkah selanjutnya ke email Anda.',
    bullets: [
      'Dipilih dari jaringan rumah sakit mitra terverifikasi',
      'Termasuk rumah sakit, bahasa, dan cara membuat janji',
      'Gratis dan tanpa kewajiban',
    ],
    cta: 'Kirim Daftar ke Email Saya',
    needsIntent: true,
    formId: null,
  },
  estimate: {
    key: 'estimate',
    label: 'Estimasi Biaya Resmi',
    headline: 'Minta estimasi biaya langsung dari rumah sakit mitra',
    pitch: 'Sampaikan kebutuhan Anda. Tim Ocha meminta estimasi tertulis dari rumah sakit mitra dan mengirimkannya melalui email.',
    bullets: [
      'Estimasi dari rumah sakit, bukan angka perkiraan umum',
      'Bantu Anda merencanakan anggaran sebelum berangkat',
      'Gratis untuk pasien',
    ],
    note: 'Estimasi tidak mengikat. Biaya akhir ditentukan rumah sakit setelah pemeriksaan dokter.',
    cta: 'Minta Estimasi Gratis',
    needsIntent: true,
    formId: null,
  },
  'guide-budget': {
    key: 'guide-budget',
    label: 'Checklist Anggaran Berobat',
    headline: 'Checklist perencanaan anggaran berobat ke Malaysia',
    pitch: 'Catat komponen biaya medis dan perjalanan sebelum meminta estimasi dari rumah sakit.',
    bullets: [
      'Pisahkan biaya medis dari kebutuhan perjalanan',
      'Daftar pertanyaan biaya untuk rumah sakit',
      'PDF dan template Excel kosong',
    ],
    cta: 'Unduh Checklist Gratis',
    needsIntent: false,
    formId: '8mc2c64K6YCTnOH75aTZ',
    guideSlug: 'checklist-perencanaan-anggaran-berobat-ke-malaysia',
  },
  'guide-second-opinion': {
    key: 'guide-second-opinion',
    label: 'Panduan Second Opinion',
    headline: 'Panduan dan checklist second opinion',
    pitch: 'Siapkan dokumen dan pertanyaan yang tepat sebelum meminta opini kedua dari dokter di Malaysia.',
    bullets: [
      'Daftar dokumen medis yang perlu dibawa',
      'Pertanyaan kunci untuk dokter baru',
      'Template kronologis medis',
    ],
    cta: 'Unduh Panduan Gratis',
    needsIntent: false,
    formId: 'ExtHZ1c0bo6WxhQmBrSS',
    guideSlug: 'panduan-second-opinion',
  },
};

export const OFFER_KEYS = Object.keys(OFFERS);

export function getOffer(key) {
  return OFFERS[key] || null;
}

// Blog articles pick an offer via frontmatter `offer`; otherwise fall back by topic.
export function offerForArticle({ offer, slug = '', category = '' } = {}) {
  if (offer && OFFERS[offer]) return offer;
  if (/second-opinion/i.test(slug)) return 'guide-second-opinion';
  if (/^biaya-/i.test(slug)) return 'estimate';
  if (/biaya|anggaran/i.test(category)) return 'guide-budget';
  return 'shortlist';
}

export function offerKeyForGuide(slug = '') {
  return Object.values(OFFERS).find((offer) => offer.guideSlug === slug)?.key || '';
}

// Production hides offers whose GHL form does not exist yet.
export function isOfferAvailable(offer, { dev = false } = {}) {
  return Boolean(offer) && (dev || Boolean(offer.formId));
}

const CITY_PATTERNS = [
  ['Kuala Lumpur', /kuala lumpur|\bkl\b|selangor|petaling jaya/i],
  ['Penang', /penang|pulau pinang|george town|perai/i],
  ['Kuching', /kuching|sarawak/i],
  ['Johor', /johor/i],
  ['Melaka', /melaka|malacca/i],
];

export function cityFromLocation(location = '') {
  return CITY_PATTERNS.find(([, pattern]) => pattern.test(location))?.[0] || '';
}

// Specialty and city options for the intent step, built from published doctors.
export function intentOptions(doctors = []) {
  const specialties = new Map();
  const cities = new Set();
  for (const doctor of doctors) {
    const label = String(doctor.specialty || '').replace(/^dokter(?:\s+spesialis)?\s+/i, '').trim();
    if (label) specialties.set(label, (specialties.get(label) || 0) + 1);
    const city = cityFromLocation(doctor.location);
    if (city) cities.add(city);
  }
  return {
    specialties: [...specialties.entries()].sort((a, b) => b[1] - a[1]).map(([label]) => label),
    cities: CITY_PATTERNS.map(([city]) => city).filter((city) => cities.has(city)),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/offers.test.mjs`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/offers.js tests/offers.test.mjs
git commit -m "feat: add lead offer registry"
```

---

### Task 2: Attribution library

**Files:**
- Create: `src/lib/attribution.js`
- Test: `tests/attribution.test.mjs`

**Interfaces:**
- Consumes: `GHL_FORM_BASE`, `getOffer` from `src/lib/offers.js`; `WA_NUMBER` from `src/config.js`.
- Produces:
  - `captureAttribution(): { first, last }`
  - `currentAttribution(): { landing_page, referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term }` (all strings)
  - `offerFields(offerKey: string, { specialty?, city?, sourcePage? }): Record<string,string>` (11 keys, in the Global Constraints order)
  - `buildOfferFormUrl(offerKey: string, fields: Record<string,string>): string` (empty string when no form ID)
  - `whatsappRef(path: string): string`
  - `buildWhatsAppUrl(message: string, ref?: string): string`

- [ ] **Step 1: Write the failing test**

Create `tests/attribution.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  captureAttribution,
  currentAttribution,
  offerFields,
  buildOfferFormUrl,
  whatsappRef,
  buildWhatsAppUrl,
} from '../src/lib/attribution.js';

function fakeBrowser({ search = '', pathname = '/', referrer = '', storage = new Map(), blocked = false } = {}) {
  const localStorage = blocked
    ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }
    : { getItem: (key) => (storage.has(key) ? storage.get(key) : null), setItem: (key, value) => storage.set(key, String(value)) };
  globalThis.window = { location: { search, pathname, hostname: 'ocha.health' }, localStorage };
  globalThis.document = { referrer };
  return storage;
}

function resetBrowser() {
  delete globalThis.window;
  delete globalThis.document;
}

test('first touch is kept and last touch updates only on new campaign or external referrer', () => {
  try {
    const storage = fakeBrowser({ search: '?utm_source=instagram&utm_campaign=reel-a', pathname: '/' });
    captureAttribution();

    fakeBrowser({ pathname: '/blog/x/', referrer: 'https://ocha.health/', storage });
    captureAttribution();
    let stored = JSON.parse(storage.get('ocha_attr_v1'));
    assert.equal(stored.first.utm_campaign, 'reel-a');
    assert.equal(stored.last.utm_campaign, 'reel-a');
    assert.equal(stored.last.referrer, '');

    fakeBrowser({ search: '?utm_source=facebook&utm_campaign=post-b', pathname: '/doctors/', storage });
    captureAttribution();
    stored = JSON.parse(storage.get('ocha_attr_v1'));
    assert.equal(stored.first.utm_source, 'instagram');
    assert.equal(stored.last.utm_source, 'facebook');

    fakeBrowser({ pathname: '/dokter/x/', referrer: 'https://www.google.com/search?q=x', storage });
    captureAttribution();
    stored = JSON.parse(storage.get('ocha_attr_v1'));
    assert.equal(stored.last.referrer, 'www.google.com');

    assert.deepEqual(currentAttribution(), {
      landing_page: '/',
      referrer: '',
      utm_source: 'instagram',
      utm_medium: '',
      utm_campaign: 'reel-a',
      utm_content: '',
      utm_term: '',
    });
  } finally {
    resetBrowser();
  }
});

test('blocked storage never throws and yields empty attribution', () => {
  try {
    fakeBrowser({ search: '?utm_source=instagram', blocked: true });
    assert.doesNotThrow(() => captureAttribution());
    assert.equal(currentAttribution().utm_source, '');
  } finally {
    resetBrowser();
  }
});

test('attribution is empty on the server', () => {
  assert.deepEqual(captureAttribution(), {});
  assert.deepEqual(currentAttribution(), {});
});

test('offer fields include intent, source page and clipped attribution', () => {
  try {
    fakeBrowser({ search: `?utm_campaign=${'x'.repeat(200)}`, pathname: '/blog/biaya-a/' });
    captureAttribution();
    const fields = offerFields('estimate', { specialty: 'Jantung', city: '' });
    assert.deepEqual(Object.keys(fields), [
      'offer', 'specialty', 'city', 'source_page', 'landing_page', 'referrer',
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    ]);
    assert.equal(fields.offer, 'estimate');
    assert.equal(fields.specialty, 'Jantung');
    assert.equal(fields.source_page, '/blog/biaya-a/');
    assert.equal(fields.utm_campaign.length, 120);
  } finally {
    resetBrowser();
  }
});

test('form URL carries only non-empty fields and requires a form ID', () => {
  const url = new URL(buildOfferFormUrl('guide-budget', { offer: 'guide-budget', specialty: '', utm_source: 'instagram' }));
  assert.equal(url.origin + url.pathname, 'https://link.healthmetrics.com/widget/form/8mc2c64K6YCTnOH75aTZ');
  assert.equal(url.searchParams.get('offer'), 'guide-budget');
  assert.equal(url.searchParams.get('utm_source'), 'instagram');
  assert.equal(url.searchParams.has('specialty'), false);
  assert.equal(buildOfferFormUrl('shortlist', { offer: 'shortlist' }), '');
  assert.equal(buildOfferFormUrl('missing', {}), '');
});

test('WhatsApp links use one format with a trailing reference line', () => {
  assert.equal(whatsappRef('/blog/biaya-a/'), 'blog/biaya-a');
  assert.equal(whatsappRef('/'), 'beranda');
  assert.equal(whatsappRef(`/${'a'.repeat(100)}/`).length, 60);

  const url = buildWhatsAppUrl("Hi Ocha, I'd like help.", 'mm2h-pvip/general');
  assert.match(url, /^https:\/\/wa\.me\/60125525544\?text=/);
  assert.doesNotMatch(url, /'/);
  const text = decodeURIComponent(url.split('?text=')[1]);
  assert.equal(text, "Hi Ocha, I'd like help.\n\n(ref: mm2h-pvip/general)");
  assert.equal(decodeURIComponent(buildWhatsAppUrl('Halo').split('?text=')[1]), 'Halo');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/attribution.test.mjs`
Expected: FAIL with `Cannot find module '.../src/lib/attribution.js'`

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/attribution.js`:

```js
// First-party attribution: where a visitor came from, passed into GHL forms and
// WhatsApp messages. Stores no personal or medical data.

import { GHL_FORM_BASE, getOffer } from './offers.js';
import { WA_NUMBER } from '../config.js';

const STORAGE_KEY = 'ocha_attr_v1';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const MAX_FIELD_LENGTH = 120;

function readStore() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function writeStore(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private mode or blocked storage: attribution degrades to nothing stored.
  }
}

function referrerDomain() {
  try {
    const host = new URL(document.referrer).hostname;
    return host && host !== window.location.hostname ? host : '';
  } catch {
    return '';
  }
}

export function captureAttribution() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const utms = Object.fromEntries(UTM_KEYS.map((key) => [key, params.get(key) || '']).filter(([, value]) => value));
  const store = readStore();
  const touch = { landing_page: window.location.pathname, referrer: referrerDomain(), ...utms };
  const isNewSource = Object.keys(utms).length > 0 || Boolean(touch.referrer);
  const next = {
    first: store.first || touch,
    last: isNewSource ? touch : store.last || touch,
  };
  writeStore(next);
  return next;
}

export function currentAttribution() {
  if (typeof window === 'undefined') return {};
  const store = readStore();
  const first = store.first || {};
  const last = store.last || {};
  return {
    landing_page: first.landing_page || '',
    referrer: first.referrer || '',
    ...Object.fromEntries(UTM_KEYS.map((key) => [key, last[key] || first[key] || ''])),
  };
}

const clip = (value) => String(value || '').slice(0, MAX_FIELD_LENGTH);

// Hidden-field values for a GHL form. Keys must match the GHL form query keys.
export function offerFields(offerKey, { specialty = '', city = '', sourcePage = '' } = {}) {
  const attribution = currentAttribution();
  return {
    offer: offerKey,
    specialty: clip(specialty),
    city: clip(city),
    source_page: clip(sourcePage || (typeof window !== 'undefined' ? window.location.pathname : '')),
    landing_page: clip(attribution.landing_page),
    referrer: clip(attribution.referrer),
    ...Object.fromEntries(UTM_KEYS.map((key) => [key, clip(attribution[key])])),
  };
}

export function buildOfferFormUrl(offerKey, fields = {}) {
  const offer = getOffer(offerKey);
  if (!offer?.formId) return '';
  const url = new URL(`${GHL_FORM_BASE}${offer.formId}`);
  for (const [key, value] of Object.entries(fields)) if (value) url.searchParams.set(key, value);
  return url.href;
}

// Short source tag the agent sees at the end of a WhatsApp message.
export function whatsappRef(path = '') {
  const clean = String(path).replace(/^\/+|\/+$/g, '');
  return clean ? clean.slice(0, 60) : 'beranda';
}

export function buildWhatsAppUrl(message, ref = '') {
  const text = ref ? `${message}\n\n(ref: ${ref})` : message;
  // encodeURIComponent leaves apostrophes alone; escape them so HTML attribute parsing stays safe.
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text).replace(/'/g, '%27')}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/attribution.test.mjs`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/attribution.js tests/attribution.test.mjs
git commit -m "feat: add first-party attribution and link builders"
```

---

### Task 3: Analytics allowlist

**Files:**
- Modify: `src/lib/analytics.js:1-19`
- Test: `tests/analytics.test.mjs` (append)

**Interfaces:**
- Produces: events `view_offer`, `open_offer_form`, `generate_lead`; parameter `offer`.

- [ ] **Step 1: Write the failing test**

Append to `tests/analytics.test.mjs`:

```js
test('accepts lead offer events with the offer parameter only', () => {
  for (const eventName of ['view_offer', 'open_offer_form', 'generate_lead']) {
    assert.deepEqual(
      sanitizeEvent(eventName, { page_type: 'blog', offer: 'estimate', email: 'a@b.c', name: 'A' }),
      { event: eventName, page_type: 'blog', offer: 'estimate' },
    );
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/analytics.test.mjs`
Expected: FAIL — `sanitizeEvent` returns `null` for `view_offer`.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/analytics.js`, replace the two sets:

```js
const EVENTS = new Set([
  'view_doctor_directory',
  'view_doctor_profile',
  'select_booking_date',
  'select_booking_time',
  'click_whatsapp_booking',
  'click_whatsapp_concierge',
  'view_lead_guide',
  'view_offer',
  'open_offer_form',
  'generate_lead',
]);

const PARAMETERS = new Set([
  'page_type',
  'specialty',
  'location',
  'cta_placement',
  'offer',
]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/analytics.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics.js tests/analytics.test.mjs
git commit -m "feat: allow lead offer analytics events"
```

---

### Task 4: Build audit for WhatsApp links and thank-you page

**Files:**
- Modify: `scripts/seo-audit.mjs` (new export after `hasProhibitedPositioning`; checks inside `main()` loop and sitemap section)
- Test: `tests/seo-audit.test.mjs` (append; extend import)

**Interfaces:**
- Produces: `findNonCanonicalWhatsAppLinks(html: string): string[]` (offending hrefs).

- [ ] **Step 1: Write the failing test**

In `tests/seo-audit.test.mjs`, add `findNonCanonicalWhatsAppLinks,` to the import list from `../scripts/seo-audit.mjs`, then append:

```js
test('flags WhatsApp links that are not canonical or lack a source reference', () => {
  const good = '<a href="https://wa.me/60125525544?text=Halo%20Ocha%0A%0A(ref%3A%20blog%2Fbiaya-a)">A</a>';
  const legacy = '<a href="https://api.whatsapp.com/send/?phone=60125525544&text&type=phone_number&app_absent=0">B</a>';
  const bare = '<a href="https://wa.me/60125525544">C</a>';
  const noRef = '<a href="https://wa.me/60125525544?text=Halo%20Ocha">D</a>';
  const other = '<a href="/doctors/">E</a>';
  assert.deepEqual(findNonCanonicalWhatsAppLinks(good + other), []);
  assert.deepEqual(findNonCanonicalWhatsAppLinks(legacy + bare + noRef), [
    'https://api.whatsapp.com/send/?phone=60125525544&text&type=phone_number&app_absent=0',
    'https://wa.me/60125525544',
    'https://wa.me/60125525544?text=Halo%20Ocha',
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/seo-audit.test.mjs`
Expected: FAIL — `findNonCanonicalWhatsAppLinks` is not exported (`SyntaxError: The requested module ... does not provide an export named`).

- [ ] **Step 3: Write minimal implementation**

In `scripts/seo-audit.mjs`, directly after the `hasProhibitedPositioning` function, add:

```js
const canonicalWhatsAppLink = /^https:\/\/wa\.me\/\d+\?text=[^\s"']*%0A%0A\(ref%3A%20[^)\s"']+\)$/;

export function findNonCanonicalWhatsAppLinks(html) {
  return tags(html, 'a')
    .map((tag) => attribute(tag, 'href'))
    .filter((href) => /api\.whatsapp\.com|wa\.me\//i.test(href))
    .filter((href) => !canonicalWhatsAppLink.test(href));
}
```

Inside `main()`, in the `for (const file of htmlFiles)` loop, directly after the line `if (hasProhibitedPositioning(html)) failures.push(`${relative}: out-of-scope positioning`);`, add:

```js
    for (const href of findNonCanonicalWhatsAppLinks(html)) {
      failures.push(`${relative}: non-canonical WhatsApp link ${href}`);
    }
    if (relative === 'terima-kasih/index.html' && isIndexableByDefault(html)) {
      failures.push(`${relative}: thank-you page must be noindex`);
    }
```

In the sitemap section, directly after the line checking `/\/mm2h-pvip\//`, add:

```js
  if (/\/terima-kasih\//.test(sitemap)) failures.push('sitemap-0.xml: thank-you page must be excluded');
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/seo-audit.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/seo-audit.mjs tests/seo-audit.test.mjs
git commit -m "test: audit WhatsApp links and thank-you indexing"
```

---

### Task 5: Canonical WhatsApp links everywhere

**Files:**
- Create: `src/components/SiteScripts.astro`
- Modify: `src/layouts/Layout.astro`, `src/layouts/LandingLayout.astro`, `src/components/Hero.astro`, `src/components/CTA.astro`, `src/components/Directory.jsx`, `src/components/BookingWidget.jsx`, `src/pages/doctor/[id].astro`, `src/pages/guide/[...slug].astro`, `src/pages/mm2h-pvip.astro`
- Test: `tests/whatsapp-links.test.mjs`

**Interfaces:**
- Consumes: `buildWhatsAppUrl(message, ref)`, `whatsappRef(path)`, `captureAttribution()` from Task 2; `normalizeDimension`, `track` from `src/lib/analytics.js`.
- Produces: `BookingWidget` props become `{ doctorName, hospital, doctorId, specialty, location }` (`waNumber` removed). Links marked `data-wa-placement="<placement>"` are tracked site-wide as `click_whatsapp_concierge`.

- [ ] **Step 1: Write the failing test**

Create `tests/whatsapp-links.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const full = path.join(directory, name);
    return statSync(full).isDirectory() ? sourceFiles(full) : [full];
  }).filter((file) => /\.(astro|jsx?|mjs|md)$/.test(file));
}

test('only the attribution library builds WhatsApp URLs', () => {
  const allowed = new Set([path.join(root, 'src/lib/attribution.js')]);
  const offenders = sourceFiles(path.join(root, 'src'))
    .filter((file) => !allowed.has(file))
    .filter((file) => /wa\.me\/|api\.whatsapp\.com/.test(readFileSync(file, 'utf8')))
    .map((file) => path.relative(root, file));
  assert.deepEqual(offenders, []);
});

test('layouts load site scripts and tag their WhatsApp buttons', () => {
  for (const file of ['src/layouts/Layout.astro', 'src/layouts/LandingLayout.astro']) {
    const source = read(file);
    assert.match(source, /<SiteScripts \/>/, file);
    assert.match(source, /data-wa-placement="navbar"/, file);
    assert.match(source, /data-wa-placement="mobile_menu"/, file);
    assert.match(source, /buildWhatsAppUrl\(/, file);
  }
  assert.match(read('src/components/Hero.astro'), /data-wa-placement="hero"/);
  assert.match(read('src/components/CTA.astro'), /data-wa-placement="home_bottom_cta"/);
  assert.equal((read('src/pages/mm2h-pvip.astro').match(/data-wa-placement="mm2h_/g) || []).length, 5);
});

test('site script captures attribution and tracks tagged links', () => {
  const source = read('src/components/SiteScripts.astro');
  assert.match(source, /captureAttribution\(\)/);
  assert.match(source, /track\('click_whatsapp_concierge'/);
  assert.match(source, /data-wa-placement/);
});

test('doctor booking references the doctor id instead of a phone prop', () => {
  const booking = read('src/components/BookingWidget.jsx');
  assert.doesNotMatch(booking, /waNumber/);
  assert.match(booking, /doctor\/\$\{doctorId\}/);
  const page = read('src/pages/doctor/[id].astro');
  assert.match(page, /doctorId=\{doctor\.id\}/);
  assert.doesNotMatch(page, /waNumber=/);
  assert.match(read('src/components/Directory.jsx'), /doctors\/\$\{doctor\.docId\}/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/whatsapp-links.test.mjs`
Expected: FAIL — offenders list includes `src/components/BookingWidget.jsx`, `src/components/CTA.astro`, `src/components/Directory.jsx`, `src/components/Hero.astro`, both layouts, the guide page, `src/pages/mm2h-pvip.astro`.

- [ ] **Step 3: Create `src/components/SiteScripts.astro`**

```astro
---
// src/components/SiteScripts.astro
// Site-wide: capture first-party attribution and track tagged WhatsApp links.
---

<script>
  import { captureAttribution } from '../lib/attribution.js';
  import { normalizeDimension, track } from '../lib/analytics.js';

  captureAttribution();
  const pageType = normalizeDimension(window.location.pathname.split('/')[1] || '') || 'home';
  document.querySelectorAll('[data-wa-placement]').forEach((link) => {
    link.addEventListener('click', () => {
      track('click_whatsapp_concierge', {
        page_type: pageType,
        cta_placement: link.dataset.waPlacement,
      });
    });
  });
</script>
```

- [ ] **Step 4: Update `src/layouts/LandingLayout.astro`**

Replace the import `import { WA_NUMBER } from '../config'; ` with:

```astro
import SiteScripts from '../components/SiteScripts.astro';
import { buildWhatsAppUrl, whatsappRef } from '../lib/attribution.js';
```

Replace the `waLink` line with:

```astro
const waLink = buildWhatsAppUrl('Halo Ocha, saya ingin membuat janji konsultasi.', whatsappRef(Astro.url.pathname));
```

On the desktop navbar anchor, change `href={waLink} ` to `href={waLink} data-wa-placement="navbar" `. On the mobile-menu anchor, change `<a href={waLink} target="_blank" class="block w-full` to `<a href={waLink} data-wa-placement="mobile_menu" target="_blank" class="block w-full`. Directly before `</body>`, add `<SiteScripts />`.

- [ ] **Step 5: Update `src/layouts/Layout.astro`**

After `import Footer from '../components/Footer.astro';` add:

```astro
import SiteScripts from '../components/SiteScripts.astro';
import { buildWhatsAppUrl, whatsappRef } from '../lib/attribution.js';
```

Replace `const WA_LINK = "https://api.whatsapp.com/send/?phone=60125525544&text&type=phone_number&app_absent=0";` with:

```astro
const WA_LINK = buildWhatsAppUrl('Halo Ocha, saya ingin membuat janji konsultasi.', whatsappRef(Astro.url.pathname));
```

Change `<a href={WA_LINK} target="_blank" class="bg-[#276CA1]` to `<a href={WA_LINK} data-wa-placement="navbar" target="_blank" class="bg-[#276CA1]`, and `<a href={WA_LINK} target="_blank" class="block w-full` to `<a href={WA_LINK} data-wa-placement="mobile_menu" target="_blank" class="block w-full`. Directly before `</body>`, add `<SiteScripts />`.

- [ ] **Step 6: Update Hero and CTA**

In `src/components/Hero.astro`, add `import { buildWhatsAppUrl } from '../lib/attribution.js';` below the lucide import, and replace the opening tag `<a href="https://api.whatsapp.com/send/?phone=60125525544&text&type=phone_number&app_absent=0" class="bg-white` with:

```astro
<a href={buildWhatsAppUrl('Halo Ocha, saya ingin konsultasi mencari dokter spesialis di Malaysia.', 'beranda/hero')} data-wa-placement="hero" target="_blank" rel="noopener noreferrer" class="bg-white
```

In `src/components/CTA.astro`, add the same import, and replace `<a href="https://wa.me/60125525544" class="bg-transparent` with:

```astro
<a href={buildWhatsAppUrl('Halo Ocha, saya ingin konsultasi mencari dokter spesialis di Malaysia.', 'beranda/home_bottom_cta')} data-wa-placement="home_bottom_cta" target="_blank" rel="noopener noreferrer" class="bg-transparent
```

- [ ] **Step 7: Update `src/components/Directory.jsx`**

Replace `import { WA_NUMBER } from '../config';` with `import { buildWhatsAppUrl } from '../lib/attribution.js';` and replace the `waLink` line with:

```jsx
const waLink = buildWhatsAppUrl(`Halo Ocha, saya ingin membuat janji dengan ${doctor.name}`, `doctors/${doctor.docId}`);
```

(The existing `track('click_whatsapp_booking', …)` on this link stays; do not add `data-wa-placement`.)

- [ ] **Step 8: Update `src/components/BookingWidget.jsx`**

Add `import { buildWhatsAppUrl } from '../lib/attribution.js';` below the analytics import. Replace the prop `waNumber = '60125525544',` with `doctorId = '',`. Replace the `fallbackUrl` line with:

```jsx
  const waRef = `doctor/${doctorId}`;
  const fallbackUrl = buildWhatsAppUrl(fallbackMsg, waRef);
```

Replace the body of `handleBook` so the URL is built before tracking (keeps message variables away from `track(`):

```jsx
  function handleBook() {
    const dayStr = `${DAYS_ID[selDate.getDay()]}, ${selDate.getDate()} ${MONTHS_SHORT[selDate.getMonth()]}`;
    const msg = `Halo Ocha, saya ingin booking konsultasi dengan ${doctorName} pada ${dayStr} pukul ${formatTime(selTime)}.`;
    const bookingUrl = buildWhatsAppUrl(msg, waRef);
    track('click_whatsapp_booking', {
      ...analyticsParameters,
      cta_placement: 'booking_selected_time',
    });
    window.open(bookingUrl, '_blank');
  }
```

- [ ] **Step 9: Update `src/pages/doctor/[id].astro`**

Delete `import { WA_NUMBER } from '../../config';`. In the `<BookingWidget` props, replace `waNumber={WA_NUMBER}` with `doctorId={doctor.id}`.

- [ ] **Step 10: Update `src/pages/guide/[...slug].astro`**

Replace `import { WA_NUMBER } from '../../config';` with `import { buildWhatsAppUrl } from '../../lib/attribution.js';` and replace the `destinationUrl` line with:

```astro
const destinationUrl = entry.data.formUrl || buildWhatsAppUrl(`Halo Ocha, saya mau request "${entry.data.title}".`, `guide/${entry.slug}`);
```

- [ ] **Step 11: Update `src/pages/mm2h-pvip.astro`**

Replace `import { WA_NUMBER } from '../config';` with `import { buildWhatsAppUrl } from '../lib/attribution.js';` and replace lines 16–19 (`waBase` and the three links) with:

```astro
const waGeneral = buildWhatsAppUrl("Hi Ocha, I'd like to learn more about long-term stay in Malaysia (MM2H / PVIP) with Daro International. Please share the details.", 'mm2h-pvip/general');
const waMM2H = buildWhatsAppUrl("Hi Ocha, I'm interested in the Malaysia My Second Home (MM2H) programme. Please help me with a consultation.", 'mm2h-pvip/mm2h');
const waPVIP = buildWhatsAppUrl("Hi Ocha, I'm interested in the Malaysia Premium Visa Programme (PVIP). Please help me with a consultation.", 'mm2h-pvip/pvip');
```

Add a placement attribute to each of the five anchors (search each `href={wa…}` in order):
- first `<a href={waGeneral}` (hero): add `data-wa-placement="mm2h_hero"`
- `<a href={waMM2H}`: add `data-wa-placement="mm2h_mm2h"`
- `<a href={waPVIP}`: add `data-wa-placement="mm2h_pvip"`
- `<a href={waGeneral}` in "Not sure which suits you?": add `data-wa-placement="mm2h_compare"`
- last `<a href={waGeneral}` (bottom call to action): add `data-wa-placement="mm2h_bottom"`

- [ ] **Step 12: Run tests**

Run: `npm test`
Expected: PASS (all tests, including existing `analytics.test.mjs` source checks on BookingWidget and Directory, and `postmerge-production-safeguards.test.mjs`)

- [ ] **Step 13: Commit**

```bash
git add src/components/SiteScripts.astro src/layouts src/components/Hero.astro src/components/CTA.astro src/components/Directory.jsx src/components/BookingWidget.jsx "src/pages/doctor/[id].astro" "src/pages/guide/[...slug].astro" src/pages/mm2h-pvip.astro tests/whatsapp-links.test.mjs
git commit -m "feat: route every WhatsApp link through tagged builder"
```

---

### Task 6: Lead offer component and server wrapper

**Files:**
- Modify: `src/lib/doctors.js` (append)
- Create: `src/components/LeadOffer.jsx`, `src/components/OfferCard.astro`
- Test: `tests/lead-offer-placements.test.mjs` (create; component checks now, placement checks added in Task 7)

**Interfaces:**
- Consumes: `getOffer`, `isOfferAvailable`, `intentOptions` (Task 1); `buildOfferFormUrl`, `buildWhatsAppUrl`, `offerFields`, `whatsappRef` (Task 2); `normalizeDimension`, `track` (analytics).
- Produces:
  - `getPublishedDoctorsCached(): Promise<Doctor[]>`
  - `<LeadOffer offer variant specialties cities defaultSpecialty defaultCity pageType placement />` with `variant ∈ {'inline','sidebar','banner','button'}`
  - `<OfferCard offer variant pageType placement defaultSpecialty defaultCity />` (renders nothing when unavailable)

- [ ] **Step 1: Write the failing test**

Create `tests/lead-offer-placements.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8');

test('lead offer loads GHL only inside the on-demand pop-up', () => {
  const source = read('../src/components/LeadOffer.jsx');
  assert.match(source, /createPortal\(/);
  assert.equal((source.match(/<iframe/g) || []).length, 1);
  assert.doesNotMatch(source, /form_embed\.js/);
  assert.match(source, /track\('view_offer'/);
  assert.match(source, /track\('open_offer_form'/);
  assert.match(source, /FORM_TIMEOUT_MS = 8000/);
  assert.match(source, /Formulir belum termuat — lanjut via WhatsApp/);
  assert.match(source, /Muat formulir asli/);
  assert.match(source, /Saya setuju menerima email dari Ocha Healthcare dan dapat berhenti kapan saja\./);
  assert.doesNotMatch(source, /track\([\s\S]{0,200}(?:fields|formUrl|specialty:\s*specialty\b)/);
});

test('offer card hides unavailable offers and fetches doctors once per build', () => {
  const card = read('../src/components/OfferCard.astro');
  assert.match(card, /isOfferAvailable\(definition, \{ dev: import\.meta\.env\.DEV \}\)/);
  assert.match(card, /getPublishedDoctorsCached\(\)/);
  assert.match(card, /client:visible/);
  assert.match(read('../src/lib/doctors.js'), /export function getPublishedDoctorsCached\(\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/lead-offer-placements.test.mjs`
Expected: FAIL with `ENOENT` for `src/components/LeadOffer.jsx`

- [ ] **Step 3: Append cached fetch to `src/lib/doctors.js`**

```js

// One fetch per build for components that only need doctor-derived options.
let cachedDoctors;
export function getPublishedDoctorsCached() {
  cachedDoctors ||= getPublishedDoctors();
  return cachedDoctors;
}
```

- [ ] **Step 4: Create `src/components/LeadOffer.jsx`**

```jsx
// src/components/LeadOffer.jsx
// Lead offer card: optional no-PII intent step, then a pop-up that loads the GHL form on demand.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X, Mail, FileText, ArrowRight, MessageCircle } from 'lucide-react';
import { getOffer } from '../lib/offers.js';
import { buildOfferFormUrl, buildWhatsAppUrl, offerFields, whatsappRef } from '../lib/attribution.js';
import { normalizeDimension, track } from '../lib/analytics.js';

const IS_DEV = import.meta.env.DEV;
const FORM_TIMEOUT_MS = 8000;

export default function LeadOffer({
  offer: offerKey,
  variant = 'inline',
  specialties = [],
  cities = [],
  defaultSpecialty = '',
  defaultCity = '',
  pageType = '',
  placement = '',
}) {
  const offer = getOffer(offerKey);
  const [specialty, setSpecialty] = useState(defaultSpecialty);
  const [city, setCity] = useState(defaultCity);
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState(null);

  const analytics = { page_type: pageType, offer: offerKey, cta_placement: placement || variant };

  useEffect(() => {
    track('view_offer', analytics);
  }, []);

  if (!offer) return null;

  function openForm() {
    setFields(offerFields(offerKey, { specialty, city }));
    setOpen(true);
    track('open_offer_form', {
      ...analytics,
      specialty: normalizeDimension(specialty),
      location: normalizeDimension(city),
    });
  }

  const Icon = offer.needsIntent ? Mail : FileText;
  const compact = variant === 'sidebar';
  const banner = variant === 'banner';

  const button = (
    <button type="button" onClick={openForm}
      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#276CA1] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:bg-[#1f5682] hover:-translate-y-0.5 active:translate-y-0">
      <Icon className="w-4 h-4" />
      {offer.cta}
      <ArrowRight className="w-4 h-4 opacity-60" />
    </button>
  );

  const modal = open && createPortal(
    <OfferModal offer={offer} fields={fields} onClose={() => setOpen(false)} />,
    document.body,
  );

  if (variant === 'button') return <>{button}{modal}</>;

  const intentStep = offer.needsIntent && (
    <div className={`grid gap-3 ${compact ? '' : 'sm:grid-cols-2'}`}>
      <IntentSelect label="Spesialisasi" value={specialty} onChange={setSpecialty}
        emptyLabel="Belum tahu / bantu pilihkan" options={specialties} />
      <IntentSelect label="Kota di Malaysia" value={city} onChange={setCity}
        emptyLabel="Belum tahu" options={cities} />
    </div>
  );

  return (
    <>
      <div className={[
        'relative overflow-hidden rounded-2xl border p-6 md:p-8',
        banner ? 'border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50' : 'border-slate-100 bg-white shadow-xl shadow-blue-900/5',
      ].join(' ')}>
        <div className={banner || (!compact && offer.needsIntent) ? 'grid gap-6 md:grid-cols-2 md:items-center' : ''}>
          <div className={compact ? 'mb-5' : ''}>
            <span className="inline-block mb-3 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Gratis · {offer.label}
            </span>
            <h3 className={`font-serif font-bold text-slate-900 mb-2 ${compact ? 'text-xl' : 'text-2xl'}`}>{offer.headline}</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">{offer.pitch}</p>
            {!banner && (
              <ul className="space-y-2">
                {offer.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={`space-y-4 ${!offer.needsIntent && !banner && !compact ? 'mt-6' : ''}`}>
            {intentStep}
            {button}
            {offer.note && <p className="text-[11px] leading-relaxed text-slate-400">{offer.note}</p>}
          </div>
        </div>
      </div>
      {modal}
    </>
  );
}

function IntentSelect({ label, value, onChange, emptyLabel, options }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-500 mb-1.5">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 focus:border-[#276CA1] focus:outline-none focus:ring-2 focus:ring-[#276CA1]/20">
        <option value="">{emptyLabel}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function OfferModal({ offer, fields, onClose }) {
  const [loadRealForm, setLoadRealForm] = useState(!IS_DEV);
  const [status, setStatus] = useState('loading');
  const closeRef = useRef(null);
  const formUrl = buildOfferFormUrl(offer.key, fields);
  const showIframe = Boolean(formUrl) && loadRealForm;
  const fallbackUrl = buildWhatsAppUrl(`Halo Ocha, saya ingin ${offer.label}.`, whatsappRef(window.location.pathname));

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('overflow-hidden');
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('overflow-hidden');
    };
  }, []);

  useEffect(() => {
    if (!showIframe) return undefined;
    const timer = setTimeout(() => setStatus((current) => (current === 'ready' ? current : 'slow')), FORM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [showIframe]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4"
      role="dialog" aria-modal="true" aria-label={offer.headline} onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Langkah terakhir</p>
            <p className="font-bold text-slate-900 text-sm">{offer.label}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Tutup"
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#276CA1]/30">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {showIframe ? (
            <div className="relative">
              {status === 'slow' && (
                <a href={fallbackUrl} target="_blank" rel="noopener noreferrer"
                  className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white hover:bg-[#128C7E]">
                  <MessageCircle className="w-4 h-4" /> Formulir belum termuat — lanjut via WhatsApp
                </a>
              )}
              {status !== 'ready' && (
                <div className="absolute inset-x-0 top-24 flex justify-center" aria-hidden="true">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#276CA1]" />
                </div>
              )}
              <iframe src={formUrl} title={offer.label} onLoad={() => setStatus('ready')}
                className="w-full h-[560px] border-0 rounded-lg" />
            </div>
          ) : (
            <FormPlaceholder offer={offer} hasRealForm={Boolean(formUrl)} onLoadReal={() => setLoadRealForm(true)} />
          )}

          {IS_DEV && <HiddenFieldsPanel fields={fields} formUrl={formUrl} />}
        </div>
      </div>
    </div>
  );
}

// Development stand-in: shows roughly what the GHL form will ask for. Never submits.
function FormPlaceholder({ offer, hasRealForm, onLoadReal }) {
  return (
    <div>
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        {hasRealForm
          ? <>Pratinjau lokal: formulir GHL asli tidak dimuat otomatis agar tidak membuat kontak sungguhan. <button type="button" onClick={onLoadReal} className="font-bold underline">Muat formulir asli</button></>
          : 'Pratinjau lokal: formulir GHL untuk penawaran ini belum dibuat. Kolom di bawah hanya contoh.'}
      </div>
      <div className="space-y-3 opacity-80" aria-hidden="true">
        {['Nama lengkap', 'Email', 'Nomor WhatsApp'].map((label) => (
          <div key={label}>
            <span className="block text-xs font-bold text-slate-500 mb-1.5">{label}</span>
            <div className="h-11 rounded-xl border border-slate-200 bg-slate-50" />
          </div>
        ))}
        {offer.key === 'estimate' && (
          <div>
            <span className="block text-xs font-bold text-slate-500 mb-1.5">Tindakan / kebutuhan (opsional)</span>
            <div className="h-20 rounded-xl border border-slate-200 bg-slate-50" />
          </div>
        )}
        <div className="flex items-start gap-2 text-xs text-slate-500">
          <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-slate-300" />
          Saya setuju menerima email dari Ocha Healthcare dan dapat berhenti kapan saja.
        </div>
        <div className="rounded-xl bg-[#276CA1] py-3.5 text-center text-sm font-bold text-white">{offer.cta}</div>
      </div>
    </div>
  );
}

function HiddenFieldsPanel({ fields, formUrl }) {
  return (
    <details className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs" open>
      <summary className="cursor-pointer font-bold text-slate-600">Data tersembunyi yang dikirim ke GHL (hanya pratinjau)</summary>
      <table className="mt-3 w-full">
        <tbody>
          {Object.entries(fields || {}).map(([key, value]) => (
            <tr key={key} className="border-t border-slate-200">
              <td className="py-1.5 pr-3 font-mono text-slate-500">{key}</td>
              <td className="py-1.5 font-mono text-slate-800 break-all">{value || <span className="text-slate-300">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {formUrl && <p className="mt-3 break-all font-mono text-[10px] text-slate-400">{formUrl}</p>}
    </details>
  );
}
```

- [ ] **Step 5: Create `src/components/OfferCard.astro`**

```astro
---
// src/components/OfferCard.astro
// Server wrapper: hides unavailable offers, resolves intent options, mounts LeadOffer.
import LeadOffer from './LeadOffer.jsx';
import { getOffer, intentOptions, isOfferAvailable } from '../lib/offers.js';
import { getPublishedDoctorsCached } from '../lib/doctors.js';

const {
  offer,
  variant = 'inline',
  pageType = '',
  placement = '',
  defaultSpecialty = '',
  defaultCity = '',
} = Astro.props;

const definition = getOffer(offer);
const available = isOfferAvailable(definition, { dev: import.meta.env.DEV });
const options = available && definition.needsIntent
  ? intentOptions(await getPublishedDoctorsCached())
  : { specialties: [], cities: [] };
---

{available && (
  <LeadOffer
    client:visible
    offer={offer}
    variant={variant}
    pageType={pageType}
    placement={placement}
    specialties={options.specialties}
    cities={options.cities}
    defaultSpecialty={defaultSpecialty}
    defaultCity={defaultCity}
  />
)}
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/doctors.js src/components/LeadOffer.jsx src/components/OfferCard.astro tests/lead-offer-placements.test.mjs
git commit -m "feat: add lead offer card with on-demand GHL form"
```

---

### Task 7: Offer placements

**Files:**
- Modify: `src/lib/blog-schema.js`, six files in `src/content/blog/`, `src/pages/blog/[...slug].astro`, `src/pages/doctors.astro`, `src/pages/dokter/[slug].astro`, `src/pages/doctor/[id].astro`, `src/pages/index.astro`
- Test: `tests/lead-offer-placements.test.mjs` (append), `tests/blog-content.test.mjs` (append)

**Interfaces:**
- Consumes: `<OfferCard …>` (Task 6), `offerForArticle`, `cityFromLocation`, `OFFER_KEYS` (Task 1).
- Produces: frontmatter fields `offer?: OfferKey`, `offerSpecialty?: string`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/lead-offer-placements.test.mjs`:

```js
const before = (source, first, second) => {
  const a = source.indexOf(first);
  const b = source.indexOf(second);
  return a !== -1 && b !== -1 && a < b;
};

test('articles show the matched offer inline and in a desktop-only sidebar', () => {
  const page = read('../src/pages/blog/[...slug].astro');
  assert.match(page, /offerForArticle\(\{ offer: entry\.data\.offer, slug: entry\.slug, category: entry\.data\.category \}\)/);
  assert.match(page, /<OfferCard offer=\{articleOffer\} variant="inline"/);
  assert.match(page, /<OfferCard offer=\{articleOffer\} variant="sidebar"/);
  assert.match(page, /class="hidden lg:block lg:col-span-4/);
  assert.ok(before(page, '<Content />', 'variant="inline"'));
  assert.ok(before(page, 'variant="inline"', 'id="article-faq"'));
});

test('directory, specialty and doctor pages place offers after primary booking paths', () => {
  const directory = read('../src/pages/doctors.astro');
  assert.ok(before(directory, '<Directory client:load', '<OfferCard offer="shortlist" variant="banner"'));

  const specialty = read('../src/pages/dokter/[slug].astro');
  assert.match(specialty, /<OfferCard offer="shortlist" variant="banner" pageType="specialty_location" placement="specialty_banner" defaultSpecialty=\{specialty\} defaultCity=\{cityFromLocation\(city\)\}/);
  assert.ok(before(specialty, 'OfferCard offer="shortlist"', 'Cara meminta janji melalui Ocha'));

  const doctor = read('../src/pages/doctor/[id].astro');
  assert.ok(before(doctor, '<BookingWidget', '<OfferCard offer="estimate"'));
  assert.ok(before(doctor, '<OfferCard offer="estimate"', 'TRUST SIGNALS'));

  const home = read('../src/pages/index.astro');
  assert.ok(before(home, '<Testimonials />', '<OfferCard offer="guide-budget"'));
  assert.ok(before(home, '<OfferCard offer="guide-budget"', '<FAQ />'));
});
```

Append to `tests/blog-content.test.mjs`:

```js
test('articles declare a valid lead offer', async () => {
  const expected = {
    'biaya-operasi-bypass-jantung-di-malaysia': ['estimate', 'Bedah Jantung'],
    'biaya-pasang-ring-jantung-di-malaysia': ['estimate', 'Jantung'],
    'biaya-operasi-ganti-sendi-lutut-di-malaysia': ['estimate', 'Ortopedi (tulang)'],
    'biaya-pengobatan-kanker-di-malaysia': ['estimate', 'Onkologi'],
    'panduan-second-opinion': ['guide-second-opinion', undefined],
    'cara-meminta-slot-konsultasi-spesialis-di-malaysia': ['shortlist', undefined],
  };
  for (const [slug, [offer, specialty]] of Object.entries(expected)) {
    const source = await readFile(new URL(`../src/content/blog/${slug}.md`, import.meta.url), 'utf8');
    assert.equal(source.match(/^offer:\s*"([^"]+)"/m)?.[1], offer, slug);
    assert.equal(source.match(/^offerSpecialty:\s*"([^"]+)"/m)?.[1], specialty, slug);
  }
});

test('blog schema rejects unknown offers', () => {
  const base = {
    title: 'T', subtitle: 'S', date: new Date('2026-09-30'), updatedDate: '2026-09-30', image: '/x.jpg',
    category: 'C', readTime: '1 menit', robots: 'noindex,follow',
    medicalDisclaimer: 'Informasi ini bersifat umum dan tidak menggantikan saran dokter.',
  };
  assert.equal(blogEntrySchema.safeParse({ ...base, offer: 'estimate', offerSpecialty: 'Jantung' }).success, true);
  assert.equal(blogEntrySchema.safeParse({ ...base, offer: 'bogus' }).success, false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/lead-offer-placements.test.mjs tests/blog-content.test.mjs`
Expected: FAIL — placement assertions fail; `articles declare a valid lead offer` fails on the first slug; schema test fails because `offer: 'bogus'` is accepted (unknown keys pass through `z.object` stripping, so `success` is `true`).

- [ ] **Step 3: Update `src/lib/blog-schema.js`**

Add below `import { z } from 'astro/zod';`:

```js
import { OFFER_KEYS } from './offers.js';
```

Add two fields after `medicalDisclaimer: z.string().min(40),`:

```js
  offer: z.enum(OFFER_KEYS).optional(),
  offerSpecialty: z.string().optional(),
```

- [ ] **Step 4: Add frontmatter to articles**

Add these lines immediately before the closing `---` of each file's frontmatter:

| File | Lines |
|---|---|
| `src/content/blog/biaya-operasi-bypass-jantung-di-malaysia.md` | `offer: "estimate"` and `offerSpecialty: "Bedah Jantung"` |
| `src/content/blog/biaya-pasang-ring-jantung-di-malaysia.md` | `offer: "estimate"` and `offerSpecialty: "Jantung"` |
| `src/content/blog/biaya-operasi-ganti-sendi-lutut-di-malaysia.md` | `offer: "estimate"` and `offerSpecialty: "Ortopedi (tulang)"` |
| `src/content/blog/biaya-pengobatan-kanker-di-malaysia.md` | `offer: "estimate"` and `offerSpecialty: "Onkologi"` |
| `src/content/blog/panduan-second-opinion.md` | `offer: "guide-second-opinion"` |
| `src/content/blog/cara-meminta-slot-konsultasi-spesialis-di-malaysia.md` | `offer: "shortlist"` |

- [ ] **Step 5: Update `src/pages/blog/[...slug].astro`**

After `import { absoluteUrl } from '../../lib/seo.js';` add:

```astro
import OfferCard from '../../components/OfferCard.astro';
import { offerForArticle } from '../../lib/offers.js';
```

After `const canonicalPath = `/blog/${entry.slug}/`;` add:

```astro
const articleOffer = offerForArticle({ offer: entry.data.offer, slug: entry.slug, category: entry.data.category });
```

Immediately before `{entry.data.faq && (`, insert:

```astro
        {/* Lead offer matched to the article's intent */}
        <section class="mt-12" aria-label="Penawaran gratis">
          <OfferCard offer={articleOffer} variant="inline" pageType="blog" placement="article_inline" defaultSpecialty={entry.data.offerSpecialty} />
        </section>

```

Change the sidebar wrapper `<div class="lg:col-span-4 space-y-8">` to `<div class="hidden lg:block lg:col-span-4 space-y-8">`, and replace everything inside it (the existing `<div class="sticky top-32">…</div>` block) with:

```astro
        <div class="sticky top-32 space-y-4">
            <OfferCard offer={articleOffer} variant="sidebar" pageType="blog" placement="article_sidebar" defaultSpecialty={entry.data.offerSpecialty} />
            <a href="/doctors/" class="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 hover:border-[#276CA1] hover:text-[#276CA1] transition">
                <Search className="w-4 h-4" /> Sudah siap? Pilih jadwal dokter
            </a>
        </div>
```

- [ ] **Step 6: Update `src/pages/doctors.astro`**

After `import { absoluteUrl } from '../lib/seo.js';` add `import OfferCard from '../components/OfferCard.astro';`. Directly after the closing `</section>` of `<section id="directory" …>`, insert:

```astro

    <section class="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 mt-16">
        <OfferCard offer="shortlist" variant="banner" pageType="doctor_directory" placement="directory_banner" />
    </section>
```

- [ ] **Step 7: Update `src/pages/dokter/[slug].astro`**

After `import { absoluteUrl } from '../../lib/seo.js';` add:

```astro
import OfferCard from '../../components/OfferCard.astro';
import { cityFromLocation } from '../../lib/offers.js';
```

Immediately before `<section class="bg-slate-900 py-12 text-white md:py-16">`, insert:

```astro
  <section class="pb-12 md:pb-16">
    <div class="mx-auto max-w-6xl px-4 md:px-6">
      <OfferCard offer="shortlist" variant="banner" pageType="specialty_location" placement="specialty_banner" defaultSpecialty={specialty} defaultCity={cityFromLocation(city)} />
    </div>
  </section>

```

- [ ] **Step 8: Update `src/pages/doctor/[id].astro`**

After `import BookingWidget from '../../components/BookingWidget.jsx';` add:

```astro
import OfferCard from '../../components/OfferCard.astro';
import { cityFromLocation } from '../../lib/offers.js';
```

Immediately before `{/* TRUST SIGNALS: Testimonials */}`, insert:

```astro
        {/* LEAD OFFER: for visitors not ready to pick a slot */}
        <OfferCard offer="estimate" variant="inline" pageType="doctor" placement="doctor_after_booking" defaultSpecialty={normalizeDoctorSpecialtyLabel(doctor.specialty)} defaultCity={cityFromLocation(doctor.location)} />

```

- [ ] **Step 9: Update `src/pages/index.astro`**

After `import CTA from '../components/CTA.astro';` add `import OfferCard from '../components/OfferCard.astro';`. Between `<Testimonials />` and `<FAQ />`, insert:

```astro
    <section class="py-20 px-6 bg-slate-50" aria-label="Panduan gratis">
      <div class="max-w-5xl mx-auto">
        <OfferCard offer="guide-budget" variant="inline" pageType="home" placement="home_offer" />
      </div>
    </section>
    
```

- [ ] **Step 10: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add src/lib/blog-schema.js src/content/blog "src/pages/blog/[...slug].astro" src/pages/doctors.astro "src/pages/dokter/[slug].astro" "src/pages/doctor/[id].astro" src/pages/index.astro tests/lead-offer-placements.test.mjs tests/blog-content.test.mjs
git commit -m "feat: place lead offers by visitor intent"
```

---

### Task 8: Guide pages use the on-demand pop-up

**Files:**
- Modify: `src/pages/guide/[...slug].astro` (imports, FORM SECTION)
- Test: `tests/lead-offer-placements.test.mjs` (append)

**Interfaces:**
- Consumes: `LeadOffer` with `variant="button"` (Task 6); `offerKeyForGuide` (Task 1); `buildWhatsAppUrl` (Task 2, already imported in Task 5).

- [ ] **Step 1: Write the failing test**

Append to `tests/lead-offer-placements.test.mjs`:

```js
test('guide pages open the GHL form on demand and keep WhatsApp tracking', () => {
  const guide = read('../src/pages/guide/[...slug].astro');
  assert.doesNotMatch(guide, /<iframe/);
  assert.doesNotMatch(guide, /form_embed\.js/);
  assert.match(guide, /offerKeyForGuide\(entry\.slug\)/);
  assert.match(guide, /<LeadOffer client:load offer=\{guideOffer\} variant="button" pageType="lead_guide" placement="guide_primary"/);
  assert.match(guide, /data-whatsapp-concierge/);
  assert.match(guide, /track\('view_lead_guide'/);
  assert.match(guide, /robots="noindex,follow"/);
  assert.match(guide, /Formulir Unduh Panduan/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/lead-offer-placements.test.mjs`
Expected: FAIL — guide page still contains `<iframe` and `form_embed.js`.

- [ ] **Step 3: Update imports and variables**

After `import { buildWhatsAppUrl } from '../../lib/attribution.js';` add:

```astro
import LeadOffer from '../../components/LeadOffer.jsx';
import { offerKeyForGuide } from '../../lib/offers.js';
```

After the `destinationUrl` line add:

```astro
const guideOffer = offerKeyForGuide(entry.slug);
const guideWhatsAppUrl = buildWhatsAppUrl(`Halo Ocha, saya punya pertanyaan tentang "${entry.data.title}".`, `guide/${entry.slug}`);
```

- [ ] **Step 4: Replace the FORM SECTION**

Replace everything inside `<div id="download-form" class="scroll-mt-32 text-left w-full mx-auto lg:mx-0">…</div>` (the `{entry.data.formId ? ( … ) : ( … )}` expression) with:

```astro
                    {guideOffer ? (
                        <div class="bg-white p-6 rounded-2xl shadow-xl shadow-blue-900/10 border border-slate-100 text-center relative z-20 w-full">
                            <p class="font-bold text-slate-900 text-sm mb-4">Formulir Unduh Panduan: isi formulir singkat untuk menerima panduan melalui email</p>
                            <LeadOffer client:load offer={guideOffer} variant="button" pageType="lead_guide" placement="guide_primary" />
                            <a
                                href={guideWhatsAppUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-whatsapp-concierge
                                class="mt-4 inline-flex items-center justify-center gap-2 text-sm font-bold text-[#276CA1] hover:underline"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Tanya dulu via WhatsApp
                            </a>
                        </div>
                    ) : (
                        <div class="bg-white p-6 rounded-2xl shadow-xl shadow-blue-900/10 border border-slate-100 text-center relative z-20 w-full">
                            <a
                                href={destinationUrl}
                                target="_blank"
                                data-whatsapp-concierge
                                class="block w-full py-4 bg-[#276CA1] hover:bg-[#1f5682] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                            >
                                <ButtonIcon className="w-5 h-5" />
                                {entry.data.ctaText}
                            </a>
                        </div>
                    )}
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS (including `postmerge-production-safeguards.test.mjs`, which requires `Formulir Unduh Panduan` and `Sampul panduan` in the guide page; the new heading carries the first, the unchanged cover image `alt` carries the second).

- [ ] **Step 6: Commit**

```bash
git add "src/pages/guide/[...slug].astro" tests/lead-offer-placements.test.mjs
git commit -m "feat: load guide forms on demand"
```

---

### Task 9: Thank-you page and privacy disclosure

**Files:**
- Create: `src/pages/terima-kasih.astro`
- Modify: `src/pages/privacy.astro` (line 5 date; new paragraph after line 54), `tests/phase1-review-fixes.test.mjs` (legal date test)
- Test: `tests/lead-offer-placements.test.mjs` (append)

**Interfaces:**
- Consumes: `OFFERS` (Task 1), `buildWhatsAppUrl` (Task 2), `track` (analytics).

- [ ] **Step 1: Write the failing tests**

Append to `tests/lead-offer-placements.test.mjs`:

```js
test('thank-you page records the lead without indexing', () => {
  const page = read('../src/pages/terima-kasih.astro');
  assert.match(page, /robots="noindex,follow"/);
  assert.match(page, /track\('generate_lead', \{ page_type: 'thank_you', offer: copy \? offer : 'unknown' \}\)/);
  assert.match(page, /buildWhatsAppUrl\(/);
  assert.match(page, /`terima-kasih\/\$\{offer \|\| 'umum'\}`/);
});

test('privacy policy discloses offer forms and attribution storage', () => {
  const privacy = read('../src/pages/privacy.astro');
  assert.match(privacy, /30 September 2026/);
  assert.match(privacy, /Formulir GoHighLevel hanya dimuat setelah Anda menekan tombol penawaran/);
  assert.match(privacy, /tanpa data pribadi/);
});
```

In `tests/phase1-review-fixes.test.mjs`, replace the loop body of the legal-date test:

```js
  for (const file of ['../src/pages/privacy.astro', '../src/pages/terms.astro']) {
    const source = read(file);
    assert.match(source, /15 Juli 2026/);
    assert.doesNotMatch(source, /new Date\(\)\.toLocaleDateString/);
  }
```

with:

```js
  for (const [file, date] of [['../src/pages/privacy.astro', /30 September 2026/], ['../src/pages/terms.astro', /15 Juli 2026/]]) {
    const source = read(file);
    assert.match(source, date);
    assert.doesNotMatch(source, /new Date\(\)\.toLocaleDateString/);
  }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/lead-offer-placements.test.mjs tests/phase1-review-fixes.test.mjs`
Expected: FAIL — `ENOENT` for `terima-kasih.astro`; privacy date mismatch.

- [ ] **Step 3: Create `src/pages/terima-kasih.astro`**

```astro
---
// src/pages/terima-kasih.astro
// GHL forms redirect here after submit (?offer=<key>). Confirms the request and
// records the conversion; the GHL iframe itself cannot report submissions.
import LandingLayout from '../layouts/LandingLayout.astro';
import { CheckCircle2, MessageCircle, Search, BookOpen } from 'lucide-react';
import { OFFERS } from '../lib/offers.js';

const messages = {
  shortlist: 'Tim Ocha akan menyiapkan daftar dokter yang sesuai dan mengirimkannya ke email Anda, biasanya dalam 1 hari kerja.',
  estimate: 'Tim Ocha akan meminta estimasi dari rumah sakit mitra. Estimasi biasanya dikirim ke email Anda dalam 2–3 hari kerja.',
  'guide-budget': 'Checklist sedang dikirim ke email Anda. Periksa folder Promosi atau Spam jika belum terlihat dalam beberapa menit.',
  'guide-second-opinion': 'Panduan sedang dikirim ke email Anda. Periksa folder Promosi atau Spam jika belum terlihat dalam beberapa menit.',
};
const offerCopy = Object.fromEntries(Object.entries(OFFERS).map(([key, offer]) => [key, { label: offer.label, message: messages[key] }]));
---

<LandingLayout
  title="Terima Kasih"
  description="Permintaan Anda sudah diterima tim Ocha Healthcare."
  canonicalPath="/terima-kasih/"
  robots="noindex,follow"
>
  <main class="min-h-screen bg-slate-50 pt-32 pb-24 px-4">
    <div class="max-w-2xl mx-auto">
      <div class="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-blue-900/5 p-8 md:p-12 text-center">
        <div class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <p id="ty-label" class="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3">Permintaan diterima</p>
        <h1 class="font-serif text-3xl md:text-4xl font-bold text-slate-900 mb-4">Terima kasih, permintaan Anda sudah kami terima</h1>
        <p id="ty-message" class="text-slate-600 leading-relaxed mb-10">Tim Ocha akan menindaklanjuti melalui email.</p>

        <div class="rounded-2xl bg-blue-50 border border-blue-100 p-6 text-left mb-6">
          <h2 class="font-serif text-lg font-bold text-slate-900 mb-2">Ingin lebih cepat?</h2>
          <p class="text-sm text-slate-600 mb-4">Bicara langsung dengan agen Ocha melalui WhatsApp. Kami meninjau kebutuhan Anda secara manual.</p>
          <a id="ty-whatsapp" href="/doctors/" target="_blank" rel="noopener noreferrer"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-4 font-bold text-white shadow-lg transition hover:bg-[#128C7E]">
            <MessageCircle className="w-5 h-5" /> Lanjut via WhatsApp
          </a>
        </div>

        <div class="grid sm:grid-cols-2 gap-3">
          <a href="/doctors/" class="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-700 hover:border-[#276CA1] hover:text-[#276CA1] transition">
            <Search className="w-4 h-4" /> Lihat dokter mitra
          </a>
          <a href="/blog/" class="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-700 hover:border-[#276CA1] hover:text-[#276CA1] transition">
            <BookOpen className="w-4 h-4" /> Baca panduan pasien
          </a>
        </div>
      </div>
    </div>
  </main>
</LandingLayout>

<script define:vars={{ offerCopy }}>
  window.__ochaOfferCopy = offerCopy;
</script>

<script>
  import { track } from '../lib/analytics.js';
  import { buildWhatsAppUrl } from '../lib/attribution.js';

  const offer = new URLSearchParams(window.location.search).get('offer') || '';
  const copy = window.__ochaOfferCopy?.[offer];
  if (copy) {
    document.getElementById('ty-label').textContent = `${copy.label} · diterima`;
    document.getElementById('ty-message').textContent = copy.message;
  }
  track('generate_lead', { page_type: 'thank_you', offer: copy ? offer : 'unknown' });

  const whatsapp = document.getElementById('ty-whatsapp');
  whatsapp.href = buildWhatsAppUrl(
    `Halo Ocha, saya baru mengisi formulir${copy ? ` ${copy.label}` : ''} dan ingin konsultasi lebih lanjut.`,
    `terima-kasih/${offer || 'umum'}`,
  );
  whatsapp.addEventListener('click', () => track('click_whatsapp_concierge', {
    page_type: 'thank_you',
    cta_placement: 'thank_you_primary',
    offer: copy ? offer : 'unknown',
  }));
</script>
```

(The static `href="/doctors/"` is the no-JavaScript fallback; the script replaces it with the WhatsApp link.)

- [ ] **Step 4: Update `src/pages/privacy.astro`**

Change line 5 to `const lastUpdated = '30 September 2026';`. Directly after the paragraph that starts `<p><strong>GoHighLevel</strong> hanya dimuat pada halaman tinggal jangka panjang`, add:

```astro
      <p>Saat Anda meminta penawaran gratis (panduan, daftar dokter, atau estimasi biaya), data yang Anda isi di formulir diproses oleh <strong>GoHighLevel</strong> agar tim Ocha dapat mengirim email tindak lanjut. Formulir GoHighLevel hanya dimuat setelah Anda menekan tombol penawaran. Situs ini juga menyimpan sumber kunjungan Anda (halaman pertama yang dibuka, domain perujuk, dan parameter kampanye, tanpa data pribadi) di penyimpanan browser Anda agar kami tahu halaman mana yang membantu pasien.</p>
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS (existing test `privacy policy limits GHL disclosure to the long-stay page` still passes because its sentences are unchanged)

- [ ] **Step 6: Commit**

```bash
git add src/pages/terima-kasih.astro src/pages/privacy.astro tests/lead-offer-placements.test.mjs tests/phase1-review-fixes.test.mjs
git commit -m "feat: add thank-you page and disclose offer forms"
```

---

### Task 10: Full build and browser verification

**Files:** none changed unless a check fails (fix in the owning task's files, re-run, commit as `fix: …`).

- [ ] **Step 1: Confirm environment**

Run: `grep -c "^PUBLIC_SUPABASE_" .env`
Expected: `2`. If not, fetch the values with Composio (`SUPABASE_MCP_GET_PROJECT_URL` and `SUPABASE_MCP_GET_PUBLISHABLE_KEYS`, account `supabase_mcp_uppish-warted`, project `rmvwevepwrmcotmaovyy`) and write them to `.env`.

- [ ] **Step 2: Run the verified production build**

Run: `set -a && . ./.env && set +a && npm run build`
Expected: build completes; `filter:sitemap` and `audit:seo` print no failures.

- [ ] **Step 3: Check production output**

Run:

```bash
grep -c 'Minta Estimasi Gratis\|Kirim Daftar ke Email Saya' dist/blog/biaya-pasang-ring-jantung-di-malaysia/index.html dist/doctors/index.html || true
grep -c 'Unduh Checklist Gratis' dist/index.html
grep -c 'terima-kasih' dist/sitemap-0.xml || true
grep -o 'noindex,follow' dist/terima-kasih/index.html | head -1
grep -rl 'link.healthmetrics.com/js/form_embed.js' dist || echo "no GHL embed script"
```

Expected: first command prints `0` for both files (shortlist and estimate are hidden in production); `1` or more for the homepage guide; `0` for the sitemap; `noindex,follow`; `no GHL embed script`.

- [ ] **Step 4: Browser checks (development server)**

Start the preview with the `ocha-dev` configuration in `.claude/launch.json` (`npm run dev -- --port 4321`; create the file if missing, never commit it). On desktop and on the mobile preset (375×812), check:
- `/?utm_source=instagram&utm_campaign=test`, then `/blog/biaya-pasang-ring-jantung-di-malaysia/`: open the estimate offer; the debug panel shows `specialty=Jantung`, `utm_source=instagram`, `landing_page=/`.
- Escape closes the pop-up; focus starts on the close button; the page does not scroll behind it.
- `/blog/panduan-second-opinion/`, `/doctors/`, `/doctor/lee-weng-seng/`, `/dokter/dokter-spesialis-jantung-kuala-lumpur/`, `/guide/panduan-second-opinion/`, `/terima-kasih/?offer=estimate`: the offer renders in the right place with correct pre-fills; no console errors; sidebar card absent on mobile.
- Guide pop-up: "Muat formulir asli" loads the GHL iframe. Do not submit it.

- [ ] **Step 5: Performance check**

Ask the user before downloading Lighthouse. With approval, run `npm run preview -- --port 4322` and:

```bash
npx --yes lighthouse@12 http://localhost:4322/blog/biaya-pasang-ring-jantung-di-malaysia/ --only-categories=performance --form-factor=mobile --screenEmulation.mobile --quiet --chrome-flags="--headless" --output=json --output-path=/tmp/lh-local.json
npx --yes lighthouse@12 https://ocha.health/blog/biaya-pasang-ring-jantung-di-malaysia/ --only-categories=performance --form-factor=mobile --screenEmulation.mobile --quiet --chrome-flags="--headless" --output=json --output-path=/tmp/lh-live.json
node -e "const s=f=>Math.round(require(f).categories.performance.score*100);console.log('local',s('/tmp/lh-local.json'),'live',s('/tmp/lh-live.json'))"
```

Expected: local score ≥ live score − 5.

- [ ] **Step 6: Run the full test suite once more**

Run: `npm test`
Expected: PASS, 0 failures.

---

### Task 11: Push through Composio and open the pull request

**Files:**
- Create (scratchpad, not committed): `$SCRATCH/push-via-composio.mjs`, where `$SCRATCH` is the session scratchpad directory.

**Interfaces:**
- Consumes: Composio tools `GITHUB_CREATE_A_REFERENCE`, `GITHUB_CREATE_A_BLOB`, `GITHUB_CREATE_A_TREE`, `GITHUB_CREATE_A_COMMIT`, `GITHUB_UPDATE_A_REFERENCE`, `GITHUB_CREATE_A_PULL_REQUEST`, account `github_levers-cnida`.

- [ ] **Step 1: Confirm local state**

Run: `git status --short && git log --oneline abd61ff..HEAD`
Expected: clean tree (untracked `.claude/` and `.env` ignored or untracked, not staged); commits from the spec plus Tasks 1–9.

- [ ] **Step 2: Create the remote branch at the content-drafts tip**

```bash
composio execute GITHUB_CREATE_A_REFERENCE --account github_levers-cnida -d '{"owner":"HMS-Nisa","repo":"ocha-healthcare-staging","ref":"refs/heads/feat/lead-capture-attribution","sha":"abd61ffe4a40c3ceb78dad578fa62d9d80d83e22"}'
```

Expected: `"successful": true`. (`abd61ffe4a40c3ceb78dad578fa62d9d80d83e22` is the full SHA of `abd61ff`, already on the remote as the tip of `codex/indonesia-patient-lead-drafts`.)

- [ ] **Step 3: Write the replay script**

Create `$SCRATCH/push-via-composio.mjs`:

```js
// Replays local commits abd61ff..HEAD onto the remote branch through Composio,
// one remote commit per local commit, preserving messages and authorship.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const OWNER = 'HMS-Nisa';
const REPO = 'ocha-healthcare-staging';
const BRANCH = 'feat/lead-capture-attribution';
const ACCOUNT = 'github_levers-cnida';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

function composio(slug, data) {
  const out = execFileSync('composio', ['execute', slug, '--account', ACCOUNT, '-d', JSON.stringify(data)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  const parsed = JSON.parse(out);
  if (!parsed.successful) throw new Error(`${slug} failed: ${out.slice(0, 500)}`);
  return parsed.data;
}

function findSha(value) {
  if (!value || typeof value !== 'object') return null;
  if (typeof value.sha === 'string' && /^[0-9a-f]{40}$/.test(value.sha)) return value.sha;
  for (const child of Object.values(value)) {
    const found = findSha(child);
    if (found) return found;
  }
  return null;
}

const base = git('rev-parse', 'abd61ff');
const commits = git('rev-list', '--reverse', `${base}..HEAD`).split('\n').filter(Boolean);
let remoteParent = base;
let remoteTree = git('rev-parse', `${base}^{tree}`);

for (const commit of commits) {
  const changes = git('diff', '--no-renames', '--name-status', `${commit}^`, commit).split('\n').filter(Boolean);
  const tree = changes.map((line) => {
    const [status, file] = line.split('\t');
    if (status === 'D') return { path: file, mode: '100644', type: 'blob', sha: null };
    const content = execFileSync('git', ['show', `${commit}:${file}`]);
    const blob = composio('GITHUB_CREATE_A_BLOB', {
      owner: OWNER, repo: REPO, content: content.toString('base64'), encoding: 'base64',
    });
    const mode = git('ls-tree', commit, '--', file).split(/\s+/)[0];
    return { path: file, mode, type: 'blob', sha: findSha(blob) };
  });
  const newTree = findSha(composio('GITHUB_CREATE_A_TREE', { owner: OWNER, repo: REPO, base_tree: remoteTree, tree }));
  const [name, email, date] = git('log', '-1', '--format=%an%x00%ae%x00%aI', commit).split('\0');
  const message = git('log', '-1', '--format=%B', commit);
  const created = findSha(composio('GITHUB_CREATE_A_COMMIT', {
    owner: OWNER, repo: REPO, message, tree: newTree, parents: [remoteParent],
    author__name: name, author__email: email, author__date: date,
  }));
  composio('GITHUB_UPDATE_A_REFERENCE', { owner: OWNER, repo: REPO, ref: `heads/${BRANCH}`, sha: created, force: false });
  console.log(`${commit.slice(0, 7)} -> ${created.slice(0, 7)} ${message.split('\n')[0]}`);
  remoteParent = created;
  remoteTree = newTree;
}
```

Before running, confirm the `GITHUB_UPDATE_A_REFERENCE` argument names with `composio execute GITHUB_UPDATE_A_REFERENCE --get-schema` and adjust `ref` (`heads/<branch>` versus `refs/heads/<branch>`) if the schema says otherwise.

- [ ] **Step 4: Run the replay and verify the remote tree**

Run: `node "$SCRATCH/push-via-composio.mjs"`
Expected: one line per local commit.

Then verify the remote tip tree equals the local tree:

```bash
composio execute GITHUB_GET_A_BRANCH --account github_levers-cnida -d '{"owner":"HMS-Nisa","repo":"ocha-healthcare-staging","branch":"feat/lead-capture-attribution"}' | grep -o '"tree":{"sha":"[0-9a-f]*' | head -1
git rev-parse HEAD^{tree}
```

Expected: both show the same tree SHA.

- [ ] **Step 5: Open the pull request**

```bash
composio execute GITHUB_CREATE_A_PULL_REQUEST --account github_levers-cnida -d "$(node -e '
const body = [
  "## Summary",
  "- Merges the approved Indonesia patient guides branch so main matches production (stent, knee and cancer cost guides).",
  "- Adds intent-matched lead offers: budget and second-opinion guides (live now), doctor shortlist and cost estimate (hidden in production until GHL form IDs are supplied).",
  "- GHL forms load only when a visitor clicks an offer, pre-filled with intent and first-party attribution (landing page, referrer, UTMs).",
  "- Every WhatsApp link now uses one format with a `(ref: …)` source line and is tracked.",
  "- Adds `/terima-kasih/` (noindex) to record `generate_lead`, and updates the privacy policy.",
  "",
  "## GHL follow-up (colleague)",
  "See spec section 7.3: create Shortlist and Estimate forms, add the 11 hidden fields, consent checkbox, redirect to `/terima-kasih/?offer=<key>`, then send the two form IDs.",
  "",
  "## Verification",
  "- `npm test` passes; `npm run build` passes the SEO audit (new checks: canonical WhatsApp links, thank-you page noindex and excluded from sitemap).",
  "- Browser-checked on desktop and mobile; mobile Lighthouse within 5 points of live.",
  "",
  "Spec: `docs/superpowers/specs/2026-09-30-lead-capture-attribution-design.md`",
  "Plan: `docs/superpowers/plans/2026-09-30-lead-capture-attribution.md`",
  "",
  "🤖 Generated with [Claude Code](https://claude.com/claude-code)",
].join("\n");
console.log(JSON.stringify({ owner: "HMS-Nisa", repo: "ocha-healthcare-staging", title: "Add lead capture offers and attribution", head: "feat/lead-capture-attribution", base: "main", body, draft: false }));
')"
```

Expected: `"successful": true` with the pull request URL. Report the URL to the user. Do not merge.
