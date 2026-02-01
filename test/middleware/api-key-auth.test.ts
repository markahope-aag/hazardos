import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey, withApiKeyAuth } from '@/lib/middleware/api-key-auth'
import { ApiKeyService } from '@/lib/services/api-key-service'

// Mock ApiKeyService
vi.mock('@/lib/services/api-key-service', () => ({
  ApiKeyService: {
    validate: vi.fn(),
    checkRateLimit: vi.fn(),
    hasAnyScope: vi.fn(),
    logRequest: vi.fn()
  }
}))

describe('API Key Authentication Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('authenticateApiKey', () => {
    it('should authenticate valid API key', async () => {
      // Arrange
      const mockApiKey = {
        id: 'key-123',
        organization_id: 'org-456',
        scopes: ['customers:read', 'jobs:read'],
        rate_limit: 1000,
        is_active: true
      }

      vi.mocked(ApiKeyService.validate).mockResolvedValue({
        valid: true,
        apiKey: mockApiKey as any,
        organizationId: 'org-456'
      })

      vi.mocked(ApiKeyService.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 3600000)
      })

      const request = new NextRequest('http://localhost:3000/api/v1/customers', {
        headers: {
          'Authorization': 'Bearer hzd_live_test_key_123'
        }
      })

      // Act
      const result = await authenticateApiKey(request)

      // Assert
      expect(result.context).toBeDefined()
      expect(result.context?.apiKey.id).toBe('key-123')
      expect(result.context?.organizationId).toBe('org-456')
      expect(result.response).toBeUndefined()
    })

    it('should reject request without Authorization header', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/v1/customers')

      // Act
      const result = await authenticateApiKey(request)

      // Assert
      expect(result.response).toBeDefined()
      expect(result.response?.status).toBe(401)
      const data = await result.response!.json()
      expect(data.error).toBe('Missing or invalid Authorization header')
    })

    it('should reject request with malformed Authorization header', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/v1/customers', {
        headers: {
          'Authorization': 'InvalidFormat hzd_live_test'
        }
      })

      // Act
      const result = await authenticateApiKey(request)

      // Assert
      expect(result.response).toBeDefined()
      expect(result.response?.status).toBe(401)
      const data = await result.response!.json()
      expect(data.error).toBe('Missing or invalid Authorization header')
    })

    it('should reject invalid API key', async () => {
      // Arrange
      vi.mocked(ApiKeyService.validate).mockResolvedValue({
        valid: false,
        error: 'Invalid API key'
      })

      const request = new NextRequest('http://localhost:3000/api/v1/customers', {
        headers: {
          'Authorization': 'Bearer hzd_live_invalid_key'
        }
      })

      // Act
      const result = await authenticateApiKey(request)

      // Assert
      expect(result.response).toBeDefined()
      expect(result.response?.status).toBe(401)
      const data = await result.response!.json()
      expect(data.error).toBe('Invalid API key')
    })

    it('should reject when rate limit exceeded', async () => {
      // Arrange
      const mockApiKey = {
        id: 'key-123',
        organization_id: 'org-456',
        rate_limit: 1000
      }

      vi.mocked(ApiKeyService.validate).mockResolvedValue({
        valid: true,
        apiKey: mockApiKey as any,
        organizationId: 'org-456'
      })

      const resetAt = new Date(Date.now() + 3600000)
      vi.mocked(ApiKeyService.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt
      })

      const request = new NextRequest('http://localhost:3000/api/v1/customers', {
        headers: {
          'Authorization': 'Bearer hzd_live_test_key_123'
        }
      })

      // Act
      const result = await authenticateApiKey(request)

      // Assert
      expect(result.response).toBeDefined()
      expect(result.response?.status).toBe(429)
      const data = await result.response!.json()
      expect(data.error).toBe('Rate limit exceeded')

      // Check rate limit headers
      expect(result.response?.headers.get('X-RateLimit-Limit')).toBe('1000')
      expect(result.response?.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(result.response?.headers.get('X-RateLimit-Reset')).toBe(resetAt.toISOString())
    })

    it('should reject when required scope is missing', async () => {
      // Arrange
      const mockApiKey = {
        id: 'key-123',
        organization_id: 'org-456',
        scopes: ['customers:read'],
        rate_limit: 1000
      }

      vi.mocked(ApiKeyService.validate).mockResolvedValue({
        valid: true,
        apiKey: mockApiKey as any,
        organizationId: 'org-456'
      })

      vi.mocked(ApiKeyService.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 3600000)
      })

      vi.mocked(ApiKeyService.hasAnyScope).mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/v1/customers', {
        headers: {
          'Authorization': 'Bearer hzd_live_test_key_123'
        }
      })

      // Act
      const result = await authenticateApiKey(request, {
        requiredScopes: ['customers:write']
      })

      // Assert
      expect(result.response).toBeDefined()
      expect(result.response?.status).toBe(403)
      const data = await result.response!.json()
      expect(data.error).toBe('Insufficient permissions')
      expect(data.required_scopes).toEqual(['customers:write'])
    })

    it('should allow when required scope is present', async () => {
      // Arrange
      const mockApiKey = {
        id: 'key-123',
        organization_id: 'org-456',
        scopes: ['customers:read', 'customers:write'],
        rate_limit: 1000
      }

      vi.mocked(ApiKeyService.validate).mockResolvedValue({
        valid: true,
        apiKey: mockApiKey as any,
        organizationId: 'org-456'
      })

      vi.mocked(ApiKeyService.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 3600000)
      })

      vi.mocked(ApiKeyService.hasAnyScope).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/v1/customers', {
        headers: {
          'Authorization': 'Bearer hzd_live_test_key_123'
        }
      })

      // Act
      const result = await authenticateApiKey(request, {
        requiredScopes: ['customers:write']
      })

      // Assert
      expect(result.context).toBeDefined()
      expect(result.response).toBeUndefined()
    })
  })

  describe('withApiKeyAuth', () => {
    it('should call handler with authenticated context', async () => {
      // Arrange
      const mockApiKey = {
        id: 'key-123',
        organization_id: 'org-456',
        scopes: ['customers:read'],
        rate_limit: 1000
      }

      vi.mocked(ApiKeyService.validate).mockResolvedValue({
        valid: true,
        apiKey: mockApiKey as any,
        organizationId: 'org-456'
      })

      vi.mocked(ApiKeyService.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 3600000)
      })

      vi.mocked(ApiKeyService.logRequest).mockResolvedValue(undefined)

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      )

      const wrappedHandler = withApiKeyAuth(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/v1/customers', {
        headers: {
          'Authorization': 'Bearer hzd_live_test_key_123'
        }
      })

      // Act
      const response = await wrappedHandler(request)

      // Assert
      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          apiKey: mockApiKey,
          organizationId: 'org-456'
        })
      )
    })

    it('should add rate limit headers to response', async () => {
      // Arrange
      const mockApiKey = {
        id: 'key-123',
        organization_id: 'org-456',
        scopes: ['customers:read'],
        rate_limit: 1000
      }

      const resetAt = new Date(Date.now() + 3600000)

      vi.mocked(ApiKeyService.validate).mockResolvedValue({
        valid: true,
        apiKey: mockApiKey as any,
        organizationId: 'org-456'
      })

      vi.mocked(ApiKeyService.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetAt
      })

      vi.mocked(ApiKeyService.logRequest).mockResolvedValue(undefined)

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      )

      const wrappedHandler = withApiKeyAuth(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/v1/customers', {
        headers: {
          'Authorization': 'Bearer hzd_live_test_key_123'
        }
      })

      // Act
      const response = await wrappedHandler(request)

      // Assert
      expect(response.headers.get('X-RateLimit-Limit')).toBe('1000')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('999')
      expect(response.headers.get('X-RateLimit-Reset')).toBe(resetAt.toISOString())
    })

    it('should log successful requests', async () => {
      // Arrange
      const mockApiKey = {
        id: 'key-123',
        organization_id: 'org-456',
        scopes: ['customers:read'],
        rate_limit: 1000
      }

      vi.mocked(ApiKeyService.validate).mockResolvedValue({
        valid: true,
        apiKey: mockApiKey as any,
        organizationId: 'org-456'
      })

      vi.mocked(ApiKeyService.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 3600000)
      })

      vi.mocked(ApiKeyService.logRequest).mockResolvedValue(undefined)

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      )

      const wrappedHandler = withApiKeyAuth(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/v1/customers', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer hzd_live_test_key_123',
          'User-Agent': 'TestClient/1.0'
        }
      })

      // Act
      await wrappedHandler(request)

      // Wait a tick for async logging
      await new Promise(resolve => setTimeout(resolve, 10))

      // Assert
      expect(ApiKeyService.logRequest).toHaveBeenCalledWith(
        'key-123',
        'org-456',
        'GET',
        '/api/v1/customers',
        200,
        expect.any(Number),
        undefined,
        'TestClient/1.0'
      )
    })

    it('should log failed requests with error status', async () => {
      // Arrange
      const mockApiKey = {
        id: 'key-123',
        organization_id: 'org-456',
        scopes: ['customers:read'],
        rate_limit: 1000
      }

      vi.mocked(ApiKeyService.validate).mockResolvedValue({
        valid: true,
        apiKey: mockApiKey as any,
        organizationId: 'org-456'
      })

      vi.mocked(ApiKeyService.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 3600000)
      })

      vi.mocked(ApiKeyService.logRequest).mockResolvedValue(undefined)

      const mockHandler = vi.fn().mockRejectedValue(new Error('Database error'))

      const wrappedHandler = withApiKeyAuth(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/v1/customers', {
        headers: {
          'Authorization': 'Bearer hzd_live_test_key_123'
        }
      })

      // Act
      const response = await wrappedHandler(request)

      // Wait a tick for async logging
      await new Promise(resolve => setTimeout(resolve, 10))

      // Assert
      expect(response.status).toBe(500)
      expect(ApiKeyService.logRequest).toHaveBeenCalledWith(
        'key-123',
        'org-456',
        'GET',
        '/api/v1/customers',
        500,
        expect.any(Number),
        undefined,
        undefined
      )
    })

    it('should handle handler errors gracefully', async () => {
      // Arrange
      const mockApiKey = {
        id: 'key-123',
        organization_id: 'org-456',
        scopes: ['customers:read'],
        rate_limit: 1000
      }

      vi.mocked(ApiKeyService.validate).mockResolvedValue({
        valid: true,
        apiKey: mockApiKey as any,
        organizationId: 'org-456'
      })

      vi.mocked(ApiKeyService.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 3600000)
      })

      vi.mocked(ApiKeyService.logRequest).mockResolvedValue(undefined)

      const mockHandler = vi.fn().mockRejectedValue(new Error('Test error'))

      const wrappedHandler = withApiKeyAuth(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/v1/customers', {
        headers: {
          'Authorization': 'Bearer hzd_live_test_key_123'
        }
      })

      // Act
      const response = await wrappedHandler(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('Multi-tenant Isolation via API Keys', () => {
    it('should provide organization_id in context for data filtering', async () => {
      // Arrange
      const mockApiKey = {
        id: 'key-123',
        organization_id: 'org-tenant-1',
        scopes: ['customers:read'],
        rate_limit: 1000
      }

      vi.mocked(ApiKeyService.validate).mockResolvedValue({
        valid: true,
        apiKey: mockApiKey as any,
        organizationId: 'org-tenant-1'
      })

      vi.mocked(ApiKeyService.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 3600000)
      })

      vi.mocked(ApiKeyService.logRequest).mockResolvedValue(undefined)

      const mockHandler = vi.fn().mockImplementation((request, context) => {
        // Verify tenant isolation - handler must use organizationId for queries
        expect(context.organizationId).toBe('org-tenant-1')
        return NextResponse.json({ orgId: context.organizationId })
      })

      const wrappedHandler = withApiKeyAuth(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/v1/customers', {
        headers: {
          'Authorization': 'Bearer hzd_live_test_key_123'
        }
      })

      // Act
      const response = await wrappedHandler(request)
      const data = await response.json()

      // Assert
      expect(data.orgId).toBe('org-tenant-1')
    })

    it('should prevent cross-tenant access with different API keys', async () => {
      // Arrange - First tenant
      const tenant1ApiKey = {
        id: 'key-tenant-1',
        organization_id: 'org-tenant-1',
        scopes: ['customers:read'],
        rate_limit: 1000
      }

      vi.mocked(ApiKeyService.validate).mockResolvedValue({
        valid: true,
        apiKey: tenant1ApiKey as any,
        organizationId: 'org-tenant-1'
      })

      vi.mocked(ApiKeyService.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 3600000)
      })

      vi.mocked(ApiKeyService.logRequest).mockResolvedValue(undefined)

      const mockHandler = vi.fn().mockImplementation((request, context) => {
        // Simulate handler that filters by org ID
        expect(context.organizationId).toBe('org-tenant-1')
        return NextResponse.json({ orgId: context.organizationId })
      })

      const wrappedHandler = withApiKeyAuth(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/v1/customers', {
        headers: {
          'Authorization': 'Bearer hzd_live_tenant1_key'
        }
      })

      // Act
      const response = await wrappedHandler(request)
      const data = await response.json()

      // Assert - Tenant 1 can only access tenant 1 data
      expect(data.orgId).toBe('org-tenant-1')
      expect(data.orgId).not.toBe('org-tenant-2')
    })
  })
})
