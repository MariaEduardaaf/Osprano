# Modelos de site, plano B: editor e uploads

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Duda abre `/crm/<leadId>/site`, escolhe modelo e paleta, ajusta textos, itens, horário, contato e fotos (upload real para o file storage do Convex), vê a prévia ao vivo, salva, e o preview rastreado `/p/<token>` e o site publicado `/site/<slug>` passam a refletir o que ela salvou.

**Architecture:** O servidor ganha quatro mutations em `convex/previews.ts` (`generateUploadUrl`, `registerUpload`, `removeUpload`, `saveContent`) sobre dois helpers puros novos em `convex/lib/site.ts` (`imageIds`, `removedImageIds`) e um helper de model (`convex/model/uploads.ts`); `saveContent` valida, exige que toda imagem esteja em `uploads` do mesmo org, grava e SÓ DEPOIS apaga do storage o que saiu do conteúdo antigo. No cliente, o estado do editor é o `SiteContent` inteiro num `useState`, e todas as transições passam por funções puras testadas em `src/lib/site-editor.ts`; o redimensionamento de foto fica em `src/lib/image-resize.ts` (parte pura testada). A página `src/app/(app)/crm/[leadId]/site/page.tsx` é server component e renderiza o client `SiteEditor`, dividido em blocos pequenos em `src/components/site-editor/`. A volta ao CRM abre o drawer por `?lead=` via `OpenLeadFromQuery` dentro de `<Suspense>`.

**Tech Stack:** Next.js 16.2 (App Router; `params`/`searchParams` são Promises; `useSearchParams` exige `<Suspense>` em página estática), React 19 com as regras de lint do React Compiler (`react-hooks/*`, ver Contexto), Tailwind v4, Convex 1.42 (file storage: `generateUploadUrl`, `storage.delete`, `db.system.get("_storage", id)`), `react-icons/md`, testes em `node --experimental-strip-types --test`. Node v24 (o script de captura usa o `WebSocket` nativo).

---

## Contexto obrigatório para quem executa

Leia antes de qualquer tarefa. Tudo aqui foi verificado no repositório em 2026-09-18 (branch `main`, HEAD `70ae0ba`, plano A mesclado). O código de cada tarefa foi compilado (`tsc`, os dois projetos), lintado (config do repo, com as regras do React Compiler ativas), testado, e o editor foi renderizado num servidor de rascunho e fotografado em 1440 e 390 px (inclusive a volta ao CRM com o drawer aberto e o estado "Lead não encontrado"). Copie o código como está.

### Fontes de verdade

- Spec: `docs/superpowers/specs/2026-09-17-modelos-de-site-design.md`, incluindo o "Adendo 2026-09-18". Este plano cobre **só** o plano B da spec: seção 2.4 (uploads e `saveContent`), seção 3.1 (editor, `?lead=`, `?from=sites`) e o link provisório "Editar site" no `SiteTab`. **Fora deste plano (plano C):** resumo da aba Site (3.2), cards (3.3), página Sites (3.4), UAT em navegador real da seção 5 e as capturas dos modelos.
- Plano A (feito): `docs/superpowers/plans/2026-09-17-modelos-de-site-A.md`. O que ele entregou e este plano usa, sem mudar: `convex/lib/site.ts` (`SiteContent`, `siteContentValidator`, `parseSiteContent`, `validateSiteContent`, `LIMITS`, `defaultPalette`, `isPaletteOf`, `suggestTemplate`, `TEMPLATE_IDS`), `convex/model/previews.ts` (`ensurePreview`, `readContent`, `resolveImages`), `convex/previews.ts` (`getForLead` devolve `{ token, content, published, slug, openCount, images: { heroUrl?, galleryUrls } }`; `generate`; `publish`), `convex/schema.ts` (tabela `uploads: { orgId, leadId, storageId, at }`, índices `by_storage` e `by_lead`), `convex/leads.ts` (`get` aceita `id: v.string()` e devolve `null` para id malformado), `src/components/site-templates/` (`renderTemplate(view, locale)`, `buildSiteView(content, images)`, `TEMPLATES` com `itemsLabel` e `photos.hero`, `palettesOf`, `TemplateThumb`), `src/lib/preview-i18n.ts` (`DICTS[locale].templates[id]` com `tagline`/`about` padrão; `localeForLead`), `src/components/publish-button.tsx`, `src/components/ui.tsx` (`PageHeader`, `EmptyState`, `Badge`), `src/lib/errors.ts` (`errorMessage`).

### Regras que valem em toda tarefa

- **Nada é apagado do storage antes do Salvar.** Trocar ou remover uma foto no editor só muda o estado local; o servidor apaga o que saiu do conteúdo antigo depois de gravar o novo (`saveContent`). `removeUpload` existe só para descartar um upload desta sessão que ainda não foi salvo. Upload feito e página fechada sem salvar fica no storage: aceito, sem coleta de lixo nesta rodada (spec 2.4).
- **Honestidade sobre o negócio alheio** continua valendo: o editor não inventa texto; placeholder mostra o padrão do modelo e campo vazio usa o padrão. O único valor sugerido é a faixa 09:00 a 18:00 ao marcar um dia como aberto no bloco Horário, e nada disso sai sem o Salvar dela.
- **Design system (redesenho vidro):** bloco de primeiro nível é `glass` (o rodapé, sobre o conteúdo, é `glass-dense`); dentro de um vidro tudo é sólido: campos `bg-surface-solid`, blocos internos `bg-surface-2`; raio `rounded-xl` (18px) nos blocos. Botões e cores seguem `src/app/(app)/crm/page.tsx` e `src/components/crm/lead-info-fields.tsx`.
- **Regras do React Compiler (eslint-plugin-react-hooks 7):** `react-hooks/purity` (nada de `Date.now()`/`Math.random()` no corpo do componente), `react-hooks/refs` (não ler nem escrever `ref.current` durante o render; só em efeito ou handler), `react-hooks/set-state-in-effect` (sem `setState` síncrono no corpo de um efeito), `react-hooks/immutability` (nunca mutar props/estado; toda transição do `SiteContent` devolve objeto novo). O código deste plano passa em todas; ao adaptar, rode o eslint antes de seguir.
- **Componentes (`.tsx`) usam os aliases `@/` e `@convex/`; arquivos puros carregados por teste usam import relativo com extensão `.ts`** (`../../convex/lib/site.ts`), porque `node --experimental-strip-types` não lê os `paths` do tsconfig. `import type { Id } from "../../convex/_generated/dataModel"` (sem extensão) é permitido em arquivo puro: some na execução.
- **Convex nunca importa de `src/`.**
- **Sem travessão** (o caractere U+2014) em nada que você escrever: código, comentário, string, commit. Onde o repo já o usa, não toque.
- **Sem `pnpm <script>`** (aborta sem TTY nesta máquina). Binários direto, a partir de `/Users/madu/Developer/mine/osprano`:

```bash
./node_modules/.bin/tsc --noEmit                                  # typecheck do app (saída vazia = verde)
./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json          # typecheck do Convex (saída vazia = verde)
./node_modules/.bin/eslint                                        # lint (saída vazia = verde; warning também conta)
node --experimental-strip-types --test tests/*.test.ts            # testes (ponto de partida: "pass 269", "fail 0")
NEXT_PUBLIC_DEMO=1 ./node_modules/.bin/next build                 # build de produção (só na Task 13)
```

Estado de partida verificado: `tsc` (os dois) verde, `eslint` verde, 269 testes passando, árvore limpa em `main`. Trabalhe numa branch (`git checkout -b feat/modelos-de-site-b`); não commite em `main`.

### Servidores de desenvolvimento

Dois processos rodam em background. Confira com `lsof -iTCP -sTCP:LISTEN -P | grep -E "3000|3210"` (espera-se `node` em 3000 e `convex-lo` em 3210). Se faltar algum, suba (cada um com `run_in_background`):

```bash
cd /Users/madu/Developer/mine/osprano && ./node_modules/.bin/convex dev --tail-logs disable
cd /Users/madu/Developer/mine/osprano && NEXT_PUBLIC_DEMO=1 ./node_modules/.bin/next dev
```

O deployment local do Convex tem `DEMO_MODE=1` e `CONVEX_ENV=development` e está semeado com **37 leads reais do OSM** mais **4 leads manuais** do plano A: Casa Aurora (restaurante, PT, com preview), Studio Norte (barbearia, GB), Bakker Installaties (encanador, NL), Óptica Meridiano (ótica, ES). **Não rode `demo:seed` nem `demo:clear`**: apagam os 37 leads reais. O `convex dev` em background aplica mudanças de schema e de funções sozinho; depois de editar `convex/`, espere uns 5 s antes de `convex run`; se o CLI disser que uma função não existe, a sincronização não terminou: repita.

`convex run` **sempre com a saída redirecionada para arquivo** e lida com `jq` (encanar para `head` deixa o processo preso). Um `convex run` que lança `userError` escreve a mensagem no stderr e sai com código diferente de zero; por isso os comandos de prova usam `> arquivo 2>&1` e `grep -o "mensagem"`. Pasta de saída deste plano:

```bash
OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/plano-b; mkdir -p "$OUT"
```

Variáveis de shell **não sobrevivem** entre duas chamadas da ferramenta Bash. Por isso cada bloco de comandos deste plano começa com o mesmo prelúdio (`cd`, `OUT`, e a leitura dos ids gravados em `$OUT/*.txt` pelos blocos anteriores) e é para ser executado inteiro numa chamada só.

### Capturas de tela

Dois caminhos, porque as telas logadas recebem dados por websocket do Convex:

- **Páginas públicas** (`/p/<token>`, `/site/<slug>`) renderizam no servidor: o Chrome headless cacheado com `--virtual-time-budget` serve, como no plano A.
- **Telas logadas** (o editor, o CRM): sob `--virtual-time-budget` o websocket não entrega dados e a tela fica em "Carregando…" (verificado; não é bug do editor). A Task 8 cria `$OUT/shot-cdp.mjs`, que dirige o mesmo `chrome-headless-shell` por CDP em tempo real com o `WebSocket` nativo do Node 24 (nada a instalar), espera um texto aparecer no DOM (até 20 s), captura e sai com código 1 se o texto nunca apareceu. Use-o para toda captura do editor.

### Commits

Conventional commits em português, um por tarefa, `git add` só dos arquivos da tarefa (nunca `git add -A`). Toda mensagem termina com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Formato:

```bash
git commit -m "$(cat <<'MSG'
tipo(escopo): resumo no imperativo

Corpo explicando o porquê (opcional).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

Não faça `git push`.

### Mapa de arquivos deste plano

| Arquivo | Papel |
|---|---|
| `convex/lib/site.ts` | + `imageIds`, `removedImageIds` (puros) |
| `convex/model/uploads.ts` (novo) | `uploadRow`, `assertUploadsOwned`, `deleteUploads` |
| `convex/previews.ts` | + `saveContent`, `generateUploadUrl`, `registerUpload`, `removeUpload` |
| `convex/demo.ts` | + `foreignUpload` (internal, só demo: prova do "outro org") |
| `src/lib/image-resize.ts` (novo) | `checkFile`, `targetSize` (puros), `resizeToJpeg`, `postToStorage` (navegador) |
| `src/lib/site-editor.ts` (novo) | transições puras do estado do editor: `isDirty`, `withTemplate`, `setText`, itens, horário, fotos, `imageUrlMap`, `viewImages` |
| `src/components/crm/open-lead-from-query.tsx` (novo) | `OpenLeadFromQuery` (`?lead=` abre o drawer) |
| `src/app/(app)/crm/page.tsx` | `<Suspense>` com `OpenLeadFromQuery` |
| `src/components/site-editor/fields.tsx` (novo) | `Block`, `Field`, classes de campo e botão |
| `src/components/site-editor/template-block.tsx` (novo) | blocos Modelo e Paleta |
| `src/components/site-editor/texts-block.tsx` (novo) | bloco Textos |
| `src/components/site-editor/items-block.tsx` (novo) | bloco Itens (rótulo por modelo) |
| `src/components/site-editor/hours-block.tsx` (novo) | bloco Horário |
| `src/components/site-editor/contact-block.tsx` (novo) | bloco Contato |
| `src/components/site-editor/use-upload.ts` (novo) | fluxo de upload (checar, redimensionar, URL, POST, registrar) |
| `src/components/site-editor/photos-block.tsx` (novo) | bloco Fotos (principal + galeria, progresso, erro por slot) |
| `src/components/site-editor/live-preview.tsx` (novo) | prévia ao vivo com `zoom` e seletor Desktop/Celular |
| `src/components/site-editor/editor-footer.tsx` (novo) | rodapé sticky: Voltar, estado, Abrir preview, Publicar, Salvar |
| `src/components/site-editor/site-editor.tsx` (novo) | `SiteEditor` (casca: lead, generate no mount) e `EditorBody` (estado) |
| `src/app/(app)/crm/[leadId]/site/page.tsx` (novo) | rota (server component) |
| `src/components/crm/lead-detail.tsx` | link provisório "Editar site" no `SiteTab` |
| `tests/site.test.ts`, `tests/image-resize.test.ts` (novo), `tests/site-editor.test.ts` (novo) | testes |
| `docs/redesign/editor-1440.png`, `docs/redesign/editor-390.png` | capturas do editor |

### Decisões deste plano que a spec não fixa (todas verificadas no rascunho)

1. **Mapa id → URL no editor.** `getForLead` devolve `images: { heroUrl?, galleryUrls[] }` (posicional). O editor precisa resolver a prévia **por id** (ela pode trocar o hero por uma foto que ainda não salvou). Em vez de mudar a query do plano A, `imageUrlMap(content, images)` (puro, testado) casa hero e galeria por posição e alimenta um estado `urls: Record<id, url>`, que os uploads da sessão estendem com object URLs. Se a query devolveu menos URLs que ids na galeria (arquivo apagado por fora), a galeria não é casada, para não mostrar a foto errada.
2. **JSON canônico.** "Alterado" é `canonical(draft) !== canonical(saved)`, com chaves ordenadas e `undefined` fora; todas as transições removem a chave quando o valor fica vazio (texto "", lista vazia). Sem isso, digitar e apagar um slogan deixaria "Salvar" habilitado.
3. **Cartão de modelo = `div` + botão esticado** (`absolute inset-0`, `aria-pressed`, `aria-label`), não `<button>` em volta da miniatura: o hero renderizado tem `header`/`section`/`h1`, que não podem viver dentro de um botão.
4. **`<input type="time">`** entrega `HH:MM`, o formato que o servidor exige; marcar um dia como aberto sugere 09:00 a 18:00.
5. **A casca `SiteEditor` só monta `EditorBody` quando lead e preview existem**, e `EditorBody` nasce com `useState(preview.content)`: nenhum efeito "sincroniza" props para estado (proibido pelo Compiler e fonte de bug), e a query atualizando `openCount`/`published` não remonta o editor.
6. **Rodapé `sticky bottom-4`** (não `bottom-0`): flutua com 16px de folga; a prévia em ≥ 1280 px é `sticky top-4` com altura `calc(100dvh - 7rem)` para não entrar embaixo do rodapé. Unidade de viewport aqui é permitida: é chrome do editor, não modelo.
7. **`saveContent` devolve o token** (o mesmo de `generate`), para a prova pela CLI ler algo útil.
8. **`removeUpload` de id inexistente ou de outro org responde "Imagem não encontrada"**; `registerUpload` de arquivo apagado responde "Arquivo não encontrado"; de storageId já registrado por outro org, "Imagem inválida".
9. **Link "Editar site" nos dois estados do `SiteTab`** (sem preview e com preview): o editor cria o preview sozinho, então não faz sentido obrigar "Preparar preview" antes de editar. O plano C redesenha a aba.

---


## Chunk 1: Convex: uploads e `saveContent`

Servidor inteiro do plano B. Ao fim da chunk: `tsc` (os dois) verde, `eslint` verde, 271 testes, e a prova pela CLI da Task 3 feita (upload por HTTP, registro, salvar com foto, apagar no diff, recusas).

### Task 1: `imageIds` e `removedImageIds` (`convex/lib/site.ts`)

**Files:**
- Modify: `convex/lib/site.ts` (fim do arquivo)
- Test: `tests/site.test.ts`

- [ ] **Step 1: Escrever os testes (falham)**

Em `tests/site.test.ts`, troque o bloco de import do topo:

```ts
  defaultContentForLead,
  type SiteContent,
} from "../convex/lib/site.ts";
```

por:

```ts
  defaultContentForLead,
  imageIds,
  removedImageIds,
  type SiteContent,
} from "../convex/lib/site.ts";
import type { Id } from "../convex/_generated/dataModel";
```

e acrescente no FIM do arquivo:

```ts

