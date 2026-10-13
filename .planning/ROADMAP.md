# Roadmap: Osprano

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
- [x] **Phase 9: Honestidade e superfície jurídica** - Landing só com o que o produto faz, páginas legais, aceite no cadastro, suporte e exclusão de conta (milestone v1.3, completed 2026-10-12)
- [x] **Phase 10: Dados do Google conformes** - Só `place_id` persistido, dados do Google sob demanda com atribuição, dado confirmado pelo cliente alimenta preview e IA (milestone v1.3, completed 2026-10-13)
- [ ] **Phase 11: Cobrança endurecida** (adiada em 2026-10-13: vem antes do lançamento, depois do beta) - Webhook seguro, pagamento falho, assinatura única, IVA e fatura, sem falha silenciosa (milestone v1.3)
- [x] **Phase 12: Planos e custo por cliente** - Solo/Pro/Agência com limites, cota de IA, teste grátis único, tetos diários e global (milestone v1.3, completed 2026-10-13, não publicado)
- [ ] **Phase 13: Remetente e envio pelo e-mail do cliente** - Perfil de remetente, "Enviar" abre o e-mail do cliente, supressão global, Noruega em validação (milestone v1.3)
- [ ] **Phase 14: Prospecção assistida: verificação, ligação e preparação** - Confere site e redes sociais, fila "Ligar", "Preparar" gera tudo numa fila de revisão, sem envio (milestone v1.3)
- [ ] **Phase 15: Primeiro uso, operação e idioma** - Onboarding, monitor de erros, painel interno, inglês e português (milestone v1.3)
- [ ] **Phase 16: Portão de lançamento: cobrança ponta a ponta** - Fluxo de dinheiro provado em teste e com pagamento real reembolsado (milestone v1.3)

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
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16

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
| 9. Honestidade e superfície jurídica | 0/TBD | Not started | - |
| 10. Dados do Google conformes | 0/TBD | Not started | - |
| 11. Cobrança endurecida | 0/TBD | Not started | - |
| 12. Planos e custo por cliente | 0/TBD | Not started | - |
| 13. Remetente e envio pelo e-mail do cliente | 0/TBD | Not started | - |
| 14. Prospecção assistida | 0/TBD | Not started | - |
| 15. Primeiro uso, operação e idioma | 0/TBD | Not started | - |
| 16. Portão de lançamento | 0/TBD | Not started | - |

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

## Milestone v1.3: Pronto pra vender (2026-10-12)

Substitui o milestone "Automação da prospecção" de 2026-09-26, cujas Fases 9-14 nunca começaram (o envio automático, o follow-up e a base de envio ficaram no backlog v2 como AUTO-*, FUP-*, BASE-02). Objetivo: um desconhecido acha o Osprano, assina, configura e prospecta sozinho, com custo por cliente que cabe no preço e sem risco legal para a Duda como operadora. Três decisões da Duda em 2026-10-12 moldam a ordem: lançar **sem envio automático** (o app prepara tudo e o cliente envia do próprio e-mail), dados do Google **conformes aos termos EEA** (só `place_id` é persistido) e público **inglês + português**.

A ordem segue o que bloqueia receber dinheiro e o que muda o modelo de dados. Primeiro a superfície jurídica e a honestidade da landing (Fase 9), depois o modelo de lead do Google (Fase 10), porque verificação, preparação e envio constroem em cima dele. Cobrança endurecida (Fase 11) e planos com limites de custo (Fase 12) vêm antes de qualquer cliente pagar. O perfil de remetente e o envio pelo e-mail do cliente (Fase 13) precedem a preparação automática (Fase 14), que depende de verificação, envio e planos. Onboarding, operação e idioma ficam por último entre as funcionalidades (Fase 15), para não traduzir a mesma tela duas vezes, e a verificação de cobrança ponta a ponta fecha o milestone como portão de lançamento (Fase 16). Pesquisa em `.planning/research/commercial/` (COST-PRICING, LEGAL, LAUNCH-READINESS) e, para verificação, ligação e preparação, `.planning/research/SUMMARY.md`. Planejamento via GSD (`/gsd:plan-phase`).

### Phase 9: Honestidade e superfície jurídica

