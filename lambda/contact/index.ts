import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { randomUUID } from 'crypto';
import {
  success,
  error,
  badRequest,
  forbidden,
  methodNotAllowed,
  tooManyRequests,
  serverError,
  ErrorCode,
} from '../shared/response';

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MINUTES = 15; // Time window for rate limiting
const MAX_SUBMISSIONS_PER_WINDOW = 3; // Max submissions per email per window

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

// Structured logger for CloudWatch Logs Insights
interface LogContext {
  requestId: string;
  sourceIp?: string;
  userAgent?: string;
  inquiryId?: string;
}

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

function log(level: LogLevel, message: string, context: LogContext, data?: Record<string, unknown>): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
    ...(data && { data }),
  };
  // JSON format for CloudWatch Logs Insights queries
  console.log(JSON.stringify(logEntry));
}

function getRequestContext(event: APIGatewayProxyEvent): LogContext {
  return {
    requestId: event.requestContext?.requestId || randomUUID(),
    sourceIp: event.requestContext?.identity?.sourceIp,
    userAgent: event.requestContext?.identity?.userAgent,
  };
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

// Check for duplicate/rate-limited submissions
async function checkRateLimit(email: string, ctx: LogContext): Promise<{ allowed: boolean; recentCount: number }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: INQUIRIES_TABLE,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email AND createdAt > :windowStart',
        ExpressionAttributeValues: {
          ':email': email.toLowerCase().trim(),
          ':windowStart': windowStart,
        },
        Select: 'COUNT',
      })
    );

    const recentCount = result.Count || 0;
    const allowed = recentCount < MAX_SUBMISSIONS_PER_WINDOW;

    log('INFO', 'Rate limit check completed', ctx, {
      email: email.substring(0, 3) + '***', // Log partial email for privacy
      recentCount,
      allowed,
      windowMinutes: RATE_LIMIT_WINDOW_MINUTES,
    });

    return { allowed, recentCount };
  } catch (rateLimitError) {
    // If rate limit check fails, allow the request but log the error
    const errorMessage = rateLimitError instanceof Error ? rateLimitError.message : 'Unknown error';
    log('ERROR', 'Rate limit check failed, allowing request', ctx, { error: errorMessage });
    return { allowed: true, recentCount: 0 };
  }
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
  const ctx = getRequestContext(event);
  log('INFO', 'Contact form submission received', ctx, { method: event.httpMethod });

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    log('WARN', 'Method not allowed', ctx, { method: event.httpMethod });
    return methodNotAllowed();
  }

  // CSRF protection: Verify X-Requested-With header
  // Browsers enforce CORS for custom headers, preventing cross-origin attackers from setting this
  const xRequestedWith = event.headers['X-Requested-With'] || event.headers['x-requested-with'];
  if (xRequestedWith !== 'XMLHttpRequest') {
    log('WARN', 'Missing or invalid X-Requested-With header (CSRF protection)', ctx, {
      xRequestedWith: xRequestedWith || 'missing',
    });
    return forbidden('CSRF validation failed');
  }

  // Parse request body
  let formData: ContactFormData;
  try {
    formData = JSON.parse(event.body || '{}');
  } catch (parseError) {
    log('WARN', 'Invalid JSON in request body', ctx, {
      error: parseError instanceof Error ? parseError.message : 'Unknown parse error'
    });
    return error('Invalid JSON in request body', 400, { code: ErrorCode.INVALID_JSON });
  }

  // Validate form data
  const validationErrors = validateForm(formData);
  if (validationErrors.length > 0) {
    // Don't reveal honeypot detection
    const publicErrors = validationErrors.filter((e) => e.field !== 'honeypot');
    if (publicErrors.length === 0) {
      // Silently reject spam but return success to not tip off bots
      log('WARN', 'Spam submission detected and rejected', ctx, { honeypot: true });
      return success({ message: 'Thank you for your message!' });
    }
    log('INFO', 'Validation failed', ctx, { errors: publicErrors });
    return error('Validation failed', 400, { code: ErrorCode.VALIDATION_FAILED, fieldErrors: publicErrors });
  }

  // Check rate limit for this email
  const { allowed, recentCount } = await checkRateLimit(formData.email, ctx);
  if (!allowed) {
    log('WARN', 'Rate limit exceeded', ctx, {
      email: formData.email.substring(0, 3) + '***',
      recentCount,
      maxAllowed: MAX_SUBMISSIONS_PER_WINDOW,
    });
    return tooManyRequests('Too many submissions. Please wait before submitting again.');
  }

  // Generate inquiry ID
  const inquiryId = randomUUID();
  const timestamp = new Date().toISOString();
  const ctxWithInquiry = { ...ctx, inquiryId };

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
    log('INFO', 'Inquiry stored successfully', ctxWithInquiry);
  } catch (dbError) {
    const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
    const errorName = dbError instanceof Error ? dbError.name : 'UnknownError';
    log('ERROR', 'Failed to store inquiry', ctxWithInquiry, {
      error: errorMessage,
      errorType: errorName
    });
    return error('Failed to submit inquiry. Please try again.', 500, { code: ErrorCode.DATABASE_ERROR });
  }

  // Send emails (don't fail the request if emails fail)
  try {
    await Promise.all([
      sendNotificationEmail({ ...formData, id: inquiryId }),
      sendConfirmationEmail(formData),
    ]);
    log('INFO', 'Notification emails sent successfully', ctxWithInquiry);
  } catch (emailError) {
    // Log but don't fail - the inquiry is already saved
    const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown email error';
    const errorName = emailError instanceof Error ? emailError.name : 'UnknownError';
    log('ERROR', 'Failed to send notification emails', ctxWithInquiry, {
      error: errorMessage,
      errorType: errorName
    });
  }

  log('INFO', 'Contact form submission completed', ctxWithInquiry);
  return success({
    message: 'Thank you for your message! We will get back to you soon.',
    inquiryId,
  });
};
