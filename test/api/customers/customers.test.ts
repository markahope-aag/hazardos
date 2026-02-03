import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '@/app/api/customers/route'
import { CustomerService } from '@/lib/services/customer-service'

// Mock dependencies
vi.mock('@/lib/services/customer-service')
vi.mock('@/lib/middleware/auth', () => ({
  requireAuth: vi.fn((handler) => handler),
}))
vi.mock('@/lib/middleware/rate-limit', () => ({
  rateLimit: vi.fn((handler) => handler),
}))

const mockCustomerService = vi.mocked(CustomerService)

describe('/api/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/customers', () => {
    it('retrieves customers with default pagination', async () => {
      const mockCustomers = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          company_name: 'Acme Corp',
          status: 'active',
          source: 'website',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+1987654321',
          company_name: 'Tech Inc',
          status: 'active',
          source: 'referral',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]

      mockCustomerService.getAll.mockResolvedValue({
        customers: mockCustomers,
        total: 2,
        limit: 50,
        offset: 0,
      })

      const request = new NextRequest('http://localhost:3000/api/customers')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.customers).toHaveLength(2)
      expect(data.data.total).toBe(2)
      expect(data.data.pagination).toEqual({
        limit: 50,
        offset: 0,
        total: 2,
        pages: 1,
        current_page: 1,
      })
    })

    it('handles pagination parameters', async () => {
      mockCustomerService.getAll.mockResolvedValue({
        customers: [],
        total: 100,
        limit: 10,
        offset: 20,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/customers?limit=10&offset=20'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(mockCustomerService.getAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 20,
      })
      expect(data.data.pagination.current_page).toBe(3)
      expect(data.data.pagination.pages).toBe(10)
    })

    it('filters customers by status', async () => {
      mockCustomerService.getAll.mockResolvedValue({
        customers: [],
        total: 0,
        limit: 50,
        offset: 0,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/customers?status=inactive'
      )
      await GET(request)

      expect(mockCustomerService.getAll).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
        filters: {
          status: 'inactive',
        },
      })
    })

    it('searches customers by name and email', async () => {
      mockCustomerService.getAll.mockResolvedValue({
        customers: [],
        total: 0,
        limit: 50,
        offset: 0,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/customers?search=john'
      )
      await GET(request)

      expect(mockCustomerService.getAll).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
        search: 'john',
      })
    })

    it('sorts customers by specified field', async () => {
      mockCustomerService.getAll.mockResolvedValue({
        customers: [],
        total: 0,
        limit: 50,
        offset: 0,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/customers?sort_by=created_at&sort_order=desc'
      )
      await GET(request)

      expect(mockCustomerService.getAll).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
        sort_by: 'created_at',
        sort_order: 'desc',
      })
    })

    it('handles service errors gracefully', async () => {
      mockCustomerService.getAll.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/customers')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to retrieve customers')
    })

    it('validates pagination parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/customers?limit=invalid&offset=-1'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid pagination parameters')
    })

    it('enforces maximum limit', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/customers?limit=1000'
      )
      const _response = await GET(request)

      expect(mockCustomerService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100, // Max limit enforced
        })
      )
    })
  })

  describe('POST /api/customers', () => {
    it('creates a new customer successfully', async () => {
      const newCustomer = {
        name: 'New Customer',
        email: 'new@example.com',
        phone: '+1555123456',
        company_name: 'New Corp',
        source: 'website',
      }

      const createdCustomer = {
        id: '3',
        ...newCustomer,
        status: 'active',
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      }

      mockCustomerService.create.mockResolvedValue(createdCustomer)

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify(newCustomer),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(createdCustomer)
      expect(mockCustomerService.create).toHaveBeenCalledWith(newCustomer)
    })

    it('validates required fields', async () => {
      const invalidCustomer = {
        email: 'invalid-email',
        // Missing required name field
      }

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify(invalidCustomer),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('validation')
      expect(mockCustomerService.create).not.toHaveBeenCalled()
    })

    it('handles duplicate email addresses', async () => {
      const duplicateCustomer = {
        name: 'Duplicate Customer',
        email: 'existing@example.com',
        phone: '+1555987654',
      }

      mockCustomerService.create.mockRejectedValue(
        new Error('Customer with this email already exists')
      )

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify(duplicateCustomer),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error).toContain('already exists')
    })

    it('sanitizes input data', async () => {
      const unsafeCustomer = {
        name: '<script>alert("xss")</script>John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        company_name: 'Acme <img src=x onerror=alert(1)> Corp',
      }

      const sanitizedCustomer = {
        id: '4',
        name: 'John Doe', // Script tags removed
        email: 'john@example.com',
        phone: '+1234567890',
        company_name: 'Acme  Corp', // Malicious tags removed
        status: 'active',
        created_at: '2024-01-04T00:00:00Z',
        updated_at: '2024-01-04T00:00:00Z',
      }

      mockCustomerService.create.mockResolvedValue(sanitizedCustomer)

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify(unsafeCustomer),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.name).not.toContain('<script>')
      expect(data.data.company_name).not.toContain('<img')
    })

    it('handles malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: 'invalid json{',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid JSON')
    })

    it('validates email format', async () => {
      const invalidEmailCustomer = {
        name: 'Test Customer',
        email: 'not-an-email',
        phone: '+1234567890',
      }

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify(invalidEmailCustomer),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid email format')
    })

    it('validates phone number format', async () => {
      const invalidPhoneCustomer = {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: 'not-a-phone',
      }

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify(invalidPhoneCustomer),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid phone number format')
    })
  })

  describe('PUT /api/customers/[id]', () => {
    it('updates customer successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
        status: 'inactive',
      }

      const updatedCustomer = {
        id: '1',
        ...updateData,
        phone: '+1234567890',
        company_name: 'Acme Corp',
        source: 'website',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      }

      mockCustomerService.update.mockResolvedValue(updatedCustomer)

      const request = new NextRequest('http://localhost:3000/api/customers/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(updatedCustomer)
      expect(mockCustomerService.update).toHaveBeenCalledWith('1', updateData)
    })

    it('handles customer not found', async () => {
      mockCustomerService.update.mockRejectedValue(new Error('Customer not found'))

      const request = new NextRequest('http://localhost:3000/api/customers/999', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: { id: '999' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('not found')
    })

    it('validates update data', async () => {
      const invalidUpdate = {
        email: 'invalid-email-format',
        status: 'invalid-status',
      }

      const request = new NextRequest('http://localhost:3000/api/customers/1', {
        method: 'PUT',
        body: JSON.stringify(invalidUpdate),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('validation')
    })

    it('prevents updating to duplicate email', async () => {
      mockCustomerService.update.mockRejectedValue(
        new Error('Email already exists for another customer')
      )

      const request = new NextRequest('http://localhost:3000/api/customers/1', {
        method: 'PUT',
        body: JSON.stringify({ email: 'existing@example.com' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error).toContain('already exists')
    })
  })

  describe('DELETE /api/customers/[id]', () => {
    it('deletes customer successfully', async () => {
      mockCustomerService.delete.mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/customers/1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Customer deleted successfully')
      expect(mockCustomerService.delete).toHaveBeenCalledWith('1')
    })

    it('handles customer not found for deletion', async () => {
      mockCustomerService.delete.mockRejectedValue(new Error('Customer not found'))

      const request = new NextRequest('http://localhost:3000/api/customers/999', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: '999' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('not found')
    })

    it('prevents deletion of customers with active jobs', async () => {
      mockCustomerService.delete.mockRejectedValue(
        new Error('Cannot delete customer with active jobs')
      )

      const request = new NextRequest('http://localhost:3000/api/customers/1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error).toContain('active jobs')
    })

    it('supports soft delete', async () => {
      mockCustomerService.softDelete.mockResolvedValue({
        id: '1',
        name: 'Deleted Customer',
        status: 'deleted',
        deleted_at: '2024-01-03T00:00:00Z',
      })

      const request = new NextRequest(
        'http://localhost:3000/api/customers/1?soft=true',
        {
          method: 'DELETE',
        }
      )

      const response = await DELETE(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.status).toBe('deleted')
      expect(mockCustomerService.softDelete).toHaveBeenCalledWith('1')
    })
  })

  describe('Security and Rate Limiting', () => {
    it('enforces authentication', async () => {
      // Mock auth middleware to reject
      const { requireAuth } = await import('@/lib/middleware/auth')
      vi.mocked(requireAuth).mockImplementation(() => {
        throw new Error('Unauthorized')
      })

      const request = new NextRequest('http://localhost:3000/api/customers')

      await expect(GET(request)).rejects.toThrow('Unauthorized')
    })

    it('applies rate limiting', async () => {
      const { rateLimit } = await import('@/lib/middleware/rate-limit')
      vi.mocked(rateLimit).mockImplementation(() => {
        throw new Error('Rate limit exceeded')
      })

      const request = new NextRequest('http://localhost:3000/api/customers')

      await expect(GET(request)).rejects.toThrow('Rate limit exceeded')
    })

    it('validates request size limits', async () => {
      const largePayload = {
        name: 'A'.repeat(10000), // Very long name
        email: 'test@example.com',
        description: 'B'.repeat(50000), // Very long description
      }

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify(largePayload),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(413)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Request too large')
    })

    it('prevents SQL injection attempts', async () => {
      const maliciousSearch = "'; DROP TABLE customers; --"

      const request = new NextRequest(
        `http://localhost:3000/api/customers?search=${encodeURIComponent(maliciousSearch)}`
      )

      // Should not throw an error, should sanitize input
      const response = await GET(request)
      expect(response.status).toBe(200)

      // Verify the search parameter was sanitized
      expect(mockCustomerService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.not.stringContaining('DROP TABLE'),
        })
      )
    })
  })

  describe('Performance and Caching', () => {
    it('includes appropriate cache headers', async () => {
      mockCustomerService.getAll.mockResolvedValue({
        customers: [],
        total: 0,
        limit: 50,
        offset: 0,
      })

      const request = new NextRequest('http://localhost:3000/api/customers')
      const response = await GET(request)

      expect(response.headers.get('Cache-Control')).toBe(
        'private, max-age=300, stale-while-revalidate=60'
      )
    })

    it('handles concurrent requests efficiently', async () => {
      mockCustomerService.getAll.mockResolvedValue({
        customers: [],
        total: 0,
        limit: 50,
        offset: 0,
      })

      const requests = Array.from({ length: 10 }, () =>
        GET(new NextRequest('http://localhost:3000/api/customers'))
      )

      const responses = await Promise.all(requests)

      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })

      // Service should be called for each request (no inappropriate caching)
      expect(mockCustomerService.getAll).toHaveBeenCalledTimes(10)
    })

    it('optimizes database queries with proper indexing hints', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/customers?search=john&status=active&sort_by=created_at'
      )

      await GET(request)

      expect(mockCustomerService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'john',
          filters: { status: 'active' },
          sort_by: 'created_at',
          // Should include optimization hints
          use_index: true,
        })
      )
    })
  })
})