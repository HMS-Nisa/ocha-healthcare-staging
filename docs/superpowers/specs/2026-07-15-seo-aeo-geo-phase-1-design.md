# Ocha Healthcare SEO, AEO, and GEO Phase 1 Design

Date: 15 July 2026
Status: Approved direction, pending written-spec review

## 1. Purpose

Phase 1 establishes a trustworthy, indexable, Bahasa Indonesia-first foundation for Ocha Healthcare. It is designed to attract Indonesian patients who are actively looking for an appropriate specialist or hospital in Malaysia and convert them into calendar selections followed by WhatsApp conversations with an Ocha agent.

This phase prioritizes index quality and qualified leads over publishing volume.

## 2. Confirmed business model

- Indonesia is the primary market and Bahasa Indonesia is the default website language.
- Ocha is free for patients and earns through disclosed hospital partnerships.
- Ocha connects patients to suitable specialists and hospitals within its verified partner network.
- Ocha coordinates introductions and appointments; it does not diagnose, treat, or provide end-to-end medical-travel logistics.
- Matching and coordination are currently performed by people, not AI.
- The primary conversion is: select a preferred slot, open a prepared WhatsApp conversation, receive human review, and proceed to a confirmed hospital appointment.
- Existing approved testimonials and trust claims remain unless a page conflicts with the confirmed service model or is explicitly identified as mock content.

## 3. Search Console baseline

The baseline covers 13 April–12 July 2026:

- 35 clicks
- 749 impressions
- 4.7% click-through rate
- 12.2 average position
- 13 indexed pages
- 14 non-indexed pages
- 11 pages classified as “Crawled – currently not indexed”
- 88 URLs discovered in the submitted sitemap
- No manual actions
- No security issues
- Insufficient Chrome UX Report traffic for field Core Web Vitals

The homepage generates 32 of 35 clicks. Branded searches dominate clicks. The mock `/article/template/` URL generates 277 impressions and one click, which means a large share of non-homepage visibility is attached to a page that does not meet Ocha’s product or editorial requirements.

## 4. Goals and success criteria

### 4.1 Goals

1. Make every indexable page accurately describe Ocha’s current human-led service.
2. Give Google and answer engines a consistent understanding of Ocha’s identity, audience, services, providers, and editorial responsibility.
3. Reduce low-value URLs and improve the proportion of submitted pages that Google chooses to index.
4. Build clear search journeys from Indonesian patient questions to relevant specialists and booking.
5. Measure qualified-intent actions without sending medical or personally identifiable information to analytics platforms.

### 4.2 Phase 1 acceptance criteria

- All public indexable pages use `lang="id"` and Bahasa Indonesia navigation, headings, metadata, and calls to action.
- No public page describes Ocha as AI-powered or as an end-to-end travel/logistics provider.
- Every indexable page has one self-referencing canonical URL, unique title, unique description, Open Graph metadata, and Twitter/X card metadata.
- Organization identity and site-level structured data validate without errors.
- Doctor and specialty/location schemas use only facts available in Ocha’s source data.
- Thin doctor profiles are excluded from the sitemap and marked `noindex,follow` until they meet the indexability criteria.
- Low-supply specialty/location pages are excluded from indexing until they meet the indexability criteria.
- `/article/template/` no longer serves mock content and no longer appears as a standalone sitemap URL.
- Malformed double-hyphen specialty/location URLs are replaced with stable slugs and redirected from their old URLs.
- The sitemap contains only canonical, indexable, successful pages.
- Calendar selection and WhatsApp conversion events are measurable without including symptoms, diagnoses, doctor names, phone numbers, or message text in analytics payloads.
- Production build and automated SEO checks pass.

## 5. Information architecture and language

### 5.1 Default language

Bahasa Indonesia becomes the single primary language for Phase 1. The HTML language is `id`. English-language variants and `hreflang` are out of scope until Ocha has an intentional secondary-market strategy and fully translated page equivalents.

### 5.2 Primary journeys

The site will support three connected journeys:

1. **Find a specialist:** homepage → doctor directory → doctor profile → calendar → WhatsApp.
2. **Find care by need and destination:** specialty/location landing page → suitable profiles → calendar or WhatsApp.
3. **Learn before choosing:** medically reviewed or carefully sourced guide → relevant specialist/category → calendar or WhatsApp.

