"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
  { href: "/leads", label: "Leads", icon: "M3 6h18M3 12h18M3 18h12" },
  { href: "/crm", label: "CRM", icon: "M4 4h4v16H4zM10 4h4v16h-4zM16 4h4v16h-4z" },
  { href: "/outreach", label: "Outreach", icon: "M4 4h16v12H7l-3 3z" },
  { href: "/sites", label: "Meus Projetos", icon: "M3 5h18v14H3zM3 9h18" },
];

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="var(--brand)" strokeWidth="1.5" opacity="0.4" />
      <circle cx="12" cy="12" r="5" stroke="var(--brand)" strokeWidth="1.5" opacity="0.7" />
      <circle cx="12" cy="12" r="1.8" fill="var(--brand)" />
    </svg>
  );
}

function UsageFooter() {
  const ws = useQuery(api.workspaces.current);
  const pct = ws ? Math.min(100, Math.round((ws.leadsUsed / Math.max(1, ws.limits.leads)) * 100)) : 0;
  return (
    <div className="mt-auto space-y-3 border-t border-border pt-4">
      {ws && (
        <div className="rounded-xl border border-border bg-surface-2 px-3 py-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono font-semibold uppercase tracking-wide text-foreground">
              {ws.plan}
            </span>
            <span className="tabular-nums text-muted">
              {ws.leadsUsed}/{ws.limits.leads}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
      <Link
        href="/plans"
        className="block rounded-xl bg-brand px-3 py-2.5 text-center text-sm font-semibold text-brand-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-brand-hover"
      >
        {ws && ws.plan !== "free" ? "Gerenciar plano" : "Fazer upgrade"}
      </Link>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex h-full w-60 shrink-0 flex-col gap-1 border-r border-border bg-surface px-3.5 py-5">
      <div className="mb-7 flex items-center gap-2.5 px-1.5">
        <Logo />
        <div>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            sitescout
          </span>
          <span className="-mt-0.5 block font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-brand">
            compliant by design
          </span>
        </div>
      </div>

      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-soft text-foreground before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-brand"
                : "text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={active ? "text-brand" : "text-faint"}
            >
              <path d={item.icon} />
            </svg>
            {item.label}
          </Link>
        );
      })}

      <UsageFooter />
    </nav>
  );
}
