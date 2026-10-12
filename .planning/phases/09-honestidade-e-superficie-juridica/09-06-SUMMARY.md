---
phase: 09-honestidade-e-superficie-juridica
plan: 06
subsystem: legal
tags: [legal, gdpr, convex, stripe, clerk]
requires: [09-01]
provides:
  - stripeDelete, purgeOrgBatch, account.deleteMyAccount/purgeBatch
  - DELETE /api/account/clerk
  - DeleteAccount UI in Ajustes
key-files:
  created: [convex/model/purge.ts, convex/account.ts, src/app/api/account/clerk/route.ts, src/components/delete-account.tsx, tests/purge.test.ts]
  modified: [convex/lib/stripe.ts, tests/stripe.test.ts, convex/_generated/api.d.ts, "src/app/(app)/settings/page.tsx"]
metrics:
  tasks: 3
  completed: 2026-10-12
---

# Phase 9 Plan 06: Exclusao de conta Summary

Exclusao em tres passos reexecutaveis: Stripe cancelado antes, Convex limpo em lotes (preserva supressao global e outras orgs), login Clerk removido por rota do Next.

## Commits
- 42fb873: stripeDelete + purgeOrgBatch + testes
- f58cbf9: deleteMyAccount, api.d.ts, rota Clerk
- e30e29b: UI DeleteAccount em Ajustes

## Deviations from Plan
None. Nota: o seed do teste de purge precisou de _id em todas as linhas (o fakeCtx apaga por _id).

## Verification
Suite completa 390/390; tsc raiz e -p convex verdes; eslint verde. Ponta a ponta (Stripe teste + Clerk) fica no plano 07. Nao li a doc de route.md do Next: a rota usa so o padrao DELETE exportado.

## Self-Check: PASSED
