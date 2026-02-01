import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/invoices/[id]/void/route'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/invoices-service', () => ({
  InvoicesService: {
    void: vi.fn(),
  },
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { InvoicesService } from '@/lib/services/invoices-service'

describe('Invoice Void Operations API', () => {
  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  const setupAuthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null,
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/invoices/[id]/void', () => {
    it('should void an invoice', async () => {
      setupAuthenticatedUser()

      const voidedInvoice = {
        id: 'invoice-123',
        status: 'void',
        voided_at: '2026-03-01T10:00:00Z',
      }
      vi.mocked(InvoicesService.void).mockResolvedValue(voidedInvoice)

      const request = new NextRequest('http://localhost:3000/api/invoices/invoice-123/void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Customer cancelled',
        }),
      })

      const response = await POST(request, { params: { id: 'invoice-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('void')
      expect(InvoicesService.void).toHaveBeenCalledWith('invoice-123')
    })

    it('should void with reason', async () => {
      setupAuthenticatedUser()

      const voidedInvoice = {
        id: 'invoice-456',
        status: 'void',
        void_reason: 'Duplicate invoice',
      }
      vi.mocked(InvoicesService.void).mockResolvedValue(voidedInvoice)

      const request = new NextRequest('http://localhost:3000/api/invoices/invoice-456/void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Duplicate invoice',
        }),
      })

      const response = await POST(request, { params: { id: 'invoice-456' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.void_reason).toBe('Duplicate invoice')
    })
  })
})
