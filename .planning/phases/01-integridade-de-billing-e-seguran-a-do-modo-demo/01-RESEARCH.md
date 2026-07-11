# Phase 1: Integridade de Billing e Segurança do Modo Demo - Research

**Researched:** 2026-07-11
**Domain:** Convex actions/mutations (billing quota integrity), Stripe webhooks, Next.js 16 proxy/env guards
**Confidence:** HIGH (código lido diretamente; achados de runtime confirmados na própria instalação do pacote `convex@1.42.1` em `node_modules`; Stripe confirmado via docs oficiais)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**BILL-01 — Clamp e guarda de count**
- `convex/foursquare.ts` passa a clampar igual ao `places.ts`: `Math.min(Math.max(Math.round(args.max ?? 20), 1), 50)` — calcular UMA vez em variável (`want`) e usar tanto no `reserve` quanto no `limit` da URL.
- `reserveUsage` (`convex/model/workspace.ts`) ganha defesa em profundidade: lança erro se `count` não for inteiro finito ≥ 1 (`!Number.isInteger(count) || count < 1`).

**BILL-02 — Reconciliação de quota**
- Manter a reserva ANTES do fetch externo (preserva o gating: não gastar quota do Google/FSQ quando o plano estourou).
- Ao final do action, estornar a diferença `want - inserted` via mutation interna de estorno (ex.: `internal.workspaces.refund` com guarda pra nunca deixar `leadsUsed` negativo — clamp em 0).
- Fetch externo falhou (exceção após a reserva): estornar TUDO (`want`) antes de re-lançar o erro — padrão try/catch no action. Convex actions não são transacionais; aceita-se o caso raro de crash duro sem estorno.
- "O que conta": o nº de leads efetivamente processados/inseridos (`inserted`) — inclui duplicatas atualizadas via patch (dedup mais fino é SCAL, Fase 2 do produto, fora deste milestone).
- Aplicar o mesmo padrão em `places.ts` E `foursquare.ts` (extrair helper se ficar repetitivo — a critério do executor).

**BILL-03 — Plano derivado de price_id**
- Em `customer.subscription.updated`/`deleted`: derivar o plano de `event.data.object.items.data[0].price.id`, mapeando contra `STRIPE_PRICE_PRO`/`STRIPE_PRICE_AGENCY` (envs já existentes, usadas em `convex/billing.ts:7-9`). NÃO usar `metadata.plan` nesses eventos.
- `checkout.session.completed`: manter `metadata.plan` (a session não carrega `items` no objeto do evento e a metadata acabou de ser gravada pelo nosso checkout — é confiável nesse instante).
- Price desconhecido (não mapeia pra nenhuma env): manter o plano atual do workspace (não rebaixar), mas ainda atualizar `subscriptionStatus`/`subscriptionId`. Falha segura, sem downgrade acidental.
- `deleted`/`unpaid` continuam rebaixando pra `free` (comportamento atual de `applySubscription` preservado).
- Sem re-fetch à API do Stripe no webhook (mantém o handler simples e rápido); tolerância de timestamp/constant-time é BILL-05 (v2, fora desta fase).

**SEC-01 — Guarda de ambiente do demo**
- Guarda `process.env.NODE_ENV !== "production"` nos TRÊS pontos:
  1. `src/proxy.ts:27` — só usar `demoProxy` quando `NEXT_PUBLIC_DEMO === "1"` E não-produção.
  2. `convex/model/tenant.ts:12` — fallback `"demo"` só quando `DEMO_MODE === "1"` E não-produção.
  3. `convex/demo.ts:133` — `seed` só roda com `DEMO_MODE === "1"` E não-produção.
- Centralizar a checagem backend num helper (ex.: `isDemoEnabled()` em `convex/model/tenant.ts`) usado por tenant e demo.seed — uma fonte de verdade.
- Consequência aceita: demo público hospedado em produção deixa de funcionar; se a usuária quiser demo público no futuro, é um deployment dev/preview separado (ver Deferred).

**Testabilidade**
- Extrair a lógica pura clampável pra `convex/lib/domain.ts` (ex.: `clampDiscoveryCount(max?: number): number`) e usar em places/foursquare; adicionar casos em `tests/domain.test.ts` (negativo, zero, NaN, decimal, >50, undefined).
- Guardas de `reserveUsage`/refund dependem de `ctx` — verificação via typecheck + revisão; sem framework de teste Convex novo (não instalar dependência).

> **ATENÇÃO — achado de pesquisa que impacta a decisão SEC-01 acima:** verificado que `process.env.NODE_ENV` dentro de código Convex é SEMPRE `"production"`, em QUALQUER deployment (local dev, cloud dev, cloud prod), por causa de como o bundler do Convex funciona — ver `## Common Pitfalls > Pitfall 1` abaixo. O guard `NODE_ENV !== "production"` funciona perfeitamente em `src/proxy.ts:27` (Next.js) mas é código morto se aplicado literalmente em `convex/model/tenant.ts:12` e `convex/demo.ts:133` — nunca seria `true`, o que desligaria o demo em TODO lugar (inclusive dev local), não só em produção. Este documento propõe um mecanismo alternativo para os dois pontos Convex-side (ver Pitfall 1 e Code Examples) que preserva a intenção da decisão (defesa em profundidade, helper único `isDemoEnabled()`) sem depender de `NODE_ENV`.

### Claude's Discretion
- Nome exato da mutation de estorno e assinatura (refund vs reconcile).
- Mensagens de erro (seguir o tom pt-BR das existentes).
- Extrair ou não helper compartilhado de discovery entre places/foursquare.

