import { NextRequest, NextResponse } from 'next/server'
import { applyMemoryRateLimit, type MemoryRateLimiterType } from './memory-rate-limit'
import { logger } from '@/lib/utils/logger'

const log = logger.child({ module: 'rate-limit' })

const hasRedis = Boolean(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

type RedisRateLimitModule = typeof import('./rate-limit')

// Cached promise so we import the Redis module at most once and subsequent
// requests await the same resolution instead of racing.
let redisModulePromise: Promise<RedisRateLimitModule | null> | null = null

function loadRedisRateLimit(): Promise<RedisRateLimitModule | null> {
  if (!hasRedis) return Promise.resolve(null)
  if (!redisModulePromise) {
    redisModulePromise = import('./rate-limit').catch((err) => {
      log.warn({ err }, 'Failed to load Redis rate limiting, using memory fallback')
      return null
    })
  }
  return redisModulePromise
}

export type UnifiedRateLimiterType = MemoryRateLimiterType

export async function applyUnifiedRateLimit(
  request: NextRequest,
  type: UnifiedRateLimiterType = 'general'
): Promise<NextResponse | null> {
  const redis = await loadRedisRateLimit()
  if (redis) {
    try {
      return await redis.applyRateLimit(request, type)
    } catch (err) {
      log.warn({ err }, 'Redis rate limiter failed, falling back to memory')
      return await applyMemoryRateLimit(request, type)
    }
  }

  return await applyMemoryRateLimit(request, type)
}

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
