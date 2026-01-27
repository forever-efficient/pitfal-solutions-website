import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImageCard } from '@/components/gallery/ImageCard';

describe('ImageCard', () => {
  it('renders the title', () => {
    render(<ImageCard title="Test Gallery" />);
    expect(screen.getByText('Test Gallery')).toBeInTheDocument();
  });

  it('renders image count when provided', () => {
    render(<ImageCard title="Test Gallery" imageCount={24} />);
    expect(screen.getByText('24 images')).toBeInTheDocument();
  });

  it('does not render image count when not provided', () => {
    render(<ImageCard title="Test Gallery" />);
    expect(screen.queryByText(/images/)).not.toBeInTheDocument();
  });

  it('renders image when imageSrc is provided', () => {
    render(<ImageCard title="Test" imageSrc="/test.jpg" />);
    const img = document.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/test.jpg');
  });

  it('renders gradient placeholder when no imageSrc', () => {
    render(<ImageCard title="Test" />);
    const placeholder = document.querySelector('[role="img"]');
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveClass('bg-gradient-to-br');
  });

  it('uses custom imageAlt when provided', () => {
    render(<ImageCard title="Test" imageSrc="/test.jpg" imageAlt="Custom alt text" />);
    const img = document.querySelector('img');
    expect(img).toHaveAttribute('alt', 'Custom alt text');
  });

  it('uses default alt text when imageAlt not provided', () => {
    render(<ImageCard title="My Gallery" imageSrc="/test.jpg" />);
    const img = document.querySelector('img');
    expect(img).toHaveAttribute('alt', 'My Gallery gallery preview');
  });

  it('renders overlay by default', () => {
    render(<ImageCard title="Test" />);
    const overlay = document.querySelector('.group-hover\\:bg-black\\/40');
    expect(overlay).toBeInTheDocument();
  });

  it('does not render overlay when showOverlay is false', () => {
    render(<ImageCard title="Test" showOverlay={false} />);
    const overlay = document.querySelector('.group-hover\\:bg-black\\/40');
    expect(overlay).not.toBeInTheDocument();
  });

  it('renders EyeIcon', () => {
    render(<ImageCard title="Test" />);
    const iconContainer = document.querySelector('.rounded-full.bg-white\\/90');
    expect(iconContainer).toBeInTheDocument();
    expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
  });

  it('has correct aria label', () => {
    render(<ImageCard title="Beautiful Photos" imageCount={15} />);
    const article = screen.getByRole('article');
    expect(article).toHaveAttribute('aria-label', 'Gallery: Beautiful Photos, 15 images');
  });

  it('has aria label without count when not provided', () => {
    render(<ImageCard title="Beautiful Photos" />);
    const article = screen.getByRole('article');
    expect(article).toHaveAttribute('aria-label', 'Gallery: Beautiful Photos');
  });

  it('sets lazy loading on image', () => {
    render(<ImageCard title="Test" imageSrc="/test.jpg" />);
    const img = document.querySelector('img');
    expect(img).toHaveAttribute('loading', 'lazy');
  });
});
