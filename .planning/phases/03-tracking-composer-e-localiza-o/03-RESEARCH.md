# Phase 3: Tracking, Composer e Localização - Research

**Researched:** 2026-07-11
**Domain:** Convex mutations/auth (self-open exclusion, manual status), Convex+Next.js provider wiring, controlled-form persistence, pure i18n dictionary for a public Next.js page
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**TRCK-01 — Abertura própria não conta**
- `previews.recordOpen` (convex/previews.ts:115-142) checa `await ctx.auth.getUserIdentity()`: se há identidade E `identity.subject === preview.orgId` (o dono do workspace abrindo o próprio preview), retorna cedo — sem incrementar `openCount`, sem evento `preview_open`, sem mover estágio. Prospect real (sem sessão Clerk) → `identity` null → conta normalmente.
- Racional: a rota pública `/p/[token]` usa o mesmo ConvexProvider do app; quando o vendedor logado abre o link no próprio browser, o token de auth do Clerk acompanha a mutation — dá pra distinguir sem parâmetro especial.
- Limitação aceita e documentada em comentário: vendedor em aba anônima conta como prospect (igual a qualquer ferramenta de tracking). Modo demo (sem auth) continua contando — é o comportamento desejado para demonstração.
- `PreviewTracker` (src/components/preview-tracker.tsx) não muda.

**TRCK-02 — "Respondeu" manual + opt-out manual**
- Nova mutation autenticada `outreach.markReplied({ leadId })`: ownership check, seta `status: "replied"` e novo campo opcional `repliedAt: v.number()` na tabela outreach (schema), insere evento `type: "reply"` (literal JÁ existe na union de events — não precisa mudar).
- Não mexe no estágio do Kanban — o usuário controla o funil; replied é status do outreach.
- UI em DOIS lugares: (a) na outbox (src/app/(app)/outreach/page.tsx) — ação na linha para itens sent/opened; (b) no lead-detail aba Abordagem (src/components/crm/lead-detail.tsx) — botão junto do composer.
- Na MESMA área de UI, botão "Pediu opt-out" chamando a mutation `outreach.suppress` (criada na Fase 2, ainda sem UI) — fecha o item deferido da Fase 2. Confirmar antes de executar (é ação de compliance): um confirm simples basta.
- A query `outbox` (convex/outreach.ts) já exibe status replied — só passa a receber dados reais.

**OUTR-01 — Composer persiste o que se vê**
- Nova mutation autenticada `outreach.updateDraft({ leadId, subject, body })`: ownership check, patch em subject/body do outreach row existente (erro pt-BR se não existe draft).
- No `OutreachComposer` (src/components/outreach-composer.tsx): antes de `send` e de `markSent`, chamar `updateDraft` com o estado local — o que o usuário vê é o que sai. O "Copiar" continua copiando o estado local (e também persiste via updateDraft, pra consistência entre abas/sessões).
- O `send` (Fase 2) já re-garante rodapé de opt-out + headers de forma idempotente — edição do usuário nunca remove a garantia de compliance; NÃO duplicar essa lógica no updateDraft.
- Composer ao abrir: se já existe draft salvo (query `outreach.getForLead` já existe), abrir pré-preenchido com subject/body salvos SEM gastar IA — o botão de gerar com IA continua disponível para regenerar (sobrescreve). Evita perder edições persistidas e economiza tokens.

**L10N-01 — Preview localizado por mercado**
- Dicionário TS puro de strings do preview (novo módulo, ex.: `src/lib/preview-i18n.ts`): locales `en`, `nl`, `sv`, `no`; mapeamento por countryCode: GB→en, IE→en, NL→nl, SE→sv, NO→no, fallback `en`. O `content` do preview JÁ carrega `countryCode` (convex/previews.ts:46-54) — nenhuma mudança de schema.
- TODAS as strings hardcoded em PT de `src/components/preview-site.tsx` migram pro dicionário (hero, CTA, seções, horários, footer). O componente recebe o locale derivado de `content.countryCode`.
- `/site/[slug]` usa o mesmo componente → herda a localização de graça.
- Teste node:test do dicionário: paridade de chaves entre os 4 locales + mapeamento countryCode→locale (incl. fallback). Grep negativo garantindo zero strings PT no componente ("Venha", "Tradição", "Seg–Sáb").
- Copy: curta, honesta, tom do produto (sem hype) — coerente com o rodapé de email da Fase 2.

### Claude's Discretion
- Copy exata por idioma (nativa e natural; sueco/norueguês/holandês corretos).
- Nome do módulo i18n e shape do dicionário.
- Ícones/labels exatos dos botões "Respondeu"/"Pediu opt-out".
- Layout do preview intocado (só strings).

