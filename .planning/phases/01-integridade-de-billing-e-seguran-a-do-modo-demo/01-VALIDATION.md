---
phase: 1
slug: integridade-de-billing-e-seguran-a-do-modo-demo
status: draft
nyquist_compliant: false
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
| — | — | — | BILL-01 | unit | `pnpm test` (casos de clamp em tests/domain.test.ts) | ✅ | ⬜ pending |
| — | — | — | BILL-02 | typecheck + review | `pnpm typecheck` | ✅ | ⬜ pending |
| — | — | — | BILL-03 | unit | `pnpm test` (planForPrice em tests/domain.test.ts ou tests/stripe.test.ts) | ✅ / ❌ W0 | ⬜ pending |
| — | — | — | SEC-01 | unit + grep | `pnpm test` + grep das guardas | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements (node:test já configurado; novos arquivos `tests/*.test.ts` são detectados pelo glob do script).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Estorno de quota após falha do fetch externo | BILL-02 | Exige ctx Convex + API externa; sem harness de integração no repo | Revisão de código do try/catch no action + typecheck |
| Webhook Stripe com price_id real | BILL-03 | Exige evento assinado do Stripe | `stripe trigger customer.subscription.updated` em ambiente dev (pós-fase) |
| Guarda do demo em produção | SEC-01 | Comportamento depende de env do deployment | Grep das guardas + teste unitário do helper puro se extraído |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
