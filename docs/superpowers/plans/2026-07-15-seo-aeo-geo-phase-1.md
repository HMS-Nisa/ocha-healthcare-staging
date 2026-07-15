# Ocha SEO, AEO, and GEO Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Bahasa Indonesia-first, technically indexable Ocha website that accurately presents human-led specialist matching and measures calendar-to-WhatsApp lead actions.

**Architecture:** Shared SEO helpers and one Astro head component will control canonical URLs, robots directives, social metadata, and JSON-LD across both layouts. Pure JavaScript helpers will determine indexability and normalized slugs, while a post-build audit will remove non-indexable URLs from the sitemap and fail on malformed output. Content templates remain static Astro pages backed by the existing Google Sheet, with human review and booking as the conversion boundary.

**Tech Stack:** Astro 5, React 19, JavaScript ES modules, Astro Content Collections, `node:test`, GA4/GTM data layer, Google Search Console.

## Global Constraints

- Default public language is Bahasa Indonesia and every indexable page uses `lang="id"`.
- Ocha coordinates introductions and appointments; it does not diagnose, treat, provide AI matching, or provide end-to-end medical-travel logistics.
- The primary conversion remains calendar selection followed by WhatsApp contact with an Ocha agent.
- Existing approved testimonials and trust claims remain except mock content and claims that contradict the confirmed service scope.
- No medical, free-text, phone, message, doctor-name, or personally identifiable data enters analytics events.
- Doctor pages are indexable only with required identity fields plus either an 80-word biography or three verified differentiator fields.
- Specialty/location pages are indexable only with at least two indexable providers.
- Never fabricate provider biographies, credentials, schedules, reviews, costs, or clinical claims.
- Use only `https://ocha.health`, lowercase paths, and trailing slashes as canonical URLs.
- Do not add a new runtime dependency.

---

## File map

### New files

- `src/lib/seo.js`: canonical URL and site-level schema helpers.
- `src/lib/indexability.js`: pure doctor and specialty/location eligibility rules.
- `src/lib/slugs.js`: deterministic slug normalization and specialty/location path generation.
- `src/lib/analytics.js`: privacy-safe `dataLayer` event helper.
- `src/components/SeoHead.astro`: shared metadata and JSON-LD renderer.
- `src/components/Breadcrumbs.astro`: visible breadcrumbs and matching schema input.
- `src/pages/tentang-ocha.astro`: company identity and partnership disclosure.
- `src/pages/cara-kerja.astro`: human-led matching and booking process.
- `src/pages/kebijakan-editorial.astro`: sourcing, authorship, review, and update policy.
- `src/pages/disclaimer-medis.astro`: coordination-only medical disclaimer.
- `src/content/blog/biaya-operasi-bypass-jantung-di-malaysia.md`: real replacement for the mock article.
- `public/assets/doctor-placeholder.png`: Ocha-owned doctor fallback image.
- `scripts/filter-sitemap.mjs`: post-build sitemap indexability filter.
- `scripts/seo-audit.mjs`: generated-site acceptance checks.
- `tests/seo.test.mjs`: SEO helper tests.
- `tests/indexability.test.mjs`: provider/page eligibility tests.
- `tests/slugs.test.mjs`: slug normalization and URL tests.
- `tests/analytics.test.mjs`: analytics allow-list tests.
- `tests/filter-sitemap.test.mjs`: sitemap filtering tests.

### Modified files

- `package.json`: test, sitemap-filter, audit, and verified-build scripts.
- `astro.config.mjs`: permanent redirects and sitemap configuration.
- `src/config.js`: site identity constants and Indonesian defaults.
- `src/layouts/Layout.astro`: shared SEO head and Indonesian site shell.
- `src/layouts/LandingLayout.astro`: shared SEO head and Indonesian site shell.
- `src/pages/index.astro`: Indonesian metadata and Organization/WebSite schema.
- `src/pages/privacy.astro`: Indonesian privacy-policy metadata, headings, and navigation language.
- `src/pages/terms.astro`: Indonesian terms metadata, headings, and navigation language.
- `src/components/Hero.astro`: accurate human-led specialist-matching proposition.
- `src/components/Features.astro`: scope-accurate benefits.
- `src/components/FAQ.astro`: Indonesian answers about fees and human coordination.
- `src/components/CTA.astro`: calendar/WhatsApp lead proposition.
- `src/components/Testimonials.astro`: Indonesian section framing while retaining approved testimonials.
- `src/components/MedicalHubs.jsx`: Indonesian labels and accessible links.
- `src/components/Footer.astro`: trust-page links and disclosure.
- `src/pages/doctors.astro`: fail-fast data loading, directory schema, and metadata.
- `src/pages/doctor/[id].astro`: indexability, metadata, visible factual content, and Physician schema.
- `src/pages/dokter/[slug].astro`: normalized slugs, indexability, breadcrumbs, and ItemList schema.
- `src/components/Directory.jsx`: Ocha-owned fallback image and safe view/CTA events.
- `src/components/BookingWidget.jsx`: request-language copy and safe booking events.
- `src/pages/blog/index.astro`: Indonesian metadata and article discovery copy.
- `src/pages/blog/[...slug].astro`: canonical metadata, author/reviewer rules, citations, and article schema.
- `src/pages/guide/[...slug].astro`: canonical metadata and lead-guide event.
- `public/robots.txt`: keep only the canonical sitemap-index declaration.
- `src/content/config.ts`: support `updatedDate`, `sources`, `reviewer`, and `medicalDisclaimer` fields.

