# Phase 9: Honestidade e superfície jurídica - Research

**Researched:** 2026-10-12
**Domain:** conteúdo de landing, páginas legais estáticas no Next 16, gate de aceite com Convex, exclusão de conta (Convex + Stripe + Clerk)
**Confidence:** HIGH no que vem do código; MEDIUM nos limites do Convex (docs via busca) e no import de `.ts` em `next.config.ts`

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Osprano é SaaS por assinatura, **só B2B**. Lançamento **sem envio automático** (cliente envia do próprio e-mail, Fase 13). Os Termos descrevem isso: o Osprano prepara, o cliente envia e é o responsável pelo contato.
- Dados do Google: só `place_id` guardado (Fase 10). Termos avisam do conteúdo do Google Maps e linkam https://maps.google.com/help/terms_maps/ e https://policies.google.com/privacy.
- Papel GDPR: Duda é **operadora (processor)** dos dados de prospects no workspace de cada cliente e **controladora** dos dados de conta/cobrança e da futura supressão global. O DPA (art. 28) reflete isso.
- Páginas legais **em português** nesta fase; inglês entra na Fase 15.
- Landing (LEGAL-01): remover a seção de depoimentos inteira (`TESTIMONIALS`, page.tsx:74-77 e bloco ~451), sem substituir. Remover/reescrever "Saiba quando abriram ... você é notificado" (page.tsx:61), "hospedagem white-label na sua marca" (page.tsx:62 e ~208), domínio próprio, toggle "Anual -30%". Planos exibidos vêm de `PLANS` (`convex/lib/domain.ts:664`); nada de preço hardcoded. Não reescrever o visual: mudança cirúrgica de conteúdo.
- Páginas legais (LEGAL-02): rotas públicas fora de `(app)`: Aviso Legal, Privacidade, Termos, Cookies, DPA, Subprocessadores, Aviso ao prospect (art. 14). Base em `.planning/research/commercial/LEGAL.md` (seções 2 e 4). Identidade (nome, NIF, domicílio, e-mails) ainda não fornecida: um único arquivo de configuração com placeholders explícitos; build de produção falha (ou página mostra aviso visível) enquanto houver placeholder. Cada página mostra "versão" e "data de vigência". Banner/nota interna de "revisar com advogado" que NÃO aparece ao público em produção. Cookies: só sessão do Clerk + localStorage de tema/assinatura; sem banner de consentimento; a política lista o que existe. Links no rodapé da landing (~549) e no app logado.
- Aceite (LEGAL-03): aceite de Termos + DPA + declaração de uso profissional gravado no workspace com versão e data; versão nova pede novo aceite antes de usar o app. Cadastro usa `<SignUp />` do Clerk. Nenhum uso do app sem aceite registrado no Convex.
- Suporte (LEGAL-04): e-mail de suporte/privacidade vem do mesmo arquivo de identidade (placeholder). Aparece no rodapé da landing e em Ajustes/rodapé do app.
- Exclusão (LEGAL-05): fluxo em Ajustes com confirmação forte; apaga tudo do workspace no Convex (reaproveitar `deleteLeadCascade`; leads, previews, uploads/storage, outreach, eventos, supressões do workspace), cancela assinatura Stripe, remove usuário do Clerk. Supressões: apagar só as do workspace nesta fase e documentar no código que a Fase 13 muda isso. **Não mexer em env**: se faltar chave, o plano lista "Depende de você" com o nome da variável.

### Claude's Discretion
- Estrutura de rotas das páginas legais (ex.: `/legal/<slug>`), componente de layout compartilhado, formato do conteúdo (TSX ou MDX, sem dependência nova).
- Como o gate de aceite é implementado.
- Mecanismo do guard de placeholders.

### Deferred Ideas (OUT OF SCOPE)
- Versão em inglês das páginas legais e da landing: Fase 15 (I18N-01)
- Banner de cookies: só se entrar analytics
- Exportação de dados (art. 20): v2 (DATA-01)
- Supressão global: Fase 13 (SEND-05)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LEGAL-01 | Landing só descreve o que existe; planos reais | Seção "Violações na landing" (lista com linhas); `Pricing` já lê `PLANS`, mas o toggle anual e `PLANS.agency.features` mentem |
| LEGAL-02 | Páginas públicas linkadas no rodapé da landing e do app | Rotas `/legal/*` ficam públicas por padrão (proxy só protege lista fechada); TSX estático em `src/app/legal/` |
| LEGAL-03 | Aceite com versão/data no workspace, versão nova pede novo | Campos opcionais no `workspaces`, mutation `accept`, gate client no layout `(app)` + guarda server no choke point |
| LEGAL-04 | Suporte/privacidade na landing e no app | `LEGAL.supportEmail` no arquivo único; rodapé da landing e `LegalLinks` no app |
| LEGAL-05 | Exclusão de conta completa | Action `account.deleteMyAccount` + purge em lotes + cancelamento Stripe + rota Next que apaga o usuário no Clerk |
</phase_requirements>

## Summary

