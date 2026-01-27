'use client';

import { useEffect } from 'react';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development, could integrate with error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <h1 className="font-display text-6xl font-bold text-neutral-900 sm:text-8xl">
        500
      </h1>
      <h2 className="mt-4 font-display text-2xl font-semibold text-neutral-700 sm:text-3xl">
        Something Went Wrong
      </h2>
      <p className="mt-4 max-w-md text-neutral-600">
        Sorry for the inconvenience. An unexpected error has occurred.
        Please try again or reach out if the problem persists.
      </p>
      {error.digest && (
        <p className="mt-2 text-sm text-neutral-400">Error ID: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Button onClick={() => reset()}>Try Again</Button>
        <Button
          variant="outline"
          onClick={() => (window.location.href = '/')}
        >
          Return Home
        </Button>
      </div>
    </Container>
  );
}
