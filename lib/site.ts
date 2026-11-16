import type { CSSProperties } from "react";
import { DEFAULT_ACCENT, SECTIONS, type Content, type SectionId } from "@/components/admin/content";

// Page-level helpers shared by the home page and /blogs.

const NAV: { id: SectionId; anchor: string; label: string }[] = [
  { id: "about", anchor: "about", label: "About" },
  { id: "skills", anchor: "skills", label: "Skills" },
  { id: "projects", anchor: "projects", label: "Projects" },
  { id: "experience", anchor: "experience", label: "Experience" },
  { id: "certificates", anchor: "certificates", label: "Certificates" },
  { id: "blogs", anchor: "blogs", label: "Blogs" },
];

/** Custom accent from the admin; the default keeps the hand-tuned theme values. */
export function accentStyle(accent: string): CSSProperties | undefined {
  if (!/^#[0-9a-f]{6}$/i.test(accent) || accent.toLowerCase() === DEFAULT_ACCENT) return undefined;
  return {
    "--accent": accent,
    "--accent-hover": `color-mix(in oklab, ${accent} 85%, black)`,
    "--accent-soft": `color-mix(in oklab, ${accent} 14%, var(--bg))`,
  } as CSSProperties;
}

/**
 * Every section is shown unless it's switched off in the admin. Empty sections
 * render friendly fallback text instead of disappearing.
 */
export function visibility(c: Content): Record<SectionId, boolean> {
  const show = Object.fromEntries(SECTIONS.map((s) => [s.id, true])) as Record<SectionId, boolean>;
  for (const id of c.site.hidden) show[id] = false;
  return show;
}

/** Nav links for the sections that are switched on. */
export function navLinks(show: Record<SectionId, boolean>) {
  return NAV.filter((l) => show[l.id]).map(({ anchor, label }) => ({ id: anchor, label }));
}

/** The author shown on every post in the blog feed. */
export function feedAuthor(c: Content) {
  const name = c.profile.name.trim() || "Me";
  return { name, photo: c.blog.photo.trim() || c.about.photo };
}
