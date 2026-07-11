---
phase: 02-compliance-de-email-e-whatsapp
verified: 2026-07-11T04:29:14Z
status: passed
score: 4/4 must-haves verified
human_verification:
  - test: "Clicar no link de unsubscribe de um email real (deployment)"
    expected: "GET/POST https://<CONVEX_SITE_URL>/unsubscribe?token=... retorna 200 com a página de confirmação, e o endereço passa a constar em `suppressions`; um token lixo/reusado retorna a MESMA página (sem diferença visível)."
    why_human: "Requer deployment Convex real (CONVEX_SITE_URL) — não simulável só com grep/typecheck/testes unitários."
  - test: "Enviar um email real via Resend para um lead com row legada (sem unsubscribeToken) e inspecionar os headers recebidos"
    expected: "O email chega com o rodapé de opt-out visível no corpo E com os headers `List-Unsubscribe`/`List-Unsubscribe-Post` no payload aceitos pelo Gmail/Yahoo (bulk sender rules 2024)."
    why_human: "Requer RESEND_API_KEY/RESEND_FROM reais e inspeção de headers na caixa de entrada — fora do alcance de teste automatizado."
  - test: "Fluxo de UI 'Registrar opt-in' no CRM: abrir um lead com telefone e sem waOptInAt, selecionar origem, confirmar, e conferir que o textarea de envio aparece na sequência"
    expected: "Antes do opt-in: só o select+botão 'Registrar opt-in'. Depois de confirmar: a UI reativa (Convex) libera o textarea de envio sem reload manual."
    why_human: "Comportamento de reatividade/visual em navegador real — grep confirma o código-fonte, não a experiência renderizada."
  - test: "Enviar um WhatsApp real via sendFollowup para um lead com opt-in registrado"
    expected: "Mensagem chega no WhatsApp do número informado; para lead sem opt-in, a action rejeita com 'WhatsApp só com opt-in registrado do prospect.' mesmo movendo o card para 'Agendado'/'Convertido' no Kanban."
    why_human: "Requer WHATSAPP_TOKEN/WHATSAPP_PHONE_ID reais e um número de teste — efeito externo não simulável em teste unitário."
---

# Phase 2: Compliance de Email e WhatsApp Verification Report

**Phase Goal:** Nenhum email é enviado para endereço suprimido, existe um caminho de unsubscribe público e funcional, todo email carrega opt-out visível e o header `List-Unsubscribe`, e o WhatsApp só é acionado com opt-in explícito e registrado do prospect — tudo garantido por código, não por instrução de prompt à IA.

