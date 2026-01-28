/**
 * @fileoverview API response utilities for Lambda functions.
 * Provides standardized response formatting, CORS headers, error codes,
 * and common HTTP response patterns.
 * @module lambda/shared/response
 */

import { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Allowed CORS origins - supports both root and www subdomain.
 * Can be configured via CORS_ALLOWED_ORIGINS env var (comma-separated) or defaults to production domains.
 */
const CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['https://www.pitfal.solutions', 'https://pitfal.solutions'];

/** Default CORS origin (used when no origin header is present) */
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://www.pitfal.solutions';

/**
 * Returns the appropriate CORS origin header value based on the request origin.
 * If the request origin is in the allowed list, it's returned; otherwise returns default.
 */
export function getCorsOrigin(requestOrigin?: string): string {
  if (requestOrigin && CORS_ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  return CORS_ORIGIN;
}

/**
 * Creates CORS headers with dynamic origin based on the request.
 * @param requestOrigin - The Origin header from the incoming request
 */
export function createCorsHeaders(requestOrigin?: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(requestOrigin),
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With,X-CSRF-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Default CORS headers for backward compatibility (uses default origin)
const corsHeaders = createCorsHeaders();

// Export for use by other modules
export { corsHeaders, CORS_ORIGIN, CORS_ALLOWED_ORIGINS };

// Error codes for debugging and client handling
export enum ErrorCode {
  // 4xx Client errors
  BAD_REQUEST = 'ERR_BAD_REQUEST',
  UNAUTHORIZED = 'ERR_UNAUTHORIZED',
  FORBIDDEN = 'ERR_FORBIDDEN',
  NOT_FOUND = 'ERR_NOT_FOUND',
  METHOD_NOT_ALLOWED = 'ERR_METHOD_NOT_ALLOWED',
  CONFLICT = 'ERR_CONFLICT',
  VALIDATION_FAILED = 'ERR_VALIDATION_FAILED',
  RATE_LIMITED = 'ERR_RATE_LIMITED',
  INVALID_JSON = 'ERR_INVALID_JSON',

  // 5xx Server errors
  INTERNAL_ERROR = 'ERR_INTERNAL',
  DATABASE_ERROR = 'ERR_DATABASE',
  EMAIL_ERROR = 'ERR_EMAIL',
  EXTERNAL_SERVICE = 'ERR_EXTERNAL_SERVICE',
}

// Standard response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: ErrorCode | string;
  errors?: Array<{ field: string; message: string }>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

/**
 * Creates a successful API response with JSON body.
 * @template T - Type of the response data
 * @param data - Response payload to include in the body
 * @param statusCode - HTTP status code (default: 200)
 * @param requestOrigin - Origin header from request for dynamic CORS
 * @returns Formatted API Gateway response with CORS headers
 * @example
 * return success({ message: 'Created', id: '123' }, 201);
 */
export function success<T>(data: T, statusCode = 200, requestOrigin?: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...createCorsHeaders(requestOrigin),
    },
    body: JSON.stringify({
      success: true,
      data,
    } satisfies ApiResponse<T>),
  };
}

/**
 * Creates a successful paginated response with metadata.
 * @template T - Type of the response data
 * @param data - Response payload (typically an array)
 * @param meta - Pagination metadata (page, limit, total)
 * @param statusCode - HTTP status code (default: 200)
 * @returns Formatted response with pagination info and hasMore flag
 */
export function successWithMeta<T>(
  data: T,
  meta: { page: number; limit: number; total: number },
  statusCode = 200
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
    body: JSON.stringify({
      success: true,
      data,
      meta: {
        ...meta,
        hasMore: meta.page * meta.limit < meta.total,
      },
    } satisfies ApiResponse<T>),
  };
}

/**
 * Creates an error API response with optional error code and field errors.
 * @param message - Human-readable error message
 * @param statusCode - HTTP status code (default: 400)
 * @param options - Optional error code, field-level validation errors, and request origin for CORS
 * @returns Formatted error response with CORS headers
 * @example
 * return error('Invalid email', 400, {
 *   code: ErrorCode.VALIDATION_FAILED,
 *   fieldErrors: [{ field: 'email', message: 'Invalid format' }]
 * });
 */
export function error(
  message: string,
  statusCode = 400,
  options?: {
    code?: ErrorCode | string;
    fieldErrors?: Array<{ field: string; message: string }>;
    requestOrigin?: string;
  }
): APIGatewayProxyResult {
  const { code, fieldErrors, requestOrigin } = options || {};
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...createCorsHeaders(requestOrigin),
    },
    body: JSON.stringify({
      success: false,
      error: message,
      ...(code && { code }),
      ...(fieldErrors && { errors: fieldErrors }),
    } satisfies ApiResponse),
  };
}

