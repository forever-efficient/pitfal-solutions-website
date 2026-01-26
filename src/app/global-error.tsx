'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans text-neutral-900 antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <h1 className="text-6xl font-bold text-neutral-900 sm:text-8xl">
            500
          </h1>
          <h2 className="mt-4 text-2xl font-semibold text-neutral-700 sm:text-3xl">
            Something Went Wrong
          </h2>
          <p className="mt-4 max-w-md text-neutral-600">
            A critical error has occurred. Please try again.
          </p>
          {error.digest && (
            <p className="mt-2 text-sm text-neutral-400">
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            className="mt-8 rounded-lg bg-orange-600 px-6 py-3 text-white hover:bg-orange-700"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
