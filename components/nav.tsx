"use client";

import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ThemeToggle } from "./theme-toggle";
import { ease } from "./reveal";

/** A section on the home page, or a separate page when `href` is set. */
type NavLink = { id: string; label: string; href?: string };

function lockScroll(lock: boolean) {
  const v = lock ? "hidden" : "";
  document.documentElement.style.overflow = v;
  document.body.style.overflow = v;
}

export function Nav({
  domain,
  links: navLinks,
  showContact,
  home = "",
}: {
  domain: string;
  links: NavLink[];
  showContact: boolean;
  /**
   * Prefix for section links. Empty on the home page ("#about"); "/" on other
   * pages so the links go back to the home page sections ("/#about").
   */
  home?: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the section currently crossing the upper third of the viewport.
  useEffect(() => {
    const els = navLinks
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    const onTop = () => window.scrollY < 200 && setActive(null);
    window.addEventListener("scroll", onTop, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onTop);
    };
  }, [navLinks]);

  // While the menu is open: lock page scroll, close on Escape, close when the
  // viewport grows to desktop width, and move focus into the menu.
  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const mq = window.matchMedia("(min-width: 1024px)");
    const onWide = (e: MediaQueryListEvent) => e.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onWide);
    menuRef.current?.querySelector<HTMLAnchorElement>("a")?.focus({ preventScroll: true });
    return () => {
      lockScroll(false);
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onWide);
    };
  }, [open]);

  // Unlock scrolling *before* navigating; otherwise the locked page can't jump.
  // When the section isn't on this page, the link navigates normally.
  function go(id: string) {
    return (e: MouseEvent<HTMLAnchorElement>) => {
      lockScroll(false);
      setOpen(false);
      if (!document.getElementById(id)) return;
      e.preventDefault();
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (!el) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        history.replaceState(null, "", `#${id}`);
      });
    };
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        open
          ? "border-b border-border bg-bg"
          : scrolled
          ? "border-b border-border bg-bg/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href={`${home}#top`} className="group flex items-center gap-2 font-display text-[15px] font-semibold tracking-tight text-fg">
          <span className="size-2.5 rounded-[3px] bg-accent transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:rotate-90" />
          {domain}
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <li key={l.id}>
              <a
                href={l.href ?? `${home}#${l.id}`}
                className={`relative block px-3 py-2 text-[13px] transition-colors ${
                  active === l.id ? "text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {l.label}
                {active === l.id && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-3 -bottom-px h-px bg-accent"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {showContact && (
            <a
              href={`${home}#contact`}
              className="hidden rounded-lg bg-ink px-4 py-2 text-[13px] font-medium text-ink-fg ring-1 ring-transparent transition-[transform,background-color] hover:-translate-y-px active:translate-y-0 dark:bg-accent dark:text-accent-fg dark:hover:bg-accent-hover lg:inline-block"
            >
              Get in touch
            </a>
          )}
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-9 place-items-center rounded-full border border-border text-fg lg:hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={open ? "x" : "m"}
                initial={{ opacity: 0, rotate: -45 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 45 }}
                transition={{ duration: 0.18 }}
              >
                {open ? <X className="size-[18px]" /> : <Menu className="size-[18px]" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            id="mobile-menu"
            // Clip-path wipe instead of height:auto — animating to "auto" makes Motion
            // measure the DOM and restore the old scroll position, cancelling
            // the scroll to the tapped section.
            initial={{ opacity: 0, clipPath: "inset(0% 0% 100% 0%)" }}
            animate={{ opacity: 1, clipPath: "inset(0% 0% 0% 0%)" }}
            exit={{ opacity: 0, clipPath: "inset(0% 0% 100% 0%)" }}
            transition={{ duration: 0.35, ease }}
            className="overflow-hidden border-t border-border lg:hidden"
          >
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } } }}
              className="flex h-[calc(100dvh-4rem)] flex-col px-4 pb-8 pt-4"
            >
              {navLinks.map((l, i) => (
                <motion.li
                  key={l.id}
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.4, ease }}
                >
                  <a
                    href={l.href ?? `${home}#${l.id}`}
                    onClick={go(l.id)}
                    aria-current={active === l.id ? "true" : undefined}
                    className={`flex items-baseline gap-4 border-b border-border py-4 font-display text-2xl font-semibold tracking-tight transition-colors active:text-accent ${
                      active === l.id ? "text-accent" : "text-fg"
                    }`}
                  >
                    <span className="font-mono text-xs font-medium text-accent">0{i + 1}</span>
                    {l.label}
                    {active === l.id && <span className="ml-auto size-1.5 self-center rounded-full bg-accent" />}
                  </a>
                </motion.li>
              ))}
              {showContact && (
                <motion.li
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                  className="mt-6"
                >
                  <a
                    href={`${home}#contact`}
                    onClick={go("contact")}
                    className="block rounded-xl bg-accent py-3.5 text-center text-sm font-medium text-accent-fg"
                  >
                    Get in touch
                  </a>
                </motion.li>
              )}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
