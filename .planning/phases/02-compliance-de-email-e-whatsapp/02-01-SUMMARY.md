---
phase: 02-compliance-de-email-e-whatsapp
plan: 01
subsystem: database
tags: [convex, schema, compliance, email, whatsapp, unit-tests]

# Dependency graph
requires:
  - phase: 01-integridade-de-billing-e-seguranca-do-modo-demo
    provides: convex/lib/domain.ts com padrão de helpers puros testáveis (node:test)
provides:
  - "Tabela suppressions (by_email, by_org_email) para opt-out de email"
  - "outreach.unsubscribeToken + índice by_unsub_token"
  - "leads.waOptInAt/waOptInSource (gate de opt-in explícito de WhatsApp)"
  - "events.type inclui \"wa_opt_in\""
  - "Helpers puros testados: normalizeEmail, hasWaOptIn, optOutFooter, senderIdentityFrom"
  - "LANG exportado de convex/lib/outreachAi.ts"
  - "convex/suppressions.ts: addSuppression (helper puro) + add/isSuppressed/unsubscribeByToken (internal)"
affects: [02-02-envio-de-email, 02-03-endpoint-de-unsubscribe, 02-04-opt-in-de-whatsapp]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lógica de insert-or-noop em função pura (addSuppression) chamada por múltiplas internalMutations — mutations Convex não podem chamar ctx.runMutation entre si"
    - "Supressão dual-scope: row com orgId (por org) OU orgId undefined (global) — isSuppressed casa qualquer um dos dois"
    - "No-leak em endpoints públicos: token desconhecido/reusado = no-op silencioso, nunca erro/leak"

key-files:
  created:
    - convex/lib/compliance.ts
    - convex/suppressions.ts
    - tests/compliance.test.ts
  modified:
    - convex/schema.ts
    - convex/lib/domain.ts
    - convex/lib/outreachAi.ts
    - tests/domain.test.ts
    - convex/_generated/api.d.ts

key-decisions:
  - "Supressão como tabela Convex própria (suppressions), checada em draft e send — não um campo boolean em leads"
  - "Opt-in de WhatsApp exige waOptInAt explícito — nunca inferido do estágio do Kanban"
  - "unsubscribeToken é um token dedicado em outreach, não reaproveita previewToken"

patterns-established:
  - "Helpers puros de compliance (sem import de Convex) vivem em convex/lib/*.ts e são testados via node:test com import direto .ts"

requirements-completed: [COMP-01, COMP-02, COMP-03, COMP-04]

# Metrics
duration: 5min
completed: 2026-07-11
---

# Phase 2 Plan 1: Fundação de dados e lógica pura de compliance Summary

**Tabela `suppressions` (dual-scope, idempotente) + 4 helpers puros testados (normalizeEmail, hasWaOptIn, optOutFooter multi-idioma, senderIdentityFrom) + módulo `convex/suppressions.ts` com lookup no-leak por `unsubscribeToken`.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-11T06:11:00+02:00 (commit anterior mais próximo)
- **Completed:** 2026-07-11T06:15:38+02:00
- **Tasks:** 3/3
- **Files modified:** 8 (3 criados, 5 modificados, incluindo codegen)

## Accomplishments
- Schema estendido sem quebrar nada existente: `suppressions` nova + `unsubscribeToken`/`by_unsub_token` em `outreach` + `waOptInAt`/`waOptInSource` em `leads` + `"wa_opt_in"` em `events.type`
- 4 helpers puros testados cobrindo os 4 requisitos da fase (COMP-01 a COMP-04): `normalizeEmail`, `hasWaOptIn`, `optOutFooter` (English/Dutch/Swedish/Norwegian + fallback), `senderIdentityFrom`
- `convex/suppressions.ts` completo: `addSuppression` (helper puro reutilizável, idempotente por email+org), `add`/`isSuppressed`/`unsubscribeByToken` (internal), lookup no-leak por token desconhecido
- Nenhum plano de wave 2 (02-02/02-03/02-04) precisará tocar `convex/schema.ts` nem os helpers puros — evita o conflito de working tree observado na Fase 1

## Task Commits

Each task was committed atomically:

1. **Task 1: Estender o schema** - `af03cab` (feat)
2. **Task 2: Helpers puros (TDD)** - `31f8bc5` (test/RED) → `2988e9e` (feat/GREEN)
3. **Task 3: Módulo suppressions.ts** - `beb86fd` (feat)

