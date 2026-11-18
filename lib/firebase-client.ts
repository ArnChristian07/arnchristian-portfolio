"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

// Browser-side Firebase, used only by the /community lobby. These values are
// public by design (they identify the project, they don't grant access); the
// Realtime Database rules in database.rules.json decide what visitors can do.
// Each variable is read by its full name so Next.js can inline it at build time.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const lobbyConfigured = Boolean(config.apiKey && config.databaseURL && config.projectId);

/** The lobby's Firebase app, or null when the NEXT_PUBLIC_FIREBASE_* variables aren't set. */
export function firebaseApp(): FirebaseApp | null {
  if (!lobbyConfigured) return null;
  return getApps().length ? getApp() : initializeApp(config);
}