### Removed file

- `src/pages/article/template.astro`: mock article route replaced by a permanent redirect.

---

### Task 1: Shared SEO primitives and head renderer

**Files:**
- Create: `tests/seo.test.mjs`
- Create: `src/lib/seo.js`
- Create: `src/components/SeoHead.astro`
- Modify: `src/config.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `normalizePath(path): string`, `absoluteUrl(path): string`, `buildOrganizationSchema(): object`, and `<SeoHead title description canonicalPath robots image contentType schemas />`.
- Consumes: `SITE_URL`, `SITE_TITLE`, `SITE_DESCRIPTION`, and `DEFAULT_SOCIAL_IMAGE` from `src/config.js`.

- [ ] **Step 1: Add the failing SEO unit test**

```js
// tests/seo.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { absoluteUrl, normalizePath, buildOrganizationSchema } from '../src/lib/seo.js';

test('normalizes canonical paths', () => {
  assert.equal(normalizePath('/Doctors'), '/doctors/');
  assert.equal(normalizePath('dokter/jantung--penang'), '/dokter/jantung-penang/');
  assert.equal(normalizePath('/'), '/');
});

test('builds absolute production URLs', () => {
  assert.equal(absoluteUrl('/doctors'), 'https://ocha.health/doctors/');
});

test('describes Ocha as a non-clinical organization', () => {
  const schema = buildOrganizationSchema();
  assert.equal(schema['@type'], 'Organization');
  assert.equal(schema['@id'], 'https://ocha.health/#organization');
  assert.equal(schema.name, 'Ocha Healthcare');
  assert.equal(schema.url, 'https://ocha.health/');
  assert.equal('medicalSpecialty' in schema, false);
});
```

- [ ] **Step 2: Add the test command and verify failure**

```json
"scripts": {
  "test": "node --test tests/*.test.mjs"
}
```

Run: `npm test -- --test-name-pattern="SEO|canonical|organization|normalizes|builds|describes"`
Expected: FAIL because `src/lib/seo.js` does not exist.

- [ ] **Step 3: Implement the pure SEO helpers**

```js
// src/lib/seo.js
import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION, DEFAULT_SOCIAL_IMAGE } from '../config.js';

export function normalizePath(value = '/') {
  const raw = `/${String(value).split('?')[0].split('#')[0]}`
    .replace(/\/{2,}/g, '/')
    .replace(/-{2,}/g, '-')
    .toLowerCase();
  if (raw === '/') return '/';
  return `${raw.replace(/^\/+|\/+$/g, '')}/`.replace(/^/, '/');
}

export function absoluteUrl(path = '/') {
  return new URL(normalizePath(path), SITE_URL).href;
}

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}#organization`,
    name: SITE_TITLE,
    url: SITE_URL,
    logo: absoluteUrl('/assets/logo.png'),
    description: SITE_DESCRIPTION,
    areaServed: [
      { '@type': 'Country', name: 'Indonesia' },
      { '@type': 'Country', name: 'Malaysia' },
    ],
  };
}

export function seoDefaults() {
  return { image: absoluteUrl(DEFAULT_SOCIAL_IMAGE), robots: 'index,follow' };
}
```

Add these constants to `src/config.js`:

```js
export const SITE_URL = 'https://ocha.health/';
export const SITE_TITLE = 'Ocha Healthcare';
export const SITE_DESCRIPTION = 'Concierge medis gratis yang membantu pasien Indonesia terhubung dengan dokter spesialis dan rumah sakit mitra di Malaysia.';
export const DEFAULT_SOCIAL_IMAGE = '/assets/logo.png';
export const DEFAULT_LOCALE = 'id_ID';
```

- [ ] **Step 4: Implement `SeoHead.astro`**

```astro
---
import { absoluteUrl, seoDefaults } from '../lib/seo.js';
import { DEFAULT_LOCALE, SITE_TITLE } from '../config.js';

