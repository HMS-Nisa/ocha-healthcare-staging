import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hasGhlTracking } from '../scripts/seo-audit.mjs';

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8');

test('MM2H page is English, noindex, canonical, and solely enables GHL tracking', () => {
  const page = read('../src/pages/mm2h-pvip.astro');
  assert.match(page, /absoluteUrl\('\/mm2h-pvip\/'\)/);
  assert.match(page, /robots="noindex,follow"/);
  assert.match(page, /lang="en"/);
  assert.match(page, /enableGhlTracking/);

  const landingLayout = read('../src/layouts/LandingLayout.astro');
  assert.match(landingLayout, /enableGhlTracking\s*=\s*false/);
  assert.match(landingLayout, /<html lang=\{lang\}/);
  assert.match(landingLayout, /\{enableGhlTracking && \(/);
  assert.equal(hasGhlTracking(read('../src/layouts/Layout.astro')), false);
});

test('MM2H schema names Daro as provider and Ocha only as intermediary', () => {
  const page = read('../src/pages/mm2h-pvip.astro');
  assert.match(page, /'@id': `\$\{canonical\}#webpage`/);
  assert.match(page, /'@id': `\$\{canonical\}#service`/);
  assert.match(page, /provider:\s*\{\s*'@type': 'Organization',\s*name: 'Daro International'\s*\}/s);
  assert.match(page, /broker:\s*\{\s*'@id': 'https:\/\/ocha\.health\/#organization'\s*\}/s);
  assert.doesNotMatch(page, /provider[^\n]+Ocha Healthcare/);
});

test('generated tracking audit identifies only the preserved GHL script', () => {
  assert.equal(hasGhlTracking('<script src="https://link.ocha.health/js/external-tracking.js" data-tracking-id="tk_1d3f5f01348b42b7a2b92e23faa347cd"></script>'), true);
  assert.equal(hasGhlTracking('<script src="https://example.com/analytics.js"></script>'), false);
});

test('footer and lead magnet accessibility labels use Bahasa Indonesia', () => {
  const footer = read('../src/components/Footer.astro');
  assert.match(footer, />Cari Dokter</);
  assert.match(footer, />Tinggal Jangka Panjang/);
  assert.match(footer, />Panduan</);
  assert.doesNotMatch(footer, /Find a Specialist|Long-Term Stay|Guides/);

  const guide = read('../src/pages/guide/[...slug].astro');
  assert.doesNotMatch(guide, /Lead Magnet Form|Guide Cover/);
  assert.match(guide, /Formulir Unduh Panduan/);
  assert.match(guide, /Sampul panduan/);
});

test('privacy policy limits GHL disclosure to the long-stay page', () => {
  const privacy = read('../src/pages/privacy.astro');
  assert.match(privacy, /GoHighLevel/);
  assert.match(privacy, /MM2H dan PVIP/);
  assert.match(privacy, /tidak dimuat pada halaman layanan kesehatan, dokter, atau blog/i);
});
