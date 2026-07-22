---
phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal
plan: 02
subsystem: discovery
tags: [convex, places, foursquare, compliance, opt-in, markets]

# Dependency graph
requires:
  - phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal (plan 01)
    provides: "isSearchableMarket / SEARCHABLE_MARKETS / OPT_IN_MARKETS em convex/lib/domain.ts"
provides:
  - "Descoberta Google Places liberada para os 6 mercados opt-in (ES, IT, PT, DE, DK, CH)"
  - "Descoberta Foursquare liberada para os mesmos 6 mercados opt-in"
  - "Mensagem de bloqueio pt-BR neutra ('… ainda não está disponível para busca.') para mercados fora das duas listas"
affects: [discovery, compliance, crm]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Separação explícita entre 'mercado pesquisável' (isSearchableMarket, gate de descoberta) e 'mercado emailável' (isEmailable, gate de outreach) — a descoberta se amplia sem afetar a emailabilidade"

key-files:
  created: []
  modified:
    - convex/places.ts
    - convex/foursquare.ts

key-decisions:
  - "Gate de descoberta trocado de isLaunchMarket para isSearchableMarket nas duas actions; isEmailable no insertDiscovered ficou intocado, então leads de mercado opt-in continuam nascendo emailable=false"
  - "regionCode/languageCode (places) e near (foursquare) mantidos como estão — código ISO já funciona para mercados EU não-anglófonos (precedente NL/SE/NO)"
  - "Comentários de cabeçalho das duas actions atualizados (diziam 'opt-out markets only') para não mentirem sobre o gate novo — mudança de doc, sem efeito em runtime"

patterns-established:
  - "Mensagem de bloqueio de mercado passa a ser neutra ('ainda não está disponível para busca') em vez de citar a razão jurídica do cold email — a razão jurídica agora vive no gate de emailabilidade, não no de descoberta"

requirements-completed: [OPTIN-01]

# Metrics
duration: 4min
completed: 2026-07-22
---

# Phase 4 Plan 02: Descoberta liberada para mercados opt-in Summary

**As duas actions de descoberta (Google Places e Foursquare) passam a gatear por `isSearchableMarket` em vez de `isLaunchMarket`, abrindo a busca para ES/IT/PT/DE/DK/CH sem tocar na emailabilidade — que segue governada pelo `isEmailable` no `insertDiscovered`, mantendo esses leads em `emailable=false` (ligação primeiro).**

## Performance

- **Duration:** ~4 min
- **Tasks:** 1 (04-02-T1)
- **Files modified:** 2

## Accomplishments
- Buscar leads em Madrid/Roma/Lisboa/Berlim/Copenhague/Zurique passa pelo gate sem erro de "fora do escopo compliant".
- Mercado nem-launch-nem-opt-in (ex.: FR) continua bloqueado, agora com mensagem pt-BR neutra. Como `FR` não está em `MARKETS`, o nome cai no fallback do código ISO: `FR ainda não está disponível para busca.`
- Emailabilidade inalterada: `convex/leads.ts:266` segue chamando `isEmailable({ countryCode, legalForm, contactType })`, cujo primeiro guard é `isLaunchMarket` — logo todo lead de mercado opt-in nasce `emailable=false`.
- Quota (clampDiscoveryCount / reserve / refund), paginação do Places, `regionCode`/`languageCode` e o `near` do Foursquare ficaram intactos, como o plano exigia.

## Task Commits

Nenhum commit feito por este agente — por instrução do orquestrador, este executor só edita arquivos; os commits da wave são feitos pelo orquestrador depois.

1. **Task 04-02-T1: Trocar gate de descoberta para isSearchableMarket (places + foursquare)** — aplicado no working tree (`convex/places.ts`, `convex/foursquare.ts`), sem commit.

## Files Created/Modified
- `convex/places.ts` - import passa a trazer `isSearchableMarket` (no lugar de `isLaunchMarket`); gate na linha 39 usa `isSearchableMarket(country)` com a mensagem `` `${name} ainda não está disponível para busca.` ``; docblock atualizado para descrever o gate novo
- `convex/foursquare.ts` - mesma troca (import + gate na linha 37 + mensagem idêntica); docblock atualizado ("Mesmo gate de mercados pesquisáveis (launch + opt-in) do places.ts")