**Goal**: A landing diz só o que o produto faz, as páginas legais existem e estão linkadas, o cadastro registra o aceite, o suporte é achável e o cliente consegue apagar a própria conta com tudo.
**Depends on**: Phase 8
**Requirements**: LEGAL-01, LEGAL-02, LEGAL-03, LEGAL-04, LEGAL-05
**Success Criteria** (what must be TRUE):
  1. A landing não tem depoimento inventado, nem "notificado quando abrem", nem white-label/domínio próprio, nem toggle anual sem preço; os planos exibidos são os planos reais
  2. Informações da empresa (razão social, CNPJ, endereço, país, e-mail da empresa brasileira), Privacidade (GDPR + LGPD), Termos, Cookies, DPA, Subprocessadores e Aviso ao prospect abrem por URL pública e estão linkados no rodapé da landing e do app; os Termos dizem que o cliente responde pelo contato que faz, que o uso é só B2B e linkam os termos do Google Maps
  3. O cadastro só conclui com aceite de Termos e DPA e declaração de uso profissional; a versão e a data do aceite aparecem gravadas no workspace, e subir a versão dos documentos pede novo aceite no próximo acesso
  4. Um e-mail de suporte e privacidade aparece na landing e dentro do app
  5. Em Ajustes, o cliente exclui a conta: os dados do workspace somem do Convex, a assinatura é cancelada no Stripe e o login do Clerk é removido
**Plans**: 7 plans (3 waves)

Plans:
- [ ] 09-01-PLAN.md (W1): base: `convex/lib/legal.ts` (identidade com placeholders, versão única, aceite), schema com campos de aceite e `uploads.by_org`, ctx falso de testes, componentes `LegalLinks`/`LegalDoc` e layout de `/legal`
- [ ] 09-02-PLAN.md (W1): landing honesta: sem depoimentos, notificação, white-label ou toggle anual; features de `PLANS` corrigidas; teste de honestidade
- [ ] 09-03-PLAN.md (W2): páginas Informações da empresa, Cookies, Subprocessadores e Aviso ao prospect; coluna "Legal" com suporte no rodapé da landing
- [ ] 09-04-PLAN.md (W2): Termos, Privacidade (GDPR + LGPD) e DPA (art. 28) em rascunho técnico
- [ ] 09-05-PLAN.md (W2): aceite com versão e data no workspace, gate no app, guarda no servidor (cota, IA, envio, checkout), rodapé legal no app
- [ ] 09-06-PLAN.md (W2): exclusão de conta em Ajustes (Stripe cancelado, Convex limpo em lotes, login do Clerk removido)
- [ ] 09-07-PLAN.md (W3): verificação completa + conferência da Duda (gate e exclusão ponta a ponta com Stripe em modo teste)

**Depende de você**: razão social, CNPJ e endereço da empresa brasileira para a página Informações da empresa; revisão de advogado dos Termos, Privacidade e DPA antes de cobrar (o texto é rascunho técnico, não parecer); caixa de e-mail de suporte/privacidade criada.

### Phase 10: Dados do Google conformes

**Goal**: Lead vindo do Google guarda só o `place_id`; os dados do Google aparecem buscados na hora, com atribuição e sem estourar o custo; só dado confirmado pelo cliente (ou do OpenStreetMap) vai para o público e para a IA.
**Depends on**: Phase 9
**Requirements**: GPLC-01, GPLC-02, GPLC-03, GPLC-04, GPLC-05, SCAL-01
**Success Criteria** (what must be TRUE):
  1. Um lead novo vindo do Google fica no banco só com `place_id` (e latitude/longitude por no máximo 30 dias); nome, endereço, telefone, nota e site do Google não aparecem gravados
  2. Ao abrir a lista de leads ou um lead, os dados do Google aparecem buscados sob demanda, cada busca é contada na cota do cliente, e a lista é paginada, sem consulta que leia a tabela inteira
  3. O cliente confirma ou edita nome, telefone, e-mail e endereço; o preview público, a mensagem e o prompt da IA usam só dado confirmado ou do OpenStreetMap
  4. Depois da migração, leads antigos mantêm estágio, notas, histórico, site gerado e dados confirmados, e não sobra dado do Google gravado neles
  5. Toda tela com conteúdo do Google mostra a atribuição do Google Maps, e esse conteúdo nunca aparece ao lado de um mapa
**Plans**: 12 plans

