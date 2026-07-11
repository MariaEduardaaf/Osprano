# Phase 3: Tracking, Composer e Localização - Context

**Gathered:** 2026-07-11 (modo auto — decisões = opções recomendadas, logadas na sessão)
**Status:** Ready for planning

<domain>
## Phase Boundary

O funil reflete a realidade e o produto fala a língua do mercado: abertura de preview pelo próprio vendedor não conta como sinal de compra (TRCK-01), o usuário consegue marcar "respondeu" manualmente (TRCK-02), o composer persiste edições antes do envio (OUTR-01), e o template de preview é localizado por mercado EN/NL/SV/NO (L10N-01). Sem webhooks Resend (v2), sem geração de preview por IA (Fase 3 do produto), sem rate-limit em recordOpen (v2/SCAL-03).

</domain>

<decisions>
## Implementation Decisions

### TRCK-01 — Abertura própria não conta
- `previews.recordOpen` (convex/previews.ts:115-142) checa `await ctx.auth.getUserIdentity()`: se há identidade E `identity.subject === preview.orgId` (o dono do workspace abrindo o próprio preview), retorna cedo — sem incrementar `openCount`, sem evento `preview_open`, sem mover estágio. Prospect real (sem sessão Clerk) → `identity` null → conta normalmente.
- Racional: a rota pública `/p/[token]` usa o mesmo ConvexProvider do app; quando o vendedor logado abre o link no próprio browser, o token de auth do Clerk acompanha a mutation — dá pra distinguir sem parâmetro especial.
- Limitação aceita e documentada em comentário: vendedor em aba anônima conta como prospect (igual a qualquer ferramenta de tracking). Modo demo (sem auth) continua contando — é o comportamento desejado para demonstração.
- `PreviewTracker` (src/components/preview-tracker.tsx) não muda.

### TRCK-02 — "Respondeu" manual + opt-out manual
- Nova mutation autenticada `outreach.markReplied({ leadId })`: ownership check, seta `status: "replied"` e novo campo opcional `repliedAt: v.number()` na tabela outreach (schema), insere evento `type: "reply"` (literal JÁ existe na union de events — não precisa mudar).
- Não mexe no estágio do Kanban — o usuário controla o funil; replied é status do outreach.
- UI em DOIS lugares: (a) na outbox (src/app/(app)/outreach/page.tsx) — ação na linha para itens sent/opened; (b) no lead-detail aba Abordagem (src/components/crm/lead-detail.tsx) — botão junto do composer.
- Na MESMA área de UI, botão "Pediu opt-out" chamando a mutation `outreach.suppress` (criada na Fase 2, ainda sem UI) — fecha o item deferido da Fase 2. Confirmar antes de executar (é ação de compliance): um confirm simples basta.
- A query `outbox` (convex/outreach.ts) já exibe status replied — só passa a receber dados reais.

### OUTR-01 — Composer persiste o que se vê
- Nova mutation autenticada `outreach.updateDraft({ leadId, subject, body })`: ownership check, patch em subject/body do outreach row existente (erro pt-BR se não existe draft).
- No `OutreachComposer` (src/components/outreach-composer.tsx): antes de `send` e de `markSent`, chamar `updateDraft` com o estado local — o que o usuário vê é o que sai. O "Copiar" continua copiando o estado local (e também persiste via updateDraft, pra consistência entre abas/sessões).
- O `send` (Fase 2) já re-garante rodapé de opt-out + headers de forma idempotente — edição do usuário nunca remove a garantia de compliance; NÃO duplicar essa lógica no updateDraft.
- Composer ao abrir: se já existe draft salvo (query `outreach.getForLead` já existe), abrir pré-preenchido com subject/body salvos SEM gastar IA — o botão de gerar com IA continua disponível para regenerar (sobrescreve). Evita perder edições persistidas e economiza tokens.

### L10N-01 — Preview localizado por mercado
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

