"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { MdArrowForward } from "react-icons/md";

const LINKS = [
  { href: "#como", label: "Como funciona" },
  { href: "#recursos", label: "Recursos" },
  { href: "#precos", label: "Preços" },
  { href: "#faq", label: "FAQ" },
];

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="var(--brand)" strokeWidth="1.5" opacity="0.4" />
      <circle cx="12" cy="12" r="5" stroke="var(--brand)" strokeWidth="1.5" opacity="0.7" />
      <circle cx="12" cy="12" r="1.8" fill="var(--brand)" />
    </svg>
  );
}

/**
 * Header da landing — sticky de verdade, com estado "scrolled" (vidro mais denso),
 * hover em pílula nos links e scrollspy marcando a seção ativa.
 * Motion imperativo no DOM (data-attributes + CSS), sem setState.
 */
export function LandingHeader({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // vidro mais denso + hairline quando a página rola
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const onScroll = () => {
      el.dataset.scrolled = window.scrollY > 8 ? "true" : "false";
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // scrollspy — destaca o link da seção em vista (e no clique, na hora)
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>("a[href^='#']"));
    const sections = links
      .map((a) => document.getElementById(a.hash.slice(1)))
      .filter((s): s is HTMLElement => s !== null);

    const setActive = (hash: string | null) => {
      for (const a of links) {
        if (hash && a.hash === hash) {
          a.dataset.active = "true";
          a.setAttribute("aria-current", "location");
        } else {
          delete a.dataset.active;
          a.removeAttribute("aria-current");
        }
      }
    };

    const inView = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inView.add(e.target.id);
          else inView.delete(e.target.id);
        }
        const current = sections.find((s) => inView.has(s.id));
        if (current) setActive(`#${current.id}`);
        else if (window.scrollY < 240) setActive(null);
        // entre seções sem link, mantém o último destaque — menos "piscada"
      },
      { rootMargin: "-30% 0px -55% 0px" },
    );
    sections.forEach((s) => io.observe(s));

    const onClick = (e: Event) => setActive((e.currentTarget as HTMLAnchorElement).hash);
    links.forEach((a) => a.addEventListener("click", onClick));
    return () => {
      io.disconnect();
      links.forEach((a) => a.removeEventListener("click", onClick));
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-30 border-b border-transparent bg-background/55 backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300 data-[scrolled=true]:border-border/60 data-[scrolled=true]:bg-background/85 data-[scrolled=true]:shadow-[var(--shadow-sm)] data-[scrolled=true]:backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <a href="#top" className="group flex items-center gap-2.5" aria-label="Osprano — voltar ao topo">
          <span className="transition-transform duration-500 group-hover:rotate-90">
            <Logo />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">Osprano</span>
        </a>

        <nav ref={navRef} className="hidden items-center gap-1 text-sm font-medium text-muted md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative rounded-full px-3.5 py-1.5 transition-colors duration-200 hover:bg-surface-2 hover:text-foreground data-[active=true]:bg-brand-soft data-[active=true]:text-brand"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <Link
          href={ctaHref}
          className="group inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg shadow-[var(--shadow-sm)] transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-0.5 hover:bg-brand-hover hover:shadow-[var(--shadow-md)]"
        >
          {ctaLabel}
          <MdArrowForward
            size={16}
            className="-ml-4 w-0 opacity-0 transition-[margin,width,opacity] duration-300 group-hover:-ml-0.5 group-hover:w-4 group-hover:opacity-100"
          />
        </Link>
      </div>
    </header>
  );
}
