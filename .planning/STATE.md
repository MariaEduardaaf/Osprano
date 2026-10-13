---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Pronto pra vender
status: ready-to-plan
stopped_at: Roadmap do milestone v1.3 "Pronto pra vender" criado (Fases 9-16, 48/48 requisitos mapeados); Fase 9 pronta para planejar.
last_updated: "2026-10-12T00:00:00.000Z"
progress:
  total_phases: 16
  completed_phases: 10
  total_plans: 22
  completed_plans: 22
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-12)

**Core value:** O usuário prospecta e aborda negócios europeus sem risco legal — compliance garantido por código, contagem de plano/billing íntegra.
**Current focus:** v1.3 Pronto pra vender: vender o Osprano como SaaS por assinatura, sem envio automático no lançamento.

## Current Position

Phase: 12 e 13 de 16 (Planos e custo; Remetente), planejamento. Fase 11 adiada pela Duda em 2026-10-13 (beta fechado sem cobrança automática; volta antes do lançamento). Fases 9 e 10 em produção desde 2026-10-12 (main = v1.3-pronto-pra-vender em b3ef3f7); migração dos 11 leads do Google feita e auditada
Plan: —
Status: Ready to plan
Last activity: 2026-10-12 — Roadmap do v1.3 "Pronto pra vender" criado (Fases 9-16; substitui "Automação da prospecção", Fases 9-14 nunca iniciadas)

Contexto de produção em 2026-09-26: Google Places ligada em prod (projeto GCP
`soprano-503222`, faturamento "Pagamento do Firebase", cota SearchText 30/dia,
`GOOGLE_PLACES_API_KEY` no Convex prod). Pendências externas da Duda por fase: dados da empresa brasileira (razão social, CNPJ, endereço),
advogado e caixa de suporte (Fase 9); conta Stripe da empresa brasileira, preços e orientação do contador (Fases 11 e
16); `ANTHROPIC_API_KEY` em prod (Fase 12); conta/chave Serper.dev (Fase 14);
dependências novas de monitor de erros e i18n (Fase 15). Envio automático e follow-up
estão no backlog v2 (AUTO-*, FUP-*).

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
- Milestone v1.2 (2026-09-18), fora do GSD: Phase 7 Descoberta via OpenStreetMap e "Ver o que ele tem" (DISC-01/02, commits diretos, sem spec/plano) e Phase 8 Modelos de site (SITE-01..07, workflow superpowers: spec + adendo, planos A/B em arquivo, C inline)
- Milestone v1.3 REDEFINIDO (2026-10-12) como "Pronto pra vender": Fases 9-16 (9 Honestidade e jurídico, 10 Dados do Google conformes, 11 Cobrança endurecida, 12 Planos e custo, 13 Remetente e envio pelo e-mail do cliente, 14 Prospecção assistida, 15 Primeiro uso/operação/idioma, 16 Portão de lançamento). A entrada abaixo (Fases 9-14 de 2026-09-26) está substituída e nunca começou.
- (substituído) Milestone v1.3 (2026-09-26), roadmap criado via GSD a partir da pesquisa em `.planning/research/SUMMARY.md`: Phase 9 Base de compliance compartilhada (BASE-01..04), Phase 10 Verificação de site e redes sociais (VERIF-01..04), Phase 11 Fila "Ligar" no CRM (CALL-01..03), Phase 12 Pipeline automático em modo rascunho (PIPE-01..04), Phase 13 Envio automático + teto diário (AUTO-01..05), Phase 14 Follow-up automático (FUP-01..02). Ordem por risco crescente, não por valor percebido (ver ROADMAP.md).

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
- [Pesquisa v1.3]: Serper.dev aprovado como serviço de busca web (verificação de site + redes sociais); cota do Google Places como fallback só se o volume verificado for pequeno
- [Pesquisa v1.3]: Noruega tratada como mercado de ligação primeiro (`legalReview: "pending"`) até validação jurídica, não mais equivalente a GB/NL/IE/SE
- [Pesquisa v1.3]: provedor de envio automático (Resend proíbe cold outreach na AUP) fica para decisão dedicada antes do planejamento da Fase 13, comparando ESP cold-email-friendly vs. caixa própria (Gmail/Workspace)
- [Pesquisa v1.3]: webhooks de entrega do Resend (bounce/complaint) tratados como pré-requisito técnico da Fase 14, não como "nice to have"; Resend Inbound (MX) fica para decisão separada de DNS

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
- [Phase 7]: quota cobra só o lead realmente inserido, mesmo numa busca repetida no mesmo lugar; a busca no OSM traz um pool maior de candidatos pra sobrar lead novo
- [Phase 7]: fallback de espelho do Overpass em erro 429/503/504, incluindo o espelho suíço (`overpass.osm.ch`, o `kumi.systems` não responde)
- [Phase 8]: um conteúdo só por lead: o `content` do preview é a fonte de verdade; editar o lead depois (contato, telefone) não propaga para o site salvo
- [Phase 8]: salvar depois de publicado altera o site no ar na hora, sem republicar (`publish` já é idempotente)
- [Phase 8]: nada é apagado do storage antes do Salvar: o servidor apaga o que saiu do `content` antigo só depois de gravar o novo, senão trocar uma foto destruiria a anterior antes de confirmar
- [Phase 8]: regra de honestidade: texto padrão de `templates.*` nunca afirma fato do negócio de terceiro (sem dígito, sem superlativo); seção com dado só aparece quando ela preenche
- [Phase 8]: pós-UAT, `registerUpload` valida o `contentType` real do storage (não confia no que o cliente prometeu mandar); `getBySlug` não devolve mais o token rastreado da prévia
- [Pesquisa v1.3]: nenhuma dependência npm nova é necessária para as Fases 9/11/12 (scheduler.runAfter, cronJobs e crypto.subtle nativos do Convex cobrem orquestração, teto diário e verificação de assinatura de webhook)
- [Pesquisa v1.3]: envio automático precisa de trava atômica (mutation "reivindica" o envio antes do fetch ao provedor); o botão manual é protegido só pelo humano clicar uma vez, o pipeline não tem essa proteção de graça
- [Pesquisa v1.3]: `warnings` de alucinação da IA (`no-verified-signal`/`locality-claim`) já existem no código e precisam bloquear o envio automático sem exceção, caindo em fila de revisão (Fase 12/PIPE-04)
- [Pesquisa v1.3]: `@convex-dev/workpool`/`rate-limiter`/`action-retrier` descartados de propósito: pacotes pré-1.0 que resolvem escala que este produto não tem

