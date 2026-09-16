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
- [x] **Phase 5: Redesenho vidro sobre névoa** - Área logada em cards translúcidos sobre névoa azul-acinzentada, rail de 72px com ícone e nome, tema escuro azul-marinho; landing intocada (milestone v1.1, completed 2026-09-16)
- [x] **Phase 6: CRM: fluxo do dia e informação do lead** - Próxima ação por lead, faixa Hoje, leads parados, Perdido com motivo, contato e valores, Histórico com notas (milestone v1.1, completed 2026-09-16)

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
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Integridade de Billing e Segurança do Modo Demo | 3/3 | Complete    | 2026-07-11 |
| 2. Compliance de Email e WhatsApp | 4/4 | Complete    | 2026-07-11 |
| 3. Tracking, Composer e Localização | 4/4 | Complete    | 2026-07-11 |
| 4. Modo opt-in (ligação-primeiro) | 6/6 | Complete    | 2026-07-22 |
| 5. Redesenho vidro sobre névoa | 1/1 | Complete    | 2026-09-16 |
| 6. CRM: fluxo do dia e informação do lead | 1/1 | Complete    | 2026-09-16 |

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

## Milestone v1.1: visual e CRM (2026-09-16)

As fases 5 e 6 foram executadas com o workflow **superpowers** (brainstorm → spec → plano → subagent-driven development), não com planos GSD: não há `.planning/phases/05-*` nem `06-*`; a spec e o plano de cada uma vivem em `docs/superpowers/`. Os checklists manuais (última tarefa de cada plano) ainda estão pendentes com a Duda.

### Phase 5: Redesenho vidro sobre névoa

**Goal**: A área logada ganha a estética "vidro sobre névoa" (cards translúcidos com blur sobre um fundo abstrato azul-acinzentado, muito respiro, cantos de 18/22px), o header some e a navegação vira um rail de 72px com ícone e nome ("Início, Leads, CRM, Outreach, Sites, Ajustes"), o tema escuro vira névoa azul-marinho com contraste AA em texto principal e secundário, e a landing e as páginas públicas de preview ficam exatamente como estavam.
**Depends on**: Phase 4
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05
**Success Criteria** (what must be TRUE):
  1. Tokens novos (névoa, superfícies translúcidas, `--glass-border`, raio, sombras) só valem sob `.app-shell`; screenshots de `/` e `/site/[slug]` antes e depois do redesenho são iguais
  2. Sidebar de 240px substituída por rail de 72px em vidro, com `aria-current` no item ativo; plano e uso saem da sidebar (já existem em Settings → "Plano & uso")
  3. Vidro (`glass`, `glass-lite`, `glass-dense`) só no primeiro nível; inputs, selects e blocos internos são sólidos; nenhum `glass` dentro de `glass`
  4. Tema escuro azul-marinho com `--foreground` e `--muted` em AA sobre a mancha mais escura; "reduzir transparência" do sistema deixa os vidros opacos com contorno
  5. Regra `* { border-color }` dentro de `@layer base`, e os utilitários de cor de borda voltam a funcionar em todo o app
**Plans**: 1/1 plan complete (superpowers)

Plans:
- [x] `docs/superpowers/specs/2026-09-16-redesenho-vidro-design.md` + `docs/superpowers/plans/2026-09-16-redesenho-vidro.md`: 29 tarefas; merge `0460e66`; screenshots finais em `docs/redesign/` (14 arquivos, 1440px, claro e escuro); Task 29 (roteiro manual no navegador) pendente com a Duda

### Phase 6: CRM: fluxo do dia e informação do lead

**Goal**: O CRM passa a dizer o que fazer hoje e a guardar o que o Google não entrega: cada lead tem uma próxima ação, a faixa "Hoje" lista atrasadas e as do dia (Feito / Adiar), lead parado há 7+ dias fica visível e filtrável, "Perdido" vira coluna e exige motivo, o detalhe guarda contato e valores do negócio (setup + mensal, moeda pelo país) com soma da mensalidade por coluna, e a aba Histórico mostra notas e eventos do sistema numa linha do tempo só.
**Depends on**: Phase 5 (os componentes novos nascem no estilo novo)
**Requirements**: CRM-01, CRM-02, CRM-03, CRM-04, CRM-05, CRM-06, CRM-07
**Success Criteria** (what must be TRUE):
  1. `setNextAction`/`clearNextAction` gravam `nextActionAt`/`nextActionNote` no lead; o card mostra a linha da ação com status atrasada (`--hot`), hoje (`--warm`) ou futura (`--faint`)
  2. A faixa Hoje aparece entre o cabeçalho e a busca só quando há atrasadas ou de hoje, calculada no navegador (`useNow`, 60 s), e não muda com busca ou filtro do Kanban
  3. `isStalled` (7+ dias em `stageUpdatedAt`, sem ação, fora de `converted`/`lost`) alimenta a linha "parado há N dias", o filtro Parados e a ordenação "Próxima ação"
  4. `setStage` recusa `lost` ("Use markLost"); `markLost` exige motivo (`LOST_REASONS`) e o `LostReasonModal` abre nos quatro pontos de entrada (drop na coluna recolhida, seletor do card, pílula de Etapa, botão Status); sair de `lost` limpa o motivo
  5. `updateInfo` grava contato (nome, cargo) e valores (setup, mensal) com validação; a moeda vem do país (`currencyForCountry`); o cabeçalho da coluna soma a mensalidade dos leads visíveis
  6. `addNote` grava evento `note`; `leads.timeline` devolve eventos do lead via índice `by_lead`; a aba Histórico mostra notas e eventos; o feed do Dashboard exclui notas
  7. 17 funções puras novas em `convex/lib/domain.ts` com 17 testes em `tests/crm-domain.test.ts` (191 → 208); seed do demo cobre atrasadas, de hoje, parados, perdidos com motivo, contato/valores e notas
**Plans**: 1/1 plan complete (superpowers)

Plans:
- [x] `docs/superpowers/specs/2026-09-16-crm-fluxo-e-informacao-design.md` + `docs/superpowers/plans/2026-09-16-crm-fluxo-e-informacao.md`: 26 tarefas em dois blocos (A: fluxo; B: informação); merge `828a11f`; Tarefa 26 (roteiro manual no modo demo) pendente com a Duda
