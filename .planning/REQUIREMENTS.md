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
- [x] **TRCK-02**: Usuário pode marcar um outreach como "respondeu" manualmente (no detalhe do lead e/ou na outbox), gravando status `replied` real com timestamp — a coluna "Respondeu" deixa de ser exclusiva do demo. (`convex/outreach.ts`, `src/app/(app)/outreach/page.tsx`, `src/components/crm/lead-detail.tsx`)

### Compliance de Email

- [x] **COMP-01**: Existe tabela de supressão (email normalizado + escopo org/global + origem + timestamp) e tanto `outreach.draft` quanto `outreach.send` recusam endereços suprimidos. (`convex/schema.ts`, `convex/outreach.ts`)
- [x] **COMP-02**: Existe endpoint HTTP público de unsubscribe (token por outreach/lead, sem auth) que grava na tabela de supressão e confirma ao prospect. (`convex/http.ts`)
- [x] **COMP-03**: Todo email enviado sai com rodapé de opt-out injetado por código (link do unsubscribe + identificação do remetente) e header `List-Unsubscribe` no payload do Resend — independente do que a IA gerar ou do fallback de parse. (`convex/outreach.ts:156-185`, `convex/lib/outreachAi.ts:82-88`)

### Compliance de WhatsApp

- [x] **COMP-04**: Follow-up por WhatsApp só é liberado com opt-in registrado do prospect (registro explícito com origem e timestamp — ex.: "respondeu o email pedindo contato"), não por estágio de Kanban arrastável. (`convex/whatsapp.ts:17`, `convex/schema.ts`)

### Segurança

- [x] **SEC-01**: O modo demo é inerte em produção — `NEXT_PUBLIC_DEMO` (proxy) e `DEMO_MODE` (backend/seed) só têm efeito fora de produção (guarda de ambiente), impossibilitando desligar a auth por env esquecida. (`src/proxy.ts:27`, `convex/model/tenant.ts:12`, `convex/demo.ts:133`)

### Outreach UX

- [x] **OUTR-01**: O que o usuário vê no composer é o que sai — edições de assunto/corpo são persistidas (mutation de update) e o envio via Resend usa o conteúdo atualizado. (`src/components/outreach-composer.tsx`, `convex/outreach.ts:165-166`)

### Localização

- [x] **L10N-01**: O preview de site renderiza no idioma do mercado do lead (EN para GB/IE, NL para NL, SV para SE, NO para NO) — nenhum copy em português hardcoded; strings centralizadas por locale. (`src/components/preview-site.tsx`, mapa de idiomas existente em `convex/lib/outreachAi.ts:5-11`)

### Modo Opt-in (ligação-primeiro) — Fase 4

- [x] **OPTIN-01**: A descoberta funciona em mercados opt-in (ES/IT/PT/DE/DK/CH — adicionar PT ao `MARKETS` + cidades por país): "mercado pesquisável" é separado de "mercado emailável", e TODO lead de mercado opt-in nasce `emailable=false`, independente de forma jurídica/inbox. (`convex/lib/domain.ts`, `convex/places.ts`, `convex/scoring.ts`)
- [x] **OPTIN-02**: A página de Leads tem abas "Email primeiro" (mercados opt-out) e "Ligação primeiro" (mercados opt-in); na segunda, o card prioriza telefone (Ligar em destaque) e script de ligação, sem ação de cold email. (`src/app/(app)/leads/page.tsx`, `src/components/lead-card.tsx`)
- [x] **OPTIN-03**: Script de ligação gerado por IA no idioma do mercado + tradução pt-BR lado a lado, citando a dor específica do lead (mesmo padrão do `writeEmail`). (`convex/lib/outreachAi.ts`, `convex/outreach.ts`)
- [x] **OPTIN-04**: Consentimento de contato generalizado (email/WhatsApp) com origem + timestamp + evento — registrável pelo usuário; após registro, o composer de email destrava para o lead. (generalizar `waOptIn*` da Fase 2; `convex/leads.ts`, `convex/schema.ts`)
- [x] **OPTIN-05**: Guardrail server-side: `outreach.draft` e `outreach.send` recusam lead de mercado opt-in SEM consentimento registrado — nunca confiar só na UI. (`convex/outreach.ts`, `convex/lib/domain.ts`)
- [x] **OPTIN-06**: Mercados opt-in exibem aviso discreto "validação jurídica pendente" na UI até validação por país (flag por mercado no `MARKETS`).

