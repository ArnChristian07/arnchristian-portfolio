import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { getPublicContent } from "@/lib/content-store";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function MailLoginPage() {
  const { site } = await getPublicContent();
  return (
    <main className="admin-page flex min-h-screen items-center justify-center bg-gradient-to-b from-bg to-bg-alt px-4 py-16 sm:px-6">
      <div className="w-full max-w-[400px]">
        <p className="flex items-center gap-2.5 font-display text-lg font-semibold text-fg">
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-accent text-accent-fg">
            <Mail className="size-4" />
          </span>
          {site.domain} mail
        </p>
        <h1 className="mt-8 font-display text-4xl font-bold tracking-[-0.02em] text-fg">Your inbox</h1>
        <p className="mt-2 text-[15px] text-muted">Sign in to read messages from your contact form.</p>

        <LoginForm next="/mail" />

        <p className="mt-10 text-center">
          <Link href="/" className="text-sm text-muted underline underline-offset-4 hover:text-fg">
            ← Back to portfolio
          </Link>
        </p>
      </div>
    </main>
  );
}
