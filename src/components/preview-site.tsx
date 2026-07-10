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
 * The generated preview site the prospect sees — a polished, editorial one-pager
 * built from the business's public data. Fully self-contained palette + type,
 * independent of the app chrome.
 */
export function PreviewSite({ content }: { content: PreviewContent }) {
  const { name, category, city, phone, rating, reviewsCount } = content;
  const cat = category ? category.replace(/_/g, " ") : null;

  return (
    <div className="min-h-dvh bg-[#0e0d0a] text-[#f4f1e9] [font-family:var(--font-geist-sans)]">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0e0d0a]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="[font-family:var(--font-bricolage)] text-lg font-bold tracking-tight">
            {name}
          </span>
          {phone && (
            <a
              href={`tel:${phone}`}
              className="rounded-full bg-[#f4f1e9] px-4 py-2 text-sm font-semibold text-[#0e0d0a] transition-transform hover:scale-105"
            >
              Ligar
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 60% at 15% 0%, rgba(196,138,46,.26), transparent 55%), radial-gradient(70% 70% at 100% 30%, rgba(90,129,250,.34), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-20 sm:pt-28">
          {cat && (
            <span className="[font-family:var(--font-geist-mono)] text-xs font-medium uppercase tracking-[0.22em] text-[#e0b968]">
              {cat}
              {city ? ` · ${city}` : ""}
            </span>
          )}
          <h1 className="mt-5 max-w-3xl text-balance [font-family:var(--font-bricolage)] text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl">
            {name}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#f4f1e9]/70">
            Tradição, atendimento próximo e a confiança de quem já conhece. Reserve, ligue ou passe
            para conhecer.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            {phone && (
              <>
                <a
                  href={`tel:${phone}`}
                  className="rounded-xl bg-[#f4f1e9] px-7 py-3.5 text-sm font-semibold text-[#0e0d0a] transition-transform hover:scale-[1.03]"
                >
                  Ligar agora
                </a>
                <a
                  href={waLink(phone)}
                  className="rounded-xl border border-white/25 px-7 py-3.5 text-sm font-semibold text-[#f4f1e9] transition-colors hover:bg-white/10"
                >
                  WhatsApp
                </a>
              </>
            )}
            {rating != null && (
              <div className="ml-1 inline-flex items-center gap-2 text-sm">
                <span className="text-[#e0b968]">
                  {"★".repeat(Math.round(rating))}
                  <span className="text-white/20">{"★".repeat(5 - Math.round(rating))}</span>
                </span>
                <span className="font-semibold">{rating.toFixed(1)}</span>
                {reviewsCount != null && (
                  <span className="text-[#f4f1e9]/50">· {reviewsCount} avaliações</span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="border-t border-white/10 bg-[#141209]">
        <div className="mx-auto grid max-w-5xl gap-px overflow-hidden px-6 py-16 sm:grid-cols-3 sm:gap-0 sm:px-0">
          {[
            { t: "Qualidade", d: "Feito com cuidado, do começo ao fim." },
            { t: "Atendimento", d: "Perto de você, do jeito que gosta." },
            { t: "No coração da cidade", d: city ? `Bem no centro de ${city}.` : "Fácil de chegar." },
          ].map((f, i) => (
            <div key={f.t} className={`px-2 py-6 sm:px-10 ${i > 0 ? "sm:border-l sm:border-white/10" : ""}`}>
              <div className="[font-family:var(--font-geist-mono)] text-xs text-[#e0b968]">
                0{i + 1}
              </div>
              <h3 className="mt-3 [font-family:var(--font-bricolage)] text-xl font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#f4f1e9]/60">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid gap-12 sm:grid-cols-2">
          <div>
            <h2 className="[font-family:var(--font-bricolage)] text-3xl font-bold tracking-tight">
              Venha nos visitar
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-[#f4f1e9]/65">
              {name} é referência {cat ? `em ${cat}` : "no bairro"}
              {city ? `, em ${city}` : ""}. Estamos prontos para te receber.
            </p>
          </div>
          <dl className="space-y-4 text-sm">
            {phone && (
              <div className="flex justify-between border-b border-white/10 pb-4">
                <dt className="text-[#f4f1e9]/50">Telefone</dt>
                <dd className="font-medium">{phone}</dd>
              </div>
            )}
            {city && (
              <div className="flex justify-between border-b border-white/10 pb-4">
                <dt className="text-[#f4f1e9]/50">Onde</dt>
                <dd className="font-medium">{city}</dd>
              </div>
            )}
            <div className="flex justify-between border-b border-white/10 pb-4">
              <dt className="text-[#f4f1e9]/50">Horário</dt>
              <dd className="font-medium">Seg–Sáb · 9h–19h</dd>
            </div>
          </dl>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center [font-family:var(--font-geist-mono)] text-[11px] uppercase tracking-widest text-[#f4f1e9]/35">
        {name}
      </footer>
    </div>
  );
}
