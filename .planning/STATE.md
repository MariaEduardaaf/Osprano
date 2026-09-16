---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: milestone
status: milestone-complete
stopped_at: Fases 5 e 6 mergeadas (redesenho vidro sobre névoa + CRM fluxo do dia); milestone v1.1 completo, falta UAT manual e produção
last_updated: "2026-09-16T00:00:00.000Z"
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 19
  completed_plans: 19
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-11)

**Core value:** O usuário prospecta e aborda negócios europeus sem risco legal — compliance garantido por código, contagem de plano/billing íntegra.
**Current focus:** nenhum de código. As 6 fases (v1.0 + v1.1) estão completas e mergeadas; o que resta é operacional (produção) e a validação manual da Duda.

## Current Position

Phase: 6 (CRM: fluxo do dia e informação do lead): COMPLETE
Plan: 1 of 1 (superpowers, não GSD)

Milestone v1.1 fechado em 2026-09-16: Fase 5 (redesenho vidro sobre névoa,
merge `0460e66`) e Fase 6 (CRM: próxima ação, faixa Hoje, parados, Perdido
com motivo, contato/valores, Histórico; merge `828a11f`). 18 requisitos v1 +
12 requisitos v1.1 fechados; suíte em 208 testes. As duas fases foram
executadas com o workflow superpowers: spec e plano em `docs/superpowers/`,
sem `.planning/phases/05-*` e `06-*`.

Próximo passo:
1. `docs/CHECKLIST-MODO-REAL.md` seção 9 (Vercel + Convex prod), começando
   pelo 3.0 (rotacionar a chave da Anthropic, impressa num terminal nesta
   sessão).
2. UAT manual da Duda: última tarefa de cada plano (`Task 29` do redesenho,
   `Tarefa 26` do CRM), roteiro no navegador com o seed do demo.
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
- Milestone v1.1 (2026-09-16), fora do GSD: Phase 5 Redesenho vidro sobre névoa (UX-01..05) e Phase 6 CRM fluxo do dia e informação do lead (CRM-01..07), ambas via superpowers (spec + plano em `docs/superpowers/`)

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
- [Phase 5]: tokens do redesenho escopados a `:root:has(.app-shell)`; landing e `/p`, `/site` ficam com os tokens antigos. Vidro só no primeiro nível, sólido por dentro; `--border` não muda (divisor interno), a borda translúcida é `--glass-border`
- [Phase 5]: `* { border-color }` fora de `@layer` vencia todo utilitário de borda (bug pré-existente); movido para `@layer base` em commit separado. `backdrop-filter` só sem prefixo (o Lightning CSS gera o `-webkit-` e descartava a forma sem prefixo)
- [Phase 5]: `--brand` como texto no escuro fica em 3,0:1 e badges de tier entre 3,9 e 4,1: aceitos e registrados; a correção certa (token `--brand-text`, tinte próprio do Badge) é trabalho à parte
- [Phase 6]: uma próxima ação por lead no próprio documento (sem tabela `tasks`); notas são eventos (`events.type = "note"`), não tabela própria; "Hoje" e toda aritmética de data rodam no navegador (Convex é UTC, o dia civil é o do navegador)
- [Phase 6]: `setStage` recusa `lost` no servidor; só `markLost` (com motivo) leva a Perdido, e sair de `lost` limpa o motivo. "Parado" conta de `stageUpdatedAt`, não do último evento
- [Phase 6]: moeda derivada do país (GB→GBP, SE→SEK, NO→NOK, CH→CHF, DK→DKK, resto EUR), sem campo no schema

### Blockers/Concerns

[Issues that affect future work]

- RESOLVIDO (fases 2-3 executadas em ordem): Phase 2 e Phase 3 tocam a mesma mutation `send` em `convex/outreach.ts` (Phase 2 injeta rodapé de opt-out; Phase 3 troca a fonte do subject/body para o composer e adiciona marcação manual de "respondeu"). Executar Phase 2 antes de Phase 3 evita retrabalho — já refletido na ordem do roadmap.
- RESOLVIDO (executadas em ordem): Phase 1 (BILL-03) e Phase 2 (COMP-02) tocam ambas `convex/http.ts` (webhook Stripe e endpoint de unsubscribe). Não é dependência técnica dura, mas a ordem sequencial evita conflitos.

## Session Continuity

Last session: 2026-09-16
Stopped at: Fases 5 e 6 mergeadas (`0460e66`, `828a11f`); branch `chore/producao` com docs, checklist de produção e planning atualizados para v1.1
Resume file: docs/CHECKLIST-MODO-REAL.md (seção 3.0 e seção 9) e os roteiros manuais em docs/superpowers/plans/*.md (última tarefa de cada)

## Pendências operacionais (não são código)

- RESOLVIDO 2026-07-22: o `CONVEX_DEPLOYMENT` apontava para o projeto `sitescout` (nome antigo do repo), que não existe mais na conta — daí "You don't have access to the selected project" em todo comando Convex. Reconfigurado para o projeto `osprano` com deployment LOCAL (`npx convex dev --once --configure new --project osprano --dev-deployment local`). Codegen roda, schema da Fase 4 no banco, guardrails validados em runtime (ver 04-VERIFICATION.md §Verificação de runtime).
- Deployment atual é LOCAL (grátis, offline). Para uso real com Clerk/Resend, trocar para nuvem — passo 1 do `docs/CHECKLIST-MODO-REAL.md`.
- Falta ainda: `GOOGLE_PLACES_API_KEY` (busca real), `ANTHROPIC_API_KEY` (script/email por IA), `RESEND_API_KEY` (envio).
- `pnpm test/typecheck/lint` abortam neste terminal (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). Usar `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/eslint`, `node --experimental-strip-types --test tests/*.test.ts`, ou `pnpm install` num terminal com TTY.
- 2026-09-16: a `ANTHROPIC_API_KEY` atual foi impressa num terminal durante a sessão. Rotacionar antes de qualquer deploy (checklist 3.0).
- 2026-09-16: UAT manual pendente com a Duda: Task 29 do plano do redesenho e Tarefa 26 do plano do CRM (roteiros no navegador, modo demo).
