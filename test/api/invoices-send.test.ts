import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/invoices/[id]/send/route'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
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

vi.mock('@/lib/services/invoices-service', () => ({
  InvoicesService: {
    send: vi.fn(),
  },
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { InvoicesService } from '@/lib/services/invoices-service'

describe('Invoice Send API', () => {
  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
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

  describe('POST /api/invoices/[id]/send', () => {
    it('should send invoice via email', async () => {
      setupAuthenticatedUser()

      const sentInvoice = {
        id: 'invoice-123',
        status: 'sent',
        sent_at: '2026-03-01T10:00:00Z',
      }
      vi.mocked(InvoicesService.send).mockResolvedValue(sentInvoice)

      const request = new NextRequest('http://localhost:3000/api/invoices/invoice-123/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'customer@example.com',
        }),
      })

      const response = await POST(request, { params: { id: 'invoice-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(sentInvoice)
      expect(InvoicesService.send).toHaveBeenCalledWith('invoice-123', 'email')
    })

    it('should send invoice with custom message', async () => {
      setupAuthenticatedUser()

      const sentInvoice = {
        id: 'invoice-456',
        status: 'sent',
      }
      vi.mocked(InvoicesService.send).mockResolvedValue(sentInvoice)

      const request = new NextRequest('http://localhost:3000/api/invoices/invoice-456/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'customer@example.com',
          message: 'Thank you for your business',
        }),
      })

      const response = await POST(request, { params: { id: 'invoice-456' } })

      expect(response.status).toBe(200)
    })
  })
})
