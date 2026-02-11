// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Set env vars BEFORE importing handler (module-level validation)
vi.stubEnv('GALLERIES_TABLE', 'test-galleries');
vi.stubEnv('ADMIN_TABLE', 'test-admin');
vi.stubEnv('CORS_ALLOWED_ORIGINS', 'https://test.com');
vi.stubEnv('CORS_ORIGIN', 'https://test.com');

// Use vi.hoisted for all mock variables
const mockGetItem = vi.hoisted(() => vi.fn());
const mockPutItem = vi.hoisted(() => vi.fn());
const mockDeleteItem = vi.hoisted(() => vi.fn());
const mockCreateSession = vi.hoisted(() => vi.fn());
const mockValidateSession = vi.hoisted(() => vi.fn());
const mockDeleteSession = vi.hoisted(() => vi.fn());
const mockParseAuthToken = vi.hoisted(() => vi.fn());
const mockCheckLoginAttempts = vi.hoisted(() => vi.fn());
const mockRecordFailedAttempt = vi.hoisted(() => vi.fn());
const mockClearLoginAttempts = vi.hoisted(() => vi.fn());
const mockEncodeToken = vi.hoisted(() => vi.fn());
const mockDecodeToken = vi.hoisted(() => vi.fn());
const mockCompare = vi.hoisted(() => vi.fn());
const mockHash = vi.hoisted(() => vi.fn());

// Mock db module
vi.mock('../../../lambda/shared/db', () => ({
  getItem: mockGetItem,
  putItem: mockPutItem,
  deleteItem: mockDeleteItem,
  queryItems: vi.fn(),
  scanItems: vi.fn(),
  updateItem: vi.fn(),
  buildUpdateExpression: vi.fn(),
}));

// Mock session module
vi.mock('../../../lambda/shared/session', () => ({
  createSession: mockCreateSession,
  validateSession: mockValidateSession,
  deleteSession: mockDeleteSession,
  parseAuthToken: mockParseAuthToken,
  checkLoginAttempts: mockCheckLoginAttempts,
  recordFailedAttempt: mockRecordFailedAttempt,
  clearLoginAttempts: mockClearLoginAttempts,
  encodeToken: mockEncodeToken,
  decodeToken: mockDecodeToken,
}));

// Mock bcryptjs - lives in lambda/client-auth/node_modules
vi.mock('bcryptjs', () => ({
  default: { compare: mockCompare, hash: mockHash },
  compare: mockCompare,
  hash: mockHash,
}));

// Import handler after mocks and env are set
const { handler } = await import('../../../lambda/client-auth/index');

// Helper to create a mock API Gateway event
function createEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    body: null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/api/client/auth',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      requestId: 'test-request-id',
      identity: { sourceIp: '127.0.0.1', userAgent: 'test' },
    } as APIGatewayProxyEvent['requestContext'],
    resource: '/api/client/auth',
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

