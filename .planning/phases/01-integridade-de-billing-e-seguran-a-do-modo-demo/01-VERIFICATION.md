---
phase: 01-integridade-de-billing-e-seguran-a-do-modo-demo
verified: 2026-07-11T05:45:00Z
status: passed
score: 4/4 must-haves verified
---

# Phase 1: Integridade de Billing e Segurança do Modo Demo Verification Report

**Phase Goal:** A contagem de quota do plano é íntegra (não pode ir negativa nem ser cobrada por mais do que foi entregue), o plano do workspace reflete o estado real da subscription no Stripe, e o modo demo não consegue desligar a autenticação fora de ambiente de desenvolvimento.
**Verified:** 2026-07-11T05:45:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `foursquare.search` com `max` zero, negativo ou ausente nunca resulta em quota negativa — count com piso e `reserveUsage` rejeita `count <= 0` | ✓ VERIFIED | `clampDiscoveryCount` (`convex/lib/domain.ts:275-279`) floors at 1, ceils at 50, defaults NaN/Infinity to 20. `foursquare.ts:43` computes `want` once, reused at the reserve call (`:48`) and the URL `limit` param (`:57`) — the old duplicated/unfloored `Math.min(args.max ?? 20, 50)` is gone. `reserveUsage` guard (`convex/model/workspace.ts:47-49`) throws on non-integer or `< 1`. `tests/domain.test.ts` has 7 green cases (default 20, floor 1 for -5/0, NaN→20, 3.6→4, ceiling 50, exact boundaries 1/50). |
| 2 | Após uma busca, a quota debitada = leads efetivamente inseridos (excedente estornado); falha total do fetch estorna a reserva inteira | ✓ VERIFIED | `places.ts:122-133` and `foursquare.ts:91-101` both wrap the fetch+insert loop in try/catch; `catch` refunds `want - inserted` (inserted=0 on total failure → refunds everything reserved); success path refunds any `leftover = want - inserted` after the loop (partial success). `refundUsage` (`convex/model/workspace.ts:64-75`) clamps at `Math.max(0, used - count)` so `leadsUsed`/`sitesUsed` can never go negative. `internal.workspaces.refund` mirrors `reserve` (`convex/workspaces.ts:39-48`). |
| 3 | Upgrade/downgrade pelo Stripe Billing Portal atualiza o plano derivado do `price_id` (mapa `STRIPE_PRICE_PRO`/`AGENCY`), sem depender de `metadata.plan` | ✓ VERIFIED | `planForPrice` (`convex/lib/stripe.ts:26-31`) maps `price_id` → `pro`/`agency`/`undefined` (fail-safe on unknown). `convex/http.ts:48` — `customer.subscription.updated`/`.deleted` branch (`:42-55`) computes `derivedPlan = planForPrice(obj.items?.data?.[0]?.price?.id)` and passes it to `applySubscription`, instead of the stale `metadata.plan`. `checkout.session.completed` branch (`:35-41`) is untouched — still reads `metadata.plan` (Session payload carries no line items, as documented). `applySubscription` (`convex/workspaces.ts:73-85`) already treats `plan: undefined` as "keep current plan" — unknown price never causes an accidental downgrade. `tests/stripe.test.ts` has 5 green cases (pro, agency, unknown→undefined, undefined, empty string). |
| 4 | Com deployment de produção, `NEXT_PUBLIC_DEMO=1`/`DEMO_MODE=1` não desligam auth nem ativam seed demo (backend default-deny via `CONVEX_ENV === "development"`; Next proxy via `NODE_ENV !== "production"`) | ✓ VERIFIED | `isDemoEnabled` (`convex/model/tenant.ts:6-8`): `DEMO_MODE === "1" && CONVEX_ENV === "development"` (default-deny, not `!== "production"`). `requireOrgId` (`:19`) and `demo.seed` (`convex/demo.ts:134`, imported at `:5`) both use the same helper — single source of truth. `src/proxy.ts:27-29`: `demoProxy` only selected when `NEXT_PUBLIC_DEMO === "1" && process.env.NODE_ENV !== "production"`, else `clerkProxy`. `tests/tenant.test.ts` has 5 green cases, including the critical one: `CONVEX_ENV` unset + `DEMO_MODE=1` → `false`. README.md (`:99,111-114`) and `.env.example` (`:32`) document the operational `CONVEX_ENV=development` step. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `convex/lib/domain.ts` | `clampDiscoveryCount` — floor 1, ceiling 50, rounds, non-finite guard | ✓ VERIFIED | Present at line 275, exact match to plan spec, `Number.isFinite` guard present. |
| `convex/model/workspace.ts` | `reserveUsage` guard + `refundUsage` with 0-clamp | ✓ VERIFIED | Guard at 47-49, `refundUsage` at 64-75, `Math.max(0, used - count)` present. |
| `convex/workspaces.ts` | `internalMutation refund` mirroring `reserve` | ✓ VERIFIED | Present at 39-48, same validator shape as `reserve`. |
| `convex/places.ts` | discovery with clamp + quota reconciliation | ✓ VERIFIED | `clampDiscoveryCount(args.max)` at :46; try/catch + `want - inserted` refund at :122-133. |
| `convex/foursquare.ts` | discovery with clamp (once) + quota reconciliation | ✓ VERIFIED | `want` computed once at :43, reused at :48/:57; try/catch + `want - inserted` refund at :91-101. |
| `tests/domain.test.ts` | `clampDiscoveryCount` cases | ✓ VERIFIED | 7 cases present, all passing. |
| `convex/lib/stripe.ts` | `planForPrice` — price_id → plan map, undefined on unknown | ✓ VERIFIED | Present at 26-31, reads `STRIPE_PRICE_PRO`/`STRIPE_PRICE_AGENCY`. |
| `convex/http.ts` | `StripeObj` extended with `items` + subscription branch uses `planForPrice` | ✓ VERIFIED | Interface extended at :12, `planForPrice(...)` used at :48; checkout branch unchanged. |
| `tests/stripe.test.ts` | `planForPrice` cases (PRO, AGENCY, unknown, undefined) | ✓ VERIFIED | 5 cases present, all passing. |
| `convex/model/tenant.ts` | `isDemoEnabled` (env-injectable) + `requireOrgId` using it | ✓ VERIFIED | Helper at 6-8, `requireOrgId` uses it at :19. |
| `convex/demo.ts` | `seed` guarded by `isDemoEnabled` | ✓ VERIFIED | Import at :5, guard at :134 (`if (!isDemoEnabled())`). |
| `src/proxy.ts` | `demoProxy` only outside production (`NODE_ENV` guard) | ✓ VERIFIED | Guard at :27, `NODE_ENV !== "production"` present. |
| `tests/tenant.test.ts` | `isDemoEnabled` cases (default-deny) | ✓ VERIFIED | 5 cases present, all passing, including default-deny critical case. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `convex/places.ts` | `internal.workspaces.refund` | `want - inserted` refund in catch + success-partial | ✓ WIRED | Two call sites confirmed (:125 catch, :132 success leftover). |
| `convex/foursquare.ts` | `internal.workspaces.refund` | `want - inserted` refund in catch + success-partial | ✓ WIRED | Two call sites confirmed (:94 catch, :101 success leftover). |
| `convex/model/workspace.ts:refundUsage` | `leadsUsed`/`sitesUsed` | `Math.max(0, used - count)` patch | ✓ WIRED | Confirmed at :73. |
| `convex/http.ts` | `planForPrice` | `subscription.updated/.deleted` branch | ✓ WIRED | Confirmed at :48, imported at :4. |
| `convex/lib/stripe.ts:planForPrice` | `STRIPE_PRICE_PRO`/`STRIPE_PRICE_AGENCY` | env var comparison | ✓ WIRED | Confirmed at :28-29. |
| `convex/demo.ts` | `isDemoEnabled` | import + guard in `seed` handler | ✓ WIRED | Import :5, guard :134. |
| `src/proxy.ts` | `clerkProxy` | `NEXT_PUBLIC_DEMO==='1' && NODE_ENV!=='production' ? demoProxy : clerkProxy` | ✓ WIRED | Confirmed at :27-29. |
| `convex/model/tenant.ts:isDemoEnabled` | `CONVEX_ENV` | `DEMO_MODE==='1' && CONVEX_ENV==='development'` | ✓ WIRED | Confirmed at :7. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| BILL-01 | 01-01-PLAN | Nenhuma chamada consegue negativar a quota | ✓ SATISFIED | `clampDiscoveryCount` floor 1 + `reserveUsage` non-integer/<1 guard. |
| BILL-02 | 01-01-PLAN | Quota debitada = leads inseridos, excedente estornado | ✓ SATISFIED | `refund(want - inserted)` wired in both `places.ts` and `foursquare.ts`, catch + success paths. |
| BILL-03 | 01-02-PLAN | Upgrade/downgrade pelo Billing Portal reflete no workspace | ✓ SATISFIED | `planForPrice` + `http.ts` subscription branch; `checkout.session.completed` preserved. |
| SEC-01 | 01-03-PLAN | Modo demo inerte em produção (default-deny) | ✓ SATISFIED | `isDemoEnabled` centralizes backend check (default-deny `CONVEX_ENV`); `proxy.ts` `NODE_ENV` guard. |

