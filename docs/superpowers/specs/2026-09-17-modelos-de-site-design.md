# Modelos de site: preview e site publicado a partir de 4 modelos por segmento

**Data:** 2026-09-17 · **Status:** aprovado em conversa, revisado, aguardando plano

## Problema

Hoje o preview é um template único, gerado só com o que o Google/OSM entrega
(nome, categoria, cidade, telefone, nota). Serve de isca, mas não vira o site
vendido: ao fechar, a Duda teria de construir tudo do zero. Ela quer escolher um
modelo pronto por tipo de negócio, ajustar nome, paleta, fotos e textos, mandar
isso como preview rastreado e, ao fechar, publicar o mesmo modelo como site.

Uso: **uma pessoa** (a Duda) edita; o prospect só vê.

## Decisões

- **Os modelos viram o preview** (opção A da conversa). Um sistema só: o link
  rastreado `/p/<token>` e o site publicado `/site/<slug>` renderizam o mesmo
  modelo com o mesmo conteúdo salvo.
- **Divisão por segmento**, 4 modelos com 3 paletas cada. Estilo único por
  modelo; "por estilo" e "segmento × estilo" descartados.
- **Um conteúdo só por lead.** O `content` do preview é a única fonte de
  verdade. Consequências, todas assumidas:
  - o lead só alimenta o conteúdo **na criação** (`defaultContentForLead`);
    editar o lead depois (contato, telefone) **não** propaga para o site;
  - **salvar depois de publicar altera o site no ar na hora**, sem republicar
    (o `publish` já é idempotente); o editor avisa isso no rodapé quando o site
    está publicado;
  - o telefone vindo do Places não se renova na prévia (regra dos 30 dias do
    `schema.ts` vale para o lead, não para o conteúdo salvo). Aceito.
- **Fotos padrão embutidas** por modelo, licença livre; upload das fotos reais
  depois de fechar. Nada de fotos do Google (licença proíbe guardar).
- **Textos padrão** por modelo nos 10 idiomas que a prévia já suporta. Texto
  por IA fica pra v2.
- **Salvar explícito**, não automático.
- **WhatsApp vazio por padrão.** Hoje a prévia deriva um botão de WhatsApp do
  telefone; isso afirma que o negócio atende no WhatsApp (fato não verificado)
  e quebra com número sem DDI. O CTA de WhatsApp só existe quando ela preenche
  o campo; sem ele, o CTA primário cai para telefone, depois e-mail, depois
  nenhum (`primaryCta`, seção 1.6).
