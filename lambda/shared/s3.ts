import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectsCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({});

export async function objectExists(bucket: string, key: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function generatePresignedDownloadUrl(
  bucket: string,
  key: string,
  expiresIn = 3600,
  filename?: string
): Promise<string> {
  const dispositionFilename = filename || key.split('/').pop() || 'download';
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${dispositionFilename}"`,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function generatePresignedUploadUrl(
  bucket: string,
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteS3Objects(bucket: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  await s3Client.send(new DeleteObjectsCommand({
    Bucket: bucket,
    Delete: {
      Objects: keys.map(Key => ({ Key })),
      Quiet: true,
    },
  }));
}