## Decisions Made
- Mudança idêntica nas duas actions, para que o gate de descoberta não divirja entre as fontes.
- Nada de `src/app/page.tsx` nem `src/components/crm/create-lead-modal.tsx` (Pitfall 7 do research: usam `LAUNCH_MARKETS` para display/dropdown e estão fora do escopo desta fase). Consequência conhecida e intencional: o dropdown do create-lead-modal ainda não lista os mercados opt-in — quem destrava isso é outro plano da fase.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Documentação enganosa] Docblocks das duas actions ainda diziam "opt-out markets only"**
- **Found during:** Task 04-02-T1
- **Issue:** `convex/places.ts` tinha `Guarded to opt-out markets only (compliant by design).` e `convex/foursquare.ts` tinha `Same opt-out guard.` — depois da troca do gate, ambas as frases descreviam um comportamento que o código não tem mais, o que induz o próximo leitor a erro sobre um ponto de compliance.
- **Fix:** Comentários reescritos para dizer que o gate é de mercados pesquisáveis (launch + opt-in) e que a emailabilidade continua no `isEmailable` do `insertDiscovered` (leads opt-in nascem `emailable=false`).
- **Files modified:** convex/places.ts, convex/foursquare.ts
- **Verification:** `npx tsc --noEmit` exit 0; `npx eslint` exit 0. Zero efeito em runtime (só comentários).
- **Committed in:** n/a (commits são do orquestrador)

---

**Total deviations:** 1 auto-fixed (documentação; nenhuma mudança de comportamento além da prescrita pelo plano)
**Impact on plan:** Nenhum — todos os acceptance criteria do plano continuam satisfeitos.

## Issues Encountered
- **`npx convex codegen` pulado** (instrução do ambiente: o deployment Convex não é acessível nesta máquina — "You don't have access to the selected project"). Os arquivos em `convex/_generated/` já existem e são derivados genericamente do schema, então `npx tsc --noEmit` cobre a validação. Registrado como passo pulado, não como falha.
- **2 testes falhando fora do escopo deste plano:** `tests/outreach-lang.test.ts` ("LANG cobre todos os mercados opt-in" e "CH usa alemão") falham porque `convex/lib/outreachAi.ts` ainda não tem entradas de `LANG` para os mercados opt-in. Esse arquivo pertence a outro plano da mesma wave, executado em paralelo por outro agente — **não tocado aqui** (scope boundary). Suíte: 54 pass / 2 fail, e os 2 fails são pré-existentes em relação a esta mudança (nenhum teste toca `places.ts`/`foursquare.ts`).

## User Setup Required
None — nenhuma configuração externa nova. A verificação manual (buscar "restaurant · Madrid" em dev) exige `GOOGLE_PLACES_API_KEY` já configurada no deployment Convex.

## Next Phase Readiness
- OPTIN-01 fechado na camada de descoberta: os 6 mercados opt-in são pesquisáveis e os leads chegam ao CRM com `emailable=false`.
- Pendências conhecidas de outros planos da fase: dropdown de país da UI (ainda em `LAUNCH_MARKETS`) e `LANG` dos mercados opt-in em `convex/lib/outreachAi.ts`.
- Verificação manual sugerida (verify-work): buscar "restaurant · Madrid" em dev → conferir leads inseridos com `emailable=false`; tentar um país fora das listas (FR) → erro `FR ainda não está disponível para busca.`

---
*Phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal*
*Completed: 2026-07-22*

## Self-Check: PASSED

Ambos os arquivos modificados existem em disco com as mudanças esperadas (`grep -c "isLaunchMarket"` = 0 nos dois; `isSearchableMarket(country)` e a mensagem nova casam nos dois). `npx tsc --noEmit` exit 0, `npx eslint` exit 0. Sem commits para verificar — por design, os commits desta wave são do orquestrador.
