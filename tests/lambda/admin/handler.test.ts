// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Set env vars BEFORE importing handler (module-level validation)
vi.stubEnv('ADMIN_TABLE', 'test-admin');
vi.stubEnv('GALLERIES_TABLE', 'test-galleries');
vi.stubEnv('INQUIRIES_TABLE', 'test-inquiries');
vi.stubEnv('BOOKINGS_TABLE', 'test-bookings');
vi.stubEnv('MEDIA_BUCKET', 'test-media');
vi.stubEnv('CORS_ALLOWED_ORIGINS', 'https://test.com');
vi.stubEnv('CORS_ORIGIN', 'https://test.com');

// Use vi.hoisted for all mock variables
const mockGetItem = vi.hoisted(() => vi.fn());
const mockPutItem = vi.hoisted(() => vi.fn());
const mockUpdateItem = vi.hoisted(() => vi.fn());
const mockDeleteItem = vi.hoisted(() => vi.fn());
const mockQueryItems = vi.hoisted(() => vi.fn());
const mockScanItems = vi.hoisted(() => vi.fn());
const mockBuildUpdateExpression = vi.hoisted(() => vi.fn());
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
const mockGeneratePresignedUploadUrl = vi.hoisted(() => vi.fn());
const mockGeneratePresignedDownloadUrl = vi.hoisted(() => vi.fn());
const mockDeleteS3Objects = vi.hoisted(() => vi.fn());
const mockCopyS3Object = vi.hoisted(() => vi.fn());
const mockListS3Objects = vi.hoisted(() => vi.fn());
const mockSendTemplatedEmail = vi.hoisted(() => vi.fn());
const mockLambdaInvokeSend = vi.hoisted(() => vi.fn());

// Mock db module
vi.mock('../../../lambda/shared/db', () => ({
  getItem: mockGetItem,
  putItem: mockPutItem,
  updateItem: mockUpdateItem,
  deleteItem: mockDeleteItem,
  queryItems: mockQueryItems,
  scanItems: mockScanItems,
  buildUpdateExpression: mockBuildUpdateExpression,
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

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: { compare: mockCompare, hash: mockHash },
  compare: mockCompare,
  hash: mockHash,
}));

// Mock Lambda client used for RAW processing orchestration invoke
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: vi.fn(() => ({ send: mockLambdaInvokeSend })),
  InvokeCommand: vi.fn((params) => params),
}));

// Mock S3 utilities
vi.mock('../../../lambda/shared/s3', () => ({
  generatePresignedUploadUrl: mockGeneratePresignedUploadUrl,
  generatePresignedDownloadUrl: mockGeneratePresignedDownloadUrl,
  deleteS3Objects: mockDeleteS3Objects,
  copyS3Object: mockCopyS3Object,
  listS3Objects: mockListS3Objects,
}));

// Mock email utilities
vi.mock('../../../lambda/shared/email', () => ({
  sendTemplatedEmail: mockSendTemplatedEmail,
}));

// Import handler after mocks and env are set
const { handler } = await import('../../../lambda/admin/index');

// Helper to create mock API Gateway event
function createEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    body: null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/api/admin/auth',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      requestId: 'test-request-id',
      identity: { sourceIp: '127.0.0.1', userAgent: 'test' },
    } as APIGatewayProxyEvent['requestContext'],
    resource: '/api/admin/auth',
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

/** Simulates an authenticated admin request by setting up the session mock */
function setupAuthenticatedAdmin(username = 'admin') {
  const encodedToken = Buffer.from(`${username}:validtoken`).toString('base64');
  mockParseAuthToken.mockImplementation(() => encodedToken);
  mockValidateSession.mockImplementation(async () => ({
    pk: `ADMIN#${username}`,
    sk: 'validtoken',
    token: 'validtoken',
    createdAt: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + 86400,
  }));
}

