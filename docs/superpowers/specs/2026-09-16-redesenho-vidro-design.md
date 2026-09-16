# Redesenho visual: vidro sobre névoa

**Data:** 2026-09-16 · **Status:** aprovado em conversa, aguardando plano
**Referência:** dashboard "minimal new tab" (Pinterest) mostrado pela Duda: cards
translúcidos com blur, cantos bem redondos, sombras suaves, sidebar de ícones flutuando,
paleta azul-acinzentada, muito respiro.

## Decisões (escolhidas com mockups no navegador)

- **Direção B: vidro sobre névoa.** Cards translúcidos com blur sobre um fundo abstrato
  azul-acinzentado. Foto de paisagem (direção A) descartada: disputa atenção com
  dezenas de cards e o contraste varia com a imagem. Sólido sem blur (C) descartado:
  perde a "flutuação" que motivou o pedido.
- **Sidebar B: rail de 72px com ícone e nome embaixo.** Só ícones (A) exige decorar;
  a sidebar atual em vidro (C) fica longe da leveza da referência.
- **Escuro A: névoa azul-marinho**, o claro invertido. Grafite (B) descartado por
  parecer outra app ao alternar o tema.
- **Landing e páginas públicas ficam de fora** (`/`, `/p/[token]`, `/site/[slug]`).
  Como os tokens são globais e a landing consome `bg-surface`, `bg-border`,
  `--radius` e `--shadow-*`, os valores novos são **escopados** (seção 1.0); sem
  isso a landing mudaria junto.
- **Implementação A: tokens + classe `glass`.** Um componente `<Panel>` (B) seria
  refactor grande demais; sobrescrever `bg-surface` globalmente (C) empilha vidro
  sobre vidro e o texto some.
- **Ordem:** este redesenho vem **antes** do bloco A da spec
  `2026-09-16-crm-fluxo-e-informacao-design.md`, para os componentes novos do CRM
  nascerem no estilo novo.

## Commit preparatório: a regra `* { border-color }` fora de camada

`globals.css` tem `* { border-color: var(--border) }` **fora de qualquer `@layer`**.
Estilo sem camada vence estilo em camada, independente de especificidade, e o
Tailwind v4 põe todos os utilitários em `@layer utilities`. Resultado, verificado
compilando o CSS real e renderizando: **nenhum utilitário de cor de borda do repo
funciona hoje**. `border-brand` do card "Popular", `border-brand` do `LeadCard`
selecionado, `border-transparent` das abas do drawer, `border-hot/30` dos badges,
tudo renderiza `#e2e6ef`. É bug pré-existente, e sem corrigi-lo o vidro também não
teria a borda branca (`--glass-border` seria ignorado).

Correção (a que o guia de upgrade do Tailwind v4 prescreve): mover a regra para
`@layer base { * { border-color: var(--border) } }`. É um commit **separado, antes**
do redesenho, com screenshot da landing antes/depois: a landing tem 22 usos de
`border-brand`, `border-white/10`, `border-transparent` etc. hoje suprimidos e vai
mudar onde essas bordas eram intencionais. O mesmo vale para as páginas públicas de
preview: `preview-site.tsx` (`/p/[token]`, `/site/[slug]`) tem 6 `border-white/10` e
`border-white/25` que hoje saem cinza opaco sobre fundo escuro e passam a ser brancas
sutis. A Duda vê o antes/depois de `/` e de `/site/[slug]` (seed) e decide se
aceita; o redesenho é comparado contra essa nova base.

Outra regra sem camada, `:focus-visible { outline: none; box-shadow: var(--ring);
border-radius: 8px }`, vence utilitários do mesmo jeito (num card focado troca o raio
por 8px e o `ring` pelo `--ring`). Pré-existente, fora de escopo; registrado para
ninguém debugar isso na verificação.

## Fora do escopo

