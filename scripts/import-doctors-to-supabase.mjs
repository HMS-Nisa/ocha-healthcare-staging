const required = ['DOCTOR_SOURCE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const name of required) if (!process.env[name]) throw new Error(`${name} is required`);

const sourceResponse = await fetch(process.env.DOCTOR_SOURCE_URL, { cache: 'no-store' });
if (!sourceResponse.ok) throw new Error(`Source fetch failed: HTTP ${sourceResponse.status}`);
const source = await sourceResponse.json();
if (!Array.isArray(source)) throw new Error('Source data must be an array');

const asText = (value) => value == null ? null : String(value).trim() || null;
const rows = source.map((doctor) => ({
  id: asText(doctor.id), name: asText(doctor.name), specialty: asText(doctor.specialty),
  subspecialty: asText(doctor.subspecialty), hospital: asText(doctor.hospital),
  location: asText(doctor.location), languages: asText(doctor.languages),
  image_url: asText(doctor.image), bio: asText(doctor.bio),
  schedule: Array.isArray(doctor.schedule) ? doctor.schedule : [],
  source_url: asText(doctor.url), published: true,
}));
const ids = rows.map((row) => row.id);
if (rows.length !== 68 || ids.some((id) => !id) || new Set(ids.map((id) => id.toLowerCase())).size !== 68) {
  throw new Error(`Expected 68 unique nonempty IDs, got ${rows.length} rows and ${new Set(ids.map((id) => id?.toLowerCase())).size} unique IDs`);
}
for (const row of rows) {
  for (const field of ['id', 'name', 'specialty', 'hospital', 'location']) {
    if (!row[field]) throw new Error(`Doctor ${row.id || '(unknown)'} missing ${field}`);
  }
}

const baseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
const headers = {
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};
const upsertResponse = await fetch(`${baseUrl}/rest/v1/doctors?on_conflict=id`, {
  method: 'POST',
  headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
  body: JSON.stringify(rows),
});
if (!upsertResponse.ok) throw new Error(`Supabase upsert failed: HTTP ${upsertResponse.status}`);
const upserted = await upsertResponse.json();
if (!Array.isArray(upserted) || upserted.length !== 68) {
  throw new Error(`Supabase upsert must return 68 rows, got ${Array.isArray(upserted) ? upserted.length : 'a non-array response'}`);
}

const verifyResponse = await fetch(`${baseUrl}/rest/v1/doctors?select=id&order=id.asc`, { headers });
if (!verifyResponse.ok) throw new Error(`Supabase verification failed: HTTP ${verifyResponse.status}`);
const verifiedRows = await verifyResponse.json();
if (!Array.isArray(verifiedRows)) throw new Error('Supabase verification must return an array');
const verifiedIds = verifiedRows.map((row) => asText(row?.id));
const sourceIds = [...ids].sort();
if (verifiedIds.length !== 68 || verifiedIds.some((id) => !id) || new Set(verifiedIds.map((id) => id.toLowerCase())).size !== 68
  || verifiedIds.length !== sourceIds.length || verifiedIds.some((id, index) => id !== sourceIds[index])) {
  throw new Error('Supabase IDs do not exactly match the 68 source IDs');
}

console.log('Imported and verified 68 doctor records.');
