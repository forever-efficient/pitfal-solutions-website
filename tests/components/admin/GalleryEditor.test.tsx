import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GalleryEditor } from '@/components/admin/GalleryEditor';
import { ToastProvider } from '@/components/admin/Toast';

const mockUpdate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({
  adminGalleries: {
    update: mockUpdate,
  },
}));

const defaultGallery = {
  title: 'Summer Portraits',
  description: 'A collection of summer portraits',
  category: 'portraits',
  slug: 'summer-portraits',
  featuredIn: ['portraits', 'brands'],
  passwordEnabled: true,
  allowDownloads: true,
};

function renderEditor(
  gallery: Record<string, unknown> = defaultGallery,
  galleryId = 'gal-123'
) {
  return render(
    <ToastProvider>
      <GalleryEditor gallery={gallery} galleryId={galleryId} />
    </ToastProvider>
  );
}

function getTitleInput() {
  return screen.getAllByRole('textbox')[0]; // Title
}
function getSlugInput() {
  return screen.getAllByRole('textbox')[1]; // Slug
}
function getCategorySelect() {
  return screen.getAllByRole('combobox')[0]; // Category
}
function getDescriptionTextarea() {
  // Description is always the last textbox; password input is conditional and appears before it
  const all = screen.getAllByRole('textbox');
  return all[all.length - 1];
}
function getPasswordCheckbox() {
  return screen.getByLabelText('Require a password to view this gallery');
}
function getAllowDownloadsCheckbox() {
  return screen.getByLabelText('Allow Downloads');
}
function getFeaturedCheckbox(category: string) {
  return screen.getByLabelText(category);
}