// Ids de storage são strings opacas: os testes usam literais com o tipo do Convex.
const sid = (s: string) => s as Id<"_storage">;

test("site: imageIds junta hero e galeria, sem repetir e sem nulos", () => {
  assert.deepEqual(imageIds({}), []);
  assert.deepEqual(imageIds({ heroImage: sid("a") }), ["a"]);
  assert.deepEqual(imageIds({ gallery: [sid("b"), sid("c")] }), ["b", "c"]);
  assert.deepEqual(imageIds({ heroImage: sid("a"), gallery: [sid("b"), sid("a")] }), ["a", "b"]);
});

test("site: removedImageIds é o que saiu do conteúdo; trocar de slot não conta", () => {
  const before = { heroImage: sid("a"), gallery: [sid("b"), sid("c")] };
  assert.deepEqual(removedImageIds(before, before), []);
  assert.deepEqual(removedImageIds(before, { heroImage: sid("a"), gallery: [sid("c")] }), ["b"]);
  assert.deepEqual(removedImageIds(before, {}), ["a", "b", "c"]);
  // hero virou galeria e a galeria virou hero: nada saiu
  assert.deepEqual(removedImageIds(before, { heroImage: sid("b"), gallery: [sid("a"), sid("c")] }), []);
  // conteúdo antigo sem imagem: nada a apagar, mesmo que o novo tenha
  assert.deepEqual(removedImageIds({}, { heroImage: sid("z") }), []);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --experimental-strip-types --test tests/site.test.ts 2>&1 | grep -E "^ℹ (tests|pass|fail)|SyntaxError" | head -3`
Expected: `SyntaxError: The requested module '../convex/lib/site.ts' does not provide an export named 'imageIds'` (o arquivo de teste nem carrega).

- [ ] **Step 3: Implementar**

Acrescente no FIM de `convex/lib/site.ts` (depois de `defaultContentForLead`):

```ts

/** Ids de storage referenciados pelo conteúdo (hero e galeria), sem repetição. */
export function imageIds(c: Pick<SiteContent, "heroImage" | "gallery">): Id<"_storage">[] {
  const out = new Set<Id<"_storage">>();
  if (c.heroImage) out.add(c.heroImage);
  for (const id of c.gallery ?? []) out.add(id);
  return [...out];
}

/**
 * Ids que estavam em `before` e não estão em `after`: o que `saveContent` apaga
 * do storage DEPOIS de gravar o conteúdo novo (spec 2.4). Trocar de slot (hero
 * vira galeria) não conta como saída.
 */
export function removedImageIds(
  before: Pick<SiteContent, "heroImage" | "gallery">,
  after: Pick<SiteContent, "heroImage" | "gallery">,
): Id<"_storage">[] {
  const keep = new Set(imageIds(after));
  return imageIds(before).filter((id) => !keep.has(id));
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --experimental-strip-types --test tests/*.test.ts 2>&1 | grep -E "^ℹ (tests|pass|fail)" && ./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json && ./node_modules/.bin/eslint convex/lib/site.ts tests/site.test.ts`
Expected: `ℹ tests 271`, `ℹ pass 271`, `ℹ fail 0`; `tsc` e `eslint` sem saída.

- [ ] **Step 5: Commit**

```bash
git add convex/lib/site.ts tests/site.test.ts
git commit -m "$(cat <<'MSG'
feat(site): imageIds e removedImageIds para o diff de fotos do saveContent

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 2: helper `convex/model/uploads.ts`, mutations de upload e `saveContent`, `demo:foreignUpload`

Não há harness de teste para mutations no repo (nada de `convex-test`); a prova é a Task 3, ao vivo. Aqui: código, `tsc`, `eslint`.

**Files:**
- Create: `convex/model/uploads.ts`
- Modify: `convex/previews.ts` (imports e quatro mutations novas antes de `getByToken`)
- Modify: `convex/demo.ts` (import e uma `internalMutation` no fim)

- [ ] **Step 1: Criar `convex/model/uploads.ts`**

```ts
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { userError } from "../lib/errors.ts";

/** Linha de `uploads` de um storageId (índice by_storage), ou null. */
export async function uploadRow(
  ctx: QueryCtx | MutationCtx,
  storageId: Id<"_storage">,
): Promise<Doc<"uploads"> | null> {
  return ctx.db
    .query("uploads")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .first();
}

/**
 * Todo id precisa estar em `uploads` do MESMO org (spec 2.4): um storageId
 * válido de outra org, ou um upload nunca registrado, é recusado com a mesma
 * mensagem. O editor só manda ids que ele mesmo registrou.
 */
export async function assertUploadsOwned(
  ctx: QueryCtx | MutationCtx,
  orgId: string,
  ids: Id<"_storage">[],
): Promise<void> {
  for (const id of ids) {
    const row = await uploadRow(ctx, id);
    if (!row || row.orgId !== orgId) throw userError("Imagem inválida");
  }
}

/**
 * Apaga do storage e de `uploads` os ids que pertencem ao org. Id sem linha, ou
 * de outro org, é ignorado: nunca se apaga o que não é seu. O arquivo pode já
 * ter sumido do storage (apagado por fora): a linha sai mesmo assim.
 * Devolve quantos apagou (a CLI de verificação lê isso).
 */
export async function deleteUploads(ctx: MutationCtx, orgId: string, ids: Id<"_storage">[]): Promise<number> {
  let n = 0;
  for (const id of ids) {
    const row = await uploadRow(ctx, id);
    if (!row || row.orgId !== orgId) continue;
    if (await ctx.db.system.get("_storage", id)) await ctx.storage.delete(id);
    await ctx.db.delete(row._id);
    n += 1;
  }
  return n;
}
```

- [ ] **Step 2: Imports em `convex/previews.ts`**

Troque:

```ts
import { ensurePreview, readContent, resolveImages } from "./model/previews";
import { parseSiteContent } from "./lib/site";
import { userError } from "./lib/errors";
```

por:

```ts
import { ensurePreview, readContent, resolveImages } from "./model/previews";
import { assertUploadsOwned, deleteUploads, uploadRow } from "./model/uploads";
import {
  imageIds,
  parseSiteContent,
  removedImageIds,
  siteContentValidator,
  validateSiteContent,
} from "./lib/site";
import { userError } from "./lib/errors";
```

- [ ] **Step 3: As quatro mutations em `convex/previews.ts`**

Insira este bloco logo ANTES da linha `/** PUBLIC, sem auth: o prospect abre pelo token. Devolve só o que a página renderiza. */` (ou seja, depois de `ensureForLead`):

```ts
/**
 * Salva o conteúdo do site (spec 2.3/2.4). Authed. Ordem: ownership do lead,
 * limites (`validateSiteContent`), cada imagem precisa estar em `uploads` do
 * mesmo org, grava, e SÓ DEPOIS apaga do storage o que saiu do conteúdo antigo.
 * Nada é apagado antes de gravar: trocar uma foto no editor não toca no site
 * publicado até ela salvar. Devolve o token (o mesmo de `generate`).
 */
export const saveContent = mutation({
  args: { leadId: v.id("leads"), content: siteContentValidator },
  handler: async (ctx, { leadId, content }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");
    validateSiteContent(content);
    await assertUploadsOwned(ctx, orgId, imageIds(content));

    const preview = await ensurePreview(ctx, lead);
    const before = parseSiteContent(preview.content);
    await ctx.db.patch(preview._id, { content });
    await deleteUploads(ctx, orgId, removedImageIds(before, content));
    return preview.token;
  },
});

/**
 * URL de upload do file storage (spec 2.4). Authed. Quem faz o POST é o
 * navegador; o arquivo só passa a "ser da org" em `registerUpload`.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireOrgId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Registra um arquivo enviado como upload do lead (spec 2.4). `saveContent` só
 * aceita storageId que passou por aqui. Idempotente para o mesmo org.
 */
export const registerUpload = mutation({
  args: { leadId: v.id("leads"), storageId: v.id("_storage") },
  handler: async (ctx, { leadId, storageId }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");
    if (!(await ctx.db.system.get("_storage", storageId))) throw userError("Arquivo não encontrado");
    const existing = await uploadRow(ctx, storageId);
    if (existing) {
      if (existing.orgId !== orgId) throw userError("Imagem inválida");
      return existing._id;
    }
    return await ctx.db.insert("uploads", { orgId, leadId, storageId, at: Date.now() });
  },
});

/**
 * Descarta um upload que AINDA NÃO foi salvo (ela trocou de ideia antes do
 * Salvar). Ownership pela tabela; recusa com "Imagem em uso" se o id está no
 * conteúdo salvo do lead (aí quem apaga é `saveContent`, depois de gravar).
 */
export const removeUpload = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const orgId = await requireOrgId(ctx);
    const row = await uploadRow(ctx, storageId);
    if (!row || row.orgId !== orgId) throw userError("Imagem não encontrada");
    const preview = await ctx.db
      .query("previews")
      .withIndex("by_lead", (q) => q.eq("leadId", row.leadId))
      .first();
    if (preview && imageIds(parseSiteContent(preview.content)).includes(storageId)) {
      throw userError("Imagem em uso");
    }
    await deleteUploads(ctx, orgId, [storageId]);
    return null;
  },
});

```

- [ ] **Step 4: `demo:foreignUpload` em `convex/demo.ts`**

Troque a primeira linha do arquivo:

```ts
import { mutation, query } from "./_generated/server";
```

por:

```ts
import { mutation, query, internalMutation } from "./_generated/server";
```

e acrescente no FIM do arquivo (depois de `rawPreview`):

```ts

/**
 * Só demo (spec 5): registra um storageId REAL como upload de OUTRO org, para
 * provar pela CLI que `saveContent` recusa imagem alheia com "Imagem inválida".
 * Interna: nunca entra na API do cliente. A linha e o arquivo ficam no demo
 * (sem coleta de lixo nesta rodada, spec 2.4).
 */
