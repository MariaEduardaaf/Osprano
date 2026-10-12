# Phase 10: Dados do Google conformes - Research

**Pesquisado em:** 2026-10-12
**Domínio:** Conformidade com os termos do Google Maps Platform (Places API New) num CRM multi-tenant em Convex + Next 16; migração de dados; paginação.
**Confiança geral:** MÉDIA. Termos e preços do Google lidos nas páginas oficiais hoje (ALTA para o texto). Interpretação jurídica (o que a "confirmação" resolve, score derivado, cache em memória) é MÉDIA/BAIXA e vai para o advogado. Números de uso por cliente são estimativas minhas.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Só `place_id` é persistido** para lead vindo do Google. Nome, endereço, telefone, nota/avaliações, site e qualquer outro conteúdo do Google não ficam gravados no Convex (nem em cache de servidor).
- Lat/lng do Google: no máximo 30 dias consecutivos, depois apagado por cron.
- Leads do **OpenStreetMap** continuam com dados persistidos (ODbL permite, com atribuição já existente).
- Dados que o **cliente confirma ou edita** (nome, telefone, e-mail, endereço) passam a ser dado do cliente e podem ser gravados e usados no preview público, na mensagem e no prompt da IA. Conteúdo do Google não confirmado nunca entra no preview público `/p` e `/site`, nem no prompt da IA.
- Toda tela com conteúdo do Google mostra a atribuição do Google Maps; conteúdo do Google nunca aparece junto de um mapa.
- **Vendedora é empresa brasileira** (não espanhola). A pesquisa LEGAL.md assumiu termos EEA por endereço de cobrança na Espanha; a pesquisa desta fase deve conferir se os termos não-EEA (conta de faturamento do Google que não seja da Espanha) mudam algo de prático. A decisão "só place_id" vale nos dois casos.
- Riscos a endereçar: (1) custo de rebuscar, (2) confirmação "de um clique" pode ser só copiar dado do Google, (3) Digital Presence Score e derivados, (4) migração dos leads reais com ensaio no dev, backup e execução em produção só com aprovação explícita da Duda.
- Execução: branch `v1.3-pronto-pra-vender`; verificação com `node --experimental-strip-types --test tests/*.test.ts`, `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/tsc --noEmit -p convex`, `./node_modules/.bin/eslint`, `./node_modules/.bin/next build`; pode publicar no Convex de dev (`npx convex dev --once`), nunca em produção sem a Duda; nenhuma dependência npm nova sem aprovação; não mexer em `.env*`, nunca `convex env list`; textos PT-BR sem travessão.

### Claude's Discretion
- Formato do schema (campos separados "confirmados" vs fonte), como marcar origem de cada campo, forma do cache efêmero, paginação (`usePaginatedQuery` do Convex ou `take`).

### Deferred Ideas (OUT OF SCOPE)
- Pedir autorização por escrito ao Google (opção D) fica com a Duda, em paralelo, fora do código.
- Renovação anual de `place_id` (opcional).
- Fora da fase: planos/cotas novos (Fase 12; aqui só contar o custo na cota que já existe), verificação via Serper (Fase 14), i18n (Fase 15).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Descrição | Suporte da pesquisa |
|----|-----------|---------------------|
| GPLC-01 | Lead do Google persiste só `place_id` (+ lat/lng ≤ 30 dias) | Inventário (seção 1), mapper de inserção sem campos Google, cron de purge (seção 8), schema (seção 4) |
| GPLC-02 | Dados do Google sob demanda, sem gravar, custo na cota, sem estourar custo por cliente | Preços por SKU (seção 3), desenho de exibição com contas (seção 5), action `places.details`, contador `detailsUsed` |
| GPLC-03 | Cliente confirma/edita; só confirmado ou OSM entra em preview, mensagem, prompt | Fluxo de confirmação (seção 6), predicado único `shareableFacts` (seção 4), leitores a gatear (seção 1) |
| GPLC-04 | Migrar leads existentes sem perder estágio, notas, histórico, site, dados confirmados | Migração em lote (seção 7), regra por campo, previews.content, ensaio/backup/rollback |
| GPLC-05 | Atribuição do Google Maps em toda tela com conteúdo do Google; nunca com mapa | Regras de atribuição (seção 2.4), componente `GoogleAttribution`, MapEmbed e teste de varredura |
| SCAL-01 | Paginação/take nos `.collect()` listados | Seção 9, com limites do Convex e mudanças de UI |
</phase_requirements>

## Resumo

O código de hoje grava, para todo lead do Places, nome, endereço, telefone, site, nota, avaliações e categoria do Google (`convex/places.ts:116-131`, `convex/leads.ts:494-590`), copia isso para o `content` do site gerado (`convex/lib/site.ts:402-418`), e lê esses campos em cerca de 40 pontos de UI, no score, no prompt da IA e no template de DM. A nota e as avaliações do Google chegam a ser **escritas na mensagem de DM ao prospect** (`src/lib/dm-template.ts:358-364`). Não existe distinção de origem por campo: só `leads.source`. Por isso a regra mais barata e mais segura é um **invariante de schema**: os campos de topo de `leads` (`name`, `phone`, `address`, `email`...) só guardam dado que pode ser guardado (OSM, Foursquare OS, manual, ou digitado/confirmado pelo cliente). Conteúdo do Google nunca é gravado em lugar nenhum. Com isso a proveniência é derivável (`source` + presença do campo + registro de confirmação) e um predicado único (`shareableFacts`) decide o que sai do app.

Termos (lidos hoje): o texto proibido é literal ("copy and save business names, addresses, or user reviews", "No Caching" exceto o permitido), vale igual nos termos EEA e não-EEA. Só `place_id` é cacheável por tempo indefinido; lat/lng por até 30 dias (nos dois conjuntos). A diferença prática EEA x não-EEA: o EEA tem lista fechada de "Permitted Uses" (o item 3 menciona CRM de time de vendas) e proíbe o conteúdo do Places com **qualquer** mapa; o não-EEA não tem a lista, permite uso sem mapa (SST 14.1), mas acrescenta a cláusula 3.2.3(d)(iii) contra uso "em serviço de listagem/diretório ou para criar ou aumentar um produto de publicidade". Decidir qual vale depende só do **país do endereço de cobrança** da conta GCP, que ninguém verificou ainda.

Custo (preços de 2026-10-08): Place Details só com ID é grátis e ilimitado; com nome (Pro) US$17/1.000 (5.000 grátis/mês); com telefone, site ou nota (Enterprise) US$20/1.000 (1.000 grátis/mês). Não há Place Details em lote. Se a lista ou o Kanban chamassem o Google por linha, um cliente Pro custaria centenas de dólares por mês. O desenho recomendado mantém **lista e Kanban 100% sem Google** (só dado confirmado/OSM + score), usa a resposta do Text Search já paga para mostrar nomes na tela de busca (memória do navegador, não grava), e busca o resto por **clique explícito**, contado numa cota mensal nova (`detailsUsed`). Com os tetos propostos a margem bruta no teto de leads continua ≥ 65% nos três planos.

**Recomendação principal:** campos de topo = só dado permitido; Google só via action ao vivo (`places.details`) exibida em cartão separado, atribuído e somente leitura, sem botão de copiar nem preenchimento automático; "confirmar" = o cliente digita nos campos próprios e declara a origem (ligação, visita, site do negócio, outro); migração em lote idempotente com ensaio no dev, backup e portão de aprovação da Duda antes de produção.

## 1. Inventário (o que existe hoje)

### 1.1 Campos com conteúdo do Google

Tabela `leads` (`convex/schema.ts:70-150`). Origem de cada campo para `source: "places"`:

| Campo | Linha schema | Origem hoje (places) | Origem OSM | Origem manual/importação | Decisão |
|---|---|---|---|---|---|
| `placeId` | 79 | Google (`places.id`) | `osm:node/123` (`convex/lib/osm.ts:146`) | n/a | Manter. Chave de dedupe `by_org_place` |
| `name` | 81 | **Google** `displayName` (`places.ts:122`) | OSM | digitado | `v.optional`; Google nunca grava |
| `category` | 82 | **Google** `primaryType ?? args.category` (`places.ts:123`) | termo buscado (`osm.ts:217`) | digitado | Places passa a gravar `args.category` (termo do próprio cliente) |
| `address` | 83 | **Google** `formattedAddress` | OSM | digitado | Google nunca grava |
| `city` | 84 | select da UI (`args.city`, forma local) | OSM | digitado | Manter (não é Google, ver LESSONS "city tem três origens") |
| `countryCode` | 85 | select da UI | idem | idem | Manter |
| `phone` | 87 | **Google** `nationalPhoneNumber` | OSM | digitado | Google nunca grava |
| `website` | 88 | **Google** `websiteUri` | OSM | digitado | Google nunca grava |
| `email` | 89 | extraído do site do próprio negócio por `scoring.extractEmail` | OSM | digitado | Manter (não é Google) |
| `instagram`, `facebook` | 93-94 | usuária | OSM | usuária | Manter |
| `rating`, `reviewsCount` | 95-96 | **Google** | n/a | digitado (create) | Google nunca grava |
| `score`, `tier`, `signals` | 99-101 | **derivado** de website/phone/rating/reviews do Google | derivado | derivado | Manter (ver 2.3) |
| `legalForm`, `contactType`, `emailable` | 105-109 | **derivado** do nome (`inferLegalForm(name)`) | derivado | derivado | Manter; recalcular quando o nome for confirmado |
| `fetchedAt` | 146 | momento da busca | idem | idem | Manter |