No orphaned requirements: REQUIREMENTS.md maps exactly these 4 IDs to Phase 1, and all 4 appear in the three plans' `requirements` frontmatter.

### Anti-Patterns Found

None. Scanned all 10 phase-touched files (`convex/lib/domain.ts`, `convex/model/workspace.ts`, `convex/workspaces.ts`, `convex/places.ts`, `convex/foursquare.ts`, `convex/lib/stripe.ts`, `convex/http.ts`, `convex/model/tenant.ts`, `convex/demo.ts`, `src/proxy.ts`) for TODO/FIXME/XXX/HACK/PLACEHOLDER/"coming soon" markers — zero matches. No empty implementations, no stub returns, no console.log-only handlers.

### Automated Verification Evidence

```
pnpm typecheck  → exit 0 (tsc --noEmit, clean)
pnpm lint       → exit 0 (eslint, clean)
pnpm test       → 30/30 pass (0 fail, 0 skipped)
                    - 7 clampDiscoveryCount cases (tests/domain.test.ts)
                    - 5 planForPrice cases (tests/stripe.test.ts)
                    - 5 isDemoEnabled cases (tests/tenant.test.ts)
                    - remaining cases from pre-existing domain.test.ts suite (classifyWebsite, computeScore, isEmailable, etc.)
```