Landing e páginas públicas de preview (só o efeito colateral do commit preparatório
as toca), o formulário interno do Clerk (só o container muda), sidebar responsiva/mobile (a app hoje não tem layout móvel na área logada e
isso não muda aqui), troca de fontes, ícones ou paleta de marca. O uso de
`text-faint` em texto real (rótulo do StatCard, thead do outbox, títulos de seção do
drawer) já está abaixo de AA hoje; não é este trabalho que introduz, nem corrige.

---

## 1. Tokens (`src/app/globals.css`)

### 1.0 Escopo

Os valores novos ficam sob `:root:has(.app-shell)` (claro) e
`:root[data-theme="dark"]:has(.app-shell)` (escuro). O `(app)/layout.tsx` renderiza
o contêiner externo com `className="app-shell …"`; as páginas de login idem no
`div` que centraliza. Como os tokens vivem em `:root`, o que é portalado para
`document.body` (`CreateLeadModal`; o `LeadDetail` renderiza inline com `fixed`)
continua dentro do escopo. A landing e as páginas públicas não têm `.app-shell` e
ficam com os tokens de hoje.

Cascata: `:root:has(.app-shell)` (0,2,0) vem **depois** de `:root[data-theme="dark"]`
(0,2,0) no arquivo, então vence no escuro para qualquer token que definir. Regra:
todo token do bloco claro escopado que tenha valor escuro precisa ser repetido no
bloco escuro escopado, e um token que só muda no escuro (`--muted`) **só** entra no
bloco escuro escopado.

O `body` só recebe a névoa sob o mesmo escopo:
`:root:has(.app-shell) body { background-image: var(--mist) }`.

### 1.1 Fundo (`--mist`)

| Tema | `--background` (hoje → novo) | `--mist` (três manchas radiais, nesta ordem, cada uma até `transparent`) |
|---|---|---|
| claro | `#f4f6fa` → `#eef2f9` | `60% 50% at 20% 10%` `#dfe8ff` → transparent 60%; `50% 45% at 85% 20%` `#e9eef8` → 60%; `60% 60% at 60% 100%` `#d6e2f5` → 65% |
| escuro | `#0b0e15` → `#0f1522` | `60% 50% at 20% 10%` `#1d2f5a` → 60%; `50% 45% at 85% 20%` `#1a2740` → 60%; `60% 60% at 60% 100%` `#17305e` → 65% |

`background-attachment: fixed` como já é. O brilho radial atual do `body` sai dentro
do escopo (fora dele, na landing, continua).

### 1.2 Superfícies, bordas, raio, sombra

| Token | Claro (hoje → novo) | Escuro (hoje → novo) |
|---|---|---|
| `--surface` | `#ffffff` → `rgba(255,255,255,.62)` | `#141a24` → `rgba(255,255,255,.07)` |
| `--surface-solid` (novo) | `#ffffff` | `#161c28` |
| `--surface-2` | `#eef1f7` (mantém) | `#1d2531` (mantém) |
| `--elevated` | `#ffffff` → `rgba(255,255,255,.88)` | `#18202b` → `rgba(255,255,255,.10)` |
| `--border` | `#e2e6ef` (**mantém**) | `#28313f` (**mantém**) |
| `--glass-border` (novo) | `rgba(255,255,255,.9)` | `rgba(255,255,255,.12)` |
| `--border-strong` | mantém | mantém |
| `--muted` | `#656d7e` (mantém) | `#8a93a4` → `#a3abbb` |
| `--cold` | mantém | `#8a93a4` → `#a3abbb` |
| `--hot` | mantém | `#f2725a` → `#ff8f78` |
| `--danger` | mantém | `#f0645f` → `#ff8a8e` |
| `--danger-fg` (novo) | `#ffffff` | `#14171d` |
| `--radius` | `14px` → `18px` | idem |
| `--radius-panel` (novo, **só no bloco escopado**, não no `@theme`) | `22px` | idem |
| `--shadow-sm` | → `0 4px 14px rgba(30,45,80,.06)` | → `0 4px 14px rgba(0,0,0,.25)` |
| `--shadow-md` | → `0 10px 30px rgba(30,45,80,.08)` | → `0 10px 30px rgba(0,0,0,.35)` |
| `--shadow-lg` | → `0 24px 60px rgba(30,45,80,.14)` | → `0 24px 60px rgba(0,0,0,.5)` |
| `--glass-blur` (novo) | `16px` | `16px` |
| `--glass-blur-lite` (novo) | `12px` | `12px` |