A landing é um **server component** (`src/app/page.tsx`, `export default async function Home`, usa `auth()` do Clerk). `Pricing` (`src/components/landing/pricing.tsx`) é client component e **já lê `PLANS`** (`Object.values(PLANS)`, linha 47), então a parte "preço vem da fonte única" já está cumprida; o que falta é tirar o toggle anual (estado `annual`, linhas 11-39, e o `plan.price * 0.7`, linha 49) e corrigir o texto das features que vive no próprio `PLANS` (`convex/lib/domain.ts:681-698`: "Export CSV" não existe no código; "White-label + domínio próprio" não existe).

As rotas públicas já são o padrão: `src/proxy.ts` só chama `auth.protect()` numa lista fechada de prefixos (`/dashboard`, `/leads`, `/crm`, `/outreach`, `/sites`, `/plans`, `/settings`). Qualquer `/legal/*` é público sem tocar no proxy. O workspace nasce de forma preguiçosa (`ensureWorkspace`) e quase todas as funções do app passam por `requireOrgId` (uma identidade Clerk = um workspace), então o gate natural é: campos novos opcionais em `workspaces`, query `workspaces.current` devolvendo o estado do aceite, componente client no layout `(app)` que bloqueia a UI, e uma guarda server no ponto único `reserveUsage` (todo gasto de cota passa por ali) mais nas mutations de saída.

A exclusão de conta precisa de 3 passos em ordem: cancelar Stripe, apagar dados Convex em lotes, apagar usuário Clerk por último. **A chave do Clerk não existe no env do Convex** (`grep process.env` em `convex/` só mostra `CLERK_JWT_ISSUER_DOMAIN`), mas o Next já tem `CLERK_SECRET_KEY` (exigida por `clerkMiddleware`). Recomendação: apagar o usuário Clerk numa **rota do Next** com `clerkClient()`, sem mexer em env nenhum. `STRIPE_SECRET_KEY` já é usada no Convex (`billing.ts`).

**Primary recommendation:** 4 planos: (1) landing + `PLANS`; (2) `convex/lib/legal.ts` (identidade + versões + guard) e as 7 páginas TSX em `src/app/legal/`; (3) aceite (schema + mutation + gate + guarda server); (4) exclusão de conta. Nenhuma dependência nova.

## Standard Stack

Nenhuma biblioteca nova. Tudo com o que já está instalado.

| Library | Versão (package.json) | Purpose | Por quê |
|---------|--------|---------|---------|
| next | 16.2.10 | Páginas legais (server components), route handler, `proxy.ts` | já no projeto |
| @clerk/nextjs | ^7.5.16 | `clerkClient()` e `auth()` em `@clerk/nextjs/server` para apagar o usuário | já no projeto; `clerkClient.d.ts` presente em `node_modules/@clerk/nextjs/dist/types/server/` |
| convex | ^1.42.1 | Schema, mutations, actions, scheduler, storage | já no projeto |
| node:test | do Node | Runner dos testes (`node --experimental-strip-types --test tests/*.test.ts`) | padrão existente; **não há vitest nem convex-test** |

**Não instalar:** MDX (`@next/mdx`), convex-test, vitest, lib de i18n, lib de modal. Páginas em TSX.

## Architecture Patterns

### Estrutura recomendada
```
convex/lib/legal.ts            # LEGAL (identidade+versões), isPlaceholder, assertLegalConfigured, isAccepted (puro, sem imports do Convex)
convex/account.ts              # deleteMyAccount (action), purgeBatch (internalMutation), finishDeletion
convex/model/purge.ts          # purgeOrgBatch(ctx, orgId) reutilizando deleteLeadCascade
src/app/legal/layout.tsx       # casca compartilhada (header simples, rodapé com links, banner de rascunho)
src/app/legal/page.tsx         # Aviso Legal  (/legal)
src/app/legal/{privacidade,termos,cookies,dpa,subprocessadores,aviso-prospect}/page.tsx
src/components/legal/legal-links.tsx   # lista única de links (landing, app, páginas legais)
src/components/legal/acceptance-gate.tsx  # "use client", envolve children no (app)/layout
src/app/api/account/clerk/route.ts     # DELETE: apaga usuário Clerk
```
Rotas: usar `/legal/<slug>` (a pesquisa sugeria `/privacy`, `/terms`, mas CONTEXT deixa livre; um prefixo só facilita o layout e o proxy).

### Pattern 1: Páginas legais como server components com layout compartilhado
Route segment `src/app/legal/layout.tsx` (não usar route group, o root layout `src/app/layout.tsx` já envolve com `ClerkProvider` + `ConvexClientProvider`, serve). Cada página exporta `metadata` e renderiza `<LegalDoc title version effectiveDate>`. Versão e vigência vêm de `LEGAL.docs.<slug>` ou de uma só `LEGAL.version`/`LEGAL.effectiveDate` (ver pergunta aberta 1). Next 16: ler `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/` (`layout.md`, `page.md`, `route.md`, `proxy.md`) antes de escrever; `params` em rotas dinâmicas é Promise (não se aplica aqui, são slugs fixos).

