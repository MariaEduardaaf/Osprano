# sitescout — setup

Stack: **Next.js 16** (App Router, TS strict, Tailwind 4) · **Convex** (dados + jobs) · **Clerk** (auth) · **Resend** (email).

## 1. Contas (grátis pra começar)

| Serviço | Pra quê | Onde |
|---|---|---|
| **Convex** | banco reativo + jobs de scoring | convex.dev |
| **Clerk** | login/contas | clerk.com |
| **Google Cloud** | Places + PageSpeed (Fase 1) | console.cloud.google.com |
| **Resend** | envio de email (Fase 3) | resend.com |

## 2. Rodar local

```bash
cp .env.example .env.local        # preencha as chaves do Clerk

npx convex dev                    # 1º run: cria o deployment, gera convex/_generated,
                                  # e escreve NEXT_PUBLIC_CONVEX_URL no .env.local
```

No **Clerk**: crie um JWT Template chamado `convex`. Depois aponte o Convex pra ele:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<sua-app>.clerk.accounts.dev
```

Em outro terminal:

```bash
pnpm dev                          # http://localhost:3000
```

## 3. Verificação

```bash
pnpm typecheck                    # tsc do app
pnpm lint                         # eslint
# o `npx convex dev` faz o typecheck do backend (pasta convex/)
```

## Estado atual — Fase 0 (Fundação) ✅

- Scaffold Next 16 + Convex + Clerk + Resend/Zod
- Schema Convex: `leads`, `previews`, `outreach`, `events`, `users`
- Domínio compartilhado (`convex/lib/domain.ts`): mercados opt-out, denylist "só-social",
  pesos do Digital Presence Score, guardrail de compliance (armadilha do autônomo)
- Auth Clerk (`proxy.ts` do Next 16) + provider Convex↔Clerk
- Shell do dashboard (Dashboard / Leads / CRM / Outreach) com empty states

## Próximas fases

1. **Descoberta + Score** — Google Places + Foursquare OS, Digital Presence Score
2. **Preview + tracking** — preview em link rastreado + notificação de abertura
3. **Outreach compliant** — redação IA + envio email (identificação/opt-out) + guardrails
4. **Pipeline/CRM + dashboard** — funil ao vivo

> **Notas de arquitetura**
> - Next 16 renomeou `middleware.ts` → `proxy.ts` (runtime nodejs). Se o Clerk exigir o
>   nome legado no futuro, renomeie o arquivo e o export pra `middleware`.
> - ToS do Google Places: só o `place_id` é armazenável pra sempre; os demais campos, ~30 dias
>   (ver `fetchedAt`). A base armazenável/revendável é o Foursquare OS.
