import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell flex h-dvh">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="animate-rise">{children}</div>
      </main>
    </div>
  );
}
