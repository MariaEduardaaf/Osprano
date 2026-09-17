# Modelos de site, plano A: dados, modelos, render público e retrocompatibilidade

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Todo preview (`/p/<token>`) e site publicado (`/site/<slug>`), existente ou novo, passa a renderizar num dos 4 modelos por segmento (Mesa, Estúdio, Ofício, Vitrine) com a paleta padrão e fotos padrão, a partir de um `SiteContent` v2 salvo no preview; o conteúdo antigo é convertido na leitura; o fluxo de outreach continua intacto; nenhuma UI de edição ainda (planos B e C).

**Architecture:** Uma biblioteca pura em `convex/lib/site.ts` define o `SiteContent` (tipo + validador Convex), o modelo sugerido por categoria, as paletas válidas, o CTA primário e a conversão do formato antigo. O helper `convex/model/previews.ts` centraliza "garantir preview" (nunca sobrescreve conteúdo) e a leitura parseada com URLs do storage. Os modelos vivem em `src/components/site-templates/` (React puro, sem hooks, paleta por CSS custom properties, container queries do Tailwind v4, sem unidade de viewport) e são renderizados pelas páginas públicas, que montam o `SiteView` (upload ou foto padrão). O dicionário `src/lib/preview-i18n.ts` ganha `templates.<id>` nos 10 idiomas com a regra de honestidade travada por teste.

**Tech Stack:** Next.js 16.2 (App Router, `params` é Promise), React 19 (regras de lint do React Compiler), Tailwind v4.3 (`@container`, variantes `@md:`/`@3xl:`/`@5xl:`, cor por variável `bg-(--x)`), Convex 1.42 (file storage, `ctx.storage.getUrl` em query), `react-icons` (md e fa6), `next/font/google` (Fraunces novo, Geist e Bricolage já carregados), testes em `node --experimental-strip-types --test`. Node v24.

---

## Contexto obrigatório para quem executa

Leia antes de qualquer tarefa. Tudo aqui foi verificado no repositório em 2026-09-17 (branch `feat/modelos-de-site`, HEAD `a456bd7`). O código de cada tarefa foi compilado (`tsc`), lintado (config do repo) e testado num projeto de rascunho antes de entrar neste plano; os quatro modelos foram renderizados e fotografados em 1280 e 390 px. Copie o código como está.

### Fontes de verdade

- Spec: `docs/superpowers/specs/2026-09-17-modelos-de-site-design.md`. Este plano cobre as seções 1 (inteira), 2.1, 2.2, 2.3, 3.5, os testes de 5 que pertencem ao plano A e o rótulo do `SiteTab`. **Fora deste plano:** editor (3.1), mutations de upload (2.4, inclusive `saveContent`), resumo da aba Site, cards e página Sites (3.2 a 3.4), UAT em navegador real.
- Direção visual: `docs/superpowers/references/2026-09-17-direcao-visual-modelos.md` (inspiração de composição e tipografia; nunca copiar texto, marca ou ilustração). Onde a direção e a spec divergem, a spec vence: sem seção de equipe, depoimentos ou "anos de experiência"; seção de dado só com dado; foto padrão com `alt=""`; container queries; sem unidade de viewport; sem `sticky`/`fixed`.

### Regras que valem em toda tarefa

- **Honestidade sobre o negócio alheio.** O preview vai para um negócio que não pediu nada, com o nome real dele. Nenhum texto padrão afirma fato (horário, preço, ano, "melhor da cidade", "atendemos a região"). Horário, preço, itens e galeria só renderizam quando `SiteContent` os tem. Testes travam isso; não os afrouxe.
- **Convex nunca importa de `src/`.** Ids de paleta em `convex/lib/site.ts`; hex em `src/components/site-templates/palettes.ts`.
- **Arquivos puros carregados por teste usam import relativo com extensão `.ts`** (`../../../convex/lib/site.ts`), porque `node --experimental-strip-types` não lê `paths` do tsconfig. Componentes (`.tsx`, nunca importados por teste) usam os aliases `@/` e `@convex/`.
- **Sem travessão** (o caractere U+2014) em nada que você escrever: código, comentário, string, commit. Onde o repo já o usa, não toque.
- **Sem `pnpm <script>`** (aborta sem TTY nesta máquina). Binários direto, a partir de `/Users/madu/Developer/mine/osprano`:

```bash
./node_modules/.bin/tsc --noEmit                                  # typecheck do app (saída vazia = verde)
./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json          # typecheck do Convex (saída vazia = verde)
./node_modules/.bin/eslint                                        # lint (saída vazia = verde; warning também conta)
node --experimental-strip-types --test tests/*.test.ts            # testes (ponto de partida: "pass 235", "fail 0")
NEXT_PUBLIC_DEMO=1 ./node_modules/.bin/next build                 # build de produção (só na chunk 7)
```

Estado de partida verificado: `tsc` (os dois) verde, `eslint` verde, 235 testes passando, árvore limpa.

### Servidores de desenvolvimento

Dois processos rodam em background. Confira com `lsof -iTCP -sTCP:LISTEN -P | grep -E "3000|3210"` (espera-se `node` em 3000 e `convex-lo` em 3210/3211). Se faltar algum, suba (cada um com `run_in_background`):

```bash
cd /Users/madu/Developer/mine/osprano && ./node_modules/.bin/convex dev --tail-logs disable
cd /Users/madu/Developer/mine/osprano && NEXT_PUBLIC_DEMO=1 ./node_modules/.bin/next dev
```

O deployment local do Convex tem `DEMO_MODE=1` e `CONVEX_ENV=development` e está semeado com **37 leads reais do OSM** (categorias: barber shop, restaurant, cafe, bakery, florist). **Não rode `demo:seed`**: ele apaga esses leads e semeia 51 fictícios. O `convex dev` em background aplica mudanças de schema e de funções sozinho; depois de editar `convex/`, espere uns 5 s antes de `convex run`.

`convex run` **sempre com a saída redirecionada para arquivo** e lida com `jq` (encanar para `head` deixa o processo preso). Formato da saída: JSON (string devolvida vem entre aspas; `jq -r .` tira as aspas). Pasta de saída deste plano:

```bash
OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/plano-a; mkdir -p "$OUT"
```

### Screenshots headless (sem Playwright)

Chrome headless cacheado. As páginas públicas renderizam no servidor via `ConvexHttpClient`, então saem completas mesmo sob virtual time (ao contrário das telas logadas). Comando base:

```bash
CH=$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell | tail -1)
"$CH" --headless --no-sandbox --disable-gpu --hide-scrollbars --window-size=1280,2400 --run-all-compositor-stages-before-draw --virtual-time-budget=15000 --screenshot=<png> <url>
```

Fato verificado: `<img decoding="async">` sai em branco nessas capturas (o Chrome não conclui a decodificação sob virtual time). Por isso o componente `Photo` não usa `decoding`, e `loading="lazy"` só na galeria.

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

Não faça `git push`. Não commite em `main`.

### Mapa de arquivos deste plano

| Arquivo | Papel |
|---|---|
| `convex/lib/contrast.ts` (novo) | `contrastRatio(a, b)` WCAG 2.x |
| `convex/lib/site.ts` (novo) | `SiteContent`, validador, `PALETTE_IDS`, `suggestTemplate`, `ctaOptions`/`primaryCta`, `parseSiteContent`, `validateSiteContent`, `defaultContentForLead` |
| `convex/model/previews.ts` (novo) | `ensurePreview`, `readContent`, `resolveImages` |
| `convex/previews.ts` | queries/mutations reescritas sobre o helper |
| `convex/schema.ts` | tabela `uploads` |
| `convex/leads.ts` | `get` aceita string + `normalizeId` |
| `convex/demo.ts` | `legacyPreview` (só demo, para verificar a conversão) |
| `src/lib/preview-i18n.ts` | `templates.<id>` nos 10 idiomas; chaves do template único removidas |
| `src/app/layout.tsx` | Fraunces via `next/font/google` (`--font-fraunces`) |
| `src/components/site-templates/palettes.ts` | 12 paletas (hex) |
| `src/components/site-templates/catalog.ts` | `TEMPLATES` (puro) |
| `src/components/site-templates/shared.tsx` | raiz, CTA, itens, horário, contato, galeria, foto |
| `src/components/site-templates/{mesa,estudio,oficio,vitrine}.tsx` | os 4 modelos, cada um com `Hero` e componente completo |
| `src/components/site-templates/index.tsx` | `renderTemplate`, `renderHero`, `buildSiteView`, `sampleView`, reexports |
| `src/components/site-templates/template-thumb.tsx` | `TemplateThumb` (usado nos planos B e C) |
| `src/components/preview-site.tsx` | só ponto de entrada |
| `src/app/p/[token]/page.tsx`, `src/app/site/[slug]/page.tsx` | montam o `SiteView` |
| `src/components/crm/lead-detail.tsx`, `src/components/generate-preview-button.tsx` | rótulos |
| `public/templates/**` | 12 fotos + `LICENSES.md` |
| `tests/{contrast,site,palettes,site-catalog,site-templates-i18n,preview-i18n}.test.ts` | testes |
| `docs/redesign/templates/*.png` | 8 capturas |

Duas diferenças conscientes em relação ao texto da spec, ambas explicadas na tarefa: o catálogo `TEMPLATES` mora em `catalog.ts` (puro, testável) e é reexportado por `index.tsx` (JSX, por isso `.tsx` e não `.ts`); a variável da fonte serifada chama `--font-fraunces`, não `--font-serif`, porque o tema padrão do Tailwind v4 já define `--font-serif` e as duas colidiriam.

---


## Chunk 1: biblioteca pura (contraste e SiteContent)

Nada aqui toca o app: são dois módulos puros em `convex/lib/` com testes. Ao fim da chunk, `tsc` (os dois) verde, `eslint` verde, 250 testes.

### Task 1: `contrastRatio` WCAG (`convex/lib/contrast.ts`)

**Files:**
- Create: `convex/lib/contrast.ts`
- Test: `tests/contrast.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/contrast.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio, relativeLuminance } from "../convex/lib/contrast.ts";

const close = (a: number, b: number, eps = 0.01) => Math.abs(a - b) <= eps;

test("contrast: luminância dos extremos e do cinza médio", () => {
  assert.equal(relativeLuminance("#000000"), 0);
  assert.equal(relativeLuminance("#ffffff"), 1);
  assert.ok(close(relativeLuminance("#808080"), 0.2159, 0.001));
});

test("contrast: valores conhecidos da WCAG", () => {
  assert.equal(contrastRatio("#000000", "#ffffff"), 21);
  assert.equal(contrastRatio("#ffffff", "#ffffff"), 1);
  // Exemplo clássico: #777 sobre branco fica logo abaixo de AA (4,48).
  assert.ok(close(contrastRatio("#777777", "#ffffff"), 4.48));
  // Azul da marca (globals.css --brand) sobre branco.
  assert.ok(close(contrastRatio("#1a5ce6", "#ffffff"), 5.65));
});

test("contrast: simétrico, indiferente a maiúsculas e ao #", () => {
  assert.equal(contrastRatio("#1a5ce6", "#ffffff"), contrastRatio("#ffffff", "#1a5ce6"));
  assert.equal(contrastRatio("1A5CE6", "FFFFFF"), contrastRatio("#1a5ce6", "#ffffff"));
});

test("contrast: cor fora de #rrggbb lança", () => {
  assert.throws(() => contrastRatio("#fff", "#000000"), /Cor inválida/);
  assert.throws(() => contrastRatio("azul", "#000000"), /Cor inválida/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --experimental-strip-types --test tests/contrast.test.ts`
Expected: falha ao carregar com `ERR_MODULE_NOT_FOUND` apontando `convex/lib/contrast.ts`.

- [ ] **Step 3: Implementar**

Crie `convex/lib/contrast.ts`:

```ts
/**
 * Contraste WCAG 2.x entre duas cores hex (#rrggbb). Puro e sem dependências:
 * o teste das 12 paletas (tests/palettes.test.ts) importa daqui e de
 * src/components/site-templates/palettes.ts (spec 1.2). Não existia helper de
 * contraste no repo; este é o único.
 */
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Luminância relativa (0 = preto, 1 = branco). Aceita "#rrggbb" ou "rrggbb". */
export function relativeLuminance(hex: string): number {
  const h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`Cor inválida: ${hex}`);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Razão de contraste (1 a 21), simétrica. AA para texto normal: >= 4,5. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --experimental-strip-types --test tests/contrast.test.ts`
Expected: `ℹ tests 4`, `ℹ pass 4`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add convex/lib/contrast.ts tests/contrast.test.ts
git commit -m "$(cat <<'MSG'
feat(site): helper de contraste WCAG para validar as paletas dos modelos

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 2: `SiteContent`, sugestão de modelo, CTA, conversão e validação (`convex/lib/site.ts`)

**Files:**
- Create: `convex/lib/site.ts`
- Test: `tests/site.test.ts`

Contexto: `Id` entra só como tipo (`import type`), como em `convex/model/tenant.ts`, porque o arquivo é carregado pelos testes com `--experimental-strip-types`. O validador Convex e a interface são travados um no outro por um tipo `MutuallyAssignable` (se divergirem, `tsc` falha com `Type 'true' is not assignable to type 'false'`). A sugestão de modelo tem a tabela exata da spec 1.1 mais uma segunda chance por palavra-chave, porque a categoria gravada nem sempre é o valor do select: o Places grava `primaryType` (`barber_shop`), o seed do demo usa `barber`/`hair_salon`, e a criação manual é texto livre.

- [ ] **Step 1: Escrever os testes que falham**

Crie `tests/site.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORY_OPTIONS } from "../convex/lib/domain.ts";
import {
  TEMPLATE_IDS,
  PALETTE_IDS,
  TEMPLATE_BY_CATEGORY,
  suggestTemplate,
  defaultPalette,
  ctaOptions,
  primaryCta,
  parseSiteContent,
  validateSiteContent,
  defaultContentForLead,
  type SiteContent,
} from "../convex/lib/site.ts";

const base = (): SiteContent => ({
  version: 2,
  template: "mesa",
  palette: "terracota",
  name: "Casa Nova",
  city: "Madrid",
  countryCode: "ES",
  category: "restaurant",
  rating: 4.5,
  reviewsCount: 12,
});

test("site: toda categoria do select cai num dos 4 modelos, pela tabela", () => {
  for (const { value } of CATEGORY_OPTIONS) {
    const id = suggestTemplate(value);
    assert.ok((TEMPLATE_IDS as readonly string[]).includes(id), `${value} deu ${id}`);
    assert.equal(id, TEMPLATE_BY_CATEGORY[value] ?? "vitrine", `${value}: tabela e sugestão divergem`);
  }
});

test("site: a tabela cobre exatamente os segmentos da spec 1.1", () => {
  const by = (t: string) =>
    Object.entries(TEMPLATE_BY_CATEGORY)
      .filter(([, id]) => id === t)
      .map(([k]) => k)
      .sort();
  assert.deepEqual(by("mesa"), [
    "bakery", "bar", "cafe", "ice cream shop", "pastry shop", "pizza restaurant", "pub", "restaurant",
  ]);
  assert.deepEqual(by("estudio"), [
    "barber shop", "beauty salon", "gym", "hair salon", "nail salon", "personal trainer", "spa",
    "tattoo studio", "yoga studio",
  ]);
  assert.deepEqual(by("oficio"), [
    "car repair", "car wash", "driving school", "electrician", "locksmith", "photographer", "plumber",
  ]);
  // Vitrine é o resto: nunca entra na tabela.
  assert.deepEqual(by("vitrine"), []);
  for (const k of Object.keys(TEMPLATE_BY_CATEGORY)) {
    assert.ok(CATEGORY_OPTIONS.some((o) => o.value === k), `${k} não está em CATEGORY_OPTIONS`);
  }
});

test("site: categoria desconhecida, nula ou vazia vira vitrine", () => {
  for (const c of [null, undefined, "", "   ", "dentist", "lawyer", "pet store", "pharmacy", "xyz"]) {
    assert.equal(suggestTemplate(c), "vitrine", `${JSON.stringify(c)}`);
  }
});

test("site: formas vindas do Places e do seed também acertam o modelo", () => {
  assert.equal(suggestTemplate("barber_shop"), "estudio");
  assert.equal(suggestTemplate("hair_salon"), "estudio");
  assert.equal(suggestTemplate("barber"), "estudio");
  assert.equal(suggestTemplate("Hairdresser"), "estudio");
  assert.equal(suggestTemplate("italian_restaurant"), "mesa");
  assert.equal(suggestTemplate("Coffee shop"), "mesa");
  assert.equal(suggestTemplate("spanish restaurant"), "mesa");
  assert.equal(suggestTemplate("car_repair"), "oficio");
  assert.equal(suggestTemplate("Electrician "), "oficio");
});

test("site: cada modelo tem 3 paletas com ids únicos e a padrão é a primeira", () => {
  for (const t of TEMPLATE_IDS) {
    assert.equal(PALETTE_IDS[t].length, 3, t);
    assert.equal(new Set(PALETTE_IDS[t]).size, 3, t);
    assert.equal(defaultPalette(t), PALETTE_IDS[t][0], t);
  }
});

test("site: CTA segue a ordem whatsapp, telefone, e-mail e é null sem canal", () => {
  const all = ctaOptions({ whatsapp: "447700900123", phone: "+44 20 7946 0000", email: "hi@x.co" });
  assert.deepEqual(all, [
    { kind: "whatsapp", href: "https://wa.me/447700900123" },
    { kind: "phone", href: "tel:+442079460000" },
    { kind: "email", href: "mailto:hi@x.co" },
  ]);
  assert.deepEqual(primaryCta({ phone: "+44 20 7946 0000", email: "hi@x.co" }), {
    kind: "phone",
    href: "tel:+442079460000",
  });
  assert.deepEqual(primaryCta({ email: " hi@x.co " }), { kind: "email", href: "mailto:hi@x.co" });
  // WhatsApp NUNCA é derivado do telefone: sem o campo, não existe o canal.
  assert.equal(primaryCta({ phone: "+44 20 7946 0000" })?.kind, "phone");
  assert.equal(primaryCta({}), null);
  assert.equal(primaryCta({ whatsapp: "", phone: "  ", email: "" }), null);
});

test("site: o formato antigo (sem version) vira v2 com modelo sugerido e paleta padrão", () => {
  const legacy = {
    name: "Sharp Cuts",
    category: "barber shop",
    city: "London",
    phone: "+44 1",
    rating: 4.2,
    reviewsCount: 30,
    countryCode: "GB",
  };
  const c = parseSiteContent(legacy);
  assert.equal(c.version, 2);
  assert.equal(c.template, "estudio");
  assert.equal(c.palette, "carvao");
  assert.equal(c.name, "Sharp Cuts");
  assert.equal(c.phone, "+44 1");
  assert.equal(c.city, "London");
  assert.equal(c.rating, 4.2);
  assert.equal(c.reviewsCount, 30);
  assert.equal(c.countryCode, "GB");
  for (const k of ["whatsapp", "instagram", "email", "items", "hours", "tagline", "about"]) {
    assert.equal(k in c, false, `${k} deveria estar ausente`);
  }
  // `phone: null` no formato antigo vira campo ausente, não "null".
  assert.equal("phone" in parseSiteContent({ ...legacy, phone: null }), false);
});

test("site: conteúdo nulo ou corrompido vira o mínimo em vez de lançar", () => {
  for (const raw of [null, undefined, "x", 12, [], {}, { name: 5 }, { version: 2 }]) {
    const c = parseSiteContent(raw);
    assert.equal(c.version, 2, JSON.stringify(raw));
    assert.equal(c.template, "vitrine");
    assert.equal(c.palette, "areia");
    assert.equal(c.name, "");
    assert.equal(c.city, null);
  }
});

test("site: v2 passa inteiro; modelo, paleta e listas inválidos caem no padrão", () => {
  const full: SiteContent = {
    ...base(),
    tagline: "t",
    about: "a",
    items: [{ name: "Café", price: "2" }],
    hours: [{ day: 1, open: "09:00", close: "18:00" }],
    address: "Rua 1",
    whatsapp: "34600000000",
    instagram: "casanova",
    email: "x@y.z",
  };
  assert.deepEqual(parseSiteContent(full), full);

  const bad = parseSiteContent({ ...full, template: "banana", palette: "xyz" });
  assert.equal(bad.template, "mesa"); // pela categoria "restaurant"
  assert.equal(bad.palette, "terracota");
  // "carvao" existe, mas é do estudio: paleta de outro modelo cai na padrão.
  assert.equal(parseSiteContent({ ...full, palette: "carvao" }).palette, "terracota");

  const junk = parseSiteContent({
    ...full,
    items: [{ name: "ok" }, { price: "1" }, "x"],
    hours: [{ day: 9, open: "1", close: "2" }],
  });
  assert.deepEqual(junk.items, [{ name: "ok" }]);
  assert.deepEqual(junk.hours, []);
});

test("site: validateSiteContent aplica os limites da spec 2.1", () => {
  assert.doesNotThrow(() => validateSiteContent(base()));
  const item = (i: number) => ({ name: `Item ${i}` });
  assert.doesNotThrow(() =>
    validateSiteContent({ ...base(), items: Array.from({ length: 12 }, (_, i) => item(i)) }),
  );
  assert.throws(
    () => validateSiteContent({ ...base(), items: Array.from({ length: 13 }, (_, i) => item(i)) }),
    /Itens: no máximo 12/,
  );
  assert.throws(() => validateSiteContent({ ...base(), name: "  " }), /Nome/);
  assert.throws(() => validateSiteContent({ ...base(), name: "x".repeat(81) }), /Nome/);
  assert.throws(() => validateSiteContent({ ...base(), tagline: "x".repeat(121) }), /Slogan/);
  assert.throws(() => validateSiteContent({ ...base(), about: "x".repeat(1201) }), /Sobre/);
  assert.throws(() => validateSiteContent({ ...base(), items: [{ name: "x".repeat(61) }] }), /Item: nome/);
  assert.throws(
    () => validateSiteContent({ ...base(), items: [{ name: "ok", price: "x".repeat(21) }] }),
    /preço/,
  );
  assert.throws(
    () => validateSiteContent({ ...base(), items: [{ name: "ok", note: "x".repeat(81) }] }),
    /nota/,
  );
  assert.throws(
    () =>
      validateSiteContent({
        ...base(),
        hours: [
          { day: 1, open: "09:00", close: "18:00" },
          { day: 1, open: "09:00", close: "12:00" },
        ],
      }),
    /uma linha por dia/,
  );
  assert.throws(
    () => validateSiteContent({ ...base(), hours: [{ day: 1, open: "9h", close: "18:00" }] }),
    /HH:MM/,
  );
  assert.throws(
    () => validateSiteContent({ ...base(), hours: [{ day: 1, open: "09:00", close: "24:00" }] }),
    /HH:MM/,
  );
  const gallery = Array(7).fill("kg2abc") as unknown as SiteContent["gallery"];
  assert.throws(() => validateSiteContent({ ...base(), gallery }), /Galeria/);
  assert.throws(() => validateSiteContent({ ...base(), instagram: "@casa" }), /Instagram/);
  assert.throws(() => validateSiteContent({ ...base(), instagram: "instagram.com/casa" }), /Instagram/);
  assert.throws(() => validateSiteContent({ ...base(), whatsapp: "+34 600" }), /WhatsApp/);
  assert.throws(() => validateSiteContent({ ...base(), whatsapp: "1234567" }), /WhatsApp/);
  assert.throws(() => validateSiteContent({ ...base(), email: "semarroba" }), /E-mail/);
  assert.throws(() => validateSiteContent({ ...base(), palette: "carvao" }), /Paleta/);
  // Campo vazio é "não preenchido", não erro: o editor manda "" para o que ela limpou.
  assert.doesNotThrow(() =>
    validateSiteContent({
      ...base(),
      tagline: "",
      about: "",
      whatsapp: "",
      instagram: "",
      email: "",
      items: [],
      hours: [],
    }),
  );
});

test("site: defaultContentForLead só alimenta o que o lead tem e deixa os canais vazios", () => {
  const c = defaultContentForLead({
    name: "  QuickFix Plumbing ",
    category: "plumber",
    city: "Leeds",
    countryCode: "GB",
    phone: "+44 113 000",
    address: "1 High St",
    rating: 4.8,
    reviewsCount: 51,
  });
  assert.equal(c.version, 2);
  assert.equal(c.template, "oficio");
  assert.equal(c.palette, "laranja");
  assert.equal(c.name, "QuickFix Plumbing");
  assert.equal(c.phone, "+44 113 000");
  assert.equal(c.address, "1 High St");
  assert.equal(c.city, "Leeds");
  assert.equal(c.countryCode, "GB");
  assert.equal(c.rating, 4.8);
  assert.equal(c.reviewsCount, 51);
  assert.equal(c.category, "plumber");
  for (const k of ["whatsapp", "instagram", "email", "tagline", "about", "items", "hours", "heroImage", "gallery"]) {
    assert.equal(k in c, false, `${k} deveria estar ausente`);
  }
  assert.doesNotThrow(() => validateSiteContent(c));

  const bare = defaultContentForLead({ name: "X", countryCode: "NL" });
  assert.equal(bare.template, "vitrine");
  assert.equal(bare.palette, "areia");
  assert.equal(bare.city, null);
  assert.equal(bare.category, null);
  assert.equal(bare.rating, null);
  assert.equal("phone" in bare, false);
  assert.equal("address" in bare, false);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --experimental-strip-types --test tests/site.test.ts`