### Deferred Ideas (OUT OF SCOPE)
- Demo público hospedado (produção) — se desejado no futuro, usar deployment Convex dev/preview separado com Clerk de teste; não reabrir o kill-switch
- Dedup de quota para leads duplicados (patch) — junto de SCAL-01/02 no próximo milestone
- Tolerância de timestamp + comparação constant-time no webhook (BILL-05, v2)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| BILL-01 | `foursquare.search` clampa count com piso 1 (como `places.ts`); `reserveUsage` rejeita `count <= 0` | Estado atual exato de `convex/foursquare.ts:46` e `convex/model/workspace.ts:41-58` documentado abaixo; padrão de clamp já existe em `places.ts:46` para replicar; proposta de `clampDiscoveryCount` pura + guarda `Number.isInteger` em `reserveUsage` |
| BILL-02 | Quota reconciliada com leads realmente inseridos; estorno de excedente/falha total | Confirmado: Convex actions não são transacionais (fonte oficial docs.convex.dev); `insertDiscovered` já faz upsert (patch conta como "inserted"); padrão try/catch + refund proposto em Code Examples, com correção sobre refund parcial vs total (ver Pitfall 3) |
| BILL-03 | Webhook deriva plano do `price_id` da subscription, não de `metadata.plan` | Shape do payload Stripe confirmado via docs oficiais (`items.data[0].price.id` sempre presente, sem expand); confirmado que `applySubscription` (`convex/workspaces.ts:54-74`) já trata "plan undefined → mantém atual" — só `convex/http.ts` precisa mudar |
| SEC-01 | Modo demo inerte em produção nos 3 pontos (proxy, tenant, demo.seed) | Next.js: `NODE_ENV` funciona corretamente em `proxy.ts` (confirmado via `node_modules/next/dist/docs`). Convex: `NODE_ENV` é SEMPRE `"production"` no bundle (achado crítico, ver Pitfall 1) — proposto `CONVEX_ENV` como mecanismo alternativo para os dois pontos backend |

</phase_requirements>

## Summary

Esta fase toca principalmente `convex/*.ts` (actions/mutations de discovery e billing) e `src/proxy.ts`. O código atual foi lido integralmente e confere com a descrição do `PROJECT.md`/`REQUIREMENTS.md`: `foursquare.ts:46` usa `Math.min(args.max ?? 20, 50)` sem piso (permite `max` negativo/zero → `reserveUsage` soma um `count` negativo/zero a `leadsUsed`, sem guarda); `places.ts:46` já tem o clamp correto; a reserva de quota em ambos os actions acontece pelo `want` solicitado, sem estorno do excedente; o webhook Stripe (`convex/http.ts`) só lê `metadata.plan`, que não é atualizada em upgrades/downgrades feitos pelo Billing Portal; e os três pontos do "kill-switch" de demo (`src/proxy.ts:27`, `convex/model/tenant.ts:12`, `convex/demo.ts:133`) checam apenas a env de ativação, sem guarda de ambiente.

O achado mais importante desta pesquisa, que **contradiz uma premissa técnica da decisão travada em CONTEXT.md**, é sobre `NODE_ENV` dentro do Convex: o bundler do Convex (esbuild, usado tanto por `npx convex dev` quanto por `npx convex deploy`, para deployments local/dev/prod igualmente) substitui `process.env.NODE_ENV` pelo literal `"production"` em TODO o código de função Convex, sempre — confirmado lendo o próprio pacote instalado (`node_modules/convex/dist/cjs/bundler/debugBundle.js:100`, chamado por `bundler/index.js:86`) e cruzado com o CHANGELOG oficial (`convex@1.25.0`: "Set `process.env.NODE_ENV = "production"` during Convex function bundling"). Isso significa que um guard `process.env.NODE_ENV !== "production"` dentro de `convex/model/tenant.ts` ou `convex/demo.ts` nunca seria verdadeiro — em nenhum deployment, incluindo o dev local que a usuária usa hoje — quebrando o modo demo por completo em vez de restringi-lo a produção. Este documento detalha o achado (Pitfall 1) e propõe um mecanismo alternativo (env dedicada `CONVEX_ENV`, não inline-ável pelo bundler) que preserva a arquitetura pedida (helper único `isDemoEnabled()`, defesa em profundidade nos 3 pontos) sem essa armadilha. O guard em `src/proxy.ts` (Next.js), por outro lado, funciona exatamente como especificado — confirmado nos docs locais de Next 16.

Nos pontos Stripe, o payload de `customer.subscription.updated`/`.deleted` inclui `items.data[0].price.id` como campo padrão do objeto Subscription (não-expandable, sempre presente), validando a decisão BILL-03 tecnicamente; e a mutation `applySubscription` já trata corretamente "plano desconhecido → mantém o atual" (o `?? ws.plan` já existe), então a mudança real fica concentrada em `convex/http.ts` (mais um pequeno helper puro de mapeamento price→plan).

**Primary recommendation:** Implementar BILL-01/02/03 exatamente como especificado em CONTEXT.md (o código-base já segue os padrões certos — só falta replicar/consertar). Para SEC-01, manter a arquitetura de 3 guardas + helper único, mas trocar o mecanismo Convex-side de `NODE_ENV` (não funciona) para uma env dedicada por deployment (`CONVEX_ENV`, documentada e setada manualmente uma vez no deployment de produção real — ainda não provisionado, ver Open Questions).

## Standard Stack

Nenhuma dependência nova é necessária ou recomendada nesta fase — confirmado o constraint do repo ("sem dependência nova sem confirmação"). Toda a implementação usa Convex (`convex@1.42.1`), Next.js (`16.2.10`), TypeScript strict e `node:test` já instalados.

| Library | Version (installed) | Purpose | Notes |
|---------|---------|---------|-------|
| convex | 1.42.1 | Backend (actions/mutations/http router) | Versão confirmada via `node_modules/convex/package.json` |
| next | 16.2.10 | App Router + Proxy | Versão confirmada via `node_modules/next/package.json` |
| node:test | builtin (Node v22.15.0) | Testes puros (`tests/*.test.ts` via `--experimental-strip-types`) | Já em uso, `pnpm test` = 14/14 passando |

**Version verification:**
```bash
$ cat node_modules/convex/package.json | grep version   # "1.42.1"
$ cat node_modules/next/package.json | grep version      # "16.2.10"
$ node --version                                          # v22.15.0
```

## Architecture Patterns

### Estado atual exato dos arquivos-alvo (lido linha a linha)