## v1.1 Requirements

Milestone v1.1 (2026-09-16): visual da área logada e CRM. Executado com o workflow superpowers (specs e planos em `docs/superpowers/`), não com planos GSD. Fases 5 e 6 do roadmap.

### Redesenho vidro sobre névoa (Fase 5)

- [x] **UX-01**: Tokens novos (névoa `--mist`, `--surface` translúcida, `--elevated`, `--glass-border`, `--surface-solid`, `--danger-fg`, raio 18/22px, sombras) escopados a `:root:has(.app-shell)`; landing e páginas públicas de preview ficam com os tokens de antes (screenshots de `/` e `/site/[slug]` iguais antes e depois). (`src/app/globals.css`, `src/app/(app)/layout.tsx`)
- [x] **UX-02**: Classes `glass`, `glass-lite` e `glass-dense` em `@layer components`, só no primeiro nível (o bloco que encosta na névoa ou no overlay); inputs, selects e blocos internos sólidos (`bg-surface-solid` / `bg-surface-2`); nenhum `glass` dentro de `glass`. (`src/app/globals.css`, `src/components/**`, `src/app/(app)/**`)
- [x] **UX-03**: Header de 56px removido; rail de 72px em vidro com ícone e nome ("Início, Leads, CRM, Outreach, Sites, Ajustes"), `aria-current="page"` no ativo, ThemeToggle e UserButton (ou chip DEMO) na base; `UsageFooter` apagado (plano e uso já vivem em Settings → "Plano & uso"). (`src/components/sidebar.tsx`, `src/app/(app)/layout.tsx`)
- [x] **UX-04**: Tema escuro em névoa azul-marinho (não grafite) com `--foreground`/`--muted`/`--cold`/`--hot`/`--danger` em AA sobre a mancha mais escura; `prefers-reduced-transparency` deixa os vidros opacos com contorno; drawer e modal em `glass-dense` sobre overlay `bg-black/30`. (`src/app/globals.css`, `src/components/crm/lead-detail.tsx`, `src/components/crm/create-lead-modal.tsx`)
- [x] **UX-05**: Commit preparatório: `* { border-color }` movido para `@layer base` (os utilitários de cor de borda voltam a funcionar); `backdrop-filter` só sem prefixo; screenshots finais da área logada em `docs/redesign/` (7 telas, claro e escuro, 1440px). (commits `09fb2da`, `c781a5a`, `92f2704`)

### CRM: fluxo do dia e informação do lead (Fase 6)

