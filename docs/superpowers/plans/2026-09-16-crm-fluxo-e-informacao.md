# CRM: fluxo do dia e informação do lead. Plano de implementação

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o CRM passa a dizer o que fazer hoje (próxima ação por lead, faixa "Hoje", "parado") e a guardar o que o Google não entrega (contato, valores, motivo de perda, notas e histórico por lead).

**Architecture:** uma próxima ação por lead gravada no próprio documento `leads`; notas são eventos `note` na tabela `events`; "hoje", "atrasada" e "parado" são calculados no navegador por funções puras em `convex/lib/domain.ts` (o Convex roda em UTC, o dia civil é o do navegador). Bloco A (fluxo) primeiro, Bloco B (informação) depois; "Perdido" com motivo entra num commit só.

**Tech Stack:** Next.js 16 App Router (React 19, React Compiler via `eslint-plugin-react-hooks` 7), Tailwind v4, Convex 1.42 (deployment local anônimo em modo demo), `node --test` com `--experimental-strip-types`, `react-icons/md`.

**Spec (fonte de verdade):** `docs/superpowers/specs/2026-09-16-crm-fluxo-e-informacao-design.md`. Estilo visual: `docs/superpowers/specs/2026-09-16-redesenho-vidro-design.md` (já implementado antes deste plano).

---

## Convenções deste plano (leia antes da Tarefa 0)

**Toolchain (o `pnpm <script>` aborta nesta máquina; chame os binários direto):**

| O quê | Comando | Esperado |
|---|---|---|
| Typecheck do app | `./node_modules/.bin/tsc --noEmit` | sem saída, exit 0 |
| Typecheck do Convex (o tsconfig da raiz exclui `convex/`) | `./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json` | sem saída, exit 0 |
| Lint | `./node_modules/.bin/eslint` | sem saída, exit 0 |
| Testes (todos) | `node --experimental-strip-types --test tests/*.test.ts` | `ℹ fail 0` |
| Testes (um arquivo) | `node --experimental-strip-types --test tests/crm-domain.test.ts` | `ℹ fail 0` |
| Build | `./node_modules/.bin/next build` | "Compiled successfully" |
| Re-seed do demo | `./node_modules/.bin/convex run demo:seed > "$OUT/seed.txt" 2>&1; cat "$OUT/seed.txt"` | `{ "seeded": 51 }` |
| Funções implantadas | `./node_modules/.bin/convex function-spec > "$OUT/spec.json"` | JSON com `.functions[].identifier` |

- Os servidores já rodam em background: `./node_modules/.bin/convex dev` (local, `DEMO_MODE=1`; regenera `convex/_generated` e faz push do schema/funções a cada save) e Next em `http://localhost:3000` (`NEXT_PUBLIC_DEMO=1`). Não suba um segundo `convex dev`.
- **`convex run` sempre com a saída redirecionada para arquivo** (`> "$OUT/x.json"`) e lida com `jq`. Encanar para `head` deixa o processo preso girando CPU (verificado nesta máquina). Rodando assim leva menos de 1 s.
- `OUT` é a pasta de evidências: `export OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/crm; mkdir -p "$OUT"`. Reexporte em cada shell (o estado não persiste entre chamadas).
- Screenshot headless (Chrome cacheado):
  ```bash
  CH=$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell | tail -1)
  "$CH" --headless --no-sandbox --disable-gpu --hide-scrollbars --window-size=1440,900 --run-all-compositor-stages-before-draw --virtual-time-budget=15000 --screenshot="$OUT/crm.png" http://localhost:3000/crm
  ```
  Sob virtual time o Convex pode não carregar (página só com "Carregando…"). Por isso toda verificação que depende de dado (faixa Hoje, cards, coluna Perdido) tem também um passo por `convex run`; o screenshot é complemento, não prova.
- **Commits:** conventional commits em português, um por tarefa (exceto o Bloco B "Perdido", que é um commit só por exigência da spec), sempre terminando com a linha `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Forma: `git commit -m "tipo(escopo): título" -m "corpo" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`. Sem `push`.
- **Nunca `Date.now()` no corpo de um componente.** O React Compiler (`react-hooks/purity`, erro de lint verificado nesta máquina) recusa. O relógio vem do hook `useNow()` (Tarefa 8), que faz `useState(() => Date.now())` mais um `setInterval` de 60 s. Toda função de domínio que depende do relógio recebe `now`.
- **Estilo (redesenho vidro sobre névoa):** bloco de primeiro nível (encosta na névoa) usa `glass` (`glass-lite` no card de lead, `glass-dense` em modal/drawer); input/select/textarea `bg-surface-solid`; chip e bloco interno `bg-surface-2`; raios `rounded-xl` (18px) e `rounded-2xl` (22px); **nunca `glass` dentro de `glass`**. Neste plano: a faixa Hoje é `glass`; o `LostReasonModal` é `glass-dense`; `NextActionForm`, `LeadInfoFields` e `LeadTimeline` vivem dentro do drawer (`glass-dense`) e são `bg-surface-2`.
- **Sem travessão** em código, comentário, copy ou commit.
- Skills: @test-driven-development nas funções puras (Chunk 1); @verification-before-completion antes de qualquer "pronto"; @licoes antes de debugar algo não-óbvio (e `docs/LESSONS.md` deste repo).

**Mapa de arquivos:**

| Arquivo | Papel | Chunk |
|---|---|---|
| `convex/schema.ts` | campos novos em `leads`, literal `note` e índice `by_lead` em `events` | 1 |
| `convex/lib/domain.ts` | funções puras da seção 1.3 da spec | 1 |
| `tests/crm-domain.test.ts` | testes das funções puras | 1 |
| `convex/leads.ts` | `setNextAction`, `clearNextAction` (1); `markLost`, guardrail do `setStage`, `updateInfo` (3); `addNote`, `timeline` (4) | 1, 3, 4 |
| `convex/demo.ts` | seed: ações/parados (1), perdidos com motivo + contato/valores (3), notas (4) | 1, 3, 4 |
| `src/lib/use-now.ts` | hook `useNow()` (relógio em estado, 60 s). Fora da tabela da spec: exigido pela regra de pureza do React Compiler | 2 |
| `src/components/crm/next-action-line.tsx` | linha de status da ação (tabela 2.2 da spec) e "parado há N dias"; usada pelo card, pela faixa e pelo formulário. Fora da tabela da spec: evita triplicar a tabela de cores | 2 |
| `src/components/crm/today-strip.tsx` | faixa Hoje | 2 |
| `src/app/(app)/crm/page.tsx` | faixa, `now`, `crmLeads`/`visible`, linha no card, filtro Parados, ordenação (2); coluna Perdido, modal, soma (3) | 2, 3 |
| `src/components/crm/next-action-form.tsx` | próxima ação no detalhe | 2 |
| `src/components/crm/lead-detail.tsx` | prop `focusNextAction` (2); Perdido via modal, faixa de perdido, `LeadInfoFields` (3); aba Histórico (4) | 2, 3, 4 |
| `src/components/crm/lost-reason-modal.tsx` | modal de motivo | 3 |
| `src/components/crm/lead-info-fields.tsx` | contato + negócio (edição inline) | 3 |
| `convex/events.ts` | `recent` exclui `note` | 4 |
| `src/components/event-glyph.tsx` | `eventDot`/`eventIcon` extraídos do Dashboard, com o caso `note` | 4 |
| `src/app/(app)/dashboard/page.tsx` | importa `event-glyph` | 4 |
| `src/components/crm/lead-timeline.tsx` | aba Histórico | 4 |

As referências de linha abaixo são do estado atual dos arquivos (antes do redesenho ser aplicado). O redesenho só troca classes CSS; se uma âncora "antes" não casar por causa de classe, ajuste a classe e mantenha a estrutura. As âncoras foram escolhidas em linhas que o redesenho não toca.

---

## Chunk 1: Bloco A, backend e domínio

### Tarefa 0: pré-condições e branch

**Files:** nenhum arquivo do repo muda.

- [ ] **Passo 1: confirmar que o redesenho já está aplicado e que a árvore está limpa**

```bash
cd /Users/madu/Developer/mine/osprano && git status --short && git log --oneline -3 && grep -c "\.glass" src/app/globals.css
```
Esperado: `git status` sem arquivos modificados (se `convex/_generated/api.d.ts` aparecer modificado, é a regeneração do `convex dev`; deixe e inclua no primeiro commit de backend), e `grep` maior que 0 (a classe `.glass` existe: redesenho aplicado). Se `grep` devolver 0, PARE: este plano pressupõe o redesenho.

- [ ] **Passo 2: confirmar os servidores**

```bash
ps aux | grep -E "convex/bin/main.js dev|next/dist/bin/next dev" | grep -v grep | wc -l
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/crm
```
Esperado: `2` e `200`.

O problema do Tailwind varrer `docs/` (500 com "Parsing CSS source code failed") **já foi corrigido** no commit `755a321` (`@source not "../../docs";` na linha 2 de `src/app/globals.css`). Se `/crm` devolver 500, a causa é outra: leia o log do `next dev` antes de mexer em qualquer coisa.

- [ ] **Passo 3: criar a branch**

```bash
git checkout -b feat/crm-fluxo-e-informacao   # a partir de `redesenho-vidro` (ou de `main` depois do merge dela); nunca de uma `main` sem o redesenho
```
Esperado: `Switched to a new branch 'feat/crm-fluxo-e-informacao'`.

- [ ] **Passo 4: preparar a pasta de evidências**

```bash
export OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/crm; mkdir -p "$OUT"; ls -d "$OUT"
```

### Tarefa 1: schema (campos, literal `note`, índice `by_lead`, de uma vez)

**Files:**
- Modify: `convex/schema.ts:23` (validador `lostReason`), `convex/schema.ts:96-98` (campos em `leads`), `convex/schema.ts:170-177` (`events`)

- [ ] **Passo 1: validador do motivo de perda**

Depois da linha 23 (`const tier = v.union(v.literal("hot"), v.literal("warm"), v.literal("cold"));`) adicione:

```ts

/** Motivo fixo de perda (CRM). Espelhado em `LOST_REASONS` de convex/lib/domain.ts. */
const lostReason = v.union(
  v.literal("too_expensive"),
  v.literal("has_site"),
  v.literal("no_response"),
  v.literal("not_interested"),
  v.literal("other"),
);
```

- [ ] **Passo 2: campos opcionais em `leads`**

Antes (linhas 96-98):
```ts
    // Descoberta → CRM: leads buscados começam saved=false (só na tela de Leads);
    // "Enviar para CRM" marca saved=true. undefined (seed/legado) = já no CRM.
    saved: v.optional(v.boolean()),
```
Depois:
```ts
    // Descoberta → CRM: leads buscados começam saved=false (só na tela de Leads);
    // "Enviar para CRM" marca saved=true. undefined (seed/legado) = já no CRM.
    saved: v.optional(v.boolean()),

    // CRM: fluxo do dia e informação do lead. Todos opcionais: lead existente segue válido.
    nextActionAt: v.optional(v.number()), // meia-noite LOCAL do dia (calculada no navegador); anda junto com a nota
    nextActionNote: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactRole: v.optional(v.string()),
    dealSetup: v.optional(v.number()), // moeda derivada do país (currencyForCountry)
    dealMonthly: v.optional(v.number()),
    lostReason: v.optional(lostReason), // leads em `lost` sem motivo existem (legado, seed)
    lostNote: v.optional(v.string()),
```

- [ ] **Passo 3: `events` ganha `note` e `by_lead`**

Antes (linhas 170-177):
```ts
      v.literal("wa_opt_in"),
      v.literal("contact_opt_in"),
    ),
    leadId: v.optional(v.id("leads")),
    previewToken: v.optional(v.string()),
    at: v.number(),
    meta: v.optional(v.any()),
  }).index("by_org", ["orgId"]),
```
Depois:
```ts
      v.literal("wa_opt_in"),
      v.literal("contact_opt_in"),
      v.literal("note"), // CRM: nota privada do lead; meta: { text }
    ),
    leadId: v.optional(v.id("leads")),
    previewToken: v.optional(v.string()),
    at: v.number(),
    meta: v.optional(v.any()),
  })
    .index("by_org", ["orgId"])
    .index("by_lead", ["leadId", "at"]), // histórico por lead
```

- [ ] **Passo 4: typecheck do Convex e conferir que o push aconteceu**

```bash
./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json && echo OK
sleep 5; ./node_modules/.bin/convex run leads:list '{}' > "$OUT/leads.json" && jq length "$OUT/leads.json"
```
Esperado: `OK` e `51`. Atenção: isso NÃO prova que o schema subiu (push recusado deixa o schema antigo no ar e `leads:list` continua devolvendo 51). A prova real é o log do `convex dev` sem erro de schema agora, e o `setNextAction` da Tarefa 6 (um patch de `nextActionAt` falharia contra o schema antigo). Os campos ainda não aparecem em nenhum lead: normal.

- [ ] **Passo 5: commit**

```bash
git add convex/schema.ts
git status --short | grep -q "convex/_generated/api.d.ts" && git add convex/_generated/api.d.ts
git commit -m "feat(crm): schema da próxima ação, contato, valores, motivo de perda e nota" -m "Campos opcionais em leads (lead antigo segue válido), literal note em events e índice by_lead para o histórico por lead. Tudo de uma vez, como a spec pede." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 2: domínio, moeda (`currencyForCountry`, `currencySymbol`, `formatMoney`)

**Files:**
- Create: `tests/crm-domain.test.ts`
- Modify: `convex/lib/domain.ts` (append no fim do arquivo, depois de `STARTER_CATEGORIES`, linha 748)

- [ ] **Passo 1: escrever os testes (falhando)**

Crie `tests/crm-domain.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { currencyForCountry, currencySymbol, formatMoney } from "../convex/lib/domain.ts";

/** Timestamps SEMPRE pelo construtor local (nunca string ISO com Z): o CI em UTC não pode mentir. */
const T = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m, d, h, min).getTime();
void T;

// ---------------------------------------------------------------------------
// Moeda
// ---------------------------------------------------------------------------

test("currencyForCountry: GB/SE/NO/CH/DK têm moeda própria; qualquer outro é EUR", () => {
  assert.equal(currencyForCountry("GB"), "GBP");
  assert.equal(currencyForCountry("SE"), "SEK");
  assert.equal(currencyForCountry("NO"), "NOK");
  assert.equal(currencyForCountry("CH"), "CHF");
  assert.equal(currencyForCountry("DK"), "DKK");
  assert.equal(currencyForCountry("NL"), "EUR");
  assert.equal(currencyForCountry("XX"), "EUR");
  assert.equal(currencyForCountry("gb"), "GBP");
});

test("currencySymbol", () => {
  assert.equal(currencySymbol("EUR"), "€");
  assert.equal(currencySymbol("GBP"), "£");
  assert.equal(currencySymbol("SEK"), "kr");
  assert.equal(currencySymbol("NOK"), "kr");
  assert.equal(currencySymbol("DKK"), "kr");
  assert.equal(currencySymbol("CHF"), "CHF");
});

test("formatMoney: quatro formatos, sem centavos, milhar com ponto", () => {
  assert.equal(formatMoney(340, "EUR"), "€340");
  assert.equal(formatMoney(340, "GBP"), "£340");
  assert.equal(formatMoney(340, "SEK"), "340 kr");
  assert.equal(formatMoney(340, "NOK"), "340 kr");
  assert.equal(formatMoney(340, "DKK"), "340 kr");
  assert.equal(formatMoney(340, "CHF"), "CHF 340");
  assert.equal(formatMoney(1200, "EUR"), "€1.200");
  assert.equal(formatMoney(1234567, "GBP"), "£1.234.567");
  assert.equal(formatMoney(339.5, "EUR"), "€340");
  assert.equal(formatMoney(339.4, "EUR"), "€339");
  assert.equal(formatMoney(0, "EUR"), "€0");
});
```

- [ ] **Passo 2: rodar e ver falhar**

```bash
node --experimental-strip-types --test tests/crm-domain.test.ts 2>&1 | tail -5
```
Esperado: falha de carga, `SyntaxError: The requested module '../convex/lib/domain.ts' does not provide an export named 'currencyForCountry'`.

- [ ] **Passo 3: implementar**

No fim de `convex/lib/domain.ts` (depois do `] as const;` de `STARTER_CATEGORIES`) acrescente:

```ts

// ---------------------------------------------------------------------------
// CRM: fluxo do dia e informação do lead. Tudo puro; quem depende do relógio
// recebe `now`. "Dia civil local" = fuso do processo que chama (o navegador,
// na UI; o Convex roda em UTC e por isso NUNCA faz aritmética de data).
// ---------------------------------------------------------------------------

export type Currency = "EUR" | "GBP" | "SEK" | "NOK" | "DKK" | "CHF";

const CURRENCY_BY_COUNTRY: Record<string, Currency> = {
  GB: "GBP",
  SE: "SEK",
  NO: "NOK",
  CH: "CHF",
  DK: "DKK",
};

/** Moeda derivada do país, sem campo no lead: fora da tabela é euro. */
export function currencyForCountry(countryCode: string): Currency {
  return CURRENCY_BY_COUNTRY[countryCode.toUpperCase()] ?? "EUR";
}

export function currencySymbol(currency: Currency): string {
  if (currency === "EUR") return "€";
  if (currency === "GBP") return "£";
  if (currency === "CHF") return "CHF";
  return "kr";
}

/** Sem centavos (arredonda), milhar com ponto: "€340", "£1.200", "340 kr", "CHF 340". */
export function formatMoney(amount: number, currency: Currency): string {
  const n = Math.round(amount);
  const digits = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const body = (n < 0 ? "-" : "") + digits;
  const symbol = currencySymbol(currency);
  if (currency === "EUR" || currency === "GBP") return `${symbol}${body}`;
  if (currency === "CHF") return `${symbol} ${body}`;
  return `${body} ${symbol}`;
}
```

- [ ] **Passo 4: rodar e ver passar**

```bash
node --experimental-strip-types --test tests/crm-domain.test.ts 2>&1 | tail -8
```
Esperado: `ℹ tests 3`, `ℹ pass 3`, `ℹ fail 0`.

- [ ] **Passo 5: commit**

```bash
git add convex/lib/domain.ts tests/crm-domain.test.ts
git commit -m "feat(crm): moeda derivada do país e formatação de valor" -m "GB, SE, NO, CH e DK têm moeda própria; o resto é euro. Sem campo no lead: é função pura." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 3: domínio, datas civis (`addDays`, `daysBetween`, `dateInputToTimestamp`, `toDateInputValue`, `formatDay`, `formatRelative`)

**Files:**
- Modify: `tests/crm-domain.test.ts` (import + append)
- Modify: `convex/lib/domain.ts` (append)

- [ ] **Passo 1: testes (falhando)**

Troque a linha de import de `tests/crm-domain.test.ts` por:
```ts
import {
  currencyForCountry,
  currencySymbol,
  formatMoney,
  addDays,
  daysBetween,
  dateInputToTimestamp,
  toDateInputValue,
  formatDay,
  formatRelative,
} from "../convex/lib/domain.ts";
```
Apague a linha `void T;` e acrescente no fim do arquivo:

```ts

// ---------------------------------------------------------------------------
// Datas civis (fuso local). Setembro = mês 8, outubro = 9 (0-based).
// ---------------------------------------------------------------------------

test("addDays: mesmo horário local, n dias civis depois (vira mês, aceita negativo)", () => {
  assert.equal(addDays(T(2026, 8, 16, 9, 30), 7), T(2026, 8, 23, 9, 30));
  assert.equal(addDays(T(2026, 8, 30, 9, 30), 1), T(2026, 9, 1, 9, 30));
  assert.equal(addDays(T(2026, 8, 16, 9, 30), -3), T(2026, 8, 13, 9, 30));
});

test("addDays: atravessa a virada do horário de verão sem virar 23 h", () => {
  // 25/10/2026 é o último domingo de outubro (fim do horário de verão na Europa; a máquina
  // está em Europe/Madrid). Em fuso sem horário de verão (CI em UTC) as igualdades continuam
  // verdadeiras, então o teste nunca mente.
  const r1 = addDays(T(2026, 9, 25, 0, 0), 1);
  assert.equal(r1, T(2026, 9, 26, 0, 0));
  assert.equal(new Date(r1).getHours(), 0);
  const r3 = addDays(T(2026, 9, 24, 0, 0), 3);
  assert.equal(r3, T(2026, 9, 27, 0, 0));
  assert.equal(new Date(r3).getHours(), 0);
  // 29/03/2026: entrada no horário de verão
  const rMar = addDays(T(2026, 2, 28, 0, 0), 1);
  assert.equal(rMar, T(2026, 2, 29, 0, 0));
  assert.equal(new Date(rMar).getHours(), 0);
});

test("daysBetween: dias civis inteiros, sinal pela ordem, robusto ao horário de verão", () => {
  assert.equal(daysBetween(T(2026, 8, 16, 23, 59), T(2026, 8, 17, 0, 0)), 1);
  assert.equal(daysBetween(T(2026, 8, 16, 0, 0), T(2026, 8, 16, 23, 59)), 0);
  assert.equal(daysBetween(T(2026, 8, 17, 0, 0), T(2026, 8, 16, 23, 59)), -1);
  assert.equal(daysBetween(T(2026, 8, 4, 12, 0), T(2026, 8, 16, 12, 0)), 12);
  assert.equal(daysBetween(T(2026, 9, 24, 12, 0), T(2026, 9, 26, 12, 0)), 2);
});

test("dateInputToTimestamp: meia-noite LOCAL do dia; inválido devolve null", () => {
  const at = dateInputToTimestamp("2026-09-23");
  assert.equal(at, T(2026, 8, 23));
  assert.equal(new Date(at!).getHours(), 0);
  assert.equal(dateInputToTimestamp(""), null);
  assert.equal(dateInputToTimestamp("23/09/2026"), null);
  assert.equal(dateInputToTimestamp("2026-02-31"), null);
});

test("toDateInputValue: YYYY-MM-DD local, com zero à esquerda", () => {
  assert.equal(toDateInputValue(T(2026, 8, 3, 23, 59)), "2026-09-03");
  assert.equal(toDateInputValue(T(2026, 11, 25, 0, 0)), "2026-12-25");
  assert.equal(toDateInputValue(T(2026, 0, 1, 0, 0)), "2026-01-01");
});

test("formatDay: hoje, ontem, amanhã, senão dia + mês abreviado", () => {
  const now = T(2026, 8, 16, 15, 0);
  assert.equal(formatDay(T(2026, 8, 16, 23, 59), now), "hoje");
  assert.equal(formatDay(T(2026, 8, 15, 0, 0), now), "ontem");
  assert.equal(formatDay(T(2026, 8, 17, 0, 0), now), "amanhã");
  assert.equal(formatDay(T(2026, 8, 23, 0, 0), now), "23 set");
  assert.equal(formatDay(T(2026, 0, 2, 0, 0), now), "2 jan");
});

test("formatRelative: agora, minutos, horas, ontem, senão formatDay", () => {
  const now = T(2026, 8, 16, 15, 0);
  assert.equal(formatRelative(now - 30_000, now), "agora");
  assert.equal(formatRelative(now - 5 * 60_000, now), "há 5 min");
  assert.equal(formatRelative(now - 2 * 3_600_000, now), "há 2 h");
  assert.equal(formatRelative(T(2026, 8, 15, 20, 0), now), "ontem");
  assert.equal(formatRelative(T(2026, 8, 12, 10, 0), now), "12 set");
});
```

- [ ] **Passo 2: rodar e ver falhar**

```bash
node --experimental-strip-types --test tests/crm-domain.test.ts 2>&1 | tail -5
```
Esperado: `SyntaxError: ... does not provide an export named 'addDays'`.

- [ ] **Passo 3: implementar**

Append em `convex/lib/domain.ts`:

```ts

const DAY_MS = 86_400_000;
const MONTH_ABBR_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Meia-noite local do dia de `at`. */
function startOfLocalDay(at: number): number {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Mesmo horário local, `n` dias civis depois: atravessa horário de verão sem virar 23 h. */
export function addDays(at: number, n: number): number {
  const d = new Date(at);
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + n,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  ).getTime();
}

/** Dias civis inteiros de `a` até `b` (positivo quando `b` é depois), fuso local. */
export function daysBetween(a: number, b: number): number {
  // Math.round: o dia da virada de horário de verão tem 23 h ou 25 h.
  return Math.round((startOfLocalDay(b) - startOfLocalDay(a)) / DAY_MS);
}

/**
 * "2026-09-23" (valor do <input type="date">) → meia-noite LOCAL do dia.
 * Nunca `new Date(string)`: isso parseia como UTC e cai no dia errado à noite.
 * Inválido (vazio, outro formato, 31/02) → null.
 */
export function dateInputToTimestamp(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date.getTime();
}

/** "YYYY-MM-DD" LOCAL, para `value` e `min` do <input type="date">. */
export function toDateInputValue(at: number): string {
  const d = new Date(at);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** "hoje", "ontem", "amanhã", senão "23 set". */
export function formatDay(at: number, now: number): string {
  const delta = daysBetween(now, at);
  if (delta === 0) return "hoje";
  if (delta === -1) return "ontem";
  if (delta === 1) return "amanhã";
  const d = new Date(at);
  return `${d.getDate()} ${MONTH_ABBR_PT[d.getMonth()]}`;
}

/** Para eventos (passado): "agora", "há 5 min", "há 2 h", "ontem", senão formatDay. */
export function formatRelative(at: number, now: number): string {
  const diff = now - at;
  if (diff < 60_000) return "agora";
  if (diff < 3_600_000) return `há ${Math.floor(diff / 60_000)} min`;
  const days = daysBetween(at, now);
  if (days === 0) return `há ${Math.floor(diff / 3_600_000)} h`;
  if (days === 1) return "ontem";
  return formatDay(at, now);
}
```

- [ ] **Passo 4: rodar e ver passar**

```bash
node --experimental-strip-types --test tests/crm-domain.test.ts 2>&1 | tail -8
```
Esperado: `ℹ tests 10`, `ℹ fail 0`.

- [ ] **Passo 5: commit**

```bash
git add convex/lib/domain.ts tests/crm-domain.test.ts
git commit -m "feat(crm): aritmética de dia civil no fuso local" -m "addDays pelo construtor local atravessa horário de verão; dateInputToTimestamp nunca usa new Date(string) (UTC). Testes com timestamps do construtor local, inclusive na virada de outubro." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 4: domínio, próxima ação e "parado" (`nextActionOf`, `actionStatus`, `stalledDays`, `STALLED_AFTER_DAYS`, `isStalled`, `compareByNextAction`)

**Files:**
- Modify: `tests/crm-domain.test.ts` (import + append)
- Modify: `convex/lib/domain.ts` (append)

- [ ] **Passo 1: testes (falhando)**

Acrescente ao import de `tests/crm-domain.test.ts` (dentro das chaves, depois de `formatRelative,`):
```ts
  nextActionOf,
  actionStatus,
  stalledDays,
  STALLED_AFTER_DAYS,
  isStalled,
  compareByNextAction,
```
E no fim do arquivo:

```ts

// ---------------------------------------------------------------------------
// Próxima ação e "parado"
// ---------------------------------------------------------------------------

test("nextActionOf: com e sem ação", () => {
  assert.deepEqual(nextActionOf({ nextActionAt: 1000, nextActionNote: "ligar" }), { at: 1000, note: "ligar" });
  assert.equal(nextActionOf({}), null);
  assert.equal(nextActionOf({ nextActionNote: "nota solta, sem data" }), null);
});

test("actionStatus: ontem 23:59 atrasada; hoje 00:00 e 23:59 hoje; amanhã 00:00 futura", () => {
  const now = T(2026, 8, 16, 15, 0);
  assert.equal(actionStatus(T(2026, 8, 15, 23, 59), now), "overdue");
  assert.equal(actionStatus(T(2026, 8, 16, 0, 0), now), "today");
  assert.equal(actionStatus(T(2026, 8, 16, 23, 59), now), "today");
  assert.equal(actionStatus(T(2026, 8, 17, 0, 0), now), "upcoming");
});

test("stalledDays: com ação null; converted e lost null; senão dias desde stageUpdatedAt", () => {
  const now = T(2026, 8, 16, 15, 0);
  const at = T(2026, 8, 4, 10, 0); // 12 dias civis antes
  assert.equal(stalledDays({ stage: "approached", stageUpdatedAt: at, nextActionAt: now, nextActionNote: "x" }, now), null);
  assert.equal(stalledDays({ stage: "converted", stageUpdatedAt: at }, now), null);
  assert.equal(stalledDays({ stage: "lost", stageUpdatedAt: at }, now), null);
  assert.equal(stalledDays({ stage: "approached", stageUpdatedAt: at }, now), 12);
  assert.equal(stalledDays({ stage: "base", stageUpdatedAt: now }, now), 0);
});

test("isStalled: 6 dias não, 7 dias sim; convertido nunca", () => {
  const now = T(2026, 8, 16, 15, 0);
  assert.equal(STALLED_AFTER_DAYS, 7);
  assert.equal(isStalled({ stage: "base", stageUpdatedAt: T(2026, 8, 10, 15, 0) }, now), false);
  assert.equal(isStalled({ stage: "base", stageUpdatedAt: T(2026, 8, 9, 15, 0) }, now), true);
  assert.equal(isStalled({ stage: "converted", stageUpdatedAt: T(2026, 7, 1) }, now), false);
});

test("compareByNextAction: com ação antes de sem ação; at crescente; sem ação por score decrescente", () => {
  const withLate = { nextActionAt: 200, score: 10 };
  const withEarly = { nextActionAt: 100, score: 90 };
  const noneHi = { score: 80 };
  const noneLo = { score: 20 };
  assert.ok(compareByNextAction(withLate, noneHi) < 0);
  assert.ok(compareByNextAction(noneHi, withLate) > 0);
  assert.ok(compareByNextAction(withEarly, withLate) < 0);
  assert.ok(compareByNextAction(noneHi, noneLo) < 0);
  assert.deepEqual([noneLo, withLate, noneHi, withEarly].sort(compareByNextAction), [withEarly, withLate, noneHi, noneLo]);
});
```

- [ ] **Passo 2: rodar e ver falhar**

```bash
node --experimental-strip-types --test tests/crm-domain.test.ts 2>&1 | tail -5
```
Esperado: `SyntaxError: ... does not provide an export named 'nextActionOf'`.

- [ ] **Passo 3: implementar**

Append em `convex/lib/domain.ts`:

```ts

export interface NextAction {
  at: number;
  note: string;
}

export type ActionStatus = "overdue" | "today" | "upcoming";

/** Uma próxima ação por lead, no próprio documento. Sem `nextActionAt` não há ação. */
export function nextActionOf(lead: {
  nextActionAt?: number | null;
  nextActionNote?: string | null;
}): NextAction | null {
  if (typeof lead.nextActionAt !== "number") return null;
  return { at: lead.nextActionAt, note: lead.nextActionNote ?? "" };
}

/** Antes de hoje 00:00 local = atrasada; mesmo dia civil = hoje; depois = futura. */
export function actionStatus(at: number, now: number): ActionStatus {
  const delta = daysBetween(now, at);
  if (delta < 0) return "overdue";
  if (delta === 0) return "today";
  return "upcoming";
}

export const STALLED_AFTER_DAYS = 7;

type StalledInput = {
  nextActionAt?: number | null;
  nextActionNote?: string | null;
  stage: string;
  stageUpdatedAt: number;
};

/**
 * Dias desde a última mudança de estágio, SÓ quando não há ação e o estágio não é
 * converted nem lost; senão null. Conta a partir de stageUpdatedAt (não do último
 * evento): é o estágio que mede avanço, e ler eventos por card custaria uma query cada.
 */
export function stalledDays(lead: StalledInput, now: number): number | null {
  if (nextActionOf(lead) !== null) return null;
  if (lead.stage === "converted" || lead.stage === "lost") return null;
  return daysBetween(lead.stageUpdatedAt, now);
}

export function isStalled(lead: StalledInput, now: number): boolean {
  const days = stalledDays(lead, now);
  return days !== null && days >= STALLED_AFTER_DAYS;
}

/** Com ação antes de sem ação; entre com ação, `at` crescente; entre sem ação, score decrescente. */
export function compareByNextAction(
  a: { nextActionAt?: number | null; score?: number | null },
  b: { nextActionAt?: number | null; score?: number | null },
): number {
  const aAt = typeof a.nextActionAt === "number" ? a.nextActionAt : null;
  const bAt = typeof b.nextActionAt === "number" ? b.nextActionAt : null;
  if (aAt !== null && bAt !== null) return aAt - bAt;
  if (aAt !== null) return -1;
  if (bAt !== null) return 1;
  return (b.score ?? 0) - (a.score ?? 0);
}
```

- [ ] **Passo 4: rodar e ver passar**

```bash
node --experimental-strip-types --test tests/crm-domain.test.ts 2>&1 | tail -8
```
Esperado: `ℹ tests 15`, `ℹ fail 0`.

- [ ] **Passo 5: commit**

```bash
git add convex/lib/domain.ts tests/crm-domain.test.ts
git commit -m "feat(crm): status da próxima ação, lead parado e ordenação por ação" -m "Parado conta de stageUpdatedAt e nunca em convertido/perdido. Tudo recebe now: nenhuma data é calculada no servidor." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 5: domínio, motivo de perda (`LOST_REASONS`, `lostReasonLabel`)

**Files:**
- Modify: `tests/crm-domain.test.ts` (import + append)
- Modify: `convex/lib/domain.ts` (append)

- [ ] **Passo 1: testes (falhando)**

Acrescente ao import: `LOST_REASONS,` e `lostReasonLabel,`. No fim do arquivo:

```ts

// ---------------------------------------------------------------------------
// Motivo de perda
// ---------------------------------------------------------------------------

test("LOST_REASONS: cinco motivos, nesta ordem", () => {
  assert.deepEqual(
    LOST_REASONS.map((r) => r.id),
    ["too_expensive", "has_site", "no_response", "not_interested", "other"],
  );
  assert.deepEqual(
    LOST_REASONS.map((r) => r.label),
    ["Caro demais", "Já tem site", "Sem resposta", "Não quer", "Outro"],
  );
});

test("lostReasonLabel: rótulo, ou undefined para ausente/desconhecido", () => {
  assert.equal(lostReasonLabel("too_expensive"), "Caro demais");
  assert.equal(lostReasonLabel("other"), "Outro");
  assert.equal(lostReasonLabel(undefined), undefined);
  assert.equal(lostReasonLabel(null), undefined);
  assert.equal(lostReasonLabel("nope"), undefined);
});
```

- [ ] **Passo 2: rodar e ver falhar**

```bash
node --experimental-strip-types --test tests/crm-domain.test.ts 2>&1 | tail -5
```
Esperado: `SyntaxError: ... does not provide an export named 'LOST_REASONS'`.

- [ ] **Passo 3: implementar**

Append em `convex/lib/domain.ts`:

```ts

export type LostReason = "too_expensive" | "has_site" | "no_response" | "not_interested" | "other";

/** Espelha o validador `lostReason` de convex/schema.ts. Ordem = ordem dos rádios no modal. */
export const LOST_REASONS: { id: LostReason; label: string }[] = [
  { id: "too_expensive", label: "Caro demais" },
  { id: "has_site", label: "Já tem site" },
  { id: "no_response", label: "Sem resposta" },
  { id: "not_interested", label: "Não quer" },
  { id: "other", label: "Outro" },
];

/** Leads perdidos sem motivo existem (legado, seed): ausente → undefined, e a tela mostra só "Perdido". */
export function lostReasonLabel(id?: string | null): string | undefined {
  return LOST_REASONS.find((r) => r.id === id)?.label;
}
```

- [ ] **Passo 4: rodar tudo e ver passar**

```bash
node --experimental-strip-types --test tests/*.test.ts 2>&1 | tail -8
./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint tests/crm-domain.test.ts convex/lib/domain.ts && echo OK
```
Esperado: `ℹ fail 0` (17 testes novos somados aos 191 existentes) e `OK`.

- [ ] **Passo 5: commit**

```bash
git add convex/lib/domain.ts tests/crm-domain.test.ts
git commit -m "feat(crm): motivos fixos de perda" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 6: mutations `setNextAction` e `clearNextAction`

**Files:**
- Modify: `convex/leads.ts:152` (inserir antes do doc comment de `schedule`)

- [ ] **Passo 1: escrever as mutations**

Antes (linha 152):
```ts
/** Marca uma reunião com o lead e move-o para "Agendado". */
```
Depois:
```ts
// ---------------------------------------------------------------------------
// CRM: próxima ação (uma por lead, no próprio documento; os dois campos andam juntos)
// ---------------------------------------------------------------------------

/** Marca a próxima ação. `at` é a meia-noite LOCAL do dia, calculada no navegador (o servidor está em UTC). */
export const setNextAction = mutation({
  args: { id: v.id("leads"), at: v.number(), note: v.string() },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    const note = args.note.trim();
    if (!note) throw new Error("Escreva o que fazer");
    await ctx.db.patch(args.id, { nextActionAt: args.at, nextActionNote: note });
  },
});