All 8 task commits referenced in the three SUMMARY.md files (`452a613`, `455cea2`, `f18741c`, `a72a9f7`, `7f17fda`, `b858821`, `fafa041`, `868bbe7`) confirmed present in git history.

### Human Verification Required

The following are optional, environment-dependent smoke tests explicitly called out as manual-only in the plans' own `<verification>` sections (no automated harness exists for live Stripe webhooks or a full production Next.js build in this environment). Code-level verification (static review + unit tests + typecheck) already fully validates the logic paths; these are recommended for extra confidence before a real production deploy, not blockers to this phase's goal.

1. **Stripe Billing Portal live webhook**
   **Test:** `stripe trigger customer.subscription.updated` against a workspace with a known `stripeCustomerId`, subscription on a `STRIPE_PRICE_AGENCY` price.
   **Expected:** Workspace `plan` field updates to `"agency"` in the DB.
   **Why human:** Requires a live/staging Stripe account and webhook secret; no harness in this repo simulates the full webhook round-trip.

2. **Production build demo kill-switch**
   **Test:** `NODE_ENV=production pnpm build && pnpm start` with `NEXT_PUBLIC_DEMO=1` set, then visit a protected route (e.g. `/dashboard`).
   **Expected:** Redirected to Clerk login (proxy resolves to `clerkProxy`, not `demoProxy`).
   **Why human:** Requires a real production build/serve cycle; static analysis already confirms the ternary logic (`NODE_ENV !== "production"`) is correct.

3. **Convex deployment default-deny for `demo:seed`**
   **Test:** On a Convex deployment without `CONVEX_ENV` set, run `npx convex run demo:seed` with `DEMO_MODE=1` set.
   **Expected:** Throws `"DEMO_MODE desligado"`.
   **Why human:** Requires a live Convex deployment; unit tests already prove `isDemoEnabled` returns `false` for this exact env combination in isolation.

### Gaps Summary

None. All 4 observable truths verified, all 13 required artifacts exist/substantive/wired, all 8 key links wired, all 4 requirement IDs satisfied with no orphans, zero anti-patterns, and `pnpm typecheck && pnpm lint && pnpm test` all pass clean (30/30 tests). The three plans' code matches their documented interfaces character-for-character. Phase goal achieved.

---

*Verified: 2026-07-11T05:45:00Z*
*Verifier: Claude (gsd-verifier)*