Expected: falha ao carregar com `ERR_MODULE_NOT_FOUND` apontando `convex/lib/site.ts`.

- [ ] **Step 3: Implementar**

Crie `convex/lib/site.ts`:

```ts
/**
 * Conteúdo do site/prévia de um lead (spec 2.1) e as regras puras em volta:
 * modelo sugerido pela categoria, paletas válidas, CTA primário, conversão do
 * formato antigo e limites de validação.
 *
 * Puro de propósito: só `convex/values` (validador) e `./errors.ts`. É importado
 * de `src/` (alias `@convex/lib/site`) e dos testes, que rodam em
 * `node --experimental-strip-types` e exigem import relativo com extensão. `Id`
 * entra só como tipo, como em convex/model/tenant.ts: `import type` some na
 * execução. Convex nunca importa de `src/`: os hex das paletas ficam lá, os ids
 * ficam aqui.
 */
import { v, type Infer } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { userError } from "./errors.ts";

export const TEMPLATE_IDS = ["mesa", "estudio", "oficio", "vitrine"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export function isTemplateId(x: unknown): x is TemplateId {
  return typeof x === "string" && (TEMPLATE_IDS as readonly string[]).includes(x);
}

/** Ids das 3 paletas de cada modelo (spec 1.2). A primeira é a padrão. */
export const PALETTE_IDS = {
  mesa: ["terracota", "oliva", "noite"],
  estudio: ["carvao", "rosa", "marinho"],
  oficio: ["laranja", "azul", "verde"],
  vitrine: ["areia", "nevoa", "vinho"],
} as const satisfies Record<TemplateId, readonly string[]>;

export type PaletteId<T extends TemplateId = TemplateId> = (typeof PALETTE_IDS)[T][number];

export function defaultPalette(template: TemplateId): PaletteId {
  return PALETTE_IDS[template][0];
}

export function isPaletteOf(template: TemplateId, id: unknown): id is PaletteId {
  return typeof id === "string" && (PALETTE_IDS[template] as readonly string[]).includes(id);
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Preço como texto ("12,50", "a partir de 30"): moeda e formato são dela. */
export interface SiteItem {
  name: string;
  price?: string;
  note?: string;
}

/** "09:00". Dia sem linha = fechado ou não informado. */
export interface SiteHours {
  day: Weekday;
  open: string;
  close: string;
}

export interface SiteContent {
  version: 2;
  template: TemplateId;
  palette: string;
  name: string;
  tagline?: string; // vazio: padrão do modelo no idioma
  about?: string; // vazio: padrão do modelo
  items?: SiteItem[]; // máx. 12
  hours?: SiteHours[];
  address?: string;
  city: string | null;
  countryCode: string;
  phone?: string;
  whatsapp?: string; // só dígitos com DDI ("447700900123"); vazio por padrão
  instagram?: string; // handle sem @
  email?: string;
  heroImage?: Id<"_storage">; // ausente: foto padrão do modelo
  gallery?: Id<"_storage">[]; // máx. 6
  category: string | null;
  rating: number | null;
  reviewsCount: number | null;
}

const weekday = v.union(
  v.literal(0),
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(4),
  v.literal(5),
  v.literal(6),
);

export const siteContentValidator = v.object({
  version: v.literal(2),
  template: v.union(v.literal("mesa"), v.literal("estudio"), v.literal("oficio"), v.literal("vitrine")),
  palette: v.string(),
  name: v.string(),
  tagline: v.optional(v.string()),
  about: v.optional(v.string()),
  items: v.optional(
    v.array(v.object({ name: v.string(), price: v.optional(v.string()), note: v.optional(v.string()) })),
  ),
  hours: v.optional(v.array(v.object({ day: weekday, open: v.string(), close: v.string() }))),
  address: v.optional(v.string()),
  city: v.union(v.string(), v.null()),
  countryCode: v.string(),
  phone: v.optional(v.string()),
  whatsapp: v.optional(v.string()),
  instagram: v.optional(v.string()),
  email: v.optional(v.string()),
  heroImage: v.optional(v.id("_storage")),
  gallery: v.optional(v.array(v.id("_storage"))),
  category: v.union(v.string(), v.null()),
  rating: v.union(v.number(), v.null()),
  reviewsCount: v.union(v.number(), v.null()),
});

/** Trava de compilação: validador e interface não podem divergir (atribuíveis nos dois sentidos). */
type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export const siteContentValidatorMatches: MutuallyAssignable<
  Infer<typeof siteContentValidator>,
  SiteContent
> = true;

/** Categoria (valores de CATEGORY_OPTIONS, spec 1.1) para modelo. Tudo o mais é vitrine. */
export const TEMPLATE_BY_CATEGORY: Record<string, TemplateId> = {
  restaurant: "mesa",
  cafe: "mesa",
  bar: "mesa",
  pub: "mesa",
  "pizza restaurant": "mesa",
  bakery: "mesa",
  "pastry shop": "mesa",
  "ice cream shop": "mesa",
  "barber shop": "estudio",
  "hair salon": "estudio",
  "beauty salon": "estudio",
  "nail salon": "estudio",
  spa: "estudio",
  "tattoo studio": "estudio",
  gym: "estudio",
  "personal trainer": "estudio",
  "yoga studio": "estudio",
  plumber: "oficio",
  electrician: "oficio",
  locksmith: "oficio",
  "car repair": "oficio",
  "car wash": "oficio",
  "driving school": "oficio",
  photographer: "oficio",
};

/**
 * Segunda chance por palavra-chave: a categoria gravada nem sempre é o valor do
 * select. O Places grava `primaryType` ("barber_shop", "italian_restaurant"), o
 * seed do demo usa "barber" e "hair_salon", e a criação manual é texto livre.
 * A ordem importa (mesa antes de estudio: "spanish restaurant" não é spa).
 */
const KEYWORDS: [RegExp, TemplateId][] = [
  [/restaurant|caf[eé]|coffee|\bbar\b|\bpub\b|bakery|pastry|ice ?cream|pizza|bistro|brasserie|diner/, "mesa"],
  [/barber|hair|salon|beauty|nail|\bspa\b|tattoo|\bgym\b|fitness|yoga|massage|trainer/, "estudio"],
  [/plumb|electric|locksmith|car ?repair|car ?wash|mechanic|garage|driving|photograph/, "oficio"],
];

/** Modelo sugerido pela categoria do lead. Desconhecida, nula ou vazia: vitrine. */
export function suggestTemplate(category: string | null | undefined): TemplateId {
  if (!category) return "vitrine";
  const key = category.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (!key) return "vitrine";
  const exact = TEMPLATE_BY_CATEGORY[key];
  if (exact) return exact;
  for (const [re, id] of KEYWORDS) if (re.test(key)) return id;
  return "vitrine";
}

export type SiteCtaKind = "whatsapp" | "phone" | "email";
export interface SiteCta {
  kind: SiteCtaKind;
  href: string;
}

/**
 * Canais disponíveis na ordem da spec 1.6: WhatsApp (só se ela preencheu; nunca
 * derivado do telefone), telefone, e-mail. Vazio = sem botão nenhum.
 */
export function ctaOptions(c: Pick<SiteContent, "whatsapp" | "phone" | "email">): SiteCta[] {
  const out: SiteCta[] = [];
  const wa = c.whatsapp?.replace(/\D/g, "") ?? "";
  if (wa) out.push({ kind: "whatsapp", href: `https://wa.me/${wa}` });
  const phone = c.phone?.trim() ?? "";
  if (phone) out.push({ kind: "phone", href: `tel:${phone.replace(/\s+/g, "")}` });
  const email = c.email?.trim() ?? "";
  if (email) out.push({ kind: "email", href: `mailto:${email}` });
  return out;
}

/** CTA primário do hero (spec 1.6): o primeiro canal que existir, ou null. */
export function primaryCta(c: Pick<SiteContent, "whatsapp" | "phone" | "email">): SiteCta | null {
  return ctaOptions(c)[0] ?? null;
}

/** Mínimo que a página consegue renderizar; o chamador troca o nome pelo do lead quando o tem. */
export function minimalContent(): SiteContent {
  return {
    version: 2,
    template: "vitrine",
    palette: defaultPalette("vitrine"),
    name: "",
    city: null,
    countryCode: "GB",
    category: null,
    rating: null,
    reviewsCount: null,
  };
}

function str(x: unknown): string | undefined {
  return typeof x === "string" ? x : undefined;
}

function num(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function opt<K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } {
  return value === undefined ? {} : ({ [key]: value } as { [P in K]?: V });
}

function isItem(x: unknown): x is SiteItem {
  return !!x && typeof x === "object" && typeof (x as SiteItem).name === "string";
}

function isHours(x: unknown): x is SiteHours {
  if (!x || typeof x !== "object") return false;
  const h = x as SiteHours;
  return (
    typeof h.day === "number" &&
    Number.isInteger(h.day) &&
    h.day >= 0 &&
    h.day <= 6 &&
    typeof h.open === "string" &&
    typeof h.close === "string"
  );
}

/**
 * Lê `previews.content` (v.any()) e devolve sempre um SiteContent v2:
 * - formato antigo (PreviewContent, sem `version`): converte (modelo sugerido
 *   pela categoria, paleta padrão, canais e campos novos ausentes);
 * - nulo ou corrompido: o mínimo (vitrine, nome vazio). Nunca lança: uma
 *   query lançando derruba o drawer inteiro (spec 2.1).
 */
export function parseSiteContent(raw: unknown): SiteContent {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return minimalContent();
  const r = raw as Record<string, unknown>;
  const name = str(r.name);
  if (name === undefined) return minimalContent();

  const category = str(r.category) ?? null;
  const phone = str(r.phone);
  const shared = {
    name,
    city: str(r.city) ?? null,
    countryCode: str(r.countryCode) || "GB",
    ...opt("phone", phone),
    category,
    rating: num(r.rating),
    reviewsCount: num(r.reviewsCount),
  };

  if (r.version !== 2) {
    // Formato antigo: só os campos do lead. Nenhum job de migração (spec 4); a
    // primeira gravação do editor já salva v2.
    const template = suggestTemplate(category);
    return { version: 2, template, palette: defaultPalette(template), ...shared };
  }

  const template = isTemplateId(r.template) ? r.template : suggestTemplate(category);
  const items = Array.isArray(r.items) ? r.items.filter(isItem) : undefined;
  const hours = Array.isArray(r.hours) ? r.hours.filter(isHours) : undefined;
  const gallery = Array.isArray(r.gallery)
    ? r.gallery.filter((g): g is Id<"_storage"> => typeof g === "string")
    : undefined;
  return {
    version: 2,
    template,
    palette: isPaletteOf(template, r.palette) ? r.palette : defaultPalette(template),
    ...shared,
    ...opt("tagline", str(r.tagline)),
    ...opt("about", str(r.about)),
    ...opt("items", items),
    ...opt("hours", hours),
    ...opt("address", str(r.address)),
    ...opt("whatsapp", str(r.whatsapp)),
    ...opt("instagram", str(r.instagram)),
    ...opt("email", str(r.email)),
    ...opt("heroImage", typeof r.heroImage === "string" ? (r.heroImage as Id<"_storage">) : undefined),
    ...opt("gallery", gallery),
  };
}

export const LIMITS = {
  name: 80,
  tagline: 120,
  about: 1200,
  items: 12,
  itemName: 60,
  itemPrice: 20,
  itemNote: 80,
  gallery: 6,
} as const;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Limites da spec 2.1, no servidor. Lança `userError` com a mensagem do campo
 * (pt-BR: quem lê é a Duda, no rodapé do editor). Campo vazio é "não
 * preenchido", não erro: o editor manda "" para o que ela limpou.
 */
export function validateSiteContent(c: SiteContent): void {
  const name = c.name.trim();
  if (name.length < 1 || name.length > LIMITS.name) {
    throw userError(`Nome: entre 1 e ${LIMITS.name} caracteres`);
  }
  if ((c.tagline ?? "").length > LIMITS.tagline) {
    throw userError(`Slogan: no máximo ${LIMITS.tagline} caracteres`);
  }
  if ((c.about ?? "").length > LIMITS.about) {
    throw userError(`Sobre: no máximo ${LIMITS.about} caracteres`);
  }
  if (!isPaletteOf(c.template, c.palette)) throw userError("Paleta inválida para este modelo");

  const items = c.items ?? [];
  if (items.length > LIMITS.items) throw userError(`Itens: no máximo ${LIMITS.items}`);
  for (const it of items) {
    const n = it.name.trim();
    if (n.length < 1 || n.length > LIMITS.itemName) {
      throw userError(`Item: nome entre 1 e ${LIMITS.itemName} caracteres`);
    }
    if ((it.price ?? "").length > LIMITS.itemPrice) {
      throw userError(`Item: preço com no máximo ${LIMITS.itemPrice} caracteres`);
    }
    if ((it.note ?? "").length > LIMITS.itemNote) {
      throw userError(`Item: nota com no máximo ${LIMITS.itemNote} caracteres`);
    }
  }

  const seen = new Set<number>();
  for (const h of c.hours ?? []) {
    if (seen.has(h.day)) throw userError("Horário: no máximo uma linha por dia");
    seen.add(h.day);
    if (!HHMM.test(h.open) || !HHMM.test(h.close)) throw userError("Horário: use o formato HH:MM");
  }

  if ((c.gallery ?? []).length > LIMITS.gallery) {
    throw userError(`Galeria: no máximo ${LIMITS.gallery} fotos`);
  }
  if (c.instagram && /[@\s/]/.test(c.instagram)) {
    throw userError("Instagram: só o nome de usuário, sem @, espaço ou barra");
  }
  if (c.whatsapp && !/^\d{8,15}$/.test(c.whatsapp)) {
    throw userError("WhatsApp: só dígitos com DDI, de 8 a 15");
  }
  if (c.email && !c.email.includes("@")) throw userError("E-mail inválido");
}

/** O que o lead precisa ter para alimentar o conteúdo inicial (Doc<"leads"> serve). */
export interface LeadLike {
  name: string;
  category?: string | null;
  city?: string | null;
  countryCode: string;
  phone?: string | null;
  address?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
}

/**
 * Conteúdo inicial a partir do lead, usado UMA vez, na criação do preview
 * (spec Decisões: editar o lead depois não propaga). `whatsapp`, `instagram` e
 * `email` ficam vazios: o e-mail do lead é canal de outreach, não
 * necessariamente público, e WhatsApp derivado do telefone afirmaria um
 * atendimento que ninguém verificou.
 */
