---
phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal
plan: 05
subsystem: ui
tags: [react, convex, ui, opt-in, compliance, leads, call-script]

# Dependency graph
requires:
  - phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal (plan 01)
    provides: "campos contactOptInAt/contactOptInSource/callScript/callScriptPt no doc de leads + canContactByEmail"
  - phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal (plan 03)
    provides: "api.leads.recordContactOptIn (mutation) e api.outreach.callScript (action)"
provides:
  - "ContactOptInButton — registro de consentimento pelo card (origem + confirmar → recordContactOptIn) e selo quando já consentido"
  - "CallScriptPanel — gera/regenera o script via api.outreach.callScript e mostra script + tradução pt-BR lado a lado com copiar nativo"
  - "LeadCard com prop variant ('email' | 'call'), rodapé de compliance de 3 estados e gating INTERNO do slot action por contactOptInAt no modo call"
affects: [leads, outreach, compliance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gating de ação sensível dentro do componente que conhece o estado (LeadCard decide se renderiza o slot `action` do pai) em vez de gating no pai — o pai passa sempre o slot e não pode 'esquecer' de esconder o cold email"
    - "Copiar para a área de transferência via navigator.clipboard.writeText + estado transiente 'Copiado!' encapsulado num subcomponente CopyButton (um estado por coluna, sem estado composto no pai) — sem lib, sem efeito"

key-files:
  created:
    - src/components/contact-opt-in-button.tsx
    - src/components/call-script-panel.tsx
  modified:
    - src/components/lead-card.tsx

key-decisions:
  - "O slot `action` do pai É renderizado no modo call depois do consentimento (contrato com o 04-06), divergindo do Pattern 5 do RESEARCH que sugeria o pai parar de passar o slot — o plano 04-05 é explícito e vence: o gating fica interno ao card"
  - "href do botão Ligar sanitiza o telefone (`tel:${phone.replace(/[^+0-9]/g, '')}`), espelhando o tratamento do link wa.me da Fase 2, em vez de interpolar o telefone formatado cru"
  - "CallScriptPanel checa `phone` localmente antes de chamar a action e mostra 'Lead sem telefone.' (mesma mensagem do backend) — evita ida ao servidor só para receber o erro"
  - "Estado 'Copiado!' vive num subcomponente CopyButton por coluna, não num estado 'copiado: script|translation' no pai"

patterns-established:
  - "Componente de card com `variant` como modo de render interno: a variante decide o bloco de ações inteiro (inclusive se o slot recebido do pai aparece), mantendo o pai burro e o gate de compliance num lugar só"

requirements-completed: [OPTIN-02, OPTIN-03, OPTIN-04]

# Metrics
duration: 12min
completed: 2026-07-22
---

# Phase 4 Plan 05: UI do modo ligação-primeiro (card variante call + script bilíngue + consentimento) Summary

**O `LeadCard` ganhou a variante `call`: ação primária Ligar (`tel:`), painel de script de ligação bilíngue (idioma do mercado + tradução pt-BR, cada um com copiar) e registro de consentimento pelo próprio card — com o slot de cold email do pai escondido internamente até `contactOptInAt` existir, e rodapé de compliance de 3 estados.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-22
- **Tasks:** 3 (todas `type="auto"`, sem checkpoint)
- **Files created:** 2 · **Files modified:** 1

## Accomplishments
- `ContactOptInButton`: botão colapsado "Registrar consentimento" → select de origem (`phone_call` / `in_person` / `reply` / `other`, vocabulário do OPTIN-04) + "Registrar" chamando `api.leads.recordContactOptIn`; quando `optInAt` existe, vira selo "✓ Consentimento registrado". Erros do backend aparecem em pt-BR abaixo do form.
- `CallScriptPanel`: botão colapsado "Script de ligação" → painel com "Gerar script" / "Regenerar script" (`api.outreach.callScript`), duas colunas (`grid md:grid-cols-2`, empilha no mobile) com rótulos "Script" e "Tradução (pt-BR)", cada uma com botão "Copiar" (`navigator.clipboard.writeText`, feedback "Copiado!" por 1,5 s). Reaproveita `lead.callScript` / `lead.callScriptPt` persistidos como valor inicial — abrir o painel de um lead que já tem script não gasta IA.
- `LeadCard` ganhou `variant?: "email" | "call"` (default `"email"`). O rodapé de compliance virou 3 estados: "Ligação primeiro · email após consentimento" (call sem consentimento), "Consentimento registrado em {data pt-BR}" (call consentido), e o par original "Abordável por email" / "Fora do escopo compliant" (variante email, intacta).
- **O gate de cold email é interno ao card**: no modo call sem consentimento, o slot `action` do pai (que no 04-06 será sempre o `GeneratePreviewButton`) simplesmente não é renderizado; com `contactOptInAt` presente, ele aparece abaixo do consentimento. A página de Leads pode passar o slot nas duas abas sem risco.
- Variante `"email"` byte-a-byte equivalente ao comportamento anterior (slot `action` + "Site atual" na mesma linha flex).

## Task Commits

Este executor rodou sob instrução explícita de **não executar nenhum comando git** — os commits são feitos pelo orquestrador ao fechar a wave.

1. **Task 04-05-T1: ContactOptInButton** - aplicado no working tree, commit pendente (esperado: `feat(04-05)`)
2. **Task 04-05-T2: CallScriptPanel** - aplicado no working tree, commit pendente (esperado: `feat(04-05)`)
3. **Task 04-05-T3: LeadCard variant call + rodapé 3 estados** - aplicado no working tree, commit pendente (esperado: `feat(04-05)`)

**Plan metadata:** este SUMMARY entra no commit de fechamento da wave.

## Files Created/Modified
- `src/components/contact-opt-in-button.tsx` (novo) - `"use client"`; `CONTACT_SOURCES` (4 origens do OPTIN-04), `useMutation(api.leads.recordContactOptIn)`, três estados de render (selo consentido / botão colapsado / form origem+registrar); classes copiadas do `whatsapp-followup.tsx` para consistência visual; `aria-label="Origem do consentimento"`.
- `src/components/call-script-panel.tsx` (novo) - `"use client"`; `useAction(api.outreach.callScript)`, seed de `script`/`translation` a partir de `initialScript`/`initialTranslation`, colunas Script/Tradução (pt-BR) com `CopyButton` (clipboard nativo + "Copiado!" transiente), checagem local de telefone, mensagens de falha em pt-BR.
- `src/components/lead-card.tsx` - prop `variant` + `callMode`; `siteLink` extraído para variável (usado pelas duas variantes, sem duplicar markup); rodapé de compliance 3-way (linhas 165-188); bloco de ações bifurcado (linhas 190-224): modo call com Ligar/`CallScriptPanel`/`ContactOptInButton` + slot do pai gateado por `lead.contactOptInAt`, modo email inalterado.

## Decisions Made
- **Slot `action` no modo call consentido é renderizado pelo card** (não escondido pelo pai). Segue o `<objective>` e a Task T3 do plano; diverge do Pattern 5 do 04-RESEARCH ("o pai simplesmente para de passar `action`"). O plano é mais recente e mais seguro: o gate mora onde o estado mora.
- **Telefone sanitizado no `tel:`** — `lead.phone` vem do Places com espaços/parênteses; discadores lidam melhor com o número limpo, e é o mesmo tratamento já usado no link `wa.me` da Fase 2.
- **`lead.contactOptInAt != null &&`** no gate do slot (em vez de truthiness pura) para não arriscar renderizar `0` como texto se algum timestamp degenerado aparecer.
- **`stopPropagation` no wrapper do bloco de ações do modo call** (não só nos filhos): o bloco tem 4 controles interativos e cliques na folga entre eles não devem alternar a seleção do card.
- **`lead-card.tsx` continua sem `"use client"`** — ele importa componentes client (`CallScriptPanel`, `ContactOptInButton`), o que é válido; o único consumidor (`src/app/(app)/leads/page.tsx`) já é `"use client"`, então nada muda na fronteira server/client.

## Deviations from Plan

### Implementação

**1. [Rule 1 - melhoria] `tel:` com telefone sanitizado**
- **Task:** T3
- **Plano:** `<a href={`tel:${lead.phone}`}>`
- **Feito:** `<a href={`tel:${lead.phone.replace(/[^+0-9]/g, "")}`}>`
- **Motivo:** telefones do Places vêm formatados ("+31 20 123 4567"); o esquema `tel:` aceita, mas discadores/robôs se comportam melhor com o número limpo — e é o padrão já estabelecido no repo (`wa.me` na Fase 2). O critério de aceite (`grep "tel:"`) segue satisfeito.

**2. [Rule 3 - estrutura] `siteLink` extraído para variável**
- **Task:** T3
- **Motivo:** o link "Site atual" precisa aparecer nas duas variantes; duplicar 12 linhas de markup criaria duas fontes de verdade para o mesmo botão. Comportamento idêntico ao anterior.

**3. [Rule 2 - simplificação] "Copiado!" encapsulado num `CopyButton`**
- **Task:** T2
- **Plano:** "um estado transiente de 'copiado' por coluna" no componente do painel.
- **Feito:** subcomponente `CopyButton` com seu próprio `useState` — duas instâncias, dois estados independentes. Semanticamente o que o plano pede, com menos estado no pai e sem risco com as regras do React Compiler.

**4. [Rule 2] `try/catch` em volta do `navigator.clipboard.writeText`**
- **Task:** T2
- **Motivo:** a Clipboard API rejeita em contexto não-seguro / sem permissão; sem o catch, uma promise rejeitada não tratada estouraria no console e o botão ficaria travado em estado indefinido. Falha silenciosa (não marca "Copiado!") em vez de quebrar o card.

Não houve divergência nos pontos substantivos: vocabulário de origem, chamadas de API, layout lado a lado, rodapé de 3 estados e gating interno estão exatamente como o plano especifica.

### Procedimento (impostas pelo ambiente, não pelo plano)

1. **Comandos de verificação trocados.** O plano prescreve `pnpm typecheck` / `pnpm lint`; o pnpm aborta neste terminal (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). Usados `npx tsc --noEmit`, `npx eslint` e `node --experimental-strip-types --test tests/*.test.ts`.
2. **`npx convex codegen` não rodado** (deployment Convex inacessível nesta máquina: "You don't have access to the selected project"). Sem impacto: `convex/_generated/api.d.ts` é derivado genericamente via `ApiFromModules<typeof leads/outreach/...>`, então `api.leads.recordContactOptIn` e `api.outreach.callScript` já tipam corretamente — o `npx tsc --noEmit` verde prova.
3. **Sem comandos git.** Instrução do orquestrador — nenhum hash de commit neste SUMMARY.
4. **STATE.md / ROADMAP.md / REQUIREMENTS.md não atualizados por este executor** — arquivos compartilhados entre agentes da mesma wave; o orquestrador fecha.

**Total deviations:** 4 de implementação (todas menores, nenhuma altera comportamento pedido), 4 de procedimento.

## Verification

| Check | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `npx tsc --noEmit` | exit 0, sem saída |
| Lint | `npx eslint` | exit 0, sem saída (inclui as regras `react-hooks/set-state-in-effect` e `react-hooks/refs` como error) |
| Testes | `node --experimental-strip-types --test tests/*.test.ts` | tests 56 / pass 56 / **fail 0** |
| T1 arquivo | `test -f src/components/contact-opt-in-button.tsx` | OK |
| T1 mutation | `grep -c "api.leads.recordContactOptIn" …` | 2 (import de uso + comentário do módulo) |
| T1 vocabulário | `grep -c '"phone_call"' / '"in_person"' / '"reply"' / '"other"'` | 1 cada — 4/4 |
| T2 arquivo | `test -f src/components/call-script-panel.tsx` | OK |
| T2 action | `grep -c "api.outreach.callScript" …` | 2 |
| T2 clipboard | `grep -c "navigator.clipboard.writeText" …` | 1 (nativo, sem lib) |
| T2 coluna pt-BR | `grep -c "Tradução" …` | 1 (`Tradução (pt-BR)`) |
| T3 prop | `grep -c 'variant?: "email" \| "call"' src/components/lead-card.tsx` | 1 |
| T3 composição | `grep -c "CallScriptPanel"` / `"ContactOptInButton"` | 2 cada (import + uso) |
| T3 ligar | `grep -c "tel:" src/components/lead-card.tsx` | 1 |
| T3 rodapé 3 estados | `grep -c "Ligação primeiro"` / `"Consentimento registrado"` | 1 cada |
| T3 gating | `grep -c "contactOptInAt" src/components/lead-card.tsx` | **5** (≥ 2 exigido: rodapé ×2, prop do ContactOptInButton, gate do slot, comentário) |
| Gating inspecionado | leitura de `src/components/lead-card.tsx:190-224` | no modo call, `{lead.contactOptInAt != null && action && <div>{action}</div>}` — slot ausente sem consentimento, presente com |

## Issues Encountered
Nenhum. Baseline (typecheck/lint/testes) já estava verde antes das edições e continuou verde depois — nenhuma auto-correção de bug foi necessária.

## User Setup Required
Nenhuma configuração nova por este plano. Lembrete herdado do 04-03: **gerar script exige `ANTHROPIC_API_KEY` no deployment Convex**; sem ela o painel mostra a mensagem pt-BR do backend ("ANTHROPIC_API_KEY não configurada no deployment Convex.") em vez de quebrar.

## Next Phase Readiness
- Contrato com o **04-06** cumprido do lado do card: a página de Leads deve passar `variant="call"` na aba "Ligação primeiro" e **sempre** `action={<GeneratePreviewButton … />}` nas duas abas — o card esconde/mostra sozinho. Se o 04-06 preferir não passar o slot, o card também não quebra.
- Verificação manual pendente (04-VALIDATION §Manual-Only, exige `ANTHROPIC_API_KEY` e um lead com telefone em mercado opt-in): abrir o card call → conferir que não há botão de email → "Script de ligação" → "Gerar script" → conferir script no idioma do mercado + tradução pt-BR e os dois "Copiar" → "Registrar consentimento" → conferir rodapé "Consentimento registrado em …" e o aparecimento do `GeneratePreviewButton`.
- A copy do script é gerada por IA e não é revisada por nativo — o painel bilíngue existe exatamente para a dona conferir antes de ligar.

---
*Phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal*
*Completed: 2026-07-22*

## Self-Check: PASSED

Os 3 arquivos (2 criados, 1 modificado) existem em disco com as mudanças alegadas — todos os greps da tabela acima foram executados de verdade, não inferidos. Verificação de commits **não executável** neste executor (proibido rodar git por instrução do orquestrador).