describe('Admin Lambda Handler', () => {
  beforeEach(() => {
    mockGetItem.mockClear();
    mockPutItem.mockClear();
    mockUpdateItem.mockClear();
    mockDeleteItem.mockClear();
    mockQueryItems.mockClear();
    mockScanItems.mockClear();
    mockBuildUpdateExpression.mockClear();
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
    mockGeneratePresignedUploadUrl.mockClear();
    mockGeneratePresignedDownloadUrl.mockClear();
    mockDeleteS3Objects.mockClear();
    mockCopyS3Object.mockClear();
    mockListS3Objects.mockClear();
    mockSendTemplatedEmail.mockClear();
    mockLambdaInvokeSend.mockClear();

    // Defaults
    mockGetItem.mockImplementation(async () => null);
    mockPutItem.mockImplementation(async () => {});
    mockUpdateItem.mockImplementation(async () => {});
    mockDeleteItem.mockImplementation(async () => {});
    mockQueryItems.mockImplementation(async () => []);
    mockScanItems.mockImplementation(async () => []);
    mockBuildUpdateExpression.mockImplementation((updates: Record<string, unknown>) => ({
      UpdateExpression: 'SET #a = :a',
      ExpressionAttributeNames: { '#a': 'test' },
      ExpressionAttributeValues: { ':a': 'test' },
    }));
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
    mockGeneratePresignedUploadUrl.mockImplementation(async () => 'https://upload-url.example.com');
    mockGeneratePresignedDownloadUrl.mockImplementation(async () => 'https://download-url.example.com');
    mockDeleteS3Objects.mockImplementation(async () => {});
    mockCopyS3Object.mockImplementation(async () => {});
    mockListS3Objects.mockImplementation(async () => []);
    mockLambdaInvokeSend.mockImplementation(async () => ({ StatusCode: 202 }));
  });

  // ============ OPTIONS ============

  describe('OPTIONS (CORS preflight)', () => {
    it('returns 200 with CORS headers and empty body', async () => {
      const event = createEvent({ httpMethod: 'OPTIONS' });
      const result = await handler(event, mockContext, () => {});

      expect(result).toBeDefined();
      expect(result!.statusCode).toBe(200);
      expect(result!.body).toBe('');
      expect(result!.headers?.['Access-Control-Allow-Origin']).toBeDefined();
      expect(result!.headers?.['Access-Control-Allow-Methods']).toBeDefined();
    });
  });

  // ============ AUTH: LOGIN ============

  describe('POST /admin/auth (login)', () => {
    it('returns 400 for invalid JSON body', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/auth',
        body: 'not json{',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('Invalid JSON');
    });

    it('returns 400 when username is missing', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/auth',
        body: JSON.stringify({ password: 'pass' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('required');
    });

    it('returns 400 when password is missing', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/auth',
        body: JSON.stringify({ username: 'admin' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
    });

    it('returns 401 when admin user not found', async () => {
      mockGetItem.mockImplementation(async () => null);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/auth',
        body: JSON.stringify({ username: 'unknown', password: 'pass' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(401);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('Invalid credentials');
      // Should hash dummy for constant-time response
      expect(mockHash).toHaveBeenCalledWith('dummy', 10);
      // Should record failed attempt
      expect(mockRecordFailedAttempt).toHaveBeenCalledWith('test-admin', 'unknown');
    });

    it('looks up admin user with correct PK/SK', async () => {
      mockGetItem.mockImplementation(async () => null);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/auth',
        body: JSON.stringify({ username: 'testadmin', password: 'pass' }),
      });
      await handler(event, mockContext, () => {});

      expect(mockGetItem).toHaveBeenCalledWith({
        TableName: 'test-admin',
        Key: { pk: 'ADMIN#testadmin', sk: 'PROFILE' },
      });
    });

    it('returns 401 when password is wrong', async () => {
      mockGetItem.mockImplementation(async () => ({
        pk: 'ADMIN#admin',
        sk: 'PROFILE',
        username: 'admin',
        passwordHash: '$2a$10$existinghash',
        email: 'admin@test.com',
        createdAt: '2026-01-01T00:00:00Z',
      }));
      mockCompare.mockImplementation(async () => false);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/auth',
        body: JSON.stringify({ username: 'admin', password: 'wrong' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(401);
      expect(mockCompare).toHaveBeenCalledWith('wrong', '$2a$10$existinghash');
      // Should record failed attempt
      expect(mockRecordFailedAttempt).toHaveBeenCalledWith('test-admin', 'admin');
    });

    it('returns 200 with session cookie on successful login', async () => {
      mockGetItem.mockImplementation(async () => ({
        pk: 'ADMIN#admin',
        sk: 'PROFILE',
        username: 'admin',
        passwordHash: '$2a$10$existinghash',
        email: 'admin@test.com',
        createdAt: '2026-01-01T00:00:00Z',
      }));
      mockCompare.mockImplementation(async () => true);
      mockCreateSession.mockImplementation(async () => ({
        token: 'b'.repeat(64),
        expiresAt: Math.floor(Date.now() / 1000) + 604800,
      }));

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/auth',
        body: JSON.stringify({ username: 'admin', password: 'correct' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.authenticated).toBe(true);
      expect(body.data.username).toBe('admin');
      // Token should be opaque (base64), not contain plaintext username
      expect(body.data.token).not.toContain('admin:');

      const cookie = result!.headers?.['Set-Cookie'] as string;
      expect(cookie).toContain('pitfal_admin_session=');
      // Cookie value should be base64 encoded, not plaintext
      expect(cookie).not.toContain('admin:' + 'b'.repeat(64));
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');

      // Should clear failed attempts
      expect(mockClearLoginAttempts).toHaveBeenCalledWith('test-admin', 'admin');
    });

    it('returns 429 when account is locked', async () => {
      mockCheckLoginAttempts.mockImplementation(async () => ({ locked: true, retryAfter: 600 }));

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/auth',
        body: JSON.stringify({ username: 'admin', password: 'pass' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(429);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('Too many login attempts');
      // Should NOT attempt password check
      expect(mockGetItem).not.toHaveBeenCalled();
      expect(mockCompare).not.toHaveBeenCalled();
    });

    it('checks login attempts before authenticating', async () => {
      mockCheckLoginAttempts.mockImplementation(async () => ({ locked: false }));
      mockGetItem.mockImplementation(async () => null);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/auth',
        body: JSON.stringify({ username: 'admin', password: 'pass' }),
      });
      await handler(event, mockContext, () => {});

      expect(mockCheckLoginAttempts).toHaveBeenCalledWith('test-admin', 'admin');
    });

    it('creates session with ADMIN prefix', async () => {
      mockGetItem.mockImplementation(async () => ({
        pk: 'ADMIN#admin',
        sk: 'PROFILE',
        username: 'admin',
        passwordHash: '$2a$10$hash',
        email: 'admin@test.com',
        createdAt: '2026-01-01T00:00:00Z',
      }));
      mockCompare.mockImplementation(async () => true);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/auth',
        body: JSON.stringify({ username: 'admin', password: 'correct' }),
      });
      await handler(event, mockContext, () => {});

      expect(mockCreateSession).toHaveBeenCalledWith('test-admin', 'ADMIN', 'admin');
    });
  });

  // ============ AUTH: CHECK ============

  describe('GET /admin/auth (check)', () => {
    it('returns authenticated: false when not logged in', async () => {
      mockParseAuthToken.mockImplementation(() => null);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/auth',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.authenticated).toBe(false);
    });

    it('returns authenticated: true with username when valid session', async () => {
      const encodedToken = Buffer.from('admin:validtoken').toString('base64');
      mockParseAuthToken.mockImplementation(() => encodedToken);
      mockValidateSession.mockImplementation(async () => ({
        pk: 'ADMIN#admin',
        sk: 'validtoken',
        token: 'validtoken',
        createdAt: new Date().toISOString(),
        expiresAt: Math.floor(Date.now() / 1000) + 86400,
      }));

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/auth',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.authenticated).toBe(true);
      expect(body.data.username).toBe('admin');
    });
  });

  // ============ AUTH: LOGOUT ============

  describe('DELETE /admin/auth (logout)', () => {
    it('clears session and returns authenticated: false', async () => {
      const encodedToken = Buffer.from('admin:token123').toString('base64');
      mockParseAuthToken.mockImplementation(() => encodedToken);
      mockDeleteSession.mockImplementation(async () => {});

      const event = createEvent({
        httpMethod: 'DELETE',
        resource: '/api/admin/auth',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.authenticated).toBe(false);

      expect(mockDeleteSession).toHaveBeenCalledWith('test-admin', 'ADMIN', 'admin', 'token123');

      const cookie = result!.headers?.['Set-Cookie'] as string;
      expect(cookie).toContain('Max-Age=0');
    });

    it('handles logout when no cookie present', async () => {
      mockParseAuthToken.mockImplementation(() => null);

      const event = createEvent({
        httpMethod: 'DELETE',
        resource: '/api/admin/auth',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      expect(mockDeleteSession).not.toHaveBeenCalled();
    });

    it('returns 405 for unsupported methods on auth route', async () => {
      const event = createEvent({
        httpMethod: 'PATCH',
        resource: '/api/admin/auth',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(405);
    });
  });

  // ============ AUTH: CHANGE PASSWORD ============

  describe('PUT /admin/auth - change password', () => {
    it('returns 401 if unauthenticated', async () => {
      mockParseAuthToken.mockImplementation(() => null);

      const event = createEvent({
        httpMethod: 'PUT',
        resource: '/api/admin/auth',
        body: JSON.stringify({ currentPassword: 'old', newPassword: 'newpass123' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(401);
    });

    it('returns 400 if currentPassword is missing', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'PUT',
        resource: '/api/admin/auth',
        body: JSON.stringify({ newPassword: 'newpass123' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('required');
    });

    it('returns 400 if newPassword is missing', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'PUT',
        resource: '/api/admin/auth',
        body: JSON.stringify({ currentPassword: 'old' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('required');
    });

    it('returns 400 if newPassword is fewer than 8 characters', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'PUT',
        resource: '/api/admin/auth',
        body: JSON.stringify({ currentPassword: 'old', newPassword: 'short' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('8 characters');
    });

    it('returns 401 if current password is wrong', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => ({
        pk: 'ADMIN#admin',
        sk: 'PROFILE',
        username: 'admin',
        passwordHash: '$2a$10$existinghash',
        email: 'admin@test.com',
        createdAt: '2026-01-01T00:00:00Z',
      }));
      mockCompare.mockImplementation(async () => false);

      const event = createEvent({
        httpMethod: 'PUT',
        resource: '/api/admin/auth',
        body: JSON.stringify({ currentPassword: 'wrongpass', newPassword: 'newpass123' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(401);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('Current password is incorrect');
    });

    it('returns 200 and updates DynamoDB on success', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => ({
        pk: 'ADMIN#admin',
        sk: 'PROFILE',
        username: 'admin',
        passwordHash: '$2a$10$existinghash',
        email: 'admin@test.com',
        createdAt: '2026-01-01T00:00:00Z',
      }));
      mockCompare.mockImplementation(async () => true);
      mockHash.mockImplementation(async () => '$2a$10$newhash');
      mockBuildUpdateExpression.mockImplementation(() => ({
        UpdateExpression: 'SET #a = :a',
        ExpressionAttributeNames: { '#a': 'passwordHash' },
        ExpressionAttributeValues: { ':a': '$2a$10$newhash' },
      }));

      const event = createEvent({
        httpMethod: 'PUT',
        resource: '/api/admin/auth',
        body: JSON.stringify({ currentPassword: 'correctpass', newPassword: 'newpass123' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.success).toBe(true);
      expect(mockHash).toHaveBeenCalledWith('newpass123', 10);
      expect(mockUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-admin',
          Key: { pk: 'ADMIN#admin', sk: 'PROFILE' },
        })
      );
    });
  });

  // ============ AUTHENTICATION GUARD ============

  describe('authentication guard', () => {
    it('returns 401 for gallery routes without auth', async () => {
      mockParseAuthToken.mockImplementation(() => null);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/galleries',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(401);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('Admin authentication required');
    });

    it('returns 401 for inquiry routes without auth', async () => {
      mockParseAuthToken.mockImplementation(() => null);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/inquiries',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(401);
    });

    it('returns 401 for image routes without auth', async () => {
      mockParseAuthToken.mockImplementation(() => null);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/images',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(401);
    });
  });

  // ============ GALLERIES: LIST ============

  describe('GET /admin/galleries (list)', () => {
    it('returns list of galleries sorted by date descending', async () => {
      setupAuthenticatedAdmin();
      mockScanItems.mockImplementation(async () => [
        {
          id: 'g1', title: 'Older Gallery', category: 'portraits',           slug: 'older', images: [{ key: 'img1.jpg' }], featured: false,
          createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'g2', title: 'Newer Gallery', category: 'brands', passwordHash: '$2a$10$hash',
          slug: 'newer', images: [], featured: true,
          createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-02-01T00:00:00Z',
        },
      ]);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/galleries',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.galleries).toHaveLength(2);
      // Newer should be first (descending sort)
      expect(body.data.galleries[0].id).toBe('g2');
      expect(body.data.galleries[1].id).toBe('g1');
      // Should include imageCount
      expect(body.data.galleries[0].imageCount).toBe(0);
      expect(body.data.galleries[1].imageCount).toBe(1);
    });

    it('scans the galleries table', async () => {
      setupAuthenticatedAdmin();
      mockScanItems.mockImplementation(async () => []);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/galleries',
      });
      await handler(event, mockContext, () => {});

      expect(mockScanItems).toHaveBeenCalledWith({
        TableName: 'test-galleries',
      });
    });
  });

  // ============ GALLERIES: CREATE ============

  describe('POST /admin/galleries (create)', () => {
    it('creates a gallery with required fields', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/galleries',
        body: JSON.stringify({
          title: 'New Gallery',
          category: 'portraits',
          slug: 'new-gallery',
        }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(201);
      const body = JSON.parse(result!.body);
      expect(body.data.gallery.title).toBe('New Gallery');
      expect(body.data.gallery.category).toBe('portraits');
      expect(body.data.gallery.id).toBeDefined();
      expect(body.data.gallery.images).toEqual([]);
      // passwordHash should NOT be in the response
      expect(body.data.gallery.passwordHash).toBeUndefined();

      expect(mockPutItem).toHaveBeenCalledOnce();
    });

    it('returns 400 when required fields are missing', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/galleries',
        body: JSON.stringify({ title: 'Missing others' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('required');
    });

    it('returns 400 for invalid JSON', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/galleries',
        body: 'bad json{',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
    });

    it('hashes password when provided', async () => {
      setupAuthenticatedAdmin();
      mockHash.mockImplementation(async () => '$2a$10$hashed');

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/galleries',
        body: JSON.stringify({
          title: 'Client Gallery',
          category: 'events',
          passwordHash: '$2a$10$hash',
          slug: 'client-gallery',
          password: 'secret123',
        }),
      });
      await handler(event, mockContext, () => {});

      expect(mockHash).toHaveBeenCalledWith('secret123', 10);
      const putCall = mockPutItem.mock.calls[0][0];
      expect(putCall.Item.passwordHash).toBe('$2a$10$hashed');
    });
  });

  // ============ GALLERIES: GET BY ID ============

  describe('GET /admin/galleries/{id}', () => {
    it('returns gallery by id', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => ({
        id: 'g1', title: 'Test Gallery', category: 'portraits',         slug: 'test', images: [], createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z', passwordHash: '$2a$10$hash',
      }));

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/galleries/{id}',
        pathParameters: { id: 'g1' },
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.gallery.id).toBe('g1');
      expect(body.data.gallery.title).toBe('Test Gallery');
      // passwordHash should be undefined in response
      expect(body.data.gallery.passwordHash).toBeUndefined();
    });

    it('returns 404 when gallery not found', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => null);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/galleries/{id}',
        pathParameters: { id: 'nonexistent' },
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(404);
    });
  });

  // ============ GALLERIES: UPDATE ============

  describe('PUT /admin/galleries/{id}', () => {
    it('updates gallery with allowed fields', async () => {
      setupAuthenticatedAdmin();
      mockBuildUpdateExpression.mockImplementation(() => ({
        UpdateExpression: 'SET #a = :a, #b = :b',
        ExpressionAttributeNames: { '#a': 'title', '#b': 'updatedAt' },
        ExpressionAttributeValues: { ':a': 'Updated Title', ':b': '2026-02-10T00:00:00Z' },
      }));

      const event = createEvent({
        httpMethod: 'PUT',
        resource: '/api/admin/galleries/{id}',
        pathParameters: { id: 'g1' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.updated).toBe(true);
      expect(mockUpdateItem).toHaveBeenCalledOnce();
    });

    it('returns 400 for invalid JSON', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'PUT',
        resource: '/api/admin/galleries/{id}',
        pathParameters: { id: 'g1' },
        body: 'bad{',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
    });

    it('hashes new password during update', async () => {
      setupAuthenticatedAdmin();
      mockHash.mockImplementation(async () => '$2a$10$newhash');
      mockBuildUpdateExpression.mockImplementation(() => ({
        UpdateExpression: 'SET #a = :a',
        ExpressionAttributeNames: { '#a': 'passwordHash' },
        ExpressionAttributeValues: { ':a': '$2a$10$newhash' },
      }));

      const event = createEvent({
        httpMethod: 'PUT',
        resource: '/api/admin/galleries/{id}',
        pathParameters: { id: 'g1' },
        body: JSON.stringify({ password: 'newpass' }),
      });
      await handler(event, mockContext, () => {});

      expect(mockHash).toHaveBeenCalledWith('newpass', 10);
    });
  });

  // ============ GALLERIES: DELETE ============

  describe('DELETE /admin/galleries/{id}', () => {
    it('deletes gallery and moves images to staging/ready/', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => ({
        id: 'g1', title: 'Test', category: 'portraits',         slug: 'test', images: [{ key: 'gallery/g1/photo1.jpg' }, { key: 'gallery/g1/photo2.jpg' }],
        createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      }));

      const event = createEvent({
        httpMethod: 'DELETE',
        resource: '/api/admin/galleries/{id}',
        pathParameters: { id: 'g1' },
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.deleted).toBe(true);

      // Should copy images to staging/ready/
      expect(mockCopyS3Object).toHaveBeenCalledWith('test-media', 'gallery/g1/photo1.jpg', 'staging/ready/photo1.jpg');
      expect(mockCopyS3Object).toHaveBeenCalledWith('test-media', 'gallery/g1/photo2.jpg', 'staging/ready/photo2.jpg');
      // Should delete originals from gallery/
      expect(mockDeleteS3Objects).toHaveBeenCalledWith('test-media', ['gallery/g1/photo1.jpg']);
      expect(mockDeleteS3Objects).toHaveBeenCalledWith('test-media', ['gallery/g1/photo2.jpg']);
      // Should delete gallery from DynamoDB
      expect(mockDeleteItem).toHaveBeenCalledWith({
        TableName: 'test-galleries',
        Key: { id: 'g1' },
      });
    });

    it('returns 404 when gallery not found', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => null);

      const event = createEvent({
        httpMethod: 'DELETE',
        resource: '/api/admin/galleries/{id}',
        pathParameters: { id: 'nonexistent' },
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(404);
    });

    it('skips S3 operations when gallery has no images', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => ({
        id: 'g1', title: 'Empty', category: 'portraits',         slug: 'empty', images: [],
        createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      }));

      const event = createEvent({
        httpMethod: 'DELETE',
        resource: '/api/admin/galleries/{id}',
        pathParameters: { id: 'g1' },
      });
      await handler(event, mockContext, () => {});

      expect(mockCopyS3Object).not.toHaveBeenCalled();
      expect(mockDeleteS3Objects).not.toHaveBeenCalled();
    });
  });

  // ============ IMAGES: UPLOAD URL ============

  describe('POST /admin/images (get upload URL)', () => {
    it('JPEG upload routes to staging/ready/', async () => {
      setupAuthenticatedAdmin();
      mockGeneratePresignedUploadUrl.mockImplementation(async () => 'https://upload.s3.example.com');

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/images',
        body: JSON.stringify({ filename: 'photo.jpg', contentType: 'image/jpeg' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.uploadUrl).toBe('https://upload.s3.example.com');
      expect(body.data.key).toMatch(/^staging\/ready\//);
      expect(body.data.key).toContain('photo.jpg');
    });

    it('PNG upload routes to staging/ready/', async () => {
      setupAuthenticatedAdmin();
      mockGeneratePresignedUploadUrl.mockImplementation(async () => 'https://upload.s3.example.com');

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/images',
        body: JSON.stringify({ filename: 'image.png', contentType: 'image/png' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.key).toMatch(/^staging\/ready\//);
    });

    // TODO: Re-enable when RAW/JPEG processing pipeline is restored
    it.skip('RAW upload routes to staging/RAW/', async () => {
      setupAuthenticatedAdmin();
      mockGeneratePresignedUploadUrl.mockImplementation(async () => 'https://upload.s3.example.com');

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/images',
        body: JSON.stringify({ filename: 'photo.cr2' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.key).toMatch(/^staging\/RAW\//);
      expect(body.data.key).toContain('photo.cr2');
    });

    // TODO: Re-enable when RAW/JPEG processing pipeline is restored
    it.skip('CR3 upload routes to staging/RAW/', async () => {
      setupAuthenticatedAdmin();
      mockGeneratePresignedUploadUrl.mockImplementation(async () => 'https://upload.s3.example.com');

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/images',
        body: JSON.stringify({ filename: 'photo.cr3' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.key).toMatch(/^staging\/RAW\//);
    });

    it('returns 400 for unsupported file extension (RAW now rejected)', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/images',
        body: JSON.stringify({ filename: 'photo.cr2' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('Unsupported file type');
    });

    it('returns 400 for unsupported file extension', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/images',
        body: JSON.stringify({ filename: 'photo.bmp' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('Unsupported file type');
    });

    it('returns 400 when filename is missing', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/images',
        body: JSON.stringify({}),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
    });

    it('generates upload URL with correct bucket and content type', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/images',
        body: JSON.stringify({ filename: 'test.jpg', contentType: 'image/jpeg' }),
      });
      await handler(event, mockContext, () => {});

      expect(mockGeneratePresignedUploadUrl).toHaveBeenCalledWith(
        'test-media',
        expect.stringContaining('staging/ready/'),
        'image/jpeg',
        3600
      );
    });
  });

  // ============ INQUIRIES ============

  describe('GET /admin/inquiries', () => {
    it('returns all inquiries sorted by date when no status filter', async () => {
      setupAuthenticatedAdmin();
      mockScanItems.mockImplementation(async () => [
        { id: 'i1', name: 'John', createdAt: '2026-01-01T00:00:00Z' },
        { id: 'i2', name: 'Jane', createdAt: '2026-02-01T00:00:00Z' },
      ]);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/inquiries',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.inquiries).toHaveLength(2);
      // Should be sorted descending (newer first)
      expect(body.data.inquiries[0].id).toBe('i2');

      expect(mockScanItems).toHaveBeenCalledWith({ TableName: 'test-inquiries' });
    });

    it('filters inquiries by status using GSI', async () => {
      setupAuthenticatedAdmin();
      mockQueryItems.mockImplementation(async () => [
        { id: 'i1', name: 'John', status: 'new', createdAt: '2026-01-01T00:00:00Z' },
      ]);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/inquiries',
        queryStringParameters: { status: 'new' },
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.inquiries).toHaveLength(1);

      expect(mockQueryItems).toHaveBeenCalledWith({
        TableName: 'test-inquiries',
        IndexName: 'status-index',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': 'new' },
        ScanIndexForward: false,
      });
    });

    it('returns 405 for non-GET methods on inquiries collection route', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/inquiries',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(405);
    });
  });

  // ============ INQUIRY BY ID ============

  describe('PUT /admin/inquiries/{id}', () => {
    it('updates inquiry status to read', async () => {
      setupAuthenticatedAdmin();
      mockBuildUpdateExpression.mockImplementation((updates: Record<string, unknown>) => ({
        UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: { ':status': updates.status, ':updatedAt': updates.updatedAt },
      }));
      mockUpdateItem.mockImplementation(async () => {});

      const event = createEvent({
        httpMethod: 'PUT',
        resource: '/api/admin/inquiries/{id}',
        pathParameters: { id: 'inquiry-123' },
        body: JSON.stringify({ status: 'read' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.updated).toBe(true);
      expect(mockUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({ TableName: 'test-inquiries', Key: { id: 'inquiry-123' } })
      );
    });

    it('updates inquiry status to replied', async () => {
      setupAuthenticatedAdmin();
      mockBuildUpdateExpression.mockImplementation((updates: Record<string, unknown>) => ({
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': updates.status },
      }));
      mockUpdateItem.mockImplementation(async () => {});

      const event = createEvent({
        httpMethod: 'PUT',
        resource: '/api/admin/inquiries/{id}',
        pathParameters: { id: 'inquiry-123' },
        body: JSON.stringify({ status: 'replied' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
    });

    it('rejects invalid status value', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'PUT',
        resource: '/api/admin/inquiries/{id}',
        pathParameters: { id: 'inquiry-123' },
        body: JSON.stringify({ status: 'invalid' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      expect(mockUpdateItem).not.toHaveBeenCalled();
    });

    it('rejects missing status field', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'PUT',
        resource: '/api/admin/inquiries/{id}',
        pathParameters: { id: 'inquiry-123' },
        body: JSON.stringify({}),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
    });
  });

  describe('DELETE /admin/inquiries/{id}', () => {
    it('deletes an inquiry', async () => {
      setupAuthenticatedAdmin();
      mockDeleteItem.mockImplementation(async () => {});

      const event = createEvent({
        httpMethod: 'DELETE',
        resource: '/api/admin/inquiries/{id}',
        pathParameters: { id: 'inquiry-123' },
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.deleted).toBe(true);
      expect(mockDeleteItem).toHaveBeenCalledWith({
        TableName: 'test-inquiries',
        Key: { id: 'inquiry-123' },
      });
    });

    it('returns 405 for unsupported methods on inquiry by id', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/inquiries/{id}',
        pathParameters: { id: 'inquiry-123' },
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(405);
    });
  });

  // ============ GALLERY NOTIFY ============

  describe('POST /admin/galleries/{id}/notify', () => {
    it('sends gallery-ready email to client', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => ({
        id: 'gallery-1',
        title: 'Wedding Photos',
        category: 'events',
        passwordHash: 'hashed',
        images: [],
        createdAt: '2026-01-01T00:00:00Z',
      }));
      mockSendTemplatedEmail.mockImplementation(async () => {});

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/galleries/{id}/notify',
        pathParameters: { id: 'gallery-1' },
        body: JSON.stringify({
          clientEmail: 'client@example.com',
          clientName: 'Jane Doe',
          expirationDays: 14,
        }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.notified).toBe(true);
      expect(mockSendTemplatedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'client@example.com',
          template: 'gallery-ready',
          data: expect.objectContaining({
            name: 'Jane Doe',
            sessionType: 'events',
            expirationDays: '14',
          }),
        })
      );
    });

    it('returns 404 if gallery not found', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => null);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/galleries/{id}/notify',
        pathParameters: { id: 'nonexistent' },
        body: JSON.stringify({
          clientEmail: 'client@example.com',
          clientName: 'Jane Doe',
        }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(404);
      expect(mockSendTemplatedEmail).not.toHaveBeenCalled();
    });

    it('returns 400 if clientEmail missing', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/galleries/{id}/notify',
        pathParameters: { id: 'gallery-1' },
        body: JSON.stringify({ clientName: 'Jane Doe' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
    });

    it('returns 400 if clientName missing', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/galleries/{id}/notify',
        pathParameters: { id: 'gallery-1' },
        body: JSON.stringify({ clientEmail: 'client@example.com' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
    });

    it('returns 405 for non-POST methods', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/galleries/{id}/notify',
        pathParameters: { id: 'gallery-1' },
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(405);
    });
  });

  // ============ IMAGES: READY QUEUE ============

  describe('GET /admin/images/ready', () => {
    it('returns list of images in staging/ready/', async () => {
      setupAuthenticatedAdmin();
      mockListS3Objects.mockImplementation(async () => [
        { key: 'staging/ready/abc-photo.jpg', size: 12345, lastModified: new Date('2026-01-01') },
        { key: 'staging/ready/def-portrait.png', size: 67890, lastModified: new Date('2026-01-02') },
      ]);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/images/ready',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.images).toHaveLength(2);
      expect(body.data.images[0].key).toBe('staging/ready/abc-photo.jpg');
      expect(body.data.images[0].filename).toBe('abc-photo.jpg');
      expect(body.data.images[0].size).toBe(12345);
      expect(body.data.images[1].key).toBe('staging/ready/def-portrait.png');
    });

    it('filters out the folder prefix object', async () => {
      setupAuthenticatedAdmin();
      mockListS3Objects.mockImplementation(async () => [
        { key: 'staging/ready/', size: 0, lastModified: new Date('2026-01-01') },
        { key: 'staging/ready/photo.jpg', size: 100, lastModified: new Date('2026-01-01') },
      ]);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/images/ready',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.images).toHaveLength(1);
      expect(body.data.images[0].key).toBe('staging/ready/photo.jpg');
    });

    it('returns 405 for non-GET methods', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/images/ready',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(405);
    });
  });

  // ============ IMAGES: ASSIGN ============

  describe('POST /admin/images/assign', () => {
    it('moves images from staging/ready/ to gallery/{galleryId}/', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => ({
        id: 'gallery-123', title: 'Test Gallery', category: 'portraits',         slug: 'test', images: [], featured: false,
        createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      }));

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/images/assign',
        body: JSON.stringify({
          keys: ['staging/ready/abc-photo.jpg'],
          galleryId: 'gallery-123',
        }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.assigned).toBe(1);
      expect(body.data.failed).toBe(0);
      expect(mockCopyS3Object).toHaveBeenCalledWith(
        'test-media',
        'staging/ready/abc-photo.jpg',
        'gallery/gallery-123/abc-photo.jpg'
      );
      expect(mockDeleteS3Objects).toHaveBeenCalledWith('test-media', ['staging/ready/abc-photo.jpg']);
      // Should update gallery images in DynamoDB
      expect(mockUpdateItem).toHaveBeenCalled();
    });

    it('returns 400 when galleryId is missing', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/images/assign',
        body: JSON.stringify({ keys: ['staging/ready/photo.jpg'] }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
    });

    it('returns 400 when keys is empty', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/images/assign',
        body: JSON.stringify({ keys: [], galleryId: 'gallery-123' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
    });

    it('returns 400 when keys is missing', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/images/assign',
        body: JSON.stringify({ galleryId: 'gallery-123' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
    });

    it('returns 404 when gallery not found', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => null);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/images/assign',
        body: JSON.stringify({
          keys: ['staging/ready/photo.jpg'],
          galleryId: 'nonexistent',
        }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(404);
    });

    it('returns 405 for non-POST methods', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/images/assign',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(405);
    });
  });

  // ============ IMAGES: DELETE (move to staging/ready/) ============

  describe('DELETE /admin/images (move to staging/ready/)', () => {
    it('moves image from gallery/ to staging/ready/ and removes from DynamoDB', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => ({
        id: 'g1', title: 'Test', category: 'portraits',         slug: 'test', images: [{ key: 'gallery/g1/photo.jpg' }, { key: 'gallery/g1/other.jpg' }],
        createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      }));

      const event = createEvent({
        httpMethod: 'DELETE',
        resource: '/api/admin/images',
        body: JSON.stringify({ imageKey: 'gallery/g1/photo.jpg', galleryId: 'g1' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.deleted).toBe(true);

      // Should copy to staging/ready/
      expect(mockCopyS3Object).toHaveBeenCalledWith('test-media', 'gallery/g1/photo.jpg', 'staging/ready/photo.jpg');
      // Should delete original
      expect(mockDeleteS3Objects).toHaveBeenCalledWith('test-media', ['gallery/g1/photo.jpg']);
      // Should update gallery images in DynamoDB (remove the deleted image)
      expect(mockUpdateItem).toHaveBeenCalled();
    });

    it('returns 400 when imageKey is missing', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'DELETE',
        resource: '/api/admin/images',
        body: JSON.stringify({ galleryId: 'g1' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
    });

    it('returns 400 when galleryId is missing', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'DELETE',
        resource: '/api/admin/images',
        body: JSON.stringify({ imageKey: 'gallery/g1/photo.jpg' }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
    });
  });

  // ============ PUBLIC GALLERY ROUTES ============

  describe('Public gallery routes (no auth)', () => {
    it('GET /api/galleries/featured - returns featured galleries without auth', async () => {
      mockScanItems.mockImplementation(async () => [
        {
          id: 'g1', title: 'Featured Portfolio', category: 'portraits',           slug: 'featured-test', images: [{ key: 'gallery/g1/photo.jpg' }], featured: true,
          createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'g2', title: 'Not Featured', category: 'brands',           slug: 'not-featured', images: [], featured: false,
          createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
        },
      ]);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/galleries/featured',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.galleries).toHaveLength(1);
      expect(body.data.galleries[0].id).toBe('g1');
      expect(body.data.galleries[0].href).toBe('/portfolio/portraits/featured-test');
    });

    it('GET /api/galleries/featured - uses heroImage as coverImage when available', async () => {
      mockScanItems.mockImplementation(async () => [
        {
          id: 'g1', title: 'Hero Gallery', category: 'brands',           slug: 'hero-test', images: [{ key: 'gallery/g1/photo.jpg' }], featured: true,
          heroImage: 'gallery/g1/hero.jpg',
          createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
        },
      ]);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/galleries/featured',
      });
      const result = await handler(event, mockContext, () => {});

      const body = JSON.parse(result!.body);
      expect(body.data.galleries[0].coverImage).toBe('gallery/g1/hero.jpg');
    });

    it('GET /api/galleries/featured - all gallery hrefs use /portfolio/{category}/{slug}', async () => {
      mockScanItems.mockImplementation(async () => [
        {
          id: 'g1', title: 'Client Gallery', category: 'events', passwordHash: '$2a$10$hash',
          slug: 'client-test', images: [], featured: true,
          createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
        },
      ]);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/galleries/featured',
      });
      const result = await handler(event, mockContext, () => {});

      const body = JSON.parse(result!.body);
      expect(body.data.galleries[0].href).toBe('/portfolio/events/client-test');
    });

    it('GET /api/galleries/{category} - returns portfolio galleries by category (excludes password-protected)', async () => {
      mockScanItems.mockImplementation(async () => [
        {
          id: 'g1', title: 'Brand Gallery', category: 'brands', slug: 'brand-test', images: [{ key: 'gallery/g1/photo.jpg' }], featured: false,
          createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'g2', title: 'Client Brand Gallery', category: 'brands', slug: 'client-brand', images: [], featured: false,
          passwordHash: '$2a$10$hash',
          createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'g3', title: 'Portrait Gallery', category: 'portraits', slug: 'portrait-test', images: [], featured: false,
          createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
        },
      ]);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/galleries/{category}',
        pathParameters: { category: 'brands' },
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.galleries).toHaveLength(1);
      expect(body.data.galleries[0].category).toBe('brands');
    });

    it('GET /api/galleries/{category}/{slug} - returns single portfolio gallery', async () => {
      mockScanItems.mockImplementation(async () => [
        {
          id: 'g1', title: 'Brand Gallery', category: 'brands',           slug: 'brand-test', images: [{ key: 'gallery/g1/photo.jpg' }], featured: false,
          passwordHash: '$2a$10$hash',
          createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
        },
      ]);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/galleries/{category}/{slug}',
        pathParameters: { category: 'brands', slug: 'brand-test' },
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.gallery.id).toBe('g1');
      expect(body.data.gallery.passwordHash).toBeUndefined();
    });

    it('GET /api/galleries/{category}/{slug} - returns 404 for non-existent gallery', async () => {
      mockScanItems.mockImplementation(async () => []);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/galleries/{category}/{slug}',
        pathParameters: { category: 'brands', slug: 'nonexistent' },
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(404);
    });

    it('public gallery routes do not require auth', async () => {
      // Do NOT call setupAuthenticatedAdmin
      mockParseAuthToken.mockImplementation(() => null);
      mockScanItems.mockImplementation(async () => []);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/galleries/featured',
      });
      const result = await handler(event, mockContext, () => {});

      // Should succeed (200), not 401
      expect(result!.statusCode).toBe(200);
    });
  });

  // ============ UNKNOWN ROUTES ============

  describe('unknown routes', () => {
    it('returns 404 for unknown resource', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/unknown',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(404);
    });
  });

  // ============ CORS ============

  describe('CORS headers', () => {
    it('includes CORS headers on success responses', async () => {
      setupAuthenticatedAdmin();
      mockScanItems.mockImplementation(async () => []);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/galleries',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.headers?.['Access-Control-Allow-Origin']).toBeDefined();
      expect(result!.headers?.['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('includes CORS headers on 401 responses', async () => {
      mockParseAuthToken.mockImplementation(() => null);

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/galleries',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(401);
      expect(result!.headers?.['Access-Control-Allow-Origin']).toBeDefined();
    });
  });

  // ============ GALLERY SECTIONS ============

  describe('gallery sections support', () => {
    describe('POST /admin/galleries (create with sections)', () => {
      it('creates gallery with valid sections', async () => {
        setupAuthenticatedAdmin();

        const event = createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/galleries',
          body: JSON.stringify({
            title: 'Sectioned Gallery',
            category: 'brands',
            slug: 'sectioned',
            sections: [
              { id: 'sec-1', title: 'Getting Ready', images: ['img1.jpg', 'img2.jpg'] },
              { id: 'sec-2', title: 'Ceremony', images: [] },
            ],
          }),
        });
        const result = await handler(event, mockContext, () => {});

        expect(result!.statusCode).toBe(201);
        const body = JSON.parse(result!.body);
        expect(body.data.gallery.sections).toHaveLength(2);
        expect(body.data.gallery.sections[0].title).toBe('Getting Ready');
        expect(body.data.gallery.sections[1].title).toBe('Ceremony');
      });

      it('creates gallery with heroImage', async () => {
        setupAuthenticatedAdmin();

        const event = createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/galleries',
          body: JSON.stringify({
            title: 'Hero Gallery',
            category: 'portraits',
            slug: 'hero-gallery',
            heroImage: 'finished/hero.jpg',
          }),
        });
        const result = await handler(event, mockContext, () => {});

        expect(result!.statusCode).toBe(201);
        const body = JSON.parse(result!.body);
        expect(body.data.gallery.heroImage).toBe('finished/hero.jpg');
      });

      it('returns 400 for sections with missing id', async () => {
        setupAuthenticatedAdmin();

        const event = createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/galleries',
          body: JSON.stringify({
            title: 'Bad Sections',
            category: 'brands',
            slug: 'bad-sections',
            sections: [
              { title: 'No ID', images: [] },
            ],
          }),
        });
        const result = await handler(event, mockContext, () => {});

        expect(result!.statusCode).toBe(400);
        const body = JSON.parse(result!.body);
        expect(body.error).toContain('Invalid sections');
      });

      it('returns 400 for sections with missing title', async () => {
        setupAuthenticatedAdmin();

        const event = createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/galleries',
          body: JSON.stringify({
            title: 'Bad Sections',
            category: 'brands',
            slug: 'bad-sections',
            sections: [
              { id: 'sec-1', images: [] },
            ],
          }),
        });
        const result = await handler(event, mockContext, () => {});

        expect(result!.statusCode).toBe(400);
      });

      it('returns 400 for sections with non-array images', async () => {
        setupAuthenticatedAdmin();

        const event = createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/galleries',
          body: JSON.stringify({
            title: 'Bad Sections',
            category: 'brands',
            slug: 'bad-sections',
            sections: [
              { id: 'sec-1', title: 'Bad', images: 'not-an-array' },
            ],
          }),
        });
        const result = await handler(event, mockContext, () => {});

        expect(result!.statusCode).toBe(400);
      });

      it('returns 400 for sections with non-string image keys', async () => {
        setupAuthenticatedAdmin();

        const event = createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/galleries',
          body: JSON.stringify({
            title: 'Bad Sections',
            category: 'brands',
            slug: 'bad-sections',
            sections: [
              { id: 'sec-1', title: 'Bad', images: [123, 456] },
            ],
          }),
        });
        const result = await handler(event, mockContext, () => {});

        expect(result!.statusCode).toBe(400);
      });

      it('returns 400 for non-array sections', async () => {
        setupAuthenticatedAdmin();

        const event = createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/galleries',
          body: JSON.stringify({
            title: 'Bad Sections',
            category: 'brands',
            slug: 'bad-sections',
            sections: 'not-an-array',
          }),
        });
        const result = await handler(event, mockContext, () => {});

        expect(result!.statusCode).toBe(400);
      });

      it('creates gallery without sections (backward compatibility)', async () => {
        setupAuthenticatedAdmin();

        const event = createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/galleries',
          body: JSON.stringify({
            title: 'No Sections Gallery',
            category: 'events',
            slug: 'no-sections',
          }),
        });
        const result = await handler(event, mockContext, () => {});

        expect(result!.statusCode).toBe(201);
        const body = JSON.parse(result!.body);
        expect(body.data.gallery.sections).toBeUndefined();
      });
    });

    describe('PUT /admin/galleries/{id} (update sections)', () => {
      it('updates gallery sections', async () => {
        setupAuthenticatedAdmin();
        mockBuildUpdateExpression.mockImplementation(() => ({
          UpdateExpression: 'SET #a = :a',
          ExpressionAttributeNames: { '#a': 'sections' },
          ExpressionAttributeValues: { ':a': [] },
        }));

        const event = createEvent({
          httpMethod: 'PUT',
          resource: '/api/admin/galleries/{id}',
          pathParameters: { id: 'g1' },
          body: JSON.stringify({
            sections: [
              { id: 'sec-1', title: 'Updated Section', images: ['img1.jpg'] },
            ],
          }),
        });
        const result = await handler(event, mockContext, () => {});

        expect(result!.statusCode).toBe(200);
        expect(mockUpdateItem).toHaveBeenCalledOnce();
      });

      it('updates gallery heroImage', async () => {
        setupAuthenticatedAdmin();
        mockBuildUpdateExpression.mockImplementation(() => ({
          UpdateExpression: 'SET #a = :a',
          ExpressionAttributeNames: { '#a': 'heroImage' },
          ExpressionAttributeValues: { ':a': 'finished/new-hero.jpg' },
        }));

        const event = createEvent({
          httpMethod: 'PUT',
          resource: '/api/admin/galleries/{id}',
          pathParameters: { id: 'g1' },
          body: JSON.stringify({ heroImage: 'finished/new-hero.jpg' }),
        });
        const result = await handler(event, mockContext, () => {});

        expect(result!.statusCode).toBe(200);
        expect(mockUpdateItem).toHaveBeenCalledOnce();
      });

      it('rejects invalid sections on update', async () => {
        setupAuthenticatedAdmin();

        const event = createEvent({
          httpMethod: 'PUT',
          resource: '/api/admin/galleries/{id}',
          pathParameters: { id: 'g1' },
          body: JSON.stringify({
            sections: [{ id: '', title: '', images: [] }],
          }),
        });
        const result = await handler(event, mockContext, () => {});

        expect(result!.statusCode).toBe(400);
        const body = JSON.parse(result!.body);
        expect(body.error).toContain('Invalid sections');
      });

      it('allows setting sections to null (remove sections)', async () => {
        setupAuthenticatedAdmin();
        mockBuildUpdateExpression.mockImplementation(() => ({
          UpdateExpression: 'SET #a = :a',
          ExpressionAttributeNames: { '#a': 'updatedAt' },
          ExpressionAttributeValues: { ':a': '2026-02-10T00:00:00Z' },
        }));

        const event = createEvent({
          httpMethod: 'PUT',
          resource: '/api/admin/galleries/{id}',
          pathParameters: { id: 'g1' },
          body: JSON.stringify({ sections: null }),
        });
        const result = await handler(event, mockContext, () => {});

        // null sections should pass validation (the code checks: if sections !== undefined && sections !== null)
        expect(result!.statusCode).toBe(200);
      });
    });

    describe('GET /admin/galleries (list with section count)', () => {
      it('includes sectionCount and heroImage in gallery list', async () => {
        setupAuthenticatedAdmin();
        mockScanItems.mockImplementation(async () => [
          {
            id: 'g1', title: 'Gallery With Sections', category: 'brands',             slug: 'sectioned', images: [{ key: 'img1.jpg' }],
            sections: [
              { id: 'sec-1', title: 'Section 1', images: ['img1.jpg'] },
              { id: 'sec-2', title: 'Section 2', images: [] },
            ],
            heroImage: 'finished/hero.jpg',
            featured: false, createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-02-01T00:00:00Z',
          },
        ]);

        const event = createEvent({
          httpMethod: 'GET',
          resource: '/api/admin/galleries',
        });
        const result = await handler(event, mockContext, () => {});

        expect(result!.statusCode).toBe(200);
        const body = JSON.parse(result!.body);
        expect(body.data.galleries[0].sectionCount).toBe(2);
        expect(body.data.galleries[0].heroImage).toBe('finished/hero.jpg');
      });

      it('returns sectionCount 0 and heroImage null for galleries without sections', async () => {
        setupAuthenticatedAdmin();
        mockScanItems.mockImplementation(async () => [
          {
            id: 'g1', title: 'Plain Gallery', category: 'portraits', passwordHash: '$2a$10$hash',
            slug: 'plain', images: [], featured: false,
            createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
          },
        ]);

        const event = createEvent({
          httpMethod: 'GET',
          resource: '/api/admin/galleries',
        });
        const result = await handler(event, mockContext, () => {});

        const body = JSON.parse(result!.body);
        expect(body.data.galleries[0].sectionCount).toBe(0);
        expect(body.data.galleries[0].heroImage).toBeNull();
      });
    });
  });

  // ============ BULK DOWNLOAD ============

  describe('POST /admin/galleries/{id}/bulk-download', () => {
    it('returns presigned download URLs for all gallery images', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => ({
        id: 'g1', title: 'Test', category: 'portraits', passwordHash: '$2a$10$hash',
        slug: 'test', images: [{ key: 'img1.jpg' }, { key: 'img2.jpg' }],
        createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      }));

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/galleries/{id}/bulk-download',
        pathParameters: { id: 'g1' },
        body: JSON.stringify({}),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.downloads).toHaveLength(2);
      expect(body.data.downloads[0].key).toBe('img1.jpg');
      expect(body.data.downloads[0].downloadUrl).toBe('https://download-url.example.com');
      expect(body.data.downloads[1].key).toBe('img2.jpg');
    });

    it('returns presigned URLs only for requested image keys', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => ({
        id: 'g1', title: 'Test', category: 'portraits', passwordHash: '$2a$10$hash',
        slug: 'test', images: [{ key: 'img1.jpg' }, { key: 'img2.jpg' }, { key: 'img3.jpg' }],
        createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      }));

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/galleries/{id}/bulk-download',
        pathParameters: { id: 'g1' },
        body: JSON.stringify({ imageKeys: ['img1.jpg', 'img3.jpg'] }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.downloads).toHaveLength(2);
      expect(body.data.downloads[0].key).toBe('img1.jpg');
      expect(body.data.downloads[1].key).toBe('img3.jpg');
    });

    it('returns 400 when requested keys dont belong to gallery', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => ({
        id: 'g1', title: 'Test', category: 'portraits', passwordHash: '$2a$10$hash',
        slug: 'test', images: [{ key: 'img1.jpg' }],
        createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      }));

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/galleries/{id}/bulk-download',
        pathParameters: { id: 'g1' },
        body: JSON.stringify({ imageKeys: ['img1.jpg', 'not-in-gallery.jpg'] }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('do not belong to this gallery');
    });

    it('returns 404 when gallery not found', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => null);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/galleries/{id}/bulk-download',
        pathParameters: { id: 'nonexistent' },
        body: JSON.stringify({}),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(404);
    });

    it('returns 400 when gallery has no images', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => ({
        id: 'g1', title: 'Empty', category: 'portraits', passwordHash: '$2a$10$hash',
        slug: 'empty', images: [],
        createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      }));

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/galleries/{id}/bulk-download',
        pathParameters: { id: 'g1' },
        body: JSON.stringify({}),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('No images to download');
    });

    it('returns 400 when requesting more than 100 images', async () => {
      setupAuthenticatedAdmin();
      const manyImages = Array.from({ length: 101 }, (_, i) => ({ key: `img${i}.jpg` }));
      mockGetItem.mockImplementation(async () => ({
        id: 'g1', title: 'Huge', category: 'portraits', passwordHash: '$2a$10$hash',
        slug: 'huge', images: manyImages,
        createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      }));

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/galleries/{id}/bulk-download',
        pathParameters: { id: 'g1' },
        body: JSON.stringify({}),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('Maximum 100 images');
    });

    it('returns 405 for non-POST methods', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/admin/galleries/{id}/bulk-download',
        pathParameters: { id: 'g1' },
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(405);
    });

    it('returns 400 for invalid JSON', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/galleries/{id}/bulk-download',
        pathParameters: { id: 'g1' },
        body: 'not json{',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
    });

    it('generates download URLs with correct bucket and expiration', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => ({
        id: 'g1', title: 'Test', category: 'portraits', passwordHash: '$2a$10$hash',
        slug: 'test', images: [{ key: 'gallery/g1/photo.jpg' }],
        createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      }));

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/galleries/{id}/bulk-download',
        pathParameters: { id: 'g1' },
        body: JSON.stringify({}),
      });
      await handler(event, mockContext, () => {});

      expect(mockGeneratePresignedDownloadUrl).toHaveBeenCalledWith(
        'test-media',
        'gallery/g1/photo.jpg',
        3600
      );
    });

    it('requires authentication', async () => {
      mockParseAuthToken.mockImplementation(() => null);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/galleries/{id}/bulk-download',
        pathParameters: { id: 'g1' },
        body: JSON.stringify({}),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(401);
    });
  });
});
