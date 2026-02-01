import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/integrations/quickbooks/sync/customer/route'
import { QuickBooksService } from '@/lib/services/quickbooks-service'

// Mock dependencies
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
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/quickbooks-service', () => ({
  QuickBooksService: {
    syncCustomerToQBO: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('POST /api/integrations/quickbooks/sync/customer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  it('should sync customer to QuickBooks for authenticated user', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    const mockQBId = 'qb-customer-123'
    vi.mocked(QuickBooksService.syncCustomerToQBO).mockResolvedValue(mockQBId)

    const syncData = {
      customer_id: '550e8400-e29b-41d4-a716-446655440000'
    }

    const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/customer', {
      method: 'POST',
      body: JSON.stringify(syncData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ qb_customer_id: mockQBId })
    expect(QuickBooksService.syncCustomerToQBO).toHaveBeenCalledWith(
      'org-123',
      '550e8400-e29b-41d4-a716-446655440000'
    )
  })

  it('should return 401 for unauthenticated user', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null
    })

    const syncData = {
      customer_id: '550e8400-e29b-41d4-a716-446655440000'
    }

    const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/customer', {
      method: 'POST',
      body: JSON.stringify(syncData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.type).toBe('UNAUTHORIZED')
  })

  it('should validate customer_id is UUID format', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    const invalidData = {
      customer_id: 'not-a-uuid'
    }

    const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/customer', {
      method: 'POST',
      body: JSON.stringify(invalidData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
  })

  it('should require customer_id field', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/customer', {
      method: 'POST',
      body: JSON.stringify({})
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
  })

  it('should handle QuickBooks API connection errors', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    vi.mocked(QuickBooksService.syncCustomerToQBO).mockRejectedValue(
      new Error('QuickBooks connection failed')
    )

    const syncData = {
      customer_id: '550e8400-e29b-41d4-a716-446655440000'
    }

    const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/customer', {
      method: 'POST',
      body: JSON.stringify(syncData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
    expect(data.error).not.toContain('QuickBooks connection')
  })

  it('should handle customer not found error', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    vi.mocked(QuickBooksService.syncCustomerToQBO).mockRejectedValue(
      new Error('Customer not found')
    )

    const syncData = {
      customer_id: '550e8400-e29b-41d4-a716-446655440000'
    }

    const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/customer', {
      method: 'POST',
      body: JSON.stringify(syncData)
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
  })

  it('should handle QuickBooks authentication errors securely', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    vi.mocked(QuickBooksService.syncCustomerToQBO).mockRejectedValue(
      new Error('QuickBooks OAuth token expired')
    )

    const syncData = {
      customer_id: '550e8400-e29b-41d4-a716-446655440000'
    }

    const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/customer', {
      method: 'POST',
      body: JSON.stringify(syncData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
    expect(data.error).not.toContain('OAuth')
    expect(data.error).not.toContain('token')
  })

  it('should handle duplicate customer in QuickBooks', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    vi.mocked(QuickBooksService.syncCustomerToQBO).mockRejectedValue(
      new Error('Customer already exists in QuickBooks')
    )

    const syncData = {
      customer_id: '550e8400-e29b-41d4-a716-446655440000'
    }

    const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/customer', {
      method: 'POST',
      body: JSON.stringify(syncData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
  })
})
