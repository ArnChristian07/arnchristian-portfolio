"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";

// Built on the native <dialog> element: showModal() gives us the top layer,
// a focus trap, inert page content and Esc handling without extra libraries.

type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: Size;
  /** "drawer" slides in from the left edge (used for the mobile nav). */
  variant?: "center" | "drawer";
  /** Clicking the dimmed backdrop closes the modal. Off for forms, so a stray click can't lose typing. */
  dismissible?: boolean;
  hideClose?: boolean;
};

export function Modal(props: ModalProps) {
  // Mounted while open, plus the length of the exit animation after closing.
  // Mounting fresh on each opening still means each opening starts with fresh state.
  const [mounted, setMounted] = useState(props.open);
  // The last props seen while open, so the content stays put while it animates out.
  const [shown, setShown] = useState(props);

  if (props.open && !mounted) setMounted(true);
  if (props.open && shown !== props) setShown(props);

  if (!mounted) return null;
  return (
    <ModalInner
      {...(props.open ? props : shown)}
      closing={!props.open}
      onExited={() => setMounted(false)}
    />
  );
}

/** Matches the longest exit animation in globals.css, as a fallback for animationend. */
const EXIT_MS = 220;

function ModalInner({
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  variant = "center",
  dismissible = true,
  hideClose,
  closing,
  onExited,
}: ModalProps & { closing: boolean; onExited: () => void }) {
  const exitedRef = useRef(onExited);
  useEffect(() => {
    exitedRef.current = onExited;
  }, [onExited]);

  // Unmount once the exit animation ends; the timer covers reduced motion
  // (no animation, so no animationend) and any missed event.
  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => exitedRef.current(), EXIT_MS + 60);
    return () => clearTimeout(t);
  }, [closing]);

  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pressedBackdrop = useRef(false);
  const closeRef = useRef(onClose);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    dialog.showModal();

    // Focus a marked element, else the first field, rather than the close button.
    const target =
      dialog.querySelector<HTMLElement>("[data-autofocus]") ??
      bodyRef.current?.querySelector<HTMLElement>("input:not([type=hidden]):not(.sr-only), textarea, select");
    target?.focus();

    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    const onCancel = (e: Event) => {
      e.preventDefault();
      closeRef.current();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      if (dialog.open) dialog.close();
      root.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, []);

  const drawer = variant === "drawer";

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      data-closing={closing || undefined}
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget && e.animationName.endsWith("-out") && e.animationName !== "backdrop-out") onExited();
      }}
      onMouseDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (dismissible && pressedBackdrop.current && e.target === e.currentTarget) onClose();
        pressedBackdrop.current = false;
      }}
      className={`admin-dialog border-0 bg-transparent p-0 text-fg backdrop:bg-slate-950/50 backdrop:backdrop-blur-[2px] ${
        drawer
          ? "admin-drawer m-0 h-dvh max-h-none w-[300px] max-w-[85vw]"
          : // Phones: a sheet pinned to the bottom edge. sm+: a centered card.
            `admin-sheet mx-0 mb-0 mt-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-none sm:m-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] ${SIZES[size]}`
      }`}
    >
      <div
        className={`flex flex-col overflow-hidden border-border bg-card shadow-lift ${
          drawer
            ? "h-full border-r"
            : "max-h-[calc(100dvh-1.5rem)] rounded-t-2xl border-x border-t sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:border"
        }`}
      >
        <div className="flex items-start gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-lg font-semibold leading-snug text-fg">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          {!hideClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-chip hover:text-fg"
            >
              <X className="size-[18px]" />
            </button>
          )}
        </div>
        {children !== undefined && (
          <div ref={bodyRef} className={`min-h-0 flex-1 overflow-y-auto ${drawer ? "p-3" : "px-5 py-5 sm:px-6"}`}>
            {children}
          </div>
        )}
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-bg-alt/60 px-5 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3.5 *:max-sm:flex-1 sm:px-6 sm:pb-3.5">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}

/* --------------------------------------------------------------- buttons -- */

const BTN = "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-50";

export const buttonCls = {
  primary: `${BTN} bg-accent text-accent-fg hover:bg-accent-hover`,
  secondary: `${BTN} border border-border-strong text-fg hover:bg-chip`,
  danger: `${BTN} bg-red-600 text-white hover:bg-red-700`,
};

/* --------------------------------------------------------------- confirm -- */

export type ConfirmOptions = {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmCtx = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Promise-based replacement for window.confirm(), rendered as a modal. */
export function useConfirm() {
  const fn = useContext(ConfirmCtx);
  if (!fn) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return fn;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending((prev) => {
          prev?.resolve(false);
          return { ...o, resolve };
        });
      }),
    [],
  );

  const settle = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const danger = pending?.tone === "danger";

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal
        open={!!pending}
        onClose={() => settle(false)}
        size="sm"
        hideClose
        title={pending?.title}
        footer={
          <>
            <button type="button" data-autofocus onClick={() => settle(false)} className={buttonCls.secondary}>
              {pending?.cancelLabel ?? "Cancel"}
            </button>
            <button type="button" onClick={() => settle(true)} className={danger ? buttonCls.danger : buttonCls.primary}>
              {pending?.confirmLabel ?? "Confirm"}
            </button>
          </>
        }
      >
        {pending?.body ? <div className="text-[15px] leading-relaxed text-fg-soft">{pending.body}</div> : undefined}
      </Modal>
    </ConfirmCtx.Provider>
  );
}