export const foreignUpload = internalMutation({
  args: { leadId: v.id("leads"), storageId: v.id("_storage") },
  handler: async (ctx, { leadId, storageId }) => {
    if (!isDemoEnabled()) throw userError("DEMO_MODE desligado");
    return await ctx.db.insert("uploads", { orgId: "outro", leadId, storageId, at: Date.now() });
  },
});
```

- [ ] **Step 5: Verificar**

Run: `./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json && ./node_modules/.bin/eslint convex && node --experimental-strip-types --test tests/*.test.ts 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `tsc` e `eslint` sem saída; `ℹ tests 271`, `ℹ pass 271`, `ℹ fail 0`. O `convex dev` em background aplica as funções em poucos segundos (o log dele mostra `Convex functions ready`).

- [ ] **Step 6: Commit**

```bash
git add convex/model/uploads.ts convex/previews.ts convex/demo.ts
git commit -m "$(cat <<'MSG'
feat(site): saveContent com diff de fotos e mutations de upload

generateUploadUrl, registerUpload e removeUpload (spec 2.4). saveContent
valida, exige imagem em uploads do mesmo org, grava e só depois apaga o
que saiu. demo:foreignUpload só existe para a prova do "outro org".

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 3: prova ao vivo pela CLI (modo demo)

Sem commit. Precisa dos dois servidores de pé (ver Contexto). O upload por HTTP reproduz exatamente o que `use-upload.ts` faz no navegador: `generateUploadUrl` → `POST` do arquivo → `{ storageId }` → `registerUpload`. A foto é uma das fotos padrão do repo (JPEG, 250 KB). O lead é Casa Aurora (tem preview desde o plano A); ao fim, o conteúdo dela volta ao que era.

- [ ] **Step 1: Lead, conteúdo atual e upload por HTTP**

```bash
cd /Users/madu/Developer/mine/osprano
OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/plano-b; mkdir -p "$OUT"
./node_modules/.bin/convex run leads:list '{}' > "$OUT/leads.json" 2>&1
jq -r 'map(select(.name == "Casa Aurora"))[0]._id' "$OUT/leads.json" > "$OUT/id.txt"; ID=$(cat "$OUT/id.txt"); echo "lead=$ID"
./node_modules/.bin/convex run previews:getForLead "{\"leadId\":\"$ID\"}" > "$OUT/before.json" 2>&1
jq -c '.content' "$OUT/before.json" > "$OUT/content0.json"; jq -c '{v: .version, template, hero: .heroImage, gallery}' "$OUT/content0.json"
./node_modules/.bin/convex run previews:generateUploadUrl '{}' > "$OUT/upurl1.txt" 2>&1; jq -r . "$OUT/upurl1.txt" | cut -c1-40
curl -s -X POST -H 'Content-Type: image/jpeg' --data-binary @public/templates/mesa/g1.jpg "$(jq -r . "$OUT/upurl1.txt")" > "$OUT/upload1.json"
cat "$OUT/upload1.json"; jq -r .storageId "$OUT/upload1.json" > "$OUT/sid1.txt"; echo "storageId1=$(cat "$OUT/sid1.txt")"
```

Expected: `lead=j97...`; `{"v":2,"template":"mesa","hero":null,"gallery":null}`; a URL de upload começando com `http://127.0.0.1:3210/api/storage/upload` (deployment local); `{"storageId":"kg2..."}` e `storageId1=kg2...`.

- [ ] **Step 2: Sem registro, `saveContent` recusa; registrado, salva e a query resolve a URL**

```bash
cd /Users/madu/Developer/mine/osprano
OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/plano-b; ID=$(cat "$OUT/id.txt"); SID1=$(cat "$OUT/sid1.txt")
jq -c --arg sid "$SID1" '. + {heroImage: $sid}' "$OUT/content0.json" > "$OUT/content-hero.json"
./node_modules/.bin/convex run previews:saveContent "{\"leadId\":\"$ID\",\"content\":$(cat "$OUT/content-hero.json")}" > "$OUT/save-unreg.txt" 2>&1; grep -o "Imagem inválida" "$OUT/save-unreg.txt"
./node_modules/.bin/convex run previews:registerUpload "{\"leadId\":\"$ID\",\"storageId\":\"$SID1\"}" > "$OUT/reg1.txt" 2>&1; jq -r . "$OUT/reg1.txt" | awk '{ print length }'
./node_modules/.bin/convex run previews:registerUpload "{\"leadId\":\"$ID\",\"storageId\":\"$SID1\"}" > "$OUT/reg1b.txt" 2>&1; [ "$(jq -r . "$OUT/reg1.txt")" = "$(jq -r . "$OUT/reg1b.txt")" ] && echo "registerUpload idempotente"
./node_modules/.bin/convex run previews:saveContent "{\"leadId\":\"$ID\",\"content\":$(cat "$OUT/content-hero.json")}" > "$OUT/save1.txt" 2>&1; jq -r . "$OUT/save1.txt" > "$OUT/token.txt"; TOKEN=$(cat "$OUT/token.txt"); echo "token=$TOKEN"
./node_modules/.bin/convex run previews:getForLead "{\"leadId\":\"$ID\"}" > "$OUT/after1.json" 2>&1; jq -c '{hero: .content.heroImage, heroUrl: (.images.heroUrl // "" | .[0:38]), gallery: (.images.galleryUrls | length)}' "$OUT/after1.json"
jq -r .images.heroUrl "$OUT/after1.json" > "$OUT/hero1.txt"; curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "$(cat "$OUT/hero1.txt")"
curl -s "http://localhost:3000/p/$TOKEN" > "$OUT/p1.html"; grep -c 'alt="Casa Aurora"' "$OUT/p1.html"
```

Expected: `Imagem inválida`; `32` (o id da linha de `uploads`); `registerUpload idempotente`; `token=<32 hex>` (o mesmo token do preview); `{"hero":"kg2...","heroUrl":"http://127.0.0.1:3210/api/storage/","gallery":0}`; `200 image/jpeg`; `1` (só o upload leva `alt` com o nome; as fotos padrão continuam `alt=""`).

- [ ] **Step 3: Salvar sem a foto apaga o arquivo e a linha (depois de gravar)**

```bash
cd /Users/madu/Developer/mine/osprano
OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/plano-b; ID=$(cat "$OUT/id.txt"); SID1=$(cat "$OUT/sid1.txt")
./node_modules/.bin/convex run previews:saveContent "{\"leadId\":\"$ID\",\"content\":$(cat "$OUT/content0.json")}" > "$OUT/save2.txt" 2>&1; jq -r . "$OUT/save2.txt" | cut -c1-8
./node_modules/.bin/convex run previews:getForLead "{\"leadId\":\"$ID\"}" > "$OUT/after2.json" 2>&1; jq -c '{hero: .content.heroImage, images}' "$OUT/after2.json"
curl -s -o /dev/null -w "%{http_code}\n" "$(cat "$OUT/hero1.txt")"
./node_modules/.bin/convex run previews:removeUpload "{\"storageId\":\"$SID1\"}" > "$OUT/rm1.txt" 2>&1; grep -o "Imagem não encontrada" "$OUT/rm1.txt"
```

Expected: os 8 primeiros caracteres do token; `{"hero":null,"images":{"galleryUrls":[]}}`; `404` (arquivo apagado do storage; qualquer 4xx serve); `Imagem não encontrada` (a linha de `uploads` também sumiu).

- [ ] **Step 4: Limites do servidor pela mutation**

```bash
cd /Users/madu/Developer/mine/osprano
OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/plano-b; ID=$(cat "$OUT/id.txt")
jq -c '. + {items: [range(13) | {name: "Item \(.)"}]}' "$OUT/content0.json" > "$OUT/content-13.json"
./node_modules/.bin/convex run previews:saveContent "{\"leadId\":\"$ID\",\"content\":$(cat "$OUT/content-13.json")}" > "$OUT/save13.txt" 2>&1; grep -o "Itens: no máximo 12" "$OUT/save13.txt"
jq -c '. + {hours: [{day: 1, open: "9h", close: "18:00"}]}' "$OUT/content0.json" > "$OUT/content-hh.json"
./node_modules/.bin/convex run previews:saveContent "{\"leadId\":\"$ID\",\"content\":$(cat "$OUT/content-hh.json")}" > "$OUT/savehh.txt" 2>&1; grep -o "Horário: use o formato HH:MM" "$OUT/savehh.txt"
jq -c '. + {palette: "carvao"}' "$OUT/content0.json" > "$OUT/content-pal.json"
./node_modules/.bin/convex run previews:saveContent "{\"leadId\":\"$ID\",\"content\":$(cat "$OUT/content-pal.json")}" > "$OUT/savepal.txt" 2>&1; grep -o "Paleta inválida" "$OUT/savepal.txt"
./node_modules/.bin/convex run demo:rawPreview "{\"leadId\":\"$ID\"}" > "$OUT/raw.json" 2>&1; jq -c '.content | {items, hours, palette}' "$OUT/raw.json"
```

Expected: as três mensagens (`Itens: no máximo 12`, `Horário: use o formato HH:MM`, `Paleta inválida`) e `{"items":null,"hours":null,"palette":"terracota"}` (nada foi gravado nas recusas).

- [ ] **Step 5: Upload de OUTRO org é recusado em `saveContent`, `removeUpload` e `registerUpload`**

```bash
cd /Users/madu/Developer/mine/osprano
OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/plano-b; ID=$(cat "$OUT/id.txt")
./node_modules/.bin/convex run previews:generateUploadUrl '{}' > "$OUT/upurl2.txt" 2>&1
curl -s -X POST -H 'Content-Type: image/jpeg' --data-binary @public/templates/mesa/g2.jpg "$(jq -r . "$OUT/upurl2.txt")" > "$OUT/upload2.json"; SID2=$(jq -r .storageId "$OUT/upload2.json"); echo "storageId2=$SID2"
./node_modules/.bin/convex run demo:foreignUpload "{\"leadId\":\"$ID\",\"storageId\":\"$SID2\"}" > "$OUT/foreign.txt" 2>&1; jq -r . "$OUT/foreign.txt" | awk '{ print length }'
jq -c --arg sid "$SID2" '. + {gallery: [$sid]}' "$OUT/content0.json" > "$OUT/content-foreign.json"
./node_modules/.bin/convex run previews:saveContent "{\"leadId\":\"$ID\",\"content\":$(cat "$OUT/content-foreign.json")}" > "$OUT/save-foreign.txt" 2>&1; grep -o "Imagem inválida" "$OUT/save-foreign.txt"
./node_modules/.bin/convex run previews:removeUpload "{\"storageId\":\"$SID2\"}" > "$OUT/rm-foreign.txt" 2>&1; grep -o "Imagem não encontrada" "$OUT/rm-foreign.txt"
./node_modules/.bin/convex run previews:registerUpload "{\"leadId\":\"$ID\",\"storageId\":\"$SID2\"}" > "$OUT/reg-foreign.txt" 2>&1; grep -o "Imagem inválida" "$OUT/reg-foreign.txt"
```

Expected: `storageId2=kg2...`; `32` (a linha "outro" existe); `Imagem inválida`; `Imagem não encontrada`; `Imagem inválida`. (A linha "outro" e o arquivo ficam no demo; aceito, spec 2.4.)

- [ ] **Step 6: "Imagem em uso" e descarte de upload nunca salvo**

```bash
cd /Users/madu/Developer/mine/osprano
OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/plano-b; ID=$(cat "$OUT/id.txt"); TOKEN=$(cat "$OUT/token.txt")
./node_modules/.bin/convex run previews:generateUploadUrl '{}' > "$OUT/upurl3.txt" 2>&1
curl -s -X POST -H 'Content-Type: image/jpeg' --data-binary @public/templates/mesa/g1.jpg "$(jq -r . "$OUT/upurl3.txt")" > "$OUT/upload3.json"; SID3=$(jq -r .storageId "$OUT/upload3.json")
./node_modules/.bin/convex run previews:registerUpload "{\"leadId\":\"$ID\",\"storageId\":\"$SID3\"}" > "$OUT/reg3.txt" 2>&1
jq -c --arg sid "$SID3" '. + {gallery: [$sid]}' "$OUT/content0.json" > "$OUT/content-g.json"
./node_modules/.bin/convex run previews:saveContent "{\"leadId\":\"$ID\",\"content\":$(cat "$OUT/content-g.json")}" > "$OUT/save3.txt" 2>&1
./node_modules/.bin/convex run previews:removeUpload "{\"storageId\":\"$SID3\"}" > "$OUT/rm-inuse.txt" 2>&1; grep -o "Imagem em uso" "$OUT/rm-inuse.txt"
./node_modules/.bin/convex run previews:getForLead "{\"leadId\":\"$ID\"}" > "$OUT/after3.json" 2>&1; jq -c '.images.galleryUrls | length' "$OUT/after3.json"
./node_modules/.bin/convex run previews:saveContent "{\"leadId\":\"$ID\",\"content\":$(cat "$OUT/content0.json")}" > "$OUT/save4.txt" 2>&1
./node_modules/.bin/convex run previews:getForLead "{\"leadId\":\"$ID\"}" > "$OUT/after4.json" 2>&1; jq -c '.images' "$OUT/after4.json"

./node_modules/.bin/convex run previews:generateUploadUrl '{}' > "$OUT/upurl4.txt" 2>&1
curl -s -X POST -H 'Content-Type: image/jpeg' --data-binary @public/templates/mesa/g2.jpg "$(jq -r . "$OUT/upurl4.txt")" > "$OUT/upload4.json"; SID4=$(jq -r .storageId "$OUT/upload4.json")
./node_modules/.bin/convex run previews:registerUpload "{\"leadId\":\"$ID\",\"storageId\":\"$SID4\"}" > "$OUT/reg4.txt" 2>&1
./node_modules/.bin/convex run previews:removeUpload "{\"storageId\":\"$SID4\"}" > "$OUT/rm4.txt" 2>&1; cat "$OUT/rm4.txt"
./node_modules/.bin/convex run previews:registerUpload "{\"leadId\":\"$ID\",\"storageId\":\"$SID4\"}" > "$OUT/reg4b.txt" 2>&1; grep -o "Arquivo não encontrado" "$OUT/reg4b.txt"
./node_modules/.bin/convex run previews:generate "{\"leadId\":\"$ID\"}" > "$OUT/gen.txt" 2>&1; [ "$(jq -r . "$OUT/gen.txt")" = "$TOKEN" ] && echo "token estável"
```

Expected: `Imagem em uso`; `1`; `{"galleryUrls":[]}` (salvar sem a foto apagou); `null` (o `removeUpload` de upload nunca salvo apaga e devolve null); `Arquivo não encontrado`; `token estável`. Casa Aurora volta ao conteúdo original (`content0`).


## Chunk 2: biblioteca pura do cliente e a volta ao CRM

Dois módulos puros com teste (redimensionamento e transições do estado do editor) e o `?lead=` do CRM. Ao fim da chunk: `tsc` (os dois) verde, `eslint` verde, 281 testes.

### Task 4: `src/lib/image-resize.ts` (parte pura com teste)

**Files:**
- Create: `src/lib/image-resize.ts`
- Test: `tests/image-resize.test.ts`

- [ ] **Step 1: Escrever o teste (falha)**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { ACCEPT, MAX_UPLOAD_BYTES, checkFile, targetSize } from "../src/lib/image-resize.ts";

test("image-resize: targetSize limita o lado maior, mantém a proporção e nunca amplia", () => {
  assert.deepEqual(targetSize(4000, 3000, 1600), { width: 1600, height: 1200 });
  assert.deepEqual(targetSize(3000, 4000, 1600), { width: 1200, height: 1600 });
  assert.deepEqual(targetSize(1600, 900, 1600), { width: 1600, height: 900 });
  assert.deepEqual(targetSize(800, 600, 1600), { width: 800, height: 600 });
  // panorama extremo: o lado menor arredonda mas nunca chega a zero
  assert.deepEqual(targetSize(10000, 1, 1600), { width: 1600, height: 1 });
  assert.deepEqual(targetSize(3333, 2222, 1600), { width: 1600, height: 1067 });
});

test("image-resize: checkFile recusa tipo fora de jpeg/png/webp e arquivo acima de 10 MB", () => {
  assert.equal(checkFile({ size: 1000, type: "image/jpeg" }), null);
  assert.equal(checkFile({ size: 1000, type: "image/png" }), null);
  assert.equal(checkFile({ size: 1000, type: "image/webp" }), null);
  assert.equal(checkFile({ size: MAX_UPLOAD_BYTES, type: "image/jpeg" }), null);
  assert.match(checkFile({ size: MAX_UPLOAD_BYTES + 1, type: "image/jpeg" }) ?? "", /10 MB/);
  assert.match(checkFile({ size: 1000, type: "image/gif" }) ?? "", /JPEG, PNG ou WebP/);
  assert.match(checkFile({ size: 1000, type: "image/heic" }) ?? "", /JPEG, PNG ou WebP/);
  assert.match(checkFile({ size: 1000, type: "" }) ?? "", /JPEG, PNG ou WebP/);
  // tipo errado E grande: o tipo é o primeiro motivo (nada de processar antes de recusar)
  assert.match(checkFile({ size: MAX_UPLOAD_BYTES + 1, type: "text/plain" }) ?? "", /JPEG/);
  assert.equal(ACCEPT, "image/jpeg,image/png,image/webp");
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --experimental-strip-types --test tests/image-resize.test.ts 2>&1 | grep -E "Cannot find module|ERR_MODULE_NOT_FOUND" | head -1`
Expected: uma linha com `ERR_MODULE_NOT_FOUND` (o módulo não existe).

- [ ] **Step 3: Implementar**

`resizeToJpeg` e `postToStorage` só rodam no navegador (canvas, `fetch`); ficam no mesmo arquivo porque o módulo é carregado pelo teste sem executá-las.

```ts
// Import relativo com extensão de propósito: tests/image-resize.test.ts carrega
// este arquivo em `node --experimental-strip-types`, que não lê os `paths` do
// tsconfig. `Id` entra só como tipo (some na execução).
import type { Id } from "../../convex/_generated/dataModel";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_SIDE = 1600;
export const JPEG_QUALITY = 0.82;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Valor do `accept` do `<input type="file">`. */
export const ACCEPT = ACCEPTED_TYPES.join(",");

/** Recusa antes de qualquer trabalho (spec 2.4): mensagem pt-BR, ou null quando o arquivo serve. */
export function checkFile(file: { size: number; type: string }): string | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) return "Use uma foto JPEG, PNG ou WebP";
  if (file.size > MAX_UPLOAD_BYTES) return "Foto maior que 10 MB";
  return null;
}