- **Honestidade sobre o negócio alheio**, regra já vigente no repo (ver
  `src/lib/preview-i18n.ts` e `docs/LESSONS.md`): o preview vai para um negócio
  que não pediu nada, com o nome real dele. **Nenhum texto padrão pode afirmar
  fato específico** (horário, preço, "desde 1998", "melhor da cidade", "atendemos
  a região"). Seções de dados (itens com preço, horário, galeria) **só aparecem
  quando ela preencheu**. Foto padrão é imagem genérica do segmento com
  `alt=""`, nunca legendada como sendo do negócio; só a foto enviada por ela
  leva `alt={name}`.
- **Miniaturas ao vivo, sem PNG**: um componente `TemplateThumb` renderiza o
  hero do modelo escalado, com a paleta e o nome; usado nos cartões de modelo
  do editor e na página Sites. Não há Playwright no repo para gerar imagens.
- **Container queries nos modelos**: a prévia ao vivo e as miniaturas mostram o
  modelo num `div` menor que a janela, então `sm:`/`md:` (media queries de
  viewport) dariam o layout errado. Os 4 modelos usam `@container` no raiz e
  variantes `@sm:`/`@md:`/`@lg:` do Tailwind v4, e **não** usam unidades de
  viewport (`dvh`, `vw`, `vh`) nem `sticky` dependente de viewport. É convenção
  nova no repo; vale só para `src/components/site-templates/`.
- **Domínio próprio, SEO avançado, edição pelo cliente final, mais de 4
  modelos, texto por IA**: fora desta rodada.

## Fora do escopo

Domínio próprio, texto por IA, edição pelo cliente, mais modelos, exportar HTML,
botão "repor dados do lead" (decisão futura dela), coleta de lixo de uploads
órfãos (seção 2.4), e a abordagem por e-mail (continua citando o link do
preview, nada muda ali).

## Divisão em três planos, sequenciais e cada um entregável

- **A. Dados + modelos + render público + retrocompatibilidade** (seções 1, 2.1
  a 2.3, 3.5, testes de 5). Entrega: todo preview/site existente e novo renderiza
  no modelo sugerido com paleta padrão; fluxo de outreach intacto; nenhuma UI de
  edição ainda. Como `generate` deixa de regravar o conteúdo, a linha "Regenerar
  o conteúdo do site" do `SiteTab` (`lead-detail.tsx`) **sai já no plano A** e o
  botão vira "Preparar preview"/"Abrir preview" (só rótulo), para A não entregar
  um botão que não faz nada.
- **B. Editor + uploads** (2.4, 3.1, e um link provisório "Editar site" no
  `SiteTab`). Entrega: ela edita, salva, preview e site refletem.
- **C. Superfície + verificação** (3.2, 3.3, 3.4, screenshots, UAT em navegador
  real, roteiro manual).

---

## 1. Catálogo de modelos (`src/components/site-templates/`)

### 1.1 Os 4 modelos

| id | Nome | Segmentos (valores de `CATEGORY_OPTIONS`) | Seções, nesta ordem |
|---|---|---|---|
| `mesa` | Mesa | restaurant, cafe, bar, pub, "pizza restaurant", bakery, "pastry shop", "ice cream shop" | hero (foto + nome + slogan + CTA primário) · destaques do cardápio (itens, só se houver) · horário (só se houver) · onde estamos (só com endereço ou cidade) · contato |
| `estudio` | Estúdio | "barber shop", "hair salon", "beauty salon", "nail salon", spa, "tattoo studio", gym, "personal trainer", "yoga studio" | hero · serviços (itens, só se houver) · galeria (só se houver) · agendar (CTA primário) · horário (só se houver) · contato |
| `oficio` | Ofício | plumber, electrician, locksmith, "car repair", "car wash", "driving school", photographer | hero direto (CTA primário em destaque) · serviços (itens, só se houver) · área atendida ("Em {city}", só com cidade; nunca "atendemos a região") · pedir orçamento (CTA) · contato |
| `vitrine` | Vitrine | tudo o mais e qualquer categoria desconhecida | hero · destaques (itens, só se houver) · sobre · localização e horário (só com dado) · contato |

`suggestTemplate(category)` em `convex/lib/site.ts` devolve o id pela tabela;
desconhecido ou nulo → `vitrine`.

### 1.2 Paletas

Cada modelo tem 3 paletas nomeadas, cada uma com `bg`, `surface`, `text`,
`muted`, `accent`, `accentFg`. Contraste mínimo 4,5:1 entre `text` e `bg`,
`text` e `surface`, `muted` e `bg`, e `accentFg` e `accent`; garantido por
teste unitário com o helper novo `contrastRatio(a, b)` em
`convex/lib/contrast.ts` (luminância relativa WCAG 2.x, com teste próprio; não
existe helper de contraste no repo hoje).

| Modelo | Paletas |
|---|---|
| mesa | `terracota` (creme + terracota), `oliva` (off-white + verde-oliva), `noite` (grafite + âmbar) |
| estudio | `carvao` (preto + dourado), `rosa` (off-white + rosa-queimado), `marinho` (azul-marinho + areia) |
| oficio | `laranja` (branco + laranja), `azul` (branco + azul-forte), `verde` (branco + verde-escuro) |
| vitrine | `areia` (areia + preto), `nevoa` (cinza-azulado + azul), `vinho` (creme + vinho) |

Padrão: a primeira de cada modelo. Os **ids** das paletas por modelo ficam em
`convex/lib/site.ts` (`PALETTE_IDS: Record<TemplateId, readonly string[]>`, que o
`validateSiteContent` usa); os valores hex ficam em
`src/components/site-templates/palettes.ts`, tipados por esses ids, e o teste de
contraste importa os dois. Convex nunca importa de `src/`.

### 1.3 Fotos padrão

`public/templates/<modelo>/{hero,g1,g2}.jpg`, 12 arquivos, JPEG otimizado,
1600 px no lado maior, ≤ 250 KB cada. Origem: Unsplash ou Pexels (licença
livre para uso comercial sem atribuição); `public/templates/LICENSES.md` lista
arquivo → fonte → autor → licença. **Não usar foto que mostre marca, nome de
loja ou pessoa reconhecível**: a foto ilustra o negócio de terceiro.

### 1.4 Componentes

- `src/components/site-templates/index.ts`: `TEMPLATES` (catálogo: id, nome,
  descrição curta, paletas, caminhos das fotos padrão, rótulo da lista de itens
  por modelo) e `renderTemplate(view: SiteView, locale: Locale)`.
- `SiteView = SiteContent & { heroUrl: string; galleryUrls: string[] }`:
  `heroUrl` é o upload ou, sem upload, a foto padrão `hero.jpg` do modelo;
  `galleryUrls` são **só uploads** (vazio → a seção de galeria não renderiza,
  regra "só se houver"). As fotos `g1`/`g2` do modelo são **decoração fixa** da
  seção "sobre"/"destaques" (sempre `alt=""`), nunca entram na galeria. Quem
  monta o `SiteView` é a página (pública ou editor), nunca o template.
- `src/components/site-templates/{mesa,estudio,oficio,vitrine}.tsx`: um
  componente cada, props `{ view: SiteView; palette: Palette; tr: TemplateDict; locale: Locale }`.
  Sem dependência do tema/chrome da app: paleta via CSS custom properties no
  elemento raiz (`--site-bg`, `--site-text`, …), fontes do `next/font` já
  carregado, raiz com `@container` e classes `@sm:`/`@md:`/`@lg:`.
- `src/components/site-templates/shared.tsx`: blocos comuns (contato, horário,
  lista de itens, galeria, CTA) para os quatro não repetirem.
- `src/components/site-templates/template-thumb.tsx`: `TemplateThumb({ template,
  palette, name })` preenche a largura do contêiner pai (mede com
  `ResizeObserver`) mantendo proporção 16:10, renderiza **só o hero** (cada
  modelo exporta `Hero` além do componente completo) numa largura virtual de
  1280 px reduzido com CSS `zoom` (não `transform`, que deixa a caixa de layout
  no tamanho original), `pointer-events: none`, `aria-hidden`.
- `src/components/preview-site.tsx` **deixa de renderizar** e passa a ser só o
  ponto de entrada `PreviewSite({ view, locale })` → `renderTemplate`. O tipo
  `PreviewContent` some; quem importava passa a importar `SiteContent`/`SiteView`
  de `convex/lib/site.ts` e `src/components/site-templates`.
- Imagens do storage com `<img>` (não `next/image`: exigiria `remotePatterns`
  para `*.convex.cloud` e não há ganho aqui), com o comentário
  `eslint-disable-next-line @next/next/no-img-element` e o porquê.

### 1.5 Textos padrão (`src/lib/preview-i18n.ts`)

`PreviewDict` ganha `templates: Record<TemplateId, TemplateDict>` com: `tagline`
(slogan genérico, ex. "Sabores que valem a visita" para mesa), `about`
(parágrafo genérico sobre atendimento e cuidado, sem fato), rótulos de seção
(`itemsHeading` com o nome certo por modelo: cardápio / serviços / serviços /
destaques, `galleryHeading`, `hoursHeading`, `areaHeading`, `quoteHeading`,
`aboutHeading`, `visitHeading`, `contactHeading`), CTAs (`reserve`, `book`,
`quote`, `email`) e `closed` (para o horário). `callNow` e `whatsapp` continuam
**só no topo** do `PreviewDict` (já existem) e os modelos os leem de lá. Nomes dos
dias vêm de `Intl.DateTimeFormat(locale, { weekday: "short" })`, sem string
nova. Nos 10 idiomas.

As chaves antigas que só o template único usava (`heroSubtitle`, `feature*`,
`visitHeading`, `visitBody`) **são removidas** junto com ele; `call`, `callNow`,
`whatsapp`, `reviews`, `phoneLabel`, `whereLabel`, `metaTitle`,
`metaDescription` continuam.

Regra de honestidade: teste unitário garante que nenhum texto padrão de
`templates.*` contém dígito (sem horário, preço ou ano inventado) em nenhum
idioma, e que a paridade de chaves entre os 10 idiomas cobre o objeto aninhado
`templates.<id>.*` (o teste atual só compara chaves de topo).

### 1.6 CTA primário

`primaryCta(content)` em `convex/lib/site.ts` devolve, nesta ordem, o primeiro
que existir: `{ kind: "whatsapp", href: "https://wa.me/<digits>" }`,
`{ kind: "phone", href: "tel:<phone>" }`, `{ kind: "email", href: "mailto:<email>" }`,
ou `null`. O rótulo vem do catálogo: `TEMPLATES[id].ctaKey` = `reserve` (mesa),
`book` (estudio), `quote` (oficio), `callNow` (vitrine), usado quando o kind é
`phone`/`whatsapp`; `email` quando é e-mail. Sem CTA, o hero não mostra botão.
Nunca um botão que não leva a nada.

### 1.7 Guardas migradas dos testes existentes

`tests/preview-i18n.test.ts` hoje lê a fonte de `preview-site.tsx` e proíbe
horário fixo e `<dd>` com texto do dicionário, além de testar `allCopy`, as
funções interpoladas, dois casos de francês e "nenhuma string PT hardcoded"
usando `featureLocationBodyWithCity`/`visitBody`. Tudo isso é **reescrito no
plano A** para o dicionário novo: as guardas passam a ler
`src/components/site-templates/*.tsx` e `shared.tsx` com a regra **horário,
preço e itens só saem de `view.*`, nunca de `tr.*`** (texto de `tr.*` só em
rótulos, CTAs, slogan e "sobre" padrão); `allCopy` e a checagem de PT passam a
percorrer `templates.<id>.*`; os casos de francês usam `templates.*.tagline`.

---

## 2. Dados

### 2.1 `SiteContent` (`convex/lib/site.ts`, puro, imports relativos `.ts`, com validador Convex e teste)

```ts
type TemplateId = "mesa" | "estudio" | "oficio" | "vitrine";
interface SiteItem { name: string; price?: string; note?: string }        // preço como texto ("12,50", "a partir de 30")
interface SiteHours { day: 0|1|2|3|4|5|6; open: string; close: string }   // "09:00"; dia sem linha = fechado/não informado
interface SiteContent {
  version: 2;
  template: TemplateId;
  palette: string;                 // id da paleta do modelo
  name: string;
  tagline?: string;                // vazio → padrão do modelo no idioma
  about?: string;                  // vazio → padrão do modelo
  items?: SiteItem[];              // máx. 12
  hours?: SiteHours[];
  address?: string;
  city: string | null;
  countryCode: string;
  phone?: string;
  whatsapp?: string;               // só dígitos com DDI, ex. "447700900123"; vazio por padrão
  instagram?: string;              // handle sem @
  email?: string;
  heroImage?: Id<"_storage">;      // ausente → foto padrão (Id via `import type`, como em convex/model/tenant.ts: os testes rodam com --experimental-strip-types)
  gallery?: Id<"_storage">[];      // máx. 6
  category: string | null;         // dados do lead que a prévia atual já mostra
  rating: number | null;
  reviewsCount: number | null;
}
```

- `siteContentValidator` (Convex `v.object`, com `v.id("_storage")` nas imagens)
  e `parseSiteContent(raw: unknown): SiteContent`: aceita **o formato antigo**
  (`PreviewContent` sem `version`) e converte (`template =
  suggestTemplate(category)`, `palette` = primeira, `whatsapp` ausente, campos
  novos ausentes); com `raw` nulo ou corrompido devolve um `SiteContent` mínimo
  (`vitrine`, nome vazio, substituído pelo nome do lead quando o chamador o tem) em
  vez de lançar: uma query lançando derruba o drawer inteiro.
- `defaultContentForLead(lead)`: monta o `SiteContent` inicial a partir do lead
  (nome, categoria, cidade, país, telefone, endereço, nota, avaliações, modelo
  sugerido, paleta padrão). `whatsapp`, `instagram`, `email` (o e-mail do lead
  é canal de outreach, não necessariamente público) ficam vazios.
- Limites validados no servidor (`validateSiteContent`, lança `userError` com a
  mensagem do campo): `name` 1 a 80, `tagline` ≤ 120, `about` ≤ 1200, `items`
  ≤ 12 (nome ≤ 60, preço ≤ 20, nota ≤ 80), `hours` no máximo uma linha por dia
  com `HH:MM`, `gallery` ≤ 6, `instagram` sem `@`, espaço ou `/`, `whatsapp` só
  dígitos 8 a 15, `email` com `@`, `palette` existente no modelo.

### 2.2 Schema (`convex/schema.ts`)

`previews.content` continua `v.optional(v.any())` (conteúdo antigo coexiste); a
validação é feita nas mutations que escrevem. **Sem coluna nova** em `previews`
(o Convex não projeta colunas e `listSites` já lê o documento inteiro; o modelo
sai de `parseSiteContent(content).template`).

Tabela nova `uploads: { orgId, leadId, storageId: v.id("_storage"), at }` com
índices `by_storage: ["storageId"]` e `by_lead: ["leadId"]`.

### 2.3 Mutations e queries (`convex/previews.ts`, helper em `convex/model/previews.ts`)

`ensurePreview(ctx, lead)` (helper de model): devolve a linha de preview do
lead, criando-a com `token` novo e `content = defaultContentForLead(lead)`
quando não existe. **Nunca sobrescreve** `content` existente. `generate`,
`ensureForLead`, `saveContent` e `publish` passam por ele.

| Função | Comportamento |
|---|---|
| `generate` (mutation) | `ensurePreview` e devolve o token. Já existindo, não toca no conteúdo (hoje regrava; muda). |
| `ensureForLead` (internal, fluxo de outreach) | idem. |
| `saveContent` (mutation, nova) | `{ leadId, content: siteContentValidator }` → ownership, `validateSiteContent`, cada `heroImage`/`gallery` precisa existir em `uploads` do mesmo org (`"Imagem inválida"`), `ensurePreview`, `patch({ content })` e, **depois** de gravar, apaga do storage e de `uploads` os storageIds que estavam no `content` antigo e não estão no novo (seção 2.4). |
| `getForLead` (query) | devolve `content` parseado, `token`, `openCount`, `published`, `slug`, e `images: { heroUrl?: string; galleryUrls: string[] }` com as URLs do storage resolvidas (`ctx.storage.getUrl`) para as imagens enviadas; a página monta o `SiteView` (foto padrão onde não há upload). Deixa de devolver `lastOpenedAt` (sem uso em `src/`): intencional. |
| `getByToken`, `getBySlug` (queries públicas) | devolvem `content` parseado e as mesmas `images` resolvidas. |
| `publish` (mutation) | `ensurePreview`, publica o `content` salvo (parseado), gera o slug como hoje, cobra 1 site como hoje. Já publicado: idempotente, como hoje. |
| `listSites` (query) | devolve por site `template` e `palette` lidos de `parseSiteContent(content)`; **não** resolve URLs de storage (a miniatura usa só os defaults). |

### 2.4 Upload de imagens

- `previews.generateUploadUrl` (mutation): `requireOrgId`, devolve
  `ctx.storage.generateUploadUrl()`. Primeiro uso de file storage no repo.
- `previews.registerUpload` (mutation): `{ leadId, storageId }` → `requireOrgId`,
  ownership do lead, grava em `uploads`. `saveContent` recusa storageId que não
  esteja em `uploads` do mesmo org.
- `previews.removeUpload` (mutation): `{ storageId }` → ownership pela tabela;
  **recusa** (`"Imagem em uso"`) se o id estiver no `content` salvo; senão
  `ctx.storage.delete` e apaga a linha.
- Cliente (`src/lib/image-resize.ts`): recusa arquivo > 10 MB ou tipo fora de
  `image/jpeg|png|webp` antes de tudo; `createImageBitmap(file, {
  imageOrientation: "from-image" })` (respeita EXIF), redimensiona para ≤ 1600 px
  no lado maior, exporta JPEG qualidade 0,82; `fetch(uploadUrl, { method: "POST",
  headers: { "Content-Type": "image/jpeg" }, body })` → `{ storageId }` →
  `registerUpload`. A parte pura (`targetSize(w, h, max)`) tem teste.
- **Nada é apagado antes do Salvar** (senão trocar uma foto alteraria o site
  publicado e destruiria a foto anterior antes de ela confirmar). Trocar ou
  remover um slot só muda o estado local; ao `saveContent` bem-sucedido, o
  **servidor** compara os storageIds do `content` antigo com os do novo e apaga
  do storage e de `uploads` os que saíram. `removeUpload` existe só para o
  editor descartar um upload **ainda não salvo** (trocou de ideia antes de
  salvar). Upload feito e página fechada sem salvar fica no storage: aceito,
  sem coleta de lixo nesta rodada.
- Foto enviada e ainda não salva aparece na prévia ao vivo via
  `URL.createObjectURL(file)` (revogado ao trocar/desmontar).

---

## 3. Telas

### 3.1 Editor do site (`/crm/[leadId]/site`, página nova; plano B)

O drawer é estreito demais para editor + prévia lado a lado. O editor abre em
**página inteira** dentro da área logada (mesmo rail; o item CRM já fica ativo
porque o rail usa `pathname.startsWith("/crm/")`).

- `src/app/(app)/crm/[leadId]/site/page.tsx`: server component; **`params` e
  `searchParams` são Promises no Next 16**: `const { leadId } = await params;
  const { from } = await searchParams;` e renderiza `<SiteEditor leadId={leadId}
  from={from === "sites" ? "sites" : "crm"} />` (client). O `SiteEditor` consulta
  `leads.get` com o id como **string** e trata `null` (inexistente ou outra org)
  e id malformado (a query `leads.get` existente em `convex/leads.ts` passa a
  aceitar `id: v.string()` e usar `ctx.db.normalizeId("leads", id)`, devolvendo
  `null` em vez de lançar na validação; o único caller atual,
  `src/components/outreach-composer.tsx`, passa um `Id<"leads">` e continua
  válido) como estado "Lead não encontrado" com link para o CRM, sem crash.
- Volta: **"Voltar ao CRM"** leva a `/crm?lead=<id>`. Como `crm/page.tsx` é
  client component estático, ler `useSearchParams` sem `<Suspense>` quebra o
  `next build`; o mecanismo é um componente pequeno `OpenLeadFromQuery`
  (`useSearchParams` + `useEffect` que chama `setOpenId`) renderizado dentro de
  `<Suspense fallback={null}>` na página do CRM. Vindo de `/sites`
  (`?from=sites`), volta para `/sites`.

Layout: duas colunas em ≥ 1280 px (editor 440 px à esquerda, prévia ocupando o
resto); uma coluna abaixo disso (prévia em cima, editor embaixo). Blocos do
editor, todos `glass` de primeiro nível com campos `bg-surface-solid`:

1. **Modelo**: 4 cartões com `TemplateThumb` (largura 200), nome e descrição; o
   sugerido pela categoria marcado "Sugerido". Trocar mantém todos os campos.
2. **Paleta**: 3 amostras (bolinha dupla bg/accent) do modelo escolhido, com o
   nome.
3. **Textos**: nome, slogan, sobre (textarea). Placeholder = o texto padrão do
   modelo no idioma do lead, para ela ver o que sai se deixar vazio.
4. **Itens** (rótulo por modelo: cardápio / serviços / destaques): lista com
   nome, preço, nota; adicionar/remover; até 12.
5. **Horário**: 7 linhas (seg a dom) com "fechado" ou abre/fecha.
6. **Contato**: endereço, telefone, WhatsApp (com a dica "só dígitos com DDI"),
   Instagram (sem @), e-mail. Pré-preenchidos com o que veio do lead **na
   criação do conteúdo**; depois, é o conteúdo salvo.
7. **Fotos**: principal e galeria (até 6). Cada slot com "Usar padrão", "Enviar
   foto", "Remover"; barra de progresso simples; erro ao lado do slot mantendo a
   foto anterior.

Prévia ao vivo: o modelo renderizado de verdade (`renderTemplate` com o estado
local, imagens enviadas por object URL), dentro de um contêiner com a largura
simulada reduzido com CSS `zoom` para caber (não `transform: scale`, que mantém
a caixa de layout no tamanho original e cria rolagem dupla). Seletor "Desktop / Celular" muda a
largura do contêiner (1280 / 390); funciona porque os modelos usam container
queries (Decisões).

Rodapé **`sticky bottom-0`** dentro do `<main>` (o `main` da área logada é quem
rola; `fixed` cobriria o rail): **Salvar** (`saveContent`; desabilitado sem
mudança; "Salvo" por 2 s; erro de validação do servidor ao lado, estado mantido),
**Abrir preview** (link `/p/<token>`; o token existe assim que o `generate`
do mount termina), **Publicar** (o `PublishButton` que já existe),
**Voltar**. Quando o site está publicado, o rodapé mostra
"Publicado: salvar altera o site no ar". Sair com mudanças não salvas pede
confirmação (`beforeunload` + confirmação no botão Voltar).

Estado local: `SiteContent` inteiro num `useState`, inicializado de
`getForLead`. A query nunca cria nada: quando ela devolve `null`, o editor
dispara `generate` uma vez no mount (`ensurePreview` cria a linha com token e
conteúdo padrão) e a query reativa passa a devolver o preview. "Alterado" =
JSON diferente do salvo.

### 3.2 Aba Site no drawer (`lead-detail.tsx` → `SiteTab`; plano C)

Resumo: modelo (nome + amostra da paleta via `TemplateThumb` 120 px), "Preview
aberto N vezes" (já existe), status Publicado com o link, botões **Editar site**
(vai para `/crm/<id>/site`), **Abrir preview**, **Publicar** e o **Ver o que ele
tem** que já está lá.

"Abrir preview" mantém o padrão de dois passos do componente atual
(`generate-preview-button.tsx`), para não cair no bloqueador de pop-up: sem
preview, botão "Preparar preview" que chama `generate` e vira o link "Abrir
preview"; com preview, já é o link. Só os rótulos mudam ("Gerar preview" →
"Preparar preview").

