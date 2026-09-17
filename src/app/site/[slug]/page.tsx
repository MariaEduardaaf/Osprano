import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { PreviewSite } from "@/components/preview-site";
import { buildSiteView } from "@/components/site-templates";
import { DICTS, localeForLead } from "@/lib/preview-i18n";

type Props = { params: Promise<{ slug: string }> };

/**
 * `cache` dedupa a query entre generateMetadata e o render da página: as duas
 * rodam no mesmo request, então o Convex é consultado uma vez só. `content` já
 * chega parseado (v2) e `images` com as URLs do storage resolvidas.
 */
const loadSite = cache(async (slug: string) => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  const data = await new ConvexHttpClient(url).query(api.previews.getBySlug, { slug });
  return data ? { content: data.content, images: data.images, token: data.token } : null;
});

/** Hosts que só resolvem na máquina de quem desenvolve (mesma lista de convex/lib/env.ts). */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "::1"]);

/**
 * Origem pública do app, e SÓ quando ela foi declarada de verdade
 * (`NEXT_PUBLIC_APP_URL`, ou `APP_URL` se o host do Next expuser a mesma variável
 * que o deployment Convex usa para montar o link da prévia).
 *
 * Sem variável → devolve `null` e a página sai SEM canonical e SEM `og:url`. É de
 * propósito: canonical é uma AFIRMAÇÃO de qual é o endereço oficial do conteúdo.
 * Chutar o domínio (ou herdar `localhost`) mandaria o Google canonicalizar para
 * uma URL que não existe — pior do que não declarar nada, porque tira do índice a
 * página que o cliente comprou. A indexabilidade não depende disto: `robots` é
 * fixo abaixo, então esquecer a variável degrada o SEO, nunca o publica errado.
 */
function publicOrigin(): string | null {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL)?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (LOCAL_HOSTS.has(url.hostname.toLowerCase())) return null;
  return url.origin;
}

/**
 * Título/descrição no idioma do lead e com o nome do NEGÓCIO: é o site dele que
 * está publicado, não uma página da Osprano.
 *
 * INDEXÁVEL, ao contrário de `/p/[token]` — e a assimetria é o ponto:
 *   - `/p/[token]` é a prévia RASTREADA, mandada por email a quem ainda não comprou
 *     nada. Link privado; indexar publicaria uma página sobre o negócio de um
 *     terceiro que nunca pediu isso. Continua `noindex`, ver aquele arquivo.
 *   - `/site/[slug]` só existe depois de `previews.publish`, ou seja, depois da
 *     venda. Um site comprado que o Google não acha não entrega o que foi vendido:
 *     ser encontrável É o produto. Por isso `index: true` aqui.
 *
 * O único `noindex` que sobra é o do slug inexistente, abaixo: página de erro não
 * vai para buscador.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = await loadSite(slug);
  // Slug inexistente/não publicado: a página renderiza 404 (notFound), e um 404 não
  // se indexa. Mantido explícito porque o meta chega antes do status para crawler
  // que já tenha a URL em fila.
  if (!site) return { robots: { index: false } };

  const { name, city, countryCode } = site.content;
  // Cidade junto do país: só assim a Suíça francófona/italófona sai do alemão.
  const tr = DICTS[localeForLead(countryCode, city)];
  const title = tr.metaTitle({ name, city });
  const description = tr.metaDescription({ name, city });
  const origin = publicOrigin();
  // Auto-referente: o mesmo conteúdo também responde em /p/[token] (noindex) e
  // aceita query string (utm etc.). O canonical junta tudo numa URL só.
  const canonical = origin ? `${origin}/site/${encodeURIComponent(slug)}` : null;
  // `og:image` só quando a foto principal é upload dela (spec 3.5): a foto padrão
  // do modelo é decoração genérica e não pode virar "a foto do negócio" no preview de link.
  const heroUpload = site.images.heroUrl;
  return {
    title,
    description,
    // metadataBase existe para o Next resolver URL relativa em campo de OG. Só é
    // definido junto do canonical porque vem da mesma (única) fonte verificada.
    ...(origin ? { metadataBase: new URL(origin) } : {}),
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: "website",
      title,
      description,
      ...(canonical ? { url: canonical } : {}),
      ...(heroUpload ? { images: [{ url: heroUpload }] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

export default async function SitePage({ params }: Props) {
  const { slug } = await params;
  const site = await loadSite(slug);
  if (!site) notFound();

  // TRCK-01: NÃO rastrear aqui. Esta rota é o site VENDIDO, e uma visita a ele
  // não é "o prospect abriu minha prévia" — é um cliente do negócio, ou o
  // Googlebot, que executa JS e passaria a incrementar openCount e a empurrar o
  // lead de `base` para `approached` a cada rastreamento. A guarda de self-open
  // em previews.recordOpen só pega o dono logado (identity Clerk); um crawler
  // não tem sessão e entraria como prospect real. O sinal de abertura pertence
  // exclusivamente ao link de abordagem em /p/[token].
  const view = buildSiteView(site.content, site.images);
  return <PreviewSite view={view} locale={localeForLead(view.countryCode, view.city)} />;
}
