'use client';

import { defaultIconProps, type IconProps } from './types';

/** Location/map pin icon - used for address display */
export function LocationIcon({ size = 24, title, ...props }: IconProps) {
  return (
    <svg
      {...defaultIconProps}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
