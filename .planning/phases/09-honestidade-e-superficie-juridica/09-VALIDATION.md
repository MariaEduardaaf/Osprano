---
phase: 9
slug: honestidade-e-superficie-juridica
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-12
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` com `--experimental-strip-types`, sem dependências |
| **Config file** | none (script `test` em package.json) |
| **Quick run command** | `node --experimental-strip-types --test tests/legal.test.ts tests/purge.test.ts tests/landing-honesty.test.ts tests/legal-pages.test.ts && ./node_modules/.bin/tsc --noEmit` |
| **Full suite command** | `node --experimental-strip-types --test tests/*.test.ts && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && ./node_modules/.bin/next build` |
| **Estimated runtime** | ~120 seconds (suite completa com build) |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

Preenchido pelo planner/executor a partir do mapa abaixo (requisito → teste).

| Req ID | Behavior | Test Type | Automated Command | File Exists |
|--------|----------|-----------|-------------------|-------------|
| LEGAL-01 | landing e `PLANS` sem termos proibidos (depoimentos, white-label, domínio próprio, notificado, anual, Export CSV e demais da tabela da pesquisa) | unit (leitura de fonte) | `node --experimental-strip-types --test tests/landing-honesty.test.ts` | ❌ W0 |
| LEGAL-02 | 7 páginas em `src/app/legal/**/page.tsx`, links do rodapé só para rotas existentes, `/legal` fora das rotas protegidas do proxy | unit (fs) | `node --experimental-strip-types --test tests/legal-pages.test.ts` | ❌ W0 |
| LEGAL-02/04 | `legalPlaceholders()` lista campos pendentes e fica vazio quando preenchido | unit | `node --experimental-strip-types --test tests/legal.test.ts` | ❌ W0 |
| LEGAL-03 | `isAccepted` (sem campos, versão antiga, sem uso profissional = false; atual + true = true); `acceptTerms` recusa versão diferente; `reserveUsage` recusa workspace não aceito | unit (fake ctx) | `node --experimental-strip-types --test tests/legal.test.ts` | ❌ W0 |
| LEGAL-05 | `purgeOrgBatch` apaga leads (cascata), previews, events, outreach, uploads + storage, supressões da org; preserva supressão global; idempotente | unit (fake ctx em memória) | `node --experimental-strip-types --test tests/purge.test.ts` | ❌ W0 |
| LEGAL-05 | `stripeDelete` trata 404 como sucesso | unit (fetch stub) | `node --experimental-strip-types --test tests/stripe.test.ts` | ✅ estender |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `convex/lib/legal.ts` (módulo puro: identidade, versão dos documentos, `legalPlaceholders()`, `isAccepted()`)
- [ ] `tests/legal.test.ts`
- [ ] `tests/landing-honesty.test.ts`
- [ ] `tests/legal-pages.test.ts`
- [ ] `tests/purge.test.ts` (fake ctx em memória)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Exclusão de conta ponta a ponta | LEGAL-05 | Depende de Stripe (modo teste) e Clerk reais | Conta de teste → assinar em modo teste → apagar conta em Ajustes → conferir no dashboard do Convex que o workspace não tem mais dados, assinatura cancelada no Stripe e usuário ausente no Clerk |
| Faixa de placeholder visível | LEGAL-02/04 | Visual | Abrir `/legal/aviso-legal` com identidade ainda em placeholder: faixa de aviso aparece |
| Gate de aceite no primeiro acesso | LEGAL-03 | Fluxo de UI com Clerk | Conta nova → tela de aceite antes do app; aceitar → app abre; subir versão → pede de novo |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
