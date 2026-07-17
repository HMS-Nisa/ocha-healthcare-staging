import test from 'node:test';
import assert from 'node:assert/strict';
import { getPublishedDoctors, normalizeDoctorRow } from '../src/lib/doctors.js';

const row = {
  id: 'dr-a', name: 'Dr A', specialty: 'Cardiology', subspecialty: null,
  hospital: 'Hospital A', location: 'Penang, Malaysia', languages: 'English',
  image_url: 'https://example.com/a.jpg', bio: 'Public profile',
  schedule: [{ day: 'Monday', time: '09:00' }], source_url: 'https://example.com/source',
};

test('normalizes a Supabase row to the existing doctor page shape', () => {
  assert.deepEqual(normalizeDoctorRow(row), {
    id: 'dr-a', name: 'Dr A', specialty: 'Cardiology', subspecialty: '',
    hospital: 'Hospital A', location: 'Penang, Malaysia', languages: 'English',
    image: 'https://example.com/a.jpg', bio: 'Public profile',
    schedule: [{ day: 'Monday', time: '09:00' }], url: 'https://example.com/source',
  });
});

test('fails before requesting data when public Supabase build variables are absent', async () => {
  await assert.rejects(
    getPublishedDoctors({ env: {}, fetchImpl: async () => { throw new Error('must not fetch'); } }),
    /PUBLIC_SUPABASE_URL.*PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
  );
});

test('requests published records only, normalizes them, and orders IDs', async () => {
  let request;
  const doctors = await getPublishedDoctors({
    env: { PUBLIC_SUPABASE_URL: 'https://project.supabase.co', PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key' },
    fetchImpl: async (url, options) => {
      request = { url: String(url), options };
      return new Response(JSON.stringify([{ ...row, id: 'dr-b' }, row]), { status: 200 });
    },
  });
  assert.match(request.url, /\/rest\/v1\/doctors\?/);
  assert.match(request.url, /published=eq.true/);
  assert.equal(request.options.headers.apikey, 'public-key');
  assert.deepEqual(doctors.map((doctor) => doctor.id), ['dr-a', 'dr-b']);
});
