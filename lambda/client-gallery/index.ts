import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { getItem, putItem, queryItems } from '../shared/db';
import {
  success,
  error,
  unauthorized,
  methodNotAllowed,
  badRequest,
  notFound,
  corsResponse,
  ErrorCode,
} from '../shared/response';
import { validateSession, parseAuthToken, decodeToken } from '../shared/session';
import { generatePresignedDownloadUrl, objectExists } from '../shared/s3';

const GALLERIES_TABLE = process.env.GALLERIES_TABLE;
const ADMIN_TABLE = process.env.ADMIN_TABLE;
const MEDIA_BUCKET = process.env.MEDIA_BUCKET;
const COOKIE_NAME = 'pitfal_client_session';

if (!GALLERIES_TABLE || !ADMIN_TABLE || !MEDIA_BUCKET) {
  throw new Error(
    `Missing required environment variables: ${[
      !GALLERIES_TABLE && 'GALLERIES_TABLE',
      !ADMIN_TABLE && 'ADMIN_TABLE',
      !MEDIA_BUCKET && 'MEDIA_BUCKET',
    ].filter(Boolean).join(', ')}`
  );
}

interface LogContext {
  requestId: string;
  sourceIp?: string;
  galleryId?: string;
}

function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, context: LogContext, data?: Record<string, unknown>): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...context, ...(data && { data }) }));
}

function getRequestContext(event: APIGatewayProxyEvent): LogContext {
  return {
    requestId: event.requestContext?.requestId || randomUUID(),
    sourceIp: event.requestContext?.identity?.sourceIp,
  };
}

// Authenticate request using Authorization header or session cookie
async function authenticateRequest(event: APIGatewayProxyEvent, galleryId: string): Promise<boolean> {
  const tokenValue = parseAuthToken(event.headers, COOKIE_NAME);
  if (!tokenValue) return false;

  const decoded = decodeToken(tokenValue);
  if (!decoded || decoded.id !== galleryId) return false;

  const session = await validateSession(ADMIN_TABLE!, 'GALLERY_SESSION', galleryId, decoded.token);
  return session !== null;
}

interface GallerySection {
  id: string;
  title: string;
  description?: string;
  images: string[];
}

interface GalleryRecord {
  id: string;
  title: string;
  description?: string;
  images: Array<{ key: string; alt?: string }>;
  heroImage?: string;
  sections?: GallerySection[];
  category: string;
  type: string;
  heroFocalPoint?: { x: number; y: number };
  heroZoom?: number;
  heroGradientOpacity?: number;
  heroHeight?: 'sm' | 'md' | 'lg';
}

interface Comment {
  pk: string;
  sk: string;
  commentId: string;
  imageKey: string;
  author: string;
  text: string;
  createdAt: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const ctx = getRequestContext(event);
  const requestOrigin = event.headers['origin'] || event.headers['Origin'];

  if (event.httpMethod === 'OPTIONS') {
    return corsResponse(requestOrigin);
  }

  // Extract galleryId from path: /api/client/{galleryId}[/comment|/download]
  const pathParts = (event.pathParameters?.proxy || event.path || '').split('/').filter(Boolean);
  // Path format: api/client/{galleryId} or api/client/{galleryId}/comment or api/client/{galleryId}/download
  let galleryId: string | undefined;
  let action: string | undefined;

  // Handle path parameter from API Gateway
  galleryId = event.pathParameters?.galleryId;
  // Check if there's a sub-resource
  const resourcePath = event.resource || '';
  if (resourcePath.includes('/comment')) action = 'comment';
  else if (resourcePath.includes('/bulk-download')) action = 'bulk-download';
  else if (resourcePath.includes('/download')) action = 'download';

  if (!galleryId) {
    return badRequest('Gallery ID is required', requestOrigin);
  }

  ctx.galleryId = galleryId;

  // Authenticate
  const authenticated = await authenticateRequest(event, galleryId);
  if (!authenticated) {
    log('WARN', 'Unauthorized gallery access attempt', ctx);
    return unauthorized('Authentication required', requestOrigin);
  }

  log('INFO', 'Client gallery request', ctx, { method: event.httpMethod, action: action || 'gallery' });

  if (action === 'comment' && event.httpMethod === 'POST') {
    return handleAddComment(event, galleryId, ctx, requestOrigin);
  }

  if (action === 'bulk-download' && event.httpMethod === 'POST') {
    return handleBulkDownload(event, galleryId, ctx, requestOrigin);
  }

  if (action === 'download' && event.httpMethod === 'POST') {
    return handleDownload(event, galleryId, ctx, requestOrigin);
  }

  if (!action && event.httpMethod === 'GET') {
    return handleGetGallery(galleryId, ctx, requestOrigin);
  }

  return methodNotAllowed(undefined, requestOrigin);
};

