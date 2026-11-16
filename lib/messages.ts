import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { firestore } from "./firebase-admin";

// Messages sent through the contact form on the home page. Each one is its own
// document in the "messages" collection, newest first in the admin inbox.

const COLLECTION = "messages";

export type Message = {
  id: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  read: boolean;
  /** ISO time it was sent, or null while the server timestamp is pending. */
  createdAt: string | null;
};

export const LIMITS = { name: 100, email: 200, subject: 150, body: 5000 } as const;

const col = () => firestore()?.collection(COLLECTION) ?? null;

function toMessage(id: string, d: Record<string, unknown>): Message {
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    id,
    name: s(d.name),
    email: s(d.email),
    subject: s(d.subject),
    body: s(d.body),
    read: d.read === true,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate().toISOString() : null,
  };
}

export async function addMessage(m: Pick<Message, "name" | "email" | "subject" | "body">) {
  const ref = col();
  if (!ref) throw new Error("Firestore is not configured");
  await ref.add({ ...m, read: false, createdAt: FieldValue.serverTimestamp() });
}

/** Newest first. Returns [] when Firestore isn't configured. */
export async function listMessages(limit = 500): Promise<Message[]> {
  const ref = col();
  if (!ref) return [];
  const snap = await ref.orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => toMessage(d.id, d.data()));
}

export async function countUnread(): Promise<number> {
  const ref = col();
  if (!ref) return 0;
  const snap = await ref.where("read", "==", false).count().get();
  return snap.data().count;
}

export async function setMessageRead(id: string, read: boolean) {
  const ref = col();
  if (!ref) throw new Error("Firestore is not configured");
  await ref.doc(id).update({ read });
}

export async function deleteMessage(id: string) {
  const ref = col();
  if (!ref) throw new Error("Firestore is not configured");
  await ref.doc(id).delete();
}
