import type { ReactNode } from "react";
import {
  PiEye,
  PiPaperPlaneTilt,
  PiChatCircle,
  PiArrowsLeftRight,
  PiNote,
} from "react-icons/pi";
import { SiWhatsapp } from "react-icons/si";

/**
 * Cor e ícone por tipo de evento, compartilhados pelo feed do Dashboard e pelo Histórico do lead.
 * Extraídos de dashboard/page.tsx sem mudar comportamento; ganham o caso `note` (nota do CRM).
 * O `eventLabel` FICA no Dashboard: o feed tem copy própria e o Histórico tem a sua.
 */
export function eventDot(type: string): string {
  if (type === "preview_open") return "var(--warm)";
  if (type === "email_sent" || type === "reply" || type === "dm_sent") return "var(--brand)";
  if (type === "note") return "var(--faint)";
  return "var(--faint)";
}

export function eventIcon(type: string, meta: { channel?: string } | null): ReactNode {
  if (type === "note") return <PiNote size={16} />;
  if (type === "preview_open") return <PiEye size={16} />;
  if (type === "email_sent") return meta?.channel === "whatsapp" ? <SiWhatsapp size={16} /> : <PiPaperPlaneTilt size={16} />;
  if (type === "dm_sent") return <PiChatCircle size={16} />;
  if (type === "reply") return <PiChatCircle size={16} />;
  return <PiArrowsLeftRight size={16} />;
}
