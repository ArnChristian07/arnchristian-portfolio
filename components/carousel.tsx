"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { AnimatePresence, motion, useInView, useReducedMotion, type Variants } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ease } from "./reveal";

export type SlideState = {
  index: number;
  /** The slide the carousel is currently resting on. */
  active: boolean;
};

type Effect = "slide" | "coverflow";

type Props<T> = {
  items: T[];
  renderSlide: (item: T, state: SlideState) => ReactNode;
  /** Accessible name, e.g. "Projects". */
  label: string;
  /**
   * `slide`: a row of cards aligned to the container that bleeds to the page edge.
   * `coverflow`: one centred card, neighbours tilted back in 3D.
   */
  effect?: Effect;
  /** Milliseconds per slide. 0 turns autoplay off. Always off for reduced motion. */
  autoplay?: number;
  /** Hold autoplay, e.g. while a detail modal is open. */
  paused?: boolean;
};

const slideIn: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

const WIDTHS: Record<Effect, { track: string; slide: string }> = {
  slide: {
    // Bleeds into the container gutter, so cards scroll out to the page edge
    // while the resting position still lines up with the heading above.
    track: "-mx-4 px-4 scroll-px-4 gap-5 sm:-mx-6 sm:px-6 sm:scroll-px-6 lg:-mx-8 lg:px-8 lg:scroll-px-8",
    slide:
      "snap-start w-[86cqw] sm:w-[calc((100cqw_-_1.25rem)/2)] lg:w-[calc((100cqw_-_2.5rem)/3)]",
  },
  coverflow: {
    // Side padding of (100% - card) / 2 lets the first and last cards centre.
    track: "gap-4 px-[11cqw] sm:gap-6 sm:px-[23cqw] lg:px-[31cqw]",
    slide: "snap-center w-[78cqw] sm:w-[54cqw] lg:w-[38cqw]",
  },
};

const slidesOf = (track: HTMLElement) => Array.from(track.children) as HTMLElement[];

const pad = (n: number) => String(n).padStart(2, "0");

