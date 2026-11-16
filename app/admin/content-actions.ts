"use server";

import { cookies } from "next/headers";
import { updateTag } from "next/cache";
import { SESSION_COOKIE, verifySession } from "@/lib/admin-session";
import { CONTENT_TAG, writeContent } from "@/lib/content-store";
import { firebaseConfigured } from "@/lib/firebase-admin";
import { signUpload, type UploadKind, type UploadTicket } from "@/lib/cloudinary";
import { normalizeContent } from "@/components/admin/content";
import { deleteMessage, setMessageRead } from "@/lib/messages";

// Server Actions are public endpoints: each one re-checks the admin session.
async function requireAdmin() {
  const user = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) throw new Error("Your session has expired. Sign in again.");
  return user;
}

export type SaveResult = { ok: true; savedAt: string } | { ok: false; error: string };

export async function saveContent(input: unknown): Promise<SaveResult> {
  try {
    await requireAdmin();
    if (!firebaseConfigured()) {
      return {
        ok: false,
        error: "Firebase isn't set up. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to .env.local.",
      };
    }
    await writeContent(normalizeContent(input));
    // Expire the public site's cached copy so the next visit shows the edit.
    updateTag(CONTENT_TAG);
    return { ok: true, savedAt: new Date().toISOString() };
  } catch (err) {
    console.error("[admin] save failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't save. Try again." };
  }
}

export type TicketResult = { ok: true; ticket: UploadTicket } | { ok: false; error: string };

export async function createUploadTicket(kind: UploadKind): Promise<TicketResult> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  if (kind !== "image" && kind !== "document") return { ok: false, error: "Unknown upload type." };
  const ticket = signUpload(kind);
  if (!ticket) {
    return {
      ok: false,
      error: "Cloudinary isn't set up. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to .env.local.",
    };
  }
  return { ok: true, ticket };
}

/* ---------------------------------------------------------------- inbox -- */

export type InboxResult = { ok: true } | { ok: false; error: string };

async function inboxAction(run: () => Promise<void>): Promise<InboxResult> {
  try {
    await requireAdmin();
    if (!firebaseConfigured()) return { ok: false, error: "Firebase isn't set up." };
    await run();
    return { ok: true };
  } catch (err) {
    console.error("[admin] inbox action failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong. Try again." };
  }
}

const validId = (id: unknown): id is string => typeof id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(id);

export async function markMessageRead(id: string, read: boolean): Promise<InboxResult> {
  if (!validId(id)) return { ok: false, error: "Unknown message." };
  return inboxAction(() => setMessageRead(id, read === true));
}

export async function removeMessage(id: string): Promise<InboxResult> {
  if (!validId(id)) return { ok: false, error: "Unknown message." };
  return inboxAction(() => deleteMessage(id));
}
