---
phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal
plan: 04
subsystem: compliance
tags: [compliance, i18n, outreach, email, opt-in]

# Dependency graph
requires:
  - phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal (plan 01)
    provides: "OPT_IN_MARKETS + canContactByEmail (consentimento destrava o email do lead opt-in)"
  - phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal (plan 03)
    provides: "LANG ampliado (ES/IT/PT/DE/DK/CH) em convex/lib/outreachAi.ts"
provides:
  - "FOOTER_COPY com 9 idiomas (English/Dutch/Swedish/Norwegian + Spanish/Italian/Portuguese/German/Danish)"
  - "Paridade total LANG↔FOOTER_COPY: nenhum idioma produzido pelo LANG cai no fallback inglês"
affects: [outreach, compliance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FOOTER_COPY segue keyed por NOME de idioma (Spanish/Italian/…), casando com os valores do LANG — os dois mapas seguem independentes (decisão da Fase 3), a paridade é mantida por teste, não por acoplamento de código"

key-files:
  created: []
  modified:
    - convex/lib/compliance.ts
    - tests/compliance.test.ts

key-decisions:
  - "Rodapé do mercado PT escrito em pt-PT sob a chave 'Portuguese' — distinto do pt-BR usado na UI interna da Duda"
  - "CH usa o rodapé 'German' (mesma escolha do LANG em 04-03); regiões francófona/italófona ficam para depois"
  - "optOutFooter e senderIdentityFrom permanecem intocados: o fallback inglês para idioma desconhecido continua sendo o comportamento de segurança (COMP-03 nunca deixa de sair rodapé)"

patterns-established: []

requirements-completed: [OPTIN-04]

# Metrics
duration: 4min
completed: 2026-07-22
---

# Phase 4 Plan 04: Rodapé de opt-out localizado nos mercados opt-in Summary

**`FOOTER_COPY` ganhou Spanish/Italian/Portuguese/German/Danish, fechando a lacuna de paridade `LANG`↔`FOOTER_COPY` (Pitfall 2 da pesquisa): um lead ES/IT/PT/DE/DK/CH destravado por consentimento agora recebe corpo E rodapé de opt-out no idioma do mercado, com o fallback inglês preservado para idioma desconhecido.**

## Performance

- **Duration:** ~4 min
- **Completed:** 2026-07-22T15:33:34Z
- **Tasks:** 1 (TDD: RED → GREEN, sem refactor)
- **Files modified:** 2

## Accomplishments
- 5 entradas novas em `FOOTER_COPY` (`convex/lib/compliance.ts`), seguindo o mesmo padrão das 4 existentes: abre com `\n\n—\n`, cita o remetente, faz a pergunta e traz o verbo local de descadastro + a url.
- 5 casos de teste novos em `tests/compliance.test.ts`, no mesmo estilo dos existentes; o caso de fallback "unknown language falls back to English" continua verde.
- Paridade verificada programaticamente contra o `LANG` real de `convex/lib/outreachAi.ts`: os 9 valores distintos que o `LANG` produz (English, Dutch, Swedish, Norwegian, Spanish, Italian, Portuguese, German, Danish) têm rodapé próprio — **nenhum** cai mais no inglês por omissão.
- `optOutFooter`, `senderIdentityFrom` e as 4 entradas antigas ficaram byte-a-byte inalterados.

## Task Commits

Este executor rodou sob instrução explícita de **não executar nenhum comando git** — os commits são feitos pelo orquestrador ao fechar a wave.

1. **Task 04-04-T1: FOOTER_COPY nos 5 idiomas novos (com testes)** - alterações aplicadas no working tree, commit pendente no orquestrador (esperado: `feat(04-04)`)

**Plan metadata:** este SUMMARY entra no commit de fechamento da wave.

## Files Created/Modified
- `convex/lib/compliance.ts` - `FOOTER_COPY` passa de 4 para 9 idiomas; adicionadas as chaves `Spanish`, `Italian`, `Portuguese`, `German`, `Danish` (linhas 13-17), com comentário explicando a origem (OPTIN-04) e a nota pt-PT vs pt-BR
- `tests/compliance.test.ts` - 5 testes novos (`optOutFooter: Spanish/Italian/Portuguese/German/Danish copy`) inseridos antes do teste de fallback, que continua passando

## Decisions Made
- Copy do rodapé PT em **pt-PT** (mercado português), não pt-BR — o pt-BR do repo é a língua da UI interna, não a do lead.
- CH herda o rodapé alemão, espelhando a escolha já feita no `LANG` (04-03), para não criar uma terceira fonte de verdade sobre idioma por país.
- Os dois mapas (`LANG` em `outreachAi.ts` e `FOOTER_COPY` em `compliance.ts`) seguem **independentes**, como decidido na Fase 3 — a paridade é garantida por teste, não por import cruzado. Isso mantém `compliance.ts` sem dependências.

## Deviations from Plan

Nenhuma divergência de implementação — o plano foi executado exatamente como escrito (o `<action>` trazia o código literal, aplicado sem alteração além de um comentário explicativo acima do bloco novo).

Ajustes de **procedimento** impostos pelo ambiente (não pelo plano):

1. **Comandos de verificação trocados.** O plano prescreve `pnpm test` / `pnpm typecheck`; o pnpm aborta neste terminal (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). Usados os equivalentes diretos: `node --experimental-strip-types --test tests/*.test.ts`, `npx tsc --noEmit`, `npx eslint`. Mesma cobertura, mesmo resultado.
2. **Sem comandos git.** Instrução do orquestrador — nenhum `git add`/`commit` rodado; por isso não há hashes de commit neste SUMMARY.
3. **STATE.md / ROADMAP.md não atualizados por este executor.** Outros dois agentes editam o repo em paralelo nesta wave; escrever nesses arquivos compartilhados agora causaria corrida. Fica a cargo do orquestrador ao fechar a wave.
4. **`npx convex codegen` não rodado** (deployment Convex inacessível nesta máquina). Irrelevante para este plano: `compliance.ts` é puro, não importa nada de `convex/_generated/`.

**Total deviations:** 0 de implementação, 4 de procedimento (ambiente).
**Impact on plan:** nenhum sobre o comportamento entregue.

## Verification

| Check | Comando | Resultado |
| --- | --- | --- |
| Testes (arquivo do plano) | `node --experimental-strip-types --test tests/compliance.test.ts` | pass 13 / fail 0 — os 5 casos novos + fallback verdes |
| Testes (suíte inteira) | `node --experimental-strip-types --test tests/*.test.ts` | tests 56 / pass 56 / **fail 0** |
| Typecheck | `npx tsc --noEmit` | exit 0, sem saída |
| Lint | `npx eslint` | exit 0, sem saída |
| Greps de aceite | `grep -n "Spanish:\|Italian:\|Portuguese:\|German:\|Danish:" convex/lib/compliance.ts` | 5 matches (linhas 13-17) |
| Key link | `grep -n "FOOTER_COPY\[lang\]" convex/lib/compliance.ts` | linha 21 (`FOOTER_COPY[lang] ?? FOOTER_COPY.English`) — inalterado |
| Paridade LANG↔FOOTER_COPY | script ad-hoc importando `LANG` + `optOutFooter` | "sem rodapé próprio (cairiam em inglês): **nenhum**" |

O ciclo TDD foi observado: antes da mudança em `compliance.ts`, a suíte de compliance dava **pass 8 / fail 5** (exatamente os 5 casos novos falhando); depois, **pass 13 / fail 0**.

Nota sobre a contagem da suíte: subiu de 54 para 56 entre duas execuções porque outros agentes da mesma wave estavam adicionando testes em paralelo — não há teste flaky aqui.

## Issues Encountered
Nenhum.

## User Setup Required
Nenhum — mudança puramente de copy, sem configuração externa.

## Next Phase Readiness
- OPTIN-04 fechado do lado do rodapé: o email destravado por consentimento em mercado opt-in sai integralmente no idioma do mercado (corpo via `LANG`, rodapé via `FOOTER_COPY`).
- A copy dos 5 idiomas novos foi escrita pela IA, não revisada por nativo. Antes de enviar volume real em ES/IT/PT/DE/DK vale uma revisão humana da redação (o conteúdo jurídico — quem enviou + link de descadastro — está correto; o que pode soar torto é o tom).
- O `legalReview: "pending"` dos mercados opt-in em `MARKETS` continua pendente e é o gate real de go-live desses mercados; este plano não o altera.

---
*Phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal*
*Completed: 2026-07-22*

## Self-Check: PASSED

Ambos os arquivos modificados existem em disco e contêm as mudanças alegadas (greps acima). Verificação de commits **não executável** neste executor (proibido rodar git por instrução do orquestrador) — os commits desta wave são responsabilidade do orquestrador.
