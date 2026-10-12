import Link from "next/link";
import type { ReactNode } from "react";
import { LegalLinks } from "@/components/legal/legal-links";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-3xl px-6 pt-8">
        <Link href="/" className="font-display text-lg font-bold">
          Osprano
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-14">{children}</main>
      <footer className="mx-auto max-w-3xl border-t border-border px-6 py-8">
        <LegalLinks inline />
      </footer>
    </div>
  );
}
