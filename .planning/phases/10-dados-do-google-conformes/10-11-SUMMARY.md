---
phase: 10-dados-do-google-conformes
plan: 11
subsystem: convex-migration
tags: [scal-01, gplc-04, convex]
requires: ["10-08", "10-09", "10-10"]
key-files:
  modified: [convex/leads.ts, tests/google-scal.test.ts]
  created: [.planning/phases/10-dados-do-google-conformes/10-DEV-DRYRUN.md]
metrics:
  tasks: 2
  completed: 2026-10-12
---

# Phase 10 Plan 11: leads.list removed, DEV migration rehearsal Summary

`leads.list` deleted (no `.collect()` left in `convex/leads.ts`), and the Google-compliance migration rehearsed on the DEV deployment with backup first: dry1, real, dry2 (leadsCleaned 0, previewsCleaned 0).

## Commits
- f040a2f: remove leads.list, add guard tests
- Task 2 produced no code changes (codegen had no diff); only 10-DEV-DRYRUN.md, committed with docs.

## Results
- Gate: 468 tests pass, tsc x2, eslint, next build all 0.
- `convex dev --once` accepted schema and functions; 4 new indexes created.
- Backup: `/Users/madu/Backups/osprano/osprano-dev-backup-20261012-2050.zip` (203978 bytes).
- Index checks with undefined: global suppression true, other org false, listCrm returned 6 incl. 1 lead without `saved`.
- dry1 = real: leadsCleaned 3, previewsCleaned 3, publishedNameKept 1, previewsChangedWithSentOutreach 1. dry2: 0 / 0.

## Deviations
None. Note: the DEV had 50 leads scanned (beyond the 6 seeded), so the rehearsal ran on real dev data too.

## Self-Check: PASSED
