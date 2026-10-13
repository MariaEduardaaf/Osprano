"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

// Só usados dentro do app autenticado (filhos do AcceptanceGate), que já esperou o Convex autenticar.

/** Teste já usado tem limite 0, então bloqueia também. */
export function useAiBlocked(): boolean {
  const ws = useQuery(api.workspaces.current);
  return !!ws && ws.aiUsed >= ws.limits.ai;
}

export function AiQuotaNotice({ className }: { className?: string }) {
  const ws = useQuery(api.workspaces.current);
  if (!ws || ws.aiUsed < ws.limits.ai) return null;
  return (
    <p role="status" className={`text-xs text-warm ${className ?? ""}`}>
      {ws.trialSpent ? "Seu teste grátis já foi usado." : "Você usou todas as gerações por IA do seu plano."}{" "}
      <Link href="/plans" className="underline">
        Ver planos
      </Link>
    </p>
  );
}
