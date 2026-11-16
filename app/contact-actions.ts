"use server";

import { headers } from "next/headers";
import { addMessage, LIMITS } from "@/lib/messages";
import { firebaseConfigured } from "@/lib/firebase-admin";

// Public endpoint for the contact form. Anyone can call it, so input is
// validated and trimmed here, bots are caught by a honeypot field, and each
// IP is limited to a few messages per window.

export type ContactState =
  | { status: "idle" }
  | { status: "sent" }
  | {
      status: "error";
      error: string;
      fields?: Partial<Record<"name" | "email" | "subject" | "body", string>>;
      values: { name: string; email: string; subject: string; body: string };
    };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Best-effort, per server instance. Enough to stop someone hammering the form.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

export async function sendMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const values = { name: get("name"), email: get("email"), subject: get("subject"), body: get("body") };

  // Honeypot: hidden from people, filled in by bots. Pretend it worked.
  if (get("website")) return { status: "sent" };

  const fields: NonNullable<Extract<ContactState, { status: "error" }>["fields"]> = {};
  if (!values.name) fields.name = "Tell me your name.";
  else if (values.name.length > LIMITS.name) fields.name = `Keep it under ${LIMITS.name} characters.`;
  if (!EMAIL.test(values.email) || values.email.length > LIMITS.email) fields.email = "Enter a valid email so I can reply.";
  if (values.subject.length > LIMITS.subject) fields.subject = `Keep it under ${LIMITS.subject} characters.`;
  if (values.body.length < 10) fields.body = "Write a little more (at least 10 characters).";
  else if (values.body.length > LIMITS.body) fields.body = `Keep it under ${LIMITS.body} characters.`;
  if (Object.keys(fields).length) {
    return { status: "error", error: "Check the highlighted fields.", fields, values };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  if (limited(ip)) {
    return { status: "error", error: "You've sent a few messages already. Try again in a little while.", values };
  }

  if (!firebaseConfigured()) {
    return { status: "error", error: "The contact form isn't available right now. Please email me instead.", values };
  }

  try {
    await addMessage(values);
    return { status: "sent" };
  } catch (err) {
    console.error("[contact] couldn't store message:", err);
    return { status: "error", error: "Something went wrong sending your message. Please try again.", values };
  }
}
