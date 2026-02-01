import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/integrations/quickbooks/sync/invoice/route'
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
    syncInvoiceToQBO: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('POST /api/integrations/quickbooks/sync/invoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  it('should sync invoice to QuickBooks for authenticated user', async () => {
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

    const mockQBInvoiceId = 'qb-invoice-456'
    vi.mocked(QuickBooksService.syncInvoiceToQBO).mockResolvedValue(mockQBInvoiceId)

    const syncData = {
      invoice_id: '550e8400-e29b-41d4-a716-446655440001'
    }

    const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/invoice', {
      method: 'POST',
      body: JSON.stringify(syncData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ qb_invoice_id: mockQBInvoiceId })
    expect(QuickBooksService.syncInvoiceToQBO).toHaveBeenCalledWith(
      'org-123',
      '550e8400-e29b-41d4-a716-446655440001'
    )
  })

  it('should return 401 for unauthenticated user', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null
    })

    const syncData = {
      invoice_id: '550e8400-e29b-41d4-a716-446655440001'
    }

    const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/invoice', {
      method: 'POST',
      body: JSON.stringify(syncData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.type).toBe('UNAUTHORIZED')
  })

  it('should validate invoice_id is UUID format', async () => {
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
      invoice_id: 'not-a-valid-uuid'
    }

    const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/invoice', {
      method: 'POST',
      body: JSON.stringify(invalidData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
  })

  it('should require invoice_id field', async () => {
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

    const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/invoice', {
      method: 'POST',
      body: JSON.stringify({})
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
  })

  it('should handle invoice not found error', async () => {
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

    vi.mocked(QuickBooksService.syncInvoiceToQBO).mockRejectedValue(
      new Error('Invoice not found')
    )

    const syncData = {
      invoice_id: '550e8400-e29b-41d4-a716-446655440001'
    }

    const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/invoice', {
      method: 'POST',
      body: JSON.stringify(syncData)
    })

    const response = await POST(request)

    expect(response.status).toBeGreaterThanOrEqual(400)
  })

  it('should handle missing customer sync error', async () => {
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

    vi.mocked(QuickBooksService.syncInvoiceToQBO).mockRejectedValue(
      new Error('Customer must be synced before invoice')
    )

    const syncData = {
      invoice_id: '550e8400-e29b-41d4-a716-446655440001'
    }

    const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/invoice', {
      method: 'POST',
      body: JSON.stringify(syncData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
  })

  it('should handle QuickBooks API errors securely', async () => {
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

    vi.mocked(QuickBooksService.syncInvoiceToQBO).mockRejectedValue(
      new Error('QuickBooks API rate limit exceeded')
    )

    const syncData = {
      invoice_id: '550e8400-e29b-41d4-a716-446655440001'
    }

    const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/invoice', {
      method: 'POST',
      body: JSON.stringify(syncData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
    expect(data.error).not.toContain('QuickBooks API')
    expect(data.error).not.toContain('rate limit')
  })
})
