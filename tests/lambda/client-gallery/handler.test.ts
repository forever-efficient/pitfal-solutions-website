// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Set env vars BEFORE importing handler (module-level validation)
vi.stubEnv('GALLERIES_TABLE', 'test-galleries');
vi.stubEnv('ADMIN_TABLE', 'test-admin');
vi.stubEnv('MEDIA_BUCKET', 'test-media');

// Use vi.hoisted for all mock variables
const mockGetItem = vi.hoisted(() => vi.fn());
const mockPutItem = vi.hoisted(() => vi.fn());
const mockQueryItems = vi.hoisted(() => vi.fn());
const mockValidateSession = vi.hoisted(() => vi.fn());
const mockParseAuthToken = vi.hoisted(() => vi.fn());
const mockDecodeToken = vi.hoisted(() => vi.fn());
const mockGeneratePresignedDownloadUrl = vi.hoisted(() => vi.fn());

// Mock db module
vi.mock('../../../lambda/shared/db', () => ({
  getItem: mockGetItem,
  putItem: mockPutItem,
  queryItems: mockQueryItems,
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  scanItems: vi.fn(),
  buildUpdateExpression: vi.fn(),
}));

// Mock session module
vi.mock('../../../lambda/shared/session', () => ({
  validateSession: mockValidateSession,
  parseAuthToken: mockParseAuthToken,
  decodeToken: mockDecodeToken,
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  checkLoginAttempts: vi.fn(),
  recordFailedAttempt: vi.fn(),
  clearLoginAttempts: vi.fn(),
  encodeToken: vi.fn(),
}));

// Mock S3 utilities
vi.mock('../../../lambda/shared/s3', () => ({
  generatePresignedDownloadUrl: mockGeneratePresignedDownloadUrl,
  generatePresignedUploadUrl: vi.fn(),
  deleteS3Objects: vi.fn(),
}));

// Import handler after mocks and env are set
const { handler } = await import('../../../lambda/client-gallery/index');

// Helper to create mock API Gateway event
function createEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    body: null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/api/client/gallery-1',
    pathParameters: { galleryId: 'gallery-1' },
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      requestId: 'test-request-id',
      identity: { sourceIp: '127.0.0.1', userAgent: 'test' },
    } as APIGatewayProxyEvent['requestContext'],
    resource: '/api/client/{galleryId}',
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

/** Sets up mocks for an authenticated client session */
function setupAuthenticatedClient(galleryId = 'gallery-1') {
  mockParseAuthToken.mockImplementation(() => 'encoded-token');
  mockDecodeToken.mockImplementation(() => ({ id: galleryId, token: 'valid-token' }));
  mockValidateSession.mockImplementation(async () => ({
    pk: `GALLERY_SESSION#${galleryId}`,
    sk: 'valid-token',
    token: 'valid-token',
    createdAt: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + 86400,
  }));
}

const sampleGallery = {
  id: 'gallery-1',
  title: 'Wedding Photos',
  description: 'Beautiful wedding shots',
  images: [
    { key: 'finished/gallery-1/img1.jpg', alt: 'Photo 1' },
    { key: 'finished/gallery-1/img2.jpg', alt: 'Photo 2' },
    { key: 'finished/gallery-1/img3.jpg' },
  ],
  heroImage: 'finished/gallery-1/hero.jpg',
  sections: [
    { id: 's1', title: 'Ceremony', images: ['finished/gallery-1/img1.jpg'] },
    { id: 's2', title: 'Reception', description: 'The party', images: ['finished/gallery-1/img2.jpg', 'finished/gallery-1/img3.jpg'] },
  ],
  category: 'weddings',
  type: 'client',
};

