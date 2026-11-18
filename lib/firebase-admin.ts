import "server-only";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
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

/** Firebase Auth admin client (mints the lobby's admin sign-in token), or null when not configured. */
// Loaded on demand: firebase-admin/auth pulls in jwks-rsa → jose (ESM-only), which
// crashes on Node runtimes without require(esm). Importing it at the top made
// every Firestore page fail on Vercel; now only the lobby token pays for it.
export async function firebaseAuth(): Promise<Auth | null> {
  const app = adminApp();
  if (!app) return null;
  const { getAuth } = await import("firebase-admin/auth");
  return getAuth(app);
}
