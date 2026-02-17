import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProcessingSettings } from '@/components/admin/ProcessingSettings';
import { ToastProvider } from '@/components/admin/Toast';

const mockGetSettings = vi.hoisted(() => vi.fn());
const mockUpdateSettings = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    adminProcessing: {
      ...actual.adminProcessing,
      getSettings: mockGetSettings,
      updateSettings: mockUpdateSettings,
    },
  };
});

function renderSettings() {
  return render(
    <ToastProvider>
      <ProcessingSettings />
    </ToastProvider>
  );
}

describe('ProcessingSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockResolvedValue({
      processingMode: 'auto',
      imagenProfileId: 'profile-123',
    });
    mockUpdateSettings.mockResolvedValue({ updated: true });
  });

  it('loads and renders settings', async () => {
    renderSettings();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'RAW Processing' })
      ).toBeInTheDocument();
    });

    expect(screen.getByText('profile-123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auto' })).toHaveClass('bg-primary-600');
  });

  it('updates processing mode to manual', async () => {
    const user = userEvent.setup();
    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Manual' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Manual' }));

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({ processingMode: 'manual' });
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Processing mode set to manual'
      );
    });
  });

  it('shows error toast when update fails', async () => {
    mockUpdateSettings.mockRejectedValueOnce(new Error('failed'));
    const user = userEvent.setup();
    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Manual' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Manual' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to update settings');
    });
  });
});
