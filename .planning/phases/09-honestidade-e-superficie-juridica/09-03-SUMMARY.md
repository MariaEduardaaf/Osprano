---
phase: 09-honestidade-e-superficie-juridica
plan: 03
subsystem: legal
tags: [legal, footer, nextjs]
requires: [09-01, 09-02]
provides: [legal pages empresa/cookies/subprocessadores/aviso-prospect, landing footer Legal column]
key-files:
  created:
    - tests/legal-pages.test.ts
    - src/app/legal/empresa/page.tsx
    - src/app/legal/cookies/page.tsx
    - src/app/legal/subprocessadores/page.tsx
    - src/app/legal/aviso-prospect/page.tsx
  modified:
    - src/app/page.tsx
metrics:
  completed: 2026-10-12
---

# Phase 9 Plan 03: Legal fact pages and footer Summary

Four public legal pages (empresa, cookies, subprocessadores, aviso-prospect) driven by LEGAL_IDENTITY, plus a 4th "Legal" footer column on the landing with all 7 links and the support email.

## Commits
- 227d7f4: pages + tests/legal-pages.test.ts
- 59881f8: footer LegalLinks column

## Deviations
None. Subprocessor "Local/transferência" is "[a confirmar]" for every row, as planned (lawyer item).

## Verification
- tsc and eslint clean.
- tests/legal-pages.test.ts: 2 failures, only `/legal/privacidade` and `/legal/dpa` (pages from plan 09-04 did not exist yet at run time; `termos` already existed). Everything else passes, tests/landing-honesty.test.ts still green (25 pass total).

## Self-Check: PASSED