**`convex/foursquare.ts`** (bug BILL-01/02):
```ts
// linha 46 — SEM piso, `max` negativo/zero passa direto
await ctx.runMutation(internal.workspaces.reserve, {
  orgId,
  kind: "leads",
  count: Math.min(args.max ?? 20, 50),   // <- Math.min(neg, 50) = neg
});
// linha 52 — mesmo cálculo duplicado pro `limit` da URL
limit: String(Math.min(args.max ?? 20, 50)),
// linha 65-85 — loop de insert, `inserted` incrementado sempre; SEM refund no fim
```

**`convex/places.ts`** (referência correta para clamp, ainda sem refund):
```ts
// linha 46 — clamp já certo (piso 1, teto 50, Math.round, default 20)
const want = Math.min(Math.max(Math.round(args.max ?? 20), 1), 50);
// linha 49-53 — reserva pelo `want` (pedido), não pelo `inserted` (entregue)
await ctx.runMutation(internal.workspaces.reserve, { orgId, kind: "leads", count: want });
// linha 98-119 — loop de insert; retorna `{found, inserted}` mas NUNCA estorna a diferença
```

**`convex/model/workspace.ts`** (`reserveUsage`, sem guarda de `count`):
```ts
// linha 41-58 — soma `count` direto, sem checar `count >= 1` nem `Number.isInteger`
export async function reserveUsage(ctx, orgId, kind, count) {
  const ws = await ensureFresh(ctx, orgId);
  const used = kind === "leads" ? ws.leadsUsed : ws.sitesUsed;
  const limit = planLimit(ws.plan, kind);
  if (used + count > limit) throw new Error(`Limite do plano ${ws.plan} atingido...`);
  await ctx.db.patch(ws._id, kind === "leads" ? { leadsUsed: used + count } : { sitesUsed: used + count });
}
```
Não existe hoje nenhuma função `refundUsage`/`refund` — precisa ser criada do zero, espelhando `reserveUsage` mas subtraindo com clamp em 0.

**`convex/workspaces.ts`** (mutations internas existentes):
```ts
// linha 27-36 — reserve (internalMutation) já existe, espelhar pro refund
export const reserve = internalMutation({
  args: { orgId: v.string(), kind: v.union(v.literal("leads"), v.literal("sites")), count: v.number() },
  handler: async (ctx, args) => { await reserveUsage(ctx, args.orgId, args.kind, args.count); },
});
// linha 54-74 — applySubscription JÁ trata "plan undefined → mantém atual":
plan: canceled ? "free" : (args.plan ?? ws.plan),   // <- não precisa mudar para BILL-03!
```

**`convex/http.ts`** (webhook, bug BILL-03):
```ts
interface StripeObj {
  customer?: string;
  subscription?: string;
  id?: string;
  status?: string;
  metadata?: { plan?: "pro" | "agency" };   // <- só isso hoje; falta `items`
}
// linha 41-53 — subscription.updated/deleted usa SEMPRE obj.metadata?.plan
// (metadata da subscription só é setada no checkout inicial — nunca atualizada
// por upgrade/downgrade feito no Billing Portal, que troca o `price` da subscription
// sem tocar a metadata)
```

**`convex/lib/stripe.ts`**: só tem `stripePost` (REST client) e `verifyStripeSignature` (HMAC via Web Crypto). Sem SDK oficial do Stripe (`stripe` npm) — cliente mínimo escrito à mão, roda em Convex actions sem `"use node"`. Bom lugar para adicionar o novo helper puro `planForPrice`.

**`convex/billing.ts`**: `priceFor(plan)` (linha 7-9) já mapeia plan→price via `STRIPE_PRICE_PRO`/`STRIPE_PRICE_AGENCY`. O inverso (price→plan) deve ler as MESMAS env vars, então convém ficar perto — mas como `billing.ts` só exporta `action`s públicas (`createCheckout`, `portal`), e `http.ts` (httpAction) precisaria importar dele, é mais limpo colocar o helper em `convex/lib/stripe.ts` (importado por ambos sem acoplar rotas).

**`convex/model/tenant.ts`** (bug SEC-01, ponto 1 do backend):
```ts
export async function requireOrgId(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) return identity.subject;
  if (process.env.DEMO_MODE === "1") return "demo";   // <- sem guarda de ambiente
  throw new Error("Não autenticado");
}
```

**`convex/demo.ts`** (bug SEC-01, ponto 2 do backend):
```ts
// linha 133
if (process.env.DEMO_MODE !== "1") throw new Error("DEMO_MODE desligado");   // <- sem guarda de ambiente
```

**`src/proxy.ts`** (bug SEC-01, ponto 3, frontend):
```ts
// linha 24-27
function demoProxy() {}
export default process.env.NEXT_PUBLIC_DEMO === "1" ? demoProxy : clerkProxy;   // <- sem guarda de ambiente
```
Roda em runtime Node.js (Next 16 default do Proxy — confirmado, ver Pattern 3), avaliado uma vez no carregamento do módulo (top-level), não por request — seguro, pois `NODE_ENV` é estável durante todo o processo do servidor.

**`convex/lib/domain.ts`**: nenhuma função de clamp de discovery existe hoje (`clampDiscoveryCount` precisa ser criada). Já tem o padrão de export puro sem imports de Convex (usado tanto no backend quanto potencialmente no frontend via `@convex/*`).

**`tests/domain.test.ts`**: 14 testes com `node:test` + `node --experimental-strip-types`, importa `../convex/lib/domain.ts` direto com extensão `.ts` (ESM). Roda hoje 14/14 verde (`pnpm test`). Padrão a seguir para os novos casos.

### Pattern 1: Convex actions NÃO são transacionais — reserve→try/catch→refund

**Fonte:** docs.convex.dev/functions/actions + docs.convex.dev/database/advanced/occ (confirmado via busca, consistente com o próprio código do projeto que já usa esse padrão em `insertDiscovered` sendo chamado várias vezes dentro de um loop no action).

