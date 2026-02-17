import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlogPost } from '@/components/blog/BlogPost';

describe('BlogPost', () => {
  it('renders post header, image, and html content', () => {
    render(
      <BlogPost
        title="Post Title"
        date="2025-02-10"
        category="guides"
        coverImage="finished/blog/cover.jpg"
        content="<p><strong>Rendered</strong> content</p>"
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Post Title' })
    ).toBeInTheDocument();
    expect(screen.getByText('Guides')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'https://media.pitfal.solutions/finished/blog/cover.jpg'
    );
    expect(screen.getByText('Rendered', { exact: false })).toBeInTheDocument();
  });

  it('renders without a cover image', () => {
    render(
      <BlogPost
        title="No Cover"
        date="2025-02-10"
        category="client-stories"
        content="<p>Body</p>"
      />
    );

    expect(screen.getByText('Client Stories')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
