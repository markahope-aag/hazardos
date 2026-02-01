import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { applyRateLimit, withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit'

// Mock the Upstash dependencies
vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(() => ({
      // Mock Redis instance
      pipeline: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
    })),
  },
}))

vi.mock('@upstash/ratelimit', () => {
  const mockLimit = vi.fn()
  return {
    Ratelimit: class MockRatelimit {
      limit = mockLimit
      constructor() {
        return { limit: mockLimit }
      }
      static slidingWindow = vi.fn(() => ({}))
    },
  }
})

describe('rate-limit middleware', () => {
  let mockLimit: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    // Get the mocked limit function
    mockLimit = rateLimiters.general.limit as ReturnType<typeof vi.fn>
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('applyRateLimit', () => {
    it('should return null when rate limit is not exceeded', async () => {
      // Arrange
      const request = new NextRequest('https://example.com/api/test')
      mockLimit.mockResolvedValueOnce({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })

      // Act
      const result = await applyRateLimit(request)

      // Assert
      expect(result).toBeNull()
      expect(mockLimit).toHaveBeenCalledTimes(1)
    })

    it('should return 429 response when rate limit is exceeded', async () => {
      // Arrange
      const request = new NextRequest('https://example.com/api/test')
      const resetTime = Date.now() + 60000
      mockLimit.mockResolvedValueOnce({
        success: false,
        limit: 100,
        remaining: 0,
        reset: resetTime,
      })

      // Act
      const result = await applyRateLimit(request)

      // Assert
      expect(result).not.toBeNull()
      expect(result?.status).toBe(429)
    })

    it('should include rate limit headers in 429 response', async () => {
      // Arrange
      const request = new NextRequest('https://example.com/api/test')
      const resetTime = Date.now() + 60000
      mockLimit.mockResolvedValueOnce({
        success: false,
        limit: 100,
        remaining: 0,
        reset: resetTime,
      })

      // Act
      const result = await applyRateLimit(request)

      // Assert
      expect(result).not.toBeNull()
      expect(result?.headers.get('X-RateLimit-Limit')).toBe('100')
      expect(result?.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(result?.headers.get('X-RateLimit-Reset')).toBe(new Date(resetTime).toISOString())
      expect(result?.headers.has('Retry-After')).toBe(true)
    })

    it('should include error message in 429 response body', async () => {
      // Arrange
      const request = new NextRequest('https://example.com/api/test')
      mockLimit.mockResolvedValueOnce({
        success: false,
        limit: 100,
        remaining: 0,
        reset: Date.now() + 60000,
      })

      // Act
      const result = await applyRateLimit(request)

      // Assert
      expect(result).not.toBeNull()
      const json = await result?.json()
      expect(json).toEqual({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
      })
    })

    it('should use x-forwarded-for header for client IP', async () => {
      // Arrange
      const request = new NextRequest('https://example.com/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      })
      mockLimit.mockResolvedValueOnce({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })

      // Act
      await applyRateLimit(request)

      // Assert
      expect(mockLimit).toHaveBeenCalledWith('192.168.1.1')
    })

    it('should use x-real-ip header when x-forwarded-for is not present', async () => {
      // Arrange
      const request = new NextRequest('https://example.com/api/test', {
        headers: {
          'x-real-ip': '10.0.0.1',
        },
      })
      mockLimit.mockResolvedValueOnce({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })

      // Act
      await applyRateLimit(request)

      // Assert
      expect(mockLimit).toHaveBeenCalledWith('10.0.0.1')
    })

    it('should use anonymous when no IP headers are present', async () => {
      // Arrange
      const request = new NextRequest('https://example.com/api/test')
      mockLimit.mockResolvedValueOnce({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })

      // Act
      await applyRateLimit(request)

      // Assert
      expect(mockLimit).toHaveBeenCalledWith('anonymous')
    })

    it('should prefer x-forwarded-for over x-real-ip when both are present', async () => {
      // Arrange
      const request = new NextRequest('https://example.com/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '10.0.0.1',
        },
      })
      mockLimit.mockResolvedValueOnce({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })

      // Act
      await applyRateLimit(request)

      // Assert
      expect(mockLimit).toHaveBeenCalledWith('192.168.1.1')
    })

    it('should use general limiter by default', async () => {
      // Arrange
      const request = new NextRequest('https://example.com/api/test')
      const generalMockLimit = rateLimiters.general.limit as ReturnType<typeof vi.fn>
      generalMockLimit.mockResolvedValueOnce({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })

      // Act
      await applyRateLimit(request)

      // Assert
      expect(generalMockLimit).toHaveBeenCalledTimes(1)
    })

    it('should use auth limiter when specified', async () => {
      // Arrange
      const request = new NextRequest('https://example.com/api/auth/login')
      const authMockLimit = rateLimiters.auth.limit as ReturnType<typeof vi.fn>
      authMockLimit.mockResolvedValueOnce({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      })

      // Act
      await applyRateLimit(request, 'auth')

      // Assert
      expect(authMockLimit).toHaveBeenCalledTimes(1)
    })

    it('should use upload limiter when specified', async () => {
      // Arrange
      const request = new NextRequest('https://example.com/api/upload')
      const uploadMockLimit = rateLimiters.upload.limit as ReturnType<typeof vi.fn>
      uploadMockLimit.mockResolvedValueOnce({
        success: true,
        limit: 20,
        remaining: 19,
        reset: Date.now() + 60000,
      })

      // Act
      await applyRateLimit(request, 'upload')

      // Assert
      expect(uploadMockLimit).toHaveBeenCalledTimes(1)
    })

    it('should use heavy limiter when specified', async () => {
      // Arrange
      const request = new NextRequest('https://example.com/api/heavy-operation')
      const heavyMockLimit = rateLimiters.heavy.limit as ReturnType<typeof vi.fn>
      heavyMockLimit.mockResolvedValueOnce({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 60000,
      })

      // Act
      await applyRateLimit(request, 'heavy')

      // Assert
      expect(heavyMockLimit).toHaveBeenCalledTimes(1)
    })

    it('should calculate correct Retry-After value in seconds', async () => {
      // Arrange
      const request = new NextRequest('https://example.com/api/test')
      const resetTime = Date.now() + 120000 // 2 minutes from now
      mockLimit.mockResolvedValueOnce({
        success: false,
        limit: 100,
        remaining: 0,
        reset: resetTime,
      })

      // Act
      const result = await applyRateLimit(request)

      // Assert
      expect(result).not.toBeNull()
      const retryAfter = parseInt(result?.headers.get('Retry-After') ?? '0')
      // Should be approximately 120 seconds (allow for small timing differences)
      expect(retryAfter).toBeGreaterThanOrEqual(119)
      expect(retryAfter).toBeLessThanOrEqual(121)
    })

    it('should handle zero remaining correctly', async () => {
      // Arrange
      const request = new NextRequest('https://example.com/api/test')
      mockLimit.mockResolvedValueOnce({
        success: false,
        limit: 100,
        remaining: 0,
        reset: Date.now() + 60000,
      })

      // Act
      const result = await applyRateLimit(request)

      // Assert
      expect(result).not.toBeNull()
      expect(result?.headers.get('X-RateLimit-Remaining')).toBe('0')
    })

    it('should handle rate limit at exact boundary', async () => {
      // Arrange
      const request = new NextRequest('https://example.com/api/test')
      mockLimit.mockResolvedValueOnce({
        success: true,
        limit: 100,
        remaining: 1,
        reset: Date.now() + 60000,
      })

      // Act
      const result = await applyRateLimit(request)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('withRateLimit', () => {
    it('should call handler when rate limit is not exceeded', async () => {
      // Arrange
      const mockHandler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      const request = new NextRequest('https://example.com/api/test')
      mockLimit.mockResolvedValueOnce({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })

      // Act
      const wrappedHandler = withRateLimit(mockHandler)
      const result = await wrappedHandler(request)

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(request)
      expect(result.status).toBe(200)
    })

    it('should return 429 response without calling handler when rate limit is exceeded', async () => {
      // Arrange
      const mockHandler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      const request = new NextRequest('https://example.com/api/test')
      mockLimit.mockResolvedValueOnce({
        success: false,
        limit: 100,
        remaining: 0,
        reset: Date.now() + 60000,
      })

      // Act
      const wrappedHandler = withRateLimit(mockHandler)
      const result = await wrappedHandler(request)

      // Assert
      expect(mockHandler).not.toHaveBeenCalled()
      expect(result.status).toBe(429)
    })

    it('should use general limiter by default in wrapper', async () => {
      // Arrange
      const mockHandler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      const request = new NextRequest('https://example.com/api/test')
      const generalMockLimit = rateLimiters.general.limit as ReturnType<typeof vi.fn>
      generalMockLimit.mockResolvedValueOnce({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })

      // Act
      const wrappedHandler = withRateLimit(mockHandler)
      await wrappedHandler(request)

      // Assert
      expect(generalMockLimit).toHaveBeenCalledTimes(1)
    })

    it('should use specified limiter type in wrapper', async () => {
      // Arrange
      const mockHandler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      const request = new NextRequest('https://example.com/api/auth/login')
      const authMockLimit = rateLimiters.auth.limit as ReturnType<typeof vi.fn>
      authMockLimit.mockResolvedValueOnce({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      })

      // Act
      const wrappedHandler = withRateLimit(mockHandler, 'auth')
      await wrappedHandler(request)

      // Assert
      expect(authMockLimit).toHaveBeenCalledTimes(1)
    })

    it('should preserve handler response when rate limit passes', async () => {
      // Arrange
      const expectedData = { data: 'test', id: 123 }
      const mockHandler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(expectedData), {
          status: 201,
          headers: { 'Content-Type': 'application/json', 'X-Custom': 'header' },
        })
      )
      const request = new NextRequest('https://example.com/api/test')
      mockLimit.mockResolvedValueOnce({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })

      // Act
      const wrappedHandler = withRateLimit(mockHandler)
      const result = await wrappedHandler(request)

      // Assert
      expect(result.status).toBe(201)
      expect(result.headers.get('X-Custom')).toBe('header')
      const json = await result.json()
      expect(json).toEqual(expectedData)
    })

    it('should handle handler errors without interference', async () => {
      // Arrange
      const mockHandler = vi.fn().mockRejectedValue(new Error('Handler error'))
      const request = new NextRequest('https://example.com/api/test')
      mockLimit.mockResolvedValueOnce({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })

      // Act & Assert
      const wrappedHandler = withRateLimit(mockHandler)
      await expect(wrappedHandler(request)).rejects.toThrow('Handler error')
    })
  })

  describe('rateLimiters configuration', () => {
    it('should export general limiter', () => {
      // Assert
      expect(rateLimiters.general).toBeDefined()
      expect(rateLimiters.general.limit).toBeDefined()
    })

    it('should export auth limiter', () => {
      // Assert
      expect(rateLimiters.auth).toBeDefined()
      expect(rateLimiters.auth.limit).toBeDefined()
    })

    it('should export upload limiter', () => {
      // Assert
      expect(rateLimiters.upload).toBeDefined()
      expect(rateLimiters.upload.limit).toBeDefined()
    })

    it('should export heavy limiter', () => {
      // Assert
      expect(rateLimiters.heavy).toBeDefined()
      expect(rateLimiters.heavy.limit).toBeDefined()
    })

    it('should have all expected limiter types', () => {
      // Assert
      const expectedTypes = ['general', 'auth', 'upload', 'heavy']
      const actualTypes = Object.keys(rateLimiters)
      expect(actualTypes).toEqual(expectedTypes)
    })
  })

  describe('edge cases', () => {
    it('should handle very long IP addresses', async () => {
      // Arrange
      const longIp = '2001:0db8:85a3:0000:0000:8a2e:0370:7334'
      const request = new NextRequest('https://example.com/api/test', {
        headers: {
          'x-forwarded-for': longIp,
        },
      })
      mockLimit.mockResolvedValueOnce({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })

      // Act
      await applyRateLimit(request)

      // Assert
      expect(mockLimit).toHaveBeenCalledWith(longIp)
    })

    it('should handle multiple IPs in x-forwarded-for header', async () => {
      // Arrange
      const multipleIps = '192.168.1.1, 10.0.0.1'
      const request = new NextRequest('https://example.com/api/test', {
        headers: {
          'x-forwarded-for': multipleIps,
        },
      })
      mockLimit.mockResolvedValueOnce({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })

      // Act
      await applyRateLimit(request)

      // Assert
      // Should use the entire header value as-is
      expect(mockLimit).toHaveBeenCalledWith(multipleIps)
    })

    it('should handle reset time in the past gracefully', async () => {
      // Arrange
      const request = new NextRequest('https://example.com/api/test')
      const pastResetTime = Date.now() - 1000 // 1 second ago
      mockLimit.mockResolvedValueOnce({
        success: false,
        limit: 100,
        remaining: 0,
        reset: pastResetTime,
      })

      // Act
      const result = await applyRateLimit(request)

      // Assert
      expect(result).not.toBeNull()
      const retryAfter = parseInt(result?.headers.get('Retry-After') ?? '0')
      // Should be 0 or negative, but Math.round handles this
      expect(retryAfter).toBeLessThanOrEqual(0)
    })

    it('should handle concurrent requests with same IP', async () => {
      // Arrange
      const request1 = new NextRequest('https://example.com/api/test1', {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      })
      const request2 = new NextRequest('https://example.com/api/test2', {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      })

      mockLimit
        .mockResolvedValueOnce({
          success: true,
          limit: 100,
          remaining: 99,
          reset: Date.now() + 60000,
        })
        .mockResolvedValueOnce({
          success: true,
          limit: 100,
          remaining: 98,
          reset: Date.now() + 60000,
        })

      // Act
      const [result1, result2] = await Promise.all([
        applyRateLimit(request1),
        applyRateLimit(request2),
      ])

      // Assert
      expect(result1).toBeNull()
      expect(result2).toBeNull()
      expect(mockLimit).toHaveBeenCalledTimes(2)
    })

    it('should handle rapid sequential requests', async () => {
      // Arrange
      const request = new NextRequest('https://example.com/api/test')
      const responses = [
        { success: true, limit: 100, remaining: 99, reset: Date.now() + 60000 },
        { success: true, limit: 100, remaining: 98, reset: Date.now() + 60000 },
        { success: true, limit: 100, remaining: 97, reset: Date.now() + 60000 },
      ]

      responses.forEach(response => {
        mockLimit.mockResolvedValueOnce(response)
      })

      // Act
      const results = []
      for (let i = 0; i < 3; i++) {
        results.push(await applyRateLimit(request))
      }

      // Assert
      expect(results.every(r => r === null)).toBe(true)
      expect(mockLimit).toHaveBeenCalledTimes(3)
    })

    it('should handle empty string IP headers', async () => {
      // Arrange
      const request = new NextRequest('https://example.com/api/test', {
        headers: {
          'x-forwarded-for': '',
          'x-real-ip': '',
        },
      })
      mockLimit.mockResolvedValueOnce({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })

      // Act
      await applyRateLimit(request)

      // Assert
      // Empty strings are not null/undefined, so x-forwarded-for value is used
      expect(mockLimit).toHaveBeenCalledWith('')
    })
  })
})