Por que cada um:
- `--border` **não muda**: é o divisor interno em todo lugar (`* { border-color }`,
  `Row`, `border-t` em cards, linhas de tabela, lane do Kanban, borda dos inputs). A
  borda branca translúcida é só do vidro, em `--glass-border`.
- `--elevated` passa a ser usado: drawer e modais ficam sobre um overlay escurecido
  (`bg-black/30`) e precisam de vidro mais denso que os cards. 88% no claro porque a
  78% o `--muted` sobre overlay + vidro media 4,3:1 (falha); a 88% dá ≈ 4,7:1.
- No escuro, o pior caso não é a base `#0f1522` e sim a mancha `#1d2f5a`: 7% de
  branco sobre ela dá ≈ `#2d3e66`. Sobre isso, `--muted` e `--cold` (`#8a93a4`)
  medem 3,4:1, `--hot` 3,7:1 e `--danger` (`#f0645f`) 3,4:1, todos abaixo de AA e
  todos usados como texto (erros, ações atrasadas, badges). Os valores novos medem
  `#a3abbb` 4,6:1, `#ff8f78` 4,7:1, `#ff8a8e` 4,7:1. Só no bloco escuro escopado.
- `--danger-fg` existe porque clarear `--danger` derruba o único `bg-danger
  text-white` da app (botão "Perdido" ativo do drawer, `lead-detail.tsx`): branco
  sobre `#ff8a8e` = 2,3:1. O botão passa a `text-danger-fg` (escuro `#14171d`,
  7,9:1), espelhando o `--brand-fg` que o botão "Ganho" ao lado já usa. No claro
  `--danger-fg` é branco, nada muda.
- **Badges de tier no escuro: regressão consciente.** O `Badge` (`ui.tsx`) é
  `text-X` sobre `bg-X/10`, e o tinte de 10% clareia o fundo. Sobre a mancha, hoje
  (superfície sólida) hot 5,4 / cold 4,9 / danger 5,0; com vidro e valores novos
  hot 4,1 / cold 3,9 / danger 4,0 / warm 4,5. Passar 4,5 exigiria tons pastel
  (`#b8c0cd`, `#ffa694`, `#ffa3a7`) que lavam os tiers. Aceito com os números;
  se incomodar, a saída é um tinte próprio do Badge no escuro (`bg-X/6`), trabalho
  à parte.
- **`--brand` como texto no escuro fica em 3,0:1 e é aceito assim**, com registro:
  clarear o azul quebraria o botão (`bg-brand` com texto branco já está em 3,5:1 e
  cairia para 2,5:1). O uso de `text-brand` como texto pequeno (rótulos de 11px do
  `LeadCard`, links) é pré-existente. A correção certa é um token `--brand-text`
  separado, trocando os `text-brand`; fica como trabalho à parte.
- `--radius-panel` fica fora do `@theme inline` porque precisa ser **escopada**
  (variável de `@theme` é global em `:root`); no `@theme inline` só `--radius-2xl` a
  referencia. E não se chama `--radius-lg` porque esse nome lá sobrescreveria o
  `rounded-lg` do Tailwind (52 usos em botões e inputs).

No `@theme inline`: ganha `--color-surface-solid: var(--surface-solid)` e
`--radius-2xl: var(--radius-panel, 1rem)`. O fallback `1rem` (o default do Tailwind)
passa intacto pelo `@theme inline`: na landing, onde `--radius-panel` não existe,
`rounded-2xl` continua 16px; na área logada vira 22px (assim `rounded-2xl`, já usado
em card de lead, sites, modal e lane do Kanban, não fica **menor** que o `rounded-xl`
de 18px). `--radius-xl` continua `var(--radius)`.