export function defaultContentForLead(lead: LeadLike): SiteContent {
  const template = suggestTemplate(lead.category);
  return {
    version: 2,
    template,
    palette: defaultPalette(template),
    // 80 é o limite de `validateSiteContent`; um nome maior seria erro no
    // primeiro Salvar sem ela ter mexido no campo.
    name: lead.name.trim().slice(0, LIMITS.name),
    city: lead.city ?? null,
    countryCode: lead.countryCode,
    ...opt("phone", lead.phone || undefined),
    ...opt("address", lead.address || undefined),
    category: lead.category ?? null,
    rating: lead.rating ?? null,
    reviewsCount: lead.reviewsCount ?? null,
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --experimental-strip-types --test tests/site.test.ts`
Expected: `ℹ tests 11`, `ℹ pass 11`, `ℹ fail 0`.

- [ ] **Step 5: Typecheck, lint e suíte inteira**

Run: `./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && node --experimental-strip-types --test tests/*.test.ts 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: nenhuma saída dos dois `tsc` nem do `eslint`; depois `ℹ tests 250`, `ℹ pass 250`, `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add convex/lib/site.ts tests/site.test.ts
git commit -m "$(cat <<'MSG'
feat(site): SiteContent v2 com validador, modelo por categoria, CTA e conversão do formato antigo

Puro e testado: a base dos 4 modelos. parseSiteContent converte o
PreviewContent antigo na leitura e nunca lança; primaryCta só existe
com canal preenchido (WhatsApp nunca é derivado do telefone).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```


## Chunk 2: textos padrão dos modelos em 10 idiomas e a fonte serifada

Só adiciona: as chaves antigas do template único (`heroSubtitle`, `feature*`, `visitHeading`, `visitBody`) continuam existindo até a chunk 7, quando `preview-site.tsx` já não as usa. Assim cada commit fica verde. Ao fim da chunk: 256 testes.

### Task 3: `templates.<id>` no `PreviewDict` (`src/lib/preview-i18n.ts`)

**Files:**
- Modify: `src/lib/preview-i18n.ts`
- Test: `tests/site-templates-i18n.test.ts`

Contexto: o dicionário de cada idioma é um `const xx: PreviewDict = { ... }`. Cada um ganha `templates: xxTemplates` (último membro), com `xxTemplates` montado por `templateSet(comum, próprio)`: a parte comum (galeria, horário, contato, CTAs, "fechado") é igual nos 4 modelos, e cada modelo traz slogan, "sobre", rótulo dos itens e dos blocos "sobre" e "onde estamos"; Ofício sobrescreve `galleryHeading` ("Nosso trabalho"). `inCity(city)` é o único texto interpolado: só nomeia a cidade.

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/site-templates-i18n.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { DICTS, type Locale, type TemplateDict } from "../src/lib/preview-i18n.ts";
import { TEMPLATE_IDS } from "../convex/lib/site.ts";

const LOCALES = Object.keys(DICTS) as Locale[];

/** Toda a copy de um modelo num idioma, com a função de cidade materializada. */
function templateCopy(d: TemplateDict): string[] {
  return [...Object.values(d).filter((v): v is string => typeof v === "string"), d.inCity("Madrid")];
}

test("templates-i18n: os 10 idiomas têm os 4 modelos com as mesmas chaves", () => {
  const keys = Object.keys(DICTS.en.templates.mesa).sort();
  assert.ok(keys.length >= 16, `TemplateDict com poucas chaves: ${keys.join(", ")}`);
  for (const l of LOCALES) {
    assert.deepEqual(Object.keys(DICTS[l].templates).sort(), [...TEMPLATE_IDS].sort(), `${l}: modelos faltando`);
    for (const t of TEMPLATE_IDS) {
      assert.deepEqual(Object.keys(DICTS[l].templates[t]).sort(), keys, `${l}.templates.${t} fora de paridade`);
      for (const [k, v] of Object.entries(DICTS[l].templates[t])) {
        if (typeof v === "string") assert.ok(v.trim().length > 0, `${l}.templates.${t}.${k} vazio`);
      }
    }
  }
});

test("templates-i18n: nenhum texto padrão contém dígito (sem horário, preço ou ano inventado)", () => {
  // O preview é público e leva o nome do negócio real. Um "desde 1998", um
  // "9h às 19h" ou um "a partir de 30" no texto padrão seria fato inventado
  // sobre o negócio de terceiro. Dados assim só entram pelo SiteContent salvo.
  for (const l of LOCALES) {
    for (const t of TEMPLATE_IDS) {
      for (const s of templateCopy(DICTS[l].templates[t])) {
        assert.equal(/\d/.test(s), false, `${l}.templates.${t}: ${JSON.stringify(s)}`);
      }
    }
  }
});

test("templates-i18n: nenhum texto padrão afirma superlativo, antiguidade ou cobertura de região", () => {
  const claim =
    /\b(best|beste|bäst|bästa|bedste|melhor|mejor|migliore|meilleur|meilleure|since|desde|seit|sedan|siden|depuis|sinds|region|região|región|regione|regio|Umgebung)\b/i;
  for (const l of LOCALES) {
    for (const t of TEMPLATE_IDS) {
      for (const s of templateCopy(DICTS[l].templates[t])) {
        assert.equal(claim.test(s), false, `${l}.templates.${t}: ${JSON.stringify(s)}`);
      }
    }
  }
});

test("templates-i18n: inCity só nomeia a cidade", () => {
  for (const l of LOCALES) {
    for (const t of TEMPLATE_IDS) {
      const s = DICTS[l].templates[t].inCity("Lugano");
      assert.ok(s.includes("Lugano"), `${l}.${t}.inCity não interpola`);
      assert.ok(s.length <= "Lugano".length + 6, `${l}.${t}.inCity diz mais que a cidade: ${s}`);
    }
  }
});

test("templates-i18n: o francês dos modelos é francês, não português nem inglês", () => {
  for (const t of TEMPLATE_IDS) {
    const body = templateCopy(DICTS.fr.templates[t]).join(" | ");
    assert.equal(body.match(/Venha|Horário|Reservar|Fechado|Closed|Book a|Gallery/), null, body);
    assert.equal(body.match(/ [?!:;]/), null, `espaço normal antes da pontuação: ${body}`);
  }
  assert.equal(DICTS.fr.templates.mesa.reserve, "Réserver une table");
  assert.equal(DICTS.fr.templates.estudio.closed, "Fermé");
});

test("templates-i18n: o rótulo dos itens muda por modelo e o resto é coerente", () => {
  const en = DICTS.en.templates;
  assert.equal(en.mesa.itemsHeading, "From the menu");
  assert.equal(en.estudio.itemsHeading, "Services");
  assert.equal(en.oficio.itemsHeading, "Services");
  assert.equal(en.vitrine.itemsHeading, "Highlights");
  assert.equal(en.oficio.galleryHeading, "Our work");
  // Cada modelo diz o próprio slogan: quatro textos, não um copiado.
  for (const l of LOCALES) {
    const taglines = TEMPLATE_IDS.map((t) => DICTS[l].templates[t].tagline);
    assert.equal(new Set(taglines).size, 4, `${l}: slogans repetidos`);
  }
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --experimental-strip-types --test tests/site-templates-i18n.test.ts 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `ℹ tests 6`, `ℹ pass 0`, `ℹ fail 6` (todos com `TypeError: Cannot read properties of undefined`, porque `templates` não existe).

- [ ] **Step 3: Importar o tipo `TemplateId`**

Em `src/lib/preview-i18n.ts`, logo abaixo da linha `import { swissLanguage } from "../../convex/lib/domain.ts";`, acrescente:

```ts
import type { TemplateId } from "../../convex/lib/site.ts";
```

- [ ] **Step 4: Declarar `TemplateDict` e o montador**

Imediatamente antes da linha `export interface PreviewDict {`, insira:

```ts
/**
 * Textos padrão de cada modelo (spec 1.5). Regra de honestidade: nada aqui
 * afirma fato sobre o negócio (horário, preço, ano, "melhor da cidade",
 * "atendemos a região"); tests/site-templates-i18n.test.ts proíbe dígito em
 * qualquer valor. Horário, preço e itens só entram pelo `SiteContent` salvo e
 * só aparecem quando ela preencheu. `callNow` e `whatsapp` continuam no topo
 * do PreviewDict; os modelos os leem de lá.
 */
export interface TemplateDict {
  tagline: string; // slogan genérico
  about: string; // parágrafo genérico sobre atendimento e cuidado, sem fato
  itemsHeading: string; // cardápio / serviços / serviços / destaques
  galleryHeading: string;
  hoursHeading: string;
  areaHeading: string; // ofício: "área atendida"
  inCity: (city: string) => string; // "Em {city}": só nomeia a cidade, nunca "atendemos a região"
  quoteHeading: string;
  aboutHeading: string;
  visitHeading: string; // onde estamos / localização e horário
  contactHeading: string;
  reserve: string; // CTA mesa
  book: string; // CTA estúdio
  quote: string; // CTA ofício
  email: string; // rótulo do CTA quando o único canal é e-mail
  closed: string; // linha do horário para dia sem faixa
}

type TemplateCommon = Pick<
  TemplateDict,
  | "galleryHeading"
  | "hoursHeading"
  | "areaHeading"
  | "inCity"
  | "quoteHeading"
  | "contactHeading"
  | "reserve"
  | "book"
  | "quote"
  | "email"
  | "closed"
>;
type TemplateOwn = Pick<TemplateDict, "tagline" | "about" | "itemsHeading" | "aboutHeading" | "visitHeading"> &
  Partial<TemplateCommon>;

/** Monta os 4 dicionários de modelo de um idioma: parte comum + o que cada modelo muda. */
function templateSet(common: TemplateCommon, own: Record<TemplateId, TemplateOwn>): Record<TemplateId, TemplateDict> {
  return {
    mesa: { ...common, ...own.mesa },
    estudio: { ...common, ...own.estudio },
    oficio: { ...common, ...own.oficio },
    vitrine: { ...common, ...own.vitrine },
  };
}
```

- [ ] **Step 5: Acrescentar `templates` à interface**

Dentro de `export interface PreviewDict { ... }`, logo depois da linha
`  metaDescription: (o: { name: string; city: string | null }) => string;`
e antes do `}` que fecha a interface, acrescente:

```ts
  templates: Record<TemplateId, TemplateDict>;
```

- [ ] **Step 6: Inglês**

Imediatamente antes da linha `const en: PreviewDict = {`, insira:

```ts
const enTemplates = templateSet(
  {
    galleryHeading: "Gallery",
    hoursHeading: "Opening hours",
    areaHeading: "Service area",
    inCity: (city) => `In ${city}`,
    quoteHeading: "Ask for a quote",
    contactHeading: "Contact",
    reserve: "Book a table",
    book: "Book an appointment",
    quote: "Request a quote",
    email: "Send an email",
    closed: "Closed",
  },
  {
    mesa: {
      tagline: "A table set with care",
      about:
        "We cook with attention to every detail and welcome you the way we would at home. Come for lunch, dinner or a drink with friends.",
      itemsHeading: "From the menu",
      aboutHeading: "About us",
      visitHeading: "Where to find us",
    },
    estudio: {
      tagline: "Your time, well spent",
      about:
        "A calm space, careful hands and attention to what you want. Book your visit and leave feeling like yourself again.",
      itemsHeading: "Services",
      aboutHeading: "About the studio",
      visitHeading: "Where to find us",
    },
    oficio: {
      tagline: "Work done right",
      about:
        "Clear answers, tidy work and respect for your time and your home. Tell us what you need and we will get back to you.",
      itemsHeading: "Services",
      aboutHeading: "How we work",
      visitHeading: "Where to find us",
      galleryHeading: "Our work",
    },
    vitrine: {
      tagline: "Here for you",
      about:
        "Personal attention, honest advice and the care you would expect from people who know their trade. Get in touch or come and see us.",
      itemsHeading: "Highlights",
      aboutHeading: "About us",
      visitHeading: "Location and hours",
    },
  },
);
```

Depois, dentro de `const en: PreviewDict = { ... }`, após a última propriedade (`metaDescription: ({ name, city }) =>` e sua linha de template string terminada em `,`) e antes do `};`, acrescente:

```ts
  templates: enTemplates,
```

- [ ] **Step 7: Holandês**

Antes de `const nl: PreviewDict = {`:

```ts
const nlTemplates = templateSet(
  {
    galleryHeading: "Galerij",
    hoursHeading: "Openingstijden",
    areaHeading: "Werkgebied",
    inCity: (city) => `In ${city}`,
    quoteHeading: "Vraag een offerte aan",
    contactHeading: "Contact",
    reserve: "Reserveer een tafel",
    book: "Maak een afspraak",
    quote: "Offerte aanvragen",
    email: "Stuur een e-mail",
    closed: "Gesloten",
  },
  {
    mesa: {
      tagline: "Een tafel met zorg gedekt",
      about:
        "We koken met aandacht voor elk detail en ontvangen u zoals we dat thuis zouden doen. Kom lunchen, dineren of iets drinken met vrienden.",
      itemsHeading: "Van de kaart",
      aboutHeading: "Over ons",
      visitHeading: "Waar u ons vindt",
    },
    estudio: {
      tagline: "Uw tijd, goed besteed",
      about:
        "Een rustige ruimte, zorgvuldige handen en aandacht voor wat u wilt. Boek uw bezoek en ga weer helemaal uzelf naar huis.",
      itemsHeading: "Diensten",
      aboutHeading: "Over de studio",
      visitHeading: "Waar u ons vindt",
    },
    oficio: {
      tagline: "Werk dat goed gedaan is",
      about:
        "Duidelijke antwoorden, net werk en respect voor uw tijd en uw huis. Vertel ons wat u nodig heeft en we nemen contact met u op.",
      itemsHeading: "Diensten",
      aboutHeading: "Zo werken wij",
      visitHeading: "Waar u ons vindt",
      galleryHeading: "Ons werk",
    },
    vitrine: {
      tagline: "Voor u klaar",
      about:
        "Persoonlijke aandacht, eerlijk advies en de zorg die u mag verwachten van mensen die hun vak verstaan. Neem contact op of kom langs.",
      itemsHeading: "Uitgelicht",
      aboutHeading: "Over ons",
      visitHeading: "Locatie en openingstijden",
    },
  },
);
```

E `  templates: nlTemplates,` como última propriedade de `nl`.

- [ ] **Step 8: Sueco**

Antes de `const sv: PreviewDict = {`:

```ts
const svTemplates = templateSet(
  {
    galleryHeading: "Galleri",
    hoursHeading: "Öppettider",
    areaHeading: "Område vi arbetar i",
    inCity: (city) => `I ${city}`,
    quoteHeading: "Be om en offert",
    contactHeading: "Kontakt",
    reserve: "Boka bord",
    book: "Boka tid",
    quote: "Begär offert",
    email: "Skicka e-post",
    closed: "Stängt",
  },
  {
    mesa: {
      tagline: "Ett bord dukat med omsorg",
      about:
        "Vi lagar mat med omsorg om varje detalj och tar emot dig som hemma. Kom på lunch, middag eller en drink med vänner.",
      itemsHeading: "Ur menyn",
      aboutHeading: "Om oss",
      visitHeading: "Hitta hit",
    },
    estudio: {
      tagline: "Din tid, väl använd",
      about:
        "En lugn plats, varsamma händer och uppmärksamhet på vad du vill ha. Boka ditt besök och gå hem som dig själv igen.",
      itemsHeading: "Tjänster",
      aboutHeading: "Om studion",
      visitHeading: "Hitta hit",
    },
    oficio: {
      tagline: "Arbete som blir rätt gjort",
      about:
        "Tydliga svar, snyggt utfört arbete och respekt för din tid och ditt hem. Berätta vad du behöver så hör vi av oss.",
      itemsHeading: "Tjänster",
      aboutHeading: "Så arbetar vi",
      visitHeading: "Hitta hit",
      galleryHeading: "Vårt arbete",
    },
    vitrine: {
      tagline: "Här för dig",
      about:
        "Personligt bemötande, ärliga råd och den omsorg du kan förvänta dig av människor som kan sitt hantverk. Hör av dig eller kom förbi.",
      itemsHeading: "I fokus",
      aboutHeading: "Om oss",
      visitHeading: "Hitta hit och öppettider",
    },
  },
);
```

E `  templates: svTemplates,` como última propriedade de `sv`.

- [ ] **Step 9: Norueguês**

Antes de `const no: PreviewDict = {`:

```ts
const noTemplates = templateSet(
  {
    galleryHeading: "Galleri",
    hoursHeading: "Åpningstider",
    areaHeading: "Område vi dekker",
    inCity: (city) => `I ${city}`,
    quoteHeading: "Be om et tilbud",
    contactHeading: "Kontakt",
    reserve: "Bestill bord",
    book: "Bestill time",
    quote: "Be om tilbud",
    email: "Send e-post",
    closed: "Stengt",
  },
  {
    mesa: {
      tagline: "Et bord dekket med omhu",
      about:
        "Vi lager mat med omtanke for hver detalj og tar imot deg som hjemme. Kom til lunsj, middag eller en drink med venner.",
      itemsHeading: "Fra menyen",
      aboutHeading: "Om oss",
      visitHeading: "Her finner du oss",
    },
    estudio: {
      tagline: "Din tid, godt brukt",
      about:
        "Et rolig sted, varsomme hender og oppmerksomhet på det du ønsker. Bestill ditt besøk og gå hjem som deg selv igjen.",
      itemsHeading: "Tjenester",
      aboutHeading: "Om studioet",
      visitHeading: "Her finner du oss",
    },
    oficio: {
      tagline: "Arbeid gjort riktig",
      about:
        "Klare svar, ryddig arbeid og respekt for tiden din og hjemmet ditt. Fortell oss hva du trenger, så tar vi kontakt.",
      itemsHeading: "Tjenester",
      aboutHeading: "Slik jobber vi",
      visitHeading: "Her finner du oss",
      galleryHeading: "Vårt arbeid",
    },
    vitrine: {
      tagline: "Her for deg",
      about:
        "Personlig oppfølging, ærlige råd og omsorgen du forventer av folk som kan faget sitt. Ta kontakt eller stikk innom.",
      itemsHeading: "Utvalgt",
      aboutHeading: "Om oss",
      visitHeading: "Adresse og åpningstider",
    },
  },
);
```

E `  templates: noTemplates,` como última propriedade de `no`.

- [ ] **Step 10: Espanhol**

Antes de `const es: PreviewDict = {`:

```ts
const esTemplates = templateSet(
  {
    galleryHeading: "Galería",
    hoursHeading: "Horario",
    areaHeading: "Zona de servicio",
    inCity: (city) => `En ${city}`,
    quoteHeading: "Pida presupuesto",
    contactHeading: "Contacto",
    reserve: "Reservar mesa",
    book: "Pedir cita",
    quote: "Solicitar presupuesto",
    email: "Enviar un correo",
    closed: "Cerrado",
  },
  {
    mesa: {
      tagline: "Una mesa puesta con cariño",
      about:
        "Cocinamos con atención a cada detalle y le recibimos como en casa. Venga a comer, a cenar o a tomar algo con amigos.",
      itemsHeading: "De la carta",
      aboutHeading: "Sobre nosotros",
      visitHeading: "Dónde encontrarnos",
    },
    estudio: {
      tagline: "Su tiempo, bien aprovechado",
      about:
        "Un espacio tranquilo, manos cuidadosas y atención a lo que usted quiere. Reserve su visita y salga sintiéndose usted de nuevo.",
      itemsHeading: "Servicios",
      aboutHeading: "Sobre el estudio",
      visitHeading: "Dónde encontrarnos",
    },
    oficio: {
      tagline: "Trabajo bien hecho",
      about:
        "Respuestas claras, trabajo limpio y respeto por su tiempo y su casa. Cuéntenos qué necesita y le responderemos.",
      itemsHeading: "Servicios",
      aboutHeading: "Cómo trabajamos",
      visitHeading: "Dónde encontrarnos",
      galleryHeading: "Nuestro trabajo",
    },
    vitrine: {
      tagline: "Aquí para usted",
      about:
        "Atención personal, consejo honesto y el cuidado que espera de quien conoce su oficio. Escríbanos o venga a vernos.",
      itemsHeading: "Destacados",
      aboutHeading: "Sobre nosotros",
      visitHeading: "Ubicación y horario",
    },
  },
);
```

E `  templates: esTemplates,` como última propriedade de `es`.

- [ ] **Step 11: Italiano (forma de cortesia Lei/Le, como o resto do dicionário)**

Antes de `const it: PreviewDict = {`:

```ts
const itTemplates = templateSet(
  {
    galleryHeading: "Galleria",
    hoursHeading: "Orari di apertura",
    areaHeading: "Zona servita",
    inCity: (city) => `A ${city}`,
    quoteHeading: "Chieda un preventivo",
    contactHeading: "Contatti",
    reserve: "Prenota un tavolo",
    book: "Prenota un appuntamento",
    quote: "Richiedi un preventivo",
    email: "Scrivici",
    closed: "Chiuso",
  },
  {
    mesa: {
      tagline: "Una tavola apparecchiata con cura",
      about:
        "Cuciniamo con attenzione a ogni dettaglio e La accogliamo come a casa. Venga a pranzo, a cena o per un aperitivo con gli amici.",
      itemsHeading: "Dal menù",
      aboutHeading: "Chi siamo",
      visitHeading: "Dove trovarci",
    },
    estudio: {
      tagline: "Il Suo tempo, speso bene",
      about:
        "Uno spazio tranquillo, mani attente e cura per ciò che desidera. Prenoti la Sua visita e torni a sentirsi al meglio.",
      itemsHeading: "Servizi",
      aboutHeading: "Lo studio",
      visitHeading: "Dove trovarci",
    },
    oficio: {
      tagline: "Lavoro fatto bene",
      about:
        "Risposte chiare, lavoro pulito e rispetto per il Suo tempo e la Sua casa. Ci dica di cosa ha bisogno e La ricontatteremo.",
      itemsHeading: "Servizi",
      aboutHeading: "Come lavoriamo",
      visitHeading: "Dove trovarci",
      galleryHeading: "I nostri lavori",
    },
    vitrine: {
      tagline: "Qui per Lei",
      about:
        "Attenzione personale, consigli onesti e la cura che si aspetta da chi conosce il proprio mestiere. Ci contatti o venga a trovarci.",
      itemsHeading: "In evidenza",
      aboutHeading: "Chi siamo",
      visitHeading: "Dove siamo e orari",
    },
  },
);
```

E `  templates: itTemplates,` como última propriedade de `it`.

- [ ] **Step 12: Português europeu**

O `const pt` tem um comentário de documentação (`/** Português europeu (PT), não pt-BR ... */`) logo acima. Insira o bloco **antes desse comentário**, para o comentário continuar colado ao `const pt`:

```ts
const ptTemplates = templateSet(
  {
    galleryHeading: "Galeria",
    hoursHeading: "Horário",
    areaHeading: "Zona de atuação",
    inCity: (city) => `Em ${city}`,
    quoteHeading: "Peça um orçamento",
    contactHeading: "Contacto",
    reserve: "Reservar mesa",
    book: "Marcar horário",
    quote: "Pedir orçamento",
    email: "Enviar e-mail",
    closed: "Fechado",
  },
  {
    mesa: {
      tagline: "Uma mesa posta com cuidado",
      about:
        "Cozinhamos com atenção a cada detalhe e recebemo-lo como em casa. Venha almoçar, jantar ou beber um copo com amigos.",
      itemsHeading: "Da ementa",
      aboutHeading: "Sobre nós",
      visitHeading: "Onde estamos",
    },
    estudio: {
      tagline: "O seu tempo, bem passado",
      about:
        "Um espaço tranquilo, mãos cuidadosas e atenção ao que pretende. Marque a sua visita e saia a sentir-se de novo como gosta.",
      itemsHeading: "Serviços",
      aboutHeading: "O estúdio",
      visitHeading: "Onde estamos",
    },
    oficio: {
      tagline: "Trabalho bem feito",
      about:
        "Respostas claras, trabalho limpo e respeito pelo seu tempo e pela sua casa. Diga-nos do que precisa e entraremos em contacto.",
      itemsHeading: "Serviços",
      aboutHeading: "Como trabalhamos",
      visitHeading: "Onde estamos",
      galleryHeading: "O nosso trabalho",
    },
    vitrine: {
      tagline: "Aqui para si",
      about:
        "Atenção pessoal, conselhos honestos e o cuidado que espera de quem conhece o seu ofício. Contacte-nos ou venha visitar-nos.",
      itemsHeading: "Destaques",
      aboutHeading: "Sobre nós",
      visitHeading: "Localização e horário",
    },
  },
);
```

E `  templates: ptTemplates,` como última propriedade de `pt`.

- [ ] **Step 13: Alemão**

O `const de` também tem comentário de documentação acima (`/** Alemão padrão (Hochdeutsch) ... */`). Insira antes do comentário:

```ts
const deTemplates = templateSet(
  {
    galleryHeading: "Galerie",
    hoursHeading: "Öffnungszeiten",
    areaHeading: "Einsatzgebiet",
    inCity: (city) => `In ${city}`,
    quoteHeading: "Angebot anfragen",
    contactHeading: "Kontakt",
    reserve: "Tisch reservieren",
    book: "Termin buchen",
    quote: "Angebot anfordern",
    email: "E-Mail schreiben",
    closed: "Geschlossen",
  },
  {
    mesa: {
      tagline: "Ein Tisch, mit Sorgfalt gedeckt",
      about:
        "Wir kochen mit Liebe zum Detail und empfangen Sie wie zu Hause. Kommen Sie zum Mittagessen, zum Abendessen oder auf ein Glas mit Freunden.",
      itemsHeading: "Aus der Karte",
      aboutHeading: "Über uns",
      visitHeading: "So finden Sie uns",
    },
    estudio: {
      tagline: "Ihre Zeit, gut verbracht",
      about:
        "Ein ruhiger Ort, sorgfältige Hände und ein offenes Ohr für Ihre Wünsche. Buchen Sie Ihren Besuch und gehen Sie wieder ganz als Sie selbst nach Hause.",
      itemsHeading: "Leistungen",
      aboutHeading: "Das Studio",
      visitHeading: "So finden Sie uns",
    },
    oficio: {
      tagline: "Arbeit, die richtig gemacht ist",
      about:
        "Klare Antworten, saubere Arbeit und Respekt vor Ihrer Zeit und Ihrem Zuhause. Sagen Sie uns, was Sie brauchen, und wir melden uns bei Ihnen.",
      itemsHeading: "Leistungen",
      aboutHeading: "So arbeiten wir",
      visitHeading: "So finden Sie uns",
      galleryHeading: "Unsere Arbeit",
    },
    vitrine: {
      tagline: "Für Sie da",
      about:
        "Persönliche Betreuung, ehrliche Beratung und die Sorgfalt, die Sie von Menschen erwarten, die ihr Handwerk verstehen. Melden Sie sich oder schauen Sie vorbei.",
      itemsHeading: "Highlights",
      aboutHeading: "Über uns",
      visitHeading: "Standort und Öffnungszeiten",
    },
  },
);
```

E `  templates: deTemplates,` como última propriedade de `de`.

- [ ] **Step 14: Dinamarquês**

Antes de `const da: PreviewDict = {`:

```ts
const daTemplates = templateSet(
  {
    galleryHeading: "Galleri",
    hoursHeading: "Åbningstider",
    areaHeading: "Vores område",
    inCity: (city) => `I ${city}`,
    quoteHeading: "Bed om et tilbud",
    contactHeading: "Kontakt",
    reserve: "Book bord",
    book: "Book tid",
    quote: "Anmod om tilbud",
    email: "Send en e-mail",
    closed: "Lukket",
  },
  {
    mesa: {
      tagline: "Et bord dækket med omhu",
      about:
        "Vi laver mad med sans for hver detalje og tager imod dig som derhjemme. Kom til frokost, middag eller en drink med venner.",
      itemsHeading: "Fra menuen",
      aboutHeading: "Om os",
      visitHeading: "Her finder du os",
    },
    estudio: {
      tagline: "Din tid, godt brugt",
      about:
        "Et roligt sted, omhyggelige hænder og opmærksomhed på det, du ønsker. Book dit besøg og gå hjem som dig selv igen.",
      itemsHeading: "Ydelser",
      aboutHeading: "Om studiet",
      visitHeading: "Her finder du os",
    },
    oficio: {
      tagline: "Arbejde gjort ordentligt",
      about:
        "Klare svar, pænt arbejde og respekt for din tid og dit hjem. Fortæl os, hvad du har brug for, så vender vi tilbage.",
      itemsHeading: "Ydelser",
      aboutHeading: "Sådan arbejder vi",
      visitHeading: "Her finder du os",
      galleryHeading: "Vores arbejde",
    },
    vitrine: {
      tagline: "Her for dig",
      about:
        "Personlig betjening, ærlig rådgivning og den omhu, du forventer af folk, der kender deres fag. Kontakt os eller kig forbi.",
      itemsHeading: "Udvalgt",
      aboutHeading: "Om os",
      visitHeading: "Adresse og åbningstider",
    },
  },
);
```

E `  templates: daTemplates,` como última propriedade de `da`.

- [ ] **Step 15: Francês (vouvoiement; nenhuma linha usa `? ! : ;`, então não há espaço insecável a escrever)**

O `const fr` tem o comentário longo sobre tipografia acima. Insira antes do comentário:

```ts
const frTemplates = templateSet(
  {
    galleryHeading: "Galerie",
    hoursHeading: "Horaires d'ouverture",
    areaHeading: "Zone d'intervention",
    inCity: (city) => `À ${city}`,
    quoteHeading: "Demandez un devis",
    contactHeading: "Contact",
    reserve: "Réserver une table",
    book: "Prendre rendez-vous",
    quote: "Demander un devis",
    email: "Envoyer un e-mail",
    closed: "Fermé",
  },
  {
    mesa: {
      tagline: "Une table dressée avec soin",
      about:
        "Nous cuisinons avec attention à chaque détail et vous accueillons comme à la maison. Venez déjeuner, dîner ou prendre un verre entre amis.",
      itemsHeading: "À la carte",
      aboutHeading: "Qui sommes-nous",
      visitHeading: "Où nous trouver",
    },
    estudio: {
      tagline: "Votre temps, bien employé",
      about:
        "Un lieu calme, des mains soigneuses et une attention à ce que vous souhaitez. Réservez votre visite et repartez en vous sentant vous-même.",
      itemsHeading: "Prestations",
      aboutHeading: "Le studio",
      visitHeading: "Où nous trouver",
    },
    oficio: {
      tagline: "Du travail bien fait",
      about:
        "Des réponses claires, un travail propre et le respect de votre temps et de votre maison. Dites-nous ce dont vous avez besoin et nous vous recontacterons.",
      itemsHeading: "Prestations",
      aboutHeading: "Notre façon de travailler",
      visitHeading: "Où nous trouver",
      galleryHeading: "Nos réalisations",
    },
    vitrine: {
      tagline: "À votre écoute",
      about:
        "Une attention personnelle, des conseils honnêtes et le soin que vous attendez de personnes qui connaissent leur métier. Contactez-nous ou passez nous voir.",
      itemsHeading: "À la une",
      aboutHeading: "Qui sommes-nous",
      visitHeading: "Adresse et horaires",
    },
  },
);
```

E `  templates: frTemplates,` como última propriedade de `fr`.

- [ ] **Step 16: Conferir a montagem**

Run: `grep -c "templates: [a-z][a-z]Templates," src/lib/preview-i18n.ts && grep -c "Templates = templateSet(" src/lib/preview-i18n.ts && grep -n "templates: Record<TemplateId, TemplateDict>;" src/lib/preview-i18n.ts`
Expected: `10`, `10` e uma linha dentro da interface.

- [ ] **Step 17: Rodar e ver passar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && node --experimental-strip-types --test tests/*.test.ts 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `tsc` e `eslint` sem saída; `ℹ tests 256`, `ℹ pass 256`, `ℹ fail 0`. Os testes antigos de `tests/preview-i18n.test.ts` continuam passando: eles só olham chaves de topo e `templates` é um objeto, ignorado pelo filtro de strings.

- [ ] **Step 18: Commit**

```bash
git add src/lib/preview-i18n.ts tests/site-templates-i18n.test.ts
git commit -m "$(cat <<'MSG'
feat(site): textos padrão dos 4 modelos nos 10 idiomas da prévia

Slogan, "sobre", rótulos de seção e CTAs por modelo, sem dígito nem
fato sobre o negócio (teste trava). Horário e preço continuam só como
dado do conteúdo salvo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 4: Fraunces via `next/font/google` (`src/app/layout.tsx`)

**Files:**
- Modify: `src/app/layout.tsx`

Contexto: a direção pede serifada de exibição em Mesa, Ofício e Vitrine. `next/font/google` baixa a fonte no build (precisa de rede no `next build`; não há dependência npm). A variável chama `--font-fraunces`, não `--font-serif`: o tema do Tailwind v4 já define `--font-serif` e as duas colidiriam. Só os modelos a usam, via `[font-family:var(--font-fraunces)]`; ela não entra no `@theme inline` do `globals.css`.

- [ ] **Step 1: Editar o import e declarar a fonte**

Em `src/app/layout.tsx`, troque a linha
`import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";`
por
`import { Geist, Geist_Mono, Bricolage_Grotesque, Fraunces } from "next/font/google";`

Logo depois do bloco `const display = Bricolage_Grotesque({ ... });`, acrescente:

```ts
// Serifada de exibição dos modelos Mesa, Ofício e Vitrine (src/components/site-templates).
// Variável própria (não --font-serif) para não colidir com o tema padrão do Tailwind v4.
const serif = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});
```

- [ ] **Step 2: Aplicar a variável no `<html>`**

Na `className` do `<html>`, troque
``className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}``
por
``className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${serif.variable} h-full antialiased`}``

- [ ] **Step 3: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && grep -c "font-fraunces" src/app/layout.tsx`
Expected: sem saída dos dois primeiros; `1`.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "$(cat <<'MSG'
feat(site): carrega a Fraunces para os títulos dos modelos

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```


## Chunk 3: fotos padrão, paletas e catálogo

Ao fim da chunk: 12 fotos em `public/templates/`, `LICENSES.md`, `palettes.ts`, `catalog.ts`, 262 testes.

### Task 5: baixar as 12 fotos padrão e registrar as licenças

**Files:**
- Create: `public/templates/{mesa,estudio,oficio,vitrine}/{hero,g1,g2}.jpg` (12 arquivos)
- Create: `public/templates/LICENSES.md`

Contexto: as fotos foram escolhidas e conferidas uma a uma (sem marca, sem nome de loja, sem rosto; a única com pessoas é `mesa/g1.jpg`, só mãos servindo um prato). Os hashes abaixo são os nomes das imagens no CDN do Unsplash (`images.unsplash.com/photo-<hash>`), verificados em 2026-09-17; as páginas e autores estão em `LICENSES.md`. A qualidade cai de 72 até 40 até o arquivo caber em 250 KB (a 1600 px, três delas só cabem em q=40, e ficam bem).

- [ ] **Step 1: Baixar**

Salve o script em `$OUT/fotos.sh` e rode:

```bash
#!/bin/sh
# Baixa as 12 fotos padrão (Unsplash, licença livre) a 1600 px, reduzindo a
# qualidade (72, 60, 50, 40) até caber em 250 KB. Lista: modelo slot hash.
cd /Users/madu/Developer/mine/osprano || exit 1
mkdir -p public/templates/mesa public/templates/estudio public/templates/oficio public/templates/vitrine
falhas=0
while read -r t s h; do
  ok=0
  for q in 72 60 50 40; do
    curl -fsS -m 120 -o "public/templates/$t/$s.jpg" "https://images.unsplash.com/photo-$h?w=1600&q=$q&fm=jpg&fit=max" || continue
    size=$(stat -f %z "public/templates/$t/$s.jpg")
    if [ "$size" -le 256000 ]; then echo "$t/$s.jpg q=$q $size bytes"; ok=1; break; fi
  done
  if [ "$ok" = 0 ]; then echo "FALHOU $t/$s"; falhas=$((falhas + 1)); fi
done <<'LIST'
mesa hero 1667388969250-1c7220bf3f37
mesa g1 1414235077428-338989a2e8c0
mesa g2 1768949005507-8c0f571285f4
estudio hero 1635531955929-91958b3b33ea
estudio g1 1549271568-e87e07c5406b
estudio g2 1585747860715-2ba37e788b70
oficio hero 1454988501794-2992f706932e
oficio g1 1697946594607-04d755acff2b
oficio g2 1711571603482-6023e3721132
vitrine hero 1580600091413-a108b5b6a420
vitrine g1 1729487151777-b4be9098ecbb
vitrine g2 1635484957718-9550d2d18d6a
LIST
echo "falhas: $falhas"
```

Run: `sh "$OUT/fotos.sh"`
Expected: 12 linhas `modelo/slot.jpg q=NN <bytes> bytes` e, no fim, `falhas: 0`. Cada linha abaixo de 256000 bytes.

- [ ] **Step 2: Fallback (SÓ se alguma linha saiu `FALHOU`)**

Se a rede não entregar alguma foto, gere placeholders de gradiente para os 12 slots com o ffmpeg desta máquina (`/usr/local/bin/ffmpeg`), e em `LICENSES.md` (passo 4) troque a linha do arquivo por `placeholder de gradiente gerado localmente, a substituir pela dona`. Script:

```bash
#!/bin/sh
# FALLBACK (só se o download falhar): 12 JPEGs de gradiente, 1600x1000, gerados
# com o ffmpeg desta máquina (/usr/local/bin/ffmpeg). Marcar em LICENSES.md como
# placeholder a substituir pela dona.
cd /Users/madu/Developer/mine/osprano || exit 1
mk() { ffmpeg -loglevel error -y -f lavfi -i "gradients=size=1600x1000:c0=$3:c1=$4:nb_colors=2:x0=0:y0=0:x1=1600:y1=1000" -frames:v 1 -q:v 8 "public/templates/$1/$2.jpg"; }
mk mesa hero 0xb8532e 0xf6f1e7;   mk mesa g1 0x6b3a22 0xe9d8c4;   mk mesa g2 0x2a221c 0x8a5a3a
mk estudio hero 0x0f0f0f 0x4a4a4a; mk estudio g1 0xc9a24a 0x2a2a2a; mk estudio g2 0x3a3a3a 0xb3ada3
mk oficio hero 0xc2410c 0xffffff;  mk oficio g1 0x5f5f5f 0xf6f6f4;  mk oficio g2 0x1c1c1c 0xc2410c
mk vitrine hero 0xece6da 0x5e574d; mk vitrine g1 0x161412 0xece6da; mk vitrine g2 0x7a1f33 0xf7f2ea
ls -la public/templates/*/*.jpg
```

Run: `sh "$OUT/fotos-fallback.sh"` (só os slots que falharam precisam ser mantidos; refaça o passo 1 para os outros).
Expected: 12 JPEGs de 1600x1000 com ~22 KB.

- [ ] **Step 3: Verificar dimensão e tamanho**

Run: `cd /Users/madu/Developer/mine/osprano && for f in public/templates/*/*.jpg; do echo "$f $(sips -g pixelWidth -g pixelHeight "$f" | awk '/pixel/{print $2}' | tr '\n' 'x') $(stat -f %z "$f")"; done`
Expected: 12 linhas, largura 1600 (lado maior), tamanho ≤ 256000. Exemplo: `public/templates/mesa/hero.jpg 1600x1020x 246577`.

- [ ] **Step 4: Registrar as licenças**

Crie `public/templates/LICENSES.md`:

```markdown
# Fotos padrão dos modelos

Doze fotos genéricas do segmento, uma por slot (`hero`, `g1`, `g2`) de cada modelo
(spec 1.3). Todas do Unsplash, sob a [Unsplash License](https://unsplash.com/license):
uso comercial e não comercial liberado, sem permissão nem atribuição obrigatória.
Nenhuma mostra marca, nome de loja ou pessoa reconhecível: ilustram o negócio de um
terceiro, sempre com `alt=""`. Baixadas em 2026-09-17 a 1600 px no lado maior, JPEG,
com a qualidade ajustada para caber em 250 KB.

| Arquivo | Página no Unsplash | Autor(a) | Licença |
|---|---|---|---|
| mesa/hero.jpg | https://unsplash.com/photos/a-room-with-tables-and-chairs-e4B5AvA7Jqo | Glenov Brankovic | Unsplash License |
| mesa/g1.jpg | https://unsplash.com/photos/dish-on-white-ceramic-plate-N_Y88TWmGwA | Jay Wennington | Unsplash License |
| mesa/g2.jpg | https://unsplash.com/photos/candle-lit-in-a-glass-holder-on-a-bar-counter-OroGI4DFNX0 | Orion Stephens | Unsplash License |
| estudio/hero.jpg | https://unsplash.com/photos/a-black-and-white-photo-of-a-barber-shop-R4NC2ChuZSc | Stefan Schauberger | Unsplash License |
| estudio/g1.jpg | https://unsplash.com/photos/gray-stainless-steel-scissors-on-towel-pu20JkUx--A | Arthur Humeau | Unsplash License |
| estudio/g2.jpg | https://unsplash.com/photos/black-leather-barber-chair-near-brown-brick-wall-EW_rqoSdDes | Nathon Oski | Unsplash License |
| oficio/hero.jpg | https://unsplash.com/photos/flat-lay-photography-of-assorted-color-mechanical-tool-set-TtN_obfWlGw | Wesley Caribe | Unsplash License |
| oficio/g1.jpg | https://unsplash.com/photos/a-kitchen-with-a-stove-top-oven-next-to-a-window-vfFVFPHYeko | Mat Kilkeary | Unsplash License |
| oficio/g2.jpg | https://unsplash.com/photos/a-bunch-of-blue-bins-filled-with-lots-of-copper-ONZIRho_-TM | Guille B | Unsplash License |
| vitrine/hero.jpg | https://unsplash.com/photos/green-potted-plant-on-brown-wooden-desk-ZcxAH_33wiM | Erik Mclean | Unsplash License |
| vitrine/g1.jpg | https://unsplash.com/photos/a-rack-of-shirts-and-pants-in-a-store-6D_1ODPb7Os | Declan Sun | Unsplash License |
| vitrine/g2.jpg | https://unsplash.com/photos/a-tree-in-front-of-a-window-with-a-shelf-on-it-OZtfopnB2FM | Joey Huang | Unsplash License |

Para trocar uma foto: mesma regra (licença livre para uso comercial, sem marca, sem
pessoa reconhecível), 1600 px no lado maior, JPEG, até 250 KB, e a linha desta tabela
atualizada. `tests/site-catalog.test.ts` confere tamanho, formato e a presença aqui.
```

- [ ] **Step 5: Olhar as fotos**

Abra cada uma com a ferramenta Read (`public/templates/mesa/hero.jpg` etc.) e confirme: nada de marca legível, nome de loja ou rosto. Se alguma vier diferente do esperado (o CDN pode ter trocado), remova-a e use o fallback para aquele slot.

- [ ] **Step 6: Commit**

```bash
git add public/templates
git commit -m "$(cat <<'MSG'
feat(site): fotos padrão dos 4 modelos com registro de licença

Doze fotos genéricas do segmento (Unsplash License), 1600 px, até
250 KB, sem marca nem pessoa reconhecível: ilustram o negócio de um
terceiro e sempre saem com alt vazio.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 6: as 12 paletas (`src/components/site-templates/palettes.ts`)

**Files:**
- Create: `src/components/site-templates/palettes.ts`
- Test: `tests/palettes.test.ts`

Contexto: hex escolhidos para passar 4,5:1 nos quatro pares da spec 1.2 (verificado com o `contrastRatio` da Task 1; o par mais apertado é `rosa` accentFg/accent, 5,20). `paletteFor` cai na padrão do modelo quando o id não é dele: o `parseSiteContent` já faz isso no servidor, mas a view pode chegar de um estado local do editor (plano B).

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/palettes.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio } from "../convex/lib/contrast.ts";
import { PALETTE_IDS, TEMPLATE_IDS } from "../convex/lib/site.ts";
import { PALETTES, paletteFor, palettesOf } from "../src/components/site-templates/palettes.ts";

test("palettes: os ids em src batem com PALETTE_IDS do Convex, na mesma ordem", () => {
  for (const t of TEMPLATE_IDS) {
    assert.deepEqual(Object.keys(PALETTES[t]), [...PALETTE_IDS[t]], t);
    for (const id of PALETTE_IDS[t]) {
      assert.equal((PALETTES[t] as Record<string, { id: string }>)[id].id, id, `${t}.${id}`);
    }
  }
});

test("palettes: as 12 paletas passam 4,5:1 nos quatro pares da spec 1.2", () => {
  for (const t of TEMPLATE_IDS) {
    for (const p of palettesOf(t)) {
      const pairs: [string, string, string][] = [
        ["text/bg", p.text, p.bg],
        ["text/surface", p.text, p.surface],
        ["muted/bg", p.muted, p.bg],
        ["accentFg/accent", p.accentFg, p.accent],
      ];
      for (const [label, a, b] of pairs) {
        const ratio = contrastRatio(a, b);
        assert.ok(ratio >= 4.5, `${t}.${p.id} ${label}: ${ratio.toFixed(2)} < 4.5 (${a} sobre ${b})`);
      }
    }
  }
});

test("palettes: paletteFor cai na padrão quando o id é desconhecido ou de outro modelo", () => {
  assert.equal(paletteFor("mesa", "oliva").id, "oliva");
  assert.equal(paletteFor("mesa", "xyz").id, "terracota");
  assert.equal(paletteFor("mesa", "carvao").id, "terracota");
  assert.equal(paletteFor("estudio", "carvao").id, "carvao");
  assert.deepEqual(palettesOf("vitrine").map((p) => p.id), ["areia", "nevoa", "vinho"]);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --experimental-strip-types --test tests/palettes.test.ts`
Expected: `ERR_MODULE_NOT_FOUND` apontando `src/components/site-templates/palettes.ts`.

- [ ] **Step 3: Implementar**

Crie `src/components/site-templates/palettes.ts`:

```ts
// Import relativo com extensão de propósito: tests/palettes.test.ts carrega este
// arquivo em `node --experimental-strip-types`, que não lê os `paths` do tsconfig.
import { PALETTE_IDS, type PaletteId, type TemplateId } from "../../../convex/lib/site.ts";

/**
 * Uma paleta = 6 cores (spec 1.2). Contraste mínimo 4,5:1 nos pares
 * text/bg, text/surface, muted/bg e accentFg/accent, garantido por
 * tests/palettes.test.ts com `contrastRatio` de convex/lib/contrast.ts. Mudou um
 * hex, rode o teste antes de olhar o resultado.
 */
export interface Palette {
  id: string;
  name: string; // rótulo pt-BR para o editor
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentFg: string;
}

export const PALETTES: { [T in TemplateId]: Record<PaletteId<T>, Palette> } = {
  mesa: {
    terracota: {
      id: "terracota",
      name: "Terracota",
      bg: "#f6f1e7",
      surface: "#fbf8f2",
      text: "#2a221c",
      muted: "#6b5f55",
      accent: "#b8532e",
      accentFg: "#fff8f0",
    },
    oliva: {
      id: "oliva",
      name: "Oliva",
      bg: "#f4f3ee",
      surface: "#fbfaf6",
      text: "#1f2a1e",
      muted: "#5d6653",
      accent: "#4c6a3f",
      accentFg: "#f6f8f2",
    },
    noite: {
      id: "noite",
      name: "Noite",
      bg: "#1b1917",
      surface: "#262320",
      text: "#f3ede4",
      muted: "#b5aa9c",
      accent: "#e0a54a",
      accentFg: "#1b1917",
    },
  },
  estudio: {
    carvao: {
      id: "carvao",
      name: "Carvão",
      bg: "#0f0f0f",
      surface: "#1a1a1a",
      text: "#f5f2ea",
      muted: "#b3ada3",
      accent: "#c9a24a",
      accentFg: "#0f0f0f",
    },
    rosa: {
      id: "rosa",
      name: "Rosa",
      bg: "#faf5f2",
      surface: "#ffffff",
      text: "#2b1f1c",
      muted: "#6f5c56",
      accent: "#a64f41",
      accentFg: "#fff7f4",
    },
    marinho: {
      id: "marinho",
      name: "Marinho",
      bg: "#0f1c2e",
      surface: "#182741",
      text: "#f1ede4",
      muted: "#b7b1a4",
      accent: "#e2cfa8",
      accentFg: "#0f1c2e",
    },
  },
  oficio: {
    laranja: {
      id: "laranja",
      name: "Laranja",
      bg: "#ffffff",
      surface: "#f6f6f4",
      text: "#1c1c1c",
      muted: "#5f5f5f",
      accent: "#c2410c",
      accentFg: "#ffffff",
    },
    azul: {
      id: "azul",
      name: "Azul",
      bg: "#ffffff",
      surface: "#f4f6fa",
      text: "#16202e",
      muted: "#5a6472",
      accent: "#1d4ed8",
      accentFg: "#ffffff",
    },
    verde: {
      id: "verde",
      name: "Verde",
      bg: "#ffffff",
      surface: "#f3f6f3",
      text: "#182019",
      muted: "#56645a",
      accent: "#1f6b3a",
      accentFg: "#ffffff",
    },
  },
  vitrine: {
    areia: {
      id: "areia",
      name: "Areia",
      bg: "#ece6da",
      surface: "#f6f2ea",
      text: "#161412",
      muted: "#5e574d",
      accent: "#161412",
      accentFg: "#f6f2ea",
    },
    nevoa: {
      id: "nevoa",
      name: "Névoa",
      bg: "#e6ebf0",
      surface: "#f3f6f9",
      text: "#17202b",
      muted: "#56616e",
      accent: "#2b5aa6",
      accentFg: "#ffffff",
    },
    vinho: {
      id: "vinho",
      name: "Vinho",
      bg: "#f7f2ea",
      surface: "#fdfaf5",
      text: "#2a1a1e",
      muted: "#6d5a5e",
      accent: "#7a1f33",
      accentFg: "#fbf3f3",
    },
  },
};

/** Paleta pelo id; id desconhecido (ou de outro modelo) cai na padrão do modelo. */
export function paletteFor(template: TemplateId, id: string): Palette {
  const set = PALETTES[template] as Record<string, Palette>;
  return set[id] ?? set[PALETTE_IDS[template][0]];
}

/** As 3 paletas do modelo, na ordem da spec (a primeira é a padrão). */
export function palettesOf(template: TemplateId): Palette[] {
  const set = PALETTES[template] as Record<string, Palette>;
  return PALETTE_IDS[template].map((id) => set[id]);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --experimental-strip-types --test tests/palettes.test.ts 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `ℹ tests 3`, `ℹ pass 3`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/components/site-templates/palettes.ts tests/palettes.test.ts
git commit -m "$(cat <<'MSG'
feat(site): 12 paletas dos modelos com contraste AA garantido por teste

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 7: catálogo `TEMPLATES` (`src/components/site-templates/catalog.ts`)

**Files:**
- Create: `src/components/site-templates/catalog.ts`
- Test: `tests/site-catalog.test.ts`

Contexto: a spec põe `TEMPLATES` em `index.ts`; aqui ele mora em `catalog.ts` (puro, sem JSX, carregável pelo teste) e `index.tsx` (Task 12) o reexporta, então quem importa `@/components/site-templates` vê o mesmo `TEMPLATES`. `name`, `description` e `itemsLabel` são pt-BR (editor e página Sites, planos B e C). O teste confere fotos, tamanho, formato e a linha em `LICENSES.md`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/site-catalog.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { PALETTE_IDS, TEMPLATE_IDS } from "../convex/lib/site.ts";
import { TEMPLATES } from "../src/components/site-templates/catalog.ts";

const publicDir = new URL("../public", import.meta.url);

test("catalog: o CTA de cada modelo é o da spec 1.6", () => {
  assert.equal(TEMPLATES.mesa.ctaKey, "reserve");
  assert.equal(TEMPLATES.estudio.ctaKey, "book");
  assert.equal(TEMPLATES.oficio.ctaKey, "quote");
  assert.equal(TEMPLATES.vitrine.ctaKey, "callNow");
});

test("catalog: as paletas do catálogo são as do Convex, na ordem", () => {
  for (const t of TEMPLATE_IDS) {
    assert.equal(TEMPLATES[t].id, t);
    assert.deepEqual(TEMPLATES[t].palettes.map((p) => p.id), [...PALETTE_IDS[t]]);
    assert.ok(TEMPLATES[t].name.length > 0 && TEMPLATES[t].itemsLabel.length > 0, t);
  }
});

test("catalog: as 12 fotos padrão existem, são JPEG, cabem em 250 KB e estão no LICENSES.md", () => {
  const licenses = readFileSync(new URL("templates/LICENSES.md", publicDir + "/"), "utf8");
  for (const t of TEMPLATE_IDS) {
    for (const [slot, path] of Object.entries(TEMPLATES[t].photos)) {
      assert.equal(path, `/templates/${t}/${slot}.jpg`);
      const file = new URL(`.${path}`, publicDir + "/");
      const size = statSync(file).size;
      assert.ok(size > 0 && size <= 256000, `${path}: ${size} bytes`);
      const head = readFileSync(file).subarray(0, 2);
      assert.deepEqual([...head], [0xff, 0xd8], `${path} não é JPEG`);
      assert.ok(licenses.includes(`${t}/${slot}.jpg`), `${path} sem linha em LICENSES.md`);
    }
  }
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --experimental-strip-types --test tests/site-catalog.test.ts`
Expected: `ERR_MODULE_NOT_FOUND` apontando `catalog.ts`.

- [ ] **Step 3: Implementar**

Crie `src/components/site-templates/catalog.ts`:

```ts
// Puro (sem JSX) e com imports relativos `.ts`: tests/site-catalog.test.ts carrega
// este arquivo em `node --experimental-strip-types`. `index.tsx` o reexporta.
import type { TemplateId } from "../../../convex/lib/site.ts";
import { palettesOf, type Palette } from "./palettes.ts";

/** Chave do rótulo do CTA primário (spec 1.6): `callNow` mora no topo do PreviewDict, as outras em templates.<id>. */
export type CtaKey = "reserve" | "book" | "quote" | "callNow";

export interface TemplateMeta {
  id: TemplateId;
  name: string; // pt-BR: editor e página Sites
  description: string; // pt-BR: os segmentos, para ela reconhecer o modelo
  itemsLabel: string; // pt-BR: rótulo do bloco de itens no editor (spec 3.1)
  ctaKey: CtaKey;
  palettes: Palette[];
  photos: { hero: string; g1: string; g2: string }; // fotos padrão em /public (spec 1.3)
}

function photos(id: TemplateId): TemplateMeta["photos"] {
  return {
    hero: `/templates/${id}/hero.jpg`,
    g1: `/templates/${id}/g1.jpg`,
    g2: `/templates/${id}/g2.jpg`,
  };
}

export const TEMPLATES: Record<TemplateId, TemplateMeta> = {
  mesa: {
    id: "mesa",
    name: "Mesa",
    description: "Restaurante, café, bar, pizzaria, padaria, confeitaria, sorveteria",
    itemsLabel: "Cardápio",
    ctaKey: "reserve",
    palettes: palettesOf("mesa"),
    photos: photos("mesa"),
  },
  estudio: {
    id: "estudio",
    name: "Estúdio",
    description: "Barbearia, salão, manicure, spa, tatuagem, academia, personal, yoga",
    itemsLabel: "Serviços",
    ctaKey: "book",
    palettes: palettesOf("estudio"),
    photos: photos("estudio"),
  },
  oficio: {
    id: "oficio",
    name: "Ofício",
    description: "Encanador, eletricista, chaveiro, mecânica, lava-rápido, autoescola, fotógrafo",
    itemsLabel: "Serviços",
    ctaKey: "quote",
    palettes: palettesOf("oficio"),
    photos: photos("oficio"),
  },
  vitrine: {
    id: "vitrine",
    name: "Vitrine",
    description: "Loja, clínica, dentista, imobiliária, advogado e qualquer outro segmento",
    itemsLabel: "Destaques",
    ctaKey: "callNow",
    palettes: palettesOf("vitrine"),
    photos: photos("vitrine"),
  },
};
```

- [ ] **Step 4: Rodar e ver passar, mais a suíte inteira**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && node --experimental-strip-types --test tests/*.test.ts 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `tsc` e `eslint` sem saída; `ℹ tests 262`, `ℹ pass 262`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/components/site-templates/catalog.ts tests/site-catalog.test.ts
git commit -m "$(cat <<'MSG'
feat(site): catálogo dos modelos (nome, segmentos, CTA, paletas, fotos padrão)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```


## Chunk 4: blocos comuns e os modelos Mesa e Estúdio

Componentes React sem hooks (renderizam no servidor). Sem teste unitário próprio: `tsc` + `eslint` aqui, render real na chunk 6 (páginas públicas) e guardas de fonte na chunk 7 (Task 17: horário/preço/itens só de `view.*`, `@container`, sem viewport, sem `sticky`, `alt` da foto padrão vazio). Escreva os arquivos exatamente como estão: eles já passam nessas guardas.

Convenções dos modelos (spec 1.4 e Decisões):
- raiz com `@container`; variantes `@md:` (≥ 448 px de contêiner), `@3xl:` (≥ 768 px) e `@5xl:` (≥ 1024 px); nunca `sm:`/`md:`/`lg:` de viewport;
- nenhuma unidade de viewport (`dvh`, `vh`, `vw`, `h-screen`); alturas fixas em px quando precisa (`min-h-[640px]`);
- nada de `sticky`/`fixed`;
- paleta por custom properties (`--site-bg`, `--site-text`, ...), lidas com a forma `bg-(--site-bg)` do Tailwind v4;
- `<img>` via `Photo` (comentário de eslint-disable já embutido), foto padrão `alt=""`, foto principal `alt={heroAlt(view)}` (nome só se for upload);
- horário, preço, itens e galeria só de `view.*`; texto de `tr.*` só em rótulo, CTA, slogan e "sobre" padrão.

### Task 8: blocos comuns (`src/components/site-templates/shared.tsx`)

**Files:**
- Create: `src/components/site-templates/shared.tsx`

Contexto: `SiteView` e `TemplateProps` moram aqui (e são reexportados por `index.tsx`) para os modelos não importarem `index.tsx` em ciclo. `Photo` não usa `decoding="async"` de propósito (foto em branco nas capturas headless) e só a galeria é `lazy`. `Contact` aceita `withPlace={false}` para os modelos que já mostram o endereço num bloco "onde estamos" (Mesa, Vitrine) não repetirem. `Rating` tem `onDark` para o hero escuro do Estúdio.

- [ ] **Step 1: Criar o arquivo**

```tsx
import type { CSSProperties, ReactNode } from "react";
import {
  MdCall,
  MdCheckCircleOutline,
  MdOutlineChat,
  MdOutlineMail,
  MdOutlinePlace,
  MdStar,
  MdStarBorder,
} from "react-icons/md";
import { FaInstagram } from "react-icons/fa6";
import { ctaOptions, type SiteContent, type SiteCta, type SiteHours, type SiteItem, type Weekday } from "@convex/lib/site";
import { DICTS, type Locale, type TemplateDict } from "@/lib/preview-i18n";
import type { Palette } from "./palettes";
import type { CtaKey } from "./catalog";

/**
 * O que o modelo recebe (spec 1.4): o conteúdo salvo mais as URLs já resolvidas
 * pela página. `heroUrl` é o upload ou a foto padrão do modelo; `galleryUrls` são
 * SÓ uploads (vazio: a galeria não renderiza). Quem monta é a página, nunca o
 * modelo (`buildSiteView` em index.tsx).
 */
export type SiteView = SiteContent & { heroUrl: string; galleryUrls: string[] };

export interface TemplateProps {
  view: SiteView;
  palette: Palette;
  tr: TemplateDict;
  locale: Locale;
}

/** Largura de leitura comum aos quatro modelos. Sem unidade de viewport, de propósito. */
export const CONTAINER = "mx-auto w-full max-w-[1120px] px-6";

/** Paleta como custom properties no raiz; `--site-line` (divisórias) deriva do texto. */
export function paletteStyle(p: Palette): CSSProperties {
  return {
    "--site-bg": p.bg,
    "--site-surface": p.surface,
    "--site-text": p.text,
    "--site-muted": p.muted,
    "--site-accent": p.accent,
    "--site-accent-fg": p.accentFg,
    "--site-line": "color-mix(in srgb, var(--site-text) 14%, transparent)",
  } as CSSProperties;
}

/**
 * Raiz de todo modelo. `lang` declara o idioma real do prospect (o documento é
 * pt-BR). `@container` (Tailwind v4) faz `@md:`/`@3xl:`/`@5xl:` seguirem a largura
 * DESTE div, não da janela: a prévia ao vivo do editor e a miniatura renderizam o
 * site num contêiner menor que a viewport (spec, Decisões). `flex-1` deixa a
 * página pública esticar o site até o fim da janela sem o modelo usar `dvh`.
 */
export function SiteRoot({
  palette,
  locale,
  children,
}: {
  palette: Palette;
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <div
      lang={locale}
      style={paletteStyle(palette)}
      className="@container flex flex-1 flex-col bg-(--site-bg) text-(--site-text) antialiased [font-family:var(--font-geist-sans)]"
    >
      {children}
    </div>
  );
}

export function Section({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`${CONTAINER} py-14 @3xl:py-20 ${className}`}>{children}</section>;
}

/**
 * `<img>` e não `next/image`: as fotos vêm do storage do Convex (*.convex.cloud,
 * host que muda por deployment e exigiria `remotePatterns`) e de /public; não há
 * ganho de otimização que pague isso aqui (spec 1.4). Sem `decoding="async"`:
 * o Chrome headless das capturas não conclui a decodificação sob virtual time
 * e a foto sai em branco. `lazy` só na galeria (uploads, podem ser seis).
 */
export function Photo({
  src,
  alt,
  className,
  lazy = false,
}: {
  src: string;
  alt: string;
  className?: string;
  lazy?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading={lazy ? "lazy" : undefined} />
  );
}

/** alt da foto principal: só o upload dela leva o nome do negócio; a padrão é decoração (spec 4). */
export function heroAlt(view: SiteView): string {
  return view.heroImage ? view.name : "";
}

export const hasItems = (view: SiteView): boolean => (view.items?.length ?? 0) > 0;
export const hasHours = (view: SiteView): boolean => (view.hours?.length ?? 0) > 0;
export const hasGallery = (view: SiteView): boolean => view.galleryUrls.length > 0;
export const hasPlace = (view: SiteView): boolean => !!(view.address || view.city);
/** Há algo para a seção de contato mostrar (canal ou Instagram; o endereço conta só onde não há bloco "onde estamos"). */
export const hasContact = (view: SiteView, withPlace = true): boolean =>
  ctaOptions(view).length > 0 || !!view.instagram || (withPlace && hasPlace(view));

/** Rótulo do CTA (spec 1.6): `callNow` mora no topo do dicionário, os outros no modelo; e-mail é sempre `email`. */
export function ctaLabel(cta: SiteCta, ctaKey: CtaKey, tr: TemplateDict, locale: Locale): string {
  if (cta.kind === "email") return tr.email;
  return ctaKey === "callNow" ? DICTS[locale].callNow : tr[ctaKey];
}

function CtaIcon({ kind, size = 18 }: { kind: SiteCta["kind"]; size?: number }) {
  if (kind === "whatsapp") return <MdOutlineChat size={size} aria-hidden />;
  if (kind === "email") return <MdOutlineMail size={size} aria-hidden />;
  return <MdCall size={size} aria-hidden />;
}

export function CtaLink({ cta, label, className }: { cta: SiteCta; label: string; className: string }) {
  const external = cta.kind === "whatsapp" ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <a href={cta.href} className={className} {...external}>
      <CtaIcon kind={cta.kind} />
      {label}
    </a>
  );
}

/** CTA primário (spec 1.6). Sem canal preenchido devolve null: nunca um botão que não leva a nada. */
export function PrimaryCta({
  view,
  tr,
  locale,
  ctaKey,
  className,
}: {
  view: SiteView;
  tr: TemplateDict;
  locale: Locale;
  ctaKey: CtaKey;
  className: string;
}) {
  const cta = ctaOptions(view)[0];
  if (!cta) return null;
  return <CtaLink cta={cta} label={ctaLabel(cta, ctaKey, tr, locale)} className={className} />;
}

/** Segundo canal, ao lado do primário (agendar + telefone, como nas referências). Telefone mostra o próprio número. */
export function SecondaryCta({
  view,
  tr,
  locale,
  className,
}: {
  view: SiteView;
  tr: TemplateDict;
  locale: Locale;
  className: string;
}) {
  const cta = ctaOptions(view)[1];
  if (!cta) return null;
  return <CtaLink cta={cta} label={contactLabel(cta, view, tr, locale)} className={className} />;
}

/** Rótulo "de contato" de um canal: o próprio número, "WhatsApp" ou o e-mail (faixas e CTA secundário). */
export function contactLabel(cta: SiteCta, view: SiteView, tr: TemplateDict, locale: Locale): string {
  if (cta.kind === "phone") return view.phone ?? DICTS[locale].call;
  if (cta.kind === "whatsapp") return DICTS[locale].whatsapp;
  return view.email ?? tr.email;
}

/** Nota e avaliações: só dado do lead, nunca do dicionário. */
export function Rating({
  view,
  locale,
  className = "",
  onDark = false,
}: {
  view: SiteView;
  locale: Locale;
  className?: string;
  onDark?: boolean; // dentro de um hero escuro com véu (estúdio): o secundário fica branco translúcido
}) {
  if (view.rating == null) return null;
  const full = Math.round(view.rating);
  return (
    <div className={`inline-flex flex-wrap items-center gap-2 text-sm ${className}`}>
      <span className="inline-flex text-(--site-accent)" aria-hidden>
        {Array.from({ length: 5 }, (_, i) =>
          i < full ? <MdStar key={i} size={16} /> : <MdStarBorder key={i} size={16} />,
        )}
      </span>
      <span className="font-semibold tabular-nums">{view.rating.toFixed(1)}</span>
      {view.reviewsCount != null && (
        <span className={onDark ? "text-white/70" : "text-(--site-muted)"}>
          {view.reviewsCount} {DICTS[locale].reviews}
        </span>
      )}
    </div>
  );
}

/**
 * Lista de itens (cardápio / serviços / destaques). Nome, preço e nota saem SÓ de
 * `items` (o `view.items` salvo): o dicionário não fornece valor aqui.
 */
export function Items({
  items,
  heading,
  headingClass,
  variant,
}: {
  items: SiteItem[] | undefined;
  heading: string;
  headingClass: string;
  variant: "lines" | "cards" | "checks";
}) {
  if (!items || items.length === 0) return null;
  const grid =
    variant === "lines"
      ? "grid gap-x-12 gap-y-4 @3xl:grid-cols-2"
      : "grid gap-4 @md:grid-cols-2 @5xl:grid-cols-3";
  return (
    <Section>
      <h2 className={headingClass}>{heading}</h2>
      <ul className={`mt-8 ${grid}`}>
        {items.map((it, i) => (
          <li
            key={`${it.name}-${i}`}
            className={
              variant === "lines"
                ? "border-b border-(--site-line) pb-4"
                : variant === "cards"
                  ? "rounded-xl bg-(--site-surface) p-5"
                  : "flex gap-3"
            }
          >
            {variant === "checks" && (
              <MdCheckCircleOutline size={22} className="mt-0.5 shrink-0 text-(--site-accent)" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-semibold">{it.name}</span>
                {it.price && <span className="shrink-0 tabular-nums text-(--site-muted)">{it.price}</span>}
              </div>
              {it.note && <p className="mt-1 text-sm leading-relaxed text-(--site-muted)">{it.note}</p>}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const DAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
const dayNameCache = new Map<Locale, string[]>();

/** Nome curto do dia via Intl: nenhuma string nova no dicionário (spec 1.5). Índice 0 = domingo. */
export function weekdayNames(locale: Locale): string[] {
  let names = dayNameCache.get(locale);
  if (!names) {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
    // 2024-01-07 é um domingo em UTC; os seis dias seguintes vão de segunda a sábado.
    names = Array.from({ length: 7 }, (_, d) => fmt.format(new Date(Date.UTC(2024, 0, 7 + d))));
    dayNameCache.set(locale, names);
  }
  return names;
}

/**
 * Horário: renderiza só quando `hours` (o `view.hours` salvo) tem linha. Dia sem
 * linha sai como `closed`. Os valores das faixas vêm só do dado.
 */
export function Hours({
  hours,
  heading,
  closed,
  locale,
  headingClass,
}: {
  hours: SiteHours[] | undefined;
  heading: string;
  closed: string;
  locale: Locale;
  headingClass: string;
}) {
  if (!hours || hours.length === 0) return null;
  const names = weekdayNames(locale);
  const byDay = new Map(hours.map((h) => [h.day, h]));
  return (
    <div>
      <h2 className={headingClass}>{heading}</h2>
      <dl className="mt-6 divide-y divide-(--site-line) border-y border-(--site-line)">
        {DAY_ORDER.map((d) => {
          const h = byDay.get(d);
          return (
            <div key={d} className="flex justify-between gap-6 py-3 text-sm">
              <dt className="capitalize text-(--site-muted)">{names[d]}</dt>
              <dd className="tabular-nums">{h ? `${h.open} - ${h.close}` : closed}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/** Onde estamos: só endereço e cidade, só quando existem. */
export function Visit({ view, heading, headingClass }: { view: SiteView; heading: string; headingClass: string }) {
  if (!hasPlace(view)) return null;
  return (
    <div>
      <h2 className={headingClass}>{heading}</h2>
      <p className="mt-6 flex items-start gap-3 text-lg leading-relaxed">
        <MdOutlinePlace size={22} className="mt-1 shrink-0 text-(--site-accent)" aria-hidden />
        <span>
          {view.address && <span className="block">{view.address}</span>}
          {view.city && <span className="block text-(--site-muted)">{view.city}</span>}
        </span>
      </p>
    </div>
  );
}

/**
 * Contato: uma linha por canal preenchido (telefone, WhatsApp, e-mail, Instagram)
 * mais o endereço quando existe. Sem canal e sem endereço não renderiza (spec 4).
 */
export function Contact({
  view,
  heading,
  headingClass,
  withPlace = true,
}: {
  view: SiteView;
  heading: string;
  headingClass: string;
  withPlace?: boolean; // false quando o modelo já mostra o endereço num bloco "onde estamos"
}) {
  const rows: { key: string; icon: ReactNode; value: string; href?: string; external?: boolean }[] = [];
  if (withPlace && (view.address || view.city)) {
    rows.push({
      key: "place",
      icon: <MdOutlinePlace size={20} aria-hidden />,
      value: [view.address, view.city].filter(Boolean).join(", "),
    });
  }
  if (view.phone) {
    rows.push({
      key: "phone",
      icon: <MdCall size={20} aria-hidden />,
      value: view.phone,
      href: `tel:${view.phone.replace(/\s+/g, "")}`,
    });
  }
  if (view.whatsapp) {
    rows.push({
      key: "whatsapp",
      icon: <MdOutlineChat size={20} aria-hidden />,
      value: `+${view.whatsapp}`,
      href: `https://wa.me/${view.whatsapp}`,
      external: true,
    });
  }
  if (view.email) {
    rows.push({ key: "email", icon: <MdOutlineMail size={20} aria-hidden />, value: view.email, href: `mailto:${view.email}` });
  }
  if (view.instagram) {
    rows.push({
      key: "instagram",
      icon: <FaInstagram size={19} aria-hidden />,
      value: `@${view.instagram}`,
      href: `https://instagram.com/${view.instagram}`,
      external: true,
    });
  }
  if (rows.length === 0) return null;
  return (
    <div>
      <h2 className={headingClass}>{heading}</h2>
      <ul className="mt-6 space-y-3">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-3 text-base">
            <span className="text-(--site-accent)">{r.icon}</span>
            {r.href ? (
              <a
                href={r.href}
                className="underline decoration-(--site-line) underline-offset-4 hover:decoration-(--site-accent)"
                {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {r.value}
              </a>
            ) : (
              <span>{r.value}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Galeria: SÓ uploads dela (spec 1.4). Vazia, não renderiza. alt="" sempre. */
export function Gallery({ urls, heading, headingClass }: { urls: string[]; heading: string; headingClass: string }) {
  if (urls.length === 0) return null;
  return (
    <Section>
      <h2 className={headingClass}>{heading}</h2>
      <div className="mt-8 grid grid-cols-2 gap-3 @3xl:grid-cols-3">
        {urls.map((u) => (
          <Photo key={u} src={u} alt="" lazy className="aspect-[4/3] w-full rounded-lg object-cover" />
        ))}
      </div>
    </Section>
  );
}

export function Footer({ name }: { name: string }) {
  return (
    <footer className="mt-auto border-t border-(--site-line) px-6 py-8 text-center text-[11px] uppercase tracking-[0.22em] text-(--site-muted)">
      {name}
    </footer>
  );
}
```

- [ ] **Step 2: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/components/site-templates`
Expected: sem saída.

- [ ] **Step 3: Commit**

```bash
git add src/components/site-templates/shared.tsx
git commit -m "$(cat <<'MSG'
feat(site): blocos comuns dos modelos (raiz com paleta, CTA, itens, horário, contato, galeria)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 9: modelo Mesa (`src/components/site-templates/mesa.tsx`)

**Files:**
- Create: `src/components/site-templates/mesa.tsx`

- [ ] **Step 1: Olhar a âncora**

Abra com Read `/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/refs-duda/jpg/cutler-and-co.jpg` (Cutler & Co.). O que o modelo toma emprestado: cabeçalho só tipográfico, foto grande à direita com coluna de texto à esquerda, bloco institucional em duas colunas, faixa de fotos sem legenda, CTA discreto. O que NÃO entra: cardápio fixo, horário fixo, endereço inventado; seções de dado só com dado.

- [ ] **Step 2: Criar o arquivo**

```tsx
import {
  CONTAINER,
  Contact,
  Footer,
  Hours,
  Items,
  Photo,
  PrimaryCta,
  Rating,
  Section,
  SiteRoot,
  Visit,
  hasContact,
  hasHours,
  hasPlace,
  heroAlt,
  type TemplateProps,
} from "./shared";
import { TEMPLATES } from "./catalog";

/**
 * Mesa: restaurante, café, bar, padaria. Composição inspirada em Cutler & Co.:
 * cabeçalho tipográfico, hero com foto grande à direita e coluna de texto à
 * esquerda, bloco institucional em duas colunas, faixa de fotos sem legenda,
 * CTA discreto (sublinhado ou contorno fino). Serifada (Fraunces) nos títulos.
 */
const serif = "[font-family:var(--font-fraunces)]";
const h2 = `${serif} text-3xl font-medium tracking-tight @3xl:text-4xl`;
const CTA = TEMPLATES.mesa.ctaKey;

export function Hero({ view, tr, locale }: TemplateProps) {
  return (
    <>
      <header className={`${CONTAINER} flex items-center justify-between gap-6 py-5`}>
        <span className={`${serif} text-2xl font-semibold tracking-tight`}>{view.name}</span>
        <PrimaryCta
          view={view}
          tr={tr}
          locale={locale}
          ctaKey={CTA}
          className="hidden items-center gap-2 text-sm font-medium underline decoration-(--site-accent) underline-offset-4 hover:text-(--site-accent) @md:inline-flex"
        />
      </header>
      <section className={`${CONTAINER} grid gap-8 pb-14 pt-2 @5xl:grid-cols-[300px_1fr] @5xl:gap-14 @5xl:pb-20`}>
        <div className="order-2 flex flex-col justify-center @5xl:order-1">
          <p className={`${serif} text-2xl italic leading-snug @3xl:text-3xl`}>{view.tagline || tr.tagline}</p>
          <Rating view={view} locale={locale} className="mt-5" />
          <PrimaryCta
            view={view}
            tr={tr}
            locale={locale}
            ctaKey={CTA}
            className="mt-8 inline-flex w-fit items-center gap-2 rounded-full border border-(--site-text) px-6 py-3 text-sm font-semibold transition-colors hover:bg-(--site-text) hover:text-(--site-bg)"
          />
        </div>
        <Photo
          src={view.heroUrl}
          alt={heroAlt(view)}
         
          className="order-1 aspect-[4/3] w-full object-cover @5xl:order-2 @5xl:aspect-[16/11]"
        />
      </section>
    </>
  );
}

export function Mesa(props: TemplateProps) {
  const { view, palette, tr, locale } = props;
  const photos = TEMPLATES.mesa.photos;
  const infoHeading = "text-xs font-semibold uppercase tracking-[0.2em] text-(--site-muted)";
  return (
    <SiteRoot palette={palette} locale={locale}>
      <Hero {...props} />

      {/* Sobre: bloco institucional curto em duas colunas, depois a faixa de fotos (decoração fixa, alt vazio) */}
      <section className="border-t border-(--site-line)">
        <div className={`${CONTAINER} grid gap-6 py-14 @3xl:grid-cols-[1fr_2fr] @3xl:py-20`}>
          <h2 className={infoHeading}>{tr.aboutHeading}</h2>
          <p className={`${serif} max-w-2xl text-lg leading-relaxed @3xl:text-xl`}>{view.about || tr.about}</p>
        </div>
        <div className={`${CONTAINER} grid grid-cols-2 gap-3 pb-14 @3xl:pb-20`}>
          <Photo src={photos.g1} alt="" className="aspect-[4/3] w-full object-cover" />
          <Photo src={photos.g2} alt="" className="aspect-[4/3] w-full object-cover" />
        </div>
      </section>

      <Items items={view.items} heading={tr.itemsHeading} headingClass={h2} variant="lines" />

      {(hasHours(view) || hasPlace(view) || hasContact(view, false)) && (
        <section className="border-t border-(--site-line)">
          <Section className="grid gap-12 @3xl:grid-cols-3">
            <Hours hours={view.hours} heading={tr.hoursHeading} closed={tr.closed} locale={locale} headingClass={infoHeading} />
            <Visit view={view} heading={tr.visitHeading} headingClass={infoHeading} />
            <Contact view={view} heading={tr.contactHeading} headingClass={infoHeading} withPlace={false} />
          </Section>
        </section>
      )}

      <Footer name={view.name} />
    </SiteRoot>
  );
}
```

- [ ] **Step 3: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/components/site-templates`
Expected: sem saída.

- [ ] **Step 4: Commit**

```bash
git add src/components/site-templates/mesa.tsx
git commit -m "$(cat <<'MSG'
feat(site): modelo Mesa (restaurante, café, bar, padaria)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 10: modelo Estúdio (`src/components/site-templates/estudio.tsx`)

**Files:**
- Create: `src/components/site-templates/estudio.tsx`

- [ ] **Step 1: Olhar a âncora**

Abra com Read `/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/refs-duda/jpg/barber-and-co.jpg` (Barber & Co). O que entra: hero em foto cheia com véu escuro, nome em caixa alta bold, dois CTAs lado a lado (agendar + telefone), faixa de agendamento. O que NÃO entra: CTA flutuante fixo ao rolar (depende da viewport), grade de equipe, texto "melhor da cidade".

- [ ] **Step 2: Criar o arquivo**

```tsx
import {
  CONTAINER,
  Contact,
  CtaLink,
  Footer,
  Gallery,
  Hours,
  Items,
  Photo,
  PrimaryCta,
  Rating,
  SecondaryCta,
  Section,
  SiteRoot,
  contactLabel,
  hasContact,
  hasHours,
  heroAlt,
  type TemplateProps,
} from "./shared";
import { TEMPLATES } from "./catalog";
import { ctaOptions } from "@convex/lib/site";

/**
 * Estúdio: barbearia, salão, spa, tatuagem, academia. Composição inspirada em
 * Barber & Co: hero em foto cheia com véu escuro, nome em caixa alta bold
 * (Bricolage Grotesque), dois CTAs lado a lado (agendar + telefone), bloco de
 * posicionamento com foto ao lado, serviços em cartões, faixa de agendamento.
 * Sem CTA fixo ao rolar: `fixed`/`sticky` dependem da viewport (spec, Decisões).
 */
const display = "[font-family:var(--font-bricolage)]";
const h2 = `${display} text-3xl font-bold uppercase tracking-tight @3xl:text-4xl`;
const CTA = TEMPLATES.estudio.ctaKey;
const solid =
  "inline-flex items-center gap-2 rounded-full bg-(--site-accent) px-6 py-3 text-sm font-bold uppercase tracking-wider text-(--site-accent-fg) transition-opacity hover:opacity-90";

export function Hero({ view, tr, locale }: TemplateProps) {
  return (
    <section className="relative isolate flex min-h-[640px] flex-col text-white @5xl:min-h-[760px]">
      <Photo src={view.heroUrl} alt={heroAlt(view)}  className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.55),rgba(0,0,0,0.35)_40%,rgba(0,0,0,0.8))]"
        aria-hidden
      />
      <header className={`${CONTAINER} flex items-center justify-between gap-6 py-5`}>
        <span className={`${display} text-lg font-bold uppercase tracking-[0.18em]`}>{view.name}</span>
        <PrimaryCta
          view={view}
          tr={tr}
          locale={locale}
          ctaKey={CTA}
          className="hidden items-center gap-2 rounded-full bg-(--site-accent) px-4 py-2 text-xs font-bold uppercase tracking-wider text-(--site-accent-fg) @md:inline-flex"
        />
      </header>
      <div className={`${CONTAINER} flex flex-1 flex-col items-center justify-center py-16 text-center`}>
        <h1
          className={`${display} max-w-4xl text-balance text-5xl font-extrabold uppercase leading-[0.95] tracking-tight @3xl:text-7xl @5xl:text-8xl`}
        >
          {view.name}
        </h1>
        <p className="mt-6 max-w-xl text-sm uppercase tracking-[0.2em] text-white/80 @3xl:text-base">
          {view.tagline || tr.tagline}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <PrimaryCta view={view} tr={tr} locale={locale} ctaKey={CTA} className={solid} />
          <SecondaryCta
            view={view}
            tr={tr}
            locale={locale}
            className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
          />
        </div>
        <Rating view={view} locale={locale} className="mt-6" onDark />
      </div>
    </section>
  );
}

export function Estudio(props: TemplateProps) {
  const { view, palette, tr, locale } = props;
  const photos = TEMPLATES.estudio.photos;
  const primary = ctaOptions(view)[0];
  return (
    <SiteRoot palette={palette} locale={locale}>
      <Hero {...props} />

      {/* Posicionamento: texto + foto de apoio (decoração fixa, alt vazio) */}
      <Section className="grid items-center gap-10 @3xl:grid-cols-2 @3xl:gap-16">
        <div>
          <h2 className={h2}>{tr.aboutHeading}</h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-(--site-muted)">{view.about || tr.about}</p>
        </div>
        <Photo src={photos.g1} alt="" className="aspect-[4/5] w-full rounded-2xl object-cover" />
      </Section>

      <Items items={view.items} heading={tr.itemsHeading} headingClass={h2} variant="cards" />

      <Gallery urls={view.galleryUrls} heading={tr.galleryHeading} headingClass={h2} />

      {/* Agendar: só com canal preenchido, senão a faixa não existe */}
      {primary && (
        <section className="bg-(--site-accent) text-(--site-accent-fg)">
          <div className={`${CONTAINER} flex flex-col items-start gap-6 py-14 @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:py-16`}>
            <h2 className={`${display} text-3xl font-bold uppercase tracking-tight @3xl:text-4xl`}>{tr.book}</h2>
            <CtaLink
              cta={primary}
              label={contactLabel(primary, view, tr, locale)}
              className="inline-flex items-center gap-2 rounded-full bg-(--site-bg) px-6 py-3 text-sm font-bold tracking-wide text-(--site-text)"
            />
          </div>
        </section>
      )}

      {(hasHours(view) || hasContact(view)) && (
        <Section className="grid gap-12 @3xl:grid-cols-[1fr_1fr_1.2fr] @3xl:items-start">
          <Hours hours={view.hours} heading={tr.hoursHeading} closed={tr.closed} locale={locale} headingClass={h2} />
          <Contact view={view} heading={tr.contactHeading} headingClass={h2} />
          <Photo src={photos.g2} alt="" className="hidden aspect-[4/3] w-full rounded-2xl object-cover @3xl:block" />
        </Section>
      )}

      <Footer name={view.name} />
    </SiteRoot>
  );
}
```

- [ ] **Step 3: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/components/site-templates`
Expected: sem saída.

- [ ] **Step 4: Commit**

```bash
git add src/components/site-templates/estudio.tsx
git commit -m "$(cat <<'MSG'
feat(site): modelo Estúdio (barbearia, salão, spa, tatuagem, academia)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```


## Chunk 5: modelos Ofício e Vitrine, ponto de entrada e miniatura

### Task 11: modelos Ofício e Vitrine

**Files:**
- Create: `src/components/site-templates/oficio.tsx`
- Create: `src/components/site-templates/vitrine.tsx`

- [ ] **Step 1: Olhar as âncoras**

Abra com Read `/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/refs-duda/jpg/kohr-construction.jpg` (Kohr Construction: CTA no cabeçalho sempre visível, hero dividido texto/foto, "como trabalhamos" com fotos de apoio, grade de trabalhos) e `/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/refs-duda/jpg/wiggs-cpa.jpg` (Wiggs CPA: foto grande ao lado de texto com prova social objetiva, título serifado com lista com ícone, CTA repetido). O que NÃO entra: "há 25 anos", selo de certificação, vídeo, depoimento, "atendemos a região".

- [ ] **Step 2: Criar `oficio.tsx`**

Observação: a tabela da spec 1.1 não lista horário para o Ofício; aqui o horário aparece ao lado do contato (só quando preenchido), para um horário digitado no editor não sumir do site.

```tsx
import { MdOutlinePlace } from "react-icons/md";
import {
  CONTAINER,
  Contact,
  CtaLink,
  Footer,
  Gallery,
  Hours,
  Items,
  Photo,
  PrimaryCta,
  Rating,
  SecondaryCta,
  Section,
  SiteRoot,
  ctaLabel,
  hasContact,
  hasHours,
  heroAlt,
  type TemplateProps,
} from "./shared";
import { TEMPLATES } from "./catalog";
import { ctaOptions } from "@convex/lib/site";

/**
 * Ofício: encanador, eletricista, chaveiro, mecânica, fotógrafo. Composição
 * inspirada em Kohr Construction: CTA de orçamento sempre visível no cabeçalho,
 * hero dividido (texto objetivo à esquerda, foto grande do trabalho à direita),
 * serviços com ícone, "como trabalhamos" com fotos de apoio, área atendida que
 * só nomeia a cidade, faixa de orçamento. Serifada (Fraunces) nos títulos.
 */
const serif = "[font-family:var(--font-fraunces)]";
const h2 = `${serif} text-3xl font-medium tracking-tight @3xl:text-4xl`;
const CTA = TEMPLATES.oficio.ctaKey;
const solid =
  "inline-flex items-center gap-2 rounded-md bg-(--site-accent) px-6 py-3 text-sm font-semibold text-(--site-accent-fg) transition-opacity hover:opacity-90";
const outline =
  "inline-flex items-center gap-2 rounded-md border border-(--site-line) px-6 py-3 text-sm font-semibold transition-colors hover:border-(--site-accent) hover:text-(--site-accent)";

export function Hero({ view, tr, locale }: TemplateProps) {
  const eyebrow = [view.category?.replace(/_/g, " "), view.city].filter(Boolean).join(" · ");
  return (
    <>
      <header className="border-b border-(--site-line)">
        <div className={`${CONTAINER} flex items-center justify-between gap-6 py-4`}>
          <span className={`${serif} text-xl font-semibold tracking-tight`}>{view.name}</span>
          <PrimaryCta
            view={view}
            tr={tr}
            locale={locale}
            ctaKey={CTA}
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-(--site-accent) px-3 py-2 text-xs font-semibold text-(--site-accent) transition-colors hover:bg-(--site-accent) hover:text-(--site-accent-fg) @md:px-4 @md:text-sm"
          />
        </div>
      </header>
      <section className={`${CONTAINER} grid gap-10 py-12 @5xl:grid-cols-2 @5xl:items-center @5xl:py-20`}>
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--site-accent)">{eyebrow}</p>
          )}
          <h1 className={`${serif} mt-4 text-balance text-4xl font-medium leading-tight tracking-tight @3xl:text-5xl @5xl:text-6xl`}>
            {view.name}
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-(--site-muted)">{view.tagline || tr.tagline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryCta view={view} tr={tr} locale={locale} ctaKey={CTA} className={solid} />
            <SecondaryCta view={view} tr={tr} locale={locale} className={outline} />
          </div>
          <Rating view={view} locale={locale} className="mt-6" />
        </div>
        <Photo src={view.heroUrl} alt={heroAlt(view)}  className="aspect-[4/3] w-full rounded-lg object-cover" />
      </section>
    </>
  );
}

export function Oficio(props: TemplateProps) {
  const { view, palette, tr, locale } = props;
  const photos = TEMPLATES.oficio.photos;
  const primary = ctaOptions(view)[0];
  return (
    <SiteRoot palette={palette} locale={locale}>
      <Hero {...props} />

      <Items items={view.items} heading={tr.itemsHeading} headingClass={h2} variant="checks" />

      {/* Como trabalhamos: foto | texto | foto (decoração fixa, alt vazio) */}
      <section className="bg-(--site-surface)">
        <Section className="grid items-center gap-8 @5xl:grid-cols-[1fr_1.2fr_1fr] @5xl:gap-12">
          <Photo src={photos.g1} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
          <div className="text-center">
            <h2 className={h2}>{tr.aboutHeading}</h2>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-(--site-muted)">{view.about || tr.about}</p>
          </div>
          <Photo src={photos.g2} alt="" className="hidden aspect-[4/3] w-full rounded-lg object-cover @5xl:block" />
        </Section>
      </section>

      {/* Área atendida: só com cidade, e só a cidade (nunca "atendemos a região") */}
      {view.city && (
        <Section className="flex flex-col gap-4 @3xl:flex-row @3xl:items-end @3xl:justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-(--site-muted)">{tr.areaHeading}</h2>
            <p className={`${serif} mt-3 flex items-center gap-3 text-3xl @3xl:text-4xl`}>
              <MdOutlinePlace size={30} className="shrink-0 text-(--site-accent)" aria-hidden />
              {tr.inCity(view.city)}
            </p>
          </div>
          {view.address && <p className="text-(--site-muted)">{view.address}</p>}
        </Section>
      )}

      <Gallery urls={view.galleryUrls} heading={tr.galleryHeading} headingClass={h2} />

      {/* Pedir orçamento: só com canal preenchido */}
      {primary && (
        <section className="border-y border-(--site-line)">
          <div className={`${CONTAINER} flex flex-col items-start gap-6 py-14 @3xl:flex-row @3xl:items-center @3xl:justify-between`}>
            <h2 className={h2}>{tr.quoteHeading}</h2>
            <CtaLink cta={primary} label={ctaLabel(primary, CTA, tr, locale)} className={solid} />
          </div>
        </section>
      )}

      {(hasContact(view) || hasHours(view)) && (
        <Section className="grid gap-12 @3xl:grid-cols-2">
          <Contact view={view} heading={tr.contactHeading} headingClass={h2} />
          <Hours hours={view.hours} heading={tr.hoursHeading} closed={tr.closed} locale={locale} headingClass={h2} />
        </Section>
      )}

      <Footer name={view.name} />
    </SiteRoot>
  );
}
```

- [ ] **Step 3: Criar `vitrine.tsx`**

```tsx
import {
  CONTAINER,
  Contact,
  CtaLink,
  Footer,
  Hours,
  Items,
  Photo,
  PrimaryCta,
  Rating,
  SecondaryCta,
  Section,
  SiteRoot,
  Visit,
  ctaLabel,
  hasContact,
  hasHours,
  hasPlace,
  heroAlt,
  type TemplateProps,
} from "./shared";
import { TEMPLATES } from "./catalog";
import { ctaOptions } from "@convex/lib/site";

/**
 * Vitrine: loja, clínica, imobiliária, advogado e qualquer categoria
 * desconhecida. Composição inspirada em Wiggs CPA: hero com foto grande ao lado
 * de um bloco de texto com prova social OBJETIVA (só a nota e as avaliações do
 * lead; sem "anos" nem selo inventado), título de seção serifado com lista de
 * destaques com ícone, CTA repetido no cabeçalho, no hero e no rodapé.
 */
const serif = "[font-family:var(--font-fraunces)]";
const h2 = `${serif} text-3xl font-medium tracking-tight @3xl:text-4xl`;
const CTA = TEMPLATES.vitrine.ctaKey;
const solid =
  "inline-flex items-center gap-2 rounded-lg bg-(--site-accent) px-6 py-3 text-sm font-semibold text-(--site-accent-fg) transition-opacity hover:opacity-90";
const outline =
  "inline-flex items-center gap-2 rounded-lg border border-(--site-line) px-6 py-3 text-sm font-semibold transition-colors hover:border-(--site-accent)";

export function Hero({ view, tr, locale }: TemplateProps) {
  const eyebrow = [view.category?.replace(/_/g, " "), view.city].filter(Boolean).join(" · ");
  return (
    <section className="bg-(--site-surface)">
      <header className={`${CONTAINER} flex items-center justify-between gap-6 py-5`}>
        <span className={`${serif} text-xl font-semibold tracking-tight`}>{view.name}</span>
        <PrimaryCta
          view={view}
          tr={tr}
          locale={locale}
          ctaKey={CTA}
          className="hidden items-center gap-2 rounded-lg bg-(--site-accent) px-4 py-2 text-sm font-semibold text-(--site-accent-fg) @md:inline-flex"
        />
      </header>
      <div className={`${CONTAINER} grid gap-10 pb-16 pt-6 @5xl:grid-cols-[1.1fr_1fr] @5xl:items-center @5xl:pb-24 @5xl:pt-10`}>
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--site-muted)">{eyebrow}</p>
          )}
          <h1 className={`${serif} mt-4 text-balance text-4xl font-medium leading-tight tracking-tight @3xl:text-5xl @5xl:text-6xl`}>
            {view.name}
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-(--site-muted)">{view.tagline || tr.tagline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryCta view={view} tr={tr} locale={locale} ctaKey={CTA} className={solid} />
            <SecondaryCta view={view} tr={tr} locale={locale} className={outline} />
          </div>
          <Rating view={view} locale={locale} className="mt-6 rounded-lg bg-(--site-bg) px-3 py-2" />
        </div>
        <Photo
          src={view.heroUrl}
          alt={heroAlt(view)}
         
          className="aspect-[4/3] w-full rounded-2xl object-cover @5xl:aspect-[4/5]"
        />
      </div>
    </section>
  );
}

export function Vitrine(props: TemplateProps) {
  const { view, palette, tr, locale } = props;
  const photos = TEMPLATES.vitrine.photos;
  const primary = ctaOptions(view)[0];
  return (
    <SiteRoot palette={palette} locale={locale}>
      <Hero {...props} />

      <Items items={view.items} heading={tr.itemsHeading} headingClass={h2} variant="checks" />

      {/* Sobre: título serifado centrado, parágrafo e duas fotos (decoração fixa, alt vazio) */}
      <Section className="text-center">
        <h2 className={h2}>{tr.aboutHeading}</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-(--site-muted)">{view.about || tr.about}</p>
        <div className="mt-10 grid grid-cols-2 gap-3 @3xl:gap-4">
          <Photo src={photos.g1} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
          <Photo src={photos.g2} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
        </div>
      </Section>

      {(hasPlace(view) || hasHours(view)) && (
        <section className="bg-(--site-surface)">
          <Section className="grid gap-12 @3xl:grid-cols-2">
            <Visit view={view} heading={tr.visitHeading} headingClass={h2} />
            <Hours hours={view.hours} heading={tr.hoursHeading} closed={tr.closed} locale={locale} headingClass={h2} />
          </Section>
        </section>
      )}

      {hasContact(view, false) && (
        <Section className="grid gap-10 @3xl:grid-cols-2 @3xl:items-start">
          <Contact view={view} heading={tr.contactHeading} headingClass={h2} withPlace={false} />
          {primary && (
            <div className="rounded-2xl bg-(--site-accent) p-8 text-(--site-accent-fg)">
              <p className={`${serif} text-2xl leading-snug`}>{view.tagline || tr.tagline}</p>
              <CtaLink
                cta={primary}
                label={ctaLabel(primary, CTA, tr, locale)}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-(--site-bg) px-6 py-3 text-sm font-semibold text-(--site-text)"
              />
            </div>
          )}
        </Section>
      )}

      <Footer name={view.name} />
    </SiteRoot>
  );
}
```

- [ ] **Step 4: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/components/site-templates`
Expected: sem saída.

- [ ] **Step 5: Commit**

```bash
git add src/components/site-templates/oficio.tsx src/components/site-templates/vitrine.tsx
git commit -m "$(cat <<'MSG'
feat(site): modelos Ofício (serviços técnicos) e Vitrine (padrão)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 12: ponto de entrada (`index.tsx`) e miniatura (`template-thumb.tsx`)

**Files:**
- Create: `src/components/site-templates/index.tsx`
- Create: `src/components/site-templates/template-thumb.tsx`

Contexto: `index.tsx` é `.tsx` porque `renderTemplate` devolve JSX; ele reexporta `TEMPLATES` (catalog), `SiteView`/`TemplateProps` (shared) e as paletas, então o resto do app importa só `@/components/site-templates`. `buildSiteView` é o único lugar que monta a view (foto padrão onde não há upload) e descarta `heroImage` quando o storage não devolveu URL, para o `alt` não afirmar que a foto padrão é do negócio. `TemplateThumb` (spec 1.4) fica pronto para os planos B e C; ninguém o usa neste plano.

- [ ] **Step 1: Criar `index.tsx`**

```tsx
import type { ReactElement } from "react";
import type { SiteContent, TemplateId } from "@convex/lib/site";
import { DICTS, type Locale } from "@/lib/preview-i18n";
import { paletteFor } from "./palettes";
import { TEMPLATES } from "./catalog";
import { SiteRoot, type SiteView, type TemplateProps } from "./shared";
import { Mesa, Hero as MesaHero } from "./mesa";
import { Estudio, Hero as EstudioHero } from "./estudio";
import { Oficio, Hero as OficioHero } from "./oficio";
import { Vitrine, Hero as VitrineHero } from "./vitrine";

export { TEMPLATES } from "./catalog";
export type { TemplateMeta, CtaKey } from "./catalog";
export type { SiteView, TemplateProps } from "./shared";
export type { Palette } from "./palettes";
export { paletteFor, palettesOf } from "./palettes";

type Template = (props: TemplateProps) => ReactElement;

const COMPONENTS: Record<TemplateId, { Site: Template; Hero: Template }> = {
  mesa: { Site: Mesa, Hero: MesaHero },
  estudio: { Site: Estudio, Hero: EstudioHero },
  oficio: { Site: Oficio, Hero: OficioHero },
  vitrine: { Site: Vitrine, Hero: VitrineHero },
};

/** URLs resolvidas pela query (`images` de getByToken/getBySlug/getForLead). */
export interface SiteImages {
  heroUrl?: string;
  galleryUrls: string[];
}

/**
 * Monta o SiteView (spec 1.4): upload onde houver, foto padrão do modelo no
 * lugar do hero quando não há. Se o storage não devolveu URL para um
 * `heroImage` gravado, o id é descartado da view para o alt não afirmar que a
 * foto padrão é do negócio.
 */
export function buildSiteView(content: SiteContent, images: SiteImages): SiteView {
  const heroUrl = images.heroUrl ?? TEMPLATES[content.template].photos.hero;
  return {
    ...content,
    heroImage: images.heroUrl ? content.heroImage : undefined,
    heroUrl,
    galleryUrls: images.galleryUrls,
  };
}

function propsFor(view: SiteView, locale: Locale): TemplateProps {
  return {
    view,
    palette: paletteFor(view.template, view.palette),
    tr: DICTS[locale].templates[view.template],
    locale,
  };
}

/** O site inteiro no modelo salvo no conteúdo. */
export function renderTemplate(view: SiteView, locale: Locale): ReactElement {
  const { Site } = COMPONENTS[view.template];
  return <Site {...propsFor(view, locale)} />;
}

/** Só o hero (miniaturas): cada modelo exporta `Hero` além do componente completo. */
export function renderHero(view: SiteView, locale: Locale): ReactElement {
  const p = propsFor(view, locale);
  const { Hero } = COMPONENTS[view.template];
  return (
    <SiteRoot palette={p.palette} locale={locale}>
      <Hero {...p} />
    </SiteRoot>
  );
}

/** View de amostra (miniaturas e cartões): só nome, modelo e paleta; nada de dado inventado. */
export function sampleView(template: TemplateId, palette: string, name: string): SiteView {
  return {
    version: 2,
    template,
    palette,
    name,
    city: null,
    countryCode: "GB",
    category: null,
    rating: null,
    reviewsCount: null,
    heroUrl: TEMPLATES[template].photos.hero,
    galleryUrls: [],
  };
}
```

- [ ] **Step 2: Criar `template-thumb.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { TemplateId } from "@convex/lib/site";
import { renderHero, sampleView } from "./index";

/** Largura virtual em que o hero é renderizado antes de ser reduzido. */
const VIRTUAL_WIDTH = 1280;

/**
 * Miniatura ao vivo de um modelo (spec 1.4): renderiza SÓ o hero, numa largura
 * virtual de 1280 px, reduzido com CSS `zoom` (não `transform`, que deixaria a
 * caixa de layout no tamanho original) para caber na largura do contêiner pai,
 * medida com ResizeObserver. Proporção 16:10, `pointer-events: none`, `aria-hidden`.
 * Usa só as fotos padrão; nunca resolve storage.
 */
export function TemplateThumb({
  template,
  palette,
  name,
  className = "",
}: {
  template: TemplateId;
  palette: string;
  name: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // O observer dispara já com o tamanho inicial: não há setState síncrono no efeito.
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none relative aspect-[16/10] w-full select-none overflow-hidden ${className}`}
    >
      {width > 0 && (
        <div style={{ width: VIRTUAL_WIDTH, zoom: width / VIRTUAL_WIDTH }}>
          {renderHero(sampleView(template, palette, name), "pt")}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && node --experimental-strip-types --test tests/*.test.ts 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `tsc` e `eslint` sem saída; `ℹ tests 262`, `ℹ pass 262`, `ℹ fail 0`.

- [ ] **Step 4: Commit**

```bash
git add src/components/site-templates/index.tsx src/components/site-templates/template-thumb.tsx
git commit -m "$(cat <<'MSG'
feat(site): renderTemplate, buildSiteView e TemplateThumb (hero escalado com zoom)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```


## Chunk 6: Convex e páginas públicas

Uma tarefa de código (um commit, porque as queries mudam de forma e as páginas precisam mudar junto para o `tsc` continuar verde) e uma tarefa de verificação ao vivo pela CLI.

### Task 13: helper `ensurePreview`, queries/mutations, schema `uploads`, `leads.get`, páginas públicas

**Files:**
- Modify: `convex/schema.ts` (tabela `uploads`)
- Create: `convex/model/previews.ts`
- Modify: `convex/previews.ts` (arquivo inteiro)
- Modify: `convex/leads.ts` (só `get`)
- Modify: `convex/demo.ts` (`legacyPreview` e `rawPreview`, só demo)
- Modify: `src/components/preview-site.tsx` (arquivo inteiro)
- Modify: `src/app/p/[token]/page.tsx`
- Modify: `src/app/site/[slug]/page.tsx`

Contexto (spec 2.2 e 2.3): `previews.content` continua `v.optional(v.any())`, sem coluna nova. `ensurePreview` cria a linha com token e `defaultContentForLead(lead)` e NUNCA sobrescreve; `generate` deixa de regravar o conteúdo. As queries devolvem `content` já parseado e `images` com as URLs do storage; a página monta o `SiteView`. `publish` grava o conteúdo parseado (um preview antigo é regravado em v2 ao publicar) e o slug sai do nome do site. `getForLead` deixa de devolver `lastOpenedAt` (sem uso em `src/`, conferido com grep). `saveContent` e as mutations de upload são do plano B.

- [ ] **Step 1: Tabela `uploads` no schema**

Em `convex/schema.ts`, dentro do `defineSchema({ ... })`, logo depois do bloco `previews: defineTable({...}).index(...)...` (termina em `.index("by_org", ["orgId"]),`) e antes de `outreach: defineTable({`, insira:

```ts
  // Fotos enviadas para o site de um lead (spec 2.2/2.4). A linha existe para
  // `saveContent` (plano B) só aceitar storageId do próprio org e para apagar o
  // que saiu do conteúdo. As mutations de upload chegam no plano B; aqui só a tabela.
  uploads: defineTable({
    orgId: v.string(),
    leadId: v.id("leads"),
    storageId: v.id("_storage"),
    at: v.number(),
  })
    .index("by_storage", ["storageId"])
    .index("by_lead", ["leadId"]),
```

- [ ] **Step 2: Criar `convex/model/previews.ts`**

```ts
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { defaultContentForLead, parseSiteContent, type SiteContent } from "../lib/site.ts";

/**
 * Devolve a linha de preview do lead, criando-a com token novo e
 * `content = defaultContentForLead(lead)` quando não existe. NUNCA sobrescreve
 * `content` existente: o conteúdo salvo é a única fonte de verdade (spec 2.3).
 * `generate`, `ensureForLead` e `publish` passam por aqui (e `saveContent`, no
 * plano B).
 */
export async function ensurePreview(ctx: MutationCtx, lead: Doc<"leads">): Promise<Doc<"previews">> {
  const existing = await ctx.db
    .query("previews")
    .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
    .first();
  if (existing) return existing;

  const token = crypto.randomUUID().replace(/-/g, "");
  const id = await ctx.db.insert("previews", {
    orgId: lead.orgId,
    leadId: lead._id,
    token,
    content: defaultContentForLead(lead),
    openCount: 0,
  });
  const created = await ctx.db.get(id);
  // Invariante (get logo após insert): Error comum de propósito, não é mensagem pra usuária.
  if (!created) throw new Error("Falha ao criar preview");
  return created;
}

/**
 * `content` parseado (formato antigo convertido; corrompido vira o mínimo). No
 * mínimo o nome sai vazio: aqui entra o nome, a cidade e o país do lead, que a
 * query tem à mão (spec 2.1, "substituído pelo nome do lead quando o chamador o tem").
 */
export async function readContent(ctx: QueryCtx | MutationCtx, preview: Doc<"previews">): Promise<SiteContent> {
  const content = parseSiteContent(preview.content);
  if (content.name) return content;
  const lead = await ctx.db.get(preview.leadId);
  if (!lead) return content;
  return { ...content, name: lead.name, city: lead.city ?? null, countryCode: lead.countryCode };
}

/** URLs do storage para as imagens enviadas (spec 2.3). Id sem arquivo (apagado) some da lista. */
export async function resolveImages(
  ctx: QueryCtx | MutationCtx,
  content: SiteContent,
): Promise<{ heroUrl?: string; galleryUrls: string[] }> {
  const heroUrl = content.heroImage ? ((await ctx.storage.getUrl(content.heroImage)) ?? undefined) : undefined;
  const urls = await Promise.all((content.gallery ?? []).map((id) => ctx.storage.getUrl(id)));
  return { heroUrl, galleryUrls: urls.filter((u): u is string => typeof u === "string") };
}
```

- [ ] **Step 3: Reescrever `convex/previews.ts`**

Substitua o arquivo inteiro por:

```ts
import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgId } from "./model/tenant";
import { reserveUsage } from "./model/workspace";
import { ensurePreview, readContent, resolveImages } from "./model/previews";
import { parseSiteContent } from "./lib/site";
import { userError } from "./lib/errors";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "site"
  );
}

/**
 * O preview (se houver) de um lead, para a aba Site do CRM e para o editor. Authed.
 * `content` já parseado (spec 2.1) e `images` com as URLs do storage resolvidas;
 * quem monta o SiteView (foto padrão onde não há upload) é a página. Não devolve
 * `lastOpenedAt`: sem uso em src/ (spec 2.3).
 */
export const getForLead = query({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const preview = await ctx.db
      .query("previews")
      .withIndex("by_lead", (q) => q.eq("leadId", leadId))
      .first();
    if (!preview || preview.orgId !== orgId) return null;
    const content = await readContent(ctx, preview);
    return {
      token: preview.token,
      content,
      published: preview.published ?? false,
      slug: preview.slug ?? null,
      openCount: preview.openCount,
      images: await resolveImages(ctx, content),
    };
  },
});

/**
 * Garante o preview rastreado de um lead e devolve o token. Authed. Já existindo,
 * NÃO toca no conteúdo (antes regravava a partir do lead; agora o conteúdo salvo
 * é a fonte de verdade e o lead só o alimenta na criação).
 */
export const generate = mutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");
    return (await ensurePreview(ctx, lead)).token;
  },
});