</decisions>

<canonical_refs>
## Canonical References

### Projeto e requisitos
- `.planning/PROJECT.md` §Context — achados da auditoria (self-open corrompe funil; replied só no demo; composer perde edição; preview em PT)
- `.planning/REQUIREMENTS.md` §Tracking & Funil, §Outreach UX, §Localização — texto normativo de TRCK-01/02, OUTR-01, L10N-01
- `.planning/phases/02-compliance-de-email-e-whatsapp/02-CONTEXT.md` §Deferred — o botão de supressão manual foi deferido para esta fase
- `docs/SOBRE.md` §5 — o funil prometido (rascunho→enviado→abriu→respondeu) que esta fase completa

### Convenções do repo
- `AGENTS.md` — ler node_modules/next/dist/docs/ antes de código Next (componentes client já seguem o padrão do repo)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `outreach.getForLead` (convex/outreach.ts:7-18) — query pronta pro composer carregar draft existente
- `outreach.suppress` (Fase 2) — mutation pronta, só falta UI
- Literal `"reply"` já na union de events (convex/schema.ts:151) e status `"replied"` na de outreach — schema quase pronto (só falta `repliedAt`)
- Padrão de botões/estados do composer e do WhatsAppFollowup (run/busy/msg) — replicar nos botões novos
- `tests/*.test.ts` node:test — padrão pros testes do dicionário i18n

### Established Patterns
- Mutations autenticadas: `requireOrgId` + ownership (`lead.orgId !== orgId` → erro pt-BR) — seguir em markReplied/updateDraft
- Fases 1–2: helpers/dicionários puros extraídos com testes; grep negativo como acceptance criteria (ex.: zero `lead.stage === "scheduled"` — repetir para strings PT)
- `outbox` deriva status sent→opened por openCount (convex/outreach.ts:38-47) — TRCK-01 limpa a fonte desse sinal

### Integration Points
- convex/previews.ts (recordOpen) — TRCK-01
- convex/schema.ts (campo `repliedAt` opcional em outreach) + convex/outreach.ts (markReplied, updateDraft) — TRCK-02/OUTR-01
- src/components/outreach-composer.tsx (persistência + carregar draft + botões replied/opt-out no lead-detail) — OUTR-01/TRCK-02
- src/app/(app)/outreach/page.tsx (ação de linha "respondeu") — TRCK-02
- src/components/preview-site.tsx + novo src/lib/preview-i18n.ts — L10N-01
- ATENÇÃO ao particionar: schema.ts e outreach.ts são tocados por TRCK-02 e OUTR-01 — agrupar no MESMO plano ou em waves sequenciais; L10N-01 é totalmente disjunto (pode paralelizar); TRCK-01 (previews.ts) é disjunto também.

</code_context>

<specifics>
## Specific Ideas

- O sinal de compra ("abriu") é a premissa central do produto — depois do fix, abrir o próprio preview pelo CRM NÃO pode disparar "abriu" nem mover o card; o prospect real continua movendo.
- "O que se vê é o que sai": qualquer caminho de saída (Resend, marcar enviado, copiar) parte do mesmo conteúdo persistido.
- Um dono de restaurante em Estocolmo tem que receber um preview em sueco — zero português em qualquer página pública.

</specifics>

<deferred>
## Deferred Ideas

- Rate-limit/dedupe em recordOpen + parar de vazar `token` em getBySlug — v2 (SCAL-03)
- Webhooks Resend (bounce/inbound → replied/suprimido automáticos) — v2 (GDPR-02)
- Geração de preview por IA/múltiplos templates + domínio próprio — milestone Fase 3 do produto
- Filtrar `saved` na tela de Leads / métricas do dashboard — backlog de UX (fora dos 12 requisitos deste milestone)

</deferred>

---

*Phase: 03-tracking-composer-e-localiza-o*
*Context gathered: 2026-07-11*
