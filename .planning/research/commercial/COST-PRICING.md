# Custo e preço do Osprano como assinatura

**Pesquisado em:** 2026-10-12 (todas as páginas oficiais abaixo foram abertas nesta data)
**Confiança geral:** MÉDIA. Preços de Google, Anthropic, Serper, Clerk, Resend, Vercel: ALTA (página oficial). Convex Pro e concorrentes: BAIXA a MÉDIA (ver "Não verificado"). Rendimento de leads sem site e tokens: ESTIMATIVA minha.

Convenção: US$ e € tratados 1:1 de propósito (superestima o custo; câmbio não verificado).

---

## 1. Custo de cada unidade de atividade

### 1a. Google Places Text Search

- Código: `convex/places.ts`. Máscara pedida: `places.id, displayName, formattedAddress, nationalPhoneNumber, websiteUri, rating, userRatingCount, primaryType, businessStatus, nextPageToken`.
- `nationalPhoneNumber`, `rating`, `userRatingCount` e `websiteUri` estão na lista do SKU **Text Search Enterprise** (confirmado em sku-details). O Google cobra pelo SKU mais alto da máscara, então toda chamada é Enterprise.
- Preço oficial: Text Search Enterprise **US$35 por 1.000 requisições até 100 mil/mês** (28 até 500 mil), **1.000 grátis por mês**. Pro seria US$32 com 5.000 grátis, mas só serve se tirar telefone, site e nota da máscara. IDs Only é grátis e ilimitado.
- Unidade de cobrança: **por requisição, não por resultado**. Cada requisição traz até 20 lugares; o código pagina até 3 vezes (`for page < 3`), então uma busca de 50 leads = até 3 requisições = US$0,105. Não achei na doc se cada página paginada conta como requisição separada; assumi que sim (pior caso).
- O código descarta quem já tem site (`keepOnlyWithoutSite`) depois de pagar a chamada. **Estimativa minha:** 15% dos resultados ficam sem site, ou seja ~3 leads aproveitáveis por requisição. Custo de descoberta por lead: US$0,035 / 3 = **~US$0,012**. Se o rendimento real for 30%, cai pela metade. Medir isso em produção é a primeira tarefa.
- O $200 de crédito mensal acabou em 01/03/2025; hoje é franquia grátis por SKU.
- Fontes: https://developers.google.com/maps/billing-and-pricing/pricing, https://developers.google.com/maps/billing-and-pricing/sku-details, https://developers.google.com/maps/billing-and-pricing/march-2025

**Consequência para a cota compartilhada:** a franquia grátis (1.000 requisições/mês) rende ~3.000 leads no app inteiro por mês. O teto atual de 30/dia (~900/mês) rende ~2.700 leads/mês para TODOS os clientes juntos. Com 10 clientes pagantes usando em média 300 leads/mês isso já estoura.

### 1b. Serper.dev

- Pacotes pré-pagos, sem mensalidade: US$50 = 50.000 créditos (**US$1,00 por 1.000**), US$375 = 500 mil (0,75), US$1.250 = 2,5 mi (0,50), US$3.750 = 12,5 mi (0,30). **Créditos valem 6 meses.** 2.500 consultas grátis sem cartão.
- Verificação planejada: 1 consulta "tem site?" + 1 para Instagram/Facebook = 2 consultas = **US$0,002 por lead** (uso US$0,003 com retentativas).
- Risco: créditos expiram; comprar o pacote de US$50 e consumir em <6 meses só é problema com menos de ~8 mil consultas/mês, o que não acontece. Sem plano mensal, o saldo zerar derruba a verificação; precisa alerta de saldo.
- Fonte: https://serper.dev (aberto hoje).

### 1c. IA de mensagem (Anthropic)

- Modelo no código: **`claude-sonnet-5`** em `convex/lib/outreachAi.ts` (linhas 751 e 828), `max_tokens` 700 (email) e 800 (script). Bate com `docs/CHECKLIST-MODO-REAL.md`.
- Preço oficial (platform.claude.com/docs/en/about-claude/pricing): **Sonnet 5 US$2 entrada / US$10 saída por milhão de tokens** (preço introdutório virou padrão, nota 3 da página). Sonnet 5.5 mesmo preço. Haiku 5.5 US$0,10 / US$0,50. Haiku 4.5 US$1 / US$5. Sonnet 4.6 US$3 / US$15.
- Tokens (estimativa minha, lendo os prompts): system prompt do email ~1.100 tokens (identidade + honestidade + observações + opt-out) + mensagem de usuário ~150; script ~1.300 + 150. Tokenizador novo gera ~30% mais tokens, então uso 1.400 e 1.600 de entrada. Saída típica: email ~300, script+tradução ~500.

