---
phase: 02-compliance-de-email-e-whatsapp
plan: 04
subsystem: compliance
tags: [convex, whatsapp, opt-in, crm, react]

# Dependency graph
requires:
  - phase: 02-compliance-de-email-e-whatsapp
    provides: "leads.waOptInAt/waOptInSource no schema + helper puro hasWaOptIn (plano 02-01)"
provides:
  - "leads.recordWaOptIn — mutation autenticada que grava opt-in + evento wa_opt_in"
  - "whatsapp.sendFollowup gated por hasWaOptIn(lead), sem check de estágio"
  - "WhatsAppFollowup: fluxo de UI 'Registrar opt-in' (origem + confirmar) antes do envio"
  - "crm/page.tsx: render do bloco WhatsApp por lead.phone, não mais por estágio"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gate de compliance duplicado em duas camadas: backend (hasWaOptIn em sendFollowup) e UI (optInAt prop condiciona o fluxo antes de expor o textarea de envio)"

key-files:
  created: []
  modified:
    - convex/leads.ts
    - convex/whatsapp.ts
    - src/components/whatsapp-followup.tsx
    - src/app/(app)/crm/page.tsx

key-decisions:
  - "Gate por estágio removido por completo (não deixado como condição secundária) — só waOptInAt libera WhatsApp, backend e UI"
  - "Render do WhatsAppFollowup no CRM passa a depender só de lead.phone — arrastar o card no Kanban não é mais pré-requisito de fato"

patterns-established:
  - "UI de opt-in: quando optInAt ausente, componente mostra select de origem + botão 'Registrar opt-in' em vez do textarea de envio; após sucesso, reatividade do Convex libera a UI de envio sem estado local extra"

requirements-completed: [COMP-04]

# Metrics
duration: 3min
completed: 2026-07-11
---

# Phase 2 Plan 4: Gate de WhatsApp por opt-in registrado Summary

**Troca o gate de WhatsApp de "estágio de Kanban arrastável" para "opt-in explícito e atribuível do prospect", com enforcement duplicado no backend (`hasWaOptIn`) e na UI (fluxo "Registrar opt-in" antes do envio).**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-07-11T06:20:00+02:00 (aprox., leitura de contexto + implementação)
- **Completed:** 2026-07-11T06:22:39+02:00
- **Tasks:** 3/3
- **Files modified:** 4

## Accomplishments
- `leads.recordWaOptIn`: mutation autenticada que grava `waOptInAt`/`waOptInSource` no lead e insere um evento `wa_opt_in` com a origem (e nota opcional)
- `whatsapp.sendFollowup` passa a exigir `hasWaOptIn(lead)` — o check por `lead.stage !== "scheduled" && lead.stage !== "converted"` foi removido por completo (substituição total, não aditiva), e a docstring desatualizada ("replied"/"converted") foi corrigida para descrever o gate real
- `WhatsAppFollowup` ganha um fluxo mínimo "Registrar opt-in" (select de origem + botão) que precede o envio quando `optInAt` está ausente; só com opt-in registrado o textarea de mensagem aparece
- `crm/page.tsx` deixou de esconder o bloco WhatsApp por estágio — o único ponto de render do componente no app agora depende só de `lead.phone`, e passa `lead.waOptInAt` como prop `optInAt`

## Task Commits

Each task was committed atomically:

1. **Task 1: leads.recordWaOptIn** - `06d686c` (feat)
2. **Task 2: whatsapp.sendFollowup gate por opt-in** - `754bdc5` (feat)
3. **Task 3: UI de opt-in + gate por telefone no CRM** - `8f3128c` (feat)

**Plan metadata:** (próximo commit — docs: complete plan)

## Files Created/Modified
- `convex/leads.ts` - nova mutation `recordWaOptIn` (grava campos + evento `wa_opt_in`)
- `convex/whatsapp.ts` - `sendFollowup` gated por `hasWaOptIn(lead)`, docstring corrigida, import de `hasWaOptIn`
- `src/components/whatsapp-followup.tsx` - prop `optInAt`, fluxo "Registrar opt-in" (select + `useMutation(api.leads.recordWaOptIn)`) antes do textarea de envio
- `src/app/(app)/crm/page.tsx` - wrapper do `WhatsAppFollowup` trocado de `(lead.stage === "scheduled" || lead.stage === "converted")` para `lead.phone`, com `optInAt={lead.waOptInAt}`

## Decisions Made
- Seguiu exatamente o plano — nenhuma decisão de arquitetura nova. O único ponto de atenção foi garantir que o gate por estágio fosse removido por completo (não deixado como condição secundária), conforme o `§State of the Art` do RESEARCH.md apontava como pitfall.

## Deviations from Plan

None - plan executado exatamente como escrito.

**Nota operacional (não é deviation de código):** este plano rodou em paralelo com 02-02 (`convex/outreach.ts`) e 02-03 (`convex/http.ts`) na mesma working tree. Em um dos ciclos de `git add`, o `convex/http.ts` do plano 02-03 já estava staged no índice compartilhado no momento do meu `git add convex/leads.ts`, e um `git commit` sem pathspec teria incluído o arquivo do outro plano. Detectado imediatamente após o commit (`git show --stat`), corrigido com `git reset --soft HEAD~1` seguido de `git commit convex/leads.ts -m ...` (commit por pathspec, que não toca o índice de outros arquivos) — o resultado final (`06d686c`) contém só `convex/leads.ts`, e o `convex/http.ts` do plano 02-03 permaneceu staged e intocado para aquele executor commitar por conta própria. Todos os commits seguintes deste plano usaram `git commit <pathspec>` diretamente (sem `git add` prévio) para evitar o mesmo risco.

## Issues Encountered
None além da nota operacional acima (resolvida sem impacto no conteúdo do plano).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- COMP-04 fechado: opt-in de WhatsApp agora é gate real (backend + UI), atribuível e com timestamp/origem
- Fase 2 (compliance de email e WhatsApp) fica completa quando 02-02 e 02-03 também finalizarem (rodando em paralelo nesta wave)
- Nenhum bloqueio identificado

---
*Phase: 02-compliance-de-email-e-whatsapp*
*Completed: 2026-07-11*

## Self-Check: PASSED

All 4 modified files (convex/leads.ts, convex/whatsapp.ts, src/components/whatsapp-followup.tsx, src/app/(app)/crm/page.tsx) verified present on disk; all 3 task commits (`06d686c`, `754bdc5`, `8f3128c`) verified present in git history.
