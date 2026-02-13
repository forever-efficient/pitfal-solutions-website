import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InquiryList } from '@/components/admin/InquiryList';

const mockInquiries = [
  {
    id: 'inq-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    sessionType: 'brand',
    status: 'new',
    createdAt: '2026-01-15T10:00:00Z',
    message: 'I need brand photography for my business.',
    phone: '303-555-1234',
  },
  {
    id: 'inq-2',
    name: 'John Smith',
    email: 'john@example.com',
    sessionType: 'portrait',
    status: 'replied',
    createdAt: '2026-01-20T14:30:00Z',
    message: 'Looking for portrait session pricing.',
  },
  {
    id: 'inq-3',
    name: 'Alex Johnson',
    email: 'alex@example.com',
    sessionType: '',
    status: 'read',
    createdAt: '2026-02-01T09:00:00Z',
    message: 'General inquiry about availability.',
  },
];

describe('InquiryList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no inquiries', () => {
    render(<InquiryList inquiries={[]} />);
    expect(screen.getByText('No inquiries found.')).toBeInTheDocument();
  });

  it('renders table with all column headers', () => {
    render(<InquiryList inquiries={mockInquiries} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders inquiry data in table rows', () => {
    render(<InquiryList inquiries={mockInquiries} />);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('brand')).toBeInTheDocument();
    expect(screen.getByText('new')).toBeInTheDocument();

    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('displays "general" when sessionType is empty', () => {
    render(<InquiryList inquiries={mockInquiries} />);
    expect(screen.getByText('general')).toBeInTheDocument();
  });

  it('applies correct status badge colors', () => {
    render(<InquiryList inquiries={mockInquiries} />);

    const newBadge = screen.getByText('new');
    expect(newBadge).toHaveClass('bg-green-100', 'text-green-700');

    const repliedBadge = screen.getByText('replied');
    expect(repliedBadge).toHaveClass('bg-blue-100', 'text-blue-700');

    const readBadge = screen.getByText('read');
    expect(readBadge).toHaveClass('bg-neutral-100', 'text-neutral-600');
  });

  it('shows "Mark Read" button only for new inquiries', () => {
    const onStatusChange = vi.fn();
    render(
      <InquiryList
        inquiries={mockInquiries}
        onStatusChange={onStatusChange}
      />
    );

    const markReadButtons = screen.getAllByText('Mark Read');
    expect(markReadButtons).toHaveLength(1);
  });

  it('shows "Mark Replied" button for non-replied inquiries', () => {
    const onStatusChange = vi.fn();
    render(
      <InquiryList
        inquiries={mockInquiries}
        onStatusChange={onStatusChange}
      />
    );

    const markRepliedButtons = screen.getAllByText('Mark Replied');
    // inq-1 (new) and inq-3 (read) should have Mark Replied; inq-2 (replied) should not
    expect(markRepliedButtons).toHaveLength(2);
  });

  it('calls onStatusChange with correct args when Mark Read is clicked', async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(
      <InquiryList
        inquiries={mockInquiries}
        onStatusChange={onStatusChange}
      />
    );

    await user.click(screen.getByText('Mark Read'));
    expect(onStatusChange).toHaveBeenCalledWith('inq-1', 'read');
  });

  it('calls onStatusChange with correct args when Mark Replied is clicked', async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(
      <InquiryList
        inquiries={mockInquiries}
        onStatusChange={onStatusChange}
      />
    );

    const markRepliedButtons = screen.getAllByText('Mark Replied');
    await user.click(markRepliedButtons[0]);
    expect(onStatusChange).toHaveBeenCalledWith('inq-1', 'replied');
  });

  it('calls onDelete when Delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<InquiryList inquiries={mockInquiries} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith('inq-1');
  });

  it('does not render action buttons when callbacks are not provided', () => {
    render(<InquiryList inquiries={mockInquiries} />);

    expect(screen.queryByText('Mark Read')).not.toBeInTheDocument();
    expect(screen.queryByText('Mark Replied')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('expands row to show message when clicked', async () => {
    const user = userEvent.setup();
    render(<InquiryList inquiries={mockInquiries} />);

    expect(
      screen.queryByText('I need brand photography for my business.')
    ).not.toBeInTheDocument();

    await user.click(screen.getByText('Jane Doe'));

    expect(
      screen.getByText('I need brand photography for my business.')
    ).toBeInTheDocument();
  });

  it('shows phone number in expanded row when available', async () => {
    const user = userEvent.setup();
    render(<InquiryList inquiries={mockInquiries} />);

    await user.click(screen.getByText('Jane Doe'));

    expect(screen.getByText('Phone:')).toBeInTheDocument();
    expect(screen.getByText('303-555-1234')).toBeInTheDocument();
  });

  it('does not show phone when not available in expanded row', async () => {
    const user = userEvent.setup();
    render(<InquiryList inquiries={mockInquiries} />);

    await user.click(screen.getByText('John Smith'));

    expect(screen.queryByText('Phone:')).not.toBeInTheDocument();
  });

  it('collapses expanded row when clicked again', async () => {
    const user = userEvent.setup();
    render(<InquiryList inquiries={mockInquiries} />);

    await user.click(screen.getByText('Jane Doe'));
    expect(
      screen.getByText('I need brand photography for my business.')
    ).toBeInTheDocument();

    await user.click(screen.getByText('Jane Doe'));
    expect(
      screen.queryByText('I need brand photography for my business.')
    ).not.toBeInTheDocument();
  });

  it('only expands one row at a time', async () => {
    const user = userEvent.setup();
    render(<InquiryList inquiries={mockInquiries} />);

    await user.click(screen.getByText('Jane Doe'));
    expect(
      screen.getByText('I need brand photography for my business.')
    ).toBeInTheDocument();

    await user.click(screen.getByText('John Smith'));
    expect(
      screen.queryByText('I need brand photography for my business.')
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Looking for portrait session pricing.')
    ).toBeInTheDocument();
  });

  it('action button clicks do not toggle row expansion', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<InquiryList inquiries={mockInquiries} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    // Row should NOT be expanded
    expect(
      screen.queryByText('I need brand photography for my business.')
    ).not.toBeInTheDocument();
  });
});