Marca (`--brand*`), `--warm`, `--foreground`, `--ink-soft`, `--faint`, fontes e
`--ring` **não mudam**. No claro, nenhuma cor de texto muda. O `@theme inline` ganha
`--color-danger-fg`.

### 1.3 Classe `glass`

Em `@layer components` (não `@utility`): compilado no repo, um `@utility` com várias
declarações sai **depois** de `border-2`, `border-brand`, `border-dashed`, `ring-2` e
`shadow-[…]`, e venceria o card "Popular" de Plans, o estado selecionado do
`LeadCard` e os `border-dashed` de vazio. Em `@layer components` os utilitários
passam por cima. Depende do commit preparatório: com a regra `*` fora de camada, o
`--glass-border` seria ignorado.

Consequência: qualquer `border-border` que sobrar num elemento `glass` vence o
`--glass-border`. Nos quatro cards onde ele aparece junto do `hover:border-border-strong`
(`LeadCard` no ramo não selecionado, card de Sites e card do CRM inline), o
`border-border` **sai** e o `hover:border-border-strong` fica. Em Plans, o ramo não
Popular é só `border border-border` e sai inteiro.

```css
@layer components {
  .glass {
    background: var(--surface);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-md);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
  }
  .glass-lite {            /* itens em lista longa: card de lead */
    background: var(--surface);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-sm);
    backdrop-filter: blur(var(--glass-blur-lite));
    -webkit-backdrop-filter: blur(var(--glass-blur-lite));
  }
  .glass-dense {           /* drawer e modais, sobre overlay */
    background: var(--elevated);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-lg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
  }
}
```

Raio não entra na classe: cada uso escolhe `rounded-xl` (18px) ou `rounded-2xl`
(22px). Hover em card que "sobe" (StatCard, ChartCard): `hover:shadow-[var(--shadow-lg)]`
(o `-md` do hover atual vira no-op porque `glass` já descansa em `-md`).

### 1.4 Preferências do sistema

```css
@media (prefers-reduced-transparency: reduce) {
  :root:has(.app-shell) {
    --surface: rgba(255,255,255,.96); --elevated: #fff; --glass-border: var(--border);
  }
  :root[data-theme="dark"]:has(.app-shell) {
    --surface: rgba(22,28,40,.97); --elevated: #1d2531; --glass-border: var(--border);
  }
  .glass, .glass-lite, .glass-dense { backdrop-filter: none; -webkit-backdrop-filter: none; }
}
```

`--glass-border` cai para `--border` para os cards opacos não ficarem sem contorno.
`backdrop-filter: none` em vez de `blur(0px)`: zero ainda cria backdrop root e custa
compositing. Este bloco `@media` vem **depois** dos blocos escopados de 1.0 no
arquivo (mesma especificidade; a ordem decide).
Sem suporte no Firefox (só Chrome 118+ e Safari); registrado, sem ação.
`prefers-reduced-motion` já é tratado (`.animate-rise` desligado); não muda.

---

## 2. Casca (shell)

### 2.1 Layout (`src/app/(app)/layout.tsx`)

- O `<header>` de 56px com borda **some**, e com ele a pílula "modo demo" e o
  `<UserButton />` desse lugar (os dois vão para a base do rail, 2.2). Não há
  elemento fixo no canto superior direito: esse canto é do `action` do `PageHeader`
  (no CRM, o select de ordenação e "Criar lead").
- Contêiner externo: `className="app-shell flex h-dvh"`.
- `<main>`: `flex-1 overflow-auto p-6` (era `p-8`), sem fundo próprio.

### 2.2 Rail (`src/components/sidebar.tsx`)

Substitui a `<nav>` de 240px:

- `<nav>` de **72px**, `glass rounded-2xl`, `m-4 mr-0` (sem `h-full`: o `flex` do
  pai já estica; com `h-full` + margem estoura o `h-dvh` em 32px), coluna,
  `items-center`, `py-4 px-2`, `gap-1`.
