import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { blogEntrySchema } from '../src/lib/blog-schema.js';

const secondOpinionPath = new URL('../src/content/blog/panduan-second-opinion.md', import.meta.url);
const bypassPath = new URL('../src/content/blog/biaya-operasi-bypass-jantung-di-malaysia.md', import.meta.url);
const bookingGuidePath = new URL('../src/content/blog/cara-meminta-slot-konsultasi-spesialis-di-malaysia.md', import.meta.url);
const stentCostPath = new URL('../src/content/blog/biaya-pasang-ring-jantung-di-malaysia.md', import.meta.url);
const cancerCostPath = new URL('../src/content/blog/biaya-pengobatan-kanker-di-malaysia.md', import.meta.url);
const kneeCostPath = new URL('../src/content/blog/biaya-operasi-ganti-sendi-lutut-di-malaysia.md', import.meta.url);
const rendererPath = new URL('../src/pages/blog/[...slug].astro', import.meta.url);

const unsourcedEntry = {
  title: 'Panduan uji',
  subtitle: 'Ringkasan panduan uji',
  author: 'Tim Ocha Healthcare',
  date: new Date('2026-07-15'),
  updatedDate: new Date('2026-07-15'),
  image: '/assets/logo.png',
  category: 'Panduan Pasien',
  readTime: '3 menit baca',
  medicalDisclaimer: 'Informasi umum ini tidak menggantikan diagnosis atau saran dokter yang menangani Anda.',
};

test('requires sources for indexable entries but permits unsourced noindex entries', () => {
  const indexable = blogEntrySchema.safeParse({ ...unsourcedEntry, robots: 'index,follow' });
  const noindex = blogEntrySchema.safeParse({ ...unsourcedEntry, robots: 'noindex,follow' });

  assert.equal(indexable.success, false);
  assert.equal(noindex.success, true);
});

test('legacy second-opinion guide is noindex and contains coordination-only guidance', async () => {
  const content = await readFile(secondOpinionPath, 'utf8');
  const unsafePatterns = [
    /setelah 2 minggu/i,
    /kemoterapi bisa berbeda/i,
    /non-invasive/i,
    /pengencer darah/i,
    /Dokter A \(Indonesia\)/i,
    /Tim medis Ocha/i,
    /preliminary assessment/i,
    /api\.whatsapp\.com/i,
  ];

  assert.match(content, /robots:\s*"noindex,follow"/);
  assert.match(content, /Ocha tidak menilai rekam medis, memberikan diagnosis, atau memberi saran medis/i);
  assert.match(content, /\/doctors\//);
  for (const pattern of unsafePatterns) assert.doesNotMatch(content, pattern);
});

test('bypass FAQs drive both visible answers and FAQPage schema', async () => {
  const [content, renderer] = await Promise.all([
    readFile(bypassPath, 'utf8'),
    readFile(rendererPath, 'utf8'),
  ]);

  assert.match(content, /faq:\s*\n(?:.|\n)*question:/);
  assert.equal(renderer.match(/entry\.data\.faq\.map/g)?.length, 2);
  assert.match(renderer, /'@type': 'FAQPage'/);
  assert.match(renderer, /`\$\{canonical\}#faq`/);
  assert.match(renderer, /schemas=\{\[articleSchema, breadcrumbSchema, faqPageSchema\]\.filter\(Boolean\)\}/);
});

test('specialist booking guide is source-backed, indexable, and limited to coordination', async () => {
  const content = await readFile(bookingGuidePath, 'utf8');

  assert.match(content, /robots:\s*"index,follow"/);
  assert.match(content, /https:\/\/merits\.mmc\.gov\.my\/search\/registeredDoctor/);
  assert.match(content, /https:\/\/mmc\.gov\.my\/wp-content\/uploads\/2023\/06\/NSR_ProceduresGuidelines\.pdf/);
  assert.match(content, /Ocha tidak memberikan diagnosis, menentukan perawatan, atau menilai rekam medis/i);
  assert.match(content, /\]\(\/doctors\/\)/);
  assert.doesNotMatch(content, /AI-powered|airport transfer|akomodasi|Guarantee Letter/i);
});

test('stent cost guide is source-backed, indexable, and does not promise a price or treatment', async () => {
  const content = await readFile(stentCostPath, 'utf8');

  assert.match(content, /robots:\s*"index,follow"/);
  assert.match(content, /image:\s*"\/images\/blog\/biaya-pasang-ring-jantung-di-malaysia\.jpg"/);
  assert.match(content, /https:\/\/www\.nhs\.uk\/tests-and-treatments\/coronary-angioplasty\//);
  assert.match(content, /https:\/\/www\.ijn\.com\.my\/ijn-media\/mengenal-ijn-malaysia-salah-satu-pusat-kesehatan-kardiovaskular-dan-toraks-terbaik\//);
  assert.match(content, /Ocha tidak memberikan diagnosis, menentukan perawatan, atau menjamin biaya/i);
  assert.match(content, /\]\(\/blog\/biaya-operasi-bypass-jantung-di-malaysia\/\)/);
  assert.match(content, /\]\(\/doctors\/\)/);
  assert.doesNotMatch(content, /AI-powered|airport transfer|akomodasi|Guarantee Letter/i);
});

test('approved Indonesia patient lead guides are indexable and coordination-only', async () => {
  const drafts = await Promise.all([
    readFile(cancerCostPath, 'utf8'),
    readFile(kneeCostPath, 'utf8'),
  ]);

  for (const content of drafts) {
    assert.match(content, /robots:\s*"index,follow"/);
    assert.match(content, /sources:\s*\n(?:.|\n)*https:\/\//);
    assert.match(content, /faq:\s*\n(?:.|\n)*question:/);
    assert.match(content, /Ocha tidak memberikan diagnosis, menentukan perawatan, atau menjamin biaya/i);
    assert.match(content, /\]\(\/doctors\/\)/);
    assert.doesNotMatch(content, /AI-powered|airport transfer|akomodasi|Guarantee Letter/i);
  }
});

test('Indonesia patient lead drafts block unsupported price, treatment, and service claims', async () => {
  const drafts = await Promise.all([
    readFile(cancerCostPath, 'utf8'),
    readFile(kneeCostPath, 'utf8'),
  ]);
  const unsupportedClaims = [
    /(?:RM|MYR|IDR|Rp\.?|USD)\s*\d/i,
    /harga mulai dari|harga termurah|biaya pasti/i,
    /Anda perlu menjalani|Anda harus menjalani|cocok untuk Anda/i,
    /AI-powered|airport transfer|akomodasi|Guarantee Letter|hasil pengobatan/i,
  ];

  for (const content of drafts) {
    assert.match(content, /Ocha hanya membantu koordinasi/i);
    assert.match(content, /Ocha tidak menilai rekam medis/i);
    assert.match(content, /Ocha tidak mewakili seluruh pasar rumah sakit di Malaysia/i);
    for (const pattern of unsupportedClaims) assert.doesNotMatch(content, pattern);
  }
});

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
