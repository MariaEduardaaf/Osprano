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
- **Reunião marcada é próxima ação.** `meetingAt` já existe (`leads.schedule`). A
  faixa "Hoje" e o card leem os dois campos; não se copia um no outro.
- Moeda **derivada do país**, sem campo: GB → GBP, SE → SEK, NO → NOK, CH → CHF, DK →
  DKK, resto → EUR. Uma função pura em `convex/lib/domain.ts`.

## Fora do escopo

Dashboard com pipeline em €, exportação, lembrete por email/push, várias ações por
lead, recorrência, atribuição a pessoa. Nada disso é bloqueado pelo desenho.

---

## 1. Dados (Convex)

### 1.1 Schema: `leads` ganha campos opcionais

| Campo | Tipo | Significado |
|---|---|---|
| `nextActionAt` | `number` | timestamp da próxima ação |
| `nextActionNote` | `string` | texto livre ("ligar de novo", "mandar proposta") |
| `contactName` | `string` | pessoa que atende |
| `contactRole` | `string` | cargo dela |
| `dealSetup` | `number` | valor único, na moeda do país |
| `dealMonthly` | `number` | mensalidade, na moeda do país |
| `lostReason` | `"too_expensive" \| "has_site" \| "no_response" \| "not_interested" \| "other"` | motivo fixo |
| `lostNote` | `string` | complemento livre |

Todos opcionais: lead existente continua válido sem migração. `nextActionAt` e
`nextActionNote` andam juntos (setar um seta o outro; limpar limpa os dois).

### 1.2 Schema: `events`

- `type` ganha o literal `"note"`. `meta` de uma nota: `{ text: string }`.
- Índice novo `by_lead: ["leadId", "at"]` para o histórico por lead. O índice
  `by_org` continua servindo o Dashboard (`events.recent`).

### 1.3 Domínio puro (`convex/lib/domain.ts`, com testes em `tests/`)

| Função | Contrato |
|---|---|
| `currencyForCountry(code)` | `"GB"→"GBP"`, `"SE"→"SEK"`, `"NO"→"NOK"`, `"CH"→"CHF"`, `"DK"→"DKK"`, qualquer outro → `"EUR"` |
| `formatMoney(amount, currency)` | `340, "EUR"` → `"€340"`; `"GBP"` → `"£340"`; `"SEK"`/`"NOK"`/`"DKK"` → `"340 kr"`; `"CHF"` → `"CHF 340"`. Sem centavos; separador de milhar com ponto |
| `nextActionOf(lead)` | devolve `{ at, note, kind: "action" \| "meeting" }` ou `null`. Regra: se `nextActionAt` existe, é ela; senão, se `meetingAt` existe e está no futuro ou hoje, é a reunião (`note` = `meetingNote ?? "Reunião"`); senão `null` |
| `actionStatus(at, now)` | `"overdue"` (antes de hoje 00:00 local), `"today"` (mesmo dia civil), `"upcoming"` |
| `stalledDays(lead, now)` | dias inteiros desde `stageUpdatedAt`; **só** quando `nextActionOf(lead) === null` e o estágio não é `converted` nem `lost`; senão `null`. Limiar de "parado": `>= 7` (constante `STALLED_AFTER_DAYS`) |
| `LOST_REASONS` | lista `{ id, label }` na ordem: Caro demais · Já tem site · Sem resposta · Não quer · Outro |

"Hoje" usa o dia civil no **fuso do navegador**; as funções recebem `now` como
argumento para serem testáveis.

### 1.4 Mutations (`convex/leads.ts`)

Todas seguem o padrão existente: `requireOrgId`, buscar o lead, `lead.orgId !== orgId`
→ `throw new Error("Lead não encontrado")`.

| Mutation | Args | Efeito |
|---|---|---|
| `setNextAction` | `{ id, at: number, note: string }` | patch dos dois campos. `note` trim; vazia → erro `"Escreva o que fazer"` |
| `clearNextAction` | `{ id }` | remove os dois campos (`undefined`) |
| `postponeNextAction` | `{ id, days: 1 \| 3 \| 7 }` | `nextActionAt += days*86400000`. Sem ação → erro `"Sem próxima ação"`. Se a ação vigente é a reunião (`nextActionOf.kind === "meeting"`), adia `meetingAt` |
| `updateInfo` | `{ id, contactName?, contactRole?, dealSetup?, dealMonthly? }` | patch só dos campos enviados; string vazia → `undefined`; valor negativo → erro `"Valor inválido"` |
| `markLost` | `{ id, reason: LostReason, note?: string }` | `stage: "lost"`, `stageUpdatedAt`, `lostReason`, `lostNote`; limpa `nextActionAt/Note`; evento `stage_change` com `meta: { from, to: "lost", reason }` |
| `reopen` | `{ id }` | de `lost` para `base`; limpa `lostReason/lostNote`; evento `stage_change` |
| `addNote` | `{ id, text: string }` | trim; vazia → erro `"Nota vazia"`; insere evento `note` com `meta: { text }` |

