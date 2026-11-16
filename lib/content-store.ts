import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { emptyContent, normalizeContent, type Content } from "@/components/admin/content";
import { starterContent } from "./seed";
import { firestore } from "./firebase-admin";

// The whole portfolio is one Firestore document: portfolio/content.
// It stays far below Firestore's 1 MiB document limit because images and the
// résumé live on Cloudinary and only their URLs are stored here.

export const CONTENT_TAG = "content";
const DOC = { collection: "portfolio", id: "content" } as const;

export type StoredContent = {
  content: Content;
  /** False when nothing has been saved to Firestore yet. */
  exists: boolean;
  updatedAt: string | null;
};

const doc = () => firestore()?.collection(DOC.collection).doc(DOC.id) ?? null;

async function readDoc(): Promise<StoredContent | null> {
  const ref = doc();
  if (!ref) return null;
  const snap = await ref.get();
  if (!snap.exists) return null;
  const { updatedAt, ...data } = snap.data() ?? {};
  return {
    content: normalizeContent(data),
    exists: true,
    updatedAt: updatedAt instanceof Timestamp ? updatedAt.toDate().toISOString() : null,
  };
}

/**
 * Uncached read for the admin, which must always edit the latest copy.
 * Before the first save the editor starts from the starter content.
 */
export async function readContent(): Promise<StoredContent> {
  return (await readDoc()) ?? { content: starterContent, exists: false, updatedAt: null };
}

/**
 * Cached read for the public site: only what is stored in Firestore, never
 * starter or placeholder text. Saving in the admin expires the "content" tag,
 * so visitors see changes on their next request.
 */
export async function getPublicContent(): Promise<Content> {
  "use cache";
  cacheTag(CONTENT_TAG);
  try {
    const stored = await readDoc();
    cacheLife("max");
    return stored?.content ?? emptyContent;
  } catch (err) {
    // Keep the site up if Firestore is unreachable, and retry soon.
    console.error("[content] Firestore read failed:", err);
    cacheLife("seconds");
    return emptyContent;
  }
}

export async function writeContent(content: Content) {
  const ref = doc();
  if (!ref) throw new Error("Firestore is not configured");
  await ref.set({ ...content, updatedAt: FieldValue.serverTimestamp() });
}
