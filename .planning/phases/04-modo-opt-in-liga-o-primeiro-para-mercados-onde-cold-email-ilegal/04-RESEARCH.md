# Phase 4: Modo opt-in (ligação-primeiro) - Research

**Researched:** 2026-07-11
**Domain:** Compliance-gated prospecting UX (Convex backend + Next.js/React frontend) — generalizing an existing single-channel consent primitive (Phase 2's `waOptIn`) into a market-aware, multi-channel one; no new external technology.
**Confidence:** HIGH (everything is grounded in the actual current repo code, read in full for every file listed in the task's research focus) except the Google Places `regionCode` claim and the suggested city lists, which are MEDIUM.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### OPTIN-01 — Mercados pesquisáveis ≠ mercados emailáveis
- `convex/lib/domain.ts`: adicionar `PT: { code: "PT", name: "Portugal", flag: "🇵🇹", coldEmail: "opt_in" }` ao `MARKETS` (DE/CH/DK/IT/ES já existem como `opt_in`).
- Novo export `OPT_IN_MARKETS = ["ES", "IT", "PT", "DE", "DK", "CH"]` e `SEARCHABLE_MARKETS = [...LAUNCH_MARKETS, ...OPT_IN_MARKETS]`, com helper puro `isSearchableMarket(code)`. **`LAUNCH_MARKETS` e `isLaunchMarket` NÃO mudam** (continuam controlando emailabilidade).
- `convex/places.ts` e `convex/foursquare.ts`: o gate de busca troca `isLaunchMarket` por `isSearchableMarket`; mensagem de erro atualizada.
- Lead de mercado opt-in nasce e permanece `emailable=false` SEMPRE (o `isEmailable` já bloqueia mercados não-launch — comportamento confirmado por teste existente "mercado opt-in bloqueado"); nenhuma mudança no isEmailable.
- `CITIES_BY_COUNTRY`: adicionar 8–12 cidades principais para cada mercado novo (ES: Madrid, Barcelona, Valencia, Sevilla…; IT: Milano, Roma, Torino…; PT: Lisboa, Porto, Braga…; DE: Berlin, München, Hamburg…; DK: København, Aarhus…; CH: Zürich, Genève, Basel…).

#### OPTIN-04 — Consentimento de contato (generaliza o waOptIn da Fase 2)
- Campos novos opcionais no lead: `contactOptInAt: v.number()`, `contactOptInSource: v.string()` (valores: "phone_call" | "in_person" | "reply" | "other"), `contactOptInNote: v.string()`. Os campos `waOptInAt/waOptInSource` da Fase 2 permanecem (legado; não migrar).
- Mutation autenticada `leads.recordContactOptIn({ leadId, source, note? })` — ownership check, grava campos + insere evento (ampliar union de `events.type` com `v.literal("contact_opt_in")`).
- Helper puro em domain.ts: `canContactByEmail(lead): boolean` = `lead.emailable === true || lead.contactOptInAt != null` — consentimento explícito supera regime de mercado E a armadilha do autônomo (consentimento pessoal é base legal por si).
- WhatsApp: `hasWaOptIn` generaliza para aceitar `contactOptInAt` OU `waOptInAt` (compatibilidade com dados existentes) — um consentimento de contato vale para os dois canais.

#### OPTIN-05 — Guardrail server-side
- `outreach.draft` e `outreach.send`: trocar o check `!lead.emailable` por `!canContactByEmail(lead)`; erro pt-BR: "Mercado opt-in: registre o consentimento do prospect antes de enviar email." (mantém as checagens de supressão da Fase 2 intactas, em conjunto).
- Preview/score/CRM: sem gate de mercado (já é o comportamento atual — `previews.generate` não checa mercado; não tocar).

#### OPTIN-02 — Aba "Ligação primeiro"
- `src/app/(app)/leads/page.tsx`: tabs no topo — "Email primeiro" (default) e "Ligação primeiro" — estilo pílula consistente com o design system. A aba controla: (a) países do select (LAUNCH_MARKETS vs OPT_IN_MARKETS), (b) filtro da lista de leads por regime do `countryCode` (opt-out vs opt-in), (c) variante do card.
- `src/components/lead-card.tsx`: prop nova `variant?: "email" | "call"`. Na variante `call`: botão primário **Ligar** (`tel:` com o telefone), botão **Script de ligação**, botão/fluxo **Registrar consentimento** (padrão visual do WhatsAppFollowup da Fase 2: select de origem + confirmar); NENHUMA ação de cold email. O rodapé de compliance mostra "📞 Ligação primeiro · email após consentimento" (em vez de "Fora do escopo compliant"); quando `contactOptInAt` presente, mostra "✓ Consentimento registrado em {data}" e o card passa a expor o fluxo normal de email.
- OPTIN-06: na aba "Ligação primeiro", banner discreto (borda warm, texto curto): "Mercados em validação jurídica — ligação B2B permitida; email/WhatsApp só após consentimento registrado." Flag `legalReview: "pending"` por mercado no `MARKETS` (novos mercados nascem pending; os 5 atuais ficam sem flag/validated).
- Empty state da aba de ligação explica o fluxo (ligar → consentimento → email destrava).

#### OPTIN-03 — Script de ligação por IA
- `convex/lib/outreachAi.ts`: nova função `writeCallScript(apiKey, lead)` no padrão do `writeEmail` — modelo `claude-sonnet-5`, retorna JSON `{ script, translation }`: `script` no idioma do mercado, `translation` em pt-BR, ~150 palavras, citando a dor específica (reusar `SIGNAL_TEXT`), estrutura: abertura → dor observada → oferta do preview → **fecho pedindo o consentimento explicitamente** ("posso te enviar a prévia por email/WhatsApp?"). Fallback de parse igual ao writeEmail.
- `LANG` map ganha os idiomas novos: ES→Spanish, IT→Italian, PT→Portuguese, DE→German, DK→Danish, CH→German (padrão suíço-alemão; nota em comentário).
- Action `outreach.callScript({ leadId })` — auth + ownership; exige telefone; persiste no lead (`callScript`, `callScriptPt`, `callScriptAt` opcionais no schema) para não regenerar à toa; regenerar disponível (sobrescreve). Requer `ANTHROPIC_API_KEY` (mesmo erro-padrão do draft).
- UI: painel/expansão no card (ou modal simples) mostrando script e tradução lado a lado com botão copiar em cada um.

### Claude's Discretion
- Copy exata do banner, do empty state e dos botões.
- Modal vs painel expansível para o script.
- Listas exatas de cidades por mercado novo.
- Seed do demo ganhar 2–3 leads de mercado opt-in (nice-to-have; se entrar, manter DEMO coerente).

### Deferred Ideas (OUT OF SCOPE)
- França como mercado "conditional" — exige análise jurídica própria (CNIL) antes de entrar
- Mala direta com QR code do preview (canal legal em toda a UE) — nota no backlog
- DMs de Instagram — zona cinzenta jurídica, validar antes
- Discador/telefonia integrada (registrar ligações, gravar) — produto grande, não é desta fase
- Marcar mercados como "validated" pós-análise jurídica (flag existe; o fluxo de validação é operacional)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| OPTIN-01 | Descoberta funciona em mercados opt-in (ES/IT/PT/DE/DK/CH); "mercado pesquisável" ≠ "mercado emailável"; lead opt-in nasce `emailable=false` sempre | `domain.ts` current `MARKETS`/`LAUNCH_MARKETS`/`isEmailable` read in full (§Architecture Patterns, §Code Examples); `places.ts`/`foursquare.ts` gate call sites confirmed (only 2, both change); `isEmailable`'s internal `isLaunchMarket` call confirmed as the ONE call site that must NOT change; Google Places `regionCode`/`languageCode` behavior for ES/IT/PT/DE/DK/CH researched (§Pitfall 5) |
| OPTIN-02 | Abas "Email primeiro" / "Ligação primeiro" na página de Leads; card da segunda prioriza telefone/script, sem cold email | Current `leads/page.tsx` and `lead-card.tsx` read in full (§Architecture Patterns); existing pill-tab visual pattern found in `outreach/page.tsx` `FILTERS` and `landing/laptop.tsx` `data-active` (§Code Examples); client-side filtering strategy (no new Convex query needed) documented |
| OPTIN-03 | Script de ligação por IA no idioma do mercado + tradução pt-BR, citando a dor específica | `outreachAi.ts` `writeEmail`/`LANG`/`SIGNAL_TEXT` read in full and used as the exact mold (§Code Examples); confirmed `SIGNAL_TEXT` is module-private (no export needed, same file); confirmed no existing test coverage for AI-network functions (§Validation Architecture) |
| OPTIN-04 | Consentimento de contato (email/WhatsApp) com origem+timestamp+evento; destrava composer | `leads.ts` `recordWaOptIn` read in full as the shape to generalize (§Code Examples); `schema.ts` `events` union and `leads` table fields confirmed; found that Phase 2's `waOptIn` note is NOT persisted on the lead (only in event meta) — OPTIN-04's `contactOptInNote` IS a lead field, a deliberate generalization improvement (§Pitfall 3) |
| OPTIN-05 | `outreach.draft`/`send` recusam lead opt-in sem consentimento, guardrail server-side | `outreach.ts` `draft`/`send` read in full, exact line-level gate location identified (§Code Examples); confirmed `previews.generate` has no market gate (nothing to touch); confirmed `crm/lead-detail.tsx`'s `OutreachComposer` has NO client-side `emailable` gate — it already fully depends on the backend action throwing, so OPTIN-05 alone makes consented opt-in leads draftable from the CRM detail view too, with no CRM UI change required (§Pitfall 4) |
| OPTIN-06 | Aviso "validação jurídica pendente" até validação por mercado | `Market` interface in `domain.ts` read; `legalReview` is a new optional field, addition is non-breaking; resolved ambiguity on WHICH markets get `legalReview: "pending"` (§Pitfall 6) |
</phase_requirements>

## Summary

This phase does not introduce any new external technology — it is 100% an extension of patterns already proven in Phases 1-3 of this same repo. The three pillars are: (1) a new pure predicate pair in `convex/lib/domain.ts` — `isSearchableMarket` (search gate, additive) and `canContactByEmail` (email gate, a strict superset of the existing `isEmailable`) — that keeps the existing `isEmailable`/`isLaunchMarket` pair completely untouched; (2) a generalized consent primitive (`contactOptInAt/Source/Note` + `recordContactOptIn` mutation + `contact_opt_in` event) that is an almost line-for-line copy of Phase 2's `waOptIn`/`recordWaOptIn`/`wa_opt_in`, with `hasWaOptIn` widened to accept either timestamp; (3) a new AI action (`outreach.callScript` → `writeCallScript`) that is a structural clone of the existing `outreach.draft` → `writeEmail` pipeline, sharing the same `LANG` map (now widened) and the same `SIGNAL_TEXT` pain descriptions.

The riskiest part of this phase is NOT any of the AI/backend work — it's correctly threading `canContactByEmail` through every place that currently reads `lead.emailable` directly, because `emailable` itself must never change meaning (it stays "opt-out-market-defensible", a narrower concept than "currently contactable"). Two call sites of the old field were found that are NOT in the CONTEXT.md integration-point list and deserve a planning decision: `crm/lead-detail.tsx`'s static warning banner (cosmetic-only staleness, not a compliance bug) and `convex/lib/compliance.ts`'s `FOOTER_COPY` map (falls back to English for the 5 new languages — functional, not localized). Both are documented as pitfalls below with a recommended default (leave as-is, note as backlog) since neither is required by OPTIN-01..06's letter.

**Primary recommendation:** Build strictly in the order domain.ts/schema.ts (foundation, wave 1) → backend actions/mutations (wave 2) → UI (wave 2 or 3), reusing the Phase 2 `waOptIn` pattern and Phase-1-3 `outreachAi.ts` pattern verbatim wherever the shape matches, and add new `node:test` cases to the EXISTING `tests/domain.test.ts` file (not a new file) for every new pure helper.

## Standard Stack

No new dependency is needed or allowed (`AGENTS.md`: "sem dependência nova"). Everything is built with what's already installed.

### Core (already in the repo, reused as-is)
| Library | Version | Purpose | Why Standard (in this repo) |
|---------|---------|---------|------------------------------|
| convex | ^1.42.1 | backend (actions/mutations/queries/schema) | already the entire backend |
| next | 16.2.10 | app router, client components | already the entire frontend — note `AGENTS.md` warns this is NOT stock Next.js training-data behavior; this phase adds no new Next.js API surface (no routing/data-fetching change), only more client-state (`useState`) inside existing `"use client"` files, so no doc dive was necessary beyond confirming `node_modules/next/dist/docs/` structure exists |
| react-icons (md set) | ^5.7.0 | icons (`MdOutlineCall`, `MdOutlineGppGood`, etc.) | already used throughout `lead-card.tsx`/`whatsapp-followup.tsx` |
| Anthropic Messages API (`claude-sonnet-5`) | n/a (raw `fetch`) | `writeCallScript`, mirroring `writeEmail` | already the pattern in `convex/lib/outreachAi.ts` — no SDK, raw `fetch` to `https://api.anthropic.com/v1/messages` |
| Google Places API (New) Text Search | v1 | discovery for the 6 new opt-in markets | already the pattern in `convex/places.ts`; verified `regionCode` uses CLDR codes (ES/IT/PT/DE/DK/CH match ISO 3166-1 exactly, no special-casing needed unlike `GB`) |

### Installation
No install step. Nothing to add to `package.json`.

### Version verification
Not applicable — no new package. Confirmed `package.json` test script (`node --experimental-strip-types --test tests/*.test.ts`) requires no config change to pick up new test cases added to `tests/domain.test.ts`.

## Architecture Patterns

### Recommended change map (files touched, grouped by wave)

```
convex/
├── lib/
│   ├── domain.ts        # WAVE 1 (foundation): MARKETS.PT, OPT_IN_MARKETS, SEARCHABLE_MARKETS,
│   │                     #   isSearchableMarket, canContactByEmail, hasWaOptIn (generalize),
│   │                     #   legalReview field on Market, CITIES_BY_COUNTRY (6 new keys)
│   └── outreachAi.ts    # WAVE 2: writeCallScript, LANG (+6 keys)
├── schema.ts             # WAVE 1: leads.contactOptIn{At,Source,Note}, leads.callScript{,Pt,At},
│                         #   events.type + "contact_opt_in"
├── places.ts              # WAVE 2: isLaunchMarket → isSearchableMarket
├── foursquare.ts          # WAVE 2: isLaunchMarket → isSearchableMarket
├── leads.ts                # WAVE 2: recordContactOptIn (mutation), setCallScript (internalMutation)
├── outreach.ts             # WAVE 2: draft/send gate emailable → canContactByEmail; callScript (action)
└── whatsapp.ts              # WAVE 2: no code change needed IF hasWaOptIn is generalized in domain.ts
                              #   (sendFollowup already calls hasWaOptIn(lead), which now also
                              #   accepts contactOptInAt automatically)

src/
├── app/(app)/leads/page.tsx     # WAVE 2/3: tabs, per-tab market list, per-tab filtering, empty state
└── components/
    ├── lead-card.tsx             # WAVE 2/3: variant prop, call-mode actions, compliance footer logic
    ├── call-script-panel.tsx     # WAVE 2/3 (NEW): script+translation UI, mirrors whatsapp-followup.tsx shape
    └── contact-opt-in-button.tsx # WAVE 2/3 (NEW, optional extraction): mirrors the opt-in half of
                                    #   whatsapp-followup.tsx (source select + confirm), reusable if the
                                    #   "call" card variant and a future lead-detail integration both need it

tests/
└── domain.test.ts        # WAVE 1: new cases for isSearchableMarket, canContactByEmail, hasWaOptIn
                            #   (generalized), MARKETS.PT, legalReview presence — additions to the
                            #   EXISTING file, not a new file
```

### Pattern 1: Two-tier market gate — searchable vs emailable (already half-built)

**What:** The repo already separates "is this a valid market at all" (`MARKETS` lookup) from "can we cold-email this specific lead" (`isEmailable`, which internally requires `isLaunchMarket`). OPTIN-01 adds a THIRD, wider tier — "can we search/discover in this market" (`isSearchableMarket`) — that sits between "any market in MARKETS" and "launch market". `isLaunchMarket`/`isEmailable` must stay byte-for-byte as they are; only the search-time gate widens.

**When to use:** Any new gate that governs what the DISCOVERY pipeline is allowed to do (search, list markets in a dropdown) should reference `SEARCHABLE_MARKETS`/`isSearchableMarket`. Any gate that governs whether a specific LEAD can receive a cold email must keep using `isEmailable`/`lead.emailable` (or, after OPTIN-04, `canContactByEmail`, which is a superset).

**Example (current code, HIGH confidence — read directly):**
```typescript
// Source: convex/lib/domain.ts:19-39 (current, before this phase)
export const MARKETS: Record<string, Market> = {
  GB: { code: "GB", name: "Reino Unido", flag: "🇬🇧", coldEmail: "opt_out" },
  NL: { code: "NL", name: "Holanda", flag: "🇳🇱", coldEmail: "opt_out" },
  IE: { code: "IE", name: "Irlanda", flag: "🇮🇪", coldEmail: "opt_out" },
  SE: { code: "SE", name: "Suécia", flag: "🇸🇪", coldEmail: "opt_out" },
  NO: { code: "NO", name: "Noruega", flag: "🇳🇴", coldEmail: "conditional" },
  DE: { code: "DE", name: "Alemanha", flag: "🇩🇪", coldEmail: "opt_in" },
  CH: { code: "CH", name: "Suíça", flag: "🇨🇭", coldEmail: "opt_in" },
  DK: { code: "DK", name: "Dinamarca", flag: "🇩🇰", coldEmail: "opt_in" },
  IT: { code: "IT", name: "Itália", flag: "🇮🇹", coldEmail: "opt_in" },
  ES: { code: "ES", name: "Espanha", flag: "🇪🇸", coldEmail: "opt_in" },
};

export const LAUNCH_MARKETS = ["GB", "NL", "IE", "SE", "NO"];

export function isLaunchMarket(countryCode: string): boolean {
  return LAUNCH_MARKETS.includes(countryCode.toUpperCase());
}
```

**Proposed addition (new code, following the exact same style):**
```typescript
// New in convex/lib/domain.ts, added alongside LAUNCH_MARKETS — Market gets an optional
// legalReview field; PT is a brand-new market entry; the other 5 opt-in markets that
// already existed in MARKETS (DE/CH/DK/IT/ES) also get legalReview: "pending" here because
// this phase is the first time they become searchable/contactable at all — see Pitfall 6.
export interface Market {
  code: string;
  name: string;
  flag: string;
  coldEmail: ColdEmail;
  legalReview?: "pending" | "validated"; // undefined = not applicable (opt-out launch markets)
}

// add to MARKETS:
DE: { code: "DE", name: "Alemanha", flag: "🇩🇪", coldEmail: "opt_in", legalReview: "pending" },
CH: { code: "CH", name: "Suíça", flag: "🇨🇭", coldEmail: "opt_in", legalReview: "pending" },
DK: { code: "DK", name: "Dinamarca", flag: "🇩🇰", coldEmail: "opt_in", legalReview: "pending" },
IT: { code: "IT", name: "Itália", flag: "🇮🇹", coldEmail: "opt_in", legalReview: "pending" },
ES: { code: "ES", name: "Espanha", flag: "🇪🇸", coldEmail: "opt_in", legalReview: "pending" },
PT: { code: "PT", name: "Portugal", flag: "🇵🇹", coldEmail: "opt_in", legalReview: "pending" },

export const OPT_IN_MARKETS = ["ES", "IT", "PT", "DE", "DK", "CH"];
export const SEARCHABLE_MARKETS = [...LAUNCH_MARKETS, ...OPT_IN_MARKETS];

export function isSearchableMarket(countryCode: string): boolean {
  return SEARCHABLE_MARKETS.includes(countryCode.toUpperCase());
}

// isLaunchMarket / isEmailable: UNCHANGED. isEmailable's internal isLaunchMarket call
// (line 55 in the current file) MUST NOT be touched — it's the reason opt-in-market leads
// stay emailable=false forever, which OPTIN-01's acceptance criteria depends on.

/** OPTIN-04: consentimento explícito destrava email independente de mercado/forma jurídica. */
export function canContactByEmail(lead: {
  emailable?: boolean | null;
  contactOptInAt?: number | null;
}): boolean {
  if (lead.emailable === true) return true;
  return typeof lead.contactOptInAt === "number" && lead.contactOptInAt > 0;
}

/** hasWaOptIn generalized: accepts EITHER a WhatsApp-specific or a generic contact opt-in. */
export function hasWaOptIn(lead: {
  waOptInAt?: number | null;
  contactOptInAt?: number | null;
}): boolean {
  const wa = typeof lead.waOptInAt === "number" && lead.waOptInAt > 0;
  const contact = typeof lead.contactOptInAt === "number" && lead.contactOptInAt > 0;
  return wa || contact;
}
```

The two gate call sites that DO change:
```typescript
// Source: convex/places.ts:5,37-40 and convex/foursquare.ts:5,36-39 (identical shape in both)
import { isLaunchMarket, MARKETS, clampDiscoveryCount } from "./lib/domain";
// ...
if (!isLaunchMarket(country)) {
  const name = MARKETS[country]?.name ?? country;
  throw new Error(`${name} está fora do escopo compliant (cold email só em mercados opt-out).`);
}
// →
import { isSearchableMarket, MARKETS, clampDiscoveryCount } from "./lib/domain";
// ...
if (!isSearchableMarket(country)) {
  const name = MARKETS[country]?.name ?? country;
  throw new Error(`${name} ainda não está disponível para busca.`);
}
```

**Confirmed via grep: these are the ONLY 3 call sites of `isLaunchMarket` in the whole codebase** (`convex/places.ts:37`, `convex/foursquare.ts:36`, `convex/lib/domain.ts:55` inside `isEmailable`). The first two change to `isSearchableMarket`; the third must not change. `src/app/page.tsx` and `src/components/crm/create-lead-modal.tsx` reference the `LAUNCH_MARKETS` *array* directly (not the function) for unrelated display/dropdown purposes — see Pitfall 7 for whether those need touching (recommendation: no).

### Pattern 2: Consent primitive — copy Phase 2's `waOptIn` shape exactly

**What:** `leads.recordWaOptIn` is the exact template for `leads.recordContactOptIn`: authenticated mutation, ownership check via `orgId` match, `Date.now()` timestamp, patch the lead, insert an `events` row, return `{ optInAt }`.

**Example (current code, HIGH confidence):**
```typescript
// Source: convex/leads.ts:174-196 (current)
export const recordWaOptIn = mutation({
  args: {
    leadId: v.id("leads"),
    source: v.string(), // "replied_email" | "phone_call" | "in_person"
    note: v.optional(v.string()),
  },
  handler: async (ctx, { leadId, source, note }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    const now = Date.now();
    await ctx.db.patch(leadId, { waOptInAt: now, waOptInSource: source });
    await ctx.db.insert("events", {
      orgId,
      type: "wa_opt_in",
      leadId,
      at: now,
      meta: { source, ...(note ? { note } : {}) },
    });
    return { optInAt: now };
  },
});
```

**Proposed `recordContactOptIn` — the one meaningful difference from the template is that `note` IS persisted on the lead doc (not just in the event meta), per CONTEXT.md's explicit schema list:**
```typescript
export const recordContactOptIn = mutation({
  args: {
    leadId: v.id("leads"),
    source: v.string(), // "phone_call" | "in_person" | "reply" | "other"
    note: v.optional(v.string()),
  },
  handler: async (ctx, { leadId, source, note }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    const now = Date.now();
    await ctx.db.patch(leadId, {
      contactOptInAt: now,
      contactOptInSource: source,
      ...(note ? { contactOptInNote: note } : {}),
    });
    await ctx.db.insert("events", {
      orgId,
      type: "contact_opt_in",
      leadId,
      at: now,
      meta: { source, ...(note ? { note } : {}) },
    });
    return { optInAt: now };
  },
});
```

Note the **different source vocabulary**: `waOptInSource` uses `"replied_email" | "phone_call" | "in_person"`; `contactOptInSource` per CONTEXT.md uses `"phone_call" | "in_person" | "reply" | "other"` — `"reply"` replaces `"replied_email"` and `"other"` is new. Both are plain `v.string()` in the schema (not a `v.union` of literals), so there is no schema-level enforcement either way — the UI `<select>` options are what actually constrains this.

### Pattern 3: AI drafting action — clone `outreach.draft` → `writeEmail`

**What:** `outreach.draft` is the template for `outreach.callScript`: `requireOrgId`, load lead via `internal.leads.getInternal`, ownership check, feature-specific precondition (email: none beyond `emailable`; call script: requires `lead.phone`), require the API key env var, call the AI helper, persist via an internal mutation, return the result.

**Example (current code, HIGH confidence):**
```typescript
// Source: convex/outreach.ts:137-170 (current)
export const draft = action({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }): Promise<{ subject: string; body: string }> => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.runQuery(internal.leads.getInternal, { leadId });
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    if (!lead.emailable) {
      throw new Error("Fora do escopo compliant: mercado opt-in, ou pessoa nomeada/autônomo.");
    }
    if (lead.email) {
      const suppressed = await ctx.runQuery(internal.suppressions.isSuppressed, {
        email: normalizeEmail(lead.email),
        orgId,
      });
      if (suppressed) throw new Error("Este contato pediu para não ser contatado (opt-out).");
    }
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY não configurada no deployment Convex.");

    const token = await ctx.runMutation(internal.previews.ensureForLead, { leadId });
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const email = await writeEmail(key, lead, `${appUrl}/p/${token}`);

    await ctx.runMutation(internal.outreach.upsertDraft, {
      orgId, leadId, subject: email.subject, body: email.body, previewToken: token,
    });
    return email;
  },
});
```

**Proposed `outreach.callScript` — note it does NOT need `previews.ensureForLead`/a preview token, because the script is spoken, not a clickable link (CONTEXT.md's `writeCallScript(apiKey, lead)` signature takes no `previewUrl` argument):**
```typescript
export const callScript = action({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }): Promise<{ script: string; translation: string }> => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.runQuery(internal.leads.getInternal, { leadId });
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    if (!lead.phone) throw new Error("Lead sem telefone.");
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY não configurada no deployment Convex.");

    const result = await writeCallScript(key, lead);

    await ctx.runMutation(internal.leads.setCallScript, {
      leadId,
      script: result.script,
      translation: result.translation,
    });
    return result;
  },
});
```

```typescript
// New internalMutation in convex/leads.ts, next to applyScore/getInternal
export const setCallScript = internalMutation({
  args: { leadId: v.id("leads"), script: v.string(), translation: v.string() },
  handler: async (ctx, { leadId, script, translation }) => {
    await ctx.db.patch(leadId, {
      callScript: script,
      callScriptPt: translation,
      callScriptAt: Date.now(),
    });
  },
});
```

`writeCallScript` itself, mirroring `writeEmail`'s exact request/response/fallback shape (`convex/lib/outreachAi.ts:31-89`, reusing the module-private `SIGNAL_TEXT` and the widened `LANG` map):
```typescript
export async function writeCallScript(
  apiKey: string,
  lead: Doc<"leads">,
): Promise<{ script: string; translation: string }> {
  const lang = LANG[lead.countryCode] ?? "English";
  const s = lead.signals;
  const pains = s
    ? (Object.keys(SIGNAL_TEXT) as (keyof Signals)[]).filter((k) => s[k]).map((k) => SIGNAL_TEXT[k])
    : [];

  const system =
    `You write a SHORT spoken cold-call opening script (~150 words) for an independent web ` +
    `professional calling a local business about their online presence, in a market where cold ` +
    `EMAIL is not legally usable without prior consent but a B2B phone call is. Write the "script" ` +
    `field in ${lang}. The call MUST: (1) open by identifying the caller, (2) name the SPECIFIC gap ` +
    `noticed, (3) mention a free preview website already built for them, (4) end by EXPLICITLY asking ` +
    `for permission to send it by email or WhatsApp. Also return a "translation" field: a faithful ` +
    `Brazilian Portuguese (pt-BR) translation of the same script, for a caller who does not speak ${lang}. ` +
    `Return STRICT JSON only: {"script": string, "translation": string}. No markdown.`;

  const user =
    `Business: ${lead.name}` +
    `${lead.city ? ` in ${lead.city}` : ""}` +
    `${lead.category ? `, a ${lead.category.replace(/_/g, " ")}` : ""}. ` +
    `Issues noticed: ${pains.length ? pains.join("; ") : "weak online presence"}. ` +
    `Write the call script and its pt-BR translation.`;

  // same fetch/response/JSON.parse-fallback shape as writeEmail — see convex/lib/outreachAi.ts:59-89
}
```

### Pattern 4: Client-side per-tab filtering (no new Convex query needed)

**What:** `leads.list` already returns ALL of the org's leads in one `.collect()` (no market filter argument — see `convex/leads.ts:49-64`). The "Email primeiro"/"Ligação primeiro" split can and should be done client-side in `leads/page.tsx`, filtering the already-fetched array by `OPT_IN_MARKETS.includes(lead.countryCode)` vs `LAUNCH_MARKETS.includes(lead.countryCode)`. No backend query change is required for OPTIN-02.

**When to use:** This phase only. If lead volume ever gets large enough that `.collect()`-everything becomes a perf problem, that's `SCAL-01` (v2, already tracked in REQUIREMENTS.md as `Paginação/take nas queries .collect()`), explicitly out of scope here.

**Existing pill-tab visual patterns to reuse (both HIGH confidence, read directly):**
```tsx
// Source: src/components/landing/laptop.tsx:592-604 (data-active pattern)
<button
  type="button"
  data-tab
  data-active={k === 0 ? "true" : "false"}
  aria-pressed={k === 0}
  className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-muted transition-all duration-300 hover:text-foreground data-[active=true]:border-brand/40 data-[active=true]:bg-brand-soft data-[active=true]:text-brand"
>
```
```tsx
// Source: src/app/(app)/outreach/page.tsx:78-106 (state-driven pill filter, no data-active, uses
// conditional className — this is closer to how leads/page.tsx should implement the 2 tabs since
// it already lives in the (app) group and uses useState, not CSS attribute selectors)
{FILTERS.map((f) => {
  const active = filter === f.id;
  return (
    <button
      key={f.id}
      onClick={() => { setFilter(f.id); setPage(0); }}
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
        active ? "bg-brand text-brand-fg shadow-[var(--shadow-sm)]"
               : "border border-border text-muted hover:border-border-strong hover:text-foreground"
      }`}
    >
      {f.label}
    </button>
  );
})}
```
Recommendation: follow the `outreach/page.tsx` state-driven style (simpler, already inside the `(app)` route group, no CSS-attribute-selector machinery needed) for the 2-tab switch in `leads/page.tsx`.

### Pattern 5: `LeadCard` — variant is a self-contained rendering mode, not a slot composition

**Current `LeadCard` structure** (`src/components/lead-card.tsx:36-180`, read in full) has 4 zones: header (name+select), category/tier/score, info rows (phone/place/address), compliance footer (`lead.emailable` boolean), and a generic `action` slot (currently always `<GeneratePreviewButton variant="primary" />`, passed by the parent page) plus a conditional "Site atual" link.

**Recommendation:** Add `variant?: "email" | "call"` (default `"email"`) as an internal render-mode switch, NOT a slot-composition change. When `variant === "call"`, the card renders its OWN action row (Ligar / Script de ligação / Registrar consentimento) instead of accepting the `action` prop from the parent — because these 3 actions are stateful (call the `callScript` action, the `recordContactOptIn` mutation) in a way the current generic `action?: ReactNode` slot pattern doesn't support cleanly. The parent (`leads/page.tsx`) then simply stops passing `action={<GeneratePreviewButton .../>}` when rendering the "Ligação primeiro" tab (or passes `variant="call"` and no `action`).

**The compliance-footer logic needs a 3-way branch, not the current 2-way `lead.emailable` ternary:**
```typescript
// Current (src/components/lead-card.tsx:146-155), 2-way:
lead.emailable ? "Abordável por email" : "Fora do escopo compliant"

