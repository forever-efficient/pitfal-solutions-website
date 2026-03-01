import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { shuffleArray } from '../shared/array';
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
import { generatePresignedUploadUrl, generatePresignedDownloadUrl, deleteS3Objects, copyS3Object, listS3Objects } from '../shared/s3';
import { sendTemplatedEmail } from '../shared/email';

// Environment variables
const ADMIN_TABLE = process.env.ADMIN_TABLE;
const GALLERIES_TABLE = process.env.GALLERIES_TABLE;
const INQUIRIES_TABLE = process.env.INQUIRIES_TABLE;
const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE;
const MEDIA_BUCKET = process.env.MEDIA_BUCKET;
const ORCHESTRATOR_FUNCTION_NAME = process.env.ORCHESTRATOR_FUNCTION_NAME;
const IMAGENAI_PROFILE_ID_JPG = process.env.IMAGENAI_PROFILE_ID_JPG || '';
const IMAGENAI_PROFILE_ID_RAW = process.env.IMAGENAI_PROFILE_ID_RAW || '';
const COOKIE_NAME = 'pitfal_admin_session';

const lambdaClient = new LambdaClient({});

if (!ADMIN_TABLE || !GALLERIES_TABLE || !INQUIRIES_TABLE || !BOOKINGS_TABLE || !MEDIA_BUCKET) {
  throw new Error(
    `Missing required environment variables: ${[
      !ADMIN_TABLE && 'ADMIN_TABLE',
      !GALLERIES_TABLE && 'GALLERIES_TABLE',
      !INQUIRIES_TABLE && 'INQUIRIES_TABLE',
      !BOOKINGS_TABLE && 'BOOKINGS_TABLE',
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

interface GallerySection {
  id: string;
  title: string;
  description?: string;
  images: string[]; // S3 keys referencing images in the gallery's images array
}

interface ClientSort {
  by: 'name' | 'date' | 'size' | 'random';
  order?: 'asc' | 'desc';
}

interface GalleryRecord {
  id: string;
  title: string;
  description?: string;
  category: string;
  slug: string;
  images: Array<{ key: string; alt?: string }>;
  heroImage?: string; // S3 key for gallery cover/hero image
  sections?: GallerySection[];
  clientSort?: ClientSort;
  passwordHash?: string;
  featured?: boolean;
  kanbanCards?: Array<{ id: string; title: string; status: string; order: number; createdAt: string }>;
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

  // Public gallery routes (no auth required)
  if (resource.includes('/galleries') && !resource.includes('/admin/galleries')) {
    return handlePublicGalleries(event, method, ctx, requestOrigin);
  }

  // All other routes require authentication
  const adminUser = await authenticateAdmin(event);
  if (!adminUser) {
    return unauthorized('Admin authentication required', requestOrigin);
  }
  ctx.adminUser = adminUser;

  // Analytics route (must check before galleries route)
  if (resource.includes('/admin/analytics')) {
    return handleAnalytics(method, ctx, requestOrigin);
  }

  // Gallery notify route (must check before generic galleries route)
  if (resource.includes('/admin/galleries') && resource.includes('/notify')) {
    const galleryId = event.pathParameters?.id;
    if (!galleryId) return badRequest('Gallery ID is required', requestOrigin);
    return handleGalleryNotify(event, method, galleryId, ctx, requestOrigin);
  }

  // Gallery bulk-download route (must check before generic galleries route)
  if (resource.includes('/admin/galleries') && resource.includes('/bulk-download')) {
    const galleryId = event.pathParameters?.id;
    if (!galleryId) return badRequest('Gallery ID is required', requestOrigin);
    return handleBulkDownload(event, method, galleryId, ctx, requestOrigin);
  }

  // Gallery routes
  if (resource.includes('/admin/galleries')) {
    const galleryId = event.pathParameters?.id;
    if (galleryId) {
      return handleGalleryById(event, method, galleryId, ctx, requestOrigin);
    }
    return handleGalleries(event, method, ctx, requestOrigin);
  }

  // ImagenAI routes (must check before generic /admin/images to avoid conflicts)
  if (resource.includes('/admin/imagen/upload')) {
    return handleImagenUpload(event, method, ctx, requestOrigin);
  }
  if (resource.includes('/admin/imagen/process')) {
    return handleImagenProcess(event, method, ctx, requestOrigin);
  }
  if (resource.includes('/admin/imagen/jobs')) {
    return handleImagenJobs(event, method, ctx, requestOrigin);
  }
  if (resource.includes('/admin/imagen/approve')) {
    return handleImagenApprove(event, method, ctx, requestOrigin);
  }
  if (resource.includes('/admin/imagen/edited')) {
    return handleImagenEdited(event, method, ctx, requestOrigin);
  }

  // Image ready queue route (must check before generic images route)
  if (resource.includes('/admin/images/ready')) {
    return handleImagesReady(event, method, ctx, requestOrigin);
  }

  // Image assign route (must check before generic images route)
  if (resource.includes('/admin/images/assign')) {
    return handleImagesAssign(event, method, ctx, requestOrigin);
  }

  // Image routes (all methods use base endpoint with imageKey in body)
  if (resource.includes('/admin/images')) {
    return handleImages(event, method, ctx, requestOrigin);
  }

  // Inquiry routes
  if (resource.includes('/admin/inquiries')) {
    const inquiryId = event.pathParameters?.id;
    if (inquiryId) {
      return handleInquiryById(event, method, inquiryId, ctx, requestOrigin);
    }
    return handleInquiries(event, method, ctx, requestOrigin);
  }

  // Booking availability routes (must check before generic bookings route)
  if (resource.includes('/admin/bookings') && resource.includes('/availability')) {
    return handleAvailability(event, method, ctx, requestOrigin);
  }

  // Booking routes
  if (resource.includes('/admin/bookings')) {
    const bookingId = event.pathParameters?.id;
    if (bookingId) {
      return handleBookingById(event, method, bookingId, ctx, requestOrigin);
    }
    return handleBookings(event, method, ctx, requestOrigin);
  }

  // Processing jobs routes
  if (resource.includes('/admin/processing-jobs')) {
    return handleProcessingJobs(event, method, ctx, requestOrigin);
  }

  // Settings routes
  if (resource.includes('/admin/settings')) {
    return handleSettings(event, method, ctx, requestOrigin);
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
    case 'PUT':
      return handleChangePassword(event, ctx, requestOrigin);
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

async function handleChangePassword(event: APIGatewayProxyEvent, ctx: LogContext, requestOrigin?: string) {
  const username = await authenticateAdmin(event);
  if (!username) return unauthorized('Admin authentication required', requestOrigin);

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequest('Invalid JSON', requestOrigin);
  }

  if (!body.currentPassword || !body.newPassword) {
    return badRequest('currentPassword and newPassword are required', requestOrigin);
  }

  if (body.newPassword.length < 8) {
    return badRequest('New password must be at least 8 characters', requestOrigin);
  }

  const adminUser = await getItem<AdminUser>({
    TableName: ADMIN_TABLE!,
    Key: { pk: `ADMIN#${username}`, sk: 'PROFILE' },
  });

  if (!adminUser) return unauthorized('Admin user not found', requestOrigin);

  const valid = await bcrypt.compare(body.currentPassword, adminUser.passwordHash);
  if (!valid) {
    log('WARN', 'Change password failed - wrong current password', ctx, { username });
    return unauthorized('Current password is incorrect', requestOrigin);
  }

  const newHash = await bcrypt.hash(body.newPassword, 10);
  await updateItem({
    TableName: ADMIN_TABLE!,
    Key: { pk: `ADMIN#${username}`, sk: 'PROFILE' },
    ...buildUpdateExpression({ passwordHash: newHash }),
  });

  log('INFO', 'Admin password changed', ctx, { username });
  return success({ success: true }, 200, requestOrigin);
}

