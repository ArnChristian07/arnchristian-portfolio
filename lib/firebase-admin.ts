import "server-only";
import { createSign } from "node:crypto";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, initializeFirestore, type Firestore } from "firebase-admin/firestore";

// Firestore is only ever touched from the server with a service account, so
// the database can keep "deny all" security rules for browsers.

function credentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // .env files store the key on one line with literal "\n" sequences.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

export const firebaseConfigured = () => credentials() !== null;

function adminApp(): App | null {
  const creds = credentials();
  if (!creds) return null;
  return getApps().length ? getApp() : initializeApp({ credential: cert(creds), projectId: creds.projectId });
}

let db: Firestore | undefined;

/** Firestore client, or null when the FIREBASE_* variables aren't set. */
export function firestore(): Firestore | null {
  if (db) return db;
  const app = adminApp();
  if (!app) return null;
  // REST instead of gRPC: much faster cold starts on serverless (Vercel), and
  // no long-lived gRPC channel that can stall a frozen function.
  try {
    db = initializeFirestore(app, { preferRest: true });
  } catch {
    db = getFirestore(app); // already initialized elsewhere in this process
  }
  return db;
}

const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

/**
 * Mints a Firebase custom token (for signInWithCustomToken) signed with the
 * service account key, or null when the FIREBASE_* variables aren't set.
 *
 * Same JWT that firebase-admin/auth's createCustomToken() produces, but without
 * that module: it pulls in jwks-rsa → jose (ESM-only), which fails to load with
 * ERR_REQUIRE_ESM on Vercel's Node runtime.
 * Format: https://firebase.google.com/docs/auth/admin/create-custom-tokens#create_custom_tokens_using_a_third-party_jwt_library
 */
export function createCustomToken(uid: string, claims: Record<string, unknown>): string | null {
  const creds = credentials();
  if (!creds) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: creds.clientEmail,
      sub: creds.clientEmail,
      aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
      iat: now,
      exp: now + 60 * 60, // Firebase's maximum
      uid,
      claims,
    }),
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${payload}`).sign(creds.privateKey);
  return `${header}.${payload}.${b64url(signature)}`;
}
