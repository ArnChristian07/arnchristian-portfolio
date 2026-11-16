// Signed admin session tokens. Uses Web Crypto only, so the same code runs in
// proxy.ts, Server Components and Server Actions.
//
// Token format: base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)

export const SESSION_COOKIE = "admin_session";
export const SESSION_TTL = 60 * 60 * 12; // 12 hours
export const REMEMBER_TTL = 60 * 60 * 24 * 30; // 30 days

type Payload = { u: string; exp: number };

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64url(bytes: Uint8Array) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Credentials and signing secret, or null when the admin isn't configured. */
export function adminConfig() {
  const username = process.env.ADMIN_USERNAME;
  // Prefer the scrypt hash (npm run hash-password); plain ADMIN_PASSWORD is a fallback.
  const passwordHash = process.env.ADMIN_PASSWORD_HASH || undefined;
  const password = passwordHash ? undefined : process.env.ADMIN_PASSWORD || undefined;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!username || !(passwordHash || password) || !secret || secret.length < 32) return null;
  return { username, password, passwordHash, secret };
}

function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSession(username: string, ttlSeconds: number) {
  const cfg = adminConfig();
  if (!cfg) throw new Error("Admin auth is not configured");
  const payload: Payload = { u: username, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = toB64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(cfg.secret), enc.encode(body));
  return `${body}.${toB64url(new Uint8Array(sig))}`;
}

/** Returns the signed-in username, or null for a missing, forged or expired token. */
export async function verifySession(token: string | undefined): Promise<string | null> {
  const cfg = adminConfig();
  if (!cfg || !token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(cfg.secret),
      fromB64url(sig),
      enc.encode(body),
    );
    if (!valid) return null;
    const payload = JSON.parse(dec.decode(fromB64url(body))) as Payload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    // Changing ADMIN_USERNAME signs everyone out.
    if (payload.u !== cfg.username) return null;
    return payload.u;
  } catch {
    return null;
  }
}
