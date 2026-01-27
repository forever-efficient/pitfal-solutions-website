import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Container, Section } from '@/components/ui/Container';

describe('Container', () => {
  it('renders children correctly', () => {
    render(<Container>Container content</Container>);
    expect(screen.getByText('Container content')).toBeInTheDocument();
  });

  it('applies default max-width (lg = max-w-6xl)', () => {
    render(<Container data-testid="container">Content</Container>);
    const container = screen.getByTestId('container');
    expect(container).toHaveClass('max-w-6xl');
  });

  it('applies sm size', () => {
    render(<Container size="sm" data-testid="container">Content</Container>);
    const container = screen.getByTestId('container');
    expect(container).toHaveClass('max-w-2xl');
  });

  it('applies md size', () => {
    render(<Container size="md" data-testid="container">Content</Container>);
    const container = screen.getByTestId('container');
    expect(container).toHaveClass('max-w-4xl');
  });

  it('applies lg size', () => {
    render(<Container size="lg" data-testid="container">Content</Container>);
    const container = screen.getByTestId('container');
    expect(container).toHaveClass('max-w-6xl');
  });

  it('applies xl size', () => {
    render(<Container size="xl" data-testid="container">Content</Container>);
    const container = screen.getByTestId('container');
    expect(container).toHaveClass('max-w-7xl');
  });

  it('applies full size', () => {
    render(<Container size="full" data-testid="container">Content</Container>);
    const container = screen.getByTestId('container');
    expect(container).toHaveClass('max-w-full');
  });

  it('applies default padding', () => {
    render(<Container data-testid="container">Content</Container>);
    const container = screen.getByTestId('container');
    expect(container).toHaveClass('px-4');
  });

  it('removes padding when padding prop is false', () => {
    render(<Container padding={false} data-testid="container">Content</Container>);
    const container = screen.getByTestId('container');
    expect(container).not.toHaveClass('px-4');
  });

  it('centers by default', () => {
    render(<Container data-testid="container">Content</Container>);
    const container = screen.getByTestId('container');
    expect(container).toHaveClass('mx-auto');
  });

  it('removes centering when center prop is false', () => {
    render(<Container center={false} data-testid="container">Content</Container>);
    const container = screen.getByTestId('container');
    expect(container).not.toHaveClass('mx-auto');
  });

  it('applies custom className', () => {
    render(<Container className="custom-class" data-testid="container">Content</Container>);
    const container = screen.getByTestId('container');
    expect(container).toHaveClass('custom-class');
  });
});

describe('Section', () => {
  it('renders children correctly', () => {
    render(<Section>Section content</Section>);
    expect(screen.getByText('Section content')).toBeInTheDocument();
  });

  it('renders as a section element', () => {
    render(<Section data-testid="section">Content</Section>);
    const section = screen.getByTestId('section');
    expect(section.tagName).toBe('SECTION');
  });

  it('applies default padding (md)', () => {
    render(<Section data-testid="section">Content</Section>);
    const section = screen.getByTestId('section');
    expect(section).toHaveClass('py-12');
  });

  it('applies sm padding size', () => {
    render(<Section size="sm" data-testid="section">Content</Section>);
    const section = screen.getByTestId('section');
    expect(section).toHaveClass('py-8');
  });

  it('applies lg padding size', () => {
    render(<Section size="lg" data-testid="section">Content</Section>);
    const section = screen.getByTestId('section');
    expect(section).toHaveClass('py-16');
  });

  it('applies xl padding size', () => {
    render(<Section size="xl" data-testid="section">Content</Section>);
    const section = screen.getByTestId('section');
    expect(section).toHaveClass('py-20');
  });

  it('applies white background', () => {
    render(<Section background="white" data-testid="section">Content</Section>);
    const section = screen.getByTestId('section');
    expect(section).toHaveClass('bg-white');
  });

  it('applies light background', () => {
    render(<Section background="light" data-testid="section">Content</Section>);
    const section = screen.getByTestId('section');
    expect(section).toHaveClass('bg-neutral-50');
  });

  it('applies dark background', () => {
    render(<Section background="dark" data-testid="section">Content</Section>);
    const section = screen.getByTestId('section');
    expect(section).toHaveClass('bg-neutral-900');
    expect(section).toHaveClass('text-white');
  });

  it('applies primary background', () => {
    render(<Section background="primary" data-testid="section">Content</Section>);
    const section = screen.getByTestId('section');
    expect(section).toHaveClass('bg-primary-600');
    expect(section).toHaveClass('text-white');
  });

  it('applies transparent background by default', () => {
    render(<Section data-testid="section">Content</Section>);
    const section = screen.getByTestId('section');
    expect(section).not.toHaveClass('bg-white');
    expect(section).not.toHaveClass('bg-neutral-50');
  });

  it('applies custom className', () => {
    render(<Section className="custom-class" data-testid="section">Content</Section>);
    const section = screen.getByTestId('section');
    expect(section).toHaveClass('custom-class');
  });
});
