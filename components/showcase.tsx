"use client";

import { ArrowRight, ArrowUpRight, Award, ChevronLeft, ChevronRight, Expand, Images } from "lucide-react";
import { useEffect, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { Content } from "./admin/content";
import { Modal } from "./admin/modal";
import { Carousel } from "./carousel";
import { ProjectThumb, THUMB_KINDS } from "./project-thumb";
import { SkeletonImage } from "./skeleton-image";

type Project = Content["projects"][number];
type Certificate = Content["certificates"][number];

/** True for a real link: not empty and not a bare "#". */
const isLink = (href: string) => !!href.trim() && href.trim() !== "#";
const filled = (s: string) => s.trim() !== "";

const card =
  "rounded-2xl border border-border bg-card shadow-card transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-1 hover:border-border-strong hover:shadow-lift";

/** Card used in the certificate coverflow: no hover lift (the 3D tilt moves it). */
const certCard =
  "rounded-2xl border border-border bg-card shadow-card transition-[border-color,box-shadow] duration-500 data-[active]:border-accent/40 data-[active]:shadow-lift";

/** Feeds the cursor position to the card's spotlight gradient. */
function spotlight(e: ReactPointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <li className="rounded-full bg-chip px-2.5 py-1 text-[11.5px] font-medium text-chip-fg">
      {children}
    </li>
  );
}

/** Small "click to expand" badge revealed on card hover/focus. */
function ExpandHint() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute right-3 top-3 grid size-8 place-items-center rounded-lg bg-card/90 text-fg opacity-0 shadow-card backdrop-blur transition-opacity duration-300 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
    >
      <Expand className="size-4" />
    </span>
  );
}

/**
 * Covers the whole card so a click anywhere opens the viewer. Real links in the
 * card sit above it (`relative z-10`) and keep working on their own.
 */
function CardOpener({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      className="absolute inset-0 z-[1] cursor-zoom-in rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    />
  );
}

