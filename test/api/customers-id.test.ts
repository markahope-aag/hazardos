import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH, DELETE } from '@/app/api/customers/[id]/route'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  single: vi.fn(),
  insert: vi.fn(() => mockSupabaseClient),
  update: vi.fn(() => mockSupabaseClient),
  delete: vi.fn(() => mockSupabaseClient),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

vi.mock('@/lib/supabase/customers', () => ({
  CustomersService: {
    getCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    deleteCustomer: vi.fn(),
  },
}))

import { CustomersService } from '@/lib/supabase/customers'

describe('Customer By ID API', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default auth mock - authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    // Default profile mock
    mockSupabaseClient.single.mockResolvedValue({
      data: {
        id: 'profile-123',
        organization_id: 'org-123',
        role: 'admin'
      },
      error: null,
    })
  })

  describe('GET /api/customers/[id]', () => {
    it('should return customer by ID', async () => {
      // Arrange
      const mockCustomer = {
        id: 'customer-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        status: 'customer',
      }
      vi.mocked(CustomersService.getCustomer).mockResolvedValue(mockCustomer)

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123')

      // Act
      const response = await GET(request, { params: Promise.resolve({ id: 'customer-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.customer).toEqual(mockCustomer)
      expect(CustomersService.getCustomer).toHaveBeenCalledWith('customer-123')
    })

    it('should return 404 for non-existent customer', async () => {
      // Arrange
      vi.mocked(CustomersService.getCustomer).mockRejectedValue(
        new Error('Failed to fetch customer')
      )

      const request = new NextRequest('http://localhost:3000/api/customers/non-existent')

      // Act
      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent' }) })

      // Assert
      expect(response.status).toBe(404)
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123')

      // Act
      const response = await GET(request, { params: Promise.resolve({ id: 'customer-123' }) })

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('PATCH /api/customers/[id]', () => {
    it('should update customer details', async () => {
      // Arrange
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

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ id: 'customer-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.customer).toEqual(updatedCustomer)
      expect(CustomersService.updateCustomer).toHaveBeenCalledWith('customer-123', {
        name: 'John Doe Updated',
        email: 'john.updated@example.com',
      })
    })

    it('should update customer address', async () => {
      // Arrange
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

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ id: 'customer-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.customer).toEqual(updatedCustomer)
    })

    it('should update customer status', async () => {
      // Arrange
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

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ id: 'customer-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.customer.status).toBe('customer')
    })

    it('should update communication preferences', async () => {
      // Arrange
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

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ id: 'customer-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.customer.communication_preferences).toEqual({ email: false, sms: true, mail: false })
    })

    it('should return 404 for non-existent customer', async () => {
      // Arrange
      vi.mocked(CustomersService.updateCustomer).mockRejectedValue(
        new Error('Failed to update customer')
      )

      const request = new NextRequest('http://localhost:3000/api/customers/non-existent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      })

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ id: 'non-existent' }) })

      // Assert
      expect(response.status).toBe(404)
    })

    it('should reject invalid email format', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/customers/customer-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
        }),
      })

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ id: 'customer-123' }) })

      // Assert
      expect(response.status).toBe(400)
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      })

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ id: 'customer-123' }) })

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/customers/[id]', () => {
    it('should delete customer with admin role', async () => {
      // Arrange
      vi.mocked(CustomersService.deleteCustomer).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(request, { params: Promise.resolve({ id: 'customer-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.message).toBe('Customer deleted successfully')
      expect(CustomersService.deleteCustomer).toHaveBeenCalledWith('customer-123')
    })

    it('should delete customer with tenant_owner role', async () => {
      // Arrange
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          id: 'profile-123',
          organization_id: 'org-123',
          role: 'tenant_owner'
        },
        error: null,
      })
      vi.mocked(CustomersService.deleteCustomer).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(request, { params: Promise.resolve({ id: 'customer-123' }) })

      // Assert
      expect(response.status).toBe(200)
    })

    it('should reject deletion from non-admin role', async () => {
      // Arrange
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          id: 'profile-123',
          organization_id: 'org-123',
          role: 'crew'
        },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(request, { params: Promise.resolve({ id: 'customer-123' }) })

      // Assert
      expect(response.status).toBe(403)
    })

    it('should return 404 for non-existent customer', async () => {
      // Arrange
      vi.mocked(CustomersService.deleteCustomer).mockRejectedValue(
        new Error('Failed to delete customer')
      )

      const request = new NextRequest('http://localhost:3000/api/customers/non-existent', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(request, { params: Promise.resolve({ id: 'non-existent' }) })

      // Assert
      expect(response.status).toBe(404)
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(request, { params: Promise.resolve({ id: 'customer-123' }) })

      // Assert
      expect(response.status).toBe(401)
    })
  })
})
