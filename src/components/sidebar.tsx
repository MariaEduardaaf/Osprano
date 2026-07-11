"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  MdOutlineDashboard,
  MdOutlineTravelExplore,
  MdOutlineViewKanban,
  MdOutlineForwardToInbox,
  MdOutlineLanguage,
  MdOutlineSettings,
} from "react-icons/md";
import type { IconType } from "react-icons";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV: { href: string; label: string; Icon: IconType }[] = [
  { href: "/dashboard", label: "Dashboard", Icon: MdOutlineDashboard },
  { href: "/leads", label: "Leads", Icon: MdOutlineTravelExplore },
  { href: "/crm", label: "CRM", Icon: MdOutlineViewKanban },
  { href: "/outreach", label: "Outreach", Icon: MdOutlineForwardToInbox },
  { href: "/sites", label: "Meus Projetos", Icon: MdOutlineLanguage },
];

function NavItem({ href, label, Icon }: { href: string; label: string; Icon: IconType }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-surface-2 text-foreground shadow-[var(--shadow-sm)] before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-brand"
          : "text-muted hover:bg-surface-2/60 hover:text-foreground"
      }`}
    >
      <Icon size={19} className={active ? "text-brand" : "text-faint"} />
      {label}
    </Link>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="var(--brand)" strokeWidth="1.5" opacity="0.4" />
      <circle cx="12" cy="12" r="5" stroke="var(--brand)" strokeWidth="1.5" opacity="0.7" />
      <circle cx="12" cy="12" r="1.8" fill="var(--brand)" />
    </svg>
  );
}

function SettingsButton() {
  const pathname = usePathname();
  const active = pathname === "/settings" || pathname.startsWith("/settings/");
  return (
    <Link
      href="/settings"
      aria-label="Configurações"
      title="Configurações"
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
        active ? "bg-surface-2 text-brand" : "text-muted hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      <MdOutlineSettings size={19} />
    </Link>
  );
}

function UsageFooter() {
  const ws = useQuery(api.workspaces.current);
  const pct = ws ? Math.min(100, Math.round((ws.leadsUsed / Math.max(1, ws.limits.leads)) * 100)) : 0;
  return (
    <div className="space-y-3">
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
  return (
    <nav className="flex h-full w-60 shrink-0 flex-col gap-1 border-r border-border bg-surface px-3.5 py-5">
      <div className="mb-7 flex items-center gap-2.5 px-1.5">
        <Logo />
        <div>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            Osprano
          </span>
          <span className="-mt-0.5 block font-mono text-[9px] font-medium uppercase tracking-[0.13em] text-brand/55">
            compliant by design
          </span>
        </div>
      </div>

      {NAV.map((item) => (
        <NavItem key={item.href} href={item.href} label={item.label} Icon={item.Icon} />
      ))}

      <div className="mt-auto flex flex-col gap-3 pt-4">
        <UsageFooter />
        <div className="flex items-center justify-between border-t border-border pt-3">
          <ThemeToggle />
          <SettingsButton />
        </div>
      </div>
    </nav>
  );
}
