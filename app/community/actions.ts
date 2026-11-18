"use server";

import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/admin-session";
import { createCustomToken } from "@/lib/firebase-admin";

export type LobbyToken = { token: string } | { error: string } | null;

/**
 * A Firebase sign-in token carrying the `admin` claim, for the signed-in site
 * admin only. The lobby's database rules check that claim before allowing the
 * admin sprite and the reserved name, so guests can't fake either.
 *
 * Returns null for visitors who aren't signed in, and the failure reason for
 * the signed-in admin (only they see it) so a broken deployment isn't silent.
 */
export async function getLobbyToken(): Promise<LobbyToken> {
  const user = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) return null;
  try {
    const token = createCustomToken("site-admin", { admin: true });
    if (!token) return { error: "Firebase admin isn't configured (FIREBASE_* variables missing)." };
    return { token };
  } catch (e) {
    console.error("Couldn't mint the lobby admin token", e);
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