// ============ ANALYTICS HANDLER ============

async function handleAnalytics(
  method: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method !== 'GET') {
    return methodNotAllowed(undefined, requestOrigin);
  }

  const allGalleries = await scanItems<GalleryRecord & { viewCount?: number; downloadCount?: number }>({
    TableName: GALLERIES_TABLE,
  });

  // Filter to client galleries (have passwordHash attribute, even if empty string)
  const clientGalleries = allGalleries.filter(g => g.passwordHash !== undefined);

  let totalViews = 0;
  let totalDownloads = 0;
  const galleries = clientGalleries
    .map(g => {
      const views = g.viewCount || 0;
      const downloads = g.downloadCount || 0;
      totalViews += views;
      totalDownloads += downloads;
      return {
        id: g.id,
        title: g.title,
        category: g.category,
        slug: g.slug,
        imageCount: g.images?.length || 0,
        viewCount: views,
        downloadCount: downloads,
      };
    })
    .sort((a, b) => b.viewCount - a.viewCount);

  log('INFO', 'Analytics fetched', ctx, { clientGalleries: galleries.length, totalViews, totalDownloads });
  return success({ totalViews, totalDownloads, galleries }, 200, requestOrigin);
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
        slug: g.slug,
        imageCount: g.images?.length || 0,
        sectionCount: g.sections?.length || 0,
        heroImage: g.heroImage || null,
        featured: g.featured || false,
        viewCount: (g as Record<string, unknown>).viewCount as number || 0,
        downloadCount: (g as Record<string, unknown>).downloadCount as number || 0,
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
      slug?: string;
      password?: string;
      featured?: boolean;
      heroImage?: string;
      sections?: GallerySection[];
    };
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return badRequest('Invalid JSON', requestOrigin);
    }

    if (!body.title || !body.category || !body.slug) {
      return badRequest('title, category, and slug are required', requestOrigin);
    }

    // Validate sections if provided
    if (body.sections && !validateSections(body.sections)) {
      return badRequest('Invalid sections: each section must have id, title, and images array', requestOrigin);
    }

    const id = randomUUID();
    const timestamp = new Date().toISOString();
    const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : undefined;

    const gallery: Record<string, unknown> = {
      id,
      title: body.title.trim(),
      description: body.description?.trim() || '',
      category: body.category,
      slug: body.slug,
      images: [],
      featured: body.featured || false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    if (passwordHash) gallery.passwordHash = passwordHash;
    if (body.heroImage) gallery.heroImage = body.heroImage;
    if (body.sections) gallery.sections = body.sections;

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
      gallery: { ...gallery, passwordHash: undefined, passwordEnabled: !!gallery.passwordHash },
    }, 200, requestOrigin);
  }

  if (method === 'PUT') {
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return badRequest('Invalid JSON', requestOrigin);
    }

    // Validate sections if provided
    if (body.sections !== undefined && body.sections !== null && !validateSections(body.sections as GallerySection[])) {
      return badRequest('Invalid sections: each section must have id, title, and images array', requestOrigin);
    }

    // Build update expression from allowed fields
    const allowedFields = ['title', 'description', 'category', 'slug', 'featured', 'images', 'heroImage', 'sections', 'clientSort', 'heroFocalPoint', 'heroZoom', 'heroGradientOpacity', 'heroHeight', 'kanbanCards'];
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Handle password update separately
    if (body.password && typeof body.password === 'string') {
      updates.passwordHash = await bcrypt.hash(body.password, 10);
    } else if (body.password === '') {
      updates.passwordHash = '';
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
    const gallery = await getItem<GalleryRecord>({
      TableName: GALLERIES_TABLE,
      Key: { id: galleryId },
    });

    if (!gallery) return notFound('Gallery not found', requestOrigin);

    // Move images back to staging/ready/ so they can be re-assigned
    if (gallery.images?.length) {
      await Promise.all(
        gallery.images.map(async (img) => {
          const filename = img.key.split('/').pop()!;
          const readyKey = `staging/ready/${filename}`;
          try {
            await copyS3Object(MEDIA_BUCKET!, img.key, readyKey);
            await deleteS3Objects(MEDIA_BUCKET!, [img.key]);
          } catch {
            // If move fails, still delete the gallery record
          }
        })
      );
    }

    await deleteItem({
      TableName: GALLERIES_TABLE,
      Key: { id: galleryId },
    });

    log('INFO', 'Gallery deleted, images returned to staging/ready/', ctx, { galleryId });
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
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequest('Invalid JSON', requestOrigin);
  }

  if (method === 'POST') {
    if (!body.filename) {
      return badRequest('filename is required', requestOrigin);
    }

    const rawFilename = body.filename as string;
    // Reject path traversal, null bytes, and unsafe characters
    if (
      rawFilename.includes('..') ||
      rawFilename.includes('\0') ||
      rawFilename.includes('/') ||
      rawFilename.includes('\\')
    ) {
      return badRequest('Invalid filename', requestOrigin);
    }
    // Restrict to alphanumeric, dots, underscores, hyphens
    const safeFilename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (safeFilename.length === 0) {
      return badRequest('Invalid filename', requestOrigin);
    }

    // All uploads go directly to staging/ready/
    const filename = safeFilename;
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const acceptedExtensions = new Set(['jpg', 'jpeg', 'png']);
    if (!acceptedExtensions.has(ext)) {
      return badRequest('Unsupported file type. Use JPG, JPEG, or PNG.', requestOrigin);
    }
    const contentType = (body.contentType as string) || 'image/jpeg';
    const key = `staging/ready/${filename}`;
    const uploadUrl = await generatePresignedUploadUrl(MEDIA_BUCKET!, key, contentType, 3600);

    log('INFO', 'Upload URL generated', ctx, { key });
    return success({ uploadUrl, key }, 200, requestOrigin);
  }

  if (method === 'PUT') {
    const imageKey = body.imageKey as string;
    const galleryId = body.galleryId as string;
    if (!imageKey || !galleryId) {
      return badRequest('imageKey and galleryId are required', requestOrigin);
    }

    const gallery = await getItem<GalleryRecord>({
      TableName: GALLERIES_TABLE,
      Key: { id: galleryId },
    });

    if (!gallery) return notFound('Gallery not found', requestOrigin);

    const imageIndex = gallery.images?.findIndex(img => img.key === imageKey);
    if (imageIndex === undefined || imageIndex === -1) {
      return notFound('Image not found in gallery', requestOrigin);
    }

    gallery.images[imageIndex] = { ...gallery.images[imageIndex], alt: body.alt as string };

    await updateItem({
      TableName: GALLERIES_TABLE,
      Key: { id: galleryId },
      UpdateExpression: 'SET images = :images, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':images': gallery.images,
        ':updatedAt': new Date().toISOString(),
      },
    });

    log('INFO', 'Image metadata updated', ctx, { galleryId, imageKey });
    return success({ updated: true }, 200, requestOrigin);
  }

  if (method === 'DELETE') {
    const imageKey = body.imageKey as string;
    const galleryId = body.galleryId as string;
    if (!imageKey || !galleryId) {
      return badRequest('imageKey and galleryId are required', requestOrigin);
    }

    // Move image back to staging/ready/ for re-assignment
    const filename = imageKey.split('/').pop()!;
    const readyKey = `staging/ready/${filename}`;
    try {
      await copyS3Object(MEDIA_BUCKET!, imageKey, readyKey);
      await deleteS3Objects(MEDIA_BUCKET!, [imageKey]);
    } catch {
      // If move fails, continue to update DynamoDB
    }

    // Remove from gallery record
    const gallery = await getItem<GalleryRecord>({
      TableName: GALLERIES_TABLE,
      Key: { id: galleryId },
    });

    if (gallery && gallery.images) {
      const updatedImages = gallery.images.filter(img => img.key !== imageKey);
      await updateItem({
        TableName: GALLERIES_TABLE,
        Key: { id: galleryId },
        UpdateExpression: 'SET images = :images, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':images': updatedImages,
          ':updatedAt': new Date().toISOString(),
        },
      });
    }

    log('INFO', 'Image removed from gallery, returned to staging/ready/', ctx, { galleryId, imageKey });
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

