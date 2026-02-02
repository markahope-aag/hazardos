import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/v1/customers/route'

// Create a chainable query builder mock
function createQueryBuilder() {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder), // Range returns builder for further chaining
    or: vi.fn(() => builder),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    // Await support - when awaited, return the mock data
    then: vi.fn((resolve) => {
      resolve({
        data: [],
        count: 0,
        error: null
      })
    })
  }
  return builder
}

const mockSupabaseClient = {
  from: vi.fn(() => createQueryBuilder())
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/api-key-service', () => ({
  ApiKeyService: {
    hasScope: vi.fn()
  }
}))

vi.mock('@/lib/middleware/api-key-auth', () => ({
  withApiKeyAuth: (handler: (...args: unknown[]) => unknown) => handler
}))

import { ApiKeyService } from '@/lib/services/api-key-service'

describe('V1 Customers API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockContext = {
    organizationId: 'org-123',
    apiKey: { id: 'key-1', scopes: ['customers:read', 'customers:write'] }
  }

  describe('GET /api/v1/customers', () => {
    it('should list customers with pagination', async () => {
      // Arrange
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const mockCustomers = [
        { id: 'cust-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', status: 'active' },
        { id: 'cust-2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', status: 'active' }
      ]

      const builder = createQueryBuilder()
      builder.then.mockImplementation((resolve) => {
        resolve({
          data: mockCustomers,
          count: 25,
          error: null
        })
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue(builder)

      const request = new NextRequest('http://localhost:3000/api/v1/customers?limit=2&offset=0')

      // Act
      const response = await GET(request, mockContext)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(2)
      expect(data.pagination.total).toBe(25)
      expect(data.pagination.has_more).toBe(true)
    })

    it('should filter customers by status', async () => {
      // Arrange
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const builder = createQueryBuilder()
      builder.then.mockImplementation((resolve) => {
        resolve({
          data: [{ id: 'cust-1', status: 'inactive' }],
          count: 1,
          error: null
        })
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue(builder)

      const request = new NextRequest('http://localhost:3000/api/v1/customers?status=inactive')

      // Act
      const response = await GET(request, mockContext)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.data[0].status).toBe('inactive')
    })

    it('should search customers', async () => {
      // Arrange
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const builder = createQueryBuilder()
      builder.then.mockImplementation((resolve) => {
        resolve({
          data: [{ id: 'cust-1', first_name: 'John' }],
          count: 1,
          error: null
        })
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue(builder)

      const request = new NextRequest('http://localhost:3000/api/v1/customers?search=John')

      // Act
      const response = await GET(request, mockContext)

      // Assert
      expect(response.status).toBe(200)
    })

    it('should return 403 without customers:read scope', async () => {
      // Arrange
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(false)

      const builder = createQueryBuilder()
      vi.mocked(mockSupabaseClient.from).mockReturnValue(builder)

      const request = new NextRequest('http://localhost:3000/api/v1/customers')

      // Act
      const response = await GET(request, mockContext)

      // Assert
      expect(response.status).toBe(403)
    })
  })

  describe('POST /api/v1/customers', () => {
    it('should create customer with API key', async () => {
      // Arrange
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const newCustomer = {
        id: 'cust-new',
        organization_id: 'org-123',
        first_name: 'Bob',
        last_name: 'Johnson',
        email: 'bob@example.com',
        status: 'active',
        lead_source: 'api'
      }

      const builder = createQueryBuilder()
      builder.insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: newCustomer,
            error: null
          })
        })
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue(builder)

      const request = new NextRequest('http://localhost:3000/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: 'Bob',
          last_name: 'Johnson',
          email: 'bob@example.com',
          phone: '555-0123',
          company_name: 'Bob Industries'
        })
      })

      // Act
      const response = await POST(request, mockContext)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.data.first_name).toBe('Bob')
      expect(data.data.lead_source).toBe('api')
    })

    it('should return 400 if no name provided', async () => {
      // Arrange
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)

      const builder = createQueryBuilder()
      vi.mocked(mockSupabaseClient.from).mockReturnValue(builder)

      const request = new NextRequest('http://localhost:3000/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com'
        })
      })

      // Act
      const response = await POST(request, mockContext)

      // Assert
      expect(response.status).toBe(400)
    })

    it('should return 403 without customers:write scope', async () => {
      // Arrange
      vi.mocked(ApiKeyService.hasScope).mockReturnValue(false)

      const builder = createQueryBuilder()
      vi.mocked(mockSupabaseClient.from).mockReturnValue(builder)

      const request = new NextRequest('http://localhost:3000/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'User'
        })
      })

      // Act
      const response = await POST(request, mockContext)

      // Assert
      expect(response.status).toBe(403)
    })
  })
})
