# Osprano — setup

Concorrente do LeadSite para o **mercado europeu**. Acha negócios locais com presença
digital fraca, pontua a dor (Digital Presence Score) e aborda por **email, compliant by design**.

**Stack:** Next.js 16 (App Router, TS strict, Tailwind 4) · Convex (dados + jobs) · Clerk (auth) ·
Anthropic (redação) · Resend (email opcional).

## 1. Contas

| Serviço | Pra quê | Obrigatório? |
|---|---|---|
| **Convex** (convex.dev) | banco + jobs de scoring | sim |
| **Clerk** (clerk.com) | login/contas | sim |
| **Google Cloud** (Places API) | descoberta de leads | sim (é pago) |
| **Anthropic** (console.anthropic.com) | redação da abordagem | sim p/ outreach |
| **Resend** (resend.com) | envio automático de email | opcional |

## 2. Rodar

```bash
cp .env.example .env.local              # preencha as chaves do Clerk

npx convex dev                          # cria/conecta o deployment e escreve NEXT_PUBLIC_CONVEX_URL
```

No **Clerk**: crie um JWT Template chamado `convex`. Depois configure as variáveis do
**deployment Convex** (server-side; NÃO vão no .env.local):

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<sua-app>.clerk.accounts.dev
npx convex env set GOOGLE_PLACES_API_KEY   <chave>
npx convex env set ANTHROPIC_API_KEY       <chave>
npx convex env set APP_URL                 http://localhost:3000
npx convex env set CONVEX_ENV              development   # obrigatório no deployment local
# billing (V2):
npx convex env set STRIPE_SECRET_KEY <chave>
npx convex env set STRIPE_PRICE_PRO <price_id> && npx convex env set STRIPE_PRICE_AGENCY <price_id>
npx convex env set STRIPE_WEBHOOK_SECRET <whsec_...>   # endpoint: ${CONVEX_SITE_URL}/stripe/webhook
# opcionais:
npx convex env set GOOGLE_PAGESPEED_API_KEY <chave>
npx convex env set FSQ_API_KEY <chave>                 # 2ª fonte de descoberta
npx convex env set RESEND_API_KEY <chave> && npx convex env set RESEND_FROM "Você <voce@dominio.com>"
npx convex env set WHATSAPP_TOKEN <token> && npx convex env set WHATSAPP_PHONE_ID <id>  # follow-up pós-opt-in
```

> **`CONVEX_ENV=development` não é opcional no deployment local.** As variáveis que viram
> texto lido pelo PROSPECT (link da prévia, link de opt-out, identidade de quem envia) são
> validadas em código, em `convex/lib/env.ts`, com **default-deny**: um deployment sem
> `CONVEX_ENV` é tratado como produção, e aí `APP_URL=http://localhost:3000` é recusado —
> a abordagem por IA falha com "APP_URL aponta para um endereço local". É esse mesmo gate
> que impede um link `localhost` (ou um `undefined/unsubscribe`) de sair para o prospect em
> produção. Nunca setar `development` em deployment de produção.

Em outro terminal:

```bash
pnpm dev                                 # http://localhost:3000
```

## 3. Verificação

```bash
pnpm typecheck    # tsc do app        (verde)
pnpm lint         # eslint            (verde)
pnpm test         # lógica do Score   (12/12)
npx convex dev --once   # typecheck + deploy do backend
```

## Estado — aplicação completa ✅

| Bloco | O que faz | Status |
|---|---|---|
| 0 · Fundação | scaffold, schema, auth, shell | ✅ |
| 1 · Descoberta + Score | Places + Foursquare, HTTPS/PageSpeed, Score 0–100 | ✅ |
| 2 · Preview + tracking | preview rastreado /p/[token] + sinal de abertura | ✅ |
| 3 · Outreach compliant | redação IA + guardrail + copiar/enviar | ✅ |
| 4 · Pipeline/CRM + dashboard | kanban + funil + atividade ao vivo | ✅ |
| Compliance+ | forma jurídica (nome), email do site, tipo de contato → emailable real | ✅ |
| V2 · Freemium | planos free/pro/agency + limites de uso | ✅ |
| V2 · White-label | publicar → /site/[slug] + Meus Projetos | ✅ |
| V2 · Billing | Stripe checkout/portal + webhook | ✅ |
| V3 · WhatsApp | follow-up pós-opt-in (nunca a frio) | ✅ |

Build de produção (`next build`) passa com as 13 rotas.

## Notas de arquitetura

- **Compliant by design:** busca e outreach travados aos mercados **opt-out** (UK/NL/IE/SE/NO);
  `isEmailable()` aplica a "armadilha do autônomo" (só incorporados / inbox de função).
- **Next 16:** `middleware.ts` virou `proxy.ts` (runtime nodejs); `params` é `Promise` (await).
- **Google Places ToS:** só o `place_id` é armazenável pra sempre; demais campos ~30 dias
  (`fetchedAt`). Base armazenável/revendável = Foursquare OS.
- **WhatsApp a frio = ilegal na UE** sem opt-in → só pós-resposta (fora do V1).
- **Deployment local** (`--dev-deployment local`) foi usado para verificação sem conta cloud;
  rode `npx convex dev` com a sua conta para produção.
