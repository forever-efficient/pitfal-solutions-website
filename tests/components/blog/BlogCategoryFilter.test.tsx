import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlogCategoryFilter } from '@/components/blog/BlogCategoryFilter';

const posts = [
  {
    slug: 'guide-1',
    title: 'Guide 1',
    description: 'Guide description',
    date: '2025-01-01',
    category: 'guides',
    featured: false,
    readingTime: 4,
  },
  {
    slug: 'story-1',
    title: 'Story 1',
    description: 'Story description',
    date: '2025-01-02',
    category: 'client-stories',
    featured: true,
    readingTime: 5,
  },
];

const categories = [
  { slug: 'all', label: 'All Posts', count: 2 },
  { slug: 'guides', label: 'Guides', count: 1 },
  { slug: 'behind-the-scenes', label: 'Behind the Scenes', count: 0 },
];

describe('BlogCategoryFilter', () => {
  it('shows all posts by default and toggles selected category', async () => {
    const user = userEvent.setup();
    render(<BlogCategoryFilter posts={posts} categories={categories} />);

    expect(screen.getByText('Guide 1')).toBeInTheDocument();
    expect(screen.getByText('Story 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Guides/ }));
    expect(screen.getByText('Guide 1')).toBeInTheDocument();
    expect(screen.queryByText('Story 1')).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Guides/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('shows empty state and can reset to all posts', async () => {
    const user = userEvent.setup();
    render(<BlogCategoryFilter posts={posts} categories={categories} />);

    await user.click(screen.getByRole('button', { name: /Behind the Scenes/ }));
    expect(
      screen.getByText('No posts in this category yet.')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /View all posts/ }));
    expect(screen.getByText('Guide 1')).toBeInTheDocument();
    expect(screen.getByText('Story 1')).toBeInTheDocument();
  });
});
