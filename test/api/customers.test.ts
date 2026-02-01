import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/customers/route'

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
  or: vi.fn(() => mockSupabaseClient),
  ilike: vi.fn(() => mockSupabaseClient),
  limit: vi.fn(() => mockSupabaseClient),
  range: vi.fn(() => mockSupabaseClient),
  order: vi.fn(() => mockSupabaseClient),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

vi.mock('@/lib/supabase/customers', () => ({
  CustomersService: {
    getCustomers: vi.fn(),
    createCustomer: vi.fn(),
  },
}))

import { CustomersService } from '@/lib/supabase/customers'

describe('Customers API', () => {
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

  describe('GET /api/customers', () => {
    it('should return list of customers', async () => {
      // Arrange
      const mockCustomers = [
        { id: '1', name: 'John Doe', email: 'john@example.com', status: 'customer' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'lead' },
      ]
      vi.mocked(CustomersService.getCustomers).mockResolvedValue(mockCustomers)

      const request = new NextRequest('http://localhost:3000/api/customers')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.customers).toEqual(mockCustomers)
      expect(CustomersService.getCustomers).toHaveBeenCalledWith('org-123', {
        status: undefined,
        search: undefined,
        limit: undefined,
        offset: undefined,
      })
    })

    it('should filter customers by status', async () => {
      // Arrange
      const mockCustomers = [
        { id: '1', name: 'John Doe', status: 'customer' },
      ]
      vi.mocked(CustomersService.getCustomers).mockResolvedValue(mockCustomers)

      const request = new NextRequest('http://localhost:3000/api/customers?status=customer')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.customers).toEqual(mockCustomers)
      expect(CustomersService.getCustomers).toHaveBeenCalledWith('org-123', {
        status: 'customer',
        search: undefined,
        limit: undefined,
        offset: undefined,
      })
    })

    it('should search customers by name or email', async () => {
      // Arrange
      const mockCustomers = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
      ]
      vi.mocked(CustomersService.getCustomers).mockResolvedValue(mockCustomers)

      const request = new NextRequest('http://localhost:3000/api/customers?search=john')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.customers).toEqual(mockCustomers)
      expect(CustomersService.getCustomers).toHaveBeenCalledWith('org-123', {
        status: undefined,
        search: 'john',
        limit: undefined,
        offset: undefined,
      })
    })

    it('should support pagination with limit and offset', async () => {
      // Arrange
      const mockCustomers = [
        { id: '11', name: 'Customer 11' },
        { id: '12', name: 'Customer 12' },
      ]
      vi.mocked(CustomersService.getCustomers).mockResolvedValue(mockCustomers)

      const request = new NextRequest('http://localhost:3000/api/customers?limit=10&offset=10')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.customers).toEqual(mockCustomers)
      expect(CustomersService.getCustomers).toHaveBeenCalledWith('org-123', {
        status: undefined,
        search: undefined,
        limit: 10,
        offset: 10,
      })
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/customers')

      // Act
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/customers', () => {
    it('should create a new customer', async () => {
      // Arrange
      const newCustomer = {
        id: 'customer-123',
        organization_id: 'org-123',
        name: 'New Customer',
        email: 'new@example.com',
        phone: '555-1234',
        status: 'lead',
        created_by: 'user-123',
      }
      vi.mocked(CustomersService.createCustomer).mockResolvedValue(newCustomer)

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Customer',
          email: 'new@example.com',
          phone: '555-1234',
        }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.customer).toEqual(newCustomer)
      expect(CustomersService.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org-123',
          name: 'New Customer',
          email: 'new@example.com',
          phone: '555-1234',
          status: 'lead',
          created_by: 'user-123',
        })
      )
    })

    it('should create customer with full address details', async () => {
      // Arrange
      const newCustomer = {
        id: 'customer-123',
        name: 'New Customer',
        address_line1: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
      }
      vi.mocked(CustomersService.createCustomer).mockResolvedValue(newCustomer)

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Customer',
          address_line1: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
        }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.customer).toEqual(newCustomer)
    })

    it('should create customer with communication preferences', async () => {
      // Arrange
      const newCustomer = {
        id: 'customer-123',
        name: 'New Customer',
        communication_preferences: { email: true, sms: true, mail: false },
        marketing_consent: true,
      }
      vi.mocked(CustomersService.createCustomer).mockResolvedValue(newCustomer)

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Customer',
          communication_preferences: { email: true, sms: true, mail: false },
          marketing_consent: true,
        }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.customer.communication_preferences).toEqual({ email: true, sms: true, mail: false })
      expect(data.customer.marketing_consent).toBe(true)
    })

    it('should reject customer creation without name', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'no-name@example.com',
        }),
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(400)
    })

    it('should reject customer creation with invalid email', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Customer',
          email: 'invalid-email',
        }),
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(400)
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Customer' }),
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(401)
    })
  })
})
