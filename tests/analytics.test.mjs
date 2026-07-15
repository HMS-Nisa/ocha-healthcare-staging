import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { normalizeDimension, sanitizeEvent, track } from '../src/lib/analytics.js';

test('retains only approved event fields', () => {
  assert.deepEqual(
    sanitizeEvent('click_whatsapp_booking', {
      page_type: 'doctor',
      specialty: 'cardiology',
      doctor_name: 'Dr A',
      message: 'private',
      phone: '6012',
    }),
    { event: 'click_whatsapp_booking', page_type: 'doctor', specialty: 'cardiology' },
  );
});

test('rejects unknown events', () => {
  assert.equal(sanitizeEvent('medical_answer', { diagnosis: 'x' }), null);
});

test('drops invalid and oversized approved parameter values', () => {
  assert.deepEqual(
    sanitizeEvent('view_doctor_profile', {
      page_type: 'doctor',
      specialty: 42,
      location: 'x'.repeat(81),
      cta_placement: null,
    }),
    { event: 'view_doctor_profile', page_type: 'doctor' },
  );
});

test('normalizes generic dimensions without retaining free text punctuation', () => {
  assert.equal(normalizeDimension('  Kuala Lumpur  '), 'kuala-lumpur');
  assert.equal(normalizeDimension('Kardiologi & Pembuluh Darah'), 'kardiologi-pembuluh-darah');
  assert.equal(normalizeDimension(null), '');
});

test('tracks sanitized payloads and rejects server-side or unknown events', () => {
  const originalWindow = globalThis.window;
  try {
    globalThis.window = { dataLayer: [] };
    assert.equal(track('click_whatsapp_concierge', {
      page_type: 'lead_guide',
      cta_placement: 'guide_primary',
      message: 'private',
    }), true);
    assert.deepEqual(globalThis.window.dataLayer, [{
      event: 'click_whatsapp_concierge',
      page_type: 'lead_guide',
      cta_placement: 'guide_primary',
    }]);
    assert.equal(track('medical_answer', { diagnosis: 'x' }), false);
    assert.equal(globalThis.window.dataLayer.length, 1);
    delete globalThis.window;
    assert.equal(track('view_doctor_directory'), false);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test('instruments booking funnel without sending selected values or patient content', async () => {
  const [booking, directory, guide] = await Promise.all([
    fs.readFile(new URL('../src/components/BookingWidget.jsx', import.meta.url), 'utf8'),
    fs.readFile(new URL('../src/components/Directory.jsx', import.meta.url), 'utf8'),
    fs.readFile(new URL('../src/pages/guide/[...slug].astro', import.meta.url), 'utf8'),
  ]);

  for (const eventName of [
    'view_doctor_profile',
    'select_booking_date',
    'select_booking_time',
    'click_whatsapp_booking',
  ]) {
    assert.match(booking, new RegExp(`track\\('${eventName}'`));
  }
  assert.match(directory, /track\('view_doctor_directory'/);
  assert.match(directory, /track\('click_whatsapp_booking'/);
  assert.match(guide, /track\('view_lead_guide'/);
  assert.match(guide, /track\('click_whatsapp_concierge'/);

  assert.match(booking, /Pilih waktu yang Anda inginkan/);
  assert.match(booking, /Kirim Permintaan via WhatsApp/);
  assert.doesNotMatch(booking, /track\([\s\S]{0,180}(?:doctorName|selDate|selTime|fallbackMsg|msg)/);
  assert.doesNotMatch(directory, /track\([\s\S]{0,180}(?:doctor\.name|waLink)/);
});