- Topo: `<Logo />` (o SVG atual, 26px) dentro de um `<Link href="/dashboard"
  aria-label="Osprano">`. Sem o texto "Osprano" nem "compliant by design".
- Itens do `NAV` (os mesmos 5 hrefs): coluna, ícone 22px em cima, nome em
  `text-[11px] font-medium` embaixo, `rounded-xl px-1 py-2 w-full text-center`.
  Rótulos: "Início", "Leads", "CRM", "Outreach", "Sites" ("Meus Projetos" não cabe;
  a página mantém o título atual). Ativo: `bg-brand-soft text-brand`; inativo:
  `text-muted hover:bg-surface-2/60`. `NavItem` **ganha** `aria-current="page"`
  quando ativo (hoje não tem).
- Base (`mt-auto`), na ordem: `SettingsButton` no mesmo formato dos itens (ícone +
  "Ajustes" visível, **sem** `aria-label="Configurações"`, que divergiria do texto;
  `aria-current` quando em `/settings`), `ThemeToggle` (como é), e por
  último: em modo real `<UserButton />` do Clerk; em modo demo um chip `DEMO`
  (`font-mono text-[9px] bg-surface-2 rounded-full px-2 py-0.5`).
- **`UsageFooter` é apagado.** Plano e uso já existem na aba "Plano & uso" de
  Settings (`PlanPanel`, mesmo `useQuery(api.workspaces.current)`, mesmos botões
  para `/plans`); a sidebar deixa de importar `api`.

### 2.3 Título das páginas (`PageHeader` em `src/components/ui.tsx`)

Conteúdo não muda. Sai `border-b border-border pb-6`; `mb-8` vira `mb-6`. Fica
direto na névoa, sem vidro.

### 2.4 Login (`src/app/sign-in/[[...sign-in]]/page.tsx`, `sign-up`)

O `<div>` que centraliza ganha `className="app-shell …"` (assim recebe névoa e
tokens) e o `<SignIn />`/`<SignUp />` fica dentro de um `glass rounded-2xl p-2`. O
formulário do Clerk não muda.

---

## 3. Superfícies, tela por tela

**Regra:** `glass` (ou `-lite`/`-dense`) só no **primeiro nível**: o bloco que
encosta na névoa ou no overlay. Dentro de um vidro tudo é sólido:
- `bg-surface-solid`: input, select, textarea, dropdown (inclui o `fieldCls` de
  `create-lead-modal.tsx` e os selects do formulário de Leads, que hoje usam
  `bg-surface-2`). **Exceção:** quando o input **é** o bloco de primeiro nível
  (barra de busca do CRM), o vidro vai num wrapper e o input fica `bg-transparent
  border-0 shadow-none`; do `<input>` saem `border border-border`, `rounded-xl`,
  `shadow-[var(--shadow-sm)]` e `focus:border-border-strong` (que vira
  `focus-within:` no wrapper), senão a sombra dobra.
- `bg-surface-2`: chips, blocos internos, `contact-opt-in-button.tsx`, cabeçalhos
  de tabela (`bg-surface-2/50`).
- **Bloco que já está dentro de um `bg-surface-2` usa `bg-surface-solid`**, senão
  some no pai. Casos: `Note` tom "info" (`CallScriptPanel` e `ComposerBody` têm raiz
  `bg-surface-2`), `ScriptColumn`, o `<p>` do trecho citado, o chip de idioma e a
  caixa "Tradução indisponível" do `call-script-panel.tsx`; o `<label>` "Máx" de
  Leads (é visualmente um input).
- Linhas de tabela dentro de vidro: **transparentes**, mantendo `hover:bg-surface-2/40`.
- Nunca `glass` dentro de `glass`. `CallScriptPanel`, `WhatsAppFollowup`,
  `ContactOptInButton` e `OutreachComposer` **nunca** são primeiro nível (vivem em
  `LeadCard`, no card do Kanban ou no drawer): sempre sólidos.

