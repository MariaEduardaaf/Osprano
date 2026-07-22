import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { PreviewSite, type PreviewContent } from "@/components/preview-site";
import { PreviewTracker } from "@/components/preview-tracker";
import { DICTS, localeForCountry } from "@/lib/preview-i18n";

type Props = { params: Promise<{ slug: string }> };

/**
 * `cache` dedupa a query entre generateMetadata e o render da página: as duas
 * rodam no mesmo request, então o Convex é consultado uma vez só.
 */
const loadSite = cache(
  async (slug: string): Promise<{ content: PreviewContent; token: string } | null> => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) return null;
    const data = await new ConvexHttpClient(url).query(api.previews.getBySlug, { slug });
    return data ? { content: data.content as PreviewContent, token: data.token } : null;
  },
);

/**
 * Título/descrição no idioma do lead e com o nome do NEGÓCIO: é o site dele que
 * está publicado, não uma página da Osprano. `robots.index: false` continua
 * valendo — site white-label não concorre com o negócio no buscador.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = await loadSite(slug);
  if (!site) return { robots: { index: false } };

  const { name, city, countryCode } = site.content;
  const tr = DICTS[localeForCountry(countryCode)];
  const title = tr.metaTitle({ name, city });
  const description = tr.metaDescription({ name, city });
  return { title, description, openGraph: { title, description }, robots: { index: false } };
}

export default async function SitePage({ params }: Props) {
  const { slug } = await params;
  const site = await loadSite(slug);
  if (!site) notFound();

  return (
    <>
      <PreviewTracker token={site.token} />
      <PreviewSite content={site.content} />
    </>
  );
}
