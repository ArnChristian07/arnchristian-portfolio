import { cookies } from "next/headers";
import { SESSION_COOKIE, adminConfig, verifySession } from "@/lib/admin-session";
import { firestore } from "@/lib/firebase-admin";
import { readContent } from "@/lib/content-store";
import { countUnread } from "@/lib/messages";

// TEMPORARY diagnostics for the Vercel deployment: runs each step the admin
// dashboard needs and reports the raw error, bypassing React's production
// error redaction. Signed-in admins only (proxy.ts + the check below).
// Delete this file once the deployment works.

type Step = { step: string; ok: boolean; detail?: string; ms?: number };

async function run(step: string, fn: () => unknown): Promise<Step> {
  const t = Date.now();
  try {
    const out = await fn();
    return { step, ok: true, detail: out === undefined ? undefined : String(out), ms: Date.now() - t };
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return { step, ok: false, detail, ms: Date.now() - t };
  }
}

const has = (name: string) => (process.env[name] ? "set" : "MISSING");

export async function GET() {
  const user = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) return new Response("Sign in at /admin/login first.", { status: 401 });

  const key = process.env.FIREBASE_PRIVATE_KEY ?? "";
  const env = {
    ADMIN_USERNAME: has("ADMIN_USERNAME"),
    ADMIN_PASSWORD_HASH: has("ADMIN_PASSWORD_HASH"),
    ADMIN_PASSWORD: has("ADMIN_PASSWORD"),
    ADMIN_SESSION_SECRET: has("ADMIN_SESSION_SECRET"),
    adminConfigValid: adminConfig() !== null,
    FIREBASE_PROJECT_ID: has("FIREBASE_PROJECT_ID"),
    FIREBASE_CLIENT_EMAIL: has("FIREBASE_CLIENT_EMAIL"),
    FIREBASE_PRIVATE_KEY: has("FIREBASE_PRIVATE_KEY"),
    // Shape only, never the key itself.
    privateKeyShape: {
      startsWithQuote: key.startsWith('"') || key.startsWith("'"),
      hasBeginMarker: key.includes("-----BEGIN PRIVATE KEY-----"),
      hasLiteralBackslashN: key.includes("\\n"),
      hasRealNewlines: key.includes("\n"),
      length: key.length,
    },
    CLOUDINARY_CLOUD_NAME: has("CLOUDINARY_CLOUD_NAME"),
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    node: process.version,
  };

  const steps: Step[] = [];
  steps.push(await run("firestore() init", () => (firestore() ? "configured" : "not configured (null)")));
  steps.push(await run("readContent()", async () => ((await readContent()).exists ? "doc found" : "no doc yet")));
  steps.push(await run("countUnread()", () => countUnread()));

  return Response.json({ user, env, steps }, { headers: { "Cache-Control": "no-store" } });
}
