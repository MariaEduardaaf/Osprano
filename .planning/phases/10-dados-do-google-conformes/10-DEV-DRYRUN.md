# Fase 10: ensaio da migração no DEV

Data: 2026-10-12 (execução ~20:50 a 20:55, horário local).
Deployment: `ardent-jay-971` (Development, nome mostrado pelo CLI). Produção não foi tocada.

## Backup do DEV (antes da execução real)

`/Users/madu/Backups/osprano/osprano-dev-backup-20261012-2050.zip`, 203978 bytes.

## Comandos executados

```
npx convex dev --once            # schema e funções aceitos; índices novos criados (by_org_country, by_org_saved, by_org_channel, by_org_open); codegen sem diff
npx convex export --path $HOME/Backups/osprano/osprano-dev-backup-20261012-2050.zip --include-file-storage
npx convex run googleCompliance:seedDevFixtures '{"orgId":"fixture-fase10"}'
npx convex run suppressions:isSuppressed '{"email":"global@fixture.test","orgId":"fixture-fase10"}'
npx convex run suppressions:isSuppressed '{"email":"org@fixture.test","orgId":"outra-org"}'
npx convex run --identity '{"subject":"fixture-fase10"}' leads:listCrm '{}'
npx convex run googleCompliance:migrateAll '{"dryRun":true}'    # dry1
npx convex run googleCompliance:migrateAll '{"dryRun":false}'   # real
npx convex run googleCompliance:migrateAll '{"dryRun":true}'    # dry2
```

## Seed

`{"leads": 6, "previews": 3}`. O DEV já tinha outros dados: o relatório varreu 50 leads no total.

## Checagens de índice com `undefined` (runtime real)

- Supressão global (`eq(orgId, undefined)`): `isSuppressed` global@fixture.test = `true` (esperado true)
- Supressão de outra org: `isSuppressed` org@fixture.test em `outra-org` = `false` (esperado false)
- CRM legado: `listCrm` com identidade devolveu 6 leads, 1 deles sem o campo `saved` (lead manual legado, id `j970tenvh41adgtyb5gqnyab2h8g44sh`). Verificado.

## Relatórios

### dry1

```json
{
  "batches": 2,
  "confirmedLeads": 1,
  "dryRun": true,
  "leadsCleaned": 3,
  "leadsScanned": 50,
  "leadsWithCallScript": 1,
  "leadsWithOutreachHistory": 1,
  "leadsWithoutNameAfter": 3,
  "placesLeads": 4,
  "previewsChangedWithSentOutreach": 1,
  "previewsCleaned": 3,
  "publishedNameKept": 1,
  "publishedNameKeptLeadIds": ["j97990n3p6dpwwv4m0s5xrss1s8g5nza"]
}
```

### real (dryRun false)

```json
{
  "batches": 2,
  "confirmedLeads": 1,
  "dryRun": false,
  "leadsCleaned": 3,
  "leadsScanned": 50,
  "leadsWithCallScript": 1,
  "leadsWithOutreachHistory": 1,
  "leadsWithoutNameAfter": 3,
  "placesLeads": 4,
  "previewsChangedWithSentOutreach": 1,
  "previewsCleaned": 3,
  "publishedNameKept": 1,
  "publishedNameKeptLeadIds": ["j97990n3p6dpwwv4m0s5xrss1s8g5nza"]
}
```

### dry2 (idempotência)

```json
{
  "batches": 2,
  "confirmedLeads": 1,
  "dryRun": true,
  "leadsCleaned": 0,
  "leadsScanned": 50,
  "leadsWithCallScript": 1,
  "leadsWithOutreachHistory": 1,
  "leadsWithoutNameAfter": 3,
  "placesLeads": 4,
  "previewsChangedWithSentOutreach": 0,
  "previewsCleaned": 0,
  "publishedNameKept": 0,
  "publishedNameKeptLeadIds": []
}
```

Segunda rodada com `leadsCleaned: 0` e `previewsCleaned: 0`: a migração é idempotente.

## Para a Duda no portão de produção

- Decisão da Duda no portão: `publishedNameKeptLeadIds` (1 lead no DEV: `j97990n3p6dpwwv4m0s5xrss1s8g5nza`). São leads com site publicado que mantêm o nome do Google; manter ou limpar é escolha dela.
- `previewsChangedWithSentOutreach` (1 no DEV): prévias já enviadas a prospects que vão abrir sem o nome do Google.
- Sem desvios nem bloqueios no ensaio.
