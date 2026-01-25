import {
  HeroSection,
  ServicesOverview,
  FeaturedGallery,
  TestimonialsSection,
  ContactCTA,
} from '@/components/sections';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ServicesOverview />
      <FeaturedGallery />
      <TestimonialsSection />
      <ContactCTA />
    </>
  );
}
