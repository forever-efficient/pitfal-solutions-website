import {
  HeroSection,
  ServicesOverview,
  FeaturedGallery,
  TestimonialsSection,
  ContactCTA,
  RecentWorkCarousel,
} from '@/components/sections';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <RecentWorkCarousel className="pb-0 md:pb-0" showHeader={false} showCta={false} />
      <ServicesOverview />
      <FeaturedGallery />
      <TestimonialsSection />
      <ContactCTA />
    </>
  );
}
