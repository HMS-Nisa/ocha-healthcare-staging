# Doctors Supabase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the 68 public doctor profiles from the current Google Apps Script feed into Supabase and build every doctor route from Supabase only.

**Architecture:** A versioned SQL migration creates a public, read-only `doctors` catalogue with RLS. A one-time, locally run import script validates and upserts the current feed using privileged credentials that never reach source control. A shared server-side reader maps Supabase rows back to the existing page record shape, so the directory, profile pages, and specialty-location pages retain their URLs, rendering, and SEO rules.

**Tech Stack:** Astro 5 static-site generation, React 19, Supabase Postgres Data API, Node.js built-in test runner, Netlify environment variables.

## Global Constraints

- Keep all 68 existing doctor IDs unchanged. They remain canonical at `/doctor/<id>/`.
- Ocha coordinates appointments in its verified partner network. Do not add medical advice, AI, transfer, accommodation, pricing, availability, or outcome claims.
- `public.doctors` may store only public professional profile data. Never store patient data, health records, free-text enquiries, or analytics payloads.
- Enable RLS. Anon/authenticated users may read only `published = true`; they receive no insert, update, or delete permission.
- Use `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` only for static build reads. Never commit or expose a secret/service-role key.
- Remove all deployed Google Sheet and Apps Script reads, cache-busters, and browser fallbacks.
- Preserve existing indexability, canonical, structured-data, sitemap, calendar, and WhatsApp booking behavior.
- Use `apply_patch` for repository changes. Work in `/Users/hmskhairulazri/Documents/Projects/Ocha/ocha-healthcare-staging`.

---

## File Structure

- Create: `supabase/migrations/202607170001_create_doctors.sql` — table, indexes, timestamp trigger, grants, and RLS policy.
- Create: `scripts/import-doctors-to-supabase.mjs` — explicit one-time feed snapshot, validation, parity check, and upsert command.
- Create: `src/lib/doctors.js` — Supabase REST reader and row-to-existing-page-shape normalizer.
- Create: `tests/doctors.test.mjs` — normalizer, configuration failure, request, and published-only filter tests.
- Modify: `.gitignore` — ignore local Supabase import credentials.
- Modify: `src/config.js` — remove `GOOGLE_SHEET_URL`; retain WhatsApp and site constants.
- Modify: `src/components/Directory.jsx` — use only build-time records and remove the Apps Script client fallback.
- Modify: `src/pages/doctors.astro` — obtain records through `getPublishedDoctors()`.
- Modify: `src/pages/doctor/[id].astro` — generate profile routes from `getPublishedDoctors()`.
- Modify: `src/pages/dokter/[slug].astro` — generate specialty-location routes from `getPublishedDoctors()`.
- Modify: `tests/indexability.test.mjs` — assert provider sources no longer contain the Google feed configuration.
- Modify: `README.md` — document required public deployment variables and one-time importer invocation without recording values.

## Task 1: Add the secure Supabase catalogue schema

**Files:**
- Create: `supabase/migrations/202607170001_create_doctors.sql`

**Interfaces:**
- Produces: `public.doctors(id text primary key, name text, specialty text, subspecialty text, hospital text, location text, languages text, image_url text, bio text, schedule jsonb, source_url text, published boolean, created_at timestamptz, updated_at timestamptz)`.
- Produces: anonymous Data API `SELECT` access only when `published = true`.
- Consumed by: Tasks 2, 3, and 6.

- [ ] **Step 1: Write the schema migration**

Create `supabase/migrations/202607170001_create_doctors.sql` with this SQL. Do not add a write policy.

```sql
create table public.doctors (
  id text primary key check (btrim(id) <> ''),
  name text not null check (btrim(name) <> ''),
  specialty text not null check (btrim(specialty) <> ''),
  subspecialty text,
  hospital text not null check (btrim(hospital) <> ''),
  location text not null check (btrim(location) <> ''),
  languages text,
  image_url text,
  bio text,
  schedule jsonb not null default '[]'::jsonb check (jsonb_typeof(schedule) = 'array'),
  source_url text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index doctors_published_specialty_location_idx
  on public.doctors (specialty, location)
  where published = true;

create or replace function public.set_doctors_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger doctors_set_updated_at
before update on public.doctors
for each row execute function public.set_doctors_updated_at();

alter table public.doctors enable row level security;
grant select on public.doctors to anon, authenticated;

create policy "Published doctors are publicly readable"
on public.doctors
for select
to anon, authenticated
using (published = true);
```

- [ ] **Step 2: Apply migration through the connected Supabase project**

Use the Supabase migration capability, with project ref `rmvwevepwrmcotmaovyy`, to apply exactly the SQL above. Expected result: migration succeeds and `public.doctors` exists with RLS enabled.

