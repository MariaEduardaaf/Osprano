# Stack Research

**Domain:** SaaS de prospecção B2B (Next.js 16 + Convex + Clerk + Resend + Stripe) — automação da prospecção (milestone v1.3)
**Researched:** 2026-09-26
**Confidence:** HIGH para primitivas Convex e para o status das APIs de busca (verificado em docs oficiais); MEDIUM para preço exato de Serper/Brave (fontes de terceiros, não a página oficial de pricing, mas convergentes)

## Contexto para quem for decidir

O repo já tem um padrão bem definido: toda integração externa (Google Places, Overpass/Nominatim, Stripe, Resend, WhatsApp Graph API) é feita com `fetch` cru, sem SDK — inclusive a verificação de assinatura de webhook do Stripe é HMAC manual com Web Crypto (`convex/lib/stripe.ts:verifyStripeSignature`), não o pacote `stripe`. O pacote `resend` já está no `package.json` mas **nunca é importado** (`convex/outreach.ts` chama `https://api.resend.com/emails` via `fetch`). Essa pesquisa segue o mesmo estilo: quase tudo que a v1.3 precisa dá para fazer com o que já está instalado (`convex`, `fetch`, `crypto`/Web Crypto nativos). As poucas coisas que exigem uma decisão de custo/infra estão marcadas **[NOVA DEPENDÊNCIA/SERVIÇO — PRECISA DE APROVAÇÃO]**.

## Recommended Stack

### Core Technologies (primitivas já instaladas, sem pacote novo)

| Tecnologia | Versão no repo | Uso na v1.3 | Por que |
|------------|---------|---------|-----------------|
| `ctx.scheduler.runAfter` | `convex@^1.42.1` (nativo) | Encadear o pipeline pós-seleção: gerar preview → escrever mensagem com IA → decidir canal → enviar/enfileirar. Já é o padrão do repo (`places.ts`/`osm.ts` agendam `scoring.scoreLead` assim). | Zero infra nova. Cada etapa vira uma action/mutation encadeada por `runAfter(0, ...)`; erro numa etapa não trava a busca (mesmo padrão de try/catch + refund já usado). |
| `cronJobs()` de `convex/server` | `convex@^1.42.1` (nativo) | Dois cron jobs novos em `convex/crons.ts` (arquivo ainda não existe no repo): (1) resetar o teto diário de envio automático em mercados opt-out; (2) varredura diária de "lead sem resposta há N dias, mercado permite email, sem bounce/opt-out" → dispara follow-up. | Nativo do Convex desde sempre, não é um componente separado — não aparece no `package.json` porque já vem dentro de `convex`. A varredura diária (em vez de pré-agendar um `runAfter` de N dias por lead) verifica o estado REAL no momento do envio (respondeu? foi suprimido?), o que um `runAfter` de longo prazo não garante sem lógica extra de cancelamento (`ctx.scheduler.cancel`). |
| `crypto.subtle` (Web Crypto, nativo) | Node/Convex runtime | Verificar a assinatura dos webhooks novos do Resend (Svix: HMAC-SHA256 sobre `${svix-id}.${svix-timestamp}.${body}`, secret com prefixo `whsec_` removido e decodificado de base64 antes de virar chave). | Mesmo padrão exato já usado em `verifyStripeSignature`. Evita instalar o pacote `svix` (ver "What NOT to Use"). |
| Contador em `workspaces` (schema Convex) | — | Teto diário de envio automático (feature 3): novo campo tipo `autoSendCount`/`autoSendDay` no doc de `workspaces`, seguindo o mesmo padrão de `leadsUsed`/`periodStart` + `reserveUsage`/`refundUsage` já existentes em `convex/model/workspace.ts`. | É exatamente o mesmo mecanismo que já existe para a cota mensal de leads/sites — só muda a janela (dia em vez de mês) e o gate (bloqueia envio automático, não desconto de plano). Não precisa de rate limiter externo. |

### Novo serviço externo (não é pacote npm, é uma API paga por uso)