async function handleInquiryById(
  event: APIGatewayProxyEvent,
  method: string,
  inquiryId: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method === 'PUT') {
    let body: { status?: string };
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return badRequest('Invalid JSON', requestOrigin);
    }

    const validStatuses = ['new', 'read', 'replied'];
    if (!body.status || !validStatuses.includes(body.status)) {
      return badRequest(`status must be one of: ${validStatuses.join(', ')}`, requestOrigin);
    }

    const expr = buildUpdateExpression({
      status: body.status,
      updatedAt: new Date().toISOString(),
    });

    await updateItem({
      TableName: INQUIRIES_TABLE,
      Key: { id: inquiryId },
      ...expr,
    });

    log('INFO', 'Inquiry status updated', ctx, { inquiryId, status: body.status });
    return success({ updated: true }, 200, requestOrigin);
  }

  if (method === 'DELETE') {
    await deleteItem({
      TableName: INQUIRIES_TABLE,
      Key: { id: inquiryId },
    });

    log('INFO', 'Inquiry deleted', ctx, { inquiryId });
    return success({ deleted: true }, 200, requestOrigin);
  }

  return methodNotAllowed(undefined, requestOrigin);
}

// ============ VALIDATION HELPERS ============

function validateSections(sections: GallerySection[]): boolean {
  if (!Array.isArray(sections)) return false;
  return sections.every(
    s => typeof s.id === 'string' && s.id.length > 0
      && typeof s.title === 'string' && s.title.length > 0
      && Array.isArray(s.images)
      && s.images.every((key: unknown) => typeof key === 'string')
  );
}