### Pattern 2: Config única de identidade com guard
```ts
// convex/lib/legal.ts  (puro: roda em Node, em Convex e em next.config.ts)
export const PLACEHOLDER = "__PREENCHER__";
export const LEGAL = {
  version: "2026-10-12.1",          // sobe a cada mudança material nos Termos/DPA/Privacidade
  effectiveDate: "2026-10-12",
  controllerName: PLACEHOLDER,       // nome completo da Duda
  taxId: PLACEHOLDER,                // NIF
  address: PLACEHOLDER,              // domicílio
  supportEmail: PLACEHOLDER,
  privacyEmail: PLACEHOLDER,
} as const;

export function legalPlaceholders(l: Record<string, string> = LEGAL): string[] {
  return Object.entries(l).filter(([, v]) => v === PLACEHOLDER).map(([k]) => k);
}
```
Guard de build: em `next.config.ts` (importa com extensão `.ts`, mesmo padrão que `src/` já usa para `convex/lib/domain.ts`, tsconfig tem `allowImportingTsExtensions`): `if (process.env.VERCEL_ENV === "production" && legalPlaceholders().length) throw new Error("legal.ts: preencha " + ...)`. **Usar `VERCEL_ENV`, não `NODE_ENV`**: `next build` local roda com NODE_ENV=production e travaria o build local da Duda e o `build` da verificação; a Vercel define `VERCEL_ENV=production` só no deploy de produção. Fallback em runtime (defesa em profundidade): `LegalDoc` mostra faixa vermelha visível "Dados do responsável pendentes" quando `legalPlaceholders().length > 0`, e a faixa "rascunho, revisar com advogado" só aparece quando `VERCEL_ENV !== "production"`. Confirmar no plano que `next.config.ts` importando `.ts` funciona (`./node_modules/.bin/next build`); se não, o guard vira um `scripts/check-legal.ts` rodado pelo `build` do package.json (mexer em package.json scripts é permitido, não é dependência) ou apenas o aviso runtime. MEDIUM.

### Pattern 3: Gate de aceite (recomendação)
**Decisão:** gate no layout `(app)` + guarda server em `reserveUsage` e nas mutations de saída. Não campos do Clerk.

Racional:
- Campos do Clerk (`unsafeMetadata`) vivem no Clerk, não no Convex; CONTEXT exige aceite registrado no Convex. Descartado.
- O layout `(app)/layout.tsx` é server component sem dado de usuário. Criar `AcceptanceGate` client (`useQuery(api.workspaces.current)`), que: carregando → spinner; `acceptance.ok === false` → renderiza tela cheia de aceite (links para Termos/DPA, checkbox de uso profissional, botão Aceitar → `useMutation(api.workspaces.acceptTerms)`) e **não renderiza `children`** (assim nenhuma query da página dispara). `workspaces.current` hoje já devolve defaults quando o workspace não existe (workspaces.ts:12-24), então estende-se com `acceptedVersion`, `acceptedAt`, `requiredVersion`, `acceptanceOk` sem quebrar chamadores (`settings/page.tsx` `PlanPanel` usa `api.workspaces.current`).
- Só UI é contornável (cliente chama a mutation direto). Existem ~40 funções com `requireOrgId` (leads 17, outreach 10, previews 8, ...). Colocar o check em todas é invasivo e mexe em arquivos demais. O custo/risco real está em: (a) gasto de cota e de API paga: **todo** caminho de descoberta/publicação passa por `reserveUsage` (`convex/model/workspace.ts:46`) via `internal.workspaces.reserve`; (b) saída ao prospect (`outreach.*` que marca envio). Guarda server nesses pontos fecha o buraco sem espalhar. Leitura de dados próprios sem aceite é aceitável (o gate de UI cobre o resto).
- Implementação da guarda: em `reserveUsage`, após `ensureFresh`, `if (!isAccepted(ws, LEGAL.version) && !isDemoOrg(orgId)) throw userError("Aceite os Termos e o DPA para continuar.")`. `isAccepted(ws, requiredVersion)` puro em `convex/lib/legal.ts`: `ws.termsVersion === requiredVersion && ws.professionalUse === true`. Demo (`orgId === "demo"` com `isDemoEnabled()`) isento para não quebrar o modo dev (`DEMO` também desliga o Clerk; o gate client deve passar direto quando `NEXT_PUBLIC_DEMO === "1"`, mesmo padrão de `settings/page.tsx` e `proxy.ts`).
- `acceptTerms` (mutation pública): `requireOrgId`; recebe `{ version: string, professionalUse: true }`; **recusa se `version !== LEGAL.version`** (o cliente não escolhe a versão que grava); `ensureWorkspace`; `patch(termsVersion, termsAcceptedAt: Date.now(), professionalUse: true)`. Idempotente.

Schema (`convex/schema.ts`, tabela `workspaces`), campos opcionais (migração zero):
```ts
termsVersion: v.optional(v.string()),
termsAcceptedAt: v.optional(v.number()),
professionalUse: v.optional(v.boolean()),
```
Workspace de produção da Duda: sem os campos = não aceitou = ao próximo login vê a tela de aceite uma vez. Sem backfill, sem `migrations`. Isso é o comportamento desejado (ela também precisa aceitar). Se não quiser ser bloqueada, ela aceita na tela; não pré-popular na mão.

