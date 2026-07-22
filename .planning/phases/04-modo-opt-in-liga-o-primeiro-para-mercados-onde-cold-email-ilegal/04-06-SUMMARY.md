---
phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal
plan: 06
subsystem: ui
tags: [react, next, convex, leads, compliance, opt-in, crm]

# Dependency graph
requires:
  - phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal (plan 01)
    provides: "OPT_IN_MARKETS, LAUNCH_MARKETS, MARKETS.legalReview e canContactByEmail em @convex/lib/domain"
  - phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal (plan 05)
    provides: "LeadCard variant='email' | 'call' com gating interno do slot `action` por contactOptInAt"
provides:
  - "Abas 'Email primeiro' (default) e 'Ligação primeiro' na página de Leads, controlando select de países, filtro da lista e variante do card"
  - "Filtro client-side por regime (OPT_IN_MARKETS.includes(countryCode)) sem query Convex nova"
  - "Banner de validação jurídica pendente (OPTIN-06) exclusivo da aba de ligação"
  - "Empty state que explica o fluxo ligar → consentimento → email destrava"
  - "Banner de compliance do ApproachTab coerente com consentimento (canContactByEmail)"
affects: [leads, crm, compliance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pílula state-driven (className condicional) reusada do outreach/page.tsx para as abas de regime"
    - "Filtro por regime client-side sobre o array já buscado por leads.list (Pattern 4 do 04-RESEARCH), sem argumento novo na query"
    - "Props comuns do LeadCard extraídas num objeto `common` e espalhadas nos dois ramos da aba — garante por construção que o slot `action` nunca é omitido no modo call (contrato do 04-05)"

key-files:
  created: []
  modified:
    - src/app/(app)/leads/page.tsx
    - src/components/crm/lead-detail.tsx

key-decisions:
  - "O slot `action` (GeneratePreviewButton) é passado nas DUAS abas; a visibilidade do fluxo de email é decidida pelo gating interno do LeadCard (04-05), nunca pelo pai"
  - "Trocar de aba reseta country para o primeiro mercado do regime, limpa city e limpa a seleção — evita enviar ao CRM leads que não estão visíveis na aba atual"
  - "Contadores passam a refletir a lista visível (shownLeads); na aba de ligação, 'abordáveis' (emailable) dá lugar a 'com consentimento' (contactOptInAt), que é a métrica que importa no regime opt-in"
  - "No lead-detail, só o banner de AÇÃO acima do composer migrou para canContactByEmail; o painel de status legal continua lendo lead.emailable cru (defensibilidade de origem)"

patterns-established:
  - "Aba de regime na UI = (select de países, filtro da lista, variante do card) derivados de um único estado `tab`"

requirements-completed: [OPTIN-02, OPTIN-06]

# Metrics
duration: 9min
completed: 2026-07-22
---

# Phase 4 Plan 06: Abas Email/Ligação na página de Leads + compliance coerente no CRM Summary

**A página de Leads ganhou as abas "Email primeiro"/"Ligação primeiro" que trocam select de países (LAUNCH vs OPT_IN), filtram a lista por regime do `countryCode`, renderizam o card em `variant="call"` e exibem o banner de validação jurídica pendente; no CRM, o aviso de compliance acima do composer passou a usar `canContactByEmail`, sumindo assim que o consentimento é registrado.**

## Performance

- **Duration:** ~9 min
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Duas pílulas no topo da página de Leads ("Email primeiro" default, "Ligação primeiro"), no mesmo padrão state-driven do `outreach/page.tsx`.
- A aba controla os três eixos previstos no OPTIN-02: países do select (`markets = tab === "call" ? OPT_IN_MARKETS : LAUNCH_MARKETS`), filtro da lista (`OPT_IN_MARKETS.includes(l.countryCode)`) e variante do card (`variant="call"`).
- Trocar de aba reseta o país para o primeiro mercado do regime e limpa cidade e seleção — nenhum país da outra aba fica preso no select nem lead invisível fica selecionado.
- Banner discreto de validação jurídica (borda warm, ícone `MdOutlineGavel`) só na aba de ligação: "Mercados em validação jurídica — ligação B2B permitida; email/WhatsApp só após consentimento registrado." (OPTIN-06).
- Empty state próprio da aba de ligação, explicando o fluxo: buscar mercado opt-in → ligar → registrar consentimento → email destrava.
- O slot `action={<GeneratePreviewButton />}` é passado nas duas abas por construção (objeto `common` espalhado nos dois ramos), respeitando o contrato do 04-05: quem esconde o fluxo de email até haver consentimento é o card, não a página.
- No `ApproachTab` do CRM, o aviso "não é abordável por email frio… prefira uma ligação" agora some para lead consentido — a UI parou de contradizer o composer, que já funcionava (Pitfall 4 do research).

## Task Commits

Nenhum commit foi feito por este executor (o orquestrador commita por wave, conforme instrução do ambiente). Alterações entregues em working tree:

1. **Task 04-06-T1: Abas Email/Ligação, filtro por regime, variante e banner na página de Leads** — `src/app/(app)/leads/page.tsx`
2. **Task 04-06-T2: Banner do ApproachTab via canContactByEmail** — `src/components/crm/lead-detail.tsx`

## Files Created/Modified
- `src/app/(app)/leads/page.tsx` - estado `tab` + `TABS`, pílulas de regime, `markets` derivado no select de país, `shownLeads` filtrado por `OPT_IN_MARKETS.includes`, contadores/selecionar-todos/empty state migrados para a lista visível, banner OPTIN-06 na aba call, `LeadCard ... variant="call"` com o slot `action` preservado.
- `src/components/crm/lead-detail.tsx` - import de `canContactByEmail`; condição do banner do `ApproachTab` trocada de `!lead.emailable` para `!canContactByEmail(lead)`; painel de status legal (`lead.emailable ?`, linha ~194) intocado.

## Decisions Made
- **Contrato do slot `action`:** extraí as props comuns num objeto `common` e espalhei nos dois ramos (`variant="call"` e sem variante). Isso torna estruturalmente impossível o pai omitir o `action` no modo call — a regressão que o 04-06 anterior tinha.
- **Contador da aba call:** "abordáveis" (`emailable`) não faz sentido em mercado opt-in (é sempre ~0 antes do consentimento); troquei por "com consentimento" (`contactOptInAt`), que é o KPI real do fluxo. Discricionário (copy está sob "Claude's Discretion" no CONTEXT).
- **Reset da seleção ao trocar de aba:** o plano pedia apenas reset de país/cidade. Adicionei `setSelected(new Set())` porque a seleção é global por id e "Enviar para CRM" mandaria leads da outra aba, invisíveis no momento do clique.

## Deviations from Plan

### Auto-fixed / discricionárias

**1. [Rule 2 - Funcionalidade crítica] Reset da seleção ao trocar de aba**
- **Found during:** Task 1, ao ligar o filtro por regime
- **Issue:** `selected` é um `Set<Id<"leads">>` global; com a lista filtrada por aba, um lead selecionado na aba de email continuaria selecionado (e seria enviado ao CRM) depois de trocar para a aba de ligação, sem estar visível.
- **Fix:** `switchTab()` chama `setSelected(new Set())` junto com `setCountry`/`setCity`.
- **Files modified:** src/app/(app)/leads/page.tsx

**2. [Discricionário - copy] Contador "abordáveis" → "com consentimento" na aba de ligação**
- **Found during:** Task 1, item 5 (contadores passam a usar `shownLeads`)
- **Issue:** `emailable` é falso por definição nos mercados opt-in antes do consentimento; o contador mostraria sempre 0 e não informaria nada.
- **Fix:** na aba call, contar `contactOptInAt`; na aba de email, o contador original permanece.
- **Files modified:** src/app/(app)/leads/page.tsx

**3. [Ambiente] Comandos de verificação substituídos**
- O plano prescreve `pnpm typecheck` / `pnpm lint` / `pnpm test`; nesta máquina o pnpm aborta (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). Rodei os equivalentes diretos: `npx tsc --noEmit` (exit 0, sem saída), `npx eslint` (exit 0, sem saída), `node --experimental-strip-types --test tests/*.test.ts` (56/56 passando). `npx convex codegen` não foi executado (deployment inacessível nesta máquina) e também não era necessário — nenhum arquivo Convex mudou neste plano.

---

**Total deviations:** 2 no código (1 correção de comportamento, 1 de copy) + 1 de ambiente (comandos).
**Impact on plan:** Nenhum critério de aceite do plano foi perdido; todos os greps de aceitação casam.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- OPTIN-02 e OPTIN-06 fechados na UI. Fase 4 (04-01 a 04-06) com todas as waves aplicadas.
- Verificação manual pendente (visual, `verify-work`): abrir a aba "Ligação primeiro" → select mostra ES/IT/PT/DE/DK/CH, banner warm aparece, cards mostram Ligar/Script/Consentimento sem ação de email; registrar consentimento num lead ES → o botão de prévia aparece no card e o aviso do ApproachTab some no CRM.

---
*Phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal*
*Completed: 2026-07-22*

## Self-Check: PASSED

Ambos os arquivos modificados existem em disco e passam `npx tsc --noEmit` e `npx eslint` sem saída; suíte de testes 56/56. Commits não verificados por decisão de ambiente (executor proibido de rodar git; commits ficam a cargo do orquestrador).
