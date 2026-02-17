import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { JsonLd, LocalBusinessJsonLd } from '@/components/seo/JsonLd';

describe('JsonLd', () => {
  it('renders script tag with serialized JSON data', () => {
    const { container } = render(
      <JsonLd data={{ '@context': 'https://schema.org', name: 'Test Biz' }} />
    );
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script).toBeInTheDocument();
    expect(script?.innerHTML).toContain('"@context":"https://schema.org"');
    expect(script?.innerHTML).toContain('"name":"Test Biz"');
  });

  it('renders local business schema helper', () => {
    const { container } = render(<LocalBusinessJsonLd />);
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script?.innerHTML).toContain('"@type":"LocalBusiness"');
    expect(script?.innerHTML).toContain('"name":"Pitfal Solutions"');
    expect(script?.innerHTML).toContain('"addressLocality":"Denver"');
  });
});
