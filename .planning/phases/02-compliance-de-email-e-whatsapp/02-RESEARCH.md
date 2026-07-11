# Phase 2: Compliance de Email e WhatsApp - Research

**Researched:** 2026-07-11
**Domain:** Convex backend compliance (email suppression, public HTTP unsubscribe endpoint, Resend headers, WhatsApp opt-in gating)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**COMP-01 — Tabela de supressão**
- Nova tabela `suppressions` no schema: `{ email: v.string() (normalizado lowercase/trim), orgId: v.optional(v.string()) (undefined = supressão global), source: v.string() (ex.: "unsubscribe_link", "manual", "reply_stop"), at: v.number(), leadId: v.optional(v.id("leads")) }` com índices `by_email` e `by_org_email (["orgId","email"])`.
- Normalização de email num helper puro (ex.: `normalizeEmail` em `convex/lib/domain.ts`) — testável em `tests/`.
- Checagem em AMBOS: `outreach.draft` (antes de gastar IA) e `outreach.send` (antes do POST ao Resend) — se suprimido (match por org OU global), lançar erro pt-BR claro ("Este contato pediu para não ser contatado (opt-out).").
- Mutation interna `suppressions.add` (idempotente — não duplicar email+org) + mutation autenticada `outreach.suppress` (org-scoped, origem "manual") para registrar "respondeu stop" — a UI dessa ação fica na Fase 3 junto do botão "respondeu" (mesma área do lead-detail; evita overlap).

**COMP-02 — Endpoint público de unsubscribe**
- Token dedicado `unsubscribeToken` (crypto.randomUUID) gravado na row de `outreach` no `upsertDraft` (novo índice `by_unsub_token`). NÃO reutilizar o previewToken (semânticas diferentes).
- Rotas no `convex/http.ts` (mesmo router do webhook Stripe):
  - `GET /unsubscribe?token=...` — grava supressão (org-scoped do outreach + email do lead) e responde página HTML mínima de confirmação em inglês ("You've been unsubscribed. You won't hear from us again.") — sem dados do lead além do necessário, sem branding Osprano obrigatório.
  - `POST /unsubscribe?token=...` — mesmo efeito, para One-Click (RFC 8058). Idempotente: token já usado/desconhecido → responder 200 genérico (não vazar existência).
- URL base do endpoint: `process.env.CONVEX_SITE_URL` (env built-in do Convex para HTTP actions).

