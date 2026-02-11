import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { getItem, putItem, updateItem, deleteItem, queryItems, scanItems, buildUpdateExpression } from '../shared/db';
import {
  success,
  error,
  unauthorized,
  methodNotAllowed,
  badRequest,
  notFound,
  corsResponse,
  withCookie,
  clearCookie,
  serverError,
  tooManyRequests,
  ErrorCode,
} from '../shared/response';
import {
  createSession,
  validateSession,
  deleteSession,
  parseAuthToken,
  checkLoginAttempts,
  recordFailedAttempt,
  clearLoginAttempts,
  encodeToken,
  decodeToken,
} from '../shared/session';
import { generatePresignedUploadUrl, generatePresignedDownloadUrl, deleteS3Objects } from '../shared/s3';

// Environment variables
const ADMIN_TABLE = process.env.ADMIN_TABLE;
const GALLERIES_TABLE = process.env.GALLERIES_TABLE;
const INQUIRIES_TABLE = process.env.INQUIRIES_TABLE;
const MEDIA_BUCKET = process.env.MEDIA_BUCKET;
const COOKIE_NAME = 'pitfal_admin_session';

if (!ADMIN_TABLE || !GALLERIES_TABLE || !INQUIRIES_TABLE || !MEDIA_BUCKET) {
  throw new Error(
    `Missing required environment variables: ${[
      !ADMIN_TABLE && 'ADMIN_TABLE',
      !GALLERIES_TABLE && 'GALLERIES_TABLE',
      !INQUIRIES_TABLE && 'INQUIRIES_TABLE',
      !MEDIA_BUCKET && 'MEDIA_BUCKET',
    ].filter(Boolean).join(', ')}`
  );
}

interface LogContext {
  requestId: string;
  sourceIp?: string;
  adminUser?: string;
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

// Admin authentication middleware - checks Authorization header first, then cookie
async function authenticateAdmin(event: APIGatewayProxyEvent): Promise<string | null> {
  const tokenValue = parseAuthToken(event.headers, COOKIE_NAME);
  if (!tokenValue) return null;

  const decoded = decodeToken(tokenValue);
  if (!decoded) return null;

  const session = await validateSession(ADMIN_TABLE!, 'ADMIN', decoded.id, decoded.token);
  return session ? decoded.id : null;
}

interface AdminUser {
  pk: string;
  sk: string;
  username: string;
  passwordHash: string;
  email: string;
  createdAt: string;
}

interface GalleryRecord {
  id: string;
  title: string;
  description?: string;
  category: string;
  type: string;
  slug: string;
  images: Array<{ key: string; alt?: string }>;
  passwordHash?: string;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const ctx = getRequestContext(event);
  const requestOrigin = event.headers['origin'] || event.headers['Origin'];

  if (event.httpMethod === 'OPTIONS') {
    return corsResponse(requestOrigin);
  }

  // Route based on resource path
  const resource = event.resource || '';
  const method = event.httpMethod;

  // Auth routes (no auth required)
  if (resource.includes('/admin/auth')) {
    return handleAuth(event, method, ctx, requestOrigin);
  }

  // All other routes require authentication
  const adminUser = await authenticateAdmin(event);
  if (!adminUser) {
    return unauthorized('Admin authentication required', requestOrigin);
  }
  ctx.adminUser = adminUser;

  // Gallery routes
  if (resource.includes('/admin/galleries')) {
    const galleryId = event.pathParameters?.id;
    if (galleryId) {
      return handleGalleryById(event, method, galleryId, ctx, requestOrigin);
    }
    return handleGalleries(event, method, ctx, requestOrigin);
  }

  // Image routes
  if (resource.includes('/admin/images')) {
    const imageId = event.pathParameters?.id;
    if (imageId) {
      return handleImageById(event, method, imageId, ctx, requestOrigin);
    }
    return handleImages(event, method, ctx, requestOrigin);
  }

  // Inquiry routes
  if (resource.includes('/admin/inquiries')) {
    return handleInquiries(event, method, ctx, requestOrigin);
  }

