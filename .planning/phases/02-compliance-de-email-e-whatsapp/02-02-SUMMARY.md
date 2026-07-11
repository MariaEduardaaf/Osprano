---
phase: 02-compliance-de-email-e-whatsapp
plan: 02
subsystem: api
tags: [convex, compliance, email, resend, opt-out, unsubscribe]

# Dependency graph
requires:
  - phase: 02-compliance-de-email-e-whatsapp (plan 01)
    provides: "Tabela suppressions, outreach.unsubscribeToken/by_unsub_token, helpers puros normalizeEmail/optOutFooter/senderIdentityFrom, LANG exportado, convex/suppressions.ts"
provides:
  - "outreach.draft e outreach.send recusam endereço suprimido (erro pt-BR) antes de gastar IA ou enviar via Resend"
  - "outreach.upsertDraft gera/persiste unsubscribeToken e injeta o rodapé de opt-out no body salvo (idempotente)"
  - "outreach.send re-garante token (backfill on-demand) + rodapé e envia headers List-Unsubscribe/List-Unsubscribe-Post (RFC 8058)"
  - "outreach.suppress: mutation autenticada para registrar supressão manual org-scoped"
affects: [02-03-endpoint-de-unsubscribe, 03-outbox-e-composer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Compliance injetada por código no ponto único de escrita (upsertDraft) e no ponto único de envio (send) — nunca depende do output da IA nem de edição manual do usuário"
    - "Rodapé de opt-out idempotente via marcador de URL única (body.includes(url)) — seguro reaplicar em upsert/backfill"
    - "Backfill on-demand de campos legados dentro da própria action (setUnsubscribeToken), sem migração em lote"

key-files:
  created: []
  modified:
    - convex/outreach.ts

key-decisions:
  - "Checagem de supressão duplicada em draft (evita gastar IA) e em send (defesa em profundidade — cobre o caso de body escrito/editado manualmente)"
  - "unsubscribeToken gerado em upsertDraft (fluxo normal) e re-garantido em send via backfill (cobre rows legadas/seed demo sem token)"

patterns-established:
  - "Toda mutação de escrita de outreach que persiste body passa pelo helper withOptOutFooter antes de salvar — nenhum outro código-caminho grava body sem rodapé"

requirements-completed: [COMP-01, COMP-02, COMP-03]

# Metrics
duration: 6min
completed: 2026-07-11
---

# Phase 2 Plan 2: Compliance de envio de email em convex/outreach.ts Summary

**`convex/outreach.ts` vira o ponto único e não-contornável de compliance de email — supressão bloqueia draft/send, o body persistido sempre carrega o rodapé de opt-out, e o payload do Resend sempre sai com os headers List-Unsubscribe/List-Unsubscribe-Post, mesmo com rows legadas sem token.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-11T06:17:00+02:00 (aprox.)
- **Completed:** 2026-07-11T06:24:47+02:00
- **Tasks:** 3/3
- **Files modified:** 1 (`convex/outreach.ts`)

## Accomplishments
- `draft` recusa lead com email suprimido antes de gastar a chamada de IA (erro pt-BR: "Este contato pediu para não ser contatado (opt-out).")
- `upsertDraft` reescrito: gera/reusa `unsubscribeToken` e injeta o rodapé de opt-out multi-idioma no body ANTES de persistir — cobre tanto o fluxo de IA quanto o fluxo manual (`markSent`)
- `send` ganhou defesa em profundidade: checa supressão de novo (independente do que já rodou em `draft`), faz backfill on-demand do token em rows sem `unsubscribeToken`, re-garante o rodapé caso o body não contenha a URL, e adiciona os headers `List-Unsubscribe`/`List-Unsubscribe-Post` (RFC 8058) ao payload do Resend
- `outreach.suppress` (mutation autenticada, org-scoped) registra supressão manual via `addSuppression` — pronta para a UI da Fase 3

## Task Commits

Each task was committed atomically:

1. **Task 1: Supressão no draft + mutation outreach.suppress (COMP-01)** - `e1a3721` (feat)
2. **Task 2: upsertDraft gera unsubscribeToken + injeta rodapé; setUnsubscribeToken (COMP-02/03)** - `0756d31` (feat)
3. **Task 3: send — supressão + backfill de token + rodapé + headers Resend (COMP-01/02/03)** - `0b58a8e` (feat)

**Plan metadata:** (próximo commit — docs: complete plan)

## Files Created/Modified
- `convex/outreach.ts` - imports de `normalizeEmail`, `addSuppression`, `optOutFooter`/`senderIdentityFrom`, `LANG`, `Doc`; checagem de supressão em `draft` e `send`; helpers de módulo `buildUnsubscribeUrl`/`withOptOutFooter`; `upsertDraft` reescrito com token+rodapé; `setUnsubscribeToken` (internalMutation); mutation `suppress`; `send` com backfill de token, re-garantia de rodapé e headers `List-Unsubscribe`/`List-Unsubscribe-Post` no payload do Resend

## Decisions Made
- Seguiu exatamente as decisões já registradas em PROJECT.md/STATE.md: supressão checada em `draft` E `send` (não só um dos dois); opt-out injetado por código, nunca confiando no prompt da IA
- Nenhuma decisão nova de arquitetura tomada neste plano — implementação seguiu literalmente os snippets do plano

## Deviations from Plan

None - plan executado exatamente como escrito. Todos os snippets de código do PLAN.md foram aplicados sem alteração de lógica.

**Nota de execução (não é deviation de código):** o primeiro commit da Task 2 acidentalmente incluiu arquivos de `.planning/` (`STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md`, `02-03-SUMMARY.md`) que estavam staged pelo plano 02-03/02-04 rodando em paralelo no mesmo working tree — resultado de `git commit` sem pathspec explícito capturar todo o index, não de `git add -A`. Detectado imediatamente após o commit (via `git show --stat`), corrigido com `git reset --soft HEAD~1` seguido de `git reset` (unstage) e recommit apenas de `convex/outreach.ts`; os arquivos do outro plano ficaram intactos no working tree para o agente 02-03 commitar por conta própria (o que ele fez em seguida, `66c20c9`). Nenhum trabalho de outro plano foi perdido ou sobrescrito.

## Issues Encountered
Ver nota acima sobre o commit acidental — resolvido sem perda de trabalho, sem impacto no escopo ou no conteúdo final de `convex/outreach.ts`.

## User Setup Required
None - no external service configuration required. (`RESEND_API_KEY`/`RESEND_FROM`/`CONVEX_SITE_URL` já eram pré-requisitos de infra existentes, não introduzidos por este plano.)

## Next Phase Readiness
- `internal.suppressions.isSuppressed` referenciado 2x em `convex/outreach.ts` (draft + send) — confirmado via grep
- Payload do Resend inclui `headers` com `List-Unsubscribe` e `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
- `outreach.suppress` pronta para a UI da Fase 3 ("marcar como respondeu/stop")
- Plano 02-03 (endpoint `/unsubscribe`) e 02-04 (opt-in de WhatsApp) já concluídos em paralelo neste working tree, sem conflito de arquivos (escopo exclusivo respeitado: `convex/outreach.ts` só foi tocado por este plano)
- Nenhum bloqueio identificado

---
*Phase: 02-compliance-de-email-e-whatsapp*
*Completed: 2026-07-11*

## Self-Check: PASSED

All modified files verified present on disk (`convex/outreach.ts`); all 3 task commits (`e1a3721`, `0756d31`, `0b58a8e`) verified present in git history.
