import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRequest, validateBody, validateQuery, validateParams } from '@/lib/middleware/validation-middleware'

// Mock schemas for testing
const testBodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  age: z.number().min(0).max(120).optional(),
})

const testQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
})

const testParamsSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
  slug: z.string().min(1).optional(),
})

describe('Validation Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateBody', () => {
    it('validates valid request body', async () => {
      const validBody = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      }

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const middleware = validateBody(testBodySchema)
      const wrappedHandler = middleware(mockHandler)

      const response = await wrappedHandler(request)

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedBody: validBody,
        })
      )
      expect(response.status).toBe(200)
    })

    it('rejects invalid request body', async () => {
      const invalidBody = {
        name: '', // Empty name
        email: 'invalid-email', // Invalid email format
        age: -5, // Invalid age
      }

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify(invalidBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const mockHandler = vi.fn()
      const middleware = validateBody(testBodySchema)
      const wrappedHandler = middleware(mockHandler)

      const response = await wrappedHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Validation failed')
      expect(data.details).toHaveLength(3) // Three validation errors
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('handles malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: 'invalid json{',
        headers: { 'Content-Type': 'application/json' },
      })

      const mockHandler = vi.fn()
      const middleware = validateBody(testBodySchema)
      const wrappedHandler = middleware(mockHandler)

      const response = await wrappedHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid JSON')
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('handles missing request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const mockHandler = vi.fn()
      const middleware = validateBody(testBodySchema)
      const wrappedHandler = middleware(mockHandler)

      const response = await wrappedHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Request body is required')
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('transforms data according to schema', async () => {
      const bodyWithStringAge = {
        name: 'John Doe',
        email: 'john@example.com',
        age: '30', // String that should be transformed to number
      }

      const transformSchema = z.object({
        name: z.string(),
        email: z.string().email(),
        age: z.string().transform(Number),
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify(bodyWithStringAge),
        headers: { 'Content-Type': 'application/json' },
      })

      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const middleware = validateBody(transformSchema)
      const wrappedHandler = middleware(mockHandler)

      await wrappedHandler(request)

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedBody: {
            name: 'John Doe',
            email: 'john@example.com',
            age: 30, // Transformed to number
          },
        })
      )
    })

    it('sanitizes input data', async () => {
      const unsafeBody = {
        name: '<script>alert("xss")</script>John',
        email: 'john@example.com',
        description: 'Hello <img src=x onerror=alert(1)> world',
      }

      const sanitizeSchema = z.object({
        name: z.string().transform(str => str.replace(/<[^>]*>/g, '')),
        email: z.string().email(),
        description: z.string().transform(str => str.replace(/<[^>]*>/g, '')),
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify(unsafeBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const middleware = validateBody(sanitizeSchema)
      const wrappedHandler = middleware(mockHandler)

      await wrappedHandler(request)

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedBody: {
            name: 'John', // Script tags removed
            email: 'john@example.com',
            description: 'Hello  world', // Malicious tags removed
          },
        })
      )
    })
  })

  describe('validateQuery', () => {
    it('validates valid query parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/test?page=2&limit=10&search=john&status=active'
      )

      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const middleware = validateQuery(testQuerySchema)
      const wrappedHandler = middleware(mockHandler)

      await wrappedHandler(request)

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedQuery: {
            page: 2, // Transformed from string to number
            limit: 10,
            search: 'john',
            status: 'active',
          },
        })
      )
    })

    it('rejects invalid query parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/test?page=0&limit=200&status=invalid'
      )

      const mockHandler = vi.fn()
      const middleware = validateQuery(testQuerySchema)
      const wrappedHandler = middleware(mockHandler)

      const response = await wrappedHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Validation failed')
      expect(data.details).toHaveLength(3) // Three validation errors
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('handles missing optional query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/test')

      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const middleware = validateQuery(testQuerySchema)
      const wrappedHandler = middleware(mockHandler)

      await wrappedHandler(request)

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedQuery: {}, // Empty object for optional fields
        })
      )
    })

    it('handles array query parameters', async () => {
      const arraySchema = z.object({
        tags: z.array(z.string()).optional(),
        ids: z.array(z.string().uuid()).optional(),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/test?tags=tag1&tags=tag2&tags=tag3'
      )

      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const middleware = validateQuery(arraySchema)
      const wrappedHandler = middleware(mockHandler)

      await wrappedHandler(request)

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedQuery: {
            tags: ['tag1', 'tag2', 'tag3'],
          },
        })
      )
    })

    it('sanitizes query parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/test?search=%3Cscript%3Ealert%281%29%3C%2Fscript%3E'
      )

      const sanitizeQuerySchema = z.object({
        search: z.string().transform(str => decodeURIComponent(str).replace(/<[^>]*>/g, '')),
      })

      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const middleware = validateQuery(sanitizeQuerySchema)
      const wrappedHandler = middleware(mockHandler)

      await wrappedHandler(request)

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedQuery: {
            search: 'alert(1)', // Script tags removed
          },
        })
      )
    })
  })

  describe('validateParams', () => {
    it('validates valid route parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/test')
      const params = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        slug: 'test-slug',
      }

      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const middleware = validateParams(testParamsSchema)
      const wrappedHandler = middleware(mockHandler)

      await wrappedHandler(request, { params })

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedParams: params,
        }),
        { params }
      )
    })

    it('rejects invalid route parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/test')
      const params = {
        id: 'invalid-uuid',
        slug: '',
      }

      const mockHandler = vi.fn()
      const middleware = validateParams(testParamsSchema)
      const wrappedHandler = middleware(mockHandler)

      const response = await wrappedHandler(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Validation failed')
      expect(data.details).toHaveLength(2) // Two validation errors
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('handles missing route parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/test')
      const params = {} // Missing required id

      const mockHandler = vi.fn()
      const middleware = validateParams(testParamsSchema)
      const wrappedHandler = middleware(mockHandler)

      const response = await wrappedHandler(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Validation failed')
      expect(mockHandler).not.toHaveBeenCalled()
    })
  })

  describe('validateRequest (combined validation)', () => {
    it('validates all request parts together', async () => {
      const validBody = {
        name: 'John Doe',
        email: 'john@example.com',
      }

      const request = new NextRequest(
        'http://localhost:3000/api/test?page=1&limit=10',
        {
          method: 'POST',
          body: JSON.stringify(validBody),
          headers: { 'Content-Type': 'application/json' },
        }
      )

      const params = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      }

      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const middleware = validateRequest({
        body: testBodySchema,
        query: testQuerySchema,
        params: testParamsSchema,
      })
      const wrappedHandler = middleware(mockHandler)

      await wrappedHandler(request, { params })

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedBody: validBody,
          validatedQuery: { page: 1, limit: 10 },
          validatedParams: params,
        }),
        { params }
      )
    })

    it('fails if any validation fails', async () => {
      const invalidBody = {
        name: '', // Invalid
        email: 'john@example.com',
      }

      const request = new NextRequest(
        'http://localhost:3000/api/test?page=0', // Invalid page
        {
          method: 'POST',
          body: JSON.stringify(invalidBody),
          headers: { 'Content-Type': 'application/json' },
        }
      )

      const params = {
        id: 'invalid-uuid', // Invalid UUID
      }

      const mockHandler = vi.fn()
      const middleware = validateRequest({
        body: testBodySchema,
        query: testQuerySchema,
        params: testParamsSchema,
      })
      const wrappedHandler = middleware(mockHandler)

      const response = await wrappedHandler(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Validation failed')
      expect(data.details.length).toBeGreaterThan(1) // Multiple validation errors
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('validates only specified parts', async () => {
      const request = new NextRequest('http://localhost:3000/api/test?page=1')

      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const middleware = validateRequest({
        query: testQuerySchema,
        // No body or params validation
      })
      const wrappedHandler = middleware(mockHandler)

      await wrappedHandler(request)

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedQuery: { page: 1 },
          // Should not have validatedBody or validatedParams
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('provides detailed error messages', async () => {
      const complexSchema = z.object({
        user: z.object({
          name: z.string().min(2, 'Name must be at least 2 characters'),
          email: z.string().email('Must be a valid email address'),
          profile: z.object({
            age: z.number().min(18, 'Must be at least 18 years old'),
            preferences: z.array(z.string()).min(1, 'At least one preference required'),
          }),
        }),
      })

      const invalidBody = {
        user: {
          name: 'A', // Too short
          email: 'invalid', // Invalid email
          profile: {
            age: 16, // Too young
            preferences: [], // Empty array
          },
        },
      }

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify(invalidBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const mockHandler = vi.fn()
      const middleware = validateBody(complexSchema)
      const wrappedHandler = middleware(mockHandler)

      const response = await wrappedHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'user.name',
            message: 'Name must be at least 2 characters',
          }),
          expect.objectContaining({
            path: 'user.email',
            message: 'Must be a valid email address',
          }),
          expect.objectContaining({
            path: 'user.profile.age',
            message: 'Must be at least 18 years old',
          }),
          expect.objectContaining({
            path: 'user.profile.preferences',
            message: 'At least one preference required',
          }),
        ])
      )
    })

    it('handles schema parsing errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ name: 'John' }),
        headers: { 'Content-Type': 'application/json' },
      })

      // Create a schema that will throw during parsing
      const faultySchema = z.object({
        name: z.string().refine(() => {
          throw new Error('Schema parsing error')
        }),
      })

      const mockHandler = vi.fn()
      const middleware = validateBody(faultySchema)
      const wrappedHandler = middleware(mockHandler)

      const response = await wrappedHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Validation error')
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('includes request context in error responses', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
        headers: { 
          'Content-Type': 'application/json',
          'X-Request-ID': 'test-request-123',
        },
      })

      const mockHandler = vi.fn()
      const middleware = validateBody(testBodySchema)
      const wrappedHandler = middleware(mockHandler)

      const response = await wrappedHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.request_id).toBe('test-request-123')
      expect(data.timestamp).toBeDefined()
      expect(data.path).toBe('/api/test')
    })
  })

  describe('Performance and Security', () => {
    it('handles large request bodies efficiently', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: 'A'.repeat(100),
      }))

      const largeBodySchema = z.object({
        items: z.array(z.object({
          id: z.number(),
          name: z.string(),
          description: z.string(),
        })).max(1000, 'Too many items'),
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ items: largeArray }),
        headers: { 'Content-Type': 'application/json' },
      })

      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const middleware = validateBody(largeBodySchema)
      const wrappedHandler = middleware(mockHandler)

      const startTime = Date.now()
      await wrappedHandler(request)
      const endTime = Date.now()

      expect(mockHandler).toHaveBeenCalled()
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('prevents prototype pollution attacks', async () => {
      const maliciousBody = {
        name: 'John',
        email: 'john@example.com',
        '__proto__': { polluted: true },
        'constructor': { prototype: { polluted: true } },
      }

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify(maliciousBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const middleware = validateBody(testBodySchema)
      const wrappedHandler = middleware(mockHandler)

      await wrappedHandler(request)

      // Verify prototype pollution didn't occur
      expect(({} as any).polluted).toBeUndefined()
      expect(Object.prototype.polluted).toBeUndefined()

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedBody: {
            name: 'John',
            email: 'john@example.com',
            // Malicious properties should be filtered out by Zod
          },
        })
      )
    })

    it('limits recursion depth', async () => {
      const createNestedObject = (depth: number): any => {
        if (depth === 0) return { value: 'deep' }
        return { nested: createNestedObject(depth - 1) }
      }

      const deeplyNestedBody = createNestedObject(100) // Very deep nesting

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify(deeplyNestedBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const mockHandler = vi.fn()
      const middleware = validateBody(testBodySchema)
      const wrappedHandler = middleware(mockHandler)

      const response = await wrappedHandler(request)
      const data = await response.json()

      // Should handle deep nesting gracefully without stack overflow
      expect(response.status).toBe(400) // Will fail validation but shouldn't crash
      expect(data.success).toBe(false)
    })
  })
})