const defaults = seoDefaults();
const {
  title,
  description,
  canonicalPath,
  robots = defaults.robots,
  image = defaults.image,
  contentType = 'website',
  schemas = [],
} = Astro.props;
const canonical = absoluteUrl(canonicalPath);
const socialImage = image.startsWith('http') ? image : absoluteUrl(image);
const fullTitle = title.includes(SITE_TITLE) ? title : `${title} | ${SITE_TITLE}`;
---
<title>{fullTitle}</title>
<meta name="description" content={description} />
<meta name="robots" content={robots} />
<link rel="canonical" href={canonical} />
<meta property="og:type" content={contentType} />
<meta property="og:locale" content={DEFAULT_LOCALE} />
<meta property="og:site_name" content={SITE_TITLE} />
<meta property="og:title" content={fullTitle} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical} />
<meta property="og:image" content={socialImage} />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={fullTitle} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={socialImage} />
{schemas.filter(Boolean).map((schema) => (
  <script type="application/ld+json" set:html={JSON.stringify(schema)} />
))}
```

- [ ] **Step 5: Run tests and commit**

Run: `npm test`
Expected: all SEO tests PASS.

```bash
git add package.json src/config.js src/lib/seo.js src/components/SeoHead.astro tests/seo.test.mjs
git commit -m "feat: add shared SEO metadata foundation"
```

---

### Task 2: Indonesian layouts, positioning, and trust pages

**Files:**
- Modify: `src/layouts/Layout.astro`
- Modify: `src/layouts/LandingLayout.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/privacy.astro`
- Modify: `src/pages/terms.astro`
- Modify: `src/components/Hero.astro`
- Modify: `src/components/Features.astro`
- Modify: `src/components/FAQ.astro`
- Modify: `src/components/CTA.astro`
- Modify: `src/components/Testimonials.astro`
- Modify: `src/components/MedicalHubs.jsx`
- Modify: `src/components/Footer.astro`
- Create: `src/pages/tentang-ocha.astro`
- Create: `src/pages/cara-kerja.astro`
- Create: `src/pages/kebijakan-editorial.astro`
- Create: `src/pages/disclaimer-medis.astro`

**Interfaces:**
- Consumes: `<SeoHead />`, `buildOrganizationSchema()`, and page-level `canonicalPath`, `robots`, `image`, `contentType`, `schemas` props.
- Produces: one consistent Bahasa Indonesia site shell and four indexable trust pages.

- [ ] **Step 1: Write a generated-output assertion that initially fails**

Create `scripts/seo-audit.mjs` with this first assertion:

```js
import fs from 'node:fs/promises';
import path from 'node:path';

const root = new URL('../dist/', import.meta.url);
const requiredRoutes = ['index.html', 'tentang-ocha/index.html', 'cara-kerja/index.html', 'kebijakan-editorial/index.html', 'disclaimer-medis/index.html'];

for (const route of requiredRoutes) {
  const html = await fs.readFile(new URL(route, root), 'utf8');
  if (!html.includes('<html lang="id"')) throw new Error(`${route}: missing lang=id`);
  if (/AI-Powered|airport transfer|airport pickup|akomodasi|Guarantee Letter/i.test(html)) {
    throw new Error(`${route}: contains out-of-scope positioning`);
  }
  if (!/<link rel="canonical" href="https:\/\/ocha\.health\//.test(html)) {
    throw new Error(`${route}: missing canonical`);
  }
}
```

Add: `"audit:seo": "node scripts/seo-audit.mjs"`.

Run: `npm run build && npm run audit:seo`
Expected: FAIL because the trust routes do not exist and layouts use `lang="en"`.

- [ ] **Step 2: Route all layout metadata through `SeoHead`**

In both layouts, accept:

```js
const {
  title,
  description,
  canonicalPath = Astro.url.pathname,
  robots = 'index,follow',
  image,
  contentType = 'website',
  schemas = [],
} = Astro.props;
```

Set `<html lang="id">`, replace the local title/description tags with:

```astro
<SeoHead {...{ title, description, canonicalPath, robots, image, contentType, schemas }} />
```

Use these navigation labels in both layouts: `Beranda`, `Cari Dokter`, `Panduan`, and `Buat Janji`. Keep the existing GA4, GTM, Clarity, mobile-menu behavior, and company registration number.

Remove the malformed HTML verification meta value from `Layout.astro`; the active Search Console property is the DNS-verified domain property `sc-domain:ocha.health`, so a page-level verification token is not required.

- [ ] **Step 3: Replace active homepage positioning**

Use these core messages consistently:

```text
Badge: Concierge Medis untuk Pasien Indonesia
H1: Temukan dokter spesialis yang tepat di Malaysia
Subheading: Ocha membantu Anda terhubung dengan dokter dan rumah sakit mitra yang sesuai dengan kebutuhan Anda. Gratis, mudah, dan ditinjau langsung oleh tim Ocha.
Primary CTA: Cari Dokter Spesialis
Secondary CTA: Konsultasi via WhatsApp
Process: Pilih kebutuhan → Pilih jadwal konsultasi → Tim Ocha meninjau → Kami hubungkan ke rumah sakit
```

Translate the hubs, feature headings, FAQ headings, testimonial framing, and final CTA. Preserve approved testimonial quotations. Remove claims for AI, transfers, hotels, GL, insurance processing, and end-to-end logistics from active service copy.

- [ ] **Step 4: Create the four trust pages**

Each page uses `LandingLayout`, a unique canonical path, one H1, and these required statements:

```text
Tentang Ocha: Ocha Healthcare Sdn Bhd membantu pasien Indonesia terhubung dengan dokter spesialis dan rumah sakit mitra di Malaysia. Layanan Ocha gratis bagi pasien; Ocha didukung melalui kemitraan yang diungkapkan dengan rumah sakit.

