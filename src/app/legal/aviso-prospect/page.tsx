import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc } from "@/components/legal/legal-doc";
import { LEGAL_IDENTITY, displayValue, legalHref } from "@convex/lib/legal";

export const metadata: Metadata = { title: "Aviso a negócios contatados · Osprano" };

export default function Page() {
  return (
    <LegalDoc slug="aviso-prospect">
      <p>Este aviso é para o negócio que recebeu um contato feito com o Osprano.</p>
      <h2>Quem fez o contato</h2>
      <p>
        O cliente do Osprano que te escreveu ou ligou é o responsável pelo contato e o controlador dos seus dados. O
        Osprano é a ferramenta e trata os dados em nome dele.
      </p>
      <h2>De onde vieram os dados</h2>
      <p>
        De fontes públicas: Google Maps, Foursquare, OpenStreetMap e o site do próprio negócio. Só dados de contato comercial.
      </p>
      <h2>Para quê</h2>
      <p>
        Oferecer serviços de presença digital ao negócio. Base: legítimo interesse do cliente, GDPR art. 6(1)(f).
      </p>
      <h2>Seus direitos</h2>
      <ul>
        <li>Informação sobre o tratamento, conforme o art. 14 do GDPR.</li>
        <li>Oposição ao marketing direto a qualquer momento (art. 21), sempre atendida.</li>
        <li>Acesso, correção e exclusão dos seus dados.</li>
      </ul>
      <h2>Como parar de receber</h2>
      <p>
        Use o link de descadastro presente em todo e-mail, ou escreva para {displayValue(LEGAL_IDENTITY.privacyEmail)}.
        Registramos o pedido e avisamos o cliente que fez o contato.
      </p>
      <p>
        Mais detalhes na <Link href={legalHref("privacidade")}>Política de Privacidade</Link>.
      </p>
    </LegalDoc>
  );
}
