'use client';

import { defaultIconProps, type IconProps } from './types';

/** Alert/warning triangle icon - used for error states */
export function AlertIcon({ size = 24, title, ...props }: IconProps) {
  return (
    <svg
      {...defaultIconProps}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
