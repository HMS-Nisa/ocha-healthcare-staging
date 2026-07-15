import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8');

test('standard build command runs verified pipeline without recursion', () => {
  const pkg = JSON.parse(read('../package.json'));
  assert.equal(pkg.scripts.build, 'npm run build:verified');
  assert.equal(pkg.scripts['build:site'], 'astro build');
  assert.doesNotMatch(pkg.scripts['build:verified'], /npm run build(?:\s|$)/);
});

test('lead magnets are noindex and use Bahasa Indonesia interface labels', () => {
  const source = read('../src/pages/guide/[...slug].astro');
  assert.match(source, /robots="noindex,follow"/);
  assert.doesNotMatch(source, /Free Resource|Exclusive Content|>\s*Download\s*</i);
});

test('booking calendar offers preferred request times without availability claims', () => {
  const source = read('../src/components/BookingWidget.jsx');
  assert.match(source, /PREFERRED_REQUEST_TIMES/);
  assert.doesNotMatch(source, /DEFAULT_HOURS|dayHours|slot tersedia|Tidak ada slot|Consultation hours/i);
});

test('core provider pages emit connected WebPage and breadcrumb schema', () => {
  for (const file of ['../src/pages/doctor/[id].astro', '../src/pages/dokter/[slug].astro']) {
    const source = read(file);
    assert.match(source, /'@type': 'WebPage'/);
    assert.match(source, /'@type': 'BreadcrumbList'/);
  }
  const directory = read('../src/pages/doctors.astro');
  assert.match(directory, /'@type': 'WebPage'/);
  assert.match(directory, /'@type': 'ItemList'/);
});

test('legal pages use a stable editorial update date and blog layout shares Footer', () => {
  for (const file of ['../src/pages/privacy.astro', '../src/pages/terms.astro']) {
    const source = read(file);
    assert.match(source, /15 Juli 2026/);
    assert.doesNotMatch(source, /new Date\(\)\.toLocaleDateString/);
  }
  assert.match(read('../src/layouts/Layout.astro'), /<Footer\s*\/>/);
});

test('Netlify redirect rules permanently cover every legacy route', () => {
  const redirects = read('../public/_redirects');
  const expected = [
    '/article/template/ /blog/biaya-operasi-bypass-jantung-di-malaysia/ 301',
    '/dokter/dokter-spesialis-ortopedi-tulang--kuala-lumpur/ /dokter/dokter-spesialis-ortopedi-tulang-kuala-lumpur/ 301',
    '/dokter/dokter-spesialis-ortopedi-tulang--penang/ /dokter/dokter-spesialis-ortopedi-tulang-penang/ 301',
    '/dokter/dokter-spesialis-ortopedi-tulang--sarawak/ /dokter/dokter-spesialis-ortopedi-tulang-sarawak/ 301',
  ];
  for (const rule of expected) assert.match(redirects, new RegExp(rule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
