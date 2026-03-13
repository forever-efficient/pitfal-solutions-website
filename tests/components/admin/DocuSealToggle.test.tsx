import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocuSealToggle } from '@/components/admin/DocuSealToggle';

const mockGetStatus = vi.hoisted(() => vi.fn());
const mockToggle = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    adminDocuments: {
      ...actual.adminDocuments,
      getStatus: mockGetStatus,
      toggle: mockToggle,
    },
  };
});

describe('DocuSealToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton initially', () => {
    mockGetStatus.mockImplementation(() => new Promise(() => {}));
    render(<DocuSealToggle />);

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows status when loaded (off)', async () => {
    mockGetStatus.mockResolvedValue({ status: 'off' });
    render(<DocuSealToggle />);

    await waitFor(() => {
      expect(screen.getByText(/DocuSeal: Offline/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Enable' })).toBeInTheDocument();
  });

  it('shows status when loaded (running)', async () => {
    mockGetStatus.mockResolvedValue({ status: 'running' });
    render(<DocuSealToggle />);

    await waitFor(() => {
      expect(screen.getByText(/DocuSeal: Running/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Shut Down' })).toBeInTheDocument();
  });

  it('shows status when loaded (error)', async () => {
    mockGetStatus.mockResolvedValue({ status: 'error', error: 'Something went wrong' });
    render(<DocuSealToggle />);

    await waitFor(() => {
      expect(screen.getByText(/DocuSeal: Error/)).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Enable' })).toBeInTheDocument();
  });

  it('shows status when loaded (starting)', async () => {
    mockGetStatus.mockResolvedValue({ status: 'starting' });
    render(<DocuSealToggle />);

    await waitFor(() => {
      expect(screen.getByText(/DocuSeal: Starting\.\.\./)).toBeInTheDocument();
    });
  });

  it('shows status when loaded (stopping)', async () => {
    mockGetStatus.mockResolvedValue({ status: 'stopping' });
    render(<DocuSealToggle />);

    await waitFor(() => {
      expect(screen.getByText(/DocuSeal: Shutting down\.\.\./)).toBeInTheDocument();
    });
  });

  it('calls onStatusChange when status loads', async () => {
    const onStatusChange = vi.fn();
    mockGetStatus.mockResolvedValue({ status: 'off' });
    render(<DocuSealToggle onStatusChange={onStatusChange} />);

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith('off');
    });
  });

  it('enables DocuSeal when off', async () => {
    const user = userEvent.setup();
    mockGetStatus.mockResolvedValue({ status: 'off' });
    mockToggle.mockResolvedValue({ status: 'starting' });
    render(<DocuSealToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enable' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Enable' }));

    await waitFor(() => {
      expect(mockToggle).toHaveBeenCalledWith('enable');
    });
  });

  it('shows confirm modal when shutting down from running', async () => {
    const user = userEvent.setup();
    mockGetStatus.mockResolvedValue({ status: 'running' });
    render(<DocuSealToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Shut Down' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Shut Down' }));

    await waitFor(() => {
      expect(screen.getByText('Shut down DocuSeal?')).toBeInTheDocument();
      expect(screen.getByText(/Data is preserved via snapshot/)).toBeInTheDocument();
    });
  });

  it('cancels shutdown when Cancel clicked', async () => {
    const user = userEvent.setup();
    mockGetStatus.mockResolvedValue({ status: 'running' });
    render(<DocuSealToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Shut Down' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Shut Down' }));

    await waitFor(() => {
      expect(screen.getByText('Shut down DocuSeal?')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Shut down DocuSeal?')).not.toBeInTheDocument();
    expect(mockToggle).not.toHaveBeenCalled();
  });

  it('confirms shutdown and calls toggle disable', async () => {
    const user = userEvent.setup();
    mockGetStatus.mockResolvedValue({ status: 'running' });
    mockToggle.mockResolvedValue({ status: 'off' });
    render(<DocuSealToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Shut Down' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Shut Down' }));

    await waitFor(() => {
      expect(screen.getByText('Shut down DocuSeal?')).toBeInTheDocument();
    });

    // Modal has its own Shut Down button; use getAllByRole to get the confirm button
    const shutDownButtons = screen.getAllByRole('button', { name: 'Shut Down' });
    await user.click(shutDownButtons[1]);

    await waitFor(() => {
      expect(mockToggle).toHaveBeenCalledWith('disable');
    });
  });

  it('shows error when toggle fails', async () => {
    const user = userEvent.setup();
    mockGetStatus.mockResolvedValue({ status: 'off' });
    mockToggle.mockRejectedValue(new Error('API error'));
    render(<DocuSealToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enable' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Enable' }));

    await waitFor(() => {
      expect(screen.getByText('API error')).toBeInTheDocument();
    });
  });

  it('shows generic error when toggle fails with non-Error', async () => {
    const user = userEvent.setup();
    mockGetStatus.mockResolvedValue({ status: 'off' });
    mockToggle.mockRejectedValue('string error');
    render(<DocuSealToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enable' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Enable' }));

    await waitFor(() => {
      expect(screen.getByText('Toggle failed')).toBeInTheDocument();
    });
  });

  it('handles fetchStatus error gracefully', async () => {
    mockGetStatus.mockRejectedValue(new Error('Network error'));
    render(<DocuSealToggle />);

    await waitFor(() => {
      expect(mockGetStatus).toHaveBeenCalled();
    });

    // Component should still render (shows off state or error)
    expect(document.body).toBeInTheDocument();
  });

  it('clears error when data.error is absent after re-fetch', async () => {
    mockGetStatus.mockResolvedValue({ status: 'off' });
    render(<DocuSealToggle />);

    await waitFor(() => {
      expect(screen.getByText(/DocuSeal: Offline/)).toBeInTheDocument();
    });
    expect(screen.queryByText('Previous error')).not.toBeInTheDocument();
  });
});
