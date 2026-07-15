import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSpecialtyLocationIndexable,
  slugifySegment,
  specialtyLocationSlug,
} from '../src/lib/slugs.js';

test('collapses punctuation and repeated separators', () => {
  assert.equal(slugifySegment('Tulang / Orthopedi -- Penang'), 'tulang-orthopedi-penang');
  assert.equal(specialtyLocationSlug('tulang-orthopedi', 'Penang'), 'tulang-orthopedi-penang');
});

test('normalizes accents and ampersands deterministically', () => {
  assert.equal(slugifySegment('Kardiologi & Jantung — Mélaka'), 'kardiologi-dan-jantung-melaka');
  assert.equal(slugifySegment(''), '');
});

test('requires two indexable providers', () => {
  assert.equal(isSpecialtyLocationIndexable([{ id: 'dr-a', indexable: true }]), false);
  assert.equal(isSpecialtyLocationIndexable([
    { id: 'dr-a', indexable: true },
    { id: 'dr-b', indexable: true },
  ]), true);
  assert.equal(isSpecialtyLocationIndexable([
    { id: 'dr-a', indexable: true },
    { id: 'dr-b', indexable: false },
  ]), false);
});
