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
- [x] **Phase 7: Descoberta via OpenStreetMap e "Ver o que ele tem"** - Busca também no OpenStreetMap/Overpass (grátis, sem chave) com fallback de espelho e seletor de fonte; quota cobra só o lead realmente inserido mesmo em busca repetida; botão "Ver o que ele tem" ao lado do preview (milestone v1.2, completed 2026-09-17)
- [x] **Phase 8: Modelos de site** - 4 modelos por segmento com 3 paletas cada, editor completo com upload de fotos e prévia ao vivo, preview e site publicado renderizando o modelo salvo, correções do UAT final (milestone v1.2, completed 2026-09-18)
- [ ] **Phase 9: Base de compliance compartilhada** - Função única de envio, trava atômica anti-duplicidade, Noruega em validação jurídica, tetos diários (milestone v1.3)
- [ ] **Phase 10: Verificação de site e redes sociais** - Confere na web se o lead já tem site de verdade e descobre Instagram/Facebook do negócio (milestone v1.3)
- [ ] **Phase 11: Fila "Ligar" no CRM** - Leads de mercado opt-in num filtro próprio, com roteiro, redes sociais e registro do resultado da ligação (milestone v1.3)
- [ ] **Phase 12: Pipeline automático em modo rascunho** - Depois da seleção, o app confere site, gera preview, escreve mensagem e escolhe canal sozinho, sem enviar de verdade ainda (milestone v1.3)
- [ ] **Phase 13: Envio automático + teto diário** - Nos mercados opt-out, o e-mail sai sozinho respeitando teto diário e todas as travas de compliance (milestone v1.3)
- [ ] **Phase 14: Follow-up automático** - Um follow-up automático por e-mail onde for permitido, cancelado se qualquer trava disparar (milestone v1.3)

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
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Integridade de Billing e Segurança do Modo Demo | 3/3 | Complete    | 2026-07-11 |
| 2. Compliance de Email e WhatsApp | 4/4 | Complete    | 2026-07-11 |
| 3. Tracking, Composer e Localização | 4/4 | Complete    | 2026-07-11 |
| 4. Modo opt-in (ligação-primeiro) | 6/6 | Complete    | 2026-07-22 |
| 5. Redesenho vidro sobre névoa | 1/1 | Complete    | 2026-09-16 |
| 6. CRM: fluxo do dia e informação do lead | 1/1 | Complete    | 2026-09-16 |
| 7. Descoberta via OpenStreetMap e "Ver o que ele tem" | n/d (commits diretos) | Complete    | 2026-09-17 |
| 8. Modelos de site | 3/3 | Complete    | 2026-09-18 |
| 9. Base de compliance compartilhada | 0/TBD | Not started | - |
| 10. Verificação de site e redes sociais | 0/TBD | Not started | - |
| 11. Fila "Ligar" no CRM | 0/TBD | Not started | - |
| 12. Pipeline automático em modo rascunho | 0/TBD | Not started | - |
| 13. Envio automático + teto diário | 0/TBD | Not started | - |
| 14. Follow-up automático | 0/TBD | Not started | - |

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

## Milestone v1.2: modelos de site (2026-09-18)

A fase 7 foi executada fora do GSD e fora do superpowers, por commits diretos (sem spec nem
plano); a fase 8 com o workflow **superpowers**: spec + adendo em `docs/superpowers/`, três
planos sequenciais (A e B em arquivo, C inline, sem arquivo próprio). Não há
`.planning/phases/07-*` nem `08-*`.

### Phase 7: Descoberta via OpenStreetMap e "Ver o que ele tem"

**Goal**: A descoberta de leads funciona também sem chave paga (OpenStreetMap/Overpass, com fallback entre espelhos e seletor de fonte na UI), a quota cobra só o que foi realmente inserido mesmo em buscas repetidas no mesmo lugar, e cada lead ganha um atalho para o que ele já tem hoje (site, Google Maps ou busca).
**Depends on**: Phase 6
**Requirements**: DISC-01, DISC-02
**Success Criteria** (what must be TRUE):
  1. Buscar leads sem `GOOGLE_PLACES_API_KEY` configurada funciona via OpenStreetMap (Overpass), com atribuição ODbL no card e no CRM
  2. O Overpass indisponível (429/503/504) tenta de novo num espelho diferente (incluindo o espelho suíço, `overpass.osm.ch`) antes de falhar
  3. Repetir a mesma busca não cobra quota por lead que já existia: só o lead realmente inserido é contado
  4. Cada card de lead tem o botão "Ver o que ele tem", que abre o site atual, o Google Maps ou uma busca pelo negócio, conforme o que existe
