import { connection } from "next/server";
import { Suspense } from "react";
import { listMessages, type Message } from "@/lib/messages";
import { Inbox } from "./inbox";

// Shared by /admin/messages and the standalone /mail page. Callers must have
// verified the session already (their layouts do).

async function InboxData() {
  // The inbox is always read live, never prerendered.
  await connection();
  let messages: Message[] = [];
  let error: string | null = null;
  try {
    messages = await listMessages();
  } catch (err) {
    console.error("[inbox] couldn't load messages:", err);
    error = "Couldn't load messages from Firestore. Check the FIREBASE_* settings, then reload.";
  }
  return <Inbox messages={messages} error={error} />;
}

/** Header and a few message rows while the inbox loads. */
export function InboxSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div>
        <div className="skeleton h-8 w-40 rounded-lg" />
        <div className="skeleton mt-2 h-4 w-80 max-w-full rounded" />
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 px-5 py-4">
            <div className="skeleton mt-1 size-2 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3.5 w-36 rounded" />
              <div className="skeleton h-3 w-2/3 rounded" />
              <div className="skeleton h-3 w-full rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InboxPage() {
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <InboxData />
    </Suspense>
  );
}
