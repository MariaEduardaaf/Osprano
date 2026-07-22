# Roadmap: Osprano — Pronto para Produção (Fase 1: Bloqueadores)

## Overview

Este milestone leva o Osprano — SaaS de prospecção e venda de sites para o mercado europeu — de codebase funcional a pronto para produção, corrigindo os 12 bloqueadores identificados pela auditoria de 2026-07-11. A ordem segue o risco: primeiro a integridade de billing/quota e a neutralização do modo demo em produção (evita vazamento financeiro e brecha de autenticação); depois o compliance de email e WhatsApp garantido por código, não por promessa (evita risco legal de GDPR/ePrivacy); por fim a correção do sinal de funil, a fidelidade do composer ao envio e a localização do preview por mercado (entrega a experiência prometida nos 5 mercados-alvo: GB, IE, NL, SE, NO). As duas últimas fases tocam a mesma mutation `send` em `convex/outreach.ts`, por isso compliance (que injeta o rodapé de opt-out) precede tracking/composer (que persiste as edições do usuário) — evita reescrever a mesma função duas vezes em paralelo.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Integridade de Billing e Segurança do Modo Demo** - Quota não pode ficar negativa nem ser cobrada além do entregue; plano reflete o Stripe real; modo demo é inerte em produção (completed 2026-07-11)
- [x] **Phase 2: Compliance de Email e WhatsApp** - Supressão, unsubscribe e opt-out garantidos por código; WhatsApp só com opt-in registrado (completed 2026-07-11)
- [x] **Phase 3: Tracking, Composer e Localização** - Funil reflete abertura real do prospect, resposta manual funciona, composer é fonte de verdade do envio, preview localizado por mercado (completed 2026-07-11)
- [x] **Phase 4: Modo opt-in (ligação-primeiro)** - Prospecção compliant em mercados opt-in (ES/IT/PT/DE/DK/CH): aba "Ligação primeiro", script de ligação por IA, consentimento destrava email — guardrail server-side (completed 2026-07-22)

## Phase Details

### Phase 1: Integridade de Billing e Segurança do Modo Demo
**Goal**: A contagem de quota do plano é íntegra (não pode ir negativa nem ser cobrada por mais do que foi entregue), o plano do workspace reflete o estado real da subscription no Stripe, e o modo demo não consegue desligar a autenticação fora de ambiente de desenvolvimento.
**Depends on**: Nothing (first phase)
**Requirements**: BILL-01, BILL-02, BILL-03, SEC-01
**Success Criteria** (what must be TRUE):
  1. Uma chamada a `foursquare.search` com `max` zero, negativo ou ausente nunca resulta em quota negativa — o count tem piso e `reserveUsage` rejeita `count <= 0` com erro
  2. Após uma busca/descoberta de leads, a quota debitada do workspace corresponde ao número de leads efetivamente inseridos — excedente é estornado e uma falha total do fetch externo estorna a reserva inteira
  3. Um upgrade ou downgrade feito pelo Stripe Billing Portal atualiza o plano do workspace, derivado do `price_id` atual da subscription (mapa `STRIPE_PRICE_PRO`/`STRIPE_PRICE_AGENCY`), sem depender de `metadata.plan`
  4. Com `NODE_ENV=production`, setar `NEXT_PUBLIC_DEMO=1` ou `DEMO_MODE=1` não desliga a autenticação nem ativa o seed demo
**Plans**: 3/3 plans complete

Plans:
- [x] 01-01-PLAN.md — Integridade de quota na descoberta: clamp com piso, guarda no reserveUsage, estorno reconciliado (BILL-01, BILL-02)
- [x] 01-02-PLAN.md — Plano derivado do price_id no webhook Stripe (BILL-03)
- [x] 01-03-PLAN.md — Guarda de ambiente do modo demo (default-deny CONVEX_ENV / NODE_ENV) (SEC-01)

