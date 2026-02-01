import { NextRequest, NextResponse } from 'next/server'
import { openApiSpec } from '@/lib/openapi/openapi-spec'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'

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

  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
      // Allow CORS for external tools
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    },
  })
}
