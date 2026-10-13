---
phase: 12-planos-e-custo-por-cliente
plan: 01
subsystem: billing/plans
tags: [plans, schema, landing]
requires: []
provides: [PLANS catalog (trial/solo/pro/agency), PAID_PLANS, planOf, limitFor, dailyLimitFor, dayKey, monthKey, trialClaims and spend tables, workspaces.current new fields]
affects: [convex/lib/domain.ts, convex/schema.ts, convex/model/workspace.ts, convex/workspaces.ts, landing, plans page, settings]
key-files:
  created: [tests/plans.test.ts]
  modified: [convex/lib/domain.ts, convex/schema.ts, convex/model/workspace.ts, convex/workspaces.ts, src/components/landing/pricing.tsx, "src/app/(app)/plans/page.tsx", "src/app/(app)/settings/page.tsx", tests/google-cost.test.ts, tests/google-details-quota.test.ts, tests/landing-honesty.test.ts]
decisions:
  - "Legacy plan 'free' stays valid in schema and is read as trial (no data migration)"
  - "Plans page has no checkout in the closed beta; mailto 'Pedir este plano'"
metrics:
  tasks: 2
  completed: 2026-10-13
---

# Phase 12 Plan 01: Plan catalog and plan display Summary

Four-plan catalog (Teste grátis, Solo 29, Pro 59, Agência 149) in one place with pure limit helpers, additive schema (counters, trialSpent, trialClaims, spend), and landing/Planos/Ajustes updated to match, with no checkout in the beta.

## Commits
- 51be40b: catalog, helpers, schema, `current`, workspace creation as trial, `reserveUsage` via `limitFor`
- ad8b32d: landing, Planos, Ajustes, honesty tests

## Deviations from Plan
None. `applySubscription`/`planV` in `convex/workspaces.ts` left untouched as instructed (cancel still writes "free", read as trial).

## Verification
- `node --experimental-strip-types --test tests/*.test.ts`: 474 pass, 0 fail
- `tsc --noEmit`, `tsc --noEmit -p convex`, eslint (full repo): clean
- `next build` not run (per rules)

## Notes
- Error message in `reserveUsage` still prints the raw plan id and "/mês" (plan 02 reworks it).
- Task 2 acceptance greps all return 0 as required.

## Self-Check: PASSED
