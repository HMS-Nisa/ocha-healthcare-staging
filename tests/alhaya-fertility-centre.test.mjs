import test from 'node:test';
import assert from 'node:assert/strict';
import { accessSync, readFileSync } from 'node:fs';
import { hasGhlTracking, hasProhibitedPositioning } from '../scripts/seo-audit.mjs';

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8');
const exists = (relative) => {
  accessSync(new URL(relative, import.meta.url));
  return true;
};

test('Alhaya page is Indonesian, canonical, indexable, and free of GHL tracking', () => {
  const page = read('../src/pages/alhaya-fertility-centre.astro');
  assert.match(page, /absoluteUrl\('\/alhaya-fertility-centre\/'\)/);
  assert.match(page, /canonicalPath="\/alhaya-fertility-centre\/"/);
  assert.doesNotMatch(page, /robots=/);
  assert.doesNotMatch(page, /lang="en"/);
  assert.doesNotMatch(page, /enableGhlTracking/);
  assert.equal(hasGhlTracking(page), false);
  assert.equal(hasProhibitedPositioning(`<body>${page}</body>`), false);
});

test('Alhaya page keeps one H1 and routes every call to action through the Ocha number', () => {
  const page = read('../src/pages/alhaya-fertility-centre.astro');
  assert.equal(page.match(/<h1(?:\s|>)/g)?.length, 1);
  assert.match(page, /wa\.me\/\$\{WA_NUMBER\}/);
  assert.doesNotMatch(page, /wa\.me\/60112670|011-?26706388/);
});

test('Alhaya page states the clinic source and Ocha non-clinical disclaimer', () => {
  const page = read('../src/pages/alhaya-fertility-centre.astro');
  assert.match(page, /bersumber dari Alhaya Fertility Centre dan dapat berubah/);
  assert.match(page, /bukan penyedia layanan medis/);
});

test('Alhaya assets ship with the site and are referenced by the page', () => {
  const page = read('../src/pages/alhaya-fertility-centre.astro');
  for (const asset of ['/assets/alhaya-logo.png', '/assets/doctors/dr-haris-hamzah.jpg', '/assets/doctors/dr-wan-syahirah.jpg']) {
    assert.match(page, new RegExp(asset.replace(/[/.]/g, '\\$&')));
    assert.equal(exists(`../public${asset}`), true);
  }
});

test('Alhaya doctor seed carries the fields the directory requires', () => {
  const migration = read('../supabase/migrations/202611180001_seed_alhaya_doctors.sql');
  assert.match(migration, /on conflict \(id\) do update set/);
  assert.equal(migration.match(/'Dokter Spesialis Fertility'/g)?.length, 2);
  assert.equal(migration.match(/60000 Kuala Lumpur, Malaysia/g)?.length, 2);
  for (const id of ['haris-hamzah', 'wan-syahirah-yang-mohsin']) {
    assert.match(migration, new RegExp(`'${id}'`));
  }
  for (const image of ['dr-haris-hamzah.jpg', 'dr-wan-syahirah.jpg']) {
    assert.match(migration, new RegExp(`https://ocha\\.health/assets/doctors/${image}`));
  }
});

test('footer links the Alhaya page in Bahasa Indonesia', () => {
  const footer = read('../src/components/Footer.astro');
  assert.match(footer, /href="\/alhaya-fertility-centre"/);
  assert.match(footer, />Bayi Tabung \(IVF\) Alhaya</);
});
