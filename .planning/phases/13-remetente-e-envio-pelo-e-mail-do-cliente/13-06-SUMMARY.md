---
phase: 13-remetente-e-envio-pelo-e-mail-do-cliente
plan: 06
subsystem: phase-gate
tags: [gates, dev-browser-check]
requires: ["13-01", "13-02", "13-03", "13-04", "13-05"]
key-files:
  modified: [convex/_generated/api.d.ts]
metrics:
  tasks: 1 auto + 1 checkpoint (headless run on DEV done; human pass pending)
  completed: 2026-10-13
---

# Phase 13 Plan 06: Phase gate Summary

All gates green, schema pushed to DEV, and the send flow ran headless on DEV with a throwaway Clerk user. Real Gmail/Outlook windows still need Duda's eyes.

## Gates
- tests 532 pass / 0 fail; tsc root and convex clean; eslint clean; `next build` OK (ran inside the sandbox, no font failure).
- `npx convex dev --once` on DEV: "Convex functions ready", no prompt.
- Sweep: `callerNameFrom|requireSenderFrom|updateDraft|withOptOutFooter` only hits one comment in `tests/compliance.test.ts:116` (already known from 13-04). `"Duda"` literal in src/convex: empty.

## Phase 12 follow-up
- `trialClaims` new row has `via: "email"` (Clerk DEV template now carries email). Closed.
- Phase 12 item 3 (AI buttons locked with quota exhausted): trial plan + `workspaces:reserve ai 25` -> composer shows "Escrever com IA [disabled]" and "Você usou todas as gerações por IA do seu plano. Ver planos". Closed. Production Clerk template change is still a Duda step (12-PROD-STEPS.md).

## Browser checks (headless, DEV, user osprano-uat13+clerk_test)
1. Remetente: empty address refused ("Informe o endereço postal (vai no rodapé de todo e-mail)."); all 4 filled -> "Salvo.". OK
2. AI draft: NOT testable, DEV has no ANTHROPIC_API_KEY ("ANTHROPIC_API_KEY não configurada no deployment Convex."). Draft was inserted with `outreach:upsertDraft` (DEV internal) instead. Signature from profile not verified end to end.
3. Enviar: "Pronta para enviar" with body + footer: "Sent by Maria Teste, Teste Studio Ltd, 12 High St..., maria@teste.example. Don't want to hear from us again? Unsubscribe: <convex.site>/unsubscribe?token=..." + "We found your business contact details in public sources: your public website or business directories." OK
4. Gmail/Outlook/mailto hrefs generated (target _blank for web ones). Decoded: Gmail `view,fs,to,su,body`, Outlook `to,subject,body`, same body in both; accents/&/line breaks preserved; mailto uses CRLF (RFC 6068), equal after normalizing. Real windows NOT opened: pending Duda.
5. Copiar: button present, clicked, no "Copiado" feedback seen in headless (clipboard permission); content not verified. Pending Duda.
6. Marquei como enviada: lead stage base -> approached (Abordado), outreach row status `sent`, Histórico shows "Email enviado agora". OK
7. Unsubscribe URL opened: page "You've been unsubscribed" (200). Re-clicking Enviar on that lead: "Este contato pediu para não ser contatado (opt-out)." OK
8. Leads: Noruega only under "Ligação primeiro", with "validação jurídica pendente" text present; absent under "Email primeiro". Norwegian old lead in the drawer NOT tested (cannot create one: manual-create offers only GB/NL/IE/SE; covered by unit tests of `canContactByEmail`).
9. Without profile: drawer shows "Complete seu perfil de remetente..." with link "Abrir Ajustes > Remetente" (/settings), "Escrever com IA" disabled. OK
10. WhatsApp: after "Registrar opt-in" the card shows "Abrir no WhatsApp" (wa.me/442000000002?text=...), note "o Osprano não envia por você", no send button. OK
11. Href lengths: GB real (UI): Gmail 764, Outlook 775, mailto 755. ES and DE leads could not be created (manual-create has no ES/DE; OSM/Places discovery not run), so measured with the real `composeOutgoingBody` + `composeLinks` on synthetic bodies and a long Spanish-accented identity, same unsubscribe URL length: ES 826 chars -> 1394/1405/1376; 1294 chars -> 2120/2131/2114; 2230 chars -> 3572/3583/3590. DE 891 -> 1432/1443/1414; 1437 -> 2216/2227/2210; 2529 -> 3784/3795/3802. All under COMPOSE_URL_MAX 6000 even for ~2.5k-char bodies. Duda's real pasted ES/DE text still wanted to confirm.

## Cleanup
Test account deleted via Ajustes > Segurança > Apagar conta (APAGAR): 0 rows for the orgId in workspaces, leads, outreach. By design (13-03) the unsubscribe suppression for uat-gb@example.com stays on DEV as a global row; fixture rows from seedDevFixtures were deleted with the account.

## Findings
- No bugs found in the flow. Observed: manual-create offers only 4 countries, so ES/DE consent flows cannot be exercised without discovery.
- Copiar gives no visible feedback in headless Chromium; check in a real browser.

## Pendências para o advogado (de 13-02 e 13-03)
- Tradução da linha "fonte dos dados" (10 idiomas) escrita pelo agente: revisar junto com o rodapé (LEGAL.md 4.2).
- Lista global de descadastro guarda o e-mail após o cliente apagar a conta; política de privacidade não foi editada e pode precisar mencionar.
- Noruega: "validação jurídica pendente" até parecer.

## Deviations
None. Checkpoint run headless by instruction instead of waiting for Duda.

## Self-Check: PASSED