- **Mutations** são transacionais (todas as leituras/escritas dentro de uma mutation veem um snapshot consistente e aplicam atomicamente — OCC).
- **Actions** não têm essa garantia: podem chamar `fetch()`, múltiplas mutations em sequência, e um crash no meio deixa mutations já aplicadas persistidas (sem rollback automático). É exatamente por isso que BILL-02 precisa de um refund EXPLÍCITO (mutation separada), não pode confiar em "desfazer" o reserve.
- Padrão correto (o que CONTEXT.md já especifica, com uma correção importante — ver Pitfall 3):

```ts
// convex/places.ts / convex/foursquare.ts — padrão proposto
const want = clampDiscoveryCount(args.max);
await ctx.runMutation(internal.workspaces.reserve, { orgId, kind: "leads", count: want });

let inserted = 0;
try {
  // ... fetch externo + loop de insertDiscovered, incrementando `inserted` a cada item
} catch (err) {
  // refund do que NÃO foi confirmado (want - inserted), não de `want` cego —
  // cobre tanto "fetch falhou antes de inserir nada" (inserted=0) quanto
  // "loop falhou no meio depois de inserir alguns" (inserted>0)
  const toRefund = want - inserted;
  if (toRefund > 0) {
    await ctx.runMutation(internal.workspaces.refund, { orgId, kind: "leads", count: toRefund });
  }
  throw err;
}

const leftover = want - inserted;
if (leftover > 0) {
  await ctx.runMutation(internal.workspaces.refund, { orgId, kind: "leads", count: leftover });
}
return { found, inserted };
```

### Pattern 2: `refundUsage` espelhando `reserveUsage`, com clamp em 0

```ts
// convex/model/workspace.ts — nova função, ao lado de reserveUsage
export async function refundUsage(
  ctx: MutationCtx,
  orgId: string,
  kind: "leads" | "sites",
  count: number,
): Promise<void> {
  if (count <= 0) return; // nada a estornar
  const ws = await ensureFresh(ctx, orgId);
  const used = kind === "leads" ? ws.leadsUsed : ws.sitesUsed;
  const next = Math.max(0, used - count); // NUNCA negativo — é o bug original, ao contrário
  await ctx.db.patch(ws._id, kind === "leads" ? { leadsUsed: next } : { sitesUsed: next });
}
```
```ts
// convex/workspaces.ts — internalMutation espelhando `reserve`
export const refund = internalMutation({
  args: { orgId: v.string(), kind: v.union(v.literal("leads"), v.literal("sites")), count: v.number() },
  handler: async (ctx, args) => { await refundUsage(ctx, args.orgId, args.kind, args.count); },
});
```

### Pattern 3: Next.js 16 Proxy — runtime e `NODE_ENV`

**Fonte:** `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` (local, lido integralmente).

- "Middleware" foi renomeado para "Proxy" no Next 16 (`src/proxy.ts` já segue a convenção nova — comentário no próprio arquivo já documenta isso corretamente).
- **Runtime:** "Proxy defaults to using the Node.js runtime. The `runtime` config option is not available in Proxy files." — ou seja, `proxy.ts` roda em Node.js real (não Edge), então `process.env.NODE_ENV` é o valor genuíno do processo Node do servidor Next.
- **`NODE_ENV`:** confirmado em `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`: *"If the environment variable NODE_ENV is unassigned, Next.js automatically assigns `development` when running the `next dev` command, or `production` for all other commands."* — ou seja, `next build && next start` roda com `NODE_ENV=production` real, `next dev` com `development`. O guard `process.env.NODE_ENV !== "production"` em `src/proxy.ts` funciona exatamente como especificado em CONTEXT.md.
- O `export default process.env.NEXT_PUBLIC_DEMO === "1" ? demoProxy : clerkProxy` é avaliado uma única vez, na carga do módulo (não por request) — seguro adicionar `&& process.env.NODE_ENV !== "production"` na mesma expressão, já que o processo do servidor mantém o mesmo `NODE_ENV` do início ao fim.

### Pattern 4: Stripe — shape do webhook (BILL-03)

**Fonte:** docs.stripe.com/api/subscriptions/object, docs.stripe.com/api/events/types, docs.stripe.com/api/subscription_items/object (fetch direto, confirmado).

- `customer.subscription.updated` e `customer.subscription.deleted`: `data.object` é o objeto `Subscription` completo, incluindo `items` (lista `SubscriptionItem`, campo padrão — **não** marcado como "Expandable" na doc oficial, ou seja, vem sempre presente sem precisar de `expand`).
- Dentro de cada `SubscriptionItem`, o campo `price` é o objeto `Price` completo por padrão (não é uma string de ID que precisaria expand — só sub-campos do Price como `product` são expandable). Logo `event.data.object.items.data[0].price.id` é acessível diretamente do payload cru do webhook, sem chamada extra à API Stripe — bate com a decisão de "sem re-fetch à API do Stripe no webhook".
- `status` do Subscription: enum confirmado — `incomplete | incomplete_expired | trialing | active | past_due | canceled | unpaid | paused`. O código atual já trata `canceled`/`unpaid` como downgrade pra free; os demais mantêm o plano.
- `checkout.session.completed`: `data.object` é o `Checkout Session`, e **`line_items` NÃO vem incluído por padrão** — precisaria de uma chamada separada com `expand: ["line_items"]` para obter. Confirma a decisão de manter `metadata.plan` nesse evento específico (não dá pra usar `items.price.id` aqui sem um round-trip extra à API, que a decisão explicitamente evita).

```ts
// convex/http.ts — extensão de tipo necessária
interface StripeObj {
  customer?: string;
  subscription?: string;
  id?: string;
  status?: string;
  metadata?: { plan?: "pro" | "agency" };
  items?: { data?: { price?: { id?: string } }[] }; // presente em subscription.updated/deleted
}
```

```ts
// convex/lib/stripe.ts — helper puro proposto (price→plan, inverso de billing.ts:priceFor)
export function planForPrice(priceId: string | undefined): "pro" | "agency" | undefined {
  if (!priceId) return undefined;
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_AGENCY) return "agency";
  return undefined; // price desconhecido → falha segura, applySubscription mantém o plano atual
}
```

