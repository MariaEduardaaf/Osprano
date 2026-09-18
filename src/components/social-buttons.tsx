import { MdOutlineCameraAlt, MdOutlineFacebook } from "react-icons/md";
import type { Doc } from "@convex/_generated/dataModel";
import { socialLinks } from "@/lib/lead-links";

type Lead = Pick<Doc<"leads">, "instagram" | "facebook" | "name" | "city">;

/**
 * Instagram e Facebook do lead, lado a lado com WhatTheyHaveButton. Perfil
 * salvo → abre direto; sem perfil → busca pelo nome (Facebook soma a cidade)
 * para ela achar e colar de volta no lead (LeadInfoFields, aba Informações).
 */
export function SocialButtons({ lead, variant = "compact" }: { lead: Lead; variant?: "compact" | "primary" }) {
  const { instagram, facebook } = socialLinks(lead);
  const primary = variant === "primary";
  const cls = primary
    ? "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-strong px-3 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    : "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-2";
  const iconSize = primary ? 16 : 14;

  return (
    <>
      <a
        href={instagram.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title={instagram.label === "Instagram" ? "Abrir perfil" : "Buscar o perfil e colar no lead"}
        className={cls}
      >
        <MdOutlineCameraAlt size={iconSize} />
        {!primary && instagram.label}
      </a>
      <a
        href={facebook.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title={facebook.label === "Facebook" ? "Abrir perfil" : "Buscar o perfil e colar no lead"}
        className={cls}
      >
        <MdOutlineFacebook size={iconSize} />
        {!primary && facebook.label}
      </a>
    </>
  );
}
