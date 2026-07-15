# Approval-First Content Publishing Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build a versioned Indonesian healthcare-content bank and a weekly Codex automation that opens exactly one GitHub draft pull request for human approval, never publishing, merging, deploying, or requesting indexing itself.

**Architecture:** Editorial planning lives in committed Markdown under `docs/content/`; the existing Astro blog schema remains the enforcement point for draft `noindex` and source-backed indexing. A test suite treats the bank and operating rules as policy. A Codex local automation, attached to the real Ocha repository, reads those files on Mondays at 09:00 WIB, drafts one eligible article, validates it, and creates a draft GitHub PR.

**Tech Stack:** Astro content collections, Node built-in test runner, Markdown editorial records, GitHub CLI draft PRs, Codex local recurring automation.

---

## Preconditions

1. Attach or reopen the real repository as a Codex project: `/Users/hmskhairulazri/Documents/Projects/Ocha/ocha-healthcare-staging`.
2. Confirm the attached project is a checkout of `HMS-Nisa/ocha-healthcare-staging`, not the empty legacy folder currently labelled “Ocha Health”.
3. Confirm the local GitHub CLI can authenticate and create a draft PR against that repository. Do not save credentials or tokens in the repository.
4. Run implementation in a `codex/approval-first-content-publishing` worktree/branch. The scheduler may only be created after Preconditions 1–3 pass.

## Safety Invariants

- Default language is Bahasa Indonesia. Every article describes Ocha’s human coordination service and its verified partner network.
- Ocha does not diagnose, treat, review medical records, promise pricing/outcomes/appointments, or coordinate airport, accommodation, GL, or transfer services.
- A scheduled run creates at most one draft PR. It never merges, deploys, publishes, changes a sitemap, submits URLs to Search Console, or changes a post from `noindex,follow` to `index,follow`.
- A draft may not include patient data or free-text medical information.
- A human editor alone changes a reviewed article to `index,follow` and merges it. The existing schema then requires at least two authoritative sources.

## Task 1: Create editorial operating rules and a reusable draft template

**Files:**

- Create: `docs/content/editorial-policy.md`
- Create: `docs/content/article-draft-template.md`
- Create: `tests/content-publishing-policy.test.mjs`

**Step 1: Write the failing policy test.**

Create `tests/content-publishing-policy.test.mjs`. Read both Markdown files and assert the policy/template explicitly require:

- Indonesian-first copy and coordination-only scope;
- a verified-partner-network qualifier;
- no diagnosis, treatment, medical-record review, price/outcome promise, AI claim, transfers, accommodation, or GL claim;
- `robots: "noindex,follow"` for automation-created articles;
- two authoritative sources before an editor may choose `index,follow`;
- a visible disclaimer, source section, internal links, and `/doctors/` booking/WhatsApp coordination CTA;
- no automatic merge, deployment, sitemap change, or indexing request.

**Step 2: Run the test to prove it fails.**

Run: `node --test tests/content-publishing-policy.test.mjs`

Expected: FAIL because both editorial files do not exist.

**Step 3: Write the operating rules and template.**

Create `docs/content/editorial-policy.md` with the safety invariants and this workflow: select an eligible bank item; verify demand signal, partner fit, intent, two authoritative sources, and internal-link targets; create a noindex draft; test/build/audit; open a GitHub **draft** PR; await human review; human closes, revises, or changes robots to `index,follow` before merge.

State that GSC signals are inputs, not a promise of search volume, ranking, or traffic.

Create `docs/content/article-draft-template.md` with valid Astro frontmatter fields from `src/lib/blog-schema.js`: `robots: "noindex,follow"`, `sources`, `medicalDisclaimer`, optional FAQ, a source-to-claim check, and a final human-approval checklist. Use only placeholders; do not invent a doctor, hospital, statistic, testimonial, or medical claim.

**Step 4: Run the focused test.**

Run: `node --test tests/content-publishing-policy.test.mjs`

Expected: PASS.

**Step 5: Commit.**

```bash
git add docs/content/editorial-policy.md docs/content/article-draft-template.md tests/content-publishing-policy.test.mjs
git commit -m "docs: add approval-first editorial policy"
```

## Task 2: Add a scored 30-topic Indonesian content bank

**Files:**

- Create: `docs/content/content-bank.md`
- Modify: `tests/content-publishing-policy.test.mjs`

**Step 1: Extend the test first.**

Add a test that reads `docs/content/content-bank.md`, splits records on `## CB-`, and requires at least 30 unique records. Each record must include labelled fields:

