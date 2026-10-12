# Prontidão de lançamento self-serve (v1.3)

**Pesquisado:** 2026-10-12. Auditoria só leitura do código. Nenhum valor de env foi lido.
**Confiança:** ALTA nas afirmações de código (arquivo:linha). MÉDIA nas práticas externas (docs oficiais Stripe/Convex).

## Resumo em uma frase

O núcleo multi-tenant está limpo (cada cliente novo ganha um workspace vazio e isolado, e as mutations admin são todas `internal`). O que bloqueia o primeiro cliente é outra coisa: **todo e-mail sai do remetente da Duda** (`RESEND_FROM` global), **plano pago não libera nada que o grátis não faça**, **a landing promete coisas que o produto não faz**, não há termos/privacidade, e o fluxo de cobrança não trata pagamento falho.

---

## 1. Signup para workspace

**O que acontece com um usuário novo do Clerk**
- `requireOrgId` devolve `identity.subject` do Clerk, ou seja, **um workspace por usuário, não por organização** (`convex/model/tenant.ts:16-22`). Comentário confirma: "MVP: one workspace per Clerk user" (`tenant.ts:12-13`).
- Não há linha de workspace até o primeiro uso: `workspaces.current` devolve `plan: "free"` e zeros quando `ws` é nulo (`convex/workspaces.ts:13-22`). A linha é criada preguiçosamente por `ensureWorkspace` na primeira reserva de cota ou no checkout (`convex/model/workspace.ts:15-29`, chamado por `reserveUsage` via `ensureFresh`, `workspace.ts:32-33,52`).
- **Resultado: workspace vazio e utilizável, sem dados demo e sem erro.** Os seeds de demo só rodam com `DEMO_MODE=1` E `CONVEX_ENV=development` (`tenant.ts:7-9`, `convex/demo.ts:261,278`), default-deny em produção. O proxy também só libera sem auth se `NODE_ENV !== "production"` (`src/proxy.ts:27-29`).
- A tabela `users` existe no schema (`convex/schema.ts:46-49`) mas **ninguém grava nela** (grep em `convex/` e `src/` não acha escrita). Consequência: não existe lista de clientes no banco.

**Vazamento entre tenants / caminhos só da Duda**
- `convex/admin.ts` inteiro usa `internalMutation`/`internalQuery` (linhas 14, 59, 70, 83, 106 e demais): não chamáveis pelo navegador. `adminActions.discover` é `internalAction` (`convex/adminActions.ts:11`). OK, sem vazamento por ali.
- Todas as funções de cliente que li usam `requireOrgId` e checam `lead.orgId !== orgId` (ex.: `outreach.ts:166-167`, `328`, `suppress` `outreach.ts:470-476`).
- Pontos que **funcionam só porque orgId = id do usuário** e quebram se um dia migrar para Clerk Orgs: `recordOpen` compara `identity.subject === preview.orgId` (`convex/previews.ts:198-199`).
- `adoptOrg` varre `uploads` e `suppressions` inteiras sem índice (`admin.ts:28-36`). Sem risco para cliente, mas é manutenção que não escala.
- `generateUploadUrl` só exige login (`previews.ts:108-114`): qualquer usuário, inclusive grátis, sobe arquivo para o storage sem cota de bytes. Ver abuso (seção 4).
- **Supressão é por org** (`convex/suppressions.ts:12-22`, `isEmailSuppressed` `:48-57`; global só se `orgId` undefined). Uma pessoa que clica em "descadastrar" no e-mail do cliente A continua recebendo do cliente B. Decisão jurídica a tomar (lista global de opt-out do operador é o padrão mais seguro).

