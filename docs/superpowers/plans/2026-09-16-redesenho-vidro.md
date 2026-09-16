# Redesenho "vidro sobre névoa": plano de implementação

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a área logada do Osprano (sidebar de 240px, cards brancos opacos) por um rail de 72px e cards translúcidos com blur sobre um fundo azul-acinzentado, sem tocar a landing nem as páginas públicas, conforme a spec `docs/superpowers/specs/2026-09-16-redesenho-vidro-design.md`.

**Architecture:** Tudo é CSS de tokens mais troca de classes utilitárias. Os tokens novos ficam escopados em `:root:has(.app-shell)` (claro) e `:root[data-theme="dark"]:has(.app-shell)` (escuro), então só quem renderiza um contêiner `.app-shell` (layout da área logada e páginas de login) recebe o visual novo. Três classes em `@layer components` (`glass`, `glass-lite`, `glass-dense`) substituem o padrão `border border-border bg-surface shadow-[var(--shadow-sm)]` nos blocos de primeiro nível; tudo dentro de um vidro é sólido (`bg-surface-solid` em inputs, `bg-surface-2` em chips e blocos). Nenhuma lógica muda; os 191 testes continuam iguais.

**Tech Stack:** Next.js 16.2 (App Router, Turbopack), React 19, Tailwind v4.3 via `@tailwindcss/postcss` (`@import "tailwindcss"` + `@theme inline` em `src/app/globals.css`), Convex (backend local em modo demo), Clerk (só fora do demo), `react-icons/md`. Node v24.

---

## Contexto obrigatório para quem executa

Leia antes de qualquer tarefa. Tudo aqui foi verificado no repositório em 2026-09-16.

### O que NÃO muda (fora do escopo, spec "Fora do escopo")

Landing (`src/app/page.tsx`, `src/components/landing/*`), páginas públicas de preview (`/p/[token]`, `/site/[slug]`, `src/components/preview-site.tsx`), o formulário interno do Clerk, layout móvel da área logada, fontes, ícones, paleta de marca, `text-faint` como texto real, a regra `:focus-visible` sem camada. Se uma tarefa parecer pedir algo disso, pare: está fora do escopo.

### Ferramentas: chame os binários direto, nunca `pnpm <script>`

`pnpm typecheck|lint|test` abortam nesta máquina antes de rodar (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`, ver `docs/LESSONS.md` seção Ambiente). Use sempre, a partir de `/Users/madu/Developer/mine/osprano`:

```bash
./node_modules/.bin/tsc --noEmit                       # typecheck (saída vazia = verde)
./node_modules/.bin/eslint                             # lint (saída vazia = verde)
node --experimental-strip-types --test tests/*.test.ts # testes (esperado: "pass 191", "fail 0")
NEXT_PUBLIC_DEMO=1 ./node_modules/.bin/next build      # build de produção (só na chunk 4)
```

Estado de partida verificado: `tsc` verde, `eslint` verde, 191 testes passando.

### Servidores de desenvolvimento

Dois processos já devem estar rodando em background. Confira com `lsof -iTCP -sTCP:LISTEN -P | grep -E "3000|3210"` (espera-se `node` em 3000 e `convex-lo` em 3210/3211). Se faltar algum, suba (cada um com `run_in_background`):

```bash
cd /Users/madu/Developer/mine/osprano && ./node_modules/.bin/convex dev --tail-logs disable
cd /Users/madu/Developer/mine/osprano && NEXT_PUBLIC_DEMO=1 ./node_modules/.bin/next dev
```

O deployment local do Convex já tem `DEMO_MODE=1` e `CONVEX_ENV=development` e está semeado com 51 leads. Se `/leads` aparecer vazio com o Convex de pé, semeie de novo: `./node_modules/.bin/convex run demo:seed`.

O modo demo (`NEXT_PUBLIC_DEMO=1`) não renderiza `ClerkProvider`; `/sign-in` e `/sign-up` quebram nele e ficam no roteiro manual da Duda, nunca no headless.

### BLOQUEIO ATUAL: o dev server responde 500 em todas as rotas

Verificado em 2026-09-16 16:30: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard` devolve `500` com `Parsing CSS source code failed ... Unexpected token Delim('|')` apontando para uma classe de sombra arbitrária gerada a partir de `src/app/globals.css`.

Causa: o Tailwind v4 varre automaticamente **todo arquivo não ignorado pelo git** atrás de candidatos a classe, inclusive os `.md` de `docs/`. A spec do redesenho (`docs/superpowers/specs/2026-09-16-redesenho-vidro-design.md`, linha 304) cita uma sombra arbitrária com um `|` dentro do `var()`, que o Lightning CSS não consegue compilar. Este plano também vive em `docs/` e citaria classes o tempo todo. A Tarefa 2 resolve isso com `@source not "../../docs";` no `globals.css` (suportado na versão instalada, 4.3.2). Até ela ser feita, **nenhum screenshot é confiável**.

Consequência para quem escreve docs neste repo: até a Tarefa 2, qualquer `classe-[valor]` inválido dentro de um `.md` derruba o CSS do app inteiro.

### Screenshots headless (sem Playwright)

Chrome headless já cacheado em `~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell`. Todos os PNGs vão para:

```
/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign/
```

A Tarefa 3 cria dois scripts ali (`shot.sh` e `shot-app.sh`). Fatos que valem para todas as capturas:

- Sob `--virtual-time-budget` o websocket do Convex pode não entregar dados: as páginas saem com "Carregando…" ou vazias. É aceitável para conferir tokens e layout.
- O headless liga `prefers-reduced-motion` sozinho, e o script passa `--force-prefers-reduced-motion` de propósito: `animate-rise` e as animações da landing ficam desligadas, o que deixa a captura determinística (necessário para a prova de igualdade da landing na chunk 4).
- Tema escuro: não há como setar `localStorage` num perfil descartável. A Tarefa 5 adiciona um gancho temporário no script inline de tema de `src/app/layout.tsx` que lê `?theme=dark|light` (só fora de produção). A Tarefa 24 remove o gancho.
- Só os PNGs finais "depois" em 1440 (claro e escuro) são commitados, em `docs/redesign/`.

### Commits

Conventional commits em português, um por tarefa, `git add` só dos arquivos da tarefa (nunca `git add -A`). Toda mensagem termina com a linha `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Formato:

```bash
git commit -m "$(cat <<'MSG'
tipo(escopo): resumo no imperativo

Corpo explicando o porquê (opcional).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

Não fazer `git push`. Branch atual: `main` (o repo trabalha direto nela; não criar branch).

### Regras de edição

- Cada tarefa mostra a string exata "Antes" e "Depois". Aplique com a ferramenta Edit (a string "Antes" é única no arquivo, salvo onde a tarefa disser `replace_all`).
- Nunca `glass` dentro de `glass`. Inputs, selects e textareas dentro de vidro são `bg-surface-solid`. Chips e blocos internos são `bg-surface-2`. Bloco que já está dentro de um `bg-surface-2` usa `bg-surface-solid`.
- Não inventar melhorias fora da spec (nada de trocar ícones, copy, espaçamentos não citados).
- O Next.js deste repo é o 16 e difere do treinamento (`AGENTS.md`). As tarefas só mexem em `className` e JSX; se precisar de algo de roteamento/layout, consulte `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` antes.

### Mapa de arquivos

| Arquivo | Responsabilidade nesta mudança |
|---|---|
| `src/app/globals.css` | `@source not`, `@layer base` para `border-color`, tokens escopados, `--mist`, classes `glass*`, `@theme inline` |
| `src/app/layout.tsx` | gancho temporário `?theme=` (entra na Tarefa 5, sai na 24) |
| `src/app/(app)/layout.tsx` | contêiner `.app-shell`, header removido, `main p-6` |
| `src/components/sidebar.tsx` | rail de 72px em vidro; `UsageFooter` apagado |
| `src/components/ui.tsx` | `PageHeader`, `StatCard`, `EmptyState` |
| `src/components/charts.tsx` | `ChartCard` |
| `src/app/sign-in/[[...sign-in]]/page.tsx`, `src/app/sign-up/[[...sign-up]]/page.tsx` | wrapper `.app-shell` + vidro |
| `src/app/(app)/{leads,crm,outreach,sites,plans,settings}/page.tsx` | superfícies tela a tela |
| `src/components/lead-card.tsx` | `glass-lite` |
| `src/components/crm/lead-detail.tsx`, `src/components/crm/create-lead-modal.tsx` | `glass-dense`, overlay `/30`, `text-danger-fg`, campos sólidos |
| `src/components/{call-script-panel,outreach-composer,contact-opt-in-button,whatsapp-followup}.tsx` | painéis aninhados: sólidos |
| `docs/redesign/*.png` | screenshots finais 1440 claro/escuro |
| `docs/LESSONS.md` | só se o recuo de desempenho (spec 4.2) for acionado |
| `convex/_generated/api.d.ts` | codegen pendente (commit `chore`, Tarefa 1) |

`src/app/(app)/dashboard/page.tsx` não muda: os cards de taxa já são `bg-surface-2` (conferido na Tarefa 12).

---

## Chunk 1: preparação, tokens e classes de vidro

### Task 1: commit do codegen pendente do Convex

> **JÁ FEITO** no commit `755a321` (junto com a Task 2). Pular; não repetir.

`git status` mostra `convex/_generated/api.d.ts` modificado (o codegen ganhou o módulo `lib/env`). Entra num commit `chore` próprio, antes do commit preparatório, para o diff do redesenho ficar limpo.

**Files:**
- Modify (já modificado no disco): `convex/_generated/api.d.ts`

- [ ] **Step 1: Confirmar que é só o codegen**

Run: `cd /Users/madu/Developer/mine/osprano && git status --short && git diff --stat`
Expected: uma linha ` M convex/_generated/api.d.ts`, `1 file changed, 2 insertions(+)` (duas linhas `lib/env`).

- [ ] **Step 2: Commit**

```bash
git add convex/_generated/api.d.ts
git commit -m "$(cat <<'MSG'
chore(convex): regenera api.d.ts com o módulo lib/env

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

Run: `git status --short`
Expected: vazio.

### Task 2: tirar `docs/` do scan do Tailwind (desbloqueia o dev server)

> **JÁ FEITO** no commit `755a321` (`@source not "../../docs";` na linha 2 de `globals.css`). Pular; só conferir que a linha existe.

**Files:**
- Modify: `src/app/globals.css:1`

- [ ] **Step 1: Reproduzir o 500**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/dashboard`
Expected: `500`. (Se der `200`, alguém já resolveu; ainda assim aplique o Step 2, porque este plano em `docs/` voltaria a quebrar o CSS.)

- [ ] **Step 2: Adicionar `@source not` logo após o import**

Antes (linha 1):
```css
@import "tailwindcss";
```

Depois:
```css
@import "tailwindcss";
/* O Tailwind v4 varre todo arquivo não ignorado pelo git atrás de classes, inclusive
   os .md de docs/. Uma spec que cite um valor arbitrário inválido derruba o CSS do app
   inteiro (aconteceu em 2026-09-16). Docs não têm markup: fora do scan. */
@source not "../../docs";
```

- [ ] **Step 3: Verificar que o dev server voltou**

Run: `sleep 3; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/dashboard`
Expected: `200`. Se continuar `500`, reinicie o Next (mate o processo `next dev` e suba de novo com `NEXT_PUBLIC_DEMO=1 ./node_modules/.bin/next dev` em background) e repita.

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/`
Expected: `200`.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "$(cat <<'MSG'
fix(css): exclui docs/ do scan de classes do Tailwind

O Tailwind v4 varre todo arquivo não ignorado pelo git, inclusive os .md
de docs/. A spec do redesenho cita um valor arbitrário inválido e o
Lightning CSS falhava ("Unexpected token Delim('|')"), derrubando todas
as rotas com 500.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 3: scripts de screenshot e capturas "antes" da landing e do site público

**Files:**
- Create: `/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign/shot.sh`
- Create: `/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign/shot-app.sh`

- [ ] **Step 1: Criar `shot.sh`**

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
mkdir -p "$SHOTS"
cat > "$SHOTS/shot.sh" <<'EOF'
#!/bin/zsh
# uso: shot.sh <nome-sem-extensao> <url> [largura=1440] [altura=900]
set -e
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
CH=$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell | tail -1)
W=${3:-1440}
H=${4:-900}
"$CH" --headless --no-sandbox --disable-gpu --hide-scrollbars --force-prefers-reduced-motion \
  --window-size=${W},${H} --run-all-compositor-stages-before-draw --virtual-time-budget=15000 \
  --screenshot="$SHOTS/$1.png" "$2" >/dev/null 2>&1
