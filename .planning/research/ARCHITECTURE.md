# Architecture Research

**Domain:** Integração da automação de prospecção (v1.3) na base Convex/Next.js existente do Osprano
**Researched:** 2026-09-26
**Confidence:** HIGH para os pontos de integração e padrões Convex (lidos direto do código); MEDIUM para o mecanismo de "verificação de site na web" (depende de uma decisão de produto/API ainda em aberto, sinalizada abaixo)

## Como este documento foi feito

Leitura direta de `convex/schema.ts`, `convex/places.ts`, `convex/osm.ts`, `convex/lib/domain.ts`, `convex/outreach.ts`, `convex/lib/outreachAi.ts`, `convex/previews.ts`, `convex/leads.ts`, `convex/model/workspace.ts`, `convex/model/tenant.ts`, `convex/model/previews.ts`, `convex/model/leads.ts`, `convex/http.ts`, `convex/suppressions.ts`, `convex/whatsapp.ts`, `convex/scoring.ts`, `convex/lib/enrich.ts`, `src/app/(app)/leads/page.tsx` e `src/components/crm/lead-detail.tsx`. Não existe hoje `convex/crons.ts` nem qualquer fila/pipeline em background: todo o outreach atual é disparado por clique da usuária (`action`/`mutation` chamada da UI). Este é o maior salto arquitetural do milestone: introduzir processamento assíncrono multi-etapa, disparado automaticamente, com idempotência e novo agendamento (scheduler/crons) num codebase que hoje só tem `ctx.scheduler.runAfter(0, ...)` para uma única finalidade (disparar o scoring depois da descoberta).

## System Overview

