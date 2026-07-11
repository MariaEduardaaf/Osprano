---
phase: 2
slug: compliance-de-email-e-whatsapp
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-11
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) via `node --experimental-strip-types --test` |
| **Config file** | none — `package.json` script `test` roda `tests/*.test.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm typecheck && pnpm lint && pnpm test` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm typecheck && pnpm lint && pnpm test`
- **Before `/gsd:verify-work`:** Full suite green + `pnpm build`
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

*(Preenchido pelo planner ao criar os PLAN.md.)*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| — | — | — | COMP-01 | unit (normalizeEmail) + typecheck | `pnpm test` + `pnpm typecheck` | ✅ | ⬜ pending |
| — | — | — | COMP-02 | typecheck + grep (rotas GET/POST) | `pnpm typecheck` + grep | ✅ | ⬜ pending |
| — | — | — | COMP-03 | unit (optOutFooter por idioma) + grep (headers) | `pnpm test` + grep | ✅ | ⬜ pending |
| — | — | — | COMP-04 | unit (hasWaOptIn) + grep (gate) | `pnpm test` + grep | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements (node:test configurado; novos `tests/*.test.ts` detectados pelo glob). Helpers puros novos e seus testes nascem nas tasks TDD de cada plano.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Checagem de supressão em draft/send sobre ctx | COMP-01 | Depende de MutationCtx/ActionCtx; sem harness Convex | Grep das chamadas + typecheck + revisão |
| Endpoint /unsubscribe ao vivo | COMP-02 | Exige deployment Convex rodando | `curl GET/POST {CONVEX_SITE_URL}/unsubscribe?token=...` em dev (pós-fase) |
| Headers no email real | COMP-03 | Exige envio real via Resend | Enviar email de teste e inspecionar headers (pós-fase) |
| Gate de opt-in no fluxo real | COMP-04 | Exige ctx + UI | Grep do gate `waOptInAt` + teste unitário do helper |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
