# Modelos de site: preview e site publicado a partir de 4 modelos por segmento

**Data:** 2026-09-17 · **Status:** aprovado em conversa, aguardando plano

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
- **Divisão por segmento**, 4 modelos com 3 paletas cada (opção A da segunda
  pergunta). Estilo único por modelo; "por estilo" e "segmento × estilo" foram
  descartados (mais escolha do que a operação de uma pessoa aguenta manter).
- **Fotos padrão embutidas** por modelo, licença livre; upload das fotos reais
  depois de fechar. Nada de fotos do Google (licença proíbe guardar).
- **Textos padrão** por modelo nos 10 idiomas que a prévia já suporta. Texto
  por IA fica pra v2.
- **Salvar explícito**, não automático: o preview só muda quando ela clica Salvar.
- **Honestidade sobre o negócio alheio**, regra já vigente no repo (ver
  `src/lib/preview-i18n.ts` e `docs/LESSONS.md`): o preview vai para um negócio
  que não pediu nada, com o nome real dele. Portanto **nenhum texto padrão pode
  afirmar fato específico** (horário, preço, "desde 1998", "melhor da cidade",
  prato do dia). Seções de dados (itens com preço, horário, galeria) **só
  aparecem quando ela preencheu**. Foto padrão é imagem genérica do segmento,
  nunca apresentada como sendo do negócio (sem legenda "nossa loja").
- **Domínio próprio, SEO avançado, edição pelo cliente final, mais de 4
  modelos**: fora desta rodada.

## Fora do escopo

Domínio próprio, texto por IA, edição pelo cliente, mais modelos, exportar HTML,
e a abordagem por e-mail (continua citando o link do preview, nada muda ali).

---

## 1. Catálogo de modelos (`src/components/site-templates/`)

### 1.1 Os 4 modelos

| id | Nome | Segmentos (valores de `CATEGORY_OPTIONS`) | Seções, nesta ordem |
|---|---|---|---|
| `mesa` | Mesa | restaurant, cafe, bar, pub, "pizza restaurant", bakery, "pastry shop", "ice cream shop" | hero (foto + nome + slogan + CTA reservar/ligar) · destaques do cardápio (itens com preço, só se houver) · horário (só se houver) · onde estamos (endereço + mapa por link) · contato |
| `estudio` | Estúdio | "barber shop", "hair salon", "beauty salon", "nail salon", spa, "tattoo studio", gym, "personal trainer", "yoga studio" | hero · serviços com preço (só se houver) · galeria (só se houver) · agendar (WhatsApp/telefone) · horário (só se houver) · contato |
| `oficio` | Ofício | plumber, electrician, locksmith, "car repair", "car wash", "driving school", photographer | hero direto ("ligue agora") · serviços (só se houver) · área atendida (cidade, do dado) · pedir orçamento (WhatsApp/telefone/e-mail) · contato |
| `vitrine` | Vitrine | tudo o mais: "clothing store", "furniture store", "jewelry store", "pet store", florist, optician, pharmacy, dentist, doctor, physiotherapist, veterinarian, "real estate agency", lawyer, accountant, hotel, "bed and breakfast", laundry, "language school" e qualquer categoria desconhecida | hero · destaques (itens, só se houver) · sobre · localização e horário (só se houver) · contato |

`suggestTemplate(category)` em `convex/lib/site.ts` devolve o id pela tabela;
desconhecido → `vitrine`.

### 1.2 Paletas

Cada modelo tem 3 paletas nomeadas, cada uma com `bg`, `surface`, `text`,
`muted`, `accent`, `accentFg`. Contraste mínimo 4,5:1 entre `text` e `bg`, e
entre `accentFg` e `accent`; conferido por teste unitário com a mesma conta de
contraste usada na spec do redesenho.

| Modelo | Paletas |
|---|---|
| mesa | `terracota` (creme + terracota), `oliva` (off-white + verde-oliva), `noite` (grafite + âmbar) |
| estudio | `carvao` (preto + dourado), `rosa` (off-white + rosa-queimado), `marinho` (azul-marinho + areia) |
| oficio | `laranja` (branco + laranja), `azul` (branco + azul-forte), `verde` (branco + verde-escuro) |
| vitrine | `areia` (areia + preto), `nevoa` (cinza-azulado + azul), `vinho` (creme + vinho) |

Padrão: a primeira de cada modelo.

### 1.3 Fotos padrão