```
┌───────────────────────────────────────────────────────────────────────────┐
│  UI (Next.js App Router)                                                  │
│  src/app/(app)/leads/page.tsx  ──"Enviar para CRM + automatizar"──┐        │
│  src/components/crm/lead-detail.tsx (aba nova: Ligação/Redes)     │        │
│  src/app/(app)/crm/calls/page.tsx (NOVO: fila "Ligação pendente")  │        │
└─────────────────────────────────────────────────────────────────┼────────┘
                                                                     │ mutation
┌────────────────────────────────────────────────────────────────▼────────┐
│  Convex API pública/interna                                              │
│                                                                            │
│  convex/pipeline.ts (NOVO)         convex/followups.ts (NOVO)            │
│    enqueue (mutation)                 dispatchDue (internalAction, cron) │
│    runStep (internalAction)                                              │
│                                                                            │
│  convex/verification.ts (NOVO)     convex/leads.ts (MODIFICADO)          │
│    checkWebPresence (internalAction)  recordCallOutcome, pendingCalls    │
│                                                                            │
│  convex/outreach.ts (MODIFICADO)   convex/model/outreachSend.ts (NOVO)   │
│    draft, send (refatorados)          sendEmailForLead (compartilhado)   │
│    draftDm (NOVO, ação de DM)                                            │
│                                                                            │
│  convex/model/sendCap.ts (NOVO)    convex/model/pipeline.ts (NOVO)       │
│    reserveDailySend / refund          claim* (transições atômicas)       │
│                                                                            │
│  convex/crons.ts (NOVO)                                                  │
│    sweep de pipeline travado, dispatch de follow-up, drenagem da fila    │
└──────────────────────────────────────────┬───────────────────────────────┘
                                             │ ctx.db / fetch
┌──────────────────────────────────────────▼───────────────────────────────┐
│  Convex DB (schema.ts, MODIFICADO)          │  Serviços externos          │
│  leads (+ campos de verificação/ligação)    │  Resend (envio + futuro    │
│  outreach (+ campos de follow-up)           │    webhook de bounce)      │
│  previews (sem mudança)                     │  Anthropic (draft, script, │
│  pipelineRuns (NOVA)                        │    follow-up, DM social)   │
│  dailySendCounters (NOVA)                   │  Google Places (Text       │
│  suppressions (sem mudança)                 │    Search, cota 30/dia)    │
│  events (+ tipos novos)                     │  Verificação de site na    │
│                                              │    web (MECANISMO A        │
│                                              │    DECIDIR, ver seção      │
│                                              │    "Decisão em aberto")    │
└────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Componente | Responsabilidade | Novo/Modificado |
|---|---|---|
| `convex/pipeline.ts` | API pública (`enqueue`) e orquestração interna (`runStep`) do pipeline por lead: verifica site, gera preview, gera mensagem, decide canal, aciona envio ou fila de ligação | NOVO |
| `convex/model/pipeline.ts` | Máquina de estado pura/ctx: transições atômicas (`claimStep`), leitura de status, cálculo do próximo passo | NOVO |
| `convex/verification.ts` | Ação que confere na web se o negócio tem site de verdade e descobre redes sociais; alimenta o gate de "virar prospect" e o passo 1 do pipeline | NOVO |
| `convex/model/outreachSend.ts` | Função única de envio de email compartilhada entre o botão manual (`outreach.send`) e o pipeline automático; concentra TODOS os gates de compliance num só lugar | NOVO (extraído de `convex/outreach.ts`) |
| `convex/model/sendCap.ts` | Teto diário de envio automático por org: reserva/estorno, no mesmo idioma de `model/workspace.ts` | NOVO |
| `convex/followups.ts` | Varre `outreach` em busca de follow-up vencido e reexecuta os gates de compliance antes de cada envio | NOVO |
| `convex/crons.ts` | Declaração dos `cronJobs()`: drenagem da fila do pipeline, sweep de execuções travadas, disparo de follow-up | NOVO |
| `convex/outreach.ts` | Mantém `draft`/`send`/`callScript`/`markDm` como API pública; `send` passa a delegar para `model/outreachSend.ts`; ganha `draftDm` (mensagem pronta para copiar em Instagram/Facebook) | MODIFICADO |
| `convex/leads.ts` | Ganha `recordCallOutcome` (resultado da ligação pendente) e `pendingCalls` (fila); `insertDiscovered`/`applyScore` passam a gravar os novos campos de verificação de site | MODIFICADO |
| `convex/schema.ts` | Novas tabelas (`pipelineRuns`, `dailySendCounters`) e novos campos em `leads`/`outreach`, mais novos literais em `events.type` | MODIFICADO |
| `convex/model/leads.ts` (`deleteLeadCascade`) | Passa a apagar também a linha de `pipelineRuns` do lead | MODIFICADO |
| `convex/lib/domain.ts` | Ganha `decideChannel(lead)` puro (email/ligação/social/nenhum), testável como o resto do arquivo | MODIFICADO |
| `convex/lib/outreachAi.ts` | Ganha prompts para follow-up de email e para mensagem social (DM), reaproveitando as mesmas travas de honestidade/identidade/opt-out já existentes | MODIFICADO |
| `convex/http.ts` | Rota nova opcional de webhook do Resend (bounce), necessária para a condição de parada "bounce" do follow-up | MODIFICADO (condicional, ver build order) |

## Integration Points (com caminho de arquivo)

### 1. Verificação de "tem site de verdade?" antes de virar prospect

Hoje `classifyWebsite` (`convex/lib/domain.ts:564`) só classifica o campo `website` que a PRÓPRIA fonte (Places/OSM) trouxe. Isso é passivo: não confere nada além do que a fonte já disse. O problema relatado por ela ("os clientes que ele mostra já têm website") é justamente a lacuna entre "a fonte não tinha o campo" e "o negócio realmente não tem site".

Integração proposta: uma nova ação `convex/verification.ts` (`checkWebPresence`, internalAction) chamada como **primeiro passo do pipeline pós-seleção**, não na descoberta em massa. Isso é deliberado: a Google Places API está em produção com cota de 30 buscas/dia (`.planning/PROJECT.md`), e qualquer verificação em lote no momento da descoberta estouraria a cota em minutos. Como o fluxo dela é "eu escolho os leads, o app faz o resto", o volume verificado por dia é exatamente o que ela seleciona manualmente, não o total descoberto. Isso resolve o gargalo de cota sem gating adicional.

Resultado gravado em `leads`: `siteCheckStatus: "no_site" | "has_site" | "inconclusive"`, `siteCheckedAt`, `siteCheckSource` (string livre, ex. `"places_text_search"` ou o método escolhido). Quando `has_site`, o pipeline para e marca o lead como perdido com o motivo que já existe no schema (`lostReason: "has_site"`, ver `convex/schema.ts:27`) em vez de inventar um novo enum. Quando `inconclusive`, o pipeline segue (não trava a automação por uma verificação que não deu resultado), mas fica marcado para ela revisar manualmente, seguindo a mesma filosofia de "não medido nunca vira pain/veredito" que já rege `convex/lib/enrich.ts`.

**Decisão em aberto (precisa da confirmação dela antes da Fase 2 do build order):** qual mecanismo faz a verificação de fato.
- Opção A (reaproveita infraestrutura existente): Google Places Text Search por `"<nome> <cidade>"`, usando a mesma `GOOGLE_PLACES_API_KEY` já configurada, olhando só `websiteUri` no resultado mais próximo por nome. Zero dependência nova, mas consome a MESMA cota de 30/dia que a descoberta já disputa: cada lead verificado é uma busca a menos disponível para descobrir leads novos no dia. Só viável se o volume diário de seleção for pequeno (poucas dezenas), o que é plausível dado o fluxo manual dela.
- Opção B (dependência nova, precisa aprovação): uma API de busca na web de propósito geral (Google Custom Search JSON API, Bing Web Search, SerpAPI). Resolve o problema de cota do Places, mas é uma conta/chave nova, com custo, e o `AGENTS.md` do repo exige confirmação da usuária antes de qualquer dependência nova.
- Opção C (sem chave, frágil): scraping de página de resultados de busca (DuckDuckGo HTML, por exemplo). Sem custo e sem chave, mas pisa em zona cinzenta de ToS e é o tipo de dependência externa não oficial que quebra sem aviso (o próprio `convex/osm.ts` já documenta a dor de depender de espelhos/endpoints de terceiros instáveis).

Recomendação: começar pela Opção A (zero fricção, já autorizada), e reavaliar a Opção B se o volume diário de leads selecionados por ela exceder a cota do Places sobrando depois da descoberta do dia. A interface da função deve ser desenhada de forma agnóstica ao mecanismo (`checkWebPresence(lead): Promise<{ status; source; siteUrl?; instagram?; facebook? }>`), para trocar o backend sem tocar no pipeline.

### 2. Descoberta de redes sociais (feature 5) reaproveita a MESMA chamada da feature 1

`convex/lib/osm.ts` já extrai `instagram`/`facebook` de tags do OpenStreetMap (`osmElementToLead`), e `normalizeInstagram`/`normalizeFacebook` (`convex/lib/domain.ts:477-500`) já normalizam esses valores. O que falta é achar redes sociais para leads vindos do Google Places (que não tem esse campo) ou do OSM sem a tag. Como a verificação de "tem site" (feature 1) e a busca de redes sociais (feature 5) são, na prática, a mesma pergunta feita à mesma fonte externa ("o que existe na web sobre este negócio"), `checkWebPresence` deve devolver os dois resultados na mesma chamada, evitando pagar 2x o custo de rede/API por lead. Isso é uma decisão de design, não só uma economia de custo: mantém um único ponto de verdade para "o que sabemos sobre a presença online deste negócio fora do que a fonte de descoberta disse".

A mensagem pronta para copiar (parte da feature 5) é uma nova ação `convex/outreach.ts` (`draftDm`), espelhando `draft` (email) mas com um prompt mais curto em `convex/lib/outreachAi.ts` (`writeSocialDm`), reaproveitando as MESMAS travas já existentes (`identityRules`, `honestyRules`, `observationRules`, `normalizeNamePlaceholder`, `detectLocalityClaims`): a IA que escreve para Instagram/Facebook não pode inventar localidade ou nome com menos rigor do que a de email. O envio em si continua manual (Instagram/Facebook proíbem automação, decisão dela já registrada no `PROJECT.md`), então o registro do envio continua sendo `outreach.markDm` (`convex/outreach.ts:370`, já existe), só que agora precedido por um rascunho persistido (`status: "draft"` na linha `channel: "dm"`) em vez de vir de um textarea sem estado salvo.

### 3. Pipeline automático pós-seleção

**Gatilho:** hoje "Enviar para CRM" é só `leads.saveMany` (`convex/leads.ts:696`), que apenas marca `saved: true`. A automação deve ser um passo explícito e SEPARADO desse (ela pode querer mandar para o CRM sem automatizar, ou reprocessar leads que já estão lá): uma nova mutation `pipeline.enqueue({ leadIds })` em `convex/pipeline.ts`, chamada pelo botão novo em `src/app/(app)/leads/page.tsx` (ao lado de ou substituindo "Enviar para CRM").

**Orquestração:** cada `leadId` ganha uma linha em `pipelineRuns` (nova tabela) com `status: "queued"`. `enqueue` agenda `ctx.scheduler.runAfter(0, internal.pipeline.runStep, { pipelineId })` para cada linha. `runStep` é uma `internalAction` (precisa ser action porque chama `fetch` externo: verificação de site, Anthropic, Resend) que executa as etapas EM SEQUÊNCIA dentro da mesma invocação (verificar site → gerar preview → gerar mensagem → decidir canal → enviar ou enfileirar ligação), atualizando o status em `pipelineRuns` a cada passo via `internalMutation`. Rodar os passos dentro de uma única action (em vez de encadear `scheduler.runAfter` a cada etapa) evita uma cascata de agendamentos por lead e mantém o rastro de erro num só lugar; o preço é que uma falha no meio do caminho deixa o `pipelineRuns` num estado intermediário, coberto pelo sweep de crons (ver Idempotência).

**Reaproveitamento explícito (não reinventar):** o passo "gerar preview" chama a MESMA `internal.previews.ensureForLead` que `outreach.draft`/`outreach.callScript` já usam (`convex/previews.ts:71`) e por isso **não cobra cota de `sitesUsed`** (só `previews.publish` cobra, `convex/previews.ts:236`). Isso é importante de preservar: o pipeline automático não deve chamar `publish` (isso cobraria cota e tornaria o site público/white-label sem revisão dela, que é uma decisão distinta e deliberada, hoje feita manualmente no editor `/crm/<leadId>/site`).

**Decisão de canal:** nova função pura em `convex/lib/domain.ts` (`decideChannel`), testável junto com o resto do arquivo (`tests/domain.test.ts`), que recomputa a decisão SEMPRE a partir do estado atual do lead (nunca de um valor cacheado), replicando o que `canContactByEmail`/`isSearchableMarket` já fazem: opt-out + `canContactByEmail(lead)` verdadeiro → `"email"`; opt-in sem consentimento e com telefone → `"call"`; sem email nem telefone, mas com Instagram/Facebook (do próprio lead ou vindo de `checkWebPresence`) → `"social"`; nenhum dos três → `"none"` (fica só no CRM, sinalizado para ação manual).

### 4. Envio automático imediato (opt-out) com teto diário

O envio manual de hoje (`convex/outreach.ts:485`, `send`) já concentra os gates certos: `canContactByEmail`, supressão (`suppressions.isSuppressed`), `draftLinkIssue` (link de opt-out válido), config de Resend, e o `markSent` que avança o estágio. Esse bloco inteiro precisa ser extraído para `convex/model/outreachSend.ts` como uma função `sendEmailForLead(ctx, { orgId, leadId })` chamável tanto pela action pública `outreach.send` (que hoje faz `requireOrgId`) quanto pelo pipeline interno (que já tem o `orgId` guardado na própria linha de `pipelineRuns`, sem `ctx.auth`). **Sem essa extração, a lógica de compliance ficaria duplicada em dois lugares e divergiria com o tempo,** que é exatamente o tipo de risco que o milestone anterior (COMP-01..04) já identificou e corrigiu para o caminho manual.

**Teto diário:** nova tabela `dailySendCounters` (`orgId`, `dateKey` no formato `"YYYY-MM-DD"` em UTC, `count`), com índice `by_org_date`. Novo módulo `convex/model/sendCap.ts` espelha literalmente o idioma de `convex/model/workspace.ts` (`reserveUsage`/`refundUsage`): `reserveDailySend(ctx, orgId)` lê/cria o contador do dia, recusa se `count >= cap`, incrementa; se o `fetch` do Resend falhar depois, `refundDailySend` devolve a unidade (mesmo padrão de reserva-antes-do-custo-externo já usado em `convex/places.ts`/`convex/osm.ts` para a cota de leads). O valor do teto é uma constante nova em `convex/lib/domain.ts` (ex. `DAILY_EMAIL_CAP_BY_PLAN`), não uma coluna de billing do Stripe: é um limite de segurança/deliverabilidade, não um item vendável, então não deveria aparecer em `PLANS` nem no webhook do Stripe (`convex/http.ts`). Isso é uma escolha deliberada de manter compliance separado de billing, ecoando a distinção que o schema já faz entre `emailable` (compliance) e `plan`/`leadsUsed` (billing).

**Ordem dos gates no envio automático:** verificação de site (não reenviar para quem tem site) → `decideChannel === "email"` → `canContactByEmail` → supressão → **teto diário** (reservado por último entre os gates de compliance, mas antes do `fetch` do Resend, no mesmo espírito de "reserva antes do custo externo, estorna se falhar"). Esse teto NUNCA aparece no envio manual pela composer (isso é intencional: o teto existe para o caminho automático sem revisão humana, não para o que ela decide clicar).

### 5. Fila "Ligação pendente" (mercados opt-in)

Quando `decideChannel` resolve `"call"`, o pipeline gera o script (reaproveitando a MESMA lógica de `outreach.callScript`, `convex/outreach.ts:278`, hoje uma `action` pública chamada por clique; precisa virar uma função compartilhada em `convex/model/outreachSend.ts` ou um novo `convex/model/callScript.ts` para o pipeline chamar sem depender de `requireOrgId`) e marca `leads.callQueueStatus: "pending"`.

Novos campos em `leads`: `callQueueStatus: v.optional(v.union(v.literal("pending"), v.literal("done")))`, `callOutcome: v.optional(v.union(v.literal("will_close"), v.literal("wont_close"), v.literal("asked_email")))`, `callOutcomeAt`, `callOutcomeNote`. Nova mutation `leads.recordCallOutcome({ leadId, outcome, note })` em `convex/leads.ts`, que:
- sempre marca `callQueueStatus: "done"` e grava um evento novo (`events.type` precisa ganhar o literal `"call_outcome"` em `convex/schema.ts:202-213`, hoje fechado num union sem esse valor);
- ramifica pelo resultado: `"wont_close"` chama a MESMA `markLost` já existente (motivo `"no_response"` ou `"not_interested"`, à escolha dela na UI); `"asked_email"` chama a MESMA `leads.recordContactOptIn` já existente (`convex/leads.ts:430`, fonte `"phone_call"`) e reagenda o lead no pipeline (`ctx.scheduler.runAfter(0, internal.pipeline.runStep, ...)`) para que o email saia imediatamente, agora com consentimento válido; `"will_close"` só fecha a pendência e deixa a próxima ação para ela decidir (reaproveita `nextActionAt`/`nextActionNote`, já existentes).

Isso reaproveita DUAS peças de compliance já auditadas (`markLost` exige motivo, `recordContactOptIn` grava origem+timestamp+evento) em vez de criar um caminho de consentimento paralelo, o que seria o tipo de "opt-in de segunda classe" que a auditoria de 2026-07-11 já penalizou no WhatsApp antes do COMP-04.

Nova query `leads.pendingCalls` (filtra `callQueueStatus === "pending"`), consumida por uma tela nova `src/app/(app)/crm/calls/page.tsx` (fila dedicada) ou por uma aba/filtro dentro do Kanban existente (`src/app/(app)/crm/page.tsx`); decisão de UI que não muda o back-end proposto aqui.

### 6. Follow-up automático por email

Novos campos na tabela `outreach` (não em `leads`: o follow-up é por linha de email, e `outreach` já é o registro de uma abordagem por canal): `followupStep: v.optional(v.number())` (0 = nenhum enviado ainda), `nextFollowupAt: v.optional(v.number())`, `followupStoppedAt`, `followupStoppedReason: v.optional(v.string())`. Novo índice `by_followup_due` em `["status", "nextFollowupAt"]` para o cron encontrar o que está vencido sem varrer a tabela inteira.

Novo `convex/followups.ts` (`dispatchDue`, internalAction acionada por `convex/crons.ts`) que, para cada linha `outreach` com `status === "sent"` e `nextFollowupAt <= now`, **reexecuta TODOS os gates de compliance do zero antes de cada envio**, não só na primeira vez: `canContactByEmail(lead)` (o lead pode ter perdido a base legal, embora isso seja raro, mas o código não deve assumir que "podia ontem" implica "pode hoje"), supressão (`isEmailSuppressed`, ela pode ter clicado em opt-out desde o último envio), `stage` do lead (se avançou para `scheduled`/`converted`/`followup`/`lost`, o follow-up automático para: a conversa já mudou de canal ou terminou), e `status` da própria linha de outreach (se virou `"replied"` ou `"bounced"` desde o agendamento, para). Isso é a resposta direta à exigência do milestone de que compliance rode "de novo em cada follow-up", e é consistente com a regra que já existe no código para o envio original (`draft`/`send`/`markSent`/`updateDraft` repetem o mesmo gate quatro vezes em vez de confiar num campo cacheado, ver `convex/outreach.ts`).

**Condição de parada "bounce" tem uma lacuna real:** hoje nada no código grava `status: "bounced"` fora do seed de demo (`convex/demo.ts`), porque o webhook de inbound/bounce do Resend foi explicitamente adiado ("Fase 2", ver `.planning/PROJECT.md`, seção Out of Scope). Sem esse webhook, "parar em bounce" é uma condição que o follow-up automático não consegue observar de verdade. Duas saídas: (a) implementar agora um webhook mínimo do Resend em `convex/http.ts` (`/resend/webhook`) só para o evento de bounce, escopado a marcar `outreach.status = "bounced"` e parar o follow-up daquele lead, sem abrir todo o escopo de "inbound reply" que ficou de fora antes; ou (b) aceitar, nesta fase, que "bounce" é detectado por ela manualmente (like `markReplied` hoje) e o follow-up automático só respeita as outras três condições (resposta manual, unsubscribe, mudança de estágio). Recomendo (a) com escopo mínimo, porque enviar follow-up repetido para um endereço que já retornou (bounced) é o tipo de coisa que degrada a reputação de envio do domínio inteiro, não só daquele lead.

**Geração do texto do follow-up:** novo prompt em `convex/lib/outreachAi.ts` (`writeFollowupEmail`), que referencia explicitamente "isto é um follow-up, o primeiro contato já foi mandado" (o modelo não pode reescrever a mesma primeira mensagem do zero), reaproveitando as mesmas `identityRules`/`honestyRules`/`observationRules`/`optOutRules` já existentes: o rodapé de opt-out por código (`withOptOutFooter`) e o header `List-Unsubscribe` continuam obrigatórios em TODO email automático, inclusive follow-up, sem exceção.

## Data Flow

### Fluxo 1: seleção -> pipeline -> envio automático (opt-out)

```
Duda seleciona leads em /leads
  -> pipeline.enqueue({ leadIds })                         [mutation, requireOrgId]
     -> insere pipelineRuns (status="queued") por lead
     -> ctx.scheduler.runAfter(0, pipeline.runStep, ...) por lead
        -> runStep (internalAction, orgId vem da própria linha, sem ctx.auth)
           1. claimStep(pipelineId, "queued" -> "checking_site")   [mutation atômica]
           2. checkWebPresence(lead)                                [fetch externo]
              -> has_site: leads.markLost("has_site") + pipelineRuns.status="stopped"
              -> no_site/inconclusive: grava siteCheckStatus/instagram/facebook, segue
           3. previews.ensureForLead(leadId)                        [mutation, sem custo de cota]
           4. decideChannel(lead)  (puro, lib/domain.ts)
              -> "email": outreachAi.writeEmail -> outreach.upsertDraft
                          -> sendCap.reserveDailySend(orgId)
                          -> model/outreachSend.sendEmailForLead (mesmos gates do botão manual)
                          -> pipelineRuns.status="done"
              -> "call": outreachAi.writeCallScript -> leads.setCallScript
                         -> leads.callQueueStatus="pending"
                         -> pipelineRuns.status="done"
              -> "social": grava instagram/facebook + outreach.draftDm (rascunho)
                           -> pipelineRuns.status="done" (ação manual dela depois)
              -> "none": pipelineRuns.status="done" (sem canal viável, fica no CRM)
