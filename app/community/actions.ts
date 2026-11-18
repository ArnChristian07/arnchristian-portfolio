"use server";

import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/admin-session";
import { firebaseAuth } from "@/lib/firebase-admin";

/**
 * A Firebase sign-in token carrying the `admin` claim, for the signed-in site
 * admin only. The lobby's database rules check that claim before allowing the
 * admin sprite and the reserved name, so guests can't fake either.
 */
export async function getLobbyToken(): Promise<string | null> {
  const user = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) return null;
  const auth = firebaseAuth();
  if (!auth) return null;
  try {
    return await auth.createCustomToken("site-admin", { admin: true });
  } catch (e) {
    console.error("Couldn't mint the lobby admin token", e);
    return null;
  }
}
