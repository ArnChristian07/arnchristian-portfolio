"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { LayoutDashboard, LogOut, Mail } from "lucide-react";
import { logout } from "@/app/admin/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { MotionProvider } from "@/components/reveal";
import { ConfirmProvider, useConfirm } from "./modal";

/** Minimal frame for the standalone /mail inbox: a top bar and the content. */
export function MailShell({ user, children }: { user: string; children: ReactNode }) {
  return (
    <ConfirmProvider>
      <MotionProvider>
        <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/75">
          <div className="mx-auto flex h-16 w-full max-w-[880px] items-center gap-2 px-4 sm:gap-3 sm:px-6">
            <Link href="/mail" className="flex min-w-0 items-center gap-2.5 font-display text-[16px] font-semibold text-fg">
              <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-accent-fg">
                <Mail className="size-3.5" />
              </span>
              <span className="truncate">Mail</span>
            </Link>
            <span className="hidden truncate text-sm text-faint sm:inline">· {user}</span>

            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Link
                href="/admin"
                aria-label="Admin panel"
                title="Admin panel"
                className="grid size-9 place-items-center rounded-lg text-fg-soft transition-colors hover:bg-chip sm:flex sm:h-9 sm:w-auto sm:gap-1.5 sm:border sm:border-border-strong sm:px-3 sm:text-sm sm:font-medium sm:text-fg"
              >
                <LayoutDashboard className="size-4 sm:size-3.5 sm:text-faint" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
              <ThemeToggle />
              <SignOut />
            </div>
          </div>
        </header>
        <main className="admin-page mx-auto w-full max-w-[880px] px-4 pb-20 pt-6 sm:px-6 sm:pt-9">{children}</main>
      </MotionProvider>
    </ConfirmProvider>
  );
}

function SignOut() {
  const confirm = useConfirm();
  const form = useRef<HTMLFormElement>(null);

  async function signOut() {
    const ok = await confirm({
      title: "Log out?",
      body: "You'll need to sign in again to read your mail. This also signs you out of the admin panel.",
      confirmLabel: "Log out",
      tone: "danger",
    });
    if (ok) form.current?.requestSubmit();
  }

  return (
    <form ref={form} action={logout}>
      <input type="hidden" name="next" value="/mail" />
      <button
        type="button"
        onClick={() => void signOut()}
        aria-label="Log out"
        title="Log out"
        className="grid size-9 place-items-center rounded-lg text-fg-soft transition-colors hover:bg-chip hover:text-red-600"
      >
        <LogOut className="size-4" />
      </button>
    </form>
  );
}
