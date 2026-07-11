# Phase 2: Compliance de Email e WhatsApp - Context

**Gathered:** 2026-07-11 (modo auto — decisões = opções recomendadas, logadas na sessão)
**Status:** Ready for planning

<domain>
## Phase Boundary

Tornar o "compliant by design" verdade no código: tabela de supressão checada em draft/send (COMP-01), endpoint público de unsubscribe (COMP-02), rodapé de opt-out + headers `List-Unsubscribe` injetados por código no envio via Resend (COMP-03), e gate do WhatsApp por opt-in registrado em vez de estágio de Kanban (COMP-04). Nada de webhook inbound/bounce do Resend (v2), nada de UI de tracking/replied (Fase 3).

</domain>

<decisions>
## Implementation Decisions

### COMP-01 — Tabela de supressão
- Nova tabela `suppressions` no schema: `{ email: v.string() (normalizado lowercase/trim), orgId: v.optional(v.string()) (undefined = supressão global), source: v.string() (ex.: "unsubscribe_link", "manual", "reply_stop"), at: v.number(), leadId: v.optional(v.id("leads")) }` com índices `by_email` e `by_org_email (["orgId","email"])`.
- Normalização de email num helper puro (ex.: `normalizeEmail` em `convex/lib/domain.ts`) — testável em `tests/`.
- Checagem em AMBOS: `outreach.draft` (antes de gastar IA) e `outreach.send` (antes do POST ao Resend) — se suprimido (match por org OU global), lançar erro pt-BR claro ("Este contato pediu para não ser contatado (opt-out).").
- Mutation interna `suppressions.add` (idempotente — não duplicar email+org) + mutation autenticada `outreach.suppress` (org-scoped, origem "manual") para registrar "respondeu stop" — a UI dessa ação fica na Fase 3 junto do botão "respondeu" (mesma área do lead-detail; evita overlap).

### COMP-02 — Endpoint público de unsubscribe
- Token dedicado `unsubscribeToken` (crypto.randomUUID) gravado na row de `outreach` no `upsertDraft` (novo índice `by_unsub_token`). NÃO reutilizar o previewToken (semânticas diferentes).
- Rotas no `convex/http.ts` (mesmo router do webhook Stripe):
  - `GET /unsubscribe?token=...` — grava supressão (org-scoped do outreach + email do lead) e responde página HTML mínima de confirmação em inglês ("You've been unsubscribed. You won't hear from us again.") — sem dados do lead além do necessário, sem branding Osprano obrigatório.
  - `POST /unsubscribe?token=...` — mesmo efeito, para One-Click (RFC 8058). Idempotente: token já usado/desconhecido → responder 200 genérico (não vazar existência).
- URL base do endpoint: `process.env.CONVEX_SITE_URL` (env built-in do Convex para HTTP actions).