Registro de histórico de aceites (log append-only) não é exigido (LEGAL-03 pede versão e data no workspace). YAGNI: campo no workspace basta; apontar como ceiling.

### Pattern 4: Exclusão de conta
Fluxo (cliente em Ajustes, com campo "digite APAGAR" e aviso do que some):
1. `useAction(api.account.deleteMyAccount)({ confirm: "APAGAR" })` — action pública. Faz, nesta ordem:
   a. `requireOrgId`; recusa `confirm !== "APAGAR"`.
   b. **Stripe**: lê `ws` por `internal.workspaces.getInternal`. Se `ws.stripeSubscriptionId`: `DELETE https://api.stripe.com/v1/subscriptions/{id}` com `STRIPE_SECRET_KEY`. `stripePost` (convex/lib/stripe.ts:5) só faz POST: adicionar `stripeDelete(secret, path)` ao mesmo arquivo (mesmo corpo, `method: "DELETE"`), ou generalizar com parâmetro `method`. Tratar 404 `resource_missing` e subscription já cancelada como sucesso (idempotência). Se o segredo faltar e houver assinatura: abortar com `userError` ANTES de apagar qualquer dado (não deixar cliente pagando sem conta). Sem `stripeSubscriptionId` pula. **Não apagar o Stripe Customer** (faturas devem ser guardadas por obrigação fiscal; documentar na Privacidade).
   c. **Convex**: loop `while (!done) done = await ctx.runMutation(internal.account.purgeBatch, { orgId })`.
   d. Retorna `{ ok: true }`.
2. Cliente, após ok: `fetch("/api/account/clerk", { method: "DELETE" })` e depois `signOut({ redirectUrl: "/" })`.
3. `src/app/api/account/clerk/route.ts`: `const { userId } = await auth(); if (!userId) 401; await (await clerkClient()).users.deleteUser(userId);`. Usa `CLERK_SECRET_KEY` que o Next já tem. Ver `.agents/skills/clerk-backend-api/SKILL.md` (DELETE /v1/users/{id}, retorna `{deleted:true}`) e conferir a assinatura de `clerkClient` em `node_modules/@clerk/nextjs/dist/types/server/clerkClient.d.ts` (em versões recentes é async). Alternativa sem servidor: `user.delete()` do `useUser` (exige "Allow users to delete their accounts" ligado no dashboard do Clerk; incerto, por isso a rota). Ordem: Clerk por último porque a action Convex exige o usuário ainda autenticado, e se algo falhar a pessoa pode tentar de novo.

Idempotência/falha: cada passo é reexecutável. Stripe 404 = ok; `purgeBatch` em org vazia devolve `done: true`; apagar o workspace é o último passo do purge e só roda quando não sobrou nada; Clerk 404 (já apagado) = ok. Se falhar no meio, o usuário continua logado e clica de novo. O workspace é a âncora (guarda `stripeSubscriptionId`) e só some depois de tudo, por isso Stripe vem antes.