/** Lado maior limitado a `max`, proporção mantida, nunca amplia; inteiros, nunca zero. */
export function targetSize(w: number, h: number, max: number): { width: number; height: number } {
  const side = Math.max(w, h);
  const k = side > max ? max / side : 1;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

/**
 * Só navegador. `imageOrientation: "from-image"` aplica a rotação do EXIF (foto
 * de celular deitada). Reduz para até 1600 px no lado maior e exporta JPEG 0,82:
 * é isso que vai para o storage, seja qual for o formato de entrada.
 */
export async function resizeToJpeg(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const { width, height } = targetSize(bitmap.width, bitmap.height, MAX_SIDE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível neste navegador");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) throw new Error("Falha ao converter a foto");
    return blob;
  } finally {
    bitmap.close();
  }
}

/** POST do JPEG na URL de `previews.generateUploadUrl`; o storage responde `{ storageId }`. */
export async function postToStorage(uploadUrl: string, body: Blob): Promise<Id<"_storage">> {
  const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body });
  if (!res.ok) throw new Error(`Falha no envio (${res.status})`);
  const json = (await res.json()) as { storageId?: unknown };
  if (typeof json.storageId !== "string") throw new Error("Resposta do storage sem storageId");
  return json.storageId as Id<"_storage">;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --experimental-strip-types --test tests/*.test.ts 2>&1 | grep -E "^ℹ (tests|pass|fail)" && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/lib/image-resize.ts tests/image-resize.test.ts`
Expected: `ℹ tests 273`, `ℹ pass 273`, `ℹ fail 0`; `tsc` e `eslint` sem saída.

- [ ] **Step 5: Commit**

```bash
git add src/lib/image-resize.ts tests/image-resize.test.ts
git commit -m "$(cat <<'MSG'
feat(site): redimensionamento de foto no navegador com checagem prévia

Recusa >10 MB e tipo fora de jpeg/png/webp antes de tudo; EXIF respeitado
via createImageBitmap; até 1600 px, JPEG 0,82. targetSize e checkFile puros
e testados (spec 2.4).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 5: `src/lib/site-editor.ts` (transições puras do estado do editor)

Todo o estado do editor é um `SiteContent`; estas funções são as únicas transições. Regra: devolvem objeto novo e mantêm o JSON canônico (chave vazia some).

**Files:**
- Create: `src/lib/site-editor.ts`
- Test: `tests/site-editor.test.ts`

- [ ] **Step 1: Escrever o teste (falha)**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSiteContent, type SiteContent } from "../convex/lib/site.ts";
import type { Id } from "../convex/_generated/dataModel";
import {
  addGalleryImage,
  addItem,
  canonical,
  hoursRows,
  imageUrlMap,
  isDirty,
  removeGalleryImage,
  removeItem,
  replaceGalleryImage,
  setDay,
  setHero,
  setItem,
  setText,
  viewImages,
  withTemplate,
  WEEKDAY_ORDER,
} from "../src/lib/site-editor.ts";

const sid = (s: string) => s as Id<"_storage">;

const base = (): SiteContent => ({
  version: 2,
  template: "mesa",
  palette: "terracota",
  name: "Casa Aurora",
  city: "Lisboa",
  countryCode: "PT",
  phone: "+351 21 000 0000",
  category: "restaurant",
  rating: 4.7,
  reviewsCount: 128,
});

test("site-editor: setText grava e, com vazio, remove a chave (JSON canônico)", () => {
  const c = setText(base(), "tagline", "Sabores de casa");
  assert.equal(c.tagline, "Sabores de casa");
  const back = setText(c, "tagline", "");
  assert.equal("tagline" in back, false);
  assert.equal(isDirty(back, base()), false);
  // o original não muda (imutabilidade)
  assert.equal("tagline" in base(), false);
});

test("site-editor: isDirty ignora ordem de chaves e undefined", () => {
  const a = base();
  const b = { ...a, tagline: undefined } as SiteContent;
  assert.equal(isDirty(a, b), false);
  const reordered = JSON.parse(canonical(a)) as SiteContent;
  assert.equal(canonical({ ...reordered, name: reordered.name }), canonical(a));
  assert.equal(isDirty({ ...a, name: "Outro" }, a), true);
  assert.equal(isDirty({ ...a, items: [{ name: "x" }] }, a), true);
});

test("site-editor: withTemplate mantém os campos e só troca a paleta quando ela não é do modelo", () => {
  const c = { ...base(), tagline: "t", items: [{ name: "Bacalhau", price: "18" }] };
  const e = withTemplate(c, "estudio");
  assert.equal(e.template, "estudio");
  assert.equal(e.palette, "carvao");
  assert.equal(e.tagline, "t");
  assert.deepEqual(e.items, c.items);
  assert.equal(withTemplate(c, "mesa"), c);
  // voltar para mesa depois de ir a estúdio: a paleta é a padrão de mesa (a dela se perdeu na ida)
  assert.equal(withTemplate(e, "mesa").palette, "terracota");
  assert.doesNotThrow(() => validateSiteContent(e));
});

test("site-editor: itens até 12, preço/nota vazios somem, lista vazia some", () => {
  let c = addItem(base());
  assert.deepEqual(c.items, [{ name: "" }]);
  c = setItem(c, 0, { name: "Bacalhau à Brás", price: "18,50", note: "" });
  assert.deepEqual(c.items, [{ name: "Bacalhau à Brás", price: "18,50" }]);
  c = setItem(c, 0, { price: "" });
  assert.deepEqual(c.items, [{ name: "Bacalhau à Brás" }]);
  assert.equal(setItem(c, 5, { name: "x" }), c);
  for (let i = 0; i < 20; i++) c = addItem(c);
  assert.equal(c.items?.length, 12);
  c = removeItem(c, 0);
  assert.equal(c.items?.length, 11);
  let empty = base();
  empty = addItem(empty);
  empty = removeItem(empty, 0);
  assert.equal("items" in empty, false);
  assert.equal(removeItem(empty, 0), empty);
});

test("site-editor: horário tem 7 linhas seg a dom; setDay guarda ordenado e vazio some", () => {
  const rows = hoursRows(base());
  assert.equal(rows.length, 7);
  assert.deepEqual(rows.map((r) => r.day), [...WEEKDAY_ORDER]);
  assert.deepEqual(rows.map((r) => r.label), ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]);
  assert.ok(rows.every((r) => r.closed));

  let c = setDay(base(), 6, { open: "10:00", close: "14:00" });
  c = setDay(c, 1, { open: "09:00", close: "18:00" });
  assert.deepEqual(c.hours, [
    { day: 1, open: "09:00", close: "18:00" },
    { day: 6, open: "10:00", close: "14:00" },
  ]);
  const r = hoursRows(c);
  assert.deepEqual(r[0], { day: 1, label: "Seg", closed: false, open: "09:00", close: "18:00" });
  assert.equal(r[6].closed, true);
  c = setDay(c, 1, { open: "08:00", close: "18:00" });
  assert.equal(c.hours?.[0].open, "08:00");
  assert.equal(c.hours?.length, 2);
  c = setDay(c, 1, null);
  c = setDay(c, 6, null);
  assert.equal("hours" in c, false);
  assert.doesNotThrow(() => validateSiteContent(setDay(base(), 0, { open: "09:00", close: "18:00" })));
});

test("site-editor: hero e galeria (até 6), chave some quando vazia", () => {
  let c = setHero(base(), sid("h1"));
  assert.equal(c.heroImage, "h1");
  c = setHero(c, undefined);
  assert.equal("heroImage" in c, false);
  for (let i = 0; i < 8; i++) c = addGalleryImage(c, sid(`g${i}`));
  assert.deepEqual(c.gallery, ["g0", "g1", "g2", "g3", "g4", "g5"]);
  c = removeGalleryImage(c, 1);
  assert.deepEqual(c.gallery, ["g0", "g2", "g3", "g4", "g5"]);
  c = replaceGalleryImage(c, 0, sid("novo"));
  assert.deepEqual(c.gallery, ["novo", "g2", "g3", "g4", "g5"]);
  assert.equal(replaceGalleryImage(c, 7, sid("x")), c);
  assert.equal(removeGalleryImage(c, 9), c);
  let one = addGalleryImage(base(), sid("x"));
  one = removeGalleryImage(one, 0);
  assert.equal("gallery" in one, false);
});

test("site-editor: imageUrlMap casa hero e galeria por posição; tamanhos diferentes não casam a galeria", () => {
  const c = { ...base(), heroImage: sid("h"), gallery: [sid("a"), sid("b")] };
  assert.deepEqual(imageUrlMap(c, { heroUrl: "H", galleryUrls: ["A", "B"] }), { h: "H", a: "A", b: "B" });
  assert.deepEqual(imageUrlMap(c, { galleryUrls: ["A", "B"] }), { a: "A", b: "B" });
  assert.deepEqual(imageUrlMap(c, { heroUrl: "H", galleryUrls: ["A"] }), { h: "H" });
  assert.deepEqual(imageUrlMap(base(), { galleryUrls: [] }), {});
});

test("site-editor: viewImages resolve pelo mapa e pula id sem URL", () => {
  const c = { ...base(), heroImage: sid("h"), gallery: [sid("a"), sid("b")] };
  assert.deepEqual(viewImages(c, { h: "H", a: "A", b: "B" }), { heroUrl: "H", galleryUrls: ["A", "B"] });
  assert.deepEqual(viewImages(c, { a: "A" }), { galleryUrls: ["A"] });
  assert.deepEqual(viewImages(base(), {}), { galleryUrls: [] });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --experimental-strip-types --test tests/site-editor.test.ts 2>&1 | grep -E "ERR_MODULE_NOT_FOUND" | head -1`
Expected: uma linha com `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implementar**

```ts
// Import relativo com extensão de propósito: tests/site-editor.test.ts carrega
// este arquivo em `node --experimental-strip-types`, que não lê os `paths` do
// tsconfig. Puro: nada de React aqui. O estado do editor é um SiteContent
// inteiro (spec 3.1) e todas as transições passam por estas funções, que
// devolvem sempre um objeto novo (o React Compiler exige imutabilidade) e
// mantêm o JSON canônico: campo vazio SOME (o modelo usa o padrão; o servidor
// trata "" como não preenchido), lista vazia some, `undefined` nunca fica.
import {
  LIMITS,
  defaultPalette,
  isPaletteOf,
  type SiteContent,
  type SiteHours,
  type SiteItem,
  type TemplateId,
  type Weekday,
} from "../../convex/lib/site.ts";
import type { Id } from "../../convex/_generated/dataModel";

/** Chaves opcionais de texto do conteúdo. `name` fica fora: é obrigatório e nunca some. */
export type TextKey = "tagline" | "about" | "address" | "phone" | "whatsapp" | "instagram" | "email";

/** Define um campo de texto opcional; "" remove a chave. */
export function setText(c: SiteContent, key: TextKey, value: string): SiteContent {
  const next = { ...c };
  if (value === "") delete next[key];
  else next[key] = value;
  return next;
}

/**
 * JSON canônico: chaves em ordem alfabética em todo objeto, `undefined` fora.
 * "Alterado" = JSON diferente do salvo (spec 3.1); sem canonizar, a ordem de
 * inserção das chaves faria `{...c, tagline}` parecer diferente de `{tagline, ...c}`.
 */
export function canonical(c: SiteContent): string {
  return JSON.stringify(c, (_key, value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(entries);
  });
}

export function isDirty(draft: SiteContent, saved: SiteContent): boolean {
  return canonical(draft) !== canonical(saved);
}

/** Troca o modelo mantendo TODOS os campos (spec 3.1); a paleta cai na padrão do novo modelo quando não é dele. */
export function withTemplate(c: SiteContent, template: TemplateId): SiteContent {
  if (template === c.template) return c;
  return { ...c, template, palette: isPaletteOf(template, c.palette) ? c.palette : defaultPalette(template) };
}

/* ------------------------------------------------------------------ itens */

function withItems(c: SiteContent, items: SiteItem[]): SiteContent {
  const next = { ...c };
  if (items.length === 0) delete next.items;
  else next.items = items;
  return next;
}

/** Acrescenta um item vazio; no limite (12) devolve o mesmo objeto. */
export function addItem(c: SiteContent): SiteContent {
  const items = c.items ?? [];
  if (items.length >= LIMITS.items) return c;
  return withItems(c, [...items, { name: "" }]);
}

/** Altera nome, preço ou nota de um item; preço/nota vazios somem. */
export function setItem(c: SiteContent, index: number, patch: Partial<SiteItem>): SiteContent {
  const items = c.items ?? [];
  if (index < 0 || index >= items.length) return c;
  const merged: SiteItem = { ...items[index], ...patch };
  const item: SiteItem = { name: merged.name };
  if (merged.price) item.price = merged.price;
  if (merged.note) item.note = merged.note;
  return withItems(c, items.map((it, i) => (i === index ? item : it)));
}

export function removeItem(c: SiteContent, index: number): SiteContent {
  const items = c.items ?? [];
  if (index < 0 || index >= items.length) return c;
  return withItems(c, items.filter((_, i) => i !== index));
}

/* ---------------------------------------------------------------- horário */

/** Segunda a domingo, como o modelo renderiza (`DAY_ORDER` em shared.tsx). Índice 0 = domingo. */
export const WEEKDAY_ORDER: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];
/** Rótulos pt-BR do editor (o site usa Intl no idioma do lead; aqui quem lê é a Duda). */
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};
/** Faixa sugerida ao abrir um dia: ela vê os dois valores e ajusta; nada disso sai sem o Salvar dela. */
export const DEFAULT_OPEN = "09:00";
export const DEFAULT_CLOSE = "18:00";

export interface HoursRow {
  day: Weekday;
  label: string;
  closed: boolean;
  open: string;
  close: string;
}

/** As 7 linhas do bloco Horário (seg a dom): dia sem linha em `hours` = fechado. */
export function hoursRows(c: SiteContent): HoursRow[] {
  const byDay = new Map((c.hours ?? []).map((h) => [h.day, h]));
  return WEEKDAY_ORDER.map((day) => {
    const h = byDay.get(day);
    return h
      ? { day, label: WEEKDAY_LABELS[day], closed: false, open: h.open, close: h.close }
      : { day, label: WEEKDAY_LABELS[day], closed: true, open: "", close: "" };
  });
}

/** Define a faixa de um dia (`null` = fechado). Guarda `hours` ordenado por dia; vazio some. */
export function setDay(c: SiteContent, day: Weekday, range: { open: string; close: string } | null): SiteContent {
  const rest = (c.hours ?? []).filter((h) => h.day !== day);
  const hours: SiteHours[] = range ? [...rest, { day, open: range.open, close: range.close }] : rest;
  hours.sort((a, b) => a.day - b.day);
  const next = { ...c };
  if (hours.length === 0) delete next.hours;
  else next.hours = hours;
  return next;
}

/* ------------------------------------------------------------------ fotos */

/** Foto principal: `undefined` = "Usar padrão" (a chave some). */
export function setHero(c: SiteContent, id: Id<"_storage"> | undefined): SiteContent {
  const next = { ...c };
  if (id) next.heroImage = id;
  else delete next.heroImage;
  return next;
}

function withGallery(c: SiteContent, gallery: Id<"_storage">[]): SiteContent {
  const next = { ...c };
  if (gallery.length === 0) delete next.gallery;
  else next.gallery = gallery;
  return next;
}

/** Acrescenta à galeria; no limite (6) devolve o mesmo objeto. */
export function addGalleryImage(c: SiteContent, id: Id<"_storage">): SiteContent {
  const gallery = c.gallery ?? [];
  if (gallery.length >= LIMITS.gallery) return c;
  return withGallery(c, [...gallery, id]);
}

/** Troca a foto de um slot da galeria (o "Enviar foto" de um slot ocupado). */
export function replaceGalleryImage(c: SiteContent, index: number, id: Id<"_storage">): SiteContent {
  const gallery = c.gallery ?? [];
  if (index < 0 || index >= gallery.length) return c;
  return withGallery(c, gallery.map((g, i) => (i === index ? id : g)));
}

export function removeGalleryImage(c: SiteContent, index: number): SiteContent {
  const gallery = c.gallery ?? [];
  if (index < 0 || index >= gallery.length) return c;
  return withGallery(c, gallery.filter((_, i) => i !== index));
}

export interface ResolvedImages {
  heroUrl?: string;
  galleryUrls: string[];
}

/**
 * Mapa id → URL a partir do que `getForLead` devolveu (`images`), para o editor
 * resolver a prévia por id (ela pode trocar o hero por uma foto da galeria sem
 * salvar). `resolveImages` tira da lista os ids sem arquivo, então a galeria só
 * é casada quando os tamanhos batem; senão fica sem URL (a prévia mostra o
 * slot vazio) em vez de casar a foto errada.
 */
export function imageUrlMap(c: SiteContent, images: ResolvedImages): Record<string, string> {
  const map: Record<string, string> = {};
  if (c.heroImage && images.heroUrl) map[c.heroImage] = images.heroUrl;
  const gallery = c.gallery ?? [];
  if (gallery.length === images.galleryUrls.length) {
    gallery.forEach((id, i) => {
      map[id] = images.galleryUrls[i];
    });
  }
  return map;
}

