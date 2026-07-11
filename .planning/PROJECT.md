# Osprano

## What This Is

SaaS de prospecção e venda de sites para freelancers e agências que atendem o mercado europeu: encontra negócios locais com presença digital fraca (Google Places), pontua a dor (Digital Presence Score), gera um preview de site num link rastreado e conduz outreach por email escrito por IA — de forma legal (GDPR/ePrivacy, mercados opt-out) — até o fechamento no CRM. Visão completa em `docs/SOBRE.md`.

**Este é um codebase existente e funcional** (Next.js 16 App Router + Convex + Clerk + Resend + Stripe + Tailwind 4). Typecheck, lint, testes (14/14) e build de produção passam. O trabalho atual é o milestone "Pronto para produção — Fase 1: bloqueadores", derivado de uma auditoria de 3 agentes (funcionalidade vs. spec, bugs de backend, segurança/compliance) concluída em 2026-07-11.

## Core Value

O usuário prospecta e aborda negócios europeus **sem risco legal** — o compliance ("compliant by design") tem que ser garantido por código, não por promessa, e a contagem de plano/billing tem que ser íntegra.

## Requirements

### Validated

<!-- Capacidades já existentes no código, confirmadas pela auditoria. -->

- ✓ Descoberta de leads via Google Places Text Search com paginação, clamp 1–50 e gate de mercados opt-out (GB/NL/IE/SE/NO) — existing (`convex/places.ts`)
- ✓ Digital Presence Score fiel à spec (pesos 55/50/20/20/15/15; tiers ≥70/40–69/<40) com enriquecimento HTTPS + PageSpeed — existing (`convex/lib/domain.ts`, `convex/scoring.ts`)
- ✓ Guardrail "armadilha do autônomo" (`isEmailable`: bloqueia pessoa física e sole trader; libera incorporated/caixa de função) aplicado server-side no draft e no send, com 14 testes — existing (`convex/lib/domain.ts:50-95`, `tests/domain.test.ts`)
- ✓ CRM Kanban (Base→Abordado→Agendado→Follow Up→Convertido) com drag-and-drop e detalhe em 5 abas — existing (`src/app/(app)/crm/`)
- ✓ Preview de site em link único rastreado (`/p/[token]`) e publicação por slug (`/site/[slug]`) — existing (`convex/previews.ts`)
- ✓ Outreach redigido por IA (Anthropic) com idioma por mercado, envio via Resend — existing (`convex/outreach.ts`, `convex/lib/outreachAi.ts`)
- ✓ Billing Stripe: checkout, portal, webhook com assinatura HMAC verificada, quotas de leads/sites por plano — existing (`convex/billing.ts`, `convex/http.ts`, `convex/model/workspace.ts`)
- ✓ Multi-tenancy correto (`requireOrgId` + ownership em toda query/mutation autenticada; sem IDOR) — existing (auditoria)
- ✓ Dashboard reativo (funil, conversões, atividade) e modo demo com seed — existing (`src/app/(app)/dashboard/`, `convex/demo.ts`)

### Active

<!-- Fase 1 — bloqueadores de produção. IDs detalhados em REQUIREMENTS.md. -->

- [ ] **BILL-01** — Quota não pode ser negativada: piso no count do `foursquare.search` + guarda `count <= 0` em `reserveUsage`
- [ ] **BILL-02** — Quota de leads reconciliada com o nº de leads realmente inseridos (estorno de excedente/falha)
- [ ] **BILL-03** — Plano derivado do `price_id` da subscription no webhook Stripe (não de `metadata.plan` obsoleta)
- [ ] **TRCK-01** — Abertura de preview pelo próprio vendedor não conta como abertura do prospect nem move o lead de estágio
- [ ] **TRCK-02** — Usuário pode marcar outreach como "respondeu" manualmente (status `replied` real na outbox)
- [ ] **COMP-01** — Tabela de supressão no schema; `draft` e `send` bloqueiam endereços suprimidos
- [ ] **COMP-02** — Endpoint HTTP público de unsubscribe que grava na supressão
- [ ] **COMP-03** — Rodapé de opt-out injetado por código em todo email + header `List-Unsubscribe` no payload Resend
- [ ] **COMP-04** — WhatsApp follow-up só com opt-in registrado (evento com origem/timestamp), não por estágio de Kanban
- [ ] **SEC-01** — Modo demo (`NEXT_PUBLIC_DEMO`/`DEMO_MODE`) inerte em produção (guarda de ambiente)
- [ ] **OUTR-01** — Edições do usuário no composer persistidas antes do envio (o que se vê é o que sai)
- [ ] **L10N-01** — Template de preview localizado por idioma do mercado (EN para GB/IE, NL, SV, NO); sem copy PT hardcoded

