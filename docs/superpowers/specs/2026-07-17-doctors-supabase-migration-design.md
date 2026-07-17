# Doctors Supabase Migration Design

## Goal

Move the 68 current doctor records from the Google Sheets Apps Script feed into the existing Ocha Supabase project. All live doctor routes must read Supabase after deployment. No admin interface is included in this phase.

## Scope

Included:

- a `public.doctors` table in Supabase project `rmvwevepwrmcotmaovyy`;
- one-time import of all 68 active feed records;
- shared Supabase read helper for the doctor directory, doctor profiles, and specialty-location pages;
- removal of Google Sheet and Apps Script reads from server and browser code;
- tests, SEO build checks, and Supabase security review.

Excluded:

- custom staff administration;
- Supabase Storage migration for existing doctor images;
- bookings, patient records, authentication, or medical data;
- changes to public doctor IDs, canonical URLs, sitemap eligibility, or booking flow.

## Current Data Contract

The current feed contains 68 records. The imported fields are:

| Feed field | Supabase column | Type |
|---|---|---|
| `id` | `id` | text primary key |
| `name` | `name` | text |
| `specialty` | `specialty` | text |
| `subspecialty` | `subspecialty` | text nullable |
| `hospital` | `hospital` | text |
| `location` | `location` | text |
| `languages` | `languages` | text nullable |
| `image` | `image_url` | text nullable |
| `bio` | `bio` | text nullable |
| `schedule` | `schedule` | jsonb |
| `url` | `source_url` | text nullable |
| derived | `published` | boolean, initially true |

The unnamed Sheet completion marker is not imported. Existing `id` values stay unchanged. They continue to power `/doctor/<id>/` and specialty page ItemList links.

## Data Access and Security

`public.doctors` contains public professional profile information only. It does not contain patient data, medical records, consultation notes, contact details, or booking data.

Row Level Security is enabled. The anonymous role may select only rows with `published = true`. No anonymous insert, update, or delete policy exists. The website uses Supabase's URL and publishable key, both configured as deployment environment variables. Secrets and privileged keys never enter the client bundle or repository.

## Website Data Flow

```text
Supabase public.doctors
        ↓
src/lib/doctors.js shared reader and normalizer
        ↓
/doctors/  /doctor/[id]/  /dokter/[slug]/
        ↓
Directory receives build-time doctor records only
```

The shared reader returns the same record shape that current pages expect. Existing indexability and specialty-location rules remain unchanged. `Directory.jsx` keeps its client-side filter and booking behavior, but its Google Sheet fallback is removed. A missing build-time data result fails the build rather than serving stale or empty doctor content.

## Migration Sequence

1. Create the table, indexes, RLS policy, and update timestamp trigger through a versioned Supabase migration.
2. Fetch the current Apps Script JSON feed once, validate unique IDs and required fields, then upsert the 68 normalized records by `id`.
3. Verify Supabase count equals 68 and IDs exactly match the snapshot.
4. Add the shared Supabase reader and change all three routes to use it.
5. Delete `GOOGLE_SHEET_URL` and all Sheet fetch and cache-buster code.
6. Configure only the Supabase URL and publishable key in Netlify.
7. Run unit tests, production build, sitemap audit, and Supabase security and performance advisors.
8. Deploy. Roll back through the prior Git commit if route generation or data parity fails. The Sheet remains available as a read-only source reference during rollout.

## Acceptance Criteria

- `public.doctors` holds 68 records with the same IDs as the migration snapshot.
- `/doctors/`, every `/doctor/<id>/`, and every `/dokter/<slug>/` build from Supabase only.
- No deployed source code references the Google Apps Script or Sheets URL.
- Existing indexability rules still gate thin doctor and specialty pages.
- Public reads return only published doctors. Anonymous writes fail.
- The existing SEO audit passes and sitemap URL count remains stable unless data eligibility itself differs.
- No secrets, patient data, or free-text medical data are added to source control or analytics.