Plans:
- [ ] 10-01-PLAN.md: googleData.ts (o que pode sair do app, confirmação, limpeza da migração) e placesFields.ts (máscaras e preços do Google) (GPLC-02, GPLC-03, GPLC-04)
- [ ] 10-02-PLAN.md: schema aditivo (confirmação, contador, índices) e cota mensal de consultas ao Google 25/300/400 (GPLC-02, SCAL-01)
- [ ] 10-03-PLAN.md: name opcional, rótulo "Negócio do Google" nas telas, DM e links só com nome confirmado (GPLC-01, GPLC-03)
- [ ] 10-04-PLAN.md: descoberta grava só place_id e derivados; actions details/detailsMany com cota (GPLC-01, GPLC-02)
- [ ] 10-05-PLAN.md: preview, publicação, IA, roteiro e WhatsApp só com dado compartilhável; leads.confirmInfo (GPLC-03)
- [ ] 10-06-PLAN.md: memória do Google só em JS, GoogleAttribution, GoogleCard e confirmação digitada no drawer (GPLC-02, GPLC-03, GPLC-05)
- [ ] 10-07-PLAN.md: SCAL-01 no servidor: listForDiscovery paginada, listCrm limitada, stats/analytics, sites, outbox, supressão (SCAL-01)
- [ ] 10-08-PLAN.md: código da migração (model/googleMigration.ts, googleCompliance.ts, seed só de dev) (GPLC-04)
- [ ] 10-09-PLAN.md: tela de Leads paginada com Google ao vivo em memória e botão de carregar a página (GPLC-02, GPLC-05, SCAL-01)
- [ ] 10-10-PLAN.md: Kanban, faixa Hoje e Excluir sobre listCrm com otimistas (SCAL-01)
- [ ] 10-11-PLAN.md: apagar leads.list e ensaio da migração no DEV com backup (GPLC-04, SCAL-01)
- [ ] 10-12-PLAN.md: portão de produção: verificação final, migração aprovada pela Duda, conferência no app (todos)
**Depende de você**: conferir o país de cobrança da conta Google Cloud (define termos EEA ou não-EEA) e rodar a migração dos leads reais em produção depois de ver o resultado num ensaio (backup antes).

### Phase 11: Cobrança endurecida

**Goal**: O Stripe é a fonte de verdade do estado da assinatura: webhook seguro, pagamento falho tratado, assinatura única, imposto e fatura corretos, e nenhuma falha silenciosa.
**Depends on**: Phase 9
**Requirements**: BILL-05, BILL-06, BILL-07, BILL-08, BILL-09, PLAN-05
**Success Criteria** (what must be TRUE):
  1. O webhook rejeita evento com timestamp fora de ±5 min ou assinatura inválida (comparação em tempo constante), provado por teste
  2. Com pagamento atrasado ou falho, o app mostra aviso, restringe o uso depois do prazo de carência e volta ao normal quando o pagamento entra
  3. Quem já assina não consegue abrir um segundo checkout; troca ou cancela o plano pelo portal do Stripe
  4. O checkout calcula IVA, coleta VAT ID e nome da empresa, gera fatura válida, e recusa pessoa física
  5. Depois do checkout há uma tela de sucesso; `APP_URL` ausente falha de forma visível (nunca cai em localhost); evento sem workspace ou com preço desconhecido deixa log de erro
**Plans**: TBD
**Depende de você**: conta Stripe (ou alternativa) da empresa brasileira, produtos e preços criados, e orientação do contador sobre exportação de serviço e IVA do cliente UE (bloqueia a fatura real). A pesquisa desta fase confere se a Stripe atende empresa brasileira cobrando em euro.

### Phase 12: Planos e custo por cliente

