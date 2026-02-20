import { BUSINESS } from '@/lib/constants';

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function LocalBusinessJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        '@id': 'https://www.pitfal.solutions',
        name: 'Pitfal Solutions',
        description: `Professional ${BUSINESS.servicesOffering} in ${BUSINESS.location.full}.`,
        url: 'https://www.pitfal.solutions',
        telephone: '',
        email: 'info@pitfal.solutions',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Denver',
          addressRegion: 'CO',
          addressCountry: 'US',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 39.7392,
          longitude: -104.9903,
        },
        image: 'https://www.pitfal.solutions/og-image.jpg',
        priceRange: '$$',
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '09:00',
          closes: '18:00',
        },
        sameAs: Object.values(BUSINESS.social),
      }}
    />
  );
}
