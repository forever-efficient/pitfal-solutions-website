import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrivacyPage, { metadata as privacyMetadata } from '@/app/privacy/page';
import TermsPage, { metadata as termsMetadata } from '@/app/terms/page';
import { BUSINESS, PAGE_META } from '@/lib/constants';

describe('PrivacyPage', () => {
  it('sets metadata from constants', () => {
    expect(privacyMetadata.title).toBe(PAGE_META.privacy.title);
    expect(privacyMetadata.description).toBe(PAGE_META.privacy.description);
  });

  it('renders privacy policy content with contact email', () => {
    render(<PrivacyPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText(`Last updated: February 2026`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${BUSINESS.name} collects information you provide directly`))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: BUSINESS.contact.email })).toHaveAttribute(
      'href',
      `mailto:${BUSINESS.contact.email}`
    );
  });
});

describe('TermsPage', () => {
  it('sets metadata from constants', () => {
    expect(termsMetadata.title).toBe(PAGE_META.terms.title);
    expect(termsMetadata.description).toBe(PAGE_META.terms.description);
  });

  it('renders terms content with location and contact email', () => {
    render(<TermsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeInTheDocument();
    expect(screen.getByText(`Last updated: February 2026`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`services including brand photography, portrait sessions, and event coverage in the ${BUSINESS.location.full} area`))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: BUSINESS.contact.email })).toHaveAttribute(
      'href',
      `mailto:${BUSINESS.contact.email}`
    );
  });
});