Cara Kerja: Ocha mengumpulkan kebutuhan awal, meninjau pilihan dalam jaringan mitra, menghubungi pasien melalui WhatsApp, dan membantu mengatur janji. Pilihan jadwal adalah permintaan dan baru dikonfirmasi setelah tim Ocha memeriksa ketersediaan.

Kebijakan Editorial: Konten kesehatan Ocha bersifat informasional, menggunakan sumber yang dicantumkan, menampilkan tanggal pembaruan, dan tidak menggantikan konsultasi dokter. Nama peninjau medis hanya ditampilkan setelah peninjau menyetujui versi yang diterbitkan.

Disclaimer Medis: Ocha bukan rumah sakit dan tidak memberikan diagnosis, rekomendasi pengobatan, atau layanan darurat. Dalam keadaan darurat, hubungi layanan darurat setempat.
```

Translate the visible headings, metadata, and navigation context of `privacy.astro` and `terms.astro` into Bahasa Indonesia without weakening their existing legal meaning. Preserve the registered company identity and all substantive privacy/terms clauses.

- [ ] **Step 5: Add trust links and schemas**

Add all four pages to `Footer.astro`. Pass `buildOrganizationSchema()` and a `WebSite` schema with `@id: https://ocha.health/#website` to the homepage layout. Ensure trust pages use `WebPage` schema with visible matching descriptions.

- [ ] **Step 6: Build, audit, and commit**

Run: `npm run build && npm run audit:seo`
Expected: build succeeds and all Task 2 assertions PASS.

```bash
git add src/layouts src/pages src/components scripts/seo-audit.mjs package.json
git commit -m "feat: align Ocha positioning and trust content"
```

---

### Task 3: Provider indexability and factual doctor pages

**Files:**
- Create: `tests/indexability.test.mjs`
- Create: `src/lib/indexability.js`
- Create: `public/assets/doctor-placeholder.png`
- Modify: `src/pages/doctors.astro`
- Modify: `src/pages/doctor/[id].astro`
- Modify: `src/components/Directory.jsx`

**Interfaces:**
- Produces: `isDoctorIndexable(doctor): boolean`, `countWords(value): number`, and `hasRequiredDoctorFields(doctor): boolean`.
- Consumes: raw Google Sheet doctor records.

- [ ] **Step 1: Write the failing eligibility tests**

```js
// tests/indexability.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { isDoctorIndexable } from '../src/lib/indexability.js';

const base = { id: 'dr-a', name: 'Dr A', specialty: 'Cardiology', hospital: 'Hospital A', location: 'Penang, Malaysia' };
const longBio = Array.from({ length: 80 }, () => 'kata').join(' ');

test('indexes a complete doctor with an 80-word biography', () => {
  assert.equal(isDoctorIndexable({ ...base, bio: longBio }), true);
});

test('indexes a complete doctor with three verified differentiators', () => {
  assert.equal(isDoctorIndexable({ ...base, subspecialty: 'Intervensi', languages: 'Bahasa Melayu, English', qualifications: 'MBBS, MRCP' }), true);
});

test('does not index a thin or incomplete doctor', () => {
  assert.equal(isDoctorIndexable(base), false);
  assert.equal(isDoctorIndexable({ ...base, hospital: '' }), false);
});
```

Run: `npm test`
Expected: FAIL because `src/lib/indexability.js` does not exist.

- [ ] **Step 2: Implement eligibility exactly**

```js
// src/lib/indexability.js
const DIFFERENTIATORS = ['subspecialty', 'languages', 'qualifications', 'procedures', 'schedule'];

export function countWords(value = '') {
  return String(value).trim().split(/\s+/).filter(Boolean).length;
}

export function hasRequiredDoctorFields(doctor = {}) {
  return ['id', 'name', 'specialty', 'hospital', 'location']
    .every((key) => String(doctor[key] || '').trim().length > 0) &&
    /malaysia|penang|kuala lumpur|selangor|melaka|johor|sarawak|sabah|kuantan|ipoh/i.test(doctor.location);
}

export function isDoctorIndexable(doctor = {}) {
  if (!hasRequiredDoctorFields(doctor)) return false;
  const bio = doctor.bio || doctor.biography || doctor.profile || doctor.profil || '';
  const differentiatorCount = DIFFERENTIATORS.filter((key) => {
    const value = doctor[key];
    return Array.isArray(value) ? value.length > 0 : String(value || '').trim().length > 0;
  }).length;
  return countWords(bio) >= 80 || differentiatorCount >= 3;
}
```

- [ ] **Step 3: Apply the rule to provider pages**

In `doctor/[id].astro`, compute `const indexable = isDoctorIndexable(doctor)` and pass:

```astro
robots={indexable ? 'index,follow' : 'noindex,follow'}
canonicalPath={`/doctor/${doctor.id}/`}
```