// ============ BULK DOWNLOAD HANDLER ============

async function handleBulkDownload(
  event: APIGatewayProxyEvent,
  method: string,
  galleryId: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method !== 'POST') {
    return methodNotAllowed(undefined, requestOrigin);
  }

  let body: { imageKeys?: string[] };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequest('Invalid JSON', requestOrigin);
  }

  // Fetch gallery to verify existence and image ownership
  const gallery = await getItem<GalleryRecord>({
    TableName: GALLERIES_TABLE,
    Key: { id: galleryId },
  });

  if (!gallery) return notFound('Gallery not found', requestOrigin);

  // Determine which images to generate download URLs for
  const galleryImageKeys = new Set(gallery.images?.map(img => img.key) || []);
  let requestedKeys: string[];

  if (body.imageKeys && Array.isArray(body.imageKeys) && body.imageKeys.length > 0) {
    // Validate that all requested keys belong to this gallery
    const invalidKeys = body.imageKeys.filter(key => !galleryImageKeys.has(key));
    if (invalidKeys.length > 0) {
      return badRequest('Some image keys do not belong to this gallery', requestOrigin);
    }
    requestedKeys = body.imageKeys;
  } else {
    // Download all gallery images
    requestedKeys = Array.from(galleryImageKeys);
  }

  if (requestedKeys.length === 0) {
    return badRequest('No images to download', requestOrigin);
  }

  // Cap at 100 images per request to avoid Lambda timeout
  const MAX_BULK_DOWNLOAD = 100;
  if (requestedKeys.length > MAX_BULK_DOWNLOAD) {
    return badRequest(`Maximum ${MAX_BULK_DOWNLOAD} images per bulk download request`, requestOrigin);
  }

  // Generate presigned download URLs for all requested images
  const downloads = await Promise.all(
    requestedKeys.map(async (key) => ({
      key,
      downloadUrl: await generatePresignedDownloadUrl(MEDIA_BUCKET!, key, 3600),
    }))
  );

  log('INFO', 'Bulk download URLs generated', ctx, { galleryId, count: downloads.length });
  return success({ downloads }, 200, requestOrigin);
}

// ============ GALLERY NOTIFY HANDLER ============

async function handleGalleryNotify(
  event: APIGatewayProxyEvent,
  method: string,
  galleryId: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method !== 'POST') {
    return methodNotAllowed(undefined, requestOrigin);
  }

  let body: { clientEmail?: string; clientName?: string; expirationDays?: number };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequest('Invalid JSON', requestOrigin);
  }

  if (!body.clientEmail || !body.clientName) {
    return badRequest('clientEmail and clientName are required', requestOrigin);
  }

  const gallery = await getItem<GalleryRecord>({
    TableName: GALLERIES_TABLE,
    Key: { id: galleryId },
  });

  if (!gallery) return notFound('Gallery not found', requestOrigin);

  const siteUrl = process.env.SITE_URL || requestOrigin || 'https://pitfal.solutions';
  const galleryUrl = `${siteUrl}/client/${galleryId}`;
  const expirationDays = String(body.expirationDays || 30);

  await sendTemplatedEmail({
    to: body.clientEmail,
    template: 'gallery-ready',
    data: {
      name: body.clientName,
      sessionType: gallery.category,
      galleryUrl,
      password: gallery.passwordHash ? '(use the password provided separately)' : 'No password required',
      expirationDays,
    },
  });

  log('INFO', 'Client notified about gallery', ctx, { galleryId, clientEmail: body.clientEmail });
  return success({ notified: true }, 200, requestOrigin);
}

