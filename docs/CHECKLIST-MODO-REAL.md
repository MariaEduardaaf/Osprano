# Checklist — do modo demo pro modo real (uso pessoal)

> Objetivo: rodar o Osprano de verdade, só pra você, nas primeiras semanas.
> **Custo total esperado: ~US$ 5** (créditos mínimos da Anthropic). Todo o resto fica no free tier.
> Tempo estimado: ~40 min, na ordem abaixo. Rode tudo a partir da raiz do projeto.

---

## 0. Antes de começar

- [ ] O app roda em modo demo (`pnpm dev` + seed) — nada a desfazer ainda; o demo será desligado no passo 6.
- [ ] Você está logada no terminal na pasta do projeto (`~/Developer/mine/osprano`).

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

### 3.0 Rotacionar a chave da Anthropic (antes de qualquer deploy)

A chave atual foi impressa num terminal durante a sessão de 2026-09-16. Trate como vazada:

- [ ] Em [console.anthropic.com](https://console.anthropic.com) → **API Keys**, crie uma chave nova.
- [ ] Grave a nova em todo deployment Convex que a usa:
  ```bash
  npx convex env set ANTHROPIC_API_KEY sk-ant-...          # dev
  npx convex env set --prod ANTHROPIC_API_KEY sk-ant-...   # prod, quando existir (seção 9)
  ```
- [ ] **Delete a chave antiga** no console. Só depois disso a rotação está completa.
- [ ] Nunca `echo`/`cat` de chave no terminal; pra conferir se está setada, `npx convex env get ANTHROPIC_API_KEY | cut -c1-12`.

- [ ] Crie a conta em [console.anthropic.com](https://console.anthropic.com).
- [ ] Em **Billing**, adicione os créditos mínimos (US$ 5) — cobre **~450 a 700 gerações** (rascunho de email ou script de ligação), dependendo da data. O app usa `claude-sonnet-5`, que está em preço promocional de US$ 2 / US$ 10 por milhão de tokens (entrada / saída) **até 31/08/2026**; depois disso passa a US$ 3 / US$ 15, e os mesmos US$ 5 rendem menos.
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

### 8.1 Modo opt-in (ligação primeiro) — mercados onde cold email é ilegal

Espanha, Itália, Portugal, Alemanha, Dinamarca e Suíça. Lá o cold email é
ilegal, mas **ligar para um número comercial B2B não é** — então o fluxo é
ligar primeiro e o email só destrava depois do consentimento.

1. [ ] **Leads** → aba **Ligação primeiro** → 🇪🇸 Espanha · Madrid · Restaurantes → os cards aparecem com **Ligar** em destaque, sem ação de email.
2. [ ] Conferir a faixa discreta de **validação jurídica pendente** com o nome do país.
3. [ ] **Script de ligação** num card → sai em espanhol com a **tradução pt-BR ao lado** (você lê a tradução, o prospect ouve o original) e termina pedindo permissão pra mandar a prévia.
4. [ ] **Gerar preview** ANTES de ligar — é a prévia que o script promete ao prospect.
5. [ ] Ligar de verdade. Se a pessoa autorizar, **Registrar consentimento** → origem "Ligação" + nota do que foi dito.
6. [ ] Confirmar que o card passa a mostrar **✓ Consentimento registrado** e que, no CRM, a aba Abordagem agora deixa escrever o email.
7. [ ] Teste do guardrail: tentar escrever/enviar email para um lead espanhol **sem** consentimento → precisa dar erro ("registre o consentimento do prospect antes de enviar email"). Isso é garantido no servidor, não só na tela.

> **O que o prospect recebe no idioma dele:** script de ligação, email, rodapé
> de opt-out, página de cancelamento e a prévia do site. Nada disso sai em
> português — só a tradução do script, que é para você.
>
> **Suíça:** o idioma sai da cidade, não do país. Genebra, Lausanne,
> Neuchâtel, Fribourg e Sion → francês. Lugano, Bellinzona, Locarno e
> Chiasso → italiano. O resto → alemão, que também é o padrão para cidade
> que o sistema não conhece. O painel de script mostra qual idioma saiu —
> confira antes de discar.

## 9. Produção (Vercel + Convex prod): grátis

Até aqui tudo roda na sua máquina (`pnpm dev` + deployment dev do Convex). Esta seção põe o app na internet: abre de qualquer lugar e o link da prévia funciona no celular do prospect.

> **Dev e prod são dois deployments Convex separados**, cada um com o próprio banco e as próprias variáveis. Nada que você setou com `npx convex env set` até aqui existe em prod; tudo precisa ser gravado de novo com `--prod` (ou no dashboard, Production → Settings → Environment Variables).

### 9.1 Convex prod

- [ ] `npx convex login` (se este terminal ainda não estiver logado).
- [ ] `npx convex deploy`: na primeira vez cria o deployment de **produção** do projeto `osprano`; nas seguintes, atualiza. Anote a URL que ele imprime (`https://<nome>.convex.cloud`): é o `NEXT_PUBLIC_CONVEX_URL` de prod.
- [ ] Variáveis de prod:
  ```bash
  npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN https://<sua-app>.clerk.accounts.dev
  npx convex env set --prod ANTHROPIC_API_KEY sk-ant-...        # a chave NOVA (3.0)
  npx convex env set --prod GOOGLE_PLACES_API_KEY <sua-chave>
  # opcionais: GOOGLE_PAGESPEED_API_KEY, RESEND_API_KEY + RESEND_FROM
  ```
- [ ] **`CONVEX_ENV` não existe em prod** (e nunca com valor `development`): sem ela o deployment é tratado como produção, que é o que se quer (default-deny em `convex/lib/env.ts`). **`DEMO_MODE` também não existe em prod.**
- [ ] `APP_URL` fica pra depois do primeiro deploy na Vercel (9.4), porque depende da URL.

### 9.2 Clerk

- [ ] Sozinha, a instância **Development** do Clerk (`pk_test_` / `sk_test_`) serve em prod; ela mostra o selo de desenvolvimento e tem limite de usuários, mas você é 1. Quando quiser abrir pra outras pessoas, crie a instância **Production** no dashboard (exige domínio próprio), troque as chaves na Vercel e refaça o passo abaixo.
- [ ] Confirme que o template JWT `convex` existe na instância que vai usar e que o **Issuer domain** dele é o mesmo gravado em `CLERK_JWT_ISSUER_DOMAIN` no deployment prod (9.1). Instância diferente = issuer diferente = login passa no Clerk e o Convex recusa.

### 9.3 Vercel

- [ ] Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repo GitHub `MariaEduardaaf/Osprano`. Framework: **Next.js** (detectado sozinho); build e install padrão.
- [ ] **Environment Variables** (Production):
  - `NEXT_PUBLIC_CONVEX_URL` = a URL de **prod** do Convex (9.1), não a do `.env.local`;
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` e `CLERK_SECRET_KEY`;
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard`, `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard`;
  - **não** crie `NEXT_PUBLIC_DEMO` (em build de produção ela é ignorada, mas não deixe a variável lá pra confundir).
- [ ] **Deploy**. Anote a URL (`https://osprano-<algo>.vercel.app`).
- [ ] (Opcional) Pra Vercel deployar o Convex junto a cada push: Build Command `npx convex deploy --cmd 'pnpm build'` + variável `CONVEX_DEPLOY_KEY` (Convex dashboard → Production → Deploy Keys). Sem isso, `convex/` só vai pro ar quando você roda `npx convex deploy` na mão.

### 9.4 Depois do primeiro deploy

- [ ] Grave a URL da Vercel no Convex prod, sem barra no fim:
  ```bash
  npx convex env set --prod APP_URL https://osprano-<algo>.vercel.app
  ```
  Sem isso a abordagem por IA recusa gerar: o link da prévia não pode apontar pra `localhost`.
- [ ] Clerk: com a instância Development o domínio `*.vercel.app` costuma funcionar sem mexer. Se o login em prod cair em loop no `/sign-in` ou der erro de origem, é aqui: no dashboard do Clerk, adicione o domínio da Vercel em **Domains** (instância Production) ou **Allowed origins**, e confira as URLs de redirect pós-login (`/dashboard`).
- [ ] Deploys seguintes: `git push` na `main` faz a Vercel buildar sozinha; o Convex **não**: rode `npx convex deploy` sempre que mudar algo em `convex/` (ou ligue o opcional de 9.3).

### 9.5 Smoke test em prod (5 min)

1. [ ] Abrir a URL da Vercel → **login** (Clerk) → cai no Dashboard.
2. [ ] **Leads** → buscar **1 lead** (ex.: 🇬🇧 Reino Unido · Manchester · Restaurantes · 1) → o card aparece com score.
3. [ ] Enviar pro CRM → aba Site → **Gerar preview** → abrir o link `/p/...` numa **aba anônima**: abre, e o contador de abertura sobe.
4. [ ] Aba Abordagem → **Escrever com IA** → o email cita a dor certa, o link da prévia tem o domínio da Vercel (não `localhost`) e o rodapé de opt-out está lá.

> Custo: **Vercel Hobby** é grátis pra uso pessoal e não comercial (quando o app virar receita, o plano é o Pro, US$ 20/mês). **Convex prod** entra no mesmo free tier do projeto (1M function calls/mês somando dev e prod).

## Estado em 2026-09-18 (feito nesta data)

- Convex: projeto `osprano` no time `madualvesfr`. Dev na nuvem `ardent-jay-971` (o `localhost:3000` usa este); **produção `oceanic-porcupine-674`**, com `APP_URL=https://osprano.vercel.app` e `CLERK_JWT_ISSUER_DOMAIN` setados. Sem `DEMO_MODE`/`CONVEX_ENV` em prod.
- Clerk: aplicação "Soprano" (instância de desenvolvimento, `pk_test`), template JWT `convex` criado, conta `madualvesfr@gmail.com`.
- Vercel: projeto `osprano` na conta MariaEduardaaf, ligado ao GitHub `MariaEduardaaf/Osprano`; **https://osprano.vercel.app** no ar. Push na `main` redeploya o Next; `convex/` só sobe com `npx convex deploy`.
- Dados: os 44 leads, sites e fotos do demo foram migrados para a conta real (mutation interna `admin:adoptOrg`) e copiados para produção. Dev e prod divergem a partir daqui: **trabalhe em produção** (é o link que o prospect abre).
- Pendentes: `ANTHROPIC_API_KEY` (só se quiser o "Escrever com IA" dentro do app), `GOOGLE_PLACES_API_KEY` (quando o billing do Google ativar; setar com `--prod`), Resend (opcional).

## 10. Primeiros leads, passo a passo

> Depois do smoke test (seção 8) ou já em produção (seção 9), o fluxo do dia a dia com o app como ele é hoje.

1. [ ] **Leads** → buscar no **OpenStreetMap** (grátis, sem chave) ou no **Google** (quando a `GOOGLE_PLACES_API_KEY` existir, seção 4) → escolher um lead quente → **Enviar pro CRM**.
2. [ ] No CRM, abrir o lead → aba **Site** → **Editar site** → escolher modelo e paleta, ajustar textos, itens, horário e contato, subir foto → **Salvar** → **Abrir preview** e conferir no celular.
3. [ ] Abordagem, conforme o mercado:
   - **Mercado opt-out** (🇬🇧 GB · 🇳🇱 NL · 🇮🇪 IE · 🇸🇪 SE · 🇳🇴 NO): o e-mail por IA sai direto, só para empresa incorporada ou caixa genérica (pessoa física continua fora, "a armadilha do autônomo" da seção 8.1).
   - **Autônomo, ou mercado opt-in** (🇪🇸 ES · 🇮🇹 IT · 🇵🇹 PT · 🇩🇪 DE · 🇩🇰 DK · 🇨🇭 CH): ligar primeiro na aba **Ligação primeiro**, **registrar consentimento**, só depois o e-mail destrava.
4. [ ] **Copiar** o e-mail (o rodapé de descadastro vai junto, obrigatório, não dá pra tirar) e enviar do seu próprio e-mail → **Marcar enviado**.
5. [ ] Definir a **próxima ação** (data + nota): ela aparece na faixa **Hoje** quando vencer ou atrasar.
6. [ ] Ao fechar: aba Site → **Publicar**. O link `/site/<slug>` vira o site do cliente; salvar de novo depois de publicado **altera o site no ar na hora**, sem republicar.

> O link do preview só funciona para o prospect depois que o app está no ar (seção 9); em `localhost`, só você abre. No **modo demo**, sua própria abertura do preview conta como se fosse o prospect (não há sessão real pro guard comparar): não confie no contador de aberturas testando por aí.

---

**Resumo de custo:** Anthropic ~US$ 5 (única cobrança real) · Google R$ 0 (cartão + teto travado) · Convex dev + prod / Clerk / PageSpeed R$ 0 · Vercel Hobby R$ 0 (uso pessoal) · Resend/Stripe/WhatsApp não usados.
