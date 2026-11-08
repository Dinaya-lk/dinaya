"use client";

import Link from "next/link";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

const CHUNK_RECOVERY_KEY = "dinaya:chunk-recovery";
const CHUNK_RECOVERY_WINDOW_MS = 30_000;

function isChunkLoadFailure(error: Error) {
  return /ChunkLoadError|Loading chunk|failed to fetch dynamically imported module|importing a module script failed/i.test(
    `${error.name} ${error.message}`,
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
    Sentry.captureException(error);
    const lastRecoveryAt = Number(sessionStorage.getItem(CHUNK_RECOVERY_KEY) ?? 0);
    if (isChunkLoadFailure(error) && Date.now() - lastRecoveryAt >= CHUNK_RECOVERY_WINDOW_MS) {
      sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(Date.now()));
      window.location.reload();
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-neutral-900/60 px-4">
          <div className="text-center max-w-md">
            <div className="mb-6 flex justify-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="size-10 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
              Something went wrong
            </h1>
            <p className="mb-8 text-gray-600 dark:text-gray-400">
              We apologize for the inconvenience. An unexpected error has occurred.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={reset}
                className="rounded-md bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
              >
                Try again
              </button>
              <Link
                href="/"
                className="rounded-md border border-gray-300 dark:border-neutral-700 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-neutral-900/60 transition-colors"
              >
                Go to Homepage
              </Link>
            </div>
            {error.digest && (
              <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