Only emit `Physician` schema when `indexable` is true. Include `url`, `image`, `medicalSpecialty`, `hospitalAffiliation`, `address`, `availableLanguage`, and visible description when the source field exists. Do not emit placeholder facts.

Remove doctor-specific testimonial implications; label the retained cards `Pengalaman pasien yang dibantu Ocha`. Replace every `placehold.co` fallback with `/assets/doctor-placeholder.png`.

- [ ] **Step 4: Make doctor-data builds fail fast**

Replace `catch` branches that return an empty list with:

```js
throw new Error(`Doctor data fetch failed: ${error instanceof Error ? error.message : String(error)}`);
```

Keep ID deduplication and throw when duplicate non-empty IDs remain after normalization.

- [ ] **Step 5: Run tests, build, and commit**

Run: `npm test && npm run build`
Expected: all tests PASS; build produces doctor pages with mixed `index,follow` and `noindex,follow` according to source completeness.

```bash
git add tests/indexability.test.mjs src/lib/indexability.js public/assets/doctor-placeholder.png src/pages/doctors.astro src/pages/doctor/[id].astro src/components/Directory.jsx
git commit -m "feat: enforce provider index quality"
```

---

### Task 4: Stable specialty/location pages and redirects

**Files:**
- Create: `tests/slugs.test.mjs`
- Create: `src/lib/slugs.js`
- Create: `src/components/Breadcrumbs.astro`
- Modify: `src/pages/dokter/[slug].astro`
- Modify: `astro.config.mjs`

**Interfaces:**
- Produces: `slugifySegment(value): string`, `specialtyLocationSlug(specialty, city): string`, and `isSpecialtyLocationIndexable(doctors): boolean`.
- Consumes: `isDoctorIndexable()` from `src/lib/indexability.js`.

- [ ] **Step 1: Write failing slug and threshold tests**

```js
// tests/slugs.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { slugifySegment, specialtyLocationSlug, isSpecialtyLocationIndexable } from '../src/lib/slugs.js';

test('collapses punctuation and repeated separators', () => {
  assert.equal(slugifySegment('Tulang / Orthopedi -- Penang'), 'tulang-orthopedi-penang');
  assert.equal(specialtyLocationSlug('tulang-orthopedi', 'Penang'), 'tulang-orthopedi-penang');
});

test('requires two indexable providers', () => {
  assert.equal(isSpecialtyLocationIndexable([{ indexable: true }]), false);
  assert.equal(isSpecialtyLocationIndexable([{ indexable: true }, { indexable: true }]), true);
});
```

- [ ] **Step 2: Implement deterministic slug helpers**

```js
// src/lib/slugs.js
export function slugifySegment(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' dan ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

export function specialtyLocationSlug(specialty, city) {
  return slugifySegment(`${specialty}-${city}`);
}

export function isSpecialtyLocationIndexable(doctors = []) {
  return doctors.filter((doctor) => doctor.indexable === true).length >= 2;
}
```

- [ ] **Step 3: Rebuild specialty/location paths**

Use the existing Indonesian specialty translations, pass each provider through `isDoctorIndexable`, and generate slugs only through `specialtyLocationSlug`. Pass `noindex,follow` when fewer than two providers are indexable. Add visible breadcrumbs, an `ItemList` containing only indexable profiles, represented hospital names, the four-step human booking process, and unique FAQs derived from the actual specialty and city.

- [ ] **Step 4: Add exact permanent redirects**

Add to `astro.config.mjs`:

```js
redirects: {
  '/article/template/': '/blog/biaya-operasi-bypass-jantung-di-malaysia/',
  '/dokter/dokter-spesialis-ortopedi-tulang--kuala-lumpur/': '/dokter/dokter-spesialis-ortopedi-tulang-kuala-lumpur/',
  '/dokter/dokter-spesialis-ortopedi-tulang--penang/': '/dokter/dokter-spesialis-ortopedi-tulang-penang/',
  '/dokter/dokter-spesialis-ortopedi-tulang--sarawak/': '/dokter/dokter-spesialis-ortopedi-tulang-sarawak/',
},
```

- [ ] **Step 5: Run tests, build, and commit**

Run: `npm test && npm run build`
Expected: tests PASS; no generated canonical or route contains `--`.

```bash
git add tests/slugs.test.mjs src/lib/slugs.js src/components/Breadcrumbs.astro src/pages/dokter/[slug].astro astro.config.mjs
git commit -m "feat: normalize specialist landing pages"
```

---

### Task 5: Indexable sitemap and generated-site audit

**Files:**
- Create: `tests/filter-sitemap.test.mjs`
- Create: `scripts/filter-sitemap.mjs`
- Modify: `scripts/seo-audit.mjs`
- Modify: `package.json`
- Modify: `public/robots.txt`

**Interfaces:**
- Produces: `filterSitemapXml(xml, distDirectory): Promise<string>` and `npm run build:verified`.
- Consumes: generated HTML canonical and robots metadata.

- [ ] **Step 1: Write the failing sitemap filter test**

