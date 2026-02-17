import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlogCard } from '@/components/blog/BlogCard';

describe('BlogCard', () => {
  it('renders blog metadata and link', () => {
    render(
      <BlogCard
        slug="my-post"
        title="My Post"
        description="A short summary"
        date="2025-01-15"
        category="guides"
        readingTime={6}
        coverImage="finished/blog/cover.jpg"
      />
    );

    expect(screen.getByRole('link')).toHaveAttribute('href', '/blog/my-post');
    expect(screen.getByText('Guides')).toBeInTheDocument();
    expect(screen.getByText('My Post')).toBeInTheDocument();
    expect(screen.getByText('A short summary')).toBeInTheDocument();
    expect(screen.getByText('6 min read')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'https://media.pitfal.solutions/finished/blog/cover.jpg'
    );
  });

  it('falls back to raw category slug when unknown', () => {
    render(
      <BlogCard
        slug="post"
        title="Post"
        description="Desc"
        date="2025-01-15"
        category="custom-category"
        readingTime={1}
      />
    );

    expect(screen.getByText('custom-category')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