/** Conclui a próxima ação: remove os dois campos. */
export const clearNextAction = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    await ctx.db.patch(args.id, { nextActionAt: undefined, nextActionNote: undefined });
  },
});

/** Marca uma reunião com o lead e move-o para "Agendado". */
```

- [ ] **Passo 2: typecheck e conferir o deploy**

```bash
./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json && echo OK
sleep 5; ./node_modules/.bin/convex function-spec > "$OUT/spec.json"; jq -r '.functions[].identifier' "$OUT/spec.json" | grep -E "leads.js:(setNextAction|clearNextAction)"
```
Esperado: `OK` e as duas linhas `leads.js:setNextAction`, `leads.js:clearNextAction`.

- [ ] **Passo 3: exercitar pela CLI (vazia recusa; setar grava os dois; limpar remove os dois)**

```bash
./node_modules/.bin/convex run leads:list '{}' > "$OUT/leads.json"
ID=$(jq -r '.[] | select(.name == "Bella Cucina") | ._id' "$OUT/leads.json"); echo "$ID"
./node_modules/.bin/convex run leads:setNextAction "{\"id\":\"$ID\",\"at\":1789000000000,\"note\":\"   \"}" > "$OUT/set-empty.txt" 2>&1; grep -q "Escreva o que fazer" "$OUT/set-empty.txt" && echo OK
./node_modules/.bin/convex run leads:setNextAction "{\"id\":\"$ID\",\"at\":1789000000000,\"note\":\"  ligar de novo  \"}" > "$OUT/set.txt" 2>&1
./node_modules/.bin/convex run leads:get "{\"id\":\"$ID\"}" > "$OUT/lead.json"; jq -c '{nextActionAt, nextActionNote}' "$OUT/lead.json"
./node_modules/.bin/convex run leads:clearNextAction "{\"id\":\"$ID\"}" > "$OUT/clear.txt" 2>&1
./node_modules/.bin/convex run leads:get "{\"id\":\"$ID\"}" > "$OUT/lead.json"; jq -c '{nextActionAt, nextActionNote}' "$OUT/lead.json"
```
Esperado, na ordem: um id; `1`; `{"nextActionAt":1789000000000,"nextActionNote":"ligar de novo"}` (com trim); `{"nextActionAt":null,"nextActionNote":null}`.

- [ ] **Passo 4: commit**

```bash
git add convex/leads.ts
git commit -m "feat(crm): mutations da próxima ação (setNextAction, clearNextAction)" -m "Nota vazia é erro; limpar remove os dois campos juntos. Sem mutation de adiar: adiar é setNextAction com addDays calculado no navegador." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 7: seed do Bloco A (ações atrasadas, de hoje e leads parados)

**Files:**
- Modify: `convex/demo.ts:3` (import de `Doc`), `convex/demo.ts:174` (tabela `crmExtras` depois de `STAGES`), `convex/demo.ts:218-225` (loop) e `convex/demo.ts:253-257` (insert)

- [ ] **Passo 1: import**

Antes (linha 3):
```ts
import type { Id } from "./_generated/dataModel";
```
Depois:
```ts
import type { Doc, Id } from "./_generated/dataModel";
```

- [ ] **Passo 2: tabela de extras (só dados)**

Depois do bloco `STAGES` (linha 174, a linha `];` que fecha `const STAGES`), e antes de `function phone(`, adicione:

```ts

const DAY = 86_400_000;

/**
 * CRM (fluxo do dia e informação do lead), por posição em NAMES. Só dados: quem decide
 * "atrasada/hoje/parado" é o domínio, no navegador. A ação de HOJE usa o instante `now`,
 * nunca uma meia-noite calculada aqui: o Convex roda em UTC.
 */
type CrmExtra = Partial<
  Pick<
    Doc<"leads">,
    | "nextActionAt"
    | "nextActionNote"
    | "stageUpdatedAt"
    | "stage"
    | "lostReason"
    | "lostNote"
    | "contactName"
    | "contactRole"
    | "dealSetup"
    | "dealMonthly"
  >
>;

function crmExtras(now: number): Record<number, CrmExtra> {
  return {
    // ação atrasada
    2: { nextActionAt: now - 2 * DAY, nextActionNote: "ligar de novo" }, // The Copper Pot (abordado)
    8: { nextActionAt: now - 5 * DAY, nextActionNote: "mandar proposta" }, // Olive & Thyme (follow up)
    // ação hoje
    3: { nextActionAt: now, nextActionNote: "confirmar reunião" }, // De Gouden Lepel BV (agendado)
    20: { nextActionAt: now, nextActionNote: "enviar prévia do site" }, // Sharp Cuts (abordado)
    // parados: estágio sem mudar há 10+ dias e sem ação
    7: { stageUpdatedAt: now - 12 * DAY }, // Trattoria Roma (abordado)
    12: { stageUpdatedAt: now - 15 * DAY }, // The Bruncherie (follow up)
    16: { stageUpdatedAt: now - 10 * DAY }, // Whiskey & Co (agendado)
  };
}
```

- [ ] **Passo 3: aplicar no loop de inserção**

Antes (linhas 218-225):
```ts
    const ids = [];
    for (let i = 0; i < NAMES.length; i++) {
      const [name, category] = NAMES[i];
      const cc = COUNTRY_SEQ[i % COUNTRY_SEQ.length];
      const cities = CITY[cc];
      const city = cities[i % cities.length];
      const p = PROFILES[i % PROFILES.length];
      const stage = STAGES[(i * 5) % STAGES.length];
```
Depois:
```ts
    const ids = [];
    const extras = crmExtras(now);
    for (let i = 0; i < NAMES.length; i++) {
      const [name, category] = NAMES[i];
      const cc = COUNTRY_SEQ[i % COUNTRY_SEQ.length];
      const cities = CITY[cc];
      const city = cities[i % cities.length];
      const p = PROFILES[i % PROFILES.length];
      const extra = extras[i] ?? {};
      const stage = extra.stage ?? STAGES[(i * 5) % STAGES.length];
```

Antes (linhas 253-257):
```ts
        stage,
        stageUpdatedAt: now,
        fetchedAt: now,
      });
      ids.push({ id, name, category, city, cc, stage, phone: phone(cc, i), rating: Math.round(rating * 10) / 10, reviews });
```
Depois:
```ts
        stage,
        stageUpdatedAt: now,
        fetchedAt: now,
        ...extra, // por último: sobrescreve stage/stageUpdatedAt quando a tabela manda
      });
      ids.push({ id, name, category, city, cc, stage, phone: phone(cc, i), rating: Math.round(rating * 10) / 10, reviews });
```

- [ ] **Passo 4: typecheck, re-seed e conferir**

```bash
./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json && echo OK
sleep 5; ./node_modules/.bin/convex run demo:seed > "$OUT/seed.txt" 2>&1; cat "$OUT/seed.txt"
./node_modules/.bin/convex run leads:list '{}' > "$OUT/leads.json"
jq -r '.[] | select(.nextActionAt != null) | "\(.name) | \(.nextActionNote) | \(.nextActionAt)"' "$OUT/leads.json"
NOW=$(date +%s000); jq --argjson now "$NOW" '[.[] | select(.nextActionAt == null and .stage != "converted" and .stage != "lost" and (($now - .stageUpdatedAt) >= 7 * 86400000))] | map(.name)' "$OUT/leads.json"
```
Esperado: `{ "seeded": 51 }`; 4 linhas (The Copper Pot, Olive & Thyme, De Gouden Lepel BV, Sharp Cuts) com as notas acima; e o array `["Trattoria Roma","The Bruncherie","Whiskey & Co"]` (ordem pode variar).

- [ ] **Passo 5: commit**

```bash
git add convex/demo.ts
git commit -m "feat(demo): seed com ações atrasadas, de hoje e leads parados" -m "Para a faixa Hoje e o parado aparecerem no modo demo. Ação de hoje usa o instante now, nunca meia-noite calculada no servidor (UTC)." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

## Chunk 2: Bloco A, UI (faixa Hoje, card, filtro, ordenação, próxima ação no detalhe)

### Tarefa 8: `useNow()` e a linha de status da ação

**Files:**
- Create: `src/lib/use-now.ts`
- Create: `src/components/crm/next-action-line.tsx`

- [ ] **Passo 1: o hook do relógio**

Crie `src/lib/use-now.ts`:

```ts
"use client";

import { useEffect, useState } from "react";

/**
 * "Agora" em estado, atualizado a cada `intervalMs` (60 s): a faixa Hoje e o "parado" viram
 * sozinhos à meia-noite. É o ÚNICO lugar em que `Date.now()` roda perto de um render: o React
 * Compiler (react-hooks/purity) recusa `Date.now()` no corpo de um componente, e o inicializador
 * preguiçoso do useState é o caminho permitido.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
```

- [ ] **Passo 2: a linha de status (tabela 2.2 da spec, usada em três lugares)**

Crie `src/components/crm/next-action-line.tsx`:

```tsx
import type { Doc } from "@convex/_generated/dataModel";
import {
  nextActionOf,
  actionStatus,
  daysBetween,
  formatDay,
  isStalled,
  stalledDays,
  type ActionStatus,
  type NextAction,
} from "@convex/lib/domain";

/** Tabela 2.2 da spec: atrasada em --hot, hoje em --warm, futura em --faint. */
const ACTION_COLOR: Record<ActionStatus, string> = {
  overdue: "var(--hot)",
  today: "var(--warm)",
  upcoming: "var(--faint)",
};

