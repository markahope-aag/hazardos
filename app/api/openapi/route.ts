import { NextResponse } from 'next/server'
import { openApiSpec } from '@/lib/openapi/openapi-spec'

/**
 * GET /api/openapi
 * Returns the OpenAPI specification as JSON
 * This can be used by external tools like Postman, Insomnia, etc.
 */
export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
      // Allow CORS for external tools
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    },
  })
}
