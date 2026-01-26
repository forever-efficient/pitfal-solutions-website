'use client';

import { defaultIconProps, type IconProps } from './types';

/** Left chevron - used for previous/back navigation */
export function ChevronLeftIcon({ size = 24, title, ...props }: IconProps) {
  return (
    <svg
      {...defaultIconProps}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M15 19l-7-7 7-7" />
    </svg>
  );
}