- `Status` (`queued`, `drafted`, `published`, `held`, or `retired`);
- `Query cluster`;
- `Intent`;
- `Demand evidence`;
- `Priority`;
- `Partner fit`;
- `Authoritative source starting points` (at least two URLs);
- `Internal links`;
- `Scope and CTA`.

Reject a queued record containing prohibited service promises or an unqualified medical recommendation.

**Step 2: Run the test to prove it fails.**

Run: `node --test tests/content-publishing-policy.test.mjs`

Expected: FAIL because the content bank does not exist.

**Step 3: Create the bank.**

Create `docs/content/content-bank.md` as a human-readable Markdown inventory. Start each record with `## CB-01` through `## CB-30`; use `queued` initially. Score priority from evidence, not invented keyword-volume figures. Use GSC query/page patterns, patient questions, verified partner coverage, coordination conversion fit, and current-blog gaps.

Seed these research briefs, subject to final partner-fit/source verification before drafting:

1. Cara memilih dokter spesialis di Malaysia dari Indonesia
2. Cara meminta slot konsultasi spesialis di Malaysia
3. Dokumen yang perlu disiapkan sebelum konsultasi spesialis di Malaysia
4. Cara memahami estimasi biaya rumah sakit di Malaysia
5. Pertanyaan yang perlu diajukan sebelum memilih rumah sakit di Malaysia
6. Cara membandingkan pilihan rumah sakit melalui jaringan mitra
7. Panduan mencari dokter jantung di Malaysia
8. Pertanyaan untuk konsultasi dokter jantung
9. Panduan memilih dokter kanker/onkologi di Malaysia
10. Pertanyaan sebelum konsultasi onkologi
11. Panduan mencari dokter ortopedi di Malaysia
12. Pertanyaan sebelum konsultasi ortopedi
13. Panduan mencari dokter saraf di Malaysia
14. Pertanyaan sebelum konsultasi neurologi
15. Panduan mencari dokter mata di Malaysia
16. Pertanyaan sebelum konsultasi mata
17. Panduan mencari dokter THT di Malaysia
18. Pertanyaan sebelum konsultasi THT
19. Panduan mencari dokter urologi di Malaysia
20. Pertanyaan sebelum konsultasi urologi
21. Panduan mencari dokter anak di Malaysia
22. Pertanyaan sebelum konsultasi dokter anak
23. Panduan mencari dokter bedah umum di Malaysia
24. Kapan pasien perlu meminta second opinion dan cara memulainya
25. Cara menyiapkan ringkasan kondisi untuk agen koordinasi (tanpa mengirim data sensitif ke formulir publik)
26. Cara menjadwalkan konsultasi keluarga dari Indonesia
27. Bahasa yang bisa digunakan saat koordinasi dengan rumah sakit Malaysia
28. Perbedaan peran dokter spesialis dan subspesialis
29. Panduan memilih spesialis untuk keluhan jantung (informasi umum, bukan diagnosis)
30. Panduan memilih spesialis untuk keluhan tulang dan sendi (informasi umum, bukan diagnosis)

Every brief needs a specific partner-network eligibility note. If verified coverage or two authoritative sources cannot be demonstrated, mark it `held` before any run may draft it. Link only to existing relevant Ocha pages after checking the target exists.

**Step 4: Run the focused test.**

Run: `node --test tests/content-publishing-policy.test.mjs`

Expected: PASS with 30 complete, unique briefs.

**Step 5: Commit.**

```bash
git add docs/content/content-bank.md tests/content-publishing-policy.test.mjs
git commit -m "docs: add Ocha content opportunity bank"
```

## Task 3: Strengthen the article contract for approval-only drafts

**Files:**

- Modify: `tests/blog-content.test.mjs`
- Modify: `src/lib/blog-schema.js` only if tests demonstrate a missing schema guard
- Modify: `docs/content/article-draft-template.md`

**Step 1: Add failing coverage.**

Extend `tests/blog-content.test.mjs` with assertions that:

- noindex drafts remain valid without sources, while indexable articles require two sources;
- a non-empty `sources` list must contain two entries even for a noindex article, so a partially sourced draft cannot masquerade as complete; and
- frontmatter cannot declare diagnosis, AI matching, transfers, accommodation, or GL as an Ocha offering.

Use representative frontmatter objects only; never put patient data in tests.

**Step 2: Run focused tests to establish the gap.**

Run: `node --test tests/blog-content.test.mjs`

Expected: at least the unsupported-service guard fails until the smallest safe guard is implemented.

**Step 3: Implement the smallest safe guard.**

Keep `src/lib/blog-schema.js` as frontmatter’s single source of truth. If a declarative schema guard is not feasible, put prohibited-language checking in the policy test instead; do not add brittle body-text filtering that might block citations or historical content. Keep the existing two-source `index,follow` rule.

