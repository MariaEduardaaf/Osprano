"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { usageAlert, usageItems, type UsageLevel } from "@/lib/usage";

const COLOR: Record<UsageLevel, string> = { ok: "bg-brand", warn: "bg-warm", full: "bg-hot" };
const SPOKEN: Record<UsageLevel, string> = { ok: "", warn: ", perto do limite", full: ", limite atingido" };

/**
 * Só monta dentro do AcceptanceGate (que já esperou a autenticação do Convex, ver LESSONS)
 * e usa a mesma consulta do gate, com os mesmos args, então reaproveita a inscrição.
 */
export function UsageBar() {
  const ws = useQuery(api.workspaces.current);
  if (!ws) return null;
  const alert = usageAlert(ws);
  return (
    <div className="glass mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[var(--radius)] px-4 py-2 text-xs">
      <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold">{ws.planName}</span>
      {usageItems(ws).map((i) => (
        <div key={i.key} aria-label={`${i.label}: ${i.used} de ${i.limit} ${i.suffix}${SPOKEN[i.level]}`}>
          <span className="text-faint">{i.label} </span>
          <span className="tabular-nums">
            {i.used}/{i.limit} {i.suffix}
          </span>
          <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <div
              className={`h-full rounded-full ${COLOR[i.level]}`}
              style={{ width: `${Math.min(100, Math.round((i.used / Math.max(1, i.limit)) * 100))}%` }}
            />
          </div>
        </div>
      ))}
      {alert && (
        <p role="status" className="w-full text-warm">
          {alert}{" "}
          <Link href="/plans" className="underline">
            Ver planos
          </Link>
        </p>
      )}
    </div>
  );
}
