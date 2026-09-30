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
