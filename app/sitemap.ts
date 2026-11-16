import type { MetadataRoute } from "next";
import { getSeoContent } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { url, show } = await getSeoContent();
  const pages: MetadataRoute.Sitemap = [{ url, changeFrequency: "monthly", priority: 1 }];
  // /blogs 404s while the Blogs section is switched off in the admin.
  if (show.blogs) pages.push({ url: `${url}/blogs`, changeFrequency: "weekly", priority: 0.7 });
  return pages;
}
