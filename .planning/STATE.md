---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: Completed 03-04-PLAN.md
last_updated: "2026-07-11T05:23:30.305Z"
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 11
  completed_plans: 11
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-11)

**Core value:** O usuário prospecta e aborda negócios europeus sem risco legal — compliance garantido por código, contagem de plano/billing íntegra.
**Current focus:** Phase 3 — Tracking, Composer e Localização

## Current Position

Phase: 3 (Tracking, Composer e Localização) — COMPLETE
Plan: 4 of 4

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 01 P02 | 2min | 2 tasks | 3 files |
| Phase 01 P01 | ~15min | 3 tasks | 6 files |
| Phase 01 P03 | 3min | 2 tasks | 6 files |
| Phase 2 P1 | 5min | 3 tasks | 8 files |

**Recent Trend:**

- Last 5 plans: 01-01 (~15min), 01-02 (2min), 01-03 (3min), 02-01 (5min)
- Trend: -

*Updated after each plan completion*
| Phase 02 P03 | 3min | 1 tasks | 1 files |
| Phase 02 P04 | 3min | 3 tasks | 4 files |
| Phase 02 P02 | 6min | 3 tasks | 1 files |
| Phase 3 P01 | 1min | 1 tasks | 1 files |
| Phase 03 P02 | 6min | 2 tasks | 3 files |
| Phase 03 P03 | 6min | 2 tasks | 2 files |
| Phase 03 P04 | 7min | 3 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1: Plano Stripe derivado do `price_id` (mapa via env `STRIPE_PRICE_*`), não de `metadata.plan`
- Phase 2: Supressão como tabela Convex própria, checada em `draft` e `send`
- Phase 2: Opt-out injetado por código no `send` — não confiar no prompt da IA
- Phase 3: "Respondeu" é manual nesta fase; webhook inbound do Resend fica para v2
- Phase 3: Localizar o template de preview existente; geração de preview por IA fica para v2/v3
- [Phase 01]: Refund amount always want - inserted (never a fixed want), covering both zero-insert and partial-insert failures
- [Phase 01]: clampDiscoveryCount: NaN/Infinity falls back to default 20, not floor 1 (Math.max(NaN,1) is NaN in JS)
- [Phase 01]: SEC-01: isDemoEnabled default-deny (CONVEX_ENV === "development"), não default-allow — env esquecida em prod real mantém demo OFF
- [Phase 2]: 02-01: senderIdentityFrom precisa de trim() antes do match para tolerar espaço à direita em RESEND_FROM
- [Phase 02]: 02-04: gate por estágio removido por completo em sendFollowup (não deixado como condição secundária) — só waOptInAt libera WhatsApp
- [Phase 02]: 02-02: checagem de supressão duplicada em draft (evita gastar IA) e em send (defesa em profundidade, cobre body editado manualmente)
- [Phase 02]: 02-02: unsubscribeToken gerado em upsertDraft e re-garantido via backfill on-demand em send (cobre rows legadas sem token)
- [Phase 3]: 03-01: recordOpen ganhou guarda de self-open (identity.subject === preview.orgId) — só o servidor decide, PreviewTracker e modo demo intocados
- [Phase 3]: 03-02: mapa countryCode->locale independente do LANG de outreachAi.ts (formatos incompatíveis: nomes de idioma vs. códigos de locale)
- [Phase 3]: 03-03: repliedAt entra na frente da cadeia de fallback de activityAt na outbox, senão itens marcados respondeu ficam presos no horário de abertura/envio
- [Phase 3]: 03-03: updateDraft não chama withOptOutFooter — rodapé é responsabilidade exclusiva de upsertDraft/send, evita duplicar lógica de compliance
- [Phase 03]: 03-04: hidratação do composer via key-remount (não useRef+useEffect) — react-hooks/set-state-in-effect e react-hooks/refs são 'error' no React Compiler deste projeto
- [Phase 03]: 03-04: markReplied (Respondeu) nunca altera stage do lead — só o status do outreach

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- Phase 2 e Phase 3 tocam a mesma mutation `send` em `convex/outreach.ts` (Phase 2 injeta rodapé de opt-out; Phase 3 troca a fonte do subject/body para o composer e adiciona marcação manual de "respondeu"). Executar Phase 2 antes de Phase 3 evita retrabalho — já refletido na ordem do roadmap.
- Phase 1 (BILL-03) e Phase 2 (COMP-02) tocam ambas `convex/http.ts` (webhook Stripe e endpoint de unsubscribe). Não é dependência técnica dura, mas a ordem sequencial evita conflitos.

## Session Continuity

Last session: 2026-07-11T05:23:30.301Z
Stopped at: Completed 03-04-PLAN.md
Resume file: None