```

### Fluxo 2: resultado da ligação -> desbloqueio de email

```
Duda marca "liguei" + resultado em /crm/calls (ou no lead-detail)
  -> leads.recordCallOutcome({ leadId, outcome })            [mutation, requireOrgId]
     -> "asked_email": leads.recordContactOptIn(source="phone_call")  [já existe]
                       -> ctx.scheduler.runAfter(0, pipeline.runStep, ...)
                          (reentra no Fluxo 1 a partir do passo 4, agora com consentimento)
     -> "wont_close":  leads.markLost(reason escolhido)                [já existe]
     -> "will_close":  fecha a pendência, segue fluxo manual do CRM
```

### Fluxo 3: follow-up automático (cron)

```
convex/crons.ts (a cada N minutos/horas)
  -> followups.dispatchDue (internalAction)
     -> query outreach by_followup_due (status="sent", nextFollowupAt<=now)
     -> para cada linha:
        1. claimFollowupSlot(outreachId, expectedStep)   [mutation atômica, evita corrida]
        2. RECHECA do zero: canContactByEmail, supressão, stage do lead, status da linha
           -> qualquer gate falha: followupStoppedReason gravado, para, NÃO reagenda
        3. writeFollowupEmail (Anthropic) -> upsertDraft (mesmo rodapé de opt-out)
        4. sendCap.reserveDailySend(orgId) -> sendEmailForLead
        5. followupStep += 1; nextFollowupAt = addDays(now, N) OU undefined se atingiu o máximo