echo "$SHOTS/$1.png"
EOF
chmod +x "$SHOTS/shot.sh"
```

- [ ] **Step 2: Criar `shot-app.sh` (7 páginas x 2 temas x 2 larguras)**

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
cat > "$SHOTS/shot-app.sh" <<'EOF'
#!/bin/zsh
# uso: shot-app.sh <prefixo>  ->  <prefixo>-<pagina>-<tema>-<largura>.png (28 arquivos)
# Depende do gancho ?theme= da Tarefa 5 para o escuro.
set -e
DIR=$(dirname "$0")
for p in dashboard leads crm outreach sites plans settings; do
  for t in light dark; do
    "$DIR/shot.sh" "$1-$p-$t-1440" "http://localhost:3000/$p?theme=$t" 1440 900
    "$DIR/shot.sh" "$1-$p-$t-390" "http://localhost:3000/$p?theme=$t" 390 844
  done
done
EOF
chmod +x "$SHOTS/shot-app.sh"
```

- [ ] **Step 3: Descobrir um slug publicado do seed**

Run: `cd /Users/madu/Developer/mine/osprano && ./node_modules/.bin/convex data previews --limit 30 2>&1 | grep -o '"[a-z0-9-]*-d[0-9]"' | tail -1`
Expected: `"de-gouden-lepel-bv-d0"` (ou outro slug terminado em `-d0`). Guarde sem aspas como `SLUG`. Se sair vazio, o seed não rodou: `./node_modules/.bin/convex run demo:seed` e repita.

- [ ] **Step 4: Capturar landing e site público ANTES do commit preparatório (claro; o escuro só existe após a Tarefa 5)**

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
SLUG=de-gouden-lepel-bv-d0   # troque pelo valor do Step 3
"$SHOTS/shot.sh" prep-antes-landing-1440 "http://localhost:3000/" 1440 900
"$SHOTS/shot.sh" prep-antes-landing-alta "http://localhost:3000/" 1440 5000
"$SHOTS/shot.sh" prep-antes-site-1440 "http://localhost:3000/site/$SLUG" 1440 900
"$SHOTS/shot.sh" prep-antes-site-alta "http://localhost:3000/site/$SLUG" 1440 3000
ls -la "$SHOTS"/prep-antes-*.png
```

Expected: 4 arquivos, cada um com dezenas de KB (um PNG de ~5 KB é página de erro: abra com Read e confira).

- [ ] **Step 5: Olhar uma captura**

Use Read em `$SHOTS/prep-antes-landing-1440.png`. Expected: a landing renderizada (hero com texto), não uma tela de erro do Next.

Sem commit (nada no repo mudou).

### Task 4: commit preparatório: `* { border-color }` para dentro de `@layer base`

Bug pré-existente descrito na spec: a regra `* { border-color: var(--border) }` está fora de qualquer `@layer`, e estilo sem camada vence utilitário em camada. Nenhum `border-brand`, `border-transparent`, `border-white/10` do repo funciona hoje. Sem esta correção o `--glass-border` da classe `glass` também seria ignorado. A landing e o preview público **vão mudar** onde essas bordas eram intencionais; a Duda decide com o antes/depois.

**Files:**
- Modify: `src/app/globals.css` (regra `* { border-color }`, hoje nas linhas 108-110)

- [ ] **Step 1: Mover a regra para `@layer base`**

Antes:
```css
* {
  border-color: var(--border);
}
```

Depois:
```css
/* Em @layer base de propósito: fora de camada esta regra vencia TODO utilitário de cor
   de borda (border-brand, border-transparent, border-white/10), que é o que o guia de
   upgrade do Tailwind v4 manda evitar. */
@layer base {
  * {
    border-color: var(--border);
  }
}
```

- [ ] **Step 2: Conferir que o CSS compila e a app responde**

Run: `sleep 3; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/ && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/plans`
Expected: `200` e `200`.

- [ ] **Step 3: Capturar landing e site público DEPOIS**

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
SLUG=de-gouden-lepel-bv-d0   # mesmo da Tarefa 3
"$SHOTS/shot.sh" prep-depois-landing-1440 "http://localhost:3000/" 1440 900
"$SHOTS/shot.sh" prep-depois-landing-alta "http://localhost:3000/" 1440 5000
"$SHOTS/shot.sh" prep-depois-site-1440 "http://localhost:3000/site/$SLUG" 1440 900
"$SHOTS/shot.sh" prep-depois-site-alta "http://localhost:3000/site/$SLUG" 1440 3000
cmp -s "$SHOTS/prep-antes-landing-alta.png" "$SHOTS/prep-depois-landing-alta.png" && echo "landing: idêntica" || echo "landing: MUDOU (esperado)"
cmp -s "$SHOTS/prep-antes-site-alta.png" "$SHOTS/prep-depois-site-alta.png" && echo "site: idêntico" || echo "site: MUDOU (esperado)"
```

Expected: as duas dizem `MUDOU` (a landing tem 22 usos de `border-brand`/`border-white/10`/`border-transparent` que passam a valer; o preview tem 6 `border-white/10|25`). Se uma disser "idêntica", olhe as duas imagens com Read antes de seguir: pode ser que naquela página nenhuma borda intencional apareça acima da dobra, o que é aceitável, mas registre no report.

- [ ] **Step 4: Conferir também a área logada (o bug aparecia lá)**

Run: `"$SHOTS/shot.sh" prep-depois-plans "http://localhost:3000/plans" 1440 900` e abra o PNG com Read.
Expected: o card do meio ("Popular") agora tem borda azul de 2px (antes era cinza `#e2e6ef`).

- [ ] **Step 5: typecheck e lint**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK`.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "$(cat <<'MSG'
fix(css): move a regra global de border-color para @layer base

Fora de camada ela vencia todo utilitário de cor de borda (border-brand,
border-transparent, border-white/10), que o Tailwind v4 põe em @layer
utilities. O card "Popular", o LeadCard selecionado, as abas do drawer e
as bordas brancas da landing e do preview passam a renderizar como foram
escritas. Screenshots antes/depois de / e /site/[slug] no scratchpad da
sessão, para a Duda avaliar.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

- [ ] **Step 7: Registrar no report para a Duda**

Anote os 4 pares (`prep-antes-*` vs `prep-depois-*`) como decisão dela: aceitar o efeito colateral na landing e no preview. O redesenho é comparado contra o "depois".

### Task 5: gancho temporário `?theme=` para screenshots no escuro

**Files:**
- Modify: `src/app/layout.tsx:30-36` (script inline de tema)

- [ ] **Step 1: Extrair o script para constantes e acrescentar o gancho**

Antes (linhas 30-36):
```tsx
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
```

Depois:
```tsx
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT + THEME_QUERY_HOOK }} />
      </head>
```

E, acima de `export default function RootLayout` (logo depois da linha `const DEMO = ...`), adicione:

```tsx
const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;

// TEMPORÁRIO (plano docs/superpowers/plans/2026-09-16-redesenho-vidro.md, Tarefa 24 remove):
// `?theme=dark|light` força o tema nos screenshots headless. Só fora de produção.
const THEME_QUERY_HOOK =
  process.env.NODE_ENV !== "production"
    ? `(function(){try{var q=new URLSearchParams(location.search).get('theme');if(q==='light'||q==='dark'){document.documentElement.dataset.theme=q;}}catch(e){}})();`
    : "";
```

- [ ] **Step 2: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK`.

Run: `curl -s "http://localhost:3000/dashboard?theme=dark" | grep -o "URLSearchParams(location.search)" | head -1`
Expected: `URLSearchParams(location.search)` (o gancho está no HTML).

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
"$SHOTS/shot.sh" hook-dark "http://localhost:3000/dashboard?theme=dark" 1440 900
```
Abra com Read. Expected: fundo escuro (`#0b0e15`), sidebar escura.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "$(cat <<'MSG'
chore(dev): gancho temporário ?theme= para screenshots headless

Só fora de produção. Sai no fim do redesenho.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 6: capturas "antes" da área logada e baseline pós-preparação da landing

Estas são as referências: `antes-*` para o lado-a-lado do redesenho, `base-*` para a prova de que a landing e o preview não mudam com o redesenho (spec 5, último item).

