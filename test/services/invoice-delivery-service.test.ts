import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InvoiceDeliveryService } from '@/lib/services/invoice-delivery-service'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/activity-service', () => ({
  Activity: {
    created: vi.fn(),
    sent: vi.fn(),
    statusChanged: vi.fn(),
    paid: vi.fn(),
  },
}))

vi.mock('resend', () => ({
  Resend: vi.fn(function () {
    return {
      emails: {
        send: vi.fn().mockResolvedValue({ id: 'email-123' }),
      },
    }
  }),
}))

// EmailService now owns the send — mock it so the test doesn't need
// SUPABASE_SERVICE_ROLE_KEY and a live Resend connection.
vi.mock('@/lib/services/email/email-service', () => ({
  EmailService: {
    send: vi.fn().mockResolvedValue({
      auditId: 'audit-123',
      providerMessageId: 'email-123',
    }),
  },
  resolveSender: vi.fn().mockResolvedValue({
    fromEmail: 'tenant@send.hazardos.app',
    fromName: 'Tenant',
    replyTo: null,
    usingVerifiedDomain: false,
  }),
}))

import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'

// InvoiceDeliveryService delegates reads/writes back to InvoicesService,
// which in turn hits the mocked supabase client — so this suite exercises
// the real delivery flow end-to-end at the service boundary.
describe('InvoiceDeliveryService', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase)
  })

  describe('send', () => {
    it('should mark invoice as sent and log activity', async () => {
      process.env.RESEND_API_KEY = 'test-api-key'
      mockSupabase.from = vi.fn((table) => {
        if (table === 'invoices') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inv-1',
                    invoice_number: 'INV-001',
                    status: 'draft',
                    customer: { email: 'test@example.com' },
                    line_items: [],
                    payments: [],
                  },
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'inv-1',
                      invoice_number: 'INV-001',
                      status: 'sent',
                      sent_via: 'email',
                    },
                    error: null,
                  }),
                })),
              })),
            })),
          }
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { organization_id: 'org-1' },
                error: null,
              }),
            })),
          }
        }
        if (table === 'organizations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { name: 'Test Org', logo_url: 'logo.png' },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      })

      const invoice = await InvoiceDeliveryService.send('inv-1', 'email')

      expect(invoice.status).toBe('sent')
      expect(invoice.sent_via).toBe('email')
      expect(Activity.sent).toHaveBeenCalledWith('invoice', 'inv-1', 'INV-001')
    })
  })
})