### 5.3 Trust pages

Phase 1 adds or strengthens these entity and trust destinations:

- Tentang Ocha
- Cara Kerja
- Kebijakan Editorial
- Disclaimer Medis
- Kebijakan Privasi
- Syarat Penggunaan

These pages must clearly state that Ocha provides coordination and introductions, not diagnosis or medical treatment.

## 6. Shared metadata and technical foundation

The two existing layouts will use one shared SEO metadata component. A page supplies its title, description, canonical path, robots directive, image, content type, and structured-data objects. The shared layer renders:

- canonical URL
- robots meta
- Open Graph tags
- Twitter/X card tags
- site name and locale
- Google site-verification value when needed
- structured-data scripts

Defaults must be safe. A page cannot become indexable without a canonical URL. Structured data must not contain claims that are absent from visible page content.

The homepage will identify Ocha as a medical concierge and specialist-matching service for Indonesian patients seeking care in Malaysia. “AI-powered,” airport transfers, accommodation, Guarantee Letter handling, and end-to-end travel support are removed from active service positioning.

## 7. Index eligibility rules

### 7.1 Doctor profiles

A doctor profile is indexable only when the source record contains:

- stable unique identifier
- full name
- specialty
- hospital
- Malaysian location
- a valid profile image, with `/assets/doctor-placeholder.png` used when no provider image is available
- either a biography of at least 80 words, or at least three populated and verified differentiator fields from: subspecialty, languages, qualifications, procedures, and schedule

Profiles that do not meet the rule remain available to users in the directory but use `noindex,follow` and are removed from the sitemap. Ocha will not fabricate biographies, qualifications, schedules, reviews, or treatment claims to make a profile indexable.

The profile template will present concise answer blocks for common patient questions, factual provider details, the human-review booking process, and related providers. Generic testimonials may remain as Ocha-level testimonials but must not imply they are reviews of a specific doctor unless that relationship is documented.

### 7.2 Specialty/location pages

A specialty/location page is indexable only when it has:

- at least two indexable provider profiles
- a stable normalized slug
- a unique introduction explaining whom the page helps
- a visible list of represented partner hospitals
- a concise booking-process answer
- non-duplicative FAQs based on actual patient decision needs

Pages below the threshold use `noindex,follow` and are omitted from the sitemap. This prevents the limited provider network from producing numerous thin combinations.

## 8. Mock article recovery

The existing `/article/template/` page will not remain as-is. It contains mock authorship, placeholder review information, unverified patient commentary, old dates, and services outside the confirmed business model.

Because the URL already receives impressions for heart-bypass cost searches, Phase 1 will preserve the relevant search opportunity rather than discard it:

1. Create a real Bahasa Indonesia guide at `/blog/biaya-operasi-bypass-jantung-di-malaysia/`.
2. Use current, cited primary or authoritative sources for medical and cost statements.
3. Display “Tim Ocha Healthcare” as the author, the actual update date, a medical disclaimer, and a source list. Reviewer attribution is omitted unless Ocha supplies a reviewer who has approved the final article.
4. Focus the conversion on finding an appropriate heart specialist or hospital and booking a conversation with Ocha.
5. Permanently redirect `/article/template/` to the new guide.

The replacement guide is required for Phase 1 deployment. Mock attribution must not remain public.

## 9. Structured data for SEO, AEO, and GEO

The structured-data graph will use stable IDs rooted at `https://ocha.health/#...` and connect visible entities:

- `Organization` for Ocha, because Ocha does not directly provide clinical care
- `WebSite`
- `WebPage` and `BreadcrumbList` on internal pages
- `Physician` on eligible doctor pages
- `ItemList` on directory and eligible specialty/location pages
- `Article` or `MedicalWebPage` only for content that satisfies the editorial requirements
- `FAQPage` only where the questions and answers are visible and genuinely useful; rich-result eligibility is not promised

Ocha will not use `MedicalClinic`, `Hospital`, or diagnostic/treatment schema in a way that implies Ocha directly provides clinical care.

