import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { randomUUID, createHmac, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import { getItem } from '../shared/db';
import {
  success,
  unauthorized,
  methodNotAllowed,
  badRequest,
  corsResponse,
  withCookie,
  clearCookie,
  tooManyRequests,
} from '../shared/response';
import {
  parseAuthToken,
  checkLoginAttempts,
  recordFailedAttempt,
  clearLoginAttempts,
} from '../shared/session';

// Environment variables with validation
const GALLERIES_TABLE = process.env.GALLERIES_TABLE;
const ADMIN_TABLE = process.env.ADMIN_TABLE;
const GALLERY_TOKEN_SECRET = process.env.GALLERY_TOKEN_SECRET;
const COOKIE_NAME = 'pitfal_client_session';
const TOKEN_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

if (!GALLERIES_TABLE || !ADMIN_TABLE || !GALLERY_TOKEN_SECRET) {
  throw new Error(
    `Missing required environment variables: ${[
      !GALLERIES_TABLE && 'GALLERIES_TABLE',
      !ADMIN_TABLE && 'ADMIN_TABLE',
      !GALLERY_TOKEN_SECRET && 'GALLERY_TOKEN_SECRET',
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
  passwordHash?: string;
  title: string;
  type: string;
}

interface GalleryTokenPayload {
  galleryId: string;
  galleryTitle: string;
  exp: number;
  noPassword?: boolean;
}

/**
 * Issue a signed gallery access token.
 * noPassword=true means the token was issued for a gallery with no password.
 * On each check, noPassword tokens re-verify the gallery hasn't since gained a password.
 */
function issueToken(galleryId: string, galleryTitle: string, noPassword = false): string {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_DURATION_SECONDS;
  const payloadJson = JSON.stringify({
    galleryId,
    galleryTitle,
    exp,
    ...(noPassword && { noPassword: true }),
  });
  const payload = Buffer.from(payloadJson).toString('base64url');
  const sig = createHmac('sha256', GALLERY_TOKEN_SECRET!).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): GalleryTokenPayload | null {
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

  const gallery = await getItem<GalleryRecord>({
    TableName: GALLERIES_TABLE!,
    Key: { id: galleryId },
  });

  if (!gallery || !gallery.passwordHash) {
    log('WARN', 'Gallery not found or no password set', ctx);
    await bcrypt.hash('dummy', 10); // constant-time response
    await recordFailedAttempt(ADMIN_TABLE!, galleryId);
    return unauthorized('Invalid gallery ID or password', requestOrigin);
  }

  const passwordValid = await bcrypt.compare(body.password, gallery.passwordHash);
  if (!passwordValid) {
    log('WARN', 'Invalid password attempt', ctx);
    await recordFailedAttempt(ADMIN_TABLE!, galleryId);
    return unauthorized('Invalid gallery ID or password', requestOrigin);
  }

  await clearLoginAttempts(ADMIN_TABLE!, galleryId);

  const token = issueToken(galleryId, gallery.title, false);
  log('INFO', 'Client token issued', ctx);

  return withCookie(
    success({ authenticated: true, galleryId, galleryTitle: gallery.title, token, passwordRequired: true }, 200, requestOrigin),
    COOKIE_NAME,
    token,
    { maxAge: TOKEN_DURATION_SECONDS, sameSite: 'Lax' }
  );
}

async function handleCheck(event: APIGatewayProxyEvent, ctx: LogContext, requestOrigin?: string) {
  const tokenValue = parseAuthToken(event.headers, COOKIE_NAME);
  const requestedGalleryId = event.queryStringParameters?.galleryId;

  // Try to validate the existing token
  if (tokenValue) {
    const payload = verifyToken(tokenValue);
    if (payload && (!requestedGalleryId || payload.galleryId === requestedGalleryId)) {
      ctx.galleryId = payload.galleryId;

      // For no-password tokens, verify the gallery hasn't since gained a password
      if (payload.noPassword) {
        const gallery = await getItem<GalleryRecord>({
          TableName: GALLERIES_TABLE!,
          Key: { id: payload.galleryId },
        });
        if (!gallery || gallery.passwordHash) {
          log('INFO', 'No-password token invalidated: gallery now requires a password', ctx);
          return clearCookie(success({ authenticated: false }, 200, requestOrigin), COOKIE_NAME);
        }
      }

      log('INFO', 'Token validated', ctx);
      return success(
        {
          authenticated: true,
          galleryId: payload.galleryId,
          galleryTitle: payload.galleryTitle,
          passwordRequired: !payload.noPassword,
        },
        200,
        requestOrigin
      );
    }
    // Token invalid or for a different gallery — fall through to auto-auth
  }

  // No valid token for this gallery — check if auto-auth is possible
  if (requestedGalleryId) {
    const gallery = await getItem<GalleryRecord>({
      TableName: GALLERIES_TABLE!,
      Key: { id: requestedGalleryId },
    });
    if (gallery && !gallery.passwordHash) {
      ctx.galleryId = requestedGalleryId;
      const token = issueToken(requestedGalleryId, gallery.title, true);
      log('INFO', 'Auto-authenticated for password-free gallery', ctx);
      return withCookie(
        success(
          {
            authenticated: true,
            galleryId: requestedGalleryId,
            galleryTitle: gallery.title,
            token,
            passwordRequired: false,
          },
          200,
          requestOrigin
        ),
        COOKIE_NAME,
        token,
        { maxAge: TOKEN_DURATION_SECONDS, sameSite: 'Lax' }
      );
    }
  }

  return success({ authenticated: false }, 200, requestOrigin);
}

async function handleLogout(event: APIGatewayProxyEvent, ctx: LogContext, requestOrigin?: string) {
  // Tokens are stateless — just clear the cookie client-side
  log('INFO', 'Client session cleared', ctx);
  return clearCookie(success({ authenticated: false }, 200, requestOrigin), COOKIE_NAME);
}