### 3.3 Cards de lead (`generate-preview-button.tsx`, usado via o slot `action` em `leads/page.tsx`; plano C)

O mesmo componente, com os rótulos novos; ao lado continua "Ver o que ele tem".
Sem editor no card.

### 3.4 Página Sites (`/sites`; plano C)

Cada card mostra `TemplateThumb` (modelo, paleta e nome do lead; só fotos
padrão, sem resolver storage), o nome do modelo e os botões Editar
(`/crm/<id>/site?from=sites`), Abrir, Publicar (o `PublishButton` como hoje).

### 3.5 Páginas públicas (`/p/[token]`, `/site/[slug]`; plano A)

Montam o `SiteView` (content parseado + `images` da query, foto padrão onde não
houver upload) e chamam `renderTemplate(view, localeForLead(...))`. Metadados
(título, descrição, `robots`) como hoje, lendo `name`/`city` do content; o
`/site/[slug]` ganha `og:image` = `heroUrl` quando for upload (não a foto
padrão). `tests/site-indexability.test.ts` continua valendo (só `/site` indexa).

---

## 4. Erros, bordas e acessibilidade

- Preview/site antigo (sem `version`): `parseSiteContent` converte na leitura;
  a primeira gravação do editor já salva v2. Nenhum job de migração.
