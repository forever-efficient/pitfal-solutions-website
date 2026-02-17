import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionDivider } from '@/components/gallery/SectionDivider';

describe('SectionDivider', () => {
  it('renders title, description, and plural photo count', () => {
    render(
      <SectionDivider
        title="Portraits"
        description="Studio and outdoor looks"
        imageCount={3}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Portraits' })
    ).toBeInTheDocument();
    expect(screen.getByText('Studio and outdoor looks')).toBeInTheDocument();
    expect(screen.getByText('3 photos')).toBeInTheDocument();
  });

  it('renders singular photo count and optional fields', () => {
    render(<SectionDivider title="One Shot" imageCount={1} />);
    expect(screen.getByText('1 photo')).toBeInTheDocument();
    expect(screen.queryByText('photos')).not.toBeInTheDocument();
  });
});
