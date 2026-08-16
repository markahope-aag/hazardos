import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

// Create Redis instance
const redis = Redis.fromEnv()

// Every limiter needs its own `prefix`. Without one, @upstash/ratelimit falls
// back to a single shared namespace, and since the identifier here is just the
// caller's IP, all six tiers end up incrementing the same counter. The strictest
// tier then governs everything: five ordinary page requests would exhaust
// `heavy`, so the AI endpoints answered 429 essentially all the time and never
// reached the provider. Confirmed against production on 2026-08-16 (heavy was
// reachable, eight /api/invoices calls succeeded, heavy then returned 429).
//
// The in-memory fallback in memory-rate-limit.ts already keyed on
// `${type}:${ip}`, so it was never affected. These prefixes bring the Redis path
// in line with it.
export const rateLimiters = {
  // General API endpoints - 100 requests per minute
  general: new Ratelimit({
    redis,
    prefix: 'ratelimit:general',
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
  }),

  // Authentication endpoints - 10 requests per minute (more restrictive)
  auth: new Ratelimit({
    redis,
    prefix: 'ratelimit:auth',
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
  }),

  // File upload endpoints - 20 requests per minute
  upload: new Ratelimit({
    redis,
    prefix: 'ratelimit:upload',
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    analytics: true,
  }),

  // Heavy operations - 5 requests per minute
  heavy: new Ratelimit({
    redis,
    prefix: 'ratelimit:heavy',
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
  }),

  // Webhook endpoints - 200 requests per minute (higher for third-party webhooks)
  webhook: new Ratelimit({
    redis,
    prefix: 'ratelimit:webhook',
    limiter: Ratelimit.slidingWindow(200, '1 m'),
    analytics: true,
  }),

  // Public endpoints - 60 requests per minute (moderate for public access)
  public: new Ratelimit({
    redis,
    prefix: 'ratelimit:public',
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
  }),
}

export type RateLimiterType = keyof typeof rateLimiters

export async function applyRateLimit(
  request: NextRequest,
  type: RateLimiterType = 'general'
): Promise<NextResponse | null> {
  // Get client IP
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'anonymous'
  
  // Apply rate limit
  const { success, limit, reset, remaining } = await rateLimiters[type].limit(ip)
  
  if (!success) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(reset).toISOString(),
          'Retry-After': Math.round((reset - Date.now()) / 1000).toString(),
        },
      }
    )
  }
  
  return null // No rate limit hit, continue processing
}

// Middleware wrapper for API routes
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  type: RateLimiterType = 'general'
) {
  return async (request: NextRequest) => {
    const rateLimitResponse = await applyRateLimit(request, type)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    return handler(request)
  }
}