### Deferred Ideas (OUT OF SCOPE)
- Rate-limit/dedupe em recordOpen + parar de vazar `token` em getBySlug — v2 (SCAL-03)
- Webhooks Resend (bounce/inbound → replied/suprimido automáticos) — v2 (GDPR-02)
- Geração de preview por IA/múltiplos templates + domínio próprio — milestone Fase 3 do produto
- Filtrar `saved` na tela de Leads / métricas do dashboard — backlog de UX (fora dos 12 requisitos deste milestone)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| TRCK-01 | Abertura do preview pelo próprio vendedor não incrementa `openCount`, não gera `preview_open`, não move estágio | Verified end-to-end: `ConvexClientProvider` (src/lib/providers.tsx) is mounted at the ROOT layout (src/app/layout.tsx:38), which wraps `/p/[token]` and `/site/[slug]` (both outside `(app)`) — confirmed these routes are NOT excluded from Clerk auth propagation. Verified `ConvexProviderWithClerk` → `ConvexProviderWithAuth` internals (node_modules/convex/dist/esm/react/ConvexAuthState.js) to confirm `client.setAuth()` fires whenever Clerk reports `isSignedIn`, attaching the identity token to every subsequent mutation including `recordOpen`. Verified `requireOrgId`/orgId model (convex/model/tenant.ts) — `orgId === identity.subject` (Clerk user subject, no Clerk-Org support yet), so `identity.subject === preview.orgId` is the correct self-open check. Verified DEMO_MODE path uses plain `ConvexProvider` (no Clerk) → `ctx.auth.getUserIdentity()` always null → recordOpen always counts in demo (§Common Pitfalls documents one residual timing nuance). |
| TRCK-02 | Mutation `markReplied` grava status replied real + timestamp; UI em outbox e lead-detail | Verified `events.type` already has `"reply"` literal (convex/schema.ts:157) and `outreach.status` already has `"replied"` (convex/schema.ts:140) — additive-only schema change is just `repliedAt`. Verified `outbox` query (convex/outreach.ts:25-75) already forwards `status` as-is for non-sent/opened rows, so no branch logic needs to change for "replied" to surface — BUT found `activityAt` calc doesn't reference `repliedAt` (§Common Pitfalls, needs a one-line addition). Verified `leads.setStage`/`leads.recordWaOptIn` (convex/leads.ts:130-196) as the canonical ownership-check + patch + events-insert mutation shape to replicate. Verified `outreach.suppress` (convex/outreach.ts:192-207) already exists from Phase 2, unused by any UI — confirms it's ready to wire up as-is. |
| OUTR-01 | Composer edits persisted via `updateDraft` before send/markSent/copy; pre-fill from existing draft | Verified `outreach.getForLead` (convex/outreach.ts:11-22) returns the full `Doc<"outreach">` (subject/body/status/etc.) — exact shape for pre-fill. Verified `send` action (convex/outreach.ts:210-269) already reads `row.subject`/`row.body` fresh from `api.outreach.getForLead` at send time — confirms `updateDraft` writing to the same row is sufficient, no `send` changes needed. Verified `upsertDraft` (convex/outreach.ts:90-127) as the footer-injection precedent NOT to duplicate in `updateDraft` (per CONTEXT.md). |
| L10N-01 | Preview renders in market language; zero hardcoded PT strings | Full line-by-line inventory of every PT string in `src/components/preview-site.tsx` completed (§Common Pitfalls / §Code Examples) — 11 distinct hardcoded PT strings across header, hero, highlights, contact section, footer. Confirmed `PreviewContent.countryCode` (src/components/preview-site.tsx:10) is already passed through from `convex/previews.ts:46-54`/`152-160` untouched — no schema/backend change needed. Confirmed `preview-site.tsx` has no `"use client"` directive (pure server-renderable component) and zero `aria-label`/`alt` attributes currently exist (nothing extra to translate there). Confirmed existing `tests/compliance.test.ts` per-language dictionary pattern (from Phase 2's `optOutFooter`) as the direct precedent for the new i18n dictionary's test shape. |
</phase_requirements>

## Summary

This phase is four small, mostly-independent Convex + Next.js changes on top of an already-functional codebase — no new library, no schema redesign, no new routes. The riskiest-looking item (TRCK-01) turned out to be the most thoroughly verifiable: reading `src/app/layout.tsx`, `src/lib/providers.tsx`, and Convex's own `ConvexProviderWithClerk`/`ConvexProviderWithAuth` source directly (not from training-data memory) confirms the locked design works exactly as CONTEXT.md describes — `/p/[token]` and `/site/[slug]` are rendered outside the `(app)` route group but *inside* the root layout, which is where `ConvexClientProvider` (and, outside demo mode, `ClerkProvider`) is mounted. So a vendor with an active Clerk browser session gets an authenticated Convex mutation call when opening their own preview link, and `ctx.auth.getUserIdentity()` in `recordOpen` resolves their identity; a prospect with no Clerk session gets `identity === null` and the open counts normally. This holds in demo mode too, by construction: `ConvexClientProvider` swaps in a plain `ConvexProvider` (no Clerk) when `NEXT_PUBLIC_DEMO=1`, so `getUserIdentity()` is always null and every demo open counts — exactly the desired demo behavior, requiring zero extra code.

TRCK-02 and OUTR-01 both touch `convex/schema.ts` and `convex/outreach.ts` (as STATE.md's blockers/concerns note already flags) and should land together or in sequenced waves to avoid rebase churn on the same file. The two new mutations (`markReplied`, `updateDraft`) are straight copies of the existing ownership-check-then-patch-then-events-insert shape already used four times in this codebase (`leads.setStage`, `leads.recordWaOptIn`, `outreach.markSent`, `outreach.suppress`) — no new pattern to invent. One consequential detail neither requirement doc mentions explicitly: `outbox`'s `activityAt` field (used for the "respondeu Xmin atrás" timestamp in the outbox table) doesn't currently read any reply-related field, so once `markReplied` starts writing real `repliedAt` timestamps, the outbox query needs a one-line addition to surface and prioritize it — otherwise "replied" rows will keep showing their open/send time instead of their actual reply time.

L10N-01 is the most mechanical of the four and fully disjoint from the other three (touches only `preview-site.tsx` + one new file). The full PT string inventory is complete (11 strings, listed below with line numbers); none are `aria-label`/`alt` (there are none in this file today). `PreviewContent.countryCode` is already threaded through from both preview-generation paths (`generate`/`ensureForLead`/`publish` in `convex/previews.ts`), so the dictionary only needs a `countryCode → locale` map and one lookup at the top of `PreviewSite`.

**Primary recommendation:** Implement TRCK-01 as a 4-line early-return guard inside the existing `recordOpen` mutation body (no new mutation, no client change); implement TRCK-02/OUTR-01 as two new authenticated mutations following the exact ownership-check-then-patch shape already used by `leads.setStage`/`outreach.markSent`, landed together with the `repliedAt` schema field and the `outbox` activityAt fix in the same wave; implement L10N-01 as a single new pure dictionary module (`src/lib/preview-i18n.ts`, no Convex/React import) consumed by `PreviewSite`, tested with the same per-language `node:test` pattern Phase 2 established for `optOutFooter`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| convex | ^1.42.1 (installed, current) | Mutations/queries, `ctx.auth.getUserIdentity()`, schema | Already the project's backend; `getUserIdentity()`/`setAuth()` behavior verified directly against installed package source (`node_modules/convex/dist/esm/react/ConvexAuthState.js`, `.../react-clerk/ConvexProviderWithClerk.js`) |
| @clerk/nextjs | ^7.5.16 (installed; 7.5.17 is latest on npm, patch-level, no action needed) | `ClerkProvider`, `useAuth()` feeding `ConvexProviderWithClerk` | Already the project's auth provider; already mounted at root layout, already covers the public preview routes (verified, not assumed) |
| node:test + node:assert/strict | Node ≥22.12 built-in | Unit tests for the new `preview-i18n` dictionary | Same harness Phase 1/2 used for every pure-function module (`domain.test.ts`, `compliance.test.ts`) — no framework install needed |
| react-icons/md | ^5.7.0 (installed) | Icons for the two new buttons ("Respondeu"/"Pediu opt-out") | Already the only icon set imported anywhere in `src/components` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| — | — | — | No supporting library needed. All four requirements are additive changes to existing Convex functions/React components using only what's already installed. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled `Record<Locale, Dict>` TS module for L10N-01 | `next-intl` / `next-i18next` | Explicitly ruled out in `additional_context` ("i18n = dicionário TS puro, NADA de next-intl"); the preview page has exactly one component and ~11 strings — a routing/middleware-based i18n framework is heavy machinery for a single localized component driven by a `countryCode` field that already exists on the data, not the URL |
| `window.confirm()` for the "Pediu opt-out" compliance confirmation | A custom modal/dialog component | No confirm/modal pattern exists anywhere in this codebase yet; CONTEXT.md explicitly says "confirm simples basta" — native `window.confirm()` is zero-dependency, zero-new-component, and matches the stated bar exactly. A custom dialog would be scope creep for this phase. |

**Installation:**
```bash
# No install needed — everything required is already a dependency or a runtime built-in.
```

**Version verification:**
```bash
$ npm view convex version
1.42.1   # matches installed ^1.42.1 — current
$ npm view @clerk/nextjs version
7.5.17   # installed ^7.5.16 — patch behind, not required for this phase, no breaking API change in ConvexProviderWithClerk/useAuth surface between these
```
Both verified 2026-07-11 against the npm registry.

## Architecture Patterns

### Recommended Project Structure (additions only)
```
convex/
├── schema.ts              # + outreach.repliedAt (v.optional(v.number()))
├── outreach.ts             # + markReplied mutation, + updateDraft mutation
│                            # outbox: activityAt fallback chain gains repliedAt
├── previews.ts              # recordOpen: + self-open early-return guard (4 lines)
src/
├── lib/
│   └── preview-i18n.ts      # NEW — pure dictionary + localeForCountry()
├── components/
│   ├── preview-site.tsx     # strings replaced by dict[locale].xxx lookups
│   ├── outreach-composer.tsx # + pre-fill from getForLead, + updateDraft calls, + "Regenerar" state
│   └── crm/lead-detail.tsx   # ApproachTab: + "Respondeu"/"Pediu opt-out" buttons
├── app/(app)/outreach/page.tsx  # + row action for sent/opened items
tests/
├── outreach-i18n.test.ts    # NEW (or src/lib co-located) — key-parity + countryCode→locale mapping
```

### Pattern 1: Self-open exclusion inside `recordOpen` (TRCK-01)
**What:** Check `ctx.auth.getUserIdentity()` at the top of the existing public `recordOpen` mutation; if the caller is authenticated AND is the workspace owner, return before any write.
**When to use:** TRCK-01 — this is the entire fix, no new mutation, no client change (`PreviewTracker` unmodified per CONTEXT.md lock).
**Verified via:** direct read of `convex/model/tenant.ts` (`requireOrgId` returns `identity.subject`, confirming `orgId` IS the Clerk subject in this MVP's tenant model) + `convex/previews.ts:46-54` (`preview.orgId` is set from the same `requireOrgId`/`lead.orgId` at generation time).
**Example:**
```typescript
// convex/previews.ts — recordOpen, early-return guard added at the top of the handler
export const recordOpen = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const preview = await ctx.db
      .query("previews")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!preview) return;

    // TRCK-01: the workspace owner opening their own preview (logged into the
    // app in the same browser) must not count as a prospect signal. A real
    // prospect never has a Clerk session, so identity is null for them.
    // Known accepted limitation: an anonymous/incognito tab by the owner still
    // counts as a prospect open (same as any tracking tool).
    const identity = await ctx.auth.getUserIdentity();
    if (identity && identity.subject === preview.orgId) return;

    const now = Date.now();
    await ctx.db.patch(preview._id, { openCount: preview.openCount + 1, lastOpenedAt: now });
    // ...unchanged
  },
});
```

### Pattern 2: Ownership-check-then-patch-then-event mutation (TRCK-02)
**What:** The exact shape already used 3 times in this codebase — `requireOrgId` → `ctx.db.get(leadId)` ownership check (pt-BR error) → `ctx.db.patch` → `ctx.db.insert("events", ...)`.
**When to use:** `outreach.markReplied` — but note it operates on the `outreach` row (looked up `by_lead`), not the `leads` row, so it follows `outreach.markSent`'s shape specifically (query row by lead, patch if found), not `leads.setStage`'s (patch the lead directly).
**Example:**
```typescript
// convex/outreach.ts — new mutation, same file, same pattern as markSent (line 172-189)
export const markReplied = mutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    const row = await ctx.db
      .query("outreach")
      .withIndex("by_lead", (q) => q.eq("leadId", leadId))
      .first();
    if (!row) throw new Error("Nenhuma abordagem encontrada para este lead.");
    const now = Date.now();
    await ctx.db.patch(row._id, { status: "replied", repliedAt: now });
    await ctx.db.insert("events", { orgId, type: "reply", leadId, at: now });
    return { repliedAt: now };
  },
});
```
Note: `markSent` (existing) silently no-ops if no `outreach` row exists; `markReplied` is recommended to *throw* instead (§Open Questions) since both of its UI call sites (outbox row action, lead-detail Abordagem tab) only render once a row already exists, so a thrown error here would only ever fire on a genuine bug, not a normal user path — cheap defensive consistency, matching `send`'s style of explicit pt-BR errors.

### Pattern 3: `updateDraft` — same-shape patch mutation, no footer duplication (OUTR-01)
**What:** Patch `subject`/`body` on the existing `outreach` row. Deliberately does NOT call `withOptOutFooter` (that's `upsertDraft`'s and `send`'s job per Phase 2 — CONTEXT.md explicitly says don't duplicate it here).
**Example:**
```typescript
// convex/outreach.ts — new mutation
export const updateDraft = mutation({
  args: { leadId: v.id("leads"), subject: v.string(), body: v.string() },
  handler: async (ctx, { leadId, subject, body }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    const row = await ctx.db
      .query("outreach")
      .withIndex("by_lead", (q) => q.eq("leadId", leadId))
      .first();
    if (!row) throw new Error("Nenhum rascunho encontrado para este lead.");
    await ctx.db.patch(row._id, { subject, body });
  },
});
```
Called from the composer before `send`/`markSent`, and also from "Copiar" (fire-and-forget, non-blocking is acceptable there per CONTEXT.md — the button's own action is the clipboard copy).

### Pattern 4: Composer pre-fill without clobbering in-progress edits (OUTR-01)
**What:** `OutreachComposer` currently seeds `subject`/`body` state ONLY from the `draft` action's return value (line 46-49). To pre-fill from an *existing* saved draft on mount, add `useQuery(api.outreach.getForLead, { leadId })` and hydrate local state exactly once, guarded by a ref — otherwise every reactive re-render of the query (e.g., after `updateDraft` itself persists, or another browser tab edits the same row) would silently overwrite whatever the user is mid-typing.
**Example:**
```typescript
// src/components/outreach-composer.tsx
const existing = useQuery(api.outreach.getForLead, { leadId });
const hydrated = useRef(false);

useEffect(() => {
  if (hydrated.current || existing === undefined) return; // still loading
  hydrated.current = true;
  if (existing && (existing.subject || existing.body)) {
    setSubject(existing.subject ?? "");
    setBody(existing.body ?? "");
    setOpen(true); // pre-filled, no AI call spent
  }
}, [existing]);
```
The AI "Escrever com IA"/"Regenerar com IA" button keeps setting state directly from the action's return value (unchanged codepath) — it does not need to go through this hydration guard, since it's an explicit user-triggered overwrite, not a reactive one.

### Pattern 5: Pure locale dictionary keyed by market (L10N-01)
**What:** A `Record<Locale, Dict>` plus a small `countryCode → Locale` lookup, mirroring the shape Phase 2 already established for `optOutFooter`'s `FOOTER_COPY` (`convex/lib/compliance.ts`) — except this one lives under `src/lib/` (consumed by a React component, not a Convex function) and has more keys (11 strings vs. one footer template).
**Example:** see §Code Examples below (full dictionary + `PreviewSite` usage).

### Anti-Patterns to Avoid
- **Changing `PreviewTracker` or adding a query param to distinguish "self" opens:** locked out by CONTEXT.md — the identity-based check inside `recordOpen` is sufficient and simpler; do not add a `?self=1`-style parameter or a client-side `useUser()` check that skips calling `recordOpen` at all (that would also skip the mutation for legitimate demo-mode "self" testing, which per CONTEXT.md should still count).
- **Duplicating the opt-out footer logic inside `updateDraft`:** `send` already re-guarantees the footer/headers idempotently (Phase 2); `updateDraft` should be a plain patch — the footer is re-verified downstream regardless of what the user typed.
- **Reusing `convex/lib/outreachAi.ts`'s `LANG` map (full language names like `"Swedish"`) for L10N-01's locale codes:** that map serves a different concern (AI prompt language / compliance footer language) and its values (`"English"`, `"Dutch"`, `"Swedish"`, `"Norwegian"`) aren't ISO locale codes. Build a small, independent `countryCode → "en"|"nl"|"sv"|"no"` map in the new module instead of trying to derive one from `LANG`.
- **Translating `MARKETS` (convex/lib/domain.ts) country names:** those are for the internal CRM UI (which stays Portuguese, per the rest of the app) — do not confuse them with the public preview's localization; they are unrelated to L10N-01.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting whether the current Convex caller is the workspace owner | A new "isOwner" helper, a passed-in flag from the client, or a session cookie check | `ctx.auth.getUserIdentity()` compared to `preview.orgId` (already the pattern `requireOrgId` establishes project-wide) | The identity is already cryptographically verified by Convex/Clerk's JWT flow before it reaches the mutation handler — reinventing this with a client-supplied flag would be trivially spoofable by anyone with devtools |
| Confirming a destructive/compliance action | A custom modal/dialog component | `window.confirm()` | Zero dependency, matches CONTEXT.md's explicit "confirm simples basta"; no existing dialog primitive in this codebase to reuse or extend |
| Locale-aware string dictionary for 4 markets / ~11 strings | `next-intl`, `next-i18next`, `react-i18next`, ICU MessageFormat | A plain `Record<Locale, Dict>` TS object, same shape as Phase 2's `FOOTER_COPY` | Explicitly ruled out by `additional_context` ("NADA de next-intl"); no plurals/ICU formatting needed (all interpolation is simple template literals), no URL-based routing needed (locale is derived from lead data, not the URL) |

**Key insight:** Every one of this phase's four requirements is solvable by extending an existing, already-proven pattern in this exact codebase (auth-identity check, ownership-check-then-patch mutation, reactive-query-with-hydration-guard, per-language `Record` dictionary) — there is no case here where a new abstraction or dependency earns its cost.

## Common Pitfalls

### Pitfall 1: `outbox`'s `activityAt` doesn't read `repliedAt` (TRCK-02 — new finding, not mentioned in CONTEXT.md)
**What goes wrong:** After `markReplied` starts writing real `repliedAt` timestamps, the outbox table's "respondeu Xmin atrás" text (src/app/(app)/outreach/page.tsx:133-134, using `it.activityAt`) will keep showing the *previous* open/send time, not the actual reply time, because `outbox`'s `activityAt` calc (convex/outreach.ts:68) is `row.openedAt ?? lastOpenedAt ?? row.sentAt ?? row._creationTime` — it has no `repliedAt` term at all.
**Why it happens:** `repliedAt` doesn't exist yet in the pre-Phase-3 codebase, so the fallback chain was never extended for it; easy to add `markReplied` and assume "the outbox already shows replied status" (true) covers timing too (it doesn't).
**How to avoid:** In the same wave as `markReplied`, add `row.repliedAt` to the front of the `activityAt` fallback chain and return it explicitly from `outbox` (e.g. `repliedAt: row.repliedAt ?? null`) so the row action / any future UI can also read it directly.
**Warning signs:** A lead marked "replied" today still shows "abriu 3h atrás" in the outbox instead of "respondeu agora mesmo".

### Pitfall 2: Naive `useEffect` hydration clobbers composer edits (OUTR-01)
**What goes wrong:** A `useEffect(() => { if (existing) { setSubject(existing.subject); setBody(existing.body) } }, [existing])` without a one-time guard will re-run and silently overwrite the user's in-progress typing every time the reactive query result object identity changes (Convex `useQuery` returns a new object reference on every server-side patch, including the ones `updateDraft` itself triggers).
**Why it happens:** `useQuery` is reactive by design — great for "always fresh" reads, dangerous for "seed local editable state once" reads if not explicitly guarded.
**How to avoid:** Guard with a `useRef` boolean that's set once real data is used to seed state (Pattern 4 above) — mirrors the existing `fired` ref guard already used in `PreviewTracker` for a different one-time-effect purpose.
**Warning signs:** Typing in the composer, then anything else in the app calling `updateDraft`/`draft` for that same lead (e.g. a second browser tab) makes the textarea's cursor jump / content reset.

### Pitfall 3: `markReplied`/`updateDraft` called on a lead with no `outreach` row yet
**What goes wrong:** Both new mutations look up the `outreach` row `by_lead` — if none exists (composer never opened, no draft ever generated), a naive `ctx.db.patch(row._id, ...)` throws a confusing runtime error (`row` is `undefined`, `.patch(undefined._id, ...)`).
**Why it happens:** CONTEXT.md doesn't specify handling for the missing-row case for `markReplied` (it does for `updateDraft`: "erro pt-BR se não existe draft").
**How to avoid:** Explicit `if (!row) throw new Error("...")` pt-BR guard in both mutations (Pattern 2/3 above) rather than a silent no-op (`markSent`'s existing precedent) — this phase's UI entry points only ever call these when a row already exists, so an explicit error surfaces bugs instead of hiding them.
**Warning signs:** None in normal use if the guard is added; without it, a stray call from devtools/an edge case in a future UI change would throw an unhelpful native TypeError instead of a clear pt-BR message.

### Pitfall 4: Residual timing nuance in TRCK-01's self-open guard (documented for awareness, not actionable this phase)
**What goes wrong:** `PreviewTracker` fires `recordOpen` immediately on mount via a `useRef`-guarded `useEffect` (src/components/preview-tracker.tsx:12-16). `ConvexProviderWithAuth`'s internals (verified in `node_modules/convex/dist/esm/react/ConvexAuthState.js:82-97`) only call `client.setAuth(fetchAccessToken, ...)` once Clerk's `useAuth()` reports `isSignedIn === true` — if the mutation fires before Clerk finishes resolving the browser session (a real, if usually sub-second, race), the vendor's own preview open could go out *unauthenticated*, i.e., indistinguishable from a real prospect, on that specific page load.
**Why it happens:** `useMutation`'s returned function is called eagerly on mount; it does not itself wait for `useConvexAuth().isLoading` to become `false` before sending.
**How to avoid (if verification later shows this leaking through):** Gate the effect in `PreviewTracker` on `useConvexAuth().isLoading === false` (exported from `convex/react`, already installed) before firing. **This is explicitly NOT part of this phase's plan** — CONTEXT.md locks `PreviewTracker` as unchanged. Documented here only so `/gsd:verify-work` and manual QA know to specifically test "vendor logged in, same tab, open own preview link, refresh a few times" rather than assume the identity check alone is sufficient in all timing conditions.
**Warning signs:** In manual QA, the vendor's own preview open occasionally (not always) still increments `openCount` / moves the lead to `approached`.

### Pitfall 5: Missed PT strings in `preview-site.tsx` after refactor (L10N-01)
**What goes wrong:** Partial migration leaves a stray hardcoded PT string (easy to miss inside a ternary or template literal).
**Why it happens:** The component mixes static JSX text, ternary-conditional text, and interpolated template literals — a search-and-replace pass can miss the ternary branches.
**How to avoid:** Use the full inventory below (§Code Examples) as a checklist; finish with the grep-negative acceptance criteria CONTEXT.md specifies: `grep -n "Venha\|Tradição\|Seg–Sáb" src/components/preview-site.tsx` must return nothing.
**Warning signs:** `pnpm test`'s new negative-grep test (or a manual grep) still matches after the refactor.

## Code Examples

### Full PT string inventory — `src/components/preview-site.tsx` (11 strings, current line numbers)
```
L40   "Ligar"                                                    — header CTA (phone icon button)
L66-67 "Tradição, atendimento próximo e a confiança de quem já
       conhece. Reserve, ligue ou passe para conhecer."           — hero subtitle
L78   "Ligar agora"                                               — hero primary CTA
L85   "WhatsApp"                                                  — hero secondary CTA (proper noun — keep as-is, it's not Portuguese)
L97   "avaliações"                                                — review count suffix (interpolated: `· {reviewsCount} avaliações`)
L109  "Qualidade" / "Feito com cuidado, do começo ao fim."         — highlight card 1 (title/body)
L110  "Atendimento" / "Perto de você, do jeito que gosta."         — highlight card 2 (title/body)
L111  "No coração da cidade" / `Bem no centro de ${city}.` :
       "Fácil de chegar."                                         — highlight card 3 (title fixed, body ternary on city presence)
L129  "Venha nos visitar"                                         — contact section H2
L131-133 "{name} é referência {cat ? `em ${cat}` : "no bairro"}
       {city ? `, em ${city}` : ""}. Estamos prontos para
       te receber."                                               — contact section paragraph (3-way dynamic interpolation)
L139  "Telefone"                                                  — <dt> label
L145  "Onde"                                                      — <dt> label
L150  "Horário"                                                   — <dt> label
L151  "Seg–Sáb · 9h–19h"                                          — <dd> value (hardcoded hours + PT day abbreviations)
```
No `aria-label` or `alt` attributes exist anywhere in this file (`grep -n "aria-label\|alt=" src/components/preview-site.tsx` returns nothing) — nothing extra to localize there.

### `src/lib/preview-i18n.ts` — recommended shape
```typescript
// Pure, no Convex/React import — safe to unit test directly with node:test,
// same style as convex/lib/compliance.ts's FOOTER_COPY (Phase 2 precedent).
export type Locale = "en" | "nl" | "sv" | "no";

const LOCALE_BY_COUNTRY: Record<string, Locale> = {
  GB: "en",
  IE: "en",
  NL: "nl",
  SE: "sv",
  NO: "no",
};

export function localeForCountry(countryCode: string): Locale {
  return LOCALE_BY_COUNTRY[countryCode.toUpperCase()] ?? "en";
}

export interface PreviewDict {
  call: string;
  callNow: string;
  whatsapp: string;
  reviews: string;
  featureQualityTitle: string;
  featureQualityBody: string;
  featureServiceTitle: string;
  featureServiceBody: string;
  featureLocationTitle: string;
  featureLocationBodyWithCity: (city: string) => string;
  featureLocationBodyNoCity: string;
  heroSubtitle: string;
  visitHeading: string;
  visitBody: (opts: { name: string; category: string | null; city: string | null }) => string;
  phoneLabel: string;
  whereLabel: string;
  hoursLabel: string;
  hoursValue: string;
}

const en: PreviewDict = {
  call: "Call",
  callNow: "Call now",
  whatsapp: "WhatsApp",
  reviews: "reviews",
  /* ... */
  hoursLabel: "Hours",
  hoursValue: "Mon–Sat · 9am–7pm",
};
// nl / sv / no follow the same shape — see §Common Pitfalls Pitfall 5 for the
// grep-negative acceptance check once all 4 are filled in.

export const DICTS: Record<Locale, PreviewDict> = { en, nl, sv, no };
```

### Key-parity + mapping test (mirrors `tests/compliance.test.ts`'s per-language pattern)
```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { DICTS, localeForCountry } from "../src/lib/preview-i18n.ts";

test("preview-i18n: all locales have identical keys", () => {
  const keys = Object.keys(DICTS.en).sort();
  for (const locale of ["nl", "sv", "no"] as const) {
    assert.deepEqual(Object.keys(DICTS[locale]).sort(), keys);
  }
});

test("preview-i18n: countryCode maps to the correct locale", () => {
  assert.equal(localeForCountry("GB"), "en");
  assert.equal(localeForCountry("IE"), "en");
  assert.equal(localeForCountry("NL"), "nl");
  assert.equal(localeForCountry("SE"), "sv");
  assert.equal(localeForCountry("NO"), "no");
  assert.equal(localeForCountry("DE"), "en"); // fallback
});
```
Note: this test file lives in `tests/` per the project's `package.json` test glob (`tests/*.test.ts`) even though the module under test is in `src/lib/` — same cross-directory import style already used (`tests/domain.test.ts` imports `../convex/lib/domain.ts`).

## State of the Art

| Old Approach (pre-Phase 3) | New Approach (this phase) | Impact |
|--------------------------|---------------------------|--------|
| `recordOpen` counts every open unconditionally, including the vendor's own CRM-driven clicks | `recordOpen` checks `ctx.auth.getUserIdentity()` and skips the write when the caller is the workspace owner | The buying-signal funnel (`base → approached`, outbox "abriu") only reflects genuine prospect behavior |
| "Respondeu" only ever appears via the demo seed (`convex/demo.ts:263`); no real path sets `status: "replied"` | `outreach.markReplied` mutation, callable from outbox row + lead-detail, writes real `status`/`repliedAt`/`events` row | The promised funnel (`docs/SOBRE.md` §5: "rascunho → enviado → abriu → respondeu") is real end-to-end, not demo-only |
| Composer's local `subject`/`body` state exists only in memory; `send` re-reads `row.subject/body` from the DB, silently discarding on-screen edits | Composer persists via `updateDraft` before `send`/`markSent`/`copy`, and pre-fills from `getForLead` on open | "What you see is what goes out" — no more silent edit loss |
| `preview-site.tsx` is 100% hardcoded Portuguese, regardless of the lead's market (GB/IE/NL/SE/NO) | Locale derived from `content.countryCode` via a new pure dictionary; zero PT strings remain | A prospect in Stockholm gets a Swedish preview page, matching the product's own compliance-by-market positioning |

**Deprecated/outdated:** none — this phase only adds to existing, still-current patterns (no library or API this phase touches has a newer recommended approach as of 2026-07-11).

## Open Questions

1. **Should `markReplied` throw or silently no-op when no `outreach` row exists?**
   - What we know: CONTEXT.md specifies this explicitly for `updateDraft` ("erro pt-BR se não existe draft") but not for `markReplied`. The existing precedent `markSent` silently no-ops (`if (row) await ctx.db.patch(...)`).
   - What's unclear: whether to follow `markSent`'s silent-no-op precedent or add an explicit error.
   - Recommendation: throw an explicit pt-BR error (Pattern 2 above) — both of this phase's UI call sites only ever render the button when a row already exists (outbox filters to sent/opened, lead-detail's Abordagem tab shows the button next to an already-open composer), so this can only fire on a genuine bug, and a clear error is strictly more useful than a silent no-op there. Left as executor/planner discretion since CONTEXT.md doesn't lock it.

2. **`PreviewTracker` auth-resolution race window (Pitfall 4)**
   - What we know: the identity check inside `recordOpen` is correct and sufficient in the steady state (verified against Convex/Clerk source); CONTEXT.md locks `PreviewTracker` as unchanged.
   - What's unclear: how often, in practice, the mutation fires before Clerk's `isSignedIn` resolves in the vendor's own browser (this is timing-dependent and wasn't feasible to measure via static code reading alone).
   - Recommendation: do not change `PreviewTracker` this phase (respects the lock); add "open your own preview a few times, logged in, same tab" to the phase's manual verification checklist so a real leak (if any) is caught before `/gsd:verify-work` signs off, rather than assumed away.

3. **Exact localized hours copy per market**
   - What we know: source string is `"Seg–Sáb · 9h–19h"` (Mon–Sat, 9am–7pm, no real per-business hours data exists — this is a static placeholder, not derived from Google Places hours).
   - What's unclear: whether NL/SV/NO conventionally use 24h time format (they do, more so than English UK/IE) — e.g. `"Ma–Za · 9.00–19.00"` (NL), `"Mån–Lör · 09.00–19.00"` (SV), `"Man–Lør · 09.00–19.00"` (NO), vs. EN `"Mon–Sat · 9am–7pm"`.
   - Recommendation: use native 24h conventions for nl/sv/no, 12h for en — this is explicitly Claude's Discretion per CONTEXT.md ("Copy exata por idioma... nativa e natural").

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node built-in `node:test` (no jest/vitest/mocha installed) |
| Config file | none — invoked directly via `node --experimental-strip-types --test tests/*.test.ts` (see `package.json` "test" script) |
| Quick run command | `node --experimental-strip-types --test tests/<file>.test.ts` |
| Full suite command | `pnpm test` (currently 40/40 passing, confirmed 2026-07-11) |

Note: there is still no `convex-test`/`convex/testing` package installed (unchanged from Phase 2's finding), so the new Convex mutations (`previews.recordOpen`'s guard, `outreach.markReplied`, `outreach.updateDraft`) cannot be unit-tested in-process this phase without adding a new dependency (out of scope). This mirrors Phase 1/2's precedent exactly: only pure, dependency-free logic gets `node:test` coverage; Convex-runtime mutations/actions stay manual/smoke-verified via `npx convex dev` + the app UI.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRCK-01 | `recordOpen` skips write when caller identity == preview.orgId; still counts when identity is null | manual/smoke | Manual: open own preview link logged-in (no count change) vs. logged-out/incognito (count increments) against `npx convex dev` | ❌ no harness — manual only, justified above |
| TRCK-01 | Demo mode (`NEXT_PUBLIC_DEMO=1`) opens still count | manual/smoke | Manual: open `/p/[token]` in demo build, confirm `openCount` increments | ❌ manual only |
| TRCK-02 | `markReplied` sets `status: "replied"` + `repliedAt` + inserts `reply` event; ownership-checked | manual/smoke | Manual `npx convex run outreach:markReplied` or via UI button, inspect row/dashboard activity feed | ❌ no harness — manual only |
| TRCK-02 | Outbox row action + lead-detail button call `markReplied`/`suppress` and reflect live | manual/smoke | Manual click-through in dev UI (outbox filter "Enviado"/"Abriu", lead-detail Abordagem tab) | ❌ manual only |
| OUTR-01 | `updateDraft` patches subject/body without touching the opt-out footer | manual/smoke | Manual: edit composer, click "Marcar enviado", inspect persisted row in Convex dashboard | ❌ manual only |
| OUTR-01 | Composer pre-fills from `getForLead` on open, without spending an AI call | manual/smoke | Manual: close and reopen lead-detail Abordagem tab after a draft exists, confirm fields are pre-filled and no `draft` action fired (check Convex dashboard function log) | ❌ manual only |
| L10N-01 | Dictionary has identical keys across en/nl/sv/no | unit | `node --experimental-strip-types --test tests/preview-i18n.test.ts` | ❌ Wave 0 — new file |
| L10N-01 | `localeForCountry` maps GB/IE→en, NL→nl, SE→sv, NO→no, unknown→en | unit | `node --experimental-strip-types --test tests/preview-i18n.test.ts` | ❌ Wave 0 — same new file |
| L10N-01 | Zero PT strings remain in `preview-site.tsx` | unit (grep-based) | `! grep -nE "Venha|Tradição|Seg–Sáb" src/components/preview-site.tsx` (as a `node:test` shelling out, or as a plain CI/verification step) | ❌ Wave 0 — recommend wiring as an actual `node:test` case (`assert.equal(source.match(/Venha|Tradição|Seg–Sáb/), null)`) so it's part of `pnpm test`, not a separate manual grep |

### Sampling Rate
- **Per task commit:** `pnpm test` (fast — currently ~0.1s, all pure-function tests; new i18n tests add negligible time)
- **Per wave merge:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build` (matches the project's mandatory verification bar in `.planning/PROJECT.md` §Constraints)
- **Phase gate:** Full command above green, plus every manual/smoke row above walked through at least once against a running `npx convex dev` deployment (and, for TRCK-01 specifically, against a real Clerk-authenticated session — demo mode alone does not exercise the self-open guard's authenticated branch), before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/preview-i18n.test.ts` (or co-located under `src/lib/`, per the project's existing cross-directory import convention) — covers L10N-01 key-parity + countryCode mapping + PT-string grep-negative
- [ ] No new test framework/config needed — `node:test` already covers the pure-function layer for this phase (the new `preview-i18n.ts` dictionary); the four Convex mutation changes stay manual/smoke-verified, consistent with Phase 1/2's precedent — flag explicitly in the plan's verification steps rather than silently skipping
- [ ] Manual verification checklist should explicitly include: (a) TRCK-01 tested with a real authenticated session, not just demo mode; (b) OUTR-01 tested for "edit, refresh, edit-persists" across a page reload, not just within one session

## Sources

### Primary (HIGH confidence)
- Local codebase reads (exact current state, 2026-07-11): `convex/previews.ts`, `convex/schema.ts`, `convex/outreach.ts`, `convex/leads.ts`, `convex/whatsapp.ts`, `convex/suppressions.ts`, `convex/events.ts`, `convex/model/tenant.ts`, `convex/lib/domain.ts`, `convex/lib/outreachAi.ts`, `convex/lib/compliance.ts`, `convex/demo.ts`, `src/components/outreach-composer.tsx`, `src/components/preview-tracker.tsx`, `src/components/preview-site.tsx`, `src/components/crm/lead-detail.tsx`, `src/components/whatsapp-followup.tsx`, `src/components/publish-button.tsx`, `src/lib/providers.tsx`, `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/p/[token]/page.tsx`, `src/app/site/[slug]/page.tsx`, `src/app/(app)/outreach/page.tsx`, `src/app/(app)/dashboard/page.tsx`, `src/proxy.ts`, `tests/*.test.ts`, `package.json`, `tsconfig.json`, `convex/tsconfig.json`
- `node_modules/convex/dist/esm/react/ConvexAuthState.js` (installed convex@1.42.1) — read directly to verify `ConvexProviderWithAuth`'s exact `client.setAuth()`/`isLoading` timing semantics, not assumed from training data
- `node_modules/convex/dist/esm/react-clerk/ConvexProviderWithClerk.js` + `.d.ts` (installed convex@1.42.1) — verified `isSignedIn`/`isLoaded` → `fetchAccessToken` wiring
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` (installed next@16.2.10) — confirmed no breaking change vs. training-data knowledge affects this phase's Server/Client Component composition (per AGENTS.md's mandatory pre-read rule)
- `npm view convex version` / `npm view @clerk/nextjs version` (run 2026-07-11) — confirms installed versions are current
- `pnpm test` (run 2026-07-11) — confirms 40/40 passing baseline before this phase's work

### Secondary (MEDIUM confidence)
- None — every claim in this document was verifiable directly against local installed package source or the local codebase; no WebSearch was needed for this phase's domain.

### Tertiary (LOW confidence)
- None used as load-bearing claims.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependency; all tools already installed and verified via `npm view` against the registry
- Architecture: HIGH — every pattern is read directly from this codebase's existing code (4x precedent for the ownership-check-then-patch mutation shape) or verified against Convex's own installed source (auth provider timing)
- Pitfalls: HIGH for the 4 code-derived pitfalls (outbox activityAt, hydration clobbering, missing-row guard, PT-string grep); MEDIUM for the auth-race-window pitfall specifically — the mechanism is verified from source, but its real-world frequency wasn't empirically measured (documented as a manual-QA flag, not a blocker)

**Research date:** 2026-07-11
**Valid until:** ~30 days (stable domain — Convex auth/schema semantics and this codebase's own established patterns are not fast-moving; re-verify installed `convex`/`@clerk/nextjs` versions if this research is reused after that window)