**Goal**: Os três planos existem com limites reais, cada chamada que custa dinheiro reserva cota antes, o teste grátis não renova e a Duda tem teto de gasto.
**Depends on**: Phase 10 (Fase 11 adiada em 2026-10-13: beta fechado sem cobrança automática; espelhar preços no Stripe e PLAN-05 vão para a Fase 11)
**Requirements**: PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-06, SCAL-02
**Success Criteria** (what must be TRUE):
  1. Solo (EUR 29), Pro (EUR 59) e Agência (EUR 149) aparecem com limites de leads, gerações por IA e verificações definidos num único lugar do código (iguais ao Stripe só na Fase 11); a Duda consegue dar um plano a um usuário beta por comando interno
  2. Gerar mensagem ou roteiro de ligação sem cota deixa o botão bloqueado, com aviso e link de upgrade; a cota é reservada antes de chamar a Anthropic; criar lead manual também consome cota
  3. Quem se cadastra recebe um teste único de 25 leads e 25 gerações; criar outra conta ou workspace com a mesma pessoa não dá novo teste
  4. O uso e os limites aparecem no topo do app com aviso em 80% e 100% (renovar no ciclo do Stripe fica na Fase 11)
  5. Cada cliente tem teto diário de buscas no Google e de verificações; passar do teto global de segurança pausa as buscas no Google e avisa a Duda
**Plans**: 6 plans
Plans:
- [ ] 12-01-PLAN.md — Catálogo de planos (teste + Solo/Pro/Agência), schema aditivo, query current e telas que exibem plano
- [ ] 12-02-PLAN.md — Motor de cota (IA, verificações, buscas diárias, teste sem renovação) e teto global de US$ 30/mês
- [ ] 12-03-PLAN.md — Teste único por pessoa (hash do e-mail, sobrevive ao purge) e comandos internos grantPlan/migrateFreeToTrial/budgetStatus
- [ ] 12-04-PLAN.md — Ligar chamadas pagas: buscas e detalhes do Google, IA em draft/callScript, leads.create (SCAL-02)
- [ ] 12-05-PLAN.md — Barra de uso no topo com avisos 80%/100% e botões de IA bloqueados sem cota
- [ ] 12-06-PLAN.md — Gates, fumaça no Convex DEV, roteiro de produção e conferência visual
**Depende de você**: `ANTHROPIC_API_KEY` em produção (e rotação da chave exposta em 2026-09-16); orçamento mensal máximo para o teto global; os três preços criados no Stripe (vêm da Fase 11).

### Phase 13: Remetente e envio pelo e-mail do cliente

**Goal**: A mensagem sai com a identidade do cliente, não a da Duda, e o envio é um clique que abre o e-mail do próprio cliente depois de o servidor conferir as travas, sem o Osprano transmitir e-mail.
**Depends on**: Phase 10
**Requirements**: SEND-01, SEND-02, SEND-03, SEND-04, SEND-05, BASE-03
**Success Criteria** (what must be TRUE):
  1. Sem perfil de remetente (nome, empresa, endereço, e-mail de resposta) o cliente não gera nem envia mensagem; assinatura, rodapé e prompt da IA usam os dados dele
  2. "Enviar" abre a mensagem pronta no Gmail, Outlook ou app padrão, ou copia o texto; nenhum e-mail do cliente passa por provedor do Osprano
  3. Antes de abrir ou copiar, o servidor confere `canContactByEmail`, supressão e mercado na hora, e o corpo leva sempre o rodapé de opt-out com link de descadastro e a fonte do dado
  4. Marcar como enviada move o lead para Abordado e registra no Histórico
  5. Quem se descadastra pelo link de um cliente fica suprimido para todos os clientes; a Noruega aparece como mercado de ligação primeiro com "validação jurídica pendente"
**Plans**: 6 plans
- [ ] 13-01-PLAN.md: perfil de remetente: lib, schema, get/save, aba Remetente em Ajustes, assinatura do DM (wave 1)
- [ ] 13-02-PLAN.md: rodapé final com fonte do dado, links Gmail/Outlook/mailto, prompt com nome e empresa do cliente (wave 1)
- [ ] 13-03-PLAN.md: supressão global, purge preserva opt-out, Noruega em ligação primeiro (wave 1)
- [ ] 13-04-PLAN.md: servidor: prepareSend, markSent só preparado, perfil obrigatório na IA, Resend e WhatsApp de cliente desligados (wave 2)
- [ ] 13-05-PLAN.md: composer: Enviar abre no e-mail da cliente, Copiar, Marquei como enviada (wave 3)
- [ ] 13-06-PLAN.md: portões completos e conferência da Duda no navegador (wave 4, checkpoint)
**Depende de você**: nada externo; a Noruega só sai de "pendente" com validação jurídica sua.

### Phase 14: Prospecção assistida: verificação, ligação e preparação