/** Ensure a preview exists for a lead (used by the outreach flow). Returns its token. */
export const ensureForLead = internalMutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) throw userError("Lead não encontrado");
    return (await ensurePreview(ctx, lead)).token;
  },
});

/** PUBLIC, sem auth: o prospect abre pelo token. Devolve só o que a página renderiza. */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const preview = await ctx.db
      .query("previews")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!preview) return null;
    const content = await readContent(ctx, preview);
    return { content, openCount: preview.openCount, images: await resolveImages(ctx, content) };
  },
});

/**
 * PUBLIC: records that the prospect opened the preview. This is the buying
 * signal: it advances the lead to "opened" so the reseller sees it live.
 */
export const recordOpen = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const preview = await ctx.db
      .query("previews")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!preview) return;

    // TRCK-01: o dono do workspace abrindo o próprio preview (logado no app, no
    // mesmo browser) NÃO pode contar como sinal de prospect. Um prospect real
    // nunca tem sessão Clerk, então identity é null para ele. Limitação aceita e
    // documentada: uma aba anônima/privada do próprio dono conta como prospect
    // (igual a qualquer ferramenta de tracking). Modo demo não tem ClerkProvider
    // → getUserIdentity() sempre null → aberturas de demo seguem contando (desejado).
    const identity = await ctx.auth.getUserIdentity();
    if (identity && identity.subject === preview.orgId) return;

    const now = Date.now();
    await ctx.db.patch(preview._id, {
      openCount: preview.openCount + 1,
      lastOpenedAt: now,
    });
    await ctx.db.insert("events", {
      orgId: preview.orgId,
      type: "preview_open",
      leadId: preview.leadId,
      previewToken: token,
      at: now,
    });

    const lead = await ctx.db.get(preview.leadId);
    if (lead && lead.stage === "base") {
      await ctx.db.patch(lead._id, { stage: "approached", stageUpdatedAt: now });
    }
  },
});

