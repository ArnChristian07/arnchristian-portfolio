import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import sleeping from "@/public/assets/ankurisu-sleeping.png";
import { getPublicContent } from "@/lib/content-store";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  const { site } = await getPublicContent();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col items-center justify-center bg-[#1a2238] px-10 py-16 lg:flex">
        <div className="admin-rise group relative w-full max-w-[400px]">
          <div className="absolute inset-x-0 bottom-0 top-[5%] -rotate-3 rounded-[32px] bg-[#28385f] transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-rotate-[5deg]" />
          <Image
            src={sleeping}
            alt=""
            preload
            sizes="400px"
            className="relative h-auto w-full"
          />
        </div>
        <p
          className="admin-rise mt-12 max-w-sm text-center text-[15px] leading-relaxed text-slate-300"
          style={{ animationDelay: "200ms" }}
        >
          Manage everything on {site.domain} — projects, skills, experience,
          certificates and posts.
        </p>
      </aside>

      <main className="admin-page flex items-center justify-center bg-gradient-to-b from-bg to-bg-alt px-4 py-16 sm:px-6">
        <div className="w-full max-w-[400px]">
          <p className="flex items-center gap-2.5 font-display text-lg font-semibold text-fg">
            <span aria-hidden className="size-3 rounded-[3px] bg-accent transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] hover:rotate-90" />
            {site.domain}
          </p>
          <h1 className="mt-8 font-display text-4xl font-bold tracking-[-0.02em] text-fg">
            Welcome back
          </h1>
          <p className="mt-2 text-[15px] text-muted">Sign in to edit your portfolio.</p>

          <LoginForm />

          <p className="mt-10 text-center">
            <Link
              href="/"
              className="text-sm text-muted underline underline-offset-4 hover:text-fg"
            >
              ← Back to portfolio
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
