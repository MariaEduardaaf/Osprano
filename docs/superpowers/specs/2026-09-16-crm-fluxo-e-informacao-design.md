# CRM: fluxo do dia e informação do lead

**Data:** 2026-09-16 · **Status:** aprovado em conversa, aguardando plano

## Problema

O CRM hoje é um Kanban que mostra o funil, mas não diz **o que fazer hoje**. Um lead
sem próxima ação some no meio dos outros; um lead parado há semanas parece igual a um
lead novo. E o lead guarda só o que o Google Places entrega: falta quem atende, quanto
vale o negócio, por que foi perdido, e o que já foi conversado.

Uso: **uma pessoa** (a Duda), dezenas de leads ativos. Sem equipe, sem atribuição.

## Decisões

- **Uma próxima ação por lead**, guardada no próprio documento do lead. Não há tabela
  de tarefas. (Alternativa descartada: tabela `tasks` com várias ações e recorrência;
  só compensa com equipe.)
- **Notas são eventos**: entram na tabela `events` que já registra o que o sistema
  faz (email enviado, preview aberto, mudança de estágio). O histórico é uma consulta
  só, por lead. (Alternativa descartada: tabela `notes`, que só duplicaria a fonte.)
- **O estágio `lost` já existe** no schema e em `PIPELINE_STAGES`; o Kanban o filtra
  (`COLUMNS = PIPELINE_STAGES.filter(s => s.id !== "lost")`). Este trabalho o expõe e
  passa a exigir motivo.
- **Reunião fica fora.** `meetingAt`/`meetingNote` e `leads.schedule` existem só no
  backend; nenhuma tela marca ou mostra reunião. A próxima ação **não** lê
  `meetingAt`. Quando a agenda ganhar UI, ela entra como caso da próxima ação.
- **"Hoje" é calculado no navegador**, a partir do `leads.list` que o Kanban já
  carrega. Não há query de servidor para a faixa: evita divergência de fuso entre
  servidor (UTC) e cliente, e uma query que não reexecuta quando o relógio vira.
- Moeda **derivada do país**, sem campo: GB → GBP, SE → SEK, NO → NOK, CH → CHF, DK →
  DKK, resto → EUR. Uma função pura em `convex/lib/domain.ts`.
- **"Parado" conta a partir de `stageUpdatedAt`**, não do último evento. Um lead com
  nota recente mas sem mudar de estágio aparece parado. Decisão consciente: é o
  estágio que mede avanço, e ler eventos por lead na listagem custaria uma consulta
  extra por card.

## Fora do escopo

Dashboard com pipeline em €, exportação, lembrete por email/push, várias ações por
lead, recorrência, atribuição a pessoa, UI de reunião. Envio por WhatsApp não gera
evento hoje (`convex/whatsapp.ts` grava só em `outreach`), então **não aparece no
Histórico**; registrar o evento lá é trabalho à parte.

## Ordem de implementação

Dois blocos, o segundo só depois do primeiro verificado:

- **Bloco A (fluxo):** schema + domínio + `setNextAction`/`clearNextAction`/
  `postponeNextAction` + faixa Hoje + linha no card + filtro Parados + ordenação.
- **Bloco B (informação):** Perdido com motivo + contato/valor + Histórico com notas
  + refactor do glyph de evento.

---

## 1. Dados (Convex)

### 1.1 Schema: `leads` ganha campos opcionais

| Campo | Tipo | Significado |
|---|---|---|
| `nextActionAt` | `number` | timestamp da próxima ação (meia-noite local do dia escolhido) |
| `nextActionNote` | `string` | texto livre ("ligar de novo", "mandar proposta") |
| `contactName` | `string` | pessoa que atende |
| `contactRole` | `string` | cargo dela |
| `dealSetup` | `number` | valor único, na moeda do país |
| `dealMonthly` | `number` | mensalidade, na moeda do país |
| `lostReason` | `"too_expensive" \| "has_site" \| "no_response" \| "not_interested" \| "other"` | motivo fixo |
| `lostNote` | `string` | complemento livre |

