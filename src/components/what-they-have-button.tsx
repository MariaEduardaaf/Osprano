import { MdOpenInNew } from "react-icons/md";
import type { Doc } from "@convex/_generated/dataModel";
import { whatTheyHaveLink } from "@/lib/lead-links";

type Lead = Pick<
  Doc<"leads">,
  "website" | "source" | "placeId" | "name" | "address" | "city" | "countryCode"
>;

/**
 * Abre, numa aba nova, o que o lead já tem online hoje: o site dele (se
 * tiver), a ficha do Google Maps (Places com placeId), ou uma busca no Maps
 * por nome + endereço/cidade + país (OSM/manual sem site).
 */
export function WhatTheyHaveButton({
  lead,
  variant = "compact",
}: {
  lead: Lead;
  variant?: "compact" | "primary";
}) {
  const { href, label } = whatTheyHaveLink(lead);
  const primary = variant === "primary";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={
        primary
          ? "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-strong px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          : "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-2"
      }
    >
      <MdOpenInNew size={primary ? 16 : 14} />
      {label}
    </a>
  );
}
