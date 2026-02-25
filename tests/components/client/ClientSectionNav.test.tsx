import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientSectionNav } from '@/components/client/ClientSectionNav';
import { GallerySection } from '@/lib/api';

describe('ClientSectionNav', () => {
    const mockSections: GallerySection[] = [
        { id: '1', title: 'Section 1', images: ['img1.jpg'] },
        { id: '2', title: 'Section 2', images: ['img2.jpg'] },
    ];

    const mockOnToggleCollapse = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock scroll methods
        window.scrollTo = vi.fn();
        window.pageYOffset = 100;
    });

    it('renders nothing when no sections are provided', () => {
        const { container } = render(
            <ClientSectionNav
                sections={[]}
                activeId={null}
                collapsedSections={new Set()}
                onToggleCollapse={mockOnToggleCollapse}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders section links and collapse buttons', () => {
        render(
            <ClientSectionNav
                sections={mockSections}
                activeId="1"
                collapsedSections={new Set(['2'])}
                onToggleCollapse={mockOnToggleCollapse}
            />
        );

        expect(screen.getByText('Section 1')).toBeDefined();
        expect(screen.getByText('Section 2')).toBeDefined();

        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(2);
        expect(links[0].getAttribute('href')).toBe('#section-1');
        expect(links[0].className).toContain('bg-neutral-900'); // Active

        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(2);
        expect(buttons[1].getAttribute('title')).toBe('Expand section'); // Collapsed
    });

    it('calls onToggleCollapse when collapse button is clicked', () => {
        render(
            <ClientSectionNav
                sections={mockSections}
                activeId={null}
                collapsedSections={new Set()}
                onToggleCollapse={mockOnToggleCollapse}
            />
        );

        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[0]);
        expect(mockOnToggleCollapse).toHaveBeenCalledWith('1');
    });

    it('handles smooth scroll on link click', () => {
        const mockElement = {
            getBoundingClientRect: () => ({ top: 50 }),
        };
        vi.spyOn(document, 'getElementById').mockReturnValue(mockElement as any);

        render(
            <ClientSectionNav
                sections={mockSections}
                activeId={null}
                collapsedSections={new Set()}
                onToggleCollapse={mockOnToggleCollapse}
            />
        );

        const link = screen.getByText('Section 1');
        fireEvent.click(link);

        expect(document.getElementById).toHaveBeenCalledWith('section-1');
        expect(window.scrollTo).toHaveBeenCalledWith({
            top: 50 + 100 - 120, // top + pageYOffset + yOffset
            behavior: 'smooth',
        });
    });

    it('handles smooth scroll when element not found', () => {
        vi.spyOn(document, 'getElementById').mockReturnValue(null);

        render(
            <ClientSectionNav
                sections={mockSections}
                activeId={null}
                collapsedSections={new Set()}
                onToggleCollapse={mockOnToggleCollapse}
            />
        );

        const link = screen.getByText('Section 1');
        fireEvent.click(link);

        expect(window.scrollTo).not.toHaveBeenCalled();
    });
});
