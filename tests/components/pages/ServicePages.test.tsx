import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ServicesPage, { metadata as servicesMetadata } from '@/app/services/page';
import PhotographyPage, { metadata as photographyMetadata } from '@/app/services/photography/page';
import VideographyPage, { metadata as videographyMetadata } from '@/app/services/videography/page';
import CommercialDronePage, { metadata as droneMetadata } from '@/app/services/commercial-drone/page';
import AISoftwarePage, { metadata as aiMetadata } from '@/app/services/ai-software/page';
import { PAGE_META, SERVICES } from '@/lib/constants';

vi.mock('@/components/sections/RecentWorkCarousel', () => ({
  RecentWorkCarousel: () => <section data-testid="recent-work-carousel" />,
}));

describe('ServicesPage', () => {
  it('sets metadata from constants', () => {
    expect(servicesMetadata.title).toBe(PAGE_META.services.title);
    expect(servicesMetadata.description).toBe(PAGE_META.services.description);
  });

  it('renders all service cards with learn more links', () => {
    render(<ServicesPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Full Service Offerings' })).toBeInTheDocument();

    for (const service of Object.values(SERVICES)) {
      expect(screen.getByRole('heading', { level: 2, name: service.title })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: new RegExp(service.title) }).getAttribute('href')).toBe(service.href);
    }
  });
});

describe('Service detail pages', () => {
  it('renders photography page content and metadata', () => {
    render(<PhotographyPage />);

    expect(photographyMetadata.title).toBe(PAGE_META.servicesPhotography.title);
    expect(photographyMetadata.description).toBe(PAGE_META.servicesPhotography.description);

    expect(screen.getByRole('heading', { level: 1, name: SERVICES.photography.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get a Quote' })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: 'View Portfolio' })).toHaveAttribute('href', '/portfolio');

    for (const feature of SERVICES.photography.features) {
      expect(screen.getByText(feature)).toBeInTheDocument();
    }
  });

  it('renders videography page content and metadata', () => {
    render(<VideographyPage />);

    expect(videographyMetadata.title).toBe(PAGE_META.servicesVideography.title);
    expect(videographyMetadata.description).toBe(PAGE_META.servicesVideography.description);

    expect(screen.getByRole('heading', { level: 1, name: SERVICES.videography.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get a Quote' })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: 'View Portfolio' })).toHaveAttribute('href', '/portfolio');

    for (const feature of SERVICES.videography.features) {
      expect(screen.getByText(feature)).toBeInTheDocument();
    }
  });

  it('renders commercial drone page content and metadata', () => {
    render(<CommercialDronePage />);

    expect(droneMetadata.title).toBe(PAGE_META.servicesDrone.title);
    expect(droneMetadata.description).toBe(PAGE_META.servicesDrone.description);

    expect(screen.getByRole('heading', { level: 1, name: SERVICES.drone.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get a Quote' })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: 'View Portfolio' })).toHaveAttribute('href', '/portfolio');

    for (const feature of SERVICES.drone.features) {
      expect(screen.getByText(feature)).toBeInTheDocument();
    }
  });

  it('renders AI software page content and metadata', () => {
    render(<AISoftwarePage />);

    expect(aiMetadata.title).toBe(PAGE_META.servicesAI.title);
    expect(aiMetadata.description).toBe(PAGE_META.servicesAI.description);

    expect(screen.getByRole('heading', { level: 1, name: SERVICES.ai.title })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Start a Conversation' }).some((link) => link.getAttribute('href') === '/contact')).toBe(true);

    for (const feature of SERVICES.ai.features) {
      expect(screen.getByText(feature)).toBeInTheDocument();
    }
  });
});
