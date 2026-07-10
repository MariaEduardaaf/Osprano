# sitescout — setup

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
# opcionais:
npx convex env set GOOGLE_PAGESPEED_API_KEY <chave>
npx convex env set RESEND_API_KEY <chave> && npx convex env set RESEND_FROM "Você <voce@dominio.com>"
```

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

## Estado — MVP V1 completo ✅

| Fase | O que faz | Status |
|---|---|---|
| 0 · Fundação | scaffold, schema, auth, shell | ✅ |
| 1 · Descoberta + Score | Places + Foursquare-ready, HTTPS/PageSpeed, Score 0–100 | ✅ |
| 2 · Preview + tracking | preview rastreado /p/[token] + sinal de abertura | ✅ |
| 3 · Outreach compliant | redação IA + guardrail + copiar/enviar | ✅ |
| 4 · Pipeline/CRM + dashboard | kanban com estágios + funil ao vivo | ✅ |

## Notas de arquitetura

- **Compliant by design:** busca e outreach travados aos mercados **opt-out** (UK/NL/IE/SE/NO);
  `isEmailable()` aplica a "armadilha do autônomo" (só incorporados / inbox de função).
- **Next 16:** `middleware.ts` virou `proxy.ts` (runtime nodejs); `params` é `Promise` (await).
- **Google Places ToS:** só o `place_id` é armazenável pra sempre; demais campos ~30 dias
  (`fetchedAt`). Base armazenável/revendável = Foursquare OS.
- **WhatsApp a frio = ilegal na UE** sem opt-in → só pós-resposta (fora do V1).
- **Deployment local** (`--dev-deployment local`) foi usado para verificação sem conta cloud;
  rode `npx convex dev` com a sua conta para produção.