**Gaps desta seção**
| # | Gap | Bloqueia? |
|---|-----|-----------|
| 1.1 | Nada de onboarding: primeira tela pós-cadastro é o dashboard vazio (ver seção 3) | Sim |
| 1.2 | Sem perfil de workspace (nome, identidade de remetente, idioma, mercados): não existe tabela nem tela. `workspaces` só tem plano/uso/Stripe (`schema.ts:51-64`) | Sim |
| 1.3 | `users` sem escrita: sem painel de clientes | Logo depois (mas sem isso a Duda não sabe quem pagou, ver 4) |

---

## 2. Cobrança

**Fluxo hoje**
1. `/plans` chama `billing.createCheckout` (`src/app/(app)/plans/page.tsx:12-24`). A action cria o customer na Stripe (`convex/billing.ts:26-33`) e a Checkout Session `mode: subscription` com `metadata.orgId/plan` (`billing.ts:35-46`). `success_url = APP_URL/plans?status=success` (`billing.ts:40`); a página **não lê `?status=success`**, então não há tela de "pagamento recebido" (grep no arquivo: nenhum `searchParams`).
2. Webhook em `${CONVEX_SITE_URL}/stripe/webhook` (`convex/http.ts:22-60`): verifica HMAC (`convex/lib/stripe.ts:38-63`) e trata só 3 eventos: `checkout.session.completed` (plano vem de `metadata.plan`, status fixo "active", `http.ts:36-42`), `customer.subscription.updated` e `.deleted` (plano derivado do `price_id`, `http.ts:43-56`).
3. `applySubscription` acha o workspace por `stripeCustomerId` e grava plano/status (`workspaces.ts:66-85`). Se achar `canceled` ou `unpaid`, volta para `free` (`workspaces.ts:79-81`).
4. Portal: `billing.portal` (`billing.ts:52-68`), exige `stripeCustomerId`.

