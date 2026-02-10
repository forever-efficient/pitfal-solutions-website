/**
 * Pitfal Solutions - Image Processor Lambda
 *
 * Triggered by S3 event notifications when RAW images (CR2/CR3) are
 * uploaded to the staging/ prefix in the media bucket.
 *
 * Pipeline:
 * 1. Download RAW file from S3 staging/
 * 2. Convert RAW → TIFF using LibRaw (dcraw_emu)
 * 3. Apply professional magazine-quality edits via Sharp
 * 4. Output high-quality JPEG
 * 5. Copy original RAW + edited JPEG to finished/
 * 6. Delete from staging/
 */

import { S3Event, Context } from 'aws-lambda';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { join, basename, extname, dirname } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { applyProfessionalEdits } from './editor';

const execFileAsync = promisify(execFile);

const s3Client = new S3Client({});

const MEDIA_BUCKET = process.env.MEDIA_BUCKET;
const STAGING_PREFIX = process.env.STAGING_PREFIX || 'staging/';
const FINISHED_PREFIX = process.env.FINISHED_PREFIX || 'finished/';
const JPEG_QUALITY = parseInt(process.env.JPEG_QUALITY || '93', 10);
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || '';

if (!MEDIA_BUCKET) {
  throw new Error('MEDIA_BUCKET environment variable is required');
}

// Supported RAW formats
const RAW_EXTENSIONS = new Set(['.cr2', '.cr3']);

interface LogContext {
  requestId: string;
  bucket?: string;
  key?: string;
  fileSize?: number;
}

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

function log(level: LogLevel, message: string, ctx: LogContext, data?: Record<string, unknown>): void {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...ctx,
    ...(data && { data }),
  }));
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Convert a RAW file (CR2/CR3) to TIFF using LibRaw's dcraw_emu.
 * Returns the path to the converted TIFF file.
 */
async function convertRawToTiff(rawFilePath: string, ctx: LogContext): Promise<string> {
  const tiffPath = rawFilePath.replace(/\.[^.]+$/, '.tiff');

  try {
    // dcraw_emu options:
    // -T    Output TIFF instead of PPM
    // -w    Use camera white balance
    // -H 0  Clip highlights (no recovery, prevents blown look)
    // -o 1  Output in sRGB colorspace
    // -q 3  AHD interpolation (highest quality demosaicing)
    // -6    Write 16-bit output for maximum editing headroom
    await execFileAsync('dcraw_emu', [
      '-T',      // TIFF output
      '-w',      // Camera white balance
      '-H', '0', // Clip highlights
      '-o', '1', // sRGB colorspace
      '-q', '3', // AHD demosaicing (highest quality)
      '-6',      // 16-bit output
      rawFilePath,
    ], {
      timeout: 120000, // 2 min timeout for large RAW files
      env: {
        ...process.env,
        LD_LIBRARY_PATH: '/opt/libraw/lib:' + (process.env.LD_LIBRARY_PATH || ''),
      },
    });

    log('INFO', 'RAW conversion completed', ctx, { tiffPath });
    return tiffPath;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown conversion error';
    log('ERROR', 'RAW conversion failed', ctx, { error: message });
    throw new Error(`RAW conversion failed: ${message}`);
  }
}

/**
 * Process a single RAW image file.
 */
