import { PageHeader, EmptyState } from "@/components/ui";

export default function OutreachPage() {
  return (
    <>
      <PageHeader
        title="Outreach"
        subtitle="Abordagem por email escrita pela IA — compliant by design"
      />
      <EmptyState title="O outreach conecta na Fase 3">
        A IA escreve a abordagem citando a dor do lead + o link do preview rastreado. Envio 1-clique
        por email (identificação + opt-out). WhatsApp só depois que o prospect responde/opta.
      </EmptyState>
    </>
  );
}