- [ ] **Step 3: Verify the empty secured table**

Run this in Supabase SQL editor or the connected SQL capability:

```sql
select count(*) as doctor_count from public.doctors;
select relrowsecurity
from pg_class
where oid = 'public.doctors'::regclass;
```

Expected: `doctor_count = 0` and `relrowsecurity = true`.

- [ ] **Step 4: Commit the schema**

```bash
git add supabase/migrations/202607170001_create_doctors.sql
git commit -m "feat: add secure doctors catalogue schema"
```

## Task 2: Add pure doctor data normalization and reader tests

**Files:**
- Create: `src/lib/doctors.js`
- Create: `tests/doctors.test.mjs`

**Interfaces:**
- Consumes: Data API rows from `public.doctors` created in Task 1.
- Produces: `normalizeDoctorRow(row)` returning `{ id, name, specialty, subspecialty, hospital, location, languages, image, bio, schedule, url }`.
- Produces: `getPublishedDoctors({ fetchImpl, env })` returning normalized, ID-sorted records or throwing a descriptive configuration/API error.
- Consumed by: Tasks 4, 5, and 6.

- [ ] **Step 1: Write failing normalizer and reader tests**

Create `tests/doctors.test.mjs` with these tests. Keep network calls mocked.

```js
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
```

- [ ] **Step 2: Run the new tests and verify failure**

Run: `node --test tests/doctors.test.mjs`  
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/doctors.js`.

- [ ] **Step 3: Implement the shared reader**

Create `src/lib/doctors.js` with this implementation. Query only public fields. Do not return `published` or timestamps to the browser.

```js
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
```

- [ ] **Step 4: Run focused and full tests**

Run: `node --test tests/doctors.test.mjs && npm test`  
Expected: all focused tests PASS, then all existing tests PASS.

- [ ] **Step 5: Commit the reader**

```bash
git add src/lib/doctors.js tests/doctors.test.mjs
git commit -m "feat: read published doctors from Supabase"
```

## Task 3: Import and verify the 68-record snapshot

**Files:**
- Create: `scripts/import-doctors-to-supabase.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `DOCTOR_SOURCE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` from local process environment only.
- Consumes: original Apps Script JSON data as a one-time source.
- Produces: upserted `public.doctors` rows with exact original IDs; exits nonzero unless source and Supabase each contain 68 unique IDs.
- Consumed by: Task 6 build parity checks.

- [ ] **Step 1: Write the importer with hard validation before writes**

Create `scripts/import-doctors-to-supabase.mjs`. It must implement these exact rules:

```js
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
```

Complete the script by POSTing `rows` to `${SUPABASE_URL}/rest/v1/doctors?on_conflict=id` with headers `apikey`, `Authorization: Bearer <service-role-key>`, `Content-Type: application/json`, and `Prefer: resolution=merge-duplicates,return=representation`. Require a successful response with exactly 68 returned rows. Then GET `select=id&order=id.asc`, verify its returned IDs exactly equal sorted source IDs, and print only `Imported and verified 68 doctor records.`. It must never print keys or full profile data.

- [ ] **Step 2: Keep local import credentials untracked**

Append these lines to `.gitignore`:

```gitignore
# local Supabase doctor import credentials
.env.doctors-import
```

Do not create or commit `.env.doctors-import`.

- [ ] **Step 3: Run the import once with local-only variables**

Obtain the current Apps Script URL from the existing source before it is removed, then run this command locally after setting the three values in the shell environment:

```bash
node scripts/import-doctors-to-supabase.mjs
```

Expected output: `Imported and verified 68 doctor records.`. Do not put the source URL, service role key, or doctor snapshot JSON in Git.

- [ ] **Step 4: Independently verify record and ID parity in Supabase**

Run:

```sql
select count(*) as doctor_count,
       count(*) filter (where published) as published_count,
       count(distinct lower(id)) as unique_normalized_ids
from public.doctors;
```

Expected: all three values equal `68`.

- [ ] **Step 5: Commit the reproducible importer**

```bash
git add scripts/import-doctors-to-supabase.mjs .gitignore
git commit -m "chore: add verified doctor import script"
```

## Task 4: Switch every static route to Supabase data

**Files:**
- Modify: `src/pages/doctors.astro:2-23`
- Modify: `src/pages/doctor/[id].astro:9-50`
- Modify: `src/pages/dokter/[slug].astro:4-57`

**Interfaces:**
- Consumes: `getPublishedDoctors()` from Task 2.
- Produces: unchanged `allDoctors`, `doctor`, and specialty-page `doctors` props used by existing templates.
- Preserves: `validatedDoctorRecords`, `isDoctorIndexable`, `/doctor/<id>/` IDs, page schema, and sitemap eligibility.

