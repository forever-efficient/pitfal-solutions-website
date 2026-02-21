/**
 * Pitfal Solutions - Image Processor Lambda
 *
 * Triggered by S3 event notifications when images are uploaded to:
 *   staging/RAW/  - CR2/CR3 RAW files → LibRaw → TIFF → Sharp → staging/ready/
 *   staging/JPEG/ - JPEG/PNG files → Sharp (smart edits only) → staging/ready/
 *
 * Admin reviews staging/ready/ and assigns images to galleries.
 */

import { S3Event, Context } from 'aws-lambda';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { applyProfessionalEdits } from './editor';

const execFileAsync = promisify(execFile);

const s3Client = new S3Client({});

const MEDIA_BUCKET = process.env.MEDIA_BUCKET;
const STAGING_RAW_PREFIX = process.env.STAGING_RAW_PREFIX || 'staging/RAW/';
const STAGING_JPEG_PREFIX = process.env.STAGING_JPEG_PREFIX || 'staging/JPEG/';
const READY_PREFIX = process.env.READY_PREFIX || 'staging/ready/';
const JPEG_QUALITY = parseInt(process.env.JPEG_QUALITY || '93', 10);

if (!MEDIA_BUCKET) {
  throw new Error('MEDIA_BUCKET environment variable is required');
}

const RAW_EXTENSIONS = new Set(['.cr2', '.cr3', '.raw']);
const JPEG_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

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
 */
async function convertRawToTiff(rawFilePath: string, ctx: LogContext): Promise<string> {
  const tiffPath = rawFilePath.replace(/\.[^.]+$/, '.tiff');

  try {
    await execFileAsync('dcraw_emu', [
      '-T',      // TIFF output
      '-w',      // Camera white balance
      '-H', '0', // Clip highlights
      '-o', '1', // sRGB colorspace
      '-q', '3', // AHD demosaicing (highest quality)
      '-6',      // 16-bit output
      rawFilePath,
    ], {
      timeout: 120000,
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
 * Determine the input type from the S3 key.
 */
function getInputType(key: string, ext: string): 'RAW' | 'JPEG' | null {
  if (key.startsWith(STAGING_RAW_PREFIX) && RAW_EXTENSIONS.has(ext)) return 'RAW';
  if (key.startsWith(STAGING_JPEG_PREFIX) && (JPEG_EXTENSIONS.has(ext) || ext === '.png')) return 'JPEG';
  return null;
}

/**
 * Process a RAW image: LibRaw → TIFF → Sharp edits → staging/ready/
 */
async function processRawImage(
  bucket: string,
  key: string,
  ctx: LogContext
): Promise<string> {
  const fileName = basename(key);
  const nameWithoutExt = basename(fileName, extname(fileName));
  const outputFileName = `${nameWithoutExt}.jpg`;
  const readyKey = `${READY_PREFIX}${outputFileName}`;

  const tmpDir = `/tmp/${Date.now()}`;
  await mkdir(tmpDir, { recursive: true });
  const rawFilePath = join(tmpDir, fileName);

  try {
    // Download RAW file
    log('INFO', 'Downloading RAW file from S3', ctx);
    const getResult = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const rawBuffer = await streamToBuffer(getResult.Body as Readable);
    ctx.fileSize = rawBuffer.length;
    await writeFile(rawFilePath, rawBuffer);

    // Convert RAW → TIFF
    log('INFO', 'Converting RAW to TIFF', ctx);
    const tiffPath = await convertRawToTiff(rawFilePath, ctx);

    // Apply professional edits
    log('INFO', 'Applying professional edits', ctx);
    const tiffBuffer = await readFile(tiffPath);
    const editedBuffer = await applyProfessionalEdits(tiffBuffer, {
      quality: JPEG_QUALITY,
      format: 'jpeg',
    });

    // Upload to staging/ready/
    log('INFO', 'Uploading to staging/ready/', ctx, { readyKey });
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: readyKey,
      Body: editedBuffer,
      ContentType: 'image/jpeg',
      Metadata: {
        'source-file': fileName,
        'source-format': extname(fileName).replace('.', ''),
        'processed-at': new Date().toISOString(),
        'processor-version': '2.0.0',
        'edit-profile': 'magazine-professional',
      },
    }));

    // Delete source from staging/RAW/
    log('INFO', 'Removing source from staging/RAW/', ctx);
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

    return readyKey;
  } finally {
    await unlink(rawFilePath).catch(() => {});
    const tiffPath = rawFilePath.replace(/\.[^.]+$/, '.tiff');
    await unlink(tiffPath).catch(() => {});
  }
}

/**
 * Process a JPEG/PNG image: Sharp edits only → staging/ready/
 */
async function processJpegImage(
  bucket: string,
  key: string,
  ctx: LogContext
): Promise<string> {
  const fileName = basename(key);
  const nameWithoutExt = basename(fileName, extname(fileName));
  const outputFileName = `${nameWithoutExt}.jpg`;
  const readyKey = `${READY_PREFIX}${outputFileName}`;

  // Download JPEG
  log('INFO', 'Downloading JPEG file from S3', ctx);
  const getResult = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const inputBuffer = await streamToBuffer(getResult.Body as Readable);
  ctx.fileSize = inputBuffer.length;

  // Apply professional edits (Sharp handles JPEG/PNG input directly)
  log('INFO', 'Applying smart edits to JPEG', ctx);
  const editedBuffer = await applyProfessionalEdits(inputBuffer, {
    quality: JPEG_QUALITY,
    format: 'jpeg',
  });

  // Upload to staging/ready/
  log('INFO', 'Uploading to staging/ready/', ctx, { readyKey });
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: readyKey,
    Body: editedBuffer,
    ContentType: 'image/jpeg',
    Metadata: {
      'source-file': fileName,
      'source-format': extname(fileName).replace('.', '').toLowerCase(),
      'processed-at': new Date().toISOString(),
      'processor-version': '2.0.0',
      'edit-profile': 'magazine-professional',
    },
  }));

  // Delete source from staging/JPEG/
  log('INFO', 'Removing source from staging/JPEG/', ctx);
  await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

  return readyKey;
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

    const ext = extname(key).toLowerCase();
    const inputType = getInputType(key, ext);

    if (!inputType) {
      log('WARN', 'Skipping file: not in staging/RAW/ or staging/JPEG/', recordCtx, { extension: ext });
      results.push({ key, status: 'skipped' });
      continue;
    }

    try {
      let readyKey: string;
      if (inputType === 'RAW') {
        readyKey = await processRawImage(bucket, key, recordCtx);
      } else {
        readyKey = await processJpegImage(bucket, key, recordCtx);
      }
      log('INFO', 'Image processed successfully', recordCtx, { readyKey, inputType });
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

  const errors = results.filter(r => r.status === 'error');
  if (errors.length > 0) {
    throw new Error(
      `Failed to process ${errors.length} image(s): ${errors.map(e => `${e.key}: ${e.error}`).join('; ')}`
    );
  }
};
