"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/crm", label: "CRM" },
  { href: "/outreach", label: "Outreach" },
  { href: "/sites", label: "Meus Projetos" },
];

function UsageFooter() {
  const ws = useQuery(api.workspaces.current);
  const pct = ws ? Math.min(100, Math.round((ws.leadsUsed / Math.max(1, ws.limits.leads)) * 100)) : 0;
  return (
    <div className="mt-auto space-y-3 border-t border-border pt-4">
      {ws && (
        <div className="px-2">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span className="font-semibold capitalize text-foreground">{ws.plan}</span>
            <span className="tabular-nums">
              {ws.leadsUsed}/{ws.limits.leads} leads
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      <Link
        href="/plans"
        className="block rounded-lg bg-brand px-3 py-2 text-center text-sm font-semibold text-brand-fg"
      >
        {ws && ws.plan !== "free" ? "Gerenciar plano" : "Fazer upgrade"}
      </Link>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex h-full w-56 flex-col gap-1 border-r border-border bg-surface px-3 py-5">
      <div className="mb-6 px-2">
        <span className="text-lg font-bold tracking-tight">sitescout</span>
        <span className="mt-1 block text-[10px] font-medium uppercase tracking-wider text-brand">
          compliant by design
        </span>
      </div>
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-foreground text-background"
                : "text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <UsageFooter />
    </nav>
  );
}