Padrão de troca: `border border-border bg-surface shadow-[var(--shadow-sm|md)]` →
`glass`. `rounded-xl`/`rounded-[var(--radius)]`/`rounded-2xl` mantêm.

| Tela / componente | Vidro | Sólido |
|---|---|---|
| `ui.tsx` `StatCard` | `glass`, hover `shadow-lg` | |
| `ui.tsx` `EmptyState` | `glass` (o `border-dashed border-border-strong` continua vencendo por ser utilitário; `bg-surface/40` sai) | |
| `charts.tsx` `ChartCard` | `glass`, hover `shadow-lg` (é o painel do Dashboard) | |
| Dashboard (`dashboard/page.tsx`) | nada além dos `StatCard`/`ChartCard` | cards de taxa dentro do painel → `bg-surface-2` |
| Leads (`leads/page.tsx`, `lead-card.tsx`) | formulário de busca `glass`; cada `LeadCard` `glass-lite` (o selecionado mantém `border-brand ring-2` **e** `shadow-[var(--shadow-sm)]` explícito, porque `ring-2` zera o `box-shadow` do `.glass-lite`) | selects e "Máx" → `bg-surface-solid` |
| CRM (`crm/page.tsx`) | cada card de lead `glass-lite`; barra de busca: o `div.relative` em volta vira `glass rounded-xl focus-within:border-border-strong` e o `<input>` dentro fica `bg-transparent border-0`; a faixa Hoje, quando existir | `<select>` "Ordenar" do `action` (é primeiro nível sobre a névoa) → `bg-surface-solid`; select de estágio, chips de filtro; lane de drop mantém `border-border/60 bg-surface-2/40`; cabeçalho de coluna sem fundo (já é) |
| Outreach (`outreach/page.tsx`) | o wrapper da tabela do outbox `glass` (hoje sem fundo) | thead `bg-surface-2/50` (como é), linhas transparentes |
| Sites (`sites/page.tsx`) | cada card de site `glass` | |
| Plans (`plans/page.tsx`) | cada card de plano `glass` (o "Popular" mantém `border-2 border-brand`) | |
| Settings (`settings/page.tsx`) | o card único (sub-nav + painel) `glass` | sub-nav e painéis internos → transparentes/`bg-surface-2` |
| `lead-detail.tsx` (drawer) | `glass-dense rounded-l-2xl`; overlay hoje `bg-black/50` → `bg-black/30` (o 4,7:1 do drawer claro depende disso), `backdrop-blur-sm` fica | abas, blocos → `bg-surface-2`; vazio do SiteTab `bg-surface/40 border-dashed` → `bg-surface-2/60 border-dashed` |
| `create-lead-modal.tsx` | `glass-dense rounded-2xl`; overlay igual ao drawer (`/50` → `/30`) | inputs `bg-surface-solid` |
| `lead-detail.tsx` botão "Perdido" ativo | | `bg-danger text-danger-fg` (era `text-white`) |

Interações mantêm o que existe (`animate-rise`, `hover:-translate-y-0.5`).

---

## 4. Acessibilidade e desempenho

### 4.1 Contraste (WCAG 2.x, pior caso = mancha mais escura/clara)

- Claro: vidro a 62% sobre `#d6e2f5` ≈ `#f0f4fa`. `--foreground #14171d` ≈ 15:1;
  `--muted #656d7e` ≈ 4,7:1. AA.
- Escuro: 7% de branco sobre a mancha `#1d2f5a` ≈ `#2d3e66`. `--foreground` ≈ 8,7:1;
  `--muted`/`--cold` novos ≈ 4,6:1; `--hot` e `--danger` novos ≈ 4,7:1; `--warm` 5,3:1.
  AA, exceto `--brand` como texto (3,0:1) e os badges de tier (3,9 a 4,1), ambos
  aceitos e registrados em 1.2.
