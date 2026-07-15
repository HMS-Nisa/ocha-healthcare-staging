import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const secondOpinionPath = new URL('../src/content/blog/panduan-second-opinion.md', import.meta.url);
const bypassPath = new URL('../src/content/blog/biaya-operasi-bypass-jantung-di-malaysia.md', import.meta.url);
const rendererPath = new URL('../src/pages/blog/[...slug].astro', import.meta.url);

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