### Phase 2: Compliance de Email e WhatsApp
**Goal**: Nenhum email é enviado para endereço suprimido, existe um caminho de unsubscribe público e funcional, todo email carrega opt-out visível e o header `List-Unsubscribe`, e o WhatsApp só é acionado com opt-in explícito e registrado do prospect — tudo garantido por código, não por instrução de prompt à IA.
**Depends on**: Phase 1 (sequenciamento; BILL-03 e COMP-02 tocam `convex/http.ts` — evita conflito de merge)
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04
**Success Criteria** (what must be TRUE):
  1. Existe uma tabela de supressão no schema (email normalizado + escopo org/global + origem + timestamp) e tanto `outreach.draft` quanto `outreach.send` recusam endereços presentes nela
  2. Um prospect consegue acessar um endpoint HTTP público de unsubscribe (sem auth, por token) e o endereço passa a constar na tabela de supressão, com confirmação exibida
  3. Todo email enviado via Resend sai com rodapé de opt-out (link de unsubscribe + identificação do remetente) injetado por código e com o header `List-Unsubscribe` no payload — mesmo que a IA ou o fallback de parse não o incluam
  4. Um follow-up por WhatsApp só fica disponível para um lead depois de um evento de opt-in registrado (com origem e timestamp) — arrastar o card no Kanban sozinho não libera o WhatsApp
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Fundação: schema (suppressions/campos/índices) + helpers puros (normalizeEmail, hasWaOptIn, optOutFooter, senderIdentityFrom) + módulo suppressions (COMP-01/02/03/04)
- [x] 02-02-PLAN.md — Compliance no envio: supressão em draft/send, unsubscribeToken + rodapé de opt-out, headers List-Unsubscribe no Resend, outreach.suppress (COMP-01/02/03)
- [x] 02-03-PLAN.md — Endpoint público de unsubscribe GET/POST no httpRouter (COMP-02)
- [x] 02-04-PLAN.md — Opt-in de WhatsApp: recordWaOptIn + gate por waOptInAt + UI de registro (COMP-04)

### Phase 3: Tracking, Composer e Localização
**Goal**: O funil reflete abertura real do prospect (não do próprio vendedor), o usuário consegue marcar resposta manualmente, o composer é a fonte de verdade do que é enviado, e o preview de site é renderizado no idioma do mercado do lead.
**Depends on**: Phase 2 (ambas tocam a mutation `send` de `convex/outreach.ts`; construir sobre o rodapé de opt-out já injetado evita reescrever a mesma função duas vezes)
**Requirements**: TRCK-01, TRCK-02, OUTR-01, L10N-01
**Success Criteria** (what must be TRUE):
  1. Quando o próprio vendedor autenticado (mesmo workspace) abre o link de preview do seu lead, `openCount` não incrementa, nenhum evento `preview_open` é criado e o lead não pula de `base` para `approached`
  2. Quando um prospect real (fora do workspace, não autenticado) abre o mesmo link, o tracking funciona normalmente — `openCount` incrementa e o lead avança de estágio
  3. O usuário consegue marcar manualmente um outreach como "respondeu" (na outbox ou no detalhe do lead), gravando status `replied` com timestamp real, sem depender do seed demo
  4. Editar assunto/corpo no composer e enviar resulta no email realmente recebido pelo prospect refletindo as edições — não o rascunho original gerado pela IA
  5. O preview de site de um lead do mercado GB/IE aparece em inglês, NL em holandês, SE em sueco e NO em norueguês — nenhum texto em português aparece nessas renderizações
**Plans**: 4 plans (wave 1: 03-01, 03-02, 03-03 em paralelo · wave 2: 03-04)

