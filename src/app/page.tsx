import dynamic from 'next/dynamic';
import { HeroSection } from '@/components/sections/HeroSection';
import { ContactCTA } from '@/components/sections/ContactCTA';

function BelowFoldSkeleton() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12 md:space-y-16">
      <div
        className="mx-auto max-w-7xl w-full rounded-2xl bg-neutral-200/80 animate-pulse min-h-[480px]"
        aria-hidden
      />
      <div
        className="mx-auto max-w-7xl w-full rounded-2xl bg-neutral-200/80 animate-pulse min-h-[400px]"
        aria-hidden
      />
      <div
        className="mx-auto max-w-7xl w-full rounded-2xl bg-neutral-200/80 animate-pulse min-h-[300px]"
        aria-hidden
      />
    </div>
  );
}

const HomeBelowFold = dynamic(() => import('@/components/sections/HomeBelowFold'), {
  loading: () => <BelowFoldSkeleton />,
});

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HomeBelowFold />
      <ContactCTA />
    </>
  );
}
