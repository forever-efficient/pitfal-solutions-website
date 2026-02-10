// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted() to ensure mock is available before vi.mock() factories run
const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
  SendEmailCommand: vi.fn().mockImplementation((params) => ({ ...params, _type: 'SendEmail' })),
  SendRawEmailCommand: vi.fn().mockImplementation((params) => ({ ...params, _type: 'SendRaw' })),
}));

import { sendEmail, sendTemplatedEmail, sendEmailWithAttachment } from '../../../lambda/shared/email';
import { SendEmailCommand } from '@aws-sdk/client-ses';

beforeEach(() => {
  mockSend.mockClear();
  mockSend.mockImplementation(() => Promise.resolve({}));
  vi.mocked(SendEmailCommand).mockClear();
});

describe('sendEmail', () => {
  it('sends a plain text email', async () => {
    await sendEmail({
      to: 'user@example.com',
      subject: 'Test Subject',
      textBody: 'Hello world',
    });

    expect(mockSend).toHaveBeenCalledOnce();
    const command = mockSend.mock.calls[0][0];
    expect(command.Destination.ToAddresses).toEqual(['user@example.com']);
    expect(command.Message.Subject.Data).toBe('Test Subject');
    expect(command.Message.Body.Text.Data).toBe('Hello world');
  });

  it('sends to multiple recipients', async () => {
    await sendEmail({
      to: ['a@test.com', 'b@test.com'],
      subject: 'Multi',
      textBody: 'Hello',
    });

    const command = mockSend.mock.calls[0][0];
    expect(command.Destination.ToAddresses).toEqual(['a@test.com', 'b@test.com']);
  });

  it('includes HTML body when provided', async () => {
    await sendEmail({
      to: 'user@test.com',
      subject: 'HTML',
      textBody: 'plain',
      htmlBody: '<h1>Hello</h1>',
    });

    const command = mockSend.mock.calls[0][0];
    expect(command.Message.Body.Html.Data).toBe('<h1>Hello</h1>');
    expect(command.Message.Body.Text.Data).toBe('plain');
  });

  it('sets replyTo when provided', async () => {
    await sendEmail({
      to: 'user@test.com',
      subject: 'Reply',
      textBody: 'test',
      replyTo: 'reply@test.com',
    });

    const command = mockSend.mock.calls[0][0];
    expect(command.ReplyToAddresses).toEqual(['reply@test.com']);
  });

  it('omits replyTo when not provided', async () => {
    await sendEmail({
      to: 'user@test.com',
      subject: 'No Reply',
      textBody: 'test',
    });

    const command = mockSend.mock.calls[0][0];
    expect(command.ReplyToAddresses).toBeUndefined();
  });

  it('propagates SES errors', async () => {
    mockSend.mockRejectedValueOnce(new Error('SES rate exceeded'));

    await expect(
      sendEmail({ to: 'user@test.com', subject: 'Fail', textBody: 'test' })
    ).rejects.toThrow('SES rate exceeded');
  });
});

describe('sendTemplatedEmail', () => {
  it('sends contact-confirmation template with replaced placeholders', async () => {
    await sendTemplatedEmail({
      to: 'customer@test.com',
      template: 'contact-confirmation',
      data: {
        name: 'Jane',
        sessionType: 'Portrait',
        message: 'I want photos',
      },
    });

    expect(mockSend).toHaveBeenCalledOnce();
    const command = mockSend.mock.calls[0][0];
    expect(command.Message.Subject.Data).toBe('Thank you for contacting Pitfal Solutions!');
    expect(command.Message.Body.Text.Data).toContain('Jane');
    expect(command.Message.Body.Text.Data).toContain('Portrait');
    expect(command.Message.Body.Text.Data).toContain('I want photos');
  });

  it('sends contact-notification template', async () => {
    await sendTemplatedEmail({
      to: 'admin@test.com',
      template: 'contact-notification',
      data: {
        name: 'Bob',
        email: 'bob@test.com',
        phone: '555-1234',
        sessionType: 'Event',
        message: 'Need event coverage',
        inquiryId: 'abc-123',
        timestamp: '2026-01-01T00:00:00Z',
      },
    });

    const command = mockSend.mock.calls[0][0];
    expect(command.Message.Subject.Data).toContain('Bob');
    expect(command.Message.Body.Text.Data).toContain('bob@test.com');
    expect(command.Message.Body.Text.Data).toContain('abc-123');
  });

  it('throws for unknown template', async () => {
    await expect(
      sendTemplatedEmail({
        to: 'user@test.com',
        template: 'nonexistent' as never,
        data: {},
      })
    ).rejects.toThrow('Email template "nonexistent" not found');
  });

  it('preserves unmatched placeholders', async () => {
    await sendTemplatedEmail({
      to: 'user@test.com',
      template: 'contact-confirmation',
      data: { name: 'Alice' }, // missing sessionType, message
    });

    const command = mockSend.mock.calls[0][0];
    expect(command.Message.Body.Text.Data).toContain('Alice');
    // Unmatched placeholders remain as-is
    expect(command.Message.Body.Text.Data).toContain('{{sessionType}}');
  });
});

describe('sendEmailWithAttachment', () => {
  it('sends raw email with attachment', async () => {
    const content = Buffer.from('fake image data');

    await sendEmailWithAttachment({
      to: 'user@test.com',
      subject: 'Your Photos',
      textBody: 'Here they are',
      attachments: [
        {
          filename: 'photo.jpg',
          content,
          contentType: 'image/jpeg',
        },
      ],
    });

    expect(mockSend).toHaveBeenCalledOnce();
    const command = mockSend.mock.calls[0][0];
    expect(command.RawMessage).toBeDefined();
    const rawEmail = command.RawMessage.Data.toString();
    expect(rawEmail).toContain('Subject: Your Photos');
    expect(rawEmail).toContain('photo.jpg');
    expect(rawEmail).toContain('image/jpeg');
    expect(rawEmail).toContain(content.toString('base64'));
  });

  it('handles multiple attachments', async () => {
    await sendEmailWithAttachment({
      to: ['a@test.com', 'b@test.com'],
      subject: 'Multi',
      textBody: 'Files',
      attachments: [
        { filename: 'a.pdf', content: Buffer.from('pdf'), contentType: 'application/pdf' },
        { filename: 'b.png', content: Buffer.from('png'), contentType: 'image/png' },
      ],
    });

    const command = mockSend.mock.calls[0][0];
    const rawEmail = command.RawMessage.Data.toString();
    expect(rawEmail).toContain('a.pdf');
    expect(rawEmail).toContain('b.png');
    expect(rawEmail).toContain('a@test.com, b@test.com');
  });
});
