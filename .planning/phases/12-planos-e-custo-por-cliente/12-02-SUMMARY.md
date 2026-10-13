---
phase: 12-planos-e-custo-por-cliente
plan: 02
subsystem: billing/quota
tags: [quota, budget, usage]
requires: ["12-01"]
provides: [reserveUsage/refundUsage for 6 kinds, ensureFresh (trial no renewal, daily reset), chargeBudget, budgetStatusFor, internal.workspaces.reserve with usd]
key-files:
  created: [convex/lib/budget.ts, convex/model/budget.ts, tests/usage-engine.test.ts, tests/budget.test.ts]
  modified: [convex/lib/domain.ts, convex/model/workspace.ts, convex/workspaces.ts, tests/google-details-quota.test.ts]
decisions:
  - "Quota and global budget are charged in the same mutation (rollback together); refund never returns budget"
metrics:
  tasks: 2
  completed: 2026-10-13
---

# Phase 12 Plan 02: Quota engine and global budget Summary

One `reserveUsage`/`refundUsage` covers leads, sites, details, AI, verifications and daily searches with clear PT-BR messages; trial never renews, daily counters reset each UTC day; a US$ 30/month global cap is charged with the reservation.

## Commits
- a650a97: six-kind reserve/refund, ensureFresh rules, tests
- c47c084: budget lib/model, `reserve` with `usd`, `kindV`, budget tests

## Deviations from Plan
None. Tests for task 1 were written right after the implementation rather than strictly before (same coverage as the behavior list).

## Verification
- `node --experimental-strip-types --test tests/*.test.ts`: 492 pass, 0 fail
- `tsc --noEmit`, `tsc --noEmit -p convex`, eslint (full repo): clean
- No paid caller wired yet (plan 04).

## Self-Check: PASSED