**Lacunas concretas**
- **`past_due` não faz nada.** Só `canceled`/`unpaid` rebaixam (`workspaces.ts:79`). `incomplete_expired` e `paused` também ficam de fora. Não existe tratamento de `invoice.payment_failed` (nenhum handler em `http.ts`) nem aviso ao cliente. A doc da Stripe manda notificar o cliente em `past_due` e revogar acesso em `canceled`/`unpaid` (https://docs.stripe.com/billing/subscriptions/webhooks).
- **`checkout.session.completed` marca "active" sem olhar `payment_status`** (`http.ts:36-42`). Com método assíncrono (SEPA), a sessão pode completar antes do dinheiro.
- **Rebaixar não limpa nada**: `leadsUsed` continua, plano volta a `free` com 60 leads/mês (`domain.ts:669`). Aceitável, mas o cliente que paga e cancela mantém o grátis para sempre.
- **Sem idempotência/ordem**: nenhum registro de `event.id` processado. Hoje `applySubscription` é um "last write wins" idempotente na prática (grava estado), mas um `subscription.updated` atrasado pode sobrescrever um mais novo (a Stripe não garante ordem, https://docs.stripe.com/webhooks). Mitigação barata: gravar `event.created` mais recente e ignorar eventos mais antigos, ou buscar a subscription na API a cada evento.
- **Sem tolerância de timestamp e comparação não constante**: `hex === v1` (`stripe.ts:62`), sem checar `t` (`stripe.ts:48-50`). É o BILL-05 do backlog; confirmado ainda aberto. Também só lê o primeiro `v1` (rotação de secret manda 2).
- **Clique duplo em "Assinar"** pode criar 2 customers (check-then-act em action, `billing.ts:24-33`, `setStripeCustomer` sobrescreve `workspaces.ts:57-63`) e **nada impede assinar de novo estando assinado** (`createCheckout` não olha `ws.plan`/`subscriptionStatus`): duas subscriptions, cobrança dupla.
- **Troca de plano pela UI** (`/plans`, plano ≠ atual) abre novo checkout em vez do portal: mesmo problema de assinatura duplicada para quem está no Pro e clica "Assinar Agência" (`plans/page.tsx:96-103`).
- **Imposto/IVA**: o checkout não pede `automatic_tax`, `tax_id_collection` nem endereço (`billing.ts:35-46`). Cliente é B2B europeu: sem isso a Duda emite fatura sem IVA correto. Decisão com contador/entidade (pré-requisito operacional já listado).
- **Preço anual**: a landing mostra toggle "Anual −30%" (`src/components/landing/pricing.tsx:22-37,48`) mas só existem dois price ids (`STRIPE_PRICE_PRO`/`AGENCY`, `billing.ts:8-10`), sem versão anual. O toggle só muda o número exibido: promessa que o checkout não cumpre.
- **Free plan sem trial**: existe plano Grátis permanente (60 leads/mês, 2 sites, `domain.ts:664-672`). Não há trial. Para o lançamento isso funciona como "freemium", mas custa Places/IA da Duda por usuário gratuito (ver 4).
- **Gating real não existe (BILL-04)**: `plan` só entra em `reserveUsage` para leads/sites (`workspace.ts:54`). Nenhuma checagem de plano em `outreach.draft`/`send`/`callScript` (grep `plan` em `convex/outreach.ts`: zero), nem em mercados ou categorias. As features listadas como pagas ("Outreach por IA", "Todas as categorias", "Todos os mercados opt-out", "Export CSV", `domain.ts:671,680-685`) estão liberadas para o grátis, e "5 categorias" no grátis não é imposta. "White-label + domínio próprio" e "Prioridade" no Agência (`domain.ts:692`) **não existem** (domínio próprio está explicitamente fora de escopo em PROJECT.md).
- Uso mensal reinicia 30 dias após `periodStart` (primeira reserva), não no ciclo de cobrança (`workspace.ts:6,34`). Cliente pode pagar dia 10 e ver reset dia 3.

**Variáveis de ambiente (só nomes)**
- Convex: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_AGENCY`, `STRIPE_WEBHOOK_SECRET`, `APP_URL`, `CLERK_JWT_ISSUER_DOMAIN`, `CONVEX_SITE_URL` (usado em `lib/env.ts`), `CONVEX_ENV` (só `development` liga demo/localhost), `RESEND_API_KEY`, `RESEND_FROM`, `ANTHROPIC_API_KEY`, `GOOGLE_PLACES_API_KEY`, `GOOGLE_PAGESPEED_API_KEY`, `FSQ_API_KEY`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` (lista de `process.env.*` em `convex/` e `src/`; SETUP.md:31-44).
- Next/Vercel: `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`. **Garantir que `NEXT_PUBLIC_DEMO` e `DEMO_MODE` NÃO existam em produção.**
- Atenção: `billing.ts:22,58` usa `APP_URL ?? "http://localhost:3000"` (default silencioso). Se `APP_URL` faltar em prod, o Stripe devolve o cliente para localhost depois de pagar. O restante do código tem a "regra da casa" de não ter default (`lib/env.ts:1-20`); billing não segue.

**Dá para testar ponta a ponta em modo teste?** Sim, nada no código distingue test/live (só as chaves). Roteiro:
1. Deploy de preview/dev Convex com `sk_test_`, dois prices de teste e `whsec_` de teste (Stripe CLI `stripe listen --forward-to <CONVEX_SITE_URL>/stripe/webhook` ou endpoint no dashboard).
2. Cartões de teste: sucesso `4242...`, 3DS, recusa; para falha de renovação, usar Test Clock ou cartão que falha na renovação, para provocar `past_due` (o fluxo de hoje não reage, é o teste que vai expor a lacuna).
3. Conferir no banco: `plan`, `stripeSubscriptionId`, `subscriptionStatus`. Trocar plano pelo portal e cancelar para ver `updated`/`deleted`.
4. **Prova de modo live**: criar produtos/prices live, `whsec_` live (endpoint live é separado do de teste), cobrança real mínima (ou cupom 100% off com cartão real) em conta própria, confirmar webhook "Delivered 200" no dashboard, depois cancelar e reembolsar. Configurar o Customer Portal em modo live (é uma config separada da de teste). Conferir fatura/recibo e IVA.
Nenhum desses passos foi executado nesta auditoria.

---

## 3. Onboarding, estados vazios e landing

**Estados vazios (dados zerados)**
- `/leads`: tem `EmptyState` com instrução ("Busque uma categoria numa cidade...", `leads/page.tsx:353-363`). Bom.
- `/sites` (`sites/page.tsx:27-28`) e `/outreach` (`outreach/page.tsx:110-111`) têm `EmptyState`.
- `/crm`: coluna vazia tratada (`crm/page.tsx:311`).
- `/dashboard`: só a lista de atividade tem vazio (`dashboard/page.tsx:238`). Não há call to action de "comece aqui".
- Não há nenhum checklist/tour de primeiro uso. O passo a passo existe só em `docs/CHECKLIST-MODO-REAL.md` seção 10 (documento para a Duda, não para cliente).

**Configurações necessárias antes de enviar: não existem na UI**
- `/settings` tem Perfil (Clerk), Segurança, Plano e uso (`settings/page.tsx:26-30`). **Nenhum campo de nome do remetente, e-mail de resposta ou dados da empresa.**
- Remetente: o envio usa `process.env.RESEND_FROM` global (`outreach.ts:512-513,521`). **Todo cliente envia como a Duda/Osprano**, com o nome dela no rodapé de opt-out (`senderIdentityFrom(from)`, `outreach.ts:531`, `lib/compliance.ts:155-160`) e na assinatura que a IA escreve (`callerNameFrom(process.env.RESEND_FROM)`, `outreach.ts:256,307`).
- **Não há `reply-to`** no payload do Resend (`outreach.ts:518-532`: só `from,to,subject,text,headers`). Respostas do prospect vão para o e-mail da Duda, não para o cliente. Isto sozinho inviabiliza vender o botão "enviar".
- Rodapé de opt-out não leva identidade do cliente (razão social, endereço postal): `optOutFooter(lang, url, senderIdentity)` só recebe um nome (`compliance.ts:46`). GDPR/PECR e a diretiva exigem identificar o remetente real. Decidir: (a) enviar pelo Resend com domínio verificado do cliente, (b) enviar pelo domínio Osprano com `From: "Nome do cliente via Osprano"` + `reply-to` do cliente + endereço do cliente no rodapé, ou (c) lançar com "copiar e enviar do meu e-mail" (já existe: `outreach.ts:` mensagem "copie a abordagem e envie do seu email"), eliminando o problema de remetente no lançamento. Recomendo (c) mais (b) como evolução; é decisão dela.
- Idioma da interface: tudo em português fixo (`<html lang="pt-BR">`, `layout.tsx:44`; categorias em pt-BR `domain.ts:708+`). Quem é "freelancer europeu" talvez não leia português. Não há seletor de idioma de interface nem de mercados favoritos. Mercados são escolhidos por busca. Idioma do e-mail ao prospect já é por país (`LANG`, `outreachAi.ts:5-11`).

**Landing (`src/app/page.tsx`, `src/components/landing/*`) vs. escopo de lançamento (sem envio automático)**
- "Você revisa e envia num clique" (`page.tsx:69`, `faq.tsx` item 3): **coerente** com o escopo. Nenhuma frase diz "envio automático" (grep `automa` sem match de envio).
- **Falso/enganoso para o lançamento:**
  - "você é notificado no instante em que o prospect abre" (`page.tsx:61`; FAQ item 4): não existe notificação (nem e-mail, nem push). O lead só muda de estágio no CRM (`previews.ts:183-211`).
  - "hospedagem white-label na sua marca", "O Osprano hospeda; você cobra todo mês" (`page.tsx:62,208`, FAQ item 5; planos `domain.ts:692`): domínio próprio/white-label está fora de escopo.
  - **Depoimentos inventados** com nomes, cidades e cargos (`page.tsx:74-77`: James Whitfield, Sophie Bakker, Liam O'Brien). Para produto pago isso é publicidade enganosa (risco em UE: Diretiva de Práticas Comerciais Desleais). Remover antes de abrir ao público.
  - Toggle "Anual −30%" sem preço anual (ver seção 2).
  - "Plano Pro: Outreach por IA / Todas as categorias" sem gating real.
  - Rodapé diz "© 2026 Osprano · compliant by design" (`page.tsx:635`). A promessa "compliant by design" é o Core Value; com supressão por org e remetente compartilhado, vale revisar o texto com o jurídico.
- **Preços:** a landing mostra os 3 planos puxados de `PLANS` (`pricing.tsx:10,44-60`): preço visível, bom. Falta dizer o que acontece ao passar do limite, moeda/IVA ("+IVA"), e política de cancelamento/reembolso.
- **Páginas legais: não existem.** `src/app` não tem rota de termos/privacidade/DPA/cookies (`ls src/app`: `(app) p site sign-in sign-up`). O rodapé só tem âncoras internas (`page.tsx:593-612`). O Clerk `SignUp` (`sign-up/.../page.tsx`) não exibe aceite de termos. Também não há contato de suporte em nenhum lugar da UI.
- Landing aponta CTA para `/sign-up` (`page.tsx:127`). Depois de cadastrar, o destino padrão do Clerk precisa ser conferido (`NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`, não verificado aqui) para cair em `/dashboard`.

---

## 4. Operação de um SaaS pago tocado por uma pessoa

Encontrado no código: **nenhum** monitor de erros (sem Sentry/PostHog em `package.json`; grep vazio), **nenhum** e-mail transacional próprio (grep `welcome`/`sendEmail`: vazio), **nenhuma** visão admin de clientes, **nenhum** cron (`ctx.scheduler.runAfter` só para `scoreLead`, `places.ts:135`, `osm.ts:230`, `foursquare.ts:94`; não há `crons.ts`).

### Antes do primeiro cliente (bloqueia)
| # | Item | Evidência / motivo |
|---|------|--------------------|
| M1 | Termos de Uso, Privacidade, DPA (Osprano é operador/processor dos dados dos leads do cliente) e aceite no cadastro | Não existem. Já listado no milestone; precisa de revisão jurídica (pré-requisito dela) |
| M2 | Remover depoimentos falsos e promessas que o produto não cumpre (notificação de abertura, white-label, anual) | Seção 3 |
| M3 | Resolver remetente do e-mail: `reply-to` + identidade e endereço do cliente no rodapé, ou lançar só "copiar e enviar" | `outreach.ts:512-532`, `compliance.ts:46` |
| M4 | Tratar `past_due`/`invoice.payment_failed`/`incomplete_expired` e impedir assinatura duplicada | Seção 2 |
| M5 | Gating por plano de verdade (IA, mercados, categorias) ou parar de anunciar o que não existe | `domain.ts:664-696` vs ausência em `outreach.ts` |
| M6 | Custo por cliente: cota de IA (`draft`/`callScript`) e teto diário global do Places. **Nenhum dos dois existe**: `draft` não reserva uso (`outreach.ts:217-276`), e não há limite diário de Places no código (PROJECT.md fala em 30 buscas/dia, mas nenhum contador). Um grátis pode queimar a chave da Duda | `places.ts:50-55` reserva só leads |
| M7 | Teto de envio por org/dia no botão enviar e no `markSent` | `send` sem limite (`outreach.ts:482-540`). Sem isso um cliente usa o domínio da Duda para spam e queima a reputação do Resend para todos |
| M8 | Sentry (ou equivalente) no Next e log de erros do Convex com alerta; hoje só `console.error` (`stripe.ts:22`, `outreach.ts` Resend) | Ver Convex Log Streams / dashboard |
| M9 | Canal de suporte visível (e-mail em rodapé e no app) e página de status simples | Inexistente |
| M10 | Onboarding mínimo: tela de boas-vindas com os 3 passos (busca, preview, mensagem) e campos de perfil do remetente | Seção 3 |
| M11 | Teste ponta a ponta do checkout em modo teste e smoke em live (roteiro na seção 2) | pedido do milestone |
| M12 | Backlog SCAL-02/03 e BILL-05: `leads.create` sem cota (`leads.ts:633-662`), `recordOpen` sem rate limit (`previews.ts:183`), webhook sem tolerância | Já em REQUIREMENTS |

### Logo depois
- E-mails transacionais: boas-vindas, "você chegou a 80% / 100% da cota", pagamento falhou (Stripe já envia recibo e pode enviar e-mails de falha se ligado em Settings, Billing, Customer emails; ligar isso é gratuito e cobre recibo e cobrança falha sem código).
- Painel admin (mínimo): query `internalQuery` + `npx convex run` listando workspaces com plano/uso/status/último uso. Preencher `users` via primeiro acesso resolve nome/e-mail.
- Exclusão e exportação de conta (GDPR art. 17 e 20): hoje "Apagar conta" só abre o perfil do Clerk (`settings/page.tsx:214-218`), e **os dados no Convex ficam órfãos** porque nada escuta o Clerk. Precisa: webhook do Clerk `user.deleted` para apagar leads/previews/outreach/uploads/eventos/supressões e cancelar assinatura na Stripe. `deleteLeadCascade` já existe (`model/leads.ts`, usado por `leads.remove`) e pode ser reaproveitado. Exportação: existe export CSV só como menção (`domain.ts`), conferir o que de fato exporta.
- Purge de 30 dias do Google Places (ToS; já no milestone).
- Limite de storage por org no upload (`previews.ts:108-114`).
- Moderação/abuso: denylist de domínios, bloqueio de conta (flag em `workspaces`), página de "conta suspensa". Hoje não existe como desligar um cliente abusivo sem apagar a conta no Clerk.
- UI de limites: a barra de uso existe em Configurações (`settings/page.tsx:244-267`) mas não aparece no topo do app nem avisa antes de estourar; erro de cota é só texto vermelho (`workspace.ts:57`).
- Política de reembolso/cancelamento, página de changelog.

---

## 5. Armadilhas de single-user para multi-tenant nesta stack

1. **Clerk Orgs vs usuário:** hoje tenant = `subject` do usuário. Agência com 2 pessoas não consegue compartilhar workspace; migrar para `org_id` depois exige reescrever `orgId` em todas as tabelas (já existe um `adoptOrg` como molde, `admin.ts:14-55`) e o claim `org_id` só chega ao Convex se o template JWT incluir. Para o lançamento: **ficar com usuário único e dizer isso no plano** (um login por conta). Evitar hardcode novo de `identity.subject === orgId` (`previews.ts:199`). Fonte: https://docs.convex.dev/auth/clerk (a página não cobre claims de org; validar no template JWT do Clerk).
2. **Auth em schedulers/crons:** `ctx.auth.getUserIdentity()` é nulo em funções agendadas e crons. O código atual está certo: `scoreLead` é interno e recebe `leadId`; admin recebe `orgId` explícito. Regra para as próximas fases (pipeline em rascunho, purge de 30 dias, avisos de cota): sempre passar `orgId` como argumento de `internal*`, **nunca** chamar `requireOrgId` dentro de job. Se alguém chamar `requireOrgId` num job com `DEMO_MODE` ligado cairia em `"demo"` (`tenant.ts:20`), e por isso garantir `DEMO_MODE` ausente em produção.
3. **Webhook da Stripe:** ordem não garantida, entrega duplicada possível, e só 3 eventos tratados (ver seção 2). Use `event.created` ou rebusque a subscription (https://docs.stripe.com/webhooks e https://docs.stripe.com/billing/subscriptions/webhooks). Eventos do dashboard/portal chegam sem `metadata.plan`: já resolvido por `planForPrice` (`stripe.ts:30-35`), mas se `STRIPE_PRICE_*` mudar (novo price anual, novo valor), `planForPrice` devolve `undefined` e o plano **fica no antigo em silêncio** (`workspaces.ts:81`). Registrar log/alerta nesse caso.
4. **Workspace criado preguiçosamente:** `applySubscription` retorna sem fazer nada se não acha o workspace (`workspaces.ts:78`). O checkout cria o customer e a linha antes (`setStripeCustomer` → `ensureWorkspace`), então hoje fecha. Se o pagamento vier de link de pagamento/Stripe dashboard sem passar pelo app, o evento é descartado sem log. Adicionar `console.error` + alerta.
5. **Custos compartilhados tratados como por-cliente:** chaves de Places, Anthropic, Resend e PageSpeed são do app. Qualquer cota "por plano" só protege se for **imposta no servidor por org** e houver teto global (circuit breaker). Ver M6/M7.
6. **Reputação de e-mail compartilhada:** um remetente para todos os clientes significa que um spammer derruba a entregabilidade de todos. Mitigar com teto de envio, suppression global e, no futuro, subdomínio por cliente.
7. **Queries `.collect()` sem paginação** viram custo e timeout com clientes de milhares de leads (SCAL-01; ex.: `listSites` `previews.ts:265-272`, `isEmailSuppressed` `.collect()` por e-mail `suppressions.ts:52-55`, `markApproached` `admin.ts:115`).
8. **Testar com 2 contas reais** (A e B) antes do lançamento: lead de A não aparece em B, token de preview `/p/<token>` só para o link, `/site/<slug>` não vaza token (corrigido no v1.2 conforme PROJECT.md, reconfirmar).

---

## Ordem sugerida para o roadmap

1. Honestidade e jurídico: remover depoimentos falsos e promessas, páginas Termos/Privacidade/DPA, aceite no cadastro, contato de suporte.
2. Identidade do remetente (`reply-to`, nome/endereço do cliente, rodapé) e tela de perfil do workspace; decidir (a)/(b)/(c) da seção 3.
3. Cobrança endurecida: `past_due`/falha/duplicidade, BILL-05, `APP_URL` obrigatório, tela de sucesso, IVA, preço anual ou tirar o toggle, gating real (BILL-04).
4. Controle de custo: cota de IA, teto diário Places, teto de envio, SCAL-02/03.
5. Onboarding e estados vazios com CTA; monitor de erros; status.
6. Depois: e-mails transacionais, painel admin, exclusão/exportação via webhook do Clerk, purge Places, moderação.

## Lacunas desta pesquisa
- Não li as telas `/crm`, `/outreach` e `/dashboard` linha a linha, só os estados vazios por busca.
- Não confirmei redirect pós-signup do Clerk nem as env do Vercel (sem ler `.env`, por regra).
- A tolerância padrão de 5 minutos do timestamp da Stripe é do conhecimento geral, a página de webhooks retornou truncada; marcar MÉDIA.
- Conferir se "Export CSV" existe de fato na UI (só achei referência em `domain.ts`).
- Aspectos legais (DPA, base legal, quem é controlador) precisam de advogado; esta pesquisa não é parecer jurídico.

## Fontes
- Stripe, eventos de assinatura e status: https://docs.stripe.com/billing/subscriptions/webhooks (MÉDIA/ALTA)
- Stripe, webhooks (ordem, duplicata, assinatura): https://docs.stripe.com/webhooks (MÉDIA)
- Convex + Clerk: https://docs.convex.dev/auth/clerk (ALTA; não cobre orgs/crons)
