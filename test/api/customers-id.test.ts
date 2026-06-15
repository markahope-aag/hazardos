import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH, DELETE } from '@/app/api/customers/[id]/route'

// Mock Supabase client. The route handlers query `context.supabase`
// directly (not CustomersService): the auth path fetches the caller's
// profile from `profiles`, then the handler hits `customers` with
// select/maybeSingle (GET), update/select/maybeSingle (PATCH), or
// delete (DELETE). The mock below routes `from(table)` to a builder
// that resolves the configured result for that table.
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

interface QueryResult {
  data: unknown
  error: unknown
}

// Build a chainable query-builder stub whose terminal methods
// (single / maybeSingle) resolve to `result`. Every chain method
// returns the same builder so any call order the route uses works:
// select().eq().single(), update().eq().select().maybeSingle(),
// delete().eq(), etc. `delete().eq()` is itself awaited (no terminal
// single), so the builder is thenable and resolves to `result`.
function makeBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {}
  const chain = vi.fn(() => builder)
  builder.select = chain
  builder.eq = chain
  builder.update = chain
  builder.delete = chain
  builder.insert = chain
  builder.order = chain
  builder.single = vi.fn().mockResolvedValue(result)
  builder.maybeSingle = vi.fn().mockResolvedValue(result)
  // Make the builder awaitable for terminal chains like delete().eq().
  builder.then = (resolve: (value: QueryResult) => unknown) => resolve(result)
  return builder
}

describe('Customer By ID API', () => {
  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
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

  // Configure the `from(table)` router. `profileResult` backs the
  // auth/profile lookup; `customerResult` backs every `customers` query.
  const setupFrom = (
    profile: unknown,
    customerResult: QueryResult = { data: null, error: null }
  ) => {
    vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeBuilder({ data: profile, error: null }) as any
      }
      return makeBuilder(customerResult) as any
    })
  }

  // Helper to setup authenticated user with profile
  const setupAuthenticatedUser = (
    profile = mockProfile,
    customerResult: QueryResult = { data: null, error: null }
  ) => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null,
    })

    setupFrom(profile, customerResult)
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
      const mockCustomer = {
        id: 'customer-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        status: 'customer',
      }
      setupAuthenticatedUser(mockProfile, { data: mockCustomer, error: null })

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123')

      const response = await GET(request, { params: Promise.resolve({ id: 'customer-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.customer).toEqual(mockCustomer)
    })

    it('should return 404 for non-existent customer', async () => {
      // Route returns 404 when the customers query resolves with no row.
      setupAuthenticatedUser(mockProfile, { data: null, error: null })

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
      const updatedCustomer = {
        id: 'customer-123',
        name: 'John Doe Updated',
        email: 'john.updated@example.com',
        status: 'customer',
      }
      setupAuthenticatedUser(mockProfile, { data: updatedCustomer, error: null })

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
    })

    it('should update customer address', async () => {
      const updatedCustomer = {
        id: 'customer-123',
        address_line1: '456 New St',
        city: 'Boston',
        state: 'MA',
        zip: '02101',
      }
      setupAuthenticatedUser(mockProfile, { data: updatedCustomer, error: null })

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
      const updatedCustomer = {
        id: 'customer-123',
        status: 'customer',
      }
      setupAuthenticatedUser(mockProfile, { data: updatedCustomer, error: null })

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
      const updatedCustomer = {
        id: 'customer-123',
        communication_preferences: { email: false, sms: true, mail: false },
      }
      setupAuthenticatedUser(mockProfile, { data: updatedCustomer, error: null })

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
      // Update returns no row -> route responds 404.
      setupAuthenticatedUser(mockProfile, { data: null, error: null })

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
      setupAuthenticatedUser(mockAdminProfile, { data: null, error: null })

      const request = new NextRequest('http://localhost:3000/api/customers/customer-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'customer-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Customer deleted successfully')
    })

    it('should delete customer with tenant_owner role', async () => {
      setupAuthenticatedUser(mockTenantOwnerProfile, { data: null, error: null })

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
      // A delete against a missing row surfaces a "not found" DB error,
      // which the secure error handler maps to 404.
      setupAuthenticatedUser(mockAdminProfile, {
        data: null,
        error: { message: 'Customer not found' },
      })

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
