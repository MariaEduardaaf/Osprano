import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { PreviewSite } from "@/components/preview-site";
import { PreviewTracker } from "@/components/preview-tracker";
import { buildSiteView } from "@/components/site-templates";
import { DICTS, localeForLead } from "@/lib/preview-i18n";

type Props = { params: Promise<{ token: string }> };

/**
 * `cache` dedupa a query entre generateMetadata e o render da página: as duas
 * rodam no mesmo request, então o Convex é consultado uma vez só. `content` já
 * chega parseado (v2) e `images` com as URLs do storage resolvidas.
 */
const loadPreview = cache(async (token: string) => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  const data = await new ConvexHttpClient(url).query(api.previews.getByToken, { token });
  return data ? { content: data.content, images: data.images } : null;
});

/**
 * Título/descrição no idioma do lead e com o nome do NEGÓCIO: o prospect abre o
 * que parece ser o site dele, não uma página da Osprano.
 *
 * `robots.index: false` em TODOS os caminhos, e isto não é simetria com
 * `/site/[slug]` — é o contrário dela:
 *   - aqui a página é a prévia RASTREADA, mandada por email a quem ainda não
 *     comprou nada. O link é privado e o token é a única credencial; indexar
 *     publicaria uma página sobre o negócio de um terceiro que nunca pediu isso,
 *     e ainda entregaria o token a qualquer um que buscasse o nome dele.
 *   - `/site/[slug]` é o site já vendido e publicado, e lá `index: true` é o
 *     produto: ser achável no Google é o que o cliente comprou.
 * Ou seja: mudar este arquivo para indexável não é "consertar a divergência".
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const preview = await loadPreview(token);
  if (!preview) return { robots: { index: false } };

  const { name, city, countryCode } = preview.content;
  // Cidade junto do país: só assim a Suíça francófona/italófona sai do alemão.
  const tr = DICTS[localeForLead(countryCode, city)];
  const title = tr.metaTitle({ name, city });
  const description = tr.metaDescription({ name, city });
  return { title, description, openGraph: { title, description }, robots: { index: false } };
}

export default async function PreviewPage({ params }: Props) {
  const { token } = await params;
  const preview = await loadPreview(token);
  if (!preview) notFound();

  // A página monta o SiteView (foto padrão onde não há upload), nunca o modelo (spec 3.5).
  const view = buildSiteView(preview.content, preview.images);
  const locale = localeForLead(view.countryCode, view.city);
  return (
    <>
      <PreviewTracker token={token} />
      <PreviewSite view={view} locale={locale} />
    </>
  );
}