// Needed, 3-way (variant "call" + no consent / variant "call" + consent / variant "email" as today):
if (variant === "call" && !lead.contactOptInAt) {
  // "📞 Ligação primeiro · email após consentimento"
} else if (variant === "call" && lead.contactOptInAt) {
  // "✓ Consentimento registrado em {formatted date}" — AND render the normal email action too
} else {
  // unchanged: lead.emailable ? "Abordável por email" : "Fora do escopo compliant"
}
```
This means variant `"call"` is not fully static — when `contactOptInAt` is present, the card must ALSO expose the normal email action (per CONTEXT.md: "o card passa a expor o fluxo normal de email"). Plan for this as a genuine 3-state card, not a 2-variant one.

**`WhatsAppFollowup`'s opt-in-source-select pattern (HIGH confidence, read in full) is the direct template for the new "Registrar consentimento" flow:**
```tsx
// Source: src/components/whatsapp-followup.tsx:44-84 (the opt-in-not-yet-registered branch)
if (!optInAt) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-muted">WhatsApp exige opt-in registrado do prospect.</p>
      <div className="flex items-center gap-1.5">
        <select value={source} onChange={(e) => setSource(e.target.value)} className="..." aria-label="Origem do opt-in">
          {OPT_IN_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={async () => { /* await recordOptIn({ leadId, source }) */ }} disabled={busy} className="...">
          {busy ? "…" : "Registrar opt-in"}
        </button>
      </div>
      {msg && <p className="text-[10px] text-muted">{msg}</p>}
    </div>
  );
}
```
For the new component, swap `OPT_IN_SOURCES` for the OPTIN-04 vocabulary (`phone_call`/`in_person`/`reply`/`other`) and call `leads.recordContactOptIn` instead of `leads.recordWaOptIn`.

### Anti-Patterns to Avoid
- **Touching `isEmailable` or `isLaunchMarket`:** these define the opt-out-market legal defensibility rule from Phase 1/pre-Phase-1 work; OPTIN-01's acceptance criteria explicitly depends on them staying untouched. The existing test `"isEmailable: opt-in market always blocked"` (`tests/domain.test.ts:91-94`) is a regression guard — if a plan task changes `isEmailable`'s behavior, this test must still pass unmodified.
- **Building a new modal library or portal helper for the call-script panel:** `src/components/crm/create-lead-modal.tsx:100` already uses `react-dom`'s `createPortal` directly with an `Escape`-to-close `useEffect` — reuse that exact pattern if a modal (vs. inline expansion) is chosen.
- **Hand-rolling AI JSON-response parsing:** reuse the exact try/catch `JSON.parse` + fallback shape from `writeEmail` (`convex/lib/outreachAi.ts:82-88`) in `writeCallScript`, don't invent a new parser or add a JSON-mode/tool-use dependency.
- **Persisting phone calls in the `outreach` table:** the `outreach.channel` union is `v.union(v.literal("email"), v.literal("whatsapp"))`; CONTEXT.md explicitly defers "discador/telefonia integrada (registrar ligações, gravar)" — do not add a `"call"` channel or log call attempts as `outreach` rows in this phase.
- **Gating `outreach.callScript` the same way as `outreach.draft`:** `draft`/`send` check `canContactByEmail`/suppression because they SEND something; `callScript` only requires a phone number — a call script for an unconsented opt-in-market lead is exactly the point of this phase (the call is what earns the consent). Do not accidentally require `canContactByEmail` before generating a call script.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Phone dialing from the browser | Custom click-to-call widget/JS | Native `<a href={`tel:${lead.phone}`}>` | Zero JS needed, works on every device that has a dialer; matches the simplicity bar of the rest of this codebase (e.g. `wa.me` links in `whatsapp-followup.tsx`) |
| Copy-to-clipboard for the script/translation | A clipboard library | `navigator.clipboard.writeText(text)` in an `onClick`, with a transient "Copiado!" state via `useState` | Native Clipboard API, no dependency, same pattern-weight as everything else in this repo |
| AI JSON response parsing/fallback | A new schema-validation-on-AI-output layer (e.g. zod parse of the AI response) | The existing try/catch `JSON.parse` + plain-text fallback in `writeEmail` (copy verbatim into `writeCallScript`) | The repo has `zod` as a dependency already but does NOT use it for AI-response validation anywhere — introducing it here for one function would be an inconsistent pattern; the existing fallback (return raw text as one of the two fields) is the established "acceptable degradation" |
| Consent/opt-in bookkeeping | A generic "consents" table/module | The existing per-lead timestamp+source+event pattern (`waOptInAt` today, `contactOptInAt` this phase) | Phase 2 already established this exact shape and it's proven; a generalized consents table would be a bigger schema change than this phase's scope calls for |
| Locale/language selection for AI + footer copy | A new i18n framework | The existing two independent maps: `LANG` (outreachAi.ts, language NAMES like "Spanish") and `FOOTER_COPY` (compliance.ts, keyed the same way) — Phase 3 already decided these stay independent (see `.planning/STATE.md` Phase 3 decision: "mapa countryCode->locale independente do LANG de outreachAi.ts") | Consistency with the established pattern; see Pitfall 2 below for the gap this creates |

**Key insight:** every "new" piece of this phase already has a structurally identical sibling somewhere in Phases 1-3 of this exact repo. The research effort here was almost entirely "find the sibling and diff it against the CONTEXT.md decision," not "research an unfamiliar domain."

## Common Pitfalls

### Pitfall 1: Confusing `isEmailable`'s market-neutrality with the new `canContactByEmail`
**What goes wrong:** A plan task casually changes `outreach.draft`'s `if (!lead.emailable)` to `if (!lead.emailable && !isLaunchMarket(...))` or similar ad-hoc logic instead of using the single new `canContactByEmail` helper.
**Why it happens:** `emailable` conflates two different failure reasons (wrong market vs. sole-trader/named-contact trap) and it's tempting to special-case market checks inline instead of introducing the new pure helper.
**How to avoid:** Always gate through `canContactByEmail(lead)`, never re-derive market logic inline in `outreach.ts`. It correctly also unlocks OPT-OUT-market sole-traders/named-contacts once they've given explicit consent (see Pitfall 3's note) — this is intentional per CONTEXT.md's `canContactByEmail` definition ("consentimento explícito supera regime de mercado E a armadilha do autônomo"), not a bug to "fix."
**Warning signs:** Any new `if` that reads `lead.emailable` directly in `outreach.ts`/`outreach-composer.tsx` context after this phase ships is a signal the gate wasn't fully migrated.

### Pitfall 2: The opt-out email footer will silently render in English for the 5 new languages
**What goes wrong:** Once a Spanish/Italian/Portuguese/German/Danish lead gets `contactOptInAt` and `outreach.draft`/`send` succeeds (because `canContactByEmail` is now true), the email BODY will correctly be written in the market's language (because `writeEmail` uses the same widened `LANG` map), but the COMPLIANCE FOOTER injected by `withOptOutFooter`/`send` will fall back to English, because `convex/lib/compliance.ts`'s `FOOTER_COPY` map (`convex/lib/compliance.ts:6-11`) only has `English`/`Dutch`/`Swedish`/`Norwegian` keys, and `optOutFooter()`'s fallback is `FOOTER_COPY.English` for any unrecognized language string.
**Why it happens:** `FOOTER_COPY` and `LANG` are two independent maps (an explicit Phase 3 decision, logged in `STATE.md`) that happen to use the same key format ("Spanish", "Italian", etc.) but were never kept in sync because nothing in Phases 1-3 ever fed a non-launch-market language into `optOutFooter`.
**How to avoid:** This is NOT a compliance bug — COMP-03's requirement ("todo email sai com rodapé de opt-out") is still satisfied, just not localized. CONTEXT.md's decisions do not mention `compliance.ts`/`FOOTER_COPY` at all, so treat this as out of scope for OPTIN-01..06 by default. If the planner wants full localization, it's a small additive change (5 more `FOOTER_COPY` entries) — flag it as an optional task, not a blocking one.
**Warning signs:** A verification step that literally sends/drafts an email for a consented ES/IT/PT/DE/DK lead and expects the footer text to be in that language will fail; that expectation should not be in this phase's acceptance criteria unless the planner explicitly adds the `FOOTER_COPY` task.

### Pitfall 3: `contactOptInNote` is a genuine schema addition, not a copy of `waOptIn`'s note handling
**What goes wrong:** Assuming `recordContactOptIn` should follow `recordWaOptIn` 100% literally, including NOT persisting the note on the lead doc.
**Why it happens:** `recordWaOptIn` (`convex/leads.ts:174-196`) only ever puts `note` into the `events` row's `meta` — it does NOT patch a `waOptInNote` field onto the lead (no such field exists in `schema.ts`). It would be easy to assume `recordContactOptIn` should mirror that exactly.
**How to avoid:** CONTEXT.md is explicit that `contactOptInNote: v.string()` IS a new lead-level schema field (unlike `waOptIn`'s note, which only lives in the event). Persist it on both the lead doc (via `ctx.db.patch`) AND the event meta, as shown in Pattern 2 above.
**Warning signs:** A plan/task description that says "generalize `recordWaOptIn`" without calling out this one deliberate divergence risks under-implementing OPTIN-04's schema requirement.

### Pitfall 4: `crm/lead-detail.tsx`'s compliance warning banner will go stale, but the email flow will still work correctly
**What goes wrong:** After OPTIN-04/05 ship, a consented opt-in-market lead viewed in the CRM detail page (`src/components/crm/lead-detail.tsx`, `ApproachTab`) will still show the `!lead.emailable` warning ("não é abordável por email frio... Prefira uma ligação") even though the composer right below it will now actually succeed if the user tries to draft/send, because `OutreachComposer` (`src/components/outreach-composer.tsx`) has NO client-side `emailable` check — it renders unconditionally and just calls `api.outreach.draft`/`send`, which now correctly evaluates `canContactByEmail`.
**Why it happens:** `lead-detail.tsx` is not in CONTEXT.md's listed integration points (only `leads/page.tsx` and `lead-card.tsx` are), so it's easy to overlook. The warning banner reads `!lead.emailable` directly (`src/components/crm/lead-detail.tsx:292`).
**How to avoid:** This is a UX inconsistency, not a compliance bug (the backend guardrail still holds either way — nothing insecure happens). Two acceptable outcomes for the plan: (a) leave it as-is and note it as a known minor gap (functionally correct, cosmetically stale for consented opt-in leads viewed via CRM rather than the Leads page), or (b) swap the banner's condition to `!canContactByEmail(lead)` for full consistency (~1-line change, low risk, touches a file not in CONTEXT.md's list — worth an explicit planning decision either way).
**Warning signs:** A verification step phrased as "the CRM detail page never shows a compliance warning for a consented lead" will fail unless (b) is chosen.

### Pitfall 5: Google Places Text Search behavior for the 6 new markets — verified low-risk, one nuance
**What goes wrong:** Assuming `regionCode`/`languageCode: "en"` (hardcoded in `convex/places.ts:65`) might behave unpredictably for ES/IT/PT/DE/DK/CH.
**Why it happens:** These markets have never been searchable before in this codebase (the `isLaunchMarket` gate blocked `places.search`/`foursquare.search` entirely for them until now), so there's no production precedent, unlike GB/NL/IE/SE/NO.
**How to avoid / what was verified (MEDIUM confidence, WebSearch cross-checked against Google's official Places API docs summary):** `regionCode` in the Places API (New) Text Search uses CLDR two-letter codes, "mostly identical to ISO 3166-1" with documented exceptions (e.g. GB's ccTLD is "uk" but its CLDR/ISO code is "gb" — already handled correctly in this codebase since GB is a current launch market). ES/IT/PT/DE/DK/CH have no such CLDR/ISO mismatch — they can be passed as-is from `MARKETS`. `languageCode: "en"` affects formatted-address translation and some text fields, not business display names (which are proper nouns returned as Google indexes them) — this is already the exact pattern the codebase uses successfully for NL/SE/NO (non-English-speaking launch markets), so there is direct in-repo precedent that "English category term + local city name, `languageCode: en`" already works for non-English EU markets. No code change to the request shape is needed beyond the market gate itself.
**Warning signs:** If early manual testing of `places.search` for a new market like `ES`/`PT` returns 0 results for common categories/cities, check `textQuery` phrasing first (e.g. very literal English category terms may match less densely in some verticals) before suspecting `regionCode`/`languageCode`.

### Pitfall 6: Which markets get `legalReview: "pending"` is not 100% explicit in CONTEXT.md — resolved interpretation
**What goes wrong:** Reading "novos mercados nascem pending; os 5 atuais ficam sem flag" too literally as "only `PT` gets the flag" (since PT is the only literally-new `MARKETS` entry), leaving `DE/CH/DK/IT/ES` without `legalReview` even though OPTIN-06 requires the banner to show for the whole opt-in tab.
**Why it happens:** `DE/CH/DK/IT/ES` already existed as `MARKETS` entries with `coldEmail: "opt_in"` before this phase (for display/gating only, per the existing code comment at `domain.ts:26`) — so they're not literally "new market entries," even though they ARE newly becoming searchable/contactable for the first time in this phase.
**How to avoid:** Interpret "os 5 atuais" (the current 5) as the 5 OPT-OUT launch markets (GB/NL/IE/SE/NO — the ones actually live/validated in production today), and "novos mercados" as all 6 `OPT_IN_MARKETS` (ES/IT/PT/DE/DK/CH) being activated in this phase. All 6 get `legalReview: "pending"`. This is the only reading consistent with OPTIN-06's stated success criterion ("Mercados opt-in exibem aviso... até a validação por país").
**Warning signs:** If the "Ligação primeiro" tab's legal-review banner only shows for Portugal and not for Spain/Italy/Germany/Denmark/Switzerland, this interpretation was applied incorrectly.

### Pitfall 7: Two more `LAUNCH_MARKETS` call sites exist outside CONTEXT.md's list — both are safe to leave unchanged
**What goes wrong:** Assuming ALL `LAUNCH_MARKETS` references in the codebase need to become `SEARCHABLE_MARKETS`-aware.
**Why it happens:** `grep -rn "LAUNCH_MARKETS"` surfaces `src/app/page.tsx:575` (landing page footer, displays market flags/names as marketing copy) and `src/components/crm/create-lead-modal.tsx:47,139` (manual lead-creation form's country dropdown default/options) — neither is in CONTEXT.md's integration-points list.
**How to avoid:** Leave both unchanged by default. The landing page footer is marketing copy about the CURRENT opt-out-first positioning, not a functional gate — changing it is a product/marketing decision outside this phase's scope. `leads.create` (the manual-add mutation) has NO market gate at all today (confirmed by reading `convex/leads.ts:326-386` — it accepts any `countryCode` uppercase, with `isEmailable` still correctly gating `emailable` based on whatever code is passed) — so `create-lead-modal.tsx`'s `LAUNCH_MARKETS`-only dropdown is a pre-existing UX restriction, not a compliance gate; widening it to include opt-in markets is a reasonable nice-to-have but is not required by OPTIN-01..06 and isn't mentioned in CONTEXT.md's discretion list either. Flag as an open question below rather than assuming it's required.
**Warning signs:** Scope creep — if a plan task starts rewriting `create-lead-modal.tsx` or the landing page, confirm it's traceable to one of OPTIN-01..06 first.

## Code Examples

### Existing `hasWaOptIn` gate call site — unaffected by generalization (no code change needed here)
```typescript
// Source: convex/whatsapp.ts:5,19-21 (current) — this call site needs ZERO changes because
// hasWaOptIn's generalized signature is backward-compatible (contactOptInAt is optional and
// simply not present on leads that don't have it yet).
import { hasWaOptIn } from "./lib/domain";
// ...
if (!hasWaOptIn(lead)) {
  throw new Error("WhatsApp só com opt-in registrado do prospect.");
}
```

### Existing regression-guard test that must keep passing unmodified
```typescript
// Source: tests/domain.test.ts:91-94 (current) — do not touch this test; it's the acceptance-
// criteria proof that OPTIN-01 doesn't weaken compliance.
test("isEmailable: opt-in market always blocked", () => {
  assert.equal(isEmailable({ countryCode: "DE", legalForm: "incorporated" }), false);
  assert.equal(isEmailable({ countryCode: "CH", contactType: "role" }), false);
});
```

### New test cases to add to `tests/domain.test.ts` (not a new file)
```typescript
test("isSearchableMarket: launch + opt-in markets are searchable, others are not", () => {
  assert.equal(isSearchableMarket("GB"), true); // launch
  assert.equal(isSearchableMarket("ES"), true); // opt-in
  assert.equal(isSearchableMarket("PT"), true); // opt-in, new
  assert.equal(isSearchableMarket("FR"), false); // deferred market, not in either list
});

