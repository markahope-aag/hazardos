import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH, DELETE } from '@/app/api/customers/[id]/route'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('@/lib/supabase/customers', () => ({
  CustomersService: {
    getCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    deleteCustomer: vi.fn(),
  },
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { CustomersService } from '@/lib/supabase/customers'

describe('Customer By ID API', () => {
  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  const mockAdminProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  const mockTenantOwnerProfile = {
    organization_id: 'org-123',
    role: 'tenant_owner'
  }

  const mockCrewProfile = {
    organization_id: 'org-123',
    role: 'crew'
  }

  // Helper to setup authenticated user with profile
  const setupAuthenticatedUser = (profile = mockProfile) => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null,
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: profile,
            error: null
          })
        })
      })
    } as any)
  }

  // Helper to setup unauthenticated user
  const setupUnauthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' } as any,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/customers/[id]', () => {
    it('should return customer by ID', async () => {
      setupAuthenticatedUser()

      const mockCustomer = {
        id: 'customer-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        status: 'customer',
      }
      vi.mocked(CustomersService.getCustomer).mockResolvedValue(mockCustomer)

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123')

      const response = await GET(request, { params: Promise.resolve({ id: 'customer-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.customer).toEqual(mockCustomer)
      expect(CustomersService.getCustomer).toHaveBeenCalledWith('customer-123')
    })

    it('should return 404 for non-existent customer', async () => {
      setupAuthenticatedUser()

      vi.mocked(CustomersService.getCustomer).mockRejectedValue(
        new Error('Failed to fetch customer')
      )

      const request = new NextRequest('http://localhost:3000/api/customers/non-existent')

      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent' }) })

      expect(response.status).toBe(404)
    })

    it('should reject unauthenticated requests', async () => {
      setupUnauthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123')

      const response = await GET(request, { params: Promise.resolve({ id: 'customer-123' }) })

      expect(response.status).toBe(401)
    })
  })

  describe('PATCH /api/customers/[id]', () => {
    it('should update customer details', async () => {
      setupAuthenticatedUser()

      const updatedCustomer = {
        id: 'customer-123',
        name: 'John Doe Updated',
        email: 'john.updated@example.com',
        status: 'customer',
      }
      vi.mocked(CustomersService.updateCustomer).mockResolvedValue(updatedCustomer)

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe Updated',
          email: 'john.updated@example.com',
        }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'customer-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.customer).toEqual(updatedCustomer)
      expect(CustomersService.updateCustomer).toHaveBeenCalledWith('customer-123', {
        name: 'John Doe Updated',
        email: 'john.updated@example.com',
      })
    })

    it('should update customer address', async () => {
      setupAuthenticatedUser()

      const updatedCustomer = {
        id: 'customer-123',
        address_line1: '456 New St',
        city: 'Boston',
        state: 'MA',
        zip: '02101',
      }
      vi.mocked(CustomersService.updateCustomer).mockResolvedValue(updatedCustomer)

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address_line1: '456 New St',
          city: 'Boston',
          state: 'MA',
          zip: '02101',
        }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'customer-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.customer).toEqual(updatedCustomer)
    })

    it('should update customer status', async () => {
      setupAuthenticatedUser()

      const updatedCustomer = {
        id: 'customer-123',
        status: 'customer',
      }
      vi.mocked(CustomersService.updateCustomer).mockResolvedValue(updatedCustomer)

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'customer',
        }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'customer-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.customer.status).toBe('customer')
    })

    it('should update communication preferences', async () => {
      setupAuthenticatedUser()

      const updatedCustomer = {
        id: 'customer-123',
        communication_preferences: { email: false, sms: true, mail: false },
      }
      vi.mocked(CustomersService.updateCustomer).mockResolvedValue(updatedCustomer)

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communication_preferences: { email: false, sms: true, mail: false },
        }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'customer-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.customer.communication_preferences).toEqual({ email: false, sms: true, mail: false })
    })

    it('should return 404 for non-existent customer', async () => {
      setupAuthenticatedUser()

      vi.mocked(CustomersService.updateCustomer).mockRejectedValue(
        new Error('Failed to update customer')
      )

      const request = new NextRequest('http://localhost:3000/api/customers/non-existent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'non-existent' }) })

      expect(response.status).toBe(404)
    })

    it('should reject invalid email format', async () => {
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
        }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'customer-123' }) })

      expect(response.status).toBe(400)
    })

    it('should reject unauthenticated requests', async () => {
      setupUnauthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'customer-123' }) })

      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/customers/[id]', () => {
    it('should delete customer with admin role', async () => {
      setupAuthenticatedUser(mockAdminProfile)

      vi.mocked(CustomersService.deleteCustomer).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'customer-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Customer deleted successfully')
      expect(CustomersService.deleteCustomer).toHaveBeenCalledWith('customer-123')
    })

    it('should delete customer with tenant_owner role', async () => {
      setupAuthenticatedUser(mockTenantOwnerProfile)

      vi.mocked(CustomersService.deleteCustomer).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'customer-123' }) })

      expect(response.status).toBe(200)
    })

    it('should reject deletion from non-admin role', async () => {
      setupAuthenticatedUser(mockCrewProfile)

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'customer-123' }) })

      expect(response.status).toBe(403)
    })

    it('should return 404 for non-existent customer', async () => {
      setupAuthenticatedUser(mockAdminProfile)

      vi.mocked(CustomersService.deleteCustomer).mockRejectedValue(
        new Error('Failed to delete customer')
      )

      const request = new NextRequest('http://localhost:3000/api/customers/non-existent', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'non-existent' }) })

      expect(response.status).toBe(404)
    })

    it('should reject unauthenticated requests', async () => {
      setupUnauthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'customer-123' }) })

      expect(response.status).toBe(401)
    })
  })
})
