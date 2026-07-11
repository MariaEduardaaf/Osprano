# Phase 1: Integridade de Billing e Segurança do Modo Demo - Context

**Gathered:** 2026-07-11 (modo auto — decisões = opções recomendadas, logadas na sessão)
**Status:** Ready for planning

<domain>
## Phase Boundary

Garantir que a contagem de quota do plano é íntegra (não negativável, cobra o que entrega), que o plano do workspace reflete fielmente a subscription do Stripe (inclusive mudanças feitas pelo Billing Portal), e que o modo demo é inerte em produção. Requisitos: BILL-01, BILL-02, BILL-03, SEC-01. Nada de compliance de email/WhatsApp (Fase 2) nem tracking/UI (Fase 3) aqui.

</domain>

<decisions>
## Implementation Decisions

### BILL-01 — Clamp e guarda de count
- `convex/foursquare.ts` passa a clampar igual ao `places.ts`: `Math.min(Math.max(Math.round(args.max ?? 20), 1), 50)` — calcular UMA vez em variável (`want`) e usar tanto no `reserve` quanto no `limit` da URL.
- `reserveUsage` (`convex/model/workspace.ts`) ganha defesa em profundidade: lança erro se `count` não for inteiro finito ≥ 1 (`!Number.isInteger(count) || count < 1`).

### BILL-02 — Reconciliação de quota
- Manter a reserva ANTES do fetch externo (preserva o gating: não gastar quota do Google/FSQ quando o plano estourou).
- Ao final do action, estornar a diferença `want - inserted` via mutation interna de estorno (ex.: `internal.workspaces.refund` com guarda pra nunca deixar `leadsUsed` negativo — clamp em 0).
- Fetch externo falhou (exceção após a reserva): estornar TUDO (`want`) antes de re-lançar o erro — padrão try/catch no action. Convex actions não são transacionais; aceita-se o caso raro de crash duro sem estorno.
- "O que conta": o nº de leads efetivamente processados/inseridos (`inserted`) — inclui duplicatas atualizadas via patch (dedup mais fino é SCAL, Fase 2 do produto, fora deste milestone).
- Aplicar o mesmo padrão em `places.ts` E `foursquare.ts` (extrair helper se ficar repetitivo — a critério do executor).

### BILL-03 — Plano derivado de price_id
- Em `customer.subscription.updated`/`deleted`: derivar o plano de `event.data.object.items.data[0].price.id`, mapeando contra `STRIPE_PRICE_PRO`/`STRIPE_PRICE_AGENCY` (envs já existentes, usadas em `convex/billing.ts:7-9`). NÃO usar `metadata.plan` nesses eventos.
- `checkout.session.completed`: manter `metadata.plan` (a session não carrega `items` no objeto do evento e a metadata acabou de ser gravada pelo nosso checkout — é confiável nesse instante).
- Price desconhecido (não mapeia pra nenhuma env): manter o plano atual do workspace (não rebaixar), mas ainda atualizar `subscriptionStatus`/`subscriptionId`. Falha segura, sem downgrade acidental.
- `deleted`/`unpaid` continuam rebaixando pra `free` (comportamento atual de `applySubscription` preservado).
- Sem re-fetch à API do Stripe no webhook (mantém o handler simples e rápido); tolerância de timestamp/constant-time é BILL-05 (v2, fora desta fase).

### SEC-01 — Guarda de ambiente do demo
- Guarda `process.env.NODE_ENV !== "production"` nos TRÊS pontos:
  1. `src/proxy.ts:27` — só usar `demoProxy` quando `NEXT_PUBLIC_DEMO === "1"` E não-produção (o proxy roda server-side; NODE_ENV é "production" em `next build`/`start`).
  2. `convex/model/tenant.ts:12` — fallback `"demo"` só quando `DEMO_MODE === "1"` E não-produção (Convex define NODE_ENV="production" no deployment de produção e "development" no dev).
  3. `convex/demo.ts:133` — `seed` só roda com `DEMO_MODE === "1"` E não-produção.
