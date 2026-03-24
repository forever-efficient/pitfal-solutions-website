// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Set env vars BEFORE importing handler
vi.stubEnv('ADMIN_TABLE', 'test-admin');
vi.stubEnv('GALLERIES_TABLE', 'test-galleries');
vi.stubEnv('INQUIRIES_TABLE', 'test-inquiries');
vi.stubEnv('BOOKINGS_TABLE', 'test-bookings');
vi.stubEnv('MEDIA_BUCKET', 'test-media');
vi.stubEnv('CORS_ALLOWED_ORIGINS', 'https://test.com');
vi.stubEnv('CORS_ORIGIN', 'https://test.com');
vi.stubEnv('MEDIACONVERT_ROLE_ARN', 'arn:aws:iam::123456789012:role/test-mediaconvert');

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
const mockMediaConvertSend = vi.hoisted(() => vi.fn());

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

vi.mock('@aws-sdk/client-mediaconvert', () => ({
  MediaConvertClient: vi.fn(() => ({ send: mockMediaConvertSend })),
  CreateJobCommand: vi.fn((params) => ({ ...params, _type: 'CreateJob' })),
  GetJobCommand: vi.fn((params) => ({ ...params, _type: 'GetJob' })),
  DescribeEndpointsCommand: vi.fn((params) => ({ ...params, _type: 'DescribeEndpoints' })),
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

describe('Video Handlers', () => {
  beforeEach(() => {
    mockGetItem.mockClear();
    mockPutItem.mockClear();
    mockUpdateItem.mockClear();
    mockDeleteItem.mockClear();
    mockQueryItems.mockClear();
    mockScanItems.mockClear();
    mockBuildUpdateExpression.mockClear();
    mockValidateSession.mockClear();
    mockParseAuthToken.mockClear();
    mockDecodeToken.mockClear();
    mockGeneratePresignedDownloadUrl.mockClear();
    mockDeleteS3Objects.mockClear();
    mockCopyS3Object.mockClear();
    mockListS3Objects.mockClear();
    mockMediaConvertSend.mockClear();

    // Default: MediaConvert DescribeEndpoints returns a URL
    mockMediaConvertSend.mockImplementation(async (cmd: Record<string, unknown>) => {
      if (cmd._type === 'DescribeEndpoints') {
        return { Endpoints: [{ Url: 'https://mediaconvert.us-west-2.amazonaws.com' }] };
      }
      return {};
    });
  });

  // =========================================================================
  // GET /admin/videos/ready — list staged videos
  // =========================================================================
  describe('GET /admin/videos/ready', () => {
    it('lists staged videos', async () => {
      setupAuthenticatedAdmin();
      mockListS3Objects.mockResolvedValue([
        { key: 'staging/videos/test-video.mp4', size: 50000000, lastModified: new Date('2026-03-20') },
        { key: 'staging/videos/clip2.mov', size: 120000000, lastModified: new Date('2026-03-21') },
      ]);

      const res = await handler(
        createEvent({
          httpMethod: 'GET',
          path: '/api/admin/videos/ready',
          resource: '/api/admin/videos/ready',
        }),
        mockContext
      );

      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.videos).toHaveLength(2);
      expect(body.data.videos[0].filename).toBe('test-video.mp4');
      expect(body.data.videos[1].filename).toBe('clip2.mov');
    });

    it('returns empty list when no staged videos', async () => {
      setupAuthenticatedAdmin();
      mockListS3Objects.mockResolvedValue([]);

      const res = await handler(
        createEvent({
          httpMethod: 'GET',
          path: '/api/admin/videos/ready',
          resource: '/api/admin/videos/ready',
        }),
        mockContext
      );

      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(200);
      expect(body.data.videos).toHaveLength(0);
    });
  });

  // =========================================================================
  // DELETE /admin/videos/ready — delete staged videos
  // =========================================================================
  describe('DELETE /admin/videos/ready', () => {
    it('deletes specified staged videos', async () => {
      setupAuthenticatedAdmin();
      mockDeleteS3Objects.mockResolvedValue(undefined);

      const res = await handler(
        createEvent({
          httpMethod: 'DELETE',
          path: '/api/admin/videos/ready',
          resource: '/api/admin/videos/ready',
          body: JSON.stringify({ keys: ['staging/videos/test.mp4'] }),
        }),
        mockContext
      );

      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(200);
      expect(body.data.deleted).toBe(1);
      expect(mockDeleteS3Objects).toHaveBeenCalledWith('test-media', ['staging/videos/test.mp4']);
    });

    it('rejects keys outside staging/videos/', async () => {
      setupAuthenticatedAdmin();

      const res = await handler(
        createEvent({
          httpMethod: 'DELETE',
          path: '/api/admin/videos/ready',
          resource: '/api/admin/videos/ready',
          body: JSON.stringify({ keys: ['gallery/123/videos/test.mp4'] }),
        }),
        mockContext
      );

      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(400);
      expect(body.error).toContain('staging/videos/');
    });
  });

  // =========================================================================
  // POST /admin/videos/preview — generate preview clip
  // =========================================================================
  describe('POST /admin/videos/preview', () => {
    it('creates a MediaConvert job for preview generation', async () => {
      setupAuthenticatedAdmin();
      mockMediaConvertSend.mockImplementation(async (cmd: Record<string, unknown>) => {
        if (cmd._type === 'DescribeEndpoints') {
          return { Endpoints: [{ Url: 'https://mediaconvert.us-west-2.amazonaws.com' }] };
        }
        if (cmd._type === 'CreateJob') {
          return { Job: { Id: 'mc-job-123' } };
        }
        return {};
      });
      mockPutItem.mockResolvedValue(undefined);

      const res = await handler(
        createEvent({
          httpMethod: 'POST',
          path: '/api/admin/videos/preview',
          resource: '/api/admin/videos/preview',
          body: JSON.stringify({
            videoKey: 'staging/videos/test-video.mp4',
            startTime: 5,
            duration: 10,
          }),
        }),
        mockContext
      );

      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.videoId).toBeDefined();
      expect(body.data.jobId).toBe('mc-job-123');
      expect(mockPutItem).toHaveBeenCalled();
    });

    it('rejects duration outside 3-15 range', async () => {
      setupAuthenticatedAdmin();

      const res = await handler(
        createEvent({
          httpMethod: 'POST',
          path: '/api/admin/videos/preview',
          resource: '/api/admin/videos/preview',
          body: JSON.stringify({
            videoKey: 'staging/videos/test.mp4',
            startTime: 0,
            duration: 20,
          }),
        }),
        mockContext
      );

      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(400);
      expect(body.error).toContain('duration');
    });

    it('rejects duration less than 3', async () => {
      setupAuthenticatedAdmin();

      const res = await handler(
        createEvent({
          httpMethod: 'POST',
          path: '/api/admin/videos/preview',
          resource: '/api/admin/videos/preview',
          body: JSON.stringify({
            videoKey: 'staging/videos/test.mp4',
            startTime: 0,
            duration: 1,
          }),
        }),
        mockContext
      );

      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(400);
    });

    it('rejects negative startTime', async () => {
      setupAuthenticatedAdmin();

      const res = await handler(
        createEvent({
          httpMethod: 'POST',
          path: '/api/admin/videos/preview',
          resource: '/api/admin/videos/preview',
          body: JSON.stringify({
            videoKey: 'staging/videos/test.mp4',
            startTime: -5,
            duration: 5,
          }),
        }),
        mockContext
      );

      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(400);
    });

    it('rejects invalid videoKey prefix', async () => {
      setupAuthenticatedAdmin();

      const res = await handler(
        createEvent({
          httpMethod: 'POST',
          path: '/api/admin/videos/preview',
          resource: '/api/admin/videos/preview',
          body: JSON.stringify({
            videoKey: 'site/hero-bg.jpg',
            startTime: 0,
            duration: 5,
          }),
        }),
        mockContext
      );

      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(400);
    });
  });

  // =========================================================================
  // GET /admin/videos/preview-status — poll MediaConvert job
  // =========================================================================
  describe('GET /admin/videos/preview-status', () => {
    it('returns complete status when job is done', async () => {
      setupAuthenticatedAdmin();
      mockMediaConvertSend.mockImplementation(async (cmd: Record<string, unknown>) => {
        if (cmd._type === 'DescribeEndpoints') {
          return { Endpoints: [{ Url: 'https://mediaconvert.us-west-2.amazonaws.com' }] };
        }
        if (cmd._type === 'GetJob') {
          return {
            Job: {
              Status: 'COMPLETE',
              Settings: {
                OutputGroups: [{
                  OutputGroupSettings: {
                    FileGroupSettings: { Destination: 's3://test-media/video-previews/' },
                  },
                  Outputs: [{ Extension: 'mp4' }],
                }],
              },
            },
          };
        }
        return {};
      });

      const res = await handler(
        createEvent({
          httpMethod: 'GET',
          path: '/api/admin/videos/preview-status',
          resource: '/api/admin/videos/preview-status',
          queryStringParameters: { jobId: 'mc-job-123' },
        }),
        mockContext
      );

      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(200);
      expect(body.data.status).toBe('complete');
    });

    it('returns processing status for in-progress job', async () => {
      setupAuthenticatedAdmin();
      mockMediaConvertSend.mockImplementation(async (cmd: Record<string, unknown>) => {
        if (cmd._type === 'DescribeEndpoints') {
          return { Endpoints: [{ Url: 'https://mediaconvert.us-west-2.amazonaws.com' }] };
        }
        if (cmd._type === 'GetJob') {
          return { Job: { Status: 'PROGRESSING' } };
        }
        return {};
      });

      const res = await handler(
        createEvent({
          httpMethod: 'GET',
          path: '/api/admin/videos/preview-status',
          resource: '/api/admin/videos/preview-status',
          queryStringParameters: { jobId: 'mc-job-456' },
        }),
        mockContext
      );

      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(200);
      expect(body.data.status).toBe('processing');
    });

    it('returns error status for failed job', async () => {
      setupAuthenticatedAdmin();
      mockMediaConvertSend.mockImplementation(async (cmd: Record<string, unknown>) => {
        if (cmd._type === 'DescribeEndpoints') {
          return { Endpoints: [{ Url: 'https://mediaconvert.us-west-2.amazonaws.com' }] };
        }
        if (cmd._type === 'GetJob') {
          return { Job: { Status: 'ERROR', ErrorMessage: 'Input not found' } };
        }
        return {};
      });

      const res = await handler(
        createEvent({
          httpMethod: 'GET',
          path: '/api/admin/videos/preview-status',
          resource: '/api/admin/videos/preview-status',
          queryStringParameters: { jobId: 'mc-job-789' },
        }),
        mockContext
      );

      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(200);
      expect(body.data.status).toBe('error');
    });

    it('rejects missing jobId', async () => {
      setupAuthenticatedAdmin();

      const res = await handler(
        createEvent({
          httpMethod: 'GET',
          path: '/api/admin/videos/preview-status',
          resource: '/api/admin/videos/preview-status',
          queryStringParameters: null,
        }),
        mockContext
      );

      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(400);
    });
  });

  // =========================================================================
  // POST /admin/videos/assign — assign video to gallery
  // =========================================================================
  describe('POST /admin/videos/assign', () => {
    it('assigns a video to a gallery', async () => {
      setupAuthenticatedAdmin();
      mockCopyS3Object.mockResolvedValue(undefined);
      mockGetItem.mockResolvedValue({
        pk: 'GALLERY#gal-123',
        sk: 'METADATA',
        id: 'gal-123',
        title: 'Test Gallery',
        category: 'videography',
        slug: 'test-gallery',
        images: [],
      });
      mockBuildUpdateExpression.mockReturnValue({
        UpdateExpression: 'SET #videos = :videos, #updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#videos': 'videos', '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: { ':videos': [], ':updatedAt': '' },
      });
      mockUpdateItem.mockResolvedValue(undefined);
      mockDeleteS3Objects.mockResolvedValue(undefined);

      const res = await handler(
        createEvent({
          httpMethod: 'POST',
          path: '/api/admin/videos/assign',
          resource: '/api/admin/videos/assign',
          body: JSON.stringify({
            videoKey: 'staging/videos/test-video.mp4',
            previewKey: 'video-previews/abc-preview.mp4',
            galleryId: 'gal-123',
            youtubeUrl: 'https://youtube.com/watch?v=abc123',
            title: 'Test Video',
          }),
        }),
        mockContext
      );

      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(200);
      expect(body.data.assigned).toBe(true);
      expect(mockCopyS3Object).toHaveBeenCalled();
      expect(mockDeleteS3Objects).toHaveBeenCalled();
    });

    it('rejects missing galleryId', async () => {
      setupAuthenticatedAdmin();

      const res = await handler(
        createEvent({
          httpMethod: 'POST',
          path: '/api/admin/videos/assign',
          resource: '/api/admin/videos/assign',
          body: JSON.stringify({
            videoKey: 'staging/videos/test-video.mp4',
          }),
        }),
        mockContext
      );

      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(400);
    });

    it('rejects missing videoKey', async () => {
      setupAuthenticatedAdmin();

      const res = await handler(
        createEvent({
          httpMethod: 'POST',
          path: '/api/admin/videos/assign',
          resource: '/api/admin/videos/assign',
          body: JSON.stringify({
            galleryId: 'gal-123',
          }),
        }),
        mockContext
      );

      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(400);
    });
  });

  // =========================================================================
  // GET /galleries/video-previews — public endpoint
  // =========================================================================
  describe('GET /galleries/video-previews', () => {
    it('returns previews from non-password-protected galleries', async () => {
      mockScanItems.mockResolvedValue([
        {
          id: 'gal-1',
          title: 'Public Gallery',
          category: 'videography',
          slug: 'public-gallery',
          videos: [
            { key: 'gallery/gal-1/videos/v1.mp4', previewKey: 'video-previews/p1.mp4', title: 'Video 1', youtubeUrl: 'https://youtube.com/1' },
          ],
        },
        {
          id: 'gal-2',
          title: 'Private Gallery',
          category: 'videography',
          slug: 'private-gallery',
          passwordHash: '$2a$10$somehash',
          videos: [
            { key: 'gallery/gal-2/videos/v2.mp4', previewKey: 'video-previews/p2.mp4', title: 'Video 2' },
          ],
        },
        {
          id: 'gal-3',
          title: 'No Videos Gallery',
          category: 'portraits',
          slug: 'no-videos',
        },
      ]);

      const res = await handler(
        createEvent({
          httpMethod: 'GET',
          path: '/api/galleries/video-previews',
          resource: '/api/galleries/video-previews',
        }),
        mockContext
      );

      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(200);
      expect(body.data.previews).toHaveLength(1);
      expect(body.data.previews[0].previewKey).toBe('video-previews/p1.mp4');
      expect(body.data.previews[0].galleryId).toBe('gal-1');
    });

    it('returns empty array when no videos exist', async () => {
      mockScanItems.mockResolvedValue([
        { id: 'gal-1', title: 'Gallery', category: 'portraits', slug: 'test', passwordEnabled: false },
      ]);

      const res = await handler(
        createEvent({
          httpMethod: 'GET',
          path: '/api/galleries/video-previews',
          resource: '/api/galleries/video-previews',
        }),
        mockContext
      );

      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(200);
      expect(body.data.previews).toHaveLength(0);
    });
  });
});