| Serviço | Uso | Por que recomendado | Custo |
|---------|------|----------------------|-------|
| **Serper.dev** ⚠️ **[NOVO SERVIÇO — PRECISA DE APROVAÇÃO]** | Verificação "tem site de verdade?" (feature 1) + descoberta de Instagram/Facebook (feature 5), **numa única chamada por lead**: busca `"<nome do negócio>" <cidade>` e parseia os resultados — se um resultado aponta pro domínio próprio do negócio (não bate com `NOT_A_SITE_SUFFIXES` de `convex/lib/domain.ts`), tem site de verdade; se aparece `instagram.com/...` ou `facebook.com/...` nos resultados, vira sugestão de rede social. | Proxy de resultados reais do Google, sem SDK (`fetch` puro num endpoint REST, igual ao Places/Overpass). Cobre as duas necessidades (site + redes sociais) com uma chamada só, o que os concorrentes SERP também fazem, mas Serper é o mais barato do grupo pesquisado. | Sem assinatura: crédito pré-pago. Conta nova ganha ~2.500 buscas grátis; depois **$0,30–$1,00 por 1.000 buscas** (1 crédito = até 10 resultados). Créditos válidos 6 meses. Amarrado ao volume de leads REALMENTE inseridos (mesmo ponto do pipeline que hoje agenda `scoring.scoreLead`): plano Free (60 leads/mês) ≈ centavos/mês; Pro (2.000/mês) ≈ US$0,60–2/mês; Agency (10.000/mês) ≈ US$3–10/mês. |

### Supporting Libraries (nenhuma nova — reaproveitar o que já existe)

| Biblioteca | Versão | Uso | Quando usar |
|---------|---------|---------|-------------|
| `fetch` nativo + `AbortController` | runtime Convex | Domain-guessing + HTTP HEAD como pré-filtro grátis antes de gastar crédito do Serper (ver "Stack Patterns by Variant" abaixo). | Sempre como primeira tentativa, barata e sem chave de API — mas só como SINAL, não como veredito sozinho (ver ressalva abaixo). |
| `resend` (pacote já em `package.json`, `^6.17.2`) | já instalado, não importado hoje | Continuar usando `fetch` cru para `POST /emails` (padrão do repo) — só adicionar o campo `scheduledAt` no corpo JSON se algum dia quiser agendamento no lado do Resend. | **Não é necessário para a v1.3**: o cron sweep do Convex (acima) já decide "enviar follow-up agora" checando o estado atual do lead no momento da execução — agendar no Resend com `scheduledAt` duplicaria essa decisão e criaria uma janela em que um lead que respondeu ainda receberia o follow-up já agendado (o Resend não sabe de reply; cancelar exigiria guardar o `email_id` e chamar `DELETE /emails/{id}` no webhook de reply — mais estado pra manter do que o cron já resolve sozinho). |

## Installation

Nenhum `npm install` é necessário para o que está recomendado acima. A única ação de setup é uma variável de ambiente nova (mesmo padrão de `GOOGLE_PLACES_API_KEY`/`RESEND_API_KEY`):

```bash
npx convex env set SERPER_API_KEY "..."       # se aprovado o uso do Serper
npx convex env set RESEND_WEBHOOK_SECRET "..." # whsec_... do dashboard do Resend, se aprovado o webhook
```

## Alternatives Considered