Outras tabelas com cópia de conteúdo do Google:

| Onde | Evidência | O que há |
|---|---|---|
| `previews.content` (`v.any()`, `schema.ts:156`) | `defaultContentForLead` em `convex/lib/site.ts:402-418` chamado por `ensurePreview` (`convex/model/previews.ts:22-37`) | **Cópia** de name, phone, address, category, rating, reviewsCount no momento da criação. O site publicado em `/site/[slug]` e a prévia `/p/[token]` renderizam isso. É o maior vazamento para o público |
| `previews.slug` | `previews.ts:226-241` | Slug = `slugify(content.name)` + sufixo. O texto do nome do Google fica na URL |
| `outreach.subject/body` | `outreach.ts` draft/send | Rascunhos e mensagens com nome do negócio (e, no DM, nota/avaliações) |
| `leads.callScript`, `callScriptPt` | `schema.ts:142-143` | Roteiro gerado pela IA com nome/cidade |
| `events.meta` | `schema.ts:223` | Só estágio/nota da usuária; sem Google |
| `uploads` | n/a | Fotos da usuária; sem Google |

Como separar origem por lead hoje: **só** `leads.source` ("places" | "fsq" | "osm" | "scrape" | "manual"). Não existe marca por campo nem registro de edição. Importante: **nenhuma mutation permite editar nome, telefone ou endereço** (`updateInfo`, `leads.ts:281-330`, edita contactName, contactRole, email, instagram, facebook, dealSetup, dealMonthly). Logo, em todo lead `source: "places"` existente, `name/phone/address/website/rating/reviewsCount/category` são 100% Google, sem exceção de edição. Já `email`, `instagram`, `facebook`, `contactName` são da usuária ou do site do negócio.

Armadilha encontrada: `insertDiscovered` (`leads.ts:494-590`) em lead já existente (mesmo `placeId`) **sobrescreve** name, phone, website, etc. com o valor novo do Google (`leads.ts:523-542`). Com o modelo novo isso apagaria dado confirmado. Para `places`, o ramo "existing" não pode tocar nesses campos.

### 1.2 Leitores (o que quebra quando `name` vira opcional)

`tsc` é a rede de segurança: com `name: v.optional(v.string())`, todo leitor abaixo falha a compilação até ser tratado. Lista levantada por grep (`leads.name` etc.):

| Grupo | Arquivo:linha | Uso |
|---|---|---|
| Listas/telas | `src/components/lead-card.tsx:59,61,77,122-140,159,196-212` | nome, site, categoria, nota, telefone, endereço, tel: |
| | `src/app/(app)/crm/page.tsx:131,351-354,373-394` | busca, card do Kanban, telefone |
| | `src/app/(app)/leads/page.tsx:77-81` | filtro por cidade e categoria |
| | `src/components/crm/lead-detail.tsx:123,222-247,398-415,495-509` | cabeçalho, linhas Categoria/Endereço/Telefone/Website/Avaliação, ligar, template |
| | `src/components/crm/today-strip.tsx:88`, `lost-reason-modal.tsx:70`, `delete-lead-button.tsx:38,49`, `site-editor/site-editor.tsx:240` | nome em texto |
| | `src/app/(app)/sites/page.tsx` via `previews.listSites` (`previews.ts:287-289`) | nome, cidade, categoria |
| | `src/app/(app)/outreach/page.tsx` via `outreach.outbox` (`outreach.ts:88-90`) | nome, categoria, cidade |
| | `convex/events.ts:24` | `leadName` do feed do dashboard |
| Links | `src/lib/lead-links.ts:36-49,81-89` | "Ver site"/"Ver no Google"/busca no Google por nome+endereço. O link por `placeId` é permitido (sai do app). A busca por nome e endereço só vale para lead não-Google (OSM/manual) |
| Preview público | `convex/lib/site.ts:402-418`, `convex/model/previews.ts:22-54` (`readContent` cai para `lead.name` quando `content.name` vazio), `convex/previews.ts:166-190,226-241` | conteúdo, slug, getByToken/getBySlug |
| Mapa no site | `src/components/site-templates/shared.tsx:572-584` (`MapEmbed`), `convex/lib/site.ts:212` | iframe do Google Maps com `address`+`city` do **conteúdo do site**. Com o invariante, só endereço digitado entra; nunca Google |
| Prompt da IA | `convex/lib/outreachAi.ts:703-708` (`businessLine`: name, city, category), `:734,:813` (`observationsPrompt(lead.signals)`), `:109-118` (`SIGNAL_TEXT` cita "Google Business listing"), `:780,:790-791,:871-872` | nome e sinais derivados do Google entram no prompt |
| Template de DM | `src/lib/dm-template.ts:352-364` | **nota e nº de avaliações do Google escritos na mensagem** |
| Score | `convex/scoring.ts:33-81` | lê `lead.website/phone/rating/reviewsCount/name` do banco; para places esses campos somem |
| Descoberta | `convex/places.ts:116-136`, `convex/osm.ts:205-229`, `convex/foursquare.ts:76-95` | chamam `insertDiscovered` |
| CLI/admin | `convex/admin.ts:170,188` (`classifyWebsite(l.website)`), `:246`, `convex/lib/importLead.ts` | `importLeads` grava source manual (digitado). Não muda |
| Demo | `convex/demo.ts:309` (`source: "places"`) e `:400-409,:493-498` | seed fictício marcado como places; com o modelo novo ficaria sem nome. Trocar o source do seed para "manual" ou dar `confirmation` |
| WhatsApp/ligação | `convex/outreach.ts:290`, `convex/whatsapp.ts:29-35` | `lead.phone`: passa a ser só telefone confirmado/OSM (mensagem de erro "Lead sem telefone" continua certa) |
| Exportação CSV | **não existe** no repo (grep por csv/export em `src`/`convex` não achou). Nada a fazer; se criarem depois, usar `shareableFacts` |

Leitores de `signals`/`score`/`tier` (não são conteúdo, ver 2.3): `leads.stats/analytics` (`leads.ts:103-149`), `crm/page.tsx` filtros, `lead-card`, dashboard.

## 2. Termos do Google (lidos em 2026-10-12)