Todos opcionais: lead existente continua válido sem migração. `nextActionAt` e
`nextActionNote` andam juntos (setar um seta o outro; limpar limpa os dois).

Leads já em `lost` **sem** `lostReason` existem (seed atual, e qualquer lead perdido
antes desta mudança). Toda tela que mostra motivo trata ausência (seção 3).

### 1.2 Schema: `events`

- `type` ganha o literal `"note"`. `meta` de uma nota: `{ text: string }`.
- Índice novo `by_lead: ["leadId", "at"]` para o histórico por lead.
- `events.recent` (feed do Dashboard) **exclui** `type === "note"`: nota é comentário
  privado, o feed é atividade do sistema. Filtro em memória depois do `take`, com
  `take(30)` para compensar.

### 1.3 Domínio puro (`convex/lib/domain.ts`, testes em `tests/crm-domain.test.ts`)

| Função | Contrato |
|---|---|
| `currencyForCountry(code)` | `"GB"→"GBP"`, `"SE"→"SEK"`, `"NO"→"NOK"`, `"CH"→"CHF"`, `"DK"→"DKK"`, qualquer outro → `"EUR"` |
| `formatMoney(amount, currency)` | `340, "EUR"` → `"€340"`; `"GBP"` → `"£340"`; `"SEK"`/`"NOK"`/`"DKK"` → `"340 kr"`; `"CHF"` → `"CHF 340"`. Sem centavos (arredonda); milhar com ponto (`"€1.200"`) |
| `nextActionOf(lead)` | `{ at, note }` se `nextActionAt` existe, senão `null` |
| `actionStatus(at, now)` | `"overdue"` (antes de hoje 00:00 local), `"today"` (mesmo dia civil local), `"upcoming"` |
| `daysBetween(a, b)` | dias civis inteiros entre dois timestamps, fuso local (usado para "há N dias") |
| `stalledDays(lead, now)` | `daysBetween(stageUpdatedAt, now)` **só** quando `nextActionOf(lead) === null` e o estágio não é `converted` nem `lost`; senão `null` |
| `STALLED_AFTER_DAYS` | `7` |
| `isStalled(lead, now)` | `stalledDays(lead, now) !== null && >= STALLED_AFTER_DAYS` |
| `compareByNextAction(a, b)` | com ação antes de sem ação; entre com ação, `at` crescente; entre sem ação, score decrescente |
| `LOST_REASONS` | `{ id, label }[]` na ordem: Caro demais · Já tem site · Sem resposta · Não quer · Outro |
| `lostReasonLabel(id)` | rótulo, ou `undefined` para `id` ausente |

Todas recebem `now` quando dependem do relógio. "Dia civil local" = fuso do processo
que chama (o navegador, no caso da UI).

### 1.4 Mutations (`convex/leads.ts`)

Todas seguem o padrão existente: `requireOrgId`, buscar o lead, `lead.orgId !== orgId`
→ `throw new Error("Lead não encontrado")`.

| Mutation | Args | Efeito |
|---|---|---|
| `setNextAction` | `{ id, at: number, note: string }` | patch dos dois campos. `note` trim; vazia → erro `"Escreva o que fazer"` |
| `clearNextAction` | `{ id }` | remove os dois campos (`undefined`) |
| `postponeNextAction` | `{ id, days: 1 \| 3 \| 7 }` | `nextActionAt += days * 86400000` a partir da data **vigente**. Sem ação → erro `"Sem próxima ação"` |
| `updateInfo` | `{ id, contactName?: string, contactRole?: string, dealSetup?: number \| null, dealMonthly?: number \| null }` | patch só dos campos enviados. String: trim, vazia → `undefined`. Número: `null` → `undefined` (limpa); negativo ou `NaN` → erro `"Valor inválido"` |
| `markLost` | `{ id, reason: LostReason, note?: string }` | `stage: "lost"`, `stageUpdatedAt`, `lostReason`, `lostNote` (trim, vazia → `undefined`); limpa `nextActionAt/Note`; evento `stage_change` com `meta: { from, to: "lost", reason }` |
| `addNote` | `{ id, text: string }` | trim; vazia → erro `"Nota vazia"`; insere evento `note` com `meta: { text }` |

