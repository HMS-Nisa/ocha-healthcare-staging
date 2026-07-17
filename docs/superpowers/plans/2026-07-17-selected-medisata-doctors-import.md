# Selected Medisata Doctors Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish seven verified doctor profiles selected from Medisata's direct Google Ads campaigns.

**Architecture:** Keep the current Supabase-backed directory unchanged. Upsert seven rows into `public.doctors`, leaving existing `lee-chun-lin` unchanged, then rebuild the static Astro site so production pages include them.

**Tech Stack:** Supabase Postgres, Astro, Node test runner, Netlify.

## Global Constraints

- Use official public hospital profiles for factual fields.
- Do not add service-role credentials to source control or Netlify browser variables.
- Do not alter schema, RLS, routes, or components.

---

### Task 1: Verify, publish, and deploy selected doctors

**Files:**
- Modify: `public.doctors` through an idempotent Supabase upsert
- Verify: `tests/doctors.test.mjs`, `package.json` test command

**Interfaces:**
- Consumes: existing `public.doctors` columns and static `getPublishedDoctors()` build fetch.
- Produces: seven published rows with canonical ids, plus production doctor pages after rebuild.

- [ ] **Step 1: Read public source pages and map fields**

Use each hospital's doctor profile to confirm `name`, Indonesian specialty label, `hospital`, `location`, and `source_url`. Leave a field null when its source does not establish it.

- [ ] **Step 2: Confirm existing duplicate state**

Run:

```sql
select id, name from public.doctors
where id in ('kan-choon-hong', 'yoong-meow-foong', 'ng-khai-oon', 'lee-hock-keong', 'victor-ooi-keat-jin', 'oh-kim-soon-prof-dato-dr', 'lee-chun-lin', 'kelvin-lim-liang-hooi')
order by id;
```

Expected: only `lee-chun-lin` exists before import.

- [ ] **Step 3: Upsert seven rows**

Execute one `insert ... on conflict (id) do update` statement containing only verified source values. Set `published = true`, `schedule = '[]'::jsonb`, and never include `lee-chun-lin`.

- [ ] **Step 4: Verify published set**

Run:

```sql
select id, name, specialty, hospital, published
from public.doctors
where id in ('kan-choon-hong', 'yoong-meow-foong', 'ng-khai-oon', 'lee-hock-keong', 'victor-ooi-keat-jin', 'oh-kim-soon-prof-dato-dr', 'lee-chun-lin', 'kelvin-lim-liang-hooi')
order by id;
```

Expected: eight records, all published.

- [ ] **Step 5: Run checks and deploy**

Run:

```bash
npm test
PUBLIC_SUPABASE_URL='<production-url>' PUBLIC_SUPABASE_PUBLISHABLE_KEY='<production-publishable-key>' npm run build
```

Expected: tests and build pass. Deploy the generated `dist` directory to the existing Ocha production site, then request `/doctors/` and `/doctor/kan-choon-hong/` to confirm live pages.
