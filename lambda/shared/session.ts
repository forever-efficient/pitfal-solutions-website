import { randomBytes } from 'crypto';
import { getItem, putItem, deleteItem } from './db';

const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 15 * 60; // 15 minutes
const ATTEMPT_TTL_SECONDS = 30 * 60; // 30 minutes

export interface Session {
  pk: string;
  sk: string;
  token: string;
  createdAt: string;
  expiresAt: number; // Unix timestamp for DynamoDB TTL
  metadata?: Record<string, unknown>;
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createSession(
  tableName: string,
  pkPrefix: string,
  pkId: string,
  metadata?: Record<string, unknown>
): Promise<{ token: string; expiresAt: number }> {
  const token = generateToken();
  const now = new Date();
  const expiresAt = Math.floor(now.getTime() / 1000) + SESSION_DURATION_SECONDS;

  await putItem({
    TableName: tableName,
    Item: {
      pk: `${pkPrefix}#${pkId}`,
      sk: `${token}`,
      token,
      createdAt: now.toISOString(),
      expiresAt,
      ...(metadata && { metadata }),
    },
  });

  return { token, expiresAt };
}

export async function validateSession(
  tableName: string,
  pkPrefix: string,
  pkId: string,
  token: string
): Promise<Session | null> {
  const session = await getItem<Session>({
    TableName: tableName,
    Key: { pk: `${pkPrefix}#${pkId}`, sk: token },
  });

  if (!session) return null;

  // Check if expired (TTL may not have cleaned up yet)
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (session.expiresAt < nowSeconds) return null;

  return session;
}

export async function deleteSession(
  tableName: string,
  pkPrefix: string,
  pkId: string,
  token: string
): Promise<void> {
  await deleteItem({
    TableName: tableName,
    Key: { pk: `${pkPrefix}#${pkId}`, sk: token },
  });
}

export function parseSessionCookie(cookieHeader: string | undefined, cookieName: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Extracts auth token from Authorization header (Bearer) or falls back to cookie.
 * Supports cross-origin token-based auth alongside same-origin cookie auth.
 */
export function parseAuthToken(
  headers: Record<string, string | undefined>,
  cookieName: string
): string | null {
  const authHeader = headers['Authorization'] || headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  const cookieHeader = headers['Cookie'] || headers['cookie'];
  return parseSessionCookie(cookieHeader, cookieName);
}

export function shouldRefreshSession(session: Session): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const remainingSeconds = session.expiresAt - nowSeconds;
  // Refresh if less than half the session duration remains
  return remainingSeconds < SESSION_DURATION_SECONDS / 2;
}

// ============ Login Brute-Force Protection ============

interface LoginAttemptRecord {
  pk: string;
  sk: string;
  failCount: number;
  lockedUntil: number;
  expiresAt: number;
}

export async function checkLoginAttempts(
  tableName: string,
  identifier: string
): Promise<{ locked: boolean; retryAfter?: number }> {
  const record = await getItem<LoginAttemptRecord>({
    TableName: tableName,
    Key: { pk: `LOGIN_ATTEMPT#${identifier}`, sk: 'ATTEMPTS' },
  });

  if (!record) return { locked: false };

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (record.lockedUntil > nowSeconds) {
    return { locked: true, retryAfter: record.lockedUntil - nowSeconds };
  }

  return { locked: false };
}

export async function recordFailedAttempt(
  tableName: string,
  identifier: string
): Promise<void> {
  const record = await getItem<LoginAttemptRecord>({
    TableName: tableName,
    Key: { pk: `LOGIN_ATTEMPT#${identifier}`, sk: 'ATTEMPTS' },
  });

  const nowSeconds = Math.floor(Date.now() / 1000);
  const failCount = (record?.failCount || 0) + 1;
  const lockedUntil = failCount >= MAX_LOGIN_ATTEMPTS
    ? nowSeconds + LOCKOUT_DURATION_SECONDS
    : 0;

  await putItem({
    TableName: tableName,
    Item: {
      pk: `LOGIN_ATTEMPT#${identifier}`,
      sk: 'ATTEMPTS',
      failCount,
      lockedUntil,
      expiresAt: nowSeconds + ATTEMPT_TTL_SECONDS,
    },
  });
}

export async function clearLoginAttempts(
  tableName: string,
  identifier: string
): Promise<void> {
  await deleteItem({
    TableName: tableName,
    Key: { pk: `LOGIN_ATTEMPT#${identifier}`, sk: 'ATTEMPTS' },
  });
}

// ============ Opaque Token Encoding ============

export function encodeToken(id: string, sessionToken: string): string {
  return Buffer.from(`${id}:${sessionToken}`).toString('base64');
}

export function decodeToken(encoded: string): { id: string; token: string } | null {
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) return null;
    const id = decoded.substring(0, colonIndex);
    const token = decoded.substring(colonIndex + 1);
    if (!id || !token) return null;
    return { id, token };
  } catch {
    return null;
  }
}
