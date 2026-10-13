---
phase: 13
slug: remetente-e-envio-pelo-e-mail-do-cliente
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-13
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node 22, `--experimental-strip-types`), `tests/fake-ctx.ts` para funções de `convex/model` |
| **Config file** | none (tsconfig raiz + `convex/tsconfig.json`) |
| **Quick run command** | `node --experimental-strip-types --test <testes do plano> && ./node_modules/.bin/tsc --noEmit -p convex` |
| **Full suite command** | `node --experimental-strip-types --test tests/*.test.ts && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/tsc --noEmit -p convex && ./node_modules/.bin/eslint && ./node_modules/.bin/next build` |
| **Estimated runtime** | quick ~10 s; full ~90 s (next build domina) |

`pnpm <script>` aborta sem TTY neste repo (LESSONS): sempre `./node_modules/.bin/...`.

---

## Sampling Rate

- **After every task commit:** quick run com os testes listados no `<verify>` da tarefa
- **After every plan wave:** full suite
- **Before `/gsd:verify-work`:** full suite verde (plano 13-06, tarefa 1)
- **Max feedback latency:** ~10 s (quick)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | SEND-01 | unit (puro) | `node --experimental-strip-types --test tests/sender.test.ts && ./node_modules/.bin/tsc --noEmit -p convex` | ❌ W0 (criado na própria tarefa, TDD) | ⬜ pending |
| 13-01-02 | 01 | 1 | SEND-01 | typecheck | `./node_modules/.bin/tsc --noEmit -p convex && ./node_modules/.bin/tsc --noEmit` | ✅ | ⬜ pending |
| 13-01-03 | 01 | 1 | SEND-01 | typecheck + lint | `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint <arquivos> && node --experimental-strip-types --test tests/dm-template.test.ts` | ✅ | ⬜ pending |
| 13-02-01 | 02 | 1 | SEND-03 | unit (puro, paridade de idiomas) | `node --experimental-strip-types --test tests/compliance.test.ts tests/prospect-lang.test.ts tests/outreach-lang.test.ts` | ✅ | ⬜ pending |
| 13-02-02 | 02 | 1 | SEND-02 | unit (puro) | `node --experimental-strip-types --test tests/compose-links.test.ts` | ❌ W0 (criado na própria tarefa, TDD) | ⬜ pending |
| 13-02-03 | 02 | 1 | SEND-01 | unit (prompt) | `node --experimental-strip-types --test tests/prospect-lang.test.ts tests/outreach-lang.test.ts` | ✅ | ⬜ pending |
| 13-03-01 | 03 | 1 | SEND-05 | unit (fakeCtx) + estático | `node --experimental-strip-types --test tests/suppressions.test.ts tests/google-scal.test.ts` | ❌ W0 (criado na própria tarefa, TDD) | ⬜ pending |
| 13-03-02 | 03 | 1 | SEND-05 | unit (fakeCtx) | `node --experimental-strip-types --test tests/purge.test.ts tests/suppressions.test.ts` | ✅ | ⬜ pending |
| 13-03-03 | 03 | 1 | BASE-03, SEND-03 | unit (puro) | `node --experimental-strip-types --test tests/domain.test.ts tests/outreach-lang.test.ts tests/landing-honesty.test.ts` | ✅ | ⬜ pending |
| 13-04-01 | 04 | 2 | SEND-02, SEND-03, SEND-04 | estático (ordem dos portões) | `node --experimental-strip-types --test tests/send-path.test.ts && ./node_modules/.bin/tsc --noEmit -p convex` | ❌ W0 (criado na própria tarefa, TDD) | ⬜ pending |
| 13-04-02 | 04 | 2 | SEND-01, SEND-02 | estático + unit | `node --experimental-strip-types --test tests/send-path.test.ts tests/env.test.ts tests/prospect-lang.test.ts tests/compliance.test.ts` | ✅ (após 13-04-01) | ⬜ pending |
| 13-05-01 | 05 | 3 | SEND-01, SEND-02 | typecheck + lint | `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/components/outreach-composer.tsx` | ✅ | ⬜ pending |
| 13-05-02 | 05 | 3 | SEND-02, SEND-04 | full suite | full suite command | ✅ | ⬜ pending |
| 13-06-01 | 06 | 4 | todos | full suite | full suite command | ✅ | ⬜ pending |
| 13-06-02 | 06 | 4 | todos | manual (checkpoint) | n/a | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Infraestrutura existente cobre a fase (node:test + fakeCtx + varredura estática de fonte, mesmo padrão de `tests/google-scal.test.ts` e `tests/google-outgoing.test.ts`). Os arquivos de teste novos (`tests/sender.test.ts`, `tests/compose-links.test.ts`, `tests/suppressions.test.ts`, `tests/send-path.test.ts`) nascem na primeira etapa (RED) da própria tarefa TDD que os usa.

Limite conhecido: funções Convex com `requireOrgId` e `.filter()` (ex.: `emailRowForLead`) não rodam no fakeCtx; por isso `prepareSend`/`markSent` são cobertos por varredura da ordem dos portões + testes puros de `composeOutgoingBody`, `requireSender` e `canContactByEmail`, e o caminho ponta a ponta fica no checkpoint manual.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Deep link abre o Gmail/Outlook web com destinatário, assunto e corpo corretos (acentos, quebras de linha) | SEND-02 | Depende da conta logada e do comportamento real do Gmail/Outlook; URL não verificável offline | Plano 13-06, itens 4 e 5 |
| `mailto:` abre o app padrão com o texto | SEND-02 | Depende do app de e-mail do sistema | Plano 13-06, item 4 |
| Link de descadastro do corpo suprime e bloqueia o próximo Enviar | SEND-05, SEND-03 | httpAction precisa de `npx convex dev` de pé (LESSONS) | Plano 13-06, item 7 |
| Marquei como enviada aparece no Histórico e move para Abordado | SEND-04 | Fluxo de UI com dados reais | Plano 13-06, item 6 |
| Noruega na aba Ligação primeiro com "validação jurídica pendente" | BASE-03 | Visual | Plano 13-06, item 8 |
| Bloqueio sem perfil na tela | SEND-01 | Precisa de conta sem perfil | Plano 13-06, item 9 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s (quick)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
