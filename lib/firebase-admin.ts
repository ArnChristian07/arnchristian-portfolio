import "server-only";
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

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

let db: Firestore | undefined;

/** Firestore client, or null when the FIREBASE_* variables aren't set. */
export function firestore(): Firestore | null {
  if (db) return db;
  const creds = credentials();
  if (!creds) return null;
  const app = getApps().length ? getApp() : initializeApp({ credential: cert(creds), projectId: creds.projectId });
  db = getFirestore(app);
  return db;
}
