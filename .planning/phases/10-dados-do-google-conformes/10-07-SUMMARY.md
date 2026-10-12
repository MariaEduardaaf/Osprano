---
phase: 10-dados-do-google-conformes
plan: 07
subsystem: convex-reads
tags: [scal-01, pagination, convex]
requires: ["10-02", "10-04", "10-05"]
provides: [listForDiscovery, listCrm, CRM_LIMIT, STATS_LIMIT]
key-files:
  modified: [convex/leads.ts, convex/lib/domain.ts, "src/app/(app)/dashboard/page.tsx", convex/previews.ts, convex/outreach.ts, convex/suppressions.ts]
  created: [tests/google-scal.test.ts]
decisions:
  - "leads.list kept, marked @deprecated (removed in 10-11)"
  - "Google Places removed from insertDiscovered source union"
metrics:
  tasks: 2
  completed: 2026-10-12
---

# Phase 10 Plan 07: SCAL-01 server reads Summary

Server-side reads bounded by index: paginated `listForDiscovery`, capped `listCrm` (1000), `stats`/`analytics` with `take(5000)` + `truncated`, and `listSites`/`outbox`/`isEmailSuppressed` without `.collect()`.

## Commits
- d8efb31: leads.ts, domain limits, dashboard "5000+", static-scan test
- 4d4f680: previews/outreach/suppressions

## Deviations from Plan
None to the code. I did not open the Next `use-client.md` doc, because the dashboard edit is a one-line change in an existing client component.

## Verification
- `node --test tests/*.test.ts`: 465 pass, 0 fail
- `tsc --noEmit -p convex`: clean
- eslint on all touched files: clean
- Root `tsc --noEmit` shows errors only in `src/components/crm/business-data.tsx` and `lead-detail.tsx`. These are plan 10-06/10-08 work in progress, not from this plan. My files compile.
- Not verified against a live Convex dev: `withIndex(..., eq("saved", undefined))` matching legacy docs (plan 10-11 checks this).

## Self-Check: PASSED
