import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SiteShell } from '@/components/layout/SiteShell';

const mockUsePathname = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('SiteShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header/footer for non-admin/client routes', () => {
    mockUsePathname.mockReturnValue('/');
    render(
      <SiteShell
        header={<header>Header</header>}
        footer={<footer>Footer</footer>}
      >
        <div>Page Content</div>
      </SiteShell>
    );

    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
    expect(screen.getByText('Page Content')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('renders only children for admin route', () => {
    mockUsePathname.mockReturnValue('/admin/galleries');
    render(
      <SiteShell
        header={<header>Header</header>}
        footer={<footer>Footer</footer>}
      >
        <div>Admin Content</div>
      </SiteShell>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
    expect(screen.queryByText('Header')).not.toBeInTheDocument();
    expect(screen.queryByText('Footer')).not.toBeInTheDocument();
  });

  it('renders only children for client route', () => {
    mockUsePathname.mockReturnValue('/client/gallery-1');
    render(
      <SiteShell
        header={<header>Header</header>}
        footer={<footer>Footer</footer>}
      >
        <div>Client Content</div>
      </SiteShell>
    );

    expect(screen.getByText('Client Content')).toBeInTheDocument();
    expect(screen.queryByText('Header')).not.toBeInTheDocument();
    expect(screen.queryByText('Footer')).not.toBeInTheDocument();
  });
});