- Pré-existente, nos dois temas: `--hot/--warm/--cold/--danger` como texto no claro
  já falham hoje sobre branco (3,7 / 2,8 / 3,7 / 3,9) e o vidro tira ≈ 0,3. Fica
  junto do `text-faint` em "Fora do escopo": o "AA" acima é de `--foreground` e
  `--muted`.
- Drawer e modal no claro: overlay `bg-black/30` sobre a mancha mais escura e vidro a
  88% dá ≈ `#f2f3f5`; `--muted` ≈ 4,7:1. No escuro ≈ 5,1:1.
- Reconferir cards, drawer e modal, nos dois temas, no screenshot com o conta-gotas
  antes de fechar.

### 4.2 Blur

- `backdrop-filter` só nas três classes `glass*` e nos overlays de drawer/modal
  (`backdrop-blur-sm`, já existe; o selo do `SiteThumb` também já tem e fica).
- Custo aceito, registrado: os cards de vidro mantêm `hover:-translate-y-0.5` e o
  `animate-rise` do wrapper move todos os vidros por 0,5 s a cada navegação, o que
  reamostra o backdrop de cada card por frame. Se engasgar na verificação (51 cards
  em `/leads` e `/crm`), o `animate-rise` dentro de `.app-shell` vira só opacidade.
- Card de lead usa `glass-lite` (12px). **Gatilho de recuo:** se arrastar um card com
  os 51 leads do seed engasgar visivelmente (Chrome, Mac), o card de lead passa a
  `bg-surface-solid` com `shadow-sm` e só a barra de busca (e a faixa Hoje, quando
  existir) ficam em vidro. A decisão fica registrada em `docs/LESSONS.md`.
- Sem `will-change` em lugar nenhum.

---

## 5. Verificação

- **Screenshots headless** (Chrome já cacheado em
  `~/Library/Caches/ms-playwright/chromium_headless_shell-*`), modo demo, de
  `/dashboard`, `/leads`, `/crm`, `/outreach`, `/sites`, `/plans`, `/settings`:
  claro e escuro (`data-theme`), 1440px e 390px. Antes e depois, lado a lado, eu
  olho todas. `/sign-in` **não** entra no headless (em demo não há `ClerkProvider`
  e o `<SignIn />` quebra); fica no roteiro manual. Ficam em `docs/redesign/` só as
  "depois" em 1440 (claro e escuro), para o README.
- **Roteiro manual** (Duda, no navegador): alternar tema; arrastar card no CRM com o
  seed de 51 leads (a imagem fantasma do drag HTML5 de um elemento com
  `backdrop-filter` costuma sair sem blur e semitransparente no Chrome: aceitável,
  mas conferir que dá pra ver qual card está sendo arrastado); abrir o drawer do lead e o modal de criar lead por cima; card
  "Popular" em Plans com borda azul; selecionar um lead em Leads e ver o anel;
  ativar "reduzir transparência" no macOS e conferir vidro opaco com contorno. Em
  modo real (quando ligar): `<UserButton />` abre o popover a partir do rail; abrir
  `/sign-in`.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` verdes. Nenhuma lógica muda; os 191
  testes continuam iguais.
- Grep final: listar todo `bg-surface` e `hover:bg-surface` nu que sobrar em
  `src/app/(app)` e `src/components` (fora `landing/`) e justificar um a um; nenhum
  em input/select/textarea; nenhum `glass` cujo ancestral também seja `glass`;
  nenhum `bg-surface/NN` (o alfa compõe com os 62% e fica invisível). Os
  `hover:bg-surface` de botões dentro de raiz `bg-surface-2` (`outreach-composer.tsx`,
  `call-script-panel.tsx`) viram "62% de branco sobre surface-2": visível, aceito.
- Landing e preview: screenshots de `/` e `/site/[slug]` **depois do commit
  preparatório** e depois do redesenho, iguais (prova do escopo 1.0). O antes/depois
  do próprio commit preparatório são outros dois pares, que a Duda avalia.
