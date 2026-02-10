// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Use vi.hoisted() to ensure mocks are available before vi.mock() factories run
const { mockDynamoSend, mockSendEmail } = vi.hoisted(() => ({
  mockDynamoSend: vi.fn(),
  mockSendEmail: vi.fn(),
}));

// Mock DynamoDB
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn().mockReturnValue({ send: mockDynamoSend }),
  },
  PutCommand: vi.fn().mockImplementation((params) => params),
  QueryCommand: vi.fn().mockImplementation((params) => params),
}));

// Mock SES (via shared email module) - use the absolute path that the contact handler resolves to
vi.mock('../../../lambda/shared/email', () => ({
  sendEmail: mockSendEmail,
}));

// Set required env vars before importing handler
vi.stubEnv('INQUIRIES_TABLE', 'test-inquiries');
vi.stubEnv('CONTACT_EMAIL', 'admin@test.com');
vi.stubEnv('FROM_EMAIL', 'noreply@test.com');
vi.stubEnv('CORS_ALLOWED_ORIGINS', 'https://test.com');

// Import handler after mocks and env are set
const { handler } = await import('../../../lambda/contact/index');

// Helper to create a mock API Gateway event
function createEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    body: JSON.stringify({
      name: 'John Doe',
      email: 'john@example.com',
      message: 'I want to book a portrait session for my family.',
    }),
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      Origin: 'https://test.com',
    },
    pathParameters: null,
    queryStringParameters: null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      requestId: 'test-request-id',
      identity: {
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
    } as APIGatewayProxyEvent['requestContext'],
    resource: '/contact',
    path: '/contact',
    isBase64Encoded: false,
    ...overrides,
  };
}

const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'test',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:us-west-2:123:function:test',
  memoryLimitInMB: '256',
  awsRequestId: 'test-id',
  logGroupName: '/aws/lambda/test',
  logStreamName: '2026/01/01',
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
};

beforeEach(() => {
  mockDynamoSend.mockClear();
  mockSendEmail.mockClear();
  // Default: rate limit check returns 0 submissions, PutItem succeeds
  mockDynamoSend.mockImplementation(() => Promise.resolve({ Count: 0 }));
  mockSendEmail.mockImplementation(() => Promise.resolve(undefined));
});

