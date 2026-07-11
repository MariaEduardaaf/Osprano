"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useAction } from "convex/react";
import type { IconType } from "react-icons";
import {
  MdPersonOutline,
  MdOutlineSecurity,
  MdOutlineCreditCard,
  MdAdd,
  MdOpenInNew,
  MdOutlineLaptopMac,
  MdLogout,
} from "react-icons/md";
import { useUser, useClerk } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import { PageHeader } from "@/components/ui";

const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

// Conta exibida (no app real vem do Clerk; aqui, exemplo do demo)
const ACCOUNT = { name: "Conta Osprano", email: "voce@osprano.com", initial: "O" };

const SECTIONS: { id: string; label: string; Icon: IconType }[] = [
  { id: "perfil", label: "Perfil", Icon: MdPersonOutline },
  { id: "seguranca", label: "Segurança", Icon: MdOutlineSecurity },
  { id: "plano", label: "Plano & uso", Icon: MdOutlineCreditCard },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-border py-5 last:border-0 sm:flex-row sm:items-start sm:justify-between">
      <span className="shrink-0 pt-0.5 text-sm font-medium text-muted sm:w-40">{label}</span>
      <div className="min-w-0 flex-1 sm:text-right">{children}</div>
    </div>
  );
}

function Avatar() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand font-display text-sm font-bold text-brand-fg">
      {ACCOUNT.initial}
    </span>
  );
}

function DemoProfilePanel() {
  return (
    <div>
      <h2 className="font-display text-xl font-bold">Detalhes do perfil</h2>
      <div className="mt-2">
        <Row label="Perfil">
          <div className="flex items-center justify-end gap-3">
            <Avatar />
            <span className="font-semibold text-foreground">{ACCOUNT.name}</span>
            <button className="text-sm font-semibold text-brand hover:underline">Atualizar</button>
          </div>
        </Row>
        <Row label="Endereços de email">
          <div className="space-y-2 sm:flex sm:flex-col sm:items-end">
            <div className="flex items-center gap-2">
              <span className="text-foreground">{ACCOUNT.email}</span>
              <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-muted">
                Primary
              </span>
            </div>
            <button className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground">
              <MdAdd size={16} /> Adicionar email
            </button>
          </div>
        </Row>
        <Row label="Contas conectadas">
          <div className="inline-flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-2 font-display text-[11px] font-bold text-brand">
              G
            </span>
            <span className="text-foreground">Google</span>
            <span className="text-muted">· {ACCOUNT.email}</span>
          </div>
        </Row>
      </div>
    </div>
  );
}

function DemoSecurityPanel() {
  return (
    <div>
      <h2 className="font-display text-xl font-bold">Segurança</h2>
      <div className="mt-2">
        <Row label="Senha">
          <button className="text-sm font-semibold text-brand hover:underline">Definir senha</button>
        </Row>
        <Row label="Dispositivos ativos">
          <div className="flex items-start justify-end gap-3">
            <MdOutlineLaptopMac size={20} className="mt-0.5 shrink-0 text-muted" />
            <div className="text-sm">
              <div className="flex items-center justify-end gap-2">
                <span className="font-semibold text-foreground">Este dispositivo</span>
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-muted">
                  Atual
                </span>
              </div>
              <div className="mt-0.5 text-muted">Navegador · sessão atual</div>
            </div>
          </div>
        </Row>
        <Row label="Sair da conta">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-surface-2"
          >
            <MdLogout size={15} /> Sair
          </Link>
        </Row>
        <Row label="Apagar conta">
          <button className="text-sm font-semibold text-danger hover:underline">Apagar conta</button>
        </Row>
      </div>
    </div>
  );
}

function RealProfilePanel() {
  const { user, isLoaded } = useUser();
  const { openUserProfile } = useClerk();

  if (!isLoaded) return <p className="text-sm text-faint">Carregando…</p>;
  if (!user) return null;

  const initial = (user.firstName?.[0] ?? user.primaryEmailAddress?.emailAddress?.[0] ?? "U").toUpperCase();
  const name = user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "Conta";

  return (
    <div>
      <h2 className="font-display text-xl font-bold">Detalhes do perfil</h2>
      <div className="mt-2">
        <Row label="Perfil">
          <div className="flex items-center justify-end gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand font-display text-sm font-bold text-brand-fg">
              {initial}
            </span>
            <span className="font-semibold text-foreground">{name}</span>
            <button onClick={() => openUserProfile()} className="text-sm font-semibold text-brand hover:underline">
              Atualizar
            </button>
          </div>
        </Row>
        <Row label="Endereços de email">
          <div className="space-y-2 sm:flex sm:flex-col sm:items-end">
            {user.emailAddresses.map((e) => (
              <div key={e.id} className="flex items-center gap-2">
                <span className="text-foreground">{e.emailAddress}</span>
                {e.id === user.primaryEmailAddressId && (
                  <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-muted">
                    Primary
                  </span>
                )}
              </div>
            ))}
            <button
              onClick={() => openUserProfile()}
              className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground"
            >
              <MdAdd size={16} /> Adicionar email
            </button>
          </div>
        </Row>
        {user.externalAccounts.length > 0 && (
          <Row label="Contas conectadas">
            <div className="space-y-1.5 sm:flex sm:flex-col sm:items-end">
              {user.externalAccounts.map((a) => (
                <div key={a.id} className="inline-flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-2 font-display text-[11px] font-bold text-brand">
                    {(a.provider.replace(/^oauth_/, "")[0] ?? "?").toUpperCase()}
                  </span>
                  <span className="capitalize text-foreground">{a.provider.replace(/^oauth_/, "")}</span>
                  {a.emailAddress && <span className="text-muted">· {a.emailAddress}</span>}
                </div>
              ))}
            </div>
          </Row>
        )}
      </div>
    </div>
  );
}