/**
 * Publica o preview como site white-label com slug estável. Cobra 1 site de uso.
 * Publica o `content` SALVO (parseado; um preview antigo é regravado já em v2),
 * nunca uma cópia nova do lead. Já publicado: idempotente, devolve o slug.
 */
export const publish = mutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");

    const preview = await ensurePreview(ctx, lead);
    if (preview.published && preview.slug) return preview.slug;

    await reserveUsage(ctx, orgId, "sites", 1);
    const content = await readContent(ctx, preview);
    // O slug sai do nome do SITE (o que ela salvou), não do nome cru do lead.
    const slug = `${slugify(content.name)}-${crypto.randomUUID().slice(0, 6)}`;
    await ctx.db.patch(preview._id, { published: true, slug, content });
    return slug;
  },
});

/** PUBLIC: render a published white-label site by slug. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const p = await ctx.db
      .query("previews")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!p || !p.published) return null;
    const content = await readContent(ctx, p);
    return { content, token: p.token, images: await resolveImages(ctx, content) };
  },
});

/**
 * All previews/sites for the workspace, newest first, with lead context.
 * `template`/`palette` saem de `parseSiteContent(content)`: não há coluna nova
 * (spec 2.2) e não se resolve storage aqui (a miniatura usa só os defaults).
 */
