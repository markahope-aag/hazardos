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
    getAuthorizationUrl: vi.fn(),
    disconnect: vi.fn(),
    syncCustomerToQBO: vi.fn(),
    syncInvoiceToQBO: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
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

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  const setupAuthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
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
  }

  const setupUnauthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null
    })
  }

  const setupNoProfile = () => {
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
  }

  describe('GET /api/integrations/quickbooks/status', () => {
    it('should return connection status for authenticated user', async () => {
      setupAuthenticatedUser()

      const mockStatus = {
        connected: true,
        company_name: 'Test Company QB',
        last_sync: '2026-01-31T10:00:00Z',
        access_token_expires_at: '2026-02-28T10:00:00Z'
      }

      vi.mocked(QuickBooksService.getConnectionStatus).mockResolvedValue(mockStatus)

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/status')
      const response = await getStatus(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockStatus)
      expect(QuickBooksService.getConnectionStatus).toHaveBeenCalledWith('org-123')
    })

    it('should return 401 for unauthenticated user', async () => {
      setupUnauthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/status')
      const response = await getStatus(request)

      expect(response.status).toBe(401)
    })

    it('should return 404 when no profile found', async () => {
      setupNoProfile()

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/status')
      const response = await getStatus(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Profile not found')
    })

    it('should handle service errors', async () => {
      setupAuthenticatedUser()

      vi.mocked(QuickBooksService.getConnectionStatus).mockRejectedValue(
        new Error('QuickBooks API unavailable')
      )

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/status')
      const response = await getStatus(request)

      expect(response.status).toBe(500)
    })
  })

  describe('GET /api/integrations/quickbooks/connect', () => {
    it('should return connection URL for authenticated user', async () => {
      setupAuthenticatedUser()

      const mockAuthUrl = 'https://appcenter.intuit.com/connect/oauth2?client_id=123&scope=com.intuit.quickbooks.accounting&redirect_uri=http://localhost:3000/api/integrations/quickbooks/callback&state=org-1'

      vi.mocked(QuickBooksService.getAuthorizationUrl).mockReturnValue(mockAuthUrl)

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/connect')
      const response = await connect(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe(mockAuthUrl)
      expect(QuickBooksService.getAuthorizationUrl).toHaveBeenCalled()
    })

    it('should set qbo_state cookie with CSRF token', async () => {
      setupAuthenticatedUser()

      vi.mocked(QuickBooksService.getAuthorizationUrl).mockReturnValue('https://quickbooks.intuit.com/auth')

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/connect')
      const response = await connect(request)

      expect(response.status).toBe(200)
      expect(response.cookies.get('qbo_state')).toBeDefined()
    })

    it('should return 401 for unauthenticated user', async () => {
      setupUnauthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/connect')
      const response = await connect(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/integrations/quickbooks/disconnect', () => {
    it('should disconnect QuickBooks for authenticated user', async () => {
      setupAuthenticatedUser()

      vi.mocked(QuickBooksService.disconnect).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/disconnect', {
        method: 'POST'
      })

      const response = await disconnect(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(QuickBooksService.disconnect).toHaveBeenCalledWith('org-123')
    })

    it('should return 401 for unauthenticated user', async () => {
      setupUnauthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/disconnect', {
        method: 'POST'
      })

      const response = await disconnect(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/integrations/quickbooks/sync/customer', () => {
    it('should sync customer to QuickBooks for authenticated user', async () => {
      setupAuthenticatedUser()

      const qbCustomerId = 'qb-customer-123'
      vi.mocked(QuickBooksService.syncCustomerToQBO).mockResolvedValue(qbCustomerId)

      const customerId = '550e8400-e29b-41d4-a716-446655440000'
      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId })
      })

      const response = await syncCustomer(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.qb_customer_id).toBe(qbCustomerId)
      expect(QuickBooksService.syncCustomerToQBO).toHaveBeenCalledWith('org-123', customerId)
    })

    it('should validate required customer_id', async () => {
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const response = await syncCustomer(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.type).toBe('VALIDATION_ERROR')
    })

    it('should validate customer_id is a valid UUID', async () => {
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: 'not-a-uuid' })
      })

      const response = await syncCustomer(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.type).toBe('VALIDATION_ERROR')
      expect(data.error).toContain('Invalid customer ID')
    })

    it('should handle sync errors', async () => {
      setupAuthenticatedUser()

      vi.mocked(QuickBooksService.syncCustomerToQBO).mockRejectedValue(
        new Error('QuickBooks API unavailable')
      )

      const customerId = '550e8400-e29b-41d4-a716-446655440000'
      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId })
      })

      const response = await syncCustomer(request)

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/integrations/quickbooks/sync/invoice', () => {
    it('should sync invoice to QuickBooks for authenticated user', async () => {
      setupAuthenticatedUser()

      const qbInvoiceId = 'qb-invoice-456'
      vi.mocked(QuickBooksService.syncInvoiceToQBO).mockResolvedValue(qbInvoiceId)

      const invoiceId = '550e8400-e29b-41d4-a716-446655440001'
      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId })
      })

      const response = await syncInvoice(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.qb_invoice_id).toBe(qbInvoiceId)
      expect(QuickBooksService.syncInvoiceToQBO).toHaveBeenCalledWith('org-123', invoiceId)
    })

    it('should validate required invoice_id', async () => {
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const response = await syncInvoice(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.type).toBe('VALIDATION_ERROR')
    })

    it('should validate invoice_id is a valid UUID', async () => {
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: 'not-a-uuid' })
      })

      const response = await syncInvoice(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.type).toBe('VALIDATION_ERROR')
      expect(data.error).toContain('Invalid invoice ID')
    })

    it('should handle sync errors', async () => {
      setupAuthenticatedUser()

      vi.mocked(QuickBooksService.syncInvoiceToQBO).mockRejectedValue(
        new Error('QuickBooks API unavailable')
      )

      const invoiceId = '550e8400-e29b-41d4-a716-446655440001'
      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/sync/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId })
      })

      const response = await syncInvoice(request)

      expect(response.status).toBe(500)
    })
  })
})
