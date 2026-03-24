import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ServicesOverview } from '@/components/sections/ServicesOverview';

// Mock the API to prevent real network calls
vi.mock('@/lib/api', () => ({
  publicGalleries: {
    getFeaturedImages: vi.fn().mockResolvedValue({ images: [] }),
  },
}));

// Mock IntersectionObserver
beforeEach(() => {
  const mockObserver = vi.fn().mockImplementation((callback: IntersectionObserverCallback) => {
    // Immediately trigger visibility for all observed elements
    return {
      observe: (el: Element) => {
        callback(
          [{ isIntersecting: true, target: el } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      },
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
  });
  vi.stubGlobal('IntersectionObserver', mockObserver);
});

describe('ServicesOverview', () => {
  it('renders the section header', () => {
    render(<ServicesOverview />);
    expect(screen.getByText('Find Your Solution')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Services Provided' })).toBeInTheDocument();
  });

  it('does not render the old subtitle', () => {
    render(<ServicesOverview />);
    expect(
      screen.queryByText(/every project receives complete creative and technical attention/i)
    ).not.toBeInTheDocument();
  });

  it('renders all service titles', () => {
    render(<ServicesOverview />);
    expect(screen.getByText('Photography')).toBeInTheDocument();
    expect(screen.getByText('Videography')).toBeInTheDocument();
    expect(screen.getByText('Commercial Drone')).toBeInTheDocument();
    expect(screen.getByText('AI & Software')).toBeInTheDocument();
    expect(screen.getByText('Colorado Notary')).toBeInTheDocument();
  });

  it('renders service descriptions', () => {
    render(<ServicesOverview />);
    expect(screen.getByText(/From brand imagery to portraits and events/i)).toBeInTheDocument();
    expect(screen.getByText(/High-quality video content for brands/i)).toBeInTheDocument();
    expect(screen.getByText(/FAA-compliant aerial imagery/i)).toBeInTheDocument();
    expect(screen.getByText(/From AI strategy and custom model integration/i)).toBeInTheDocument();
    expect(screen.getByText(/Convenient in-person notary services/i)).toBeInTheDocument();
  });

  it('renders service links with correct hrefs', () => {
    render(<ServicesOverview />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/services/photography');
    expect(hrefs).toContain('/services/videography');
    expect(hrefs).toContain('/services/commercial-drone');
    expect(hrefs).toContain('/services/ai-software');
    expect(hrefs).toContain('/services/notary');
  });

  it('renders Explore CTA for each service', () => {
    render(<ServicesOverview />);
    expect(screen.getByText(/Explore photography/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore videography/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore commercial drone/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore ai & software/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore colorado notary/i)).toBeInTheDocument();
  });

  it('renders View all services link', () => {
    render(<ServicesOverview />);
    const viewAllLink = screen.getByRole('link', { name: /view all services/i });
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink).toHaveAttribute('href', '/services');
  });

  it('renders feature lists for services', () => {
    render(<ServicesOverview />);
    // Check a few features from different services
    expect(screen.getByText('Brand & product photography')).toBeInTheDocument();
    expect(screen.getByText('Brand films')).toBeInTheDocument();
    expect(screen.getByText('Aerial photography')).toBeInTheDocument();
    expect(screen.getByText('AI consulting & strategy')).toBeInTheDocument();
  });
});
