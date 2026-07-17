# Medisata Profile Enrichment Design

## Goal

Replace the generic fallback image and empty medical profile on the seven newly added Medisata-promoted doctors with source-backed directory fields.

## Scope

- Update only `image_url`, `bio`, and `languages` in the existing `public.doctors` records.
- Use each doctor's public Medisata profile for the image and concise profile facts.
- Preserve the verified hospital `source_url`, existing specialties, hospitals, locations, and empty schedules.
- Do not copy consultation prices, reviews, patient details, appointment schedules, or availability claims.

## Design

The existing directory already reads these fields from Supabase at build time, so no route, component, schema, or dependency change is needed. Each public Medisata profile image is stored as the record's remote `image_url`; its short factual description and language list become the profile fields.

The seven records are `kan-choon-hong`, `yoong-meow-foong`, `ng-khai-oon`, `lee-hock-keong`, `victor-ooi-keat-jin`, `oh-kim-soon-prof-dato-dr`, and `kelvin-lim-liang-hooi`.

## Verification

- Query the seven rows and confirm each has non-empty image, bio, and languages.
- Run the project tests and production build.
- Deploy the rebuilt static site, then check the seven live pages for a loaded profile image and non-empty profile text.