`setStage` existente muda em dois pontos:
- **recusa** `stage: "lost"` com erro `"Use markLost"` (guardrail no servidor; toda UI
  que oferece "Perdido" abre o modal, seção 2.4 e 3.1);
- ao **sair** de `lost` para qualquer estágio, limpa `lostReason` e `lostNote`. É a
  única forma de reabrir; não há mutation `reopen`.

### 1.5 Query nova

| Query | Devolve |
|---|---|
| `leads.timeline({ leadId })` | eventos do lead via `by_lead`, mais recente primeiro, `take(100)`. Campos: `_id, type, at, meta`. Lead de outra org ou inexistente → `throw new Error("Lead não encontrado")` (mesmo comportamento das mutations) |

### 1.6 Seed do demo (`convex/demo.ts`)

Para a faixa "Hoje" e o "parado" aparecerem no modo demo: 2 leads com ação atrasada,
2 com ação hoje, 3 com `stageUpdatedAt` há 10+ dias sem ação, 2 em `lost` com motivo
(os que já estão em `lost` sem motivo ficam como estão, para cobrir o caso), 1 com
contato e valores preenchidos, 2 notas. Só dados; nenhuma lógica no seed.

---

## 2. Tela do CRM (`src/app/(app)/crm/page.tsx`)

### 2.1 Faixa "Hoje" (`src/components/crm/today-strip.tsx`)

- A página calcula `items` a partir da lista que já filtrou (`saved !== false`):
  leads com `nextActionOf !== null` e `actionStatus !== "upcoming"`, ordenados por
  `at` crescente. Recalcula a cada render; `now = Date.now()` no render.
- Fica entre o cabeçalho da página e a busca. **Some quando `items` está vazia**
  (sem estado vazio, sem placeholder).
- Dois grupos, nesta ordem: **Atrasadas** (título em `--hot`) e **Hoje**. Grupo sem
  itens não aparece.
- Linha: nome do lead (botão, abre o detalhe) · texto da ação · "há N dias" quando
  atrasada · **Feito** · **Adiar ▾** (1 dia · 3 dias · 7 dias).
- **Feito** → `clearNextAction`, depois `onOpen(leadId, { focusNextAction: true })`
  para a próxima ser marcada na hora.
- **Adiar** → `postponeNextAction`, com update otimista no `leads.list` (padrão de
  `setStage`).
- Props: `items: { lead, action, status }[]`, `onOpen(leadId, opts?)`. O componente
  chama as duas mutations por conta própria (`useMutation`); não recebe dados de
  query.

### 2.2 Card do Kanban

Uma linha nova, abaixo de categoria · cidade, antes do seletor de estágio:

| Situação | Texto | Cor |
|---|---|---|
| ação atrasada | `↺ ligar de novo · há 2 dias` | `--hot` |
| ação hoje | `↺ ligar de novo · hoje` | `--warm` |
| ação futura | `↺ ligar de novo · 23 set` | `--faint` |
| sem ação, parado ≥ 7 dias | `parado há 12 dias` | `--faint`, itálico |
| sem ação, < 7 dias | linha não aparece | |

Convertido e Perdido nunca mostram "parado" (garantido por `stalledDays`).

- Filtro rápido novo: **Parados** (`isStalled(l, now)`), depois de "Abordável".
- Ordenação nova: **Próxima ação** (`compareByNextAction`), depois de "Score (maior)".

### 2.3 Coluna "Perdido"

- Entra como última coluna, **recolhida por padrão**: só cabeçalho com contagem e
  botão de expandir. Expandida, funciona como as outras (busca, filtro, ordenação
  valem). Estado em `useState`; não persiste.
- Soltar um card nela, ou escolher "Perdido" no seletor do card, **não move**: abre o
  `LostReasonModal`. Confirmar → `markLost`; cancelar → nada muda, `dragId` e
  `overCol` são limpos.
