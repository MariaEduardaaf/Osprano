import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { userError } from "../lib/errors.ts";

/** Linha de `uploads` de um storageId (índice by_storage), ou null. */
export async function uploadRow(
  ctx: QueryCtx | MutationCtx,
  storageId: Id<"_storage">,
): Promise<Doc<"uploads"> | null> {
  return ctx.db
    .query("uploads")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .first();
}

/**
 * Todo id precisa estar em `uploads` do MESMO org (spec 2.4): um storageId
 * válido de outra org, ou um upload nunca registrado, é recusado com a mesma
 * mensagem. O editor só manda ids que ele mesmo registrou.
 */
export async function assertUploadsOwned(
  ctx: QueryCtx | MutationCtx,
  orgId: string,
  ids: Id<"_storage">[],
): Promise<void> {
  for (const id of ids) {
    const row = await uploadRow(ctx, id);
    if (!row || row.orgId !== orgId) throw userError("Imagem inválida");
  }
}

/**
 * Apaga do storage e de `uploads` os ids que pertencem ao org. Id sem linha, ou
 * de outro org, é ignorado: nunca se apaga o que não é seu. O arquivo pode já
 * ter sumido do storage (apagado por fora): a linha sai mesmo assim.
 * Devolve quantos apagou (a CLI de verificação lê isso).
 */
export async function deleteUploads(ctx: MutationCtx, orgId: string, ids: Id<"_storage">[]): Promise<number> {
  let n = 0;
  for (const id of ids) {
    const row = await uploadRow(ctx, id);
    if (!row || row.orgId !== orgId) continue;
    if (await ctx.db.system.get("_storage", id)) await ctx.storage.delete(id);
    await ctx.db.delete(row._id);
    n += 1;
  }
  return n;
}
