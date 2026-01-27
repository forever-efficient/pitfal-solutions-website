import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactForm } from '@/components/forms/ContactForm';

describe('ContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all form fields', () => {
    render(<ContactForm />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/service type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<ContactForm />);
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('renders service type options', () => {
    render(<ContactForm />);
    const select = screen.getByLabelText(/service type/i);

    expect(select).toContainElement(screen.getByText('Select a service...'));
    expect(select).toContainElement(screen.getByText('Brand Photography'));
    expect(select).toContainElement(screen.getByText('Portrait Session'));
    expect(select).toContainElement(screen.getByText('Event Coverage'));
    expect(select).toContainElement(screen.getByText('Commercial Project'));
    expect(select).toContainElement(screen.getByText('Other / General Inquiry'));
  });

  it('has correct form accessibility', () => {
    render(<ContactForm />);
    expect(screen.getByRole('form', { name: /contact form/i })).toBeInTheDocument();
  });

  it('name input accepts text', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'John Doe');
    expect(nameInput).toHaveValue('John Doe');
  });

  it('email input accepts text', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('phone input accepts text', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    const phoneInput = screen.getByLabelText(/phone/i);
    await user.type(phoneInput, '(303) 555-1234');
    expect(phoneInput).toHaveValue('(303) 555-1234');
  });

  it('message textarea accepts text', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    const messageInput = screen.getByLabelText(/message/i);
    await user.type(messageInput, 'Hello, I would like to book a session.');
    expect(messageInput).toHaveValue('Hello, I would like to book a session.');
  });

  it('service type select can be changed', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    const select = screen.getByLabelText(/service type/i);
    await user.selectOptions(select, 'brand');
    expect(select).toHaveValue('brand');
  });

  describe('validation messages', () => {
    // Note: Invalid email format validation is handled by browser's native
    // HTML5 type="email" validation, which doesn't fire in jsdom test environment

    it('shows error for short message', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/message/i), 'Short');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText(/message must be at least 10 characters/i)).toBeInTheDocument();
      });
    });

    it('shows error for invalid phone number', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/phone/i), '123');
      await user.type(screen.getByLabelText(/message/i), 'This is a valid test message for the form');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText(/please provide a valid phone number/i)).toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('submits form with valid data', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, message: 'Thank you!' }),
        })
      ) as unknown as typeof fetch;

      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/message/i), 'This is a test message for the form.');

      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/contact', expect.any(Object));
      });
    });

    it('shows success state after successful submission', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, message: 'Thank you!' }),
        })
      ) as unknown as typeof fetch;

      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/message/i), 'This is a test message for the form.');

      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /message sent/i })).toBeInTheDocument();
      });
    });

    it('shows error message after failed submission', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Server error occurred' }),
        })
      ) as unknown as typeof fetch;

      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/message/i), 'This is a test message for the form.');

      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/server error occurred/i)).toBeInTheDocument();
      });
    });

    it('shows network error on fetch failure', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error'))) as unknown as typeof fetch;

      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/message/i), 'This is a test message for the form.');

      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('allows sending another message after success', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
      ) as unknown as typeof fetch;

      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/message/i), 'This is a test message for the form.');

      await user.click(screen.getByRole('button', { name: /send message/i }));

      const sendAnotherButton = await screen.findByRole('button', { name: /send another message/i });
      await user.click(sendAnotherButton);

      // Form should be back
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    });
  });
});
