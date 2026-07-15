import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { filterEntries, filterSitemapXml } from '../scripts/filter-sitemap.mjs';

test('keeps canonical indexable pages only', () => {
  const entries = [
    { url: 'https://ocha.health/', html: '<meta name="robots" content="index,follow"><link rel="canonical" href="https://ocha.health/">' },
    { url: 'https://ocha.health/doctor/thin/', html: '<meta name="robots" content="noindex,follow"><link rel="canonical" href="https://ocha.health/doctor/thin/">' },
    { url: 'https://ocha.health/old/', html: '<meta name="robots" content="index,follow"><link rel="canonical" href="https://ocha.health/new/">' },
  ];
  assert.deepEqual(filterEntries(entries).map((entry) => entry.url), ['https://ocha.health/']);
});

test('filters sitemap XML against generated HTML and fails closed for missing output', async () => {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'ocha-sitemap-'));
  await fs.mkdir(path.join(dist, 'kept'), { recursive: true });
  await fs.mkdir(path.join(dist, 'hidden'), { recursive: true });
  await fs.writeFile(path.join(dist, 'kept', 'index.html'), '<meta content="index,follow" name="robots"><link href="https://ocha.health/kept/" rel="canonical">');
  await fs.writeFile(path.join(dist, 'hidden', 'index.html'), '<meta name="robots" content="noindex,follow"><link rel="canonical" href="https://ocha.health/hidden/">');
  const xml = '<?xml version="1.0"?><urlset><url><loc>https://ocha.health/kept/</loc></url><url><loc>https://ocha.health/hidden/</loc></url><url><loc>https://ocha.health/missing/</loc></url></urlset>';

  const filtered = await filterSitemapXml(xml, dist);

  assert.match(filtered, /https:\/\/ocha\.health\/kept\//);
  assert.doesNotMatch(filtered, /hidden|missing/);
  await fs.rm(dist, { recursive: true });
});