**Plans**: sem plano formal (commits diretos, sem spec/plano em `docs/superpowers/`)

Plans:
- [x] `a95e0e4`, `a89b3b6`, `49ef5d4`, `c9a9f04`, `aa29d2c`, `ea629c0`, `2c2455f`: descoberta via OSM com fallback de espelho, quota reconciliada e atribuição (DISC-01)
- [x] `9b2cca8`, `29152fd`: botão "Ver o que ele tem" no lugar do link "Site atual" (DISC-02)

### Phase 8: Modelos de site

**Goal**: O preview rastreado e o site publicado deixam de ser um template único e passam a ser um dos 4 modelos por segmento (Mesa, Estúdio, Ofício, Vitrine), com 3 paletas cada, editáveis por ela (textos, itens, horário, contato, fotos) numa página própria com prévia ao vivo, e o fluxo de venda inteiro (aba Site, cards, página Sites) reflete o modelo escolhido, com as correções encontradas no UAT final.
**Depends on**: Phase 7
**Requirements**: SITE-01, SITE-02, SITE-03, SITE-04, SITE-05, SITE-06, SITE-07
**Success Criteria** (what must be TRUE):
  1. `/p/<token>` e `/site/<slug>` renderizam o mesmo modelo com o mesmo conteúdo salvo; preview/site antigo (sem `version`) continua abrindo, convertido na leitura
  2. As 12 paletas (3 por modelo) têm contraste AA garantido por teste; nenhum texto padrão de `templates.*` afirma fato do negócio (data, preço, horário) em nenhum dos 10 idiomas
  3. O editor (`/crm/<leadId>/site`) salva modelo, paleta, textos, itens, horário, contato (telefone, WhatsApp, Instagram, e-mail) e fotos (upload redimensionado no navegador, diff de exclusão só após salvar); a prévia ao vivo funciona em desktop e celular
  4. A aba Site do drawer, os cards de lead e a página Sites mostram a miniatura do modelo (`TemplateThumb`) e levam ao editor
  5. `registerUpload` recusa arquivo que não seja JPEG/PNG/WebP pelo `contentType` real do storage (não pelo que o cliente prometeu); `getBySlug` não devolve o token rastreado
  6. O rodapé de opt-out é garantido no servidor em todo e-mail persistido ou copiado; o erro do "Escrever com IA" aparece mesmo com o composer fechado; eventos de consentimento têm rótulo próprio no feed do Dashboard
**Plans**: 3/3 plans complete (superpowers: A, B, C)

Plans:
- [x] `docs/superpowers/specs/2026-09-17-modelos-de-site-design.md` + adendo 2026-09-18: decisões e a divisão nos 3 planos
- [x] `docs/superpowers/plans/2026-09-17-modelos-de-site-A.md` (plano A): dados + 4 modelos + render público + retrocompatibilidade; merge `402b873`; seções novas (valores, como funciona, faixa de avaliação, mapa, footer completo) merge `70ae0ba`; screenshots dos 4 modelos em `docs/redesign/templates/`
- [x] `docs/superpowers/plans/2026-09-18-modelos-de-site-B.md` (plano B): editor completo com upload de fotos; merge `6834847`; screenshots do editor em `docs/redesign/editor-*.png`
- [x] Plano C (inline, sem arquivo próprio): resumo da aba Site, cards, página Sites, UAT em navegador real; merge `6873874`; correções pós-UAT (`1a84905`, `6d754ec`, `38138e3`, `8391343`), merge final `07965dc`

## Milestone v1.3: Automação da prospecção (2026-09-26)

Escopo definido em `.planning/REQUIREMENTS.md` ("v1.3 Requirements") a partir do fluxo que a Duda descreveu no chat (ver `.planning/PROJECT.md`, "Current Milestone"), com pesquisa dedicada em `.planning/research/SUMMARY.md`. A ordem das Fases 9 a 14 segue risco crescente, não valor percebido: primeiro a fundação de compliance compartilhada (refactor puro, sem mudança de comportamento visível), depois as duas features de baixo risco e alto valor que reaproveitam peças já auditadas (verificação de site, fila de ligação), depois o pipeline em modo rascunho (sem enviar nada de verdade), e só por último as duas peças irreversíveis por natureza, envio automático e follow-up automático, porque um e-mail automático já enviado não pode ser desfeito. Três decisões de produto registradas na pesquisa bloqueiam o planejamento detalhado de fases específicas: a Fase 10 precisa de uma conta e chave Serper.dev da usuária, a Fase 12 precisa da `ANTHROPIC_API_KEY` em produção, e a Fase 13 precisa da decisão do provedor de envio automático (a política de uso aceitável da Resend proíbe cold outreach). Planejamento via GSD (`/gsd:plan-phase`), não superpowers.