test("canContactByEmail: emailable=true always wins; contactOptInAt overrides regardless of market", () => {
  assert.equal(canContactByEmail({ emailable: true }), true);
  assert.equal(canContactByEmail({ emailable: false }), false);
  assert.equal(canContactByEmail({ emailable: false, contactOptInAt: Date.now() }), true);
  assert.equal(canContactByEmail({}), false);
});

test("hasWaOptIn: generalized to accept either waOptInAt or contactOptInAt", () => {
  assert.equal(hasWaOptIn({ waOptInAt: Date.now() }), true); // legacy field still works
  assert.equal(hasWaOptIn({ contactOptInAt: Date.now() }), true); // new field also unlocks WhatsApp
  assert.equal(hasWaOptIn({}), false);
});

test("MARKETS.PT exists as an opt-in market with a pending legal review", () => {
  assert.equal(MARKETS.PT.coldEmail, "opt_in");
  assert.equal(MARKETS.PT.legalReview, "pending");
});

test("all OPT_IN_MARKETS carry legalReview: pending; launch markets do not", () => {
  for (const cc of OPT_IN_MARKETS) assert.equal(MARKETS[cc].legalReview, "pending");
  for (const cc of LAUNCH_MARKETS) assert.equal(MARKETS[cc].legalReview, undefined);
});
```

## State of the Art

This is an internal-pattern evolution, not an external ecosystem shift — there is no "old library vs. new library" axis here. The relevant "old approach → new approach" is entirely within this repo's own history:

| Old Approach (Phase 2) | New Approach (Phase 4) | When Changed | Impact |
|--------------------------|---------------------------|---------------|--------|
| Single-channel consent: `waOptInAt/waOptInSource`, gates only WhatsApp | Generalized consent: `contactOptInAt/Source/Note`, gates email AND (together with the legacy field) WhatsApp | This phase | One consent event now unlocks both channels; `hasWaOptIn` becomes a compatibility-preserving OR of two timestamp fields rather than a single field check |
| `isEmailable`/`isLaunchMarket` = the only email gate | `canContactByEmail` = `isEmailable` OR explicit consent | This phase | The sole-trader/named-contact trap and the opt-in-market block both become bypassable by genuine consent, which is the correct legal model (consent is its own legal basis under GDPR/ePrivacy, independent of the opt-out exemption) |
| Discovery gated by a single boolean (`isLaunchMarket`) | Discovery gated by a wider boolean (`isSearchableMarket`), contactability still gated by the original narrower one | This phase | Decouples "can we find this business" from "can we cold-email this business" — the correct separation, since discovery/scoring/preview generation were never actually illegal for opt-in markets, only cold email was |

**Deprecated/outdated:** nothing is deprecated by this phase — `waOptInAt/waOptInSource` are explicitly kept (CONTEXT.md: "permanecem; legado; não migrar").

## Open Questions

1. **Should `crm/lead-detail.tsx`'s compliance warning banner be updated to `canContactByEmail`?**
   - What we know: the underlying composer already works correctly without any change there (Pitfall 4); CONTEXT.md doesn't list this file.
   - What's unclear: whether the planner considers a stale warning banner (for a lead the user CAN now actually email) an acceptable minor gap or a "must fix for consistency" item.
   - Recommendation: default to leaving it unchanged (out of the explicit requirement list); mention as a fast follow-up if the planner wants full consistency (1-line change: `!lead.emailable` → `!canContactByEmail(lead)`, importing the new helper).

2. **Should `convex/lib/compliance.ts`'s `FOOTER_COPY` map gain the 5 new languages (Spanish/Italian/Portuguese/German/Danish)?**
   - What we know: without it, the opt-out footer still appears (COMP-03 satisfied) but in English, not the lead's market language, for any opt-in-market lead that becomes emailable via consent (Pitfall 2).
   - What's unclear: whether full localization of the footer is expected as part of "the composer destravado" experience, or is acceptable as English-only until a future pass.
   - Recommendation: treat as out of scope by default (not mentioned in CONTEXT.md); flag as an easy optional addition if the planner wants full parity between `LANG` and `FOOTER_COPY`.

3. **Should manual lead creation (`create-lead-modal.tsx` / `leads.create`) allow opt-in-market countries?**
   - What we know: `leads.create` has NO market gate today (any country code is accepted); only the UI dropdown restricts input to `LAUNCH_MARKETS`.
   - What's unclear: whether this is an intentional product restriction or just an oversight predating this phase.
   - Recommendation: leave unchanged — not in CONTEXT.md's integration points or discretion list, and touching it risks scope creep beyond OPTIN-01..06.

4. **Exact new city lists per `CITIES_BY_COUNTRY` market (MEDIUM confidence — general geographic knowledge, not independently verified against a census source):**
   - ES: Madrid, Barcelona, Valencia, Sevilla, Zaragoza, Málaga, Murcia, Palma, Bilbao, Alicante, Córdoba, Valladolid
   - IT: Roma, Milano, Napoli, Torino, Palermo, Genova, Bologna, Firenze, Bari, Catania, Venezia, Verona
   - PT: Lisboa, Porto, Vila Nova de Gaia, Braga, Amadora, Setúbal, Coimbra, Queluz, Funchal, Aveiro, Faro, Almada
   - DE: Berlin, Hamburg, München, Köln, Frankfurt am Main, Stuttgart, Düsseldorf, Leipzig, Dortmund, Essen, Bremen, Dresden
   - DK: København, Aarhus, Odense, Aalborg, Esbjerg, Randers, Kolding, Horsens, Vejle, Roskilde, Herning
   - CH: Zürich, Genève, Basel, Lausanne, Bern, Winterthur, Luzern, St. Gallen, Lugano, Biel/Bienne, Thun
   - Recommendation: use as a starting point; this is explicitly "Claude's Discretion" per CONTEXT.md, so exact accuracy of the list is not a hard requirement, just a reasonable default. Preserve diacritics (München, Köln, Zürich, Genève, København) to match the existing style (`CITIES_BY_COUNTRY` already has `'s-Hertogenbosch`, `Ålesund`, `Tønsberg`).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` (no external test runner) |