export const listSites = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);
    const previews = await ctx.db
      .query("previews")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    const rows = await Promise.all(
      previews.map(async (p) => {
        const lead = await ctx.db.get(p.leadId);
        const content = parseSiteContent(p.content);
        return {
          _id: p._id,
          leadId: p.leadId,
          token: p.token,
          slug: p.slug ?? null,
          published: p.published ?? false,
          openCount: p.openCount,
          template: content.template,
          palette: content.palette,
          // U+2014 escapado: o mesmo travessão de antes (a página Sites o mostra quando o lead sumiu).
          name: lead?.name ?? "\u2014",
          city: lead?.city ?? null,
          category: lead?.category ?? null,
          score: lead?.score ?? null,
          tier: (lead?.tier ?? "cold") as "hot" | "warm" | "cold",
        };
      }),
    );
    return rows.sort((a, b) => b.openCount - a.openCount);
  },
});
```

- [ ] **Step 4: `leads.get` aceita string**

Em `convex/leads.ts`, substitua o bloco `export const get = query({ ... });` (linhas 78 a 86 na versão atual: `args: { id: v.id("leads") }`) por:

```ts
/**
 * `id` é string, não `v.id("leads")`: o editor do site (plano B) lê o id da URL
 * (`/crm/[leadId]/site`) e um id malformado precisa virar "Lead não encontrado"
 * na tela, não erro de validação de argumento (que derruba a query inteira).
 * `normalizeId` devolve null para string que não é id desta tabela. O caller
 * atual (`src/components/outreach-composer.tsx`) passa um `Id<"leads">`, que
 * continua válido.
 */
