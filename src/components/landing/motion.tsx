"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Sistema de motion da landing — dependency-free e imperativo no DOM
 * (nada de setState em efeito: compatível com as regras do React Compiler).
 * Todo o visual dos reveals vive no CSS ([data-reveal]); aqui só marcamos
 * data-inview quando o elemento entra na viewport.
 */

type RevealVariant = "up" | "left" | "right" | "scale" | "none";

export function Reveal({
  children,
  variant = "up",
  delay = 0,
  className = "",
  once = true,
}: {
  children: ReactNode;
  variant?: RevealVariant;
  /** atraso em ms (vira transition-delay via CSS var) */
  delay?: number;
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.inview = "true";
          if (once) io.disconnect();
        } else if (!once) {
          delete el.dataset.inview;
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      data-reveal={variant}
      className={className}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/** Número que conta até `end` quando entra na viewport (textContent via rAF — sem re-render). */
export function CountUp({
  end,
  duration = 1600,
  prefix = "",
  suffix = "",
  className = "",
}: {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const done = `${prefix}${end}${suffix}`;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = done;
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = `${prefix}${Math.round(eased * end)}${suffix}`;
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [end, duration, prefix, suffix]);

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}

/** Tilt 3D com glare no hover — desativado em pointer coarse e reduced motion. */
export function Tilt({
  children,
  maxTilt = 7,
  className = "",
}: {
  children: ReactNode;
  maxTilt?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const glare = el.querySelector<HTMLElement>("[data-tilt-glare]");

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(1100px) rotateX(${(-py * maxTilt).toFixed(2)}deg) rotateY(${(px * maxTilt).toFixed(2)}deg) scale3d(1.012, 1.012, 1)`;
      if (glare) {
        glare.style.opacity = "1";
        glare.style.background = `radial-gradient(560px circle at ${((px + 0.5) * 100).toFixed(1)}% ${((py + 0.5) * 100).toFixed(1)}%, color-mix(in srgb, var(--brand) 14%, transparent), transparent 65%)`;
      }
    };
    const onEnter = () => {
      el.style.transition = "transform 120ms ease-out";
    };
    const onLeave = () => {
      el.style.transition = "transform 480ms cubic-bezier(0.22, 1, 0.36, 1)";
      el.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
      if (glare) glare.style.opacity = "0";
    };

    el.style.willChange = "transform";
    el.style.transformStyle = "preserve-3d";
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [maxTilt]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div
        data-tilt-glare
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300"
      />
      {children}
    </div>
  );
}