- [ ] **Step 1: 28 capturas da área logada**

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
"$SHOTS/shot-app.sh" antes
ls "$SHOTS"/antes-*.png | wc -l
```
Expected: `28`.

- [ ] **Step 2: Baseline da landing e do site (claro e escuro)**

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
SLUG=de-gouden-lepel-bv-d0
for t in light dark; do
  "$SHOTS/shot.sh" base-landing-$t-1440 "http://localhost:3000/?theme=$t" 1440 900
  "$SHOTS/shot.sh" base-landing-$t-alta "http://localhost:3000/?theme=$t" 1440 5000
  "$SHOTS/shot.sh" base-site-$t-1440 "http://localhost:3000/site/$SLUG?theme=$t" 1440 900
  "$SHOTS/shot.sh" base-site-$t-alta "http://localhost:3000/site/$SLUG?theme=$t" 1440 3000
done
cmp -s "$SHOTS/base-landing-light-alta.png" "$SHOTS/prep-depois-landing-alta.png" && echo "baseline claro == prep-depois (ok)" || echo "ATENÇÃO: diferente de prep-depois; capture de novo antes de seguir"
```
Expected: `baseline claro == prep-depois (ok)`. Se diferir duas vezes seguidas, abra as duas com Read e registre o que difere; siga só se for ruído (nada de cor/borda).

Sem commit.

### Task 7: tokens escopados, névoa e preferência de transparência reduzida

Nada tem `.app-shell` ainda, então este commit é invisível: é isso que prova o escopo.

**Files:**
- Modify: `src/app/globals.css` (antes de `@theme inline {`; e após a regra `body { ... }`)

- [ ] **Step 1: Inserir os blocos escopados antes de `@theme inline {`**

Antes (string única):
```css
@theme inline {
```

Depois:
```css
/* ============================================================
   Área logada: "vidro sobre névoa"
   (spec: docs/superpowers/specs/2026-09-16-redesenho-vidro-design.md, seção 1)
   Escopado em .app-shell: a landing e as páginas públicas (/, /p/[token],
   /site/[slug]) não renderizam .app-shell e ficam com os tokens acima.
   Cascata: :root:has(.app-shell) (0,2,0) vem DEPOIS de :root[data-theme="dark"]
   (0,2,0) e vence no escuro para qualquer token que definir. Regra: todo token
   com valor escuro é repetido no bloco escuro escopado; token que só muda no
   escuro (--muted, --cold, --hot, --danger) entra SÓ no bloco escuro escopado.
   ============================================================ */

:root:has(.app-shell) {
  --background: #eef2f9;
  --mist:
    radial-gradient(60% 50% at 20% 10%, #dfe8ff, transparent 60%),
    radial-gradient(50% 45% at 85% 20%, #e9eef8, transparent 60%),
    radial-gradient(60% 60% at 60% 100%, #d6e2f5, transparent 65%);

  --surface: rgba(255, 255, 255, 0.62);
  --surface-solid: #ffffff;
  --elevated: rgba(255, 255, 255, 0.88);
  --glass-border: rgba(255, 255, 255, 0.9);
  --danger-fg: #ffffff;

  --shadow-sm: 0 4px 14px rgba(30, 45, 80, 0.06);
  --shadow-md: 0 10px 30px rgba(30, 45, 80, 0.08);
  --shadow-lg: 0 24px 60px rgba(30, 45, 80, 0.14);

  --radius: 18px;
  /* fora do @theme inline de propósito: lá seria global; aqui fica escopada */
  --radius-panel: 22px;
  --glass-blur: 16px;
  --glass-blur-lite: 12px;
}

:root[data-theme="dark"]:has(.app-shell) {
  --background: #0f1522;
  --mist:
    radial-gradient(60% 50% at 20% 10%, #1d2f5a, transparent 60%),
    radial-gradient(50% 45% at 85% 20%, #1a2740, transparent 60%),
    radial-gradient(60% 60% at 60% 100%, #17305e, transparent 65%);

  --surface: rgba(255, 255, 255, 0.07);
  --surface-solid: #161c28;
  --elevated: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.12);
  --danger-fg: #14171d;

  /* só no escuro: 7% de branco sobre a mancha #1d2f5a dá ~#2d3e66 e os valores
     antigos ficavam abaixo de 4,5:1 como texto (spec 1.2) */
  --muted: #a3abbb;
  --cold: #a3abbb;
  --hot: #ff8f78;
  --danger: #ff8a8e;

  --shadow-sm: 0 4px 14px rgba(0, 0, 0, 0.25);
  --shadow-md: 0 10px 30px rgba(0, 0, 0, 0.35);
  --shadow-lg: 0 24px 60px rgba(0, 0, 0, 0.5);
}

/* Preferência do sistema: vidro opaco, sem blur, contorno em --border.
   Vem DEPOIS dos blocos escopados de propósito (mesma especificidade; a ordem decide).
   backdrop-filter: none (não blur(0px): zero ainda cria backdrop root e custa compositing). */
@media (prefers-reduced-transparency: reduce) {
  :root:has(.app-shell) {
    --surface: rgba(255, 255, 255, 0.96);
    --elevated: #ffffff;
    --glass-border: var(--border);
  }
  :root[data-theme="dark"]:has(.app-shell) {
    --surface: rgba(22, 28, 40, 0.97);
    --elevated: #1d2531;
    --glass-border: var(--border);
  }
  .glass,
  .glass-lite,
  .glass-dense {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

@theme inline {
```

- [ ] **Step 2: A névoa só no escopo, no lugar do brilho radial**

Antes (fim da regra `body`, string única):
```css
  background-attachment: fixed;
}
```

Depois:
```css
  background-attachment: fixed;
}

/* Área logada: a névoa substitui o brilho radial acima (fora do escopo, na landing, ele continua). */
:root:has(.app-shell) body {
  background-image: var(--mist);
}
```

- [ ] **Step 3: Verificar compilação e invisibilidade**

Run: `sleep 3; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/dashboard`
Expected: `200`.

```bash
CSS=$(curl -s http://localhost:3000/dashboard | grep -o '/_next/static/chunks/[^"]*\.css' | head -1)
curl -s "http://localhost:3000$CSS" | grep -c "app-shell"
```
Expected: número maior ou igual a `5` (os seletores escopados estão no CSS servido).

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
"$SHOTS/shot.sh" t7-dashboard "http://localhost:3000/dashboard" 1440 900
cmp -s "$SHOTS/t7-dashboard.png" "$SHOTS/antes-dashboard-light-1440.png" && echo "invisível (ok)" || echo "MUDOU: algo vazou do escopo"
```
Expected: `invisível (ok)`. Se disser `MUDOU`, abra as duas com Read: diferença de DADOS (uma captura com números, outra com "Carregando…", porque o websocket do Convex sob tempo virtual não é determinístico) é ruído e não bloqueia; diferença de COR, raio ou sombra significa token escrito fora de `:root:has(.app-shell)`: corrija antes de commitar.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "$(cat <<'MSG'
feat(css): tokens do redesenho vidro escopados em .app-shell

Névoa (--mist), superfícies translúcidas, sombras difusas, raio 18/22px e
os valores de texto do escuro, todos sob :root:has(.app-shell). Sem
.app-shell no DOM nada muda: a landing e o preview seguem iguais.
Inclui o fallback de prefers-reduced-transparency.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 8: classes `glass*` em `@layer components` e tokens novos no `@theme inline`

**Files:**
- Modify: `src/app/globals.css` (`@theme inline`; e após o bloco `@layer base`)

- [ ] **Step 1: `@theme inline`: três acréscimos**

Edit 1. Antes: `  --color-surface-2: var(--surface-2);`
Depois:
```css
  --color-surface-2: var(--surface-2);
  --color-surface-solid: var(--surface-solid);
```

Edit 2. Antes: `  --color-danger: var(--danger);`
Depois:
```css
  --color-danger: var(--danger);
  --color-danger-fg: var(--danger-fg);
```

Edit 3. Antes: `  --radius-xl: var(--radius);`
Depois:
```css
  --radius-xl: var(--radius);
  /* 1rem é o default do Tailwind: na landing (sem --radius-panel) rounded-2xl segue 16px;
     na área logada vira 22px, para não ficar menor que o rounded-xl de 18px. */
  --radius-2xl: var(--radius-panel, 1rem);
```

- [ ] **Step 2: Classes de vidro logo após o bloco `@layer base`**

Antes (string única, criada na Tarefa 4):
```css
@layer base {
  * {
    border-color: var(--border);
  }
}
```

Depois:
```css
@layer base {
  * {
    border-color: var(--border);
  }
}

/* Vidro: SÓ no primeiro nível (o bloco que encosta na névoa ou no overlay). Dentro
   de um vidro tudo é sólido (bg-surface-solid em campos, bg-surface-2 em chips).
   Em @layer components (não @utility) para border-2, border-brand, border-dashed,
   ring-2 e sombras arbitrárias continuarem vencendo por cima. Raio não entra: cada uso
   escolhe rounded-xl (18px) ou rounded-2xl (22px). */
@layer components {
  .glass {
    background: var(--surface);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-md);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
  }
  .glass-lite {
    /* itens em lista longa: card de lead */
    background: var(--surface);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-sm);
    backdrop-filter: blur(var(--glass-blur-lite));
    -webkit-backdrop-filter: blur(var(--glass-blur-lite));
  }
  .glass-dense {
    /* drawer e modais, sobre overlay */
    background: var(--elevated);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-lg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
  }
}
```

- [ ] **Step 3: Verificar**

Run: `sleep 3; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/dashboard`
Expected: `200`.

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK`.

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
"$SHOTS/shot.sh" t8-leads "http://localhost:3000/leads" 1440 900
cmp -s "$SHOTS/t8-leads.png" "$SHOTS/antes-leads-light-1440.png" && echo "invisível (ok)" || echo "MUDOU"
```
Expected: `invisível (ok)`, com a mesma ressalva da Tarefa 7 (diferença só de dados do Convex é ruído). `rounded-2xl` com o fallback `1rem` continua 16px porque `--radius-panel` não existe fora de `.app-shell`; nada usa `glass` ainda.

Observação: as classes `.glass*` em `@layer components` saem no CSS servido mesmo sem uso (verificado compilando com zero candidatos). Conferência positiva: `curl -s http://localhost:3000/dashboard | grep -o '_next/static/chunks/[^"]*\.css' | head -1` e depois `curl -s http://localhost:3000/<esse caminho> | grep -c '\.glass'`, esperado `>= 3`. A Tarefa 9 (rail) é a primeira a usá-las.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "$(cat <<'MSG'
feat(css): classes glass, glass-lite e glass-dense e tokens novos no tema

Em @layer components para utilitários (border-brand, ring-2, border-dashed)
vencerem. O @theme inline ganha surface-solid, danger-fg e rounded-2xl
em função de --radius-panel (22px na área logada, 16px fora).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

## Chunk 2: casca (layout, rail, título das páginas, login)

### Task 9: layout da área logada sem header e rail de 72px em vidro

O header de 56px some, e com ele a pílula "modo demo" e o `<UserButton />`, que descem para a base do rail. `UsageFooter` é apagado (plano e uso já vivem em Settings > "Plano & uso", com a mesma query e os mesmos botões). A sidebar deixa de importar `api`.

**Files:**
- Modify: `src/app/(app)/layout.tsx` (arquivo inteiro, 26 linhas)
- Modify: `src/components/sidebar.tsx` (arquivo inteiro, 132 linhas)

