---
phase: 02-compliance-de-email-e-whatsapp
plan: 03
subsystem: api
tags: [convex, http-router, compliance, unsubscribe, rfc8058]

# Dependency graph
requires:
  - phase: 02-compliance-de-email-e-whatsapp
    provides: "internal.suppressions.unsubscribeByToken (plano 02-01) + outreach.by_unsub_token"
provides:
  - "Endpoint HTTP público GET+POST /unsubscribe no httpRouter de convex/http.ts"
  - "Handler compartilhado, sem auth, idempotente, no-leak (mesma resposta 200 para token válido/inválido/ausente)"
affects: [02-02-envio-de-email]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GET e POST no mesmo path do httpRouter Convex = duas chamadas http.route() independentes reusando o MESMO objeto httpAction, garantindo resposta idêntica para RFC 8058 one-click"
    - "Endpoint público no-leak: nunca ramifica a resposta HTTP com base na validade do token — só o efeito colateral (mutation) varia"

key-files:
  created: []
  modified:
    - convex/http.ts

key-decisions:
  - "Sem auth, sem confirmação em duas etapas — decisão já travada em 02-CONTEXT.md/02-RESEARCH.md (operação idempotente e de baixa consequência)"

patterns-established: []

requirements-completed: [COMP-02]

# Metrics
duration: 3min
completed: 2026-07-11
---

# Phase 2 Plan 3: Endpoint HTTP de unsubscribe Summary

**GET+POST /unsubscribe no `httpRouter` de `convex/http.ts`, handler único que sempre responde 200 HTML genérico e delega a gravação da supressão para `internal.suppressions.unsubscribeByToken` — sem auth, sem leak de validade do token.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-07-11T04:18:00Z (approx, based on session start)
- **Completed:** 2026-07-11T04:21:29Z
- **Tasks:** 1/1
- **Files modified:** 1

## Accomplishments
- Rotas `GET /unsubscribe` e `POST /unsubscribe` registradas no mesmo `httpRouter` que já hospeda `POST /stripe/webhook`, sem tocar nesse último
- Handler compartilhado (mesma instância `httpAction` para as duas rotas) — garante RFC 8058 one-click e resposta idêntica entre GET e POST
- No-leak: token ausente, desconhecido ou reusado produz exatamente a mesma resposta 200 que um token válido; a diferença fica só no efeito colateral (gravação ou não em `suppressions` via `internal.suppressions.unsubscribeByToken`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Rotas GET + POST /unsubscribe (handler compartilhado, no-leak)** - `e85fe52` (feat)

**Plan metadata:** (próximo commit — docs: complete plan)

_Nota de execução: por rodar em paralelo com o plano 02-04 no mesmo working tree (conforme previsto no roadmap), houve uma corrida momentânea na staging area do git — o primeiro `git commit` de um dos dois agentes paralelos capturou o diff de `convex/http.ts` junto com arquivos do outro plano. Isso foi detectado, e o conteúdo do arquivo permaneceu correto o tempo todo; o commit foi reorganizado (pelo agente concorrente, via `git reset` local, sem reescrever histórico já compartilhado) até `convex/http.ts` ficar isolado na staging area, então este plano o commitou normalmente como `e85fe52` com a mensagem correta. Nenhum código foi perdido, duplicado ou alterado — só a atribuição do commit foi corrigida antes de finalizar._

## Files Created/Modified
- `convex/http.ts` - adiciona handler `unsubscribe` (httpAction compartilhado) e as rotas `GET`/`POST` `/unsubscribe`, mantendo `POST /stripe/webhook` intacto

## Decisions Made
- Seguiu exatamente as decisões já travadas em 02-CONTEXT.md/02-RESEARCH.md: sem auth, sem confirmação em duas etapas, resposta 200 genérica sempre
- Nenhuma decisão nova de arquitetura tomada neste plano

## Deviations from Plan

None - plan executed exactly as written. (A única anomalia foi de infraestrutura de execução — corrida de staging do git com o plano paralelo 02-04, resolvida antes do commit final; documentada acima na seção Task Commits. Não é uma mudança de código em relação ao plano.)

## Issues Encountered
- Corrida momentânea de staging do git com o agente paralelo do plano 02-04 (mesmo working tree). Resolvida sem reescrever histórico compartilhado; commit final `e85fe52` contém exatamente e somente o diff de `convex/http.ts` desta Task 1.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `GET`/`POST /unsubscribe` prontos; smoke test real (`curl` contra `$CONVEX_SITE_URL/unsubscribe?token=...`) requer deployment, fora do escopo deste plano (ver seção `<verification>` do plano)
- Nenhum bloqueio identificado

---
*Phase: 02-compliance-de-email-e-whatsapp*
*Completed: 2026-07-11*

## Self-Check: PASSED

`convex/http.ts` verified present on disk with both `/unsubscribe` routes; commit `e85fe52` verified present in git history containing exactly `convex/http.ts`.
