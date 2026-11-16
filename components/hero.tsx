"use client";

import Image from "next/image";
import art from "@/public/assets/ankurisu.png";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { Mail } from "lucide-react";
import type { CSSProperties, PointerEvent } from "react";
import { GithubIcon, LinkedinIcon } from "./icons";
import type { Content } from "./admin/content";

// Entrance animations are CSS (globals.css: .hero-up/.hero-line/.hero-art) so
// they start at first paint instead of waiting for hydration; the headline and
// art are the page's LCP candidates.

// Grid-line pulses: `n` is the line offset (in 44px cells) from the line
// nearest the grid's bright spot, so beams stay where the grid is visible.
const BEAMS = [
  { dir: "v", n: -8, dur: 6, delay: -1 },
  { dir: "v", n: -5, dur: 7, delay: -3.5 },
  { dir: "v", n: -2, dur: 8, delay: -5 },
  { dir: "v", n: 3, dur: 9, delay: -4 },
  { dir: "v", n: 7, dur: 8, delay: -6.5 },
  { dir: "h", n: -4, dur: 7.5, delay: -2 },
  { dir: "h", n: -1, dur: 9, delay: -0.5 },
  { dir: "h", n: 3, dur: 8.5, delay: -5.5 },
] as const;

const isLink =(href: string) => !!href.trim() && href.trim() !== "#";

export function Hero({
  profile,
  contact,
  showProjects,
}: {
  profile: Content["profile"];
  contact: Content["contact"];
  showProjects: boolean;
}) {
  // Fallbacks keep the hero complete before anything is saved in the admin.
  const headline = profile.headline.split("\n").map((l) => l.trim()).filter(Boolean);
  const lines = headline.length
    ? headline
    : [profile.name.trim() ? `Hi, I’m ${profile.name.trim()}.` : "Hi, welcome.", "I build for the web"];
  const tagline =
    profile.tagline.trim() ||
    "I make web and mobile apps, and I’m always learning how things work so I can build them better.";
  const socials = [
    { label: "GitHub", href: contact.github, Icon: GithubIcon },
    { label: "LinkedIn", href: contact.linkedin, Icon: LinkedinIcon },
    { label: "Email", href: contact.email.trim() ? `mailto:${contact.email.trim()}` : "", Icon: Mail },
  ].filter((l) => isLink(l.href));
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 120, damping: 20, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 120, damping: 20, mass: 0.6 });
  const rotY = useTransform(sx, [-0.5, 0.5], [-5, 5]);
  const rotX = useTransform(sy, [-0.5, 0.5], [4, -4]);
  const artX = useTransform(sx, [-0.5, 0.5], [-10, 10]);
  const artY = useTransform(sy, [-0.5, 0.5], [-6, 6]);

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() {
    px.set(0);
    py.set(0);
  }

  return (
    <section
      id="top"
      className="relative overflow-hidden bg-gradient-to-b from-[var(--hero-from)] to-[var(--hero-to)] pt-16"
    >
      {/* faint grid, masked so it only sits behind the art */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(var(--hero-grid)_1px,transparent_1px),linear-gradient(90deg,var(--hero-grid)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_50%_60%_at_75%_45%,black,transparent_75%)]"
      />
      {/* light pulses running along the grid lines, under the same mask */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_50%_60%_at_75%_45%,black,transparent_75%)]"
      >
        {BEAMS.map((b, i) => (
          <span
            key={i}
            className={b.dir === "v" ? "grid-beam-v" : "grid-beam-h"}
            style={{ "--n": b.n, "--dur": `${b.dur}s`, "--delay": `${b.delay}s` } as CSSProperties}
          />
        ))}
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 pb-20 pt-6 sm:px-6 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
          {profile.availability.trim() && (
            <span className="hero-up mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-fg-soft shadow-card">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-50 [animation-duration:2.4s]" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              {profile.availability}
            </span>
          )}

          {lines.length > 0 && (
          <h1 className="font-display text-[2.6rem] font-bold leading-[1.02] tracking-[-0.03em] text-fg sm:text-6xl lg:text-[4.1rem]">
            {lines.map((line, i) => (
              <span key={i} className="block overflow-hidden pb-[0.06em]">
                <span className="hero-line block" style={{ animationDelay: `${0.1 + i * 0.09}s` }}>
                  {line}
                  {i === lines.length - 1 && (
                    <span className="text-accent">.</span>
                  )}
                </span>
              </span>
            ))}
          </h1>
          )}

          <p
            className="hero-up mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-muted sm:text-base lg:mx-0"
            style={{ animationDelay: "0.45s" }}
          >
            {tagline}
          </p>

          {(showProjects || isLink(contact.resume)) && (
          <div className="hero-up mt-8 flex flex-wrap justify-center gap-3 lg:justify-start" style={{ animationDelay: "0.55s" }}>
            {showProjects && (
            <a
              href="#projects"
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg shadow-[0_6px_16px_-6px_color-mix(in_oklab,var(--accent)_70%,transparent)] transition-[transform,background-color] hover:-translate-y-px hover:bg-accent-hover active:translate-y-0"
            >
              View projects
            </a>
            )}
            {isLink(contact.resume) && (
            <a
              href={contact.resume}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border-strong bg-card px-5 py-2.5 text-sm font-medium text-fg transition-[transform,border-color] hover:-translate-y-px hover:border-fg/30 active:translate-y-0"
            >
              Download resume
            </a>
            )}
          </div>
          )}

          {socials.length > 0 && (
          <ul
            className="hero-up mt-8 flex flex-wrap items-center justify-center gap-5 text-[13px] text-muted lg:justify-start"
            style={{ animationDelay: "0.65s" }}
          >
            {socials.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  className="group flex items-center gap-1.5 transition-colors hover:text-fg"
                >
                  <Icon
                    className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5"
                    strokeWidth={1.8}
                  />
                  {label}
                </a>
              </li>
            ))}
          </ul>
          )}
        </div>

        {/* Art */}
        <div
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          className="hero-art relative order-first mx-auto aspect-[1/0.92] w-full max-w-[340px] [perspective:1200px] sm:max-w-[440px] lg:order-none lg:max-w-[520px] lg:mr-0"
        >
          <motion.div
            style={{ rotateX: rotX, rotateY: rotY }}
            className="absolute inset-0 [transform-style:preserve-3d]"
          >
            <div className="absolute inset-x-[10%] inset-y-[6%] rotate-[3deg] lg:left-[22%] lg:right-[3%] rounded-[28px] bg-art-card shadow-lift ring-1 ring-inset ring-fg/5">
              <span aria-hidden className="edge-glow">
                <span className="edge-light" />
              </span>
              <span aria-hidden className="edge-light" />
            </div>
            <motion.div
              style={{ x: artX, y: artY }}
              className="absolute inset-0"
            >
              <Image
                src={art}
                alt="Illustration of Kurisu sitting on a desk with a laptop"
                fill
                preload
                sizes="(min-width: 1024px) 520px, (min-width: 640px) 440px, 340px"
                className="scale-[1.12] object-contain object-center drop-shadow-[0_18px_24px_rgb(15_23_42/0.18)]"
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