- [ ] **Step 1: Reescrever `src/app/(app)/layout.tsx`**

Conteúdo completo do arquivo:

```tsx
import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell flex h-dvh">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="animate-rise">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Reescrever `src/components/sidebar.tsx`**

Conteúdo completo do arquivo:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  MdOutlineDashboard,
  MdOutlineTravelExplore,
  MdOutlineViewKanban,
  MdOutlineForwardToInbox,
  MdOutlineLanguage,
  MdOutlineSettings,
} from "react-icons/md";
import type { IconType } from "react-icons";
import { ThemeToggle } from "@/components/theme-toggle";

const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

/** Rótulos curtos: o rail tem 72px. "Meus Projetos" vira "Sites" só aqui (a página mantém o título). */
const NAV: { href: string; label: string; Icon: IconType }[] = [
  { href: "/dashboard", label: "Início", Icon: MdOutlineDashboard },
  { href: "/leads", label: "Leads", Icon: MdOutlineTravelExplore },
  { href: "/crm", label: "CRM", Icon: MdOutlineViewKanban },
  { href: "/outreach", label: "Outreach", Icon: MdOutlineForwardToInbox },
  { href: "/sites", label: "Sites", Icon: MdOutlineLanguage },
];

function NavItem({ href, label, Icon }: { href: string; label: string; Icon: IconType }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-center text-[11px] font-medium transition-colors ${
        active ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2/60 hover:text-foreground"
      }`}
    >
      <Icon size={22} />
      {label}
    </Link>
  );
}

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="var(--brand)" strokeWidth="1.5" opacity="0.4" />
      <circle cx="12" cy="12" r="5" stroke="var(--brand)" strokeWidth="1.5" opacity="0.7" />
      <circle cx="12" cy="12" r="1.8" fill="var(--brand)" />
    </svg>
  );
}

/**
 * Rail de 72px em vidro. Sem h-full de propósito: o flex do pai já estica, e
 * h-full + margem estourava o h-dvh em 32px.
 */
export function Sidebar() {
  return (
    <nav className="glass m-4 mr-0 flex w-[72px] shrink-0 flex-col items-center gap-1 rounded-2xl px-2 py-4">
      <Link
        href="/dashboard"
        aria-label="Osprano"
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
      >
        <Logo />
      </Link>

      {NAV.map((item) => (
        <NavItem key={item.href} href={item.href} label={item.label} Icon={item.Icon} />
      ))}

      <div className="mt-auto flex w-full flex-col items-center gap-2 pt-4">
        <NavItem href="/settings" label="Ajustes" Icon={MdOutlineSettings} />
        <ThemeToggle />
        {DEMO ? (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[9px] font-semibold text-muted">
            DEMO
          </span>
        ) : (
          <UserButton />
        )}
      </div>
    </nav>
  );
}
```

Notas para quem aplica:
- O item de Ajustes reutiliza `NavItem`: mesmo formato dos outros, texto "Ajustes" visível, sem `aria-label="Configurações"` (divergiria do texto) e `aria-current="page"` em `/settings`.
- Em demo não há `ClerkProvider`; `UserButton` é importado mas nunca renderizado nesse modo (mesmo padrão de `useUser` em `settings/page.tsx`).
- Se no screenshot o rótulo "Outreach" estourar a largura do item, troque `px-1` do `NavItem` por `px-0.5` e registre no report; não mexa em fonte nem em `tracking`.

- [ ] **Step 3: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK` (se o eslint acusar import não usado, algo do arquivo antigo sobrou).

Run: `grep -n "UsageFooter\|@convex/_generated/api\|useQuery" src/components/sidebar.tsx; echo "exit=$?"`
Expected: `exit=1` (nenhuma ocorrência).

Run: `grep -n "header\|UserButton" "src/app/(app)/layout.tsx"; echo "exit=$?"`
Expected: `exit=1`.

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
"$SHOTS/shot.sh" t9-dashboard-light "http://localhost:3000/dashboard?theme=light" 1440 900
"$SHOTS/shot.sh" t9-dashboard-dark "http://localhost:3000/dashboard?theme=dark" 1440 900
"$SHOTS/shot.sh" t9-settings-light "http://localhost:3000/settings?theme=light" 1440 900
```
Abra os três com Read. Expected: fundo com névoa azul-acinzentada (claro) / azul-marinho (escuro); rail estreito translúcido flutuando com margem de 16px, logo no topo, cinco itens com ícone e rótulo, "Ajustes" + botão de tema + chip `DEMO` embaixo; nenhum header; em `/settings` o item "Ajustes" com fundo azul-claro. Os cards ainda são brancos opacos (chunk 3 é que migra).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/layout.tsx" src/components/sidebar.tsx
git commit -m "$(cat <<'MSG'
feat(shell): rail de 72px em vidro e header removido

O contêiner externo vira .app-shell (liga os tokens escopados). A pílula
de demo e o UserButton descem para a base do rail; UsageFooter sai
(plano e uso já vivem em Settings > Plano & uso, mesma query). NavItem
ganha aria-current; Ajustes vira item com texto visível.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 10: `PageHeader` sem borda inferior

**Files:**
- Modify: `src/components/ui.tsx:15`

- [ ] **Step 1: Editar**

Antes:
```tsx
    <div className="mb-8 flex items-end justify-between gap-4 border-b border-border pb-6">
```

Depois:
```tsx
    <div className="mb-6 flex items-end justify-between gap-4">
```

- [ ] **Step 2: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK`.

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
"$SHOTS/shot.sh" t10-crm "http://localhost:3000/crm?theme=light" 1440 900
```
Abra com Read. Expected: título "CRM" direto na névoa, sem linha embaixo; o select "Ordenar" e o botão "Criar lead" no canto superior direito.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui.tsx
git commit -m "$(cat <<'MSG'
feat(ui): PageHeader direto na névoa, sem borda inferior

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 11: páginas de login com névoa e vidro

O formulário do Clerk não muda; só o container.

**Files:**
- Modify: `src/app/sign-in/[[...sign-in]]/page.tsx` (arquivo inteiro, 9 linhas)
- Modify: `src/app/sign-up/[[...sign-up]]/page.tsx` (arquivo inteiro, 9 linhas)

- [ ] **Step 1: Reescrever `sign-in`**

```tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="app-shell flex min-h-dvh items-center justify-center p-6">
      <div className="glass rounded-2xl p-2">
        <SignIn />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Reescrever `sign-up`**

```tsx
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="app-shell flex min-h-dvh items-center justify-center p-6">
      <div className="glass rounded-2xl p-2">
        <SignUp />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK`.

Não há screenshot headless (em demo o `<SignIn />` quebra sem `ClerkProvider`). Fica no roteiro manual (Tarefa 29).

- [ ] **Step 4: Commit**

```bash
git add "src/app/sign-in/[[...sign-in]]/page.tsx" "src/app/sign-up/[[...sign-up]]/page.tsx"
git commit -m "$(cat <<'MSG'
feat(auth): páginas de login com névoa e cartão de vidro

Só o container muda; o formulário do Clerk é o mesmo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

## Chunk 3a: superfícies tela a tela (componentes base, Leads, CRM)

Padrão de troca: `border border-border bg-surface shadow-[var(--shadow-sm)]` vira `glass` (ou `glass-lite` em lista longa). `rounded-xl`, `rounded-[var(--radius)]` e `rounded-2xl` ficam. Onde o card "sobe" no hover, o `hover:shadow-[var(--shadow-md)]` vira `hover:shadow-[var(--shadow-lg)]` (o `-md` seria no-op porque `glass` já descansa em `-md`). `border-border` que sobrar num elemento `glass` venceria o `--glass-border`: sai.

### Task 12: `StatCard`, `EmptyState` e `ChartCard` em vidro (e conferência do Dashboard)

**Files:**
- Modify: `src/components/ui.tsx:46,67`
- Modify: `src/components/charts.tsx:16`
- Read only: `src/app/(app)/dashboard/page.tsx:128`

- [ ] **Step 1: `StatCard` (`ui.tsx` linha 46)**

Antes:
```tsx
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
```

Depois:
```tsx
    <div className="glass rounded-[var(--radius)] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]">
```

- [ ] **Step 2: `EmptyState` (`ui.tsx` linha 67). `border-dashed border-border-strong` continua vencendo por ser utilitário; `bg-surface/40` sai**

Antes:
```tsx
    <div className="rounded-[var(--radius)] border border-dashed border-border-strong bg-surface/40 px-6 py-16 text-center">
```

Depois:
```tsx
    <div className="glass rounded-[var(--radius)] border-dashed border-border-strong px-6 py-16 text-center">
```

- [ ] **Step 3: `ChartCard` (`charts.tsx` linha 16)**

Antes:
```tsx
      className={`rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)] ${className}`}
```

Depois:
```tsx
      className={`glass rounded-[var(--radius)] p-6 hover:shadow-[var(--shadow-lg)] ${className}`}
```

- [ ] **Step 4: Conferir o Dashboard (sem edição)**

Run: `grep -n "bg-surface" "src/app/(app)/dashboard/page.tsx"`
Expected: duas linhas, ambas `bg-surface-2`: a 128 (`rounded-xl border border-border bg-surface-2 p-4`, os cards de taxa, como a spec pede) e a 162 (trilho das barras do funil). Nenhum `bg-surface` nu. Nada a mudar.

- [ ] **Step 5: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK`.

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
"$SHOTS/shot.sh" t12-dashboard-light "http://localhost:3000/dashboard?theme=light" 1440 900
"$SHOTS/shot.sh" t12-dashboard-dark "http://localhost:3000/dashboard?theme=dark" 1440 900
```
Abra com Read. Expected: os 4 StatCards e o painel "Taxas do funil" translúcidos com contorno branco fino, sombra difusa; dentro do painel os cinco cards de taxa em cinza-claro sólido (`surface-2`). No escuro, cards levemente mais claros que a névoa. Se a névoa não aparecer atrás dos cards, `.glass` não está sendo aplicada (confira o nome da classe).

- [ ] **Step 6: Commit**

```bash
git add src/components/ui.tsx src/components/charts.tsx
git commit -m "$(cat <<'MSG'
feat(ui): StatCard, EmptyState e ChartCard em vidro

Hover dos cards que sobem vai para shadow-lg (glass já descansa em md).
EmptyState mantém a borda tracejada por utilitário e perde o bg-surface/40,
que comporia com os 62% do vidro.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 13: Leads: formulário em vidro, `LeadCard` em `glass-lite`, campos sólidos

**Files:**
- Modify: `src/app/(app)/leads/page.tsx:132,140,151,163,172`
- Modify: `src/components/lead-card.tsx:79-83`

