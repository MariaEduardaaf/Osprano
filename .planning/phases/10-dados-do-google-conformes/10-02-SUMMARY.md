---
phase: 10-dados-do-google-conformes
plan: 02
subsystem: convex-schema-quota
tags: [convex, schema, quota, google-places]
requires: []
provides:
  - leads.confirmation, workspaces.detailsUsed (optional fields)
  - indexes by_org_country, by_org_saved, outreach.by_org_channel, previews.by_org_open
  - PlanDef.detailsPerMonth, UsageKind, reserveUsage/refundUsage kind "details"
key-files:
  modified:
    - convex/schema.ts
    - convex/lib/domain.ts
    - convex/model/workspace.ts
    - convex/workspaces.ts
  created:
    - tests/google-details-quota.test.ts
decisions:
  - "No lat/lng/locAt, no cron, name stays v.string() (per CONTEXT)"
  - "detailsPerMonth free 25 / pro 300 / agency 400; Phase 12 recalibrates"
requirements-completed: [GPLC-02, SCAL-01]
completed: 2026-10-12
---

# Phase 10 Plan 02: Schema and Google details quota Summary

Additive schema (optional fields and indexes only) plus a monthly Google details quota per plan, reserved before the call and refunded on failure, same pattern as leads and sites.

## Tasks
1. Schema: commit 67f28eb
2. Quota (TDD, tests written first and seen failing): see git log (feat(10-02): monthly Google details quota per plan)

## Verification
- `node --experimental-strip-types --test tests/*.test.ts`: 397 pass, 0 fail (includes 10-01 tests present in the tree)
- tsc root, tsc -p convex, eslint on changed files: clean

## Deviations from Plan
None. `reserveUsage`/`refundUsage` were simplified with a field map (`FIELD`) instead of ternaries.

## Notes
`convex/_generated/api.d.ts` shows as modified in the tree; it comes from plan 10-01, not touched here.
