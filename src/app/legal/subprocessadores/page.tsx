import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc } from "@/components/legal/legal-doc";
import { legalHref } from "@convex/lib/legal";

export const metadata: Metadata = { title: "Subprocessadores · Osprano" };

const TBD = "[a confirmar]";
const ROWS: { name: string; why: string; data: string; note?: string }[] = [
  { name: "Convex", why: "Banco de dados e funções do servidor", data: "Todos os dados da conta e do workspace" },
  { name: "Clerk", why: "Login e gestão de usuários", data: "Nome, e-mail e dados de sessão de quem usa o Osprano" },
  { name: "Vercel", why: "Hospedagem do site, do app e das páginas de preview e sites publicados", data: "Tráfego e conteúdo das páginas servidas" },
  { name: "Stripe", why: "Cobrança das assinaturas", data: "Dados de cobrança do cliente" },
  { name: "Anthropic", why: "IA que redige e-mails e roteiros de ligação", data: "Dados públicos do negócio prospectado" },
  { name: "Resend", why: "E-mail transacional e envio opcional", data: "E-mail do destinatário e conteúdo da mensagem" },
  { name: "Google (Places API e PageSpeed Insights)", why: "Busca de negócios e análise de desempenho de sites", data: "Consultas de busca e endereços de sites públicos", note: "Google atua como controlador independente dos dados do Google Maps." },
  { name: "Foursquare (Places API)", why: "Busca de negócios", data: "Consultas de busca" },
  { name: "OpenStreetMap (via Overpass)", why: "Dados abertos de negócios (licença ODbL)", data: "Consultas de busca" },
  { name: "Meta / WhatsApp Business", why: "Follow-up por WhatsApp", data: "Número e mensagem do contato", note: "Só quando o prospect deu opt-in." },
];

export default function Page() {
  return (
    <LegalDoc slug="subprocessadores">
      <p>
        Estes fornecedores tratam dados para que o Osprano funcione. Avisamos por e-mail quem tem conta, com antecedência,
        antes de incluir um novo subprocessador; o cliente pode se opor nos termos do <Link href={legalHref("dpa")}>DPA</Link>.
      </p>
      <table>
        <thead>
          <tr><th>Fornecedor</th><th>Para quê</th><th>Dados envolvidos</th><th>Local/transferência</th></tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td>{r.why}</td>
              <td>
                {r.data}
                {r.note && <> ({r.note})</>}
              </td>
              <td>{TBD}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </LegalDoc>
  );
}
