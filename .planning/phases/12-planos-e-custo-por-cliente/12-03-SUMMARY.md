---
phase: 12-planos-e-custo-por-cliente
plan: 03
subsystem: billing/trial
tags: [trial, plans, internal-commands]
requires: ["12-02"]
provides: [trialKey, claimTrial, orgIdForEmail, grantPlanFor, migrateFreeBatch, plans:grantPlan, plans:migrateFreeToTrial, plans:budgetStatus]
key-files:
  created: [convex/model/plans.ts, convex/plans.ts, tests/trial.test.ts]
  modified: [convex/workspaces.ts]
decisions:
  - "Trial mark = SHA-256 of trialEmail (strips +tag, Gmail dots); normalizeEmail untouched (suppression key)"
  - "Stripe cancel writes plan trial + trialSpent true"
metrics:
  tasks: 2
  completed: 2026-10-13
---

# Phase 12 Plan 03: One trial per person and internal commands Summary

`acceptTerms` claims a hashed-email trial mark that survives account purge; new accounts of the same person (or a recreated workspace with the same orgId) start with the trial spent; the owner has CLI-only `grantPlan`, `migrateFreeToTrial` and `budgetStatus`.

## Commits
- bc252ae: model (trialEmail/trialKey/claimTrial/orgIdForEmail/grantPlanFor/migrateFreeBatch) + tests
- f39b991: acceptTerms claims trial, applySubscription cancel -> spent trial, convex/plans.ts

## Deviations from Plan
None.

## Verification
- `node --experimental-strip-types --test tests/*.test.ts`: 505 pass, 0 fail
- `tsc --noEmit` (root and convex) and eslint on changed files: clean
- purge.ts and domain.ts unchanged. Internal commands NOT run against any deployment (plan 12-06).

## Pending
- Privacy (for the lawyer): the email hash is pseudonymized personal data kept after account deletion; legal texts not edited.
- Workspaces that accepted terms before this phase have no mark (accepted, small beta).
- Plan 06 must confirm at runtime whether Clerk's token carries `email` (else mark falls back to `via: "subject"`, which does not catch a new Clerk account).

## Self-Check: PASSED