`applySubscription` (`convex/workspaces.ts:54-74`) **já** faz `plan: canceled ? "free" : (args.plan ?? ws.plan)` — ou seja, passar `plan: undefined` quando `planForPrice` não mapear já produz exatamente o comportamento "falha segura, sem downgrade acidental" que a decisão pede. **Nenhuma mudança é necessária em `convex/workspaces.ts` para BILL-03** — só em `convex/http.ts` (parse do `items` + chamar `planForPrice`) e `convex/lib/stripe.ts` (novo helper).

### Anti-Patterns to Avoid

- **Refund cego de `want` no catch, ignorando `inserted` parcial:** se o loop de insert falhar no meio (depois de já ter inserido alguns leads), estornar `want` inteiro sub-credita a quota real usada (os leads já inseridos ficam no banco "de graça"). Sempre estornar `want - inserted`, nunca `want` fixo — ver Pitfall 3.
- **`NODE_ENV` como guarda dentro de função Convex:** ver Pitfall 1 — nunca funciona, é sempre `"production"` no bundle.
- **Confiar em `checkout.session.completed.items`:** o objeto Session do webhook não carrega line items; não tente ler `obj.items` nesse evento.
- **Reservar pelo `inserted` em vez do `want`:** perderia o gating (gastaria a API paga do Google/FSQ mesmo com o plano estourado) — a ordem reserve-antes-do-fetch é intencional e deve ser preservada.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verificação de assinatura HMAC do webhook Stripe | Novo parser/verificador | `convex/lib/stripe.ts:verifyStripeSignature` (já existe, Web Crypto) | Já implementado e testado em produção; fora do escopo desta fase (BILL-05 trata timestamp/constant-time, v2) |
| Cliente HTTP Stripe | SDK `stripe` npm | `convex/lib/stripe.ts:stripePost` (REST minimalista, já existe) | Repo decidiu não usar o SDK oficial (roda em isolate Convex sem Node runtime); não introduzir dependência nova nesta fase |
| Framework de teste para mutations com `ctx` | `convex-test` ou similar | Extrair lógica pura pro `convex/lib/*.ts` e testar com `node:test` (padrão já estabelecido) | Decisão explícita da usuária: sem dependência nova; guardas ctx-dependentes ficam em typecheck + revisão manual |

**Key insight:** o repo já tem os dois padrões certos pra esta fase (clamp em `places.ts`, HMAC em `lib/stripe.ts`, testes puros em `domain.test.ts`) — o trabalho é replicar/estender esses padrões, não inventar novos.

## Common Pitfalls

### Pitfall 1 (CRÍTICO): `process.env.NODE_ENV` dentro de funções Convex é SEMPRE `"production"`

**O que acontece:** Um guard `if (process.env.NODE_ENV !== "production")` escrito dentro de `convex/model/tenant.ts` ou `convex/demo.ts` nunca é `true` — em nenhum deployment (local dev, cloud dev, cloud prod).

**Por que acontece:** o bundler do Convex (esbuild, usado por `bundle()`/`doEsbuild()` em `bundler/index.js`, chamado tanto por `npx convex dev` quanto `npx convex deploy`) define estaticamente `process.env.NODE_ENV` como o literal `"production"` para TODO o código de função bundlado, via `define: { "process.env.NODE_ENV": '"production"' }` — confirmado lendo o código-fonte instalado:

```
node_modules/convex/dist/cjs/bundler/debugBundle.js:100
  define: { "process.env.NODE_ENV": '"production"' }
```
chamado por `doEsbuild()` em `bundler/index.js:86`, usado pela função `bundle()` (linha 152) que é o caminho único de bundling tanto pra "isolate" (browser platform) quanto pra "use node" actions (node platform) — o mesmo `define` se aplica aos dois.

Confirmado também no CHANGELOG oficial do pacote (`node_modules/convex/CHANGELOG.md`, versão 1.25.0): *"Set `process.env.NODE_ENV = "production"` during Convex function bundling. This will result in different code being bundled from some packages, generally faster code."* — o projeto usa `convex@1.42.1`, bem acima dessa versão.

Isso é uma substituição em BUILD TIME (como faz um bundler de frontend com `NEXT_PUBLIC_*`), não uma env var real setada por deployment — Convex não distingue dev/prod deployment via `NODE_ENV`. Confirmado também na documentação oficial (docs.convex.dev/production/environment-variables): não existe env var built-in para diferenciar dev vs prod; o padrão recomendado é criar uma env var própria, por deployment.

**Consequência para SEC-01 se implementado ao pé da letra:** o guard proposto em CONTEXT.md pros dois pontos backend (`tenant.ts:12`, `demo.ts:133`) desligaria o modo demo permanentemente, inclusive no deployment de dev local que a usuária usa hoje (`CONVEX_DEPLOYMENT=local:local-madualvesfr-sitescout`, confirmado em `.env.local`) — regressão, não o comportamento pretendido (que é: funcionar em dev, morrer em prod).

**Como evitar:** usar uma env var PRÓPRIA do projeto (não `NODE_ENV`), setada manualmente e deliberadamente só no deployment de produção real:

```ts
// convex/model/tenant.ts — helper único, substituindo a checagem NODE_ENV por CONVEX_ENV
export function isDemoEnabled(): boolean {
  return process.env.DEMO_MODE === "1" && process.env.CONVEX_ENV !== "production";
}

export async function requireOrgId(ctx: QueryCtx | MutationCtx | ActionCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) return identity.subject;
  if (isDemoEnabled()) return "demo";
  throw new Error("Não autenticado");
}
```
```ts
// convex/demo.ts
import { isDemoEnabled } from "./model/tenant";
// ...
if (!isDemoEnabled()) throw new Error("DEMO_MODE desligado");
```

