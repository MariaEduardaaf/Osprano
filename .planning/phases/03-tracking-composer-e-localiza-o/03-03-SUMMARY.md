---
phase: 03-tracking-composer-e-localiza-o
plan: 03
subsystem: api
tags: [convex, mutations, outreach, tracking, schema]

# Dependency graph
requires:
  - phase: 02-compliance-outreach
    provides: outreach table (status, previewToken, unsubscribeToken), send/upsertDraft/markSent pattern, withOptOutFooter
provides:
  - "outreach.repliedAt (v.optional(v.number())) — timestamp real da marcação manual de respondeu"
  - "mutation markReplied({ leadId }) — status replied + repliedAt + evento events.type=reply"
  - "mutation updateDraft({ leadId, subject, body }) — persiste edições do composer sem duplicar rodapé de opt-out"
  - "outbox.activityAt corrigido para priorizar repliedAt; outbox item expõe repliedAt"
affects: [03-04-composer-e-outbox-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ownership-check → query by_lead → patch → insert events, replicado de markSent para markReplied"
    - "mutations que exigem row pré-existente lançam erro pt-BR em vez de no-op silencioso (markReplied/updateDraft), diferente de markSent (que é no-op se não há row)"

key-files:
  created: []
  modified:
    - convex/schema.ts
    - convex/outreach.ts

key-decisions:
  - "repliedAt entra na frente da cadeia de fallback de activityAt (repliedAt ?? openedAt ?? lastOpenedAt ?? sentAt ?? _creationTime) para que itens marcados respondeu não fiquem presos no horário de abertura/envio"
  - "updateDraft NÃO chama withOptOutFooter — o rodapé é responsabilidade exclusiva de upsertDraft (rascunho por IA) e re-garantido idempotentemente por send no momento do envio"
  - "markReplied não mexe no stage do Kanban — replied é status de outreach, o funil continua sob controle manual do usuário"

patterns-established:
  - "Mutations 'terminais' de uma abordagem existente (markReplied, updateDraft) lançam erro pt-BR se não há row de outreach, ao contrário de markSent que tolera ausência"

requirements-completed: [TRCK-02, OUTR-01]

# Metrics
duration: 6min
completed: 2026-07-11
---

# Phase 03 Plan 03: Tracking backend — repliedAt, markReplied, updateDraft Summary

**Backend Convex puro: campo `outreach.repliedAt`, mutation `markReplied` (com evento `reply`) e mutation `updateDraft` (persistência do composer sem duplicar o rodapé de opt-out), mais o fix do `activityAt` da outbox para priorizar `repliedAt`.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-11T05:07:00Z (aprox.)
- **Completed:** 2026-07-11T05:13:43Z
- **Tasks:** 2/2
- **Files modified:** 2 (`convex/schema.ts`, `convex/outreach.ts`)

## Accomplishments
- `outreach.repliedAt` adicionado ao schema como campo aditivo opcional (sem backfill necessário)
- `markReplied({ leadId })`: ownership check → patch `status: "replied", repliedAt: now` → insert `events` com `type: "reply"`, erro pt-BR (`"Nenhuma abordagem encontrada para este lead."`) se não há rascunho/abordagem
- `updateDraft({ leadId, subject, body })`: ownership check → patch `subject`/`body` no row existente, erro pt-BR (`"Nenhum rascunho encontrado para este lead."`) se não há row — sem tocar no rodapé de opt-out
- `outbox.activityAt` corrigido: `row.repliedAt ?? row.openedAt ?? lastOpenedAt ?? row.sentAt ?? row._creationTime` — e o item da outbox agora expõe `repliedAt` para a UI ler direto

## Task Commits

Cada tarefa foi commitada atomicamente com pathspec explícito (`git commit -m "..." -- convex/schema.ts convex/outreach.ts`), nunca `git add -A`/`.`/`-a`, respeitando o paralelismo com 03-01/03-02 no mesmo working tree:

1. **Task 1: repliedAt no schema + markReplied + fix de activityAt na outbox (TRCK-02)** - `f06af91` (feat)
2. **Task 2: updateDraft — persiste subject/body sem duplicar o rodapé (OUTR-01)** - `9fc6742` (feat)

**Plan metadata:** (a ser gerado no commit final desta execução)

## Files Created/Modified
- `convex/schema.ts` - campo `repliedAt: v.optional(v.number())` na tabela `outreach`
- `convex/outreach.ts` - mutations `markReplied` e `updateDraft`; fix de `activityAt`/`repliedAt` na query `outbox`

## Decisions Made
- `repliedAt` entra na frente da cadeia de fallback de `activityAt`, senão um lead marcado "respondeu" continuaria ordenado/exibido pelo horário de abertura ou envio (pitfall identificado na pesquisa da fase)
- `updateDraft` propositalmente NÃO chama `withOptOutFooter` — evita duplicar lógica de compliance; `send` (Fase 2) já re-garante o rodapé de forma idempotente a cada envio, então uma edição manual do usuário nunca remove a garantia legal
- `markReplied` não altera `lead.stage` — o funil do Kanban continua 100% sob controle manual do usuário, "respondeu" é só um status de outreach

## Deviations from Plan

None - plano executado exatamente como escrito. As duas mutations e o fix de `activityAt` seguem o shape e os textos de erro especificados na `<action>` de cada task, incluindo a decisão explícita do plano de lançar erro pt-BR em vez de no-op silencioso quando não há row.

## Issues Encountered

Durante a execução, um `git status` no meio do trabalho mostrou arquivos de planos paralelos (03-01, 03-02) staged simultaneamente por causa do working tree compartilhado (`STATE.md`, `src/lib/preview-i18n.ts`, `src/components/preview-site.tsx`, `tests/preview-i18n.test.ts`). Nenhum desses arquivos foi tocado ou commitado por este plano — cada commit usou pathspec explícito (`-- convex/schema.ts convex/outreach.ts` / `-- convex/outreach.ts`), que só afeta os arquivos listados independentemente do que outro processo tenha no índice do git. Verificado via `git log --oneline -3 -- <arquivo>` após cada commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `api.outreach.markReplied` e `api.outreach.updateDraft` existem no codegen, prontos para o plano 03-04 (UI do composer/outbox, wave 2) consumir
- `outbox` já devolve `repliedAt` por item — a UI da wave 2 pode renderizar o badge "respondeu" e ordenar corretamente sem trabalho extra de backend
- `send`, `upsertDraft` e `getForLead` permanecem intocados — nenhum risco de regressão na Fase 2
- Nenhum blocker identificado para 03-04

---
*Phase: 03-tracking-composer-e-localiza-o*
*Completed: 2026-07-11*

## Self-Check: PASSED

- FOUND: .planning/phases/03-tracking-composer-e-localiza-o/03-03-SUMMARY.md
- FOUND: commit f06af91 (Task 1)
- FOUND: commit 9fc6742 (Task 2)
- FOUND: `repliedAt: v.optional(v.number())` in convex/schema.ts
- FOUND: `export const markReplied` in convex/outreach.ts
- FOUND: `export const updateDraft` in convex/outreach.ts
