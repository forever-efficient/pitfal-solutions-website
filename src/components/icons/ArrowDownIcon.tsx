'use client';

import { defaultIconProps, type IconProps } from './types';

/** Down arrow with tail - used for scroll indicators */
export function ArrowDownIcon({ size = 24, title, ...props }: IconProps) {
  return (
    <svg
      {...defaultIconProps}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );
}