export function Carousel<T>({
  items,
  renderSlide,
  label,
  effect = "slide",
  autoplay = 6000,
  paused = false,
}: Props<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  /** Scroll positions the carousel can rest on; stop i belongs to slide i. */
  const stopsRef = useRef<number[]>([0]);
  const frame = useRef(0);
  const drag = useRef<{ x: number; left: number; from: number; moved: boolean } | null>(null);
  const swallowClick = useRef(false);

  const [stopCount, setStopCount] = useState(1);
  const [active, setActive] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [stopped, setStopped] = useState(false);

  const reduced = useReducedMotion() ?? false;
  const inView = useInView(rootRef, { amount: 0.35 });
  const coverflow = effect === "coverflow";
  const behavior: ScrollBehavior = reduced ? "auto" : "smooth";

  const nearest = (left: number) => {
    const stops = stopsRef.current;
    let best = 0;
    for (let i = 1; i < stops.length; i++) {
      if (Math.abs(stops[i] - left) < Math.abs(stops[best] - left)) best = i;
    }
    return best;
  };

  /** Tilts and dims each card by its distance from the centre (coverflow only). */
  const paintFaces = useCallback(() => {
    const t = trackRef.current;
    if (!t || !coverflow) return;
    const mid = t.scrollLeft + t.clientWidth / 2;
    slidesOf(t).forEach((slide) => {
      const face = slide.firstElementChild as HTMLElement | null;
      if (!face) return;
      const w = slide.offsetWidth || 1;
      const d = (slide.offsetLeft + w / 2 - mid) / w; // signed, in card widths
      const a = Math.min(Math.abs(d), 1.4);
      face.style.opacity = String(1 - Math.min(a, 1.2) * 0.45);
      face.style.transform = reduced
        ? ""
        : `perspective(1400px) translateZ(${-a * 110}px) rotateY(${Math.max(-1.2, Math.min(1.2, d)) * -26}deg)`;
    });
  }, [coverflow, reduced]);

  const sync = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const max = t.scrollWidth - t.clientWidth;
    setActive(nearest(t.scrollLeft));
    setEdges({ start: t.scrollLeft <= 2, end: t.scrollLeft >= max - 2 });
    paintFaces();
  }, [paintFaces]);

  const measure = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const padLeft = parseFloat(getComputedStyle(t).scrollPaddingLeft) || 0;
    const max = Math.max(0, t.scrollWidth - t.clientWidth);
    const stops: number[] = [];
    for (const el of slidesOf(t)) {
      const raw = coverflow
        ? el.offsetLeft + el.offsetWidth / 2 - t.clientWidth / 2
        : el.offsetLeft - padLeft;
      const pos = Math.min(Math.max(raw, 0), max);
      stops.push(pos);
      // Once a card can't scroll any further left, the rest are already visible.
      if (pos >= max - 1) break;
    }
    stopsRef.current = stops.length ? stops : [0];
    setStopCount(stopsRef.current.length);
    sync();
  }, [coverflow, sync]);

  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    measure();
    const ro = new ResizeObserver(measure);
    // Re-measure when slides are added or removed.
    const mo = new MutationObserver(measure);
    mo.observe(t, { childList: true });
    ro.observe(t);
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [measure]);

  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(sync);
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const goTo = useCallback(
    (i: number, wrap = false) => {
      const t = trackRef.current;
      const stops = stopsRef.current;
      if (!t) return;
      const n = stops.length;
      const k = wrap ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i));
      t.scrollTo({ left: stops[k], behavior });
    },
    [behavior],
  );

  /* ----- mouse drag (touch and trackpads already scroll natively) ----- */

  const restoreSnap = (t: HTMLDivElement) => {
    const done = () => (t.style.scrollSnapType = "");
    if ("onscrollend" in window) t.addEventListener("scrollend", done, { once: true });
    window.setTimeout(done, 700);
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    const t = trackRef.current;
    if (!t || e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { x: e.clientX, left: t.scrollLeft, from: nearest(t.scrollLeft), moved: false };

    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = ev.clientX - d.x;
      if (!d.moved && Math.abs(dx) > 5) {
        d.moved = true;
        t.style.scrollSnapType = "none";
        setDragging(true);
      }
      if (d.moved) t.scrollLeft = d.left - dx;
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const d = drag.current;
      drag.current = null;
      if (!d?.moved) return;
      setDragging(false);
      swallowClick.current = true;
      window.setTimeout(() => (swallowClick.current = false), 0);
      // A short, deliberate flick still moves one card.
      const dx = ev.clientX - d.x;
      let k = nearest(t.scrollLeft);
      if (k === d.from && Math.abs(dx) > 40) k += dx < 0 ? 1 : -1;
      goTo(k);
      restoreSnap(t);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      goTo(active + (e.key === "ArrowRight" ? 1 : -1));
    }
  };

  /* ----- autoplay: the active pill fills up, and its end advances the slide ----- */

  const canPlay = autoplay > 0 && !reduced && stopCount > 1;
  const playing = canPlay && !stopped;
  const holding = paused || hovered || focused || dragging || !inView;

  const fade = (on: boolean) => (on ? "56px" : "0px");
  const mask: CSSProperties = coverflow
    ? {
        maskImage: "linear-gradient(to right, transparent, #000 9%, #000 91%, transparent)",
      }
    : {
        maskImage: `linear-gradient(to right, transparent, #000 ${fade(!edges.start)}, #000 calc(100% - ${fade(!edges.end)}), transparent)`,
      };

  const ctrlBtn =
    "grid size-11 place-items-center rounded-full border border-border bg-card text-fg shadow-card transition-[background-color,color,border-color,transform,opacity] duration-300 hover:border-accent hover:bg-accent hover:text-accent-fg active:scale-90 disabled:pointer-events-none disabled:opacity-35";

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      className="@container relative mt-10"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setFocused(false)}
      onKeyDown={onKeyDown}
    >
      {/* Soft accent wash behind the centred card. */}
      {coverflow && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[40%] -z-10 h-[60%] w-[min(560px,80%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[90px]"
        />
      )}

      <motion.div
        ref={trackRef}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onClickCapture={(e) => {
          if (swallowClick.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onDragStart={(e) => e.preventDefault()}
        style={mask}
        className={`relative flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain py-8 -my-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          dragging ? "cursor-grabbing select-none" : "md:cursor-grab"
        } ${WIDTHS[effect].track}`}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
      >
        {items.map((item, i) => (
          <motion.div
            key={i}
            variants={slideIn}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${items.length}`}
            className={`flex shrink-0 ${WIDTHS[effect].slide}`}
            // Coverflow: a click on a side card brings it to the centre instead.
            onClickCapture={
              coverflow && i !== active
                ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goTo(i);
                  }
                : undefined
            }
          >
            <div
              className={`flex w-full ${coverflow ? "will-change-transform [transform-style:preserve-3d]" : ""}`}
            >
              {renderSlide(item, { index: i, active: i === active })}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {stopCount > 1 && (
        <div className="mt-9 flex items-center gap-4 sm:gap-6">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {Array.from({ length: stopCount }, (_, n) => {
              const on = n === active;
              return (
                <button
                  key={n}
                  type="button"
                  aria-label={`Go to slide ${n + 1}`}
                  aria-current={on || undefined}
                  onClick={() => goTo(n)}
                  className="group/dot py-2"
                >
                  <span
                    className={`relative block h-1.5 overflow-hidden rounded-full transition-[width,background-color] duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${
                      on ? "w-12 bg-accent/20" : "w-4 bg-border group-hover/dot:bg-border-strong"
                    }`}
                  >
                    {on && (
                      <span
                        key={`${n}-${playing}`}
                        className="absolute inset-0 origin-left rounded-full bg-accent"
                        style={
                          playing
                            ? {
                                animation: `carousel-fill ${autoplay}ms linear forwards`,
                                animationPlayState: holding ? "paused" : "running",
                              }
                            : undefined
                        }
                        onAnimationEnd={() => goTo(active + 1, true)}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <p
            aria-live={playing ? "off" : "polite"}
            className="hidden items-baseline gap-1 font-mono text-[12px] font-medium tabular-nums text-muted sm:flex"
          >
            <span className="relative inline-block h-[1.2em] w-[2ch] overflow-hidden text-fg">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={active}
                  className="absolute inset-0"
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-100%", opacity: 0 }}
                  transition={{ duration: 0.35, ease }}
                >
                  {pad(active + 1)}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="text-faint">/</span>
            {pad(stopCount)}
          </p>

          <div className="flex items-center gap-2">
            {canPlay && (
              <button
                type="button"
                aria-label={stopped ? "Play slideshow" : "Pause slideshow"}
                onClick={() => setStopped((s) => !s)}
                className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-chip hover:text-fg"
              >
                {stopped ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              </button>
            )}
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => goTo(active - 1)}
              disabled={edges.start}
              className={ctrlBtn}
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => goTo(active + 1)}
              disabled={edges.end}
              className={ctrlBtn}
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
