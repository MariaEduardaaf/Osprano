---
phase: 01-integridade-de-billing-e-seguran-a-do-modo-demo
plan: 02
subsystem: payments
tags: [stripe, webhooks, billing, node-test]

# Dependency graph
requires: []
provides:
  - "planForPrice(priceId) — pure price_id -> plan mapper in convex/lib/stripe.ts"
  - "convex/http.ts subscription.updated/deleted branch derives plan from the subscription's current price_id instead of stale metadata.plan"
affects: [billing, stripe-webhook, workspace-plan]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure, side-effect-free Stripe helpers in convex/lib/stripe.ts (no _generated/* import) — testable with plain node:test, no Convex runtime needed"
    - "Fail-safe env-based price->plan mapping: unknown price_id returns undefined so the caller (applySubscription) keeps the current plan instead of guessing/downgrading"

key-files:
  created:
    - tests/stripe.test.ts
  modified:
    - convex/lib/stripe.ts
    - convex/http.ts

key-decisions:
  - "planForPrice only reads process.env.STRIPE_PRICE_PRO/AGENCY (mirrors billing.ts:priceFor) — no new config surface"
  - "checkout.session.completed intentionally left reading metadata.plan (Stripe Checkout Session payload has no line items); only customer.subscription.updated/deleted were changed to read items.data[0].price.id"

patterns-established:
  - "Webhook plan derivation is event-type-specific: checkout uses metadata, subscription lifecycle events use the live price_id"

requirements-completed: [BILL-03]

# Metrics
duration: 2min
completed: 2026-07-11
---

# Phase 1 Plan 2: Stripe Webhook Plan Derivation Summary

**Stripe webhook now derives the workspace plan from the subscription's live `price_id` (via `STRIPE_PRICE_PRO`/`STRIPE_PRICE_AGENCY`) on `customer.subscription.updated`/`.deleted`, instead of stale `metadata.plan`, so Billing Portal upgrades/downgrades actually take effect.**

## Performance

- **Duration:** ~2 min (commit-to-commit)
- **Started:** 2026-07-11T05:24:48+02:00
- **Completed:** 2026-07-11T05:25:53+02:00
- **Tasks:** 2 completed
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Added `planForPrice` — pure inverse of `billing.ts:priceFor`, mapping a Stripe `price_id` to `"pro" | "agency" | undefined`, fail-safe on unknown price
- `customer.subscription.updated`/`.deleted` webhook branch now derives the plan from `obj.items.data[0].price.id` via `planForPrice`, fixing BILL-03 (Billing Portal upgrades/downgrades were previously ignored because they don't touch `metadata.plan`)
- `checkout.session.completed` behavior preserved exactly (still reads `metadata.plan`, since the Session payload carries no line items)
- 5 unit tests covering pro/agency/unknown/undefined/empty-string cases for `planForPrice`

## Task Commits

Each task was committed atomically (TDD for Task 1):

1. **Task 1: Helper puro planForPrice + testes**
   - `a72a9f7` test(01-02): add failing tests for planForPrice (RED)
   - `7f17fda` feat(01-02): add planForPrice helper for Stripe price->plan mapping (GREEN)
2. **Task 2: Webhook deriva o plano do price_id em subscription.updated/deleted** - `b858821` (fix)

_Note: Task 1 used TDD (RED -> GREEN); no refactor commit needed, implementation matched plan exactly._

## Files Created/Modified
- `convex/lib/stripe.ts` - Added `planForPrice(priceId)`: reads `STRIPE_PRICE_PRO`/`STRIPE_PRICE_AGENCY`, returns `undefined` on unknown/empty/undefined input
- `convex/http.ts` - `StripeObj` interface extended with optional `items.data[].price.id`; `planForPrice` imported; `customer.subscription.updated`/`.deleted` branch now sets `plan: planForPrice(obj.items?.data?.[0]?.price?.id)` instead of `plan: obj.metadata?.plan`; `checkout.session.completed` branch untouched
- `tests/stripe.test.ts` (new) - 5 cases: PRO, AGENCY, unknown price (fail-safe), undefined, empty string

## Decisions Made
- Kept `planForPrice` reading only the two existing env vars (`STRIPE_PRICE_PRO`/`STRIPE_PRICE_AGENCY`) already used by `billing.ts:priceFor` — no new configuration introduced.
- Did not touch `applySubscription` (`convex/workspaces.ts`) — it already treats `plan: undefined` as "keep current plan," which is exactly the fail-safe behavior needed when `planForPrice` can't resolve a price.
- Did not add a Stripe API re-fetch or expand `items` server-side — relied on the documented fact that `items.data[0].price.id` is always present, non-expandable, on `customer.subscription.*` webhook payloads.

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched their specified interfaces, action blocks, and acceptance criteria verbatim.

### Out-of-scope items observed (not fixed, logged only)

`pnpm typecheck` and `pnpm test` (full-suite) surfaced failures from **unrelated, concurrently-in-progress files**: `convex/model/tenant.ts` (missing `isDemoEnabled` export / `ProcessEnv` type mismatch) and `tests/tenant.test.ts`. These belong to plan 01-03 (SEC-01), which was executing in parallel (wave 1, `depends_on: []`) in the same working tree at the time this plan ran. Per scope boundary, these were **not** touched here — logged in `.planning/phases/01-integridade-de-billing-e-seguran-a-do-modo-demo/deferred-items.md`. Verification for this plan was scoped to the files it owns (`convex/lib/stripe.ts`, `convex/http.ts`, `tests/stripe.test.ts`):
- `node --experimental-strip-types --test tests/stripe.test.ts` — 5/5 pass
- `pnpm lint convex/lib/stripe.ts convex/http.ts tests/stripe.test.ts` — clean
- Full-project `pnpm typecheck` has exactly one error, isolated to `convex/model/tenant.ts` (not a file this plan modifies)

## Issues Encountered
- Running the full `pnpm test`/`pnpm typecheck` scripts picked up failures from a concurrently-executing sibling plan's in-progress files (`convex/model/tenant.ts`, `tests/tenant.test.ts`). Resolved by scoping verification to this plan's own files (see above) rather than treating them as regressions introduced here. No code changes were made to those files.

## User Setup Required

None - no external service configuration required. (Existing `STRIPE_PRICE_PRO`/`STRIPE_PRICE_AGENCY`/`STRIPE_WEBHOOK_SECRET` env vars, already required by `convex/billing.ts` and `convex/http.ts`, are unchanged.)

## Next Phase Readiness
- BILL-03 is closed: Billing Portal-driven upgrades/downgrades now correctly update the workspace plan.
- End-to-end verification against a live/staging Stripe webhook (e.g., `stripe trigger customer.subscription.updated`) is explicitly out of scope per the plan's `<verification>` section (manual-only, post-fase).
- No blockers for plan 01-03; note that `convex/http.ts` is also touched by Phase 2 (COMP-02, unsubscribe endpoint) — sequential execution avoids merge conflicts, as already reflected in STATE.md blockers/concerns.

---
*Phase: 01-integridade-de-billing-e-seguran-a-do-modo-demo*
*Completed: 2026-07-11*

## Self-Check: PASSED

All created/modified files confirmed present on disk; all 3 task commits (`a72a9f7`, `7f17fda`, `b858821`) confirmed present in git history.