Operacionalmente, isso exige rodar `npx convex env set CONVEX_ENV production` UMA VEZ no deployment de produção real (ainda não provisionado neste repo — ver Open Questions). `CONVEX_ENV` (ou nome equivalente) não sofre a substituição estática do bundler porque só `process.env.NODE_ENV` é hardcoded pelo esbuild `define` — qualquer outra chave de env continua sendo lida dinamicamente em runtime a partir do que foi configurado no deployment (é assim que `DEMO_MODE`, `FSQ_API_KEY`, `STRIPE_PRICE_PRO` etc. já funcionam hoje no próprio código lido).

**Warning signs:** se depois de implementar o guard o modo demo parar de funcionar mesmo em dev local (`npx convex dev` + `DEMO_MODE=1`), é sinal de que o guard está usando `NODE_ENV` em vez de uma env dedicada.

**Nota:** este pitfall NÃO afeta `src/proxy.ts` — lá `NODE_ENV` é o valor real do processo Next.js (`next build`/`next start` = "production" genuíno), confirmado nos docs oficiais do Next 16 (Pattern 3 acima). O bug é específico do bundler do Convex.

### Pitfall 2: `foursquare.ts` duplica o cálculo do clamp em dois lugares

**O que acontece:** hoje `Math.min(args.max ?? 20, 50)` aparece duas vezes (linha 46 pro `reserve`, linha 52 pro `limit` da URL) — se só um dos dois for corrigido, o comportamento fica inconsistente (reserva um valor, busca outro).

**Como evitar:** calcular `want` uma única vez (via `clampDiscoveryCount(args.max)`) e reusar nas duas linhas — exatamente como `places.ts` já faz.

### Pitfall 3: Refund "tudo ou nada" no catch pode super-estornar

**O que acontece:** a redação da decisão ("Fetch externo falhou: estornar TUDO (`want`) antes de re-lançar") descreve o caso em que o `fetch()` falha ANTES de qualquer insert. Mas se o try/catch envolver também o loop de inserts (que é necessário, já que exceções podem vir de `ctx.runMutation(internal.leads.insertDiscovered, ...)` no meio do loop), um refund fixo de `want` no catch ignora leads que JÁ foram inseridos com sucesso antes da exceção — sub-cobra a quota real.

**Como evitar:** a fórmula genérica `want - inserted` (com `inserted` acumulado incrementalmente durante o loop) cobre os dois casos com uma única linha de código: se a exceção ocorre antes do loop começar, `inserted` é `0` e o refund é `want` inteiro (igual ao pedido); se ocorre no meio, `inserted` reflete o que já foi persistido e o refund é só a diferença. Ver Pattern 1 acima.

**Warning signs:** teste manual — simular falha no meio do loop (ex.: 3º item de 20) e conferir se `leadsUsed` bate com o número de leads efetivamente no banco após o erro.

### Pitfall 4: `reserveUsage`/`refundUsage` já operam sobre workspace "fresh" (reset mensal)

**O que acontece:** `ensureFresh` (chamado dentro de `reserveUsage`) pode resetar `leadsUsed`/`sitesUsed` para `0` se o período mensal expirou (`Date.now() - ws.periodStart > MONTH_MS`). Se o refund rodar numa chamada separada (depois do reserve, minutos depois), teoricamente o período poderia ter virado entre as duas chamadas — caso extremamente raro (janela de 30 dias), mas o `refundUsage` proposto já chama `ensureFresh` de novo antes de subtrair, então o clamp em `Math.max(0, used - count)` protege contra ir negativo mesmo nesse cenário improvável (só "perde" o estorno se o período realmente virou, o que é aceitável).

**Como evitar:** nenhuma ação adicional necessária — o clamp em 0 já cobre o pior caso (não fica negativo), que é exatamente o requisito de BILL-02.

## Code Examples

### `clampDiscoveryCount` (BILL-01, testável puro)
```ts
// convex/lib/domain.ts — nova função
/** Clamp discovery `max` param: default 20, floor 1, ceiling 50, rounds decimals. */
export function clampDiscoveryCount(max?: number): number {
  return Math.min(Math.max(Math.round(max ?? 20), 1), 50);
}
```
Casos de teste a cobrir em `tests/domain.test.ts` (per decisão): negativo, zero, `NaN`, decimal, `>50`, `undefined`.
```ts
test("clampDiscoveryCount: clamps and defaults", () => {
  assert.equal(clampDiscoveryCount(undefined), 20);
  assert.equal(clampDiscoveryCount(-5), 1);
  assert.equal(clampDiscoveryCount(0), 1);
  assert.equal(clampDiscoveryCount(Number.NaN), 1); // Math.round(NaN) = NaN; Math.max(NaN,1) = NaN — CUIDADO, ver nota abaixo
  assert.equal(clampDiscoveryCount(3.6), 4);
  assert.equal(clampDiscoveryCount(999), 50);
});
```
**Nota de implementação:** `Math.max(NaN, 1)` retorna `NaN` em JS (não `1`) — a expressão `Math.min(Math.max(Math.round(NaN), 1), 50)` resulta em `NaN`, não em `1`. O executor precisa tratar `NaN` explicitamente (ex.: `const n = Math.round(max ?? 20); const safe = Number.isFinite(n) ? n : 20;` antes do clamp) para o caso `undefined`/valor não numérico vindo de fora não vazar `NaN` pro `reserveUsage`. Isso é também o motivo pelo qual a defesa em profundidade em `reserveUsage` (`!Number.isInteger(count) || count < 1`) importa — `Number.isInteger(NaN)` é `false`, então a guarda em `reserveUsage` pega esse caso mesmo se `clampDiscoveryCount` não tratar.

### `reserveUsage` com guarda (BILL-01)
```ts
// convex/model/workspace.ts
export async function reserveUsage(ctx, orgId, kind, count) {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`Quantidade de reserva inválida (${count}).`);
  }
  const ws = await ensureFresh(ctx, orgId);
  // ... resto igual
}
```

