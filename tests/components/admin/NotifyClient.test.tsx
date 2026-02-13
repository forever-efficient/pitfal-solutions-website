import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotifyClient } from '@/components/admin/NotifyClient';
import { ToastProvider } from '@/components/admin/Toast';

const mockSendGalleryReady = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({
  adminNotify: {
    sendGalleryReady: mockSendGalleryReady,
  },
}));

function renderNotifyClient(
  galleryId = 'gal-123',
  galleryTitle = 'Wedding Photos'
) {
  return render(
    <ToastProvider>
      <NotifyClient galleryId={galleryId} galleryTitle={galleryTitle} />
    </ToastProvider>
  );
}

// Helper to get form inputs by placeholder (labels lack htmlFor)
function getNameInput() {
  return screen.getByPlaceholderText('Jane Doe');
}
function getEmailInput() {
  return screen.getByPlaceholderText('jane@example.com');
}
function getDaysInput() {
  return screen.getByRole('spinbutton');
}

describe('NotifyClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendGalleryReady.mockImplementation(() =>
      Promise.resolve({ notified: true })
    );
  });

  it('renders "Send to Client" button in collapsed state', () => {
    renderNotifyClient();

    expect(
      screen.getByRole('button', { name: /send to client/i })
    ).toBeInTheDocument();
    expect(screen.queryByText('Notify Client')).not.toBeInTheDocument();
  });

  it('expands form when "Send to Client" is clicked', async () => {
    const user = userEvent.setup();
    renderNotifyClient();

    await user.click(screen.getByRole('button', { name: /send to client/i }));

    expect(
      screen.getByRole('heading', { name: 'Notify Client' })
    ).toBeInTheDocument();
    expect(getNameInput()).toBeInTheDocument();
    expect(getEmailInput()).toBeInTheDocument();
    expect(getDaysInput()).toBeInTheDocument();
  });

  it('shows gallery title in description', async () => {
    const user = userEvent.setup();
    renderNotifyClient('gal-123', 'Wedding Photos');

    await user.click(screen.getByRole('button', { name: /send to client/i }));

    expect(screen.getByText('Wedding Photos')).toBeInTheDocument();
  });

  it('has default expiration days of 30', async () => {
    const user = userEvent.setup();
    renderNotifyClient();

    await user.click(screen.getByRole('button', { name: /send to client/i }));

    expect(getDaysInput()).toHaveValue(30);
  });

  it('collapses form when close button is clicked', async () => {
    const user = userEvent.setup();
    renderNotifyClient();

    await user.click(screen.getByRole('button', { name: /send to client/i }));
    expect(getNameInput()).toBeInTheDocument();

    // Click the X close button
    await user.click(screen.getByText('\u00d7'));
    expect(screen.queryByPlaceholderText('Jane Doe')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /send to client/i })
    ).toBeInTheDocument();
  });

  it('collapses form when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderNotifyClient();

    await user.click(screen.getByRole('button', { name: /send to client/i }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByPlaceholderText('Jane Doe')).not.toBeInTheDocument();
  });

  it('sends notification with form data', async () => {
    const user = userEvent.setup();
    renderNotifyClient();

    await user.click(screen.getByRole('button', { name: /send to client/i }));

    await user.type(getNameInput(), 'Jane Doe');
    await user.type(getEmailInput(), 'jane@example.com');

    await user.click(
      screen.getByRole('button', { name: 'Send Notification' })
    );

    await waitFor(() => {
      expect(mockSendGalleryReady).toHaveBeenCalledWith(
        'gal-123',
        'jane@example.com',
        'Jane Doe',
        30
      );
    });
  });

  it('sends custom expiration days', async () => {
    const user = userEvent.setup();
    renderNotifyClient();

    await user.click(screen.getByRole('button', { name: /send to client/i }));

    await user.type(getNameInput(), 'Jane Doe');
    await user.type(getEmailInput(), 'jane@example.com');
    const daysInput = getDaysInput();
    await user.clear(daysInput);
    await user.type(daysInput, '60');

    await user.click(
      screen.getByRole('button', { name: 'Send Notification' })
    );

    await waitFor(() => {
      expect(mockSendGalleryReady).toHaveBeenCalledWith(
        'gal-123',
        'jane@example.com',
        'Jane Doe',
        60
      );
    });
  });

  it('shows "Sending..." while submitting', async () => {
    mockSendGalleryReady.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const user = userEvent.setup();
    renderNotifyClient();

    await user.click(screen.getByRole('button', { name: /send to client/i }));
    await user.type(getNameInput(), 'Jane Doe');
    await user.type(getEmailInput(), 'jane@example.com');

    await user.click(
      screen.getByRole('button', { name: 'Send Notification' })
    );

    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();
  });

  it('shows success toast and collapses after successful send', async () => {
    const user = userEvent.setup();
    renderNotifyClient();

    await user.click(screen.getByRole('button', { name: /send to client/i }));
    await user.type(getNameInput(), 'Jane Doe');
    await user.type(getEmailInput(), 'jane@example.com');

    await user.click(
      screen.getByRole('button', { name: 'Send Notification' })
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Notification sent to jane@example.com'
      );
    });

    // Should collapse back to button
    expect(
      screen.getByRole('button', { name: /send to client/i })
    ).toBeInTheDocument();
  });

  it('resets form fields after successful send', async () => {
    const user = userEvent.setup();
    renderNotifyClient();

    await user.click(screen.getByRole('button', { name: /send to client/i }));
    await user.type(getNameInput(), 'Jane Doe');
    await user.type(getEmailInput(), 'jane@example.com');

    await user.click(
      screen.getByRole('button', { name: 'Send Notification' })
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Re-open form and verify fields are reset
    await user.click(screen.getByRole('button', { name: /send to client/i }));
    expect(getNameInput()).toHaveValue('');
    expect(getEmailInput()).toHaveValue('');
    expect(getDaysInput()).toHaveValue(30);
  });

  it('shows error toast when send fails', async () => {
    mockSendGalleryReady.mockImplementation(() =>
      Promise.reject(new Error('SES error'))
    );

    const user = userEvent.setup();
    renderNotifyClient();

    await user.click(screen.getByRole('button', { name: /send to client/i }));
    await user.type(getNameInput(), 'Jane Doe');
    await user.type(getEmailInput(), 'jane@example.com');

    await user.click(
      screen.getByRole('button', { name: 'Send Notification' })
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to send notification. Is the email verified in SES?'
      );
    });
  });

  it('stays expanded after failed send', async () => {
    mockSendGalleryReady.mockImplementation(() =>
      Promise.reject(new Error('SES error'))
    );

    const user = userEvent.setup();
    renderNotifyClient();

    await user.click(screen.getByRole('button', { name: /send to client/i }));
    await user.type(getNameInput(), 'Jane Doe');
    await user.type(getEmailInput(), 'jane@example.com');

    await user.click(
      screen.getByRole('button', { name: 'Send Notification' })
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Form should still be visible
    expect(getNameInput()).toBeInTheDocument();
  });
});
