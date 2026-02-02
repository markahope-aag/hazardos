import { NextResponse } from 'next/server'

export type CacheProfile =
  | 'immutable'      // Never changes (e.g., versioned assets)
  | 'stable'         // Rarely changes (e.g., OpenAPI spec) - 1 hour
  | 'semi-stable'    // Changes occasionally (e.g., pricing) - 5 minutes
  | 'short'          // Changes frequently but can tolerate brief staleness - 1 minute
  | 'private-short'  // User-specific data that can be cached briefly - 30 seconds
  | 'no-store'       // Never cache (sensitive/real-time data)

const CACHE_PROFILES: Record<CacheProfile, string> = {
  'immutable': 'public, max-age=31536000, immutable',
  'stable': 'public, max-age=3600, stale-while-revalidate=86400',
  'semi-stable': 'public, max-age=300, stale-while-revalidate=600',
  'short': 'public, max-age=60, stale-while-revalidate=120',
  'private-short': 'private, max-age=30',
  'no-store': 'no-store, no-cache, must-revalidate',
}

/**
 * Add cache headers to a NextResponse
 */
export function withCacheHeaders(
  response: NextResponse,
  profile: CacheProfile
): NextResponse {
  response.headers.set('Cache-Control', CACHE_PROFILES[profile])
  return response
}

/**
 * Create a cached JSON response
 */
export function cachedJsonResponse<T>(
  data: T,
  profile: CacheProfile,
  status = 200
): NextResponse {
  const response = NextResponse.json(data, { status })
  response.headers.set('Cache-Control', CACHE_PROFILES[profile])
  return response
}