- [ ] **Step 1: Formulário de busca (`leads/page.tsx` linha 132)**

Antes:
```tsx
        className="mb-6 flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-border bg-surface p-3 shadow-[var(--shadow-sm)]"
```

Depois:
```tsx
        className="glass mb-6 flex flex-wrap items-center gap-2 rounded-[var(--radius)] p-3"
```

- [ ] **Step 2: Os três selects e o rótulo "Máx" ficam sólidos (quatro edits; a mensagem `<p>` da linha 201, também `bg-surface-2`, NÃO muda: está na névoa, não dentro de vidro)**

Edit A (linha 140). Antes: `className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"`
Depois: `className="rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm"`

Edit B (linha 151). Antes: `className="min-w-40 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"`
Depois: `className="min-w-40 flex-1 rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm"`

Edit C (linha 163). Antes: `className="min-w-40 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"`
Depois: `className="min-w-40 rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm"`

Edit D (linha 172, o `<label>` "Máx" é visualmente um input). Antes: `<label className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">`
Depois: `<label className="flex items-center gap-2 rounded-lg border border-border bg-surface-solid px-3 py-2">`

- [ ] **Step 3: `LeadCard` (`lead-card.tsx` linhas 79-83). O selecionado mantém `border-brand ring-2` e ganha `shadow-[var(--shadow-sm)]` explícito porque `ring-2` zera o `box-shadow` do `.glass-lite`; no ramo não selecionado o `border-border` sai e o `hover:border-border-strong` fica**

Antes:
```tsx
      className={`group flex flex-col rounded-2xl border bg-surface p-6 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${
        selectable ? "cursor-pointer" : ""
      } ${
        selected ? "border-brand ring-2 ring-brand/40" : "border-border hover:border-border-strong"
      }`}
```

Depois:
```tsx
      className={`glass-lite group flex flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${
        selectable ? "cursor-pointer" : ""
      } ${
        selected ? "border-brand ring-2 ring-brand/40 shadow-[var(--shadow-sm)]" : "hover:border-border-strong"
      }`}
```

- [ ] **Step 4: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK`.

Run: `grep -n "bg-surface[^-]" "src/app/(app)/leads/page.tsx" src/components/lead-card.tsx; echo "exit=$?"`
Expected: `exit=1`.

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
"$SHOTS/shot.sh" t13-leads-light "http://localhost:3000/leads?theme=light" 1440 900
"$SHOTS/shot.sh" t13-leads-dark "http://localhost:3000/leads?theme=dark" 1440 900
```
Abra com Read. Expected: barra de busca translúcida com selects brancos (escuro: `#161c28`) dentro; cards de lead translúcidos com raio de 22px. Se os dados não chegarem (virtual time), a barra e o estado vazio já bastam; os cards são conferidos no roteiro manual e na captura final.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/leads/page.tsx" src/components/lead-card.tsx
git commit -m "$(cat <<'MSG'
feat(leads): formulário em vidro, cards glass-lite, campos sólidos

O card selecionado repete shadow-sm explicitamente porque ring-2 zera o
box-shadow da classe. Selects e o rótulo "Máx" ficam bg-surface-solid
para não somarem transparência dentro do vidro.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 14: CRM: cards `glass-lite`, busca em vidro com input transparente, selects sólidos

A barra de busca é o input de primeiro nível: o vidro vai no wrapper (`div.relative`), com `focus-within:border-border-strong`, e o `<input>` perde borda, raio, sombra e foco próprios (senão a sombra dobra). O `<select>` "Ordenar" do `PageHeader` está direto na névoa e fica sólido. A lane de drop mantém `border-border/60 bg-surface-2/40`; os chips de filtro e o cabeçalho de coluna não mudam. A "faixa Hoje" ainda não existe (é da spec do CRM): nada a fazer.

**Files:**
- Modify: `src/app/(app)/crm/page.tsx:99,121,127,218,250`

- [ ] **Step 1: Select "Ordenar" (linha 99)**

Antes:
```tsx
                className="rounded-lg border border-border bg-surface py-2 pl-3 pr-8 text-sm font-medium text-muted shadow-[var(--shadow-sm)] outline-none focus:border-border-strong"
```

Depois:
```tsx
                className="rounded-lg border border-border bg-surface-solid py-2 pl-3 pr-8 text-sm font-medium text-muted shadow-[var(--shadow-sm)] outline-none focus:border-border-strong"
```

- [ ] **Step 2: Wrapper da busca (linha 121)**

Antes:
```tsx
      <div className="relative mb-4 max-w-xl">
```

Depois:
```tsx
      <div className="glass relative mb-4 max-w-xl rounded-xl focus-within:border-border-strong">
```

- [ ] **Step 3: Input da busca (linha 127)**

Antes:
```tsx
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-9 text-sm shadow-[var(--shadow-sm)] outline-none placeholder:text-faint focus:border-border-strong"
```

Depois:
```tsx
          className="w-full border-0 bg-transparent py-2.5 pl-10 pr-9 text-sm shadow-none outline-none placeholder:text-faint"
```

- [ ] **Step 4: Card do Kanban (linha 218)**

Antes:
```tsx
                          className={`group cursor-grab rounded-[var(--radius)] border border-border bg-surface p-3.5 shadow-[var(--shadow-sm)] transition-all hover:border-border-strong hover:shadow-[var(--shadow-md)] active:cursor-grabbing ${
```

Depois:
```tsx
                          className={`glass-lite group cursor-grab rounded-[var(--radius)] p-3.5 transition-all hover:border-border-strong hover:shadow-[var(--shadow-md)] active:cursor-grabbing ${
```

- [ ] **Step 5: Select de estágio dentro do card (linha 250)**

Antes:
```tsx
                              className="rounded-md border border-border bg-surface px-1.5 py-1 text-[11px] text-muted"
```

Depois:
```tsx
                              className="rounded-md border border-border bg-surface-solid px-1.5 py-1 text-[11px] text-muted"
```

- [ ] **Step 6: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK`.

Run: `grep -n "bg-surface[^-]" "src/app/(app)/crm/page.tsx"; echo "exit=$?"`
Expected: `exit=1`.

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
"$SHOTS/shot.sh" t14-crm-light "http://localhost:3000/crm?theme=light" 1440 900
"$SHOTS/shot.sh" t14-crm-dark "http://localhost:3000/crm?theme=dark" 1440 900
```
Abra com Read. Expected: barra de busca translúcida com raio 18px e sombra única (não dobrada); select "Ordenar" branco sólido no canto superior direito; lanes em cinza translúcido com cards de vidro dentro (se os dados chegarem).

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/crm/page.tsx"
git commit -m "$(cat <<'MSG'
feat(crm): cards glass-lite, busca em vidro no wrapper, selects sólidos

O input da busca fica transparente e sem borda dentro do wrapper de vidro
(focus-within no wrapper), senão a sombra dobraria. O select de ordenação
está direto na névoa e fica bg-surface-solid.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

## Chunk 3b: superfícies tela a tela (Outreach, Sites, Plans, Settings, drawer, modal, painéis aninhados)

### Task 15: Outreach: wrapper da tabela em vidro

O thead mantém `bg-surface-2/50`; as linhas já são transparentes com `hover:bg-surface-2/40`.

**Files:**
- Modify: `src/app/(app)/outreach/page.tsx:117`

- [ ] **Step 1: Editar**

Antes:
```tsx
          <div className="overflow-x-auto rounded-[var(--radius)] border border-border shadow-[var(--shadow-sm)]">
```

Depois:
```tsx
          <div className="glass overflow-x-auto rounded-[var(--radius)]">
```

- [ ] **Step 2: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK`.

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
"$SHOTS/shot.sh" t15-outreach-light "http://localhost:3000/outreach?theme=light" 1440 900
```
Abra com Read. Expected: a tabela (ou o `EmptyState`, se os dados não chegarem) num bloco translúcido com contorno branco.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/outreach/page.tsx"
git commit -m "$(cat <<'MSG'
feat(outreach): tabela da caixa de saída em vidro

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 16: Sites: cards em vidro

**Files:**
- Modify: `src/app/(app)/sites/page.tsx:74`

- [ ] **Step 1: Editar (o card sobe no hover: sombra vai para `-lg`; `border-border` sai, `hover:border-border-strong` fica)**

Antes:
```tsx
              className="flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)]"
```

Depois:
```tsx
              className="glass flex flex-col rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-lg)]"
```

- [ ] **Step 2: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK`.

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
"$SHOTS/shot.sh" t16-sites-dark "http://localhost:3000/sites?theme=dark" 1440 900
```
Abra com Read. Expected: cards translúcidos com a miniatura escura (`#0c1120`) sólida dentro; o selo "Publicado/Preview" da miniatura continua com seu `backdrop-blur-sm`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/sites/page.tsx"
git commit -m "$(cat <<'MSG'
feat(sites): cards de site em vidro

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 17: Plans: cards em vidro, "Popular" mantém `border-2 border-brand`

O `shadow-[var(--shadow-md)]` do ramo Popular vira no-op (`glass` já descansa em `-md`) e sai; o ramo não Popular era só `border border-border` e sai inteiro.

**Files:**
- Modify: `src/app/(app)/plans/page.tsx:63-67`

- [ ] **Step 1: Editar**

Antes:
```tsx
              className={`relative flex flex-col rounded-[var(--radius)] bg-surface p-6 shadow-[var(--shadow-sm)] ${
                featured
                  ? "border-2 border-brand shadow-[var(--shadow-md)]"
                  : "border border-border"
              }`}
```

Depois:
```tsx
              className={`glass relative flex flex-col rounded-[var(--radius)] p-6 ${
                featured ? "border-2 border-brand" : ""
              }`}
```

- [ ] **Step 2: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK`.

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
"$SHOTS/shot.sh" t17-plans-light "http://localhost:3000/plans?theme=light" 1440 900
"$SHOTS/shot.sh" t17-plans-dark "http://localhost:3000/plans?theme=dark" 1440 900
```
Abra com Read. Expected: três cards translúcidos; o do meio com borda azul de 2px e o selo "Popular" (esta página não depende do Convex para o layout, então renderiza completa).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/plans/page.tsx"
git commit -m "$(cat <<'MSG'
feat(plans): cards de plano em vidro, Popular mantém a borda azul

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 18: Settings: o card único em vidro

Sub-nav e painéis internos já são transparentes ou `bg-surface-2` (`bg-surface-2/40` é alfa de surface-2, permitido).

**Files:**
- Modify: `src/app/(app)/settings/page.tsx:341`

- [ ] **Step 1: Editar**

Antes:
```tsx
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-sm)] md:grid md:grid-cols-[248px_1fr]">
```

Depois:
```tsx
      <div className="glass overflow-hidden rounded-2xl md:grid md:grid-cols-[248px_1fr]">
```

- [ ] **Step 2: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK`.

Run: `grep -n "bg-surface[^-]" "src/app/(app)/settings/page.tsx"; echo "exit=$?"`
Expected: `exit=1`.

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
"$SHOTS/shot.sh" t18-settings-light "http://localhost:3000/settings?theme=light" 1440 900
```
Abra com Read. Expected: um único bloco translúcido com a sub-nav à esquerda (item "Perfil" ativo em `surface-2`) e o painel à direita, divididos pela linha `border-border`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/settings/page.tsx"
git commit -m "$(cat <<'MSG'
feat(settings): card único em vidro

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 19: drawer do lead: `glass-dense`, overlay `/30`, "Perdido" com `text-danger-fg`, blocos sólidos

O drawer fica sobre um overlay escurecido e precisa de vidro mais denso (`--elevated`, 88% no claro). O overlay cai de `bg-black/50` para `bg-black/30`: o contraste de 4,7:1 do `--muted` no claro depende disso. `backdrop-blur-sm` fica. Todo bloco dentro do drawer que era `bg-surface` vira `bg-surface-2`; o vazio do `SiteTab` troca `bg-surface/40` por `bg-surface-2/60`. O botão "Perdido" ativo troca `text-white` por `text-danger-fg` porque `--danger` clareou no escuro (`#ff8a8e`; branco sobre ele daria 2,3:1).

**Files:**
- Modify: `src/components/crm/lead-detail.tsx:78,79,271,396,411,446,498,528`

- [ ] **Step 1: Overlay (linha 78)**

Antes:
```tsx
      <button aria-label="Fechar" onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
```

Depois:
```tsx
      <button aria-label="Fechar" onClick={onClose} className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
```

- [ ] **Step 2: Painel do drawer (linha 79). `overflow-hidden` entra para o canto arredondado não vazar conteúdo rolado; o corpo já tem `overflow-y-auto` próprio**

Antes:
```tsx
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-[var(--shadow-lg)]">
```

Depois:
```tsx
      <div className="glass-dense relative z-10 flex h-full w-full max-w-xl flex-col overflow-hidden rounded-l-2xl">
```

- [ ] **Step 3: Botão "Perdido" (linha 271)**

Antes:
```tsx
            className={`border-l border-border px-4 py-1.5 text-xs font-semibold transition-colors ${status === "lost" ? "bg-danger text-white" : "text-muted hover:bg-surface-2"}`}
```

Depois:
```tsx
            className={`border-l border-border px-4 py-1.5 text-xs font-semibold transition-colors ${status === "lost" ? "bg-danger text-danger-fg" : "text-muted hover:bg-surface-2"}`}
```

- [ ] **Step 4: Vazio do `SiteTab` (linha 396)**

Antes:
```tsx
      <div className="rounded-2xl border border-dashed border-border-strong bg-surface/40 px-6 py-12 text-center">
```

Depois:
```tsx
      <div className="rounded-2xl border border-dashed border-border-strong bg-surface-2/60 px-6 py-12 text-center">
```

- [ ] **Step 5: Bloco do preview no `SiteTab` (linha 411)**

Antes:
```tsx
      <div className="rounded-xl border border-border bg-surface p-4">
```

Depois:
```tsx
      <div className="rounded-xl border border-border bg-surface-2 p-4">
```

- [ ] **Step 6: `ObjectionCard` e `ClosingCard` (linhas 446 e 528, string idêntica: use `replace_all`)**

Antes:
```tsx
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
```

Depois:
```tsx
    <div className="overflow-hidden rounded-xl border border-border bg-surface-2">
```

- [ ] **Step 7: Passos do roteiro de reunião no `SaleTab` (linha 498)**

Antes:
```tsx
            <div key={s.n} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
```

Depois:
```tsx
            <div key={s.n} className="flex gap-3 rounded-xl border border-border bg-surface-2 p-4">
```

- [ ] **Step 8: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK`.

Run: `grep -n "bg-surface[^-]\|bg-background\|text-white\|bg-black/50" src/components/crm/lead-detail.tsx`
Expected: uma única linha, a 500, `text-white` no número do passo do roteiro (é `bg` colorido por `STEP_COLOR`, não `bg-danger`; fica). Nada de `bg-surface` nu, `bg-background` ou `/50`.

O drawer só abre com clique: fica no roteiro manual (Tarefa 29). Confira ao menos que o CRM segue renderizando:

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/crm`
Expected: `200`.

- [ ] **Step 9: Commit**

```bash
git add src/components/crm/lead-detail.tsx
git commit -m "$(cat <<'MSG'
feat(crm): drawer do lead em glass-dense, overlay mais leve, Perdido legível

Overlay de /50 para /30 (o 4,7:1 do texto muted no claro depende disso).
Blocos internos passam a bg-surface-2 (nunca vidro dentro de vidro). O
botão "Perdido" ativo usa text-danger-fg porque --danger clareou no
escuro e branco sobre ele daria 2,3:1.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 20: modal de criar lead: `glass-dense`, overlay `/30`, campos sólidos

**Files:**
- Modify: `src/components/crm/create-lead-modal.tsx:28,105,107`

- [ ] **Step 1: `fieldCls` (linha 28)**

Antes:
```tsx
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-border-strong";
```

Depois:
```tsx
  "w-full rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-border-strong";
```

- [ ] **Step 2: Overlay (linha 105)**

Antes:
```tsx
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
```

Depois:
```tsx
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
```

- [ ] **Step 3: Caixa do modal (linha 107)**

Antes:
```tsx
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-lg)]">
```

Depois:
```tsx
      <div className="glass-dense relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl">