### Out of Scope

<!-- Decisões explícitas tomadas pela usuária nesta sessão. -->

- Webhook de inbound/bounce do Resend — Fase 2; nesta fase o "respondeu" é manual (decisão da usuária)
- Geração de preview por IA / múltiplos templates — Fase 3; nesta fase apenas localiza o template existente (decisão da usuária)
- Paginação das queries `.collect()`, quota em `leads.create`, purge 30 dias (ToS Google Places), gating de features por plano, rate-limit em `recordOpen`, endurecimento extra do webhook Stripe (timestamp/constant-time), token vazado em `getBySlug` — Fase 2 (antes de escalar, não bloqueia lançamento)
- Domínio próprio white-label (plano Agency) e destino do Foursquare (plugar ou remover) — Fase 3

## Context

Auditoria de 2026-07-11 (3 agentes) encontrou, com verificação manual dos críticos no código:

- **Bug crítico de billing**: `convex/foursquare.ts:44` usa `Math.min(args.max ?? 20, 50)` sem piso; `reserveUsage` (`convex/model/workspace.ts:41-58`) não rejeita count ≤ 0 → `max` negativo deixa `leadsUsed` negativo = quota infinita.
- **Sinal de compra corrompido**: `recordOpen` (`convex/previews.ts:115-141`) é disparado pelo `PreviewTracker` quando o próprio vendedor abre `/p/[token]` pelo CRM → lead pula `base→approached` e a outbox mostra "abriu" falso.
- **Quota cobrada pelo pedido**: reserva acontece antes do fetch externo pelo `max` solicitado, sem estorno (`convex/places.ts:44-53`).
- **Stripe**: webhook lê `obj.metadata?.plan`, gravada só no checkout inicial; upgrade/downgrade pelo Billing Portal não atualiza o plano (`convex/http.ts:41-53`, `convex/workspaces.ts:54-74`). Mapear por price_id usando `STRIPE_PRICE_PRO`/`STRIPE_PRICE_AGENCY`.
- **Compliance não garantido por código**: opt-out é instrução de prompt (`convex/lib/outreachAi.ts:49`); fallback em `outreachAi.ts:88` pode sair sem opt-out; não há tabela de supressão, endpoint de unsubscribe, nem `List-Unsubscribe`; gate do WhatsApp é estágio de Kanban (`convex/whatsapp.ts:17`) controlado pelo próprio usuário.
- **Kill-switch de auth**: `NEXT_PUBLIC_DEMO=1` (`src/proxy.ts:27`) e `DEMO_MODE=1` (`convex/model/tenant.ts:12`, `convex/demo.ts:133`) desligam toda a auth sem guarda de `NODE_ENV`.
- **Composer**: `send` relê `row.subject/row.body` do banco (`convex/outreach.ts:165-166`); edições locais do usuário no `src/components/outreach-composer.tsx` se perdem.
- **Preview em PT**: copy hardcoded em português em `src/components/preview-site.tsx` (mercados são GB/IE/NL/SE/NO). Idiomas por mercado já existem mapeados em `convex/lib/outreachAi.ts:5-11` (`LANG`).
- Status `replied`/`bounced` existem no schema (`convex/schema.ts:136-137`) e na UI da outbox, mas nada os grava fora do seed demo.

## Constraints

- **Tech stack**: manter Next.js 16 (App Router) + Convex + Clerk + Resend + Stripe — sem dependência nova sem confirmação da usuária
- **Next.js 16**: breaking changes vs. conhecimento de treino — ler `node_modules/next/dist/docs/` antes de escrever código Next (regra do `AGENTS.md` do repo)
- **TypeScript**: strict; `any` só com justificativa; validators Convex nas bordas
- **Segurança**: nunca logar PII (emails/telefones de prospects); não tocar em `.env*`
- **Verificação**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` obrigatório antes de declarar qualquer coisa pronta
- **Git**: conventional commits atômicos

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| "Respondeu" manual nesta fase; webhook inbound do Resend na Fase 2 | Destrava o lançamento sem infra nova; aprovado pela usuária | — Pending |
| Localizar template de preview existente; geração por IA fica pra Fase 3 | Menor esforço para destravar mercados EN/NL/SE/NO; aprovado pela usuária | — Pending |
| Opt-out injetado por código no send (não confiar no prompt da IA) | Fallback do parse pode omitir opt-out; compliance não pode depender do LLM | — Pending |
| Plano Stripe derivado de price_id (mapa via env `STRIPE_PRICE_*`) | `metadata.plan` fica obsoleta após mudanças no Billing Portal | — Pending |
| Supressão como tabela Convex própria checada em draft/send | Fonte de verdade local, independente do provedor de email | — Pending |

---
*Last updated: 2026-07-11 after initialization*