/** As `images` da prévia ao vivo a partir do rascunho e do mapa (upload sem URL cai na foto padrão via buildSiteView). */
export function viewImages(c: SiteContent, urls: Record<string, string>): ResolvedImages {
  const heroUrl = c.heroImage ? urls[c.heroImage] : undefined;
  const galleryUrls = (c.gallery ?? []).map((id) => urls[id]).filter((u): u is string => typeof u === "string");
  return heroUrl ? { heroUrl, galleryUrls } : { galleryUrls };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --experimental-strip-types --test tests/*.test.ts 2>&1 | grep -E "^ℹ (tests|pass|fail)" && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/lib/site-editor.ts tests/site-editor.test.ts`
Expected: `ℹ tests 281`, `ℹ pass 281`, `ℹ fail 0`; `tsc` e `eslint` sem saída.

- [ ] **Step 5: Commit**

```bash
git add src/lib/site-editor.ts tests/site-editor.test.ts
git commit -m "$(cat <<'MSG'
feat(site): transições puras do estado do editor com JSON canônico

isDirty, withTemplate, setText, itens (até 12), horário (7 linhas seg a
dom), hero e galeria (até 6), mapa id para URL e imagens da prévia.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 6: `?lead=<id>` abre o drawer do CRM (`OpenLeadFromQuery` em `<Suspense>`)

`crm/page.tsx` é client component estático: `useSearchParams` sem `<Suspense>` passa no dev e quebra o `next build` (missing-suspense-with-csr-bailout). Por isso o hook vive num componente pequeno, renderizado com `fallback={null}`.

**Files:**
- Create: `src/components/crm/open-lead-from-query.tsx`
- Modify: `src/app/(app)/crm/page.tsx` (import de `Suspense`, import do componente, 4 linhas de JSX no topo do fragmento)

- [ ] **Step 1: Criar o componente**

```tsx
"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Lê `?lead=<id>` e abre o drawer (spec 3.1: o editor volta para `/crm?lead=`).
 * Vive num componente próprio porque `useSearchParams` numa página client
 * estática precisa de `<Suspense>` em volta, senão o `next build` falha
 * (missing-suspense-with-csr-bailout); a página o renderiza com fallback null.
 * O id vem cru da URL: quem valida é a página, ao procurar o lead na lista.
 */
export function OpenLeadFromQuery({ onOpen }: { onOpen: (id: Id<"leads">) => void }) {
  const params = useSearchParams();
  const lead = params.get("lead");
  useEffect(() => {
    if (lead) onOpen(lead as Id<"leads">);
  }, [lead, onOpen]);
  return null;
}
```

- [ ] **Step 2: Renderizar na página do CRM**

Em `src/app/(app)/crm/page.tsx`, três edições:

1. Troque `import { useState } from "react";` por `import { Suspense, useState } from "react";`
2. Logo depois de `import { LeadDetail } from "@/components/crm/lead-detail";` acrescente:

```ts
import { OpenLeadFromQuery } from "@/components/crm/open-lead-from-query";
```

3. Troque o início do JSX devolvido:

```tsx
  return (
    <>
      <PageHeader
        eyebrow="Pipeline"
        title="CRM"
```

por:

```tsx
  return (
    <>
      {/* `?lead=<id>` (volta do editor do site) abre o drawer; Suspense obrigatório para o build estático */}
      <Suspense fallback={null}>
        <OpenLeadFromQuery onOpen={setOpenId} />
      </Suspense>
      <PageHeader
        eyebrow="Pipeline"
        title="CRM"
```

- [ ] **Step 3: Verificar tipos, lint e o comportamento no navegador**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/components/crm/open-lead-from-query.tsx "src/app/(app)/crm/page.tsx"`
Expected: sem saída.

O drawer abrindo por `?lead=` é conferido no navegador na Task 8 (o script de captura ainda não existe). O `next build`, que é o que falharia sem o `<Suspense>`, roda na Task 13.

- [ ] **Step 4: Commit**

```bash
git add src/components/crm/open-lead-from-query.tsx "src/app/(app)/crm/page.tsx"
git commit -m "$(cat <<'MSG'
feat(crm): abrir o drawer do lead por ?lead= (volta do editor do site)

useSearchParams num componente próprio dentro de Suspense: sem isso o
next build da página estática falha.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```


## Chunk 3: o editor: blocos Modelo, Paleta e Textos, prévia ao vivo, rodapé e rota

Ao fim da chunk o editor abre em `/crm/<leadId>/site` com três blocos, prévia ao vivo, Salvar/Abrir preview/Publicar/Voltar, estado "Lead não encontrado", `generate` no mount, e a volta ao CRM abrindo o drawer. Itens, Horário, Contato e Fotos entram na chunk 4.

### Task 7: campos, blocos Modelo/Paleta e Textos, prévia ao vivo e rodapé

Cinco arquivos de apresentação sem estado próprio (só a prévia guarda o seletor Desktop/Celular e a largura medida). Compilam sozinhos; o `SiteEditor` que os usa vem na Task 8.

**Files:**
- Create: `src/components/site-editor/fields.tsx`
- Create: `src/components/site-editor/template-block.tsx`
- Create: `src/components/site-editor/texts-block.tsx`
- Create: `src/components/site-editor/live-preview.tsx`
- Create: `src/components/site-editor/editor-footer.tsx`

- [ ] **Step 1: `fields.tsx`**

```tsx
import type { ReactNode } from "react";

/** Campo dentro de vidro: sólido (regra do design system: `bg-surface-solid` em campos). */
export const inputCls =
  "w-full rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-border-strong";

/** Botão secundário pequeno dos blocos (adicionar item, enviar foto, remover). */
export const smallBtnCls =
  "inline-flex items-center gap-1 rounded-lg border border-border bg-surface-solid px-2.5 py-1.5 text-xs font-semibold hover:bg-surface-2 disabled:opacity-50";

/** Bloco do editor: vidro de primeiro nível (spec 3.1). O título segue o eyebrow do app. */
export function Block({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="glass rounded-xl p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-brand">{title}</h2>
        {hint && <span className="text-right text-[11px] text-faint">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

/** Rótulo em cima do campo; `hint` à direita (limite, formato). O `<label>` envolve o campo: clicar no texto foca. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2 text-[11px] text-muted">
        <span>{label}</span>
        {hint && <span className="text-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
```

- [ ] **Step 2: `template-block.tsx`**

```tsx
"use client";

import { TEMPLATE_IDS, defaultPalette, suggestTemplate, type SiteContent, type TemplateId } from "@convex/lib/site";
import { TEMPLATES, palettesOf } from "@/components/site-templates";
import { TemplateThumb } from "@/components/site-templates/template-thumb";
import { Badge } from "@/components/ui";
import { Block } from "./fields";

/**
 * Blocos Modelo e Paleta (spec 3.1). Cada cartão de modelo é um `div` com um
 * botão esticado por cima (`absolute inset-0`), não um `<button>` em volta da
 * miniatura: o hero renderizado tem `header`/`section`/`h1`, que não podem
 * viver dentro de um botão. Trocar de modelo mantém todos os campos
 * (`withTemplate`, no pai).
 */
export function TemplateBlock({
  draft,
  onTemplate,
  onPalette,
}: {
  draft: SiteContent;
  onTemplate: (template: TemplateId) => void;
  onPalette: (palette: string) => void;
}) {
  const suggested = suggestTemplate(draft.category);
  const name = draft.name || "Nome do negócio";
  return (
    <>
      <Block title="Modelo" hint="Trocar mantém textos e fotos">
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATE_IDS.map((id) => {
            const t = TEMPLATES[id];
            const active = draft.template === id;
            return (
              <div
                key={id}
                className={`relative rounded-xl border p-2 transition-colors ${
                  active ? "border-brand bg-brand-soft" : "border-border bg-surface-2 hover:border-border-strong"
                }`}
              >
                <TemplateThumb
                  template={id}
                  palette={active ? draft.palette : defaultPalette(id)}
                  name={name}
                  className="rounded-lg border border-border"
                />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold">{t.name}</span>
                  {id === suggested && <Badge tone="brand">Sugerido</Badge>}
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-muted">{t.description}</p>
                <button
                  type="button"
                  aria-pressed={active}
                  aria-label={`Modelo ${t.name}`}
                  onClick={() => onTemplate(id)}
                  className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                />
              </div>
            );
          })}
        </div>
      </Block>

      <Block title="Paleta">
        <div className="flex flex-wrap gap-2">
          {palettesOf(draft.template).map((p) => {
            const active = draft.palette === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => onPalette(p.id)}
                className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border bg-surface-solid text-muted hover:border-border-strong hover:text-foreground"
                }`}
              >
                <span className="relative h-5 w-8 shrink-0" aria-hidden>
                  <span
                    className="absolute left-0 top-0 h-5 w-5 rounded-full border border-black/10"
                    style={{ backgroundColor: p.bg }}
                  />
                  <span
                    className="absolute left-3 top-0 h-5 w-5 rounded-full border border-black/10"
                    style={{ backgroundColor: p.accent }}
                  />
                </span>
                {p.name}
              </button>
            );
          })}
        </div>
      </Block>
    </>
  );
}
```

- [ ] **Step 3: `texts-block.tsx`**

```tsx
"use client";

import { LIMITS, type SiteContent } from "@convex/lib/site";
import type { TemplateDict } from "@/lib/preview-i18n";
import type { TextKey } from "@/lib/site-editor";
import { Block, Field, inputCls } from "./fields";

/**
 * Bloco Textos (spec 3.1). Placeholder = o texto padrão do modelo no idioma do
 * lead (`tr`), para ela ver o que sai se deixar vazio. `maxLength` espelha os
 * limites do servidor; o servidor continua validando.
 */
