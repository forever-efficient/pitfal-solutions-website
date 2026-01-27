import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ServicesOverview } from '@/components/sections/ServicesOverview';

describe('ServicesOverview', () => {
  it('renders the section header', () => {
    render(<ServicesOverview />);
    expect(screen.getByText('Find Your Solution')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Services Provided' })).toBeInTheDocument();
  });

  it('renders all three service cards', () => {
    render(<ServicesOverview />);
    expect(screen.getByText('Brand Photography')).toBeInTheDocument();
    expect(screen.getByText('Portrait Sessions')).toBeInTheDocument();
    expect(screen.getByText('Event Coverage')).toBeInTheDocument();
  });

  it('renders service descriptions', () => {
    render(<ServicesOverview />);
    expect(screen.getByText(/Elevate your brand/i)).toBeInTheDocument();
    expect(screen.getByText(/From professional headshots/i)).toBeInTheDocument();
    expect(screen.getByText(/Comprehensive event documentation/i)).toBeInTheDocument();
  });

  it('renders service links', () => {
    render(<ServicesOverview />);
    const links = screen.getAllByRole('link', { name: /brand photography|portrait sessions|event coverage/i });
    expect(links).toHaveLength(3);

    // Check hrefs
    expect(links[0]).toHaveAttribute('href', '/services#brand');
    expect(links[1]).toHaveAttribute('href', '/services#portraits');
    expect(links[2]).toHaveAttribute('href', '/services#events');
  });

  it('renders Learn more text for each service', () => {
    render(<ServicesOverview />);
    const learnMoreTexts = screen.getAllByText('Learn more');
    expect(learnMoreTexts).toHaveLength(3);
  });

  it('renders View all services link', () => {
    render(<ServicesOverview />);
    const viewAllLink = screen.getByRole('link', { name: /view all services/i });
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink).toHaveAttribute('href', '/services');
  });

  it('renders service icons', () => {
    render(<ServicesOverview />);
    // Each service card should have an icon
    const serviceCards = document.querySelectorAll('.h-48');
    expect(serviceCards).toHaveLength(3);
    serviceCards.forEach((card) => {
      expect(card.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('renders section description', () => {
    render(<ServicesOverview />);
    expect(screen.getByText(/Professional photography and videography tailored/i)).toBeInTheDocument();
  });
});
