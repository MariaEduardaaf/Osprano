"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Lê `?lead=<id>` e abre o drawer (spec 3.1: o editor volta para `/crm?lead=`).
 * Vive num componente próprio porque `useSearchParams` numa página client
 * estática precisa de `<Suspense>` em volta, senão o `next build` falha
 * (missing-suspense-with-csr-bailout); a página o renderiza com fallback null.
 * O id vem cru da URL: quem valida é a página, ao procurar o lead na lista.
 */
export function OpenLeadFromQuery({ onOpen }: { onOpen: (id: Id<"leads">) => void }) {
  const params = useSearchParams();
  const lead = params.get("lead");
  useEffect(() => {
    if (lead) onOpen(lead as Id<"leads">);
  }, [lead, onOpen]);
  return null;
}
