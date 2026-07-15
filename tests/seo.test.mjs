import test from 'node:test';
import assert from 'node:assert/strict';
import {
  absoluteUrl,
  normalizePath,
  buildDoctorPageTitle,
  buildOrganizationSchema,
  buildSeoTitle,
  normalizeDoctorSpecialtyLabel,
} from '../src/lib/seo.js';

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

test('normalizes doctor specialty labels without changing the specialty fact', () => {
  assert.equal(normalizeDoctorSpecialtyLabel('Dokter Spesialis Ortopedi (tulang)'), 'Ortopedi (tulang)');
  assert.equal(normalizeDoctorSpecialtyLabel('Dokter Kardiologi'), 'Kardiologi');
  assert.equal(normalizeDoctorSpecialtyLabel('Kardiologi'), 'Kardiologi');
});

test('constructs doctor title with one role prefix and one Ocha brand suffix', () => {
  const pageTitle = buildDoctorPageTitle({
    name: 'Dr. Abd Razak Muhamad',
    specialty: 'Dokter Spesialis Ortopedi (tulang)',
    hospital: 'Rumah Sakit Mitra',
  });

  assert.equal(
    pageTitle,
    'Dr. Abd Razak Muhamad - Dokter Spesialis Ortopedi (tulang) di Rumah Sakit Mitra',
  );
  assert.equal(
    buildSeoTitle(pageTitle),
    'Dr. Abd Razak Muhamad - Dokter Spesialis Ortopedi (tulang) di Rumah Sakit Mitra | Ocha Healthcare',
  );
  assert.equal(buildSeoTitle('Tentang Ocha | Ocha Healthcare'), 'Tentang Ocha | Ocha Healthcare');
});