describe('Contact Lambda Handler', () => {
  describe('HTTP method validation', () => {
    it('rejects GET requests with 405', async () => {
      const event = createEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext, () => {});

      expect(result).toBeDefined();
      expect(result!.statusCode).toBe(405);
    });

    it('rejects PUT requests with 405', async () => {
      const event = createEvent({ httpMethod: 'PUT' });
      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(405);
    });
  });

  describe('CSRF protection', () => {
    it('rejects requests without X-Requested-With header', async () => {
      const event = createEvent({
        headers: { Origin: 'https://test.com' },
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(403);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('CSRF');
    });

    it('rejects requests with wrong X-Requested-With value', async () => {
      const event = createEvent({
        headers: {
          'X-Requested-With': 'fetch',
          Origin: 'https://test.com',
        },
      });
      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(403);
    });

    it('accepts requests with lowercase x-requested-with header', async () => {
      const event = createEvent({
        headers: {
          'x-requested-with': 'XMLHttpRequest',
          Origin: 'https://test.com',
        },
      });
      const result = await handler(event, mockContext, () => {});
      // Should not be 403
      expect(result!.statusCode).not.toBe(403);
    });
  });

  describe('JSON parsing', () => {
    it('rejects invalid JSON body', async () => {
      const event = createEvent({ body: 'not json{' });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.code).toBe('ERR_INVALID_JSON');
    });

    it('handles null body gracefully', async () => {
      const event = createEvent({ body: null });
      const result = await handler(event, mockContext, () => {});

      // null body parses as {} which fails validation
      expect(result!.statusCode).toBe(400);
    });
  });

  describe('form validation', () => {
    it('rejects missing name', async () => {
      const event = createEvent({
        body: JSON.stringify({
          email: 'test@example.com',
          message: 'Hello this is a test message.',
        }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.errors).toBeDefined();
      expect(body.errors.some((e: { field: string }) => e.field === 'name')).toBe(true);
    });

    it('rejects name shorter than 2 characters', async () => {
      const event = createEvent({
        body: JSON.stringify({
          name: 'A',
          email: 'test@example.com',
          message: 'Hello this is a test message.',
        }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.errors.some((e: { field: string }) => e.field === 'name')).toBe(true);
    });

    it('rejects name longer than 100 characters', async () => {
      const event = createEvent({
        body: JSON.stringify({
          name: 'A'.repeat(101),
          email: 'test@example.com',
          message: 'Hello this is a test message.',
        }),
      });
      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(400);
    });

    it('rejects invalid email', async () => {
      const event = createEvent({
        body: JSON.stringify({
          name: 'John',
          email: 'not-an-email',
          message: 'Hello this is a test message.',
        }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.errors.some((e: { field: string }) => e.field === 'email')).toBe(true);
    });

    it('rejects email longer than 254 characters', async () => {
      const event = createEvent({
        body: JSON.stringify({
          name: 'John',
          email: 'a'.repeat(250) + '@b.com',
          message: 'Hello this is a test message.',
        }),
      });
      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(400);
    });

    it('rejects invalid phone number', async () => {
      const event = createEvent({
        body: JSON.stringify({
          name: 'John',
          email: 'john@example.com',
          phone: 'abc',
          message: 'Hello this is a test message.',
        }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.errors.some((e: { field: string }) => e.field === 'phone')).toBe(true);
    });

    it('accepts valid phone number', async () => {
      const event = createEvent({
        body: JSON.stringify({
          name: 'John',
          email: 'john@example.com',
          phone: '(303) 555-1234',
          message: 'Hello this is a test message.',
        }),
      });
      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(200);
    });

    it('rejects sessionType longer than 50 characters', async () => {
      const event = createEvent({
        body: JSON.stringify({
          name: 'John',
          email: 'john@example.com',
          sessionType: 'A'.repeat(51),
          message: 'Hello this is a test message.',
        }),
      });
      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(400);
    });

    it('rejects message shorter than 10 characters', async () => {
      const event = createEvent({
        body: JSON.stringify({
          name: 'John',
          email: 'john@example.com',
          message: 'Short',
        }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.errors.some((e: { field: string }) => e.field === 'message')).toBe(true);
    });

    it('rejects message longer than 5000 characters', async () => {
      const event = createEvent({
        body: JSON.stringify({
          name: 'John',
          email: 'john@example.com',
          message: 'A'.repeat(5001),
        }),
      });
      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(400);
    });

    it('returns multiple validation errors at once', async () => {
      const event = createEvent({
        body: JSON.stringify({
          name: '',
          email: 'bad',
          message: 'hi',
        }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('honeypot spam detection', () => {
    it('silently rejects honeypot submissions with 200', async () => {
      const event = createEvent({
        body: JSON.stringify({
          name: 'Spambot',
          email: 'spam@example.com',
          message: 'Buy cheap products now!!!!',
          honeypot: 'filled-in-by-bot',
        }),
      });
      const result = await handler(event, mockContext, () => {});

      // Returns 200 to not tip off bots
      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.message).toContain('Thank you');
    });
  });

  describe('rate limiting', () => {
    it('rejects when rate limit exceeded', async () => {
      // Override: rate limit check returns 3 recent submissions
      let callCount = 0;
      mockDynamoSend.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ Count: 3 });
        return Promise.resolve({});
      });

      const event = createEvent();
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(429);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('Too many submissions');
    });

    it('allows requests under rate limit', async () => {
      // Rate limit returns 1 (under the limit of 3)
      let callCount = 0;
      mockDynamoSend.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ Count: 1 });
        return Promise.resolve({});
      });

      const event = createEvent();
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
    });

    it('allows request if rate limit check fails', async () => {
      // Rate limit check fails, PutItem succeeds
      let callCount = 0;
      mockDynamoSend.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.reject(new Error('DynamoDB timeout'));
        return Promise.resolve({});
      });

      const event = createEvent();
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
    });
  });

  describe('successful submission', () => {
    // Default mockImplementation from outer beforeEach returns { Count: 0 }
    // which passes rate limiting and is harmless for PutItem (result unused)

    it('stores inquiry in DynamoDB', async () => {
      const event = createEvent();
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      expect(mockDynamoSend).toHaveBeenCalledTimes(2);
      const putCall = mockDynamoSend.mock.calls[1][0];
      expect(putCall.TableName).toBe('test-inquiries');
      expect(putCall.Item.name).toBe('John Doe');
      expect(putCall.Item.email).toBe('john@example.com');
      expect(putCall.Item.status).toBe('new');
    });

    it('returns inquiryId in response', async () => {
      const event = createEvent();
      const result = await handler(event, mockContext, () => {});

      const body = JSON.parse(result!.body);
      expect(body.data.inquiryId).toBeDefined();
      expect(body.data.message).toContain('Thank you');
    });

    it('sends both notification and confirmation emails', async () => {
      const event = createEvent();
      await handler(event, mockContext, () => {});

      expect(mockSendEmail).toHaveBeenCalledTimes(2);
    });

    it('succeeds even if emails fail', async () => {
      mockSendEmail.mockImplementation(() => Promise.reject(new Error('SES error')));

      const event = createEvent();
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
    });

    it('trims and lowercases email before storing', async () => {
      const event = createEvent({
        body: JSON.stringify({
          name: 'John Doe',
          email: 'John@Example.COM',
          message: 'I want to book a portrait session.',
        }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const putCall = mockDynamoSend.mock.calls[1][0];
      expect(putCall.Item.email).toBe('john@example.com');
    });

    it('handles optional phone field', async () => {
      const event = createEvent({
        body: JSON.stringify({
          name: 'John',
          email: 'john@example.com',
          phone: '(303) 555-1234',
          message: 'Hello this is a long enough message.',
        }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const putCall = mockDynamoSend.mock.calls[1][0];
      expect(putCall.Item.phone).toBe('(303) 555-1234');
    });
  });

  describe('DynamoDB failure', () => {
    it('returns 500 when DynamoDB PutItem fails', async () => {
      let callCount = 0;
      mockDynamoSend.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ Count: 0 }); // Rate limit passes
        return Promise.reject(new Error('DynamoDB write error')); // PutItem fails
      });

      const event = createEvent();
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(500);
      const body = JSON.parse(result!.body);
      expect(body.code).toBe('ERR_DATABASE');
    });
  });

  describe('CORS headers', () => {
    it('includes CORS headers on success response', async () => {
      const event = createEvent();
      const result = await handler(event, mockContext, () => {});

      expect(result!.headers?.['Access-Control-Allow-Origin']).toBeDefined();
      expect(result!.headers?.['Access-Control-Allow-Methods']).toBeDefined();
    });

    it('includes CORS headers on error response', async () => {
      const event = createEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext, () => {});

      expect(result!.headers?.['Access-Control-Allow-Origin']).toBeDefined();
    });
  });
});
