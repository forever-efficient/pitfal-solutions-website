'use client';

import { defaultIconProps, type IconProps } from './types';

/** Down chevron - used for dropdowns and accordion toggles */
export function ChevronDownIcon({ size = 24, title, ...props }: IconProps) {
  return (
    <svg
      {...defaultIconProps}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M19 9l-7 7-7-7" />
    </svg>
  );
}
