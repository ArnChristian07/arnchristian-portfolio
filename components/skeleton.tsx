import type { ReactNode } from "react";

/** A shimmering placeholder block. Size and shape come from `className`. */
export function Skeleton({ className = "", width }: { className?: string; width?: string }) {
  return <div aria-hidden className={`skeleton rounded-md ${className}`} style={width ? { width } : undefined} />;
}

function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

/** Mirrors the admin dashboard while the session and content load. */
export function AdminSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading dashboard…</span>
      <div className="min-h-screen lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
        <div className="hidden h-screen flex-col border-r border-border bg-card lg:flex">
          <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <div className="space-y-1.5 p-3">
            {Array.from({ length: 11 }, (_, i) => (
              <Skeleton key={i} className="h-9 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex h-16 items-center gap-3 border-b border-border bg-card/90 px-3 sm:px-6 lg:px-10">
            <Skeleton className="size-9 rounded-lg lg:hidden" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-9 w-20 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        <div className="mx-auto max-w-[1080px] space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-9">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-4 h-10 w-full max-w-lg" />
            <Skeleton className="mt-6 h-2 w-full rounded-full" />
            <Skeleton className="mt-6 h-11 w-52 rounded-xl" />
          </div>
          <div className="space-y-3 rounded-2xl border border-border bg-card p-6">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

/** Mirrors the portfolio's layout while its content loads from Firestore. */
export function PortfolioSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading portfolio…</span>

      {/* nav */}
      <div className="fixed inset-x-0 top-0 z-50 border-b border-transparent">
        <Container className="flex h-16 items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <div className="hidden gap-6 md:flex">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-3 w-14" />
            ))}
          </div>
          <Skeleton className="size-9 rounded-full" />
        </Container>
      </div>

      {/* hero */}
      <section className="bg-gradient-to-b from-[var(--hero-from)] to-[var(--hero-to)] pt-16">
        <Container className="grid items-center gap-12 pb-20 pt-12 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-28 lg:pt-20">
          <div className="max-w-xl">
            <Skeleton className="h-7 w-56 rounded-full" />
            <Skeleton className="mt-6 h-12 w-full sm:h-16" />
            <Skeleton className="mt-3 h-12 w-4/5 sm:h-16" />
            <Skeleton className="mt-6 h-4 w-full max-w-md" />
            <Skeleton className="mt-2.5 h-4 w-3/4 max-w-md" />
            <div className="mt-8 flex gap-3">
              <Skeleton className="h-10 w-32 rounded-lg" />
              <Skeleton className="h-10 w-40 rounded-lg" />
            </div>
          </div>
          <Skeleton className="mx-auto aspect-[1/0.92] w-full max-w-[520px] rounded-[28px] lg:mr-0" />
        </Container>
      </section>

      {/* about */}
      <section className="py-20 sm:py-28">
        <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.5fr] lg:gap-16">
          <div>
            <Skeleton className="mx-auto aspect-[4/5] w-full max-w-[280px] rounded-2xl lg:mx-0" />
            <Skeleton className="mt-10 h-3 w-28" />
            <Skeleton className="mt-4 h-8 w-64" />
          </div>
          <div className="space-y-3">
            {[100, 96, 88, 100, 92, 70].map((w, i) => (
              <Skeleton key={i} className="h-4" width={`${w}%`} />
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
