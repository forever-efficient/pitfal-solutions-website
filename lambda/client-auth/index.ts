import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { getItem } from '../shared/db';
import {
  success,
  error,
  unauthorized,
  methodNotAllowed,
  badRequest,
  corsResponse,
  withCookie,
  clearCookie,
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

// Environment variables with validation
const GALLERIES_TABLE = process.env.GALLERIES_TABLE;
const ADMIN_TABLE = process.env.ADMIN_TABLE;
const COOKIE_NAME = 'pitfal_client_session';

if (!GALLERIES_TABLE || !ADMIN_TABLE) {
  throw new Error(
    `Missing required environment variables: ${[
      !GALLERIES_TABLE && 'GALLERIES_TABLE',
      !ADMIN_TABLE && 'ADMIN_TABLE',
    ].filter(Boolean).join(', ')}`
  );
}

// Structured logger
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

interface GalleryRecord {
  id: string;
  passwordHash: string;
  title: string;
  type: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const ctx = getRequestContext(event);
  const requestOrigin = event.headers['origin'] || event.headers['Origin'];

  if (event.httpMethod === 'OPTIONS') {
    return corsResponse(requestOrigin);
  }

  log('INFO', 'Client auth request received', ctx, { method: event.httpMethod });

  switch (event.httpMethod) {
    case 'POST':
      return handleLogin(event, ctx, requestOrigin);
    case 'GET':
      return handleCheck(event, ctx, requestOrigin);
    case 'DELETE':
      return handleLogout(event, ctx, requestOrigin);
    default:
      return methodNotAllowed(undefined, requestOrigin);
  }
};

async function handleLogin(event: APIGatewayProxyEvent, ctx: LogContext, requestOrigin?: string) {
  let body: { galleryId?: string; password?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequest('Invalid JSON', requestOrigin);
  }

  if (!body.galleryId || !body.password) {
    return badRequest('Gallery ID and password are required', requestOrigin);
  }

  const galleryId = body.galleryId;
  ctx.galleryId = galleryId;

  // Check brute-force lockout
  const attemptCheck = await checkLoginAttempts(ADMIN_TABLE!, galleryId);
  if (attemptCheck.locked) {
    log('WARN', 'Client login blocked - gallery locked', ctx, { retryAfter: attemptCheck.retryAfter });
    return tooManyRequests('Too many login attempts. Please try again later.', requestOrigin);
  }

  // Fetch gallery from galleries table
  const gallery = await getItem<GalleryRecord>({
    TableName: GALLERIES_TABLE,
    Key: { id: galleryId },
  });

  if (!gallery || !gallery.passwordHash) {
    log('WARN', 'Gallery not found or no password set', ctx);
    // Use constant-time response to prevent gallery enumeration
    await bcrypt.hash('dummy', 10);
    await recordFailedAttempt(ADMIN_TABLE!, galleryId);
    return unauthorized('Invalid gallery ID or password', requestOrigin);
  }

  const passwordValid = await bcrypt.compare(body.password, gallery.passwordHash);
  if (!passwordValid) {
    log('WARN', 'Invalid password attempt', ctx);
    await recordFailedAttempt(ADMIN_TABLE!, galleryId);
    return unauthorized('Invalid gallery ID or password', requestOrigin);
  }

  // Clear failed attempts on successful login
  await clearLoginAttempts(ADMIN_TABLE!, galleryId);

  // Create session in admin table
  const { token, expiresAt } = await createSession(ADMIN_TABLE!, 'GALLERY_SESSION', galleryId, {
    galleryTitle: gallery.title,
  });

  log('INFO', 'Client session created', ctx);

  const cookieValue = encodeToken(galleryId, token);
  const maxAge = expiresAt - Math.floor(Date.now() / 1000);

  return withCookie(
    success({ authenticated: true, galleryId, galleryTitle: gallery.title, token: cookieValue }, 200, requestOrigin),
    COOKIE_NAME,
    cookieValue,
    { maxAge, sameSite: 'Lax' }
  );
}

async function handleCheck(event: APIGatewayProxyEvent, ctx: LogContext, requestOrigin?: string) {
  const tokenValue = parseAuthToken(event.headers, COOKIE_NAME);

  if (!tokenValue) {
    return success({ authenticated: false }, 200, requestOrigin);
  }

  const decoded = decodeToken(tokenValue);
  if (!decoded) {
    return success({ authenticated: false }, 200, requestOrigin);
  }

  ctx.galleryId = decoded.id;
  const session = await validateSession(ADMIN_TABLE!, 'GALLERY_SESSION', decoded.id, decoded.token);

  if (!session) {
    log('INFO', 'Invalid or expired session', ctx);
    return clearCookie(
      success({ authenticated: false }, 200, requestOrigin),
      COOKIE_NAME
    );
  }

  log('INFO', 'Session validated', ctx);
  return success({ authenticated: true, galleryId: decoded.id }, 200, requestOrigin);
}

async function handleLogout(event: APIGatewayProxyEvent, ctx: LogContext, requestOrigin?: string) {
  const tokenValue = parseAuthToken(event.headers, COOKIE_NAME);

  if (tokenValue) {
    const decoded = decodeToken(tokenValue);
    if (decoded) {
      ctx.galleryId = decoded.id;
      await deleteSession(ADMIN_TABLE!, 'GALLERY_SESSION', decoded.id, decoded.token);
      log('INFO', 'Client session deleted', ctx);
    }
  }

  return clearCookie(
    success({ authenticated: false }, 200, requestOrigin),
    COOKIE_NAME
  );
}
