import type { GooglePlaceLite } from "@convex/lib/placesFields";
import { GoogleAttribution } from "./google-attribution";

/**
 * ÚNICO lugar que renderiza conteúdo do Google. Somente leitura: sem copiar, sem 'usar este dado',
 * sem preencher campo. Nunca na mesma tela de um mapa (site-templates/MapEmbed).
 */
export function GoogleCard({
  place,
  loading,
  gone,
  error,
  compact,
  className = "",
}: {
  place?: GooglePlaceLite;
  loading?: boolean;
  gone?: boolean;
  error?: string | null;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface-solid p-3 text-sm ${className}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <GoogleAttribution />
        <span className="text-[11px] text-faint">ao vivo, não salvo</span>
      </div>
      {loading && <p className="text-xs text-muted">Buscando no Google Maps…</p>}
      {gone && <p className="text-xs text-muted">Este lugar não existe mais no Google Maps.</p>}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      {place && (
        <div className="space-y-1">
          {place.name && <p className="font-semibold">{place.name}</p>}
          {place.address && <p className="text-muted">{place.address}</p>}
          {place.phone && (
            <p>
              <a href={`tel:${place.phone.replace(/[^+0-9]/g, "")}`} className="text-brand hover:underline">
                {place.phone}
              </a>
            </p>
          )}
          {!compact && (
            <>
              {place.website && (
                <p>
                  <a href={place.website} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                    site
                  </a>
                </p>
              )}
              {place.rating != null && (
                <p className="text-muted">
                  ★ {place.rating}
                  {place.reviewsCount != null ? ` · ${place.reviewsCount} avaliações` : ""}
                </p>
              )}
              {place.businessStatus && place.businessStatus !== "OPERATIONAL" && (
                <p className="text-xs text-warm">Fechado segundo o Google</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
