import { SiteEditor } from "@/components/site-editor/site-editor";

type Props = {
  params: Promise<{ leadId: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
};

/**
 * Editor do site de um lead (spec 3.1), página inteira dentro da área logada
 * (mesmo rail; o item CRM fica ativo por `pathname.startsWith("/crm/")`).
 * `params` e `searchParams` são Promises no Next 16. O id vai como string: o
 * `SiteEditor` consulta `leads.get`, que devolve null para id malformado ou de
 * outra org (estado "Lead não encontrado", sem crash).
 */
export default async function SiteEditorPage({ params, searchParams }: Props) {
  const { leadId } = await params;
  const { from } = await searchParams;
  return <SiteEditor leadId={leadId} from={from === "sites" ? "sites" : "crm"} />;
}
