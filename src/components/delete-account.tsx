"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { useClerk } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import { errorMessage } from "@/lib/errors";

/**
 * Exclusão de conta (LEGAL-05): Convex (assinatura + dados) e depois o login do Clerk.
 * Quando o purge apaga o workspace, o AcceptanceGate troca a tela pela de aceite por um instante
 * antes do signOut; o fluxo continua porque a promise segue viva, por isso o aviso de falha do
 * Clerk usa window.alert e não estado do componente.
 */
export function DeleteAccount() {
  const deleteMyAccount = useAction(api.account.deleteMyAccount);
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function close() {
    setOpen(false);
    setText("");
    setError("");
  }

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await deleteMyAccount({ confirm: "APAGAR" });
    } catch (e) {
      setError(errorMessage(e, "Não foi possível apagar a conta."));
      setBusy(false);
      return;
    }
    const res = await fetch("/api/account/clerk", { method: "DELETE" }).catch(() => null);
    if (!res?.ok)
      window.alert(
        "Seus dados foram apagados, mas o login não foi removido. Entre de novo e repita, ou escreva para o suporte.",
      );
    await signOut({ redirectUrl: "/" });
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="text-sm font-semibold text-danger hover:underline">
        Apagar conta
      </button>
    );

  return (
    <div className="rounded-xl border border-danger/40 p-4 text-left">
      <p className="text-sm">
        Isto apaga para sempre: todos os leads, previews, sites publicados (saem do ar), histórico do CRM,
        abordagens e fotos enviadas. A assinatura é cancelada e o seu login é removido. As faturas continuam
        guardadas no Stripe por obrigação fiscal. Não dá para desfazer.
      </p>
      <label className="mt-3 block text-sm font-medium">
        Digite APAGAR para confirmar
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
        />
      </label>
      <div className="mt-3 flex gap-3">
        <button
          onClick={confirm}
          disabled={text !== "APAGAR" || busy}
          className="rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Apagando..." : "Apagar minha conta"}
        </button>
        <button onClick={close} disabled={busy} className="text-sm font-semibold hover:underline">
          Cancelar
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
