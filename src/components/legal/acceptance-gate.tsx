"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useClerk } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import { legalHref } from "@convex/lib/legal";
import { errorMessage } from "@/lib/errors";
import { LegalLinks } from "@/components/legal/legal-links";

const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

/** Não renderiza o app sem aceite da versão vigente dos documentos (LEGAL-03). */
export function AcceptanceGate({ children }: { children: React.ReactNode }) {
  if (DEMO) return <>{children}</>;
  return <RealGate>{children}</RealGate>;
}

function RealGate({ children }: { children: React.ReactNode }) {
  const s = useQuery(api.workspaces.current);
  if (s === undefined) return <p className="p-6 text-sm text-faint">Carregando…</p>;
  if (s.acceptanceOk) return <>{children}</>;
  return <AcceptanceScreen requiredVersion={s.requiredVersion} previousVersion={s.acceptedVersion} />;
}

function AcceptanceScreen({
  requiredVersion,
  previousVersion,
}: {
  requiredVersion: string;
  previousVersion: string | null;
}) {
  const accept = useMutation(api.workspaces.acceptTerms);
  const { signOut } = useClerk();
  const [terms, setTerms] = useState(false);
  const [pro, setPro] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const link = "underline hover:text-foreground";

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await accept({ version: requiredVersion, professionalUse: true });
    } catch (e) {
      setErr(errorMessage(e, "Não foi possível registrar o aceite."));
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8">
        <h1 className="font-display text-2xl font-bold">Antes de começar</h1>
        <p className="mt-2 text-sm text-muted">
          {previousVersion
            ? "Nossos documentos foram atualizados. Leia e aceite a versão nova para continuar."
            : "Para usar o Osprano, leia e aceite os documentos abaixo."}
        </p>
        <div className="mt-6 space-y-4 text-sm">
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span>
              Li e aceito os{" "}
              <a href={legalHref("termos")} target="_blank" rel="noopener noreferrer" className={link}>
                Termos de Uso
              </a>{" "}
              e o{" "}
              <a href={legalHref("dpa")} target="_blank" rel="noopener noreferrer" className={link}>
                Acordo de Tratamento de Dados (DPA)
              </a>
              .
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1" checked={pro} onChange={(e) => setPro(e.target.checked)} />
            <span>
              Uso o Osprano para fins profissionais, em nome de uma empresa ou como profissional, e não como
              consumidor.
            </span>
          </label>
          <p className="text-xs text-muted">
            Veja como tratamos seus dados na{" "}
            <a href={legalHref("privacidade")} target="_blank" rel="noopener noreferrer" className={link}>
              Política de Privacidade
            </a>
            .
          </p>
        </div>
        {err && (
          <p role="alert" className="mt-4 text-sm text-red-500">
            {err}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={!terms || !pro || busy}
            onClick={() => void submit()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {busy ? "Registrando…" : "Aceitar e continuar"}
          </button>
          <button
            type="button"
            onClick={() => void signOut({ redirectUrl: "/" })}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2"
          >
            Sair
          </button>
        </div>
        <LegalLinks inline className="mt-6" />
      </div>
    </div>
  );
}
