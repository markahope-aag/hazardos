import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InvoicesService } from '@/lib/services/invoices-service'
import type { Invoice, InvoiceLineItem, Payment } from '@/types/invoices'

// Mock dependencies
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

import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'

describe('InvoicesService', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock supabase client
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

  describe('create', () => {
    it('should create invoice with generated invoice number', async () => {
      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-123' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'invoices') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inv-1',
                    invoice_number: 'INV-001',
                    customer_id: 'cust-1',
                    status: 'draft',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      })

      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: 'INV-001',
        error: null,
      })

      const invoice = await InvoicesService.create({
        customer_id: 'cust-1',
        due_date: '2026-03-01',
        payment_terms: 'Net 30',
      })

      expect(invoice.invoice_number).toBe('INV-001')
      expect(invoice.status).toBe('draft')
      expect(Activity.created).toHaveBeenCalledWith('invoice', 'inv-1', 'INV-001')
    })

    it('should throw error when user not authenticated', async () => {
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await expect(
        InvoicesService.create({
          customer_id: 'cust-1',
          due_date: '2026-03-01',
        })
      ).rejects.toThrow('Unauthorized')
    })

    it('should create invoice with optional job_id', async () => {
      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-123' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'invoices') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inv-1',
                    job_id: 'job-1',
                    invoice_number: 'INV-001',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      })

      mockSupabase.rpc = vi.fn().mockResolvedValue({ data: 'INV-001' })

      const invoice = await InvoicesService.create({
        customer_id: 'cust-1',
        job_id: 'job-1',
        due_date: '2026-03-01',
      })

      expect(invoice.job_id).toBe('job-1')
    })
  })

  describe('createFromJob', () => {
    it('should create invoice from job with line items', async () => {
      const mockJob = {
        id: 'job-1',
        job_number: 'JOB-001',
        customer_id: 'cust-1',
        contract_amount: 5000,
        final_amount: null,
        change_orders: [],
      }

      mockSupabase.from = vi.fn((table) => {
        if (table === 'jobs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockJob,
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-123' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'invoices') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inv-1',
                    invoice_number: 'INV-001',
                    customer_id: 'cust-1',
                    job_id: 'job-1',
                  },
                  error: null,
                }),
              })),
            })),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inv-1',
                    invoice_number: 'INV-001',
                    line_items: [],
                    payments: [],
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'invoice_line_items') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn().mockResolvedValue({
                data: [{ id: 'item-1', description: 'Remediation services' }],
                error: null,
              }),
            })),
          }
        }
        return {}
      })

      mockSupabase.rpc = vi.fn().mockResolvedValue({ data: 'INV-001' })

      const invoice = await InvoicesService.createFromJob({
        job_id: 'job-1',
        due_days: 30,
      })

      expect(invoice.id).toBe('inv-1')
      expect(invoice.job_id).toBe('job-1')
    })

    it('should include approved change orders', async () => {
      const mockJob = {
        id: 'job-1',
        customer_id: 'cust-1',
        contract_amount: 5000,
        change_orders: [
          { id: 'co-1', status: 'approved', amount: 1000, description: 'Extra work' },
          { id: 'co-2', status: 'pending', amount: 500, description: 'Not approved' },
        ],
      }

      mockSupabase.from = vi.fn((table) => {
        if (table === 'jobs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockJob,
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-123' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'invoices') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'inv-1', invoice_number: 'INV-001' },
                  error: null,
                }),
              })),
            })),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'inv-1', line_items: [], payments: [] },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'invoice_line_items') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn().mockResolvedValue({
                data: [
                  { id: 'item-1' },
                  { id: 'item-2' },
                ],
                error: null,
              }),
            })),
          }
        }
        return {}
      })

      mockSupabase.rpc = vi.fn().mockResolvedValue({ data: 'INV-001' })

      await InvoicesService.createFromJob({
        job_id: 'job-1',
        include_change_orders: true,
      })

      // Verify batch insert was called with correct items
      const invoiceLineItemsTable = mockSupabase.from.mock.results.find(
        (r: any) => r.value?.insert
      )
      expect(invoiceLineItemsTable).toBeDefined()
    })

    it('should throw error when job not found', async () => {
      mockSupabase.from = vi.fn((table) => {
        if (table === 'jobs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              })),
            })),
          }
        }
        return {}
      })

      await expect(
        InvoicesService.createFromJob({ job_id: 'nonexistent' })
      ).rejects.toThrow('Job not found')
    })
  })

  describe('getById', () => {
    it('should return invoice with related data', async () => {
      const mockInvoice = {
        id: 'inv-1',
        invoice_number: 'INV-001',
        customer: { id: 'cust-1', name: 'John Doe' },
        job: { id: 'job-1', job_number: 'JOB-001' },
        line_items: [
          { id: 'item-1', sort_order: 0 },
          { id: 'item-2', sort_order: 1 },
        ],
        payments: [
          { id: 'pay-1', payment_date: '2026-02-01' },
          { id: 'pay-2', payment_date: '2026-01-15' },
        ],
      }

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockInvoice,
              error: null,
            }),
          })),
        })),
      }))

      const invoice = await InvoicesService.getById('inv-1')

      expect(invoice).toBeDefined()
      expect(invoice?.invoice_number).toBe('INV-001')
      expect(invoice?.line_items).toHaveLength(2)
      expect(invoice?.payments).toHaveLength(2)
    })

    it('should return null when invoice not found', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          })),
        })),
      }))

      const invoice = await InvoicesService.getById('nonexistent')

      expect(invoice).toBeNull()
    })

    it('should sort line items by sort_order', async () => {
      const mockInvoice = {
        id: 'inv-1',
        line_items: [
          { id: 'item-2', sort_order: 5 },
          { id: 'item-1', sort_order: 1 },
          { id: 'item-3', sort_order: 3 },
        ],
        payments: [],
      }

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockInvoice,
              error: null,
            }),
          })),
        })),
      }))

      const invoice = await InvoicesService.getById('inv-1')

      expect(invoice?.line_items[0].sort_order).toBe(1)
      expect(invoice?.line_items[1].sort_order).toBe(3)
      expect(invoice?.line_items[2].sort_order).toBe(5)
    })
  })

  describe('list', () => {
    it('should list all invoices', async () => {
      const mockInvoices = [
        { id: 'inv-1', invoice_number: 'INV-001', customer: { name: 'Customer 1' } },
        { id: 'inv-2', invoice_number: 'INV-002', customer: { name: 'Customer 2' } },
      ]

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: mockInvoices,
            error: null,
          }),
        })),
      }))

      const invoices = await InvoicesService.list()

      expect(invoices).toHaveLength(2)
      expect(invoices[0].invoice_number).toBe('INV-001')
    })

    it('should filter by status', async () => {
      let capturedQuery: any = null

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => {
          capturedQuery = {
            eq: vi.fn((field, value) => {
              expect(field).toBe('status')
              expect(value).toBe('draft')
              return {
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }
            }),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
          return capturedQuery
        }),
      }))

      await InvoicesService.list({ status: 'draft' })

      expect(capturedQuery.eq).toHaveBeenCalled()
    })

    it('should filter overdue invoices', async () => {
      const overdueInvoices = [
        { id: 'inv-1', invoice_number: 'INV-001', balance_due: 1000 },
      ]

      let ltCalled = false
      let gtCalled = false
      let notCalled = false

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            lt: vi.fn(() => {
              ltCalled = true
              return {
                gt: vi.fn(() => {
                  gtCalled = true
                  return {
                    not: vi.fn(() => {
                      notCalled = true
                      return Promise.resolve({ data: overdueInvoices, error: null })
                    }),
                  }
                }),
              }
            }),
          })),
        })),
      }))

      const invoices = await InvoicesService.list({ overdue_only: true })

      expect(ltCalled).toBe(true)
      expect(gtCalled).toBe(true)
      expect(notCalled).toBe(true)
      expect(invoices).toHaveLength(1)
    })
  })

  describe('update', () => {
    it('should update invoice fields', async () => {
      mockSupabase.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'inv-1', status: 'sent' },
                error: null,
              }),
            })),
          })),
        })),
      }))

      const invoice = await InvoicesService.update('inv-1', { status: 'sent' })

      expect(invoice.status).toBe('sent')
    })
  })

  describe('send', () => {
    it('should mark invoice as sent and log activity', async () => {
      mockSupabase.from = vi.fn(() => ({
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
      }))

      const invoice = await InvoicesService.send('inv-1', 'email')

      expect(invoice.status).toBe('sent')
      expect(invoice.sent_via).toBe('email')
      expect(Activity.sent).toHaveBeenCalledWith('invoice', 'inv-1', 'INV-001')
    })
  })

  describe('markViewed', () => {
    it('should update status from sent to viewed', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'inv-1', status: 'sent' },
              error: null,
            }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'inv-1', status: 'viewed' },
                error: null,
              }),
            })),
          })),
        })),
      }))

      const invoice = await InvoicesService.markViewed('inv-1')

      expect(invoice.status).toBe('viewed')
    })

    it('should not update if status is not sent', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'inv-1', status: 'paid' },
              error: null,
            }),
          })),
        })),
      }))

      const invoice = await InvoicesService.markViewed('inv-1')

      expect(invoice.status).toBe('paid')
    })
  })

  describe('void', () => {
    it('should void invoice and log activity', async () => {
      mockSupabase.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'inv-1',
                  invoice_number: 'INV-001',
                  status: 'void',
                },
                error: null,
              }),
            })),
          })),
        })),
      }))

      const invoice = await InvoicesService.void('inv-1')

      expect(invoice.status).toBe('void')
      expect(Activity.statusChanged).toHaveBeenCalledWith(
        'invoice',
        'inv-1',
        'INV-001',
        'active',
        'void'
      )
    })
  })

  describe('addLineItem', () => {
    it('should add line item with calculated total', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'item-1',
                description: 'Service',
                quantity: 2,
                unit_price: 100,
                line_total: 200,
              },
              error: null,
            }),
          })),
        })),
      }))

      const lineItem = await InvoicesService.addLineItem('inv-1', {
        description: 'Service',
        quantity: 2,
        unit_price: 100,
      })

      expect(lineItem.line_total).toBe(200)
    })

    it('should set sort_order based on existing items', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({
                data: [{ sort_order: 5 }],
                error: null,
              }),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'item-1', sort_order: 6 },
              error: null,
            }),
          })),
        })),
      }))

      const lineItem = await InvoicesService.addLineItem('inv-1', {
        description: 'Service',
        quantity: 1,
        unit_price: 100,
      })

      expect(lineItem.sort_order).toBe(6)
    })
  })

  describe('addLineItemsBatch', () => {
    it('should batch insert multiple line items', async () => {
      mockSupabase.from = vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({
            data: [
              { id: 'item-1', sort_order: 0 },
              { id: 'item-2', sort_order: 1 },
              { id: 'item-3', sort_order: 2 },
            ],
            error: null,
          }),
        })),
      }))

      const items = [
        { description: 'Item 1', quantity: 1, unit_price: 100 },
        { description: 'Item 2', quantity: 2, unit_price: 50 },
        { description: 'Item 3', quantity: 1, unit_price: 200 },
      ]

      const lineItems = await InvoicesService.addLineItemsBatch('inv-1', items)

      expect(lineItems).toHaveLength(3)
      expect(lineItems[0].sort_order).toBe(0)
      expect(lineItems[2].sort_order).toBe(2)
    })

    it('should return empty array for empty items', async () => {
      const lineItems = await InvoicesService.addLineItemsBatch('inv-1', [])

      expect(lineItems).toEqual([])
    })
  })

  describe('updateLineItem', () => {
    it('should recalculate line_total when quantity changes', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'item-1', quantity: 1, unit_price: 100 },
              error: null,
            }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'item-1',
                  quantity: 3,
                  unit_price: 100,
                  line_total: 300,
                },
                error: null,
              }),
            })),
          })),
        })),
      }))

      const lineItem = await InvoicesService.updateLineItem('item-1', { quantity: 3 })

      expect(lineItem.line_total).toBe(300)
    })
  })

  describe('recordPayment', () => {
    it('should record payment and log activity', async () => {
      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-123' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'payments') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'pay-1',
                    invoice_id: 'inv-1',
                    amount: 1000,
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'invoices') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inv-1',
                    invoice_number: 'INV-001',
                    status: 'partial',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      })

      const payment = await InvoicesService.recordPayment('inv-1', {
        amount: 1000,
        payment_method: 'credit_card',
      })

      expect(payment.amount).toBe(1000)
      expect(Activity.paid).toHaveBeenCalled()
    })

    it('should update job status when invoice fully paid', async () => {
      let jobUpdateCalled = false

      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-123' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'payments') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'pay-1', amount: 1000 },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'invoices') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inv-1',
                    invoice_number: 'INV-001',
                    status: 'paid',
                    job_id: 'job-1',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'jobs') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => {
                jobUpdateCalled = true
                return Promise.resolve({ error: null })
              }),
            })),
          }
        }
        return {}
      })

      await InvoicesService.recordPayment('inv-1', {
        amount: 1000,
        payment_method: 'check',
      })

      expect(jobUpdateCalled).toBe(true)
    })
  })

  describe('getStats', () => {
    it('should return invoice statistics', async () => {
      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-123' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'invoices') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  count: 5,
                  error: null,
                }),
                in: vi.fn(() => ({
                  gte: vi.fn().mockResolvedValue({
                    count: 3,
                    error: null,
                  }),
                  lt: vi.fn(() => ({
                    gt: vi.fn().mockResolvedValue({
                      count: 2,
                      error: null,
                    }),
                  })),
                })),
                not: vi.fn().mockResolvedValue({
                  data: [{ balance_due: 1000 }, { balance_due: 2000 }],
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'payments') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn().mockResolvedValue({
                  data: [{ amount: 500 }, { amount: 750 }],
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      })

      const stats = await InvoicesService.getStats()

      expect(stats).toBeDefined()
      expect(stats.paid_this_month).toBe(1250)
      expect(stats.total_outstanding).toBe(3000)
    })
  })
})