describe('Client Gallery Lambda Handler', () => {
  beforeEach(() => {
    mockGetItem.mockClear();
    mockPutItem.mockClear();
    mockQueryItems.mockClear();
    mockValidateSession.mockClear();
    mockParseAuthToken.mockClear();
    mockDecodeToken.mockClear();
    mockGeneratePresignedDownloadUrl.mockClear();

    mockGetItem.mockImplementation(async () => null);
    mockQueryItems.mockImplementation(async () => []);
    mockGeneratePresignedDownloadUrl.mockImplementation(async (_bucket: string, key: string) =>
      `https://s3.amazonaws.com/test-media/${key}?signed=true`
    );
  });

  describe('OPTIONS (CORS preflight)', () => {
    it('returns CORS response for OPTIONS requests', async () => {
      const event = createEvent({ httpMethod: 'OPTIONS' });
      const result = await handler(event, mockContext, () => {});
      expect(result).toBeDefined();
      expect(result!.statusCode).toBe(200);
    });
  });

  describe('authentication', () => {
    it('returns 401 when no auth token is provided', async () => {
      mockParseAuthToken.mockImplementation(() => null);
      const event = createEvent();
      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(401);
    });

    it('returns 401 when token decode fails', async () => {
      mockParseAuthToken.mockImplementation(() => 'some-token');
      mockDecodeToken.mockImplementation(() => null);
      const event = createEvent();
      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(401);
    });

    it('returns 401 when token galleryId does not match', async () => {
      mockParseAuthToken.mockImplementation(() => 'some-token');
      mockDecodeToken.mockImplementation(() => ({ id: 'other-gallery', token: 'valid-token' }));
      const event = createEvent();
      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(401);
    });

    it('returns 401 when session validation fails', async () => {
      mockParseAuthToken.mockImplementation(() => 'some-token');
      mockDecodeToken.mockImplementation(() => ({ id: 'gallery-1', token: 'valid-token' }));
      mockValidateSession.mockImplementation(async () => null);
      const event = createEvent();
      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(401);
    });
  });

  describe('missing galleryId', () => {
    it('returns 400 when galleryId is missing from path', async () => {
      const event = createEvent({ pathParameters: {} });
      // No auth needed since galleryId check happens before auth
      // Actually, auth check uses galleryId so we need to see what happens
      // Looking at the code: galleryId is extracted first, then checked for null
      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toBe('Gallery ID is required');
    });
  });

  describe('GET /api/client/{galleryId} (gallery details)', () => {
    beforeEach(() => {
      setupAuthenticatedClient();
    });

    it('returns gallery with images, heroImage, sections, and comments', async () => {
      mockGetItem.mockImplementation(async () => sampleGallery);
      mockQueryItems.mockImplementation(async () => [
        {
          pk: 'GALLERY_COMMENT#gallery-1',
          sk: '2026-01-01T00:00:00.000Z#c1',
          commentId: 'c1',
          imageKey: 'finished/gallery-1/img1.jpg',
          author: 'Jane',
          text: 'Love this shot!',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]);

      const event = createEvent();
      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(200);

      const body = JSON.parse(result!.body);
      expect(body.data.gallery.id).toBe('gallery-1');
      expect(body.data.gallery.title).toBe('Wedding Photos');
      expect(body.data.gallery.description).toBe('Beautiful wedding shots');
      expect(body.data.gallery.images).toHaveLength(3);
      expect(body.data.gallery.heroImage).toBe('finished/gallery-1/hero.jpg');
      expect(body.data.gallery.sections).toHaveLength(2);
      expect(body.data.gallery.sections[0].title).toBe('Ceremony');
      expect(body.data.gallery.sections[1].title).toBe('Reception');
      expect(body.data.gallery.category).toBe('weddings');
      expect(body.data.comments).toHaveLength(1);
      expect(body.data.comments[0].id).toBe('c1');
      expect(body.data.comments[0].author).toBe('Jane');
    });

    it('returns heroImage as null when not set', async () => {
      const galleryNoHero = { ...sampleGallery, heroImage: undefined };
      mockGetItem.mockImplementation(async () => galleryNoHero);

      const event = createEvent();
      const result = await handler(event, mockContext, () => {});
      const body = JSON.parse(result!.body);
      expect(body.data.gallery.heroImage).toBeNull();
    });

    it('returns empty sections array when gallery has no sections', async () => {
      const galleryNoSections = { ...sampleGallery, sections: undefined };
      mockGetItem.mockImplementation(async () => galleryNoSections);

      const event = createEvent();
      const result = await handler(event, mockContext, () => {});
      const body = JSON.parse(result!.body);
      expect(body.data.gallery.sections).toEqual([]);
    });

    it('returns empty comments when gallery has no comments', async () => {
      mockGetItem.mockImplementation(async () => sampleGallery);
      mockQueryItems.mockImplementation(async () => []);

      const event = createEvent();
      const result = await handler(event, mockContext, () => {});
      const body = JSON.parse(result!.body);
      expect(body.data.comments).toEqual([]);
    });

    it('returns 404 when gallery does not exist', async () => {
      mockGetItem.mockImplementation(async () => null);

      const event = createEvent();
      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(404);
    });

    it('queries comments with correct partition key', async () => {
      mockGetItem.mockImplementation(async () => sampleGallery);

      const event = createEvent();
      await handler(event, mockContext, () => {});

      expect(mockQueryItems).toHaveBeenCalledWith({
        TableName: 'test-admin',
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: {
          ':pk': 'GALLERY_COMMENT#gallery-1',
        },
        ScanIndexForward: true,
      });
    });

    it('does not include type field in response', async () => {
      mockGetItem.mockImplementation(async () => sampleGallery);

      const event = createEvent();
      const result = await handler(event, mockContext, () => {});
      const body = JSON.parse(result!.body);
      expect(body.data.gallery.type).toBeUndefined();
    });
  });

  describe('POST /api/client/{galleryId}/comment', () => {
    beforeEach(() => {
      setupAuthenticatedClient();
    });

    it('adds a comment to the gallery', async () => {
      mockPutItem.mockImplementation(async () => undefined);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/comment',
        body: JSON.stringify({
          imageKey: 'finished/gallery-1/img1.jpg',
          author: 'Jane Doe',
          text: 'Great photo!',
        }),
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(201);

      const body = JSON.parse(result!.body);
      expect(body.comment.imageKey).toBe('finished/gallery-1/img1.jpg');
      expect(body.comment.author).toBe('Jane Doe');
      expect(body.comment.text).toBe('Great photo!');
      expect(body.comment.id).toBeDefined();
      expect(body.comment.createdAt).toBeDefined();
    });

    it('trims author and text whitespace', async () => {
      mockPutItem.mockImplementation(async () => undefined);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/comment',
        body: JSON.stringify({
          imageKey: 'finished/gallery-1/img1.jpg',
          author: '  Jane  ',
          text: '  Nice!  ',
        }),
      });

      const result = await handler(event, mockContext, () => {});
      const body = JSON.parse(result!.body);
      expect(body.comment.author).toBe('Jane');
      expect(body.comment.text).toBe('Nice!');
    });

    it('stores comment with correct DynamoDB structure', async () => {
      mockPutItem.mockImplementation(async () => undefined);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/comment',
        body: JSON.stringify({
          imageKey: 'finished/gallery-1/img1.jpg',
          author: 'Jane',
          text: 'Love it',
        }),
      });

      await handler(event, mockContext, () => {});

      expect(mockPutItem).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-admin',
          Item: expect.objectContaining({
            pk: 'GALLERY_COMMENT#gallery-1',
            imageKey: 'finished/gallery-1/img1.jpg',
            author: 'Jane',
            text: 'Love it',
            galleryId: 'gallery-1',
          }),
        })
      );
    });

    it('returns 400 when imageKey is missing', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/comment',
        body: JSON.stringify({ author: 'Jane', text: 'Hello' }),
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(400);
    });

    it('returns 400 when author is missing', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/comment',
        body: JSON.stringify({ imageKey: 'key', text: 'Hello' }),
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(400);
    });

    it('returns 400 when text is missing', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/comment',
        body: JSON.stringify({ imageKey: 'key', author: 'Jane' }),
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(400);
    });

    it('returns 400 when text exceeds 1000 characters', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/comment',
        body: JSON.stringify({
          imageKey: 'key',
          author: 'Jane',
          text: 'x'.repeat(1001),
        }),
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('1000');
    });

    it('returns 400 when author exceeds 100 characters', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/comment',
        body: JSON.stringify({
          imageKey: 'key',
          author: 'x'.repeat(101),
          text: 'Hello',
        }),
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('100');
    });

    it('returns 400 for invalid JSON body', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/comment',
        body: 'not json',
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(400);
    });
  });

  describe('POST /api/client/{galleryId}/download', () => {
    beforeEach(() => {
      setupAuthenticatedClient();
    });

    it('returns presigned download URL for a valid image', async () => {
      mockGetItem.mockImplementation(async () => sampleGallery);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/download',
        body: JSON.stringify({ imageKey: 'finished/gallery-1/img1.jpg' }),
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(200);

      const body = JSON.parse(result!.body);
      expect(body.downloadUrl).toContain('finished/gallery-1/img1.jpg');
      expect(body.downloadUrl).toContain('signed=true');
    });

    it('calls generatePresignedDownloadUrl with correct params', async () => {
      mockGetItem.mockImplementation(async () => sampleGallery);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/download',
        body: JSON.stringify({ imageKey: 'finished/gallery-1/img1.jpg' }),
      });

      await handler(event, mockContext, () => {});

      expect(mockGeneratePresignedDownloadUrl).toHaveBeenCalledWith(
        'test-media',
        'finished/gallery-1/img1.jpg',
        3600
      );
    });

    it('returns 404 when image does not belong to gallery', async () => {
      mockGetItem.mockImplementation(async () => sampleGallery);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/download',
        body: JSON.stringify({ imageKey: 'finished/other-gallery/img.jpg' }),
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(404);
    });

    it('returns 404 when gallery does not exist', async () => {
      mockGetItem.mockImplementation(async () => null);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/download',
        body: JSON.stringify({ imageKey: 'some-key' }),
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(404);
    });

    it('returns 400 when imageKey is missing', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/download',
        body: JSON.stringify({}),
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(400);
    });

    it('returns 400 for invalid JSON body', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/download',
        body: 'bad json',
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(400);
    });
  });

  describe('POST /api/client/{galleryId}/bulk-download', () => {
    beforeEach(() => {
      setupAuthenticatedClient();
    });

    it('returns presigned URLs for all gallery images when no keys specified', async () => {
      mockGetItem.mockImplementation(async () => sampleGallery);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/bulk-download',
        body: JSON.stringify({}),
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(200);

      const body = JSON.parse(result!.body);
      expect(body.downloads).toHaveLength(3);
      expect(body.downloads[0].key).toBe('finished/gallery-1/img1.jpg');
      expect(body.downloads[0].downloadUrl).toContain('signed=true');
    });

    it('returns presigned URLs for specific requested image keys', async () => {
      mockGetItem.mockImplementation(async () => sampleGallery);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/bulk-download',
        body: JSON.stringify({
          imageKeys: ['finished/gallery-1/img1.jpg', 'finished/gallery-1/img3.jpg'],
        }),
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(200);

      const body = JSON.parse(result!.body);
      expect(body.downloads).toHaveLength(2);
      expect(body.downloads.map((d: { key: string }) => d.key)).toEqual([
        'finished/gallery-1/img1.jpg',
        'finished/gallery-1/img3.jpg',
      ]);
    });

    it('returns 400 when some requested keys do not belong to gallery', async () => {
      mockGetItem.mockImplementation(async () => sampleGallery);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/bulk-download',
        body: JSON.stringify({
          imageKeys: ['finished/gallery-1/img1.jpg', 'finished/other/bad-key.jpg'],
        }),
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('do not belong');
    });

    it('returns 404 when gallery does not exist', async () => {
      mockGetItem.mockImplementation(async () => null);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/bulk-download',
        body: JSON.stringify({}),
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(404);
    });

    it('returns 400 when gallery has no images', async () => {
      const emptyGallery = { ...sampleGallery, images: [] };
      mockGetItem.mockImplementation(async () => emptyGallery);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/bulk-download',
        body: JSON.stringify({}),
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('No images');
    });

    it('returns 400 when requesting more than 100 images', async () => {
      const manyImages = Array.from({ length: 101 }, (_, i) => ({
        key: `finished/gallery-1/img${i}.jpg`,
      }));
      const bigGallery = { ...sampleGallery, images: manyImages };
      mockGetItem.mockImplementation(async () => bigGallery);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/bulk-download',
        body: JSON.stringify({}),
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(400);
      const body = JSON.parse(result!.body);
      expect(body.error).toContain('100');
    });

    it('calls generatePresignedDownloadUrl with correct bucket and expiration', async () => {
      const smallGallery = {
        ...sampleGallery,
        images: [{ key: 'finished/gallery-1/img1.jpg' }],
      };
      mockGetItem.mockImplementation(async () => smallGallery);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/bulk-download',
        body: JSON.stringify({}),
      });

      await handler(event, mockContext, () => {});

      expect(mockGeneratePresignedDownloadUrl).toHaveBeenCalledWith(
        'test-media',
        'finished/gallery-1/img1.jpg',
        3600
      );
    });

    it('returns 400 for invalid JSON body', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/bulk-download',
        body: 'not json',
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(400);
    });

    it('requires authentication', async () => {
      mockParseAuthToken.mockClear();
      mockDecodeToken.mockClear();
      mockValidateSession.mockClear();
      mockParseAuthToken.mockImplementation(() => null);

      const event = createEvent({
        httpMethod: 'POST',
        resource: '/api/client/{galleryId}/bulk-download',
        body: JSON.stringify({}),
      });

      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(401);
    });
  });

  describe('method not allowed', () => {
    beforeEach(() => {
      setupAuthenticatedClient();
    });

    it('returns 405 for unsupported methods', async () => {
      const event = createEvent({ httpMethod: 'DELETE' });
      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(405);
    });

    it('returns 405 for GET on comment endpoint', async () => {
      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/client/{galleryId}/comment',
      });
      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(405);
    });

    it('returns 405 for GET on download endpoint', async () => {
      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/client/{galleryId}/download',
      });
      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(405);
    });

    it('returns 405 for GET on bulk-download endpoint', async () => {
      const event = createEvent({
        httpMethod: 'GET',
        resource: '/api/client/{galleryId}/bulk-download',
      });
      const result = await handler(event, mockContext, () => {});
      expect(result!.statusCode).toBe(405);
    });
  });
});
