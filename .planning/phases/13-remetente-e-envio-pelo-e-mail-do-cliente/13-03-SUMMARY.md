---
phase: 13-remetente-e-envio-pelo-e-mail-do-cliente
plan: 03
subsystem: compliance
tags: [suppression, purge, norway, canContactByEmail]
requires: []
provides: [global-suppression, purge-keeps-optout, norway-call-first]
affects: [convex/suppressions.ts, convex/model/suppressions.ts, convex/model/purge.ts, convex/lib/domain.ts]
key-files:
  created: [convex/model/suppressions.ts, tests/suppressions.test.ts]
  modified: [convex/suppressions.ts, convex/model/purge.ts, convex/lib/domain.ts, tests/purge.test.ts, tests/google-scal.test.ts, tests/domain.test.ts, "src/app/(app)/leads/page.tsx", src/app/page.tsx, src/components/landing/faq.tsx]
decisions:
  - "Legacy per-org unsubscribe_link rows count as global at read time, no migration"
  - "canContactByEmail checks isLaunchMarket(countryCode) before trusting stored emailable"
metrics:
  tasks: 3
  completed: 2026-10-13
---

# Phase 13 Plan 03: Global suppression, purge, Norway Summary

Unsubscribe link now writes a global suppression (legacy per-org rows also honored), account purge globalizes instead of deleting suppressions, and Norway is call-first with legal review pending, enforced inside `canContactByEmail`.

## Commits
- 0f40c63 feat(13-03): global unsubscribe suppression with testable model helpers
- a5be414 feat(13-03): account purge keeps the opt-out list
- f73248c feat(13-03): Norway becomes call-first and email gate checks the market

## Deviations from Plan
None. Plan executed as written (Tasks 1 and 2 were verified together, committed separately).

## Verification
Full suite `tests/*.test.ts`: 528 pass, 0 fail. `tsc --noEmit` (root and convex) and eslint clean. `next build` not run (forbidden by instructions). `convex/_generated/api.d.ts` not edited (new model module enters at next `convex dev`).

## Pendências
- (a) [ADVOGADO] A lista global guarda o e-mail de quem pediu para não ser contatado, inclusive depois de o cliente apagar a conta (base: obrigação/interesse legítimo de respeitar opt-out). A página de privacidade não foi editada e pode precisar mencionar isso.
- (b) Supressão manual ("respondeu stop") continua por org enquanto a conta existe e vira global no purge.
- (c) Criação manual de lead (`create-lead-modal`, lista LAUNCH_MARKETS) deixa de oferecer a Noruega.

## Self-Check: PASSED