**Plan metadata:** (próximo commit — docs: complete plan)

_Nota: Task 2 seguiu TDD — testes escritos primeiro (RED, 2 arquivos falhando por import ausente), depois implementação (GREEN, 40/40 testes passando). Sem refactor necessário._

## Files Created/Modified
- `convex/schema.ts` - tabela `suppressions` + `outreach.unsubscribeToken`/`by_unsub_token` + `leads.waOptInAt`/`waOptInSource` + `events.type: "wa_opt_in"`
- `convex/lib/domain.ts` - `normalizeEmail`, `hasWaOptIn`
- `convex/lib/compliance.ts` (novo) - `optOutFooter` (copy por idioma), `senderIdentityFrom`
- `convex/lib/outreachAi.ts` - `LANG` agora exportado (sem outra mudança)
- `convex/suppressions.ts` (novo) - `addSuppression`, `add`, `isSuppressed`, `unsubscribeByToken`
- `tests/domain.test.ts` - casos de `normalizeEmail`/`hasWaOptIn`
- `tests/compliance.test.ts` (novo) - casos de `optOutFooter`/`senderIdentityFrom`
- `convex/_generated/api.d.ts` - regenerado via `npx convex codegen` (novos módulos `lib/compliance` e `suppressions`)

## Decisions Made
- Seguiu exatamente as decisões já registradas em PROJECT.md (supressão como tabela própria; opt-in de WhatsApp só explícito; rodapé de opt-out injetado por código)
- Nenhuma decisão nova de arquitetura tomada neste plano

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `senderIdentityFrom` não tratava espaço em branco à direita**
- **Found during:** Task 2 (GREEN — rodando `pnpm test` após implementar)
- **Issue:** O regex `^(.+?)\s*<.+>$` do próprio plano falhava quando `resendFrom` tinha espaço após o `>` final (ex.: `"  Team Osprano  <hi@osprano.com> "`), porque `$` exige fim de string logo após o `>`. O fallback devolvia a string quase-crua, só com trim externo, preservando o espaço duplo interno — teste `senderIdentityFrom: trims surrounding whitespace` falhava (`'Team Osprano  <hi@osprano.com>'` em vez de `'Team Osprano'`).
- **Fix:** `resendFrom.trim()` aplicado ANTES do match, não só no resultado.
- **Files modified:** `convex/lib/compliance.ts`
- **Verification:** `pnpm test` — 40/40 verdes (era 39/40 antes do fix)
- **Committed in:** `2988e9e` (parte do commit da Task 2 GREEN)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Fix pontual e necessário para correção do helper; sem scope creep, sem mudança de contrato público (`senderIdentityFrom` continua com a mesma assinatura e mesmo comportamento para os demais casos).

## Issues Encountered
None além do deviation acima.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Planos de wave 2 (02-02 envio de email, 02-03 endpoint de unsubscribe, 02-04 opt-in de WhatsApp) podem importar `convex/suppressions.ts`, `convex/lib/compliance.ts` e `convex/lib/domain.ts` sem tocar `convex/schema.ts`
- `internal.suppressions.add`, `internal.suppressions.isSuppressed`, `internal.suppressions.unsubscribeByToken` já existem no codegen, prontos para consumo
- **Nota sobre REQUIREMENTS.md:** este plano declara `requirements: [COMP-01, COMP-02, COMP-03, COMP-04]` no frontmatter porque lança a fundação de todos os quatro, mas a checagem de ponto de enforcement (recusa em `draft`/`send`, endpoint HTTP, rodapé no envio real, gate de WhatsApp na UI) só acontece nos planos de wave 2 (02-02/02-03 cobrem COMP-01/02/03; 02-04 cobre COMP-04). Por isso as 4 linhas seguem `[ ] Pending` em `.planning/REQUIREMENTS.md` — não foram marcadas `[x]` aqui para evitar falso-positivo; devem ser fechadas pelos planos que efetivamente implementam o enforcement.
- Nenhum bloqueio identificado

---
*Phase: 02-compliance-de-email-e-whatsapp*
*Completed: 2026-07-11*

## Self-Check: PASSED

All created/modified files verified present on disk; all 4 task commits (`af03cab`, `31f8bc5`, `2988e9e`, `beb86fd`) verified present in git history.
