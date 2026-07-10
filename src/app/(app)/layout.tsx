import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-end gap-4 border-b border-border bg-surface px-6">
          <Link href="/settings" className="text-sm font-medium text-muted hover:text-foreground">
            Settings
          </Link>
          <UserButton />
        </header>
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