export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const id = ctx.db.normalizeId("leads", args.id);
    if (!id) return null;
    const lead = await ctx.db.get(id);
    if (!lead || lead.orgId !== orgId) return null;
    return lead;
  },
});
```

- [ ] **Step 5: Funções de verificação só em demo (`convex/demo.ts`)**

Troque a primeira linha `import { mutation } from "./_generated/server";` por:

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
```

E acrescente no FIM do arquivo:

```ts
/**
 * Só demo: regrava o conteúdo do preview de um lead no formato ANTIGO
 * (PreviewContent, sem `version`) para verificar pela CLI que a leitura converte
 * para v2 e que a página pública renderiza um preview legado (spec 4).
 */
export const legacyPreview = mutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    if (!isDemoEnabled()) throw userError("DEMO_MODE desligado");
    const lead = await ctx.db.get(leadId);
    if (!lead) throw userError("Lead não encontrado");
    const preview = await ctx.db
      .query("previews")
      .withIndex("by_lead", (q) => q.eq("leadId", leadId))
      .first();
    if (!preview) throw userError("Lead sem preview");
    await ctx.db.patch(preview._id, {
      content: {
        name: lead.name,
        category: lead.category ?? null,
        city: lead.city ?? null,
        phone: lead.phone ?? null,
        rating: lead.rating ?? null,
        reviewsCount: lead.reviewsCount ?? null,
        countryCode: lead.countryCode,
      },
    });
    return preview.token;
  },
});

/** Só demo: o `content` CRU do preview de um lead, sem parse (para provar que `generate` não regrava). */
export const rawPreview = query({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    if (!isDemoEnabled()) throw userError("DEMO_MODE desligado");
    const preview = await ctx.db
      .query("previews")
      .withIndex("by_lead", (q) => q.eq("leadId", leadId))
      .first();
    return preview ? { token: preview.token, content: preview.content ?? null } : null;
  },
});
```

- [ ] **Step 6: Typecheck do Convex**

Run: `./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json`
Expected: sem saída. (O `tsc` da raiz ainda falha nas duas páginas, que fazem `as PreviewContent`; os passos seguintes resolvem.)

- [ ] **Step 7: `preview-site.tsx` vira só o ponto de entrada**

Substitua `src/components/preview-site.tsx` inteiro por:

```tsx
import { renderTemplate, type SiteView } from "@/components/site-templates";
import type { Locale } from "@/lib/preview-i18n";

/**
 * Ponto de entrada das páginas públicas (spec 1.4): só delega ao modelo salvo
 * no conteúdo. O `min-h-dvh` mora AQUI, fora de `site-templates/`, onde
 * unidade de viewport é proibida: o modelo tem `flex-1` e estica até o fim.
 */
export function PreviewSite({ view, locale }: { view: SiteView; locale: Locale }) {
  return <div className="flex min-h-dvh flex-col">{renderTemplate(view, locale)}</div>;
}
```

- [ ] **Step 8: `src/app/p/[token]/page.tsx`**

Quatro edições, mantendo os comentários existentes:

(a) Troque `import { PreviewSite, type PreviewContent } from "@/components/preview-site";` por
`import { PreviewSite } from "@/components/preview-site";`
e, logo abaixo da linha `import { PreviewTracker } from "@/components/preview-tracker";`, acrescente
`import { buildSiteView } from "@/components/site-templates";`.

(b) Substitua o bloco `const loadPreview = cache(...)` inteiro, inclusive o comentário de documentação acima dele, por:

```ts
/**
 * `cache` dedupa a query entre generateMetadata e o render da página: as duas
 * rodam no mesmo request, então o Convex é consultado uma vez só. `content` já
 * chega parseado (v2) e `images` com as URLs do storage resolvidas.
 */
const loadPreview = cache(async (token: string) => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  const data = await new ConvexHttpClient(url).query(api.previews.getByToken, { token });
  return data ? { content: data.content, images: data.images } : null;
});
```

(c) Em `generateMetadata`, substitua estas linhas:

```ts
  const content = await loadPreview(token);
  if (!content) return { robots: { index: false } };

  // Cidade junto do país: só assim a Suíça francófona/italófona sai do alemão.
  const tr = DICTS[localeForLead(content.countryCode, content.city)];
  const title = tr.metaTitle({ name: content.name, city: content.city });
  const description = tr.metaDescription({ name: content.name, city: content.city });
```

por:

```ts
  const preview = await loadPreview(token);
  if (!preview) return { robots: { index: false } };

  const { name, city, countryCode } = preview.content;
  // Cidade junto do país: só assim a Suíça francófona/italófona sai do alemão.
  const tr = DICTS[localeForLead(countryCode, city)];
  const title = tr.metaTitle({ name, city });
  const description = tr.metaDescription({ name, city });
```

(d) Substitua a função `export default async function PreviewPage` inteira por:

```tsx
export default async function PreviewPage({ params }: Props) {
  const { token } = await params;
  const preview = await loadPreview(token);
  if (!preview) notFound();

  // A página monta o SiteView (foto padrão onde não há upload), nunca o modelo (spec 3.5).
  const view = buildSiteView(preview.content, preview.images);
  const locale = localeForLead(view.countryCode, view.city);
  return (
    <>
      <PreviewTracker token={token} />
      <PreviewSite view={view} locale={locale} />
    </>
  );
}
```

- [ ] **Step 9: `src/app/site/[slug]/page.tsx`**

Quatro edições, mantendo os comentários existentes:

(a) Troque `import { PreviewSite, type PreviewContent } from "@/components/preview-site";` por
`import { PreviewSite } from "@/components/preview-site";`
e acrescente, logo abaixo, `import { buildSiteView } from "@/components/site-templates";`.

(b) Substitua o bloco `const loadSite = cache(...)` inteiro, inclusive o comentário acima, por:

```ts
/**
 * `cache` dedupa a query entre generateMetadata e o render da página: as duas
 * rodam no mesmo request, então o Convex é consultado uma vez só. `content` já
 * chega parseado (v2) e `images` com as URLs do storage resolvidas.
 */
const loadSite = cache(async (slug: string) => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  const data = await new ConvexHttpClient(url).query(api.previews.getBySlug, { slug });
  return data ? { content: data.content, images: data.images, token: data.token } : null;
});
```

(c) Em `generateMetadata`, substitua tudo a partir da linha `  return {` (a que vem depois de `const canonical = ...;`) até o `}` que fecha a função por:

```ts
  // `og:image` só quando a foto principal é upload dela (spec 3.5): a foto padrão
  // do modelo é decoração genérica e não pode virar "a foto do negócio" no preview de link.
  const heroUpload = site.images.heroUrl;
  return {
    title,
    description,
    // metadataBase existe para o Next resolver URL relativa em campo de OG. Só é
    // definido junto do canonical porque vem da mesma (única) fonte verificada.
    ...(origin ? { metadataBase: new URL(origin) } : {}),
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: "website",
      title,
      description,
      ...(canonical ? { url: canonical } : {}),
      ...(heroUpload ? { images: [{ url: heroUpload }] } : {}),
    },
    robots: { index: true, follow: true },
  };
}
```

(d) No `SitePage`, troque a última linha `  return <PreviewSite content={site.content} />;` e o `}` de fechamento por:

```tsx
  const view = buildSiteView(site.content, site.images);
  return <PreviewSite view={view} locale={localeForLead(view.countryCode, view.city)} />;
}
```

- [ ] **Step 10: Verificar tudo**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json && ./node_modules/.bin/eslint && node --experimental-strip-types --test tests/*.test.ts 2>&1 | grep -E "^ℹ (tests|pass|fail)" && grep -rn "PreviewContent\|lastOpenedAt" src | grep -v "preview-i18n.ts"`
Expected: `tsc` e `eslint` sem saída; `ℹ tests 262`, `ℹ pass 262`, `ℹ fail 0`; o `grep` final não encontra nada (o `PreviewContent` que sobra é um comentário em `preview-i18n.ts`, removido na Task 16). `tests/site-indexability.test.ts` continua passando: o `og:image` não põe domínio no arquivo.

- [ ] **Step 11: Commit**

```bash
git add convex/schema.ts convex/model/previews.ts convex/previews.ts convex/leads.ts convex/demo.ts src/components/preview-site.tsx "src/app/p/[token]/page.tsx" "src/app/site/[slug]/page.tsx"
git commit -m "$(cat <<'MSG'
feat(site): preview e site publicado renderizam o modelo do conteúdo salvo

ensurePreview cria a linha com conteúdo padrão e nunca sobrescreve;
generate deixa de regravar a partir do lead; queries devolvem o
conteúdo parseado (formato antigo convertido) e as URLs do storage;
publish grava o conteúdo salvo; tabela uploads entra agora para o
schema mudar uma vez só (mutations no plano B); leads.get tolera id
malformado.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 14: verificação ao vivo pela CLI (modo demo)

Sem commit. Precisa dos dois servidores de pé (ver Contexto). O `convex dev` aplica o schema e as funções novas sozinho em poucos segundos; se um `convex run` reclamar que `demo:legacyPreview` não existe, é porque a sincronização ainda não terminou: repita o comando.

- [ ] **Step 1: Escolher um lead e forçar o formato antigo**

```bash
cd /Users/madu/Developer/mine/osprano
OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/plano-a; mkdir -p "$OUT"
./node_modules/.bin/convex run leads:list '{}' > "$OUT/leads.json"
ID=$(jq -r '.[0]._id' "$OUT/leads.json"); jq -r '.[0] | "\(.name) | \(.category) | \(.city) | phone=\(.phone)"' "$OUT/leads.json"
./node_modules/.bin/convex run previews:generate "{\"leadId\":\"$ID\"}" > "$OUT/gen1.txt" 2>&1; T1=$(jq -r . "$OUT/gen1.txt"); echo "token=$T1"
./node_modules/.bin/convex run demo:legacyPreview "{\"leadId\":\"$ID\"}" > "$OUT/legacy.txt" 2>&1; jq -r . "$OUT/legacy.txt"
./node_modules/.bin/convex run demo:rawPreview "{\"leadId\":\"$ID\"}" > "$OUT/raw1.json" 2>&1; jq -c '.content | {version, name, category}' "$OUT/raw1.json"
```

Expected: a linha do lead (um dos 37 do OSM, ex. `Alexanders of Didsbury | barber shop | Manchester | phone=null`); `token=<32 hex>`; o mesmo token de volta do `legacyPreview`; e `{"version":null,"name":"...","category":"barber shop"}` (formato antigo, sem `version`).

- [ ] **Step 2: `generate` não sobrescreve; a leitura converte**

```bash
./node_modules/.bin/convex run previews:generate "{\"leadId\":\"$ID\"}" > "$OUT/gen2.txt" 2>&1; [ "$(jq -r . "$OUT/gen2.txt")" = "$T1" ] && echo "token estável"
./node_modules/.bin/convex run demo:rawPreview "{\"leadId\":\"$ID\"}" > "$OUT/raw2.json" 2>&1; jq -c '.content.version' "$OUT/raw2.json"
./node_modules/.bin/convex run previews:getByToken "{\"token\":\"$T1\"}" > "$OUT/tok.json" 2>&1; jq -c '{v: .content.version, template: .content.template, palette: .content.palette, name: .content.name, images, openCount}' "$OUT/tok.json"
./node_modules/.bin/convex run previews:getForLead "{\"leadId\":\"$ID\"}" > "$OUT/forlead.json" 2>&1; jq -c 'keys' "$OUT/forlead.json"
```

Expected: `token estável`; `null` (o documento cru continua no formato antigo: `generate` não tocou); `{"v":2,"template":"estudio","palette":"carvao","name":"...","images":{"galleryUrls":[]},"openCount":N}` (barber shop vira Estúdio na leitura; sem `heroUrl` porque não há upload); `["content","images","openCount","published","slug","token"]` (sem `lastOpenedAt`).

- [ ] **Step 3: A página pública renderiza o preview antigo no modelo novo**

```bash
curl -s "http://localhost:3000/p/$T1" > "$OUT/p.html"; grep -o 'lang="en"' "$OUT/p.html" | head -1; grep -c "About the studio" "$OUT/p.html"; grep -o '/templates/estudio/hero.jpg' "$OUT/p.html" | head -1; grep -c 'alt=""' "$OUT/p.html"
```

Expected: `lang="en"`, `1` (ou mais), `/templates/estudio/hero.jpg`, e um número ≥ 3 (hero padrão e as duas fotos de decoração com alt vazio).

- [ ] **Step 4: `publish` publica o conteúdo salvo e `getBySlug` devolve `images`**

```bash
./node_modules/.bin/convex run previews:publish "{\"leadId\":\"$ID\"}" > "$OUT/pub.txt" 2>&1; SLUG=$(jq -r . "$OUT/pub.txt"); echo "slug=$SLUG"
./node_modules/.bin/convex run previews:publish "{\"leadId\":\"$ID\"}" > "$OUT/pub2.txt" 2>&1; [ "$(jq -r . "$OUT/pub2.txt")" = "$SLUG" ] && echo "publish idempotente"
./node_modules/.bin/convex run demo:rawPreview "{\"leadId\":\"$ID\"}" > "$OUT/raw3.json" 2>&1; jq -c '.content | {version, template}' "$OUT/raw3.json"
./node_modules/.bin/convex run previews:getBySlug "{\"slug\":\"$SLUG\"}" > "$OUT/slug.json" 2>&1; jq -c '{template: .content.template, images, token}' "$OUT/slug.json"
./node_modules/.bin/convex run previews:listSites '{}' > "$OUT/sites.json" 2>&1; jq -c '.[] | select(.slug == "'"$SLUG"'") | {template, palette, published}' "$OUT/sites.json"
curl -s "http://localhost:3000/site/$SLUG" > "$OUT/site.html"; grep -c "About the studio" "$OUT/site.html"; grep -o '<meta name="robots"[^>]*>' "$OUT/site.html" | head -1
```

Expected: `slug=<nome-slugificado>-<6 hex>`; `publish idempotente`; `{"version":2,"template":"estudio"}` (publicar regravou em v2); `{"template":"estudio","images":{"galleryUrls":[]},"token":"<T1>"}`; `{"template":"estudio","palette":"carvao","published":true}`; `1` ou mais; a meta robots com `index`/`follow` (não `noindex`).

- [ ] **Step 5: Outreach intacto**

Run: `grep -n "ensureForLead" convex/outreach.ts | head -3 && ./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json`
Expected: as duas chamadas `internal.previews.ensureForLead` continuam lá; `tsc` sem saída. (A action de outreach só usa o token; a assinatura não mudou.)


## Chunk 7: rótulos, limpeza do dicionário, guardas e verificação final

### Task 15: aba Site sem "Regenerar" e botão "Preparar preview"

**Files:**
- Modify: `src/components/crm/lead-detail.tsx` (função `SiteTab`)
- Modify: `src/components/generate-preview-button.tsx`

Contexto: `generate` não regrava mais o conteúdo, então a linha "Regenerar o conteúdo do site" e o botão ao lado dela sairiam sem fazer nada (spec, divisão em planos). O botão de dois passos continua (evita o bloqueador de pop-up); só os rótulos mudam. O link "Editar site" chega no plano B; o resumo com miniatura, no C.

- [ ] **Step 1: Rótulos do botão**

Em `src/components/generate-preview-button.tsx`:
- troque o comentário `/** Generates a tracked preview for a lead, then reveals the open link. */` por `/** Prepara (garante) o preview rastreado do lead e então revela o link de abrir. Dois passos: um link que aparece depois do clique não cai no bloqueador de pop-up. */`;
- troque `{busy ? "Gerando…" : "Gerar preview"}` por `{busy ? "Preparando…" : "Preparar preview"}`.

- [ ] **Step 2: Estado vazio da aba Site**

Em `src/components/crm/lead-detail.tsx`, dentro de `SiteTab`, a linha do parágrafo do estado vazio começa com `Gere um preview profissional`. Substitua a linha inteira (só ela, mantendo a indentação) por:

```
          Prepare um preview do site do negócio num link único e rastreado, pronto para mostrar na abordagem.
```

Comando que faz isso sem digitar a linha antiga:

```bash
node -e '
const fs=require("fs");const p="src/components/crm/lead-detail.tsx";
const s=fs.readFileSync(p,"utf8").replace(/^(\s*)Gere um preview profissional.*$/m,"$1Prepare um preview do site do negócio num link único e rastreado, pronto para mostrar na abordagem.");
fs.writeFileSync(p,s);'
```

- [ ] **Step 3: Estado com preview**

Ainda em `SiteTab`, troque o texto do link `Ver prévia rastreada <MdOpenInNew size={14} />` por `Abrir preview <MdOpenInNew size={14} />`.

E substitua o bloco inteiro:

```tsx
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-3">
        <span className="text-sm text-muted">Regenerar o conteúdo do site</span>
        <div className="flex flex-wrap items-center gap-2">
          <WhatTheyHaveButton lead={lead} />
          <GeneratePreviewButton leadId={lead._id} />
        </div>
      </div>
```

por:

```tsx
      <div className="flex items-center justify-end gap-2 rounded-xl border border-border bg-surface-2/40 px-4 py-3">
        <WhatTheyHaveButton lead={lead} />
      </div>
```

- [ ] **Step 4: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && grep -c "Regenerar\|Gerar preview\|Ver prévia rastreada" src/components/crm/lead-detail.tsx src/components/generate-preview-button.tsx`
Expected: `tsc` e `eslint` sem saída; `0` para os dois arquivos.

- [ ] **Step 5: Commit**