**Verified:** 2026-07-11T04:29:14Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                          | Status     | Evidence                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Tabela de supressão (email normalizado + escopo org/global + origem + timestamp); `draft` E `send` recusam endereços suprimidos | ✓ VERIFIED | `convex/schema.ts:167-175` (tabela `suppressions`, índices `by_email`/`by_org_email`, `orgId` opcional = global); `convex/outreach.ts:146-152` (`draft`) e `:219-223` (`send`) chamam `internal.suppressions.isSuppressed` e lançam `"Este contato pediu para não ser contatado (opt-out)."` antes de gastar IA / antes do POST ao Resend |
| 2   | Endpoint HTTP público de unsubscribe (sem auth, por token) grava supressão com confirmação; idempotente e no-leak | ✓ VERIFIED | `convex/http.ts:66-84` — GET e POST `/unsubscribe` compartilham o mesmo `httpAction`; resposta 200 HTML idêntica sempre (token válido, inválido ou ausente); `convex/suppressions.ts:55-72` (`unsubscribeByToken`) faz lookup por `by_unsub_token`, é no-op silencioso se não achar, e `addSuppression` é idempotente (checa existing antes de inserir) |
| 3   | Todo email sai com rodapé de opt-out injetado por código (mesmo no fallback de IA) + headers `List-Unsubscribe`/`List-Unsubscribe-Post`; rows legadas recebem token on-demand | ✓ VERIFIED | `convex/outreach.ts:90-127` (`upsertDraft` injeta `withOptOutFooter` no body ANTES de persistir — cobre o resultado de `writeEmail`, inclusive o fallback de parse `convex/lib/outreachAi.ts:88` que só retorna texto cru); `convex/outreach.ts:232-259` (`send` faz backfill on-demand de `unsubscribeToken` para rows sem token, re-garante o rodapé, e monta `headers: { "List-Unsubscribe": "<url>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }` no payload do Resend) |
| 4   | WhatsApp só após opt-in registrado (`waOptInAt`+`waOptInSource`+evento `wa_opt_in`); gate não é mais o estágio do Kanban, nem no backend nem no render da UI | ✓ VERIFIED | `convex/leads.ts:175-196` (`recordWaOptIn` grava campos + insere evento `type: "wa_opt_in"`); `convex/whatsapp.ts:13-21` (`sendFollowup` usa `hasWaOptIn(lead)`, sem nenhum check de `lead.stage`); `src/app/(app)/crm/page.tsx:270-281` (wrapper do `WhatsAppFollowup` condicionado só a `lead.phone`, passa `optInAt={lead.waOptInAt}`); `src/components/whatsapp-followup.tsx:44-84` (fluxo "Registrar opt-in" precede o textarea de envio quando `!optInAt`) |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `convex/schema.ts` | tabela `suppressions` + campos/índices em `outreach`/`leads`/`events` | ✓ VERIFIED | `suppressions` (167-175), `outreach.unsubscribeToken`+`by_unsub_token` (144,150), `leads.waOptInAt`/`waOptInSource` (105-106), `events.type` inclui `"wa_opt_in"` (159) |
| `convex/lib/domain.ts` | `normalizeEmail` + `hasWaOptIn` | ✓ VERIFIED | Linhas 64-71, ambos exportados e puros (sem import Convex) |
| `convex/lib/compliance.ts` | `optOutFooter` (4 idiomas + fallback) + `senderIdentityFrom` | ✓ VERIFIED | Arquivo novo, puro; `senderIdentityFrom` corrige whitespace (trim antes do match — desvio documentado no SUMMARY 02-01, coberto por teste) |
| `convex/lib/outreachAi.ts` | `LANG` exportado | ✓ VERIFIED | `export const LANG` linha 5 |
| `convex/suppressions.ts` | `addSuppression` + `add`/`isSuppressed`/`unsubscribeByToken` | ✓ VERIFIED | Todas presentes; `isSuppressed` casa org OU global (linha 50); `unsubscribeByToken` no-op para token desconhecido (linha 62) |
| `convex/outreach.ts` | checagem de supressão em draft/send, token+rodapé no upsertDraft, headers no send, mutation `suppress`, `setUnsubscribeToken` | ✓ VERIFIED | Todos os elementos presentes e wired (ver Key Links) |
| `convex/http.ts` | rotas GET+POST `/unsubscribe` no mesmo router do webhook Stripe | ✓ VERIFIED | Linhas 83-84; `/stripe/webhook` intacto (linha 22) |
| `convex/leads.ts` | mutation `recordWaOptIn` | ✓ VERIFIED | Linhas 175-196 |
| `convex/whatsapp.ts` | gate por `hasWaOptIn`, sem gate por estágio, docstring corrigida | ✓ VERIFIED | Linhas 8-11 (docstring), 19-21 (gate); nenhuma referência a `lead.stage` no arquivo |
| `src/components/whatsapp-followup.tsx` | fluxo de registrar opt-in antes do envio | ✓ VERIFIED | Linhas 44-84 (bloqueado sem `optInAt`), 86-129 (envio liberado com `optInAt`) |
| `src/app/(app)/crm/page.tsx` | wrapper gated por `lead.phone`, passa `optInAt` | ✓ VERIFIED | Linhas 270-281; único ponto de render de `WhatsAppFollowup` no app (confirmado via grep) |
| `tests/compliance.test.ts` | casos de `optOutFooter` por idioma + `senderIdentityFrom` | ✓ VERIFIED | 8 casos cobrindo English/Dutch/Swedish/Norwegian/fallback + 3 casos de `senderIdentityFrom` |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `convex/suppressions.ts:unsubscribeByToken` | `outreach.by_unsub_token` | lookup do outreach pelo token | ✓ WIRED | `.withIndex("by_unsub_token", ...)` presente e usado |
| `convex/suppressions.ts` | `convex/lib/domain.ts:normalizeEmail` | normaliza antes de gravar | ✓ WIRED | `normalizeEmail(lead.email)` na linha 66 |
| `convex/outreach.ts:draft` | `internal.suppressions.isSuppressed` | `ctx.runQuery` antes de gastar IA | ✓ WIRED | Linha 147, antes de `ensureForLead`/`writeEmail` |
| `convex/outreach.ts:send` | Resend headers | campo `headers` no JSON do POST | ✓ WIRED | Linhas 255-258, `List-Unsubscribe`/`List-Unsubscribe-Post` presentes |
| `convex/outreach.ts:upsertDraft` | `convex/lib/compliance.ts:optOutFooter` | anexa rodapé ao body persistido | ✓ WIRED | Via `withOptOutFooter` (linha 82-88), chamado na linha 105 |
| `convex/outreach.ts:send` | `internal.outreach.setUnsubscribeToken` | backfill on-demand | ✓ WIRED | Linhas 233-238 |
| `convex/http.ts:/unsubscribe` | `internal.suppressions.unsubscribeByToken` | `ctx.runMutation` com o token do query param | ✓ WIRED | Linha 69 |
| `convex/whatsapp.ts:sendFollowup` | `convex/lib/domain.ts:hasWaOptIn` | gate substitui check por `lead.stage` | ✓ WIRED | Linha 19; nenhuma referência residual a `lead.stage` |
| `src/components/whatsapp-followup.tsx` | `api.leads.recordWaOptIn` | `useMutation` no confirmar do opt-in | ✓ WIRED | Linhas 25, 68 |
| `src/app/(app)/crm/page.tsx` | `WhatsAppFollowup optInAt` | passa `lead.waOptInAt` como prop | ✓ WIRED | Linha 278 |
| `src/app/(app)/crm/page.tsx` | `WhatsAppFollowup render` | wrapper condicionado a `lead.phone` | ✓ WIRED | Linha 270 (`lead.phone && (`); nenhum `lead.stage === "scheduled"` residual no arquivo |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| COMP-01 | 02-01, 02-02 | Tabela de supressão + `draft`/`send` recusam endereços suprimidos | ✓ SATISFIED | Ver truth #1 acima; `.planning/REQUIREMENTS.md:23` marcado `[x]` |
| COMP-02 | 02-01, 02-03 | Endpoint HTTP público de unsubscribe grava supressão e confirma | ✓ SATISFIED | Ver truth #2 acima; `.planning/REQUIREMENTS.md:24` marcado `[x]` |
| COMP-03 | 02-01, 02-02 | Rodapé de opt-out + header `List-Unsubscribe` sempre presentes | ✓ SATISFIED | Ver truth #3 acima; `.planning/REQUIREMENTS.md:25` marcado `[x]` |
| COMP-04 | 02-01, 02-04 | WhatsApp só com opt-in registrado (origem+timestamp), não por estágio | ✓ SATISFIED | Ver truth #4 acima; `.planning/REQUIREMENTS.md:29` marcado `[x]` |