- Cabeçalho de toda coluna: `Rótulo · N` e, quando ao menos um lead da coluna tem
  `dealMonthly`, `· €340/mês` (soma de `dealMonthly`, formatada com a moeda do
  **primeiro** lead da coluna que tiver valor; mistura de moedas numa coluna é caso
  raro e mostra a soma crua com essa moeda). Perdido não mostra soma.

### 2.4 `LostReasonModal` (`src/components/crm/lost-reason-modal.tsx`)

Props: `lead`, `onConfirm({ reason, note })`, `onClose`. `LOST_REASONS` como botões de
rádio (nenhum pré-selecionado; confirmar desabilitado até escolher), campo de nota
opcional, botões Cancelar / Marcar perdido. Mesmo padrão visual do `CreateLeadModal`
(overlay, `role="dialog"`, `aria-labelledby`, Esc fecha). Usado pelo Kanban e pelo
detalhe do lead.

---

## 3. Detalhe do lead (`src/components/crm/lead-detail.tsx`)

`LeadDetail` ganha props opcionais `initialTab?: Tab` e `focusNextAction?: boolean`
(a página passa quando a faixa Hoje abre o lead).

### 3.1 Aba Informações

O `InfoTab` hoje oferece "Perdido" por dois caminhos (`PIPELINE_STAGES.map` nas
pílulas "Etapa" e o botão "Perdido" do controle "Status"), ambos via `setStage`.
**Os dois passam a abrir o `LostReasonModal`**; os demais estágios seguem em
`setStage`. Sair de Perdido por pílula ou botão "Em aberto" funciona como hoje (e o
servidor limpa o motivo).

Três blocos novos, **acima** dos dados do Google (que não mudam), cada um em arquivo
próprio e renderizado pelo `InfoTab`:

**`NextActionForm` (`next-action-form.tsx`)**: props `lead`, `autoFocus?`. Mostra a
ação vigente com status colorido (mesma tabela de 2.2); campos data (`<input
type="date">`, `min` = hoje local; o valor vira meia-noite local do dia) e texto;
botões **Salvar** (`setNextAction`) e **Concluir** (`clearNextAction`, só quando há
ação). Com `autoFocus`, o campo de texto recebe foco ao montar.

**`LeadInfoFields` (`lead-info-fields.tsx`)**: props `lead`. Dois grupos:
- **Contato:** nome, cargo.
- **Negócio:** setup, mensalidade, com o símbolo da moeda do país ao lado do campo.
Edição inline: campo que salva **no blur** e com Enter (`updateInfo`); Esc descarta.
Campo numérico esvaziado envia `null` (limpa). Valor inválido mostra a mensagem do
servidor abaixo do campo, mantém o digitado e não salva.

**Faixa de perdido**: só quando `lead.stage === "lost"`. Texto `Perdido · Caro demais
· nota` em `--hot` no topo da aba; sem `lostReason`, só `Perdido`; sem `lostNote`,
sem o terceiro segmento. Botão **Reabrir** → `setStage(id, "base")`.

### 3.2 Aba "Histórico" (`lead-timeline.tsx`)

- Sexta aba, depois de "Venda". `TABS` passa a incluir `"Histórico"`.
- Topo: campo de nota (uma linha, cresce até 4), **Enter salva** (`addNote`), Shift+Enter
  quebra linha. Limpa após salvar; erro do servidor aparece abaixo do campo.
- Abaixo: `leads.timeline`. Cada item: ícone e cor por tipo, texto, data relativa
  ("há 2 h", "ontem", "12 set").
- Vazio: `EmptyState` "Nada registrado ainda".

Texto por tipo (função `timelineText`, local ao componente):

| Tipo | Texto |
|---|---|
| `note` | o texto da nota |
| `stage_change` | `Base → Abordado`; sem `from` (eventos antigos, seed) → `→ Abordado`; `to: "lost"` → `→ Perdido · Caro demais` (sem `reason` → `→ Perdido`) |
| `email_sent` | `Email enviado` |
| `preview_open` | `Preview aberto` |
| `reply` | `Respondeu` |
| `wa_opt_in` | `Opt-in WhatsApp (` + origem + `)` |
| `contact_opt_in` | `Consentimento registrado (` + origem + `)` |

