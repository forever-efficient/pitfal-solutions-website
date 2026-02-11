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
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

import {
  generatePresignedDownloadUrl,
  generatePresignedUploadUrl,
  deleteS3Objects,
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
});
