// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubEnv('ADMIN_TABLE', 'test-admin');
vi.stubEnv('GALLERIES_TABLE', 'test-galleries');
vi.stubEnv('MEDIA_BUCKET', 'test-media');
vi.stubEnv('IMAGENAI_API_KEY', 'test-api-key');

const mockDynamoSend = vi.hoisted(() => vi.fn());
const mockS3Send = vi.hoisted(() => vi.fn());
const mockFetch = vi.hoisted(() => vi.fn());
const mockRandomUUID = vi.hoisted(() => vi.fn());

vi.mock('crypto', async () => {
  const actual = await vi.importActual<typeof import('crypto')>('crypto');
  return {
    ...actual,
    randomUUID: mockRandomUUID,
  };
});

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({ send: mockDynamoSend })),
  },
  ScanCommand: vi.fn((params) => ({ ...params, _type: 'ScanCommand' })),
  UpdateCommand: vi.fn((params) => ({ ...params, _type: 'UpdateCommand' })),
  GetCommand: vi.fn((params) => ({ ...params, _type: 'GetCommand' })),
  PutCommand: vi.fn((params) => ({ ...params, _type: 'PutCommand' })),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: mockS3Send })),
  PutObjectCommand: vi.fn((params) => ({ ...params, _type: 'PutObjectCommand' })),
  DeleteObjectsCommand: vi.fn((params) => ({ ...params, _type: 'DeleteObjectsCommand' })),
}));

const { handler } = await import('../../../lambda/image-processor-poller/index');

describe('Image Processor Poller Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);

    mockRandomUUID.mockReturnValue('uuid-1');

    mockDynamoSend.mockImplementation(async (command: { _type?: string }) => {
      if (command._type === 'ScanCommand') {
        return {
          Items: [
            {
              pk: 'PROCESSING_JOB#job-1',
              sk: 'PROCESSING_JOB#job-1',
              jobId: 'job-1',
              galleryId: 'gallery-1',
              rawKeys: ['staging/gallery-1/a.CR2'],
              imagenProjectId: 'proj-1',
              status: 'exporting',
              mode: 'auto',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        };
      }

      if (command._type === 'GetCommand') {
        return {
          Item: {
            id: 'gallery-1',
            images: [{ key: 'finished/gallery-1/existing.jpg', alt: 'existing' }],
          },
        };
      }

      return {};
    });

    mockS3Send.mockResolvedValue({});
  });

  it('downloads completed ImagenAI photos, stores in S3, updates gallery, and marks job complete', async () => {
    // 1. Export status check
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'completed' }),
    });
    // 2. Get download links
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          files_list: [{ file_name: 'photo-1.jpg', download_link: 'https://download.example.com/photo-1' }],
        },
      }),
    });
    // 3. Download file from presigned URL
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
    });

    await handler();

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockS3Send).toHaveBeenCalledTimes(2);

    const putCall = mockS3Send.mock.calls[0][0];
    expect(putCall._type).toBe('PutObjectCommand');
    expect(putCall.Bucket).toBe('test-media');
    expect(putCall.Key).toBe('finished/gallery-1/uuid-1.jpg');
    expect(putCall.ContentType).toBe('image/jpeg');

    const deleteCall = mockS3Send.mock.calls[1][0];
    expect(deleteCall._type).toBe('DeleteObjectsCommand');
    expect(deleteCall.Delete.Objects).toEqual([{ Key: 'staging/gallery-1/a.CR2' }]);

    const updates = mockDynamoSend.mock.calls
      .map((call) => call[0])
      .filter((command) => command._type === 'UpdateCommand');

    expect(updates).toHaveLength(3);

    const downloadingUpdate = updates[0];
    expect(downloadingUpdate.TableName).toBe('test-admin');
    expect(downloadingUpdate.ExpressionAttributeValues[':status']).toBe('downloading');

    const galleryUpdate = updates[1];
    expect(galleryUpdate.TableName).toBe('test-galleries');
    expect(galleryUpdate.ExpressionAttributeValues[':images']).toEqual([
      { key: 'finished/gallery-1/existing.jpg', alt: 'existing' },
      { key: 'finished/gallery-1/uuid-1.jpg', alt: '' },
    ]);

    const completeUpdate = updates[2];
    expect(completeUpdate.TableName).toBe('test-admin');
    expect(completeUpdate.ExpressionAttributeValues[':status']).toBe('complete');
    expect(completeUpdate.ExpressionAttributeValues[':resultKeys']).toEqual([
      'finished/gallery-1/uuid-1.jpg',
    ]);
  });

  it('marks job as failed when ImagenAI project status is failed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'failed' }),
    });

    await handler();

    expect(mockS3Send).not.toHaveBeenCalled();

    const updates = mockDynamoSend.mock.calls
      .map((call) => call[0])
      .filter((command) => command._type === 'UpdateCommand');

    expect(updates).toHaveLength(1);
    expect(updates[0].ExpressionAttributeValues[':status']).toBe('failed');
    expect(updates[0].ExpressionAttributeValues[':error']).toBe('ImagenAI export failed');
  });

  it('marks job as failed when completed-job processing throws', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'completed' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
      });

    await handler();

    const updates = mockDynamoSend.mock.calls
      .map((call) => call[0])
      .filter((command) => command._type === 'UpdateCommand');

    expect(updates).toHaveLength(2);
    expect(updates[0].ExpressionAttributeValues[':status']).toBe('downloading');
    expect(updates[1].ExpressionAttributeValues[':status']).toBe('failed');
    expect(String(updates[1].ExpressionAttributeValues[':error'])).toContain(
      'Failed to get export download links: 502'
    );
  });
});