// ============ PROCESSING JOBS TYPES ============

interface ProcessingJobRecord {
  pk: string;
  sk: string;
  jobId: string;
  galleryId: string;
  rawKeys: string[];
  imagenProjectId?: string;
  status: 'queued' | 'uploading' | 'processing' | 'downloading' | 'complete' | 'failed';
  mode: 'auto' | 'manual';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  resultKeys?: string[];
  error?: string;
}

interface SettingsRecord {
  pk: string;
  sk: string;
  processingMode: 'auto' | 'manual';
  imagenProfileId: string;
}

// ============ PROCESSING JOBS HANDLERS ============

async function handleProcessingJobs(
  event: APIGatewayProxyEvent,
  method: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method === 'GET') {
    const galleryId = event.queryStringParameters?.galleryId;
    if (!galleryId) {
      return badRequest('galleryId query parameter is required', requestOrigin);
    }

    const allJobs = await scanItems<ProcessingJobRecord>({
      TableName: ADMIN_TABLE,
    });

    const jobs = allJobs
      .filter(item => item.pk?.startsWith('PROCESSING_JOB#') && item.galleryId === galleryId)
      .map(job => ({
        jobId: job.jobId,
        galleryId: job.galleryId,
        rawKeys: job.rawKeys,
        imagenProjectId: job.imagenProjectId,
        status: job.status,
        mode: job.mode,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
        resultKeys: job.resultKeys,
        error: job.error,
      }));

    return success({ jobs }, 200, requestOrigin);
  }

  if (method === 'POST') {
    let body: { galleryId?: string; rawKeys?: string[] };
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return badRequest('Invalid JSON', requestOrigin);
    }

    if (!body.galleryId || !body.rawKeys || !Array.isArray(body.rawKeys) || body.rawKeys.length === 0) {
      return badRequest('galleryId and rawKeys[] are required', requestOrigin);
    }

    // Read settings to determine mode
    const settingsRecord = await getItem<SettingsRecord>({
      TableName: ADMIN_TABLE!,
      Key: { pk: 'SETTINGS', sk: 'SETTINGS' },
    });
    const mode = settingsRecord?.processingMode || 'auto';

    const jobId = randomUUID();
    const timestamp = new Date().toISOString();

    const jobRecord: ProcessingJobRecord = {
      pk: `PROCESSING_JOB#${jobId}`,
      sk: `PROCESSING_JOB#${jobId}`,
      jobId,
      galleryId: body.galleryId,
      rawKeys: body.rawKeys,
      status: 'queued',
      mode,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await putItem({
      TableName: ADMIN_TABLE!,
      Item: jobRecord,
    });

    // Invoke orchestrator Lambda asynchronously
    if (ORCHESTRATOR_FUNCTION_NAME) {
      await lambdaClient.send(new InvokeCommand({
        FunctionName: ORCHESTRATOR_FUNCTION_NAME,
        InvocationType: 'Event',
        Payload: Buffer.from(JSON.stringify({ jobId, galleryId: body.galleryId, rawKeys: body.rawKeys })),
      }));
    }

    log('INFO', 'Processing job created', ctx, { jobId, galleryId: body.galleryId, fileCount: body.rawKeys.length });
    return success({ jobId }, 201, requestOrigin);
  }

  return methodNotAllowed(undefined, requestOrigin);
}

// ============ SETTINGS HANDLERS ============

async function handleSettings(
  event: APIGatewayProxyEvent,
  method: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method === 'GET') {
    const settingsRecord = await getItem<SettingsRecord>({
      TableName: ADMIN_TABLE!,
      Key: { pk: 'SETTINGS', sk: 'SETTINGS' },
    });

    return success({
      processingMode: settingsRecord?.processingMode || 'auto',
      imagenProfileId: settingsRecord?.imagenProfileId || '',
    }, 200, requestOrigin);
  }

  if (method === 'PUT') {
    let body: { processingMode?: 'auto' | 'manual'; imagenProfileId?: string };
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return badRequest('Invalid JSON', requestOrigin);
    }

    const updates: Record<string, unknown> = {};
    if (body.processingMode !== undefined) {
      if (!['auto', 'manual'].includes(body.processingMode)) {
        return badRequest('processingMode must be auto or manual', requestOrigin);
      }
      updates.processingMode = body.processingMode;
    }
    if (body.imagenProfileId !== undefined) {
      updates.imagenProfileId = body.imagenProfileId;
    }

    if (Object.keys(updates).length === 0) {
      return badRequest('No valid fields to update', requestOrigin);
    }

    const existingSettings = await getItem<SettingsRecord>({
      TableName: ADMIN_TABLE!,
      Key: { pk: 'SETTINGS', sk: 'SETTINGS' },
    });

    await putItem({
      TableName: ADMIN_TABLE!,
      Item: {
        pk: 'SETTINGS',
        sk: 'SETTINGS',
        processingMode: (updates.processingMode || existingSettings?.processingMode || 'auto'),
        imagenProfileId: (updates.imagenProfileId ?? existingSettings?.imagenProfileId ?? ''),
      },
    });

    log('INFO', 'Settings updated', ctx, { updates });
    return success({ updated: true }, 200, requestOrigin);
  }

  return methodNotAllowed(undefined, requestOrigin);
}

