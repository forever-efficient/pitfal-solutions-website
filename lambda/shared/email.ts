import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';

// Initialize SES client
const sesClient = new SESClient({});

// Environment variables
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@pitfal.solutions';

// Email types
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
  | 'gallery-ready';

// Send a simple email
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

// Replace template placeholders
function applyTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
}

// Send a templated email
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

// Send email with attachment (using raw email)
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
    rawEmail += [
      '',
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
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
