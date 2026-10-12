import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc } from "@/components/legal/legal-doc";
import { LEGAL_IDENTITY, displayValue, legalHref } from "@convex/lib/legal";

export const metadata: Metadata = { title: "Termos de Uso · Osprano" };

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

export default function Page() {
  return (
    <LegalDoc slug="termos">
      <h2>1. Quem somos e o que é o Osprano</h2>
      <p>
        Estes Termos formam o contrato entre você (o cliente) e {displayValue(LEGAL_IDENTITY.legalName)}, empresa
        brasileira (ver <Link href={legalHref("empresa")}>Informações da empresa</Link>). O Osprano é uma ferramenta de
        prospecção: encontra negócios, mede a presença digital deles, gera um preview de site e redige abordagens.
      </p>

      <h2>2. Só para uso profissional (B2B)</h2>
      <p>
        Ao aceitar, você declara que contrata em nome de uma empresa ou como profissional, e não como consumidor. Por
        isso não há direito legal de desistência de consumidor. Política de reembolso comercial: [a definir com
        advogado].
      </p>

      <h2>3. Você é o responsável pelo contato que faz</h2>
      <p>
        O Osprano prepara a abordagem; você revisa e envia do seu próprio e-mail ou telefone. Você é o responsável pelo
        contato e o controlador dos dados dos prospects: responde pela base legal, pelas leis do país do destinatário e
        por respeitar descadastros e listas de bloqueio. Os guardrails do Osprano ajudam, mas não garantem conformidade
        legal.
      </p>

      <h2>4. Uso aceitável</h2>
      <ul>
        <li>Proibido enviar spam ou conteúdo enganoso ou ilegal.</li>
        <li>Proibido enviar e-mail a pessoa física em mercados que exigem consentimento prévio.</li>
        <li>Proibido usar listas compradas.</li>
        <li>Proibido revender dados do Google ou de outras fontes.</li>
        <li>Proibido extrair dados do app em massa.</li>
        <li>Proibido usar o conteúdo para treinar IA.</li>
      </ul>

      <h2>5. Conteúdo do Google Maps</h2>
      <p>
        O Osprano inclui recursos e conteúdo do Google Maps. O uso desses recursos está sujeito aos{" "}
        <a href="https://maps.google.com/help/terms_maps/" {...ext}>
          Termos Adicionais do Google Maps para Usuários Finais
        </a>{" "}
        e à{" "}
        <a href="https://policies.google.com/privacy" {...ext}>
          Política de Privacidade do Google
        </a>
        .
      </p>

      <h2>6. Fontes de dados</h2>
      <p>
        Os dados vêm de Google Places, Foursquare, OpenStreetMap e do site público de cada negócio. Não garantimos
        exatidão nem completude, e dados de terceiros podem mudar ou ficar indisponíveis.
      </p>

      <h2>7. Planos, cobrança e cancelamento</h2>
      <p>
        A assinatura é mensal, em euros, com renovação automática pelo Stripe. Preços e limites estão na{" "}
        <Link href="/#precos">página de preços</Link>; mudanças de preço são avisadas por e-mail com antecedência. Você
        pode cancelar a qualquer momento pelo portal de cobrança e o plano vale até o fim do período pago. Excluir a
        conta em Ajustes cancela a assinatura e apaga os dados.
      </p>

      <h2>8. Suspensão e encerramento</h2>
      <p>
        Podemos suspender a conta de imediato em caso de abuso ou reclamação de spam. Ao encerrar, os dados são apagados
        (ver <Link href={legalHref("privacidade")}>Privacidade</Link>).
      </p>

      <h2>9. Limite de responsabilidade</h2>
      <p>
        Nossa responsabilidade fica limitada ao valor que você pagou nos últimos 12 meses, sem excluir dolo, culpa grave
        nem o que a lei não permite excluir. Texto final: [a definir com advogado].
      </p>

      <h2>10. Lei aplicável e foro</h2>
      <p>[a definir com advogado]</p>

      <h2>11. Mudanças nestes termos</h2>
      <p>Quando houver uma versão nova, o app pede um novo aceite no seu próximo acesso.</p>

      <h2>12. Contato</h2>
      <p>Suporte: {displayValue(LEGAL_IDENTITY.supportEmail)}</p>
    </LegalDoc>
  );
}
