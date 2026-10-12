import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/legal-doc";

export const metadata: Metadata = { title: "Política de Cookies · Osprano" };

export default function Page() {
  return (
    <LegalDoc slug="cookies">
      <h2>O que guardamos no seu navegador</h2>
      <table>
        <thead>
          <tr><th>Nome</th><th>Quem grava</th><th>Para quê</th><th>Duração</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Cookies de sessão do Clerk</td>
            <td>Clerk</td>
            <td>Autenticação. Estritamente necessários para você entrar e continuar logado.</td>
            <td>Sessão, definida pelo Clerk</td>
          </tr>
          <tr>
            <td>theme</td>
            <td>Osprano (localStorage)</td>
            <td>Tema claro ou escuro escolhido por você.</td>
            <td>Até você limpar o navegador</td>
          </tr>
          <tr>
            <td>osprano.dmSignature</td>
            <td>Osprano (localStorage)</td>
            <td>Assinatura que você usa nas mensagens diretas.</td>
            <td>Até você limpar o navegador</td>
          </tr>
        </tbody>
      </table>
      <h2>O que não usamos</h2>
      <p>
        Não usamos analytics, pixels de publicidade nem cookies de terceiros para rastrear você. Por isso não há banner de
        consentimento. Se isso mudar, esta página e o site passam a pedir seu consentimento antes.
      </p>
      <h2>Páginas de preview e sites publicados</h2>
      <p>
        A abertura de um preview é registrada no nosso servidor, sem cookie, para mostrar ao cliente do Osprano que o link
        foi aberto.
      </p>
      <h2>Como apagar</h2>
      <p>
        Limpe os dados do site nas configurações do seu navegador. Sair da conta encerra a sessão.
      </p>
    </LegalDoc>
  );
}
