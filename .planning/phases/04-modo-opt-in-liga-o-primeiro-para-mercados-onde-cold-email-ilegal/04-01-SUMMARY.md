---
phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal
plan: 01
subsystem: domain
tags: [convex, schema, compliance, opt-in, markets, tdd]

# Dependency graph
requires: []
provides:
  - "OPT_IN_MARKETS / SEARCHABLE_MARKETS / isSearchableMarket — gate de descoberta separado do gate de cold email"
  - "canContactByEmail(lead) — emailable OU consentimento explícito destrava email"
  - "hasWaOptIn generalizado — aceita waOptInAt (legado) OU contactOptInAt"
  - "MARKETS.PT + Market.legalReview ('pending' nos 6 mercados opt-in)"
  - "CITIES_BY_COUNTRY com ES/IT/PT/DE/DK/CH"
  - "leads.contactOptInAt/Source/Note e leads.callScript/callScriptPt/callScriptAt no schema"
  - "events.type aceita 'contact_opt_in'"
affects: [discovery, outreach, crm, compliance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gate em três níveis: MARKETS (existe) ⊃ SEARCHABLE_MARKETS (posso buscar) ⊃ LAUNCH_MARKETS (posso mandar cold email) — descoberta e emailabilidade deixam de ser a mesma pergunta"
    - "Consentimento como base legal própria: canContactByEmail = isEmailable-derivado OU contactOptInAt, sem afrouxar isEmailable"
    - "Generalização retrocompatível de helper puro (hasWaOptIn passa a ser OR de dois timestamps opcionais) — nenhum call site precisou mudar"

key-files:
  created: []
  modified:
    - convex/lib/domain.ts
    - convex/schema.ts
    - tests/domain.test.ts

key-decisions:
  - "Os 6 mercados opt-in (ES/IT/PT/DE/DK/CH) nascem com legalReview: 'pending'; os 5 launch (GB/NL/IE/SE/NO) ficam sem a flag — leitura do Pitfall 6 da pesquisa, exigida pela OPTIN-06 (banner vale para a aba opt-in inteira, não só Portugal)"
  - "isEmailable / isLaunchMarket / LAUNCH_MARKETS mantidos byte-a-byte: lead de mercado opt-in continua emailable=false para sempre (invariante da OPTIN-01)"
  - "contactOptInNote é campo do doc do lead (diverge do waOptIn, que só grava nota no evento) — decisão da pesquisa §Pitfall 3"
  - "Nenhum índice novo no schema: nada nesta fase acessa os campos novos por índice"
  - "create-lead-modal.tsx e o rodapé da landing continuam em LAUNCH_MARKETS — fora do escopo desta fase (Pitfall 7)"

requirements-completed: [OPTIN-01, OPTIN-04, OPTIN-06]

# Metrics
duration: ~10min
completed: 2026-07-22
---

# Phase 4 Plan 01: Fundação do modo opt-in (domínio + schema) Summary

**`domain.ts` passa a distinguir "mercado pesquisável" (launch + opt-in, agora incluindo Portugal) de "mercado emailável" (só launch, regra intocada), ganha `canContactByEmail` (consentimento explícito como base legal própria) e um `hasWaOptIn` generalizado; o schema ganha os campos opcionais de consentimento (`contactOptIn*`), de script de ligação (`callScript*`) e o evento `contact_opt_in`.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-07-22T15:30Z
- **Tasks:** 2 (T1 em TDD: RED → GREEN)
- **Files modified:** 3

## Accomplishments
- **Descoberta desacoplada de emailabilidade:** `SEARCHABLE_MARKETS = LAUNCH_MARKETS + OPT_IN_MARKETS` e `isSearchableMarket()` existem como gate próprio. `isEmailable` continua chamando `isLaunchMarket` — nada foi afrouxado (a regressão "opt-in market always blocked" passa sem uma linha alterada).
- **Portugal entrou no mapa:** `MARKETS.PT` (opt_in, legalReview pending) + 12 cidades em `CITIES_BY_COUNTRY`, junto com ES/IT/DE/DK/CH (6 chaves novas, diacríticos preservados: Málaga, Setúbal, München, København, Zürich…).
- **Consentimento vira base legal de verdade:** `canContactByEmail({emailable, contactOptInAt})` — `emailable: true` vence sempre; um `contactOptInAt` positivo destrava email mesmo em mercado opt-in / lead não-emailável.
- **Um consentimento, dois canais:** `hasWaOptIn` agora é OR de `waOptInAt` (legado, não migrado) e `contactOptInAt`. O único call site (`convex/whatsapp.ts:19`) não precisou de nenhuma mudança — a assinatura é retrocompatível.
- **Schema pronto para as waves seguintes:** `contactOptInAt/Source/Note`, `callScript/callScriptPt/callScriptAt` e `events.type: "contact_opt_in"`, todos opcionais/aditivos → docs existentes continuam válidos, migração zero.
- **49/49 testes verdes** (44 antigos + 5 novos), typecheck e lint limpos.

## Task Commits

Commits são feitos pelo orquestrador ao fim da wave (este executor rodou sem acesso ao git, por instrução do ambiente).

1. **Task 04-01-T1: exports/helpers em domain.ts (TDD)** — `convex/lib/domain.ts`, `tests/domain.test.ts`
2. **Task 04-01-T2: campos novos no schema** — `convex/schema.ts`

## Files Created/Modified
- `convex/lib/domain.ts` — `Market.legalReview?: "pending" | "validated"`; `MARKETS.PT` novo e `legalReview: "pending"` em DE/CH/DK/IT/ES; `OPT_IN_MARKETS`, `SEARCHABLE_MARKETS`, `isSearchableMarket()`; `canContactByEmail()`; `hasWaOptIn()` generalizado; 6 chaves novas em `CITIES_BY_COUNTRY`. `LAUNCH_MARKETS`/`isLaunchMarket`/`isEmailable` inalterados.
- `convex/schema.ts` — `leads`: `contactOptInAt`, `contactOptInSource`, `contactOptInNote`, `callScript`, `callScriptPt`, `callScriptAt` (todos opcionais); `events.type`: `+ v.literal("contact_opt_in")`. Nenhum índice novo.
- `tests/domain.test.ts` — 5 casos novos (isSearchableMarket, canContactByEmail, hasWaOptIn generalizado, MARKETS.PT, legalReview em massa); teste de regressão "isEmailable: opt-in market always blocked" intocado.

## Decisions Made
- **legalReview nos 6 opt-in, não só em PT.** A pesquisa (§Pitfall 6) mostra que "os 5 atuais sem flag" = os launch opt-out; DE/CH/DK/IT/ES só agora viram pesquisáveis/contatáveis de fato, então nascem `pending`. Sem isso, o banner da OPTIN-06 apareceria só para Portugal.
- **Zero mudança em `isEmailable`.** O `if (!isLaunchMarket(...)) return false` da linha 68 é justamente o que mantém `emailable=false` em mercado opt-in. Quem quiser contatar por email nesses mercados passa por `canContactByEmail` + consentimento registrado.
- **`contactOptInNote` no doc do lead** (e não só no evento, como o waOptIn faz) — a nota da ligação precisa ser lida na UI do lead sem varrer a tabela de eventos.
- **Nada de índice novo:** os campos novos são lidos sempre a partir de um lead já carregado.

## Deviations from Plan

Nenhuma divergência de implementação — o plano foi executado como escrito. Duas divergências **de procedimento**, impostas pelas regras do ambiente desta execução (não pelo plano):

**1. [Ambiente] `npx convex codegen` foi PULADO (task T2 `<verify>` e `<verification>` do plano)**
- **Motivo:** o deployment Convex não é acessível nesta máquina ("You don't have access to the selected project"); o ambiente instruiu explicitamente a pular.
- **Por que é seguro:** `convex/_generated/dataModel.d.ts` define `export type DataModel = DataModelFromSchemaDefinition<typeof schema>` — os tipos derivam genericamente do `schema.ts` importado, então `npx tsc --noEmit` (exit 0) já valida os campos novos de ponta a ponta. Nenhum arquivo gerado precisaria mudar.
- **Pendência para o orquestrador:** rodar `npx convex codegen` + `npx convex deploy` numa máquina com acesso, antes de a Wave 2 gravar dados nos campos novos.

**2. [Ambiente] Comandos de verificação trocados**
- `pnpm test/typecheck/lint` abortam neste terminal (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). Usados os equivalentes diretos: `node --experimental-strip-types --test tests/*.test.ts`, `npx tsc --noEmit`, `npx eslint`. Mesmo escopo, mesmo resultado.
- Nenhum comando git foi executado (commits ficam com o orquestrador), então este SUMMARY não traz hashes.

**Total deviations:** 0 de implementação, 2 de procedimento (ambiente).
**Impact on plan:** nenhum critério de aceite substantivo ficou por verificar — todos foram checados com grep real (ver abaixo).

## Verification

| Critério | Resultado |
|---|---|
| `node --test tests/*.test.ts` | `tests 49 / pass 49 / fail 0` |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` | exit 0, zero erros/warnings |
| `grep -c "export function isSearchableMarket" convex/lib/domain.ts` | 1 |
| `grep -c "export function canContactByEmail" convex/lib/domain.ts` | 1 |
| `grep -c "OPT_IN_MARKETS" / "SEARCHABLE_MARKETS"` | 2 / 2 |
| `PT: { code: "PT", … coldEmail: "opt_in", legalReview: "pending" }` | presente (domain.ts:33) |
| `grep -c "isLaunchMarket(input.countryCode)" convex/lib/domain.ts` | 1 (isEmailable intacto) |
| `grep -c '^export const LAUNCH_MARKETS = \["GB", "NL", "IE", "SE", "NO"\]'` | 1 |
| `contactOptInAt/Source/Note`, `callScript/Pt/At`, `v.literal("contact_opt_in")` | 1 cada em convex/schema.ts |
| Chaves novas em CITIES_BY_COUNTRY | ES, IT, PT, DE, DK, CH (linhas 401–421) |

## Issues Encountered
Nenhum. Efeito colateral checado por grep: nenhum consumidor de `MARKETS` itera sobre todas as chaves (landing, leads e create-lead-modal iteram `LAUNCH_MARKETS`; dashboard/lead-card/lead-detail fazem lookup por código), então adicionar `PT` ao `MARKETS` não muda nenhuma tela ainda — as telas mudam nos planos seguintes, de propósito.

## User Setup Required
Nenhuma configuração de serviço externo. Só resta o `npx convex codegen`/`deploy` numa máquina com acesso ao deployment (ver Deviation 1) antes de a Wave 2 escrever nos campos novos.

## Next Phase Readiness
- Wave 1 concluída: os planos seguintes já podem importar `isSearchableMarket`, `OPT_IN_MARKETS`, `canContactByEmail` e gravar em `contactOptIn*` / `callScript*`.
- Wave 2 (descoberta em mercados opt-in) deve trocar o gate de `isLaunchMarket` por `isSearchableMarket` em `convex/places.ts:5` e `convex/foursquare.ts:5` — e **só** ali; `isEmailable` continua sendo a regra de emailabilidade.
- `src/components/crm/create-lead-modal.tsx` e o rodapé de `src/app/page.tsx` seguem restritos a `LAUNCH_MARKETS` de propósito (Pitfall 7 — fora do escopo de OPTIN-01..06).

---
*Phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal*
*Completed: 2026-07-22*

## Self-Check: PASSED

Os 3 arquivos modificados existem em disco com o conteúdo esperado (verificado por grep, tabela acima). Hashes de commit não se aplicam: por instrução do ambiente, nenhum comando git foi executado — os commits são responsabilidade do orquestrador.