| Recomendado | Alternativa | Quando a alternativa faz sentido |
|-------------|-------------|-------------------------|
| Serper.dev para verificação de site + redes sociais | **Brave Search API** | Só se ela topar a exigência de atribuição visível ("powered by Brave") em troca do crédito mensal de US$5 — sem isso a conta cobra desde a primeira busca. Perdeu o tier grátis em fev/2026 (era até 5.000 buscas/mês grátis em 2025); hoje exige cartão cadastrado mesmo no crédito gratuito. Mais caro e com mais fricção que o Serper para o mesmo resultado. |
| Serper.dev | **SerpApi** | Só se precisar de recursos que o Serper não tem (ex.: parsing de mais motores de busca além do Google). Pricing por assinatura mensal (US$25 a US$2.750/mês) é ordem de grandeza mais caro que o pré-pago do Serper para o volume desta app (dezenas a milhares de leads/mês, não dezenas de milhares). |
| Serper.dev / busca na web | **Google Custom Search JSON API** | **Não é mais uma opção viável para uma integração nova**: a API está fechada para clientes novos desde 2026 e será desligada em 1º/jan/2027 mesmo para quem já tinha acesso. Só citando para descartar — não adotar. |
| Cron sweep do Convex decidindo "enviar follow-up agora" | `scheduledAt` do Resend (agendamento no lado do provedor) | Só valeria a pena se o volume de follow-ups crescesse tanto a ponto do cron diário do Convex virar gargalo de execução — não é o caso na escala desta app (dezenas/centenas de leads ativos por org). |
| Domain-guessing + HEAD como pré-filtro grátis | Pular direto pro Serper em 100% dos leads | Se a taxa de acerto do domain-guessing (percentual de leads em que o palpite bate com um site real) for baixa o suficiente pra não valer a complexidade — só descobre medindo depois de implementado; comece sem o pré-filtro se quiser menos código, o custo do Serper sozinho já é baixo. |

## What NOT to Use

| Evitar | Por quê | Usar no lugar |
|-------|-----|--------------|
| `@convex-dev/workpool`, `@convex-dev/rate-limiter`, `@convex-dev/action-retrier` ⚠️ **[NOVA DEPENDÊNCIA]** | Três pacotes novos (nenhum ainda em versão 1.0 — 0.4.12, 0.4.0 e 0.3.1 respectivamente, API pode quebrar), pensados para volume alto e paralelismo real (filas com milhares de jobs concorrentes). O `rate-limiter` nem instala hoje sem bump do Convex (`peerDependency convex ^1.43.0`; o repo está em `^1.42.1`), e o `workpool` traz junto mais uma dependência transitiva (`convex-helpers`). Na escala desta app (um usuário por org, dezenas/centenas de leads processados por dia) o `ctx.scheduler.runAfter` + `cronJobs()` nativos resolvem tudo que a v1.3 pede, sem esses pacotes. | `ctx.scheduler.runAfter` para encadear passos; `cronJobs()` para varreduras periódicas; um contador no schema (igual `leadsUsed`) para o teto diário. Revisitar só se o volume crescer muito (milhares de envios/dia) ou se a lógica de retry ficar complexa demais para manter à mão. |
| `svix` (pacote npm) ⚠️ **[NOVA DEPENDÊNCIA]** | Os webhooks do Resend passam pelo Svix, mas a verificação é HMAC-SHA256 simples — o mesmo esquema que o Stripe usa (`t.` + corpo, comparar hex). Instalar uma lib só pra isso duplica o que `convex/lib/stripe.ts` já resolve à mão. | Reaproveitar/generalizar `verifyStripeSignature` (ajustando o formato do header, que no Svix é `svix-id`/`svix-timestamp`/`svix-signature` em vez do `t=/v1=` do Stripe) em `convex/lib/resend.ts` novo. |
| Google Custom Search JSON API | Fechada para clientes novos em 2026, desligamento anunciado para 1º/jan/2027. Não adotar para uma integração nova mesmo que o preço pareça competitivo (US$5/1.000 buscas). | Serper.dev (ver acima). |
| Graph API do Meta (Instagram/Facebook) para *descobrir* perfis de negócios que a app ainda não conhece | A Graph API de busca de negócio (`Business Discovery`) só devolve dados de contas Instagram Business **já conectadas ao app** via login OAuth — não existe endpoint de busca pública "ache o Instagram deste CNPJ/nome". Tentar automatizar por aqui exigiria o próprio dono do negócio logar no app, o que não é o fluxo (a Duda está prospectando quem ela ainda não fala). Consistente com a decisão já tomada no produto: "o envio em rede social é manual (Instagram/Facebook proíbem automação)". | Busca na web (Serper) com os resultados já vindo como link clicável — é literalmente o que um humano faria manualmente, só automatizado na parte de achar o link. |
| Places Details / mais chamadas de Text Search como verificador de site | Competiria pela MESMA cota de produção (30 buscas/dia) que a descoberta já usa — gastar essa cota em verificação reduziria quanto ela consegue prospectar por dia. Além disso, para leads vindos do OSM (que não têm `placeId` do Google) seria preciso uma busca por nome+endereço, arriscando casar com o negócio errado. | Serper.dev, que tem orçamento próprio (créditos/pré-pago) independente da cota do Places. |

