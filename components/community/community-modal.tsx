"use client";

import { AnimatePresence, motion } from "motion/react";
import { Users, X } from "lucide-react";
import dynamic from "next/dynamic";
import { Pixelify_Sans } from "next/font/google";
import { useEffect, useRef, useSyncExternalStore } from "react";

const pixel = Pixelify_Sans({ subsets: ["latin"], weight: ["500", "600"] });

// Firebase and the game only load once someone opens the lobby.
const Lobby = dynamic(() => import("./lobby").then((m) => m.Lobby), {
  ssr: false,
  loading: () => <div aria-hidden className="skeleton h-[min(52dvh,520px)] rounded-2xl lg:h-[min(560px,calc(100dvh-12rem))]" />,
});

/*
 * The modal is open while the URL hash is #community, so the nav link
 * ("#community" here, "/#community" from other pages), the launcher and shared
 * links all open it the same way.
 */
const HASH = "#community";

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
const isOpen = () => window.location.hash === HASH;

function openLobby() {
  if (!isOpen()) window.location.hash = HASH;
}
function closeLobby() {
  if (!isOpen()) return;
  history.replaceState(null, "", window.location.pathname + window.location.search);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

function lockScroll(lock: boolean) {
  const v = lock ? "hidden" : "";
  document.documentElement.style.overflow = v;
  document.body.style.overflow = v;
}

/** `launcher` shows the floating button (only once the lobby is configured). */
export function CommunityModal({ launcher }: { launcher: boolean }) {
  const open = useSyncExternalStore(subscribe, isOpen, () => false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // While open: lock page scroll, close on Escape, and return focus afterwards.
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    lockScroll(true);
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      // Escape in the chat box hands focus back to the room instead.
      if (e.key !== "Escape" || (e.target as HTMLElement | null)?.closest("input, textarea")) return;
      closeLobby();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      lockScroll(false);
      window.removeEventListener("keydown", onKey);
      prev?.focus?.({ preventScroll: true });
    };
  }, [open]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            onPointerDown={(e) => e.target === e.currentTarget && closeLobby()}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="community-title"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="flex max-h-[100dvh] w-full max-w-6xl flex-col overflow-y-auto rounded-t-2xl border border-border bg-bg shadow-lift sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl"
            >
              <div className="flex items-start gap-4 px-4 pb-3 pt-4 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent">Community</p>
                  <h2 id="community-title" className={`${pixel.className} mt-1 text-2xl font-semibold tracking-tight text-fg sm:text-3xl`}>
                    Come hang out in the lab.
                  </h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">
                    Pick a username, wander around and say hi to whoever else is here. Be kind: messages disappear after an
                    hour.
                  </p>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={closeLobby}
                  aria-label="Close community lobby"
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-fg transition-colors hover:border-accent hover:text-accent"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="px-2 pb-2 sm:px-5 sm:pb-5">
                <Lobby fontFamily={pixel.style.fontFamily} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {launcher && !open && (
        <motion.button
          type="button"
          onClick={openLobby}
          aria-label="Open community chat"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="group fixed bottom-4 right-4 z-[90] flex items-center gap-2 sm:bottom-6 sm:right-6"
        >
          <span className="rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-fg shadow-lift transition-colors group-hover:border-accent group-hover:text-accent">
            Community chat
          </span>
          <span className="grid size-14 place-items-center rounded-full bg-accent text-accent-fg shadow-lift ring-4 ring-bg">
            <Users className="size-6" />
          </span>
        </motion.button>
      )}
    </>
  );
}
