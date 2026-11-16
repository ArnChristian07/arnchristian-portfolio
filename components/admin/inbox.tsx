"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Copy, Inbox as InboxIcon, Mail, MailOpen, Reply, Search, Trash2 } from "lucide-react";
import { markMessageRead, removeMessage } from "@/app/admin/content-actions";
import { ease } from "@/components/reveal";
import { toast } from "@/components/toast";
import type { Message } from "@/lib/messages";
import { useConfirm } from "./modal";
import { Card, IconBtn, inputCls } from "./ui";

type Filter = "all" | "unread";

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function when(iso: string | null) {
  if (!iso) return "Just now";
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function Inbox({ messages: initial, error }: { messages: Message[]; error: string | null }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();
  const [messages, setMessages] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const unread = messages.filter((m) => !m.read).length;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return messages.filter(
      (m) =>
        (filter === "all" || !m.read) &&
        (!q || [m.name, m.email, m.subject, m.body].some((v) => v.toLowerCase().includes(q))),
    );
  }, [messages, filter, query]);

  /** Optimistic: update the list now, roll back if the server says no. */
  function setRead(id: string, read: boolean, quiet = false) {
    const before = messages;
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, read } : m)));
    startTransition(async () => {
      const res = await markMessageRead(id, read);
      if (!res.ok) {
        setMessages(before);
        toast.error(res.error);
      } else {
        if (!quiet) toast.success(read ? "Marked as read" : "Marked as unread");
        router.refresh(); // updates the unread count in the sidebar
      }
    });
  }

  async function remove(m: Message) {
    const ok = await confirm({
      title: "Delete this message?",
      body: `The message from ${m.name || m.email} will be removed for good.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const before = messages;
    setMessages((ms) => ms.filter((x) => x.id !== m.id));
    if (open === m.id) setOpen(null);
    startTransition(async () => {
      const res = await removeMessage(m.id);
      if (!res.ok) {
        setMessages(before);
        toast.error(res.error);
      } else {
        toast.success("Message deleted");
        router.refresh();
      }
    });
  }

  function toggle(m: Message) {
    const next = open === m.id ? null : m.id;
    setOpen(next);
    if (next && !m.read) setRead(m.id, true, true);
  }

  async function copy(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      toast.success("Email copied");
    } catch {
      toast.error("Couldn't copy. Select the address instead.");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-[1.75rem]">Messages</h1>
        <p className="mt-1 text-[15px] text-muted">
          What people sent through the contact form on your site.{" "}
          {messages.length > 0 &&
            (unread > 0 ? `${unread} unread of ${messages.length}.` : `All ${messages.length} read.`)}
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {messages.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div role="tablist" aria-label="Filter messages" className="flex w-fit gap-1 rounded-lg bg-chip p-1">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === f ? "bg-card text-fg shadow-card" : "text-muted hover:text-fg"
                }`}
              >
                {f === "all" ? "All" : `Unread${unread ? ` (${unread})` : ""}`}
              </button>
            ))}
          </div>
          <label className="relative sm:ml-auto sm:w-72">
            <span className="sr-only">Search messages</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email or text"
              className={`${inputCls} pl-9`}
            />
          </label>
        </div>
      )}

      {shown.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <InboxIcon className="size-10 text-faint" strokeWidth={1.5} />
          <p className="mt-4 font-display text-lg font-semibold text-fg">
            {messages.length === 0 ? "No messages yet" : "Nothing matches"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {messages.length === 0
              ? "When someone uses the contact form on your site, their message shows up here."
              : "Try another search or switch the filter back to All."}
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          <AnimatePresence initial={false}>
            {shown.map((m) => {
              const isOpen = open === m.id;
              const subject = m.subject || "(no subject)";
              return (
                <motion.article
                  key={m.id}
                  layout="position"
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                  className={isOpen ? "bg-muted-card/50" : ""}
                >
                  <button
                    type="button"
                    onClick={() => toggle(m)}
                    aria-expanded={isOpen}
                    className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-muted-card/60 sm:px-5"
                  >
                    <span
                      aria-hidden
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${m.read ? "bg-transparent" : "bg-accent"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-3">
                        <span className={`truncate text-[14.5px] ${m.read ? "text-fg-soft" : "font-semibold text-fg"}`}>
                          {m.name || m.email}
                        </span>
                        <span className="ml-auto shrink-0 text-xs tabular-nums text-faint" title={m.createdAt ? dateFmt.format(new Date(m.createdAt)) : undefined}>
                          {when(m.createdAt)}
                        </span>
                      </span>
                      <span className={`mt-0.5 block truncate text-sm ${m.read ? "text-muted" : "font-medium text-fg"}`}>
                        {subject}
                      </span>
                      {!isOpen && <span className="mt-0.5 block truncate text-sm text-faint">{m.body}</span>}
                      {!m.read && <span className="sr-only">(unread)</span>}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.28, ease }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-5 pl-9 sm:px-5 sm:pl-10">
                          <p className="text-[13px] text-muted">
                            <a href={`mailto:${m.email}`} className="font-medium text-fg-soft hover:text-accent">
                              {m.email}
                            </a>
                            {m.createdAt && <> · {dateFmt.format(new Date(m.createdAt))}</>}
                          </p>
                          <p className="mt-3 whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-fg">{m.body}</p>
                          <div className="mt-5 flex flex-wrap items-center gap-2">
                            <a
                              href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "your message"}`)}`}
                              className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
                            >
                              <Reply className="size-4" /> Reply
                            </a>
                            <IconBtn label="Copy email" onClick={() => void copy(m.email)}>
                              <Copy className="size-4" />
                            </IconBtn>
                            <IconBtn label={m.read ? "Mark as unread" : "Mark as read"} onClick={() => setRead(m.id, !m.read)}>
                              {m.read ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
                            </IconBtn>
                            <IconBtn label="Delete" danger onClick={() => void remove(m)}>
                              <Trash2 className="size-4" />
                            </IconBtn>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </Card>
      )}
    </div>
  );
}
