"use client";

import type { SiteContent } from "@convex/lib/site";
import type { TextKey } from "@/lib/site-editor";
import { Block, Field, inputCls } from "./fields";

/**
 * Bloco Contato (spec 3.1). Pré-preenchido com o que veio do lead NA CRIAÇÃO
 * do conteúdo; depois, é o conteúdo salvo. WhatsApp só dígitos com DDI (o
 * servidor recusa outra coisa); Instagram sem @ (o @ fica fora do campo).
 */
export function ContactBlock({
  draft,
  onText,
}: {
  draft: SiteContent;
  onText: (key: TextKey, value: string) => void;
}) {
  const v = (k: TextKey) => draft[k] ?? "";
  return (
    <Block title="Contato" hint="Só o preenchido aparece">
      <div className="space-y-3">
        <Field label="Endereço" hint="Com endereço o site mostra o mapa">
          <input value={v("address")} onChange={(e) => onText("address", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Telefone">
          <input
            type="tel"
            value={v("phone")}
            onChange={(e) => onText("phone", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="WhatsApp" hint="Só dígitos com DDI, ex. 351912345678">
          <input
            inputMode="numeric"
            value={v("whatsapp")}
            placeholder="Vazio: sem botão de WhatsApp"
            onChange={(e) => onText("whatsapp", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Instagram" hint="Sem @">
          <span className="flex items-center gap-1.5">
            <span className="text-sm text-muted">@</span>
            <input value={v("instagram")} onChange={(e) => onText("instagram", e.target.value)} className={inputCls} />
          </span>
        </Field>
        <Field label="E-mail">
          <input
            type="email"
            value={v("email")}
            onChange={(e) => onText("email", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>
    </Block>
  );
}
