import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the dependencies
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
    getConnectionStatus: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    syncCustomer: vi.fn(),
    syncInvoice: vi.fn()
  }
}))

// Import the route handlers
import { GET as getStatus } from '@/app/api/integrations/quickbooks/status/route'
import { GET as connect } from '@/app/api/integrations/quickbooks/connect/route'
import { POST as disconnect } from '@/app/api/integrations/quickbooks/disconnect/route'
import { POST as syncCustomer } from '@/app/api/integrations/quickbooks/sync/customer/route'
import { POST as syncInvoice } from '@/app/api/integrations/quickbooks/sync/invoice/route'
import { QuickBooksService } from '@/lib/services/quickbooks-service'

describe('Integrations QuickBooks API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/integrations/quickbooks/status', () => {
    it('should return connection status for authenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      const mockStatus = {
        connected: true,
        company_name: 'Test Company QB',
        last_sync: '2026-01-31T10:00:00Z',
        access_token_expires_at: '2026-02-28T10:00:00Z'
      }

      vi.mocked(QuickBooksService.getConnectionStatus).mockResolvedValue(mockStatus)

      const response = await getStatus()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockStatus)
      expect(QuickBooksService.getConnectionStatus).toHaveBeenCalledWith('org-1')
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const response = await getStatus()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 when no organization found', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'No rows found', code: 'PGRST116' }
            })
          })
        })
      } as any)

      const response = await getStatus()
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No organization found')
    })

    it('should handle service errors', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      vi.mocked(QuickBooksService.getConnectionStatus).mockRejectedValue(
        new Error('QuickBooks API unavailable')
      )

      const response = await getStatus()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to get status')
    })
  })

  describe('GET /api/integrations/quickbooks/connect', () => {
    it('should return connection URL for authenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      const mockConnectResult = {
        authUrl: 'https://appcenter.intuit.com/connect/oauth2?client_id=123&scope=com.intuit.quickbooks.accounting&redirect_uri=http://localhost:3000/api/integrations/quickbooks/callback&state=org-1'
      }

      vi.mocked(QuickBooksService.connect).mockResolvedValue(mockConnectResult)

      const response = await connect()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockConnectResult)
      expect(QuickBooksService.connect).toHaveBeenCalledWith('org-1')
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const response = await connect()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('POST /api/integrations/quickbooks/disconnect', () => {
    it('should disconnect QuickBooks for authenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      vi.mocked(QuickBooksService.disconnect).mockResolvedValue({ success: true })

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/disconnect', {
        method: 'POST'
      })

      const response = await disconnect(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(QuickBooksService.disconnect).toHaveBeenCalledWith('org-1')
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/disconnect', {
        method: 'POST'
      })

      const response = await disconnect(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('POST /api/integrations/quickbooks/sync/customer', () => {
    it('should sync customer to QuickBooks for authenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      const mockSyncResult = {
        success: true,
        quickbooks_id: 'qb-customer-123',
        sync_status: 'synced'
      }

      vi.mocked(QuickBooksService.syncCustomer).mockResolvedValue(mockSyncResult)

      const requestBody = {
        customer_id: 'customer-1'
      }

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/customer', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await syncCustomer(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockSyncResult)
      expect(QuickBooksService.syncCustomer).toHaveBeenCalledWith('org-1', 'customer-1')
    })

    it('should validate required customer_id', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/customer', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await syncCustomer(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('customer_id is required')
    })

    it('should handle sync errors', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      vi.mocked(QuickBooksService.syncCustomer).mockRejectedValue(
        new Error('Customer not found in QuickBooks')
      )

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/customer', {
        method: 'POST',
        body: JSON.stringify({ customer_id: 'customer-1' })
      })

      const response = await syncCustomer(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to sync customer')
    })
  })

  describe('POST /api/integrations/quickbooks/sync/invoice', () => {
    it('should sync invoice to QuickBooks for authenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      const mockSyncResult = {
        success: true,
        quickbooks_id: 'qb-invoice-456',
        sync_status: 'synced',
        quickbooks_doc_number: 'INV-001'
      }

      vi.mocked(QuickBooksService.syncInvoice).mockResolvedValue(mockSyncResult)

      const requestBody = {
        invoice_id: 'invoice-1'
      }

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/invoice', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await syncInvoice(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockSyncResult)
      expect(QuickBooksService.syncInvoice).toHaveBeenCalledWith('org-1', 'invoice-1')
    })

    it('should validate required invoice_id', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/invoice', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await syncInvoice(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invoice_id is required')
    })

    it('should handle invoice not found', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-1' },
              error: null
            })
          })
        })
      } as any)

      vi.mocked(QuickBooksService.syncInvoice).mockRejectedValue(
        new Error('Invoice not found')
      )

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/invoice', {
        method: 'POST',
        body: JSON.stringify({ invoice_id: 'invalid-invoice' })
      })

      const response = await syncInvoice(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to sync invoice')
    })
  })
})