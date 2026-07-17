import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const medicalHubsPath = new URL('../src/components/MedicalHubs.jsx', import.meta.url);

test('defers non-primary medical hub images without delaying the Kuala Lumpur feature image', async () => {
  const source = await readFile(medicalHubsPath, 'utf8');

  const featureImage = source.match(/src=\{hubs\[0\]\.image\}([\s\S]*?)\/>/);
  const secondaryImage = source.match(/src=\{hub\.image\}([\s\S]*?)\/>/);

  assert.ok(featureImage, 'expected Kuala Lumpur feature image');
  assert.ok(secondaryImage, 'expected secondary hub image');
  assert.doesNotMatch(featureImage[1], /loading="lazy"/);
  assert.match(secondaryImage[1], /loading="lazy"/);
  assert.match(secondaryImage[1], /decoding="async"/);
});
