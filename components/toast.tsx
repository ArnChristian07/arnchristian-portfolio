"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";

// Tiny global toast store. Call `toast.success("…")` / `toast.error("…")`
// from any client code; <Toaster /> (mounted in the root layout) renders them.
// They stack at the top-right, clear of the admin's bottom save bar.

type Tone = "success" | "error" | "info";
type Action = { label: string; onClick: () => void };
type Toast = { id: number; tone: Tone; message: string; duration: number; action?: Action };
type Opts = { duration?: number; action?: Action };

const MAX_VISIBLE = 4;
const DEFAULT_DURATION: Record<Tone, number> = {
  success: 3500,
  info: 4000,
  error: 6000,
};

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const EMPTY: Toast[] = [];

function emit() {
  for (const l of listeners) l();
}

function push(tone: Tone, message: string, opts?: Opts) {
  const id = nextId++;
  const t: Toast = {
    id,
    tone,
    message,
    // Toasts with an action (Undo) stay a little longer so there's time to reach it.
    duration: opts?.duration ?? DEFAULT_DURATION[tone] + (opts?.action ? 2500 : 0),
    action: opts?.action,
  };
  // Same message already showing? Replace it rather than stacking duplicates.
  toasts = [...toasts.filter((x) => !(x.tone === tone && x.message === message)), t].slice(-MAX_VISIBLE);
  emit();
  return id;
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (message: string, opts?: Opts) => push("success", message, opts),
  error: (message: string, opts?: Opts) => push("error", message, opts),
  info: (message: string, opts?: Opts) => push("info", message, opts),
  dismiss,
};

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function Toaster() {
  const list = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => EMPTY,
  );

  return (
    <MotionConfig reducedMotion="user">
      {/* Stacked at the side, just under the header (full width on phones). */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:inset-x-auto sm:right-0 sm:items-end sm:px-6 sm:pt-20"
      >
        <AnimatePresence initial={false}>
          {list.map((t) => (
            <ToastItem key={t.id} toast={t} />
          ))}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

const TONES: Record<Tone, { icon: typeof Info; iconClass: string; bar: string }> = {
  success: { icon: CircleCheck, iconClass: "text-emerald-500", bar: "bg-emerald-500" },
  error: { icon: CircleAlert, iconClass: "text-red-500", bar: "bg-red-500" },
  info: { icon: Info, iconClass: "text-accent", bar: "bg-accent" },
};

function ToastItem({ toast: t }: { toast: Toast }) {
  const { icon: Icon, iconClass, bar } = TONES[t.tone];
  const remaining = useRef(t.duration);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function start() {
    startedAt.current = Date.now();
    timer.current = setTimeout(() => dismiss(t.id), remaining.current);
  }
  function pause() {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = null;
    remaining.current -= Date.now() - startedAt.current;
  }

  useEffect(() => {
    start();
    return pause;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per toast
  }, []);

  return (
    <motion.div
      layout
      role={t.tone === "error" ? "alert" : "status"}
      initial={{ opacity: 0, x: 24, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.98, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      onMouseEnter={pause}
      onMouseLeave={start}
      onFocus={pause}
      onBlur={start}
      className="pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border border-border bg-card py-3 pl-3.5 pr-2 text-sm text-fg shadow-lift"
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <Icon aria-hidden className={`mt-px size-[18px] shrink-0 ${iconClass}`} />
      <p className="min-w-0 flex-1 break-words leading-snug">{t.message}</p>
      {t.action && (
        <button
          type="button"
          onClick={() => {
            t.action!.onClick();
            dismiss(t.id);
          }}
          className="-my-1 h-7 shrink-0 rounded-md px-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
        >
          {t.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => dismiss(t.id)}
        aria-label="Dismiss notification"
        className="-my-1 grid size-7 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-chip hover:text-fg"
      >
        <X className="size-4" />
      </button>
    </motion.div>
  );
}
