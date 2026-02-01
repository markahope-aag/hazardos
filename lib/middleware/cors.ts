/**
 * CORS Middleware
 *
 * Provides fine-grained CORS control for API routes.
 * Handles preflight (OPTIONS) requests and adds appropriate headers.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getCorsHeaders,
  getCorsPolicy,
  isOriginAllowed,
  type CorsPolicy,
} from '@/lib/config/cors';

/**
 * Handle CORS preflight (OPTIONS) request
 */
export function handlePreflight(
  request: NextRequest,
  policy?: CorsPolicy
): NextResponse {
  const pathname = request.nextUrl.pathname;
  const origin = request.headers.get('origin');
  const effectivePolicy = policy || getCorsPolicy(pathname);

  const headers = getCorsHeaders(origin, effectivePolicy, true);

  return new NextResponse(null, {
    status: 204,
    headers,
  });
}

/**
 * Add CORS headers to an existing response
 */
export function addCorsHeaders(
  response: NextResponse,
  request: NextRequest,
  policy?: CorsPolicy
): NextResponse {
  const pathname = request.nextUrl.pathname;
  const origin = request.headers.get('origin');
  const effectivePolicy = policy || getCorsPolicy(pathname);

  const corsHeaders = getCorsHeaders(origin, effectivePolicy, false);

  // Add CORS headers to response
  for (const [key, value] of Object.entries(corsHeaders) as [string, string][]) {
    response.headers.set(key, value);
  }

  return response;
}

/**
 * CORS middleware wrapper for API route handlers
 *
 * @example
 * // In a route.ts file:
 * import { withCors } from '@/lib/middleware/cors';
 *
 * async function handler(request: NextRequest) {
 *   return NextResponse.json({ data: 'example' });
 * }
 *
 * export const GET = withCors(handler);
 * export const POST = withCors(handler);
 * export const OPTIONS = withCors(); // For preflight
 */
export function withCors(
  handler?: (request: NextRequest) => Promise<NextResponse>,
  policy?: CorsPolicy
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const pathname = request.nextUrl.pathname;
    const origin = request.headers.get('origin');
    const effectivePolicy = policy || getCorsPolicy(pathname);

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return handlePreflight(request, effectivePolicy);
    }

    // Validate origin for policies that require it
    if (effectivePolicy === 'internal' && origin) {
      if (!isOriginAllowed(origin, effectivePolicy)) {
        return new NextResponse(
          JSON.stringify({ error: 'Origin not allowed' }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // If no handler provided, return 405 Method Not Allowed
    if (!handler) {
      return new NextResponse(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            Allow: 'OPTIONS',
          },
        }
      );
    }

    // Execute the handler
    const response = await handler(request);

    // Add CORS headers to the response
    return addCorsHeaders(response, request, effectivePolicy);
  };
}

/**
 * Create a CORS-enabled OPTIONS handler
 */
export function createOptionsHandler(policy?: CorsPolicy) {
  return async (request: NextRequest): Promise<NextResponse> => {
    return handlePreflight(request, policy);
  };
}

/**
 * Middleware function for Next.js middleware.ts
 * Handles CORS at the edge for all API routes
 */
export function corsMiddleware(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname;

  // Only handle API routes
  if (!pathname.startsWith('/api/')) {
    return null;
  }

  const origin = request.headers.get('origin');
  const policy = getCorsPolicy(pathname);

  // Handle preflight requests at the edge
  if (request.method === 'OPTIONS') {
    return handlePreflight(request, policy);
  }

  // For internal policies with an origin, validate it
  if (policy === 'internal' && origin) {
    if (!isOriginAllowed(origin, policy)) {
      return new NextResponse(
        JSON.stringify({ error: 'Origin not allowed' }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }

  // Let the request continue - headers will be added by the route handler
  return null;
}
