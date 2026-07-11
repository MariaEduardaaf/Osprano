# Deferred Items — Phase 01

## From plan 01-02 execution

- `pnpm typecheck` reports a pre-existing/concurrent error in `convex/model/tenant.ts`
  (`TS2739: ... missing DEMO_MODE, CONVEX_ENV`), caused by plan 01-03 (SEC-01) being
  executed concurrently in the same wave. Not caused by 01-02's changes
  (`convex/lib/stripe.ts`, `convex/http.ts`). Out of scope — left for plan 01-03's
  own execution/verification to resolve.
