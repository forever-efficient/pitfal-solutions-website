'use client';

import { defaultIconProps, type IconProps } from './types';

/** Long right arrow with tail - used for CTAs like "View Portfolio", "Learn More" */
export function ArrowRightIcon({ size = 24, title, ...props }: IconProps) {
  return (
    <svg
      {...defaultIconProps}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}
