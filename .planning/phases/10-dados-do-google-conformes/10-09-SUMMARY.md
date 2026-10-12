---
phase: 10-dados-do-google-conformes
plan: 09
subsystem: ui
tags: [google-places, pagination, compliance]
requires: ["10-06", "10-07"]
provides: [paginated Leads page, GoogleCard in LeadCard, explicit per-page Google load]
key-files:
  modified: ["src/app/(app)/leads/page.tsx", src/components/lead-card.tsx, src/components/generate-preview-button.tsx]
requirements-completed: [GPLC-02, GPLC-05, SCAL-01]
completed: 2026-10-12
---

# Phase 10 Plan 09: Leads screen on the new model

Leads page paginated (24 + "Carregar mais"), search results kept in JS memory and shown in GoogleCard, explicit button loads up to 24 Google records of the page with monthly usage shown; preview errors now visible.

## Commits
- a842d17: LeadCard Google block, GeneratePreviewButton error
- 4fc741b: leads/page.tsx pagination and Google load

## Deviations from Plan
- The import in lead-card.tsx uses the alias `@/components/google/google-card` (not relative) because tests/google-attribution.test.ts matches that path.
- Client regime filter kept in addition to the server one (listForDiscovery does not filter regime when a country is set).

## Verification
- tests/*.test.ts: 467 pass, 0 fail; root tsc and eslint on touched files clean. `tsc -p convex` and full eslint not run (no convex files touched). Not exercised in a browser.

## Self-Check: PASSED
