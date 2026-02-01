import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/openapi/route'

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

vi.mock('@/lib/middleware/cors', () => ({
  addCorsHeaders: (response: Response) => {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET')
    return response
  },
  handlePreflight: vi.fn()
}))

vi.mock('@/lib/openapi/openapi-spec', () => ({
  openApiSpec: {
    openapi: '3.0.0',
    info: {
      title: 'HazardOS API',
      version: '1.0.0',
      description: 'API for hazardous material removal management'
    },
    paths: {
      '/api/v1/customers': {
        get: {
          summary: 'List customers',
          tags: ['Customers']
        }
      }
    }
  }
}))

describe('OpenAPI Documentation API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/openapi', () => {
    it('should return OpenAPI specification', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/openapi')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.openapi).toBe('3.0.0')
      expect(data.info.title).toBe('HazardOS API')
      expect(data.paths).toHaveProperty('/api/v1/customers')
    })

    it('should include CORS headers', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/openapi')

      // Act
      const response = await GET(request)

      // Assert
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET')
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('should be accessible without authentication', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/openapi')

      // Act
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(200)
    })
  })
})
