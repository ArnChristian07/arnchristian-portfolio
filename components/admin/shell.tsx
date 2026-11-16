"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, Inbox, LoaderCircle, LogOut, Menu } from "lucide-react";
import { logout } from "@/app/admin/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { MotionProvider } from "@/components/reveal";
import { SECTIONS, type Content } from "./content";
import { ConfirmProvider, Modal, useConfirm } from "./modal";
import { AdminProvider, useAdmin } from "./store";

export function AdminShell({
  user,
  initial,
  exists,
  updatedAt,
  unread,
  children,
}: {
  user: string;
  initial: Content;
  exists: boolean;
  updatedAt: string | null;
  /** Unread contact-form messages, shown next to "Messages" in the nav. */
  unread: number;
  children: ReactNode;
}) {
  return (
    <AdminProvider user={user} initial={initial} exists={exists} updatedAt={updatedAt}>
      <ConfirmProvider>
        <MotionProvider>
          <Frame unread={unread}>{children}</Frame>
        </MotionProvider>
      </ConfirmProvider>
    </AdminProvider>
  );
}

function Frame({ unread, children }: { unread: number; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // The drawer is only for narrow screens; close it if the window grows past lg.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setMenuOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      {/* Desktop sidebar: full height, stays put while the content scrolls. */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
          <Brand />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <Nav unread={unread} />
        </div>
        <Account />
      </aside>

      <div className="flex min-w-0 flex-col">
        <TopBar onMenu={() => setMenuOpen(true)} />
        <Notices />
        <main className="mx-auto w-full max-w-[1080px] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pt-9">
          {/* Keyed so the enter animation in globals.css replays on each route. */}
          <div key={pathname} className="admin-page">
            {children}
          </div>
        </main>
      </div>

      <SaveBar />

      {/* Mobile / tablet nav drawer. */}
      <Modal
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        variant="drawer"
        title={<Brand static />}
      >
        <div className="flex h-full flex-col">
          <div className="flex-1">
            <Nav unread={unread} onNavigate={() => setMenuOpen(false)} />
          </div>
          <div className="-mx-3 -mb-3 mt-4">
            <Account />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Brand({ static: isStatic }: { static?: boolean }) {
  const inner = (
    <>
      <span
        aria-hidden
        className="size-3 shrink-0 rounded-[3px] bg-accent transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:rotate-90"
      />
      <span className="truncate">Admin Panel</span>
    </>
  );
  const cls = "group flex min-w-0 items-center gap-2.5 font-display text-[16px] font-semibold text-fg";
  return isStatic ? (
    <span className={cls}>{inner}</span>
  ) : (
    <Link href="/admin" className={cls}>
      {inner}
    </Link>
  );
}

function Nav({ unread, onNavigate }: { unread: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { status, edited } = useAdmin();
  // Sidebar and drawer each render a Nav; give each its own indicator.
  const pillId = useId();

  const item = (active: boolean) =>
    `relative flex items-center gap-3 rounded-lg px-3 py-2 text-[14.5px] transition-colors duration-200 ${
      active ? "font-medium text-accent" : "text-fg-soft hover:bg-chip hover:text-fg"
    }`;
  const link = (href: string, children: ReactNode) => {
    const active = pathname === href;
    return (
      <Link href={href} onClick={onNavigate} className={item(active)} aria-current={active ? "page" : undefined}>
        {active && (
          <motion.span
            layoutId={pillId}
            aria-hidden
            className="absolute inset-0 rounded-lg bg-accent-soft"
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
          />
        )}
        <span className="relative flex min-w-0 flex-1 items-center gap-3">{children}</span>
      </Link>
    );
  };

  return (
    <nav aria-label="Admin" className="space-y-0.5">
      {link(
        "/admin",
        <>
          Overview
        </>,
      )}
      {link(
        "/admin/messages",
        <>
          <Inbox className="size-4 shrink-0" />
          <span className="flex-1">Messages</span>
          {unread > 0 && (
            <span className="rounded-full bg-accent px-1.5 py-px text-[11px] font-semibold tabular-nums text-accent-fg">
              {unread > 99 ? "99+" : unread}
              <span className="sr-only"> unread</span>
            </span>
          )}
        </>,
      )}

      <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-faint">Sections</p>
      {status.sections.map((s) => (
        <div key={s.id}>
          {link(
            s.href,
            <>
              <span className="flex-1 truncate">{s.label}</span>
              {edited.includes(s.id) && <EditedDot />}
              {s.count !== null && <span className="text-xs tabular-nums text-faint">{s.count}</span>}
            </>,
          )}
        </div>
      ))}

      <div className="!my-3 border-t border-border" />
      {link(
        "/admin/settings",
        <>
          <span className="flex-1">Settings</span>
          {edited.includes("settings") && <EditedDot />}
        </>,
      )}
    </nav>
  );
}

function EditedDot() {
  return (
    <span title="Unsaved changes" className="flex items-center">
      <span aria-hidden className="size-1.5 rounded-full bg-amber-400" />
      <span className="sr-only">(unsaved changes)</span>
    </span>
  );
}

function Account() {
  const { dirty } = useAdmin();
  const confirm = useConfirm();
  const form = useRef<HTMLFormElement>(null);

  async function signOut() {
    const ok = await confirm(
      dirty
        ? {
            title: "Log out with unsaved changes?",
            body: "Your unsaved edits will be lost. Save first if you want to keep them.",
            confirmLabel: "Log out anyway",
            tone: "danger",
          }
        : {
            title: "Log out?",
            body: "You'll need to sign in again to make changes.",
            confirmLabel: "Log out",
            tone: "danger",
          },
    );
    if (!ok) return;
    form.current?.requestSubmit();
  }

  return (
    <form ref={form} action={logout} className="shrink-0 border-t border-border p-3">
      <button
        type="button"
        onClick={() => void signOut()}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14.5px] text-fg-soft transition-colors hover:bg-chip hover:text-red-600"
      >
        <LogOut className="size-4" />
        Logout
      </button>
    </form>
  );
}

function Notices() {
  // Save/upload results show as toasts; this banner is only for standing notices.
  const { migrated, stored } = useAdmin();
  const text = migrated
    ? "Loaded the edits this browser saved before the move to Firestore. Save to publish them."
    : !stored
      ? "Nothing is published yet, so the live site is empty. Fill in your sections and save to publish them."
      : null;
  if (!text) return null;
  return (
    <div role="status" className="border-b border-border bg-accent-soft px-4 py-2.5 text-center text-sm text-fg-soft sm:px-6">
      {text}
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const page =
    pathname === "/admin"
      ? "Overview"
      : pathname === "/admin/settings"
        ? "Settings"
        : pathname === "/admin/messages"
          ? "Messages"
          : (SECTIONS.find((s) => s.href === pathname)?.label ?? "Admin");

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open menu"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-fg-soft hover:bg-chip lg:hidden"
        >
          <Menu className="size-5" />
        </button>

        <div className="min-w-0">
          <p className="truncate font-display text-[16px] font-semibold text-fg">{page}</p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            aria-label="View site"
            title="View site"
            className="group grid size-9 place-items-center rounded-lg text-fg-soft transition-colors hover:bg-chip sm:flex sm:h-9 sm:w-auto sm:gap-1.5 sm:border sm:border-border-strong sm:px-3 sm:text-sm sm:font-medium sm:text-fg"
          >
            <span className="hidden sm:inline">View site</span>
            <ExternalLink className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:size-3.5 sm:text-faint" />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/**
 * Floating bar, bottom-center of the content area, shown only while there are
 * unsaved edits. Save results then appear as toasts at the side.
 */
function SaveBar() {
  const { dirty, saving, save, discard, edited } = useAdmin();
  const confirm = useConfirm();
  const show = dirty || saving;
  const names = edited.map((id) => (id === "settings" ? "Settings" : SECTIONS.find((s) => s.id === id)!.label));
  const where = names.length > 2 ? `${names.length} sections` : names.join(", ");

  // Ctrl/Cmd+S saves (but not while a modal form is open, since its edits aren't applied yet).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && !saving && !document.querySelector("dialog[open]")) save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, dirty, saving]);

  async function onDiscard() {
    const yes = await confirm({
      title: "Discard unsaved changes?",
      body: "Every edit since your last save will be undone. This can’t be reversed.",
      confirmLabel: "Discard changes",
      tone: "danger",
    });
    if (yes) discard();
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 lg:left-[264px]">
      <AnimatePresence>
        {show && (
          <motion.div
            role="region"
            aria-label="Unsaved changes"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-2xl bg-ink py-2 pl-4 pr-2 text-ink-fg shadow-lift ring-1 ring-white/10"
          >
            <p aria-live="polite" className="mr-auto flex min-w-0 items-center gap-2 text-sm">
              {saving ? (
                <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin opacity-80" />
              ) : (
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-amber-400" />
              )}
              <span className="truncate">
                {saving ? (
                  "Publishing…"
                ) : (
                  <>
                    Unsaved<span className="text-ink-fg/60"> · {where}</span>
                  </>
                )}
              </span>
            </p>
            <button
              type="button"
              onClick={() => void onDiscard()}
              disabled={saving}
              className="h-9 shrink-0 rounded-lg px-3 text-sm font-medium text-ink-fg/75 transition-[color,background-color] hover:bg-white/10 hover:text-ink-fg disabled:pointer-events-none disabled:opacity-40"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="h-9 shrink-0 rounded-lg bg-accent px-3.5 text-sm font-semibold text-accent-fg transition-[transform,background-color,opacity] duration-200 hover:-translate-y-px hover:bg-accent-hover active:translate-y-0 disabled:pointer-events-none disabled:opacity-60"
            >
              Save & publish
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
