import { NextRequest, NextResponse } from 'next/server'
import { applyMemoryRateLimit, type MemoryRateLimiterType } from './memory-rate-limit'

// Check if Redis is available at runtime
const hasRedis = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// Type for the dynamically imported rate limit module
interface RateLimitModule {
  applyRateLimit: (request: NextRequest, type?: MemoryRateLimiterType) => Promise<NextResponse | null>
}

// Dynamic import for Redis rate limiting
let redisRateLimit: RateLimitModule | null = null
if (hasRedis) {
  try {
    // This will be loaded dynamically when needed
    import('./rate-limit').then(module => {
      redisRateLimit = module
    }).catch(() => {
      // Redis rate limiting unavailable - will use memory fallback
    })
  } catch {
    // Redis rate limiting not available - will use memory fallback
  }
}

export type UnifiedRateLimiterType = MemoryRateLimiterType

export async function applyUnifiedRateLimit(
  request: NextRequest,
  type: UnifiedRateLimiterType = 'general'
): Promise<NextResponse | null> {
  if (hasRedis && redisRateLimit) {
    try {
      return await redisRateLimit.applyRateLimit(request, type)
    } catch {
      // Fall back to memory rate limiting if Redis fails
      return await applyMemoryRateLimit(request, type)
    }
  }
  
  // Use memory-based rate limiting as fallback
  return await applyMemoryRateLimit(request, type)
}

// Middleware wrapper for API routes
export function withUnifiedRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  type: UnifiedRateLimiterType = 'general'
) {
  return async (request: NextRequest) => {
    const rateLimitResponse = await applyUnifiedRateLimit(request, type)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    return handler(request)
  }
}