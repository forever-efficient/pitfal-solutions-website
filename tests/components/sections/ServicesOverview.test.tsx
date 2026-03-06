import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ServicesOverview } from '@/components/sections/ServicesOverview';
import { SERVICES } from '@/lib/constants';

describe('ServicesOverview', () => {
  it('renders the section header', () => {
    render(<ServicesOverview />);
    expect(screen.getByText('Find Your Solution')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Services Provided' })).toBeInTheDocument();
  });

  it('renders all service cards', () => {
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

  it('renders service links', () => {
    render(<ServicesOverview />);
    const photoLink = screen.getByRole('link', { name: /photography/i });
    expect(photoLink).toHaveAttribute('href', '/services/photography');

    const videoLink = screen.getByRole('link', { name: /videography/i });
    expect(videoLink).toHaveAttribute('href', '/services/videography');

    const droneLink = screen.getByRole('link', { name: /commercial drone/i });
    expect(droneLink).toHaveAttribute('href', '/services/commercial-drone');

    const aiLink = screen.getByRole('link', { name: /ai & software/i });
    expect(aiLink).toHaveAttribute('href', '/services/ai-software');

    const notaryLink = screen.getByRole('link', { name: /colorado notary/i });
    expect(notaryLink).toHaveAttribute('href', '/services/notary');
  });

  it('renders Learn more text for each service', () => {
    render(<ServicesOverview />);
    const learnMoreTexts = screen.getAllByText('Learn more');
    expect(learnMoreTexts).toHaveLength(Object.keys(SERVICES).length);
  });

  it('renders View all services link', () => {
    render(<ServicesOverview />);
    const viewAllLink = screen.getByRole('link', { name: /view all services/i });
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink).toHaveAttribute('href', '/services');
  });

  it('renders service image containers', () => {
    render(<ServicesOverview />);
    const serviceCards = document.querySelectorAll('.h-\\[325px\\]');
    expect(serviceCards).toHaveLength(Object.keys(SERVICES).length);
  });

  it('renders section description', () => {
    render(<ServicesOverview />);
    expect(
      screen.getByText(
        /From photography and videography to aerial imaging, AI solutions, and professional notary services — every project receives complete creative and technical attention./i
      )
    ).toBeInTheDocument();
  });
});
