import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AboutPage, { metadata } from '@/app/about/page';
import { BUSINESS, COPY, PAGE_META } from '@/lib/constants';

// Mock getImageUrl to return a simple string
vi.mock('@/lib/utils', async () => {
    const actual = await vi.importActual('@/lib/utils');
    return {
        ...actual,
        getImageUrl: (key: string) => `mock-url-${key}`,
    };
});

// Mock Container and Section components
vi.mock('@/components/ui/Container', () => ({
    Container: ({ children }: { children: React.ReactNode }) => <div data-testid="container">{children}</div>,
    Section: ({ children, background, size }: any) => (
        <section data-testid="section" data-background={background} data-size={size}>
            {children}
        </section>
    ),
}));

// Mock ContactCTA
vi.mock('@/components/sections', () => ({
    ContactCTA: () => <div data-testid="contact-cta">Contact CTA</div>,
}));

describe('AboutPage', () => {
    it('has correct metadata', () => {
        expect(metadata.title).toBe(PAGE_META.about.title);
        expect(metadata.description).toBe(PAGE_META.about.description);
    });

    it('renders hero section with correct content from constants', () => {
        render(<AboutPage />);

        expect(screen.getByText('About')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1, name: COPY.about.heroTitle })).toBeInTheDocument();
        expect(screen.getByText(COPY.about.heroDescription)).toBeInTheDocument();
    });

    it('renders philosophy section with all paragraphs', () => {
        render(<AboutPage />);

        expect(screen.getByRole('heading', { level: 2, name: COPY.about.philosophyTitle })).toBeInTheDocument();

        COPY.about.philosophy.forEach(paragraph => {
            expect(screen.getByText(paragraph)).toBeInTheDocument();
        });
    });

    it('renders mission and values section', () => {
        render(<AboutPage />);

        expect(screen.getByRole('heading', { level: 2, name: 'The Mission' })).toBeInTheDocument();
        expect(screen.getByText(/These core values guide every project/)).toBeInTheDocument();

        expect(screen.getByText('Authenticity')).toBeInTheDocument();
        expect(screen.getByText('Excellence')).toBeInTheDocument();
        expect(screen.getByText('Partnership')).toBeInTheDocument();
    });

    it('renders tagline section', () => {
        render(<AboutPage />);

        expect(screen.getByText(new RegExp(BUSINESS.tagline))).toBeInTheDocument();
        expect(screen.getByText(/This motto is a reminder/)).toBeInTheDocument();
    });

    it('renders contact CTA', () => {
        render(<AboutPage />);
        expect(screen.getByTestId('contact-cta')).toBeInTheDocument();
    });
});