| Config file | none — driven by `package.json`'s `"test"` script |
| Quick run command | `node --experimental-strip-types --test tests/domain.test.ts` |
| Full suite command | `npm test` (runs `node --experimental-strip-types --test tests/*.test.ts`, currently 5 files: `compliance.test.ts`, `domain.test.ts`, `preview-i18n.test.ts`, `stripe.test.ts`, `tenant.test.ts`) |

No `convex-test` or any Convex-runtime test harness is used in this repo (confirmed absent from `package.json` devDependencies and `tests/`) — mutations/actions/queries themselves are exercised manually (dev deployment), only their pure-logic building blocks (in `convex/lib/*.ts`) get `node:test` coverage. This phase follows the same split.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|--------------------|--------------|
| OPTIN-01 | `isSearchableMarket` gates search widely; `isEmailable`/`isLaunchMarket` untouched; `MARKETS.PT` correct | unit | `node --experimental-strip-types --test tests/domain.test.ts` | ✅ (add cases to existing file) |
| OPTIN-01 | `places.ts`/`foursquare.ts` gate uses `isSearchableMarket`, not `isLaunchMarket` | manual (grep-as-acceptance-criteria, per established pattern in this repo) | `grep -n "isLaunchMarket" convex/places.ts convex/foursquare.ts` → expect no match | ✅ (grep, no new file) |
| OPTIN-02 | Tabs, per-tab market list/filter/card variant | manual-only | n/a — no React component test infra in this repo (no `@testing-library/react`/jsdom in `package.json`) | ❌ (justified: no precedent anywhere in this repo for UI component tests) |
| OPTIN-03 | `writeCallScript` produces `{script, translation}` in the right language, ~150 words, closes asking for consent | manual-only | n/a — network/AI call, same as `writeEmail` (also has zero unit test coverage today) | ❌ (justified: no precedent; `writeEmail` itself is untested for the same reason) |
| OPTIN-04 | `canContactByEmail`/`hasWaOptIn` pure logic | unit | `node --experimental-strip-types --test tests/domain.test.ts` | ✅ (add cases to existing file) |
| OPTIN-04 | `recordContactOptIn` mutation persists fields + event correctly | manual (dev deployment / Convex dashboard), OR optionally test the pure shape (source/note handling) if extracted into a pure helper | n/a | ❌ (justified: no `convex-test`, consistent with `recordWaOptIn` which also has no automated test) |
| OPTIN-05 | `draft`/`send` refuse a lead without `canContactByEmail` | unit (the underlying `canContactByEmail` predicate) + manual (the actual action wiring) | `node --experimental-strip-types --test tests/domain.test.ts` for the predicate; manual for the action | ✅ predicate / ❌ action wiring (justified, same as OPTIN-04) |
| OPTIN-06 | `legalReview: "pending"` set correctly per market; banner shown on the opt-in tab | unit (flag presence) + manual (banner rendering) | `node --experimental-strip-types --test tests/domain.test.ts` for the flag; manual for the banner | ✅ flag / ❌ banner (justified, no UI test infra) |

