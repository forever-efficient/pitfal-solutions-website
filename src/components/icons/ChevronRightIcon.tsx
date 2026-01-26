'use client';

import { defaultIconProps, type IconProps } from './types';

/** Right chevron - used for next/forward navigation */
export function ChevronRightIcon({ size = 24, title, ...props }: IconProps) {
  return (
    <svg
      {...defaultIconProps}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}
