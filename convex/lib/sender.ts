/**
 * Perfil de remetente do workspace (SEND-01). Módulo puro, sem import do servidor.
 * Substitui o `RESEND_FROM` global como identidade de quem envia: assinatura, rodapé e IA.
 */
import { userError } from "./errors.ts";

export interface SenderProfile {
  name: string;
  company: string;
  address: string;
  replyTo: string;
}

export const SENDER_REQUIRED_MESSAGE =
  "Complete seu perfil de remetente em Ajustes > Remetente antes de gerar ou enviar mensagens.";

export const SENDER_LIMITS = { name: 80, company: 120, address: 200, replyTo: 254 } as const;

// Mesma regex de convex/leads.ts (lá não é exportada).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

const FIELDS: { key: keyof SenderProfile; empty: string; label: string }[] = [
  { key: "name", empty: "Informe o nome de quem assina.", label: "Nome" },
  { key: "company", empty: "Informe a empresa ou marca.", label: "Empresa" },
  { key: "address", empty: "Informe o endereço postal (vai no rodapé de todo e-mail).", label: "Endereço" },
  { key: "replyTo", empty: "E-mail de resposta inválido.", label: "E-mail" },
];

export function normalizeSenderInput(input: SenderProfile): SenderProfile {
  const out = {} as SenderProfile;
  for (const f of FIELDS) {
    const v = f.key === "replyTo" ? clean(input[f.key]).toLowerCase() : clean(input[f.key]);
    if (!v) throw userError(f.empty);
    if (v.length > SENDER_LIMITS[f.key]) {
      throw userError(`${f.label} muito longo (máx. ${SENDER_LIMITS[f.key]} caracteres).`);
    }
    if (f.key === "replyTo" && !EMAIL_RE.test(v)) throw userError("E-mail de resposta inválido.");
    out[f.key] = v;
  }
  return out;
}

export function isSenderComplete(p: Partial<SenderProfile> | null | undefined): p is SenderProfile {
  return !!p && FIELDS.every((f) => (p[f.key] ?? "").trim() !== "");
}

export function requireSender(p: Partial<SenderProfile> | null | undefined): SenderProfile {
  if (!isSenderComplete(p)) throw userError(SENDER_REQUIRED_MESSAGE);
  return p;
}

export function senderFooterIdentity(p: SenderProfile): string {
  return [p.name, p.company, p.address, p.replyTo].join(", ");
}
