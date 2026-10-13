# Phase 13: Remetente e envio pelo e-mail do cliente - Context

**Gathered:** 2026-10-13
**Status:** Ready for planning (pesquisa base: `.planning/research/commercial/LEGAL.md` seção 4 "Envio de e-mail no lançamento" e `LAUNCH-READINESS.md` seção 3/4, item M3/M7)

<domain>
## Phase Boundary

A mensagem sai com a identidade do cliente, nunca a da Duda, e "Enviar" abre o e-mail do próprio cliente (ou copia), sem o Osprano transmitir e-mail de cliente. Requisitos: SEND-01..05, BASE-03.

Motivo: hoje todo e-mail sai do `RESEND_FROM` global da Duda, sem reply-to, com o nome dela na assinatura e no rodapé (`convex/outreach.ts:512-532`, `compliance.ts:46`). Isso bloqueia o **beta fechado** que a Duda quer abrir (decisão 2026-10-13, Fase 11 adiada).

</domain>

<decisions>
## Implementation Decisions

### Perfil do remetente (SEND-01)
- Campos no workspace: nome de quem assina, nome da empresa/marca, endereço postal (rodapé de e-mail comercial), e-mail de resposta. Tela em Ajustes. Sem perfil completo, gerar mensagem por IA e "Enviar" ficam bloqueados com aviso e link para Ajustes.
- Assinatura, rodapé de opt-out e o prompt da IA (`convex/lib/outreachAi.ts`) usam esses dados. Procurar e remover todo nome/dado fixo da Duda em código de envio, prompt e rodapé.

### Envio pelo e-mail do cliente (SEND-02, SEND-03, SEND-04)
- "Enviar" vira: (1) servidor confere na hora `canContactByEmail`, supressão e mercado e monta o corpo final com rodapé de opt-out (link de descadastro + fonte do dado, art. 14); (2) o cliente escolhe abrir no Gmail (deep link `https://mail.google.com/mail/?view=cm&to=...&su=...&body=...`), Outlook web (`https://outlook.office.com/mail/deeplink/compose?...`), app padrão (`mailto:`) ou copiar.
- Limite conhecido: sem header `List-Unsubscribe` (não dá por mailto); o link de descadastro vai no corpo.
- Depois de abrir/copiar, o cliente clica "Marquei como enviada": lead vai para Abordado e registra no Histórico/outbox. Não marcar automaticamente só por abrir.
- O caminho atual de envio pelo Resend para clientes **deixa de ser usado** (não transmitir e-mail de cliente). Claude decide se remove o código ou o deixa atrás de flag desligada; o Resend continua servindo para o que for do próprio Osprano (se houver) e para o futuro envio automático (v2, AUTO-*). Não apagar a integração inteira.
- URLs mailto/deeplink têm limite de tamanho: tratar corpo longo (copiar como alternativa e aviso).

### Supressão global (SEND-05)
- Quem se descadastra pelo link de qualquer cliente fica suprimido para todos (`suppressions` com orgId vazio/global já existe como conceito; ver Fase 9 e `isEmailSuppressed`). A exclusão de conta (Fase 9, `convex/model/purge.ts`) **não** pode apagar supressão global; hoje apaga as da org: revisar e deixar o comportamento coerente (supressão por descadastro vira global; nada da lista some quando um cliente apaga a conta).
- Privacidade: a lista global guarda e-mail de quem pediu para não ser contatado; base legal é obrigação/interesse legítimo de respeitar o opt-out (não editar textos legais nesta fase; anotar pendência para o advogado se a página de privacidade precisar mencionar).

### Noruega (BASE-03)
- Noruega sai de `LAUNCH_MARKETS` de e-mail e vira mercado de ligação primeiro com `legalReview: "pending"`, mostrado na UI como "validação jurídica pendente".

### Restrições
- Branch `v1.3-pronto-pra-vender`. Gates: `node --experimental-strip-types --test tests/*.test.ts`, `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/tsc --noEmit -p convex`, `./node_modules/.bin/eslint`, `./node_modules/.bin/next build`.
- Nenhuma dependência npm nova. Não mexer em `.env*`, nunca `convex env list`. Produção só com a Duda.
- Textos PT-BR sem travessão.
- **Fase 12 roda em paralelo** e toca `convex/outreach.ts` (`draft`, `callScript`) para reservar cota de IA, além de `PLANS`, `workspace.ts` e o layout `(app)`. Esta fase deve tocar em `outreach.ts` só o caminho de envio (`send`/`markSent` e afins) e listar no plano as funções exatas, para o orquestrador ordenar sem conflito.

</decisions>

<canonical_refs>
- `.planning/research/commercial/LEGAL.md` seção 4 (envio no lançamento; limites do mailto; Art. 14)
- `.planning/research/commercial/LAUNCH-READINESS.md` (M3, M7; `outreach.ts:512-532`, `compliance.ts:46`, `suppressions.ts:12-57`)
- `convex/outreach.ts`, `convex/lib/compliance.ts`, `convex/lib/outreachAi.ts`, `convex/suppressions.ts`, `convex/http.ts` (endpoint de unsubscribe), `convex/lib/domain.ts` (`MARKETS`, `LAUNCH_MARKETS`, `canContactByEmail`), `convex/model/purge.ts`
- `src/components/outreach-composer.tsx`, `src/app/(app)/outreach/page.tsx`, `src/app/(app)/settings/page.tsx`, `src/components/crm/dm-composer.tsx`
- `docs/LESSONS.md`, `AGENTS.md`
</canonical_refs>

<deferred>
- Envio pelo Gmail/Outlook via OAuth (SEND-06, v2).
- Envio automático e follow-up (AUTO-*, FUP-*, v2).
</deferred>