export function daysAgoLabel(days: number): string {
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

/** "↺ ligar de novo · há 2 dias" / "· hoje" / "· 23 set", na cor do status. */
export function ActionStatusText({
  action,
  now,
  className = "",
}: {
  action: NextAction;
  now: number;
  className?: string;
}) {
  const status = actionStatus(action.at, now);
  const when = status === "overdue" ? daysAgoLabel(daysBetween(action.at, now)) : formatDay(action.at, now);
  return (
    <p className={`truncate text-[11px] font-medium ${className}`} style={{ color: ACTION_COLOR[status] }}>
      <span aria-hidden>↺ </span>
      {action.note} · {when}
    </p>
  );
}

/**
 * Linha do card do Kanban: a ação vigente; sem ação e parado há 7+ dias, "parado há N dias";
 * senão nada. Convertido e Perdido nunca mostram "parado" (stalledDays garante).
 */
export function CardActionLine({ lead, now }: { lead: Doc<"leads">; now: number }) {
  const action = nextActionOf(lead);
  if (action) return <ActionStatusText action={action} now={now} className="mt-1" />;
  if (isStalled(lead, now)) {
    return <p className="mt-1 text-[11px] italic text-faint">parado {daysAgoLabel(stalledDays(lead, now) ?? 0)}</p>;
  }
  return null;
}
```

- [ ] **Passo 3: typecheck e lint**

```bash
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/lib/use-now.ts src/components/crm/next-action-line.tsx && echo OK
```
Esperado: `OK`.

- [ ] **Passo 4: commit**

```bash
git add src/lib/use-now.ts src/components/crm/next-action-line.tsx
git commit -m "feat(crm): relógio em estado (useNow) e linha de status da próxima ação" -m "Date.now() no corpo do componente é recusado pelo React Compiler; o relógio vem de um hook com inicializador preguiçoso e tick de 60 s, e a faixa vira sozinha à meia-noite." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 9: faixa Hoje (`today-strip.tsx`)

**Files:**
- Create: `src/components/crm/today-strip.tsx`

- [ ] **Passo 1: escrever o componente**

Crie `src/components/crm/today-strip.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { MdCheck, MdKeyboardArrowDown } from "react-icons/md";
import { addDays, daysBetween, type ActionStatus, type NextAction } from "@convex/lib/domain";
import { daysAgoLabel } from "./next-action-line";

export interface TodayItem {
  lead: Doc<"leads">;
  action: NextAction;
  status: ActionStatus; // a página só manda "overdue" e "today"
}

const POSTPONE_DAYS = [1, 3, 7] as const;

/**
 * Faixa "Hoje": atrasadas (--hot) e de hoje, ordenadas por `at`. Some quando não há itens.
 * Recebe os itens prontos da página (calculados ANTES de busca/filtro/ordenação, com o `now`
 * de estado) e chama as duas mutations por conta própria.
 */
export function TodayStrip({
  items,
  now,
  onOpen,
}: {
  items: TodayItem[];
  now: number;
  onOpen: (leadId: Id<"leads">, opts?: { focusNextAction?: boolean }) => void;
}) {
  // adiar = setNextAction com addDays(at, n) e a mesma nota, otimista como o setStage do Kanban
  const setNextAction = useMutation(api.leads.setNextAction).withOptimisticUpdate(
    (store, { id, at, note }) => {
      const cur = store.getQuery(api.leads.list, {});
      if (!cur) return;
      store.setQuery(
        api.leads.list,
        {},
        cur.map((l) => (l._id === id ? { ...l, nextActionAt: at, nextActionNote: note } : l)),
      );
    },
  );
  const clearNextAction = useMutation(api.leads.clearNextAction);
  const [menuFor, setMenuFor] = useState<Id<"leads"> | null>(null);
  const [busy, setBusy] = useState<Id<"leads"> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (items.length === 0) return null;

  const overdue = items.filter((i) => i.status === "overdue");
  const today = items.filter((i) => i.status === "today");

  async function run(id: Id<"leads">, fn: () => Promise<void>) {
    setBusy(id);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(null);
    }
  }

  // Feito: conclui e abre o detalhe com o campo em foco, para a próxima ser marcada na hora
  const done = (item: TodayItem) =>
    run(item.lead._id, async () => {
      await clearNextAction({ id: item.lead._id });
      onOpen(item.lead._id, { focusNextAction: true });
    });

  // Adiar uma ação de 5 dias atrás em 1 dia continua atrasada: esperado, ela vê e adia de novo
  const postpone = (item: TodayItem, days: number) => {
    setMenuFor(null);
    return run(item.lead._id, async () => {
      await setNextAction({ id: item.lead._id, at: addDays(item.action.at, days), note: item.action.note });
    });
  };

  const renderRow = (item: TodayItem) => {
    const id = item.lead._id;
    return (
      <li key={id} className="flex items-center gap-3 py-1.5 text-sm">
        <button onClick={() => onOpen(id)} className="shrink-0 truncate font-semibold hover:underline">
          {item.lead.name}
        </button>
        <span className="min-w-0 flex-1 truncate text-muted">{item.action.note}</span>
        {item.status === "overdue" && (
          <span className="shrink-0 text-xs font-medium text-hot">{daysAgoLabel(daysBetween(item.action.at, now))}</span>
        )}
        <button
          onClick={() => void done(item)}
          disabled={busy === id}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-surface-2 disabled:opacity-50"
        >
          <MdCheck size={14} />
          Feito
        </button>
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuFor(menuFor === id ? null : id)}
            disabled={busy === id}
            aria-haspopup="menu"
            aria-expanded={menuFor === id}
            className="inline-flex items-center gap-0.5 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted hover:bg-surface-2 disabled:opacity-50"
          >
            Adiar
            <MdKeyboardArrowDown size={14} />
          </button>
          {menuFor === id && (
            <div
              role="menu"
              className="absolute right-0 top-full z-20 mt-1 w-28 overflow-hidden rounded-lg border border-border bg-surface-solid shadow-[var(--shadow-md)]"
            >
              {POSTPONE_DAYS.map((n) => (
                <button
                  key={n}
                  role="menuitem"
                  onClick={() => void postpone(item, n)}
                  className="block w-full px-3 py-1.5 text-left text-xs hover:bg-surface-2"
                >
                  {n === 1 ? "1 dia" : `${n} dias`}
                </button>
              ))}
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <section aria-label="Hoje" className="glass mb-4 rounded-xl px-4 py-3">
      {overdue.length > 0 && (
        <div>
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-wider text-hot">Atrasadas</h2>
          <ul className="divide-y divide-border/60">{overdue.map(renderRow)}</ul>
        </div>
      )}
      {today.length > 0 && (
        <div className={overdue.length > 0 ? "mt-3" : ""}>
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-wider text-warm">Hoje</h2>
          <ul className="divide-y divide-border/60">{today.map(renderRow)}</ul>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-danger">{msg}</p>}
    </section>
  );
}
```

- [ ] **Passo 2: typecheck e lint**

```bash
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/components/crm/today-strip.tsx && echo OK
```
Esperado: `OK`.

- [ ] **Passo 3: commit**

```bash
git add src/components/crm/today-strip.tsx
git commit -m "feat(crm): faixa Hoje com Feito e Adiar" -m "Feito conclui e reabre o lead com o campo em foco; Adiar é setNextAction com addDays no navegador, otimista." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 10: página do CRM (faixa, `now`, `crmLeads` → `visible`, linha no card, Parados, Próxima ação)

> As Tarefas 10 e 11 formam **uma unidade**: a 10 usa a prop `focusNextAction` que só nasce na 11, então `tsc` fica vermelho entre as duas. Para cada tarefa fechar verde, execute **primeiro os passos da Tarefa 11 que criam `next-action-form.tsx` e a prop no `LeadDetail`**, depois volte e faça a 10, e por fim os passos restantes da 11 (verificação e commit). Um commit só, no fim da 11, cobrindo as duas.

**Files:**
- Modify: `src/app/(app)/crm/page.tsx:3-12` (imports), `:16-21` (SORTS), `:37-45` (FILTERS), `:47-56` (estado), `:70-84` (cadeia), `:120` (faixa), `:155-159` (contagem), `:167` (`items`), `:217` (abrir), `:246` (linha do card), `:298` (drawer)

- [ ] **Passo 1: imports**

Antes (linhas 3-12):
```tsx
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { MdOutlineCall, MdDragIndicator, MdSearch, MdClose, MdAdd } from "react-icons/md";
import { PageHeader } from "@/components/ui";
import { WhatsAppFollowup } from "@/components/whatsapp-followup";
import { CreateLeadModal } from "@/components/crm/create-lead-modal";
import { LeadDetail } from "@/components/crm/lead-detail";
import { PIPELINE_STAGES, canContactByEmail, type Stage } from "@convex/lib/domain";
```
Depois:
```tsx
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { MdOutlineCall, MdDragIndicator, MdSearch, MdClose, MdAdd } from "react-icons/md";
import { PageHeader } from "@/components/ui";
import { WhatsAppFollowup } from "@/components/whatsapp-followup";
import { CreateLeadModal } from "@/components/crm/create-lead-modal";
import { LeadDetail } from "@/components/crm/lead-detail";
import { TodayStrip, type TodayItem } from "@/components/crm/today-strip";
import { CardActionLine } from "@/components/crm/next-action-line";
import { useNow } from "@/lib/use-now";
import {
  PIPELINE_STAGES,
  canContactByEmail,
  nextActionOf,
  actionStatus,
  isStalled,
  compareByNextAction,
  type Stage,
} from "@convex/lib/domain";
```

- [ ] **Passo 2: ordenação "Próxima ação" (depois de "Score (maior)")**

Antes (linhas 16-18):
```tsx
const SORTS: { id: string; label: string; cmp: (a: Doc<"leads">, b: Doc<"leads">) => number }[] = [
  { id: "score_desc", label: "Score (maior)", cmp: (a, b) => (b.score ?? 0) - (a.score ?? 0) },
  { id: "score_asc", label: "Score (menor)", cmp: (a, b) => (a.score ?? 0) - (b.score ?? 0) },
```
Depois:
```tsx
const SORTS: { id: string; label: string; cmp: (a: Doc<"leads">, b: Doc<"leads">) => number }[] = [
  { id: "score_desc", label: "Score (maior)", cmp: (a, b) => (b.score ?? 0) - (a.score ?? 0) },
  { id: "next_action", label: "Próxima ação", cmp: compareByNextAction },
  { id: "score_asc", label: "Score (menor)", cmp: (a, b) => (a.score ?? 0) - (b.score ?? 0) },
```

- [ ] **Passo 3: filtro "Parados" (depois de "Abordável"); os filtros passam a receber `now`**

Antes (linhas 37-45):
```tsx
const FILTERS: { id: string; label: string; fn: (l: Doc<"leads">) => boolean }[] = [
  { id: "all", label: "Todos", fn: () => true },
  { id: "nosite", label: "Sem site", fn: (l) => !!(l.signals?.noSite || l.signals?.socialOnly) },
  { id: "hot", label: "Quente", fn: (l) => l.tier === "hot" },
  { id: "score50", label: "Score 50+", fn: (l) => (l.score ?? 0) >= 50 },
  // OPTIN-04: "abordável" = canContactByEmail (regime do mercado OU consentimento registrado).
  // Ler l.emailable cru sumiria com leads que já deram opt-in explícito na ligação.
  { id: "email", label: "Abordável", fn: (l) => canContactByEmail(l) },
];
```
Depois:
```tsx
// `now` vem do estado da página (useNow): "parado" depende do relógio.
const FILTERS: { id: string; label: string; fn: (l: Doc<"leads">, now: number) => boolean }[] = [
  { id: "all", label: "Todos", fn: () => true },
  { id: "nosite", label: "Sem site", fn: (l) => !!(l.signals?.noSite || l.signals?.socialOnly) },
  { id: "hot", label: "Quente", fn: (l) => l.tier === "hot" },
  { id: "score50", label: "Score 50+", fn: (l) => (l.score ?? 0) >= 50 },
  // OPTIN-04: "abordável" = canContactByEmail (regime do mercado OU consentimento registrado).
  // Ler l.emailable cru sumiria com leads que já deram opt-in explícito na ligação.
  { id: "email", label: "Abordável", fn: (l) => canContactByEmail(l) },
  { id: "stalled", label: "Parados", fn: (l, now) => isStalled(l, now) },
];
```

- [ ] **Passo 4: estado (`now`, foco ao abrir)**

Antes (linhas 47-56):
```tsx
export default function CrmPage() {
  const leads = useQuery(api.leads.list, {});
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("score_desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [openId, setOpenId] = useState<Id<"leads"> | null>(null);
  const [dragId, setDragId] = useState<Id<"leads"> | null>(null);
  const [overCol, setOverCol] = useState<Stage | null>(null);
```
Depois:
```tsx
export default function CrmPage() {
  const leads = useQuery(api.leads.list, {});
  const now = useNow(); // "hoje" é o dia civil do navegador, atualizado a cada 60 s
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("score_desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [openId, setOpenId] = useState<Id<"leads"> | null>(null);
  const [openFocus, setOpenFocus] = useState(false); // a faixa Hoje abre o lead com o campo da ação em foco
  const [dragId, setDragId] = useState<Id<"leads"> | null>(null);
  const [overCol, setOverCol] = useState<Stage | null>(null);
```

- [ ] **Passo 5: a cadeia `filtered` vira `crmLeads` → `visible`, e a faixa sai de `crmLeads`**

Antes (linhas 70-84):
```tsx
  const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const needle = q.trim().toLowerCase();
  const cmp = (SORTS.find((s) => s.id === sort) ?? SORTS[0]).cmp;
  const filtered = (leads ?? [])
    .filter((l) => l.saved !== false) // descoberta (saved=false) fica só na tela de Leads
    .filter(active.fn)
    .filter((l) =>
      needle === ""
        ? true
        : `${l.name} ${l.category ?? ""} ${l.city ?? ""}`.toLowerCase().includes(needle),
    )
    .slice()
    .sort(cmp);

  const openLead = openId ? (leads ?? []).find((l) => l._id === openId) ?? null : null;
```
Depois:
```tsx
  const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const needle = q.trim().toLowerCase();
  const cmp = (SORTS.find((s) => s.id === sort) ?? SORTS[0]).cmp;
  // descoberta (saved=false) fica só na tela de Leads
  const crmLeads = (leads ?? []).filter((l) => l.saved !== false);
  // A faixa Hoje sai de crmLeads, ANTES de busca, filtro e ordenação: filtrar o Kanban não a muda.
  const todayItems: TodayItem[] = crmLeads
    .flatMap((lead) => {
      const action = nextActionOf(lead);
      if (!action) return [];
      const status = actionStatus(action.at, now);
      return status === "upcoming" ? [] : [{ lead, action, status }];
    })
    .sort((a, b) => a.action.at - b.action.at);
  const visible = crmLeads
    .filter((l) => active.fn(l, now))
    .filter((l) =>
      needle === ""
        ? true
        : `${l.name} ${l.category ?? ""} ${l.city ?? ""}`.toLowerCase().includes(needle),
    )
    .slice()
    .sort(cmp);

  const openLead = openId ? crmLeads.find((l) => l._id === openId) ?? null : null;
  const openLeadDetail = (id: Id<"leads">, opts?: { focusNextAction?: boolean }) => {
    setOpenId(id);
    setOpenFocus(opts?.focusNextAction === true);
  };
```

- [ ] **Passo 6: a faixa entre o cabeçalho e a busca**

Antes (linha 120, a linha de comentário sozinha; a linha seguinte é o `div` da busca, que o redesenho pode ter mudado, por isso a âncora é só o comentário):
```tsx
      {/* search */}
```
Depois:
```tsx
      <TodayStrip items={todayItems} now={now} onOpen={openLeadDetail} />

      {/* search */}
```

- [ ] **Passo 7: contagem e colunas leem `visible`**

Antes (linhas 156-158):
```tsx
          <span className="ml-auto font-mono text-[11px] tabular-nums text-faint">
            {filtered.length} {filtered.length === 1 ? "lead" : "leads"}
          </span>
```
Depois:
```tsx
          <span className="ml-auto font-mono text-[11px] tabular-nums text-faint">
            {visible.length} {visible.length === 1 ? "lead" : "leads"}
          </span>
```

Antes (linha 167):
```tsx
            const items = filtered.filter((l) => l.stage === col.id);
```
Depois:
```tsx
            const items = visible.filter((l) => l.stage === col.id);
```

- [ ] **Passo 8: abrir o detalhe passa pelo helper; a linha nova no card**

Antes (linha 217):
```tsx
                          onClick={() => setOpenId(lead._id)}
```
Depois:
```tsx
                          onClick={() => openLeadDetail(lead._id)}
```

Antes (linhas 246-247; a linha da categoria logo acima tem um travessão na string e por isso NÃO entra na âncora):
```tsx
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <select
```
Depois:
```tsx
                          <CardActionLine lead={lead} now={now} />

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <select
```

- [ ] **Passo 9: o drawer recebe o foco e remonta por lead**

Antes (linha 298):
```tsx
      {openLead && <LeadDetail lead={openLead} onClose={() => setOpenId(null)} />}
```
Depois:
```tsx
      {openLead && (
        <LeadDetail
          key={openLead._id}
          lead={openLead}
          focusNextAction={openFocus}
          onClose={() => setOpenId(null)}
        />
      )}
```
(`focusNextAction` só existe depois da Tarefa 11; o typecheck deste passo falha até lá, de propósito. Faça a Tarefa 11 antes de rodar o `tsc`.)

### Tarefa 11: `NextActionForm` e a prop `focusNextAction` do `LeadDetail`

**Files:**
- Create: `src/components/crm/next-action-form.tsx`
- Modify: `src/components/crm/lead-detail.tsx:25-26` (import), `:59-64` (props), `:118-120` (render do InfoTab), `:142` (assinatura do InfoTab), `:143-150` (bloco no topo da aba)

- [ ] **Passo 1: o formulário**

Crie `src/components/crm/next-action-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { MdCheck, MdOutlineEventAvailable } from "react-icons/md";
import { nextActionOf, dateInputToTimestamp, toDateInputValue } from "@convex/lib/domain";
import { ActionStatusText } from "./next-action-line";
import { useNow } from "@/lib/use-now";

const fieldCls =
  "rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-border-strong";

/**
 * Próxima ação do lead (aba Informações). Data local (o valor do input passa por
 * dateInputToTimestamp: nunca `new Date(string)`), texto, Salvar e Concluir. Com `autoFocus`,
 * o texto recebe foco ao montar (a faixa Hoje abre o lead assim depois de "Feito").
 */
export function NextActionForm({ lead, autoFocus = false }: { lead: Doc<"leads">; autoFocus?: boolean }) {
  const now = useNow();
  const setNextAction = useMutation(api.leads.setNextAction);
  const clearNextAction = useMutation(api.leads.clearNextAction);
  const action = nextActionOf(lead);
  const [date, setDate] = useState(() => toDateInputValue(action ? action.at : now));
  const [note, setNote] = useState(action?.note ?? "");
  const [busy, setBusy] = useState<"save" | "clear" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(kind: "save" | "clear", fn: () => Promise<void>) {
    setBusy(kind);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(null);
    }
  }

  const save = () =>
    run("save", async () => {
      const at = dateInputToTimestamp(date);
      if (at === null) throw new Error("Escolha uma data");
      await setNextAction({ id: lead._id, at, note });
    });

  const clear = () =>
    run("clear", async () => {
      await clearNextAction({ id: lead._id });
      setNote("");
    });

  return (
    <section className="rounded-xl bg-surface-2 p-4">
      <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">Próxima ação</h3>
      {action ? (
        <ActionStatusText action={action} now={now} />
      ) : (
        <p className="text-[11px] text-faint">Nenhuma ação marcada</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="block">
          <span className="sr-only">Data</span>
          <input
            type="date"
            value={date}
            min={toDateInputValue(now)}
            onChange={(e) => setDate(e.target.value)}
            className={fieldCls}
          />
        </label>
        <label className="block min-w-0 flex-1">
          <span className="sr-only">O que fazer</span>
          <input
            autoFocus={autoFocus}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void save();
              }
            }}
            placeholder="O que fazer? (ligar de novo, mandar proposta…)"
            className={`${fieldCls} w-full`}
          />
        </label>
        <button
          onClick={() => void save()}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-fg shadow-[var(--shadow-sm)] hover:bg-brand-hover disabled:opacity-60"
        >
          <MdOutlineEventAvailable size={16} />
          {busy === "save" ? "Salvando…" : "Salvar"}
        </button>
        {action && (
          <button
            onClick={() => void clear()}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-solid disabled:opacity-60"
          >
            <MdCheck size={16} />
            Concluir
          </button>
        )}
      </div>
      {msg && <p className="mt-2 text-xs text-danger">{msg}</p>}
    </section>
  );
}
```

- [ ] **Passo 2: `LeadDetail` ganha `focusNextAction`**

Antes (linhas 25-26):
```tsx
} from "@convex/lib/domain";
import { OutreachComposer } from "@/components/outreach-composer";
```
Depois:
```tsx
} from "@convex/lib/domain";
import { NextActionForm } from "@/components/crm/next-action-form";
import { OutreachComposer } from "@/components/outreach-composer";
```

Antes (linhas 59-64):
```tsx
const TABS = ["Informações", "Abordagem", "Site", "Objeções", "Venda"] as const;
type Tab = (typeof TABS)[number];

export function LeadDetail({ lead, onClose }: { lead: Doc<"leads">; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("Informações");
  const setStage = useMutation(api.leads.setStage);
```
Depois:
```tsx
const TABS = ["Informações", "Abordagem", "Site", "Objeções", "Venda"] as const;
type Tab = (typeof TABS)[number];

export function LeadDetail({
  lead,
  onClose,
  focusNextAction = false,
}: {
  lead: Doc<"leads">;
  onClose: () => void;
  /** A faixa Hoje abre o lead depois de "Feito": o campo da próxima ação nasce focado. A aba inicial não muda. */
  focusNextAction?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("Informações");
  const setStage = useMutation(api.leads.setStage);
```

Antes (linhas 118-120):
```tsx
          {tab === "Informações" && (
            <InfoTab lead={lead} status={status} onStage={(s) => void setStage({ id: lead._id, stage: s })} />
          )}
```
Depois:
```tsx
          {tab === "Informações" && (
            <InfoTab
              lead={lead}
              status={status}
              autoFocusAction={focusNextAction}
              onStage={(s) => void setStage({ id: lead._id, stage: s })}
            />
          )}
```

Antes (linha 142):
```tsx
function InfoTab({ lead, status, onStage }: { lead: Doc<"leads">; status: "open" | "won" | "lost"; onStage: (s: Stage) => void }) {
```
Depois:
```tsx
function InfoTab({
  lead,
  status,
  autoFocusAction,
  onStage,
}: {
  lead: Doc<"leads">;
  status: "open" | "won" | "lost";
  autoFocusAction: boolean;
  onStage: (s: Stage) => void;
}) {
```

Antes (linhas 143-150; a âncora inclui `activeSignals` porque `return (` + `space-y-6` + `<section>` se repete em outras abas):
```tsx
  const market = MARKETS[lead.countryCode];
  const activeSignals = lead.signals
    ? Object.entries(lead.signals).filter(([, v]) => v).map(([k]) => SIGNAL_LABEL[k] ?? k)
    : [];

  return (
    <div className="space-y-6">
      <section>
```
Depois:
```tsx
  const market = MARKETS[lead.countryCode];
  const activeSignals = lead.signals
    ? Object.entries(lead.signals).filter(([, v]) => v).map(([k]) => SIGNAL_LABEL[k] ?? k)
    : [];

  return (
    <div className="space-y-6">
      {/* blocos novos do CRM, acima dos dados do Google (que não mudam) */}
      <NextActionForm lead={lead} autoFocus={autoFocusAction} />

      <section>
```

- [ ] **Passo 3: typecheck, lint, testes**

```bash
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && node --experimental-strip-types --test tests/*.test.ts 2>&1 | grep -E "^ℹ (pass|fail)"
```
Esperado: sem erros, `ℹ fail 0`.

- [ ] **Passo 4: commit (página + formulário + drawer)**

```bash
git add "src/app/(app)/crm/page.tsx" src/components/crm/next-action-form.tsx src/components/crm/lead-detail.tsx
git commit -m "feat(crm): faixa Hoje, linha da ação no card, filtro Parados, ordenação e próxima ação no detalhe" -m "A faixa sai dos leads do CRM antes de busca/filtro/ordenação (crmLeads → visible). now fica em estado (60 s). Feito reabre o lead com o campo focado." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 12: verificação do Bloco A

**Files:** nenhum.

- [ ] **Passo 1: dados (o que a faixa e os cards vão ler)**

```bash
export OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/crm
./node_modules/.bin/convex run leads:list '{}' > "$OUT/leads.json"
NOW=$(date +%s000)
jq --argjson now "$NOW" '[.[] | select(.nextActionAt != null and .nextActionAt < $now)] | length' "$OUT/leads.json"
```
Esperado: `4` (as duas atrasadas e as duas de hoje têm `at` no passado: ambas entram na faixa; `actionStatus` no navegador separa "overdue" de "today" pelo dia civil).

- [ ] **Passo 2: screenshots (claro e escuro)**

O escuro usa o gancho temporário `?theme=dark` do redesenho (commit `052799c`) **se ele ainda existir** (`grep -c URLSearchParams src/app/layout.tsx`); se já tiver sido removido, capture só o claro e deixe o escuro para o roteiro manual. A opção "Próxima ação" no select "Ordenar" não é verificável com o select fechado: fica no roteiro manual.

```bash
CH=$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell | tail -1)
"$CH" --headless --no-sandbox --disable-gpu --hide-scrollbars --window-size=1440,900 --run-all-compositor-stages-before-draw --virtual-time-budget=15000 --screenshot="$OUT/a-crm-light.png" http://localhost:3000/crm
ls -la "$OUT"/a-crm-light.png
```
Abra a imagem (Read) e confira: faixa "Hoje" logo abaixo do título, em vidro, com os grupos "Atrasadas" (título em laranja) e "Hoje"; cards "The Copper Pot" e "Olive & Thyme" com a linha `↺ … · há N dias` em --hot; "De Gouden Lepel BV" e "Sharp Cuts" com `· hoje` em --warm; "Trattoria Roma", "The Bruncherie" e "Whiskey & Co" com `parado há N dias` em itálico; chip "Parados" nos filtros; opção "Ordenar: Próxima ação" no select. Se a página ficou em "Carregando…" (virtual time), a evidência de dados é o Passo 1 e a verificação visual vai para o roteiro manual (Tarefa 26); registre isso no relatório.

- [ ] **Passo 3: o Esc do drawer não conflita com o formulário**

Não há listener novo no `window`; `NextActionForm` só trata Enter. Nada a fazer aqui além de anotar: o Esc dentro do campo de nota fecha o drawer, como em qualquer input do drawer hoje.

- [ ] **Passo 4: registrar no relatório**

Liste: comandos rodados, `ℹ pass/fail`, se o screenshot carregou dados ou não, e qualquer diferença entre o plano e o que foi feito.

## Chunk 3a: Bloco B, "Perdido" com motivo (um commit só)

**Regra deste chunk:** as Tarefas 13 a 16 NÃO comitam. O commit único acontece na Tarefa 17, depois da verificação, porque com o guardrail no servidor e sem o modal em todos os pontos de entrada, "Perdido" quebra no meio (a spec exige o commit atômico). Rode `tsc` ao fim de cada tarefa mesmo assim.

### Tarefa 13: `markLost` e o guardrail do `setStage`

**Files:**
- Modify: `convex/leads.ts:27-34` (validador do motivo, depois de `stageArg`), `:134-150` (`setStage`), e inserir `markLost` depois de `clearNextAction`

- [ ] **Passo 1: validador do motivo**

Antes (linhas 27-34):
```ts
const stageArg = v.union(
  v.literal("base"),
  v.literal("approached"),
  v.literal("scheduled"),
  v.literal("followup"),
  v.literal("converted"),
  v.literal("lost"),
);
```
Depois:
```ts
const stageArg = v.union(
  v.literal("base"),
  v.literal("approached"),
  v.literal("scheduled"),
  v.literal("followup"),
  v.literal("converted"),
  v.literal("lost"),
);

/** Espelha `lostReason` do schema e `LOST_REASONS` do domínio. */
const lostReasonV = v.union(
  v.literal("too_expensive"),
  v.literal("has_site"),
  v.literal("no_response"),
  v.literal("not_interested"),
  v.literal("other"),
);
```

- [ ] **Passo 2: `setStage` recusa `lost` e limpa o motivo ao sair de `lost`**

Antes (linhas 134-150):
```ts
export const setStage = mutation({
  args: { id: v.id("leads"), stage: stageArg },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    const now = Date.now();
    await ctx.db.patch(args.id, { stage: args.stage, stageUpdatedAt: now });
    await ctx.db.insert("events", {
      orgId,
      type: "stage_change",
      leadId: args.id,
      at: now,
      meta: { from: lead.stage, to: args.stage },
    });
  },
});
```
Depois:
```ts
export const setStage = mutation({
  args: { id: v.id("leads"), stage: stageArg },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    // Guardrail: "Perdido" exige motivo. Toda UI que oferece Perdido abre o modal, que chama markLost.
    if (args.stage === "lost") throw new Error("Use markLost");
    const now = Date.now();
    await ctx.db.patch(args.id, {
      stage: args.stage,
      stageUpdatedAt: now,
      // Sair de Perdido é a única forma de reabrir (não há mutation reopen): o motivo vai junto.
      ...(lead.stage === "lost" ? { lostReason: undefined, lostNote: undefined } : {}),
    });
    await ctx.db.insert("events", {
      orgId,
      type: "stage_change",
      leadId: args.id,
      at: now,
      meta: { from: lead.stage, to: args.stage },
    });
  },
});
```

- [ ] **Passo 3: `markLost`**

Logo depois do fechamento de `clearNextAction` (a linha `});` que o encerra, antes de `/** Marca uma reunião com o lead e move-o para "Agendado". */`) insira:

```ts

/**
 * "Perdido" sempre com motivo. Move para lost, limpa a próxima ação e registra o evento
 * (meta.reason vai para o Histórico). Lead JÁ em lost (dar motivo a um perdido legado):
 * só lostReason/lostNote, sem tocar stageUpdatedAt e sem evento.
 */
export const markLost = mutation({
  args: { id: v.id("leads"), reason: lostReasonV, note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    const lostNote = args.note?.trim() || undefined;
    if (lead.stage === "lost") {
      await ctx.db.patch(args.id, { lostReason: args.reason, lostNote });
      return;
    }
    const now = Date.now();
    await ctx.db.patch(args.id, {
      stage: "lost",
      stageUpdatedAt: now,
      lostReason: args.reason,
      lostNote,
      nextActionAt: undefined,
      nextActionNote: undefined,
    });
    await ctx.db.insert("events", {
      orgId,
      type: "stage_change",
      leadId: args.id,
      at: now,
      meta: { from: lead.stage, to: "lost", reason: args.reason },
    });
  },
});
```

- [ ] **Passo 4: typecheck**

```bash
./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json && echo OK
```
Esperado: `OK`. Não comite.

### Tarefa 14: `LostReasonModal`

**Files:**
- Create: `src/components/crm/lost-reason-modal.tsx`

- [ ] **Passo 1: escrever o modal**

Crie `src/components/crm/lost-reason-modal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { MdClose } from "react-icons/md";
import type { Doc } from "@convex/_generated/dataModel";
import { LOST_REASONS, type LostReason } from "@convex/lib/domain";

const fieldCls =
  "w-full rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-border-strong";

/**
 * Motivo de perda (Kanban e detalhe do lead). Chama `onConfirm`; se a promise rejeitar, mostra o
 * erro AQUI e fica aberto; só fecha quando ela resolve. Segue o CreateLeadModal (overlay, Esc
 * fecha, portal em z-[100], necessário porque abre por cima do drawer z-50) e acrescenta
 * role="dialog", aria-modal, aria-labelledby e foco inicial no primeiro rádio.
 *
 * Esc é tratado no onKeyDown do próprio dialog, com stopPropagation: o LeadDetail já fecha no
 * Esc via listener no window, e sem isso um Esc cancelaria o motivo e fecharia o lead junto.
 */
export function LostReasonModal({
  lead,
  onConfirm,
  onClose,
}: {
  lead: Doc<"leads">;
  onConfirm: (input: { reason: LostReason; note?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<LostReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!reason || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm({ reason, note: note.trim() || undefined });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao marcar perdido");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lost-reason-title"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
        className="glass-dense relative z-10 w-full max-w-md rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-hot">Perdido</div>
            <h2 id="lost-reason-title" className="font-display text-lg font-bold">
              Por que {lead.name} foi perdido?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <MdClose size={20} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <fieldset>
            <legend className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">
              Motivo
            </legend>
            <div className="space-y-1.5">
              {LOST_REASONS.map((r, i) => (
                <label
                  key={r.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    reason === r.id
                      ? "border-brand bg-brand-soft text-foreground"
                      : "border-border text-muted hover:border-border-strong hover:text-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="lost-reason"
                    value={r.id}
                    checked={reason === r.id}
                    onChange={() => setReason(r.id)}
                    autoFocus={i === 0}
                    className="accent-brand"
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">
              Nota (opcional)
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="O que ele disse, o que faltou…"
              className={`${fieldCls} resize-none`}
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted hover:bg-surface-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={!reason || busy}
            className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-danger-fg shadow-[var(--shadow-sm)] disabled:opacity-60"
          >
            {busy ? "Marcando…" : "Marcar perdido"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Passo 2: typecheck e lint**

```bash
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/components/crm/lost-reason-modal.tsx && echo OK
```
Esperado: `OK`. Não comite.

### Tarefa 15: Kanban: coluna "Perdido" recolhida (cabeçalho é alvo de drop) e o modal no drop e no seletor

**Files:**
- Modify: `src/app/(app)/crm/page.tsx` (estado pós-Tarefa 10): imports, `COLUMNS`, `STAGE_DOT`, estado, `move`, `lostLead`, bloco das colunas, render do modal

- [ ] **Passo 1: imports**

Antes:
```tsx
import { MdOutlineCall, MdDragIndicator, MdSearch, MdClose, MdAdd } from "react-icons/md";
```
Depois:
```tsx
import {
  MdOutlineCall,
  MdDragIndicator,
  MdSearch,
  MdClose,
  MdAdd,
  MdExpandMore,
  MdExpandLess,
} from "react-icons/md";
```

Antes:
```tsx
import { LeadDetail } from "@/components/crm/lead-detail";
import { TodayStrip, type TodayItem } from "@/components/crm/today-strip";
```
Depois:
```tsx
import { LeadDetail } from "@/components/crm/lead-detail";
import { LostReasonModal } from "@/components/crm/lost-reason-modal";
import { TodayStrip, type TodayItem } from "@/components/crm/today-strip";
```

- [ ] **Passo 2: todas as colunas, com o ponto de Perdido**

Antes:
```tsx
const COLUMNS = PIPELINE_STAGES.filter((s) => s.id !== "lost");
```
Depois:
```tsx
// Perdido entra como última coluna, recolhida por padrão (estado local, não persiste).
const COLUMNS = PIPELINE_STAGES;
```

Antes:
```tsx
  followup: "var(--warm)",
  converted: "var(--brand)",
};
```
Depois:
```tsx
  followup: "var(--warm)",
  converted: "var(--brand)",
  lost: "var(--faint)",
};
```

- [ ] **Passo 3: estado, `markLost` e o `move` que pede motivo**

Antes:
```tsx
  const [dragId, setDragId] = useState<Id<"leads"> | null>(null);
  const [overCol, setOverCol] = useState<Stage | null>(null);
```
Depois:
```tsx
  const [dragId, setDragId] = useState<Id<"leads"> | null>(null);
  const [overCol, setOverCol] = useState<Stage | null>(null);
  const [lostOpen, setLostOpen] = useState(false); // coluna Perdido expandida?
  const [lostFor, setLostFor] = useState<Id<"leads"> | null>(null); // lead esperando motivo no modal
```

Antes:
```tsx
  const move = (id: Id<"leads">, stage: Stage) => void setStage({ id, stage });
```
Depois:
```tsx
  const markLost = useMutation(api.leads.markLost);

  // "Perdido" nunca move direto: abre o modal de motivo (o servidor recusa setStage("lost")).
  // Vale para o drop na coluna e para o seletor do card. Cancelar: nada muda.
  const move = (id: Id<"leads">, stage: Stage) => {
    if (stage === "lost") {
      setLostFor(id);
      return;
    }
    void setStage({ id, stage });
  };
```

Antes:
```tsx
  const openLead = openId ? crmLeads.find((l) => l._id === openId) ?? null : null;
```
Depois:
```tsx
  const openLead = openId ? crmLeads.find((l) => l._id === openId) ?? null : null;
  const lostLead = lostFor ? crmLeads.find((l) => l._id === lostFor) ?? null : null;
```

- [ ] **Passo 4: o bloco das colunas (cabeçalho compartilhado, Perdido recolhida como alvo de drop)**

Antes (do `{COLUMNS.map` até a tag de abertura da lane, inclusive; as classes da lane são as que o redesenho mantém):
```tsx
          {COLUMNS.map((col) => {
            const items = visible.filter((l) => l.stage === col.id);
            const isOver = overCol === col.id;
            return (
              <div key={col.id} className="flex w-80 shrink-0 flex-col">
                <div className="mb-2.5 flex items-center justify-between px-1.5">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STAGE_DOT[col.id] }} />
                    {col.label}
                  </span>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] tabular-nums text-muted">
                    {items.length}
                  </span>
                </div>

                {/* drop lane */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (overCol !== col.id) setOverCol(col.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragId) move(dragId, col.id);
                    setDragId(null);
                    setOverCol(null);
                  }}
                  className={`flex-1 space-y-2.5 rounded-2xl border p-2.5 transition-colors ${
                    isOver
                      ? "border-brand/50 bg-brand/[0.06]"
                      : "border-border/60 bg-surface-2/40"
                  }`}
                  style={{ minHeight: 140 }}
                >
```
Depois:
```tsx
          {COLUMNS.map((col) => {
            const items = visible.filter((l) => l.stage === col.id);
            const isOver = overCol === col.id;
            const isLost = col.id === "lost";
            // os mesmos handlers na lane e no cabeçalho recolhido de Perdido
            const dropProps = {
              onDragOver: (e: React.DragEvent) => {
                e.preventDefault();
                if (overCol !== col.id) setOverCol(col.id);
              },
              onDrop: (e: React.DragEvent) => {
                e.preventDefault();
                if (dragId) move(dragId, col.id);
                setDragId(null);
                setOverCol(null);
              },
            };
            const header = (
              <div className="mb-2.5 flex items-center justify-between px-1.5">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STAGE_DOT[col.id] }} />
                  {col.label}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] tabular-nums text-muted">
                    {items.length}
                  </span>
                  {isLost && (
                    <button
                      onClick={() => setLostOpen((v) => !v)}
                      aria-expanded={lostOpen}
                      aria-label={lostOpen ? "Recolher Perdido" : "Expandir Perdido"}
                      className="rounded-md p-0.5 text-muted hover:bg-surface-2 hover:text-foreground"
                    >
                      {lostOpen ? <MdExpandLess size={16} /> : <MdExpandMore size={16} />}
                    </button>
                  )}
                </span>
              </div>
            );
            if (isLost && !lostOpen) {
              // recolhida: só o cabeçalho, que continua sendo alvo de drop (realce de overCol)
              return (
                <div
                  key={col.id}
                  {...dropProps}
                  className={`w-56 shrink-0 rounded-2xl border p-2.5 transition-colors ${
                    isOver ? "border-brand/50 bg-brand/[0.06]" : "border-transparent"
                  }`}
                >
                  {header}
                </div>
              );
            }
            return (
              <div key={col.id} className="flex w-80 shrink-0 flex-col">
                {header}

                {/* drop lane */}
                <div
                  {...dropProps}
                  className={`flex-1 space-y-2.5 rounded-2xl border p-2.5 transition-colors ${
                    isOver
                      ? "border-brand/50 bg-brand/[0.06]"
                      : "border-border/60 bg-surface-2/40"
                  }`}
                  style={{ minHeight: 140 }}
                >
```
O seletor de estágio do card não muda: ele já chama `move`, que agora abre o modal quando a opção é "Perdido" (o `<select>` é controlado por `lead.stage` e volta sozinho para o valor atual).

- [ ] **Passo 5: o modal**

Antes:
```tsx
      {createOpen && <CreateLeadModal onClose={() => setCreateOpen(false)} />}
```
Depois:
```tsx
      {createOpen && <CreateLeadModal onClose={() => setCreateOpen(false)} />}
      {lostLead && (
        <LostReasonModal
          lead={lostLead}
          onConfirm={async ({ reason, note }) => {
            await markLost({ id: lostLead._id, reason, note });
          }}
          onClose={() => {
            // confirmar ou cancelar: o card volta ao lugar, dragId e overCol limpos
            setLostFor(null);
            setDragId(null);
            setOverCol(null);
          }}
        />
      )}
```

- [ ] **Passo 6: typecheck e lint**

```bash
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint "src/app/(app)/crm/page.tsx" && echo OK
```
Esperado: `OK`. Não comite.

### Tarefa 16: detalhe do lead: pílula "Perdido" e botão "Perdido" abrem o modal; faixa de perdido

**Files:**
- Modify: `src/components/crm/lead-detail.tsx` (estado pós-Tarefa 11): imports, estado do `LeadDetail`, `onStage` do InfoTab, render do modal, topo do InfoTab

- [ ] **Passo 1: imports**

Antes:
```tsx
import {
  PIPELINE_STAGES,
  MARKETS,
  OPT_IN_MARKETS,
  canContactByEmail,
  type Stage,
} from "@convex/lib/domain";
import { NextActionForm } from "@/components/crm/next-action-form";
```
Depois:
```tsx
import {
  PIPELINE_STAGES,
  MARKETS,
  OPT_IN_MARKETS,
  canContactByEmail,
  lostReasonLabel,
  type Stage,
} from "@convex/lib/domain";
import { NextActionForm } from "@/components/crm/next-action-form";
import { LostReasonModal } from "@/components/crm/lost-reason-modal";
```

- [ ] **Passo 2: o `LeadDetail` roteia "Perdido" para o modal**

Antes:
```tsx
  const [tab, setTab] = useState<Tab>("Informações");
  const setStage = useMutation(api.leads.setStage);

  useEffect(() => {
```
Depois:
```tsx
  const [tab, setTab] = useState<Tab>("Informações");
  const [lostOpen, setLostOpen] = useState(false);
  const setStage = useMutation(api.leads.setStage);
  const markLost = useMutation(api.leads.markLost);
  // "Perdido" (pílula de Etapa ou botão Status) SEMPRE pede motivo, inclusive com o lead JÁ em
  // lost: é o único caminho de UI para dar motivo a um perdido legado (por isso não há
  // `if (stage === "lost") return`). Os demais estágios seguem em setStage; sair de Perdido
  // por pílula ou "Em aberto" funciona como hoje e o servidor limpa o motivo.
  const onStage = (s: Stage) => {
    if (s === "lost") setLostOpen(true);
    else void setStage({ id: lead._id, stage: s });
  };

  useEffect(() => {
```

Antes:
```tsx
              autoFocusAction={focusNextAction}
              onStage={(s) => void setStage({ id: lead._id, stage: s })}
            />
```
Depois:
```tsx
              autoFocusAction={focusNextAction}
              onStage={onStage}
            />
```

Antes (fim do `LeadDetail`; a âncora inclui as abas para ser única):
```tsx
          {tab === "Abordagem" && <ApproachTab lead={lead} />}
          {tab === "Site" && <SiteTab lead={lead} />}
          {tab === "Objeções" && <ObjectionsTab />}
          {tab === "Venda" && <SaleTab />}
        </div>
      </div>
    </div>
  );
}
```
Depois:
```tsx
          {tab === "Abordagem" && <ApproachTab lead={lead} />}
          {tab === "Site" && <SiteTab lead={lead} />}
          {tab === "Objeções" && <ObjectionsTab />}
          {tab === "Venda" && <SaleTab />}
        </div>
      </div>
      {lostOpen && (
        <LostReasonModal
          lead={lead}
          onConfirm={async ({ reason, note }) => {
            await markLost({ id: lead._id, reason, note });
          }}
          onClose={() => setLostOpen(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Passo 3: faixa de perdido no topo da aba Informações**

Antes:
```tsx
    <div className="space-y-6">
      {/* blocos novos do CRM, acima dos dados do Google (que não mudam) */}
      <NextActionForm lead={lead} autoFocus={autoFocusAction} />
```
Depois:
```tsx
    <div className="space-y-6">
      {/* blocos novos do CRM, acima dos dados do Google (que não mudam) */}
      {lead.stage === "lost" && (
        // sem lostReason (legado): só "Perdido"; sem lostNote: sem o terceiro segmento.
        // Reabrir é o "Em aberto" ou uma pílula de Etapa, abaixo; não há botão próprio.
        <p className="text-sm font-semibold text-hot">
          {["Perdido", lostReasonLabel(lead.lostReason), lead.lostNote].filter(Boolean).join(" · ")}
        </p>
      )}
      <NextActionForm lead={lead} autoFocus={autoFocusAction} />
```

- [ ] **Passo 4: typecheck e lint**

```bash
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/components/crm/lead-detail.tsx && echo OK
```
Esperado: `OK`. Não comite ainda.

### Tarefa 17: verificação do "Perdido" e o commit único

**Files:** nenhum novo.

- [ ] **Passo 1: suíte completa**

```bash
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json && ./node_modules/.bin/eslint && node --experimental-strip-types --test tests/*.test.ts 2>&1 | grep -E "^ℹ (pass|fail)"
```
Esperado: sem erros, `ℹ fail 0`.

- [ ] **Passo 2: o servidor (guardrail, markLost novo e legado, reabrir limpa o motivo)**

```bash
export OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/crm
sleep 5; ./node_modules/.bin/convex run leads:list '{}' > "$OUT/leads.json"
ID=$(jq -r '.[] | select(.name == "Bella Cucina") | ._id' "$OUT/leads.json")
./node_modules/.bin/convex run leads:setStage "{\"id\":\"$ID\",\"stage\":\"lost\"}" > "$OUT/guard.txt" 2>&1; grep -c "Use markLost" "$OUT/guard.txt"
./node_modules/.bin/convex run leads:setNextAction "{\"id\":\"$ID\",\"at\":1789000000000,\"note\":\"ligar\"}" > /dev/null 2>&1
./node_modules/.bin/convex run leads:markLost "{\"id\":\"$ID\",\"reason\":\"too_expensive\",\"note\":\"  caro  \"}" > "$OUT/lost.txt" 2>&1
./node_modules/.bin/convex run leads:get "{\"id\":\"$ID\"}" > "$OUT/lead.json"; jq -c '{stage, lostReason, lostNote, nextActionAt, nextActionNote}' "$OUT/lead.json"; T1=$(jq '.stageUpdatedAt' "$OUT/lead.json")
./node_modules/.bin/convex run leads:markLost "{\"id\":\"$ID\",\"reason\":\"other\"}" > /dev/null 2>&1
./node_modules/.bin/convex run leads:get "{\"id\":\"$ID\"}" > "$OUT/lead.json"; jq -c '{stage, lostReason, lostNote}' "$OUT/lead.json"; T2=$(jq '.stageUpdatedAt' "$OUT/lead.json"); [ "$T1" = "$T2" ] && echo "stageUpdatedAt intacto"
./node_modules/.bin/convex run leads:setStage "{\"id\":\"$ID\",\"stage\":\"approached\"}" > /dev/null 2>&1
./node_modules/.bin/convex run leads:get "{\"id\":\"$ID\"}" > "$OUT/lead.json"; jq -c '{stage, lostReason, lostNote}' "$OUT/lead.json"
./node_modules/.bin/convex run events:recent '{}' > "$OUT/events.json"; jq -S -c '[.[] | select(.type == "stage_change" and .leadName == "Bella Cucina") | .meta]' "$OUT/events.json"
```
Esperado, na ordem:
1. `1` (guardrail);
2. `{"stage":"lost","lostReason":"too_expensive","lostNote":"caro","nextActionAt":null,"nextActionNote":null}` (moveu, trim na nota, limpou a ação);
3. `{"stage":"lost","lostReason":"other","lostNote":null}` e `stageUpdatedAt intacto` (legado: só o motivo, sem evento);
4. `{"stage":"approached","lostReason":null,"lostNote":null}` (reabrir limpa o motivo);
5. `[{"from":"lost","to":"approached"},{"from":"base","reason":"too_expensive","to":"lost"}]` (chaves em ordem alfabética pelo `-S`; um evento por movimento real; o segundo `markLost` não gerou evento).

- [ ] **Passo 3: screenshot**

```bash
CH=$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell | tail -1)
"$CH" --headless --no-sandbox --disable-gpu --hide-scrollbars --window-size=1440,900 --run-all-compositor-stages-before-draw --virtual-time-budget=15000 --screenshot="$OUT/b-lost-column.png" http://localhost:3000/crm
```
Confira na imagem: a última coluna "Perdido" recolhida (só cabeçalho com contagem e a seta de expandir). O modal, o drop e o cancelar ficam no roteiro manual (Tarefa 26).

- [ ] **Passo 4: o commit único**

```bash
git add convex/leads.ts src/components/crm/lost-reason-modal.tsx "src/app/(app)/crm/page.tsx" src/components/crm/lead-detail.tsx
git commit -m "feat(crm): Perdido exige motivo (markLost, guardrail, modal e coluna recolhida)" -m "markLost move, limpa a ação e registra o evento com o motivo; setStage recusa lost e limpa o motivo ao sair de lost. O modal abre nos quatro pontos de entrada (drop no Kanban, seletor do card, pílula de Etapa e botão Status), inclusive para dar motivo a um perdido legado. A coluna Perdido entra recolhida e o cabeçalho é alvo de drop. Num commit só, senão Perdido quebra no meio." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

## Chunk 3b: Bloco B, contato/valor, soma na coluna, seed

### Tarefa 18: `updateInfo` e `LeadInfoFields` (contato e negócio)

**Files:**
- Modify: `convex/leads.ts` (inserir `updateInfo` depois de `markLost`)
- Create: `src/components/crm/lead-info-fields.tsx`
- Modify: `src/components/crm/lead-detail.tsx` (import + render no InfoTab)

- [ ] **Passo 1: a mutation**

Depois do `});` que fecha `markLost` (antes de `/** Marca uma reunião com o lead e move-o para "Agendado". */`):

```ts

/** null limpa; negativo, NaN ou infinito é erro. */
function cleanAmount(value: number | null): number | undefined {
  if (value === null) return undefined;
  if (!Number.isFinite(value) || value < 0) throw new Error("Valor inválido");
  return value;
}

/**
 * Contato e valores do negócio: patch SÓ dos campos enviados. String: trim, vazia limpa.
 * Número: null limpa. Valores ficam na moeda do país (currencyForCountry), sem campo de moeda.
 */
export const updateInfo = mutation({
  args: {
    id: v.id("leads"),
    contactName: v.optional(v.string()),
    contactRole: v.optional(v.string()),
    dealSetup: v.optional(v.union(v.number(), v.null())),
    dealMonthly: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    const patch: { contactName?: string; contactRole?: string; dealSetup?: number; dealMonthly?: number } = {};
    if (args.contactName !== undefined) patch.contactName = args.contactName.trim() || undefined;
    if (args.contactRole !== undefined) patch.contactRole = args.contactRole.trim() || undefined;
    if (args.dealSetup !== undefined) patch.dealSetup = cleanAmount(args.dealSetup);
    if (args.dealMonthly !== undefined) patch.dealMonthly = cleanAmount(args.dealMonthly);
    await ctx.db.patch(args.id, patch); // chave presente com undefined = remove o campo
  },
});
```

- [ ] **Passo 2: exercitar pela CLI**

```bash
./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json && echo OK
sleep 5; ./node_modules/.bin/convex run leads:updateInfo "{\"id\":\"$ID\",\"contactName\":\"  Ana  \",\"dealMonthly\":340}" > /dev/null 2>&1
./node_modules/.bin/convex run leads:get "{\"id\":\"$ID\"}" > "$OUT/lead.json"; jq -c '{contactName, contactRole, dealSetup, dealMonthly}' "$OUT/lead.json"
./node_modules/.bin/convex run leads:updateInfo "{\"id\":\"$ID\",\"dealMonthly\":-1}" > "$OUT/neg.txt" 2>&1; grep -c "Valor inválido" "$OUT/neg.txt"
./node_modules/.bin/convex run leads:updateInfo "{\"id\":\"$ID\",\"contactName\":\"\",\"dealMonthly\":null}" > /dev/null 2>&1
./node_modules/.bin/convex run leads:get "{\"id\":\"$ID\"}" > "$OUT/lead.json"; jq -c '{contactName, dealMonthly}' "$OUT/lead.json"
```
(`ID` é o da Tarefa 17; se o shell for outro, recalcule com o `jq` de lá.) Esperado: `OK`; `{"contactName":"Ana","contactRole":null,"dealSetup":null,"dealMonthly":340}`; `1`; `{"contactName":null,"dealMonthly":null}`.

- [ ] **Passo 3: o componente**

Crie `src/components/crm/lead-info-fields.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { currencyForCountry, currencySymbol } from "@convex/lib/domain";

const fieldCls =
  "w-full rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-border-strong";

/**
 * Edição inline: salva no blur e no Enter (Enter só tira o foco; quem salva é o blur, um caminho
 * só); Esc descarta e NÃO fecha o drawer (stopPropagation: o LeadDetail escuta Esc no window).
 * Erro do servidor aparece abaixo do campo e o digitado fica. O pai remonta o campo por `key`
 * quando o valor salvo muda, então o rascunho nunca fica preso num valor velho.
 */
function InlineField({
  label,
  value,
  placeholder,
  type = "text",
  prefix,
  onSave,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: "text" | "number";
  prefix?: string;
  onSave: (draft: string) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState(value);
  const [msg, setMsg] = useState<string | null>(null);

  async function commit() {
    if (draft === value) return;
    if (type === "number" && draft !== "" && Number.isNaN(Number(draft))) {
      setMsg("Valor inválido"); // mesma mensagem do servidor
      return;
    }
    setMsg(null);
    try {
      await onSave(draft.trim());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha");
    }
  }

  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-muted">{label}</span>
      <span className="flex items-center gap-1.5">
        {prefix && <span className="shrink-0 text-sm text-muted">{prefix}</span>}
        <input
          type={type}
          min={type === "number" ? 0 : undefined}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              e.stopPropagation();
              setDraft(value);
              setMsg(null);
            }
          }}
          className={fieldCls}
        />
      </span>
      {msg && <span className="mt-1 block text-[11px] text-danger">{msg}</span>}
    </label>
  );
}

/** Contato (nome, cargo) e Negócio (setup, mensalidade, com o símbolo da moeda do país). */
export function LeadInfoFields({ lead }: { lead: Doc<"leads"> }) {
  const updateInfo = useMutation(api.leads.updateInfo);
  const symbol = currencySymbol(currencyForCountry(lead.countryCode));
  // campo numérico esvaziado envia null (limpa); o servidor valida negativo/NaN
  const num = (v: string) => (v === "" ? null : Number(v));

  return (
    <section className="rounded-xl bg-surface-2 p-4">
      <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">Contato</h3>
      <div className="grid grid-cols-2 gap-3">
        <InlineField
          key={`name:${lead.contactName ?? ""}`}
          label="Nome"
          value={lead.contactName ?? ""}
          placeholder="Quem atende"
          onSave={(v) => updateInfo({ id: lead._id, contactName: v })}
        />
        <InlineField
          key={`role:${lead.contactRole ?? ""}`}
          label="Cargo"
          value={lead.contactRole ?? ""}
          placeholder="Dono, gerente…"
          onSave={(v) => updateInfo({ id: lead._id, contactRole: v })}
        />
      </div>
      <h3 className="mb-2 mt-4 font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">Negócio</h3>
      <div className="grid grid-cols-2 gap-3">
        <InlineField
          key={`setup:${lead.dealSetup ?? ""}`}
          label="Setup"
          type="number"
          prefix={symbol}
          value={lead.dealSetup != null ? String(lead.dealSetup) : ""}
          placeholder="0"
          onSave={(v) => updateInfo({ id: lead._id, dealSetup: num(v) })}
        />
        <InlineField
          key={`monthly:${lead.dealMonthly ?? ""}`}
          label="Mensalidade"
          type="number"
          prefix={symbol}
          value={lead.dealMonthly != null ? String(lead.dealMonthly) : ""}
          placeholder="0"
          onSave={(v) => updateInfo({ id: lead._id, dealMonthly: num(v) })}
        />
      </div>
    </section>
  );
}
```

- [ ] **Passo 4: renderizar no InfoTab, abaixo da próxima ação e acima dos dados do Google**

Antes:
```tsx
import { NextActionForm } from "@/components/crm/next-action-form";
import { LostReasonModal } from "@/components/crm/lost-reason-modal";
```
Depois:
```tsx
import { NextActionForm } from "@/components/crm/next-action-form";
import { LeadInfoFields } from "@/components/crm/lead-info-fields";
import { LostReasonModal } from "@/components/crm/lost-reason-modal";
```

Antes:
```tsx
      <NextActionForm lead={lead} autoFocus={autoFocusAction} />

      <section>
```
Depois:
```tsx
      <NextActionForm lead={lead} autoFocus={autoFocusAction} />
      <LeadInfoFields lead={lead} />

      <section>
```

- [ ] **Passo 5: typecheck, lint, commit**

```bash
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/components/crm/lead-info-fields.tsx src/components/crm/lead-detail.tsx convex/leads.ts && echo OK
git add convex/leads.ts src/components/crm/lead-info-fields.tsx src/components/crm/lead-detail.tsx
git commit -m "feat(crm): contato e valores do negócio com edição inline" -m "updateInfo faz patch só do que foi enviado: string vazia e número null limpam; negativo é erro e a UI mostra a mensagem do servidor mantendo o digitado. Moeda derivada do país." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 19: soma da mensalidade no cabeçalho da coluna

**Files:**
- Modify: `src/app/(app)/crm/page.tsx` (import do domínio; cálculo antes de `const header`; o cabeçalho)

- [ ] **Passo 1: import**

Antes:
```tsx
  isStalled,
  compareByNextAction,
  type Stage,
} from "@convex/lib/domain";
```
Depois:
```tsx
  isStalled,
  compareByNextAction,
  formatMoney,
  currencyForCountry,
  type Stage,
} from "@convex/lib/domain";
```

- [ ] **Passo 2: a soma**

Antes:
```tsx
            const header = (
```
Depois:
```tsx
            // Soma de dealMonthly dos MESMOS leads que o N conta (depois de busca e filtro), na
            // moeda do primeiro lead da coluna com valor (mistura de moedas numa coluna é caso
            // raro: soma crua nessa moeda). Perdido não soma.
            const priced = isLost ? [] : items.filter((l) => typeof l.dealMonthly === "number");
            const monthlySum =
              priced.length > 0
                ? formatMoney(
                    priced.reduce((sum, l) => sum + (l.dealMonthly ?? 0), 0),
                    currencyForCountry(priced[0].countryCode),
                  )
                : null;
            const header = (
```

Antes:
```tsx
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] tabular-nums text-muted">
                    {items.length}
                  </span>
                  {isLost && (
```
Depois:
```tsx
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] tabular-nums text-muted">
                    {items.length}
                  </span>
                  {monthlySum && (
                    <span className="font-mono text-[10px] tabular-nums text-muted">· {monthlySum}/mês</span>
                  )}
                  {isLost && (
```

- [ ] **Passo 3: typecheck, lint, commit**

```bash
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint "src/app/(app)/crm/page.tsx" && echo OK
git add "src/app/(app)/crm/page.tsx"
git commit -m "feat(crm): soma da mensalidade no cabeçalho da coluna" -m "Conta os mesmos leads que o N (depois de busca e filtro), na moeda do primeiro com valor. Perdido não soma." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 20: seed do Bloco B (perdidos com motivo, contato e valores)

**Files:**
- Modify: `convex/demo.ts` (a tabela `crmExtras`)

- [ ] **Passo 1: entradas novas**

Antes:
```ts
    16: { stageUpdatedAt: now - 10 * DAY }, // Whiskey & Co (agendado)
  };
}
```
Depois:
```ts
    16: { stageUpdatedAt: now - 10 * DAY }, // Whiskey & Co (agendado)
    // perdidos com motivo (13 Kaffebar Oslo e 35 QuickFix Plumbing seguem em lost SEM motivo: caso legado)
    21: { stage: "lost", lostReason: "too_expensive", lostNote: "Achou a mensalidade alta para o tamanho do salão" }, // The Grooming Room
    33: { stage: "lost", lostReason: "has_site" }, // City Physio
    // contato e valores preenchidos (GB: libra)
    25: { contactName: "Emma Larsen", contactRole: "Dona", dealSetup: 900, dealMonthly: 340 }, // Klippet Nordic (agendado)
  };
}
```

- [ ] **Passo 2: re-seed e conferir**

```bash
./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json && echo OK
sleep 5; ./node_modules/.bin/convex run demo:seed > "$OUT/seed.txt" 2>&1; cat "$OUT/seed.txt"
./node_modules/.bin/convex run leads:list '{}' > "$OUT/leads.json"
jq -c '[.[] | select(.stage == "lost")] | map({name, lostReason})' "$OUT/leads.json"
jq -c '.[] | select(.name == "Klippet Nordic") | {stage, contactName, contactRole, dealSetup, dealMonthly, countryCode}' "$OUT/leads.json"
```
Esperado: `{ "seeded": 51 }`; quatro perdidos, dois com `lostReason` (`too_expensive`, `has_site`) e dois com `null`; `{"stage":"scheduled","contactName":"Emma Larsen","contactRole":"Dona","dealSetup":900,"dealMonthly":340,"countryCode":"GB"}` (no Kanban: "Agendado · N · £340/mês").

- [ ] **Passo 3: commit**

```bash
git add convex/demo.ts
git commit -m "feat(demo): seed com perdidos com motivo e um lead com contato e valores" -m "Os dois perdidos originais ficam sem motivo, para cobrir o caso legado." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

## Chunk 4: Bloco B, histórico (notas, timeline, glyph, aba Histórico, verificação final)

### Tarefa 21: `addNote`, `leads.timeline` e o feed do Dashboard sem notas

**Files:**
- Modify: `convex/leads.ts` (inserir depois de `updateInfo`)
- Modify: `convex/events.ts:9-15`

- [ ] **Passo 1: `addNote` e `timeline`**

Depois do `});` que fecha `updateInfo` (antes de `/** Marca uma reunião com o lead e move-o para "Agendado". */`):

```ts

/** Nota do CRM = evento `note` com meta { text }. Comentário privado: fora do feed do Dashboard. */
export const addNote = mutation({
  args: { id: v.id("leads"), text: v.string() },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    const text = args.text.trim();
    if (!text) throw new Error("Nota vazia");
    await ctx.db.insert("events", { orgId, type: "note", leadId: args.id, at: Date.now(), meta: { text } });
  },
});

/** Forma solta do meta que o Histórico lê (o schema guarda v.any()). */
type TimelineMeta = {
  text?: string;
  from?: string;
  to?: string;
  reason?: string;
  source?: string;
  channel?: string;
};

/** Histórico do lead: eventos via by_lead, mais recente primeiro. Outra org ou inexistente: erro. */
export const timeline = query({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    const events = await ctx.db
      .query("events")
      .withIndex("by_lead", (q) => q.eq("leadId", leadId))
      .order("desc")
      .take(100);
    return events.map((e) => ({
      _id: e._id,
      type: e.type,
      at: e.at,
      meta: (e.meta ?? null) as TimelineMeta | null,
    }));
  },
});
```

- [ ] **Passo 2: `events.recent` exclui `note`**

Antes (`convex/events.ts`, linhas 9-15):
```ts
    const events = await ctx.db
      .query("events")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(15);
    return await Promise.all(
      events.map(async (e) => {
```
Depois:
```ts
    const events = await ctx.db
      .query("events")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(30);
    // Nota é comentário privado do CRM; o feed é atividade do sistema. take(30) e corte em 15
    // para o feed manter o tamanho de hoje mesmo com notas no meio.
    const visible = events.filter((e) => e.type !== "note").slice(0, 15);
    return await Promise.all(
      visible.map(async (e) => {
```

- [ ] **Passo 3: typecheck e exercitar pela CLI**

```bash
export OUT=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/crm
./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json && echo OK
sleep 5; ./node_modules/.bin/convex run leads:list '{}' > "$OUT/leads.json"
ID=$(jq -r '.[] | select(.name == "Bella Cucina") | ._id' "$OUT/leads.json")
./node_modules/.bin/convex run leads:addNote "{\"id\":\"$ID\",\"text\":\"   \"}" > "$OUT/note-empty.txt" 2>&1; grep -c "Nota vazia" "$OUT/note-empty.txt"
./node_modules/.bin/convex run leads:addNote "{\"id\":\"$ID\",\"text\":\"  Falei com a dona.  \"}" > /dev/null 2>&1
./node_modules/.bin/convex run leads:timeline "{\"leadId\":\"$ID\"}" > "$OUT/timeline.json"; jq -c '.[0] | {type, meta}' "$OUT/timeline.json"
./node_modules/.bin/convex run events:recent '{}' > "$OUT/events.json"; jq -c '{total: length, notes: ([.[] | select(.type == "note")] | length)}' "$OUT/events.json"
```
Esperado: `OK`; `1`; `{"type":"note","meta":{"text":"Falei com a dona."}}` (trim); `{"total":15,"notes":0}`.

- [ ] **Passo 4: commit**

```bash
git add convex/leads.ts convex/events.ts
git commit -m "feat(crm): notas como eventos e histórico por lead" -m "addNote grava um evento note; leads.timeline lê pelo índice by_lead (100 mais recentes). O feed do Dashboard exclui notas: lê 30, filtra e corta em 15 para manter o tamanho de hoje." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 22: `event-glyph.tsx` extraído do Dashboard, com o caso `note`

**Files:**
- Create: `src/components/event-glyph.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx:5-16` (imports) e `:42-53` (apagar `eventDot`/`eventIcon`)

- [ ] **Passo 1: o módulo**

Crie `src/components/event-glyph.tsx`:

```tsx
import type { ReactNode } from "react";
import {
  MdOutlineVisibility,
  MdOutlineSend,
  MdOutlineChat,
  MdOutlineSwapHoriz,
  MdOutlineStickyNote2,
} from "react-icons/md";

/**
 * Cor e ícone por tipo de evento, compartilhados pelo feed do Dashboard e pelo Histórico do lead.
 * Extraídos de dashboard/page.tsx sem mudar comportamento; ganham o caso `note` (nota do CRM).
 * O `eventLabel` FICA no Dashboard: o feed tem copy própria e o Histórico tem a sua.
 */
export function eventDot(type: string): string {
  if (type === "preview_open") return "var(--warm)";
  if (type === "email_sent" || type === "reply") return "var(--brand)";
  if (type === "note") return "var(--faint)";
  return "var(--faint)";
}

export function eventIcon(type: string, meta: { channel?: string } | null): ReactNode {
  if (type === "note") return <MdOutlineStickyNote2 size={15} />;
  if (type === "preview_open") return <MdOutlineVisibility size={15} />;
  if (type === "email_sent") return meta?.channel === "whatsapp" ? <MdOutlineChat size={15} /> : <MdOutlineSend size={15} />;
  if (type === "reply") return <MdOutlineChat size={15} />;
  return <MdOutlineSwapHoriz size={15} />;
}
```

- [ ] **Passo 2: o Dashboard importa**

Antes (linhas 5-16):
```tsx
import type { ReactNode } from "react";
import {
  MdOutlineTravelExplore,
  MdOutlineWebAsset,
  MdOutlineMarkEmailRead,
  MdOutlineCheckCircle,
  MdOutlineVisibility,
  MdOutlineSend,
  MdOutlineChat,
  MdOutlineSwapHoriz,
} from "react-icons/md";
import { PageHeader, StatCard } from "@/components/ui";
```
Depois:
```tsx
import {
  MdOutlineTravelExplore,
  MdOutlineWebAsset,
  MdOutlineMarkEmailRead,
  MdOutlineCheckCircle,
} from "react-icons/md";
import { PageHeader, StatCard } from "@/components/ui";
import { eventDot, eventIcon } from "@/components/event-glyph";
```

Apague as duas funções (linhas 42-53) inteiras:
```tsx
function eventDot(type: string): string {
  if (type === "preview_open") return "var(--warm)";
  if (type === "email_sent" || type === "reply") return "var(--brand)";
  return "var(--faint)";
}

function eventIcon(type: string, meta: { channel?: string } | null): ReactNode {
  if (type === "preview_open") return <MdOutlineVisibility size={15} />;
  if (type === "email_sent") return meta?.channel === "whatsapp" ? <MdOutlineChat size={15} /> : <MdOutlineSend size={15} />;
  if (type === "reply") return <MdOutlineChat size={15} />;
  return <MdOutlineSwapHoriz size={15} />;
}

```
`eventLabel` e `ago` ficam onde estão.

- [ ] **Passo 3: typecheck, lint, commit**

```bash
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/components/event-glyph.tsx "src/app/(app)/dashboard/page.tsx" && echo OK
git add src/components/event-glyph.tsx "src/app/(app)/dashboard/page.tsx"
git commit -m "refactor(dashboard): extrai eventDot/eventIcon para event-glyph, com o caso note" -m "O Histórico do lead vai reusar cor e ícone; a copy do feed (eventLabel) fica no Dashboard." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 23: `LeadTimeline` e a aba "Histórico"

**Files:**
- Create: `src/components/crm/lead-timeline.tsx`
- Modify: `src/components/crm/lead-detail.tsx` (import, `TABS`, render)

- [ ] **Passo 1: o componente**

Crie `src/components/crm/lead-timeline.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PIPELINE_STAGES, lostReasonLabel, formatRelative } from "@convex/lib/domain";
import { eventDot, eventIcon } from "@/components/event-glyph";
import { useNow } from "@/lib/use-now";

type Meta = {
  text?: string;
  from?: string;
  to?: string;
  reason?: string;
  source?: string;
  channel?: string;
} | null;

/** meta.source dos eventos de opt-in; ausente = sem parênteses. */
const SOURCE_LABEL: Record<string, string> = {
  replied_email: "respondeu o email",
  phone_call: "ligação",
  in_person: "pessoalmente",
  reply: "resposta",
  other: "outro",
};

function stageLabel(id: string | undefined): string | undefined {
  return PIPELINE_STAGES.find((s) => s.id === id)?.label;
}

function withSource(label: string, source: string | undefined): string {
  if (!source) return label;
  return `${label} (${SOURCE_LABEL[source] ?? source})`;
}

/**
 * Copy do Histórico (seção 3.2 da spec). Não se unifica com o eventLabel do Dashboard: o feed
 * fala "<lead> abriu o preview"; aqui o lead é o contexto. Eventos antigos e do seed não têm
 * `from` (fica "→ Abordado"); perdido sem `reason` fica só "Abordado → Perdido".
 */
function timelineText(type: string, meta: Meta): string {
  switch (type) {
    case "note":
      return meta?.text ?? "";
    case "stage_change": {
      const from = stageLabel(meta?.from);
      const to = stageLabel(meta?.to) ?? meta?.to ?? "?";
      const base = from ? `${from} → ${to}` : `→ ${to}`;
      const reason = meta?.to === "lost" ? lostReasonLabel(meta?.reason) : undefined;
      return reason ? `${base} · ${reason}` : base;
    }
    case "email_sent":
      return "Email enviado";
    case "preview_open":
      return "Preview aberto";
    case "reply":
      return "Respondeu";
    case "wa_opt_in":
      return withSource("Opt-in WhatsApp", meta?.source);
    case "contact_opt_in":
      return withSource("Consentimento registrado", meta?.source);
    default:
      return type;
  }
}

/** Aba Histórico: campo de nota (Enter salva, Shift+Enter quebra linha) e a timeline do lead. */
export function LeadTimeline({ leadId }: { leadId: Id<"leads"> }) {
  const now = useNow();
  const events = useQuery(api.leads.timeline, { leadId });
  const addNote = useMutation(api.leads.addNote);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await addNote({ id: leadId, text });
      setText("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void save();
            }
          }}
          rows={Math.min(4, text.split("\n").length)}
          placeholder="Escreva uma nota e aperte Enter"
          aria-label="Nova nota"
          className="w-full resize-none rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-border-strong"
        />
        {msg && <p className="mt-1 text-xs text-danger">{msg}</p>}
      </div>

      {events === undefined ? (
        <p className="text-sm text-faint">Carregando…</p>
      ) : events.length === 0 ? (
        // Vazio sólido em vez do EmptyState de ui.tsx: ele virou `glass` no redesenho e vidro
        // dentro do drawer (glass-dense) é proibido. Mesmo tratamento do vazio da aba Site.
        <div className="rounded-xl border border-dashed border-border-strong bg-surface-2/60 px-6 py-10 text-center">
          <p className="font-display text-lg font-medium text-foreground">Nada registrado ainda</p>
        </div>
      ) : (
        <ul className="space-y-3 rounded-xl bg-surface-2 p-4">
          {events.map((e) => (
            <li key={e._id} className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0" style={{ color: eventDot(e.type) }}>
                {eventIcon(e.type, e.meta)}
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-snug text-foreground">
                {timelineText(e.type, e.meta)}
              </span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-faint">{formatRelative(e.at, now)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Passo 2: a sexta aba**

Antes:
```tsx
import { LeadInfoFields } from "@/components/crm/lead-info-fields";
import { LostReasonModal } from "@/components/crm/lost-reason-modal";
```
Depois:
```tsx
import { LeadInfoFields } from "@/components/crm/lead-info-fields";
import { LostReasonModal } from "@/components/crm/lost-reason-modal";
import { LeadTimeline } from "@/components/crm/lead-timeline";
```

Antes:
```tsx
const TABS = ["Informações", "Abordagem", "Site", "Objeções", "Venda"] as const;
```
Depois:
```tsx
const TABS = ["Informações", "Abordagem", "Site", "Objeções", "Venda", "Histórico"] as const;
```

Antes:
```tsx
          {tab === "Venda" && <SaleTab />}
        </div>
      </div>
      {lostOpen && (
```
Depois:
```tsx
          {tab === "Venda" && <SaleTab />}
          {tab === "Histórico" && <LeadTimeline leadId={lead._id} />}
        </div>
      </div>
      {lostOpen && (
```

- [ ] **Passo 3: typecheck, lint, commit**

```bash
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/components/crm/lead-timeline.tsx src/components/crm/lead-detail.tsx && echo OK
git add src/components/crm/lead-timeline.tsx src/components/crm/lead-detail.tsx
git commit -m "feat(crm): aba Histórico com notas e timeline do lead" -m "Enter salva a nota, Shift+Enter quebra linha; cada evento com ícone, cor, copy própria e data relativa. Vazio sólido (o EmptyState virou vidro e o drawer já é vidro)." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 24: seed com notas

**Files:**
- Modify: `convex/demo.ts` (constante `CRM_NOTES` depois de `crmExtras`; inserção depois dos eventos de `stage_change`)

- [ ] **Passo 1: os dados**

Depois do `}` que fecha `function crmExtras(...)`, adicione:

```ts

/** Notas do CRM (eventos `note`), por posição em NAMES; `agoMs` atrás de `now`. */
const CRM_NOTES: { i: number; agoMs: number; text: string }[] = [
  { i: 3, agoMs: 3 * 3600_000, text: "Falei com a Sanne: quer ver a prévia antes de decidir." }, // De Gouden Lepel BV
  { i: 25, agoMs: 1 * DAY, text: "Reunião marcada. Pediu proposta com dois planos." }, // Klippet Nordic
];
```

- [ ] **Passo 2: inserir os eventos**

Antes (o último laço de eventos do feed):
```ts
    for (const l of ids.filter((x) => x.stage === "converted").slice(0, 3)) {
      await ctx.db.insert("events", { orgId: ORG, type: "stage_change", leadId: l.id, at: now - t * 900_000, meta: { to: "converted" } });
      t += 1;
    }
```
Depois:
```ts
    for (const l of ids.filter((x) => x.stage === "converted").slice(0, 3)) {
      await ctx.db.insert("events", { orgId: ORG, type: "stage_change", leadId: l.id, at: now - t * 900_000, meta: { to: "converted" } });
      t += 1;
    }
    // Notas do CRM: comentário privado do lead; events.recent as exclui do feed.
    for (const n of CRM_NOTES) {
      await ctx.db.insert("events", { orgId: ORG, type: "note", leadId: ids[n.i].id, at: now - n.agoMs, meta: { text: n.text } });
    }
```

- [ ] **Passo 3: re-seed e conferir (a nota aparece no Histórico e NÃO no feed)**

```bash
./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json && echo OK
sleep 5; ./node_modules/.bin/convex run demo:seed > "$OUT/seed.txt" 2>&1; cat "$OUT/seed.txt"
./node_modules/.bin/convex run leads:list '{}' > "$OUT/leads.json"
ID=$(jq -r '.[] | select(.name == "De Gouden Lepel BV") | ._id' "$OUT/leads.json")
./node_modules/.bin/convex run leads:timeline "{\"leadId\":\"$ID\"}" > "$OUT/timeline.json"; jq -c '[.[] | {type, text: .meta.text}]' "$OUT/timeline.json"
./node_modules/.bin/convex run events:recent '{}' > "$OUT/events.json"; jq -c '{total: length, notes: ([.[] | select(.type == "note")] | length)}' "$OUT/events.json"
```
Esperado: `{ "seeded": 51 }`; `[{"type":"email_sent","text":null},{"type":"note","text":"Falei com a Sanne: quer ver a prévia antes de decidir."}]` (o `email_sent` do seed é de 2 h e pouco atrás, a nota de 3 h: mais recente primeiro); `{"total":15,"notes":0}`.

- [ ] **Passo 4: commit**

```bash
git add convex/demo.ts
git commit -m "feat(demo): seed com duas notas de CRM" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 25: verificação final

**Files:** nenhum.

- [ ] **Passo 1: suíte completa e build**

```bash
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json && ./node_modules/.bin/eslint && node --experimental-strip-types --test tests/*.test.ts 2>&1 | grep -E "^ℹ (tests|pass|fail)"
./node_modules/.bin/next build > "$OUT/build.txt" 2>&1; tail -5 "$OUT/build.txt"
```
Esperado: sem erros; `ℹ tests 208`, `ℹ fail 0` (191 antigos + 17 novos); o build termina com a tabela de rotas, sem "Failed to compile". O `next build` escreve em `.next/` e pode interferir no `next dev` que está rodando; se o dev quebrar depois, reinicie-o (avise no relatório).

- [ ] **Passo 2: guardas de texto e de estilo nos arquivos novos**

```bash
grep -rn "$(printf '\xe2\x80\x94')" src/components/crm/today-strip.tsx src/components/crm/next-action-line.tsx src/components/crm/next-action-form.tsx src/components/crm/lost-reason-modal.tsx src/components/crm/lead-info-fields.tsx src/components/crm/lead-timeline.tsx src/components/event-glyph.tsx src/lib/use-now.ts | wc -l
grep -n "Date.now()" src/components/crm/*.tsx "src/app/(app)/crm/page.tsx" | grep -v "use-now"
grep -c '"glass' src/components/crm/today-strip.tsx src/components/crm/lost-reason-modal.tsx src/components/crm/next-action-form.tsx src/components/crm/lead-info-fields.tsx src/components/crm/lead-timeline.tsx
```
Esperado: `0` travessões; nenhum `Date.now()` fora do hook e dos callbacks de update otimista (`crm/page.tsx` já tinha um dentro do `withOptimisticUpdate`, que é callback, não render); `"glass` (como classe) só em `today-strip.tsx` (1) e `lost-reason-modal.tsx` (1), zero nos três blocos do drawer (o comentário de `lead-timeline.tsx` cita a palavra, mas não como classe).

- [ ] **Passo 3: estado final dos dados do demo**

```bash
./node_modules/.bin/convex run leads:list '{}' > "$OUT/leads.json"
jq -c '{withAction: ([.[] | select(.nextActionAt != null)] | length), lost: ([.[] | select(.stage == "lost")] | length), lostWithReason: ([.[] | select(.lostReason != null)] | length), priced: ([.[] | select(.dealMonthly != null)] | map(.name))}' "$OUT/leads.json"
```
Esperado: `{"withAction":4,"lost":4,"lostWithReason":2,"priced":["Klippet Nordic"]}`.

- [ ] **Passo 4: screenshots finais**

```bash
CH=$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell | tail -1)
"$CH" --headless --no-sandbox --disable-gpu --hide-scrollbars --window-size=1440,900 --run-all-compositor-stages-before-draw --virtual-time-budget=15000 --screenshot="$OUT/final-crm.png" http://localhost:3000/crm
"$CH" --headless --no-sandbox --disable-gpu --hide-scrollbars --window-size=1440,900 --run-all-compositor-stages-before-draw --virtual-time-budget=15000 --screenshot="$OUT/final-dashboard.png" http://localhost:3000/dashboard
```
Abra as duas (Read). No CRM: faixa Hoje em vidro, linhas nos cards, "Agendado" com `· £340/mês`, coluna Perdido recolhida no fim. No Dashboard: "Atividade recente" sem nenhuma nota. Se o virtual time não carregou os dados, diga isso no relatório e aponte para o Passo 3 e para a Tarefa 26.

- [ ] **Passo 5: `git log` e relatório**

```bash
git log --oneline main..HEAD
```
Esperado: 18 commits, na ordem das tarefas (7 no Chunk 1, 3 no Chunk 2, 1 no 3a, 3 no 3b, 4 no Chunk 4). Relate: comandos e resultados, o que o screenshot mostrou ou não, e os desvios conscientes deste plano em relação à spec: (a) `src/lib/use-now.ts` e `src/components/crm/next-action-line.tsx` são arquivos além da tabela 3.4 (pureza do React Compiler e DRY da tabela 2.2); (b) o vazio do Histórico não usa o `EmptyState` de `ui.tsx` porque ele virou `glass` no redesenho e o drawer já é vidro; (c) a `TodayStrip` recebe `now` além de `items` e `onOpen`, para o "há N dias" usar o mesmo relógio da página.

### Tarefa 26: roteiro manual para a Duda (última tarefa; entregar como está)

Modo demo, `http://localhost:3000/crm`, com o seed desta branch (`./node_modules/.bin/convex run demo:seed`). Nada aqui é automatizável no headless (drag, foco, modal, Esc).

- [ ] A faixa "Hoje" aparece abaixo do título com "Atrasadas" (The Copper Pot, Olive & Thyme) e "Hoje" (De Gouden Lepel BV, Sharp Cuts). Buscar ou filtrar o Kanban não muda a faixa.
- [ ] "Feito" em The Copper Pot: a linha some da faixa e o detalhe abre na aba Informações com o campo "O que fazer?" já em foco. Digitar e Enter salva; a linha volta no card como `↺ … · hoje` ou com a data.
- [ ] "Adiar ▾ · 3 dias" em Olive & Thyme: a ação muda no card na hora (otimista). Adiar 1 dia numa ação de 5 dias atrás continua atrasada (esperado).
- [ ] Cards: The Copper Pot e Olive & Thyme com a linha em laranja (`há N dias`); De Gouden Lepel BV e Sharp Cuts em amarelo (`· hoje`); Trattoria Roma, The Bruncherie e Whiskey & Co com `parado há N dias` em itálico cinza; um lead convertido nunca mostra "parado".
- [ ] Filtro "Parados" mostra só os três parados; "Ordenar: Próxima ação" põe quem tem ação primeiro (por data) e o resto por score.
- [ ] Arrastar um card até a coluna "Perdido" recolhida (no fim, só cabeçalho): o cabeçalho acende, soltar abre o modal com o nome do lead; o primeiro rádio está focado e "Marcar perdido" desabilitado até escolher. Esc ou Cancelar: o card volta ao lugar e nada muda.
- [ ] Confirmar com "Caro demais" e uma nota: o card vai para Perdido (expanda a coluna pela seta) e, no detalhe, a aba Informações mostra `Perdido · Caro demais · <nota>` em laranja no topo, sem próxima ação.
- [ ] No seletor de estágio de um card, escolher "Perdido": o modal abre; cancelar deixa o seletor no estágio de antes.
- [ ] No detalhe de um lead em aberto, a pílula "Perdido" da Etapa e o botão "Perdido" do Status abrem o modal. Com o detalhe aberto, apertar Esc dentro do modal fecha SÓ o modal (o drawer continua aberto).
- [ ] Kaffebar Oslo (perdido legado, sem motivo): a faixa mostra só "Perdido". Clicar "Perdido" no Status abre o modal; confirmar um motivo faz a faixa mostrar `Perdido · <motivo>` sem gerar linha nova no Histórico.
- [ ] "Em aberto" num perdido: vai para Abordado e a faixa de perdido some (motivo limpo no servidor).
- [ ] Contato/Negócio no detalhe de Klippet Nordic: os campos vêm preenchidos com o símbolo £. Editar o nome e clicar fora salva; Enter salva; Esc descarta sem fechar o drawer. Apagar a mensalidade e sair do campo limpa; digitar `-5` mostra "Valor inválido" abaixo do campo e mantém o digitado.
- [ ] Cabeçalho da coluna "Agendado": `· £340/mês`. Buscar "zzz" zera a coluna e a soma some. Perdido nunca mostra soma.
- [ ] Aba "Histórico" de De Gouden Lepel BV: a nota do seed com "há 3 h"; escrever uma nota e Enter a coloca no topo com "agora"; Shift+Enter quebra linha; nota vazia mostra "Nota vazia". Um lead recém-perdido mostra `Abordado → Perdido · Caro demais` na timeline.
- [ ] Dashboard, "Atividade recente": nenhuma nota aparece (o feed continua com 15 itens).
- [ ] Modo escuro: faixa Hoje, modal e os blocos do drawer legíveis (texto laranja das atrasadas e da faixa de perdido em `--hot` claro).
