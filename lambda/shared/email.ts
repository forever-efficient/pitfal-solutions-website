/**
 * @fileoverview Email utilities for Lambda functions using AWS SES.
 * Provides templated emails, attachments, and common email patterns.
 * @module lambda/shared/email
 */

import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';

/**
 * SES Client instance initialized once per Lambda cold start.
 */
const sesClient = new SESClient({});

/** Default sender email address for all outgoing emails */
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@pitfal.solutions';

/** Options for sending a simple email */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  textBody?: string;
  htmlBody?: string;
  replyTo?: string;
}

export interface TemplatedEmailOptions {
  to: string | string[];
  template: EmailTemplate;
  data: Record<string, string>;
  replyTo?: string;
}

export type EmailTemplate =
  | 'contact-confirmation'
  | 'contact-notification'
  | 'booking-confirmation'
  | 'booking-notification'
  | 'booking-status-update'
  | 'gallery-ready';

/**
 * Sends a simple email via AWS SES.
 * @param options - Email configuration including recipients, subject, and body
 * @throws Will throw if SES fails to send the email
 * @example
 * await sendEmail({
 *   to: 'customer@example.com',
 *   subject: 'Welcome!',
 *   textBody: 'Thanks for signing up.',
 *   htmlBody: '<h1>Thanks for signing up!</h1>'
 * });
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

  await sesClient.send(
    new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: toAddresses,
      },
      ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
      Message: {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8',
        },
        Body: {
          ...(options.textBody && {
            Text: {
              Data: options.textBody,
              Charset: 'UTF-8',
            },
          }),
          ...(options.htmlBody && {
            Html: {
              Data: options.htmlBody,
              Charset: 'UTF-8',
            },
          }),
        },
      },
    })
  );
}

// Email templates
const templates: Record<EmailTemplate, { subject: string; text: string; html?: string }> = {
  'contact-confirmation': {
    subject: 'Thank you for contacting Pitfal Solutions!',
    text: `
Hi {{name}},

Thank you for reaching out to Pitfal Solutions! We've received your message and will get back to you within 24-48 hours.

Here's a summary of your inquiry:
Session Type: {{sessionType}}
Message: {{message}}

If you have any urgent questions, feel free to reach out directly.

Best regards,
Pitfal Solutions
"Swing the Gap"

---
This is an automated confirmation email. Please do not reply directly to this message.
    `.trim(),
  },

  'contact-notification': {
    subject: 'New Inquiry from {{name}} - Pitfal Solutions',
    text: `
New Contact Form Submission

Name: {{name}}
Email: {{email}}
Phone: {{phone}}
Session Type: {{sessionType}}

Message:
{{message}}

---
Inquiry ID: {{inquiryId}}
Submitted at: {{timestamp}}
    `.trim(),
  },

  'booking-confirmation': {
    subject: 'Booking Confirmation - Pitfal Solutions',
    text: `
Hi {{name}},

Your booking has been confirmed!

Details:
- Date: {{date}}
- Time: {{time}}
- Location: {{location}}
- Session Type: {{sessionType}}

We look forward to working with you!

Best regards,
Pitfal Solutions
    `.trim(),
  },

  'booking-notification': {
    subject: 'New Booking Request from {{name}} - Pitfal Solutions',
    text: `
New Booking Request

Client: {{name}}
Email: {{email}}
Phone: {{phone}}
Session Type: {{sessionType}}
Date: {{date}}
Time: {{time}}
Notes: {{notes}}

---
Booking ID: {{bookingId}}
Submitted at: {{timestamp}}
    `.trim(),
  },

  'booking-status-update': {
    subject: 'Booking Update - Pitfal Solutions',
    text: `
Hi {{name}},

Your booking status has been updated.

Status: {{status}}
Date: {{date}}
Time: {{time}}
Session Type: {{sessionType}}

{{message}}

Best regards,
Pitfal Solutions
    `.trim(),
  },

  'gallery-ready': {
    subject: 'Your Gallery is Ready - Pitfal Solutions',
    text: `
Hi {{name}},

Great news! Your gallery from our {{sessionType}} session is ready for viewing.

Click the link below to access your private gallery:
{{galleryUrl}}

Password: {{password}}

The gallery will be available for {{expirationDays}} days. If you need more time, please let us know.

Best regards,
Pitfal Solutions
    `.trim(),
  },
};

/**
 * Replaces template placeholders with actual data values.
 * @param template - Template string with {{placeholder}} syntax
 * @param data - Key-value pairs for replacement
 * @returns Template with placeholders replaced
 */
function applyTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
}

/**
 * Sends an email using a predefined template.
 * Templates are defined in the templates object and support {{placeholder}} syntax.
 * @param options - Template name, recipient, and data for placeholder replacement
 * @throws Will throw if template doesn't exist or SES fails
 * @example
 * await sendTemplatedEmail({
 *   to: 'customer@example.com',
 *   template: 'contact-confirmation',
 *   data: { name: 'John', sessionType: 'Portrait' }
 * });
 */
export async function sendTemplatedEmail(options: TemplatedEmailOptions): Promise<void> {
  const template = templates[options.template];
  if (!template) {
    throw new Error(`Email template "${options.template}" not found`);
  }

  const subject = applyTemplate(template.subject, options.data);
  const textBody = applyTemplate(template.text, options.data);
  const htmlBody = template.html ? applyTemplate(template.html, options.data) : undefined;

  await sendEmail({
    to: options.to,
    subject,
    textBody,
    htmlBody,
    replyTo: options.replyTo,
  });
}

/**
 * Sends an email with file attachments using raw MIME format.
 * @param options - Email options plus array of attachments
 * @throws Will throw if SES fails to send the raw email
 * @example
 * await sendEmailWithAttachment({
 *   to: 'customer@example.com',
 *   subject: 'Your Photos',
 *   textBody: 'Here are your photos!',
 *   attachments: [{
 *     filename: 'photo.jpg',
 *     content: imageBuffer,
 *     contentType: 'image/jpeg'
 *   }]
 * });
 */
export async function sendEmailWithAttachment(
  options: EmailOptions & { attachments: Array<{ filename: string; content: Buffer; contentType: string }> }
): Promise<void> {
  const boundary = `----=_Part_${Date.now()}`;
  const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

  let rawEmail = [
    `From: ${FROM_EMAIL}`,
    `To: ${toAddresses.join(', ')}`,
    `Subject: ${options.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    options.textBody || '',
  ].join('\r\n');

  for (const attachment of options.attachments) {
    const safeFilename = attachment.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    rawEmail += [
      '',
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${safeFilename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${safeFilename}"`,
      '',
      attachment.content.toString('base64'),
    ].join('\r\n');
  }

  rawEmail += `\r\n--${boundary}--`;

  await sesClient.send(
    new SendRawEmailCommand({
      RawMessage: {
        Data: Buffer.from(rawEmail),
      },
    })
  );
}
