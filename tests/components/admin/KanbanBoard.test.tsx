import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KanbanBoard } from '@/components/admin/KanbanBoard';
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

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

const initialCards = [
  {
    id: 'c1',
    title: 'Card 1',
    status: 'todo' as const,
    order: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'c2',
    title: 'Card 2',
    status: 'in_progress' as const,
    order: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'c3',
    title: 'Card 3',
    status: 'done' as const,
    order: 0,
    createdAt: new Date().toISOString(),
  },
];

describe('KanbanBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('crypto', {
      randomUUID: () => 'new-uuid-123',
    });
    mockUpdate.mockResolvedValue({ updated: true });
  });

  it('renders board with columns', () => {
    renderWithToast(
      <KanbanBoard galleryId="g1" initialCards={initialCards} onUpdate={vi.fn()} />
    );

    expect(screen.getByText('Kanban Board')).toBeInTheDocument();
    expect(screen.getByText('To Do (1)')).toBeInTheDocument();
    expect(screen.getByText('In Progress (1)')).toBeInTheDocument();
    expect(screen.getByText('Done (1)')).toBeInTheDocument();
  });

  it('collapses and expands on header click', async () => {
    const user = userEvent.setup();
    renderWithToast(
      <KanbanBoard galleryId="g1" initialCards={initialCards} onUpdate={vi.fn()} />
    );

    expect(screen.getByText('Card 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Kanban Board/ }));

    expect(screen.queryByText('Card 1')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Kanban Board/ }));

    expect(screen.getByText('Card 1')).toBeInTheDocument();
  });

  it('adds card when Enter pressed in input', async () => {
    const user = userEvent.setup();
    renderWithToast(
      <KanbanBoard galleryId="g1" initialCards={initialCards} onUpdate={vi.fn()} />
    );

    const input = screen.getByPlaceholderText('New card title...');
    await user.type(input, 'New card{Enter}');

    expect(screen.getByText('New card')).toBeInTheDocument();
  });

  it('adds card when Add button clicked', async () => {
    const user = userEvent.setup();
    renderWithToast(
      <KanbanBoard galleryId="g1" initialCards={initialCards} onUpdate={vi.fn()} />
    );

    const input = screen.getByPlaceholderText('New card title...');
    await user.type(input, 'Another card');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Another card')).toBeInTheDocument();
  });

  it('does not add empty card', async () => {
    const user = userEvent.setup();
    renderWithToast(
      <KanbanBoard galleryId="g1" initialCards={initialCards} onUpdate={vi.fn()} />
    );

    const addButton = screen.getByRole('button', { name: 'Add' });
    expect(addButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText('New card title...'), '   ');
    expect(addButton).toBeDisabled();
  });

  it('moves card right', async () => {
    const user = userEvent.setup();
    renderWithToast(
      <KanbanBoard galleryId="g1" initialCards={initialCards} onUpdate={vi.fn()} />
    );

    // Card 1 is in todo, has move right button
    const moveRightButtons = screen.getAllByTitle('Move right');
    await user.click(moveRightButtons[0]);

    expect(screen.getByText('In Progress (2)')).toBeInTheDocument();
    expect(screen.getByText('To Do (0)')).toBeInTheDocument();
  });

  it('moves card left', async () => {
    const user = userEvent.setup();
    renderWithToast(
      <KanbanBoard galleryId="g1" initialCards={initialCards} onUpdate={vi.fn()} />
    );

    // Card 2 is in_progress, has move left button
    const moveLeftButtons = screen.getAllByTitle('Move left');
    await user.click(moveLeftButtons[0]);

    expect(screen.getByText('To Do (2)')).toBeInTheDocument();
  });

  it('deletes card', async () => {
    const user = userEvent.setup();
    renderWithToast(
      <KanbanBoard galleryId="g1" initialCards={initialCards} onUpdate={vi.fn()} />
    );

    const deleteButtons = screen.getAllByTitle('Delete');
    await user.click(deleteButtons[0]);

    expect(screen.queryByText('Card 1')).not.toBeInTheDocument();
  });

  it('saves changes and calls onUpdate', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    renderWithToast(
      <KanbanBoard galleryId="g1" initialCards={initialCards} onUpdate={onUpdate} />
    );

    const input = screen.getByPlaceholderText('New card title...');
    await user.type(input, 'New card');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).not.toBeDisabled();
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('g1', expect.objectContaining({
        kanbanCards: expect.arrayContaining([
          expect.objectContaining({ title: 'New card', status: 'todo' }),
        ]),
      }));
    });
    expect(onUpdate).toHaveBeenCalled();
  });

  it('shows error toast when save fails', async () => {
    const user = userEvent.setup();
    mockUpdate.mockRejectedValue(new Error('Save failed'));
    renderWithToast(
      <KanbanBoard galleryId="g1" initialCards={initialCards} onUpdate={vi.fn()} />
    );

    const input = screen.getByPlaceholderText('New card title...');
    await user.type(input, 'New card');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to save kanban board');
    });
  });

  it('disables save when no changes', () => {
    renderWithToast(
      <KanbanBoard galleryId="g1" initialCards={initialCards} onUpdate={vi.fn()} />
    );

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();
  });

  it('shows Saving... while saving', async () => {
    const user = userEvent.setup();
    let resolveSave: () => void;
    mockUpdate.mockImplementation(
      () => new Promise<void>((r) => { resolveSave = r; })
    );
    renderWithToast(
      <KanbanBoard galleryId="g1" initialCards={initialCards} onUpdate={vi.fn()} />
    );

    const input = screen.getByPlaceholderText('New card title...');
    await user.type(input, 'New card');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeInTheDocument();

    resolveSave!();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });
  });

  it('todo column has no move left button', () => {
    renderWithToast(
      <KanbanBoard galleryId="g1" initialCards={[initialCards[0]]} onUpdate={vi.fn()} />
    );

    expect(screen.queryByTitle('Move left')).not.toBeInTheDocument();
    expect(screen.getByTitle('Move right')).toBeInTheDocument();
  });

  it('done column has no move right button', () => {
    renderWithToast(
      <KanbanBoard galleryId="g1" initialCards={[initialCards[2]]} onUpdate={vi.fn()} />
    );

    expect(screen.queryByTitle('Move right')).not.toBeInTheDocument();
    expect(screen.getByTitle('Move left')).toBeInTheDocument();
  });
});
