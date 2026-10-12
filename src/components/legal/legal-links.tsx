import Link from "next/link";
import { LEGAL_DOCS, LEGAL_IDENTITY, PLACEHOLDER, displayValue, legalHref, legalPlaceholders } from "@convex/lib/legal";

/** Faixa pública enquanto houver dado da empresa por preencher. Nunca lista os campos. */
export function PlaceholderNotice({ className }: { className?: string }) {
  if (legalPlaceholders().length === 0) return null;
  return (
    <p
      role="note"
      className={`rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted ${className ?? ""}`}
    >
      Alguns dados da empresa ainda estão sendo preenchidos nesta página.
    </p>
  );
}

function Email({ value }: { value: string }) {
  if (value === PLACEHOLDER) return <span>{displayValue(value)}</span>;
  return (
    <a href={`mailto:${value}`} className="underline hover:text-foreground">
      {value}
    </a>
  );
}

export function LegalLinks({ inline = false, className }: { inline?: boolean; className?: string }) {
  const { supportEmail, privacyEmail } = LEGAL_IDENTITY;
  const showPrivacy = privacyEmail !== supportEmail && privacyEmail !== PLACEHOLDER;
  const support = (
    <>
      Suporte e privacidade: <Email value={supportEmail} />
      {showPrivacy && (
        <>
          {" · "}
          <Email value={privacyEmail} />
        </>
      )}
    </>
  );

  if (inline) {
    return (
      <div className={className}>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {LEGAL_DOCS.map((d) => (
            <Link key={d.slug} href={legalHref(d.slug)} className="hover:text-foreground">
              {d.title}
            </Link>
          ))}
          <span>{support}</span>
        </nav>
        <PlaceholderNotice className="mt-3" />
      </div>
    );
  }

  return (
    <div className={className}>
      <nav aria-label="Legal">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">Legal</div>
        <ul className="mt-4 space-y-2.5 text-sm">
          {LEGAL_DOCS.map((d) => (
            <li key={d.slug}>
              <Link href={legalHref(d.slug)} className="text-muted transition-colors hover:text-foreground">
                {d.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-4 text-xs text-muted">{support}</p>
      <PlaceholderNotice className="mt-3" />
    </div>
  );
}
