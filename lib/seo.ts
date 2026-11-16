import "server-only";
import type { Content } from "@/components/admin/content";
import { getPublicContent } from "./content-store";
import { visibility } from "./site";

// Search and social metadata built from the same Firestore content the pages show.

export const FALLBACK_DESCRIPTION =
  "Web developer and student focused on clean front-ends, React Native apps, and the occasional retro-console side quest.";

/**
 * Absolute origin used for canonical URLs, the sitemap and Open Graph tags.
 * NEXT_PUBLIC_SITE_URL wins (useful for previews); otherwise the domain set in
 * the admin.
 */
export function siteUrl(c: Content): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || c.site.domain.trim() || "arnchristian.dev";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return "https://arnchristian.dev";
  }
}

export function siteName(c: Content) {
  return c.profile.name.trim() || "ArnChristian";
}

/** The hero tagline doubles as the meta description; keep it snippet-sized. */
export function siteDescription(c: Content) {
  const text = c.profile.tagline.trim().replace(/\s+/g, " ") || FALLBACK_DESCRIPTION;
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

const isUrl = (v: string) => /^https?:\/\//i.test(v.trim());

/** Profile links for schema.org `sameAs`. */
export function profileLinks(c: Content) {
  return [c.contact.github, c.contact.linkedin].map((v) => v.trim()).filter(isUrl);
}

/** Serializes JSON-LD for a <script> tag without letting content close it. */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export async function getSeoContent() {
  const content = await getPublicContent();
  return { content, url: siteUrl(content), show: visibility(content) };
}
