"use client";

import { useEffect } from "react";

// Catches errors from the admin layouts and pages. In production React hides the
// message, but the digest matches the error line in the Vercel runtime logs.
export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message = error instanceof Error ? error.message : String(error);
  const digest = (error as { digest?: string } | null)?.digest;

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="max-w-xl text-center text-sm">
        <p className="font-semibold text-red-600">Something went wrong in the admin.</p>
        <pre className="mt-3 whitespace-pre-wrap break-words text-left text-red-600">{message}</pre>
        {digest && (
          <p className="mt-2 text-muted">
            Error digest: <code>{digest}</code> (search for it in Vercel → Logs)
          </p>
        )}
        <button
          type="button"
          onClick={() => retry()}
          className="mt-5 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-fg hover:bg-accent-hover"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
