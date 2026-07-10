"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/crm", label: "CRM" },
  { href: "/outreach", label: "Outreach" },
];

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
    </nav>
  );
}
