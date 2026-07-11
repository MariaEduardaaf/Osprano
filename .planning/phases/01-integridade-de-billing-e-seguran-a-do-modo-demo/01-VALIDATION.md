---
phase: 1
slug: integridade-de-billing-e-seguran-a-do-modo-demo
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-11
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) via `node --experimental-strip-types --test` |
| **Config file** | none — `package.json` script `test` já roda `tests/*.test.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm typecheck && pnpm lint && pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm typecheck && pnpm lint && pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green + `pnpm build`
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

*(Preenchido pelo planner ao criar os PLAN.md.)*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01 · Task 1 | 01-01 | 1 | BILL-01, BILL-02 | unit + typecheck | `pnpm test` (clampDiscoveryCount em tests/domain.test.ts) + `pnpm typecheck` (guarda reserveUsage, refundUsage, refund mutation) | ✅ | ⬜ pending |
| 01-01 · Task 2 | 01-01 | 1 | BILL-01, BILL-02 | typecheck + review | `pnpm typecheck` (places.ts: clamp + reconciliação want-inserted) | ✅ | ⬜ pending |
| 01-01 · Task 3 | 01-01 | 1 | BILL-01, BILL-02 | typecheck + review | `pnpm typecheck` (foursquare.ts: clamp único + reconciliação) | ✅ | ⬜ pending |
| 01-02 · Task 1 | 01-02 | 1 | BILL-03 | unit | `pnpm test` (planForPrice em tests/stripe.test.ts) | ❌ W0 → criado na task | ⬜ pending |
| 01-02 · Task 2 | 01-02 | 1 | BILL-03 | typecheck + review | `pnpm typecheck` (http.ts: StripeObj.items + planForPrice no subscription.updated/deleted) | ✅ | ⬜ pending |
| 01-03 · Task 1 | 01-03 | 1 | SEC-01 | unit + grep | `pnpm test` (isDemoEnabled default-deny em tests/tenant.test.ts) + grep `CONVEX_ENV === "development"` | ❌ W0 → criado na task | ⬜ pending |
| 01-03 · Task 2 | 01-03 | 1 | SEC-01 | grep + typecheck + lint | grep das guardas (demo.ts: isDemoEnabled; proxy.ts: NODE_ENV) + `pnpm typecheck && pnpm lint` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements (node:test já configurado; novos arquivos `tests/*.test.ts` são detectados pelo glob do script). As funções puras novas (`clampDiscoveryCount`, `planForPrice`, `isDemoEnabled`) e seus testes são criados dentro das Task 1 de cada plano (RED→GREEN), sem gap de infraestrutura.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Estorno de quota após falha do fetch externo | BILL-02 | Exige ctx Convex + API externa; sem harness de integração no repo | Revisão de código do try/catch no action (estorno = `want - inserted`, nunca `want` cego) + typecheck |
| reserveUsage/refundUsage sobre ctx | BILL-01/BILL-02 | Dependem de MutationCtx; sem framework de teste Convex (decisão: sem dependência nova) | Grep das guardas + `Math.max(0, used - count)` + typecheck |
| Webhook Stripe com price_id real | BILL-03 | Exige evento assinado do Stripe | `stripe trigger customer.subscription.updated` em ambiente dev (pós-fase) |
| Guarda do demo no Next em produção | SEC-01 | Comportamento depende de NODE_ENV do processo Next | `NODE_ENV=production pnpm build && pnpm start` com `NEXT_PUBLIC_DEMO=1` → rota protegida exige login |
| Guarda do demo no backend Convex | SEC-01 | CONVEX_ENV é env do deployment | Teste unitário de `isDemoEnabled` (default-deny) + grep; `demo:seed` sem CONVEX_ENV=development lança "DEMO_MODE desligado" |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (funções/testes criados nas Task 1 de cada plano)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
