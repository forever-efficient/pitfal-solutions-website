import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GalleryViewer } from '@/components/gallery/GalleryViewer';

const images = [
  { key: 'finished/g1/one.jpg', alt: 'One' },
  { key: 'finished/g1/two.jpg', alt: 'Two' },
  { key: 'finished/g1/three.jpg', alt: 'Three' },
  { key: 'finished/g1/four.jpg', alt: 'Four' },
];

const sections = [
  {
    id: 's1',
    title: 'Ceremony',
    description: 'Main event',
    images: ['finished/g1/one.jpg', 'finished/g1/two.jpg'],
  },
  {
    id: 's2',
    title: 'Reception',
    description: 'Party time',
    images: ['finished/g1/three.jpg'],
  },
];

describe('GalleryViewer', () => {
  it('renders section navigation, section groups, and unsectioned images', () => {
    render(<GalleryViewer images={images} title="Wedding" sections={sections} />);

    expect(screen.getByRole('navigation', { name: 'Gallery sections' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ceremony' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reception' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'More Photos' })).toBeInTheDocument();
  });

  it('opens lightbox and supports next/previous controls', async () => {
    const user = userEvent.setup();
    render(<GalleryViewer images={images} title="Wedding" sections={sections} />);

    await user.click(screen.getByRole('listitem', { name: 'One' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    await user.click(screen.getByRole('button', { name: 'Next image' }));
    expect(screen.getByText('2 / 4')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous image' }));
    expect(screen.getByText('1 / 4')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close lightbox' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  it('responds to keyboard navigation and escape close', async () => {
    const user = userEvent.setup();
    render(<GalleryViewer images={images} title="Wedding" sections={sections} />);

    await user.click(screen.getByRole('listitem', { name: 'Three' }));
    expect(screen.getByText('3 / 4')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('Reception');

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('4 / 4')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('3 / 4')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders plain image grid when sections are not provided', () => {
    render(<GalleryViewer images={images} title="Wedding" />);
    expect(
      screen.queryByRole('navigation', { name: 'Gallery sections' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Wedding gallery images' })).toBeInTheDocument();
  });
});
