import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { MdOutlineSettings } from "react-icons/md";
import { Sidebar } from "@/components/sidebar";

const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-end gap-4 border-b border-border bg-surface px-6">
          <Link
            href="/settings"
            className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
          >
            <MdOutlineSettings size={16} />
            Settings
          </Link>
          {DEMO ? (
            <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
              modo demo
            </span>
          ) : (
            <UserButton />
          )}
        </header>
        <main className="flex-1 overflow-auto p-8">
          <div className="animate-rise">{children}</div>
        </main>
      </div>
    </div>
  );
}
