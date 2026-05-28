import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectsCommand, HeadObjectCommand, CopyObjectCommand, ListObjectsV2Command, CreateMultipartUploadCommand, UploadPartCopyCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
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

/** Get object size in bytes via HEAD. Returns 0 if not found. */
export async function getObjectSize(bucket: string, key: string): Promise<number> {
  try {
    const result = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return result.ContentLength ?? 0;
  } catch {
    return 0;
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

const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100 MB
const PART_SIZE = 100 * 1024 * 1024; // 100 MB per part

export async function copyS3Object(bucket: string, sourceKey: string, destKey: string): Promise<void> {
  const head = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: sourceKey }));
  const size = head.ContentLength ?? 0;

  if (size < MULTIPART_THRESHOLD) {
    await s3Client.send(new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${sourceKey}`,
      Key: destKey,
    }));
    return;
  }

  // Parallel multipart copy for large objects — avoids Lambda timeout on CopyObject
  const { UploadId } = await s3Client.send(new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: destKey,
    ContentType: head.ContentType,
  }));
  if (!UploadId) throw new Error('Failed to initiate multipart upload');

  try {
    const partCount = Math.ceil(size / PART_SIZE);
    const parts = await Promise.all(
      Array.from({ length: partCount }, async (_, i) => {
        const start = i * PART_SIZE;
        const end = Math.min(start + PART_SIZE - 1, size - 1);
        const result = await s3Client.send(new UploadPartCopyCommand({
          Bucket: bucket,
          Key: destKey,
          UploadId,
          PartNumber: i + 1,
          CopySource: `${bucket}/${sourceKey}`,
          CopySourceRange: `bytes=${start}-${end}`,
        }));
        return { PartNumber: i + 1, ETag: result.CopyPartResult?.ETag! };
      })
    );

    await s3Client.send(new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: destKey,
      UploadId,
      MultipartUpload: { Parts: parts },
    }));
  } catch (err) {
    await s3Client.send(new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: destKey,
      UploadId,
    })).catch(() => {});
    throw err;
  }
}

export async function listS3Objects(bucket: string, prefix: string): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
  const allObjects: Array<{ key: string; size: number; lastModified: Date }> = [];
  let continuationToken: string | undefined;

  do {
    const result = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));
    for (const obj of result.Contents || []) {
      allObjects.push({
        key: obj.Key!,
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
      });
    }
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  return allObjects;
}