Origem (`meta.source`): `replied_email` → "respondeu o email", `phone_call` →
"ligação", `in_person` → "pessoalmente", `reply` → "resposta", `other` → "outro",
ausente → sem parênteses.

### 3.3 Glyph de evento (`src/components/event-glyph.tsx`)

`eventDot(type)` e `eventIcon(type, meta)` saem de `dashboard/page.tsx` para este
arquivo, sem mudar de comportamento, e ganham o caso `note` (ícone de nota, cor
`--faint`). O Dashboard passa a importá-los. **`eventLabel` fica no Dashboard**: o
feed tem copy própria ("<lead> abriu o preview") e o Histórico tem a sua
(`timelineText`); não se unificam.

### 3.4 Arquivos

| Arquivo | Papel |
|---|---|
| `convex/schema.ts` | campos + índice + tipo `note` |
| `convex/lib/domain.ts` | funções puras da seção 1.3 |
| `convex/leads.ts` | mutations e query das seções 1.4 e 1.5 |
| `convex/events.ts` | `recent` exclui `note` |
| `convex/demo.ts` | seed |
| `tests/crm-domain.test.ts` | testes das funções puras |
| `src/components/event-glyph.tsx` | ícone/cor por tipo (extraído do Dashboard) |
| `src/components/crm/today-strip.tsx` | faixa Hoje |
| `src/components/crm/lost-reason-modal.tsx` | modal de motivo |
| `src/components/crm/next-action-form.tsx` | próxima ação |
| `src/components/crm/lead-info-fields.tsx` | contato + negócio |
| `src/components/crm/lead-timeline.tsx` | aba Histórico |
| `src/components/crm/lead-detail.tsx` | monta as abas, props novas, "Perdido" via modal |
| `src/app/(app)/crm/page.tsx` | faixa, card, filtro, ordenação, coluna Perdido |
| `src/app/(app)/dashboard/page.tsx` | importa `event-glyph` |

---

## 4. Erros e casos de borda

- Mutation falha (rede, validação) → a UI mostra a mensagem do `Error` ao lado do
  controle que a disparou e mantém o valor digitado. Padrão já usado no composer.
- Lead em `converted`: próxima ação continua permitida (renovação, upsell); "parado"
  não.
- `postponeNextAction` numa ação atrasada soma a partir da data vigente: adiar 1 dia
  uma ação de 5 dias atrás continua atrasada. Esperado; o usuário vê e adia de novo
  ou remarca no detalhe.
- Drag para "Perdido" cancelado no modal → o card volta ao lugar.
- Lead perdido sem motivo (legado) → telas mostram só "Perdido".
- Modo demo: tudo funciona sobre a org "demo", sem auth, como hoje.

## 5. Testes

- **Unitários (`node --test`)**: `currencyForCountry`, `formatMoney` (as quatro
  moedas, milhar, arredondamento), `nextActionOf` (com e sem), `actionStatus` (ontem
  23:59, hoje 00:00, hoje 23:59, amanhã 00:00), `daysBetween`, `stalledDays` (com
  ação → null; converted → null; lost → null; 6 vs 7 dias), `isStalled`,
  `compareByNextAction` (ação antes de sem ação; `at` crescente; sem ação por score),
  `lostReasonLabel` (ausente → undefined).
- **Verificação manual** no modo demo, roteiro no plano: faixa Hoje aparece com o
  seed; Feito abre o detalhe com o campo em foco; Adiar move; arrastar para Perdido
  pede motivo; cancelar volta; "Perdido" no detalhe também pede motivo; nota aparece
  no Histórico junto com a mudança de estágio; Reabrir volta para Base e o motivo
  some; Parados filtra; soma da mensalidade no cabeçalho; nota **não** aparece no
  feed do Dashboard.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` verdes antes de "pronto".