// ============ IMAGES READY QUEUE HANDLER ============

async function handleImagesReady(
  event: APIGatewayProxyEvent,
  method: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method === 'GET') {
    const objects = await listS3Objects(MEDIA_BUCKET!, 'staging/ready/');
    const images = objects
      .filter(obj => obj.key !== 'staging/ready/')  // exclude the "folder" itself
      .map(obj => ({
        key: obj.key,
        filename: obj.key.split('/').pop() || obj.key,
        uploadedAt: obj.lastModified.toISOString(),
        size: obj.size,
        url: `${process.env.CLOUDFRONT_URL || ''}/media/${obj.key}`,
      }));

    log('INFO', 'Ready queue listed', ctx, { count: images.length });
    return success({ images }, 200, requestOrigin);
  }

  if (method === 'DELETE') {
    let body: { keys?: string[] };
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return badRequest('Invalid JSON', requestOrigin);
    }

    const keys = body.keys as string[];
    if (!Array.isArray(keys) || keys.length === 0) {
      return badRequest('keys array is required', requestOrigin);
    }

    // Validate all keys are within staging/ready/ to prevent accidental deletes
    const invalid = keys.filter(k => !k.startsWith('staging/ready/'));
    if (invalid.length > 0) {
      return badRequest('All keys must be under staging/ready/', requestOrigin);
    }

    await deleteS3Objects(MEDIA_BUCKET!, keys);
    log('INFO', 'Deleted images from staging/ready/', ctx, { count: keys.length });
    return success({ deleted: keys.length }, 200, requestOrigin);
  }

  return methodNotAllowed(undefined, requestOrigin);
}

// ============ IMAGES ASSIGN HANDLER ============

async function handleImagesAssign(
  event: APIGatewayProxyEvent,
  method: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method !== 'POST') {
    return methodNotAllowed(undefined, requestOrigin);
  }

  let body: { keys?: string[]; galleryId?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequest('Invalid JSON', requestOrigin);
  }

  if (!body.keys || !Array.isArray(body.keys) || body.keys.length === 0 || !body.galleryId) {
    return badRequest('keys[] and galleryId are required', requestOrigin);
  }

  const gallery = await getItem<GalleryRecord>({
    TableName: GALLERIES_TABLE,
    Key: { id: body.galleryId },
  });

  if (!gallery) return notFound('Gallery not found', requestOrigin);

  // Move each image from staging/ready/ → gallery/{galleryId}/
  const assignedImages: Array<{ key: string; alt?: string }> = [];
  const failed: string[] = [];

  await Promise.all(
    body.keys.map(async (readyKey: string) => {
      const filename = readyKey.split('/').pop()!;
      const galleryKey = `gallery/${body.galleryId}/${filename}`;
      try {
        await copyS3Object(MEDIA_BUCKET!, readyKey, galleryKey);
        await deleteS3Objects(MEDIA_BUCKET!, [readyKey]);
        assignedImages.push({ key: galleryKey });
      } catch (err) {
        failed.push(readyKey);
      }
    })
  );

  if (assignedImages.length > 0) {
    // Append to gallery images array, deduplicating by key
    const existingKeys = new Set((gallery.images || []).map(img => img.key));
    const newImages = assignedImages.filter(img => !existingKeys.has(img.key));
    if (newImages.length > 0) {
      const updatedImages = [...(gallery.images || []), ...newImages];
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
  }

  log('INFO', 'Images assigned to gallery', ctx, {
    galleryId: body.galleryId,
    assigned: assignedImages.length,
    failed: failed.length,
  });

  return success({
    assigned: assignedImages.length,
    failed: failed.length,
    failedKeys: failed,
  }, 200, requestOrigin);
}

// ============ PUBLIC GALLERY HANDLER ============