## Stack Patterns by Variant

**Se o objetivo é economizar crédito de busca (custo importa mais que velocidade de implementação):**
- Rode primeiro o domain-guessing: monte candidatos a partir do nome do negócio (slug sem acento/espaço) cruzado com o TLD do país (`.co.uk`/`.uk` para GB, `.nl`, `.ie`, `.se`, `.no`, `.de`, `.ch`, `.it`, `.es`, `.pt`, `.dk`, mais `.com` genérico) e faça `fetch` com `method: "HEAD"` e timeout curto (reaproveitar o padrão de `AbortController` + `setTimeout(() => controller.abort(), ...)` já usado em `convex/osm.ts` pro Overpass). Servidor que não responde HEAD (alguns retornam 405) → tentar `GET` com `redirect: "follow"` só lendo os headers.
- Trate um domínio que respondeu 200 como **sinal**, não veredito: rode a URL encontrada pela MESMA `classifyWebsite()` de `convex/lib/domain.ts` (ela já sabe separar rede social/link-in-bio de site de verdade) antes de aceitar. Um domínio genérico "parqueado" ou de outro negócio com nome parecido pode responder 200 e enganar — é por isso que este passo é um pré-filtro barato, não a fonte de verdade sozinha.
- Só chame o Serper para os leads em que o domain-guessing não achou nada (a maioria, já que a maior parte de negócio pequeno não registra domínio nenhum) — corta o número de chamadas pagas sem perder cobertura.

**Se o objetivo é implementar rápido e o custo do Serper já é irrelevante pro orçamento dela (ver tabela de custo acima):**
- Pule o domain-guessing e chame o Serper direto pra todo lead recém-inserido, no mesmo ponto do pipeline em que hoje `places.ts`/`osm.ts` chamam `ctx.scheduler.runAfter(0, internal.scoring.scoreLead, ...)`. Menos código, um serviço a menos pra manter.

**Se a decisão for automatizar o follow-up (feature 6) sem esperar a config de DNS do Resend Inbound:**
- Existem dois caminhos e a diferença é justamente saber ou não que o lead respondeu:
  1. **Webhooks de entrega do Resend** (`email.bounced`, `email.complained`, `email.opened`) — **não exigem mudança de DNS**, só uma URL de webhook nova em `convex/http.ts` (ex.: `/resend/webhook`) e o secret cadastrado no dashboard do Resend. Dá pra suprimir automaticamente quem reclamou (`suppressions`, já existe a tabela) e não mandar follow-up pra quem tomou bounce. **Ganho imediato, esforço baixo.**
  2. **Resend Inbound** (receber a RESPOSTA de verdade do prospect) — exige configurar um subdomínio de recebimento com registros MX apontando pro Resend (mudança de DNS, é operacional, não só código) e um endereço de `Reply-To` distinto por outreach (ex.: `reply+<leadId>@inbound.osprano.<domínio>`). Só assim dá pra saber com certeza que o lead respondeu e cancelar o follow-up automaticamente — sem isso, "respondeu" continua dependendo da usuária clicar em "Respondeu" manualmente (o `markReplied` que já existe), e o follow-up automático correria o risco de mandar mensagem pra quem já respondeu mas ela ainda não marcou. **Ganho maior, exige decisão de infra (DNS) e é o que efetivamente destrava a automação segura do follow-up.**
- Recomendação: implementar (1) de qualquer forma (barato, sem infra nova); decidir (2) com ela antes de automatizar o follow-up de verdade, porque envolve DNS de um domínio que é dela.

