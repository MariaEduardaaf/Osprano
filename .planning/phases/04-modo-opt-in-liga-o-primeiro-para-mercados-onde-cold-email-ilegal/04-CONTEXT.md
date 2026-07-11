# Phase 4: Modo opt-in (ligação-primeiro) - Context

**Gathered:** 2026-07-11 (modo auto — decisões = opções recomendadas, logadas na sessão)
**Status:** Ready for planning

<domain>
## Phase Boundary

Prospecção compliant em mercados opt-in (ES/IT/PT/DE/DK/CH): descoberta/score/preview iguais aos mercados atuais, aba própria "Ligação primeiro" na página de Leads com card focado em telefone + script de ligação por IA, consentimento de contato registrado destrava o email — guardrail server-side. Requisitos: OPTIN-01..06. FORA de escopo: mala direta, DMs de Instagram, discador/telefonia integrada, França (regime "conditional" fica pra depois da validação jurídica).

</domain>

<decisions>
## Implementation Decisions

### OPTIN-01 — Mercados pesquisáveis ≠ mercados emailáveis
- `convex/lib/domain.ts`: adicionar `PT: { code: "PT", name: "Portugal", flag: "🇵🇹", coldEmail: "opt_in" }` ao `MARKETS` (DE/CH/DK/IT/ES já existem como `opt_in`).
- Novo export `OPT_IN_MARKETS = ["ES", "IT", "PT", "DE", "DK", "CH"]` e `SEARCHABLE_MARKETS = [...LAUNCH_MARKETS, ...OPT_IN_MARKETS]`, com helper puro `isSearchableMarket(code)`. **`LAUNCH_MARKETS` e `isLaunchMarket` NÃO mudam** (continuam controlando emailabilidade).
- `convex/places.ts` e `convex/foursquare.ts`: o gate de busca troca `isLaunchMarket` por `isSearchableMarket`; mensagem de erro atualizada.
- Lead de mercado opt-in nasce e permanece `emailable=false` SEMPRE (o `isEmailable` já bloqueia mercados não-launch — comportamento confirmado por teste existente "mercado opt-in bloqueado"); nenhuma mudança no isEmailable.
- `CITIES_BY_COUNTRY`: adicionar 8–12 cidades principais para cada mercado novo (ES: Madrid, Barcelona, Valencia, Sevilla…; IT: Milano, Roma, Torino…; PT: Lisboa, Porto, Braga…; DE: Berlin, München, Hamburg…; DK: København, Aarhus…; CH: Zürich, Genève, Basel…).

### OPTIN-04 — Consentimento de contato (generaliza o waOptIn da Fase 2)
- Campos novos opcionais no lead: `contactOptInAt: v.number()`, `contactOptInSource: v.string()` (valores: "phone_call" | "in_person" | "reply" | "other"), `contactOptInNote: v.string()`. Os campos `waOptInAt/waOptInSource` da Fase 2 permanecem (legado; não migrar).
- Mutation autenticada `leads.recordContactOptIn({ leadId, source, note? })` — ownership check, grava campos + insere evento (ampliar union de `events.type` com `v.literal("contact_opt_in")`).
- Helper puro em domain.ts: `canContactByEmail(lead): boolean` = `lead.emailable === true || lead.contactOptInAt != null` — consentimento explícito supera regime de mercado E a armadilha do autônomo (consentimento pessoal é base legal por si).
- WhatsApp: `hasWaOptIn` generaliza para aceitar `contactOptInAt` OU `waOptInAt` (compatibilidade com dados existentes) — um consentimento de contato vale para os dois canais.

### OPTIN-05 — Guardrail server-side
- `outreach.draft` e `outreach.send`: trocar o check `!lead.emailable` por `!canContactByEmail(lead)`; erro pt-BR: "Mercado opt-in: registre o consentimento do prospect antes de enviar email." (mantém as checagens de supressão da Fase 2 intactas, em conjunto).
- Preview/score/CRM: sem gate de mercado (já é o comportamento atual — `previews.generate` não checa mercado; não tocar).

