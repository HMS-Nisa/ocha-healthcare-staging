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

test('thank-you page records the lead without indexing', () => {
  const page = read('../src/pages/terima-kasih.astro');
  assert.match(page, /robots="noindex,follow"/);
  assert.match(page, /track\('generate_lead', \{ page_type: 'thank_you', offer: copy \? offer : 'unknown' \}\)/);
  assert.match(page, /buildWhatsAppUrl\(/);
  assert.match(page, /`terima-kasih\/\$\{copy \? offer : 'umum'\}`/);
  assert.match(page, /Object\.hasOwn\(/);
  assert.doesNotMatch(page, /__ochaOfferCopy\?\.\[offer\]/);
});

test('privacy policy discloses offer forms and attribution storage', () => {
  const privacy = read('../src/pages/privacy.astro');
  assert.match(privacy, /30 September 2026/);
  assert.match(privacy, /Formulir GoHighLevel hanya dimuat setelah Anda menekan tombol penawaran/);
  assert.match(privacy, /tanpa data pribadi/);
});

test('offer wrappers render only when the offer is live', () => {
  const blog = read('../src/pages/blog/[...slug].astro');
  assert.match(blog, /isOfferAvailable\(getOffer\(articleOffer\), \{ dev: import\.meta\.env\.DEV \}\)/);
  assert.match(blog, /\{showOffer && \(\s*<section class="mt-12" aria-label="Penawaran gratis">/);
  // The original sidebar booking card stays as the fallback.
  assert.match(blog, /Mulai dengan memilih jadwal/);
  assert.ok(before(blog, 'showOffer ? (', 'Mulai dengan memilih jadwal'));

  const specialty = read('../src/pages/dokter/[slug].astro');
  assert.match(specialty, /isOfferAvailable\(getOffer\('shortlist'\), \{ dev: import\.meta\.env\.DEV \}\)/);
  assert.match(specialty, /\{showOffer && \(\s*<section class="pb-12 md:pb-16">/);

  const directory = read('../src/pages/doctors.astro');
  assert.match(directory, /isOfferAvailable\(getOffer\('shortlist'\), \{ dev: import\.meta\.env\.DEV \}\)/);
  assert.match(directory, /\{showOffer && \(\s*<section class="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 mt-16">/);
});
