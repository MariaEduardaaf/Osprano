# Roadmap: Osprano — Pronto para Produção (Fase 1: Bloqueadores)

## Overview

Este milestone leva o Osprano — SaaS de prospecção e venda de sites para o mercado europeu — de codebase funcional a pronto para produção, corrigindo os 12 bloqueadores identificados pela auditoria de 2026-07-11. A ordem segue o risco: primeiro a integridade de billing/quota e a neutralização do modo demo em produção (evita vazamento financeiro e brecha de autenticação); depois o compliance de email e WhatsApp garantido por código, não por promessa (evita risco legal de GDPR/ePrivacy); por fim a correção do sinal de funil, a fidelidade do composer ao envio e a localização do preview por mercado (entrega a experiência prometida nos 5 mercados-alvo: GB, IE, NL, SE, NO). As duas últimas fases tocam a mesma mutation `send` em `convex/outreach.ts`, por isso compliance (que injeta o rodapé de opt-out) precede tracking/composer (que persiste as edições do usuário) — evita reescrever a mesma função duas vezes em paralelo.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Integridade de Billing e Segurança do Modo Demo** - Quota não pode ficar negativa nem ser cobrada além do entregue; plano reflete o Stripe real; modo demo é inerte em produção
- [ ] **Phase 2: Compliance de Email e WhatsApp** - Supressão, unsubscribe e opt-out garantidos por código; WhatsApp só com opt-in registrado
- [ ] **Phase 3: Tracking, Composer e Localização** - Funil reflete abertura real do prospect, resposta manual funciona, composer é fonte de verdade do envio, preview localizado por mercado

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
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Integridade de quota na descoberta: clamp com piso, guarda no reserveUsage, estorno reconciliado (BILL-01, BILL-02)
- [ ] 01-02-PLAN.md — Plano derivado do price_id no webhook Stripe (BILL-03)
- [ ] 01-03-PLAN.md — Guarda de ambiente do modo demo (default-deny CONVEX_ENV / NODE_ENV) (SEC-01)

### Phase 2: Compliance de Email e WhatsApp
**Goal**: Nenhum email é enviado para endereço suprimido, existe um caminho de unsubscribe público e funcional, todo email carrega opt-out visível e o header `List-Unsubscribe`, e o WhatsApp só é acionado com opt-in explícito e registrado do prospect — tudo garantido por código, não por instrução de prompt à IA.
**Depends on**: Phase 1 (sequenciamento; BILL-03 e COMP-02 tocam `convex/http.ts` — evita conflito de merge)
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04
**Success Criteria** (what must be TRUE):
  1. Existe uma tabela de supressão no schema (email normalizado + escopo org/global + origem + timestamp) e tanto `outreach.draft` quanto `outreach.send` recusam endereços presentes nela
  2. Um prospect consegue acessar um endpoint HTTP público de unsubscribe (sem auth, por token) e o endereço passa a constar na tabela de supressão, com confirmação exibida
  3. Todo email enviado via Resend sai com rodapé de opt-out (link de unsubscribe + identificação do remetente) injetado por código e com o header `List-Unsubscribe` no payload — mesmo que a IA ou o fallback de parse não o incluam
  4. Um follow-up por WhatsApp só fica disponível para um lead depois de um evento de opt-in registrado (com origem e timestamp) — arrastar o card no Kanban sozinho não libera o WhatsApp
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

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
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Integridade de Billing e Segurança do Modo Demo | 0/3 | Not started | - |
| 2. Compliance de Email e WhatsApp | 0/TBD | Not started | - |
| 3. Tracking, Composer e Localização | 0/TBD | Not started | - |
