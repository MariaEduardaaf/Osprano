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
  Só telas logadas em `src/app/(app)/` e as de login.
- **Implementação A: tokens + utilitário `glass`.** Um componente `<Panel>` (B) seria
  refactor grande demais; sobrescrever `bg-surface` globalmente (C) empilha vidro
  sobre vidro e o texto some.
- **Ordem:** este redesenho vem **antes** do bloco A da spec
  `2026-09-16-crm-fluxo-e-informacao-design.md`, para os componentes novos do CRM
  nascerem no estilo novo.

## Fora do escopo

Landing, páginas públicas de preview, o formulário interno do Clerk (só o container
muda), sidebar responsiva/mobile (a app hoje não tem layout móvel na área logada e
isso não muda aqui), troca de fontes, ícones ou paleta de marca.

---

## 1. Tokens (`src/app/globals.css`)

### 1.1 Fundo

O `body` deixa de ter o brilho radial atual e passa a ter a névoa. Continua
`background-attachment: fixed`.

| Tema | `--background` | Manchas radiais (por cima, nesta ordem) |
|---|---|---|
| claro | `#eef2f9` | `60% 50% at 20% 10%` `#dfe8ff`; `50% 45% at 85% 20%` `#e9eef8`; `60% 60% at 60% 100%` `#d6e2f5`; cada uma até `transparent` em 60 a 65% |
| escuro | `#0f1522` | `60% 50% at 20% 10%` `#1d2f5a`; `50% 45% at 85% 20%` `#1a2740`; `60% 60% at 60% 100%` `#17305e` |

As manchas ficam num token `--mist` (valor completo do `background-image`), usado
pelo `body` e pelas páginas de login.

### 1.2 Superfícies e bordas

| Token | Claro (hoje → novo) | Escuro (hoje → novo) |
|---|---|---|
| `--surface` | `#ffffff` → `rgba(255,255,255,.62)` | `#141a24` → `rgba(255,255,255,.07)` |
| `--surface-solid` (novo) | `#ffffff` | `#161c28` |
| `--surface-2` | `#eef1f7` (mantém) | `#1d2531` (mantém) |
| `--elevated` | `#ffffff` → `rgba(255,255,255,.78)` | (hoje) → `rgba(255,255,255,.10)` |
| `--border` | `#e2e6ef` → `rgba(255,255,255,.9)` | `#28313f` → `rgba(255,255,255,.12)` |
| `--border-strong` | `#ccd2e0` (mantém) | `#3a4657` (mantém) |
| `--radius` | `14px` → `18px` | idem |
| `--radius-lg` (novo) | `22px` (rail, drawer, modais, painéis grandes) | idem |
| `--shadow-sm` | → `0 4px 14px rgba(30,45,80,.06)` | → `0 4px 14px rgba(0,0,0,.25)` |
| `--shadow-md` | → `0 10px 30px rgba(30,45,80,.08)` | → `0 10px 30px rgba(0,0,0,.35)` |
| `--shadow-lg` | → `0 24px 60px rgba(30,45,80,.14)` | → `0 24px 60px rgba(0,0,0,.5)` |
| `--glass-blur` (novo) | `16px` | `16px` |

`--surface-solid` existe porque `--surface` vira translúcido: tudo que precisa ser
opaco (inputs, dropdowns, linhas de tabela) passa a usar `bg-surface-solid`. O
`@theme inline` ganha `--color-surface-solid` e `--radius-lg`.

Marca (`--brand*`), semânticas (`--hot`, `--warm`, `--cold`, `--danger`), texto
(`--foreground`, `--ink-soft`, `--muted`, `--faint`), fontes e `--ring` **não mudam**.

### 1.3 Utilitário `glass`

Tailwind v4, em `globals.css`:

```css
@utility glass {
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
}
@utility glass-lite {  /* itens em lista longa: card de lead */
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

Raio não entra no utilitário: cada uso escolhe `rounded-xl` (18px) ou
`rounded-[var(--radius-lg)]` (22px).

### 1.4 Preferências do sistema

```css
@media (prefers-reduced-transparency: reduce) {
  :root { --surface: rgba(255,255,255,.96); --elevated: #fff; --glass-blur: 0px; }
  :root[data-theme="dark"] { --surface: rgba(22,28,40,.97); --elevated: #1d2531; }
}
```

`prefers-reduced-motion` já é tratado (`.animate-rise` desligado); não muda.

---

## 2. Casca (shell)

### 2.1 Layout (`src/app/(app)/layout.tsx`)

- O `<header>` de 56px com borda **some**.
- O conteúdo do header (pílula "modo demo" ou `<UserButton />`) vai para um
  `<div className="fixed right-6 top-4 z-40">` em pílula `glass rounded-full`.
- `<main>`: padding `p-6` (era `p-8`), `overflow-auto`, sem fundo próprio (a névoa
  do `body` aparece).
- O contêiner externo continua `flex h-dvh`; o rail entra com `m-4 mr-0`.

### 2.2 Rail (`src/components/sidebar.tsx`)

Substitui a `<nav>` de 240px:

- `<nav>` de **72px**, `glass rounded-[var(--radius-lg)]`, `m-4 mr-0`, coluna,
  `items-center`, `py-4 px-2`, `gap-1`.
- Topo: `<Logo />` (o SVG atual, 26px), sem texto "Osprano" nem "compliant by
  design". `aria-label="Osprano"` no link do logo (leva ao `/dashboard`).
- Itens do `NAV` (os mesmos 5): coluna, ícone 22px em cima, nome em `text-[10px]
  font-medium` embaixo, `rounded-xl px-1 py-2 w-full`. Rótulos: "Início", "Leads",
  "CRM", "Outreach", "Sites" ("Meus Projetos" não cabe em 72px; a página continua
  com o título atual). Ativo: `bg-brand-soft text-brand`; inativo: `text-muted
  hover:bg-surface-2/60`. Cada `<Link>` mantém `aria-current="page"` quando ativo.
- Base (`mt-auto`), na ordem: `SettingsButton` (ícone + "Ajustes", mesmo formato dos
  itens), `ThemeToggle` (como é), avatar: `<UserButton />` do Clerk ou, no demo, a
  bolinha "N" atual.
- **`UsageFooter` sai daqui** (ver 2.4).

### 2.3 Título das páginas (`PageHeader` em `src/components/ui.tsx`)

Não muda de conteúdo. Perde a linha divisória inferior (`border-b`), se houver, e
ganha `mb-6`. Fica direto na névoa, sem vidro.

### 2.4 Plano em Settings (`src/app/(app)/settings/page.tsx`)

O conteúdo do `UsageFooter` (plano, `leadsUsed/limits.leads`, barra, botão "Gerenciar
plano"/"Fazer upgrade" → `/plans`) vira o **primeiro card** da página de Settings,
`glass rounded-xl p-5`, com o mesmo `useQuery(api.workspaces.current)`. O componente
é extraído para `src/components/plan-card.tsx` e o `sidebar.tsx` deixa de importar
`api`.

### 2.5 Login (`src/app/sign-in/[[...sign-in]]/page.tsx`, `sign-up`)

O `<div>` que centraliza ganha `style={{ backgroundImage: "var(--mist)" }}` e o
`<SignIn />`/`<SignUp />` fica dentro de um `glass rounded-[var(--radius-lg)] p-2`.
O formulário do Clerk não muda.

---

## 3. Superfícies, tela por tela

**Regra:** `glass` só no **primeiro nível** (o bloco que encosta na névoa). Dentro de
um vidro, tudo é sólido: `bg-surface-solid` para inputs, selects, dropdowns e linhas
de tabela; `bg-surface-2` para chips, células de destaque e faixas internas. Nunca
`glass` dentro de `glass`.

Padrão de troca: `border border-border bg-surface shadow-[var(--shadow-sm)]` (e
variantes com `-md`) → `glass`; `rounded-[var(--radius)]`/`rounded-xl` mantêm
(`--radius` agora é 18px).

| Tela / componente | Vidro (`glass`) | Sólido |
|---|---|---|
| `ui.tsx` `StatCard` | o card | |
| `ui.tsx` `EmptyState` | o bloco | |
| Dashboard (`dashboard/page.tsx`) | cada painel (taxas, funil, temperatura, atividade) | cards de taxa dentro do painel → `bg-surface-2` |
| Leads (`leads/page.tsx`, `lead-card.tsx`) | formulário de busca; cada `LeadCard` com `glass-lite` | inputs/selects do formulário |
| CRM (`crm/page.tsx`) | cada card de lead com `glass-lite`; barra de busca | select de estágio, chips de filtro; **cabeçalho de coluna sem fundo** |
| Outreach (`outreach/page.tsx`, `outreach-composer.tsx`) | painel do composer; o bloco da tabela/outbox | linhas da tabela, textarea |
| Sites (`sites/page.tsx`) | cada card de site | |
| Plans (`plans/page.tsx`) | cada card de plano | |
| Settings (`settings/page.tsx`) | cada seção (incluindo o `PlanCard` novo) | inputs |
| `lead-detail.tsx` (drawer) | o drawer inteiro, `rounded-l-[var(--radius-lg)]`; overlay `bg-black/30 backdrop-blur-sm` | abas, blocos internos → `bg-surface-2` |
| `create-lead-modal.tsx` | o modal, `rounded-[var(--radius-lg)]`; overlay igual ao drawer | inputs |
| `call-script-panel.tsx`, `whatsapp-followup.tsx` | quando são bloco de primeiro nível na tela; dentro do drawer, `bg-surface-2` | |
| `charts.tsx` | não muda (vive dentro dos painéis) | |

Interações mantêm o que existe (`hover:` com `shadow-md`, `animate-rise`).

---

## 4. Acessibilidade e desempenho

### 4.1 Contraste (verificado na spec, reconferido no screenshot)

- Claro: vidro a 62% sobre a mancha mais escura (`#d6e2f5`) dá fundo efetivo
  ≈ `#f0f4fa`. `--foreground #14171d` ≈ 15:1; `--muted #656d7e` ≈ 4,6:1. OK (AA).
- Escuro: 7% de branco sobre `#0f1522` ≈ `#1f2533`. `--foreground` do escuro ≈ 14:1;
  `--muted` do escuro ≥ 4,5:1. Se o valor atual de `--muted` escuro ficar abaixo de
  4,5:1 sobre esse fundo, ele é clareado até passar (medir no plano).
- `--faint` continua só em rótulos decorativos e ícones, como hoje.

### 4.2 Blur

- `backdrop-filter` só em `glass`/`glass-lite`. Nada de blur em elemento que anima
  (`animate-rise` fica no wrapper do `main`, que não é vidro).
- Card de lead usa `glass-lite` (12px). **Gatilho de recuo:** se arrastar um card com
  50+ leads no Kanban engasgar visivelmente na verificação (Chrome, Mac), o card de
  lead passa a `bg-surface-solid` com sombra e só a barra de busca e a faixa Hoje
  ficam em vidro. A decisão fica registrada em `docs/LESSONS.md`.
- Sem `will-change` em lugar nenhum.

---

## 5. Verificação

- **Screenshots headless** (Chrome já cacheado em
  `~/Library/Caches/ms-playwright/chromium_headless_shell-*`), modo demo, de
  `/dashboard`, `/leads`, `/crm`, `/outreach`, `/sites`, `/plans`, `/settings`,
  `/sign-in`: claro e escuro (`data-theme`), 1440px e 390px. Antes e depois, lado a
  lado, eu olho todas. Ficam em `docs/redesign/` só as "depois" em 1440 (claro e
  escuro), para o README.
- **Roteiro manual** (Duda, no navegador): alternar tema; arrastar card no CRM com o
  seed de 51 leads; abrir o drawer do lead e o modal de criar lead por cima; abrir
  `/sign-in` sem demo (só o container, sem precisar logar); ativar "reduzir
  transparência" no macOS e conferir que o vidro fica opaco.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` verdes. Nenhuma lógica muda, então os
  191 testes devem continuar iguais.
- Grep final: nenhum `bg-surface ` (translúcido) em input/select/textarea; nenhum
  `glass` aninhado (buscar `glass` dentro de arquivo e conferir o pai).
