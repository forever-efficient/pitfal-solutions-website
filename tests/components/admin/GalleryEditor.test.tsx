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
  type: 'client',
  slug: 'summer-portraits',
  featured: true,
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

// Labels don't have htmlFor, so we use role-based queries.
// The form has: Title, Slug, Access Password (Security), Description (textarea), 2 selects, 1 checkbox.
function getTitleInput() {
  return screen.getAllByRole('textbox')[0]; // Title
}
function getSlugInput() {
  return screen.getAllByRole('textbox')[1]; // Slug
}
function getCategorySelect() {
  return screen.getAllByRole('combobox')[0]; // Category
}
function getTypeSelect() {
  return screen.getAllByRole('combobox')[1]; // Type
}
function getDescriptionTextarea() {
  return screen.getAllByRole('textbox')[3]; // Description (textarea; index 2 is Access Password)
}
function getFeaturedCheckbox() {
  return screen.getByRole('checkbox');
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
    expect(getTypeSelect()).toHaveValue('client');
    expect(getDescriptionTextarea()).toHaveValue(
      'A collection of summer portraits'
    );
    expect(getFeaturedCheckbox()).toBeChecked();
  });

  it('renders with default values when gallery fields are empty', () => {
    renderEditor({});

    expect(getTitleInput()).toHaveValue('');
    expect(getSlugInput()).toHaveValue('');
    expect(getCategorySelect()).toHaveValue('brands');
    expect(getTypeSelect()).toHaveValue('client');
    expect(getDescriptionTextarea()).toHaveValue('');
    expect(getFeaturedCheckbox()).not.toBeChecked();
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

  it('updates type select', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.selectOptions(getTypeSelect(), 'portfolio');
    expect(getTypeSelect()).toHaveValue('portfolio');
  });

  it('updates description textarea', async () => {
    const user = userEvent.setup();
    renderEditor();

    const descInput = getDescriptionTextarea();
    await user.clear(descInput);
    await user.type(descInput, 'Updated description');
    expect(descInput).toHaveValue('Updated description');
  });

  it('toggles featured checkbox', async () => {
    const user = userEvent.setup();
    renderEditor();

    const checkbox = getFeaturedCheckbox();
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('submits form and calls adminGalleries.update', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('gal-123', {
        title: 'Summer Portraits',
        description: 'A collection of summer portraits',
        category: 'portraits',
        type: 'client',
        slug: 'summer-portraits',
        featured: true,
        password: '',
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
    expect(within(select).getByText('Brands')).toBeInTheDocument();
    expect(within(select).getByText('Portraits')).toBeInTheDocument();
    expect(within(select).getByText('Events')).toBeInTheDocument();
  });

  it('renders type options', () => {
    renderEditor();
    const select = getTypeSelect();
    expect(within(select).getByText('Portfolio')).toBeInTheDocument();
    expect(within(select).getByText('Client')).toBeInTheDocument();
  });
});
