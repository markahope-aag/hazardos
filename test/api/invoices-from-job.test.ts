import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/invoices/from-job/route'

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

vi.mock('@/lib/services/invoices-service', () => ({
  InvoicesService: {
    createFromJob: vi.fn(),
  },
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { InvoicesService } from '@/lib/services/invoices-service'

describe('Invoices From Job API', () => {
  const JOB_UUID = '550e8400-e29b-41d4-a716-446655440001'
  const INVOICE_UUID = '550e8400-e29b-41d4-a716-446655440002'

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

  describe('POST /api/invoices/from-job', () => {
    it('should create invoice from completed job', async () => {
      setupAuthenticatedUser()

      const newInvoice = {
        id: INVOICE_UUID,
        job_id: JOB_UUID,
        invoice_number: 'INV-001',
        status: 'draft',
        total: 5000.00,
      }
      vi.mocked(InvoicesService.createFromJob).mockResolvedValue(newInvoice)

      const request = new NextRequest('http://localhost:3000/api/invoices/from-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: JOB_UUID,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(newInvoice)
      expect(InvoicesService.createFromJob).toHaveBeenCalledWith(
        expect.objectContaining({
          job_id: JOB_UUID,
        })
      )
    })

    it('should create invoice with custom due days', async () => {
      setupAuthenticatedUser()

      const invoice = {
        id: INVOICE_UUID,
        job_id: JOB_UUID,
        due_days: 45,
      }
      vi.mocked(InvoicesService.createFromJob).mockResolvedValue(invoice)

      const request = new NextRequest('http://localhost:3000/api/invoices/from-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: JOB_UUID,
          due_days: 45,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.due_days).toBe(45)
    })

    it('should create invoice with include_change_orders option', async () => {
      setupAuthenticatedUser()

      const invoice = {
        id: INVOICE_UUID,
        job_id: JOB_UUID,
        include_change_orders: false,
      }
      vi.mocked(InvoicesService.createFromJob).mockResolvedValue(invoice)

      const request = new NextRequest('http://localhost:3000/api/invoices/from-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: JOB_UUID,
          include_change_orders: false,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.include_change_orders).toBe(false)
    })
  })
})
