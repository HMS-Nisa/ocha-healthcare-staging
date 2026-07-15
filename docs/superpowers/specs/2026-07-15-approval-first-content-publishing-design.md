# Approval-First Content Publishing Design

Date: 15 July 2026

## Goal

Build a content-bank and scheduled weekly drafting workflow for Ocha. Every article remains a GitHub draft pull request until the user explicitly merges it. No automation may publish, deploy, request indexing, or change live content.

## Scope

- Run one scheduled drafting job each Monday at 09:00 Asia/Jakarta time.
- Attach the automation to the Ocha project in Codex.
- Maintain a repository content bank with ranked, evidence-backed article briefs.
- Create one Bahasa Indonesia article draft per eligible weekly run.
- Create a GitHub draft PR for review.
- Use existing Ocha content schema, sitemap filters, and SEO audit as release safeguards.

## Out of Scope

- Automatic merge, deployment, publishing, Search Console submissions, or indexing requests.
- Medical diagnosis, treatment advice, unsupported cost figures, provider schedules, or fabricated patient/provider claims.
- Drafting articles where sources, partner relevance, or editorial confidence are insufficient.

## Editorial Model

### Content bank

The bank is a versioned Markdown file in the repository. Each row stores:

- Topic and target Indonesian query cluster.
- Patient intent: informational, administrative, specialist discovery, or appointment preparation.
- Priority score based on demand signals, partner-network relevance, existing Search Console queries, and conversion fit.
- Required authoritative sources.
- Internal links to eligible doctor, specialty, trust, and booking pages.
- Status: `queued`, `drafted`, `published`, `held`, or `retired`.

Demand signals are evidence, not promises of search volume. Sources include Search Console performance/query data when accessible, current search-result patterns, recurring patient questions, and partner-network coverage.

### Eligibility

A topic may become a draft only when all conditions pass:

1. It helps Indonesian patients connect with an appropriate Ocha partner specialist or hospital.
2. It fits Ocha's coordination-only scope.
3. It has at least two authoritative sources if the eventual article would be indexable.
4. It has no unsupported clinical, pricing, credential, outcome, scheduling, or testimonial claim.
5. It has at least one factual internal conversion path: directory, eligible specialty, or appointment request.

Otherwise, the scheduled run records the topic as `held` with a reason and creates no PR.

### Article contract

Draft articles use the existing `blogEntrySchema` contract:

- Bahasa Indonesia title, summary, headings, FAQs, and CTA.
- `robots: noindex,follow` while the PR is open.
- Visible sources, medical disclaimer, answer-first structure, and factual internal links.
- `index,follow` can be set only by a human reviewer during PR approval after sources and claims are checked.

The existing build and audit block invalid schema, unsafe analytics, noncanonical URLs, missing metadata, and sitemap/indexability regressions.

## Scheduled Flow

```text
Monday 09:00 WIB
  -> read content bank and current published content
  -> research demand signals and validate next queued topic
  -> draft one noindex Bahasa article with sources
  -> update content-bank status to drafted
  -> create a new branch and GitHub draft PR
  -> stop

Human review
  -> approve sources, claims, links, and final robots value
  -> merge PR
  -> existing Netlify main deployment publishes it
```

No scheduled job may merge a branch, call Netlify deployment endpoints, submit a sitemap, request indexing, or send data to a patient-facing system.

## Automation Failure Handling

- Missing GitHub authorization: create no content commit and report the authentication failure.
- Missing authoritative sources or unsuitable topic: mark bank item `held`; report reason; create no PR.
- Failed tests/build/audit: create no PR; preserve diagnostic output for the user.
- Duplicate or already-published topic: skip and select the next eligible item once; otherwise report no eligible topic.

## Security and Privacy

- Automation handles public editorial content only.
- Never read, include, or transmit patient messages, medical records, phone numbers, email addresses, booking selections, doctor-name analytics dimensions, or free-text patient data.
- GitHub credentials and any future drafting-model credential remain platform secrets, never repository files.

## Acceptance Criteria

1. Content bank contains at least 30 ranked topic briefs, each with intent, evidence/source requirements, and status.
2. Weekly project automation runs Monday 09:00 WIB and can create at most one draft PR.
3. Draft PR article defaults to `noindex,follow` and passes tests, verified build, and SEO audit.
4. No automated run can merge, deploy, publish, submit a sitemap, or request indexing.
5. Failed eligibility or verification produces a report without a PR.