export function TextsBlock({
  draft,
  tr,
  onName,
  onText,
}: {
  draft: SiteContent;
  tr: TemplateDict;
  onName: (name: string) => void;
  onText: (key: TextKey, value: string) => void;
}) {
  return (
    <Block title="Textos" hint="Vazio usa o texto padrão do modelo">
      <div className="space-y-3">
        <Field label="Nome" hint={`${draft.name.length}/${LIMITS.name}`}>
          <input
            value={draft.name}
            maxLength={LIMITS.name}
            onChange={(e) => onName(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Slogan" hint={`${(draft.tagline ?? "").length}/${LIMITS.tagline}`}>
          <input
            value={draft.tagline ?? ""}
            maxLength={LIMITS.tagline}
            placeholder={tr.tagline}
            onChange={(e) => onText("tagline", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Sobre" hint={`${(draft.about ?? "").length}/${LIMITS.about}`}>
          <textarea
            value={draft.about ?? ""}
            maxLength={LIMITS.about}
            placeholder={tr.about}
            rows={4}
            onChange={(e) => onText("about", e.target.value)}
            className={`${inputCls} resize-y`}
          />
        </Field>
      </div>
    </Block>
  );
}
```

- [ ] **Step 4: `live-preview.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { renderTemplate, type SiteView } from "@/components/site-templates";
import type { Locale } from "@/lib/preview-i18n";

const WIDTHS = { desktop: 1280, mobile: 390 } as const;
type Device = keyof typeof WIDTHS;

/**
 * Prévia ao vivo (spec 3.1): o modelo de verdade, renderizado com o estado
 * local numa largura virtual (1280 ou 390) e reduzido com CSS `zoom` para
 * caber na largura medida do contêiner (ResizeObserver, como TemplateThumb).
 * `zoom`, não `transform: scale`: o scale deixaria a caixa de layout no
 * tamanho original e criaria rolagem dupla. O site inteiro rola dentro da
 * caixa; `scrollbar-gutter: stable` evita o vaivém largura/zoom quando a barra
 * de rolagem aparece. Funciona porque os modelos usam container queries.
 */
export function LivePreview({ view, locale, className = "" }: { view: SiteView; locale: Locale; className?: string }) {
  const [device, setDevice] = useState<Device>("desktop");
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const virtual = WIDTHS[device];
  const zoom = width > 0 ? Math.min(1, width / virtual) : 0;

  return (
    <div className={`glass flex flex-col rounded-xl p-3 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-brand">Prévia ao vivo</span>
        <div className="flex gap-1" role="group" aria-label="Largura da prévia">
          {(Object.keys(WIDTHS) as Device[]).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={device === d}
              onClick={() => setDevice(d)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                device === d ? "bg-brand text-brand-fg" : "border border-border text-muted hover:text-foreground"
              }`}
            >
              {d === "desktop" ? "Desktop" : "Celular"}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={ref}
        className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-surface-2 [scrollbar-gutter:stable]"
      >
        {zoom > 0 && (
          <div style={{ width: virtual, zoom }} className="mx-auto flex flex-col">
            {renderTemplate(view, locale)}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: `editor-footer.tsx`**

```tsx
"use client";

import { MdArrowBack, MdOpenInNew } from "react-icons/md";
import type { Id } from "@convex/_generated/dataModel";
import { PublishButton } from "@/components/publish-button";

/**
 * Rodapé do editor (spec 3.1): `sticky bottom-4` DENTRO do `<main>` da área
 * logada, que é quem rola (`fixed` cobriria o rail). Salvar desabilitado sem
 * mudança; "Salvo" por 2 s; erro do servidor ao lado, estado mantido pelo pai.
 * Abrir preview é link direto: o token existe desde o `generate` do mount.
 */
export function EditorFooter({
  leadId,
  token,
  slug,
  published,
  dirty,
  saving,
  status,
  error,
  onSave,
  onBack,
}: {
  leadId: Id<"leads">;
  token: string;
  slug: string | null;
  published: boolean;
  dirty: boolean;
  saving: boolean;
  status: "idle" | "saved";
  error: string | null;
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <div className="glass-dense sticky bottom-4 z-20 mt-6 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-2"
      >
        <MdArrowBack size={16} />
        Voltar
      </button>

      <div className="min-w-0 flex-1 text-xs">
        {error ? (
          <span className="text-danger">{error}</span>
        ) : status === "saved" ? (
          <span className="font-semibold text-brand">Salvo</span>
        ) : published ? (
          <span className="text-muted">Publicado: salvar altera o site no ar</span>
        ) : dirty ? (
          <span className="text-muted">Alterações não salvas</span>
        ) : null}
      </div>

      <a
        href={`/p/${token}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-sm font-semibold hover:bg-surface-2"
      >
        Abrir preview <MdOpenInNew size={14} />
      </a>
      <PublishButton leadId={leadId} slug={slug} />
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || saving}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-brand-hover disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Salvar"}
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint --max-warnings 0 src/components/site-editor`
Expected: sem saída.

- [ ] **Step 7: Commit**

```bash
git add src/components/site-editor/fields.tsx src/components/site-editor/template-block.tsx src/components/site-editor/texts-block.tsx src/components/site-editor/live-preview.tsx src/components/site-editor/editor-footer.tsx
git commit -m "$(cat <<'MSG'
feat(site): blocos Modelo, Paleta e Textos, prévia ao vivo e rodapé do editor

Cartões de modelo com TemplateThumb e "Sugerido"; prévia com zoom e
seletor Desktop/Celular (container queries); rodapé sticky dentro do main.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 8: `SiteEditor` (casca e corpo), a rota e a primeira captura

Nesta tarefa o `site-editor.tsx` nasce sem os blocos de Itens/Horário/Contato/Fotos; a Task 11 troca o arquivo pela versão final. O resto (casca, estado, `beforeunload`, Salvar, Voltar) já é definitivo.

**Files:**
- Create: `src/components/site-editor/site-editor.tsx`
- Create: `src/app/(app)/crm/[leadId]/site/page.tsx`
- Create (fora do repo): `$OUT/shot-cdp.mjs`, `$OUT/drive-back.mjs`

- [ ] **Step 1: `site-editor.tsx` (versão desta chunk)**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import type { SiteContent } from "@convex/lib/site";
import { buildSiteView } from "@/components/site-templates";
import { EmptyState, PageHeader } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { DICTS, localeForLead } from "@/lib/preview-i18n";
import { imageUrlMap, isDirty, setText, viewImages, withTemplate } from "@/lib/site-editor";
import { TemplateBlock } from "./template-block";
import { TextsBlock } from "./texts-block";
import { LivePreview } from "./live-preview";
import { EditorFooter } from "./editor-footer";

type Preview = NonNullable<FunctionReturnType<typeof api.previews.getForLead>>;

/**
 * Editor do site (spec 3.1). Esta casca resolve o lead (id como string:
 * malformado ou de outra org vira "Lead não encontrado", sem crash), garante o
 * preview (a query nunca cria nada: com `null`, dispara `generate` UMA vez no
 * mount e a query reativa passa a devolver a linha) e só então monta o
 * `EditorBody`, que nasce com o conteúdo salvo e nunca é remontado enquanto
 * a query atualiza `published`/`openCount`.
 */
export function SiteEditor({ leadId, from }: { leadId: string; from: "crm" | "sites" }) {
  const lead = useQuery(api.leads.get, { id: leadId });
  const preview = useQuery(api.previews.getForLead, lead ? { leadId: lead._id } : "skip");
  const generate = useMutation(api.previews.generate);
  const [genError, setGenError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!lead || preview !== null || started.current) return;
    started.current = true;
    generate({ leadId: lead._id }).catch((e: unknown) => setGenError(errorMessage(e, "Falha ao preparar o site")));
  }, [lead, preview, generate]);

  const backHref = from === "sites" ? "/sites" : `/crm?lead=${leadId}`;

  if (lead === null) return <NotFound />;
  if (genError) return <p className="text-sm text-danger">{genError}</p>;
  if (lead === undefined || preview === undefined) return <p className="text-sm text-faint">Carregando…</p>;
  if (preview === null) return <p className="text-sm text-faint">Preparando o site…</p>;
  return <EditorBody key={lead._id} lead={lead} preview={preview} backHref={backHref} />;
}

function NotFound() {
  return (
    <EmptyState title="Lead não encontrado">
      O link pode estar errado ou o lead não é deste workspace.{" "}
      <Link href="/crm" className="font-semibold text-brand hover:underline">
        Voltar ao CRM
      </Link>
    </EmptyState>
  );
}

function EditorBody({ lead, preview, backHref }: { lead: Doc<"leads">; preview: Preview; backHref: string }) {
  const router = useRouter();
  const saveContent = useMutation(api.previews.saveContent);

  // Estado local: o SiteContent inteiro (spec 3.1). "Alterado" = JSON canônico diferente do salvo.
  const [draft, setDraft] = useState<SiteContent>(preview.content);
  const [saved, setSaved] = useState<SiteContent>(preview.content);
  // id → URL das fotos já salvas, resolvidas pela query (os uploads desta sessão entram na Task 11).
  const [urls] = useState<Record<string, string>>(() => imageUrlMap(preview.content, preview.images));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty = isDirty(draft, saved);
  const locale = localeForLead(draft.countryCode, draft.city);
  const tr = DICTS[locale].templates[draft.template];
  const view = buildSiteView(draft, viewImages(draft, urls));

  // Sair com mudança pede confirmação (spec 3.1). O Voltar confirma por conta própria.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // "Salvo" por 2 s.
  useEffect(() => {
    if (status !== "saved") return;
    const t = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(t);
  }, [status]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveContent({ leadId: lead._id, content: draft });
      setSaved(draft);
      setStatus("saved");
    } catch (e) {
      // Erro de validação do servidor no rodapé, estado local mantido (spec 4).
      setError(errorMessage(e, "Falha ao salvar"));
    } finally {
      setSaving(false);
    }
  }

  function back() {
    if (dirty && !window.confirm("Há alterações não salvas. Sair mesmo assim?")) return;
    router.push(backHref);
  }

  return (
    <>
      <PageHeader eyebrow="Site" title="Editor do site" subtitle={lead.city ? `${lead.name} · ${lead.city}` : lead.name} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
        <div className="order-2 space-y-4 xl:order-1">
          <TemplateBlock
            draft={draft}
            onTemplate={(t) => setDraft((c) => withTemplate(c, t))}
            onPalette={(palette) => setDraft((c) => ({ ...c, palette }))}
          />
          <TextsBlock
            draft={draft}
            tr={tr}
            onName={(name) => setDraft((c) => ({ ...c, name }))}
            onText={(key, value) => setDraft((c) => setText(c, key, value))}
          />
        </div>
        <LivePreview
          view={view}
          locale={locale}
          className="order-1 h-[70vh] xl:sticky xl:top-4 xl:order-2 xl:h-[calc(100dvh-7rem)]"
        />
      </div>
      <EditorFooter
        leadId={lead._id}
        token={preview.token}
        slug={preview.slug}
        published={preview.published}
        dirty={dirty}
        saving={saving}
        status={status}
        error={error}
        onSave={() => void save()}
        onBack={back}
      />
    </>
  );
}
```

- [ ] **Step 2: A rota**

```tsx
import { SiteEditor } from "@/components/site-editor/site-editor";

type Props = {
  params: Promise<{ leadId: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
};

/**
 * Editor do site de um lead (spec 3.1), página inteira dentro da área logada
 * (mesmo rail; o item CRM fica ativo por `pathname.startsWith("/crm/")`).
 * `params` e `searchParams` são Promises no Next 16. O id vai como string: o
 * `SiteEditor` consulta `leads.get`, que devolve null para id malformado ou de
 * outra org (estado "Lead não encontrado", sem crash).
 */
export default async function SiteEditorPage({ params, searchParams }: Props) {
  const { leadId } = await params;
  const { from } = await searchParams;
  return <SiteEditor leadId={leadId} from={from === "sites" ? "sites" : "crm"} />;
}
```

- [ ] **Step 3: Verificar tipos e lint**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint --max-warnings 0 src/components/site-editor "src/app/(app)/crm/[leadId]/site/page.tsx"`
Expected: sem saída.

- [ ] **Step 4: Script de captura por CDP**

Salve em `$OUT/shot-cdp.mjs` (fora do repo; não commitar):

```js
// Captura de tela logada (dados via websocket do Convex) sem Playwright: dirige
// o chrome-headless-shell cacheado por CDP com o WebSocket nativo do Node (24+).
// Sob --virtual-time-budget o websocket não entrega dados e a tela fica em
// "Carregando…"; aqui o tempo é real. Uso:
//   node shot-cdp.mjs <url> <png> [largura] [altura] [textoEsperado]
// Espera até 20 s o texto esperado aparecer no DOM (padrão: "Editor do site"),
// captura a página inteira e sai com código 1 se o texto nunca apareceu.
import { spawn } from "node:child_process";
import { writeFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";

const [url, out, w = "1440", h = "1000", expect = "Editor do site"] = process.argv.slice(2);
if (!url || !out) { console.error("uso: node shot-cdp.mjs <url> <png> [w] [h] [texto]"); process.exit(2); }
const cacheDir = `${homedir()}/Library/Caches/ms-playwright`;
const dir = readdirSync(cacheDir).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const bin = `${cacheDir}/${dir}/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn(bin, [
  "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--force-prefers-reduced-motion",
  `--remote-debugging-port=${port}`, `--window-size=${w},${h}`, "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets = null;
for (let i = 0; i < 50 && !targets; i++) {
  await sleep(200);
  targets = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()).catch(() => null);
}
const page = targets?.find((t) => t.type === "page");
if (!page) { chrome.kill(); console.error("chrome não subiu"); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let seq = 0;
const pending = new Map();
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
const send = (method, params = {}) =>
  new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: Number(w), height: Number(h), deviceScaleFactor: 1, mobile: Number(w) < 700 });
await send("Page.navigate", { url });
let found = false;
for (let i = 0; i < 40 && !found; i++) {
  await sleep(500);
  const r = await send("Runtime.evaluate", { expression: "document.body ? document.body.innerText : ''", returnByValue: true });
  const text = r.result?.result?.value ?? "";
  found = text.includes(expect) && !text.includes("Carregando…");
}
await sleep(1500); // fontes, fotos e miniaturas (ResizeObserver) assentam
const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
writeFileSync(out, Buffer.from(shot.result.data, "base64"));
ws.close();
chrome.kill();
console.log(`${found ? "ok" : "SEM TEXTO ESPERADO"} ${out}`);
process.exit(found ? 0 : 1);
```

- [ ] **Step 5: Ver o editor no navegador (Casa Aurora) e o estado "Lead não encontrado"**

```bash
cd /Users/madu/Developer/mine/osprano
OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/plano-b; mkdir -p "$OUT"
./node_modules/.bin/convex run leads:list '{}' > "$OUT/leads.json" 2>&1
jq -r 'map(select(.name == "Casa Aurora"))[0]._id' "$OUT/leads.json" > "$OUT/id.txt"; ID=$(cat "$OUT/id.txt"); echo "lead=$ID"
node "$OUT/shot-cdp.mjs" "http://localhost:3000/crm/$ID/site" "$OUT/editor-v1.png" 1440 1400
node "$OUT/shot-cdp.mjs" "http://localhost:3000/crm/abc/site" "$OUT/notfound.png" 1440 600 "Lead não encontrado"
```

Expected: `ok .../editor-v1.png` e `ok .../notfound.png`. Abra as duas com Read. Na primeira: cabeçalho "Editor do site / Casa Aurora · Lisboa"; à esquerda o bloco Modelo com 4 miniaturas (Mesa marcada e com a etiqueta "Sugerido"), Paleta com Terracota/Oliva/Noite, Textos com nome "Casa Aurora" e os placeholders em português europeu ("Uma mesa posta com cuidado"); à direita "Prévia ao vivo" com o site Mesa renderizado (nome, slogan padrão, nota 4,7, foto do hero); embaixo o rodapé com Voltar, Abrir preview, Publicar e Salvar desabilitado. Na segunda: o cartão "Lead não encontrado" com o link "Voltar ao CRM".

- [ ] **Step 6: `generate` no mount para um lead sem preview**

```bash
cd /Users/madu/Developer/mine/osprano
OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/plano-b
./node_modules/.bin/convex run previews:listSites '{}' > "$OUT/sites.json" 2>&1; jq -r '.[].leadId' "$OUT/sites.json" > "$OUT/with-preview.txt"
NP=$(jq -r '.[] | select(.source == "osm") | ._id' "$OUT/leads.json" | grep -v -F -f "$OUT/with-preview.txt" | head -1); echo "sem preview: $NP"
node "$OUT/shot-cdp.mjs" "http://localhost:3000/crm/$NP/site" "$OUT/editor-new.png" 1440 900
./node_modules/.bin/convex run previews:getForLead "{\"leadId\":\"$NP\"}" > "$OUT/new.json" 2>&1; jq -c '{token: (.token | length), template: .content.template, name: .content.name}' "$OUT/new.json"
```

Expected: `ok .../editor-new.png` (o editor abriu: a casca chamou `generate` uma vez e a query passou a devolver o preview) e `{"token":32,"template":"estudio"|"mesa"|...,"name":"<nome do lead>"}`. Se todos os leads do OSM já tiverem preview (`NP` vazio), pule este passo e registre no relatório.

- [ ] **Step 7: Voltar abre o drawer no CRM por `?lead=`**

Salve em `$OUT/drive-back.mjs`:

```js
// Prova do Voltar (CDP, tempo real): abre o editor, clica em Voltar, espera o
// CRM com o drawer aberto por `?lead=`, abre a aba Site e lê o link "Editar
// site". Uso: node drive-back.mjs <url-do-editor> <png>. Sai com 1 se algo
// não apareceu.
import { spawn } from "node:child_process";
import { writeFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";

const [url, out] = process.argv.slice(2);
if (!url || !out) { console.error("uso: node drive-back.mjs <url> <png>"); process.exit(2); }
const cacheDir = `${homedir()}/Library/Caches/ms-playwright`;
const dir = readdirSync(cacheDir).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const bin = `${cacheDir}/${dir}/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn(bin, [
  "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--force-prefers-reduced-motion",
  `--remote-debugging-port=${port}`, "--window-size=1440,1000", "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets = null;
for (let i = 0; i < 50 && !targets; i++) {
  await sleep(200);
  targets = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()).catch(() => null);
}
const page = targets?.find((t) => t.type === "page");
if (!page) { chrome.kill(); console.error("chrome não subiu"); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let seq = 0;
const pending = new Map();
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
const send = (method, params = {}) =>
  new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
const evalJs = async (expression) =>
  (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
const waitText = async (t) => {
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const b = await evalJs("document.body ? document.body.innerText : ''");
    if (b.includes(t) && !b.includes("Carregando…")) return true;
  }
  return false;
};

await send("Page.enable");
await send("Page.navigate", { url });
const editor = await waitText("Editor do site");
await sleep(800);
await evalJs(`[...document.querySelectorAll("button")].find((b) => b.textContent.includes("Voltar"))?.click(); true`);
const drawer = await waitText("Informações");
await sleep(800);
const href = await evalJs("location.href");
const h2 = await evalJs(`document.querySelector("h2")?.textContent ?? ""`);
await evalJs(`[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Site")?.click(); true`);
await sleep(800);
const edit = await evalJs(`[...document.querySelectorAll("a")].filter((a) => a.textContent.includes("Editar site")).map((a) => a.getAttribute("href")).join(",")`);
const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(out, Buffer.from(shot.result.data, "base64"));
ws.close();
chrome.kill();
console.log(`editor=${editor} drawer=${drawer} url=${href} h2=${h2} editar=${edit}`);
process.exit(editor && drawer && href.includes("/crm?lead=") ? 0 : 1);
```

Run: `OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/plano-b; node "$OUT/drive-back.mjs" "http://localhost:3000/crm/$(cat "$OUT/id.txt")/site" "$OUT/back.png"; echo "exit=$?"`
Expected: `editor=true drawer=true url=http://localhost:3000/crm?lead=<ID> h2=Casa Aurora editar=` (vazio: o link "Editar site" só entra na Task 12) e `exit=0`. Abra `back.png`: o CRM com o drawer de Casa Aurora aberto na aba Site.

- [ ] **Step 8: Commit**

```bash
git add src/components/site-editor/site-editor.tsx "src/app/(app)/crm/[leadId]/site/page.tsx"
git commit -m "$(cat <<'MSG'
feat(site): página do editor em /crm/[leadId]/site com prévia ao vivo

Casca resolve o lead (id como string; malformado vira "Lead não
encontrado"), dispara generate uma vez quando não há preview, e o corpo
guarda o SiteContent inteiro com Salvar, Abrir preview, Publicar e Voltar.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

## Chunk 4: Itens, Horário, Contato, Fotos e o editor final

Ao fim da chunk o editor tem os 7 blocos da spec 3.1 e o fluxo de upload completo.

### Task 9: blocos Itens, Horário e Contato

Três componentes de apresentação; entram no `SiteEditor` na Task 11.

**Files:**
- Create: `src/components/site-editor/items-block.tsx`
- Create: `src/components/site-editor/hours-block.tsx`
- Create: `src/components/site-editor/contact-block.tsx`

- [ ] **Step 1: `items-block.tsx`**

```tsx
"use client";

import { MdAdd, MdClose } from "react-icons/md";
import { LIMITS, type SiteContent, type SiteItem } from "@convex/lib/site";
import { TEMPLATES } from "@/components/site-templates";
import { Block, inputCls, smallBtnCls } from "./fields";

/**
 * Bloco Itens (spec 3.1): rótulo por modelo (Cardápio / Serviços / Destaques),
 * até 12 linhas com nome, preço (texto: moeda e formato são dela) e nota.
 * A chave é o índice: a lista é curta e os campos são controlados, então
 * remover uma linha não deixa valor preso.
 */
export function ItemsBlock({
  draft,
  onAdd,
  onChange,
  onRemove,
}: {
  draft: SiteContent;
  onAdd: () => void;
  onChange: (index: number, patch: Partial<SiteItem>) => void;
  onRemove: (index: number) => void;
}) {
  const items = draft.items ?? [];
  const label = TEMPLATES[draft.template].itemsLabel;
  return (
    <Block title={label} hint={`${items.length}/${LIMITS.items}`}>
      {items.length === 0 && (
        <p className="mb-3 text-xs text-muted">Sem itens a seção não aparece no site.</p>
      )}
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-[1fr_88px_auto] gap-2 rounded-lg bg-surface-2 p-2">
            <input
              value={it.name}
              maxLength={LIMITS.itemName}
              placeholder="Nome"
              aria-label={`Item ${i + 1}: nome`}
              onChange={(e) => onChange(i, { name: e.target.value })}
              className={inputCls}
            />
            <input
              value={it.price ?? ""}
              maxLength={LIMITS.itemPrice}
              placeholder="Preço"
              aria-label={`Item ${i + 1}: preço`}
              onChange={(e) => onChange(i, { price: e.target.value })}
              className={inputCls}
            />
            <button
              type="button"
              aria-label={`Remover item ${i + 1}`}
              onClick={() => onRemove(i)}
              className="rounded-lg p-2 text-muted hover:bg-surface-solid hover:text-foreground"
            >
              <MdClose size={16} />
            </button>
            <input
              value={it.note ?? ""}
              maxLength={LIMITS.itemNote}
              placeholder="Nota (opcional)"
              aria-label={`Item ${i + 1}: nota`}
              onChange={(e) => onChange(i, { note: e.target.value })}
              className={`${inputCls} col-span-3`}
            />
          </div>
        ))}
      </div>
      <button type="button" onClick={onAdd} disabled={items.length >= LIMITS.items} className={`${smallBtnCls} mt-3`}>
        <MdAdd size={14} />
        Adicionar item
      </button>
    </Block>
  );
}
```

- [ ] **Step 2: `hours-block.tsx`**

```tsx
"use client";

import type { SiteContent, Weekday } from "@convex/lib/site";
import { DEFAULT_CLOSE, DEFAULT_OPEN, hoursRows } from "@/lib/site-editor";
import { Block, inputCls } from "./fields";

/**
 * Bloco Horário (spec 3.1): 7 linhas, seg a dom, cada uma "Fechado" ou
 * abre/fecha. `<input type="time">` entrega "HH:MM", o formato que o servidor
 * exige. Abrir um dia sugere 09:00 a 18:00; ela ajusta e nada sai sem Salvar.
 */
export function HoursBlock({
  draft,
  onDay,
}: {
  draft: SiteContent;
  onDay: (day: Weekday, range: { open: string; close: string } | null) => void;
}) {
  const rows = hoursRows(draft);
  const any = rows.some((r) => !r.closed);
  return (
    <Block title="Horário" hint={any ? undefined : "Sem horário a seção não aparece"}>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.day} className="grid grid-cols-[44px_84px_1fr_1fr] items-center gap-2 text-sm">
            <span className="font-semibold">{r.label}</span>
            <label className="inline-flex items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={!r.closed}
                onChange={(e) =>
                  onDay(r.day, e.target.checked ? { open: DEFAULT_OPEN, close: DEFAULT_CLOSE } : null)
                }
                className="accent-brand"
              />
              {r.closed ? "Fechado" : "Aberto"}
            </label>
            <input
              type="time"
              value={r.open}
              disabled={r.closed}
              aria-label={`${r.label}: abre`}
              onChange={(e) => onDay(r.day, { open: e.target.value, close: r.close })}
              className={`${inputCls} py-1 disabled:opacity-40`}
            />
            <input
              type="time"
              value={r.close}
              disabled={r.closed}
              aria-label={`${r.label}: fecha`}
              onChange={(e) => onDay(r.day, { open: r.open, close: e.target.value })}
              className={`${inputCls} py-1 disabled:opacity-40`}
            />
          </div>
        ))}
      </div>
    </Block>
  );
}
```

- [ ] **Step 3: `contact-block.tsx`**

```tsx
"use client";

