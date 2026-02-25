// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Set env vars BEFORE importing handler
vi.stubEnv('ADMIN_TABLE', 'test-admin');
vi.stubEnv('GALLERIES_TABLE', 'test-galleries');
vi.stubEnv('INQUIRIES_TABLE', 'test-inquiries');
vi.stubEnv('BOOKINGS_TABLE', 'test-bookings');
vi.stubEnv('MEDIA_BUCKET', 'test-media');
vi.stubEnv('ORCHESTRATOR_FUNCTION_NAME', 'test-orchestrator');
vi.stubEnv('CORS_ALLOWED_ORIGINS', 'https://test.com');
vi.stubEnv('CORS_ORIGIN', 'https://test.com');

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

vi.mock('../../../lambda/shared/db', () => ({
  getItem: mockGetItem,
  putItem: mockPutItem,
  updateItem: mockUpdateItem,
  deleteItem: mockDeleteItem,
  queryItems: mockQueryItems,
  scanItems: mockScanItems,
  buildUpdateExpression: mockBuildUpdateExpression,
}));

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

vi.mock('bcryptjs', () => ({
  default: { compare: mockCompare, hash: mockHash },
  compare: mockCompare,
  hash: mockHash,
}));

vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: vi.fn(() => ({ send: mockLambdaInvokeSend })),
  InvokeCommand: vi.fn((params) => params),
}));

vi.mock('../../../lambda/shared/s3', () => ({
  generatePresignedUploadUrl: mockGeneratePresignedUploadUrl,
  generatePresignedDownloadUrl: mockGeneratePresignedDownloadUrl,
  deleteS3Objects: mockDeleteS3Objects,
  copyS3Object: mockCopyS3Object,
  listS3Objects: mockListS3Objects,
}));

vi.mock('../../../lambda/shared/email', () => ({
  sendTemplatedEmail: mockSendTemplatedEmail,
}));

const { handler } = await import('../../../lambda/admin/index');

function createEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    body: null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/api/admin/imagen/upload',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      requestId: 'test-request-id',
      identity: { sourceIp: '127.0.0.1', userAgent: 'test' },
    } as APIGatewayProxyEvent['requestContext'],
    resource: '/api/admin/imagen/upload',
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

function setupAuthenticatedAdmin(username = 'admin') {
  const encodedToken = Buffer.from(`${username}:validtoken`).toString('base64');
  mockParseAuthToken.mockImplementation(() => encodedToken);
  mockDecodeToken.mockImplementation(() => ({ id: username, token: 'validtoken' }));
  mockValidateSession.mockImplementation(async () => ({
    pk: `ADMIN#${username}`,
    sk: 'validtoken',
    token: 'validtoken',
    createdAt: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + 86400,
  }));
}

