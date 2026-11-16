import type { MetadataRoute } from "next";
import { getSeoContent, siteDescription, siteName } from "@/lib/seo";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { content } = await getSeoContent();
  return {
    name: `${siteName(content)} - Web Portfolio`,
    short_name: siteName(content),
    description: siteDescription(content),
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
