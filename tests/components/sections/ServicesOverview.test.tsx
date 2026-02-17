import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ServicesOverview } from '@/components/sections/ServicesOverview';

describe('ServicesOverview', () => {
  it('renders the section header', () => {
    render(<ServicesOverview />);
    expect(screen.getByText('Find Your Solution')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Services Provided' })).toBeInTheDocument();
  });

  it('renders all four service cards', () => {
    render(<ServicesOverview />);
    expect(screen.getByText('Photography')).toBeInTheDocument();
    expect(screen.getByText('Videography')).toBeInTheDocument();
    expect(screen.getByText('Commercial Drone')).toBeInTheDocument();
    expect(screen.getByText('AI & Software Solutions')).toBeInTheDocument();
  });

  it('renders service descriptions', () => {
    render(<ServicesOverview />);
    expect(screen.getByText(/From brand imagery to portraits and events/i)).toBeInTheDocument();
    expect(screen.getByText(/High-quality video content for brands/i)).toBeInTheDocument();
    expect(screen.getByText(/FAA-compliant aerial imagery/i)).toBeInTheDocument();
    expect(screen.getByText(/From AI strategy and custom model integration/i)).toBeInTheDocument();
  });

  it('renders service links', () => {
    render(<ServicesOverview />);
    const photoLink = screen.getByRole('link', { name: /photography/i });
    expect(photoLink).toHaveAttribute('href', '/services/photography');

    const videoLink = screen.getByRole('link', { name: /videography/i });
    expect(videoLink).toHaveAttribute('href', '/services/videography');

    const droneLink = screen.getByRole('link', { name: /commercial drone/i });
    expect(droneLink).toHaveAttribute('href', '/services/commercial-drone');

    const aiLink = screen.getByRole('link', { name: /ai & software solutions/i });
    expect(aiLink).toHaveAttribute('href', '/services/ai-software');
  });

  it('renders Learn more text for each service', () => {
    render(<ServicesOverview />);
    const learnMoreTexts = screen.getAllByText('Learn more');
    expect(learnMoreTexts).toHaveLength(4);
  });

  it('renders View all services link', () => {
    render(<ServicesOverview />);
    const viewAllLink = screen.getByRole('link', { name: /view all services/i });
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink).toHaveAttribute('href', '/services');
  });

  it('renders service icons', () => {
    render(<ServicesOverview />);
    const serviceCards = document.querySelectorAll('.h-48');
    expect(serviceCards).toHaveLength(4);
    serviceCards.forEach((card) => {
      expect(card.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('renders section description', () => {
    render(<ServicesOverview />);
    expect(screen.getByText(/From photography and video to aerial imaging and AI solutions/i)).toBeInTheDocument();
  });
});
