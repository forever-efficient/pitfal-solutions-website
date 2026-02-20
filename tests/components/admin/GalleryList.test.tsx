import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GalleryList } from '@/components/admin/GalleryList';

const galleries = [
  {
    id: 'g1',
    title: 'Wedding Highlights',
    category: 'events',
    slug: 'wedding-highlights',
    imageCount: 42,
    updatedAt: '2025-01-10T00:00:00.000Z',
  },
];

describe('GalleryList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.confirm = vi.fn(() => true);
  });

  it('shows empty state when no galleries exist', () => {
    render(<GalleryList galleries={[]} onDelete={vi.fn()} />);
    expect(
      screen.getByText('No galleries found. Create one to get started.')
    ).toBeInTheDocument();
  });

  it('renders gallery rows and edit links', () => {
    render(<GalleryList galleries={galleries} onDelete={vi.fn()} />);

    expect(screen.getByText('Wedding Highlights')).toBeInTheDocument();
    expect(screen.getByText('events')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();

    const links = screen.getAllByRole('link', { name: /Wedding Highlights|Edit/ });
    expect(links[0]).toHaveAttribute('href', '/admin/galleries/edit?id=g1');
  });

  it('deletes gallery after confirmation', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<GalleryList galleries={galleries} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(global.confirm).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith('g1');
  });

  it('does not delete gallery when confirmation is cancelled', async () => {
    (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<GalleryList galleries={galleries} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onDelete).not.toHaveBeenCalled();
  });
});
