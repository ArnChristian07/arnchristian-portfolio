"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { MessageCircle, Send, X } from "lucide-react";
import type { ChatData } from "@/lib/chat-data";
import { isOptimizable } from "@/lib/images";

// Chatbot avatar: the blog profile photo set in /admin (or the About photo).
// When neither is set, this full-body character is used, zoomed in on the face.
const FALLBACK_AVATAR = "/assets/ankurisu-chatbot.png";

function Avatar({ src, size, className = "" }: { src: string; size: number; className?: string }) {
  const photo = src.trim();
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-full bg-accent-soft ${className}`}
      style={{ width: size, height: size }}
    >
      {photo ? (
        <Image src={photo} alt="" fill sizes={`${size * 2}px`} unoptimized={!isOptimizable(photo)} className="object-cover" />
      ) : (
        <Image
          src={FALLBACK_AVATAR}
          alt=""
          fill
          sizes={`${size * 2}px`}
          className="object-cover"
          style={{ transform: "scale(2)", transformOrigin: "50% 34%" }}
        />
      )}
    </span>
  );
}

type Msg = { id: number; from: "bot" | "user"; text: string };

const SUGGESTIONS = ["Skills", "Projects", "Experience", "Contact", "Resume"];

/** True when any keyword starts a word in q ("skill" matches "skills", "hi" doesn't match "this"). */
const has = (q: string, words: string[]) => words.some((w) => new RegExp(`\\b${w}`).test(q));
const list = (items: string[]) => items.filter((i) => i.trim()).join(", ");

/** Simple keyword matching against the portfolio content. */
function reply(input: string, d: ChatData): string {
  const q = input.toLowerCase();
  const name = d.profile.name.trim() || "the developer";
  const first = name.split(" ")[0];

  if (has(q, ["hi\\b", "hello", "hey\\b", "yo\\b", "good morning", "good evening"]) && q.length < 20)
    return `Hey there! 👋 I'm ${first}'s assistant. Ask me about skills, projects, experience, or how to get in touch.`;

  if (has(q, ["skill", "stack", "tech", "language", "framework", "tool", "know"])) {
    const groups = d.skills.filter((s) => s.items.some((i) => i.trim()));
    if (!groups.length) return `${first} hasn't listed skills yet. Check back soon!`;
    return groups.map((s) => `• ${s.title}: ${list(s.items)}`).join("\n");
  }

  if (has(q, ["experience", "job", "career", "company", "worked", "history"])) {
    const e = d.experience.filter((x) => x.title.trim());
    if (!e.length) return `No experience entries are listed yet.`;
    return e.map((x) => `• ${x.title} — ${x.period}${x.current ? " (current)" : ""}`).join("\n");
  }

  if (has(q, ["project", "work", "portfolio", "built", "build", "app"])) {
    const p = d.projects.filter((x) => x.title.trim());
    if (!p.length) return `No projects are listed yet. Stay tuned!`;
    const lines = p.slice(0, 5).map((x) => `• ${x.title}${x.tags.length ? ` (${list(x.tags)})` : ""}`);
    return `Here are some of ${first}'s projects:\n${lines.join("\n")}\n\nScroll to the Projects section for details.`;
  }

  if (has(q, ["certif", "course", "award", "badge"])) {
    const c = d.certificates.filter((x) => x.name.trim());
    if (!c.length) return `No certificates are listed yet.`;
    return c.map((x) => `• ${x.name}${x.meta ? ` — ${x.meta}` : ""}`).join("\n");
  }

  if (has(q, ["resume", "cv"]))
    return d.contact.resume
      ? `You can view ${first}'s résumé here: ${d.contact.resume}`
      : `The résumé isn't uploaded yet. Feel free to ask via the contact form!`;

  if (has(q, ["contact", "email", "reach", "hire", "message", "talk", "linkedin", "github", "social"])) {
    const parts = [
      d.contact.email && `📧 ${d.contact.email}`,
      d.contact.linkedin && `💼 ${d.contact.linkedin}`,
      d.contact.github && `🐙 ${d.contact.github}`,
    ].filter(Boolean);
    return parts.length
      ? `You can reach ${first} at:\n${parts.join("\n")}\n\nOr use the contact form at the bottom of the page.`
      : `Use the contact form at the bottom of the page to get in touch.`;
  }

  if (has(q, ["available", "availability", "freelance", "open to"]))
    return d.profile.availability.trim() || `Reach out through the contact form to ask about availability.`;

  if (has(q, ["who", "about", "yourself", "background", "name"])) {
    const body = d.about.body.trim() || d.profile.tagline.trim() || d.profile.headline.trim();
    return body ? `${name}: ${body}` : `This is ${name}'s portfolio.`;
  }

  if (has(q, ["thank", "thx", "ty\\b"])) return `You're welcome! Anything else?`;

  return `Sorry, I didn't catch that. Try asking about skills, projects, experience, certificates, résumé, or contact.`;
}

