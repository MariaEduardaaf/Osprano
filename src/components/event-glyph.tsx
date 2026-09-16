import type { ReactNode } from "react";
import {
  MdOutlineVisibility,
  MdOutlineSend,
  MdOutlineChat,
  MdOutlineSwapHoriz,
  MdOutlineStickyNote2,
} from "react-icons/md";

/**
 * Cor e ícone por tipo de evento, compartilhados pelo feed do Dashboard e pelo Histórico do lead.
 * Extraídos de dashboard/page.tsx sem mudar comportamento; ganham o caso `note` (nota do CRM).
 * O `eventLabel` FICA no Dashboard: o feed tem copy própria e o Histórico tem a sua.
 */
export function eventDot(type: string): string {
  if (type === "preview_open") return "var(--warm)";
  if (type === "email_sent" || type === "reply") return "var(--brand)";
  if (type === "note") return "var(--faint)";
  return "var(--faint)";
}

export function eventIcon(type: string, meta: { channel?: string } | null): ReactNode {
  if (type === "note") return <MdOutlineStickyNote2 size={15} />;
  if (type === "preview_open") return <MdOutlineVisibility size={15} />;
  if (type === "email_sent") return meta?.channel === "whatsapp" ? <MdOutlineChat size={15} /> : <MdOutlineSend size={15} />;
  if (type === "reply") return <MdOutlineChat size={15} />;
  return <MdOutlineSwapHoriz size={15} />;
}
