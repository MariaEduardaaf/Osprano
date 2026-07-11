---
phase: 01-integridade-de-billing-e-seguran-a-do-modo-demo
plan: 01
subsystem: payments
tags: [convex, billing, quota, discovery, node-test]

# Dependency graph
requires: []
provides:
  - "clampDiscoveryCount — shared pure clamp for the discovery `max` param (default 20, floor 1, ceiling 50)"
  - "reserveUsage defense-in-depth guard (rejects non-integer or < 1 count)"
  - "refundUsage / internalMutation refund — reconciliation primitive, clamps counter at 0"
  - "places.ts and foursquare.ts now reconcile reserved quota with leads actually inserted"
affects: [billing, discovery, quota]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "reserve-before-fetch, refund(want - inserted) after — try/catch around fetch+insert loop, refund on both partial success and thrown error"

key-files:
  created: []
  modified:
    - convex/lib/domain.ts
    - convex/model/workspace.ts
    - convex/workspaces.ts
    - convex/places.ts
    - convex/foursquare.ts
    - tests/domain.test.ts

key-decisions:
  - "NaN/Infinity in clampDiscoveryCount falls back to the default (20), not the floor (1) — Math.max(NaN,1) is NaN in JS, guarded via Number.isFinite before clamping"
  - "Refund amount is always `want - inserted` (never a fixed `want`), covering both zero-insert failures and partial-insert failures"

requirements-completed: [BILL-01, BILL-02]

duration: ~15min
completed: 2026-07-11
---

# Phase 01 Plan 01: Quota Integrity for Lead Discovery Summary

**Shared `clampDiscoveryCount` (floor 1, ceiling 50) plus `refundUsage`/`internal.workspaces.refund` reconciliation wired into both `places.ts` and `foursquare.ts`, so billed quota always equals leads actually inserted and the usage counter never goes negative.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-07-11T03:28Z
- **Tasks:** 3/3
- **Files modified:** 6

## Accomplishments
- Fixed BILL-01: `foursquare.search` no longer sends a negative/zero count to `reserveUsage` — count is computed once via `clampDiscoveryCount` (floor 1) and reused for both the reserve call and the URL `limit` param (previously duplicated and unfloored).
- Fixed BILL-02: both `places.search` and `foursquare.search` now refund `want - inserted` after the fetch+insert loop (partial success) and in the `catch` block (total failure), so quota billed always matches leads delivered.
- Added defense-in-depth: `reserveUsage` throws on non-integer or `< 1` count, independent of what callers pass.
- Added `refundUsage`/`internal.workspaces.refund`, mirroring the existing `reserveUsage`/`internal.workspaces.reserve` pair, with `Math.max(0, used - count)` so the counter can never go negative.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fundação — clampDiscoveryCount + guarda no reserveUsage + refundUsage + internalMutation refund** - `452a613` (feat, TDD RED→GREEN)
2. **Task 2: Reconciliação de quota em places.ts (Google Places)** - `455cea2` (fix)
3. **Task 3: Clamp + reconciliação de quota em foursquare.ts** - `f18741c` (fix)

**Plan metadata:** (this commit)

## Files Created/Modified
- `convex/lib/domain.ts` - Added `clampDiscoveryCount(max?: number): number`
- `convex/model/workspace.ts` - Added count guard to `reserveUsage`; added `refundUsage`
- `convex/workspaces.ts` - Added `internalMutation refund` mirroring `reserve`
- `convex/places.ts` - Uses `clampDiscoveryCount`; wraps fetch+insert in try/catch; refunds `want - inserted`
- `convex/foursquare.ts` - Fixed unfloored/duplicated clamp (BILL-01); wraps fetch+insert in try/catch; refunds `want - inserted`
- `tests/domain.test.ts` - 7 new `clampDiscoveryCount` cases (default, floor, ceiling, rounding, NaN, exact boundaries)

## Decisions Made
- NaN/Infinity in `clampDiscoveryCount` falls back to the default (20) rather than the floor (1), per the plan's explicit note that `Math.max(NaN, 1)` evaluates to `NaN` in JS — guarded with `Number.isFinite` before clamping.
- Refund amount is always computed as `want - inserted` at each call site (never a fixed `want`), so it correctly covers both a total failure (inserted = 0 → refund everything reserved) and a partial failure mid-loop (refund only the difference).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Concurrent execution note (not a deviation in my own work):** Plans 01-02 and 01-03 of this same phase (wave 1, `depends_on: []`) executed concurrently in the same working directory. At one point `pnpm typecheck` failed with a `convex/model/tenant.ts` type error caused by 01-02's in-progress work (the other plan's own `deferred-items.md` explicitly notes this and attributes it to me — a mislabel, since this plan is BILL-01/BILL-02, not SEC-01). No file in this plan's scope (`convex/lib/domain.ts`, `convex/model/workspace.ts`, `convex/workspaces.ts`, `convex/places.ts`, `convex/foursquare.ts`, `tests/domain.test.ts`) was affected, and the error resolved itself once 01-02 completed. All git staging in this plan was scoped explicitly to the plan's own files (never `git add -A`) to avoid interfering with the other concurrently-running plans. `pnpm test`/`pnpm typecheck`/`pnpm lint` all pass cleanly as of the final commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- BILL-01 and BILL-02 closed; discovery quota is now billed accurately and the usage counter is guarded against negative values.
- No public API/action signature changes — UI is untouched, `{ found, inserted }` shape preserved on both actions.
- Ready for 01-02 (BILL-03, Stripe plan derivation) and 01-03 (demo-mode env guard) to land independently — no shared files with this plan.

---
*Phase: 01-integridade-de-billing-e-seguran-a-do-modo-demo*
*Completed: 2026-07-11*

## Self-Check: PASSED

All 7 expected files found on disk; all 3 task commits (452a613, 455cea2, f18741c) found in git history.