  return notFound('Route not found', requestOrigin);
};

// ============ AUTH HANDLERS ============

async function handleAuth(
  event: APIGatewayProxyEvent,
  method: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  switch (method) {
    case 'POST':
      return handleAdminLogin(event, ctx, requestOrigin);
    case 'GET':
      return handleAdminCheck(event, ctx, requestOrigin);
    case 'DELETE':
      return handleAdminLogout(event, ctx, requestOrigin);
    default:
      return methodNotAllowed(undefined, requestOrigin);
  }
}

async function handleAdminLogin(event: APIGatewayProxyEvent, ctx: LogContext, requestOrigin?: string) {
  let body: { username?: string; password?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequest('Invalid JSON', requestOrigin);
  }

  if (!body.username || !body.password) {
    return badRequest('Username and password are required', requestOrigin);
  }

  // Check brute-force lockout
  const attemptCheck = await checkLoginAttempts(ADMIN_TABLE!, body.username);
  if (attemptCheck.locked) {
    log('WARN', 'Admin login blocked - account locked', ctx, { username: body.username, retryAfter: attemptCheck.retryAfter });
    return tooManyRequests('Too many login attempts. Please try again later.', requestOrigin);
  }

  const adminUser = await getItem<AdminUser>({
    TableName: ADMIN_TABLE,
    Key: { pk: `ADMIN#${body.username}`, sk: `PROFILE` },
  });

  if (!adminUser) {
    await bcrypt.hash('dummy', 10); // Constant time
    await recordFailedAttempt(ADMIN_TABLE!, body.username);
    log('WARN', 'Admin login failed - user not found', ctx, { username: body.username });
    return unauthorized('Invalid credentials', requestOrigin);
  }

  const valid = await bcrypt.compare(body.password, adminUser.passwordHash);
  if (!valid) {
    await recordFailedAttempt(ADMIN_TABLE!, body.username);
    log('WARN', 'Admin login failed - wrong password', ctx, { username: body.username });
    return unauthorized('Invalid credentials', requestOrigin);
  }

  // Clear failed attempts on successful login
  await clearLoginAttempts(ADMIN_TABLE!, body.username);

  const { token, expiresAt } = await createSession(ADMIN_TABLE!, 'ADMIN', body.username);
  const cookieValue = encodeToken(body.username, token);
  const maxAge = expiresAt - Math.floor(Date.now() / 1000);

  log('INFO', 'Admin login successful', ctx, { username: body.username });

  return withCookie(
    success({ authenticated: true, username: body.username, token: cookieValue }, 200, requestOrigin),
    COOKIE_NAME,
    cookieValue,
    { maxAge, sameSite: 'Lax' }
  );
}

async function handleAdminCheck(event: APIGatewayProxyEvent, ctx: LogContext, requestOrigin?: string) {
  const adminUser = await authenticateAdmin(event);
  return success({ authenticated: !!adminUser, username: adminUser || undefined }, 200, requestOrigin);
}

async function handleAdminLogout(event: APIGatewayProxyEvent, ctx: LogContext, requestOrigin?: string) {
  const tokenValue = parseAuthToken(event.headers, COOKIE_NAME);

  if (tokenValue) {
    const decoded = decodeToken(tokenValue);
    if (decoded) {
      await deleteSession(ADMIN_TABLE!, 'ADMIN', decoded.id, decoded.token);
      log('INFO', 'Admin logout', ctx, { username: decoded.id });
    }
  }

  return clearCookie(success({ authenticated: false }, 200, requestOrigin), COOKIE_NAME);
}

// ============ GALLERY HANDLERS ============

async function handleGalleries(
  event: APIGatewayProxyEvent,
  method: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method === 'GET') {
    const galleries = await scanItems<GalleryRecord>({
      TableName: GALLERIES_TABLE,
    });
    // Sort by date descending
    galleries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    log('INFO', 'Galleries listed', ctx, { count: galleries.length });
    return success({
      galleries: galleries.map(g => ({
        id: g.id,
        title: g.title,
        category: g.category,
        type: g.type,
        slug: g.slug,
        imageCount: g.images?.length || 0,
        featured: g.featured || false,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      })),
    }, 200, requestOrigin);
  }

  if (method === 'POST') {
    let body: {
      title?: string;
      description?: string;
      category?: string;
      type?: string;
      slug?: string;
      password?: string;
      featured?: boolean;
    };
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return badRequest('Invalid JSON', requestOrigin);
    }

    if (!body.title || !body.category || !body.type || !body.slug) {
      return badRequest('title, category, type, and slug are required', requestOrigin);
    }

    const id = randomUUID();
    const timestamp = new Date().toISOString();
    const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : undefined;

    const gallery: Record<string, unknown> = {
      id,
      title: body.title.trim(),
      description: body.description?.trim() || '',
      category: body.category,
      type: body.type,
      slug: body.slug,
      images: [],
      featured: body.featured || false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    if (passwordHash) gallery.passwordHash = passwordHash;

    await putItem({
      TableName: GALLERIES_TABLE,
      Item: gallery,
    });

    log('INFO', 'Gallery created', ctx, { galleryId: id, title: body.title });
    return success({ gallery: { ...gallery, passwordHash: undefined } }, 201, requestOrigin);
  }

  return methodNotAllowed(undefined, requestOrigin);
}