Fontes lidas (HTML baixado e convertido, texto exato): Google Maps Platform Terms of Service (não-EEA), última modificação **26/08/2026** (https://cloud.google.com/maps-platform/terms); Service Specific Terms (não-EEA) **10/06/2026** (https://cloud.google.com/maps-platform/terms/maps-service-terms); EEA ToS 26/08/2026 (https://cloud.google.com/terms/maps-platform/eea); EEA SST 10/06/2026 (https://cloud.google.com/terms/maps-platform/eea/maps-service-terms); EEA Places Permitted Uses, 04/06/2025 (https://cloud.google.com/terms/maps-platform/eea-places-api-permitted-uses); políticas do Places (https://developers.google.com/maps/documentation/places/web-service/policies); place_id (https://developers.google.com/maps/documentation/places/web-service/place-id).

### 2.1 O que pode ser guardado

| Dado | Pode? | Cláusula (texto) | EEA | Não-EEA |
|---|---|---|---|---|
| `place_id` | Sim, sem prazo | SST cláusula 3 "Google ID Caching": "Customer may cache the Google ID values ... For example ... place_id from Places API". Doc place_id: "exempt from the caching restrictions stated in Section 3.2.3(b)" | Sim | Sim |
| lat/lng do Places | Sim, ≤ 30 dias consecutivos, depois apagar | EEA SST 15.4 e não-EEA SST 14.3: "may temporarily cache latitude and longitude values from the Places API for up to 30 consecutive calendar days, after which Customer must delete" | Sim | Sim |
| nome, endereço, telefone, site, nota | **Não** | ToS 3.2.3(a)(i): "pre-fetch, index, store, reshare, or rehost Google Maps Content outside of the Services"; (a)(iii) EEA / (a)(iii) não-EEA: "copy and save business names, addresses, or user reviews"; 3.2.3(b): "No Caching ... except as expressly permitted" | Sim, vale | Sim, vale |
| Place ID obsoleto | Doc: `NOT_FOUND` = obsoleto; "keep the original request that produced each ID and re-run it" (cobrado). Renovação de IDs > 12 meses é "recommended" e a chamada só com ID é grátis | place_id doc | n/a | n/a |

Observação: no Address Validation API o Google admite expressamente "replace it with End User data provided through End User confirmation or correction" após 30 dias (EEA SST Tabela 1.4). **Não existe essa cláusula para o Places API.** Serve só como sinal de que o Google reconhece o conceito de dado confirmado pelo usuário final; não é permissão para o Places.

### 2.2 EEA x não-EEA (conta de cobrança)

Qual vale: "If Customer's billing account address is in the EEA, the Google Maps Platform EEA Terms of Service ... will govern" (ToS não-EEA, seção de abertura). Critério é o **país do endereço da conta de faturamento do projeto**, não a nacionalidade da empresa nem o país do usuário final. A FAQ (https://developers.google.com/maps/comms/eea/faq) fala em "projects linked to billing accounts with an address in the EEA" e não trata cliente com cobrança fora do EEA que atende usuários no EEA. A transição de 08/07/2025 (integração antiga continua sob os termos globais se "unmodified") não ajuda: o projeto é de 2026.

| Tema | EEA | Não-EEA | Efeito para o Osprano |
|---|---|---|---|
| Usos permitidos | Lista fechada (SST 15.2 + página Permitted Uses). Item (3): "enable Customers to visualize and manage Places content related to a sales team's customers or opportunities" | Sem lista; SST 14.1: "may use Google Maps Content from the Places API ... without a corresponding Google Map" | EEA: o item (3) é o único encaixe e a palavra "Customers" é ambígua (cliente do Google = a Duda, ou cliente do Osprano?). Não-EEA: sem barreira |
| Mapa | SST 15.1: não usar Places "With any Map" (inclusive Google), exceto lat/lng/place_id | SST 14.2: não usar "in conjunction with a non-Google map"; ToS 3.2.3(e) idem. Com mapa Google pode | Sem mapa nenhum, vale nos dois |
| Re-criar produto Google / diretório / publicidade | não existe | ToS 3.2.3(d): "substantial, independent value"; (iii) vedado "use the Google Maps Core Services in a listings or directory service or to create or augment an advertising product" | Risco só do não-EEA. Prospecção de clientes por e-mail/ligação pode ser lida como "publicidade"? Ponto para o advogado |
| Revenda | 3.2.1(b) não-EEA: não "sell, resell, sublicense, transfer, or distribute the Services" | idem | O dado ao vivo do Google dentro do CRM é parte de um produto com valor próprio; não repassar a chave |
| Treinar IA | EEA 3.3.2(c)(v) | não-EEA 3.2.3(c)(vii) | Mandar nome do Google ao Claude para escrever e-mail é inferência, não treino; mesmo assim a decisão trava nome do Google fora do prompt |
| Aviso nos Termos do app | EEA 3.2.2 | não-EEA 3.2.2(a)(i): Termos do app devem avisar que há conteúdo do Google Maps e linkar https://maps.google.com/help/terms_maps/ e https://policies.google.com/privacy; e (a)(iii) repassar a obrigação a usuários ("Downstream") | `src/app/legal/termos/page.tsx:48` já linka. Conferir que o texto cobre "terceiros usuários" (os clientes do Osprano) |

Conclusão prática: nada em "só place_id + dado ao vivo atribuído + sem mapa + dado digitado pelo cliente" muda entre EEA e não-EEA, exceto o risco extra 3.2.3(d)(iii) no não-EEA. **Ação da Duda (não é código):** conferir no Console GCP (Faturamento) o país do endereço da conta de `soprano-503222` ("Pagamento do Firebase") e dizer qual conjunto vale; a empresa brasileira precisa de uma conta de faturamento própria, e o país dessa conta passa a mandar.

### 2.3 Score derivado pode ser guardado?

Nenhuma cláusula fala de dado derivado do Places. O que existe: 3.2.3(c) "No Creating Content From Google Maps Content" (exemplos geoespaciais e IA) e 3.2.3(a)/(b) sobre guardar o conteúdo. Um número 0-100 e seis booleanos não reproduzem nem permitem reconstruir nome, endereço, telefone, site ou nota (`sparseProfile` junta três campos num bit; `noSite` é 1 bit de `websiteUri`). **Recomendação (MÉDIA, ponto de advogado):** persistir `score`, `tier` e `signals` calculados na hora do Text Search, sem nunca persistir os insumos. Não há alternativa barata: recalcular exigiria Place Details Enterprise por lead (US$0,02) a cada abertura da lista.

Consequências obrigatórias:
- `scoreLead` (`convex/scoring.ts`) é agendado depois de cada inserção (`places.ts:135`) e lê `lead.website/phone/rating` do banco. Para places esses campos não existem mais, então rodá-lo **sobrescreveria o score correto com noSite=true e sparseProfile=true**. Para `source: "places"` o score é calculado em `places.ts` com os dados ao vivo e enviado já pronto; o agendamento de `scoreLead` é pulado. Para places todo lead guardado é "sem site real" (filtro `keepOnlyWithoutSite`, `places.ts:111`), logo `scoreLead` não teria o que medir (HTTPS/PageSpeed/e-mail só rodam com site real).
- O texto que vai ao prospect e à IA (`SIGNAL_TEXT.noSite`: "their public Google Business listing does not link to any website") é afirmação derivada do Google. Regra: para lead places, `noSite`, `socialOnly` e `sparseProfile` só entram no prompt/preview se o cliente confirmou ("Conferi que não tem site", ver seção 6). Sem confirmação o lead cai no caminho honesto existente (`noVerifiedSignalWarning`, `outreachAi.ts:690-700`). `sparseProfile` nunca entra para places (é sobre nota/avaliações).
- `legalForm` é inferido do nome (`inferLegalForm`). Calcular no momento da busca (nome ao vivo), gravar o resultado, e recalcular quando o cliente confirmar o nome.

### 2.4 Atribuição (Places sem mapa)

Fonte: https://developers.google.com/maps/documentation/places/web-service/policies (lida hoje; zip de logos em https://developers.google.com/static/maps/documentation/images/Google_Maps_Attribution_Assets.zip).

- Logo do Google Maps "whenever possible"; quando o espaço é limitado, o texto "Google Maps" é aceito. Deve ficar claro qual conteúdo é do Google.
- Logo: não modificar, manter proporção, versão com contorno em fundo movimentado e sem contorno em fundo liso. Altura 16dp a 19dp; folga 10dp esquerda/direita/topo, 5dp embaixo.
- Texto: não alterar caixa, não quebrar linha, não traduzir (`translate="no"`), Roboto 400, 12 a 16sp, cor branca, `#1F1F1F` ou `#5E5E5E` com contraste 4,5:1.
- Posição: no topo ou na base do conteúdo, dentro do mesmo contêiner visual; para linha única pode ficar ao lado. Distinguir o conteúdo do Google do resto por borda, fundo, sombra ou espaço. "Never remove, hide, obscure, or modify it."
- Terceiros: se o Google devolver atribuição de provedores, só "Google Maps" não basta. A máscara que usamos não pede fotos nem avaliações (onde ela aparece), então não se aplica hoje; manter assim.
- Exibir sem mapa é permitido (não-EEA SST 14.1; EEA exige uso dentro da lista de Permitted Uses).

Implementação: um componente `GoogleAttribution` (logo SVG do zip em `public/`, com `alt="Google Maps"`; variante texto para linhas curtas) usado **dentro** do único componente que renderiza dado do Google (`GoogleCard`/`GoogleRowData`). Um teste de varredura garante que quem importa o hook de dados do Google também renderiza a atribuição. O logo é arquivo, não dependência npm; baixar o zip é passo manual/aprovado.

### 2.5 Mostrar Place Details ao usuário final sob demanda num CRM

Dentro dos termos se: busca ao vivo (action, sem gravar), exibida em contêiner atribuído, sem mapa, sem copiar para o banco. Dúvidas reais:
- EEA: depende do item (3) dos Permitted Uses ("sales team's customers or opportunities"); prospects de terceiros de várias empresas é zona cinza. **Pedir confirmação por escrito ao Google (opção D) continua o caminho definitivo.**
- Não-EEA: 3.2.3(d)(iii) (diretório/publicidade) é o ponto.
- Cache em memória do navegador: **nenhuma cláusula autoriza expressamente** e 3.2.3(b) diz "No Caching ... except as expressly permitted". Interpretação defensável: manter na memória da página enquanto ela está aberta é o estado de exibição, não "cache" no sentido de guardar para reuso futuro. Regra de segurança: só memória do JS (um `Map` de módulo/estado React), **nunca** `localStorage`, `sessionStorage`, IndexedDB, service worker, `Cache-Control` público nem query reativa do Convex (use `useAction`, que não é reativa nem cacheada). Perde-se tudo ao recarregar. Residual MÉDIO/BAIXO para o advogado. Se ele disser que nem isso pode, a mudança é só remover o `Map` (cada abertura rebusca); o custo sobe, mas a cota mensal limita.

## 3. Preços do Places API (New) em 2026

Fonte: https://developers.google.com/maps/billing-and-pricing/pricing (atualizada 2026-10-08 UTC, lida hoje) e https://developers.google.com/maps/billing-and-pricing/sku-details (lida hoje, campos por SKU). Faixa de 0 a 100 mil eventos/mês, USD por 1.000:

| SKU | Grátis/mês | Preço | Campos que ativam (Place Details New) |
|---|---|---|---|
| Place Details Essentials (IDs Only) | ilimitado | grátis | `id` |
| Place Details Essentials | 10.000 | US$5,00 | `formattedAddress`, `location` |
| Place Details Pro | 5.000 | US$17,00 | `displayName`, `primaryType`, `businessStatus` |
| Place Details Enterprise | 1.000 | US$20,00 | `nationalPhoneNumber`, `websiteUri`, `rating`, `userRatingCount` |
| Place Details Enterprise + Atmosphere | 1.000 | US$25,00 | campos de atmosfera (reviews etc.; não usar) |
| Text Search Enterprise (já em uso) | 1.000 | US$35,00 | máscara atual |
| Text Search Pro / IDs Only | 5.000 / ilimitado | US$32 / grátis | |

Regra de cobrança: a máscara cobra pelo **SKU mais alto** entre os campos pedidos. Cobrança é **por requisição** (um lugar por Place Details). Confirmação de ausência de lote: a documentação e as notas de versão até agosto de 2026 não mostram endpoint de Place Details em lote (busca web hoje; prova de ausência é MÉDIA). A alternativa é paralelizar chamadas individuais. Os tetos grátis são por SKU, compartilhados pela conta de faturamento (todos os clientes do Osprano juntos).

Observação de custo útil: refazer a mesma Text Search (US$0,035 por requisição de até 20 lugares, ou US$0,00175 por lugar se todos casarem) é ~10x mais barato por lugar que Place Details, mas depende de o ranking repetir. Não recomendado nesta fase (frágil); fica como otimização se a conta de Details passar de ~10% da receita.

## 4. Padrões de arquitetura

### 4.1 Schema (mudanças em `convex/schema.ts`)

```ts
// leads (todos opcionais; nada é removido do schema, só deixa de ser gravado)
name: v.optional(v.string()),            // era v.string(); tsc aponta os ~40 leitores
lat: v.optional(v.number()),             // Google, <= 30 dias (nenhum consumidor hoje, ver Perguntas Abertas)
lng: v.optional(v.number()),
locAt: v.optional(v.number()),           // quando lat/lng foi buscado; alimenta o purge
confirmation: v.optional(v.object({      // trilha de auditoria do que a cliente atestou
  at: v.number(),
  via: v.union(v.literal("call"), v.literal("visit"), v.literal("website"), v.literal("social"), v.literal("other")),
  noSite: v.optional(v.boolean()),       // "conferi que não tem site próprio"
})),
// índices novos
.index("by_loc_at", ["locAt"])
.index("by_org_saved_score", ["orgId", "saved", "score"])   // lista de descoberta
.index("by_org_stage_score", ["orgId", "stage", "score"])   // colunas do Kanban
.index("by_org_next", ["orgId", "nextActionAt"])            // faixa "Hoje"
.searchIndex("search_name", { searchField: "name", filterFields: ["orgId"] })
// workspaces
detailsUsed: v.number()  // v.optional + default 0 no ensureFresh; zera junto com leadsUsed/sitesUsed
// outreach
.index("by_org_channel", ["orgId", "channel"])
// previews
.index("by_org_open", ["orgId", "openCount"])
```

Sem campo "origem por campo": o invariante (campo de topo = dado permitido) torna `source` + `confirmation` suficientes. `rating` e `reviewsCount` continuam no schema (manual create digita) mas descoberta Places nunca os grava. Sem renomear nada: deploy do schema é só afrouxamento (`name` opcional + campos novos opcionais), não invalida dados existentes.

### 4.2 Predicado único (lição do repo: `canContactByEmail`)

Criar `convex/lib/googleData.ts` (importável por `node:test`: imports com `.ts`, só `import type` de `_generated`):

```ts
isGoogleLead(lead)        // lead.source === "places"
shareableName(lead)       // OSM/fsq/manual: lead.name; places: lead.name (só existe se digitado) ; nunca devolve nada do Google
shareableSignals(lead)    // places sem confirmation.noSite: remove noSite, socialOnly, sparseProfile; com confirmation.noSite: libera noSite/socialOnly
scrubLeadPatch(lead)      // patch de migração (seção 7)
scrubPreviewContent(content, googleLead) // idem
isLocExpired(lead, now)   // lat/lng > 29 dias
```

Todo ponto que **sai do app** (criar preview, `/p` e `/site`, prompt da IA, DM, e-mail, `businessLine`, `SIGNAL_TEXT`) passa por esse módulo. `grep -rn "lead\.\(name\|signals\|rating\)" src convex` deve cair a zero fora dele e das telas internas. Se `shareableName` for vazio: `ensurePreview`, `outreach.draft/send`, geração de roteiro e `dmMessage` lançam `userError("Confirme o nome do negócio antes de continuar.")` e a UI desabilita o botão com a mesma dica.

### 4.3 Estrutura

```
convex/
  lib/googleData.ts          # predicados e transformações puras (testáveis)
  lib/placesFields.ts        # máscaras de campo + mapa campo->SKU + preços (constantes e teste de invariante)
  model/discovery.ts         # insertPlacesLead(ctx,args), insertDiscovered lógica movida para cá (testável com fakeCtx)
  places.ts                  # search devolve dados ao vivo; details e detailsMany (actions)
  googleCompliance.ts        # internalMutation purgeExpiredLocation, migrateBatch, run(action)
  crons.ts                   # novo: purge diário
src/
  components/google/GoogleAttribution.tsx
  components/google/GoogleCard.tsx      # único lugar que renderiza dado do Google
  lib/use-google-places.ts              # hook: Map em memória + dedupe + useAction
public/google-maps-logo.svg             # do zip oficial (aprovação da Duda para baixar)
```

### 4.4 Fluxo de descoberta novo (`runPlacesSearch`, `convex/places.ts:33-151`)

1. Mantém a máscara do Text Search (precisa de `websiteUri` para o filtro de "sem site"; continua Enterprise, 1.000 grátis/mês) e acrescenta `places.location` (Essentials, sem custo extra por já ser Enterprise) **somente** se a decisão de lat/lng for ligar (ver Perguntas Abertas).
2. Calcula na hora, a partir da resposta ao vivo: `signals`/`score`/`tier` (`computeScore`), `legalForm`/`contactType`/`emailable` (`inferLegalForm(name)`).
3. Chama `insertPlacesLead` com **só**: orgId, source "places", placeId, `category: args.category` (termo do cliente), city, countryCode, signals, score, tier, legalForm, contactType, emailable, e opcionalmente lat/lng/locAt. Se já existe (`by_org_place`): não toca em nada de conteúdo; devolve `created: false`.
4. Não agenda `scoreLead` para places.
5. A action devolve, além de `{found, inserted, droppedWithSite}`, `shown: Array<{ leadId, placeId, name, address, phone, rating, reviews }>` com o conteúdo ao vivo dos lugares inseridos ou atualizados nesta busca. O cliente guarda isso só no `Map` em memória. Nada de `console.log` dessas respostas (o código atual só loga o corpo de erro, `places.ts:95`; manter).

### 4.5 Action `places.details` e cota

```ts
// convex/places.ts (esboço)
export const details = action({
  args: { leadId: v.id("leads"), full: v.optional(v.boolean()) },
  handler: async (ctx, { leadId, full }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.runQuery(internal.leads.getInternal, { leadId });
    if (!lead || lead.orgId !== orgId || lead.source !== "places" || !lead.placeId) throw userError("Lead não encontrado");
    await ctx.runMutation(internal.workspaces.reserve, { orgId, kind: "details", count: 1 }); // estoura => userError com dica de upgrade
    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(lead.placeId)}`, {
        headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": full ? DETAILS_MASK_FULL : DETAILS_MASK_LIST },
      });
      if (res.status === 404) { await refund; return { gone: true }; }   // place_id obsoleto
      if (!res.ok) { await refund; throw userError(`Places API respondeu ${res.status}`); }
      return { gone: false, place: await res.json() };                   // NÃO grava, NÃO loga
    } catch (e) { /* refund se ainda não devolveu */ throw e; }
  },
});
// DETAILS_MASK_LIST = "displayName,formattedAddress"            -> SKU Pro   (US$17)
// DETAILS_MASK_FULL = "displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,userRatingCount,businessStatus" -> Enterprise (US$20)
```

`reserveUsage`/`refundUsage` (`convex/model/workspace.ts:75-100`) hoje aceitam `"leads" | "sites"` e `workspaces.reserve/refund` (`workspaces.ts:41-62`) idem; estender o tipo para `"details"`, `PlanDef.detailsPerMonth` (`convex/lib/domain.ts:653-699`), `planLimit`, o reset mensal em `ensureFresh` (`workspace.ts:34-43`) e `workspaces.current`. Mesmo padrão de reserva antes do custo externo e estorno em falha. A Fase 12 reorganiza `PLANS`; aqui só entra o contador e o limite por plano atual.

Lista de lead (várias linhas): `detailsMany(leadIds ≤ 20)` reserva `n` de uma vez e faz as `n` chamadas com concorrência 5; devolve o que conseguiu; estorna o que falhou. Mesma máscara `LIST`.

Teste de invariante em `placesFields.ts`: toda máscara só contém campos de uma lista permitida e o SKU calculado da máscara `LIST` é Pro e da `FULL` é Enterprise (barra alguém acrescentar `reviews`/`photos` sem querer e dobrar o custo ou violar atribuição).

## 5. Desenho de exibição e custo (GPLC-02)

### 5.1 Regras

1. **Lista da descoberta (tela Leads):** linhas mostram score, tier, sinais, cidade, categoria buscada e o nome **se** houver (OSM, confirmado, ou ao vivo na memória desta sessão). Lead do Google sem nome mostra "Negócio do Google" + categoria + cidade + selo. Logo depois de uma busca todos os nomes aparecem (vieram na resposta já paga, custo 0 extra). Depois de recarregar, o botão **"Carregar dados do Google desta página (N)"** busca os N visíveis sem nome (máscara LIST, até 20), conta N na cota e mostra o saldo do mês. Nada de busca automática por linha.
2. **Kanban e lista do CRM: zero chamadas ao Google.** "Enviar para CRM" (`leads.saveMany`) só aceita lead com nome (OSM/manual/confirmado) ou obriga a confirmar o nome na hora. Assim todo card do CRM é nome do cliente (ou OSM). Esta é a decisão que mantém o custo limitado: a parte pesada do uso (Kanban aberto, arrastar cards) nunca toca o Google.
3. **Detalhe do lead (gaveta `lead-detail.tsx`):** ao abrir, se o lead for do Google e ainda não confirmado, mostra o cartão do Google com **um** Place Details (máscara FULL se a cliente clicar "Mostrar telefone, site e nota", senão LIST). Cache em memória da sessão: abrir de novo na mesma sessão não rebusca. Lead confirmado: mostra os dados dela e um link opcional "Ver no Google" (`lead-links.ts:40`, link para fora, sem custo e sem dado nosso).
4. **Tela de busca (Text Search):** mostra e usa os dados ao vivo para decidir quem salvar, sem gravar.
5. **Cota:** `detailsUsed` por mês; ao zerar, os cartões somem e a tela segue funcional só com dado confirmado/OSM.

### 5.2 Contas (preços de 2026-10-08, US$; euro tratado 1:1 como em COST-PRICING.md)

Custos unitários: LIST (Pro) 0,017; FULL (Enterprise) 0,020. Premissas de uso (ESTIMATIVA minha): por cliente por mês, "consultas" pagas = rebuscas da lista após recarregar + aberturas de detalhe antes de confirmar.

| Plano (COST-PRICING) | Teto de leads/mês | Teto proposto de consultas ao Google/mês | Pior caso (tudo Enterprise) | Uso típico (LIST/FULL) | Custo típico |
|---|---|---|---|---|---|
| Solo €29 | 150 | 100 | 100 x 0,020 = US$2,00 | 60 / 30 | 60x0,017 + 30x0,020 = US$1,62 |
| Pro €59 | 500 | 300 | US$6,00 | 200 / 100 | US$5,40 |
| Agência €149 | 1.500 | 400 | US$8,00 | 250 / 150 | US$7,25 |

Margem bruta no teto de leads **mais** o pior caso de consultas (custos de leads+IA do COST-PRICING 4b: Solo 4,35; Pro 14,50; Agência 43,50):

| Plano | Custo total no teto | Margem bruta |
|---|---|---|
| Solo | 4,35 + 2,00 = 6,35 | (29-6,35)/29 = **78%** |
| Pro | 14,50 + 6,00 = 20,50 | (59-20,50)/59 = **65,3%** |
| Agência | 43,50 + 8,00 = 51,50 | (149-51,50)/149 = **65,4%** |

Meta do COST-PRICING: ≥ 65% no teto. Fecha com os tetos 100/300/400. Com uso típico (e não no pior caso) as margens sobem para 79%, 66% e 66% no teto de leads, e muito mais com uso real de 50%.

Conta da conta inteira (mix 50/40/10, uso típico médio por cliente = 135 consultas LIST + 70 FULL), já descontando os tetos grátis do app (5.000 Pro, 1.000 Enterprise):

| Clientes | Consultas LIST / FULL | Custo/mês | Receita (COST-PRICING 4c) |
|---|---|---|---|
| 10 | 1.350 / 700 | US$0 (dentro dos grátis) | €530 |
| 50 | 6.750 / 3.500 | (1.750 x 0,017) + (2.500 x 0,020) = **US$80** | €2.650 (3%) |
| 200 | 27.000 / 14.000 | (22.000 x 0,017) + (13.000 x 0,020) = **US$634** | €10.600 (6%) |

Contraprova (por que a lista e o Kanban não podem chamar o Google por linha): Kanban com 100 cards recarregado 20 vezes por dia, sem cache, 30 dias = 100 x 20 x 30 = 60.000 consultas LIST = **US$1.020/mês para um cliente**, 17 vezes o preço do plano Pro.

O Text Search atual (COST-PRICING 1a) não muda de custo: 1.000 grátis/mês, US$35/1.000 depois.

## 6. Fluxo de confirmação (risco 2)

### 6.1 Desenho recomendado

Princípio: **o Osprano nunca transforma conteúdo do Google em dado do cliente; só o cliente cria dado do cliente.** Detalhes:

1. O cartão do Google é visualmente separado (borda e fundo próprios, atribuição no topo), **somente leitura**, sem botão "usar", "copiar" ou "confirmar este dado", sem preencher campo nenhum e sem ser a fonte de default de nenhum input. Escolher não oferecer afordância é a diferença entre "o Osprano copiou" e "a cliente digitou".
2. A seção "Dados do negócio" (nome, telefone, endereço, e-mail) usa o `InlineField` que já existe (`src/components/crm/lead-info-fields.tsx:20-80`) e uma mutation nova `leads.confirmInfo` (campos opcionais, mesmo padrão de patch do `updateInfo`, `leads.ts:281-330`). Campos começam **vazios**.
3. Ao salvar o nome pela primeira vez, a cliente escolhe a **origem** em um select obrigatório: "Falei por telefone/WhatsApp com o negócio", "Fui ao local", "Vi no site do próprio negócio", "Vi nas redes sociais do negócio", "Outro". Grava `confirmation = { at, via }` (e `noSite: true` se marcar "Conferi que o negócio não tem site próprio"). Não existe opção "Copiei do Google"; ela só seria honesta se existisse e aí o próprio produto declararia a violação.
4. Ao confirmar o nome, recalcular `legalForm`/`emailable` (mesma função, `emailFields` em `leads.ts:281`), e liberar preview, mensagem e IA.
5. Edição posterior é livre (dado dela). Nada refaz sincronização com o Google.
6. Texto de ajuda do formulário (PT-BR sem travessão): "Confirme com o próprio negócio: ligue, visite ou veja o site. Não salvamos dados do Google."

### 6.2 Risco residual (dizer ao advogado, sem inventar certeza)

- O cliente, vendo o cartão do Google ao lado do formulário, pode apenas redigitar o nome lido. A cláusula é sobre o **Osprano** (Customer do Google) guardar nome/endereço; um dado digitado por terceiro (usuário final) é, em tese, dado dele. Mas o produto sabe que a origem prática é o cartão. Não há decisão judicial nem texto do Google que resolva isso. É um ponto de interpretação, não de código.
- Registro `confirmation.via` prova o que a cliente declarou, não o que ela fez.
- Versão mais estrita, barata de ligar depois (um flag de UI): esconder o cartão do Google enquanto o formulário de confirmação estiver aberto, ou mostrar o cartão só numa aba separada. Reduz a sensação de "copiar da tela" ao custo de piorar a usabilidade.
- A descoberta por Places em si (lista de negócios gerada por busca do Google e levada ao CRM de prospecção): no EEA depende do item (3) dos Permitted Uses; no não-EEA, de 3.2.3(d)(iii). Resolução definitiva só com resposta por escrito do Google (opção D do LEGAL.md, já com a Duda).
- Nome comercial é fato público e aparece em outras fontes (site do negócio, OSM); a defesa mais forte é que a cliente obteve do negócio, não do Google. Por isso a lista de origens acima.
- Histórico já gravado: rascunhos e mensagens enviadas, `callScript`, e slugs de sites publicados contêm o nome que veio do Google (item 7.3). São registro da comunicação da cliente; apagar quebraria o histórico. Residual aceito, listado para o advogado.

## 7. Migração (GPLC-04)

### 7.1 Regra por campo (somente `source === "places"`; os demais não são tocados)

| Campo | Ação |
|---|---|
| `name`, `address`, `phone`, `website`, `rating`, `reviewsCount` | `undefined` (nenhuma mutation anterior permitia editar; 100% Google) |
| `category` | manter só se o valor existir em `CATEGORY_OPTIONS` (taxonomia do próprio app, igual ao termo buscado, `domain.ts:~700`); senão `undefined` (é `primaryType` do Google) |
| `placeId`, `city`, `countryCode`, `orgId`, `source`, `stage*`, `saved`, `nextAction*`, `contact*`, `deal*`, `lost*`, `meeting*`, `waOptIn*`, `contactOptIn*`, `fetchedAt` | manter |
| `email`, `instagram`, `facebook`, `contactName`, `contactRole` | manter (da usuária ou do site do próprio negócio) |
| `score`, `tier`, `signals`, `scoredAt`, `legalForm`, `contactType`, `emailable` | manter (derivados, ver 2.3) |
| `callScript`, `callScriptPt` | manter (texto gerado; residual no 6.2) |
| `confirmation` | **não** inventar: nenhum lead antigo tem nome confirmado. Resultado: lead do Google antigo fica sem nome até a cliente confirmar. Estágio, notas, histórico, site, e-mail e redes ficam |
| outras tabelas | `events`, `outreach`, `uploads`: intocadas |

`previews.content` dos leads places (a parte que mais exige cuidado): para cada preview do lead, comparar cada campo do conteúdo com o valor do Google ainda presente no lead **no momento da migração** (`name, phone, address, rating, reviewsCount, category`). Igual (após trim) => é cópia intacta do Google: remover (rating/reviews para `null`; phone/address para ausente; category para `null`). Diferente => foi editado no editor do site: é dado da cliente, manter. `name` igual ao do Google: se o site **não está publicado**, esvaziar (o editor passa a exigir nome antes de publicar); se **está publicado** (`published && slug`), **não alterar** e listar no relatório para decisão da Duda (esvaziar derrubaria o título do site no ar). `slug` não muda (URL estável).

### 7.2 Execução em lote

Modelo no padrão de `purgeOrgBatch` (`convex/model/purge.ts`, lotes de 20 leads por transação). Limites reais do Convex lidos hoje (https://docs.convex.dev/production/state/limits): 16 MiB lidos, 32.000 documentos varridos, 16.000 escritos, 4.096 intervalos de índice (cada `db.get`/`db.query`), 1 s de código.

```ts
// convex/googleCompliance.ts
export const migrateBatch = internalMutation({
  args: { after: v.optional(v.number()), dryRun: v.boolean(), limit: v.optional(v.number()) },
  handler: async (ctx, { after, dryRun, limit = 50 }) => {
    const q = ctx.db.query("leads").withIndex("by_creation_time", (b) => (after === undefined ? b : b.gt("_creationTime", after)));
    const leads = await q.take(limit);                     // limit 50 => ~150 leituras, folgado
    const report = emptyReport();
    for (const lead of leads) {
      if (lead.source !== "places") continue;
      const patch = scrubLeadPatch(lead);                  // pura, em lib/googleData.ts; {} se já limpo (idempotente)
      const preview = await ctx.db.query("previews").withIndex("by_lead", (b) => b.eq("leadId", lead._id)).first();
      const next = preview ? scrubPreviewContent(preview.content, lead, preview.published === true) : null;
      tally(report, lead, patch, preview, next);           // só contagens; nunca imprimir nome/telefone
      if (!dryRun) { if (hasKeys(patch)) await ctx.db.patch(lead._id, patch); if (next?.changed) await ctx.db.patch(preview!._id, { content: next.content }); }
    }
    return { report, next: leads.length === limit ? leads[leads.length - 1]._creationTime : null };
  },
});
// runner: internalAction migrateAll({dryRun}) em loop sobre migrateBatch somando relatórios.
```

Importante: `scrubPreviewContent` precisa ler o lead **antes** do patch (ele compara com o valor do Google). Na ordem acima o `lead` é a leitura anterior ao patch: correto. Idempotência: após a migração o lead já não tem os campos, `scrubLeadPatch` devolve `{}` e `scrubPreviewContent` não acha igualdade; rodar de novo não muda nada. Desempate de `_creationTime` repetido é inofensivo porque a operação é idempotente (pode revisitar, nunca perde).

O relatório do ensaio traz: leads varridos, leads places, leads limpos, previews limpos, previews com nome Google igual ao do lead (publicados x não), `outreach` com rascunho/enviado desses leads, quantos leads ficam sem nome. **Nunca** dados pessoais, só contagens e ids.

### 7.3 Ensaio no dev, backup, rollback

O deployment de dev deste repo é **local** (LESSONS: `CONVEX_DEPLOYMENT=local:...`; `npx convex run` sobe e derruba o backend a cada chamada; redirecionar saída para arquivo, não para `| head`).

1. Dados de teste: seed sintético no dev (fixtures com lead places editado/não editado, preview igual e preview editado, site publicado, lead OSM, lead manual) por uma `internalMutation` só de dev (bloqueada se `CONVEX_ENV === "production"`, no padrão de `isDemoEnabled`). Importar snapshot de produção para o dev traz dado real de prospects para fora de produção: só com OK da Duda.
2. `npx convex dev --once` (envia schema + funções ao dev; sem isso o campo novo não grava, LESSONS "Mudança de schema não chega ao banco sozinha").
3. Backup do dev antes de rodar (documentar, mesmo no dev): `npx convex export --path ./backup-dev-YYYYMMDD.zip --include-file-storage` (flags confirmadas em `convex export --help`; padrão exporta o dev).
4. `npx convex run googleCompliance:migrateAll '{"dryRun":true}' > ensaio.json`; conferir contagens; rodar com `"dryRun":false`; rodar uma segunda vez e exigir `leadsLimpos: 0` (idempotência); abrir o app no dev e conferir estágio, notas, histórico, site, e-mail.
5. **Produção (portão com aprovação explícita da Duda; não é passo automático do plano):** (a) `npx convex export --prod --include-file-storage --path ~/backups/osprano-prod-YYYYMMDD.zip` e conferir o arquivo; (b) `npx convex dev`/deploy do código novo em produção; (c) dry-run em produção (`--prod`, `"dryRun":true`) e a Duda lê o relatório, decide os sites publicados; (d) execução real; (e) conferência: nenhuma ocorrência dos campos Google (`npx convex run --prod googleCompliance:audit` que só conta).
6. **Rollback:** a migração só apaga conteúdo do Google e esvazia cópias intactas; não existe "desfazer" lógico. O desfazer é o snapshot: `npx convex import --replace-all <zip>` (confirmado em `convex import --help`; apaga as tabelas que não estão no zip, por isso só com o zip completo e com a Duda ciente). Isto restaura também os dados do Google que a fase quer eliminar; só usar se algo essencial foi perdido. Não executar `export`/`import` nesta pesquisa (nada foi executado).
7. Ordem de deploy segura: primeiro o código que **para de gravar** conteúdo do Google e lê tolerando `name` ausente (compatível com dados antigos); depois migrar; só então qualquer endurecimento. Nunca migrar antes do código novo, senão uma busca nova regrava o Google em lead já limpo.

## 8. Purge de lat/lng em 30 dias

Convex 1.42.1 (`node_modules/convex`, `convex/server` exporta `cronJobs`); doc https://docs.convex.dev/scheduling/cron-jobs (lida hoje): arquivo `convex/crons.ts` com `export default crons`; no máximo uma execução simultânea por cron; evitar minuto 0.

```ts
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.daily("purge google lat/lng", { hourUTC: 3, minuteUTC: 17 }, internal.googleCompliance.purgeExpiredLocation);
export default crons;

