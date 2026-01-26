import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { randomUUID } from 'crypto';

// Initialize clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sesClient = new SESClient({});

// Environment variables with validation
const INQUIRIES_TABLE = process.env.INQUIRIES_TABLE;
const FROM_EMAIL = process.env.FROM_EMAIL;
const CONTACT_EMAIL = process.env.CONTACT_EMAIL;

// Validate required environment variables at startup
if (!INQUIRIES_TABLE || !FROM_EMAIL || !CONTACT_EMAIL) {
  throw new Error(
    `Missing required environment variables: ${[
      !INQUIRIES_TABLE && 'INQUIRIES_TABLE',
      !FROM_EMAIL && 'FROM_EMAIL',
      !CONTACT_EMAIL && 'CONTACT_EMAIL',
    ]
      .filter(Boolean)
      .join(', ')}`
  );
}

// Sanitize string to prevent email header injection
function sanitizeForEmail(input: string): string {
  // Remove newlines, carriage returns, and other control characters
  // that could be used for header injection
  return input
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '')
    .trim();
}

// Types
interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  sessionType?: string;
  message: string;
  honeypot?: string;
}

interface ValidationError {
  field: string;
  message: string;
}

// Validation
function validateForm(data: ContactFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  // Name validation
  if (!data.name || data.name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
  }
  if (data.name && data.name.length > 100) {
    errors.push({ field: 'name', message: 'Name must be less than 100 characters' });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.push({ field: 'email', message: 'Please provide a valid email address' });
  }

  // Phone validation (optional but must be valid if provided)
  if (data.phone) {
    const phoneRegex = /^[\d\s\-\(\)\+]{10,20}$/;
    if (!phoneRegex.test(data.phone)) {
      errors.push({ field: 'phone', message: 'Please provide a valid phone number' });
    }
  }

  // Message validation
  if (!data.message || data.message.trim().length < 10) {
    errors.push({ field: 'message', message: 'Message must be at least 10 characters' });
  }
  if (data.message && data.message.length > 5000) {
    errors.push({ field: 'message', message: 'Message must be less than 5000 characters' });
  }

  // Honeypot check (spam detection)
  if (data.honeypot) {
    errors.push({ field: 'honeypot', message: 'Spam detected' });
  }

  return errors;
}

// Response helper
function createResponse(statusCode: number, body: object): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://www.pitfal.solutions',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

// Send notification email to business owner
async function sendNotificationEmail(inquiry: ContactFormData & { id: string }): Promise<void> {
  const safeName = sanitizeForEmail(inquiry.name);
  const safeEmail = sanitizeForEmail(inquiry.email);
  const safePhone = inquiry.phone ? sanitizeForEmail(inquiry.phone) : 'Not provided';
  const safeSessionType = inquiry.sessionType ? sanitizeForEmail(inquiry.sessionType) : 'Not specified';
  const safeMessage = sanitizeForEmail(inquiry.message);

  const emailBody = `
New Contact Form Submission

Name: ${safeName}
Email: ${safeEmail}
Phone: ${safePhone}
Session Type: ${safeSessionType}

Message:
${safeMessage}

---
Inquiry ID: ${inquiry.id}
Submitted at: ${new Date().toISOString()}
  `.trim();

  await sesClient.send(
    new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: [CONTACT_EMAIL],
      },
      Message: {
        Subject: {
          Data: `New Inquiry from ${safeName} - Pitfal Solutions`,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: emailBody,
            Charset: 'UTF-8',
          },
        },
      },
    })
  );
}

// Send confirmation email to customer
async function sendConfirmationEmail(inquiry: ContactFormData): Promise<void> {
  const safeName = sanitizeForEmail(inquiry.name);
  const safeSessionType = inquiry.sessionType ? sanitizeForEmail(inquiry.sessionType) : 'General Inquiry';
  const safeMessage = sanitizeForEmail(inquiry.message);

  const emailBody = `
Hi ${safeName},

Thank you for reaching out to Pitfal Solutions! We've received your message and will get back to you within 24-48 hours.

Here's a summary of your inquiry:

Session Type: ${safeSessionType}
Message: ${safeMessage}

If you have any urgent questions, feel free to reach out directly.

Best regards,
Pitfal Solutions
"Swing the Gap"

---
This is an automated confirmation email. Please do not reply directly to this message.
  `.trim();

  await sesClient.send(
    new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: [inquiry.email],
      },
      Message: {
        Subject: {
          Data: 'Thank you for contacting Pitfal Solutions!',
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: emailBody,
            Charset: 'UTF-8',
          },
        },
      },
    })
  );
}

// Main handler
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Contact form submission received');

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return createResponse(405, { error: 'Method not allowed' });
  }

  // Parse request body
  let formData: ContactFormData;
  try {
    formData = JSON.parse(event.body || '{}');
  } catch {
    return createResponse(400, { error: 'Invalid JSON in request body' });
  }

  // Validate form data
  const validationErrors = validateForm(formData);
  if (validationErrors.length > 0) {
    // Don't reveal honeypot detection
    const publicErrors = validationErrors.filter((e) => e.field !== 'honeypot');
    if (publicErrors.length === 0) {
      // Silently reject spam but return success to not tip off bots
      console.log('Spam submission detected and rejected');
      return createResponse(200, { success: true, message: 'Thank you for your message!' });
    }
    return createResponse(400, { error: 'Validation failed', errors: publicErrors });
  }

  // Generate inquiry ID
  const inquiryId = randomUUID();
  const timestamp = new Date().toISOString();

  // Store in DynamoDB
  try {
    await docClient.send(
      new PutCommand({
        TableName: INQUIRIES_TABLE,
        Item: {
          id: inquiryId,
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone?.trim() || null,
          sessionType: formData.sessionType || 'general',
          message: formData.message.trim(),
          status: 'new',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      })
    );
    console.log(`Inquiry ${inquiryId} stored successfully`);
  } catch (error) {
    console.error('Failed to store inquiry:', error);
    return createResponse(500, { error: 'Failed to submit inquiry. Please try again.' });
  }

  // Send emails (don't fail the request if emails fail)
  try {
    await Promise.all([
      sendNotificationEmail({ ...formData, id: inquiryId }),
      sendConfirmationEmail(formData),
    ]);
    console.log('Notification emails sent successfully');
  } catch (error) {
    // Log but don't fail - the inquiry is already saved
    console.error('Failed to send notification emails:', error);
  }

  return createResponse(200, {
    success: true,
    message: 'Thank you for your message! We will get back to you soon.',
    inquiryId,
  });
};
