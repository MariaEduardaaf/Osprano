import { notFound } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { PreviewSite, type PreviewContent } from "@/components/preview-site";
import { PreviewTracker } from "@/components/preview-tracker";

export const metadata = { robots: { index: false } };

export default async function SitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) notFound();

  const data = await new ConvexHttpClient(url).query(api.previews.getBySlug, { slug });
  if (!data) notFound();

  return (
    <>
      <PreviewTracker token={data.token} />
      <PreviewSite content={data.content as PreviewContent} />
    </>
  );
}
