import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';

const mockGalleries = [
  {
    id: '1',
    slug: 'gallery-one',
    title: 'Gallery One',
    thumbnail: '/images/gallery1.jpg',
    imageCount: 24,
    description: 'First gallery description',
  },
  {
    id: '2',
    slug: 'gallery-two',
    title: 'Gallery Two',
    thumbnail: '/images/gallery2.jpg',
    imageCount: 18,
  },
  {
    id: '3',
    slug: 'gallery-three',
    title: 'Gallery Three',
    thumbnail: '/images/gallery3.jpg',
    imageCount: 30,
  },
];

describe('GalleryGrid', () => {
  it('renders all galleries', () => {
    render(<GalleryGrid galleries={mockGalleries} category="brands" />);

    expect(screen.getByText('Gallery One')).toBeInTheDocument();
    expect(screen.getByText('Gallery Two')).toBeInTheDocument();
    expect(screen.getByText('Gallery Three')).toBeInTheDocument();
  });

  it('renders gallery links with correct hrefs', () => {
    render(<GalleryGrid galleries={mockGalleries} category="brands" />);

    const links = screen.getAllByRole('listitem');
    expect(links).toHaveLength(3);

    // The listitem is the link itself
    expect(links[0]).toHaveAttribute('href', '/portfolio/brands/gallery-one');
  });

  it('renders empty state when no galleries', () => {
    render(<GalleryGrid galleries={[]} category="brands" />);

    expect(screen.getByText('No galleries found in this category.')).toBeInTheDocument();
  });

  it('renders with correct aria labels', () => {
    render(<GalleryGrid galleries={mockGalleries} category="brands" />);

    const list = screen.getByRole('list', { name: /brands galleries/i });
    expect(list).toBeInTheDocument();
  });

  it('renders gallery with image count in aria label', () => {
    render(<GalleryGrid galleries={mockGalleries} category="brands" />);

    // The listitem is the link itself
    const firstLink = screen.getAllByRole('listitem')[0];
    expect(firstLink).toHaveAttribute('aria-label', expect.stringContaining('24 images'));
  });

  it('uses description for alt text when provided', () => {
    render(<GalleryGrid galleries={mockGalleries} category="brands" />);

    // The first gallery has a description
    const firstGalleryImage = document.querySelector('img');
    expect(firstGalleryImage).toHaveAttribute('alt', 'First gallery description');
  });

  it('uses default alt text when no description', () => {
    const galleriesWithoutDescription = [
      {
        id: '1',
        slug: 'test',
        title: 'Test Gallery',
        thumbnail: '/test.jpg',
        imageCount: 10,
      },
    ];

    render(<GalleryGrid galleries={galleriesWithoutDescription} category="portraits" />);

    const image = document.querySelector('img');
    expect(image).toHaveAttribute('alt', 'Test Gallery - portraits photography');
  });
});
