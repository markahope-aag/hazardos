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
  profile: CacheProfile,
  cacheKey?: string
): NextResponse {
  const cacheControl = CACHE_PROFILES[profile]
  
  // If a cache key is provided, make it tenant-specific
  if (cacheKey) {
    // Add Vary header to ensure different cache entries per tenant
    response.headers.set('Vary', 'Authorization, Cookie')
    // Add custom cache key header for debugging (non-sensitive)
    response.headers.set('X-Cache-Key-Hash', hashCacheKey(cacheKey))
  }
  
  response.headers.set('Cache-Control', cacheControl)
  return response
}

/**
 * Create a simple hash of the cache key for debugging purposes
 */
function hashCacheKey(key: string): string {
  // Simple hash function for cache key identification (not cryptographic)
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16)
}

/**
 * Create a cached JSON response
 */
export function cachedJsonResponse<T>(
  data: T,
  profile: CacheProfile,
  status = 200,
  cacheKey?: string
): NextResponse {
  const response = NextResponse.json(data, { status })
  return withCacheHeaders(response, profile, cacheKey)
}
