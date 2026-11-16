"use client";

import { ArrowUpRight, Check, ChevronDown, Link2, MessageSquareText } from "lucide-react";
import { useState } from "react";
import type { Content } from "./admin/content";
import { Stagger, StaggerItem } from "./reveal";
import { SkeletonImage } from "./skeleton-image";
import { postId } from "@/lib/post-id";

type Post = Content["posts"][number];

/** Who the posts are "from": shown on every post like a timeline author. */
export type FeedAuthor = { name: string; photo: string };

/** True for a real link: not empty and not a bare "#". */
const isLink = (href: string) => !!href.trim() && href.trim() !== "#";

/** Blank lines separate paragraphs. */
const split = (s: string) =>
  s
    .split(/\n\s*\n/)
    .map((x) => x.trim())
    .filter(Boolean);

function Avatar({ author, size = "size-11" }: { author: FeedAuthor; size?: string }) {
  const initials = author.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full bg-accent-soft ring-1 ring-border ${size}`}>
      {author.photo.trim() ? (
        <SkeletonImage src={author.photo} alt="" sizes="96px" className="object-cover" />
      ) : (
        <span className="grid size-full place-items-center font-display text-sm font-semibold text-accent">
          {initials || "•"}
        </span>
      )}
    </div>
  );
}

/** Copies the post's link; flips to a check for a moment. */
function CopyLink({ id }: { id: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${location.origin}/blogs#${id}`);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          /* clipboard blocked: nothing to do */
        }
      }}
      className="group/act inline-flex items-center gap-1.5 rounded-full text-[13px] text-faint transition-colors hover:text-accent"
    >
      <span className="grid size-8 place-items-center rounded-full transition-colors group-hover/act:bg-accent-soft">
        {done ? <Check className="size-4" /> : <Link2 className="size-4" />}
      </span>
      {done ? "Copied" : "Copy link"}
    </button>
  );
}

function FeedPost({ post, author, id, defaultOpen }: { post: Post; author: FeedAuthor; id: string; defaultOpen: boolean }) {
  const body = split(post.body);
  const summary = split(post.summary);
  // "Show more" only when there is a full text beyond the summary.
  const hasMore = body.length > 0 && post.body.trim() !== post.summary.trim();
  const [open, setOpen] = useState(defaultOpen);
  const shown = open && hasMore ? body : summary.length ? summary : body;

  return (
    <article
      id={id}
      className="flex scroll-mt-32 gap-3 px-4 py-5 transition-colors hover:bg-muted-card/60 target:bg-accent-soft/40 sm:px-5"
    >
      <Avatar author={author} />
      <div className="min-w-0 flex-1">
        <header className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[14px] leading-5">
          <span className="truncate font-semibold text-fg">{author.name}</span>
          {post.meta && (
            <>
              <span aria-hidden className="text-faint">
                ·
              </span>
              <span className="truncate text-faint">{post.meta}</span>
            </>
          )}
        </header>

        <h3 className="mt-1 font-display text-[16px] font-semibold leading-snug tracking-tight text-fg">
          {post.title}
        </h3>

        <div className="mt-1.5 space-y-3 text-[15px] leading-[1.6] text-fg-soft">
          {shown.map((para, n) => (
            <p key={n} className="whitespace-pre-line break-words">
              {para}
            </p>
          ))}
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="mt-2 inline-flex items-center gap-1 text-[14px] font-medium text-accent hover:underline"
          >
            {open ? "Show less" : "Show more"}
            <ChevronDown className={`size-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          </button>
        )}

        {post.image.trim() && (
          <div className="relative mt-3 aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-muted-card">
            <SkeletonImage src={post.image} alt="" sizes="(min-width: 640px) 540px, 100vw" className="object-cover" />
          </div>
        )}

        <footer className="-ml-2 mt-2 flex flex-wrap items-center gap-x-5">
          {hasMore && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="group/act inline-flex items-center gap-1.5 text-[13px] text-faint transition-colors hover:text-accent"
            >
              <span className="grid size-8 place-items-center rounded-full transition-colors group-hover/act:bg-accent-soft">
                <MessageSquareText className="size-4" />
              </span>
              {open ? "Collapse" : "Read"}
            </button>
          )}
          <CopyLink id={id} />
          {isLink(post.href) && (
            <a
              href={post.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group/act inline-flex items-center gap-1.5 text-[13px] text-faint transition-colors hover:text-accent"
            >
              <span className="grid size-8 place-items-center rounded-full transition-colors group-hover/act:bg-accent-soft">
                <ArrowUpRight className="size-4" />
              </span>
              Original
            </a>
          )}
        </footer>
      </div>
    </article>
  );
}

/**
 * Posts as a timeline: one column, avatar + author line, text, optional media,
 * an action row, hairlines between posts. Long posts expand in place.
 */
export function BlogFeed({
  posts,
  author,
  expandFirst = false,
}: {
  posts: Post[];
  author: FeedAuthor;
  expandFirst?: boolean;
}) {
  return (
    <Stagger className="divide-y divide-border" gap={0.06}>
      {posts.map((p, i) => (
        <StaggerItem key={i}>
          <FeedPost post={p} author={author} id={postId(p, i)} defaultOpen={expandFirst && i === 0} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
