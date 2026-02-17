import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/admin/StatCard';

describe('StatCard', () => {
  it('renders default card styling and content', () => {
    render(<StatCard label="Total Galleries" value={18} />);
    expect(screen.getByText('Total Galleries')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('18').className).toContain('text-neutral-900');
  });

  it('renders highlighted style variant', () => {
    const { container } = render(<StatCard label="New Leads" value="7" highlight />);
    expect(screen.getByText('New Leads')).toBeInTheDocument();
    expect(screen.getByText('7').className).toContain('text-primary-700');
    expect(container.firstChild).toHaveClass('border-primary-200', 'bg-primary-50');
  });
});
