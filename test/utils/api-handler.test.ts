import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler, createPublicApiHandler, createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { z } from 'zod'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  })),
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null)),
  UnifiedRateLimiterType: {},
}))

vi.mock('@/lib/utils/logger', () => ({
  createRequestLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

vi.mock('@/lib/utils/secure-error-handler', () => ({
  createSecureErrorResponse: vi.fn((error, _log) =>
    NextResponse.json({ error: 'Mocked error' }, { status: 500 })
  ),
  SecureError: class SecureError extends Error {
    constructor(public type: string, message?: string, public field?: string) {
      super(message || type)
      this.name = 'SecureError'
    }
  },
}))

vi.mock('@/lib/utils/sanitize', () => ({
  sanitizeObject: vi.fn((obj) => obj),
}))

import { createClient } from '@/lib/supabase/server'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'
import { createRequestLogger } from '@/lib/utils/logger'

// Helper to create a mock Supabase client
function createMockSupabaseClient() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-123', role: 'admin' },
            error: null,
          }),
        })),
      })),
    })),
  }
}

// Helper to create a mock logger
function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}

describe('API Handler Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the createClient mock to return a properly configured client
    vi.mocked(createClient).mockResolvedValue(createMockSupabaseClient() as any)
    // Reset the logger mock
    vi.mocked(createRequestLogger).mockReturnValue(createMockLogger() as any)
    // Reset rate limit mock
    vi.mocked(applyUnifiedRateLimit).mockResolvedValue(null)
  })

  describe('createApiHandler', () => {
    it('should measure request duration and log completion', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }
      vi.mocked(createRequestLogger).mockReturnValue(mockLogger as any)

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { organization_id: 'org-123', role: 'admin' },
                error: null,
              }),
            })),
          })),
        })),
      } as any)

      const handler = createApiHandler(
        {},
        async (req, _context) => {
          return NextResponse.json({ success: true })
        }
      )

      const request = new NextRequest('http://localhost:3000/api/test')
      await handler(request)

      // Should log request started
      expect(mockLogger.info).toHaveBeenCalledWith('Request started')

      // Should log request completed with duration
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: expect.any(Number),
          status: 200,
        }),
        'Request completed'
      )
    })

    it('should apply rate limiting before processing request', async () => {
      const rateLimitResponse = NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
      vi.mocked(applyUnifiedRateLimit).mockResolvedValue(rateLimitResponse)

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }
      vi.mocked(createRequestLogger).mockReturnValue(mockLogger as any)

      const handler = createApiHandler(
        { rateLimit: 'strict' },
        async () => NextResponse.json({ success: true })
      )

      const request = new NextRequest('http://localhost:3000/api/test')
      const response = await handler(request)

      expect(response.status).toBe(429)
      expect(mockLogger.warn).toHaveBeenCalledWith('Rate limit exceeded')
      expect(applyUnifiedRateLimit).toHaveBeenCalledWith(request, 'strict')
    })

    it('should validate query parameters with schema', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }
      vi.mocked(createRequestLogger).mockReturnValue(mockLogger as any)

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { organization_id: 'org-123', role: 'user' },
                error: null,
              }),
            })),
          })),
        })),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const querySchema = z.object({
        status: z.enum(['active', 'inactive']),
        limit: z.string().optional(),
      })

      let capturedQuery: any
      const handler = createApiHandler(
        { querySchema },
        async (req, context, body, query) => {
          capturedQuery = query
          return NextResponse.json({ query })
        }
      )

      const request = new NextRequest(
        'http://localhost:3000/api/test?status=active&limit=10'
      )
      await handler(request)

      expect(capturedQuery).toEqual({
        status: 'active',
        limit: '10',
      })
    })

    it('should validate request body with schema', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }
      vi.mocked(createRequestLogger).mockReturnValue(mockLogger as any)

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { organization_id: 'org-123', role: 'user' },
                error: null,
              }),
            })),
          })),
        })),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const bodySchema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      })

      let capturedBody: any
      const handler = createApiHandler(
        { bodySchema },
        async (req, context, body, query) => {
          capturedBody = body
          return NextResponse.json({ body })
        }
      )

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
        headers: { 'Content-Type': 'application/json' },
      })
      await handler(request)

      expect(capturedBody).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
      })
    })

    it('should include requestId in context', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }
      vi.mocked(createRequestLogger).mockReturnValue(mockLogger as any)

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { organization_id: 'org-123', role: 'user' },
                error: null,
              }),
            })),
          })),
        })),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      let capturedContext: any
      const handler = createApiHandler({}, async (req, context, body, query) => {
        capturedContext = context
        return NextResponse.json({ success: true })
      })

      const request = new NextRequest('http://localhost:3000/api/test')
      await handler(request)

      expect(capturedContext.requestId).toBeDefined()
      expect(typeof capturedContext.requestId).toBe('string')
      expect(capturedContext.requestId.length).toBeGreaterThan(0)
    })

    it('should log errors with duration on failure', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }
      vi.mocked(createRequestLogger).mockReturnValue(mockLogger as any)

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { organization_id: 'org-123', role: 'user' },
                error: null,
              }),
            })),
          })),
        })),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const handler = createApiHandler({}, async (req, _context, body, query) => {
        throw new Error('Test error')
      })

      const request = new NextRequest('http://localhost:3000/api/test')
      await handler(request)

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: expect.any(Number),
        }),
        'Request failed'
      )
    })
  })

  describe('createPublicApiHandler', () => {
    it('should not require authentication', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }
      vi.mocked(createRequestLogger).mockReturnValue(mockLogger as any)

      let handlerCalled = false
      const handler = createPublicApiHandler({}, async (req, body, query) => {
        handlerCalled = true
        return NextResponse.json({ public: true })
      })

      const request = new NextRequest('http://localhost:3000/api/public')
      const response = await handler(request)

      expect(handlerCalled).toBe(true)
      expect(response.status).toBe(200)
      // Should not call getUser
      expect(createClient).not.toHaveBeenCalled()
    })

    it('should measure duration for public endpoints', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }
      vi.mocked(createRequestLogger).mockReturnValue(mockLogger as any)

      const handler = createPublicApiHandler({}, async (req, body, query) => {
        return NextResponse.json({ success: true })
      })

      const request = new NextRequest('http://localhost:3000/api/public')
      await handler(request)

      expect(mockLogger.info).toHaveBeenCalledWith('Request started')
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: expect.any(Number),
          status: 200,
        }),
        'Request completed'
      )
    })
  })

  describe('createApiHandlerWithParams', () => {
    it('should pass params to handler and measure duration', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }
      vi.mocked(createRequestLogger).mockReturnValue(mockLogger as any)

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { organization_id: 'org-123', role: 'user' },
                error: null,
              }),
            })),
          })),
        })),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      let capturedParams: any
      const handler = createApiHandlerWithParams(
        {},
        async (req, context, params, body, query) => {
          capturedParams = params
          return NextResponse.json({ params })
        }
      )

      const request = new NextRequest('http://localhost:3000/api/items/item-123')
      const mockParams = { id: 'item-123' }
      const response = await handler(request, { params: Promise.resolve(mockParams) })

      expect(capturedParams).toEqual({ id: 'item-123' })
      expect(response.status).toBe(200)
      expect(mockLogger.info).toHaveBeenCalledWith('Request started')
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: expect.any(Number),
          status: 200,
        }),
        'Request completed'
      )
    })
  })
})