function RealSecurityPanel() {
  const { user, isLoaded } = useUser();
  const { openUserProfile, signOut } = useClerk();

  if (!isLoaded) return <p className="text-sm text-faint">Carregando…</p>;
  if (!user) return null;

  return (
    <div>
      <h2 className="font-display text-xl font-bold">Segurança</h2>
      <div className="mt-2">
        <Row label="Senha">
          <button onClick={() => openUserProfile()} className="text-sm font-semibold text-brand hover:underline">
            {user.passwordEnabled ? "Alterar senha" : "Definir senha"}
          </button>
        </Row>
        <Row label="Dispositivos ativos">
          <button
            onClick={() => openUserProfile()}
            className="flex items-start justify-end gap-3 text-left"
          >
            <MdOutlineLaptopMac size={20} className="mt-0.5 shrink-0 text-muted" />
            <div className="text-sm">
              <div className="flex items-center justify-end gap-2">
                <span className="font-semibold text-foreground">Este dispositivo</span>
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-muted">
                  Atual
                </span>
              </div>
              <div className="mt-0.5 text-brand hover:underline">Ver todos os dispositivos</div>
            </div>
          </button>
        </Row>
        <Row label="Sair da conta">
          <button
            onClick={() => void signOut({ redirectUrl: "/" })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-surface-2"
          >
            <MdLogout size={15} /> Sair
          </button>
        </Row>
        <Row label="Apagar conta">
          <button onClick={() => openUserProfile()} className="text-sm font-semibold text-danger hover:underline">
            Apagar conta
          </button>
        </Row>
      </div>
    </div>
  );
}

const ProfileSection = DEMO ? DemoProfilePanel : RealProfilePanel;
const SecuritySection = DEMO ? DemoSecurityPanel : RealSecurityPanel;

function Bar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return (
    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

function PlanPanel() {
  const ws = useQuery(api.workspaces.current);
  const portal = useAction(api.billing.portal);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div>
      <h2 className="font-display text-xl font-bold">Plano &amp; uso</h2>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-surface-2/40 p-4">
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">Plano atual</div>
          <div className="mt-1 font-display text-xl font-bold capitalize">{ws?.plan ?? "—"}</div>
        </div>
        <Link
          href="/plans"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-brand-hover"
        >
          {ws && ws.plan !== "free" ? "Trocar plano" : "Fazer upgrade"}
        </Link>
      </div>

      {ws && (
        <div className="mt-5 space-y-4">
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Leads este mês</span>
              <span className="tabular-nums text-foreground">
                {ws.leadsUsed} / {ws.limits.leads}
              </span>
            </div>
            <Bar used={ws.leadsUsed} limit={ws.limits.leads} />
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Sites este mês</span>
              <span className="tabular-nums text-foreground">
                {ws.sitesUsed} / {ws.limits.sites}
              </span>
            </div>
            <Bar used={ws.sitesUsed} limit={ws.limits.sites} />
          </div>
        </div>
      )}

      {ws && ws.plan !== "free" && (
        <div className="mt-6 border-t border-border pt-5">
          <div className="text-sm font-semibold">Assinatura</div>
          <p className="mt-1 text-sm text-muted">
            Status: {ws.subscriptionStatus ?? "—"}. Gerencie pagamento e cancelamento no portal.
          </p>
          <button
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                const { url } = await portal({});
                window.location.assign(url);
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Falha");
                setBusy(false);
              }
            }}
            disabled={busy}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2 disabled:opacity-50"
          >
            <MdOpenInNew size={16} />
            {busy ? "Abrindo…" : "Abrir portal de billing"}
          </button>
          {err && <p className="mt-2 text-sm text-danger">{err}</p>}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState("perfil");

  return (
    <>
      <PageHeader
        eyebrow="Conta"
        title="Configurações"
        subtitle="Gerencie seu perfil, segurança e plano"
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-sm)] md:grid md:grid-cols-[248px_1fr]">
        {/* left sub-nav */}
        <aside className="border-b border-border p-5 md:border-b-0 md:border-r">
          <div className="font-display text-lg font-bold">Conta</div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Gerencie as informações da sua conta.
          </p>
          <nav className="mt-5 space-y-1">
            {SECTIONS.map((s) => {
              const active = tab === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setTab(s.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-surface-2 text-foreground shadow-[var(--shadow-sm)]"
                      : "text-muted hover:bg-surface-2/60 hover:text-foreground"
                  }`}
                >
                  <s.Icon size={18} className={active ? "text-brand" : "text-faint"} />
                  {s.label}
                </button>
              );
            })}
          </nav>
          {DEMO && (tab === "perfil" || tab === "seguranca") && (
            <p className="mt-6 rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-[11px] leading-relaxed text-faint">
              Prévia — no app real esta área é gerenciada com segurança pelo Clerk.
            </p>
          )}
        </aside>

        {/* right panel */}
        <div className="p-6 sm:p-8">
          {tab === "perfil" && <ProfileSection />}
          {tab === "seguranca" && <SecuritySection />}
          {tab === "plano" && <PlanPanel />}
        </div>
      </div>
    </>
  );
}
