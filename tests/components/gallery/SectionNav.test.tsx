import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionNav } from '@/components/gallery/SectionNav';

describe('SectionNav', () => {
  it('returns null when there are no sections', () => {
    const { container } = render(<SectionNav sections={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders section links and active style', () => {
    render(
      <SectionNav
        sections={[
          { id: 's1', title: 'Ceremony' },
          { id: 's2', title: 'Reception' },
        ]}
        activeId="s2"
      />
    );

    const ceremony = screen.getByRole('link', { name: 'Ceremony' });
    const reception = screen.getByRole('link', { name: 'Reception' });

    expect(ceremony).toHaveAttribute('href', '#section-s1');
    expect(reception).toHaveAttribute('href', '#section-s2');
    expect(reception).toHaveClass('bg-neutral-900', 'text-white');
    expect(ceremony).toHaveClass('bg-neutral-100');
  });
});
