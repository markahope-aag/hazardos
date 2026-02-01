import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/customers/route'
import { createMockCustomer, createMockCustomerArray } from '@/test/helpers/mock-data'

// Mock the customers service
vi.mock('@/lib/supabase/customers', () => ({
  CustomersService: {
    getCustomers: vi.fn(),
    createCustomer: vi.fn()
  }
}))

// Mock the server-side Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      })
    }
  })
}))

// Mock the multi-tenant auth
vi.mock('@/lib/hooks/use-multi-tenant-auth', () => ({
  useMultiTenantAuth: () => ({
    organization: { id: 'test-org-id' }
  })
}))

describe('Customers API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/customers', () => {
    it('should return customers list', async () => {
      const mockCustomers = createMockCustomerArray(2)

      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue(mockCustomers)

      const request = new NextRequest('http://localhost:3000/api/customers')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.customers).toEqual(mockCustomers)
    })

    it('should handle search query parameter', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/customers?search=john')
      await GET(request)
      
      expect(CustomersService.getCustomers).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ search: 'john' })
      )
    })

    it('should handle status filter parameter', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/customers?status=prospect')
      await GET(request)
      
      expect(CustomersService.getCustomers).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ status: 'prospect' })
      )
    })

    it('should handle pagination parameters', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/customers?page=2&limit=10')
      await GET(request)
      
      expect(CustomersService.getCustomers).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ 
          limit: 10,
          offset: 10 // page 2 with limit 10 = offset 10
        })
      )
    })

    it('should handle service errors', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/customers')
      const response = await GET(request)
      
      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('should validate status parameter values', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const validStatuses = ['lead', 'prospect', 'customer', 'inactive']
      
      for (const status of validStatuses) {
        const request = new NextRequest(`http://localhost:3000/api/customers?status=${status}`)
        const response = await GET(request)
        
        expect(response.status).toBe(200)
      }
    })

    it('should handle invalid status parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/customers?status=invalid')
      const response = await GET(request)
      
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('Invalid status')
    })
  })

  describe('POST /api/customers', () => {
    it('should create customer with valid data', async () => {
      const newCustomerData = {
        name: 'New Customer',
        email: 'new@example.com',
        status: 'lead'
      }

      const createdCustomer = createMockCustomer({ id: 'new-id', name: newCustomerData.name, email: newCustomerData.email, status: newCustomerData.status as 'lead' })

      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.createCustomer).mockResolvedValue(createdCustomer)

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify(newCustomerData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      
      expect(response.status).toBe(201)
      
      const data = await response.json()
      expect(data).toEqual(createdCustomer)
    })

    it('should validate required name field', async () => {
      const invalidData = {
        email: 'test@example.com'
        // Missing required name field
      }

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('name')
    })

    it('should validate email format', async () => {
      const invalidData = {
        name: 'Test Customer',
        email: 'invalid-email'
      }

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('email')
    })

    it('should handle service creation errors', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.createCustomer).mockRejectedValue(new Error('Creation failed'))

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Customer' }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      
      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('Invalid JSON')
    })

    it('should set organization_id from authenticated user', async () => {
      const newCustomerData = {
        name: 'Test Customer',
        status: 'lead'
      }

      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.createCustomer).mockResolvedValue(createMockCustomer({ id: 'new-id', name: newCustomerData.name }))

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify(newCustomerData),
        headers: { 'Content-Type': 'application/json' }
      })

      await POST(request)
      
      expect(CustomersService.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: expect.any(String)
        })
      )
    })

    it('should sanitize input data', async () => {
      const inputWithExtraFields = {
        name: 'Test Customer',
        email: 'test@example.com',
        maliciousField: '<script>alert("xss")</script>',
        id: 'should-be-ignored',
        created_at: 'should-be-ignored'
      }

      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.createCustomer).mockResolvedValue(createMockCustomer({ id: 'new-id', name: 'Test Customer' }))

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify(inputWithExtraFields),
        headers: { 'Content-Type': 'application/json' }
      })

      await POST(request)
      
      const calledWith = vi.mocked(CustomersService.createCustomer).mock.calls[0][0]
      expect(calledWith).not.toHaveProperty('maliciousField')
      expect(calledWith).not.toHaveProperty('id')
      expect(calledWith).not.toHaveProperty('created_at')
    })
  })

  describe('Authentication', () => {
    it('should require authentication', async () => {
      // Mock unauthenticated user
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null
          })
        }
      } as any)

      const request = new NextRequest('http://localhost:3000/api/customers')
      const response = await GET(request)
      
      expect(response.status).toBe(401)
    })
  })
})