`public/templates/<modelo>/{hero,g1,g2}.jpg`, 12 arquivos, JPEG otimizado,
1600 px no lado maior, ≤ 250 KB cada. Origem: Unsplash ou Pexels (licença
livre para uso comercial sem atribuição); `public/templates/LICENSES.md` lista
arquivo → fonte → autor → licença. **Não usar foto que mostre marca, nome de
loja ou pessoa reconhecível**: a foto vai ilustrar o negócio de terceiro.

### 1.4 Componentes

- `src/components/site-templates/index.ts`: `TEMPLATES` (catálogo: id, nome,
  descrição curta, paletas, fotos padrão), `renderTemplate(content, locale)`.
- `src/components/site-templates/{mesa,estudio,oficio,vitrine}.tsx`: um
  componente cada, props `{ content: SiteContent; palette: Palette; tr: SiteDict }`.
  Sem dependência do tema/chrome da app (como o `PreviewSite` de hoje): paleta
  via CSS custom properties no elemento raiz, fontes do próprio `next/font` já
  carregado.
- `src/components/site-templates/shared.tsx`: blocos comuns (contato, horário,
  lista de itens, galeria, CTA de WhatsApp/telefone) para os quatro não repetirem.
- `src/components/preview-site.tsx` **deixa de renderizar** e passa a ser só o
  ponto de entrada: `PreviewSite({ content })` → `renderTemplate`. Seu
  `PreviewContent` atual é convertido para `SiteContent` (seção 2.3).

### 1.5 Textos padrão (`src/lib/preview-i18n.ts`)

`PreviewDict` ganha `templates: Record<TemplateId, TemplateDict>` com: `tagline`
(slogan padrão genérico, ex. "Sabores que valem a visita" para mesa),
`about` (parágrafo genérico sobre atendimento e cuidado, sem fato), rótulos de
seção (`menuHeading`, `servicesHeading`, `galleryHeading`, `hoursHeading`,
`areaHeading`, `quoteHeading`, `aboutHeading`, `visitHeading`), CTAs
(`reserve`, `book`, `callNow`, `quote`, `whatsapp`). Nos 10 idiomas. Regra de
honestidade: revisar cada string contra a lista da seção "Decisões"; teste
unitário garante que nenhum texto padrão contém dígito (sem horário, preço ou
ano inventado).

---

## 2. Dados

