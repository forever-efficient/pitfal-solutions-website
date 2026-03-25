import { ServicesOverview } from '@/components/sections/ServicesOverview';
import { FeaturedGallery } from '@/components/sections/FeaturedGallery';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';

/** Single lazy chunk for homepage below-the-fold (fewer webpack splits than three separate `dynamic()` calls). */
export default function HomeBelowFold() {
  return (
    <>
      <ServicesOverview />
      <FeaturedGallery />
      <TestimonialsSection />
    </>
  );
}
