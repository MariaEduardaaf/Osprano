---
phase: 09-honestidade-e-superficie-juridica
plan: 02
subsystem: landing
tags: [legal, copy, pricing]
requires: []
provides: [landing-honesty-test, honest-PLANS-features]
affects: [landing, plans-page]
key-files:
  created: [tests/landing-honesty.test.ts]
  modified: [convex/lib/domain.ts, src/components/landing/pricing.tsx, src/app/page.tsx, src/components/landing/faq.tsx, src/app/(app)/sites/page.tsx]
decisions:
  - PLANS ids, prices and limits unchanged; only features text (Phase 12 changes plans)
metrics:
  completed: 2026-10-12
---

# Phase 9 Plan 02: Landing honesty Summary

Landing, FAQ, Pricing and PLANS no longer promise testimonials, open notifications, white-label/own domain, annual discount or legal outcomes; a source-reading test locks the forbidden terms.

## Tasks
1. Honesty test, PLANS features, Pricing without annual toggle (commit 1fc9003)
2. Rewrote false claims in page.tsx, faq.tsx and sites page; removed TESTIMONIALS and section (commit 5c2e3f5)

## Deviations from Plan
None. The test was written together with the fixes in Task 1, so the strict RED run was not observed separately.

## Verification
- tests/*.test.ts: 360 pass, 0 fail (landing-honesty: 13 cases)
- tsc --noEmit and eslint on touched files: clean

## Self-Check: PASSED
