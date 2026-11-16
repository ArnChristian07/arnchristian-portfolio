import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/admin-session";
import { readContent } from "@/lib/content-store";
import { countUnread } from "@/lib/messages";
import { AdminShell } from "@/components/admin/shell";
import { AdminSkeleton } from "@/components/skeleton";

// Second line of defence after proxy.ts: the session is verified again here.
async function Gate({ children }: { children: ReactNode }) {
  const user = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) redirect("/admin/login");

  let stored;
  let loadError: string | null = null;
  try {
    stored = await readContent();
  } catch (err) {
    console.error("[admin] Firestore read failed:", err);
    loadError = "Couldn't load your content from Firestore. Check the FIREBASE_* settings, then reload.";
  }
  // The inbox count is a nice-to-have; never block the admin on it.
  const unread = await countUnread().catch((err) => {
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