### COMP-03 — Rodapé de opt-out + headers (garantia por código)
- Helper puro (ex.: `optOutFooter(lang, unsubscribeUrl, senderIdentity)` em `convex/lib/` novo arquivo ou `outreachAi.ts`) retornando rodapé localizado por mercado usando o mapa `LANG` existente (`convex/lib/outreachAi.ts:5-11`): EN (GB/IE), NL, SV (SE), NO. Formato: separador `\n\n—\n` + 1–2 linhas: quem envia + link de unsubscribe. Testável com casos por idioma.
- Injeção no `draft`: o body persistido via `upsertDraft` já sai com o rodapé (cobre o fluxo manual de copiar/enviar do próprio email e o `markSent`).
- Re-garantia no `send`: antes do POST ao Resend, se o body não contém o marcador do rodapé (ex.: a URL de unsubscribe), anexar de novo — idempotente; edição do usuário nunca remove a garantia.
- Payload Resend ganha headers: `List-Unsubscribe: <{CONVEX_SITE_URL}/unsubscribe?token=...>` e `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (campo `headers` da API do Resend). Sem mailto (exige inbound; v2 GDPR-02).
- O prompt da IA continua pedindo opt-out por reply (inofensivo), mas a GARANTIA é o rodapé por código — inclusive no fallback de parse (`outreachAi.ts:88`).

### COMP-04 — Opt-in registrado para WhatsApp
- Novos campos no lead: `waOptInAt: v.optional(v.number())`, `waOptInSource: v.optional(v.string())` (ex.: "replied_email", "phone_call", "in_person").
- Mutation autenticada `leads.recordWaOptIn({ leadId, source, note? })` que grava os campos + insere evento (ampliar union de `events.type` com `v.literal("wa_opt_in")`).
- `whatsapp.sendFollowup` passa a exigir `lead.waOptInAt` (erro pt-BR: "WhatsApp só com opt-in registrado do prospect."), removendo o gate por estágio; corrigir o comentário do arquivo (hoje diz replied/converted e checa scheduled/converted).
- UI mínima nesta fase: no `WhatsAppFollowup` (`src/components/whatsapp-followup.tsx`), quando o lead não tem opt-in, mostrar botão/fluxo "Registrar opt-in" (select de origem + confirmar) antes de liberar o envio.

### Claude's Discretion
- Nome/arquivo exato dos helpers e o HTML da página de confirmação.
- Copy exata do rodapé por idioma (curta, honesta, sem hype — tom do prompt existente).
- Onde guardar `senderIdentity` do rodapé (derivar de `RESEND_FROM` é aceitável nesta fase).

</decisions>

<canonical_refs>
## Canonical References

### Projeto e requisitos
- `.planning/PROJECT.md` §Context — achados da auditoria (opt-out só no prompt; fallback sem opt-out; gate WhatsApp por Kanban)
- `.planning/REQUIREMENTS.md` §Compliance de Email, §Compliance de WhatsApp — texto normativo de COMP-01..04
- `docs/SOBRE.md` §7 — a promessa "compliant by design" que esta fase torna real

### Convenções do repo
- `AGENTS.md` — ler `node_modules/next/dist/docs/` antes de código Next (a UI do opt-in é client component; padrão já existente no repo)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LANG` map (`convex/lib/outreachAi.ts:5-11`) — idioma por mercado, reutilizar no rodapé
- `convex/http.ts` — httpRouter já montado (webhook Stripe); adicionar rotas GET/POST /unsubscribe no mesmo router
- `crypto.randomUUID()` — padrão de token já usado em `convex/previews.ts:65`
- `tests/*.test.ts` (node:test) — padrão para testes dos helpers puros (normalizeEmail, optOutFooter)
- Padrão de mutations internas + validators e erros pt-BR (`convex/outreach.ts`, `convex/workspaces.ts`)

### Established Patterns
- `outreach.draft` → `ensureForLead` (preview token) → `writeEmail` → `upsertDraft`; o rodapé entra no `upsertDraft`/draft e a re-garantia no `send`
- `send` já monta o payload Resend em `convex/outreach.ts:172-176` — adicionar `headers` ali
- Schema: índices compostos por org (`by_org_email`) seguem o padrão existente (`by_org_place`, `by_org_stage`)
- Fase 1 estabeleceu: helpers puros extraídos pra `convex/lib/` com testes; guardas centralizadas (isDemoEnabled) — seguir o mesmo estilo

### Integration Points
- `convex/schema.ts` — nova tabela `suppressions`, campos novos em `leads`, literal novo em `events.type`, índice novo em `outreach`
- `convex/outreach.ts` — draft/send/upsertDraft (COMP-01/03); NÃO tocar na parte de status/replied (Fase 3)
- `convex/whatsapp.ts` + `src/components/whatsapp-followup.tsx` (COMP-04)
- `convex/http.ts` — rotas de unsubscribe (COMP-02)
- `.env.example`/`README.md` — nenhuma env nova obrigatória (CONVEX_SITE_URL é built-in), documentar comportamento

</code_context>

<specifics>
## Specific Ideas

- Compliance não pode depender do LLM: mesmo que a IA falhe no parse (fallback `outreachAi.ts:88`), o email enviado SEMPRE sai com rodapé + headers — a garantia vive no caminho do envio.
- Endpoint de unsubscribe deve ser burro e seguro: sem auth, idempotente, resposta 200 genérica para token inválido, nada de PII na resposta.
- Fluxo manual (copiar e enviar do próprio email) também precisa do opt-out — por isso o rodapé entra no body persistido do draft, não só no send.

</specifics>

<deferred>
## Deferred Ideas

- Webhook inbound/bounce do Resend (replied/bounced automáticos + supressão por "stop" automática) — v2 (GDPR-02)
- UI do botão "registrar supressão manual" no lead-detail — Fase 3 (junto do botão "respondeu", mesma área de UI)
- mailto: no List-Unsubscribe — quando houver caixa de inbound (v2)
- Checar supressão também no re-discovery/enrichment — v2 (junto de GDPR-01)

</deferred>

---

*Phase: 02-compliance-de-email-e-whatsapp*
*Context gathered: 2026-07-11*
