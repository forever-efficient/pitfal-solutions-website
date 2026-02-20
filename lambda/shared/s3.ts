import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectsCommand, HeadObjectCommand, CopyObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
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

export async function copyS3Object(bucket: string, sourceKey: string, destKey: string): Promise<void> {
  await s3Client.send(new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${sourceKey}`,
    Key: destKey,
  }));
}

export async function listS3Objects(bucket: string, prefix: string): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
  const result = await s3Client.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
  }));
  return (result.Contents || []).map(obj => ({
    key: obj.Key!,
    size: obj.Size || 0,
    lastModified: obj.LastModified || new Date(),
  }));
}
