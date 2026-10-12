# Osprano v1.3: Legal e compliance de dados para vender como SaaS

**Pesquisado em:** 2026-10-12 (todas as URLs "checadas" nesta data)
**Aviso:** isto é pesquisa, não aconselhamento jurídico. Itens que exigem advogado estão marcados com [ADVOGADO].
**Confiança geral:** MÉDIA. Termos do Google e LSSI: ALTA (texto oficial lido). Papéis GDPR, Verifactu, DPAs de fornecedores: MÉDIA/BAIXA (ver cada seção).

---

## 0. Resumo executivo (o que muda o roadmap)

1. **Achado mais grave: o modelo de dados atual viola os termos do Google Places.** Os termos só permitem guardar `place_id` (sem limite) e latitude/longitude (30 dias). Nome, endereço, telefone, rating e site NÃO têm janela de cache permitida, e "copiar e salvar nomes e endereços de empresas" está listado como exemplo de scraping proibido. Hoje `convex/places.ts` grava tudo isso em `leads` sem prazo. O "purge de 30 dias" do GDPR-01 reduz o risco mas não torna conforme. Decisão de produto necessária (seção 3).
2. **Papel GDPR recomendado:** operadora (processor) dos dados de leads dentro do workspace de cada cliente; controladora (controller) só dos dados da conta/cobrança dos clientes e da lista global de supressão. Isso exige DPA (Art. 28) aceito no cadastro e lista de subprocessadores.
3. **Envio no lançamento:** "abrir no meu app de e-mail" (mailto, deep link do Gmail/Outlook) + copiar. Duda nunca transmite o e-mail, então não é remetente. Gmail OAuth custa avaliação de segurança (escopo restrito); SMTP do cliente obriga guardar senha. Deixar para depois.
4. **Cookies:** o app não usa analytics nem publicidade. Só auth do Clerk (estritamente necessário) e `localStorage` de tema e assinatura. Banner de consentimento não é exigido hoje, mas precisa de página de política de cookies e a regra "sem analytics sem banner".
5. **Impostos:** vender para empresas da UE = inversão do sujeito passivo (sem IVA espanhol) mas exige alta no ROI. Vender para pessoa física UE = IVA do país do cliente via OSS (limite de 10.000 EUR/ano só para a regra de pequeno vendedor). Duda precisa de alta como autónoma ANTES de cobrar o primeiro cliente.
6. **Páginas obrigatórias que hoje NÃO existem** (`src/app` tem só `(app)`, `p`, `sign-in`, `sign-up`, `site`): Aviso Legal, Privacidade, Termos, Cookies, DPA, Subprocessadores.

---

## 1. Papéis GDPR e obrigações

### 1.1 Quem é quem (recomendação)

| Dado | Papel de Duda | Justificativa |
|---|---|---|
| Dados dos prospects (nome do negócio, endereço, telefone, e-mail, rating, redes) dentro do workspace do cliente | **Operadora (processor)** | O cliente decide a finalidade (prospectar) e os meios essenciais (que categoria, cidade, a quem escrever). Duda fornece a ferramenta. |
| Conta, login, cobrança do cliente | **Controladora** | Duda decide por que e como trata. |
| Lista global de supressão (e-mails que clicaram em descadastrar, `suppressions` com `orgId` vazio) | **Controladora** (legítimo interesse + obrigação de respeitar objeção, Art. 21) | Serve a todos os clientes e à própria Duda; é preciso manter para cumprir o opt-out mesmo se o cliente apagar a conta. |
| Dados de pessoas físicas que aparecem (sole trader, nome de contato, e-mail nominal) | Mesma regra acima, mas são o risco real | Ver 1.5. |

**Risco de co-controladoria:** a EDPB (Diretrizes 07/2020 sobre controller/processor) olha quem determina os "meios essenciais". Duda escolhe as fontes (Google/OSM), o score, a geração por IA e guarda um cache. Se o produto pré-popular leads sem o cliente pedir, ou reaproveitar dados entre clientes, Duda vira controladora ou conjunta. Regras de código que mantêm a posição de operadora: (a) a busca é sempre iniciada pelo cliente; (b) nada é compartilhado entre workspaces (já é verdade: tudo é por `orgId`); (c) o único uso por conta própria é a supressão global. [ADVOGADO] confirmar a qualificação e redigir o DPA.

