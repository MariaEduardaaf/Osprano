"use client";

import { MdOutlineLightMode, MdOutlineDarkMode } from "react-icons/md";

/**
 * Alterna claro/escuro via `data-theme` no <html> + localStorage.
 * O ícone/label é trocado por CSS (classes .theme-to-light / .theme-to-dark),
 * então não há estado React nem flash de hidratação.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* localStorage indisponível — ok */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Alternar tema claro/escuro"
      title="Alternar tema"
      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      <span className="theme-to-light">
        <MdOutlineLightMode size={19} />
      </span>
      <span className="theme-to-dark">
        <MdOutlineDarkMode size={19} />
      </span>
    </button>
  );
}
