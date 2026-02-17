// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubEnv('ADMIN_TABLE', 'test-admin');
vi.stubEnv('MEDIA_BUCKET', 'test-media');
vi.stubEnv('IMAGENAI_API_KEY', 'test-api-key');
vi.stubEnv('IMAGENAI_PROFILE_ID', 'profile-1');

const mockDynamoSend = vi.hoisted(() => vi.fn());
const mockS3Send = vi.hoisted(() => vi.fn());
const mockFetch = vi.hoisted(() => vi.fn());

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({ send: mockDynamoSend })),
  },
  GetCommand: vi.fn((params) => ({ ...params, _type: 'GetCommand' })),
  UpdateCommand: vi.fn((params) => ({ ...params, _type: 'UpdateCommand' })),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: mockS3Send })),
  GetObjectCommand: vi.fn((params) => ({ ...params, _type: 'GetObjectCommand' })),
}));

const { handler } = await import('../../../lambda/image-processor-orchestrator/index');

function makeBody(value: string): AsyncIterable<Uint8Array> {
  return {
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(value);
    },
  };
}

describe('Image Processor Orchestrator Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);

    mockDynamoSend.mockResolvedValue({});
    mockS3Send.mockResolvedValue({
      Body: makeBody('raw-data'),
    });
  });

  it('uploads RAW files to ImagenAI and marks job as processing', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project_id: 'proj-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
      })
      .mockResolvedValueOnce({
        ok: true,
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    await handler({
      jobId: 'job-1',
      galleryId: 'gallery-1',
      rawKeys: ['staging/gallery-1/a.CR2', 'staging/gallery-1/b.CR2'],
    });

    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(mockS3Send).toHaveBeenCalledTimes(2);

    const createCall = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(createCall[0]).toBe('https://api.imagen-ai.com/v1/projects');
    expect(createCall[1].method).toBe('POST');

    const createBody = JSON.parse(String(createCall[1].body));
    expect(createBody).toEqual({
      profile_key: 'profile-1',
      type: 'RAW',
    });

    const uploadCall = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(uploadCall[0]).toContain('/projects/proj-123/photos');

    const startCall = mockFetch.mock.calls[3] as [string, RequestInit];
    expect(startCall[0]).toBe('https://api.imagen-ai.com/v1/projects/proj-123/start');
    expect(startCall[1].method).toBe('POST');

    const firstUpdate = mockDynamoSend.mock.calls[0][0];
    expect(firstUpdate.TableName).toBe('test-admin');
    expect(firstUpdate.ExpressionAttributeValues[':status']).toBe('uploading');

    const finalUpdate = mockDynamoSend.mock.calls[1][0];
    expect(finalUpdate.ExpressionAttributeValues[':status']).toBe('processing');
    expect(finalUpdate.ExpressionAttributeValues[':imagenProjectId']).toBe('proj-123');
  });

  it('marks job as failed when project creation fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'service down',
    });

    await handler({
      jobId: 'job-2',
      galleryId: 'gallery-2',
      rawKeys: ['staging/gallery-2/a.CR2'],
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockS3Send).not.toHaveBeenCalled();
    expect(mockDynamoSend).toHaveBeenCalledTimes(2);

    const failedUpdate = mockDynamoSend.mock.calls[1][0];
    expect(failedUpdate.ExpressionAttributeValues[':status']).toBe('failed');
    expect(String(failedUpdate.ExpressionAttributeValues[':error'])).toContain(
      'ImagenAI project creation failed: 500 service down'
    );
  });
});