function ProjectLinks({ links, className = "" }: { links: Project["links"]; className?: string }) {
  const real = links.filter((l) => isLink(l.href));
  if (real.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-5 ${className}`}>
      {real.map((l, n) => (
        <a
          key={n}
          href={l.href}
          className="group/link relative z-10 inline-flex items-center gap-0.5 text-[13px] font-medium text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent"
        >
          {l.label}
          <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
        </a>
      ))}
    </div>
  );
}

/* ---------- Projects ---------- */

/** Cover first, then the extra screenshots, skipping blanks and repeats. */
const projectImages = (p: Project) => [...new Set([p.image, ...p.gallery].map((s) => s.trim()).filter(Boolean))];

const navBtn =
  "absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-card/90 text-fg shadow-card backdrop-blur transition-[background-color,transform] hover:bg-card active:scale-95";

/** Large image viewer with prev/next, arrow keys and a thumbnail strip. */
function ProjectGallery({ images, title, fallback }: { images: string[]; title: string; fallback: number }) {
  const [i, setI] = useState(0);
  const many = images.length > 1;
  const go = (by: number) => setI((n) => (n + by + images.length) % images.length);

  useEffect(() => {
    if (!many) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setI((n) => (n - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setI((n) => (n + 1) % images.length);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [many, images.length]);

  if (images.length === 0) {
    return (
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted-card">
        <ProjectThumb kind={THUMB_KINDS[fallback % THUMB_KINDS.length]} />
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted-card">
        {/* Keyed so each image gets its own loading skeleton and fade-in. */}
        <SkeletonImage
          key={images[i]}
          src={images[i]}
          alt={`${title} screenshot ${i + 1} of ${images.length}`}
          sizes="(min-width: 640px) 860px, 100vw"
          className="object-contain"
        />
        {many && (
          <>
            <button type="button" aria-label="Previous screenshot" onClick={() => go(-1)} className={`${navBtn} left-3`}>
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" aria-label="Next screenshot" onClick={() => go(1)} className={`${navBtn} right-3`}>
              <ChevronRight className="size-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-md bg-card/90 px-2 py-0.5 font-mono text-[11px] font-medium text-fg backdrop-blur">
              {i + 1} / {images.length}
            </span>
          </>
        )}
      </div>
      {many && (
        <ul className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 py-1">
          {images.map((src, n) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                aria-label={`Show screenshot ${n + 1}`}
                aria-current={n === i || undefined}
                onClick={() => setI(n)}
                className={`relative block aspect-[16/10] w-24 overflow-hidden rounded-lg border bg-muted-card transition-[opacity,box-shadow] sm:w-28 ${
                  n === i
                    ? "border-accent ring-2 ring-accent/40"
                    : "border-border opacity-60 hover:opacity-100"
                }`}
              >
                <SkeletonImage src={src} alt="" sizes="112px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProjectGrid({ projects }: { projects: Project[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const active = open === null ? null : projects[open];

  return (
    <>
      <Carousel
        label="Projects"
        items={projects}
        paused={open !== null}
        renderSlide={(p, { index: idx }) => (
            <article
              onPointerMove={spotlight}
              className={`group relative flex w-full flex-col overflow-hidden ${card}`}
            >
              {/* Accent glow that follows the cursor. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[2] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(420px circle at var(--mx, 50%) var(--my, 0%), color-mix(in oklab, var(--accent) 13%, transparent), transparent 45%)",
                }}
              />
              <CardOpener label={`View details for ${p.title}`} onOpen={() => setOpen(idx)} />
              <div className="relative aspect-[16/10] overflow-hidden border-b border-border">
                {p.image ? (
                  <SkeletonImage
                    src={p.image}
                    alt=""
                    sizes="(min-width: 1024px) 370px, (min-width: 640px) 50vw, 86vw"
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.05]"
                  />
                ) : (
                  <ProjectThumb kind={THUMB_KINDS[idx % THUMB_KINDS.length]} />
                )}
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                {p.status && (
                  <span className="absolute left-3 top-3 rounded-md bg-card/90 px-2 py-0.5 text-[11px] font-medium text-fg backdrop-blur">
                    {p.status}
                  </span>
                )}
                <ExpandHint />
                {projectImages(p).length > 1 && (
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-card/90 px-2 py-0.5 text-[11px] font-medium text-fg backdrop-blur">
                    <Images aria-hidden className="size-3.5" />
                    {projectImages(p).length}
                    <span className="sr-only"> screenshots</span>
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-faint">
                  {String(idx + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-1.5 font-display text-lg font-semibold tracking-tight text-fg">{p.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{p.description}</p>
                <ul className="mt-5 flex flex-wrap gap-1.5">
                  {p.tags.filter((t) => t.trim()).map((t, n) => (
                    <Chip key={n}>{t}</Chip>
                  ))}
                </ul>
                <ProjectLinks links={p.links} className="mt-auto pt-6" />
              </div>
            </article>
        )}
      />

      <Modal
        open={active !== null}
        onClose={() => setOpen(null)}
        size="xl"
        title={active?.title}
        description={active?.status || undefined}
      >
        {active && open !== null && (
          <div>
            <ProjectGallery images={projectImages(active)} title={active.title} fallback={open} />
            {filled(active.description) && (
              <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-fg-soft">
                {active.description}
              </p>
            )}
            {active.tags.some(filled) && (
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {active.tags.filter(filled).map((t, n) => (
                  <Chip key={n}>{t}</Chip>
                ))}
              </ul>
            )}
            <ProjectLinks links={active.links} className="mt-6" />
          </div>
        )}
      </Modal>
    </>
  );
}

/* ---------- Certificates ---------- */

export function CertificateGrid({ items }: { items: Certificate[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const active = open === null ? null : items[open];

  return (
    <>
      <Carousel
        label="Certificates"
        effect="coverflow"
        items={items}
        paused={open !== null}
        renderSlide={(c, { index: i, active: isActive }) => (
          <div
            data-active={isActive || undefined}
            className={`group relative flex w-full flex-col overflow-hidden ${certCard}`}
          >
            {/* Side cards slide to the centre first (the carousel handles that); the centred one opens. */}
            <CardOpener
              label={isActive ? `View ${c.name} certificate` : `Show ${c.name}`}
              onOpen={() => setOpen(i)}
            />
            <div className="relative aspect-[4/3] overflow-hidden border-b border-border bg-[radial-gradient(120%_90%_at_50%_0%,var(--accent-soft),var(--muted-card)_70%)]">
              {filled(c.image) ? (
                <SkeletonImage
                  src={c.image}
                  alt={`${c.name} certificate`}
                  sizes="(min-width: 1024px) 440px, (min-width: 640px) 54vw, 78vw"
                  className="object-contain p-4 drop-shadow-[0_10px_18px_rgb(var(--shadow)/0.18)] transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-data-[active]:group-hover:scale-[1.04]"
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <Award aria-hidden className="size-14 text-accent/70" strokeWidth={1.25} />
                </div>
              )}
              {/* Light sweep across the centred card on hover. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition-[left,opacity] duration-1000 ease-out group-data-[active]:group-hover:left-[120%] group-data-[active]:group-hover:opacity-100"
              />
              {isActive && <ExpandHint />}
            </div>
            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
                  No. {String(i + 1).padStart(2, "0")}
                </span>
                <Award aria-hidden className="size-4 text-faint" />
              </div>
              <h3 className="mt-2 font-display text-[16px] font-semibold leading-snug text-fg">{c.name}</h3>
              {c.meta && <p className="mt-1 text-[13px] text-muted">{c.meta}</p>}
              {isLink(c.href) && (
                <a
                  href={c.href}
                  tabIndex={isActive ? undefined : -1}
                  className="group/link relative z-10 mt-auto inline-flex w-fit items-center gap-1 pt-4 text-[13px] font-medium text-accent"
                >
                  View credential
                  <ArrowRight className="size-3.5 transition-transform duration-300 group-hover/link:translate-x-0.5" />
                </a>
              )}
            </div>
          </div>
        )}
      />

      <Modal
        open={active !== null}
        onClose={() => setOpen(null)}
        size="xl"
        title={active?.name}
        description={active?.meta || undefined}
      >
        {active && (
          <div>
            {filled(active.image) ? (
              <div className="relative h-[min(70dvh,640px)] overflow-hidden rounded-xl border border-border bg-muted-card">
                <SkeletonImage
                  src={active.image}
                  alt={`${active.name} certificate`}
                  sizes="(min-width: 640px) 860px, 100vw"
                  className="object-contain p-2"
                />
              </div>
            ) : (
              <p className="text-[15px] text-muted">No certificate image has been added yet.</p>
            )}
            <div className="mt-5 flex flex-wrap gap-5">
              {filled(active.image) && (
                <a
                  href={active.image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-fg-soft transition-colors hover:text-accent"
                >
                  Open full size
                  <ArrowUpRight className="size-3.5" />
                </a>
              )}
              {isLink(active.href) && (
                <a
                  href={active.href}
                  className="group/link inline-flex items-center gap-1 text-[13px] font-medium text-accent"
                >
                  View credential
                  <ArrowRight className="size-3.5 transition-transform duration-300 group-hover/link:translate-x-0.5" />
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