```

- [ ] **Step 4: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK`.

Run: `grep -n "bg-surface[^-]\|bg-black/50" src/components/crm/create-lead-modal.tsx; echo "exit=$?"`
Expected: `exit=1`.

O modal é portalado para `document.body`, que continua dentro de `:root:has(.app-shell)`: os tokens valem. Abre só com clique: roteiro manual.

- [ ] **Step 5: Commit**

```bash
git add src/components/crm/create-lead-modal.tsx
git commit -m "$(cat <<'MSG'
feat(crm): modal de criar lead em glass-dense com campos sólidos

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 21: painéis aninhados sempre sólidos

`CallScriptPanel`, `OutreachComposer`, `ContactOptInButton` e `WhatsAppFollowup` nunca são primeiro nível (vivem no `LeadCard`, no card do Kanban ou no drawer). Regras aplicadas: input/select/textarea dentro de vidro é `bg-surface-solid`; bloco que já está dentro de um `bg-surface-2` (as raízes de `CallScriptPanel` e `ComposerBody` são `bg-surface-2`) usa `bg-surface-solid`, senão some no pai: `Note` tom "info", `ScriptColumn`, o `<p>` do trecho citado, o chip de idioma e a caixa "Tradução indisponível". Os `hover:bg-surface` dos botões dentro dessas raízes ficam (62% de branco sobre `surface-2`: visível, aceito pela spec).

**Files:**
- Modify: `src/components/call-script-panel.tsx:90,128,156,256,308`
- Modify: `src/components/outreach-composer.tsx:43,96,232,241`
- Modify: `src/components/contact-opt-in-button.tsx:67,82`
- Modify: `src/components/whatsapp-followup.tsx:54,93`

- [ ] **Step 1: `call-script-panel.tsx` (cinco edits)**

Edit A (linha 90, `Note` tom info). Antes: `          : "border-dashed border-border bg-surface text-muted"`
Depois: `          : "border-dashed border-border bg-surface-solid text-muted"`

Edit B (linha 128, trecho citado). Antes: `            <p className="whitespace-pre-wrap break-words rounded border border-warm/30 bg-surface px-1.5 py-1 font-mono text-[10px] text-ink-soft">`
Depois: `            <p className="whitespace-pre-wrap break-words rounded border border-warm/30 bg-surface-solid px-1.5 py-1 font-mono text-[10px] text-ink-soft">`

Edit C (linha 156, `ScriptColumn`). Antes: `    <div className="space-y-1 rounded-md border border-border bg-surface p-2">`
Depois: `    <div className="space-y-1 rounded-md border border-border bg-surface-solid p-2">`

Edit D (linha 256, chip de idioma). Antes: `            <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">`
Depois: `            <span className="rounded-full border border-border bg-surface-solid px-2 py-0.5 text-[10px] font-semibold text-muted">`

Edit E (linha 308, caixa "Tradução indisponível"). Antes: `            <div className="flex items-start gap-1.5 rounded-md border border-dashed border-border bg-surface p-2 text-[10px] leading-relaxed text-muted">`
Depois: `            <div className="flex items-start gap-1.5 rounded-md border border-dashed border-border bg-surface-solid p-2 text-[10px] leading-relaxed text-muted">`

- [ ] **Step 2: `outreach-composer.tsx` (quatro edits)**

Edit A (linha 43, `Note` tom info). Antes: `        : "border-dashed border-border bg-surface text-muted";`
Depois: `        : "border-dashed border-border bg-surface-solid text-muted";`

Edit B (linha 96, trecho citado). Antes: `            <p className="whitespace-pre-wrap break-words rounded border border-warm/30 bg-surface px-1.5 py-1 font-mono text-[10px] text-ink-soft">`
Depois: `            <p className="whitespace-pre-wrap break-words rounded border border-warm/30 bg-surface-solid px-1.5 py-1 font-mono text-[10px] text-ink-soft">`

Edit C (linha 232, assunto). Antes: `        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm font-medium"`
Depois: `        className="w-full rounded-md border border-border bg-surface-solid px-2 py-1.5 text-sm font-medium"`

Edit D (linha 241, corpo). Antes: `        className="w-full resize-y rounded-md border border-border bg-surface px-2 py-1.5 text-sm"`
Depois: `        className="w-full resize-y rounded-md border border-border bg-surface-solid px-2 py-1.5 text-sm"`

- [ ] **Step 3: `contact-opt-in-button.tsx` (dois edits)**

Edit A (linha 67, select). Antes: `        className="w-full rounded-md border border-border bg-surface px-2 py-1 text-[11px]"`
Depois: `        className="w-full rounded-md border border-border bg-surface-solid px-2 py-1 text-[11px]"`

Edit B (linha 82, input). Antes: `          className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] placeholder:text-faint"`
Depois: `          className="flex-1 rounded-md border border-border bg-surface-solid px-2 py-1 text-[11px] placeholder:text-faint"`

- [ ] **Step 4: `whatsapp-followup.tsx` (dois edits)**

Edit A (linha 54, select). Antes: `            className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px]"`
Depois: `            className="flex-1 rounded-md border border-border bg-surface-solid px-2 py-1 text-[11px]"`

