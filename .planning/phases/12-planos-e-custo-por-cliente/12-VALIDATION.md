---
phase: 12
slug: planos-e-custo-por-cliente
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-13
---

# Phase 12: Validation Strategy

> Contrato de validação da fase. Sem RESEARCH.md separado: limites e custos vêm de `.planning/research/commercial/COST-PRICING.md`; decisões travadas em `12-CONTEXT.md`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` com `--experimental-strip-types` (Node nativo, sem Jest/Vitest) |
| **Config file** | nenhum; `tests/fake-ctx.ts` é o ctx falso de Convex (query/withIndex(eq)/take/first/collect, get/insert/patch/delete; sem rollback e sem auth) |
| **Quick run command** | `node --experimental-strip-types --test tests/<arquivo-novo>.test.ts && ./node_modules/.bin/tsc --noEmit -p convex` |
| **Full suite command** | `node --experimental-strip-types --test tests/*.test.ts && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/tsc --noEmit -p convex && ./node_modules/.bin/eslint && ./node_modules/.bin/next build` |
| **Estimated runtime** | ~2 s (testes) + ~60 s (typechecks, eslint e next build) |

`pnpm <script>` aborta sem TTY nesta máquina: sempre `./node_modules/.bin/...`. O `tsc` da raiz exclui `convex/` e `tests/`.

---

## Sampling Rate

- **After every task commit:** quick run command do arquivo de teste da tarefa (mais `./node_modules/.bin/tsc --noEmit` quando a tarefa toca `src/`)
- **After every plan wave:** full suite command
- **Before `/gsd:verify-work`:** full suite verde + `12-DEV-SMOKE.md` sem FAIL (plano 06)
- **Max feedback latency:** 90 s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | PLAN-01, PLAN-04 | unit puro + fakeCtx | `node --experimental-strip-types --test tests/plans.test.ts tests/google-cost.test.ts tests/google-details-quota.test.ts tests/acceptance.test.ts && ./node_modules/.bin/tsc --noEmit -p convex` | ❌ W0 (cria plans.test.ts) | ⬜ pending |
| 12-01-02 | 01 | 1 | PLAN-01 | varredura de fonte + typecheck | `node --experimental-strip-types --test tests/landing-honesty.test.ts && ./node_modules/.bin/tsc --noEmit` | ✅ (amplia) | ⬜ pending |
| 12-02-01 | 02 | 2 | PLAN-02, PLAN-03, PLAN-04 | unit fakeCtx | `node --experimental-strip-types --test tests/usage-engine.test.ts tests/google-details-quota.test.ts` | ❌ W0 (cria) | ⬜ pending |
| 12-02-02 | 02 | 2 | PLAN-03 | unit fakeCtx | `node --experimental-strip-types --test tests/budget.test.ts` | ❌ W0 (cria) | ⬜ pending |
| 12-05-01 | 05 | 2 | PLAN-06 | unit puro | `node --experimental-strip-types --test tests/usage-level.test.ts && ./node_modules/.bin/tsc --noEmit` | ❌ W0 (cria) | ⬜ pending |
| 12-05-02 | 05 | 2 | PLAN-02 | typecheck + lint | `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/components/ai-quota.tsx src/components/outreach-composer.tsx src/components/call-script-panel.tsx` | ✅ | ⬜ pending |
| 12-03-01 | 03 | 3 | PLAN-04 | unit fakeCtx | `node --experimental-strip-types --test tests/trial.test.ts tests/purge.test.ts` | ❌ W0 (cria) | ⬜ pending |
| 12-03-02 | 03 | 3 | PLAN-01, PLAN-03, PLAN-04 | typecheck + suíte | `./node_modules/.bin/tsc --noEmit -p convex && node --experimental-strip-types --test tests/*.test.ts` | ✅ | ⬜ pending |
| 12-04-01 | 04 | 3 | PLAN-03, SCAL-02 | varredura de fonte | `node --experimental-strip-types --test tests/paid-calls.test.ts tests/google-discovery.test.ts` | ❌ W0 (cria) | ⬜ pending |
| 12-04-02 | 04 | 3 | PLAN-02 | varredura de fonte | `node --experimental-strip-types --test tests/paid-calls.test.ts tests/google-outgoing.test.ts tests/outreach-lang.test.ts` | ✅ (amplia) | ⬜ pending |
| 12-06-01 | 06 | 4 | todos | suíte completa + DEV | full suite command + `npx convex dev --once` + `npx convex run plans:*` (saída em arquivo) | ❌ (gera 12-DEV-SMOKE.md) | ⬜ pending |
| 12-06-02 | 06 | 4 | PLAN-02, PLAN-06 | humano (visual, DEV) | ver plano 06, Task 2 | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Os testes nascem dentro da própria tarefa (TDD por tarefa), não numa onda separada:

- [ ] `tests/plans.test.ts`: catálogo, `planOf`, `limitFor`, `dailyLimitFor`, `dayKey`/`monthKey` (plano 01)
- [ ] `tests/usage-engine.test.ts`: reserva de 6 tipos, mensagens, teste sem renovação, reset diário (plano 02)
- [ ] `tests/budget.test.ts`: teto global, aviso em 80%, recusa sem gravar (plano 02)
- [ ] `tests/usage-level.test.ts`: níveis 80%/100% e textos de aviso (plano 05)
- [ ] `tests/trial.test.ts`: teste único por pessoa, sobrevivência ao purge, grant e migração (plano 03)
- [ ] `tests/paid-calls.test.ts`: toda chamada paga passa pela reserva (plano 04)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Barra de uso no topo, aviso 80%/100%, botões de IA travados | PLAN-06, PLAN-02 | Precisa de sessão Clerk real e reatividade do Convex no navegador | Plano 06, Task 2 |
| Rollback conjunto de cota + orçamento quando o orçamento recusa | PLAN-03 | `fakeCtx` não tem transação; a garantia é do Convex (mutation que lança desfaz tudo) | Coberto por desenho (mesma mutation) e revisão de código no plano 02 |
| `identity.email` presente no token do Clerk | PLAN-04 | Configuração do template JWT no painel do Clerk | `12-PROD-STEPS.md`; em DEV, conferir `trialClaims.via` depois de um aceite novo |
| Passos de produção (migrar free, dar Agência à Duda, chave Anthropic) | PLAN-01 | Produção é só da Duda | `12-PROD-STEPS.md` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