async function handlePublicGalleries(
  event: APIGatewayProxyEvent,
  method: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method !== 'GET') {
    return methodNotAllowed(undefined, requestOrigin);
  }

  const resource = event.resource || '';

  // GET /api/galleries/featured/images
  if (resource.includes('/galleries/featured/images')) {
    const limitParam = event.queryStringParameters?.limit;
    const limit = Math.min(Math.max(parseInt(limitParam || '20', 10) || 20, 1), 100);

    const allGalleries = await scanItems<GalleryRecord>({ TableName: GALLERIES_TABLE });
    const allKeys = allGalleries
      .filter(g => !g.passwordHash)
      .flatMap(g => (g.images || []).map(img => img.key));

    const images = shuffleArray(allKeys).slice(0, limit);
    log('INFO', 'Public gallery images fetched', ctx, { total: allKeys.length, returned: images.length, limit });
    return success({ images }, 200, requestOrigin);
  }

  // GET /api/galleries/featured
  if (resource.includes('/galleries/featured')) {
    const allGalleries = await scanItems<GalleryRecord>({ TableName: GALLERIES_TABLE });
    const featured = allGalleries
      .filter(g => g.featured)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(g => ({
        id: g.id,
        title: g.title,
        category: g.category,
        slug: g.slug,
        coverImage: g.heroImage || g.images?.[0]?.key || null,
        href: `/portfolio/${g.category}/${g.slug}`,
      }));
    log('INFO', 'Featured galleries fetched', ctx, { count: featured.length });
    return success({ galleries: featured }, 200, requestOrigin);
  }

  // GET /api/galleries/{category}/{slug}
  const category = event.pathParameters?.category;
  const slug = event.pathParameters?.slug;

  if (category && slug) {
    const allGalleries = await scanItems<GalleryRecord>({ TableName: GALLERIES_TABLE });
    const gallery = allGalleries.find(
      g => g.category === category && g.slug === slug
    );
    if (!gallery) return notFound('Gallery not found', requestOrigin);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { kanbanCards, ...publicGallery } = gallery;
    return success({
      gallery: {
        ...publicGallery,
        passwordHash: undefined,
        passwordEnabled: !!gallery.passwordHash,
        kanbanCounts: kanbanCards?.length ? {
          todo: kanbanCards.filter(c => c.status === 'todo').length,
          inProgress: kanbanCards.filter(c => c.status === 'in_progress').length,
          done: kanbanCards.filter(c => c.status === 'done').length,
        } : undefined,
      },
    }, 200, requestOrigin);
  }

  // GET /api/galleries/{category} or GET /api/galleries?category=
  const categoryParam = category || event.queryStringParameters?.category;
  if (categoryParam) {
    const allGalleries = await scanItems<GalleryRecord>({ TableName: GALLERIES_TABLE });
    const galleries = allGalleries
      .filter(g => g.category === categoryParam && !g.passwordHash)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(g => ({
        id: g.id,
        title: g.title,
        category: g.category,
        slug: g.slug,
        coverImage: g.heroImage || g.images?.[0]?.key || null,
        imageCount: g.images?.length || 0,
        description: g.description,
        createdAt: g.createdAt,
      }));
    log('INFO', 'Public galleries by category fetched', ctx, { category: categoryParam, count: galleries.length });
    return success({ galleries }, 200, requestOrigin);
  }

  return badRequest('category parameter is required', requestOrigin);
}

// =============================================================================
// ImagenAI Handlers
// =============================================================================

const IMAGEN_ALLOWED_EXTENSIONS = /\.(cr2|cr3|nef|arw|dng|raf|jpg|jpeg|png)$/i;

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function handleImagenUpload(
  event: APIGatewayProxyEvent,
  method: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method === 'GET') {
    // List files in imagen/RAW/
    const objects = await listS3Objects(MEDIA_BUCKET!, 'imagen/RAW/');
    const files = objects.map(obj => ({
      key: obj.key,
      filename: obj.key.split('/').pop() || '',
      size: obj.size,
      lastModified: obj.lastModified?.toISOString() || '',
      url: obj.key,
    }));
    log('INFO', 'Listed imagen uploads', ctx, { count: files.length });
    return success({ files }, 200, requestOrigin);
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { filename, contentType } = body;

    if (!filename || !contentType) {
      return badRequest('filename and contentType are required', requestOrigin);
    }

    if (!IMAGEN_ALLOWED_EXTENSIONS.test(filename)) {
      return badRequest('Unsupported file type. Accepted: CR2, CR3, NEF, ARW, DNG, RAF, JPG, JPEG, PNG', requestOrigin);
    }

    const sanitized = sanitizeFilename(filename);
    const key = `imagen/RAW/${randomUUID()}-${sanitized}`;
    const uploadUrl = await generatePresignedUploadUrl(MEDIA_BUCKET!, key, contentType);

    log('INFO', 'Generated imagen upload URL', ctx, { key });
    return success({ uploadUrl, key }, 200, requestOrigin);
  }

  return methodNotAllowed('Method not allowed', requestOrigin);
}

async function handleImagenProcess(
  event: APIGatewayProxyEvent,
  method: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method !== 'POST') {
    return methodNotAllowed('Method not allowed', requestOrigin);
  }

  const body = JSON.parse(event.body || '{}');
  const { rawKeys } = body;

  if (!Array.isArray(rawKeys) || rawKeys.length === 0) {
    return badRequest('rawKeys array is required and must not be empty', requestOrigin);
  }

  // Validate all keys are in imagen/RAW/
  for (const key of rawKeys) {
    if (!key.startsWith('imagen/RAW/')) {
      return badRequest(`Invalid key: ${key}. All keys must start with imagen/RAW/`, requestOrigin);
    }
  }

  if (!ORCHESTRATOR_FUNCTION_NAME) {
    return serverError('Orchestrator function not configured', requestOrigin);
  }

  // Split keys by type: JPG/JPEG vs RAW (different ImagenAI profiles)
  const jpgKeys = rawKeys.filter((k: string) => /\.(jpg|jpeg)$/i.test(k));
  const rawFileKeys = rawKeys.filter((k: string) => !/\.(jpg|jpeg)$/i.test(k));

  const batches: Array<{ keys: string[]; profileId: string }> = [];
  if (jpgKeys.length > 0) batches.push({ keys: jpgKeys, profileId: IMAGENAI_PROFILE_ID_JPG });
  if (rawFileKeys.length > 0) batches.push({ keys: rawFileKeys, profileId: IMAGENAI_PROFILE_ID_RAW });

  const jobIds: string[] = [];

  for (const batch of batches) {
    const jobId = randomUUID();
    const now = new Date().toISOString();
    jobIds.push(jobId);

    // Create job record in DynamoDB
    await putItem({
      TableName: ADMIN_TABLE!,
      Item: {
        pk: `PROCESSING_JOB#${jobId}`,
        sk: `PROCESSING_JOB#${jobId}`,
        jobId,
        galleryId: '',
        rawKeys: batch.keys,
        status: 'queued',
        source: 'imagen',
        mode: 'manual',
        createdAt: now,
        updatedAt: now,
      },
    });

    // Invoke orchestrator asynchronously with the correct profile
    await lambdaClient.send(new InvokeCommand({
      FunctionName: ORCHESTRATOR_FUNCTION_NAME,
      InvocationType: 'Event',
      Payload: JSON.stringify({
        jobId,
        galleryId: '',
        rawKeys: batch.keys,
        source: 'imagen',
        profileId: batch.profileId,
      }),
    }));
  }

  log('INFO', 'ImagenAI processing jobs created', ctx, { jobIds, fileCount: rawKeys.length, batchCount: batches.length });
  return success({ jobIds }, 200, requestOrigin);
}

