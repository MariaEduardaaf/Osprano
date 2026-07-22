import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { PreviewSite, type PreviewContent } from "@/components/preview-site";
import { PreviewTracker } from "@/components/preview-tracker";
import { DICTS, localeForLead } from "@/lib/preview-i18n";

type Props = { params: Promise<{ token: string }> };

/**
 * `cache` dedupa a query entre generateMetadata e o render da página: as duas
 * rodam no mesmo request, então o Convex é consultado uma vez só.
 */
const loadPreview = cache(async (token: string): Promise<PreviewContent | null> => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  const data = await new ConvexHttpClient(url).query(api.previews.getByToken, { token });
  return data ? (data.content as PreviewContent) : null;
});

/**
 * Título/descrição no idioma do lead e com o nome do NEGÓCIO: o prospect abre o
 * que parece ser o site dele, não uma página da Osprano. `robots.index: false`
 * continua valendo — link rastreado nunca vai para buscador.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const content = await loadPreview(token);
  if (!content) return { robots: { index: false } };

  // Cidade junto do país: só assim a Suíça francófona/italófona sai do alemão.
  const tr = DICTS[localeForLead(content.countryCode, content.city)];
  const title = tr.metaTitle({ name: content.name, city: content.city });
  const description = tr.metaDescription({ name: content.name, city: content.city });
  return { title, description, openGraph: { title, description }, robots: { index: false } };
}

export default async function PreviewPage({ params }: Props) {
  const { token } = await params;
  const content = await loadPreview(token);
  if (!content) notFound();

  return (
    <>
      <PreviewTracker token={token} />
      <PreviewSite content={content} />
    </>
  );
}
