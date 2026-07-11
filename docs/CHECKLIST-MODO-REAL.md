# Checklist — do modo demo pro modo real (uso pessoal)

> Objetivo: rodar o Osprano de verdade, só pra você, nas primeiras semanas.
> **Custo total esperado: ~US$ 5** (créditos mínimos da Anthropic). Todo o resto fica no free tier.
> Tempo estimado: ~40 min, na ordem abaixo. Rode tudo a partir da raiz do projeto.

---

## 0. Antes de começar

- [ ] O app roda em modo demo (`pnpm dev` + seed) — nada a desfazer ainda; o demo será desligado no passo 6.
- [ ] Você está logada no terminal na pasta do projeto (`~/Developer/sitescout`).

## 1. Convex (banco + backend) — grátis

O deployment atual é **local** (só existe na sua máquina). Pra uso real, crie o deployment na nuvem:

- [ ] Crie a conta em [convex.dev](https://convex.dev) (login com GitHub).
- [ ] Rode `npx convex dev` e siga o fluxo de login/criação de projeto — ele conecta o deployment dev na nuvem e **atualiza o `NEXT_PUBLIC_CONVEX_URL` no `.env.local` sozinho**.
- [ ] Deixe esse `npx convex dev` rodando num terminal (ele sincroniza as functions).

> Free tier: 1M function calls/mês — uso pessoal não chega perto.

## 2. Clerk (login) — grátis

- [ ] Crie a conta em [dashboard.clerk.com](https://dashboard.clerk.com) e crie uma aplicação (ex.: "Osprano").
- [ ] Em **API Keys**, copie e preencha no `.env.local`:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...`
  - `CLERK_SECRET_KEY=sk_test_...`
- [ ] Em **JWT Templates → New template → Convex**, crie o template com o nome exato `convex`.
- [ ] Copie o **Issuer domain** do template (formato `https://<sua-app>.clerk.accounts.dev`) e rode:
  ```bash
  npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<sua-app>.clerk.accounts.dev
  ```

> Free tier: 50.000 usuários retidos/mês. Você é 1.

## 3. Anthropic (IA do outreach) — ~US$ 5

- [ ] Crie a conta em [console.anthropic.com](https://console.anthropic.com).
- [ ] Em **Billing**, adicione os créditos mínimos (US$ 5) — cobre ~1.000 rascunhos de email.
- [ ] (Opcional, recomendado) Configure um **spend limit / alerta** na mesma tela.
- [ ] Em **API Keys**, crie uma chave e rode:
  ```bash
  npx convex env set ANTHROPIC_API_KEY sk-ant-...
  ```

## 4. Google Cloud (descoberta de leads) — cartão obrigatório, cobrança R$ 0

- [ ] Em [console.cloud.google.com](https://console.cloud.google.com), crie um projeto (ex.: "osprano").
- [ ] Ative a **Places API (New)** (APIs & Services → Library → "Places API (New)" → Enable).
- [ ] Crie o **billing account** com cartão (exigência do Google; dentro do free tier não cobra).
- [ ] **Trave o teto** pra garantir custo zero:
  - APIs & Services → Places API (New) → **Quotas** → limite de requests/dia (ex.: **30/dia** ≈ 900/mês, abaixo das 1.000 grátis do SKU Enterprise);
  - Billing → **Budgets & alerts** → orçamento de US$ 1 com alerta por email.
- [ ] Crie a **API key** (Credentials → Create credentials → API key) e **restrinja a chave à Places API (New)**.
- [ ] Rode:
  ```bash
  npx convex env set GOOGLE_PLACES_API_KEY <sua-chave>
  ```

> 1 chamada = até 20 leads → 1.000 chamadas grátis/mês = até 20.000 leads. Seu uso pessoal: dezenas.

## 5. URL dos previews

- [ ] Rode (ajuste a porta se o `pnpm dev` subir em outra — ex.: 3001):
  ```bash
  npx convex env set APP_URL http://localhost:3000
  ```

## 6. Desligar o modo demo

- [ ] No `.env.local`: garanta que **não** existe `NEXT_PUBLIC_DEMO=1`.
- [ ] No deployment Convex:
  ```bash
  npx convex env remove DEMO_MODE
  ```
- [ ] Reinicie o `pnpm dev`. A partir daqui o app exige login (Clerk) e cada conta tem seu próprio workspace.

## 7. Opcionais (pode pular hoje)

- **PageSpeed API key** (grátis, melhora o rate limit do sinal "site lento/não-mobile"):
  `npx convex env set GOOGLE_PAGESPEED_API_KEY <chave>`
- **Resend** (envio automático): desnecessário no começo — use **Copiar** + **Marcar enviado** no composer e envie do seu próprio email. Quando quiser automatizar: conta no [resend.com](https://resend.com) (3.000 emails/mês grátis), verifique um domínio seu e configure `RESEND_API_KEY` + `RESEND_FROM`.
- **Stripe / WhatsApp**: deixe sem configurar — billing e follow-up ficam inativos, nada quebra.

## 8. Smoke test (10 min) — confirma que tudo funciona

1. [ ] `pnpm dev` → abrir o app → **criar sua conta** (sign-up via Clerk).
2. [ ] **Leads** → buscar ex.: 🇬🇧 Reino Unido · Manchester · Restaurantes · 10 leads → cards aparecem e o **score refina sozinho** em segundos (HTTPS/PageSpeed).
3. [ ] Escolher um lead quente → **Enviar pro CRM** → abrir o lead no CRM.
4. [ ] Aba Site → **Gerar preview** → abrir o link `/p/...` numa **aba anônima** → voltar: contador de abertura subiu e o card avançou (aba normal logada **não** conta — é o guard novo).
5. [ ] Aba Abordagem → **Escrever com IA** → conferir que o email cita a dor certa e tem o rodapé de opt-out → **Copiar** → enviar do seu email → **Marcar enviado**.
6. [ ] Outbox → quando alguém responder, **Respondeu**; se pedir pra parar, **Pediu opt-out**.
7. [ ] Dashboard → funil refletindo tudo.

---

**Resumo de custo:** Anthropic ~US$ 5 (única cobrança real) · Google R$ 0 (cartão + teto travado) · Convex/Clerk/PageSpeed R$ 0 · Resend/Vercel/Stripe/WhatsApp não usados.
