'use client';

import { defaultIconProps, type IconProps } from './types';

/** Stamp/seal icon - used for Colorado Notary service */
export function StampIcon({ size = 24, title, ...props }: IconProps) {
  return (
    <svg
      {...defaultIconProps}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M12 2a5 5 0 015 7v2h1a2 2 0 012 2v2H4v-2a2 2 0 012-2h1V9A5 5 0 0112 2z" />
      <path d="M4 17h16v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
    </svg>
  );
}
