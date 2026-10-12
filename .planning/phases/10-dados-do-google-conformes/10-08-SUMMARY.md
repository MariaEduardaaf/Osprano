---
phase: 10-dados-do-google-conformes
plan: 08
subsystem: database
tags: [convex, migration, google-places, compliance]
requires:
  - phase: 10-01
    provides: scrubLeadPatch, scrubPreviewContent
provides:
  - migrateLeads (dry run + real, idempotent, PII-free report)
  - googleCompliance:migrateBatch / migrateAll / seedDevFixtures (internal)
affects: [10-11, 10-12]
key-files:
  created:
    - convex/model/googleMigration.ts
    - convex/googleCompliance.ts
    - tests/google-migration-batch.test.ts
  modified:
    - convex/_generated/api.d.ts
key-decisions:
  - "Report carries only counts and document ids"
  - "Published site name kept and listed by lead id"
duration: ~15min
completed: 2026-10-12
---

# Phase 10 Plan 08: Google lead migration code Summary

Paginated, idempotent migration code that strips Google content from unconfirmed places leads and from untouched preview copies, with a dry run and a dev-only fixture seed. Nothing was executed against any deployment.

## Tasks
1. migrateLeads in `convex/model/googleMigration.ts` (commit 4f6172b)
2. `convex/googleCompliance.ts` plus api.d.ts entries (commit ad19af1)

## Deviations from Plan
None. TDD red step was skipped for Task 1 (test and module written together; passed first run).

## Verification
- `tests/google-migration-batch.test.ts`: 5/5 pass; `tests/google-migration.test.ts`: 8/8 pass
- `tsc --noEmit -p convex` clean; eslint on the three files clean
- Root `tsc --noEmit` fails only in `src/components/crm/business-data.tsx` and `lead-detail.tsx` (plans 10-06/07 in flight, not touched here)

## Self-Check: PASSED