### Phase 9: Base de compliance compartilhada

**Goal**: Existe uma única função server-side de compliance para envio de email (`canContactByEmail`, supressão, rodapé de opt-out, header `List-Unsubscribe`), uma trava atômica contra envio duplicado, a Noruega tratada como mercado de ligação primeiro até validação jurídica, e tetos diários de envio, IA e busca de verificação visíveis na tela.
**Depends on**: Phase 8
**Requirements**: BASE-01, BASE-02, BASE-03, BASE-04
**Success Criteria** (what must be TRUE):
  1. Uma única função server-side de compliance (`canContactByEmail`, supressão, rodapé de opt-out, header `List-Unsubscribe`) é chamada tanto pelo envio manual quanto por qualquer novo caminho automático, sempre no momento do envio, nunca a partir de um campo cacheado
  2. Duas tentativas de enviar o mesmo email (retry ou execução concorrente) resultam num único envio de verdade: a segunda tentativa é recusada por uma trava atômica antes da chamada ao provedor
  3. A Noruega aparece com o aviso "validação jurídica pendente" e sai da lista de mercados de envio imediato sem aprovação, ao lado dos demais mercados de ligação primeiro
  4. A tela mostra os tetos diários de envio automático, chamadas de IA e buscas de verificação, e o quanto já foi consumido hoje pelo workspace; ultrapassar um teto pausa aquele tipo de automação com aviso visível
**Plans**: TBD
**Research flag**: Não precisa de `/gsd:research-phase`, é refactor puro sobre código já mapeado (extração de `sendEmailForLead`, padrão de trava atômica e schema aditivo já documentados na pesquisa).

### Phase 10: Verificação de site e redes sociais

**Goal**: Antes de virar prospect de automação, cada lead selecionado é conferido de verdade na web: se já tiver site, sai do fluxo com o link como prova; se tiver Instagram ou Facebook, a usuária vê os links e uma mensagem pronta para copiar.
**Depends on**: Phase 9
**Requirements**: VERIF-01, VERIF-02, VERIF-03, VERIF-04
**Success Criteria** (what must be TRUE):
  1. Ao selecionar um lead para automação, o app confere na web (Serper.dev) se ele tem site de verdade; se tiver, o lead sai do fluxo marcado "já tem site" com o link encontrado como prova
  2. A mesma checagem encontra Instagram e/ou Facebook do negócio quando existem, e a usuária vê os links no lead
  3. A usuária tem uma mensagem pronta para copiar e enviar manualmente pela rede social do negócio
  4. A régua de "tem site" é a mesma do resto do produto (`classifyWebsite`: rede social e agregador contam como sem site) e o servidor nunca busca uma URL de terceiro sem validar o host antes
**Plans**: TBD
**Research flag**: Sim, rodar `/gsd:research-phase` antes de planejar (mecanismo de busca web é serviço externo novo e a superfície de SSRF é nova no codebase; decidir Serper.dev vs. cota do Places com números reais de volume).
**Bloqueio**: precisa de conta e chave da Serper.dev da usuária antes de codar.

### Phase 11: Fila "Ligar" no CRM

**Goal**: Leads de mercado de ligação primeiro aparecem num filtro próprio no CRM, com telefone, roteiro e redes sociais à mão, e o resultado de cada ligação decide o próximo passo do lead.
**Depends on**: Phase 9
**Requirements**: CALL-01, CALL-02, CALL-03
**Success Criteria** (what must be TRUE):
  1. Leads de mercados de ligação primeiro aparecem no filtro "Ligar" no CRM, com telefone, roteiro e links de redes sociais visíveis
  2. A usuária registra o resultado da ligação: vai fechar avança o lead, não vai pede motivo, pediu por e-mail registra consentimento e libera o envio, não atendeu reagenda
  3. Em lead da Alemanha, o card pede o motivo concreto da ligação (consentimento presumido, UWG §7) antes de liberar o roteiro