| Chamada | Sonnet 5 | Haiku 5.5 | Haiku 4.5 |
|---|---|---|---|
| 1 email (1.400 in, 300 out) | US$0,0058 | US$0,0003 | US$0,0029 |
| 1 script (1.600 in, 500 out) | US$0,0082 | US$0,0004 | US$0,0041 |
| Média por "geração de IA" | **~US$0,007** | ~US$0,0004 | ~US$0,0035 |

- **Decisão: ficar no Sonnet 5.** A economia do Haiku é de US$0,0066 por geração, irrelevante. Já o histórico no próprio arquivo mostra o modelo desobedecendo regras duras (nome inventado, "aquí en Valencia"), em idiomas que a cliente não lê. Trocar para um modelo menor aumenta o risco de uma mensagem falsa sair assinada por ela. Não otimizar isso.
- Batch API e prompt cache dariam desconto, mas a economia é de centavos. Ignorar.

### 1d. Infra (tetos grátis e preço pago)

| Serviço | Grátis | Pago | Observação |
|---|---|---|---|
| Vercel | Hobby US$0, mas é "uso pessoal, não comercial" | **Pro US$20/mês** (1 TB banda, US$20 de crédito incluso) | Vender assinatura exige Pro. https://vercel.com/pricing |
| Convex | 1 mi chamadas/mês, 20 GB-h de action, 0,5 GB banco, 1 GB banda | Professional US$25 por dev/mês: 25 mi chamadas, 250 GB-h, 50 GB banco | https://docs.convex.dev/production/state/limits. Preço US$25/dev confirmado só por busca (BAIXA). |
| Clerk | 50.000 usuários retidos/mês, 100 organizações retidas | Pro US$25/mês (US$20 anual); org extra US$1/mês | Org "retida" precisa de 2+ membros, então cliente solo não conta. https://clerk.com/pricing |
| Resend | 3.000 emails/mês, 100/dia, 3 domínios | Pro US$20/mês = 50 mil emails, domínios 10 | https://resend.com/pricing. Risco de política de uso (cold email) já está no SUMMARY.md principal; sem envio automático no lançamento o volume é do cliente clicando. |
| Stripe | sem mensalidade | taxa por transação | Valor da taxa NÃO verificado. Assumir ~3% do faturamento. |

Custo fixo mínimo para vender: Vercel 20 + Convex Pro 25 + Resend (Free até começar, Pro 20) = **US$45 a US$65/mês**. Clerk e Convex ficam no grátis até algumas dezenas de clientes; o gargalo do Convex grátis é chamadas de função (1 mi), que o app consome com polling de `useQuery`; medir antes de ~20 clientes.

### Custo unitário consolidado (pior caso razoável)

| Unidade | Custo |
|---|---|
| Descoberta por lead aproveitável (Places, 15% de rendimento) | US$0,012 |
| Verificação Serper por lead (2 consultas + folga) | US$0,003 |
| 1 geração de IA (email OU script), Sonnet 5 | US$0,007 |
| **Lead descoberto + verificado** | **~US$0,015** |

---

## 2. Como concorrentes cobram

Não achei "LeadSweep" nem "GetSiteFinder" (buscas não retornaram nada com esses nomes; podem ter outro nome ou não existir mais). Os mais próximos que achei:

| Ferramenta | Preço | O que mede | Fonte / confiança |
|---|---|---|---|
| NoSite Search | Starter US$19, Growth US$49, Pro US$99, Agency US$199 /mês | **Saldo de créditos único**, compartilhado entre busca de leads e geração de site. Tem CRM e site por IA. | https://trustmrr.com/startup/nosite-search. BAIXA: listagem de startup à venda, só US$5 de MRR (quase sem clientes), valores já divergiram entre páginas. |
| Get Map Leads | Solo US$59, Agency US$249, Agency+Operações US$449 /mês; teste de 7 dias sem cartão | Limites de leads não encontrados. Inclui scraper Google Maps, filtro "sem site", auditoria IA, relatório PDF | https://www.capterra.com/software/1094865/get-map-leads (Capterra, BAIXA) |
| LeadWebia | "a partir de US$19/mês", sem teste grátis | Por uso | Capterra, BAIXA. Página deu 403. |
| Live Map Leads | Créditos por lead (1 crédito = 1 lead válido), sem expirar, a partir de US$5 | Por lead | Capterra, BAIXA |
| Fludi Leads | Avulso, a partir de US$1,75 | Por relatório | PeerPush, BAIXA |
| BirdSift | 25 créditos grátis sem cartão; pago não achado | Créditos | BAIXA |
| LeadSwift (agência de SEO, vizinho) | US$24,99 / 49,99 / 99,99 /mês | **Buscas por dia** (1 / 5 / 20) | Capterra, MÉDIA |