Plans:
- [x] 03-01-PLAN.md — Guarda de self-open no recordOpen (TRCK-01)
- [x] 03-02-PLAN.md — Dicionário i18n do preview (en/nl/sv/no) + migração de preview-site (L10N-01)
- [x] 03-03-PLAN.md — Backend: repliedAt + markReplied + updateDraft + fix activityAt na outbox (TRCK-02, OUTR-01)
- [x] 03-04-PLAN.md — UI: composer persistente/pré-preenchido + botões respondeu/opt-out + ação na outbox (TRCK-02, OUTR-01)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Integridade de Billing e Segurança do Modo Demo | 3/3 | Complete    | 2026-07-11 |
| 2. Compliance de Email e WhatsApp | 4/4 | Complete    | 2026-07-11 |
| 3. Tracking, Composer e Localização | 4/4 | Complete    | 2026-07-11 |
| 4. Modo opt-in (ligação-primeiro) | 6/6 | Complete    | 2026-07-22 |

### Phase 4: Modo opt-in (ligação-primeiro) para mercados onde cold email é ilegal

**Goal**: Usuários conseguem prospectar mercados opt-in (ES/IT/PT/DE/DK/CH) de forma compliant: descoberta/score/preview funcionam igual, os leads aparecem numa aba própria "Ligação primeiro" com telefone e script de ligação por IA em destaque, e o email só destrava depois de um consentimento de contato registrado — com o guardrail garantido no servidor, nunca só na UI.
**Depends on**: Phase 3
**Requirements**: OPTIN-01, OPTIN-02, OPTIN-03, OPTIN-04, OPTIN-05, OPTIN-06
**Success Criteria** (what must be TRUE):
  1. Buscar leads na Espanha (ou IT/PT/DE/DK/CH) funciona — e TODO lead desses mercados nasce `emailable=false`, independente de forma jurídica ou tipo de inbox
  2. A página de Leads tem as abas "Email primeiro" (mercados opt-out) e "Ligação primeiro" (mercados opt-in); na segunda, o card prioriza telefone e script de ligação e não exibe ação de cold email
  3. O usuário gera um script de ligação por IA no idioma do mercado com tradução pt-BR lado a lado, citando a dor específica do lead
  4. Registrar consentimento de contato (origem + timestamp + evento) destrava o composer de email para aquele lead; `outreach.draft`/`send` recusam lead de mercado opt-in sem consentimento — server-side
  5. Mercados opt-in exibem aviso discreto "validação jurídica pendente" até a validação por país
**Plans:** 6 plans (wave 1: 04-01 · wave 2: 04-02, 04-03, 04-04 em paralelo · wave 3: 04-05 · wave 4: 04-06)

Plans:
- [x] 04-01-PLAN.md — Fundação: domain.ts (OPT_IN_MARKETS/SEARCHABLE_MARKETS/isSearchableMarket/canContactByEmail/hasWaOptIn generalizado/MARKETS.PT+legalReview/cidades) + schema (contactOptIn*/callScript*/evento contact_opt_in) + testes puros (OPTIN-01, OPTIN-04, OPTIN-06)
- [x] 04-02-PLAN.md — Descoberta: gate places.ts/foursquare.ts via isSearchableMarket (OPTIN-01)
- [x] 04-03-PLAN.md — Backend: recordContactOptIn + setCallScript (leads.ts), writeCallScript+LANG (outreachAi.ts), guardrail draft/send via canContactByEmail + action callScript (outreach.ts) (OPTIN-03, OPTIN-04, OPTIN-05)
- [x] 04-04-PLAN.md — Rodapé de opt-out localizado (compliance.ts FOOTER_COPY es/it/pt/de/da) (OPTIN-04)
- [x] 04-05-PLAN.md — UI: card variant "call" (Ligar/Script/Consentimento, sem cold email) + call-script-panel + contact-opt-in-button (OPTIN-02, OPTIN-03, OPTIN-04)
- [x] 04-06-PLAN.md — UI: abas Email/Ligação primeiro + filtro/select por regime + banner de validação jurídica + banner do CRM via canContactByEmail (OPTIN-02, OPTIN-06)
