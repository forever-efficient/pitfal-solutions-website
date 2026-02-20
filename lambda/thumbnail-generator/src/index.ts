import { S3Event, Context } from 'aws-lambda';
import {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
// Using generic require because sharp is provided via Lambda Layer at runtime
const sharp = require('sharp');

const s3Client = new S3Client({});

const MEDIA_BUCKET = process.env.MEDIA_BUCKET;
const GALLERY_PREFIX = 'gallery/';
const PROCESSED_PREFIX = 'processed/';

if (!MEDIA_BUCKET) {
    throw new Error('MEDIA_BUCKET environment variable is required');
}

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tiff']);

interface LogContext {
    requestId: string;
    bucket?: string;
    key?: string;
    eventName?: string;
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
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

// Map corresponding to the frontend sizes
const SIZES = [
    { name: 'sm', width: 600 },
    { name: 'md', width: 900 },
    { name: 'lg', width: 1200 },
    { name: 'xl', width: 1920 }
];

async function handleObjectCreated(bucket: string, key: string, ctx: LogContext): Promise<void> {
    log('INFO', 'Processing ObjectCreated event', ctx);

    // Download the original image
    const getRes = await s3Client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    }));

    const originalBuffer = await streamToBuffer(getRes.Body as Readable);
    const baseName = key.replace(/\.[^/.]+$/, '');
    const processedBasePath = baseName.replace(GALLERY_PREFIX, PROCESSED_PREFIX);

    log('INFO', `Downloaded original (${(originalBuffer.length / 1024 / 1024).toFixed(2)} MB)`, ctx);

    // Generate all sizes in parallel using the sharp layer
    await Promise.all(SIZES.map(async (size) => {
        const thumbKey = `${processedBasePath}/${size.width}w.webp`;

        try {
            const resizedBuffer = await sharp(originalBuffer)
                .resize({ width: size.width, withoutEnlargement: true })
                .webp({ quality: 80 }) // 80 quality strikes best balance for WebP
                .toBuffer();

            await s3Client.send(new PutObjectCommand({
                Bucket: bucket,
                Key: thumbKey,
                Body: resizedBuffer,
                ContentType: 'image/webp',
                CacheControl: 'public, max-age=31536000, immutable',
                Metadata: {
                    'source-key': key,
                    'generated-at': new Date().toISOString(),
                    'resize-width': size.width.toString(),
                },
            }));

            log('INFO', `Generated and uploaded ${size.width}w thumbnail`, ctx, { thumbKey });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            log('ERROR', `Failed to generate ${size.width}w thumbnail`, ctx, { thumbKey, error: msg });
            throw err;
        }
    }));
}

async function handleObjectRemoved(bucket: string, key: string, ctx: LogContext): Promise<void> {
    log('INFO', 'Processing ObjectRemoved event', ctx);

    const baseName = key.replace(/\.[^/.]+$/, '');
    const processedBasePath = baseName.replace(GALLERY_PREFIX, PROCESSED_PREFIX);

    // Delete all expected sizes in parallel
    await Promise.all(SIZES.map(async (size) => {
        const thumbKey = `${processedBasePath}/${size.width}w.webp`;

        try {
            await s3Client.send(new DeleteObjectCommand({
                Bucket: bucket,
                Key: thumbKey,
            }));
            log('INFO', `Deleted thumbnail`, ctx, { thumbKey });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            log('ERROR', `Failed to delete thumbnail`, ctx, { thumbKey, error: msg });
            // Don't throw here, try to delete the others even if one fails
        }
    }));
}

export const handler = async (event: S3Event, context: Context): Promise<void> => {
    const ctx: LogContext = { requestId: context.awsRequestId };

    log('INFO', 'Thumbnail generator invoked', ctx, {
        recordCount: event.Records.length,
    });

    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
        const eventName = record.eventName;

        const recordCtx: LogContext = { ...ctx, bucket, key, eventName };

        log('INFO', 'Processing record', recordCtx, { rawRecord: record });

        // Safety checks - case insensitive and includes
        if (!key.toLowerCase().includes(GALLERY_PREFIX.toLowerCase())) {
            log('WARN', 'Skipping key outside gallery prefix', recordCtx);
            continue;
        }

        const extMatch = key.match(/\.[^/.]+$/);
        const ext = extMatch ? extMatch[0].toLowerCase() : '';

        if (!SUPPORTED_EXTENSIONS.has(ext)) {
            log('WARN', 'Skipping unsupported file extension', recordCtx, { extension: ext });
            continue;
        }

        try {
            if (eventName.toLowerCase().includes('objectcreated')) {
                await handleObjectCreated(bucket, key, recordCtx);
            } else if (eventName.toLowerCase().includes('objectremoved')) {
                await handleObjectRemoved(bucket, key, recordCtx);
            } else {
                log('WARN', 'Skipping unknown event type', recordCtx);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            log('ERROR', 'Failed processing record', recordCtx, { error: msg });
            throw err; // Fail the Lambda so it can retry or go to DLQ
        }
    }
};
