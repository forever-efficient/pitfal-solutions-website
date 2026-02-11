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
import { generatePresignedDownloadUrl } from '../shared/s3';

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

interface GalleryRecord {
  id: string;
  title: string;
  description?: string;
  images: Array<{ key: string; alt?: string }>;
  category: string;
  type: string;
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
      category: gallery.category,
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

async function handleDownload(
  event: APIGatewayProxyEvent,
  galleryId: string,
  ctx: LogContext,
  requestOrigin?: string
) {
  let body: { imageKey?: string };
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

  const downloadUrl = await generatePresignedDownloadUrl(MEDIA_BUCKET!, body.imageKey, 3600);

  log('INFO', 'Download URL generated', ctx, { imageKey: body.imageKey });

  return success({ downloadUrl }, 200, requestOrigin);
}
