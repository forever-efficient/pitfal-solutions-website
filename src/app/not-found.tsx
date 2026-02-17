import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <h1 className="font-display text-6xl font-bold text-neutral-900 sm:text-8xl">
        404
      </h1>
      <h2 className="mt-4 font-display text-2xl font-semibold text-neutral-700 sm:text-3xl">
        Page Not Found
      </h2>
      <p className="mt-4 max-w-md text-neutral-600">
        Sorry, that page couldn&apos;t be found. It may have been moved or
        no longer exists.
      </p>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Button asChild>
          <Link href="/">Return Home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/contact">Contact Info</Link>
        </Button>
      </div>
    </Container>
  );
}