- [ ] **Step 1: Write source-level regression test first**

Add this test to `tests/indexability.test.mjs`:

```js
test('provider routes use the shared Supabase reader and contain no Google Apps Script URL', () => {
  const providerSources = [
    '../src/pages/doctors.astro', '../src/pages/doctor/[id].astro', '../src/pages/dokter/[slug].astro',
  ].map(path => readFileSync(new URL(path, import.meta.url), 'utf8'));
  for (const source of providerSources) {
    assert.match(source, /getPublishedDoctors/);
    assert.doesNotMatch(source, /GOOGLE_SHEET_URL|script\.google\.com/);
  }
});
```

- [ ] **Step 2: Run the regression test and verify it fails**

Run: `node --test tests/indexability.test.mjs`  
Expected: FAIL because route sources still reference `GOOGLE_SHEET_URL`.

- [ ] **Step 3: Replace `/doctors/` feed fetch**

In `src/pages/doctors.astro`, replace the config import and `try/catch` Google fetch block with:

```js
import { getPublishedDoctors } from '../lib/doctors.js';

let allDoctors = [];
try {
  allDoctors = validatedDoctorRecords(await getPublishedDoctors());
  console.log(`Fetched ${allDoctors.length} published doctors from Supabase`);
} catch (error) {
  throw new Error(`Doctor data fetch failed: ${error instanceof Error ? error.message : String(error)}`);
}
```

Leave its schema, canonical, `eligibleDoctors`, and `Directory` props unchanged.

- [ ] **Step 4: Replace `/doctor/[id]/` static-path feed fetch**

In `src/pages/doctor/[id].astro`, replace `GOOGLE_SHEET_URL` import with `WA_NUMBER` plus `getPublishedDoctors` from `../../lib/doctors.js`. Replace the `fetch` block in `getStaticPaths()` with:

```js
const deduplicatedDoctors = validatedDoctorRecords(await getPublishedDoctors());
```

Keep related-doctor selection and all returned `params` / `props` exactly as they are. Retain the error wrapper so a missing Supabase build variable fails deployment visibly.

- [ ] **Step 5: Replace `/dokter/[slug]/` static-path feed fetch**

In `src/pages/dokter/[slug].astro`, replace `GOOGLE_SHEET_URL` import with `getPublishedDoctors` from `../../lib/doctors.js`. Replace its response/data validation block with:

```js
const doctors = validatedDoctorRecords(await getPublishedDoctors(), ['id', 'name', 'specialty', 'location'])
  .map((doctor) => ({
    ...doctor,
    city: locationName(doctor.location),
    indexable: isDoctorIndexable(doctor),
  }));
```

Leave translations, specialty slug derivation, page copy, schema, and noindex rules untouched.

- [ ] **Step 6: Run route and full unit tests**

Run: `node --test tests/indexability.test.mjs && npm test`  
Expected: all tests PASS.

- [ ] **Step 7: Commit the route migration**

```bash
git add src/pages/doctors.astro 'src/pages/doctor/[id].astro' 'src/pages/dokter/[slug].astro' tests/indexability.test.mjs
git commit -m "feat: build doctor routes from Supabase"
```

## Task 5: Remove the browser fallback and Google configuration

**Files:**
- Modify: `src/components/Directory.jsx:1-108`
- Modify: `src/config.js:1-4`

**Interfaces:**
- Consumes: nonempty, build-time `preloadedDoctors` from Task 4.
- Produces: the current client-side search, filters, pagination, profile links, calendar, and WhatsApp calls-to-action.

- [ ] **Step 1: Write the failing no-fallback source test**

Add this test to `tests/indexability.test.mjs`:

```js
test('directory has no runtime doctor data fallback', () => {
  const directory = readFileSync(new URL('../src/components/Directory.jsx', import.meta.url), 'utf8');
  const config = readFileSync(new URL('../src/config.js', import.meta.url), 'utf8');
  assert.doesNotMatch(directory, /GOOGLE_SHEET_URL|script\.google\.com|fetch\(urlWithCacheBuster/);
  assert.doesNotMatch(config, /GOOGLE_SHEET_URL|script\.google\.com/);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test tests/indexability.test.mjs`  
Expected: FAIL because `Directory.jsx` and `config.js` still contain `GOOGLE_SHEET_URL`.

- [ ] **Step 3: Simplify `Directory.jsx` to build-time data only**

Make these exact structural changes:

```js
import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Filter, Building2, ChevronDown } from 'lucide-react';
import { WA_NUMBER } from '../config';
```

Replace the two initial states with:

```js
const [doctors] = useState(() => processDoctors(preloadedDoctors));
```