Answer-oriented content will use short, direct Bahasa Indonesia responses followed by supporting detail. Pages will clearly name Ocha, its role, its Malaysian partner network, its Indonesian audience, and its human-led process so search and generative systems can resolve the entity consistently.

## 10. Sitemap, robots, and URL normalization

- `robots.txt` continues to allow public crawling and points only to `https://ocha.health/sitemap-index.xml`.
- Only the sitemap index needs to remain submitted in Search Console. The child sitemap submission is redundant and can be removed from Search Console after deployment verification.
- The generated sitemap filters out redirects, `noindex` pages, mock/template routes, and non-canonical URLs.
- Slug generation collapses repeated separators, removes leading/trailing separators, and has deterministic tests.
- Old malformed URLs receive permanent redirects to the normalized equivalent when a clear equivalent exists.
- Canonical URLs consistently use HTTPS, `ocha.health`, lowercase paths, and Astro’s trailing-slash output convention.

## 11. Conversion and analytics

The website’s primary call to action is booking through the calendar and continuing in WhatsApp with an Ocha agent.

The data layer will record only non-sensitive interaction events:

- `view_doctor_directory`
- `view_doctor_profile`
- `select_booking_date`
- `select_booking_time`
- `click_whatsapp_booking`
- `click_whatsapp_concierge`
- `view_lead_guide`

Event parameters are limited to `page_type`, `specialty`, `location`, and `cta_placement`. They must not include symptoms, diagnosis, free-text messages, medical-record details, patient name, phone number, or other personal identifiers.

WhatsApp links retain a useful prefilled message for the agent, but that message is not copied into GA4, GTM, or Clarity event parameters.

## 12. Error handling and data quality

- A failed doctor-data fetch must fail the production build rather than silently publish an empty directory or incomplete sitemap.
- Duplicate doctor identifiers are detected and reported.
- Missing required fields make a profile non-indexable; they do not trigger invented fallback facts.
- Structured-data generation omits unknown optional properties.
- Invalid or missing doctor images use the Ocha-owned `/assets/doctor-placeholder.png` asset rather than a third-party placeholder service.
- Booking slots remain requests, not claims of confirmed doctor availability. Visible copy states that an Ocha agent will confirm the appointment.

## 13. Verification

### 13.1 Automated checks

- production build completes successfully
- sitemap XML parses and contains only eligible canonical URLs
- no sitemap URL contains `/article/template/` or repeated hyphens
- no indexable HTML file is missing title, description, canonical, robots, and language attributes
- structured-data JSON parses on every generated page
- internal links resolve to generated routes or approved redirects
- repository contains no active “AI-powered,” airport-transfer, accommodation, or end-to-end logistics positioning
- analytics event payloads contain no prohibited personal or medical fields

### 13.2 Browser checks

- homepage, directory, representative doctor profile, representative specialty/location page, guide, calendar, and mobile WhatsApp flow
- desktop and mobile navigation in Bahasa Indonesia
- one H1 per page and logical heading order
- canonical and visible content agree
- calendar makes no false availability guarantee

### 13.3 Post-deployment checks

- live robots and sitemap return successful responses
- old mock and malformed URLs redirect as designed
- representative URLs pass Search Console URL Inspection
- sitemap index is resubmitted after deployment
- Search Console is monitored at 7, 14, and 28 days for indexing, impressions, non-branded queries, and excluded-page reasons

## 14. Delivery sequence

1. Consolidate layouts and shared metadata.
2. Correct Bahasa Indonesia positioning and service scope.
3. Add trust/entity pages and site-level structured data.
4. Implement index eligibility and sitemap filtering.
5. Normalize specialty/location slugs and redirects.
6. Improve eligible doctor and specialty/location templates.
7. Replace the mock article and redirect its old URL.
8. Add privacy-safe conversion events.
9. Run automated and browser verification.
10. Commit, push, deploy, and validate in Search Console.

## 15. Explicitly out of scope

- AI matching or chatbot functionality
- automated medical advice, diagnosis, triage, or treatment recommendations
- hospital availability integrations
- patient accounts or medical-record uploads
- airport transfer, hotel, visa, or end-to-end travel coordination
- bulk programmatic creation of unsupported specialty/location pages
- multilingual English pages or `hreflang` implementation
- guaranteeing rankings, AI citations, rich results, or appointment availability
