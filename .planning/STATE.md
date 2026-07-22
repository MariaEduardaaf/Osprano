---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: milestone-complete
stopped_at: Phase 4 executada e verificada — milestone v1.0 completo
last_updated: "2026-07-22T00:00:00.000Z"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 17
  completed_plans: 17
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-11)

**Core value:** O usuário prospecta e aborda negócios europeus sem risco legal — compliance garantido por código, contagem de plano/billing íntegra.
**Current focus:** nenhum — as 4 fases do milestone v1.0 estão completas e verificadas

## Current Position

Phase: 4 (Modo opt-in ligação-primeiro) — COMPLETE
Plan: 6 of 6

Todos os 18 requisitos v1 estão fechados. Próximo passo é operacional, não de
código: ligar o deployment real seguindo `docs/CHECKLIST-MODO-REAL.md`.
O backlog v2 (SCAL-01..03, GDPR-01/02, BILL-04/05) segue em REQUIREMENTS.md.

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

### Roadmap Evolution

- Phase 4 added: Modo opt-in (ligação-primeiro) para mercados opt-in (ES/IT/PT/DE/DK/CH) — aba Ligação primeiro, script de IA, consentimento destrava email (OPTIN-01..06)

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

- [Phase 4]: 04-01: `isEmailable` NÃO muda — quem abre a descoberta é `isSearchableMarket`; emailabilidade segue governada por `isLaunchMarket`
- [Phase 4]: 04-03: `canContactByEmail` é o ÚNICO predicado de "abordável" — leitura crua de `lead.emailable` para decidir abordabilidade é bug (achado em 6 telas na verificação)
- [Phase 4]: 04-03: guardrail aplicado nos TRÊS caminhos de "email enviado" (draft, send, markSent) + upsertDraft/updateDraft por defesa em profundidade
- [Phase 4]: 04-03: `callScript` NÃO checa supressão de propósito — supressão é indexada por email; ligação é o canal que resta quando o email está bloqueado
- [Phase 4]: verificação: o slot `action` do card não pode ser gateado por consentimento — na página de Leads ele é a geração de PRÉVIA, que o script de ligação promete ao prospect
- [Phase 4]: OPTIN-06: o aviso jurídico deriva de `MARKETS[país].legalReview`, não da aba — senão validar um país não muda nada
- [Phase 4]: i18n: `LANG.PT` é "European Portuguese (pt-PT)" e o prompt separa as audiências — o prospect português lê pt-PT, só a tradução da usuária é pt-BR
- [Phase 4]: bug pré-existente: `outreach` é compartilhada com o WhatsApp; toda leitura por `by_lead` precisa filtrar `channel === "email"`
- [Pós-fase 4]: Suíça multilíngue — idioma vem de `(país, cidade)` via `swissLanguage`; `langForLead`/`localeForLead` são as fontes de verdade, `LANG[countryCode]` cru só vale para país monolíngue
- [Pós-fase 4]: o campo `city` tem 3 origens (select da UI = forma local · foursquare locality = subúrbio · criação manual = texto livre). O Places NÃO é origem do nome da cidade — `places.ts` grava `args.city`

### Blockers/Concerns

[Issues that affect future work]

- RESOLVIDO (fases 2-3 executadas em ordem): Phase 2 e Phase 3 tocam a mesma mutation `send` em `convex/outreach.ts` (Phase 2 injeta rodapé de opt-out; Phase 3 troca a fonte do subject/body para o composer e adiciona marcação manual de "respondeu"). Executar Phase 2 antes de Phase 3 evita retrabalho — já refletido na ordem do roadmap.
- RESOLVIDO (executadas em ordem): Phase 1 (BILL-03) e Phase 2 (COMP-02) tocam ambas `convex/http.ts` (webhook Stripe e endpoint de unsubscribe). Não é dependência técnica dura, mas a ordem sequencial evita conflitos.

## Session Continuity

Last session: 2026-07-22
Stopped at: Phase 4 mergeada na main; Suíça multilíngue (de/fr/it) na branch feat/suica-multilingue
Resume file: .planning/phases/04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal/04-VERIFICATION.md

## Pendências operacionais (não são código)

- `npx convex codegen`/`deploy` não rodam nesta máquina (deployment do `.env.local` é local e inacessível). O schema da Fase 4 só chega ao banco ao rodar `npx convex dev` — passo 1 do `docs/CHECKLIST-MODO-REAL.md`. Campos novos são todos opcionais → migração não-quebra.
- `pnpm test/typecheck/lint` abortam neste terminal (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). Usar `npx tsc --noEmit`, `npx eslint`, `node --experimental-strip-types --test tests/*.test.ts`.