describe('Admin Imagen Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthenticatedAdmin();
  });

  // =========================================================================
  // /api/admin/imagen/upload
  // =========================================================================
  describe('POST /api/admin/imagen/upload', () => {
    it('returns presigned URL for valid RAW file', async () => {
      mockGeneratePresignedUploadUrl.mockResolvedValue('https://s3.presigned/upload');

      const result = await handler(
        createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/imagen/upload',
          body: JSON.stringify({ filename: 'photo.cr2', contentType: 'image/x-canon-cr2' }),
        }),
        mockContext,
        () => {}
      );

      const body = JSON.parse(result!.body);
      expect(result!.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.uploadUrl).toBe('https://s3.presigned/upload');
      expect(body.data.key).toMatch(/^imagen\/RAW\/[a-f0-9-]+-photo\.cr2$/);
      expect(mockGeneratePresignedUploadUrl).toHaveBeenCalledWith(
        'test-media',
        expect.stringMatching(/^imagen\/RAW\//),
        'image/x-canon-cr2'
      );
    });

    it('returns presigned URL for JPEG file', async () => {
      mockGeneratePresignedUploadUrl.mockResolvedValue('https://s3.presigned/upload');

      const result = await handler(
        createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/imagen/upload',
          body: JSON.stringify({ filename: 'photo.jpg', contentType: 'image/jpeg' }),
        }),
        mockContext,
        () => {}
      );

      const body = JSON.parse(result!.body);
      expect(result!.statusCode).toBe(200);
      expect(body.data.key).toMatch(/^imagen\/RAW\/[a-f0-9-]+-photo\.jpg$/);
    });

    it('returns presigned URL for PNG file', async () => {
      mockGeneratePresignedUploadUrl.mockResolvedValue('https://s3.presigned/upload');

      const result = await handler(
        createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/imagen/upload',
          body: JSON.stringify({ filename: 'photo.png', contentType: 'image/png' }),
        }),
        mockContext,
        () => {}
      );

      expect(result!.statusCode).toBe(200);
    });

    it('rejects unsupported file extension', async () => {
      const result = await handler(
        createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/imagen/upload',
          body: JSON.stringify({ filename: 'doc.pdf', contentType: 'application/pdf' }),
        }),
        mockContext,
        () => {}
      );

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toMatch(/Unsupported file type/);
    });

    it('rejects missing filename', async () => {
      const result = await handler(
        createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/imagen/upload',
          body: JSON.stringify({ contentType: 'image/jpeg' }),
        }),
        mockContext,
        () => {}
      );

      expect(result!.statusCode).toBe(400);
    });

    it('rejects missing contentType', async () => {
      const result = await handler(
        createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/imagen/upload',
          body: JSON.stringify({ filename: 'photo.jpg' }),
        }),
        mockContext,
        () => {}
      );

      expect(result!.statusCode).toBe(400);
    });

    it('sanitizes filename with special characters', async () => {
      mockGeneratePresignedUploadUrl.mockResolvedValue('https://s3.presigned/upload');

      const result = await handler(
        createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/imagen/upload',
          body: JSON.stringify({ filename: 'my photo (1).cr2', contentType: 'image/x-canon-cr2' }),
        }),
        mockContext,
        () => {}
      );

      const body = JSON.parse(result!.body);
      expect(result!.statusCode).toBe(200);
      // Spaces and parens replaced with underscores
      expect(body.data.key).toMatch(/my_photo__1_\.cr2$/);
    });
  });

  describe('GET /api/admin/imagen/upload', () => {
    it('lists files in imagen/RAW/', async () => {
      mockListS3Objects.mockResolvedValue([
        { key: 'imagen/RAW/abc-photo.cr2', size: 25000000, lastModified: new Date('2026-02-24') },
        { key: 'imagen/RAW/def-photo2.jpg', size: 5000000, lastModified: new Date('2026-02-24') },
      ]);

      const result = await handler(
        createEvent({
          httpMethod: 'GET',
          resource: '/api/admin/imagen/upload',
        }),
        mockContext,
        () => {}
      );

      const body = JSON.parse(result!.body);
      expect(result!.statusCode).toBe(200);
      expect(body.data.files).toHaveLength(2);
      expect(body.data.files[0].key).toBe('imagen/RAW/abc-photo.cr2');
      expect(mockListS3Objects).toHaveBeenCalledWith('test-media', 'imagen/RAW/');
    });
  });

  // =========================================================================
  // /api/admin/imagen/process
  // =========================================================================
  describe('POST /api/admin/imagen/process', () => {
    it('creates single job for all-RAW batch', async () => {
      mockPutItem.mockResolvedValue(undefined);
      mockLambdaInvokeSend.mockResolvedValue({});

      const rawKeys = ['imagen/RAW/abc-photo.cr2', 'imagen/RAW/def-photo2.nef'];

      const result = await handler(
        createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/imagen/process',
          body: JSON.stringify({ rawKeys }),
        }),
        mockContext,
        () => {}
      );

      const body = JSON.parse(result!.body);
      expect(result!.statusCode).toBe(200);
      expect(body.data.jobIds).toHaveLength(1);

      // Single batch → single job + single orchestrator invoke
      expect(mockPutItem).toHaveBeenCalledTimes(1);
      expect(mockPutItem).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-admin',
          Item: expect.objectContaining({
            status: 'queued',
            source: 'imagen',
            galleryId: '',
            rawKeys,
          }),
        })
      );

      expect(mockLambdaInvokeSend).toHaveBeenCalledTimes(1);
      expect(mockLambdaInvokeSend).toHaveBeenCalledWith(
        expect.objectContaining({
          FunctionName: 'test-orchestrator',
          InvocationType: 'Event',
          Payload: expect.stringContaining('"source":"imagen"'),
        })
      );
    });

    it('splits mixed JPG + RAW batch into two jobs', async () => {
      mockPutItem.mockResolvedValue(undefined);
      mockLambdaInvokeSend.mockResolvedValue({});

      const rawKeys = [
        'imagen/RAW/abc-photo.jpg',
        'imagen/RAW/def-photo.cr2',
        'imagen/RAW/ghi-photo.jpeg',
      ];

      const result = await handler(
        createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/imagen/process',
          body: JSON.stringify({ rawKeys }),
        }),
        mockContext,
        () => {}
      );

      const body = JSON.parse(result!.body);
      expect(result!.statusCode).toBe(200);
      expect(body.data.jobIds).toHaveLength(2);

      // Two batches → two DynamoDB records + two orchestrator invokes
      expect(mockPutItem).toHaveBeenCalledTimes(2);
      expect(mockLambdaInvokeSend).toHaveBeenCalledTimes(2);

      // First batch = JPG keys with JPG profile
      const firstPayload = JSON.parse(mockLambdaInvokeSend.mock.calls[0][0].Payload);
      expect(firstPayload.rawKeys).toEqual(['imagen/RAW/abc-photo.jpg', 'imagen/RAW/ghi-photo.jpeg']);
      expect(firstPayload.profileId).toBe('');  // env var not set in test

      // Second batch = RAW keys with RAW profile
      const secondPayload = JSON.parse(mockLambdaInvokeSend.mock.calls[1][0].Payload);
      expect(secondPayload.rawKeys).toEqual(['imagen/RAW/def-photo.cr2']);
    });

    it('rejects empty rawKeys', async () => {
      const result = await handler(
        createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/imagen/process',
          body: JSON.stringify({ rawKeys: [] }),
        }),
        mockContext,
        () => {}
      );

      expect(result!.statusCode).toBe(400);
    });

    it('rejects keys not in imagen/RAW/', async () => {
      const result = await handler(
        createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/imagen/process',
          body: JSON.stringify({ rawKeys: ['staging/RAW/photo.cr2'] }),
        }),
        mockContext,
        () => {}
      );

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toMatch(/must start with imagen\/RAW\//);
    });

    it('rejects non-POST methods', async () => {
      const result = await handler(
        createEvent({
          httpMethod: 'GET',
          resource: '/api/admin/imagen/process',
        }),
        mockContext,
        () => {}
      );

      expect(result!.statusCode).toBe(405);
    });
  });

  // =========================================================================
  // /api/admin/imagen/jobs
  // =========================================================================
  describe('GET /api/admin/imagen/jobs', () => {
    it('lists imagen processing jobs', async () => {
      mockScanItems.mockResolvedValue([
        {
          pk: 'PROCESSING_JOB#job1',
          sk: 'PROCESSING_JOB#job1',
          jobId: 'job1',
          status: 'processing',
          source: 'imagen',
          createdAt: '2026-02-24T01:00:00Z',
        },
        {
          pk: 'PROCESSING_JOB#job2',
          sk: 'PROCESSING_JOB#job2',
          jobId: 'job2',
          status: 'complete',
          source: 'imagen',
          createdAt: '2026-02-24T02:00:00Z',
        },
      ]);

      const result = await handler(
        createEvent({
          httpMethod: 'GET',
          resource: '/api/admin/imagen/jobs',
        }),
        mockContext,
        () => {}
      );

      const body = JSON.parse(result!.body);
      expect(result!.statusCode).toBe(200);
      expect(body.data.jobs).toHaveLength(2);
      // Should be sorted newest first
      expect(body.data.jobs[0].jobId).toBe('job2');
      expect(mockScanItems).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-admin',
          FilterExpression: expect.stringContaining('source'),
        })
      );
    });

    it('rejects non-GET methods', async () => {
      const result = await handler(
        createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/imagen/jobs',
        }),
        mockContext,
        () => {}
      );

      expect(result!.statusCode).toBe(405);
    });
  });

  // =========================================================================
  // /api/admin/imagen/edited
  // =========================================================================
  describe('GET /api/admin/imagen/edited', () => {
    it('lists files in imagen/edited/', async () => {
      mockListS3Objects.mockResolvedValue([
        { key: 'imagen/edited/uuid1.jpg', size: 3000000, lastModified: new Date('2026-02-24') },
      ]);

      const result = await handler(
        createEvent({
          httpMethod: 'GET',
          resource: '/api/admin/imagen/edited',
        }),
        mockContext,
        () => {}
      );

      const body = JSON.parse(result!.body);
      expect(result!.statusCode).toBe(200);
      expect(body.data.files).toHaveLength(1);
      expect(mockListS3Objects).toHaveBeenCalledWith('test-media', 'imagen/edited/');
    });
  });

  describe('DELETE /api/admin/imagen/edited', () => {
    it('deletes specified keys from imagen/edited/', async () => {
      mockDeleteS3Objects.mockResolvedValue(undefined);
      const keys = ['imagen/edited/uuid1.jpg', 'imagen/edited/uuid2.jpg'];

      const result = await handler(
        createEvent({
          httpMethod: 'DELETE',
          resource: '/api/admin/imagen/edited',
          body: JSON.stringify({ keys }),
        }),
        mockContext,
        () => {}
      );

      const body = JSON.parse(result!.body);
      expect(result!.statusCode).toBe(200);
      expect(body.data.deleted).toBe(2);
      expect(mockDeleteS3Objects).toHaveBeenCalledWith('test-media', keys);
    });

    it('rejects keys not in imagen/edited/', async () => {
      const result = await handler(
        createEvent({
          httpMethod: 'DELETE',
          resource: '/api/admin/imagen/edited',
          body: JSON.stringify({ keys: ['staging/ready/photo.jpg'] }),
        }),
        mockContext,
        () => {}
      );

      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toMatch(/must start with imagen\/edited\//);
    });

    it('rejects empty keys array', async () => {
      const result = await handler(
        createEvent({
          httpMethod: 'DELETE',
          resource: '/api/admin/imagen/edited',
          body: JSON.stringify({ keys: [] }),
        }),
        mockContext,
        () => {}
      );

      expect(result!.statusCode).toBe(400);
    });
  });

  // =========================================================================
  // /api/admin/imagen/approve
  // =========================================================================
  describe('POST /api/admin/imagen/approve', () => {
    it('copies files from imagen/edited/ to staging/ready/ and deletes originals', async () => {
      mockCopyS3Object.mockResolvedValue(undefined);
      mockDeleteS3Objects.mockResolvedValue(undefined);
      const keys = ['imagen/edited/uuid1.jpg', 'imagen/edited/uuid2.jpg'];

      const result = await handler(
        createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/imagen/approve',
          body: JSON.stringify({ keys }),
        }),
        mockContext,
        () => {}
      );

      const body = JSON.parse(result!.body);
      expect(result!.statusCode).toBe(200);
      expect(body.data.approved).toBe(2);

      // Verify copy calls
      expect(mockCopyS3Object).toHaveBeenCalledTimes(2);
      expect(mockCopyS3Object).toHaveBeenCalledWith(
        'test-media',
        'imagen/edited/uuid1.jpg',
        'staging/ready/uuid1.jpg'
      );
      expect(mockCopyS3Object).toHaveBeenCalledWith(
        'test-media',
        'imagen/edited/uuid2.jpg',
        'staging/ready/uuid2.jpg'
      );

      // Verify originals deleted
      expect(mockDeleteS3Objects).toHaveBeenCalledWith('test-media', keys);
    });

    it('rejects keys not in imagen/edited/', async () => {
      const result = await handler(
        createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/imagen/approve',
          body: JSON.stringify({ keys: ['gallery/123/photo.jpg'] }),
        }),
        mockContext,
        () => {}
      );

      expect(result!.statusCode).toBe(400);
    });

    it('rejects empty keys array', async () => {
      const result = await handler(
        createEvent({
          httpMethod: 'POST',
          resource: '/api/admin/imagen/approve',
          body: JSON.stringify({ keys: [] }),
        }),
        mockContext,
        () => {}
      );

      expect(result!.statusCode).toBe(400);
    });

    it('rejects non-POST methods', async () => {
      const result = await handler(
        createEvent({
          httpMethod: 'GET',
          resource: '/api/admin/imagen/approve',
        }),
        mockContext,
        () => {}
      );

      expect(result!.statusCode).toBe(405);
    });
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('requires authentication for imagen routes', async () => {
      mockParseAuthToken.mockReturnValue(null);

      const result = await handler(
        createEvent({
          httpMethod: 'GET',
          resource: '/api/admin/imagen/upload',
        }),
        mockContext,
        () => {}
      );

      expect(result!.statusCode).toBe(401);
    });
  });
});