Update `docs/content/article-draft-template.md` to show how an editor records authoritative sources before changing robots to `index,follow`.

**Step 4: Run focused tests.**

Run: `node --test tests/blog-content.test.mjs tests/content-publishing-policy.test.mjs`

Expected: PASS.

**Step 5: Commit.**

```bash
git add src/lib/blog-schema.js tests/blog-content.test.mjs docs/content/article-draft-template.md tests/content-publishing-policy.test.mjs
git commit -m "test: enforce approval-first article guardrails"
```

## Task 4: Create and verify the recurring draft automation

**Files:**

- Modify: `docs/content/editorial-policy.md`
- Modify: `docs/content/content-bank.md` only after a run selects or skips a brief
- Create: `src/content/blog/<selected-slug>.md` only through a scheduled run, never during setup

**Step 1: Preflight the execution target and integrations.**

From the attached Codex project, verify:

```bash
pwd
git remote -v
gh auth status
git status --short --branch
```

Expected: real Documents checkout, `origin` is `HMS-Nisa/ocha-healthcare-staging`, GitHub authentication is valid, and no unrelated changes exist. If any check fails, do not create automation; report the prerequisite.

**Step 2: Create the local recurring automation through Codex.**

Use `codex_app__automation_update` only after the preflight passes. Configure a local, active weekly task for Monday 09:00 Asia/Jakarta, attached to the actual Ocha project, named “Ocha weekly approval-first draft”.

Use this task prompt:

```text
Work only in the attached Ocha repository. Create at most one GitHub draft PR and never merge, deploy, publish, change sitemap settings, submit URLs for indexing, or change robots from noindex to index.

Read docs/content/editorial-policy.md, docs/content/content-bank.md, docs/content/article-draft-template.md, existing blog content, and current git status. Select the highest-priority queued brief only if partner fit is verified, scope stays within Ocha’s human coordination service, at least two authoritative sources can be cited, and planned internal links exist. If any condition fails, create no PR and report why.

For an eligible brief: create a fresh content/<date>-<slug> branch; draft one Bahasa Indonesia article in src/content/blog/<slug>.md using robots: noindex,follow; include a visible medical disclaimer, sources, coordination-only wording, and a truthful CTA to /doctors/. Do not use patient data, invented providers, statistics, testimonials, outcomes, prices, or medical advice. Update exactly that brief from queued to drafted with PR/date reference.

Run npm test and npm run build. On failure, do not create a PR; report failure. On success, commit only the article and bank update, push, and open exactly one GitHub DRAFT PR. The description must say draft only; noindex; sources; partner-fit check; tests/build outcome; editor must approve accuracy and manually choose whether to change to index,follow before merge.
```

**Step 3: Record only non-sensitive operating metadata.**

Add the scheduler’s displayed name, cadence, timezone, and a pause/disable instruction to `docs/content/editorial-policy.md`. Never record API keys, tokens, account IDs, or raw scheduler expressions.

**Step 4: Dry-run review without an extra live draft.**

Invoke a manual run only if the platform supports it and the selected brief is eligible. Inspect the created PR: it must be Draft, contain one noindex article, include its evidence, and contain no deployment/indexing action. Otherwise inspect the saved configuration and wait for the first scheduled run.

**Step 5: Verify setup.**

Run:

```bash
npm test
npm run build
git diff --check
```

Expected: tests/build/audit pass; no whitespace errors. For a weekly run, verify its GitHub PR is draft-only and production is untouched.

**Step 6: Commit setup-only policy changes.**

```bash
git add docs/content/editorial-policy.md
git commit -m "docs: document weekly content drafting automation"
```

Do not commit an automation-created article to the setup branch. The automation owns its content branches and draft PRs.

## Task 5: Final quality gate and handoff

**Files:**

- Review: `docs/content/editorial-policy.md`
- Review: `docs/content/article-draft-template.md`
- Review: `docs/content/content-bank.md`
- Review: `tests/content-publishing-policy.test.mjs`
- Review: `tests/blog-content.test.mjs`

**Step 1: Run the full project verification.**

Run:

```bash
npm test
npm run build
git diff --check
git status --short --branch
```

Expected: tests and verified build pass, no whitespace errors, only intended branch commits.

**Step 2: Review against the business model.**

Confirm all template/bank/scheduler content describes manual Ocha coordination and a verified partner network. Remove claims of AI matching, diagnosis, treatment, medical-record review, logistics, pricing/outcomes, or market-wide hospital representation.

**Step 3: Handoff.**

Report the content-bank location, cadence, GitHub draft-PR approval point, project-path preflight, and the fact that no content goes live without a human changing robots and merging it.

