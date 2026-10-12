import { Sidebar } from "@/components/sidebar";
import { AcceptanceGate } from "@/components/legal/acceptance-gate";
import { LegalLinks } from "@/components/legal/legal-links";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AcceptanceGate>
      <div className="app-shell flex h-dvh">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="animate-rise">{children}</div>
          <footer className="mt-12 border-t border-border pt-6">
            <LegalLinks inline />
          </footer>
        </main>
      </div>
    </AcceptanceGate>
  );
}
