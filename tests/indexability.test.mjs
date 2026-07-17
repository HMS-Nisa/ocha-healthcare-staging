import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertUniqueDoctorIds,
  countWords,
  hasRequiredDoctorFields,
  isDoctorIndexable,
  uniqueIndexableDoctorCount,
} from '../src/lib/indexability.js';

const base = {
  id: 'dr-a',
  name: 'Dr A',
  specialty: 'Cardiology',
  hospital: 'Hospital A',
  location: 'Penang, Malaysia',
};
const longBio = Array.from({ length: 80 }, () => 'kata').join(' ');

test('counts words after trimming repeated whitespace', () => {
  assert.equal(countWords('  satu   dua\ntiga  '), 3);
  assert.equal(countWords(''), 0);
});

test('requires complete identity fields and a supported Malaysia location', () => {
  assert.equal(hasRequiredDoctorFields(base), true);
  assert.equal(hasRequiredDoctorFields({ ...base, hospital: '' }), false);
  assert.equal(hasRequiredDoctorFields({ ...base, location: 'Jakarta, Indonesia' }), false);
});

test('indexes a complete doctor with an 80-word biography', () => {
  assert.equal(isDoctorIndexable({ ...base, bio: longBio }), true);
});

test('indexes a complete doctor with three verified differentiators', () => {
  assert.equal(isDoctorIndexable({
    ...base,
    subspecialty: 'Intervensi',
    languages: 'Bahasa Melayu, English',
    qualifications: 'MBBS, MRCP',
  }), true);
});

test('does not index a thin or incomplete doctor', () => {
  assert.equal(isDoctorIndexable(base), false);
  assert.equal(isDoctorIndexable({ ...base, hospital: '' }), false);
});

test('rejects every duplicate doctor ID after normalization before deduplication', () => {
  assert.throws(
    () => assertUniqueDoctorIds([{ id: ' Dr-A ' }, { id: 'dr-a' }, { id: 'DR-B' }, { id: ' dr-b ' }]),
    /dr-a.*dr-b/i,
  );
  assert.equal(assertUniqueDoctorIds([{ id: 'dr-a' }, { id: 'dr-b' }, { id: '' }]), true);
});

test('specialty eligibility counts unique indexable provider IDs only', () => {
  assert.equal(uniqueIndexableDoctorCount([
    { id: 'DR-A', indexable: true },
    { id: ' dr-a ', indexable: true },
    { id: 'dr-b', indexable: false },
  ]), 1);
  assert.equal(uniqueIndexableDoctorCount([
    { id: 'dr-a', indexable: true },
    { id: 'dr-b', indexable: true },
  ]), 2);
});

test('provider page sources contain no external placeholder service', () => {
  const providerSources = [
    '../src/components/Directory.jsx',
    '../src/pages/doctor/[id].astro',
    '../src/pages/dokter/[slug].astro',
  ].map(path => readFileSync(new URL(path, import.meta.url), 'utf8'));

  for (const source of providerSources) {
    assert.doesNotMatch(source, /placehold\.co/);
    assert.match(source, /\/assets\/doctor-placeholder\.png/);
  }
});

test('provider routes use the shared Supabase reader and contain no Google Apps Script URL', () => {
  const providerSources = [
    '../src/pages/doctors.astro', '../src/pages/doctor/[id].astro', '../src/pages/dokter/[slug].astro',
  ].map(path => readFileSync(new URL(path, import.meta.url), 'utf8'));
  for (const source of providerSources) {
    assert.match(source, /getPublishedDoctors/);
    assert.doesNotMatch(source, /GOOGLE_SHEET_URL|script\.google\.com/);
  }
});