`setStage` existente: **passa a recusar** `stage: "lost"` com erro `"Use markLost"`.
A UI nunca chega nele com `lost`, mas o guardrail fica no servidor, como o resto do
projeto faz. `converted` continua livre.

### 1.5 Queries

| Query | Devolve |
|---|---|
| `leads.timeline({ leadId })` | eventos do lead via `by_lead`, mais recente primeiro, `take(100)`. Campos: `_id, type, at, meta`. Valida `orgId` do lead |
| `leads.today()` | leads da org com `nextActionOf(lead) !== null` e `actionStatus !== "upcoming"`, ordenados por `at` crescente. Devolve o lead inteiro (o card da faixa precisa de nome, estágio, telefone) mais `{ action: { at, note, kind }, status }` |

`leads.today()` filtra em memória sobre `by_org` (mesmo padrão de `leads.list`); a
paginação é backlog v2 (SCAL-01) e não muda aqui.

### 1.6 Seed do demo (`convex/demo.ts`)

Para a faixa "Hoje" e o "parado" aparecerem no modo demo: 2 leads com ação atrasada,
2 com ação hoje, 3 com `stageUpdatedAt` há 10+ dias sem ação, 2 em `lost` com motivo,
1 com contato e valores preenchidos, 2 notas. Só dados; nenhuma lógica no seed.

---

## 2. Tela do CRM (`src/app/(app)/crm/page.tsx`)

### 2.1 Faixa "Hoje" (`src/components/crm/today-strip.tsx`)

- Fica entre o cabeçalho da página e a busca. **Some quando `leads.today()` vem
  vazia** (sem estado vazio, sem placeholder).
- Dois grupos, nesta ordem: **Atrasadas** (título em `--hot`) e **Hoje**. Grupo sem
  itens não aparece.
- Linha: nome do lead (botão, abre o detalhe) · texto da ação · "há N dias" quando
  atrasada, "reunião" quando `kind === "meeting"` · **Feito** · **Adiar ▾** (1 dia ·
  3 dias · 7 dias).
- **Feito** → `clearNextAction` e abre o detalhe do lead na aba Informações, com o
  bloco Próxima ação em foco, para a próxima ser marcada na hora. Se a ação era uma
  reunião, "Feito" **não** apaga `meetingAt`; só abre o detalhe.
- **Adiar** → `postponeNextAction`. Update otimista, como `setStage` já faz.
- Props: `items` (resultado da query), `onOpen(leadId)`. Nenhuma query dentro; a
  página passa os dados.

### 2.2 Card do Kanban

Uma linha nova, abaixo de categoria · cidade, antes do seletor de estágio:

| Situação | Texto | Cor |
|---|---|---|
| ação atrasada | `↺ ligar de novo · há 2 dias` | `--hot` |
| ação hoje | `↺ ligar de novo · hoje` | `--warm` |
| ação futura | `↺ ligar de novo · 23 set` | `--faint` |
| sem ação, parado ≥ 7 dias | `parado há 12 dias` | `--faint`, itálico |
| sem ação, < 7 dias | linha não aparece | |

Convertido e Perdido nunca mostram "parado".

- Filtro rápido novo: **Parados** (`stalledDays(l) >= STALLED_AFTER_DAYS`), depois de
  "Abordável".
- Ordenação nova: **Próxima ação** (com ação primeiro, `at` crescente; sem ação
  depois, por score), depois de "Score (maior)".

### 2.3 Coluna "Perdido"

- Entra como última coluna, **recolhida por padrão**: só cabeçalho com contagem e
  botão de expandir. Expandida, funciona como as outras (busca, filtro, ordenação
  valem). O estado recolhido/expandido fica em `useState`; não persiste.
- Soltar um card nela, ou escolher "Perdido" no seletor do card, **não move**: abre o
  `LostReasonModal`. Confirmar → `markLost`; cancelar → nada muda.
- Cabeçalho de toda coluna: `Rótulo · N` e, quando ao menos um lead da coluna tem
  `dealMonthly`, `· €340/mês` (soma de `dealMonthly`, formatada com a moeda do
  **primeiro** lead que tiver valor; mistura de moedas numa coluna é caso raro e
  mostra a soma crua com a moeda daquele lead). Perdido não mostra soma.

### 2.4 `LostReasonModal` (`src/components/crm/lost-reason-modal.tsx`)

Props: `lead`, `onConfirm({ reason, note })`, `onClose`. Lista de `LOST_REASONS` como
botões de rádio (um pré-selecionado: nenhum; confirmar desabilitado até escolher),
campo de nota opcional, botões Cancelar / Marcar perdido. Mesmo padrão visual do
`CreateLeadModal` (overlay, `role="dialog"`, `aria-labelledby`, Esc fecha).

---

## 3. Detalhe do lead (`src/components/crm/lead-detail.tsx`)

### 3.1 Aba Informações

Três blocos novos, **acima** dos dados do Google (que não mudam), cada um em arquivo
próprio e renderizado pelo `InfoTab`:

**`NextActionForm` (`next-action-form.tsx`)**: props `lead`, `autoFocus?`.
Mostra a ação vigente (`nextActionOf`) com status colorido; campos data (`<input
type="date">`, mínimo hoje) e texto; botões **Salvar** (`setNextAction`) e
**Concluir** (`clearNextAction`, só quando há ação de tipo `action`). Reunião aparece
como leitura ("Reunião · 20 set · nota") com link para o bloco de agenda que já existe.

**`LeadInfoFields` (`lead-info-fields.tsx`)**: props `lead`. Dois grupos:
- **Contato:** nome, cargo.
- **Negócio:** setup, mensalidade, com o símbolo da moeda do país ao lado do campo.
Edição inline: campo de texto que salva **no blur** (`updateInfo`) e com Enter; Esc
descarta. Valor inválido (negativo, não numérico) mostra a mensagem do servidor
abaixo do campo e não salva.

**Faixa de perdido**: só quando `lead.stage === "lost"`: `Perdido · Caro demais ·
nota` em `--hot` no topo da aba, com botão **Reabrir** (`reopen`).

### 3.2 Aba "Histórico" (`lead-timeline.tsx`)

- Sexta aba, depois de "Venda". `TABS` passa a incluir `"Histórico"`.
- Topo: campo de nota (uma linha, cresce até 4), **Enter salva** (`addNote`), Shift+Enter
  quebra linha. Limpa após salvar.
- Abaixo: `leads.timeline`. Cada item: ícone por tipo (reaproveita `eventIcon` /
  `eventColor` do Dashboard, **extraídos** para `src/components/event-glyph.tsx` para
  não duplicar), texto, data relativa ("há 2 h", "ontem", "12 set").

| Tipo | Texto |
|---|---|
| `note` | o texto da nota, em fonte normal |
| `stage_change` | `Base → Abordado`; para `lost`, `→ Perdido · Caro demais` |
| `email_sent` | `Email enviado` / `WhatsApp enviado` (por `meta.channel`) |
| `preview_open` | `Preview aberto` |
| `reply` | `Respondeu` |
| `wa_opt_in`, `contact_opt_in` | `Consentimento registrado (ligação)` etc. por `meta.source` |

- Vazio: `EmptyState` "Nada registrado ainda".

### 3.3 Arquivos

| Arquivo | Papel |
|---|---|
| `convex/schema.ts` | campos + índice |
| `convex/lib/domain.ts` | funções puras da seção 1.3 |
| `convex/leads.ts` | mutations e queries das seções 1.4 e 1.5 |
| `convex/demo.ts` | seed |
| `tests/crm-domain.test.ts` | testes das funções puras |
| `src/components/event-glyph.tsx` | ícone/cor/texto por tipo de evento (extraído do Dashboard) |
| `src/components/crm/today-strip.tsx` | faixa Hoje |
| `src/components/crm/lost-reason-modal.tsx` | modal de motivo |
| `src/components/crm/next-action-form.tsx` | próxima ação |
| `src/components/crm/lead-info-fields.tsx` | contato + negócio |
| `src/components/crm/lead-timeline.tsx` | aba Histórico |
| `src/components/crm/lead-detail.tsx` | monta as abas; encolhe |
| `src/app/(app)/crm/page.tsx` | faixa, card, filtro, ordenação, coluna Perdido |
| `src/app/(app)/dashboard/page.tsx` | passa a importar `event-glyph` |

---

## 4. Erros e casos de borda

- Mutation falha (rede, validação) → a UI mostra a mensagem do `Error` ao lado do
  controle que a disparou e mantém o valor digitado. Padrão já usado no composer.
- Lead em `converted`: próxima ação continua permitida (renovação, upsell); "parado"
  não.
- `postponeNextAction` numa ação atrasada soma a partir da data **vigente**, não de
  hoje (adiar 1 dia uma ação de 5 dias atrás ainda fica atrasada; é o esperado, o
  usuário vê e adia de novo ou remarca).
- Drag para "Perdido" cancelado no modal → o card volta ao lugar; `dragId`/`overCol`
  são limpos.
- Modo demo: tudo funciona sobre a org "demo", sem auth, como hoje.

## 5. Testes

- **Unitários (`node --test`)**: `currencyForCountry`, `formatMoney`, `nextActionOf`
  (ação, reunião futura, reunião passada, nenhum), `actionStatus` (ontem 23:59, hoje
  00:00, hoje 23:59, amanhã 00:00), `stalledDays` (com ação → null; converted → null;
  6 vs 7 dias), ordenação "Próxima ação".
- **Verificação manual** no modo demo, roteiro no plano: faixa Hoje aparece com o
  seed; Feito abre o detalhe; Adiar move; arrastar para Perdido pede motivo; cancelar
  volta; nota aparece no Histórico junto com a mudança de estágio; Reabrir volta para
  Base; Parados filtra; soma da mensalidade no cabeçalho.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` verdes antes de "pronto".
