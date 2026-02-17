import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordGate } from '@/components/client/PasswordGate';
import { ApiError } from '@/lib/api';

const mockLogin = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    clientAuth: {
      ...actual.clientAuth,
      login: mockLogin,
    },
  };
});

describe('PasswordGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockResolvedValue({
      authenticated: true,
      galleryId: 'g1',
      galleryTitle: 'Client Gallery',
      token: 't1',
    });
  });

  it('disables submit until password is provided', () => {
    render(<PasswordGate galleryId="g1" onAuthenticated={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Access Gallery' })).toBeDisabled();
  });

  it('authenticates and calls onAuthenticated on success', async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();

    render(<PasswordGate galleryId="g1" onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByLabelText('Enter your gallery password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Access Gallery' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('g1', 'secret123');
      expect(onAuthenticated).toHaveBeenCalledWith('Client Gallery');
    });
  });

  it('shows api error message when login fails with ApiError', async () => {
    mockLogin.mockRejectedValueOnce(new ApiError('Invalid password', 401));
    const user = userEvent.setup();

    render(<PasswordGate galleryId="g1" onAuthenticated={vi.fn()} />);

    await user.type(screen.getByLabelText('Enter your gallery password'), 'bad');
    await user.click(screen.getByRole('button', { name: 'Access Gallery' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid password');
    });
  });

  it('shows fallback error message for unknown errors', async () => {
    mockLogin.mockRejectedValueOnce(new Error('network'));
    const user = userEvent.setup();

    render(<PasswordGate galleryId="g1" onAuthenticated={vi.fn()} />);

    await user.type(screen.getByLabelText('Enter your gallery password'), 'bad');
    await user.click(screen.getByRole('button', { name: 'Access Gallery' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'An error occurred. Please try again.'
      );
    });
  });
});
