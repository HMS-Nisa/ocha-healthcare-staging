import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { blogEntrySchema } from '../src/lib/blog-schema.js';

const secondOpinionPath = new URL('../src/content/blog/panduan-second-opinion.md', import.meta.url);
const bypassPath = new URL('../src/content/blog/biaya-operasi-bypass-jantung-di-malaysia.md', import.meta.url);
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