async function handleImagenJobs(
  event: APIGatewayProxyEvent,
  method: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method === 'GET') {
    const allJobs = await scanItems<Record<string, unknown>>({
      TableName: ADMIN_TABLE!,
      FilterExpression: 'begins_with(pk, :prefix) AND #source = :source',
      ExpressionAttributeNames: { '#source': 'source' },
      ExpressionAttributeValues: { ':prefix': 'PROCESSING_JOB#', ':source': 'imagen' },
    });

    const jobs = allJobs
      .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

    log('INFO', 'Listed imagen jobs', ctx, { count: jobs.length });
    return success({ jobs }, 200, requestOrigin);
  }

  if (method === 'DELETE') {
    const body = JSON.parse(event.body || '{}');
    const { jobIds } = body;

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return badRequest('jobIds array is required', requestOrigin);
    }

    let deleted = 0;
    for (const jobId of jobIds) {
      const pk = `PROCESSING_JOB#${jobId}`;
      await deleteItem({ TableName: ADMIN_TABLE!, Key: { pk, sk: pk } });
      deleted++;
    }

    log('INFO', 'Deleted imagen jobs', ctx, { count: deleted });
    return success({ deleted }, 200, requestOrigin);
  }

  return methodNotAllowed('Method not allowed', requestOrigin);
}

async function handleImagenEdited(
  event: APIGatewayProxyEvent,
  method: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method === 'GET') {
    const objects = await listS3Objects(MEDIA_BUCKET!, 'imagen/edited/');
    const files = objects.map(obj => ({
      key: obj.key,
      filename: obj.key.split('/').pop() || '',
      size: obj.size,
      lastModified: obj.lastModified?.toISOString() || '',
      url: obj.key,
    }));
    log('INFO', 'Listed imagen edited files', ctx, { count: files.length });
    return success({ files }, 200, requestOrigin);
  }

  if (method === 'DELETE') {
    const body = JSON.parse(event.body || '{}');
    const { keys } = body;

    if (!Array.isArray(keys) || keys.length === 0) {
      return badRequest('keys array is required', requestOrigin);
    }

    // Validate all keys are in imagen/edited/
    for (const key of keys) {
      if (!key.startsWith('imagen/edited/')) {
        return badRequest(`Invalid key: ${key}. All keys must start with imagen/edited/`, requestOrigin);
      }
    }

    await deleteS3Objects(MEDIA_BUCKET!, keys);
    log('INFO', 'Deleted imagen edited files', ctx, { count: keys.length });
    return success({ deleted: keys.length }, 200, requestOrigin);
  }

  return methodNotAllowed('Method not allowed', requestOrigin);
}

async function handleImagenApprove(
  event: APIGatewayProxyEvent,
  method: string,
  ctx: LogContext,
  requestOrigin?: string
): Promise<APIGatewayProxyResult> {
  if (method !== 'POST') {
    return methodNotAllowed('Method not allowed', requestOrigin);
  }

  const body = JSON.parse(event.body || '{}');
  const { keys } = body;

  if (!Array.isArray(keys) || keys.length === 0) {
    return badRequest('keys array is required', requestOrigin);
  }

  // Validate all keys are in imagen/edited/
  for (const key of keys) {
    if (!key.startsWith('imagen/edited/')) {
      return badRequest(`Invalid key: ${key}. All keys must start with imagen/edited/`, requestOrigin);
    }
  }

  let approved = 0;
  for (const key of keys) {
    const filename = key.split('/').pop() || `${randomUUID()}.jpg`;
    const destKey = `staging/ready/${filename}`;
    await copyS3Object(MEDIA_BUCKET!, key, destKey);
    approved++;
  }

  // Delete originals from imagen/edited/ after successful copy
  await deleteS3Objects(MEDIA_BUCKET!, keys);

  log('INFO', 'Approved imagen edits to ready queue', ctx, { count: approved });
  return success({ approved }, 200, requestOrigin);
}
