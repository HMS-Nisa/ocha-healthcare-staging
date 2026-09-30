# Indonesia Patient Lead Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two Bahasa Indonesia, approval-only guides that attract Indonesian patients seeking Malaysian cancer and knee-replacement cost coordination.

**Architecture:** Reuse the existing Astro blog collection and noindex frontmatter. Each guide is source-backed, answer-first, limited to Ocha’s human coordination role, and links to the doctor directory.

**Tech Stack:** Astro content collections, Markdown, Node test runner.

## Global Constraints

- Both guides use `robots: "noindex,follow"` until Khairul explicitly approves publication.
- Do not state prices, diagnoses, treatment recommendations, provider-network status, or clinical outcomes.
- Each guide contains at least two authoritative sources, two FAQs, the standard disclaimer, and a `/doctors/` CTA.

---

### Task 1: Add coverage for the two approval-only guides

**Files:**
- Modify: `tests/blog-content.test.mjs`

- [x] **Step 1: Write the failing test**

Add tests that require each new draft to be noindex, source-backed, coordination-only, and linked to `/doctors/`.

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/blog-content.test.mjs`
Expected: FAIL because the two article files do not exist.

- [x] **Step 3: Add the two guides**

Create `src/content/blog/biaya-pengobatan-kanker-di-malaysia.md` and `src/content/blog/biaya-operasi-ganti-sendi-lutut-di-malaysia.md` with the specified editorial guardrails.

- [ ] **Step 4: Run the test suite and production build**

Run: `npm test && npm run build`
Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-08-10-indonesia-patient-lead-drafts.md tests/blog-content.test.mjs src/content/blog/biaya-pengobatan-kanker-di-malaysia.md src/content/blog/biaya-operasi-ganti-sendi-lutut-di-malaysia.md
git commit -m "content: add Indonesia patient lead drafts"
```