```js
// tests/filter-sitemap.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { filterEntries } from '../scripts/filter-sitemap.mjs';

test('keeps canonical indexable pages only', () => {
  const entries = [
    { url: 'https://ocha.health/', html: '<meta name="robots" content="index,follow"><link rel="canonical" href="https://ocha.health/">' },
    { url: 'https://ocha.health/doctor/thin/', html: '<meta name="robots" content="noindex,follow"><link rel="canonical" href="https://ocha.health/doctor/thin/">' },
    { url: 'https://ocha.health/old/', html: '<meta name="robots" content="index,follow"><link rel="canonical" href="https://ocha.health/new/">' },
  ];
  assert.deepEqual(filterEntries(entries).map((entry) => entry.url), ['https://ocha.health/']);
});
```

- [ ] **Step 2: Implement the filter and post-build command**

```js
// scripts/filter-sitemap.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function filterEntries(entries) {
  return entries.filter(({ url, html }) => {
    const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
    const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] || '';
    return robots.toLowerCase().split(',').map((value) => value.trim()).includes('index') && canonical === url;
  });
}

function htmlPathForUrl(url, distDirectory) {
  const pathname = new URL(url).pathname;
  return pathname === '/'
    ? path.join(distDirectory, 'index.html')
    : path.join(distDirectory, pathname.replace(/^\//, ''), 'index.html');
}

async function main() {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const distDirectory = path.join(projectRoot, 'dist');
  const sitemapPath = path.join(distDirectory, 'sitemap-0.xml');
  const xml = await fs.readFile(sitemapPath, 'utf8');
  const urls = [...xml.matchAll(/<url><loc>([^<]+)<\/loc><\/url>/g)].map((match) => match[1]);
  if (urls.length === 0) throw new Error('sitemap-0.xml contains no URLs');
  const entries = await Promise.all(urls.map(async (url) => ({
    url,
    html: await fs.readFile(htmlPathForUrl(url, distDirectory), 'utf8'),
  })));
  const allowed = new Set(filterEntries(entries).map((entry) => entry.url));
  const filtered = xml.replace(/<url><loc>([^<]+)<\/loc><\/url>/g, (entry, url) => allowed.has(url) ? entry : '');
  await fs.writeFile(sitemapPath, filtered);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
```

Add scripts:

```json
"build:site": "astro build",
"filter:sitemap": "node scripts/filter-sitemap.mjs",
"build:verified": "npm run build:site && npm run filter:sitemap && npm run audit:seo"
```

- [ ] **Step 3: Expand the audit assertions**

Replace `scripts/seo-audit.mjs` with a recursive audit. The implementation must collect failures and exit non-zero after printing every failure:

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(projectRoot, 'dist');
const failures = [];

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return files.flat();
}

function count(html, expression) {
  return [...html.matchAll(expression)].length;
}

