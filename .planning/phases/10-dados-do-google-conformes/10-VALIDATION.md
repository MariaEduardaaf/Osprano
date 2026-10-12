---
phase: 10
slug: dados-do-google-conformes
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-12
---

# Phase 10: Validation Strategy

> Contrato de validação da fase, derivado de 10-RESEARCH.md seção 15, sem os itens de lat/lng e cron (CONTEXT: não gravar lat/lng, sem cron de 30 dias).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` com `--experimental-strip-types` (Node nativo, sem Jest/Vitest) |
| **Config file** | nenhum; `tests/fake-ctx.ts` é o ctx falso de Convex (query/withIndex(eq)/take/first/collect, get/insert/patch/delete) |
| **Quick run command** | `node --experimental-strip-types --test tests/google-*.test.ts && ./node_modules/.bin/tsc --noEmit -p convex` |
| **Full suite command** | `node --experimental-strip-types --test tests/*.test.ts && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/tsc --noEmit -p convex && ./node_modules/.bin/eslint && ./node_modules/.bin/next build` |
| **Estimated runtime** | ~2 s (testes) + ~60 s (typechecks, eslint e next build) |

`pnpm <script>` aborta sem TTY nesta máquina: sempre `./node_modules/.bin/...`.

---

## Sampling Rate

- **After every task commit:** quick run command (mais o `tsc --noEmit` da raiz quando a tarefa toca `src/`)
- **After every plan wave:** full suite command
- **Before `/gsd:verify-work`:** full suite verde + `10-DEV-DRYRUN.md` com segunda rodada vazia (plano 11)
- **Max feedback latency:** 90 s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | GPLC-03 | unit puro | `node --experimental-strip-types --test tests/google-shareable.test.ts tests/google-confirm.test.ts` | ❌ W0 (cria) | ⬜ pending |
| 10-01-02 | 01 | 1 | GPLC-04, GPLC-02 | unit puro | `node --experimental-strip-types --test tests/google-migration.test.ts tests/google-fields.test.ts` | ❌ W0 (cria) | ⬜ pending |
| 10-02-01 | 02 | 1 | SCAL-01 | typecheck | `./node_modules/.bin/tsc --noEmit -p convex` | ✅ | ⬜ pending |
| 10-02-02 | 02 | 1 | GPLC-02 | unit fakeCtx | `node --experimental-strip-types --test tests/google-details-quota.test.ts` | ❌ W0 (cria) | ⬜ pending |
| 10-03-01 | 03 | 2 | GPLC-01 | typecheck | `./node_modules/.bin/tsc --noEmit -p convex` | ✅ | ⬜ pending |
| 10-03-02 | 03 | 2 | GPLC-01 | typecheck + lint | `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src` | ✅ | ⬜ pending |
| 10-03-03 | 03 | 2 | GPLC-03 | unit puro | `node --experimental-strip-types --test tests/lead-links.test.ts tests/dm-template.test.ts` | ✅ (amplia) | ⬜ pending |
| 10-04-01 | 04 | 3 | GPLC-01 | unit fakeCtx + varredura | `node --experimental-strip-types --test tests/google-discovery.test.ts` | ❌ W0 (cria) | ⬜ pending |
| 10-04-02 | 04 | 3 | GPLC-02 | unit puro + varredura | `node --experimental-strip-types --test tests/google-cost.test.ts tests/google-discovery.test.ts` | ❌ W0 (cria) | ⬜ pending |
| 10-05-01 | 05 | 3 | GPLC-03 | unit fakeCtx | `node --experimental-strip-types --test tests/google-outgoing.test.ts tests/site.test.ts` | ❌ W0 (cria) | ⬜ pending |
| 10-05-02 | 05 | 3 | GPLC-03 | varredura | `node --experimental-strip-types --test tests/google-outgoing.test.ts tests/outreach-lang.test.ts tests/prospect-lang.test.ts` | ✅ (amplia) | ⬜ pending |
| 10-05-03 | 05 | 3 | GPLC-03 | varredura + typecheck | `node --experimental-strip-types --test tests/google-outgoing.test.ts && ./node_modules/.bin/tsc --noEmit -p convex` | ✅ (amplia) | ⬜ pending |
| 10-06-01 | 06 | 4 | GPLC-05, GPLC-02 | varredura de fontes | `node --experimental-strip-types --test tests/google-attribution.test.ts` | ❌ W0 (cria) | ⬜ pending |
| 10-06-02 | 06 | 4 | GPLC-03, GPLC-05 | varredura + typecheck | `node --experimental-strip-types --test tests/google-attribution.test.ts && ./node_modules/.bin/tsc --noEmit` | ✅ (amplia) | ⬜ pending |
| 10-07-01 | 07 | 4 | SCAL-01 | varredura | `node --experimental-strip-types --test tests/google-scal.test.ts` | ❌ W0 (cria) | ⬜ pending |
| 10-07-02 | 07 | 4 | SCAL-01 | varredura | `node --experimental-strip-types --test tests/google-scal.test.ts tests/compliance.test.ts` | ✅ (amplia) | ⬜ pending |
| 10-08-01 | 08 | 4 | GPLC-04 | unit fakeCtx | `node --experimental-strip-types --test tests/google-migration-batch.test.ts` | ❌ W0 (cria) | ⬜ pending |
| 10-08-02 | 08 | 4 | GPLC-04 | varredura + typecheck | `node --experimental-strip-types --test tests/google-migration-batch.test.ts && ./node_modules/.bin/tsc --noEmit -p convex` | ✅ (amplia) | ⬜ pending |
| 10-09-01 | 09 | 5 | GPLC-05 | typecheck + varredura | `./node_modules/.bin/tsc --noEmit && node --experimental-strip-types --test tests/google-attribution.test.ts` | ✅ | ⬜ pending |
| 10-09-02 | 09 | 5 | GPLC-02, SCAL-01 | typecheck + lint | `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint "src/app/(app)/leads/page.tsx"` | ✅ | ⬜ pending |
| 10-10-01 | 10 | 5 | SCAL-01 | typecheck + lint | `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint "src/app/(app)/crm/page.tsx"` | ✅ | ⬜ pending |
| 10-10-02 | 10 | 5 | SCAL-01 | typecheck + suíte | `./node_modules/.bin/tsc --noEmit && node --experimental-strip-types --test tests/*.test.ts` | ✅ | ⬜ pending |
| 10-11-01 | 11 | 6 | SCAL-01 | suíte completa + build | full suite command | ✅ | ⬜ pending |
| 10-11-02 | 11 | 6 | GPLC-04 | ensaio no DEV (runtime Convex) | `npx convex dev --once` + `npx convex run googleCompliance:migrateAll '{"dryRun":true}' > /private/tmp/claude-501/-Users-madu/f6f0e5de-5ed1-41b2-b83d-8b22b67585ec/scratchpad/f10-dry2.json` (exige `leadsCleaned: 0`) | ❌ (gera 10-DEV-DRYRUN.md) | ⬜ pending |
| 10-12-01 | 12 | 7 | todos | suíte completa + greps | full suite command | ✅ | ⬜ pending |
| 10-12-02 | 12 | 7 | GPLC-04 | humano (produção) | ver plano 12, Task 2 | n/a | ⬜ pending |
| 10-12-03 | 12 | 7 | GPLC-01..05, SCAL-01 | humano (visual) | ver plano 12, Task 3 | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Os testes nascem dentro da própria tarefa (TDD por tarefa), não numa onda separada:

- [ ] `tests/google-shareable.test.ts`, `tests/google-confirm.test.ts`: predicados de compartilhamento e confirmação (plano 01)
- [ ] `tests/google-migration.test.ts`, `tests/google-fields.test.ts`: limpeza pura e máscaras/SKU (plano 01)
- [ ] `tests/google-details-quota.test.ts`: cota de consultas com fakeCtx (plano 02)
- [ ] `tests/google-discovery.test.ts`, `tests/google-cost.test.ts`: inserção só com place_id e teto de custo (plano 04)
- [ ] `tests/google-outgoing.test.ts`: preview/IA/WhatsApp/confirmInfo (plano 05)
- [ ] `tests/google-attribution.test.ts`: atribuição, sem mapa, cache só em memória (plano 06)
- [ ] `tests/google-scal.test.ts`: sem `.collect()` nas funções do SCAL-01 (planos 07 e 11)
- [ ] `tests/google-migration-batch.test.ts`: migrateLeads com fakeCtx (plano 08)

`tests/fake-ctx.ts` não precisa de extensão: sem purge de lat/lng (sem `gt/lt`), e a migração pagina no `googleCompliance.ts` (fora do teste), com a lógica por lote testável em `model/googleMigration.ts`. Nenhum framework a instalar.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ensaio da migração ponta a ponta | GPLC-04 | precisa do runtime Convex (paginate real, índices com `eq(undefined)`) | Plano 11, Task 2 (no DEV, com backup): seed, dryRun, real, segunda rodada vazia |
| Migração em produção | GPLC-04 | dados reais; portão com aprovação da Duda | Plano 12, Task 2 (`checkpoint:human-action`) |
| Atribuição legível (tamanho, contraste claro/escuro, posição) | GPLC-05 | visual | Plano 12, Task 3 passos 1 e 9 |
| Busca ao vivo do Google e cota subindo | GPLC-02 | precisa da chave do Google (só em produção) | Plano 12, Task 3 passos 1 a 3 |
| Kanban com arrastar/excluir otimista e "Carregar mais" | SCAL-01 | UI reativa | Plano 12, Task 3 passos 2 e 6 |

---

## Validation Sign-Off

- [x] Todas as tarefas têm `<automated>` ou são checkpoint humano declarado
- [x] Continuidade de amostragem: nenhuma sequência de 3 tarefas sem verificação automática
- [x] Wave 0 cobre todos os arquivos de teste novos (criados dentro das próprias tarefas)
- [x] Sem modo watch
- [x] Latência de feedback < 90 s
- [x] `nyquist_compliant: true` no frontmatter

**Approval:** pending
