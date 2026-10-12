import { auth, clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";

// Apaga o login do Clerk do usuário LOGADO. Último passo da exclusão de conta (LEGAL-05):
// roda depois de account.deleteMyAccount, que precisa do usuário ainda autenticado.
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  try {
    await (await clerkClient()).users.deleteUser(userId);
  } catch (e) {
    if (!(isClerkAPIResponseError(e) && e.status === 404)) {
      console.error("Clerk deleteUser falhou", isClerkAPIResponseError(e) ? e.status : "");
      return Response.json({ error: "Falha ao remover o login" }, { status: 502 });
    }
  }
  return Response.json({ ok: true });
}