**COMP-03 — Rodapé de opt-out + headers (garantia por código)**
- Helper puro (ex.: `optOutFooter(lang, unsubscribeUrl, senderIdentity)` em `convex/lib/` novo arquivo ou `outreachAi.ts`) retornando rodapé localizado por mercado usando o mapa `LANG` existente (`convex/lib/outreachAi.ts:5-11`): EN (GB/IE), NL, SV (SE), NO. Formato: separador `\n\n—\n` + 1–2 linhas: quem envia + link de unsubscribe. Testável com casos por idioma.
- Injeção no `draft`: o body persistido via `upsertDraft` já sai com o rodapé (cobre o fluxo manual de copiar/enviar do próprio email e o `markSent`).
- Re-garantia no `send`: antes do POST ao Resend, se o body não contém o marcador do rodapé (ex.: a URL de unsubscribe), anexar de novo — idempotente; edição do usuário nunca remove a garantia.
- Payload Resend ganha headers: `List-Unsubscribe: <{CONVEX_SITE_URL}/unsubscribe?token=...>` e `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (campo `headers` da API do Resend). Sem mailto (exige inbound; v2 GDPR-02).
- O prompt da IA continua pedindo opt-out por reply (inofensivo), mas a GARANTIA é o rodapé por código — inclusive no fallback de parse (`outreachAi.ts:88`).

**COMP-04 — Opt-in registrado para WhatsApp**
- Novos campos no lead: `waOptInAt: v.optional(v.number())`, `waOptInSource: v.optional(v.string())` (ex.: "replied_email", "phone_call", "in_person").
- Mutation autenticada `leads.recordWaOptIn({ leadId, source, note? })` que grava os campos + insere evento (ampliar union de `events.type` com `v.literal("wa_opt_in")`).
- `whatsapp.sendFollowup` passa a exigir `lead.waOptInAt` (erro pt-BR: "WhatsApp só com opt-in registrado do prospect."), removendo o gate por estágio; corrigir o comentário do arquivo (hoje diz replied/converted e checa scheduled/converted).
- UI mínima nesta fase: no `WhatsAppFollowup` (`src/components/whatsapp-followup.tsx`), quando o lead não tem opt-in, mostrar botão/fluxo "Registrar opt-in" (select de origem + confirmar) antes de liberar o envio.

### Claude's Discretion
- Nome/arquivo exato dos helpers e o HTML da página de confirmação.
- Copy exata do rodapé por idioma (curta, honesta, sem hype — tom do prompt existente).
- Onde guardar `senderIdentity` do rodapé (derivar de `RESEND_FROM` é aceitável nesta fase).

### Deferred Ideas (OUT OF SCOPE)
- Webhook inbound/bounce do Resend (replied/bounced automáticos + supressão por "stop" automática) — v2 (GDPR-02)
- UI do botão "registrar supressão manual" no lead-detail — Fase 3 (junto do botão "respondeu", mesma área de UI)
- mailto: no List-Unsubscribe — quando houver caixa de inbound (v2)
- Checar supressão também no re-discovery/enrichment — v2 (junto de GDPR-01)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| COMP-01 | Tabela de supressão (email normalizado + escopo org/global + origem + timestamp); `outreach.draft` e `outreach.send` recusam endereços suprimidos | Schema pattern for `suppressions` table (§Architecture Patterns), idempotent-upsert pattern from `outreach.upsertDraft`/`previews.generate`, global+org dual-scope query pattern (§Pitfall 5), `normalizeEmail` helper design (§Code Examples) |
| COMP-02 | Endpoint HTTP público de unsubscribe (token por outreach/lead, sem auth) grava supressão e confirma ao prospect | Verified `HttpRouter` supports GET+POST on same exact path (`convex/dist/esm-types/server/router.d.ts`), `CONVEX_SITE_URL` built-in env confirmed via Convex docs, RFC 8058 exact header/body semantics verified via IETF datatracker, idempotent/no-leak response pattern (§Pitfall 9) |
| COMP-03 | Rodapé de opt-out injetado por código + header `List-Unsubscribe` no payload do Resend, independente da IA/fallback | Resend `headers` field confirmed as flat string-object accepted by REST `POST /emails` (not just SDK), exact RFC 8058 header values, re-guarantee-in-`send` pattern (marker-based idempotent append), on-demand token backfill for legacy draft rows (§Pitfall 4) |
| COMP-04 | Follow-up WhatsApp só com opt-in registrado (origem + timestamp), não por estágio de Kanban | Schema optional-field-no-migration confirmed via Convex docs, mutation pattern from `leads.setStage`/`schedule` (events insert alongside patch), extraction-for-testability recommendation since no `convex-test` harness is installed (§Validation Architecture) |
</phase_requirements>

## Summary

This phase closes four concrete compliance gaps in an already-functional Convex + Next.js codebase (Osprano). All four requirements are additive: new schema fields/table, two new files under `convex/lib/`, one new file `convex/suppressions.ts`, edits to `convex/outreach.ts`, `convex/whatsapp.ts`, `convex/leads.ts`, `convex/http.ts`, and one UI component (`whatsapp-followup.tsx`). No new npm dependency is needed or should be added — `crypto.randomUUID()` (already used in `convex/previews.ts:65`), raw `fetch` to the Resend REST API (already the pattern in `convex/outreach.ts:172`, not the installed-but-unused `resend` SDK), and Node's built-in `node:test` runner (already the project's only test framework, no config file, 30/30 passing today) cover everything required.

The two areas needing primary-source verification (not just training-data recall) were: (1) Convex's `httpRouter` — confirmed by reading `node_modules/convex/dist/esm-types/server/router.d.ts` directly — routes exact paths into a `Map<RoutableMethod, Handler>`, so `GET /unsubscribe` and `POST /unsubscribe` are two independent `http.route()` calls on the same `path` string, exactly like the existing single-route pattern in `convex/http.ts`; and (2) Resend's `headers` field and RFC 8058's exact header/body contract, both confirmed via official docs/IETF — Resend's REST API (not just its JS SDK) accepts a flat `headers: Record<string,string>` object in the `POST /emails` JSON body, and RFC 8058 requires `List-Unsubscribe: <https-uri>` (angle brackets, HTTPS-only is sufficient) plus `List-Unsubscribe-Post: List-Unsubscribe=One-Click` verbatim.

**Primary recommendation:** Extract every piece of compliance logic that can run without `ctx.db`/`ctx.auth` into pure functions in `convex/lib/` (`normalizeEmail`, `optOutFooter`, and ideally `hasWaOptIn`), test those with `node:test` (the only test harness this repo has — there is no `convex-test`/`convex/testing` installed, so mutations/actions/httpActions themselves stay manually/build-verified, consistent with how Phase 1 tested `isDemoEnabled`/`planForPrice`/`domain.ts` and left `foursquare.ts`/`http.ts` mutations untested). Make the `send` action the single non-bypassable enforcement point: it must (a) check suppression, (b) guarantee the footer is present (idempotent append), and (c) guarantee `unsubscribeToken` exists on the row (generate on-demand for legacy/pre-phase draft rows), before building the Resend `headers` payload.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| convex | ^1.42.1 (installed) | Schema, mutations/actions/queries, `httpRouter`/`httpAction` | Already the project's backend; verified `HttpRouter.route()` semantics directly in `node_modules/convex/dist/esm-types/server/router.d.ts` |
| Web Fetch API (`fetch`, `Response`, `Request`, `URL`) | runtime built-in | Resend REST call, httpAction request/response, query-param parsing | Already the pattern for Stripe/Resend/Anthropic calls (`convex/lib/stripe.ts`, `convex/outreach.ts`) — no SDK wrapper used anywhere in this repo |
| `crypto.randomUUID()` | runtime built-in (Web Crypto, available in Convex's V8 runtime) | `unsubscribeToken` generation | Already used identically for `previewToken` in `convex/previews.ts:65,92,167` |
| node:test + node:assert/strict | Node ≥22.12 built-in | Unit tests for pure helpers | Already the *only* test framework in the repo (`package.json` "test": `node --experimental-strip-types --test tests/*.test.ts`); no jest/vitest installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| — | — | — | No supporting library needed. `resend` (^6.17.2) is in `package.json` but is dead weight — it is never imported (`grep` confirms zero usages); keep using raw `fetch` to `https://api.resend.com/emails` for consistency with the rest of the codebase. Do not introduce the SDK in this phase. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw `fetch` to Resend REST API | `resend` npm SDK (already installed, unused) | SDK gives typed `headers` param and nicer error shapes, but breaks the established "no SDK wrappers, just fetch" convention used for Stripe/Anthropic/WhatsApp in this codebase, and CONTEXT.md/AGENTS.md require no new dependency without confirmation — since it's a net-new usage pattern (not just adding a package), staying with `fetch` is the lower-risk, in-convention choice |
| Hand-rolled `normalizeEmail` (trim + lowercase) | A dedicated email-normalization library (e.g. handling Gmail dot-insensitivity, plus-addressing) | Overkill for MVP compliance scope — RFC 8058/GDPR compliance only requires exact-match suppression on the address as stored; document as an Open Question, not a blocker |
| Plain template-string HTML for the unsubscribe confirmation page | A templating engine (e.g. eta, Handlebars) | One static, tiny page with no dynamic user content beyond a fixed English sentence — a JS template literal is simpler and needs zero new dependency |

**Installation:**
```bash
# No install needed — everything required is already a dependency or a runtime built-in.
```

**Version verification:**
```bash
$ npm view convex version
1.42.1   # matches installed ^1.42.1 in package.json — current
$ npm view resend version
6.17.2   # matches installed (but unused) — not needed this phase
```
Both verified 2026-07-11 against the npm registry; installed versions are current, not stale.

## Architecture Patterns

### Recommended Project Structure (additions only)
```
convex/
├── schema.ts              # + suppressions table, + leads.waOptInAt/waOptInSource,
│                           #   + events.type literal "wa_opt_in", + outreach.unsubscribeToken/index
├── suppressions.ts         # NEW — internal mutation `add` (idempotent), internal query
│                           #   `isSuppressed`, authenticated mutation exposed as `outreach.suppress`
│                           #   (per CONTEXT.md naming — see Pattern 2)
├── lib/
│   ├── domain.ts            # + normalizeEmail (pure, testable)
│   └── outreachAi.ts        # + optOutFooter (pure, per-LANG, testable) — or a new convex/lib/compliance.ts,
│                             #   Claude's discretion per CONTEXT.md
├── outreach.ts              # upsertDraft: always sets unsubscribeToken + appends footer
│                             # draft: suppression check before ctx.runMutation(writeEmail)
│                             # send: suppression check, token backfill, footer re-guarantee, Resend headers
├── whatsapp.ts               # sendFollowup: gate on lead.waOptInAt instead of stage
├── leads.ts                  # + recordWaOptIn mutation (patches waOptInAt/waOptInSource + inserts event)
└── http.ts                   # + GET /unsubscribe, + POST /unsubscribe (same router, new routes)

src/components/
└── whatsapp-followup.tsx     # + "Registrar opt-in" flow gating the send button

tests/
├── domain.test.ts            # + normalizeEmail cases (extend existing file)
└── compliance.test.ts        # NEW — optOutFooter per-language cases (or co-located wherever the helper lands)
```

### Pattern 1: Dual-method HTTP route on one path (Convex `httpRouter`)
**What:** Register `GET` and `POST` handlers for the exact same `path` — Convex's router stores routes as `Map<path, Map<method, handler>>`, so this is natively supported with two separate `http.route()` calls, no special API needed.
**When to use:** COMP-02's `/unsubscribe` endpoint, which must support both a plain browser click (GET) and RFC 8058 one-click (POST).
**Verified in:** `node_modules/convex/dist/esm-types/server/router.d.ts` — `exactRoutes: Map<string, Map<RoutableMethod, PublicHttpAction>>`.
**Example:**
```typescript
// Source: convex/http.ts pattern (existing Stripe route) + verified HttpRouter semantics
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

async function handleUnsubscribe(ctx: any, req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get("token");
  if (token) {
    // idempotent — internal mutation looks up outreach.by_unsub_token, no-ops if not found/already used
    await ctx.runMutation(internal.suppressions.unsubscribeByToken, { token });
  }
  // ALWAYS the same generic 200 response, whether token matched or not — never leak existence.
  return new Response(
    `<!doctype html><html><body><p>You've been unsubscribed. You won't hear from us again.</p></body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

http.route({ path: "/unsubscribe", method: "GET", handler: httpAction(handleUnsubscribe) });
http.route({ path: "/unsubscribe", method: "POST", handler: httpAction(handleUnsubscribe) }); // RFC 8058 one-click

export default http;
```

### Pattern 2: Idempotent upsert / dedupe mutation
**What:** Query by index first, patch if found, insert if not — the exact shape already used by `outreach.upsertDraft` (`convex/outreach.ts:73-105`) and `previews.generate`/`ensureForLead`.
**When to use:** `suppressions.add` (COMP-01) — must not duplicate `(email, orgId)` pairs.
**Example:**
```typescript
// convex/suppressions.ts — internal, idempotent
export const add = internalMutation({
  args: {
    email: v.string(), // already normalized by caller via normalizeEmail
    orgId: v.optional(v.string()),
    source: v.string(),
    leadId: v.optional(v.id("leads")),
  },
  handler: async (ctx, args) => {
    const existing = args.orgId
      ? await ctx.db.query("suppressions")
          .withIndex("by_org_email", (q) => q.eq("orgId", args.orgId).eq("email", args.email))
          .first()
      : await ctx.db.query("suppressions")
          .withIndex("by_email", (q) => q.eq("email", args.email))
          .filter((q) => q.eq(q.field("orgId"), undefined))
          .first();
    if (existing) return existing._id; // idempotent no-op
    return await ctx.db.insert("suppressions", { ...args, at: Date.now() });
  },
});
```
Note: `outreach.suppress` (the authenticated, org-scoped mutation named in CONTEXT.md) is a thin wrapper: `requireOrgId` → normalize email → call the same insert-or-noop logic with `source: "manual"`.

### Pattern 3: Dual-scope suppression check (org-scoped OR global)
**What:** A suppressed email can be suppressed either for one org (`orgId` set) or globally (`orgId` undefined). Checking must OR both.
**When to use:** `outreach.draft` and `outreach.send` (COMP-01) — this is the check that gates outreach.
**Example:**
```typescript
// convex/suppressions.ts
export const isSuppressed = internalQuery({
  args: { email: v.string(), orgId: v.string() },
  handler: async (ctx, { email, orgId }) => {
    const rows = await ctx.db.query("suppressions")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    return rows.some((r) => r.orgId === orgId || r.orgId === undefined);
  },
});
```
`rows` will almost always be 0-2 documents per email (org-scoped + maybe global), so `.collect()` here is safe and avoids a second round-trip; do not use `by_org_email` alone, it would silently miss global suppressions.

### Pattern 4: Re-guarantee + on-demand backfill in the `send` action
**What:** `send` is the last line of defense before an email actually leaves the system. It must not trust that `upsertDraft` already ran with the new code (rows created before this phase's deploy, or via `demo.ts` seeding, will lack `unsubscribeToken` and the footer).
**When to use:** COMP-02/COMP-03 — answers the "migração dos drafts existentes" question directly: generate the token on-demand rather than requiring a backfill migration.
**Example:**
```typescript
// convex/outreach.ts — inside send, before the Resend fetch
let unsubscribeToken = row.unsubscribeToken;
if (!unsubscribeToken) {
  unsubscribeToken = crypto.randomUUID();
  await ctx.runMutation(internal.outreach.setUnsubscribeToken, { outreachId: row._id, unsubscribeToken });
}
const unsubscribeUrl = `${process.env.CONVEX_SITE_URL}/unsubscribe?token=${unsubscribeToken}`;

let body = row.body!;
if (!body.includes(unsubscribeUrl)) {
  body = `${body}${optOutFooter(lang, unsubscribeUrl, senderIdentity)}`;
}

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
  body: JSON.stringify({
    from, to: lead.email, subject: row.subject, text: body,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  }),
});
```
This means no separate migration/backfill mutation is required for COMP-02/03 — every row gets a valid token and footer lazily, exactly once, the first time it is actually sent.

### Pattern 5: Pure-function extraction for testability (no `convex-test` harness)
**What:** This repo has no `convex-test`/`convex/testing` package (verified: not in `package.json`, not in `pnpm-lock.yaml`, no `.bin/convex-test`). Every existing test (`domain.test.ts`, `stripe.test.ts`, `tenant.test.ts`) tests a pure function imported directly from `convex/lib/*.ts` or `convex/model/tenant.ts`, never a live mutation/action/httpAction.
**When to use:** Everywhere business logic can be isolated from `ctx.db`/`ctx.auth`/`fetch` — `normalizeEmail`, `optOutFooter`, and (recommended, not explicitly required by CONTEXT.md but keeps COMP-04 testable) a `hasWaOptIn(lead: { waOptInAt?: number }): boolean` pure predicate that `whatsapp.sendFollowup` calls, mirroring how `isEmailable` is a pure predicate consumed by `outreach.draft`/`outreach.send`.

### Anti-Patterns to Avoid
- **Trusting the LLM's own opt-out line as the compliance guarantee:** `outreachAi.ts`'s system prompt already asks for a reply-to-stop line (line 49) — keep it (harmless, familiar to prospects), but it must never be the enforcement point. The footer injected in `upsertDraft`/`send` is the guarantee, independent of what the model returns or whether JSON parsing fails (the fallback path at `outreachAi.ts:88`).
- **Checking suppression only in `send`:** CONTEXT.md explicitly requires the check in `draft` too (before spending an Anthropic API call on a lead that can never legally be emailed).
- **Registering only `GET /unsubscribe`:** breaks RFC 8058 one-click, which major mailbox providers (Gmail/Yahoo) increasingly require for bulk senders to avoid being marked as spam — see Sources.
- **Leaking token validity via response differences:** returning a 404 or different body for an invalid/already-used token lets an attacker enumerate valid tokens; CONTEXT.md's locked decision (always 200, generic body) avoids this — implement it as a single response returned unconditionally by the handler, not an `if/else` with two different response bodies.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Random unguessable token | Custom ID generator, incrementing counter, `Math.random()`-based string | `crypto.randomUUID()` | Already the established pattern (`previews.ts`); cryptographically strong, zero dependency, works in Convex's V8 runtime |
| RFC 8058 header semantics | Inventing your own header format/values | Exact strings from RFC 8058: `List-Unsubscribe: <https-uri>` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` | The spec is precise and mailbox providers parse it exactly; deviating (missing angle brackets, wrong value casing) silently disables the one-click button in Gmail/Outlook |
| Custom header injection into Resend payload | Manually concatenating into the `text`/`html` body or trying undocumented top-level fields | The documented `headers: Record<string,string>` field on `POST /emails` | Confirmed via official Resend docs (`resend.com/docs/api-reference/emails/send-email` and `resend.com/docs/dashboard/emails/custom-headers`) to work identically via SDK or raw REST JSON body |
| Suppression email matching | String `===` on raw stored emails (case/whitespace-sensitive) | A single `normalizeEmail` helper used at every write (`suppressions.add`) and every read (`isSuppressed`) site | Convex has no case-insensitive index; without a canonical normalized form at both ends, `Info@Business.com` vs `info@business.com` would silently bypass suppression |

**Key insight:** Every "don't hand-roll" item above is really the same lesson — compliance correctness lives in exact adherence to an external spec (RFC 8058) or an external API contract (Resend's `headers` field), not in cleverness. Get the primary source right once, wrap it in a pure/testable function, and never let the LLM or ad-hoc string surgery be the last line of defense.

## Common Pitfalls

### Pitfall 1: Registering only one HTTP method for `/unsubscribe`
**What goes wrong:** Only `GET` is wired; RFC 8058 one-click (which mail clients trigger via `POST`) 404s.
**Why it happens:** Easy to forget POST is a *separate* `http.route()` call in Convex, not something GET registration implies.
**How to avoid:** Register both explicitly (Pattern 1); confirm both are listed in `npx convex dev` output/dashboard "Functions" page.
**Warning signs:** Testing only via browser click (GET) and never `curl -X POST`.

### Pitfall 2: `List-Unsubscribe` missing angle brackets
**What goes wrong:** Some mail clients require the URI to be wrapped in `<...>` per RFC 2369/8058 syntax; a bare URL can be silently ignored by strict parsers.
**Why it happens:** Easy to paste the raw URL string without the brackets.
**How to avoid:** Always build the header value as `` `<${unsubscribeUrl}>` ``.
**Warning signs:** Header present in the raw email source but the "Unsubscribe" button doesn't appear in Gmail.

### Pitfall 3: Global vs org-scoped suppression check done wrong
**What goes wrong:** Querying only `by_org_email` misses a global suppression (`orgId: undefined`); querying only `by_email` and taking `.first()` might match the wrong org's row and either over- or under-suppress.
**Why it happens:** The dual-scope requirement (COMP-01: "match por org OU global") is easy to collapse into a single index lookup.
**How to avoid:** Fetch by `by_email` and OR-filter in application code (Pattern 3) — row counts per email are tiny, this is cheap.
**Warning signs:** A prospect who unsubscribed (global) still receives outreach from a *different* org sharing the same lead email in a multi-tenant test.

### Pitfall 4: Legacy/pre-phase `outreach` rows without `unsubscribeToken`
**What goes wrong:** `send` builds `List-Unsubscribe` from `row.unsubscribeToken`, which is `undefined` on rows created before this phase (including `demo.ts` seed rows and any draft created before deploy) → header becomes `<undefined>` or the send throws.
**Why it happens:** Adding an optional field to the schema does not backfill existing documents (confirmed via Convex docs — this is expected, not a bug).
**How to avoid:** Generate the token on-demand inside `send` if missing, persist it, then proceed (Pattern 4). This directly answers the phase's flagged open question — no separate migration mutation needed.
**Warning signs:** A `send` call on an old draft throws or produces a malformed header; test explicitly with a row inserted the old way (no `unsubscribeToken` field) before trusting the happy path.

### Pitfall 5: Comment/behavior drift in `whatsapp.ts`
**What goes wrong:** The file's own docstring (lines 6-9) says gating is "replied/converted" but the code actually checks `stage !== "scheduled" && stage !== "converted"` (line 17) — already inconsistent *before* this phase. If the gate is swapped to `waOptInAt` without also fixing the comment, the drift compounds.
**Why it happens:** Comments don't get updated when the guarded condition changes.
**How to avoid:** Rewrite the docstring together with the code change (CONTEXT.md explicitly calls this out as needing correction).
**Warning signs:** Docstring describes different logic than the `if` statement immediately below it.

### Pitfall 6: Regenerating `_generated/` types after schema changes
**What goes wrong:** Adding `suppressions` table, new `leads`/`events`/`outreach` fields, and a new literal to `events.type` changes the generated TypeScript types (`convex/_generated/dataModel.d.ts`, `api.d.ts`). If `npx convex dev`/codegen doesn't run before `pnpm typecheck`, typecheck fails or (worse) silently uses stale types.
**Why it happens:** Convex codegen is a separate step from editing `schema.ts`; easy to forget when working offline from `convex dev`.
**How to avoid:** Run `npx convex dev` (or `npx convex codegen`) after every `schema.ts` edit, before `pnpm typecheck`/`pnpm build`, matching the project's existing verification requirement (`pnpm typecheck && pnpm lint && pnpm test && pnpm build`).
**Warning signs:** `tsc` errors referencing fields that were just added to `schema.ts` but "don't exist" on `Doc<"leads">`/`Doc<"outreach">`.

### Pitfall 7: GET-triggered unsubscribe and email security scanners
**What goes wrong:** Corporate email gateways / antivirus scanners sometimes pre-fetch links in incoming emails (including unsubscribe links) before a human ever clicks, which can trigger a false unsubscribe on a GET-only endpoint.
**Why it happens:** Inherent risk of any single-click (no confirmation step) GET unsubscribe design.
**How to avoid:** This is the locked decision in CONTEXT.md (COMP-02: GET performs the unsubscribe directly, same as POST) — the mitigating factor is that the operation is idempotent and low-consequence (a suppressed prospect just won't be re-emailed; not data-destructive), so this is an accepted, intentional tradeoff, not a defect to fix in this phase. Documented here only so the planner/executor doesn't "fix" it by accident into a two-step confirmation flow that CONTEXT.md didn't ask for.
**Warning signs:** None to act on this phase — flagged for awareness only.

## Code Examples

### `normalizeEmail` (COMP-01)
```typescript
// convex/lib/domain.ts — pure, no Convex imports, same file style as isEmailable/inferContactType
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
```

### `optOutFooter` per market (COMP-03)
```typescript
// convex/lib/outreachAi.ts (or a new convex/lib/compliance.ts) — reuses the existing LANG map
const FOOTER_COPY: Record<string, (sender: string, url: string) => string> = {
  English: (sender, url) => `\n\n—\nSent by ${sender}. Don't want to hear from us again? ${url}`,
  Dutch: (sender, url) => `\n\n—\nVerzonden door ${sender}. Wilt u niets meer van ons ontvangen? ${url}`,
  Swedish: (sender, url) => `\n\n—\nSkickat av ${sender}. Vill du inte höra från oss igen? ${url}`,
  Norwegian: (sender, url) => `\n\n—\nSendt av ${sender}. Vil du ikke høre fra oss igjen? ${url}`,
};

export function optOutFooter(lang: string, unsubscribeUrl: string, senderIdentity: string): string {
  const build = FOOTER_COPY[lang] ?? FOOTER_COPY.English;
  return build(senderIdentity, unsubscribeUrl);
}
```
Called as `optOutFooter(LANG[lead.countryCode] ?? "English", unsubscribeUrl, senderIdentity)` — reuses the existing `LANG` lookup already keyed by country code (`outreachAi.ts:5-11`), so no new market-mapping logic is needed.

### Resend `headers` field — verified REST contract
```typescript
// Source: https://resend.com/docs/api-reference/emails/send-email + https://resend.com/docs/dashboard/emails/custom-headers
// Confirmed: `headers` is a flat Record<string,string> in the JSON body, works via raw fetch (not SDK-only).
body: JSON.stringify({
  from, to, subject, text,
  headers: {
    "List-Unsubscribe": "<https://example.convex.site/unsubscribe?token=abc123>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  },
})
```

### `events.type` union extension (COMP-04)
```typescript
// convex/schema.ts — additive literal, no migration needed for existing event rows
type: v.union(
  v.literal("preview_open"),
  v.literal("email_sent"),
  v.literal("reply"),
  v.literal("stage_change"),
  v.literal("wa_opt_in"), // NEW
),
```

## State of the Art

| Old Approach (pre-Phase 2) | New Approach (this phase) | When Changed | Impact |
|--------------------------|---------------------------|---------------|--------|
| Opt-out is an instruction inside the AI prompt (`outreachAi.ts:49`); fallback parse path can omit it entirely (`outreachAi.ts:88`) | Opt-out footer + `List-Unsubscribe`/`List-Unsubscribe-Post` headers injected by code in `upsertDraft` and re-guaranteed in `send`, independent of LLM output | This phase (COMP-03) | Compliance no longer depends on model behavior; a broken/empty JSON parse still produces a compliant email |
| No suppression list at all — any lead with `emailable: true` can always be drafted/sent to | `suppressions` table checked in both `draft` and `send`, org-scoped + global | This phase (COMP-01) | A prospect who unsubscribes (or is manually marked "stop") can never be re-contacted by any workspace path, including the AI-draft step (saves an unnecessary Anthropic call too) |
| No public unsubscribe mechanism; the "opt-out" is only a promise in the email text | `GET`/`POST /unsubscribe?token=...` public httpAction, idempotent, writes to `suppressions` | This phase (COMP-02) | Turns the promise into an enforced mechanism; also required for RFC 8058 / 2024 Gmail-Yahoo bulk sender rules |
| WhatsApp gate is `lead.stage === "scheduled" \|\| lead.stage === "converted"` — a Kanban column the *seller* controls by dragging a card | WhatsApp gate is `lead.waOptInAt` — an explicit opt-in event with source + timestamp, set only via `leads.recordWaOptIn` | This phase (COMP-04) | Removes the ability for a seller to unlock cold WhatsApp by simply moving a Kanban card; requires a real, attributable opt-in record |

**Deprecated/outdated:**
- Kanban-stage-as-compliance-gate (`whatsapp.ts:17`) — replaced entirely; do not leave the stage check as a secondary/fallback condition, CONTEXT.md says "removendo o gate por estágio" (full replacement, not additive).
- The `whatsapp.ts` file docstring (lines 6-9) — factually wrong today (says replied/converted, checks scheduled/converted) and must be rewritten together with the gate change.

## Open Questions

1. **Exact `senderIdentity` derivation from `RESEND_FROM`**
   - What we know: `RESEND_FROM` is an env var already used as the Resend `from` field (`convex/outreach.ts:169,175`); typical format is `"Display Name <email@domain.com>"` or a bare email.
   - What's unclear: CONTEXT.md says "derivar de `RESEND_FROM` é aceitável" but doesn't specify the exact parsing (strip the `<email>` part? use the whole string? fall back if no display name is set?).
   - Recommendation: Simple regex extraction — if `RESEND_FROM` matches `/^(.+?)\s*<.+>$/`, use the captured display name; otherwise use `RESEND_FROM` as-is (it's then just the bare email, which is still a valid, honest "who sent this" identifier). Left as executor/planner discretion per CONTEXT.md.

2. **Whether `hasWaOptIn` should be extracted as a pure helper**
   - What we know: CONTEXT.md only specifies `lead.waOptInAt` as the gate condition (a one-line check), not a named helper.
   - What's unclear: A one-line `!lead.waOptInAt` check is arguably too trivial to need extraction, but every other Convex-runtime-dependent piece of business logic in this codebase (`isEmailable`, `isDemoEnabled`) is a pure, directly-tested function — and this repo has no `convex-test` harness, so anything left inline in `whatsapp.ts` gets zero automated coverage.
   - Recommendation: Extract it anyway (`hasWaOptIn(lead: { waOptInAt?: number }): boolean` in `convex/lib/domain.ts`) purely for testability parity with the rest of the codebase's pattern — low cost, keeps COMP-04 out of "manual-only" territory in the Validation Architecture below.

3. **Whether `outreach.suppress` (the manual-stop mutation) should also insert into `events`**
   - What we know: CONTEXT.md specifies it inserts into `suppressions` with `source: "manual"`; it does not mention an `events` row.
   - What's unclear: The rest of the codebase logs most user-triggered state changes to `events` (`stage_change`, `email_sent`, `wa_opt_in` per this phase) — a manual suppression is arguably similar.
   - Recommendation: Skip it — CONTEXT.md is explicit about the fields and doesn't ask for it, and the UI trigger for this mutation is explicitly deferred to Phase 3 anyway (the mutation exists this phase but nothing calls it from the UI yet), so there's no user-facing "recent activity" need to satisfy right now. Revisit in Phase 3 alongside the "respondeu" UI work if desired.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node built-in `node:test` (no jest/vitest/mocha installed) |
| Config file | none — invoked directly via `node --experimental-strip-types --test tests/*.test.ts` (see `package.json` "test" script) |
| Quick run command | `node --experimental-strip-types --test tests/<file>.test.ts` |
| Full suite command | `pnpm test` (currently 30/30 passing, confirmed 2026-07-11) |

Note: there is no `convex-test`/`convex/testing` package installed, so Convex mutations/actions/httpActions (`suppressions.add`, `outreach.draft`/`send`, `http.ts` routes, `leads.recordWaOptIn`, `whatsapp.sendFollowup`) cannot be unit-tested in-process this phase without adding a new dependency (out of scope per CONTEXT.md's "sem dependência nova"). This mirrors Phase 1's approach exactly: only pure `convex/lib/*` functions got `node:test` coverage; the mutations that used them (`foursquare.ts`, `http.ts` webhook) were verified via `pnpm typecheck && pnpm lint && pnpm build` + manual/smoke testing, not automated unit tests.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-01 | `normalizeEmail` produces canonical lowercase/trimmed form | unit | `node --experimental-strip-types --test tests/domain.test.ts` | ✅ (extend existing file) |
| COMP-01 | Draft/send refuse suppressed emails (org-scoped + global) | manual/smoke | `npx convex dev` + manual draft/send attempt against a seeded suppressed lead | ❌ no harness — manual only, justified above |
| COMP-02 | `GET`/`POST /unsubscribe?token=...` writes suppression, responds 200 generically for valid/invalid/reused token | manual/smoke | `curl -i "$CONVEX_SITE_URL/unsubscribe?token=..."` (GET and POST) against a dev deployment | ❌ Wave 0 — no automated coverage possible without `convex-test`; document manual verification steps in the plan |
| COMP-03 | `optOutFooter` returns correct copy per language (English/Dutch/Swedish/Norwegian) and always includes the unsubscribe URL | unit | `node --experimental-strip-types --test tests/compliance.test.ts` | ❌ Wave 0 |
| COMP-03 | Resend payload always includes `List-Unsubscribe`/`List-Unsubscribe-Post`, body always contains footer, even after legacy-row token backfill | manual/smoke | Manual `send` call in dev against a row without `unsubscribeToken`; inspect Resend dashboard / dry-run log of the request body | ❌ no harness — manual only |
| COMP-04 | `hasWaOptIn` (if extracted) correctly gates on `waOptInAt` presence | unit | `node --experimental-strip-types --test tests/domain.test.ts` | ❌ Wave 0 (new test cases, existing file) |
| COMP-04 | `whatsapp.sendFollowup` rejects leads without opt-in, `leads.recordWaOptIn` unlocks it | manual/smoke | Manual attempt in dev UI (or `npx convex run`) before/after calling `recordWaOptIn` | ❌ no harness — manual only |

### Sampling Rate
- **Per task commit:** `pnpm test` (fast — currently ~0.1s, all pure-function tests)
- **Per wave merge:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build` (matches the project's mandatory verification bar in `.planning/PROJECT.md` §Constraints)
- **Phase gate:** Full command above green, plus the manual/smoke checks listed in the table above performed at least once against a running `npx convex dev` deployment, before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/compliance.test.ts` (or co-located with wherever `optOutFooter` lands) — covers COMP-03 footer-per-language cases
- [ ] Extend `tests/domain.test.ts` with `normalizeEmail` cases — covers COMP-01
- [ ] Extend `tests/domain.test.ts` with `hasWaOptIn` cases (if the extraction in Open Question 2 is adopted) — covers COMP-04
- [ ] No new test framework/config needed — `node:test` already covers the pure-function layer; Convex-runtime behavior (httpAction routes, mutations, actions) stays manual/smoke-verified this phase, consistent with Phase 1's precedent — flag explicitly in the plan's verification steps rather than silently skipping

## Sources

### Primary (HIGH confidence)
- `node_modules/convex/dist/esm-types/server/router.d.ts` (local, installed convex@1.42.1) — `HttpRouter` exact-path + method routing semantics (confirms GET+POST on same path is native, no special handling needed)
- Local codebase reads: `convex/schema.ts`, `convex/outreach.ts`, `convex/lib/outreachAi.ts`, `convex/whatsapp.ts`, `convex/http.ts`, `convex/leads.ts`, `convex/lib/domain.ts`, `convex/previews.ts`, `convex/model/tenant.ts`, `convex/model/workspace.ts`, `convex/lib/stripe.ts`, `convex/events.ts`, `convex/demo.ts`, `src/components/whatsapp-followup.tsx`, `src/components/outreach-composer.tsx`, `src/components/crm/lead-detail.tsx`, `tests/*.test.ts`, `package.json`, `.env.example` — exact current signatures, patterns, and conventions
- [RFC 8058 — Signaling One-Click Functionality for List Email Headers](https://datatracker.ietf.org/doc/html/rfc8058) — exact `List-Unsubscribe-Post: List-Unsubscribe=One-Click` value, HTTPS-POST-only requirement, `List-Unsubscribe` needing at least one HTTPS URI in angle brackets
- [Convex Environment Variables docs](https://docs.convex.dev/production/environment-variables) — confirms `CONVEX_SITE_URL` is always available, built-in, no manual configuration
- [Convex HTTP Actions docs](https://docs.convex.dev/functions/http-actions) — confirms HTTP actions are exposed at `https://<deployment>.convex.site`
- [Resend — POST /emails API reference](https://resend.com/docs/api-reference/emails/send-email) — confirms `headers` is an accepted object field in the raw REST JSON body (not SDK-only)
- [Resend — Custom Headers docs](https://resend.com/docs/dashboard/emails/custom-headers) — confirms `List-Unsubscribe` is an explicitly-supported custom header use case
- `npm view convex version` / `npm view resend version` (run 2026-07-11) — confirms installed versions (1.42.1 / 6.17.2) are current, not stale

### Secondary (MEDIUM confidence)
- WebSearch results on Convex schema optional-field/index behavior (cross-referenced against Convex official docs language: "existing documents that don't have this field will have the field return undefined... you don't need a migration script for this specific case") — consistent across multiple result snippets, not independently fetched from the docs page itself
- WebSearch summary noting Gmail/Yahoo's 2024 bulk-sender requirements effectively mandate `List-Unsubscribe`/one-click support — practical motivation, not itself a compliance/legal source

### Tertiary (LOW confidence)
- None used as load-bearing claims — all header/API-contract claims were cross-checked against an official doc or the IETF RFC text directly via WebFetch.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependency; all tools already installed and verified via `npm view` against the registry
- Architecture: HIGH — every pattern is either read directly from this codebase's existing code or verified against Convex's own type definitions / official docs
- Pitfalls: HIGH — RFC 8058 and Resend header pitfalls verified against primary sources (IETF, Resend docs); Convex-specific pitfalls (codegen, optional-field index behavior) verified against official docs and the existing codebase's own comment about a prior pitfall (`tenant.ts:5`)

**Research date:** 2026-07-11
**Valid until:** ~30 days (stable domain — Convex schema/httpAction semantics and RFC 8058 are not fast-moving; re-verify Resend's `headers` field and installed package versions if this research is reused after that window)
