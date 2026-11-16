"use client";

import { useLayoutEffect, type MouseEvent } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function current(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

let revealing = false;

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  // React's dev remount clears attributes set by the inline script; restore them.
  useLayoutEffect(() => {
    let t: string | null = null;
    try {
      t = localStorage.getItem("theme");
    } catch {}
    apply(t === "dark" ? "dark" : "light");
  }, []);

  function toggle(e: MouseEvent<HTMLButtonElement>) {
    const next: Theme = current() === "dark" ? "light" : "dark";
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const commit = () => {
      apply(next);
      try {
        localStorage.setItem("theme", next);
      } catch {}
    };

    if (reduce) return commit();

    // No View Transitions support: fall back to a quick color crossfade.
    if (!document.startViewTransition) {
      root.classList.add("theme-transition");
      commit();
      window.setTimeout(() => root.classList.remove("theme-transition"), 320);
      return;
    }

    // A second click mid-reveal would skip the running transition and snap.
    if (revealing) return;
    revealing = true;

    // Reveal the new theme as a soft-edged circle bursting out of the button.
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    // Mask is solid to 90% of its radius, so oversize it to fully cover corners.
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) / 0.9;

    root.style.setProperty("--vt-x", `${x}px`);
    root.style.setProperty("--vt-y", `${y}px`);
    root.style.setProperty("--vt-r", `${Math.ceil(radius)}px`);
    root.classList.add("theme-reveal");
    const vt = document.startViewTransition(commit);

    const cleanup = () => {
      root.classList.remove("theme-reveal");
      revealing = false;
    };
    vt.finished.then(cleanup, cleanup);
  }

  // Icons swap via CSS so server and client markup always match.
  return (
    <button
      type="button"
      onClick={toggle}
      data-theme-toggle
      aria-label="Toggle dark mode"
      title="Toggle theme"
      className={`group relative grid size-9 place-items-center overflow-hidden rounded-full border border-border text-fg-soft transition-colors hover:border-border-strong hover:text-fg ${className}`}
    >
      <Sun
        className="absolute size-[18px] transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)] dark:-translate-y-6 dark:rotate-90 dark:opacity-0"
        strokeWidth={1.8}
      />
      <Moon
        className="absolute size-[17px] translate-y-6 -rotate-90 opacity-0 transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)] dark:translate-y-0 dark:rotate-0 dark:opacity-100"
        strokeWidth={1.8}
      />
    </button>
  );
}
