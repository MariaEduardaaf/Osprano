---
phase: 03-tracking-composer-e-localiza-o
plan: 01
subsystem: tracking
tags: [convex, clerk, previews, mutation]

# Dependency graph
requires: []
provides:
  - "recordOpen ignora aberturas do próprio dono do workspace (self-open guard baseada em identidade Clerk)"
affects: [03-02, 03-03, outreach-funnel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Self-open guard: comparar ctx.auth.getUserIdentity().subject com preview.orgId antes de qualquer escrita em mutations públicas de tracking"

key-files:
  created: []
  modified:
    - convex/previews.ts

key-decisions:
  - "Guarda de self-open feita só no servidor (recordOpen), sem tocar PreviewTracker nem adicionar checagem no cliente — preserva a contagem legítima do modo demo (sem ClerkProvider, identity sempre null)"
  - "Limitação aceita e documentada em comentário: aba anônima/privada do próprio dono ainda conta como prospect (mesma limitação de qualquer ferramenta de tracking)"

patterns-established:
  - "Self-open guard: identity && identity.subject === preview.orgId → early return antes do patch/insert/stage, em mutations públicas cujo write representa um sinal de comportamento de terceiro"

requirements-completed: [TRCK-01]

# Metrics
duration: 1min
completed: 2026-07-11
---

# Phase 3 Plan 01: Guarda de self-open no tracking de preview Summary

**recordOpen agora ignora a abertura do próprio dono do workspace (identidade Clerk == preview.orgId), corrigindo o sinal de compra do funil sem alterar o cliente nem o modo demo.**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-07-11T04:59:28Z
- **Completed:** 2026-07-11T05:00:04Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- `convex/previews.ts::recordOpen` retorna cedo (antes de qualquer `patch`/`insert`/mudança de estágio) quando `ctx.auth.getUserIdentity()` resolve e `identity.subject === preview.orgId`
- Prospect real (sem sessão Clerk) e modo demo (sem `ClerkProvider`, identity sempre null) continuam contando normalmente — comportamento verificado por leitura de código e confirmado por `typecheck`/`lint`
- `PreviewTracker` (`src/components/preview-tracker.tsx`) permanece intocado, conforme travado pelo CONTEXT da fase

## Task Commits

Each task was committed atomically:

1. **Task 1: Guarda de self-open baseada em identidade no recordOpen** - `e192f71` (fix)

**Plan metadata:** (a seguir, commit de documentação)

## Files Created/Modified
- `convex/previews.ts` - `recordOpen` ganhou guarda de 2 linhas (`getUserIdentity()` + early-return) logo após a checagem `if (!preview) return;` e antes da primeira escrita

## Decisions Made
- Guarda implementada exatamente como especificado na `<interfaces>` do plano — nenhuma decisão de design nova foi necessária, o fix é cirúrgico e o padrão `orgId === identity.subject` já estava confirmado em `convex/model/tenant.ts`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- TRCK-01 fechado: o funil (`base → approached`, "abriu" na outbox) agora reflete só comportamento genuíno de prospect
- Nenhum bloqueio para 03-02 (preview-site/i18n) ou 03-03 (schema/outreach) — este plano tocou apenas `convex/previews.ts`, sem overlap de arquivos
- Verificação de runtime (sessão Clerk real vs. anônima) fica para QA manual, conforme `03-VALIDATION.md §Manual-Only` — não há teste automatizado novo neste plano

---
*Phase: 03-tracking-composer-e-localiza-o*
*Completed: 2026-07-11*

## Self-Check: PASSED

- FOUND: .planning/phases/03-tracking-composer-e-localiza-o/03-01-SUMMARY.md
- FOUND: e192f71
