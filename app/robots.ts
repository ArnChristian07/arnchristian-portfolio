import type { MetadataRoute } from "next";
import { getSeoContent } from "@/lib/seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { url } = await getSeoContent();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/mail"] },
    sitemap: `${url}/sitemap.xml`,
    host: url,
  };
}