Edit B (linha 93, textarea). Antes: `        className="w-full resize-y rounded-md border border-border bg-surface px-2 py-1 text-[11px]"`
Depois: `        className="w-full resize-y rounded-md border border-border bg-surface-solid px-2 py-1 text-[11px]"`

- [ ] **Step 5: Verificar**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK`.

Run: `grep -n "bg-surface[^-]" src/components/call-script-panel.tsx src/components/outreach-composer.tsx src/components/contact-opt-in-button.tsx src/components/whatsapp-followup.tsx`
Expected: exatamente três linhas, todas `hover:bg-surface`: `call-script-panel.tsx:264`, `outreach-composer.tsx:252`, `outreach-composer.tsx:264`.

Estes painéis abrem com clique dentro do card ou do drawer: roteiro manual.

- [ ] **Step 6: Commit**

```bash
git add src/components/call-script-panel.tsx src/components/outreach-composer.tsx src/components/contact-opt-in-button.tsx src/components/whatsapp-followup.tsx
git commit -m "$(cat <<'MSG'
refactor(ui): painéis aninhados sólidos dentro do vidro

Campos viram bg-surface-solid; blocos que já estão dentro de uma raiz
bg-surface-2 (nota info, coluna do script, trecho citado, chip de idioma)
também, senão somem no pai. Os hover:bg-surface dos botões ficam: 62% de
branco sobre surface-2 é visível.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

## Chunk 4: verificação, limpeza e entrega

### Task 22: capturas finais "depois" (área logada, landing, site público)

Feitas ANTES de remover o gancho `?theme=` (o escuro depende dele).

**Não rodar `convex run demo:seed` entre a Tarefa 6 (baseline) e esta**: o seed recria a org (`clearOrg`) e `/site/[slug]` pode mudar por dado, o que faria a prova de escopo da Tarefa 23 dar falso "DIFERENTE". Se `/leads` vier vazio, é o websocket sob tempo virtual, não falta de seed. Ruído conhecido nas capturas da área logada: o badge do Next DevTools (canto inferior esquerdo) muda se houver `console.error` do websocket; não é token.

Antes de começar, rodar `./node_modules/.bin/next build` uma vez e guardar a saída em `$S/build-baseline.txt` (o estado de partida não tem build verde registrado em modo demo; a Tarefa 26 compara contra isso).

- [ ] **Step 1: 28 capturas da área logada**

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
"$SHOTS/shot-app.sh" depois
ls "$SHOTS"/depois-*.png | wc -l
```
Expected: `28`.

- [ ] **Step 2: Olhar todas as 14 de 1440 (claro e escuro) com Read, uma a uma, lado a lado com a `antes-` correspondente**

Checklist por página (registre qualquer desvio no report):
- `dashboard`: 4 StatCards + painéis translúcidos; cards de taxa em `surface-2` dentro do painel.
- `leads`: barra de busca em vidro com selects sólidos; `EmptyState` tracejado translúcido (ou cards `glass-lite`).
- `crm`: busca em vidro, select "Ordenar" sólido, lanes translúcidas.
- `outreach`: bloco da tabela (ou `EmptyState`) em vidro.
- `sites`: cards em vidro (ou `EmptyState`).
- `plans`: três cards em vidro, "Popular" com borda azul de 2px.
- `settings`: card único em vidro.
- Em todas: rail flutuando com margem, sem header, título sem borda, névoa visível entre os blocos; no escuro a névoa é azul-marinho e o texto `muted` está legível.

- [ ] **Step 3: Olhar as 14 de 390 com Read**

Expected: rail + conteúdo estreito, sem layout móvel (fora do escopo); o Kanban rola horizontalmente como antes. Nada quebrado além do que já era assim nas `antes-*-390`.

- [ ] **Step 4: Landing e site público, claro e escuro (para a prova de igualdade da Tarefa 23)**

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
SLUG=de-gouden-lepel-bv-d0
for t in light dark; do
  "$SHOTS/shot.sh" final-landing-$t-1440 "http://localhost:3000/?theme=$t" 1440 900
  "$SHOTS/shot.sh" final-landing-$t-alta "http://localhost:3000/?theme=$t" 1440 5000
  "$SHOTS/shot.sh" final-site-$t-1440 "http://localhost:3000/site/$SLUG?theme=$t" 1440 900
  "$SHOTS/shot.sh" final-site-$t-alta "http://localhost:3000/site/$SLUG?theme=$t" 1440 3000
done
ls "$SHOTS"/final-*.png | wc -l
```
Expected: `8`.

Sem commit.

### Task 23: prova do escopo: landing e preview iguais ao baseline pós-preparação

**Files:** nenhum.

- [ ] **Step 1: Comparação byte a byte**

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
for f in landing-light-1440 landing-light-alta landing-dark-1440 landing-dark-alta site-light-1440 site-light-alta site-dark-1440 site-dark-alta; do
  if cmp -s "$SHOTS/base-$f.png" "$SHOTS/final-$f.png"; then echo "$f: idêntico"; else echo "$f: DIFERENTE"; fi
done
```
Expected: 8 linhas `idêntico`.

- [ ] **Step 2: Se alguma disser DIFERENTE, recapture só aquela e compare de novo (uma vez); se persistir, meça**

Sem ImageMagick nem PIL na máquina. Converta para BMP (sem compressão) com o `sips` do macOS e conte os bytes diferentes:

```bash
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
f=landing-light-alta   # o que diferiu
sips -s format bmp "$SHOTS/base-$f.png" --out "$SHOTS/base-$f.bmp" >/dev/null
sips -s format bmp "$SHOTS/final-$f.png" --out "$SHOTS/final-$f.bmp" >/dev/null
echo "bytes diferentes: $(cmp -l "$SHOTS/base-$f.bmp" "$SHOTS/final-$f.bmp" | wc -l | tr -d ' ') de $(stat -f%z "$SHOTS/base-$f.bmp")"
```

Abra as duas com Read. Uma diferença de tokens (cor de fundo, raio, sombra) aparece como área grande; ruído de antialias é pontual. Só siga se a diferença NÃO for atribuível a token; qualquer mudança de cor/raio/sombra na landing é bug de escopo (algum token fora de `:root:has(.app-shell)`, ou `@theme inline` sem fallback): corrija no `globals.css`, commite como `fix(css)` e refaça a Tarefa 22.

- [ ] **Step 3: Registrar no report**

Uma linha: "landing e /site/[slug] byte-idênticos ao baseline pós-preparação (claro e escuro)", ou o que foi encontrado.

### Task 24: remover o gancho temporário `?theme=`

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Voltar o script inline ao original**

Remova as constantes `THEME_INIT` e `THEME_QUERY_HOOK` (e o comentário "TEMPORÁRIO") e troque:

Antes:
```tsx
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT + THEME_QUERY_HOOK }} />
```

Depois:
```tsx
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
```

- [ ] **Step 2: Verificar que o arquivo voltou exatamente ao que era antes da Tarefa 5**

Run: `git diff 755a321 -- src/app/layout.tsx | wc -l | tr -d ' '`
Expected: `0` (nenhuma diferença contra o commit anterior ao gancho; `755a321` é o HEAD de partida do plano e nenhuma tarefa antes da 5 toca `layout.tsx`). Não usar `git log --grep` aqui: se não achar o commit, o `~1` solto faz o `wc` imprimir `0` sem provar nada.

Run: `grep -c "URLSearchParams" src/app/layout.tsx`
Expected: `0`.

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "$(cat <<'MSG'
chore(dev): remove o gancho temporário ?theme= dos screenshots

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 25: auditoria final por grep

**Files:** nenhum (só leitura). Cada item é um comando com o resultado esperado; qualquer desvio é bloqueio até ser justificado ou corrigido.

- [ ] **Step 1: `bg-surface` nu que sobrou (fora `landing/`)**

Run:
```bash
cd /Users/madu/Developer/mine/osprano
grep -rn "bg-surface[^-]" "src/app/(app)" src/components src/app/sign-in src/app/sign-up | grep -v "src/components/landing/"
```
Expected: exatamente estas três linhas, todas `hover:bg-surface` em botões dentro de uma raiz `bg-surface-2` (62% de branco sobre `surface-2`: visível, aceito pela spec 5):
- `src/components/call-script-panel.tsx:264` (botão "Fechar" do painel de script)
- `src/components/outreach-composer.tsx:252` (botão "Copiar")
- `src/components/outreach-composer.tsx:264` (botão "Marcar enviado")

Nenhum em `<input>`, `<select>` ou `<textarea>`. Cole a lista com a justificativa no report.

- [ ] **Step 2: `bg-surface/NN` (o alfa comporia com os 62% e ficaria invisível)**

Run: `grep -rn "bg-surface/" "src/app/(app)" src/components src/app/sign-in src/app/sign-up | grep -v "src/components/landing/"; echo "exit=$?"`
Expected: `exit=1`.

- [ ] **Step 3: `bg-background` e `bg-black/50` na área logada**

Run: `grep -rn "bg-background\|bg-black/50" "src/app/(app)" src/components | grep -v "src/components/landing/"; echo "exit=$?"`
Expected: `exit=1`.

- [ ] **Step 4: nenhum `glass` cujo ancestral também seja `glass`**

Run: `grep -rn "glass" "src/app/(app)" src/components src/app/sign-in src/app/sign-up | grep -v "src/components/landing/"`
Expected: exatamente 16 linhas, os 15 lugares abaixo (sign-in e sign-up são duas linhas), nenhum deles dentro de outro:

| Arquivo | Classe | Contêiner (não é vidro) |
|---|---|---|
| `sidebar.tsx` `<nav>` | `glass` | `div.app-shell` |
| `ui.tsx` `StatCard` | `glass` | grid do Dashboard, na névoa |
| `ui.tsx` `EmptyState` | `glass` | página, na névoa |
| `charts.tsx` `ChartCard` | `glass` | página, na névoa |
| `leads/page.tsx` `<form>` | `glass` | página |
| `lead-card.tsx` | `glass-lite` | grid de Leads |
| `crm/page.tsx` wrapper da busca | `glass` | página |
| `crm/page.tsx` card do Kanban | `glass-lite` | lane `bg-surface-2/40` |
| `outreach/page.tsx` wrapper da tabela | `glass` | página |
| `sites/page.tsx` card | `glass` | grid |
| `plans/page.tsx` card | `glass` | grid |
| `settings/page.tsx` card | `glass` | página |
| `lead-detail.tsx` drawer | `glass-dense` | overlay `fixed` |
| `create-lead-modal.tsx` caixa | `glass-dense` | overlay, portalado em `body` |
| `sign-in` e `sign-up` wrapper | `glass` | `div.app-shell` (duas linhas) |

Confira em especial: `CallScriptPanel`, `WhatsAppFollowup`, `ContactOptInButton` e `OutreachComposer` não aparecem na lista (sempre sólidos), e `LeadCard`/card do Kanban não contêm nada `glass`.

- [ ] **Step 5: `text-white` sobre `bg-danger`**

Run: `grep -rn "bg-danger" "src/app/(app)" src/components | grep -v "src/components/landing/"`
Expected: exatamente duas linhas: `lead-detail.tsx:271` (botão "Perdido") já com `text-danger-fg`, e `outreach-composer.tsx:40` com `bg-danger/10` (tinte de fundo do `Note` tom "stop", texto `text-ink-soft`: não é o caso do botão, fica).

- [ ] **Step 6: `will-change` em lugar nenhum da área logada (spec 4.2)**

Run: `grep -rn "will-change" "src/app/(app)" src/components | grep -v "src/components/landing/"; echo "exit=$?"`
Expected: `exit=1`.

Run: `grep -n "will-change" src/app/globals.css`
Expected: exatamente duas linhas, as pré-existentes do sistema de movimento da landing (`[data-reveal]` e `.rail-pulse::after`; os números de linha mudam com as inserções da Chunk 1, não conferir por número). Nenhuma nas classes `glass*`.

- [ ] **Step 7: `backdrop-filter`/`backdrop-blur` só onde a spec permite**

Run: `grep -rn "backdrop-blur\|backdrop-filter" src/app/globals.css "src/app/(app)" src/components | grep -v "src/components/landing/"`
Expected: `globals.css` (só nas classes `glass*` e no `@media` de transparência reduzida), `lead-detail.tsx:78` e `create-lead-modal.tsx:105` (overlays `backdrop-blur-sm`, pré-existentes), `sites/page.tsx:42` (selo do `SiteThumb`, pré-existente) e `preview-site.tsx:47` (header do preview público, `backdrop-blur-md`, fora do escopo). Nada além disso.

### Task 26: typecheck, lint, testes e build de produção

- [ ] **Step 1: Typecheck e lint**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK`.