async function handleGetGallery(galleryId: string, ctx: LogContext, requestOrigin?: string) {
  const gallery = await getItem<GalleryRecord>({
    TableName: GALLERIES_TABLE,
    Key: { id: galleryId },
  });

  if (!gallery) {
    return notFound('Gallery not found', requestOrigin);
  }

  // Fetch comments for this gallery
  const comments = await queryItems<Comment>({
    TableName: ADMIN_TABLE,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: {
      ':pk': `GALLERY_COMMENT#${galleryId}`,
    },
    ScanIndexForward: true,
  });

  log('INFO', 'Gallery fetched', ctx, { imageCount: gallery.images?.length || 0, commentCount: comments.length });

  return success({
    gallery: {
      id: gallery.id,
      title: gallery.title,
      description: gallery.description,
      images: gallery.images,
      heroImage: gallery.heroImage || null,
      sections: gallery.sections || [],
      category: gallery.category,
      heroFocalPoint: gallery.heroFocalPoint,
      heroZoom: gallery.heroZoom,
      heroGradientOpacity: gallery.heroGradientOpacity,
      heroHeight: gallery.heroHeight,
    },
    comments: comments.map(c => ({
      id: c.commentId,
      imageKey: c.imageKey,
      author: c.author,
      text: c.text,
      createdAt: c.createdAt,
    })),
  }, 200, requestOrigin);
}

async function handleAddComment(
  event: APIGatewayProxyEvent,
  galleryId: string,
  ctx: LogContext,
  requestOrigin?: string
) {
  let body: { imageKey?: string; author?: string; text?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequest('Invalid JSON', requestOrigin);
  }

  if (!body.imageKey || !body.author || !body.text) {
    return badRequest('imageKey, author, and text are required', requestOrigin);
  }

  if (body.text.length > 1000) {
    return badRequest('Comment must be less than 1000 characters', requestOrigin);
  }

  if (body.author.length > 100) {
    return badRequest('Author name must be less than 100 characters', requestOrigin);
  }

  const commentId = randomUUID();
  const timestamp = new Date().toISOString();

  await putItem({
    TableName: ADMIN_TABLE,
    Item: {
      pk: `GALLERY_COMMENT#${galleryId}`,
      sk: `${timestamp}#${commentId}`,
      commentId,
      imageKey: body.imageKey,
      author: body.author.trim(),
      text: body.text.trim(),
      createdAt: timestamp,
      galleryId,
    },
  });

  log('INFO', 'Comment added', ctx, { commentId });

  return success({
    comment: {
      id: commentId,
      imageKey: body.imageKey,
      author: body.author.trim(),
      text: body.text.trim(),
      createdAt: timestamp,
    },
  }, 201, requestOrigin);
}

async function handleBulkDownload(
  event: APIGatewayProxyEvent,
  galleryId: string,
  ctx: LogContext,
  requestOrigin?: string
) {
  let body: { imageKeys?: string[]; size?: 'full' | 'web' };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequest('Invalid JSON', requestOrigin);
  }

  const gallery = await getItem<GalleryRecord>({
    TableName: GALLERIES_TABLE,
    Key: { id: galleryId },
  });

  if (!gallery) return notFound('Gallery not found', requestOrigin);

  const galleryImageKeys = new Set(gallery.images?.map(img => img.key) || []);
  let requestedKeys: string[];

  if (body.imageKeys && Array.isArray(body.imageKeys) && body.imageKeys.length > 0) {
    const invalidKeys = body.imageKeys.filter(key => !galleryImageKeys.has(key));
    if (invalidKeys.length > 0) {
      return badRequest('Some image keys do not belong to this gallery', requestOrigin);
    }
    requestedKeys = body.imageKeys;
  } else {
    requestedKeys = Array.from(galleryImageKeys);
  }

  if (requestedKeys.length === 0) {
    return badRequest('No images to download', requestOrigin);
  }

  const MAX_BULK_DOWNLOAD = 100;
  if (requestedKeys.length > MAX_BULK_DOWNLOAD) {
    return badRequest(`Maximum ${MAX_BULK_DOWNLOAD} images per bulk download request`, requestOrigin);
  }

  const size = body.size === 'web' ? 'web' : 'full';

  const downloads = await Promise.all(
    requestedKeys.map(async (key) => {
      let downloadKey = key;
      const originalFilename = key.split('/').pop() || 'photo';
      let downloadFilename = originalFilename;

      if (size === 'web') {
        const baseName = key.replace(/\.[^/.]+$/, '');
        const webKey = `processed/${baseName}/1920w.webp`;
        const cached = await objectExists(MEDIA_BUCKET!, webKey);
        if (cached) {
          downloadKey = webKey;
        } else {
          try {
            downloadKey = await generateWebVersion(key, webKey, ctx);
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            log('ERROR', 'Failed to generate web-sized version in bulk', ctx, { key, error: msg });
            throw err;
          }
        }
        const webFilename = originalFilename.replace(/\.[^/.]+$/, '.webp');
        downloadFilename = `web_${webFilename}`;
      }

      const downloadUrl = await generatePresignedDownloadUrl(
        MEDIA_BUCKET!,
        downloadKey,
        3600,
        downloadFilename
      );
      return { key, downloadUrl };
    })
  );

  log('INFO', 'Bulk download URLs generated', ctx, { galleryId, count: downloads.length, size });
  return success({ downloads }, 200, requestOrigin);
}