`purgeBatch` (internalMutation, `convex/account.ts`; lógica em `convex/model/purge.ts`):
- Lote de **20 leads** por chamada via `deleteLeadCascade` (leads.ts:14; já apaga previews, uploads+storage, events, outreach por lead).
- Quando não há mais leads: varrer o que sobrou por `by_org` com `.take(500)` e apagar: `previews`, `events` (eventos sem `leadId` existem), `outreach`; `uploads` (ver abaixo); `suppressions` da org; `users` por `clerkId = orgId` (nenhum código insere em `users`, é só higiene); por fim o `workspaces`. Retorna `done` só quando tudo está vazio.
- **Tabelas com `orgId` no schema:** `workspaces` (by_org), `leads` (by_org), `previews` (by_org), `uploads` (orgId, **sem índice by_org**: só `by_storage`, `by_lead`), `outreach` (by_org), `events` (by_org), `suppressions` (orgId opcional; `by_org_email` com prefixo `orgId`, `undefined` = global, não apagar), `users` (clerkId; sem orgId). Para `uploads` órfãos (sem lead vivo) adicionar `.index("by_org", ["orgId"])` ao schema (adição de índice é segura) ou, mais barato, aceitar que após `deleteLeadCascade` não restam uploads de leads existentes e o passo de sobra usa `by_org`. Recomendado: adicionar o índice.
- Storage: `ctx.storage.delete(storageId)` dentro de mutation é permitido; `deleteLeadCascade` já guarda com `ctx.db.system.get("_storage", id)`. Uploads sem linha em `uploads` não existem por construção (`assertUploadsOwned`).
- Limites do Convex por função (docs: https://docs.convex.dev/production/state/limits e error-handling): ~16.384 documentos lidos, 8 MiB lidos, 4.096 chamadas `db.get/query`, 8.192 documentos escritos, 8 MiB escritos e 1 s de JS por mutation. Um lead com cascata toca ~5-30 docs; **lote de 20 leads** fica com folga. `collect()` ilimitado nas sobras é o risco: usar `.take(N)`. Fonte secundária, números MEDIUM; o plano deve manter lotes conservadores. Como a action chama `runMutation` em loop, cada lote é transação separada (a action em si tem limite de 10 min).
- Documentar em comentário no código das supressões: "Fase 13 (SEND-05) torna a supressão global; supressões com `orgId` vazio nunca são apagadas aqui e as da org deixam de ser apagadas quando virarem globais".

Env (nomes, sem valores): Convex já usa `STRIPE_SECRET_KEY`. Clerk: `CLERK_SECRET_KEY` fica no **Next** (já exigida pelo `clerkMiddleware`; `.env.local`/Vercel), nada novo no Convex. **Depende de você:** nenhuma variável nova se a rota Next for usada; confirmar que `CLERK_SECRET_KEY` está nas variáveis do projeto na Vercel de produção (se o login funciona em produção, está). Não rodar `convex env list`.

### Anti-Patterns
- **Gate só visual** como único controle (ver Pattern 3).
- **Apagar o usuário Clerk primeiro**: a action exige identidade viva.
- **`collect()` de uma org inteira numa mutation**: estoura limite em conta grande.
- **Guard de placeholder por `NODE_ENV`**: trava o build local.
- **Apagar `suppressions` com `orgId` indefinido**: é supressão global, vale para todos.
- Ponytail: não criar tabela de log de aceites, nem modal lib, nem MDX.

## Don't Hand-Roll

| Problema | Não construir | Usar | Por quê |
|----------|---------------|------|---------|
| Cascata de lead | novo apagador | `deleteLeadCascade` (convex/model/leads.ts:14) | já cobre previews/uploads/storage/events/outreach |
| Cancelar assinatura | cliente Stripe SDK | `fetch` com `stripeDelete` ao lado de `stripePost` | sem SDK no projeto, padrão fetch existente |
| Apagar usuário Clerk | chamada manual com secret no Convex | `clerkClient().users.deleteUser` numa rota Next | secret já está no Next |
| Lista de links legais | arrays repetidos em landing/app/layout | um `LEGAL_LINKS` em `src/components/legal/legal-links.tsx` | 3 lugares usam |
| Erro pt-BR para usuária | `Error` genérico | `userError` (convex/lib/errors.ts) | convenção do repo |

## Violações na landing (LEGAL-01), com linhas

`src/app/page.tsx` (server component):
| Linha | Texto | Ação |
|-------|-------|------|
| 61 | step "Saiba quando abriram" / "você é notificado no instante em que o prospect abre o preview" | Reescrever: o preview é rastreado e o lead avança no funil; sem promessa de notificação (não existe push/e-mail ao dono; confirmar em `convex/events.ts`/`previews.ts` que só atualiza contador/estágio) |
| 62 | "Feche + recorrência ... hospedagem white-label na sua marca" | Reescrever sem white-label/marca própria |
| 74-77 | `TESTIMONIALS` (3 depoimentos inventados) | Apagar constante |
| ~451-478 | `<Section title="Quem prospecta...">` com `TESTIMONIALS.map` | Apagar o bloco inteiro (e a numeração `index` "05" do pricing continua; conferir sequência 01-05) |
| 61 e 69-70 | "Outreach por IA ... Você revisa e envia num clique" / step "Envie compliant" | Ajustar: lançamento sem envio automático; o cliente copia/abre no próprio e-mail |
| 71 | "Compliant by design ... GDPR-safe ... Sem risco." | "Sem risco" é promessa jurídica; remover "Sem risco" |
| 232 | chips "GDPR compliant" | Trocar por afirmação verificável ("opt-out em cada e-mail", "só mercados opt-out") |
| 355-395 | bloco "A única prospecção que não te processa" / "GDPR-safe" | Suavizar ("não te processa" é garantia); manter fatos (mercados, incorporadas) |
| 208-212 e 217 | texto do hero "compliant", "receita recorrente" | revisar tom; mantém visual |
| ~280-290 | contadores: "48 negócios na primeira varredura" (`clampDiscoveryCount` default 20, teto 50, domain.ts) e "100% dos emails com opt-out" | "48" não tem lastro: trocar por número real (ex.: até 50 por busca) ou remover; "100% com opt-out" só vale se o composer sempre inclui rodapé de opt-out (conferir `convex/lib/compliance.ts`); sem envio automático a promessa é do cliente |
| 444 | seção 04 subtítulo "Cobre pela hospedagem e manutenção" | O Osprano publica site em `/site/[slug]` sob o domínio do Osprano; "hospedagem" existe, white-label/domínio próprio não. Reescrever neutro |
| 484 | "Sem cartão para começar. Sem fidelidade. Cancele quando quiser." | ok (plano free existe); manter |
| 549-646 | rodapé | adicionar bloco "Legal" com `LegalLinks` + e-mail de suporte; rodapé 636 "© 2026 Osprano · compliant by design" ok |

`src/components/landing/faq.tsx`: linha 21 (notificado) e linha 25 ("white-label, na sua marca ... O Osprano hospeda; você cobra") para reescrever; linhas 13-16 ("Nada de cold WhatsApp") ok.
`src/components/landing/pricing.tsx`: apagar `useState`/toggle (linhas 8-39), `monthly` vira `plan.price`; sem mais "−30%". O componente pode continuar client ou virar server (não precisa mais de estado): remover `"use client"` e o import de `useState`.
`convex/lib/domain.ts` (`PLANS`): `pro.features` linha 684 `"Export CSV"` (não existe export CSV no código, grep vazio); `agency.features` linha ~695 `"White-label + domínio próprio"` e `"Prioridade"` (sem lastro). Reescrever só o texto das features; ids, preços e limites ficam (a Fase 12 troca planos). `free.features` "5 categorias" não tem enforcement visível (grep sem resultado): remover ou trocar por o que o limite real expressa (`leadsPerMonth`/`sitesPerMonth`). Conferir `tests/domain.test.ts` (grep não mostrou asserts sobre `features`).
App logado: `src/app/(app)/sites/page.tsx:20,29` usa "White-label ... URL própria" no cabeçalho da tela Sites; "URL própria" aqui é a URL pública do Osprano. Fora do escopo literal de LEGAL-01 (landing), mas é a mesma promessa; trocar o eyebrow por "Sites publicados" é uma linha, listar como opcional.

Como ler `PLANS` na landing: `Pricing` já importa `{ PLANS } from "@convex/lib/domain"` (puro, sem imports do servidor Convex) e funciona em server e client. Nenhum preço hardcoded em `page.tsx` hoje (grep "€" não aponta). A Fase 12 só edita `PLANS`.

## Common Pitfalls

### Pitfall 1: Guard de placeholder quebra o build local
Usar `NODE_ENV` falha em todo `next build`. Usar `VERCEL_ENV === "production"` e teste puro para `legalPlaceholders`.

### Pitfall 2: Usuário preso no gate sem conseguir sair
A tela de aceite deve ter botão "Sair" (`useClerk().signOut`) e links para as páginas (públicas, abrem em nova aba). Sem isso, quem discorda fica em loop.

### Pitfall 3: Layout `(app)` é server, hooks não rodam nele
O gate tem que ser um client component filho; não transformar o layout em client (perde o resto). Em modo `DEMO`, sem `ConvexProviderWithClerk`; passar direto.

### Pitfall 4: `workspaces.current` é lido em vários lugares
Estender o retorno só adicionando campos. `useQuery` devolve `undefined` enquanto carrega: gate mostra loading, nunca children.

### Pitfall 5: Query após exclusão recria workspace vazio
`ensureWorkspace` é preguiçoso; qualquer mutation concorrente depois do purge recria. Mitigação: o cliente faz `signOut` logo após a exclusão e o usuário Clerk some; o resíduo é um workspace vazio sem dono. Aceitável; anotar como ceiling.

### Pitfall 6: Webhook Stripe após cancelar
`customer.subscription.deleted` chega depois; `applySubscription` já faz `if (!ws) return` (workspaces.ts:73). Seguro.

### Pitfall 7: Stripe DELETE com subscription já cancelada
Retorna 404/`resource_missing`; `stripePost` hoje lança `userError` genérico sem expor o status. O helper novo precisa devolver o status (ou lançar tipado) para o chamador tratar 404 como sucesso.

### Pitfall 8: Mudar texto de PLANS sem checar quem lê `features`
`grep -rn "features"` antes; `plans/page.tsx` do app também provavelmente renderiza `PLANS`.

### Pitfall 9: Next 16
`proxy.ts` (não `middleware.ts`) é o arquivo certo (já é). Conferir `route.md` para a assinatura do handler `DELETE` (`export async function DELETE(request: Request)`), e `layout.md` antes de criar `src/app/legal/layout.tsx`.

## Code Examples

### Guarda server no choke point
```ts
// convex/model/workspace.ts, dentro de reserveUsage, após ensureFresh
const ws = await ensureFresh(ctx, orgId);
if (!(orgId === "demo" && isDemoEnabled()) && !isAccepted(ws, LEGAL.version)) {
  throw userError("Aceite os Termos e o DPA para continuar usando o Osprano.");
}
```
(`isDemoEnabled` vive em `convex/model/tenant.ts`.)

### Mutation de aceite
```ts
export const acceptTerms = mutation({
  args: { version: v.string(), professionalUse: v.literal(true) },
  handler: async (ctx, { version }) => {
    const orgId = await requireOrgId(ctx);
    if (version !== LEGAL.version) throw userError("Versão dos termos desatualizada. Recarregue a página.");
    const ws = await ensureWorkspace(ctx, orgId);
    await ctx.db.patch(ws._id, { termsVersion: version, termsAcceptedAt: Date.now(), professionalUse: true });
  },
});
```

### Helper Stripe (mesma forma do `stripePost`)
```ts
export async function stripeDelete(secret: string, path: string): Promise<"ok" | "gone"> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { method: "DELETE", headers: { authorization: `Bearer ${secret}` } });
  if (res.status === 404) return "gone";
  if (!res.ok) { console.error(`Stripe ${res.status}`); throw userError(`Stripe respondeu ${res.status}`); }
  return "ok";
}
```

### Rota Clerk
```ts
// src/app/api/account/clerk/route.ts
import { auth, clerkClient } from "@clerk/nextjs/server";
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return new Response("unauthorized", { status: 401 });
  await (await clerkClient()).users.deleteUser(userId);
  return Response.json({ ok: true });
}
```
Conferir se `clerkClient` é função async nesta versão (types) antes de fixar o `await`. A rota `/api/account/clerk` já é coberta pelo `matcher` (`/(api|trpc)(.*)`) e **não** está na lista `isProtected`: a própria rota checa `auth()`; opcionalmente incluir `/api/account(.*)` em `isProtected`.

## Test infrastructure (pergunta 6)
- Runner: `node:test` com `--experimental-strip-types`; `npm test` = `node --experimental-strip-types --test tests/*.test.ts`. 22 arquivos em `tests/`, todos testam **módulos puros** (`convex/lib/*.ts`, `convex/model/tenant.ts`), importando com extensão `.ts` (ex.: `tests/tenant.test.ts`). **Não há convex-test nem mock de ctx.** Estilo: `test()` + `assert/strict`.
- Convenção: lógica testável fica em módulos sem import do servidor Convex (`convex/lib/env.ts` é o modelo, comentário no topo explica). Seguir: `convex/lib/legal.ts` puro.
- Para a cascata de exclusão (depende de `ctx.db`), criar em `tests/purge.test.ts` um **fake ctx mínimo** em memória (objeto com `db.query().withIndex().take/collect`, `db.delete`, `db.system.get`, `storage.delete`) passado a `purgeOrgBatch`. Se escrever o fake ficar maior que a lógica, o plano pode testar só o que é puro (ordem dos passos e `done`) e cobrir o resto com verificação manual na dev deployment. Nunca testar contra produção.
- Comandos: `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/eslint`, `node --experimental-strip-types --test tests/*.test.ts`, `./node_modules/.bin/next build`. (`pnpm <script>` aborta sem TTY.) Verificar também `npx convex dev --once` tipa o schema novo? Não rodar sem aprovação (mexe em deployment); `tsc` com `_generated` cobre tipos.
- Atenção: `convex/_generated/api.d.ts` precisa listar `account` ao criar `convex/account.ts`; arquivo gerado, mas está commitado (`ls convex/_generated`). Sem `convex dev` o `api.account` não existe em `typecheck`: o plano deve prever atualização do `api.d.ts` (rodar `npx convex codegen`, que precisa de deployment; senão editar `api.d.ts` na mão adicionando o módulo, mesmo padrão dos existentes). Registrar em Open Questions.

## State of the Art
| Antigo | Atual | Impacto |
|--------|-------|---------|
| `middleware.ts` | `proxy.ts` no Next 16 | já aplicado em `src/proxy.ts` |
| `clerkClient` objeto síncrono | função async (`await clerkClient()`) em versões recentes | conferir tipos antes |

## Open Questions

1. **Versão por documento ou única?**
   - Sabemos: LEGAL-03 pede "versão e data" do aceite; páginas pedem versão e vigência.
   - Recomendação: uma `LEGAL.version` única (bump força novo aceite de tudo) e `effectiveDate`; simples. Versão por página só se a Duda quiser reaceitar seletivamente.
2. **`api.d.ts` gerado sem deployment.** Plano deve decidir entre `convex codegen` (precisa deployment dev) ou edição manual. Depende de ambiente da Duda.
3. **Chave do Clerk.** Confirmar com a Duda se prefere a rota Next (recomendada, zero env novo) ou `user.delete()` no cliente (depende de configuração do dashboard Clerk). Padrão adotado: rota Next.
4. **Redação jurídica.** O conteúdo das 7 páginas é rascunho técnico a partir de `LEGAL.md` seções 1.2, 1.3, 2.1-2.3, 4.2; exige revisão de advogado antes de cobrar (LEGAL.md seção 7). Detalhes de subprocessadores (Clerk, Convex, Vercel, Stripe, Anthropic, Resend, Google Places/PageSpeed, Foursquare, regiões) devem sair de `LEGAL.md` 1.3 e do código (`process.env` lista os serviços reais: Anthropic, Google Places/PageSpeed, Foursquare, Resend, Stripe, WhatsApp).
5. **Claims no hero/contadores** (48, 100% opt-out, "A única que não te processa"): julgamento de conteúdo; o plano deve usar números verificáveis ou remover.
6. **Limites do Convex** foram confirmados por busca (MEDIUM); lotes conservadores cobrem a incerteza.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (Node `--experimental-strip-types`), sem dependências |
| Config file | none (script `test` em package.json) |
| Quick run command | `node --experimental-strip-types --test tests/legal.test.ts tests/purge.test.ts` |
| Full suite command | `node --experimental-strip-types --test tests/*.test.ts && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && ./node_modules/.bin/next build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LEGAL-01 | landing sem "TESTIMONIALS", "white-label", "domínio próprio", "notificado", "Anual", "−30%", "Export CSV" | unit (grep em arquivos-fonte) | `node --experimental-strip-types --test tests/landing-honesty.test.ts` (lê `src/app/page.tsx`, `src/components/landing/*.tsx`, e `PLANS`; falha se achar os termos proibidos) | ❌ Wave 0 |
| LEGAL-01 | `PLANS.*.features` sem termos proibidos | unit | idem | ❌ Wave 0 |
| LEGAL-02 | 7 páginas existem em `src/app/legal/**/page.tsx` e `LEGAL_LINKS` aponta só para rotas existentes; `/legal` não está em `isProtected` do proxy | unit (fs) | `node --experimental-strip-types --test tests/legal-pages.test.ts` | ❌ Wave 0 |
| LEGAL-02/04 | `legalPlaceholders()` lista campos pendentes; vazio quando preenchido; `assertLegalConfigured` lança | unit | `node ... tests/legal.test.ts` | ❌ Wave 0 |
| LEGAL-02 | build passa com placeholders fora de produção | smoke | `./node_modules/.bin/next build` (sem `VERCEL_ENV`) | ✅ comando existe |
| LEGAL-02 | build de produção FALHA com placeholder | smoke | `VERCEL_ENV=production ./node_modules/.bin/next build` deve sair com código != 0 (rodar uma vez na verificação) | manual-once |
| LEGAL-03 | `isAccepted`: sem campos = false; versão antiga = false; versão atual sem `professionalUse` = false; atual+true = true | unit | `tests/legal.test.ts` | ❌ Wave 0 |
| LEGAL-03 | `acceptTerms` recusa versão diferente de `LEGAL.version` | unit com fake ctx ou revisão de código | `tests/legal.test.ts` (extrair `validateAcceptance(version)` puro) | ❌ Wave 0 |
| LEGAL-03 | `reserveUsage` recusa workspace não aceito | unit com fake ctx mínimo | `tests/legal.test.ts` | ❌ Wave 0 |
| LEGAL-05 | `purgeOrgBatch` apaga leads (via cascata), previews, events, outreach, uploads+storage, supressões da org, e preserva supressão global; devolve `done` só ao esvaziar; reexecutar em org vazia = `done` | unit com fake ctx em memória | `node ... tests/purge.test.ts` | ❌ Wave 0 |
| LEGAL-05 | `stripeDelete` trata 404 como "gone" | unit com `fetch` stub (`globalThis.fetch`) | `tests/stripe.test.ts` (já existe, estender) | ✅ estender |
| LEGAL-05 | Fluxo ponta a ponta (Stripe test mode + Clerk) | manual-only | roteiro: conta de teste → assinar → apagar → conferir Convex dashboard vazio, assinatura cancelada no Stripe, usuário ausente no Clerk. Justificativa: depende de serviços externos e chaves | manual |

### Sampling Rate
- **Por commit de tarefa:** `node --experimental-strip-types --test tests/legal.test.ts tests/purge.test.ts tests/landing-honesty.test.ts` + `./node_modules/.bin/tsc --noEmit`
- **Por wave:** suíte completa de testes + `eslint`
- **Gate de fase:** suíte completa + `next build` verdes antes do `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/legal.test.ts`: placeholders, `isAccepted`, validação de versão, guarda do `reserveUsage`
- [ ] `tests/landing-honesty.test.ts`: termos proibidos na landing e em `PLANS`
- [ ] `tests/legal-pages.test.ts`: existência das páginas e links
- [ ] `tests/purge.test.ts`: fake ctx em memória para a cascata
- [ ] `convex/lib/legal.ts` criado antes dos testes (módulo puro)
- Framework: nenhum a instalar

## Sources

### Primary (HIGH confidence)
- Código do repo: `src/app/page.tsx`, `src/components/landing/{pricing,faq,calculator}.tsx`, `src/proxy.ts`, `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/settings/page.tsx:214-218`, `convex/schema.ts`, `convex/workspaces.ts`, `convex/model/{workspace,tenant,leads,uploads}.ts`, `convex/billing.ts`, `convex/lib/{stripe,domain,env}.ts`, `convex/http.ts`, `convex/admin.ts`, `tests/*`, `package.json`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/` (route-groups, proxy, route, layout)
- `.agents/skills/clerk-backend-api/SKILL.md` (DELETE /v1/users/{id})
- `.planning/research/commercial/LEGAL.md` e `LAUNCH-READINESS.md`

### Secondary (MEDIUM confidence)
- https://docs.convex.dev/using/error-handling e https://docs.convex.dev/production/state/limits (limites por função: 16.384 docs lidos, 8.192 escritos, 1 s), via busca; não abri a página de limites diretamente

### Tertiary (LOW confidence)
- Comportamento de `next.config.ts` importando `.ts` de `convex/lib` e assinatura async de `clerkClient` em @clerk/nextjs 7.5.x: não executado, o plano valida com `next build` e lendo os `.d.ts`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (nada novo)
- Architecture: HIGH no gate/purge (lido no código), MEDIUM no guard de build
- Pitfalls: MEDIUM-HIGH

**Research date:** 2026-10-12
**Valid until:** 2026-11-11
