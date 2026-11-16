"use client";

import { useActionState, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, LoaderCircle, Send } from "lucide-react";
import { sendMessage, type ContactState } from "@/app/contact-actions";
import { ease } from "./reveal";

const input =
  "w-full rounded-lg border border-border-strong bg-bg px-3.5 py-2.5 text-base text-fg placeholder:text-faint outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/15 aria-[invalid=true]:border-red-500 sm:text-[14px]";

const initial: ContactState = { status: "idle" };

export function ContactForm() {
  const [state, action, pending] = useActionState(sendMessage, initial);
  // Bumped to remount (and clear) the form after "Send another".
  const [round, setRound] = useState(0);
  // The "sent" result the visitor dismissed with "Send another".
  const [dismissed, setDismissed] = useState<ContactState | null>(null);
  const showSent = state.status === "sent" && state !== dismissed;

  const err = state.status === "error" ? state : null;
  const values = err?.values;
  const fieldErr = (k: "name" | "email" | "subject" | "body") => err?.fields?.[k];

  return (
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {showSent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease }}
            role="status"
            className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center"
          >
            <CircleCheck className="size-12 text-accent" strokeWidth={1.6} />
            <p className="mt-5 font-display text-xl font-semibold text-fg">Message sent. Thank you!</p>
            <p className="mt-2 max-w-xs text-[14.5px] leading-relaxed text-muted">
              I&apos;ll read it soon and reply to the email you gave.
            </p>
            <button
              type="button"
              onClick={() => {
                setDismissed(state);
                setRound((r) => r + 1);
              }}
              className="mt-6 text-sm font-medium text-accent hover:underline"
            >
              Send another message
            </button>
          </motion.div>
        ) : (
          <motion.form
            key={`form-${round}`}
            action={action}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease }}
            className="grid gap-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" name="name" error={fieldErr("name")}>
                <input
                  id="cf-name"
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                  defaultValue={values?.name}
                  placeholder="Your name"
                  aria-invalid={!!fieldErr("name")}
                  aria-describedby={fieldErr("name") ? "cf-name-err" : undefined}
                  className={input}
                />
              </Field>
              <Field label="Email" name="email" error={fieldErr("email")}>
                <input
                  id="cf-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={200}
                  defaultValue={values?.email}
                  placeholder="you@example.com"
                  aria-invalid={!!fieldErr("email")}
                  aria-describedby={fieldErr("email") ? "cf-email-err" : undefined}
                  className={input}
                />
              </Field>
            </div>
            <Field label="Subject" name="subject" optional error={fieldErr("subject")}>
              <input
                id="cf-subject"
                name="subject"
                maxLength={150}
                defaultValue={values?.subject}
                placeholder="Internship, project, or just saying hi"
                aria-invalid={!!fieldErr("subject")}
                className={input}
              />
            </Field>
            <Field label="Message" name="body" error={fieldErr("body")}>
              <textarea
                id="cf-body"
                name="body"
                required
                rows={6}
                maxLength={5000}
                defaultValue={values?.body}
                placeholder="What would you like to talk about?"
                aria-invalid={!!fieldErr("body")}
                aria-describedby={fieldErr("body") ? "cf-body-err" : undefined}
                className={`${input} resize-y`}
              />
            </Field>

            {/* Honeypot: off-screen and skipped by keyboard and screen readers. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p aria-live="polite" className="text-sm text-red-600 dark:text-red-400">
                {err && !pending ? err.error : ""}
              </p>
              <button
                type="submit"
                disabled={pending}
                className="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-6 text-sm font-semibold text-accent-fg shadow-[0_10px_30px_-12px_var(--accent)] transition-[transform,background-color,opacity] hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 disabled:pointer-events-none disabled:opacity-70"
              >
                {pending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    Send message
                    <Send className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  name,
  optional,
  error,
  children,
}: {
  label: string;
  name: string;
  optional?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={`cf-${name}`} className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-medium text-fg">
        {label}
        {optional && <span className="text-xs font-normal text-faint">optional</span>}
      </label>
      {children}
      {error && (
        <p id={`cf-${name}-err`} className="mt-1.5 text-[12.5px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
