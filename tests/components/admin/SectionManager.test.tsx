import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SectionManager } from '@/components/admin/SectionManager';
import { ToastProvider } from '@/components/admin/Toast';

const mockUpdate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    adminGalleries: {
      ...actual.adminGalleries,
      update: mockUpdate,
    },
  };
});

const baseImages = [
  { key: 'finished/g1/one.jpg', alt: 'One' },
  { key: 'finished/g1/two.jpg', alt: 'Two' },
  { key: 'finished/g1/three.jpg', alt: 'Three' },
];

function renderManager(
  props: Partial<Parameters<typeof SectionManager>[0]> = {}
) {
  return render(
    <ToastProvider>
      <SectionManager
        galleryId="g1"
        images={baseImages}
        initialSections={[]}
        onUpdate={vi.fn()}
        {...props}
      />
    </ToastProvider>
  );
}

describe('SectionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({ updated: true });
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('section-new');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders empty state when there are no sections', () => {
    renderManager();
    expect(
      screen.getByText(
        'No sections yet. Add a section to organize your gallery images.'
      )
    ).toBeInTheDocument();
  });

  it('adds a section and validates title before save', async () => {
    const user = userEvent.setup();
    renderManager();

    await user.click(screen.getByRole('button', { name: '+ Add Section' }));
    expect(screen.getByPlaceholderText('Section title...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save Sections' }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'All sections must have a title'
      );
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('edits section, assigns image, and saves successfully', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    renderManager({
      initialSections: [{ id: 's1', title: 'Ceremony', images: [] }],
      onUpdate,
    });

    await user.click(screen.getByRole('button', { name: 'Expand' }));
    await user.type(screen.getByPlaceholderText('Optional description...'), 'Key moments');
    await user.click(
      screen.getByRole('button', { name: 'Add One to section' })
    );

    expect(screen.getByText('1 photos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove from section' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save Sections' }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('g1', {
        sections: [
          {
            id: 's1',
            title: 'Ceremony',
            description: 'Key moments',
            images: ['finished/g1/one.jpg'],
          },
        ],
      });
      expect(onUpdate).toHaveBeenCalledWith([
        {
          id: 's1',
          title: 'Ceremony',
          description: 'Key moments',
          images: ['finished/g1/one.jpg'],
        },
      ]);
      expect(screen.getByRole('alert')).toHaveTextContent('Sections saved');
    });
  });

  it('reorders and deletes sections', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    renderManager({
      initialSections: [
        { id: 's1', title: 'A', images: [] },
        { id: 's2', title: 'B', images: [] },
      ],
      onUpdate,
    });

    const moveDownButtons = screen.getAllByRole('button', { name: 'Move down' });
    await user.click(moveDownButtons[0]!);

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete section' });
    await user.click(deleteButtons[0]!);
    await user.click(screen.getByRole('button', { name: 'Save Sections' }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('g1', {
        sections: [{ id: 's1', title: 'A', images: [] }],
      });
      expect(onUpdate).toHaveBeenCalledWith([{ id: 's1', title: 'A', images: [] }]);
    });
  });

  it('shows save error toast when update fails', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('save failed'));
    const user = userEvent.setup();
    renderManager({
      initialSections: [{ id: 's1', title: 'Section 1', images: [] }],
    });

    await user.click(screen.getByRole('button', { name: 'Save Sections' }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to save sections'
      );
    });
  });

  it('supports pagination for section and available image lists', async () => {
    const user = userEvent.setup();
    const manyImages = Array.from({ length: 25 }, (_, i) => ({
      key: `finished/g1/img-${i + 1}.jpg`,
      alt: `Image ${i + 1}`,
    }));
    const sectionImages = manyImages.slice(0, 25).map((img) => img.key);

    renderManager({
      images: manyImages,
      initialSections: [{ id: 's1', title: 'All', images: sectionImages }],
    });

    await user.click(screen.getByRole('button', { name: 'Expand' }));

    expect(screen.getAllByText('Page 1 of 2').length).toBeGreaterThanOrEqual(1);
    const nextButtons = screen.getAllByRole('button', { name: 'Next' });
    await user.click(nextButtons[0]!);

    expect(screen.getAllByText('Page 2 of 2').length).toBeGreaterThanOrEqual(1);
  });
});