async function handleGalleryById(
  event: APIGatewayProxyEvent,
  method: string,
  galleryId: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method === 'GET') {
    const gallery = await getItem<GalleryRecord>({
      TableName: GALLERIES_TABLE,
      Key: { id: galleryId },
    });
    if (!gallery) return notFound('Gallery not found', requestOrigin);

    return success({
      gallery: { ...gallery, passwordHash: undefined },
    }, 200, requestOrigin);
  }

  if (method === 'PUT') {
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return badRequest('Invalid JSON', requestOrigin);
    }

    // Build update expression from allowed fields
    const allowedFields = ['title', 'description', 'category', 'type', 'slug', 'featured', 'images'];
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Handle password update separately
    if (body.password && typeof body.password === 'string') {
      updates.passwordHash = await bcrypt.hash(body.password, 10);
    }

    const expr = buildUpdateExpression(updates);
    await updateItem({
      TableName: GALLERIES_TABLE,
      Key: { id: galleryId },
      ...expr,
    });

    log('INFO', 'Gallery updated', ctx, { galleryId });
    return success({ updated: true }, 200, requestOrigin);
  }

  if (method === 'DELETE') {
    // Get gallery first to clean up images
    const gallery = await getItem<GalleryRecord>({
      TableName: GALLERIES_TABLE,
      Key: { id: galleryId },
    });

    if (!gallery) return notFound('Gallery not found', requestOrigin);

    // Delete gallery images from S3
    if (gallery.images?.length) {
      await deleteS3Objects(MEDIA_BUCKET!, gallery.images.map(img => img.key));
    }

    await deleteItem({
      TableName: GALLERIES_TABLE,
      Key: { id: galleryId },
    });

    log('INFO', 'Gallery deleted', ctx, { galleryId });
    return success({ deleted: true }, 200, requestOrigin);
  }

  return methodNotAllowed(undefined, requestOrigin);
}

// ============ IMAGE HANDLERS ============

async function handleImages(
  event: APIGatewayProxyEvent,
  method: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method === 'POST') {
    let body: { galleryId?: string; filename?: string; contentType?: string };
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return badRequest('Invalid JSON', requestOrigin);
    }

    if (!body.galleryId || !body.filename || !body.contentType) {
      return badRequest('galleryId, filename, and contentType are required', requestOrigin);
    }

    const key = `finished/${body.galleryId}/${randomUUID()}-${body.filename}`;
    const uploadUrl = await generatePresignedUploadUrl(MEDIA_BUCKET!, key, body.contentType, 3600);

    log('INFO', 'Upload URL generated', ctx, { galleryId: body.galleryId, key });
    return success({ uploadUrl, key }, 200, requestOrigin);
  }

  return methodNotAllowed(undefined, requestOrigin);
}

async function handleImageById(
  event: APIGatewayProxyEvent,
  method: string,
  imageId: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method === 'PUT') {
    // Update image metadata (alt text) in gallery
    let body: { galleryId?: string; alt?: string };
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return badRequest('Invalid JSON', requestOrigin);
    }

    if (!body.galleryId) {
      return badRequest('galleryId is required', requestOrigin);
    }

    const gallery = await getItem<GalleryRecord>({
      TableName: GALLERIES_TABLE,
      Key: { id: body.galleryId },
    });

    if (!gallery) return notFound('Gallery not found', requestOrigin);

    const imageIndex = gallery.images?.findIndex(img => img.key === imageId);
    if (imageIndex === undefined || imageIndex === -1) {
      return notFound('Image not found in gallery', requestOrigin);
    }

    gallery.images[imageIndex] = { ...gallery.images[imageIndex], alt: body.alt };

    await updateItem({
      TableName: GALLERIES_TABLE,
      Key: { id: body.galleryId },
      UpdateExpression: 'SET images = :images, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':images': gallery.images,
        ':updatedAt': new Date().toISOString(),
      },
    });

    log('INFO', 'Image metadata updated', ctx, { galleryId: body.galleryId, imageKey: imageId });
    return success({ updated: true }, 200, requestOrigin);
  }

  if (method === 'DELETE') {
    let body: { galleryId?: string };
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return badRequest('Invalid JSON', requestOrigin);
    }

    if (!body.galleryId) {
      return badRequest('galleryId is required', requestOrigin);
    }

    // Remove from S3
    await deleteS3Objects(MEDIA_BUCKET!, [imageId]);

    // Remove from gallery record
    const gallery = await getItem<GalleryRecord>({
      TableName: GALLERIES_TABLE,
      Key: { id: body.galleryId },
    });

    if (gallery && gallery.images) {
      const updatedImages = gallery.images.filter(img => img.key !== imageId);
      await updateItem({
        TableName: GALLERIES_TABLE,
        Key: { id: body.galleryId },
        UpdateExpression: 'SET images = :images, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':images': updatedImages,
          ':updatedAt': new Date().toISOString(),
        },
      });
    }

    log('INFO', 'Image deleted', ctx, { galleryId: body.galleryId, imageKey: imageId });
    return success({ deleted: true }, 200, requestOrigin);
  }

  return methodNotAllowed(undefined, requestOrigin);
}

// ============ INQUIRY HANDLERS ============

async function handleInquiries(
  event: APIGatewayProxyEvent,
  method: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method !== 'GET') {
    return methodNotAllowed(undefined, requestOrigin);
  }

  const status = event.queryStringParameters?.status;

  let inquiries;
  if (status) {
    inquiries = await queryItems({
      TableName: INQUIRIES_TABLE,
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status },
      ScanIndexForward: false,
    });
  } else {
    inquiries = await scanItems({
      TableName: INQUIRIES_TABLE,
    });
    inquiries.sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
    );
  }

  log('INFO', 'Inquiries listed', ctx, { count: inquiries.length, statusFilter: status || 'all' });
  return success({ inquiries }, 200, requestOrigin);
}