- Sem telefone, WhatsApp e e-mail: sem CTA no hero e sem seção de contato
  vazia; a seção "onde estamos" só com endereço ou cidade.
- Upload falha (rede, tamanho, tipo): mensagem ao lado do slot, foto anterior
  mantida.
- `saveContent` com erro de validação: mensagem do servidor no rodapé, estado
  local mantido.
- `alt`: foto padrão `alt=""`; upload principal `alt={name}`; galeria `alt=""`.
- Contraste das 12 paletas testado; CTAs com texto visível; foco visível nos
  campos; `aria-label` nos botões só com ícone; `TemplateThumb` é `aria-hidden`.
- Idioma: páginas públicas seguem `localeForLead(countryCode, city)` como hoje;
  o editor é pt-BR.
- Cota: publicar cobra 1 site como hoje; salvar e enviar foto não cobram.
- Convex `getUrl` numa query é permitido; `generateUploadUrl` numa mutation
  também.

---

## 5. Testes e verificação

- **Unitários**: `suggestTemplate` (toda categoria de `CATEGORY_OPTIONS` cai
  num dos 4; desconhecida/nula → vitrine), `parseSiteContent` (formato antigo →
  v2; corrompido → mínimo; limites via `validateSiteContent`; `whatsapp` só
  dígitos; `instagram` sem @/URL), `primaryCta` (ordem e `null`),
  `contrastRatio` (valores conhecidos) e as 12 paletas ≥ 4,5:1 nos 4 pares,
  textos padrão de `templates.*` sem dígito em todos os idiomas, paridade de
  chaves aninhadas, `defaultContentForLead`, `targetSize` do redimensionamento,
  e as guardas migradas de 1.7.
