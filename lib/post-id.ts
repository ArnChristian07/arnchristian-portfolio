import type { Content } from "@/components/admin/content";

/** Stable anchor id for a post, so a single post can be linked to (/blogs#post-…). */
export const postId = (p: Content["posts"][number], i: number) =>
  `post-${
    p.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || i
  }`;
