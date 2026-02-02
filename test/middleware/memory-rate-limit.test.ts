import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import {
  applyMemoryRateLimit,
  withMemoryRateLimit,
  rateLimitConfigs,
  type MemoryRateLimiterType as _MemoryRateLimiterType,
} from '@/lib/middleware/memory-rate-limit'

describe('Memory Rate Limit Middleware', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('applyMemoryRateLimit', () => {
    it('should allow first request', async () => {
      const request = new NextRequest('http://localhost:3000/api/test')
      const response = await applyMemoryRateLimit(request, 'general')

      expect(response).toBeNull()
    })

    it('should allow requests within limit', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      })

      // Make 5 requests (under the general limit of 100)
      for (let i = 0; i < 5; i++) {
        const response = await applyMemoryRateLimit(request, 'general')
        expect(response).toBeNull()
      }
    })

    it('should block requests exceeding rate limit', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth', {
        headers: { 'x-forwarded-for': '192.168.1.2' },
      })

      // Make requests up to the auth limit (10 requests per minute)
      for (let i = 0; i < rateLimitConfigs.auth.requests; i++) {
        const response = await applyMemoryRateLimit(request, 'auth')
        expect(response).toBeNull()
      }

      // Next request should be blocked
      const blockedResponse = await applyMemoryRateLimit(request, 'auth')
      expect(blockedResponse).not.toBeNull()
      expect(blockedResponse?.status).toBe(429)

      const body = await blockedResponse?.json()
      expect(body).toMatchObject({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
      })
    })

    it('should include rate limit headers in 429 response', async () => {
      const request = new NextRequest('http://localhost:3000/api/heavy', {
        headers: { 'x-forwarded-for': '192.168.1.3' },
      })

      // Exhaust the heavy rate limit (5 requests)
      for (let i = 0; i < rateLimitConfigs.heavy.requests; i++) {
        await applyMemoryRateLimit(request, 'heavy')
      }

      const blockedResponse = await applyMemoryRateLimit(request, 'heavy')
      expect(blockedResponse).not.toBeNull()

      const headers = blockedResponse?.headers
      expect(headers?.get('X-RateLimit-Limit')).toBe('5')
      expect(headers?.get('X-RateLimit-Remaining')).toBe('0')
      expect(headers?.get('X-RateLimit-Reset')).toBeDefined()
      expect(headers?.get('Retry-After')).toBeDefined()
    })

    it('should reset count after window expires', async () => {
      const request = new NextRequest('http://localhost:3000/api/upload', {
        headers: { 'x-forwarded-for': '192.168.1.4' },
      })

      // Exhaust the upload limit (20 requests)
      for (let i = 0; i < rateLimitConfigs.upload.requests; i++) {
        await applyMemoryRateLimit(request, 'upload')
      }

      // Should be blocked
      const blocked = await applyMemoryRateLimit(request, 'upload')
      expect(blocked).not.toBeNull()

      // Advance time past the window (60 seconds)
      vi.advanceTimersByTime(rateLimitConfigs.upload.windowMs + 1000)

      // Should be allowed again
      const allowed = await applyMemoryRateLimit(request, 'upload')
      expect(allowed).toBeNull()
    })

    it('should track different IPs separately', async () => {
      const request1 = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.5' },
      })
      const request2 = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.6' },
      })

      // Exhaust limit for IP1
      for (let i = 0; i < rateLimitConfigs.auth.requests; i++) {
        await applyMemoryRateLimit(request1, 'auth')
      }

      // IP1 should be blocked
      const blocked = await applyMemoryRateLimit(request1, 'auth')
      expect(blocked).not.toBeNull()

      // IP2 should still be allowed
      const allowed = await applyMemoryRateLimit(request2, 'auth')
      expect(allowed).toBeNull()
    })

    it('should track different rate limit types separately', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.7' },
      })

      // Exhaust auth limit
      for (let i = 0; i < rateLimitConfigs.auth.requests; i++) {
        await applyMemoryRateLimit(request, 'auth')
      }

      // Auth should be blocked
      const authBlocked = await applyMemoryRateLimit(request, 'auth')
      expect(authBlocked).not.toBeNull()

      // General should still be allowed (different rate limit type)
      const generalAllowed = await applyMemoryRateLimit(request, 'general')
      expect(generalAllowed).toBeNull()
    })

    it('should use anonymous identifier when no IP header present', async () => {
      const request = new NextRequest('http://localhost:3000/api/test')
      // No x-forwarded-for header

      const response = await applyMemoryRateLimit(request, 'general')
      expect(response).toBeNull()
    })

    it('should handle x-real-ip header as fallback', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'x-real-ip': '10.0.0.1' },
      })

      const response = await applyMemoryRateLimit(request, 'general')
      expect(response).toBeNull()
    })

    it('should prefer x-forwarded-for over x-real-ip', async () => {
      const request1 = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.10',
          'x-real-ip': '10.0.0.1',
        },
      })

      // Exhaust limit using x-forwarded-for IP
      for (let i = 0; i < rateLimitConfigs.auth.requests; i++) {
        await applyMemoryRateLimit(request1, 'auth')
      }

      // Should be blocked with same x-forwarded-for
      const request2 = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.10',
          'x-real-ip': '10.0.0.2', // Different x-real-ip shouldn't matter
        },
      })
      const blocked = await applyMemoryRateLimit(request2, 'auth')
      expect(blocked).not.toBeNull()
    })
  })

  describe('withMemoryRateLimit', () => {
    it('should call handler when rate limit not exceeded', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      )
      const wrappedHandler = withMemoryRateLimit(mockHandler, 'general')

      const request = new NextRequest('http://localhost:3000/api/test')
      const response = await wrappedHandler(request)

      expect(mockHandler).toHaveBeenCalledWith(request)
      expect(response.status).toBe(200)
    })

    it('should not call handler when rate limit exceeded', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      )
      const wrappedHandler = withMemoryRateLimit(mockHandler, 'auth')

      const request = new NextRequest('http://localhost:3000/api/auth', {
        headers: { 'x-forwarded-for': '192.168.1.20' },
      })

      // Exhaust rate limit
      for (let i = 0; i < rateLimitConfigs.auth.requests; i++) {
        await wrappedHandler(request)
      }

      // Clear mock to check it's not called again
      mockHandler.mockClear()

      // Next request should be blocked without calling handler
      const response = await wrappedHandler(request)
      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(429)
    })

    it('should return rate limit response instead of handler response', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ data: 'success' })
      )
      const wrappedHandler = withMemoryRateLimit(mockHandler, 'heavy')

      const request = new NextRequest('http://localhost:3000/api/heavy-op', {
        headers: { 'x-forwarded-for': '192.168.1.21' },
      })

      // Exhaust rate limit
      for (let i = 0; i < rateLimitConfigs.heavy.requests; i++) {
        await wrappedHandler(request)
      }

      const response = await wrappedHandler(request)
      const body = await response.json()

      expect(response.status).toBe(429)
      expect(body.error).toBe('Rate limit exceeded')
      expect(body.data).toBeUndefined()
    })
  })

  describe('rateLimitConfigs', () => {
    it('should have correct config for general endpoints', () => {
      expect(rateLimitConfigs.general).toEqual({
        requests: 100,
        windowMs: 60 * 1000,
      })
    })

    it('should have stricter config for auth endpoints', () => {
      expect(rateLimitConfigs.auth).toEqual({
        requests: 10,
        windowMs: 60 * 1000,
      })
      expect(rateLimitConfigs.auth.requests).toBeLessThan(rateLimitConfigs.general.requests)
    })

    it('should have stricter config for heavy operations', () => {
      expect(rateLimitConfigs.heavy).toEqual({
        requests: 5,
        windowMs: 60 * 1000,
      })
      expect(rateLimitConfigs.heavy.requests).toBeLessThan(rateLimitConfigs.auth.requests)
    })

    it('should have higher limit for webhooks', () => {
      expect(rateLimitConfigs.webhook.requests).toBeGreaterThan(
        rateLimitConfigs.general.requests
      )
    })
  })
})
