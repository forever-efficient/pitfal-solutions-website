'use client';

import { defaultIconProps, type IconProps } from './types';

/** Close/X icon - used for dismissing modals and menus */
export function CloseIcon({ size = 24, title, ...props }: IconProps) {
  return (
    <svg
      {...defaultIconProps}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
