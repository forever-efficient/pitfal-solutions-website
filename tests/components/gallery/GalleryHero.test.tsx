import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GalleryHero } from '@/components/gallery/GalleryHero';

describe('GalleryHero', () => {
  it('renders hero image with default alt text', () => {
    render(<GalleryHero imageKey="finished/galleries/hero.jpg" title="Wedding Day" />);
    const image = screen.getByRole('img');

    expect(image).toHaveAttribute(
      'src',
      'https://media.pitfal.solutions/finished/galleries/hero.jpg'
    );
    expect(image).toHaveAttribute('alt', 'Wedding Day hero image');
  });

  it('uses provided alt text when supplied', () => {
    render(
      <GalleryHero
        imageKey="finished/galleries/hero.jpg"
        title="Wedding Day"
        alt="Bride and groom portrait"
      />
    );

    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Bride and groom portrait');
  });
});