async function processImage(
  bucket: string,
  key: string,
  ctx: LogContext
): Promise<{ editedKey: string; originalKey: string }> {
  const fileName = basename(key);
  const ext = extname(fileName).toLowerCase();
  const nameWithoutExt = basename(fileName, extname(fileName));

  // Derive the relative path within staging/ to preserve folder structure
  const relativePath = key.startsWith(STAGING_PREFIX)
    ? key.slice(STAGING_PREFIX.length)
    : key;
  const relativeDir = dirname(relativePath);
  const finishedDir = relativeDir === '.'
    ? FINISHED_PREFIX
    : `${FINISHED_PREFIX}${relativeDir}/`;

  const tmpDir = `/tmp/${Date.now()}`;
  await mkdir(tmpDir, { recursive: true });

  const rawFilePath = join(tmpDir, fileName);
  const editedFileName = `${nameWithoutExt}.jpg`;

  try {
    // Step 1: Download RAW file from S3
    log('INFO', 'Downloading RAW file from S3', ctx);
    const getResult = await s3Client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }));

    const rawBuffer = await streamToBuffer(getResult.Body as Readable);
    ctx.fileSize = rawBuffer.length;
    log('INFO', `Downloaded RAW file (${(rawBuffer.length / 1024 / 1024).toFixed(1)}MB)`, ctx);

    await writeFile(rawFilePath, rawBuffer);

    // Step 2: Convert RAW → TIFF using LibRaw
    log('INFO', 'Converting RAW to TIFF', ctx, { format: ext });
    const tiffPath = await convertRawToTiff(rawFilePath, ctx);

    // Step 3: Read TIFF and apply professional edits
    log('INFO', 'Applying professional edits', ctx);
    const tiffBuffer = await readFile(tiffPath);
    const editedBuffer = await applyProfessionalEdits(tiffBuffer, {
      quality: JPEG_QUALITY,
      format: 'jpeg',
    });

    log('INFO', `Edit complete (${(editedBuffer.length / 1024).toFixed(0)}KB JPEG)`, ctx);

    // Step 4: Upload edited JPEG to finished/
    const editedKey = `${finishedDir}${editedFileName}`;
    log('INFO', 'Uploading edited JPEG to finished/', ctx, { editedKey });

    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: editedKey,
      Body: editedBuffer,
      ContentType: 'image/jpeg',
      Metadata: {
        'source-file': fileName,
        'source-format': ext.replace('.', ''),
        'processed-at': new Date().toISOString(),
        'processor-version': '1.0.0',
        'edit-profile': 'magazine-professional',
      },
    }));

    // Step 5: Copy original RAW to finished/
    const originalKey = `${finishedDir}${fileName}`;
    log('INFO', 'Copying original RAW to finished/', ctx, { originalKey });

    await s3Client.send(new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${key}`,
      Key: originalKey,
      Metadata: {
        'original-staging-key': key,
        'processed-at': new Date().toISOString(),
      },
      MetadataDirective: 'REPLACE',
    }));

    // Step 6: Delete from staging
    log('INFO', 'Removing file from staging/', ctx);
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }));

    return { editedKey, originalKey };
  } finally {
    // Cleanup temp files
    try {
      await unlink(rawFilePath).catch(() => {});
      const tiffPath = rawFilePath.replace(/\.[^.]+$/, '.tiff');
      await unlink(tiffPath).catch(() => {});
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Lambda handler - triggered by S3 event notification.
 */
export const handler = async (event: S3Event, context: Context): Promise<void> => {
  const ctx: LogContext = { requestId: context.awsRequestId };

  log('INFO', 'Image processor invoked', ctx, {
    recordCount: event.Records.length,
  });

  const results: Array<{ key: string; status: 'success' | 'skipped' | 'error'; error?: string }> = [];

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    const size = record.s3.object.size;

    const recordCtx: LogContext = { ...ctx, bucket, key, fileSize: size };

    // Validate file extension
    const ext = extname(key).toLowerCase();
    if (!RAW_EXTENSIONS.has(ext)) {
      log('WARN', 'Skipping non-RAW file', recordCtx, { extension: ext });
      results.push({ key, status: 'skipped' });
      continue;
    }

    // Validate file is in staging prefix
    if (!key.startsWith(STAGING_PREFIX)) {
      log('WARN', 'Skipping file outside staging prefix', recordCtx);
      results.push({ key, status: 'skipped' });
      continue;
    }

    try {
      const { editedKey, originalKey } = await processImage(bucket, key, recordCtx);
      log('INFO', 'Image processed successfully', recordCtx, { editedKey, originalKey });
      results.push({ key, status: 'success' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      log('ERROR', 'Failed to process image', recordCtx, { error: errorMessage });
      results.push({ key, status: 'error', error: errorMessage });
    }
  }

  const summary = {
    total: results.length,
    success: results.filter(r => r.status === 'success').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    errors: results.filter(r => r.status === 'error').length,
  };

  log('INFO', 'Image processor completed', ctx, { summary });

  // Throw if any errors occurred (sends to DLQ for retry)
  const errors = results.filter(r => r.status === 'error');
  if (errors.length > 0) {
    throw new Error(
      `Failed to process ${errors.length} image(s): ${errors.map(e => `${e.key}: ${e.error}`).join('; ')}`
    );
  }
};
