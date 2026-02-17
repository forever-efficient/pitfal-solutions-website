import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

const mockUsePathname = vi.hoisted(() => vi.fn());
const mockPush = vi.hoisted(() => vi.fn());
const mockLogout = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    adminAuth: {
      ...actual.adminAuth,
      logout: mockLogout,
    },
  };
});

describe('AdminSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/admin/galleries');
    mockLogout.mockResolvedValue({ authenticated: false });
  });

  it('renders nav items and highlights active route', () => {
    render(<AdminSidebar username="admin-user" />);

    expect(screen.getByText('Pitfal Solutions')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Galleries' })).toHaveClass(
      'bg-primary-50',
      'text-primary-700'
    );
    expect(screen.getByText('admin-user')).toBeInTheDocument();
  });

  it('logs out and redirects to login', async () => {
    const user = userEvent.setup();
    render(<AdminSidebar username="admin-user" />);

    await user.click(screen.getByRole('button', { name: 'Sign Out' }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/admin/login');
    });
  });
});
