'use client';

import { defaultIconProps, type IconProps } from './types';

/** Hamburger menu icon - used for mobile navigation toggle */
export function MenuIcon({ size = 24, title, ...props }: IconProps) {
  return (
    <svg
      {...defaultIconProps}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
