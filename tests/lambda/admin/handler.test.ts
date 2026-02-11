// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Set env vars BEFORE importing handler (module-level validation)
vi.stubEnv('ADMIN_TABLE', 'test-admin');
vi.stubEnv('GALLERIES_TABLE', 'test-galleries');
vi.stubEnv('INQUIRIES_TABLE', 'test-inquiries');
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
const mockSendTemplatedEmail = vi.hoisted(() => vi.fn());

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

// Mock S3 utilities
vi.mock('../../../lambda/shared/s3', () => ({
  generatePresignedUploadUrl: mockGeneratePresignedUploadUrl,
  generatePresignedDownloadUrl: mockGeneratePresignedDownloadUrl,
  deleteS3Objects: mockDeleteS3Objects,
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
    mockSendTemplatedEmail.mockClear();

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
        httpMethod: 'PUT',
        resource: '/api/admin/auth',
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(405);
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
          id: 'g1', title: 'Older Gallery', category: 'portraits', type: 'portfolio',
          slug: 'older', images: [{ key: 'img1.jpg' }], featured: false,
          createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'g2', title: 'Newer Gallery', category: 'brands', type: 'client',
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
          type: 'portfolio',
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
          type: 'client',
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
        id: 'g1', title: 'Test Gallery', category: 'portraits', type: 'portfolio',
        slug: 'test', images: [], createdAt: '2026-01-01T00:00:00Z',
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
    it('deletes gallery and its images from S3', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => ({
        id: 'g1', title: 'Test', category: 'portraits', type: 'portfolio',
        slug: 'test', images: [{ key: 'img1.jpg' }, { key: 'img2.jpg' }],
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

      // Should delete images from S3
      expect(mockDeleteS3Objects).toHaveBeenCalledWith('test-media', ['img1.jpg', 'img2.jpg']);
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

    it('skips S3 delete when gallery has no images', async () => {
      setupAuthenticatedAdmin();
      mockGetItem.mockImplementation(async () => ({
        id: 'g1', title: 'Empty', category: 'portraits', type: 'portfolio',
        slug: 'empty', images: [],
        createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      }));

      const event = createEvent({
        httpMethod: 'DELETE',
        resource: '/api/admin/galleries/{id}',
        pathParameters: { id: 'g1' },
      });
      await handler(event, mockContext, () => {});

      expect(mockDeleteS3Objects).not.toHaveBeenCalled();
    });
  });

  // ============ IMAGES: UPLOAD URL ============

  describe('POST /admin/images (get upload URL)', () => {
    it('returns presigned upload URL', async () => {
      setupAuthenticatedAdmin();
      mockGeneratePresignedUploadUrl.mockImplementation(async () => 'https://upload.s3.example.com');

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/images',
        body: JSON.stringify({
          galleryId: 'g1',
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.uploadUrl).toBe('https://upload.s3.example.com');
      expect(body.data.key).toContain('finished/g1/');
      expect(body.data.key).toContain('photo.jpg');
    });

    it('returns 400 when required fields are missing', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/images',
        body: JSON.stringify({ galleryId: 'g1' }), // missing filename and contentType
      });
      const result = await handler(event, mockContext, () => {});

      expect(result!.statusCode).toBe(400);
    });

    it('generates upload URL with correct bucket', async () => {
      setupAuthenticatedAdmin();

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/admin/images',
        body: JSON.stringify({
          galleryId: 'g1',
          filename: 'test.png',
          contentType: 'image/png',
        }),
      });
      await handler(event, mockContext, () => {});

      expect(mockGeneratePresignedUploadUrl).toHaveBeenCalledWith(
        'test-media',
        expect.stringContaining('finished/g1/'),
        'image/png',
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
});
