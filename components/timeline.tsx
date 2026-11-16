"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { useRef } from "react";
import type { Content } from "./admin/content";
import { ease } from "./reveal";

export function Timeline({ items }: { items: Content["experience"] }) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });

  return (
    <ol ref={ref} className="relative space-y-5 pl-8 sm:pl-10">
      {/* rail + scroll-linked fill */}
      <span aria-hidden className="absolute bottom-6 left-[7px] top-6 w-px bg-border sm:left-[9px]" />
      <motion.span
        aria-hidden
        style={{ scaleY: fill }}
        className="absolute bottom-6 left-[7px] top-6 w-px origin-top bg-accent sm:left-[9px]"
      />

      {items.map((x, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "0px 0px -15% 0px" }}
          transition={{ duration: 0.7, ease, delay: i * 0.05 }}
          className="relative"
        >
          <span
            aria-hidden
            className={`absolute -left-8 top-6 grid size-[15px] place-items-center rounded-full border sm:-left-10 sm:size-[19px] ${
              x.current ? "border-accent bg-accent" : "border-border-strong bg-bg"
            }`}
          >
            {x.current && <span className="size-[5px] rounded-full bg-accent-fg sm:size-1.5" />}
          </span>
          <div className="rounded-xl border border-border bg-card p-5 shadow-card transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-border-strong sm:p-6">
            <p className="font-mono text-[11px] uppercase tracking-wider text-faint">{x.period}</p>
            <h3 className="mt-1.5 font-display text-[15px] font-semibold text-fg sm:text-base">{x.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{x.body}</p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