Leitura: nicho de web designer paga **US$19 a US$59 de entrada e US$99 a US$249 no topo**. A unidade quase sempre é **crédito/lead**, não busca. Teste grátis curto (7 dias ou ~25 créditos) é comum. Os preços atuais do código (€49 e €149) estão dentro da faixa.

---

## 3. Estado atual no código

| Item | Onde | Situação |
|---|---|---|
| Planos | `convex/lib/domain.ts` linhas 653-699 (`PLANS`, `planLimit`) | `free` "Gratuito" €0, 60 leads/mês, 2 sites/mês. `pro` €49, 2.000 leads, 50 sites. `agency` "Agência" €149, 10.000 leads, 500 sites. |
| Campos | `convex/schema.ts` ~53-56 | `plan`, `leadsUsed`, `sitesUsed`, `periodStart`, mais campos Stripe (`stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus`). |
| Medição | `convex/model/workspace.ts` | `reserveUsage`/`refundUsage` só para `"leads"` e `"sites"`. Reserva antes do custo externo e estorna o que não virou lead. Contador zera 30 dias após `periodStart`: **janela deslizante, não alinhada ao ciclo de cobrança do Stripe**. |
| Leads medidos | `places.ts:51`, `osm.ts:142`, `foursquare.ts:47` | Medidos por **leads inseridos**, não por requisição Google. Buscar 50, descartar 40 com site e inserir 10 cobra só 10, mas o Google cobra as 3 requisições inteiras. O custo real do Places não é o que o contador mede. |
| Sites | `previews.ts:236` | Medido (`sitesUsed`). |
| Stripe | `convex/billing.ts`, `convex/lib/stripe.ts`, `convex/http.ts` | Checkout de assinatura simples via REST, só `pro`/`agency` (preços por env `STRIPE_PRICE_PRO`/`STRIPE_PRICE_AGENCY`), portal do cliente, webhook mapeia price para plano; cancelado ou unpaid volta para `free`. Sem trial, sem cupom, sem preço por uso. |
| Tela | `src/app/(app)/plans/page.tsx` | 3 cartões, lê `PLANS`. Textos de features são marketing, não limite aplicado. |
| **Não medido** | `convex/outreach.ts` linhas ~236 e ~288 | **Chamadas de IA (email e script) não passam por plano nenhum**: nem checagem de plano (o texto "Outreach por IA" só aparece no Pro, mas o código deixa o Gratuito usar), nem contador, nem teto por tempo. Qualquer org gasta a chave Anthropic sem limite. |
| Não medido | `scoring.ts`/`enrich.ts` | PageSpeed no score não é medido; não achei custo (API do PageSpeed é gratuita com cota, NÃO verifiquei a cota). |
| Não existe | | Verificação Serper (ainda não construída), contador diário por org, cron, alerta de orçamento. |
| Teto diário | GCP | 30 requisições/dia para o app todo, configurado fora do código (doc `docs/CHECKLIST-MODO-REAL.md`). Não há nenhum teto por cliente. |

Buraco mais caro: uma org gratuita (ou qualquer org) pode gerar mensagens ilimitadas, e como o Places é compartilhado, um cliente esgota a cota de todos.

---

## 4. Recomendação

### 4a. Unidades a medir (3, não 1)

1. **Leads descobertos** (já existe; trocar a contagem para refletir a requisição Places ou manter por lead inserido e aceitar o desvio, ver abaixo).
2. **Verificações** (Serper): incluir no lead, sem contador separado. 1 lead = 1 verificação.
3. **Gerações de IA** (email ou script, regenerar conta de novo): contador novo `aiUsed`, reserva antes da chamada, igual ao padrão de `reserveUsage`. Ponto de código: `convex/outreach.ts` nos dois pontos que chamam `writeEmail` e `writeCallScript`.

