import test from 'node:test';
import assert from 'node:assert/strict';
import { absoluteUrl, normalizePath, buildOrganizationSchema } from '../src/lib/seo.js';

test('normalizes canonical paths', () => {
  assert.equal(normalizePath('/Doctors'), '/doctors/');
  assert.equal(normalizePath('dokter/jantung--penang'), '/dokter/jantung-penang/');
  assert.equal(normalizePath('/'), '/');
});

test('builds absolute production URLs', () => {
  assert.equal(absoluteUrl('/doctors'), 'https://ocha.health/doctors/');
});

test('describes Ocha as a non-clinical organization', () => {
  const schema = buildOrganizationSchema();
  assert.equal(schema['@type'], 'Organization');
  assert.equal(schema['@id'], 'https://ocha.health/#organization');
  assert.equal(schema.name, 'Ocha Healthcare');
  assert.equal(schema.url, 'https://ocha.health/');
  assert.equal('medicalSpecialty' in schema, false);
});
