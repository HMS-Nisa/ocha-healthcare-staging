# Medisata Profile Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate seven new doctor directory records with sourced images and concise public profile details.

**Architecture:** Update existing Supabase fields only. Astro already reads these fields at build time, so rebuilding and deploying publishes the improvements without application changes.

**Tech Stack:** Supabase Postgres, Astro static build, Netlify.

## Global Constraints

- Use only public Medisata profile image, biography, and language information.
- Do not add consultation prices, schedules, reviews, medical outcomes, or availability claims.
- Preserve existing official hospital source URLs and all non-enrichment fields.
- Do not add dependencies or alter application code.

---

### Task 1: Enrich the seven Supabase doctor records

**Files:**
- Modify: `public.doctors` rows in Supabase only
- Documentation: `docs/superpowers/specs/2026-07-17-medisata-profile-enrichment-design.md`

**Interfaces:**
- Consumes: existing `public.doctors(id, image_url, bio, languages)` records
- Produces: non-empty `image_url`, `bio`, and `languages` for the seven selected ids

- [ ] **Step 1: Verify each direct Medisata profile and collect only permitted fields**

Use the public profile pages at `https://www.medisata.com/dokter/<profile-slug>` for the seven selected doctors. Capture the doctor image URL, short factual description, and languages. Exclude costs, schedules, review text, and patient information.

- [ ] **Step 2: Run one idempotent update statement**

Run an `UPDATE ... FROM (VALUES ...)` statement keyed by `id`, setting only `image_url`, `bio`, and `languages` for `kan-choon-hong`, `yoong-meow-foong`, `ng-khai-oon`, `lee-hock-keong`, `victor-ooi-keat-jin`, `oh-kim-soon-prof-dato-dr`, and `kelvin-lim-liang-hooi`.

- [ ] **Step 3: Verify the updated rows**

Run:

```sql
select id, image_url, bio, languages
from public.doctors
where id in (
  'kan-choon-hong', 'yoong-meow-foong', 'ng-khai-oon',
  'lee-hock-keong', 'victor-ooi-keat-jin',
  'oh-kim-soon-prof-dato-dr', 'kelvin-lim-liang-hooi'
)
order by id;
```

Expected: seven rows with non-empty `image_url`, `bio`, and `languages`.

- [ ] **Step 4: Run build verification and deploy**

Run:

```bash
npm test
PUBLIC_SUPABASE_URL="$PUBLIC_SUPABASE_URL" PUBLIC_SUPABASE_PUBLISHABLE_KEY="$PUBLIC_SUPABASE_PUBLISHABLE_KEY" npm run build
netlify deploy --prod --no-build --dir dist --site 00cfd1d7-4ad2-412e-b1db-3d52cde0b0a6
```

Expected: all tests pass, the build generates all seven doctor paths, and the production deployment succeeds.

- [ ] **Step 5: Commit the planning records**

```bash
git add docs/superpowers/specs/2026-07-17-medisata-profile-enrichment-design.md docs/superpowers/plans/2026-07-17-medisata-profile-enrichment.md
git commit -m "docs: plan Medisata profile enrichment"
```
