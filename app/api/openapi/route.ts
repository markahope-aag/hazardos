import { NextRequest, NextResponse } from 'next/server'
import { openApiSpec } from '@/lib/openapi/openapi-spec'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'
import { addCorsHeaders, handlePreflight } from '@/lib/middleware/cors'
import { withCacheHeaders } from '@/lib/utils/cache-headers'

/**
 * GET /api/openapi
 * Returns the OpenAPI specification as JSON
 * This can be used by external tools like Postman, Insomnia, etc.
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting for public endpoints
  const rateLimitResponse = await applyUnifiedRateLimit(request, 'public')
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const response = NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Add cache headers - OpenAPI spec is stable, cache for 1 hour
  withCacheHeaders(response, 'stable')

  // Add CORS headers for openapi documentation
  return addCorsHeaders(response, request, 'openapi')
}

/**
 * OPTIONS /api/openapi
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request, 'openapi')
}