### `isDemoEnabled()` testável (SEC-01)
Para maximizar cobertura automatizada (per Validation Architecture abaixo), recomenda-se uma variante que aceita env injetável opcionalmente:
```ts
// convex/model/tenant.ts
export function isDemoEnabled(env: Pick<NodeJS.ProcessEnv, "DEMO_MODE" | "CONVEX_ENV"> = process.env): boolean {
  return env.DEMO_MODE === "1" && env.CONVEX_ENV !== "production";
}
```
```ts
// tests/tenant.test.ts (novo)
test("isDemoEnabled: off unless DEMO_MODE=1 and not production", () => {
  assert.equal(isDemoEnabled({ DEMO_MODE: "1", CONVEX_ENV: undefined }), true);
  assert.equal(isDemoEnabled({ DEMO_MODE: "1", CONVEX_ENV: "production" }), false);
  assert.equal(isDemoEnabled({ DEMO_MODE: undefined, CONVEX_ENV: undefined }), false);
});
```
(`tenant.ts` só tem `import type` de `_generated/server` — erased em runtime pelo `--experimental-strip-types`, então importar `tenant.ts` num teste `node:test` funciona sem carregar nada do runtime Convex, igual `domain.ts`.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `middleware.ts` (Next <16) | `proxy.ts` (Next 16+) | Next.js 16.0.0 | Repo já migrado corretamente; `src/proxy.ts` já usa a convenção nova (comentário no próprio arquivo confirma) |
| Middleware em Edge runtime | Proxy default Node.js runtime | Next 15.5 (estável) / 16.0 (default) | `process.env.NODE_ENV` em `proxy.ts` é o valor real do processo Node, não uma env "congelada" de edge |
| Convex bundling sem otimização de NODE_ENV | `process.env.NODE_ENV` hardcoded `"production"` no bundle | `convex@1.25.0` | Efeito colateral não-óbvio: qualquer guard de ambiente dentro de função Convex baseado em `NODE_ENV` é sempre falso-positivo pra "produção" |

**Deprecated/outdated:** nenhuma API usada neste plano está deprecada nas versões instaladas.

## Open Questions

1. **Deployment de produção Convex ainda não existe neste repo**
   - O que sabemos: `.env.local` mostra `CONVEX_DEPLOYMENT=local:local-madualvesfr-sitescout` (deployment LOCAL de dev, feature "Local Deployments" do Convex — roda via CLI/SQLite, não é um deployment cloud). Não há evidência de um deployment de produção provisionado (`npx convex deploy` nunca rodado, ou pelo menos não documentado no repo).
   - O que está incerto: se/quando a usuária provisionar o deployment de produção real, alguém precisa rodar manualmente `npx convex env set CONVEX_ENV production` nele (ação de infra, fora do código) para a defesa em profundidade do SEC-01 funcionar. Sem esse passo manual, o guard proposto (`CONVEX_ENV !== "production"`) fica sempre "não-produção" e a defesa em profundidade vira só o `DEMO_MODE` sozinho (igual estado atual, sem regressão, mas sem o reforço pedido).
   - Recomendação: o plano desta fase deve incluir uma nota operacional explícita (não uma task de código) lembrando a usuária de setar `CONVEX_ENV=production` quando o deployment prod for criado, e documentar isso no `README.md` (seção de deploy) e/ou `.env.example`.

2. **Nome exato da env `CONVEX_ENV`**
   - O que sabemos: qualquer nome funciona tecnicamente, desde que não seja `NODE_ENV` (única chave afetada pelo bundler).
   - O que está incerto: se a usuária prefere outro nome (ex.: `APP_ENV`, `DEPLOY_ENV`) — está marcado como "Claude's Discretion" em CONTEXT.md apenas pra nome de mutation/mensagens, não pra esse ponto específico (que é novo, descoberto na pesquisa).
   - Recomendação: o planner escolhe um nome e documenta a decisão; sugestão `CONVEX_ENV` por paralelismo semântico com `NODE_ENV` sem colidir com ele.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (builtin, Node v22.15.0) + `--experimental-strip-types` |
| Config file | none — script inline em `package.json`: `"test": "node --experimental-strip-types --test tests/*.test.ts"` |
| Quick run command | `pnpm test` (roda toda a suíte, hoje 14 testes, ~80ms) |
| Full suite command | `pnpm test` (suíte única, sem separação quick/full) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BILL-01 | `clampDiscoveryCount(max)`: default 20, piso 1, teto 50, arredonda, trata NaN | unit | `pnpm test` (`tests/domain.test.ts`) | ❌ Wave 0 — função e casos a criar |
| BILL-01 | `reserveUsage` rejeita `count` não-inteiro ou `< 1` | manual-only — depende de `ctx` (MutationCtx), sem framework de teste Convex instalado (decisão explícita da usuária) | — | ❌ N/A (verificação por typecheck + revisão de código) |
| BILL-02 | `refundUsage`: clamp em 0, nunca negativo | manual-only — depende de `ctx`; a aritmética (`Math.max(0, used-count)`) pode ser extraída como helper puro se o executor quiser cobertura automatizada extra (opcional, não bloqueante) | — | ❌ N/A |
| BILL-02 | Action reconcilia `want - inserted` e estorna corretamente em sucesso parcial e falha total | manual-only — requer `ctx`/fetch externo mockado, fora do escopo de `node:test` puro sem dependência nova | — | ❌ N/A (verificação manual: rodar `npx convex run` local com API key de teste, ou revisão de código + typecheck) |
| BILL-03 | `planForPrice(priceId)`: mapeia STRIPE_PRICE_PRO/AGENCY, undefined em price desconhecido | unit | `pnpm test` (novo `tests/stripe.test.ts` ou adicionar a `domain.test.ts`) | ❌ Wave 0 — função e teste a criar |
| BILL-03 | Webhook deriva plano correto por evento (`updated`/`deleted` via price_id, `checkout.session.completed` via metadata) | manual-only — depende do `httpAction`/`ctx`, sem harness de webhook Stripe local | — | ❌ N/A |
| SEC-01 | `isDemoEnabled(env)`: false por padrão, false se `CONVEX_ENV==="production"`, true só com `DEMO_MODE=1` E não-produção | unit | `pnpm test` (novo `tests/tenant.test.ts` ou similar) | ❌ Wave 0 — função e teste a criar |
| SEC-01 | `src/proxy.ts` usa `demoProxy` só fora de produção | manual-only — Next Proxy tem utilitário experimental de teste (`next/experimental/testing/server`, `unstable_doesProxyMatch`) mas instalar/configurar está fora do escopo desta fase (sem dependência nova/config nova); verificação por build local (`NODE_ENV=production pnpm build && pnpm start` e checar que rota protegida exige login mesmo com `NEXT_PUBLIC_DEMO=1`) | — | ❌ N/A |

### Sampling Rate
- **Por commit de task:** `pnpm test` (roda tudo, é rápido — sub-segundo)
- **Por merge de wave:** `pnpm typecheck && pnpm test` (confirmado: `pnpm typecheck` cobre TODOS os arquivos-alvo de `convex/*.ts` desta fase apesar do `tsconfig.json` raiz excluir `convex/` no `include` — porque `convex/_generated/api.d.ts` importa `../foursquare.js`, `../http.js`, `../demo.ts`, `../model/workspace.js` etc. transitivamente, e o TypeScript segue imports mesmo fora do `include` explícito; verificado rodando `npx tsc --noEmit --listFiles` e conferindo que os 21 módulos de `convex/` aparecem na lista)
- **Phase gate:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build` verde antes de `/gsd:verify-work` (constraint já documentada em PROJECT.md)

### Wave 0 Gaps
- [ ] `convex/lib/domain.ts` — adicionar `clampDiscoveryCount`
- [ ] `tests/domain.test.ts` — casos de `clampDiscoveryCount` (negativo, zero, NaN, decimal, >50, undefined)
- [ ] `convex/lib/stripe.ts` — adicionar `planForPrice`
- [ ] `tests/stripe.test.ts` (novo, ou estender `domain.test.ts`) — casos de `planForPrice` (PRO, AGENCY, desconhecido, undefined)
- [ ] `convex/model/tenant.ts` — adicionar `isDemoEnabled` (assinatura testável com env injetável)
- [ ] `tests/tenant.test.ts` (novo, ou estender `domain.test.ts`) — casos de `isDemoEnabled`
- [ ] `convex/model/workspace.ts` — adicionar `refundUsage` (sem teste automatizado — depende de ctx, per decisão)
- [ ] `convex/workspaces.ts` — adicionar `internalMutation refund` (sem teste automatizado — depende de ctx)
- [ ] Nenhuma instalação de framework nova — `node:test` builtin já cobre tudo que é testável sem `ctx`

*(Nenhum gap de infraestrutura de teste em si — `node --experimental-strip-types --test` já funciona; os gaps são só os arquivos/funções novas que ainda não existem.)*

## Sources

### Primary (HIGH confidence)
- `node_modules/convex/dist/cjs/bundler/debugBundle.js:100` e `bundler/index.js:86` (lido diretamente, pacote instalado `convex@1.42.1`) — confirma `process.env.NODE_ENV` hardcoded `"production"` no bundle
- `node_modules/convex/CHANGELOG.md` (versão 1.25.0) — confirma a mudança e sua motivação, cross-referenced com o código-fonte acima
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` (lido integralmente) — runtime Node.js default do Proxy no Next 16
- `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md` (lido integralmente) — comportamento de `NODE_ENV` em `next dev`/`build`/`start`, inlining de `NEXT_PUBLIC_*`
- Leitura direta de todo o código-alvo: `convex/foursquare.ts`, `convex/places.ts`, `convex/model/workspace.ts`, `convex/workspaces.ts`, `convex/http.ts`, `convex/lib/stripe.ts`, `convex/billing.ts`, `convex/model/tenant.ts`, `convex/demo.ts`, `src/proxy.ts`, `convex/lib/domain.ts`, `tests/domain.test.ts`, `convex/leads.ts`, `convex/schema.ts`
- `docs.stripe.com/api/subscriptions/object`, `docs.stripe.com/api/subscription_items/object` (WebFetch, docs oficiais) — confirma `items.data[].price.id` sempre presente, não-expandable
- Execução local confirmada: `pnpm test` (14/14 verde), `npx tsc --noEmit --listFiles` (confirma cobertura de `convex/*.ts` pelo `pnpm typecheck` apesar do exclude), `npx tsc --noEmit -p convex/tsconfig.json` (exit 0)

### Secondary (MEDIUM confidence)
- `docs.convex.dev/functions/actions`, `docs.convex.dev/database/advanced/occ` (WebSearch, cross-referenced) — actions não-transacionais vs mutations transacionais
- `docs.convex.dev/production/environment-variables` (WebFetch) — confirma não existir env built-in pra distinguir dev/prod deployment; recomendação oficial de env dedicada por deployment
- `docs.stripe.com/api/events/types`, community posts sobre `checkout.session.completed` (WebSearch) — confirma `line_items` não incluído por padrão no webhook

### Tertiary (LOW confidence)
- Nenhum achado crítico desta pesquisa ficou em LOW confidence — os pontos mais sensíveis (bundling do Convex, shape do Stripe) foram verificados em fonte primária (código instalado / docs oficiais).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nenhuma dependência nova, versões confirmadas via `node_modules`
- Architecture (BILL-01/02): HIGH — código-fonte lido linha a linha, padrão de `places.ts` já existente e funcional
- Architecture (BILL-03): HIGH — payload Stripe confirmado via docs oficiais, `applySubscription` já correto
- Architecture (SEC-01): HIGH para o achado do bug (`NODE_ENV` sempre "production" no Convex, verificado em fonte primária); MEDIUM para a recomendação de mitigação (`CONVEX_ENV`) — é a abordagem oficialmente recomendada pelo Convex, mas o nome exato da env e o processo operacional de setá-la em prod são decisões do projeto, não um padrão universal
- Pitfalls: HIGH — todos verificados em código-fonte real ou docs oficiais, não em suposição

**Research date:** 2026-07-11
**Valid until:** ~30 dias (stack estável — Next 16 e Convex 1.42 recém-adotados, sem sinais de breaking change iminente; revalidar se `convex` ou `next` forem atualizados antes da execução)
