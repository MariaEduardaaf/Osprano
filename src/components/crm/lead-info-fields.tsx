"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { currencyForCountry, currencySymbol } from "@convex/lib/domain";
import { errorMessage } from "@/lib/errors";

const fieldCls =
  "w-full rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-border-strong";

/**
 * Edição inline: salva no blur e no Enter (Enter só tira o foco; quem salva é o blur, um caminho
 * só); Esc descarta e NÃO fecha o drawer (stopPropagation: o LeadDetail escuta Esc no window).
 * Erro do servidor aparece abaixo do campo e o digitado fica. O pai remonta o campo por `key`
 * quando o valor salvo muda, então o rascunho nunca fica preso num valor velho.
 */
function InlineField({
  label,
  value,
  placeholder,
  type = "text",
  prefix,
  hint,
  onSave,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: "text" | "number" | "email";
  prefix?: string;
  hint?: string;
  onSave: (draft: string) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState(value);
  const [msg, setMsg] = useState<string | null>(null);

  async function commit() {
    if (draft === value) return;
    if (type === "number" && draft !== "" && Number.isNaN(Number(draft))) {
      setMsg("Valor inválido"); // mesma mensagem do servidor
      return;
    }
    setMsg(null);
    try {
      await onSave(draft.trim());
    } catch (e) {
      setMsg(errorMessage(e, "Falha"));
    }
  }

  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-muted">{label}</span>
      <span className="flex items-center gap-1.5">
        {prefix && <span className="shrink-0 text-sm text-muted">{prefix}</span>}
        <input
          type={type}
          min={type === "number" ? 0 : undefined}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              e.stopPropagation();
              setDraft(value);
              setMsg(null);
            }
          }}
          className={fieldCls}
        />
      </span>
      {hint && !msg && <span className="mt-1 block text-[11px] text-faint">{hint}</span>}
      {msg && <span className="mt-1 block text-[11px] text-danger">{msg}</span>}
    </label>
  );
}

/** Contato (nome, cargo) e Negócio (setup, mensalidade, com o símbolo da moeda do país). */
export function LeadInfoFields({ lead }: { lead: Doc<"leads"> }) {
  const updateInfo = useMutation(api.leads.updateInfo);
  const symbol = currencySymbol(currencyForCountry(lead.countryCode));
  // campo numérico esvaziado envia null (limpa); o servidor valida negativo/NaN
  const num = (v: string) => (v === "" ? null : Number(v));

  return (
    <section className="rounded-xl bg-surface-2 p-4">
      <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">Contato</h3>
      <div className="grid grid-cols-2 gap-3">
        <InlineField
          key={`name:${lead.contactName ?? ""}`}
          label="Nome"
          value={lead.contactName ?? ""}
          placeholder="Quem atende"
          onSave={(v) => updateInfo({ id: lead._id, contactName: v })}
        />
        <InlineField
          key={`role:${lead.contactRole ?? ""}`}
          label="Cargo"
          value={lead.contactRole ?? ""}
          placeholder="Dono, gerente…"
          onSave={(v) => updateInfo({ id: lead._id, contactRole: v })}
        />
        <div className="col-span-2">
          <InlineField
            key={`email:${lead.email ?? ""}`}
            label="E-mail do negócio"
            type="email"
            value={lead.email ?? ""}
            placeholder="info@negocio.com"
            hint="Onde achar: site (Contato), ficha no Google, Facebook/Instagram"
            onSave={(v) => updateInfo({ id: lead._id, email: v })}
          />
        </div>
        <InlineField
          key={`instagram:${lead.instagram ?? ""}`}
          label="Instagram"
          value={lead.instagram ?? ""}
          placeholder="@loja"
          hint="sem @ está ok"
          onSave={(v) => updateInfo({ id: lead._id, instagram: v })}
        />
        <InlineField
          key={`facebook:${lead.facebook ?? ""}`}
          label="Facebook"
          value={lead.facebook ?? ""}
          placeholder="facebook.com/loja"
          onSave={(v) => updateInfo({ id: lead._id, facebook: v })}
        />
      </div>
      <h3 className="mb-2 mt-4 font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">Negócio</h3>
      <div className="grid grid-cols-2 gap-3">
        <InlineField
          key={`setup:${lead.dealSetup ?? ""}`}
          label="Setup"
          type="number"
          prefix={symbol}
          value={lead.dealSetup != null ? String(lead.dealSetup) : ""}
          placeholder="0"
          onSave={(v) => updateInfo({ id: lead._id, dealSetup: num(v) })}
        />
        <InlineField
          key={`monthly:${lead.dealMonthly ?? ""}`}
          label="Mensalidade"
          type="number"
          prefix={symbol}
          value={lead.dealMonthly != null ? String(lead.dealMonthly) : ""}
          placeholder="0"
          onSave={(v) => updateInfo({ id: lead._id, dealMonthly: num(v) })}
        />
      </div>
    </section>
  );
}