Sites já medidos ficam como estão.

### 4b. Planos e margem

Custos por plano no uso máximo: leads x US$0,015 + gerações x US$0,007.

| Plano | Preço | Leads/mês | Gerações IA/mês | Sites/mês | Custo no teto | Margem bruta no teto | Margem com 50% de uso |
|---|---|---|---|---|---|---|---|
| Solo | €29 | 150 | 300 | 10 | 150x0,015 + 300x0,007 = **US$4,35** | 85% | 92% |
| Pro | €59 | 500 | 1.000 | 40 | 500x0,015 + 1.000x0,007 = **US$14,50** | 75% | 87% |
| Agência | €149 | 1.500 | 3.000 | 150 | 1.500x0,015 + 3.000x0,007 = **US$43,50** | 71% | 85% |

Se o rendimento real do Places for 8% em vez de 15% (cidade pequena, categoria saturada), a descoberta sobe de US$0,012 para US$0,022 por lead e a margem do Agência no teto cai para ~63%. Ainda saudável. Margem alvo: >=65% no teto.

Por que reduzir o que existe hoje: €49 com 2.000 leads custaria US$30 só de lead + IA ilimitada. €149 com 10.000 leads custaria US$150 de lead sozinhos, ou seja, **margem zero ou negativa no Agência atual**. Não vender como está.

Preço de €29/59/149 fica no meio da faixa dos concorrentes (US$19-59 entrada, US$99-249 topo). Decisão de produto dela: se preferir manter €49 como plano do meio, a margem melhora, mas perde o degrau de entrada.

Também: remover o plano Gratuito recorrente (60 leads/mês = US$0,9 + IA livre por conta, sem limite de contas). Trocar por teste (4d).

### 4c. Cenários de base de clientes

Mix assumido: 50% Solo, 40% Pro, 10% Agência. Uso no TETO (pior caso). Receita em €, custo em US$, 1:1.

| Clientes | Receita/mês | Variável (Places+Serper+IA) | Fixo | Taxa Stripe ~3% (não verificada) | Margem bruta |
|---|---|---|---|---|---|
| 10 (5/4/1) | 5x29+4x59+149 = **€530** | 5x4,35+4x14,5+43,5 = US$123 | US$65 (Vercel, Convex Pro, Resend Pro) | US$16 | **~61%** |
| 50 (25/20/5) | **€2.650** | 25x4,35+20x14,5+5x43,5 = US$616 | US$65 | US$80 | **~71%** |
| 200 (100/80/20) | **€10.600** | 100x4,35+80x14,5+20x43,5 = US$2.465 | ~US$250 (Convex com estouro, Vercel Pro com uso, Resend, Clerk org extra) | US$318 | **~71%** |

Com uso real de ~50% do teto, as margens ficam em ~75% a ~85%. Fixos de 200 clientes são estimativa, não medi consumo de Convex/Vercel.

**Cota Places nessas bases (pior caso, 3 leads/requisição):** 10 clientes = 5x150+4x500+1.500 = 4.250 leads = ~1.420 requisições/mês (~47/dia). 50 clientes = ~7.080 req/mês (~236/dia). 200 clientes = ~28.300 req/mês (~940/dia) = ~US$956/mês de Places, já dentro do custo variável acima.

### 4d. Cota compartilhada do Places

1. **Subir o teto do GCP em degraus**, não de uma vez: 30/dia hoje, ~60/dia para os primeiros 10 clientes, ~300/dia a partir de 50. O teto diário vira trava de custo de último caso: em 300/dia o pior mês é US$315 de Places.
2. **Orçamento + alerta no GCP Billing** (50%, 90%, 100%). Alerta não bloqueia; o teto de quota é o que bloqueia.
3. **Teto por cliente, no código** (esta é a proteção real): contador `leadsToday` por org, com limite diário = ~mensal/10 (Solo 20/dia, Pro 60/dia, Agência 180/dia), checado dentro da mesma reserva de `reserveUsage`. Evita um cliente drenar a cota do dia para os outros.
4. **Contar por requisição, não por lead inserido**, pelo menos num segundo contador interno (`placesCalls`) para você ver a conta real no painel admin. O limite cobrado do cliente pode continuar em leads.
5. Antes de abrir para vendas: **ler os termos do Google Maps Platform sobre armazenar dados do Places** (restrições de cache/armazenamento de conteúdo e uso para formar lista de leads). NÃO verifiquei isso nesta pesquisa; é um risco de modelo de negócio, não de custo. Marcar como pesquisa pendente.

