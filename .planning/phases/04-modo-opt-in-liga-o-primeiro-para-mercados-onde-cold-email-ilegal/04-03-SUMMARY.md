---
phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal
plan: 03
subsystem: outreach
tags: [convex, outreach, compliance, opt-in, consentimento, ia, tdd]

# Dependency graph
requires:
  - "04-01: canContactByEmail / OPT_IN_MARKETS (domain.ts) + campos contactOptIn*/callScript* e evento contact_opt_in (schema.ts)"
provides:
  - "leads.recordContactOptIn — mutation autenticada que registra consentimento (origem + timestamp + nota no doc + evento)"
  - "internal.leads.setCallScript — persiste script + tradução no lead"
  - "outreachAi.writeCallScript(apiKey, lead) — script falado no idioma do mercado + tradução pt-BR"
  - "LANG cobre os 6 mercados opt-in (ES/IT/PT/DE/DK/CH) além dos 5 launch"
  - "outreach.callScript — action que gera e persiste o script (exige só telefone)"
  - "outreach.draft / outreach.send gateados por canContactByEmail com erro pt-BR"
affects: [crm, ui-lead-detail, compliance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Guardrail server-side por helper puro: draft/send chamam canContactByEmail(lead), nunca re-derivam mercado inline"
    - "Consentimento como base legal própria, em camada separada da supressão: canContactByEmail (posso contatar?) e isSuppressed (ele pediu para parar?) são checagens independentes e ambas permanecem"
    - "Action de IA clonada de outreach.draft: requireOrgId → getInternal → ownership → precondição própria → env key → helper de IA → internalMutation de persistência"
    - "Prompt bilíngue num único request: {script no idioma, translation pt-BR} em STRICT JSON, mesmo fallback tolerante do writeEmail"

key-files:
  created:
    - tests/outreach-lang.test.ts
  modified:
    - convex/leads.ts
    - convex/lib/outreachAi.ts
    - convex/outreach.ts

key-decisions:
  - "callScript NÃO exige consentimento nem emailabilidade — a ligação é justamente o mecanismo que conquista o consentimento; exige apenas lead.phone + ANTHROPIC_API_KEY"
  - "callScript não gera previewToken (o script é falado, não clicável) — o link da prévia só entra quando o email for liberado pelo consentimento"
  - "contactOptInNote persistido no doc do lead além do evento (diverge do recordWaOptIn legado, que só grava no evento) — §Pitfall 3 da pesquisa"
  - "recordWaOptIn mantido intacto (legado), sem migração de dados: hasWaOptIn já é OR dos dois timestamps desde a Wave 1"
  - "CH → 'German' (padrão suíço-alemão B2B); região francófona/italófona fica para depois"
  - "As duas mensagens de erro de draft/send foram unificadas no mesmo texto pt-BR acionável ('registre o consentimento…') — a antiga 'Fora do escopo compliant.' do send não dizia o que fazer"
  - "Nenhum canal 'call' na tabela outreach — telefonia integrada está fora de escopo"

requirements-completed: [OPTIN-03, OPTIN-04, OPTIN-05]

# Metrics
duration: ~12min
completed: 2026-07-22
---

# Phase 4 Plan 03: Backend do modo opt-in (consentimento, script de ligação, guardrail) Summary

**O guardrail de email sai de `lead.emailable` e passa a ser `canContactByEmail(lead)` em `draft`/`send` (com erro pt-BR que diz o que fazer), o usuário passa a registrar consentimento via `leads.recordContactOptIn` (destravando o email do lead opt-in), e nasce `outreach.callScript` — uma action de IA que gera um script de ligação no idioma do mercado + tradução pt-BR, terminando em pedido explícito de consentimento, persistido no lead.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-22
- **Tasks:** 3 (T2 em TDD: RED → GREEN)
- **Files modified:** 3 + 1 criado

## Accomplishments

- **Consentimento registrável (OPTIN-04):** `leads.recordContactOptIn` (mutation autenticada, org-scoped) grava `contactOptInAt/Source/Note` no doc do lead **e** insere o evento `contact_opt_in` com a origem/nota no meta. `recordWaOptIn` continua existindo, intocado.
- **Guardrail server-side de verdade (OPTIN-05):** `!lead.emailable` **não aparece mais** em `convex/outreach.ts` — `draft` e `send` gateiam por `canContactByEmail(lead)`. Um lead ES sem consentimento é recusado pelo servidor mesmo que a UI tentasse; depois de `recordContactOptIn`, os dois passam a funcionar.
- **Compliance da Fase 2 preservada:** as duas checagens de `isSuppressed` (draft + send), a injeção idempotente do rodapé de opt-out e os headers `List-Unsubscribe` seguem exatamente como estavam — o novo gate é adicional, não substitui a supressão.
- **Script de ligação por IA (OPTIN-03):** `writeCallScript(apiKey, lead)` monta um prompt de ~150 palavras que abre identificando o autor, cita o gap específico do lead (reusa o `SIGNAL_TEXT` module-private), menciona a prévia já pronta e **fecha pedindo permissão para enviar por email/WhatsApp**; devolve `{script, translation}` num único request (tradução pt-BR para quem não fala o idioma). Mesma estrutura de fetch/parse/fallback do `writeEmail`.
- **`outreach.callScript` gera e persiste** via `internal.leads.setCallScript` (`callScript`, `callScriptPt`, `callScriptAt`) — não regenera à toa. Exige **só** `lead.phone`: gerar script para lead sem consentimento é o ponto da fase.
- **`LANG` cobre os 6 mercados opt-in** (ES/IT/PT/DE/DK/CH) sem remover os 5 existentes, com teste de paridade que quebra automaticamente se alguém adicionar um mercado a `OPT_IN_MARKETS` sem idioma.
- **56/56 testes verdes** (54 antigos + 2 novos), typecheck e lint limpos.

## Task Commits

Commits são feitos pelo orquestrador ao fim da wave (este executor rodou sem acesso ao git, por instrução do ambiente).

1. **Task 04-03-T1: consentimento + persistência de script** — `convex/leads.ts`
2. **Task 04-03-T2: writeCallScript + LANG ampliado (TDD)** — `convex/lib/outreachAi.ts`, `tests/outreach-lang.test.ts`
3. **Task 04-03-T3: guardrail canContactByEmail + action callScript** — `convex/outreach.ts`

## Files Created/Modified

- `convex/leads.ts` — `recordContactOptIn` (mutation, logo abaixo de `recordWaOptIn`, linha 199) e `setCallScript` (internalMutation, ao lado de `applyScore`, linha 351). `recordWaOptIn`, `getInternal`, `applyScore` e o pipeline de descoberta inalterados.
- `convex/lib/outreachAi.ts` — `LANG` ampliado com `ES/IT/PT/DE/DK/CH` (comentado como bloco opt-in); `writeCallScript(apiKey, lead)` exportado, reusando `SIGNAL_TEXT`, `AnthropicResponse` e o mesmo endpoint/headers/model (`claude-sonnet-5`, `max_tokens: 800`), com fallback `{script: text, translation: text}` se o JSON vier malformado. `writeEmail` intocado.
- `convex/outreach.ts` — imports de `canContactByEmail` e `writeCallScript`; os dois gates `!lead.emailable` trocados por `!canContactByEmail(lead)` com a mesma mensagem pt-BR; nova action `callScript` (linha 173) entre `draft` e `markSent`; docstring de `draft` atualizada para refletir o novo gate.
- `tests/outreach-lang.test.ts` *(novo)* — paridade `LANG` × `OPT_IN_MARKETS` + asserção explícita de `LANG.CH === "German"`.

## Decisions Made

- **`callScript` sem gate de consentimento/supressão.** Bloquear a geração do script por falta de consentimento inverteria a lógica da fase (é a ligação que conquista o consentimento). Precondição real = ter telefone. Isso está alinhado com §Anti-Patterns da pesquisa.
- **`callScript` sem `previews.ensureForLead`.** O script é falado; um token de prévia só faz sentido quando existe canal clicável. Evita criar preview para lead que talvez nunca dê consentimento.
- **Mensagem de erro unificada e acionável.** `send` antes dizia só "Fora do escopo compliant."; agora os dois caminhos dizem "Mercado opt-in: registre o consentimento do prospect antes de enviar email." — o usuário sabe qual é o próximo passo. (Ver Divergência 1: isso muda o texto visto em um caso não-opt-in também.)
- **Sem zod, sem parser novo.** O fallback tolerante do `writeEmail` foi copiado literalmente — comportamento previsível e uma única forma de lidar com resposta fora do JSON.

## Deviations from Plan

**1. [Implementação, deliberada] A mensagem de erro nova cobre também o caso "autônomo/pessoa nomeada" em mercado opt-out**
- **Onde:** `convex/outreach.ts`, gates de `draft` e `send`.
- **O quê:** o plano manda usar o mesmo texto ("Mercado opt-in: registre o consentimento…") nos dois gates. Como `canContactByEmail` é falso tanto para lead de mercado opt-in **quanto** para sole-trader/pessoa nomeada em mercado opt-out, esse texto será exibido também nesse segundo caso, onde a palavra "mercado opt-in" é imprecisa.
- **Decisão:** mantido como o plano escreveu (o texto é acionável nos dois casos — registrar consentimento realmente destrava os dois), mas fica registrado como candidato a refino de copy se aparecer na validação manual.

**2. [Ambiente] `npx convex codegen` PULADO** (pedido nos `<verify>` das tasks T1/T3 e na `<verification>`)
- **Motivo:** o deployment Convex não é acessível nesta máquina ("You don't have access to the selected project"); o ambiente instruiu explicitamente a pular.
- **Por que é seguro:** `convex/_generated/api.d.ts` declara `fullApi = ApiFromModules<{ …, leads: typeof leads, outreach: typeof outreach, … }>` — os tipos de `internal.leads.setCallScript`, `api.leads.recordContactOptIn` e `api.outreach.callScript` derivam dos próprios módulos importados, então `npx tsc --noEmit` (exit 0) já validou as três referências novas ponta a ponta. Nenhum arquivo gerado precisaria mudar.
- **Pendência para o orquestrador:** rodar `npx convex codegen` + `npx convex deploy` numa máquina com acesso antes do teste manual.

**3. [Ambiente] Comandos de verificação trocados**
- `pnpm test/typecheck/lint` abortam neste terminal (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). Usados os equivalentes diretos: `node --experimental-strip-types --test tests/*.test.ts`, `npx tsc --noEmit`, `npx eslint`. Mesmo escopo, mesmo resultado.
- Nenhum comando git foi executado (commits ficam com o orquestrador), então este SUMMARY não traz hashes.

**Total deviations:** 1 de implementação (deliberada, documentada), 2 de procedimento (ambiente).
**Impact on plan:** nenhum critério de aceite ficou por verificar — todos foram checados com grep real (tabela abaixo).

## Verification

| Critério | Resultado |
|---|---|
| `node --test tests/*.test.ts` | `tests 56 / pass 56 / fail 0` (inclui "LANG cobre todos os mercados opt-in" e "CH usa alemão") |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` | exit 0, zero erros/warnings |
| `grep "export const recordContactOptIn = mutation" convex/leads.ts` | casa (linha 199) |
| `grep "export const setCallScript = internalMutation" convex/leads.ts` | casa (linha 351) |
| `grep 'type: "contact_opt_in"' convex/leads.ts` | casa (linha 217) |
| `grep "contactOptInNote: note" convex/leads.ts` | casa (linha 213) |
| `grep -c "export const recordWaOptIn" convex/leads.ts` | 1 (legado intacto) |
| `grep "export async function writeCallScript" convex/lib/outreachAi.ts` | 1 |
| `ES: "Spanish"` / `IT: "Italian"` / `PT: "Portuguese"` / `DE: "German"` / `DK: "Danish"` / `CH: "German"` | 1 cada |
| `grep -c "!lead.emailable" convex/outreach.ts` | **0** (os dois gates migraram) |
| `grep -c "canContactByEmail(lead)" convex/outreach.ts` | **2** (draft + send) |
| `grep "Mercado opt-in: registre o consentimento…" convex/outreach.ts` | casa 2× (linhas 145 e 276) |
| `grep "export const callScript = action" convex/outreach.ts` | casa (linha 173) |
| `grep "internal.leads.setCallScript" convex/outreach.ts` | casa (linha 184) |
| `grep -c "isSuppressed" convex/outreach.ts` | **2** (supressão em draft e send intacta) |

## Issues Encountered

Nenhum bloqueio. Um efeito colateral **intencional e esperado** vale registro para as waves de UI: `outreach.outbox` ainda expõe `emailable: lead.emailable ?? false` (linha 62), que agora é uma informação *mais estreita* que o gate real. Telas que decidem se mostram o botão "Escrever" por `lead.emailable` vão divergir do servidor (mostrar bloqueado um lead que já tem consentimento) — a correção pertence aos planos de UI (04-04/05/06), que são os donos desses arquivos; nada foi tocado fora dos `files_modified` deste plano.

## User Setup Required

- `ANTHROPIC_API_KEY` no deployment Convex (mesma chave já usada por `outreach.draft` — nenhuma nova credencial).
- `npx convex codegen` + `deploy` numa máquina com acesso ao deployment (ver Divergência 2) antes do teste manual do `verify-work`.

## Next Phase Readiness

- Backend do modo opt-in completo: as waves de UI já podem chamar `api.leads.recordContactOptIn`, `api.outreach.callScript` e ler `lead.callScript`/`callScriptPt`/`callScriptAt`/`contactOptIn*`.
- Verificação manual pendente (exige `ANTHROPIC_API_KEY` + deployment): lead ES → script em espanhol com tradução pt-BR terminando em pedido de consentimento; `draft`/`send` de lead ES sem consentimento → erro pt-BR; após `recordContactOptIn` → `draft` funciona.
- Sugestão para as waves de UI: usar `canContactByEmail(lead)` (helper puro, importável do front pelo alias `@convex/*`) em vez de `lead.emailable` ao decidir habilitar o composer.

---
*Phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal*
*Completed: 2026-07-22*

## Self-Check: PASSED

Os 4 arquivos (3 modificados + 1 criado) existem em disco com o conteúdo esperado — verificado por grep, tabela acima. Hashes de commit não se aplicam: por instrução do ambiente, nenhum comando git foi executado; os commits são responsabilidade do orquestrador.
