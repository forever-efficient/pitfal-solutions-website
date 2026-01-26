'use client';

import { defaultIconProps, type IconProps } from './types';

/** Checkmark icon - used for success states and feature lists */
export function CheckIcon({ size = 24, title, ...props }: IconProps) {
  return (
    <svg
      {...defaultIconProps}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
