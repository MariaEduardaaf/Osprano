"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
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

const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

/** Rótulos curtos: o rail tem 72px. "Meus Projetos" vira "Sites" só aqui (a página mantém o título). */
const NAV: { href: string; label: string; Icon: IconType }[] = [
  { href: "/dashboard", label: "Início", Icon: MdOutlineDashboard },
  { href: "/leads", label: "Leads", Icon: MdOutlineTravelExplore },
  { href: "/crm", label: "CRM", Icon: MdOutlineViewKanban },
  { href: "/outreach", label: "Outreach", Icon: MdOutlineForwardToInbox },
  { href: "/sites", label: "Sites", Icon: MdOutlineLanguage },
];

function NavItem({ href, label, Icon }: { href: string; label: string; Icon: IconType }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-center text-[11px] font-medium transition-colors ${
        active ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2/60 hover:text-foreground"
      }`}
    >
      <Icon size={22} />
      {label}
    </Link>
  );
}

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="var(--brand)" strokeWidth="1.5" opacity="0.4" />
      <circle cx="12" cy="12" r="5" stroke="var(--brand)" strokeWidth="1.5" opacity="0.7" />
      <circle cx="12" cy="12" r="1.8" fill="var(--brand)" />
    </svg>
  );
}

/**
 * Rail de 72px em vidro. Sem h-full de propósito: o flex do pai já estica, e
 * h-full + margem estourava o h-dvh em 32px.
 */
export function Sidebar() {
  return (
    <nav className="glass m-4 mr-0 flex w-[72px] shrink-0 flex-col items-center gap-1 rounded-2xl px-2 py-4">
      <Link
        href="/dashboard"
        aria-label="Osprano"
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
      >
        <Logo />
      </Link>

      {NAV.map((item) => (
        <NavItem key={item.href} href={item.href} label={item.label} Icon={item.Icon} />
      ))}

      <div className="mt-auto flex w-full flex-col items-center gap-2 pt-4">
        <NavItem href="/settings" label="Ajustes" Icon={MdOutlineSettings} />
        <ThemeToggle />
        {DEMO ? (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[9px] font-semibold text-muted">
            DEMO
          </span>
        ) : (
          <UserButton />
        )}
      </div>
    </nav>
  );
}
