// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for mock variables so they're available in vi.mock factories
const mockSend = vi.hoisted(() => vi.fn());
const mockGetSignedUrl = vi.hoisted(() => vi.fn());

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: mockSend })),
  GetObjectCommand: vi.fn((params) => ({ ...params, _type: 'GetObject' })),
  PutObjectCommand: vi.fn((params) => ({ ...params, _type: 'PutObject' })),
  DeleteObjectsCommand: vi.fn((params) => ({ ...params, _type: 'DeleteObjects' })),
  HeadObjectCommand: vi.fn((params) => ({ ...params, _type: 'HeadObject' })),
  CopyObjectCommand: vi.fn((params) => ({ ...params, _type: 'CopyObject' })),
  ListObjectsV2Command: vi.fn((params) => ({ ...params, _type: 'ListObjectsV2' })),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

import {
  objectExists,
  getObjectSize,
  generatePresignedDownloadUrl,
  generatePresignedUploadUrl,
  deleteS3Objects,
  copyS3Object,
  listS3Objects,
} from '../../../lambda/shared/s3';

describe('S3 utilities', () => {
  beforeEach(() => {
    mockSend.mockClear();
    mockGetSignedUrl.mockClear();
    mockSend.mockImplementation(async () => ({}));
    mockGetSignedUrl.mockImplementation(async () => 'https://signed-url.example.com');
  });

  describe('generatePresignedDownloadUrl', () => {
    it('returns a presigned URL', async () => {
      const url = await generatePresignedDownloadUrl('my-bucket', 'photos/image.jpg');
      expect(url).toBe('https://signed-url.example.com');
      expect(mockGetSignedUrl).toHaveBeenCalledOnce();
    });

    it('passes correct bucket and key to GetObjectCommand', async () => {
      await generatePresignedDownloadUrl('my-bucket', 'photos/image.jpg');

      const [, command] = mockGetSignedUrl.mock.calls[0];
      expect(command.Bucket).toBe('my-bucket');
      expect(command.Key).toBe('photos/image.jpg');
    });

    it('defaults to 1 hour (3600 seconds) expiry', async () => {
      await generatePresignedDownloadUrl('bucket', 'key');

      const [, , options] = mockGetSignedUrl.mock.calls[0];
      expect(options.expiresIn).toBe(3600);
    });

    it('accepts custom expiry time', async () => {
      await generatePresignedDownloadUrl('bucket', 'key', 1800);

      const [, , options] = mockGetSignedUrl.mock.calls[0];
      expect(options.expiresIn).toBe(1800);
    });

    it('passes the S3 client as first argument', async () => {
      await generatePresignedDownloadUrl('bucket', 'key');

      const [client] = mockGetSignedUrl.mock.calls[0];
      // The client should be the S3Client instance with send method
      expect(client).toBeDefined();
      expect(client.send).toBeDefined();
    });

    it('uses custom filename when provided', async () => {
      await generatePresignedDownloadUrl('bucket', 'path/to/file.jpg', 3600, 'custom-name.jpg');
      const [, command] = mockGetSignedUrl.mock.calls[0];
      expect(command.ResponseContentDisposition).toContain('custom-name.jpg');
    });
  });

  describe('generatePresignedUploadUrl', () => {
    it('returns a presigned URL', async () => {
      const url = await generatePresignedUploadUrl('my-bucket', 'uploads/image.jpg', 'image/jpeg');
      expect(url).toBe('https://signed-url.example.com');
      expect(mockGetSignedUrl).toHaveBeenCalledOnce();
    });

    it('passes correct bucket, key, and content type', async () => {
      await generatePresignedUploadUrl('upload-bucket', 'path/file.png', 'image/png');

      const [, command] = mockGetSignedUrl.mock.calls[0];
      expect(command.Bucket).toBe('upload-bucket');
      expect(command.Key).toBe('path/file.png');
      expect(command.ContentType).toBe('image/png');
    });

    it('defaults to 1 hour expiry', async () => {
      await generatePresignedUploadUrl('bucket', 'key', 'image/jpeg');

      const [, , options] = mockGetSignedUrl.mock.calls[0];
      expect(options.expiresIn).toBe(3600);
    });

    it('accepts custom expiry time', async () => {
      await generatePresignedUploadUrl('bucket', 'key', 'image/jpeg', 7200);

      const [, , options] = mockGetSignedUrl.mock.calls[0];
      expect(options.expiresIn).toBe(7200);
    });

    it('handles various content types', async () => {
      await generatePresignedUploadUrl('bucket', 'video.mp4', 'video/mp4');

      const [, command] = mockGetSignedUrl.mock.calls[0];
      expect(command.ContentType).toBe('video/mp4');
    });
  });

  describe('deleteS3Objects', () => {
    it('sends delete command with correct keys', async () => {
      await deleteS3Objects('my-bucket', ['img1.jpg', 'img2.jpg']);

      expect(mockSend).toHaveBeenCalledOnce();
      const command = mockSend.mock.calls[0][0];
      expect(command.Bucket).toBe('my-bucket');
      expect(command.Delete.Objects).toEqual([
        { Key: 'img1.jpg' },
        { Key: 'img2.jpg' },
      ]);
    });

    it('sets Quiet to true', async () => {
      await deleteS3Objects('bucket', ['key1']);

      const command = mockSend.mock.calls[0][0];
      expect(command.Delete.Quiet).toBe(true);
    });

    it('does nothing when keys array is empty', async () => {
      await deleteS3Objects('my-bucket', []);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('handles single key', async () => {
      await deleteS3Objects('bucket', ['single-key.jpg']);

      expect(mockSend).toHaveBeenCalledOnce();
      const command = mockSend.mock.calls[0][0];
      expect(command.Delete.Objects).toEqual([{ Key: 'single-key.jpg' }]);
    });

    it('handles many keys', async () => {
      const keys = Array.from({ length: 100 }, (_, i) => `file-${i}.jpg`);
      await deleteS3Objects('bucket', keys);

      expect(mockSend).toHaveBeenCalledOnce();
      const command = mockSend.mock.calls[0][0];
      expect(command.Delete.Objects).toHaveLength(100);
    });

    it('uses correct bucket name', async () => {
      await deleteS3Objects('pitfal-prod-media', ['test.jpg']);

      const command = mockSend.mock.calls[0][0];
      expect(command.Bucket).toBe('pitfal-prod-media');
    });
  });

  describe('objectExists', () => {
    it('returns true when HEAD succeeds', async () => {
      mockSend.mockResolvedValueOnce({});
      const result = await objectExists('bucket', 'key');
      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledOnce();
    });

    it('returns false when HEAD throws', async () => {
      mockSend.mockRejectedValueOnce(new Error('Not found'));
      const result = await objectExists('bucket', 'key');
      expect(result).toBe(false);
    });
  });

  describe('getObjectSize', () => {
    it('returns ContentLength when HEAD succeeds', async () => {
      mockSend.mockResolvedValueOnce({ ContentLength: 1024 });
      const result = await getObjectSize('bucket', 'key');
      expect(result).toBe(1024);
    });

    it('returns 0 when ContentLength is undefined', async () => {
      mockSend.mockResolvedValueOnce({});
      const result = await getObjectSize('bucket', 'key');
      expect(result).toBe(0);
    });

    it('returns 0 when HEAD throws', async () => {
      mockSend.mockRejectedValueOnce(new Error('Not found'));
      const result = await getObjectSize('bucket', 'key');
      expect(result).toBe(0);
    });
  });

  describe('copyS3Object', () => {
    it('sends copy command with correct params', async () => {
      mockSend.mockResolvedValueOnce({});
      await copyS3Object('bucket', 'source/key', 'dest/key');
      expect(mockSend).toHaveBeenCalledOnce();
      const command = mockSend.mock.calls[0][0];
      expect(command.CopySource).toBe('bucket/source/key');
      expect(command.Key).toBe('dest/key');
    });
  });

  describe('listS3Objects', () => {
    it('returns mapped contents from ListObjectsV2', async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [
          { Key: 'prefix/a.jpg', Size: 100, LastModified: new Date('2026-01-01') },
          { Key: 'prefix/b.jpg', Size: 200 },
        ],
      });
      const result = await listS3Objects('bucket', 'prefix/');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ key: 'prefix/a.jpg', size: 100, lastModified: new Date('2026-01-01') });
      expect(result[1]).toEqual({ key: 'prefix/b.jpg', size: 200, lastModified: expect.any(Date) });
    });

    it('returns empty array when Contents is empty', async () => {
      mockSend.mockResolvedValueOnce({ Contents: [] });
      const result = await listS3Objects('bucket', 'prefix/');
      expect(result).toEqual([]);
    });

    it('returns empty array when Contents is undefined', async () => {
      mockSend.mockResolvedValueOnce({});
      const result = await listS3Objects('bucket', 'prefix/');
      expect(result).toEqual([]);
    });
  });
});