Sem requisitos órfãos: os 4 IDs mapeados para Phase 2 em REQUIREMENTS.md (linhas 84-87, "Complete") aparecem todos no campo `requirements` de pelo menos um plano (02-01 declara os 4; 02-02 cobre COMP-01/02/03; 02-03 cobre COMP-02; 02-04 cobre COMP-04).

### Anti-Patterns Found

Nenhum anti-pattern bloqueante ou de aviso encontrado nos arquivos tocados pela fase. Buscas por `TODO|FIXME|XXX|HACK|PLACEHOLDER` e por implementações vazias (`return null|{}|[]`, `=> {}`) nos 10 arquivos-alvo não retornaram nada além de falsos-positivos (texto de UI como "placeholder=" de `<input>`, string "Todos os mercados opt-out" contendo a substring "opt-out", e um `return null` legítimo de guarda de ownership em `outreach.getForLead`).

### Human Verification Required

Ver seção `human_verification` no frontmatter. Todos os itens dependem de deployment real (Convex + Resend + WhatsApp Business API) e não bloqueiam o status automatizado — os planos já documentavam esses smoke tests como "pós-fase, requer deployment".

### Gaps Summary

Nenhum gap encontrado. `npx convex codegen`, `pnpm typecheck`, `pnpm lint` e `pnpm test` (40/40) passam. Os 4 success criteria do ROADMAP (tabela de supressão + recusa em draft/send; endpoint de unsubscribe idempotente/no-leak; rodapé+headers sempre presentes com backfill on-demand; gate de WhatsApp por opt-in registrado, não por estágio) estão implementados no código real, testados onde testáveis por unidade, e cross-referenciados com REQUIREMENTS.md (COMP-01 a COMP-04, todos `[x] Complete`).

---

_Verified: 2026-07-11T04:29:14Z_
_Verifier: Claude (gsd-verifier)_
