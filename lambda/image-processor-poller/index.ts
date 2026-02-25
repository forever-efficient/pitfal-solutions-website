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
  source?: 'imagen' | 'legacy';
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

async function downloadAndStoreResults(job: ProcessingJobRecord): Promise<void> {
  console.log(JSON.stringify({ level: 'INFO', message: 'Downloading exported files', jobId: job.jobId }));

  await updateJobStatus(job.jobId, { status: 'downloading' });

  // Get download links from the EXPORT endpoint (rendered JPEGs, not XMP sidecars)
  const linksResponse = await fetch(
    `${IMAGENAI_BASE_URL}/projects/${job.imagenProjectId}/export/get_temporary_download_links`,
    { headers: { 'x-api-key': IMAGENAI_API_KEY } }
  );

  if (!linksResponse.ok) {
    throw new Error(`Failed to get export download links: ${linksResponse.status}`);
  }

  const rawLinksData = await linksResponse.json() as Record<string, unknown>;
  console.log(JSON.stringify({ level: 'INFO', message: 'Export download links raw response', jobId: job.jobId, rawLinksData }));

  const nested = (rawLinksData.data || rawLinksData) as Record<string, unknown>;
  const files = (nested.files_list || []) as Array<{ file_name: string; download_link: string }>;

  if (files.length === 0) {
    throw new Error('Export returned no files to download');
  }

  // Download each rendered JPEG and upload to S3
  const isImagen = job.source === 'imagen';
  const resultKeys: string[] = [];
  for (const file of files) {
    const downloadResponse = await fetch(file.download_link);
    if (!downloadResponse.ok) {
      throw new Error(`Failed to download file ${file.file_name}: ${downloadResponse.status}`);
    }

    const buffer = Buffer.from(await downloadResponse.arrayBuffer());
    console.log(JSON.stringify({ level: 'INFO', message: 'Downloaded file', jobId: job.jobId, fileName: file.file_name, size: buffer.length }));

    const key = isImagen
      ? `imagen/edited/${randomUUID()}.jpg`
      : `finished/${job.galleryId}/${randomUUID()}.jpg`;

    await s3.send(new PutObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
    }));

    resultKeys.push(key);
  }

  // Append new keys to gallery.images in DynamoDB (skip for imagen jobs —
  // imagen edits go through admin review before gallery assignment)
  if (!isImagen && resultKeys.length > 0) {
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

  // Delete original RAW files from staging
  if (job.rawKeys.length > 0) {
    await s3.send(new DeleteObjectsCommand({
      Bucket: MEDIA_BUCKET,
      Delete: {
        Objects: job.rawKeys.map(key => ({ Key: key })),
        Quiet: true,
      },
    }));
  }

  // Mark job as complete
  await updateJobStatus(job.jobId, {
    status: 'complete',
    resultKeys,
    completedAt: new Date().toISOString(),
  });

  console.log(JSON.stringify({ level: 'INFO', message: 'Job completed', jobId: job.jobId, resultCount: resultKeys.length }));
}

export const handler = async (): Promise<void> => {
  console.log(JSON.stringify({ level: 'INFO', message: 'Poller started' }));

  // Scan for all active jobs (processing = waiting for edit, exporting = waiting for export)
  const scanResult = await dynamo.send(new ScanCommand({
    TableName: ADMIN_TABLE,
    FilterExpression: 'begins_with(pk, :prefix) AND (#status = :processing OR #status = :exporting)',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':prefix': 'PROCESSING_JOB#',
      ':processing': 'processing',
      ':exporting': 'exporting',
    },
  }));

  const jobs = (scanResult.Items || []) as ProcessingJobRecord[];
  console.log(JSON.stringify({ level: 'INFO', message: 'Found active jobs', count: jobs.length }));

  for (const job of jobs) {
    if (!job.imagenProjectId) continue;

    try {
      if (job.status === 'processing') {
        // Stage 1: Check if EDIT is complete
        const statusResponse = await fetch(`${IMAGENAI_BASE_URL}/projects/${job.imagenProjectId}/edit/status`, {
          headers: { 'x-api-key': IMAGENAI_API_KEY },
        });

        if (!statusResponse.ok) {
          console.error(JSON.stringify({ level: 'ERROR', message: 'Failed to check edit status', jobId: job.jobId, httpStatus: statusResponse.status }));
          continue;
        }

        const rawStatusData = await statusResponse.json() as Record<string, unknown>;
        console.log(JSON.stringify({ level: 'INFO', message: 'Edit status raw response', jobId: job.jobId, rawStatusData }));

        const nestedStatus = (rawStatusData.data || {}) as Record<string, unknown>;
        const editStatus = ((nestedStatus.status || rawStatusData.status) as string)?.toLowerCase();

        if (editStatus === 'completed') {
          // Edit done — trigger export to render actual JPEGs
          console.log(JSON.stringify({ level: 'INFO', message: 'Edit completed, triggering export', jobId: job.jobId }));

          const exportResponse = await fetch(`${IMAGENAI_BASE_URL}/projects/${job.imagenProjectId}/export`, {
            method: 'POST',
            headers: {
              'x-api-key': IMAGENAI_API_KEY,
              'Content-Type': 'application/json',
            },
          });

          if (!exportResponse.ok) {
            const errText = await exportResponse.text();
            throw new Error(`Failed to trigger export: ${exportResponse.status} ${errText}`);
          }

          const rawExportData = await exportResponse.json() as Record<string, unknown>;
          console.log(JSON.stringify({ level: 'INFO', message: 'Export triggered raw response', jobId: job.jobId, rawExportData }));

          await updateJobStatus(job.jobId, { status: 'exporting' });

        } else if (editStatus === 'failed') {
          await updateJobStatus(job.jobId, {
            status: 'failed',
            error: 'ImagenAI editing failed',
          });
        }
        // else still in progress — wait for next poll

      } else if (job.status === 'exporting') {
        // Stage 2: Check if EXPORT is complete
        const statusResponse = await fetch(`${IMAGENAI_BASE_URL}/projects/${job.imagenProjectId}/export/status`, {
          headers: { 'x-api-key': IMAGENAI_API_KEY },
        });

        if (!statusResponse.ok) {
          console.error(JSON.stringify({ level: 'ERROR', message: 'Failed to check export status', jobId: job.jobId, httpStatus: statusResponse.status }));
          continue;
        }

        const rawStatusData = await statusResponse.json() as Record<string, unknown>;
        console.log(JSON.stringify({ level: 'INFO', message: 'Export status raw response', jobId: job.jobId, rawStatusData }));

        const nestedStatus = (rawStatusData.data || {}) as Record<string, unknown>;
        const exportStatus = ((nestedStatus.status || rawStatusData.status) as string)?.toLowerCase();

        if (exportStatus === 'completed') {
          // Export done — download rendered JPEGs
          await downloadAndStoreResults(job);
        } else if (exportStatus === 'failed') {
          await updateJobStatus(job.jobId, {
            status: 'failed',
            error: 'ImagenAI export failed',
          });
        }
        // else still exporting — wait for next poll
      }

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
