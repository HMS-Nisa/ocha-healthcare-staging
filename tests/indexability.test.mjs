import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countWords,
  hasRequiredDoctorFields,
  isDoctorIndexable,
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
