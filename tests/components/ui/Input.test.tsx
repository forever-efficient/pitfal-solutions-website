import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input, Textarea } from '@/components/ui/Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" name="email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders without label when not provided', () => {
    render(<Input name="email" placeholder="Enter email" />);
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input label="Email" name="email" error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('applies error styles when error is present', () => {
    render(<Input label="Email" name="email" error="Invalid email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveClass('border-red-500');
  });

  it('shows hint text', () => {
    render(<Input label="Phone" name="phone" hint="Optional" />);
    expect(screen.getByText('Optional')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input label="Name" name="name" onChange={handleChange} />);

    const input = screen.getByLabelText('Name');
    fireEvent.change(input, { target: { value: 'John' } });

    expect(handleChange).toHaveBeenCalled();
  });

  it('can be disabled', () => {
    render(<Input label="Name" name="name" disabled />);
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });

  it('renders required indicator', () => {
    render(<Input label="Name" name="name" required />);
    const input = screen.getByLabelText(/Name/);
    expect(input).toBeRequired();
  });

  it('supports different input types', () => {
    render(<Input label="Password" name="password" type="password" />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });
});

describe('Textarea', () => {
  it('renders with label', () => {
    render(<Textarea label="Message" name="message" />);
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
  });

  it('renders as a textarea element', () => {
    render(<Textarea label="Message" name="message" />);
    const textarea = screen.getByLabelText('Message');
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('shows error message', () => {
    render(<Textarea label="Message" name="message" error="Message too short" />);
    expect(screen.getByText('Message too short')).toBeInTheDocument();
  });

  it('supports rows prop', () => {
    render(<Textarea label="Message" name="message" rows={10} />);
    const textarea = screen.getByLabelText('Message');
    expect(textarea).toHaveAttribute('rows', '10');
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Textarea label="Message" name="message" onChange={handleChange} />);

    const textarea = screen.getByLabelText('Message');
    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    expect(handleChange).toHaveBeenCalled();
  });
});
