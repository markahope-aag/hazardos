import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting (fallback when Redis is not available)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of Array.from(rateLimitStore.entries())) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  requests: number
  windowMs: number
}

export const rateLimitConfigs = {
  general: { requests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  auth: { requests: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  upload: { requests: 20, windowMs: 60 * 1000 }, // 20 requests per minute
  heavy: { requests: 5, windowMs: 60 * 1000 }, // 5 requests per minute
}

export type MemoryRateLimiterType = keyof typeof rateLimitConfigs

export async function applyMemoryRateLimit(
  request: NextRequest,
  type: MemoryRateLimiterType = 'general'
): Promise<NextResponse | null> {
  const config = rateLimitConfigs[type]
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'anonymous'
  const key = `${type}:${ip}`
  const now = Date.now()
  
  // Get or create entry
  let entry = rateLimitStore.get(key)
  
  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired one
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(key, entry)
    return null // First request in window, allow
  }
  
  if (entry.count >= config.requests) {
    // Rate limit exceeded
    const resetInSeconds = Math.ceil((entry.resetTime - now) / 1000)
    
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.requests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
          'Retry-After': resetInSeconds.toString(),
        },
      }
    )
  }
  
  // Increment counter
  entry.count++
  rateLimitStore.set(key, entry)
  
  return null // Allow request
}

// Middleware wrapper for API routes
export function withMemoryRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  type: MemoryRateLimiterType = 'general'
) {
  return async (request: NextRequest) => {
    const rateLimitResponse = await applyMemoryRateLimit(request, type)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    return handler(request)
  }
}