```bash
git add src/components/crm/lead-detail.tsx src/components/generate-preview-button.tsx
git commit -m "$(cat <<'MSG'
feat(crm): aba Site sem "Regenerar" e botão "Preparar preview"

generate não regrava mais o conteúdo; o botão de regenerar viraria um
botão que não faz nada.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 16: remover as chaves do template único e reescrever as guardas

**Files:**
- Modify: `src/lib/preview-i18n.ts`
- Modify: `tests/preview-i18n.test.ts` (arquivo inteiro)

Contexto (spec 1.5 e 1.7): `heroSubtitle`, `feature*`, `visitHeading` e `visitBody` saem dos 10 dicionários e da interface; `call`, `callNow`, `whatsapp`, `reviews`, `phoneLabel`, `whereLabel`, `metaTitle`, `metaDescription` e `templates` ficam. Em cada bloco as chaves removidas são contíguas (de `heroSubtitle` até a linha antes de `phoneLabel`), então um script faz a remoção sem risco de digitação. O comentário antigo sobre horário na interface (que citava `PreviewContent`) é trocado pelo texto atual. As guardas do teste passam a ler a fonte dos quatro modelos e do `shared.tsx`.

- [ ] **Step 1: Escrever o teste novo (falha porque as chaves antigas ainda existem)**

Substitua `tests/preview-i18n.test.ts` inteiro por:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DICTS, localeForCountry, localeForLead, type Locale } from "../src/lib/preview-i18n.ts";
import { SEARCHABLE_MARKETS } from "../convex/lib/domain.ts";
import { TEMPLATE_IDS } from "../convex/lib/site.ts";

const LOCALES = Object.keys(DICTS) as Locale[];

test("preview-i18n: countryCode mapeia para o locale correto", () => {
  assert.equal(localeForCountry("GB"), "en");
  assert.equal(localeForCountry("IE"), "en");
  assert.equal(localeForCountry("NL"), "nl");
  assert.equal(localeForCountry("SE"), "sv");
  assert.equal(localeForCountry("NO"), "no");
  // Mercados opt-in: a prévia fala o mesmo idioma do script de ligação/email.
  assert.equal(localeForCountry("ES"), "es");
  assert.equal(localeForCountry("IT"), "it");
  assert.equal(localeForCountry("PT"), "pt");
  assert.equal(localeForCountry("DE"), "de");
  assert.equal(localeForCountry("CH"), "de"); // alemão padrão para B2B suíço
  assert.equal(localeForCountry("DK"), "da");
  assert.equal(localeForCountry("gb"), "en"); // case-insensitive
  assert.equal(localeForCountry("de"), "de"); // case-insensitive
  assert.equal(localeForCountry("JP"), "en"); // país desconhecido: fallback
  assert.equal(localeForCountry(""), "en");
});

test("preview-i18n: a Suíça sai do alemão único e segue a região linguística", () => {
  // Romandia: francês. A forma LOCAL é a que chega pela descoberta (o select);
  // a inglesa é cobertura defensiva de criação manual, não a saída do Places.
  assert.equal(localeForLead("CH", "Geneva"), "fr");
  assert.equal(localeForLead("CH", "Genève"), "fr");
  assert.equal(localeForLead("CH", "Lausanne"), "fr");
  // Ticino: italiano.
  assert.equal(localeForLead("CH", "Lugano"), "it");
  assert.equal(localeForLead("CH", "Bellinzona"), "it");
  // Suíça alemã: alemão.
  assert.equal(localeForLead("CH", "Zurich"), "de");
  assert.equal(localeForLead("CH", "Zürich"), "de");
  assert.equal(localeForLead("CH", "Berne"), "de");
  // Fallback DELIBERADO: cidade ausente, vazia ou desconhecida vira alemão (~62%).
  assert.equal(localeForLead("CH", undefined), "de");
  assert.equal(localeForLead("CH", null), "de");
  assert.equal(localeForLead("CH", ""), "de");
  assert.equal(localeForLead("CH", "Cidade Que Não Existe"), "de");
  assert.equal(localeForLead("ch", "Geneva"), "fr"); // case-insensitive no país
});

test("preview-i18n: fora da Suíça a cidade é ignorada", () => {
  // "Geneva" não pode arrastar um lead alemão/italiano/inglês para o francês.
  assert.equal(localeForLead("DE", "Geneva"), "de");
  assert.equal(localeForLead("IT", "Geneva"), "it");
  assert.equal(localeForLead("GB", "Lugano"), "en");
  assert.equal(localeForLead("PT", "Zurich"), "pt");
  // Sem cidade, localeForLead é idêntico a localeForCountry em todo mercado.
  for (const cc of SEARCHABLE_MARKETS) {
    assert.equal(localeForLead(cc), localeForCountry(cc), `${cc} divergiu sem cidade`);
  }
});

/**
 * Toda a copy de um locale, com as funções já materializadas: o que o prospect
 * realmente lê, no topo do dicionário e nos quatro modelos.
 */
function allCopy(locale: Locale): string[] {
  const d = DICTS[locale];
  const top = [
    ...Object.values(d).filter((v): v is string => typeof v === "string"),
    d.metaTitle({ name: "Casa Nova", city: "Madrid" }),
    d.metaDescription({ name: "Casa Nova", city: "Madrid" }),
    d.metaDescription({ name: "Casa Nova", city: null }),
  ];
  const nested = TEMPLATE_IDS.flatMap((t) => {
    const td = d.templates[t];
    return [...Object.values(td).filter((v): v is string => typeof v === "string"), td.inCity("Madrid")];
  });
  return [...top, ...nested];
}

/** Só slogan e "sobre": o texto corrido que se apresenta como fala do negócio. */
function proseCopy(locale: Locale): string[] {
  return TEMPLATE_IDS.flatMap((t) => [DICTS[locale].templates[t].tagline, DICTS[locale].templates[t].about]);
}

test("preview-i18n: nenhum dicionário afirma horário de funcionamento", () => {
  // Horário só existe como DADO (SiteContent.hours) e só aparece quando ela
  // preencheu. No dicionário há apenas o RÓTULO da seção (templates.*.hoursHeading);
  // no topo do PreviewDict não pode voltar chave de horário, e nenhuma copy pode
  // trazer um valor com cara de horário.
  const hoursWord =
    /hour|horári|horario|orari|horaire|öppettid|åpningstid|åbningstid|openingstijd|öffnungszeit/i;
  // "9:00-19:00", "9h00", "9am", "9-19 Uhr": valor com cara de horário.
  const hoursValue = /\d{1,2}\s*[:.h]\s*\d{2}|\b\d{1,2}\s*(am|pm)\b|\bUhr\b/i;
  for (const l of LOCALES) {
    for (const key of Object.keys(DICTS[l])) {
      assert.equal(hoursWord.test(key), false, `${l}: chave de horário no topo do dicionário (${key})`);
    }
    for (const s of allCopy(l)) {
      assert.equal(hoursValue.test(s), false, `${l}: copy afirma horário: ${JSON.stringify(s)}`);
    }
    for (const s of proseCopy(l)) {
      assert.equal(hoursWord.test(s), false, `${l}: slogan/sobre promete horário: ${JSON.stringify(s)}`);
    }
  }
});

test("preview-i18n: a copy não afirma localização que a base não tem", () => {
  // Do lead só se sabe a CIDADE. "Em pleno centro de X" / "no coração da cidade"
  // é endereço inventado: boa parte dos leads fica em bairro ou periferia.
  const centreClaim =
    /pleno centro|pieno centro|plein centre|centro de|centre of|centre de|centrum|zentrum|herzen der stadt|heart of|cœur de|cuore della|corazón de|coração|mitt i stan|mitt i centrala|midt i sentrum|midt i byen/i;
  for (const l of LOCALES) {
    for (const s of allCopy(l)) {
      assert.equal(centreClaim.test(s), false, `${l}: afirma centralidade: ${JSON.stringify(s)}`);
    }
  }
});

test("preview-i18n: todos os locales têm as mesmas chaves, inclusive templates.<id>.*", () => {
  const keys = Object.keys(DICTS.en).sort();
  const nestedKeys = Object.keys(DICTS.en.templates.mesa).sort();
  for (const l of LOCALES) {
    assert.deepEqual(Object.keys(DICTS[l]).sort(), keys, `locale ${l} fora de paridade`);
    for (const t of TEMPLATE_IDS) {
      assert.deepEqual(Object.keys(DICTS[l].templates[t]).sort(), nestedKeys, `${l}.templates.${t} fora de paridade`);
    }
  }
});

test("preview-i18n: as chaves do template único não voltam", () => {
  for (const key of ["heroSubtitle", "featureQualityTitle", "featureLocationBodyWithCity", "visitHeading", "visitBody"]) {
    assert.equal(key in DICTS.en, false, `${key} voltou ao topo do dicionário`);
  }
});

test("preview-i18n: todo mercado pesquisável tem dicionário completo (paridade)", () => {
  const enKeys = Object.keys(DICTS.en).sort();
  for (const cc of SEARCHABLE_MARKETS) {
    const locale = localeForCountry(cc);
    const dict = DICTS[locale];
    assert.ok(dict, `mercado ${cc} sem dicionário para "${locale}"`);
    assert.deepEqual(Object.keys(dict).sort(), enKeys, `mercado ${cc} (locale ${locale}) com chaves faltando`);
    // Um mercado novo sem tradução cairia em "en" silenciosamente: só GB/IE podem.
    if (locale === "en") {
      assert.ok(["GB", "IE"].includes(cc), `mercado ${cc} caiu no fallback "en" sem tradução`);
    }
    for (const s of allCopy(locale)) assert.ok(s.trim().length > 0, `${locale}: copy vazia`);
  }
});

test("preview-i18n: os três idiomas da Suíça têm dicionário completo e não-vazio", () => {
  const enKeys = Object.keys(DICTS.en).sort();
  // Uma cidade por região: o que o lead suíço real abre precisa estar traduzido.
  for (const city of ["Geneva", "Lugano", "Zurich", undefined]) {
    const locale = localeForLead("CH", city);
    assert.notEqual(locale, "en", `CH/${city} caiu no fallback "en"`);
    assert.deepEqual(Object.keys(DICTS[locale]).sort(), enKeys, `CH/${city} (${locale}) com chaves faltando`);
    for (const s of allCopy(locale)) assert.ok(s.trim().length > 0, `${locale}: copy vazia`);
  }
});

test("preview-i18n: o dicionário francês está em francês, não em português", () => {
  // Guarda contra copiar/colar do dicionário pt: as duas línguas se parecem o
  // bastante para um erro passar despercebido em revisão.
  const body = allCopy("fr").join(" | ");
  assert.equal(body.match(/Ligar|Venha|Horário|Telefone|avaliações|Qualidade|Reservar mesa/), null, body);
  assert.ok(DICTS.fr.call === "Appeler" && DICTS.fr.phoneLabel === "Téléphone");
  assert.equal(DICTS.fr.templates.mesa.tagline, "Une table dressée avec soin");
});

test("preview-i18n: a copy francesa nunca usa espaço normal antes de ? ! : ;", () => {
  // Em francês essa pontuação leva espaço INSECÁVEL (U+00A0). Com espaço normal a
  // quebra de linha joga o sinal sozinho para o começo da linha. Vale também para
  // os quatro modelos.
  for (const s of allCopy("fr")) {
    assert.equal(s.match(/ [?!:;]/), null, `espaço normal antes da pontuação: ${JSON.stringify(s)}`);
  }
});

test("preview-i18n: funções interpoladas incluem os argumentos", () => {
  for (const l of LOCALES) {
    const t = DICTS[l].metaTitle({ name: "Casa Nova", city: "Madrid" });
    assert.ok(t.includes("Casa Nova") && t.includes("Madrid"), `${l}.metaTitle não interpola`);
    const d = DICTS[l].metaDescription({ name: "Casa Nova", city: "Madrid" });
    assert.ok(d.includes("Casa Nova") && d.includes("Madrid"), `${l}.metaDescription não interpola`);
    assert.ok(DICTS[l].metaDescription({ name: "Casa Nova", city: null }).includes("Casa Nova"));
    for (const id of TEMPLATE_IDS) {
      assert.ok(DICTS[l].templates[id].inCity("Madrid").includes("Madrid"), `${l}.${id}.inCity não interpola`);
    }
  }
});

/* ------------------------------------------------ guardas na fonte dos modelos */

const TEMPLATE_FILES = ["mesa", "estudio", "oficio", "vitrine"] as const;

/** Fonte sem comentários: o que é RENDERIZADO, não o que se explica sobre ele. */
function source(name: string): string {
  const src = readFileSync(new URL(`../src/components/site-templates/${name}.tsx`, import.meta.url), "utf8");
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

test("site-templates: nenhuma string PT hardcoded nos modelos", () => {
  for (const f of [...TEMPLATE_FILES, "shared"]) {
    assert.equal(source(f).match(/Venha|Tradição|Seg–Sáb|Reservar|Fechado/), null, `${f}.tsx com texto PT fixo`);
  }
});

test("site-templates: horário, preço e itens só saem de view.*, nunca de tr.*", () => {
  // Foi assim que um horário inventado entrou no template antigo: valor vindo do
  // dicionário num bloco que se apresenta como registro do negócio.
  for (const f of TEMPLATE_FILES) {
    const code = source(f);
    for (const m of code.match(/hours=\{[^}]*\}/g) ?? []) {
      assert.equal(m, "hours={view.hours}", `${f}.tsx: ${m}`);
    }
    for (const m of code.match(/items=\{[^}]*\}/g) ?? []) {
      assert.equal(m, "items={view.items}", `${f}.tsx: ${m}`);
    }
    for (const m of code.match(/urls=\{[^}]*\}/g) ?? []) {
      assert.equal(m, "urls={view.galleryUrls}", `${f}.tsx: ${m}`);
    }
  }
  for (const f of [...TEMPLATE_FILES, "shared"]) {
    const code = source(f);
    // Sem separador "." aqui: classe Tailwind (`tracking-[0.22em]`) daria falso positivo.
    assert.equal(
      code.match(/\b\d{1,2}\s*[:h]\s*\d{2}\b|\b\d{1,2}\s*(am|pm)\b|\d{1,2}[:h]\d{2}\s*[-]/i),
      null,
      `${f}.tsx com horário fixo`,
    );
    for (const dd of code.match(/<dd[^>]*>[\s\S]*?<\/dd>/g) ?? []) {
      assert.equal(dd.match(/\btr\./), null, `${f}.tsx: <dd> com valor do dicionário: ${dd}`);
    }
  }
});

test("site-templates: container queries, sem unidade de viewport nem sticky/fixed", () => {
  // A prévia ao vivo e as miniaturas mostram o modelo num div menor que a janela
  // (spec, Decisões): media query de viewport daria o layout errado.
  assert.match(source("shared"), /className="@container /, "a raiz perdeu o @container");
  for (const f of [...TEMPLATE_FILES, "shared", "index", "template-thumb"]) {
    const code = source(f);
    assert.equal(code.match(/\b(min-h|h|w|max-h|max-w)-(dvh|svh|lvh|vh|vw|screen)\b/), null, `${f}.tsx usa viewport`);
    assert.equal(code.match(/\b\d+(dvh|svh|lvh|vh|vw)\b/), null, `${f}.tsx usa unidade de viewport`);
    assert.equal(code.match(/\b(sticky|fixed)\b/), null, `${f}.tsx usa sticky/fixed`);
    // Variante de VIEWPORT (sm:, md:, lg:) fora das de contêiner (@sm:, @md:, @lg:).
    assert.equal(code.match(/[\s"`][a-z]*(?<!@)\b(sm|md|lg|xl|2xl):[a-z]/), null, `${f}.tsx usa variante de viewport`);
  }
});

test("site-templates: foto padrão nunca leva o nome do negócio no alt", () => {
  for (const f of TEMPLATE_FILES) {
    const code = source(f);
    for (const m of code.match(/src=\{photos\.g[12]\}[^/]*alt=\{?"?[^"}]*"?\}?/g) ?? []) {
      assert.match(m, /alt=""/, `${f}.tsx: decoração com alt não vazio: ${m}`);
    }
    assert.match(code, /alt=\{heroAlt\(view\)\}/, `${f}.tsx: hero sem heroAlt`);
  }
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --experimental-strip-types --test tests/preview-i18n.test.ts 2>&1 | grep -E "^ℹ (tests|pass|fail)|^not ok"`
Expected: `ℹ tests 16`, `ℹ fail 1`: só `as chaves do template único não voltam` falha (`heroSubtitle voltou ao topo do dicionário`).

- [ ] **Step 3: Rodar o script de limpeza**

Salve em `$OUT/cleanup-i18n.mjs`:

```js
// Remove do dicionário as chaves que só o template único usava (spec 1.5):
// heroSubtitle, feature*, visitHeading, visitBody. Em cada bloco (a interface e os
// 10 dicionários) elas são contíguas: da linha `heroSubtitle` até a linha antes de
// `phoneLabel`. O comentário antigo sobre horário (entre `whereLabel` e o doc de
// `metaTitle`) é trocado pelo texto atualizado: horário agora existe como DADO.
import { readFileSync, writeFileSync } from "node:fs";
const path = "src/lib/preview-i18n.ts";
const lines = readFileSync(path, "utf8").split("\n");
const out = [];
let skipping = false;
let removedBlocks = 0;
for (const line of lines) {
  if (/^\s+heroSubtitle:/.test(line)) {
    skipping = true;
    removedBlocks++;
  }
  if (skipping && /^\s+phoneLabel:/.test(line)) skipping = false;
  if (!skipping) out.push(line);
}
let src = out.join("\n");
const start = src.indexOf("  // NÃO EXISTE chave de horário aqui");
const end = src.indexOf("  /**\n   * Título da aba do navegador.");
if (start < 0 || end < 0 || end < start) throw new Error("bloco do comentário de horário não encontrado");
const replacement = `  // Horário NÃO é chave do dicionário. Ele existe só como DADO (\`SiteContent.hours\`,
  // convex/lib/site.ts), renderizado apenas quando a Duda preencheu no editor; o
  // rótulo da seção (\`templates.<id>.hoursHeading\`) aparece junto com o dado, nunca
  // sozinho. Qualquer valor fixo ("Seg a Sáb, 9h às 19h") num dicionário seria
  // invenção sobre o negócio de terceiro e mandaria o cliente dele a uma porta
  // fechada. tests/preview-i18n.test.ts trava isso na fonte dos modelos.
`;
src = src.slice(0, start) + replacement + src.slice(end);
writeFileSync(path, src);
console.log(`blocos removidos: ${removedBlocks}`);
```

Run: `cd /Users/madu/Developer/mine/osprano && node "$OUT/cleanup-i18n.mjs" && grep -c "heroSubtitle\|featureQualityTitle\|featureLocationBodyWithCity\|visitBody\|PreviewContent" src/lib/preview-i18n.ts`
Expected: `blocos removidos: 11` (a interface e os 10 dicionários) e `0`.

- [ ] **Step 4: Rodar e ver passar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && node --experimental-strip-types --test tests/*.test.ts 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `tsc` e `eslint` sem saída; `ℹ tests 265`, `ℹ pass 265`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/preview-i18n.ts tests/preview-i18n.test.ts
git commit -m "$(cat <<'MSG'
refactor(site): remove as chaves do template único e reescreve as guardas para os modelos

As guardas leem src/components/site-templates/*.tsx: horário, preço e
itens só saem de view.*; container queries sem unidade de viewport;
foto padrão sempre com alt vazio.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 17: verificação final, build e capturas dos 4 modelos

**Files:**
- Create: `docs/redesign/templates/{mesa,estudio,oficio,vitrine}-{1280,390}.png` (8 arquivos)

- [ ] **Step 1: Tudo verde**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json && ./node_modules/.bin/eslint && node --experimental-strip-types --test tests/*.test.ts 2>&1 | grep -E "^ℹ (tests|pass|fail)" && git status --short`
Expected: sem saída dos três primeiros; `ℹ tests 265`, `ℹ pass 265`, `ℹ fail 0`; árvore limpa.

- [ ] **Step 2: Build de produção**

Run: `NEXT_PUBLIC_DEMO=1 ./node_modules/.bin/next build 2>&1 | tail -25`
Expected: `✓ Compiled successfully`, a tabela de rotas com `/p/[token]` e `/site/[slug]` como dinâmicas (ƒ), sem erro. A Fraunces é baixada durante o build (precisa de rede); se o build reclamar de fonte, é rede, não código: rode de novo. O build escreve em `.next/`, que o dev server em background também usa; se a tela de dev ficar estranha depois, reinicie o `next dev`.

- [ ] **Step 3: Capturas dos 4 modelos na paleta padrão (1280 e 390)**

Salve em `$OUT/shots.sh` e rode:

```bash
#!/bin/sh
# Quatro leads manuais no demo (um por modelo), preview de cada um, e 8 capturas
# em docs/redesign/templates/ (1280 e 390). Os leads ficam no demo: não rode
# demo:seed para limpar (apagaria os 37 leads reais do OSM).
cd /Users/madu/Developer/mine/osprano || exit 1
OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/plano-a; mkdir -p "$OUT" docs/redesign/templates
CH=$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell | tail -1)
shot() { "$CH" --headless --no-sandbox --disable-gpu --hide-scrollbars --window-size="$2" --run-all-compositor-stages-before-draw --virtual-time-budget=15000 --screenshot="$3" "$1" 2>/dev/null; }
run_one() {
  t="$1"; json="$2"
  ./node_modules/.bin/convex run leads:create "$json" > "$OUT/lead-$t.txt" 2>&1
  id=$(jq -r . "$OUT/lead-$t.txt")
  ./node_modules/.bin/convex run previews:generate "{\"leadId\":\"$id\"}" > "$OUT/token-$t.txt" 2>&1
  tok=$(jq -r . "$OUT/token-$t.txt")
  ./node_modules/.bin/convex run previews:getByToken "{\"token\":\"$tok\"}" > "$OUT/content-$t.json" 2>&1
  echo "$t lead=$id token=$tok template=$(jq -r .content.template "$OUT/content-$t.json")"
  shot "http://localhost:3000/p/$tok" 1280,2400 "docs/redesign/templates/$t-1280.png"
  shot "http://localhost:3000/p/$tok" 390,2800 "docs/redesign/templates/$t-390.png"
}
run_one mesa '{"name":"Casa Aurora","countryCode":"PT","category":"restaurant","city":"Lisboa","address":"Rua das Flores 12","phone":"+351 21 000 0000","rating":4.7,"reviewsCount":128}'
run_one estudio '{"name":"Studio Norte","countryCode":"GB","category":"barber shop","city":"Manchester","phone":"+44 161 000 0000","rating":4.9,"reviewsCount":212}'
run_one oficio '{"name":"Bakker Installaties","countryCode":"NL","category":"plumber","city":"Utrecht","phone":"+31 30 000 0000","rating":4.6,"reviewsCount":44}'
run_one vitrine '{"name":"Óptica Meridiano","countryCode":"ES","category":"optician","city":"Madrid","address":"Calle Mayor 8","phone":"+34 910 000 000","rating":4.8,"reviewsCount":67}'
ls -la docs/redesign/templates/
```

Run: `sh "$OUT/shots.sh"`
Expected: quatro linhas `<modelo> lead=... token=... template=<modelo>` (mesa, estudio, oficio, vitrine, cada um no modelo certo pela categoria) e `ls` com 8 PNGs de tamanho > 50 KB.

- [ ] **Step 4: Olhar as capturas**

Abra as 8 com Read. Confira em cada uma: nome e slogan do modelo no idioma do país (pt, en, nl, es), foto do hero, CTA de telefone com o rótulo certo (mesa: "Reservar mesa"; estúdio: "Book an appointment" e o número ao lado; ofício: "Offerte aanvragen"; vitrine: "Llamar ahora"), nota e avaliações, "sobre" com duas fotos, e NENHUMA seção de cardápio/serviços, galeria ou horário (não há dado). Em 390 px o layout é de uma coluna (container query), sem rolagem horizontal. Se alguma foto sair em branco, é o virtual time: repita só aquela captura.

- [ ] **Step 5: Commit das capturas**

```bash
git add docs/redesign/templates
git commit -m "$(cat <<'MSG'
docs(site): capturas dos 4 modelos na paleta padrão em 1280 e 390

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

- [ ] **Step 6: Reportar**

No relatório final, inclua: os comandos de verificação com a saída (tsc x2, eslint, `pass 265`, build), a lista dos commits (`git log --oneline a456bd7..HEAD`), os 8 caminhos das capturas, o resultado da Task 14 (token estável, conversão do formato antigo, publish idempotente), e as observações abaixo, que a Duda precisa saber:

1. Quatro leads manuais ficaram no demo (Casa Aurora, Studio Norte, Bakker Installaties, Óptica Meridiano) e um lead do OSM ficou com site publicado (Task 14); `demo:seed` apagaria os 37 leads reais, então não foi rodado.
2. Previews antigos são convertidos na leitura e regravados em v2 só ao publicar (ou ao salvar, no plano B); não há job de migração.
3. Diferenças conscientes em relação à spec: `TEMPLATES` em `catalog.ts` reexportado por `index.tsx`; variável da fonte `--font-fraunces`; `TemplateDict` tem `inCity(city)` a mais (o "Em {city}" da área atendida); Ofício mostra horário ao lado do contato quando preenchido; `Contact` de Mesa e Vitrine não repete o endereço já mostrado em "onde estamos"; o slug de `publish` sai do nome do site salvo.
4. `TemplateThumb` existe e compila, mas nada o usa até os planos B e C.
5. As fotos padrão vieram do Unsplash (licença registrada em `public/templates/LICENSES.md`); trocar qualquer uma é decisão de gosto dela.
