import { notFound } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { PreviewSite, type PreviewContent } from "@/components/preview-site";
import { PreviewTracker } from "@/components/preview-tracker";

export const metadata = { robots: { index: false } };

export default async function PreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) notFound();

  const client = new ConvexHttpClient(url);
  const data = await client.query(api.previews.getByToken, { token });
  if (!data) notFound();

  return (
    <>
      <PreviewTracker token={token} />
      <PreviewSite content={data.content as PreviewContent} />
    </>
  );
}
