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
| **Quick run command** | `node --experimental-strip-types --test tests/legal.test.ts tests/fake-ctx.test.ts tests/acceptance.test.ts tests/purge.test.ts tests/stripe.test.ts tests/landing-honesty.test.ts tests/legal-pages.test.ts tests/legal-docs-content.test.ts && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/tsc --noEmit -p convex` |
| **Full suite command** | `node --experimental-strip-types --test tests/*.test.ts && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/tsc --noEmit -p convex && ./node_modules/.bin/eslint && ./node_modules/.bin/next build` |
| **Estimated runtime** | ~120 seconds (suite completa com build) |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

Preenchido pelo planner (2026-10-12). O `tsc` da raiz EXCLUI `convex/` e `tests/`: por isso os comandos incluem `tsc --noEmit -p convex`.

| Req ID | Plan / Task | Behavior | Test Type | Automated Command | File Exists |
|--------|-------------|----------|-----------|-------------------|-------------|
| LEGAL-01 | 09-02 T1-T2 | landing e `PLANS` sem termos proibidos (depoimentos, white-label, domínio próprio, notificado, toggle anual, Export CSV, "Sem risco", "48") e features batendo com os limites | unit (leitura de fonte) | `node --experimental-strip-types --test tests/landing-honesty.test.ts` | ❌ W1 |
| LEGAL-02/04 | 09-01 T1 | `legalPlaceholders()` lista campos pendentes e fica vazio quando preenchido; `LEGAL_DOCS` com 7 slugs; helpers | unit | `node --experimental-strip-types --test tests/legal.test.ts` | ❌ W1 |
| infra | 09-01 T2 | ctx falso em memória (query/withIndex/eq, insert/get/patch/delete, storage) | unit | `node --experimental-strip-types --test tests/fake-ctx.test.ts` | ❌ W1 |
| LEGAL-02/04 | 09-03 T1-T2 | 7 páginas em `src/app/legal/<slug>/page.tsx` usando `LegalDoc`; fatos de empresa, cookies, subprocessadores, aviso ao prospect; rodapé da landing com `LegalLinks`; `/legal` fora do proxy | unit (fs) | `node --experimental-strip-types --test tests/legal-pages.test.ts` | ❌ W2 |
| LEGAL-02 | 09-04 T1-T2 | Termos (B2B, responsável pelo contato, links do Google), Privacidade (GDPR, LGPD, art. 27, transferência), DPA (art. 28, operadora, link de subprocessadores); sem LSSI/NIF/travessão | unit (leitura de fonte) | `node --experimental-strip-types --test tests/legal-docs-content.test.ts` | ❌ W2 |
| LEGAL-03 | 09-01 T1 | `isAccepted` (sem campos, versão antiga, sem uso profissional = false; atual + true = true) | unit | `node --experimental-strip-types --test tests/legal.test.ts` | ❌ W1 |
| LEGAL-03 | 09-05 T1 | `acceptTermsFor` recusa versão diferente e grava versão/data/uso profissional; `reserveUsage` recusa sem aceite; demo isento; `assertAccepted` | unit (fake ctx) | `node --experimental-strip-types --test tests/acceptance.test.ts` | ❌ W2 |
| LEGAL-03 | 09-05 T2 | guarda em `outreach.draft/callScript/send`, `whatsapp.sendFollowup`, `billing.createCheckout` | typecheck + grep | `./node_modules/.bin/tsc --noEmit -p convex` | ✅ comando existe |
| LEGAL-05 | 09-06 T1 | `purgeOrgBatch` apaga leads (cascata), previews, events, outreach, uploads + storage, supressões da org, users e o workspace por último; preserva supressão global e outras orgs; idempotente | unit (fake ctx) | `node --experimental-strip-types --test tests/purge.test.ts` | ❌ W2 |
| LEGAL-05 | 09-06 T1 | `stripeDelete`: 200 = "ok", 404 = "gone", 500 lança | unit (fetch stub) | `node --experimental-strip-types --test tests/stripe.test.ts` | ✅ estender |
| todos | 09-07 T1 | suíte inteira + tipos (raiz e convex) + lint + build | full | full suite command | ✅ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Não há Wave 0 separada: cada plano cria o próprio teste antes do código (tarefas `tdd="true"`).

- [ ] `convex/lib/legal.ts` + `tests/legal.test.ts` (09-01)
- [ ] `tests/fake-ctx.ts` + `tests/fake-ctx.test.ts` (09-01)
- [ ] `tests/landing-honesty.test.ts` (09-02)
- [ ] `tests/legal-pages.test.ts` (09-03)
- [ ] `tests/legal-docs-content.test.ts` (09-04)
- [ ] `tests/acceptance.test.ts` (09-05)
- [ ] `tests/purge.test.ts` e extensão de `tests/stripe.test.ts` (09-06)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Exclusão de conta ponta a ponta | LEGAL-05 | Depende de Stripe (modo teste) e Clerk reais | Conta de teste → assinar em modo teste → apagar conta em Ajustes → conferir no dashboard do Convex que o workspace não tem mais dados, assinatura cancelada no Stripe e usuário ausente no Clerk |
| Faixa de placeholder visível | LEGAL-02/04 | Visual | Abrir `/legal/empresa` com identidade ainda em placeholder: faixa de aviso aparece |
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
