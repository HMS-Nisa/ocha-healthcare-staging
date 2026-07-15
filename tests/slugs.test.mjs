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
  assert.equal(isSpecialtyLocationIndexable([{ indexable: true }]), false);
  assert.equal(isSpecialtyLocationIndexable([
    { indexable: true },
    { indexable: true },
  ]), true);
  assert.equal(isSpecialtyLocationIndexable([
    { indexable: true },
    { indexable: false },
  ]), false);
});
