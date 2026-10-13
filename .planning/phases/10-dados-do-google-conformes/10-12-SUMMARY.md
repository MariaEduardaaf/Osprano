---
phase: 10-dados-do-google-conformes
plan: 12
status: complete
---

# 10-12: Portão de produção

Autorizado pela Duda passo a passo em 2026-10-12/13 ("Publicar agora" e depois "sim" para a migração real).

1. Backup de produção: `~/Backups/osprano/osprano-prod-20261012-2108.zip` (186 leads, 5 previews, 1 workspace, storage incluído).
2. `npx convex deploy -y` em `oceanic-porcupine-674` (dry-run antes confirmou o alvo; só índices adicionados, nenhum apagado).
3. `main` avançado (fast-forward) para `v1.3-pronto-pra-vender` e enviado ao GitHub; Vercel publicou em ~60 s (`/legal/empresa` 200, landing sem depoimentos). Fases 9 e 10 no ar juntas. Branch também enviado como cópia.
4. Ensaio em produção: 186 leads, 11 do Google a limpar, 0 previews, 0 sites publicados com nome do Google, 0 previews já enviados, 0 leads com histórico.
5. Sem decisão pendente sobre sites publicados (nenhum afetado).
6. Migração real: `leadsCleaned 11`, `previewsCleaned 0`.
7. Auditoria: `leadsCleaned 0`, `previewsCleaned 0`. Conferência direta no banco: os 11 leads do Google só têm `placeId` (1 mantém `category` porque é uma categoria do próprio app, regra `shareableCategory`).

Relatórios em `~/Backups/osprano/osprano-prod-{dryrun,migrate,audit}-*.json` (só contagens e ids).

Pendente (Task 3, conferência humana em produção): a Duda abrir o app, aceitar os termos e ver os 11 leads como "Negócio do Google"; primeira busca real no Google para conferir a contagem de resultados e o botão "Carregar dados do Google desta página".