**Plans**: TBD
**Research flag**: Não precisa de `/gsd:research-phase`, reaproveita `markLost` e `recordContactOptIn` já existentes e auditados; baixa complexidade nova.

### Phase 12: Pipeline automático em modo rascunho, sem envio

**Goal**: Depois que a usuária seleciona um ou vários leads e aciona "Automatizar", o app confere o site, gera o preview, escreve a mensagem e escolhe o canal sozinho, mas ainda não envia nada de verdade; o pipeline sai comprovado estável antes de a última trava (envio automático) ser destravada.
**Depends on**: Phase 10, Phase 11
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04
**Success Criteria** (what must be TRUE):
  1. A usuária seleciona um ou vários leads e aciona "Automatizar"; sem outro clique, o app confere o site, gera o preview, escreve a mensagem e escolhe o canal
  2. Cada lead em automação mostra a etapa atual e, se falhar, o erro e a opção de tentar de novo
  3. O canal escolhido segue a regra do país: e-mail onde `canContactByEmail` permite, ligação em mercado opt-in com telefone, rede social quando for o único contato, "sem contato" quando não há nenhum
  4. Mensagem com aviso da IA (dado não confirmado sobre o negócio) nunca sai sozinha, mesmo em mercado opt-out: vai para uma fila de revisão da usuária
**Plans**: TBD
**Research flag**: Não precisa de `/gsd:research-phase`, a orquestração usa só `scheduler.runAfter` e `cronJobs` nativos do Convex, já documentados com exemplo de código.
**Bloqueio**: precisa de `ANTHROPIC_API_KEY` configurada em produção antes de codar a geração de mensagem (hoje ausente).

### Phase 13: Envio automático imediato (mercados opt-out) + teto diário

**Goal**: Nos mercados opt-out (GB/NL/IE/SE), o e-mail gerado pelo pipeline sai sozinho na hora, sem aprovação da usuária, respeitando um teto diário, um provedor apto a cold outreach B2B e um controle único para ligar/desligar tudo.
**Depends on**: Phase 9, Phase 12
**Requirements**: AUTO-01, AUTO-02, AUTO-03, AUTO-04, AUTO-05
**Success Criteria** (what must be TRUE):
  1. Em GB/NL/IE/SE, lead com canal e-mail que passa em todas as travas recebe o e-mail automaticamente, na hora, sem aprovação da usuária
  2. O envio automático respeita um teto diário por workspace; o que passa do teto sai só no dia seguinte
  3. A usuária liga e desliga todo o envio automático com um único controle na tela
  4. O envio sai por um provedor cuja política aceita cold outreach B2B (decidido na pesquisa desta fase), não pela Resend
  5. Um e-mail devolvido ou denunciado como spam marca o lead e suprime o endereço automaticamente, via webhook de entrega do provedor, sem exigir mudança de DNS
**Plans**: TBD
**Research flag**: Sim, rodar `/gsd:research-phase` antes de planejar (decisão do provedor de envio é gap explícito da pesquisa anterior, além de SPF/DKIM/DMARC do domínio de envio e auditoria retroativa da heurística `isEmailable` antes de tirar humano do loop).
**Bloqueio**: precisa da decisão do provedor de envio automático (a Resend proíbe cold outreach na própria AUP); não começar a codar antes dessa decisão.

### Phase 14: Follow-up automático por email

**Goal**: Lead que recebeu e-mail automático e não respondeu recebe um único follow-up automático após 4 dias, cancelado na hora se qualquer trava de compliance disparar entre o envio original e o follow-up.
**Depends on**: Phase 13
**Requirements**: FUP-01, FUP-02
**Success Criteria** (what must be TRUE):
  1. Lead que recebeu e-mail automático e não foi marcado "respondeu" recebe um único follow-up automático após 4 dias, só em mercado onde e-mail é permitido
  2. O follow-up é cancelado se o lead respondeu, devolveu, denunciou, se descadastrou, mudou de etapa ou foi perdido; todas as travas são conferidas de novo no momento do envio, nunca a partir de um campo cacheado
**Plans**: TBD
**Research flag**: Sim, rodar `/gsd:research-phase` antes de planejar (escopo do webhook de bounce/denúncia do provedor de envio escolhido na Fase 13, e o formato de verificação de assinatura, que difere do padrão Stripe já usado).
