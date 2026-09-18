"use client";

import { MdAdd, MdClose } from "react-icons/md";
import { LIMITS, type SiteContent, type SiteItem } from "@convex/lib/site";
import { TEMPLATES } from "@/components/site-templates";
import { Block, inputCls, smallBtnCls } from "./fields";

/**
 * Bloco Itens (spec 3.1): rótulo por modelo (Cardápio / Serviços / Destaques),
 * até 12 linhas com nome, preço (texto: moeda e formato são dela) e nota.
 * A chave é o índice: a lista é curta e os campos são controlados, então
 * remover uma linha não deixa valor preso.
 */
export function ItemsBlock({
  draft,
  onAdd,
  onChange,
  onRemove,
}: {
  draft: SiteContent;
  onAdd: () => void;
  onChange: (index: number, patch: Partial<SiteItem>) => void;
  onRemove: (index: number) => void;
}) {
  const items = draft.items ?? [];
  const label = TEMPLATES[draft.template].itemsLabel;
  return (
    <Block title={label} hint={`${items.length}/${LIMITS.items}`}>
      {items.length === 0 && (
        <p className="mb-3 text-xs text-muted">Sem itens a seção não aparece no site.</p>
      )}
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-[1fr_88px_auto] gap-2 rounded-lg bg-surface-2 p-2">
            <input
              value={it.name}
              maxLength={LIMITS.itemName}
              placeholder="Nome"
              aria-label={`Item ${i + 1}: nome`}
              onChange={(e) => onChange(i, { name: e.target.value })}
              className={inputCls}
            />
            <input
              value={it.price ?? ""}
              maxLength={LIMITS.itemPrice}
              placeholder="Preço"
              aria-label={`Item ${i + 1}: preço`}
              onChange={(e) => onChange(i, { price: e.target.value })}
              className={inputCls}
            />
            <button
              type="button"
              aria-label={`Remover item ${i + 1}`}
              onClick={() => onRemove(i)}
              className="rounded-lg p-2 text-muted hover:bg-surface-solid hover:text-foreground"
            >
              <MdClose size={16} />
            </button>
            <input
              value={it.note ?? ""}
              maxLength={LIMITS.itemNote}
              placeholder="Nota (opcional)"
              aria-label={`Item ${i + 1}: nota`}
              onChange={(e) => onChange(i, { note: e.target.value })}
              className={`${inputCls} col-span-3`}
            />
          </div>
        ))}
      </div>
      <button type="button" onClick={onAdd} disabled={items.length >= LIMITS.items} className={`${smallBtnCls} mt-3`}>
        <MdAdd size={14} />
        Adicionar item
      </button>
    </Block>
  );
}