### OPTIN-02 — Aba "Ligação primeiro"
- `src/app/(app)/leads/page.tsx`: tabs no topo — "Email primeiro" (default) e "Ligação primeiro" — estilo pílula consistente com o design system. A aba controla: (a) países do select (LAUNCH_MARKETS vs OPT_IN_MARKETS), (b) filtro da lista de leads por regime do `countryCode` (opt-out vs opt-in), (c) variante do card.
- `src/components/lead-card.tsx`: prop nova `variant?: "email" | "call"`. Na variante `call`: botão primário **Ligar** (`tel:` com o telefone), botão **Script de ligação**, botão/fluxo **Registrar consentimento** (padrão visual do WhatsAppFollowup da Fase 2: select de origem + confirmar); NENHUMA ação de cold email. O rodapé de compliance mostra "📞 Ligação primeiro · email após consentimento" (em vez de "Fora do escopo compliant"); quando `contactOptInAt` presente, mostra "✓ Consentimento registrado em {data}" e o card passa a expor o fluxo normal de email.
- OPTIN-06: na aba "Ligação primeiro", banner discreto (borda warm, texto curto): "Mercados em validação jurídica — ligação B2B permitida; email/WhatsApp só após consentimento registrado." Flag `legalReview: "pending"` por mercado no `MARKETS` (novos mercados nascem pending; os 5 atuais ficam sem flag/validated).
- Empty state da aba de ligação explica o fluxo (ligar → consentimento → email destrava).

### OPTIN-03 — Script de ligação por IA
- `convex/lib/outreachAi.ts`: nova função `writeCallScript(apiKey, lead)` no padrão do `writeEmail` — modelo `claude-sonnet-5`, retorna JSON `{ script, translation }`: `script` no idioma do mercado, `translation` em pt-BR, ~150 palavras, citando a dor específica (reusar `SIGNAL_TEXT`), estrutura: abertura → dor observada → oferta do preview → **fecho pedindo o consentimento explicitamente** ("posso te enviar a prévia por email/WhatsApp?"). Fallback de parse igual ao writeEmail.
- `LANG` map ganha os idiomas novos: ES→Spanish, IT→Italian, PT→Portuguese, DE→German, DK→Danish, CH→German (padrão suíço-alemão; nota em comentário).
- Action `outreach.callScript({ leadId })` — auth + ownership; exige telefone; persiste no lead (`callScript`, `callScriptPt`, `callScriptAt` opcionais no schema) para não regenerar à toa; regenerar disponível (sobrescreve). Requer `ANTHROPIC_API_KEY` (mesmo erro-padrão do draft).
- UI: painel/expansão no card (ou modal simples) mostrando script e tradução lado a lado com botão copiar em cada um.

### Ajustes incorporados pela pesquisa (04-RESEARCH.md)
- `src/components/crm/lead-detail.tsx`: o banner de compliance que lê `!lead.emailable` direto passa a usar `canContactByEmail(lead)` — senão mostra "fora do escopo" depois do consentimento enquanto o composer funciona.
- `convex/lib/compliance.ts`: `FOOTER_COPY` ganha os idiomas novos (es/it/pt/de/da) — o rodapé de opt-out dos emails destravados por consentimento deve sair no idioma do mercado, como os 4 atuais.
- `legalReview: "pending"` aplica-se aos 6 mercados opt-in (não só ao PT novo) — DE/CH/DK/IT/ES já existiam no MARKETS mas só ficam "vivos" nesta fase.
- `contactOptInNote` persiste no doc do lead (divergência deliberada do padrão waOptIn, que só registra a nota no evento).
- FORA de escopo confirmado: mercados opt-in na criação manual de lead (create-lead-modal fica como está).

### Claude's Discretion
- Copy exata do banner, do empty state e dos botões.
- Modal vs painel expansível para o script.
- Listas exatas de cidades por mercado novo (ponto de partida no 04-RESEARCH.md).
- Seed do demo ganhar 2–3 leads de mercado opt-in (nice-to-have; se entrar, manter DEMO coerente).

</decisions>

<canonical_refs>
## Canonical References