import type { SiteContent } from "@convex/lib/site";
import type { TextKey } from "@/lib/site-editor";
import { Block, Field, inputCls } from "./fields";

/**
 * Bloco Contato (spec 3.1). Pré-preenchido com o que veio do lead NA CRIAÇÃO
 * do conteúdo; depois, é o conteúdo salvo. WhatsApp só dígitos com DDI (o
 * servidor recusa outra coisa); Instagram sem @ (o @ fica fora do campo).
 */
export function ContactBlock({
  draft,
  onText,
}: {
  draft: SiteContent;
  onText: (key: TextKey, value: string) => void;
}) {
  const v = (k: TextKey) => draft[k] ?? "";
  return (
    <Block title="Contato" hint="Só o preenchido aparece">
      <div className="space-y-3">
        <Field label="Endereço" hint="Com endereço o site mostra o mapa">
          <input value={v("address")} onChange={(e) => onText("address", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Telefone">
          <input
            type="tel"
            value={v("phone")}
            onChange={(e) => onText("phone", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="WhatsApp" hint="Só dígitos com DDI, ex. 351912345678">
          <input
            inputMode="numeric"
            value={v("whatsapp")}
            placeholder="Vazio: sem botão de WhatsApp"
            onChange={(e) => onText("whatsapp", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Instagram" hint="Sem @">
          <span className="flex items-center gap-1.5">
            <span className="text-sm text-muted">@</span>
            <input value={v("instagram")} onChange={(e) => onText("instagram", e.target.value)} className={inputCls} />
          </span>
        </Field>
        <Field label="E-mail">
          <input
            type="email"
            value={v("email")}
            onChange={(e) => onText("email", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>
    </Block>
  );
}
```

- [ ] **Step 4: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint --max-warnings 0 src/components/site-editor`
Expected: sem saída.

- [ ] **Step 5: Commit**

```bash
git add src/components/site-editor/items-block.tsx src/components/site-editor/hours-block.tsx src/components/site-editor/contact-block.tsx
git commit -m "$(cat <<'MSG'
feat(site): blocos Itens, Horário e Contato do editor

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```


### Task 10: fluxo de upload (`use-upload.ts`) e bloco Fotos

**Files:**
- Create: `src/components/site-editor/use-upload.ts`
- Create: `src/components/site-editor/photos-block.tsx`

- [ ] **Step 1: `use-upload.ts`**

```ts
"use client";

import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { checkFile, postToStorage, resizeToJpeg } from "@/lib/image-resize";

export interface Uploaded {
  id: Id<"_storage">;
  /** Object URL do JPEG enviado, para a prévia ao vivo antes do Salvar (spec 2.4). Quem revoga é o editor. */
  url: string;
}

/**
 * Fluxo de upload de uma foto (spec 2.4): recusa tipo/tamanho antes de tudo,
 * redimensiona no navegador, pede a URL de upload, faz o POST e registra o
 * storageId como upload do lead. `onProgress` alimenta a barra do slot.
 * Lança com mensagem pronta para a tela; quem chama mantém a foto anterior.
 */
export function useUpload(leadId: Id<"leads">) {
  const generateUploadUrl = useMutation(api.previews.generateUploadUrl);
  const registerUpload = useMutation(api.previews.registerUpload);
  return async function upload(file: File, onProgress: (pct: number) => void): Promise<Uploaded> {
    const problem = checkFile(file);
    if (problem) throw new Error(problem);
    onProgress(10);
    const blob = await resizeToJpeg(file);
    onProgress(40);
    const uploadUrl = await generateUploadUrl({});
    const id = await postToStorage(uploadUrl, blob);
    onProgress(85);
    await registerUpload({ leadId, storageId: id });
    onProgress(100);
    return { id, url: URL.createObjectURL(blob) };
  };
}
```

- [ ] **Step 2: `photos-block.tsx`**

```tsx
"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { LIMITS, type SiteContent } from "@convex/lib/site";
import { TEMPLATES } from "@/components/site-templates";
import { ACCEPT } from "@/lib/image-resize";
import { errorMessage } from "@/lib/errors";
import { Block, smallBtnCls } from "./fields";

/** O pai faz o upload e só troca o estado no sucesso; o slot cuida de progresso e erro. */
export type SlotUpload = (file: File, onProgress: (pct: number) => void) => Promise<void>;

function PhotoSlot({
  title,
  src,
  isDefault = false,
  onFile,
  onRemove,
  removeLabel,
}: {
  title: string;
  src?: string;
  isDefault?: boolean;
  onFile: SlotUpload;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo depois de um erro
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      await onFile(file, setProgress);
    } catch (err) {
      // Foto anterior mantida (spec 4): o pai só troca o estado quando o upload inteiro deu certo.
      setError(errorMessage(err, "Falha no envio"));
    } finally {
      setProgress(null);
    }
  }

  const busy = progress !== null;
  return (
    <div className="rounded-lg bg-surface-2 p-2">
      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>{title}</span>
        {isDefault && <span className="text-faint">Padrão</span>}
      </div>
      <div className="mt-1.5 aspect-[16/10] overflow-hidden rounded-md border border-border bg-surface-solid">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- object URL local ou storage do Convex; sem ganho em next/image aqui (spec 1.4)
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-faint">Sem foto</div>
        )}
      </div>
      {busy && (
        <div
          className="mt-1.5 h-1 overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-label="Envio da foto"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="h-full bg-brand transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => void pick(e)} />
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className={smallBtnCls}>
          {busy ? "Enviando…" : "Enviar foto"}
        </button>
        {onRemove && removeLabel && (
          <button type="button" disabled={busy} onClick={onRemove} className={smallBtnCls}>
            {removeLabel}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-[11px] text-danger">{error}</p>}
    </div>
  );
}

/**
 * Bloco Fotos (spec 3.1): principal e galeria (até 6). "Usar padrão" e
 * "Remover" só mudam o estado local; nada é apagado do storage antes do Salvar
 * (spec 2.4). `urls` mapeia id → URL (object URL de upload desta sessão ou URL
 * do storage vinda da query); id sem URL mostra "Sem foto".
 */
export function PhotosBlock({
  draft,
  urls,
  onHeroFile,
  onUseDefault,
  onGalleryFile,
  onRemoveGallery,
}: {
  draft: SiteContent;
  urls: Record<string, string>;
  onHeroFile: SlotUpload;
  onUseDefault: () => void;
  onGalleryFile: (file: File, onProgress: (pct: number) => void, index?: number) => Promise<void>;
  onRemoveGallery: (index: number) => void;
}) {
  const gallery = draft.gallery ?? [];
  const heroUrl = draft.heroImage ? urls[draft.heroImage] : undefined;
  return (
    <Block title="Fotos" hint="JPEG, PNG ou WebP até 10 MB">
      <div className="space-y-3">
        <PhotoSlot
          title="Principal"
          src={heroUrl ?? TEMPLATES[draft.template].photos.hero}
          isDefault={!draft.heroImage}
          onFile={onHeroFile}
          onRemove={draft.heroImage ? onUseDefault : undefined}
          removeLabel="Usar padrão"
        />
        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-[11px] text-muted">
            <span>Galeria</span>
            <span className="text-faint">
              {gallery.length}/{LIMITS.gallery}
            </span>
          </div>
          {gallery.length === 0 && <p className="mb-2 text-xs text-muted">Sem fotos a galeria não aparece no site.</p>}
          <div className="grid grid-cols-2 gap-2">
            {gallery.map((id, i) => (
              <PhotoSlot
                key={id}
                title={`Foto ${i + 1}`}
                src={urls[id]}
                onFile={(file, onProgress) => onGalleryFile(file, onProgress, i)}
                onRemove={() => onRemoveGallery(i)}
                removeLabel="Remover"
              />
            ))}
            {gallery.length < LIMITS.gallery && (
              <PhotoSlot key="nova" title="Nova foto" onFile={(file, onProgress) => onGalleryFile(file, onProgress)} />
            )}
          </div>
        </div>
      </div>
    </Block>
  );
}
```

- [ ] **Step 3: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint --max-warnings 0 src/components/site-editor`
Expected: sem saída.

- [ ] **Step 4: Commit**

```bash
git add src/components/site-editor/use-upload.ts src/components/site-editor/photos-block.tsx
git commit -m "$(cat <<'MSG'
feat(site): bloco Fotos com upload redimensionado, progresso e erro por slot

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 11: `SiteEditor` final (todos os blocos, uploads, descarte e revogação)

Substitua `src/components/site-editor/site-editor.tsx` INTEIRO pela versão abaixo. O que muda em relação à Task 8: os quatro blocos novos entram no JSX; o corpo ganha `useUpload`, `removeUpload`, o conjunto `unsaved` (uploads desta sessão ainda não salvos), `discard`/`adopt` e os handlers de foto; os object URLs são revogados ao desmontar; Salvar tira do `unsaved` os ids que passaram a estar salvos.

**Files:**
- Modify (arquivo inteiro): `src/components/site-editor/site-editor.tsx`

- [ ] **Step 1: Escrever a versão final**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { imageIds, type SiteContent } from "@convex/lib/site";
import { buildSiteView } from "@/components/site-templates";
import { EmptyState, PageHeader } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { DICTS, localeForLead } from "@/lib/preview-i18n";
import {
  addGalleryImage,
  addItem,
  imageUrlMap,
  isDirty,
  removeGalleryImage,
  removeItem,
  replaceGalleryImage,
  setDay,
  setHero,
  setItem,
  setText,
  viewImages,
  withTemplate,
} from "@/lib/site-editor";
import { TemplateBlock } from "./template-block";
import { TextsBlock } from "./texts-block";
import { ItemsBlock } from "./items-block";
import { HoursBlock } from "./hours-block";
import { ContactBlock } from "./contact-block";
import { PhotosBlock } from "./photos-block";
import { LivePreview } from "./live-preview";
import { EditorFooter } from "./editor-footer";
import { useUpload } from "./use-upload";

type Preview = NonNullable<FunctionReturnType<typeof api.previews.getForLead>>;

/**
 * Editor do site (spec 3.1). Esta casca resolve o lead (id como string:
 * malformado ou de outra org vira "Lead não encontrado", sem crash), garante o
 * preview (a query nunca cria nada: com `null`, dispara `generate` UMA vez no
 * mount e a query reativa passa a devolver a linha) e só então monta o
 * `EditorBody`, que nasce com o conteúdo salvo e nunca é remontado enquanto
 * a query atualiza `published`/`openCount`.
 */
export function SiteEditor({ leadId, from }: { leadId: string; from: "crm" | "sites" }) {
  const lead = useQuery(api.leads.get, { id: leadId });
  const preview = useQuery(api.previews.getForLead, lead ? { leadId: lead._id } : "skip");
  const generate = useMutation(api.previews.generate);
  const [genError, setGenError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!lead || preview !== null || started.current) return;
    started.current = true;
    generate({ leadId: lead._id }).catch((e: unknown) => setGenError(errorMessage(e, "Falha ao preparar o site")));
  }, [lead, preview, generate]);

  const backHref = from === "sites" ? "/sites" : `/crm?lead=${leadId}`;

  if (lead === null) return <NotFound />;
  if (genError) return <p className="text-sm text-danger">{genError}</p>;
  if (lead === undefined || preview === undefined) return <p className="text-sm text-faint">Carregando…</p>;
  if (preview === null) return <p className="text-sm text-faint">Preparando o site…</p>;
  return <EditorBody key={lead._id} lead={lead} preview={preview} backHref={backHref} />;
}

function NotFound() {
  return (
    <EmptyState title="Lead não encontrado">
      O link pode estar errado ou o lead não é deste workspace.{" "}
      <Link href="/crm" className="font-semibold text-brand hover:underline">
        Voltar ao CRM
      </Link>
    </EmptyState>
  );
}

function EditorBody({ lead, preview, backHref }: { lead: Doc<"leads">; preview: Preview; backHref: string }) {
  const router = useRouter();
  const saveContent = useMutation(api.previews.saveContent);
  const removeUpload = useMutation(api.previews.removeUpload);
  const upload = useUpload(lead._id);

  // Estado local: o SiteContent inteiro (spec 3.1). "Alterado" = JSON canônico diferente do salvo.
  const [draft, setDraft] = useState<SiteContent>(preview.content);
  const [saved, setSaved] = useState<SiteContent>(preview.content);
  // id → URL: object URLs dos uploads desta sessão + URLs do storage que a query resolveu para o salvo.
  const [urls, setUrls] = useState<Record<string, string>>(() => imageUrlMap(preview.content, preview.images));
  // Uploads feitos aqui e ainda não salvos: só estes podem ser descartados com `removeUpload`.
  const [unsaved, setUnsaved] = useState<ReadonlySet<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty = isDirty(draft, saved);
  const locale = localeForLead(draft.countryCode, draft.city);
  const tr = DICTS[locale].templates[draft.template];
  const view = buildSiteView(draft, viewImages(draft, urls));

  // Sair com mudança pede confirmação (spec 3.1). O Voltar confirma por conta própria.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Object URLs são revogadas ao desmontar (spec 2.4); o ref guarda o mapa mais recente para o cleanup.
  const urlsRef = useRef(urls);
  useEffect(() => {
    urlsRef.current = urls;
  }, [urls]);
  useEffect(
    () => () => {
      for (const u of Object.values(urlsRef.current)) if (u.startsWith("blob:")) URL.revokeObjectURL(u);
    },
    [],
  );

  // "Salvo" por 2 s.
  useEffect(() => {
    if (status !== "saved") return;
    const t = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(t);
  }, [status]);

  /** Descarta um upload que nunca foi salvo. Id já salvo fica: quem apaga é o servidor, depois do próximo Salvar. */
  function discard(id: Id<"_storage">) {
    if (!unsaved.has(id)) return;
    setUnsaved((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    const u = urls[id];
    if (u?.startsWith("blob:")) URL.revokeObjectURL(u);
    setUrls((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    // Melhor esforço: se o servidor recusar ("Imagem em uso" ou já apagada), o arquivo fica; sem coleta nesta rodada.
    void removeUpload({ storageId: id }).catch(() => undefined);
  }

  function adopt(id: Id<"_storage">, url: string) {
    setUrls((prev) => ({ ...prev, [id]: url }));
    setUnsaved((prev) => new Set(prev).add(id));
  }

  async function onHeroFile(file: File, onProgress: (pct: number) => void) {
    const previous = draft.heroImage;
    const { id, url } = await upload(file, onProgress);
    adopt(id, url);
    setDraft((c) => setHero(c, id));
    if (previous) discard(previous);
  }

  async function onGalleryFile(file: File, onProgress: (pct: number) => void, index?: number) {
    const previous = index === undefined ? undefined : draft.gallery?.[index];
    const { id, url } = await upload(file, onProgress);
    adopt(id, url);
    setDraft((c) => (index === undefined ? addGalleryImage(c, id) : replaceGalleryImage(c, index, id)));
    if (previous) discard(previous);
  }

  function onUseDefault() {
    const previous = draft.heroImage;
    setDraft((c) => setHero(c, undefined));
    if (previous) discard(previous);
  }

  function onRemoveGallery(index: number) {
    const previous = draft.gallery?.[index];
    setDraft((c) => removeGalleryImage(c, index));
    if (previous) discard(previous);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveContent({ leadId: lead._id, content: draft });
      setSaved(draft);
      const kept = new Set<string>(imageIds(draft));
      setUnsaved((prev) => new Set(Array.from(prev).filter((id) => !kept.has(id))));
      setStatus("saved");
    } catch (e) {
      // Erro de validação do servidor no rodapé, estado local mantido (spec 4).
      setError(errorMessage(e, "Falha ao salvar"));
    } finally {
      setSaving(false);
    }
  }

  function back() {
    if (dirty && !window.confirm("Há alterações não salvas. Sair mesmo assim?")) return;
    router.push(backHref);
  }

  return (
    <>
      <PageHeader eyebrow="Site" title="Editor do site" subtitle={lead.city ? `${lead.name} · ${lead.city}` : lead.name} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
        <div className="order-2 space-y-4 xl:order-1">
          <TemplateBlock
            draft={draft}
            onTemplate={(t) => setDraft((c) => withTemplate(c, t))}
            onPalette={(palette) => setDraft((c) => ({ ...c, palette }))}
          />
          <TextsBlock
            draft={draft}
            tr={tr}
            onName={(name) => setDraft((c) => ({ ...c, name }))}
            onText={(key, value) => setDraft((c) => setText(c, key, value))}
          />
          <ItemsBlock
            draft={draft}
            onAdd={() => setDraft((c) => addItem(c))}
            onChange={(i, patch) => setDraft((c) => setItem(c, i, patch))}
            onRemove={(i) => setDraft((c) => removeItem(c, i))}
          />
          <HoursBlock draft={draft} onDay={(day, range) => setDraft((c) => setDay(c, day, range))} />
          <ContactBlock draft={draft} onText={(key, value) => setDraft((c) => setText(c, key, value))} />
          <PhotosBlock
            draft={draft}
            urls={urls}
            onHeroFile={onHeroFile}
            onUseDefault={onUseDefault}
            onGalleryFile={onGalleryFile}
            onRemoveGallery={onRemoveGallery}
          />
        </div>
        <LivePreview
          view={view}
          locale={locale}
          className="order-1 h-[70vh] xl:sticky xl:top-4 xl:order-2 xl:h-[calc(100dvh-7rem)]"
        />
      </div>
      <EditorFooter
        leadId={lead._id}
        token={preview.token}
        slug={preview.slug}
        published={preview.published}
        dirty={dirty}
        saving={saving}
        status={status}
        error={error}
        onSave={() => void save()}
        onBack={back}
      />
    </>
  );
}
```

- [ ] **Step 2: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint --max-warnings 0 src/components/site-editor && node --experimental-strip-types --test tests/*.test.ts 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: sem saída dos dois primeiros; `ℹ tests 281`, `ℹ pass 281`, `ℹ fail 0`.

- [ ] **Step 3: Ver os quatro blocos e o slot de foto no navegador**

Run: `OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/plano-b; node "$OUT/shot-cdp.mjs" "http://localhost:3000/crm/$(cat "$OUT/id.txt")/site" "$OUT/editor-full.png" 1440 2600`
Expected: `ok`. Abra a captura: depois de Textos vêm "Cardápio" (0/12, "Adicionar item"), "Horário" (7 linhas Seg a Dom, todas "Fechado"), "Contato" (endereço "Rua das Flores 12" e telefone preenchidos do lead; WhatsApp, Instagram e e-mail vazios) e "Fotos" (Principal com a foto padrão e a etiqueta "Padrão", "Enviar foto"; Galeria 0/6 com o slot "Nova foto").

- [ ] **Step 4: Commit**

```bash
git add src/components/site-editor/site-editor.tsx
git commit -m "$(cat <<'MSG'
feat(site): editor completo com fotos, descarte de upload e revogação de URLs

Nada é apagado do storage antes do Salvar: trocar ou remover foto só muda
o estado local; removeUpload só para upload desta sessão ainda não salvo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

## Chunk 5: link provisório e verificação final

### Task 12: link provisório "Editar site" no `SiteTab`

**Files:**
- Modify: `src/components/crm/lead-detail.tsx`

- [ ] **Step 1: Import**

Logo depois de `import { useEffect, useState } from "react";` (linha 3) acrescente:

```ts
import Link from "next/link";
```

- [ ] **Step 2: A classe e os dois links**

Troque:

```tsx
/* ----------------------------------------------------------------------- Site */

function SiteTab({ lead }: { lead: Doc<"leads"> }) {
```

por:

```tsx
/* ----------------------------------------------------------------------- Site */

/** Link provisório para o editor (plano B); o plano C redesenha esta aba com o resumo do modelo (spec 3.2). */
const editLinkCls =
  "inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-brand-hover";

function SiteTab({ lead }: { lead: Doc<"leads"> }) {
```

No estado sem preview, troque:

```tsx
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <GeneratePreviewButton leadId={lead._id} />
          <WhatTheyHaveButton lead={lead} />
        </div>
```

por:

```tsx
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <GeneratePreviewButton leadId={lead._id} />
          <Link href={`/crm/${lead._id}/site`} className={editLinkCls}>
            Editar site
          </Link>
          <WhatTheyHaveButton lead={lead} />
        </div>
```

No estado com preview, troque:

```tsx
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`/p/${preview.token}`}
```

por:

```tsx
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/crm/${lead._id}/site`} className={editLinkCls}>
            Editar site
          </Link>
          <a
            href={`/p/${preview.token}`}
```

- [ ] **Step 3: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/components/crm/lead-detail.tsx && OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/plano-b && node "$OUT/drive-back.mjs" "http://localhost:3000/crm/$(cat "$OUT/id.txt")/site" "$OUT/back2.png"`
Expected: sem saída dos dois primeiros; a linha `editor=true drawer=true url=http://localhost:3000/crm?lead=<ID> h2=Casa Aurora editar=/crm/<ID>/site`.

- [ ] **Step 4: Commit**

```bash
git add src/components/crm/lead-detail.tsx
git commit -m "$(cat <<'MSG'
feat(crm): link provisório "Editar site" na aba Site do drawer

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 13: verificação final, build, capturas, prova de salvar e publicar, relatório

**Files:**
- Create: `docs/redesign/editor-1440.png`, `docs/redesign/editor-390.png`
- Create (fora do repo): `$OUT/drive-save.mjs`

- [ ] **Step 1: Tudo verde**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json && ./node_modules/.bin/eslint && node --experimental-strip-types --test tests/*.test.ts 2>&1 | grep -E "^ℹ (tests|pass|fail)" && git status --short`
Expected: sem saída dos três primeiros; `ℹ tests 281`, `ℹ pass 281`, `ℹ fail 0`; árvore limpa.

- [ ] **Step 2: Build de produção**

Run: `NEXT_PUBLIC_DEMO=1 ./node_modules/.bin/next build 2>&1 | tail -25`
Expected: `✓ Compiled successfully`, a tabela de rotas com `ƒ /crm/[leadId]/site` (dinâmica) e `○ /crm` (estática: é aqui que a falta do `<Suspense>` da Task 6 quebraria com "Missing Suspense boundary with useSearchParams"). O build escreve em `.next/`, que o dev server também usa; se a tela de dev ficar estranha depois, reinicie o `next dev`.

- [ ] **Step 3: Capturas do editor em 1440 e 390**

```bash
cd /Users/madu/Developer/mine/osprano
OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/plano-b
./node_modules/.bin/convex run leads:list '{}' > "$OUT/leads.json" 2>&1
jq -r 'map(select(.name == "Casa Aurora"))[0]._id' "$OUT/leads.json" > "$OUT/id.txt"; ID=$(cat "$OUT/id.txt"); echo "lead=$ID"
node "$OUT/shot-cdp.mjs" "http://localhost:3000/crm/$ID/site" docs/redesign/editor-1440.png 1440 2600
node "$OUT/shot-cdp.mjs" "http://localhost:3000/crm/$ID/site" docs/redesign/editor-390.png 390 2400
ls -la docs/redesign/editor-*.png
```

Expected: `ok` duas vezes; dois PNGs > 100 KB. Abra os dois com Read. Em 1440: duas colunas (editor de 440 px à esquerda com os 7 blocos; prévia à direita), rodapé sticky. Em 390: uma coluna, prévia em cima (o site Desktop reduzido; o seletor "Celular" existe), blocos embaixo, rodapé em três linhas. O `main` tem altura de viewport e rola por dentro: a janela alta é o que mostra o editor inteiro.

- [ ] **Step 4: Salvar pelo editor de verdade**

Salve em `$OUT/drive-save.mjs`:

```js
// Prova de Salvar pelo editor de verdade (CDP, tempo real). Uso:
//   node drive-save.mjs <url-do-editor> <slogan> <png>
// Abre o editor, escreve o slogan, clica em Salvar, espera "Salvo" (até 10 s),
// imprime o texto de estado do rodapé e captura a tela. Sai com 1 se "Salvo"
// não apareceu (o texto impresso mostra o erro do servidor, se houver).
import { spawn } from "node:child_process";
import { writeFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";

const [url, slogan, out] = process.argv.slice(2);
if (!url || !slogan || !out) { console.error("uso: node drive-save.mjs <url> <slogan> <png>"); process.exit(2); }
const cacheDir = `${homedir()}/Library/Caches/ms-playwright`;
const dir = readdirSync(cacheDir).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const bin = `${cacheDir}/${dir}/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn(bin, [
  "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--force-prefers-reduced-motion",
  `--remote-debugging-port=${port}`, "--window-size=1440,1000", "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets = null;
for (let i = 0; i < 50 && !targets; i++) {
  await sleep(200);
  targets = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()).catch(() => null);
}
const page = targets?.find((t) => t.type === "page");
if (!page) { chrome.kill(); console.error("chrome não subiu"); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let seq = 0;
const pending = new Map();
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
const send = (method, params = {}) =>
  new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
const evalJs = async (expression) =>
  (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
const bodyText = () => evalJs("document.body ? document.body.innerText : ''");

await send("Page.enable");
await send("Page.navigate", { url });
let ready = false;
for (let i = 0; i < 40 && !ready; i++) {
  await sleep(500);
  const t = await bodyText();
  ready = t.includes("Editor do site") && !t.includes("Carregando…") && !t.includes("Preparando o site…");
}
if (!ready) { chrome.kill(); console.error("editor não carregou"); process.exit(1); }
await sleep(800);
// Campo controlado do React: o setter nativo + evento input (um `.value =` direto não dispara onChange).
await evalJs(`(() => {
  const el = document.querySelector('input[maxlength="120"]');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${JSON.stringify(slogan)});
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
})()`);
await sleep(300);
await evalJs(`[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Salvar").click(); true`);
let saved = false;
for (let i = 0; i < 20 && !saved; i++) {
  await sleep(500);
  saved = (await bodyText()).includes("Salvo");
}
const footer = await evalJs(`(() => {
  const back = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Voltar"));
  return back ? back.parentElement.innerText.replace(/\\s+/g, " ").trim() : "";
})()`);
console.log("rodapé:", footer);
const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(out, Buffer.from(shot.result.data, "base64"));
ws.close();
chrome.kill();
console.log(saved ? "ok: Salvo" : "SEM 'Salvo'");
process.exit(saved ? 0 : 1);
```

```bash
cd /Users/madu/Developer/mine/osprano
OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/plano-b; ID=$(cat "$OUT/id.txt")
node "$OUT/drive-save.mjs" "http://localhost:3000/crm/$ID/site" "Prova do plano B" "$OUT/saved.png"
./node_modules/.bin/convex run previews:getForLead "{\"leadId\":\"$ID\"}" > "$OUT/saved.json" 2>&1; jq -c '{tagline: .content.tagline, v: .content.version}' "$OUT/saved.json"; TOKEN=$(jq -r .token "$OUT/saved.json")
curl -s "http://localhost:3000/p/$TOKEN" > "$OUT/p-saved.html"; grep -c "Prova do plano B" "$OUT/p-saved.html"
# restaura: sem slogan (chave removida), como estava
jq -c '.content | del(.tagline)' "$OUT/saved.json" > "$OUT/content-restore.json"
./node_modules/.bin/convex run previews:saveContent "{\"leadId\":\"$ID\",\"content\":$(cat "$OUT/content-restore.json")}" > "$OUT/restore.txt" 2>&1; jq -r . "$OUT/restore.txt" | awk '{ print length }'
```

Expected: `rodapé: Voltar Salvo Abrir preview Publicar Salvar` e `ok: Salvo`; `{"tagline":"Prova do plano B","v":2}`; `1` ou mais (o preview público já mostra o slogan salvo); `32` (restaurado).

- [ ] **Step 5: Publicar e "salvar altera o site no ar"**

Usa Óptica Meridiano (vitrine, ES), que fica publicada no demo (cobra 1 site do plano pro, 50/mês; confira antes com `./node_modules/.bin/convex run workspaces:current '{}' > "$OUT/ws.json"; jq -c '{plan, sitesUsed, limits}' "$OUT/ws.json"`; se `sitesUsed >= limits.sites`, pule este passo e registre no relatório; NUNCA rode `demo:clear`/`demo:seed` para liberar cota).

```bash
cd /Users/madu/Developer/mine/osprano
OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/plano-b
OP=$(jq -r 'map(select(.name == "Óptica Meridiano"))[0]._id' "$OUT/leads.json"); echo "lead=$OP"
./node_modules/.bin/convex run previews:publish "{\"leadId\":\"$OP\"}" > "$OUT/pub.txt" 2>&1; SLUG=$(jq -r . "$OUT/pub.txt"); echo "slug=$SLUG"
./node_modules/.bin/convex run previews:getBySlug "{\"slug\":\"$SLUG\"}" > "$OUT/slug1.json" 2>&1; jq -c '{tagline: .content.tagline, template: .content.template}' "$OUT/slug1.json"
./node_modules/.bin/convex run previews:getForLead "{\"leadId\":\"$OP\"}" > "$OUT/op.json" 2>&1
jq -c '.content + {tagline: "Prova do plano B"}' "$OUT/op.json" > "$OUT/op-tag.json"
./node_modules/.bin/convex run previews:saveContent "{\"leadId\":\"$OP\",\"content\":$(cat "$OUT/op-tag.json")}" > "$OUT/op-save.txt" 2>&1
./node_modules/.bin/convex run previews:getBySlug "{\"slug\":\"$SLUG\"}" > "$OUT/slug2.json" 2>&1; jq -c '{tagline: .content.tagline}' "$OUT/slug2.json"
curl -s "http://localhost:3000/site/$SLUG" > "$OUT/site.html"; grep -c "Prova do plano B" "$OUT/site.html"
node "$OUT/shot-cdp.mjs" "http://localhost:3000/crm/$OP/site" "$OUT/published.png" 1440 1000 "Publicado: salvar altera o site no ar"
jq -c '.content' "$OUT/op.json" > "$OUT/op-restore.json"
./node_modules/.bin/convex run previews:saveContent "{\"leadId\":\"$OP\",\"content\":$(cat "$OUT/op-restore.json")}" > "$OUT/op-restore.txt" 2>&1; jq -r . "$OUT/op-restore.txt" | awk '{ print length }'
```

Expected: `slug=optica-meridiano-<6 hex>`; `{"tagline":null,"template":"vitrine"}`; depois do `saveContent`, `{"tagline":"Prova do plano B"}` sem republicar; `1` ou mais no HTML do site; `ok .../published.png` (o rodapé do editor mostra "Publicado: salvar altera o site no ar" e "Site publicado" no lugar de Publicar); `32` (slogan restaurado; o site continua publicado).

- [ ] **Step 6: Commit das capturas**

```bash
git add docs/redesign/editor-1440.png docs/redesign/editor-390.png
git commit -m "$(cat <<'MSG'
docs(site): capturas do editor em 1440 e 390

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

- [ ] **Step 7: Reportar**

No relatório final, inclua: os comandos de verificação com a saída (tsc x2, eslint, `pass 281`, build com `ƒ /crm/[leadId]/site`), a lista dos commits (`git log --oneline 70ae0ba..HEAD`), os dois caminhos das capturas, o resultado da Task 3 (upload por HTTP, recusa sem registro, `heroUrl` resolvida, arquivo apagado depois de salvar sem ele, item 13 recusado, "outro org" recusado, "Imagem em uso", `removeUpload` de upload nunca salvo), o resultado dos Steps 4 e 5 desta tarefa, e as observações abaixo, que a Duda precisa saber:

1. Óptica Meridiano ficou publicada no demo (1 site da cota); Casa Aurora continua só com preview. Ficaram no storage do demo: um arquivo registrado como de "outro" org (prova da Task 3) e possíveis uploads feitos no editor e não salvos; sem coleta de lixo nesta rodada (spec 2.4).
2. Os leads do OSM que você abriu no editor ganharam preview (o `generate` do mount). É o mesmo efeito de "Preparar preview".
3. Diferenças conscientes em relação ao texto da spec: mapa id → URL montado no cliente a partir de `images` (a query do plano A não mudou); o link "Editar site" aparece também no estado sem preview; `saveContent` devolve o token; a prévia em ≥ 1280 px é sticky com altura de viewport (chrome do editor, não modelo).
4. O `beforeunload` não é verificável no headless: confira no navegador de verdade no UAT do plano C (editar, tentar fechar a aba, ver o aviso).
5. Sair pelo rail (Início, Leads, Sites) com mudança não salva NÃO pede confirmação: é navegação client-side do Next, fora do `beforeunload`; só o Voltar confirma. Se ela quiser, é uma decisão para o plano C.
