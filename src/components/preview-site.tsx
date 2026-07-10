export interface PreviewContent {
  name: string;
  category: string | null;
  city: string | null;
  phone: string | null;
  rating: number | null;
  reviewsCount: number | null;
  countryCode: string;
}

function waLink(phone: string): string {
  return `https://wa.me/${phone.replace(/[^0-9]/g, "")}`;
}

/**
 * The generated preview site the prospect sees — a clean, mobile-first one-pager
 * built from the business's own public data. Self-contained look (its own
 * palette), independent of the app chrome.
 */
export function PreviewSite({ content }: { content: PreviewContent }) {
  const { name, category, city, phone, rating, reviewsCount } = content;
  return (
    <div className="min-h-dvh bg-white text-neutral-900">
      {/* Top bar */}
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <span className="text-lg font-bold tracking-tight">{name}</span>
        {phone && (
          <a
            href={`tel:${phone}`}
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Ligar
          </a>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-700 to-neutral-900" />
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-white">
          {category && (
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
              {category.replace(/_/g, " ")}
              {city ? ` · ${city}` : ""}
            </span>
          )}
          <h1 className="mt-4 text-balance text-5xl font-bold leading-tight sm:text-6xl">{name}</h1>
          <p className="mt-5 max-w-lg text-lg text-emerald-50/90">
            Bem-vindo. Estamos prontos para te atender — reserve, ligue ou passe por aqui.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {phone && (
              <>
                <a
                  href={`tel:${phone}`}
                  className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-neutral-900"
                >
                  Ligar agora
                </a>
                <a
                  href={waLink(phone)}
                  className="rounded-lg border border-white/40 px-6 py-3 text-sm font-semibold text-white"
                >
                  WhatsApp
                </a>
              </>
            )}
          </div>
          {rating != null && (
            <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur">
              <span className="text-amber-300">★</span>
              <span className="font-semibold">{rating.toFixed(1)}</span>
              {reviewsCount != null && (
                <span className="text-emerald-100/80">· {reviewsCount} avaliações</span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* About + contact */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">Sobre</h2>
            <p className="mt-3 text-neutral-600">
              {name} é referência {category ? `em ${category.replace(/_/g, " ")}` : "no bairro"}
              {city ? `, em ${city}` : ""}. Qualidade, atendimento próximo e a confiança de quem já
              conhece.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Contato</h2>
            <ul className="mt-3 space-y-2 text-neutral-600">
              {phone && (
                <li>
                  <span className="font-medium text-neutral-900">Telefone:</span> {phone}
                </li>
              )}
              {city && (
                <li>
                  <span className="font-medium text-neutral-900">Onde:</span> {city}
                </li>
              )}
              <li>
                <span className="font-medium text-neutral-900">Horário:</span> Seg–Sáb, 9h–19h
              </li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-200 py-8 text-center text-xs text-neutral-400">
        Prévia de site — {name}
      </footer>
    </div>
  );
}
