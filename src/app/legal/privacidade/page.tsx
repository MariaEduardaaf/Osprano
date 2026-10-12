import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc } from "@/components/legal/legal-doc";
import { LEGAL_IDENTITY, displayValue, legalHref } from "@convex/lib/legal";

export const metadata: Metadata = { title: "Política de Privacidade · Osprano" };

export default function Page() {
  return (
    <LegalDoc slug="privacidade">
      <h2>1. Quem trata seus dados</h2>
      <p>
        {displayValue(LEGAL_IDENTITY.legalName)}, empresa brasileira. Contato de privacidade:{" "}
        {displayValue(LEGAL_IDENTITY.privacyEmail)}.
      </p>
      {LEGAL_IDENTITY.euRepresentative !== "" && (
        <p>Representante na UE (GDPR art. 27): {displayValue(LEGAL_IDENTITY.euRepresentative)}</p>
      )}
      <p>A necessidade de representante na UE (GDPR art. 27) está [a confirmar] com advogado.</p>

      <h2>2. Leis aplicáveis</h2>
      <p>
        GDPR, para clientes e prospects na União Europeia (art. 3(2)), e LGPD, porque a empresa é brasileira.
      </p>

      <h2>3. Dados dos clientes do Osprano (somos controladores)</h2>
      <p>
        Dados de conta e login (Clerk), de cobrança (Stripe; não guardamos número de cartão) e de uso do plano. Usamos
        para prestar o serviço e cobrar. Bases: execução do contrato e obrigação legal (faturas).
      </p>

      <h2>4. Dados dos negócios prospectados (somos operadores)</h2>
      <p>
        São dados públicos de contato comercial, buscados a pedido do cliente. O cliente é o controlador; veja o{" "}
        <Link href={legalHref("dpa")}>DPA</Link> e o{" "}
        <Link href={legalHref("aviso-prospect")}>Aviso a negócios contatados</Link>.
      </p>

      <h2>5. Com quem compartilhamos</h2>
      <p>
        Veja a <Link href={legalHref("subprocessadores")}>lista de subprocessadores</Link>. Não vendemos dados.
      </p>

      <h2>6. Transferência internacional</h2>
      <p>
        Dados de pessoas na UE são tratados pela empresa no Brasil e por fornecedores fora da UE. Mecanismo de
        transferência (cláusulas-padrão ou outro): [a definir com advogado].
      </p>

      <h2>7. Por quanto tempo guardamos</h2>
      <p>
        Enquanto a conta existir. Ao apagar a conta em Ajustes, os dados do workspace são apagados na hora. As faturas
        ficam no Stripe pelo prazo fiscal. Backups dos fornecedores seguem o prazo deles [a confirmar].
      </p>

      <h2>8. Seus direitos</h2>
      <p>
        Acesso, correção, exclusão, oposição, portabilidade e revisão. Peça por e-mail para{" "}
        {displayValue(LEGAL_IDENTITY.privacyEmail)}; respondemos em até 1 mês. Você também pode reclamar à autoridade de
        proteção de dados do seu país (na UE) ou à ANPD (Brasil).
      </p>

      <h2>9. Cookies</h2>
      <p>
        Veja a <Link href={legalHref("cookies")}>Política de Cookies</Link>.
      </p>

      <h2>10. Mudanças</h2>
      <p>Quando houver uma versão nova, o app pede um novo aceite.</p>
    </LegalDoc>
  );
}
