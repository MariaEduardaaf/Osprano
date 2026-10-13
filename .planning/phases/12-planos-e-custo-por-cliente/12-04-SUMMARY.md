---
phase: 12-planos-e-custo-por-cliente
plan: 04
subsystem: billing/paid-callers
tags: [quota, budget, google, anthropic]
requires: ["12-02"]
provides: [withAiQuota, daily search cap on Text Search, budget on details, leads.create quota]
key-files:
  created: [convex/model/aiQuota.ts, tests/paid-calls.test.ts]
  modified: [convex/places.ts, convex/leads.ts, convex/outreach.ts]
metrics:
  tasks: 2
  completed: 2026-10-13
---

# Phase 12 Plan 04: Paid callers wired to quota and budget Summary

Google Text Search reserves daily searches plus USD before the fetch (unused pages refunded), details charge the global budget, AI generations reserve quota plus USD right before Anthropic (quota refunded on failure), and manual lead creation consumes 1 lead. A source-scan test blocks new unreserved paid callers.

## Commits
- 5d7cb9d: places.ts, leads.ts, paid-calls test (Task 1)
- 2bacf5d: aiQuota.ts, outreach.ts, test cases (Task 2)

## convex/outreach.ts lines touched (for ordering with Phase 13)
- import `withAiQuota` (after the tenant import)
- `draft`: `writeEmail(...)` wrapped in `withAiQuota(ctx, orgId, () => ...)`; arguments untouched
- `callScript`: `writeCallScript(...)` wrapped likewise; arguments untouched

## Deviations from Plan
None.

## Verification
- `node --experimental-strip-types --test tests/*.test.ts`: 505 pass, 0 fail
- `tsc --noEmit` (root and convex), eslint (full repo): clean
- outreach.ts diff: 9 changed lines

## Self-Check: PASSED
