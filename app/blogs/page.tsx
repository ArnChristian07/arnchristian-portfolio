import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Nav } from "@/components/nav";
import { MotionProvider } from "@/components/reveal";
import { BlogIndex, Footer } from "@/components/sections";
import { getPublicContent } from "@/lib/content-store";
import { postId } from "@/lib/post-id";
import { accentStyle, feedAuthor, navLinks, visibility } from "@/lib/site";
import { getSeoContent, jsonLd, siteName, siteUrl } from "@/lib/seo";

const DESCRIPTION = "Write-ups about what I’m building, breaking and learning along the way.";

export async function generateMetadata(): Promise<Metadata> {
  const { content } = await getSeoContent();
  const name = siteName(content);
  return {
    title: "Blog",
    description: DESCRIPTION,
    alternates: { canonical: "/blogs" },
    // Open Graph is replaced, not merged, per segment, so restate the basics.
    openGraph: { type: "website", siteName: name, title: `Blog · ${name}`, description: DESCRIPTION, url: "/blogs" },
    twitter: { card: "summary_large_image", title: `Blog · ${name}`, description: DESCRIPTION },
  };
}

async function BlogPage() {
  const content = await getPublicContent();
  const show = visibility(content);
  // Switching Blogs off in the admin hides this page too.
  if (!show.blogs) notFound();

  const url = siteUrl(content);
  const author = { "@type": "Person", name: siteName(content), url };
  const schema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `Blog · ${siteName(content)}`,
    description: DESCRIPTION,
    url: `${url}/blogs`,
    author,
    blogPost: content.posts
      // Same filter and order as <BlogIndex>, so the anchors match the feed.
      .filter((p) => p.title.trim())
      .map((p, i) => ({
        "@type": "BlogPosting",
        headline: p.title.trim(),
        description: p.summary.trim() || undefined,
        url: `${url}/blogs#${postId(p, i)}`,
        image: /^https?:[/][/]/.test(p.image) ? p.image : undefined,
        author,
      })),
  };

  return (
    // Full-height column so the footer stays at the bottom when there are only a few posts.
    <div className="flex min-h-dvh flex-col" style={accentStyle(content.site.accent)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <Nav domain={content.site.domain} links={navLinks(show)} showContact={show.contact} home="/" />
      <main className="flex flex-1 flex-col">
        <BlogIndex posts={content.posts} author={feedAuthor(content)} />
      </main>
      <Footer contact={content.contact} name={content.profile.name} />
    </div>
  );
}

/** Page header and a few post outlines while the feed loads. */
function BlogSkeleton() {
  return (
    <div aria-hidden className="mx-auto max-w-2xl px-4 pt-36 sm:px-6">
      <div className="skeleton h-4 w-24 rounded" />
      <div className="skeleton mt-8 h-10 w-80 max-w-full rounded-lg" />
      <div className="skeleton mt-4 h-4 w-96 max-w-full rounded" />
      <div className="mt-12 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3 px-5 py-5">
            <div className="skeleton size-11 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2.5">
              <div className="skeleton h-3 w-40 rounded" />
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-full rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <MotionProvider>
      <Suspense fallback={<BlogSkeleton />}>
        <BlogPage />
      </Suspense>
    </MotionProvider>
  );
}
