import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/admin-session";
import { readContent } from "@/lib/content-store";
import { countUnread } from "@/lib/messages";
import { AdminShell } from "@/components/admin/shell";
import { AdminSkeleton } from "@/components/skeleton";

// Fail fast instead of leaving the skeleton up until the serverless function times out.
function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${what} timed out after ${ms}ms`)), ms)),
  ]);
}

// Production hides server error messages from the browser, so any unexpected
// failure here is rendered as text instead of leaving the skeleton up forever.
async function Gate({ children }: { children: ReactNode }) {
  try {
    return await GateInner({ children });
  } catch (err) {
    unstable_rethrow(err); // let redirect() and Next's internal signals through
    console.error("[admin] dashboard failed to render:", err);
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="max-w-xl text-center text-sm">
          <p className="font-semibold text-red-600">The admin dashboard failed to load.</p>
          <pre className="mt-3 whitespace-pre-wrap break-words text-left text-red-600">{detail}</pre>
        </div>
      </div>
    );
  }
}

// Second line of defence after proxy.ts: the session is verified again here.
async function GateInner({ children }: { children: ReactNode }) {
  const user = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) redirect("/admin/login");

  let stored;
  let loadError: string | null = null;
  try {
    stored = await withTimeout(readContent(), 8000, "Firestore read");
  } catch (err) {
    console.error("[admin] Firestore read failed:", err);
    const detail = err instanceof Error ? err.message : String(err);
    loadError = `Couldn't load your content from Firestore (${detail}). Check the FIREBASE_* environment variables, then reload.`;
  }
  // The inbox count is a nice-to-have; never block the admin on it.
  const unread = await withTimeout(countUnread(), 4000, "Unread count").catch((err) => {
    console.error("[admin] unread count failed:", err);
    return 0;
  });
  if (!stored) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center text-sm text-red-600">{loadError}</div>
    );
  }

  return (
    <AdminShell user={user} initial={stored.content} exists={stored.exists} updatedAt={stored.updatedAt} unread={unread}>
      {children}
    </AdminShell>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}
