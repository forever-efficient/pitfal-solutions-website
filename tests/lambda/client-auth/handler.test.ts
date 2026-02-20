// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Set env vars BEFORE importing handler (module-level validation runs at import time)
vi.stubEnv('GALLERIES_TABLE', 'test-galleries');
vi.stubEnv('ADMIN_TABLE', 'test-admin');
vi.stubEnv('GALLERY_TOKEN_SECRET', 'test-secret-for-gallery-tokens-32chars!!');
vi.stubEnv('CORS_ALLOWED_ORIGINS', 'https://test.com');
vi.stubEnv('CORS_ORIGIN', 'https://test.com');

const mockGetItem = vi.hoisted(() => vi.fn());
const mockPutItem = vi.hoisted(() => vi.fn());
const mockDeleteItem = vi.hoisted(() => vi.fn());
const mockParseAuthToken = vi.hoisted(() => vi.fn());
const mockCheckLoginAttempts = vi.hoisted(() => vi.fn());
const mockRecordFailedAttempt = vi.hoisted(() => vi.fn());
const mockClearLoginAttempts = vi.hoisted(() => vi.fn());
const mockCompare = vi.hoisted(() => vi.fn());
const mockHash = vi.hoisted(() => vi.fn());

vi.mock('../../../lambda/shared/db', () => ({
  getItem: mockGetItem,
  putItem: mockPutItem,
  deleteItem: mockDeleteItem,
  queryItems: vi.fn(),
  scanItems: vi.fn(),
  updateItem: vi.fn(),
  buildUpdateExpression: vi.fn(),
}));

vi.mock('../../../lambda/shared/session', () => ({
  parseAuthToken: mockParseAuthToken,
  checkLoginAttempts: mockCheckLoginAttempts,
  recordFailedAttempt: mockRecordFailedAttempt,
  clearLoginAttempts: mockClearLoginAttempts,
}));

vi.mock('bcryptjs', () => ({
  default: { compare: mockCompare, hash: mockHash },
  compare: mockCompare,
  hash: mockHash,
}));

const { handler } = await import('../../../lambda/client-auth/index');

// ============ Test token helpers ============

const TOKEN_SECRET = 'test-secret-for-gallery-tokens-32chars!!';
const TOKEN_DURATION = 7 * 24 * 60 * 60;