Fontes: GDPR Art. 4, 24, 26, 28 (https://eur-lex.europa.eu/eli/reg/2016/679/oj, texto também em https://gdpr-info.eu/art-14-gdpr/, checado 2026-10-12); EDPB Guidelines 07/2020 (https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-072020-concepts-controller-and-processor-gdpr_en, não reaberto nesta sessão, MÉDIA).

### 1.2 DPA (Art. 28) a oferecer aos clientes

Conteúdo mínimo (Art. 28(3)): objeto, duração, natureza e finalidade, tipos de dados e categorias de titulares; tratar só conforme instruções documentadas; confidencialidade do pessoal; medidas de segurança (Art. 32); regras de subprocessadores (autorização geral com aviso prévio e direito de objeção); assistência para direitos dos titulares; assistência em violação e DPIA; apagar ou devolver os dados ao fim; permitir auditoria; cláusulas de transferência internacional (SCCs onde preciso).

**Produto:** aceitação do DPA como checkbox obrigatório no cadastro/primeiro acesso, com versão e carimbo de data gravados (campo novo em `workspaces`, p.ex. `dpaAcceptedAt`, `dpaVersion`, `termsAcceptedAt`). Bloquear o app até aceitar. Arquivos: `convex/schema.ts`, `convex/workspaces.ts`, onboarding em `src/app/(app)/`.

### 1.3 Subprocessadores (lista pública + aviso de mudança)

| Fornecedor | Dado que toca | Onde confirmar DPA/região | Confiança |
|---|---|---|---|
| Convex | Todo o banco (leads, outreach, eventos) | Convex tem DPA e opção de região UE a verificar no dashboard/trust center. NÃO consegui confirmar nesta sessão (busca só trouxe modelos genéricos). | BAIXA |
| Clerk | Identidade e e-mail dos clientes (não dos prospects) | DPA e DPF do Clerk, verificar | BAIXA |
| Vercel | Hospeda front, páginas `/p` e `/site` (logs de IP de visitantes) | DPA padrão Vercel, verificar região | BAIXA |
| Resend | Envio transacional/unsubscribe, e-mail dos clientes; NÃO usar para cold outreach (AUP) | DPA Resend | BAIXA |
| Stripe | Cobrança dos clientes | DPA Stripe (aceito automaticamente nos termos) | MÉDIA (conhecimento geral) |
| Anthropic | Texto dos prospects enviado ao prompt de e-mail/script | DPA da API incorpora SCCs e DPF; contratante para EEE é Anthropic Ireland. Fontes secundárias discordam sobre retenção (7 vs 30 dias) e há menção a retenção de 30 dias para certos modelos em 2026. Confirmar no site da Anthropic. | BAIXA |
| Google (Places) | Termos de uso da API; Google é controlador independente (Controller-Controller Terms) | https://business.safety.google/controllerterms/ citado nos EEA Terms | ALTA |
| Serper.dev | Nome+cidade do negócio enviados em buscas | Não achei DPA/privacidade na busca. Provável fornecedor US pequeno. Pedir DPA ou limitar a consulta a nome do negócio+cidade (sem e-mail/telefone). | BAIXA |

**Ação:** antes do lançamento, cada linha precisa de (a) DPA assinado/aceito, (b) região ou mecanismo de transferência (SCCs/DPF) registrado. Os links vão na página `/subprocessors`. [ADVOGADO] revisar se Serper sem DPA é aceitável; alternativa é trocar de fornecedor.

### 1.4 Registro de tratamento (Art. 30)

Operadora precisa de registro das categorias de tratamento feitas por conta de cada controlador (Art. 30(2)). Duda também, como controladora, do registro (Art. 30(1)). Exceção para <250 empregados NÃO se aplica se o tratamento não é ocasional, o que é o caso. Entregável: um documento interno (planilha ou markdown) em `docs/compliance/ropa.md`; sem código. Não vai a público.

### 1.5 Legítimo interesse (LIA) e informação aos prospects (Art. 14)

- Base legal da prospecção B2B: legítimo interesse (Art. 6(1)(f), Considerando 47 admite marketing direto). A LIA é do **cliente** (controlador), mas Duda deve fornecer um modelo pronto e um parágrafo-padrão no DPA. Entregável: `docs/compliance/lia-template.md` com teste de 3 passos (finalidade, necessidade, balanço), resultado esperado: OK para empresa constituída/caixa de função; NÃO para pessoa física/sole trader (o guardrail `isEmailable` já implementa isso).
- **Art. 14:** dados não coletados do titular exigem informar em até 1 mês (14(3)), com exceção por esforço desproporcional se a informação for tornada pública (14(5)(b)), citado em https://gdpr-info.eu/art-14-gdpr/ (checado 2026-10-12). Na prática o primeiro e-mail já é o contato; ele deve conter: identidade do cliente remetente, finalidade, fonte (Google Maps/OSM), link para política e para descadastro/objeção. **Produto:** o rodapé injetado por código (`convex/lib/compliance.ts`) deve ganhar a linha de fonte e o link de política. Mais uma página pública `/aviso-prospect` (ou seção em Privacidade) para quem não recebeu e-mail mas está no CRM (14(5)(b)).
- **Art. 21(2)(3):** objeção a marketing direto é absoluta; o endpoint de unsubscribe e a tabela de supressão já cobrem o caso. Garantir que "descadastrar" cria supressão global (já suportado por `orgId` opcional).
- **UK:** prospects em GB estão sob UK GDPR/PECR. Se Duda for controladora de dados do Reino Unido, pode precisar de representante no UK (Art. 27 UK GDPR) e taxa ICO. Como operadora, o ônus é do cliente. [ADVOGADO]. Guia ICO: assinantes corporativos x indivíduos (sole traders e parcerias comuns contam como indivíduos, regras de consentimento valem): https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/key-concepts-for-direct-marketing-using-electronic-mail/ (checado 2026-10-12, MÉDIA via resumo de busca).
- **Espanha como destino:** LSSI Art. 21 proíbe e-mail promocional sem consentimento prévio, sem diferenciar empresa de pessoa (exceção só para relação contratual prévia), https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758 (checado 2026-10-12, ALTA). Confirma a decisão "ES é ligar primeiro".

### 1.6 Eliminação (Art. 17) e direitos dos titulares

| Pedido | Quem responde | Como o produto atende |
|---|---|---|
| Prospect pede apagar/objetar | Cliente (controlador) responde; Duda assiste (Art. 28(3)(e)) | Cliente: botão Excluir lead (`leads.remove` → `deleteLeadCascade`, já existe). Duda: fluxo para o prospect escrever a `privacidade@` e Duda criar supressão global + acionar remoção nos workspaces. |
| Cliente cancela a conta | Duda | **Falta**: não existe exclusão de workspace/conta. Criar `workspaces.deleteAccount` (apaga leads, previews, uploads, outreach, eventos; mantém só supressões globais; cancela Stripe). Hoje só há cascata por lead e `admin.ts`. |
| Exportação (portabilidade/devolução ao fim do contrato) | Duda | Export CSV/JSON do workspace (item de lançamento mínimo ou pós-lançamento rápido). |

Prazo legal de resposta: 1 mês (Art. 12(3)). Retenção de logs/backup: documentar no DPA (p.ex. 30 dias para backups).

---

## 2. Páginas públicas e termos

### 2.1 Lista e conteúdo

| Página | Rota sugerida | Obrigatória por | Conteúdo-chave |
|---|---|---|---|
| Aviso Legal | `/legal` | LSSI Art. 10.1: nome ou denominação, domicílio, e-mail, NIF, dados de registro se houver, preços claros | Nome completo de Duda, NIF, domicílio (pode ser o fiscal), e-mail de contato, preços com IVA indicado. Se autónoma sem registro mercantil, dizer isso. |
| Privacidade | `/privacy` | GDPR Arts. 12-14 | Dois blocos: (A) dados de clientes (controladora); (B) dados de prospects (operadora; quem é o controlador; link para `/aviso-prospect`). Direitos, contato, transferências, retenção. |
| Termos de Serviço | `/terms` | Boa prática + Google exige | Ver 2.2. |
| Cookies | `/cookies` | LSSI Art. 22.2 | Lista do que existe (ver 2.3). |
| DPA | `/dpa` | GDPR Art. 28 | Seção 1.2. |
| Subprocessadores | `/subprocessors` | Parte do DPA | Seção 1.3, com e-mail de aviso de mudança. |
| Aviso ao prospect + opt-out | `/aviso-prospect` | GDPR Art. 14(5)(b) | Fonte, finalidade, como objetar. |

Rodapé de todas as páginas públicas e do app deve linkar as seis. Landing: `src/app/page.tsx`. Idiomas: ao menos EN (clientes europeus) e ES (obrigação local, LSSI não exige língua mas AEPD espera que seja inteligível); PT-BR opcional.

### 2.2 Termos de Serviço: cláusulas obrigatórias

1. Cliente é o único responsável pelo envio: base legal, LIA, respeitar supressão/Lista Robinson/TPS/CTPS e leis locais (PECR, LSSI, UWG, etc.). Duda fornece guardrails, não garantia de conformidade legal.
2. Uso aceitável: proibido spam, e-mail a pessoa física em mercados opt-in, listas compradas, conteúdo ilegal/enganoso, revenda do dado do Google, scraping do app, uso para treinar IA.
3. Aviso exigido pelo Google: o Osprano inclui recursos e conteúdo do Google Maps e o uso está sujeito aos Termos Adicionais do Google Maps para Usuário Final (https://maps.google.com/help/terms_maps/) e à Política de Privacidade do Google (https://policies.google.com/privacy). É exigência do ToS do Google (cláusula 3.2.2/3.2.2 EEA).
4. B2B only: declaração de que contrata para fins profissionais (afasta direitos de consumidor, ver 2.4).
5. Limite de responsabilidade (teto = valor pago nos últimos 12 meses), sem excluir dolo/negligência grave nem o que lei imperativa proíbe. [ADVOGADO].
6. Rescisão e suspensão (inclusive imediata por abuso/reclamação de spam), exportação dos dados por 30 dias, depois exclusão.
7. Planos, cotas, renovação automática, política de reembolso (2.4), mudança de preço com aviso.
8. Lei aplicável e foro (Espanha; para consumidores o foro obrigatório é o deles).
9. Fontes de dados: sem garantia de exatidão/completude; dados do Google podem ficar indisponíveis.

### 2.3 Cookies: o que o app realmente grava (varredura em `src/`)

| Item | Onde | Tipo | Consentimento? |
|---|---|---|---|
| Cookies de sessão/cliente do Clerk | `ClerkProvider` em `src/app/layout.tsx:52` | Estritamente necessário (autenticação pedida pelo usuário) | Não, só informar |
| `localStorage "theme"` | `src/app/layout.tsx:41`, `src/components/theme-toggle.tsx` | Preferência escolhida pelo usuário | Não exigido se a escolha é ação explícita do usuário (AEPD 2023 trata personalização escolhida pelo usuário como exceção); informar na política |
| `localStorage` assinatura de DM | `src/components/crm/dm-composer.tsx` | Dado local a pedido do usuário | Idem |
| Analytics / pixels / Vercel Analytics / PostHog / gtag | nenhum encontrado | n/a | n/a |

**Conclusão:** nenhum banner obrigatório hoje. Regra para o roadmap: qualquer analytics ou pixel adicionado depois exige banner com "Rejeitar" no mesmo nível de "Aceitar" (guia AEPD de cookies atualizada em 11/07/2023, prazo de adequação 11/01/2024: https://www.aepd.es/prensa-y-comunicacion/notas-de-prensa/aepd-actualiza-guia-cookies-para-adaptarla-a-nuevas-directrices-cepd, checado 2026-10-12, MÉDIA). Os cookies de terceiros que Clerk/Vercel colocam devem constar na tabela da política; verificar com DevTools em produção antes de publicar. Páginas públicas `/p/[token]` e `/site/[slug]` (vistas pelo prospect): conferir que não carregam nada além do necessário; o rastreio de abertura é server-side (`recordOpen`), sem cookie, mas precisa estar descrito na política (Art. 13/14, ePrivacy).

### 2.4 Reembolso e desistência: B2B x B2C

- Diretiva 2011/83/UE dá 14 dias de desistência a **consumidores**. Em serviço digital contínuo, o consumidor pode perder o direito se pediu início imediato e reconheceu a perda (Arts. 8(8), 16). Para **empresas/profissionais não há direito legal de desistência**.
- Recomendação: vender como B2B only (campo "uso profissional" no checkout, VAT ID opcional), Termos dizem isso, e oferecer reembolso comercial voluntário (p.ex. 7 dias no primeiro mês) por política de marketing, não por obrigação.
- Risco: freelancer que compra "como pessoa", sem CNPJ/NIF, pode alegar ser consumidor. Mitigação: checkbox de uso profissional + coleta de nome fiscal e NIF/VAT no Stripe (`tax_id_collection`). Se algum cliente-consumidor entrar, aplicar 14 dias com consentimento expresso de início imediato. [ADVOGADO] redigir a cláusula.

---

## 3. Google Maps Platform / Places API

### 3.1 O que está armazenado hoje (leitura de `convex/places.ts` e `convex/schema.ts`)

- Chamada: Text Search (New) com field mask: `id, displayName, formattedAddress, nationalPhoneNumber, websiteUri, rating, userRatingCount, primaryType, businessStatus`.
- Gravado em `leads` por `internal.leads.insertDiscovered`: `placeId`, `name`, `category`, `address`, `city`, `countryCode`, `phone`, `website`, `rating`, `reviewsCount`, `fetchedAt`, mais derivados (score, signals, tier, e-mail encontrado, Instagram/Facebook).
- `fetchedAt` existe no schema; **nenhum cron ou purge** (não há `convex/crons.ts`). O comentário do schema ("só `placeId` é armazenável indefinidamente; campos de contato refrescar em ~30 dias") reflete uma leitura antiga dos termos.
- Não há latitude/longitude gravada (bom). Não há exibição de logo/atribuição "Google Maps" nas telas (a grep encontrou só atribuição ODbL do OSM em `src/components/osm-attribution.tsx`).
- Os previews públicos (`/p/[token]`, `/site/[slug]`) republicam nome/endereço/telefone do negócio, o que pode contar como "reshare/rehost".

### 3.2 O que os termos dizem (leitura direta, Duda tem endereço de cobrança na Espanha, logo valem os **EEA Terms**)

Fonte principal: Google Maps Platform EEA Terms of Service (https://cloud.google.com/terms/maps-platform/eea, última modificação 26/08/2026, texto lido em 2026-10-12) e EEA Service Specific Terms (https://cloud.google.com/terms/maps-platform/eea/maps-service-terms, versão de 10/06/2026). Os termos "não-EEE" são parecidos mas têm cláusulas extras; os EEA se aplicam porque a cobrança é na Espanha. **Conferir no console qual conta/endereço de cobrança a chave usa.**

| Tema | Texto (resumo fiel) | Fonte | Impacto |
|---|---|---|---|
| Scraping | Cliente não pode "pre-fetch, index, store, reshare, or rehost Google Maps Content outside of the Services"; "copy and save business names, addresses, or user reviews" | EEA ToS 3.3.2(a) | Gravar nome/endereço em `leads` é o exemplo literal proibido. |
| Cache | Só o permitido nos Service Specific Terms | 3.3.2(b) | Permitido: `place_id` indefinido (cláusula 3 Geral); lat/lng por até 30 dias consecutivos (cláusula 15.4). Nada mais. |
| Fim do prazo | Após 30 dias, apagar lat/lng | 15.4 | Hoje não gravamos lat/lng: ok. |
| Revenda/sublicença | Não vender, revender, sublicenciar ou distribuir os Serviços | non-EEA 3.2.1(b); equivalente no EEA | Osprano não pode repassar a chave/dados do Google como produto. A chave é da Duda e os dados aparecem dentro de um produto com valor próprio (CRM, score, site). Defensável, mas é o ponto de risco. |
| Criar conteúdo/treinar IA | Proibido usar Google Maps Content para treinar, testar, validar ou ajustar modelos | EEA 3.3.2(c)(v) | Mandar dados do Google para o Claude para **gerar e-mail** é inferência, não treino, mas confirmar com Anthropic que não há treino (API não treina por padrão, fontes secundárias). Nunca guardar dados do Google em dataset para fine-tuning. |
| Uso sem mapa | Fora latitude/longitude/place_id, conteúdo do Places só pode ser usado para os "Permitted Uses" | EEA SST 15.2; lista em https://cloud.google.com/terms/maps-platform/eea-places-api-permitted-uses (modificada 04/06/2025) | Uso (3): "enable Customers to visualize and manage Places content related to a sales team's customers or opportunities". É o argumento para o CRM, mas fala de clientes/oportunidades da equipe de vendas **do próprio cliente do Google (Duda)**, e dados de prospects de terceiros é zona cinzenta. [ADVOGADO + consulta ao suporte do Google Maps Platform, por escrito]. |
| Não mostrar com mapa | Não usar conteúdo do Places "With any Map" (exceto lat/lng/place_id) | EEA SST 15.1; https://developers.google.com/maps/comms/eea/places | Não colocar os leads num mapa (nem OSM, nem Google). |
| Atribuição | Conteúdo do Places fora de mapa Google precisa do logo Google Maps (16-19dp, alt "Google Maps", `translate="no"`), separado visualmente, e atribuição de provedores terceiros quando o Google a devolver | https://developers.google.com/maps/documentation/places/web-service/policies | Hoje inexistente. Para qualquer tela que exiba dado do Google (lista de leads, card, CRM, previews) adicionar o logo ou o texto "Google Maps" quando o espaço for limitado. Reviews exigem avatar/nome do autor; **não exibimos reviews**, só `rating` e contagem. |
| Termos do usuário final | Os Termos do app precisam avisar que há conteúdo do Google Maps e linkar os termos do Google | EEA 3.2.2 | Cláusula obrigatória nos Termos (2.2 item 3). |
| Dados pessoais ao Google | Não enviar PII de usuário final ao Google | EEA 4.2 | A busca envia só categoria+cidade; manter assim. |
| Papéis de dados | Duda e Google aceitam os Controller-Controller Data Protection Terms | EEA 4.5 | Citar na política. |
| place_id | Pode ser guardado; Google recomenda renovar IDs com mais de 12 meses (chamada Place Details só com o campo ID é gratuita) | https://developers.google.com/maps/documentation/places/web-service/place-id | Job de renovação anual (opcional). |

### 3.3 O que o GDPR-01 deve fazer concretamente

Tabela de decisão. Esta é a **decisão de produto de Duda** (trazer opções, não escolhi sozinho):

| Opção | O que faz | Prós | Contras |
|---|---|---|---|
| **A. Conformidade estrita** | Guardar no lead só `placeId` + dados que o **cliente** digitou ou confirmou (contato, notas, estágio, e-mail achado no site do negócio, redes). Nome/endereço/telefone/rating do Google ficam em cache efêmero (sessão da busca) e são rebuscados por Place Details quando o cliente abre o lead (ou apagados em 30 dias e re-hidratados sob demanda). | Mais seguro perante o Google | Custo de API por visualização; dados do Google somem do CRM; previews públicos precisam de dados que o cliente confirmar (o cliente digita o nome/telefone, vira dado dele). |
| **B. Mitigação (o que o plano atual prevê)** | Cron diário que apaga/anonimiza campos do Google com `fetchedAt` > 30 dias, exceto os que o cliente editou ou confirmou; campos editados ganham flag `confirmedByUser` (provedor = cliente). | Pequena mudança de código | **Não torna conforme** pelo texto (não existe janela de 30 dias para nome/endereço/telefone). Reduz exposição, não elimina. |
| **C. OSM como base e Google como descoberta** | OSM (ODbL) permite armazenar com atribuição; usar Google só para achar `place_id`, e rebuscar detalhes sob demanda. | Dados persistentes legais | Cobertura OSM de pequenos negócios é pior em alguns países. |
| **D. Pedir autorização por escrito ao Google** | Descrever o caso (CRM de prospecção multi-tenant) ao suporte/Sales | Resolve de vez, se aprovarem | Pode demorar ou negar; resposta pode ser proibir o produto. |

**Recomendação:** B imediatamente (barato, reduz risco, mostra boa fé) + C como direção de produto (OSM já existe em `convex/osm.ts`) + D em paralelo, e tratar A como fallback se o Google responder que não. Aceitar conscientemente que lançar com B é risco residual de suspensão da chave. [ADVOGADO] opinar sobre exposição contratual.

Detalhe técnico do B (arquivos): `convex/crons.ts` (novo) chamando `internal.leads.purgeGoogleFields`; `convex/leads.ts` (nova mutation interna); `convex/schema.ts` (`googleFieldsConfirmed` ou `fieldsConfirmedAt`); `insertDiscovered` (marcar campos de origem Google); UI: edição de nome/telefone no lead marca como confirmado. Teste: purge não toca lead com campo confirmado nem `placeId`; idempotente.

Também relevante: **plano e cota** (30 buscas/dia compartilhadas) precisam de tetos por cliente (já previsto em v1.3) porque suspensão da chave derruba todos os clientes.

---

## 4. Envio de e-mail no lançamento

### 4.1 Fatos

- Resend: AUP proíbe cold outreach e contatos raspados (achado anterior, não repetido). Não usar para o e-mail de prospecção do cliente. Pode continuar para e-mails transacionais do próprio Osprano (boas-vindas, cobrança, página de descadastro).
- Gmail API: `gmail.send` é escopo sensível; `gmail.compose` e `gmail.modify` são **restritos**, e restrito + armazenar dados em servidor exige avaliação de segurança (https://developers.google.com/workspace/gmail/api/auth/scopes, checado 2026-10-12, ALTA). Ou seja, "conectar Gmail" pelo OAuth tem custo recorrente de verificação (CASA) e prazo; adiar.
- SMTP próprio do cliente: Duda passa a guardar credenciais de e-mail de terceiros (risco de segurança alto, e ainda envia em nome deles).

### 4.2 Opção recomendada (menor risco jurídico e operacional)

**"Abrir no meu e-mail" + copiar**, com estas partes:
1. Botão abre `mailto:` com assunto e corpo prontos, e botões para deep links de composição do Gmail e Outlook Web.
2. Botão "Copiar" para quem usa outro cliente.
3. Antes de abrir: checar supressão (global e do workspace) e `isEmailable`; bloquear se suprimido.
4. O corpo já inclui o rodapé de opt-out por código, com **link para o endpoint de unsubscribe da Duda** (`/unsubscribe?token=...`) e a linha de fonte (Art. 14). Observação honesta: não dá para injetar o cabeçalho `List-Unsubscribe`, então o descadastro depende do link no corpo; para opt-out de GB/NL/IE/SE isso satisfaz o requisito de opção simples, mas Gmail/Yahoo exigem o cabeçalho para remetentes em massa (>5.000/dia), o que não é o caso de um freelancer que envia dezenas por dia.
5. Cliente clica em "Marcei como enviado" (a outbox registra manualmente, já existe fluxo manual de "respondeu").
6. Limite do `mailto`: URLs longas quebram em alguns clientes (cerca de 2.000 caracteres); manter o e-mail curto ou degradar para "Copiar".

Por que é o mais seguro: Duda não transmite a mensagem, não é remetente nem fornecedor de infraestrutura de envio, a reputação do domínio é do cliente e o cliente envia pelo domínio dele (SPF/DKIM dele). Ainda assim, a ferramenta redige e personaliza, então os guardrails e os Termos continuam necessários. [ADVOGADO] confirmar que "ferramenta de redação sem transmissão" não cria responsabilidade de remetente na UE/UK.

### 4.3 Pós-lançamento (backlog, não bloqueia)
- Gmail/Outlook via OAuth criando **rascunho** (não envio) com a menor autorização possível, após orçamento da avaliação de segurança.
- Provedor que permita cold B2B com consentimento da AUP deles (p.ex. serviço de cold e-mail dedicado) ou domínio white-label por cliente; exige warm-up, SPF/DKIM/DMARC por cliente, limites diários e monitoramento de reclamações. Só entra junto com envio automático (AUTO-01..05).

---

## 5. Impostos e cobrança (Espanha → UE)

### 5.1 Duda precisa ser autónoma antes de cobrar?

**Sim**, ou ter uma sociedade. Cobrar assinatura de forma habitual é atividade económica que exige alta censal na AEAT (modelo 036/037) e alta no RETA (Seguridad Social), e o IVA se aplica desde o primeiro euro (sem franquia na Espanha para este caso). Fontes consultadas são blogs de gestorias que concordam entre si (MÉDIA/BAIXA): alta por "habitualidade" e epígrafe censal de programação; valores de tarifa plana variam entre fontes e mudam por ano. **Confirmar com um gestor** (custo típico baixo) e nos sites oficiais https://sede.agenciatributaria.gob.es e https://www.seg-social.es. [ADVOGADO/GESTOR].

### 5.2 IVA

| Cliente | Tratamento | Requer |
|---|---|---|
| Empresa na Espanha | IVA espanhol 21% | Fatura com NIF |
| Empresa em outro país da UE, com VAT ID válido | Serviço tributado no país do cliente; **inversão do sujeito passivo** (sem IVA na fatura, com a menção "inversión del sujeto pasivo") | **Alta no ROI** (modelo 036, casas 582/584, a AEAT tem até 3 meses; sem alta não se pode emitir sem IVA); declaração modelo 349 |
| Pessoa física/consumidor na UE | IVA do país do cliente; OSS (modelo 369) quando passar de 10.000 EUR/ano de vendas transfronteiriças B2C na UE; abaixo disso, IVA espanhol (regra de "pequeno vendedor") | Registro OSS na Espanha quando passar do limite |
| Cliente fora da UE (p.ex. UK) | Fora do âmbito do IVA espanhol (não sujeito), com prova do local do cliente | Guardar evidência de localização |

Fontes: Stripe Tax UE (https://docs.stripe.com/tax/supported-countries/european-union, checado 2026-10-12, ALTA): reverse charge só se o cliente informar VAT ID da UE válido; limite 10.000 EUR para pequeno vendedor aplica-se a vendas a indivíduos; serviços prestados a empresas são tributados no país do cliente. ROI/349: resumos de gestorias (https://getquipu.com/blog/que-es-el-registro-de-operadores-intracomunitarios-y-alta-en-roi/, MÉDIA).

### 5.3 Stripe no código (`convex/billing.ts`, checkout hoje sem imposto)

O checkout atual (`checkout/sessions`, `mode: subscription`) **não** envia `automatic_tax`, `tax_id_collection` nem `billing_address_collection`. Para lançar:
- Ativar Stripe Tax; cadastrar registro de domicílio Espanha (e OSS quando aplicável); definir tax code de SaaS e o preço com `tax_behavior`.
- Parâmetros do Checkout: `automatic_tax[enabled]=true`, `tax_id_collection[enabled]=true`, `billing_address_collection=required`, `customer_update[name]=auto`, `customer_update[address]=auto`, e `invoice_creation`/faturas com NIF da Duda nos dados da empresa no Stripe.
- Faturas: o dashboard do Stripe precisa ter nome, NIF e endereço de Duda (obrigatório em fatura espanhola). Numeração sequencial é feita pela Stripe.
- **Verifactu / faturação eletrónica:** o RDL 15/2025 adiou para 1/jan/2027 (sociedades) e 1/jul/2027 (autónomos e demais); os fabricantes de software já estavam obrigados desde 29/jul/2025 (fonte: LegalToday e outros, MÉDIA; confirmar no BOE-A-2025-24446). Uma fatura emitida pela Stripe não é, por si só, um software Verifactu da Duda. Para 2027 será preciso emitir pelo programa de faturação do gestor ou aderir a uma solução homologada. Não bloqueia o lançamento em 2026. [GESTOR].
- Webhook endurecido (já na v1.3): tratar `invoice.paid`, `customer.subscription.updated/deleted`, e a falha de pagamento para travar o plano.

---

## 6. O que bloqueia o primeiro cliente pagante vs o que pode esperar

### 6.1 BLOQUEIA o lançamento

| # | Item | Arquivos / ação | Advogado? |
|---|---|---|---|
| 1 | Alta de autónoma (+ ROI se for vender a empresas da UE) | Fora do código, gestor | Gestor |
| 2 | Stripe com Tax, tax ID, endereço, dados fiscais da Duda | `convex/billing.ts`, dashboard Stripe | Gestor |
| 3 | Aviso Legal, Privacidade, Termos, Cookies, DPA, Subprocessadores, Aviso ao prospect | `src/app/legal`, `privacy`, `terms`, `cookies`, `dpa`, `subprocessors`, `aviso-prospect`; links no rodapé | **Sim** (Termos, DPA, Privacidade) |
| 4 | Aceite de Termos+DPA com versão e data, bloqueando o uso | `convex/schema.ts`, `convex/workspaces.ts`, onboarding | Não |
| 5 | Decisão sobre dados do Google (3.3) + purge (opção B no mínimo) + atribuição Google Maps nas telas + aviso nos Termos | `convex/crons.ts`, `convex/leads.ts`, `convex/schema.ts`, componentes de lead | **Sim** e consulta ao Google |
| 6 | Envio via "abrir no e-mail" + copiar, com checagem de supressão e rodapé com fonte | `src/components/outreach-composer.tsx`, `convex/lib/compliance.ts` | Confirmar |
| 7 | Exclusão de conta/workspace (Art. 17, fim de contrato) | nova mutation + botão em `src/app/(app)/settings` | Não |
| 8 | DPAs/SCCs com subprocessadores confirmados e região do Convex/Clerk/Vercel registrados | fora do código | Revisão |
| 9 | Checkbox "uso profissional" no checkout / cadastro | Stripe + Termos | Sim (redação) |
| 10 | Contato `privacidade@` funcional para pedidos de titulares e prospects | e-mail/domínio | Não |

### 6.2 Pode esperar (primeiros 90 dias)

- Export de dados do workspace (se o DPA prometer "devolver", fazer logo; senão manual por pedido).
- Registro de tratamento (Art. 30) em documento (rápido, mas não precisa estar pronto no dia 1; ter em até 30 dias).
- LIA modelo para clientes (entregar com o primeiro onboarding).
- Renovação anual de `place_id`.
- Gmail/Outlook por OAuth (rascunho), cold-email provider, white-label.
- Verifactu (julho de 2027 para autónomos).
- DPO: não obrigatório para este porte (Art. 37), mas rever se o volume de dados em larga escala crescer.
- Representante no Reino Unido (só se Duda for controladora de dados de lá).

---

## 7. Itens que exigem advogado

1. Qualificação controladora/operadora e redação do DPA e dos Termos (limite de responsabilidade, B2B only, foro).
2. Exposição contratual com o Google: se o modelo de CRM multi-tenant com Places é permitido (cláusula de uso "sales team's customers or opportunities") e a consequência de guardar nome/endereço. Pedir confirmação por escrito ao Google.
3. UK GDPR/PECR: representante, taxa ICO, e tratamento de sole traders.
4. Se "ferramenta de redação sem envio" evita ser remetente.
5. Norway: já em revisão pendente (fora desta pesquisa).
6. Fornecedores sem DPA claro (Serper).
7. Cláusula de consumidores caso algum cliente não seja profissional.

## 8. Fontes (checadas em 2026-10-12)

- Google Maps Platform EEA Terms of Service: https://cloud.google.com/terms/maps-platform/eea (ALTA)
- Google Maps Platform EEA Service Specific Terms: https://cloud.google.com/terms/maps-platform/eea/maps-service-terms (ALTA)
- Places API EEA Permitted Uses: https://cloud.google.com/terms/maps-platform/eea-places-api-permitted-uses (ALTA)
- Places API EEA adjustments: https://developers.google.com/maps/comms/eea/places (ALTA)
- Google Maps Platform Terms (não-EEA, para comparação): https://cloud.google.com/maps-platform/terms e https://cloud.google.com/maps-platform/terms/maps-service-terms (ALTA)
- Places policies/atribuição: https://developers.google.com/maps/documentation/places/web-service/policies (ALTA)
- Place IDs: https://developers.google.com/maps/documentation/places/web-service/place-id (ALTA)
- GDPR texto: https://eur-lex.europa.eu/eli/reg/2016/679/oj e https://gdpr-info.eu/art-14-gdpr/ (ALTA)
- LSSI-CE (BOE-A-2002-13758): https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758 (ALTA, lido só até a metade do texto; Arts. 10, 21, 22 confirmados)
- AEPD guia de cookies (nota de imprensa): https://www.aepd.es/prensa-y-comunicacion/notas-de-prensa/aepd-actualiza-guia-cookies-para-adaptarla-a-nuevas-directrices-cepd (MÉDIA)
- ICO, e-mail marketing: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/key-concepts-for-direct-marketing-using-electronic-mail/ (MÉDIA)
- Gmail API scopes: https://developers.google.com/workspace/gmail/api/auth/scopes (ALTA)
- Stripe Tax UE: https://docs.stripe.com/tax/supported-countries/european-union (ALTA)
- Verifactu adiamento (RDL 15/2025): https://www.legaltoday.com/actualidad-juridica/noticias-de-derecho/nueva-prorroga-verifactu-no-sera-obligatorio-hasta-2027-para-sociedades-y-otros-contribuyentes-2025-12-04/ (MÉDIA; confirmar no BOE)
- ROI/autónomo: https://getquipu.com/blog/que-es-el-registro-de-operadores-intracomunitarios-y-alta-en-roi/ (MÉDIA, blog)
- Anthropic DPA (secundária): https://sonomos.ai/blog/claude-dpa-explained-2026/ (BAIXA)

## 9. Lacunas

- DPA, região e sub-subprocessadores de Convex, Clerk, Vercel, Resend, Serper: não verificados em fonte oficial.
- Termos do Google citados são das versões lidas hoje; o Google pode mudar. Reler antes do lançamento.
- Não li a metade final do texto da LSSI (Arts. 22 a fim) nem a Ley 11/2022 General de Telecomunicaciones (chamadas/Lista Robinson para a fila "Ligar").
- Cookies reais em produção (Clerk/Vercel) não foram medidos; só a leitura de código.
- Valor atual de cota de autónomos e epígrafe exatos: confirmar com gestor.

---

## Correção de premissa (2026-10-12)

A Duda informou: "não tenho empresa na Espanha, tudo é do Brasil". Esta pesquisa assumiu uma operadora estabelecida na Espanha. Não se aplicam como escritos: LSSI art. 10 (Aviso Legal com NIF), alta de autónoma, ROI/modelo 349, OSS espanhol, Verifactu. Continuam valendo: termos EEA do Google (a cobrança da conta Google é que define; conferir o endereço de faturamento da conta GCP), GDPR por art. 3(2) para clientes e prospects na UE (com novo ponto: representante na UE, art. 27, e transferência internacional), cláusulas dos Termos, subprocessadores, cookies, envio por "abrir no meu e-mail". Novos pontos para advogado/contador: LGPD, exportação de serviço pela empresa brasileira, IVA do cliente UE (reverse charge em B2B), e o risco de residência fiscal/estabelecimento permanente se a Duda mora na Espanha e opera pela empresa brasileira.