### Sampling Rate
- **Per task commit:** `node --experimental-strip-types --test tests/domain.test.ts` (fast, < 1s, covers all the new pure-logic surface)
- **Per wave merge:** `npm test` (full suite, still < 2s — this repo's test suite is entirely pure-function unit tests, no I/O)
- **Phase gate:** Full suite green before `/gsd:verify-work`, plus a manual smoke pass covering: search in one new market (e.g. ES), verify inserted leads have `emailable: false`; generate a call script and confirm `{script, translation}` both populate; register consent and confirm the composer becomes usable for that lead (draft succeeds); confirm draft/send still reject an opt-in-market lead with no consent.

### Wave 0 Gaps
None — `tests/domain.test.ts` already exists and already imports from `../convex/lib/domain.ts`; new test cases are additions to this file, not a new file or new fixture. No test framework installation needed (already configured via `package.json`'s `test` script).

## Sources

### Primary (HIGH confidence — read directly from the repo via the Read tool)
- `convex/lib/domain.ts` (full file) — `MARKETS`, `LAUNCH_MARKETS`, `isLaunchMarket`, `isEmailable`, `hasWaOptIn`, `CITIES_BY_COUNTRY`, `CATEGORY_OPTIONS`
- `convex/schema.ts` (full file) — `leads`, `events`, `outreach`, `suppressions` table shapes
- `convex/places.ts`, `convex/foursquare.ts` (full files) — market gate call sites, Text Search request shape (`regionCode`, `languageCode: "en"`)
- `convex/scoring.ts`, `convex/leads.ts` (full files) — `insertDiscovered`/`applyScore`/`create`/`recordWaOptIn` — confirms `emailable` is computed and re-computed via `isEmailable` on both the insert and enrichment paths, always market-gated
- `convex/outreach.ts` (full file) — `draft`/`send` gate location, `upsertDraft`, `markSent`/`markReplied`/`updateDraft`/`suppress`
- `convex/lib/outreachAi.ts` (full file) — `writeEmail`, `LANG`, `SIGNAL_TEXT` (module-private)
- `convex/whatsapp.ts` (full file) — `hasWaOptIn` gate call site, `sendFollowup`
- `convex/lib/compliance.ts`, `tests/compliance.test.ts` (full files) — `FOOTER_COPY` map, confirmed only 4 languages present
- `convex/demo.ts` (relevant sections) — seed pattern, confirms no opt-in-market leads exist in the demo seed today
- `src/app/(app)/leads/page.tsx`, `src/components/lead-card.tsx` (full files) — current structure to extend with tabs/variant
- `src/components/whatsapp-followup.tsx` (full file) — template for the new "Registrar consentimento" UI
- `src/app/(app)/outreach/page.tsx` (full file) — pill-filter pattern
- `src/components/landing/laptop.tsx` (relevant section) — `data-active` pill pattern
- `src/components/crm/lead-detail.tsx`, `src/components/outreach-composer.tsx` (relevant sections) — confirmed `OutreachComposer` has no client-side `emailable` gate, confirmed the static warning banner reads `!lead.emailable`
- `src/components/crm/create-lead-modal.tsx`, `src/app/page.tsx` (relevant sections) — the 2 non-integration-point `LAUNCH_MARKETS` call sites
- `src/components/generate-preview-button.tsx` — reference component-state pattern (busy/token) for a new action-triggering button
- `tests/domain.test.ts` (full file) — existing regression guard (`isEmailable: opt-in market always blocked`), test style/imports to extend
- `package.json` — confirmed test command, confirmed no new dependency needed, confirmed no React component test infra
- `.planning/phases/04-.../04-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md` — phase scope, requirements text, decision history, config (`nyquist_validation: true`)

### Secondary (MEDIUM confidence)
- Google Places API (New) Text Search `regionCode`/`languageCode` behavior — WebSearch summary cross-referencing Google's official docs pages (`developers.google.com/maps/documentation/places/web-service/text-search`, `.../reference/rest/v1/places/searchText`); confirms CLDR-vs-ISO-3166-1 near-equivalence and the GB exception already handled in this codebase. Not independently fetched page-by-page (WebSearch tool aggregated it), so kept at MEDIUM rather than HIGH.
- Suggested `CITIES_BY_COUNTRY` entries for ES/IT/PT/DE/DK/CH — general geographic knowledge, not verified against a census/authoritative source; explicitly "Claude's Discretion" per CONTEXT.md so precision is not a hard requirement.

### Tertiary (LOW confidence)
None used as load-bearing claims in this document.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new library, every pattern reused verbatim from code read directly
- Architecture: HIGH — every proposed change is a direct diff against actual current file contents, cross-checked against every call site via grep
- Pitfalls: HIGH for repo-internal findings (compliance footer gap, lead-detail staleness, call-site enumeration — all confirmed by reading/grepping the actual code); MEDIUM for the one external claim (Google Places regionCode/languageCode behavior for the 6 new countries, since it's unexercised in this codebase until this phase)

**Research date:** 2026-07-11
**Valid until:** Repo-internal findings are valid until the relevant files change (no natural expiry — re-check if `domain.ts`/`outreach.ts`/`outreachAi.ts` are touched by an unrelated change before this phase is planned/executed). The Google Places API claim: ~90 days (stable, slow-moving API surface).