## Version Compatibility

| Pacote/serviço | Compatível com | Notas |
|-----------|-----------------|-------|
| `convex@^1.42.1` (já instalado) | `cronJobs()`, `httpRouter`, `ctx.scheduler.runAfter/cancel` | Todos nativos há várias versões — nenhum bump necessário para o que está recomendado. |
| `@convex-dev/rate-limiter@0.4.0` (se um dia for aprovado) | exige `convex@^1.43.0` | O repo está em `^1.42.1` — bump de versão do Convex seria pré-requisito, mais um motivo pra não adotar agora sem necessidade real. |
| `@convex-dev/workpool@0.4.12` (se um dia for aprovado) | exige `convex@^1.36.1` + `convex-helpers@^0.1.94` | Traz uma segunda dependência nova (`convex-helpers`) junto. |
| Serper.dev | Nenhuma dependência de código — só `fetch` + header `X-API-KEY` | Endpoint `POST https://google.serper.dev/search`, corpo `{ q: "..." }`, mesmo estilo de chamada que `places.ts`. |
| Resend webhooks (Svix) | Nenhuma dependência de código — verificação manual com Web Crypto | Formato do header difere do Stripe (`svix-id`/`svix-timestamp`/`svix-signature` vs `t=/v1=`); a função de verificação precisa ser adaptada, não só copiada. |

## Sources

- https://developers.google.com/custom-search/v1/overview — confirmado via WebFetch: API fechada para clientes novos, free tier 100/dia, US$5/1.000 acima disso, desligamento 1º/jan/2027.
- https://resend.com/docs/webhooks/introduction e https://resend.com/docs/webhooks/verify-webhooks-requests — lista de eventos (`email.sent/delivered/bounced/complained/opened/clicked/received`...) e verificação via Svix.
- https://resend.com/features/inbound e https://resend.com/docs/dashboard/receiving/introduction — recebimento de email (GA desde fim de 2025), exige domínio de recebimento configurado.
- https://resend.com/docs/dashboard/emails/schedule-email e https://resend.com/blog/introducing-the-schedule-email-api — `scheduledAt` (ISO 8601 ou linguagem natural), até 30 dias à frente, sem anexos.
- https://docs.svix.com/receiving/verifying-payloads/how-manual — formato exato da assinatura manual (HMAC-SHA256 sobre `id.timestamp.body`, secret `whsec_` decodificado em base64).
- Serper.dev (via WebSearch, múltiplas fontes de terceiros convergentes: coldiq.com, apiserpent.com, serp.fast) — pré-pago, ~2.500 buscas grátis na conta nova, US$0,30–1,00/1.000 buscas depois.
- Brave Search API (via WebSearch: implicator.ai, costbench.com, agentdeals.dev) — perdeu tier grátis sem cartão em fev/2026; hoje crédito de US$5/mês exige cartão e atribuição visível da marca.
- SerpApi (via WebSearch: trustradius.com, costbench.com) — planos de assinatura US$25 a US$2.750/mês, 100 buscas grátis/mês no plano gratuito.
- https://www.convex.dev/components/workpool, https://www.convex.dev/components/retrier — descrição oficial dos componentes; versões e peer dependencies confirmadas via `npm view` (0.4.12/0.4.0/0.3.1, exigindo respectivamente `convex@^1.36.1`+`convex-helpers`, `convex@^1.43.0`, `convex@^1.24.8`).
- Código do próprio repo (`convex/places.ts`, `convex/osm.ts`, `convex/outreach.ts`, `convex/lib/stripe.ts`, `convex/lib/domain.ts`, `convex/lib/env.ts`, `convex/model/workspace.ts`, `convex/schema.ts`, `convex/http.ts`) — padrões de fetch cru, verificação manual de assinatura, reserve/refund de cota, e confirmação de que `resend` (pacote) está instalado mas não importado.

---
*Stack research for: automação da prospecção (Osprano v1.3)*
*Researched: 2026-09-26*
