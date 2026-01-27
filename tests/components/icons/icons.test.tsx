import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  MenuIcon,
  CloseIcon,
  ArrowRightIcon,
  ArrowDownIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  CheckIcon,
  SpinnerIcon,
  AlertIcon,
  QuoteIcon,
  StarIcon,
  EmailIcon,
  PhoneIcon,
  LocationIcon,
  InstagramIcon,
  FacebookIcon,
  LinkedInIcon,
  BuildingIcon,
  UserIcon,
  CalendarIcon,
  HeartIcon,
  ShieldCheckIcon,
  UsersIcon,
} from '@/components/icons';

const icons = [
  { name: 'MenuIcon', Component: MenuIcon },
  { name: 'CloseIcon', Component: CloseIcon },
  { name: 'ArrowRightIcon', Component: ArrowRightIcon },
  { name: 'ArrowDownIcon', Component: ArrowDownIcon },
  { name: 'ChevronDownIcon', Component: ChevronDownIcon },
  { name: 'ChevronLeftIcon', Component: ChevronLeftIcon },
  { name: 'ChevronRightIcon', Component: ChevronRightIcon },
  { name: 'EyeIcon', Component: EyeIcon },
  { name: 'CheckIcon', Component: CheckIcon },
  { name: 'SpinnerIcon', Component: SpinnerIcon },
  { name: 'AlertIcon', Component: AlertIcon },
  { name: 'QuoteIcon', Component: QuoteIcon },
  { name: 'EmailIcon', Component: EmailIcon },
  { name: 'PhoneIcon', Component: PhoneIcon },
  { name: 'LocationIcon', Component: LocationIcon },
  { name: 'InstagramIcon', Component: InstagramIcon },
  { name: 'FacebookIcon', Component: FacebookIcon },
  { name: 'LinkedInIcon', Component: LinkedInIcon },
  { name: 'BuildingIcon', Component: BuildingIcon },
  { name: 'UserIcon', Component: UserIcon },
  { name: 'CalendarIcon', Component: CalendarIcon },
  { name: 'HeartIcon', Component: HeartIcon },
  { name: 'ShieldCheckIcon', Component: ShieldCheckIcon },
  { name: 'UsersIcon', Component: UsersIcon },
];

describe('Icon Components', () => {
  icons.forEach(({ name, Component }) => {
    describe(name, () => {
      it('renders without crashing', () => {
        render(<Component data-testid={name} />);
        expect(screen.getByTestId(name)).toBeInTheDocument();
      });

      it('renders as an SVG element', () => {
        render(<Component data-testid={name} />);
        const icon = screen.getByTestId(name);
        expect(icon.tagName).toBe('svg');
      });

      it('applies custom size', () => {
        render(<Component data-testid={name} size={32} />);
        const icon = screen.getByTestId(name);
        expect(icon).toHaveAttribute('width', '32');
        expect(icon).toHaveAttribute('height', '32');
      });

      it('applies custom className', () => {
        render(<Component data-testid={name} className="custom-class" />);
        const icon = screen.getByTestId(name);
        expect(icon).toHaveClass('custom-class');
      });

      it('is hidden from accessibility by default', () => {
        render(<Component data-testid={name} />);
        const icon = screen.getByTestId(name);
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });

      it('shows title for accessibility when provided', () => {
        render(<Component data-testid={name} title="Icon title" />);
        expect(screen.getByTitle('Icon title')).toBeInTheDocument();
      });
    });
  });
});

describe('StarIcon', () => {
  it('renders unfilled state by default', () => {
    render(<StarIcon data-testid="star" />);
    const icon = screen.getByTestId('star');
    expect(icon).toHaveAttribute('fill', 'none');
  });

  it('renders filled state when filled prop is true', () => {
    render(<StarIcon data-testid="star" filled />);
    const icon = screen.getByTestId('star');
    expect(icon).toHaveAttribute('fill', 'currentColor');
  });
});