const htmlFiles = (await walk(dist)).filter((file) => file.endsWith('.html'));
for (const file of htmlFiles) {
  const html = await fs.readFile(file, 'utf8');
  const relative = path.relative(dist, file);
  const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
  const indexable = robots.toLowerCase().includes('index') && !robots.toLowerCase().includes('noindex');
  if (!indexable) continue;
  const required = [
    ['lang=id', /<html[^>]+lang=["']id["']/i],
    ['title', /<title>[^<]+<\/title>/i],
    ['description', /<meta[^>]+name=["']description["']/i],
    ['canonical', /<link[^>]+rel=["']canonical["']/i],
    ['robots', /<meta[^>]+name=["']robots["']/i],
    ['og:title', /<meta[^>]+property=["']og:title["']/i],
    ['og:description', /<meta[^>]+property=["']og:description["']/i],
    ['og:url', /<meta[^>]+property=["']og:url["']/i],
    ['twitter:card', /<meta[^>]+name=["']twitter:card["']/i],
  ];
  for (const [label, expression] of required) if (!expression.test(html)) failures.push(`${relative}: missing ${label}`);
  if (count(html, /<link[^>]+rel=["']canonical["']/gi) !== 1) failures.push(`${relative}: canonical count is not 1`);
  if (count(html, /<h1(?:\s|>)/gi) !== 1) failures.push(`${relative}: H1 count is not 1`);
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]); } catch { failures.push(`${relative}: invalid JSON-LD`); }
  }
  if (/AI-Powered|airport transfer|airport pickup|accommodation support|Guarantee Letter/i.test(html)) {
    failures.push(`${relative}: out-of-scope positioning`);
  }
}

const sitemap = await fs.readFile(path.join(dist, 'sitemap-0.xml'), 'utf8');
if (/\/article\/template\/|--/.test(sitemap)) failures.push('sitemap-0.xml: mock or malformed URL');
const robots = await fs.readFile(path.join(dist, 'robots.txt'), 'utf8');
if ((robots.match(/Sitemap:/g) || []).length !== 1 || !robots.includes('Sitemap: https://ocha.health/sitemap-index.xml')) {
  failures.push('robots.txt: canonical sitemap declaration is invalid');
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
}
```

The audit must fail when:

```text
an indexable page lacks lang=id, title, description, canonical, robots, og:title, og:description, og:url, or twitter:card
a page has more than one canonical or more than one H1
JSON-LD cannot be parsed
an indexable page canonical does not equal its output URL
the sitemap contains noindex, redirects, /article/template/, or --
robots.txt does not contain exactly Sitemap: https://ocha.health/sitemap-index.xml
active visible HTML contains AI-Powered, airport transfer, airport pickup, accommodation support, or Guarantee Letter
```

- [ ] **Step 4: Verify and commit**

Run: `npm test && npm run build:verified`
Expected: all tests and generated-site assertions PASS.

```bash
git add tests/filter-sitemap.test.mjs scripts/filter-sitemap.mjs scripts/seo-audit.mjs package.json public/robots.txt
git commit -m "feat: publish indexable sitemap only"
```

---

### Task 6: Replace the mock bypass article with sourced Indonesian content

**Files:**
- Remove: `src/pages/article/template.astro`
- Create: `src/content/blog/biaya-operasi-bypass-jantung-di-malaysia.md`
- Modify: `src/content/config.ts`
- Modify: `src/pages/blog/index.astro`
- Modify: `src/pages/blog/[...slug].astro`

**Interfaces:**
- Produces: one canonical `Article` page at `/blog/biaya-operasi-bypass-jantung-di-malaysia/` and redirect coverage from Task 4.
- Consumes: content fields `title`, `subtitle`, `author`, `reviewer`, `date`, `updatedDate`, `image`, `category`, `readTime`, `sources`, and `medicalDisclaimer`.

- [ ] **Step 1: Add schema validation that initially fails**

Extend the blog collection schema:

```ts
updatedDate: z.coerce.date(),
reviewer: z.string().optional(),
sources: z.array(z.object({ label: z.string(), url: z.string().url() })).min(2),
medicalDisclaimer: z.string().min(40),
```

Run: `npm run build:site`
Expected: FAIL because the existing blog entry lacks the new required fields.

- [ ] **Step 2: Upgrade the existing second-opinion article metadata**

Add an actual update date, at least two authoritative sources, and this disclaimer to `src/content/blog/panduan-second-opinion.md`:

```text
Informasi ini bersifat umum dan tidak menggantikan pemeriksaan, diagnosis, atau saran dari dokter yang menangani Anda.
```

Do not retain a named reviewer unless that reviewer approved the published version.

- [ ] **Step 3: Write the bypass guide**

Use `author: "Tim Ocha Healthcare"`, omit `reviewer`, and cite these sources:

- `https://www.nhs.uk/tests-and-treatments/coronary-artery-bypass-graft/what-it-is/`
- `https://www.ijn.com.my/heart-surgery/`
- `https://www.sunwaymedical.com/en/centres-of-excellence/heart-lung-vascular-centre`

Required headings:

```text
Apa itu operasi bypass jantung (CABG)?
Mengapa biaya CABG tidak bisa ditentukan dari satu angka?
Komponen yang biasanya memengaruhi estimasi biaya
Dokumen yang dibutuhkan rumah sakit untuk estimasi
Rumah sakit dan spesialis jantung dalam jaringan Ocha
Cara meminta estimasi dan memilih jadwal melalui Ocha
Pertanyaan yang sering diajukan
Sumber dan disclaimer medis
```

Do not publish a numeric price unless an official partner-hospital source supplies the exact inclusion, exclusion, currency, and effective date. Explain that Ocha requests a case-specific estimate from the partner hospital after human review.

- [ ] **Step 4: Render trustworthy article metadata**

`blog/[...slug].astro` must show author, published/updated dates, reviewer only when present, sources as visible links, disclaimer, canonical URL, breadcrumbs, and `Article` schema. The schema author is the Organization; `reviewedBy` is omitted when the frontmatter reviewer is absent.

- [ ] **Step 5: Remove mock route, verify redirect, and commit**

Run: `npm run build:verified`
Expected: build passes; `/article/template/` is absent from the sitemap; the new guide is canonical and indexable; no placeholder author or mock patient quote remains.

```bash
git add src/content src/pages/blog src/pages/article/template.astro
git commit -m "feat: replace mock bypass article"
```

---

### Task 7: Privacy-safe booking and WhatsApp measurement

**Files:**
- Create: `tests/analytics.test.mjs`
- Create: `src/lib/analytics.js`
- Modify: `src/components/BookingWidget.jsx`
- Modify: `src/components/Directory.jsx`
- Modify: `src/pages/doctors.astro`
- Modify: `src/pages/doctor/[id].astro`
- Modify: `src/pages/guide/[...slug].astro`

**Interfaces:**
- Produces: `track(eventName, parameters): boolean` and the event allow-list.
- Consumes: event names and the four permitted parameters: `page_type`, `specialty`, `location`, `cta_placement`.

- [ ] **Step 1: Write failing analytics tests**

```js
// tests/analytics.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeEvent } from '../src/lib/analytics.js';

test('retains only approved event fields', () => {
  assert.deepEqual(
    sanitizeEvent('click_whatsapp_booking', {
      page_type: 'doctor', specialty: 'cardiology', doctor_name: 'Dr A', message: 'private', phone: '6012',
    }),
    { event: 'click_whatsapp_booking', page_type: 'doctor', specialty: 'cardiology' },
  );
});

test('rejects unknown events', () => {
  assert.equal(sanitizeEvent('medical_answer', { diagnosis: 'x' }), null);
});
```

- [ ] **Step 2: Implement the allow-list**

```js
// src/lib/analytics.js
const EVENTS = new Set([
  'view_doctor_directory', 'view_doctor_profile', 'select_booking_date',
  'select_booking_time', 'click_whatsapp_booking', 'click_whatsapp_concierge', 'view_lead_guide',
]);
const PARAMETERS = new Set(['page_type', 'specialty', 'location', 'cta_placement']);

export function sanitizeEvent(eventName, parameters = {}) {
  if (!EVENTS.has(eventName)) return null;
  return Object.fromEntries([
    ['event', eventName],
    ...Object.entries(parameters).filter(([key, value]) => PARAMETERS.has(key) && typeof value === 'string' && value.length <= 80),
  ]);
}

export function track(eventName, parameters = {}) {
  const payload = sanitizeEvent(eventName, parameters);
  if (!payload || typeof window === 'undefined') return false;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
  return true;
}
```

- [ ] **Step 3: Instrument the funnel**

Track date and time selection without the selected date/time values. Track WhatsApp clicks immediately before `window.open` or link navigation. Track page views once per hydrated component. Pass only generic specialty, normalized location, page type, and CTA placement; never pass doctor name or prefilled WhatsApp text.

Change calendar language to make availability non-binding:

```text
Pilih waktu yang Anda inginkan. Tim Ocha akan memeriksa ketersediaan dan mengonfirmasi jadwal melalui WhatsApp.
Kirim Permintaan via WhatsApp
```

- [ ] **Step 4: Test, build, and commit**

Run: `npm test && npm run build:verified`
Expected: analytics tests PASS and the generated audit finds no sensitive event parameters.

```bash
git add tests/analytics.test.mjs src/lib/analytics.js src/components/BookingWidget.jsx src/components/Directory.jsx src/pages/doctors.astro src/pages/doctor/[id].astro src/pages/guide/[...slug].astro
git commit -m "feat: measure privacy-safe booking intent"
```

---

### Task 8: Full verification, deployment, and Search Console handoff

**Files:**
- Modify only files required by failures found in this task.

**Interfaces:**
- Consumes: all Phase 1 output.
- Produces: verified production build, committed changes, deployed site, and post-deployment Search Console checks.

- [ ] **Step 1: Run the full automated gate**

Run: `npm test`
Expected: all tests PASS with zero failures.

Run: `npm run build:verified`
Expected: Astro build, sitemap filtering, and every generated-site assertion PASS.

Run: `git diff --check`
Expected: no output and exit code 0.

- [ ] **Step 2: Inspect representative generated pages**

Check:

```text
/
/doctors/
/doctor/<one indexable provider>/
/doctor/<one noindex provider>/
/dokter/<one indexable combination>/
/tentang-ocha/
/kebijakan-editorial/
/blog/biaya-operasi-bypass-jantung-di-malaysia/
```

For each, confirm one H1, Indonesian copy, canonical agreement, correct robots directive, parsed JSON-LD, working navigation, and no horizontal overflow at 375px and 1440px.

- [ ] **Step 3: Test the conversion flow**

Select a date and time, verify the UI describes it as a request, and confirm the generated WhatsApp message addresses the Ocha agent. Verify `dataLayer` contains only allow-listed keys and no doctor name, date, time, phone number, or message.

- [ ] **Step 4: Commit verification fixes**

```bash
git add src tests scripts public package.json astro.config.mjs
git commit -m "fix: resolve phase 1 verification findings"
```

Skip this commit if no verification changes are required.

- [ ] **Step 5: Push and deploy**

Run: `git status --short --branch`
Expected: clean worktree on `main`, ahead of `origin/main` by the Phase 1 commits.

Run: `git push origin main`
Expected: push succeeds. If the hosting platform is connected to `main`, wait for its deployment result. If it is not connected, stop and obtain the exact hosting target before running a deployment command.

- [ ] **Step 6: Verify production and Search Console**

Confirm live 200 responses for the canonical sitemap and representative pages. Confirm the old template and double-hyphen URLs permanently redirect. In Search Console:

```text
inspect the homepage, doctor directory, one indexable doctor, one specialty/location page, and the new bypass guide
submit only https://ocha.health/sitemap-index.xml
remove the redundant child-sitemap submission
request indexing only after live inspection passes
record the deployment date for checks at 7, 14, and 28 days
```

Do not use “Validate fix” for the 11 crawled-not-indexed URLs until the new sitemap and indexability rules are live and representative URL inspections pass.
