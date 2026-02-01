import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/billing/invoices/route'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn() }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/stripe-service', () => ({
  StripeService: {
    getInvoices: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { StripeService } from '@/lib/services/stripe-service'

describe('Billing Invoices API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  describe('GET /api/billing/invoices', () => {
    it('should return list of billing invoices', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
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

      const mockInvoices = [
        {
          id: 'inv_123',
          number: 'INV-2026-001',
          status: 'paid',
          amount_due: 9900,
          amount_paid: 9900,
          created: 1704067200,
          due_date: 1706745600,
          invoice_pdf: 'https://stripe.com/invoices/inv_123.pdf'
        },
        {
          id: 'inv_124',
          number: 'INV-2026-002',
          status: 'open',
          amount_due: 9900,
          amount_paid: 0,
          created: 1706745600,
          due_date: 1709337600,
          invoice_pdf: 'https://stripe.com/invoices/inv_124.pdf'
        }
      ]

      vi.mocked(StripeService.getInvoices).mockResolvedValue(mockInvoices)

      const request = new NextRequest('http://localhost:3000/api/billing/invoices')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].id).toBe('inv_123')
      expect(data[0].status).toBe('paid')
      expect(data[1].status).toBe('open')
      expect(StripeService.getInvoices).toHaveBeenCalledWith('org-123')
    })

    it('should return empty array when no invoices exist', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
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

      vi.mocked(StripeService.getInvoices).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/billing/invoices')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('should include invoice details with amounts and dates', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
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

      const mockInvoices = [
        {
          id: 'inv_125',
          number: 'INV-2026-003',
          status: 'paid',
          amount_due: 29900,
          amount_paid: 29900,
          created: 1709337600,
          due_date: 1712016000,
          invoice_pdf: 'https://stripe.com/invoices/inv_125.pdf'
        }
      ]

      vi.mocked(StripeService.getInvoices).mockResolvedValue(mockInvoices)

      const request = new NextRequest('http://localhost:3000/api/billing/invoices')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data[0].amount_due).toBe(29900)
      expect(data[0].amount_paid).toBe(29900)
      expect(data[0].invoice_pdf).toContain('stripe.com')
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/billing/invoices')

      // Act
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(401)
    })
  })
})
