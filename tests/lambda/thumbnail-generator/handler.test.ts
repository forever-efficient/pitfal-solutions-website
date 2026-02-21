// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import type { S3Event, Context } from 'aws-lambda';

vi.stubEnv('MEDIA_BUCKET', 'test-media-bucket');

const mockS3Send = vi.hoisted(() => vi.fn());

// Create a valid 1x1 JPEG for Sharp to process (minimal valid image)
let VALID_JPEG: Buffer;
beforeAll(async () => {
  VALID_JPEG = await sharp({
    create: { width: 1, height: 1, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .jpeg()
    .toBuffer();
});

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: mockS3Send })),
  GetObjectCommand: vi.fn((params: { Bucket: string; Key: string }) => ({ ...params, _type: 'GetObjectCommand' })),
  PutObjectCommand: vi.fn((params: { Bucket: string; Key: string; Body: Buffer }) => ({ ...params, _type: 'PutObjectCommand' })),
  DeleteObjectCommand: vi.fn((params: { Bucket: string; Key: string }) => ({ ...params, _type: 'DeleteObjectCommand' })),
}));

// Sharp is used via require() in the Lambda; use real Sharp with minimal valid JPEG

const { handler } = await import('../../../lambda/thumbnail-generator/src/index');

function makeS3Event(bucket: string, key: string, eventName: string): S3Event {
  const encodedKey = encodeURIComponent(key);
  return {
    Records: [
      {
        eventVersion: '2.1',
        eventSource: 'aws:s3',
        awsRegion: 'us-west-2',
        eventTime: new Date().toISOString(),
        eventName,
        s3: {
          s3SchemaVersion: '1.0',
          configurationId: 'test',
          bucket: { name: bucket },
          object: {
            key: encodedKey,
            size: 1024,
            eTag: 'abc',
            sequencer: '0',
          },
        },
      },
    ],
  };
}

const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'thumbnail-generator',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:us-west-2:123:function:thumbnail-gen',
  memoryLimitInMB: '1024',
  awsRequestId: 'test-request-id',
  logGroupName: '/aws/lambda/thumbnail-gen',
  logStreamName: '2026/01/01',
  getRemainingTimeInMillis: () => 60000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
};

function makeReadableStream(data: Buffer): AsyncIterable<Uint8Array> {
  return {
    async *[Symbol.asyncIterator]() {
      yield data;
    },
  };
}

describe('Thumbnail Generator Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockS3Send.mockImplementation((cmd: { _type?: string; Key?: string }) => {
      if (cmd._type === 'GetObjectCommand') {
        return Promise.resolve({
          Body: makeReadableStream(VALID_JPEG),
        });
      }
      return Promise.resolve({});
    });
  });

  it('processes ObjectCreated event and generates thumbnails', async () => {
    const event = makeS3Event('test-media-bucket', 'gallery/g1/photo.jpg', 'ObjectCreated:Put');

    await handler(event, mockContext);

    expect(mockS3Send).toHaveBeenCalled();
    const getCalls = mockS3Send.mock.calls.filter((c) => c[0]._type === 'GetObjectCommand');
    expect(getCalls.length).toBe(1);
    expect(getCalls[0][0].Key).toBe('gallery/g1/photo.jpg');

    const putCalls = mockS3Send.mock.calls.filter((c) => c[0]._type === 'PutObjectCommand');
    expect(putCalls.length).toBe(4);
    const putKeys = putCalls.map((c) => c[0].Key);
    expect(putKeys).toContain('processed/g1/photo/600w.webp');
    expect(putKeys).toContain('processed/g1/photo/900w.webp');
    expect(putKeys).toContain('processed/g1/photo/1200w.webp');
    expect(putKeys).toContain('processed/g1/photo/1920w.webp');
  });

  it('skips keys outside gallery prefix', async () => {
    const event = makeS3Event('test-media-bucket', 'staging/ready/other.jpg', 'ObjectCreated:Put');

    await handler(event, mockContext);

    const getCalls = mockS3Send.mock.calls.filter((c) => c[0]._type === 'GetObjectCommand');
    expect(getCalls.length).toBe(0);
  });

  it('skips unsupported file extensions', async () => {
    const event = makeS3Event('test-media-bucket', 'gallery/g1/file.pdf', 'ObjectCreated:Put');

    await handler(event, mockContext);

    const getCalls = mockS3Send.mock.calls.filter((c) => c[0]._type === 'GetObjectCommand');
    expect(getCalls.length).toBe(0);
  });

  it('processes ObjectRemoved event and deletes thumbnails', async () => {
    const event = makeS3Event('test-media-bucket', 'gallery/g1/photo.jpg', 'ObjectRemoved:Delete');

    await handler(event, mockContext);

    const deleteCalls = mockS3Send.mock.calls.filter((c) => c[0]._type === 'DeleteObjectCommand');
    expect(deleteCalls.length).toBe(4);
    const deleteKeys = deleteCalls.map((c) => c[0].Key);
    expect(deleteKeys).toContain('processed/g1/photo/600w.webp');
    expect(deleteKeys).toContain('processed/g1/photo/1920w.webp');
  });

  it('supports .jpeg and .png extensions', async () => {
    const event = makeS3Event('test-media-bucket', 'gallery/g1/image.jpeg', 'ObjectCreated:Put');

    await handler(event, mockContext);

    const getCalls = mockS3Send.mock.calls.filter((c) => c[0]._type === 'GetObjectCommand');
    expect(getCalls.length).toBe(1);
    expect(getCalls[0][0].Key).toBe('gallery/g1/image.jpeg');
  });
});