Delete `loading`, `error`, the `filterOptions` state, the `useEffect` that updates options, the complete `// 2. FALLBACK FETCH` effect, and the loading/error render branches. Replace all dropdown option references with `initialOptions.locations`, `initialOptions.specialties`, and `initialOptions.hospitals`. Do not alter `processDoctors`, filters, pagination, analytics fields, or WhatsApp URL construction.

- [ ] **Step 4: Remove Google configuration**

Delete the `GOOGLE_SHEET_URL` export and its comment from `src/config.js`. Keep `WA_NUMBER`, `SITE_URL`, `SITE_TITLE`, `SITE_DESCRIPTION`, `DEFAULT_SOCIAL_IMAGE`, and `DEFAULT_LOCALE` unchanged.

- [ ] **Step 5: Run full tests**

Run: `npm test`  
Expected: all tests PASS.

- [ ] **Step 6: Commit cleanup**

```bash
git add src/components/Directory.jsx src/config.js tests/indexability.test.mjs
git commit -m "refactor: remove Google Sheets doctor fallback"
```

## Task 6: Configure deployment, verify security, build, and deploy

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: populated Supabase rows from Task 3, shared reader from Task 2, and Netlify build variables.
- Produces: production static routes sourced from Supabase with no external Sheet dependency.

- [ ] **Step 1: Document public build variables without values**

Append this concise section to `README.md`:

```md
## Doctor directory data

The static doctor directory builds from Supabase. Set these Netlify build environment variables for every deploy:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Both are public client-safe values protected by the `public.doctors` RLS policy. Do not set `SUPABASE_SERVICE_ROLE_KEY` in Netlify or commit it to the repository. Run `node scripts/import-doctors-to-supabase.mjs` only from a local shell with its three required local environment variables.
```

- [ ] **Step 2: Configure Netlify build environment**

Set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the Ocha Netlify site's build environment, using values from connected Supabase project `rmvwevepwrmcotmaovyy`. Do not set the service-role key. Trigger no deployment until the remaining checks pass.

- [ ] **Step 3: Verify public read and rejected anonymous write**

Using the Supabase project URL and publishable key, execute a GET to `/rest/v1/doctors?select=id&published=eq.true` and verify 68 returned IDs. Then attempt an anonymous POST of a harmless synthetic record and verify it is rejected with HTTP 401 or 403. Delete nothing and do not use a privileged key for this check.

- [ ] **Step 4: Review Supabase advisors**

Run Supabase database and security advisors. Expected: no RLS-disabled finding, no public write policy, and no error-level finding for `public.doctors`. Fix any adviser finding caused by this migration before continuing.

- [ ] **Step 5: Run verified production build**

Run: `npm run build`  
Expected: Astro completes static generation, `scripts/filter-sitemap.mjs` completes, and `scripts/seo-audit.mjs` reports no failing URL. If `Doctor data configuration missing` appears, stop and correct Netlify/local public variables rather than reintroducing a Sheets fallback.

- [ ] **Step 6: Compare generated doctor URLs and sitemap eligibility**

Run:

```bash
find dist/doctor -mindepth 2 -maxdepth 2 -name index.html | wc -l
find dist/dokter -mindepth 2 -maxdepth 2 -name index.html | wc -l
rg -n 'script\.google\.com|GOOGLE_SHEET_URL' src scripts dist
```

Expected: profile count equals the number of published doctor rows (68); specialty route count matches the pre-migration build; final command returns no matches.

- [ ] **Step 7: Commit documentation and push for deployment**

```bash
git add README.md
git commit -m "docs: document Supabase doctor directory configuration"
git push origin HEAD
```

- [ ] **Step 8: Verify production after Netlify deploy**

Use the built-in browser to load `https://ocha.health/doctors/`, one existing `/doctor/<id>/` route, and one existing `/dokter/<slug>/` route. Confirm HTTP success, correct canonical URL, visible doctor content, working directory filters, and unchanged calendar-to-WhatsApp flow. Then run the production SEO audit against the deployed URLs.

## Plan Self-Review

- **Spec coverage:** Task 1 covers table, RLS, no anonymous writes, indexes, and timestamps. Task 3 imports and verifies exactly 68 unchanged IDs. Tasks 2, 4, and 5 replace the three server route feeds plus browser fallback while retaining current record shape and SEO eligibility. Task 6 configures safe variables, validates anonymous access, advisors, production build, sitemap parity, and deployment.
- **Placeholder scan:** every implementation step includes paths, commands, expected outcomes, and concrete code where code changes are required. Environment values intentionally remain outside the repository because they are deployment credentials.
- **Type consistency:** `normalizeDoctorRow()` outputs `image` and `url`, matching current templates. `getPublishedDoctors()` is the sole route reader. All routes pass normalized records through existing `validatedDoctorRecords()` before rendering.