**Goal**: O cliente seleciona leads e o app confere o site, acha redes sociais, gera o preview, escreve a mensagem e escolhe o canal, deixando tudo numa fila de revisão; nada sai sem o clique dele.
**Depends on**: Phase 10, Phase 12, Phase 13
**Requirements**: VERIF-01, VERIF-02, VERIF-03, VERIF-04, CALL-01, CALL-02, CALL-03, PIPE-01, PIPE-02, PIPE-03, PIPE-04
**Success Criteria** (what must be TRUE):
  1. Leads selecionados são conferidos na web: quem tem site de verdade sai do fluxo como "já tem site" com o link como prova; Instagram e Facebook encontrados aparecem no lead, com mensagem pronta para copiar
  2. A régua de "tem site" é a mesma do resto do produto (`classifyWebsite`) e o servidor nunca busca URL de terceiro sem validar o host
  3. O filtro "Ligar" no CRM lista leads de mercados de ligação primeiro com telefone, roteiro e redes sociais; o resultado da ligação (vai fechar, não vai com motivo, pediu e-mail com consentimento, não atendeu reagenda) decide o próximo passo; na Alemanha o card pede o motivo concreto antes do roteiro
  4. "Preparar" em um ou vários leads confere o site, gera o preview, escreve a mensagem e escolhe o canal pela regra do país, reservando cota em cada etapa; cada lead mostra a etapa atual e, se falhar, o erro e "tentar de novo"
  5. Tudo cai numa fila de revisão; mensagem com aviso da IA (dado não confirmado) vem destacada; nada é enviado sem o clique do cliente
**Plans**: TBD
**Research flag**: rodar `/gsd:research-phase` para a parte de verificação (busca web é serviço externo novo e a superfície de SSRF é nova).
**Depende de você**: conta e chave Serper.dev (VERIF); `ANTHROPIC_API_KEY` em produção (PIPE, já pedida na Fase 12).

### Phase 15: Primeiro uso, operação e idioma

**Goal**: Quem chega sabe o que fazer, a Duda enxerga erros e clientes e consegue suspender abuso, e o produto inteiro funciona em inglês e português.
**Depends on**: Phase 13, Phase 14
**Requirements**: ONB-01, ONB-02, OPS-01, OPS-02, SCAL-03, I18N-01, I18N-02
**Success Criteria** (what must be TRUE):
  1. No primeiro acesso o cliente vê as boas-vindas com os passos (perfil do remetente, primeira busca, primeiro site, primeira mensagem), o checklist some ao terminar, e cada tela vazia explica o que fazer com o botão da próxima ação
  2. Erro do Next ou do Convex em produção chega à Duda com alerta, sem PII de prospect no log
  3. A Duda tem uma visão interna dos clientes (plano, uso, status, último acesso) e suspende uma conta abusiva, que passa a ver a tela de conta suspensa
  4. Abrir o mesmo preview repetidamente não infla a contagem de aberturas (rate-limit/dedupe) e `getBySlug` não devolve o token
  5. Landing, páginas legais, app logado e e-mails do sistema existem em inglês e português, seguem o navegador e podem ser trocados; a mensagem ao prospect continua no idioma do mercado do lead
**Plans**: TBD
**Depende de você**: aprovação de dependência nova para monitor de erros (OPS-01) e para biblioteca de i18n (I18N-01); conta no serviço de monitoramento escolhido; revisão do texto em inglês das páginas legais pelo advogado.

### Phase 16: Portão de lançamento: cobrança ponta a ponta

**Goal**: Antes de abrir para clientes, o fluxo de dinheiro inteiro é provado em teste e em produção com um pagamento real reembolsado.
**Depends on**: Phase 15 (e todas as anteriores)
**Requirements**: BILL-10
**Success Criteria** (what must be TRUE):
  1. Em modo teste do Stripe, assinar, trocar de plano, cancelar e falhar um pagamento levam o workspace ao estado certo, com o webhook processando cada evento
  2. Em produção (modo live), um pagamento real é feito, gera fatura com IVA e VAT ID corretos, o plano muda no app, e o valor é reembolsado
**Plans**: TBD
**Depende de você**: Stripe (ou alternativa) em modo live com preços, tratamento fiscal validado pelo contador, zero placeholders na identidade legal, e um cartão para o pagamento real de teste.