function makeToken(
  galleryId: string,
  galleryTitle: string,
  noPassword = false,
  expOffset = TOKEN_DURATION
): string {
  const exp = Math.floor(Date.now() / 1000) + expOffset;
  const payloadJson = JSON.stringify({
    galleryId,
    galleryTitle,
    exp,
    ...(noPassword && { noPassword: true }),
  });
  const payload = Buffer.from(payloadJson).toString('base64url');
  const sig = createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function decodeTokenPayload(token: string): Record<string, unknown> {
  const [payloadB64] = token.split('.');
  return JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
}

// ============ Test helpers ============

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
    mockParseAuthToken.mockClear();
    mockCheckLoginAttempts.mockClear();
    mockRecordFailedAttempt.mockClear();
    mockClearLoginAttempts.mockClear();
    mockCompare.mockClear();
    mockHash.mockClear();

    // Defaults
    mockGetItem.mockImplementation(async () => null);
    mockParseAuthToken.mockImplementation(() => null);
    mockCheckLoginAttempts.mockImplementation(async () => ({ locked: false }));
    mockRecordFailedAttempt.mockImplementation(async () => {});
    mockClearLoginAttempts.mockImplementation(async () => {});
    mockCompare.mockImplementation(async () => false);
    mockHash.mockImplementation(async () => '$2a$10$hashedvalue');
  });

  // ============ OPTIONS ============

  describe('OPTIONS (CORS preflight)', () => {
    it('returns 200 with CORS headers', async () => {
      const result = await handler(createEvent({ httpMethod: 'OPTIONS' }), mockContext, () => {});
      expect(result!.statusCode).toBe(200);
      expect(result!.headers?.['Access-Control-Allow-Origin']).toBeDefined();
      expect(result!.headers?.['Access-Control-Allow-Methods']).toBeDefined();
      expect(result!.body).toBe('');
    });
  });

  // ============ METHOD NOT ALLOWED ============

  describe('unsupported methods', () => {
    it('returns 405 for PUT', async () => {
      const result = await handler(createEvent({ httpMethod: 'PUT' }), mockContext, () => {});
      expect(result!.statusCode).toBe(405);
    });

    it('returns 405 for PATCH', async () => {
      const result = await handler(createEvent({ httpMethod: 'PATCH' }), mockContext, () => {});
      expect(result!.statusCode).toBe(405);
    });
  });

  // ============ POST LOGIN ============

  describe('POST login', () => {
    it('returns 400 for invalid JSON body', async () => {
      const result = await handler(createEvent({ httpMethod: 'POST', body: 'not json{' }), mockContext, () => {});
      expect(result!.statusCode).toBe(400);
      expect(JSON.parse(result!.body).error).toContain('Invalid JSON');
    });

    it('returns 400 when galleryId is missing', async () => {
      const result = await handler(
        createEvent({ httpMethod: 'POST', body: JSON.stringify({ password: 'secret' }) }),
        mockContext, () => {}
      );
      expect(result!.statusCode).toBe(400);
      expect(JSON.parse(result!.body).error).toContain('required');
    });

    it('returns 400 when password is missing', async () => {
      const result = await handler(
        createEvent({ httpMethod: 'POST', body: JSON.stringify({ galleryId: 'g1' }) }),
        mockContext, () => {}
      );
      expect(result!.statusCode).toBe(400);
      expect(JSON.parse(result!.body).error).toContain('required');
    });

    it('returns 400 when both fields are missing', async () => {
      const result = await handler(
        createEvent({ httpMethod: 'POST', body: JSON.stringify({}) }),
        mockContext, () => {}
      );
      expect(result!.statusCode).toBe(400);
    });

    it('returns 429 when gallery is locked out', async () => {
      mockCheckLoginAttempts.mockImplementation(async () => ({ locked: true, retryAfter: 600 }));
      const result = await handler(
        createEvent({ httpMethod: 'POST', body: JSON.stringify({ galleryId: 'g1', password: 'pass' }) }),
        mockContext, () => {}
      );
      expect(result!.statusCode).toBe(429);
      expect(JSON.parse(result!.body).error).toContain('Too many login attempts');
      expect(mockGetItem).not.toHaveBeenCalled();
    });

    it('returns 401 when gallery not found', async () => {
      mockGetItem.mockImplementation(async () => null);
      const result = await handler(
        createEvent({ httpMethod: 'POST', body: JSON.stringify({ galleryId: 'nonexistent', password: 'pass' }) }),
        mockContext, () => {}
      );
      expect(result!.statusCode).toBe(401);
      expect(JSON.parse(result!.body).error).toContain('Invalid gallery ID or password');
      expect(mockHash).toHaveBeenCalledWith('dummy', 10);
      expect(mockRecordFailedAttempt).toHaveBeenCalledWith('test-admin', 'nonexistent');
    });

    it('returns 401 when gallery has no password hash', async () => {
      mockGetItem.mockImplementation(async () => ({
        id: 'g1',
        title: 'Test Gallery',
        type: 'client',
        // No passwordHash — cannot POST-login a public gallery
      }));
      const result = await handler(
        createEvent({ httpMethod: 'POST', body: JSON.stringify({ galleryId: 'g1', password: 'pass' }) }),
        mockContext, () => {}
      );
      expect(result!.statusCode).toBe(401);
    });

    it('returns 401 when password is wrong', async () => {
      mockGetItem.mockImplementation(async () => ({
        id: 'g1',
        passwordHash: '$2a$10$existinghash',
        title: 'My Gallery',
        type: 'client',
      }));
      mockCompare.mockImplementation(async () => false);
      const result = await handler(
        createEvent({ httpMethod: 'POST', body: JSON.stringify({ galleryId: 'g1', password: 'wrong' }) }),
        mockContext, () => {}
      );
      expect(result!.statusCode).toBe(401);
      expect(mockCompare).toHaveBeenCalledWith('wrong', '$2a$10$existinghash');
      expect(mockRecordFailedAttempt).toHaveBeenCalledWith('test-admin', 'g1');
    });

    it('returns 200 with HMAC token on successful login', async () => {
      mockGetItem.mockImplementation(async () => ({
        id: 'g1',
        passwordHash: '$2a$10$existinghash',
        title: 'Wedding Photos',
        type: 'client',
      }));
      mockCompare.mockImplementation(async () => true);

      const result = await handler(
        createEvent({ httpMethod: 'POST', body: JSON.stringify({ galleryId: 'g1', password: 'correct' }) }),
        mockContext, () => {}
      );

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.authenticated).toBe(true);
      expect(body.data.galleryId).toBe('g1');
      expect(body.data.galleryTitle).toBe('Wedding Photos');

      // Token should be a valid HMAC token (payload.signature format)
      const token = body.data.token;
      expect(token).toContain('.');
      const [payloadB64, sig] = token.split('.');
      const expectedSig = createHmac('sha256', TOKEN_SECRET).update(payloadB64).digest('base64url');
      expect(sig).toBe(expectedSig);

      // Cookie should be set
      const cookie = result!.headers?.['Set-Cookie'] as string;
      expect(cookie).toContain('pitfal_client_session=');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');

      expect(mockClearLoginAttempts).toHaveBeenCalledWith('test-admin', 'g1');
    });

    it('token payload contains galleryId and galleryTitle, no noPassword flag', async () => {
      mockGetItem.mockImplementation(async () => ({
        id: 'g1',
        passwordHash: '$2a$10$hash',
        title: 'My Gallery',
        type: 'client',
      }));
      mockCompare.mockImplementation(async () => true);

      const result = await handler(
        createEvent({ httpMethod: 'POST', body: JSON.stringify({ galleryId: 'g1', password: 'correct' }) }),
        mockContext, () => {}
      );

      const payload = decodeTokenPayload(JSON.parse(result!.body).data.token);
      expect(payload.galleryId).toBe('g1');
      expect(payload.galleryTitle).toBe('My Gallery');
      expect(payload.noPassword).toBeUndefined();
    });

    it('fetches gallery from galleries table', async () => {
      mockGetItem.mockImplementation(async () => null);
      await handler(
        createEvent({ httpMethod: 'POST', body: JSON.stringify({ galleryId: 'g123', password: 'pass' }) }),
        mockContext, () => {}
      );
      expect(mockGetItem).toHaveBeenCalledWith({ TableName: 'test-galleries', Key: { id: 'g123' } });
    });
  });

  // ============ GET CHECK ============

  describe('GET check', () => {
    it('returns authenticated: false when no token', async () => {
      mockParseAuthToken.mockImplementation(() => null);
      const result = await handler(createEvent({ httpMethod: 'GET' }), mockContext, () => {});
      expect(result!.statusCode).toBe(200);
      expect(JSON.parse(result!.body).data.authenticated).toBe(false);
    });

    it('returns authenticated: false for tampered token', async () => {
      mockParseAuthToken.mockImplementation(() => 'invalidpayload.badsig');
      const result = await handler(createEvent({ httpMethod: 'GET' }), mockContext, () => {});
      expect(result!.statusCode).toBe(200);
      expect(JSON.parse(result!.body).data.authenticated).toBe(false);
    });

    it('returns authenticated: false for expired token', async () => {
      const expiredToken = makeToken('g1', 'Gallery', false, -3600);
      mockParseAuthToken.mockImplementation(() => expiredToken);
      const result = await handler(createEvent({ httpMethod: 'GET' }), mockContext, () => {});
      expect(JSON.parse(result!.body).data.authenticated).toBe(false);
    });

    it('returns authenticated: true with valid password-auth token', async () => {
      const token = makeToken('g1', 'Wedding Photos');
      mockParseAuthToken.mockImplementation(() => token);
      const result = await handler(createEvent({ httpMethod: 'GET' }), mockContext, () => {});
      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.authenticated).toBe(true);
      expect(body.data.galleryId).toBe('g1');
      expect(body.data.galleryTitle).toBe('Wedding Photos');
    });

    it('returns authenticated: true when token galleryId matches requested galleryId', async () => {
      const token = makeToken('g1', 'Gallery');
      mockParseAuthToken.mockImplementation(() => token);
      const result = await handler(
        createEvent({ httpMethod: 'GET', queryStringParameters: { galleryId: 'g1' } }),
        mockContext, () => {}
      );
      expect(JSON.parse(result!.body).data.authenticated).toBe(true);
    });

    it('no DynamoDB call for valid password-auth token (no noPassword flag)', async () => {
      const token = makeToken('g1', 'Gallery', false);
      mockParseAuthToken.mockImplementation(() => token);
      await handler(createEvent({ httpMethod: 'GET' }), mockContext, () => {});
      expect(mockGetItem).not.toHaveBeenCalled();
    });

    it('falls through to auto-auth when token is for a different gallery (no-password gallery)', async () => {
      const tokenForA = makeToken('galleryA', 'Gallery A');
      mockParseAuthToken.mockImplementation(() => tokenForA);
      // Gallery B has no password
      mockGetItem.mockImplementation(async () => ({ id: 'galleryB', title: 'Gallery B', type: 'portfolio' }));

      const result = await handler(
        createEvent({ httpMethod: 'GET', queryStringParameters: { galleryId: 'galleryB' } }),
        mockContext, () => {}
      );

      expect(result!.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.data.authenticated).toBe(true);
      expect(body.data.galleryId).toBe('galleryB');
    });

    it('returns authenticated: false when token is for a different gallery (password gallery)', async () => {
      const tokenForA = makeToken('galleryA', 'Gallery A');
      mockParseAuthToken.mockImplementation(() => tokenForA);
      // Gallery B has a password
      mockGetItem.mockImplementation(async () => ({
        id: 'galleryB',
        title: 'Gallery B',
        type: 'client',
        passwordHash: '$2a$10$hash',
      }));

      const result = await handler(
        createEvent({ httpMethod: 'GET', queryStringParameters: { galleryId: 'galleryB' } }),
        mockContext, () => {}
      );

      expect(JSON.parse(result!.body).data.authenticated).toBe(false);
    });

    describe('no-password gallery tokens (noPassword: true)', () => {
      it('auto-authenticates for password-free gallery with no token', async () => {
        mockParseAuthToken.mockImplementation(() => null);
        mockGetItem.mockImplementation(async () => ({
          id: 'g1',
          title: 'Family Session',
          type: 'portfolio',
        }));

        const result = await handler(
          createEvent({ httpMethod: 'GET', queryStringParameters: { galleryId: 'g1' } }),
          mockContext, () => {}
        );

        expect(result!.statusCode).toBe(200);
        const body = JSON.parse(result!.body);
        expect(body.data.authenticated).toBe(true);
        expect(body.data.galleryId).toBe('g1');
        expect(body.data.galleryTitle).toBe('Family Session');
        expect(body.data.token).toBeDefined();

        // Issued token should have noPassword: true
        const payload = decodeTokenPayload(body.data.token);
        expect(payload.noPassword).toBe(true);

        const cookie = result!.headers?.['Set-Cookie'] as string;
        expect(cookie).toContain('pitfal_client_session=');
        expect(cookie).toContain('HttpOnly');
      });

      it('re-validates gallery when noPassword token is used (gallery still has no password)', async () => {
        const token = makeToken('g1', 'Gallery', true);
        mockParseAuthToken.mockImplementation(() => token);
        mockGetItem.mockImplementation(async () => ({ id: 'g1', title: 'Gallery', type: 'portfolio' }));

        const result = await handler(
          createEvent({ httpMethod: 'GET', queryStringParameters: { galleryId: 'g1' } }),
          mockContext, () => {}
        );

        expect(mockGetItem).toHaveBeenCalled();
        expect(JSON.parse(result!.body).data.authenticated).toBe(true);
      });

      it('invalidates noPassword token if gallery now has a password', async () => {
        const token = makeToken('g1', 'Gallery', true);
        mockParseAuthToken.mockImplementation(() => token);
        mockGetItem.mockImplementation(async () => ({
          id: 'g1',
          title: 'Gallery',
          type: 'client',
          passwordHash: '$2a$10$newpasswordhash',
        }));

        const result = await handler(
          createEvent({ httpMethod: 'GET', queryStringParameters: { galleryId: 'g1' } }),
          mockContext, () => {}
        );

        expect(JSON.parse(result!.body).data.authenticated).toBe(false);
        const cookie = result!.headers?.['Set-Cookie'] as string;
        expect(cookie).toContain('Max-Age=0');
      });

      it('returns authenticated: false when gallery has password and no token', async () => {
        mockParseAuthToken.mockImplementation(() => null);
        mockGetItem.mockImplementation(async () => ({
          id: 'g1',
          title: 'Client Gallery',
          type: 'client',
          passwordHash: '$2a$10$hash',
        }));

        const result = await handler(
          createEvent({ httpMethod: 'GET', queryStringParameters: { galleryId: 'g1' } }),
          mockContext, () => {}
        );
        expect(JSON.parse(result!.body).data.authenticated).toBe(false);
      });

      it('returns authenticated: false when gallery does not exist', async () => {
        mockParseAuthToken.mockImplementation(() => null);
        mockGetItem.mockImplementation(async () => null);

        const result = await handler(
          createEvent({ httpMethod: 'GET', queryStringParameters: { galleryId: 'nonexistent' } }),
          mockContext, () => {}
        );
        expect(JSON.parse(result!.body).data.authenticated).toBe(false);
      });

      it('returns authenticated: false when no galleryId and no token', async () => {
        mockParseAuthToken.mockImplementation(() => null);
        const result = await handler(createEvent({ httpMethod: 'GET' }), mockContext, () => {});
        expect(JSON.parse(result!.body).data.authenticated).toBe(false);
        expect(mockGetItem).not.toHaveBeenCalled();
      });
    });
  });

  // ============ DELETE LOGOUT ============

  describe('DELETE logout', () => {
    it('clears session cookie and returns authenticated: false', async () => {
      const result = await handler(createEvent({ httpMethod: 'DELETE' }), mockContext, () => {});
      expect(result!.statusCode).toBe(200);
      expect(JSON.parse(result!.body).data.authenticated).toBe(false);
      const cookie = result!.headers?.['Set-Cookie'] as string;
      expect(cookie).toContain('pitfal_client_session=');
      expect(cookie).toContain('Max-Age=0');
    });

    it('does not touch DynamoDB on logout (stateless tokens)', async () => {
      const result = await handler(createEvent({ httpMethod: 'DELETE' }), mockContext, () => {});
      expect(result!.statusCode).toBe(200);
      expect(mockDeleteItem).not.toHaveBeenCalled();
      expect(mockGetItem).not.toHaveBeenCalled();
    });
  });

  // ============ CORS HEADERS ============

  describe('CORS headers', () => {
    it('includes CORS headers on success responses', async () => {
      mockParseAuthToken.mockImplementation(() => null);
      const result = await handler(createEvent({ httpMethod: 'GET' }), mockContext, () => {});
      expect(result!.headers?.['Access-Control-Allow-Origin']).toBeDefined();
      expect(result!.headers?.['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('includes CORS headers on error responses', async () => {
      const result = await handler(
        createEvent({ httpMethod: 'POST', body: JSON.stringify({}) }),
        mockContext, () => {}
      );
      expect(result!.statusCode).toBe(400);
      expect(result!.headers?.['Access-Control-Allow-Origin']).toBeDefined();
    });
  });
});
