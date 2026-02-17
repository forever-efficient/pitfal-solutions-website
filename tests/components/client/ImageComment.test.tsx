import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/api';
import { ImageComment } from '@/components/client/ImageComment';

const mockAddComment = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    clientGallery: {
      ...actual.clientGallery,
      addComment: mockAddComment,
    },
  };
});

describe('ImageComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddComment.mockResolvedValue({
      comment: {
        id: 'c-new',
        imageKey: 'img-1',
        author: 'Alex',
        text: 'Looks great!',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
    });
  });

  it('renders existing comments list', () => {
    render(
      <ImageComment
        galleryId="g1"
        imageKey="img-1"
        comments={[
          {
            id: 'c1',
            imageKey: 'img-1',
            author: 'Sam',
            text: 'Nice shot',
            createdAt: '2025-01-01T00:00:00.000Z',
          },
        ]}
        onCommentAdded={vi.fn()}
      />
    );

    expect(screen.getByText('Comments (1)')).toBeInTheDocument();
    expect(screen.getByText('Sam')).toBeInTheDocument();
    expect(screen.getByText('Nice shot')).toBeInTheDocument();
  });

  it('shows empty state when no comments', () => {
    render(
      <ImageComment
        galleryId="g1"
        imageKey="img-1"
        comments={[]}
        onCommentAdded={vi.fn()}
      />
    );

    expect(screen.getByText('No comments yet')).toBeInTheDocument();
  });

  it('submits trimmed comment and clears message body', async () => {
    const user = userEvent.setup();
    const onCommentAdded = vi.fn();

    render(
      <ImageComment
        galleryId="g1"
        imageKey="img-1"
        comments={[]}
        onCommentAdded={onCommentAdded}
      />
    );

    await user.type(screen.getByPlaceholderText('Your name'), '  Alex  ');
    await user.type(screen.getByPlaceholderText('Add a comment...'), '  Looks great!  ');
    await user.click(screen.getByRole('button', { name: 'Add Comment' }));

    await waitFor(() => {
      expect(mockAddComment).toHaveBeenCalledWith(
        'g1',
        'img-1',
        'Alex',
        'Looks great!'
      );
      expect(onCommentAdded).toHaveBeenCalledWith({
        id: 'c-new',
        imageKey: 'img-1',
        author: 'Alex',
        text: 'Looks great!',
        createdAt: '2025-01-01T00:00:00.000Z',
      });
    });

    expect(screen.getByPlaceholderText('Add a comment...')).toHaveValue('');
    expect(screen.getByPlaceholderText('Your name')).toHaveValue('  Alex  ');
  });

  it('shows ApiError message when submit fails', async () => {
    mockAddComment.mockRejectedValueOnce(new ApiError('Comment rejected', 400));
    const user = userEvent.setup();

    render(
      <ImageComment
        galleryId="g1"
        imageKey="img-1"
        comments={[]}
        onCommentAdded={vi.fn()}
      />
    );

    await user.type(screen.getByPlaceholderText('Your name'), 'Alex');
    await user.type(screen.getByPlaceholderText('Add a comment...'), 'Test comment');
    await user.click(screen.getByRole('button', { name: 'Add Comment' }));

    await waitFor(() => {
      expect(screen.getByText('Comment rejected')).toBeInTheDocument();
    });
  });
});