- [ ] **Step 2: Testes**

Run: `node --experimental-strip-types --test tests/*.test.ts 2>&1 | tail -8`
Expected: `ℹ tests 191`, `ℹ pass 191`, `ℹ fail 0`.

- [ ] **Step 3: Build de produção**

Run: `NEXT_PUBLIC_DEMO=1 ./node_modules/.bin/next build 2>&1 | tail -30`
Expected: compila sem erro e lista as rotas (13 rotas, conforme `SETUP.md`). O dev server usa `.next/dev`, então pode continuar de pé; se o build reclamar de lock, pare o `next dev`, builde e suba de novo.

Se falhar SÓ por chave do Clerk ausente ao pré-renderizar `/sign-in` ou `/sign-up`, é ambiente (não há `.env` do Clerk nesta máquina), não o redesenho: registre a saída literal no report e siga. Qualquer outro erro (CSS, TypeScript, import) é bloqueio: corrija e refaça.

- [ ] **Step 4: Estado do git**

Run: `git status --short`
Expected: vazio (o build só escreve em `.next/`, ignorado).

### Task 27: commitar os screenshots finais em `docs/redesign/`

Só os "depois" em 1440, claro e escuro (14 PNGs), para o README.

**Files:**
- Create: `docs/redesign/<pagina>-<tema>.png` (14 arquivos)

- [ ] **Step 1: Copiar com nomes limpos**

```bash
cd /Users/madu/Developer/mine/osprano
SHOTS=/private/tmp/claude-501/-Users-madu/b16b2cfb-9aa3-4eb3-9281-1ceb4aabcb03/scratchpad/redesign
mkdir -p docs/redesign
for p in dashboard leads crm outreach sites plans settings; do
  for t in light dark; do
    cp "$SHOTS/depois-$p-$t-1440.png" "docs/redesign/$p-$t.png"
  done
done
ls docs/redesign | wc -l && du -sh docs/redesign
```
Expected: `14` e um total de poucos MB (se passar de 10 MB, algo foi capturado em altura errada; confira).

- [ ] **Step 2: Commit**

```bash
git add docs/redesign
git commit -m "$(cat <<'MSG'
docs(redesign): screenshots finais da área logada em 1440, claro e escuro

Capturas headless em modo demo (Convex pode não ter entregado dados sob
tempo virtual; servem para tokens e layout).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

### Task 28 (condicional): recuos de desempenho da spec 4.2

Só executar se a Duda reportar, no roteiro manual da Tarefa 29, engasgo visível no Chrome do Mac. Dois gatilhos independentes; aplique só o que foi acionado, e registre a decisão em `docs/LESSONS.md`.

**Files:**
- Modify (gatilho A): `src/app/globals.css`
- Modify (gatilho B): `src/app/(app)/crm/page.tsx:218`
- Modify: `docs/LESSONS.md` (nova entrada na seção "Ambiente")

- [ ] **Gatilho A: a entrada de página engasga (o `animate-rise` move todos os vidros por 0,5 s e reamostra o backdrop por frame). Dentro de `.app-shell` a entrada passa a só opacidade**

Em `globals.css`, logo após a regra `.animate-rise { ... }`:

```css
/* Recuo (spec 4.2): dentro da área logada a entrada só anima opacidade. O translate
   reamostrava o backdrop-filter de cada card de vidro a cada frame. */
@keyframes rise-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.app-shell .animate-rise {
  animation-name: rise-fade;
}
```

E, dentro do bloco `@media (prefers-reduced-motion: reduce)` já existente, acrescente `.app-shell .animate-rise` ao seletor que desliga a animação (a regra nova tem especificidade (0,2,0) e venceria o `animation: none` de `.animate-rise` sem isso):

Antes:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-rise,
  .animate-pulse-ring,
```

Depois:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-rise,
  .app-shell .animate-rise,
  .animate-pulse-ring,
```

- [ ] **Gatilho B: arrastar um card do Kanban com os 51 leads engasga. O card de lead do CRM volta a sólido; só a barra de busca fica em vidro**

Antes (`crm/page.tsx` linha 218, como ficou na Tarefa 14):
```tsx
                          className={`glass-lite group cursor-grab rounded-[var(--radius)] p-3.5 transition-all hover:border-border-strong hover:shadow-[var(--shadow-md)] active:cursor-grabbing ${
```

Depois:
```tsx
                          className={`group cursor-grab rounded-[var(--radius)] border border-border bg-surface-solid p-3.5 shadow-[var(--shadow-sm)] transition-all hover:border-border-strong hover:shadow-[var(--shadow-md)] active:cursor-grabbing ${
```

(O `LeadCard` de `/leads` não é arrastado; só entra no recuo se a Duda reportar engasgo lá também, com a mesma troca `glass-lite` por `border border-border bg-surface-solid shadow-[var(--shadow-sm)]` e, no ramo não selecionado, `border-border hover:border-border-strong`.)

- [ ] **Registrar em `docs/LESSONS.md`, ao fim da seção "Ambiente"**

```markdown
**Vidro (backdrop-filter) em lista longa engasga ao arrastar/animar**
`sintoma:` arrastar um card do Kanban (51 leads) ou a entrada de página trava
frames no Chrome do Mac depois do redesenho "vidro sobre névoa".
`causa:` cada elemento com backdrop-filter reamostra o fundo a cada frame em
que algo se move por cima ou ele próprio se move (translate do drag, do
hover e do animate-rise). Dezenas de vidros vezes 60 fps não fecha.
`fix:` vidro só no primeiro nível e nunca em item de lista que se move: o
card do Kanban voltou a bg-surface-solid (spec 4.2), e/ou a entrada de
página dentro de .app-shell anima só opacidade. Antes de pôr glass num
item repetido, teste arrastando com o seed de 51 leads.
```

- [ ] **Verificar e commitar (um commit por gatilho acionado)**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint && echo OK`
Expected: `OK`.

```bash
git add src/app/globals.css "src/app/(app)/crm/page.tsx" docs/LESSONS.md   # só os que mudaram
git commit -m "$(cat <<'MSG'
perf(ui): recuo do vidro onde o backdrop-filter engasgava

Ver docs/LESSONS.md. Gatilho da spec 4.2 acionado no roteiro manual.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

Se nenhum gatilho foi acionado, esta tarefa não produz commit nem entrada em `LESSONS.md`.

### Task 29: roteiro manual (Duda, no navegador; não executável pelo agente)

Entregar esta lista no report, junto dos caminhos dos screenshots. Cada item é sim/não.

Com o demo (`NEXT_PUBLIC_DEMO=1`, `http://localhost:3000`):

- [ ] Alternar o tema pelo botão do rail: claro vira névoa azul-acinzentada, escuro vira azul-marinho (não grafite); nada "pula" de posição.
- [ ] `/crm`: arrastar um card entre colunas com os 51 leads. A imagem fantasma do drag HTML5 de um elemento com `backdrop-filter` costuma sair sem blur e semitransparente no Chrome: aceitável, desde que dê para ver qual card está sendo arrastado. Se engasgar visivelmente: Tarefa 28, gatilho B.
- [ ] Navegar entre as páginas: se a entrada (`animate-rise`) engasgar: Tarefa 28, gatilho A.
- [ ] `/crm`: abrir o drawer de um lead (vidro denso, overlay leve, cantos esquerdos arredondados) e, por cima, "Criar lead" (modal em vidro denso com campos brancos/sólidos). Nas abas do drawer: blocos internos em cinza sólido, nunca transparentes.
- [ ] Drawer > Informações > Status: clicar em "Perdido" e conferir o texto legível sobre o vermelho (branco no claro, quase-preto no escuro).
- [ ] `/plans`: o card "Popular" com borda azul de 2px nos dois temas.
- [ ] `/leads`: selecionar um lead e ver o anel azul mais a borda azul (e a sombra do card não some).
- [ ] `/leads` aba "Ligação primeiro": abrir "Script de ligação" e "Registrar consentimento" num card: caixas e campos sólidos dentro do card de vidro.
- [ ] macOS > Ajustes > Acessibilidade > Tela > "Reduzir transparência": os vidros ficam opacos com contorno cinza e sem blur; desligar depois.
- [ ] Contraste com o conta-gotas (spec 4.1), nos dois temas, em card, drawer e modal: `--muted` sobre o vidro deve ficar em torno de 4,7:1 (claro) e 4,6:1 (escuro); registrar se ficar abaixo de 4,5:1.
- [ ] Decisão do commit preparatório: comparar `prep-antes-*` com `prep-depois-*` (landing e `/site/[slug]`) e aceitar, ou não, as bordas que passaram a valer.

Em modo real (quando ligar o Clerk):

- [ ] `/sign-in` e `/sign-up`: névoa no fundo, formulário do Clerk dentro de um cartão de vidro com raio 22px.
- [ ] `<UserButton />` na base do rail abre o popover a partir dali e o popover não fica cortado.
