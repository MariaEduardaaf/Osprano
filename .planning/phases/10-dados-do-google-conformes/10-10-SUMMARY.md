---
phase: 10-dados-do-google-conformes
plan: 10
subsystem: crm-reads
tags: [scal-01, convex, crm]
requires: ["10-07"]
key-files:
  modified: ["src/app/(app)/crm/page.tsx", src/components/crm/today-strip.tsx, src/components/delete-lead-button.tsx]
metrics:
  tasks: 2
  completed: 2026-10-12
---

# Phase 10 Plan 10: CRM on listCrm Summary

Kanban, Today strip and delete now use `api.leads.listCrm`; optimistic updates (setStage, setNextAction, remove) retargeted. Cap notice at CRM_LIMIT; a lead opened via `?lead=` outside the loaded set is fetched with `api.leads.get` (hook called unconditionally with "skip").

## Commits
- f63e6db: crm/page.tsx
- 45dfdf2: today-strip.tsx, delete-lead-button.tsx

## Deviations
None. Did not open Next use-client.md (no directive change).

## Verification
- Root `tsc --noEmit`: clean; eslint on the 3 files: clean
- No `api.leads.list` left in CRM files
- `tests/*.test.ts`: one failure, in a lead-card.tsx source-scan test (expects google-card import), caused by plan 10-09's in-progress edit, not this plan.

## Self-Check: PASSED
