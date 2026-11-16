"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { ease } from "@/components/reveal";

import { SECTIONS, missing } from "./content";
import { useAdmin } from "./store";
import { Badge, Card } from "./ui";

export function Overview() {
  const { status, draft, user } = useAdmin();
  const next = status.sections.find((s) => s.issues > 0);
  const shown = SECTIONS.length - draft.site.hidden.length;
  const label = (id: string) => SECTIONS.find((s) => s.id === id)?.label;

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden p-5 sm:p-9">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-[15px] text-muted">Welcome back, {draft.profile.name || user}</p>
            <h1 className="mt-2 font-display text-[1.7rem] font-bold leading-tight tracking-[-0.02em] text-fg sm:text-[2.6rem] sm:leading-[1.1]">
              {status.percent === 100
                ? "Your portfolio is ready to share."
                : `Your portfolio is ${status.percent}% ready to share.`}
            </h1>
            <div
              role="progressbar"
              aria-valuenow={status.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Portfolio readiness"
              className="mt-6 h-2 overflow-hidden rounded-full bg-chip"
            >
              {/* Fills from zero on first paint, then eases to new values as you edit. */}
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${status.percent}%` }}
                transition={{ duration: 1.1, ease, delay: 0.25 }}
              />
            </div>
            <p className="mt-5 text-[15px] text-fg-soft">
              {status.left === 0
                ? "Everything is filled in. Go ahead and share the link."
                : `${status.left} ${status.left === 1 ? "thing is" : "things are"} left to fill in before you share the link.`}
            </p>
            <div className="mt-6 flex flex-col gap-3 *:justify-center sm:flex-row sm:flex-wrap">
              {next && (
                <Link
                  href={next.href}
                  className="group inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-5 text-[15px] font-semibold text-ink-fg transition-[transform,opacity] hover:-translate-y-px hover:opacity-90 active:translate-y-0"
                >
                  Continue with {next.label}
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              )}
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center rounded-xl border border-border-strong px-5 text-[15px] font-semibold text-fg transition-[transform,background-color] hover:-translate-y-px hover:bg-chip active:translate-y-0"
              >
                Preview the site
              </a>
            </div>
          </div>
          <motion.div
            className="group relative hidden w-[230px] md:block"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, ease, delay: 0.15 }}
          >
            <div className="absolute inset-x-2 bottom-2 top-[8%] rotate-3 rounded-[28px] bg-art-card transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:rotate-[5deg]" />
            <Image
              src="/assets/ankurisu.png"
              alt=""
              width={460}
              height={460}
              sizes="230px"
              className="relative h-auto w-full transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-translate-y-1"
            />
          </motion.div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
            <h2 className="font-display text-lg font-semibold text-fg">Sections</h2>
            <p className="text-sm text-muted">
              {shown} of {SECTIONS.length} shown on the site
            </p>
          </div>
          <ul className="admin-rows divide-y divide-border">
            {status.sections.map((s, i) => {
              const hidden = draft.site.hidden.includes(s.id);
              return (
                <li
                  key={s.id}
                  style={{ "--i": i } as CSSProperties}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-bg-alt/60 sm:gap-4 sm:px-6 sm:py-4"
                >
                  <span className="hidden w-6 font-mono text-sm text-faint sm:inline">{String(i).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-fg">
                      {s.label}
                      {hidden && <span className="ml-2 text-sm font-normal text-faint">Hidden</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{s.summary}</p>
                  </div>
                  <span className="hidden sm:inline">
                    <Badge issues={s.issues} />
                  </span>
                  <Link
                    href={s.href}
                    className="shrink-0 rounded-lg border border-border-strong px-3.5 py-1.5 text-sm font-medium text-fg transition-colors hover:border-fg/30 hover:bg-chip"
                    aria-label={`Edit ${s.label}`}
                  >
                    Edit
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card className="p-4 sm:p-6">
            <h2 className="font-display text-lg font-semibold text-fg">Next up</h2>
            {status.tasks.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                Nothing left to do.
              </p>
            ) : (
              <ul className="admin-rows mt-4 space-y-1">
                {status.tasks.map((t, i) => (
                  <li key={t.section + t.text} style={{ "--i": Math.min(i, 8) } as CSSProperties}>
                    <Link
                      href={SECTIONS.find((s) => s.id === t.section)!.href}
                      className="group -mx-2 flex gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-chip"
                    >
                      <span
                        aria-hidden
                        className="mt-0.5 size-[18px] shrink-0 rounded-[5px] border border-border-strong transition-colors duration-300 group-hover:border-accent"
                      />
                      <span>
                        <span className="block text-[15px] leading-snug text-fg">{t.text}</span>
                        <span className="mt-0.5 block text-xs text-muted">{label(t.section)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold text-fg">Site</h2>
              <Link href="/admin/settings" className="text-sm text-accent hover:underline">
                Edit
              </Link>
            </div>
            <dl className="mt-4 space-y-3 text-[15px]">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Address</dt>
                <dd className="font-medium text-fg">{draft.site.domain}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Accent</dt>
                <dd className="flex items-center gap-2 font-medium text-fg">
                  <span className="size-3.5 rounded" style={{ background: draft.site.accent }} />
                  {draft.site.accent}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-muted">Contact email</dt>
                <dd className="min-w-0 truncate font-medium text-fg">
                  {missing(draft.contact.email) ? "Not set" : draft.contact.email}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
