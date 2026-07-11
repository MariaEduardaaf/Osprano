# Osprano

**Ache a dor. Aborde. Feche o site.**

Osprano encontra **negócios locais europeus com presença digital fraca**, pontua a "dor"
de cada um, e a **IA escreve a abordagem por email** — _compliant by design_. Você gera
um preview de site em segundos, fecha o cliente e transforma a venda única em **receita
recorrente** com hospedagem white-label na sua marca.

> Mercados de lançamento (opt-out, onde cold email é legal): 🇬🇧 Reino Unido · 🇳🇱 Holanda ·
> 🇮🇪 Irlanda · 🇸🇪 Suécia · 🇳🇴 Noruega. **Nada de WhatsApp a frio** (ilegal na UE).

---

## ✨ O que ela faz

- **Descoberta de leads** — busca por país, cidade e categoria (Google Places), 1–50 por vez.
- **Digital Presence Score (0–100)** — pontua a dor por sinais reais: sem site, só rede
  social, sem HTTPS, não-mobile, lento, perfil incompleto. Maior score = lead mais quente.
- **Guardrail de compliance** — só libera abordagem onde é legal (mercado opt-out) e para
  entidades incorporadas / caixas de função ("a armadilha do autônomo").
- **CRM Kanban** — arraste os cards pelo funil (Base → Abordado → Agendado → Follow Up →
  Convertido), com busca, ordenação e detalhe do lead em abas.
- **Outreach por IA** — email personalizado citando a dor + link do preview rastreado, com
  **caixa de saída** que acompanha o status (rascunho → enviado → abriu → respondeu).
- **Preview de sites** — gera um site do negócio num link único rastreado; publique
  white-label com URL própria.
- **Tema claro/escuro** e paleta "Product UI Styleguide" (azul vívido + cinzas neutros).

---

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| Frontend | **Next.js 16** (App Router, TypeScript strict, Turbopack) |
| Estilo | **Tailwind CSS v4** + design tokens (light/dark) · fontes Bricolage Grotesque + Geist |
| Ícones | Material Icons (`react-icons/md`) |
| Backend / DB | **Convex** (reativo, queries/mutations/actions + jobs agendados) |
| Auth | **Clerk** |
| Email | **Resend** (opcional) |
| Billing | **Stripe** (checkout + portal, opcional) |
| Dados | Google Places (Text Search, New) · PageSpeed · Foursquare (secundário) |
| IA | **Anthropic** (Claude) para redigir a abordagem |

---

## 🚀 Como rodar

Pré-requisitos: **Node 20+**, **pnpm**, e contas em Convex + Clerk (ou use o **modo demo** abaixo).

```bash
pnpm install

# 1) Convex — cria o deployment e escreve NEXT_PUBLIC_CONVEX_URL no .env.local
npx convex dev

# 2) Variáveis de ambiente
cp .env.example .env.local   # preencha as chaves do Clerk (client) — veja abaixo

# 3) App
pnpm dev                     # http://localhost:3000
```

### Variáveis de ambiente

- **`.env.local`** (client): `NEXT_PUBLIC_CONVEX_URL` (o Convex escreve) e as chaves do
  **Clerk** (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, URLs de sign-in/up).
- **Chaves de servidor** vão **dentro do deployment Convex** (não no `.env.local`):

  ```bash
  npx convex env set GOOGLE_PLACES_API_KEY <key>     # descoberta de leads
  npx convex env set ANTHROPIC_API_KEY <key>         # abordagem por IA
  npx convex env set APP_URL http://localhost:3000   # link dos previews
  npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<seu-app>.clerk.accounts.dev
  # opcionais: RESEND_API_KEY / RESEND_FROM, STRIPE_*, FSQ_API_KEY, GOOGLE_PAGESPEED_API_KEY
  ```

  Veja o cabeçalho do [`.env.example`](./.env.example) para a lista completa.

### 🧪 Modo demo (sem Clerk, com dados de exemplo)

O jeito mais rápido de ver a aplicação **preenchida**, sem configurar auth nem APIs pagas:

```bash
# no deployment Convex
npx convex env set DEMO_MODE 1
npx convex run demo:seed          # 48 negócios europeus + previews + caixa de saída

# no .env.local
NEXT_PUBLIC_DEMO=1

pnpm dev
```

No modo demo a auth é ignorada (org "demo") e a descoberta real (Places) fica desativada —
tudo roda em cima do seed.

---

## 📜 Scripts

```bash
pnpm dev         # servidor de desenvolvimento
pnpm build       # build de produção
pnpm start       # servir o build
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
pnpm test        # testes de unidade do domínio (node --test)
```

---

## 🗂️ Estrutura

```
convex/            # schema, queries/mutations/actions, jobs, lógica de domínio (lib/)
src/app/           # rotas (App Router): landing, (app)/dashboard|leads|crm|outreach|sites|settings
src/components/    # UI: sidebar, cards, CRM (modal/detalhe), landing, gráficos, tema
src/lib/           # helpers (playbook de vendas, providers)
tests/             # testes de unidade do domínio
```

---

_Compliant by design · feito para a Europa._ 🦅