### 4e. Traga sua própria chave (BYOK)

- **Anthropic: não.** A IA custa ~US$0,007 por geração; todo o custo de IA de um cliente Pro no teto é US$7. Pedir chave Anthropic ao freelancer é atrito enorme por quase nada.
- **Google Places: não no lançamento.** Prós: o custo e a cota saem do seu bolso, e some o problema de cota compartilhada. Contras: o cliente precisa criar projeto GCP, ativar cobrança e a API; é fricção alta para freelancer; você precisa guardar segredo de terceiro (criptografia por org, não cabe em env do Convex); suporte de erros de chave; e o código hoje lê `GOOGLE_PLACES_API_KEY` global. Reavaliar só se aparecer cliente de volume alto que reclame do teto do plano Agência. Se fizer, só no plano Agência.

### 4f. Teste grátis

Viável, **desde que único e curto**, não recorrente. Custo de um teste de 14 dias com 25 leads e 25 gerações: 25x0,015 + 25x0,007 = **US$0,55**. Mesmo com 100 testes por mês são US$55, dentro da franquia grátis do Places para as primeiras ~3.000 leads. Regras:
- Teste = bucket único (não renova), no lugar do plano Gratuito de 60 leads/mês.
- Exigir email verificado no Clerk. Cartão opcional (cartão corta abuso, mas reduz conversão do teste).
- **Abuso por múltiplas orgs:** o Clerk deixa a mesma pessoa criar várias organizações; o `ensureWorkspace` cria workspace grátis por org (`convex/model/workspace.ts`). Sem amarrar o teste ao usuário (ou email/cartão), o teste é multiplicável. Prender o bucket ao `userId` do Clerk, não ao `orgId`.
- Sem acesso a envio de email no teste além do que o plano já proíbe; gerar mensagem é permitido (US$0,007).

---

## 5. Pontos de medição para o roadmap (resumo acionável)

1. Novo contador `aiUsed` e reserva em `outreach.ts` (email e script), com limite por plano em `PLANS`.
2. Novo contador diário por org (`leadsToday`) e bucket de teste por usuário.
3. Trocar `PLANS` pelos três planos acima + teste; mapear novos `STRIPE_PRICE_*` (hoje só `pro` e `agency`).
4. Alinhar `periodStart` ao ciclo do Stripe (hoje 30 dias deslizantes).
5. Enforçar de fato "Outreach por IA" por plano (hoje só texto).
6. Serper: alerta de saldo, créditos expiram em 6 meses.
7. Painel interno de custo: requisições Places reais por org por dia.

## Não verificado

- "LeadSweep" e "GetSiteFinder": nenhuma página encontrada.
- Limites de leads de Get Map Leads, LeadWebia, NoSite Search (só preços de listagem de terceiros).
- Preço US$25/dev do Convex Pro: confirmado por busca, não pela página (a página de preços não renderizou); os tetos de uso vêm da doc oficial de limites.
- Se cada página de `nextPageToken` conta como requisição Places separada.
- Taxa do Stripe e câmbio US$/€.
- Cota gratuita da API PageSpeed e custo do `enrich.ts`.
- Termos do Google sobre armazenar dados do Places.
- Tokens: estimados lendo os prompts, não medidos com a API.

## Fontes

- Google Maps Platform, preços: https://developers.google.com/maps/billing-and-pricing/pricing (2026-10-12)
- Google, campos por SKU: https://developers.google.com/maps/billing-and-pricing/sku-details (2026-10-12)
- Google, mudanças de março de 2025: https://developers.google.com/maps/billing-and-pricing/march-2025
- Anthropic: https://platform.claude.com/docs/en/about-claude/pricing (2026-10-12)
- Serper: https://serper.dev (2026-10-12)
- Clerk: https://clerk.com/pricing; Resend: https://resend.com/pricing; Vercel: https://vercel.com/pricing; Convex: https://docs.convex.dev/production/state/limits (todos 2026-10-12)
- Concorrentes: https://trustmrr.com/startup/nosite-search, Capterra (Get Map Leads, LeadWebia, Live Map Leads, LeadSwift), PeerPush (Fludi Leads)
