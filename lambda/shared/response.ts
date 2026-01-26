import { APIGatewayProxyResult } from 'aws-lambda';

// Production CORS origin - default to production domain, allow override via environment variable
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://www.pitfal.solutions';

// Default CORS headers for production use
const corsHeaders = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With,X-CSRF-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

// Export for use by other modules
export { corsHeaders, CORS_ORIGIN };

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

// Create a successful response
export function success<T>(data: T, statusCode = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
    body: JSON.stringify({
      success: true,
      data,
    } satisfies ApiResponse<T>),
  };
}

// Create a successful response with pagination metadata
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

// Create an error response
export function error(
  message: string,
  statusCode = 400,
  options?: {
    code?: ErrorCode | string;
    fieldErrors?: Array<{ field: string; message: string }>;
  }
): APIGatewayProxyResult {
  const { code, fieldErrors } = options || {};
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
    body: JSON.stringify({
      success: false,
      error: message,
      ...(code && { code }),
      ...(fieldErrors && { errors: fieldErrors }),
    } satisfies ApiResponse),
  };
}

// Common error responses
export function badRequest(message = 'Bad request'): APIGatewayProxyResult {
  return error(message, 400, { code: ErrorCode.BAD_REQUEST });
}

export function unauthorized(message = 'Unauthorized'): APIGatewayProxyResult {
  return error(message, 401, { code: ErrorCode.UNAUTHORIZED });
}

export function forbidden(message = 'Forbidden'): APIGatewayProxyResult {
  return error(message, 403, { code: ErrorCode.FORBIDDEN });
}

export function notFound(message = 'Not found'): APIGatewayProxyResult {
  return error(message, 404, { code: ErrorCode.NOT_FOUND });
}

export function methodNotAllowed(message = 'Method not allowed'): APIGatewayProxyResult {
  return error(message, 405, { code: ErrorCode.METHOD_NOT_ALLOWED });
}

export function conflict(message = 'Conflict'): APIGatewayProxyResult {
  return error(message, 409, { code: ErrorCode.CONFLICT });
}

export function unprocessableEntity(
  message = 'Validation failed',
  fieldErrors?: Array<{ field: string; message: string }>
): APIGatewayProxyResult {
  return error(message, 422, { code: ErrorCode.VALIDATION_FAILED, fieldErrors });
}

export function tooManyRequests(message = 'Too many requests'): APIGatewayProxyResult {
  return error(message, 429, { code: ErrorCode.RATE_LIMITED });
}

export function serverError(message = 'Internal server error'): APIGatewayProxyResult {
  return error(message, 500, { code: ErrorCode.INTERNAL_ERROR });
}

// CORS preflight response
export function corsResponse(): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: '',
  };
}

// Create response with custom headers
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

// Create response with cookie
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

// Clear a cookie
export function clearCookie(
  response: APIGatewayProxyResult,
  name: string,
  path = '/'
): APIGatewayProxyResult {
  return withHeaders(response, {
    'Set-Cookie': `${name}=; Max-Age=0; Path=${path}; HttpOnly; Secure; SameSite=Strict`,
  });
}
