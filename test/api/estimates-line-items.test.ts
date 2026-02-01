import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT } from '@/app/api/estimates/[id]/line-items/route'

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Estimate Line Items API', () => {
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

  describe('GET /api/estimates/[id]/line-items', () => {
    it('should return line items for an estimate', async () => {
      setupAuthenticatedUser()

      const mockLineItems = [
        { id: 'item-1', estimate_id: 'estimate-123', description: 'Labor', quantity: 40, unit_price: 50, total_price: 2000 },
        { id: 'item-2', estimate_id: 'estimate-123', description: 'Materials', quantity: 100, unit_price: 10, total_price: 1000 },
      ]

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'estimates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'estimate-123' },
                  error: null
                })
              })
            })
          } as any
        }
        if (table === 'estimate_line_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockLineItems,
                  error: null
                })
              })
            })
          } as any
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/estimate-123/line-items')
      const response = await GET(request, { params: { id: 'estimate-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.line_items).toEqual(mockLineItems)
    })

    it('should return 404 when estimate not found', async () => {
      setupAuthenticatedUser()

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'estimates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' }
                })
              })
            })
          } as any
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/estimate-nonexistent/line-items')
      const response = await GET(request, { params: { id: 'estimate-nonexistent' } })

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/estimates/[id]/line-items', () => {
    it('should add a line item to estimate', async () => {
      setupAuthenticatedUser()

      const newLineItem = {
        id: 'item-new',
        estimate_id: 'estimate-123',
        description: 'New Item',
        quantity: 10,
        unit_price: 25,
        total_price: 250,
      }

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'estimates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'estimate-123', status: 'draft' },
                  error: null
                })
              })
            })
          } as any
        }
        if (table === 'estimate_line_items' && arguments[0] === 'estimate_line_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { sort_order: 5 },
                      error: null
                    })
                  })
                })
              })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: newLineItem,
                  error: null
                })
              })
            })
          } as any
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/estimate-123/line-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: 'labor',
          category: 'removal',
          description: 'New Item',
          quantity: 10,
          unit_price: 25,
        }),
      })

      const response = await POST(request, { params: { id: 'estimate-123' } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.line_item).toBeDefined()
    })
  })
})
