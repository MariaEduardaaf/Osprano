import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc } from "@/components/legal/legal-doc";
import { LEGAL_IDENTITY, PLACEHOLDER, displayValue } from "@convex/lib/legal";

export const metadata: Metadata = { title: "Informações da empresa · Osprano" };

function Mail({ value }: { value: string }) {
  if (value === PLACEHOLDER) return <>{displayValue(value)}</>;
  return <a href={`mailto:${value}`}>{value}</a>;
}

export default function Page() {
  const i = LEGAL_IDENTITY;
  return (
    <LegalDoc slug="empresa">
      <p>
        O Osprano é um serviço de software por assinatura oferecido pela empresa abaixo, só para empresas e profissionais.
      </p>
      <table>
        <tbody>
          <tr><th scope="row">Marca</th><td>{i.brand}</td></tr>
          <tr><th scope="row">Razão social</th><td>{displayValue(i.legalName)}</td></tr>
          <tr><th scope="row">{i.taxIdLabel}</th><td>{displayValue(i.taxId)}</td></tr>
          <tr><th scope="row">Endereço</th><td>{displayValue(i.address)}</td></tr>
          <tr><th scope="row">País</th><td>{displayValue(i.country)}</td></tr>
          <tr><th scope="row">E-mail de contato</th><td><Mail value={i.supportEmail} /></td></tr>
          <tr><th scope="row">E-mail de privacidade</th><td><Mail value={i.privacyEmail} /></td></tr>
          {i.euRepresentative !== "" && (
            <tr><th scope="row">Representante na UE (GDPR art. 27)</th><td>{displayValue(i.euRepresentative)}</td></tr>
          )}
        </tbody>
      </table>
      <h2>Preços</h2>
      <p>
        Os preços dos planos aparecem na <Link href="/#precos">página inicial</Link>, em euros, por mês.
      </p>
      <h2>Contato</h2>
      <p>
        Para suporte e dúvidas: <Mail value={i.supportEmail} />.
      </p>
    </LegalDoc>
  );
}
