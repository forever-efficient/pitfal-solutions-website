// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The response module reads env vars at load time and caches them.
// We need to reset modules to test different env configurations.
beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe('response module', () => {
  describe('getCorsOrigin', () => {
    it('returns the request origin when it is in the allowed list', async () => {
      vi.stubEnv('CORS_ALLOWED_ORIGINS', 'https://example.com,https://www.example.com');
      const { getCorsOrigin } = await import('../../../lambda/shared/response');
      expect(getCorsOrigin('https://example.com')).toBe('https://example.com');
    });

    it('returns default origin when request origin is not allowed', async () => {
      vi.stubEnv('CORS_ALLOWED_ORIGINS', 'https://example.com');
      vi.stubEnv('CORS_ORIGIN', 'https://example.com');
      const { getCorsOrigin } = await import('../../../lambda/shared/response');
      expect(getCorsOrigin('https://evil.com')).toBe('https://example.com');
    });

    it('returns default origin when no request origin provided', async () => {
      vi.stubEnv('CORS_ORIGIN', 'https://default.com');
      const { getCorsOrigin } = await import('../../../lambda/shared/response');
      expect(getCorsOrigin()).toBe('https://default.com');
    });

    it('trims whitespace from CORS_ALLOWED_ORIGINS entries', async () => {
      vi.stubEnv('CORS_ALLOWED_ORIGINS', '  https://a.com , https://b.com  ');
      const { getCorsOrigin } = await import('../../../lambda/shared/response');
      expect(getCorsOrigin('https://a.com')).toBe('https://a.com');
      expect(getCorsOrigin('https://b.com')).toBe('https://b.com');
    });

    it('uses hardcoded defaults when env vars not set', async () => {
      // Don't set any env vars - module should fall back to pitfal.solutions defaults
      const { getCorsOrigin } = await import('../../../lambda/shared/response');
      expect(getCorsOrigin('https://www.pitfal.solutions')).toBe('https://www.pitfal.solutions');
    });
  });

  describe('createCorsHeaders', () => {
    it('includes all required CORS headers', async () => {
      vi.stubEnv('CORS_ALLOWED_ORIGINS', 'https://test.com');
      vi.stubEnv('CORS_ORIGIN', 'https://test.com');
      const { createCorsHeaders } = await import('../../../lambda/shared/response');
      const headers = createCorsHeaders('https://test.com');

      expect(headers['Access-Control-Allow-Origin']).toBe('https://test.com');
      expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
      expect(headers['Access-Control-Allow-Headers']).toContain('X-Requested-With');
      expect(headers['Access-Control-Allow-Methods']).toContain('POST');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });
  });

  // For tests below, we don't need to reset modules - just import once
  describe('success', () => {
    it('returns 200 with JSON body', async () => {
      const { success } = await import('../../../lambda/shared/response');
      const result = success({ message: 'ok' });

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.message).toBe('ok');
    });

    it('respects custom status code', async () => {
      const { success } = await import('../../../lambda/shared/response');
      const result = success({ id: '123' }, 201);
      expect(result.statusCode).toBe(201);
    });

    it('includes Content-Type header', async () => {
      const { success } = await import('../../../lambda/shared/response');
      const result = success({});
      expect(result.headers?.['Content-Type']).toBe('application/json');
    });
  });

  describe('successWithMeta', () => {
    it('includes pagination metadata', async () => {
      const { successWithMeta } = await import('../../../lambda/shared/response');
      const result = successWithMeta([1, 2, 3], { page: 1, limit: 10, total: 25 });
      const body = JSON.parse(result.body);

      expect(body.success).toBe(true);
      expect(body.meta.page).toBe(1);
      expect(body.meta.limit).toBe(10);
      expect(body.meta.total).toBe(25);
      expect(body.meta.hasMore).toBe(true);
    });

    it('sets hasMore to false when on last page', async () => {
      const { successWithMeta } = await import('../../../lambda/shared/response');
      const result = successWithMeta([1], { page: 3, limit: 10, total: 25 });
      const body = JSON.parse(result.body);
      expect(body.meta.hasMore).toBe(false);
    });
  });

  describe('error', () => {
    it('returns error with status code and message', async () => {
      const { error, ErrorCode } = await import('../../../lambda/shared/response');
      const result = error('Bad input', 400, { code: ErrorCode.BAD_REQUEST });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Bad input');
      expect(body.code).toBe('ERR_BAD_REQUEST');
    });

    it('includes field errors when provided', async () => {
      const { error, ErrorCode } = await import('../../../lambda/shared/response');
      const fieldErrors = [{ field: 'name', message: 'Required' }];
      const result = error('Validation failed', 400, {
        code: ErrorCode.VALIDATION_FAILED,
        fieldErrors,
      });
      const body = JSON.parse(result.body);

      expect(body.errors).toHaveLength(1);
      expect(body.errors[0].field).toBe('name');
    });

    it('omits code and errors when not provided', async () => {
      const { error } = await import('../../../lambda/shared/response');
      const result = error('Something went wrong', 500);
      const body = JSON.parse(result.body);

      expect(body.code).toBeUndefined();
      expect(body.errors).toBeUndefined();
    });
  });

  describe('convenience response functions', () => {
    it('badRequest returns 400', async () => {
      const { badRequest } = await import('../../../lambda/shared/response');
      expect(badRequest().statusCode).toBe(400);
    });

    it('unauthorized returns 401', async () => {
      const { unauthorized } = await import('../../../lambda/shared/response');
      expect(unauthorized().statusCode).toBe(401);
    });

    it('forbidden returns 403', async () => {
      const { forbidden } = await import('../../../lambda/shared/response');
      expect(forbidden().statusCode).toBe(403);
    });

    it('notFound returns 404', async () => {
      const { notFound } = await import('../../../lambda/shared/response');
      expect(notFound().statusCode).toBe(404);
    });

    it('methodNotAllowed returns 405', async () => {
      const { methodNotAllowed } = await import('../../../lambda/shared/response');
      expect(methodNotAllowed().statusCode).toBe(405);
    });

    it('conflict returns 409', async () => {
      const { conflict } = await import('../../../lambda/shared/response');
      expect(conflict().statusCode).toBe(409);
    });

    it('tooManyRequests returns 429', async () => {
      const { tooManyRequests } = await import('../../../lambda/shared/response');
      expect(tooManyRequests().statusCode).toBe(429);
    });

    it('serverError returns 500', async () => {
      const { serverError } = await import('../../../lambda/shared/response');
      expect(serverError().statusCode).toBe(500);
    });

    it('unprocessableEntity returns 422 with field errors', async () => {
      const { unprocessableEntity } = await import('../../../lambda/shared/response');
      const result = unprocessableEntity('Bad data', [{ field: 'email', message: 'Invalid' }]);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(422);
      expect(body.errors).toHaveLength(1);
    });

    it('corsResponse returns 200 with empty body', async () => {
      const { corsResponse } = await import('../../../lambda/shared/response');
      const result = corsResponse();

      expect(result.statusCode).toBe(200);
      expect(result.body).toBe('');
      expect(result.headers?.['Access-Control-Allow-Origin']).toBeDefined();
    });
  });

  describe('withHeaders', () => {
    it('adds headers to existing response', async () => {
      const { success, withHeaders } = await import('../../../lambda/shared/response');
      const response = success({});
      const result = withHeaders(response, { 'X-Custom': 'value' });

      expect(result.headers?.['X-Custom']).toBe('value');
      expect(result.headers?.['Content-Type']).toBe('application/json');
    });
  });

  describe('withCookie', () => {
    it('sets a secure HttpOnly cookie by default', async () => {
      const { success, withCookie } = await import('../../../lambda/shared/response');
      const response = success({});
      const result = withCookie(response, 'session', 'abc123');
      const cookie = result.headers?.['Set-Cookie'] as string;

      expect(cookie).toContain('session=abc123');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Max-Age=604800');
      expect(cookie).toContain('Path=/');
    });

    it('respects custom cookie options', async () => {
      const { success, withCookie } = await import('../../../lambda/shared/response');
      const response = success({});
      const result = withCookie(response, 'token', 'xyz', {
        maxAge: 3600,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
        path: '/api',
      });
      const cookie = result.headers?.['Set-Cookie'] as string;

      expect(cookie).toContain('Max-Age=3600');
      expect(cookie).toContain('Path=/api');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).not.toContain('HttpOnly');
      expect(cookie).not.toContain('Secure');
    });
  });

  describe('clearCookie', () => {
    it('sets Max-Age to 0', async () => {
      const { success, clearCookie } = await import('../../../lambda/shared/response');
      const response = success({});
      const result = clearCookie(response, 'session');
      const cookie = result.headers?.['Set-Cookie'] as string;

      expect(cookie).toContain('session=');
      expect(cookie).toContain('Max-Age=0');
    });
  });

  describe('ErrorCode enum', () => {
    it('has expected error codes', async () => {
      const { ErrorCode } = await import('../../../lambda/shared/response');

      expect(ErrorCode.BAD_REQUEST).toBe('ERR_BAD_REQUEST');
      expect(ErrorCode.UNAUTHORIZED).toBe('ERR_UNAUTHORIZED');
      expect(ErrorCode.VALIDATION_FAILED).toBe('ERR_VALIDATION_FAILED');
      expect(ErrorCode.DATABASE_ERROR).toBe('ERR_DATABASE');
      expect(ErrorCode.RATE_LIMITED).toBe('ERR_RATE_LIMITED');
    });
  });
});