/** Turns URLs in a bot reply into links. */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noreferrer" className="break-all underline underline-offset-2">
            {p}
          </a>
        ) : (
          p
        ),
      )}
    </>
  );
}

/**
 * A horizontal row that slides with touch, mouse drag, and the mouse wheel.
 * A drag that moves more than a few pixels swallows the click that follows,
 * so letting go over a chip doesn't also send it.
 */
function DragScrollRow({ className = "", children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startX = 0;
    let startLeft = 0;
    let dragging = false;
    let moved = false;

    // Vertical wheel → horizontal scroll (non-passive so the page doesn't scroll too).
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return; // touch scrolls natively
      dragging = true;
      moved = false;
      startX = e.clientX;
      startLeft = el.scrollLeft;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 4) {
        moved = true;
        el.setPointerCapture(e.pointerId);
        el.style.cursor = "grabbing";
      }
      if (moved) el.scrollLeft = startLeft - dx;
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      el.style.cursor = "";
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    const onClick = (e: MouseEvent) => {
      if (!moved) return;
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("click", onClick, true);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("click", onClick, true);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`cursor-grab touch-pan-x select-none overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {children}
    </div>
  );
}

export function Chatbot({ data }: { data: ChatData }) {
  const first = data.profile.name.trim().split(" ")[0] || "my";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => [
    { id: 0, from: "bot", text: `Hi! 👋 I'm ${first === "my" ? "an" : `${first}'s`} assistant. What would you like to know?` },
  ]);
  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function send(text: string) {
    const t = text.trim();
    if (!t || typing) return;
    setMsgs((m) => [...m, { id: nextId.current++, from: "user", text: t }]);
    setInput("");
    setTyping(true);
    // Short pause so the reply feels conversational.
    window.setTimeout(() => {
      setMsgs((m) => [...m, { id: nextId.current++, from: "bot", text: reply(t, data) }]);
      setTyping(false);
    }, 600);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="fixed bottom-4 right-4 z-[90] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Chat assistant"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            style={{ transformOrigin: "bottom right" }}
            className="flex h-[min(32rem,calc(100dvh-7rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lift"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border bg-ink px-4 py-3 text-ink-fg">
              <Avatar src={data.avatar} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold">Ask {first === "my" ? "me" : first}</p>
                <p className="flex items-center gap-1.5 text-xs opacity-70">
                  <span className="size-1.5 rounded-full bg-emerald-400" /> Online
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="grid size-8 place-items-center rounded-full opacity-80 transition hover:bg-white/10 hover:opacity-100"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={listRef} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-bg-alt px-4 py-4">
              {msgs.map((m) =>
                m.from === "bot" ? (
                  <div key={m.id} className="flex items-end gap-2">
                    <Avatar src={data.avatar} size={28} />
                    <p className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-2 text-sm leading-relaxed text-fg">
                      <Linkified text={m.text} />
                    </p>
                  </div>
                ) : (
                  <div key={m.id} className="flex justify-end">
                    <p className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-br-sm bg-accent px-3.5 py-2 text-sm leading-relaxed text-accent-fg">
                      {m.text}
                    </p>
                  </div>
                ),
              )}
              {typing && (
                <div className="flex items-end gap-2">
                  <Avatar src={data.avatar} size={28} />
                  <div className="flex gap-1 rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-3">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="size-1.5 rounded-full bg-faint"
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick replies */}
            <DragScrollRow className="flex gap-2 border-t border-border px-3 pt-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={typing}
                  className="shrink-0 rounded-full border border-border bg-chip px-3 py-1 text-xs font-medium text-chip-fg transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </DragScrollRow>

            {/* Input */}
            <form onSubmit={onSubmit} className="flex items-center gap-2 p-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message…"
                aria-label="Message"
                maxLength={300}
                className="h-10 min-w-0 flex-1 rounded-full border border-border bg-bg px-4 text-sm text-fg outline-none transition-colors placeholder:text-faint focus:border-accent"
              />
              <button
                type="submit"
                disabled={!input.trim() || typing}
                aria-label="Send message"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                <Send className="size-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher */}
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="relative grid size-14 place-items-center overflow-hidden rounded-full bg-accent text-accent-fg shadow-lift ring-4 ring-bg"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="size-6" />
            </motion.span>
          ) : (
            <motion.span key="avatar" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
              <Avatar src={data.avatar} size={56} />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && (
          <span className="absolute bottom-1 right-1 grid size-5 place-items-center rounded-full bg-ink text-ink-fg ring-2 ring-bg">
            <MessageCircle className="size-3" />
          </span>
        )}
      </motion.button>
    </div>
  );
}