### Projeto e requisitos
- `.planning/REQUIREMENTS.md` §Modo Opt-in — texto normativo de OPTIN-01..06
- `.planning/ROADMAP.md` §Phase 4 — goal e success criteria
- `.planning/notes/2026-07-11-modo-opt-in-mercados.md` — racional de produto e ressalvas jurídicas (mala direta/DM ficam FORA desta fase)
- `.planning/phases/02-compliance-de-email-e-whatsapp/02-CONTEXT.md` — padrões de consentimento (waOptIn) que esta fase generaliza

### Convenções do repo
- `AGENTS.md` — Next 16: ler node_modules/next/dist/docs/ para código Next novo; sem dependência nova; TS strict; erros pt-BR

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MARKETS` já modela regime `coldEmail` por país com DE/CH/DK/IT/ES prontos (`convex/lib/domain.ts:20-33`) — falta só PT e os exports novos
- Padrão de registro de opt-in completo da Fase 2: `leads.recordWaOptIn` + UI de select de origem no `whatsapp-followup.tsx` — copiar o shape
- `writeEmail`/`SIGNAL_TEXT`/`LANG` (`convex/lib/outreachAi.ts`) — molde do `writeCallScript`
- Tabs com pílulas: padrão visual das abas do laptop da landing (`data-[active=true]:bg-brand-soft`) e dos filtros da outbox (`src/app/(app)/outreach/page.tsx`)
- `tests/domain.test.ts` — casos existentes de `isEmailable` ("mercado opt-in bloqueado") protegem a invariante OPTIN-01

### Established Patterns
- Actions de discovery: gate de mercado é a primeira checagem depois do auth (`convex/places.ts:37-40`) — trocar a função do gate, não a posição
- Mutations autenticadas: `requireOrgId` + ownership + erro pt-BR
- Helpers puros com testes node:test (fases 1–3); grep negativo como acceptance criteria
- Compliance nunca só na UI: todo destrave tem contraparte server-side (fases 2–3)

### Integration Points
- `convex/lib/domain.ts` (MARKETS/PT, OPT_IN_MARKETS, SEARCHABLE_MARKETS, canContactByEmail, cidades) — fundação de tudo
- `convex/schema.ts` (contactOptIn*, callScript*, evento contact_opt_in)
- `convex/places.ts` + `convex/foursquare.ts` (gate searchable)
- `convex/leads.ts` (recordContactOptIn), `convex/outreach.ts` (gates + callScript action), `convex/lib/outreachAi.ts` (writeCallScript + LANG)
- `convex/whatsapp.ts` (aceitar consentimento genérico)
- `src/app/(app)/leads/page.tsx` (tabs), `src/components/lead-card.tsx` (variant call)
- ATENÇÃO a waves: domain.ts/schema.ts são a fundação (wave 1 sozinha); backend (outreach/leads/whatsapp/places) e UI podem ser waves seguintes; commits com pathspec explícito (lição das fases 2–3)

</code_context>

<specifics>
## Specific Ideas

- O script de ligação DEVE terminar pedindo o consentimento ("posso te enviar a prévia por email?") — a ligação existe pra destravar o canal escrito; o script é o mecanismo de conversão do modo opt-in.
- A dona não fala os idiomas dos mercados opt-in — por isso a tradução pt-BR lado a lado é requisito, não enfeite (ela lê a tradução, o usuário nativo lê o original).
- Consentimento explícito supera tudo (mercado e forma jurídica): é base legal própria. Mas NUNCA relaxa a supressão (quem pediu pra parar, parou).

</specifics>

<deferred>
## Deferred Ideas

- França como mercado "conditional" — exige análise jurídica própria (CNIL) antes de entrar
- Mala direta com QR code do preview (canal legal em toda a UE) — nota no backlog
- DMs de Instagram — zona cinzenta jurídica, validar antes
- Discador/telefonia integrada (registrar ligações, gravar) — produto grande, não é desta fase
- Marcar mercados como "validated" pós-análise jurídica (flag existe; o fluxo de validação é operacional)

</deferred>

---

*Phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal*
*Context gathered: 2026-07-11*
