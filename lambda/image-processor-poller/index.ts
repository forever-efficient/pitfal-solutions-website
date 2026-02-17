import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const ADMIN_TABLE = process.env.ADMIN_TABLE!;
const GALLERIES_TABLE = process.env.GALLERIES_TABLE!;
const MEDIA_BUCKET = process.env.MEDIA_BUCKET!;
const IMAGENAI_API_KEY = process.env.IMAGENAI_API_KEY!;
const IMAGENAI_BASE_URL = 'https://api.imagen-ai.com/v1';

interface ProcessingJobRecord {
  pk: string;
  sk: string;
  jobId: string;
  galleryId: string;
  rawKeys: string[];
  imagenProjectId: string;
  status: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
}

interface GalleryImage {
  key: string;
  alt?: string;
}

interface GalleryRecord {
  id: string;
  images: GalleryImage[];
}

async function updateJobStatus(
  jobId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const pk = `PROCESSING_JOB#${jobId}`;
  const expressions: string[] = ['#updatedAt = :updatedAt'];
  const names: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const values: Record<string, unknown> = { ':updatedAt': new Date().toISOString() };

  for (const [k, v] of Object.entries(updates)) {
    expressions.push(`#${k} = :${k}`);
    names[`#${k}`] = k;
    values[`:${k}`] = v;
  }

  await dynamo.send(new UpdateCommand({
    TableName: ADMIN_TABLE,
    Key: { pk, sk: pk },
    UpdateExpression: `SET ${expressions.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

async function processCompletedJob(job: ProcessingJobRecord): Promise<void> {
  console.log(JSON.stringify({ level: 'INFO', message: 'Processing completed job', jobId: job.jobId }));

  // Mark as downloading
  await updateJobStatus(job.jobId, { status: 'downloading' });

  // 1. Get list of photos from ImagenAI
  const photosResponse = await fetch(`${IMAGENAI_BASE_URL}/projects/${job.imagenProjectId}/photos`, {
    headers: { 'Authorization': `Bearer ${IMAGENAI_API_KEY}` },
  });

  if (!photosResponse.ok) {
    throw new Error(`Failed to get photos: ${photosResponse.status}`);
  }

  const photosData = await photosResponse.json() as { photos: Array<{ download_url: string; filename: string }> };
  const photos = photosData.photos || [];

  // 2. Download each JPEG and upload to S3 finished/
  const resultKeys: string[] = [];
  for (const photo of photos) {
    const downloadResponse = await fetch(photo.download_url);
    if (!downloadResponse.ok) {
      throw new Error(`Failed to download photo ${photo.filename}: ${downloadResponse.status}`);
    }

    const buffer = Buffer.from(await downloadResponse.arrayBuffer());
    const key = `finished/${job.galleryId}/${randomUUID()}.jpg`;

    await s3.send(new PutObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
    }));

    resultKeys.push(key);
  }

  // 3. Append new keys to gallery.images in DynamoDB
  if (resultKeys.length > 0) {
    const galleryResult = await dynamo.send(new GetCommand({
      TableName: GALLERIES_TABLE,
      Key: { id: job.galleryId },
    }));

    const gallery = galleryResult.Item as GalleryRecord | undefined;
    if (gallery) {
      const existingImages: GalleryImage[] = gallery.images || [];
      const newImages: GalleryImage[] = resultKeys.map(key => ({ key, alt: '' }));
      const updatedImages = [...existingImages, ...newImages];

      await dynamo.send(new UpdateCommand({
        TableName: GALLERIES_TABLE,
        Key: { id: job.galleryId },
        UpdateExpression: 'SET images = :images, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':images': updatedImages,
          ':updatedAt': new Date().toISOString(),
        },
      }));
    }
  }

  // 4. Delete original RAW files from staging
  if (job.rawKeys.length > 0) {
    await s3.send(new DeleteObjectsCommand({
      Bucket: MEDIA_BUCKET,
      Delete: {
        Objects: job.rawKeys.map(key => ({ Key: key })),
        Quiet: true,
      },
    }));
  }

  // 5. Mark job as complete
  await updateJobStatus(job.jobId, {
    status: 'complete',
    resultKeys,
    completedAt: new Date().toISOString(),
  });

  console.log(JSON.stringify({ level: 'INFO', message: 'Job completed', jobId: job.jobId, resultCount: resultKeys.length }));
}

export const handler = async (): Promise<void> => {
  console.log(JSON.stringify({ level: 'INFO', message: 'Poller started' }));

  // Scan for all processing jobs
  const scanResult = await dynamo.send(new ScanCommand({
    TableName: ADMIN_TABLE,
    FilterExpression: 'begins_with(pk, :prefix) AND #status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':prefix': 'PROCESSING_JOB#',
      ':status': 'processing',
    },
  }));

  const jobs = (scanResult.Items || []) as ProcessingJobRecord[];
  console.log(JSON.stringify({ level: 'INFO', message: 'Found processing jobs', count: jobs.length }));

  for (const job of jobs) {
    if (!job.imagenProjectId) continue;

    try {
      // Check ImagenAI project status
      const statusResponse = await fetch(`${IMAGENAI_BASE_URL}/projects/${job.imagenProjectId}`, {
        headers: { 'Authorization': `Bearer ${IMAGENAI_API_KEY}` },
      });

      if (!statusResponse.ok) {
        console.error(JSON.stringify({ level: 'ERROR', message: 'Failed to check project status', jobId: job.jobId }));
        continue;
      }

      const projectData = await statusResponse.json() as { status: string };
      console.log(JSON.stringify({ level: 'INFO', message: 'Project status', jobId: job.jobId, imagenStatus: projectData.status }));

      if (projectData.status === 'completed') {
        await processCompletedJob(job);
      } else if (projectData.status === 'failed') {
        await updateJobStatus(job.jobId, {
          status: 'failed',
          error: 'ImagenAI processing failed',
        });
      }
      // If still 'processing', leave it for next poll cycle

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(JSON.stringify({ level: 'ERROR', message: 'Error processing job', jobId: job.jobId, error: errorMessage }));
      await updateJobStatus(job.jobId, {
        status: 'failed',
        error: errorMessage,
      });
    }
  }

  console.log(JSON.stringify({ level: 'INFO', message: 'Poller complete' }));
};
