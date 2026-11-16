"use server";

import { createHash, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  REMEMBER_TTL,
  SESSION_COOKIE,
  SESSION_TTL,
  adminConfig,
  createSession,
} from "@/lib/admin-session";

export type LoginState = { error?: string; username?: string } | undefined;

// The signed-in areas. One session covers both; `next` only picks where to land.
type Area = "/admin" | "/mail";
const area = (v: FormDataEntryValue | null): Area => (v === "/mail" ? "/mail" : "/admin");

// Hash first so both sides are the same length; compare in constant time.
function same(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

// Checks a password against "scrypt:N:r:p:salt:hash" from scripts/hash-password.mjs.
async function matchesHash(password: string, stored: string) {
  const [alg, n, r, p, salt, hash] = stored.split(":");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password,
      Buffer.from(salt, "base64url"),
      expected.length,
      { N: Number(n), r: Number(r), p: Number(p) },
      (err, key) => (err ? reject(err) : resolve(key)),
    ),
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";
  const next = area(formData.get("next"));

  if (!username || !password) {
    return { error: "Enter your username and password.", username };
  }

  const cfg = adminConfig();
  if (!cfg) {
    return {
      error:
        "Admin sign-in isn't set up. Add ADMIN_USERNAME, ADMIN_PASSWORD_HASH (npm run hash-password) and ADMIN_SESSION_SECRET (32+ characters) to .env.local.",
      username,
    };
  }

  // Evaluate both so a wrong username takes as long as a wrong password.
  const userOk = same(username, cfg.username);
  const passOk = cfg.passwordHash
    ? await matchesHash(password, cfg.passwordHash).catch(() => false)
    : same(password, cfg.password!);
  if (!(userOk && passOk)) {
    await new Promise((r) => setTimeout(r, 400));
    return { error: "That username and password don't match.", username };
  }

  const ttl = remember ? REMEMBER_TTL : SESSION_TTL;
  (await cookies()).set(SESSION_COOKIE, await createSession(cfg.username, ttl), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // Site-wide so the same sign-in covers /admin and /mail.
    path: "/",
    // Without "keep me signed in" it's a browser-session cookie (token still expires in 12h).
    ...(remember ? { maxAge: ttl } : {}),
  });

  redirect(next);
}

export async function logout(formData?: FormData) {
  const jar = await cookies();
  jar.delete({ name: SESSION_COOKIE, path: "/" });
  // Sessions created before the cookie went site-wide were scoped to /admin.
  jar.delete({ name: SESSION_COOKIE, path: "/admin" });
  redirect(`${area(formData?.get("next") ?? null)}/login`);
}
