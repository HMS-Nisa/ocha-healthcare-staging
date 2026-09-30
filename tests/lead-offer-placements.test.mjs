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
