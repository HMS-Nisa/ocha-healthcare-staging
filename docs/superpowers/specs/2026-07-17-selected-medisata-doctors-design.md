# Selected Medisata Doctors Import

## Goal

Add seven new, directly advertised Medisata doctors to Ocha's public directory. Keep the existing Dr. Lee Chun Lin record unchanged.

## Scope

- Verify official public profile details for Dr. Kan Choon Hong, Dr. Yoong Meow Foong, Dr. Ng Khai Oon, Dr. Lee Hock Keong, Dr. Victor Ooi Keat Jin, Prof. Dato' Dr. Oh Kim Soon, and Dr. Kelvin Lim Liang Hooi.
- Store only directory fields already supported by `public.doctors`: stable id, name, Indonesian specialty label, hospital, Penang location, optional image/bio, and official source URL.
- Publish the seven records immediately, rebuild, and deploy Ocha.

## Decisions

- Google Ads Transparency is selection evidence only. Official public hospital profiles are factual sources.
- Two Google-ad names differ from official profiles: `Ng Khai Choon` maps to Dr. Ng Khai Oon, and `Ooi Kim Soon` maps to Prof. Dato' Dr. Oh Kim Soon.
- No schema, route, or component changes. Directory already reads `public.doctors` during build.
- Use one idempotent database upsert. Re-running it updates only these seven ids.
- Omit uncertain fields rather than infer them. Existing directory placeholder covers missing images.

## Verification

- Query all eight selected ids and confirm exactly seven new records plus existing `lee-chun-lin`.
- Run existing doctor and full test suites, then production build with public Supabase variables.
- Deploy production build and check `/doctors/` plus one newly added doctor URL.
