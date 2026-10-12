/**
 * Regras de https://developers.google.com/maps/documentation/places/web-service/policies :
 * texto sem tradução, sem quebra, 12 a 16 px, #5E5E5E (ou branco no tema escuro, contraste 4,5:1);
 * dentro do mesmo contêiner do conteúdo, no topo ou na base; nunca esconder.
 */
export function GoogleAttribution({ className }: { className?: string }) {
  return (
    <span
      translate="no"
      className={`whitespace-nowrap text-[12px] leading-none text-[#5E5E5E] [:root[data-theme=dark]_&]:text-white ${className ?? ""}`}
      style={{ fontFamily: "Roboto, Arial, sans-serif", fontWeight: 400 }}
    >
      Google Maps
    </span>
  );
}
