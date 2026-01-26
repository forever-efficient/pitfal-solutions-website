import type { SVGProps } from 'react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  /** Width and height in pixels (icons are square) */
  size?: number;
  /** Icon title for accessibility */
  title?: string;
}

export const defaultIconProps: Partial<IconProps> = {
  size: 24,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};