async function handleDownload(
  event: APIGatewayProxyEvent,
  galleryId: string,
  ctx: LogContext,
  requestOrigin?: string
) {
  let body: { imageKey?: string; size?: 'full' | 'web' };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequest('Invalid JSON', requestOrigin);
  }

  if (!body.imageKey) {
    return badRequest('imageKey is required', requestOrigin);
  }

  // Verify the image belongs to this gallery
  const gallery = await getItem<GalleryRecord>({
    TableName: GALLERIES_TABLE,
    Key: { id: galleryId },
  });

  if (!gallery) {
    return notFound('Gallery not found', requestOrigin);
  }

  const imageExists = gallery.images?.some(img => img.key === body.imageKey);
  if (!imageExists) {
    return notFound('Image not found in gallery', requestOrigin);
  }

  const size = body.size || 'full';
  let downloadKey = body.imageKey;
  const originalFilename = body.imageKey.split('/').pop() || 'photo';

  if (size === 'web') {
    // Web-sized: check cache first, generate on-demand if needed
    const baseName = body.imageKey.replace(/\.[^/.]+$/, '');
    const webKey = `processed/${baseName}/1920w.webp`;
    const cached = await objectExists(MEDIA_BUCKET!, webKey);

    if (cached) {
      log('INFO', 'Web-sized version found in cache', ctx, { webKey });
      downloadKey = webKey;
    } else {
      // Generate web-sized version on-demand
      log('INFO', 'Generating web-sized version on-demand', ctx, { webKey });
      try {
        downloadKey = await generateWebVersion(body.imageKey, webKey, ctx);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        log('ERROR', 'Failed to generate web-sized version', ctx, { error: msg });
        return error('Failed to generate web-sized image', 500, { requestOrigin });
      }
    }
  }

  const filenamePrefix = size === 'web' ? 'web_' : '';
  const webFilename = originalFilename.replace(/\.[^/.]+$/, '.webp');
  const downloadFilename = size === 'web'
    ? filenamePrefix + webFilename
    : originalFilename;

  const downloadUrl = await generatePresignedDownloadUrl(
    MEDIA_BUCKET!,
    downloadKey,
    3600,
    downloadFilename
  );

  log('INFO', 'Download URL generated', ctx, { imageKey: body.imageKey, size });

  return success({ downloadUrl }, 200, requestOrigin);
}

/**
 * Fetch the original image from S3, resize to 1920px wide using sharp,
 * upload the result to S3 for caching, and return the S3 key.
 */
async function generateWebVersion(
  originalKey: string,
  webKey: string,
  ctx: LogContext
): Promise<string> {
  const { S3Client: S3, GetObjectCommand: GetCmd, PutObjectCommand: PutCmd } = await import('@aws-sdk/client-s3');
  const sharp = (await import('sharp')).default;
  const s3 = new S3({});

  // Fetch original
  log('INFO', 'Fetching original image for resize', ctx, { originalKey });
  const getResult = await s3.send(new GetCmd({
    Bucket: MEDIA_BUCKET!,
    Key: originalKey,
  }));

  const chunks: Buffer[] = [];
  const stream = getResult.Body as NodeJS.ReadableStream;
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as unknown as ArrayBuffer));
  }
  const originalBuffer = Buffer.concat(chunks);
  log('INFO', `Original image fetched (${(originalBuffer.length / 1024 / 1024).toFixed(1)}MB)`, ctx);

  // Resize to 1920px wide, maintaining aspect ratio
  const resizedBuffer = await sharp(originalBuffer)
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  log('INFO', `Resized to web version (${(resizedBuffer.length / 1024).toFixed(0)}KB)`, ctx);

  // Upload to S3 for caching
  await s3.send(new PutCmd({
    Bucket: MEDIA_BUCKET!,
    Key: webKey,
    Body: resizedBuffer,
    ContentType: 'image/webp',
    Metadata: {
      'source-key': originalKey,
      'generated-at': new Date().toISOString(),
      'resize-width': '1920',
    },
  }));

  log('INFO', 'Web-sized version cached to S3', ctx, { webKey });
  return webKey;
}