/** Returns a 400 Bad Request response */
export function badRequest(message = 'Bad request', requestOrigin?: string): APIGatewayProxyResult {
  return error(message, 400, { code: ErrorCode.BAD_REQUEST, requestOrigin });
}

/** Returns a 401 Unauthorized response */
export function unauthorized(message = 'Unauthorized', requestOrigin?: string): APIGatewayProxyResult {
  return error(message, 401, { code: ErrorCode.UNAUTHORIZED, requestOrigin });
}

/** Returns a 403 Forbidden response */
export function forbidden(message = 'Forbidden', requestOrigin?: string): APIGatewayProxyResult {
  return error(message, 403, { code: ErrorCode.FORBIDDEN, requestOrigin });
}

/** Returns a 404 Not Found response */
export function notFound(message = 'Not found', requestOrigin?: string): APIGatewayProxyResult {
  return error(message, 404, { code: ErrorCode.NOT_FOUND, requestOrigin });
}

/** Returns a 405 Method Not Allowed response */
export function methodNotAllowed(message = 'Method not allowed', requestOrigin?: string): APIGatewayProxyResult {
  return error(message, 405, { code: ErrorCode.METHOD_NOT_ALLOWED, requestOrigin });
}

/** Returns a 409 Conflict response */
export function conflict(message = 'Conflict', requestOrigin?: string): APIGatewayProxyResult {
  return error(message, 409, { code: ErrorCode.CONFLICT, requestOrigin });
}

/**
 * Returns a 422 Unprocessable Entity response for validation failures.
 * @param message - Error message
 * @param fieldErrors - Array of field-level validation errors
 * @param requestOrigin - Origin header from request for dynamic CORS
 */
export function unprocessableEntity(
  message = 'Validation failed',
  fieldErrors?: Array<{ field: string; message: string }>,
  requestOrigin?: string
): APIGatewayProxyResult {
  return error(message, 422, { code: ErrorCode.VALIDATION_FAILED, fieldErrors, requestOrigin });
}

/** Returns a 429 Too Many Requests response for rate limiting */
export function tooManyRequests(message = 'Too many requests', requestOrigin?: string): APIGatewayProxyResult {
  return error(message, 429, { code: ErrorCode.RATE_LIMITED, requestOrigin });
}

/** Returns a 500 Internal Server Error response */
export function serverError(message = 'Internal server error', requestOrigin?: string): APIGatewayProxyResult {
  return error(message, 500, { code: ErrorCode.INTERNAL_ERROR, requestOrigin });
}

/**
 * Returns an empty response for CORS preflight (OPTIONS) requests.
 * @param requestOrigin - Origin header from request for dynamic CORS
 * @returns 200 response with CORS headers and empty body
 */
export function corsResponse(requestOrigin?: string): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: createCorsHeaders(requestOrigin),
    body: '',
  };
}

/**
 * Adds custom headers to an existing response.
 * @param response - The original API Gateway response
 * @param additionalHeaders - Headers to add/override
 * @returns New response object with merged headers
 */
export function withHeaders(
  response: APIGatewayProxyResult,
  additionalHeaders: Record<string, string>
): APIGatewayProxyResult {
  return {
    ...response,
    headers: {
      ...response.headers,
      ...additionalHeaders,
    },
  };
}

/**
 * Adds a Set-Cookie header to the response.
 * Defaults to secure HttpOnly cookies with 7-day expiration.
 * @param response - The original API Gateway response
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options (maxAge, httpOnly, secure, sameSite, path)
 * @returns Response with Set-Cookie header
 */
export function withCookie(
  response: APIGatewayProxyResult,
  name: string,
  value: string,
  options: {
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    path?: string;
  } = {}
): APIGatewayProxyResult {
  const {
    maxAge = 604800, // 7 days
    httpOnly = true,
    secure = true,
    sameSite = 'Strict',
    path = '/',
  } = options;

  const cookieParts = [
    `${name}=${value}`,
    `Max-Age=${maxAge}`,
    `Path=${path}`,
    `SameSite=${sameSite}`,
  ];

  if (httpOnly) cookieParts.push('HttpOnly');
  if (secure) cookieParts.push('Secure');

  return withHeaders(response, {
    'Set-Cookie': cookieParts.join('; '),
  });
}

/**
 * Clears a cookie by setting its Max-Age to 0.
 * @param response - The original API Gateway response
 * @param name - Cookie name to clear
 * @param path - Cookie path (default: '/')
 * @returns Response with cookie-clearing Set-Cookie header
 */
export function clearCookie(
  response: APIGatewayProxyResult,
  name: string,
  path = '/'
): APIGatewayProxyResult {
  return withHeaders(response, {
    'Set-Cookie': `${name}=; Max-Age=0; Path=${path}; HttpOnly; Secure; SameSite=Strict`,
  });
}
