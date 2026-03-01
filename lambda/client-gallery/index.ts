import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { randomUUID, createHmac, timingSafeEqual } from 'crypto';
import { getItem, putItem, queryItems, incrementCounter } from '../shared/db';
import {
  success,
  error,
  unauthorized,
  methodNotAllowed,
  badRequest,
  notFound,
  corsResponse,
} from '../shared/response';
import { parseAuthToken } from '../shared/session';
import { generatePresignedDownloadUrl, objectExists, getObjectSize } from '../shared/s3';
import { shuffleArray } from '../shared/array';

const GALLERIES_TABLE = process.env.GALLERIES_TABLE;
const ADMIN_TABLE = process.env.ADMIN_TABLE;
const MEDIA_BUCKET = process.env.MEDIA_BUCKET;
const GALLERY_TOKEN_SECRET = process.env.GALLERY_TOKEN_SECRET;
const COOKIE_NAME = 'pitfal_client_session';

if (!GALLERIES_TABLE || !ADMIN_TABLE || !MEDIA_BUCKET || !GALLERY_TOKEN_SECRET) {
  throw new Error(
    `Missing required environment variables: ${[
      !GALLERIES_TABLE && 'GALLERIES_TABLE',
      !ADMIN_TABLE && 'ADMIN_TABLE',
      !MEDIA_BUCKET && 'MEDIA_BUCKET',
      !GALLERY_TOKEN_SECRET && 'GALLERY_TOKEN_SECRET',
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

/** Resolve processed thumbnail path to match thumbnail-generator Lambda output (replaces gallery/ with processed/) */
function getProcessedKey(key: string, width: number): string {
  const baseName = key.replace(/\.[^/.]+$/, '');
  const processedPath = baseName.startsWith('gallery/')
    ? baseName.replace(/^gallery\//, 'processed/')
    : `processed/${baseName}`;
  return `${processedPath}/${width}w.webp`;
}

function getRequestContext(event: APIGatewayProxyEvent): LogContext {
  return {
    requestId: event.requestContext?.requestId || randomUUID(),
    sourceIp: event.requestContext?.identity?.sourceIp,
  };
}

interface GalleryTokenPayload {
  galleryId: string;
  galleryTitle: string;
  exp: number;
  noPassword?: boolean;
}

function verifyGalleryToken(token: string): GalleryTokenPayload | null {
  try {
    const dot = token.lastIndexOf('.');
    if (dot === -1) return null;
    const payload = token.substring(0, dot);
    const sig = token.substring(dot + 1);
    const expectedSig = createHmac('sha256', GALLERY_TOKEN_SECRET!).update(payload).digest('base64url');
    const sigBuf = Buffer.from(sig, 'base64url');
    const expectedBuf = Buffer.from(expectedSig, 'base64url');
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as GalleryTokenPayload;
    if (!data.galleryId || !data.exp) return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

// Authenticate request — verifies HMAC-signed gallery token (no DynamoDB lookup)
function authenticateRequest(event: APIGatewayProxyEvent, galleryId: string): boolean {
  const tokenValue = parseAuthToken(event.headers, COOKIE_NAME);
  if (!tokenValue) return false;
  const payload = verifyGalleryToken(tokenValue);
  return payload !== null && payload.galleryId === galleryId;
}

interface GallerySection {
  id: string;
  title: string;
  description?: string;
  images: string[];
}

type ClientSortBy = 'name' | 'date' | 'size' | 'random';
type ClientSortOrder = 'asc' | 'desc';

interface ClientSort {
  by: ClientSortBy;
  order?: ClientSortOrder;
}

interface GalleryRecord {
  id: string;
  title: string;
  description?: string;
  images: Array<{ key: string; alt?: string }>;
  heroImage?: string;
  sections?: GallerySection[];
  clientSort?: ClientSort;
  category: string;
  heroFocalPoint?: { x: number; y: number };
  heroZoom?: number;
  heroGradientOpacity?: number;
  heroHeight?: 'sm' | 'md' | 'lg';
  kanbanCards?: Array<{ id: string; title: string; status: string; order: number; createdAt: string }>;
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
  const authenticated = authenticateRequest(event, galleryId);
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

function getFilename(key: string): string {
  return key.split('/').pop() || key;
}

async function applyClientSort(
  images: Array<{ key: string; alt?: string }>,
  sort: ClientSort,
  bucket: string
): Promise<Array<{ key: string; alt?: string }>> {
  if (!images.length) return images;

  const keyToIndex = new Map<string, number>();
  images.forEach((img, i) => keyToIndex.set(img.key, i));

  if (sort.by === 'random') {
    return shuffleArray(images);
  }

  const order = sort.order ?? 'asc';
  const mult = order === 'asc' ? 1 : -1;

  if (sort.by === 'name') {
    return [...images].sort((a, b) => {
      const na = getFilename(a.key).toLowerCase();
      const nb = getFilename(b.key).toLowerCase();
      return mult * na.localeCompare(nb);
    });
  }

  if (sort.by === 'date') {
    return [...images].sort((a, b) => {
      const ia = keyToIndex.get(a.key) ?? 0;
      const ib = keyToIndex.get(b.key) ?? 0;
      return mult * (ia - ib);
    });
  }

  if (sort.by === 'size') {
    const sizes = await Promise.all(
      images.map(async (img) => ({ img, size: await getObjectSize(bucket, img.key) }))
    );
    return sizes
      .sort((a, b) => mult * (a.size - b.size))
      .map(({ img }) => img);
  }

  return images;
}

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

  let images = gallery.images || [];
  let sections = gallery.sections || [];

  if (gallery.clientSort && images.length > 0 && MEDIA_BUCKET) {
    const keyToImg = new Map(images.map((img) => [img.key, img]));

    if (sections.length > 0) {
      const assignedKeys = new Set(sections.flatMap((s) => s.images));
      const sortedSections: GallerySection[] = [];
      const sortedImages: Array<{ key: string; alt?: string }> = [];

      for (const section of sections) {
        const sectionImgs = section.images
          .map((k) => keyToImg.get(k))
          .filter((x): x is { key: string; alt?: string } => x !== undefined);
        const sorted = await applyClientSort(sectionImgs, gallery.clientSort, MEDIA_BUCKET);
        sortedSections.push({ ...section, images: sorted.map((i) => i.key) });
        sortedImages.push(...sorted);
      }

      const unassigned = images.filter((img) => !assignedKeys.has(img.key));
      const sortedUnassigned = await applyClientSort(unassigned, gallery.clientSort, MEDIA_BUCKET);
      sortedImages.push(...sortedUnassigned);

      sections = sortedSections;
      images = sortedImages;
    } else {
      images = await applyClientSort(images, gallery.clientSort, MEDIA_BUCKET);
    }
  }

  log('INFO', 'Gallery fetched', ctx, { imageCount: images.length, commentCount: comments.length });

  // Fire-and-forget view tracking
  incrementCounter(GALLERIES_TABLE!, { id: galleryId }, 'viewCount').catch(() => {});

  const kanbanCards = gallery.kanbanCards as Array<{ status: string }> | undefined;
  return success({
    gallery: {
      id: gallery.id,
      title: gallery.title,
      description: gallery.description,
      images,
      heroImage: gallery.heroImage || null,
      sections,
      category: gallery.category,
      heroFocalPoint: gallery.heroFocalPoint,
      heroZoom: gallery.heroZoom,
      heroGradientOpacity: gallery.heroGradientOpacity,
      heroHeight: gallery.heroHeight,
      kanbanCounts: kanbanCards?.length ? {
        todo: kanbanCards.filter(c => c.status === 'todo').length,
        inProgress: kanbanCards.filter(c => c.status === 'in_progress').length,
        done: kanbanCards.filter(c => c.status === 'done').length,
      } : undefined,
    },
    comments: comments.map((c) => ({
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

  const gallery = await getItem<GalleryRecord>({
    TableName: GALLERIES_TABLE,
    Key: { id: galleryId },
  });

  if (!gallery) {
    return notFound('Gallery not found', requestOrigin);
  }

  const imageExists = gallery.images?.some(img => img.key === body.imageKey);
  if (!imageExists) {
    return badRequest('Image not found in gallery', requestOrigin);
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
        const webKey = getProcessedKey(key, 1920);
        const cached = await objectExists(MEDIA_BUCKET!, webKey);

        if (cached) {
          downloadKey = webKey;
        } else {
          log('WARN', 'Web-sized version missing in cache, falling back to original', ctx, { key, webKey });
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

  // Fire-and-forget download tracking (count per image, not per request)
  incrementCounter(GALLERIES_TABLE!, { id: galleryId }, 'downloadCount', downloads.length).catch(() => {});

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
    const webKey = getProcessedKey(body.imageKey, 1920);
    const cached = await objectExists(MEDIA_BUCKET!, webKey);

    if (cached) {
      log('INFO', 'Web-sized version found in cache', ctx, { webKey });
      downloadKey = webKey;
    } else {
      log('WARN', 'Web-sized version missing in cache, falling back to original', ctx, { imageKey: body.imageKey, webKey });
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

  // Fire-and-forget download tracking
  incrementCounter(GALLERIES_TABLE!, { id: galleryId }, 'downloadCount').catch(() => {});

  return success({ downloadUrl }, 200, requestOrigin);
}



