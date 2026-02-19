import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
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
import { sendTemplatedEmail } from '../shared/email';

// Environment variables
const ADMIN_TABLE = process.env.ADMIN_TABLE;
const GALLERIES_TABLE = process.env.GALLERIES_TABLE;
const INQUIRIES_TABLE = process.env.INQUIRIES_TABLE;
const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE;
const MEDIA_BUCKET = process.env.MEDIA_BUCKET;
const ORCHESTRATOR_FUNCTION_NAME = process.env.ORCHESTRATOR_FUNCTION_NAME;
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

interface GalleryRecord {
  id: string;
  title: string;
  description?: string;
  category: string;
  type: string;
  slug: string;
  images: Array<{ key: string; alt?: string }>;
  heroImage?: string; // S3 key for gallery cover/hero image
  sections?: GallerySection[];
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
        sectionCount: g.sections?.length || 0,
        heroImage: g.heroImage || null,
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
      heroImage?: string;
      sections?: GallerySection[];
    };
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return badRequest('Invalid JSON', requestOrigin);
    }

    if (!body.title || !body.category || !body.type || !body.slug) {
      return badRequest('title, category, type, and slug are required', requestOrigin);
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
      type: body.type,
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

    // Validate sections if provided
    if (body.sections !== undefined && body.sections !== null && !validateSections(body.sections as GallerySection[])) {
      return badRequest('Invalid sections: each section must have id, title, and images array', requestOrigin);
    }

    // Build update expression from allowed fields
    const allowedFields = ['title', 'description', 'category', 'type', 'slug', 'featured', 'images', 'heroImage', 'sections', 'heroFocalPoint', 'heroZoom', 'heroGradientOpacity', 'heroHeight'];
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
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequest('Invalid JSON', requestOrigin);
  }

  if (method === 'POST') {
    if (!body.galleryId || !body.filename || (!body.contentType && !body.isRaw)) {
      return badRequest('galleryId, filename, and contentType are required', requestOrigin);
    }

    const isRaw = body.isRaw === true;
    const prefix = isRaw ? 'staging' : 'finished';
    const contentType = isRaw ? 'application/octet-stream' : (body.contentType as string);
    const key = `${prefix}/${body.galleryId}/${randomUUID()}-${body.filename}`;
    const uploadUrl = await generatePresignedUploadUrl(MEDIA_BUCKET!, key, contentType, 3600);

    log('INFO', 'Upload URL generated', ctx, { galleryId: body.galleryId as string, key });
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

    // Remove from S3
    await deleteS3Objects(MEDIA_BUCKET!, [imageKey]);

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

    log('INFO', 'Image deleted', ctx, { galleryId, imageKey });
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
