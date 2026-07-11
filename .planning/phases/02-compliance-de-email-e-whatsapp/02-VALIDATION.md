---
phase: 2
slug: compliance-de-email-e-whatsapp
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-11
updated: 2026-07-11
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

Nota: não há harness `convex-test` instalado (fora de escopo — "sem dependência nova"). Como na Fase 1, só os helpers puros (`convex/lib/*`) têm cobertura automatizada `node:test`; mutations/actions/httpActions ficam em typecheck + grep + smoke manual (ver §Manual-Only). Todo o Wave 0 desta fase é a extração de helpers puros no plano 02-01 (nascem com teste).

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm typecheck && pnpm lint && pnpm test`
- **Before `/gsd:verify-work`:** Full suite green + `pnpm build`
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-T1 | 02-01 | 1 | COMP-01/02/04 | typecheck + grep (schema) | `npx convex codegen && pnpm typecheck` | ✅ | ⬜ pending |
| 02-01-T2 | 02-01 | 1 | COMP-01/03/04 | unit (normalizeEmail, hasWaOptIn, optOutFooter, senderIdentityFrom) | `pnpm test` | ✅ | ⬜ pending |
| 02-01-T3 | 02-01 | 1 | COMP-01/02 | typecheck + grep (suppressions module) | `npx convex codegen && pnpm typecheck` | ✅ | ⬜ pending |
| 02-02-T1 | 02-02 | 2 | COMP-01 | typecheck + grep (draft check, suppress) | `npx convex codegen && pnpm typecheck && pnpm test` | ✅ | ⬜ pending |
| 02-02-T2 | 02-02 | 2 | COMP-02/03 | typecheck + grep (token, footer) | `npx convex codegen && pnpm typecheck && pnpm test` | ✅ | ⬜ pending |
| 02-02-T3 | 02-02 | 2 | COMP-01/02/03 | typecheck + grep (headers, backfill) | `npx convex codegen && pnpm typecheck && pnpm test` | ✅ | ⬜ pending |
| 02-03-T1 | 02-03 | 2 | COMP-02 | typecheck + grep (rotas GET/POST) | `npx convex codegen && pnpm typecheck` | ✅ | ⬜ pending |
| 02-04-T1 | 02-04 | 2 | COMP-04 | typecheck + grep (recordWaOptIn) | `npx convex codegen && pnpm typecheck && pnpm test` | ✅ | ⬜ pending |
| 02-04-T2 | 02-04 | 2 | COMP-04 | unit (hasWaOptIn) + grep (gate) | `pnpm test` + grep | ✅ | ⬜ pending |
| 02-04-T3 | 02-04 | 2 | COMP-04 | typecheck + lint + grep (UI) | `pnpm typecheck && pnpm lint` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Infra existente cobre todos os requisitos (node:test configurado; novos `tests/*.test.ts` detectados pelo glob). Os helpers puros novos e seus testes nascem no plano de fundação 02-01 (Task 2), antes de qualquer consumidor de wave 2:
- [x] `tests/compliance.test.ts` (NOVO) — optOutFooter por idioma + senderIdentityFrom (COMP-03) → 02-01-T2
- [x] `tests/domain.test.ts` estendido — normalizeEmail (COMP-01) + hasWaOptIn (COMP-04) → 02-01-T2
- [x] Sem novo framework/config — `node:test` cobre a camada pura; comportamento de runtime Convex fica smoke/manual (flag explícita abaixo)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Checagem de supressão em draft/send | COMP-01 | Depende de ActionCtx/ctx.runQuery; sem harness Convex | Grep `internal.suppressions.isSuppressed` (2x em outreach.ts) + typecheck; smoke: tentar draft/send num lead suprimido em dev |
| Endpoint /unsubscribe ao vivo | COMP-02 | Exige deployment Convex rodando | `curl -i "$CONVEX_SITE_URL/unsubscribe?token=..."` GET e POST em dev — 200 idêntico p/ token válido/lixo; válido grava em suppressions (pós-fase) |
| Headers no email real | COMP-03 | Exige envio real via Resend | Enviar email de teste em dev e inspecionar o payload/headers List-Unsubscribe; testar row legada sem unsubscribeToken (backfill) (pós-fase) |
| Gate de opt-in no fluxo real | COMP-04 | Exige ctx + UI | Teste unitário de hasWaOptIn + grep do gate; smoke: sendFollowup rejeita sem opt-in, libera após recordWaOptIn (pós-fase) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