### 2.1 `SiteContent` (`convex/lib/site.ts`, puro, com validador Convex e teste)

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
  whatsapp?: string;               // só dígitos com DDI, ex. "447700900123"
  instagram?: string;              // handle sem @
  email?: string;
  heroImage?: string;              // storageId do Convex; ausente → foto padrão
  gallery?: string[];              // storageIds, máx. 6
  // dados do lead que a prévia atual já mostra e continuam válidos
  category: string | null;
  rating: number | null;
  reviewsCount: number | null;
}
```

- `siteContentValidator` (Convex `v.object`) e `parseSiteContent(raw): SiteContent`
  que aceita **o formato antigo** (`PreviewContent` sem `version`) e o converte:
  `template = suggestTemplate(category)`, `palette` = primeira, campos novos
  ausentes. Assim nenhum preview/site existente quebra e nada precisa de
  migração de dados.
- `defaultContentForLead(lead)`: monta o `SiteContent` inicial a partir do lead
  (nome, categoria, cidade, país, telefone, endereço, nota, avaliações, modelo
  sugerido, paleta padrão).
- Limites validados no servidor: `name` 1 a 80, `tagline` ≤ 120, `about` ≤ 1200,
  `items` ≤ 12 (nome ≤ 60, preço ≤ 20, nota ≤ 80), `gallery` ≤ 6, `instagram`
  sem `@` e sem URL, `whatsapp` só dígitos 8 a 15, `email` com `@`. Erro →
  `userError` com a mensagem do campo.

### 2.2 Schema (`convex/schema.ts`)

`previews.content` continua `v.optional(v.any())` (conteúdo antigo coexiste); a
validação é feita nas mutations que escrevem. Novo campo `previews.template:
v.optional(templateId)` **só como índice de listagem** (a página Sites mostra o
modelo sem abrir o `content`); é gravado junto de `content` em toda escrita.

### 2.3 Mutations e queries (`convex/previews.ts`)

| Função | Mudança |
|---|---|
| `generate` (mutation) | continua criando o preview, mas com `content = defaultContentForLead(lead)` (v2) em vez do bloco antigo. Se já existe, **não sobrescreve** o `content` (hoje sobrescreve): o botão "Gerar preview" vira "Abrir preview" quando já há um, e a edição é pelo editor. |
| `ensureForLead` (internal) | idem, `defaultContentForLead`. |
| `saveContent` (mutation, nova) | `{ leadId, content: siteContentValidator }` → valida limites, garante que `heroImage`/`gallery` são storageIds do mesmo org (a mutation de upload registra `storageId → orgId` numa tabela `uploads`, seção 2.4), grava `content` e `template`. |
| `getForLead` (query) | passa a devolver `content` parseado (`parseSiteContent`) e `template`. |
| `getByToken`, `getBySlug` (queries públicas) | devolvem `content` parseado e as **URLs** das imagens (`ctx.storage.getUrl`) já resolvidas em `heroImageUrl`/`galleryUrls`, para as páginas públicas não precisarem do storage. |
| `publish` (mutation) | não recompõe mais o `content` a partir do lead: publica o `content` salvo (parseado), e só. Cota de site igual a hoje. |
| `listSites` (query) | devolve também `template` e `palette` (para a miniatura). |

### 2.4 Upload de imagens

- Tabela nova `uploads: { orgId, storageId, leadId, kind: "hero" | "gallery", at }`
  com índice `by_storage` e `by_lead`.
- `previews.generateUploadUrl` (mutation): `requireOrgId`, devolve
  `ctx.storage.generateUploadUrl()`.
- `previews.registerUpload` (mutation): `{ leadId, storageId, kind }` →
  `requireOrgId`, ownership do lead, grava em `uploads`. `saveContent` recusa
  storageId que não esteja em `uploads` do mesmo org (`"Imagem inválida"`).
- `previews.removeUpload` (mutation): apaga do storage e da tabela, e tira do
  `content` se estiver referenciado.
- No navegador (`src/lib/image-resize.ts`, puro exceto pelo canvas):
  redimensiona para ≤ 1600 px no lado maior, JPEG qualidade 0,82, antes do
  `fetch(uploadUrl, { method: "POST", body })`; recusa arquivo > 10 MB antes de
  redimensionar e tipo fora de `image/jpeg|png|webp`.

---

## 3. Telas

### 3.1 Editor do site (`/crm/[leadId]/site`, página nova)

O drawer é estreito demais para editor + prévia lado a lado. A aba **Site** do
drawer vira um resumo (modelo, paleta, status preview/publicado, botões "Abrir
preview", "Editar site", "Publicar") e o editor abre em **página inteira**,
dentro da área logada (mesmo rail), rota `src/app/(app)/crm/[leadId]/site/page.tsx`.

Layout: duas colunas em ≥ 1280 px (editor 440 px à esquerda, prévia ocupando
o resto); uma coluna abaixo disso (prévia em cima, editor embaixo). Blocos do
editor, todos `glass` de primeiro nível com campos `bg-surface-solid`:

1. **Modelo**: 4 cartões com miniatura estática (`public/templates/<id>/thumb.png`,
   gerada no plano a partir do próprio modelo com a paleta padrão), nome e
   descrição; o sugerido pela categoria marcado como "Sugerido". Trocar mantém
   todos os campos.
2. **Paleta**: 3 amostras (bolinha dupla bg/accent) do modelo escolhido.
3. **Textos**: nome, slogan, sobre (textarea). Placeholder = o texto padrão do
   modelo no idioma do lead, para ela ver o que sai se deixar vazio.
4. **Itens** (cardápio/serviços/destaques, rótulo muda por modelo): lista com
   nome, preço, nota; adicionar/remover; até 12.
5. **Horário**: 7 linhas (seg a dom) com "fechado" ou abre/fecha.
6. **Contato**: endereço, telefone, WhatsApp, Instagram, e-mail. Pré-preenchidos
   com o lead.
7. **Fotos**: principal (padrão do modelo ou upload) e galeria (até 6). Cada
   uma com "Usar padrão", "Enviar foto", "Remover". Barra de progresso simples
   durante o upload.

Prévia: o modelo renderizado de verdade, em `<iframe srcDoc>` não; em um
`<div>` com `transform: scale()` para caber, atualizado a cada mudança de
estado local (sem salvar). Um seletor "Desktop / Celular" muda a largura
simulada (1280 / 390).

Rodapé fixo da página: **Salvar** (`saveContent`; desabilitado sem mudança;
mostra "Salvo" por 2 s), **Abrir preview** (`/p/<token>`, cria o preview se
não existir), **Publicar** (o `PublishButton` que já existe), **Voltar ao CRM**.
Sair com mudanças não salvas pede confirmação (`beforeunload` + confirmação
no botão Voltar).

Estado local do editor: `SiteContent` inteiro num `useState`, inicializado
de `getForLead` (ou `defaultContentForLead` quando não há preview). "Alterado"
= JSON diferente do salvo.

### 3.2 Aba Site no drawer (`lead-detail.tsx` → `SiteTab`)

Resumo: modelo (nome + amostra da paleta), "Preview aberto N vezes" (já
existe), status Publicado com o link, botões **Editar site** (vai para a
página do editor), **Abrir preview**, **Publicar** e o **Ver o que ele tem**
que já está lá. O "Gerar preview" some: "Abrir preview" cria na hora se não
existir (mesma mutation `generate`).

### 3.3 Cards de lead (`lead-card.tsx`)

O botão "Gerar preview" vira **"Abrir preview"** (cria se não existir e abre);
ao lado continua "Ver o que ele tem". Sem editor no card.

### 3.4 Página Sites (`/sites`)

Cada card mostra a **miniatura do modelo com a paleta** (o `thumb.png` do modelo
tingido pela paleta é caro; em vez disso, o card renderiza o hero do modelo em
escala reduzida com a paleta e o nome do lead, o mesmo componente da prévia,
`pointer-events: none`), o nome do modelo, e os botões Editar / Abrir / Publicar.

### 3.5 Páginas públicas (`/p/[token]`, `/site/[slug]`)

Trocam `PreviewSite` pelo `renderTemplate(content, locale)` com as URLs de
imagem resolvidas pela query. Metadados (título, descrição, `robots`) como
hoje; o `/site/[slug]` ganha `og:image` = foto principal quando houver upload.

---

## 4. Erros, bordas e acessibilidade

- Preview/site antigo (sem `version`): `parseSiteContent` converte na leitura;
  primeira gravação do editor já salva v2. Nenhum job de migração.
- Lead sem telefone e sem WhatsApp: os CTAs de ligar/agendar somem; o hero usa
  o CTA de e-mail se houver, senão nenhum. Nunca um botão que não leva a nada.
- Upload falha (rede, tamanho): mensagem ao lado do slot, foto anterior mantida.
- Salvar com erro de validação: mensagem do servidor ao lado do rodapé, estado
  local mantido.
- Imagens: `alt` = nome do negócio na principal, vazio (`alt=""`) na galeria
  decorativa; foto padrão nunca tem legenda que a apresente como do negócio.
- Contraste das 12 paletas testado; todos os CTAs com texto visível; foco
  visível nos campos do editor; `aria-label` nos botões só com ícone.
- Idioma: as páginas públicas seguem `localeForLead(countryCode, city)` como
  hoje; o editor é pt-BR.
- Cota: publicar cobra 1 site como hoje; salvar e enviar foto não cobram.

---

## 5. Testes e verificação

- **Unitários**: `suggestTemplate` (toda categoria de `CATEGORY_OPTIONS` cai
  num dos 4; desconhecida → vitrine), `parseSiteContent` (formato antigo →
  v2; limites; `whatsapp` só dígitos; `instagram` sem @/URL), contraste das 12
  paletas ≥ 4,5:1, textos padrão sem dígito em todos os idiomas e modelos,
  `defaultContentForLead`, `image-resize` (só a parte pura: cálculo do tamanho
  alvo).
- **Ao vivo (CLI)**: `generate` cria v2; `saveContent` recusa storageId de
  outro org e item nº 13; `publish` publica o `content` salvo; `getByToken`
  devolve URLs.
- **Navegador real (CDP, como no UAT anterior)**: abrir o editor de um lead
  OSM, trocar modelo e paleta, adicionar 2 itens e o horário, enviar uma foto
  (arquivo pequeno gerado no scratchpad), salvar, abrir `/p/<token>` e conferir
  que o que aparece é o que foi salvo (modelo, paleta, itens, foto), publicar e
  abrir `/site/<slug>`; screenshots dos 4 modelos × paleta padrão em 1280 e
  390 em `docs/redesign/templates/` (8 + 8 arquivos).
- `tsc`, `eslint`, testes e `next build` verdes.
- Roteiro manual da Duda: só o que é gosto (as 12 paletas ao vivo, fotos
  padrão) e o fluxo de venda ponta a ponta com um lead real.