- **Ao vivo (CLI, modo demo: `npx convex run` só passa pelo `requireOrgId` com
  `DEMO_MODE=1` + `CONVEX_ENV=development`)**: `generate` cria v2 e não
  sobrescreve; `saveContent` recusa item nº 13 e storageId que não está em
  `uploads` (para o caso "outro org", uma `internalMutation` de teste em
  `convex/demo.ts`, só em modo demo, insere uma linha de `uploads` com
  `orgId: "outro"` e um storageId real, e a chamada com ele precisa falhar com
  `"Imagem inválida"`); `publish` publica o `content` salvo; `getByToken` devolve
  `images`.
- **Navegador real (CDP, como no UAT anterior; plano C)**: abrir o editor de um
  lead OSM, trocar modelo e paleta, adicionar 2 itens e o horário, enviar uma
  foto (arquivo pequeno gerado no scratchpad), salvar, abrir `/p/<token>` e
  conferir que o que aparece é o que foi salvo (modelo, paleta, itens, foto),
  publicar e abrir `/site/<slug>`; voltar ao CRM com `?lead=` abrindo o drawer;
  screenshots dos 4 modelos × paleta padrão em 1280 e 390 em
  `docs/redesign/templates/` (8 + 8 arquivos).
- `tsc`, `eslint`, testes e `next build` verdes.
- Roteiro manual da Duda: só o que é gosto (as 12 paletas ao vivo, fotos
  padrão) e o fluxo de venda ponta a ponta com um lead real.
