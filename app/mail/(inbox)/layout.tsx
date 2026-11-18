import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/admin-session";
import { MailShell } from "@/components/admin/mail-shell";
import { InboxSkeleton } from "@/components/admin/inbox-data";

// Second line of defence after proxy.ts: the session is verified again here.
async function Gate({ children }: { children: ReactNode }) {
  await connection(); // request-time only: the session check reads the clock
  const user = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) redirect("/mail/login");
  return <MailShell user={user}>{children}</MailShell>;
}

export default function MailLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[880px] px-4 pt-24 sm:px-6">
          <InboxSkeleton />
        </div>
      }
    >
      <Gate>{children}</Gate>
    </Suspense>
  );
}
