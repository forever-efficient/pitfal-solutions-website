import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null;

beforeAll(() => {
  const originalConsoleError = console.error;
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
    const hasNavigationNotImplemented = args.some(
      (arg) =>
        (typeof arg === 'string' && arg.includes('Not implemented: navigation (except hash changes)')) ||
        (arg instanceof Error && arg.message.includes('Not implemented: navigation (except hash changes)'))
    );

    if (hasNavigationNotImplemented) {
      return;
    }

    originalConsoleError(...args);
  });
});

afterAll(() => {
  consoleErrorSpy?.mockRestore();
  consoleErrorSpy = null;
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string; [key: string]: unknown }) =>
    React.createElement('img', {
      src: props.src,
      alt: props.alt,
      width: props.width,
      height: props.height,
      className: props.className,
      loading: props.loading,
      sizes: props.sizes,
      'data-fill': props.fill ? 'true' : undefined,
      'data-priority': props.priority ? 'true' : undefined,
    }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
    [key: string]: unknown;
  }) =>
    React.createElement(
      'a',
      {
        href,
        ...props,
        onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
          event.preventDefault();
          onClick?.(event);
        },
      },
      children
    ),
}));