describe('Client Auth Lambda Handler', () => {
  beforeEach(() => {
    mockGetItem.mockClear();
    mockPutItem.mockClear();
    mockDeleteItem.mockClear();
    mockCreateSession.mockClear();
    mockValidateSession.mockClear();
    mockDeleteSession.mockClear();
    mockParseAuthToken.mockClear();
    mockCheckLoginAttempts.mockClear();
    mockRecordFailedAttempt.mockClear();
    mockClearLoginAttempts.mockClear();
    mockEncodeToken.mockClear();
    mockDecodeToken.mockClear();
    mockCompare.mockClear();
    mockHash.mockClear();

    // Defaults
    mockGetItem.mockImplementation(async () => null);
    mockCreateSession.mockImplementation(async () => ({
      token: 'a'.repeat(64),
      expiresAt: Math.floor(Date.now() / 1000) + 604800,
    }));
    mockValidateSession.mockImplementation(async () => null);
    mockDeleteSession.mockImplementation(async () => {});
    mockParseAuthToken.mockImplementation(() => null);
    mockCheckLoginAttempts.mockImplementation(async () => ({ locked: false }));
    mockRecordFailedAttempt.mockImplementation(async () => {});
    mockClearLoginAttempts.mockImplementation(async () => {});
    mockEncodeToken.mockImplementation((id: string, token: string) =>
      Buffer.from(`${id}:${token}`).toString('base64')
    );
    mockDecodeToken.mockImplementation((encoded: string) => {
      try {
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const colonIndex = decoded.indexOf(':');
        if (colonIndex === -1) return null;
        const id = decoded.substring(0, colonIndex);
        const token = decoded.substring(colonIndex + 1);
        if (!id || !token) return null;
        return { id, token };
      } catch { return null; }
    });
    mockCompare.mockImplementation(async () => false);
    mockHash.mockImplementation(async () => '$2a$10$hashedvalue');
  });

  // ============ OPTIONS ============

  describe('OPTIONS (CORS preflight)', () => {
    it('returns 200 with CORS headers', async () => {
      const event = createEvent({ httpMethod: 'OPTIONS' });
      const result = await handler(event, mockContext, () => {});

      expect(result).toBeDefined();
      expect(result!.statusCode).toBe(200);
      expect(result!.headers?.['Access-Control-Allow-Origin']).toBeDefined();
      expect(result!.headers?.['Access-Control-Allow-Methods']).toBeDefined();
      expect(result!.body).toBe('');
    });
  });

  // ============ METHOD NOT ALLOWED ============

  describe('unsupported methods', () => {
    it('returns 405 for PUT', async () => {
      const event = createEvent({ httpMethod: 'PUT' });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(405);
    });

    it('returns 405 for PATCH', async () => {
      const event = createEvent({ httpMethod: 'PATCH' });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(405);
    });
  });

  // ============ POST LOGIN ============

  describe('POST login', () => {
    it('returns 400 for invalid JSON body', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        body: 'not json{',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('Invalid JSON');
    });

    it('returns 400 when galleryId is missing', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ password: 'secret' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('required');
    });

    it('returns 400 when password is missing', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ galleryId: 'gallery1' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('required');
    });

    it('returns 400 when both fields are missing', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        body: JSON.stringify({}),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
    });

    it('returns 429 when gallery is locked out', async () => {
      mockCheckLoginAttempts.mockImplementation(async () => ({ locked: true, retryAfter: 600 }));

      const event = createEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ galleryId: 'gallery1', password: 'pass' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(429);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('Too many login attempts');
      expect(mockGetItem).not.toHaveBeenCalled();
    });

    it('returns 401 when gallery not found', async () => {
      mockGetItem.mockImplementation(async () => null);

      const event = createEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ galleryId: 'nonexistent', password: 'pass' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(401);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('Invalid gallery ID or password');
      // Should hash dummy for constant-time response
      expect(mockHash).toHaveBeenCalledWith('dummy', 10);
      // Should record failed attempt
      expect(mockRecordFailedAttempt).toHaveBeenCalledWith('test-admin', 'nonexistent');
    });

    it('returns 401 when gallery has no password hash', async () => {
      mockGetItem.mockImplementation(async () => ({
        id: 'gallery1',
        title: 'Test Gallery',
        type: 'client',
        // No passwordHash
      }));

      const event = createEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ galleryId: 'gallery1', password: 'pass' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(401);
    });

    it('returns 401 when password is wrong', async () => {
      mockGetItem.mockImplementation(async () => ({
        id: 'gallery1',
        passwordHash: '$2a$10$existinghash',
        title: 'My Gallery',
        type: 'client',
      }));
      mockCompare.mockImplementation(async () => false);

      const event = createEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ galleryId: 'gallery1', password: 'wrong' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(401);
      expect(mockCompare).toHaveBeenCalledWith('wrong', '$2a$10$existinghash');
      expect(mockRecordFailedAttempt).toHaveBeenCalledWith('test-admin', 'gallery1');
    });

    it('returns 200 with session cookie on successful login', async () => {
      const gallery = {
        id: 'gallery1',
        passwordHash: '$2a$10$existinghash',
        title: 'Wedding Photos',
        type: 'client',
      };
      mockGetItem.mockImplementation(async () => gallery);
      mockCompare.mockImplementation(async () => true);
      mockCreateSession.mockImplementation(async () => ({
        token: 'b'.repeat(64),
        expiresAt: Math.floor(Date.now() / 1000) + 604800,
      }));

      const event = createEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ galleryId: 'gallery1', password: 'correct' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.authenticated).toBe(true);
      expect(body.data.galleryId).toBe('gallery1');
      expect(body.data.galleryTitle).toBe('Wedding Photos');
      // Token should be opaque (base64), not contain plaintext galleryId
      expect(body.data.token).not.toContain('gallery1:');

      // Check Set-Cookie header
      const cookie = result!.headers?.['Set-Cookie'] as string;
      expect(cookie).toContain('pitfal_client_session=');
      expect(cookie).not.toContain('gallery1:' + 'b'.repeat(64));
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');

      // Should clear failed attempts
      expect(mockClearLoginAttempts).toHaveBeenCalledWith('test-admin', 'gallery1');
    });

    it('creates session in admin table with GALLERY_SESSION prefix', async () => {
      const gallery = {
        id: 'gallery1',
        passwordHash: '$2a$10$hash',
        title: 'Test Gallery',
        type: 'client',
      };
      mockGetItem.mockImplementation(async () => gallery);
      mockCompare.mockImplementation(async () => true);

      const event = createEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ galleryId: 'gallery1', password: 'correct' }),
      });
      await handler(event, mockContext, () => {});

      expect(mockCreateSession).toHaveBeenCalledWith(
        'test-admin',
        'GALLERY_SESSION',
        'gallery1',
        { galleryTitle: 'Test Gallery' }
      );
    });

    it('fetches gallery from the galleries table', async () => {
      mockGetItem.mockImplementation(async () => null);

      const event = createEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ galleryId: 'g123', password: 'pass' }),
      });
      await handler(event, mockContext, () => {});

      expect(mockGetItem).toHaveBeenCalledWith({
        TableName: 'test-galleries',
        Key: { id: 'g123' },
      });
    });
  });

  // ============ GET CHECK ============

  describe('GET check', () => {
    it('returns authenticated: false when no token present', async () => {
      mockParseAuthToken.mockImplementation(() => null);

      const event = createEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.authenticated).toBe(false);
    });

    it('returns authenticated: false when token has invalid format', async () => {
      mockParseAuthToken.mockImplementation(() => 'invalid-not-base64-decodable-to-colon');
      // decodeToken will return null for this
      mockDecodeToken.mockImplementation(() => null);

      const event = createEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.authenticated).toBe(false);
    });

    it('returns authenticated: false when session is expired', async () => {
      const encodedToken = Buffer.from('gallery1:expiredtoken').toString('base64');
      mockParseAuthToken.mockImplementation(() => encodedToken);
      mockValidateSession.mockImplementation(async () => null);

      const event = createEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.authenticated).toBe(false);
      // Should clear the expired cookie
      const cookie = result!.headers?.['Set-Cookie'] as string;
      expect(cookie).toContain('Max-Age=0');
    });

    it('returns authenticated: true with valid session', async () => {
      const encodedToken = Buffer.from('gallery1:validtoken').toString('base64');
      mockParseAuthToken.mockImplementation(() => encodedToken);
      mockValidateSession.mockImplementation(async () => ({
        pk: 'GALLERY_SESSION#gallery1',
        sk: 'validtoken',
        token: 'validtoken',
        createdAt: new Date().toISOString(),
        expiresAt: Math.floor(Date.now() / 1000) + 86400,
      }));

      const event = createEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.authenticated).toBe(true);
      expect(body.data.galleryId).toBe('gallery1');
    });

    it('validates session against admin table', async () => {
      const encodedToken = Buffer.from('g1:tok1').toString('base64');
      mockParseAuthToken.mockImplementation(() => encodedToken);
      mockValidateSession.mockImplementation(async () => null);

      const event = createEvent({ httpMethod: 'GET' });
      await handler(event, mockContext, () => {});

      expect(mockValidateSession).toHaveBeenCalledWith(
        'test-admin',
        'GALLERY_SESSION',
        'g1',
        'tok1'
      );
    });
  });

  // ============ DELETE LOGOUT ============

  describe('DELETE logout', () => {
    it('clears session cookie and returns authenticated: false', async () => {
      const encodedToken = Buffer.from('gallery1:token123').toString('base64');
      mockParseAuthToken.mockImplementation(() => encodedToken);
      mockDeleteSession.mockImplementation(async () => {});

      const event = createEvent({ httpMethod: 'DELETE' });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.authenticated).toBe(false);

      // Cookie should be cleared
      const cookie = result!.headers?.['Set-Cookie'] as string;
      expect(cookie).toContain('pitfal_client_session=');
      expect(cookie).toContain('Max-Age=0');
    });

    it('calls deleteSession with correct parameters', async () => {
      const encodedToken = Buffer.from('gallery1:token123').toString('base64');
      mockParseAuthToken.mockImplementation(() => encodedToken);
      mockDeleteSession.mockImplementation(async () => {});

      const event = createEvent({ httpMethod: 'DELETE' });
      await handler(event, mockContext, () => {});

      expect(mockDeleteSession).toHaveBeenCalledWith(
        'test-admin',
        'GALLERY_SESSION',
        'gallery1',
        'token123'
      );
    });

    it('handles logout when no cookie present', async () => {
      mockParseAuthToken.mockImplementation(() => null);

      const event = createEvent({ httpMethod: 'DELETE' });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      expect(mockDeleteSession).not.toHaveBeenCalled();
      // Should still clear cookie
      const cookie = result!.headers?.['Set-Cookie'] as string;
      expect(cookie).toContain('Max-Age=0');
    });
  });

  // ============ CORS HEADERS ============

  describe('CORS headers', () => {
    it('includes CORS headers on success responses', async () => {
      mockParseAuthToken.mockImplementation(() => null);

      const event = createEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext, () => {});

      expect(result!.headers?.['Access-Control-Allow-Origin']).toBeDefined();
      expect(result!.headers?.['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('includes CORS headers on error responses', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        body: JSON.stringify({}),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      expect(result!.headers?.['Access-Control-Allow-Origin']).toBeDefined();
    });
  });
});
