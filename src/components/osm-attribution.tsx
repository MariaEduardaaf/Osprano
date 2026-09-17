/**
 * Atribuição exigida pela ODbL: aparece em toda tela que mostra dado vindo do
 * OpenStreetMap (Leads e CRM). Quem renderiza decide QUANDO (há lead com
 * source === "osm"?); aqui é só o texto e o link.
 */
export function OsmAttribution({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[11px] text-faint ${className}`}>
      Dados ©{" "}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-border underline-offset-2 hover:text-muted"
      >
        OpenStreetMap contributors
      </a>{" "}
      (ODbL)
    </p>
  );
}