// convex/googleCompliance.ts
const LOC_TTL_MS = 29 * 24 * 60 * 60 * 1000; // 29 dias: o cron roda 1x/dia, então o pior caso fica em 30
export const purgeExpiredLocation = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - LOC_TTL_MS;
    const rows = await ctx.db.query("leads")
      .withIndex("by_loc_at", (q) => q.gt("locAt", 0).lt("locAt", cutoff))   // gt(0) exclui linhas sem locAt
      .take(200);
    for (const l of rows) await ctx.db.patch(l._id, { lat: undefined, lng: undefined, locAt: undefined });
    if (rows.length === 200) await ctx.scheduler.runAfter(0, internal.googleCompliance.purgeExpiredLocation, {});
  },
});
```

Pontos: patch com `undefined` remove o campo (já usado em `leads.ts:187`). O `gt(0).lt(cutoff)` é para não depender de como o Convex ordena documentos sem o campo no índice (verificar no dev com um lead sem `locAt`; MÉDIA). Reagenda a si mesmo se o lote encheu. Também apagar lat/lng na deleção do lead já é coberto (`deleteLeadCascade` apaga o documento).

Decisão de produto pendente (Perguntas Abertas): hoje **nada consome lat/lng** (nenhum mapa é permitido, nenhuma ordenação por distância existe). Gravá-los é custo de conformidade sem benefício. O plano deve implementar campos + cron + testes (decisão travada) mas ligar a gravação em `places.ts` somente se a Duda quiser; a linha é uma só.

## 9. SCAL-01: `.collect()` e paginação

Limites relevantes (lidos hoje): 16 MiB e 32.000 documentos por transação; 4.096 intervalos de índice (cada `db.get` e `db.query`). Padrão do Convex: `paginationOptsValidator` (`convex/server`), `.paginate(opts)` na query, `usePaginatedQuery(api.x, args, { initialNumItems })` no cliente; páginas são reativas e **o tamanho pode variar** (doc de paginação).

| Função | Hoje | Limite real que estoura | Recomendação | O que a UI muda |
|---|---|---|---|---|
| `leads.list` (`leads.ts:65-82`) | `.collect()` toda a org, ordena em memória | ~16 MiB / 32k docs; também retorno de 16 MiB | Dividir em: `leads.listDiscovered({paginationOpts, optIn})` com `by_org_saved_score` (`saved=false`, `.order("desc")`, filtro server de país por regime) e `leads.listByStage({stage, paginationOpts})` com `by_org_stage_score` + `.filter(saved !== false)`; `leads.dueActions({endOfDay})` com `by_org_next` + `take(100)` para a faixa "Hoje" | `leads/page.tsx` troca `useQuery(list)` por `usePaginatedQuery(listDiscovered)` + "Carregar mais" (o filtro cidade/categoria pode ficar no cliente sobre as páginas carregadas, ou virar argumento); `crm/page.tsx` troca por **uma `usePaginatedQuery` por coluna** (30 cada, "ver mais") + `dueActions`. As atualizações otimistas em `api.leads.list` (`crm/page.tsx:91-99`, `delete-lead-button.tsx:25-31`, `today-strip.tsx:35-44`) deixam de existir (a query não existe mais): usar estado local `pendingMoves: Map<id, stage>` mesclado aos resultados até o servidor refletir (~10 linhas), ou `optimisticallyUpdateValueInPaginatedQuery` para atualizar valor dentro da mesma coluna (não move entre colunas) |
| busca por texto no Kanban | filtra os cards em memória (`crm/page.tsx:127-132`) | n/a | `searchIndex("search_name")` (já no Convex, sem dependência) via `leads.search({q})` com `take(30)`, usada quando `q.length >= 2`; sem isso a busca só acharia cards já carregados | campo de busca troca a fonte de dados |
| `leads.stats` (`:103-125`) e `analytics` (`:128-149`) | `.collect()` + contagem em memória | mesmos limites | Sem contador agregado e sem dependência nova: ler `by_org` com `take(5000)` e devolver `truncated: boolean`. 5.000 leads x ~1,5 KB = ~7,5 MB, bem abaixo de 16 MiB e 32k docs. Quando uma org passar de ~3.000 leads, trocar por tabela de contadores ou componente `@convex-dev/aggregate` (**dependência nova: precisa de aprovação**). Alternativa desta fase se a Duda quiser exato desde já: `orgStats` mantido pelas ~10 mutations que mudam estágio/tier (invasivo, não recomendado agora) | dashboard mostra "5.000+" se `truncated` |
| `previews.listSites` (`previews.ts:265-297`) | `.collect()` + `db.get(lead)` por linha | 4.096 intervalos => quebra por volta de 4.000 sites | `by_org_open` (`openCount` desc) `.paginate` (24 por página), mantém a ordenação atual por aberturas | `sites/page.tsx` com `usePaginatedQuery` + "Carregar mais" |
| `outreach.outbox` (`outreach.ts:56-122`) | `by_org` + `.filter(channel==="email")` + `.collect()`, 2 leituras por linha (lead e preview) | ~2.000 linhas (4.096/2) | índice `by_org_channel` ["orgId","channel"], `.order("desc").paginate` (50 por página); ordenar por `activityAt` dentro da página | `outreach/page.tsx` com `usePaginatedQuery`; a ordem global passa a ser por criação |
| `suppressions.isEmailSuppressed` (`suppressions.ts:47-57`) | `by_email` `.collect()` e `.some(...)` | cresce com nº de orgs que suprimiram o mesmo e-mail | duas leituras `.first()`: `by_org_email` (`orgId`,`email`) e a global com `q.eq("orgId", undefined)` | nenhuma. Verificar no dev que `eq(undefined)` casa linha sem `orgId` (hoje o código usa `.filter(...)`, `suppressions.ts:18-21`); se não casar, `by_email` + `.take(100)` e `.some` |

Fora do escopo mas com o mesmo risco (anotar, não mexer): `admin.ts:21,30,115,169,187,242` (CLI), `demo.ts:241-249`, `deleteLeadCascade` (`model/leads.ts`).

## 10. Don't hand-roll

| Problema | Não construir | Usar | Por quê |
|---|---|---|---|
| Campo editável com blur/Enter/Esc | formulário novo | `InlineField` em `src/components/crm/lead-info-fields.tsx` | já tem validação e mensagens |
| Atribuição de fonte | texto solto por tela | molde de `OsmAttribution` (`src/components/osm-attribution.tsx`) -> `GoogleAttribution` | um lugar, testável |
| "Posso usar esse dado fora do app?" | `if` em cada tela | `shareableName/Signals` em `lib/googleData.ts` | LESSONS: `canContactByEmail` foi bug em 6 telas até virar predicado único |
| Cron | `setInterval`/action em loop | `cronJobs` + `internalMutation` em lote | nativo do Convex |
| Paginação | cursor manual | `.paginate` + `usePaginatedQuery` | nativo |
| Busca por nome | `filter` em memória | `searchIndex` do Convex | nativo, sem dependência |
| Contador agregado exato | tabela caseira em dezenas de mutations | `take` limitado agora; `@convex-dev/aggregate` depois com aprovação | menor mudança |
| Preço/campo por SKU | números espalhados | `lib/placesFields.ts` com teste | impede custo silencioso |

## 11. Armadilhas

1. **`scoreLead` sobrescreve score bom com lixo** para lead places sem website/phone/rating no banco (seção 2.3). Pular o agendamento para places.
2. **`insertDiscovered` regrava o Google num refresh** (`leads.ts:523-542`) e apagaria dado confirmado; no ramo existing de places não tocar em conteúdo.
3. **`readContent` cai para `lead.name`** (`model/previews.ts:44-54`) e `publish` gera slug de `content.name` (`previews.ts:236`): com nome ausente o site publica vazio. Exigir nome antes de criar/publicar.
4. **`MapEmbed` mostra Google Maps com endereço** (`shared.tsx:572`): só OK porque o endereço passa a ser digitado; o `GoogleCard` (conteúdo do Google) nunca pode aparecer na mesma tela/contêiner do preview com mapa. Hoje o editor do site e a gaveta do lead são telas diferentes; manter assim e cobrir com teste de varredura (nenhum arquivo importa `GoogleCard` e `MapEmbed`).
5. **Resposta de action não é cache do Convex, mas `useQuery` é.** Dado do Google só por `useAction`; nunca devolvido por `query` reativa nem gravado em estado persistente.
6. **Não logar conteúdo do Google** (`console.log` de resposta de Details/Text Search). O código atual só loga corpo de erro (`places.ts:95`).
7. **`name` opcional quebra tipos em ~40 lugares:** deixar o `tsc` guiar e usar um helper `leadLabel(lead)` ("Negócio do Google" quando vazio); não preencher com string vazia (o `tsc` não pegaria).
8. **Demo marcado como `places`** (`demo.ts:309`) ficaria sem nome. Trocar o source do seed.
9. **Optimistic updates** de `api.leads.list` somem com a query; refazer (seção 9) ou o Kanban perde a sensação de arrastar.
10. **Schema primeiro:** `npx convex dev --once` antes de qualquer teste real (LESSONS); código novo em produção antes da migração (7.3 item 7).
11. **Ordem de deploy dev/prod e tipos gerados:** `convex/_generated/` é derivado do schema; `tsc -p convex` só passa depois do schema novo.
12. **Teste no Node não importa `convex/*.ts` com import sem extensão** (`leads.ts` importa `./lib/domain` sem `.ts`): lógica testável precisa estar em `convex/lib/` ou `convex/model/` com imports `.ts` e `import type` de `_generated` (padrão de `model/purge.ts`).
13. **DM com nota/avaliações** (`dm-template.ts:358`): deixa de ter dado (campos não gravados); o ramo sem avaliação já existe, mas conferir/atualizar `tests/dm-template.test.ts`.
14. **Nota do `docs/LESSONS.md` "city tem três origens":** `city` não é Google no Places (vem do select); não migrar nem apagar.
15. **Next 16:** a fase não cria rotas; é client component + Convex. AGENTS.md pede ler `node_modules/next/dist/docs/` (existe, `01-app`) antes de código Next: o planejador deve mandar o executor ler antes de qualquer arquivo de rota/layout novo (não esperado aqui).

## 12. Exemplos de código verificados

```ts
// Paginação (docs.convex.dev/database/pagination, lida hoje)
export const listSites = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    return await ctx.db.query("previews").withIndex("by_org_open", (q) => q.eq("orgId", orgId)).order("desc").paginate(args.paginationOpts);
  },
});
// cliente: const { results, status, loadMore } = usePaginatedQuery(api.previews.listSites, {}, { initialNumItems: 24 });
// loadMore(24) só quando status === "CanLoadMore"
```

```ts
// Hook de dado do Google: só memória, nunca persistido
const mem = new Map<string, { at: number; place: GooglePlace }>();      // módulo; some no reload
export function useGooglePlace(leadId: Id<"leads">, placeId: string | undefined) {
  const details = useAction(api.places.details);
  // 1) mem.get(placeId) => usa; 2) senão details({leadId}) uma vez, dedupe de requisição em voo
}
```

## 13. Estado da arte

| Antes | Agora | Desde | Impacto |
|---|---|---|---|
| US$200 de crédito mensal | franquia grátis por SKU | 01/03/2025 | free tiers por SKU (tabela 3) |
| termos únicos | termos EEA por endereço de cobrança | 08/07/2025 | lista de Permitted Uses no EEA |
| `place_id` livre | continua livre; renovação recomendada > 12 meses | n/a | job anual opcional (deferido) |

## 14. Perguntas abertas

1. **País da conta de faturamento do GCP.** Sabemos: projeto `soprano-503222`, "Pagamento do Firebase". Não sabemos o país do endereço. Define EEA x não-EEA (seção 2.2). Ação: a Duda confere no Console; a empresa brasileira deve ter conta própria.
2. **Sites já publicados com nome do Google** (7.1). Sabemos: não há como saber quantos sem rodar o dry-run. Recomendação: o relatório do ensaio lista; a Duda decide manter no ar (residual) ou derrubar.
3. **Gravar lat/lng ou não.** Sem consumidor hoje. Recomendação: implementar campos+cron+testes, não ligar a gravação até haver uso.
4. **Tetos de consultas ao Google (100/300/400)** são proposta para o COST-PRICING e dependem da Fase 12 para virar plano. Recomendação: entram como `detailsPerMonth` no `PLANS` atual (free 25, pro 300, agency 400) e a Fase 12 reajusta.
5. **Sinais do Google na IA enquanto não houver confirmação** (2.3). Efeito: lead places sem confirmação gera mensagem "sem sinal verificado". Recomendação: aceitar; a Fase 14 (verificação) devolve sinais verificados de outra fonte.
6. **Logo do Google:** baixar o zip oficial e colocar o SVG em `public/` (arquivo, não npm). Precisa do OK da Duda para adicionar o ativo.
7. **Histórico já gravado** (rascunhos/mensagens/roteiros/slug) com nome do Google: residual aceito ou purgar? Recomendação: manter e listar para o advogado.
8. **Foursquare OS (`source: "fsq"`):** o comentário do schema diz ser fonte armazenável; não revalidei a licença nesta pesquisa (BAIXA). Fora do escopo; não mexer.
9. **Busca de nome no CRM:** incluir `searchIndex` agora (recomendado) ou limitar a busca aos cards carregados.

## 15. Arquitetura de validação

### Framework de teste
| Propriedade | Valor |
|---|---|
| Framework | `node:test` com `--experimental-strip-types` (Node nativo, sem Jest/Vitest) |
| Config | nenhum arquivo; script `test` em `package.json` |
| Comando rápido | `node --experimental-strip-types --test tests/google-*.test.ts` |
| Suíte completa | `node --experimental-strip-types --test tests/*.test.ts` (baseline hoje: 390 passando em ~1,4 s) |
| Tipos | `./node_modules/.bin/tsc --noEmit` e `./node_modules/.bin/tsc --noEmit -p convex` |
| Lint / build | `./node_modules/.bin/eslint` e `./node_modules/.bin/next build` |
| Infra | `tests/fake-ctx.ts` (84 linhas): `query/withIndex(eq)/take/first/collect`, `get/insert/patch/delete`, storage. **Não** tem `gt/lt/gte/lte`, `.order`, `.filter`, `.paginate` |

### Mapa requisito -> teste
| Req | Comportamento | Tipo | Comando | Existe? |
|---|---|---|---|---|
| GPLC-01 | `insertPlacesLead` grava só placeId, category, city, país, derivados; nunca name/address/phone/website/rating/reviews; ramo "existing" não altera conteúdo nem confirmação | unit (fakeCtx) | `node --experimental-strip-types --test tests/google-discovery.test.ts` | Wave 0 |
| GPLC-01 | `purgeExpiredLocation` limpa só lat/lng/locAt vencidos (> 29 dias), preserva o resto, idempotente, reagenda se lote cheio | unit (fakeCtx estendido com gt/lt) | `... tests/google-purge.test.ts` | Wave 0 |
| GPLC-01 | `crons.ts` referencia função que existe (varredura de texto) | static | `... tests/google-purge.test.ts` | Wave 0 |
| GPLC-02 | `reserveUsage(...,"details",n)` respeita `detailsPerMonth`, reseta no mês, `refundUsage` não fica negativo | unit (fakeCtx) | `... tests/google-details-quota.test.ts` | Wave 0 |
| GPLC-02 | máscaras: `LIST` cobra Pro, `FULL` cobra Enterprise, nenhuma contém reviews/photos/atmosphere | unit puro | `... tests/google-fields.test.ts` | Wave 0 |
| GPLC-02 | custo: tetos x preços mantêm margem >= 65% (constantes de `placesFields.ts` + `PLANS`) | unit puro | `... tests/google-fields.test.ts` | Wave 0 |
| GPLC-03 | `shareableName/Signals`: places sem confirmação => vazio; com `confirmation.noSite` libera noSite; OSM/manual/fsq sempre libera; `sparseProfile` nunca para places | unit puro | `... tests/google-shareable.test.ts` | Wave 0 |
| GPLC-03 | `ensurePreview` e `defaultContentForLead` recusam/omitem lead places sem nome; prompt (`businessLine`, `observationsPrompt`) não recebe dado Google | unit | `... tests/google-shareable.test.ts` (+ ajuste em `tests/site.test.ts`, `tests/dm-template.test.ts`) | Wave 0 / existente |
| GPLC-03 | `confirmInfo` grava `confirmation`, exige origem, recalcula `legalForm/emailable` | unit (fakeCtx) | `... tests/google-confirm.test.ts` | Wave 0 |
| GPLC-04 | `scrubLeadPatch` por campo (Google some; email/redes/estágio ficam; category só se em CATEGORY_OPTIONS); `scrubPreviewContent` (igual remove; editado mantém; publicado não esvazia nome); idempotência (2ª rodada = vazio); lead OSM/manual intocado | unit puro | `... tests/google-migration.test.ts` | Wave 0 |
| GPLC-04 | `migrateBatch` com fakeCtx (dryRun não escreve; real escreve; relatório sem dados pessoais) | unit (fakeCtx; precisa `by_creation_time`/`gt` ou testar o laço por função pura) | `... tests/google-migration.test.ts` | Wave 0 |
| GPLC-04 | ensaio ponta a ponta no dev local | manual | `npx convex dev --once` + `npx convex run googleCompliance:migrateAll '{"dryRun":true}' > ensaio.json` | manual (justificativa: precisa do runtime Convex) |
| GPLC-05 | todo arquivo que usa `use-google-places`/`GoogleCard` renderiza `GoogleAttribution`; nenhum arquivo importa `GoogleCard` junto de `MapEmbed`; nenhum `localStorage/sessionStorage` no hook | static (varredura de fontes, mesmo estilo de `tests/landing-honesty.test.ts`) | `... tests/google-attribution.test.ts` | Wave 0 |
| GPLC-05 | tamanho/contraste/posição visual do logo | manual | conferir no dev (Chrome headless cacheado, LESSONS: usar tempo real, não virtual) | manual (justificativa: visual) |
| SCAL-01 | `leads.ts` (list/stats/analytics), `previews.listSites`, `outreach.outbox`, `isEmailSuppressed` sem `.collect()` (varredura por função) | static | `... tests/google-scal.test.ts` | Wave 0 |
| SCAL-01 | paginação e Kanban com > 100 leads, "Carregar mais", arrastar e excluir | manual no dev (seed de 200 leads) | `npx convex dev --once` + abrir `/crm`, `/leads`, `/sites`, `/outreach` | manual (justificativa: UI reativa) |

### Taxa de amostragem
- Por commit de tarefa: `node --experimental-strip-types --test tests/google-*.test.ts` + `./node_modules/.bin/tsc --noEmit`.
- Por onda: suíte completa + `tsc --noEmit -p convex` + `eslint`.
- Portão da fase (antes de `/gsd:verify-work`): suíte completa verde, `tsc` x2, `eslint`, `next build`, `npx convex dev --once` no dev sem erro, relatório do ensaio de migração anexado, grep final: nenhuma leitura de `lead.rating|lead.website|lead.phone` de places fora de `lib/googleData.ts`.

### Lacunas da Wave 0
- [ ] `tests/fake-ctx.ts`: adicionar `gt/gte/lt/lte` no `withIndex`, `order("desc")` e `by_creation_time` (necessário para purge e migração).
- [ ] `tests/google-discovery.test.ts`, `google-purge.test.ts`, `google-details-quota.test.ts`, `google-fields.test.ts`, `google-shareable.test.ts`, `google-confirm.test.ts`, `google-migration.test.ts`, `google-attribution.test.ts`, `google-scal.test.ts`.
- [ ] Mover a lógica de `insertDiscovered` e de `reserveUsage` para arquivos importáveis (`convex/model/discovery.ts`; `workspace.ts` já é importável).
- [ ] Ajustar fixtures de `tests/site.test.ts`, `tests/dm-template.test.ts`, `tests/crm-domain.test.ts`, `tests/outreach-lang.test.ts` quando `name` virar opcional (o `tsc` aponta).
- Nenhum framework a instalar.

## 16. Ordem sugerida de ondas (para o planejador)

1. **Fundação:** `lib/googleData.ts`, `lib/placesFields.ts`, schema (campos e índices), `fake-ctx` estendido, testes puros. Sem mudar comportamento.
2. **Descoberta e Google ao vivo:** `insertPlacesLead`, `places.search` devolve `shown`, `places.details/detailsMany`, contador `detailsUsed`, pular `scoreLead` para places, `category` do termo buscado.
3. **UI Google + confirmação + atribuição:** `GoogleAttribution`, `GoogleCard`, hook em memória, `leads.confirmInfo`, "Dados do negócio", gating em preview/IA/DM/WhatsApp, `name` opcional em todos os leitores, termos (aviso 3.2.2).
4. **SCAL-01:** índices e queries paginadas, UI de Leads, CRM por coluna, Sites, Outbox, `isEmailSuppressed`, stats/analytics limitados.
5. **Compliance operacional:** `crons.ts` + purge, `migrateBatch/migrateAll/audit`, seed de dev.
6. **Ensaio no dev** (relatório, idempotência), documentar backup.
7. **Portão de produção:** passo humano com aprovação explícita da Duda (backup, dry-run em prod, decisão dos sites publicados, execução, auditoria).

## Fontes

### Primárias (ALTA)
- Texto integral baixado e lido hoje: https://cloud.google.com/maps-platform/terms (mod. 26/08/2026), https://cloud.google.com/maps-platform/terms/maps-service-terms (10/06/2026), https://cloud.google.com/terms/maps-platform/eea (26/08/2026), https://cloud.google.com/terms/maps-platform/eea/maps-service-terms (10/06/2026), https://cloud.google.com/terms/maps-platform/eea-places-api-permitted-uses (04/06/2025)
- https://developers.google.com/maps/billing-and-pricing/pricing (atualizada 2026-10-08), https://developers.google.com/maps/billing-and-pricing/sku-details (campos por SKU)
- https://developers.google.com/maps/documentation/places/web-service/policies (atribuição, cache) e zip de logos
- https://developers.google.com/maps/documentation/places/web-service/place-id (armazenar place_id, NOT_FOUND, renovação)
- https://developers.google.com/maps/comms/eea/faq (EEA por conta de faturamento)
- https://docs.convex.dev/production/state/limits, https://docs.convex.dev/scheduling/cron-jobs, https://docs.convex.dev/database/pagination (lidas hoje); tipos em `node_modules/convex` 1.42.1 (`cronJobs`, `paginate`, `optimisticallyUpdateValueInPaginatedQuery`); `convex export --help` e `convex import --help` locais
- Código do repo (citado com arquivo:linha) e `.planning/research/commercial/LEGAL.md` s3, `COST-PRICING.md`

### Secundárias (MÉDIA)
- Busca web sobre Place Details em lote: nenhuma documentação oficial de lote encontrada (ausência de evidência, não prova)

### Terciárias (BAIXA, validar)
- Estimativas de uso por cliente (consultas LIST/FULL), taxa de reabertura, e o efeito de `q.eq("orgId", undefined)` em índice (verificar no dev)

## Metadados

**Confiança:**
- Stack/padrões Convex: ALTA (docs e tipos locais)
- Termos do Google (texto): ALTA; interpretação (confirmação, cache em memória, score derivado, publicidade/diretório): MÉDIA/BAIXA, para advogado
- Preços: ALTA (página oficial de 2026-10-08); custos por cliente: MÉDIA (premissas minhas)
- Migração: MÉDIA (lógica clara; relatório do dry-run decide pontos abertos)

**Data da pesquisa:** 2026-10-12
**Válido até:** 2026-11-12 (termos e preços do Google mudam; reconferir antes de produção)