describe('GalleryEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockImplementation(() => Promise.resolve({ updated: true }));
  });

  it('renders with gallery data pre-filled', () => {
    renderEditor();

    expect(getTitleInput()).toHaveValue('Summer Portraits');
    expect(getSlugInput()).toHaveValue('summer-portraits');
    expect(getCategorySelect()).toHaveValue('portraits');
    expect(getDescriptionTextarea()).toHaveValue(
      'A collection of summer portraits'
    );
    expect(getPasswordCheckbox()).toBeChecked();
    expect(getAllowDownloadsCheckbox()).toBeChecked();
    expect(getFeaturedCheckbox('Portraits')).toBeChecked();
    expect(getFeaturedCheckbox('Brand Photography')).toBeChecked();
    expect(getFeaturedCheckbox('Events')).not.toBeChecked();
  });

  it('renders with default values when gallery fields are empty', () => {
    renderEditor({});

    expect(getTitleInput()).toHaveValue('');
    expect(getSlugInput()).toHaveValue('');
    expect(getCategorySelect()).toHaveValue('brands');
    expect(getDescriptionTextarea()).toHaveValue('');
    expect(getPasswordCheckbox()).not.toBeChecked();
    expect(getAllowDownloadsCheckbox()).toBeEnabled();
    expect(getAllowDownloadsCheckbox()).not.toBeChecked();
    expect(getFeaturedCheckbox('Portraits')).not.toBeChecked();
    expect(getFeaturedCheckbox('Brand Photography')).not.toBeChecked();
  });

  it('renders the heading', () => {
    renderEditor();
    expect(
      screen.getByRole('heading', { name: 'Gallery Details' })
    ).toBeInTheDocument();
  });

  it('renders save button', () => {
    renderEditor();
    expect(
      screen.getByRole('button', { name: 'Save Changes' })
    ).toBeInTheDocument();
  });

  it('updates title field', async () => {
    const user = userEvent.setup();
    renderEditor();

    const titleInput = getTitleInput();
    await user.clear(titleInput);
    await user.type(titleInput, 'New Title');
    expect(titleInput).toHaveValue('New Title');
  });

  it('updates slug field', async () => {
    const user = userEvent.setup();
    renderEditor();

    const slugInput = getSlugInput();
    await user.clear(slugInput);
    await user.type(slugInput, 'new-slug');
    expect(slugInput).toHaveValue('new-slug');
  });

  it('updates category select', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.selectOptions(getCategorySelect(), 'events');
    expect(getCategorySelect()).toHaveValue('events');
  });

  it('updates description textarea', async () => {
    const user = userEvent.setup();
    renderEditor();

    const descInput = getDescriptionTextarea();
    await user.clear(descInput);
    await user.type(descInput, 'Updated description');
    expect(descInput).toHaveValue('Updated description');
  });

  it('shows password input when password checkbox is checked', () => {
    renderEditor();
    expect(getPasswordCheckbox()).toBeChecked();
    expect(screen.getByPlaceholderText('Enter new password to change it')).toBeInTheDocument();
  });

  it('hides password input when password checkbox is unchecked', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(getPasswordCheckbox());
    expect(getPasswordCheckbox()).not.toBeChecked();
    expect(screen.queryByPlaceholderText('Enter new password to change it')).not.toBeInTheDocument();
    expect(getAllowDownloadsCheckbox()).toBeEnabled();
    expect(getAllowDownloadsCheckbox()).toBeChecked();
  });

  it('shows password input after checking password checkbox on unpro­tected gallery', async () => {
    const user = userEvent.setup();
    renderEditor({});

    expect(getPasswordCheckbox()).not.toBeChecked();
    await user.click(getPasswordCheckbox());
    expect(getPasswordCheckbox()).toBeChecked();
    expect(screen.getByPlaceholderText('Enter a password')).toBeInTheDocument();
    expect(getAllowDownloadsCheckbox()).not.toBeChecked();
  });

  it('toggles allow downloads checkbox', async () => {
    const user = userEvent.setup();
    renderEditor();

    const checkbox = getAllowDownloadsCheckbox();
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('toggles featured category checkboxes', async () => {
    const user = userEvent.setup();
    renderEditor();

    const portraitsCheckbox = getFeaturedCheckbox('Portraits');
    expect(portraitsCheckbox).toBeChecked();

    await user.click(portraitsCheckbox);
    expect(portraitsCheckbox).not.toBeChecked();

    const eventsCheckbox = getFeaturedCheckbox('Events');
    expect(eventsCheckbox).not.toBeChecked();

    await user.click(eventsCheckbox);
    expect(eventsCheckbox).toBeChecked();
  });

  it('submits form without password field when checkbox checked but input is empty', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('gal-123', {
        title: 'Summer Portraits',
        description: 'A collection of summer portraits',
        category: 'portraits',
        slug: 'summer-portraits',
        featuredIn: ['portraits', 'brands'],
        allowDownloads: true,
      });
    });
  });

  it('submits form with password field when checkbox checked and input has value', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByPlaceholderText('Enter new password to change it'), 'newpass123');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('gal-123', {
        title: 'Summer Portraits',
        description: 'A collection of summer portraits',
        category: 'portraits',
        slug: 'summer-portraits',
        featuredIn: ['portraits', 'brands'],
        password: 'newpass123',
        allowDownloads: true,
      });
    });
  });

  it('submits form with password="" when checkbox is unchecked', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(getPasswordCheckbox()); // uncheck
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('gal-123', {
        title: 'Summer Portraits',
        description: 'A collection of summer portraits',
        category: 'portraits',
        slug: 'summer-portraits',
        featuredIn: ['portraits', 'brands'],
        password: '',
        allowDownloads: true,
      });
    });
  });

  it('shows "Saving..." while submitting', async () => {
    mockUpdate.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(
      screen.getByRole('button', { name: 'Saving...' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  });

  it('shows "Saved!" after successful save', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(screen.getByText('Saved!')).toBeInTheDocument();
    });
  });

  it('shows success toast after saving', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Gallery saved');
    });
  });

  it('shows error toast when save fails', async () => {
    mockUpdate.mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    );

    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to save gallery'
      );
    });
  });

  it('re-enables button after failed save', async () => {
    mockUpdate.mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    );

    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: 'Save Changes' });
      expect(btn).not.toBeDisabled();
    });
  });

  it('renders category options', () => {
    renderEditor();
    const select = getCategorySelect();
    expect(within(select).getByText('Brand Photography')).toBeInTheDocument();
    expect(within(select).getByText('Portraits')).toBeInTheDocument();
    expect(within(select).getByText('Events')).toBeInTheDocument();
  });
});
