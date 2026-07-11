# Requirements: Osprano — Milestone "Pronto para produção: bloqueadores"

**Defined:** 2026-07-11
**Core Value:** O usuário prospecta e aborda negócios europeus sem risco legal — compliance garantido por código e contagem de plano/billing íntegra.

## v1 Requirements

Bloqueadores de produção identificados pela auditoria de 2026-07-11. Cada um mapeia para fases do roadmap.

### Billing & Quota

- [x] **BILL-01**: Nenhuma chamada consegue negativar a quota — `foursquare.search` clampa o count com piso 1 (como `places.ts` já faz) e `reserveUsage` rejeita `count <= 0` com erro (defesa em profundidade). (`convex/foursquare.ts:44`, `convex/model/workspace.ts:41-58`)
- [x] **BILL-02**: A quota de leads cobra o que foi entregue, não o que foi pedido — após a descoberta, o uso reservado é reconciliado com o nº de leads realmente inseridos (excedente estornado; falha total do fetch externo estorna tudo). (`convex/places.ts:44-53`, `convex/foursquare.ts:43-47`)
- [x] **BILL-03**: Upgrade/downgrade feito pelo Stripe Billing Portal reflete no workspace — o webhook deriva o plano do `price_id` atual da subscription (mapa price→plan via `STRIPE_PRICE_PRO`/`STRIPE_PRICE_AGENCY`), não de `metadata.plan`. (`convex/http.ts:41-53`, `convex/workspaces.ts:54-74`)

### Tracking & Funil

- [x] **TRCK-01**: Abertura do preview pelo próprio vendedor (sessão autenticada do mesmo workspace) não incrementa `openCount`, não gera evento `preview_open` e não move o lead de `base` para `approached` — só abertura real do prospect conta. (`convex/previews.ts:115-141`, `src/components/preview-tracker.tsx`)
- [ ] **TRCK-02**: Usuário pode marcar um outreach como "respondeu" manualmente (no detalhe do lead e/ou na outbox), gravando status `replied` real com timestamp — a coluna "Respondeu" deixa de ser exclusiva do demo. (`convex/outreach.ts`, `src/app/(app)/outreach/page.tsx`, `src/components/crm/lead-detail.tsx`)

### Compliance de Email

- [x] **COMP-01**: Existe tabela de supressão (email normalizado + escopo org/global + origem + timestamp) e tanto `outreach.draft` quanto `outreach.send` recusam endereços suprimidos. (`convex/schema.ts`, `convex/outreach.ts`)
- [x] **COMP-02**: Existe endpoint HTTP público de unsubscribe (token por outreach/lead, sem auth) que grava na tabela de supressão e confirma ao prospect. (`convex/http.ts`)
- [x] **COMP-03**: Todo email enviado sai com rodapé de opt-out injetado por código (link do unsubscribe + identificação do remetente) e header `List-Unsubscribe` no payload do Resend — independente do que a IA gerar ou do fallback de parse. (`convex/outreach.ts:156-185`, `convex/lib/outreachAi.ts:82-88`)

### Compliance de WhatsApp

- [x] **COMP-04**: Follow-up por WhatsApp só é liberado com opt-in registrado do prospect (registro explícito com origem e timestamp — ex.: "respondeu o email pedindo contato"), não por estágio de Kanban arrastável. (`convex/whatsapp.ts:17`, `convex/schema.ts`)

### Segurança

- [x] **SEC-01**: O modo demo é inerte em produção — `NEXT_PUBLIC_DEMO` (proxy) e `DEMO_MODE` (backend/seed) só têm efeito fora de produção (guarda de ambiente), impossibilitando desligar a auth por env esquecida. (`src/proxy.ts:27`, `convex/model/tenant.ts:12`, `convex/demo.ts:133`)

### Outreach UX

- [ ] **OUTR-01**: O que o usuário vê no composer é o que sai — edições de assunto/corpo são persistidas (mutation de update) e o envio via Resend usa o conteúdo atualizado. (`src/components/outreach-composer.tsx`, `convex/outreach.ts:165-166`)

### Localização

- [x] **L10N-01**: O preview de site renderiza no idioma do mercado do lead (EN para GB/IE, NL para NL, SV para SE, NO para NO) — nenhum copy em português hardcoded; strings centralizadas por locale. (`src/components/preview-site.tsx`, mapa de idiomas existente em `convex/lib/outreachAi.ts:5-11`)

## v2 Requirements

Fase 2 — "antes de escalar". Rastreados, fora do roadmap atual.

### Robustez & Escala

- **SCAL-01**: Paginação/take nas queries `.collect()` (`leads.list/stats/analytics`, `previews.listSites`, `outreach.outbox`)
- **SCAL-02**: Quota aplicada também em `leads.create` (criação manual)
- **SCAL-03**: Rate-limit/dedupe em `previews.recordOpen`; remover `token` da resposta de `getBySlug`

### Dados & GDPR

- **GDPR-01**: Cron de purge/refresh 30 dias (ToS Google Places) + mutation de deleção de lead (Art. 17)
- **GDPR-02**: Webhooks Resend de bounce/inbound → `bounced` real e `replied` automático + supressão automática

### Billing

- **BILL-04**: Gating de features por plano (outreach IA só Pro+, export CSV, mercados/categorias)
- **BILL-05**: Webhook Stripe com tolerância de timestamp (±5 min) e comparação constant-time

## Out of Scope

| Feature | Reason |
|---------|--------|
| Webhook inbound/bounce do Resend nesta fase | Decisão da usuária: "respondeu" manual destrava o lançamento; automação na Fase 2 |
| Geração de preview por IA / múltiplos templates | Decisão da usuária: localizar o template atual primeiro; IA é a Fase 3 |
| Domínio próprio white-label (Agency) | Fase 3 — promessa de produto, não bloqueador |
| Plugar ou remover Foursquare da UI | Fase 3 — hoje é código órfão; BILL-01 corrige o bug de quota nele mesmo assim |
| Cold WhatsApp / novos canais | Ilegal na UE; contradiz o posicionamento do produto |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BILL-01 | Phase 1 | Complete |
| BILL-02 | Phase 1 | Complete |
| BILL-03 | Phase 1 | Complete |
| TRCK-01 | Phase 3 | Complete |
| TRCK-02 | Phase 3 | Pending |
| COMP-01 | Phase 2 | Complete |
| COMP-02 | Phase 2 | Complete |
| COMP-03 | Phase 2 | Complete |
| COMP-04 | Phase 2 | Complete |
| SEC-01 | Phase 1 | Complete |
| OUTR-01 | Phase 3 | Pending |
| L10N-01 | Phase 3 | Complete |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 12 (roadmap criado — see ROADMAP.md)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-11*
*Last updated: 2026-07-11 after roadmap creation (12/12 mapped to Phases 1-3)*
