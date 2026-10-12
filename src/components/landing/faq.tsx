"use client";

import { useState } from "react";
import { MdKeyboardArrowDown } from "react-icons/md";

const QA: { q: string; a: string }[] = [
  {
    q: "Como o Osprano acha a dor de um negócio?",
    a: "Ele busca negócios locais por país, cidade e categoria e calcula o Digital Presence Score de cada um — sem site, só rede social, site sem HTTPS, não-mobile, lento, perfil incompleto. Quanto maior a dor, mais quente o lead.",
  },
  {
    q: "O que significa \"compliant by design\"?",
    a: "O Osprano só libera abordagem por email nos mercados onde isso é legal (opt-out: UK, Holanda, Irlanda, Suécia, Noruega) e só para entidades incorporadas / caixas de função. Cada email sai com identificação e opt-out. Nada de cold WhatsApp na UE, que é ilegal.",
  },
  {
    q: "Quem escreve a abordagem?",
    a: "A IA. Ela lê os sinais de dor do lead e escreve um email personalizado citando exatamente o problema, com o link do preview rastreado. Você revisa e envia em um clique.",
  },
  {
    q: "Como eu sei que o cliente viu a proposta?",
    a: "Cada preview tem um link único rastreado. Quando o prospect abre, a abertura aparece no painel e o lead avança no funil: é o melhor momento pra fechar.",
  },
  {
    q: "Como funciona a receita recorrente?",
    a: "Em vez de vender o site uma vez, você oferece site + manutenção mensal. O Osprano publica o site num endereço do Osprano, e o que você cobra do seu cliente todo mês é com você.",
  },
  {
    q: "Preciso saber programar?",
    a: "Não. Você busca, gera o preview, a IA escreve a abordagem e você fecha no CRM. Tudo dentro do painel, sem instalar nada.",
  },
];

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {QA.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={item.q}
            className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow-sm)]"
          >
            <button
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-semibold text-foreground">{item.q}</span>
              <MdKeyboardArrowDown
                size={22}
                className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{item.a}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
