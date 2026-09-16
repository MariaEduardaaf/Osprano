"use client";

import { useEffect, useState } from "react";

/**
 * "Agora" em estado, atualizado a cada `intervalMs` (60 s): a faixa Hoje e o "parado" viram
 * sozinhos à meia-noite. É o ÚNICO lugar em que `Date.now()` roda perto de um render: o React
 * Compiler (react-hooks/purity) recusa `Date.now()` no corpo de um componente, e o inicializador
 * preguiçoso do useState é o caminho permitido.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