### Blockers/Concerns

[Issues that affect future work]

- RESOLVIDO (fases 2-3 executadas em ordem): Phase 2 e Phase 3 tocam a mesma mutation `send` em `convex/outreach.ts` (Phase 2 injeta rodapé de opt-out; Phase 3 troca a fonte do subject/body para o composer e adiciona marcação manual de "respondeu"). Executar Phase 2 antes de Phase 3 evita retrabalho — já refletido na ordem do roadmap.
- RESOLVIDO (executadas em ordem): Phase 1 (BILL-03) e Phase 2 (COMP-02) tocam ambas `convex/http.ts` (webhook Stripe e endpoint de unsubscribe). Não é dependência técnica dura, mas a ordem sequencial evita conflitos.
- ABERTO: Fase 10 não pode ser planejada em detalhe até a usuária criar conta e chave da Serper.dev.
- ABERTO: Fase 12 não pode enviar mensagem de verdade (nem ser totalmente testada em produção) sem `ANTHROPIC_API_KEY` configurada em prod.
- ABERTO: Fase 13 não pode começar a ser planejada até decidir o provedor de envio automático (Resend proíbe cold outreach na própria AUP); pesquisa dedicada recomendada antes do `/gsd:plan-phase 13`.
- ABERTO: Fase 14 depende da decisão de escopo do webhook de bounce/denúncia (Decisão da Duda item 3 da pesquisa), que também é pré-requisito técnico da própria Fase 14.

## Session Continuity

Last session: 2026-10-12
Stopped at: Roadmap do milestone v1.3 "Pronto pra vender" criado (Fases 9-16 em `.planning/ROADMAP.md`), traceability atualizada (48/48 mapeados); aguardando aprovação da Duda
Resume file: próximo passo é `/gsd:plan-phase 9`; docs/CHECKLIST-MODO-REAL.md (seção 3.0, seção 9 e seção 10) seguem pendentes como pendência operacional separada

## Pendências operacionais (não são código)

- RESOLVIDO 2026-07-22: o `CONVEX_DEPLOYMENT` apontava para o projeto `sitescout` (nome antigo do repo), que não existe mais na conta — daí "You don't have access to the selected project" em todo comando Convex. Reconfigurado para o projeto `osprano` com deployment LOCAL (`npx convex dev --once --configure new --project osprano --dev-deployment local`). Codegen roda, schema da Fase 4 no banco, guardrails validados em runtime (ver 04-VERIFICATION.md §Verificação de runtime).
- Deployment atual é LOCAL (grátis, offline). Para uso real com Clerk/Resend, trocar para nuvem — passo 1 do `docs/CHECKLIST-MODO-REAL.md`.
- Falta ainda: `GOOGLE_PLACES_API_KEY` (busca real, já em prod desde 2026-09-26), `ANTHROPIC_API_KEY` (script/email por IA, bloqueia a Fase 12), `RESEND_API_KEY` (envio; provedor a decidir antes da Fase 13).
- `pnpm test/typecheck/lint` abortam neste terminal (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). Usar `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/eslint`, `node --experimental-strip-types --test tests/*.test.ts`, ou `pnpm install` num terminal com TTY.
- 2026-09-16: a `ANTHROPIC_API_KEY` atual foi impressa num terminal durante a sessão. Rotacionar antes de qualquer deploy (checklist 3.0).
- 2026-09-17: UAT executado em browser real (CDP), 22/22 PASS após o fix `89523a0`; roteiros de Task 29 e Tarefa 26 cobertos, exceto o que é sensação (arrasto, tema ao vivo, reduzir transparência).
- 2026-09-18: milestone v1.2 fechado (Fases 7 e 8); UAT em navegador real por fase, achados corrigidos nos commits do merge final (`07965dc`). Pendência operacional continua a mesma de sempre: produção (seção 9) e rotação da chave Anthropic (3.0), ainda não feitas.
- 2026-09-26: milestone v1.3 iniciado; roadmap criado (Fases 9-14). Três decisões de produto/infra ainda em aberto com a Duda antes do planejamento detalhado de fases específicas: conta Serper.dev (Fase 10), `ANTHROPIC_API_KEY` em prod (Fase 12), provedor de envio automático (Fase 13).