```

## Padrões arquiteturais recomendados

### Padrão 1: máquina de estado com transição atômica (idempotência)

**O quê:** cada linha de trabalho em background (`pipelineRuns`, e os campos de follow-up em `outreach`) tem um `status` que só avança através de uma `internalMutation` que LÊ o status atual e só faz o `patch` se ele ainda for o esperado. A parte que fala com o mundo externo (fetch de verificação, Anthropic, Resend) SÓ roda depois que a mutation confirmou a posse daquele passo (`{ claimed: true }`).

**Quando usar:** em qualquer etapa que não pode rodar duas vezes (enviar email, decrementar um teto). Mutations no Convex são transacionais; actions não são. Separar "decidir se posso prosseguir" (mutation) de "fazer a coisa que tem efeito no mundo real" (action) é o que garante "nunca mandar duas vezes" mesmo se o cron disparar a mesma linha duas vezes por sobreposição, ou se `runStep` for chamado de novo depois de uma falha parcial.

**Trade-offs:** mais um módulo (`model/pipeline.ts`) e mais uma tabela do que "só marcar um booleano", mas é o único jeito de sobreviver a reentrância sem duplo envio, que é a exigência mais dura deste milestone.

**Exemplo:**
```typescript
// convex/model/pipeline.ts
export async function claimStep(
  ctx: MutationCtx,
  pipelineId: Id<"pipelineRuns">,
  expected: PipelineStatus,
  next: PipelineStatus,
): Promise<boolean> {
  const row = await ctx.db.get(pipelineId);
  if (!row || row.status !== expected) return false; // já reivindicado por outra execução
  await ctx.db.patch(pipelineId, { status: next, updatedAt: Date.now() });
  return true;
}
```

### Padrão 2: reserva-antes-do-custo-externo, estorno se falhar

**O quê:** o mesmo idioma que `convex/model/workspace.ts` (`reserveUsage`/`refundUsage`) e `convex/places.ts`/`convex/osm.ts` já usam para a cota de leads: reservar a unidade (contador diário de envio) ANTES de chamar o Resend, e devolver se o `fetch` falhar.

**Quando usar:** teto diário de envio automático (`model/sendCap.ts`). Não usar para o `ANTHROPIC_API_KEY` (a chamada de IA não tem um "teto" definido neste milestone; ver Gaps).

**Trade-offs:** nenhum real, é a extensão natural de um padrão já validado em produção neste mesmo código.

### Padrão 3: orgId explícito em toda linha nova, nunca dependente de `ctx.auth`

**O quê:** `convex/model/tenant.ts` (`requireOrgId`) só funciona onde existe `ctx.auth.getUserIdentity()`, ou seja, em chamadas vindas da UI autenticada. Crons e `scheduler.runAfter` disparam `internalAction`/`internalMutation` SEM identidade nenhuma. Toda tabela nova (`pipelineRuns`, `dailySendCounters`) e todo campo novo precisam guardar `orgId` explicitamente na própria linha (exatamente como `outreach`, `events` e `previews` já fazem), e cada passo do pipeline deve reconferir `lead.orgId === row.orgId` antes de agir, nunca reautenticar.

**Quando usar:** em toda peça nova deste milestone, sem exceção, porque é precisamente aqui que um bug de multi-tenancy (IDOR) apareceria: uma linha de `pipelineRuns` sem `orgId` ou um `runStep` que confia cegamente no `leadId` sem reconferir a org dona.

## Anti-Patterns a evitar aqui

### Anti-Pattern 1: encadear `scheduler.runAfter` por etapa, um agendamento por passo

**O que seria fácil de fazer:** cada etapa do pipeline reagenda a próxima com `ctx.scheduler.runAfter(0, ...)`, criando uma cadeia de 5-6 agendamentos por lead.

**Por que é ruim aqui:** multiplica por 5-6x o número de invocações de função a rastrear, dificulta ver "o lead X travou em qual passo" (o rastro fica espalhado em várias invocações), e cada elo da cadeia vira mais um ponto onde um crash deixa o lead num limbo sem sweep automático de recuperação, a menos que cada elo tenha SEU PRÓPRIO retry.

**Fazer em vez disso:** uma única `internalAction` roda a sequência inteira para aquele lead (try/catch por etapa, status gravado a cada etapa concluída), e o `crons.ts` só entra para (a) pegar o que ficou "queued" por tempo demais (nunca rodou) e (b) resetar o que ficou "in_progress" por tempo demais (a action crashou no meio).

### Anti-Pattern 2: reimplementar os gates de compliance dentro do pipeline em vez de reaproveitar

**O que seria fácil de fazer:** copiar o bloco de `canContactByEmail` + supressão + `draftLinkIssue` do `outreach.send` para dentro de `pipeline.ts`, "só para ser mais rápido de escrever".

**Por que é ruim aqui:** é exatamente o padrão que a auditoria de 2026-07-11 já encontrou e corrigiu (compliance duplicada divergindo com o tempo). Um ajuste futuro num gate (ex. nova regra de supressão) precisaria lembrar de mudar em dois lugares.

**Fazer em vez disso:** extrair para `convex/model/outreachSend.ts` ANTES de escrever o pipeline (é o primeiro item do build order abaixo), e o pipeline chama essa função, nunca duplica a lógica.

### Anti-Pattern 3: pipeline chamando `previews.publish`

**O que seria fácil de fazer:** o pipeline, ao gerar o preview, chamar `publish` "para já deixar pronto".

**Por que é ruim aqui:** `publish` cobra `sitesUsed` (cota de billing) e torna o site PÚBLICO com slug estável, sem revisão dela no editor. Automação decidindo publicar sozinha muda o produto público de um prospect sem controle humano e gasta cota sem ela saber.

**Fazer em vez disso:** o pipeline usa só `previews.ensureForLead` (preview rastreado, sem custo de cota), do mesmo jeito que `outreach.draft`/`outreach.callScript` já fazem hoje.

## Novo vs Modificado (resumo por arquivo)

**Novos arquivos:**
- `convex/pipeline.ts`, `convex/model/pipeline.ts`
- `convex/verification.ts`
- `convex/model/outreachSend.ts`, `convex/model/sendCap.ts`
- `convex/followups.ts`
- `convex/crons.ts`
- `src/app/(app)/crm/calls/page.tsx` (fila "Ligação pendente", ou equivalente dentro do Kanban existente, decisão de UI)

**Arquivos modificados:**
- `convex/schema.ts`: tabelas `pipelineRuns`, `dailySendCounters`; campos novos em `leads` (`siteCheckStatus`, `siteCheckedAt`, `siteCheckSource`, `callQueueStatus`, `callOutcome`, `callOutcomeAt`, `callOutcomeNote`) e em `outreach` (`followupStep`, `nextFollowupAt`, `followupStoppedAt`, `followupStoppedReason`); novo literal `"call_outcome"` em `events.type`; novo índice `by_followup_due` em `outreach`
- `convex/outreach.ts`: `send` passa a delegar para `model/outreachSend.ts`; nova action `draftDm`
- `convex/leads.ts`: novas mutations `recordCallOutcome`; nova query `pendingCalls`; `insertDiscovered`/`applyScore` passam a aceitar/gravar os campos de verificação de site
- `convex/model/leads.ts`: `deleteLeadCascade` passa a apagar também `pipelineRuns` do lead
- `convex/lib/domain.ts`: nova função pura `decideChannel`; nova constante `DAILY_EMAIL_CAP_BY_PLAN`
- `convex/lib/outreachAi.ts`: novos prompts `writeFollowupEmail`, `writeSocialDm`
- `convex/http.ts`: rota nova opcional `/resend/webhook` (bounce), condicional à decisão do build order item 6
- `src/app/(app)/leads/page.tsx`: novo botão/ação "Enviar para CRM e automatizar" chamando `pipeline.enqueue`
- `src/components/crm/lead-detail.tsx`: nova aba/seção para status do pipeline, links sociais + botão copiar mensagem, e resultado de ligação pendente

**Sem mudança:** `convex/billing.ts`, `convex/workspaces.ts`, `convex/model/workspace.ts` (o teto diário de envio é deliberadamente separado da cota de billing, ver seção 4), `convex/model/uploads.ts`, `convex/scoring.ts`, `convex/model/previews.ts`.

## Build Order sugerido (considerando dependências)

1. **Fundação, sem mudança de comportamento visível.** Schema novo (tabelas + campos + índice + literal de evento) e extração de `convex/model/outreachSend.ts` a partir do `outreach.send` atual, mantendo o botão manual funcionando exatamente igual (mesma suíte de testes precisa continuar passando). Isso é pré-requisito de TUDO abaixo e é o item de menor risco: puro refactor + aditivo de schema.
2. **Verificação de site + descoberta social (`convex/verification.ts`).** Resolver primeiro a decisão em aberto do mecanismo (Opção A/B/C, seção 1) com a Duda. Pode ser construído e testado isoladamente antes de existir qualquer pipeline (basta chamar manualmente por um lead de teste), o que dá uma chance de validar a qualidade da verificação antes de acoplá-la a envio automático.
3. **Orquestração do pipeline em modo "só rascunho" (sem auto-envio ainda).** `convex/pipeline.ts` + `convex/model/pipeline.ts` + `convex/crons.ts` (sweep de travados), com o passo final gerando o rascunho de email/script/DM mas SEM chamar `sendEmailForLead` de verdade (ou atrás de uma flag). Isso separa o risco de "o pipeline em si funciona e não trava" do risco de "está mandando email sozinho": permite validar a etapa 4 com o Google Places/checkWebPresence + geração de IA em produção antes de destravar o envio automático, que é irreversível por natureza (email já saiu).
4. **Auto-envio opt-out + teto diário.** `convex/model/sendCap.ts` + ligar o último passo do pipeline ao `sendEmailForLead` de verdade. Depende do item 1 (função compartilhada já existir) e do item 3 (pipeline já provado estável em modo rascunho). É o item de maior risco do milestone (some da caixa da usuária e chega na caixa do prospect sem revisão humana), por isso vem depois de todo o resto estar validado.
5. **Fila "Ligação pendente" + `recordCallOutcome`.** Pode ser construída em paralelo aos itens 2-4 (é praticamente independente, só depende de `decideChannel` existir e dos campos novos do item 1). Reaproveita `markLost`/`recordContactOptIn` já prontos, então o risco é baixo.
6. **Follow-up automático.** Depende do item 4 (só faz sentido reenviar depois que existe um envio automático original para dar sequência) e de uma decisão explícita sobre a lacuna de detecção de bounce (implementar o webhook mínimo do Resend agora, ou aceitar por ora que "bounce" fica fora das condições de parada automáticas). Por depender do código mais novo do milestone inteiro (o próprio auto-envio) e por ser a peça que dispara envios repetidos sem novo clique dela, deve ser a última a entrar em produção.

## Gaps a decidir antes ou durante o roadmap

- **Mecanismo de verificação de site na web:** ver seção 1. Bloqueia o item 2 do build order até ser decidido.
- **Webhook de bounce do Resend:** ver seção 6. Bloqueia (ou reduz o escopo de) o item 6 do build order.
- **Teto/controle de custo de chamadas à Anthropic em lote:** o pipeline pode gerar dezenas de emails/scripts/DMs de uma vez quando ela seleciona muitos leads; hoje não existe nenhum limitador desse custo (só o `ANTHROPIC_API_KEY` precisar existir). Não é bloqueante para o milestone, mas vale um teto suave (ex. tamanho de lote por tick do cron) para não gerar uma fatura inesperada nem estourar rate limit da API da Anthropic numa seleção grande.
- **Onde a fila "Ligação pendente" mora na UI:** tela dedicada nova vs. aba/filtro dentro do Kanban existente é decisão de produto/UX, não altera o back-end proposto aqui.

## Sources

- Leitura direta do código do repositório (caminhos citados ao longo do documento), sem fonte externa: este é um documento de integração num codebase existente, não uma pesquisa de ecossistema.
- `.planning/PROJECT.md` (contexto do milestone v1.3, decisões já tomadas em milestones anteriores, motivo da fala da Duda de 2026-09-26).

---
*Architecture research for: Osprano v1.3 (Automação da prospecção)*
*Researched: 2026-09-26*