- Centralizar a checagem backend num helper (ex.: `isDemoEnabled()` em `convex/model/tenant.ts`) usado por tenant e demo.seed — uma fonte de verdade.
- Consequência aceita: demo público hospedado em produção deixa de funcionar; se a usuária quiser demo público no futuro, é um deployment dev/preview separado (ver Deferred).

### Testabilidade
- Extrair a lógica pura clampável pra `convex/lib/domain.ts` (ex.: `clampDiscoveryCount(max?: number): number`) e usar em places/foursquare; adicionar casos em `tests/domain.test.ts` (negativo, zero, NaN, decimal, >50, undefined).
- Guardas de `reserveUsage`/refund dependem de `ctx` — verificação via typecheck + revisão; sem framework de teste Convex novo (não instalar dependência).

### Claude's Discretion
- Nome exato da mutation de estorno e assinatura (refund vs reconcile).
- Mensagens de erro (seguir o tom pt-BR das existentes).
- Extrair ou não helper compartilhado de discovery entre places/foursquare.

</decisions>

<canonical_refs>
## Canonical References

### Projeto e auditoria
- `.planning/PROJECT.md` §Context — achados da auditoria com arquivo:linha exatos desta fase
- `.planning/REQUIREMENTS.md` §Billing & Quota, §Segurança — texto normativo de BILL-01/02/03 e SEC-01
- `docs/SOBRE.md` §9 — planos e preços (Free €0 / Pro €49 / Agency €149)

### Convenções do repo
- `AGENTS.md` — OBRIGATÓRIO ler `node_modules/next/dist/docs/` antes de escrever código Next (Next 16 tem breaking changes)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `convex/places.ts:46` já tem o clamp correto (`Math.min(Math.max(Math.round(args.max ?? 20), 1), 50)`) — é o padrão a replicar/extrair
- `convex/billing.ts:7-9` (`priceFor`) já mapeia plan→price via `STRIPE_PRICE_PRO`/`STRIPE_PRICE_AGENCY` — o inverso (price→plan) vive bem em `convex/lib/stripe.ts` ou `workspaces.ts`
- `convex/workspaces.ts:27-36` (`reserve` internalMutation) — espelhar para o estorno (`refund`)
- `tests/domain.test.ts` — padrão de teste puro com node:test já estabelecido

### Established Patterns
- Actions de discovery: `requireOrgId` → gate de mercado → env check → reserve → fetch → insertDiscovered loop → return `{found, inserted}` (idêntico em places/foursquare)
- Mutations internas com validators `v.*`; erros em pt-BR com dica de ação ("Faça upgrade em Planos.")
- `applySubscription` acha workspace via índice `by_customer`; preservar essa busca

### Integration Points
- `convex/http.ts:31` — o parse do evento Stripe precisa passar a ler `items.data[0].price.id` (ampliar a interface `StripeObj`)
- `src/app/(app)/leads/page.tsx` chama `api.places.search` — assinatura pública não muda (só comportamento interno), zero mudança de UI nesta fase
- `README.md:92-108` documenta o modo demo — atualizar a doc se o comportamento mudar (dev-only)

</code_context>

<specifics>
## Specific Ideas

- Estorno nunca pode deixar contador negativo (clamp em 0) — o bug que estamos corrigindo é exatamente contador negativo.
- O handler do webhook deve continuar retornando 200 rapidamente; nada de chamadas externas dentro dele.

</specifics>

<deferred>
## Deferred Ideas

- Demo público hospedado (produção) — se desejado no futuro, usar deployment Convex dev/preview separado com Clerk de teste; não reabrir o kill-switch
- Dedup de quota para leads duplicados (patch) — junto de SCAL-01/02 no próximo milestone
- Tolerância de timestamp + comparação constant-time no webhook (BILL-05, v2)

</deferred>

---

*Phase: 01-integridade-de-billing-e-seguran-a-do-modo-demo*
*Context gathered: 2026-07-11*
