const SELECT_COLUMNS = [
  'id', 'name', 'specialty', 'subspecialty', 'hospital', 'location',
  'languages', 'image_url', 'bio', 'schedule', 'source_url',
].join(',');

const asText = (value) => value == null ? '' : String(value).trim();

export function normalizeDoctorRow(row = {}) {
  return {
    id: asText(row.id), name: asText(row.name), specialty: asText(row.specialty),
    subspecialty: asText(row.subspecialty), hospital: asText(row.hospital),
    location: asText(row.location), languages: asText(row.languages),
    image: asText(row.image_url), bio: asText(row.bio),
    schedule: Array.isArray(row.schedule) ? row.schedule : [],
    url: asText(row.source_url),
  };
}

export async function getPublishedDoctors({ fetchImpl = fetch, env = import.meta.env } = {}) {
  const url = env.PUBLIC_SUPABASE_URL;
  const key = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('Doctor data configuration missing: PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY are required');
  }
  const endpoint = new URL('/rest/v1/doctors', url);
  endpoint.searchParams.set('select', SELECT_COLUMNS);
  endpoint.searchParams.set('published', 'eq.true');
  endpoint.searchParams.set('order', 'id.asc');
  const response = await fetchImpl(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Doctor data fetch failed: HTTP ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Doctor data fetch failed: expected an array');
  return rows.map(normalizeDoctorRow).sort((a, b) => a.id.localeCompare(b.id));
}
