import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc } from "@/components/legal/legal-doc";
import { LEGAL_IDENTITY, displayValue, legalHref } from "@convex/lib/legal";

export const metadata: Metadata = { title: "Acordo de Tratamento de Dados (DPA) · Osprano" };

export default function Page() {
  return (
    <LegalDoc slug="dpa">
      <p>Este acordo atende ao GDPR art. 28(3) e é aceito junto com os Termos no primeiro acesso.</p>

      <h2>1. Partes e papéis</h2>
      <p>
        O cliente é o controlador. {displayValue(LEGAL_IDENTITY.legalName)} é a operadora (processor) dos dados de
        prospects no workspace do cliente.
      </p>

      <h2>2. Objeto, natureza e finalidade</h2>
      <p>
        Encontrar negócios, avaliar a presença digital, gerar previews e redigir abordagens, sempre por iniciativa do
        cliente.
      </p>

      <h2>3. Tipos de dados e titulares</h2>
      <p>
        Dados de contato comercial de negócios (nome, endereço, telefone, e-mail, site, redes, avaliações) e, quando
        houver, de pessoas que os representam.
      </p>

      <h2>4. Duração</h2>
      <p>Enquanto durar a conta.</p>

      <h2>5. Instruções</h2>
      <p>A operadora só trata os dados conforme as instruções documentadas do cliente. O uso do app é a instrução.</p>

      <h2>6. Confidencialidade e segurança (art. 32)</h2>
      <p>
        Acesso restrito, dados separados por conta e transmissão cifrada (HTTPS). Detalhes das medidas: [a confirmar].
      </p>

      <h2>7. Subprocessadores</h2>
      <p>
        O cliente dá autorização geral. A <Link href={legalHref("subprocessadores")}>lista de subprocessadores</Link> é
        pública. Avisamos por e-mail antes de incluir um novo, e o cliente pode se opor.
      </p>

      <h2>8. Assistência ao controlador</h2>
      <p>
        Ajudamos com pedidos de titulares, avisamos violações de dados sem demora indevida e apoiamos avaliações de
        impacto.
      </p>

      <h2>9. Fim do contrato</h2>
      <p>
        Ao apagar a conta, os dados são apagados. Devolução ou exportação dos dados antes disso: [a definir com
        advogado].
      </p>

      <h2>10. Auditoria</h2>
      <p>
        Fornecemos as informações necessárias para demonstrar conformidade, mediante pedido por e-mail para{" "}
        {displayValue(LEGAL_IDENTITY.privacyEmail)}.
      </p>

      <h2>11. Transferências internacionais</h2>
      <p>[a definir com advogado]</p>

      <h2>12. Legítimo interesse</h2>
      <p>
        O cliente faz a própria avaliação de legítimo interesse (LIA) antes de prospectar. O Osprano bloqueia e-mail a
        pessoa física em mercados que exigem consentimento.
      </p>
    </LegalDoc>
  );
}