- [x] **CRM-01**: Uma próxima ação por lead (`nextActionAt` + `nextActionNote` no documento do lead, sem tabela de tarefas) com `setNextAction`/`clearNextAction`; linha no card do Kanban com status atrasada (`--hot`), hoje (`--warm`) ou futura (`--faint`); `NextActionForm` no detalhe. (`convex/schema.ts`, `convex/leads.ts`, `src/components/crm/next-action-form.tsx`, `next-action-line.tsx`)
- [x] **CRM-02**: Faixa "Hoje" entre o cabeçalho e a busca, com os grupos Atrasadas e Hoje e as ações Feito (limpa e abre o detalhe com o campo em foco) e Adiar (1/3/7 dias, update otimista); calculada no navegador com `useNow` (60 s), some quando vazia e não muda com busca ou filtro. (`src/components/crm/today-strip.tsx`, `src/lib/use-now.ts`, `src/app/(app)/crm/page.tsx`)
- [x] **CRM-03**: Lead parado = 7+ dias em `stageUpdatedAt` sem ação e fora de `converted`/`lost` (`stalledDays`, `isStalled`, `STALLED_AFTER_DAYS`); linha "parado há N dias" no card, filtro rápido Parados e ordenação "Próxima ação" (`compareByNextAction`). (`convex/lib/domain.ts`, `src/app/(app)/crm/page.tsx`)
- [x] **CRM-04**: Coluna "Perdido" recolhida por padrão (cabeçalho é alvo de drop); `markLost` exige motivo (`LOST_REASONS`: Caro demais, Já tem site, Sem resposta, Não quer, Outro) e nota opcional; `setStage` recusa `lost` no servidor ("Use markLost") e limpa o motivo ao sair de `lost`; `LostReasonModal` (role dialog, foco inicial, Esc só fecha o modal) nos quatro pontos de entrada: drop, seletor do card, pílula de Etapa e botão Status. (`convex/leads.ts`, `src/components/crm/lost-reason-modal.tsx`, `lead-detail.tsx`, `crm/page.tsx`)
- [x] **CRM-05**: Contato (nome, cargo) e valores do negócio (setup, mensal) com `updateInfo` (trim, `null` limpa, negativo/NaN → "Valor inválido"); moeda derivada do país (`currencyForCountry`, `formatMoney`); edição inline (blur/Enter salva, Esc descarta); cabeçalho da coluna soma a mensalidade dos leads visíveis. (`convex/leads.ts`, `convex/lib/domain.ts`, `src/components/crm/lead-info-fields.tsx`, `crm/page.tsx`)
- [x] **CRM-06**: Notas são eventos (`addNote` → `events` com `type: "note"`); `leads.timeline` via índice `by_lead`; aba "Histórico" com campo de nota (Enter salva, Shift+Enter quebra) e linha do tempo com texto por tipo; `event-glyph.tsx` extraído do Dashboard com o caso `note`; `events.recent` exclui notas. (`convex/events.ts`, `convex/leads.ts`, `src/components/crm/lead-timeline.tsx`, `src/components/event-glyph.tsx`)
- [x] **CRM-07**: 17 funções puras novas em `convex/lib/domain.ts` (moeda, dia civil local, próxima ação, parado, motivos, formatação relativa) com 17 testes em `tests/crm-domain.test.ts` (suíte 191 → 208, timestamps sempre pelo construtor local); seed do demo cobre atrasadas, de hoje, parados, perdidos com motivo, contato/valores e notas. (`tests/crm-domain.test.ts`, `convex/demo.ts`)

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
| TRCK-02 | Phase 3 | Complete |
| COMP-01 | Phase 2 | Complete |
| COMP-02 | Phase 2 | Complete |
| COMP-03 | Phase 2 | Complete |
| COMP-04 | Phase 2 | Complete |
| SEC-01 | Phase 1 | Complete |
| OUTR-01 | Phase 3 | Complete |
| L10N-01 | Phase 3 | Complete |
| OPTIN-01 | Phase 4 | Complete |
| OPTIN-02 | Phase 4 | Complete |
| OPTIN-03 | Phase 4 | Complete |
| OPTIN-04 | Phase 4 | Complete |
| OPTIN-05 | Phase 4 | Complete |
| OPTIN-06 | Phase 4 | Complete |
| UX-01 | Phase 5 | Complete |
| UX-02 | Phase 5 | Complete |
| UX-03 | Phase 5 | Complete |
| UX-04 | Phase 5 | Complete |
| UX-05 | Phase 5 | Complete |
| CRM-01 | Phase 6 | Complete |
| CRM-02 | Phase 6 | Complete |
| CRM-03 | Phase 6 | Complete |
| CRM-04 | Phase 6 | Complete |
| CRM-05 | Phase 6 | Complete |
| CRM-06 | Phase 6 | Complete |
| CRM-07 | Phase 6 | Complete |

**Coverage:**
- v1 requirements: 18 total (12 do milestone de produção + 6 do modo opt-in)
- v1.1 requirements: 12 total (5 do redesenho + 7 do CRM)
- Mapped to phases: 30 (see ROADMAP.md)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-11*
*Last updated: 2026-09-16: milestone v1.1 (Fases 5 e 6) concluído; 18/18 requisitos v1 e 12/12 v1.1 completos*
